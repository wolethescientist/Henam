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
from app.schemas import UnifiedInvoicesResponse, ClientSummary, AuditLogEntry, DuplicateCheckRequest, DuplicateCheckResponse, JobCreate, JobResponse, PaginatedResponse, InvoiceLinkToJob
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError
from app.utils.error_handler import ErrorHandler
from app.services.job_duplicate_service import job_duplicate_service
from app.services.job_audit_service import job_audit_service
from app.services.job_creation_service import job_creation_service
from app.services.notification_service import notification_service
import asyncio

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


@router.post("/jobs", response_model=JobResponse)
@monitor_api_response_time(threshold_seconds=1.0)
async def create_job_unified(
    job_data: JobCreate,
    skip_duplicate_check: bool = False,
    duplicate_justification: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job manually (unified API).
    
    Parameters:
    - job_data: Job creation data (title, client, dates, team, supervisor)
    - skip_duplicate_check: Set to True to bypass duplicate warning (default: False)
    - duplicate_justification: Required if skip_duplicate_check is True
    
    Returns:
    - Created job with creation_source set to MANUAL
    
    Raises:
    - 400: Validation error (missing fields, invalid dates, missing justification)
    - 404: Team or supervisor not found
    - 409: Duplicate jobs found (if not skipped)
    """
    try:
        logger.info(
            f"[UNIFIED] Job creation request from user {current_user.id}: "
            f"title='{job_data.title}', client='{job_data.client}', "
            f"skip_duplicate_check={skip_duplicate_check}"
        )
        
        # Validate justification is provided when skipping duplicate check
        if skip_duplicate_check and not duplicate_justification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Justification is required when creating a job despite duplicate warning"
            )
        
        # Use JobCreationService to create the job
        db_job = job_creation_service.create_job_manual(
            job_data=job_data,
            current_user=current_user,
            db=db,
            skip_duplicate_check=skip_duplicate_check,
            duplicate_justification=duplicate_justification
        )
        
        logger.info(
            f"[UNIFIED] Job {db_job.id} created successfully by user {current_user.id}. "
            f"Creation source: {db_job.creation_source.value}"
        )
        
        # Send notification asynchronously (non-blocking)
        try:
            asyncio.create_task(notification_service.notify_job_created(db_job, db))
            logger.info(f"[UNIFIED] Job creation notification queued for job {db_job.id}")
        except Exception as e:
            logger.warning(f"[UNIFIED] Could not queue job creation notification: {e}")
            # Don't fail job creation if notification fails
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_job_data(db_job.id)
            logger.debug(f"[UNIFIED] Cache invalidated for job {db_job.id}")
        except Exception as e:
            logger.warning(f"[UNIFIED] Could not invalidate cache for job {db_job.id}: {e}")
            # Don't fail job creation if cache invalidation fails
        
        # Reload job with relationships for complete response
        db.expire_all()
        complete_job = db.query(Job).options(
            joinedload(Job.supervisor),
            joinedload(Job.assigner),
            joinedload(Job.team)
        ).filter(Job.id == db_job.id).first()
        
        return complete_job
        
    except ValidationError as e:
        # Validation errors (400)
        logger.warning(f"[UNIFIED] Validation error creating job: {e.detail}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.detail
        )
    except ResourceNotFoundError as e:
        # Resource not found errors (404)
        logger.warning(f"[UNIFIED] Resource not found creating job: {e.detail}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.detail
        )
    except BusinessLogicError as e:
        # Duplicate detection errors (409 Conflict)
        logger.info(f"[UNIFIED] Duplicate jobs detected for job creation: {e.detail}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.detail,
            headers={"X-Duplicate-Context": str(e.context)}
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Unexpected errors (500)
        logger.error(f"[UNIFIED] Unexpected error creating job: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job due to an unexpected error"
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


@router.post("/invoices/{invoice_id}/link-to-job")
@monitor_api_response_time(threshold_seconds=1.0)
async def link_invoice_to_job_unified(
    invoice_id: int,
    link_data: InvoiceLinkToJob,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Link an invoice to an existing job (unified API).
    This is used when multiple matching jobs are found and user selects one.
    """
    from app.utils.database_utils import safe_get_by_id
    
    job_id = link_data.job_id
    
    # Get the invoice
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ResourceNotFoundError(
            detail="Invoice not found",
            resource_type="Invoice",
            resource_id=invoice_id
        )
    
    # Check if invoice is already linked
    if invoice.converted_to_job:
        raise BusinessLogicError(
            detail="Invoice is already linked to a job",
            rule="invoice_already_linked",
            context={"invoice_id": invoice_id, "existing_job_id": invoice.converted_job_id}
        )
    
    # Get the job
    job = safe_get_by_id(db, Job, job_id)
    if not job:
        raise ResourceNotFoundError(
            detail="Job not found",
            resource_type="Job",
            resource_id=job_id
        )
    
    # Validate that job is active (NOT_STARTED or IN_PROGRESS)
    if job.status not in [JobStatus.NOT_STARTED, JobStatus.IN_PROGRESS]:
        raise BusinessLogicError(
            detail="Can only link invoices to active jobs (NOT_STARTED or IN_PROGRESS)",
            rule="job_must_be_active",
            context={"job_id": job_id, "job_status": job.status.value}
        )
    
    try:
        # Link invoice to job using the service
        job_creation_service.link_invoice_to_job(invoice, job, db)
        
        # Commit the changes
        db.commit()
        db.refresh(invoice)
        db.refresh(job)
        
        logger.info(
            f"[UNIFIED] Invoice {invoice_id} successfully linked to job {job_id} by user {current_user.id}"
        )
        
        # Send notifications in background
        def send_linking_notifications():
            try:
                import threading
                def run_notifications():
                    try:
                        import asyncio
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        
                        # Send notification to supervisor
                        notification_message = (
                            f"Invoice {invoice.invoice_number} (${invoice.amount:,.2f}) "
                            f"has been linked to job '{job.title}'"
                        )
                        
                        from app.models import Notification, NotificationType, NotificationStatus
                        notification = Notification(
                            user_id=job.supervisor_id,
                            type=NotificationType.JOB_ASSIGNED,
                            title="Invoice Linked to Job",
                            message=notification_message,
                            related_id=job.id,
                            status=NotificationStatus.UNREAD
                        )
                        db.add(notification)
                        db.commit()
                        
                        # Send email notification
                        from app.services.email_service import email_service
                        loop.run_until_complete(
                            email_service.send_invoice_linked_notification(
                                invoice, job, db
                            )
                        )
                        
                        loop.close()
                        logger.info(f"[UNIFIED] Sent linking notifications for invoice {invoice_id} and job {job_id}")
                    except Exception as e:
                        logger.warning(f"[UNIFIED] Error sending linking notifications: {e}")
                
                notification_thread = threading.Thread(target=run_notifications, daemon=True)
                notification_thread.start()
            except Exception as e:
                logger.warning(f"[UNIFIED] Error starting linking notifications: {e}")
        
        send_linking_notifications()
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_invoice_data(invoice_id)
            cache_invalidation.invalidate_job_data(job_id)
        except Exception as e:
            logger.warning(f"[UNIFIED] Could not invalidate cache: {e}")
        
        return {
            "message": "Invoice successfully linked to job",
            "invoice_id": invoice_id,
            "job_id": job_id,
            "invoice_number": invoice.invoice_number,
            "job_title": job.title
        }
        
    except (ValidationError, ResourceNotFoundError, BusinessLogicError) as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"[UNIFIED] Error linking invoice to job: {str(e)}", exc_info=True)
        raise DatabaseError(
            detail="Failed to link invoice to job",
            operation="link_invoice_to_job_unified",
            context={"invoice_id": invoice_id, "job_id": job_id, "error": str(e)}
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


@router.post("/jobs/check-duplicates", response_model=DuplicateCheckResponse)
@monitor_api_response_time(threshold_seconds=0.5)
async def check_job_duplicates(
    request: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check for duplicate jobs before creation.
    Returns matching active jobs and repeat project information.
    """
    try:
        result = job_duplicate_service.check_for_duplicates(
            client_name=request.client_name,
            job_title=request.job_title,
            db=db
        )
        
        logger.info(
            f"Duplicate check for client '{request.client_name}', title '{request.job_title}': "
            f"{len(result.matching_jobs)} matches, repeat_project={result.is_repeat_project}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking for duplicates: {e}", exc_info=True)
        raise DatabaseError(
            detail="Failed to check for duplicate jobs",
            operation="check_job_duplicates",
            context={"client": request.client_name, "title": request.job_title}
        )


@router.get("/jobs/clients")
@cache_route(resource_type="job", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.0)
async def get_clients_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get list of all unique clients with job counts and financial summary.
    Used for client autocomplete and grouping.
    Optimized query with caching.
    """
    try:
        logger.info(f"Fetching client list for user {current_user.id}")
        
        # Query to get client summaries with aggregated data
        # Group by client and calculate metrics
        client_data = db.query(
            Job.client.label('client_name'),
            func.count(Job.id).label('total_jobs'),
            func.sum(
                case(
                    (Job.status.in_([JobStatus.NOT_STARTED, JobStatus.IN_PROGRESS]), 1),
                    else_=0
                )
            ).label('active_jobs'),
            func.sum(
                case(
                    (Job.status == JobStatus.COMPLETED, 1),
                    else_=0
                )
            ).label('completed_jobs'),
            func.max(Job.start_date).label('last_job_date')
        ).group_by(Job.client).all()
        
        # Build client summaries with financial data
        client_summaries = []
        for client in client_data:
            # Get financial data from invoices for this client
            financial_data = db.query(
                func.coalesce(func.sum(Invoice.amount), 0).label('total_billed'),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label('total_paid')
            ).filter(
                func.lower(Invoice.client_name) == func.lower(client.client_name)
            ).first()
            
            total_billed = float(financial_data.total_billed) if financial_data else 0.0
            total_paid = float(financial_data.total_paid) if financial_data else 0.0
            total_pending = total_billed - total_paid
            
            client_summaries.append(ClientSummary(
                client_name=client.client_name,
                total_jobs=int(client.total_jobs),
                active_jobs=int(client.active_jobs or 0),
                completed_jobs=int(client.completed_jobs or 0),
                total_billed=total_billed,
                total_paid=total_paid,
                total_pending=total_pending,
                last_job_date=client.last_job_date
            ))
        
        # Sort by last job date (most recent first)
        client_summaries.sort(key=lambda x: x.last_job_date or datetime.min, reverse=True)
        
        logger.info(f"Retrieved {len(client_summaries)} unique clients")
        return client_summaries
        
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving clients list", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve clients list",
            operation="get_clients_list",
            context={}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving clients list: {e}", exc_info=True)
        raise DatabaseError(
            detail="Clients list retrieval failed",
            operation="get_clients_list",
            context={"error_type": type(e).__name__}
        )


@router.get("/jobs/by-client/{client_name}")
@cache_route(resource_type="job", ttl=300)  # 5 minutes TTL
@monitor_api_response_time(threshold_seconds=1.0)
async def get_jobs_by_client(
    client_name: str,
    include_completed: bool = False,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all jobs for a specific client with pagination.
    Optionally include completed jobs.
    """
    try:
        # Base query with eager loading
        query = db.query(Job).options(
            joinedload(Job.team),
            joinedload(Job.supervisor),
            joinedload(Job.assigner)
        ).filter(func.lower(Job.client) == func.lower(client_name.strip()))
        
        # Filter by status if not including completed
        if not include_completed:
            query = query.filter(
                or_(
                    Job.status == JobStatus.NOT_STARTED,
                    Job.status == JobStatus.IN_PROGRESS
                )
            )
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(limit).all()
        
        logger.info(
            f"Retrieved {len(jobs)} jobs for client '{client_name}' "
            f"(include_completed={include_completed}, page={page})"
        )
        
        return {
            "jobs": jobs,
            "client_name": client_name,
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
        logger.error(f"Database error retrieving jobs for client '{client_name}'", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve jobs for client",
            operation="get_jobs_by_client",
            context={"client_name": client_name, "page": page, "limit": limit}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving jobs for client '{client_name}': {e}", exc_info=True)
        raise DatabaseError(
            detail="Jobs by client retrieval failed",
            operation="get_jobs_by_client",
            context={"client_name": client_name, "error_type": type(e).__name__}
        )


@router.get("/jobs/{job_id}/audit-log")
@monitor_api_response_time(threshold_seconds=0.5)
async def get_job_audit_log(
    job_id: int,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit log for a specific job with pagination.
    Returns formatted audit trail entries.
    """
    try:
        # Verify job exists
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Get audit log entries (returns formatted dictionaries)
        formatted_logs = job_audit_service.get_job_audit_log(
            job_id=job_id,
            db=db,
            limit=limit,
            offset=(page - 1) * limit
        )
        
        # Get total count
        from app.models import JobAuditLog
        total_count = db.query(JobAuditLog).filter(JobAuditLog.job_id == job_id).count()
        
        # Convert to AuditLogEntry schema
        formatted_entries = []
        for log in formatted_logs:
            formatted_entries.append(AuditLogEntry(
                id=log.get("id"),
                event_type=log.get("event_type"),
                user_name=log.get("user_name"),
                timestamp=datetime.fromisoformat(log.get("timestamp")) if log.get("timestamp") else datetime.now(),
                event_data=log.get("event_data"),
                description=log.get("description")
            ))
        
        logger.info(f"Retrieved {len(formatted_entries)} audit log entries for job {job_id}")
        
        return {
            "audit_log": formatted_entries,
            "job_id": job_id,
            "job_title": job.title,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,
                "has_next": page * limit < total_count,
                "has_previous": page > 1
            }
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving audit log for job {job_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve job audit log",
            operation="get_job_audit_log",
            context={"job_id": job_id, "page": page, "limit": limit}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving audit log for job {job_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="Job audit log retrieval failed",
            operation="get_job_audit_log",
            context={"job_id": job_id, "error_type": type(e).__name__}
        )
