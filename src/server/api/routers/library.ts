import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { getTagsForUser, getCategoriesForUser } from '@/lib/classificationService'

export const libraryRouter = createTRPCRouter({
  /**
   * Get all summaries for the authenticated user with advanced filtering and pagination
   * 
   * Retrieves user's summary library with comprehensive filtering options including
   * search, sorting, date ranges, duration filters, and Smart Collections tags/categories.
   * Supports cursor-based pagination for efficient loading of large libraries.
   * 
   * @param {Object} input - Query parameters for filtering and pagination
   * @param {number} [input.limit=20] - Number of results to return (1-100)
   * @param {string} [input.cursor] - Cursor for pagination (from previous response)
   * @param {string} [input.search] - Search term for title, channel, or content
   * @param {'date'|'title'|'duration'|'channel'|'views'|'uploadDate'} [input.sortBy='date'] - Sort field
   * @param {'asc'|'desc'} [input.sortOrder='desc'] - Sort direction
   * @param {'day'|'week'|'month'|'year'} [input.dateRange] - Filter by creation date
   * @param {'short'|'medium'|'long'} [input.durationRange] - Filter by video duration
   * @param {string[]} [input.categories] - Filter by Smart Collections categories
   * @param {string[]} [input.tags] - Filter by Smart Collections tags
   * @returns {Promise<{items: Summary[], nextCursor?: string}>} Paginated summaries with cursor
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const { data } = await api.library.getAll.useQuery({
   *   search: 'React',
   *   categories: ['Technology', 'Programming'],
   *   sortBy: 'date',
   *   limit: 10
   * })
   * 
   * // Use nextCursor for pagination
   * const nextPage = await api.library.getAll.useQuery({
   *   cursor: data.nextCursor,
   *   limit: 10
   * })
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['date', 'title', 'duration', 'channel', 'views', 'uploadDate']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      dateRange: z.enum(['day', 'week', 'month', 'year']).optional(),
      durationRange: z.enum(['short', 'medium', 'long']).optional(),
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, sortBy, sortOrder, dateRange, durationRange, categories, tags } = input
      const userId = ctx.userId

      // Build where clause
      const where: any = {
        userId,
        ...(search && {
          OR: [
            { videoTitle: { contains: search, mode: 'insensitive' as const } },
            { channelName: { contains: search, mode: 'insensitive' as const } },
            { content: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      }

      // Add date range filter
      if (dateRange) {
        const now = new Date()
        let startDate: Date
        
        switch (dateRange) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }
        
        where.createdAt = {
          gte: startDate
        }
      }

      // Add duration range filter
      if (durationRange) {
        switch (durationRange) {
          case 'short':
            where.duration = { lte: 300 } // <= 5 minutes
            break
          case 'medium':
            where.duration = { gte: 300, lte: 1200 } // 5-20 minutes
            break
          case 'long':
            where.duration = { gte: 1200 } // >= 20 minutes
            break
        }
      }

      // Add category filter
      if (categories && categories.length > 0) {
        where.categories = {
          some: {
            name: {
              in: categories
            }
          }
        }
      }

      // Add tag filter
      if (tags && tags.length > 0) {
        where.tags = {
          some: {
            name: {
              in: tags
            }
          }
        }
      }

      // Build orderBy clause
      let orderBy: any
      switch (sortBy) {
        case 'title':
          orderBy = { videoTitle: sortOrder }
          break
        case 'duration':
          orderBy = { duration: sortOrder }
          break
        case 'channel':
          orderBy = { channelName: sortOrder }
          break
        case 'views':
          orderBy = { viewCount: sortOrder }
          break
        case 'uploadDate':
          orderBy = { uploadDate: sortOrder }
          break
        case 'date':
        default:
          orderBy = { createdAt: sortOrder }
          break
      }

      const items = await ctx.prisma.summary.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy,
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

      let nextCursor: typeof cursor | undefined = undefined
      if (items.length > limit) {
        const nextItem = items.pop()
        nextCursor = nextItem!.id
      }

      return {
        items,
        nextCursor,
      }
    }),

  /**
   * Get summary statistics for the authenticated user's library
   * 
   * Retrieves aggregated statistics including total summary count, total video duration,
   * and recent summaries. Used for dashboard displays and usage tracking.
   * Performs parallel queries for optimal performance.
   * 
   * @returns {Promise<Object>} Library statistics
   * @returns {number} returns.totalSummaries - Total number of summaries created
   * @returns {number} returns.totalDuration - Total duration of all videos in seconds
   * @returns {Array} returns.recentSummaries - Last 5 summaries with basic info
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const stats = await api.library.getStats.useQuery()
   * console.log(`You have ${stats.totalSummaries} summaries`)
   * console.log(`Total watch time saved: ${Math.round(stats.totalDuration / 60)} minutes`)
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId

    const [totalSummaries, totalDuration, recentSummaries] = await Promise.all([
      ctx.prisma.summary.count({ where: { userId } }),
      ctx.prisma.summary.aggregate({
        where: { userId },
        _sum: { duration: true },
      }),
      ctx.prisma.summary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          videoTitle: true,
          channelName: true,
          createdAt: true,
        },
      }),
    ])

    return {
      totalSummaries,
      totalDuration: totalDuration._sum.duration || 0,
      recentSummaries,
    }
  }),

  /**
   * Get all Smart Collections tags for the authenticated user
   * 
   * Retrieves all tags associated with the user's summaries, including usage counts.
   * Tags are ordered by frequency of use. Wraps the classificationService function
   * with error handling to ensure API stability.
   * 
   * @returns {Promise<Array<{id: string, name: string, type: string, count: number}>>} User's tags with counts
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const tags = await api.library.getTags.useQuery()
   * tags.forEach(tag => {
   *   console.log(`${tag.name} (${tag.type}): ${tag.count} summaries`)
   * })
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getTags: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId
    try {
      return await getTagsForUser(userId)
    } catch (error) {
      console.error('Failed to fetch tags for user:', userId, error)
      return []
    }
  }),

  /**
   * Get all Smart Collections categories for the authenticated user
   * 
   * Retrieves all categories associated with the user's summaries, including usage counts.
   * Categories are ordered by frequency of use. Wraps the classificationService function
   * with error handling to ensure API stability.
   * 
   * @returns {Promise<Array<{id: string, name: string, count: number}>>} User's categories with counts
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const categories = await api.library.getCategories.useQuery()
   * categories.forEach(category => {
   *   console.log(`${category.name}: ${category.count} summaries`)
   * })
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId
    try {
      return await getCategoriesForUser(userId)
    } catch (error) {
      console.error('Failed to fetch categories for user:', userId, error)
      return []
    }
  }),
})