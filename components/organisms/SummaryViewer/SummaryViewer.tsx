'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Download, Share2, Check, Clock, Calendar, ChevronDown, ChevronUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Summary } from '@prisma/client'

// Backend data structure interfaces
interface BackendKeyMoment {
  timestamp: string
  insight: string
}

interface BackendMetadata {
  title?: string
  channel?: string
  duration?: string
  speakers?: string[]
  synopsis?: string
  tone?: string
}

interface BackendFlashcard {
  question: string
  answer: string
}

interface BackendQuizQuestion {
  question: string
  answer: string
}

interface SummaryViewerProps {
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
    flashcards?: BackendFlashcard[]
    quiz_questions?: BackendQuizQuestion[]
    glossary?: any[]
    tools?: string[]
    resources?: string[]
  }
  isStreaming?: boolean
  className?: string
}


interface KeyMoment {
  timestamp: string
  insight: string
}

interface KnowledgeCard {
  question: string
  answer: string
}

interface AcceleratedLearningPack {
  tldr100: string
  feynmanFlashcards: string[]
  glossary: string[]
  quickQuiz: { question: string; answer: string }[]
  novelIdeaMeter: { idea: string; score: number }[]
}

interface ParsedContent {
  videoContext: {
    title: string
    speakers: string[]
    duration: string
    channel: string
    synopsis: string
  }
  tldr: string
  keyMoments: KeyMoment[]
  insights: string
  resources: {
    tools: string[]
    resources: string[]
  }
  summaryAndCTA: string
  insightEnrichment: string
  knowledgeCards: KnowledgeCard[]
  acceleratedLearningPack: AcceleratedLearningPack
}

