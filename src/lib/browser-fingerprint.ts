'use client'

/**
 * Generate a browser fingerprint for tracking anonymous users
 * 
 * Creates a unique identifier by combining multiple browser characteristics including
 * user agent, screen resolution, timezone, language preferences, platform info,
 * hardware specs, and canvas rendering. Used for anonymous user tracking without cookies.
 * 
 * @returns {Promise<string>} A unique fingerprint string based on browser characteristics
 * @example
 * ```typescript
 * const fingerprint = await generateBrowserFingerprint()
 * console.log(fingerprint) // "a7b8c9d0e1f2"
 * ```
 * 
 * @category Authentication
 * @since 1.0.0
 */
export async function generateBrowserFingerprint(): Promise<string> {
  const components: string[] = []

  // User agent
  components.push(navigator.userAgent)

  // Screen resolution
  components.push(`${window.screen.width}x${window.screen.height}`)
  components.push(`${window.screen.availWidth}x${window.screen.availHeight}`)
  components.push(`${window.screen.colorDepth}`)

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)
  components.push(new Date().getTimezoneOffset().toString())

  // Language
  components.push(navigator.language)
  components.push(navigator.languages.join(','))

  // Platform
  components.push(navigator.platform)

  // Hardware concurrency
  components.push(navigator.hardwareConcurrency?.toString() || 'unknown')

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('Browser Fingerprint', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Browser Fingerprint', 4, 17)
      components.push(canvas.toDataURL())
    }
  } catch (e) {
    components.push('canvas-error')
  }

  // Combine all components and hash
  const fingerprint = components.join('|||')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Check if user has already used their free summary
 * 
 * Checks localStorage to determine if the anonymous user has already consumed
 * their one free summary. Returns false if localStorage is unavailable or
 * if running on server-side. Used for enforcing anonymous usage limits.
 * 
 * @returns {boolean} True if free summary has been used, false otherwise
 * @example
 * ```typescript
 * if (hasUsedFreeSummary()) {
 *   // Prompt user to sign up
 *   showSignUpModal()
 * } else {
 *   // Allow free summary
 *   allowSummaryCreation()
 * }
 * ```
 * 
 * @category Authentication
 * @since 1.0.0
 */
export function hasUsedFreeSummary(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    return localStorage.getItem('hasUsedFreeSummary') === 'true'
  } catch {
    return false
  }
}

/**
 * Mark that user has used their free summary
 * 
 * Records in localStorage that the anonymous user has consumed their free summary,
 * along with a timestamp. This prevents multiple free summaries from the same browser.
 * Fails silently if localStorage is unavailable or if running on server-side.
 * 
 * @returns {void}
 * @example
 * ```typescript
 * // After successful summary creation for anonymous user
 * markFreeSummaryUsed()
 * 
 * // Now hasUsedFreeSummary() will return true
 * ```
 * 
 * @category Authentication
 * @since 1.0.0
 */
export function markFreeSummaryUsed(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('hasUsedFreeSummary', 'true')
    localStorage.setItem('freeSummaryUsedAt', new Date().toISOString())
  } catch {
    // Silent fail
  }
}

/**
 * Get stored browser fingerprint or generate new one
 * 
 * Retrieves the browser fingerprint from localStorage if available, otherwise generates
 * a new one and stores it. This ensures consistent identification across sessions while
 * maintaining user privacy. Returns a fallback value for server-side execution.
 * 
 * @returns {Promise<string>} The browser fingerprint string, or 'server-side' if unavailable
 * @example
 * ```typescript
 * const fingerprint = await getBrowserFingerprint()
 * 
 * // Use fingerprint for anonymous user tracking
 * const anonymousUser = {
 *   id: 'ANONYMOUS_USER',
 *   fingerprint: fingerprint
 * }
 * ```
 * 
 * @category Authentication
 * @since 1.0.0
 */
export async function getBrowserFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server-side'
  
  try {
    // Check if we have a stored fingerprint
    const stored = localStorage.getItem('browserFingerprint')
    if (stored) return stored
    
    // Generate new fingerprint
    const fingerprint = await generateBrowserFingerprint()
    localStorage.setItem('browserFingerprint', fingerprint)
    return fingerprint
  } catch {
    // Fallback to generating without storing
    return generateBrowserFingerprint()
  }
}