import time
import logging
from functools import wraps
from typing import Callable, Any
from contextlib import contextmanager
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Performance monitoring utilities."""
    
    @staticmethod
    def monitor_query_time(threshold_seconds: float = 1.0):
        """
        Decorator to monitor database query execution time.
        
        Args:
            threshold_seconds: Log queries that take longer than this threshold
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                if execution_time > threshold_seconds:
                    logger.warning(
                        f"Slow query detected: {func.__name__} took {execution_time:.2f}s "
                        f"(threshold: {threshold_seconds}s)"
                    )
                elif settings.debug:
                    logger.info(f"Query {func.__name__} executed in {execution_time:.2f}s")
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def monitor_api_response_time(threshold_seconds: float = 2.0):
        """
        Decorator to monitor API endpoint response time.
        
        Args:
            threshold_seconds: Log endpoints that take longer than this threshold
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                if execution_time > threshold_seconds:
                    logger.warning(
                        f"Slow API endpoint: {func.__name__} took {execution_time:.2f}s "
                        f"(threshold: {threshold_seconds}s)"
                    )
                elif settings.debug:
                    logger.info(f"API {func.__name__} responded in {execution_time:.2f}s")
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    @contextmanager
    def measure_time(operation_name: str, threshold_seconds: float = 1.0):
        """
        Context manager to measure execution time of code blocks.
        
        Args:
            operation_name: Name of the operation being measured
            threshold_seconds: Log if operation takes longer than this threshold
        """
        start_time = time.time()
        try:
            yield
        finally:
            execution_time = time.time() - start_time
            if execution_time > threshold_seconds:
                logger.warning(
                    f"Slow operation: {operation_name} took {execution_time:.2f}s "
                    f"(threshold: {threshold_seconds}s)"
                )
            elif settings.debug:
                logger.info(f"Operation {operation_name} completed in {execution_time:.2f}s")

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# Convenience decorators
monitor_query_time = performance_monitor.monitor_query_time
monitor_api_response_time = performance_monitor.monitor_api_response_time
