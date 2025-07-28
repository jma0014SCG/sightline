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
  video_url?: string
  language?: string
  generated_on?: string
  version?: string
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
        let content = trimmed.replace(/^[-•]\s*/, '').trim()
        
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

  // Parse the content and extract data for new sections
  const sections = parseMarkdownSections(summary.content)
  const parsedFrameworks = parseFrameworks(sections)
  const parsedDebunkedAssumptions = parseListItems(sections.get('debunked assumptions') || '')
  const parsedInPractice = parseListItems(sections.get('in practice') || '')
  const rawPlaybooksContent = getRawPlaybooksContent(sections)
  const parsedInsightEnrichment = parseInsightEnrichment(sections)
  const parsedKeyMoments = parseKeyMoments(sections)
  const rawFlashcardsContent = getRawFlashcardsContent(sections)
  const parsedGlossary = parseGlossary(sections)
  const parsedQuickQuiz = parseQuickQuiz(sections)
  const parsedNovelIdeaMeter = parseNovelIdeaMeter(sections)

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
    { id: 'tldr', label: 'TL;DR', icon: '⚡' },
    { id: 'key-moments', label: 'Key Moments', icon: '🎯' },
    { id: 'frameworks', label: 'Frameworks', icon: '🏗️' },
    { id: 'debunked', label: 'Debunked', icon: '❌' },
    { id: 'practice', label: 'In Practice', icon: '🎬' },
    { id: 'playbooks', label: 'Playbooks', icon: '📖' },
    { id: 'enrichment', label: 'Enrichment', icon: '🌟' },
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-500 px-4 sm:px-6 py-4 border-b border-amber-600">
            <h2 className="text-lg sm:text-xl font-bold text-white flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-100">⚡</span>
                <span>00:00 Rapid TL;DR</span>
              </div>
              <span className="text-xs sm:text-sm font-normal text-amber-100">(≤100 words)</span>
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
              <span className="text-blue-100">🎯</span>
              <span className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Key Moments</span>
                <span className="text-xs sm:text-sm font-normal text-blue-100">(Timestamp → Insight)</span>
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
      <section id="frameworks" className="mb-6 sm:mb-8" aria-labelledby="frameworks-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-green-600 px-4 sm:px-6 py-4 border-b border-green-700">
            <h2 id="frameworks-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-green-100">🏗️</span>
              Strategic Frameworks
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data
              const frameworks = parsedFrameworks.length > 0 
                ? parsedFrameworks 
                : (summary.frameworks || []);
              
              return frameworks.length > 0 ? (
                <div className="space-y-4">
                  {frameworks.map((framework, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">{framework.name}</h3>
                      <div className="text-gray-700 text-base leading-relaxed prose prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {framework.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No strategic frameworks identified in this video.</p>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Debunked Assumptions Section */}
      <section id="debunked" className="mb-6 sm:mb-8" aria-labelledby="debunked-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-red-600 px-4 sm:px-6 py-4 border-b border-red-700">
            <h2 id="debunked-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-red-100">❌</span>
              Debunked Assumptions
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data
              const assumptions = parsedDebunkedAssumptions.length > 0 
                ? parsedDebunkedAssumptions 
                : (summary.debunked_assumptions || []);
              
              return assumptions.length > 0 ? (
                <ul className="space-y-2">
                  {assumptions.map((assumption, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <div className="text-gray-700 text-base prose prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {assumption}
                        </ReactMarkdown>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No debunked assumptions in this video.</p>
              );
            })()}
          </div>
        </div>
      </section>

      {/* In Practice Section */}
      <section id="practice" className="mb-6 sm:mb-8" aria-labelledby="practice-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-emerald-600 px-4 sm:px-6 py-4 border-b border-emerald-700">
            <h2 id="practice-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-100">🎬</span>
              In Practice
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data
              const practices = parsedInPractice.length > 0 
                ? parsedInPractice 
                : (summary.in_practice || []);
              
              return practices.length > 0 ? (
                <div className="space-y-3">
                  {practices.map((practice, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-gray-700 text-base prose prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {practice}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No practical examples shown in this video.</p>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Playbooks & Heuristics Section */}
      <section id="playbooks" className="mb-6 sm:mb-8" aria-labelledby="playbooks-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-purple-600 px-4 sm:px-6 py-4 border-b border-purple-700">
            <h2 id="playbooks-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-100">📖</span>
              Playbooks & Heuristics
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown content first, then backend data
              const content = rawPlaybooksContent || 
                (summary.playbooks && summary.playbooks.length > 0 
                  ? summary.playbooks.map(p => `- ${p.trigger} → ${p.action}`).join('\n')
                  : '');
              
              return content ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 italic">No playbooks or heuristics identified.</p>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Insight Enrichment Section */}
      <section id="enrichment" className="mb-6 sm:mb-8" aria-labelledby="enrichment-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-yellow-500 px-4 sm:px-6 py-4 border-b border-yellow-600">
            <h2 id="enrichment-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-yellow-100">🌟</span>
              Insight Enrichment
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data
              const hasStats = parsedInsightEnrichment.stats_tools_links.length > 0 || (summary.insight_enrichment?.stats_tools_links?.length || 0) > 0;
              const hasRisks = parsedInsightEnrichment.risks_blockers_questions.length > 0 || (summary.insight_enrichment?.risks_blockers_questions?.length || 0) > 0;
              const hasSentiment = parsedInsightEnrichment.sentiment !== 'neutral' || summary.insight_enrichment?.sentiment;
              
              const statsToolsLinks = parsedInsightEnrichment.stats_tools_links.length > 0 
                ? parsedInsightEnrichment.stats_tools_links 
                : (summary.insight_enrichment?.stats_tools_links || []);
                
              const sentiment = parsedInsightEnrichment.sentiment !== 'neutral' 
                ? parsedInsightEnrichment.sentiment 
                : (summary.insight_enrichment?.sentiment || 'neutral');
                
              const risksBlockersQuestions = parsedInsightEnrichment.risks_blockers_questions.length > 0 
                ? parsedInsightEnrichment.risks_blockers_questions 
                : (summary.insight_enrichment?.risks_blockers_questions || []);
              
              return hasStats || hasRisks || hasSentiment ? (
                <div className="space-y-4">
                  {/* Stats, Tools & Links */}
                  {statsToolsLinks.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Stats, Tools & Links</h4>
                      <ul className="text-base text-gray-700 space-y-1">
                        {statsToolsLinks.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Sentiment */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Sentiment</h4>
                    <span className={cn(
                      "inline-flex px-3 py-1 rounded-full text-sm font-medium",
                      sentiment === 'positive' && "bg-green-100 text-green-800",
                      sentiment === 'negative' && "bg-red-100 text-red-800",
                      sentiment === 'neutral' && "bg-gray-100 text-gray-800"
                    )}>
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </span>
                  </div>
                  
                  {/* Risks, Blockers & Questions */}
                  {risksBlockersQuestions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Risks, Blockers & Questions</h4>
                      <ul className="text-base text-gray-700 space-y-1">
                        {risksBlockersQuestions.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">No insight enrichment data available.</p>
              );
            })()}
          </div>
        </div>
      </section>



      {/* Accelerated Learning Pack Section */}
      <section id="learning" className="mb-6 sm:mb-8" aria-labelledby="learning-heading">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-600 px-4 sm:px-6 py-4 border-b border-indigo-700">
            <h2 id="learning-heading" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-100">📚</span>
              Accelerated Learning Pack
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {(() => {
              // Prioritize markdown parsing first, then backend data (exclude TL;DR as it's already shown above)
              const flashcardsContent = rawFlashcardsContent ||
                (summary.accelerated_learning_pack?.feynman_flashcards && summary.accelerated_learning_pack.feynman_flashcards.length > 0
                  ? summary.accelerated_learning_pack.feynman_flashcards.map(card => `Q: ${card.q}\nA: ${card.a}\n`).join('\n')
                  : '');
                
              const glossary = parsedGlossary.length > 0 
                ? parsedGlossary 
                : (summary.accelerated_learning_pack?.glossary || []);
                
              const quickQuiz = parsedQuickQuiz.length > 0 
                ? parsedQuickQuiz 
                : (summary.accelerated_learning_pack?.quick_quiz || []);
                
              const novelIdeaMeter = parsedNovelIdeaMeter.length > 0 
                ? parsedNovelIdeaMeter 
                : (summary.accelerated_learning_pack?.novel_idea_meter || []);
              
              const hasAnyLearningContent = flashcardsContent || glossary.length > 0 || quickQuiz.length > 0 || novelIdeaMeter.length > 0;
              
              return hasAnyLearningContent ? (
                <>
                  {/* Feynman Flashcards */}
                  {flashcardsContent && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                        🗂️ Feynman Flashcards
                      </h4>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {flashcardsContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Glossary */}
                  {glossary.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                        📖 Glossary
                        <span className="text-xs font-normal text-gray-600">
                          ({glossary.length} terms)
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {glossary.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="font-semibold text-gray-900 text-base">{item.term}:</span>
                            <div className="text-gray-700 text-base prose prose-base max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                {item.definition}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Quiz */}
                  {quickQuiz.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                        ❓ Quick Quiz
                        <span className="text-xs font-normal text-gray-600">
                          ({quickQuiz.length} questions)
                        </span>
                      </h4>
                      <div className="space-y-3">
                        {quickQuiz.map((quiz, index) => (
                          <div key={index} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-start gap-3">
                              <span className="font-mono text-xs text-gray-500 mt-0.5 flex-shrink-0">
                                {index + 1}.
                              </span>
                              <div className="flex-1 space-y-1">
                                <div className="text-base font-medium text-gray-900 prose prose-base max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                    {quiz.q}
                                  </ReactMarkdown>
                                </div>
                                <div className="text-base text-gray-600 italic prose prose-base max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                    {`→ ${quiz.a}`}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Novel-Idea Meter */}
                  {novelIdeaMeter.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                        💡 Novel-Idea Meter
                        <span className="text-xs font-normal text-gray-600">
                          ({novelIdeaMeter.length} ideas)
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {novelIdeaMeter.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <div className="text-base text-gray-700 prose prose-base max-w-none flex-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                {item.insight}
                              </ReactMarkdown>
                            </div>
                            <div className="flex items-center gap-0.5 ml-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={star <= item.score ? "text-yellow-500" : "text-gray-300"}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">No learning pack data available.</p>
              );
            })()}
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