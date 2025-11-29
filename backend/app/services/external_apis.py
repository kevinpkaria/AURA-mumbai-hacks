"""
External API integrations: Cal.com, AQI, Weather
"""
import httpx
from app.core.config import settings
from app.core.logging_config import get_logger
from typing import Dict, Any, Optional
from datetime import datetime

logger = get_logger("external_apis")


async def create_cal_com_booking(
    patient_email: str,
    doctor_email: str,
    datetime_str: str,
    mode: str = "inperson",
    event_type_id: Optional[int] = None
) -> str:
    """Create a Cal.com booking and return the booking URL"""
    logger.info(f"🔗 Creating Cal.com booking: {mode} appointment at {datetime_str}")
    
    if not settings.CAL_COM_API_KEY:
        # Return mock URL for hackathon
        mock_url = f"https://cal.com/aura-health/appointment-{datetime_str.replace(':', '-').replace(' ', '-')}"
        logger.info(f"📝 Using mock Cal.com URL (no API key configured): {mock_url}")
        return mock_url
    
    # Cal.com API integration
    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"🌐 Calling Cal.com API...")
            
            # Parse datetime to ensure proper format
            try:
                # Cal.com expects ISO 8601 format
                parsed_dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
                start_time = parsed_dt.isoformat()
            except ValueError:
                # Try without timezone
                parsed_dt = datetime.fromisoformat(datetime_str)
                start_time = parsed_dt.isoformat()
            
            # Prepare booking payload
            # Note: Cal.com requires event_type_id - configure CAL_COM_EVENT_TYPE_ID in settings
            # You can create event types via Cal.com dashboard or API
            payload = {
                "eventTypeId": event_type_id or settings.CAL_COM_EVENT_TYPE_ID,
                "start": start_time,
                "responses": {
                    "email": patient_email,
                    "name": "Patient",  # Could be passed as parameter
                },
                "timeZone": "Asia/Kolkata",  # Default timezone - could be configurable
            }
            
            # Add location based on mode
            if mode == "online":
                payload["location"] = "integrations:zoom"  # Or other video provider
            else:
                payload["location"] = "In-person"  # Physical location
            
            response = await client.post(
                f"{settings.CAL_COM_BASE_URL}/bookings",
                headers={
                    "Authorization": f"Bearer {settings.CAL_COM_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=10.0
            )
            response.raise_for_status()
            booking_data = response.json()
            
            # Extract booking URL from response
            # Cal.com returns booking with uid, we construct the URL
            booking_uid = booking_data.get("uid") or booking_data.get("id")
            if booking_uid:
                booking_url = f"https://cal.com/booking/{booking_uid}"
            else:
                # Fallback to response URL if available
                booking_url = booking_data.get("url", f"https://cal.com/bookings/{booking_data.get('id', 'unknown')}")
            
            logger.info(f"✅ Cal.com booking created: {booking_url}")
            return booking_url
            
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ Cal.com API HTTP error: {e.response.status_code} - {e.response.text}", exc_info=True)
        # Fallback to mock URL
        mock_url = f"https://cal.com/aura-health/appointment-{datetime_str.replace(':', '-').replace(' ', '-')}"
        logger.warning(f"⚠️ Using fallback mock URL: {mock_url}")
        return mock_url
    except Exception as e:
        logger.error(f"❌ Cal.com API error: {str(e)}", exc_info=True)
        # Fallback to mock URL
        mock_url = f"https://cal.com/aura-health/appointment-{datetime_str.replace(':', '-').replace(' ', '-')}"
        logger.warning(f"⚠️ Using fallback mock URL: {mock_url}")
        return mock_url


async def get_aqi_data(city: str = "Delhi") -> Dict[str, Any]:
    """Get AQI data from OpenAQ"""
    if not settings.OPENAQ_API_KEY:
        # Return mock data for hackathon
        return {
            "aqi": 180,
            "category": "unhealthy",
            "pm25": 108,
            "pm10": 144,
            "primary_pollutant": "PM2.5"
        }
    
    # Real OpenAQ integration
    # async with httpx.AsyncClient() as client:
    #     response = await client.get(
    #         f"https://api.openaq.org/v2/latest",
    #         params={"location": city},
    #         headers={"X-API-Key": settings.OPENAQ_API_KEY}
    #     )
    #     data = response.json()
    #     return process_aqi_data(data)
    
    return {
        "aqi": 180,
        "category": "unhealthy",
        "pm25": 108,
        "pm10": 144,
        "primary_pollutant": "PM2.5"
    }


async def get_weather_data(city: str = "Delhi") -> Dict[str, Any]:
    """Get weather data from OpenWeatherMap"""
    if not settings.OPENWEATHER_API_KEY:
        # Return mock data
        return {
            "temperature": 28,
            "humidity": 65,
            "condition": "partly_cloudy"
        }
    
    # Real OpenWeatherMap integration
    # async with httpx.AsyncClient() as client:
    #     response = await client.get(
    #         "https://api.openweathermap.org/data/2.5/weather",
    #         params={
    #             "q": city,
    #             "appid": settings.OPENWEATHER_API_KEY,
    #             "units": "metric"
    #         }
    #     )
    #     data = response.json()
    #     return process_weather_data(data)
    
    return {
        "temperature": 28,
        "humidity": 65,
        "condition": "partly_cloudy"
    }


def get_festival_calendar() -> list[Dict[str, Any]]:
    """Get festival calendar (static data for hackathon)"""
    from datetime import date, timedelta
    today = date.today()
    
    return [
        {
            "id": "fest-1",
            "name": "Diwali",
            "date": (today + timedelta(days=2)).isoformat(),
            "type": "religious",
            "expected_impact": "high",
            "historical_opd_increase": 45
        },
        {
            "id": "fest-2",
            "name": "Diwali Weekend",
            "date": (today + timedelta(days=3)).isoformat(),
            "type": "regional",
            "expected_impact": "high",
            "historical_opd_increase": 35
        },
        {
            "id": "fest-3",
            "name": "Gurunanak Jayanti",
            "date": (today + timedelta(days=17)).isoformat(),
            "type": "religious",
            "expected_impact": "medium",
            "historical_opd_increase": 20
        },
        {
            "id": "fest-4",
            "name": "Christmas",
            "date": (today + timedelta(days=29)).isoformat(),
            "type": "national",
            "expected_impact": "high",
            "historical_opd_increase": 40
        }
    ]


