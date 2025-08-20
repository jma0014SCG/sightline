import * as Sentry from '@sentry/nextjs'
import { Prisma } from '@prisma/client'

export interface QueryMetrics {
  query: string
  params: string
  duration: number
  timestamp: Date
  operation?: string
  model?: string
}

export interface DatabaseHealthMetrics {
  slowQueries: QueryMetrics[]
  averageQueryTime: number
  queryCount: number
  errorCount: number
  connectionPoolUsage?: number
}

class DatabaseMonitor {
  private metrics: QueryMetrics[] = []
  private errorCount = 0
  private slowQueryThreshold = 1000 // 1 second
  private criticalQueryThreshold = 5000 // 5 seconds
  private maxMetricsSize = 1000 // Keep last 1000 queries

  /**
   * Track a query execution
   */
  trackQuery(query: string, params: string, duration: number) {
    const metric: QueryMetrics = {
      query,
      params,
      duration,
      timestamp: new Date(),
      operation: this.extractOperation(query),
      model: this.extractModel(query),
    }

    // Add to metrics buffer
    this.metrics.push(metric)
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift() // Remove oldest
    }

    // Track slow queries
    if (duration > this.slowQueryThreshold) {
      this.handleSlowQuery(metric)
    }

    // Track critical queries
    if (duration > this.criticalQueryThreshold) {
      this.handleCriticalQuery(metric)
    }
  }

  /**
   * Track a database error
   */
  trackError(error: any) {
    this.errorCount++
    
    // Send to Sentry with context
    Sentry.captureException(error, {
      tags: {
        component: 'database',
        type: 'query_error',
      },
      level: 'error',
    })
  }

  /**
   * Handle slow query detection
   */
  private handleSlowQuery(metric: QueryMetrics) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      component: 'database.performance',
      message: `Slow query detected: ${metric.duration}ms`,
      query: metric.query,
      operation: metric.operation,
      model: metric.model,
      duration: metric.duration,
    }))

    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'database',
      message: `Slow query: ${metric.operation} on ${metric.model}`,
      level: 'warning',
      data: {
        duration: metric.duration,
        query: metric.query.substring(0, 200), // Truncate for privacy
      },
    })
  }

  /**
   * Handle critical query detection
   */
  private handleCriticalQuery(metric: QueryMetrics) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: 'database.performance',
      message: `Critical slow query: ${metric.duration}ms`,
      query: metric.query,
      operation: metric.operation,
      model: metric.model,
      duration: metric.duration,
    }))

    // Capture as Sentry event
    Sentry.captureMessage(`Critical slow query: ${metric.duration}ms`, {
      level: 'error',
      tags: {
        component: 'database',
        operation: metric.operation || 'unknown',
        model: metric.model || 'unknown',
      },
      extra: {
        duration: metric.duration,
        query: metric.query.substring(0, 500), // Truncate for privacy
        timestamp: metric.timestamp,
      },
    })
  }

  /**
   * Extract operation type from query
   */
  private extractOperation(query: string): string {
    const normalized = query.toUpperCase().trim()
    if (normalized.startsWith('SELECT')) return 'SELECT'
    if (normalized.startsWith('INSERT')) return 'INSERT'
    if (normalized.startsWith('UPDATE')) return 'UPDATE'
    if (normalized.startsWith('DELETE')) return 'DELETE'
    if (normalized.startsWith('BEGIN')) return 'TRANSACTION'
    if (normalized.startsWith('COMMIT')) return 'COMMIT'
    if (normalized.startsWith('ROLLBACK')) return 'ROLLBACK'
    return 'OTHER'
  }

  /**
   * Extract model/table name from query
   */
  private extractModel(query: string): string | undefined {
    // Try to extract table name from common patterns
    const patterns = [
      /FROM\s+"?(\w+)"?/i,
      /INTO\s+"?(\w+)"?/i,
      /UPDATE\s+"?(\w+)"?/i,
      /DELETE\s+FROM\s+"?(\w+)"?/i,
    ]

    for (const pattern of patterns) {
      const match = query.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return undefined
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): DatabaseHealthMetrics {
    const now = Date.now()
    const recentQueries = this.metrics.filter(
      m => now - m.timestamp.getTime() < 60000 // Last minute
    )

    const slowQueries = recentQueries.filter(
      m => m.duration > this.slowQueryThreshold
    )

    const averageQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, m) => sum + m.duration, 0) / recentQueries.length
      : 0

    return {
      slowQueries,
      averageQueryTime,
      queryCount: recentQueries.length,
      errorCount: this.errorCount,
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = []
    this.errorCount = 0
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor()

// Export for type safety
export type { DatabaseMonitor }