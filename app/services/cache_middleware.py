"""
Cache Middleware for FastAPI Integration

This middleware handles:
- Force refresh detection from query params and headers
- Automatic cache key generation
- Response headers for cache status
- Integration with the robust cache service
"""

from typing import Any, Optional, Dict, Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging
from app.services.robust_cache_service import robust_cache

logger = logging.getLogger(__name__)

class CacheMiddleware:
    """Middleware for handling cache operations in FastAPI routes"""
    
    @staticmethod
    def detect_force_refresh(request: Request) -> bool:
        """
        Detect if force refresh is requested
        
        Checks for:
        - Query parameter: ?forceRefresh=true
        - Header: x-force-refresh: true
        """
        # Check query parameter
        force_refresh_param = request.query_params.get('forceRefresh', '').lower()
        if force_refresh_param in ['true', '1', 'yes']:
            return True
        
        # Check header
        force_refresh_header = request.headers.get('x-force-refresh', '').lower()
        if force_refresh_header in ['true', '1', 'yes']:
            return True
        
        return False
    
    @staticmethod
    def get_user_id_from_request(request: Request) -> Optional[int]:
        """
        Extract user ID from request for user-specific caching
        
        This should be adapted based on your authentication system
        """
        # Try to get from request state (set by auth middleware)
        if hasattr(request.state, 'user_id'):
            return request.state.user_id
        
        # Try to get from headers (if passed by frontend)
        user_id_header = request.headers.get('x-user-id')
        if user_id_header:
            try:
                return int(user_id_header)
            except ValueError:
                pass
        
        return None
    
    @staticmethod
    def create_cache_key_from_request(
        request: Request, 
        resource_type: str, 
        resource_id: Optional[str] = None,
        **additional_params
    ) -> str:
        """
        Create cache key from request context
        
        Args:
            request: FastAPI request object
            resource_type: Type of resource (user, team, job, etc.)
            resource_id: Optional specific resource ID
            **additional_params: Additional parameters for cache key
        """
        user_id = CacheMiddleware.get_user_id_from_request(request)
        
        # Add query parameters to cache key
        query_params = dict(request.query_params)
        additional_params.update(query_params)
        
        return robust_cache._create_cache_key(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            **additional_params
        )
    
    @staticmethod
    def cache_response(
        cache_key: str,
        data: Any,
        resource_type: str,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache response data
        
        Args:
            cache_key: The cache key
            data: Data to cache
            resource_type: Type of resource
            ttl: Time to live in seconds
            
        Returns:
            bool: True if successfully cached
        """
        return robust_cache.set(cache_key, data, resource_type, ttl)
    
    @staticmethod
    def get_cached_response(
        cache_key: str,
        resource_type: str
    ) -> Optional[Any]:
        """
        Get cached response
        
        Args:
            cache_key: The cache key
            resource_type: Type of resource
            
        Returns:
            Cached data or None
        """
        return robust_cache.get(cache_key, resource_type)
    
    @staticmethod
    def create_response_with_cache_headers(
        data: Any,
        cache_status: str,
        status_code: int = 200
    ) -> JSONResponse:
        """
        Create JSONResponse with cache status headers
        
        Args:
            data: Response data
            cache_status: Cache status (hit, miss, refreshed)
            status_code: HTTP status code
            
        Returns:
            JSONResponse with cache headers
        """
        response = JSONResponse(
            content=data,
            status_code=status_code,
            headers={
                'x-cache-status': cache_status,
                'x-cache-timestamp': str(int(time.time()))
            }
        )
        return response

def cache_route(
    resource_type: str,
    resource_id: Optional[str] = None,
    ttl: Optional[int] = None,
    **cache_params
):
    """
    Decorator for caching FastAPI route responses
    
    Args:
        resource_type: Type of resource being cached
        resource_id: Optional specific resource ID
        ttl: Time to live in seconds
        **cache_params: Additional parameters for cache key
    """
    def decorator(func: Callable) -> Callable:
        from functools import wraps
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs (FastAPI dependency injection)
            request = kwargs.get('request')
            
            if not request:
                # If no request found, execute function without caching
                logger.warning(f"No request found for {func.__name__}, executing without cache")
                return await func(*args, **kwargs)
            
            # Detect force refresh
            force_refresh = CacheMiddleware.detect_force_refresh(request)
            
            # Create cache key
            cache_key = CacheMiddleware.create_cache_key_from_request(
                request, resource_type, resource_id, **cache_params
            )
            
            # Check for no-cache header
            no_cache = request.headers.get('cache-control', '').lower() == 'no-cache'
            
            # Check for cache cooldown (prevents caching immediately after updates)
            cooldown_active = False
            if robust_cache.redis_client and resource_type in ['job', 'team', 'user']:
                # Check if ANY cooldown exists for this resource type
                cooldown_pattern = f"henam:cache:cooldown:{resource_type}:*"
                try:
                    cooldown_keys = robust_cache.redis_client.keys(cooldown_pattern)
                    if cooldown_keys:
                        cooldown_active = True
                        logger.info(f"Cache cooldown active for {resource_type} ({len(cooldown_keys)} cooldowns), skipping cache")
                except Exception as e:
                    logger.error(f"Error checking cooldown: {e}")
            
            # Try to get from cache (unless force refresh, no-cache, or cooldown active)
            if not force_refresh and not no_cache and not cooldown_active:
                cached_data = CacheMiddleware.get_cached_response(cache_key, resource_type)
                if cached_data is not None:
                    logger.info(f"Cache HIT for {resource_type}: {cache_key}")
                    return cached_data  # Return data directly, not wrapped in response
            
            # Cache miss or force refresh - execute function
            logger.info(f"Cache {'MISS' if not force_refresh else 'FORCE_REFRESH'} for {resource_type}: {cache_key}")
            
            # Execute the original function
            result = await func(*args, **kwargs)
            
            # Cache the result (unless cooldown is active)
            if result is not None and not cooldown_active:
                CacheMiddleware.cache_response(cache_key, result, resource_type, ttl)
                logger.info(f"Cached {resource_type} response: {cache_key}")
            elif cooldown_active:
                logger.info(f"Skipped caching {resource_type} due to cooldown: {cache_key}")
            
            return result
        
        return wrapper
    return decorator

# Import time for timestamp
import time
