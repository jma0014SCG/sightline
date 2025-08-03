'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, Copy, Check } from 'lucide-react'
import type { BackendKeyMoment } from '@/components/organisms/SummaryViewer/SummaryViewer.types'

interface KeyMomentsSidebarProps {
  keyMoments: BackendKeyMoment[]
  onTimestampClick: (timestamp: string) => void
  playerReady: boolean
  collapsedSections: Set<string>
  copiedSections: Set<string>
  toggleSection: (sectionId: string) => void
  handleCopy: (content: string, sectionId?: string) => void
  className?: string
}

export function KeyMomentsSidebar({ 
  keyMoments, 
  onTimestampClick, 
  playerReady,
  collapsedSections,
  copiedSections,
  toggleSection,
  handleCopy,
  className 
}: KeyMomentsSidebarProps) {
  if (!keyMoments || keyMoments.length === 0) {
    return null
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <div className="bg-blue-600 px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Collapsible Button Wrapper */}
          <button
            onClick={() => toggleSection('key-moments')}
            className="flex-grow flex items-center justify-between text-left hover:opacity-90 transition-opacity"
            aria-expanded={!collapsedSections.has('key-moments')}
            aria-controls="key-moments-content"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-blue-100">🔥</span>
              <span>Key Moments ({keyMoments.length})</span>
            </h3>
            <ChevronDown className={cn(
              "h-5 w-5 text-white transition-transform duration-200",
              collapsedSections.has('key-moments') ? "rotate-0" : "rotate-180"
            )} />
          </button>

          {/* Standalone Copy Button */}
          <button
            onClick={() => {
              const content = keyMoments.map(m => `${m.timestamp} → ${m.insight}`).join('\n');
              handleCopy(content, 'key-moments');
            }}
            className="p-2 text-blue-100 hover:text-white hover:bg-blue-500 rounded-lg transition-all flex-shrink-0"
            title="Copy Key Moments"
            aria-label="Copy Key Moments"
          >
            {copiedSections.has('key-moments') ? (
              <Check className="h-5 w-5 text-green-300" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      {!collapsedSections.has('key-moments') && (
        <div id="key-moments-content" className="p-6">
          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-3">
              {keyMoments.map((moment, index) => (
              <button
                key={index}
                onClick={() => onTimestampClick(moment.timestamp)}
                disabled={!playerReady}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-blue-200 text-left",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  playerReady ? "cursor-pointer" : "cursor-not-allowed",
                  index % 2 === 0 
                    ? "bg-white border-gray-100 hover:bg-blue-50/30" 
                    : "bg-gray-50 border-gray-150 hover:bg-blue-50/50"
                )}
                aria-label={`Jump to ${moment.timestamp} in video`}
                title={playerReady ? `Jump to ${moment.timestamp}: ${moment.insight}` : 'Player not ready'}
              >
                {/* Timestamp Badge - Left Side */}
                <div className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border-2",
                  playerReady
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-300 text-gray-500 border-gray-300"
                )}>
                  {moment.timestamp}
                </div>
                
                {/* Insight Text - Right Side */}
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-sm text-gray-900 leading-relaxed font-medium">
                    {moment.insight}
                  </p>
                </div>
              </button>
            ))}
            </div>
          </div>
          
          {!playerReady && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 text-center">
                Video player loading... Timestamps will be clickable once ready.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}