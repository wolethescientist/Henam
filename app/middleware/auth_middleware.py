from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.auth import verify_token
import logging

logger = logging.getLogger(__name__)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce authentication on protected routes.
    Redirects unauthenticated users to login page.
    """
    
    # Routes that don't require authentication
    EXCLUDED_PATHS = {
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/health/db",
        "/auth/login",
        "/auth/register",
        "/auth/reset-password",
        "/uploads",
        "/static"
    }
    
    # API routes that should return 401 instead of redirect
    API_PREFIXES = {
        "/auth/",
        "/users/",
        "/teams/",
        "/jobs/",
        "/tasks/",
        "/dashboard/",
        "/invoices/",
        "/expenses/",
        "/notifications/",
        "/websocket/",
        "/cache/"
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process the request and enforce authentication."""
        
        # Skip authentication for excluded paths
        if self._is_excluded_path(request.url.path):
            return await call_next(request)
        
        # Check for authentication token
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return self._handle_unauthenticated(request)
        
        try:
            # Extract and verify token
            token = auth_header.split(" ")[1]
            payload = verify_token(token)
            
            # Add user info to request state for downstream use
            request.state.user_id = payload.get("sub")
            request.state.user_email = payload.get("email")
            
        except Exception as e:
            logger.warning(f"Authentication failed for {request.url.path}: {str(e)}")
            return self._handle_unauthenticated(request)
        
        # Continue with the request
        return await call_next(request)
    
    def _is_excluded_path(self, path: str) -> bool:
        """Check if the path is excluded from authentication."""
        # Exact match
        if path in self.EXCLUDED_PATHS:
            return True
        
        # Check for path prefixes (like /uploads/*)
        for excluded_path in self.EXCLUDED_PATHS:
            if excluded_path.endswith("/") and path.startswith(excluded_path):
                return True
            if path.startswith(excluded_path + "/"):
                return True
        
        return False
    
    def _is_api_path(self, path: str) -> bool:
        """Check if the path is an API endpoint."""
        return any(path.startswith(prefix) for prefix in self.API_PREFIXES)
    
    def _handle_unauthenticated(self, request: Request) -> Response:
        """Handle unauthenticated requests."""
        
        # For API endpoints, return 401 JSON response
        if self._is_api_path(request.url.path):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please login.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # For web pages, redirect to login
        # Note: In a SPA, this might not be the best approach
        # Consider returning 401 and letting frontend handle redirect
        return RedirectResponse(
            url="/login",
            status_code=status.HTTP_302_FOUND
        )