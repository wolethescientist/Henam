from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Invoice, Job, User, InvoiceStatus, Team
from app.schemas import (
    FinancialSummaryResponse, JobFinancialResponse, FinancialFilterRequest
)
from app.auth import get_current_user
from app.services.cache_middleware import cache_route
from app.services.cache_invalidation import cache_invalidation
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, or_, case

router = APIRouter(prefix="/financial", tags=["financial-dashboard"])


@router.get("/dashboard", response_model=FinancialSummaryResponse)
@cache_route(resource_type="financial", ttl=120)  # 2 minutes TTL for financial data
async def get_financial_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get comprehensive financial dashboard data (Admin only)."""
    # Calculate totals in one query
    totals = db.query(
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
        ).label('overdue_count')
    ).first()
    
    total_billed = totals.total_billed or 0.0
    total_paid = totals.total_paid or 0.0
    total_pending = totals.total_pending or 0.0
    overdue_amount = totals.overdue_amount or 0.0
    overdue_count = totals.overdue_count or 0
    
    # Get monthly totals for the last 12 months in one query
    monthly_data = db.query(
        func.date_trunc('month', Invoice.created_at).label('month'),
        func.sum(Invoice.amount).label('billed'),
        func.sum(Invoice.paid_amount).label('paid'),
        func.sum(Invoice.pending_amount).label('pending')
    ).filter(
        Invoice.created_at >= date.today().replace(day=1) - timedelta(days=365)
    ).group_by(
        func.date_trunc('month', Invoice.created_at)
    ).order_by(
        func.date_trunc('month', Invoice.created_at)
    ).all()
    
    # Create monthly lookup
    monthly_lookup = {
        row.month.strftime("%Y-%m"): {
            "billed": row.billed or 0.0,
            "paid": row.paid or 0.0,
            "pending": row.pending or 0.0
        } for row in monthly_data
    }
    
    # Generate monthly totals for the last 12 months
    monthly_totals = []
    for i in range(12):
        month_start = date.today().replace(day=1)
        month_start = month_start.replace(month=month_start.month - i)
        if month_start.month <= 0:
            month_start = month_start.replace(year=month_start.year - 1, month=12)
        
        month_key = month_start.strftime("%Y-%m")
        month_data = monthly_lookup.get(month_key, {"billed": 0.0, "paid": 0.0, "pending": 0.0})
        
        monthly_totals.append({
            "month": month_key,
            "billed": month_data["billed"],
            "paid": month_data["paid"],
            "pending": month_data["pending"]
        })
    
    return FinancialSummaryResponse(
        total_billed=total_billed,
        total_paid=total_paid,
        total_pending=total_pending,
        overdue_amount=overdue_amount,
        overdue_invoices_count=overdue_count,
        monthly_totals=monthly_totals
    )


@router.post("/jobs", response_model=List[JobFinancialResponse])
def get_job_financials(
    filters: FinancialFilterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get job-wise financial data with filtering (Admin only)."""
    query = db.query(Invoice).join(Job)
    
    # Apply filters
    if filters.client:
        query = query.filter(Job.client.ilike(f"%{filters.client}%"))
    
    if filters.team_id:
        query = query.filter(Job.team_id == filters.team_id)
    
    if filters.start_date:
        query = query.filter(Invoice.created_at >= filters.start_date)
    
    if filters.end_date:
        query = query.filter(Invoice.created_at <= filters.end_date)
    
    if filters.status:
        query = query.filter(Invoice.status == filters.status)
    
    invoices = query.all()
    
    # Group by job and calculate totals
    job_financials = {}
    for invoice in invoices:
        job_id = invoice.job_id
        if job_id not in job_financials:
            job = invoice.job
            job_financials[job_id] = {
                "job_id": job_id,
                "job_title": job.title,
                "client": job.client,
                "team_name": job.team.name,
                "supervisor_name": job.supervisor.name,
                "total_billed": 0.0,
                "total_paid": 0.0,
                "pending_amount": 0.0,
                "status": "active",
                "due_date": None,
                "is_overdue": False
            }
        
        job_financials[job_id]["total_billed"] += invoice.amount
        job_financials[job_id]["total_paid"] += invoice.paid_amount
        job_financials[job_id]["pending_amount"] += invoice.pending_amount
        
        # Set due date to the latest invoice due date
        if not job_financials[job_id]["due_date"] or invoice.due_date > job_financials[job_id]["due_date"]:
            job_financials[job_id]["due_date"] = invoice.due_date
        
        # Check if overdue
        if invoice.status == InvoiceStatus.OVERDUE:
            job_financials[job_id]["is_overdue"] = True
            job_financials[job_id]["status"] = "overdue"
    
    return list(job_financials.values())


