/**
 * Empty library state with onboarding and search results
 * 
 * @module EmptyLibraryState
 * @category Components
 */

import { Plus, Search, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyLibraryStateProps {
  /** Whether this is a no-search-results state */
  isSearchResults?: boolean
  /** Current search query */
  searchQuery?: string
  /** Handler for clearing search */
  onClearSearch?: () => void
  /** Handler for scrolling to create section */
  onCreateSummary?: () => void
  /** Custom className */
  className?: string
}

export function EmptyLibraryState({
  isSearchResults = false,
  searchQuery,
  onClearSearch,
  onCreateSummary,
  className,
}: EmptyLibraryStateProps) {
  if (isSearchResults) {
    return (
      <div className={cn("text-center py-16", className)}>
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No summaries found
            </h3>
            <p className="text-gray-600 mb-6">
              No summaries match &quot;{searchQuery}&quot;. Try adjusting your search terms or filters.
            </p>
            <button
              onClick={onClearSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("text-center py-16", className)}>
      <div className="max-w-md mx-auto">
        {/* First time user onboarding */}
        <div>
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mb-8 mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <div className="relative">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Your Learning Journey Starts Here
          </h3>
          
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Transform any YouTube video into structured insights. Start building your knowledge library with AI-powered summaries.
          </p>
          
          {/* Quick start suggestions */}
          <div className="space-y-4 mb-8">
            <div className="text-sm text-gray-500 mb-3 font-medium">Try these popular channels:</div>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { name: 'TED Talks', color: 'from-red-100 to-red-200 text-red-700 border-red-200' },
                { name: 'Huberman Lab', color: 'from-blue-100 to-blue-200 text-blue-700 border-blue-200' },
                { name: 'Y Combinator', color: 'from-orange-100 to-orange-200 text-orange-700 border-orange-200' },
                { name: 'MIT OpenCourseWare', color: 'from-green-100 to-green-200 text-green-700 border-green-200' }
              ].map(channel => (
                <button 
                  key={channel.name} 
                  className={`px-4 py-2 bg-gradient-to-r ${channel.color} border rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200`}
                  onClick={onCreateSummary}
                >
                  {channel.name}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={onCreateSummary}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Summary
          </button>
          
          {/* Features preview */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="font-medium text-gray-900">60s Processing</div>
              <div className="text-gray-500">Lightning fast AI summaries</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="font-medium text-gray-900">Key Insights</div>
              <div className="text-gray-500">Structured actionable takeaways</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <div className="font-medium text-gray-900">Smart Tags</div>
              <div className="text-gray-500">AI-powered categorization</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}