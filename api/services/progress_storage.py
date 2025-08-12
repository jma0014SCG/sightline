"""
Progress Storage Service using PostgreSQL (Neon)

Replaces in-memory storage with persistent database storage.
Progress records auto-expire after 4 hours (configurable).
"""

import os
import json
import asyncpg
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlparse

# TTL configuration (default 4 hours)
PROGRESS_TTL_HOURS = int(os.getenv("PROGRESS_TTL_HOURS", "4"))

def parse_database_url(url: str) -> Dict[str, Any]:
    """Parse DATABASE_URL into connection parameters."""
    parsed = urlparse(url)
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
        "ssl": "require" if "sslmode=require" in url else None
    }

class ProgressStorage:
    """Handles progress data storage in PostgreSQL."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.db_url = os.getenv("DATABASE_URL", "")
        
    async def init(self):
        """Initialize connection pool and ensure table exists."""
        if not self.pool:
            conn_params = parse_database_url(self.db_url)
            self.pool = await asyncpg.create_pool(
                **conn_params,
                min_size=1,
                max_size=5,
                command_timeout=60
            )
            
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
    
    async def set_progress(self, task_id: str, data: Dict[str, Any]) -> None:
        """Store or update progress data."""
        if not self.pool:
            await self.init()
            
        expires_at = datetime.utcnow() + timedelta(hours=PROGRESS_TTL_HOURS)
        
        async with self.pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO progress (task_id, data, expires_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (task_id) 
                DO UPDATE SET 
                    data = $2,
                    expires_at = $3
            ''', task_id, json.dumps(data), expires_at)
    
    async def get_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve progress data for a task."""
        if not self.pool:
            await self.init()
            
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