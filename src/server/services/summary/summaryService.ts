/**
 * Core summary CRUD operations and business logic service
 * 
 * @module SummaryService
 * @category Services
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { TRPCError } from '@trpc/server'
import { monitoring } from '@/lib/monitoring'
import { checkBusinessMetric } from '@/lib/performance-budgets'
import { classifySummaryContent } from '@/lib/classificationService'
// import { emailService } from '@/lib/emailService'
import jwt from 'jsonwebtoken'
import type { 
  CreateSummaryInput, 
  UpdateSummaryInput, 
  ServiceResult, 
  EnrichedSummary,
  SummaryCreationOptions,
  ServiceError,
  ServiceErrorCode 
} from './types'
import { ValidationService } from './validationService'
import { ProgressService, PROGRESS_STAGES } from './progressService'

/**
 * Interface for summary creation with backend processing
 */
interface BackendProcessingOptions {
  taskId: string
  skipQueue?: boolean
  priority?: 'low' | 'normal' | 'high'
}

/**
 * Service for core summary operations
 */
export class SummaryService {
  /**
   * Create a new summary for an authenticated user
   * 
   * @param input - Summary creation input
   * @param userId - User ID
   * @param options - Creation options
   * @returns Service result with created summary
   */
  static async createSummary(
    input: CreateSummaryInput,
    userId: string,
    options: SummaryCreationOptions = {}
  ): Promise<ServiceResult<EnrichedSummary>> {
    const startTime = Date.now()
    const taskId = ProgressService.generateTaskId()
    
    try {
      // Initialize progress tracking
      ProgressService.initializeProgress(taskId)
      
      // Validate input
      const validation = ValidationService.validateSummaryCreation(
        input.url
      )
      
      if (!validation.isValid) {
        ProgressService.failProgress(taskId, {
          message: validation.errors.join(', ')
        })
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors[0] || 'Invalid input',
            details: validation.errors,
          },
        }
      }
      
