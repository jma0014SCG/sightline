import { http, HttpResponse } from 'msw'
import { 
  createMockUser, 
  createMockSummary, 
  createMockShareLink,
  createMockPythonAPIResponse 
} from './mocks'
import { createMockSummaryWithMetadata, createMockLibraryData } from './component-mocks'

// Base URL for tRPC endpoints
const TRPC_BASE_URL = 'http://localhost:3000/api/trpc'

export const tRPCHandlers = [
  // Summary endpoints
  http.get(`${TRPC_BASE_URL}/summary.getById`, ({ request }) => {
    const url = new URL(request.url)
    const input = JSON.parse(url.searchParams.get('input') || '{}')
    
    if (input.id === 'not-found') {
      return HttpResponse.json({
        result: { data: null }
      })
    }
    
    return HttpResponse.json({
      result: {
        data: createMockSummaryWithMetadata({ id: input.id })
      }
    })
  }),

  http.post(`${TRPC_BASE_URL}/summary.create`, async ({ request }) => {
    const body = await request.json() as any
    const input = body.json || body
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (input.url?.includes('error')) {
      return HttpResponse.json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid YouTube URL'
        }
      }, { status: 400 })
    }
    
    return HttpResponse.json({
      result: {
        data: {
          ...createMockPythonAPIResponse(),
          task_id: 'task_123',
          summary: createMockSummaryWithMetadata().content
        }
      }
    })
  }),

  http.post(`${TRPC_BASE_URL}/summary.createAnonymous`, async ({ request }) => {
    const body = await request.json() as any
    const input = body.json || body
    
    if (input.fingerprint === 'used-fingerprint') {
      return HttpResponse.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Anonymous user has already created a summary'
        }
      }, { status: 403 })
    }
    
    return HttpResponse.json({
      result: {
        data: {
          ...createMockPythonAPIResponse(),
          task_id: 'anon_task_123'
        }
      }
    })
  }),

  // Library endpoints
  http.get(`${TRPC_BASE_URL}/library.getAll`, ({ request }) => {
    const url = new URL(request.url)
    const input = JSON.parse(url.searchParams.get('input') || '{}')
    
    const mockData = createMockLibraryData()
    let filteredSummaries = mockData.summaries
    
    // Apply filters
    if (input.categoryIds?.length) {
      filteredSummaries = filteredSummaries.filter(summary => 
        summary.categories?.some(cat => input.categoryIds.includes(cat.id))
      )
    }
    
    if (input.tagIds?.length) {
      filteredSummaries = filteredSummaries.filter(summary =>
        summary.tags?.some(tag => input.tagIds.includes(tag.id))
      )
    }
    
    if (input.search) {
      filteredSummaries = filteredSummaries.filter(summary =>
        summary.videoTitle.toLowerCase().includes(input.search.toLowerCase())
      )
    }
    
    return HttpResponse.json({
      result: {
        data: {
          summaries: filteredSummaries,
          totalCount: filteredSummaries.length,
          hasMore: false
        }
      }
    })
  }),

  http.get(`${TRPC_BASE_URL}/library.getTagsAndCategories`, () => {
    const mockData = createMockLibraryData()
    return HttpResponse.json({
      result: {
        data: {
          categories: mockData.categories,
          tags: mockData.tags
        }
      }
    })
  }),

  // Share endpoints
  http.post(`${TRPC_BASE_URL}/share.create`, async ({ request }) => {
    const body = await request.json() as any
    const input = body.json || body
    
    return HttpResponse.json({
      result: {
        data: createMockShareLink({ 
          summaryId: input.summaryId,
          slug: 'generated-slug-123',
        })
      }
    })
  }),

  http.get(`${TRPC_BASE_URL}/share.get`, ({ request }) => {
    const url = new URL(request.url)
    const input = JSON.parse(url.searchParams.get('input') || '{}')
    
    if (input.summaryId === 'no-share') {
      return HttpResponse.json({
        result: { data: null }
      })
    }
    
    return HttpResponse.json({
      result: {
        data: createMockShareLink({ summaryId: input.summaryId })
      }
    })
  }),

  // Auth endpoints
  http.get(`${TRPC_BASE_URL}/auth.getProfile`, () => {
    return HttpResponse.json({
      result: {
        data: createMockUser({ 
          plan: 'PRO',
          summariesUsed: 5,
          summariesLimit: 25
        })
      }
    })
  }),

  // Billing endpoints
  http.post(`${TRPC_BASE_URL}/billing.createCheckoutSession`, async ({ request }) => {
    const body = await request.json() as any
    const input = body.json || body
    
    return HttpResponse.json({
      result: {
        data: {
          url: `https://checkout.stripe.com/c/pay/test_session_123#${input.priceId}`
        }
      }
    })
  }),

  // Progress tracking endpoint (Python API)
  http.get('http://localhost:8000/api/progress/:taskId', ({ params }) => {
    const { taskId } = params
    
    if (taskId === 'completed_task') {
      return HttpResponse.json({
        progress: 100,
        stage: 'Summary ready!',
        status: 'completed',
        task_id: taskId
      })
    }
    
    if (taskId === 'error_task') {
      return HttpResponse.json({
        progress: 0,
        stage: 'Error occurred',
        status: 'error',
        task_id: taskId
      })
    }
    
    return HttpResponse.json({
      progress: 50,
      stage: 'Generating summary...',
      status: 'processing',
      task_id: taskId
    })
  })
]

// Additional handlers for component-specific testing
export const componentSpecificHandlers = [
  // Mock external services
  http.get('https://img.youtube.com/vi/:videoId/maxresdefault.jpg', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(0))
  }),
  
  // Mock Clerk webhook (for integration testing)
  http.post('/api/webhooks/clerk', () => {
    return HttpResponse.json({ received: true })
  }),
  
  // Mock Stripe webhook (for integration testing)
  http.post('/api/webhooks/stripe', () => {
    return HttpResponse.json({ received: true })
  })
]

export const allHandlers = [...tRPCHandlers, ...componentSpecificHandlers]