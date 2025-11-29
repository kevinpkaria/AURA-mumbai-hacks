"""
Appointment model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class AppointmentMode(str, enum.Enum):
    ONLINE = "online"
    IN_PERSON = "inperson"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=True)
    datetime = Column(DateTime(timezone=True), nullable=False)
    mode = Column(SQLEnum(AppointmentMode), nullable=False, default=AppointmentMode.IN_PERSON)
    external_link = Column(String, nullable=True)  # Cal.com booking URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient_user = relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor_user = relationship("User", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    consultation = relationship("Consultation", back_populates="appointments")


