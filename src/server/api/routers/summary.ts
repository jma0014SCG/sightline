import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { sanitizeUrl, sanitizeText, containsSuspiciousContent, isValidYouTubeVideoId } from '@/lib/security'
import { classifySummaryContent } from '@/lib/classificationService'
import { monitoring } from '@/lib/monitoring'
import { checkBusinessMetric } from '@/lib/performance-budgets'

// Create an event emitter for streaming
const ee = new EventEmitter()

/**
 * Extract YouTube video ID from various YouTube URL formats
 * 
 * Parses YouTube URLs and extracts the 11-character video ID using multiple regex patterns
 * to handle different URL formats including youtu.be, youtube.com/watch, and youtube.com/embed.
 * Used for normalizing video IDs before API calls and database operations.
 * 
 * @param {string} url - The YouTube URL to parse
 * @returns {string | null} The extracted video ID, or null if no valid ID found
 * @example
 * ```typescript
 * const id1 = extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')  // 'dQw4w9WgXcQ'
 * const id2 = extractVideoId('https://youtu.be/dQw4w9WgXcQ')            // 'dQw4w9WgXcQ'
 * const id3 = extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')   // 'dQw4w9WgXcQ'
 * const invalid = extractVideoId('https://example.com')                 // null
 * ```
 * 
 * @category API
 * @since 1.0.0
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

// Constants for anonymous user
const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

export const summaryRouter = createTRPCRouter({
  /**
   * Create video summary for anonymous users without authentication
   * 
   * Allows unauthenticated users to create one free summary using browser fingerprinting
   * for tracking. Implements rate limiting (1 summary per browser/IP) and validates YouTube URLs.
   * Stores summary under special ANONYMOUS_USER account for later claiming after signup.
   * 
   * @param {Object} input - Summary creation parameters
   * @param {string} input.url - YouTube video URL (validated for format and domain)
   * @param {string} input.browserFingerprint - Browser fingerprint for anonymous tracking
   * @returns {Promise<Summary & {isAnonymous: true, canSave: false, task_id: string}>} Created summary with metadata
   * @throws {TRPCError} FORBIDDEN if user has already created anonymous summary
   * @throws {TRPCError} BAD_REQUEST if URL is invalid or suspicious
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if backend processing fails
   * @example
   * ```typescript
   * const summary = await api.summary.createAnonymous.mutate({
   *   url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
   *   browserFingerprint: 'fp_abc123'
   * })
   * // Returns summary with isAnonymous: true, canSave: false
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  createAnonymous: publicProcedure
    .input(z.object({
      url: z.string()
        .url('Invalid URL format')
        .min(1, 'URL is required')
        .max(2048, 'URL too long')
        .refine((url) => {
          // Only allow YouTube URLs
          const youtubePatterns = [
            /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
          ]
          return youtubePatterns.some(pattern => pattern.test(url))
        }, 'Only YouTube URLs are allowed'),
      browserFingerprint: z.string(), // Required for tracking
    }))
    .mutation(async ({ ctx, input }) => {
      // Get IP for additional tracking
      const headersList = await ctx.headers
      const clientIP = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
                      headersList.get('x-real-ip') || 
                      'unknown'
      
      // Check if this browser fingerprint has already created a summary (SECURITY FIX - use usage events)
      const existingUsageByFingerprint = await ctx.prisma.usageEvent.findFirst({
        where: {
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: {
            path: ['browserFingerprint'],
            equals: input.browserFingerprint,
          },
        },
      })

      if (existingUsageByFingerprint) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Welcome back! You\'ve already used your free trial. Sign up now to get 3 summaries every month!',
        })
      }

      // Also check by IP as a backup (SECURITY FIX - use usage events)
      const existingUsageByIP = await ctx.prisma.usageEvent.findFirst({
        where: {
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: {
            path: ['clientIP'],
            equals: clientIP,
          },
        },
      })

      if (existingUsageByIP) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'A free summary has already been used from this location. Sign up now to get 3 summaries every month!',
        })
      }

      try {
        // Track summary creation start
        const summaryStartTime = Date.now()
        
        // Track metrics for anonymous summary creation
        monitoring.logBusinessMetric('summary_creation_attempt', 1, {
          userType: 'anonymous',
          clientIP,
          browserFingerprint: input.browserFingerprint,
        })

        // Sanitize and validate URL
        const sanitizedUrl = sanitizeUrl(input.url)
        
        // Check for suspicious content
        if (containsSuspiciousContent(input.url)) {
          logger.warn('Suspicious content detected in URL (anonymous)', {
            url: input.url,
            clientIP,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid URL content',
          })
        }

        const videoId = extractVideoId(sanitizedUrl)
        if (!videoId || !isValidYouTubeVideoId(videoId)) {
          logger.warn('Invalid YouTube URL provided (anonymous)', {
            url: sanitizedUrl,
            clientIP,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid YouTube URL',
          })
        }

        logger.info('Anonymous summary creation started', {
          videoId,
          clientIP,
          browserFingerprint: input.browserFingerprint,
          url: sanitizedUrl,
          timestamp: new Date().toISOString()
        })

        // Call FastAPI backend
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
        
        const response = await fetch(`${backendUrl}/api/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header for anonymous requests
          },
          body: JSON.stringify({ url: sanitizedUrl }),
        })

        console.log('📡 Anonymous response status:', response.status)

        let data
        if (!response.ok) {
          let errorMessage = 'Failed to summarize video'
          try {
            const responseText = await response.text()
            try {
              const errorData = JSON.parse(responseText)
              errorMessage = errorData.detail || errorData.error || errorMessage
            } catch (e) {
              errorMessage = responseText || errorMessage
            }
          } catch (e) {
            errorMessage = 'Failed to read error response'
          }
          
          logger.error('Backend API error (anonymous)', {
            error: errorMessage,
            videoId,
            clientIP,
            status: response.status,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          })
        }

        try {
          const responseText = await response.text()
          data = JSON.parse(responseText)
        } catch (e) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid JSON response from backend',
          })
        }
        
        // Check if we got an error response
        if (data.error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: data.error,
          })
        }
        
        // Validate required fields
        if (!data.video_url || !data.video_title || !data.summary) {
          console.error('❌ Missing required fields in API response:', {
            video_url: data.video_url,
            video_title: data.video_title,
            summary: data.summary ? 'present' : 'missing',
            fullResponse: data
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid response from summarization API - missing required fields',
          })
        }

        // Prepare metadata with anonymous tracking info
        const metadata = {
          ...(data.metadata || {}),
          key_moments: data.key_moments || [],
          flashcards: data.flashcards || [],
          quiz_questions: data.quiz_questions || [],
          glossary: data.glossary || [],
          tools: data.tools || [],
          resources: data.resources || [],
          clientIP,
          browserFingerprint: input.browserFingerprint,
          isAnonymous: true,
          createdAt: new Date().toISOString(),
        }

        // Sanitize content before storing
        const sanitizedContent = sanitizeText(data.summary || '')
        const sanitizedTitle = sanitizeText(data.video_title || 'Untitled Video')
        const sanitizedChannelName = sanitizeText(data.channel_name || 'Unknown Channel')

        // Create anonymous summary in database (using ANONYMOUS_USER_ID)
        const summary = await ctx.prisma.summary.create({
          data: {
            userId: ANONYMOUS_USER_ID, // Use special anonymous user
            videoId: data.video_id || videoId,
            videoUrl: sanitizedUrl,
            videoTitle: sanitizedTitle,
            channelName: sanitizedChannelName,
            channelId: sanitizeText(data.channel_id || ''),
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            content: sanitizedContent,
            keyPoints: data.key_points || [],
            metadata: metadata,
          },
        })

        // Record anonymous usage event for limit enforcement (SECURITY FIX)
        await ctx.prisma.usageEvent.create({
          data: {
            userId: ANONYMOUS_USER_ID,
            eventType: 'summary_created',
            summaryId: summary.id,
            videoId: summary.videoId,
            metadata: {
              plan: 'ANONYMOUS',
              browserFingerprint: input.browserFingerprint,
              clientIP,
              videoTitle: summary.videoTitle,
              channelName: summary.channelName,
              duration: summary.duration,
              timestamp: new Date().toISOString(),
            },
          },
        })

        // Classify summary content asynchronously (fire and forget)
        classifySummaryContent(summary.id, sanitizedContent, sanitizedTitle)
          .catch((error) => {
            logger.error('Classification failed for anonymous summary', { 
              summaryId: summary.id, 
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          })

        // Track successful summary creation metrics
        const summaryEndTime = Date.now()
        const totalDuration = summaryEndTime - summaryStartTime
        
        monitoring.logBusinessMetric('summary_creation_time', totalDuration, {
          userType: 'anonymous',
          videoLength: data.duration || 0,
          source: 'api',
        })
        
        monitoring.logBusinessMetric('summary_creation_success', 1, {
          userType: 'anonymous',
          clientIP,
        })
        
        // Check against performance budget
        checkBusinessMetric('SUMMARY_CREATION', totalDuration)

        // Return summary with anonymous flag and task_id
        return {
          ...summary,
          isAnonymous: true,
          canSave: false, // Anonymous summaries can't be saved permanently
          task_id: data.task_id, // Include task_id for progress tracking
        }
      } catch (error) {
        // Track failed summary creation
        monitoring.logBusinessMetric('summary_creation_failure', 1, {
          userType: 'anonymous',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create summary',
        })
      }
    }),

  /**
   * Create video summary for authenticated users with usage limit checking
   * 
   * Creates or updates video summaries for authenticated users with plan-based usage limits.
   * FREE plan: 3 summaries per month, PRO plan: 25 summaries per month, ENTERPRISE: unlimited.
   * Integrates with AI backend for content processing and Smart Collections classification.
   * 
   * @param {Object} input - Summary creation parameters
   * @param {string} input.url - YouTube video URL (validated for format and domain)
   * @returns {Promise<Summary & {task_id: string}>} Created/updated summary with backend task ID
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} FORBIDDEN if user has exceeded plan limits
   * @throws {TRPCError} BAD_REQUEST if URL is invalid or suspicious
   * @throws {TRPCError} NOT_FOUND if user record doesn't exist
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if backend processing fails
   * @example
   * ```typescript
   * const summary = await api.summary.create.mutate({
   *   url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
   * })
   * // Returns summary with task_id for progress tracking
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  create: protectedProcedure
    .input(z.object({
      url: z.string()
        .url('Invalid URL format')
        .min(1, 'URL is required')
        .max(2048, 'URL too long')
        .refine((url) => {
          // Only allow YouTube URLs
          const youtubePatterns = [
            /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
          ]
          return youtubePatterns.some(pattern => pattern.test(url))
        }, 'Only YouTube URLs are allowed'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId
      
      // Check usage limits
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          summariesLimit: true,
          summariesUsed: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Check usage limits based on plan
      if (user.summariesLimit > 0) {
        if (user.plan === 'FREE') {
          // FREE plan: Check lifetime usage (3 max total, SECURITY FIX - can't bypass via deletion)
          const totalUsage = await ctx.prisma.usageEvent.count({
            where: {
              userId: userId,
              eventType: 'summary_created',
            },
          })

          if (totalUsage >= user.summariesLimit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You've reached your lifetime limit of ${user.summariesLimit} summaries. Upgrade to Pro for 25 summaries per month!`,
            })
          }
        } else if (user.plan === 'PRO') {
          // PRO plan: Check monthly usage (25 max per month, SECURITY FIX - can't bypass via deletion)
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const currentMonthUsage = await ctx.prisma.usageEvent.count({
            where: {
              userId: userId,
              eventType: 'summary_created',
              createdAt: {
                gte: startOfMonth,
              },
            },
          })

          if (currentMonthUsage >= user.summariesLimit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You've reached your monthly limit of ${user.summariesLimit} summaries. Your limit resets on the 1st of next month.`,
            })
          }
        }
      }
      try {
        // Track authenticated summary creation start
        const summaryStartTime = Date.now()
        
        // Track metrics for authenticated summary creation
        monitoring.logBusinessMetric('summary_creation_attempt', 1, {
          userType: 'authenticated',
          plan: user.plan,
          userId: userId,
        })

        // Sanitize and validate URL
        const sanitizedUrl = sanitizeUrl(input.url)
        
        // Check for suspicious content
        if (containsSuspiciousContent(input.url)) {
          logger.warn('Suspicious content detected in URL', {
            url: input.url,
            userId: userId,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid URL content',
          })
        }

        const videoId = extractVideoId(sanitizedUrl)
        if (!videoId || !isValidYouTubeVideoId(videoId)) {
          logger.warn('Invalid YouTube URL provided', {
            url: sanitizedUrl,
            userId: userId,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid YouTube URL',
          })
        }

        logger.info('Summary creation started', {
          videoId,
          userId,
          url: sanitizedUrl,
          timestamp: new Date().toISOString()
        })

        // For testing without auth, call backend without auth token
        console.log('⚠️  TESTING MODE: Calling backend without authentication')
        
        // Call FastAPI backend
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
        console.log('🔗 Backend URL:', backendUrl)
        
        const response = await fetch(`${backendUrl}/api/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header for testing
          },
          body: JSON.stringify({ url: sanitizedUrl }),
        })

        console.log('📡 Response status:', response.status)

        let data
        if (!response.ok) {
          let errorMessage = 'Failed to summarize video'
          try {
            const responseText = await response.text()
            try {
              const errorData = JSON.parse(responseText)
              errorMessage = errorData.detail || errorData.error || errorMessage
            } catch (e) {
              errorMessage = responseText || errorMessage
            }
          } catch (e) {
            errorMessage = 'Failed to read error response'
          }
          
          logger.error('Backend API error', {
            error: errorMessage,
            videoId,
            userId,
            status: response.status,
            timestamp: new Date().toISOString()
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          })
        }

        try {
          const responseText = await response.text()
          data = JSON.parse(responseText)
        } catch (e) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid JSON response from backend',
          })
        }
        console.log('✅ Received response from FastAPI:', data)
        
        // Check if we got an error response
        if (data.error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: data.error,
          })
        }
        
        // Validate required fields
        if (!data.video_url || !data.video_title || !data.summary) {
          console.error('❌ Missing required fields in API response:', {
            video_url: data.video_url,
            video_title: data.video_title,
            summary: data.summary ? 'present' : 'missing',
            fullResponse: data
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid response from summarization API - missing required fields',
          })
        }

        // Check if summary already exists
        const existingSummary = await ctx.prisma.summary.findUnique({
          where: {
            userId_videoId: {
              userId: userId,
              videoId: data.video_id || videoId,
            },
          },
        })

        // Prepare metadata with structured Gumloop data
        const metadata = {
          ...(data.metadata || {}),
          key_moments: data.key_moments || [],
          flashcards: data.flashcards || [],
          quiz_questions: data.quiz_questions || [],
          glossary: data.glossary || [],
          tools: data.tools || [],
          resources: data.resources || []
        }

        // Sanitize content before storing
        const sanitizedContent = sanitizeText(data.summary || '')
        const sanitizedTitle = sanitizeText(data.video_title || 'Untitled Video')
        const sanitizedChannelName = sanitizeText(data.channel_name || 'Unknown Channel')

        // Create or update summary in database
        const summary = await ctx.prisma.summary.upsert({
          where: {
            userId_videoId: {
              userId: userId,
              videoId: data.video_id || videoId,
            },
          },
          update: {
            videoUrl: sanitizedUrl,
            videoTitle: sanitizedTitle,
            channelName: sanitizedChannelName,
            channelId: sanitizeText(data.channel_id || ''),
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            content: sanitizedContent,
            keyPoints: data.key_points || [],
            metadata: metadata,
            updatedAt: new Date(),
          },
          create: {
            userId: userId,
            videoId: data.video_id || videoId,
            videoUrl: sanitizedUrl,
            videoTitle: sanitizedTitle,
            channelName: sanitizedChannelName,
            channelId: sanitizeText(data.channel_id || ''),
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            content: sanitizedContent,
            keyPoints: data.key_points || [],
            metadata: metadata,
          },
        })

        // Update user's total summary count only for new summaries
        if (!existingSummary) {
          await ctx.prisma.user.update({
            where: { id: userId },
            data: {
              summariesUsed: {
                increment: 1,
              },
            },
          })

          // Record usage event for limit enforcement (SECURITY FIX)
          await ctx.prisma.usageEvent.create({
            data: {
              userId: userId,
              eventType: 'summary_created',
              summaryId: summary.id,
              videoId: summary.videoId,
              metadata: {
                plan: user.plan,
                videoTitle: summary.videoTitle,
                channelName: summary.channelName,
                duration: summary.duration,
                timestamp: new Date().toISOString(),
              },
            },
          })
        }

        // Classify summary content asynchronously (fire and forget)
        classifySummaryContent(summary.id, sanitizedContent, sanitizedTitle)
          .catch((error) => {
            logger.error('Classification failed for authenticated summary', { 
              summaryId: summary.id, 
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          })

        // Track successful summary creation metrics
        const summaryEndTime = Date.now()
        const totalDuration = summaryEndTime - summaryStartTime
        
        monitoring.logBusinessMetric('summary_creation_time', totalDuration, {
          userType: 'authenticated',
          plan: user.plan,
          userId: userId,
          videoLength: data.duration || 0,
          source: 'api',
        })
        
        monitoring.logBusinessMetric('summary_creation_success', 1, {
          userType: 'authenticated',
          plan: user.plan,
          userId: userId,
        })
        
        // Check against performance budget
        checkBusinessMetric('SUMMARY_CREATION', totalDuration)

        // Return summary with task_id for progress tracking
        return {
          ...summary,
          task_id: data.task_id, // Include task_id from backend
        }
      } catch (error) {
        // Track failed summary creation
        monitoring.logBusinessMetric('summary_creation_failure', 1, {
          userType: 'authenticated',
          plan: user.plan,
          userId: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create summary',
        })
      }
    }),

  /**
   * Create video summary with real-time streaming updates (experimental)
   * 
   * Experimental streaming implementation for real-time summary generation updates.
   * Currently returns mock data for development purposes. Future implementation will
   * integrate with actual AI backend streaming endpoints for live progress updates.
   * 
   * @param {Object} input - Streaming parameters
   * @param {string} input.url - YouTube video URL to process
   * @returns {Observable<StreamEvent>} Observable stream of processing events
   * @returns {'status'} returns.type - Status update event type
   * @returns {'content'} returns.type - Content chunk event type  
   * @returns {'error'} returns.type - Error event type
   * @returns {'complete'} returns.type - Completion event type
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const subscription = api.summary.createStream.useSubscription(
   *   { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
   *   {
   *     onData: (event) => {
   *       if (event.type === 'content') console.log(event.data)
   *     }
   *   }
   * )
   * ```
   * 
   * @category API
   * @since 1.0.0
   * @experimental
   */
  createStream: protectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .subscription(({ input, ctx }) => {
      return observable<{
        type: 'status' | 'content' | 'error' | 'complete'
        data: any
      }>((emit) => {
        const processVideo = async () => {
          try {
            // Emit initial status
            emit.next({ type: 'status', data: 'Validating URL...' })

            const videoId = extractVideoId(input.url)
            if (!videoId) {
              emit.next({ type: 'error', data: 'Invalid YouTube URL' })
              return
            }

            emit.next({ type: 'status', data: 'Fetching video information...' })

            // Here we would integrate with the actual summarization pipeline
            // For now, we'll simulate the process
            emit.next({ type: 'status', data: 'Extracting transcript...' })
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            emit.next({ type: 'status', data: 'Generating summary...' })
            
            // Simulate streaming summary content
            const mockSummary = `# Video Summary\n\nThis is a mock summary that would be streamed in real-time as the AI generates it.\n\n## Key Points\n- Point 1\n- Point 2\n- Point 3`
            
            const words = mockSummary.split(' ')
            for (let i = 0; i < words.length; i++) {
              emit.next({ type: 'content', data: words[i] + ' ' })
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            emit.next({ type: 'complete', data: true })
          } catch (error) {
            emit.next({ 
              type: 'error', 
              data: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        }

        processVideo()

        return () => {
          // Cleanup if needed
        }
      })
    }),

  /**
   * Get summary by ID for authenticated user
   * 
   * Retrieves a specific summary by its unique identifier. Only returns summaries
   * owned by the authenticated user for security and privacy. Used for individual
   * summary viewing and editing operations.
   * 
   * @param {Object} input - Query parameters
   * @param {string} input.id - Unique summary identifier
   * @returns {Promise<Summary>} The requested summary object
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} NOT_FOUND if summary doesn't exist or user doesn't own it
   * @example
   * ```typescript
   * const summary = await api.summary.getById.useQuery({ id: 'clm123abc' })
   * console.log(summary.videoTitle) // Access summary data
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const summary = await ctx.prisma.summary.findUnique({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      })

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      return summary
    }),

  /**
   * Update summary content for authenticated user
   * 
   * Allows users to edit and update the content of their existing summaries.
   * Only the summary content can be modified - metadata and video information
   * remain unchanged. Updates the modification timestamp automatically.
   * 
   * @param {Object} input - Update parameters
   * @param {string} input.id - Unique summary identifier to update
   * @param {string} input.content - New summary content (markdown format)
   * @returns {Promise<{success: boolean}>} Update success confirmation
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} NOT_FOUND if summary doesn't exist or user doesn't own it
   * @example
   * ```typescript
   * await api.summary.update.mutate({
   *   id: 'clm123abc',
   *   content: '# Updated Summary\n\nNew content here...'
   * })
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const summary = await ctx.prisma.summary.updateMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      })

      if (summary.count === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      return { success: true }
    }),

  /**
   * Delete summary for authenticated user
   * 
   * Permanently removes a summary from the user's library. Only the summary owner
   * can delete their summaries. This action cannot be undone and will remove all
   * associated metadata, tags, and categories.
   * 
   * @param {Object} input - Deletion parameters
   * @param {string} input.id - Unique summary identifier to delete
   * @returns {Promise<{success: boolean}>} Deletion success confirmation
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} NOT_FOUND if summary doesn't exist or user doesn't own it
   * @example
   * ```typescript
   * await api.summary.delete.mutate({ id: 'clm123abc' })
   * // Summary permanently deleted from user's library
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const summary = await ctx.prisma.summary.deleteMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      })

      if (summary.count === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      return { success: true }
    }),

  /**
   * Claim anonymous summary when user signs up
   * 
   * Transfers ownership of an anonymous summary to the authenticated user during signup.
   * Validates browser fingerprint match and handles duplicate video scenarios.
   * If user already has the same video, deletes the anonymous version and returns existing.
   * 
   * @param {Object} input - Claim parameters
   * @param {string} input.summaryId - ID of anonymous summary to claim
   * @param {string} [input.browserFingerprint] - Browser fingerprint for validation
   * @returns {Promise<Summary & {isAnonymous: false, canSave: true}>} Claimed summary
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} NOT_FOUND if anonymous summary doesn't exist
   * @throws {TRPCError} BAD_REQUEST if summary is not anonymous or already owned
   * @throws {TRPCError} FORBIDDEN if browser fingerprint doesn't match
   * @example
   * ```typescript
   * const claimedSummary = await api.summary.claimAnonymous.mutate({
   *   summaryId: 'anon_abc123',
   *   browserFingerprint: 'fp_abc123'
   * })
   * // Anonymous summary now belongs to authenticated user
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  claimAnonymous: protectedProcedure
    .input(z.object({
      summaryId: z.string(),
      browserFingerprint: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId

      // Find the anonymous summary
      const anonymousSummary = await ctx.prisma.summary.findUnique({
        where: {
          id: input.summaryId,
        },
      })

      if (!anonymousSummary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      // Verify it's an anonymous summary and can be claimed
      if (anonymousSummary.userId !== ANONYMOUS_USER_ID) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This is not an anonymous summary or is already owned by a user',
        })
      }

      // Optional: Verify browser fingerprint matches if provided
      if (input.browserFingerprint && anonymousSummary.metadata) {
        const metadata = anonymousSummary.metadata as any
        if (metadata.browserFingerprint && metadata.browserFingerprint !== input.browserFingerprint) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot claim this summary',
          })
        }
      }

      // Check if user already has this video summarized
      const existingUserSummary = await ctx.prisma.summary.findFirst({
        where: {
          userId: userId,
          videoId: anonymousSummary.videoId,
        },
      })

      if (existingUserSummary) {
        // User already has this video, just delete the anonymous one
        await ctx.prisma.summary.delete({
          where: {
            id: input.summaryId,
          },
        })
        return existingUserSummary
      }

      // Transfer ownership to the user
      const claimedSummary = await ctx.prisma.summary.update({
        where: {
          id: input.summaryId,
        },
        data: {
          userId: userId,
          metadata: {
            ...(anonymousSummary.metadata as any || {}),
            claimedAt: new Date().toISOString(),
            isAnonymous: false,
          },
        },
      })

      // Update user's summary count
      await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          summariesUsed: {
            increment: 1,
          },
        },
      })

      return {
        ...claimedSummary,
        isAnonymous: false,
        canSave: true,
      }
    }),

  /**
   * Get anonymous summary by ID with public access
   * 
   * Retrieves anonymous summaries without authentication for viewing before signup.
   * Validates that the summary belongs to the anonymous user and optionally checks
   * browser fingerprint for additional security. Used for anonymous summary viewing.
   * 
   * @param {Object} input - Query parameters
   * @param {string} input.id - Anonymous summary identifier
   * @param {string} [input.browserFingerprint] - Browser fingerprint for validation
   * @returns {Promise<Summary & {isAnonymous: true, canSave: false}>} Anonymous summary
   * @throws {TRPCError} NOT_FOUND if summary doesn't exist
   * @throws {TRPCError} FORBIDDEN if summary requires authentication or fingerprint mismatch
   * @example
   * ```typescript
   * const summary = await api.summary.getAnonymous.useQuery({
   *   id: 'anon_abc123',
   *   browserFingerprint: 'fp_abc123'
   * })
   * // Returns anonymous summary with isAnonymous: true
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getAnonymous: publicProcedure
    .input(z.object({
      id: z.string(),
      browserFingerprint: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const summary = await ctx.prisma.summary.findUnique({
        where: {
          id: input.id,
        },
      })

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      }

      // Verify it's an anonymous summary
      if (summary.userId !== ANONYMOUS_USER_ID) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This summary requires authentication',
        })
      }

      // Optional: Verify browser fingerprint matches if provided for security
      if (input.browserFingerprint && summary.metadata) {
        const metadata = summary.metadata as any
        if (metadata.browserFingerprint && metadata.browserFingerprint !== input.browserFingerprint) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot access this summary',
          })
        }
      }

      return {
        ...summary,
        isAnonymous: true,
        canSave: false,
      }
    }),
})