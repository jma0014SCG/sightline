"""Health check endpoints for monitoring and deployment validation."""

from datetime import datetime, timezone
from typing import Dict, Any
import asyncio
import psutil
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import get_settings
from ..services.youtube_service import YouTubeService
from ..services.gumloop_service import GumloopService

router = APIRouter(tags=["health"])

class HealthStatus(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    version: str = "1.0.0"
    environment: str
    checks: Dict[str, Any] = {}

class ReadinessStatus(BaseModel):
    """Readiness check response model."""
    ready: bool
    timestamp: str
    services: Dict[str, bool]
    details: Dict[str, Any] = {}

@router.get("/health", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    """
    Basic health check endpoint.
    Returns 200 if the service is running.
    """
    settings = get_settings()
    
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=settings.ENVIRONMENT,
        checks={
            "api": "operational",
            "memory_usage_mb": round(psutil.Process().memory_info().rss / 1024 / 1024, 2),
            "cpu_percent": psutil.cpu_percent(interval=0.1)
        }
    )

@router.get("/health/ready", response_model=ReadinessStatus)
async def readiness_check() -> ReadinessStatus:
    """
    Readiness check endpoint.
    Verifies that all required services are accessible.
    """
    settings = get_settings()
    services_status = {}
    details = {}
    
    # Check YouTube service
    try:
        youtube_service = YouTubeService()
        # Simple check - just verify the service initializes
        services_status["youtube"] = True
        details["youtube"] = "Service initialized"
    except Exception as e:
        services_status["youtube"] = False
        details["youtube"] = str(e)
    
    # Check Gumloop service (if API key is configured)
    if settings.GUMLOOP_API_KEY:
        try:
            gumloop_service = GumloopService()
            services_status["gumloop"] = True
            details["gumloop"] = "Service initialized"
        except Exception as e:
            services_status["gumloop"] = False
            details["gumloop"] = str(e)
    else:
        services_status["gumloop"] = False
        details["gumloop"] = "API key not configured"
    
    # Check OpenAI configuration
    services_status["openai"] = bool(settings.OPENAI_API_KEY)
    details["openai"] = "API key configured" if services_status["openai"] else "API key not configured"
    
    # Overall readiness
    ready = services_status.get("youtube", False) and services_status.get("openai", False)
    
    return ReadinessStatus(
        ready=ready,
        timestamp=datetime.now(timezone.utc).isoformat(),
        services=services_status,
        details=details
    )

@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check endpoint.
    Returns 200 if the service is alive and can handle requests.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health/startup")
async def startup_check() -> Dict[str, Any]:
    """
    Startup check endpoint.
    Used by orchestrators to determine if the service has started successfully.
    """
    settings = get_settings()
    
    return {
        "status": "started",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "python_api_url": settings.API_BASE_URL
    }