from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import List, Optional
import logging
from app.database import get_db
from app.models import Task, User, Job, TaskStatus
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, PaginatedResponse
from pydantic import BaseModel
from app.auth import get_current_user
from app.utils.query_optimizer import QueryOptimizer
from app.utils.database_utils import DatabaseUtils, safe_get_by_id, safe_paginate
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError
from app.utils.error_handler import ErrorHandler, database_error_handler
from app.services.notification_queue import notification_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskProgressUpdate(BaseModel):
    progress: float


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task (Supervisor only)."""
    # Verify assigned_to exists (single-user system - allow any user)
    if task_data.assigned_to_id:
        assigned_to = db.query(User).filter(User.id == task_data.assigned_to_id).first()
        
        if not assigned_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned to user not found"
            )
        
        # Single-user system - allow access
    
    # Verify job exists if provided
    if task_data.job_id:
        job = db.query(Job).filter(Job.id == task_data.job_id).first()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job not found"
            )
        
        # Check if job belongs to supervisor's team
        
    
    # Set the assigner to the current user
    task_dict = task_data.dict()
    task_dict['assigner_id'] = current_user.id
    
    db_task = Task(**task_dict)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Extract task data before background task to avoid DetachedInstanceError
    task_notification_data = {
        'id': db_task.id,
        'title': db_task.title,
        'description': db_task.description,
        'assigner_id': db_task.assigner_id,
        'assigned_to_id': db_task.assigned_to_id,
        'job_id': db_task.job_id,
        'deadline': db_task.deadline.isoformat() if db_task.deadline else None,
        'status': db_task.status.value if db_task.status else None,
        'priority': db_task.priority
    }
    
    # Queue notification asynchronously (non-blocking)
    try:
        await notification_queue.enqueue_task_created(task_notification_data)
        logger.info(f"Task creation notification queued for task {db_task.id}")
    except Exception as e:
        logger.warning(f"Could not queue task creation notification: {e}")
        # Don't fail task creation if notification fails
    
    # Clear cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            logger.debug(f"Cleared {cleared_count} cache entries after task creation")
    except Exception as e:
        logger.warning(f"Could not clear cache after task creation: {e}")
        # Don't fail task creation if cache clearing fails
    
    return db_task


@router.get("/", response_model=PaginatedResponse[TaskResponse])
def get_tasks(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    staff_filter: Optional[int] = None,
    priority_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks with pagination, sorting, and filtering."""
    # Single-user system - show all data
    from sqlalchemy import or_
    
    query = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.assigner),
        joinedload(Task.job)
    )
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    
    if status_filter:
        query = query.filter(Task.status == status_filter)
    
    if staff_filter:
        query = query.filter(Task.assigned_to_id == staff_filter)
    
    if priority_filter:
        query = query.filter(Task.priority == priority_filter)
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination and sorting (newest first)
    offset = (page - 1) * limit
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=tasks,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )


