'use client'

import { useState } from 'react'
import { Copy, Download, Share2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Summary } from '@prisma/client'

interface ActionsSidebarProps {
  summary: Partial<Summary> & {
    content: string
    videoTitle: string
  }
  onShare: () => void
  className?: string
}

export function ActionsSidebar({ summary, onShare, className }: ActionsSidebarProps) {
  const [copied, setCopied] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.content)
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

  return (
    <div className={cn("bg-gradient-to-br from-gray-50 to-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200", className)}>
      {/* Header with toggle */}
      <div className="p-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between text-left hover:opacity-90 transition-opacity"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">⚡</span>
            Quick Actions
          </h3>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>
      
      {/* Icon-only mode when collapsed */}
      {isCollapsed ? (
        <div className="px-4 pb-4">
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleCopy}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "border border-slate-200 hover:border-blue-300",
                copied && "bg-green-50 border-green-300"
              )}
              title={copied ? 'Copied!' : 'Copy Summary'}
              aria-label="Copy entire summary"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-700" />
              )}
            </button>
            
            <button
              onClick={handleDownload}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "border border-slate-200 hover:border-blue-300"
              )}
              title="Export as Markdown"
              aria-label="Download as Markdown file"
            >
              <Download className="h-4 w-4 text-gray-700" />
            </button>
            
            <button
              onClick={onShare}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "border border-slate-200 hover:border-blue-300"
              )}
              title="Share Summary"
              aria-label="Share summary"
            >
              <Share2 className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>
      ) : (
      <div className="px-4 pb-4 space-y-2">
        {/* Copy Summary */}
        <button
          onClick={handleCopy}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm",
            copied && "bg-green-50 border-green-300"
          )}
          aria-label="Copy entire summary"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <Copy className="h-4 w-4 text-gray-900 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">
              {copied ? 'Copied!' : 'Copy Summary'}
            </div>
            <div className="text-xs text-gray-600">
              Full text to clipboard
            </div>
          </div>
        </button>

        {/* Download Markdown */}
        <button
          onClick={handleDownload}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm"
          )}
          aria-label="Download as Markdown file"
        >
          <Download className="h-4 w-4 text-gray-900 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Export</div>
            <div className="text-xs text-gray-600">
              Download as .md
            </div>
          </div>
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm"
          )}
          aria-label="Share summary"
        >
          <Share2 className="h-4 w-4 text-gray-900 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Share</div>
            <div className="text-xs text-gray-600">
              Create public link
            </div>
          </div>
        </button>
      </div>
      )}
    </div>
  )
}