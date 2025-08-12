"""
Correlation ID middleware for FastAPI
"""

import uuid
from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from logging_config import (
    set_correlation_context,
    clear_correlation_context,
    get_logger
)

logger = get_logger(__name__)

class CorrelationMiddleware(BaseHTTPMiddleware):
    """Middleware to handle correlation IDs across requests"""
    
    CORRELATION_HEADER = "x-correlation-id"
    REQUEST_ID_HEADER = "x-request-id"
    TASK_ID_HEADER = "x-task-id"
    USER_ID_HEADER = "x-user-id"
    
    async def dispatch(self, request: Request, call_next):
        # Extract or generate correlation ID
        correlation_id = request.headers.get(self.CORRELATION_HEADER)
        if not correlation_id:
            correlation_id = f"api-{uuid.uuid4()}"
        
        # Generate request ID
        request_id = request.headers.get(self.REQUEST_ID_HEADER)
        if not request_id:
            request_id = f"req-{uuid.uuid4()}"
        
        # Extract optional IDs
        task_id = request.headers.get(self.TASK_ID_HEADER)
        user_id = request.headers.get(self.USER_ID_HEADER)
        
        # Set correlation context for logging
        set_correlation_context(
            correlation_id=correlation_id,
            request_id=request_id,
            task_id=task_id,
            user_id=user_id
        )
        
        # Store in request state for access in endpoints
        request.state.correlation_id = correlation_id
        request.state.request_id = request_id
        request.state.task_id = task_id
        request.state.user_id = user_id
        
        # Log request start
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params),
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add correlation headers to response
            response.headers[self.CORRELATION_HEADER] = correlation_id
            response.headers[self.REQUEST_ID_HEADER] = request_id
            if task_id:
                response.headers[self.TASK_ID_HEADER] = task_id
            
            # Log request completion
            logger.info(
                f"Request completed: {request.method} {request.url.path}",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
            )
            
            return response
            
        except Exception as e:
            # Log error
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                error=e,
                method=request.method,
                path=request.url.path,
            )
            raise
        finally:
            # Clear correlation context
            clear_correlation_context()

def extract_correlation_id(request: Request) -> str:
    """Extract correlation ID from request"""
    if hasattr(request.state, 'correlation_id'):
        return request.state.correlation_id
    return request.headers.get('x-correlation-id', f"api-{uuid.uuid4()}")

def extract_task_id(request: Request) -> Optional[str]:
    """Extract task ID from request"""
    if hasattr(request.state, 'task_id'):
        return request.state.task_id
    return request.headers.get('x-task-id')