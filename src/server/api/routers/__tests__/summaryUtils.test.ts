import { describe, it, expect } from 'vitest'
import { extractVideoId, generateTaskId, isValidVideoIdFormat } from '../summaryUtils'

describe('summaryUtils', () => {
  describe('extractVideoId', () => {
    it('should extract video ID from youtube.com/watch URLs', () => {
      const testCases = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'http://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=123s',
        'https://youtube.com/watch?list=PLTest&v=dQw4w9WgXcQ',
      ]
      
      testCases.forEach(url => {
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
      })
    })

    it('should extract video ID from youtu.be URLs', () => {
      const testCases = [
        'https://youtu.be/dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=123',
      ]
      
      testCases.forEach(url => {
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
      })
    })

    it('should extract video ID from youtube.com/embed URLs', () => {
      const testCases = [
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'http://youtube.com/embed/dQw4w9WgXcQ',
      ]
      
      testCases.forEach(url => {
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
      })
    })

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'https://example.com',
        'https://vimeo.com/123456789',
        'https://youtube.com/channel/UC123',
        'https://youtube.com/user/testuser',
        'invalid-url',
        '',
        'https://youtube.com/watch?v=short',
        'https://youtube.com/watch?v=toolongvideoid123',
      ]
      
      invalidUrls.forEach(url => {
        expect(extractVideoId(url)).toBeNull()
      })
    })

    it('should handle edge cases', () => {
      expect(extractVideoId('https://youtube.com/watch?v=')).toBeNull()
      expect(extractVideoId('https://youtu.be/')).toBeNull()
      expect(extractVideoId('https://youtube.com/embed/')).toBeNull()
    })
  })

  describe('generateTaskId', () => {
    it('should generate unique task IDs', () => {
      const id1 = generateTaskId()
      const id2 = generateTaskId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^task_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^task_\d+_[a-z0-9]+$/)
    })

    it('should generate IDs with correct format', () => {
      const id = generateTaskId()
      const parts = id.split('_')
      
      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('task')
      expect(parts[1]).toMatch(/^\d+$/) // timestamp
      expect(parts[2]).toMatch(/^[a-z0-9]+$/) // random string
      expect(parts[2]).toHaveLength(9) // random string length
    })

    it('should generate IDs with increasing timestamps', async () => {
      const id1 = generateTaskId()
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1))
      const id2 = generateTaskId()
      
      const timestamp1 = parseInt(id1.split('_')[1])
      const timestamp2 = parseInt(id2.split('_')[1])
      
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1)
    })
  })

  describe('isValidVideoIdFormat', () => {
    it('should validate correct video ID formats', () => {
      const validIds = [
        'dQw4w9WgXcQ',
        'oHg5SJYRHA0',
        'kJQP7kiw5Fk',
        'L_jWHffIx5E',
        '9bZkp7q19f0',
        'YQHsXMglC9A',
        '1234567890_',
        'abcdefghijk',
        'ABCDEFGHIJK',
        '___________', // edge case: all underscores
        '-----------', // edge case: all dashes
      ]
      
      validIds.forEach(id => {
        expect(isValidVideoIdFormat(id)).toBe(true)
      })
    })

    it('should reject invalid video ID formats', () => {
      const invalidIds = [
        '',
        'short',
        'toolongvideoidstring',
        'dQw4w9WgXc!', // invalid character
        'dQw4w9WgXc@', // invalid character
        'dQw4w9WgXc#', // invalid character
        'dQw4w9WgXc$', // invalid character
        'dQw4w9WgXc%', // invalid character
        'dQw4w9WgXc^', // invalid character
        'dQw4w9WgXc&', // invalid character
        'dQw4w9WgXc*', // invalid character
        'dQw4w9WgXc+', // invalid character
        'dQw4w9WgXc=', // invalid character
        'dQw4w9WgXc ', // space character
        'dQw4w9WgXc\n', // newline character
        'dQw4w9WgXc\t', // tab character
      ]
      
      invalidIds.forEach(id => {
        expect(isValidVideoIdFormat(id)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      expect(isValidVideoIdFormat('dQw4w9WgXcQ')).toBe(true) // exactly 11 chars
      expect(isValidVideoIdFormat('dQw4w9WgXc')).toBe(false) // 10 chars
      expect(isValidVideoIdFormat('dQw4w9WgXcQZ')).toBe(false) // 12 chars
    })
  })
})