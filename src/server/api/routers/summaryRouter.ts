import 'server-only'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc'
import { summarySchemas } from './summaryValidation'
import { createHealthHandler, createHandler, createAnonymousHandler, createGetByIdHandler, createUpdateHandler, createDeleteHandler, createClaimAnonymousHandler, createGetAnonymousHandler } from './summaryHandlers'
import type { SummaryRouterDependencies } from './summaryTypes'

/**
 * Create summary router with dependency injection
 * 
 * @param deps - Dependencies required by the router
 * @returns Configured tRPC router
 */
export function createSummaryRouter(deps: SummaryRouterDependencies) {
  const healthHandler = createHealthHandler()
  const createSummaryHandler = createHandler(deps)
  const anonymousHandler = createAnonymousHandler(deps)
  const getByIdHandler = createGetByIdHandler(deps)
  const updateHandler = createUpdateHandler(deps)
  const deleteHandler = createDeleteHandler(deps)
  const claimAnonymousHandler = createClaimAnonymousHandler(deps)
  const getAnonymousHandler = createGetAnonymousHandler(deps)

  return createTRPCRouter({
    /**
     * Health check endpoint for monitoring service status
     */
    health: publicProcedure
      .output(summarySchemas.health)
      .query(healthHandler),

    /**
     * Create video summary for authenticated users
     * 
     * Allows authenticated users to create video summaries. Validates YouTube URLs,
     * checks for duplicate videos for the same user, creates database records,
     * and triggers backend AI processing. No usage limits for authenticated users.
     */
    create: protectedProcedure
      .input(summarySchemas.create)
      .mutation(async ({ ctx, input }) => {
        return createSummaryHandler(ctx, input)
      }),

    /**
     * Get summary by ID for authenticated users
     * 
     * Retrieves a summary by its ID for the authenticated user. Includes security checks
     * to ensure users can only access their own summaries. Returns full summary data
     * including categories and tags for the SummaryViewer component.
     */
    getById: protectedProcedure
      .input(summarySchemas.getById)
      .query(async ({ ctx, input }) => {
        return getByIdHandler(ctx, input)
      }),

    /**
     * Create video summary for anonymous users without authentication
     * 
     * Allows unauthenticated users to create one free summary using browser fingerprinting
     * for tracking. Implements rate limiting (1 summary per browser/IP) and validates YouTube URLs.
     * Stores summary under special ANONYMOUS_USER account for later claiming after signup.
     */
    createAnonymous: publicProcedure
      .input(summarySchemas.createAnonymous)
      .mutation(async ({ ctx, input }) => {
        return anonymousHandler(ctx, input)
      }),

    /**
     * Update summary for authenticated users
     * 
     * Allows authenticated users to update their summary metadata including title,
     * user notes, favorite status, and rating. Security checks ensure users can
     * only update their own summaries.
     */
    update: protectedProcedure
      .input(summarySchemas.update)
      .mutation(async ({ ctx, input }) => {
        return updateHandler(ctx, input)
      }),

    /**
     * Delete summary for authenticated users
     * 
     * Allows authenticated users to permanently delete their summaries. Includes
     * proper cleanup of related records and security checks to ensure users can
     * only delete their own summaries.
     */
    delete: protectedProcedure
      .input(summarySchemas.delete)
      .mutation(async ({ ctx, input }) => {
        return deleteHandler(ctx, input)
      }),

    /**
     * Claim anonymous summaries after authentication
     * 
     * Transfers ownership of anonymous summaries to newly authenticated user.
     * Uses browser fingerprinting to identify previously created anonymous summaries
     * and moves them to the authenticated user's account.
     */
    claimAnonymous: protectedProcedure
      .input(summarySchemas.claimAnonymous)
      .mutation(async ({ ctx, input }) => {
        return claimAnonymousHandler(ctx, input)
      }),

    /**
     * Get anonymous summaries for unauthenticated users
     * 
     * Retrieves summaries created by anonymous users using browser fingerprinting.
     * Provides read-only access to anonymous summaries before user signup.
     */
    getAnonymous: publicProcedure
      .input(summarySchemas.getAnonymous)
      .query(async ({ ctx, input }) => {
        return getAnonymousHandler(ctx, input)
      }),
  })
}

/**
 * Default router factory function for backwards compatibility
 * Uses runtime dependency injection with fallbacks
 */
export function createDefaultSummaryRouter() {
  // Simple dependency injection with fallbacks
  const deps: SummaryRouterDependencies = {
    db: null as any, // Will be resolved from tRPC context at runtime
    logger: {
      info: (msg: string, meta?: any) => console.log(`INFO: ${msg}`, meta),
      error: (msg: string, meta?: any) => console.error(`ERROR: ${msg}`, meta),
      warn: (msg: string, meta?: any) => console.warn(`WARN: ${msg}`, meta),
    },
    monitoring: undefined, // Optional dependency
    security: {
      sanitizeUrl: (url: string) => url,
      sanitizeText: (text: string) => text,
      containsSuspiciousContent: () => false,
      isValidYouTubeVideoId: (id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id),
    },
    config: {
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
  }

  return createSummaryRouter(deps)
}