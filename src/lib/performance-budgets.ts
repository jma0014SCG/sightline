import { monitoring } from './monitoring'

// Performance budget thresholds
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals thresholds (Google recommended)
  CORE_WEB_VITALS: {
    LCP: { good: 2500, needs_improvement: 4000 }, // Largest Contentful Paint (ms)
    FID: { good: 100, needs_improvement: 300 },   // First Input Delay (ms) 
    INP: { good: 200, needs_improvement: 500 },   // Interaction to Next Paint (ms)
    CLS: { good: 0.1, needs_improvement: 0.25 },  // Cumulative Layout Shift
    FCP: { good: 1800, needs_improvement: 3000 }, // First Contentful Paint (ms)
    TTFB: { good: 800, needs_improvement: 1800 }, // Time to First Byte (ms)
  },
  
  // API response time budgets
  API_RESPONSE: {
    FAST: 500,      // Fast APIs (health checks, auth)
    NORMAL: 2000,   // Normal APIs (CRUD operations)
    SLOW: 5000,     // Slow APIs (AI processing, external calls)
    TIMEOUT: 30000, // Maximum timeout
  },
  
  // Business metrics budgets
  BUSINESS: {
    SUMMARY_CREATION: {
      TARGET: 45000,   // 45 seconds target
      WARNING: 60000,  // 60 seconds warning
      CRITICAL: 90000, // 90 seconds critical
    },
    AI_PROCESSING: {
      TARGET: 15000,   // 15 seconds target
      WARNING: 25000,  // 25 seconds warning
      CRITICAL: 45000, // 45 seconds critical
    },
    TRANSCRIPT_FETCH: {
      TARGET: 5000,    // 5 seconds target
      WARNING: 10000,  // 10 seconds warning
      CRITICAL: 20000, // 20 seconds critical
    },
  },
  
  // Resource budgets
  RESOURCES: {
    BUNDLE_SIZE: {
      JS_INITIAL: 250 * 1024,    // 250KB initial JS
      JS_TOTAL: 1000 * 1024,     // 1MB total JS
      CSS_TOTAL: 100 * 1024,     // 100KB total CSS
    },
    MEMORY: {
      WARNING: 100 * 1024 * 1024,  // 100MB warning
      CRITICAL: 200 * 1024 * 1024, // 200MB critical
    },
  },
}

interface PerformanceBudgetCheck {
  metric: string
  value: number
  threshold: number
  status: 'good' | 'needs_improvement' | 'poor' | 'critical'
  message: string
}

export class PerformanceBudgetMonitor {
  private static instance: PerformanceBudgetMonitor
  
  static getInstance(): PerformanceBudgetMonitor {
    if (!PerformanceBudgetMonitor.instance) {
      PerformanceBudgetMonitor.instance = new PerformanceBudgetMonitor()
    }
    return PerformanceBudgetMonitor.instance
  }
  
  /**
   * Check Core Web Vitals against budgets
   */
  checkWebVital(metric: string, value: number): PerformanceBudgetCheck {
    const budgets = PERFORMANCE_BUDGETS.CORE_WEB_VITALS
    const metricBudget = budgets[metric.toUpperCase() as keyof typeof budgets]
    
    if (!metricBudget) {
      return {
        metric,
        value,
        threshold: 0,
        status: 'good',
        message: `No budget defined for ${metric}`,
      }
    }
    
    let status: PerformanceBudgetCheck['status'] = 'good'
    let message = `${metric} is within budget`
    
    if (value > metricBudget.needs_improvement) {
      status = 'poor'
      message = `${metric} exceeds budget (${value}ms > ${metricBudget.needs_improvement}ms)`
    } else if (value > metricBudget.good) {
      status = 'needs_improvement'
      message = `${metric} needs improvement (${value}ms > ${metricBudget.good}ms)`
    }
    
    // Log budget violation
    if (status !== 'good') {
      monitoring.logError({
        error: new Error(`Performance budget violation: ${message}`),
        context: {
          type: 'performance_budget',
          metric,
          value,
          threshold: status === 'poor' ? metricBudget.needs_improvement : metricBudget.good,
          status,
        },
      })
    }
    
    return {
      metric,
      value,
      threshold: metricBudget.good,
      status,
      message,
    }
  }
  
