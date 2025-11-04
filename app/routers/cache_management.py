"""
Cache Management API Router

This router provides endpoints for:
- Cache statistics and monitoring
- Health checks
- Manual cache operations
- Performance analytics
- Cache invalidation
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, Dict, Any, List
from app.auth import get_current_user
from app.models import User
from app.services.robust_cache_service import robust_cache
from app.services.cache_invalidation import cache_invalidation
from app.services.cache_observability import cache_observability
from app.exceptions import DatabaseError, ValidationError
from app.utils.error_handler import ErrorHandler
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cache", tags=["Cache Management"])

@router.get("/stats")
async def get_cache_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive cache statistics and metrics
    """
    try:
        stats = robust_cache.get_stats()
        return {
            "success": True,
            "data": stats,
            "timestamp": stats.get("timestamp")
        }
    except Exception as e:
        logger.error(f"Error getting cache stats", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve cache statistics",
            operation="get_cache_stats",
            context={"error_type": type(e).__name__}
        )

@router.get("/health")
async def get_cache_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get cache system health status
    """
    try:
        health_report = cache_observability.health_monitor.run_health_checks()
        return {
            "success": True,
            "data": health_report
        }
    except Exception as e:
        logger.error(f"Error getting cache health", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve cache health information",
            operation="get_cache_health",
            context={"error_type": type(e).__name__}
        )

@router.get("/analytics")
async def get_cache_analytics(
    hours: int = Query(24, description="Number of hours to analyze"),
    current_user: User = Depends(get_current_user)
):
    """
    Get cache performance analytics
    """
    try:
        performance = cache_observability.analytics.get_performance_summary(hours)
        resource_analytics = cache_observability.analytics.get_resource_analytics()
        
        return {
            "success": True,
            "data": {
                "performance": performance,
                "resource_analytics": resource_analytics
            }
        }
    except Exception as e:
        logger.error(f"Error getting cache analytics", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve cache analytics",
            operation="get_cache_analytics",
            context={"error_type": type(e).__name__}
        )

@router.get("/alerts")
async def get_cache_alerts(
    current_user: User = Depends(get_current_user)
):
    """
    Get current cache alerts and warnings
    """
    try:
        alerts = cache_observability.analytics.get_alerts()
        return {
            "success": True,
            "data": alerts
        }
    except Exception as e:
        logger.error(f"Error getting cache alerts", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieving cache alerts",
            operation="getting_cache_alerts",
            context={"error_type": type(e).__name__}
        )

@router.get("/report")
async def get_comprehensive_report(
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive cache observability report
    """
    try:
        report = cache_observability.get_comprehensive_report()
        return {
            "success": True,
            "data": report
        }
    except Exception as e:
        logger.error(f"Error getting comprehensive report", exc_info=True)
        raise DatabaseError(
            detail="Failed to generating comprehensive report",
            operation="getting_comprehensive_report",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/resource")
async def invalidate_resource(
    resource_type: str,
    resource_id: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate specific resource cache
    """
    try:
        result = cache_invalidation.invalidate_resource(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id
        )
        
        return {
            "success": result,
            "message": f"Resource {resource_type}:{resource_id} {'invalidated' if result else 'not found'}"
        }
    except Exception as e:
        logger.error(f"Error invalidating resource", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating resource",
            operation="invalidating_resource",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/pattern")
async def invalidate_pattern(
    resource_type: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate all cache entries matching a pattern
    """
    try:
        deleted_count = cache_invalidation.invalidate_resource_pattern(
            resource_type=resource_type,
            user_id=user_id
        )
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for {resource_type}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating pattern", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating pattern",
            operation="invalidating_pattern",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/user/{user_id}")
async def invalidate_user_cache(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate all user-specific cache data
    """
    try:
        deleted_count = cache_invalidation.invalidate_user_data(user_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for user {user_id}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating user cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating user cache",
            operation="invalidating_user_cache",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/team/{team_id}")
async def invalidate_team_cache(
    team_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate all team-related cache data
    """
    try:
        deleted_count = cache_invalidation.invalidate_team_data(team_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for team {team_id}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating team cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating team cache",
            operation="invalidating_team_cache",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/job/{job_id}")
async def invalidate_job_cache(
    job_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate job-related cache data
    """
    try:
        deleted_count = cache_invalidation.invalidate_job_data(job_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for job {job_id}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating job cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating job cache",
            operation="invalidating_job_cache",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/invoice/{invoice_id}")
async def invalidate_invoice_cache(
    invoice_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate invoice-related cache data
    """
    try:
        deleted_count = cache_invalidation.invalidate_invoice_data(invoice_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for invoice {invoice_id}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating invoice cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating invoice cache",
            operation="invalidating_invoice_cache",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/dashboard")
async def invalidate_dashboard_cache(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate dashboard cache data
    """
    try:
        deleted_count = cache_invalidation.invalidate_dashboard_data(user_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} dashboard cache entries",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error invalidating dashboard cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to invalidating dashboard cache",
            operation="invalidating_dashboard_cache",
            context={"error_type": type(e).__name__}
        )

@router.post("/invalidate/bulk")
async def bulk_invalidate(
    operations: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user)
):
    """
    Perform bulk cache invalidation operations
    
    Example operations:
    [
        {"type": "resource", "params": {"resource_type": "user", "resource_id": "123"}},
        {"type": "pattern", "params": {"resource_type": "team"}},
        {"type": "user", "params": {"user_id": 123}}
    ]
    """
    try:
        total_invalidated = cache_invalidation.bulk_invalidate(operations)
        
        return {
            "success": True,
            "message": f"Bulk invalidation completed: {total_invalidated} keys invalidated",
            "total_invalidated": total_invalidated
        }
    except Exception as e:
        logger.error(f"Error in bulk invalidation", exc_info=True)
        raise DatabaseError(
            detail="Failed to in bulk invalidation",
            operation="in_bulk_invalidation",
            context={"error_type": type(e).__name__}
        )

@router.post("/clear")
async def clear_all_cache(
    current_user: User = Depends(get_current_user)
):
    """
    Clear all cache entries (use with caution)
    """
    try:
        result = cache_invalidation.invalidate_all()
        
        return {
            "success": result,
            "message": "All cache entries cleared" if result else "Failed to clear cache"
        }
    except Exception as e:
        logger.error(f"Error clearing all cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to clear cache",
            operation="clear_all_cache",
            context={"error_type": type(e).__name__}
        )

@router.get("/keys")
async def get_cache_keys(
    pattern: str = Query("henam:cache:*", description="Redis pattern to match keys"),
    limit: int = Query(100, description="Maximum number of keys to return"),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of cache keys matching pattern
    """
    try:
        if not robust_cache.redis_client:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        keys = robust_cache.redis_client.keys(pattern)
        
        # Limit results
        if len(keys) > limit:
            keys = keys[:limit]
        
        # Get additional info for each key
        key_info = []
        for key in keys:
            ttl = robust_cache.redis_client.ttl(key)
            key_type = robust_cache.redis_client.type(key)
            key_info.append({
                "key": key,
                "ttl": ttl,
                "type": key_type
            })
        
        return {
            "success": True,
            "data": {
                "keys": key_info,
                "total_found": len(keys),
                "returned": len(key_info)
            }
        }
    except Exception as e:
        logger.error(f"Error getting cache keys", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieving cache keys",
            operation="getting_cache_keys",
            context={"error_type": type(e).__name__}
        )

@router.get("/refresh-endpoint")
async def get_refresh_endpoint(
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get a refresh endpoint URL for force refreshing specific cache
    """
    try:
        # Create cache key
        cache_key = robust_cache._create_cache_key(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id
        )
        
        # Generate refresh URL
        refresh_url = f"/api/cache/refresh?resource_type={resource_type}"
        if resource_id:
            refresh_url += f"&resource_id={resource_id}"
        if user_id:
            refresh_url += f"&user_id={user_id}"
        
        return {
            "success": True,
            "data": {
                "cache_key": cache_key,
                "refresh_url": refresh_url,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "user_id": user_id
            }
        }
    except Exception as e:
        logger.error(f"Error generating refresh endpoint", exc_info=True)
        raise DatabaseError(
            detail="Failed to generating refresh endpoint",
            operation="generating_refresh_endpoint",
            context={"error_type": type(e).__name__}
        )

@router.post("/refresh")
async def force_refresh_cache(
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Force refresh specific cache entry
    """
    try:
        # Create cache key
        cache_key = robust_cache._create_cache_key(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id
        )
        
        # Delete the cache entry
        deleted = robust_cache.delete(cache_key)
        
        return {
            "success": True,
            "message": f"Cache entry {'deleted' if deleted else 'not found'} for {resource_type}",
            "cache_key": cache_key
        }
    except Exception as e:
        logger.error(f"Error force refreshing cache", exc_info=True)
        raise DatabaseError(
            detail="Failed to force refreshing cache",
            operation="force_refreshing_cache",
            context={"error_type": type(e).__name__}
        )