@router.get("/my-tasks", response_model=PaginatedResponse[TaskResponse])
def get_my_tasks(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[TaskStatus] = None,
    priority_filter: Optional[str] = None,
    staff_filter: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks assigned to the current user with pagination and filtering."""
    from sqlalchemy import or_
    
    # Build query with relations
    query = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.assigner),
        joinedload(Task.job)
    ).filter(Task.assigned_to_id == current_user.id)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    
    if status_filter:
        query = query.filter(Task.status == status_filter)
    
    if priority_filter:
        query = query.filter(Task.priority == priority_filter)
    
    # Note: staff_filter doesn't make sense for "my tasks" since it's already filtered by current user
    # But we include it for API consistency - it will have no effect
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination and sorting (newest first)
    offset = (page - 1) * limit
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=tasks,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )


@router.get("/assigned-by-me", response_model=PaginatedResponse[TaskResponse])
def get_tasks_assigned_by_me(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[TaskStatus] = None,
    priority_filter: Optional[str] = None,
    staff_filter: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks assigned by the current user with pagination and filtering."""
    from sqlalchemy import or_
    
    # Build query with relations
    query = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.assigner),
        joinedload(Task.job)
    ).filter(Task.assigner_id == current_user.id)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    
    if status_filter:
        query = query.filter(Task.status == status_filter)
    
    if priority_filter:
        query = query.filter(Task.priority == priority_filter)
    
    if staff_filter:
        query = query.filter(Task.assigned_to_id == staff_filter)
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination and sorting (newest first)
    offset = (page - 1) * limit
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=tasks,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task by ID with optimized loading."""
    try:
        task = db.query(Task).options(
            joinedload(Task.assigned_to),
            joinedload(Task.assigner)
        ).filter(Task.id == task_id).first()
        
        if not task:
            raise ResourceNotFoundError(
                detail="Task not found",
                resource_type="Task",
                resource_id=task_id
            )
        
        logger.debug(f"Retrieved task {task_id} for user {current_user.id}")
        return task
        
    except ResourceNotFoundError as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving task {task_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve task",
            operation="get_task",
            context={"task_id": task_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving task {task_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="Task retrieval failed",
            operation="get_task",
            context={"task_id": task_id, "error_type": type(e).__name__}
        )


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Store old data for change tracking
    old_data = {
        'title': task.title,
        'description': task.description,
        'priority': task.priority,
        'status': task.status.value,
        'deadline': task.deadline
    }
    
    # Single-user system - allow access
    # Update task fields
    for field, value in task_update.dict(exclude_unset=True).items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    # Extract task data before background task to avoid DetachedInstanceError
    task_notification_data = {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'assigner_id': task.assigner_id,
        'assigned_to_id': task.assigned_to_id,
        'job_id': task.job_id,
        'deadline': task.deadline.isoformat() if task.deadline else None,
        'status': task.status.value if task.status else None,
        'priority': task.priority
    }
    
    # Create changes summary
    new_data = {
        'title': task.title,
        'description': task.description,
        'priority': task.priority,
        'status': task.status.value,
        'deadline': task.deadline
    }
    
    # Calculate changes
    changes_list = []
    for key in old_data:
        if old_data[key] != new_data.get(key):
            changes_list.append(f"{key}: {old_data[key]} → {new_data.get(key)}")
    changes = ", ".join(changes_list) if changes_list else "Task updated"
    
    # Queue notification asynchronously (non-blocking)
    try:
        await notification_queue.enqueue_task_updated(task_notification_data, current_user.name, changes)
        logger.info(f"Task update notification queued for task {task_id}")
    except Exception as e:
        logger.warning(f"Could not queue task update notification: {e}")
        # Don't fail task update if notification fails
    
    # Clear cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            logger.debug(f"Cleared {cleared_count} cache entries after task update")
    except Exception as e:
        logger.warning(f"Could not clear cache after task update: {e}")
        # Don't fail task update if cache clearing fails
    
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete task (Supervisor only)."""
    try:
        task = safe_get_by_id(db, Task, task_id)
        if not task:
            raise ResourceNotFoundError(
                detail="Task not found",
                resource_type="Task",
                resource_id=task_id
            )
        
        # Check if task can be deleted (business logic)
        if task.status == TaskStatus.IN_PROGRESS:
            raise BusinessLogicError(
                detail="Cannot delete task that is in progress",
                rule="task_deletion_policy",
                context={"task_id": task_id, "status": task.status.value}
            )
        
        db.delete(task)
        db.commit()
        logger.info(f"Task {task_id} deleted successfully by user {current_user.id}")
        
        # Clear cache to ensure fresh data
        try:
            from app.services.redis_cache_service import redis_cache
            if redis_cache.redis_client:
                cleared_count = redis_cache.clear_pattern("*")
                logger.debug(f"Cleared {cleared_count} cache entries after task deletion")
        except Exception as e:
            logger.warning(f"Could not clear cache after task deletion: {e}")
        
        return {"message": "Task deleted successfully"}
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting task {task_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to delete task",
            operation="delete_task",
            context={"task_id": task_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting task {task_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Task deletion failed",
            operation="delete_task",
            context={"task_id": task_id, "error_type": type(e).__name__}
        )


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: int,
    status: TaskStatus,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update task status. Only the assignee can update status."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check if current user is the assignee
    if task.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee can update task status"
        )
    
    # Store old status for change tracking
    old_status = task.status.value
    task.status = status
    db.commit()
    db.refresh(task)
    
    # Extract task data before background task to avoid DetachedInstanceError
    task_notification_data = {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'assigner_id': task.assigner_id,
        'assigned_to_id': task.assigned_to_id,
        'job_id': task.job_id,
        'deadline': task.deadline.isoformat() if task.deadline else None,
        'status': task.status.value if task.status else None,
        'priority': task.priority
    }
    
    # Queue notification asynchronously (non-blocking)
    try:
        changes = f"Status changed from {old_status} to {status.value}"
        await notification_queue.enqueue_task_updated(task_notification_data, current_user.name, changes)
        logger.info(f"Task status notification queued for task {task_id}: {changes}")
    except Exception as e:
        logger.warning(f"Could not queue task status notification: {e}")
        # Don't fail status update if notification fails
    
    # Clear cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            logger.debug(f"Cleared {cleared_count} cache entries after task status update")
    except Exception as e:
        logger.warning(f"Could not clear cache after task status update: {e}")
        # Don't fail status update if cache clearing fails
    
    return {"message": f"Task status updated to {status.value}"}


@router.patch("/{task_id}/progress")
async def update_task_progress(
    task_id: int,
    progress_data: TaskProgressUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update task progress percentage. Only the assignee can update progress."""
    progress = progress_data.progress
    
    # Validate progress range
    if not 0 <= progress <= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress must be between 0 and 100"
        )
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check if current user is the assignee
    if task.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee can update task progress"
        )
    
    # Store old progress for change tracking
    old_progress = task.progress if hasattr(task, 'progress') else 0
    # Update task progress (assuming Task model has progress field)
    if hasattr(task, 'progress'):
        task.progress = progress
    else:
        # If Task model doesn't have progress field, we can store it in description or add it to the model
        # For now, let's add it to the description as a workaround
        if not task.description:
            task.description = f"Progress: {progress}%"
        else:
            # Update existing progress in description
            import re
            if "Progress:" in task.description:
                task.description = re.sub(r'Progress: \d+%', f'Progress: {progress}%', task.description)
            else:
                task.description += f" | Progress: {progress}%"
    
    db.commit()
    db.refresh(task)
    
    # Extract task data before background task to avoid DetachedInstanceError
    task_notification_data = {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'assigner_id': task.assigner_id,
        'assigned_to_id': task.assigned_to_id,
        'job_id': task.job_id,
        'deadline': task.deadline.isoformat() if task.deadline else None,
        'status': task.status.value if task.status else None,
        'priority': task.priority
    }
    
    # Queue notification asynchronously (non-blocking)
    try:
        changes = f"Progress changed from {old_progress}% to {progress}%"
        await notification_queue.enqueue_task_updated(task_notification_data, current_user.name, changes)
        logger.info(f"Task progress notification queued for task {task_id}: {changes}")
    except Exception as e:
        logger.warning(f"Could not queue task progress notification: {e}")
        # Don't fail progress update if notification fails
    
    # Clear cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            logger.debug(f"Cleared {cleared_count} cache entries after task progress update")
    except Exception as e:
        logger.warning(f"Could not clear cache after task progress update: {e}")
        # Don't fail progress update if cache clearing fails
    
    return {"message": f"Task progress updated to {progress}%", "progress": progress}
