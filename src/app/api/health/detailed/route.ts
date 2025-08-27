import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { databaseMonitor } from '@/lib/monitoring/database-monitor'
import * as Sentry from '@sentry/nextjs'
import os from 'os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ServiceCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  message?: string
  metadata?: Record<string, any>
}

interface DetailedHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  environment: {
    nodeVersion: string
    platform: string
    deployment: string
    region?: string
    version: string
  }
  services: ServiceCheck[]
  performance: {
    uptime: number
    avgResponseTime?: number
    requestsPerMinute?: number
  }
  resources: {
    memory: {
      used: number
      total: number
      percentage: number
      rss: number
    }
    cpu?: {
      usage: number
      loadAverage: number[]
    }
  }
  database: {
    connected: boolean
    responseTime?: number
    poolSize?: number
    activeConnections?: number
    metrics?: {
      averageQueryTime: number
      slowQueryCount: number
      errorCount: number
    }
  }
  cache?: {
    connected: boolean
    responseTime?: number
    hitRate?: number
  }
  externalServices: {
    openai: ServiceCheck
    clerk: ServiceCheck
    stripe: ServiceCheck
    youtube?: ServiceCheck
    sentry: ServiceCheck
  }
  alerts?: {
    active: number
    recent: Array<{
      level: 'warning' | 'error' | 'critical'
      message: string
      timestamp: string
    }>
  }
}

/**
 * Comprehensive health check endpoint for external monitoring services
 * Provides detailed system status, performance metrics, and service health
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  
  // Initialize response structure
  const response: DetailedHealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      deployment: process.env.VERCEL_DEPLOYMENT_ID || 'local',
      region: process.env.VERCEL_REGION || process.env.AWS_REGION,
      version: process.env.npm_package_version || '0.1.0',
    },
    services: [],
    performance: {
      uptime: process.uptime(),
    },
    resources: {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        rss: 0,
      },
    },
    database: {
      connected: false,
    },
    externalServices: {
      openai: { name: 'OpenAI', status: 'unhealthy' },
      clerk: { name: 'Clerk', status: 'unhealthy' },
      stripe: { name: 'Stripe', status: 'unhealthy' },
      sentry: { name: 'Sentry', status: 'unhealthy' },
    },
  }

  // Check database connectivity and metrics
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    // Get database metrics from monitor
    const dbMetrics = databaseMonitor.getHealthMetrics()

    response.database = {
      connected: true,
      responseTime: dbResponseTime,
      metrics: {
        averageQueryTime: Math.round(dbMetrics.averageQueryTime),
        slowQueryCount: dbMetrics.slowQueries.length,
        errorCount: dbMetrics.errorCount,
      },
    }

    response.services.push({
      name: 'PostgreSQL Database',
      status: dbResponseTime > 1000 ? 'degraded' : 'healthy',
      responseTime: dbResponseTime,
      metadata: {
        provider: 'Neon',
        slowQueries: dbMetrics.slowQueries.length,
      },
    })
  } catch (error) {
    response.database.connected = false
    response.status = 'unhealthy'
    
    response.services.push({
      name: 'PostgreSQL Database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
    })

    // Log critical database failure
    Sentry.captureException(error, {
      tags: {
        component: 'health_check',
        service: 'database',
      },
      level: 'error',
    })
  }

  // Check Redis cache if configured
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      // Would implement Redis health check here
      response.cache = {
        connected: false,
      }
    } catch (error) {
      response.cache = {
        connected: false,
      }
    }
  }

  // Check external service configurations
  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    response.externalServices.openai = {
      name: 'OpenAI',
      status: 'healthy',
      metadata: {
        configured: true,
        models: ['gpt-4', 'gpt-3.5-turbo'],
      },
    }
  } else {
    response.externalServices.openai = {
      name: 'OpenAI',
      status: 'unhealthy',
      message: 'API key not configured',
    }
    response.status = response.status === 'healthy' ? 'degraded' : response.status
  }

  // Clerk
  if (process.env.CLERK_SECRET_KEY) {
    response.externalServices.clerk = {
      name: 'Clerk',
      status: 'healthy',
      metadata: {
        configured: true,
        publicKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      },
    }
  } else {
    response.externalServices.clerk = {
      name: 'Clerk',
      status: 'unhealthy',
      message: 'Secret key not configured',
    }
    response.status = 'unhealthy'
  }

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    response.externalServices.stripe = {
      name: 'Stripe',
      status: 'healthy',
      metadata: {
        configured: true,
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        proPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      },
    }
  } else {
    response.externalServices.stripe = {
      name: 'Stripe',
      status: 'unhealthy',
      message: 'Secret key not configured',
    }
    response.status = response.status === 'healthy' ? 'degraded' : response.status
  }

  // YouTube
  if (process.env.YOUTUBE_API_KEY) {
    response.externalServices.youtube = {
      name: 'YouTube',
      status: 'healthy',
      metadata: {
        configured: true,
      },
    }
  }

  // Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    response.externalServices.sentry = {
      name: 'Sentry',
      status: 'healthy',
      metadata: {
        configured: true,
        environment: process.env.NODE_ENV,
      },
    }
  } else {
    response.externalServices.sentry = {
      name: 'Sentry',
      status: 'degraded',
      message: 'DSN not configured',
    }
  }

  // Collect system resources
  const memUsage = process.memoryUsage()
  response.resources.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    rss: Math.round(memUsage.rss / 1024 / 1024),
  }

  // Add CPU metrics if available
  try {
    const loadAvg = os.loadavg()
    const cpus = os.cpus()
    
    response.resources.cpu = {
      usage: Math.round(loadAvg[0] * 100) / 100,
      loadAverage: loadAvg.map(avg => Math.round(avg * 100) / 100),
    }
  } catch {
    // CPU metrics not available in some environments
  }

  // Check for memory pressure
  if (response.resources.memory.percentage > 90) {
    response.status = 'unhealthy'
    response.services.push({
      name: 'Memory',
      status: 'unhealthy',
      message: `High memory usage: ${response.resources.memory.percentage}%`,
    })
  } else if (response.resources.memory.percentage > 75) {
    response.status = response.status === 'healthy' ? 'degraded' : response.status
    response.services.push({
      name: 'Memory',
      status: 'degraded',
      message: `Elevated memory usage: ${response.resources.memory.percentage}%`,
    })
  }

  // Add response time to performance metrics
  response.performance.avgResponseTime = Date.now() - startTime

  // Set final status based on all checks
  let statusCode = 200
  if (response.status === 'unhealthy') {
    statusCode = 503
    
    // Log unhealthy status
    Sentry.captureMessage('Health check failed', {
      level: 'error',
      tags: {
        component: 'health_check',
        status: 'unhealthy',
      },
      extra: { ...response },
    })
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Health-Status': response.status,
    },
  })
}