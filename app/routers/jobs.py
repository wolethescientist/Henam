from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import List, Optional
from pydantic import BaseModel
import logging
from app.database import get_db
from app.models import Job, User, Team, Notification, NotificationType, NotificationStatus, EfficiencyScore, JobStatus
from app.schemas import JobCreate, JobUpdate, JobResponse, JobAssignmentRequest, JobAssignmentResponse, JobDisplayResponse, PaginatedResponse
from app.auth import get_current_user
from app.utils.query_optimizer import QueryOptimizer
from app.utils.database_utils import DatabaseUtils, safe_get_by_id, safe_paginate
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError
from app.utils.error_handler import ErrorHandler, database_error_handler
from app.services.notification_service import notification_service
from app.services.cache_invalidation import cache_invalidation
from app.services.cache_middleware import cache_route
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


class ProgressUpdate(BaseModel):
    progress: float


@router.post("/", response_model=JobResponse)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new job."""
    # Verify team exists
    team = db.query(Team).filter(Team.id == job_data.team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found"
        )
    
    # Single-user system - allow access
    # Use provided supervisor_id or current user as supervisor
    supervisor_id = job_data.supervisor_id if job_data.supervisor_id else current_user.id
    
    # Set the assigner to the current user
    job_dict = job_data.dict()
    job_dict['assigner_id'] = current_user.id
    
    db_job = Job(
        title=job_data.title,
        client=job_data.client,
        start_date=job_data.start_date,
        end_date=job_data.end_date,
        team_id=job_data.team_id,
        supervisor_id=supervisor_id,
        assigner_id=current_user.id
    )
    
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Send notification asynchronously
    print(f"🚀 JOB CREATION DEBUG: Starting notification process for job {db_job.id}")
    print(f"🚀 JOB CREATION DEBUG: Job title: {db_job.title}")
    print(f"🚀 JOB CREATION DEBUG: Job client: {db_job.client}")
    print(f"🚀 JOB CREATION DEBUG: Assigner ID: {db_job.assigner_id}")
    print(f"🚀 JOB CREATION DEBUG: Supervisor ID: {db_job.supervisor_id}")
    print(f"🚀 JOB CREATION DEBUG: Team ID: {db_job.team_id}")
    
    # Send notification asynchronously (non-blocking)
    try:
        asyncio.create_task(notification_service.notify_job_created(db_job, db))
        logger.info(f"Job creation notification queued for job {db_job.id}")
    except Exception as e:
        logger.warning(f"Could not queue job creation notification: {e}")
        # Don't fail job creation if notification fails
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_job_data(db_job.id)
        logger.debug(f"Cache invalidated for job {db_job.id}")
    except Exception as e:
        logger.warning(f"Could not invalidate cache for job {db_job.id}: {e}")
        # Don't fail job creation if cache invalidation fails
    
    return db_job


@router.get("/", response_model=PaginatedResponse[JobResponse])
@cache_route(resource_type="job", ttl=180)  # 3 minutes TTL
async def get_jobs(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
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
    """Get jobs with pagination, sorting, and advanced filtering."""
    # Single-user system - show all data
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_, and_, extract
    from datetime import datetime, timedelta
    
    query = db.query(Job).options(
        joinedload(Job.supervisor),
        joinedload(Job.assigner),
        joinedload(Job.team)
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
    
    if supervisor_filter:
        query = query.filter(Job.supervisor_id == supervisor_filter)
    
    # Date filtering
    if start_date and end_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(and_(Job.start_date >= start_dt, Job.start_date <= end_dt))
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
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination and sorting (newest first)
    offset = (page - 1) * limit
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=jobs,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )




@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_update: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Store old data for change tracking
    old_data = {
        'title': job.title,
        'client': job.client,
        'progress': job.progress,
        'status': job.status.value,
        'start_date': job.start_date,
        'end_date': job.end_date
    }
    
    # Single-user system - allow access
    # Update job fields
    for field, value in job_update.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
    # Auto-update status if progress was changed
    if 'progress' in job_update.dict(exclude_unset=True):
        job.update_status_from_progress()
    
    db.commit()
    db.refresh(job)
    
    # Send notification asynchronously (non-blocking)
    try:
        # Create changes summary
        new_data = {
            'title': job.title,
            'client': job.client,
            'progress': job.progress,
            'status': job.status.value,
            'start_date': job.start_date,
            'end_date': job.end_date
        }
        changes = notification_service.create_changes_summary(old_data, new_data)
        
        asyncio.create_task(notification_service.notify_job_updated(job, current_user.name, changes, db))
        logger.info(f"Job update notification queued for job {job_id}")
    except Exception as e:
        logger.warning(f"Could not queue job update notification: {e}")
        # Don't fail job update if notification fails
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_job_data(job_id)
        logger.debug(f"Cache invalidated for job {job_id}")
    except Exception as e:
        logger.warning(f"Could not invalidate cache for job {job_id}: {e}")
        # Don't fail job update if cache invalidation fails
    
    return job


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete job (Admin only)."""
    try:
        job = safe_get_by_id(db, Job, job_id)
        if not job:
            raise ResourceNotFoundError(
                detail="Job not found",
                resource_type="Job",
                resource_id=job_id
            )
        
        # Check if job can be deleted (business logic)
        if job.status == JobStatus.IN_PROGRESS:
            raise BusinessLogicError(
                detail="Cannot delete job that is in progress",
                rule="job_deletion_policy",
                context={"job_id": job_id, "status": job.status.value}
            )
        
        db.delete(job)
        db.commit()
        logger.info(f"Job {job_id} deleted successfully by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_job_data(job_id)
            logger.debug(f"Cache invalidated for deleted job {job_id}")
        except Exception as e:
            logger.warning(f"Could not invalidate cache for deleted job {job_id}: {e}")
        
        return {"message": "Job deleted successfully"}
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting job {job_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to delete job",
            operation="delete_job",
            context={"job_id": job_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting job {job_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Job deletion failed",
            operation="delete_job",
            context={"job_id": job_id, "error_type": type(e).__name__}
        )


@router.patch("/{job_id}/progress")
def update_job_progress(
    job_id: int,
    progress_data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update job progress percentage and auto-update status."""
    progress = progress_data.progress
    
    # Validate progress range
    if not 0 <= progress <= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress must be between 0 and 100"
        )
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Store old progress for change tracking
    old_progress = job.progress
    old_status = job.status.value
    
    # Single-user system - allow access
    job.progress = progress
    job.update_status_from_progress()  # Auto-update status based on progress
    db.commit()
    
    # Send notification asynchronously
    print(f"📊 JOB PROGRESS DEBUG: Starting job progress notification for job {job.id}")
    print(f"📊 JOB PROGRESS DEBUG: Progress changed from {old_progress}% to {progress}%")
    print(f"📊 JOB PROGRESS DEBUG: Status changed from {old_status} to {job.status.value}")
    
    # Send notification asynchronously (non-blocking)
    try:
        changes = f"Progress changed from {old_progress}% to {progress}%"
        if old_status != job.status.value:
            changes += f"; Status changed from {old_status} to {job.status.value}"
        
        asyncio.create_task(notification_service.notify_job_updated(job, current_user.name, changes, db))
        logger.info(f"Job progress notification queued for job {job_id}: {changes}")
    except Exception as e:
        logger.warning(f"Could not queue job progress notification: {e}")
        # Don't fail progress update if notification fails
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_job_data(job_id)
        logger.debug(f"Cache invalidated for job {job_id}")
    except Exception as e:
        logger.warning(f"Could not invalidate cache for job {job_id}: {e}")
        # Don't fail progress update if cache invalidation fails
    
    return {"message": f"Job progress updated to {progress}%", "status": job.status.value}


@router.post("/{job_id}/invoice")
def attach_invoice_to_job(
    job_id: int,
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Attach invoice to job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Single-user system - allow access
    
    if invoice.job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already attached to a job"
        )
    
    invoice.job_id = job_id
    db.commit()
    
    return {"message": "Invoice attached to job successfully"}


@router.patch("/{job_id}/assign")
def assign_job_to_team_or_user(
    job_id: int,
    assignment_data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a job to a team or specific user."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get assignment type and target
    assignment_type = assignment_data.get('assignment_type')  # 'team' or 'user'
    target_id = assignment_data.get('target_id')
    
    if assignment_type == 'team':
        # Verify team exists
        team = db.query(Team).filter(Team.id == target_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team not found"
            )
        
        # Update job assignment
        job.team_id = target_id
        # Always update supervisor to match team (even if None)
        job.supervisor_id = team.supervisor_id
        
        # Create notifications for team members
        team_members = db.query(User).filter(User.team_id == target_id).all()
        for member in team_members:
            notification = Notification(
                user_id=member.id,
                type=NotificationType.JOB_ASSIGNED,
                title="New Job Assignment",
                message=f"Job '{job.title}' has been assigned to your team: {team.name}",
                related_id=job.id
            )
            db.add(notification)
        
        # Send email notification to team supervisor (non-blocking background task)
        if team.supervisor_id:
            supervisor = safe_get_by_id(db, User, team.supervisor_id)
            
            if supervisor and supervisor.email:
                logger.info(f"📧 TEAM ASSIGNMENT: Preparing to send email for job {job.id} to team {team.name}")
                logger.info(f"📧 TEAM ASSIGNMENT: Supervisor: {supervisor.name} ({supervisor.email})")
                
                # Extract all data BEFORE background task (to avoid DetachedInstanceError)
                job_data = {
                    'id': job.id,
                    'title': job.title,
                    'client': job.client,
                    'start_date': job.start_date,
                    'end_date': job.end_date,
                    'status': job.status.value if job.status else 'not_started',
                    'progress': job.progress or 0
                }
                
                team_data = {'id': team.id, 'name': team.name}
                supervisor_data = {
                    'id': supervisor.id,
                    'name': supervisor.name,
                    'email': supervisor.email
                }
                
                assigned_by_name = current_user.name  # Extract before background task
                
                def send_team_assignment_email(job_data, team_data, supervisor_data, assigned_by_name):
                    try:
                        logger.info(f"📧 TEAM ASSIGNMENT: Background task started for job {job_data['id']}")
                        from app.services.email_service import email_service
                        
                        logger.info(f"📧 TEAM ASSIGNMENT: Calling email service with data:")
                        logger.info(f"   Job: {job_data['title']}")
                        logger.info(f"   Team: {team_data['name']}")
                        logger.info(f"   Supervisor: {supervisor_data['name']} ({supervisor_data['email']})")
                        logger.info(f"   Assigned by: {assigned_by_name}")
                        
                        # Send email notification
                        result = email_service.send_team_job_assignment_notification(
                            job_data=job_data,
                            team_data=team_data,
                            supervisor_data=supervisor_data,
                            assigned_by=assigned_by_name
                        )
                        
                        if result:
                            logger.info(f"✅ TEAM ASSIGNMENT: Email sent successfully to {supervisor_data['email']}")
                        else:
                            logger.error(f"❌ TEAM ASSIGNMENT: Email failed to send to {supervisor_data['email']}")
                            
                    except Exception as e:
                        logger.error(f"❌ TEAM ASSIGNMENT: Exception in email task: {str(e)}")
                        logger.error(f"   Exception type: {type(e).__name__}")
                        import traceback
                        logger.error(f"   Traceback: {traceback.format_exc()}")
                
                # Run email in background using FastAPI BackgroundTasks
                try:
                    background_tasks.add_task(send_team_assignment_email, job_data, team_data, supervisor_data, assigned_by_name)
                    logger.info(f"📧 TEAM ASSIGNMENT: Background email task queued successfully")
                except Exception as e:
                    logger.error(f"❌ TEAM ASSIGNMENT: Could not queue email task: {str(e)}")
            else:
                if not supervisor:
                    logger.warning(f"⚠️ TEAM ASSIGNMENT: Supervisor with ID {team.supervisor_id} not found in database")
                else:
                    logger.warning(f"⚠️ TEAM ASSIGNMENT: Supervisor {supervisor.name} has no email address")
        
        assignment_message = f"Job assigned to team: {team.name}"
        
    elif assignment_type == 'user':
        # Verify user exists
        user = db.query(User).filter(User.id == target_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        # Update job assignment
        job.supervisor_id = target_id
        # If user has a team, assign to that team as well
        if user.team_id:
            job.team_id = user.team_id
        
        # Create notification for the assigned user
        notification = Notification(
            user_id=target_id,
            type=NotificationType.JOB_ASSIGNED,
            title="New Job Assignment",
            message=f"You have been assigned to job: {job.title}",
            related_id=job.id
        )
        db.add(notification)
        
        # Send email notification to assigned user (non-blocking background task)
        if user.email:
            logger.info(f"📧 USER ASSIGNMENT: Preparing to send email for job {job.id} to user {user.name}")
            logger.info(f"📧 USER ASSIGNMENT: User ID: {user.id}, Email: {user.email}")
            
            # Extract all data BEFORE background task (to avoid DetachedInstanceError)
            job_data = {
                'id': job.id,
                'title': job.title,
                'client': job.client,
                'start_date': job.start_date,
                'end_date': job.end_date,
                'status': job.status.value if job.status else 'not_started',
                'progress': job.progress or 0
            }
            
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
            
            assigned_by_name = current_user.name  # Extract before background task
            
            def send_user_assignment_email(job_data, user_data, assigned_by_name):
                try:
                    logger.info(f"📧 USER ASSIGNMENT: Background task started for job {job_data['id']}")
                    from app.services.email_service import email_service
                    
                    logger.info(f"📧 USER ASSIGNMENT: Calling email service with data:")
                    logger.info(f"   Job: {job_data['title']}")
                    logger.info(f"   User: {user_data['name']} ({user_data['email']})")
                    logger.info(f"   Assigned by: {assigned_by_name}")
                    
                    # Send email notification
                    result = email_service.send_user_job_assignment_notification(
                        job_data=job_data,
                        user_data=user_data,
                        assigned_by=assigned_by_name
                    )
                    
                    if result:
                        logger.info(f"✅ USER ASSIGNMENT: Email sent successfully to {user_data['email']}")
                    else:
                        logger.error(f"❌ USER ASSIGNMENT: Email failed to send to {user_data['email']}")
                        
                except Exception as e:
                    logger.error(f"❌ USER ASSIGNMENT: Exception in email task: {str(e)}")
                    logger.error(f"   Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"   Traceback: {traceback.format_exc()}")
            
            # Run email in background using FastAPI BackgroundTasks
            try:
                background_tasks.add_task(send_user_assignment_email, job_data, user_data, assigned_by_name)
                logger.info(f"📧 USER ASSIGNMENT: Background email task queued successfully")
            except Exception as e:
                logger.error(f"❌ USER ASSIGNMENT: Could not queue email task: {str(e)}")
        else:
            logger.warning(f"⚠️ USER ASSIGNMENT: User {user.name} (ID: {user.id}) has no email address")
        
        assignment_message = f"Job assigned to user: {user.name}"
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assignment type. Must be 'team' or 'user'"
        )
    
    db.commit()
    db.refresh(job)
    
    # Reload job with relationships for response
    from sqlalchemy.orm import joinedload
    db.expire_all()  # Force SQLAlchemy to reload from database
    updated_job = db.query(Job).options(
        joinedload(Job.supervisor),
        joinedload(Job.team),
        joinedload(Job.assigner)
    ).filter(Job.id == job_id).first()
    
    # Log the updated job details for debugging
    logger.info(f"Job {job_id} updated - Team ID: {updated_job.team_id}, Team: {updated_job.team.name if updated_job.team else 'None'}, Supervisor ID: {updated_job.supervisor_id}, Supervisor: {updated_job.supervisor.name if updated_job.supervisor else 'None'}")
    
    # AGGRESSIVE cache invalidation to prevent race conditions
    try:
        from app.services.robust_cache_service import robust_cache
        
        # Invalidate ALL related cache patterns immediately
        cache_patterns = [
            "henam:cache:job:*",           # All job cache entries
            "henam:cache:unified:*",       # All unified API cache (includes jobs)
            "henam:cache:dashboard:*",     # Dashboard cache
        ]
        
        total_invalidated = 0
        
        # First, let's see what keys actually exist
        if robust_cache.redis_client:
            all_keys = robust_cache.redis_client.keys("henam:cache:*")
            logger.info(f"Total cache keys before invalidation: {len(all_keys)}")
            logger.info(f"Sample keys: {all_keys[:5] if all_keys else 'None'}")
        
        for pattern in cache_patterns:
            deleted = robust_cache.invalidate_pattern(pattern)
            total_invalidated += deleted
            logger.info(f"Pattern '{pattern}' invalidated {deleted} entries")
        
        # Also invalidate specific resource caches
        if assignment_type == 'team' and team:
            team_patterns = ["henam:cache:team:*", "henam:cache:unified:teams:*"]
            for pattern in team_patterns:
                deleted = robust_cache.invalidate_pattern(pattern)
                total_invalidated += deleted
        elif assignment_type == 'user' and user:
            user_patterns = ["henam:cache:user:*", "henam:cache:unified:staff:*"]
            for pattern in user_patterns:
                deleted = robust_cache.invalidate_pattern(pattern)
                total_invalidated += deleted
                
        logger.info(f"Aggressive cache invalidation completed for job {job_id} assignment: {total_invalidated} entries invalidated")
        
        # Verify invalidation worked
        if robust_cache.redis_client:
            remaining_keys = robust_cache.redis_client.keys("henam:cache:job:*")
            logger.info(f"Remaining job cache keys after invalidation: {len(remaining_keys)}")
            if remaining_keys:
                logger.warning(f"Some job cache keys still exist: {remaining_keys[:3]}")
            
            # Set a "no-cache" flag for 2 seconds to prevent immediate re-caching
            cooldown_key = f"henam:cache:cooldown:job:{job_id}"
            robust_cache.redis_client.setex(cooldown_key, 2, "1")
            logger.info(f"Set cache cooldown for job {job_id} (2 seconds)")
        
        # Small delay to ensure cache invalidation propagates
        import time
        time.sleep(0.1)  # 100ms delay
        
    except Exception as e:
        logger.warning(f"Could not invalidate cache: {e}")
    
    # Prepare detailed response
    assignment_details = {
        "message": assignment_message,
        "job_id": job.id,
        "job_title": job.title,
        "assignment_type": assignment_type,
        "assigned_to": {
            "id": target_id,
            "name": team.name if assignment_type == 'team' else user.name,
            "type": assignment_type
        }
    }
    
    # Add team details if assigned to team
    if assignment_type == 'team' and team:
        assignment_details["team_details"] = {
            "id": team.id,
            "name": team.name,
            "supervisor": {
                "id": team.supervisor.id,
                "name": team.supervisor.name
            } if team.supervisor else None,
            "member_count": len(team.members) if team.members else 0
        }
    
    # Add user details if assigned to user
    if assignment_type == 'user' and user:
        assignment_details["user_details"] = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "team": {
                "id": user.team.id,
                "name": user.team.name
            } if user.team else None
        }
    
    # Create response with cache-busting headers
    from fastapi.responses import JSONResponse
    import time
    
    response_headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Cache-Bust': str(int(time.time())),
        'X-Assignment-Timestamp': str(int(time.time() * 1000))
    }
    
    return JSONResponse(
        content=assignment_details,
        headers=response_headers
    )


@router.post("/assign", response_model=JobAssignmentResponse)
def assign_job(
    assignment: JobAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a job to a supervisor and team (Admin only)."""
    # Verify job exists
    job = db.query(Job).filter(Job.id == assignment.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Verify supervisor exists (single-user system - allow any user)
    supervisor = db.query(User).filter(User.id == assignment.supervisor_id).first()
    if not supervisor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supervisor not found"
        )
    
    # Verify team exists
    team = db.query(Team).filter(Team.id == assignment.team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found"
        )
    
    # Update job assignment
    job.supervisor_id = assignment.supervisor_id
    job.team_id = assignment.team_id
    
    # Create notification for supervisor
    notification = Notification(
        user_id=assignment.supervisor_id,
        type=NotificationType.JOB_ASSIGNED,
        title="New Job Assignment",
        message=f"You have been assigned to job: {job.title}",
        related_id=job.id
    )
    db.add(notification)
    
    # Create notifications for team members (single-user system - all team members)
    team_members = db.query(User).filter(User.team_id == assignment.team_id).all()
    
    for member in team_members:
        member_notification = Notification(
            user_id=member.id,
            type=NotificationType.JOB_ASSIGNED,
            title="New Job Assignment",
            message=f"A new job has been assigned to your team: {job.title}",
            related_id=job.id
        )
        db.add(member_notification)
    
    db.commit()
    
    return JobAssignmentResponse(
        message="Job assigned successfully",
        job_id=job.id,
        supervisor_id=assignment.supervisor_id,
        team_id=assignment.team_id
        )








@router.get("/progress-summary")
def get_jobs_progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get jobs progress summary with status counts."""
    try:
        # Build base query
        base_query = db.query(Job)
        
        # Single-user system - show all data
        jobs_query = base_query
        
        # Get all jobs for summary
        jobs = jobs_query.all()
        
        # Calculate summary statistics
        total_jobs = len(jobs)
        not_started = len([j for j in jobs if j.status == JobStatus.NOT_STARTED])
        in_progress = len([j for j in jobs if j.status == JobStatus.IN_PROGRESS])
        completed = len([j for j in jobs if j.status == JobStatus.COMPLETED])
        
        # Calculate average progress
        avg_progress = sum(j.progress for j in jobs) / total_jobs if total_jobs > 0 else 0
        
        return {
            "total_jobs": total_jobs,
            "not_started": not_started,
            "in_progress": in_progress,
            "completed": completed,
            "average_progress": round(avg_progress, 2)
        }
        
    except SQLAlchemyError as e:
        logger.error("Jobs progress summary query failed", exc_info=True)
        raise DatabaseError(
            detail="Unable to retrieve jobs progress summary",
            operation="jobs_progress_summary",
            context={"supervisor_filter": supervisor_filter, "month": month, "year": year}
        )
    except Exception as e:
        logger.error(f"Unexpected error in jobs progress summary: {e}", exc_info=True)
        raise DatabaseError(
            detail="Jobs progress summary temporarily unavailable",
            operation="jobs_progress_summary",
            context={"error_type": type(e).__name__}
        )


@router.get("/dashboard", response_model=List[JobDisplayResponse])
def get_jobs_for_dashboard(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get jobs with detailed information for dashboard."""
    try:
        from sqlalchemy import func, case
        from app.models import Invoice, EfficiencyScore
        from sqlalchemy.orm import joinedload
        
        # Query jobs with related data and eager loading
        jobs_query = db.query(Job).join(User, Job.supervisor_id == User.id).join(Team, Job.team_id == Team.id)
        
        # Single-user system - show all data
        
        # Get jobs with pagination and eager loading
        offset = (page - 1) * limit
        jobs = jobs_query.options(
            joinedload(Job.supervisor),
            joinedload(Job.assigner),
            joinedload(Job.team)
        ).order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
        
        if not jobs:
            return []
        
        job_ids = [job.id for job in jobs]
        team_ids = [job.team_id for job in jobs]
        
        # Get all invoice data in one query
        invoice_data = db.query(
            Invoice.job_id,
            func.sum(Invoice.amount).label('total_amount'),
            func.sum(Invoice.paid_amount).label('paid_amount'),
            func.sum(Invoice.pending_amount).label('pending_amount')
        ).filter(Invoice.job_id.in_(job_ids)).group_by(Invoice.job_id).all()
        
        # Get team efficiency scores in one query
        team_efficiency_data = db.query(
            EfficiencyScore.team_id,
            func.avg(EfficiencyScore.efficiency_score).label('avg_efficiency')
        ).filter(EfficiencyScore.team_id.in_(team_ids)).group_by(EfficiencyScore.team_id).all()
        
        # Create lookup dictionaries
        invoice_lookup = {
            row.job_id: {
                'total_amount': row.total_amount or 0.0,
                'paid_amount': row.paid_amount or 0.0,
                'pending_amount': row.pending_amount or 0.0
            } for row in invoice_data
        }
        
        efficiency_lookup = {
            row.team_id: row.avg_efficiency or 0.0 
            for row in team_efficiency_data
        }
        
        # Build result
        result = []
        for job in jobs:
            try:
                # Calculate days on job
                if job.start_date:
                    now = datetime.now()
                    job_start = job.start_date
                    
                    # Handle timezone-aware vs timezone-naive datetime comparison
                    if job_start.tzinfo is not None and now.tzinfo is None:
                        # If start_date is timezone-aware but now is not, make now timezone-aware
                        from datetime import timezone
                        now = now.replace(tzinfo=timezone.utc)
                    elif now.tzinfo is not None and job_start.tzinfo is None:
                        # If now is timezone-aware but start_date is not, make start_date timezone-aware
                        from datetime import timezone
                        job_start = job_start.replace(tzinfo=timezone.utc)
                    
                    days_on_job = (now - job_start).days
                else:
                    days_on_job = 0
            except Exception as e:
                days_on_job = 0
            
            # Get invoice information from lookup
            invoice_info = invoice_lookup.get(job.id, {
                'total_amount': 0.0,
                'paid_amount': 0.0,
                'pending_amount': 0.0
            })
            
            # Get team efficiency score from lookup
            team_efficiency = efficiency_lookup.get(job.team_id, 0.0)
            
            result.append(JobDisplayResponse(
                id=job.id,
                title=job.title,
                client=job.client,
                supervisor_name=job.supervisor.name,
                team_name=job.team.name,
                progress=job.progress,
                status=job.status,
                days_on_job=days_on_job,
                total_amount=invoice_info['total_amount'],
                paid_amount=invoice_info['paid_amount'],
                pending_amount=invoice_info['pending_amount'],
                efficiency_score=round(team_efficiency, 2)
            ))
        
        return result
        
    except SQLAlchemyError as e:
        logger.error("Dashboard jobs query failed", exc_info=True)
        raise DatabaseError(
            detail="Unable to retrieve jobs for dashboard",
            operation="dashboard_jobs",
            context={"page": page, "limit": limit}
        )
    except Exception as e:
        logger.error(f"Unexpected error in dashboard jobs: {e}", exc_info=True)
        raise DatabaseError(
            detail="Dashboard jobs temporarily unavailable",
            operation="dashboard_jobs",
            context={"error_type": type(e).__name__}
        )


@router.get("/my-jobs", response_model=List[JobResponse])
def get_my_jobs(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[JobStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get jobs assigned to the current user (as supervisor)."""
    # Use optimized query to avoid N+1 queries and ensure index usage
    jobs = QueryOptimizer.get_user_jobs_optimized(
        db, current_user.id, page, limit, status_filter
    )
    return jobs


@router.get("/assigned-by-me", response_model=List[JobResponse])
def get_jobs_assigned_by_me(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[JobStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get jobs assigned by the current user."""
    # Use optimized query to avoid N+1 queries and ensure index usage
    jobs = QueryOptimizer.get_user_assigned_jobs_optimized(
        db, current_user.id, page, limit, status_filter
    )
    return jobs


@router.get("/assignment-options")
def get_job_assignment_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get available teams and users for job assignment."""
    try:
        from sqlalchemy.orm import joinedload
        
        # Get all teams with their supervisors and members
        teams = db.query(Team).options(
            joinedload(Team.supervisor),
            joinedload(Team.members)
        ).all()
        
        # Get all active users
        users = db.query(User).options(
            joinedload(User.team)
        ).filter(User.is_active == True).all()
        
        # Format teams data
        teams_data = []
        for team in teams:
            teams_data.append({
                "id": team.id,
                "name": team.name,
                "supervisor": {
                    "id": team.supervisor.id,
                    "name": team.supervisor.name,
                    "email": team.supervisor.email
                } if team.supervisor else None,
                "member_count": len(team.members) if team.members else 0,
                "members": [
                    {
                        "id": member.id,
                        "name": member.name,
                        "email": member.email
                    } for member in team.members
                ] if team.members else []
            })
        
        # Format users data
        users_data = []
        for user in users:
            users_data.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "team": {
                    "id": user.team.id,
                    "name": user.team.name
                } if user.team else None,
                "is_supervisor": any(team.supervisor_id == user.id for team in teams)
            })
        
        return {
            "teams": teams_data,
            "users": users_data,
            "total_teams": len(teams_data),
            "total_users": len(users_data)
        }
        
    except SQLAlchemyError as e:
        logger.error("Database error retrieving assignment options", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve assignment options",
            operation="get_job_assignment_options",
            context={}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving assignment options: {e}", exc_info=True)
        raise DatabaseError(
            detail="Assignment options retrieval failed",
            operation="get_job_assignment_options",
            context={"error_type": type(e).__name__}
        )


@router.get("/{job_id}", response_model=JobResponse)
@cache_route(resource_type="job", ttl=180)  # 3 minutes TTL
async def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get job by ID with optimized loading."""
    try:
        from sqlalchemy.orm import joinedload
        
        job = db.query(Job).options(
            joinedload(Job.supervisor),
            joinedload(Job.assigner),
            joinedload(Job.team)
        ).filter(Job.id == job_id).first()
        
        if not job:
            raise ResourceNotFoundError(
                detail="Job not found",
                resource_type="Job",
                resource_id=job_id
            )
        
        logger.debug(f"Retrieved job {job_id} for user {current_user.id}")
        return job
        
    except ResourceNotFoundError as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving job {job_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve job",
            operation="get_job",
            context={"job_id": job_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving job {job_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="Job retrieval failed",
            operation="get_job",
            context={"job_id": job_id, "error_type": type(e).__name__}
        )

