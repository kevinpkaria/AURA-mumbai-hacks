"""
AURA Backend - FastAPI Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router
from app.core.scheduler import scheduler
from app.core.logging_config import get_logger

# Initialize logging configuration
import app.core.logging_config  # noqa: F401

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting AURA Backend...")
    logger.info(f"📊 Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'configured'}")
    
    # Create tables
    logger.info("📋 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready")
    
    # Start scheduler
    logger.info("⏰ Starting background scheduler...")
    scheduler.start()
    logger.info("✅ Scheduler started")
    
    logger.info("🎉 AURA Backend is ready!")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AURA Backend...")
    scheduler.shutdown()
    logger.info("✅ Shutdown complete")


app = FastAPI(
    title="AURA API",
    description="Autonomous Unified Record Assistant - Healthcare AI Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "AURA API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


