"""
Recommendation schemas
"""
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Dict, Any, List
from app.models.recommendation import RecommendationPriority, RecommendationCategory


class RecommendationBase(BaseModel):
    title: str
    description: str
    priority: RecommendationPriority = RecommendationPriority.MEDIUM
    category: RecommendationCategory = RecommendationCategory.OPERATIONS
    department: Optional[str] = None
    deadline: Optional[date] = None
    estimated_cost: Optional[int] = None
    progress_completed: int = 0
    progress_total: int = 1
    extra_data: Optional[Dict[str, Any]] = None  # Renamed from metadata


class RecommendationCreate(RecommendationBase):
    hospital_id: Optional[int] = None


class RecommendationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[RecommendationPriority] = None
    category: Optional[RecommendationCategory] = None
    department: Optional[str] = None
    deadline: Optional[date] = None
    estimated_cost: Optional[int] = None
    progress_completed: Optional[int] = None
    progress_total: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None  # Renamed from metadata


class RecommendationResponse(RecommendationBase):
    id: int
    hospital_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RecommendationStats(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    completed: int

