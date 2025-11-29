"""
Hospital endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, cast, String
from typing import List, Optional
from datetime import date, datetime
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.hospital import Hospital
from app.models.user import User
from app.models.consultation import Consultation, ConsultationStatus
from app.models.message import Message
from app.schemas.hospital import HospitalCreate, HospitalResponse
from app.schemas.consultation import ConsultationResponse

router = APIRouter()


@router.get("", response_model=List[HospitalResponse])
async def list_hospitals(
    city: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """List all hospitals, optionally filtered by city"""
    query = select(Hospital)
    if city:
        query = query.where(Hospital.city.ilike(f"%{city}%"))
    query = query.order_by(Hospital.name)
    
    result = await db.execute(query)
    hospitals = result.scalars().all()
    return [HospitalResponse.model_validate(h) for h in hospitals]


@router.post("", response_model=HospitalResponse)
async def create_hospital(
    hospital_data: HospitalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new hospital (typically done during admin registration)"""
    new_hospital = Hospital(
        name=hospital_data.name,
        address=hospital_data.address,
        city=hospital_data.city,
        state=hospital_data.state,
        country=hospital_data.country,
        phone=hospital_data.phone,
        email=hospital_data.email,
    )
    db.add(new_hospital)
    await db.commit()
    await db.refresh(new_hospital)
    return HospitalResponse.model_validate(new_hospital)


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get hospital by ID"""
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return HospitalResponse.model_validate(hospital)


# Hospital-specific consultation endpoints
@router.get("/{hospital_id}/patients/count")
async def get_hospital_patients_count(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get total unique patients for a hospital"""
    result = await db.execute(
        select(func.count(func.distinct(Consultation.patient_id)))
        .join(User, Consultation.patient_id == User.id)
        .where(User.hospital_id == hospital_id)
    )
    count = result.scalar() or 0
    return {"count": count}


@router.get("/{hospital_id}/consultations/stats")
async def get_hospital_consultations_stats(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get consultation statistics for a hospital"""
    # Get all consultations for patients in this hospital
    today = date.today()
    
    # Total consultations
    total_result = await db.execute(
        select(func.count(Consultation.id))
        .join(User, Consultation.patient_id == User.id)
        .where(User.hospital_id == hospital_id)
    )
    total = total_result.scalar() or 0
    
    # Today's consultations
    today_result = await db.execute(
        select(func.count(Consultation.id))
        .join(User, Consultation.patient_id == User.id)
        .where(
            and_(
                User.hospital_id == hospital_id,
                func.date(Consultation.created_at) == today
            )
        )
    )
    today_count = today_result.scalar() or 0
    
    return {
        "total": total,
        "today": today_count
    }


@router.get("/{hospital_id}/consultations/high-risk")
async def get_hospital_high_risk_consultations(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get count of high-risk consultations"""
    result = await db.execute(
        select(func.count(Consultation.id))
        .join(User, Consultation.patient_id == User.id)
        .where(
            and_(
                User.hospital_id == hospital_id,
                Consultation.risk_assessment.isnot(None),
                cast(Consultation.risk_assessment['risk_level'], String) == 'red'
            )
        )
    )
    count = result.scalar() or 0
    return {"count": count}


@router.get("/{hospital_id}/consultations/pending-review")
async def get_hospital_pending_review_consultations(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get count of consultations pending doctor review"""
    result = await db.execute(
        select(func.count(Consultation.id))
        .join(User, Consultation.patient_id == User.id)
        .where(
            and_(
                User.hospital_id == hospital_id,
                Consultation.status == ConsultationStatus.PENDING
            )
        )
    )
    count = result.scalar() or 0
    return {"count": count}


@router.get("/{hospital_id}/consultations", response_model=List[ConsultationResponse])
async def get_hospital_consultations(
    hospital_id: int,
    risk: Optional[str] = Query(None, description="Filter by risk level: low, moderate, high"),
    department: Optional[str] = Query(None, description="Filter by department"),
    assessment: Optional[str] = Query(None, description="Filter by assessment: requires_immediate_attention, needs_followup, resolved"),
    status: Optional[str] = Query(None, description="Filter by status: pending, in_progress, completed"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get consultations for a hospital with filtering"""
    # Base query: consultations for patients in this hospital
    query = (
        select(Consultation)
        .join(User, Consultation.patient_id == User.id)
        .where(User.hospital_id == hospital_id)
    )
    
    # Apply filters
    if status:
        try:
            status_enum = ConsultationStatus(status)
            query = query.where(Consultation.status == status_enum)
        except ValueError:
            pass
    
    if risk:
        # Filter by risk level in risk_assessment JSON using cast
        if risk.lower() == "high":
            query = query.where(
                cast(Consultation.risk_assessment['risk_level'], String) == 'red'
            )
        elif risk.lower() == "moderate":
            query = query.where(
                cast(Consultation.risk_assessment['risk_level'], String) == 'orange'
            )
        elif risk.lower() == "low":
            query = query.where(
                cast(Consultation.risk_assessment['risk_level'], String) == 'green'
            )
    
    if department:
        query = query.where(
            cast(Consultation.risk_assessment['suggested_department'], String).ilike(f"%{department}%")
        )
    
    # Assessment filter would need more complex logic based on AI summary
    # For now, we'll skip it or implement basic logic
    
    query = query.order_by(Consultation.created_at.desc())
    
    result = await db.execute(query)
    consultations = result.scalars().all()
    
    # Get message counts
    responses = []
    for cons in consultations:
        msg_count = await db.scalar(
            select(func.count(Message.id)).where(Message.consultation_id == cons.id)
        )
        response = ConsultationResponse.model_validate(cons)
        response.message_count = msg_count or 0
        responses.append(response)
    
    return responses

