"""
Recommendation endpoints for hospital operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.recommendation import Recommendation, RecommendationPriority, RecommendationCategory
from app.models.user import User
from app.schemas.recommendation import (
    RecommendationCreate,
    RecommendationUpdate,
    RecommendationResponse,
    RecommendationStats
)

router = APIRouter()


@router.get("/hospital/{hospital_id}/stats", response_model=RecommendationStats)
async def get_recommendations_stats(
    hospital_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get recommendation statistics for a hospital"""
    query = select(Recommendation).where(Recommendation.hospital_id == hospital_id)
    result = await db.execute(query)
    recommendations = result.scalars().all()
    
    total = len(recommendations)
    critical = sum(1 for r in recommendations if r.priority == RecommendationPriority.CRITICAL)
    high = sum(1 for r in recommendations if r.priority == RecommendationPriority.HIGH)
    medium = sum(1 for r in recommendations if r.priority == RecommendationPriority.MEDIUM)
    low = sum(1 for r in recommendations if r.priority == RecommendationPriority.LOW)
    completed = sum(1 for r in recommendations if r.progress_completed >= r.progress_total)
    
    return RecommendationStats(
        total=total,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        completed=completed
    )


@router.get("/hospital/{hospital_id}/recommendations", response_model=List[RecommendationResponse])
async def get_hospital_recommendations(
    hospital_id: int,
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    department: Optional[str] = Query(None, description="Filter by department"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get recommendations for a hospital with filtering"""
    from app.services.ai_agents import OperationsAgent
    from app.core.logging_config import get_logger
    
    logger = get_logger("recommendations")
    
    # Check if recommendations exist, if not generate them
    count_result = await db.execute(
        select(func.count(Recommendation.id)).where(Recommendation.hospital_id == hospital_id)
    )
    rec_count = count_result.scalar() or 0
    
    if rec_count == 0:
        logger.info(f"No recommendations found for hospital {hospital_id}, generating on-demand...")
        operations_agent = OperationsAgent(db)
        result = await operations_agent.generate_recommendations(hospital_id)
        logger.info(f"Generated {result.get('recommendations_created', 0)} recommendations")
    
    query = select(Recommendation).where(Recommendation.hospital_id == hospital_id)
    
    if priority:
        try:
            priority_enum = RecommendationPriority(priority.lower())
            query = query.where(Recommendation.priority == priority_enum)
        except ValueError:
            pass
    
    if category:
        try:
            category_enum = RecommendationCategory(category.lower())
            query = query.where(Recommendation.category == category_enum)
        except ValueError:
            pass
    
    if department:
        query = query.where(Recommendation.department.ilike(f"%{department}%"))
    
    if search:
        query = query.where(
            or_(
                Recommendation.title.ilike(f"%{search}%"),
                Recommendation.description.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(
        Recommendation.priority.desc(),
        Recommendation.deadline.asc(),
        Recommendation.created_at.desc()
    )
    
    result = await db.execute(query)
    recommendations = result.scalars().all()
    
    return [RecommendationResponse.model_validate(rec) for rec in recommendations]


@router.post("/hospital/{hospital_id}/recommendations", response_model=RecommendationResponse)
async def create_recommendation(
    hospital_id: int,
    recommendation_data: RecommendationCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new recommendation"""
    new_rec = Recommendation(
        hospital_id=hospital_id,
        title=recommendation_data.title,
        description=recommendation_data.description,
        priority=recommendation_data.priority,
        category=recommendation_data.category,
        department=recommendation_data.department,
        deadline=recommendation_data.deadline,
        estimated_cost=recommendation_data.estimated_cost,
        progress_completed=recommendation_data.progress_completed,
        progress_total=recommendation_data.progress_total,
        extra_data=recommendation_data.extra_data
    )
    db.add(new_rec)
    await db.commit()
    await db.refresh(new_rec)
    return RecommendationResponse.model_validate(new_rec)


@router.get("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get a recommendation by ID"""
    result = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
    recommendation = result.scalar_one_or_none()
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return RecommendationResponse.model_validate(recommendation)


@router.patch("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
async def update_recommendation(
    recommendation_id: int,
    update_data: RecommendationUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a recommendation"""
    result = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
    recommendation = result.scalar_one_or_none()
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    # Update fields
    if update_data.title is not None:
        recommendation.title = update_data.title
    if update_data.description is not None:
        recommendation.description = update_data.description
    if update_data.priority is not None:
        recommendation.priority = update_data.priority
    if update_data.category is not None:
        recommendation.category = update_data.category
    if update_data.department is not None:
        recommendation.department = update_data.department
    if update_data.deadline is not None:
        recommendation.deadline = update_data.deadline
    if update_data.estimated_cost is not None:
        recommendation.estimated_cost = update_data.estimated_cost
    if update_data.progress_completed is not None:
        recommendation.progress_completed = update_data.progress_completed
    if update_data.progress_total is not None:
        recommendation.progress_total = update_data.progress_total
    if update_data.extra_data is not None:
        recommendation.extra_data = update_data.extra_data
    
    await db.commit()
    await db.refresh(recommendation)
    return RecommendationResponse.model_validate(recommendation)


@router.delete("/recommendations/{recommendation_id}")
async def delete_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a recommendation"""
    result = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
    recommendation = result.scalar_one_or_none()
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    await db.delete(recommendation)
    await db.commit()
    return {"message": "Recommendation deleted successfully"}

