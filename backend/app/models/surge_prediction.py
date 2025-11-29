"""
Surge Prediction model
"""
from sqlalchemy import Column, Integer, String, DateTime, Date, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class SurgePrediction(Base):
    __tablename__ = "surge_predictions"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, nullable=True)  # Optional hospital-specific
    city = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    footfall_forecast = Column(JSON, nullable=True)  # Department-wise predictions
    staffing_needs = Column(JSON, nullable=True)
    supply_needs = Column(JSON, nullable=True)
    aqi_data = Column(JSON, nullable=True)
    weather_data = Column(JSON, nullable=True)
    festival_events = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


