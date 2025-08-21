'use client'

import { PostHogProvider as PostHogProviderSDK } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import posthog from 'posthog-js'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useSearchParams } from 'next/navigation'

// Only initialize PostHog if key is provided
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only', // Only create profiles for identified users
    capture_pageview: false, // We'll handle this manually for better control
    capture_pageleave: true,
    // Enable session recordings for better user experience analysis
    session_recording: {
      maskAllInputs: true, // Mask sensitive input fields
      maskTextContent: false,
      recordCanvas: false,
      recordCrossOriginIframes: false,
      maskTextSelector: '[data-sensitive]', // Mask elements marked as sensitive
      unmaskTextSelector: '[data-unmask]',
    },
    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'],
      css_selector_allowlist: ['[data-track]', '[data-ph-capture]'], // Only capture marked elements
    },
    // Performance optimizations
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('PostHog loaded with ID:', posthog.get_distinct_id())
      }
    },
    // Privacy settings
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    // Sanitize properties to remove PII
    sanitize_properties: (properties) => {
      const sanitized = { ...properties }
      // Remove potential PII fields
      delete sanitized.email
      delete sanitized.password
      delete sanitized.credit_card
      // Mask API keys
      if (sanitized.api_key) {
        sanitized.api_key = 'REDACTED'
      }
      return sanitized
    },
  })
}

function PostHogProviderInner({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Identify user when authenticated
  useEffect(() => {
    if (!POSTHOG_KEY) return

    if (isSignedIn && userId) {
      // Identify the user
      posthog.identify(userId, {
        // Add user properties (non-PII)
        sign_up_date: new Date().toISOString(),
      })
      
      // Set user properties for better segmentation
      posthog.setPersonProperties({
        authenticated: true,
      })
    } else {
      // Reset when user signs out
      if (posthog.get_distinct_id()?.startsWith('user_')) {
        posthog.reset()
      }
    }
  }, [isSignedIn, userId])

  // Track page views
  useEffect(() => {
    if (!POSTHOG_KEY) return

    // Construct full URL
    const url = `${pathname}${searchParams ? `?${searchParams.toString()}` : ''}`
    
    // Track page view with metadata
    posthog.capture('$pageview', {
      $current_url: url,
      $pathname: pathname,
      authenticated: !!userId,
    })
  }, [pathname, searchParams, userId])

  // Set up global tracking context
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog && POSTHOG_KEY) {
      posthog.register({
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
      })
    }
  }, [])

  // Skip provider if PostHog is not configured
  if (!POSTHOG_KEY) {
    return <>{children}</>
  }

  return <PostHogProviderSDK client={posthog}>{children}</PostHogProviderSDK>
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Skip provider if PostHog is not configured
  if (!POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <PostHogProviderInner>{children}</PostHogProviderInner>
    </Suspense>
  )
}

// Export posthog instance for direct usage
export { posthog }