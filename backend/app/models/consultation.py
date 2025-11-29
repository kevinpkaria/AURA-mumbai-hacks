"""
Consultation model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ConsultationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ESCALATED = "escalated"


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(ConsultationStatus), nullable=False, default=ConsultationStatus.PENDING)
    risk_assessment = Column(JSON, nullable=True)  # Risk assessment from AI
    ai_summary = Column(JSON, nullable=True)  # Enhanced summary
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_consultations")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_consultations")
    messages = relationship("Message", back_populates="consultation", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="consultation")


