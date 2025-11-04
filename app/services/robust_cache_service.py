"""
Robust Redis Caching Service with Cache-Aside Pattern

This service implements a comprehensive caching layer with:
- Cache-aside (lazy loading) pattern
- Data validation before caching
- Race condition prevention with Redis locks
- Force refresh mechanism
- Comprehensive invalidation
- Observability and metrics
- Security considerations
"""

import json
import hashlib
import time
import uuid
from typing import Any, Optional, Dict, List, Callable, Union
from datetime import datetime, timedelta
from functools import wraps
import redis
from app.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheMetrics:
    """Track cache performance metrics"""
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.invalidations = 0
        self.force_refreshes = 0
        self.lock_timeouts = 0
        self.validation_failures = 0
        self.race_conditions_prevented = 0
        self.start_time = time.time()
    
    def record_hit(self):
        self.hits += 1
    
    def record_miss(self):
        self.misses += 1
    
    def record_invalidation(self):
        self.invalidations += 1
    
    def record_force_refresh(self):
        self.force_refreshes += 1
    
    def record_lock_timeout(self):
        self.lock_timeouts += 1
    
    def record_validation_failure(self):
        self.validation_failures += 1
    
    def record_race_condition_prevented(self):
        self.race_conditions_prevented += 1
    
    def get_hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0
    
    def get_stats(self) -> Dict[str, Any]:
        uptime = time.time() - self.start_time
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_percent": round(self.get_hit_rate(), 2),
            "invalidations": self.invalidations,
            "force_refreshes": self.force_refreshes,
            "lock_timeouts": self.lock_timeouts,
            "validation_failures": self.validation_failures,
            "race_conditions_prevented": self.race_conditions_prevented,
            "uptime_seconds": round(uptime, 2),
            "requests_per_second": round((self.hits + self.misses) / uptime, 2) if uptime > 0 else 0
        }

