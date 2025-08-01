import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'

export const authRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    })
    return user
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "You can see this secret message because you're authenticated!"
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      image: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          image: input.image,
        },
      })

      return updatedUser
    }),

  // Update notification preferences
  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      accountNotifications: z.boolean().optional(),
      usageLimitWarnings: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId

      // Get current user to merge preferences
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true }
      })

      const currentPreferences = (currentUser?.metadata as any)?.notificationPreferences || {}
      const newPreferences = { ...currentPreferences, ...input }

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          // Using a JSON field to store notification preferences
          // If metadata doesn't exist in schema, we'll store in a JSON field
          metadata: {
            ...(currentUser?.metadata as any || {}),
            notificationPreferences: newPreferences
          }
        },
      })

      return updatedUser
    }),

  // Get notification preferences
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { metadata: true }
    })

    const preferences = (user?.metadata as any)?.notificationPreferences || {
      emailNotifications: true,
      weeklyDigest: false,
      accountNotifications: true,
      usageLimitWarnings: true,
    }

    return preferences
  }),

  // Export user data
  exportUserData: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        summaries: {
          select: {
            id: true,
            videoTitle: true,
            channelName: true,
            content: true,
            createdAt: true,
            videoUrl: true,
          }
        },
        sharedLinks: {
          select: {
            slug: true,
            isPublic: true,
            views: true,
            createdAt: true,
          }
        }
      }
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return {
      profile: {
        name: user.name,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      summaries: user.summaries,
      sharedLinks: user.sharedLinks,
      stats: {
        totalSummaries: user.summaries.length,
        totalSharedLinks: user.sharedLinks.length,
        summariesUsed: user.summariesUsed,
      }
    }
  }),

  // Delete user account
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmationText: z.string().min(1, 'Confirmation text is required'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId

      // Verify confirmation text
      if (input.confirmationText !== 'DELETE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid confirmation text. Please type "DELETE" to confirm.',
        })
      }

      // Get user to check for Stripe customer
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true }
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Note: In production, you might want to cancel Stripe subscriptions here
      // if (user.stripeCustomerId) {
      //   // Cancel Stripe subscription and customer
      // }

      // Delete user (cascade will handle related records)
      await ctx.prisma.user.delete({
        where: { id: userId },
      })

      return { success: true }
    }),
})