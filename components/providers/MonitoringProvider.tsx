'use client'

import { useEffect } from 'react'
import { startPerformanceMonitoring } from '@/lib/monitoring'

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Performance monitoring is available but disabled in development to avoid build issues
    if (process.env.NODE_ENV === 'production') {
      startPerformanceMonitoring()
      
      // Initialize error tracking only in production
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        try {
          // @ts-ignore - Optional dependency, dynamic import to avoid webpack issues
          const sentryPromise = Function('return import("@sentry/nextjs")')()
          sentryPromise.then((Sentry: any) => {
            Sentry.init({
              dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
              environment: process.env.NODE_ENV,
              tracesSampleRate: 0.1,
              debug: false,
              beforeSend(event: any) {
                // Filter out common non-critical errors
                if (event.exception) {
                  const error = event.exception.values?.[0]
                  if (error?.type === 'ChunkLoadError' || 
                      error?.value?.includes('Loading chunk') ||
                      error?.value?.includes('Network Error')) {
                    return null
                  }
                }
                return event
              },
            })
          }).catch((error: any) => {
            console.warn('Failed to initialize Sentry:', error)
          })
        } catch (error: any) {
          console.warn('Sentry not available:', error)
        }
      }
    }
  }, [])

  return <>{children}</>
}