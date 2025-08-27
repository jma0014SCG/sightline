"""
Enhanced monitoring and health checks for FastAPI application.

Provides comprehensive health monitoring, resource tracking, and performance metrics.
"""

import time
import psutil
import asyncio
import asyncpg
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass
import os
import httpx
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Scope, Receive, Send
import sys

sys.path.insert(0, os.path.dirname(__file__))
from logging_config import get_logger
from utils.circuit_breaker import service_breakers

logger = get_logger(__name__)


@dataclass
class ResourceMetrics:
    """Container for resource usage metrics."""
    memory_usage_mb: float
    memory_percent: float
    cpu_percent: float
    disk_usage_percent: float
    connection_pool_size: int
    active_connections: int
    timestamp: datetime


class FastAPIMonitoring:
    """Enhanced monitoring for FastAPI application."""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.total_request_time = 0
        self.resource_alerts = []
        self.health_check_results = {}
        
        # Thresholds
        self.memory_threshold = 80  # percent
        self.cpu_threshold = 90  # percent
        self.connection_threshold = 90  # percent of pool
        
    async def get_resource_metrics(self, progress_storage=None) -> ResourceMetrics:
        """Get current resource usage metrics."""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        # Get database pool stats if available
        pool_size = 0
        active_connections = 0
        
        if progress_storage and hasattr(progress_storage, 'pool') and progress_storage.pool:
            pool_size = progress_storage.pool._maxsize if hasattr(progress_storage.pool, '_maxsize') else 0
            active_connections = len(progress_storage.pool._holders) if hasattr(progress_storage.pool, '_holders') else 0
        
        return ResourceMetrics(
            memory_usage_mb=round(memory_info.rss / 1024 / 1024, 2),
            memory_percent=process.memory_percent(),
            cpu_percent=process.cpu_percent(interval=0.1),
            disk_usage_percent=psutil.disk_usage('/').percent,
            connection_pool_size=pool_size,
            active_connections=active_connections,
            timestamp=datetime.utcnow()
        )
    
    async def check_resource_thresholds(self, progress_storage=None) -> Dict[str, Any]:
        """Check resource usage against thresholds."""
        metrics = await self.get_resource_metrics(progress_storage)
        alerts = []
        
        # Memory threshold
        if metrics.memory_percent > self.memory_threshold:
            alert = f"High memory usage: {metrics.memory_percent:.1f}%"
            logger.warning(f"🚨 {alert}")
            alerts.append(alert)
        
        # CPU threshold
        if metrics.cpu_percent > self.cpu_threshold:
            alert = f"High CPU usage: {metrics.cpu_percent:.1f}%"
            logger.warning(f"🚨 {alert}")
            alerts.append(alert)
        
        # Connection pool threshold
        if metrics.connection_pool_size > 0:
            pool_usage_percent = (metrics.active_connections / metrics.connection_pool_size) * 100
            if pool_usage_percent > self.connection_threshold:
                alert = f"High database connection usage: {pool_usage_percent:.1f}%"
                logger.warning(f"🚨 {alert}")
                alerts.append(alert)
        
        return {
            "metrics": {
                "memory_mb": metrics.memory_usage_mb,
                "memory_percent": metrics.memory_percent,
                "cpu_percent": metrics.cpu_percent,
                "disk_percent": metrics.disk_usage_percent,
                "db_connections": f"{metrics.active_connections}/{metrics.connection_pool_size}"
            },
            "alerts": alerts,
            "timestamp": metrics.timestamp.isoformat()
        }
    
    async def check_database_health(self, db_url: str) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        start_time = time.time()
        
        try:
            # Parse connection string
            from services.progress_storage import parse_database_url
            conn_params = parse_database_url(db_url)
            
            # Test connection
            conn = await asyncpg.connect(**conn_params)
            
            # Run simple query
            result = await conn.fetchval("SELECT 1")
            
            # Get database stats
            db_stats = await conn.fetchrow("""
                SELECT 
                    numbackends as connections,
                    xact_commit as commits,
                    xact_rollback as rollbacks,
                    blks_read as blocks_read,
                    blks_hit as blocks_hit
                FROM pg_stat_database 
                WHERE datname = current_database()
            """)
            
            await conn.close()
            
            response_time = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "connections": db_stats['connections'] if db_stats else 0,
                "cache_hit_ratio": round(
                    (db_stats['blocks_hit'] / max(db_stats['blocks_hit'] + db_stats['blocks_read'], 1)) * 100, 2
                ) if db_stats else 0
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": round((time.time() - start_time) * 1000, 2)
            }
    
    async def check_external_services(self) -> Dict[str, Any]:
        """Check health of external services."""
        services = {
            "youtube": "https://www.googleapis.com/youtube/v3/videos?part=id&id=test",
            "openai": "https://api.openai.com/v1/models"
        }
        
        results = {}
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            for name, url in services.items():
                start_time = time.time()
                
                try:
                    # Add API key for OpenAI
                    headers = {}
                    if name == "openai" and os.getenv("OPENAI_API_KEY"):
                        headers["Authorization"] = f"Bearer {os.getenv('OPENAI_API_KEY')}"
                    
                    response = await client.get(url, headers=headers)
                    response_time = (time.time() - start_time) * 1000
                    
                    results[name] = {
                        "status": "healthy" if response.status_code < 500 else "degraded",
                        "response_code": response.status_code,
                        "response_time_ms": round(response_time, 2)
                    }
                    
                except Exception as e:
                    results[name] = {
                        "status": "unhealthy",
                        "error": str(e),
                        "response_time_ms": round((time.time() - start_time) * 1000, 2)
                    }
        
        return results
    
    async def get_comprehensive_health(self, progress_storage=None) -> Dict[str, Any]:
        """Get comprehensive health status."""
        # Application metrics
        uptime_seconds = time.time() - self.start_time
        avg_request_time = self.total_request_time / max(self.request_count, 1)
        
        # Resource metrics
        resources = await self.check_resource_thresholds(progress_storage)
        
        # Database health
        db_health = await self.check_database_health(os.getenv("DATABASE_URL", ""))
        
        # External services
        external_services = await self.check_external_services()
        
        # Circuit breaker status
        circuit_breakers = service_breakers.get_all_stats()
        
        # Determine overall status
        overall_status = "healthy"
        if resources.get("alerts"):
            overall_status = "degraded"
        if db_health.get("status") == "unhealthy":
            overall_status = "unhealthy"
        if any(cb["state"] == "open" for cb in circuit_breakers.values()):
            overall_status = "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": round(uptime_seconds, 2),
            "version": "1.0.0",
            "metrics": {
                "requests": {
                    "total": self.request_count,
                    "errors": self.error_count,
                    "error_rate": round(self.error_count / max(self.request_count, 1), 4),
                    "avg_response_time_ms": round(avg_request_time * 1000, 2)
                },
                "resources": resources["metrics"],
                "alerts": resources["alerts"]
            },
            "dependencies": {
                "database": db_health,
                "external_services": external_services,
                "circuit_breakers": circuit_breakers
            }
        }
    
    def record_request(self, duration: float, status_code: int):
        """Record request metrics."""
        self.request_count += 1
        self.total_request_time += duration
        
        if status_code >= 500:
            self.error_count += 1


class ResourceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring resource usage."""
    
    def __init__(self, app: ASGIApp, monitoring: FastAPIMonitoring):
        super().__init__(app)
        self.monitoring = monitoring
    
    async def dispatch(self, request: Request, call_next):
        """Monitor resources during request processing."""
        start_time = time.time()
        
        # Check resources before processing (only on health endpoints)
        if request.url.path.startswith("/api/health"):
            await self.monitoring.check_resource_thresholds()
        
        # Process request
        response = await call_next(request)
        
        # Record metrics
        duration = time.time() - start_time
        self.monitoring.record_request(duration, response.status_code)
        
        # Add monitoring headers
        response.headers["X-Response-Time"] = str(round(duration * 1000, 2))
        response.headers["X-Request-ID"] = request.state.correlation_id if hasattr(request.state, 'correlation_id') else ""
        
        return response


# Global monitoring instance
monitoring = FastAPIMonitoring()


def setup_monitoring(app: FastAPI):
    """Setup monitoring for FastAPI application."""
    app.add_middleware(ResourceMonitoringMiddleware, monitoring=monitoring)
    
    # Add health endpoints
    @app.get("/api/health/detailed")
    async def detailed_health():
        """Detailed health check with all metrics."""
        from services.progress_storage import progress_storage
        return await monitoring.get_comprehensive_health(progress_storage)
    
    @app.get("/api/health/resources")
    async def resource_health():
        """Resource usage health check."""
        from services.progress_storage import progress_storage
        return await monitoring.check_resource_thresholds(progress_storage)
    
    @app.get("/api/health/database")
    async def database_health():
        """Database connectivity health check."""
        return await monitoring.check_database_health(os.getenv("DATABASE_URL", ""))
    
    @app.get("/api/health/circuit-breakers")
    async def circuit_breaker_health():
        """Circuit breaker status."""
        return service_breakers.get_all_stats()
    
    logger.info("✅ Enhanced monitoring setup complete")