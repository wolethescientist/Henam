from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from app.database import get_db
from app.models import ExpenseCategory, User
from app.schemas import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse
)
from app.auth import get_current_user
from app.services.cache_service import clear_cache

router = APIRouter(prefix="/expense-categories", tags=["expense-categories"])


@router.post("/", response_model=ExpenseCategoryResponse)
def create_expense_category(
    category_data: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense category."""
    # Check if category name already exists
    existing_category = db.query(ExpenseCategory).filter(
        ExpenseCategory.name.ilike(category_data.name)
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    db_category = ExpenseCategory(
        name=category_data.name.strip(),
        description=category_data.description,
        created_by_id=current_user.id
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    # Clear cache
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            print(f"🧹 Cleared {cleared_count} cache entries after category creation")
        else:
            clear_cache()
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")
        clear_cache()
    
    return db_category


@router.get("/", response_model=List[ExpenseCategoryResponse])
def get_expense_categories(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expense categories with filtering and pagination."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(ExpenseCategory).options(
        joinedload(ExpenseCategory.created_by)
    )
    
    # Filter by active status
    if active_only:
        query = query.filter(ExpenseCategory.is_active == True)
    
    # Apply search filter
    if search:
        query = query.filter(
            or_(
                ExpenseCategory.name.ilike(f"%{search}%"),
                ExpenseCategory.description.ilike(f"%{search}%")
            )
        )
    
    # Apply pagination
    offset = (page - 1) * limit
    categories = query.order_by(ExpenseCategory.name).offset(offset).limit(limit).all()
    
    return categories


@router.get("/{category_id}", response_model=ExpenseCategoryResponse)
def get_expense_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific expense category by ID."""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    return category


@router.put("/{category_id}", response_model=ExpenseCategoryResponse)
def update_expense_category(
    category_id: int,
    category_data: ExpenseCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an expense category."""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    # Check if new name already exists (if name is being updated)
    if category_data.name and category_data.name != category.name:
        existing_category = db.query(ExpenseCategory).filter(
            ExpenseCategory.name.ilike(category_data.name),
            ExpenseCategory.id != category_id
        ).first()
        
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
    
    # Update fields if provided
    update_data = category_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "name" and value:
            value = value.strip()
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    # Clear cache
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            cleared_count = redis_cache.clear_pattern("*")
            print(f"🧹 Cleared {cleared_count} cache entries after category update")
        else:
            clear_cache()
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")
        clear_cache()
    
    return category


@router.delete("/{category_id}")
def delete_expense_category(
    category_id: int,
    force_delete: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete or deactivate an expense category."""
    from app.models import Expense
    
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    # Check if category is being used by any expenses
    expenses_count = db.query(Expense).filter(Expense.category_id == category_id).count()
    
    if expenses_count > 0 and not force_delete:
        # Deactivate instead of delete if category is in use
        category.is_active = False
        db.commit()
        db.refresh(category)
        
        # Clear cache
        try:
            from app.services.redis_cache_service import redis_cache
            if redis_cache.redis_client:
                cleared_count = redis_cache.clear_pattern("*")
                print(f"🧹 Cleared {cleared_count} cache entries after category deactivation")
            else:
                clear_cache()
        except Exception as e:
            print(f"Warning: Could not clear cache: {e}")
            clear_cache()
        
        return {
            "message": f"Category deactivated successfully (was used by {expenses_count} expenses)",
            "deactivated": True
        }
    else:
        # Safe to delete
        db.delete(category)
        db.commit()
        
        # Clear cache
        try:
            from app.services.redis_cache_service import redis_cache
            if redis_cache.redis_client:
                cleared_count = redis_cache.clear_pattern("*")
                print(f"🧹 Cleared {cleared_count} cache entries after category deletion")
            else:
                clear_cache()
        except Exception as e:
            print(f"Warning: Could not clear cache: {e}")
            clear_cache()
        
        return {"message": "Category deleted successfully", "deleted": True}


@router.get("/stats/usage")
def get_category_usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage statistics for expense categories."""
    from app.models import Expense
    
    # Get categories with expense counts
    results = db.query(
        ExpenseCategory.id,
        ExpenseCategory.name,
        ExpenseCategory.is_active,
        func.count(Expense.id).label('expense_count'),
        func.coalesce(func.sum(Expense.amount), 0).label('total_amount')
    ).outerjoin(
        Expense, ExpenseCategory.id == Expense.category_id
    ).group_by(
        ExpenseCategory.id, ExpenseCategory.name, ExpenseCategory.is_active
    ).order_by(ExpenseCategory.name).all()
    
    return [
        {
            "category_id": result.id,
            "category_name": result.name,
            "is_active": result.is_active,
            "expense_count": result.expense_count,
            "total_amount": float(result.total_amount)
        }
        for result in results
    ]