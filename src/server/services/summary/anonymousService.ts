/**
 * Anonymous user summary management service
 * 
 * @module AnonymousService
 * @category Services
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'
import crypto from 'crypto'
import type { 
  AnonymousUserData, 
  ServiceResult, 
  ServiceError,
  ServiceErrorCode
} from './types'

// Constants
export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'
export const ANONYMOUS_SUMMARY_LIMIT = 1
export const ANONYMOUS_FINGERPRINT_PREFIX = 'anon_'

/**
 * Generate a unique anonymous user identifier
 * 
 * @param fingerprint - Browser fingerprint
 * @param ipAddress - User's IP address
 * @returns Hashed identifier for the anonymous user
 */
function generateAnonymousId(fingerprint: string, ipAddress: string): string {
  const combined = `${fingerprint}_${ipAddress}`
  const hash = crypto
    .createHash('sha256')
    .update(combined)
    .digest('hex')
    .substring(0, 16)
  
  return `${ANONYMOUS_FINGERPRINT_PREFIX}${hash}`
}

/**
 * Service for managing anonymous user summaries
 */
export class AnonymousService {
  /**
   * Check if an anonymous user exists
   * 
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns Whether the user exists
   */
  static async checkAnonymousUser(
    fingerprint: string,
    ipAddress: string
  ): Promise<boolean> {
    try {
      const anonymousId = generateAnonymousId(fingerprint, ipAddress)
      
      const existingSummary = await prisma.summary.findFirst({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['anonymousFingerprint'],
            equals: anonymousId
          }
        },
      })
      
