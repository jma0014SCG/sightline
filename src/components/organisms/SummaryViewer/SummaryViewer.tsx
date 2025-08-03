'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Summary } from '@prisma/client'
import { ShareModal } from '@/components/molecules/ShareModal'
import { ActionsSidebar } from '@/components/molecules/ActionsSidebar'
import { KeyMomentsSidebar } from '@/components/molecules/KeyMomentsSidebar'
import { LearningHubTabs } from '@/components/molecules/LearningHubTabs'
import { MainContentColumn } from '@/components/molecules/MainContentColumn'

// Backend data structure interfaces
import type { 
  SummaryViewerProps, 
  BackendKeyMoment, 
  BackendFlashcard, 
  BackendQuizQuestion, 
  BackendFramework, 
  BackendPlaybook, 
  BackendNovelIdea, 
  BackendInsightEnrichment, 
  BackendAcceleratedLearningPack 
} from './SummaryViewer.types'

export function SummaryViewer({ 
  summary, 
  isStreaming = false,
  className 
}: SummaryViewerProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  // Progressive disclosure: Start with reference sections collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(['frameworks', 'debunked', 'practice', 'playbooks', 'enrichment', 'learning']) // Start with reference sections collapsed
  )

  // YouTube player state management
  const [player, setPlayer] = useState<any>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  const openShareModal = () => setShowShareModal(true)
  const closeShareModal = () => setShowShareModal(false)

  // Initialize YouTube player
  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !summary.videoId) return

    const newPlayer = new (window as any).YT.Player(playerRef.current, {
      height: '315',
      width: '560',
      videoId: summary.videoId,
      playerVars: {
        'modestbranding': 1,
        'rel': 0,
        'showinfo': 0,
      },
      events: {
        'onReady': (event: any) => {
          setPlayerReady(true)
        },
        'onError': (event: any) => {
          console.error('YouTube player error:', event.data)
        }
      },
    })
    setPlayer(newPlayer)
  }, [summary.videoId])

  // YouTube player initialization and API loading
  useEffect(() => {
    // Only load player if we have a valid videoId
    if (!summary.videoId) return

    // Check if YouTube API is already loaded
    if (typeof (window as any).YT !== 'undefined' && (window as any).YT.Player) {
      initializePlayer()
    } else {
      // Load YouTube IFrame API
      const existingScript = document.getElementById('youtube-api')
      if (!existingScript) {
        const script = document.createElement('script')
        script.id = 'youtube-api'
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.body.appendChild(script)

        // Set up the callback for when the API is ready
        ;(window as any).onYouTubeIframeAPIReady = () => {
          initializePlayer()
        }
      } else if ((window as any).YT && (window as any).YT.Player) {
        // API is loaded but player not initialized
        initializePlayer()
      }
    }
  }, [initializePlayer, summary.videoId])

  // Handle timestamp click navigation
  const handleTimestampClick = (timestamp: string) => {
    if (player && playerReady) {
      const seconds = parseTimestampToSeconds(timestamp)
      player.seekTo(seconds, true)
      player.playVideo()
    }
  }

  // Parse timestamp string to seconds
  const parseTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number)
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1] // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2] // HH:MM:SS
    }
    return 0
  }

  // Toggle section collapse/expand
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Parse content into sections
  const sections = new Map<string, string>()
  
  // Parse the content into sections based on markdown headers
  if (summary.content) {
    const lines = summary.content.split('\n')
    let currentSection = ''
    let currentContent: string[] = []
    
    for (const line of lines) {
      const headerMatch = line.match(/^#+\s*(.+)/)
      if (headerMatch) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections.set(currentSection.toLowerCase(), currentContent.join('\n').trim())
        }
        // Start new section
        currentSection = headerMatch[1].trim()
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }
    
    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections.set(currentSection.toLowerCase(), currentContent.join('\n').trim())
    }
  }

  // Extract structured data from summary
  const keyMoments: BackendKeyMoment[] = summary.metadata?.key_moments || []
  const frameworks: BackendFramework[] = summary.frameworks || []
  const playbooks: BackendPlaybook[] = summary.playbooks || []
  const flashcards: BackendFlashcard[] = summary.flashcards || []
  const quizQuestions: BackendQuizQuestion[] = summary.quiz_questions || []

  // Parse glossary from content
  const parseSectionToGlossary = (content: string): Array<{ term: string; definition: string }> => {
    const glossaryItems: Array<{ term: string; definition: string }> = []
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('**') && line.includes(':**')) {
        const termMatch = line.match(/\*\*(.+?):\*\*(.*)/)
        if (termMatch) {
          glossaryItems.push({
            term: termMatch[1].trim(),
            definition: termMatch[2].trim()
          })
        }
      }
    }
    
    return glossaryItems
  }

  const glossary = parseSectionToGlossary(sections.get('glossary') || '')

  return (
    <article className={cn("max-w-7xl mx-auto bg-slate-50 px-6 sm:px-8 lg:px-12 py-8", className)} aria-label="Video summary">
      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Main Content Column (2/3 width on large screens) */}
        <div className="lg:col-span-2">
          <MainContentColumn
            summary={summary}
            playerRef={playerRef}
            playerReady={playerReady}
            sections={sections}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            formatDuration={formatDuration}
          />
        </div>
        
        {/* Sidebar (1/3 width on large screens) */}
        <div className="lg:col-span-1 space-y-10">
          {/* Actions Sidebar */}
          <ActionsSidebar
            summary={summary}
            onShare={openShareModal}
          />
          
          {/* Key Moments Sidebar */}
          {keyMoments.length > 0 && (
            <KeyMomentsSidebar
              keyMoments={keyMoments}
              onTimestampClick={handleTimestampClick}
              playerReady={playerReady}
            />
          )}
          
          {/* Learning Hub Tabs */}
          <LearningHubTabs
            frameworks={frameworks}
            playbooks={playbooks}
            flashcards={flashcards}
            quizQuestions={quizQuestions}
            glossary={glossary}
            frameworksContent={sections.get('strategic frameworks')}
            playbooksContent={sections.get('strategic playbooks')}
            flashcardsContent={sections.get('feynman flashcards')}
            quickQuizContent={sections.get('quick quiz')}
          />
        </div>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Generating summary...
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        summaryId={summary.id || ''}
        summaryTitle={summary.videoTitle || 'Untitled Summary'}
      />
    </article>
  )
}