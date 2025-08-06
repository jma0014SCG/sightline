import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  deployment: string
  version: string
  checks: {
    database: {
      status: 'up' | 'down'
      latency?: number
      error?: string
    }
    redis?: {
      status: 'up' | 'down' | 'not_configured'
      latency?: number
      error?: string
    }
    externalServices: {
      openai: {
        status: 'up' | 'down' | 'not_configured'
        configured: boolean
      }
      clerk: {
        status: 'up' | 'down' | 'not_configured'
        configured: boolean
      }
      stripe: {
        status: 'up' | 'down' | 'not_configured'
        configured: boolean
      }
    }
  }
  metrics?: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_DEPLOYMENT_ID || 'local',
    version: process.env.npm_package_version || '0.1.0',
    checks: {
      database: { status: 'down' },
      externalServices: {
        openai: {
          status: process.env.OPENAI_API_KEY ? 'up' : 'not_configured',
          configured: !!process.env.OPENAI_API_KEY
        },
        clerk: {
          status: process.env.CLERK_SECRET_KEY ? 'up' : 'not_configured',
          configured: !!process.env.CLERK_SECRET_KEY
        },
        stripe: {
          status: process.env.STRIPE_SECRET_KEY ? 'up' : 'not_configured',
          configured: !!process.env.STRIPE_SECRET_KEY
        }
      }
    }
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    result.checks.database = {
      status: 'up',
      latency: Date.now() - dbStart
    }
  } catch (error) {
    result.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    result.status = 'unhealthy'
  }

  // Check Redis if configured
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      // Redis check would go here if implemented
      result.checks.redis = { status: 'not_configured' }
    } catch (error) {
      result.checks.redis = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded'
    }
  }

  // Add system metrics
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_HEALTH_METRICS === 'true') {
    const memUsage = process.memoryUsage()
    result.metrics = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      }
    }
  }

  // Set appropriate status code
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503

  return NextResponse.json(result, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`
    }
  })
}

export const dynamic = 'force-dynamic'