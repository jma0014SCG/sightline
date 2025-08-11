export interface BackendKeyMoment {
  timestamp: string
  insight: string
}

export interface BackendFlashcard {
  question: string
  answer: string
}

export interface BackendQuizQuestion {
  question: string
  answer: string
}

export interface BackendFramework {
  name: string
  description: string
}

export interface BackendPlaybook {
  trigger: string
  action: string
}

export interface BackendNovelIdea {
  insight: string
  score: number
}

export interface BackendInsightEnrichment {
  stats_tools_links?: string[]
  sentiment?: string
  risks_blockers_questions?: string[]
}

export interface BackendAcceleratedLearningPack {
  tldr100: string
  feynman_flashcards?: Array<{ q: string; a: string }>
  glossary?: Array<{ term: string; definition: string }>
  quick_quiz?: Array<{ q: string; a: string }>
  novel_idea_meter?: BackendNovelIdea[]
}

/**
 * UI-specific base summary interface for SummaryViewer component.
 * 
 * This interface defines the core structure expected by the SummaryViewer
 * component, separate from the database model. Uses consistent naming
 * conventions for UI layer and includes all fields needed for rendering.
 * 
 * **Design Notes:**
 * - Separated from Prisma types for better maintainability
 * - Maintains snake_case for consistency with AI backend data
 * - JsonValue fields (keyPoints, metadata) can contain structured data
 * - Date fields are kept as Date objects from database layer
 * 
 * @interface UiSummaryBase
 */
export interface UiSummaryBase {
  id: string
  userId: string
  videoId: string
  videoUrl: string
  videoTitle: string
  channelName: string
  channelId: string
  duration: number
  thumbnailUrl: string | null
  content: string
  synopsis: string | null // Video synopsis from AI processing
  keyPoints: any // JsonValue from Prisma - can be array or object
  metadata: any // JsonValue from Prisma - can be array or object
  createdAt: Date
  updatedAt: Date
}

/**
 * Props interface for SummaryViewer component.
 * 
 * Defines the expected props structure for the SummaryViewer organism component.
 * Uses UiSummaryBase as the foundation and extends with additional snake_case
 * fields that come from AI backend processing.
 * 
 * **Property Categories:**
 * - Core Video Data: videoTitle, channelName, content, duration, etc.
 * - AI-Enhanced Data: key_moments, frameworks, playbooks, etc.
 * - UI State: isStreaming, className for styling
 * 
 * **Naming Convention:**
 * - Core fields: camelCase (matching video metadata)
 * - AI backend fields: snake_case (matching AI service output)
 * 
 * @interface SummaryViewerProps
 */
export interface SummaryViewerProps {
  summary: Partial<UiSummaryBase> & {
    content: string
    videoTitle: string
    channelName: string
    synopsis?: string | null // Video synopsis from AI processing
    keyPoints?: any // JsonValue from Prisma - can be array or object
    duration?: number
    thumbnailUrl?: string | null
    // Extended data from backend - these could come from JsonValue in metadata field
    metadata?: any // JsonValue from Prisma that might contain BackendMetadata
    key_moments?: BackendKeyMoment[]
    frameworks?: BackendFramework[]
    debunked_assumptions?: string[]
    in_practice?: string[]
    playbooks?: BackendPlaybook[]
    insight_enrichment?: BackendInsightEnrichment
    accelerated_learning_pack?: BackendAcceleratedLearningPack
    flashcards?: BackendFlashcard[]
    quiz_questions?: BackendQuizQuestion[]
    glossary?: any[]
    tools?: string[]
    resources?: string[]
  }
  isStreaming?: boolean
  className?: string
} 