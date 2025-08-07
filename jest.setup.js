// Optional: configure or set up a testing framework before each test.
import '@testing-library/jest-dom'

// Polyfill for Next.js Request/Response in Node.js environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body
    }
    
    async text() {
      return this.body || ''
    }
    
    async json() {
      return JSON.parse(this.body || '{}')
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    
    async text() {
      return this.body || ''
    }
    
    async json() {
      return JSON.parse(this.body || '{}')
    }
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => {
      const response = {
        status: init.status || 200,
        headers: new Map(Object.entries(init.headers || {})),
        body: JSON.stringify(body),
        async json() {
          return body
        },
        async text() {
          return JSON.stringify(body)
        }
      }
      
      // Add headers.get method
      response.headers.get = function(name) {
        for (const [key, value] of this.entries()) {
          if (key.toLowerCase() === name.toLowerCase()) {
            return value
          }
        }
        return null
      }
      
      return response
    }),
    redirect: jest.fn()
  }
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock fetch globally for Node.js tests
if (typeof fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  )
}

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.CLERK_SECRET_KEY = 'test-clerk-secret'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-publishable'
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }) => children,
  useUser: () => ({
    user: null,
    isLoaded: true,
    isSignedIn: false,
  }),
  useAuth: () => ({
    userId: null,
    isLoaded: true,
    isSignedIn: false,
    getToken: jest.fn(),
  }),
  SignIn: () => <div>Sign In</div>,
  SignUp: () => <div>Sign Up</div>,
  UserButton: () => <div>User Button</div>,
}))

// Mock superjson to avoid ES module import issues
jest.mock('superjson', () => ({
  default: {
    serialize: jest.fn((obj) => obj),
    deserialize: jest.fn((obj) => obj),
  },
  serialize: jest.fn((obj) => obj),
  deserialize: jest.fn((obj) => obj),
}))

// Mock tRPC - temporarily disabled to fix module resolution
// jest.mock('../src/lib/api/trpc', () => ({
//   api: {
//     useContext: jest.fn(),
//     summary: {
//       create: {
//         useMutation: jest.fn(() => ({
//           mutate: jest.fn(),
//           isLoading: false,
//           error: null,
//         })),
//       },
//       getById: {
//         useQuery: jest.fn(() => ({
//           data: null,
//           isLoading: false,
//           error: null,
//         })),
//       },
//     },
//     library: {
//       getAll: {
//         useQuery: jest.fn(() => ({
//           data: null,
//           isLoading: false,
//           error: null,
//         })),
//       },
//     },
//   },
// }))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Setup MSW for component testing - temporarily disabled
// import { setupMSW } from './src/test-utils/msw-server'
// setupMSW()

// Mock YouTube IFrame API for SummaryViewer tests
global.YT = {
  Player: jest.fn().mockImplementation(() => ({
    seekTo: jest.fn(),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    getDuration: jest.fn(() => 1200),
    getPlayerState: jest.fn(() => 1),
  })),
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  }
}

// Mock navigator.clipboard for copy functionality
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
      readText: jest.fn().mockResolvedValue('mock clipboard content')
    },
    writable: true,
    configurable: true
  })
}

// Mock URL constructor for component tests - fallback to native URL if it exists
if (!global.URL) {
  global.URL = class URL {
    constructor(url) {
      this.href = url
      try {
        const nativeURL = new globalThis.URL(url)
        this.pathname = nativeURL.pathname
        this.searchParams = nativeURL.searchParams
      } catch (e) {
        this.pathname = ''
        this.searchParams = new URLSearchParams()
      }
    }
  }
}

// Mock ResizeObserver for responsive components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Image constructor for thumbnail loading
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload()
    }, 100)
  }
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})