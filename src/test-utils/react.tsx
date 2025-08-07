import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/providers/ToastProvider'

// Mock tRPC provider for component testing
const MockTRPCProvider = ({ children }: { children: ReactNode }) => {
  return <div data-testid="mock-trpc-provider">{children}</div>
}

// Mock the tRPC API for component testing
jest.mock('@/lib/api/trpc', () => ({
  api: {
    useUtils: () => ({
      summary: {
        getById: { invalidate: jest.fn() },
      },
      library: {
        getAll: { invalidate: jest.fn() },
      },
    }),
  },
}))

// Create a test wrapper with all necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  user?: any
  clerkProps?: any
}

export function createTestWrapper(options: CustomRenderOptions = {}) {
  const { queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }), user = null, clerkProps = {} } = options

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <ClerkProvider
        publishableKey="test-key"
        {...clerkProps}
      >
        <QueryClientProvider client={queryClient}>
          <MockTRPCProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </MockTRPCProvider>
        </QueryClientProvider>
      </ClerkProvider>
    )
  }

  return Wrapper
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const Wrapper = createTestWrapper(options)
  
  return render(ui, {
    wrapper: Wrapper,
    ...options
  })
}

// Mock authenticated user
export const createMockAuthUser = (overrides?: any) => ({
  id: 'user_test123',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [
    {
      emailAddress: 'test@example.com',
      id: 'email_123'
    }
  ],
  imageUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

// Mock tRPC utils for component testing
export const createMockTRPCUtils = () => ({
  summary: {
    create: {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    },
    getById: {
      refetch: jest.fn(),
      invalidate: jest.fn(),
    },
  },
  library: {
    getAll: {
      refetch: jest.fn(),
      invalidate: jest.fn(),
    },
  },
  share: {
    create: {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    },
  },
  billing: {
    createCheckoutSession: {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    },
  },
  auth: {
    getProfile: {
      refetch: jest.fn(),
      invalidate: jest.fn(),
    },
  },
  useContext: () => ({
    summary: {
      getById: {
        invalidate: jest.fn(),
      },
    },
    library: {
      getAll: {
        invalidate: jest.fn(),
      },
    },
  }),
})

// Mock tRPC hooks
export const createMockTRPCHooks = (data?: any, loading = false, error = null) => ({
  useQuery: () => ({
    data,
    isLoading: loading,
    error,
    refetch: jest.fn(),
  }),
  useMutation: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: loading,
    error,
    reset: jest.fn(),
  }),
})

// Mock progress tracking hook
export const createMockProgressTracking = (
  progress = 0,
  stage = 'Starting...',
  status = 'processing' as 'processing' | 'completed' | 'error'
) => ({
  progress,
  stage,
  status,
  isTracking: status === 'processing',
})

// Mock browser fingerprint
export const MOCK_BROWSER_FINGERPRINT = 'test-fingerprint-component-123'

// Utility to wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock intersection observer for component testing
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  })
  window.IntersectionObserver = mockIntersectionObserver
}

// Mock URL for component tests
export const createMockURL = (url = 'https://youtube.com/watch?v=test123') => {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true
  })
}

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'