import { createTRPCRouter } from '@/server/api/trpc'
import { authRouter } from '@/server/api/routers/auth'
import { summaryRouter } from '@/server/api/routers/summary'
import { libraryRouter } from '@/server/api/routers/library'
import { billingRouter } from '@/server/api/routers/billing'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  summary: summaryRouter,
  library: libraryRouter,
  billing: billingRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter