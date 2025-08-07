import { Summary, Category, Tag } from '@prisma/client'

// Mock Summary with all component-relevant fields
export const createMockSummaryWithMetadata = (overrides?: Partial<Summary & { 
  categories?: Category[]
  tags?: Tag[]
}>) => ({
  id: 'summary_component_123',
  userId: 'user_test123',
  videoId: 'dQw4w9WgXcQ',
  videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  videoTitle: 'Test Video: Component Testing Guide',
  channelName: 'Test Channel',
  channelId: 'channel_123',
  duration: 1200, // 20 minutes
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  content: `## Video Context
**Title**: Test Video: Component Testing Guide
**Speakers**: Test Speaker
**Channel**: Test Channel
**Duration**: 20:00
**Synopsis**: A comprehensive guide to testing React components in modern applications.

## TL;DR (≤100 words)
This video covers essential patterns for testing React components, including mocking strategies, async testing, and best practices for maintainable test suites.

## Key Takeaways
- Test behavior, not implementation
- Mock external dependencies properly
- Use data-testid for reliable element selection

## Frameworks
**Testing Pyramid**: Structure tests with unit tests at the base, integration tests in the middle, and E2E tests at the top.

## In Practice
1. Start with unit tests for pure functions
2. Add integration tests for component interactions
3. Include E2E tests for critical user journeys

## Playbooks & Heuristics
**When component fails**: First check props, then state, finally external dependencies.

## Feynman Flashcards (≤10)
**Q: What is the testing pyramid?**
A: A testing strategy that emphasizes more unit tests, fewer integration tests, and minimal E2E tests.

## Quick Quiz (3 Q&A)
**Q: Why mock external dependencies in tests?**
A: To isolate the component under test and ensure reliable, fast test execution.

## Novel Idea Meter
**Idea: Component Testing Philosophy** - Score: 4/5 stars
Modern testing focuses on user behavior rather than implementation details.

## Glossary (≤15 terms)
**Mock**: A fake implementation of a dependency used in testing
**Assertion**: A statement that checks if a condition is true in tests

## Insight Enrichment
**Sentiment**: Educational and practical
**Tools & Resources**: Jest, React Testing Library, MSW
**Risks & Blockers**: Over-mocking can hide integration issues`,
  keyPoints: [
    'Test behavior, not implementation details',
    'Mock external dependencies appropriately', 
    'Use semantic queries for element selection',
    'Structure tests with clear arrange-act-assert pattern',
    'Focus on user interactions and outcomes'
  ],
  metadata: {
    test: true,
    category: 'education',
    complexity: 'intermediate'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  categories: [
    { id: 'cat_tech', name: 'Technology', createdAt: new Date(), updatedAt: new Date() },
    { id: 'cat_edu', name: 'Education', createdAt: new Date(), updatedAt: new Date() }
  ],
  tags: [
    { id: 'tag_react', name: 'React', type: 'TECHNOLOGY', createdAt: new Date(), updatedAt: new Date() },
    { id: 'tag_testing', name: 'Testing', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
    { id: 'tag_jest', name: 'Jest', type: 'TOOL', createdAt: new Date(), updatedAt: new Date() }
  ],
  // Rich data structures for SummaryViewer testing
  flashcards: [
    { question: 'What is the testing pyramid?', answer: 'A testing strategy that emphasizes more unit tests, fewer integration tests, and minimal E2E tests.' }
  ],
  quiz_questions: [
    { question: 'Why mock external dependencies in tests?', answer: 'To isolate the component under test and ensure reliable, fast test execution.' }
  ],
  frameworks: [
    { name: 'Testing Pyramid', description: 'Structure tests with unit tests at the base, integration tests in the middle, and E2E tests at the top.' }
  ],
  playbooks: [
    { trigger: 'When component fails', action: 'First check props, then state, finally external dependencies.' }
  ],
  accelerated_learning_pack: {
    novel_idea_meter: [
      { insight: 'Component Testing Philosophy - Modern testing focuses on user behavior rather than implementation details.', score: 4 }
    ]
  },
  insight_enrichment: {
    sentiment: 'Educational and practical',
    stats_tools_links: ['Jest', 'React Testing Library', 'MSW'],
    risks_blockers_questions: ['Over-mocking can hide integration issues']
  },
  ...overrides
})

// Mock library data for LibraryControls testing
export const createMockLibraryData = () => ({
  summaries: [
    createMockSummaryWithMetadata({ id: 'sum1', videoTitle: 'React Hooks Guide' }),
    createMockSummaryWithMetadata({ id: 'sum2', videoTitle: 'TypeScript Fundamentals' }),
    createMockSummaryWithMetadata({ id: 'sum3', videoTitle: 'Testing Best Practices' })
  ],
  categories: [
    { id: 'cat_tech', name: 'Technology', count: 2 },
    { id: 'cat_edu', name: 'Education', count: 1 }
  ],
  tags: [
    { id: 'tag_react', name: 'React', type: 'TECHNOLOGY', count: 2 },
    { id: 'tag_typescript', name: 'TypeScript', type: 'TECHNOLOGY', count: 1 },
    { id: 'tag_testing', name: 'Testing', type: 'CONCEPT', count: 1 }
  ],
  totalCount: 3
})

// Mock YouTube player for SummaryViewer testing
export const createMockYouTubePlayer = () => {
  const mockPlayer = {
    seekTo: jest.fn(),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    getDuration: jest.fn(() => 1200),
    getPlayerState: jest.fn(() => 1), // Playing state
  }

  // Mock YouTube API
  ;(global as any).YT = {
    Player: jest.fn().mockImplementation(() => mockPlayer),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    }
  }

  return mockPlayer
}

// Mock file operations for component testing
export const createMockFileOperations = () => {
  const mockClipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue('mock clipboard content')
  }

  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true
  })

  return mockClipboard
}

// Mock URL input validation states
export const createMockURLValidation = () => ({
  valid: {
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    isValid: true,
    error: null
  },
  invalid: {
    url: 'not-a-url',
    isValid: false,
    error: 'Please enter a valid YouTube URL'
  },
  empty: {
    url: '',
    isValid: false,
    error: null
  }
})

// Mock share modal data
export const createMockShareData = () => ({
  shareLink: {
    id: 'share_123',
    slug: 'test-slug-123',
    url: 'http://localhost:3000/share/test-slug-123',
    views: 5,
    expiresAt: null,
    isPublic: true,
    createdAt: new Date('2024-01-01')
  },
  copySuccess: true,
  error: null
})

// Mock authentication states for component testing
export const createMockAuthStates = () => ({
  signedIn: {
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: 'https://example.com/avatar.jpg'
    }
  },
  signedOut: {
    isSignedIn: false,
    isLoaded: true,
    user: null
  },
  loading: {
    isSignedIn: false,
    isLoaded: false,
    user: null
  }
})

// Mock toast notifications
export const createMockToast = () => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  dismiss: jest.fn()
})