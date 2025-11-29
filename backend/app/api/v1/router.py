"""
Main API router - aggregates all v1 endpoints
"""
from fastapi import APIRouter
from app.api.v1 import auth, patients, doctors, consultations, messages, documents, appointments, surge, ai, hospitals

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["consultations"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(surge.router, prefix="/surge", tags=["surge"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["hospitals"])