      // Check user's subscription limits
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      
      if (!user) {
        ProgressService.failProgress(taskId, { message: 'User not found' })
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        }
      }
      
      // Check usage limits
      const usageLimitCheck = await this.checkUsageLimits(user)
      if (!usageLimitCheck.canCreate) {
        ProgressService.failProgress(taskId, { message: usageLimitCheck.reason })
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: usageLimitCheck.reason || 'Usage limit exceeded',
          },
        }
      }
      
      // Update progress
      ProgressService.updateProgress(taskId, PROGRESS_STAGES.FETCHING_VIDEO)
      
      // Call Python backend synchronously to get video data
      logger.info('Calling Python backend synchronously', { taskId, url: input.url })
      ProgressService.updateProgress(taskId, PROGRESS_STAGES.EXTRACTING_TRANSCRIPT)
      
      const backendResponse = await this.callPythonBackend({
        url: input.url,
        task_id: taskId,
        summary_id: 'temp', // Will be replaced with actual summary ID
      })
      
      if (!backendResponse.success) {
        ProgressService.failProgress(taskId, { message: backendResponse.error || 'Backend processing failed' })
        return {
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: backendResponse.error || 'Failed to process video',
          },
        }
      }
      
      // Validate that we got the required data from Python backend
      if (!backendResponse.data || !backendResponse.data.video_title || !backendResponse.data.summary) {
        logger.error('Invalid response from Python backend', { 
          taskId, 
          hasData: !!backendResponse.data,
          hasTitle: !!backendResponse.data?.video_title,
          hasSummary: !!backendResponse.data?.summary 
        })
        ProgressService.failProgress(taskId, { message: 'Invalid response from backend' })
        return {
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: 'Invalid response from video processing service',
          },
        }
      }
      
      // Create summary record in database with REAL DATA from Python backend
      ProgressService.updateProgress(taskId, PROGRESS_STAGES.CLASSIFYING_CONTENT)
      
      const summaryData = {
        userId,
        videoUrl: input.url,
        videoId: validation.metadata?.videoId || backendResponse.data.video_id || '',
        videoTitle: backendResponse.data.video_title || 'Unknown Title',
        channelName: backendResponse.data.channel_name || 'Unknown Channel',
        channelId: backendResponse.data.channel_id || '',
        duration: backendResponse.data.duration || 0,
        thumbnailUrl: backendResponse.data.thumbnail_url || null,
        content: backendResponse.data.summary || 'No content available',
        keyPoints: backendResponse.data.key_points || null,
        // Enhanced YouTube metadata
        viewCount: backendResponse.data.view_count || null,
        likeCount: backendResponse.data.like_count || null,
        commentCount: backendResponse.data.comment_count || null,
        uploadDate: backendResponse.data.upload_date ? new Date(backendResponse.data.upload_date) : null,
        description: backendResponse.data.description || null,
        // Rich content sections from Gumloop processing
        synopsis: backendResponse.data.synopsis || (backendResponse.data.metadata?.synopsis) || null,
        keyMoments: backendResponse.data.key_moments || null,
        frameworks: backendResponse.data.frameworks || null,
        debunkedAssumptions: backendResponse.data.debunked_assumptions || null,
        inPractice: backendResponse.data.in_practice || null,
        playbooks: backendResponse.data.playbooks || null,
        learningPack: backendResponse.data.learning_pack || null,
        thinkingStyle: backendResponse.data.thinking_style || null,
        enrichment: backendResponse.data.enrichment || null,
        processingSource: backendResponse.data.is_gumloop ? 'gumloop' : 'standard',
        processingVersion: backendResponse.data.processing_version || null,
      }
      
      const summary = await prisma.summary.create({
        data: summaryData,
        include: {
          user: true,
        },
      })
      
      logger.info('Created summary with real data', {
        summaryId: summary.id,
        userId,
        taskId,
        videoTitle: summary.videoTitle,
        contentLength: summary.content.length,
      })
      
      // Run classification in the background (don't wait for it to complete)
      // This should not block summary creation or affect user experience
      classifySummaryContent(summary.id, summary.content, summary.videoTitle)
        .catch((error) => {
          logger.warn('Classification failed for summary', { summaryId: summary.id, error })
          // Don't throw - classification failures should not affect summary creation
        })
      
      // Complete progress tracking
      ProgressService.completeProgress(taskId, { summaryId: summary.id })
      
      // Log performance metric
      const duration = Date.now() - startTime
      checkBusinessMetric('summary_creation', duration)
      
      return {
        success: true,
        data: {
          ...summary,
          taskId,
          isAnonymous: false,
          canSave: true,
        },
      }
    } catch (error) {
      ProgressService.failProgress(taskId, error)
      logger.error('Failed to create summary', { error, userId })
      
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to create summary',
          details: error,
        },
      }
    }
  }
  
  /**
   * Get a summary by ID with user authorization
   * 
   * @param summaryId - Summary ID
   * @param userId - User ID for authorization
   * @returns Service result with summary
   */
  static async getSummary(
    summaryId: string,
    userId: string
  ): Promise<ServiceResult<EnrichedSummary>> {
    try {
      const summary = await prisma.summary.findFirst({
        where: {
          id: summaryId,
          OR: [
            { userId },
            { 
              // Allow anonymous summaries if user has access
              AND: [
                { userId: 'ANONYMOUS_USER' },
                // Allow anonymous summaries
              ]
            }
          ],
        },
        include: {
          user: true,
        },
      })
      
      if (!summary) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Summary not found or access denied',
          },
        }
      }
      
      return {
        success: true,
        data: {
          ...summary,
          isAnonymous: summary.userId === 'ANONYMOUS_USER',
          canSave: summary.userId !== 'ANONYMOUS_USER',
        },
      }
    } catch (error) {
      logger.error('Failed to get summary', { error, summaryId })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to retrieve summary',
          details: error,
        },
      }
    }
  }
  
  /**
   * Update an existing summary
   * 
   * @param input - Update input
   * @param userId - User ID for authorization
   * @returns Service result with updated summary
   */
  static async updateSummary(
    input: UpdateSummaryInput,
    userId: string
  ): Promise<ServiceResult<EnrichedSummary>> {
    try {
      // Validate update data
      const validation = ValidationService.validateSummaryUpdate(input)
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors[0] || 'Invalid update data',
            details: validation.errors,
          },
        }
      }
      
      // Check if summary exists and user has permission
      const existingSummary = await prisma.summary.findFirst({
        where: {
          id: input.id,
          userId,
        },
      })
      
      if (!existingSummary) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Summary not found or access denied',
          },
        }
      }
      
      // Update summary
      const updatedSummary = await prisma.summary.update({
        where: { id: input.id },
        data: {
          ...(input.videoTitle && { videoTitle: input.videoTitle }),
          ...(input.channelName && { channelName: input.channelName }),
          ...(input.content && { content: input.content }),
          ...(input.userNotes !== undefined && { userNotes: input.userNotes }),
          ...(input.isFavorite !== undefined && { isFavorite: input.isFavorite }),
          ...(input.rating !== undefined && { rating: input.rating }),
        },
        include: {
          user: true,
        },
      })
      
      logger.info('Updated summary', {
        summaryId: input.id,
        userId,
      })
      
      return {
        success: true,
        data: {
          ...updatedSummary,
          isAnonymous: false,
          canSave: true,
        },
      }
    } catch (error) {
      logger.error('Failed to update summary', { error, input })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to update summary',
          details: error,
        },
      }
    }
  }
  
  /**
   * Delete a summary
   * 
   * @param summaryId - Summary ID
   * @param userId - User ID for authorization
   * @returns Service result
   */
  static async deleteSummary(
    summaryId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Check if summary exists and user has permission
      const summary = await prisma.summary.findFirst({
        where: {
          id: summaryId,
          userId,
        },
      })
      
      if (!summary) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Summary not found or access denied',
          },
        }
      }
      
      // Delete summary
      await prisma.summary.delete({
        where: { id: summaryId },
      })
      
      logger.info('Deleted summary', { summaryId, userId })
      
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete summary', { error, summaryId })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to delete summary',
          details: error,
        },
      }
    }
  }
  
  /**
   * Get summaries for a user with pagination
   * 
   * @param userId - User ID
   * @param options - Query options
   * @returns Service result with paginated summaries
   */
  static async getUserSummaries(
    userId: string,
    options: {
      limit?: number
      cursor?: string
      search?: string
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      categories?: string[]
      tags?: string[]
    } = {}
  ): Promise<ServiceResult<{
    items: EnrichedSummary[]
    nextCursor?: string
  }>> {
    try {
      const {
        limit = 20,
        cursor,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        categories,
        tags,
      } = options
      
      // Build where clause
      const where: any = {
        userId,
      }
      
      if (search) {
        where.OR = [
          { videoTitle: { contains: search, mode: 'insensitive' } },
          { channelTitle: { contains: search, mode: 'insensitive' } },
          { tldr: { contains: search, mode: 'insensitive' } },
        ]
      }
      
      if (categories && categories.length > 0) {
        where.categories = {
          hasEvery: categories,
        }
      }
      
      if (tags && tags.length > 0) {
        where.tags = {
          hasEvery: tags,
        }
      }
      
      if (cursor) {
        where.id = {
          lt: cursor,
        }
      }
      
      // Query summaries
      const summaries = await prisma.summary.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: limit + 1,
        include: {
          user: true,
        },
      })
      
      // Handle pagination
      const hasNextPage = summaries.length > limit
      const items = hasNextPage ? summaries.slice(0, -1) : summaries
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined
      
      return {
        success: true,
        data: {
          items: items.map(s => ({
            ...s,
            isAnonymous: false,
            canSave: true,
          })),
          nextCursor,
        },
      }
    } catch (error) {
      logger.error('Failed to get user summaries', { error, userId })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to retrieve summaries',
          details: error,
        },
      }
    }
  }
  
  /**
   * Check if user can create more summaries
   * 
   * @param user - User object with subscription
   * @returns Usage limit check result
   */
  private static async checkUsageLimits(user: any): Promise<{
    canCreate: boolean
    reason?: string
    usage?: {
      current: number
      limit: number
    }
  }> {
    try {
      // Get current month usage
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const monthlyUsage = await prisma.summary.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startOfMonth,
          },
        },
      })
      
      // Determine limit based on user's plan
      let monthlyLimit = 3 // Default to FREE plan limit
      
      if (user.plan === 'PRO') {
        monthlyLimit = 25
      } else if (user.plan === 'ENTERPRISE') {
        monthlyLimit = 1000 // Effectively unlimited for Enterprise
      } else {
        // FREE plan (default)
        monthlyLimit = 3
      }
      
      logger.info('Quota check for user', {
        userId: user.id,
        userPlan: user.plan,
        monthlyUsage,
        monthlyLimit,
        canCreate: monthlyUsage < monthlyLimit
      })
      
      const canCreate = monthlyUsage < monthlyLimit
      
      return {
        canCreate,
        reason: canCreate 
          ? undefined 
          : `Monthly limit of ${monthlyLimit} summaries reached`,
        usage: {
          current: monthlyUsage,
          limit: monthlyLimit,
        },
      }
    } catch (error) {
      logger.error('Failed to check usage limits', { error })
      // Allow creation if we can't check limits
      return { canCreate: true }
    }
  }
  
  // Background processing removed - now using synchronous approach
  
  /**
   * Call Python backend for summary processing
   * 
   * @param data - Request data
   * @returns Response from backend
   */
  private static async callPythonBackend(data: {
    url: string
    task_id: string
    summary_id: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Use correct environment variable name that matches .env files
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      
      logger.info('Calling Python backend', { backendUrl, url: data.url, taskId: data.task_id })
      
      // Python API expects only {url} in request body (no JWT auth, no extra fields)
      const response = await fetch(`${backendUrl}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: data.url,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend error: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      return { success: true, data: result }
      
    } catch (error) {
      logger.error('Python backend call failed', { error, data })
      return {
        success: false,
        error: (error as Error).message || 'Backend communication failed',
      }
    }
  }
}