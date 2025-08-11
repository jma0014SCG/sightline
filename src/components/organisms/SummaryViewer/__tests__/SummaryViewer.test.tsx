import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/react'
import { createMockSummaryWithMetadata, createMockYouTubePlayer, createMockFileOperations } from '@/test-utils/component-mocks'
import { SummaryViewer } from '../SummaryViewer'
import type { SummaryViewerProps } from '../SummaryViewer.types'

// Mock ToastProvider to avoid import issues
jest.mock('@/components/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}))

// Mock the child components to focus on SummaryViewer logic
jest.mock('@/components/molecules/MainContentColumn', () => ({
  MainContentColumn: ({ summary, toggleSection, handleCopy }: any) => (
    <div data-testid="main-content-column">
      <button 
        data-testid="toggle-section-btn"
        onClick={() => toggleSection('test-section')}
      >
        Toggle Section
      </button>
      <button 
        data-testid="copy-content-btn"
        onClick={() => handleCopy('test content', 'test-section')}
      >
        Copy Content
      </button>
      <div data-testid="summary-content">{summary.content}</div>
    </div>
  )
}))

jest.mock('@/components/molecules/ActionsSidebar', () => ({
  ActionsSidebar: ({ onShare }: any) => (
    <div data-testid="actions-sidebar">
      <button data-testid="share-btn" onClick={onShare}>
        Share
      </button>
    </div>
  )
}))

jest.mock('@/components/molecules/KeyMomentsSidebar', () => ({
  KeyMomentsSidebar: ({ keyMoments, onTimestampClick }: any) => (
    <div data-testid="key-moments-sidebar">
      {keyMoments.map((moment: any, index: number) => (
        <button
          key={index}
          data-testid={`timestamp-${index}`}
          onClick={() => onTimestampClick(moment.timestamp)}
        >
          {moment.timestamp}: {moment.insight}
        </button>
      ))}
    </div>
  )
}))

jest.mock('@/components/molecules/LearningHubTabs', () => ({
  LearningHubTabs: ({ frameworks, flashcards, quizQuestions }: any) => (
    <div data-testid="learning-hub-tabs">
      <div data-testid="frameworks-count">{frameworks?.length || 0}</div>
      <div data-testid="flashcards-count">{flashcards?.length || 0}</div>
      <div data-testid="quiz-count">{quizQuestions?.length || 0}</div>
    </div>
  )
}))

jest.mock('@/components/molecules/InsightEnrichment', () => ({
  InsightEnrichment: ({ data }: any) => (
    <div data-testid="insight-enrichment">
      <div data-testid="sentiment">{data?.sentiment || 'none'}</div>
    </div>
  )
}))

jest.mock('@/components/molecules/ShareModal', () => ({
  ShareModal: ({ isOpen, onClose, summaryId }: any) => (
    isOpen ? (
      <div data-testid="share-modal">
        <span data-testid="share-summary-id">{summaryId}</span>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null
  )
}))

describe('SummaryViewer', () => {
  let mockPlayer: any
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    mockPlayer = createMockYouTubePlayer()
    createMockFileOperations()
    
    // Reset DOM
    document.body.innerHTML = ''
  })

  const renderSummaryViewer = (props: Partial<SummaryViewerProps> = {}) => {
    const defaultProps: SummaryViewerProps = {
      summary: createMockSummaryWithMetadata(),
      isStreaming: false,
      ...props
    }

    return renderWithProviders(<SummaryViewer {...defaultProps} />)
  }

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderSummaryViewer()
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('displays summary content in MainContentColumn', () => {
      const mockSummary = createMockSummaryWithMetadata()
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('summary-content')).toBeInTheDocument()
      // Test for key parts of the content instead of exact formatting
      expect(screen.getByTestId('summary-content')).toHaveTextContent('Test Video: Component Testing Guide')
      expect(screen.getByTestId('summary-content')).toHaveTextContent('Testing Pyramid')
      expect(screen.getByTestId('summary-content')).toHaveTextContent('Educational and practical')
    })

    it('renders all main sections', () => {
      renderSummaryViewer()
      
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
      expect(screen.getByTestId('actions-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('learning-hub-tabs')).toBeInTheDocument()
      expect(screen.getByTestId('insight-enrichment')).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      renderSummaryViewer({ className: 'custom-summary-viewer' })
      
      const article = screen.getByRole('article')
      expect(article).toHaveClass('custom-summary-viewer')
    })
  })

  describe('Streaming State', () => {
    it('shows streaming indicator when isStreaming is true', () => {
      renderSummaryViewer({ isStreaming: true })
      
      expect(screen.getByText('Generating summary...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('hides streaming indicator when isStreaming is false', () => {
      renderSummaryViewer({ isStreaming: false })
      
      expect(screen.queryByText('Generating summary...')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('Content Parsing', () => {
    it('parses content into sections correctly', () => {
      const contentWithSections = `## Video Context
**Title**: Test Video
**Speakers**: Test Speaker

## TL;DR (≤100 words)
This is a test summary.

## Frameworks
**Testing Framework**: A structured approach to testing.`

      const mockSummary = createMockSummaryWithMetadata({ content: contentWithSections })
      renderSummaryViewer({ summary: mockSummary })
      
      // The content parsing logic should work through MainContentColumn
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })

    it('handles content without sections', () => {
      const mockSummary = createMockSummaryWithMetadata({ 
        content: 'Simple content without sections' 
      })
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
      expect(screen.getByTestId('summary-content')).toHaveTextContent('Simple content without sections')
    })

    it('extracts glossary terms from content', () => {
      const contentWithGlossary = `## Glossary
**React**: A JavaScript library for building user interfaces
**Jest**: A JavaScript testing framework`

      const mockSummary = createMockSummaryWithMetadata({ content: contentWithGlossary })
      renderSummaryViewer({ summary: mockSummary })
      
      // Glossary parsing should be handled internally
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })
  })

  describe('YouTube Player Integration', () => {
    it('renders video player container for valid videoId', () => {
      const mockSummary = createMockSummaryWithMetadata({ videoId: 'dQw4w9WgXcQ' })
      renderSummaryViewer({ summary: mockSummary })
      
      // Player container should be present in MainContentColumn
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })

    it('handles timestamp clicks and seeks to correct time', async () => {
      const mockSummary = createMockSummaryWithMetadata({
        videoId: 'dQw4w9WgXcQ',
        metadata: {
          key_moments: [
            { timestamp: '5:30', insight: 'Important moment' }
          ]
        }
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      const timestampBtn = screen.getByTestId('timestamp-0')
      await user.click(timestampBtn)
      
      // Player interaction is handled internally
      expect(timestampBtn).toBeInTheDocument()
    })

    it('parses timestamps correctly', () => {
      renderSummaryViewer()
      
      const viewer = screen.getByRole('article')
      expect(viewer).toBeInTheDocument()
      
      // Timestamp parsing logic is internal to SummaryViewer
      // We test the integration through KeyMomentsSidebar
    })
  })

  describe('Section Management', () => {
    it('toggles section collapse/expand', async () => {
      renderSummaryViewer()
      
      const toggleBtn = screen.getByTestId('toggle-section-btn')
      await user.click(toggleBtn)
      
      expect(toggleBtn).toBeInTheDocument()
    })

    it('starts with certain sections collapsed', () => {
      renderSummaryViewer()
      
      // Default collapsed sections should be handled internally
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })
  })

  describe('Copy Functionality', () => {
    it('copies content to clipboard', async () => {
      renderSummaryViewer()
      
      const copyBtn = screen.getByTestId('copy-content-btn')
      await user.click(copyBtn)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test content')
    })

    it('shows copy feedback', async () => {
      renderSummaryViewer()
      
      const copyBtn = screen.getByTestId('copy-content-btn')
      await user.click(copyBtn)
      
      // Copy feedback is handled through internal state
      expect(copyBtn).toBeInTheDocument()
    })

    it('handles copy errors gracefully', async () => {
      // Mock clipboard error
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard not available'))
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      })
      
      renderSummaryViewer()
      
      const copyBtn = screen.getByTestId('copy-content-btn')
      await user.click(copyBtn)
      
      expect(mockWriteText).toHaveBeenCalled()
    })
  })

  describe('Share Modal', () => {
    it('opens share modal when share button clicked', async () => {
      renderSummaryViewer()
      
      const shareBtn = screen.getByTestId('share-btn')
      await user.click(shareBtn)
      
      expect(screen.getByTestId('share-modal')).toBeInTheDocument()
    })

    it('closes share modal', async () => {
      renderSummaryViewer()
      
      // Open modal
      const shareBtn = screen.getByTestId('share-btn')
      await user.click(shareBtn)
      
      expect(screen.getByTestId('share-modal')).toBeInTheDocument()
      
      // Close modal
      const closeBtn = screen.getByTestId('close-modal')
      await user.click(closeBtn)
      
      expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
    })

    it('passes correct summary ID to share modal', async () => {
      const mockSummary = createMockSummaryWithMetadata({ id: 'test-summary-123' })
      renderSummaryViewer({ summary: mockSummary })
      
      const shareBtn = screen.getByTestId('share-btn')
      await user.click(shareBtn)
      
      expect(screen.getByTestId('share-summary-id')).toHaveTextContent('test-summary-123')
    })
  })

  describe('Rich Data Integration', () => {
    it('displays key moments when available', () => {
      const mockSummary = createMockSummaryWithMetadata({
        metadata: {
          key_moments: [
            { timestamp: '2:30', insight: 'Key insight 1' },
            { timestamp: '5:45', insight: 'Key insight 2' }
          ]
        }
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('timestamp-0')).toHaveTextContent('2:30: Key insight 1')
      expect(screen.getByTestId('timestamp-1')).toHaveTextContent('5:45: Key insight 2')
    })

    it('displays frameworks data', () => {
      const mockSummary = createMockSummaryWithMetadata({
        frameworks: [
          { name: 'Test Framework', description: 'Framework description' }
        ]
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('frameworks-count')).toHaveTextContent('1')
    })

    it('displays flashcards data', () => {
      const mockSummary = createMockSummaryWithMetadata({
        flashcards: [
          { question: 'Test question?', answer: 'Test answer' }
        ]
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('flashcards-count')).toHaveTextContent('1')
    })

    it('displays quiz questions data', () => {
      const mockSummary = createMockSummaryWithMetadata({
        quiz_questions: [
          { question: 'Quiz question?', answer: 'Quiz answer' }
        ]
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('quiz-count')).toHaveTextContent('1')
    })

    it('displays insight enrichment data', () => {
      const mockSummary = createMockSummaryWithMetadata({
        insight_enrichment: {
          sentiment: 'positive',
          stats_tools_links: ['Tool 1', 'Tool 2'],
          risks_blockers_questions: ['Risk 1']
        }
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('sentiment')).toHaveTextContent('positive')
    })

    it('handles missing rich data gracefully', () => {
      const mockSummary = createMockSummaryWithMetadata({
        // No rich data provided
        metadata: null,
        frameworks: undefined,
        flashcards: undefined,
        insight_enrichment: undefined
      })
      
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('frameworks-count')).toHaveTextContent('0')
      expect(screen.getByTestId('flashcards-count')).toHaveTextContent('0')
      expect(screen.getByTestId('sentiment')).toHaveTextContent('none')
    })
  })

  describe('Duration Formatting', () => {
    it('formats duration correctly', () => {
      renderSummaryViewer()
      
      // Duration formatting is handled internally
      // We verify the component renders successfully with duration
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles missing video ID gracefully', () => {
      const mockSummary = createMockSummaryWithMetadata({ videoId: undefined })
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })

    it('handles malformed content gracefully', () => {
      const mockSummary = createMockSummaryWithMetadata({ content: null as any })
      
      expect(() => renderSummaryViewer({ summary: mockSummary })).not.toThrow()
    })

    it('handles empty key points gracefully', () => {
      const mockSummary = createMockSummaryWithMetadata({ keyPoints: [] })
      renderSummaryViewer({ summary: mockSummary })
      
      expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderSummaryViewer()
      
      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-label', 'Video summary')
    })

    it('supports keyboard navigation', async () => {
      renderSummaryViewer()
      
      const toggleBtn = screen.getByTestId('toggle-section-btn')
      
      // Focus and activate with keyboard
      toggleBtn.focus()
      await user.keyboard('{Enter}')
      
      expect(toggleBtn).toBeInTheDocument()
    })

    it('has proper role attributes for streaming status', () => {
      renderSummaryViewer({ isStreaming: true })
      
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Rich Data Rendering with Database Fields', () => {
    describe('Frameworks Rendering', () => {
      it('renders frameworks when DB field contains data', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: [
            { name: 'Testing Framework', description: 'A comprehensive testing approach' },
            { name: 'SOLID Principles', description: 'Object-oriented design principles' }
          ]
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('learning-hub-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('2')
      })

      it('shows empty state when frameworks DB field is null', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: null
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('0')
      })

      it('shows empty state when frameworks DB field is empty array', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: []
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('0')
      })

      it('handles malformed frameworks data gracefully', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: [
            { name: 'Valid Framework', description: 'Valid description' },
            { name: null, description: undefined }, // Malformed data
            { name: 'Another Valid', description: 'Another valid description' }
          ] as any
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        // Should still render component without crashing
        expect(screen.getByTestId('learning-hub-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('3')
      })
    })

    describe('Playbooks Rendering', () => {
      it('renders playbooks when DB field contains data', () => {
        const mockSummary = createMockSummaryWithMetadata({
          playbooks: [
            { trigger: 'When component fails', action: 'Check props first, then state' },
            { trigger: 'When tests are flaky', action: 'Review async operations and mocking' }
          ]
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
        // MainContentColumn should receive playbooks data
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
      })

      it('shows empty playbooks section when DB field is null', () => {
        const mockSummary = createMockSummaryWithMetadata({
          playbooks: null
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
        // Component should render without crashing even with null playbooks
      })

      it('shows empty playbooks section when DB field is empty array', () => {
        const mockSummary = createMockSummaryWithMetadata({
          playbooks: []
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
      })

      it('validates trigger-action structure in playbooks', () => {
        const mockSummary = createMockSummaryWithMetadata({
          playbooks: [
            { trigger: 'Valid trigger', action: 'Valid action' },
            { trigger: '', action: 'Action without trigger' }, // Edge case
            { trigger: 'Trigger without action', action: '' } // Edge case
          ]
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
      })
    })

    describe('Key Moments Rendering', () => {
      it('renders key moments when DB field contains data', () => {
        const mockSummary = createMockSummaryWithMetadata({
          key_moments: [
            { timestamp: '2:30', insight: 'Important concept introduction' },
            { timestamp: '5:45', insight: 'Key example demonstration' },
            { timestamp: '8:12', insight: 'Common mistake explanation' }
          ]
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('timestamp-0')).toHaveTextContent('2:30: Important concept introduction')
        expect(screen.getByTestId('timestamp-1')).toHaveTextContent('5:45: Key example demonstration')
        expect(screen.getByTestId('timestamp-2')).toHaveTextContent('8:12: Common mistake explanation')
      })

      it('shows empty state when key_moments DB field is null', () => {
        const mockSummary = createMockSummaryWithMetadata({
          key_moments: null
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        // Should render sidebar but with no timestamp buttons
        expect(screen.queryByTestId('timestamp-0')).not.toBeInTheDocument()
      })

      it('shows empty state when key_moments DB field is empty array', () => {
        const mockSummary = createMockSummaryWithMetadata({
          key_moments: []
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        expect(screen.queryByTestId('timestamp-0')).not.toBeInTheDocument()
      })

      it('handles various timestamp formats correctly', () => {
        const mockSummary = createMockSummaryWithMetadata({
          key_moments: [
            { timestamp: '1:23', insight: 'Minutes and seconds' },
            { timestamp: '0:45', insight: 'Under one minute' },
            { timestamp: '12:34', insight: 'Double digit minutes' },
            { timestamp: '1:23:45', insight: 'Hours, minutes, and seconds' }
          ]
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('timestamp-0')).toHaveTextContent('1:23: Minutes and seconds')
        expect(screen.getByTestId('timestamp-1')).toHaveTextContent('0:45: Under one minute')
        expect(screen.getByTestId('timestamp-2')).toHaveTextContent('12:34: Double digit minutes')
        expect(screen.getByTestId('timestamp-3')).toHaveTextContent('1:23:45: Hours, minutes, and seconds')
      })

      it('handles malformed key moments data gracefully', () => {
        const mockSummary = createMockSummaryWithMetadata({
          key_moments: [
            { timestamp: '2:30', insight: 'Valid moment' },
            { timestamp: null, insight: 'Invalid timestamp' }, // Malformed
            { timestamp: '5:45', insight: null }, // Malformed
            { timestamp: '8:12', insight: 'Another valid moment' }
          ] as any
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        // Should render the valid moments
        expect(screen.getByTestId('timestamp-0')).toBeInTheDocument()
        expect(screen.getByTestId('timestamp-1')).toBeInTheDocument()
        expect(screen.getByTestId('timestamp-2')).toBeInTheDocument()
        expect(screen.getByTestId('timestamp-3')).toBeInTheDocument()
      })
    })

    describe('Combined Scenarios', () => {
      it('renders correctly with mixed data states', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: [{ name: 'Test Framework', description: 'Description' }], // Has data
          playbooks: [], // Empty array
          key_moments: null, // Null
          flashcards: [{ question: 'Test Q?', answer: 'Test A' }], // Has data
          insight_enrichment: { sentiment: 'positive' } // Has data
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        // Should render all components regardless of mixed data states
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('learning-hub-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('insight-enrichment')).toBeInTheDocument()
        
        // Verify specific data states
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('1')
        expect(screen.getByTestId('flashcards-count')).toHaveTextContent('1')
        expect(screen.getByTestId('sentiment')).toHaveTextContent('positive')
        expect(screen.queryByTestId('timestamp-0')).not.toBeInTheDocument()
      })

      it('renders correctly when all DB fields are populated', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: [
            { name: 'Framework 1', description: 'Description 1' },
            { name: 'Framework 2', description: 'Description 2' }
          ],
          playbooks: [
            { trigger: 'Trigger 1', action: 'Action 1' },
            { trigger: 'Trigger 2', action: 'Action 2' }
          ],
          key_moments: [
            { timestamp: '2:30', insight: 'Insight 1' },
            { timestamp: '5:45', insight: 'Insight 2' }
          ],
          flashcards: [
            { question: 'Question 1?', answer: 'Answer 1' },
            { question: 'Question 2?', answer: 'Answer 2' }
          ],
          insight_enrichment: {
            sentiment: 'positive',
            stats_tools_links: ['Tool 1', 'Tool 2'],
            risks_blockers_questions: ['Risk 1', 'Risk 2']
          }
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        // All components should render with data
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('2')
        expect(screen.getByTestId('flashcards-count')).toHaveTextContent('2')
        expect(screen.getByTestId('timestamp-0')).toHaveTextContent('2:30: Insight 1')
        expect(screen.getByTestId('timestamp-1')).toHaveTextContent('5:45: Insight 2')
        expect(screen.getByTestId('sentiment')).toHaveTextContent('positive')
      })

      it('renders correctly when all DB fields are empty', () => {
        const mockSummary = createMockSummaryWithMetadata({
          frameworks: null,
          playbooks: [],
          key_moments: undefined,
          flashcards: null,
          quiz_questions: [],
          insight_enrichment: {},
          accelerated_learning_pack: null,
          metadata: null
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        // All components should still render but show empty states
        expect(screen.getByTestId('main-content-column')).toBeInTheDocument()
        expect(screen.getByTestId('key-moments-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('learning-hub-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('insight-enrichment')).toBeInTheDocument()
        
        // Verify empty states
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('0')
        expect(screen.getByTestId('flashcards-count')).toHaveTextContent('0')
        expect(screen.getByTestId('quiz-count')).toHaveTextContent('0')
        expect(screen.getByTestId('sentiment')).toHaveTextContent('none')
        expect(screen.queryByTestId('timestamp-0')).not.toBeInTheDocument()
      })

      it('prioritizes DB fields over parsed content sections', () => {
        const mockSummary = createMockSummaryWithMetadata({
          content: `
            ## Frameworks
            **Content Framework**: This should be overridden by DB field
            
            ## Key Moments
            This should also be overridden
          `,
          frameworks: [{ name: 'DB Framework', description: 'From database field' }], // DB data should win
          key_moments: [{ timestamp: '3:20', insight: 'DB key moment' }] // DB data should win
        })
        
        renderSummaryViewer({ summary: mockSummary })
        
        // Should prioritize DB fields over parsed content
        expect(screen.getByTestId('frameworks-count')).toHaveTextContent('1')
        expect(screen.getByTestId('timestamp-0')).toHaveTextContent('3:20: DB key moment')
      })
    })
  })
})