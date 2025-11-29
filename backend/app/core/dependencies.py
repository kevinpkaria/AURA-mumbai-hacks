"""
FastAPI dependencies for auth and database
"""
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.logging_config import get_logger
from app.models.user import User
from sqlalchemy import select
from typing import Optional

logger = get_logger("dependencies")


async def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user - simplified for POC"""
    if not x_user_id:
        logger.warning("⚠️ Authentication failed: Missing X-User-ID header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID header",
        )
    
    try:
        user_id = int(x_user_id)
    except (ValueError, TypeError):
        logger.warning(f"⚠️ Authentication failed: Invalid user ID format: {x_user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user ID: {x_user_id}",
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        logger.warning(f"⚠️ Authentication failed: User {user_id} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User with ID {user_id} not found",
        )
    
    logger.debug(f"✅ Authenticated user: {user_id} ({user.role.value})")
    return user


async def get_current_patient(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is a patient"""
    if current_user.role.value != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required",
        )
    return current_user


async def get_current_doctor(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is a doctor"""
    if current_user.role.value != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is an admin"""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


