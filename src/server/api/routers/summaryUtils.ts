import { YOUTUBE_URL_PATTERNS } from './summaryValidation'

/**
 * Extract YouTube video ID from various YouTube URL formats
 * 
 * Parses YouTube URLs and extracts the 11-character video ID using multiple regex patterns
 * to handle different URL formats including youtu.be, youtube.com/watch, and youtube.com/embed.
 * Used for normalizing video IDs before API calls and database operations.
 * 
 * @param url - The YouTube URL to parse
 * @returns The extracted video ID, or null if no valid ID found
 * 
 * @example
 * ```typescript
 * const id1 = extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')  // 'dQw4w9WgXcQ'
 * const id2 = extractVideoId('https://youtu.be/dQw4w9WgXcQ')            // 'dQw4w9WgXcQ'
 * const id3 = extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')   // 'dQw4w9WgXcQ'
 * const invalid = extractVideoId('https://example.com')                 // null
 * ```
 */
export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

/**
 * Generate a unique task ID for tracking summary processing
 * 
 * @returns A unique task ID string
 */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate if a string is a valid YouTube video ID
 * 
 * @param id - The potential video ID to validate
 * @returns True if valid YouTube video ID format
 */
export function isValidVideoIdFormat(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}