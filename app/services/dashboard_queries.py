"""
Secure dashboard query service with proper error handling and parameterization.
"""
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

from app.utils.database_utils import DatabaseUtils
from app.utils.error_handler import database_error_handler
from app.exceptions import DatabaseError, ValidationError

logger = logging.getLogger(__name__)


class DashboardQueries:
    """Secure, parameterized queries for dashboard data."""
    
    @staticmethod
    @database_error_handler("financial_summary", fallback_data={
        "total_billed": 0,
        "total_paid": 0,
        "pending_amount": 0,
        "status": "fallback"
    })
    def get_financial_summary(db: Session, team_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get financial summary with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            
        Returns:
            Dictionary with financial metrics
        """
        query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_billed,
            COALESCE(SUM(paid_amount), 0) as total_paid,
            COALESCE(SUM(amount - paid_amount), 0) as pending_amount,
            COUNT(*) as total_invoices,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices
        FROM invoices 
        WHERE (:team_id IS NULL OR team_id = :team_id)
        AND created_at >= :start_date
        """
        
        # Default to last 12 months for financial data
        start_date = datetime.now() - timedelta(days=365)
        
        params = {
            "team_id": team_id,
            "start_date": start_date
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "financial_summary"
        ).first()
        
        if result:
            return {
                "total_billed": float(result.total_billed or 0),
                "total_paid": float(result.total_paid or 0),
                "pending_amount": float(result.pending_amount or 0),
                "total_invoices": int(result.total_invoices or 0),
                "paid_invoices": int(result.paid_invoices or 0),
                "pending_invoices": int(result.pending_invoices or 0),
                "status": "success"
            }
        else:
            raise DatabaseError(
                detail="No financial data found",
                operation="financial_summary",
                context={"team_id": team_id}
            )
    
    @staticmethod
    @database_error_handler("job_summary", fallback_data={
        "total_jobs": 0,
        "completed_jobs": 0,
        "in_progress_jobs": 0,
        "pending_jobs": 0,
        "status": "fallback"
    })
    def get_job_summary(db: Session, team_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get job summary with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            
        Returns:
            Dictionary with job metrics
        """
        query = """
        SELECT 
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_jobs,
            COUNT(CASE WHEN status = 'not_started' THEN 1 END) as pending_jobs,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_jobs,
            AVG(progress) as average_progress
        FROM jobs 
        WHERE (:team_id IS NULL OR team_id = :team_id)
        AND created_at >= :start_date
        """
        
        # Default to last 6 months for job data
        start_date = datetime.now() - timedelta(days=180)
        
        params = {
            "team_id": team_id,
            "start_date": start_date
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "job_summary"
        ).first()
        
        if result:
            return {
                "total_jobs": int(result.total_jobs or 0),
                "completed_jobs": int(result.completed_jobs or 0),
                "in_progress_jobs": int(result.in_progress_jobs or 0),
                "pending_jobs": int(result.pending_jobs or 0),
                "cancelled_jobs": int(result.cancelled_jobs or 0),
                "average_progress": float(result.average_progress or 0),
                "status": "success"
            }
        else:
            raise DatabaseError(
                detail="No job data found",
                operation="job_summary",
                context={"team_id": team_id}
            )
    
    @staticmethod
    @database_error_handler("recent_jobs", fallback_data=[])
    def get_recent_jobs(
        db: Session, 
        team_id: Optional[int] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get recent jobs with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            
        Returns:
            List of recent jobs
        """
        # Validate pagination parameters
        if limit < 1 or limit > 100:
            raise ValidationError(
                detail="Limit must be between 1 and 100",
                field="limit",
                value=limit
            )
        
        if offset < 0:
            raise ValidationError(
                detail="Offset must be non-negative",
                field="offset", 
                value=offset
            )
        
        query = """
        SELECT 
            j.id,
            j.title,
            j.client,
            j.status,
            j.progress,
            j.created_at,
            j.start_date,
            j.end_date,
            t.name as team_name,
            u.name as supervisor_name
        FROM jobs j
        LEFT JOIN teams t ON j.team_id = t.id
        LEFT JOIN users u ON j.supervisor_id = u.id
        WHERE (:team_id IS NULL OR j.team_id = :team_id)
        ORDER BY j.created_at DESC
        LIMIT :limit OFFSET :offset
        """
        
        params = {
            "team_id": team_id,
            "limit": limit,
            "offset": offset
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "recent_jobs"
        ).fetchall()
        
        jobs = []
        for row in result:
            jobs.append({
                "id": row.id,
                "title": row.title,
                "client": row.client,
                "status": row.status,
                "progress": int(row.progress or 0),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "start_date": row.start_date.isoformat() if row.start_date else None,
                "end_date": row.end_date.isoformat() if row.end_date else None,
                "team_name": row.team_name,
                "supervisor_name": row.supervisor_name
            })
        
        return jobs
    
    @staticmethod
    @database_error_handler("overdue_jobs", fallback_data=[])
    def get_overdue_jobs(
        db: Session,
        team_id: Optional[int] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get overdue jobs with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            
        Returns:
            List of overdue jobs
        """
        # Validate pagination parameters
        if limit < 1 or limit > 100:
            raise ValidationError(
                detail="Limit must be between 1 and 100",
                field="limit",
                value=limit
            )
        
        query = """
        SELECT 
            j.id,
            j.title,
            j.client,
            j.status,
            j.progress,
            j.end_date,
            j.created_at,
            t.name as team_name,
            u.name as supervisor_name,
            EXTRACT(DAYS FROM (CURRENT_DATE - j.end_date)) as days_overdue
        FROM jobs j
        LEFT JOIN teams t ON j.team_id = t.id
        LEFT JOIN users u ON j.supervisor_id = u.id
        WHERE j.end_date < CURRENT_DATE 
        AND j.status NOT IN ('completed', 'cancelled')
        AND (:team_id IS NULL OR j.team_id = :team_id)
        ORDER BY j.end_date ASC
        LIMIT :limit OFFSET :offset
        """
        
        params = {
            "team_id": team_id,
            "limit": limit,
            "offset": offset
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "overdue_jobs"
        ).fetchall()
        
        jobs = []
        for row in result:
            jobs.append({
                "id": row.id,
                "title": row.title,
                "client": row.client,
                "status": row.status,
                "progress": int(row.progress or 0),
                "end_date": row.end_date.isoformat() if row.end_date else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "team_name": row.team_name,
                "supervisor_name": row.supervisor_name,
                "days_overdue": int(row.days_overdue or 0)
            })
        
        return jobs
    
    @staticmethod
    @database_error_handler("monthly_trends", fallback_data=[])
    def get_monthly_trends(
        db: Session,
        team_id: Optional[int] = None,
        months: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Get monthly trends with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            months: Number of months to include
            
        Returns:
            List of monthly trend data
        """
        # Validate months parameter
        if months < 1 or months > 24:
            raise ValidationError(
                detail="Months must be between 1 and 24",
                field="months",
                value=months
            )
        
        query = """
        SELECT 
            DATE_TRUNC('month', j.created_at) as month,
            COUNT(*) as jobs_created,
            COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as jobs_completed,
            COALESCE(SUM(i.amount), 0) as revenue
        FROM jobs j
        LEFT JOIN invoices i ON j.id = i.job_id
        WHERE j.created_at >= CURRENT_DATE - INTERVAL ':months months'
        AND (:team_id IS NULL OR j.team_id = :team_id)
        GROUP BY DATE_TRUNC('month', j.created_at)
        ORDER BY month DESC
        LIMIT :months
        """
        
        params = {
            "team_id": team_id,
            "months": months
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "monthly_trends"
        ).fetchall()
        
        trends = []
        for row in result:
            trends.append({
                "month": row.month.strftime("%Y-%m") if row.month else None,
                "jobs_created": int(row.jobs_created or 0),
                "jobs_completed": int(row.jobs_completed or 0),
                "revenue": float(row.revenue or 0)
            })
        
        return trends
    
    @staticmethod
    @database_error_handler("client_summary", fallback_data=[])
    def get_client_summary(
        db: Session,
        team_id: Optional[int] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get client summary with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            limit: Maximum number of clients to return
            
        Returns:
            List of top clients by revenue
        """
        # Validate limit parameter
        if limit < 1 or limit > 50:
            raise ValidationError(
                detail="Limit must be between 1 and 50",
                field="limit",
                value=limit
            )
        
        query = """
        SELECT 
            i.client_name,
            COUNT(DISTINCT j.id) as total_jobs,
            COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) as completed_jobs,
            COALESCE(SUM(i.amount), 0) as total_revenue,
            COALESCE(SUM(i.paid_amount), 0) as paid_amount,
            MAX(j.created_at) as last_job_date
        FROM invoices i
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.client_name IS NOT NULL
        AND (:team_id IS NULL OR j.team_id = :team_id)
        AND i.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY i.client_name
        ORDER BY total_revenue DESC
        LIMIT :limit
        """
        
        params = {
            "team_id": team_id,
            "limit": limit
        }
        
        result = DatabaseUtils.execute_safe_query(
            db, query, params, "client_summary"
        ).fetchall()
        
        clients = []
        for row in result:
            clients.append({
                "client_name": row.client_name,
                "total_jobs": int(row.total_jobs or 0),
                "completed_jobs": int(row.completed_jobs or 0),
                "total_revenue": float(row.total_revenue or 0),
                "paid_amount": float(row.paid_amount or 0),
                "outstanding_amount": float((row.total_revenue or 0) - (row.paid_amount or 0)),
                "last_job_date": row.last_job_date.isoformat() if row.last_job_date else None
            })
        
        return clients
    
    @staticmethod
    def get_total_counts(db: Session, team_id: Optional[int] = None) -> Dict[str, int]:
        """
        Get total counts for pagination with secure parameterized query.
        
        Args:
            db: Database session
            team_id: Optional team filter
            
        Returns:
            Dictionary with total counts
        """
        try:
            # Get total job count
            job_count_query = """
            SELECT COUNT(*) as total
            FROM jobs 
            WHERE (:team_id IS NULL OR team_id = :team_id)
            """
            
            # Get overdue job count
            overdue_count_query = """
            SELECT COUNT(*) as total
            FROM jobs 
            WHERE end_date < CURRENT_DATE 
            AND status NOT IN ('completed', 'cancelled')
            AND (:team_id IS NULL OR team_id = :team_id)
            """
            
            params = {"team_id": team_id}
            
            job_count = DatabaseUtils.execute_safe_query(
                db, job_count_query, params, "job_count"
            ).scalar()
            
            overdue_count = DatabaseUtils.execute_safe_query(
                db, overdue_count_query, params, "overdue_count"
            ).scalar()
            
            return {
                "total_jobs": int(job_count or 0),
                "total_overdue": int(overdue_count or 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting total counts: {e}", exc_info=True)
            return {
                "total_jobs": 0,
                "total_overdue": 0
            }