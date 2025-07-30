// Performance API is available globally in modern browsers and Node.js

interface ErrorEvent {
  error: Error
  context?: Record<string, any>
  user?: {
    id: string
    email?: string
  }
  url?: string
  userAgent?: string
}

interface MetricEvent {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: Date
}

class MonitoringService {
  private static instance: MonitoringService
  private isProduction = process.env.NODE_ENV === 'production'

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  /**
   * Log an error with context
   */
  logError(errorEvent: ErrorEvent) {
    // Console logging for development
    if (!this.isProduction) {
      console.error('🔴 Error:', errorEvent.error.message, {
        stack: errorEvent.error.stack,
        context: errorEvent.context,
        user: errorEvent.user,
        url: errorEvent.url,
      })
    }

    // Send to Sentry in production
    if (this.isProduction && typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry
      
      Sentry.withScope((scope: any) => {
        if (errorEvent.user) {
          scope.setUser(errorEvent.user)
        }
        
        if (errorEvent.context) {
          Object.entries(errorEvent.context).forEach(([key, value]) => {
            scope.setTag(key, value)
          })
        }
        
        if (errorEvent.url) {
          scope.setTag('url', errorEvent.url)
        }
        
        Sentry.captureException(errorEvent.error)
      })
    }

    // Log to server-side error tracking
    if (typeof window === 'undefined') {
      this.logServerError(errorEvent)
    }
  }

  /**
   * Log performance metrics
   */
  logMetric(metric: MetricEvent) {
    if (!this.isProduction) {
      console.log('📊 Metric:', metric.name, metric.value, metric.tags)
    }

    // Send to analytics service in production
    if (this.isProduction) {
      this.sendMetric(metric)
    }
  }

  /**
   * Log API response times
   */
  logApiPerformance(endpoint: string, duration: number, status: number) {
    this.logMetric({
      name: 'api_response_time',
      value: duration,
      tags: {
        endpoint,
        status: status.toString(),
      },
    })

    // Alert on slow responses
    if (duration > 5000) {
      this.logError({
        error: new Error(`Slow API response: ${endpoint} took ${duration}ms`),
        context: { endpoint, duration, status },
      })
    }
  }

  /**
   * Log user actions for analytics
   */
  logUserAction(action: string, context?: Record<string, any>) {
    this.logMetric({
      name: 'user_action',
      value: 1,
      tags: {
        action,
        ...context,
      },
    })
  }

  /**
   * Log business metrics
   */
  logBusinessMetric(metric: string, value: number, context?: Record<string, any>) {
    this.logMetric({
      name: `business_${metric}`,
      value,
      tags: context,
    })
  }

  private async logServerError(errorEvent: ErrorEvent) {
    try {
      // Log to file or external service
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: errorEvent.error.message,
        stack: errorEvent.error.stack,
        context: errorEvent.context,
        user: errorEvent.user,
        url: errorEvent.url,
      }

      // In production, send to logging service
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
        })
      }
    } catch (err) {
      console.error('Failed to log error:', err)
    }
  }

  private async sendMetric(metric: MetricEvent) {
    try {
      // Send to analytics service
      if (process.env.ANALYTICS_ENDPOINT) {
        await fetch(process.env.ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...metric,
            timestamp: metric.timestamp || new Date(),
          }),
        })
      }
    } catch (err) {
      console.error('Failed to send metric:', err)
    }
  }
}

export const monitoring = MonitoringService.getInstance()

// Helper functions for common use cases
export const logError = (error: Error, context?: Record<string, any>) => {
  monitoring.logError({ error, context })
}

export const logApiCall = async <T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  let status = 200
  
  try {
    const result = await fn()
    return result
  } catch (error) {
    status = 500
    throw error
  } finally {
    const duration = performance.now() - start
    monitoring.logApiPerformance(endpoint, duration, status)
  }
}

export const withErrorBoundary = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      monitoring.logError({
        error: error instanceof Error ? error : new Error(String(error)),
        context: {
          ...context,
          args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
        },
      })
      throw error
    }
  }
}

// Custom hook for React components
export const useErrorTracking = () => {
  return {
    logError: (error: Error, context?: Record<string, any>) => {
      monitoring.logError({
        error,
        context: {
          ...context,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        },
      })
    },
    logUserAction: (action: string, context?: Record<string, any>) => {
      monitoring.logUserAction(action, context)
    },
  }
}

// Performance monitoring integration
export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return

  // Monitor Core Web Vitals (only if web-vitals is available)
  // Dynamic import to avoid webpack issues
  setTimeout(() => {
    try {
      // @ts-ignore - Optional dependency, dynamic import
      const webVitalsPromise = Function('return import("web-vitals")')()
      webVitalsPromise.then(({ getCLS, getFID, getFCP, getLCP, getTTFB }: any) => {
        getCLS((metric: any) => monitoring.logMetric({ name: 'cls', value: metric.value }))
        getFID((metric: any) => monitoring.logMetric({ name: 'fid', value: metric.value }))
        getFCP((metric: any) => monitoring.logMetric({ name: 'fcp', value: metric.value }))
        getLCP((metric: any) => monitoring.logMetric({ name: 'lcp', value: metric.value }))
        getTTFB((metric: any) => monitoring.logMetric({ name: 'ttfb', value: metric.value }))
      }).catch(() => {
        // web-vitals not available, continue without it
      })
    } catch {
      // web-vitals not available, continue without it
    }
  }, 1000)

  // Monitor unhandled errors
  window.addEventListener('error', (event) => {
    monitoring.logError({
      error: event.error || new Error(event.message),
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      url: window.location.href,
      userAgent: window.navigator.userAgent,
    })
  })

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    monitoring.logError({
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      context: { type: 'unhandledrejection' },
      url: window.location.href,
      userAgent: window.navigator.userAgent,
    })
  })
}