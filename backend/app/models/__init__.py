# Database models
from app.models.user import User
from app.models.hospital import Hospital
from app.models.document import Document
from app.models.consultation import Consultation
from app.models.message import Message
from app.models.appointment import Appointment
from app.models.surge_prediction import SurgePrediction

__all__ = [
    "User",
    "Hospital",
    "Document",
    "Consultation",
    "Message",
    "Appointment",
    "SurgePrediction",
]


