"""
Document model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    file_url = Column(String, nullable=True)  # Storage path or URL
    summary = Column(JSON, nullable=True)  # JSON summary from AI
    metrics = Column(JSON, nullable=True)  # Extracted metrics array
    document_type = Column(String, nullable=True)
    date_of_report = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("User", back_populates="documents")


