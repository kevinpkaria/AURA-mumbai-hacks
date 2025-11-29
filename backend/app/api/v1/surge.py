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
    from app.services.ai_agents import SurgeAgent
    from app.core.logging_config import get_logger
    
    logger = get_logger("surge")
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
    
    # If no predictions exist, generate them on-demand
    if not predictions:
        logger.info(f"No predictions found for {city}, generating on-demand...")
        surge_agent = SurgeAgent(db)
        await surge_agent.compute_daily_predictions(city, hospital_id)
        
        # Re-fetch predictions
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
                if increase_percent > 30:  # Critical threshold (lowered from 40)
                    alerts.append({
                        "department": dept,
                        "date": pred.date.isoformat(),
                        "increase_percent": int(increase_percent),
                        "from": data.get("baseline", 0),
                        "to": data.get("predicted", 0)
                    })
    
    logger.info(f"Found {len(alerts)} critical alerts for hospital {hospital_id}")
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
    """Get 7-day forecast for hospital.

    We recompute surge predictions on every request so the forecast
    reflects the latest daily signals (AQI, festivals, etc.).
    """
    from app.services.ai_agents import SurgeAgent
    from app.core.logging_config import get_logger
    
    logger = get_logger("surge")
    today = date.today()
    end_date = today + timedelta(days=days)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    city = hospital.city

    # Always recompute predictions so each day's forecast can change as inputs change
    logger.info(f"[Forecast] Recomputing daily surge predictions for city={city}, hospital={hospital_id}")
    surge_agent = SurgeAgent(db)
    await surge_agent.compute_daily_predictions(city, hospital_id)
    
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
    from app.services.ai_agents import SurgeAgent
    from app.core.logging_config import get_logger
    
    logger = get_logger("surge")
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
    
    # If no predictions exist, generate them on-demand
    if not predictions:
        logger.info(f"No predictions found for {city}, generating on-demand...")
        surge_agent = SurgeAgent(db)
        await surge_agent.compute_daily_predictions(city, hospital_id)
        
        # Re-fetch predictions
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
    from app.services.external_apis import get_festival_calendar
    from app.core.logging_config import get_logger
    
    logger = get_logger("surge")
    today = date.today()
    thirty_days_later = today + timedelta(days=30)
    
    # Get hospital city
    from app.models.hospital import Hospital
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    # Get festivals directly from external API
    festival_list = get_festival_calendar()
    
    # Filter festivals in the next 30 days
    festivals = []
    for fest in festival_list:
        fest_date = date.fromisoformat(fest.get("date", ""))
        if today <= fest_date <= thirty_days_later:
            festivals.append({
                "id": fest.get("id", f"fest-{fest.get('name', 'unknown')}"),
                "name": fest.get("name", "Festival"),
                "date": fest.get("date"),
                "type": fest.get("type", "religious"),
                "expected_impact": fest.get("expected_impact", "medium"),
                "historical_opd_increase": fest.get("historical_opd_increase", 20),
                "description": fest.get("description", "")
            })
    
    logger.info(f"Found {len(festivals)} upcoming festivals for {hospital.city}")
    return festivals


@router.get("/hospital/{hospital_id}/aqi")
async def get_hospital_aqi(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get 7-day AQI forecast for hospital city.
    This now bypasses DB predictions and uses the WAQI `/feed/here` endpoint directly,
    then converts `forecast.daily.pm25[*].avg` into AQI for each day.
    """
    from app.services.external_apis import get_aqi_data
    from app.core.logging_config import get_logger

    logger = get_logger("surge")
    today = date.today()

    # Call WAQI API (using /here/ with your token)
    base_aqi_data = await get_aqi_data("Mumbai")  # City arg is only for logging; API uses /here/
    logger.info(f"📦 [AQI] Base AQI data received (keys): {list(base_aqi_data.keys())}")

    # NOTE: external_apis.get_aqi_data already flattens `forecast.daily` into `forecast`
    # so base_aqi_data["forecast"] looks like: {"pm10": [...], "pm25": [...], "uvi": [...]}
    forecast = base_aqi_data.get("forecast", {}) or {}
    pm25_forecast = forecast.get("pm25", [])

    if not pm25_forecast:
        logger.error("❌ [AQI] No PM2.5 forecast data available from WAQI (expected 'forecast' -> 'pm25')")
        raise HTTPException(status_code=503, detail="AQI PM2.5 forecast data not available")

    logger.info(f"📅 [AQI] PM2.5 forecast days from API: {[d.get('day') for d in pm25_forecast]}")

    aqi_forecast: list[dict[str, Any]] = []

    for i in range(7):
        pred_date = today + timedelta(days=i)
        date_str = pred_date.isoformat()

        pm25_value = None
        for day_data in pm25_forecast:
            forecast_date = day_data.get("day")
            logger.info(f"📅 [AQI] Checking PM2.5 forecast date: {forecast_date} vs {date_str}")
            if forecast_date == date_str:
                pm25_value = day_data.get("avg", day_data.get("max", 0))
                logger.info(f"✅ [AQI] Found PM2.5 forecast for {date_str}: avg={pm25_value}")
                break

        if pm25_value is None:
            logger.warning(f"⚠️ [AQI] No PM2.5 forecast found for {date_str}")
            continue

        # Convert PM2.5 (µg/m³) to AQI using simplified US EPA breakpoints
        if pm25_value <= 12:
            aqi = int((50 / 12) * pm25_value)
        elif pm25_value <= 35.4:
            aqi = int(50 + ((100 - 50) / (35.4 - 12)) * (pm25_value - 12))
        elif pm25_value <= 55.4:
            aqi = int(100 + ((150 - 100) / (55.4 - 35.4)) * (pm25_value - 35.4))
        elif pm25_value <= 150.4:
            aqi = int(150 + ((200 - 150) / (150.4 - 55.4)) * (pm25_value - 55.4))
        elif pm25_value <= 250.4:
            aqi = int(200 + ((300 - 200) / (250.4 - 150.4)) * (pm25_value - 150.4))
        else:
            aqi = int(300 + ((400 - 300) / (350.4 - 250.4)) * (pm25_value - 250.4))

        category = "moderate"
        if aqi < 50:
            category = "good"
        elif aqi < 100:
            category = "moderate"
        elif aqi < 150:
            category = "unhealthy_for_sensitive"
        elif aqi < 200:
            category = "unhealthy"
        elif aqi < 300:
            category = "very_unhealthy"
        else:
            category = "hazardous"

        aqi_forecast.append(
            {
                "date": date_str,
                "aqi": int(aqi),
                "category": category,
                "pm25": int(pm25_value),
                "pm10": 0,
            }
        )

        logger.info(
            f"✅ [AQI] Added forecast for {date_str}: PM2.5={pm25_value}, AQI={aqi}, Category={category}"
        )

    logger.info(f"📊 [AQI] Returning {len(aqi_forecast)} days of AQI data")
    return aqi_forecast
