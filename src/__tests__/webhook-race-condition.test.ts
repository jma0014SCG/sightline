/**
 * Test suite for webhook race condition fix
 */

import { POST } from '@/app/api/webhooks/clerk/route'
import { prisma } from '@/lib/db/prisma'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    usageEvent: {
      create: jest.fn()
    }
  }
}))

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockImplementation((payload) => JSON.parse(payload))
  }))
}))

jest.mock('@/lib/services/webhookSecurity', () => ({
  preventWebhookReplay: jest.fn().mockResolvedValue({ valid: true }),
  trackWebhookRetry: jest.fn().mockResolvedValue(undefined)
}))

describe('Webhook Race Condition Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should use upsert instead of create for user.created event', async () => {
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [
          {
            id: 'email_123',
            email_address: 'test@example.com',
            verification: { status: 'verified' }
          }
        ],
        primary_email_address_id: 'email_123',
        first_name: 'Test',
        last_name: 'User',
        image_url: 'https://example.com/avatar.jpg'
      }
    }

    // Mock the request
    const mockRequest = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_123',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'sig_123'
      },
      body: JSON.stringify(webhookPayload)
    })

    // Mock headers() function
    const mockHeaders = new Map([
      ['svix-id', 'msg_123'],
      ['svix-timestamp', String(Date.now())],
      ['svix-signature', 'sig_123']
    ])
    
    jest.spyOn(await import('next/headers'), 'headers').mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
      has: (key: string) => mockHeaders.has(key),
      entries: () => mockHeaders.entries(),
      keys: () => mockHeaders.keys(),
      values: () => mockHeaders.values(),
      forEach: mockHeaders.forEach.bind(mockHeaders)
    } as any)

    // Mock successful upsert
    ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User'
    })

    // Execute webhook handler
    const response = await POST(mockRequest)

    // Verify upsert was called (not create)
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      update: {
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        emailVerified: expect.any(Date)
      },
      create: {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        emailVerified: expect.any(Date)
      }
    })

    expect(response.status).toBe(200)
    const responseText = await response.text()
    expect(responseText).toBe('Webhook handled successfully')
  })

  it('should handle race condition where user already exists', async () => {
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'existing_user',
        email_addresses: [
          {
            id: 'email_456',
            email_address: 'existing@example.com',
            verification: { status: 'verified' }
          }
        ],
        primary_email_address_id: 'email_456',
        first_name: 'Existing',
        last_name: 'User',
        image_url: null
      }
    }

    const mockRequest = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_456',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'sig_456'
      },
      body: JSON.stringify(webhookPayload)
    })

    const mockHeaders = new Map([
      ['svix-id', 'msg_456'],
      ['svix-timestamp', String(Date.now())],
      ['svix-signature', 'sig_456']
    ])
    
    jest.spyOn(await import('next/headers'), 'headers').mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
      has: (key: string) => mockHeaders.has(key),
      entries: () => mockHeaders.entries(),
      keys: () => mockHeaders.keys(),
      values: () => mockHeaders.values(),
      forEach: mockHeaders.forEach.bind(mockHeaders)
    } as any)

    // Simulate user already exists from protectedProcedure auto-creation
    const existingUser = {
      id: 'existing_user',
      email: 'temp_existing_user@placeholder.com', // Placeholder email
      name: null,
      image: null,
      emailVerified: null
    }

    // Upsert will update the existing user with real data
    ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
      id: 'existing_user',
      email: 'existing@example.com', // Real email from Clerk
      name: 'Existing User',
      image: null,
      emailVerified: new Date()
    })

    const response = await POST(mockRequest)

    // Verify upsert properly updated the existing user
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'existing_user' },
      update: {
        email: 'existing@example.com', // Updates with real email
        name: 'Existing User',
        image: undefined, // undefined won't update null values
        emailVerified: expect.any(Date)
      },
      create: {
        id: 'existing_user',
        email: 'existing@example.com',
        name: 'Existing User',
        image: null,
        emailVerified: expect.any(Date)
      }
    })

    expect(response.status).toBe(200)
  })

  it('should not overwrite existing data with empty values', async () => {
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'partial_user',
        email_addresses: [], // No email addresses
        primary_email_address_id: null,
        first_name: '', // Empty first name
        last_name: '', // Empty last name
        image_url: null
      }
    }

    const mockRequest = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_789',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'sig_789'
      },
      body: JSON.stringify(webhookPayload)
    })

    const mockHeaders = new Map([
      ['svix-id', 'msg_789'],
      ['svix-timestamp', String(Date.now())],
      ['svix-signature', 'sig_789']
    ])
    
    jest.spyOn(await import('next/headers'), 'headers').mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
      has: (key: string) => mockHeaders.has(key),
      entries: () => mockHeaders.entries(),
      keys: () => mockHeaders.keys(),
      values: () => mockHeaders.values(),
      forEach: mockHeaders.forEach.bind(mockHeaders)
    } as any)

    ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
      id: 'partial_user',
      email: 'temp_partial_user@placeholder.com',
      name: null,
      image: null
    })

    const response = await POST(mockRequest)

    // Verify upsert doesn't overwrite with empty/undefined values
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'partial_user' },
      update: {
        email: undefined, // Won't overwrite existing
        name: undefined, // Won't overwrite existing
        image: undefined, // Won't overwrite existing
        emailVerified: undefined // Won't overwrite existing
      },
      create: {
        id: 'partial_user',
        email: '', // Empty string for new creation
        name: null,
        image: null,
        emailVerified: null
      }
    })

    expect(response.status).toBe(200)
  })
})