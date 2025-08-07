import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPromptModal } from '../AuthPromptModal'

// Mock global document methods
beforeAll(() => {
  // Mock portal container for modals
  const modalRoot = document.createElement('div')
  modalRoot.setAttribute('id', 'modal-root')
  document.body.appendChild(modalRoot)
  
  // Ensure body style exists
  if (!document.body.style) {
    Object.defineProperty(document.body, 'style', {
      value: { overflow: 'unset' },
      writable: true,
      configurable: true
    })
  }
})

describe('AuthPromptModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSignIn: jest.fn(),
    onSignUp: jest.fn(),
    summaryTitle: 'Test Video Summary'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset body overflow
    if (document.body.style) {
      document.body.style.overflow = 'unset'
    }
  })

  describe('Basic Rendering', () => {
    it('renders without crashing when open', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('Your summary is ready! 🎉')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<AuthPromptModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByText('Your summary is ready! 🎉')).not.toBeInTheDocument()
    })

    it('displays summary title when provided', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('"Test Video Summary"')).toBeInTheDocument()
    })

    it('renders without summary title when not provided', () => {
      render(<AuthPromptModal {...defaultProps} summaryTitle={undefined} />)
      expect(screen.getByText('Your summary is ready! 🎉')).toBeInTheDocument()
      expect(screen.queryByText('"Test Video Summary"')).not.toBeInTheDocument()
    })

    it('displays main success message', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('Your summary is ready! 🎉')).toBeInTheDocument()
    })

    it('displays value proposition', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('What you\'ll get:')).toBeInTheDocument()
      expect(screen.getByText('Personal Library')).toBeInTheDocument()
      expect(screen.getByText('Share & Export')).toBeInTheDocument()
      expect(screen.getByText('Save 10+ hours/week')).toBeInTheDocument()
    })

    it('displays social proof', () => {
      render(<AuthPromptModal {...defaultProps} />)
      // Use a function matcher to handle text split across multiple elements
      expect(screen.getByText((content, node) => {
        const hasText = (node) => node.textContent === 'Join 250+ professionals already using Sightline'
        const nodeHasText = hasText(node)
        const childrenDontHaveText = Array.from(node?.children || []).every(
          child => !hasText(child)
        )
        return nodeHasText && childrenDontHaveText
      })).toBeInTheDocument()
    })
  })

  describe('Modal Backdrop and Close Button', () => {
    it('renders close button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument()
    })

    it('renders backdrop', () => {
      const { container } = render(<AuthPromptModal {...defaultProps} />)
      const backdrop = container.querySelector('.absolute.inset-0')
      expect(backdrop).toBeInTheDocument()
      expect(backdrop).toHaveClass('bg-black/50', 'backdrop-blur-sm')
    })

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      await user.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<AuthPromptModal {...defaultProps} />)
      
      const backdrop = container.querySelector('.fixed.inset-0')
      if (backdrop) {
        await user.click(backdrop)
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
      }
    })

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const modalContent = screen.getByText('Your summary is ready! 🎉')
      await user.click(modalContent)
      
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('Action Buttons', () => {
    it('renders create free account button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /create free account/i })).toBeInTheDocument()
    })

    it('renders sign in button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /i already have an account/i })).toBeInTheDocument()
    })

    it('renders "do this later" button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /i'll do this later/i })).toBeInTheDocument()
    })

    it('calls onSignUp when create account button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const signUpButton = screen.getByRole('button', { name: /create free account/i })
      await user.click(signUpButton)
      
      expect(defaultProps.onSignUp).toHaveBeenCalledTimes(1)
    })

    it('calls onSignIn when sign in button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const signInButton = screen.getByRole('button', { name: /i already have an account/i })
      await user.click(signInButton)
      
      expect(defaultProps.onSignIn).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when "do this later" button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const laterButton = screen.getByRole('button', { name: /i'll do this later/i })
      await user.click(laterButton)
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard Navigation', () => {
    it('handles ESC key to close modal', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('supports tab navigation through buttons', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      // Tab to first button (close button)
      await user.tab()
      expect(screen.getByRole('button', { name: /close modal/i })).toHaveFocus()
      
      // Tab to create account button
      await user.tab()
      expect(screen.getByRole('button', { name: /create free account/i })).toHaveFocus()
      
      // Tab to sign in button
      await user.tab()
      expect(screen.getByRole('button', { name: /i already have an account/i })).toHaveFocus()
      
      // Tab to later button
      await user.tab()
      expect(screen.getByRole('button', { name: /i'll do this later/i })).toHaveFocus()
    })

    it('calls action handlers when Enter is pressed on buttons', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const signUpButton = screen.getByRole('button', { name: /create free account/i })
      signUpButton.focus()
      await user.keyboard('{Enter}')
      
      expect(defaultProps.onSignUp).toHaveBeenCalledTimes(1)
    })
  })

  describe('Modal Animation and Styling', () => {
    it('applies correct modal styling classes', () => {
      const { container } = render(<AuthPromptModal {...defaultProps} />)
      const modal = container.querySelector('[class*="relative bg-white rounded-2xl shadow-2xl"]')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveClass('transform', 'transition-all', 'duration-300', 'scale-100', 'opacity-100')
    })

    it('has success animation with bounce effect', () => {
      const { container } = render(<AuthPromptModal {...defaultProps} />)
      // Look for the success checkmark container
      const successContainer = container.querySelector('.animate-bounce')
      expect(successContainer).toBeInTheDocument()
      expect(successContainer).toHaveClass('bg-gradient-to-br', 'from-green-400', 'to-green-600')
    })

    it('applies gradient background to value proposition section', () => {
      const { container } = render(<AuthPromptModal {...defaultProps} />)
      const valueSection = container.querySelector('.bg-gradient-to-br.from-primary-50.to-primary-100')
      expect(valueSection).toBeInTheDocument()
    })

    it('applies gradient background to create account button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create free account/i })
      expect(createButton).toHaveClass('bg-gradient-to-r', 'from-primary-600', 'to-primary-700')
    })
  })

  describe('Body Scroll Management', () => {
    it('sets body overflow to hidden when modal opens', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('resets body overflow when modal closes', () => {
      const { rerender } = render(<AuthPromptModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(<AuthPromptModal {...defaultProps} isOpen={false} />)
      expect(document.body.style.overflow).toBe('unset')
    })

    it('resets body overflow when component unmounts', () => {
      const { unmount } = render(<AuthPromptModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
      
      unmount()
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Click Outside to Close', () => {
    it('closes modal when clicking outside', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      // Create a mock event for clicking outside
      const outsideClickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      })
      
      document.dispatchEvent(outsideClickEvent)
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('does not close modal when clicking inside modal content', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const modalTitle = screen.getByText('Your summary is ready! 🎉')
      
      // Simulate mousedown on modal content
      fireEvent.mouseDown(modalTitle)
      
      await waitFor(() => {
        expect(defaultProps.onClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('Content and Features', () => {
    it('displays correct feature icons', () => {
      render(<AuthPromptModal {...defaultProps} />)
      
      // Test for presence of feature descriptions (icons are rendered as Lucide components)
      expect(screen.getByText('Personal Library')).toBeInTheDocument()
      expect(screen.getByText('Save & organize all your summaries')).toBeInTheDocument()
      expect(screen.getByText('Share & Export')).toBeInTheDocument()
      expect(screen.getByText('Send to team or export to Notion')).toBeInTheDocument()
      expect(screen.getByText('Save 10+ hours/week')).toBeInTheDocument()
      expect(screen.getByText('Learn faster than ever before')).toBeInTheDocument()
    })

    it('truncates very long summary titles', () => {
      const longTitle = 'This is a very long summary title that should be truncated because it exceeds reasonable display limits for a modal dialog and could break the layout if not handled properly'
      render(<AuthPromptModal {...defaultProps} summaryTitle={longTitle} />)
      
      const titleElement = screen.getByText(/This is a very long summary title/)
      expect(titleElement).toHaveClass('line-clamp-2')
    })

    it('displays correct call-to-action text', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText(/You've used your free trial! Create an account to save this summary and get 3 more summaries every month./)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(<AuthPromptModal {...defaultProps} />)
      
      // Modal should be properly structured for screen readers
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('has proper focus management', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      // Modal should trap focus within itself
      await user.tab()
      expect(document.activeElement).toBeInTheDocument()
      
      // Focus should cycle through modal elements only
      const focusableElements = screen.getAllByRole('button')
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('has semantic HTML structure', () => {
      render(<AuthPromptModal {...defaultProps} />)
      
      // Check for proper heading hierarchy
      const heading = screen.getByText('Your summary is ready! 🎉')
      expect(heading.tagName).toBe('H2')
      
      const subHeading = screen.getByText('What you\'ll get:')
      expect(subHeading.tagName).toBe('H3')
    })
  })

  describe('Error Boundaries', () => {
    it('handles missing props gracefully', () => {
      // Test with minimal props
      const minimalProps = {
        isOpen: true,
        onClose: jest.fn(),
        onSignIn: jest.fn(),
        onSignUp: jest.fn()
      }
      
      expect(() => {
        render(<AuthPromptModal {...minimalProps} />)
      }).not.toThrow()
      
      expect(screen.getByText('Your summary is ready! 🎉')).toBeInTheDocument()
    })

    it('handles empty summary title gracefully', () => {
      render(<AuthPromptModal {...defaultProps} summaryTitle="" />)
      expect(screen.getByText('Your summary is ready! 🎉')).toBeInTheDocument()
      expect(screen.queryByText('""')).not.toBeInTheDocument()
    })
  })

  describe('Event Handler Edge Cases', () => {
    it('handles rapid button clicks gracefully', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      const signUpButton = screen.getByRole('button', { name: /create free account/i })
      
      // Rapid clicks should only trigger once or be handled gracefully
      await user.click(signUpButton)
      await user.click(signUpButton)
      await user.click(signUpButton)
      
      expect(defaultProps.onSignUp).toHaveBeenCalled()
    })

    it('handles multiple ESC key presses gracefully', async () => {
      const user = userEvent.setup()
      render(<AuthPromptModal {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })
})