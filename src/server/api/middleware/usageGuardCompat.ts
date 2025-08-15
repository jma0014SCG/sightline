/**
 * Compatibility layer for gradual migration to usage guard middleware
 * This ensures existing code continues to work while we migrate
 */

import { 
  ensureUsageAllowed,
  recordUsageEvent,
  recordAnonymousUsageEvent,
  ANONYMOUS_USER_ID
} from './usageGuard'

import {
  enforceAnonymousUsageLimit as oldEnforceAnonymousUsageLimit,
  recordAnonymousUsage as oldRecordAnonymousUsage,
} from '../routers/summary/guards'

/**
 * Feature flag to control which implementation to use
 * Set via environment variable for easy rollback
 */
export const USE_NEW_USAGE_GUARD = process.env.USE_NEW_USAGE_GUARD === 'true'

/**
 * Compatibility wrapper for anonymous usage limit enforcement
 * Uses old or new implementation based on feature flag
 */
export async function enforceAnonymousUsageLimitCompat(
  prisma: any,
  fingerprint: string,
  clientIP: string
): Promise<void> {
  if (USE_NEW_USAGE_GUARD) {
    // Use new implementation
    const headers = new Headers()
    headers.set('x-anon-fp', fingerprint)
    headers.set('x-forwarded-for', clientIP)
    
    const result = await ensureUsageAllowed(prisma, null, headers)
    
    if (!result.allowed) {
      const { TRPCError } = await import('@trpc/server')
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: result.reason || 'Usage limit exceeded',
      })
    }
  } else {
    // Use existing implementation
    await oldEnforceAnonymousUsageLimit(prisma, fingerprint, clientIP)
  }
}

/**
 * Compatibility wrapper for recording anonymous usage
 * Uses old or new implementation based on feature flag
 */
export async function recordAnonymousUsageCompat(
  prisma: any,
  fingerprint: string,
  clientIP: string,
  summaryId: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (USE_NEW_USAGE_GUARD) {
    // Extract videoId from metadata if available
    const videoId = metadata?.videoId || 'unknown'
    
    // Use new implementation
    await recordAnonymousUsageEvent(
      prisma,
      fingerprint,
      clientIP,
      summaryId,
      videoId,
      metadata
    )
  } else {
    // Use existing implementation
    await oldRecordAnonymousUsage(
      prisma,
      fingerprint,
      clientIP,
      summaryId,
      metadata
    )
  }
}

/**
 * Safe wrapper for authenticated usage checking
 * Only uses new implementation when feature flag is enabled
 */
export async function checkAuthenticatedUsageSafe(
  prisma: any,
  userId: string,
  headers: Headers
): Promise<{ allowed: boolean; reason?: string; plan?: any; currentUsage?: number; limit?: number }> {
  if (!USE_NEW_USAGE_GUARD) {
    // Return allowed by default when feature is disabled
    // This ensures existing code path continues to work
    return { allowed: true }
  }
  
  try {
    const result = await ensureUsageAllowed(prisma, userId, headers)
    return result
  } catch (error) {
    // Log error but don't break existing functionality
    console.error('Usage guard check failed, allowing request:', error)
    return { allowed: true }
  }
}

/**
 * Export existing functions for backward compatibility
 */
export { ANONYMOUS_USER_ID } from './usageGuard'
export { 
  enforceAnonymousUsageLimit,
  recordAnonymousUsage 
} from '../routers/summary/guards'