'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Download, Share2, Check, Clock, Calendar, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Summary } from '@prisma/client'

// Backend data structure interfaces
interface BackendKeyMoment {
  timestamp: string
  insight: string
}

interface BackendFlashcard {
  question: string
  answer: string
}

interface BackendQuizQuestion {
  question: string
  answer: string
}

interface BackendFramework {
  name: string
  description: string
}

interface BackendPlaybook {
  trigger: string
  action: string
}

interface BackendNovelIdea {
  insight: string
  score: number
}

interface BackendInsightEnrichment {
  stats_tools_links?: string[]
  sentiment?: string
  risks_blockers_questions?: string[]
}

interface BackendAcceleratedLearningPack {
  tldr100: string
  feynman_flashcards?: Array<{ q: string; a: string }>
  glossary?: Array<{ term: string; definition: string }>
  quick_quiz?: Array<{ q: string; a: string }>
  novel_idea_meter?: BackendNovelIdea[]
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




export function SummaryViewer({ 
  summary, 
  isStreaming = false,
  className 
}: SummaryViewerProps) {
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('tldr')
  // Progressive disclosure: Start with reference sections collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(['frameworks', 'debunked', 'practice', 'playbooks', 'enrichment', 'learning']) // Start with reference sections collapsed
  )

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


  // Parse markdown sections for new Gumloop structure
  const parseMarkdownSections = (content: string): Map<string, string> => {
    const sections = new Map<string, string>()
    
    // Extract content between ```markdown blocks if present
    let markdownContent = content
    const markdownStart = content.indexOf('```markdown')
    if (markdownStart !== -1) {
      const start = markdownStart + '```markdown'.length
      const markdownEnd = content.indexOf('```', start)
      if (markdownEnd !== -1) {
        markdownContent = content.substring(start, markdownEnd)
      }
    }
    
    // Split by section headers
    const sectionRegex = /^#{2,3}\s+(.+)$/gm
    const matches = Array.from(markdownContent.matchAll(sectionRegex))
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const sectionName = match[1].trim().toLowerCase()
      const startIndex = match.index! + match[0].length
      
      // Find the end of this section (either next header, ---, or end of content)
      let endIndex = markdownContent.length
      
      // Check for --- delimiter
      const delimiterIndex = markdownContent.indexOf('\n---', startIndex)
      if (delimiterIndex !== -1 && delimiterIndex < endIndex) {
        endIndex = delimiterIndex
      }
      
      // Check for next section header
      if (i + 1 < matches.length) {
        const nextHeaderIndex = matches[i + 1].index!
        if (nextHeaderIndex < endIndex) {
          endIndex = nextHeaderIndex
        }
      }
      
      // Extract section content
      const sectionContent = markdownContent.substring(startIndex, endIndex).trim()
      sections.set(sectionName, sectionContent)
    }
    
