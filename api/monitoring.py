"""
Monitoring and observability module for Sightline FastAPI backend.
Integrates with Sentry for error tracking and performance monitoring.
"""

import os
import time
import logging
import traceback
from typing import Optional, Dict, Any
from contextlib import contextmanager

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FastAPIMonitoring:
    """Monitoring service for FastAPI backend."""
    
    def __init__(self):
        self.sentry_enabled = False
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        
        # Initialize Sentry if available and configured
        self._init_sentry()
    
    def _init_sentry(self):
        """Initialize Sentry SDK if available."""
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.starlette import StarletteIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
            
            sentry_dsn = os.getenv('NEXT_PUBLIC_SENTRY_DSN') or os.getenv('SENTRY_DSN')
            
            if sentry_dsn:
                sentry_sdk.init(
                    dsn=sentry_dsn,
                    traces_sample_rate=0.1,
                    profiles_sample_rate=0.1,
                    environment=os.getenv('NODE_ENV', 'development'),
                    release=os.getenv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'),
                    integrations=[
                        FastApiIntegration(auto_session_tracking=True),
                        StarletteIntegration(auto_session_tracking=True),
                        SqlAlchemyIntegration(),
                    ],
                    before_send=self._filter_sentry_events,
                )
                self.sentry_enabled = True
                logger.info("✅ Sentry monitoring initialized for FastAPI")
            else:
                logger.info("⚠️  Sentry DSN not found - monitoring disabled")
        except ImportError:
            logger.info("⚠️  Sentry SDK not installed - error tracking disabled")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Sentry: {e}")
    
    def _filter_sentry_events(self, event, hint):
        """Filter Sentry events before sending."""
        # Don't send health check errors
        if event.get('request', {}).get('url', '').endswith('/health'):
            return None
        
        # Add custom tags
        event['tags'] = {
            **event.get('tags', {}),
            'service': 'fastapi-backend',
            'api_version': '1.0.0',
        }
        
        return event
    
    @contextmanager
    def track_operation(self, operation_name: str, context: Optional[Dict[str, Any]] = None):
        """Context manager to track operation performance and errors."""
        start_time = time.time()
        self.request_count += 1
        
        try:
            if self.sentry_enabled:
                import sentry_sdk
                with sentry_sdk.configure_scope() as scope:
                    scope.set_tag("operation", operation_name)
                    if context:
                        for key, value in context.items():
                            scope.set_tag(key, str(value))
            
            yield
            
            # Log successful operation
            duration = (time.time() - start_time) * 1000  # Convert to ms
            logger.info(f"✅ {operation_name} completed in {duration:.2f}ms")
            
            # Track performance metrics
            self.track_performance_metric(operation_name, duration, context)
            
        except Exception as e:
            # Log error
            duration = (time.time() - start_time) * 1000
            self.error_count += 1
            
            logger.error(f"❌ {operation_name} failed after {duration:.2f}ms: {str(e)}")
            
            # Send to Sentry with context
            if self.sentry_enabled:
                import sentry_sdk
                with sentry_sdk.configure_scope() as scope:
                    scope.set_tag("operation", operation_name)
                    scope.set_tag("duration_ms", int(duration))
                    if context:
                        scope.set_context("operation_context", context)
                    sentry_sdk.capture_exception(e)
            
            raise
    
    def track_performance_metric(self, operation: str, duration_ms: float, context: Optional[Dict[str, Any]] = None):
        """Track performance metrics."""
        # Log performance metrics
        if duration_ms > 30000:  # 30 seconds
            logger.warning(f"🐌 Slow operation: {operation} took {duration_ms:.2f}ms")
        elif duration_ms > 10000:  # 10 seconds
            logger.info(f"⏳ Long operation: {operation} took {duration_ms:.2f}ms")
        
        # In production, you'd send these to your metrics system
        # Examples: StatsD, Prometheus, CloudWatch, etc.
        
    def track_business_metric(self, metric_name: str, value: float, context: Optional[Dict[str, Any]] = None):
        """Track business-specific metrics."""
        logger.info(f"📊 Business metric - {metric_name}: {value}")
        
        # Track summary creation metrics
        if metric_name == 'summary_creation_time':
            video_length = context.get('video_length', 0) if context else 0
            if video_length > 0:
                efficiency_ratio = duration_ms / video_length
                logger.info(f"📈 Summary efficiency ratio: {efficiency_ratio:.2f} (processing_time/video_length)")
        
        # Send to monitoring system
        if self.sentry_enabled:
            import sentry_sdk
            sentry_sdk.capture_message(
                f"Business metric: {metric_name} = {value}",
                level='info',
                extras=context or {}
            )
    
    def log_transcript_service_usage(self, service_name: str, success: bool, duration_ms: float, video_id: str):
        """Track transcript service performance and reliability."""
        status = "success" if success else "failure"
        logger.info(f"📝 Transcript service [{service_name}] {status} for {video_id} in {duration_ms:.2f}ms")
        
        # Track service reliability
        if not success:
            logger.warning(f"⚠️  Transcript service {service_name} failed for video {video_id}")
    
    def log_ai_processing(self, model: str, tokens_used: int, duration_ms: float, context: Optional[Dict[str, Any]] = None):
        """Track AI processing metrics (OpenAI, etc.)."""
        cost_estimate = tokens_used * 0.00002  # Rough estimate for GPT-4
        
        logger.info(f"🤖 AI Processing - Model: {model}, Tokens: {tokens_used}, Duration: {duration_ms:.2f}ms, Est. Cost: ${cost_estimate:.4f}")
        
        if self.sentry_enabled:
            import sentry_sdk
            with sentry_sdk.configure_scope() as scope:
                scope.set_tag("ai_model", model)
                scope.set_tag("tokens_used", tokens_used)
                scope.set_context("ai_processing", {
                    "model": model,
                    "tokens": tokens_used,
                    "duration_ms": duration_ms,
                    "estimated_cost": cost_estimate,
                    **(context or {})
                })
    
    def get_health_metrics(self) -> Dict[str, Any]:
        """Get basic health and performance metrics."""
        uptime = time.time() - self.start_time
        
        return {
            "status": "healthy",
            "uptime_seconds": int(uptime),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": (self.error_count / max(self.request_count, 1)) * 100,
            "sentry_enabled": self.sentry_enabled,
            "service": "sightline-fastapi",
            "version": "1.0.0"
        }
    
    def capture_exception(self, error: Exception, context: Optional[Dict[str, Any]] = None):
        """Manually capture an exception with context."""
        logger.error(f"Exception captured: {str(error)}")
        logger.error(traceback.format_exc())
        
        if self.sentry_enabled:
            import sentry_sdk
            with sentry_sdk.configure_scope() as scope:
                if context:
                    scope.set_context("error_context", context)
                sentry_sdk.capture_exception(error)

# Global monitoring instance
monitoring = FastAPIMonitoring()

# Convenience functions
def track_operation(operation_name: str, context: Optional[Dict[str, Any]] = None):
    """Decorator/context manager for tracking operations."""
    return monitoring.track_operation(operation_name, context)

def track_business_metric(metric_name: str, value: float, context: Optional[Dict[str, Any]] = None):
    """Track business metric."""
    return monitoring.track_business_metric(metric_name, value, context)

def log_ai_processing(model: str, tokens_used: int, duration_ms: float, context: Optional[Dict[str, Any]] = None):
    """Log AI processing metrics."""
    return monitoring.log_ai_processing(model, tokens_used, duration_ms, context)

def capture_exception(error: Exception, context: Optional[Dict[str, Any]] = None):
    """Capture exception with context."""
    return monitoring.capture_exception(error, context)

def get_health_metrics():
    """Get health metrics."""
    return monitoring.get_health_metrics()