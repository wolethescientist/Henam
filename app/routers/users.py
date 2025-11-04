from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import List
import logging
import os
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Team, PerformanceMetrics, Attendance, Task, Job, EfficiencyScore
from app.schemas import UserResponse, UserUpdate, EfficiencyScoreResponse, StaffPerformanceResponse, UserCreate, ChangePasswordRequest, UpdateProfileRequest
from pydantic import BaseModel
from app.auth import get_current_user, verify_password, get_password_hash
from app.utils.database_utils import DatabaseUtils, safe_get_by_id, safe_paginate
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError, AuthenticationError
from app.utils.error_handler import ErrorHandler, database_error_handler
from sqlalchemy import func, and_, or_, case

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.get("/", response_model=List[UserResponse])
def get_users(
    page: int = 1, 
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users (Admin only)."""
    offset = (page - 1) * limit
    users = db.query(User).offset(offset).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get user by ID (Admin only)."""
    try:
        user = safe_get_by_id(db, User, user_id)
        if not user:
            raise ResourceNotFoundError(
                detail="User not found",
                resource_type="User",
                resource_id=user_id
            )
        
        logger.debug(f"Retrieved user {user_id}")
        return user
        
    except ResourceNotFoundError as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving user {user_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve user",
            operation="get_user",
            context={"user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving user {user_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="User retrieval failed",
            operation="get_user",
            context={"user_id": user_id, "error_type": type(e).__name__}
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user (Admin only)."""
    try:
        user = safe_get_by_id(db, User, user_id)
        if not user:
            raise ResourceNotFoundError(
                detail="User not found",
                resource_type="User",
                resource_id=user_id
            )
        
        # Validate email uniqueness if email is being updated
        if user_update.email and user_update.email != user.email:
            existing_user = db.query(User).filter(User.email == user_update.email).first()
            if existing_user:
                raise BusinessLogicError(
                    detail="Email already registered",
                    rule="unique_email",
                    context={"email": user_update.email, "existing_user_id": existing_user.id}
                )
        
        # Update user fields
        for field, value in user_update.dict(exclude_unset=True).items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        logger.info(f"User {user_id} updated successfully by user {current_user.id}")
        
        # Clear cache to ensure fresh data
        try:
            from app.services.redis_cache_service import redis_cache
            if redis_cache.redis_client:
                cleared_count = redis_cache.clear_pattern("*")
                logger.debug(f"Cleared {cleared_count} cache entries after user update")
        except Exception as e:
            logger.warning(f"Could not clear cache after user update: {e}")
        
        return user
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except IntegrityError as e:
        logger.error(f"Integrity error updating user {user_id}", exc_info=True)
        db.rollback()
        raise BusinessLogicError(
            detail="User update violates data constraints",
            rule="data_integrity",
            context={"user_id": user_id, "constraint_error": str(e)}
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error updating user {user_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to update user",
            operation="update_user",
            context={"user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error updating user {user_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="User update failed",
            operation="update_user",
            context={"user_id": user_id, "error_type": type(e).__name__}
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user (Admin only)."""
    try:
        user = safe_get_by_id(db, User, user_id)
        if not user:
            raise ResourceNotFoundError(
                detail="User not found",
                resource_type="User",
                resource_id=user_id
            )
        
        # Prevent self-deletion
        if user_id == current_user.id:
            raise BusinessLogicError(
                detail="Cannot delete your own account",
                rule="no_self_deletion",
                context={"user_id": user_id}
            )
        
        # Use database transaction for cascading deletes
        with DatabaseUtils.transaction_scope(db, "delete_user"):
            from app.models import Attendance, EfficiencyScore, Reminder, Notification, Task, Job, PerformanceMetrics
            
            # Delete related records first to avoid foreign key constraint violations
            db.query(Attendance).filter(Attendance.staff_id == user_id).delete()
            db.query(EfficiencyScore).filter(EfficiencyScore.user_id == user_id).delete()
            db.query(PerformanceMetrics).filter(PerformanceMetrics.user_id == user_id).delete()
            db.query(Reminder).filter(Reminder.user_id == user_id).delete()
            db.query(Notification).filter(Notification.user_id == user_id).delete()
            
            # Handle tasks and jobs - reassign rather than delete
            db.query(Task).filter(Task.assigned_to_id == user_id).update({"assigned_to_id": None})
            db.query(Job).filter(Job.supervisor_id == user_id).update({"supervisor_id": None})
            
            # Update subordinates to remove supervisor reference
            db.query(User).filter(User.supervisor_id == user_id).update({"supervisor_id": None})
            
            # Now delete the user
            db.delete(user)
        
        logger.info(f"User {user_id} deleted successfully by user {current_user.id}")
        
        # Clear cache to ensure fresh data
        try:
            from app.services.redis_cache_service import redis_cache
            if redis_cache.redis_client:
                cleared_count = redis_cache.clear_pattern("*")
                logger.debug(f"Cleared {cleared_count} cache entries after user deletion")
        except Exception as e:
            logger.warning(f"Could not clear cache after user deletion: {e}")
        
        return {"message": "User deleted successfully"}
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting user {user_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to delete user",
            operation="delete_user",
            context={"user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting user {user_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="User deletion failed",
            operation="delete_user",
            context={"user_id": user_id, "error_type": type(e).__name__}
        )


@router.post("/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/metrics", response_model=EfficiencyScoreResponse)
def get_user_metrics(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user efficiency metrics."""
    # Admin-only access - simplified since only admins exist now
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get latest efficiency score
    efficiency_score = db.query(EfficiencyScore).filter(
        EfficiencyScore.user_id == user_id
    ).order_by(EfficiencyScore.calculated_at.desc()).first()
    
    if not efficiency_score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No efficiency data found for this user"
        )
    
    return efficiency_score


@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (Admin only)."""
    try:
        # Validate email uniqueness
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise BusinessLogicError(
                detail="Email already registered",
                rule="unique_email",
                context={"email": user_data.email, "existing_user_id": existing_user.id}
            )
        
        # Validate team exists if provided
        if user_data.team_id:
            team = safe_get_by_id(db, Team, user_data.team_id)
            if not team:
                raise ValidationError(
                    detail="Invalid team ID",
                    field="team_id",
                    value=user_data.team_id
                )
        
        # Create new user
        from app.auth import get_password_hash
        user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            team_id=user_data.team_id,
            supervisor_id=user_data.supervisor_id,
            picture_url=user_data.picture_url,
            phone_number=user_data.phone_number,
            contact_info=user_data.contact_info,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"User {user.id} created successfully by user {current_user.id}")
        
        return user
        
    except (BusinessLogicError, ValidationError) as e:
        raise e  # Re-raise structured errors
    except IntegrityError as e:
        logger.error(f"Integrity error creating user", exc_info=True)
        db.rollback()
        raise BusinessLogicError(
            detail="User creation violates data constraints",
            rule="data_integrity",
            context={"email": user_data.email, "constraint_error": str(e)}
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error creating user", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to create user",
            operation="create_user",
            context={"email": user_data.email}
        )
    except Exception as e:
        logger.error(f"Unexpected error creating user: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="User creation failed",
            operation="create_user",
            context={"email": user_data.email, "error_type": type(e).__name__}
        )


@router.get("/staff/performance", response_model=List[StaffPerformanceResponse])
def get_staff_performance(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get staff performance data with metrics."""
    from sqlalchemy.orm import joinedload
    
    # Base query for users with eager loading
    query = db.query(User)
    
    # Single user system - no role-based filtering needed
    
    # Eager load relationships to avoid N+1 queries
    offset = (page - 1) * limit
    users = query.options(
        joinedload(User.team),
        joinedload(User.supervisor)
    ).offset(offset).limit(limit).all()
    
    if not users:
        return []
    
    user_ids = [user.id for user in users]
    team_ids = [user.team_id for user in users if user.team_id]
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Get attendance data in one query
    attendance_data = db.query(
        Attendance.staff_id,
        func.count(Attendance.id).label('total_days'),
        func.sum(
            case(
                (Attendance.status == 'present', 1),
                else_=0
            )
        ).label('present_days')
    ).filter(
        Attendance.staff_id.in_(user_ids),
        Attendance.date >= thirty_days_ago.date()
    ).group_by(Attendance.staff_id).all()
    
    # Get task data in one query
    task_data = db.query(
        Task.assigned_to_id,
        func.count(Task.id).label('total_tasks'),
        func.sum(
            case(
                (Task.status == 'completed', 1),
                else_=0
            )
        ).label('completed_tasks'),
        func.sum(
            case(
                (and_(Task.status == 'completed', Task.updated_at <= Task.deadline), 1),
                else_=0
            )
        ).label('completed_on_time')
    ).filter(
        Task.assigned_to_id.in_(user_ids),
        Task.updated_at >= thirty_days_ago
    ).group_by(Task.assigned_to_id).all()
    
    # Get job contributions
    job_contributions = db.query(
        Job.team_id,
        func.count(Job.id).label('jobs_contributed')
    ).filter(
        Job.team_id.in_(team_ids),
        Job.created_at >= thirty_days_ago
    ).group_by(Job.team_id).all()
    
    # Create lookup dictionaries
    attendance_lookup = {
        row.staff_id: {
            'total_days': row.total_days or 0,
            'present_days': row.present_days or 0
        } for row in attendance_data
    }
    
    task_lookup = {
        row.assigned_to_id: {
            'total_tasks': row.total_tasks or 0,
            'completed_tasks': row.completed_tasks or 0,
            'completed_on_time': row.completed_on_time or 0
        } for row in task_data
    }
    
    job_lookup = {
        row.team_id: row.jobs_contributed or 0 
        for row in job_contributions
    }
    
    # Build result
    staff_performance = []
    for user in users:
        attendance_info = attendance_lookup.get(user.id, {'total_days': 0, 'present_days': 0})
        task_info = task_lookup.get(user.id, {'total_tasks': 0, 'completed_tasks': 0, 'completed_on_time': 0})
        
        attendance_percentage = (
            (attendance_info['present_days'] / 30 * 100) 
            if attendance_info['present_days'] > 0 else 0
        )
        
        # Calculate efficiency score (simplified calculation)
        efficiency_score = 0
        if task_info['completed_tasks'] > 0:
            efficiency_score = min(100, (attendance_percentage * 0.4 + (task_info['completed_tasks'] * 10) * 0.6))
        
        staff_performance.append(StaffPerformanceResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            team_id=user.team_id,
            supervisor_id=user.supervisor_id,
            picture_url=user.picture_url,
            phone_number=user.phone_number,
            contact_info=user.contact_info,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            team_name=user.team.name if user.team else None,
            supervisor_name=user.supervisor.name if user.supervisor else None,
            attendance_percentage=round(attendance_percentage, 1),
            jobs_contributed=job_lookup.get(user.team_id, 0),
            tasks_completed=task_info['completed_tasks'],
            tasks_completed_on_time=task_info['completed_on_time'],
            efficiency_score=round(efficiency_score, 1)
        ))
    
    return staff_performance


@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    profile_update: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile information."""
    # Check if email is being changed and if it already exists
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update fields
    for field, value in profile_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/change-password")
def change_my_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise AuthenticationError(
                detail="Current password is incorrect",
                reason="invalid_current_password",
                context={"user_id": current_user.id}
            )
        
        # Validate new password confirmation
        if password_data.new_password != password_data.confirm_password:
            raise ValidationError(
                detail="New password and confirmation do not match",
                field="confirm_password",
                context={"user_id": current_user.id}
            )
        
        # Update password
        current_user.password_hash = get_password_hash(password_data.new_password)
        db.commit()
        logger.info(f"Password changed successfully for user {current_user.id}")
        
        return {"message": "Password changed successfully"}
        
    except (AuthenticationError, ValidationError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error changing password for user {current_user.id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to change password",
            operation="change_password",
            context={"user_id": current_user.id}
        )
    except Exception as e:
        logger.error(f"Unexpected error changing password for user {current_user.id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Password change failed",
            operation="change_password",
            context={"user_id": current_user.id, "error_type": type(e).__name__}
        )


@router.post("/me/picture/upload")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and update current user's profile picture."""
    logger.info(f"Received file upload request: filename={file.filename}, content_type={file.content_type}, size={file.size}")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
    
    # Validate file size using configured max size
    from app.config import settings
    max_size = settings.max_file_size_mb * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size too large. Maximum size is {settings.max_file_size_mb}MB."
        )
    
    # Create uploads directory using configured base directory
    upload_base_dir = Path(settings.get_upload_base_dir())
    upload_dir = upload_base_dir / "profile_pictures"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Update user's picture_url in database
    picture_url = f"/uploads/profile_pictures/{unique_filename}"
    current_user.picture_url = picture_url
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile picture uploaded successfully", 
        "picture_url": picture_url
    }
