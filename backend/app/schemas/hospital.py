"""
Hospital schemas
"""
from pydantic import BaseModel
from datetime import datetime


class HospitalCreate(BaseModel):
    name: str
    address: str | None = None
    city: str
    state: str | None = None
    country: str = "India"
    phone: str | None = None
    email: str | None = None


class HospitalOnboardingData(BaseModel):
    departments: list[str]
    bed_capacity: int
    icu_capacity: int
    ventilator_count: int
    average_daily_patients: dict[str, int]  # department -> average patients
    timezone: str = "Asia/Kolkata"

class HospitalOnboardingRequest(BaseModel):
    hospital_id: int
    onboarding_data: HospitalOnboardingData

class HospitalResponse(BaseModel):
    id: int
    name: str
    address: str | None
    city: str
    state: str | None
    country: str
    phone: str | None
    email: str | None
    onboarding_completed: str = "false"
    created_at: datetime

    class Config:
        from_attributes = True

