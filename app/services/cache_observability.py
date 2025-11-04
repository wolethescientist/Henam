"""
Cache Observability and Monitoring Service

This service provides comprehensive monitoring and observability for the cache system:
- Real-time metrics collection
- Performance monitoring
- Health checks
- Alerting capabilities
- Cache analytics
"""

import time
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from app.services.robust_cache_service import robust_cache

logger = logging.getLogger(__name__)

class CacheHealthMonitor:
    """Monitor cache system health and performance"""
    
    def __init__(self):
        self.cache = robust_cache
        self.health_checks = []
        self.performance_history = []
        self.max_history_size = 1000
    
    def check_redis_connection(self) -> Dict[str, Any]:
        """Check Redis connection health"""
        try:
            if not self.cache.redis_client:
                return {
                    "status": "unhealthy",
                    "error": "Redis client not available",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Test basic operations
            start_time = time.time()
            self.cache.redis_client.ping()
            ping_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Test set/get operation
            test_key = "health_check_test"
            test_value = "health_check_value"
            
            set_start = time.time()
            self.cache.redis_client.set(test_key, test_value, ex=10)
            set_time = (time.time() - set_start) * 1000
            
            get_start = time.time()
            retrieved_value = self.cache.redis_client.get(test_key)
            get_time = (time.time() - get_start) * 1000
            
            # Clean up test key
            self.cache.redis_client.delete(test_key)
            
            if retrieved_value != test_value:
                return {
                    "status": "unhealthy",
                    "error": "Redis read/write test failed",
                    "timestamp": datetime.now().isoformat()
                }
            
            return {
                "status": "healthy",
                "ping_time_ms": round(ping_time, 2),
                "set_time_ms": round(set_time, 2),
                "get_time_ms": round(get_time, 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def check_memory_usage(self) -> Dict[str, Any]:
        """Check Redis memory usage"""
        try:
            if not self.cache.redis_client:
                return {
                    "status": "unavailable",
                    "error": "Redis client not available",
                    "timestamp": datetime.now().isoformat()
                }
            
            info = self.cache.redis_client.info('memory')
            
            used_memory = info.get('used_memory', 0)
            used_memory_human = info.get('used_memory_human', '0B')
            max_memory = info.get('maxmemory', 0)
            max_memory_human = info.get('maxmemory_human', '0B')
            
            # Calculate memory usage percentage
            memory_usage_percent = 0
            if max_memory > 0:
                memory_usage_percent = (used_memory / max_memory) * 100
            
            # Determine status based on memory usage
            status = "healthy"
            if memory_usage_percent > 90:
                status = "critical"
            elif memory_usage_percent > 75:
                status = "warning"
            
            return {
                "status": status,
                "used_memory": used_memory,
                "used_memory_human": used_memory_human,
                "max_memory": max_memory,
                "max_memory_human": max_memory_human,
                "usage_percent": round(memory_usage_percent, 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def check_key_distribution(self) -> Dict[str, Any]:
        """Check cache key distribution and patterns"""
        try:
            if not self.cache.redis_client:
                return {
                    "status": "unavailable",
                    "error": "Redis client not available",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Get all cache keys
            all_keys = self.cache.redis_client.keys("henam:cache:*")
            
            # Analyze key patterns
            key_patterns = {}
            total_keys = len(all_keys)
            
            for key in all_keys:
                parts = key.split(':')
                if len(parts) >= 3:
                    resource_type = parts[2]
                    key_patterns[resource_type] = key_patterns.get(resource_type, 0) + 1
            
            # Calculate TTL distribution
            ttl_distribution = {}
            for key in all_keys[:100]:  # Sample first 100 keys
                ttl = self.cache.redis_client.ttl(key)
                if ttl > 0:
                    ttl_range = f"{((ttl // 60) * 60)}-{((ttl // 60) * 60) + 60}min"
                    ttl_distribution[ttl_range] = ttl_distribution.get(ttl_range, 0) + 1
            
            return {
                "status": "healthy",
                "total_keys": total_keys,
                "key_patterns": key_patterns,
                "ttl_distribution": ttl_distribution,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        health_results = {
            "overall_status": "healthy",
            "checks": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # Run individual health checks
        checks = [
            ("redis_connection", self.check_redis_connection),
            ("memory_usage", self.check_memory_usage),
            ("key_distribution", self.check_key_distribution)
        ]
        
        unhealthy_checks = 0
        
        for check_name, check_func in checks:
            result = check_func()
            health_results["checks"][check_name] = result
            
            if result.get("status") in ["unhealthy", "critical", "error"]:
                unhealthy_checks += 1
        
        # Determine overall status
        if unhealthy_checks > 0:
            health_results["overall_status"] = "unhealthy"
        
        return health_results

class CacheAnalytics:
    """Analytics and reporting for cache performance"""
    
    def __init__(self):
        self.cache = robust_cache
        self.analytics_data = []
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for the last N hours"""
        try:
            stats = self.cache.get_stats()
            
            # Calculate additional metrics
            total_requests = stats.get('hits', 0) + stats.get('misses', 0)
            hit_rate = stats.get('hit_rate_percent', 0)
            
            # Performance categories
            performance_category = "excellent"
            if hit_rate < 70:
                performance_category = "poor"
            elif hit_rate < 85:
                performance_category = "fair"
            elif hit_rate < 95:
                performance_category = "good"
            
            return {
                "total_requests": total_requests,
                "hit_rate_percent": hit_rate,
                "performance_category": performance_category,
                "cache_efficiency": self._calculate_cache_efficiency(stats),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting performance summary: {e}")
            return {"error": str(e)}
    
    def _calculate_cache_efficiency(self, stats: Dict[str, Any]) -> str:
        """Calculate cache efficiency rating"""
        hit_rate = stats.get('hit_rate_percent', 0)
        validation_failures = stats.get('validation_failures', 0)
        lock_timeouts = stats.get('lock_timeouts', 0)
        
        # Efficiency scoring
        efficiency_score = hit_rate
        
        # Penalize for validation failures
        if validation_failures > 0:
            efficiency_score -= min(validation_failures * 2, 20)
        
        # Penalize for lock timeouts
        if lock_timeouts > 0:
            efficiency_score -= min(lock_timeouts * 5, 30)
        
        # Categorize efficiency
        if efficiency_score >= 90:
            return "excellent"
        elif efficiency_score >= 75:
            return "good"
        elif efficiency_score >= 60:
            return "fair"
        else:
            return "poor"
    
    def get_resource_analytics(self) -> Dict[str, Any]:
        """Get analytics for different resource types"""
        try:
            if not self.cache.redis_client:
                return {"error": "Redis client not available"}
            
            # Get all cache keys
            all_keys = self.cache.redis_client.keys("henam:cache:*")
            
            resource_stats = {}
            
            for key in all_keys:
                parts = key.split(':')
                if len(parts) >= 3:
                    resource_type = parts[2]
                    
                    if resource_type not in resource_stats:
                        resource_stats[resource_type] = {
                            "count": 0,
                            "total_size": 0,
                            "avg_ttl": 0
                        }
                    
                    resource_stats[resource_type]["count"] += 1
                    
                    # Get key size
                    key_size = self.cache.redis_client.memory_usage(key)
                    resource_stats[resource_type]["total_size"] += key_size or 0
                    
                    # Get TTL
                    ttl = self.cache.redis_client.ttl(key)
                    if ttl > 0:
                        resource_stats[resource_type]["avg_ttl"] += ttl
            
            # Calculate averages
            for resource_type, stats in resource_stats.items():
                if stats["count"] > 0:
                    stats["avg_ttl"] = stats["avg_ttl"] / stats["count"]
                    stats["avg_size"] = stats["total_size"] / stats["count"]
            
            return {
                "resource_stats": resource_stats,
                "total_keys": len(all_keys),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting resource analytics: {e}")
            return {"error": str(e)}
    
    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get current alerts and warnings"""
        alerts = []
        
        try:
            stats = self.cache.get_stats()
            health = CacheHealthMonitor().run_health_checks()
            
            # Check hit rate
            hit_rate = stats.get('hit_rate_percent', 0)
            if hit_rate < 70:
                alerts.append({
                    "type": "warning",
                    "message": f"Low cache hit rate: {hit_rate}%",
                    "severity": "medium",
                    "timestamp": datetime.now().isoformat()
                })
            
            # Check validation failures
            validation_failures = stats.get('validation_failures', 0)
            if validation_failures > 10:
                alerts.append({
                    "type": "error",
                    "message": f"High number of validation failures: {validation_failures}",
                    "severity": "high",
                    "timestamp": datetime.now().isoformat()
                })
            
            # Check lock timeouts
            lock_timeouts = stats.get('lock_timeouts', 0)
            if lock_timeouts > 5:
                alerts.append({
                    "type": "warning",
                    "message": f"High number of lock timeouts: {lock_timeouts}",
                    "severity": "medium",
                    "timestamp": datetime.now().isoformat()
                })
            
            # Check memory usage
            memory_check = health.get('checks', {}).get('memory_usage', {})
            if memory_check.get('status') == 'critical':
                alerts.append({
                    "type": "critical",
                    "message": "Redis memory usage is critical",
                    "severity": "critical",
                    "timestamp": datetime.now().isoformat()
                })
            
            # Check Redis connection
            connection_check = health.get('checks', {}).get('redis_connection', {})
            if connection_check.get('status') == 'unhealthy':
                alerts.append({
                    "type": "critical",
                    "message": "Redis connection is unhealthy",
                    "severity": "critical",
                    "timestamp": datetime.now().isoformat()
                })
            
        except Exception as e:
            alerts.append({
                "type": "error",
                "message": f"Error generating alerts: {e}",
                "severity": "high",
                "timestamp": datetime.now().isoformat()
            })
        
        return alerts

class CacheObservabilityService:
    """Main observability service that combines all monitoring capabilities"""
    
    def __init__(self):
        self.health_monitor = CacheHealthMonitor()
        self.analytics = CacheAnalytics()
    
    def get_comprehensive_report(self) -> Dict[str, Any]:
        """Get comprehensive cache observability report"""
        try:
            # Get basic stats
            stats = self.cache.get_stats()
            
            # Get health checks
            health = self.health_monitor.run_health_checks()
            
            # Get performance summary
            performance = self.analytics.get_performance_summary()
            
            # Get resource analytics
            resource_analytics = self.analytics.get_resource_analytics()
            
            # Get alerts
            alerts = self.analytics.get_alerts()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": health.get('overall_status', 'unknown'),
                "stats": stats,
                "health": health,
                "performance": performance,
                "resource_analytics": resource_analytics,
                "alerts": alerts,
                "summary": self._generate_summary(stats, health, performance, alerts)
            }
            
        except Exception as e:
            logger.error(f"Error generating comprehensive report: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _generate_summary(self, stats: Dict, health: Dict, performance: Dict, alerts: List) -> Dict[str, Any]:
        """Generate a summary of the cache system status"""
        total_alerts = len(alerts)
        critical_alerts = len([a for a in alerts if a.get('severity') == 'critical'])
        
        return {
            "cache_status": "healthy" if health.get('overall_status') == 'healthy' else "unhealthy",
            "hit_rate": stats.get('hit_rate_percent', 0),
            "total_requests": stats.get('hits', 0) + stats.get('misses', 0),
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "recommendations": self._generate_recommendations(stats, health, performance, alerts)
        }
    
    def _generate_recommendations(self, stats: Dict, health: Dict, performance: Dict, alerts: List) -> List[str]:
        """Generate recommendations based on current status"""
        recommendations = []
        
        # Hit rate recommendations
        hit_rate = stats.get('hit_rate_percent', 0)
        if hit_rate < 70:
            recommendations.append("Consider increasing TTL values for frequently accessed data")
            recommendations.append("Review cache key patterns to ensure proper invalidation")
        
        # Memory recommendations
        memory_check = health.get('checks', {}).get('memory_usage', {})
        if memory_check.get('usage_percent', 0) > 80:
            recommendations.append("Consider increasing Redis memory limit")
            recommendations.append("Review and optimize cache key sizes")
        
        # Lock timeout recommendations
        lock_timeouts = stats.get('lock_timeouts', 0)
        if lock_timeouts > 5:
            recommendations.append("Consider increasing lock timeout values")
            recommendations.append("Review database query performance")
        
        # Validation failure recommendations
        validation_failures = stats.get('validation_failures', 0)
        if validation_failures > 10:
            recommendations.append("Review data validation logic")
            recommendations.append("Check for data corruption in source systems")
        
        return recommendations

# Global observability service instance
cache_observability = CacheObservabilityService()
