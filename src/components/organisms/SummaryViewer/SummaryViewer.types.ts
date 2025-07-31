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

// Define Summary type based on Prisma model
export interface Summary {
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
  keyPoints: any
  metadata: any
  createdAt: Date
  updatedAt: Date
}

export interface SummaryViewerProps {
  summary: Partial<Summary> & {
    content: string
    videoTitle: string
    channelName: string
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