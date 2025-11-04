from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PasswordResetToken
from app.schemas import UserCreate, UserLogin, Token, UserResponse, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.auth import authenticate_user, create_access_token, get_password_hash, get_current_user, verify_password
from datetime import timedelta, datetime
from app.config import settings
import secrets
import uuid
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login endpoint that returns JWT token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user (single-user system)."""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        team_id=user_data.team_id
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for logged-in user."""
    
    # Validate passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match"
        )
    
    # Validate current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Check if new password is different from current
    if verify_password(password_data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Hash and update password
    new_password_hash = get_password_hash(password_data.new_password)
    current_user.password_hash = new_password_hash
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password changed successfully. Please log in again."}


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Send password reset email to user."""
    
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent."}
    
    if not user.is_active:
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Generate secure token
    reset_token = secrets.token_urlsafe(32)
    
    # Set expiration time (30 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    
    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})
    
    # Create new reset token
    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at,
        used=False
    )
    
    db.add(reset_token_record)
    db.commit()
    
    # Send email
    email_sent = email_service.send_password_reset_email(
        user_email=user.email,
        user_name=user.name,
        reset_token=reset_token,
        expires_in_minutes=30
    )
    
    if not email_sent:
        # If email fails, mark token as used to prevent abuse
        reset_token_record.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email. Please try again later."
        )
    
    return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token."""
    
    # Validate passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match"
        )
    
    # Validate new password strength
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Find valid reset token
    reset_token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == reset_token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if new password is different from current
    if verify_password(request.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    new_password_hash = get_password_hash(request.new_password)
    user.password_hash = new_password_hash
    user.updated_at = datetime.utcnow()
    
    # Mark token as used
    reset_token_record.used = True
    
    # Invalidate all other reset tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})
    
    db.commit()
    
    return {"message": "Password reset successfully. Please log in with your new password."}
