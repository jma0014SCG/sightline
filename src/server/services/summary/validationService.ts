/**
 * URL validation and security checks service
 * 
 * @module ValidationService
 * @category Services
 */

import { sanitizeUrl, containsSuspiciousContent, isValidYouTubeVideoId } from '@/lib/security'
import { logger } from '@/lib/logger'
import type { ValidationResult } from './types'

/**
 * YouTube URL validation patterns
 */
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

/**
 * Extract YouTube video ID from various URL formats
 * 
 * @param url - The YouTube URL to parse
 * @returns The extracted video ID, or null if no valid ID found
 */
export function extractVideoId(url: string): string | null {
  try {
    const sanitized = sanitizeUrl(url)
    
    for (const pattern of YOUTUBE_PATTERNS) {
      const match = sanitized.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    // Try to extract from URL params as fallback
    const urlObj = new URL(sanitized)
    const videoId = urlObj.searchParams.get('v')
    
    if (videoId && isValidYouTubeVideoId(videoId)) {
      return videoId
    }
    
    return null
  } catch (error) {
    logger.debug('Failed to extract video ID', { url, error })
    return null
  }
}

/**
 * Validate a YouTube URL for processing
 * 
 * @param url - The URL to validate
 * @returns Validation result with errors and metadata
 */
export function validateYouTubeUrl(url: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const metadata: ValidationResult['metadata'] = {
    platform: 'youtube',
  }
  
  // Check URL format
  if (!url || typeof url !== 'string') {
    errors.push('URL is required and must be a string')
    return { isValid: false, errors }
  }
  
  // Check URL length
  if (url.length > 2048) {
    errors.push('URL is too long (max 2048 characters)')
    return { isValid: false, errors }
  }
  
  // Check for suspicious content
  if (containsSuspiciousContent(url)) {
    errors.push('URL contains suspicious content')
    metadata.suspicious = true
    return { isValid: false, errors, metadata }
  }
  
  // Try to parse as URL
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch {
    errors.push('Invalid URL format')
    return { isValid: false, errors }
  }
  
  // Check if it's a YouTube domain
  const validDomains = [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'm.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
  ]
  
  if (!validDomains.includes(urlObj.hostname)) {
    errors.push('Only YouTube URLs are allowed')
    metadata.platform = 'other'
    return { isValid: false, errors, metadata }
  }
  
  // Extract and validate video ID
  const videoId = extractVideoId(url)
  if (!videoId) {
    errors.push('Could not extract valid YouTube video ID from URL')
    return { isValid: false, errors }
  }
  
  // Validate video ID format
  if (!isValidYouTubeVideoId(videoId)) {
    errors.push('Invalid YouTube video ID format')
    return { isValid: false, errors }
  }
  
  metadata.videoId = videoId
  
  // Check for potential issues (warnings)
  if (urlObj.searchParams.has('list')) {
    warnings.push('Playlist parameter detected - only the single video will be processed')
  }
  
  if (urlObj.searchParams.has('t') || urlObj.searchParams.has('start')) {
    warnings.push('Timestamp parameter detected - full video will be processed')
  }
  
  return {
    isValid: true,
    errors: [],
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata,
  }
}

/**
 * Validate summary content for security and quality
 * 
 * @param content - The content to validate
 * @returns Validation result
 */
export function validateSummaryContent(content: {
  title?: string
  tldr?: string
  keyTakeaways?: string[]
  tags?: string[]
}): ValidationResult {
  const errors: string[] = []
  
  // Check title
  if (content.title) {
    if (content.title.length > 500) {
      errors.push('Title is too long (max 500 characters)')
    }
    if (containsSuspiciousContent(content.title)) {
      errors.push('Title contains suspicious content')
    }
  }
  
  // Check TLDR
  if (content.tldr) {
    if (content.tldr.length > 5000) {
      errors.push('TLDR is too long (max 5000 characters)')
    }
    if (containsSuspiciousContent(content.tldr)) {
      errors.push('TLDR contains suspicious content')
    }
  }
  
  // Check key takeaways
  if (content.keyTakeaways) {
    if (!Array.isArray(content.keyTakeaways)) {
      errors.push('Key takeaways must be an array')
    } else {
      if (content.keyTakeaways.length > 20) {
        errors.push('Too many key takeaways (max 20)')
      }
      content.keyTakeaways.forEach((takeaway, index) => {
        if (typeof takeaway !== 'string') {
          errors.push(`Key takeaway ${index + 1} must be a string`)
        } else if (takeaway.length > 500) {
          errors.push(`Key takeaway ${index + 1} is too long (max 500 characters)`)
        } else if (containsSuspiciousContent(takeaway)) {
          errors.push(`Key takeaway ${index + 1} contains suspicious content`)
        }
      })
    }
  }
  
  // Check tags
  if (content.tags) {
    if (!Array.isArray(content.tags)) {
      errors.push('Tags must be an array')
    } else {
      if (content.tags.length > 30) {
        errors.push('Too many tags (max 30)')
      }
      content.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag ${index + 1} must be a string`)
        } else if (tag.length > 50) {
          errors.push(`Tag ${index + 1} is too long (max 50 characters)`)
        } else if (containsSuspiciousContent(tag)) {
          errors.push(`Tag ${index + 1} contains suspicious content`)
        }
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate user input for security
 * 
 * @param input - User input to validate
 * @returns Sanitized input or null if invalid
 */
export function validateUserInput(input: any): string | null {
  if (typeof input !== 'string') {
    return null
  }
  
  const trimmed = input.trim()
  
  if (trimmed.length === 0 || trimmed.length > 10000) {
    return null
  }
  
  if (containsSuspiciousContent(trimmed)) {
    return null
  }
  
  return trimmed
}

/**
 * Validate browser fingerprint format
 * 
 * @param fingerprint - The fingerprint to validate
 * @returns Whether the fingerprint is valid
 */
export function validateFingerprint(fingerprint: string): boolean {
  if (typeof fingerprint !== 'string') {
    return false
  }
  
  // Check length (typical fingerprints are 32-64 characters)
  if (fingerprint.length < 16 || fingerprint.length > 128) {
    return false
  }
  
  // Check for valid characters (alphanumeric and common separators)
  if (!/^[a-zA-Z0-9_-]+$/.test(fingerprint)) {
    return false
  }
  
  return true
}

/**
 * Service class for validation operations
 */
export class ValidationService {
  /**
   * Comprehensive validation for summary creation
   * 
   * @param url - YouTube URL to validate
   * @returns Validation result with detailed errors
   */
  static validateSummaryCreation(
    url: string
  ): ValidationResult {
    // Validate URL
    return validateYouTubeUrl(url)
  }
  
  /**
   * Validate summary update data
   * 
   * @param data - Update data to validate
   * @returns Validation result
   */
  static validateSummaryUpdate(data: any): ValidationResult {
    const errors: string[] = []
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid update data')
      return { isValid: false, errors }
    }
    
    // Validate content fields
    const contentValidation = validateSummaryContent({
      title: data.videoTitle,
      tldr: data.tldr,
      keyTakeaways: data.keyTakeaways,
      tags: data.tags,
    })
    
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors)
    }
    
    // Validate categories
    if (data.categories) {
      if (!Array.isArray(data.categories)) {
        errors.push('Categories must be an array')
      } else if (data.categories.length > 10) {
        errors.push('Too many categories (max 10)')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}