"""
Surge prediction service
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from typing import Dict, Any, List
from app.models.surge_prediction import SurgePrediction
from app.models.consultation import Consultation
from app.services.external_apis import get_aqi_data, get_weather_data, get_festival_calendar
from openai import OpenAI
from app.core.config import settings
import json

openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class SurgeService:
    """Service for surge prediction operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def compute_daily_predictions(self, city: str = "Delhi") -> Dict[str, Any]:
        """Compute and store daily surge predictions"""
        today = date.today()
        
        # Get external data
        aqi_data = await get_aqi_data(city)
        weather_data = await get_weather_data(city)
        festivals = get_festival_calendar()
        
        # Get historical consultation data (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        result = await self.db.execute(
            select(Consultation).where(
                Consultation.created_at >= thirty_days_ago
            )
        )
        consultations = result.scalars().all()
        
        # Analyze patterns (simplified for hackathon)
        # In production, would use ML models
        base_volume = len(consultations) / 30  # Average daily
        
        # Generate predictions for next 7 days
        predictions = []
        for i in range(7):
            pred_date = today + timedelta(days=i)
            
            # Check for festivals
            festival_today = next((f for f in festivals if f["date"] == pred_date.isoformat()), None)
            festival_impact = festival_today["historical_opd_increase"] if festival_today else 0
            
            # AQI impact (especially for respiratory)
            aqi_impact = 0
            if aqi_data["aqi"] > 300:
                aqi_impact = 60
            elif aqi_data["aqi"] > 200:
                aqi_impact = 40
            elif aqi_data["aqi"] > 150:
                aqi_impact = 20
            
            # Weekend effect
            weekday = pred_date.weekday()
            weekend_factor = -20 if weekday >= 5 else 0
            
            total_increase = festival_impact + aqi_impact + weekend_factor
            predicted_volume = int(base_volume * (1 + total_increase / 100))
            
            # Department-wise breakdown
            footfall_forecast = {
                "Emergency Medicine": {
                    "baseline": int(base_volume * 0.3),
                    "predicted": int(base_volume * 0.3 * (1 + total_increase / 100)),
                    "percentageIncrease": total_increase
                },
                "Pulmonology": {
                    "baseline": int(base_volume * 0.2),
                    "predicted": int(base_volume * 0.2 * (1 + (total_increase + aqi_impact * 0.5) / 100)),
                    "percentageIncrease": total_increase + aqi_impact * 0.5
                },
                "Cardiology": {
                    "baseline": int(base_volume * 0.15),
                    "predicted": int(base_volume * 0.15 * (1 + total_increase / 100)),
                    "percentageIncrease": total_increase
                },
                "General Medicine": {
                    "baseline": int(base_volume * 0.35),
                    "predicted": int(base_volume * 0.35 * (1 + total_increase / 100)),
                    "percentageIncrease": total_increase
                }
            }
            
            # Store prediction
            existing = await self.db.execute(
                select(SurgePrediction).where(
                    SurgePrediction.city == city,
                    SurgePrediction.date == pred_date
                )
            )
            existing_pred = existing.scalar_one_or_none()
            
            if existing_pred:
                existing_pred.footfall_forecast = footfall_forecast
                existing_pred.aqi_data = aqi_data
                existing_pred.weather_data = weather_data
                existing_pred.festival_events = [f for f in festivals if f["date"] == pred_date.isoformat()]
            else:
                new_pred = SurgePrediction(
                    city=city,
                    date=pred_date,
                    footfall_forecast=footfall_forecast,
                    aqi_data=aqi_data,
                    weather_data=weather_data,
                    festival_events=[f for f in festivals if f["date"] == pred_date.isoformat()],
                    staffing_needs=self._calculate_staffing_needs(footfall_forecast),
                    supply_needs=self._calculate_supply_needs(footfall_forecast, aqi_data)
                )
                self.db.add(new_pred)
        
        await self.db.commit()
        return {"status": "computed", "city": city, "days": 7}
    
    def _calculate_staffing_needs(self, footfall: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate staffing needs based on footfall"""
        return {
            "nurses": {"required": 50, "current": 45},
            "doctors": {"required": 20, "current": 18},
            "support_staff": {"required": 30, "current": 28}
        }
    
    def _calculate_supply_needs(self, footfall: Dict[str, Any], aqi: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate supply needs"""
        needs = {}
        if aqi.get("aqi", 0) > 200:
            needs["respiratory"] = {
                "inhalers": 50,
                "masks": 200,
                "nebulizers": 5
            }
        return needs
