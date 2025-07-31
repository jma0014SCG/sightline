import { initTRPC, TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { headers } from 'next/headers'

/**
 * Create context for each request
 */
export const createTRPCContext = async () => {
  const session = await getServerSession(authOptions)

  return {
    prisma,
    session,
    headers: headers(),
  }
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Create router and procedure helpers
 */
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)