"""
Surge prediction endpoints
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, timedelta
from typing import List
from app.core.database import get_db
from app.models.surge_prediction import SurgePrediction
from app.schemas.surge import SurgePredictionResponse, SurgeAlertResponse

router = APIRouter()


@router.get("/today", response_model=SurgeAlertResponse)
async def get_today_surge_alert(
    city: str = Query(default="Delhi"),
    db: AsyncSession = Depends(get_db)
):
    """Get surge alert for today"""
    today = date.today()
    
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date == today
            )
        )
    )
    prediction = result.scalar_one_or_none()
    
    if not prediction:
        return SurgeAlertResponse(has_alert=False)
    
    # Analyze prediction to determine alert level
    footfall = prediction.footfall_forecast or {}
    total_increase = 0
    
    for dept, data in footfall.items():
        if isinstance(data, dict) and "percentageIncrease" in data:
            total_increase = max(total_increase, abs(data["percentageIncrease"]))
    
    if total_increase > 40:
        risk_level = "high"
        message = f"High patient surge expected in {city} today. {total_increase:.0f}% increase predicted."
        recommendations = [
            "Avoid outdoor activities if you have respiratory conditions",
            "Wear masks when going outside",
            "Stay hydrated",
            "Monitor symptoms closely"
        ]
    elif total_increase > 25:
        risk_level = "medium"
        message = f"Moderate patient surge expected in {city} today."
        recommendations = [
            "Take precautions if you have chronic conditions",
            "Consider rescheduling non-urgent visits"
        ]
    else:
        risk_level = "low"
        message = None
        recommendations = None
    
    return SurgeAlertResponse(
        has_alert=total_increase > 25,
        risk_level=risk_level if total_increase > 25 else None,
        message=message,
        recommendations=recommendations,
        forecast_date=today
    )


@router.get("/forecast", response_model=List[SurgePredictionResponse])
async def get_surge_forecast(
    city: str = Query(default="Delhi"),
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db)
):
    """Get surge forecast for next N days"""
    today = date.today()
    end_date = today + timedelta(days=days)
    
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date >= today,
                SurgePrediction.date <= end_date
            )
        ).order_by(SurgePrediction.date)
    )
    predictions = result.scalars().all()
    
    return [SurgePredictionResponse.model_validate(pred) for pred in predictions]


@router.get("/patient/{patient_id}", response_model=SurgeAlertResponse)
async def get_patient_surge_alert(
    patient_id: int,
    city: str = Query(default="Delhi"),
    db: AsyncSession = Depends(get_db)
):
    """Get surge alert for a specific patient (uses their city)"""
    # In production, would fetch patient's city from profile
    # For now, use provided city
    return await get_today_surge_alert(city, db)