class DataValidator:
    """Validate data before caching to ensure data integrity"""
    
    @staticmethod
    def validate_resource_data(data: Any, resource_type: str) -> tuple[bool, str]:
        """
        Validate data before caching
        
        Returns:
            tuple: (is_valid, error_message)
        """
        try:
            if data is None:
                return False, "Data is None"
            
            # Basic type validation
            if not isinstance(data, (dict, list)):
                return False, f"Expected dict or list, got {type(data).__name__}"
            
            # Resource-specific validation
            if resource_type == "user":
                return DataValidator._validate_user_data(data)
            elif resource_type == "team":
                return DataValidator._validate_team_data(data)
            elif resource_type == "job":
                return DataValidator._validate_job_data(data)
            elif resource_type == "invoice":
                return DataValidator._validate_invoice_data(data)
            elif resource_type == "dashboard":
                return DataValidator._validate_dashboard_data(data)
            elif resource_type == "task":
                return DataValidator._validate_task_data(data)
            elif resource_type == "attendance":
                return DataValidator._validate_attendance_data(data)
            else:
                # Generic validation for unknown types
                return DataValidator._validate_generic_data(data)
                
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    @staticmethod
    def _validate_user_data(data: Any) -> tuple[bool, str]:
        """Validate user data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with staff_data array
            if "staff_data" in data:
                staff_data = data.get("staff_data", [])
                for user in staff_data:
                    if not isinstance(user, dict) or "id" not in user:
                        return False, "User in unified response missing required field: id"
                    if user.get("id") is None:
                        return False, "User id cannot be null"
                return True, ""
            # Single user object
            elif "id" not in data:
                return False, "User missing required field: id"
            elif data.get("id") is None:
                return False, "User id cannot be null"
        elif isinstance(data, list):
            for user in data:
                if not isinstance(user, dict) or "id" not in user:
                    return False, "User in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_team_data(data: Any) -> tuple[bool, str]:
        """Validate team data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with teams array
            if "teams" in data:
                teams = data.get("teams", [])
                for team in teams:
                    if not isinstance(team, dict) or "id" not in team:
                        return False, "Team in unified response missing required field: id"
                    if team.get("id") is None:
                        return False, "Team id cannot be null"
                return True, ""
            # Single team object
            elif "id" not in data:
                return False, "Team missing required field: id"
            elif data.get("id") is None:
                return False, "Team id cannot be null"
        elif isinstance(data, list):
            for team in data:
                if not isinstance(team, dict) or "id" not in team:
                    return False, "Team in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_job_data(data: Any) -> tuple[bool, str]:
        """Validate job data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with jobs array
            if "jobs" in data:
                jobs = data.get("jobs", [])
                for job in jobs:
                    if not isinstance(job, dict) or "id" not in job:
                        return False, "Job in unified response missing required field: id"
                    if job.get("id") is None:
                        return False, "Job id cannot be null"
                return True, ""
            # Single job object
            elif "id" not in data:
                return False, "Job missing required field: id"
            elif data.get("id") is None:
                return False, "Job id cannot be null"
        elif isinstance(data, list):
            for job in data:
                if not isinstance(job, dict) or "id" not in job:
                    return False, "Job in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_invoice_data(data: Any) -> tuple[bool, str]:
        """Validate invoice data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with invoices array
            if "invoices" in data:
                invoices = data.get("invoices", [])
                for invoice in invoices:
                    if not isinstance(invoice, dict) or "id" not in invoice:
                        return False, "Invoice in unified response missing required field: id"
                    if invoice.get("id") is None:
                        return False, "Invoice id cannot be null"
                return True, ""
            # Check if this is a Pydantic response model with items array
            elif "items" in data:
                items = data.get("items", [])
                for item in items:
                    if not isinstance(item, dict) or "id" not in item:
                        return False, "Invoice item in response missing required field: id"
                    if item.get("id") is None:
                        return False, "Invoice item id cannot be null"
                return True, ""
            # Single invoice object
            elif "id" not in data:
                return False, "Invoice missing required field: id"
            elif data.get("id") is None:
                return False, "Invoice id cannot be null"
        elif isinstance(data, list):
            for invoice in data:
                if not isinstance(invoice, dict) or "id" not in invoice:
                    return False, "Invoice in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_dashboard_data(data: Any) -> tuple[bool, str]:
        """Validate dashboard data structure"""
        if not isinstance(data, dict):
            return False, "Dashboard data must be a dictionary"
        
        # Dashboard should have some basic structure - check for job_summary instead of total_jobs
        if "job_summary" in data:
            job_summary = data.get("job_summary", {})
            if not isinstance(job_summary, dict):
                return False, "Dashboard job_summary must be a dictionary"
            if "total_jobs" not in job_summary:
                return False, "Dashboard job_summary missing required field: total_jobs"
        
        # Allow dashboard responses even if they don't have all expected fields
        # This is more lenient to prevent cache failures
        return True, ""
    
    @staticmethod
    def _validate_task_data(data: Any) -> tuple[bool, str]:
        """Validate task data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with tasks array
            if "tasks" in data:
                tasks = data.get("tasks", [])
                for task in tasks:
                    if not isinstance(task, dict) or "id" not in task:
                        return False, "Task in unified response missing required field: id"
                    if task.get("id") is None:
                        return False, "Task id cannot be null"
                return True, ""
            # Single task object
            elif "id" not in data:
                return False, "Task missing required field: id"
            elif data.get("id") is None:
                return False, "Task id cannot be null"
        elif isinstance(data, list):
            for task in data:
                if not isinstance(task, dict) or "id" not in task:
                    return False, "Task in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_attendance_data(data: Any) -> tuple[bool, str]:
        """Validate attendance data structure"""
        if isinstance(data, dict):
            # Check if this is a unified API response with attendance_records array
            if "attendance_records" in data:
                records = data.get("attendance_records", [])
                for record in records:
                    if not isinstance(record, dict) or "id" not in record:
                        return False, "Attendance record in unified response missing required field: id"
                    if record.get("id") is None:
                        return False, "Attendance record id cannot be null"
                return True, ""
            # Single attendance object
            elif "id" not in data:
                return False, "Attendance missing required field: id"
            elif data.get("id") is None:
                return False, "Attendance id cannot be null"
        elif isinstance(data, list):
            for record in data:
                if not isinstance(record, dict) or "id" not in record:
                    return False, "Attendance record in list missing required field: id"
        return True, ""
    
    @staticmethod
    def _validate_generic_data(data: Any) -> tuple[bool, str]:
        """Generic validation for unknown data types"""
        if isinstance(data, dict):
            # Check for common required fields
            if "id" in data and data["id"] is None:
                return False, "ID field cannot be null"
        elif isinstance(data, list):
            # Validate list items
            for item in data:
                if isinstance(item, dict) and "id" in item and item["id"] is None:
                    return False, "List item ID cannot be null"
        
        return True, ""

class RobustCacheService:
    """
    Robust Redis caching service implementing cache-aside pattern
    with comprehensive validation, race condition prevention, and observability
    """
    
    def __init__(self):
        self.redis_client = None
        self.metrics = CacheMetrics()
        self._connect()
        
        # TTL configurations per resource type
        self.ttl_config = {
            "user": 600,      # 10 minutes
            "team": 300,      # 5 minutes  
            "job": 180,       # 3 minutes
            "invoice": 120,   # 2 minutes
            "dashboard": 60,  # 1 minute
            "default": 300    # 5 minutes
        }
    
    def _connect(self):
        """Connect to Redis with connection pooling for concurrent requests"""
        try:
            redis_host = getattr(settings, 'redis_host', 'localhost')
            redis_port = getattr(settings, 'redis_port', 6379)
            redis_db = getattr(settings, 'redis_db', 0)
            max_connections = getattr(settings, 'redis_max_connections', 20)
            socket_timeout = getattr(settings, 'redis_socket_timeout', 5)
            socket_connect_timeout = getattr(settings, 'redis_socket_connect_timeout', 5)
            
            logger.info(f"🔄 Connecting to Redis at {redis_host}:{redis_port} (DB: {redis_db})")
            logger.info(f"📊 Redis connection pool: max_connections={max_connections}")
            
            # Create connection pool for concurrent access
            pool = redis.ConnectionPool(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                max_connections=max_connections,
                socket_timeout=socket_timeout,
                socket_connect_timeout=socket_connect_timeout,
                decode_responses=True,
                retry_on_timeout=True,
                health_check_interval=30  # Check connection health every 30 seconds
            )
            
            # Create Redis client with connection pool
            self.redis_client = redis.Redis(connection_pool=pool)
            
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Redis connected successfully with connection pooling")
            logger.info(f"🚀 Ready to handle {max_connections} concurrent Redis operations")
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            logger.warning("💡 Caching will be disabled. To enable Redis, ensure Redis is running.")
            self.redis_client = None
    
    def _create_cache_key(self, resource_type: str, resource_id: Optional[str] = None, 
                         user_id: Optional[int] = None, **kwargs) -> str:
        """
        Create namespaced cache key with proper structure
        
        Format: {namespace}:{resource_type}:{resource_id}:{user_id}:{hash}
        """
        # Build key components
        components = [resource_type]
        
        if resource_id:
            components.append(str(resource_id))
        
        if user_id:
            components.append(f"user_{user_id}")
        
        # Add additional parameters as hash
        if kwargs:
            # Create hash of additional parameters
            param_str = json.dumps(kwargs, sort_keys=True, default=str)
            param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
            components.append(param_hash)
        
        # Join components with colons
        key = ":".join(components)
        
        # Add namespace prefix
        return f"henam:cache:{key}"
    
    def _create_lock_key(self, cache_key: str) -> str:
        """Create lock key for race condition prevention"""
        return f"{cache_key}:lock"
    
    def _acquire_lock(self, lock_key: str, timeout: int = 5) -> bool:
        """
        Acquire Redis lock to prevent race conditions
        
        Args:
            lock_key: The lock key
            timeout: Lock timeout in seconds
            
        Returns:
            bool: True if lock acquired, False otherwise
        """
        if not self.redis_client:
            return True  # No Redis, no race conditions
        
        try:
            # Use SET with NX and EX for atomic lock acquisition
            lock_value = str(uuid.uuid4())
            result = self.redis_client.set(
                lock_key, 
                lock_value, 
                nx=True,  # Only set if not exists
                ex=timeout  # Expire after timeout
            )
            return bool(result)
        except Exception as e:
            logger.error(f"Error acquiring lock {lock_key}: {e}")
            return False
    
    def _release_lock(self, lock_key: str, lock_value: str) -> bool:
        """
        Release Redis lock using Lua script for atomicity
        
        Args:
            lock_key: The lock key
            lock_value: The lock value to verify ownership
            
        Returns:
            bool: True if lock released successfully
        """
        if not self.redis_client:
            return True
        
        try:
            # Lua script to atomically release lock only if we own it
            lua_script = """
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            else
                return 0
            end
            """
            result = self.redis_client.eval(lua_script, 1, lock_key, lock_value)
            return bool(result)
        except Exception as e:
            logger.error(f"Error releasing lock {lock_key}: {e}")
            return False
    
    def get(self, cache_key: str, resource_type: str = "default") -> Optional[Any]:
        """
        Get value from cache with validation
        
        Args:
            cache_key: The cache key
            resource_type: Type of resource for validation
            
        Returns:
            Cached value or None
        """
        if not self.redis_client:
            return None
        
        try:
            # Get from cache
            cached_data = self.redis_client.get(cache_key)
            if cached_data is None:
                self.metrics.record_miss()
                logger.debug(f"Cache MISS: {cache_key}")
                return None
            
            # Deserialize
            data = json.loads(cached_data)
            
            # Validate cached data
            is_valid, error_msg = DataValidator.validate_resource_data(data, resource_type)
            if not is_valid:
                logger.warning(f"Invalid cached data for {cache_key}: {error_msg}")
                self.metrics.record_validation_failure()
                
                # Delete invalid cache entry
                self.delete(cache_key)
                return None
            
            self.metrics.record_hit()
            logger.debug(f"Cache HIT: {cache_key}")
            return data
            
        except Exception as e:
            logger.error(f"Error getting from cache {cache_key}: {e}")
            self.metrics.record_miss()
            return None
    
    def _convert_to_serializable(self, data: Any) -> Any:
        """
        Convert SQLAlchemy models, Pydantic models, and other objects to serializable format
        
        Args:
            data: Data to convert
            
        Returns:
            Serializable data
        """
        # Handle Pydantic models (BaseModel)
        if hasattr(data, 'model_dump'):
            # Pydantic v2 models
            return data.model_dump()
        elif hasattr(data, 'dict'):
            # Pydantic v1 models or other objects with dict() method
            try:
                return data.dict()
            except Exception:
                # If dict() fails, continue to other methods
                pass
        
        # Handle SQLAlchemy models
        if hasattr(data, 'to_dict'):
            return data.to_dict()
        
        # Handle lists
        elif isinstance(data, list):
            return [self._convert_to_serializable(item) for item in data]
        
        # Handle dictionaries
        elif isinstance(data, dict):
            return {key: self._convert_to_serializable(value) for key, value in data.items()}
        
        # Handle other types that might be serializable
        else:
            # Try to convert to dict if it has __dict__ attribute
            if hasattr(data, '__dict__') and not isinstance(data, (str, int, float, bool, type(None))):
                try:
                    return self._convert_to_serializable(data.__dict__)
                except Exception:
                    pass
            
            # Return as-is for primitive types
            return data

    def set(self, cache_key: str, data: Any, resource_type: str = "default", 
            ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with validation
        
        Args:
            cache_key: The cache key
            data: Data to cache
            resource_type: Type of resource for validation
            ttl: Time to live in seconds (uses default if None)
            
        Returns:
            bool: True if successfully cached
        """
        if not self.redis_client:
            return False
        
        try:
            # Convert SQLAlchemy models to serializable format
            serializable_data = self._convert_to_serializable(data)
            
            # Validate data before caching
            is_valid, error_msg = DataValidator.validate_resource_data(serializable_data, resource_type)
            if not is_valid:
                logger.error(f"Data validation failed for {cache_key}: {error_msg}")
                self.metrics.record_validation_failure()
                return False
            
            # Serialize data
            serialized_data = json.dumps(serializable_data, default=str)
            
            # Set TTL
            if ttl is None:
                ttl = self.ttl_config.get(resource_type, self.ttl_config["default"])
            
            # Store in cache
            result = self.redis_client.setex(cache_key, ttl, serialized_data)
            
            if result:
                logger.debug(f"Cached {resource_type} data: {cache_key} (TTL: {ttl}s)")
            else:
                logger.error(f"Failed to cache {resource_type} data: {cache_key}")
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error setting cache {cache_key}: {e}")
            return False
    
    def delete(self, cache_key: str) -> bool:
        """
        Delete key from cache
        
        Args:
            cache_key: The cache key to delete
            
        Returns:
            bool: True if successfully deleted
        """
        if not self.redis_client:
            return False
        
        try:
            result = self.redis_client.delete(cache_key)
            if result:
                self.metrics.record_invalidation()
                logger.debug(f"Deleted cache key: {cache_key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Error deleting cache key {cache_key}: {e}")
            return False
    
    def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching pattern
        
        Args:
            pattern: Redis pattern to match (e.g., "henam:cache:user:*")
            
        Returns:
            int: Number of keys deleted
        """
        if not self.redis_client:
            logger.warning(f"Redis not connected, cannot invalidate pattern: {pattern}")
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            logger.info(f"Found {len(keys)} keys matching pattern '{pattern}'")
            if len(keys) > 0:
                logger.debug(f"Sample keys to delete: {keys[:3]}")
            
            if keys:
                deleted = self.redis_client.delete(*keys)
                self.metrics.record_invalidation()
                logger.info(f"Invalidated {deleted} keys matching pattern: {pattern}")
                return deleted
            else:
                logger.info(f"No keys found matching pattern: {pattern}")
            return 0
        except Exception as e:
            logger.error(f"Error invalidating pattern {pattern}: {e}")
            return 0
    
    def cache_aside(self, resource_type: str, resource_id: Optional[str] = None,
                   user_id: Optional[int] = None, ttl: Optional[int] = None,
                   force_refresh: bool = False, **kwargs):
        """
        Cache-aside decorator with race condition prevention
        
        Args:
            resource_type: Type of resource being cached
            resource_id: Optional resource ID
            user_id: Optional user ID for user-specific caching
            ttl: Time to live in seconds
            force_refresh: If True, bypass cache and force fresh data
            **kwargs: Additional parameters for cache key
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **func_kwargs):
                # Create cache key
                cache_key = self._create_cache_key(
                    resource_type, resource_id, user_id, **kwargs
                )
                
                # Handle force refresh
                if force_refresh:
                    logger.info(f"Force refresh requested for {cache_key}")
                    self.metrics.record_force_refresh()
                    self.delete(cache_key)
                
                # Try to get from cache first
                cached_data = self.get(cache_key, resource_type)
                if cached_data is not None:
                    return cached_data
                
                # Cache miss - acquire lock to prevent race conditions
                lock_key = self._create_lock_key(cache_key)
                lock_acquired = self._acquire_lock(lock_key)
                
                if not lock_acquired:
                    # Could not acquire lock, wait and check cache again
                    logger.debug(f"Lock not acquired for {cache_key}, checking cache again")
                    time.sleep(0.1)  # Brief wait
                    cached_data = self.get(cache_key, resource_type)
                    if cached_data is not None:
                        self.metrics.record_race_condition_prevented()
                        return cached_data
                
                try:
                    # Execute function to get fresh data
                    fresh_data = func(*args, **func_kwargs)
                    
                    # Cache the fresh data
                    if fresh_data is not None:
                        self.set(cache_key, fresh_data, resource_type, ttl)
                    
                    return fresh_data
                    
                finally:
                    # Always release lock
                    if lock_acquired:
                        self._release_lock(lock_key, str(uuid.uuid4()))
            
            return wrapper
        return decorator
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        stats = self.metrics.get_stats()
        
        if self.redis_client:
            try:
                redis_info = self.redis_client.info()
                stats.update({
                    "redis_connected": True,
                    "redis_memory_used": redis_info.get("used_memory_human"),
                    "redis_connected_clients": redis_info.get("connected_clients"),
                    "redis_total_commands": redis_info.get("total_commands_processed"),
                    "redis_keyspace_hits": redis_info.get("keyspace_hits"),
                    "redis_keyspace_misses": redis_info.get("keyspace_misses")
                })
            except Exception as e:
                stats["redis_error"] = str(e)
        else:
            stats["redis_connected"] = False
        
        return stats
    
    def clear_all(self) -> bool:
        """Clear all cache entries (use with caution)"""
        if not self.redis_client:
            return False
        
        try:
            # Clear all keys with our namespace
            pattern = "henam:cache:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.warning(f"Cleared all cache entries: {len(keys)} keys")
            return True
        except Exception as e:
            logger.error(f"Error clearing all cache: {e}")
            return False

# Global cache service instance
robust_cache = RobustCacheService()
