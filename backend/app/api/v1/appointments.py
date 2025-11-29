"""
Appointment endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.logging_config import get_logger
from app.models.user import User
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from pydantic import BaseModel

router = APIRouter()
logger = get_logger("api.appointments")


class AvailabilityCheck(BaseModel):
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None
    datetime: datetime
    duration_minutes: int = 30  # Default appointment duration


class AvailabilityResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    conflicting_appointments: List[AppointmentResponse] = []


@router.get("/availability", response_model=AvailabilityResponse)
async def check_availability(
    doctor_id: Optional[int] = Query(None),
    patient_id: Optional[int] = Query(None),
    datetime_str: str = Query(..., description="ISO datetime string"),
    duration_minutes: int = Query(30, ge=15, le=120),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if a doctor or patient is available at a given time"""
    try:
        check_datetime = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    except ValueError:
        check_datetime = datetime.fromisoformat(datetime_str)
    
    end_datetime = check_datetime + timedelta(minutes=duration_minutes)
    
    logger.info(f"🔍 Checking availability: doctor_id={doctor_id}, patient_id={patient_id}, datetime={check_datetime}")
    
    # Build conflict conditions
    conflict_conditions = []
    
    # Check for overlapping appointments
    # An appointment conflicts if:
    # - It starts before our end time AND ends after our start time
    conflict_conditions.append(
        and_(
            Appointment.datetime < end_datetime,
            Appointment.datetime + timedelta(minutes=30) > check_datetime  # Assume 30min default duration
        )
    )
    
    # Filter by doctor if specified
    if doctor_id:
        doctor_result = await db.execute(
            select(User).where(User.id == doctor_id)
        )
        doctor = doctor_result.scalar_one_or_none()
        if not doctor:
            return AvailabilityResponse(
                available=False,
                reason="Doctor not found"
            )
        conflict_conditions.append(Appointment.doctor_id == doctor_id)
    
    # Filter by patient if specified
    if patient_id:
        patient_result = await db.execute(
            select(User).where(User.id == patient_id)
        )
        patient = patient_result.scalar_one_or_none()
        if not patient:
            return AvailabilityResponse(
                available=False,
                reason="Patient not found"
            )
        conflict_conditions.append(Appointment.patient_id == patient_id)
    
    # Check for conflicts
    result = await db.execute(
        select(Appointment).where(and_(*conflict_conditions))
    )
    conflicting = result.scalars().all()
    
    if conflicting:
        logger.warning(f"⚠️ Found {len(conflicting)} conflicting appointment(s)")
        return AvailabilityResponse(
            available=False,
            reason=f"Found {len(conflicting)} conflicting appointment(s)",
            conflicting_appointments=[AppointmentResponse.model_validate(apt) for apt in conflicting]
        )
    
    logger.info(f"✅ Time slot is available")
    return AvailabilityResponse(available=True)


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new appointment (checks availability first)"""
    logger.info(f"📅 Creating appointment for patient {appointment_data.patient_id} at {appointment_data.datetime}")
    
    # Verify patient access
    if current_user.role.value == "patient" and appointment_data.patient_id != current_user.id:
        logger.warning(f"⚠️ Access denied: Patient {current_user.id} tried to create appointment for {appointment_data.patient_id}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check availability
    end_datetime = appointment_data.datetime + timedelta(minutes=30)
    conflict_conditions = [
        Appointment.datetime < end_datetime,
        Appointment.datetime + timedelta(minutes=30) > appointment_data.datetime
    ]
    
    if appointment_data.doctor_id:
        conflict_conditions.append(Appointment.doctor_id == appointment_data.doctor_id)
    if appointment_data.patient_id:
        conflict_conditions.append(Appointment.patient_id == appointment_data.patient_id)
    
    conflict_result = await db.execute(
        select(Appointment).where(and_(*conflict_conditions))
    )
    conflicts = conflict_result.scalars().all()
    
    if conflicts:
        logger.warning(f"⚠️ Cannot create appointment: {len(conflicts)} conflict(s) found")
        raise HTTPException(
            status_code=409,
            detail=f"Time slot is not available. Found {len(conflicts)} conflicting appointment(s)."
        )
    
    # Create appointment record (no external link needed)
    new_appointment = Appointment(
        patient_id=appointment_data.patient_id,
        doctor_id=appointment_data.doctor_id,
        consultation_id=appointment_data.consultation_id,
        datetime=appointment_data.datetime,
        mode=appointment_data.mode,
        external_link=None  # No longer using external calendar services
    )
    
    db.add(new_appointment)
    await db.commit()
    await db.refresh(new_appointment)
    
    logger.info(f"✅ Appointment {new_appointment.id} created successfully")
    
    return AppointmentResponse.model_validate(new_appointment)


@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    patient_id: int = None,
    doctor_id: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List appointments"""
    logger.info(f"📋 Listing appointments for {current_user.role.value} {current_user.id}")
    from sqlalchemy import and_
    from sqlalchemy.orm import selectinload
    
    conditions = []
    if patient_id:
        conditions.append(Appointment.patient_id == patient_id)
    if doctor_id:
        conditions.append(Appointment.doctor_id == doctor_id)
    
    # If patient, only show their appointments
    if current_user.role.value == "patient":
        conditions.append(Appointment.patient_id == current_user.id)
    # If doctor, only show their appointments
    elif current_user.role.value == "doctor":
        conditions.append(Appointment.doctor_id == current_user.id)
    
    # Load relationships
    query = select(Appointment).options(
        selectinload(Appointment.patient_user),
        selectinload(Appointment.doctor_user)
    )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Appointment.datetime.desc())
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Build response with patient/doctor info
    appointment_responses = []
    for apt in appointments:
        apt_dict = {
            "id": apt.id,
            "patient_id": apt.patient_id,
            "doctor_id": apt.doctor_id,
            "consultation_id": apt.consultation_id,
            "datetime": apt.datetime,
            "mode": apt.mode,
            "external_link": apt.external_link,
            "created_at": apt.created_at,
        }
        
        # Add patient info if available
        if apt.patient_user:
            apt_dict["patient"] = {
                "id": apt.patient_user.id,
                "name": apt.patient_user.name,
                "email": apt.patient_user.email,
            }
        
        # Add doctor info if available
        if apt.doctor_user:
            apt_dict["doctor"] = {
                "id": apt.doctor_user.id,
                "name": apt.doctor_user.name,
                "email": apt.doctor_user.email,
            }
        
        appointment_responses.append(AppointmentResponse(**apt_dict))
    
    logger.info(f"📊 Found {len(appointments)} appointment(s)")
    return appointment_responses
