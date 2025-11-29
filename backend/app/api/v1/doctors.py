"""
Doctor endpoints
"""
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_doctor
from app.models.user import User

router = APIRouter()


@router.get("/me")
async def get_current_doctor_info(
    current_user: User = Depends(get_current_doctor)
):
    """Get current doctor info"""
    return current_user


