import { type inferProcedureInput } from '@trpc/server'
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { type AppRouter } from '@/server/api/root'
import { type prisma } from '@/lib/db/prisma'
import { headers } from 'next/headers'

// Type for mock context
export type MockContext = {
  prisma: typeof prisma
  userId: string | null
  headers: ReturnType<typeof headers>
}

// Create a mock tRPC context for testing
export const createMockContext = (overrides?: Partial<MockContext>): MockContext => {
  const mockHeadersData = new Map([
    ['x-forwarded-for', '127.0.0.1'],
    ['user-agent', 'test-agent'],
  ])

  const mockHeaders = {
    get: (name: string) => mockHeadersData.get(name),
    has: (name: string) => mockHeadersData.has(name),
    set: (name: string, value: string) => mockHeadersData.set(name, value),
    delete: (name: string) => mockHeadersData.delete(name),
    forEach: (callback: (value: string, name: string) => void) => mockHeadersData.forEach(callback),
  }

  return {
    prisma: {} as typeof prisma, // Will be mocked in tests
    userId: null,
    headers: Promise.resolve(mockHeaders) as any,
    ...overrides,
  }
}

// Initialize tRPC for testing
const t = initTRPC.context<MockContext>().create({
  transformer: superjson,
})

// Create test router
export const createTestRouter = t.router
export const testProcedure = t.procedure

// Helper to create authenticated context
export const createAuthenticatedContext = (
  userId: string,
  overrides?: Partial<MockContext>
): MockContext => {
  return createMockContext({
    userId,
    ...overrides,
  })
}

// Helper to create caller for testing
export const createCaller = async (router: AppRouter, ctx: MockContext) => {
  return router.createCaller(ctx)
}

// Type helpers for input inference
export type RouterInput<
  TRouter extends Record<string, any>,
  TPath extends string
> = any // Simplified for test utilities

// Helper to create mock response for fetch
export const createMockFetchResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response)
}

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))