import type { PrismaClient } from '@prisma/client'

/**
 * Dependencies required by summary router
 */
export interface SummaryRouterDependencies {
  db: PrismaClient
  logger: {
    info: (message: string, meta?: any) => void
    error: (message: string, meta?: any) => void
    warn: (message: string, meta?: any) => void
  }
  monitoring?: {
    logBusinessMetric: (metric: string, value: number, metadata?: any) => void
    logError: (error: { error: Error; context?: any }) => void
  }
  security: {
    sanitizeUrl: (url: string) => string
    sanitizeText: (text: string) => string
    containsSuspiciousContent: (content: string) => boolean
    isValidYouTubeVideoId: (id: string) => boolean
  }
  config?: {
    backendUrl?: string
    anonymousUserId?: string
  }
}

/**
 * Context passed to tRPC procedures
 */
export interface SummaryContext {
  prisma: PrismaClient
  userId?: string | null
  headers?: any
}

/**
 * Backend processing payload
 */
export interface BackendProcessingPayload {
  youtube_url: string
  task_id: string
  anonymous: boolean
  summary_id: string
}