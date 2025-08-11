// Client-side monitoring utilities - safe for client components

// OpenTelemetry kill switch - allows disabling OTel without breaking the app
export const OTEL_ENABLED = process.env.NEXT_PUBLIC_OTEL === '1' || process.env.OTEL_ENABLED === '1'

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

class ClientMonitoringService {
  private static instance: ClientMonitoringService
  private isProduction = process.env.NODE_ENV === 'production'

  static getInstance(): ClientMonitoringService {
    if (!ClientMonitoringService.instance) {
      ClientMonitoringService.instance = new ClientMonitoringService()
    }
    return ClientMonitoringService.instance
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

  private async sendMetric(metric: MetricEvent) {
    try {
      // Send to analytics service
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
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

export const monitoring = ClientMonitoringService.getInstance()

// Client-side performance monitoring (called from components)
export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return
  
  // Skip performance monitoring if OTel is disabled
  if (!OTEL_ENABLED) {
    console.log('📡 Performance monitoring disabled (OTEL_ENABLED=false)')
    return
  }

  // Monitor Core Web Vitals with performance budget checking
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
    const handleWebVital = (metric: any) => {
      monitoring.logMetric({ 
        name: `web_vitals_${metric.name.toLowerCase()}`, 
        value: metric.value,
        tags: { 
          name: metric.name,
          rating: metric.rating,
          id: metric.id,
        }
      })
    }
    
    onCLS(handleWebVital)
    onFID(handleWebVital)
    onFCP(handleWebVital)
    onLCP(handleWebVital)
    onTTFB(handleWebVital)
    onINP(handleWebVital)
  }).catch(() => {
    console.warn('Web Vitals not available')
  })

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