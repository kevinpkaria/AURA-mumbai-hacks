"""
Surge prediction schemas
"""
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Dict, Any, List


class SurgePredictionResponse(BaseModel):
    id: int
    hospital_id: Optional[int]
    city: str
    date: date
    footfall_forecast: Optional[Dict[str, Any]]
    staffing_needs: Optional[Dict[str, Any]]
    supply_needs: Optional[Dict[str, Any]]
    aqi_data: Optional[Dict[str, Any]]
    weather_data: Optional[Dict[str, Any]]
    festival_events: Optional[List[Dict[str, Any]]]
    created_at: datetime

    class Config:
        from_attributes = True


class SurgeAlertResponse(BaseModel):
    has_alert: bool
    risk_level: Optional[str] = None  # high, medium, low
    message: Optional[str] = None
    recommendations: Optional[List[str]] = None
    forecast_date: Optional[date] = None


