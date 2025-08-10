/**
 * Summary API router - refactored to use service layer
 * 
 * @module SummaryRouter
 * @category API
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { logger } from '@/lib/logger'
import { monitoring } from '@/lib/monitoring'
import {
  ValidationService,
  AnonymousService,
  ProgressService,
  SummaryService,
  ServiceErrorCode,
} from '@/server/services/summary'

/**
 * Input validation schemas
 */
const createAnonymousSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .min(1, 'URL is required')
    .max(2048, 'URL too long'),
  browserFingerprint: z.string()
    .min(1, 'Browser fingerprint is required'),
})

const createSummarySchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .min(1, 'URL is required')
    .max(2048, 'URL too long'),
})

const updateSummarySchema = z.object({
  id: z.string().min(1, 'Summary ID is required'),
  videoTitle: z.string().optional(),
  channelTitle: z.string().optional(),
  tldr: z.string().optional(),
  keyTakeaways: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
})

const getSummarySchema = z.object({
  id: z.string().min(1, 'Summary ID is required'),
})

const deleteSummarySchema = z.object({
  id: z.string().min(1, 'Summary ID is required'),
})

const claimAnonymousSchema = z.object({
  browserFingerprint: z.string().min(1, 'Browser fingerprint is required'),
})

const getAllSummariesSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'videoTitle']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Convert service errors to tRPC errors
 */
function serviceErrorToTrpcError(error: any): TRPCError {
  const serviceCode = error.code as ServiceErrorCode
  
  switch (serviceCode) {
    case 'VALIDATION_FAILED':
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
        cause: error.details,
      })
    case 'NOT_FOUND':
      return new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
      })
    case 'UNAUTHORIZED':
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: error.message,
      })
    case 'QUOTA_EXCEEDED':
    case 'RATE_LIMIT_EXCEEDED':
      return new TRPCError({
        code: 'FORBIDDEN',
        message: error.message,
      })
    case 'PROCESSING_FAILED':
    case 'EXTERNAL_SERVICE_ERROR':
    default:
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An error occurred while processing your request',
        cause: error.details,
      })
  }
}

export const summaryRouter = createTRPCRouter({
  /**
   * Create video summary for anonymous users without authentication
   */
  createAnonymous: publicProcedure
    .input(createAnonymousSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()
      
      try {
        // Get client IP for tracking from headers
        const clientIp = ctx.headers.get('x-forwarded-for')?.split(',')[0] ||
          ctx.headers.get('x-real-ip') ||
          ctx.headers.get('cf-connecting-ip') ||
          'unknown'
        
        // Create anonymous summary using service
        const result = await AnonymousService.createAnonymousSummary(
          {
            url: input.url,
            status: 'processing',
            createdAt: new Date(),
          },
          input.browserFingerprint,
          clientIp
        )
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/createAnonymous',
          Date.now() - startTime,
          200
        )
        
        logger.info('Created anonymous summary', {
          summaryId: result.data?.id,
          fingerprint: input.browserFingerprint,
        })
        
        return result.data
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/createAnonymous', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Anonymous summary creation failed', { error })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create summary',
        })
      }
    }),

  /**
   * Create video summary for authenticated users
   */
  create: protectedProcedure
    .input(createSummarySchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        const result = await SummaryService.createSummary(
          { url: input.url },
          userId
        )
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/create',
          Date.now() - startTime,
          200
        )
        
        logger.info('Created summary', {
          summaryId: result.data?.id,
          userId,
        })
        
        return result.data
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/create', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Summary creation failed', { error, userId })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create summary',
        })
      }
    }),

  /**
   * Get summary progress stream (WebSocket/SSE-like functionality)
   */
  createStream: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .subscription(({ input }) => {
      return ProgressService.createProgressObservable(input.taskId)
    }),

  /**
   * Get a specific summary by ID
   */
  getById: protectedProcedure
    .input(getSummarySchema)
    .query(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        const result = await SummaryService.getSummary(input.id, userId)
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/getById',
          Date.now() - startTime,
          200
        )
        
        return result.data
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/getById', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Get summary failed', { error, summaryId: input.id })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve summary',
        })
      }
    }),

  /**
   * Update an existing summary
   */
  update: protectedProcedure
    .input(updateSummarySchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        const result = await SummaryService.updateSummary(input, userId)
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/update',
          Date.now() - startTime,
          200
        )
        
        logger.info('Updated summary', {
          summaryId: input.id,
          userId,
        })
        
        return result.data
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/update', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Summary update failed', { error, summaryId: input.id })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update summary',
        })
      }
    }),

  /**
   * Delete a summary
   */
  delete: protectedProcedure
    .input(deleteSummarySchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        const result = await SummaryService.deleteSummary(input.id, userId)
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/delete',
          Date.now() - startTime,
          200
        )
        
        logger.info('Deleted summary', {
          summaryId: input.id,
          userId,
        })
        
        return { success: true }
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/delete', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Summary deletion failed', { error, summaryId: input.id })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete summary',
        })
      }
    }),

  /**
   * Claim anonymous summaries for authenticated user
   */
  claimAnonymous: protectedProcedure
    .input(claimAnonymousSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        // Get client IP for tracking from headers
        const clientIp = ctx.headers.get('x-forwarded-for')?.split(',')[0] ||
          ctx.headers.get('x-real-ip') ||
          ctx.headers.get('cf-connecting-ip') ||
          'unknown'
        
        const result = await AnonymousService.claimAnonymousSummaries(
          userId,
          input.browserFingerprint,
          clientIp
        )
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/claimAnonymous',
          Date.now() - startTime,
          200
        )
        
        logger.info('Claimed anonymous summaries', {
          userId,
          count: result.data,
        })
        
        return { claimed: result.data || 0 }
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/claimAnonymous', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Claim anonymous summaries failed', { error, userId })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to claim summaries',
        })
      }
    }),

  /**
   * Get all summaries for authenticated user with pagination and filters
   */
  getAll: protectedProcedure
    .input(getAllSummariesSchema)
    .query(async ({ ctx, input }) => {
      const startTime = Date.now()
      const userId = ctx.user.id
      
      try {
        const result = await SummaryService.getUserSummaries(userId, {
          limit: input.limit,
          cursor: input.cursor,
          search: input.search,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
          categories: input.categories,
          tags: input.tags,
        })
        
        if (!result.success) {
          throw serviceErrorToTrpcError(result.error)
        }
        
        // Log performance
        monitoring.logApiPerformance(
          '/summary/getAll',
          Date.now() - startTime,
          200
        )
        
        return result.data
        
      } catch (error) {
        const duration = Date.now() - startTime
        monitoring.logApiPerformance('/summary/getAll', duration, 500)
        
        if (error instanceof TRPCError) {
          throw error
        }
        
        logger.error('Get all summaries failed', { error, userId })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve summaries',
        })
      }
    }),
})