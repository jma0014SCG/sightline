import { type User, type Summary, type Subscription, type Category, type Tag, type ShareLink } from '@prisma/client'

// Mock user data
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  emailVerified: new Date('2024-01-01'),
  plan: 'FREE',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  summariesUsed: 0,
  summariesLimit: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Mock summary data
export const createMockSummary = (overrides?: Partial<Summary>): Summary => ({
  id: 'summary_123',
  userId: 'user_123',
  videoId: 'dQw4w9WgXcQ',
  videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  videoTitle: 'Test Video',
  channelName: 'Test Channel',
  channelId: 'channel_123',
  duration: 300,
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  content: JSON.stringify({
    summary: 'This is a test summary',
    key_points: ['Point 1', 'Point 2'],
  }),
  keyPoints: ['Point 1', 'Point 2'],
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Mock category data
export const createMockCategory = (overrides?: Partial<Category>): Category => ({
  id: 'category_123',
  name: 'Technology',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Mock tag data
export const createMockTag = (overrides?: Partial<Tag>): Tag => ({
  id: 'tag_123',
  name: 'AI',
  type: 'TECHNOLOGY',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Mock Stripe customer
export const createMockStripeCustomer = (overrides?: any) => ({
  id: 'cus_123',
  email: 'test@example.com',
  name: 'Test User',
  metadata: {
    userId: 'user_123',
  },
  ...overrides,
})

// Mock Stripe subscription
export const createMockStripeSubscription = (overrides?: any) => ({
  id: 'sub_123',
  customer: 'cus_123',
  status: 'active',
  items: {
    data: [{
      price: {
        id: 'price_pro',
      },
    }],
  },
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
  ...overrides,
})

// Mock Stripe checkout session
export const createMockStripeCheckoutSession = (overrides?: any) => ({
  id: 'cs_123',
  url: 'https://checkout.stripe.com/cs_123',
  customer: 'cus_123',
  mode: 'subscription',
  subscription: 'sub_123',
  metadata: {
    userId: 'user_123',
  },
  ...overrides,
})

// Mock OpenAI response for classification
export const createMockOpenAIClassificationResponse = () => ({
  choices: [{
    message: {
      content: JSON.stringify({
        tags: [
          { name: 'React', type: 'TECHNOLOGY' },
          { name: 'Next.js', type: 'FRAMEWORK' },
        ],
        categories: ['Technology', 'Web Development'],
      }),
    },
  }],
})

// Mock Python API response
export const createMockPythonAPIResponse = (overrides?: any) => ({
  video_id: 'dQw4w9WgXcQ',
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  video_title: 'Test Video Title',
  channel_name: 'Test Channel',
  channel_id: 'channel_123',
  duration: 300,
  thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  summary: 'This is a test summary of the video content.',
  key_points: [
    'First key point from the video',
    'Second key point from the video',
  ],
  flashcards: [
    { question: 'What is React?', answer: 'A JavaScript library for building UIs' },
  ],
  quiz_questions: [
    {
      question: 'What is React?',
      options: ['A library', 'A framework', 'A language', 'A database'],
      correct_answer: 0,
    },
  ],
  glossary: [
    { term: 'React', definition: 'A JavaScript library for building user interfaces' },
  ],
  tools: ['VS Code', 'Chrome DevTools'],
  resources: ['React Documentation', 'MDN Web Docs'],
  task_id: 'task_123',
  error: null,
  ...overrides,
})

// Mock browser fingerprint
export const MOCK_BROWSER_FINGERPRINT = 'test-fingerprint-123'

// Mock IP address
export const MOCK_CLIENT_IP = '127.0.0.1'

// Mock share link data
export const createMockShareLink = (overrides?: Partial<ShareLink>): ShareLink => ({
  id: 'share_123',
  slug: 'abc123defg',
  summaryId: 'summary_123',
  userId: 'user_123',
  isPublic: true,
  views: 0,
  expiresAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// Anonymous user ID constant
export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'