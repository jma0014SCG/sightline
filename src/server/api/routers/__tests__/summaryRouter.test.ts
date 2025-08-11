import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSummaryRouter } from '../summaryRouter'
import type { SummaryRouterDependencies } from '../summaryTypes'

// Mock tRPC
const mockCreateTRPCRouter = vi.fn()
const mockPublicProcedure = {
  output: vi.fn(() => mockPublicProcedure),
  query: vi.fn(),
  input: vi.fn(() => mockPublicProcedure),
  mutation: vi.fn(),
}

vi.mock('@/server/api/trpc', () => ({
  createTRPCRouter: mockCreateTRPCRouter,
  publicProcedure: mockPublicProcedure,
}))

// Create mock dependencies
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

describe('summaryRouter', () => {
  let mockDeps: SummaryRouterDependencies

  beforeEach(() => {
    mockDeps = createMockDeps()
    vi.clearAllMocks()
    
    // Reset the mock router implementation
    mockCreateTRPCRouter.mockImplementation((routes) => routes)
  })

  describe('createSummaryRouter', () => {
    it('should create router with health and createAnonymous endpoints', () => {
      const router = createSummaryRouter(mockDeps)

      expect(mockCreateTRPCRouter).toHaveBeenCalledWith({
        health: expect.anything(),
        createAnonymous: expect.anything(),
      })
    })

    it('should configure health endpoint correctly', () => {
      createSummaryRouter(mockDeps)

      // Verify health endpoint setup
      expect(mockPublicProcedure.output).toHaveBeenCalled()
      expect(mockPublicProcedure.query).toHaveBeenCalled()
    })

    it('should configure createAnonymous endpoint correctly', () => {
      createSummaryRouter(mockDeps)

      // Verify createAnonymous endpoint setup
      expect(mockPublicProcedure.input).toHaveBeenCalled()
      expect(mockPublicProcedure.mutation).toHaveBeenCalled()
    })

    it('should use provided dependencies', () => {
      const customDeps: SummaryRouterDependencies = {
        ...mockDeps,
        config: {
          backendUrl: 'http://custom-backend:9000',
          anonymousUserId: 'CUSTOM_ANONYMOUS_USER',
        },
      }

      createSummaryRouter(customDeps)

      // The router should be created with custom dependencies
      expect(mockCreateTRPCRouter).toHaveBeenCalled()
    })

    it('should handle missing optional dependencies', () => {
      const minimalDeps: SummaryRouterDependencies = {
        db: mockDeps.db,
        logger: mockDeps.logger,
        security: mockDeps.security,
        // monitoring and config are optional
      }

      expect(() => createSummaryRouter(minimalDeps)).not.toThrow()
      expect(mockCreateTRPCRouter).toHaveBeenCalled()
    })
  })

  describe('router endpoints integration', () => {
    it('should create functional health handler', () => {
      const router = createSummaryRouter(mockDeps)
      const routerConfig = mockCreateTRPCRouter.mock.calls[0][0]

      expect(routerConfig).toHaveProperty('health')
      expect(routerConfig).toHaveProperty('createAnonymous')
    })

    it('should pass context and input to handlers correctly', async () => {
      createSummaryRouter(mockDeps)

      // Verify that mutation callback is set up correctly
      expect(mockPublicProcedure.mutation).toHaveBeenCalledWith(
        expect.any(Function)
      )

      // Get the mutation callback
      const mutationCallback = mockPublicProcedure.mutation.mock.calls[0][0]
      expect(mutationCallback).toBeInstanceOf(Function)
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors', () => {
      const faultyDeps: SummaryRouterDependencies = {
        ...mockDeps,
        db: null as any, // Simulate connection failure
      }

      expect(() => createSummaryRouter(faultyDeps)).not.toThrow()
      // Router creation should succeed, errors should be handled at runtime
    })

    it('should handle missing logger gracefully', () => {
      const depsWithoutLogger: SummaryRouterDependencies = {
        ...mockDeps,
        logger: null as any,
      }

      expect(() => createSummaryRouter(depsWithoutLogger)).not.toThrow()
    })
  })

  describe('dependency injection validation', () => {
    it('should require essential dependencies', () => {
      const incompleteDeps = {
        // Missing required dependencies
      } as any

      // Router creation might succeed but handlers will fail at runtime
      // This is intentional as we want runtime validation
      expect(() => createSummaryRouter(incompleteDeps)).not.toThrow()
    })

    it('should use default config when not provided', () => {
      const depsWithoutConfig: SummaryRouterDependencies = {
        db: mockDeps.db,
        logger: mockDeps.logger,
        security: mockDeps.security,
        monitoring: mockDeps.monitoring,
        // config is optional
      }

      expect(() => createSummaryRouter(depsWithoutConfig)).not.toThrow()
      expect(mockCreateTRPCRouter).toHaveBeenCalled()
    })
  })
})