'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { MonitoringService } from '@/lib/monitoring'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
  showDetails: boolean
  isRecovering: boolean
}

// User context hook wrapper for class component
function useUserContext() {
  const { userId, sessionId, isLoaded, isSignedIn } = useAuth()
  return { userId, sessionId, isLoaded, isSignedIn }
}

// HOC to inject user context into error boundary
function withUserContext<P extends object>(
  Component: React.ComponentType<P & { userContext: ReturnType<typeof useUserContext> }>
) {
  return function WithUserContextComponent(props: P) {
    const userContext = useUserContext()
    return <Component {...props} userContext={userContext} />
  }
}

class EnhancedErrorBoundaryBase extends Component<
  Props & { userContext: ReturnType<typeof useUserContext> },
  State
> {
  private resetTimeoutId: NodeJS.Timeout | null = null
  private monitoring = MonitoringService.getInstance()
  private errorId: string | null = null

  constructor(props: Props & { userContext: ReturnType<typeof useUserContext> }) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
      isRecovering: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, userContext, level = 'component' } = this.props
    
    // Generate unique error ID for tracking
    this.errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Log to monitoring service
    this.monitoring.logError({
      error,
      context: {
        errorBoundary: true,
        errorId: this.errorId,
        level,
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1,
      },
      user: userContext.userId ? {
        id: userContext.userId,
      } : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    })

    // Send to Sentry with enhanced context
    if (userContext.userId) {
      Sentry.setUser({
        id: userContext.userId,
        sessionId: userContext.sessionId || undefined,
      })
    }

    Sentry.withScope((scope) => {
      scope.setTag('error_boundary', true)
      scope.setTag('error_boundary_level', level)
      scope.setTag('error_id', this.errorId)
      scope.setLevel('error')
      scope.setContext('error_info', {
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1,
        props: this.props.resetKeys,
      })
      Sentry.captureException(error)
    })

    // Update state
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }))

    // Call custom error handler
    onError?.(error, errorInfo)

    // Attempt auto-recovery for transient errors
    this.attemptAutoRecovery()
  }

  componentDidUpdate(prevProps: Props & { userContext: ReturnType<typeof useUserContext> }) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset on prop changes if configured
    if (hasError && prevProps.resetKeys !== resetKeys && resetOnPropsChange) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  attemptAutoRecovery = () => {
    const { level = 'component' } = this.props
    const { errorCount } = this.state

    // Only attempt auto-recovery for component-level errors
    // and if we haven't tried too many times
    if (level === 'component' && errorCount < 3) {
      this.resetTimeoutId = setTimeout(() => {
        this.setState({ isRecovering: true })
        setTimeout(() => {
          this.resetErrorBoundary()
        }, 1000)
      }, 5000)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    // Log recovery attempt
    if (this.errorId) {
      Sentry.addBreadcrumb({
        category: 'error_boundary',
        message: 'Error boundary reset',
        level: 'info',
        data: {
          errorId: this.errorId,
          errorCount: this.state.errorCount,
        },
      })
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isRecovering: false,
    })
  }

  toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }))
  }

  render() {
    const { children, fallback, isolate = true, level = 'component' } = this.props
    const { hasError, error, errorInfo, showDetails, isRecovering } = this.state

    if (hasError && error) {
      // Custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      // Recovery animation
      if (isRecovering) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Attempting to recover...</p>
            </div>
          </div>
        )
      }

      // Default error UI based on level
      const errorUI = (
        <div className={`bg-white rounded-lg shadow-lg ${
          level === 'page' ? 'min-h-screen flex items-center justify-center' : 
          level === 'section' ? 'p-8' : 'p-4'
        }`}>
          <div className="max-w-md w-full">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {level === 'page' ? 'Something went wrong' : 
                 level === 'section' ? 'This section encountered an error' :
                 'Component error'}
              </h2>
              <p className="text-gray-600 mb-6">
                {level === 'page' 
                  ? "We're sorry, but something unexpected happened. Please try refreshing the page."
                  : "This part of the page isn't working right now, but you can continue using other features."}
              </p>
              
              {this.errorId && (
                <p className="text-xs text-gray-500 mb-4">
                  Error ID: {this.errorId}
                </p>
              )}

              <div className="space-y-3">
                <Button
                  onClick={this.resetErrorBoundary}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                {level === 'page' && (
                  <Button
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                    variant="outline"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Homepage
                  </Button>
                )}

                <Button
                  onClick={this.toggleDetails}
                  className="w-full"
                  variant="ghost"
                  size="sm"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>

              {showDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded text-left">
                  <p className="text-xs text-gray-700 font-mono mb-2">
                    {error.message}
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer mb-2">Stack Trace</summary>
                        <pre className="overflow-auto max-h-40 p-2 bg-gray-100 rounded text-xs">
                          {error.stack}
                        </pre>
                      </details>
                      {errorInfo && (
                        <details className="text-xs text-gray-600 mt-2">
                          <summary className="cursor-pointer mb-2">Component Stack</summary>
                          <pre className="overflow-auto max-h-40 p-2 bg-gray-100 rounded text-xs">
                            {errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )

      // Isolate error to prevent cascading failures
      if (isolate) {
        return errorUI
      }

      // Non-isolated mode (for backwards compatibility)
      return errorUI
    }

    return children
  }
}

// Export the enhanced error boundary with user context
export const EnhancedErrorBoundary = withUserContext(EnhancedErrorBoundaryBase)

// Export a hook for imperative error handling
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    const monitoring = MonitoringService.getInstance()
    
    monitoring.logError({
      error,
      context: {
        source: 'useErrorHandler',
        componentStack: errorInfo?.componentStack,
      },
    })

    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo?.componentStack,
        },
      },
    })
  }
}