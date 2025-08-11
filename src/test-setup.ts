import { vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'

// Global fetch mock
global.fetch = vi.fn()

// Mock server-only import
vi.mock('server-only', () => ({}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock monitoring
vi.mock('@/lib/monitoring', () => ({
  monitoring: {
    logBusinessMetric: vi.fn(),
    logError: vi.fn(),
  },
}))

// Mock security
vi.mock('@/lib/security', () => ({
  sanitizeUrl: vi.fn((url: string) => url),
  sanitizeText: vi.fn((text: string) => text),
  containsSuspiciousContent: vi.fn(() => false),
  isValidYouTubeVideoId: vi.fn(() => true),
}))