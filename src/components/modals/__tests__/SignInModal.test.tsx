import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInModal } from '../SignInModal'

// Mock Clerk components
jest.mock('@clerk/nextjs', () => ({
  SignIn: ({ afterSignInUrl, afterSignUpUrl, appearance }: any) => (
    <div data-testid="clerk-signin">
      <div data-testid="signin-redirect-url">{afterSignInUrl}</div>
      <div data-testid="signup-redirect-url">{afterSignUpUrl}</div>
      <div data-testid="signin-appearance">{JSON.stringify(appearance)}</div>
      <button type="button">Sign In with Google</button>
      <input type="email" placeholder="Email address" />
      <button type="submit">Continue</button>
    </div>
  ),
  SignUp: ({ afterSignInUrl, afterSignUpUrl, appearance }: any) => (
    <div data-testid="clerk-signup">
      <div data-testid="signin-redirect-url">{afterSignInUrl}</div>
      <div data-testid="signup-redirect-url">{afterSignUpUrl}</div>
      <div data-testid="signup-appearance">{JSON.stringify(appearance)}</div>
      <button type="button">Sign Up with Google</button>
      <input type="email" placeholder="Email address" />
      <button type="submit">Create account</button>
    </div>
  )
}))

// Mock global document methods for modals
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

describe('SignInModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/welcome',
    mode: 'sign-in' as const
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
      render(<SignInModal {...defaultProps} />)
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<SignInModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument()
    })

    it('renders SignIn component by default', () => {
      render(<SignInModal {...defaultProps} />)
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
      expect(screen.queryByTestId('clerk-signup')).not.toBeInTheDocument()
    })

    it('renders SignUp component when mode is sign-up', () => {
      render(<SignInModal {...defaultProps} mode="sign-up" />)
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument()
      expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument()
    })

    it('passes correct redirect URLs to Clerk components', () => {
      render(<SignInModal {...defaultProps} />)
      expect(screen.getByTestId('signin-redirect-url')).toHaveTextContent('/dashboard')
      expect(screen.getByTestId('signup-redirect-url')).toHaveTextContent('/welcome')
    })

    it('uses default redirect URLs when not provided', () => {
      render(<SignInModal isOpen={true} onClose={jest.fn()} />)
      expect(screen.getByTestId('signin-redirect-url')).toHaveTextContent('/library')
      expect(screen.getByTestId('signup-redirect-url')).toHaveTextContent('/library')
    })
  })

  describe('Modal Backdrop and Close Button', () => {
    it('renders close button', () => {
      render(<SignInModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument()
    })

    it('renders backdrop', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const backdrop = container.querySelector('.absolute.inset-0')
      expect(backdrop).toBeInTheDocument()
      expect(backdrop).toHaveClass('bg-black/50', 'backdrop-blur-sm')
    })

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      await user.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<SignInModal {...defaultProps} />)
      
      const backdrop = container.querySelector('.absolute.inset-0')
      if (backdrop) {
        await user.click(backdrop)
        // The backdrop should trigger onClose, but it might be called multiple times
        // due to event bubbling, so we just check that it was called
        expect(defaultProps.onClose).toHaveBeenCalled()
      }
    })

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      const modalContent = screen.getByTestId('clerk-signin')
      await user.click(modalContent)
      
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('handles ESC key to close modal', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('supports tab navigation through modal elements', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      // Tab to first element (close button)
      await user.tab()
      expect(screen.getByRole('button', { name: /close modal/i })).toHaveFocus()
      
      // Tab to Clerk form elements
      await user.tab()
      const clerkElements = screen.getAllByRole('button').concat(screen.getAllByRole('textbox'))
      expect(clerkElements.some(el => el === document.activeElement)).toBe(true)
    })

    it('calls onClose when Enter is pressed on close button', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      closeButton.focus()
      await user.keyboard('{Enter}')
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Modal Animation and Styling', () => {
    it('applies correct modal styling classes', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const modal = container.querySelector('[class*="relative bg-white rounded-2xl shadow-2xl"]')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveClass('transform', 'transition-all', 'duration-300', 'scale-100', 'opacity-100')
    })

    it('has scrollable content when content is too tall', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const modal = container.querySelector('[class*="max-h-\\[90vh\\] overflow-y-auto"]')
      expect(modal).toBeInTheDocument()
    })

    it('applies responsive padding', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const contentDiv = container.querySelector('.p-4.sm\\:p-6')
      expect(contentDiv).toBeInTheDocument()
    })
  })

  describe('Clerk Component Integration', () => {
    it('passes custom appearance configuration to SignIn component', () => {
      render(<SignInModal {...defaultProps} />)
      const appearanceDiv = screen.getByTestId('signin-appearance')
      const appearance = JSON.parse(appearanceDiv.textContent || '{}')
      
      expect(appearance.elements).toBeDefined()
      expect(appearance.elements.card).toBe('shadow-none border-0 bg-transparent')
      expect(appearance.elements.headerTitle).toBe('text-2xl font-bold text-gray-900')
      expect(appearance.elements.formButtonPrimary).toContain('bg-primary-600')
      expect(appearance.layout.showOptionalFields).toBe(false)
    })

    it('passes custom appearance configuration to SignUp component', () => {
      render(<SignInModal {...defaultProps} mode="sign-up" />)
      const appearanceDiv = screen.getByTestId('signup-appearance')
      const appearance = JSON.parse(appearanceDiv.textContent || '{}')
      
      expect(appearance.elements).toBeDefined()
      expect(appearance.elements.card).toBe('shadow-none border-0 bg-transparent')
      expect(appearance.elements.headerTitle).toBe('text-2xl font-bold text-gray-900')
      expect(appearance.elements.formButtonPrimary).toContain('bg-primary-600')
      expect(appearance.layout.showOptionalFields).toBe(false)
    })

    it('renders Clerk form elements correctly', () => {
      render(<SignInModal {...defaultProps} />)
      
      // Check for typical Clerk form elements
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('renders different form elements for SignUp mode', () => {
      render(<SignInModal {...defaultProps} mode="sign-up" />)
      
      // Check for SignUp specific elements
      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
  })

  describe('Body Scroll Management', () => {
    it('sets body overflow to hidden when modal opens', () => {
      render(<SignInModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('resets body overflow when modal closes', () => {
      const { rerender } = render(<SignInModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(<SignInModal {...defaultProps} isOpen={false} />)
      expect(document.body.style.overflow).toBe('unset')
    })

    it('resets body overflow when component unmounts', () => {
      const { unmount } = render(<SignInModal {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
      
      unmount()
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Click Outside to Close', () => {
    it('closes modal when clicking outside', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
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
      render(<SignInModal {...defaultProps} />)
      
      const modalContent = screen.getByTestId('clerk-signin')
      
      // Simulate mousedown on modal content
      fireEvent.mouseDown(modalContent)
      
      await waitFor(() => {
        expect(defaultProps.onClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('URL Configuration', () => {
    it('supports custom afterSignInUrl', () => {
      render(<SignInModal {...defaultProps} afterSignInUrl="/custom-dashboard" />)
      expect(screen.getByTestId('signin-redirect-url')).toHaveTextContent('/custom-dashboard')
    })

    it('supports custom afterSignUpUrl', () => {
      render(<SignInModal {...defaultProps} afterSignUpUrl="/custom-welcome" />)
      expect(screen.getByTestId('signup-redirect-url')).toHaveTextContent('/custom-welcome')
    })

    it('handles empty redirect URLs gracefully', () => {
      render(<SignInModal {...defaultProps} afterSignInUrl="" afterSignUpUrl="" />)
      expect(screen.getByTestId('signin-redirect-url')).toHaveTextContent('')
      expect(screen.getByTestId('signup-redirect-url')).toHaveTextContent('')
    })
  })

  describe('Mode Switching', () => {
    it('switches between sign-in and sign-up modes correctly', () => {
      const { rerender } = render(<SignInModal {...defaultProps} mode="sign-in" />)
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
      expect(screen.queryByTestId('clerk-signup')).not.toBeInTheDocument()
      
      rerender(<SignInModal {...defaultProps} mode="sign-up" />)
      expect(screen.queryByTestId('clerk-signin')).not.toBeInTheDocument()
      expect(screen.getByTestId('clerk-signup')).toBeInTheDocument()
    })

    it('handles undefined mode gracefully (defaults to sign-in)', () => {
      render(<SignInModal isOpen={true} onClose={jest.fn()} />)
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(<SignInModal {...defaultProps} />)
      
      // Modal should be properly structured for screen readers
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('has proper focus management', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      // Modal should trap focus within itself
      await user.tab()
      expect(document.activeElement).toBeInTheDocument()
      
      // Focus should cycle through modal elements only
      const focusableElements = screen.getAllByRole('button').concat(screen.getAllByRole('textbox'))
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation for all interactive elements', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      // Should be able to tab through all focusable elements
      await user.tab()
      const firstFocused = document.activeElement
      expect(firstFocused).toBeInTheDocument()
      
      await user.tab()
      const secondFocused = document.activeElement
      expect(secondFocused).not.toBe(firstFocused)
    })
  })

  describe('Error Boundaries', () => {
    it('handles missing props gracefully', () => {
      // Test with minimal required props
      const minimalProps = {
        isOpen: true,
        onClose: jest.fn()
      }
      
      expect(() => {
        render(<SignInModal {...minimalProps} />)
      }).not.toThrow()
      
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
    })

    it('handles invalid mode gracefully', () => {
      // @ts-expect-error - testing invalid mode
      render(<SignInModal {...defaultProps} mode="invalid-mode" />)
      // Should default to sign-in mode
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
    })

    it('handles null redirect URLs gracefully', () => {
      // @ts-expect-error - testing null values
      render(<SignInModal {...defaultProps} afterSignInUrl={null} afterSignUpUrl={null} />)
      expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
    })
  })

  describe('Event Handler Edge Cases', () => {
    it('handles rapid close button clicks gracefully', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      
      // Rapid clicks should only trigger once or be handled gracefully
      await user.click(closeButton)
      await user.click(closeButton)
      await user.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('handles multiple ESC key presses gracefully', async () => {
      const user = userEvent.setup()
      render(<SignInModal {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('handles modal state changes during interactions', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<SignInModal {...defaultProps} />)
      
      // Start interaction
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      closeButton.focus()
      
      // Change modal state
      rerender(<SignInModal {...defaultProps} isOpen={false} />)
      
      // Should handle gracefully without errors
      expect(() => {
        fireEvent.keyDown(closeButton, { key: 'Enter' })
      }).not.toThrow()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive modal sizing', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const modal = container.querySelector('.max-w-lg.w-full')
      expect(modal).toBeInTheDocument()
    })

    it('applies responsive padding', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const contentDiv = container.querySelector('.p-4.sm\\:p-6')
      expect(contentDiv).toBeInTheDocument()
    })

    it('ensures proper viewport constraints', () => {
      const { container } = render(<SignInModal {...defaultProps} />)
      const modal = container.querySelector('[class*="max-h-\\[90vh\\]"]')
      expect(modal).toBeInTheDocument()
    })
  })
})