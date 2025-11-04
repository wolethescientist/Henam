from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import Expense, Invoice, InvoiceStatus, Job, User
from app.schemas import (
    FinancialAnalyticsResponse, FinancialFilterRequest,
    ExpenseCategorySummary, ExpenseDistribution, RevenueExpenseSummary,
    ProfitLossData, InvoiceAnalytics
)
from app.auth import get_current_user
from app.services.cache_service import cache_result
from app.services.export_service import ExportService

router = APIRouter(prefix="/financial-analytics", tags=["financial-analytics"])


def get_date_range(period: str, start_date: Optional[date] = None, end_date: Optional[date] = None):
    """Get date range based on period or custom dates."""
    today = date.today()
    
    if start_date and end_date:
        return start_date, end_date
    
    if period == "week":
        start = today - timedelta(days=7)
        return start, today
    elif period == "month":
        # Show last 30 days instead of current calendar month
        # This ensures data is shown even if current month has no activity
        start = today - timedelta(days=30)
        return start, today
    elif period == "quarter":
        quarter = (today.month - 1) // 3 + 1
        start = date(today.year, 3 * quarter - 2, 1)
        return start, today
    elif period == "year":
        start = date(today.year, 1, 1)
        return start, today
    else:
        # Default to current month
        start = today.replace(day=1)
        return start, today


