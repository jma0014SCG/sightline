"""
Circuit Breaker pattern implementation for resilient external service calls.

This helps prevent cascading failures when external services are down or slow.
"""

import asyncio
from enum import Enum
from datetime import datetime, timedelta
from typing import Callable, Any, Optional
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from logging_config import get_logger

logger = get_logger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, calls fail fast
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker implementation for external service calls.
    
    Usage:
        breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        result = await breaker.call(external_service_function, arg1, arg2)
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "circuit"
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting reset
            expected_exception: Exception type to track
            name: Name for logging purposes
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        self.success_count = 0
        self.total_calls = 0
        
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            Exception: If circuit is open or function fails
        """
        self.total_calls += 1
        
        # Check circuit state
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit {self.name} attempting reset (HALF_OPEN)")
            else:
                logger.warning(f"Circuit {self.name} is OPEN, failing fast")
                raise Exception(f"Circuit breaker {self.name} is OPEN")
        
        try:
            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure()
            raise e
            
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if not self.last_failure_time:
            return False
            
        time_since_failure = datetime.now() - self.last_failure_time
        return time_since_failure.seconds >= self.recovery_timeout
        
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        self.success_count += 1
        
        if self.state == CircuitState.HALF_OPEN:
            logger.info(f"Circuit {self.name} recovered, closing circuit")
            
        self.state = CircuitState.CLOSED
        
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        logger.warning(f"Circuit {self.name} failure {self.failure_count}/{self.failure_threshold}")
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(f"Circuit {self.name} opened after {self.failure_count} failures")
            
    def get_stats(self) -> dict:
        """Get circuit breaker statistics."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "total_calls": self.total_calls,
            "failure_rate": self.failure_count / max(self.total_calls, 1),
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None
        }
        
    def reset(self):
        """Manually reset circuit breaker."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.total_calls = 0
        self.last_failure_time = None
        logger.info(f"Circuit {self.name} manually reset")


class ServiceCircuitBreakers:
    """
    Manages circuit breakers for multiple services.
    """
    
    def __init__(self):
        self.breakers = {
            "youtube": CircuitBreaker(failure_threshold=3, recovery_timeout=30, name="youtube"),
            "openai": CircuitBreaker(failure_threshold=2, recovery_timeout=60, name="openai"),
            "gumloop": CircuitBreaker(failure_threshold=2, recovery_timeout=45, name="gumloop"),
            "database": CircuitBreaker(failure_threshold=5, recovery_timeout=20, name="database"),
        }
        
    def get(self, service_name: str) -> CircuitBreaker:
        """Get circuit breaker for a service."""
        if service_name not in self.breakers:
            # Create default breaker if not exists
            self.breakers[service_name] = CircuitBreaker(name=service_name)
        return self.breakers[service_name]
        
    def get_all_stats(self) -> dict:
        """Get statistics for all circuit breakers."""
        return {
            name: breaker.get_stats()
            for name, breaker in self.breakers.items()
        }
        
    def reset_all(self):
        """Reset all circuit breakers."""
        for breaker in self.breakers.values():
            breaker.reset()
            

# Global instance for shared use
service_breakers = ServiceCircuitBreakers()