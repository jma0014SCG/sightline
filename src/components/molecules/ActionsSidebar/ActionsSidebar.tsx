'use client'

import { useState } from 'react'
import { Copy, Download, Share2, Check } from 'lucide-react'
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
    <div className={cn("bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">⚡</span>
        Quick Actions
      </h3>
      
      <div className="space-y-3">
        {/* Copy Summary */}
        <button
          onClick={handleCopy}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm",
            copied && "bg-green-50 border-green-300"
          )}
          aria-label="Copy entire summary"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <Copy className="h-5 w-5 text-gray-700 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">
              {copied ? 'Copied!' : 'Copy Summary'}
            </div>
            <div className="text-xs text-gray-600">
              Copy entire summary to clipboard
            </div>
          </div>
        </button>

        {/* Download Markdown */}
        <button
          onClick={handleDownload}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm"
          )}
          aria-label="Download as Markdown file"
        >
          <Download className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Export Markdown</div>
            <div className="text-xs text-gray-600">
              Download as .md file
            </div>
          </div>
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-all duration-200",
            "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "border border-slate-200 hover:border-blue-300 hover:shadow-sm"
          )}
          aria-label="Share summary"
        >
          <Share2 className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Share</div>
            <div className="text-xs text-gray-600">
              Create shareable link
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}