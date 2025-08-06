import { sanitizeInput, isValidYouTubeURL } from '../security'

describe('Security Utils', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello'
      const sanitized = sanitizeInput(maliciousInput)
      expect(sanitized).toBe('Hello')
    })

    it('should remove all HTML tags and attributes', () => {
      const htmlInput = '<div class="test" onclick="alert()">Hello <b>World</b></div>'
      const sanitized = sanitizeInput(htmlInput)
      expect(sanitized).toBe('Hello World')
    })

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('')
    })

    it('should handle plain text input', () => {
      const plainText = 'This is plain text'
      expect(sanitizeInput(plainText)).toBe(plainText)
    })
  })

  describe('isValidYouTubeURL', () => {
    it('should validate standard YouTube URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ]

      validUrls.forEach(url => {
        expect(isValidYouTubeURL(url)).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://example.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/user/test',
        'not-a-url',
        '',
        'javascript:alert(1)',
        'https://evil.com/youtube.com/watch?v=test',
      ]

      invalidUrls.forEach(url => {
        expect(isValidYouTubeURL(url)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      expect(isValidYouTubeURL('https://youtube.com/watch?v=')).toBe(false)
      expect(isValidYouTubeURL('https://youtube.com/watch?v=a')).toBe(true)
    })
  })
})