'use client'

/**
 * Anonymous Usage Tracking Module
 * 
 * Provides lightweight client-side usage tracking for anonymous users
 * using localStorage and a simple device fingerprint.
 */

/**
 * Generate a lightweight device fingerprint using UA and timezone
 * This is intentionally simple to reduce complexity and improve performance
 */
export function generateSimpleFingerprint(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'server-side-fp'
  }

  const components: string[] = []
  
  // User agent (browser info)
  components.push(navigator.userAgent || 'unknown-ua')
  
  // Timezone (user's location indicator)
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-tz')
  } catch {
    components.push('unknown-tz')
  }
  
  // Simple hash function
  const str = components.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Get stored fingerprint or generate new one
 */
export async function getSimpleFingerprint(): Promise<string> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'server-side-fp'
  }
  
  try {
    // Check if we have a stored fingerprint
    const stored = localStorage.getItem('sl_fp')
    if (stored) return stored
    
    // Generate new fingerprint
    const fingerprint = generateSimpleFingerprint()
    localStorage.setItem('sl_fp', fingerprint)
    return fingerprint
  } catch {
    // Fallback to generating without storing
    return generateSimpleFingerprint()
  }
}

/**
 * Get the number of free summaries used
 */
export function getFreeSummariesUsed(): number {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 0
  }
  
  try {
    const value = localStorage.getItem('sl_free_used')
    return value ? parseInt(value, 10) || 0 : 0
  } catch {
    return 0
  }
}

/**
 * Increment the free summaries used counter
 */
export function incrementFreeSummariesUsed(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }
  
  try {
    const current = getFreeSummariesUsed()
    localStorage.setItem('sl_free_used', String(current + 1))
    localStorage.setItem('sl_free_used_at', new Date().toISOString())
  } catch {
    // Silent fail
  }
}

/**
 * Check if user has reached the free summary limit
 */
export function hasReachedFreeLimit(): boolean {
  return getFreeSummariesUsed() >= 1
}

/**
 * Get all anonymous usage tracking data
 */
export interface AnonymousUsageData {
  fingerprint: string
  freeSummariesUsed: number
  hasReachedLimit: boolean
}

export async function getAnonymousUsageData(): Promise<AnonymousUsageData> {
  const fingerprint = await getSimpleFingerprint()
  const freeSummariesUsed = getFreeSummariesUsed()
  
  return {
    fingerprint,
    freeSummariesUsed,
    hasReachedLimit: freeSummariesUsed >= 1,
  }
}

/**
 * Clear anonymous usage data (useful for testing)
 */
export function clearAnonymousUsageData(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }
  
  try {
    localStorage.removeItem('sl_fp')
    localStorage.removeItem('sl_free_used')
    localStorage.removeItem('sl_free_used_at')
  } catch {
    // Silent fail
  }
}