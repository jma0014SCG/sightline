/**
 * Safe integration module for usage guard middleware
 * This can be imported into summary.ts without breaking existing functionality
 */

import type { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

// Import new functionality
import { 
  ensureUsageAllowed as newEnsureUsageAllowed,
  recordUsageEvent as newRecordUsageEvent,
  recordAnonymousUsageEvent as newRecordAnonymousUsageEvent,
} from '../../middleware/usageGuard'

// Keep existing functionality as fallback
import {
  enforceAnonymousUsageLimit as existingEnforceAnonymousUsageLimit,
  recordAnonymousUsage as existingRecordAnonymousUsage,
} from './guards'

/**
 * Environment-based feature flag
 * Defaults to false for safety
 */
const ENABLE_NEW_USAGE_GUARD = process.env.ENABLE_NEW_USAGE_GUARD === 'true'

/**
 * Log migration status on module load
 */
if (ENABLE_NEW_USAGE_GUARD) {
  logger.info('🚀 New usage guard middleware is ENABLED')
} else {
  logger.info('📦 Using existing usage guard implementation (new middleware disabled)')
}

/**
 * Safe wrapper that uses new or existing implementation
 * Falls back gracefully on any error
 */
export async function enforceAnonymousUsageLimitSafe(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string
): Promise<void> {
  if (ENABLE_NEW_USAGE_GUARD) {
    try {
      // Try new implementation
      const headers = new Headers()
      headers.set('x-anon-fp', fingerprint)
      headers.set('x-forwarded-for', clientIP)
      
      const result = await newEnsureUsageAllowed(prisma, null, headers)
      
      if (!result.allowed) {
        const { TRPCError } = await import('@trpc/server')
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: result.reason || 'Usage limit exceeded',
        })
      }
      
      logger.debug('New usage guard check successful', {
        fingerprint,
        clientIP,
        allowed: result.allowed,
      })
    } catch (error) {
      // If new implementation fails, fall back to existing
      logger.warn('New usage guard failed, falling back to existing', { error })
      await existingEnforceAnonymousUsageLimit(prisma, fingerprint, clientIP)
    }
  } else {
    // Use existing implementation
    await existingEnforceAnonymousUsageLimit(prisma, fingerprint, clientIP)
  }
}

/**
 * Safe wrapper for recording anonymous usage
 * Falls back to existing implementation on error
 */
export async function recordAnonymousUsageSafe(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string,
  summaryId: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (ENABLE_NEW_USAGE_GUARD) {
    try {
      // Try new implementation
      const videoId = metadata?.videoId || 'unknown'
      await newRecordAnonymousUsageEvent(
        prisma,
        fingerprint,
        clientIP,
        summaryId,
        videoId,
        metadata
      )
      
      logger.debug('New usage event recording successful', {
        summaryId,
        fingerprint,
      })
    } catch (error) {
      // If new implementation fails, fall back to existing
      logger.warn('New usage event recording failed, falling back to existing', { error })
      await existingRecordAnonymousUsage(prisma, fingerprint, clientIP, summaryId, metadata)
    }
  } else {
    // Use existing implementation
    await existingRecordAnonymousUsage(prisma, fingerprint, clientIP, summaryId, metadata)
  }
}

/**
 * Helper function for authenticated usage checking
 * Returns true (allowed) by default when disabled or on error
 */
export async function checkAuthenticatedUsageSafe(
  prisma: PrismaClient,
  userId: string,
  headers: Headers
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number; plan?: any }> {
  if (!ENABLE_NEW_USAGE_GUARD) {
    // When disabled, return allowed
    return { allowed: true }
  }
  
  try {
    const result = await newEnsureUsageAllowed(prisma, userId, headers)
    
    logger.debug('New authenticated usage check', {
      userId,
      allowed: result.allowed,
      plan: result.plan,
      currentUsage: result.currentUsage,
      limit: result.limit,
    })
    
    return result
  } catch (error) {
    // On error, log but don't block
    logger.error('Authenticated usage check failed, allowing request', { error, userId })
    return { allowed: true }
  }
}

/**
 * Safe wrapper for recording authenticated usage events
 */
export async function recordUsageEventSafe(
  prisma: PrismaClient,
  userId: string,
  summaryId: string,
  videoId: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!ENABLE_NEW_USAGE_GUARD) {
    // When disabled, use existing pattern
    try {
      await prisma.usageEvent.create({
        data: {
          userId,
          eventType: 'summary_created',
          summaryId,
          videoId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      })
    } catch (error) {
      logger.error('Failed to record usage event (existing pattern)', { error, userId, summaryId })
    }
    return
  }
  
  try {
    await newRecordUsageEvent(prisma, userId, summaryId, videoId, metadata)
    logger.debug('New usage event recorded', { userId, summaryId })
  } catch (error) {
    // Try fallback pattern
    logger.warn('New usage event recording failed, using fallback', { error })
    try {
      await prisma.usageEvent.create({
        data: {
          userId,
          eventType: 'summary_created',
          summaryId,
          videoId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      })
    } catch (fallbackError) {
      logger.error('Failed to record usage event (both methods)', { 
        error: fallbackError, 
        userId, 
        summaryId 
      })
    }
  }
}

/**
 * Export a flag checker for conditional logic
 */
export function isNewUsageGuardEnabled(): boolean {
  return ENABLE_NEW_USAGE_GUARD
}

/**
 * Re-export existing functions for drop-in compatibility
 */
export { ANONYMOUS_USER_ID } from './guards'