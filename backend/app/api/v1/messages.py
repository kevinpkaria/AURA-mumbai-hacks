"""
Message endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_doctor
from app.core.logging_config import get_logger
from app.models.user import User
from app.models.message import Message, MessageRole
from app.models.consultation import Consultation
from app.schemas.message import MessageCreate, MessageResponse

router = APIRouter()
logger = get_logger("api.messages")


@router.post("", response_model=MessageResponse)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new message"""
    # Verify consultation exists and user has access
    result = await db.execute(
        select(Consultation).where(Consultation.id == message_data.consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify user has access (patient or assigned doctor)
    if current_user.role.value == "patient" and consultation.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role.value == "doctor" and consultation.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_message = Message(
        consultation_id=message_data.consultation_id,
        sender_role=message_data.sender_role,
        content=message_data.content,
        message_metadata=message_data.metadata
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    return MessageResponse.model_validate(new_message)


class PrescriptionRequest(BaseModel):
    consultation_id: int
    prescription: str


@router.post("/prescription")
async def create_prescription(
    request: PrescriptionRequest,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Create a prescription message for a consultation"""
    logger.info(f"💊 Doctor {current_user.id} creating prescription for consultation {request.consultation_id}")
    
    # Verify consultation exists and doctor has access
    result = await db.execute(
        select(Consultation).where(Consultation.id == request.consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify doctor has access
    if consultation.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - consultation not assigned to you")
    
    # Create prescription message with metadata
    new_message = Message(
        consultation_id=request.consultation_id,
        sender_role=MessageRole.DOCTOR,
        content=request.prescription,
        message_metadata={"type": "prescription"}
    )
    db.add(new_message)
    
    # Update consultation status to completed (doctor has reviewed and sent prescription)
    from app.models.consultation import ConsultationStatus
    consultation.status = ConsultationStatus.COMPLETED
    
    await db.commit()
    await db.refresh(new_message)
    
    logger.info(f"✅ Prescription created for consultation {request.consultation_id}")
    return MessageResponse.model_validate(new_message)


@router.get("/consultations/{consultation_id}", response_model=List[MessageResponse])
async def get_consultation_messages(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a consultation"""
    # Verify consultation exists and user has access
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify user has access
    if current_user.role.value == "patient" and consultation.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role.value == "doctor" and consultation.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages_result = await db.execute(
        select(Message).where(Message.consultation_id == consultation_id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    return [MessageResponse.model_validate(msg) for msg in messages]
