"""
Error handling utilities and recovery strategies.
"""
import logging
import traceback
from typing import Any, Dict, Optional, Callable, Union
from functools import wraps
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.exceptions import (
    DatabaseError, ValidationError, BusinessLogicError,
    ExternalServiceError, CacheError, ResourceNotFoundError
)

logger = logging.getLogger(__name__)


class ErrorHandler:
    """Centralized error handling and recovery strategies."""
    
    @staticmethod
    def handle_database_error(
        e: Exception, 
        operation: str, 
        table: Optional[str] = None,
        fallback_data: Optional[Any] = None
    ) -> Union[Any, None]:
        """
        Handle database errors with appropriate recovery strategies.
        
        Args:
            e: The exception that occurred
            operation: Description of the operation that failed
            table: The database table involved (if applicable)
            fallback_data: Data to return if recovery is possible
            
        Returns:
            Fallback data if recovery is possible, otherwise raises appropriate exception
        """
        error_context = {
            "operation": operation,
            "table": table,
            "original_error": str(e)
        }
        
        # Log the error with full context
        logger.error(
            f"Database error in {operation}",
            extra=error_context,
            exc_info=True
        )
        
        # Handle specific database errors
        if isinstance(e, IntegrityError):
            # Constraint violation - usually a business logic issue
            raise BusinessLogicError(
                detail=f"Data integrity constraint violated during {operation}",
                rule="database_constraint",
                context=error_context
            )
        
        elif isinstance(e, OperationalError):
            # Connection issues, timeouts, etc.
            if "connection" in str(e).lower():
                # Connection issue - might be temporary
                if fallback_data is not None:
                    logger.warning(f"Using fallback data for {operation} due to connection issue")
                    return fallback_data
                
                raise ExternalServiceError(
                    detail=f"Database connection failed during {operation}",
                    service_name="database",
                    operation=operation,
                    context=error_context
                )
            else:
                # Other operational errors
                raise DatabaseError(
                    detail=f"Database operation failed: {operation}",
                    operation=operation,
                    table=table,
                    context=error_context
                )
        
        else:
            # Generic SQLAlchemy error
            raise DatabaseError(
                detail=f"Database error during {operation}",
                operation=operation,
                table=table,
                context=error_context
            )
    
    @staticmethod
    def handle_cache_error(
        e: Exception,
        operation: str,
        cache_key: Optional[str] = None,
        fallback_function: Optional[Callable] = None
    ) -> Any:
        """
        Handle cache errors with fallback strategies.
        
        Args:
            e: The exception that occurred
            operation: Description of the cache operation
            cache_key: The cache key involved
            fallback_function: Function to call for data if cache fails
            
        Returns:
            Data from fallback function or raises exception
        """
        error_context = {
            "operation": operation,
            "cache_key": cache_key,
            "original_error": str(e)
        }
        
        logger.warning(
            f"Cache error in {operation}",
            extra=error_context,
            exc_info=True
        )
        
        # If we have a fallback function, use it
        if fallback_function:
            try:
                logger.info(f"Using fallback function for {operation}")
                return fallback_function()
            except Exception as fallback_error:
                logger.error(
                    f"Fallback function also failed for {operation}",
                    extra={"fallback_error": str(fallback_error)},
                    exc_info=True
                )
                # Fall through to raise cache error
        
        # Determine if this is a connection issue or other cache error
        if isinstance(e, (RedisConnectionError, ConnectionError)):
            raise ExternalServiceError(
                detail=f"Cache service unavailable during {operation}",
                service_name="redis",
                operation=operation,
                context=error_context
            )
        else:
            raise CacheError(
                detail=f"Cache operation failed: {operation}",
                operation=operation,
                cache_key=cache_key,
                context=error_context
            )
    
    @staticmethod
    def handle_validation_error(
        e: Exception,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """Handle input validation errors."""
        error_context = context or {}
        error_context.update({
            "field": field,
            "value": str(value) if value is not None else None,
            "original_error": str(e)
        })
        
        logger.warning(
            f"Validation error for field {field}",
            extra=error_context
        )
        
        raise ValidationError(
            detail=f"Invalid value for field '{field}': {str(e)}",
            field=field,
            value=value,
            context=error_context
        )
    
    @staticmethod
    def safe_execute(
        operation: Callable,
        operation_name: str,
        fallback_data: Optional[Any] = None,
        reraise: bool = True
    ) -> Any:
        """
        Safely execute an operation with error handling.
        
        Args:
            operation: Function to execute
            operation_name: Name of the operation for logging
            fallback_data: Data to return if operation fails
            reraise: Whether to reraise exceptions or return fallback data
            
        Returns:
            Result of operation or fallback data
        """
        try:
            return operation()
        except SQLAlchemyError as e:
            return ErrorHandler.handle_database_error(
                e, operation_name, fallback_data=fallback_data
            )
        except RedisError as e:
            return ErrorHandler.handle_cache_error(
                e, operation_name, fallback_function=lambda: fallback_data
            )
        except Exception as e:
            logger.error(
                f"Unexpected error in {operation_name}",
                extra={"operation": operation_name, "error": str(e)},
                exc_info=True
            )
            
            if reraise:
                raise
            else:
                return fallback_data


def database_error_handler(
    operation: str,
    table: Optional[str] = None,
    fallback_data: Optional[Any] = None
):
    """
    Decorator for handling database errors in functions.
    
    Usage:
        @database_error_handler("fetch_users", table="users", fallback_data=[])
        def get_users():
            return db.query(User).all()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except SQLAlchemyError as e:
                return ErrorHandler.handle_database_error(
                    e, operation, table, fallback_data
                )
        return wrapper
    return decorator


def cache_error_handler(
    operation: str,
    fallback_function: Optional[Callable] = None
):
    """
    Decorator for handling cache errors in functions.
    
    Usage:
        @cache_error_handler("get_cached_data", fallback_function=fetch_from_db)
        def get_data():
            return cache.get("key")
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except RedisError as e:
                return ErrorHandler.handle_cache_error(
                    e, operation, fallback_function=fallback_function
                )
        return wrapper
    return decorator


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.
    
    This should be registered with FastAPI:
        app.add_exception_handler(Exception, global_exception_handler)
    """
    # Generate a unique error ID for tracking
    import uuid
    error_id = str(uuid.uuid4())
    
    # Log the error with full context
    logger.error(
        f"Unhandled exception [ID: {error_id}]",
        extra={
            "error_id": error_id,
            "path": str(request.url),
            "method": request.method,
            "client": request.client.host if request.client else "unknown",
            "error_type": type(exc).__name__,
            "error_message": str(exc)
        },
        exc_info=True
    )
    
    # Return a structured error response
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "error_id": error_id,
            "context": {
                "path": str(request.url.path),
                "method": request.method
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Enhanced HTTP exception handler that ensures consistent error format.
    
    This should be registered with FastAPI:
        app.add_exception_handler(HTTPException, http_exception_handler)
    """
    # If the detail is already structured (from our custom exceptions), use it
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        # Structure unstructured HTTPExceptions
        content = {
            "error_code": "HTTP_ERROR",
            "message": exc.detail,
            "context": {
                "path": str(request.url.path),
                "method": request.method,
                "status_code": exc.status_code
            }
        }
    
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers
    )


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for external service calls.
    
    Usage:
        breaker = CircuitBreaker(failure_threshold=5, timeout=60)
        
        @breaker
        def call_external_service():
            # Make external service call
            pass
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise ExternalServiceError(
                        detail="Service temporarily unavailable (circuit breaker open)",
                        service_name=func.__name__,
                        context={"circuit_breaker_state": self.state}
                    )
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except Exception as e:
                self._on_failure()
                raise
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt a reset."""
        if self.last_failure_time is None:
            return True
        
        import time
        return time.time() - self.last_failure_time >= self.timeout
    
    def _on_success(self):
        """Reset circuit breaker on successful call."""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failure and potentially open circuit breaker."""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(
                f"Circuit breaker opened after {self.failure_count} failures"
            )