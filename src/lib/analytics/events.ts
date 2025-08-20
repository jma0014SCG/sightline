import { posthog } from '@/components/providers/PostHogProvider'
import * as Sentry from '@sentry/nextjs'

// Business event types
export enum EventName {
  // Summary events
  SUMMARY_CREATED = 'summary_created',
  SUMMARY_VIEWED = 'summary_viewed',
  SUMMARY_SHARED = 'summary_shared',
  SUMMARY_EXPORTED = 'summary_exported',
  SUMMARY_DELETED = 'summary_deleted',
  SUMMARY_ERROR = 'summary_error',
  
  // User events
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  
  // Subscription events
  PLAN_UPGRADED = 'plan_upgraded',
  PLAN_DOWNGRADED = 'plan_downgraded',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  
  // Feature usage
  FEATURE_USED = 'feature_used',
  SMART_COLLECTION_CREATED = 'smart_collection_created',
  TIMESTAMP_CLICKED = 'timestamp_clicked',
  FLASHCARD_STUDIED = 'flashcard_studied',
  QUIZ_COMPLETED = 'quiz_completed',
  
  // Error events
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  
  // Performance events
  SLOW_LOAD = 'slow_load',
  PERFORMANCE_METRIC = 'performance_metric',
}

// Event properties interfaces
interface BaseEventProperties {
  timestamp?: string
  session_id?: string
  user_id?: string
  [key: string]: any
}

interface SummaryEventProperties extends BaseEventProperties {
  summary_id?: string
  video_url?: string
  video_duration?: number
  processing_time?: number
  word_count?: number
  sections_count?: number
  source?: 'anonymous' | 'authenticated'
  plan?: 'free' | 'pro' | 'enterprise'
}

interface SubscriptionEventProperties extends BaseEventProperties {
  plan_from?: string
  plan_to?: string
  mrr_change?: number
  price?: number
  currency?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

interface FeatureEventProperties extends BaseEventProperties {
  feature_name: string
  feature_category?: string
  user_plan?: string
  metadata?: Record<string, any>
}

interface ErrorEventProperties extends BaseEventProperties {
  error_type: string
  error_message?: string
  error_code?: string
  affected_feature?: string
  stack_trace?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface PerformanceEventProperties extends BaseEventProperties {
  metric_name: string
  value: number
  unit?: string
  page?: string
  threshold_exceeded?: boolean
}

// Analytics service class
class AnalyticsService {
  private static instance: AnalyticsService
  private isEnabled: boolean

  constructor() {
    this.isEnabled = !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  /**
   * Track a business event
   */
  track(eventName: EventName | string, properties?: BaseEventProperties) {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      // Add common properties
      const enrichedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      }

      // Send to PostHog
      posthog.capture(eventName, enrichedProperties)

      // Also log to Sentry as breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: eventName,
        level: 'info',
        data: enrichedProperties,
      })

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Event: ${eventName}`, enrichedProperties)
      }
    } catch (error) {
      console.error('Failed to track event:', error)
      Sentry.captureException(error, {
        tags: {
          component: 'analytics',
          event: eventName,
        },
      })
    }
  }

  /**
   * Track summary creation
   */
  trackSummaryCreated(props: SummaryEventProperties) {
    this.track(EventName.SUMMARY_CREATED, {
      ...props,
      $value: props.processing_time, // For funnel analysis
    })
  }

  /**
   * Track user signup
   */
  trackUserSignup(source?: string, referrer?: string) {
    this.track(EventName.USER_SIGNUP, {
      source,
      referrer,
      signup_date: new Date().toISOString(),
    })

    // Set user properties for cohort analysis
    if (typeof window !== 'undefined') {
      posthog.setPersonProperties({
        signup_date: new Date().toISOString(),
        signup_source: source,
      })
    }
  }

  /**
   * Track subscription changes
   */
  trackPlanChange(props: SubscriptionEventProperties) {
    const eventName = props.mrr_change && props.mrr_change > 0 
      ? EventName.PLAN_UPGRADED 
      : EventName.PLAN_DOWNGRADED

    this.track(eventName, {
      ...props,
      $revenue: props.mrr_change, // For revenue tracking
    })
  }

  /**
   * Track feature usage
   */
  trackFeatureUsed(props: FeatureEventProperties) {
    this.track(EventName.FEATURE_USED, props)
  }

  /**
   * Track errors
   */
  trackError(props: ErrorEventProperties) {
    this.track(EventName.ERROR_OCCURRED, props)

    // Also send to Sentry for error tracking
    if (props.severity === 'high' || props.severity === 'critical') {
      Sentry.captureMessage(props.error_message || 'Unknown error', {
        level: props.severity === 'critical' ? 'error' : 'warning',
        tags: {
          error_type: props.error_type,
          affected_feature: props.affected_feature,
        },
      })
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(props: PerformanceEventProperties) {
    this.track(EventName.PERFORMANCE_METRIC, props)

    // Alert on threshold violations
    if (props.threshold_exceeded) {
      this.trackError({
        error_type: 'performance_threshold_exceeded',
        error_message: `${props.metric_name} exceeded threshold: ${props.value}${props.unit || ''}`,
        affected_feature: props.page,
        severity: 'medium',
      })
    }
  }

  /**
   * Identify user (call after login)
   */
  identify(userId: string, properties?: Record<string, any>) {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      posthog.identify(userId, properties)
    } catch (error) {
      console.error('Failed to identify user:', error)
    }
  }

  /**
   * Reset user (call after logout)
   */
  reset() {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      posthog.reset()
    } catch (error) {
      console.error('Failed to reset analytics:', error)
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>) {
    if (!this.isEnabled || typeof window === 'undefined') return

    try {
      posthog.setPersonProperties(properties)
    } catch (error) {
      console.error('Failed to set user properties:', error)
    }
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance()

// Export types for use in components
export type {
  BaseEventProperties,
  SummaryEventProperties,
  SubscriptionEventProperties,
  FeatureEventProperties,
  ErrorEventProperties,
  PerformanceEventProperties,
}