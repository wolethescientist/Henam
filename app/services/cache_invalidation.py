"""
Cache Invalidation Service

This service handles automatic cache invalidation on CRUD operations
with support for:
- Immediate invalidation on create/update/delete
- Pattern-based invalidation for related resources
- Bulk invalidation for composite operations
- Invalidation with user context
"""

from typing import Any, Optional, List, Dict, Union
import logging
from app.services.robust_cache_service import robust_cache

logger = logging.getLogger(__name__)

class CacheInvalidationService:
    """Service for managing cache invalidation operations"""
    
    def __init__(self):
        self.cache = robust_cache
    
    def invalidate_resource(self, resource_type: str, resource_id: str, 
                          user_id: Optional[int] = None) -> bool:
        """
        Invalidate specific resource cache
        
        Args:
            resource_type: Type of resource (user, team, job, etc.)
            resource_id: ID of the specific resource
            user_id: Optional user ID for user-specific caching
            
        Returns:
            bool: True if successfully invalidated
        """
        try:
            # Create specific cache key
            cache_key = self.cache._create_cache_key(
                resource_type=resource_type,
                resource_id=resource_id,
                user_id=user_id
            )
            
            # Delete the specific key
            result = self.cache.delete(cache_key)
            
            if result:
                logger.info(f"Invalidated {resource_type} cache: {resource_id}")
            else:
                logger.debug(f"No cache entry found for {resource_type}: {resource_id} (this is normal)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error invalidating {resource_type} cache {resource_id}: {e}")
            return False
    
    def invalidate_resource_pattern(self, resource_type: str, 
                                  user_id: Optional[int] = None,
                                  **filters) -> int:
        """
        Invalidate all cache entries matching a pattern
        
        Args:
            resource_type: Type of resource
            user_id: Optional user ID for user-specific caching
            **filters: Additional filters for pattern matching
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            # Create pattern for matching keys
            pattern_parts = ["henam:cache", resource_type]
            
            if user_id:
                pattern_parts.append(f"user_{user_id}")
            
            # Add any additional filters
            for key, value in filters.items():
                pattern_parts.append(f"{key}_{value}")
            
            pattern = ":".join(pattern_parts) + "*"
            
            # Invalidate matching keys
            deleted_count = self.cache.invalidate_pattern(pattern)
            
            if deleted_count > 0:
                logger.info(f"Invalidated {deleted_count} {resource_type} cache entries")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating {resource_type} pattern: {e}")
            return 0
    
    def invalidate_user_data(self, user_id: int) -> int:
        """
        Invalidate all user-specific cache data
        
        Args:
            user_id: User ID to invalidate cache for
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            # Pattern for all user-specific cache entries
            pattern = f"henam:cache:*:user_{user_id}:*"
            deleted_count = self.cache.invalidate_pattern(pattern)
            
            if deleted_count > 0:
                logger.info(f"Invalidated {deleted_count} user-specific cache entries for user {user_id}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating user cache {user_id}: {e}")
            return 0
    
    def invalidate_team_data(self, team_id: int) -> int:
        """
        Invalidate all team-related cache data
        
        Args:
            team_id: Team ID to invalidate cache for
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            # Use pattern-based invalidation for team data (like we do for jobs)
            patterns = [
                f"henam:cache:team:*",       # All team cache entries
                f"henam:cache:dashboard:*",  # Dashboard data
                f"henam:cache:job:*",        # Jobs might be affected by team changes
            ]
            
            total_invalidated = 0
            
            for pattern in patterns:
                deleted_count = self.cache.invalidate_pattern(pattern)
                total_invalidated += deleted_count
                logger.debug(f"Pattern {pattern} invalidated {deleted_count} entries")
            
            logger.info(f"Invalidated {total_invalidated} cache entries for team {team_id}")
            return total_invalidated
            
        except Exception as e:
            logger.error(f"Error invalidating team cache {team_id}: {e}")
            return 0
    
    def invalidate_job_data(self, job_id: int) -> int:
        """
        Invalidate job-related cache data
        
        Args:
            job_id: Job ID to invalidate cache for
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            # Use pattern-based invalidation to catch all job-related cache entries
            # This includes entries with query parameter hashes
            patterns = [
                f"henam:cache:job:*",        # All job cache entries (includes query param hashes)
                f"henam:cache:dashboard:*",  # Dashboard data
                f"henam:cache:team:*"        # Team data (if job affects team stats)
            ]
            
            total_invalidated = 0
            
            for pattern in patterns:
                deleted_count = self.cache.invalidate_pattern(pattern)
                total_invalidated += deleted_count
                logger.debug(f"Pattern {pattern} invalidated {deleted_count} entries")
            
            logger.info(f"Invalidated {total_invalidated} cache entries for job {job_id}")
            return total_invalidated
            
        except Exception as e:
            logger.error(f"Error invalidating job cache {job_id}: {e}")
            return 0
    
    def invalidate_invoice_data(self, invoice_id: int) -> int:
        """
        Invalidate invoice-related cache data
        
        Args:
            invoice_id: Invoice ID to invalidate cache for
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            # Invalidate invoice-specific cache
            invoice_invalidated = self.invalidate_resource("invoice", str(invoice_id))
            
            # Invalidate related resources
            patterns = [
                f"henam:cache:invoice:*",    # Invoice list and detail caches
                f"henam:cache:dashboard:*",  # Dashboard data
                f"henam:cache:financial:*",  # Financial data
                f"henam:cache:job:*"         # Job caches (in case invoice was converted to job)
            ]
            
            total_invalidated = 1 if invoice_invalidated else 0
            
            for pattern in patterns:
                deleted_count = self.cache.invalidate_pattern(pattern)
                total_invalidated += deleted_count
            
            logger.info(f"Invalidated {total_invalidated} cache entries for invoice {invoice_id}")
            return total_invalidated
            
        except Exception as e:
            logger.error(f"Error invalidating invoice cache {invoice_id}: {e}")
            return 0
    
    def invalidate_dashboard_data(self, user_id: Optional[int] = None) -> int:
        """
        Invalidate dashboard cache data
        
        Args:
            user_id: Optional user ID for user-specific dashboard
            
        Returns:
            int: Number of keys invalidated
        """
        try:
            if user_id:
                # User-specific dashboard
                pattern = f"henam:cache:dashboard:*:user_{user_id}:*"
            else:
                # Global dashboard
                pattern = f"henam:cache:dashboard:*"
            
            deleted_count = self.cache.invalidate_pattern(pattern)
            
            if deleted_count > 0:
                logger.info(f"Invalidated {deleted_count} dashboard cache entries")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating dashboard cache: {e}")
            return 0
    
    def bulk_invalidate(self, operations: List[Dict[str, Any]]) -> int:
        """
        Perform bulk cache invalidation operations
        
        Args:
            operations: List of invalidation operations
                Each operation should have: {'type': 'resource|pattern|user', 'params': {...}}
            
        Returns:
            int: Total number of keys invalidated
        """
        total_invalidated = 0
        
        for operation in operations:
            try:
                op_type = operation.get('type')
                params = operation.get('params', {})
                
                if op_type == 'resource':
                    result = self.invalidate_resource(**params)
                    total_invalidated += 1 if result else 0
                
                elif op_type == 'pattern':
                    result = self.invalidate_resource_pattern(**params)
                    total_invalidated += result
                
                elif op_type == 'user':
                    result = self.invalidate_user_data(params.get('user_id'))
                    total_invalidated += result
                
                elif op_type == 'team':
                    result = self.invalidate_team_data(params.get('team_id'))
                    total_invalidated += result
                
                elif op_type == 'job':
                    result = self.invalidate_job_data(params.get('job_id'))
                    total_invalidated += result
                
                elif op_type == 'invoice':
                    result = self.invalidate_invoice_data(params.get('invoice_id'))
                    total_invalidated += result
                
                elif op_type == 'dashboard':
                    result = self.invalidate_dashboard_data(params.get('user_id'))
                    total_invalidated += result
                
            except Exception as e:
                logger.error(f"Error in bulk invalidation operation {operation}: {e}")
        
        logger.info(f"Bulk invalidation completed: {total_invalidated} keys invalidated")
        return total_invalidated
    
    def invalidate_all(self) -> bool:
        """
        Invalidate all cache entries (use with caution)
        
        Returns:
            bool: True if successful
        """
        try:
            result = self.cache.clear_all()
            if result:
                logger.warning("All cache entries have been invalidated")
            return result
        except Exception as e:
            logger.error(f"Error invalidating all cache: {e}")
            return False

# Global invalidation service instance
cache_invalidation = CacheInvalidationService()
