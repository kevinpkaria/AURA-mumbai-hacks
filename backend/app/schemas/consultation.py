"""
Consultation schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.consultation import ConsultationStatus


class RiskAssessment(BaseModel):
    risk_level: str  # red, orange, green
    needs_physical_exam: str  # yes, no, maybe
    suggested_department: str
    doctor_level: str  # junior, senior
    reasoning: str


class ConsultationCreate(BaseModel):
    patient_id: int


class ConsultationUpdate(BaseModel):
    status: Optional[ConsultationStatus] = None
    doctor_id: Optional[int] = None
    risk_assessment: Optional[Dict[str, Any]] = None
    ai_summary: Optional[Dict[str, Any]] = None


class ConsultationResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int]
    status: ConsultationStatus
    risk_assessment: Optional[Dict[str, Any]]
    ai_summary: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


