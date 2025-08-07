// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}))

import { GET } from '../route'
import { prisma } from '@/lib/db'

// Get the mocked prisma instance
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset environment variables
    delete process.env.OPENAI_API_KEY
    delete process.env.CLERK_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.UPSTASH_REDIS_URL
    delete process.env.ENABLE_HEALTH_METRICS
    delete process.env.VERCEL_DEPLOYMENT_ID
    delete process.env.npm_package_version
  })

  describe('Healthy scenarios', () => {
    it('should return healthy status with successful database check', async () => {
      // Mock successful database connection
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.checks.database.status).toBe('up')
      expect(data.checks.database.latency).toBeGreaterThanOrEqual(0)
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/)
    })

    it('should show configured external services when API keys are present', async () => {
      // Setup environment variables
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.CLERK_SECRET_KEY = 'clerk-test'
      process.env.STRIPE_SECRET_KEY = 'stripe-test'
      
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.externalServices.openai.status).toBe('up')
      expect(data.checks.externalServices.openai.configured).toBe(true)
      expect(data.checks.externalServices.clerk.status).toBe('up')
      expect(data.checks.externalServices.clerk.configured).toBe(true)
      expect(data.checks.externalServices.stripe.status).toBe('up')
      expect(data.checks.externalServices.stripe.configured).toBe(true)
    })

    it('should include system metrics in development or when enabled', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.metrics).toBeDefined()
      expect(data.metrics.uptime).toBeGreaterThan(0)
      expect(data.metrics.memory.used).toBeGreaterThan(0)
      expect(data.metrics.memory.total).toBeGreaterThan(0)
      expect(data.metrics.memory.percentage).toBeGreaterThan(0)
      
      // Restore original NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv
      } else {
        delete process.env.NODE_ENV
      }
    })

    it('should include metrics when ENABLE_HEALTH_METRICS is true', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.ENABLE_HEALTH_METRICS = 'true'
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.metrics).toBeDefined()
      
      // Restore original NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv
      } else {
        delete process.env.NODE_ENV
      }
    })
  })

  describe('Unhealthy scenarios', () => {
    it('should return unhealthy status when database is down', async () => {
      // Mock database connection failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'))
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.database.status).toBe('down')
      expect(data.checks.database.error).toBe('Database connection failed')
    })

    it('should handle non-Error database exceptions', async () => {
      // Mock database connection failure with non-Error object
      mockPrisma.$queryRaw.mockRejectedValue('String error')
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.database.status).toBe('down')
      expect(data.checks.database.error).toBe('Unknown error')
    })
  })

  describe('External service configuration', () => {
    it('should show not_configured for missing API keys', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.externalServices.openai.status).toBe('not_configured')
      expect(data.checks.externalServices.openai.configured).toBe(false)
      expect(data.checks.externalServices.clerk.status).toBe('not_configured')
      expect(data.checks.externalServices.clerk.configured).toBe(false)
      expect(data.checks.externalServices.stripe.status).toBe('not_configured')
      expect(data.checks.externalServices.stripe.configured).toBe(false)
    })

    it('should include deployment information', async () => {
      process.env.VERCEL_DEPLOYMENT_ID = 'test-deployment-123'
      process.env.npm_package_version = '1.2.3'
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.deployment).toBe('test-deployment-123')
      expect(data.version).toBe('1.2.3')
    })

    it('should use default values for deployment info', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.deployment).toBe('local')
      expect(data.version).toBe('0.1.0')
    })
  })

  describe('Redis handling', () => {
    it('should handle Redis configuration when URL is present', async () => {
      process.env.UPSTASH_REDIS_URL = 'redis://test-url'
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.redis).toBeDefined()
      expect(data.checks.redis.status).toBe('not_configured') // Since Redis implementation is not complete
    })

    it('should not include Redis check when URL is not configured', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.redis).toBeUndefined()
    })
  })

  describe('Response headers and caching', () => {
    it('should set no-cache headers', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      
      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/)
    })

    it('should set appropriate status codes', async () => {
      // Test healthy status
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      let response = await GET()
      expect(response.status).toBe(200)
      
      // Test unhealthy status
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database down'))
      response = await GET()
      expect(response.status).toBe(503)
    })
  })

  describe('Performance and timing', () => {
    it('should include response time in headers', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{}])
      
      const response = await GET()
      const responseTime = response.headers.get('X-Response-Time')
      
      expect(responseTime).toBeTruthy()
      expect(responseTime).toMatch(/^\d+ms$/)
      
      if (responseTime) {
        const timeValue = parseInt(responseTime.replace('ms', ''))
        expect(timeValue).toBeGreaterThanOrEqual(0)
        expect(timeValue).toBeLessThan(5000) // Should be fast
      }
    })

    it('should track database latency', async () => {
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{}] as any), 50))
      )
      
      const response = await GET()
      const data = await response.json()
      
      expect(data.checks.database.latency).toBeGreaterThanOrEqual(45)
      expect(data.checks.database.latency).toBeLessThan(1000)
    })
  })
})