@router.get("/overdue", response_model=List[JobFinancialResponse])
@cache_route(resource_type="financial", ttl=120)  # 2 minutes TTL
async def get_overdue_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get jobs with overdue invoices (Admin only)."""
    overdue_invoices = db.query(Invoice).filter(
        Invoice.status == InvoiceStatus.OVERDUE
    ).all()
    
    # Group by job
    job_financials = {}
    for invoice in overdue_invoices:
        job_id = invoice.job_id
        if job_id not in job_financials:
            job = invoice.job
            job_financials[job_id] = {
                "job_id": job_id,
                "job_title": job.title,
                "client": job.client,
                "team_name": job.team.name,
                "supervisor_name": job.supervisor.name,
                "total_billed": 0.0,
                "total_paid": 0.0,
                "pending_amount": 0.0,
                "status": "overdue",
                "due_date": None,
                "is_overdue": True
            }
        
        job_financials[job_id]["total_billed"] += invoice.amount
        job_financials[job_id]["total_paid"] += invoice.paid_amount
        job_financials[job_id]["pending_amount"] += invoice.pending_amount
        
        # Set due date to the latest invoice due date
        if not job_financials[job_id]["due_date"] or invoice.due_date > job_financials[job_id]["due_date"]:
            job_financials[job_id]["due_date"] = invoice.due_date
    
    return list(job_financials.values())


@router.get("/teams/summary")
@cache_route(resource_type="financial", ttl=120)  # 2 minutes TTL
async def get_team_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get financial summary by teams (Admin only)."""
    teams = db.query(Team).all()
    team_summaries = []
    
    for team in teams:
        # Get all invoices for jobs assigned to this team
        team_invoices = db.query(Invoice).join(Job).filter(
            Job.team_id == team.id
        ).all()
        
        total_billed = sum(inv.amount for inv in team_invoices)
        total_paid = sum(inv.paid_amount for inv in team_invoices)
        total_pending = sum(inv.pending_amount for inv in team_invoices)
        
        # Count overdue invoices
        overdue_count = len([inv for inv in team_invoices if inv.status == InvoiceStatus.OVERDUE])
        
        # Get supervisor
        supervisor = db.query(User).filter(
            User.team_id == team.id,
            User.supervisor_id.is_(None)  # Find team leader (user without supervisor)
        ).first()
        
        team_summaries.append({
            "team_id": team.id,
            "team_name": team.name,
            "supervisor_name": supervisor.name if supervisor else None,
            "total_billed": total_billed,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "overdue_count": overdue_count,
            "invoice_count": len(team_invoices)
        })
    
    return team_summaries


@router.get("/clients/summary")
@cache_route(resource_type="financial", ttl=120)  # 2 minutes TTL
async def get_client_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get financial summary by clients (Admin only)."""
    # Get all unique clients
    clients = db.query(Job.client).distinct().all()
    client_summaries = []
    
    for client_tuple in clients:
        client = client_tuple[0]
        
        # Get all invoices for jobs with this client
        client_invoices = db.query(Invoice).join(Job).filter(
            Job.client == client
        ).all()
        
        total_billed = sum(inv.amount for inv in client_invoices)
        total_paid = sum(inv.paid_amount for inv in client_invoices)
        total_pending = sum(inv.pending_amount for inv in client_invoices)
        
        # Count overdue invoices
        overdue_count = len([inv for inv in client_invoices if inv.status == InvoiceStatus.OVERDUE])
        
        # Count jobs
        job_count = len(set(inv.job_id for inv in client_invoices))
        
        client_summaries.append({
            "client": client,
            "total_billed": total_billed,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "overdue_count": overdue_count,
            "job_count": job_count,
            "invoice_count": len(client_invoices)
        })
    
    # Sort by total billed descending
    client_summaries.sort(key=lambda x: x["total_billed"], reverse=True)
    
    return client_summaries


@router.get("/monthly/trends")
@cache_route(resource_type="financial", ttl=300)  # 5 minutes TTL for trends
async def get_monthly_financial_trends(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get monthly financial trends (Admin only)."""
    trends = []
    
    for i in range(months):
        month_start = date.today().replace(day=1)
        month_start = month_start.replace(month=month_start.month - i)
        if month_start.month <= 0:
            month_start = month_start.replace(year=month_start.year - 1, month=12)
        
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        # Get invoices for this month
        month_invoices = db.query(Invoice).filter(
            Invoice.created_at >= month_start,
            Invoice.created_at < month_end
        ).all()
        
        # Get jobs created in this month
        month_jobs = db.query(Job).filter(
            Job.created_at >= month_start,
            Job.created_at < month_end
        ).count()
        
        trends.append({
            "month": month_start.strftime("%Y-%m"),
            "month_name": month_start.strftime("%B %Y"),
            "total_billed": sum(inv.amount for inv in month_invoices),
            "total_paid": sum(inv.paid_amount for inv in month_invoices),
            "total_pending": sum(inv.pending_amount for inv in month_invoices),
            "invoice_count": len(month_invoices),
            "job_count": month_jobs,
            "overdue_count": len([inv for inv in month_invoices if inv.status == InvoiceStatus.OVERDUE])
        })
    
    # Reverse to get chronological order
    trends.reverse()
    
    return trends
