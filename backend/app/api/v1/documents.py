"""
Document endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_patient, get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.services.ai_agents import BaseAgent
import base64
import json
from openai import OpenAI
from app.core.config import settings

router = APIRouter()
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Upload and analyze a medical document"""
    # Read file content
    file_content = await file.read()
    
    # Determine MIME type
    mime_type = file.content_type or "image/jpeg"
    
    # Validate file type - only accept images for vision API
    allowed_image_types = [
        "image/jpeg", "image/jpg", "image/png", "image/gif", 
        "image/webp", "image/bmp", "image/tiff"
    ]
    
    if mime_type not in allowed_image_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {mime_type}. Please upload an image file (JPEG, PNG, GIF, WebP, BMP, or TIFF). PDF files are not currently supported."
        )
    
    # Convert to base64 for GPT-4o vision
    base64_image = base64.b64encode(file_content).decode('utf-8')
    
    # Call GPT-4o vision for analysis
    try:
        vision_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are a medical document analyzer. Extract key health metrics, dates, and summaries from the image.
          
Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief summary of the document",
  "date": "YYYY-MM-DD format",
  "metrics": [{"name": "metric name", "value": "value", "unit": "unit"}],
  "type": "document type"
}"""
                },
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": "Analyze this medical document and extract all relevant health data." },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}",
                            },
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
        )
        
        result = json.loads(vision_response.choices[0].message.content or "{}")
    except Exception as e:
        error_msg = str(e)
        # Extract more detailed error message if available
        if "Invalid MIME type" in error_msg or "invalid_image_format" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Please ensure you're uploading a valid image file. Error: {error_msg}"
            )
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {error_msg}")
    
    # Parse date - handle "Unknown" or invalid dates
    date_of_report = None
    date_str = result.get("date")
    if date_str and date_str != "Unknown" and date_str.lower() != "unknown":
        try:
            from datetime import datetime
            # Try to parse the date string
            date_of_report = datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            # If parsing fails, set to None
            date_of_report = None
    
    # Convert summary to dict format if it's a string
    summary_value = result.get("summary")
    if isinstance(summary_value, str):
        summary_dict = {"text": summary_value}
    elif isinstance(summary_value, dict):
        summary_dict = summary_value
    else:
        summary_dict = None
    
    # Create document record
    # In production, you'd upload file to S3/cloud storage
    # For now, we'll store metadata only
    new_document = Document(
        patient_id=current_user.id,
        name=file.filename or "document",
        file_url=None,  # Would be S3 URL in production
        summary=summary_dict,
        metrics=result.get("metrics", []),
        document_type=result.get("type", "Document"),
        date_of_report=date_of_report
    )
    
    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)
    
    return DocumentResponse.model_validate(new_document)


@router.get("/patients/{patient_id}", response_model=List[DocumentResponse])
async def get_patient_documents(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all documents for a patient"""
    # Verify access
    if current_user.role.value == "patient" and patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.execute(
        select(Document).where(Document.patient_id == patient_id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    # Convert documents to response format, handling legacy string summaries
    responses = []
    for doc in documents:
        # Convert summary to dict if it's a string (for backward compatibility)
        doc_dict = {
            "id": doc.id,
            "patient_id": doc.patient_id,
            "name": doc.name,
            "file_url": doc.file_url,
            "summary": doc.summary if isinstance(doc.summary, dict) else ({"text": doc.summary} if isinstance(doc.summary, str) else None),
            "metrics": doc.metrics,
            "document_type": doc.document_type,
            "date_of_report": doc.date_of_report,
            "created_at": doc.created_at
        }
        responses.append(DocumentResponse.model_validate(doc_dict))
    
    return responses


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document"""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify access
    if current_user.role.value == "patient" and document.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete(document)
    await db.commit()
    return {"message": "Document deleted"}
