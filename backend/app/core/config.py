"""
Application configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aura_db"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Cal.com (free alternative to Calendly)
    # Get API key from: Settings > Security in Cal.com
    # API docs: https://cal.com/docs/api-reference/v2/introduction
    CAL_COM_API_KEY: str = ""
    CAL_COM_BASE_URL: str = "https://api.cal.com/v2"
    CAL_COM_EVENT_TYPE_ID: int = 1  # Default event type ID - configure in Cal.com dashboard
    
    # External APIs
    OPENAQ_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    
    # Server
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


