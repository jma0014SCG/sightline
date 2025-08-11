import { describe, it, expect } from 'vitest'
import { summarySchemas, YOUTUBE_URL_PATTERNS, ANONYMOUS_USER_ID } from '../summaryValidation'

describe('summaryValidation', () => {
  describe('YOUTUBE_URL_PATTERNS', () => {
    it('should match valid YouTube URLs', () => {
      const validUrls = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'http://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ]

      validUrls.forEach(url => {
        const matched = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url))
        expect(matched).toBe(true)
      })
    })

    it('should not match invalid URLs', () => {
      const invalidUrls = [
        'https://example.com',
        'https://vimeo.com/123456789',
        'https://youtube.com/channel/UC123',
        'https://youtube.com/user/testuser',
        'invalid-url',
        '',
      ]

      invalidUrls.forEach(url => {
        const matched = YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url))
        expect(matched).toBe(false)
      })
    })
  })

  describe('ANONYMOUS_USER_ID', () => {
    it('should be defined', () => {
      expect(ANONYMOUS_USER_ID).toBe('ANONYMOUS_USER')
    })
  })

  describe('summarySchemas.createAnonymous', () => {
    it('should validate valid input', () => {
      const validInput = {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        browserFingerprint: 'test-fingerprint-123'
      }

      const result = summarySchemas.createAnonymous.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid URL format', () => {
      const invalidInput = {
        url: 'not-a-url',
        browserFingerprint: 'test-fingerprint-123'
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid URL format')
      }
    })

    it('should reject non-YouTube URLs', () => {
      const invalidInput = {
        url: 'https://example.com',
        browserFingerprint: 'test-fingerprint-123'
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Only YouTube URLs are allowed')
      }
    })

    it('should reject empty URL', () => {
      const invalidInput = {
        url: '',
        browserFingerprint: 'test-fingerprint-123'
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('URL is required')
      }
    })

    it('should reject URL that is too long', () => {
      const longUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ&' + 'x'.repeat(2050)
      const invalidInput = {
        url: longUrl,
        browserFingerprint: 'test-fingerprint-123'
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('URL too long')
      }
    })

    it('should reject empty browser fingerprint', () => {
      const invalidInput = {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        browserFingerprint: ''
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Browser fingerprint is required')
      }
    })

    it('should reject browser fingerprint that is too long', () => {
      const longFingerprint = 'x'.repeat(300)
      const invalidInput = {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        browserFingerprint: longFingerprint
      }

      const result = summarySchemas.createAnonymous.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Browser fingerprint too long')
      }
    })

    it('should reject missing fields', () => {
      const invalidInputs = [
        { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }, // missing browserFingerprint
        { browserFingerprint: 'test-fingerprint-123' }, // missing url
        {}, // missing both
      ]

      invalidInputs.forEach(input => {
        const result = summarySchemas.createAnonymous.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('summarySchemas.health', () => {
    it('should validate correct health response', () => {
      const validHealth = {
        ok: true,
        layer: 'trpc' as const
      }

      const result = summarySchemas.health.safeParse(validHealth)
      expect(result.success).toBe(true)
    })

    it('should reject invalid health response', () => {
      const invalidHealths = [
        { ok: false, layer: 'trpc' }, // ok must be true for health
        { ok: true, layer: 'invalid' }, // layer must be 'trpc'
        { ok: true }, // missing layer
        { layer: 'trpc' }, // missing ok
        {}, // missing both
      ]

      invalidHealths.forEach(health => {
        const result = summarySchemas.health.safeParse(health)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('summarySchemas.videoId', () => {
    it('should validate correct video IDs', () => {
      const validIds = [
        'dQw4w9WgXcQ',
        'oHg5SJYRHA0',
        'kJQP7kiw5Fk',
        'L_jWHffIx5E',
        '9bZkp7q19f0',
        'YQHsXMglC9A',
      ]

      validIds.forEach(id => {
        const result = summarySchemas.videoId.safeParse(id)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid video IDs', () => {
      const invalidIds = [
        'short',
        'toolongvideoidstring',
        'dQw4w9WgXc!',
        '',
        'dQw4w9WgXc ',
      ]

      invalidIds.forEach(id => {
        const result = summarySchemas.videoId.safeParse(id)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('summarySchemas.taskId', () => {
    it('should validate correct task IDs', () => {
      const validTaskIds = [
        'task_1642680000_abc123def',
        'task_1234567890_xyz987',
        'simple_task_id',
      ]

      validTaskIds.forEach(taskId => {
        const result = summarySchemas.taskId.safeParse(taskId)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid task IDs', () => {
      const invalidTaskIds = [
        'short',
        'x'.repeat(100), // too long
        '',
      ]

      invalidTaskIds.forEach(taskId => {
        const result = summarySchemas.taskId.safeParse(taskId)
        expect(result.success).toBe(false)
      })
    })
  })
})