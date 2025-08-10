/**
 * Shared types and interfaces for summary services
 * 
 * @module SummaryTypes
 * @category Services
 */

import type { Summary, User } from '@prisma/client'

/**
 * Summary creation input with validation constraints
 */
export interface CreateSummaryInput {
  url: string
  browserFingerprint?: string
  userId?: string
}

/**
 * Summary update input with partial fields
 */
export interface UpdateSummaryInput {
  id: string
  videoTitle?: string
  channelName?: string
  content?: string
  userNotes?: string
  isFavorite?: boolean
  rating?: number
}

/**
 * Anonymous user tracking data
 */
export interface AnonymousUserData {
  browserFingerprint: string
  ipAddress: string
  userAgent?: string
  createdAt: Date
}

/**
 * Progress tracking event data
 */
export interface ProgressEvent {
  taskId: string
  progress: number
  stage: string
  status: 'processing' | 'completed' | 'error'
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * Validation result for URL and content checks
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
  metadata?: {
    videoId?: string
    platform?: 'youtube' | 'other'
    suspicious?: boolean
  }
}

/**
 * Service operation result wrapper
 */
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Classification result from AI service
 */
export interface ClassificationResult {
  categories: string[]
  tags: Array<{
    name: string
    type: string
  }>
  confidence?: number
}

/**
 * Summary with related data and metadata
 */
export interface EnrichedSummary extends Summary {
  user?: User
  isAnonymous?: boolean
  canSave?: boolean
  taskId?: string
}

/**
 * Summary creation options
 */
export interface SummaryCreationOptions {
  skipClassification?: boolean
  skipEmailNotification?: boolean
  priority?: 'low' | 'normal' | 'high'
}

/**
 * Constants for anonymous user handling
 */
// These are re-exported from anonymousService.ts
// export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'
// export const ANONYMOUS_SUMMARY_LIMIT = 1 
// export const ANONYMOUS_FINGERPRINT_PREFIX = 'anon_'

/**
 * Error codes for service operations
 */
export enum ServiceErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Service error class
 */
export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}