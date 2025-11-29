# Pydantic schemas
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.schemas.document import DocumentCreate, DocumentResponse
from app.schemas.consultation import ConsultationCreate, ConsultationResponse, ConsultationUpdate
from app.schemas.message import MessageCreate, MessageResponse
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.schemas.surge import SurgePredictionResponse, SurgeAlertResponse

__all__ = [
    "UserCreate",
    "UserResponse",
    "UserLogin",
    "DocumentCreate",
    "DocumentResponse",
    "ConsultationCreate",
    "ConsultationResponse",
    "ConsultationUpdate",
    "MessageCreate",
    "MessageResponse",
    "AppointmentCreate",
    "AppointmentResponse",
    "SurgePredictionResponse",
    "SurgeAlertResponse",
]


