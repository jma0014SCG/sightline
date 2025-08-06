import { type PrismaClient } from '@prisma/client'
import { type DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'

// Create a deep mock of Prisma Client
export const createMockPrisma = (): DeepMockProxy<PrismaClient> => {
  return mockDeep<PrismaClient>()
}

// Reset all mocks
export const resetMockPrisma = (mockPrisma: DeepMockProxy<PrismaClient>) => {
  mockReset(mockPrisma)
}

// Common database mock patterns
export const setupCommonMocks = (mockPrisma: DeepMockProxy<PrismaClient>) => {
  // Default behavior for common queries
  mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }])
  
  // Transaction mock
  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      return fn(mockPrisma)
    }
    return Promise.all(fn)
  })
}

// Helper to mock a successful database operation
export const mockDbSuccess = <T>(
  operation: jest.Mock,
  returnValue: T
): jest.Mock => {
  return operation.mockResolvedValueOnce(returnValue)
}

// Helper to mock a database error
export const mockDbError = (
  operation: jest.Mock,
  error: Error | string
): jest.Mock => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  return operation.mockRejectedValueOnce(errorObj)
}

// Mock Prisma count operations
export const mockCount = (
  operation: jest.Mock,
  count: number
): jest.Mock => {
  return operation.mockResolvedValueOnce(count)
}

// Mock Prisma findMany with pagination
export const mockFindManyWithPagination = <T>(
  operation: jest.Mock,
  items: T[],
  total?: number
): jest.Mock => {
  // If the operation supports count, mock it
  if (operation.mockResolvedValueOnce) {
    operation.mockResolvedValueOnce(items)
    if (total !== undefined) {
      // Some Prisma operations return { items, count } format
      operation.mockResolvedValueOnce({ items, count: total })
    }
  }
  return operation
}

// Mock Prisma aggregate operations
export const mockAggregate = (
  operation: jest.Mock,
  result: any
): jest.Mock => {
  return operation.mockResolvedValueOnce({
    _count: result._count || 0,
    _sum: result._sum || null,
    _avg: result._avg || null,
    _min: result._min || null,
    _max: result._max || null,
    ...result,
  })
}