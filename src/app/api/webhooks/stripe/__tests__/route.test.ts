// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn()
    },
    subscriptions: {
      retrieve: jest.fn()
    }
  },
  getPlanByPriceId: jest.fn()
}))

import { POST } from '../route'
import { prisma } from '@/lib/db/prisma'
import { stripe, getPlanByPriceId } from '@/lib/stripe'
import { logger } from '@/lib/logger'

// Get the mocked instances
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockStripe = stripe as jest.Mocked<typeof stripe>
const mockGetPlanByPriceId = getPlanByPriceId as jest.MockedFunction<typeof getPlanByPriceId>
const mockLogger = logger as jest.Mocked<typeof logger>

// Mock Next.js headers
const mockHeaders = new Map()
jest.mock('next/headers', () => ({
  headers: () => mockHeaders
}))

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

describe('/api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeaders.clear()
    
    // Set default environment
    process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret'
    
    // Setup default headers
    mockHeaders.set('stripe-signature', 'test-signature')
  })

  describe('Webhook signature verification', () => {
    it('should reject requests without stripe-signature header', async () => {
      mockHeaders.clear()
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: 'webhook-body'
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500) // Will throw error accessing signature
    })

    it('should reject requests with invalid signatures', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Webhook signature verification failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Webhook signature verification failed:', expect.any(Error))
    })

    it('should verify webhook signature with correct parameters', async () => {
      const eventData = { type: 'test.event', data: { object: {} } }
      mockStripe.webhooks.constructEvent.mockReturnValue(eventData)
      
      const requestBody = JSON.stringify(eventData)
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: requestBody
      })
      
      await POST(request)
      
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        requestBody,
        'test-signature',
        'test-webhook-secret'
      )
    })
  })

  describe('checkout.session.completed event', () => {
    it('should handle successful checkout session', async () => {
      const session = {
        id: 'cs_123',
        mode: 'subscription',
        customer: 'cus_123',
        subscription: 'sub_123'
      }
      
      const subscription = {
        id: 'sub_123',
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: 1640995200
      }
      
      const event = {
        type: 'checkout.session.completed',
        data: { object: session }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription)
      mockGetPlanByPriceId.mockReturnValue('PRO')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      mockPrisma.user.update.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'PRO',
          stripeSubscriptionId: 'sub_123',
          stripePriceId: 'price_pro',
          stripeCurrentPeriodEnd: new Date(1640995200000),
          summariesLimit: 25
        }
      })
    })

    it('should skip non-subscription checkout sessions', async () => {
      const session = {
        id: 'cs_123',
        mode: 'payment',
        customer: 'cus_123'
      }
      
      const event = {
        type: 'checkout.session.completed',
        data: { object: session }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription events', () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_pro' } }] },
      current_period_end: 1640995200
    }

    beforeEach(() => {
      mockGetPlanByPriceId.mockReturnValue('PRO')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      mockPrisma.user.update.mockResolvedValue({})
    })

    it('should handle subscription created event', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'PRO',
          stripeSubscriptionId: 'sub_123',
          stripePriceId: 'price_pro',
          stripeCurrentPeriodEnd: new Date(1640995200000),
          summariesLimit: 25
        }
      })
      expect(mockLogger.info).toHaveBeenCalledWith('Updated user user_123 to PRO plan')
    })

    it('should handle subscription updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    it('should handle subscription deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'FREE',
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          summariesLimit: 3
        }
      })
      expect(mockLogger.info).toHaveBeenCalledWith('Downgraded user user_123 to FREE plan')
    })

    it('should handle user not found during subscription change', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockLogger.error).toHaveBeenCalledWith('User not found for Stripe customer:', 'cus_123')
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle missing price ID', async () => {
      const subscriptionWithoutPrice = {
        ...subscription,
        items: { data: [] }
      }
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscriptionWithoutPrice }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockLogger.error).toHaveBeenCalledWith('No price ID found in subscription:', 'sub_123')
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle unknown price ID', async () => {
      mockGetPlanByPriceId.mockReturnValue(null)
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockLogger.error).toHaveBeenCalledWith('Unknown price ID:', 'price_pro')
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should set correct limits for different plans', async () => {
      // Test FREE plan
      mockGetPlanByPriceId.mockReturnValue('FREE')
      
      let event = {
        type: 'customer.subscription.created',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      let request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      await POST(request)
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'FREE',
            summariesLimit: 3
          })
        })
      )

      // Test PRO plan
      jest.clearAllMocks()
      mockGetPlanByPriceId.mockReturnValue('PRO')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      
      await POST(request)
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'PRO',
            summariesLimit: 25
          })
        })
      )

      // Test unlimited plan (e.g., ENTERPRISE)
      jest.clearAllMocks()
      mockGetPlanByPriceId.mockReturnValue('ENTERPRISE')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      
      await POST(request)
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'ENTERPRISE',
            summariesLimit: -1
          })
        })
      )
    })
  })

  describe('invoice events', () => {
    const invoice = {
      id: 'in_123',
      subscription: 'sub_123'
    }

    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_pro' } }] },
      current_period_end: 1640995200
    }

    beforeEach(() => {
      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription)
      mockGetPlanByPriceId.mockReturnValue('PRO')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      mockPrisma.user.update.mockResolvedValue({})
    })

    it('should handle successful payment', async () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: { object: invoice }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    it('should handle payment without subscription', async () => {
      const invoiceWithoutSub = { id: 'in_123' }
      
      const event = {
        type: 'invoice.payment_succeeded',
        data: { object: invoiceWithoutSub }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
    })

    it('should handle failed payment', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: { object: invoice }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockLogger.warn).toHaveBeenCalledWith('Payment failed for invoice:', 'in_123')
    })
  })

  describe('Unhandled events', () => {
    it('should handle unknown event types gracefully', async () => {
      const event = {
        type: 'unknown.event.type',
        data: { object: {} }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
      expect(mockLogger.debug).toHaveBeenCalledWith('Unhandled event type: unknown.event.type')
    })
  })

  describe('Error handling', () => {
    it('should handle database errors during subscription update', async () => {
      const subscription = {
        id: 'sub_123',
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: 1640995200
      }
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscription }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      mockGetPlanByPriceId.mockReturnValue('PRO')
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123' })
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Webhook handler failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Webhook error:', expect.any(Error))
    })

    it('should handle Stripe API errors', async () => {
      const subscription = {
        id: 'sub_123',
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: 1640995200
      }
      
      const session = {
        id: 'cs_123',
        mode: 'subscription',
        customer: 'cus_123',
        subscription: 'sub_123'
      }
      
      const event = {
        type: 'checkout.session.completed',
        data: { object: session }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      mockStripe.subscriptions.retrieve.mockRejectedValue(new Error('Subscription not found'))
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      expect(mockLogger.error).toHaveBeenCalledWith('Webhook error:', expect.any(Error))
    })
  })

  describe('Success responses', () => {
    it('should return success response for handled webhooks', async () => {
      const event = {
        type: 'unknown.event.type',
        data: { object: {} }
      }
      
      mockStripe.webhooks.constructEvent.mockReturnValue(event)
      
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith('Processing Stripe webhook:', 'unknown.event.type')
    })
  })
})