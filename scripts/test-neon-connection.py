#!/usr/bin/env python3
"""
Test connection to Neon PostgreSQL database.
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime

# Colors for terminal output
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

# Your Neon database URL
DATABASE_URL = "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

async def test_connection():
    """Test Neon database connection."""
    print(f"{BLUE}Testing Neon Database Connection...{NC}")
    print(f"{BLUE}{'=' * 60}{NC}")
    
    try:
        # Connect to database
        print(f"\n{YELLOW}1. Connecting to Neon...{NC}")
        conn = await asyncpg.connect(DATABASE_URL)
        print(f"{GREEN}✅ Connected successfully!{NC}")
        
        # Test basic query
        print(f"\n{YELLOW}2. Testing basic query...{NC}")
        result = await conn.fetchval("SELECT 1")
        print(f"{GREEN}✅ Query executed: SELECT 1 = {result}{NC}")
        
        # Get database version
        print(f"\n{YELLOW}3. Getting database info...{NC}")
        version = await conn.fetchval("SELECT version()")
        print(f"{GREEN}✅ PostgreSQL Version:{NC}")
        print(f"   {version[:80]}...")
        
        # Check current database
        current_db = await conn.fetchval("SELECT current_database()")
        current_user = await conn.fetchval("SELECT current_user")
        print(f"{GREEN}✅ Database: {current_db}{NC}")
        print(f"{GREEN}✅ User: {current_user}{NC}")
        
        # Test progress table
        print(f"\n{YELLOW}4. Checking progress table...{NC}")
        
        # Create table if not exists
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS progress (
                task_id TEXT PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL
            );
        ''')
        print(f"{GREEN}✅ Progress table ready{NC}")
        
        # Create index if not exists
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_progress_expires 
            ON progress(expires_at);
        ''')
        print(f"{GREEN}✅ Index created/verified{NC}")
        
        # Test insert
        print(f"\n{YELLOW}5. Testing data operations...{NC}")
        test_task_id = f"test-{datetime.utcnow().isoformat()}"
        await conn.execute('''
            INSERT INTO progress (task_id, data, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '1 hour')
            ON CONFLICT (task_id) DO NOTHING
        ''', test_task_id, '{"test": true, "progress": 50}')
        print(f"{GREEN}✅ Insert successful{NC}")
        
        # Test select
        row = await conn.fetchrow('''
            SELECT task_id, data 
            FROM progress 
            WHERE task_id = $1
        ''', test_task_id)
        if row:
            print(f"{GREEN}✅ Select successful: {row['task_id']}{NC}")
        
        # Clean up test data
        await conn.execute('DELETE FROM progress WHERE task_id = $1', test_task_id)
        print(f"{GREEN}✅ Cleanup successful{NC}")
        
        # Get connection stats
        print(f"\n{YELLOW}6. Database statistics...{NC}")
        stats = await conn.fetchrow('''
            SELECT 
                numbackends as connections,
                xact_commit as commits,
                xact_rollback as rollbacks
            FROM pg_stat_database 
            WHERE datname = current_database()
        ''')
        if stats:
            print(f"{GREEN}✅ Active connections: {stats['connections']}{NC}")
            print(f"{GREEN}✅ Transactions committed: {stats['commits']}{NC}")
            print(f"{GREEN}✅ Transactions rolled back: {stats['rollbacks']}{NC}")
        
        # Close connection
        await conn.close()
        print(f"\n{GREEN}✅ Connection closed successfully{NC}")
        
        print(f"\n{BLUE}{'=' * 60}{NC}")
        print(f"{GREEN}🎉 All tests passed! Neon database is working correctly.{NC}")
        print(f"\n{YELLOW}Connection details:{NC}")
        print(f"  Host: ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech")
        print(f"  Database: neondb")
        print(f"  User: neondb_owner")
        print(f"  SSL: Required")
        print(f"  Region: us-east-2")
        
        return True
        
    except Exception as e:
        print(f"\n{RED}❌ Connection failed!{NC}")
        print(f"{RED}Error: {str(e)}{NC}")
        
        if "password authentication failed" in str(e):
            print(f"\n{YELLOW}Hint: Check your database credentials{NC}")
        elif "could not connect" in str(e):
            print(f"\n{YELLOW}Hint: Check your network connection and database URL{NC}")
        elif "SSL" in str(e):
            print(f"\n{YELLOW}Hint: SSL is required for Neon connections{NC}")
        
        return False

async def test_pool():
    """Test connection pooling."""
    print(f"\n{BLUE}Testing Connection Pool...{NC}")
    print(f"{BLUE}{'=' * 60}{NC}")
    
    try:
        # Create pool
        print(f"{YELLOW}Creating connection pool...{NC}")
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=3,
            max_size=10,
            command_timeout=25
        )
        print(f"{GREEN}✅ Pool created (min=3, max=10){NC}")
        
        # Test concurrent connections
        print(f"\n{YELLOW}Testing concurrent queries...{NC}")
        
        async def run_query(n):
            async with pool.acquire() as conn:
                return await conn.fetchval("SELECT $1::int", n)
        
        tasks = [run_query(i) for i in range(5)]
        results = await asyncio.gather(*tasks)
        print(f"{GREEN}✅ Concurrent queries successful: {results}{NC}")
        
        # Close pool
        await pool.close()
        print(f"{GREEN}✅ Pool closed successfully{NC}")
        
    except Exception as e:
        print(f"{RED}❌ Pool test failed: {str(e)}{NC}")

if __name__ == "__main__":
    print(f"\n{BLUE}Neon Database Connection Test{NC}")
    print(f"{BLUE}=============================={NC}")
    
    # Run tests
    loop = asyncio.get_event_loop()
    success = loop.run_until_complete(test_connection())
    
    if success:
        loop.run_until_complete(test_pool())
    
    print(f"\n{BLUE}Test complete!{NC}\n")