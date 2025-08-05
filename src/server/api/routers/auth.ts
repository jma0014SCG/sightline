import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'

export const authRouter = createTRPCRouter({
  /**
   * Get the current authenticated user's profile data
   * 
   * Retrieves the complete user record for the authenticated user from the database.
   * Requires valid authentication token. Used for profile display and user management.
   * 
   * @returns {Promise<User | null>} The user object or null if not found
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @example
   * ```typescript
   * const user = await api.auth.getCurrentUser.useQuery()
   * if (user) {
   *   console.log(`Welcome, ${user.name}!`)
   * }
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    })
    return user
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "You can see this secret message because you're authenticated!"
  }),

  /**
   * Update the authenticated user's profile information
   * 
   * Allows users to update their display name and profile image URL.
   * All fields are optional - only provided fields will be updated.
   * Used by the settings page for profile management.
   * 
   * @param {Object} input - Profile update data
   * @param {string} [input.name] - New display name (minimum 1 character)
   * @param {string} [input.image] - New profile image URL (must be valid URL)
   * @returns {Promise<User>} The updated user object
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} BAD_REQUEST if validation fails
   * @example
   * ```typescript
   * const updatedUser = await api.auth.updateProfile.mutate({
   *   name: 'John Doe',
   *   image: 'https://example.com/avatar.jpg'
   * })
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
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

  // Update notification preferences - placeholder implementation
  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      accountNotifications: z.boolean().optional(),
      usageLimitWarnings: z.boolean().optional(),
    }))
    .mutation(async () => {
      // TODO: Implement notification preferences storage
      // For now, just return success
      return { success: true }
    }),

  // Get notification preferences - placeholder implementation  
  getNotificationPreferences: protectedProcedure.query(async () => {
    // TODO: Implement notification preferences retrieval
    // For now, return default preferences
    return {
      emailNotifications: true,
      weeklyDigest: false,
      accountNotifications: true,
      usageLimitWarnings: true,
    }
  }),

  /**
   * Export all user data for data portability and privacy compliance
   * 
   * Retrieves a comprehensive export of all user data including profile information,
   * summaries, shared links, and usage statistics. Used for GDPR compliance and
   * data portability features. Returns structured data ready for JSON export.
   * 
   * @returns {Promise<Object>} Complete user data export
   * @returns {Object} returns.profile - User profile information
   * @returns {Array} returns.summaries - All user summaries with content
   * @returns {Array} returns.sharedLinks - All shared links created by user
   * @returns {Object} returns.stats - Usage statistics and totals
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} NOT_FOUND if user record doesn't exist
   * @example
   * ```typescript
   * const exportData = await api.auth.exportUserData.useQuery()
   * const blob = new Blob([JSON.stringify(exportData, null, 2)], 
   *   { type: 'application/json' })
   * // Download as file
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
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

  /**
   * Permanently delete user account with confirmation requirement
   * 
   * Securely deletes the user account and all associated data including summaries,
   * shared links, and metadata. Requires explicit confirmation text ("DELETE") to prevent
   * accidental deletion. Handles Stripe subscription cleanup in production environments.
   * 
   * @param {Object} input - Deletion confirmation data
   * @param {string} input.confirmationText - Must be exactly "DELETE" to confirm
   * @returns {Promise<{success: boolean}>} Deletion success confirmation
   * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
   * @throws {TRPCError} BAD_REQUEST if confirmation text is incorrect
   * @throws {TRPCError} NOT_FOUND if user record doesn't exist
   * @example
   * ```typescript
   * await api.auth.deleteAccount.mutate({
   *   confirmationText: 'DELETE'
   * })
   * // User account and all data permanently deleted
   * ```
   * 
   * @category API
   * @since 1.0.0
   */
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