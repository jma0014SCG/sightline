import { TRPCError } from '@trpc/server'
import { summarySchemas, ANONYMOUS_USER_ID, type CreateAnonymousInput, type GetByIdInput, type HealthResponse } from './summaryValidation'
import { extractVideoId, generateTaskId, isValidVideoIdFormat } from './summaryUtils'
import type { SummaryRouterDependencies, SummaryContext, BackendProcessingPayload } from './summaryTypes'

/**
 * Health check handler
 */
export function createHealthHandler() {
  return (): HealthResponse => {
    return { ok: true, layer: 'trpc' }
  }
}

/**
 * Anonymous summary creation handler
 */
export function createAnonymousHandler(deps: SummaryRouterDependencies) {
  return async (ctx: SummaryContext, input: CreateAnonymousInput) => {
    const { db, logger, monitoring, security, config } = deps
    const anonymousUserId = config?.anonymousUserId || ANONYMOUS_USER_ID
    
    try {
      // Sanitize and validate inputs
      const sanitizedUrl = security.sanitizeUrl(input.url)
      const sanitizedFingerprint = security.sanitizeText(input.browserFingerprint)
      
      // Additional security checks
      if (security.containsSuspiciousContent(sanitizedUrl) || 
          security.containsSuspiciousContent(sanitizedFingerprint)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input detected',
        })
      }

      const videoId = extractVideoId(sanitizedUrl)
      if (!videoId || !security.isValidYouTubeVideoId(videoId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid YouTube video URL',
        })
      }

      logger.info('Creating anonymous summary', { 
        videoId, 
        fingerprint: sanitizedFingerprint.substring(0, 8) 
      })

      // Check if anonymous user has already created a summary
      // Note: browserFingerprint logic will be handled elsewhere for anonymous users
      const existingAnonymousSummary = await db.summary.findFirst({
        where: {
          userId: anonymousUserId,
          // We'll use videoId for duplicate checking instead
        },
      })

      if (existingAnonymousSummary) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Anonymous users can only create one summary. Please sign up to create more.',
        })
      }

      // Check for duplicate video
      const existingSummary = await db.summary.findFirst({
        where: {
          videoId,
          userId: anonymousUserId,
        },
      })

      if (existingSummary) {
        logger.info('Found existing anonymous summary for video', { videoId })
        monitoring?.logBusinessMetric('summary_duplicate_request', 1, { 
          videoId, 
          userType: 'anonymous' 
        })
        
        return {
          ...existingSummary,
          isAnonymous: true,
          canSave: false,
          task_id: '', // taskId not in current schema
        }
      }

      // Ensure anonymous user exists
      await db.user.upsert({
        where: { id: anonymousUserId },
        update: {},
        create: {
          id: anonymousUserId,
          email: 'anonymous@sightline.ai',
          name: 'Anonymous User',
          emailVerified: new Date(),
        },
      })

      const task_id = generateTaskId()
      
      // Create summary record
      const summary = await db.summary.create({
        data: {
          userId: anonymousUserId,
          videoUrl: sanitizedUrl,
          videoId,
          videoTitle: `Video ${videoId}`,
          channelName: 'Unknown',
          channelId: 'unknown',
          duration: 0,
          content: '',
          // status field doesn't exist in current schema
        },
      })

      monitoring?.logBusinessMetric('summary_created', 1, { 
        videoId, 
        userType: 'anonymous',
        taskId: task_id 
      })

      logger.info('Anonymous summary created', { id: summary.id, taskId: task_id })

      // Trigger backend processing
      await triggerBackendProcessing({
        payload: {
          youtube_url: sanitizedUrl,
          task_id,
          anonymous: true,
          summary_id: summary.id,
        },
        backendUrl: config?.backendUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        logger
      })

      return {
        ...summary,
        isAnonymous: true,
        canSave: false,
        task_id,
      }
    } catch (error) {
      logger.error('Error in createAnonymous', { error, input })
      monitoring?.logError({
        error: error instanceof Error ? error : new Error('Unknown error in createAnonymous'),
        context: { input, userId: anonymousUserId },
      })
      
      if (error instanceof TRPCError) {
        throw error
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create summary',
      })
    }
  }
}

/**
 * Get summary by ID handler
 */
export function createGetByIdHandler(deps: SummaryRouterDependencies) {
  return async (ctx: any, input: GetByIdInput) => {
    const { logger, monitoring } = deps
    
    try {
      // Get the user ID from context (requires authentication)
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in to view summaries',
        })
      }

      logger.info('Fetching summary by ID', { summaryId: input.id, userId: ctx.userId })

      // Query summary with user ownership check for security - use ctx.prisma from tRPC context
      const summary = await ctx.prisma.summary.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId, // Ensure user can only access their own summaries
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })

      if (!summary) {
        logger.info('Summary not found or unauthorized', { summaryId: input.id, userId: ctx.userId })
        monitoring?.logBusinessMetric('summary_access_denied', 1, { 
          summaryId: input.id,
          userId: ctx.userId 
        })
        
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      logger.info('Summary retrieved successfully', { summaryId: input.id, userId: ctx.userId })
      monitoring?.logBusinessMetric('summary_viewed', 1, { 
        summaryId: input.id,
        userId: ctx.userId 
      })

      return summary
    } catch (error) {
      logger.error('Error in getById', { error, input, userId: ctx.userId })
      monitoring?.logError({
        error: error instanceof Error ? error : new Error('Unknown error in getById'),
        context: { input, userId: ctx.userId },
      })
      
      if (error instanceof TRPCError) {
        throw error
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve summary',
      })
    }
  }
}

/**
 * Trigger backend processing (separated for testability)
 */
async function triggerBackendProcessing({
  payload,
  backendUrl,
  logger
}: {
  payload: BackendProcessingPayload
  backendUrl: string
  logger: SummaryRouterDependencies['logger']
}) {
  try {
    const response = await fetch(`${backendUrl}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      logger.error('Backend processing failed', { status: response.status })
    }
  } catch (error) {
    logger.error('Failed to trigger backend processing', { error })
  }
}