@router.get("/", response_model=FinancialAnalyticsResponse)
@cache_result(ttl_seconds=600)  # Cache for 10 minutes - analytics don't change frequently
def get_financial_analytics(
    period: str = "month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive financial analytics with clear, consistent metrics."""
    start_date, end_date = get_date_range(period, start_date, end_date)
    
    # Get core financial metrics for the selected period
    core_metrics = get_core_financial_metrics(db, start_date, end_date)
    
    # Get expense data for the period
    top_expense_categories = get_top_expense_categories(db, start_date, end_date)
    expense_distribution = get_expense_distribution(db, start_date, end_date)
    period_expenses = get_period_expenses(db, start_date, end_date)
    
    # Get profit/loss trend for the period
    profit_loss_trend = get_profit_loss_trend(db, period, start_date, end_date)
    
    # Get invoice status distribution for pie chart (for the period)
    invoice_status_distribution = get_invoice_status_distribution(db, start_date, end_date)
    
    # Calculate payment rate
    payment_rate = (core_metrics['total_paid'] / core_metrics['total_invoiced'] * 100) if core_metrics['total_invoiced'] > 0 else 0
    
    return FinancialAnalyticsResponse(
        # Core metrics
        total_invoiced=core_metrics['total_invoiced'],
        total_paid=core_metrics['total_paid'],
        total_pending=core_metrics['total_pending'],
        total_expenses=period_expenses,
        profit_loss=core_metrics['total_paid'] - period_expenses,
        payment_rate=round(payment_rate, 2),
        
        # Invoice counts
        overdue_count=core_metrics['overdue_count'],
        paid_count=core_metrics['paid_count'],
        pending_count=core_metrics['pending_count'],
        
        # Charts and trends
        top_expense_categories=top_expense_categories,
        expense_distribution=expense_distribution,
        profit_loss_trend=profit_loss_trend,
        invoice_status_distribution=invoice_status_distribution,
        
        # Metadata
        period=period,
        start_date=datetime.combine(start_date, datetime.min.time()),
        end_date=datetime.combine(end_date, datetime.max.time())
    )


def get_core_financial_metrics(db: Session, start_date: date, end_date: date) -> dict:
    """Get core financial metrics for the specified period."""
    from sqlalchemy import case
    
    # Build query with date filter
    query = db.query(
        func.sum(Invoice.amount).label('total_invoiced'),
        func.sum(Invoice.paid_amount).label('total_paid'),
        func.sum(Invoice.pending_amount).label('total_pending'),
        func.count(
            case(
                (Invoice.status == InvoiceStatus.PAID, 1),
                else_=None
            )
        ).label('paid_count'),
        func.count(
            case(
                (Invoice.status == InvoiceStatus.PENDING, 1),
                else_=None
            )
        ).label('pending_count'),
        func.count(
            case(
                (Invoice.status == InvoiceStatus.OVERDUE, 1),
                else_=None
            )
        ).label('overdue_count')
    ).filter(
        and_(
            func.date(Invoice.created_at) >= start_date,
            func.date(Invoice.created_at) <= end_date
        )
    )
    
    totals = query.first()
    
    return {
        'total_invoiced': float(totals.total_invoiced) if totals.total_invoiced else 0.0,
        'total_paid': float(totals.total_paid) if totals.total_paid else 0.0,
        'total_pending': float(totals.total_pending) if totals.total_pending else 0.0,
        'paid_count': totals.paid_count or 0,
        'pending_count': totals.pending_count or 0,
        'overdue_count': totals.overdue_count or 0
    }


def get_period_expenses(db: Session, start_date: date, end_date: date) -> float:
    """Get total expenses for the period."""
    result = db.query(func.sum(Expense.amount)).filter(
        and_(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
    ).scalar()
    return float(result) if result else 0.0


def get_invoice_status_distribution(db: Session, start_date: date, end_date: date) -> List[dict]:
    """Get invoice status distribution for pie chart (pending, paid, overdue) for the specified period."""
    from sqlalchemy import case
    
    # Get counts and amounts for each status with date filter
    status_data = db.query(
        Invoice.status,
        func.count(Invoice.id).label('count'),
        func.sum(Invoice.amount).label('total_amount')
    ).filter(
        and_(
            func.date(Invoice.created_at) >= start_date,
            func.date(Invoice.created_at) <= end_date
        )
    ).group_by(Invoice.status).all()
    
    distribution = []
    for status_data in status_data:
        status = status_data.status
        count = status_data.count
        amount = float(status_data.total_amount) if status_data.total_amount else 0.0
        
        # Map status to display names
        if status == InvoiceStatus.PAID:
            label = "Paid"
            color = "#10B981"  # Green
        elif status == InvoiceStatus.PENDING:
            label = "Pending"
            color = "#F59E0B"  # Orange
        elif status == InvoiceStatus.OVERDUE:
            label = "Overdue"
            color = "#EF4444"  # Red
        else:
            continue  # Skip other statuses
        
        distribution.append({
            "status": label,
            "count": count,
            "amount": amount,
            "color": color
        })
    
    return distribution


def get_top_expense_categories(db: Session, start_date: date, end_date: date) -> List[ExpenseCategorySummary]:
    """Get top 5 expense categories by total amount."""
    results = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_amount'),
        func.count(Expense.id).label('count')
    ).filter(
        and_(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
    ).group_by(Expense.category).order_by(
        func.sum(Expense.amount).desc()
    ).limit(5).all()
    
    return [
        ExpenseCategorySummary(
            category=result.category,
            total_amount=float(result.total_amount),
            count=result.count
        )
        for result in results
    ]


def get_expense_distribution(db: Session, start_date: date, end_date: date) -> List[ExpenseDistribution]:
    """Get expense distribution by category with percentages."""
    # Get total expenses for the period
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        and_(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
    ).scalar() or 0
    
    if total_expenses == 0:
        return []
    
    # Get expenses by category
    results = db.query(
        Expense.category,
        func.sum(Expense.amount).label('amount')
    ).filter(
        and_(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
    ).group_by(Expense.category).all()
    
    return [
        ExpenseDistribution(
            category=result.category,
            amount=float(result.amount),
            percentage=round((float(result.amount) / total_expenses) * 100, 2)
        )
        for result in results
    ]




def get_profit_loss_trend(db: Session, period: str, start_date: date, end_date: date) -> List[ProfitLossData]:
    """Get profit/loss trend over time."""
    trend_data = []
    
    # Calculate the date range in days
    date_range_days = (end_date - start_date).days + 1
    
    # Determine the appropriate breakdown based on date range
    # If period is "custom", auto-detect the best breakdown
    if period == "custom":
        if date_range_days <= 7:
            period = "week"  # Daily breakdown
        elif date_range_days <= 31:
            period = "month"  # Weekly breakdown
        elif date_range_days <= 92:
            period = "quarter"  # Monthly breakdown
        else:
            period = "year"  # Quarterly breakdown
    
    if period == "week":
        # Daily breakdown for the week
        current_date = start_date
        while current_date <= end_date:
            daily_revenue = get_daily_revenue(db, current_date)
            daily_expenses = get_daily_expenses(db, current_date)
            profit_loss = daily_revenue - daily_expenses
            
            trend_data.append(ProfitLossData(
                period=current_date.strftime('%Y-%m-%d'),
                revenue=daily_revenue,
                expenses=daily_expenses,
                profit_loss=profit_loss
            ))
            current_date += timedelta(days=1)
    
    elif period == "month":
        # Weekly breakdown for the month
        current_date = start_date
        week_num = 1
        while current_date <= end_date:
            week_end = min(current_date + timedelta(days=6), end_date)
            weekly_revenue = get_weekly_revenue(db, current_date, week_end)
            weekly_expenses = get_weekly_expenses(db, current_date, week_end)
            profit_loss = weekly_revenue - weekly_expenses
            
            trend_data.append(ProfitLossData(
                period=f"Week {week_num}",
                revenue=weekly_revenue,
                expenses=weekly_expenses,
                profit_loss=profit_loss
            ))
            current_date = week_end + timedelta(days=1)
            week_num += 1
    
    elif period == "quarter":
        # Monthly breakdown for the quarter
        current_date = start_date
        month_num = 1
        while current_date <= end_date:
            month_end = min(current_date.replace(day=28) + timedelta(days=4), end_date)
            monthly_revenue = get_monthly_revenue(db, current_date, month_end)
            monthly_expenses = get_monthly_expenses(db, current_date, month_end)
            profit_loss = monthly_revenue - monthly_expenses
            
            trend_data.append(ProfitLossData(
                period=f"Month {month_num}",
                revenue=monthly_revenue,
                expenses=monthly_expenses,
                profit_loss=profit_loss
            ))
            current_date = month_end + timedelta(days=1)
            month_num += 1
    
    elif period == "year":
        # Quarterly breakdown for the year
        for quarter in range(1, 5):
            quarter_start = date(start_date.year, 3 * quarter - 2, 1)
            quarter_end = min(date(start_date.year, 3 * quarter, 1) + timedelta(days=-1), end_date)
            
            quarterly_revenue = get_quarterly_revenue(db, quarter_start, quarter_end)
            quarterly_expenses = get_quarterly_expenses(db, quarter_start, quarter_end)
            profit_loss = quarterly_revenue - quarterly_expenses
            
            trend_data.append(ProfitLossData(
                period=f"Q{quarter}",
                revenue=quarterly_revenue,
                expenses=quarterly_expenses,
                profit_loss=profit_loss
            ))
    
    return trend_data




# Helper functions for trend calculations
def get_daily_revenue(db: Session, date: date) -> float:
    """Get daily revenue from paid invoices (based on payment date, not invoice creation)."""
    # Since we don't have a separate payment date, we'll use updated_at for payments
    result = db.query(func.sum(Invoice.paid_amount)).filter(
        and_(
            Invoice.updated_at >= datetime.combine(date, datetime.min.time()),
            Invoice.updated_at <= datetime.combine(date, datetime.max.time()),
            Invoice.paid_amount > 0
        )
    ).scalar()
    return float(result) if result else 0


def get_daily_expenses(db: Session, date: date) -> float:
    """Get daily expenses."""
    result = db.query(func.sum(Expense.amount)).filter(Expense.date == date).scalar()
    return float(result) if result else 0


def get_weekly_revenue(db: Session, start_date: date, end_date: date) -> float:
    """Get weekly revenue."""
    result = db.query(func.sum(Invoice.paid_amount)).filter(
        and_(
            Invoice.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Invoice.updated_at <= datetime.combine(end_date, datetime.max.time()),
            Invoice.paid_amount > 0
        )
    ).scalar()
    return float(result) if result else 0


def get_weekly_expenses(db: Session, start_date: date, end_date: date) -> float:
    """Get weekly expenses."""
    result = db.query(func.sum(Expense.amount)).filter(
        and_(Expense.date >= start_date, Expense.date <= end_date)
    ).scalar()
    return float(result) if result else 0


def get_monthly_revenue(db: Session, start_date: date, end_date: date) -> float:
    """Get monthly revenue."""
    result = db.query(func.sum(Invoice.paid_amount)).filter(
        and_(
            Invoice.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Invoice.updated_at <= datetime.combine(end_date, datetime.max.time()),
            Invoice.paid_amount > 0
        )
    ).scalar()
    return float(result) if result else 0


def get_monthly_expenses(db: Session, start_date: date, end_date: date) -> float:
    """Get monthly expenses."""
    result = db.query(func.sum(Expense.amount)).filter(
        and_(Expense.date >= start_date, Expense.date <= end_date)
    ).scalar()
    return float(result) if result else 0


def get_quarterly_revenue(db: Session, start_date: date, end_date: date) -> float:
    """Get quarterly revenue."""
    result = db.query(func.sum(Invoice.paid_amount)).filter(
        and_(
            Invoice.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Invoice.updated_at <= datetime.combine(end_date, datetime.max.time()),
            Invoice.paid_amount > 0
        )
    ).scalar()
    return float(result) if result else 0


def get_quarterly_expenses(db: Session, start_date: date, end_date: date) -> float:
    """Get quarterly expenses."""
    result = db.query(func.sum(Expense.amount)).filter(
        and_(Expense.date >= start_date, Expense.date <= end_date)
    ).scalar()
    return float(result) if result else 0


@router.get("/export/pdf")
def export_financial_analytics_pdf(
    period: str = "month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export financial analytics as PDF."""
    start_date, end_date = get_date_range(period, start_date, end_date)
    
    # Get analytics data
    analytics_data = get_financial_analytics_data(db, start_date, end_date, period)
    
    # Export to PDF
    export_service = ExportService()
    pdf_stream = export_service.export_financial_analytics_to_pdf(analytics_data)
    
    # Generate filename
    filename = f"financial_analytics_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return Response(
        content=pdf_stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def get_financial_analytics_data(db: Session, start_date: date, end_date: date, period: str) -> dict:
    """Get all financial analytics data for export."""
    # Get core metrics for the period
    core_metrics = get_core_financial_metrics(db, start_date, end_date)
    period_expenses = get_period_expenses(db, start_date, end_date)
    
    # Get all the analytics data
    top_expense_categories = get_top_expense_categories(db, start_date, end_date)
    expense_distribution = get_expense_distribution(db, start_date, end_date)
    profit_loss_trend = get_profit_loss_trend(db, period, start_date, end_date)
    invoice_status_distribution = get_invoice_status_distribution(db, start_date, end_date)
    
    # Calculate payment rate
    payment_rate = (core_metrics['total_paid'] / core_metrics['total_invoiced'] * 100) if core_metrics['total_invoiced'] > 0 else 0
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "core_metrics": core_metrics,
        "total_expenses": period_expenses,
        "profit_loss": core_metrics['total_paid'] - period_expenses,
        "payment_rate": round(payment_rate, 2),
        "top_expense_categories": [cat.dict() for cat in top_expense_categories],
        "expense_distribution": [dist.dict() for dist in expense_distribution],
        "profit_loss_trend": [trend.dict() for trend in profit_loss_trend],
        "invoice_status_distribution": invoice_status_distribution
    }