      return !!existingSummary
    } catch (error) {
      logger.error('Failed to check anonymous user', { error, fingerprint })
      return false
    }
  }
  
  /**
   * Get anonymous user's summary count
   * 
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns Number of summaries created
   */
  static async getAnonymousSummaryCount(
    fingerprint: string,
    ipAddress: string
  ): Promise<number> {
    try {
      const anonymousId = generateAnonymousId(fingerprint, ipAddress)
      
      const count = await prisma.summary.count({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['anonymousFingerprint'],
            equals: anonymousId
          }
        },
      })
      
      return count
    } catch (error) {
      logger.error('Failed to get anonymous summary count', { error })
      return 0
    }
  }
  
  /**
   * Check if anonymous user has reached the limit
   * 
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns Whether the limit is reached
   */
  static async hasReachedLimit(
    fingerprint: string,
    ipAddress: string
  ): Promise<boolean> {
    const count = await this.getAnonymousSummaryCount(fingerprint, ipAddress)
    return count >= ANONYMOUS_SUMMARY_LIMIT
  }
  
  /**
   * Ensure the ANONYMOUS_USER exists in the database
   * 
   * @returns The anonymous user record
   */
  static async ensureAnonymousUser() {
    try {
      let anonymousUser = await prisma.user.findUnique({
        where: { id: ANONYMOUS_USER_ID },
      })
      
      if (!anonymousUser) {
        anonymousUser = await prisma.user.create({
          data: {
            id: ANONYMOUS_USER_ID,
            email: 'anonymous@example.com',
            name: 'Anonymous User',
          },
        })
        
        logger.info('Created ANONYMOUS_USER account')
      }
      
      return anonymousUser
    } catch (error) {
      logger.error('Failed to ensure anonymous user', { error })
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to initialize anonymous user system',
      })
    }
  }
  
  /**
   * Create an anonymous summary record
   * 
   * @param summaryData - Summary data to create
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns Created summary
   */
  static async createAnonymousSummary(
    summaryData: any,
    fingerprint: string,
    ipAddress: string
  ): Promise<ServiceResult<any>> {
    try {
      // Check limit
      if (await this.hasReachedLimit(fingerprint, ipAddress)) {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'You have already created your free summary. Please sign up for more.',
          },
        }
      }
      
      // Ensure anonymous user exists
      await this.ensureAnonymousUser()
      
      // Generate anonymous ID
      const anonymousId = generateAnonymousId(fingerprint, ipAddress)
      
      // Create summary
      const summary = await prisma.summary.create({
        data: {
          ...summaryData,
          userId: ANONYMOUS_USER_ID,
          metadata: {
            ...((summaryData.metadata as any) || {}),
            anonymousFingerprint: anonymousId,
            isAnonymous: true,
          },
        },
      })
      
      logger.info('Created anonymous summary', {
        summaryId: summary.id,
        fingerprint: anonymousId,
      })
      
      return {
        success: true,
        data: {
          ...summary,
          isAnonymous: true,
          canSave: false,
        },
      }
    } catch (error) {
      logger.error('Failed to create anonymous summary', { error })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to create anonymous summary',
          details: error,
        },
      }
    }
  }
  
  /**
   * Claim anonymous summaries for a user
   * 
   * @param userId - User ID to claim summaries for
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns Number of summaries claimed
   */
  static async claimAnonymousSummaries(
    userId: string,
    fingerprint: string,
    ipAddress: string
  ): Promise<ServiceResult<number>> {
    try {
      const anonymousId = generateAnonymousId(fingerprint, ipAddress)
      
      // Find all anonymous summaries for this fingerprint
      const summaries = await prisma.summary.findMany({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['anonymousFingerprint'],
            equals: anonymousId
          }
        },
      })
      
      if (summaries.length === 0) {
        return {
          success: true,
          data: 0,
        }
      }
      
      // Update summaries to belong to the user
      // Note: updateMany doesn't support JSON operations, so we need to update individually
      for (const summary of summaries) {
        await prisma.summary.update({
          where: { id: summary.id },
          data: {
            userId,
            metadata: {
              ...((summary.metadata as any) || {}),
              anonymousFingerprint: null,
              isAnonymous: false,
            },
          },
        })
      }
      
      const result = { count: summaries.length }
      
      logger.info('Claimed anonymous summaries', {
        userId,
        count: result.count,
        fingerprint: anonymousId,
      })
      
      return {
        success: true,
        data: result.count,
      }
    } catch (error) {
      logger.error('Failed to claim anonymous summaries', { error })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to claim anonymous summaries',
          details: error,
        },
      }
    }
  }
  
  /**
   * Get anonymous summaries for a fingerprint
   * 
   * @param fingerprint - Browser fingerprint
   * @param ipAddress - User's IP address
   * @returns List of anonymous summaries
   */
  static async getAnonymousSummaries(
    fingerprint: string,
    ipAddress: string
  ): Promise<ServiceResult<any[]>> {
    try {
      const anonymousId = generateAnonymousId(fingerprint, ipAddress)
      
      const summaries = await prisma.summary.findMany({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['anonymousFingerprint'],
            equals: anonymousId
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      return {
        success: true,
        data: summaries.map(s => ({
          ...s,
          isAnonymous: true,
          canSave: false,
        })),
      }
    } catch (error) {
      logger.error('Failed to get anonymous summaries', { error })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to retrieve anonymous summaries',
          details: error,
        },
      }
    }
  }
  
  /**
   * Clean up old anonymous summaries
   * 
   * @param daysOld - Number of days after which to delete summaries
   * @returns Number of summaries deleted
   */
  static async cleanupOldAnonymousSummaries(
    daysOld: number = 30
  ): Promise<ServiceResult<number>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      
      const result = await prisma.summary.deleteMany({
        where: {
          userId: ANONYMOUS_USER_ID,
          createdAt: {
            lt: cutoffDate,
          },
        },
      })
      
      logger.info('Cleaned up old anonymous summaries', {
        count: result.count,
        cutoffDate,
      })
      
      return {
        success: true,
        data: result.count,
      }
    } catch (error) {
      logger.error('Failed to cleanup anonymous summaries', { error })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to cleanup old summaries',
          details: error,
        },
      }
    }
  }
}