"""
Consultation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_patient, get_current_doctor
from app.core.logging_config import get_logger
from app.models.user import User
from app.models.consultation import Consultation
from app.models.message import Message
from app.schemas.consultation import ConsultationCreate, ConsultationResponse, ConsultationUpdate

router = APIRouter()
logger = get_logger("api.consultations")


@router.post("", response_model=ConsultationResponse)
async def create_consultation(
    consultation_data: ConsultationCreate,
    current_user: User = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    """Create a new consultation"""
    patient_id = consultation_data.patient_id or current_user.id
    logger.info(f"📋 Creating consultation for patient {patient_id}")
    
    new_consultation = Consultation(
        patient_id=patient_id,
        status="pending"
    )
    db.add(new_consultation)
    await db.commit()
    await db.refresh(new_consultation)
    
    # Get message count
    msg_count = await db.scalar(
        select(func.count(Message.id)).where(Message.consultation_id == new_consultation.id)
    )
    
    logger.info(f"✅ Consultation {new_consultation.id} created successfully")
    
    response = ConsultationResponse.model_validate(new_consultation)
    response.message_count = msg_count or 0
    return response


@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get consultation by ID"""
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify access
    if current_user.role.value == "patient" and consultation.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role.value == "doctor" and consultation.doctor_id and consultation.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get message count
    msg_count = await db.scalar(
        select(func.count(Message.id)).where(Message.consultation_id == consultation_id)
    )
    
    response = ConsultationResponse.model_validate(consultation)
    response.message_count = msg_count or 0
    return response


@router.patch("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: int,
    update_data: ConsultationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update consultation"""
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Update fields
    if update_data.status:
        consultation.status = update_data.status
    if update_data.doctor_id:
        consultation.doctor_id = update_data.doctor_id
    if update_data.risk_assessment:
        consultation.risk_assessment = update_data.risk_assessment
    if update_data.ai_summary:
        consultation.ai_summary = update_data.ai_summary
    
    await db.commit()
    await db.refresh(consultation)
    
    msg_count = await db.scalar(
        select(func.count(Message.id)).where(Message.consultation_id == consultation_id)
    )
    
    response = ConsultationResponse.model_validate(consultation)
    response.message_count = msg_count or 0
    return response


@router.delete("/{consultation_id}")
async def delete_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a consultation"""
    logger.info(f"🗑️ Deleting consultation {consultation_id} by {current_user.role.value} {current_user.id}")
    
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify access - only patients can delete their own consultations, or admins
    if current_user.role.value == "patient" and consultation.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role.value == "doctor":
        raise HTTPException(status_code=403, detail="Doctors cannot delete consultations")
    
    # Delete associated messages first
    from sqlalchemy import delete
    await db.execute(
        delete(Message).where(Message.consultation_id == consultation_id)
    )
    
    # Delete consultation
    await db.delete(consultation)
    await db.commit()
    
    logger.info(f"✅ Consultation {consultation_id} deleted successfully")
    return {"message": "Consultation deleted successfully"}


@router.get("", response_model=List[ConsultationResponse])
async def list_consultations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List consultations for current user"""
    logger.info(f"📋 Listing consultations for {current_user.role.value} {current_user.id}")
    
    if current_user.role.value == "patient":
        result = await db.execute(
            select(Consultation).where(Consultation.patient_id == current_user.id)
            .order_by(Consultation.created_at.desc())
        )
    elif current_user.role.value == "doctor":
        # Doctors can ONLY see consultations assigned to them (doctor_id == current_user.id)
        # They should NOT see unassigned consultations - only when AI agent assigns them via handoff_to_doctor
        result = await db.execute(
            select(Consultation).where(
                Consultation.doctor_id == current_user.id
            )
            .order_by(Consultation.created_at.desc())
        )
    else:  # admin
        result = await db.execute(
            select(Consultation).order_by(Consultation.created_at.desc())
        )
    
    consultations = result.scalars().all()
    logger.info(f"📊 Found {len(consultations)} consultation(s)")
    
    responses = []
    for cons in consultations:
        msg_count = await db.scalar(
            select(func.count(Message.id)).where(Message.consultation_id == cons.id)
        )
        response = ConsultationResponse.model_validate(cons)
        response.message_count = msg_count or 0
        responses.append(response)
    
    return responses
