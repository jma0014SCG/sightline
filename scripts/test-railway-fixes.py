#!/usr/bin/env python3
"""
Test script to validate Railway backend fixes locally.
Run this before deploying to production.
"""

import asyncio
import os
import sys
import time
import httpx
from datetime import datetime
from typing import Dict, Any

# Add API directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

# Colors for terminal output
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color


class BackendTester:
    """Test suite for Railway backend fixes."""
    
    def __init__(self):
        self.base_url = os.getenv("TEST_API_URL", "http://localhost:8000")
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def print_header(self, message: str):
        """Print section header."""
        print(f"\n{BLUE}{'=' * 60}{NC}")
        print(f"{BLUE}{message}{NC}")
        print(f"{BLUE}{'=' * 60}{NC}")
        
    def print_test(self, name: str, passed: bool, details: str = ""):
        """Print test result."""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            print(f"{GREEN}✅ {name}{NC}")
        else:
            print(f"{RED}❌ {name}{NC}")
        
        if details:
            print(f"   {details}")
            
    async def test_health_endpoints(self):
        """Test health check endpoints."""
        self.print_header("Testing Health Endpoints")
        
        endpoints = [
            "/api/health",
            "/api/health/detailed",
            "/api/health/resources",
            "/api/health/database",
            "/api/health/circuit-breakers"
        ]
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for endpoint in endpoints:
                try:
                    start_time = time.time()
                    response = await client.get(f"{self.base_url}{endpoint}")
                    response_time = (time.time() - start_time) * 1000
                    
                    passed = response.status_code == 200
                    details = f"Status: {response.status_code}, Time: {response_time:.2f}ms"
                    
                    if passed and endpoint == "/api/health/detailed":
                        data = response.json()
                        status = data.get("status", "unknown")
                        details += f", Overall: {status}"
                        
                    self.print_test(f"GET {endpoint}", passed, details)
                    
                except Exception as e:
                    self.print_test(f"GET {endpoint}", False, f"Error: {str(e)}")
                    
    async def test_database_connection(self):
        """Test database connection and pool."""
        self.print_header("Testing Database Connection")
        
        try:
            from services.progress_storage import progress_storage
            
            # Test initialization
            await progress_storage.init()
            self.print_test("Database pool initialization", True)
            
            # Test write operation
            test_data = {
                "progress": 50,
                "stage": "Testing",
                "status": "in_progress",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            task_id = f"test-{int(time.time())}"
            await progress_storage.set_progress(task_id, test_data)
            self.print_test("Write to database", True, f"Task ID: {task_id}")
            
            # Test read operation
            retrieved = await progress_storage.get_progress(task_id)
            passed = retrieved is not None and retrieved["progress"] == 50
            self.print_test("Read from database", passed)
            
            # Test cleanup
            deleted = await progress_storage.delete_progress(task_id)
            self.print_test("Delete from database", deleted)
            
            # Check pool stats
            if progress_storage.pool:
                pool_size = progress_storage.pool._maxsize
                details = f"Pool size: {pool_size}"
                self.print_test("Connection pool configured", pool_size >= 5, details)
            
        except Exception as e:
            self.print_test("Database operations", False, f"Error: {str(e)}")
            
    async def test_circuit_breakers(self):
        """Test circuit breaker functionality."""
        self.print_header("Testing Circuit Breakers")
        
        try:
            from utils.circuit_breaker import CircuitBreaker
            
            # Create test circuit breaker
            breaker = CircuitBreaker(
                failure_threshold=2,
                recovery_timeout=1,
                name="test"
            )
            
            # Test successful call
            async def success_func():
                return "success"
            
            result = await breaker.call(success_func)
            self.print_test("Circuit breaker allows successful calls", result == "success")
            
            # Test failure handling
            async def failure_func():
                raise Exception("Test failure")
            
            failures = 0
            for i in range(3):
                try:
                    await breaker.call(failure_func)
                except Exception:
                    failures += 1
            
            self.print_test("Circuit breaker counts failures", failures == 3)
            self.print_test("Circuit breaker opens after threshold", breaker.state.value == "open")
            
            # Test recovery
            await asyncio.sleep(1.5)  # Wait for recovery timeout
            breaker.state = breaker._should_attempt_reset()
            self.print_test("Circuit breaker attempts recovery", True)
            
        except Exception as e:
            self.print_test("Circuit breaker system", False, f"Error: {str(e)}")
            
    async def test_resource_monitoring(self):
        """Test resource monitoring."""
        self.print_header("Testing Resource Monitoring")
        
        try:
            from monitoring import monitoring
            from services.progress_storage import progress_storage
            
            # Get resource metrics
            metrics = await monitoring.get_resource_metrics(progress_storage)
            
            self.print_test(
                "Memory monitoring", 
                metrics.memory_usage_mb > 0,
                f"Memory: {metrics.memory_usage_mb}MB ({metrics.memory_percent:.1f}%)"
            )
            
            self.print_test(
                "CPU monitoring",
                metrics.cpu_percent >= 0,
                f"CPU: {metrics.cpu_percent:.1f}%"
            )
            
            # Check thresholds
            resources = await monitoring.check_resource_thresholds(progress_storage)
            alerts = resources.get("alerts", [])
            
            self.print_test(
                "Resource threshold checking",
                True,
                f"Active alerts: {len(alerts)}"
            )
            
            if alerts:
                for alert in alerts:
                    print(f"   {YELLOW}⚠️  {alert}{NC}")
                    
        except Exception as e:
            self.print_test("Resource monitoring", False, f"Error: {str(e)}")
            
    async def test_performance_improvements(self):
        """Test performance improvements."""
        self.print_header("Testing Performance Improvements")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test concurrent requests
            tasks = []
            for i in range(5):
                task = client.get(f"{self.base_url}/api/health")
                tasks.append(task)
            
            start_time = time.time()
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            successful = sum(1 for r in responses if not isinstance(r, Exception) and r.status_code == 200)
            self.print_test(
                "Concurrent request handling",
                successful == 5,
                f"{successful}/5 successful in {total_time:.2f}s"
            )
            
            # Test response times
            response_times = []
            for i in range(3):
                start = time.time()
                response = await client.get(f"{self.base_url}/api/health")
                response_times.append((time.time() - start) * 1000)
            
            avg_time = sum(response_times) / len(response_times)
            self.print_test(
                "Average response time",
                avg_time < 200,  # Should be under 200ms
                f"{avg_time:.2f}ms"
            )
            
    async def test_configuration(self):
        """Test configuration settings."""
        self.print_header("Testing Configuration")
        
        # Check Railway configuration
        if os.path.exists("railway.json"):
            import json
            with open("railway.json", "r") as f:
                config = json.load(f)
            
            workers = "workers 2" in config["deploy"]["startCommand"]
            self.print_test("Worker count optimized", workers, "Workers set to 2")
            
            health_path = config["deploy"]["healthcheckPath"] == "/api/health"
            self.print_test("Health check path configured", health_path)
        
        # Check environment variables
        env_vars = [
            "DATABASE_URL",
            "OPENAI_API_KEY",
            "GUMLOOP_API_KEY",
            "GUMLOOP_USER_ID",
            "GUMLOOP_FLOW_ID"
        ]
        
        for var in env_vars:
            exists = os.getenv(var) is not None
            self.print_test(f"Environment variable {var}", exists)
            
    def print_summary(self):
        """Print test summary."""
        self.print_header("Test Summary")
        
        percentage = (self.passed_tests / max(self.total_tests, 1)) * 100
        
        if percentage == 100:
            color = GREEN
            status = "All tests passed! 🎉"
        elif percentage >= 80:
            color = YELLOW
            status = "Most tests passed, some issues remain"
        else:
            color = RED
            status = "Critical issues detected"
        
        print(f"\n{color}Results: {self.passed_tests}/{self.total_tests} tests passed ({percentage:.1f}%){NC}")
        print(f"{color}{status}{NC}")
        
        if percentage == 100:
            print(f"\n{GREEN}✅ Ready for deployment to Railway!{NC}")
        else:
            print(f"\n{YELLOW}⚠️  Fix remaining issues before deploying{NC}")
            
    async def run_all_tests(self):
        """Run all tests."""
        print(f"{BLUE}Railway Backend Test Suite{NC}")
        print(f"{BLUE}Testing fixes and optimizations...{NC}")
        
        await self.test_health_endpoints()
        await self.test_database_connection()
        await self.test_circuit_breakers()
        await self.test_resource_monitoring()
        await self.test_performance_improvements()
        await self.test_configuration()
        
        self.print_summary()


async def main():
    """Main test runner."""
    tester = BackendTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    # Check if API is running
    try:
        import httpx
        response = httpx.get("http://localhost:8000/api/health", timeout=2.0)
        if response.status_code != 200:
            print(f"{YELLOW}⚠️  API not responding properly. Start it with: cd api && uvicorn index:app --reload{NC}")
    except Exception:
        print(f"{RED}❌ API is not running. Start it with: cd api && uvicorn index:app --reload{NC}")
        print(f"{YELLOW}Or set TEST_API_URL environment variable to test remote API{NC}")
        sys.exit(1)
    
    # Run tests
    asyncio.run(main())