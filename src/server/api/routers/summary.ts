import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { sanitizeUrl, sanitizeText, containsSuspiciousContent, isValidYouTubeVideoId } from '@/lib/security'
import { classifySummaryContent } from '@/lib/classificationService'

// Create an event emitter for streaming
const ee = new EventEmitter()

// Helper to extract video ID from URL
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
  // Anonymous summary creation (no auth required, uses special user)
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
      
      // Check if this browser fingerprint has already created a summary
      const existingAnonymousSummary = await ctx.prisma.summary.findFirst({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['browserFingerprint'],
            equals: input.browserFingerprint,
          },
        },
      })

      if (existingAnonymousSummary) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Welcome back! You\'ve already used your free summary. Sign up now to get 3 free summaries!',
        })
      }

      // Also check by IP as a backup (in case they clear localStorage)
      const existingByIP = await ctx.prisma.summary.findFirst({
        where: {
          userId: ANONYMOUS_USER_ID,
          metadata: {
            path: ['clientIP'],
            equals: clientIP,
          },
        },
      })

      if (existingByIP) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'A free summary has already been used from this location. Sign up now to get 3 free summaries!',
        })
      }

      try {
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

        // Classify summary content asynchronously (fire and forget)
        classifySummaryContent(summary.id, sanitizedContent, sanitizedTitle)
          .catch((error) => {
            logger.error('Classification failed for anonymous summary', { 
              summaryId: summary.id, 
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          })

        // Return summary with anonymous flag and task_id
        return {
          ...summary,
          isAnonymous: true,
          canSave: false, // Anonymous summaries can't be saved permanently
          task_id: data.task_id, // Include task_id for progress tracking
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create summary',
        })
      }
    }),

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
          // FREE plan: Check total summaries ever (3 max)
          const totalUsage = await ctx.prisma.summary.count({
            where: { userId: userId },
          })

          if (totalUsage >= user.summariesLimit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You've used all ${user.summariesLimit} of your free summaries! Upgrade to Pro for 25 summaries every month.`,
            })
          }
        } else if (user.plan === 'PRO') {
          // PRO plan: Check monthly usage (25 max per month)
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const currentMonthUsage = await ctx.prisma.summary.count({
            where: {
              userId: userId,
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

        // Return summary with task_id for progress tracking
        return {
          ...summary,
          task_id: data.task_id, // Include task_id from backend
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create summary',
        })
      }
    }),

  // Streaming version for real-time updates
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

  // Claim anonymous summary when user signs up
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

  // Get anonymous summary by ID (public access)
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