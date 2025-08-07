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
    
    // Edge runtime doesn't support all integrations
    integrations: [
      // Limited integrations available in edge runtime
    ],
    
    // Edge-specific error filtering
    ignoreErrors: [
      // Ignore non-actionable edge errors
      'Edge Runtime Error',
    ],
    
    // Before sending event
    beforeSend(event, hint) {
      // Add edge context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: 'edge',
        },
      }
      
      // Tag as edge error for filtering
      event.tags = {
        ...event.tags,
        runtime: 'edge',
      }
      
      return event
    },
  })
}

// Helper for edge function error handling
export function captureEdgeError(
  error: Error,
  request: Request,
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('type', 'edge_error')
    scope.setContext('request', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    })
    
    if (context) {
      scope.setContext('edge', context)
    }
    
    Sentry.captureException(error)
  })
}