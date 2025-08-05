/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * Removes dangerous HTML elements and attributes that could be used for script injection.
 * This is basic server-side sanitization - for production client-side rendering, 
 * consider using DOMPurify for more comprehensive protection.
 * 
 * @param {string} content - The HTML content to sanitize
 * @returns {string} Sanitized HTML content with dangerous elements removed
 * @example
 * ```typescript
 * const userInput = '<script>alert("xss")</script><p>Safe content</p>'
 * const safe = sanitizeHtml(userInput) // '<p>Safe content</p>'
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function sanitizeHtml(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

/**
 * Sanitize text content by removing potential script injections
 * 
 * Removes script tags, javascript: protocols, and event handlers from text content.
 * Primarily used for user-generated content that should not contain any executable code.
 * 
 * @param {string} text - The text content to sanitize
 * @returns {string} Sanitized text with script injections removed and whitespace trimmed
 * @example
 * ```typescript
 * const userText = 'Hello <script>alert("xss")</script> world!'
 * const safe = sanitizeText(userText) // 'Hello  world!'
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Validate and sanitize URL
 * 
 * Parses and validates a URL string, ensuring it uses only safe protocols (http/https).
 * Throws an error if the URL format is invalid or uses a dangerous protocol.
 * 
 * @param {string} url - The URL string to validate and sanitize
 * @returns {string} The sanitized and validated URL
 * @throws {Error} When URL format is invalid or protocol is not http/https
 * @example
 * ```typescript
 * const userUrl = 'https://example.com/path'
 * const safe = sanitizeUrl(userUrl) // 'https://example.com/path'
 * 
 * // This would throw an error:
 * sanitizeUrl('javascript:alert("xss")')
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
    
    return parsed.toString()
  } catch (error) {
    throw new Error('Invalid URL format')
  }
}

/**
 * Check if content contains suspicious patterns
 * 
 * Scans content for patterns that might indicate malicious code injection attempts.
 * Used as a first-line defense to identify potentially dangerous content before processing.
 * 
 * @param {string} content - The content to scan for suspicious patterns
 * @returns {boolean} True if suspicious patterns are found, false otherwise
 * @example
 * ```typescript
 * const maliciousContent = '<script>alert("xss")</script>'
 * const isSuspicious = containsSuspiciousContent(maliciousContent) // true
 * 
 * const safeContent = 'This is normal text content'
 * const isSafe = containsSuspiciousContent(safeContent) // false
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
    /file:\/\//i,
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(content))
}

/**
 * Extract client IP address from request headers
 * 
 * Attempts to determine the real client IP address by checking various headers
 * commonly used by proxies, load balancers, and CDNs. Prioritizes headers
 * in order of reliability: x-forwarded-for, x-real-ip, cf-connecting-ip.
 * 
 * @param {Headers} headers - Request headers object containing potential IP information
 * @returns {string} The client IP address, or 'unknown' if not determinable
 * @example
 * ```typescript
 * // In a Next.js API route:
 * const clientIP = getClientIP(request.headers)
 * console.log(`Request from: ${clientIP}`)
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIP = headers.get('x-real-ip')
  const cfIP = headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfIP) {
    return cfIP
  }
  
  return 'unknown'
}

/**
 * Generate a secure random string
 * 
 * Creates a cryptographically secure random string using alphanumeric characters.
 * Suitable for generating tokens, session IDs, and other security-sensitive identifiers.
 * Note: For production use, consider using crypto.randomBytes() for better security.
 * 
 * @param {number} [length=32] - The length of the generated token
 * @returns {string} A secure random string of the specified length
 * @example
 * ```typescript
 * const sessionToken = generateSecureToken(64)
 * const shortId = generateSecureToken(16)
 * const defaultToken = generateSecureToken() // 32 characters
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Validate YouTube video ID format
 * 
 * Checks if a string matches the standard YouTube video ID format (11 characters
 * containing letters, numbers, underscores, and hyphens). Used to validate video IDs
 * before making API calls or database operations.
 * 
 * @param {string} videoId - The video ID string to validate
 * @returns {boolean} True if the video ID format is valid, false otherwise
 * @example
 * ```typescript
 * const validId = 'dQw4w9WgXcQ'
 * const isValid = isValidYouTubeVideoId(validId) // true
 * 
 * const invalidId = 'invalid-id'
 * const isInvalid = isValidYouTubeVideoId(invalidId) // false
 * ```
 * 
 * @category Security
 * @since 1.0.0
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
}