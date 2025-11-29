"""
AI agent endpoints - the core agentic AI interface
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_doctor, get_current_admin
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.ai_agents import DoctorAgent, SurgeAgent, AdminAgent, OperationsAgent
from app.services.ai_agents_langgraph import PatientAgentLangGraph
from openai import OpenAI
from app.core.config import settings
import base64
import json

router = APIRouter()
logger = get_logger("api.ai")
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class ChatRequest(BaseModel):
    consultation_id: int
    message: str
    message_history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str
    message: Optional[str] = None  # Alias for response
    risk_assessment: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


@router.post("/chat", response_model=ChatResponse)
async def patient_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Patient chat with AURA agent"""
    logger.info(f"💬 Patient {current_user.id} sending message in consultation {request.consultation_id}")
    try:
        agent = PatientAgentLangGraph(db)
        result = await agent.process_message(
        consultation_id=request.consultation_id,
        user_message=request.message,
        patient_id=current_user.id
    )
        logger.info(f"✅ Response generated for consultation {request.consultation_id}")
        # Map result to ChatResponse format
        message = result.get("message", "")
        return ChatResponse(
            response=message,
            message=message,  # Also include for compatibility
            risk_assessment=result.get("risk_assessment"),
            tool_calls=result.get("tool_calls", [])
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error processing chat: {error_msg}", exc_info=True)
        # Always return detailed error for debugging
        raise HTTPException(status_code=500, detail=f"Failed to process chat message: {error_msg}")


class DoctorCommandRequest(BaseModel):
    consultation_id: int
    command: str  # e.g., "@aura summarize", "@aura schedule follow-up"


@router.post("/doctor-command")
async def doctor_command(
    request: DoctorCommandRequest,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Process @aura commands from doctor"""
    logger.info(f"👨‍⚕️ Doctor {current_user.id} executing command: {request.command[:50]}...")
    try:
        agent = DoctorAgent(db)
        result = await agent.process_command(
        consultation_id=request.consultation_id,
        command=request.command,
        doctor_id=current_user.id
    )
        logger.info(f"✅ Command executed successfully")
        return result
    except Exception as e:
        logger.error(f"❌ Error executing doctor command: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {str(e)}")


class AdminQueryRequest(BaseModel):
    query: str


@router.post("/admin-query")
async def admin_query(
    request: AdminQueryRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin natural language Q&A"""
    agent = AdminAgent(db)
    # Get hospital_id from current_user if available
    hospital_id = current_user.hospital_id if hasattr(current_user, 'hospital_id') else None
    result = await agent.process_query(request.query, hospital_id=hospital_id)
    return result


@router.post("/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Analyze medical document with AI"""
    logger.info(f"📄 Analyzing document: {file.filename} ({file.size} bytes)")
    try:
        file_content = await file.read()
        base64_image = base64.b64encode(file_content).decode('utf-8')
        mime_type = file.content_type or "image/jpeg"
        
        vision_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are a medical document analyzer. Extract key health metrics, dates, and summaries.
                    Return ONLY valid JSON with this exact structure:
                    {
                    "summary": "Brief summary",
                    "date": "YYYY-MM-DD",
                    "metrics": [{"name": "metric name", "value": "value", "unit": "unit"}],
                    "type": "document type"
                    }"""
                },
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": "Analyze this medical document." },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                    },
                ],
            },
        ],
        response_format={"type": "json_object"},
    )
    
        result = json.loads(vision_response.choices[0].message.content or "{}")
        logger.info(f"✅ Document analyzed: {len(result.get('metrics', []))} metrics extracted")
        return result
    except Exception as e:
        logger.error(f"❌ Error analyzing document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze document")


class SummaryRequest(BaseModel):
    consultation_id: int


@router.post("/summary")
async def generate_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Generate enhanced summary for doctor"""
    logger.info(f"📋 Generating summary for consultation {request.consultation_id}")
    agent = DoctorAgent(db)
    result = await agent.generate_summary(request.consultation_id)
    return result
