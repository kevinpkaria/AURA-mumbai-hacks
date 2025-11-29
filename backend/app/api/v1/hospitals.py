"""
Hospital endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.hospital import Hospital
from app.schemas.hospital import HospitalCreate, HospitalResponse

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

