"""
Database utilities for secure and efficient database operations.
"""
import logging
from typing import Any, Dict, List, Optional, Union, Type
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager

from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError
from app.utils.error_handler import ErrorHandler

logger = logging.getLogger(__name__)


class DatabaseUtils:
    """Utilities for safe and efficient database operations."""
    
    @staticmethod
    def execute_safe_query(
        db: Session,
        query: str,
        params: Optional[Dict[str, Any]] = None,
        operation_name: str = "database_query"
    ) -> Any:
        """
        Execute a parameterized query with comprehensive error handling.
        
        Args:
            db: Database session
            query: SQL query string with named parameters
            params: Dictionary of parameters for the query
            operation_name: Name of the operation for logging
            
        Returns:
            Query result
            
        Raises:
            DatabaseError: If query execution fails
            ValidationError: If parameters are invalid
        """
        if params is None:
            params = {}
        
        # Validate that all parameters in query are provided
        DatabaseUtils._validate_query_parameters(query, params)
        
        try:
            logger.debug(
                f"Executing query: {operation_name}",
                extra={
                    "query": query,
                    "params": {k: "***" if "password" in k.lower() else v for k, v in params.items()},
                    "operation": operation_name
                }
            )
            
            result = db.execute(text(query), params)
            
            logger.debug(f"Query executed successfully: {operation_name}")
            return result
            
        except SQLAlchemyError as e:
            return ErrorHandler.handle_database_error(
                e, operation_name, context={"query": query, "params": params}
            )
    
    @staticmethod
    def get_with_fallback(
        db: Session,
        model: Type,
        filters: Dict[str, Any],
        fallback: Optional[Any] = None,
        operation_name: str = "get_record"
    ) -> Any:
        """
        Get a record with fallback on failure.
        
        Args:
            db: Database session
            model: SQLAlchemy model class
            filters: Dictionary of filter conditions
            fallback: Value to return if record not found or error occurs
            operation_name: Name of the operation for logging
            
        Returns:
            Record if found, fallback value otherwise
        """
        try:
            query = db.query(model)
            
            # Apply filters
            for field, value in filters.items():
                if hasattr(model, field):
                    query = query.filter(getattr(model, field) == value)
                else:
                    raise ValidationError(
                        detail=f"Invalid filter field: {field}",
                        field=field,
                        context={"model": model.__name__, "available_fields": [c.name for c in model.__table__.columns]}
                    )
            
            result = query.first()
            
            if result is None and fallback is None:
                raise ResourceNotFoundError(
                    detail=f"{model.__name__} not found",
                    resource_type=model.__name__,
                    context={"filters": filters}
                )
            
            return result if result is not None else fallback
            
        except SQLAlchemyError as e:
            if fallback is not None:
                logger.warning(
                    f"Database error in {operation_name}, using fallback",
                    extra={"model": model.__name__, "filters": filters, "error": str(e)}
                )
                return fallback
            else:
                return ErrorHandler.handle_database_error(
                    e, operation_name, table=model.__tablename__
                )
    
    @staticmethod
    def paginate_query(
        query,
        page: int = 1,
        limit: int = 10,
        max_limit: int = 100
    ) -> Dict[str, Any]:
        """
        Paginate a SQLAlchemy query with safety limits.
        
        Args:
            query: SQLAlchemy query object
            page: Page number (1-based)
            limit: Number of items per page
            max_limit: Maximum allowed limit
            
        Returns:
            Dictionary with paginated results and metadata
        """
        # Validate pagination parameters
        if page < 1:
            raise ValidationError(
                detail="Page number must be greater than 0",
                field="page",
                value=page
            )
        
        if limit < 1:
            raise ValidationError(
                detail="Limit must be greater than 0",
                field="limit",
                value=limit
            )
        
        if limit > max_limit:
            raise ValidationError(
                detail=f"Limit cannot exceed {max_limit}",
                field="limit",
                value=limit,
                context={"max_limit": max_limit}
            )
        
        try:
            # Get total count
            total_count = query.count()
            
            # Calculate pagination
            offset = (page - 1) * limit
            total_pages = (total_count + limit - 1) // limit
            
            # Get paginated results
            items = query.offset(offset).limit(limit).all()
            
            return {
                "items": items,
                "total_count": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
            
        except SQLAlchemyError as e:
            return ErrorHandler.handle_database_error(
                e, "paginate_query", context={"page": page, "limit": limit}
            )
    
    @staticmethod
    def bulk_insert_safe(
        db: Session,
        model: Type,
        data_list: List[Dict[str, Any]],
        batch_size: int = 1000,
        operation_name: str = "bulk_insert"
    ) -> int:
        """
        Safely perform bulk insert with batching and error handling.
        
        Args:
            db: Database session
            model: SQLAlchemy model class
            data_list: List of dictionaries containing data to insert
            batch_size: Number of records to insert per batch
            operation_name: Name of the operation for logging
            
        Returns:
            Number of records successfully inserted
        """
        if not data_list:
            return 0
        
        total_inserted = 0
        
        try:
            # Process in batches
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                
                try:
                    # Validate each record in the batch
                    validated_batch = []
                    for record in batch:
                        validated_record = DatabaseUtils._validate_model_data(model, record)
                        validated_batch.append(validated_record)
                    
                    # Insert batch
                    db.bulk_insert_mappings(model, validated_batch)
                    db.flush()  # Flush but don't commit yet
                    
                    total_inserted += len(batch)
                    
                    logger.debug(
                        f"Inserted batch {i//batch_size + 1}",
                        extra={
                            "operation": operation_name,
                            "batch_size": len(batch),
                            "total_inserted": total_inserted
                        }
                    )
                    
                except Exception as e:
                    logger.error(
                        f"Error inserting batch {i//batch_size + 1}",
                        extra={
                            "operation": operation_name,
                            "batch_start": i,
                            "batch_size": len(batch),
                            "error": str(e)
                        },
                        exc_info=True
                    )
                    # Continue with next batch instead of failing completely
                    continue
            
            # Commit all successful batches
            db.commit()
            
            logger.info(
                f"Bulk insert completed: {operation_name}",
                extra={
                    "total_records": len(data_list),
                    "successful_inserts": total_inserted,
                    "failed_inserts": len(data_list) - total_inserted
                }
            )
            
            return total_inserted
            
        except SQLAlchemyError as e:
            db.rollback()
            return ErrorHandler.handle_database_error(
                e, operation_name, table=model.__tablename__,
                context={"total_records": len(data_list)}
            )
    
    @staticmethod
    def _validate_query_parameters(query: str, params: Dict[str, Any]):
        """Validate that all required parameters are provided for a query."""
        import re
        
        # Find all named parameters in the query
        param_pattern = r':(\w+)'
        required_params = set(re.findall(param_pattern, query))
        provided_params = set(params.keys())
        
        missing_params = required_params - provided_params
        if missing_params:
            raise ValidationError(
                detail=f"Missing required parameters: {', '.join(missing_params)}",
                context={
                    "required_parameters": list(required_params),
                    "provided_parameters": list(provided_params),
                    "missing_parameters": list(missing_params)
                }
            )
    
    @staticmethod
    def _validate_model_data(model: Type, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate data against model constraints."""
        validated_data = {}
        
        # Get model columns
        columns = {c.name: c for c in model.__table__.columns}
        
        for field, value in data.items():
            if field not in columns:
                logger.warning(
                    f"Unknown field '{field}' for model {model.__name__}",
                    extra={"model": model.__name__, "field": field, "value": value}
                )
                continue
            
            column = columns[field]
            
            # Basic type validation
            if value is not None:
                # Check string length constraints
                if hasattr(column.type, 'length') and column.type.length:
                    if isinstance(value, str) and len(value) > column.type.length:
                        raise ValidationError(
                            detail=f"Value too long for field '{field}' (max: {column.type.length})",
                            field=field,
                            value=value,
                            context={"max_length": column.type.length}
                        )
            
            validated_data[field] = value
        
        return validated_data
    
    @staticmethod
    @contextmanager
    def transaction_scope(db: Session, operation_name: str = "transaction"):
        """
        Context manager for database transactions with automatic rollback on error.
        
        Usage:
            with DatabaseUtils.transaction_scope(db, "create_user") as tx:
                # Database operations here
                user = User(name="John")
                db.add(user)
                # Automatic commit on success, rollback on exception
        """
        try:
            logger.debug(f"Starting transaction: {operation_name}")
            yield db
            db.commit()
            logger.debug(f"Transaction committed: {operation_name}")
        except Exception as e:
            logger.error(
                f"Transaction failed, rolling back: {operation_name}",
                extra={"operation": operation_name, "error": str(e)},
                exc_info=True
            )
            db.rollback()
            raise
    
    @staticmethod
    def get_table_stats(db: Session, table_name: str) -> Dict[str, Any]:
        """
        Get statistics for a database table.
        
        Args:
            db: Database session
            table_name: Name of the table
            
        Returns:
            Dictionary with table statistics
        """
        try:
            # Get row count
            count_query = f"SELECT COUNT(*) FROM {table_name}"
            row_count = DatabaseUtils.execute_safe_query(
                db, count_query, operation_name=f"count_{table_name}"
            ).scalar()
            
            # Get table size (PostgreSQL specific)
            size_query = f"SELECT pg_total_relation_size('{table_name}') as size"
            try:
                table_size = DatabaseUtils.execute_safe_query(
                    db, size_query, operation_name=f"size_{table_name}"
                ).scalar()
            except:
                table_size = None  # Not PostgreSQL or insufficient permissions
            
            return {
                "table_name": table_name,
                "row_count": row_count,
                "table_size_bytes": table_size,
                "table_size_mb": round(table_size / 1024 / 1024, 2) if table_size else None
            }
            
        except Exception as e:
            logger.error(
                f"Error getting stats for table {table_name}",
                extra={"table": table_name, "error": str(e)},
                exc_info=True
            )
            return {
                "table_name": table_name,
                "error": str(e)
            }


# Convenience functions for common operations
def safe_get_by_id(db: Session, model: Type, record_id: int, **kwargs) -> Any:
    """Safely get a record by ID with error handling."""
    return DatabaseUtils.get_with_fallback(
        db, model, {"id": record_id}, 
        operation_name=f"get_{model.__name__.lower()}_by_id",
        **kwargs
    )


def safe_paginate(query, page: int = 1, limit: int = 10, **kwargs) -> Dict[str, Any]:
    """Safely paginate a query with validation."""
    return DatabaseUtils.paginate_query(query, page, limit, **kwargs)


def safe_execute(db: Session, query: str, params: Optional[Dict] = None, **kwargs) -> Any:
    """Safely execute a parameterized query."""
    return DatabaseUtils.execute_safe_query(db, query, params, **kwargs)