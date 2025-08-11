import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { TRPCError } from '@trpc/server'
import { createHealthHandler, createAnonymousHandler } from '../summaryHandlers'
import type { SummaryRouterDependencies, SummaryContext } from '../summaryTypes'
import type { CreateAnonymousInput } from '../summaryValidation'

// Mock dependencies
const createMockDeps = (): SummaryRouterDependencies => ({
  db: {
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
  } as any,
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  monitoring: {
    logBusinessMetric: vi.fn(),
    logError: vi.fn(),
  },
  security: {
    sanitizeUrl: vi.fn((url: string) => url),
    sanitizeText: vi.fn((text: string) => text),
    containsSuspiciousContent: vi.fn(() => false),
    isValidYouTubeVideoId: vi.fn(() => true),
  },
  config: {
    backendUrl: 'http://test-backend:8000',
    anonymousUserId: 'TEST_ANONYMOUS_USER',
  },
})

const createMockContext = (): SummaryContext => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
  } as any,
})

describe('summaryHandlers', () => {
  let mockDeps: SummaryRouterDependencies
  let mockCtx: SummaryContext

  beforeEach(() => {
    mockDeps = createMockDeps()
    mockCtx = createMockContext()
    vi.clearAllMocks()
    
    // Mock fetch globally
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }) as any
    )
  })

  describe('createHealthHandler', () => {
    it('should return health status', () => {
      const handler = createHealthHandler()
      const result = handler()
      
      expect(result).toEqual({
        ok: true,
        layer: 'trpc'
      })
    })
  })

  describe('createAnonymousHandler', () => {
    const validInput: CreateAnonymousInput = {
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      browserFingerprint: 'test-fingerprint-123'
    }

    it('should create anonymous summary successfully', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      // Mock no existing summaries
      ;(mockDeps.db.summary.findFirst as MockedFunction<any>)
        .mockResolvedValueOnce(null) // No existing anonymous summary
        .mockResolvedValueOnce(null) // No existing video summary
      
      // Mock user upsert
      ;(mockDeps.db.user.upsert as MockedFunction<any>)
        .mockResolvedValue({ id: 'TEST_ANONYMOUS_USER' })
      
      // Mock summary creation
      const mockSummary = {
        id: 'summary-123',
        userId: 'TEST_ANONYMOUS_USER',
        url: validInput.url,
        videoId: 'dQw4w9WgXcQ',
        title: 'Video dQw4w9WgXcQ',
        content: '',
        status: 'PENDING',
        browserFingerprint: validInput.browserFingerprint,
        taskId: 'task_123_abc',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(mockDeps.db.summary.create as MockedFunction<any>)
        .mockResolvedValue(mockSummary)
      
      const result = await handler(mockCtx, validInput)
      
      expect(result).toMatchObject({
        ...mockSummary,
        isAnonymous: true,
        canSave: false,
        task_id: expect.stringMatching(/^task_\d+_[a-z0-9]+$/),
      })
      
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'Creating anonymous summary',
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          fingerprint: 'test-fin'
        })
      )
      
      expect(mockDeps.monitoring?.logBusinessMetric).toHaveBeenCalledWith(
        'summary_created',
        1,
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          userType: 'anonymous'
        })
      )
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-backend:8000/summarize',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('dQw4w9WgXcQ')
        })
      )
    })

    it('should return existing summary if duplicate video found', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      const existingSummary = {
        id: 'existing-summary',
        userId: 'TEST_ANONYMOUS_USER',
        url: validInput.url,
        videoId: 'dQw4w9WgXcQ',
        title: 'Existing Video',
        content: 'Existing content',
        status: 'COMPLETED',
        browserFingerprint: 'different-fingerprint',
        taskId: 'existing-task',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // Mock no existing anonymous summary for this fingerprint
      ;(mockDeps.db.summary.findFirst as MockedFunction<any>)
        .mockResolvedValueOnce(null) // No existing anonymous summary
        .mockResolvedValueOnce(existingSummary) // Existing video summary
      
      const result = await handler(mockCtx, validInput)
      
      expect(result).toMatchObject({
        ...existingSummary,
        isAnonymous: true,
        canSave: false,
        task_id: 'existing-task',
      })
      
      expect(mockDeps.monitoring?.logBusinessMetric).toHaveBeenCalledWith(
        'summary_duplicate_request',
        1,
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          userType: 'anonymous'
        })
      )
      
      // Should not create new summary
      expect(mockDeps.db.summary.create).not.toHaveBeenCalled()
    })

    it('should throw FORBIDDEN if anonymous user already has a summary', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      const existingAnonymousSummary = {
        id: 'existing-anonymous',
        userId: 'TEST_ANONYMOUS_USER',
        browserFingerprint: validInput.browserFingerprint,
      }
      
      // Mock existing anonymous summary for this fingerprint
      ;(mockDeps.db.summary.findFirst as MockedFunction<any>)
        .mockResolvedValueOnce(existingAnonymousSummary)
      
      await expect(handler(mockCtx, validInput)).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'Anonymous users can only create one summary. Please sign up to create more.',
        })
      )
      
      expect(mockDeps.db.summary.create).not.toHaveBeenCalled()
    })

    it('should throw BAD_REQUEST for suspicious content', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      // Mock suspicious content detection
      ;(mockDeps.security.containsSuspiciousContent as MockedFunction<any>)
        .mockReturnValue(true)
      
      await expect(handler(mockCtx, validInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input detected',
        })
      )
    })

    it('should throw BAD_REQUEST for invalid YouTube video ID', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      // Mock invalid video ID
      ;(mockDeps.security.isValidYouTubeVideoId as MockedFunction<any>)
        .mockReturnValue(false)
      
      await expect(handler(mockCtx, validInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid YouTube video URL',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      // Mock database error
      const dbError = new Error('Database connection failed')
      ;(mockDeps.db.summary.findFirst as MockedFunction<any>)
        .mockRejectedValue(dbError)
      
      await expect(handler(mockCtx, validInput)).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create summary',
        })
      )
      
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'Error in createAnonymous',
        expect.objectContaining({
          error: dbError,
          input: validInput
        })
      )
      
      expect(mockDeps.monitoring?.logError).toHaveBeenCalledWith({
        error: dbError,
        context: {
          input: validInput,
          userId: 'TEST_ANONYMOUS_USER'
        }
      })
    })

    it('should handle backend processing failures gracefully', async () => {
      const handler = createAnonymousHandler(mockDeps)
      
      // Mock successful DB operations
      ;(mockDeps.db.summary.findFirst as MockedFunction<any>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      ;(mockDeps.db.user.upsert as MockedFunction<any>)
        .mockResolvedValue({ id: 'TEST_ANONYMOUS_USER' })
      ;(mockDeps.db.summary.create as MockedFunction<any>)
        .mockResolvedValue({
          id: 'summary-123',
          taskId: 'task-123',
          videoId: 'dQw4w9WgXcQ'
        })
      
      // Mock fetch failure
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        }) as any
      )
      
      const result = await handler(mockCtx, validInput)
      
      // Should still return the summary even if backend fails
      expect(result).toBeDefined()
      expect(result.id).toBe('summary-123')
      
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'Backend processing failed',
        expect.objectContaining({ status: 500 })
      )
    })
  })
})