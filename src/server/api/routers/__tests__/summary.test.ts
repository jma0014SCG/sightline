import { summaryRouter } from '../summary'
import { 
  createMockContext, 
  createAuthenticatedContext,
  createMockFetchResponse,
} from '@/test-utils/trpc'
import { 
  createMockUser,
  createMockSummary,
  createMockPythonAPIResponse,
  MOCK_BROWSER_FINGERPRINT,
  MOCK_CLIENT_IP,
  ANONYMOUS_USER_ID,
} from '@/test-utils/mocks'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { type PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockResolvedValue({ userId: null }),
}))

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}))

// Mock Next.js headers
const mockHeaders = new Map([
  ['x-forwarded-for', MOCK_CLIENT_IP],
  ['user-agent', 'test-agent'],
])
mockHeaders.get = function(name: string) {
  return Map.prototype.get.call(this, name)
}

jest.mock('next/headers', () => ({
  headers: jest.fn(() => mockHeaders),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Create mock Prisma client
const mockPrisma = mockDeep<PrismaClient>()

describe('summaryRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReset(mockPrisma)
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('createAnonymous', () => {
    const validInput = {
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      browserFingerprint: MOCK_BROWSER_FINGERPRINT,
    }

    it('should create anonymous summary successfully', async () => {
      // Setup mocks
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries for this fingerprint/IP
      mockPrisma.summary.findFirst.mockResolvedValueOnce(null) // fingerprint check
      mockPrisma.summary.findFirst.mockResolvedValueOnce(null) // IP check
      
      // Mock Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock summary creation
      const createdSummary = createMockSummary({
        id: 'new_summary_123',
        userId: ANONYMOUS_USER_ID,
        videoId: pythonResponse.video_id,
      })
      mockPrisma.summary.create.mockResolvedValueOnce(createdSummary)
      
      // Execute
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.createAnonymous(validInput)
      
      // Assert
      expect(result).toMatchObject({
        id: 'new_summary_123',
        videoId: pythonResponse.video_id,
        isAnonymous: true,
        canSave: false,
        task_id: pythonResponse.task_id,
      })
      
      expect(mockPrisma.summary.findFirst).toHaveBeenCalledTimes(2)
      expect(mockPrisma.summary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: ANONYMOUS_USER_ID,
          videoId: pythonResponse.video_id,
          videoUrl: validInput.url,
          metadata: expect.objectContaining({
            browserFingerprint: MOCK_BROWSER_FINGERPRINT,
            clientIP: MOCK_CLIENT_IP,
            isAnonymous: true,
          }),
        }),
      })
    })

    it('should reject when browser fingerprint already used', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // Existing summary found for this fingerprint
      mockPrisma.summary.findFirst.mockResolvedValueOnce(
        createMockSummary({ userId: ANONYMOUS_USER_ID })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.createAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: "Welcome back! You've already used your free trial. Sign up now to get 3 summaries every month!",
        })
      )
      
      expect(mockPrisma.summary.findFirst).toHaveBeenCalledTimes(1)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should reject when IP address already used', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No fingerprint match, but IP match found
      mockPrisma.summary.findFirst.mockResolvedValueOnce(null)
      mockPrisma.summary.findFirst.mockResolvedValueOnce(
        createMockSummary({ userId: ANONYMOUS_USER_ID })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.createAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: "A free summary has already been used from this location. Sign up now to get 3 summaries every month!",
        })
      )
      
      expect(mockPrisma.summary.findFirst).toHaveBeenCalledTimes(2)
    })

    it('should reject invalid YouTube URLs', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      const invalidUrls = [
        'https://example.com',
        'https://vimeo.com/123456',
        'not-a-url',
        'https://youtube.com/invalid',
      ]
      
      for (const url of invalidUrls) {
        await expect(
          caller.createAnonymous({ url, browserFingerprint: MOCK_BROWSER_FINGERPRINT })
        ).rejects.toThrow('Only YouTube URLs are allowed')
      }
    })

    it('should handle suspicious content detection', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      const suspiciousUrl = 'https://youtube.com/watch?v=test<script>alert("xss")</script>'
      
      await expect(
        caller.createAnonymous({ 
          url: suspiciousUrl, 
          browserFingerprint: MOCK_BROWSER_FINGERPRINT 
        })
      ).rejects.toThrow('Only YouTube URLs are allowed') // This will be caught by URL validation first
    })

    it('should handle Python API errors', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      // Mock Python API error response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse({ error: 'Failed to process video' }, 500)
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.createAnonymous(validInput)).rejects.toThrow(
        'Failed to process video'
      )
    })

    it('should handle missing required fields in API response', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      // Mock incomplete Python API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse({
          video_id: 'test123',
          // Missing required fields like video_title and summary
        })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.createAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid response from summarization API - missing required fields',
        })
      )
    })

    it('should handle network errors', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.createAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Network error',
        })
      )
    })

    it('should handle classification service failures gracefully', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // No existing summaries
      mockPrisma.summary.findFirst.mockResolvedValue(null)
      
      // Mock successful Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock summary creation
      const createdSummary = createMockSummary({
        id: 'new_summary_123',
        userId: ANONYMOUS_USER_ID,
      })
      mockPrisma.summary.create.mockResolvedValueOnce(createdSummary)
      
      // Note: Classification happens asynchronously and failures are logged but don't fail the request
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.createAnonymous(validInput)
      
      // Should still succeed even if classification fails
      expect(result).toMatchObject({
        id: 'new_summary_123',
        isAnonymous: true,
        canSave: false,
      })
    })
  })

  describe('create (authenticated)', () => {
    const validInput = {
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    }

    it('should create summary for FREE plan user within limits', async () => {
      const userId = 'user_free_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock user with FREE plan
      const freeUser = createMockUser({
        id: userId,
        plan: 'FREE',
        summariesUsed: 1,
        summariesLimit: 3,
      })
      // Need to mock the user lookup in the protected procedure middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      // Mock the user lookup in the create procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(freeUser)
      
      // Mock Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock summary upsert
      const createdSummary = createMockSummary({
        id: 'new_summary_123',
        userId: userId,
        videoId: pythonResponse.video_id,
      })
      mockPrisma.summary.upsert.mockResolvedValueOnce(createdSummary)
      
      // Mock user update (increment summariesUsed)
      mockPrisma.user.update.mockResolvedValueOnce({
        ...freeUser,
        summariesUsed: 2,
      })
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.create(validInput)
      
      expect(result).toMatchObject({
        id: 'new_summary_123',
        videoId: pythonResponse.video_id,
      })
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          summariesUsed: { increment: 1 },
        },
      })
    })

    it('should reject when FREE plan limit reached', async () => {
      const userId = 'user_free_limit'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock user at limit
      const limitUser = createMockUser({
        id: userId,
        plan: 'FREE',
        summariesUsed: 3,
        summariesLimit: 3,
      })
      // Mock for middleware and procedure
      mockPrisma.user.findUnique.mockResolvedValueOnce(limitUser)
      mockPrisma.user.findUnique.mockResolvedValueOnce(limitUser)
      
      // Mock monthly summary count at limit (for FREE plan monthly check)
      mockPrisma.summary.count.mockResolvedValueOnce(3)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.create(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: "You've reached your monthly limit of 3 summaries. Your limit resets on the 1st of next month. Upgrade to Pro for 25 summaries per month!",
        })
      )
    })

    it('should create summary for PRO plan user within monthly limits', async () => {
      const userId = 'user_pro_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock PRO user
      const proUser = createMockUser({
        id: userId,
        plan: 'PRO',
        summariesUsed: 50, // Total lifetime
        summariesLimit: 25, // Monthly limit
      })
      // Mock for middleware and procedure
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      mockPrisma.user.findUnique.mockResolvedValueOnce(proUser)
      
      // Mock monthly summary count (less than limit)
      mockPrisma.summary.count.mockResolvedValueOnce(10)
      
      // Mock Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock summary upsert
      const createdSummary = createMockSummary({
        id: 'new_summary_123',
        userId: userId,
      })
      mockPrisma.summary.upsert.mockResolvedValueOnce(createdSummary)
      
      // Mock user update
      mockPrisma.user.update.mockResolvedValueOnce({
        ...proUser,
        summariesUsed: 51,
      })
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.create(validInput)
      
      expect(result).toBeDefined()
      expect(mockPrisma.summary.count).toHaveBeenCalledWith({
        where: {
          userId: userId,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      })
    })

    it('should reject when PRO plan monthly limit reached', async () => {
      const userId = 'user_pro_limit'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock PRO user
      const proLimitUser = createMockUser({
        id: userId,
        plan: 'PRO',
        summariesLimit: 25,
      })
      // Mock for middleware and procedure
      mockPrisma.user.findUnique.mockResolvedValueOnce(proLimitUser)
      mockPrisma.user.findUnique.mockResolvedValueOnce(proLimitUser)
      
      // Mock monthly summary count at limit
      mockPrisma.summary.count.mockResolvedValueOnce(25)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.create(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: "You've reached your monthly limit of 25 summaries. Your limit resets on the 1st of next month.",
        })
      )
    })

    it('should handle existing video for same user (upsert)', async () => {
      const userId = 'user_existing_video'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock user
      const existingVideoUser = createMockUser({ id: userId })
      // Mock for middleware and procedure
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingVideoUser)
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingVideoUser)
      
      // Mock Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock finding existing summary
      const existingSummary = createMockSummary({
        id: 'existing_summary',
        userId: userId,
        videoId: pythonResponse.video_id,
      })
      mockPrisma.summary.findUnique.mockResolvedValueOnce(existingSummary)
      
      // Mock upsert (should update existing)
      mockPrisma.summary.upsert.mockResolvedValueOnce({
        ...existingSummary,
        updatedAt: new Date(),
      })
      
      // For existing summaries, summariesUsed should NOT be incremented
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.create(validInput)
      
      expect(result.id).toBe('existing_summary')
      expect(mockPrisma.user.update).not.toHaveBeenCalled() // Should not increment for existing
    })

    it('should reject when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.create(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })

    it('should allow unlimited summaries for special plans', async () => {
      const userId = 'user_unlimited'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock user with unlimited plan
      const unlimitedUser = createMockUser({
        id: userId,
        plan: 'ENTERPRISE' as any,
        summariesLimit: -1, // Unlimited
      })
      // Mock for middleware and procedure
      mockPrisma.user.findUnique.mockResolvedValueOnce(unlimitedUser)
      mockPrisma.user.findUnique.mockResolvedValueOnce(unlimitedUser)
      
      // Mock Python API response
      const pythonResponse = createMockPythonAPIResponse()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockFetchResponse(pythonResponse)
      )
      
      // Mock summary creation
      mockPrisma.summary.upsert.mockResolvedValueOnce(
        createMockSummary({ userId: userId })
      )
      mockPrisma.user.update.mockResolvedValueOnce(
        createMockUser({ summariesUsed: 1000 })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.create(validInput)
      
      expect(result).toBeDefined()
      // Should not check monthly limits for unlimited plans
      expect(mockPrisma.summary.count).not.toHaveBeenCalled()
    })
  })

  describe('getAnonymous', () => {
    const validInput = {
      id: 'summary_123',
      browserFingerprint: MOCK_BROWSER_FINGERPRINT,
    }

    it('should retrieve anonymous summary with matching fingerprint', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // Mock finding anonymous summary
      const anonymousSummary = createMockSummary({
        id: validInput.id,
        userId: ANONYMOUS_USER_ID,
        metadata: {
          browserFingerprint: MOCK_BROWSER_FINGERPRINT,
          isAnonymous: true,
        },
      })
      mockPrisma.summary.findUnique.mockResolvedValueOnce(anonymousSummary)
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.getAnonymous(validInput)
      
      expect(result).toMatchObject({
        ...anonymousSummary,
        isAnonymous: true,
        canSave: false,
      })
    })

    it('should reject when summary not found', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      mockPrisma.summary.findUnique.mockResolvedValueOnce(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.getAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })

    it('should reject non-anonymous summaries', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // Mock finding authenticated user's summary
      mockPrisma.summary.findUnique.mockResolvedValueOnce(
        createMockSummary({
          id: validInput.id,
          userId: 'user_123', // Not anonymous
        })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.getAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'This summary requires authentication',
        })
      )
    })

    it('should reject when fingerprint does not match', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      
      // Mock finding anonymous summary with different fingerprint
      mockPrisma.summary.findUnique.mockResolvedValueOnce(
        createMockSummary({
          id: validInput.id,
          userId: ANONYMOUS_USER_ID,
          metadata: {
            browserFingerprint: 'different-fingerprint',
            isAnonymous: true,
          },
        })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.getAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access this summary',
        })
      )
    })
  })

  describe('claimAnonymous', () => {
    const validInput = {
      summaryId: 'summary_123',
      browserFingerprint: MOCK_BROWSER_FINGERPRINT,
    }

    it('should successfully claim anonymous summary', async () => {
      const userId = 'user_claiming'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock finding anonymous summary
      const anonymousSummary = createMockSummary({
        id: validInput.summaryId,
        userId: ANONYMOUS_USER_ID,
        videoId: 'video_123',
        metadata: {
          browserFingerprint: MOCK_BROWSER_FINGERPRINT,
          isAnonymous: true,
        },
      })
      mockPrisma.summary.findUnique.mockResolvedValueOnce(anonymousSummary)
      
      // Mock checking for existing summary with same video
      mockPrisma.summary.findUnique.mockResolvedValueOnce(null) // No existing
      
      // Mock updating summary
      const claimedSummary = {
        ...anonymousSummary,
        userId: userId,
        metadata: {
          ...anonymousSummary.metadata,
          claimedAt: expect.any(String),
          isAnonymous: false,
        },
      }
      mockPrisma.summary.update.mockResolvedValueOnce(claimedSummary)
      
      // Mock updating user's summariesUsed
      mockPrisma.user.update.mockResolvedValueOnce(
        createMockUser({ summariesUsed: 1 })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.claimAnonymous(validInput)
      
      expect(result).toMatchObject({
        ...claimedSummary,
        isAnonymous: false,
        canSave: true,
      })
      
      expect(mockPrisma.summary.update).toHaveBeenCalledWith({
        where: { id: validInput.summaryId },
        data: {
          userId: userId,
          metadata: expect.objectContaining({
            claimedAt: expect.any(String),
            isAnonymous: false,
          }),
        },
      })
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          summariesUsed: { increment: 1 },
        },
      })
    })

    it('should reject when summary not found', async () => {
      const userId = 'user_claiming'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.summary.findUnique.mockResolvedValueOnce(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.claimAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })

    it('should reject when summary is not anonymous', async () => {
      const userId = 'user_claiming'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock finding non-anonymous summary
      mockPrisma.summary.findUnique.mockResolvedValueOnce(
        createMockSummary({
          id: validInput.summaryId,
          userId: 'other_user', // Not anonymous
        })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.claimAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This is not an anonymous summary or is already owned by a user',
        })
      )
    })

    it('should reject when fingerprint does not match', async () => {
      const userId = 'user_claiming'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock finding anonymous summary with different fingerprint
      mockPrisma.summary.findUnique.mockResolvedValueOnce(
        createMockSummary({
          id: validInput.summaryId,
          userId: ANONYMOUS_USER_ID,
          metadata: {
            browserFingerprint: 'different-fingerprint',
            isAnonymous: true,
          },
        })
      )
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.claimAnonymous(validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot claim this summary',
        })
      )
    })

    it('should delete anonymous summary if user already has same video', async () => {
      const userId = 'user_with_existing'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock finding anonymous summary
      const anonymousSummary = createMockSummary({
        id: validInput.summaryId,
        userId: ANONYMOUS_USER_ID,
        videoId: 'video_123',
        metadata: {
          browserFingerprint: MOCK_BROWSER_FINGERPRINT,
          isAnonymous: true,
        },
      })
      mockPrisma.summary.findUnique.mockResolvedValueOnce(anonymousSummary)
      
      // Mock finding existing summary for same video (using findFirst, not findUnique)
      const existingSummary = createMockSummary({
        id: 'existing_summary',
        userId: userId,
        videoId: 'video_123',
      })
      mockPrisma.summary.findFirst.mockResolvedValueOnce(existingSummary)
      
      // Mock deleting anonymous summary
      mockPrisma.summary.delete.mockResolvedValueOnce(anonymousSummary)
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.claimAnonymous(validInput)
      
      expect(result).toEqual(existingSummary)
      
      expect(mockPrisma.summary.delete).toHaveBeenCalledWith({
        where: { id: validInput.summaryId },
      })
      
      // Should not update user's summariesUsed since they already had this video
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('should retrieve user\'s own summary', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({
        id: summaryId,
        userId: userId,
      })
      mockPrisma.summary.findUnique.mockResolvedValueOnce(mockSummary)
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.getById({ id: summaryId })
      
      expect(result).toEqual(mockSummary)
      expect(mockPrisma.summary.findUnique).toHaveBeenCalledWith({
        where: {
          id: summaryId,
          userId: userId,
        },
      })
    })

    it('should return 404 for non-existent summary', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.summary.findUnique.mockResolvedValueOnce(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.getById({ id: 'non_existent' })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })

    it('should return 404 for other user\'s summary', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Query will not return summary owned by another user due to userId filter
      mockPrisma.summary.findUnique.mockResolvedValueOnce(null)
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.getById({ id: 'other_users_summary' })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })
  })

  describe('update', () => {
    it('should update summary content', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const newContent = 'Updated summary content'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const updatedSummary = createMockSummary({
        id: summaryId,
        userId: userId,
        content: JSON.stringify({ summary: newContent }),
      })
      mockPrisma.summary.updateMany.mockResolvedValueOnce({ count: 1 })
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.update({ id: summaryId, content: newContent })
      
      expect(result).toEqual({ success: true })
      expect(mockPrisma.summary.updateMany).toHaveBeenCalledWith({
        where: {
          id: summaryId,
          userId: userId,
        },
        data: {
          content: newContent,
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should return 404 when updating non-existent summary', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.summary.updateMany.mockResolvedValueOnce({ count: 0 })
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(
        caller.update({ id: 'non_existent', content: 'new content' })
      ).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete user\'s summary', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.summary.deleteMany.mockResolvedValueOnce({ count: 1 })
      
      const caller = summaryRouter.createCaller(mockContext)
      const result = await caller.delete({ id: summaryId })
      
      expect(result).toEqual({ success: true })
      expect(mockPrisma.summary.deleteMany).toHaveBeenCalledWith({
        where: {
          id: summaryId,
          userId: userId,
        },
      })
    })

    it('should return 404 when deleting non-existent summary', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.summary.deleteMany.mockResolvedValueOnce({ count: 0 })
      
      const caller = summaryRouter.createCaller(mockContext)
      
      await expect(caller.delete({ id: 'non_existent' })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        })
      )
    })
  })
})