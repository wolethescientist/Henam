from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, case, desc
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
import logging
from app.database import get_db
from app.models import (
    User, Job, Task, Invoice, Attendance, Team, 
    EfficiencyScore, InvoiceStatus, TaskStatus, AttendanceStatus, JobStatus
)
from app.auth import get_current_user
from app.services.cache_middleware import cache_route
from app.services.cache_invalidation import cache_invalidation
from app.utils.performance_monitor import monitor_api_response_time
from app.utils.query_optimizer import QueryOptimizer
from app.schemas import UnifiedInvoicesResponse
from app.exceptions import DatabaseError, ValidationError
from app.utils.error_handler import ErrorHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unified", tags=["unified-apis"])

@router.get("/teams")
@cache_route(resource_type="team", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.0)
async def get_unified_teams_data(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all teams data in a single optimized query.
    Includes teams, supervisors, and team members.
    """
    try:
        # Force refresh is now handled by the cache middleware
        
        # Base query with explicit eager loading to prevent "unknown" values
        query = db.query(Team).options(
            joinedload(Team.supervisor),
            joinedload(Team.members)
        )
        
        # Apply search filter if provided
        if search:
            query = query.filter(Team.name.ilike(f"%{search}%"))
        
        # Calculate offset from page
        offset = (page - 1) * limit
        
        # Get teams with pagination - order by newest first
        teams = query.order_by(desc(Team.created_at)).offset(offset).limit(limit).all()
        
        # Get total count for pagination (before applying order and pagination)
        total_count = query.count()
        
        # Get all users for dropdowns (single-user system - all users)
        users = db.query(User).all()
        
        # In single-user system, all users can be supervisors or staff
        supervisors = users  # All users can potentially supervise
        available_staff = [user for user in users if not user.team_id]  # Users not assigned to teams
        
        return {
            "teams": teams,
            "supervisors": supervisors,
            "available_staff": available_staff,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,  # Ceiling division
                "has_next": page * limit < total_count,
                "has_previous": page > 1
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in teams API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve teams data",
            operation="get_unified_teams_data",
            context={"page": page, "limit": limit, "search": search}
        )
    except Exception as e:
        logger.error(f"Unexpected error in teams API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Teams data retrieval failed",
            operation="get_unified_teams_data",
            context={"page": page, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/jobs")
@cache_route(resource_type="job", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.5)
async def get_unified_jobs_data(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    team_id: Optional[int] = None,
    supervisor_filter: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    week: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all jobs data in a single optimized query.
    Includes jobs, teams, supervisors, and related invoices.
    """
    try:
        # Force refresh is now handled by the cache middleware
        
        # Expire all cached objects to force fresh data from database
        db.expire_all()
        
        # Base query with explicit eager loading to prevent "unknown" values
        query = db.query(Job).options(
            joinedload(Job.team),
            joinedload(Job.supervisor),
            joinedload(Job.assigner),  # Ensure assigner is loaded
            joinedload(Job.tasks)
        )
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Job.title.ilike(f"%{search}%"),
                    Job.client.ilike(f"%{search}%")
                )
            )
        
        if status_filter:
            # Convert string status to JobStatus enum
            try:
                # Handle different status formats from frontend
                if status_filter.lower() == 'not_started':
                    job_status = JobStatus.NOT_STARTED
                elif status_filter.lower() == 'in_progress':
                    job_status = JobStatus.IN_PROGRESS
                elif status_filter.lower() == 'completed':
                    job_status = JobStatus.COMPLETED

                else:
                    # Try direct enum conversion for exact matches
                    job_status = JobStatus(status_filter.upper())
                
                query = query.filter(Job.status == job_status)
            except ValueError:
                # Invalid status filter, skip filtering
                logger.warning(f"Invalid status filter: {status_filter}")
                pass
            
        if team_id:
            query = query.filter(Job.team_id == team_id)
            
        if supervisor_filter:
            query = query.filter(Job.supervisor_id == supervisor_filter)
        
        # Date filtering
        from sqlalchemy import extract
        if start_date and end_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(and_(Job.start_date >= start_dt, Job.start_date <= end_dt))
            logger.info(f"Filtering jobs by date range: {start_date} to {end_date}")
        elif month and year:
            # Filter by month and year
            query = query.filter(and_(
                extract('month', Job.start_date) == month,
                extract('year', Job.start_date) == year
            ))
            logger.info(f"Filtering jobs by month={month}, year={year}")
        elif year:
            query = query.filter(extract('year', Job.start_date) == year)
            logger.info(f"Filtering jobs by year={year}")
        elif week and year:
            # Filter by week of year
            query = query.filter(and_(
                extract('week', Job.start_date) == week,
                extract('year', Job.start_date) == year
            ))
            logger.info(f"Filtering jobs by week={week}, year={year}")
        
        # Calculate offset from page
        offset = (page - 1) * limit
        
        # Get jobs with pagination - ORDER BY NEWEST FIRST
        jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(limit).all()
        
        # Get total count for pagination
        total_count = query.count()
        
        # Get teams for dropdowns
        teams = db.query(Team).all()
        
        # Get job IDs for invoice lookup
        job_ids = [job.id for job in jobs]
        
        # Get invoices for these jobs in one query
        invoices = db.query(Invoice).filter(Invoice.job_id.in_(job_ids)).all() if job_ids else []
        
        # Group invoices by job_id
        invoices_by_job = {}
        for invoice in invoices:
            if invoice.job_id not in invoices_by_job:
                invoices_by_job[invoice.job_id] = []
            invoices_by_job[invoice.job_id].append(invoice)
        
        return {
            "jobs": jobs,
            "teams": teams,
            "invoices_by_job": invoices_by_job,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,
                "has_next": page * limit < total_count,
                "has_previous": page > 1
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in jobs API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve jobs data",
            operation="get_unified_jobs_data",
            context={"page": page, "limit": limit, "search": search, "status_filter": status_filter}
        )
    except Exception as e:
        logger.error(f"Unexpected error in jobs API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Jobs data retrieval failed",
            operation="get_unified_jobs_data",
            context={"page": page, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/tasks")
@cache_route(resource_type="task", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.0)
async def get_unified_tasks_data(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all tasks data in a single optimized query.
    Includes tasks, assigned users, and related jobs.
    """
    try:
        # Base query with explicit eager loading to prevent "unknown" values
        query = db.query(Task).options(
            joinedload(Task.assigned_to),
            joinedload(Task.assigner),  # Ensure assigner is loaded
            joinedload(Task.job)
        )
        
        # Apply filters
        if search:
            query = query.filter(Task.title.ilike(f"%{search}%"))
        
        if status_filter:
            query = query.filter(Task.status == status_filter)
            
        if priority_filter:
            query = query.filter(Task.priority == priority_filter)
            
        if assigned_to_id:
            query = query.filter(Task.assigned_to_id == assigned_to_id)
        
        # Calculate offset from page
        offset = (page - 1) * limit
        
        # Get tasks with pagination
        tasks = query.offset(offset).limit(limit).all()
        
        # Get total count for pagination
        total_count = query.count()
        
        # Get users for dropdowns (single-user system - all users)
        users = db.query(User).all()
        
        # Get jobs for dropdowns - NEWEST FIRST
        jobs = db.query(Job).order_by(desc(Job.created_at)).all()
        
        return {
            "tasks": tasks,
            "users": users,
            "jobs": jobs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,
                "has_next": page * limit < total_count,
                "has_previous": page > 1
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in tasks API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve tasks data",
            operation="get_unified_tasks_data",
            context={"page": page, "limit": limit, "search": search, "status_filter": status_filter}
        )
    except Exception as e:
        logger.error(f"Unexpected error in tasks API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Tasks data retrieval failed",
            operation="get_unified_tasks_data",
            context={"page": page, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/invoices")
@cache_route(resource_type="invoice", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.5)
async def get_unified_invoices_data(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all invoices data in a single optimized query.
    Includes invoices, related jobs, and overdue invoices.
    """
    try:
        # Base query with eager loading
        query = db.query(Invoice).options(
            joinedload(Invoice.job).joinedload(Job.team)
        )
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Invoice.description.ilike(f"%{search}%"),
                    Invoice.job.has(Job.title.ilike(f"%{search}%"))
                )
            )
        
        if status_filter:
            # Convert string status to InvoiceStatus enum
            try:
                # Handle different status formats from frontend (lowercase to uppercase)
                invoice_status = InvoiceStatus(status_filter.upper())
                query = query.filter(Invoice.status == invoice_status)
                logger.info(f"Filtering invoices by status: {invoice_status.value}")
            except ValueError:
                # Invalid status filter, skip filtering
                logger.warning(f"Invalid invoice status filter: {status_filter}")
                pass
            
        if team_id:
            query = query.filter(Invoice.job.has(Job.team_id == team_id))
        
        # Calculate offset from page
        offset = (page - 1) * limit
        
        # Get invoices with pagination
        # Sort by: 1) Not converted first (False before True), 2) Newest first within each group
        invoices = query.order_by(
            Invoice.converted_to_job.asc(),  # False (not converted) comes before True (converted)
            Invoice.created_at.desc()         # Within each group, newest first
        ).offset(offset).limit(limit).all()
        
        # Get total count for pagination
        total_count = query.count()
        
        # Get jobs for dropdowns - NEWEST FIRST
        jobs = db.query(Job).order_by(desc(Job.created_at)).all()
        
        # Get overdue invoices in one query
        overdue_invoices = db.query(Invoice).filter(
            and_(
                Invoice.due_date < datetime.now().date(),
                Invoice.status != InvoiceStatus.PAID
            )
        ).all()
        
        return {
            "invoices": invoices,
            "jobs": jobs,
            "overdue_invoices": overdue_invoices,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,
                "has_next": page * limit < total_count,
                "has_previous": page > 1
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in invoices API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve invoices data",
            operation="get_unified_invoices_data",
            context={"page": page, "limit": limit, "search": search, "status_filter": status_filter}
        )
    except Exception as e:
        logger.error(f"Unexpected error in invoices API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Invoices data retrieval failed",
            operation="get_unified_invoices_data",
            context={"page": page, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/attendance")
@cache_route(resource_type="attendance", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.0)
async def get_unified_attendance_data(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    user_id: Optional[int] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all attendance data in a single optimized query.
    Includes attendance records, users, and statistics.
    """
    try:
        # Base query with eager loading
        query = db.query(Attendance).options(
            joinedload(Attendance.staff)
        )
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Attendance.staff.has(User.first_name.ilike(f"%{search}%")),
                    Attendance.staff.has(User.last_name.ilike(f"%{search}%"))
                )
            )
        
        if user_id:
            query = query.filter(Attendance.staff_id == user_id)
            
        if team_id:
            query = query.filter(Attendance.staff.has(User.team_id == team_id))
        
        # Get attendance records with pagination
        attendance_records = query.offset(skip).limit(limit).all()
        
        # Get attendance statistics in one query
        stats_query = db.query(
            func.count(Attendance.id).label('total_records'),
            func.count(case((Attendance.status == AttendanceStatus.PRESENT, 1), else_=None)).label('present_count'),
            func.count(case((Attendance.status == AttendanceStatus.ABSENT, 1), else_=None)).label('absent_count'),
            func.count(case((Attendance.status == AttendanceStatus.LATE, 1), else_=None)).label('late_count')
        )
        
        if user_id:
            stats_query = stats_query.filter(Attendance.staff_id == user_id)
        elif team_id:
            stats_query = stats_query.filter(Attendance.staff.has(User.team_id == team_id))
        
        stats = stats_query.first()
        
        return {
            "attendance_records": attendance_records,
            "stats": {
                "total_records": stats.total_records or 0,
                "present_count": stats.present_count or 0,
                "absent_count": stats.absent_count or 0,
                "late_count": stats.late_count or 0
            },
            "total_count": query.count()
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in attendance API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve attendance data",
            operation="get_unified_attendance_data",
            context={"skip": skip, "limit": limit, "search": search, "user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error in attendance API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Attendance data retrieval failed",
            operation="get_unified_attendance_data",
            context={"skip": skip, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/staff")
@cache_route(resource_type="user", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.5)
async def get_unified_staff_data(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all staff data in a single optimized query.
    Includes staff performance, teams, and supervisors.
    """
    try:
        # Base query with eager loading for staff performance
        query = db.query(User).options(
            joinedload(User.team),
            joinedload(User.supervisor)
        )
        
        # Apply filters - order matters for index usage
        if team_id:
            query = query.filter(User.team_id == team_id)
            
        if search:
            query = query.filter(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
            )
        
        # Get users with pagination
        users = query.offset(skip).limit(limit).all()
        
        # Get teams for dropdowns (cached separately)
        teams = db.query(Team).all()
        
        # Only get supervisors for dropdown if we have results and need them
        supervisors = []
        if users:  # Only fetch if we have users to display
            supervisors = db.query(User).limit(50).all()  # Single-user system - all users can be supervisors
        
        return {
            "staff_data": users,
            "teams": teams,
            "supervisors": supervisors,
            "total_count": query.count()
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in staff API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve staff data",
            operation="get_unified_staff_data",
            context={"skip": skip, "limit": limit, "search": search, "team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error in staff API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Staff data retrieval failed",
            operation="get_unified_staff_data",
            context={"skip": skip, "limit": limit, "error_type": type(e).__name__}
        )

@router.get("/staff/dropdowns")
@cache_route(resource_type="user", ttl=600)  # 10 minutes TTL
@monitor_api_response_time(threshold_seconds=0.5)
async def get_staff_dropdown_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get dropdown data for staff management (teams, supervisors).
    This is cached separately to avoid fetching on every filter change.
    """
    try:
        # Get teams for dropdowns
        teams = db.query(Team).all()
        
        # Get supervisors for dropdown (single-user system - all users)
        supervisors = db.query(User).limit(100).all()
        
        return {
            "teams": teams,
            "supervisors": supervisors
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in dropdown API", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve dropdown data",
            operation="get_staff_dropdown_data",
            context={}
        )
    except Exception as e:
        logger.error(f"Unexpected error in dropdown API: {e}", exc_info=True)
        raise DatabaseError(
            detail="Dropdown data retrieval failed",
            operation="get_staff_dropdown_data",
            context={"error_type": type(e).__name__}
        )
