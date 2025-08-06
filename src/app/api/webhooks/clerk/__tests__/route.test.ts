// Mock Clerk webhook verification
const mockWebhook = {
  verify: jest.fn()
}

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => mockWebhook)
}))

import { POST } from '../route'
import { prisma } from '@/lib/db/prisma'

// Get the mocked prisma instance
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Mock Next.js headers
const mockHeaders = new Map()
jest.mock('next/headers', () => ({
  headers: () => mockHeaders
}))

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}))

// Mock console methods to avoid noise in tests
const originalConsole = console
beforeAll(() => {
  console.log = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.log = originalConsole.log
  console.error = originalConsole.error
})

describe('/api/webhooks/clerk', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeaders.clear()
    
    // Set default environment
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret'
    
    // Setup default headers
    mockHeaders.set('svix-id', 'test-id')
    mockHeaders.set('svix-timestamp', '1640995200')
    mockHeaders.set('svix-signature', 'test-signature')
  })

  describe('Header validation', () => {
    it('should reject requests without required headers', async () => {
      mockHeaders.clear()
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Error occured -- no svix headers')
    })

    it('should reject requests with missing svix-id', async () => {
      mockHeaders.delete('svix-id')
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Error occured -- no svix headers')
    })

    it('should reject requests with missing svix-timestamp', async () => {
      mockHeaders.delete('svix-timestamp')
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should reject requests with missing svix-signature', async () => {
      mockHeaders.delete('svix-signature')
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Webhook verification', () => {
    it('should reject invalid webhook signatures', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: { id: 'user_123' }
      }
      
      mockWebhook.verify.mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Error occured -- webhook verification failed')
      expect(console.error).toHaveBeenCalledWith('Error verifying webhook:', expect.any(Error))
    })

    it('should pass verification headers correctly', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: { id: 'user_123' }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      await POST(request)
      
      expect(mockWebhook.verify).toHaveBeenCalledWith(
        JSON.stringify(webhookPayload),
        {
          'svix-id': 'test-id',
          'svix-timestamp': '1640995200',
          'svix-signature': 'test-signature'
        }
      )
    })
  })

  describe('User created event', () => {
    it('should create user with complete data', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              id: 'email_456',
              email_address: 'test@example.com',
              verification: { status: 'verified' }
            }
          ],
          primary_email_address_id: 'email_456',
          first_name: 'John',
          last_name: 'Doe',
          image_url: 'https://example.com/avatar.jpg'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'John Doe',
          image: 'https://example.com/avatar.jpg',
          emailVerified: expect.any(Date)
        }
      })
      expect(console.log).toHaveBeenCalledWith('User created: user_123')
    })

    it('should handle user creation with minimal data', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              id: 'email_456',
              email_address: 'test@example.com',
              verification: { status: 'unverified' }
            }
          ],
          primary_email_address_id: 'email_456'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'user_123',
          email: 'test@example.com',
          name: null,
          image: null,
          emailVerified: null
        }
      })
    })

    it('should handle empty names gracefully', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              id: 'email_456',
              email_address: 'test@example.com'
            }
          ],
          primary_email_address_id: 'email_456',
          first_name: '',
          last_name: ''
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      await POST(request)
      
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'user_123',
          email: 'test@example.com',
          name: null,
          image: null,
          emailVerified: null
        }
      })
    })
  })

  describe('User updated event', () => {
    it('should update user with new data', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              id: 'email_456',
              email_address: 'updated@example.com',
              verification: { status: 'verified' }
            }
          ],
          primary_email_address_id: 'email_456',
          first_name: 'Jane',
          last_name: 'Smith',
          image_url: 'https://example.com/new-avatar.jpg'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.update.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          email: 'updated@example.com',
          name: 'Jane Smith',
          image: 'https://example.com/new-avatar.jpg',
          emailVerified: expect.any(Date)
        }
      })
      expect(console.log).toHaveBeenCalledWith('User updated: user_123')
    })

    it('should handle user update with partial data', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              id: 'email_456',
              email_address: 'test@example.com'
            }
          ],
          primary_email_address_id: 'email_456'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.update.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      await POST(request)
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          email: 'test@example.com',
          name: null,
          image: null,
          emailVerified: null
        }
      })
    })
  })

  describe('User deleted event', () => {
    it('should delete user successfully', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: {
          id: 'user_123'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.delete.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user_123' }
      })
      expect(console.log).toHaveBeenCalledWith('User deleted: user_123')
    })

    it('should handle deletion with missing id gracefully', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: {}
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })
  })

  describe('Unhandled events', () => {
    it('should handle unknown event types gracefully', async () => {
      const webhookPayload = {
        type: 'user.unknown_event',
        data: { id: 'user_123' }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(console.log).toHaveBeenCalledWith('Unhandled event type: user.unknown_event')
    })
  })

  describe('Error handling', () => {
    it('should handle database errors during user creation', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ id: 'email_456', email_address: 'test@example.com' }],
          primary_email_address_id: 'email_456'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).toBe('Error handling webhook')
      expect(console.error).toHaveBeenCalledWith('Error handling webhook:', expect.any(Error))
    })

    it('should handle database errors during user update', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [{ id: 'email_456', email_address: 'test@example.com' }],
          primary_email_address_id: 'email_456'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.update.mockRejectedValue(new Error('User not found'))
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })

    it('should handle database errors during user deletion', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: { id: 'user_123' }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.delete.mockRejectedValue(new Error('User not found'))
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('Success responses', () => {
    it('should return success message for handled webhooks', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ id: 'email_456', email_address: 'test@example.com' }],
          primary_email_address_id: 'email_456'
        }
      }
      
      mockWebhook.verify.mockReturnValue(webhookPayload)
      mockPrisma.user.create.mockResolvedValue({})
      
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('Webhook handled successfully')
    })
  })
})