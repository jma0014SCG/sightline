/**
 * URL utility functions for consistent URL handling across the application
 */

/**
 * Get the application base URL
 * Prioritizes NEXT_PUBLIC_APP_URL env var, falls back to window.location or localhost
 */
export function getAppUrl(): string {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') // Remove trailing slash
  }
  
  // Use window location if in browser
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Default to localhost for server-side rendering in development
  return 'http://localhost:3000'
}

/**
 * Generate a share URL for a given slug
 */
export function getShareUrl(slug: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/share/${slug}`
}

/**
 * Ensure URL has proper protocol
 */
export function ensureProtocol(url: string): string {
  if (!url) return ''
  
  // If URL already has protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Add https by default
  return `https://${url}`
}

/**
 * Remove trailing slash from URL
 */
export function removeTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}