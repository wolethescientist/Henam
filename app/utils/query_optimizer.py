"""
Query optimization utilities to ensure proper index usage and avoid N+1 queries.
"""

from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import and_, or_
from typing import List, Optional, Type, Any
from app.models import Task, Job, User, Team


class QueryOptimizer:
    """Utility class for optimizing database queries."""
    
    @staticmethod
    def get_tasks_with_relations(query, include_job: bool = True):
        """
        Add eager loading for task relationships to avoid N+1 queries.
        
        Args:
            query: SQLAlchemy query object
            include_job: Whether to include job relationship
            
        Returns:
            Optimized query with eager loading
        """
        options = [
            joinedload(Task.assigned_to),
            joinedload(Task.assigner)
        ]
        
        if include_job:
            options.append(joinedload(Task.job))
            
        return query.options(*options)
    
    @staticmethod
    def get_jobs_with_relations(query, include_tasks: bool = False):
        """
        Add eager loading for job relationships to avoid N+1 queries.
        
        Args:
            query: SQLAlchemy query object
            include_tasks: Whether to include tasks relationship
            
        Returns:
            Optimized query with eager loading
        """
        options = [
            joinedload(Job.supervisor),
            joinedload(Job.assigner),
            joinedload(Job.team)
        ]
        
        if include_tasks:
            options.append(selectinload(Job.tasks))  # Use selectinload for one-to-many
            
        return query.options(*options)
    
    @staticmethod
    def apply_task_filters(query, assigned_to_id: Optional[int] = None, 
                          assigner_id: Optional[int] = None,
                          status: Optional[Any] = None,
                          priority: Optional[str] = None,
                          search: Optional[str] = None):
        """
        Apply filters to task query in optimal order for index usage.
        
        Args:
            query: SQLAlchemy query object
            assigned_to_id: Filter by assigned user
            assigner_id: Filter by assigner
            status: Filter by status
            priority: Filter by priority
            search: Search in title/description
            
        Returns:
            Query with filters applied in optimal order
        """
        # Apply indexed filters first (in order of selectivity)
        if assigned_to_id:
            query = query.filter(Task.assigned_to_id == assigned_to_id)
            
        if assigner_id:
            query = query.filter(Task.assigner_id == assigner_id)
            
        if status:
            query = query.filter(Task.status == status)
            
        if priority:
            query = query.filter(Task.priority == priority)
        
        # Apply search filters last (can't use indexes effectively)
        if search:
            query = query.filter(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )
            
        return query
    
    @staticmethod
    def apply_job_filters(query, team_id: Optional[int] = None,
                         supervisor_id: Optional[int] = None,
                         assigner_id: Optional[int] = None,
                         status: Optional[Any] = None,
                         search: Optional[str] = None):
        """
        Apply filters to job query in optimal order for index usage.
        
        Args:
            query: SQLAlchemy query object
            team_id: Filter by team
            supervisor_id: Filter by supervisor
            assigner_id: Filter by assigner
            status: Filter by status
            search: Search in title/client
            
        Returns:
            Query with filters applied in optimal order
        """
        # Apply indexed filters first (in order of selectivity)
        if team_id:
            query = query.filter(Job.team_id == team_id)
            
        if supervisor_id:
            query = query.filter(Job.supervisor_id == supervisor_id)
            
        if assigner_id:
            query = query.filter(Job.assigner_id == assigner_id)
            
        if status:
            query = query.filter(Job.status == status)
        
        # Apply search filters last (can't use indexes effectively)
        if search:
            query = query.filter(
                or_(
                    Job.title.ilike(f"%{search}%"),
                    Job.client.ilike(f"%{search}%")
                )
            )
            
        return query
    
    @staticmethod
    def paginate_query(query, page: int, limit: int, order_by=None):
        """
        Apply pagination to query with consistent ordering.
        
        Args:
            query: SQLAlchemy query object
            page: Page number (1-based)
            limit: Items per page
            order_by: Column to order by (defaults to created_at desc)
            
        Returns:
            Query with pagination applied
        """
        offset = (page - 1) * limit
        
        if order_by is None:
            # Default ordering by created_at desc for consistent pagination
            if hasattr(query.column_descriptions[0]['entity'], 'created_at'):
                order_by = query.column_descriptions[0]['entity'].created_at.desc()
            else:
                order_by = query.column_descriptions[0]['entity'].id.desc()
        
        return query.order_by(order_by).offset(offset).limit(limit)
    
    @staticmethod
    def get_user_tasks_optimized(db_session, user_id: int, page: int = 1, 
                                limit: int = 20, status_filter: Optional[Any] = None):
        """
        Get tasks assigned to a user with optimized query.
        
        Args:
            db_session: Database session
            user_id: User ID
            page: Page number
            limit: Items per page
            status_filter: Optional status filter
            
        Returns:
            List of tasks with eager loaded relationships
        """
        query = db_session.query(Task)
        query = QueryOptimizer.get_tasks_with_relations(query)
        query = QueryOptimizer.apply_task_filters(
            query, 
            assigned_to_id=user_id, 
            status=status_filter
        )
        query = QueryOptimizer.paginate_query(query, page, limit)
        
        return query.all()
    
    @staticmethod
    def get_user_assigned_tasks_optimized(db_session, user_id: int, page: int = 1,
                                         limit: int = 20, status_filter: Optional[Any] = None):
        """
        Get tasks assigned by a user with optimized query.
        
        Args:
            db_session: Database session
            user_id: User ID
            page: Page number
            limit: Items per page
            status_filter: Optional status filter
            
        Returns:
            List of tasks with eager loaded relationships
        """
        query = db_session.query(Task)
        query = QueryOptimizer.get_tasks_with_relations(query)
        query = QueryOptimizer.apply_task_filters(
            query, 
            assigner_id=user_id, 
            status=status_filter
        )
        query = QueryOptimizer.paginate_query(query, page, limit)
        
        return query.all()
    
    @staticmethod
    def get_user_jobs_optimized(db_session, user_id: int, page: int = 1,
                               limit: int = 20, status_filter: Optional[Any] = None):
        """
        Get jobs supervised by a user with optimized query.
        
        Args:
            db_session: Database session
            user_id: User ID
            page: Page number
            limit: Items per page
            status_filter: Optional status filter
            
        Returns:
            List of jobs with eager loaded relationships
        """
        query = db_session.query(Job)
        query = QueryOptimizer.get_jobs_with_relations(query)
        query = QueryOptimizer.apply_job_filters(
            query, 
            supervisor_id=user_id, 
            status=status_filter
        )
        query = QueryOptimizer.paginate_query(query, page, limit)
        
        return query.all()
    
    @staticmethod
    def get_user_assigned_jobs_optimized(db_session, user_id: int, page: int = 1,
                                        limit: int = 20, status_filter: Optional[Any] = None):
        """
        Get jobs assigned by a user with optimized query.
        
        Args:
            db_session: Database session
            user_id: User ID
            page: Page number
            limit: Items per page
            status_filter: Optional status filter
            
        Returns:
            List of jobs with eager loaded relationships
        """
        query = db_session.query(Job)
        query = QueryOptimizer.get_jobs_with_relations(query)
        query = QueryOptimizer.apply_job_filters(
            query, 
            assigner_id=user_id, 
            status=status_filter
        )
        query = QueryOptimizer.paginate_query(query, page, limit)
        
        return query.all()
