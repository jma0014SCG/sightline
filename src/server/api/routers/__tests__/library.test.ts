// Mock Smart Collections functions before importing
jest.mock('@/lib/classificationService', () => ({
  getTagsForUser: jest.fn(),
  getCategoriesForUser: jest.fn(),
}))

import { libraryRouter } from '../library'
import { 
  createAuthenticatedContext,
} from '@/test-utils/trpc'
import { 
  createMockUser,
  createMockSummary,
  createMockTag,
  createMockCategory,
} from '@/test-utils/mocks'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { type PrismaClient } from '@prisma/client'
import { getTagsForUser, getCategoriesForUser } from '@/lib/classificationService'

// Get the mocked classification functions
const mockGetTagsForUser = getTagsForUser as jest.MockedFunction<typeof getTagsForUser>
const mockGetCategoriesForUser = getCategoriesForUser as jest.MockedFunction<typeof getCategoriesForUser>

// Create mock Prisma client
const mockPrisma = mockDeep<PrismaClient>()

describe('libraryRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReset(mockPrisma)
  })

  describe('getAll', () => {
    it('should return paginated summaries with default parameters', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockSummaries = [
        createMockSummary({ id: 'summary_1', userId, videoTitle: 'Video 1' }),
        createMockSummary({ id: 'summary_2', userId, videoTitle: 'Video 2' }),
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce(mockSummaries)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getAll({})
      
      expect(result).toEqual({
        items: mockSummaries,
        nextCursor: undefined,
      })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 21, // limit + 1 for pagination
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle search queries', async () => {
      const userId = 'user_search'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const searchResults = [
        createMockSummary({ 
          id: 'search_1', 
          userId, 
          videoTitle: 'React Tutorial',
          channelName: 'Tech Channel',
        }),
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce(searchResults)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getAll({ search: 'React' })
      
      expect(result.items).toEqual(searchResults)
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { videoTitle: { contains: 'React', mode: 'insensitive' } },
            { channelName: { contains: 'React', mode: 'insensitive' } },
            { content: { contains: 'React', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle sorting options', async () => {
      const userId = 'user_sort'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      await caller.getAll({ 
        sortBy: 'title',
        sortOrder: 'asc',
        limit: 10,
      })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { videoTitle: 'asc' },
        take: 11, // limit + 1
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle date range filters', async () => {
      const userId = 'user_date'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      await caller.getAll({ dateRange: 'week' })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: {
            gte: expect.any(Date),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle duration range filters', async () => {
      const userId = 'user_duration'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      await caller.getAll({ durationRange: 'short' })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          duration: {
            lte: 300, // <= 5 minutes
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle pagination with cursor', async () => {
      const userId = 'user_paginate'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      await caller.getAll({ cursor: 'cursor_123', limit: 5 })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6, // limit + 1
        cursor: { id: 'cursor_123' },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should handle Smart Collections filtering', async () => {
      const userId = 'user_collections'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      await caller.getAll({ 
        categories: ['Technology', 'Programming'],
        tags: ['React', 'JavaScript'],
      })
      
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          categories: {
            some: {
              name: {
                in: ['Technology', 'Programming'],
              },
            },
          },
          tags: {
            some: {
              name: {
                in: ['React', 'JavaScript'],
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            }
          },
        },
      })
    })

    it('should return nextCursor when more results available', async () => {
      const userId = 'user_more_results'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Create 21 summaries (limit + 1)
      const mockSummaries = Array.from({ length: 21 }, (_, i) => 
        createMockSummary({ id: `summary_${i}`, userId })
      )
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock for procedure itself
      mockPrisma.summary.findMany.mockResolvedValueOnce(mockSummaries)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getAll({ limit: 20 })
      
      expect(result.items).toHaveLength(20) // Should exclude the extra item
      expect(result.nextCursor).toBe('summary_20') // Last item's ID (the extra one that gets removed)
    })

    it('should validate limit bounds', async () => {
      const userId = 'user_123'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const caller = libraryRouter.createCaller(mockContext)
      
      // Test minimum limit
      await expect(caller.getAll({ limit: 0 })).rejects.toThrow()
      
      // Test maximum limit
      await expect(caller.getAll({ limit: 101 })).rejects.toThrow()
    })
  })

  describe('getStats', () => {
    it('should return library statistics', async () => {
      const userId = 'user_stats'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const recentSummaries = [
        createMockSummary({ 
          id: 'recent_1', 
          videoTitle: 'Recent Video 1', 
          channelName: 'Channel 1',
          createdAt: new Date('2024-01-01'),
        }),
        createMockSummary({ 
          id: 'recent_2', 
          videoTitle: 'Recent Video 2', 
          channelName: 'Channel 2',
          createdAt: new Date('2024-01-02'),
        }),
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the Promise.all call
      mockPrisma.summary.count.mockResolvedValueOnce(10)
      mockPrisma.summary.aggregate.mockResolvedValueOnce({ 
        _count: { _all: 0, id: 0, createdAt: 0, updatedAt: 0, userId: 0, videoId: 0, videoUrl: 0, videoTitle: 0, channelName: 0, channelId: 0, duration: 0, content: 0, thumbnailUrl: 0, keyPoints: 0, metadata: 0 },
        _avg: { duration: null },
        _sum: { duration: 3600 },
        _min: { id: null, createdAt: null, updatedAt: null, userId: null, videoId: null, videoUrl: null, videoTitle: null, channelName: null, channelId: null, duration: null, content: null, thumbnailUrl: null, keyPoints: null, metadata: null },
        _max: { id: null, createdAt: null, updatedAt: null, userId: null, videoId: null, videoUrl: null, videoTitle: null, channelName: null, channelId: null, duration: null, content: null, thumbnailUrl: null, keyPoints: null, metadata: null }
      } as any)
      mockPrisma.summary.findMany.mockResolvedValueOnce(recentSummaries)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getStats()
      
      expect(result).toEqual({
        totalSummaries: 10,
        totalDuration: 3600,
        recentSummaries,
      })
      
      expect(mockPrisma.summary.count).toHaveBeenCalledWith({ where: { userId } })
      expect(mockPrisma.summary.aggregate).toHaveBeenCalledWith({
        where: { userId },
        _sum: { duration: true },
      })
      expect(mockPrisma.summary.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          videoTitle: true,
          channelName: true,
          createdAt: true,
        },
      })
    })

    it('should handle null duration sum', async () => {
      const userId = 'user_no_duration'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the Promise.all call with null duration
      mockPrisma.summary.count.mockResolvedValueOnce(0)
      mockPrisma.summary.aggregate.mockResolvedValueOnce({ 
        _count: { _all: 0, id: 0, createdAt: 0, updatedAt: 0, userId: 0, videoId: 0, videoUrl: 0, videoTitle: 0, channelName: 0, channelId: 0, duration: 0, content: 0, thumbnailUrl: 0, keyPoints: 0, metadata: 0 },
        _avg: { duration: null },
        _sum: { duration: null },
        _min: { id: null, createdAt: null, updatedAt: null, userId: null, videoId: null, videoUrl: null, videoTitle: null, channelName: null, channelId: null, duration: null, content: null, thumbnailUrl: null, keyPoints: null, metadata: null },
        _max: { id: null, createdAt: null, updatedAt: null, userId: null, videoId: null, videoUrl: null, videoTitle: null, channelName: null, channelId: null, duration: null, content: null, thumbnailUrl: null, keyPoints: null, metadata: null }
      } as any)
      mockPrisma.summary.findMany.mockResolvedValueOnce([])
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getStats()
      
      expect(result.totalDuration).toBe(0)
    })
  })

  describe('getTags', () => {
    it('should return user tags from Smart Collections', async () => {
      const userId = 'user_tags'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockTags = [
        { id: 'tag_1', name: 'React', type: 'TECHNOLOGY', count: 5, _count: { summaries: 5 }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag_2', name: 'JavaScript', type: 'TECHNOLOGY', count: 3, _count: { summaries: 3 }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag_3', name: 'John Doe', type: 'PERSON', count: 2, _count: { summaries: 2 }, createdAt: new Date(), updatedAt: new Date() },
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the classification service
      mockGetTagsForUser.mockResolvedValueOnce(mockTags)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getTags()
      
      expect(result).toEqual(mockTags)
      expect(mockGetTagsForUser).toHaveBeenCalledWith(userId)
    })

    it('should handle errors gracefully', async () => {
      const userId = 'user_tags_error'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the classification service to throw an error
      mockGetTagsForUser.mockRejectedValueOnce(new Error('Classification service error'))
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getTags()
      
      expect(result).toEqual([])
      expect(mockGetTagsForUser).toHaveBeenCalledWith(userId)
    })
  })

  describe('getCategories', () => {
    it('should return user categories from Smart Collections', async () => {
      const userId = 'user_categories'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      const mockCategories = [
        { id: 'cat_1', name: 'Technology', count: 8, _count: { summaries: 8 }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'cat_2', name: 'Programming', count: 5, _count: { summaries: 5 }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'cat_3', name: 'Business', count: 2, _count: { summaries: 2 }, createdAt: new Date(), updatedAt: new Date() },
      ]
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the classification service
      mockGetCategoriesForUser.mockResolvedValueOnce(mockCategories)
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getCategories()
      
      expect(result).toEqual(mockCategories)
      expect(mockGetCategoriesForUser).toHaveBeenCalledWith(userId)
    })

    it('should handle errors gracefully', async () => {
      const userId = 'user_categories_error'
      const mockContext = createAuthenticatedContext(userId, { prisma: mockPrisma })
      
      // Mock for middleware
      const mockUser = createMockUser({ id: userId })
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser)
      
      // Mock the classification service to throw an error
      mockGetCategoriesForUser.mockRejectedValueOnce(new Error('Classification service error'))
      
      const caller = libraryRouter.createCaller(mockContext)
      const result = await caller.getCategories()
      
      expect(result).toEqual([])
      expect(mockGetCategoriesForUser).toHaveBeenCalledWith(userId)
    })
  })
})