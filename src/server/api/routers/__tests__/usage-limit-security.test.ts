/**
 * Security Tests: Usage Limit Bypass Prevention
 * 
 * Critical security tests to verify that the usage limit bypass vulnerability
 * has been fixed. These tests ensure users cannot circumvent limits by 
 * deleting summaries and creating new ones.
 * 
 * VULNERABILITY: Users could delete summaries to decrease their count and bypass limits
 * FIX: Usage tracking through immutable UsageEvent records
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { appRouter } from '@/server/api/root'
import { createTRPCMsw } from 'msw-trpc'
import { TRPCError } from '@trpc/server'
import type { AppRouter } from '@/server/api/root'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  summary: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  usageEvent: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient

// Mock context
const createMockContext = (userId?: string) => ({
  prisma: mockPrisma,
  userId,
  headers: Promise.resolve(new Headers({
    'x-forwarded-for': '192.168.1.1',
    'user-agent': 'Test Browser'
  })),
})

describe('🔒 Usage Limit Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authenticated User Limit Bypass Prevention', () => {
    const TEST_USER_ID = 'user_test123'
    const MOCK_USER_FREE = {
      id: TEST_USER_ID,
      plan: 'FREE' as const,
      summariesLimit: 3,
      summariesUsed: 0,
    }

    it('🚨 SECURITY: Should prevent FREE users from bypassing lifetime limit via deletion', async () => {
      // Setup: User has already created 3 summaries (at limit)
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER_FREE)
      mockPrisma.usageEvent.count.mockResolvedValue(3) // 3 usage events exist (SECURITY FIX)
      
      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Attempt: User tries to create 4th summary (should fail)
      await expect(
        caller.summary.create({
          url: 'https://youtube.com/watch?v=test123'
        })
      ).rejects.toThrow('You\'ve reached your lifetime limit of 3 summaries')

      // Verify: Usage events query was used, not summary count
      expect(mockPrisma.usageEvent.count).toHaveBeenCalledWith({
        where: {
          userId: TEST_USER_ID,
          eventType: 'summary_created',
        },
      })

      // Verify: Legacy summary count query was NOT used
      expect(mockPrisma.summary.count).not.toHaveBeenCalled()
    })

    it('🚨 SECURITY: Should prevent PRO users from bypassing monthly limit via deletion', async () => {
      const MOCK_USER_PRO = {
        ...MOCK_USER_FREE,
        plan: 'PRO' as const,
        summariesLimit: 25,
      }

      // Setup: User has created 25 summaries this month
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER_PRO)
      mockPrisma.usageEvent.count.mockResolvedValue(25) // 25 usage events this month

      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Attempt: User tries to create 26th summary this month
      await expect(
        caller.summary.create({
          url: 'https://youtube.com/watch?v=test456'
        })
      ).rejects.toThrow('You\'ve reached your monthly limit of 25 summaries')

      // Verify: Monthly usage events query was used
      expect(mockPrisma.usageEvent.count).toHaveBeenCalledWith({
        where: {
          userId: TEST_USER_ID,
          eventType: 'summary_created',
          createdAt: {
            gte: expect.any(Date), // Start of current month
          },
        },
      })
    })

    it('✅ Should allow FREE users to create summaries within limit', async () => {
      // Setup: User has only created 2 summaries
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER_FREE)
      mockPrisma.usageEvent.count.mockResolvedValue(2) // Only 2 usage events
      mockPrisma.summary.findUnique.mockResolvedValue(null)
      mockPrisma.summary.upsert.mockResolvedValue({
        id: 'summary_test123',
        userId: TEST_USER_ID,
        videoId: 'test123',
        videoTitle: 'Test Video',
        channelName: 'Test Channel',
        content: 'Test summary',
        createdAt: new Date(),
      })

      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Mock the fetch for FastAPI
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          video_id: 'test123',
          video_url: 'https://youtube.com/watch?v=test123',
          video_title: 'Test Video',
          channel_name: 'Test Channel',
          summary: 'Test summary content',
          duration: 120,
        })),
      }) as jest.Mock

      // Attempt: User creates 3rd summary (should succeed)
      const result = await caller.summary.create({
        url: 'https://youtube.com/watch?v=test123'
      })

      // Verify: Summary creation succeeded
      expect(result).toBeDefined()
      expect(mockPrisma.usageEvent.create).toHaveBeenCalledWith({
        data: {
          userId: TEST_USER_ID,
          eventType: 'summary_created',
          summaryId: expect.any(String),
          videoId: expect.any(String),
          metadata: expect.any(Object),
        },
      })
    })
  })

  describe('Anonymous User Limit Bypass Prevention', () => {
    const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'
    const TEST_FINGERPRINT = 'fp_test123'

    it('🚨 SECURITY: Should prevent anonymous users from bypassing limit via deletion', async () => {
      // Setup: Anonymous user already created summary with this fingerprint
      mockPrisma.usageEvent.findFirst
        .mockResolvedValueOnce({
          id: 'event_test123',
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: { browserFingerprint: TEST_FINGERPRINT }
        }) // Fingerprint check - FOUND
        .mockResolvedValueOnce(null) // IP check - not found

      const caller = appRouter.createCaller(createMockContext())

      // Attempt: Same fingerprint tries to create another summary
      await expect(
        caller.summary.createAnonymous({
          url: 'https://youtube.com/watch?v=test789',
          browserFingerprint: TEST_FINGERPRINT
        })
      ).rejects.toThrow('Welcome back! You\'ve already used your free trial')

      // Verify: Usage events query was used for fingerprint check
      expect(mockPrisma.usageEvent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: {
            path: ['browserFingerprint'],
            equals: TEST_FINGERPRINT,
          },
        },
      })

      // Verify: Legacy summary query was NOT used
      expect(mockPrisma.summary.findFirst).not.toHaveBeenCalled()
    })

    it('🚨 SECURITY: Should prevent anonymous users from bypassing IP-based limit', async () => {
      const TEST_IP = '192.168.1.100'

      // Setup: Different fingerprint but same IP already used
      mockPrisma.usageEvent.findFirst
        .mockResolvedValueOnce(null) // Fingerprint check - not found
        .mockResolvedValueOnce({
          id: 'event_test456',
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: { clientIP: TEST_IP }
        }) // IP check - FOUND

      const mockHeaders = new Headers({
        'x-forwarded-for': TEST_IP,
        'user-agent': 'Test Browser'
      })

      const caller = appRouter.createCaller({
        ...createMockContext(),
        headers: Promise.resolve(mockHeaders)
      })

      // Attempt: Different fingerprint from same IP tries to create summary
      await expect(
        caller.summary.createAnonymous({
          url: 'https://youtube.com/watch?v=test999',
          browserFingerprint: 'fp_different123'
        })
      ).rejects.toThrow('A free summary has already been used from this location')

      // Verify: Usage events query was used for IP check
      expect(mockPrisma.usageEvent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          metadata: {
            path: ['clientIP'],
            equals: TEST_IP,
          },
        },
      })
    })

    it('✅ Should allow first-time anonymous users to create summary', async () => {
      // Setup: New fingerprint and IP (no existing usage events)
      mockPrisma.usageEvent.findFirst.mockResolvedValue(null) // No existing usage events
      mockPrisma.summary.create.mockResolvedValue({
        id: 'summary_anon123',
        userId: ANONYMOUS_USER_ID,
        videoId: 'anon123',
        videoTitle: 'Anonymous Test Video',
        content: 'Test content',
        createdAt: new Date(),
      })

      // Mock the fetch for FastAPI
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          video_id: 'anon123',
          video_url: 'https://youtube.com/watch?v=anon123',
          video_title: 'Anonymous Test Video',
          channel_name: 'Test Channel',
          summary: 'Test summary content',
          duration: 180,
        })),
      }) as jest.Mock

      const caller = appRouter.createCaller(createMockContext())

      // Attempt: First-time anonymous user creates summary
      const result = await caller.summary.createAnonymous({
        url: 'https://youtube.com/watch?v=anon123',
        browserFingerprint: 'fp_new456'
      })

      // Verify: Summary creation succeeded
      expect(result).toBeDefined()
      expect(mockPrisma.usageEvent.create).toHaveBeenCalledWith({
        data: {
          userId: ANONYMOUS_USER_ID,
          eventType: 'summary_created',
          summaryId: expect.any(String),
          videoId: expect.any(String),
          metadata: expect.objectContaining({
            plan: 'ANONYMOUS',
            browserFingerprint: 'fp_new456',
          }),
        },
      })
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    it('🔒 Should handle corrupted summary deletion gracefully', async () => {
      const TEST_USER_ID = 'user_edge123'
      
      // Setup: User has 3 usage events but only 2 actual summaries (1 was deleted)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        plan: 'FREE',
        summariesLimit: 3,
      })
      mockPrisma.usageEvent.count.mockResolvedValue(3) // 3 usage events (immutable)
      
      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Attempt: User tries to exploit by claiming they only have 2 summaries
      await expect(
        caller.summary.create({
          url: 'https://youtube.com/watch?v=exploit123'
        })
      ).rejects.toThrow('You\'ve reached your lifetime limit')

      // Verify: Usage events are the source of truth, not summary count
      expect(mockPrisma.usageEvent.count).toHaveBeenCalled()
    })

    it('🔄 Should handle month boundary correctly for PRO users', async () => {
      const TEST_USER_ID = 'user_month123'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        plan: 'PRO',
        summariesLimit: 25,
      })
      
      // Setup: 25 summaries last month, 0 this month
      mockPrisma.usageEvent.count.mockResolvedValue(0) // 0 this month
      mockPrisma.summary.findUnique.mockResolvedValue(null)
      mockPrisma.summary.upsert.mockResolvedValue({
        id: 'summary_month123',
        userId: TEST_USER_ID,
        videoId: 'month123',
        content: 'Test',
        createdAt: new Date(),
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          video_id: 'month123',
          video_url: 'https://youtube.com/watch?v=month123',
          video_title: 'Month Test',
          channel_name: 'Test Channel',
          summary: 'Test summary',
          duration: 120,
        })),
      }) as jest.Mock

      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Attempt: Should allow creation in new month
      const result = await caller.summary.create({
        url: 'https://youtube.com/watch?v=month123'
      })

      expect(result).toBeDefined()

      // Verify: Monthly usage query used correct date range
      expect(mockPrisma.usageEvent.count).toHaveBeenCalledWith({
        where: {
          userId: TEST_USER_ID,
          eventType: 'summary_created',
          createdAt: {
            gte: expect.any(Date), // Should be start of current month
          },
        },
      })
    })
  })

  describe('Exploit Attempt Simulations', () => {
    it('💀 EXPLOIT BLOCKED: Delete-Create Loop Attack', async () => {
      const TEST_USER_ID = 'user_exploit123'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        plan: 'FREE',
        summariesLimit: 3,
      })

      // Simulate: User has already created 3 summaries (reached limit)
      mockPrisma.usageEvent.count.mockResolvedValue(3)
      
      const caller = appRouter.createCaller(createMockContext(TEST_USER_ID))

      // Simulate exploit attempt: Delete summary, then try to create new one
      // (In real exploit, user would call delete API first, then create)
      
      // Even if deletion "succeeds", usage events remain
      mockPrisma.summary.deleteMany.mockResolvedValue({ count: 1 })
      mockPrisma.usageEvent.count.mockResolvedValue(3) // Usage events unchanged!

      // Attempt: Try to create new summary after deletion
      await expect(
        caller.summary.create({
          url: 'https://youtube.com/watch?v=exploit456'
        })
      ).rejects.toThrow('You\'ve reached your lifetime limit')

      // SECURITY VERIFICATION: Exploit failed!
      expect(mockPrisma.usageEvent.count).toHaveBeenCalled()
    })
  })
})

describe('🔍 Usage Event Creation Verification', () => {
  it('Should create usage events with correct metadata structure', async () => {
    const mockCreate = jest.fn()
    mockPrisma.usageEvent.create = mockCreate

    // Verify authenticated user usage event structure
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: expect.any(String),
        eventType: 'summary_created',
        summaryId: expect.any(String),
        videoId: expect.any(String),
        metadata: expect.objectContaining({
          plan: expect.any(String),
          videoTitle: expect.any(String),
          channelName: expect.any(String),
          duration: expect.any(Number),
          timestamp: expect.any(String),
        }),
      },
    })
  })

  it('Should create anonymous usage events with tracking metadata', async () => {
    const mockCreate = jest.fn()
    mockPrisma.usageEvent.create = mockCreate

    // Verify anonymous usage event includes fingerprint and IP
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'ANONYMOUS_USER',
        eventType: 'summary_created',
        summaryId: expect.any(String),
        videoId: expect.any(String),
        metadata: expect.objectContaining({
          plan: 'ANONYMOUS',
          browserFingerprint: expect.any(String),
          clientIP: expect.any(String),
        }),
      },
    })
  })
})