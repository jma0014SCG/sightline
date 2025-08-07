// Mock Stripe before importing
jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
  PRICING_PLANS: {
    FREE: {
      name: 'Free',
      description: 'Perfect for trying out Sightline',
      price: 0,
      priceId: null,
      features: ['Up to 3 video summaries total'],
    },
    PRO: {
      name: 'Pro',
      description: 'For regular users',
      price: 999,
      priceId: 'price_pro',
      features: ['25 video summaries per month'],
    },
    ENTERPRISE: {
      name: 'Enterprise',
      description: 'For power users',
      price: 2999,
      priceId: 'price_enterprise',
      features: ['Unlimited video summaries'],
    },
  },
  getPlanByPriceId: jest.fn(),
}))

import { billingRouter } from '../billing'
import { 
  createAuthenticatedContext,
} from '@/test-utils/trpc'
import { 
  createMockUser,
  createMockStripeCustomer,
  createMockStripeCheckoutSession,
} from '@/test-utils/mocks'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { type PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { stripe, PRICING_PLANS } from '@/lib/stripe'

// Get the mocked stripe instance with proper typing
const mockStripe = stripe as jest.Mocked<typeof stripe> & {
  customers: { create: jest.MockedFunction<any> }
  checkout: { sessions: { create: jest.MockedFunction<any> } }
  billingPortal: { sessions: { create: jest.MockedFunction<any> } }
}

// Create mock Prisma client
const mockPrisma = mockDeep<PrismaClient>()

describe('billingRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReset(mockPrisma)
  })

  describe('getSubscription', () => {
    it('should return subscription details for FREE user', async () => {
      const userId = 'user_free'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const freeUser = createMockUser({
        id: userId,
        plan: 'FREE',
        summariesUsed: 2,
        summariesLimit: 3,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeCurrentPeriodEnd: null,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getSubscription()
      
      expect(result).toEqual({
        ...freeUser,
        planConfig: PRICING_PLANS.FREE,
        isSubscriptionActive: false,
      })
    })

    it('should return subscription details for PRO user with active subscription', async () => {
      const userId = 'user_pro'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      const proUser = createMockUser({
        id: userId,
        plan: 'PRO',
        summariesUsed: 15,
        summariesLimit: 25,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripeCurrentPeriodEnd: futureDate,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getSubscription()
      
      expect(result).toEqual({
        ...proUser,
        planConfig: PRICING_PLANS.PRO,
        isSubscriptionActive: true,
      })
    })

    it('should return inactive subscription for expired PRO user', async () => {
      const userId = 'user_pro_expired'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const expiredProUser = createMockUser({
        id: userId,
        plan: 'PRO',
        stripeCurrentPeriodEnd: pastDate,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(expiredProUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(expiredProUser)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getSubscription()
      
      expect(result.isSubscriptionActive).toBe(false)
    })

    it('should throw error when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware - auto-create user
      const autoCreatedUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      mockPrisma.user.create.mockResolvedValueOnce(autoCreatedUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.getSubscription()).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session for user with existing Stripe customer', async () => {
      const userId = 'user_with_customer'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userWithCustomer = createMockUser({
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        stripeCustomerId: 'cus_existing',
      })
      
      const mockSession = createMockStripeCheckoutSession({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithCustomer)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValueOnce(mockSession as any)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
      
      expect(result).toEqual({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      })
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing',
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: 'price_pro',
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          userId: userId,
        },
      })
      
      // Should not create new customer or update user
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should create Stripe customer and checkout session for user without customer', async () => {
      const userId = 'user_without_customer'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userWithoutCustomer = createMockUser({
        id: userId,
        email: 'newuser@example.com',
        name: 'New User',
        stripeCustomerId: null,
      })
      
      const mockCustomer = createMockStripeCustomer({
        id: 'cus_new',
        email: 'newuser@example.com',
      })
      
      const mockSession = createMockStripeCheckoutSession({
        id: 'cs_456',
        url: 'https://checkout.stripe.com/cs_456',
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithoutCustomer)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithoutCustomer)
      mockStripe.customers.create.mockResolvedValueOnce(mockCustomer as any)
      mockPrisma.user.update.mockResolvedValueOnce({
        ...userWithoutCustomer,
        stripeCustomerId: 'cus_new',
      })
      mockStripe.checkout.sessions.create.mockResolvedValueOnce(mockSession as any)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
      
      expect(result).toEqual({
        sessionId: 'cs_456',
        url: 'https://checkout.stripe.com/cs_456',
      })
      
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        metadata: {
          userId: userId,
        },
      })
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_new' },
      })
    })

    it('should handle user with no name when creating customer', async () => {
      const userId = 'user_no_name'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userNoName = createMockUser({
        id: userId,
        email: 'noname@example.com',
        name: null,
        stripeCustomerId: null,
      })
      
      const mockCustomer = createMockStripeCustomer({
        id: 'cus_noname',
        email: 'noname@example.com',
      })
      
      const mockSession = createMockStripeCheckoutSession()
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoName)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoName)
      mockStripe.customers.create.mockResolvedValueOnce(mockCustomer as any)
      mockPrisma.user.update.mockResolvedValueOnce(userNoName)
      mockStripe.checkout.sessions.create.mockResolvedValueOnce(mockSession as any)
      
      const caller = billingRouter.createCaller(mockContext)
      await caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
      
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'noname@example.com',
        name: undefined,
        metadata: {
          userId: userId,
        },
      })
    })

    it('should throw error when user has no email', async () => {
      const userId = 'user_no_email'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userNoEmail = createMockUser({
        id: userId,
        email: '',
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoEmail)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoEmail)
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User email is required',
        })
      )
    })

    it('should reject invalid URL inputs', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'not-a-url',
        cancelUrl: 'https://example.com/cancel',
      })).rejects.toThrow()
      
      await expect(caller.createCheckoutSession({
        priceId: 'price_pro',
        successUrl: 'https://example.com/success',
        cancelUrl: 'not-a-url',
      })).rejects.toThrow()
    })
  })

  describe('createPortalSession', () => {
    it('should create billing portal session for user with Stripe customer', async () => {
      const userId = 'user_with_customer'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userWithCustomer = createMockUser({
        id: userId,
        stripeCustomerId: 'cus_123',
      })
      
      const mockPortalSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
      }
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithCustomer)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithCustomer)
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce(mockPortalSession as any)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.createPortalSession({
        returnUrl: 'https://example.com/billing',
      })
      
      expect(result).toEqual({
        url: 'https://billing.stripe.com/session/bps_123',
      })
      
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://example.com/billing',
      })
    })

    it('should throw error when user has no Stripe customer', async () => {
      const userId = 'user_no_customer'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userNoCustomer = createMockUser({
        id: userId,
        stripeCustomerId: null,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoCustomer)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userNoCustomer)
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.createPortalSession({
        returnUrl: 'https://example.com/billing',
      })).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Stripe customer found',
        })
      )
    })

    it('should reject invalid return URL', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.createPortalSession({
        returnUrl: 'not-a-url',
      })).rejects.toThrow()
    })
  })

  describe('getUsageStats', () => {
    it('should return usage stats for FREE user', async () => {
      const userId = 'user_free'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const freeUser = createMockUser({
        id: userId,
        plan: 'FREE',
        summariesUsed: 2,
        summariesLimit: 3,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      // Mock monthly usage count
      mockPrisma.summary.count.mockResolvedValueOnce(2)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getUsageStats()
      
      expect(result).toEqual({
        currentMonthUsage: 2,
        monthlyLimit: 3,
        totalSummaries: 2,
        planConfig: PRICING_PLANS.FREE,
        isLimitReached: false,
        canCreateSummary: true,
      })
      
      expect(mockPrisma.summary.count).toHaveBeenCalledWith({
        where: {
          userId: userId,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      })
    })

    it('should return usage stats for PRO user at limit', async () => {
      const userId = 'user_pro_limit'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const proUser = createMockUser({
        id: userId,
        plan: 'PRO',
        summariesUsed: 50,
        summariesLimit: 25,
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      // Mock monthly usage at limit
      mockPrisma.summary.count.mockResolvedValueOnce(25)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getUsageStats()
      
      expect(result).toEqual({
        currentMonthUsage: 25,
        monthlyLimit: 25,
        totalSummaries: 50,
        planConfig: PRICING_PLANS.PRO,
        isLimitReached: true,
        canCreateSummary: false,
      })
    })

    it('should return usage stats for ENTERPRISE user with unlimited plan', async () => {
      const userId = 'user_enterprise'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const enterpriseUser = createMockUser({
        id: userId,
        plan: 'ENTERPRISE',
        summariesUsed: 1000,
        summariesLimit: -1, // Unlimited
      })
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(enterpriseUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(enterpriseUser)
      // Mock monthly usage (high number, but unlimited)
      mockPrisma.summary.count.mockResolvedValueOnce(100)
      
      const caller = billingRouter.createCaller(mockContext)
      const result = await caller.getUsageStats()
      
      expect(result).toEqual({
        currentMonthUsage: 100,
        monthlyLimit: -1,
        totalSummaries: 1000,
        planConfig: PRICING_PLANS.ENTERPRISE,
        isLimitReached: false,
        canCreateSummary: true,
      })
    })

    it('should throw error when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware - auto-create user
      const autoCreatedUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      mockPrisma.user.create.mockResolvedValueOnce(autoCreatedUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = billingRouter.createCaller(mockContext)
      
      await expect(caller.getUsageStats()).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })
  })
})