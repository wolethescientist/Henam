from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import Expense, ExpenseCategory, User
from app.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, 
    ExpenseCategorySummary, FinancialFilterRequest,
    PaginatedResponse
)
from app.auth import get_current_user
from app.services.cache_middleware import cache_route
from app.services.cache_invalidation import cache_invalidation

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense."""
    # Validate category_id if provided
    category_id = expense_data.category_id
    if category_id:
        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == category_id,
            ExpenseCategory.is_active == True
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive category ID"
            )
        # Use the category name from the database
        category_name = category.name
    else:
        # Use the provided category string (backward compatibility)
        category_name = expense_data.category
    
    db_expense = Expense(
        title=expense_data.title,
        category=category_name,
        category_id=category_id,
        amount=expense_data.amount,
        date=expense_data.date.date() if isinstance(expense_data.date, datetime) else expense_data.date,
        description=expense_data.description,
        created_by_id=current_user.id
    )
    
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_resource_pattern("expense")
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    return db_expense


@router.get("/", response_model=PaginatedResponse[ExpenseResponse])
@cache_route(resource_type="expense", ttl=180)  # 3 minutes TTL
async def get_expenses(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get expenses with filtering and pagination."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(Expense).options(
        joinedload(Expense.created_by),
        joinedload(Expense.category_obj)
    )
    
    # Apply filters
    if category:
        query = query.filter(Expense.category.ilike(f"%{category}%"))
    
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    if search:
        query = query.filter(
            or_(
                Expense.title.ilike(f"%{search}%"),
                Expense.description.ilike(f"%{search}%"),
                Expense.category.ilike(f"%{search}%")
            )
        )
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    expenses = query.order_by(Expense.date.desc()).offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=expenses,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
@cache_route(resource_type="expense", ttl=180)  # 3 minutes TTL
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get a specific expense by ID."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Validate category_id if provided
    if expense_data.category_id is not None:
        if expense_data.category_id > 0:  # Allow 0 or None to clear category_id
            category = db.query(ExpenseCategory).filter(
                ExpenseCategory.id == expense_data.category_id,
                ExpenseCategory.is_active == True
            ).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive category ID"
                )
            # Update category name to match the selected category
            expense.category = category.name
            expense.category_id = expense_data.category_id
        else:
            expense.category_id = None
    
    # Update other fields if provided
    update_data = expense_data.dict(exclude_unset=True, exclude={'category_id'})
    for field, value in update_data.items():
        if field == "date" and isinstance(value, datetime):
            value = value.date()
        setattr(expense, field, value)
    
    db.commit()
    db.refresh(expense)
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_resource_pattern("expense")
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    db.delete(expense)
    db.commit()
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_resource_pattern("expense")
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    return {"message": "Expense deleted successfully"}


@router.get("/categories/summary", response_model=List[ExpenseCategorySummary])
@cache_route(resource_type="expense", ttl=600)  # 10 minutes TTL
async def get_expense_categories_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get expense categories summary with totals."""
    query = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_amount'),
        func.count(Expense.id).label('count')
    ).group_by(Expense.category)
    
    # Apply date filters
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    results = query.order_by(func.sum(Expense.amount).desc()).all()
    
    return [
        ExpenseCategorySummary(
            category=result.category,
            total_amount=float(result.total_amount),
            count=result.count
        )
        for result in results
    ]


@router.get("/export/excel")
def export_expenses_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export expenses to Excel file."""
    from sqlalchemy.orm import joinedload
    query = db.query(Expense).options(
        joinedload(Expense.created_by)
    )
    
    # Apply filters
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category:
        query = query.filter(Expense.category.ilike(f"%{category}%"))
    
    expenses = query.order_by(Expense.date.desc()).all()
    
    # Create DataFrame
    data = []
    for expense in expenses:
        data.append({
            'ID': expense.id,
            'Title': expense.title,
            'Category': expense.category,
            'Amount': expense.amount,
            'Date': expense.date.strftime('%Y-%m-%d'),
            'Description': expense.description or '',
            'Created By': expense.created_by.name if expense.created_by else '',
            'Created At': expense.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Expenses', index=False)
    
    output.seek(0)
    
    # Generate filename
    filename = f"expenses_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/stats/summary")
@cache_route(resource_type="expense", ttl=300)  # 5 minutes TTL
async def get_expenses_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get expenses summary statistics - optimized for performance."""
    # Build base query with filters
    base_query = db.query(Expense)
    if start_date:
        base_query = base_query.filter(Expense.date >= start_date)
    if end_date:
        base_query = base_query.filter(Expense.date <= end_date)
    
    # Optimized single query to get all required stats
    stats_result = base_query.with_entities(
        func.sum(Expense.amount).label('total_amount'),
        func.count(func.distinct(Expense.category)).label('category_count')
    ).first()
    
    total_amount = float(stats_result.total_amount) if stats_result.total_amount else 0.0
    category_count = stats_result.category_count or 0
    
    return {
        "total_amount": total_amount,
        "category_count": category_count
    }
