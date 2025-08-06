// Mock nanoid before importing
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-123'),
}))

import { shareRouter } from '../share'
import { 
  createAuthenticatedContext,
  createMockContext,
} from '@/test-utils/trpc'
import { 
  createMockUser,
  createMockSummary,
  createMockShareLink,
} from '@/test-utils/mocks'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { type PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'

// Get the mocked nanoid function
const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

// Create mock Prisma client
const mockPrisma = mockDeep<PrismaClient>()

describe('shareRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReset(mockPrisma)
    
    // Reset environment variables
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    
    // Reset nanoid mock
    mockNanoid.mockReturnValue('mock-nanoid-123')
  })

  describe('create', () => {
    it('should create new share link for valid summary', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({ id: summaryId, userId })
      const mockShareLink = createMockShareLink({
        id: 'share_new',
        slug: 'mock-nanoid-123',
        summaryId,
        userId,
        views: 0,
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.summary.findFirst.mockResolvedValueOnce(mockSummary)
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null) // No existing link
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null) // Slug is unique
      mockPrisma.shareLink.create.mockResolvedValueOnce(mockShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.create({ summaryId })
      
      expect(result).toEqual({
        id: 'share_new',
        slug: 'mock-nanoid-123',
        url: 'http://localhost:3000/share/mock-nanoid-123',
        views: 0,
        expiresAt: null,
        isPublic: true,
        createdAt: mockShareLink.createdAt,
      })
      
      expect(mockPrisma.shareLink.create).toHaveBeenCalledWith({
        data: {
          slug: 'mock-nanoid-123',
          summaryId,
          userId,
          isPublic: true,
          expiresAt: undefined,
        },
      })
    })

    it('should return existing share link if one exists', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({ id: summaryId, userId })
      const existingShareLink = createMockShareLink({
        id: 'share_existing',
        slug: 'existing-slug',
        summaryId,
        userId,
        views: 5,
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.summary.findFirst.mockResolvedValueOnce(mockSummary)
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(existingShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.create({ summaryId })
      
      expect(result).toEqual({
        id: 'share_existing',
        slug: 'existing-slug',
        url: 'http://localhost:3000/share/existing-slug',
        views: 5,
        expiresAt: null,
        isPublic: true,
        createdAt: existingShareLink.createdAt,
      })
      
      // Should not create new link
      expect(mockPrisma.shareLink.create).not.toHaveBeenCalled()
    })

    it('should create share link with expiration date', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const expiresAt = new Date('2025-01-01')
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({ id: summaryId, userId })
      const mockShareLink = createMockShareLink({
        slug: 'mock-nanoid-123',
        summaryId,
        userId,
        expiresAt,
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.summary.findFirst.mockResolvedValueOnce(mockSummary)
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null)
      mockPrisma.shareLink.create.mockResolvedValueOnce(mockShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.create({ summaryId, expiresAt })
      
      expect(result.expiresAt).toEqual(expiresAt)
      expect(mockPrisma.shareLink.create).toHaveBeenCalledWith({
        data: {
          slug: 'mock-nanoid-123',
          summaryId,
          userId,
          isPublic: true,
          expiresAt,
        },
      })
    })

    it('should retry slug generation when collision occurs', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({ id: summaryId, userId })
      const mockShareLink = createMockShareLink({
        slug: 'mock-nanoid-456', // Second attempt
        summaryId,
        userId,
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock nanoid to return different values on subsequent calls
      mockNanoid
        .mockReturnValueOnce('collision-slug') // First attempt - collision
        .mockReturnValueOnce('mock-nanoid-456') // Second attempt - unique
      
      // Mock for procedure
      mockPrisma.summary.findFirst.mockResolvedValueOnce(mockSummary)
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      // First slug check - collision
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce({ id: 'existing' } as any)
      // Second slug check - unique
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null)
      mockPrisma.shareLink.create.mockResolvedValueOnce(mockShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.create({ summaryId })
      
      expect(result.slug).toBe('mock-nanoid-456')
      expect(mockNanoid).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max slug generation attempts', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummary = createMockSummary({ id: summaryId, userId })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.summary.findFirst.mockResolvedValueOnce(mockSummary)
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      // All slug checks return collisions
      mockPrisma.shareLink.findUnique.mockResolvedValue({ id: 'collision' } as any)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.create({ summaryId })).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique share link',
        })
      )
      
      expect(mockNanoid).toHaveBeenCalledTimes(10) // Max attempts
    })

    it('should throw error for non-existent summary', async () => {
      const userId = 'user_123'
      const summaryId = 'nonexistent_summary'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure - summary not found
      mockPrisma.summary.findFirst.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.create({ summaryId })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found or access denied',
        })
      )
    })

    it('should throw error when accessing other users summary', async () => {
      const userId = 'user_123'
      const otherUserId = 'other_user'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure - summary belongs to other user
      mockPrisma.summary.findFirst.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.create({ summaryId })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found or access denied',
        })
      )
    })
  })

  describe('get', () => {
    it('should return share link details for owner', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockShareLink = createMockShareLink({
        id: 'share_123',
        slug: 'test-slug',
        summaryId,
        userId,
        views: 10,
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(mockShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.get({ summaryId })
      
      expect(result).toEqual({
        id: 'share_123',
        slug: 'test-slug',
        url: 'http://localhost:3000/share/test-slug',
        views: 10,
        expiresAt: null,
        isPublic: true,
        createdAt: mockShareLink.createdAt,
      })
    })

    it('should return null when share link does not exist', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.get({ summaryId })
      
      expect(result).toBeNull()
    })
  })

  describe('getBySlug', () => {
    it('should return shared summary with incremented view count', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      const slug = 'test-slug'
      
      const mockShareLink = {
        id: 'share_123',
        slug,
        views: 5,
        expiresAt: null,
        isPublic: true,
        createdAt: new Date('2024-01-01'),
        summary: {
          id: 'summary_123',
          videoTitle: 'Test Video',
          channelName: 'Test Channel',
          content: 'Test content',
          keyPoints: ['Point 1', 'Point 2'],
          duration: 300,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { test: 'data' },
          createdAt: new Date('2024-01-01'),
          user: {
            name: 'Test Author',
            image: 'https://example.com/avatar.jpg',
          },
        },
      }
      
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(mockShareLink as any)
      mockPrisma.shareLink.update.mockResolvedValueOnce(mockShareLink as any)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.getBySlug({ slug })
      
      expect(result).toEqual({
        id: 'share_123',
        slug,
        views: 6, // Incremented
        createdAt: new Date('2024-01-01'),
        summary: {
          id: 'summary_123',
          videoTitle: 'Test Video',
          channelName: 'Test Channel',
          content: 'Test content',
          keyPoints: ['Point 1', 'Point 2'],
          duration: 300,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { test: 'data' },
          createdAt: new Date('2024-01-01'),
          author: {
            name: 'Test Author',
            image: 'https://example.com/avatar.jpg',
          },
        },
      })
      
      expect(mockPrisma.shareLink.update).toHaveBeenCalledWith({
        where: { id: 'share_123' },
        data: { views: { increment: 1 } },
      })
    })

    it('should throw error for non-existent slug', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      const slug = 'nonexistent-slug'
      
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.getBySlug({ slug })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      )
    })

    it('should throw error for expired share link', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      const slug = 'expired-slug'
      
      const expiredShareLink = {
        id: 'share_expired',
        slug,
        expiresAt: new Date('2023-01-01'), // Past date
        isPublic: true,
      }
      
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(expiredShareLink as any)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.getBySlug({ slug })).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Share link has expired',
        })
      )
    })

    it('should throw error for private share link', async () => {
      const mockContext = createMockContext({ prisma: mockPrisma })
      const slug = 'private-slug'
      
      const privateShareLink = {
        id: 'share_private',
        slug,
        expiresAt: null,
        isPublic: false,
      }
      
      mockPrisma.shareLink.findUnique.mockResolvedValueOnce(privateShareLink as any)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.getBySlug({ slug })).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'Share link is private',
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete share link successfully', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockShareLink = createMockShareLink({ summaryId, userId })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(mockShareLink)
      mockPrisma.shareLink.delete.mockResolvedValueOnce(mockShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.delete({ summaryId })
      
      expect(result).toEqual({ success: true })
      expect(mockPrisma.shareLink.delete).toHaveBeenCalledWith({
        where: { id: mockShareLink.id },
      })
    })

    it('should throw error when share link not found', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure - share link not found
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.delete({ summaryId })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      )
    })
  })

  describe('togglePublic', () => {
    it('should toggle share link to private', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockShareLink = createMockShareLink({ summaryId, userId, isPublic: true })
      const updatedShareLink = createMockShareLink({ 
        summaryId, 
        userId, 
        isPublic: false 
      })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(mockShareLink)
      mockPrisma.shareLink.update.mockResolvedValueOnce(updatedShareLink)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.togglePublic({ summaryId, isPublic: false })
      
      expect(result.isPublic).toBe(false)
      expect(mockPrisma.shareLink.update).toHaveBeenCalledWith({
        where: { id: mockShareLink.id },
        data: { isPublic: false },
      })
    })

    it('should throw error when share link not found', async () => {
      const userId = 'user_123'
      const summaryId = 'summary_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findFirst.mockResolvedValueOnce(null)
      
      const caller = shareRouter.createCaller(mockContext)
      
      await expect(caller.togglePublic({ 
        summaryId, 
        isPublic: true 
      })).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      )
    })
  })

  describe('getAll', () => {
    it('should return all share links for user', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockShareLinks = [
        {
          id: 'share_1',
          slug: 'slug-1',
          views: 5,
          expiresAt: null,
          isPublic: true,
          createdAt: new Date('2024-01-02'),
          summary: {
            id: 'summary_1',
            videoTitle: 'Video 1',
            channelName: 'Channel 1',
            createdAt: new Date('2024-01-01'),
          },
        },
        {
          id: 'share_2',
          slug: 'slug-2',
          views: 10,
          expiresAt: new Date('2025-01-01'),
          isPublic: false,
          createdAt: new Date('2024-01-01'),
          summary: {
            id: 'summary_2',
            videoTitle: 'Video 2',
            channelName: 'Channel 2',
            createdAt: new Date('2023-12-31'),
          },
        },
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findMany.mockResolvedValueOnce(mockShareLinks as any)
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.getAll()
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'share_1',
        slug: 'slug-1',
        url: 'http://localhost:3000/share/slug-1',
        views: 5,
        expiresAt: null,
        isPublic: true,
        createdAt: new Date('2024-01-02'),
        summary: mockShareLinks[0].summary,
      })
      
      expect(mockPrisma.shareLink.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          summary: {
            select: {
              id: true,
              videoTitle: true,
              channelName: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when user has no share links', async () => {
      const userId = 'user_no_links'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure
      mockPrisma.shareLink.findMany.mockResolvedValueOnce([])
      
      const caller = shareRouter.createCaller(mockContext)
      const result = await caller.getAll()
      
      expect(result).toEqual([])
    })
  })
})