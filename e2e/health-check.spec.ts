import { test, expect } from '@playwright/test';

/**
 * Health Check Smoke Tests
 * 
 * Minimal smoke tests to verify both backend layers are responding.
 * These tests run quickly and fail fast with clear error messages.
 */
test.describe('Health Check Smoke Tests', () => {
  test('FastAPI health endpoint should respond', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:8000/api/health');
      
      expect(response.ok(), 'FastAPI health endpoint should return 200').toBe(true);
      
      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        layer: 'fastapi'
      });
    } catch (error) {
      throw new Error(`FastAPI health check failed: ${error}. Make sure the Python API is running on port 8000.`);
    }
  });

  test('tRPC health endpoint should respond', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3000/api/trpc/summary.health?batch=1');
      
      expect(response.ok(), 'tRPC health endpoint should return 200').toBe(true);
      
      const data = await response.json();
      
      // tRPC batched response structure
      expect(data).toHaveProperty('0');
      expect(data[0]).toHaveProperty('result');
      expect(data[0].result).toHaveProperty('data');
      expect(data[0].result.data).toHaveProperty('json');
      expect(data[0].result.data.json).toEqual({
        ok: true,
        layer: 'trpc'
      });
    } catch (error) {
      throw new Error(`tRPC health check failed: ${error}. Make sure the Next.js app is running on port 3000.`);
    }
  });

  test('Both health endpoints respond within timeout', async ({ request }) => {
    const timeout = 5000; // 5 seconds
    
    try {
      const [fastapiResponse, trpcResponse] = await Promise.all([
        request.get('http://localhost:8000/api/health', { timeout }),
        request.get('http://localhost:3000/api/trpc/summary.health?batch=1', { timeout })
      ]);

      expect(fastapiResponse.ok()).toBe(true);
      expect(trpcResponse.ok()).toBe(true);
    } catch (error) {
      throw new Error(`One or both health endpoints failed to respond within ${timeout}ms: ${error}`);
    }
  });
});