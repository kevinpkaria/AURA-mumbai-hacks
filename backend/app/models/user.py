"""
User model
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.PATIENT)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)  # For doctors and patients
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    hospital = relationship("Hospital", back_populates="users")
    documents = relationship("Document", back_populates="patient")
    patient_consultations = relationship("Consultation", foreign_keys="Consultation.patient_id", back_populates="patient")
    doctor_consultations = relationship("Consultation", foreign_keys="Consultation.doctor_id", back_populates="doctor")
    appointments_as_patient = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient_user")
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor_user")


