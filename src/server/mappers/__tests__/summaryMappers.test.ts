import { describe, it, expect } from 'vitest'
import { mapDbSummaryToViewer } from '../summaryMappers'
import type { Summary as PrismaSummary } from '@prisma/client'

/**
 * Test suite for summaryMappers.ts
 * 
 * Tests the mapDbSummaryToViewer function which converts Prisma Summary objects
 * to the UI-expected format, with special focus on synopsis field handling.
 */

// Mock Prisma Summary base object
const createMockPrismaSummary = (overrides: Partial<PrismaSummary> = {}): PrismaSummary & {
  categories?: Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>
  tags?: Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>
} => ({
  id: 'test-summary-id',
  userId: 'test-user-id', 
  videoId: 'dQw4w9WgXcQ',
  videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  videoTitle: 'Test Video Title',
  channelName: 'Test Channel',
  channelId: 'test-channel-id',
  duration: 300,
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  content: 'Test video content summary',
  synopsis: 'Test synopsis from AI processing',
  keyPoints: null as any,
  metadata: null,
  viewCount: 1000000,
  likeCount: 50000,
  commentCount: 2500,
  uploadDate: new Date('2024-01-01'),
  description: 'Test video description',
  speakers: null,
  keyMoments: null,
  frameworks: null,
  debunkedAssumptions: null,
  inPractice: null,
  playbooks: null,
  learningPack: null,
  thinkingStyle: null,
  enrichment: null,
  language: 'en',
  processingSource: 'gumloop',
  processingVersion: '1.0',
  processingStatus: 'completed',
  processingStage: 'finished',
  processingProgress: 100,
  processingTaskId: 'task-123',
  processingError: null,
  userNotes: null,
  rating: null,
  isFavorite: false,
  lastViewedAt: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  categories: [],
  tags: [],
  ...overrides
})

