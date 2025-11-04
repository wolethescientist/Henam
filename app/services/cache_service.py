from functools import wraps
from typing import Any, Callable, Optional
import json
import hashlib
from datetime import datetime, timedelta
from app.database import get_db
from sqlalchemy.orm import Session
from app.services.redis_cache_service import redis_cache

# Simple in-memory cache (fallback when Redis is not available)
_cache = {}
_cache_ttl = {}

def cache_result(ttl_seconds: int = 300):  # 5 minutes default TTL
    """
    Decorator to cache function results.
    Uses Redis if available, falls back to in-memory cache.
    
    Args:
        ttl_seconds: Time to live in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = _create_cache_key(func.__name__, args, kwargs)
            
            # Try Redis cache first
            if redis_cache.redis_client:
                cached_result = redis_cache.get(cache_key)
                if cached_result is not None:
                    print(f"🎯 Cache HIT (Redis): {func.__name__}")
                    return cached_result
            else:
                # Fallback to in-memory cache
                if cache_key in _cache:
                    if _is_cache_valid(cache_key, ttl_seconds):
                        print(f"🎯 Cache HIT (Memory): {func.__name__}")
                        return _cache[cache_key]
                    else:
                        # Remove expired cache entry
                        _remove_cache_entry(cache_key)
            
            # Execute function and cache result
            print(f"⚡ Cache MISS: Executing {func.__name__} and caching result")
            result = func(*args, **kwargs)
            
            # Validate data before caching to prevent bad data from being cached
            should_cache = _should_cache_result(result, func.__name__)
            
            if should_cache:
                # Cache in Redis if available, otherwise use in-memory
                if redis_cache.redis_client:
                    redis_cache.set(cache_key, result, ttl_seconds)
                    print(f"💾 Cached in Redis: {func.__name__} (TTL: {ttl_seconds}s)")
                else:
                    _cache[cache_key] = result
                    _cache_ttl[cache_key] = datetime.now()
                    print(f"💾 Cached in Memory: {func.__name__} (TTL: {ttl_seconds}s)")
            
            return result
        
        return wrapper
    return decorator

def _create_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Create a unique cache key from function name and arguments."""
    # Filter out dependency-injected objects that shouldn't affect cache key
    filtered_kwargs = {}
    for key, value in kwargs.items():
        # Skip dependency-injected objects that are typically the same across requests
        if key in ['db', 'request']:  # Skip database session and request objects
            continue
        # For current_user, extract only the user ID if it exists
        elif key == 'current_user' and hasattr(value, 'id'):
            filtered_kwargs['user_id'] = value.id
        else:
            filtered_kwargs[key] = value
    
    # Convert args and filtered kwargs to a string representation
    key_data = {
        'func_name': func_name,
        'args': args,
        'kwargs': filtered_kwargs
    }
    
    # Create hash of the key data but include function name for pattern matching
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    hash_part = hashlib.md5(key_string.encode()).hexdigest()
    return f"cache:{func_name}:{hash_part}"

def _is_cache_valid(cache_key: str, ttl_seconds: int) -> bool:
    """Check if cache entry is still valid."""
    if cache_key not in _cache_ttl:
        return False
    
    cache_time = _cache_ttl[cache_key]
    return datetime.now() - cache_time < timedelta(seconds=ttl_seconds)

def _remove_cache_entry(cache_key: str):
    """Remove cache entry and its TTL."""
    _cache.pop(cache_key, None)
    _cache_ttl.pop(cache_key, None)

def clear_cache(pattern: Optional[str] = None):
    """
    Clear cache entries.
    
    Args:
        pattern: If provided, only clear entries matching this pattern
    """
    if pattern:
        keys_to_remove = [key for key in _cache.keys() if pattern in key]
        for key in keys_to_remove:
            _remove_cache_entry(key)
    else:
        _cache.clear()
        _cache_ttl.clear()

def _should_cache_result(result: Any, func_name: str) -> bool:
    """
    Validate if result should be cached to prevent bad data caching.
    
    Args:
        result: The function result to validate
        func_name: Name of the function for logging
        
    Returns:
        bool: True if result should be cached, False otherwise
    """
    # Don't cache Pydantic models (serialization issues)
    if hasattr(result, 'dict') and hasattr(result, '__class__'):
        print(f"⚠️ Skipping cache for {func_name} - Pydantic model detected")
        return False
    
    # Don't cache None results
    if result is None:
        print(f"⚠️ Skipping cache for {func_name} - None result")
        return False
    
    # Allow empty lists/dicts as they can be valid responses (filtered results, etc.)
    # Only skip caching if result is None
    if result is None:
        print(f"⚠️ Skipping cache for {func_name} - None result")
        return False
    
    # For job-related endpoints, validate job data quality
    if 'job' in func_name.lower():
        return _validate_job_data(result, func_name)
    
    # For invoice-related endpoints, validate invoice data
    if 'invoice' in func_name.lower():
        return _validate_invoice_data(result, func_name)
    
    # Default: cache the result
    return True

def _validate_job_data(result: Any, func_name: str) -> bool:
    """Validate job data before caching - be lenient to avoid rejecting valid responses."""
    try:
        # Handle unified jobs response
        if isinstance(result, dict) and 'jobs' in result:
            jobs = result.get('jobs', [])
            # Allow empty jobs list - it's a valid response for filtered results
            if jobs:
                # Only check if jobs have basic structure, don't be too strict
                for job in jobs[:2]:  # Check first 2 jobs only
                    if not hasattr(job, 'id'):  # Only require ID, not title
                        print(f"⚠️ Skipping cache for {func_name} - Job missing ID")
                        return False
            # Always allow unified responses, even if empty
            return True
        
        # Handle direct job list
        elif isinstance(result, list):
            # Always allow list responses, even if empty
            return True
        
        # Allow any other response format
        return True
    except Exception as e:
        print(f"⚠️ Error validating job data for {func_name}: {e}")
        # Even if validation fails, cache the result to avoid issues
        return True

def _validate_invoice_data(result: Any, func_name: str) -> bool:
    """Validate invoice data before caching - be lenient to avoid rejecting valid responses."""
    try:
        # Handle invoice response with items
        if isinstance(result, dict) and 'items' in result:
            items = result.get('items', [])
            # Always allow invoice responses, even if empty
            return True
        
        # Allow any other response format
        return True
    except Exception as e:
        print(f"⚠️ Error validating invoice data for {func_name}: {e}")
        # Even if validation fails, cache the result to avoid issues
        return True

def get_cache_stats() -> dict:
    """Get cache statistics."""
    return {
        'total_entries': len(_cache),
        'cache_keys': list(_cache.keys()),
        'memory_usage_estimate': sum(len(str(value)) for value in _cache.values())
    }
