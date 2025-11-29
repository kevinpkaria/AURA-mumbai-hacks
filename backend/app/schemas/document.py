"""
Document schemas
"""
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict, Any


class Metric(BaseModel):
    name: str
    value: str
    unit: str


class DocumentCreate(BaseModel):
    name: str
    document_type: Optional[str] = None
    date_of_report: Optional[date] = None


class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    file_url: Optional[str]
    summary: Optional[Dict[str, Any]]
    metrics: Optional[List[Metric]]
    document_type: Optional[str]
    date_of_report: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


