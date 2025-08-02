'use client'

/**
 * Generate a browser fingerprint for tracking anonymous users
 * This combines multiple browser characteristics to create a unique identifier
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