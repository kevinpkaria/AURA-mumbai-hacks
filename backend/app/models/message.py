"""
Message model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class MessageRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    AURA_AGENT = "aura_agent"
    RISK_ASSESSMENT = "risk_assessment"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    sender_role = Column(SQLEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    message_metadata = Column("metadata", JSON, nullable=True)  # For risk cards, tool calls, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    consultation = relationship("Consultation", back_populates="messages")


