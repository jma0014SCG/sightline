import { setupServer } from 'msw/node'
import { allHandlers } from './msw-handlers'

// Setup MSW server for Node.js environment (Jest tests)
export const server = setupServer(...allHandlers)

// Configure server lifecycle for tests
export const setupMSW = () => {
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  
  // Reset handlers after each test to ensure test isolation
  afterEach(() => server.resetHandlers())
  
  // Clean up after all tests are done
  afterAll(() => server.close())
}

// Helper to add custom handlers during tests
export const addTestHandlers = (...handlers: Parameters<typeof server.use>) => {
  server.use(...handlers)
}

// Helper to override specific handlers during tests
export const overrideHandlers = (...handlers: Parameters<typeof server.use>) => {
  server.resetHandlers(...handlers)
}