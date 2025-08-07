import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Integrations for server-side
    integrations: [
      // Automatic instrumentation for database queries
      Sentry.prismaIntegration(),
    ],
    
    // Server-specific error filtering
    ignoreErrors: [
      // Ignore client-side errors that somehow make it to server logs
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    
    // Before sending event
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (
        process.env.NODE_ENV === 'development' &&
        !process.env.SENTRY_SEND_IN_DEV
      ) {
        console.error('[Sentry Dev]', hint.originalException || event)
        return null
      }
      
      // Sanitize database errors
      if (event.exception?.values?.[0]?.type === 'PrismaClientKnownRequestError') {
        // Don't expose database schema in error messages
        if (event.exception.values[0].value) {
          event.exception.values[0].value = 'Database operation failed'
        }
      }
      
      // Add server context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: 'node',
          version: process.version,
        },
        app: {
          memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        },
      }
      
      return event
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (
        breadcrumb.category === 'console' &&
        breadcrumb.level === 'debug'
      ) {
        return null
      }
      
      // Enhance HTTP breadcrumbs
      if (breadcrumb.category === 'http') {
        // Don't log auth tokens in breadcrumbs
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.authorization
          delete breadcrumb.data.headers.cookie
        }
      }
      
      return breadcrumb
    },
  })
}

// Helper to capture API errors with context
export function captureApiError(
  error: Error,
  context: {
    endpoint?: string
    method?: string
    userId?: string
    traceId?: string
    [key: string]: any
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag('type', 'api_error')
    scope.setContext('api', context)
    
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }
    
    Sentry.captureException(error)
  })
}

// Helper to track API performance
export function trackApiPerformance(
  endpoint: string,
  duration: number,
  status: number
) {
  const activeSpan = Sentry.getActiveSpan()
  
  if (activeSpan) {
    const span = Sentry.startSpan(
      {
        op: 'http.server',
        name: endpoint,
      },
      () => {
        // Span operations would go here
      }
    )
    
    Sentry.setTag('http.status_code', status.toString())
    Sentry.setContext('performance', { endpoint, duration, status })
    
    // Alert on slow endpoints
    if (duration > 3000) {
      Sentry.setTag('slow_request', 'true')
    }
  }
}

// Helper for tracing database queries
export function traceDbQuery<T>(
  operation: string,
  query: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: operation,
      op: 'db.query',
    },
    async () => {
      try {
        const result = await query()
        return result
      } catch (error) {
        Sentry.captureException(error)
        throw error
      }
    }
  )
}