"""
Pagination utilities for consistent pagination across all APIs
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Query


def create_pagination_metadata(
    page: int,
    limit: int,
    total_count: int
) -> Dict[str, Any]:
    """
    Create standardized pagination metadata
    
    Args:
        page: Current page number (1-based)
        limit: Number of items per page
        total_count: Total number of items
        
    Returns:
        Dictionary with pagination metadata
    """
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    return {
        "page": page,
        "limit": limit,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
        "next_page": page + 1 if page < total_pages else None,
        "previous_page": page - 1 if page > 1 else None,
        "start_index": (page - 1) * limit + 1 if total_count > 0 else 0,
        "end_index": min(page * limit, total_count)
    }


def apply_pagination(query: Query, page: int, limit: int) -> tuple[Query, int]:
    """
    Apply pagination to a SQLAlchemy query
    
    Args:
        query: SQLAlchemy query object
        page: Page number (1-based)
        limit: Items per page
        
    Returns:
        Tuple of (paginated_query, total_count)
    """
    # Get total count before pagination
    total_count = query.count()
    
    # Calculate offset
    offset = (page - 1) * limit
    
    # Apply pagination
    paginated_query = query.offset(offset).limit(limit)
    
    return paginated_query, total_count


def validate_pagination_params(page: int, limit: int) -> tuple[int, int]:
    """
    Validate and sanitize pagination parameters
    
    Args:
        page: Page number
        limit: Items per page
        
    Returns:
        Tuple of (validated_page, validated_limit)
    """
    # Ensure page is at least 1
    page = max(1, page)
    
    # Ensure limit is between 1 and 100
    limit = max(1, min(100, limit))
    
    return page, limit


def create_paginated_response(
    data: List[Any],
    page: int,
    limit: int,
    total_count: int,
    **additional_fields
) -> Dict[str, Any]:
    """
    Create a standardized paginated response
    
    Args:
        data: List of items for current page
        page: Current page number
        limit: Items per page
        total_count: Total number of items
        **additional_fields: Additional fields to include in response
        
    Returns:
        Dictionary with data and pagination metadata
    """
    response = {
        "data": data,
        "pagination": create_pagination_metadata(page, limit, total_count)
    }
    
    # Add any additional fields
    response.update(additional_fields)
    
    return response