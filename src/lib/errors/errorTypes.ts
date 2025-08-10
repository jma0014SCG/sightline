/**
 * Custom error types for the application
 * 
 * @module ErrorTypes
 * @category Errors
 */

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly isOperational: boolean
  abstract readonly code: string

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Validation errors (400 Bad Request)
 */
export class ValidationError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
  readonly code = 'VALIDATION_ERROR'

  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Authentication errors (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  readonly statusCode = 401
  readonly isOperational = true
  readonly code = 'AUTHENTICATION_ERROR'

  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, context)
  }
}

/**
 * Authorization errors (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  readonly statusCode = 403
  readonly isOperational = true
  readonly code = 'AUTHORIZATION_ERROR'

  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, context)
  }
}

/**
 * Not found errors (404 Not Found)
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly isOperational = true
  readonly code = 'NOT_FOUND_ERROR'

  constructor(
    message: string,
    public readonly resource?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Rate limit errors (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429
  readonly isOperational = true
  readonly code = 'RATE_LIMIT_ERROR'

  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Quota exceeded errors (403 Forbidden)
 */
export class QuotaExceededError extends AppError {
  readonly statusCode = 403
  readonly isOperational = true
  readonly code = 'QUOTA_EXCEEDED_ERROR'

  constructor(
    message: string = 'Usage quota exceeded',
    public readonly quotaType?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * External service errors (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
  readonly statusCode = 502
  readonly isOperational = true
  readonly code = 'EXTERNAL_SERVICE_ERROR'

  constructor(
    message: string,
    public readonly serviceName?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Database errors (500 Internal Server Error)
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
  readonly code = 'DATABASE_ERROR'

  constructor(
    message: string,
    public readonly operation?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Configuration errors (500 Internal Server Error)
 */
export class ConfigurationError extends AppError {
  readonly statusCode = 500
  readonly isOperational = false
  readonly code = 'CONFIGURATION_ERROR'

  constructor(
    message: string,
    public readonly configKey?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Processing errors (500 Internal Server Error)
 */
export class ProcessingError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
  readonly code = 'PROCESSING_ERROR'

  constructor(
    message: string,
    public readonly processType?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Network errors (503 Service Unavailable)
 */
export class NetworkError extends AppError {
  readonly statusCode = 503
  readonly isOperational = true
  readonly code = 'NETWORK_ERROR'

  constructor(
    message: string,
    public readonly endpoint?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Timeout errors (504 Gateway Timeout)
 */
export class TimeoutError extends AppError {
  readonly statusCode = 504
  readonly isOperational = true
  readonly code = 'TIMEOUT_ERROR'

  constructor(
    message: string,
    public readonly operation?: string,
    context?: Record<string, any>
  ) {
    super(message, context)
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: any): boolean {
  return isAppError(error) && error.isOperational
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Get error severity based on status code
 */
export function getErrorSeverity(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) {
    return ErrorSeverity.CRITICAL
  } else if (statusCode >= 400 && statusCode < 500) {
    return ErrorSeverity.MEDIUM
  } else if (statusCode >= 300) {
    return ErrorSeverity.LOW
  }
  return ErrorSeverity.LOW
}