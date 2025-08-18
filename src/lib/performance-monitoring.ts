/**
 * Performance monitoring configuration for production
 */

import { type NextWebVitalsMetric } from 'next/app';

// Performance thresholds based on Core Web Vitals
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP)
  LCP: {
    good: 2500,      // < 2.5s
    needsImprovement: 4000,  // 2.5s - 4s
    // > 4s is poor
  },
  // First Input Delay (FID)
  FID: {
    good: 100,       // < 100ms
    needsImprovement: 300,   // 100ms - 300ms
    // > 300ms is poor
  },
  // Cumulative Layout Shift (CLS)
  CLS: {
    good: 0.1,       // < 0.1
    needsImprovement: 0.25,  // 0.1 - 0.25
    // > 0.25 is poor
  },
  // Time to First Byte (TTFB)
  TTFB: {
    good: 800,       // < 800ms
    needsImprovement: 1800,  // 800ms - 1800ms
    // > 1800ms is poor
  },
  // First Contentful Paint (FCP)
  FCP: {
    good: 1800,      // < 1.8s
    needsImprovement: 3000,  // 1.8s - 3s
    // > 3s is poor
  },
};

/**
 * Get performance rating based on metric value
 */
export function getPerformanceRating(
  metricName: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
  
  if (!threshold) {
    return 'good'; // Default to good for unknown metrics
  }
  
  if (value <= threshold.good) {
    return 'good';
  } else if (value <= threshold.needsImprovement) {
    return 'needs-improvement';
  }
  
  return 'poor';
}

/**
 * Report web vitals to analytics service
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Get performance rating
  const rating = getPerformanceRating(metric.name, metric.value);
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating,
      unit: getMetricUnit(metric.name),
    });
  }
  
  // Send to analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      event_category: 'Web Vitals',
      non_interaction: true,
      performance_rating: rating,
    });
  }
  
  // Send to Vercel Analytics
  if (typeof window !== 'undefined' && window.vercelAnalytics) {
    window.vercelAnalytics.track('Web Vitals', {
      metric: metric.name,
      value: metric.value,
      rating,
    });
  }
  
  // Send to Sentry for performance monitoring
  if (window.Sentry && metric.name !== 'Next.js-hydration') {
    const transaction = window.Sentry.getCurrentHub().getScope()?.getTransaction();
    if (transaction) {
      transaction.setMeasurement(
        metric.name,
        metric.value,
        getMetricUnit(metric.name)
      );
    }
  }
  
  // Alert on poor performance
  if (rating === 'poor' && process.env.NODE_ENV === 'production') {
    console.warn(`[Performance Alert] Poor ${metric.name} performance:`, metric.value);
    
    // You could send this to an error tracking service
    if (window.Sentry) {
      window.Sentry.captureMessage(
        `Poor ${metric.name} performance: ${metric.value}`,
        'warning'
      );
    }
  }
}

/**
 * Get the unit for a metric
 */
function getMetricUnit(metricName: string): string {
  switch (metricName) {
    case 'CLS':
      return 'score';
    case 'FCP':
    case 'LCP':
    case 'TTFB':
    case 'FID':
      return 'millisecond';
    default:
      return 'none';
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Log tasks longer than 50ms
          if (entry.duration > 50) {
            console.warn('[Long Task]', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
            
            // Report to analytics
            if (window.gtag) {
              window.gtag('event', 'long_task', {
                value: Math.round(entry.duration),
                event_category: 'Performance',
                non_interaction: true,
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Browser doesn't support long task monitoring
      console.debug('Long task monitoring not supported');
    }
  }
  
  // Monitor resource loading
  if ('PerformanceObserver' in window) {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Check for slow resources (> 1s)
          if (entry.duration > 1000) {
            console.warn('[Slow Resource]', {
              name: entry.name,
              duration: entry.duration,
              type: (entry as any).initiatorType,
            });
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // Browser doesn't support resource monitoring
      console.debug('Resource monitoring not supported');
    }
  }
}

// Type declarations for global analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    vercelAnalytics?: {
      track: (event: string, properties?: Record<string, any>) => void;
    };
    Sentry?: any;
  }
}