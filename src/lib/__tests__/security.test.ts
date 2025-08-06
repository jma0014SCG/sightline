import { sanitizeHtml, sanitizeText, isValidYouTubeVideoId } from '../security'

describe('Security Utils', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello'
      const sanitized = sanitizeHtml(maliciousInput)
      expect(sanitized).toBe('Hello')
    })

    it('should remove dangerous HTML attributes', () => {
      const htmlInput = '<div class="test" onclick="alert()">Hello <b>World</b></div>'
      const sanitized = sanitizeHtml(htmlInput)
      expect(sanitized).toBe('<div class="test" \"alert()\">Hello <b>World</b></div>')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should handle plain text input', () => {
      const plainText = 'This is plain text'
      expect(sanitizeHtml(plainText)).toBe(plainText)
    })
  })

  describe('sanitizeText', () => {
    it('should remove script tags from text', () => {
      const maliciousText = 'Hello <script>alert("xss")</script> World'
      const sanitized = sanitizeText(maliciousText)
      expect(sanitized.trim()).toBe('Hello  World')
    })

    it('should remove javascript protocols', () => {
      const dangerousText = 'Click here: javascript:alert("xss")'
      const sanitized = sanitizeText(dangerousText)
      expect(sanitized.trim()).toBe('Click here: alert("xss")')
    })
  })

  describe('isValidYouTubeVideoId', () => {
    it('should validate standard YouTube video IDs', () => {
      const validIds = [
        'dQw4w9WgXcQ',  // 11 characters with letters, numbers
        'aBcDefGhIjK',  // 11 characters mixed case
        '1234567890a',  // 11 characters with numbers
        'a-B_1234567',  // 11 characters with allowed special chars
      ]

      validIds.forEach(id => {
        expect(isValidYouTubeVideoId(id)).toBe(true)
      })
    })

    it('should reject invalid video IDs', () => {
      const invalidIds = [
        '',
        'too-short',
        'this-id-is-way-too-long-to-be-valid',
        'invalid@chars',
        'spaces not allowed',
      ]

      invalidIds.forEach(id => {
        expect(isValidYouTubeVideoId(id)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      expect(isValidYouTubeVideoId('a')).toBe(false) // too short
      expect(isValidYouTubeVideoId('abcdefghijk')).toBe(true) // exactly 11 chars
      expect(isValidYouTubeVideoId('abcdefghijkl')).toBe(false) // too long
    })
  })
})