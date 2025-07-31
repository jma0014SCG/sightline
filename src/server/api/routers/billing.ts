import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { stripe, PRICING_PLANS, getPlanByPriceId } from '@/lib/stripe'

export const billingRouter = createTRPCRouter({
  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        summariesUsed: true,
        summariesLimit: true,
      },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    const planConfig = PRICING_PLANS[user.plan as keyof typeof PRICING_PLANS]

    return {
      ...user,
      planConfig,
      isSubscriptionActive: user.stripeCurrentPeriodEnd ? new Date() < user.stripeCurrentPeriodEnd : false,
    }
  }),

  // Create Stripe Checkout session
  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceId: z.string(),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      })

      if (!user?.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User email is required',
        })
      }

      let customerId = user.stripeCustomerId

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id,
          },
        })

        customerId = customer.id

        // Update user with Stripe customer ID
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        })
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          userId: user.id,
        },
      })

      return {
        sessionId: session.id,
        url: session.url,
      }
    }),

  // Create billing portal session
  createPortalSession: protectedProcedure
    .input(z.object({
      returnUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      })

      if (!user?.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Stripe customer found',
        })
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: input.returnUrl,
      })

      return {
        url: session.url,
      }
    }),

  // Get usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        plan: true,
        summariesUsed: true,
        summariesLimit: true,
      },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    const planConfig = PRICING_PLANS[user.plan as keyof typeof PRICING_PLANS]

    // Calculate current month usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const currentMonthUsage = await ctx.prisma.summary.count({
      where: {
        userId: ctx.session.user.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    const isLimitReached = user.summariesLimit > 0 && currentMonthUsage >= user.summariesLimit

    return {
      currentMonthUsage,
      monthlyLimit: user.summariesLimit,
      totalSummaries: user.summariesUsed,
      planConfig,
      isLimitReached,
      canCreateSummary: !isLimitReached || user.summariesLimit === -1,
    }
  }),
})