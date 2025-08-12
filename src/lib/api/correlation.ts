/**
 * Correlation ID utilities for request tracking across tRPC and FastAPI
 */

import { nanoid } from 'nanoid'

export const CORRELATION_HEADER = 'x-correlation-id'
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Generate a new correlation ID with prefix
 */
export function generateCorrelationId(prefix = 'req'): string {
  return `${prefix}-${nanoid(12)}`
}

/**
 * Extract correlation ID from headers or generate new one
 */
export function getCorrelationId(headers?: Headers | Record<string, string>): string {
  if (!headers) return generateCorrelationId()
  
  if (headers instanceof Headers) {
    return headers.get(CORRELATION_HEADER) || generateCorrelationId()
  }
  
  return headers[CORRELATION_HEADER] || headers['X-Correlation-Id'] || generateCorrelationId()
}

/**
 * Add correlation ID to fetch headers
 */
export function withCorrelationId(
  headers: HeadersInit = {},
  correlationId?: string
): HeadersInit {
  const cid = correlationId || generateCorrelationId()
  
  if (headers instanceof Headers) {
    headers.set(CORRELATION_HEADER, cid)
    return headers
  }
  
  return {
    ...headers,
    [CORRELATION_HEADER]: cid,
  }
}

/**
 * Create a correlation context for a request flow
 */
export interface CorrelationContext {
  correlationId: string
  requestId: string
  parentId?: string
  spanId?: string
  userId?: string
  sessionId?: string
  traceFlags?: Record<string, any>
}

export function createCorrelationContext(
  options: Partial<CorrelationContext> = {}
): CorrelationContext {
  return {
    correlationId: options.correlationId || generateCorrelationId(),
    requestId: options.requestId || generateCorrelationId('req'),
    parentId: options.parentId,
    spanId: options.spanId || generateCorrelationId('span'),
    userId: options.userId,
    sessionId: options.sessionId,
    traceFlags: options.traceFlags || {},
  }
}

/**
 * Storage for correlation context (browser-side)
 */
class CorrelationStore {
  private static instance: CorrelationStore
  private context: CorrelationContext | null = null

  static getInstance(): CorrelationStore {
    if (!CorrelationStore.instance) {
      CorrelationStore.instance = new CorrelationStore()
    }
    return CorrelationStore.instance
  }

  setContext(context: CorrelationContext): void {
    this.context = context
  }

  getContext(): CorrelationContext | null {
    return this.context
  }

  getCurrentCorrelationId(): string {
    return this.context?.correlationId || generateCorrelationId()
  }

  reset(): void {
    this.context = null
  }
}

export const correlationStore = CorrelationStore.getInstance()