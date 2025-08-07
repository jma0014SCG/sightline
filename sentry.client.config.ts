import * as Sentry from '@sentry/nextjs'
import { ErrorBoundary } from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production
    
    // Session Replay - only for errors in production
    replaysSessionSampleRate: 0, // No session replays by default
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0, // 10% on errors
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask sensitive content in replays
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],
    
    // Error filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors that users can't do anything about
      'Network request failed',
      'NetworkError',
      'ChunkLoadError',
      'Failed to fetch',
      // Clerk auth errors (handled by Clerk)
      'ClerkRuntimeError',
      // Stripe errors (handled by our error boundaries)
      'StripeCardError',
    ],
    
    // Before sending event to Sentry
    beforeSend(event, hint) {
      // Filter out non-actionable errors
      if (event.exception) {
        const error = hint.originalException
        
        // Don't send cancelled requests
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          return null
        }
        
        // Don't send browser extension errors
        if (event.exception.values?.[0]?.value?.includes('extension://')) {
          return null
        }
      }
      
      // Add custom context
      if (typeof window !== 'undefined') {
        event.contexts = {
          ...event.contexts,
          custom: {
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            screen: `${window.screen.width}x${window.screen.height}`,
            connection: (navigator as any).connection?.effectiveType || 'unknown',
          },
        }
      }
      
      return event
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Don't log console.debug breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null
      }
      
      // Enhance navigation breadcrumbs
      if (breadcrumb.category === 'navigation') {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString(),
        }
      }
      
      return breadcrumb
    },
  })
}

// Export error boundary component for use in app
export { ErrorBoundary }

// Helper to set user context when auth state changes
export function setSentryUser(user: {
  id: string
  email?: string
  name?: string
  plan?: string
} | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    })
    
    // Set custom tags for better filtering
    Sentry.setTag('user.plan', user.plan || 'free')
  } else {
    Sentry.setUser(null)
  }
}

// Helper to track custom events
export function trackSentryEvent(
  eventName: string,
  data?: Record<string, any>
) {
  Sentry.captureMessage(eventName, {
    level: 'info',
    tags: {
      type: 'custom_event',
      ...data,
    },
  })
}