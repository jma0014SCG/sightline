/**
 * Create summary section with URL input and progress tracking
 * 
 * @module CreateSummarySection
 * @category Components
 */

import { forwardRef } from 'react'
import { Plus, AlertCircle, Clock, Star } from 'lucide-react'
import { URLInput } from '@/components/molecules/URLInput'
import { cn } from '@/lib/utils'
import type { SummaryOperationsProgress } from '@/lib/hooks/useSummaryOperations'

export interface CreateSummarySectionProps {
  /** Handler for creating summaries */
  onCreateSummary: (url: string, fingerprint?: string) => Promise<void>
  /** Success callback */
  onSuccess?: () => void
  /** Loading state */
  isLoading?: boolean
  /** Whether creation is disabled */
  disabled?: boolean
  /** Progress data */
  progress?: SummaryOperationsProgress
  /** Usage statistics */
  usage?: {
    isLimitReached: boolean
  }
  /** Custom className */
  className?: string
}

export const CreateSummarySection = forwardRef<HTMLDivElement, CreateSummarySectionProps>(
  ({
    onCreateSummary,
    onSuccess,
    isLoading = false,
    disabled = false,
    progress,
    usage,
    className,
  }, ref) => {
    const showProgress = isLoading && progress && progress.progress > 0
    
    return (
      <div 
        ref={ref}
        className={cn("mb-8 relative overflow-hidden", className)}
      >
        {/* Background with subtle animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
        
        <div className="relative p-5 border border-blue-200/60 rounded-2xl backdrop-blur-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Create New Summary
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Transform any YouTube video into structured insights in under 60 seconds
              </p>
            </div>
          </div>
        
          <URLInput 
            onSubmit={onCreateSummary}
            onSuccess={onSuccess}
            isLoading={isLoading}
            disabled={disabled || usage?.isLimitReached}
            placeholder="Paste any YouTube URL to get started..."
            className="create-summary-enhanced"
          />
          
          {/* Quick Access Buttons */}
          {!usage?.isLimitReached && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-medium">Quick start:</span>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white hover:border-blue-200 hover:text-blue-700 transition-all duration-200">
                  <Clock className="h-4 w-4" />
                  Recent Channels
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white hover:border-purple-200 hover:text-purple-700 transition-all duration-200">
                  <Star className="h-4 w-4" />
                  Trending
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Usage warning message */}
          {usage?.isLimitReached && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 mb-1">Monthly Limit Reached</h3>
                  <p className="text-sm text-amber-700">
                    You&apos;ve reached your monthly summary limit. Upgrade to Pro for unlimited summaries and advanced features.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.href = '/billing'}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {showProgress && (
            <div className="mt-4 p-4 bg-white/70 border border-blue-300 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse animation-delay-400"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                    <span className="font-medium">{progress.stage}</span>
                    <span>{Math.round(progress.progress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

CreateSummarySection.displayName = 'CreateSummarySection'