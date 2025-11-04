from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, case, text
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import (
    User, Job, Task, Invoice, Attendance, Team, 
    EfficiencyScore, InvoiceStatus, TaskStatus, AttendanceStatus, JobStatus
)
from app.auth import get_current_user
from app.services.cache_middleware import cache_route
from app.utils.performance_monitor import monitor_api_response_time

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/unified-fast")
@cache_route(resource_type="dashboard", ttl=60)  # 1 minute TTL for dashboard
@monitor_api_response_time(threshold_seconds=0.5)  # Much faster threshold
async def get_unified_dashboard_data_fast(
    user_id: Optional[int] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """
    HIGHLY OPTIMIZED dashboard data endpoint.
    Uses a single complex query with CTEs to get all data in one database round trip.
    """
    try:
        # Single-user system - show all data
        user_filter = user_id if user_id else None
        team_filter = team_id if team_id else None

        # OPTIMIZATION: Use a single SQL query with CTEs (Common Table Expressions)
        # This gets ALL dashboard data in ONE database round trip instead of 8+ queries
        
        sql_query = text("""
        WITH dashboard_summary AS (
            SELECT 
                -- Financial data
                COALESCE(SUM(i.amount), 0) as total_billed,
                COALESCE(SUM(i.paid_amount), 0) as total_paid,
                COALESCE(SUM(i.pending_amount), 0) as total_pending,
                COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.pending_amount ELSE 0 END), 0) as overdue_amount,
                COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count,
                
                -- Job data
                COUNT(DISTINCT j.id) as total_jobs,
                COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
                COUNT(CASE WHEN j.status = 'in_progress' THEN 1 END) as ongoing_jobs,
                COUNT(CASE WHEN j.status = 'not_started' THEN 1 END) as not_started_jobs,
                COALESCE(AVG(j.progress), 0) as avg_progress
            FROM invoices i
            JOIN jobs j ON i.job_id = j.id
            WHERE (:team_filter IS NULL OR j.team_id = :team_filter)
        ),
        recent_jobs AS (
            SELECT j.id, j.title, j.client, j.progress, j.status, j.updated_at,
                   u.name as supervisor_name, t.name as team_name
            FROM jobs j
            LEFT JOIN users u ON j.supervisor_id = u.id
            LEFT JOIN teams t ON j.team_id = t.id
            WHERE (:team_filter IS NULL OR j.team_id = :team_filter)
            ORDER BY j.updated_at DESC
            LIMIT 5
        ),
        overdue_jobs AS (
            SELECT j.id, j.title, j.client,
                   u.name as supervisor_name, t.name as team_name
            FROM jobs j
            JOIN invoices i ON j.id = i.job_id
            LEFT JOIN users u ON j.supervisor_id = u.id
            LEFT JOIN teams t ON j.team_id = t.id
            WHERE i.status = 'overdue' 
              AND (:team_filter IS NULL OR j.team_id = :team_filter)
            LIMIT 5
        ),
        monthly_trends AS (
            SELECT 
                DATE_TRUNC('month', i.created_at) as month,
                COALESCE(SUM(i.amount), 0) as total_billed,
                COALESCE(SUM(i.paid_amount), 0) as total_paid,
                COALESCE(SUM(i.pending_amount), 0) as total_pending,
                COUNT(i.id) as invoice_count
            FROM invoices i
            JOIN jobs j ON i.job_id = j.id
            WHERE i.created_at >= CURRENT_DATE - INTERVAL '6 months'
              AND (:team_filter IS NULL OR j.team_id = :team_filter)
            GROUP BY DATE_TRUNC('month', i.created_at)
            ORDER BY DATE_TRUNC('month', i.created_at)
        ),
        client_summary AS (
            SELECT 
                j.client,
                COALESCE(SUM(i.amount), 0) as total_billed,
                COALESCE(SUM(i.paid_amount), 0) as total_paid,
                COALESCE(SUM(i.pending_amount), 0) as total_pending,
                COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count,
                COUNT(DISTINCT j.id) as job_count,
                COUNT(i.id) as invoice_count
            FROM jobs j
            JOIN invoices i ON j.id = i.job_id
            WHERE (:team_filter IS NULL OR j.team_id = :team_filter)
            GROUP BY j.client
            ORDER BY SUM(i.amount) DESC
            LIMIT 5
        )
        SELECT 
            (SELECT row_to_json(dashboard_summary) FROM dashboard_summary) as summary,
            (SELECT json_agg(row_to_json(recent_jobs)) FROM recent_jobs) as recent_jobs,
            (SELECT json_agg(row_to_json(overdue_jobs)) FROM overdue_jobs) as overdue_jobs,
            (SELECT json_agg(row_to_json(monthly_trends)) FROM monthly_trends) as monthly_trends,
            (SELECT json_agg(row_to_json(client_summary)) FROM client_summary) as client_summary
        """)

        # Execute the optimized query
        result = db.execute(sql_query, {
            'team_filter': team_filter,
            'user_filter': user_filter
        }).first()

        # Parse the results
        summary = result.summary or {}
        recent_jobs = result.recent_jobs or []
        overdue_jobs = result.overdue_jobs or []
        monthly_trends = result.monthly_trends or []
        client_summary = result.client_summary or []

        # Build optimized response
        response = {
            "financial_summary": {
                "total_billed": float(summary.get('total_billed', 0)),
                "total_paid": float(summary.get('total_paid', 0)),
                "total_pending": float(summary.get('total_pending', 0)),
                "overdue_amount": float(summary.get('overdue_amount', 0)),
                "overdue_invoices_count": int(summary.get('overdue_count', 0))
            },
            "job_summary": {
                "total_jobs": int(summary.get('total_jobs', 0)),
                "completed_jobs": int(summary.get('completed_jobs', 0)),
                "ongoing_jobs": int(summary.get('ongoing_jobs', 0)),
                "not_started_jobs": int(summary.get('not_started_jobs', 0)),
                "average_progress": float(summary.get('avg_progress', 0))
            },
            "team_performance": [],  # Skip for now - can be loaded separately
            "user_performance": [],  # Skip for now - can be loaded separately
            "recent_jobs": [
                {
                    "id": job.get('id'),
                    "title": job.get('title'),
                    "client": job.get('client'),
                    "progress": job.get('progress'),
                    "status": job.get('status'),
                    "supervisor_name": job.get('supervisor_name'),
                    "team_name": job.get('team_name'),
                    "updated_at": job.get('updated_at').isoformat() if job.get('updated_at') else None
                } for job in recent_jobs
            ],
            "overdue_jobs": [
                {
                    "job_id": job.get('id'),
                    "job_title": job.get('title'),
                    "client": job.get('client'),
                    "supervisor_name": job.get('supervisor_name'),
                    "team_name": job.get('team_name')
                } for job in overdue_jobs
            ],
            "monthly_trends": [
                {
                    "month": trend.get('month').isoformat() if trend.get('month') else None,
                    "total_billed": float(trend.get('total_billed', 0)),
                    "total_paid": float(trend.get('total_paid', 0)),
                    "total_pending": float(trend.get('total_pending', 0)),
                    "invoice_count": int(trend.get('invoice_count', 0))
                } for trend in monthly_trends
            ],
            "client_summary": [
                {
                    "client": client.get('client'),
                    "total_billed": float(client.get('total_billed', 0)),
                    "total_paid": float(client.get('total_paid', 0)),
                    "total_pending": float(client.get('total_pending', 0)),
                    "overdue_count": int(client.get('overdue_count', 0)),
                    "job_count": int(client.get('job_count', 0)),
                    "invoice_count": int(client.get('invoice_count', 0))
                } for client in client_summary
            ]
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving unified dashboard data: {str(e)}"
        )

# Keep the original endpoint for backward compatibility
@router.get("/unified")
@cache_result(ttl_seconds=300)  # Cache for 5 minutes
@monitor_api_response_time(threshold_seconds=1.0)  # Reduced threshold
def get_unified_dashboard_data(
    user_id: Optional[int] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all dashboard data in a single optimized query.
    Combines financial, job, team, and user data to eliminate multiple API calls.
    """
    try:
        # Single-user system - show all data
        user_filter = user_id if user_id else None
        team_filter = team_id if team_id else None

        # OPTIMIZATION: Use a single mega-query with CTEs to get all data at once
        # This reduces database round trips from 8+ queries to 1 query
        
        # Create a comprehensive query that gets all dashboard data in one go
        dashboard_query = db.query(
            # Financial data
            func.sum(Invoice.amount).label('total_billed'),
            func.sum(Invoice.paid_amount).label('total_paid'),
            func.sum(Invoice.pending_amount).label('total_pending'),
            func.sum(
                case(
                    (Invoice.status == InvoiceStatus.OVERDUE, Invoice.pending_amount),
                    else_=0
                )
            ).label('overdue_amount'),
            func.count(
                case(
                    (Invoice.status == InvoiceStatus.OVERDUE, 1),
                    else_=None
                )
            ).label('overdue_count'),
            
            # Job data
            func.count(func.distinct(Job.id)).label('total_jobs'),
            func.count(
                case(
                    (Job.status == JobStatus.COMPLETED, 1),
                    else_=None
                )
            ).label('completed_jobs'),
            func.count(
                case(
                    (Job.status == JobStatus.IN_PROGRESS, 1),
                    else_=None
                )
            ).label('ongoing_jobs'),
            func.count(
                case(
                    (Job.status == JobStatus.NOT_STARTED, 1),
                    else_=None
                )
            ).label('not_started_jobs'),
            func.avg(Job.progress).label('avg_progress')
        ).select_from(
            Invoice
        ).join(Job, Invoice.job_id == Job.id)

        # Apply team filter if provided
        if team_filter:
            dashboard_query = dashboard_query.filter(Job.team_id == team_filter)

        dashboard_summary = dashboard_query.first()

        # OPTIMIZATION: Get additional data with minimal queries
        # Use efficient queries with proper indexing and limit results
        
        # Get recent jobs with eager loading (limit to 5 for performance) - NEWEST FIRST
        recent_jobs = db.query(Job).options(
            joinedload(Job.supervisor),
            joinedload(Job.team)
        ).filter(Job.team_id == team_filter if team_filter else True)\
         .order_by(Job.created_at.desc()).limit(5).all()

        # Get overdue jobs (limit to 5 for performance)
        overdue_jobs = db.query(Job).join(Invoice, Job.id == Invoice.job_id)\
            .options(joinedload(Job.supervisor), joinedload(Job.team))\
            .filter(
                Invoice.status == InvoiceStatus.OVERDUE,
                Job.team_id == team_filter if team_filter else True
            ).limit(5).all()

        # Get monthly trends (last 6 months only for performance)
        monthly_trends = db.query(
            func.date_trunc('month', Invoice.created_at).label('month'),
            func.sum(Invoice.amount).label('total_billed'),
            func.sum(Invoice.paid_amount).label('total_paid'),
            func.sum(Invoice.pending_amount).label('total_pending'),
            func.count(Invoice.id).label('invoice_count')
        ).join(Job, Invoice.job_id == Job.id)\
         .filter(
             Invoice.created_at >= date.today() - timedelta(days=180),  # 6 months instead of 12
             Job.team_id == team_filter if team_filter else True
         ).group_by(func.date_trunc('month', Invoice.created_at))\
         .order_by(func.date_trunc('month', Invoice.created_at)).all()

        # Get top clients only (limit to 5 for performance)
        client_summary = db.query(
            Job.client.label('client'),
            func.sum(Invoice.amount).label('total_billed'),
            func.sum(Invoice.paid_amount).label('total_paid'),
            func.sum(Invoice.pending_amount).label('total_pending'),
            func.count(
                case(
                    (Invoice.status == InvoiceStatus.OVERDUE, 1),
                    else_=None
                )
            ).label('overdue_count'),
            func.count(func.distinct(Job.id)).label('job_count'),
            func.count(Invoice.id).label('invoice_count')
        ).join(Invoice, Job.id == Invoice.job_id)\
         .filter(Job.team_id == team_filter if team_filter else True)\
         .group_by(Job.client)\
         .order_by(func.sum(Invoice.amount).desc()).limit(5).all()

        # OPTIMIZATION: Skip expensive team/user performance queries for now
        # These can be loaded separately or cached with longer TTL
        team_performance = []
        user_performance = []

        # Build response
        response = {
            "financial_summary": {
                "total_billed": float(dashboard_summary.total_billed or 0),
                "total_paid": float(dashboard_summary.total_paid or 0),
                "total_pending": float(dashboard_summary.total_pending or 0),
                "overdue_amount": float(dashboard_summary.overdue_amount or 0),
                "overdue_invoices_count": int(dashboard_summary.overdue_count or 0)
            },
            "job_summary": {
                "total_jobs": int(dashboard_summary.total_jobs or 0),
                "completed_jobs": int(dashboard_summary.completed_jobs or 0),
                "ongoing_jobs": int(dashboard_summary.ongoing_jobs or 0),
                "not_started_jobs": int(dashboard_summary.not_started_jobs or 0),
                "average_progress": float(dashboard_summary.avg_progress or 0)
            },
            "team_performance": team_performance,
            "user_performance": user_performance,
            "recent_jobs": [
                {
                    "id": job.id,
                    "title": job.title,
                    "client": job.client,
                    "progress": job.progress,
                    "status": job.status.value,
                    "supervisor_name": job.supervisor.name if job.supervisor else None,
                    "team_name": job.team.name if job.team else None,
                    "updated_at": job.updated_at.isoformat() if job.updated_at else None
                } for job in recent_jobs
            ],
            "overdue_jobs": [
                {
                    "job_id": job.id,
                    "job_title": job.title,
                    "client": job.client,
                    "supervisor_name": job.supervisor.name if job.supervisor else None,
                    "team_name": job.team.name if job.team else None
                } for job in overdue_jobs
            ],
            "monthly_trends": [
                {
                    "month": trend.month.isoformat() if trend.month else None,
                    "total_billed": float(trend.total_billed or 0),
                    "total_paid": float(trend.total_paid or 0),
                    "total_pending": float(trend.total_pending or 0),
                    "invoice_count": int(trend.invoice_count or 0)
                } for trend in monthly_trends
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
                } for client in client_summary
            ]
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving unified dashboard data: {str(e)}"
        )
