"""
Progress Storage Service using PostgreSQL (Neon)

Replaces in-memory storage with persistent database storage.
Progress records auto-expire after 4 hours (configurable).
"""

import os
import json
import asyncpg
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlparse

# TTL configuration (default 4 hours)
PROGRESS_TTL_HOURS = int(os.getenv("PROGRESS_TTL_HOURS", "4"))

# Setup logging
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from logging_config import get_logger
logger = get_logger(__name__)

def parse_database_url(url: str) -> Dict[str, Any]:
    """Parse DATABASE_URL into connection parameters for Neon."""
    parsed = urlparse(url)
    
    # Handle Neon-specific SSL requirements
    ssl_mode = "require"  # Neon requires SSL
    if "sslmode=require" in url:
        ssl_mode = "require"
    
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
        "ssl": ssl_mode,
        # Neon-specific: Use server_settings for better compatibility
        "server_settings": {
            'application_name': 'sightline-api'
        }
    }

class ProgressStorage:
    """Handles progress data storage in PostgreSQL with retry logic and improved pooling."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.db_url = os.getenv("DATABASE_URL", "")
        self._lock = asyncio.Lock()
        self.retry_attempts = 3
        self.retry_delay = 0.5  # Initial retry delay in seconds
        
    async def init(self):
        """Initialize connection pool with retry logic and ensure table exists."""
        if not self.pool:
            async with self._lock:  # Prevent concurrent initialization
                if self.pool:  # Double-check after acquiring lock
                    return
                    
                conn_params = parse_database_url(self.db_url)
                
                # Try to create pool with retries
                for attempt in range(self.retry_attempts):
                    try:
                        # Neon-optimized pool settings
                        # Neon has a 30-second statement timeout by default
                        self.pool = await asyncpg.create_pool(
                            **conn_params,
                            min_size=3,  # Lower for Neon pooler
                            max_size=10,  # Neon pooler handles connection multiplexing
                            command_timeout=25,  # Below Neon's 30s limit
                            max_inactive_connection_lifetime=300,
                            connection_class=asyncpg.Connection,
                            init=self._init_connection
                        )
                        logger.info(f"✅ Database pool initialized (attempt {attempt + 1})")
                        break
                    except Exception as e:
                        if attempt == self.retry_attempts - 1:
                            logger.error(f"❌ Failed to create database pool after {self.retry_attempts} attempts: {e}")
                            raise
                        logger.warning(f"⚠️ Database pool creation attempt {attempt + 1} failed, retrying...")
                        await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
            
            # Ensure table exists
            async with self.pool.acquire() as conn:
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS progress (
                        task_id TEXT PRIMARY KEY,
                        data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW(),
                        expires_at TIMESTAMP NOT NULL
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_progress_expires 
                    ON progress(expires_at);
                ''')
    
    async def _init_connection(self, conn):
        """Initialize each connection with Neon-optimized settings."""
        await conn.execute("SET application_name = 'sightline-api'")
        # Neon has a default 30s timeout, set ours slightly lower
        await conn.execute("SET statement_timeout = '25s'")
        # Optimize for Neon's serverless architecture
        await conn.execute("SET idle_in_transaction_session_timeout = '60s'")
    
    async def set_progress(self, task_id: str, data: Dict[str, Any]) -> None:
        """Store or update progress data with retry logic."""
        if not self.pool:
            await self.init()
            
        expires_at = datetime.utcnow() + timedelta(hours=PROGRESS_TTL_HOURS)
        
        for attempt in range(self.retry_attempts):
            try:
                async with self.pool.acquire() as conn:
                    await conn.execute('''
                        INSERT INTO progress (task_id, data, expires_at)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (task_id) 
                        DO UPDATE SET 
                            data = $2,
                            expires_at = $3
                    ''', task_id, json.dumps(data), expires_at)
                return  # Success
                
            except Exception as e:
                if attempt == self.retry_attempts - 1:
                    logger.error(f"Failed to set progress after {self.retry_attempts} attempts: {e}")
                    raise
                logger.warning(f"Set progress attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(self.retry_delay * (2 ** attempt))
    
    async def get_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve progress data for a task with retry logic."""
        if not self.pool:
            await self.init()
            
        for attempt in range(self.retry_attempts):
            try:
                async with self.pool.acquire() as conn:
                    row = await conn.fetchrow('''
                        SELECT data 
                        FROM progress 
                        WHERE task_id = $1 
                        AND expires_at > NOW()
                    ''', task_id)
                    
                    if row:
                        return json.loads(row['data'])
                    return None
                    
            except Exception as e:
                if attempt == self.retry_attempts - 1:
                    logger.error(f"Failed to get progress after {self.retry_attempts} attempts: {e}")
                    return None  # Return None instead of raising to avoid breaking the API
                logger.warning(f"Get progress attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(self.retry_delay * (2 ** attempt))
    
    async def update_progress(self, task_id: str, updates: Dict[str, Any]) -> None:
        """Update specific fields in progress data."""
        current = await self.get_progress(task_id)
        if current:
            current.update(updates)
            await self.set_progress(task_id, current)
        else:
            # If no existing progress, create new
            await self.set_progress(task_id, updates)
    
    async def delete_progress(self, task_id: str) -> bool:
        """Delete progress data for a task."""
        if not self.pool:
            await self.init()
            
        async with self.pool.acquire() as conn:
            result = await conn.execute('''
                DELETE FROM progress 
                WHERE task_id = $1
            ''', task_id)
            return result.split()[-1] != '0'  # Returns "DELETE n"
    
    async def cleanup_expired(self) -> int:
        """Remove expired progress records. Returns count of deleted records."""
        if not self.pool:
            await self.init()
            
        async with self.pool.acquire() as conn:
            result = await conn.execute('''
                DELETE FROM progress 
                WHERE expires_at <= NOW()
            ''')
            return int(result.split()[-1])  # Extract count from "DELETE n"
    
    async def get_debug_info(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get raw progress record for debugging (includes metadata)."""
        if not self.pool:
            await self.init()
            
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow('''
                SELECT task_id, data, created_at, expires_at
                FROM progress 
                WHERE task_id = $1
            ''', task_id)
            
            if row:
                return {
                    "task_id": row['task_id'],
                    "data": json.loads(row['data']),
                    "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                    "expires_at": row['expires_at'].isoformat() if row['expires_at'] else None,
                    "ttl_remaining_seconds": (row['expires_at'] - datetime.utcnow()).total_seconds() if row['expires_at'] else 0
                }
            return None
    
    async def close(self):
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()

# Global instance
progress_storage = ProgressStorage()