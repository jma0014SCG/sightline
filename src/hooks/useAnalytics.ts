'use client'

import { usePostHog } from 'posthog-js/react'
import { useUser } from '@clerk/nextjs'

export interface AnalyticsEventProperties {
  [key: string]: any
}

export interface SummaryCreatedProperties extends AnalyticsEventProperties {
  video_id: string
  video_title: string
  channel_name: string
  duration?: number
  user_plan: 'FREE' | 'PRO' | 'ANONYMOUS'
  is_anonymous: boolean
  processing_time_ms?: number
  success: boolean
  error_message?: string
}

export interface UserActionProperties extends AnalyticsEventProperties {
  action_type: string
  context?: string
  user_plan?: string
  page_url?: string
}

export interface ConversionProperties extends AnalyticsEventProperties {
  from_plan: 'ANONYMOUS' | 'FREE'
  to_plan: 'FREE' | 'PRO'
  conversion_funnel_step: string
  time_to_convert_hours?: number
}

export function useAnalytics() {
  const posthog = usePostHog()
  const { user, isSignedIn } = useUser()

  // Identify user for better tracking
  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (!posthog) return
    
    posthog.identify(userId, {
      email: user?.emailAddresses?.[0]?.emailAddress,
      plan: properties?.plan || 'FREE',
      created_at: user?.createdAt?.toISOString(),
      is_anonymous: false,
      ...properties
    })
  }

  // Track anonymous users
  const identifyAnonymousUser = (fingerprint: string, properties?: Record<string, any>) => {
    if (!posthog) return
    
    posthog.identify(`anonymous_${fingerprint}`, {
      is_anonymous: true,
      plan: 'ANONYMOUS',
      browser_fingerprint: fingerprint,
      ...properties
    })
  }

  // Core event tracking
  const track = (eventName: string, properties?: AnalyticsEventProperties) => {
    if (!posthog) return
    
    const enrichedProperties = {
      ...properties,
      user_id: user?.id,
      is_authenticated: isSignedIn,
      timestamp: new Date().toISOString(),
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    posthog.capture(eventName, enrichedProperties)
  }

  // Business-specific event tracking
  const trackSummaryCreated = (properties: SummaryCreatedProperties) => {
    track('summary_created', properties)
  }

  const trackSummaryViewed = (properties: { 
    summary_id: string
    video_id: string
    user_plan: string
    view_duration_seconds?: number
  }) => {
    track('summary_viewed', properties)
  }

  const trackUserSignup = (properties: { 
    signup_method: 'google' | 'email'
    came_from_anonymous: boolean
    first_action?: string
  }) => {
    track('user_signup', properties)
  }

  const trackSubscriptionUpgrade = (properties: ConversionProperties) => {
    track('subscription_upgrade', properties)
  }

  const trackLimitReached = (properties: {
    user_plan: 'FREE' | 'PRO' | 'ANONYMOUS'
    limit_type: 'lifetime' | 'monthly' | 'anonymous'
    current_usage: number
    limit_value: number
  }) => {
    track('usage_limit_reached', properties)
  }

  const trackFeatureUsed = (properties: {
    feature_name: string
    context?: string
    user_plan?: string
  }) => {
    track('feature_used', properties)
  }

  const trackSmartCollectionInteraction = (properties: {
    action: 'filter_by_tag' | 'filter_by_category' | 'view_tag_details'
    tag_name?: string
    tag_type?: string
    category_name?: string
  }) => {
    track('smart_collection_interaction', properties)
  }

  const trackErrorOccurred = (properties: {
    error_type: string
    error_message: string
    context: string
    user_plan?: string
    video_id?: string
  }) => {
    track('error_occurred', properties)
  }

  // Page tracking
  const trackPageView = (pageName: string, properties?: AnalyticsEventProperties) => {
    if (!posthog) return
    
    posthog.capture('$pageview', {
      page_name: pageName,
      ...properties
    })
  }

  // Feature flags (for future A/B testing)
  const getFeatureFlag = (flagName: string) => {
    if (!posthog) return false
    return posthog.getFeatureFlag(flagName)
  }

  const isFeatureEnabled = (flagName: string) => {
    if (!posthog) return false
    return posthog.isFeatureEnabled(flagName)
  }

  return {
    // Core functions
    track,
    identifyUser,
    identifyAnonymousUser,
    trackPageView,
    
    // Business event tracking
    trackSummaryCreated,
    trackSummaryViewed,
    trackUserSignup,
    trackSubscriptionUpgrade,
    trackLimitReached,
    trackFeatureUsed,
    trackSmartCollectionInteraction,
    trackErrorOccurred,
    
    // Feature flags
    getFeatureFlag,
    isFeatureEnabled,
    
    // Direct PostHog access for advanced use cases
    posthog,
  }
}