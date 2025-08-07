# Monitoring and Error Tracking

This document describes the monitoring, error tracking, and performance measurement setup for Sightline.ai.

## Overview

The platform uses a comprehensive monitoring service that:
- Tracks errors with full context
- Measures performance metrics
- Logs user actions for analytics
- Monitors Core Web Vitals
- Integrates with Sentry when configured

## Configuration

### Environment Variables

```bash
# Optional - Sentry error tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional - External logging endpoint
LOGGING_ENDPOINT=https://your-logging-service.com/api/logs

# Optional - Analytics endpoint  
ANALYTICS_ENDPOINT=https://your-analytics-service.com/api/events

# Enable detailed health metrics
ENABLE_HEALTH_METRICS=true
```

### Sentry Setup

When `SENTRY_DSN` is configured, the monitoring service automatically:
- Captures exceptions with full context
- Sets user context for better debugging
- Groups errors by type and location
- Tracks performance metrics

## Usage

### Error Tracking

```typescript
import { logError, monitoring } from '@/lib/monitoring'

// Simple error logging
try {
  await riskyOperation()
} catch (error) {
  logError(error as Error, { 
    feature: 'video-processing',
    videoId: '12345' 
  })
}

// Detailed error logging with user context
monitoring.logError({
  error: new Error('Failed to process video'),
  context: {
    feature: 'video-processing',
    action: 'summarize',
    videoUrl: 'https://youtube.com/...'
  },
  user: {
    id: userId,
    email: userEmail
  }
})
```

### Performance Monitoring

```typescript
import { logApiCall, monitoring } from '@/lib/monitoring'

// Track API performance
const result = await logApiCall('createSummary', async () => {
  return await api.summary.create({ url })
})

// Track custom metrics
monitoring.logMetric({
  name: 'summary_generation_time',
  value: processingTime,
  tags: {
    videoLength: 'medium',
    plan: 'pro'
  }
})

// Track business metrics
monitoring.logBusinessMetric('summaries_created', 1, {
  plan: userPlan,
  source: 'web'
})
```

### User Action Tracking

```typescript
import { monitoring } from '@/lib/monitoring'

// Track user actions
monitoring.logUserAction('video_summarized', {
  videoId,
  duration: videoDuration,
  processingTime
})

// React hook for components
import { useErrorTracking } from '@/lib/monitoring'

function VideoSummary() {
  const { logError, logUserAction } = useErrorTracking()
  
  const handleSummarize = async () => {
    try {
      logUserAction('summarize_clicked')
      await summarizeVideo()
    } catch (error) {
      logError(error as Error, { component: 'VideoSummary' })
    }
  }
}
```

### Error Boundaries

```typescript
import { withErrorBoundary } from '@/lib/monitoring'

// Wrap async functions
const safeSummarizeVideo = withErrorBoundary(
  async (url: string) => {
    return await api.summary.create({ url })
  },
  { feature: 'video-summarization' }
)

// React Error Boundary integration
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    monitoring.logError({
      error,
      context: {
        componentStack: errorInfo.componentStack,
        feature: 'react-error-boundary'
      }
    })
  }
}
```

## Core Web Vitals

The monitoring service automatically tracks:
- **CLS** (Cumulative Layout Shift)
- **FID** (First Input Delay)
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **TTFB** (Time to First Byte)

Initialize in your app:
```typescript
import { startPerformanceMonitoring } from '@/lib/monitoring'

// In _app.tsx or layout.tsx
useEffect(() => {
  startPerformanceMonitoring()
}, [])
```

## Health Check Integration

The `/api/health` endpoint provides:
- Database connectivity status
- External service availability
- System metrics (memory, uptime)
- Response time headers

## Alert Thresholds

### Error Alerts
- **Critical**: Database connection failures
- **High**: Payment processing errors, API failures
- **Medium**: Slow API responses (>5s)
- **Low**: Client-side JavaScript errors

### Performance Alerts
- API response time > 5000ms
- Memory usage > 80%
- Error rate > 1% of requests

## Development vs Production

### Development Mode
- Detailed console logging with emojis
- Stack traces visible
- No external service calls
- Performance metrics logged to console

### Production Mode
- Sentry integration active
- External logging endpoints used
- Minimal console output
- Real user monitoring enabled

## Best Practices

1. **Always provide context** when logging errors
2. **Use appropriate log levels** (error, warning, info)
3. **Include user context** for easier debugging
4. **Track key business metrics** for insights
5. **Monitor performance** of critical paths
6. **Set up alerts** for important thresholds

## Privacy Considerations

- No sensitive data in error messages
- User emails/IDs only when necessary
- API keys and passwords never logged
- PII stripped from URLs and referrers

## Dashboards and Reporting

### Sentry Dashboard
- Real-time error tracking
- Error grouping and trends
- Performance monitoring
- Release tracking

### Custom Metrics
- Business KPIs dashboard
- API performance graphs
- User action analytics
- System health metrics

## Troubleshooting

### Common Issues

**Sentry not capturing errors**
- Verify SENTRY_DSN is set correctly
- Check network connectivity
- Ensure Sentry SDK is loaded

**Missing performance metrics**
- web-vitals package may not be installed
- Browser may not support Performance API
- Check Content Security Policy

**High memory usage alerts**
- Review recent deployments
- Check for memory leaks
- Monitor garbage collection

## Future Enhancements

1. **Distributed tracing** for API calls
2. **Session replay** for debugging
3. **Custom dashboards** for business metrics
4. **Automated alerting** with PagerDuty
5. **A/B test performance** tracking

---

Last Updated: 2025-01-09
Version: 1.0.0