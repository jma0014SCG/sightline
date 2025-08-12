/**
 * Structured logging system with correlation ID support
 */

import { correlationStore } from './api/correlation'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  correlationId?: string
  requestId?: string
  userId?: string
  taskId?: string
  stage?: string
  metadata?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

export interface LoggerOptions {
  component: string
  correlationId?: string
  requestId?: string
  userId?: string
  metadata?: Record<string, any>
}

class StructuredLogger {
  private component: string
  private baseMetadata: Record<string, any>
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private isDevelopment = process.env.NODE_ENV === 'development'

  constructor(options: LoggerOptions) {
    this.component = options.component
    this.baseMetadata = {
      correlationId: options.correlationId,
      requestId: options.requestId,
      userId: options.userId,
      ...options.metadata,
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    const context = correlationStore.getContext()
    
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      correlationId: this.baseMetadata.correlationId || context?.correlationId,
      requestId: this.baseMetadata.requestId || context?.requestId,
      userId: this.baseMetadata.userId || context?.userId,
      metadata: {
        ...this.baseMetadata,
        ...metadata,
      },
    }
  }

  private log(entry: LogEntry): void {
    // Store in memory for debug panel
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Format for console
    const consoleFormat = this.isDevelopment
      ? this.formatForDevelopment(entry)
      : this.formatForProduction(entry)

    // Output to console
    switch (entry.level) {
      case 'debug':
        console.debug(consoleFormat, entry.metadata)
        break
      case 'info':
        console.info(consoleFormat, entry.metadata)
        break
      case 'warn':
        console.warn(consoleFormat, entry.metadata)
        break
      case 'error':
      case 'fatal':
        console.error(consoleFormat, entry.metadata, entry.error)
        break
    }

    // Send to monitoring service if configured
    if (typeof window !== 'undefined' && window.logCollector) {
      window.logCollector.collect(entry)
    }
  }

  private formatForDevelopment(entry: LogEntry): string {
    const emoji = this.getEmoji(entry.level)
    const cid = entry.correlationId ? ` [${entry.correlationId}]` : ''
    return `${emoji} [${entry.component}]${cid} ${entry.message}`
  }

  private formatForProduction(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      metadata: entry.metadata,
    })
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍'
      case 'info': return '📝'
      case 'warn': return '⚠️'
      case 'error': return '❌'
      case 'fatal': return '💀'
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry('debug', message, metadata))
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry('info', message, metadata))
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry('warn', message, metadata))
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, metadata)
    
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      }
    } else if (error) {
      entry.error = {
        message: String(error),
      }
    }
    
    this.log(entry)
  }

  fatal(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('fatal', message, metadata)
    
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      }
    }
    
    this.log(entry)
  }

  /**
   * Log a stage transition for progress tracking
   */
  stage(stage: string, progress: number, metadata?: Record<string, any>): void {
    this.info(`Stage: ${stage}`, {
      stage,
      progress,
      ...metadata,
    })
  }

  /**
   * Create a child logger with additional context
   */
  child(options: Partial<LoggerOptions>): StructuredLogger {
    return new StructuredLogger({
      component: options.component || `${this.component}.${options.component}`,
      correlationId: options.correlationId || this.baseMetadata.correlationId,
      requestId: options.requestId || this.baseMetadata.requestId,
      userId: options.userId || this.baseMetadata.userId,
      metadata: {
        ...this.baseMetadata,
        ...options.metadata,
      },
    })
  }

  /**
   * Get all logs (for debug panel)
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions | string): StructuredLogger {
  if (typeof options === 'string') {
    return new StructuredLogger({ component: options })
  }
  return new StructuredLogger(options)
}

/**
 * Global logger instance for general use
 */
export const logger = createLogger('app')

// Extend window interface for log collector
declare global {
  interface Window {
    logCollector?: {
      collect(entry: LogEntry): void
    }
  }
}

/**
 * Log collector for aggregating logs (debug panel, monitoring, etc.)
 */
class LogCollector {
  private listeners: ((entry: LogEntry) => void)[] = []
  private buffer: LogEntry[] = []
  private maxBufferSize = 5000

  collect(entry: LogEntry): void {
    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    this.listeners.forEach(listener => {
      try {
        listener(entry)
      } catch (error) {
        console.error('Log listener error:', error)
      }
    })
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer]
  }

  clear(): void {
    this.buffer = []
  }
}

// Initialize log collector in browser
if (typeof window !== 'undefined') {
  window.logCollector = new LogCollector()
}

export function getLogCollector(): LogCollector | undefined {
  if (typeof window !== 'undefined') {
    return window.logCollector as LogCollector
  }
  return undefined
}