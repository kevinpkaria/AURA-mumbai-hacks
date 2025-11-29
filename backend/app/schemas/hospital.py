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


class HospitalResponse(BaseModel):
    id: int
    name: str
    address: str | None
    city: str
    state: str | None
    country: str
    phone: str | None
    email: str | None
    created_at: datetime

    class Config:
        from_attributes = True

