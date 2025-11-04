import json
import hashlib
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
import redis
from app.config import settings

class RedisCacheService:
    """Redis-based caching service for production use."""
    
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis server with connection pooling."""
        try:
            # Get Redis configuration
            redis_host = getattr(settings, 'redis_host', 'localhost')
            redis_port = getattr(settings, 'redis_port', 6379)
            redis_db = getattr(settings, 'redis_db', 0)
            max_connections = getattr(settings, 'redis_max_connections', 20)
            socket_timeout = getattr(settings, 'redis_socket_timeout', 5)
            socket_connect_timeout = getattr(settings, 'redis_socket_connect_timeout', 5)
            
            print(f"🔄 Attempting to connect to Redis at {redis_host}:{redis_port} (DB: {redis_db})...")
            print(f"📊 Connection pool size: {max_connections}")
            
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
                health_check_interval=30
            )
            
            # Create Redis client with connection pool
            self.redis_client = redis.Redis(connection_pool=pool)
            
            # Test connection
            self.redis_client.ping()
            print(f"✅ Redis connected successfully at {redis_host}:{redis_port} (DB: {redis_db})")
            print(f"🚀 Caching system ready with {max_connections} pooled connections for optimal concurrency!")
            
        except Exception as e:
            print(f"❌ Redis not available, falling back to in-memory cache: {e}")
            print("💡 To enable Redis caching, make sure Redis is running and check your .env configuration")
            self.redis_client = None
    
    def _create_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Create a unique cache key from function name and arguments."""
        # Filter out dependency-injected objects
        filtered_kwargs = {}
        for key, value in kwargs.items():
            if key in ['db', 'request']:  # Skip database session and request objects
                continue
            elif key == 'current_user' and hasattr(value, 'id'):
                filtered_kwargs['user_id'] = value.id
            else:
                filtered_kwargs[key] = value
        
        key_data = {
            'func_name': func_name,
            'args': args,
            'kwargs': filtered_kwargs
        }
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        hash_part = hashlib.md5(key_string.encode()).hexdigest()
        return f"cache:{func_name}:{hash_part}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Error getting from Redis cache: {e}")
        
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Set value in cache with TTL."""
        if not self.redis_client:
            return False
        
        try:
            # Handle Pydantic models properly
            if hasattr(value, 'dict'):
                # Pydantic model - convert to dict first
                serialized_value = json.dumps(value.dict(), default=str)
            elif hasattr(value, '__dict__'):
                # Regular object with __dict__ - convert to dict
                serialized_value = json.dumps(value.__dict__, default=str)
            else:
                # Primitive types, lists, dicts, etc.
                serialized_value = json.dumps(value, default=str)
            return self.redis_client.setex(key, ttl_seconds, serialized_value)
        except Exception as e:
            print(f"Error setting Redis cache: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.redis_client:
            return False
        
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            print(f"Error deleting from Redis cache: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        if not self.redis_client:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
        except Exception as e:
            print(f"Error clearing Redis cache pattern: {e}")
        
        return 0
    
    def cache_result(self, ttl_seconds: int = 300):
        """
        Decorator to cache function results with Redis.
        
        Args:
            ttl_seconds: Time to live in seconds
        """
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs):
                # Create cache key
                cache_key = self._create_cache_key(func.__name__, args, kwargs)
                
                # Try to get from cache
                cached_result = self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl_seconds)
                
                return result
            
            return wrapper
        return decorator
    
    def get_stats(self) -> dict:
        """Get cache statistics."""
        if not self.redis_client:
            return {"status": "Redis not available", "type": "in-memory"}
        
        try:
            info = self.redis_client.info()
            return {
                "status": "connected",
                "type": "redis",
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace_hits": info.get("keyspace_hits"),
                "keyspace_misses": info.get("keyspace_misses")
            }
        except Exception as e:
            return {"status": f"Error: {e}", "type": "redis"}

# Global Redis cache instance
redis_cache = RedisCacheService()
