"""
Structured logging configuration for FastAPI backend
"""

import logging
import json
import sys
import time
from typing import Dict, Any, Optional
from datetime import datetime
from contextvars import ContextVar

# Context variables for correlation tracking
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
task_id_var: ContextVar[Optional[str]] = ContextVar('task_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)

class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Base log entry
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'component': record.name,
            'message': record.getMessage(),
        }
        
        # Add correlation IDs from context
        if cid := correlation_id_var.get():
            log_entry['correlationId'] = cid
        if rid := request_id_var.get():
            log_entry['requestId'] = rid
        if tid := task_id_var.get():
            log_entry['taskId'] = tid
        if uid := user_id_var.get():
            log_entry['userId'] = uid
        
        # Add any extra fields from the record
        if hasattr(record, 'extra_fields'):
            log_entry['metadata'] = record.extra_fields
        
        # Add error information if present
        if record.exc_info:
            log_entry['error'] = {
                'message': str(record.exc_info[1]),
                'type': record.exc_info[0].__name__ if record.exc_info[0] else 'Unknown',
            }
            if record.exc_text:
                log_entry['error']['stack'] = record.exc_text
        
        # Add location information in development
        if logging.getLogger().level == logging.DEBUG:
            log_entry['location'] = {
                'file': record.pathname,
                'line': record.lineno,
                'function': record.funcName,
            }
        
        return json.dumps(log_entry)

class DevelopmentFormatter(logging.Formatter):
    """Human-readable formatter for development"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    EMOJIS = {
        'DEBUG': '🔍',
        'INFO': '📝',
        'WARNING': '⚠️',
        'ERROR': '❌',
        'CRITICAL': '💀',
    }
    
    def format(self, record: logging.LogRecord) -> str:
        # Get correlation ID for display
        cid = correlation_id_var.get()
        cid_str = f" [{cid}]" if cid else ""
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%H:%M:%S.%f')[:-3]
        
        # Get color and emoji
        level_color = self.COLORS.get(record.levelname, '')
        emoji = self.EMOJIS.get(record.levelname, '')
        
        # Build formatted message
        formatted = f"{level_color}{emoji} [{timestamp}] [{record.name}]{cid_str} {record.getMessage()}{self.RESET}"
        
        # Add metadata if present
        if hasattr(record, 'extra_fields'):
            formatted += f"\n    {json.dumps(record.extra_fields, indent=2)}"
        
        # Add exception info if present
        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"
        
        return formatted

class StructuredLogger:
    """Logger wrapper with structured logging support"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name
    
    def _log(self, level: int, message: str, extra: Optional[Dict[str, Any]] = None, exc_info=None):
        """Internal logging method with structured fields"""
        # Create a LogRecord with extra fields
        record = self.logger.makeRecord(
            self.logger.name,
            level,
            "(unknown file)",
            0,
            message,
            (),
            exc_info,
        )
        
        # Add extra fields to record
        if extra:
            record.extra_fields = extra
        
        # Add stage information if present
        if extra and 'stage' in extra:
            record.stage = extra['stage']
        if extra and 'progress' in extra:
            record.progress = extra['progress']
        
        self.logger.handle(record)
    
    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, kwargs)
    
    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        exc_info = (type(error), error, error.__traceback__) if error else None
        self._log(logging.ERROR, message, kwargs, exc_info=exc_info)
    
    def critical(self, message: str, error: Optional[Exception] = None, **kwargs):
        exc_info = (type(error), error, error.__traceback__) if error else None
        self._log(logging.CRITICAL, message, kwargs, exc_info=exc_info)
    
    def stage(self, stage: str, progress: int, **kwargs):
        """Log a stage transition for progress tracking"""
        self.info(f"Stage: {stage}", stage=stage, progress=progress, **kwargs)

def setup_logging(level: str = "INFO", format: str = "auto"):
    """
    Setup logging configuration
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format: Format type ('json', 'dev', 'auto' - auto detects based on environment)
    """
    import os
    
    # Determine format based on environment
    if format == "auto":
        is_production = os.getenv("NODE_ENV") == "production"
        format = "json" if is_production else "dev"
    
    # Create formatter
    if format == "json":
        formatter = StructuredFormatter()
    else:
        formatter = DevelopmentFormatter()
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Suppress some noisy loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    return root_logger

def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance"""
    return StructuredLogger(name)

# Context management functions
def set_correlation_context(
    correlation_id: Optional[str] = None,
    request_id: Optional[str] = None,
    task_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """Set correlation context for the current async context"""
    if correlation_id:
        correlation_id_var.set(correlation_id)
    if request_id:
        request_id_var.set(request_id)
    if task_id:
        task_id_var.set(task_id)
    if user_id:
        user_id_var.set(user_id)

def clear_correlation_context():
    """Clear correlation context"""
    correlation_id_var.set(None)
    request_id_var.set(None)
    task_id_var.set(None)
    user_id_var.set(None)

def get_correlation_id() -> Optional[str]:
    """Get current correlation ID"""
    return correlation_id_var.get()

def get_task_id() -> Optional[str]:
    """Get current task ID"""
    return task_id_var.get()