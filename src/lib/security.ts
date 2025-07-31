/**
 * Sanitize HTML content to prevent XSS attacks
 * Basic sanitization - for production, consider using DOMPurify on client side
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
 * Rate limiting key generator for IP addresses
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
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
}