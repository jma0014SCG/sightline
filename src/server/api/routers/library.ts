import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

export const libraryRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['date', 'title', 'duration', 'channel']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      dateRange: z.enum(['day', 'week', 'month', 'year']).optional(),
      durationRange: z.enum(['short', 'medium', 'long']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, sortBy, sortOrder, dateRange, durationRange } = input
      const userId = ctx.session.user.id

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

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

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
})