"""
Recommendation model for hospital operations
"""
from sqlalchemy import Column, Integer, String, DateTime, Date, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class RecommendationPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationCategory(str, enum.Enum):
    STAFFING = "staffing"
    SUPPLIES = "supplies"
    OPERATIONS = "operations"
    COMMUNICATION = "communication"


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(SQLEnum(RecommendationPriority), nullable=False, default=RecommendationPriority.MEDIUM)
    category = Column(SQLEnum(RecommendationCategory), nullable=False, default=RecommendationCategory.OPERATIONS)
    department = Column(String, nullable=True)
    deadline = Column(Date, nullable=True)
    estimated_cost = Column(Integer, nullable=True)  # In rupees
    progress_completed = Column(Integer, default=0)
    progress_total = Column(Integer, default=1)
    extra_data = Column(JSON, nullable=True)  # For additional data like action items (renamed from metadata to avoid SQLAlchemy conflict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    hospital = relationship("Hospital", back_populates="recommendations")

