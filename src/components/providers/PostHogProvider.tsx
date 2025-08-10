'use client'

import { PostHogProvider as PostHogProviderSDK } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize PostHog only on the client side
    if (typeof window !== 'undefined' && !isInitialized) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'always',
        // Enable session recordings for better user experience analysis
        session_recording: {
          maskAllInputs: true, // Mask sensitive input fields
          maskTextSelectors: ['[data-sensitive]'], // Custom masking
        },
        // Autocapture settings
        autocapture: {
          dom_event_allowlist: ['click', 'change', 'submit'],
          url_allowlist: [window.location.origin],
        },
        // Performance optimizations
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug()
        },
        // Privacy settings
        respect_dnt: true,
        opt_out_capturing_by_default: false,
        // Capture additional context
        property_denylist: ['$current_url'], // Remove sensitive properties if needed
      })

      // Set up additional tracking context
      posthog.register({
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
      })

      // Capture initial page view after initialization
      posthog.capture('$pageview')
      
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Return children wrapped in PostHogProvider only after initialization
  if (!isInitialized) {
    return <>{children}</>
  }

  return <PostHogProviderSDK client={posthog}>{children}</PostHogProviderSDK>
}