    return sections
  }

  // Parse frameworks from Strategic Frameworks section
  const parseFrameworks = (sections: Map<string, string>) => {
    const frameworksText = sections.get('strategic frameworks') || ''
    const frameworks: Array<{name: string; description: string}> = []
    
    if (!frameworksText) return frameworks
    
    const lines = frameworksText.split('\n')
    
    // Try to parse table format first
    let inTable = false
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip table headers and separators
      if (trimmed.includes('|') && (trimmed.toLowerCase().includes('step') || trimmed.toLowerCase().includes('principle') || trimmed.toLowerCase().includes('framework'))) {
        inTable = true
        continue
      }
      if (trimmed.startsWith('|-') || trimmed.startsWith('|--')) {
        continue
      }
      
      // Parse table rows
      if (inTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const parts = trimmed.split('|').map(p => p.trim()).filter(p => p)
        if (parts.length >= 2) {
          const name = parts[0] || parts[1] // Sometimes first column is step number
          const description = parts.slice(1).join(' - ').trim()
          if (name && description && !name.match(/^\d+$/)) { // Skip if name is just a number
            frameworks.push({ name, description })
          }
        }
      }
    }
    
    // If no table format found, try numbered list format
    if (frameworks.length === 0) {
      for (const line of lines) {
        const trimmed = line.trim()
        
        // Match numbered format: "1. Framework Name" followed by description
        const numberedMatch = trimmed.match(/^\d+\.\s*(.+)$/)
        if (numberedMatch) {
          const name = numberedMatch[1].trim()
          frameworks.push({ name, description: '' })
        }
        // Look for indented description lines
        else if (trimmed.startsWith('–') || trimmed.startsWith('-')) {
          const description = trimmed.replace(/^[–-]\s*/, '').trim()
          if (frameworks.length > 0 && description) {
            if (frameworks[frameworks.length - 1].description) {
              frameworks[frameworks.length - 1].description += ' ' + description
            } else {
              frameworks[frameworks.length - 1].description = description
            }
          }
        }
      }
    }
    
    return frameworks
  }

  // Parse list items from sections like Debunked Assumptions, In Practice
  const parseListItems = (text: string): string[] => {
    const items: string[] = []
    const lines = text.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Match bullet points or numbered lists
      if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const item = trimmed.replace(/^[-*•]\s+|^\d+\.\s+/, '').trim()
        if (item) {
          items.push(item)
        }
      }
    }
    
    return items
  }

  // Parse key moments from Key Moments section
  const parseKeyMoments = (sections: Map<string, string>) => {
    const keyMomentsText = sections.get('key moments') || ''
    const moments: Array<{timestamp: string; insight: string}> = []
    
    const lines = keyMomentsText.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Look for timestamp → insight format (e.g., "– **00:05** → Early sponsors...")
      const match = trimmed.match(/^[–-]\s*\*\*\\?\*?(\d{1,2}:\d{2}(?::\d{2})?)\*+\s*(?:→|->|→)\s*(.+)$/)
      if (match) {
        const timestamp = match[1].trim()
        const insight = match[2].trim()
        moments.push({ timestamp, insight })
      }
    }
    
    return moments
  }

  // Get raw playbooks content from Playbooks & Heuristics section
  const getRawPlaybooksContent = (sections: Map<string, string>) => {
    return sections.get('playbooks & heuristics') || ''
  }

  // Get raw flashcards content from Feynman Flashcards section
  const getRawFlashcardsContent = (sections: Map<string, string>) => {
    return sections.get('feynman flashcards') || ''
  }

  // Parse Glossary from markdown
  const parseGlossary = (sections: Map<string, string>) => {
    const glossaryText = sections.get('glossary') || ''
    const glossary: Array<{term: string; definition: string}> = []
    
    const lines = glossaryText.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Look for **Term** – Definition format
      const match = trimmed.match(/^\*\*(.+?)\*\*\s*[–-]\s*(.+)$/)
      if (match) {
        const term = match[1].trim()
        const definition = match[2].trim()
        glossary.push({ term, definition })
      }
    }
    
    return glossary
  }

  // Parse Quick Quiz from markdown
  const parseQuickQuiz = (sections: Map<string, string>) => {
    const quizText = sections.get('quick quiz') || ''
    const quiz: Array<{q: string; a: string}> = []
    
    const lines = quizText.split('\n')
    let currentQuestion = ''
    let currentAnswer = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Look for numbered questions
      const questionMatch = trimmed.match(/^\d+\.\s*(.+)$/)
      if (questionMatch) {
        // Save previous Q&A if exists
        if (currentQuestion && currentAnswer) {
          quiz.push({ q: currentQuestion, a: currentAnswer })
        }
        currentQuestion = questionMatch[1].trim()
        currentAnswer = ''
      } else if (trimmed.startsWith('–') && currentQuestion) {
        // This is likely the answer
        currentAnswer = trimmed.replace(/^–\s*/, '').trim()
      }
    }
    
    // Save last Q&A
    if (currentQuestion && currentAnswer) {
      quiz.push({ q: currentQuestion, a: currentAnswer })
    }
    
    return quiz
  }

  // Parse Novel-Idea Meter from markdown
  const parseNovelIdeaMeter = (sections: Map<string, string>) => {
    const novelText = sections.get('novel-idea meter') || ''
    const novelIdeas: Array<{insight: string; score: number}> = []
    
    const lines = novelText.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Look for format: "- Idea name: 4" or "- Idea name → 5"
      const match = trimmed.match(/^-\s*(.+?)\s*(?:[:→])\s*(\d+)/)
      if (match) {
        const insight = match[1].trim()
        const score = parseInt(match[2])
        novelIdeas.push({ insight, score })
      }
    }
    
    return novelIdeas
  }

  // Parse insight enrichment data
  const parseInsightEnrichment = (sections: Map<string, string>) => {
    const enrichmentText = sections.get('insight enrichment') || ''
    const stats_tools_links: string[] = []
    let sentiment = 'neutral'
    const risks_blockers_questions: string[] = []
    
    if (!enrichmentText) return { stats_tools_links, sentiment, risks_blockers_questions }
    
    const lines = enrichmentText.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const content = trimmed.replace(/^[-•]\s*/, '').trim()
        
        // Look for labeled content: "- Tools: content" or "- Stats: content"
        const labelMatch = content.match(/^([^:]+):\s*(.+)$/)
        if (labelMatch) {
          const label = labelMatch[1].toLowerCase().trim()
          const value = labelMatch[2].trim()
          
          if (label.includes('tool') || label.includes('stat') || label.includes('link')) {
            // Split on commas or semicolons for multiple items
            const items = value.split(/[,;]/).map(item => item.trim()).filter(item => item)
            stats_tools_links.push(...items)
          }
          else if (label.includes('sentiment')) {
            if (value.toLowerCase().includes('positive')) sentiment = 'positive'
            else if (value.toLowerCase().includes('negative')) sentiment = 'negative'
            else sentiment = 'neutral'
          }
          else if (label.includes('risk') || label.includes('blocker') || label.includes('question')) {
            // Split on commas or semicolons for multiple items
            const items = value.split(/[,;]/).map(item => item.trim()).filter(item => item)
            risks_blockers_questions.push(...items)
          }
        }
        // If no colon, try to categorize based on keywords in the content
        else {
          const lowerContent = content.toLowerCase()
          if (lowerContent.includes('tool') || lowerContent.includes('shortcut') || lowerContent.includes('command')) {
            stats_tools_links.push(content)
          }
          else if (lowerContent.includes('risk') || lowerContent.includes('danger') || lowerContent.includes('avoid') || lowerContent.includes('problem')) {
            risks_blockers_questions.push(content)
          }
          else {
            // Default to stats/tools
            stats_tools_links.push(content)
          }
        }
      }
    }
    
    return { stats_tools_links, sentiment, risks_blockers_questions }
  }

  // Custom markdown parser for clean text formatting with proper HTML lists
  const parseMarkdownToJSX = (content: string, themeColor: string) => {
    if (!content.trim()) return null

    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let currentParagraph: string[] = []
    let currentListType: 'ul' | 'ol' | null = null
    let currentListItems: React.ReactNode[] = []
    let key = 0

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim()
        if (paragraphText) {
          elements.push(
            <p key={key++} className="text-gray-700 leading-relaxed mb-4 text-base">
              {parseInlineMarkdown(paragraphText, themeColor)}
            </p>
          )
        }
        currentParagraph = []
      }
    }

    const flushCurrentList = () => {
      if (currentListItems.length > 0 && currentListType) {
        if (currentListType === 'ul') {
          elements.push(
            <ul key={key++} className="list-disc list-outside space-y-2 mb-4 ml-6 pl-2">
              {currentListItems}
            </ul>
          )
        } else {
          elements.push(
            <ol key={key++} className="list-decimal list-outside space-y-3 mb-4 ml-6 pl-2">
              {currentListItems}
            </ol>
          )
        }
        currentListItems = []
        currentListType = null
      }
    }

    const parseInlineMarkdown = (text: string, color: string) => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let partKey = 0

      while (remaining.length > 0) {
        // Handle bold text **text**
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        if (boldMatch) {
          const beforeBold = remaining.substring(0, boldMatch.index!)
          if (beforeBold) parts.push(beforeBold)
          parts.push(
            <strong key={partKey++} className="font-bold text-gray-900">
              {boldMatch[1]}
            </strong>
          )
          remaining = remaining.substring(boldMatch.index! + boldMatch[0].length)
          continue
        }

        // Handle inline code `code`
        const codeMatch = remaining.match(/`([^`]+)`/)
        if (codeMatch) {
          const beforeCode = remaining.substring(0, codeMatch.index!)
          if (beforeCode) parts.push(beforeCode)
          parts.push(
            <code key={partKey++} className={`px-1.5 py-0.5 rounded text-sm bg-${color}-50 text-${color}-600`}>
              {codeMatch[1]}
            </code>
          )
          remaining = remaining.substring(codeMatch.index! + codeMatch[0].length)
          continue
        }

        // Handle arrows →
        const arrowMatch = remaining.match(/(→)/)
        if (arrowMatch) {
          const beforeArrow = remaining.substring(0, arrowMatch.index!)
          if (beforeArrow) parts.push(beforeArrow)
          parts.push(
            <span key={partKey++} className="text-blue-600 font-medium mx-1">
              →
            </span>
          )
          remaining = remaining.substring(arrowMatch.index! + arrowMatch[0].length)
          continue
        }

        // No more markdown, add remaining text
        parts.push(remaining)
        break
      }

      return parts.length === 1 ? parts[0] : parts
    }

    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines but flush current context
      if (!trimmed) {
        flushParagraph()
        flushCurrentList()
        continue
      }

      // Handle headings
      if (trimmed.startsWith('###')) {
        flushParagraph()
        flushCurrentList()
        const headingText = trimmed.replace(/^###\s*/, '')
        elements.push(
          <h4 key={key++} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
            {parseInlineMarkdown(headingText, themeColor)}
          </h4>
        )
        continue
      }
      
      if (trimmed.startsWith('##')) {
        flushParagraph()
        flushCurrentList()
        const headingText = trimmed.replace(/^##\s*/, '')
        elements.push(
          <h3 key={key++} className="text-xl font-semibold text-gray-900 mt-6 mb-4">
            {parseInlineMarkdown(headingText, themeColor)}
          </h3>
        )
        continue
      }

      // Handle unordered lists (including en dash –)
      if (trimmed.match(/^[-–*•]\s+/)) {
        flushParagraph()
        
        // Start new list or continue existing unordered list
        if (currentListType !== 'ul') {
          flushCurrentList()
          currentListType = 'ul'
        }
        
        const listItem = trimmed.replace(/^[-–*•]\s+/, '')
        currentListItems.push(
          <li key={key++} className="text-gray-700 leading-relaxed text-base">
            {parseInlineMarkdown(listItem, themeColor)}
          </li>
        )
        continue
      }

      // Handle ordered lists
      if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph()
        
        // Start new list or continue existing ordered list
        if (currentListType !== 'ol') {
          flushCurrentList()
          currentListType = 'ol'
        }
        
        const listItem = trimmed.replace(/^\d+\.\s+/, '')
        currentListItems.push(
          <li key={key++} className="text-gray-700 leading-relaxed text-base">
            {parseInlineMarkdown(listItem, themeColor)}
          </li>
        )
        continue
      }

      // Regular paragraph text
      flushCurrentList()
      currentParagraph.push(trimmed)
    }

    // Flush any remaining content
    flushParagraph()
    flushCurrentList()

    return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null
  }

  // Custom framework formatter for Strategic Frameworks section
  const formatFrameworks = (content: string, themeColor: string) => {
    if (!content.trim()) return null

    const lines = content.split('\n').filter(line => line.trim())
    const frameworks: Array<{number: string, title: string, description: string}> = []
    
    let currentFramework: {number: string, title: string, description: string} | null = null
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Check for numbered framework titles (e.g., "1. Framework Name" or "**1. Framework Name**")
      const numberedMatch = trimmed.match(/^(?:\*\*)?(\d+)\.\s*(.+?)(?:\*\*)?$/)
      if (numberedMatch) {
        // Save previous framework if exists
        if (currentFramework) {
          frameworks.push(currentFramework)
        }
        
        currentFramework = {
          number: numberedMatch[1],
          title: numberedMatch[2].replace(/^\*\*|\*\*$/g, ''), // Remove bold markdown
          description: ''
        }
        continue
      }
      
      // Check for bold titles without numbers (e.g., "**Framework Name**")
      const boldTitleMatch = trimmed.match(/^\*\*(.+?)\*\*$/)
      if (boldTitleMatch && !currentFramework) {
        currentFramework = {
          number: (frameworks.length + 1).toString(),
          title: boldTitleMatch[1],
          description: ''
        }
        continue
      }
      
      // Add description lines to current framework
      if (currentFramework && trimmed && !trimmed.startsWith('#')) {
        if (currentFramework.description) {
          currentFramework.description += ' ' + trimmed
        } else {
          currentFramework.description = trimmed
        }
      }
    }
    
    // Save last framework
    if (currentFramework) {
      frameworks.push(currentFramework)
    }
    
    // If we found frameworks, render them as cards
    if (frameworks.length > 0) {
      return (
        <div className="space-y-4">
          {frameworks.map((framework, index) => (
            <div key={index} className="bg-white p-5 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                    {framework.number}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                    {framework.title}
                  </h4>
                  {framework.description && (
                    <div className="text-gray-700 leading-relaxed text-base">
                      {parseMarkdownToJSX(framework.description, themeColor)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    
    // Fallback to regular markdown parsing if no frameworks detected
    return parseMarkdownToJSX(content, themeColor)
  }

  // Parse the content and extract data for new sections
  const sections = parseMarkdownSections(summary.content)
  const parsedKeyMoments = parseKeyMoments(sections)
  const rawPlaybooksContent = getRawPlaybooksContent(sections)
  const rawFlashcardsContent = getRawFlashcardsContent(sections)
  const parsedGlossary = parseGlossary(sections)

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

  const navigationItems = [
    { id: 'tldr', label: 'TL;DR', icon: '⚡', importance: 'essential', readTime: '30s' },
    { id: 'key-moments', label: 'Key Moments', icon: '🎯', importance: 'essential', readTime: '2m' },
    { id: 'frameworks', label: 'Frameworks', icon: '🏗️', importance: 'recommended', readTime: '3m' },
    { id: 'debunked', label: 'Debunked', icon: '❌', importance: 'recommended', readTime: '1m' },
    { id: 'practice', label: 'In Practice', icon: '🎬', importance: 'recommended', readTime: '2m' },
    { id: 'playbooks', label: 'Playbooks', icon: '📖', importance: 'recommended', readTime: '4m' },
    { id: 'enrichment', label: 'Enrichment', icon: '🌟', importance: 'reference', readTime: '2m' },
    { id: 'learning', label: 'Learning Pack', icon: '📚', importance: 'reference', readTime: '8m' }
  ]

  const getImportanceIndicator = (importance: string) => {
    switch (importance) {
      case 'essential': return '🔥'
      case 'recommended': return '⭐'
      case 'reference': return '📝'
      default: return ''
    }
  }

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
              {summary.metadata?.speakers && summary.metadata.speakers.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{summary.metadata.speakers.join(', ')}</span>
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
            {summary.metadata?.synopsis && (
              <p className="text-gray-700 italic leading-relaxed text-sm sm:text-base">
                {summary.metadata.synopsis}
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
          {navigationItems.map((item) => {
            const isCollapsed = collapsedSections.has(item.id)
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] relative",
                  activeSection === item.id
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
                  isCollapsed && "opacity-60"
                )}
                aria-label={`Jump to ${item.label} section`}
              >
                {/* Importance indicator */}
                <span className="text-xs absolute -top-1 -left-1">{getImportanceIndicator(item.importance)}</span>
                <span className="text-base sm:text-lg">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {/* Collapse indicator */}
                {isCollapsed && <ChevronDown className="h-3 w-3 ml-1" />}
                {/* Reading time on hover */}
                <span className="hidden lg:inline text-xs text-gray-400 ml-1">({item.readTime})</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Progressive Disclosure Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 sm:mb-8">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-sm">🔥</span>
              <span className="text-sm">⭐</span>
              <span className="text-sm">📝</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Smart Reading Guide</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-medium">🔥 Essential</span> sections are shown first, 
              <span className="font-medium"> ⭐ Recommended</span> for deeper insights, 
              <span className="font-medium"> 📝 Reference</span> sections are collapsed by default. 
              Click any section header to expand/collapse.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main role="main">
        {/* Rapid TL;DR Section */}
        <section id="tldr" className="mb-6 sm:mb-8" aria-labelledby="tldr-heading">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-500 px-4 sm:px-6 py-4 border-b border-amber-600">
            <h2 className="text-lg sm:text-xl font-bold text-white flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs">🔥</span>
                <span className="text-amber-100">⚡</span>
                <span>00:00 Rapid TL;DR</span>
              </div>
              <span className="text-xs sm:text-sm font-normal text-amber-100">(30s read)</span>
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <button
                onClick={() => handleCopy(summary.metadata?.synopsis || 'TL;DR content')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all min-h-[40px] min-w-[40px] flex-shrink-0"
                title="Copy TL;DR"
                aria-label="Copy TL;DR section"
              >
                <Copy className="h-4 w-4 mx-auto" />
              </button>
            </div>
            <div className="text-gray-800 leading-relaxed text-base prose prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {(() => {
                  // Prioritize markdown parsing first, then backend data, then fallback
                  const tldrContent = sections.get('tl;dr (≤100 words)') 
                    || sections.get('tl;dr') 
                    || summary.accelerated_learning_pack?.tldr100 
                    || summary.metadata?.synopsis 
                    || 'A concise summary of the key takeaways from this video content.';
                  
                  return tldrContent;
                })()}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </section>

      {/* Key Moments Section */}
      <section id="key-moments" className="mb-6 sm:mb-8" aria-labelledby="key-moments-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-blue-600 px-4 sm:px-6 py-4 border-b border-blue-700">
            <h2 id="key-moments-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-xs">🔥</span>
              <span className="text-blue-100">🎯</span>
              <span className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Key Moments</span>
                <span className="text-xs sm:text-sm font-normal text-blue-100">(2m read)</span>
              </span>
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data
              const keyMoments = parsedKeyMoments.length > 0 
                ? parsedKeyMoments 
                : (summary.key_moments || []);
              
              return keyMoments.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {keyMoments.map((moment, index) => (
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
                      <div className="flex-1 min-w-0 prose prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {moment.insight}
                        </ReactMarkdown>
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
              ) : (
                <p className="text-gray-500 italic">No key moments identified in this video.</p>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Strategic Frameworks Section */}
      <section id="frameworks" className="mb-8 sm:mb-10" aria-labelledby="frameworks-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 sm:px-8 py-5 border-b border-green-800">
            <button
              onClick={() => toggleSection('frameworks')}
              className="w-full flex items-center justify-between text-left hover:bg-green-700/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('frameworks')}
            >
              <h2 id="frameworks-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">⭐</span>
                <span className="text-green-100">🏗️</span>
                Strategic Frameworks
                <span className="text-xs font-normal text-green-100 ml-2">(3m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('frameworks') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('frameworks') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-green-50">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = sections.get('strategic frameworks') || 
                (summary.frameworks && summary.frameworks.length > 0 
                  ? summary.frameworks.map(f => `**${f.name}**\n${f.description}`).join('\n\n')
                  : '');
              
              return content ? (
                <div className="p-6 bg-gradient-to-br from-white to-green-50 border border-green-100 rounded-xl shadow-sm">
                  <div className="text-gray-700">
                    {formatFrameworks(content, 'green')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic text-center">No strategic frameworks identified in this video.</p>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      </section>

      {/* Debunked Assumptions Section */}
      <section id="debunked" className="mb-8 sm:mb-10" aria-labelledby="debunked-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 sm:px-8 py-5 border-b border-red-800">
            <button
              onClick={() => toggleSection('debunked')}
              className="w-full flex items-center justify-between text-left hover:bg-red-700/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('debunked')}
            >
              <h2 id="debunked-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">⭐</span>
                <span className="text-red-100">❌</span>
                Debunked Assumptions
                <span className="text-xs font-normal text-red-100 ml-2">(1m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('debunked') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('debunked') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-red-50">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = sections.get('debunked assumptions') || 
                (summary.debunked_assumptions && summary.debunked_assumptions.length > 0 
                  ? summary.debunked_assumptions.map(assumption => `- ${assumption}`).join('\n')
                  : '');
              
              return content ? (
                <div className="p-6 bg-gradient-to-br from-white to-red-50 border border-red-100 rounded-xl shadow-sm">
                  <div className="text-gray-700">
                    {parseMarkdownToJSX(content, 'red')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic text-center">No debunked assumptions in this video.</p>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      </section>

      {/* In Practice Section */}
      <section id="practice" className="mb-8 sm:mb-10" aria-labelledby="practice-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 sm:px-8 py-5 border-b border-emerald-800">
            <button
              onClick={() => toggleSection('practice')}
              className="w-full flex items-center justify-between text-left hover:bg-emerald-700/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('practice')}
            >
              <h2 id="practice-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">⭐</span>
                <span className="text-emerald-100">🎬</span>
                In Practice
                <span className="text-xs font-normal text-emerald-100 ml-2">(2m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('practice') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('practice') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-emerald-50">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = sections.get('in practice') || 
                (summary.in_practice && summary.in_practice.length > 0 
                  ? summary.in_practice.map(practice => `- ${practice}`).join('\n')
                  : '');
              
              return content ? (
                <div className="p-6 bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                  <div className="text-gray-700">
                    {parseMarkdownToJSX(content, 'emerald')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic text-center">No practical examples shown in this video.</p>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      </section>

      {/* Playbooks & Heuristics Section */}
      <section id="playbooks" className="mb-8 sm:mb-10" aria-labelledby="playbooks-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 sm:px-8 py-5 border-b border-purple-800">
            <button
              onClick={() => toggleSection('playbooks')}
              className="w-full flex items-center justify-between text-left hover:bg-purple-700/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('playbooks')}
            >
              <h2 id="playbooks-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">⭐</span>
                <span className="text-purple-100">📖</span>
                Playbooks & Heuristics
                <span className="text-xs font-normal text-purple-100 ml-2">(4m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('playbooks') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('playbooks') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-purple-50">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = rawPlaybooksContent || 
                (summary.playbooks && summary.playbooks.length > 0 
                  ? summary.playbooks.map(p => `- ${p.trigger} → ${p.action}`).join('\n')
                  : '');
              
              return content ? (
                <div className="p-6 bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-xl shadow-sm">
                  <div className="text-gray-700">
                    {parseMarkdownToJSX(content, 'purple')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic text-center">No playbooks or heuristics identified.</p>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      </section>

      {/* Insight Enrichment Section */}
      <section id="enrichment" className="mb-8 sm:mb-10" aria-labelledby="enrichment-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 sm:px-8 py-5 border-b border-yellow-700">
            <button
              onClick={() => toggleSection('enrichment')}
              className="w-full flex items-center justify-between text-left hover:bg-yellow-600/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('enrichment')}
            >
              <h2 id="enrichment-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">📝</span>
                <span className="text-yellow-100">🌟</span>
                Insight Enrichment
                <span className="text-xs font-normal text-yellow-100 ml-2">(2m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('enrichment') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('enrichment') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-yellow-50/30">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = sections.get('insight enrichment') || 
                (summary.insight_enrichment && (
                  [
                    ...(summary.insight_enrichment.stats_tools_links || []).map(item => `- **Tools/Stats**: ${item}`),
                    summary.insight_enrichment.sentiment && `- **Sentiment**: ${summary.insight_enrichment.sentiment}`,
                    ...(summary.insight_enrichment.risks_blockers_questions || []).map(item => `- **Risk/Question**: ${item}`)
                  ].filter(Boolean).join('\n')
                ) || '');
              
              return content ? (
                <div className="text-gray-700">
                  {parseMarkdownToJSX(content, 'yellow')}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic text-center">No insight enrichment data available.</p>
                </div>
              );
            })()}
          </div>
          )}
        </div>
      </section>



      {/* Accelerated Learning Pack Section */}
      <section id="learning" className="mb-8 sm:mb-10" aria-labelledby="learning-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 sm:px-8 py-5 border-b border-indigo-800">
            <button
              onClick={() => toggleSection('learning')}
              className="w-full flex items-center justify-between text-left hover:bg-indigo-700/20 transition-colors rounded p-2 -m-2"
              aria-expanded={!collapsedSections.has('learning')}
            >
              <h2 id="learning-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xs">📝</span>
                <span className="text-indigo-100">📚</span>
                Accelerated Learning Pack
                <span className="text-xs font-normal text-indigo-100 ml-2">(8m read)</span>
              </h2>
              <ChevronDown className={cn(
                "h-5 w-5 text-white transition-transform duration-200",
                collapsedSections.has('learning') ? "rotate-0" : "rotate-180"
              )} />
            </button>
          </div>
          {!collapsedSections.has('learning') && (
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-indigo-50/30 space-y-8">
            {(() => {
              // Prioritize markdown parsing first, then backend data (exclude TL;DR as it's already shown above)
              const flashcardsContent = rawFlashcardsContent ||
                (summary.accelerated_learning_pack?.feynman_flashcards && summary.accelerated_learning_pack.feynman_flashcards.length > 0
                  ? summary.accelerated_learning_pack.feynman_flashcards.map(card => `Q: ${card.q}\nA: ${card.a}\n`).join('\n')
                  : '');
                
              const glossary = parsedGlossary.length > 0 
                ? parsedGlossary 
                : (summary.accelerated_learning_pack?.glossary || []);
                
              const rawQuickQuizContent = sections.get('quick quiz') ||
                (summary.accelerated_learning_pack?.quick_quiz && summary.accelerated_learning_pack.quick_quiz.length > 0
                  ? summary.accelerated_learning_pack.quick_quiz.map((quiz, index) => `${index + 1}. ${quiz.q}\n   → ${quiz.a}`).join('\n\n')
                  : '');
                
              const rawNovelIdeaMeterContent = sections.get('novel-idea meter') ||
                (summary.accelerated_learning_pack?.novel_idea_meter && summary.accelerated_learning_pack.novel_idea_meter.length > 0
                  ? summary.accelerated_learning_pack.novel_idea_meter.map(item => `- ${item.insight}: ${item.score}/5`).join('\n')
                  : '');
              
              const hasAnyLearningContent = flashcardsContent || glossary.length > 0 || rawQuickQuizContent || rawNovelIdeaMeterContent;
              
              return hasAnyLearningContent ? (
                <>
                  {/* Feynman Flashcards */}
                  {flashcardsContent && (
                    <div className="p-6 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg flex items-center gap-2">
                        🗂️ Feynman Flashcards
                      </h4>
                      <div className="prose prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-li:leading-relaxed prose-strong:text-gray-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {flashcardsContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Glossary */}
                  {glossary.length > 0 && (
                    <div className="p-6 bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg flex items-center gap-2">
                        📖 Glossary
                        <span className="text-sm font-normal text-gray-600 bg-blue-100 px-2 py-1 rounded-full">
                          {glossary.length} terms
                        </span>
                      </h4>
                      <div className="space-y-4">
                        {glossary.map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-gray-900 text-base">{item.term}</span>
                              <div className="text-gray-700 text-base prose prose-base max-w-none prose-p:leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                  {item.definition}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Quiz */}
                  {rawQuickQuizContent && (
                    <div className="p-6 bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg flex items-center gap-2">
                        ❓ Quick Quiz
                      </h4>
                      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-li:leading-relaxed prose-li:my-3 prose-strong:text-gray-900 prose-code:text-emerald-600 prose-code:bg-emerald-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-blockquote:text-gray-600 prose-blockquote:border-emerald-200 prose-blockquote:bg-emerald-50 prose-blockquote:italic prose-ol:space-y-4 prose-ul:space-y-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {rawQuickQuizContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Novel-Idea Meter */}
                  {rawNovelIdeaMeterContent && (
                    <div className="p-6 bg-gradient-to-br from-white to-amber-50 border border-amber-100 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg flex items-center gap-2">
                        💡 Novel-Idea Meter
                      </h4>
                      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-li:leading-relaxed prose-li:my-3 prose-strong:text-gray-900 prose-code:text-amber-600 prose-code:bg-amber-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-blockquote:text-gray-600 prose-blockquote:border-amber-200 prose-blockquote:bg-amber-50 prose-blockquote:italic prose-ul:space-y-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {rawNovelIdeaMeterContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">No learning pack data available.</p>
              );
            })()}
          </div>
          )}
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