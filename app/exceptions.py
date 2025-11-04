"""
Custom exception classes for structured error handling.
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class BaseCustomException(HTTPException):
    """Base class for all custom exceptions."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        context: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.error_code = error_code
        self.context = context or {}
        
        # Structure the detail as a dictionary for consistent API responses
        structured_detail = {
            "error_code": error_code,
            "message": detail,
            "context": self.context
        }
        
        super().__init__(status_code=status_code, detail=structured_detail, headers=headers)


class DatabaseError(BaseCustomException):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        detail: str = "Database operation failed",
        operation: Optional[str] = None,
        table: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if operation:
            error_context["operation"] = operation
        if table:
            error_context["table"] = table
            
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR",
            context=error_context
        )


class ValidationError(BaseCustomException):
    """Raised when input validation fails."""
    
    def __init__(
        self,
        detail: str = "Validation failed",
        field: Optional[str] = None,
        value: Optional[Any] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if field:
            error_context["field"] = field
        if value is not None:
            error_context["invalid_value"] = str(value)
            
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="VALIDATION_ERROR",
            context=error_context
        )


class BusinessLogicError(BaseCustomException):
    """Raised when business logic constraints are violated."""
    
    def __init__(
        self,
        detail: str = "Business logic constraint violated",
        rule: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if rule:
            error_context["rule"] = rule
            
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="BUSINESS_LOGIC_ERROR",
            context=error_context
        )


class AuthenticationError(BaseCustomException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        detail: str = "Authentication failed",
        reason: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if reason:
            error_context["reason"] = reason
            
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_ERROR",
            context=error_context,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(BaseCustomException):
    """Raised when authorization fails."""
    
    def __init__(
        self,
        detail: str = "Insufficient permissions",
        required_permission: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if required_permission:
            error_context["required_permission"] = required_permission
            
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="AUTHORIZATION_ERROR",
            context=error_context
        )


class ResourceNotFoundError(BaseCustomException):
    """Raised when a requested resource is not found."""
    
    def __init__(
        self,
        detail: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[Any] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if resource_type:
            error_context["resource_type"] = resource_type
        if resource_id is not None:
            error_context["resource_id"] = str(resource_id)
            
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            context=error_context
        )


class ConflictError(BaseCustomException):
    """Raised when a resource conflict occurs."""
    
    def __init__(
        self,
        detail: str = "Resource conflict",
        resource_type: Optional[str] = None,
        conflict_field: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if resource_type:
            error_context["resource_type"] = resource_type
        if conflict_field:
            error_context["conflict_field"] = conflict_field
            
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT_ERROR",
            context=error_context
        )


class ExternalServiceError(BaseCustomException):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        detail: str = "External service unavailable",
        service_name: Optional[str] = None,
        operation: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if service_name:
            error_context["service_name"] = service_name
        if operation:
            error_context["operation"] = operation
            
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="EXTERNAL_SERVICE_ERROR",
            context=error_context
        )


class RateLimitError(BaseCustomException):
    """Raised when rate limits are exceeded."""
    
    def __init__(
        self,
        detail: str = "Rate limit exceeded",
        limit: Optional[int] = None,
        window: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if limit:
            error_context["limit"] = limit
        if window:
            error_context["window"] = window
            
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_ERROR",
            context=error_context,
            headers={"Retry-After": "60"}
        )


class CacheError(BaseCustomException):
    """Raised when cache operations fail."""
    
    def __init__(
        self,
        detail: str = "Cache operation failed",
        operation: Optional[str] = None,
        cache_key: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        error_context = context or {}
        if operation:
            error_context["operation"] = operation
        if cache_key:
            error_context["cache_key"] = cache_key
            
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="CACHE_ERROR",
            context=error_context
        )