from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Notification, User, NotificationStatus
from app.schemas import NotificationResponse, NotificationCreate
from app.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notifications."""
    offset = (page - 1) * limit
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    
    return notifications


@router.get("/unread", response_model=List[NotificationResponse])
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's unread notifications."""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.UNREAD
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.status = NotificationStatus.READ
    notification.read_at = datetime.now()
    db.commit()
    
    return {"message": "Notification marked as read"}


@router.patch("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all user's notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.UNREAD
    ).update({
        "status": NotificationStatus.READ,
        "read_at": datetime.now()
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted successfully"}


@router.get("/count")
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.UNREAD
    ).count()
    
    return {"unread_count": count}