export function SummaryViewer({ 
  summary, 
  isStreaming = false,
  className 
}: SummaryViewerProps) {
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('tldr')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const handleCopy = async (content?: string) => {
    try {
      const textToCopy = content || summary.content
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([summary.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${summary.videoTitle?.replace(/[^a-z0-9]/gi, '_')}_summary.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }


  // Helper functions to extract structured data from JSON first, then metadata

  const getStructuredFlashcards = (): BackendFlashcard[] => {
    // Check direct props first
    if (summary.flashcards && Array.isArray(summary.flashcards)) {
      return summary.flashcards
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.flashcards && Array.isArray(metadata.flashcards)) {
        return metadata.flashcards
      }
    }
    return []
  }

  const getStructuredQuizQuestions = (): BackendQuizQuestion[] => {
    // Check direct props first
    if (summary.quiz_questions && Array.isArray(summary.quiz_questions)) {
      return summary.quiz_questions
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.quiz_questions && Array.isArray(metadata.quiz_questions)) {
        return metadata.quiz_questions
      }
    }
    return []
  }

  const getStructuredGlossary = (): any[] => {
    // Check direct props first
    if (summary.glossary && Array.isArray(summary.glossary)) {
      return summary.glossary
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.glossary && Array.isArray(metadata.glossary)) {
        return metadata.glossary
      }
    }
    return []
  }

  const getStructuredKeyMoments = (): BackendKeyMoment[] => {
    // Check direct props first
    if (summary.key_moments && Array.isArray(summary.key_moments)) {
      return summary.key_moments
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.key_moments && Array.isArray(metadata.key_moments)) {
        return metadata.key_moments
      }
    }
    return []
  }

  const getTools = () => {
    // Check direct props first
    if (summary.tools && Array.isArray(summary.tools)) {
      return summary.tools
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.tools && Array.isArray(metadata.tools)) {
        return metadata.tools
      }
    }
    return []
  }

  const getResources = () => {
    // Check direct props first
    if (summary.resources && Array.isArray(summary.resources)) {
      return summary.resources
    }
    // Check metadata field for structured Gumloop data
    if (summary.metadata && typeof summary.metadata === 'object') {
      const metadata = summary.metadata as any
      if (metadata.resources && Array.isArray(metadata.resources)) {
        return metadata.resources
      }
    }
    return []
  }


  // Extract structured data first, fallback to parsing if not available
  const structuredFlashcards = getStructuredFlashcards()
  const structuredQuizQuestions = getStructuredQuizQuestions()
  const structuredGlossary = getStructuredGlossary()
  const structuredKeyMoments = getStructuredKeyMoments()
  const structuredTools = getTools()
  const structuredResources = getResources()

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      // Focus the section header for screen reader users
      const header = element.querySelector('h2')
      if (header && header instanceof HTMLElement) {
        header.setAttribute('tabindex', '-1')
        header.focus()
        // Remove tabindex after focus
        setTimeout(() => header.removeAttribute('tabindex'), 100)
      }
    }
  }

  // Enhanced content parsing utilities
  const parseMarkdownSections = (content: string): Map<string, string> => {
    const sections = new Map<string, string>()
    const lines = content.split('\n')
    let currentSection = ''
    let currentContent: string[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detect section headers (## or ###) - handle the exact format from Gumloop
      const headerMatch = trimmedLine.match(/^#{2,3}\s+(.+)/)
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          const sectionKey = currentSection.toLowerCase().trim()
          sections.set(sectionKey, currentContent.join('\n').trim())
        }
        
        // Start new section - normalize the section name
        let sectionName = headerMatch[1].trim()
        
        // Handle specific Gumloop section formats and normalize keys
        if (sectionName.match(/^\d{2}:\d{2}/)) {
          // Handle sections like "00:00 Rapid TL;DR (97 words)" → "00:00 rapid tl;dr"
          sectionName = sectionName.toLowerCase().replace(/\([^)]*\)/, '').trim()
        } else {
          sectionName = sectionName.toLowerCase()
        }
        
        // Additional key normalization for consistent lookup
        if (sectionName.includes('knowledge cards')) {
          sectionName = 'knowledge cards'
        } else if (sectionName.includes('accelerated') && sectionName.includes('learning')) {
          sectionName = 'accelerated-learning pack'
        } else if (sectionName.includes('key moments')) {
          sectionName = 'key moments (timestamp → insight)'
        } else if (sectionName.includes('key concepts') && sectionName.includes('insights')) {
          sectionName = 'key concepts & insights'
        } else if (sectionName.includes('data') && sectionName.includes('tools') && sectionName.includes('resources')) {
          sectionName = 'data, tools & resources'
        } else if (sectionName.includes('summary') && sectionName.includes('calls-to-action')) {
          sectionName = 'summary & calls-to-action'
        } else if (sectionName.includes('insight enrichment')) {
          sectionName = 'insight enrichment'
        }
        
        currentSection = sectionName
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }
    
    // Save last section
    if (currentSection) {
      const sectionKey = currentSection.toLowerCase().trim()
      sections.set(sectionKey, currentContent.join('\n').trim())
    }
    
    // Debug: Log parsed section keys (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Parsed section keys:', Array.from(sections.keys()))
    }
    
    return sections
  }


  const parseVideoContext = (sections: Map<string, string>, backendMetadata: BackendMetadata | null) => {
    const contextSection = sections.get('video context')
    let title = '', speakers: string[] = [], duration = '', channel = '', synopsis = ''
    
    if (contextSection) {
      // Parse each field from the Video Context section
      const titleMatch = contextSection.match(/\*\*Title\*\*:\s*(.+?)(?=\n|$)/i)
      if (titleMatch) title = titleMatch[1].trim()
      
      const speakersMatch = contextSection.match(/\*\*Speakers?\*\*:\s*(.+?)(?=\n|$)/i)
      if (speakersMatch) {
        speakers = speakersMatch[1].split(',').map(s => s.trim())
      }
      
      const durationMatch = contextSection.match(/\*\*Duration\*\*:\s*(.+?)(?=\n|$)/i)
      if (durationMatch) duration = durationMatch[1].trim()
      
      const channelMatch = contextSection.match(/\*\*Channel\*\*:\s*(.+?)(?=\n|$)/i)
      if (channelMatch) channel = channelMatch[1].trim()
      
      const synopsisMatch = contextSection.match(/\*\*Synopsis\*\*:\s*(.+?)(?=\n|$)/i)
      if (synopsisMatch) synopsis = synopsisMatch[1].trim()
    }
    
    // Fallback to backend metadata if available
    return {
      title: title || backendMetadata?.title || '',
      speakers: speakers.length > 0 ? speakers : (backendMetadata?.speakers || []),
      duration: duration || backendMetadata?.duration || '',
      channel: channel || backendMetadata?.channel || '',
      synopsis: synopsis || backendMetadata?.synopsis || ''
    }
  }

  const extractBackendMetadata = (metadata: any): BackendMetadata | null => {
    if (!metadata || typeof metadata !== 'object') return null
    
    try {
      // Handle if metadata contains structured gumloop response data
      if (metadata.title || metadata.channel || metadata.speakers || metadata.synopsis) {
        return {
          title: metadata.title,
          channel: metadata.channel,
          duration: metadata.duration,
          speakers: Array.isArray(metadata.speakers) ? metadata.speakers : [],
          synopsis: metadata.synopsis,
          tone: metadata.tone
        }
      }
    } catch (error) {
      console.warn('Error extracting backend metadata:', error)
    }
    
    return null
  }

  const parseKnowledgeCards = (sections: Map<string, string>): KnowledgeCard[] => {
    // Use structured flashcards first if available
    if (structuredFlashcards.length > 0) {
      return structuredFlashcards.map(card => ({
        question: card.question,
        answer: card.answer
      }))
    }

    // Fallback to parsing from markdown content
    let knowledgeCardsSection = sections.get('knowledge cards')
    if (!knowledgeCardsSection) {
      // Check for variations
      const entries = Array.from(sections.entries())
      for (const [key, value] of entries) {
        if (key.includes('knowledge') && key.includes('card')) {
          knowledgeCardsSection = value
          break
        }
      }
    }
    
    const cards: KnowledgeCard[] = []
    
    if (knowledgeCardsSection) {
      const lines = knowledgeCardsSection.split('\n')
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Match format: 1. **Q:** What is a self-liquidating offer? **A:** Front-end sale that covers ad cost.
        const cardMatch = trimmedLine.match(/^\d+\.\s*\*\*Q:\*\*\s*(.+?)\s*\*\*A:\*\*\s*(.+)$/i)
        if (cardMatch) {
          const question = cardMatch[1].trim()
          const answer = cardMatch[2].trim()
          if (question && answer) {
            cards.push({ question, answer })
          }
        }
      }
    }
    
    return cards
  }

  const parseAcceleratedLearningPack = (sections: Map<string, string>, tldr: string): AcceleratedLearningPack => {
    // Don't include tldr100 since TL;DR is already shown in its own section
    const tldr100 = ''
    
    // Use structured data first if available
    let feynmanFlashcards: string[] = []
    let glossary: string[] = []
    let quickQuiz: { question: string; answer: string }[] = []
    let novelIdeaMeter: { idea: string; score: number }[] = []

    // Use structured quiz questions
    if (structuredQuizQuestions.length > 0) {
      quickQuiz = structuredQuizQuestions.map(q => ({
        question: q.question,
        answer: q.answer
      }))
    }

    // Use structured glossary if available
    if (structuredGlossary.length > 0) {
      glossary = structuredGlossary.map(term => {
        if (typeof term === 'string') return term
        if (term && typeof term === 'object' && term.term) return term.term
        return String(term)
      })
    }

    // Parse from content - look for the exact section format
    let learningPackSection = sections.get('accelerated-learning pack')
    if (!learningPackSection) {
      // Check for variations with different punctuation or casing
      const entries = Array.from(sections.entries())
      for (const [key, value] of entries) {
        if (key.includes('accelerated') && key.includes('learning')) {
          learningPackSection = value
          break
        }
      }
    }
    
    if (learningPackSection) {
      const lines = learningPackSection.split('\n')
      let currentSubsection = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Detect subsections with the exact format from your example
        if (trimmedLine.includes('TL;DR-100') || trimmedLine.includes('TL:DR-100')) {
          currentSubsection = 'tldr100'
        } else if (trimmedLine.includes('Feynman Flashcards')) {
          currentSubsection = 'flashcards'
        } else if (trimmedLine.includes('Glossary')) {
          currentSubsection = 'glossary'
        } else if (trimmedLine.includes('Quick Quiz')) {
          currentSubsection = 'quiz'
        } else if (trimmedLine.includes('Novel-Idea Meter')) {
          currentSubsection = 'meter'
        } else if (currentSubsection) {
          // Parse content based on current subsection
          if (currentSubsection === 'flashcards' && trimmedLine.match(/^\d+\./)) {
            // Format: 1. Funnel vs Website – explain to a 10-year-old.
            const flashcard = trimmedLine.replace(/^\d+\.\s*/, '').trim()
            if (flashcard) {
              feynmanFlashcards.push(flashcard)
            }
          } else if (currentSubsection === 'glossary' && !trimmedLine.startsWith('–') && !trimmedLine.startsWith('•') && trimmedLine.length > 0) {
            // Format: AOV, Bump, OTO, ROAS, SLO, Lead Magnet, Webinar, Evergreen, Opt-In, Road-Map Call, Breakeven, CTA, Value Ladder, CAC, Upsell
            if (!trimmedLine.match(/^\d+\s*terms?/)) { // Skip term count lines
              const terms = trimmedLine.split(',').map(term => term.trim()).filter(term => term && term.length > 0)
              if (terms.length > 0) {
                glossary.push(...terms)
              }
            }
          } else if (currentSubsection === 'quiz' && trimmedLine.match(/^\d+\./)) {
            // Format: 1. What % of opt-ins attended Courtney's webinar? (≈ 50 %)
            const parts = trimmedLine.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/)
            if (parts) {
              const question = parts[1].trim()
              const answer = parts[2].trim()
              if (question && answer) {
                quickQuiz.push({ question, answer })
              }
            }
          } else if (currentSubsection === 'meter') {
            // Format: • Self-Liquidating Funnel – 5
            const meterMatch = trimmedLine.match(/^[•·]\s*(.+?)\s*[–-]\s*(\d+)/)
            if (meterMatch) {
              const idea = meterMatch[1].trim()
              const score = parseInt(meterMatch[2], 10)
              if (idea && !isNaN(score)) {
                novelIdeaMeter.push({ idea, score })
              }
            }
          }
        }
      }
    }
    
    return {
      tldr100,
      feynmanFlashcards,
      glossary,
      quickQuiz,
      novelIdeaMeter
    }
  }

  const parseContent = (summary: SummaryViewerProps['summary']): ParsedContent => {
    const sections = parseMarkdownSections(summary.content)
    const backendMetadata = extractBackendMetadata(summary.metadata)
    
    // Parse Video Context - look for exact section name
    const videoContext = parseVideoContext(sections, backendMetadata)
    
    // Extract TL;DR - look for sections starting with timestamp format
    const tldrSection = sections.get('00:00 rapid tl;dr') ||
                       sections.get('rapid tl;dr') || 
                       sections.get('tl;dr') || 
                       sections.get('00:00 rapid tl;dr (97 words)') ||
                       // Find section that contains "00:00" in key
                       Array.from(sections.entries()).find(([key]) => 
                         key.includes('00:00') && key.toLowerCase().includes('tl;dr')
                       )?.[1]
    const tldr = tldrSection || backendMetadata?.synopsis || videoContext.synopsis
    
    // Extract key moments - look for "key moments (timestamp → insight)" section
    let keyMoments: KeyMoment[] = []
    
    // Use structured key moments if available
    if (structuredKeyMoments.length > 0) {
      keyMoments = structuredKeyMoments.map(moment => ({
        timestamp: moment.timestamp,
        insight: moment.insight
      }))
    }
    // Look for the specific Key Moments section format
    else {
      const keyMomentsSection = sections.get('key moments (timestamp → insight)') ||
                               sections.get('key moments') ||
                               (() => {
                                 const entries = Array.from(sections.entries())
                                 for (const [key, value] of entries) {
                                   if (key.toLowerCase().includes('key moments')) {
                                     return value
                                   }
                                 }
                                 return undefined
                               })()
      
      if (keyMomentsSection) {
        const lines = keyMomentsSection.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()
          // Match format: – **03:25** Launch data: *"$280 K upfront, likely $300 K more on the back end."*
          const momentMatch = trimmedLine.match(/^[–\-•]\s*\*\*([^*]+)\*\*\s*(.+)$/)
          if (momentMatch) {
            const timestamp = momentMatch[1].trim()
            const insight = momentMatch[2].trim()
            if (insight && insight.length > 5) {
              keyMoments.push({ timestamp, insight })
            }
          }
        }
      }
    }
    
    // Fallback: if no key moments found, create some from key points
    if (keyMoments.length === 0 && summary.keyPoints) {
      const keyPointsArray = Array.isArray(summary.keyPoints) 
        ? summary.keyPoints 
        : typeof summary.keyPoints === 'string' 
        ? [summary.keyPoints] 
        : []
      
      keyMoments = keyPointsArray.slice(0, 5).map((point, index) => ({
        timestamp: `${String(index * 3 + 2).padStart(2, '0')}:${String(index * 15 + 15).padStart(2, '0')}`,
        insight: String(point)
      }))
    }
    
    // Extract main insights content
    const insightsSection = sections.get('key concepts & insights') || 
                           sections.get('key insights') || 
                           sections.get('insights')
    const insights = insightsSection || summary.content
    
    // Extract resources from structured data first, then fallback to parsing
    let tools = structuredTools
    let resources = structuredResources
    
    // Look for "Data, Tools & Resources" section specifically
    if (tools.length === 0 && resources.length === 0) {
      const resourcesSection = sections.get('data, tools & resources')
      if (resourcesSection) {
        const lines = resourcesSection.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          // Match format: – ClickFunnels 2.0 (pages, A/B stats)
          if (trimmed.startsWith('–') || trimmed.startsWith('-')) {
            const item = trimmed.replace(/^[–\-]\s*/, '').trim()
            if (item && item.length > 0) {
              // All items go to tools for this format
              tools.push(item)
            }
          }
        }
      }
    }
    
    // Extract Summary and Calls-to-Action
    const summaryAndCTA = sections.get('summary & calls-to-action') || 
                         sections.get('summary and calls-to-action') || ''
    
    // Extract Insight Enrichment
    const insightEnrichment = sections.get('insight enrichment') || ''
    
    // Parse Knowledge Cards
    const knowledgeCards = parseKnowledgeCards(sections)
    
    // Parse Accelerated Learning Pack
    const acceleratedLearningPack = parseAcceleratedLearningPack(sections, tldr)
    
    return {
      videoContext,
      tldr,
      keyMoments,
      insights,
      resources: { tools, resources },
      summaryAndCTA,
      insightEnrichment,
      knowledgeCards,
      acceleratedLearningPack
    }
  }

  const parsedContent = parseContent(summary)

  const navigationItems = [
    { id: 'tldr', label: 'TL;DR', icon: '⚡' },
    { id: 'key-moments', label: 'Key Moments', icon: '🎯' },
    { id: 'insights', label: 'Insights', icon: '💡' },
    { id: 'resources', label: 'Resources', icon: '🔗' },
    { id: 'summary-cta', label: 'Summary & CTA', icon: '📋' },
    { id: 'enrichment', label: 'Enrichment', icon: '🌟' },
    { id: 'knowledge-cards', label: 'Knowledge Cards', icon: '🧠' },
    { id: 'learning', label: 'Learning Pack', icon: '📚' }
  ]

  return (
    <article className={cn("max-w-4xl mx-auto bg-white px-4 sm:px-6 lg:px-8", className)} aria-label="Video summary">
      {/* Video Context Card */}
      <header className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8" role="banner">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Thumbnail */}
          {summary.thumbnailUrl && (
            <div className="flex-shrink-0 w-full sm:w-auto">
              <img
                src={summary.thumbnailUrl}
                alt={summary.videoTitle}
                className="w-full sm:w-32 h-48 sm:h-20 rounded-lg object-cover border border-gray-200"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
              {summary.videoTitle}
            </h1>
            
            {/* Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
              {parsedContent.videoContext.speakers && parsedContent.videoContext.speakers.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{parsedContent.videoContext.speakers.join(', ')}</span>
                </div>
              )}
              {summary.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{formatDuration(summary.duration)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Channel: {summary.channelName}</span>
              </div>
            </div>
            
            {/* Synopsis */}
            {parsedContent.videoContext.synopsis && (
              <p className="text-gray-700 italic leading-relaxed text-sm sm:text-base">
                {parsedContent.videoContext.synopsis}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleCopy()}
              className={cn(
                "flex-1 sm:flex-none rounded-lg p-2.5 text-gray-500 hover:bg-white hover:shadow-sm",
                "hover:text-gray-700 focus:outline-none focus:ring-2",
                "focus:ring-blue-500 focus:ring-offset-2 transition-all min-h-[44px] min-w-[44px]"
              )}
              title="Copy entire summary"
              aria-label="Copy entire summary"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-600 mx-auto" />
              ) : (
                <Copy className="h-5 w-5 mx-auto" />
              )}
            </button>
            
            <button
              onClick={handleDownload}
              className={cn(
                "flex-1 sm:flex-none rounded-lg p-2.5 text-gray-500 hover:bg-white hover:shadow-sm",
                "hover:text-gray-700 focus:outline-none focus:ring-2",
                "focus:ring-blue-500 focus:ring-offset-2 transition-all min-h-[44px] min-w-[44px]"
              )}
              title="Download as Markdown"
              aria-label="Download as Markdown"
            >
              <Download className="h-5 w-5 mx-auto" />
            </button>
            
            <button
              className={cn(
                "flex-1 sm:flex-none rounded-lg p-2.5 text-gray-500 hover:bg-white hover:shadow-sm",
                "hover:text-gray-700 focus:outline-none focus:ring-2",
                "focus:ring-blue-500 focus:ring-offset-2 transition-all min-h-[44px] min-w-[44px]"
              )}
              title="Share summary"
              aria-label="Share summary"
            >
              <Share2 className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Navigation Bar */}
      <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 mb-6 sm:mb-8" role="navigation" aria-label="Summary sections">
        <div className="flex items-center gap-1 px-2 py-3 overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px]",
                activeSection === item.id
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
              )}
              aria-label={`Jump to ${item.label} section`}
            >
              <span className="text-base sm:text-lg">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main role="main">
        {/* Rapid TL;DR Section */}
        <section id="tldr" className="mb-6 sm:mb-8" aria-labelledby="tldr-heading">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">⚡</span>
                <span>00:00 Rapid TL;DR</span>
              </div>
              <span className="text-xs sm:text-sm font-normal text-gray-500">(≤100 words)</span>
            </h2>
            <button
              onClick={() => handleCopy(parsedContent.tldr)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-all min-h-[40px] min-w-[40px] flex-shrink-0"
              title="Copy TL;DR"
              aria-label="Copy TL;DR section"
            >
              <Copy className="h-4 w-4 mx-auto" />
            </button>
          </div>
          <div className="text-gray-800 leading-relaxed text-sm sm:text-base">
            {parsedContent.tldr || 'A concise summary of the key takeaways from this video content.'}
          </div>
        </div>
      </section>

      {/* Key Moments Section */}
      <section id="key-moments" className="mb-6 sm:mb-8" aria-labelledby="key-moments-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 id="key-moments-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">🎯</span>
              <span className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Key Moments</span>
                <span className="text-xs sm:text-sm font-normal text-gray-500">(Timestamp → Insight)</span>
              </span>
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {parsedContent.keyMoments.map((moment, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-mono font-medium bg-blue-100 text-blue-800">
                      {moment.timestamp}
                    </span>
                    <button
                      onClick={() => handleCopy(moment.insight)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-all sm:hidden min-h-[36px] min-w-[36px]"
                      title="Copy insight"
                      aria-label="Copy insight"
                    >
                      <Copy className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-base">{moment.insight}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(moment.insight)}
                    className="hidden sm:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-all flex-shrink-0"
                    title="Copy insight"
                    aria-label="Copy insight"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Concepts & Insights Section */}
      <section id="insights" className="mb-6 sm:mb-8" aria-labelledby="insights-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 id="insights-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-green-600">💡</span>
              Key Concepts & Insights
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className={cn(
              "prose prose-gray max-w-none",
              "prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base",
              "prose-p:text-gray-700 prose-p:leading-relaxed",
              "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
              "prose-code:rounded prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1",
              "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg",
              "prose-li:text-gray-700",
              "prose-ul:my-4 prose-ol:my-4",
              isStreaming && "animate-pulse"
            )}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {parsedContent.insights}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </section>

      {/* Data, Tools & Resources Section */}
      <section id="resources" className="mb-6 sm:mb-8" aria-labelledby="resources-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 id="resources-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-purple-600">🔗</span>
              Data, Tools & Resources
            </h2>
            <button
              onClick={() => toggleSection('resources')}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] min-w-[44px]"
              aria-label={collapsedSections.has('resources') ? 'Expand resources section' : 'Collapse resources section'}
            >
              {collapsedSections.has('resources') ? (
                <ChevronDown className="h-5 w-5 mx-auto" />
              ) : (
                <ChevronUp className="h-5 w-5 mx-auto" />
              )}
            </button>
          </div>
          {!collapsedSections.has('resources') && (
            <div className="p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Tools Mentioned</h4>
                  <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
                    {parsedContent.resources.tools.length > 0 ? (
                      parsedContent.resources.tools.map((tool, index) => (
                        <li key={index}>• {tool}</li>
                      ))
                    ) : (
                      <li className="text-blue-600 italic">No specific tools mentioned</li>
                    )}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2 text-sm sm:text-base">Key Resources</h4>
                  <ul className="text-xs sm:text-sm text-green-800 space-y-1">
                    {parsedContent.resources.resources.length > 0 ? (
                      parsedContent.resources.resources.map((resource, index) => (
                        <li key={index}>• {resource}</li>
                      ))
                    ) : (
                      <li className="text-green-600 italic">No specific resources mentioned</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Summary and Calls-to-Action Section */}
      {parsedContent.summaryAndCTA && (
        <section id="summary-cta" className="mb-6 sm:mb-8" aria-labelledby="summary-cta-heading">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 id="summary-cta-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-orange-600">📋</span>
                Summary and Calls-to-Action
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className={cn(
                "prose prose-gray max-w-none",
                "prose-headings:font-semibold prose-h3:text-base",
                "prose-p:text-gray-700 prose-p:leading-relaxed",
                "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
                "prose-li:text-gray-700",
                isStreaming && "animate-pulse"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {parsedContent.summaryAndCTA}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Insight Enrichment Section */}
      {parsedContent.insightEnrichment && (
        <section id="enrichment" className="mb-6 sm:mb-8" aria-labelledby="enrichment-heading">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 id="enrichment-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-yellow-600">🌟</span>
                Insight Enrichment
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className={cn(
                "prose prose-gray max-w-none",
                "prose-headings:font-semibold prose-h3:text-base",
                "prose-p:text-gray-700 prose-p:leading-relaxed",
                "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
                "prose-li:text-gray-700",
                isStreaming && "animate-pulse"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {parsedContent.insightEnrichment}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Knowledge Cards Section */}
      {(() => {
        // Centralized logic to determine what to show in Knowledge Cards
        const knowledgeCardsToRender = structuredFlashcards.length > 0
          ? structuredFlashcards
          : parsedContent.knowledgeCards.length > 0
            ? parsedContent.knowledgeCards
            : []

        // Only show Novel-Idea Meter in Knowledge Cards (not duplicated in Learning Pack)
        const showNovelIdeas = parsedContent.acceleratedLearningPack.novelIdeaMeter.length > 0

        // Only show section if we have actual knowledge cards or novel ideas
        return (knowledgeCardsToRender.length > 0 || showNovelIdeas) && (
          <section id="knowledge-cards" className="mb-6 sm:mb-8" aria-labelledby="knowledge-cards-heading">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 id="knowledge-cards-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">🧠</span>
                  Knowledge Cards
                </h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Render Knowledge Cards (structured or parsed) */}
                  {knowledgeCardsToRender.map((card, index) => (
                    <div 
                      key={`kc-${index}`} 
                      className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg hover:shadow-md transition-shadow"
                      data-source={structuredFlashcards.length > 0 ? "structured-flashcards" : "parsed-knowledge-cards"}
                    >
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">Q{index + 1}</span>
                          <button
                            onClick={() => handleCopy(`Q: ${card.question}\nA: ${card.answer}`)}
                            className="p-1 text-purple-400 hover:text-purple-600 hover:bg-white rounded transition-all"
                            title="Copy card"
                            aria-label="Copy knowledge card"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <h4 className="font-semibold text-purple-900 text-sm mb-2">
                          {card.question}
                        </h4>
                      </div>
                      <p className="text-purple-800 text-sm bg-white/50 p-3 rounded border border-purple-100">
                        {card.answer}
                      </p>
                    </div>
                  ))}
                  
                  {/* Novel-Idea Meter as Knowledge Card - Only here, not in Learning Pack */}
                  {showNovelIdeas && (
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded">Novel-Idea Meter</span>
                          <button
                            onClick={() => handleCopy(parsedContent.acceleratedLearningPack.novelIdeaMeter.map(i => `${i.idea}: ${i.score}/5`).join('\n'))}
                            className="p-1 text-orange-400 hover:text-orange-600 hover:bg-white rounded transition-all"
                            title="Copy ideas"
                            aria-label="Copy novel ideas"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-orange-800 text-sm bg-white/50 p-3 rounded border border-orange-100 space-y-2">
                        {parsedContent.acceleratedLearningPack.novelIdeaMeter.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between">
                            <span>{item.idea}</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={star <= item.score ? "text-orange-500" : "text-orange-200"}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {parsedContent.acceleratedLearningPack.novelIdeaMeter.length > 3 && (
                          <div className="text-xs italic text-orange-600">
                            +{parsedContent.acceleratedLearningPack.novelIdeaMeter.length - 3} more ideas...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* Learning Pack Section */}
      <section id="learning" className="mb-6 sm:mb-8" aria-labelledby="learning-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 id="learning-heading" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-indigo-600">📚</span>
              Accelerated-Learning Pack
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-6">

            {/* Feynman Flashcards - Only show if NO structured flashcards exist */}
            {structuredFlashcards.length === 0 && parsedContent.acceleratedLearningPack.feynmanFlashcards.length > 0 && (
              <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg" data-source="parsed-feynman-flashcards">
                <h4 className="font-semibold text-pink-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                  🗂️ Feynman Flashcards
                  <span className="text-xs font-normal text-pink-700">
                    ({parsedContent.acceleratedLearningPack.feynmanFlashcards.length} cards)
                  </span>
                </h4>
                <div className="space-y-2">
                  {parsedContent.acceleratedLearningPack.feynmanFlashcards.map((flashcard, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm text-pink-800">
                      <span className="font-mono text-xs text-pink-600 mt-0.5 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <span className="leading-relaxed">{flashcard}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Glossary - Centralized logic to avoid duplication */}
            {(() => {
              const glossaryToShow = structuredGlossary.length > 0 
                ? structuredGlossary 
                : parsedContent.acceleratedLearningPack.glossary

              return glossaryToShow.length > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg" data-source={structuredGlossary.length > 0 ? "structured-glossary" : "parsed-glossary"}>
                  <h4 className="font-semibold text-indigo-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                    📖 Glossary
                    <span className="text-xs font-normal text-indigo-700">
                      ({glossaryToShow.length} terms)
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {glossaryToShow.map((term, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded border border-indigo-200"
                      >
                        {typeof term === 'string' ? term : term?.term || String(term)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Quick Quiz - Centralized logic, prioritize Learning Pack display */}
            {(() => {
              const quizToShow = structuredQuizQuestions.length > 0 
                ? structuredQuizQuestions 
                : parsedContent.acceleratedLearningPack.quickQuiz

              return quizToShow.length > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg" data-source={structuredQuizQuestions.length > 0 ? "structured-quiz" : "parsed-quiz"}>
                  <h4 className="font-semibold text-emerald-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                    ❓ Quick Quiz
                    <span className="text-xs font-normal text-emerald-700">
                      ({quizToShow.length} questions)
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {quizToShow.map((quiz, index) => (
                      <div key={index} className="p-3 bg-white/50 rounded border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs text-emerald-600 mt-0.5 flex-shrink-0">
                            {index + 1}.
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-emerald-900">{quiz.question}</p>
                            <p className="text-sm text-emerald-700 italic">→ {quiz.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Novel-Idea Meter - Removed from here, only shows in Knowledge Cards now */}
          </div>
        </div>
      </section>
      </main>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Generating summary...
          </div>
        </div>
      )}
    </article>
  )
}