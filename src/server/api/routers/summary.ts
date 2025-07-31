import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { sanitizeUrl, sanitizeText, containsSuspiciousContent, isValidYouTubeVideoId } from '@/lib/security'

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

export const summaryRouter = createTRPCRouter({
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
      
      // Skip usage limits check for testing
      // TODO: Re-enable this for production
      /*
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          summariesLimit: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Check monthly usage if user has limits
      if (user.summariesLimit > 0) {
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
            message: 'Monthly summary limit reached. Please upgrade your plan to create more summaries.',
          })
        }
      }
      */
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

        return summary
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
})