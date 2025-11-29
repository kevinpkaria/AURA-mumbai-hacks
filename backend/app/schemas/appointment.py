"""
Appointment schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.appointment import AppointmentMode


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    consultation_id: Optional[int] = None
    datetime: datetime
    mode: AppointmentMode = AppointmentMode.IN_PERSON


class UserInfo(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int]
    consultation_id: Optional[int]
    datetime: datetime
    mode: AppointmentMode
    external_link: Optional[str]
    created_at: datetime
    patient: Optional[UserInfo] = None
    doctor: Optional[UserInfo] = None

    class Config:
        from_attributes = True


