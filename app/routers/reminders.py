from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Reminder, User, ReminderType, ReminderStatus
from app.schemas import ReminderCreate, ReminderResponse
from app.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post("/", response_model=ReminderResponse)
def create_reminder(
    reminder_data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new reminder."""
    # Verify user exists
    user = db.query(User).filter(User.id == reminder_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    # Check permissions - supervisor can only create reminders for their team
    
    
    db_reminder = Reminder(**reminder_data.dict())
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    
    # Clear all cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            # Clear all cache entries to ensure fresh data
            cleared_count = redis_cache.clear_pattern("*")
            print(f"🧹 Cleared {cleared_count} cache entries after reminder creation")
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")
    
    return db_reminder


@router.get("/", response_model=List[ReminderResponse])
def get_reminders(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reminders."""
    # Single-user system - show all data
    offset = (page - 1) * limit
    reminders = db.query(Reminder).offset(offset).limit(limit).all()
    
    return reminders


@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reminder by ID."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    # Single-user system - allow access
    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete reminder (Admin only)."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}


@router.post("/{reminder_id}/mark-sent")
def mark_reminder_sent(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark reminder as sent (Admin only)."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    reminder.status = ReminderStatus.SENT
    db.commit()
    return reminder