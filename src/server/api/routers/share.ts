import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { getShareUrl } from '@/lib/url'

export const shareRouter = createTRPCRouter({
  // Create a share link for a summary
  create: protectedProcedure
    .input(z.object({
      summaryId: z.string(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the summary
      const summary = await ctx.prisma.summary.findFirst({
        where: {
          id: input.summaryId,
          userId: ctx.userId,
        },
      })

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found or access denied',
        })
      }

      // Check if a share link already exists for this summary
      const existingLink = await ctx.prisma.shareLink.findFirst({
        where: {
          summaryId: input.summaryId,
          userId: ctx.userId,
        },
      })

      if (existingLink) {
        // Return existing link
        return {
          id: existingLink.id,
          slug: existingLink.slug,
          url: getShareUrl(existingLink.slug),
          views: existingLink.views,
          expiresAt: existingLink.expiresAt,
          isPublic: existingLink.isPublic,
          createdAt: existingLink.createdAt,
        }
      }

      // Generate a unique slug
      let slug: string
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      do {
        slug = nanoid(10) // Generate a 10-character slug
        const existingSlug = await ctx.prisma.shareLink.findUnique({
          where: { slug },
        })
        isUnique = !existingSlug
        attempts++
      } while (!isUnique && attempts < maxAttempts)

      if (!isUnique) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique share link',
        })
      }

      // Create the share link
      const shareLink = await ctx.prisma.shareLink.create({
        data: {
          slug,
          summaryId: input.summaryId,
          userId: ctx.userId,
          isPublic: true,
          expiresAt: input.expiresAt,
        },
      })

      return {
        id: shareLink.id,
        slug: shareLink.slug,
        url: getShareUrl(shareLink.slug),
        views: shareLink.views,
        expiresAt: shareLink.expiresAt,
        isPublic: shareLink.isPublic,
        createdAt: shareLink.createdAt,
      }
    }),

  // Get share link details (for owner)
  get: protectedProcedure
    .input(z.object({
      summaryId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const shareLink = await ctx.prisma.shareLink.findFirst({
        where: {
          summaryId: input.summaryId,
          userId: ctx.userId,
        },
      })

      if (!shareLink) {
        return null
      }

      return {
        id: shareLink.id,
        slug: shareLink.slug,
        url: getShareUrl(shareLink.slug),
        views: shareLink.views,
        expiresAt: shareLink.expiresAt,
        isPublic: shareLink.isPublic,
        createdAt: shareLink.createdAt,
      }
    }),

  // Get shared summary by slug (public access)
  getBySlug: publicProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const shareLink = await ctx.prisma.shareLink.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          summary: {
            include: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      })

      if (!shareLink) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      }

      // Check if link has expired
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Share link has expired',
        })
      }

      // Check if link is public
      if (!shareLink.isPublic) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Share link is private',
        })
      }

      // Increment view count
      await ctx.prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { views: { increment: 1 } },
      })

      return {
        id: shareLink.id,
        slug: shareLink.slug,
        views: shareLink.views + 1, // Return incremented count
        createdAt: shareLink.createdAt,
        summary: {
          id: shareLink.summary.id,
          videoTitle: shareLink.summary.videoTitle,
          channelName: shareLink.summary.channelName,
          content: shareLink.summary.content,
          keyPoints: shareLink.summary.keyPoints,
          duration: shareLink.summary.duration,
          thumbnailUrl: shareLink.summary.thumbnailUrl,
          metadata: shareLink.summary.metadata,
          createdAt: shareLink.summary.createdAt,
          author: {
            name: shareLink.summary.user.name,
            image: shareLink.summary.user.image,
          },
        },
      }
    }),

  // Delete a share link
  delete: protectedProcedure
    .input(z.object({
      summaryId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const shareLink = await ctx.prisma.shareLink.findFirst({
        where: {
          summaryId: input.summaryId,
          userId: ctx.userId,
        },
      })

      if (!shareLink) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      }

      await ctx.prisma.shareLink.delete({
        where: { id: shareLink.id },
      })

      return { success: true }
    }),

  // Toggle public/private status
  togglePublic: protectedProcedure
    .input(z.object({
      summaryId: z.string(),
      isPublic: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const shareLink = await ctx.prisma.shareLink.findFirst({
        where: {
          summaryId: input.summaryId,
          userId: ctx.userId,
        },
      })

      if (!shareLink) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      }

      const updatedLink = await ctx.prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { isPublic: input.isPublic },
      })

      return {
        id: updatedLink.id,
        slug: updatedLink.slug,
        url: getShareUrl(updatedLink.slug),
        views: updatedLink.views,
        expiresAt: updatedLink.expiresAt,
        isPublic: updatedLink.isPublic,
        createdAt: updatedLink.createdAt,
      }
    }),

  // Get all share links for a user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const shareLinks = await ctx.prisma.shareLink.findMany({
        where: {
          userId: ctx.userId,
        },
        include: {
          summary: {
            select: {
              id: true,
              videoTitle: true,
              channelName: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return shareLinks.map((link: any) => ({
        id: link.id,
        slug: link.slug,
        url: getShareUrl(link.slug),
        views: link.views,
        expiresAt: link.expiresAt,
        isPublic: link.isPublic,
        createdAt: link.createdAt,
        summary: link.summary,
      }))
    }),
})