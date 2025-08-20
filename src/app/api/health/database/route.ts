import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { databaseMonitor } from '@/lib/monitoring/database-monitor'
import * as Sentry from '@sentry/nextjs'

export const runtime = 'nodejs'

/**
 * Database health check endpoint
 * Returns database connection status and performance metrics
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Test database connectivity with a simple query
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStartTime

    // Get current metrics from monitor
    const metrics = databaseMonitor.getHealthMetrics()

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const issues: string[] = []

    // Check response time
    if (dbResponseTime > 5000) {
      status = 'unhealthy'
      issues.push(`Critical: Database response time ${dbResponseTime}ms`)
    } else if (dbResponseTime > 1000) {
      status = 'degraded'
      issues.push(`Warning: Database response time ${dbResponseTime}ms`)
    }

    // Check average query time
    if (metrics.averageQueryTime > 2000) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded'
      issues.push(`High average query time: ${Math.round(metrics.averageQueryTime)}ms`)
    }

    // Check error rate (errors in last minute)
    if (metrics.errorCount > 10) {
      status = 'unhealthy'
      issues.push(`High error count: ${metrics.errorCount} errors`)
    } else if (metrics.errorCount > 5) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded'
      issues.push(`Elevated error count: ${metrics.errorCount} errors`)
    }

    // Check slow queries
    if (metrics.slowQueries.length > 10) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded'
      issues.push(`${metrics.slowQueries.length} slow queries in last minute`)
    }

    const response = {
      status,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      database: {
        connected: true,
        responseTime: dbResponseTime,
        metrics: {
          averageQueryTime: Math.round(metrics.averageQueryTime),
          queryCount: metrics.queryCount,
          slowQueryCount: metrics.slowQueries.length,
          errorCount: metrics.errorCount,
        },
        issues,
      },
    }

    // Add warning to Sentry if degraded or unhealthy
    if (status !== 'healthy') {
      Sentry.captureMessage(`Database health ${status}`, {
        level: status === 'unhealthy' ? 'error' : 'warning',
        tags: {
          component: 'database',
          health: status,
        },
        extra: response,
      })
    }

    return NextResponse.json(response, {
      status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    // Database connection failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    Sentry.captureException(error, {
      tags: {
        component: 'database',
        endpoint: 'health',
      },
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        database: {
          connected: false,
          error: errorMessage,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}