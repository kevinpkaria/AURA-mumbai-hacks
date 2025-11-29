"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.core.logging_config import get_logger
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.schemas.user import UserCreate, UserLogin, UserResponse

router = APIRouter()
logger = get_logger("api.auth")


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user - simplified for POC"""
    logger.info(f"📝 Registration attempt: {user_data.email} (role: {user_data.role.value})")
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        logger.warning(f"⚠️ Registration failed: Email {user_data.email} already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Validate hospital_id for doctors and patients
    if user_data.role in [UserRole.DOCTOR, UserRole.PATIENT]:
        if not user_data.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="hospital_id is required for doctors and patients",
            )
        # Verify hospital exists
        hospital_result = await db.execute(select(Hospital).where(Hospital.id == user_data.hospital_id))
        hospital = hospital_result.scalar_one_or_none()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital not found",
            )
    elif user_data.role == UserRole.ADMIN:
        # For admin/hospital registration, hospital_id should be None
        user_data.hospital_id = None
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        hospital_id=user_data.hospital_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(f"✅ User registered successfully: {new_user.id} ({new_user.email}, role: {new_user.role.value})")
    
    # Just return user - no token needed for POC
    return UserResponse.model_validate(new_user)


@router.post("/login", response_model=UserResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user - simplified for POC"""
    logger.info(f"🔐 Login attempt: {credentials.email}")
    
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"⚠️ Login failed: Invalid credentials for {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    logger.info(f"✅ User logged in: {user.id} ({user.email}, role: {user.role.value})")
    
    # Just return user - no token needed for POC
    return UserResponse.model_validate(user)


