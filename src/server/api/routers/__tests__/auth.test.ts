import { authRouter } from '../auth'
import { 
  createAuthenticatedContext,
} from '@/test-utils/trpc'
import { 
  createMockUser,
  createMockSummary,
} from '@/test-utils/mocks'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { type PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockResolvedValue({ userId: null }),
}))

// Create mock Prisma client
const mockPrisma = mockDeep<PrismaClient>()

describe('authRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReset(mockPrisma)
  })

  describe('getCurrentUser', () => {
    it('should return user data for authenticated user', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockUser = createMockUser({ id: userId })
      // Mock for middleware (enforceUserIsAuthed)
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.getCurrentUser()
      
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      })
    })

    it('should return null when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware (enforceUserIsAuthed) - will auto-create user
      const autoCreatedUser = createMockUser({ 
        id: userId, 
        email: `temp_${userId}@placeholder.com`,
        name: null,
        image: null,
        emailVerified: null,
      })
      mockPrisma.user.findUnique.mockResolvedValueOnce(null) // First check
      mockPrisma.user.create.mockResolvedValueOnce(autoCreatedUser) // Auto-create
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.getCurrentUser()
      
      expect(result).toBeNull()
    })
  })

  describe('getSecretMessage', () => {
    it('should return secret message for authenticated user', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.getSecretMessage()
      
      expect(result).toBe("You can see this secret message because you're authenticated!")
    })
  })

  describe('updateProfile', () => {
    it('should update user name successfully', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const updatedUser = createMockUser({
        id: userId,
        name: 'Updated Name',
      })
      mockPrisma.user.update.mockResolvedValueOnce(updatedUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateProfile({ name: 'Updated Name' })
      
      expect(result).toEqual(updatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: 'Updated Name',
          image: undefined,
        },
      })
    })

    it('should update user image successfully', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const updatedUser = createMockUser({
        id: userId,
        image: 'https://example.com/new-avatar.jpg',
      })
      mockPrisma.user.update.mockResolvedValueOnce(updatedUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateProfile({ 
        image: 'https://example.com/new-avatar.jpg' 
      })
      
      expect(result).toEqual(updatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: undefined,
          image: 'https://example.com/new-avatar.jpg',
        },
      })
    })

    it('should update both name and image', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const updatedUser = createMockUser({
        id: userId,
        name: 'New Name',
        image: 'https://example.com/new-avatar.jpg',
      })
      mockPrisma.user.update.mockResolvedValueOnce(updatedUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateProfile({ 
        name: 'New Name',
        image: 'https://example.com/new-avatar.jpg' 
      })
      
      expect(result).toEqual(updatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: 'New Name',
          image: 'https://example.com/new-avatar.jpg',
        },
      })
    })

    it('should reject empty name', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.updateProfile({ name: '' })).rejects.toThrow()
    })

    it('should reject invalid image URL', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.updateProfile({ 
        image: 'not-a-url' 
      })).rejects.toThrow()
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should return success for notification preferences update', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateNotificationPreferences({
        emailNotifications: false,
        weeklyDigest: true,
        accountNotifications: true,
        usageLimitWarnings: false,
      })
      
      expect(result).toEqual({ success: true })
    })

    it('should handle partial updates', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateNotificationPreferences({
        emailNotifications: false,
      })
      
      expect(result).toEqual({ success: true })
    })

    it('should handle empty updates', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.updateNotificationPreferences({})
      
      expect(result).toEqual({ success: true })
    })
  })

  describe('getNotificationPreferences', () => {
    it('should return default notification preferences', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.getNotificationPreferences()
      
      expect(result).toEqual({
        emailNotifications: true,
        weeklyDigest: false,
        accountNotifications: true,
        usageLimitWarnings: true,
      })
    })
  })

  describe('exportUserData', () => {
    it('should export complete user data with summaries and shared links', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummaries = [
        createMockSummary({ 
          id: 'summary_1', 
          userId, 
          videoTitle: 'Video 1',
        }),
        createMockSummary({ 
          id: 'summary_2', 
          userId, 
          videoTitle: 'Video 2',
        }),
      ]
      
      const mockSharedLinks = [
        {
          slug: 'shared_1',
          isPublic: true,
          views: 10,
          createdAt: new Date('2024-01-01'),
        },
        {
          slug: 'shared_2',
          isPublic: false,
          views: 5,
          createdAt: new Date('2024-01-02'),
        },
      ]
      
      const userWithData = createMockUser({
        id: userId,
        name: 'Export User',
        email: 'export@example.com',
        plan: 'PRO',
        summariesUsed: 2,
      })
      
      const userWithRelations = {
        ...userWithData,
        summaries: mockSummaries.map(s => ({
          id: s.id,
          videoTitle: s.videoTitle,
          channelName: s.channelName,
          content: s.content,
          createdAt: s.createdAt,
          videoUrl: s.videoUrl,
        })),
        sharedLinks: mockSharedLinks,
      }
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithData)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithRelations as any)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.exportUserData()
      
      expect(result).toEqual({
        profile: {
          name: 'Export User',
          email: 'export@example.com',
          plan: 'PRO',
          createdAt: userWithData.createdAt,
        },
        summaries: userWithRelations.summaries,
        sharedLinks: mockSharedLinks,
        stats: {
          totalSummaries: 2,
          totalSharedLinks: 2,
          summariesUsed: 2,
        },
      })
      
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          summaries: {
            select: {
              id: true,
              videoTitle: true,
              channelName: true,
              content: true,
              createdAt: true,
              videoUrl: true,
            }
          },
          sharedLinks: {
            select: {
              slug: true,
              isPublic: true,
              views: true,
              createdAt: true,
            }
          }
        }
      })
    })

    it('should handle user with no summaries or shared links', async () => {
      const userId = 'user_empty'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const userWithoutData = createMockUser({
        id: userId,
        summariesUsed: 0,
      })
      
      const userWithEmptyRelations = {
        ...userWithoutData,
        summaries: [],
        sharedLinks: [],
      }
      
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithoutData)
      // Mock for procedure itself
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithEmptyRelations as any)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.exportUserData()
      
      expect(result.stats).toEqual({
        totalSummaries: 0,
        totalSharedLinks: 0,
        summariesUsed: 0,
      })
    })

    it('should throw error when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.exportUserData()).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })
  })

  describe('deleteAccount', () => {
    it('should delete account with correct confirmation', async () => {
      const userId = 'user_to_delete'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockUser = createMockUser({
        id: userId,
        stripeCustomerId: null,
      })
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      // Mock for procedure itself (select only stripeCustomerId)
      mockPrisma.user.findUnique.mockResolvedValueOnce({ stripeCustomerId: null })
      mockPrisma.user.delete.mockResolvedValueOnce(mockUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.deleteAccount({
        confirmationText: 'DELETE',
      })
      
      expect(result).toEqual({ success: true })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { stripeCustomerId: true }
      })
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      })
    })

    it('should handle user with Stripe customer ID', async () => {
      const userId = 'user_with_stripe'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockUser = createMockUser({
        id: userId,
        stripeCustomerId: 'cus_123',
      })
      // Mock for middleware
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      // Mock for procedure itself (select only stripeCustomerId)
      mockPrisma.user.findUnique.mockResolvedValueOnce({ stripeCustomerId: 'cus_123' })
      mockPrisma.user.delete.mockResolvedValueOnce(mockUser)
      
      const caller = authRouter.createCaller(mockContext)
      const result = await caller.deleteAccount({
        confirmationText: 'DELETE',
      })
      
      expect(result).toEqual({ success: true })
    })

    it('should reject incorrect confirmation text', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.deleteAccount({
        confirmationText: 'delete',
      })).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid confirmation text. Please type "DELETE" to confirm.',
        })
      )
    })

    it('should reject empty confirmation text', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.deleteAccount({
        confirmationText: '',
      })).rejects.toThrow()
    })

    it('should throw error when user not found', async () => {
      const userId = 'user_not_found'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      
      const caller = authRouter.createCaller(mockContext)
      
      await expect(caller.deleteAccount({
        confirmationText: 'DELETE',
      })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })
  })
})