  /**
   * Check API response time against budgets
   */
  checkApiResponse(endpoint: string, duration: number): PerformanceBudgetCheck {
    const budgets = PERFORMANCE_BUDGETS.API_RESPONSE
    
    // Determine expected performance tier based on endpoint
    let threshold = budgets.NORMAL
    let tier = 'normal'
    
    if (endpoint.includes('/health') || endpoint.includes('/auth')) {
      threshold = budgets.FAST
      tier = 'fast'
    } else if (endpoint.includes('/summarize') || endpoint.includes('/ai/')) {
      threshold = budgets.SLOW
      tier = 'slow'
    }
    
    let status: PerformanceBudgetCheck['status'] = 'good'
    let message = `API ${endpoint} responded within ${tier} budget`
    
    if (duration > budgets.TIMEOUT) {
      status = 'critical'
      message = `API ${endpoint} timeout (${duration}ms > ${budgets.TIMEOUT}ms)`
    } else if (duration > threshold * 2) {
      status = 'poor'
      message = `API ${endpoint} very slow (${duration}ms > ${threshold * 2}ms)`
    } else if (duration > threshold) {
      status = 'needs_improvement'
      message = `API ${endpoint} slow (${duration}ms > ${threshold}ms)`
    }
    
    // Log slow API calls
    if (status !== 'good') {
      monitoring.logError({
        error: new Error(`API performance issue: ${message}`),
        context: {
          type: 'api_performance',
          endpoint,
          duration,
          threshold,
          tier,
          status,
        },
      })
    }
    
    return {
      metric: `api_${endpoint}`,
      value: duration,
      threshold,
      status,
      message,
    }
  }
  
  /**
   * Check business metric against budgets
   */
  checkBusinessMetric(metric: string, duration: number): PerformanceBudgetCheck {
    const budgets = PERFORMANCE_BUDGETS.BUSINESS
    const metricBudget = budgets[metric.toUpperCase() as keyof typeof budgets]
    
    if (!metricBudget) {
      return {
        metric,
        value: duration,
        threshold: 0,
        status: 'good',
        message: `No budget defined for ${metric}`,
      }
    }
    
    let status: PerformanceBudgetCheck['status'] = 'good'
    let message = `${metric} completed within budget`
    
    if (duration > metricBudget.CRITICAL) {
      status = 'critical'
      message = `${metric} critical delay (${duration}ms > ${metricBudget.CRITICAL}ms)`
    } else if (duration > metricBudget.WARNING) {
      status = 'poor'
      message = `${metric} exceeded warning threshold (${duration}ms > ${metricBudget.WARNING}ms)`
    } else if (duration > metricBudget.TARGET) {
      status = 'needs_improvement'
      message = `${metric} exceeded target (${duration}ms > ${metricBudget.TARGET}ms)`
    }
    
    // Log business metric issues
    if (status !== 'good') {
      monitoring.logError({
        error: new Error(`Business metric issue: ${message}`),
        context: {
          type: 'business_performance',
          metric,
          duration,
          target: metricBudget.TARGET,
          warning: metricBudget.WARNING,
          critical: metricBudget.CRITICAL,
          status,
        },
      })
    }
    
    return {
      metric,
      value: duration,
      threshold: metricBudget.TARGET,
      status,
      message,
    }
  }
  
  /**
   * Get performance budget summary
   */
  getBudgetSummary(): {
    webVitals: typeof PERFORMANCE_BUDGETS.CORE_WEB_VITALS
    api: typeof PERFORMANCE_BUDGETS.API_RESPONSE
    business: typeof PERFORMANCE_BUDGETS.BUSINESS
    resources: typeof PERFORMANCE_BUDGETS.RESOURCES
  } {
    return {
      webVitals: PERFORMANCE_BUDGETS.CORE_WEB_VITALS,
      api: PERFORMANCE_BUDGETS.API_RESPONSE,
      business: PERFORMANCE_BUDGETS.BUSINESS,
      resources: PERFORMANCE_BUDGETS.RESOURCES,
    }
  }
}

export const performanceBudgets = PerformanceBudgetMonitor.getInstance()

// Helper functions for easy use
export const checkWebVital = (metric: string, value: number) =>
  performanceBudgets.checkWebVital(metric, value)

export const checkApiResponse = (endpoint: string, duration: number) =>
  performanceBudgets.checkApiResponse(endpoint, duration)

export const checkBusinessMetric = (metric: string, duration: number) =>
  performanceBudgets.checkBusinessMetric(metric, duration)