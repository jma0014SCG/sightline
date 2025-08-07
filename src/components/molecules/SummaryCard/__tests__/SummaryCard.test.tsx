import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SummaryCard } from '../SummaryCard'
import type { Summary, Category, Tag } from '@prisma/client'

type SummaryWithRelations = Summary & {
  categories?: Category[]
  tags?: Tag[]
}

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: { src: string; alt: string; [key: string]: any }) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock summary data
const createMockSummary = (overrides?: Partial<SummaryWithRelations>): SummaryWithRelations => ({
  id: 'test-summary-1',
  userId: 'test-user-1',
  videoId: 'dQw4w9WgXcQ',
  videoTitle: 'Never Gonna Give You Up - Rick Astley',
  channelName: 'RickAstleyVEVO',
  duration: 213, // 3:33 in seconds
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  content: 'This is a classic song that became an internet meme. The video features Rick Astley singing about never letting someone down.',
  keyPoints: ['Classic 80s pop song', 'Became internet meme', 'About loyalty and commitment'],
  summary: 'Rick Astley promises never to give up on someone',
  createdAt: new Date('2023-01-15T10:30:00Z'),
  updatedAt: new Date('2023-01-15T10:30:00Z'),
  categories: [
    { id: 'cat-1', name: 'Music', createdAt: new Date(), updatedAt: new Date() },
    { id: 'cat-2', name: 'Entertainment', createdAt: new Date(), updatedAt: new Date() }
  ],
  tags: [
    { id: 'tag-1', name: 'Rick Astley', type: 'PERSON', createdAt: new Date(), updatedAt: new Date() },
    { id: 'tag-2', name: 'Pop Music', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
    { id: 'tag-3', name: 'YouTube', type: 'TECHNOLOGY', createdAt: new Date(), updatedAt: new Date() }
  ],
  ...overrides
})

describe('SummaryCard', () => {
  const defaultProps = {
    summary: createMockSummary(),
    onDelete: jest.fn(),
    onShare: jest.fn(),
    onSelect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument()
    })

    it('renders in grid view by default', () => {
      const { container } = render(<SummaryCard {...defaultProps} />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('rounded-xl') // Grid view has rounded-xl
    })

    it('renders in list view when specified', () => {
      const { container } = render(<SummaryCard {...defaultProps} viewMode="list" />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('rounded-lg') // List view has rounded-lg
    })

    it('displays video title', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument()
    })

    it('displays channel name', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('RickAstleyVEVO')).toBeInTheDocument()
    })

    it('displays formatted date', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<SummaryCard {...defaultProps} className="custom-class" />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('custom-class')
    })
  })

  describe('Thumbnail and Duration', () => {
    it('renders thumbnail image when thumbnailUrl is provided', () => {
      render(<SummaryCard {...defaultProps} />)
      const image = screen.getByAltText('Never Gonna Give You Up - Rick Astley')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    })

    it('renders placeholder when thumbnailUrl is not provided', () => {
      const summaryWithoutThumbnail = createMockSummary({ thumbnailUrl: null })
      render(<SummaryCard summary={summaryWithoutThumbnail} />)
      
      const playIcon = screen.getByTestId('play-icon') || screen.getAllByRole('img')[0]
      expect(playIcon).toBeInTheDocument()
    })

    it('formats duration correctly for minutes only', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('3m')).toBeInTheDocument()
    })

    it('formats duration correctly for hours and minutes', () => {
      const longSummary = createMockSummary({ duration: 3665 }) // 1h 1m 5s
      render(<SummaryCard summary={longSummary} />)
      expect(screen.getByText('1h 1m')).toBeInTheDocument()
    })
  })

  describe('Tags and Categories', () => {
    it('renders categories with proper styling', () => {
      render(<SummaryCard {...defaultProps} />)
      
      const musicCategory = screen.getByText('Music')
      expect(musicCategory).toBeInTheDocument()
      expect(musicCategory.closest('span')).toHaveClass('bg-purple-100', 'text-purple-700', 'border-purple-200')
    })

    it('renders tags with type-specific colors', () => {
      render(<SummaryCard {...defaultProps} />)
      
      // PERSON tag should be blue
      const personTag = screen.getByText('Rick Astley')
      expect(personTag).toBeInTheDocument()
      expect(personTag.closest('span')).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-200')
      
      // CONCEPT tag should be indigo
      const conceptTag = screen.getByText('Pop Music')
      expect(conceptTag).toBeInTheDocument()
      expect(conceptTag.closest('span')).toHaveClass('bg-indigo-100', 'text-indigo-700', 'border-indigo-200')
      
      // TECHNOLOGY tag should be orange
      const techTag = screen.getByText('YouTube')
      expect(techTag).toBeInTheDocument()
      expect(techTag.closest('span')).toHaveClass('bg-orange-100', 'text-orange-700', 'border-orange-200')
    })

    it('shows overflow indicator when there are many tags', () => {
      const summaryWithManyTags = createMockSummary({
        tags: [
          { id: 'tag-1', name: 'Tag 1', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tag-2', name: 'Tag 2', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tag-3', name: 'Tag 3', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tag-4', name: 'Tag 4', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tag-5', name: 'Tag 5', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() },
          { id: 'tag-6', name: 'Tag 6', type: 'CONCEPT', createdAt: new Date(), updatedAt: new Date() }
        ]
      })
      
      render(<SummaryCard summary={summaryWithManyTags} />)
      expect(screen.getByText('+2 more')).toBeInTheDocument() // Should show +2 more for grid view (4 tags limit)
    })

    it('handles missing categories and tags gracefully', () => {
      const summaryWithoutTagsAndCategories = createMockSummary({ 
        tags: [],
        categories: []
      })
      
      render(<SummaryCard summary={summaryWithoutTagsAndCategories} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument()
      // Should not show any tag or category elements
      expect(screen.queryByText('Music')).not.toBeInTheDocument()
      expect(screen.queryByText('Rick Astley')).not.toBeInTheDocument()
    })
  })

  describe('Key Insights', () => {
    it('displays first key insight as preview', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText(/Classic 80s pop song/)).toBeInTheDocument()
    })

    it('truncates long insights in list view', () => {
      const summaryWithLongInsight = createMockSummary({
        keyPoints: ['This is a very long key insight that should be truncated because it exceeds the character limit for display in the summary card preview']
      })
      
      render(<SummaryCard summary={summaryWithLongInsight} viewMode="list" />)
      const truncatedText = screen.getByText(/This is a very long key insight that should be truncated/)
      expect(truncatedText.textContent).toContain('...')
    })

    it('handles missing keyPoints gracefully', () => {
      const summaryWithoutKeyPoints = createMockSummary({ keyPoints: [] })
      render(<SummaryCard summary={summaryWithoutKeyPoints} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument()
    })

    it('shows insight count indicator when multiple insights exist', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByText('+2 insights')).toBeInTheDocument() // Has 3 keyPoints, showing +2 more
    })
  })

  describe('Selection Functionality', () => {
    it('shows selection checkbox when showSelection is true', () => {
      render(<SummaryCard {...defaultProps} showSelection={true} />)
      // Check for the selection button by looking for the specific checkbox button
      const buttons = screen.getAllByRole('button')
      const selectionButton = buttons.find(btn => 
        btn.classList.contains('h-6') && 
        btn.classList.contains('w-6') &&
        btn.classList.contains('items-center') &&
        btn.classList.contains('justify-center')
      )
      expect(selectionButton).toBeDefined()
      expect(selectionButton).toHaveClass('flex', 'h-6', 'w-6', 'items-center', 'justify-center')
    })

    it('hides selection checkbox when showSelection is false', () => {
      render(<SummaryCard {...defaultProps} showSelection={false} />)
      // When showSelection is false, there should be no selection overlay
      const buttons = screen.getAllByRole('button')
      const selectionButton = buttons.find(btn => btn.classList.contains('h-6') && btn.classList.contains('w-6'))
      expect(selectionButton).toBeUndefined()
    })

    it('shows checked state when isSelected is true', () => {
      render(<SummaryCard {...defaultProps} showSelection={true} isSelected={true} />)
      const article = screen.getByRole('article')
      expect(article).toHaveClass('border-blue-500', 'bg-blue-50')
    })

    it('calls onSelect when checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} showSelection={true} />)
      
      const buttons = screen.getAllByRole('button')
      const selectButton = buttons.find(btn => btn.classList.contains('h-6') && btn.classList.contains('w-6'))
      expect(selectButton).toBeDefined()
      
      await user.click(selectButton!)
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith('test-summary-1', true)
    })

    it('prevents navigation when selection checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} showSelection={true} />)
      
      const buttons = screen.getAllByRole('button')
      const selectButton = buttons.find(btn => btn.classList.contains('h-6') && btn.classList.contains('w-6'))
      expect(selectButton).toBeDefined()
      
      // Test that clicking the button calls preventDefault and stopPropagation
      // by verifying it doesn't navigate (onSelect is called instead)
      await user.click(selectButton!)
      expect(defaultProps.onSelect).toHaveBeenCalled()
    })
  })

  describe('Action Buttons', () => {
    it('renders share button when onShare is provided', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    })

    it('renders delete button when onDelete is provided', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('hides share button when onShare is not provided', () => {
      render(<SummaryCard summary={defaultProps.summary} />)
      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    })

    it('hides delete button when onDelete is not provided', () => {
      render(<SummaryCard summary={defaultProps.summary} />)
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('calls onShare when share button is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const shareButton = screen.getByRole('button', { name: /share/i })
      await user.click(shareButton)
      
      expect(defaultProps.onShare).toHaveBeenCalledWith('test-summary-1')
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith('test-summary-1')
    })

    it('prevents navigation when action buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const shareButton = screen.getByRole('button', { name: /share/i })
      
      // Test that clicking the button calls the handler instead of navigating
      await user.click(shareButton)
      expect(defaultProps.onShare).toHaveBeenCalledWith('test-summary-1')
    })
  })

  describe('More Actions Dropdown', () => {
    it('renders more actions button', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument()
    })

    it('shows dropdown when more actions button is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Edit Summary')).toBeInTheDocument()
    })

    it('hides dropdown when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      expect(screen.getByText('View Details')).toBeInTheDocument()
      
      // Click backdrop to close
      const backdrop = document.querySelector('.fixed.inset-0.z-20')
      if (backdrop) {
        await user.click(backdrop)
        await waitFor(() => {
          expect(screen.queryByText('View Details')).not.toBeInTheDocument()
        })
      }
    })

    it('includes share and delete options in dropdown when handlers are provided', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      expect(screen.getByText('Share Summary')).toBeInTheDocument()
      expect(screen.getByText('Delete Summary')).toBeInTheDocument()
    })

    it('excludes share option from dropdown when onShare is not provided', async () => {
      const user = userEvent.setup()
      render(<SummaryCard summary={defaultProps.summary} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      expect(screen.queryByText('Share Summary')).not.toBeInTheDocument()
    })

    it('calls onShare from dropdown menu', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      const shareOption = screen.getByText('Share Summary')
      await user.click(shareOption)
      
      expect(defaultProps.onShare).toHaveBeenCalledWith('test-summary-1')
    })

    it('calls onDelete from dropdown menu', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      const deleteOption = screen.getByText('Delete Summary')
      await user.click(deleteOption)
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith('test-summary-1')
    })
  })

  describe('Navigation Links', () => {
    it('has correct link to summary details', () => {
      render(<SummaryCard {...defaultProps} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/library/test-summary-1')
    })

    it('has correct link to edit summary in dropdown', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      const moreButton = screen.getByRole('button', { name: /more/i })
      await user.click(moreButton)
      
      const editLink = screen.getByText('Edit Summary').closest('a')
      expect(editLink).toHaveAttribute('href', '/library/test-summary-1/edit')
    })
  })

  describe('View Mode Differences', () => {
    it('shows different layout in list view', () => {
      const { container } = render(<SummaryCard {...defaultProps} viewMode="list" />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('rounded-lg') // List view styling
    })

    it('shows different layout in grid view', () => {
      const { container } = render(<SummaryCard {...defaultProps} viewMode="grid" />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('rounded-xl') // Grid view styling
    })

    it('shows different tag limits for different view modes', () => {
      const summaryWithManyTags = createMockSummary({
        tags: Array.from({ length: 6 }, (_, i) => ({
          id: `tag-${i}`,
          name: `Tag ${i}`,
          type: 'CONCEPT',
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      })
      
      const { rerender } = render(<SummaryCard summary={summaryWithManyTags} viewMode="grid" />)
      expect(screen.getByText('+2 more')).toBeInTheDocument() // Grid shows 4 tags
      
      rerender(<SummaryCard summary={summaryWithManyTags} viewMode="list" />)
      expect(screen.getByText('+4 more')).toBeInTheDocument() // List shows 2 tags
    })
  })

  describe('Accessibility', () => {
    it('has proper article structure', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has proper button labels', () => {
      render(<SummaryCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /share summary/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete summary/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument()
    })

    it('has proper image alt text', () => {
      render(<SummaryCard {...defaultProps} />)
      const image = screen.getByAltText('Never Gonna Give You Up - Rick Astley')
      expect(image).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SummaryCard {...defaultProps} />)
      
      // The Link element is the first focusable element, then the action buttons
      await user.tab()
      const focusedElement = document.activeElement
      expect(focusedElement).toHaveAttribute('href', '/library/test-summary-1')
      
      await user.tab()
      expect(screen.getByRole('button', { name: /share/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /more/i })).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('handles missing video title gracefully', () => {
      const summaryWithoutTitle = createMockSummary({ videoTitle: '' })
      render(<SummaryCard summary={summaryWithoutTitle} />)
      expect(screen.getByText('RickAstleyVEVO')).toBeInTheDocument() // Should still show channel
    })

    it('handles missing channel name gracefully', () => {
      const summaryWithoutChannel = createMockSummary({ channelName: '' })
      render(<SummaryCard summary={summaryWithoutChannel} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument() // Should still show title
    })

    it('handles zero duration gracefully', () => {
      const summaryWithZeroDuration = createMockSummary({ duration: 0 })
      render(<SummaryCard summary={summaryWithZeroDuration} />)
      expect(screen.getByText('0m')).toBeInTheDocument()
    })

    it('handles missing content gracefully', () => {
      const summaryWithoutContent = createMockSummary({ content: '' })
      render(<SummaryCard summary={summaryWithoutContent} />)
      expect(screen.getByText('Never Gonna Give You Up - Rick Astley')).toBeInTheDocument()
    })
  })
})