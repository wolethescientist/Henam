from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List
import logging
from app.database import get_db
from app.models import Attendance, User, AttendanceStatus
from app.schemas import AttendanceCheckIn, AttendanceCheckOut, AttendanceResponse, AttendanceWithStaffResponse
from app.auth import get_current_user
from app.services.cache_service import cache_result
from app.exceptions import DatabaseError, ValidationError
from app.utils.error_handler import ErrorHandler
from datetime import datetime, date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/check-in")
def check_in(
    check_in_data: AttendanceCheckIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Staff check-in."""
    
    check_date = check_in_data.date.date() if check_in_data.date else datetime.utcnow().date()
    
    # Check if already checked in today
    existing_attendance = db.query(Attendance).filter(
        Attendance.staff_id == current_user.id,
        Attendance.date == check_date
    ).first()
    
    if existing_attendance and existing_attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked in today"
        )
    
    if existing_attendance:
        # Update existing record
        existing_attendance.check_in = datetime.utcnow()
        existing_attendance.status = AttendanceStatus.PRESENT
    else:
        # Create new record
        attendance = Attendance(
            staff_id=current_user.id,
            date=check_date,
            check_in=datetime.utcnow(),
            status=AttendanceStatus.PRESENT
        )
        db.add(attendance)
    
    db.commit()
    return {"message": "Checked in successfully"}


@router.post("/check-out")
def check_out(
    check_out_data: AttendanceCheckOut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Staff check-out."""
    
    check_date = check_out_data.date.date() if check_out_data.date else datetime.utcnow().date()
    
    # Find today's attendance record
    attendance = db.query(Attendance).filter(
        Attendance.staff_id == current_user.id,
        Attendance.date == check_date
    ).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No check-in record found for today"
        )
    
    if not attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must check in before checking out"
        )
    
    if attendance.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked out today"
        )
    
    attendance.check_out = datetime.utcnow()
    db.commit()
    
    return {"message": "Checked out successfully"}


@router.get("/all", response_model=List[AttendanceWithStaffResponse])
def get_all_attendance(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all attendance records (single-user system)."""
    
    offset = (page - 1) * limit
    attendance_records = db.query(Attendance).join(User, Attendance.staff_id == User.id).order_by(Attendance.date.desc()).offset(offset).limit(limit).all()
    return attendance_records


@router.get("/stats")
@cache_result(ttl_seconds=300)  # Cache for 5 minutes
def get_attendance_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Get attendance statistics."""
    try:
        from sqlalchemy import func, case
        
        # Single-user system - show all attendance stats
        base_query = db.query(Attendance)
        
        # Single optimized query for all stats
        stats = base_query.with_entities(
            func.count(Attendance.id).label('total_records'),
            func.sum(
                case(
                    (Attendance.status == AttendanceStatus.PRESENT, 1),
                    else_=0
                )
            ).label('present'),
            func.sum(
                case(
                    (Attendance.status == AttendanceStatus.ABSENT, 1),
                    else_=0
                )
            ).label('absent'),
            func.sum(
                case(
                    (Attendance.status == AttendanceStatus.LATE, 1),
                    else_=0
                )
            ).label('late')
        ).first()
        
        total_records = stats.total_records or 0
        present = stats.present or 0
        absent = stats.absent or 0
        late = stats.late or 0
        
        # Calculate attendance percentage safely
        attendance_percentage = 0.0
        if total_records > 0:
            attendance_percentage = round((present / total_records * 100), 2)
        
        return {
            "total_records": total_records,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_percentage": attendance_percentage
        }
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in attendance stats", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve attendance statistics",
            operation="get_attendance_stats",
            context={"staff_id": staff_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error in attendance stats: {e}", exc_info=True)
        raise DatabaseError(
            detail="Attendance statistics retrieval failed",
            operation="get_attendance_stats",
            context={"staff_id": staff_id, "error_type": type(e).__name__}
        )


@router.get("/{staff_id}", response_model=List[AttendanceResponse])
def get_staff_attendance(
    staff_id: int,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get staff attendance records."""
    # Check if staff exists
    staff = db.query(User).filter(User.id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    # Single-user system - allow access
    offset = (page - 1) * limit
    attendance_records = db.query(Attendance).filter(
        Attendance.staff_id == staff_id
    ).order_by(Attendance.date.desc()).offset(offset).limit(limit).all()
    
    return attendance_records


@router.get("/my/records", response_model=List[AttendanceResponse])
def get_my_attendance(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's attendance records."""
    # Allow all authenticated users to view their own attendance records
    offset = (page - 1) * limit
    attendance_records = db.query(Attendance).filter(
        Attendance.staff_id == current_user.id
    ).order_by(Attendance.date.desc()).offset(offset).limit(limit).all()
    
    return attendance_records