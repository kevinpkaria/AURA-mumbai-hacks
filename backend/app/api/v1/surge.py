"""
Surge prediction endpoints
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.surge_prediction import SurgePrediction
from app.models.user import User
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


# Hospital-specific surge endpoints
@router.get("/hospital/{hospital_id}/forecast/next-48h")
async def get_hospital_48h_surge_alerts(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get critical surge alerts for next 48 hours"""
    today = date.today()
    two_days_later = today + timedelta(days=2)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city
    
    # Get predictions for next 48 hours
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date >= today,
                SurgePrediction.date <= two_days_later
            )
        ).order_by(SurgePrediction.date)
    )
    predictions = result.scalars().all()
    
    alerts = []
    for pred in predictions:
        footfall = pred.footfall_forecast or {}
        for dept, data in footfall.items():
            if isinstance(data, dict):
                increase_percent = data.get("percentageIncrease", 0)
                if increase_percent > 40:  # Critical threshold
                    alerts.append({
                        "department": dept,
                        "date": pred.date.isoformat(),
                        "increase_percent": int(increase_percent),
                        "from": data.get("baseline", 0),
                        "to": data.get("predicted", 0)
                    })
    
    return {
        "window": "next_48_hours",
        "alerts": alerts
    }


@router.get("/hospital/{hospital_id}/forecast")
async def get_hospital_forecast(
    hospital_id: int,
    department: str = Query(default="All", description="Department filter"),
    days: int = Query(default=7, ge=1, le=14),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get 7-day forecast for hospital"""
    today = date.today()
    end_date = today + timedelta(days=days)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city
    
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
    
    # Aggregate by date
    date_map: Dict[str, Dict[str, Any]] = {}
    for pred in predictions:
        date_str = pred.date.isoformat()
        if date_str not in date_map:
            date_map[date_str] = {"date": date_str, "baseline": 0, "predicted": 0}
        
        footfall = pred.footfall_forecast or {}
        for dept, data in footfall.items():
            if department == "All" or dept == department:
                if isinstance(data, dict):
                    date_map[date_str]["baseline"] += data.get("baseline", 0)
                    date_map[date_str]["predicted"] += data.get("predicted", 0)
    
    days_list = [{"date": d["date"], "baseline": d["baseline"], "predicted": d["predicted"]} 
                 for d in sorted(date_map.values(), key=lambda x: x["date"])]
    
    return {
        "department": department,
        "days": days_list
    }


@router.get("/hospital/{hospital_id}/forecast/department-wise")
async def get_hospital_department_forecast(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get department-wise surge forecast"""
    today = date.today()
    seven_days_later = today + timedelta(days=7)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city
    
    # Get next significant surge for each department
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date >= today,
                SurgePrediction.date <= seven_days_later
            )
        ).order_by(SurgePrediction.date)
    )
    predictions = result.scalars().all()
    
    # Track max surge per department
    dept_surges: Dict[str, Dict[str, Any]] = {}
    for pred in predictions:
        footfall = pred.footfall_forecast or {}
        for dept, data in footfall.items():
            if isinstance(data, dict):
                increase_percent = abs(data.get("percentageIncrease", 0))
                baseline = data.get("baseline", 0)
                predicted = data.get("predicted", 0)
                confidence = data.get("confidence", 0.7)
                
                # Track the highest surge for this department
                if dept not in dept_surges or increase_percent > dept_surges[dept]["increase_percent"]:
                    dept_surges[dept] = {
                        "department": dept,
                        "increase_percent": increase_percent,
                        "baseline": baseline,
                        "predicted": predicted,
                        "confidence": confidence,
                        "date": pred.date.isoformat()
                    }
    
    return list(dept_surges.values())


@router.get("/hospital/{hospital_id}/festivals")
async def get_hospital_festivals(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming festivals affecting the hospital"""
    today = date.today()
    thirty_days_later = today + timedelta(days=30)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city
    
    # Get predictions with festivals
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date >= today,
                SurgePrediction.date <= thirty_days_later,
                SurgePrediction.festival_events.isnot(None)
            )
        ).order_by(SurgePrediction.date)
    )
    predictions = result.scalars().all()
    
    festivals = []
    for pred in predictions:
        if pred.festival_events:
            for fest in pred.festival_events:
                if isinstance(fest, dict):
                    festivals.append({
                        "name": fest.get("name", "Festival"),
                        "date": pred.date.isoformat(),
                        "expected_impact": fest.get("expectedImpact", "medium"),
                        "historical_opd_increase": fest.get("historicalOPDIncrease", 20),
                        "severity": "high" if fest.get("historicalOPDIncrease", 0) > 50 else 
                                   "medium" if fest.get("historicalOPDIncrease", 0) > 30 else "low"
                    })
    
    return festivals


@router.get("/hospital/{hospital_id}/aqi")
async def get_hospital_aqi(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get 7-day AQI forecast for hospital city"""
    today = date.today()
    seven_days_later = today + timedelta(days=7)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city
    
    result = await db.execute(
        select(SurgePrediction).where(
            and_(
                SurgePrediction.city == city,
                SurgePrediction.date >= today,
                SurgePrediction.date <= seven_days_later
            )
        ).order_by(SurgePrediction.date)
    )
    predictions = result.scalars().all()
    
    aqi_forecast = []
    for pred in predictions:
        if pred.aqi_data:
            aqi = pred.aqi_data.get("aqi", 100)
            category = "moderate"
            if aqi < 50:
                category = "good"
            elif aqi < 100:
                category = "moderate"
            elif aqi < 200:
                category = "unhealthy"
            elif aqi < 300:
                category = "very_unhealthy"
            else:
                category = "hazardous"
            
            aqi_forecast.append({
                "date": pred.date.isoformat(),
                "aqi": aqi,
                "category": category,
                "pm25": pred.aqi_data.get("pm25", 0),
                "pm10": pred.aqi_data.get("pm10", 0)
            })
    
    return aqi_forecast