describe('mapDbSummaryToViewer', () => {
  describe('synopsis field handling', () => {
    it('should pass through valid synopsis string', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'This is a comprehensive video synopsis providing key insights and takeaways.'
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('This is a comprehensive video synopsis providing key insights and takeaways.')
    })

    it('should handle null synopsis from database', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: null
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBeNull()
    })

    it('should handle empty string synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: ''
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('')
    })

    it('should handle synopsis with special characters and formatting', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Synopsis with "quotes", newlines\nand special chars: ñáéíóú & <html> tags!'
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('Synopsis with "quotes", newlines\nand special chars: ñáéíóú & <html> tags!')
    })

    it('should handle very long synopsis text', () => {
      const longSynopsis = 'A'.repeat(5000) // 5KB synopsis
      const mockSummary = createMockPrismaSummary({
        synopsis: longSynopsis
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe(longSynopsis)
      expect(result.synopsis?.length).toBe(5000)
    })
  })

  describe('core field mapping', () => {
    it('should map all core fields correctly including synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Test synopsis for field mapping'
      })

      const result = mapDbSummaryToViewer(mockSummary)

      // Verify all core fields are mapped
      expect(result.id).toBe('test-summary-id')
      expect(result.userId).toBe('test-user-id')
      expect(result.videoId).toBe('dQw4w9WgXcQ')
      expect(result.videoUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result.videoTitle).toBe('Test Video Title')
      expect(result.channelName).toBe('Test Channel')
      expect(result.channelId).toBe('test-channel-id')
      expect(result.duration).toBe(300)
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
      expect(result.content).toBe('Test video content summary')
      expect(result.synopsis).toBe('Test synopsis for field mapping')
      expect(result.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'))
      expect(result.updatedAt).toEqual(new Date('2024-01-01T10:00:00Z'))
    })
  })

  describe('JSON field parsing', () => {
    it('should handle keyPoints as null without affecting synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Synopsis should be preserved',
        keyPoints: null
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('Synopsis should be preserved')
      expect(result.keyPoints).toEqual([]) // parseJsonField fallback
    })

    it('should handle metadata as null without affecting synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Synopsis should be preserved',
        metadata: null
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('Synopsis should be preserved')
      expect(result.metadata).toEqual({}) // parseJsonField fallback
    })

    it('should parse JSON keyPoints and preserve synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Valid synopsis with JSON data',
        keyPoints: JSON.stringify(['Point 1', 'Point 2', 'Point 3'])
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('Valid synopsis with JSON data')
      expect(result.keyPoints).toEqual(['Point 1', 'Point 2', 'Point 3'])
    })

    it('should parse JSON metadata and preserve synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Valid synopsis with metadata',
        metadata: JSON.stringify({ 
          frameworks: [{ name: 'React', description: 'UI library' }],
          key_moments: [{ timestamp: '1:30', insight: 'Key insight' }]
        })
      })

      const result = mapDbSummaryToViewer(mockSummary)

      expect(result.synopsis).toBe('Valid synopsis with metadata')
      expect(result.metadata).toEqual({
        frameworks: [{ name: 'React', description: 'UI library' }],
        key_moments: [{ timestamp: '1:30', insight: 'Key insight' }]
      })
      expect(result.frameworks).toEqual([{ name: 'React', description: 'UI library' }])
      expect(result.key_moments).toEqual([{ timestamp: '1:30', insight: 'Key insight' }])
    })
  })

  describe('edge cases and integration', () => {
    it('should handle complete object with synopsis and all AI data', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Complete synopsis with all features',
        metadata: JSON.stringify({
          frameworks: [{ name: 'Next.js', description: 'React framework' }],
          playbooks: [{ trigger: 'On error', action: 'Log and retry' }],
          key_moments: [{ timestamp: '0:30', insight: 'Introduction' }],
          debunked_assumptions: ['Assumption 1 is false'],
          in_practice: ['Practice tip 1', 'Practice tip 2'],
          insight_enrichment: { sentiment: 'positive', risks_blockers_questions: ['Risk 1'] },
          accelerated_learning_pack: { 
            tldr100: 'Quick summary',
            flashcards: [{ q: 'Question', a: 'Answer' }] 
          }
        }),
        keyPoints: JSON.stringify(['Key point 1', 'Key point 2']),
        categories: [
          { id: 'cat1', name: 'Technology', createdAt: new Date(), updatedAt: new Date() }
        ] as any,
        tags: [
          { id: 'tag1', name: 'React', createdAt: new Date(), updatedAt: new Date() }
        ] as any
      })

      const result = mapDbSummaryToViewer(mockSummary)

      // Verify synopsis is preserved
      expect(result.synopsis).toBe('Complete synopsis with all features')
      
      // Verify all AI data is extracted correctly
      expect(result.frameworks).toEqual([{ name: 'Next.js', description: 'React framework' }])
      expect(result.playbooks).toEqual([{ trigger: 'On error', action: 'Log and retry' }])
      expect(result.key_moments).toEqual([{ timestamp: '0:30', insight: 'Introduction' }])
      expect(result.debunked_assumptions).toEqual(['Assumption 1 is false'])
      expect(result.in_practice).toEqual(['Practice tip 1', 'Practice tip 2'])
      expect(result.insight_enrichment).toEqual({ 
        sentiment: 'positive', 
        risks_blockers_questions: ['Risk 1'] 
      })
      expect(result.accelerated_learning_pack).toEqual({
        tldr100: 'Quick summary',
        flashcards: [{ q: 'Question', a: 'Answer' }]
      })
      
      // Verify keyPoints are preserved
      expect(result.keyPoints).toEqual(['Key point 1', 'Key point 2'])
      
      // Verify core fields remain intact
      expect(result.videoTitle).toBe('Test Video Title')
      expect(result.channelName).toBe('Test Channel')
      expect(result.content).toBe('Test video content summary')
    })

    it('should not throw errors with malformed JSON and preserve synopsis', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Synopsis should be preserved even with bad JSON',
        keyPoints: '{"invalid": json}', // Malformed JSON
        metadata: 'not-json-at-all'
      })

      const result = mapDbSummaryToViewer(mockSummary)

      // Synopsis should always be preserved regardless of JSON parsing issues
      expect(result.synopsis).toBe('Synopsis should be preserved even with bad JSON')
      
      // Fallback values should be used for malformed JSON
      expect(result.keyPoints).toEqual([]) // parseJsonField fallback
      expect(result.metadata).toEqual({}) // parseJsonField fallback
      
      // Core fields should remain unaffected
      expect(result.videoTitle).toBe('Test Video Title')
      expect(result.content).toBe('Test video content summary')
    })
  })

  describe('type compatibility', () => {
    it('should return object compatible with SummaryViewerProps', () => {
      const mockSummary = createMockPrismaSummary({
        synopsis: 'Synopsis for type compatibility test'
      })

      const result = mapDbSummaryToViewer(mockSummary)

      // Test that result has the required properties for SummaryViewerProps
      expect(typeof result.content).toBe('string')
      expect(typeof result.videoTitle).toBe('string')
      expect(typeof result.channelName).toBe('string')
      expect(result.synopsis === null || typeof result.synopsis === 'string').toBe(true)
      
      // Test optional properties
      expect(result.duration === undefined || typeof result.duration === 'number').toBe(true)
      expect(result.thumbnailUrl === null || result.thumbnailUrl === undefined || typeof result.thumbnailUrl === 'string').toBe(true)
    })
  })
})