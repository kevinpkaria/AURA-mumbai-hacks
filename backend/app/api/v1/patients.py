"""
Patient endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_patient
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_patient_info(
    current_user: User = Depends(get_current_patient)
):
    """Get current patient info"""
    return UserResponse.model_validate(current_user)


@router.get("/{patient_id}/documents")
async def get_patient_documents_endpoint(
    patient_id: int,
    current_user: User = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get patient's documents"""
    from app.api.v1.documents import get_patient_documents
    return await get_patient_documents(patient_id, current_user, db)


@router.get("/{patient_id}/consultations")
async def get_patient_consultations(
    patient_id: int,
    current_user: User = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get patient's consultations"""
    from app.api.v1.consultations import list_consultations
    return await list_consultations(current_user, db)


@router.get("/{patient_id}/activity")
async def get_patient_activity(
    patient_id: int,
    current_user: User = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get recent activity for patient"""
    from app.models.document import Document
    from app.models.consultation import Consultation
    from sqlalchemy import select, func
    from datetime import datetime, timedelta
    
    # Get recent documents
    docs_result = await db.execute(
        select(Document).where(Document.patient_id == patient_id)
        .order_by(Document.created_at.desc())
        .limit(5)
    )
    documents = docs_result.scalars().all()
    
    # Get recent consultations
    cons_result = await db.execute(
        select(Consultation).where(Consultation.patient_id == patient_id)
        .order_by(Consultation.created_at.desc())
        .limit(5)
    )
    consultations = cons_result.scalars().all()
    
    return {
        "documents": [{"id": d.id, "name": d.name, "date": d.created_at.isoformat()} for d in documents],
        "consultations": [{"id": c.id, "status": c.status.value, "date": c.created_at.isoformat()} for c in consultations]
    }
