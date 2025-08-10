/**
 * Error handling module exports
 * 
 * @module Errors
 * @category Errors
 */

// Error types
export * from './errorTypes'
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  ProcessingError,
  NetworkError,
  TimeoutError,
  isAppError,
  isOperationalError,
  ErrorSeverity,
  getErrorSeverity,
} from './errorTypes'

// Error handler
export * from './errorHandler'
export {
  ErrorHandler,
  errorHandler,
  handleTRPCError,
  handleAPIError,
  withErrorHandling,
  withSyncErrorHandling,
} from './errorHandler'

// Types
export type { ErrorContext, ErrorHandlingOptions } from './errorHandler'