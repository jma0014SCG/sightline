import 'server-only'
import type { Summary as PrismaSummary } from '@prisma/client'
import type { UiSummaryBase } from '@/components/organisms/SummaryViewer/SummaryViewer.types'

/**
 * Server-side mapper to convert Prisma camelCase Summary objects
 * to snake_case format expected by SummaryViewer UI component.
 * 
 * This mapper handles the impedance mismatch between database schema
 * conventions (camelCase) and UI component expectations (snake_case).
 * 
 * @module SummaryMappers
 */

/**
 * Extended Prisma Summary type that includes Smart Collections relations
 */
type PrismaSummaryWithRelations = PrismaSummary & {
  categories?: Array<{
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
  }>
  tags?: Array<{
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
  }>
}

/**
 * Safe JSON parsing utility for Prisma Json fields with proper error handling
 * 
 * @param value - The JSON value from Prisma (could be string, object, or null)
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed JSON value or fallback
 */
function parseJsonField<T>(value: any, fallback: T | null = null): T | null {
  // If already parsed (object/array), return as-is
  if (typeof value === 'object' && value !== null) {
    return value as T
  }
  
  // If string, try to parse
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      // Type guard: ensure parsed value is not null
      return parsed !== null ? parsed as T : fallback
    } catch (error) {
      console.warn('Failed to parse JSON field:', error)
      return fallback
    }
  }
  
  // Return fallback for null, undefined, empty string, etc.
  return fallback
}

/**
 * Maps a Prisma Summary database object to the UI-expected format.
 * 
 * Converts camelCase database fields to snake_case UI props and handles
 * JSON field parsing for metadata and keyPoints. Maintains backward
 * compatibility with existing SummaryViewer component expectations.
 * 
 * **Field Mapping:**
 * - `videoId` → `videoId` (unchanged)
 * - `videoUrl` → `videoUrl` (unchanged)  
 * - `videoTitle` → `videoTitle` (unchanged)
 * - `channelName` → `channelName` (unchanged)
 * - `channelId` → `channelId` (unchanged)
 * - `thumbnailUrl` → `thumbnailUrl` (unchanged)
 * - `keyPoints` → `keyPoints` + parsed JSON → snake_case fields
 * - `metadata` → `metadata` + parsed JSON → snake_case fields
 * 
 * **JSON Field Processing:**
 * - Safely parses `keyPoints` and `metadata` JSON fields
 * - Extracts structured AI data (frameworks, playbooks, etc.)
 * - Handles both string JSON and pre-parsed objects
 * - Provides fallbacks for parsing failures
 * 
 * @param dbSummary - Prisma Summary object from database
 * @returns UI-compatible summary object with snake_case props
 * @throws Never throws - provides fallbacks for all parsing errors
 * 
 * @example
 * ```typescript
 * const dbSummary = await ctx.prisma.summary.findFirst({ ... })
 * const uiSummary = mapDbSummaryToViewer(dbSummary)
 * return uiSummary // Ready for SummaryViewer component
 * ```
 */
export function mapDbSummaryToViewer(
  dbSummary: PrismaSummaryWithRelations
): Partial<UiSummaryBase> & {
  content: string
  videoTitle: string
  channelName: string
  synopsis?: string | null
  keyPoints?: any
  duration?: number
  thumbnailUrl?: string | null
  metadata?: any
  // Extended data from backend - snake_case format
  key_moments?: any[]
  frameworks?: any[]
  debunked_assumptions?: string[]
  in_practice?: string[]
  playbooks?: any[]
  insight_enrichment?: any
  accelerated_learning_pack?: any
  flashcards?: any[]
  quiz_questions?: any[]
  glossary?: any[]
  tools?: string[]
  resources?: string[]
} {
  // Parse JSON fields safely
  const parsedKeyPoints = parseJsonField(dbSummary.keyPoints, [])
  const parsedMetadata = parseJsonField(dbSummary.metadata, {})

  // Base mapping of core fields (keeping existing naming)
  const baseMapped = {
    id: dbSummary.id,
    userId: dbSummary.userId,
    videoId: dbSummary.videoId,
    videoUrl: dbSummary.videoUrl,
    videoTitle: dbSummary.videoTitle,
    channelName: dbSummary.channelName,
    channelId: dbSummary.channelId,
    duration: dbSummary.duration,
    thumbnailUrl: dbSummary.thumbnailUrl,
    content: dbSummary.content,
    synopsis: dbSummary.synopsis,
    keyPoints: parsedKeyPoints,
    metadata: parsedMetadata,
    createdAt: dbSummary.createdAt,
    updatedAt: dbSummary.updatedAt,
  }

  // Extract structured AI data from metadata/keyPoints into snake_case format
  // This maintains compatibility with existing SummaryViewer prop expectations
  const aiDataExtracted = {
    key_moments: (parsedMetadata as any)?.key_moments || (parsedKeyPoints as any)?.key_moments || null,
    frameworks: (parsedMetadata as any)?.frameworks || (parsedKeyPoints as any)?.frameworks || null,
    debunked_assumptions: (parsedMetadata as any)?.debunked_assumptions || (parsedKeyPoints as any)?.debunked_assumptions || null,
    in_practice: (parsedMetadata as any)?.in_practice || (parsedKeyPoints as any)?.in_practice || null,
    playbooks: (parsedMetadata as any)?.playbooks || (parsedKeyPoints as any)?.playbooks || null,
    insight_enrichment: (parsedMetadata as any)?.insight_enrichment || (parsedKeyPoints as any)?.insight_enrichment || null,
    accelerated_learning_pack: (parsedMetadata as any)?.accelerated_learning_pack || (parsedKeyPoints as any)?.accelerated_learning_pack || null,
    flashcards: (parsedMetadata as any)?.flashcards || (parsedKeyPoints as any)?.flashcards || null,
    quiz_questions: (parsedMetadata as any)?.quiz_questions || (parsedKeyPoints as any)?.quiz_questions || null,
    glossary: (parsedMetadata as any)?.glossary || (parsedKeyPoints as any)?.glossary || null,
    tools: (parsedMetadata as any)?.tools || (parsedKeyPoints as any)?.tools || null,
    resources: (parsedMetadata as any)?.resources || (parsedKeyPoints as any)?.resources || null,
  }

  // Combine base fields with extracted AI data
  return {
    ...baseMapped,
    ...aiDataExtracted,
  }
}