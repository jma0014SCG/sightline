import { z } from 'zod'

/**
 * YouTube URL validation patterns
 */
export const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
] as const

/**
 * Constants
 */
export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

/**
 * Validation schemas for summary router endpoints
 */
export const summarySchemas = {
  /**
   * Schema for authenticated summary creation
   */
  create: z.object({
    url: z.string()
      .url('Invalid URL format')
      .min(1, 'URL is required')
      .max(2048, 'URL too long')
      .refine((url) => {
        return YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url))
      }, 'Only YouTube URLs are allowed'),
  }),

  /**
   * Schema for anonymous summary creation
   */
  createAnonymous: z.object({
    url: z.string()
      .url('Invalid URL format')
      .min(1, 'URL is required')
      .max(2048, 'URL too long')
      .refine((url) => {
        return YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(url))
      }, 'Only YouTube URLs are allowed'),
    browserFingerprint: z.string()
      .min(1, 'Browser fingerprint is required')
      .max(255, 'Browser fingerprint too long'),
  }),

  /**
   * Schema for health check response
   */
  health: z.object({
    ok: z.boolean(),
    layer: z.literal('trpc')
  }),

  /**
   * Schema for video ID extraction
   */
  videoId: z.string()
    .length(11, 'YouTube video ID must be 11 characters')
    .regex(/^[a-zA-Z0-9_-]{11}$/, 'Invalid YouTube video ID format'),

  /**
   * Schema for task ID generation
   */
  taskId: z.string()
    .min(10, 'Task ID too short')
    .max(50, 'Task ID too long'),

  /**
   * Schema for getById input
   */
  getById: z.object({
    id: z.string()
      .cuid('Invalid summary ID format - must be a valid CUID'),
  }),

  /**
   * Schema for update summary input
   */
  update: z.object({
    id: z.string()
      .min(1, 'Summary ID is required')
      .max(255, 'Summary ID too long'),
    data: z.object({
      videoTitle: z.string().max(500, 'Title too long').optional(),
      userNotes: z.string().max(10000, 'Notes too long').optional(),
      isFavorite: z.boolean().optional(),
      rating: z.number().int().min(1).max(5).optional(),
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update'
    }),
  }),

  /**
   * Schema for delete summary input
   */
  delete: z.object({
    id: z.string()
      .min(1, 'Summary ID is required')
      .max(255, 'Summary ID too long'),
  }),

  /**
   * Schema for claiming anonymous summaries
   */
  claimAnonymous: z.object({
    browserFingerprint: z.string()
      .min(1, 'Browser fingerprint is required')
      .max(255, 'Browser fingerprint too long'),
  }),

  /**
   * Schema for getting anonymous summaries
   */
  getAnonymous: z.object({
    browserFingerprint: z.string()
      .min(1, 'Browser fingerprint is required')
      .max(255, 'Browser fingerprint too long'),
  }),

  /**
   * Schema for summary response
   */
  summaryResponse: z.object({
    id: z.string(),
    userId: z.string(),
    url: z.string(),
    videoId: z.string(),
    title: z.string(),
    content: z.string(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    browserFingerprint: z.string().optional(),
    taskId: z.string().nullable(),
    isAnonymous: z.boolean(),
    canSave: z.boolean(),
    task_id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
} as const

/**
 * Type exports for TypeScript inference
 */
export type CreateInput = z.infer<typeof summarySchemas.create>
export type CreateAnonymousInput = z.infer<typeof summarySchemas.createAnonymous>
export type GetByIdInput = z.infer<typeof summarySchemas.getById>
export type UpdateInput = z.infer<typeof summarySchemas.update>
export type DeleteInput = z.infer<typeof summarySchemas.delete>
export type ClaimAnonymousInput = z.infer<typeof summarySchemas.claimAnonymous>
export type GetAnonymousInput = z.infer<typeof summarySchemas.getAnonymous>
export type HealthResponse = z.infer<typeof summarySchemas.health>
export type SummaryResponse = z.infer<typeof summarySchemas.summaryResponse>