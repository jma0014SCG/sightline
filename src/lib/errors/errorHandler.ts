/**
 * Centralized error handling and reporting
 * 
 * @module ErrorHandler
 * @category Errors
 */

import { TRPCError } from '@trpc/server'
import { monitoring } from '@/lib/monitoring'
import { logger } from '@/lib/logger'
import { 
  AppError, 
  isAppError, 
  isOperationalError,
  getErrorSeverity,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  ExternalServiceError,
  DatabaseError,
  ProcessingError,
  NetworkError,
  TimeoutError,
} from './errorTypes'

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  userId?: string
  url?: string
  userAgent?: string
  ip?: string
  requestId?: string
  operation?: string
  metadata?: Record<string, any>
}

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  context?: ErrorContext
  skipLogging?: boolean
  skipNotification?: boolean
  customMessage?: string
}

/**
 * Centralized error handler class
 */
export class ErrorHandler {
  private static instance: ErrorHandler

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Handle any error with proper logging and conversion
   */
  handleError(
    error: any,
    options: ErrorHandlingOptions = {}
  ): { 
    appError: AppError
    shouldReport: boolean 
  } {
    let appError: AppError
    let shouldReport = false

    // Convert to AppError if needed
    if (isAppError(error)) {
      appError = error
    } else {
      appError = this.convertToAppError(error)
      shouldReport = true
    }

    // Log the error if not skipped
    if (!options.skipLogging) {
      this.logError(appError, options.context)
    }

    // Report to monitoring if operational and should report
    if (shouldReport || !isOperationalError(appError)) {
      this.reportError(appError, options.context)
    }

    return { appError, shouldReport }
  }

  /**
   * Convert unknown error to AppError
   */
  private convertToAppError(error: any): AppError {
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('validation')) {
        return new ValidationError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return new AuthenticationError(error.message, { originalError: error })
      } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
        return new AuthorizationError(error.message, { originalError: error })
      } else if (error.message.includes('not found')) {
        return new NotFoundError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        return new RateLimitError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('quota') || error.message.includes('limit exceeded')) {
        return new QuotaExceededError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('external') || error.message.includes('service')) {
        return new ExternalServiceError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('database') || error.message.includes('query')) {
        return new DatabaseError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('timeout')) {
        return new TimeoutError(error.message, undefined, { originalError: error })
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        return new NetworkError(error.message, undefined, { originalError: error })
      } else {
        return new ProcessingError(error.message, undefined, { originalError: error })
      }
    }

    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 'Unknown error occurred'
    return new ProcessingError(message, undefined, { originalError: error })
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError, context?: ErrorContext): void {
    const severity = getErrorSeverity(error.statusCode)
    const logData = {
      error: error.toJSON(),
      context,
      severity,
      timestamp: new Date().toISOString(),
    }

    switch (severity) {
      case 'critical':
        logger.error(`CRITICAL ERROR: ${error.message}`, logData)
        break
      case 'high':
        logger.error(`ERROR: ${error.message}`, logData)
        break
      case 'medium':
        logger.warn(`WARNING: ${error.message}`, logData)
        break
      default:
        logger.info(`INFO: ${error.message}`, logData)
    }
  }

  /**
   * Report error to monitoring service
   */
  private reportError(error: AppError, context?: ErrorContext): void {
    monitoring.logError({
      error,
      context: {
        ...context,
        ...error.context,
        errorCode: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      },
      user: context?.userId ? { id: context.userId } : undefined,
      url: context?.url,
      userAgent: context?.userAgent,
    })
  }

  /**
   * Convert AppError to tRPC error
   */
  toTRPCError(error: AppError, customMessage?: string): TRPCError {
    const message = customMessage || error.message

    switch (error.statusCode) {
      case 400:
        return new TRPCError({
          code: 'BAD_REQUEST',
          message,
          cause: error,
        })
      case 401:
        return new TRPCError({
          code: 'UNAUTHORIZED',
          message,
          cause: error,
        })
      case 403:
        return new TRPCError({
          code: 'FORBIDDEN',
          message,
          cause: error,
        })
      case 404:
        return new TRPCError({
          code: 'NOT_FOUND',
          message,
          cause: error,
        })
      case 429:
        return new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message,
          cause: error,
        })
      case 500:
      case 502:
      case 503:
      case 504:
      default:
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isOperationalError(error) 
            ? message 
            : 'An internal server error occurred',
          cause: error,
        })
    }
  }

  /**
   * Convert AppError to HTTP response data
   */
  toHTTPResponse(error: AppError): {
    statusCode: number
    body: {
      error: string
      message: string
      code: string
      details?: any
    }
  } {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.name,
        message: error.message,
        code: error.code,
        details: isOperationalError(error) ? error.context : undefined,
      },
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: AppError): string {
    const userMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTHENTICATION_ERROR: 'Please sign in to continue.',
      AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
      NOT_FOUND_ERROR: 'The requested resource was not found.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      QUOTA_EXCEEDED_ERROR: 'You\'ve reached your usage limit. Consider upgrading your plan.',
      EXTERNAL_SERVICE_ERROR: 'A service is temporarily unavailable. Please try again later.',
      DATABASE_ERROR: 'A database error occurred. Please try again.',
      PROCESSING_ERROR: 'An error occurred while processing your request.',
      NETWORK_ERROR: 'Network connection failed. Please check your internet and try again.',
      TIMEOUT_ERROR: 'The request timed out. Please try again.',
      CONFIGURATION_ERROR: 'A configuration error occurred. Please contact support.',
    }

    return userMessages[error.code] || 'An unexpected error occurred. Please try again.'
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

/**
 * Convenience function for handling errors in tRPC procedures
 */
export function handleTRPCError(
  error: any,
  context?: ErrorContext,
  customMessage?: string
): never {
  const { appError } = errorHandler.handleError(error, { context })
  throw errorHandler.toTRPCError(appError, customMessage)
}

/**
 * Convenience function for handling errors in API routes
 */
export function handleAPIError(
  error: any,
  context?: ErrorContext
): {
  statusCode: number
  body: any
} {
  const { appError } = errorHandler.handleError(error, { context })
  return errorHandler.toHTTPResponse(appError)
}

/**
 * Async error boundary for catching unhandled promise rejections
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const { appError } = errorHandler.handleError(error, { context })
    throw appError
  }
}

/**
 * Error boundary for synchronous operations
 */
export function withSyncErrorHandling<T>(
  operation: () => T,
  context?: ErrorContext
): T {
  try {
    return operation()
  } catch (error) {
    const { appError } = errorHandler.handleError(error, { context })
    throw appError
  }
}