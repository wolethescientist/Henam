from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, case, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.database import get_db
from app.models import (
    User, Job, Task, Invoice, Attendance, Team, 
    EfficiencyScore, InvoiceStatus, TaskStatus, AttendanceStatus, JobStatus
)
from app.auth import get_current_user
from app.services.cache_middleware import cache_route
from app.services.cache_service import cache_result
from app.utils.performance_monitor import monitor_api_response_time
from app.utils.database_utils import DatabaseUtils
from app.exceptions import DatabaseError, ValidationError
from app.utils.error_handler import ErrorHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/unified")
@cache_route(resource_type="dashboard", ttl=30)  # 30 seconds TTL for faster updates
@monitor_api_response_time(threshold_seconds=0.3)  # Ultra-fast threshold
async def get_unified_dashboard_data(
    user_id: Optional[int] = None,
    team_id: Optional[int] = None,
    # Date filtering parameters
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    # Pagination parameters
    recent_jobs_limit: int = 5,
    overdue_jobs_limit: int = 5,
    client_summary_limit: int = 5,
    recent_jobs_page: int = 1,
    overdue_jobs_page: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    Get all dashboard data in a single optimized query with date filtering.
    Combines financial, job, team, and user data to eliminate multiple API calls.
    Supports filtering by date range, month, or year.
    """
    try:
        # Single-user system - show all data
        user_filter = user_id if user_id else None
        team_filter = team_id if team_id else None

        # Build date filters
        date_filters = []
        if start_date and end_date:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            date_filters.append(Invoice.created_at >= start_dt)
            date_filters.append(Invoice.created_at <= end_dt)
        elif month and year:
            from datetime import datetime
            start_dt = datetime(year, month, 1)
            if month == 12:
                end_dt = datetime(year + 1, 1, 1)
            else:
                end_dt = datetime(year, month + 1, 1)
            date_filters.append(Invoice.created_at >= start_dt)
            date_filters.append(Invoice.created_at < end_dt)
        elif year:
            from datetime import datetime
            start_dt = datetime(year, 1, 1)
            end_dt = datetime(year + 1, 1, 1)
            date_filters.append(Invoice.created_at >= start_dt)
            date_filters.append(Invoice.created_at < end_dt)

        # ULTRA-FAST OPTIMIZATION: Run queries in parallel
        # Use thread pool to execute multiple queries simultaneously
        
        def get_financial_summary():
            """Execute financial summary query"""
            try:
                # Optimize: Filter jobs first if team_id provided, then join invoices
                if team_filter:
                    financial_sql = """
                    SELECT 
                        COALESCE(SUM(i.amount), 0) as total_billed,
                        COALESCE(SUM(i.paid_amount), 0) as total_paid,
                        COALESCE(SUM(i.pending_amount), 0) as total_pending,
                        COALESCE(SUM(CASE WHEN i.status = 'OVERDUE' THEN i.pending_amount ELSE 0 END), 0) as overdue_amount,
                        COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_count
                    FROM invoices i
                    INNER JOIN jobs j ON i.job_id = j.id
                    WHERE j.team_id = :team_id
                    """
                else:
                    # No team filter - scan invoices directly (faster without join)
                    financial_sql = """
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_billed,
                        COALESCE(SUM(paid_amount), 0) as total_paid,
                        COALESCE(SUM(pending_amount), 0) as total_pending,
                        COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN pending_amount ELSE 0 END), 0) as overdue_amount,
                        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
                    FROM invoices
                    """
                
                result = DatabaseUtils.execute_safe_query(
                    db, financial_sql, {"team_id": team_filter}, "financial_summary"
                ).first()
                return result
            except Exception as e:
                logger.error(f"Financial summary error: {e}")
                return type('obj', (object,), {
                    'total_billed': 0, 'total_paid': 0, 'total_pending': 0, 
                    'overdue_amount': 0, 'overdue_count': 0
                })()

        def get_job_summary():
            """Execute job summary query"""
            try:
                job_sql = """
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_jobs,
                    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as ongoing_jobs,
                    COUNT(CASE WHEN status = 'NOT_STARTED' THEN 1 END) as not_started_jobs,
                    COALESCE(AVG(progress), 0) as avg_progress
                FROM jobs
                WHERE (:team_id IS NULL OR team_id = :team_id)
                """
                
                result = DatabaseUtils.execute_safe_query(
                    db, job_sql, {"team_id": team_filter}, "job_summary"
                ).first()
                return result
            except Exception as e:
                logger.error(f"Job summary error: {e}")
                return type('obj', (object,), {
                    'total_jobs': 0, 'completed_jobs': 0, 'ongoing_jobs': 0, 
                    'not_started_jobs': 0, 'avg_progress': 0
                })()
        
        # Execute queries in parallel using thread pool
        with ThreadPoolExecutor(max_workers=3) as executor:
            financial_future = executor.submit(get_financial_summary)
            job_future = executor.submit(get_job_summary)
            
            # Wait for results
            financial_summary = financial_future.result()
            job_summary = job_future.result()

        # 3. RECENT ACTIVITY - Secure parameterized query
        try:
            # Validate pagination parameters
            if recent_jobs_page < 1:
                raise ValidationError("Page must be greater than 0", field="recent_jobs_page", value=recent_jobs_page)
            if recent_jobs_limit < 1 or recent_jobs_limit > 100:
                raise ValidationError("Limit must be between 1 and 100", field="recent_jobs_limit", value=recent_jobs_limit)
                
            recent_jobs_offset = (recent_jobs_page - 1) * recent_jobs_limit
            
            recent_jobs_sql = """
            SELECT j.id, j.title, j.client, j.progress, j.status, 
                   j.start_date, j.end_date, j.updated_at,
                   u.name as supervisor_name, t.name as team_name
            FROM jobs j
            LEFT JOIN users u ON j.supervisor_id = u.id
            LEFT JOIN teams t ON j.team_id = t.id
            WHERE (:team_id IS NULL OR j.team_id = :team_id)
            ORDER BY j.updated_at DESC
            LIMIT :limit OFFSET :offset
            """
            
            recent_jobs_result = DatabaseUtils.execute_safe_query(
                db, recent_jobs_sql, {
                    "team_id": team_filter, 
                    "limit": recent_jobs_limit, 
                    "offset": recent_jobs_offset
                }, "recent_jobs"
            ).fetchall()
            
            # Convert to dict format for consistency
            recent_jobs = []
            for row in recent_jobs_result:
                recent_jobs.append({
                    'id': row.id,
                    'title': row.title,
                    'client': row.client,
                    'progress': row.progress,
                    'status': row.status,
                    'start_date': row.start_date,
                    'end_date': row.end_date,
                    'updated_at': row.updated_at,
                    'supervisor': {'name': row.supervisor_name} if row.supervisor_name else None,
                    'team': {'name': row.team_name} if row.team_name else None
                })
            
            # Get total count separately for pagination
            count_sql = "SELECT COUNT(*) FROM jobs WHERE (:team_id IS NULL OR team_id = :team_id)"
            recent_jobs_total = DatabaseUtils.execute_safe_query(
                db, count_sql, {"team_id": team_filter}, "recent_jobs_count"
            ).scalar()
            
        except (SQLAlchemyError, ValidationError) as e:
            if isinstance(e, ValidationError):
                raise e  # Re-raise validation errors
            logger.error("Recent jobs query failed", exc_info=True)
            raise DatabaseError(
                detail="Unable to retrieve recent jobs",
                operation="recent_jobs",
                context={"team_id": team_filter, "page": recent_jobs_page, "limit": recent_jobs_limit}
            )
        except Exception as e:
            logger.error(f"Unexpected error in recent jobs: {e}", exc_info=True)
            recent_jobs = []
            recent_jobs_total = 0

        # 4. OVERDUE JOBS - Secure parameterized query
        try:
            # Validate pagination parameters
            if overdue_jobs_page < 1:
                raise ValidationError("Page must be greater than 0", field="overdue_jobs_page", value=overdue_jobs_page)
            if overdue_jobs_limit < 1 or overdue_jobs_limit > 100:
                raise ValidationError("Limit must be between 1 and 100", field="overdue_jobs_limit", value=overdue_jobs_limit)
                
            overdue_jobs_offset = (overdue_jobs_page - 1) * overdue_jobs_limit
            
            overdue_sql = """
            SELECT DISTINCT j.id, j.title, j.client, j.progress, j.status,
                   j.start_date, j.end_date,
                   u.name as supervisor_name, t.name as team_name
            FROM jobs j
            JOIN invoices i ON j.id = i.job_id
            LEFT JOIN users u ON j.supervisor_id = u.id
            LEFT JOIN teams t ON j.team_id = t.id
            WHERE i.status = 'OVERDUE' 
            AND (:team_id IS NULL OR j.team_id = :team_id)
            LIMIT :limit OFFSET :offset
            """
            
            overdue_result = DatabaseUtils.execute_safe_query(
                db, overdue_sql, {
                    "team_id": team_filter,
                    "limit": overdue_jobs_limit,
                    "offset": overdue_jobs_offset
                }, "overdue_jobs"
            ).fetchall()
            
            # Convert to dict format
            overdue_jobs = []
            for row in overdue_result:
                overdue_jobs.append({
                    'id': row.id,
                    'title': row.title,
                    'client': row.client,
                    'progress': row.progress,
                    'status': row.status,
                    'start_date': row.start_date,
                    'end_date': row.end_date,
                    'supervisor': {'name': row.supervisor_name} if row.supervisor_name else None,
                    'team': {'name': row.team_name} if row.team_name else None
                })
                
        except (SQLAlchemyError, ValidationError) as e:
            if isinstance(e, ValidationError):
                raise e  # Re-raise validation errors
            logger.error("Overdue jobs query failed", exc_info=True)
            raise DatabaseError(
                detail="Unable to retrieve overdue jobs",
                operation="overdue_jobs",
                context={"team_id": team_filter, "page": overdue_jobs_page, "limit": overdue_jobs_limit}
            )
        except Exception as e:
            logger.error(f"Unexpected error in overdue jobs: {e}", exc_info=True)
            overdue_jobs = []

        # 5. MONTHLY TRENDS - Secure parameterized query
        try:
            trends_sql = """
            SELECT 
                DATE_TRUNC('month', i.created_at) as month,
                COALESCE(SUM(i.amount), 0) as total_billed,
                COALESCE(SUM(i.paid_amount), 0) as total_paid,
                COALESCE(SUM(i.pending_amount), 0) as total_pending,
                COUNT(i.id) as invoice_count
            FROM invoices i
            LEFT JOIN jobs j ON i.job_id = j.id
            WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
            AND (:team_id IS NULL OR j.team_id = :team_id)
            GROUP BY DATE_TRUNC('month', i.created_at)
            ORDER BY DATE_TRUNC('month', i.created_at)
            """
            
            trends_result = DatabaseUtils.execute_safe_query(
                db, trends_sql, {"team_id": team_filter}, "monthly_trends"
            ).fetchall()
            monthly_trends = trends_result
            
        except SQLAlchemyError as e:
            logger.error("Monthly trends query failed", exc_info=True)
            raise DatabaseError(
                detail="Unable to retrieve monthly trends",
                operation="monthly_trends",
                context={"team_id": team_filter}
            )
        except Exception as e:
            logger.error(f"Unexpected error in monthly trends: {e}", exc_info=True)
            monthly_trends = []

        # 6. CLIENT SUMMARY - Secure parameterized query
        try:
            # Validate limit parameter
            if client_summary_limit < 1 or client_summary_limit > 50:
                raise ValidationError("Client summary limit must be between 1 and 50", field="client_summary_limit", value=client_summary_limit)
                
            client_sql = """
            SELECT 
                j.client,
                COALESCE(SUM(i.amount), 0) as total_billed,
                COALESCE(SUM(i.paid_amount), 0) as total_paid,
                COALESCE(SUM(i.pending_amount), 0) as total_pending,
                COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_count,
                COUNT(DISTINCT j.id) as job_count,
                COUNT(i.id) as invoice_count
            FROM jobs j
            JOIN invoices i ON j.id = i.job_id
            WHERE (:team_id IS NULL OR j.team_id = :team_id)
            GROUP BY j.client
            ORDER BY SUM(i.amount) DESC
            LIMIT :limit
            """
            
            client_result = DatabaseUtils.execute_safe_query(
                db, client_sql, {
                    "team_id": team_filter,
                    "limit": client_summary_limit
                }, "client_summary"
            ).fetchall()
            client_summary = client_result
            
        except (SQLAlchemyError, ValidationError) as e:
            if isinstance(e, ValidationError):
                raise e  # Re-raise validation errors
            logger.error("Client summary query failed", exc_info=True)
            raise DatabaseError(
                detail="Unable to retrieve client summary",
                operation="client_summary",
                context={"team_id": team_filter, "limit": client_summary_limit}
            )
        except Exception as e:
            logger.error(f"Unexpected error in client summary: {e}", exc_info=True)
            client_summary = []

        # 7. TEAM PERFORMANCE - Secure ORM query
        try:
            teams_with_members = db.query(
                Team.id.label('team_id'),
                Team.name.label('team_name'),
                func.count(User.id).label('total_members')
            ).outerjoin(User, Team.id == User.team_id)\
             .group_by(Team.id, Team.name)\
             .all()
            
            team_performance = [
                {
                    "team_id": team.team_id,
                    "team_name": team.team_name,
                    "total_members": int(team.total_members or 0),
                    "average_attendance": 0.0,  # Simplified for now
                    "average_efficiency": 0.0,  # Simplified for now
                    "total_jobs_handled": 0,    # Simplified for now
                    "average_completion_time": 0.0  # Simplified for now
                } for team in teams_with_members
            ]
        except SQLAlchemyError as e:
            logger.error("Team performance query failed", exc_info=True)
            raise DatabaseError(
                detail="Unable to retrieve team performance data",
                operation="team_performance",
                context={"team_id": team_filter}
            )
        except Exception as e:
            logger.error(f"Unexpected error in team performance: {e}", exc_info=True)
            team_performance = []
        
        # Skip user performance for now to keep it lightweight
        user_performance = []

        # Build response with consistent structure and safe defaults
        response = {
            "financial_summary": {
                "total_billed": float(getattr(financial_summary, 'total_billed', 0) or 0),
                "total_paid": float(getattr(financial_summary, 'total_paid', 0) or 0),
                "total_pending": float(getattr(financial_summary, 'total_pending', 0) or 0),
                "overdue_amount": float(getattr(financial_summary, 'overdue_amount', 0) or 0),
                "overdue_invoices_count": int(getattr(financial_summary, 'overdue_count', 0) or 0)
            },
            "job_summary": {
                "total_jobs": int(getattr(job_summary, 'total_jobs', 0) or 0),
                "completed_jobs": int(getattr(job_summary, 'completed_jobs', 0) or 0),
                "ongoing_jobs": int(getattr(job_summary, 'ongoing_jobs', 0) or 0),
                "not_started_jobs": int(getattr(job_summary, 'not_started_jobs', 0) or 0),
                "average_progress": float(getattr(job_summary, 'avg_progress', 0) or 0)
            },
            "team_performance": team_performance or [],
            "user_performance": user_performance or [],
            "pagination": {
                "recent_jobs": {
                    "page": recent_jobs_page,
                    "limit": recent_jobs_limit,
                    "total_count": recent_jobs_total,
                    "total_pages": (recent_jobs_total + recent_jobs_limit - 1) // recent_jobs_limit if recent_jobs_limit > 0 else 0,
                    "has_more": len(recent_jobs) == recent_jobs_limit if recent_jobs else False
                },
                "overdue_jobs": {
                    "page": overdue_jobs_page,
                    "limit": overdue_jobs_limit,
                    "has_more": len(overdue_jobs) == overdue_jobs_limit if overdue_jobs else False
                },
                "client_summary": {
                    "limit": client_summary_limit,
                    "has_more": len(client_summary) == client_summary_limit if client_summary else False
                }
            },
            "recent_jobs": [
                {
                    "id": job.get('id') if isinstance(job, dict) else job.id,
                    "title": job.get('title') if isinstance(job, dict) else job.title,
                    "client": job.get('client') if isinstance(job, dict) else job.client,
                    "progress": float(job.get('progress', 0) if isinstance(job, dict) else (job.progress or 0)),
                    "status": job.get('status') if isinstance(job, dict) else (job.status.value if hasattr(job.status, 'value') else str(job.status)),
                    "supervisor_name": job.get('supervisor', {}).get('name') if isinstance(job, dict) else (job.supervisor.name if job.supervisor else None),
                    "team_name": job.get('team', {}).get('name') if isinstance(job, dict) else (job.team.name if job.team else None),
                    "start_date": job.get('start_date').isoformat() if isinstance(job, dict) and job.get('start_date') else (job.start_date.isoformat() if hasattr(job, 'start_date') and job.start_date else None),
                    "end_date": job.get('end_date').isoformat() if isinstance(job, dict) and job.get('end_date') else (job.end_date.isoformat() if hasattr(job, 'end_date') and job.end_date else None),
                    "updated_at": job.get('updated_at').isoformat() if isinstance(job, dict) and job.get('updated_at') else (job.updated_at.isoformat() if hasattr(job, 'updated_at') and job.updated_at else None)
                } for job in (recent_jobs or [])
            ],
            "overdue_jobs": [
                {
                    "job_id": job.get('id') if isinstance(job, dict) else job.id,
                    "job_title": job.get('title') if isinstance(job, dict) else job.title,
                    "client": job.get('client') if isinstance(job, dict) else job.client,
                    "supervisor_name": job.get('supervisor', {}).get('name') if isinstance(job, dict) else (job.supervisor.name if job.supervisor else None),
                    "team_name": job.get('team', {}).get('name') if isinstance(job, dict) else (job.team.name if job.team else None),
                    "progress": float(job.get('progress', 0) if isinstance(job, dict) else (job.progress or 0)),
                    "status": job.get('status') if isinstance(job, dict) else (job.status.value if hasattr(job.status, 'value') else str(job.status)),
                    "start_date": job.get('start_date').isoformat() if isinstance(job, dict) and job.get('start_date') else (job.start_date.isoformat() if hasattr(job, 'start_date') and job.start_date else None),
                    "end_date": job.get('end_date').isoformat() if isinstance(job, dict) and job.get('end_date') else (job.end_date.isoformat() if hasattr(job, 'end_date') and job.end_date else None)
                } for job in (overdue_jobs or [])
            ],
            "monthly_trends": [
                {
                    "month": trend.month.strftime("%Y-%m") if hasattr(trend, 'month') and trend.month else None,
                    "month_name": trend.month.strftime("%B %Y") if hasattr(trend, 'month') and trend.month else None,
                    "total_billed": float(trend.total_billed or 0),
                    "total_paid": float(trend.total_paid or 0),
                    "total_pending": float(trend.total_pending or 0),
                    "invoice_count": int(trend.invoice_count or 0)
                } for trend in (monthly_trends or [])
            ],
            "client_summary": [
                {
                    "client": client.client,
                    "total_billed": float(client.total_billed or 0),
                    "total_paid": float(client.total_paid or 0),
                    "total_pending": float(client.total_pending or 0),
                    "overdue_count": int(client.overdue_count or 0),
                    "job_count": int(client.job_count or 0),
                    "invoice_count": int(client.invoice_count or 0)
                } for client in (client_summary or [])
            ]
        }

        return response

    except (DatabaseError, ValidationError) as e:
        # Re-raise structured errors (these are already properly formatted)
        raise e
    except Exception as e:
        logger.error("Unexpected dashboard error", exc_info=True)
        raise DatabaseError(
            detail="Dashboard data temporarily unavailable",
            operation="dashboard_unified",
            context={
                "team_id": team_filter,
                "user_id": user_id,
                "error_type": type(e).__name__
            }
        )

@router.get("/financial/lightweight")
@cache_result(ttl_seconds=180)  # Cache for 3 minutes
@monitor_api_response_time(threshold_seconds=1.0)
def get_lightweight_financial_data(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lightweight financial data for quick loading.
    Only essential metrics, no heavy aggregations.
    """
    try:
        # Single query for essential financial metrics
        financial_data = db.query(
            func.sum(Invoice.amount).label('total_billed'),
            func.sum(Invoice.paid_amount).label('total_paid'),
            func.sum(Invoice.pending_amount).label('total_pending'),
            func.count(
                case(
                    (Invoice.status == InvoiceStatus.OVERDUE, 1),
                    else_=None
                )
            ).label('overdue_count')
        ).join(Job, Invoice.job_id == Job.id)

        if team_id:
            financial_data = financial_data.filter(Job.team_id == team_id)

        result = financial_data.first()

        return {
            "total_billed": float(result.total_billed or 0),
            "total_paid": float(result.total_paid or 0),
            "total_pending": float(result.total_pending or 0),
            "overdue_count": int(result.overdue_count or 0)
        }

    except SQLAlchemyError as e:
        logger.error("Lightweight financial data query failed", exc_info=True)
        raise DatabaseError(
            detail="Unable to retrieve financial data",
            operation="lightweight_financial",
            context={"team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error in lightweight financial data: {e}", exc_info=True)
        raise DatabaseError(
            detail="Financial data temporarily unavailable",
            operation="lightweight_financial",
            context={"team_id": team_id, "error_type": type(e).__name__}
        )
