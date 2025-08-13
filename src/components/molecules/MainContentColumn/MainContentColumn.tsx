"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Clock, Calendar, User, ChevronDown, Copy, Check, ChevronUp, Eye, ThumbsUp, MessageSquare, RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryViewerProps } from "@/components/organisms/SummaryViewer/SummaryViewer.types";

interface MainContentColumnProps {
  summary: SummaryViewerProps["summary"];
  playerRef: React.RefObject<HTMLDivElement>;
  playerReady: boolean;
  sections: Map<string, string>;
  collapsedSections: Set<string>;
  copiedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  handleCopy: (content: string, sectionId?: string) => void;
  formatDuration: (seconds: number) => string;
  className?: string;
}

// Helper function to format counts
const formatCount = (count?: number | null): string => {
  if (!count) return '';
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
};

// Helper function to format relative dates
const formatRelativeDate = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
};

// Video Metadata Section Component
const VideoMetadataSection = ({ summary }: { summary: SummaryViewerProps["summary"] }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Check if we have any metadata to display
  const hasMetadata = summary.viewCount || summary.likeCount || summary.commentCount || summary.uploadDate || summary.description;
  
  if (!hasMetadata) return null;
  
  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Video title and channel */}
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{summary.videoTitle}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">{summary.channelName}</span>
              {summary.uploadDate && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span title={new Date(summary.uploadDate).toLocaleDateString()}>
                      Uploaded {formatRelativeDate(summary.uploadDate)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Engagement metrics */}
          <div className="flex items-center gap-6 py-3 border-t border-b border-gray-200">
            {summary.viewCount && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="font-semibold text-gray-900">{formatCount(summary.viewCount)}</span>
                  <span className="text-gray-500 text-sm ml-1">views</span>
                </div>
              </div>
            )}
            
            {summary.likeCount && (
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-gray-900">{formatCount(summary.likeCount)}</span>
              </div>
            )}
            
            {summary.commentCount && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-gray-900">{formatCount(summary.commentCount)}</span>
                <span className="text-gray-500 text-sm ml-1">comments</span>
              </div>
            )}
          </div>
          
          {/* Description (expandable) */}
          {summary.description && (
            <div className="mt-3">
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 flex items-center gap-1"
              >
                <Info className="h-3.5 w-3.5" />
                {showFullDescription ? 'Hide description' : 'Show description'}
              </button>
              {showFullDescription && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {summary.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Collapsible Synopsis Component
const SynopsisSection = ({ synopsis }: { synopsis: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show first 100 characters as preview
  const previewText = synopsis.length > 100 ? synopsis.substring(0, 100) + "..." : synopsis;
  const needsCollapse = synopsis.length > 100;
  
  return (
    <div className="text-gray-900 italic text-sm leading-relaxed">
      <p>
        {isExpanded || !needsCollapse ? synopsis : previewText}
        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-blue-600 hover:text-blue-800 font-medium underline"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </p>
    </div>
  );
};

// Primary Content Tabs Component
const PrimaryContentTabs = ({
  sections,
  summary,
  collapsedSections,
  copiedSections,
  toggleSection,
  handleCopy
}: {
  sections: Map<string, string>;
  summary: SummaryViewerProps["summary"];
  collapsedSections: Set<string>;
  copiedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  handleCopy: (content: string, sectionId?: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState('tldr');
  
  const tabs = [
    {
      id: 'tldr',
      label: 'TL;DR',
      icon: '⚡',
      color: 'amber',
      content: sections.get("tl;dr") ||
        sections.get("tl;dr (≤100 words)") ||
        summary.accelerated_learning_pack?.tldr100 ||
        summary.metadata?.synopsis ||
        "A concise summary of the key takeaways from this video content."
    },
    {
      id: 'actionable',
      label: 'Actionable',
      icon: '🛠️',
      color: 'orange',
      content: sections.get("in practice") ||
        (summary.in_practice && summary.in_practice.length > 0
          ? summary.in_practice.map(p => `- ${p}`).join('\n')
          : 'No practical examples identified.')
    },
    {
      id: 'playbooks',
      label: 'Playbooks',
      icon: '📋',
      color: 'blue',
      content: summary.playbooks && summary.playbooks.length > 0
        ? summary.playbooks.map(p => `**TRIGGER:** ${p.trigger}\n\n**ACTION:** ${p.action}`).join('\n\n---\n\n')
        : sections.get("playbooks") || sections.get("playbooks & heuristics") || 'No playbooks identified.'
    }
  ].filter(tab => tab.content && tab.content.trim().length > 0);
  
  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
  
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      {/* Tab Navigation */}
      <div className="bg-slate-50 border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id ? "bg-white" : "hover:bg-gray-100",
                activeTab === tab.id && tab.color === 'amber' && "border-amber-500 text-amber-700",
                activeTab === tab.id && tab.color === 'orange' && "border-orange-500 text-orange-700", 
                activeTab === tab.id && tab.color === 'blue' && "border-blue-500 text-blue-700",
                activeTab !== tab.id && "border-transparent text-gray-600 hover:text-gray-800"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
            </button>
          ))}
          
          {/* Copy Button */}
          <div className="flex items-center px-2">
            <button
              onClick={() => handleCopy(currentTab?.content || '', activeTab)}
              className={cn(
                "p-2 rounded-lg transition-all text-gray-600 hover:text-gray-800",
                currentTab?.color === 'amber' && "hover:bg-amber-50 hover:text-amber-600",
                currentTab?.color === 'orange' && "hover:bg-orange-50 hover:text-orange-600",
                currentTab?.color === 'blue' && "hover:bg-blue-50 hover:text-blue-600"
              )}
              title={`Copy ${currentTab?.label} section`}
            >
              {copiedSections.has(activeTab) ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="p-4 lg:p-6">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-6 prose-p:mb-4 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {currentTab?.content || ''}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
};


export function MainContentColumn({
  summary,
  playerRef,
  playerReady,
  sections,
  collapsedSections,
  copiedSections,
  toggleSection,
  handleCopy,
  formatDuration,
  className,
}: MainContentColumnProps) {
  const [playerMode, setPlayerMode] = useState<'standard' | 'compact' | 'wide'>('wide');
  
  // Video aspect ratios for different modes
  const aspectRatios = {
    standard: "56.25%", // 16:9
    compact: "62.5%",   // 16:10 - slightly shorter
    wide: "42.86%"      // 21:9 - wider and shorter
  };
  
  return (
    <div className={cn("space-y-6 lg:space-y-8", className)}>
      {/* Header with Video Info */}
      <header className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="space-y-3">
          {/* Title */}
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
            {summary.videoTitle}
          </h1>

          {/* Inline Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {summary.metadata?.speakers &&
              summary.metadata.speakers.length > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {summary.metadata.speakers.join(", ")}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                </>
              )}
            {summary.duration && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{formatDuration(summary.duration)}</span>
                </div>
                <span className="text-gray-400">•</span>
              </>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{summary.channelName}</span>
            </div>
          </div>

          {/* Collapsible Synopsis */}
          {summary.metadata?.synopsis && (
            <SynopsisSection synopsis={summary.metadata.synopsis} />
          )}
        </div>
      </header>

      {/* YouTube Player */}
      {summary.videoId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Player Mode Controls - compact row */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Video Player</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlayerMode('wide')}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  playerMode === 'wide' 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Wide
              </button>
              <button
                onClick={() => setPlayerMode('standard')}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  playerMode === 'standard' 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Standard
              </button>
              <button
                onClick={() => setPlayerMode('compact')}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  playerMode === 'compact' 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Compact
              </button>
            </div>
          </div>
          
          {/* Player Container */}
          <div className="p-3">
            <div
              className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg"
              style={{ paddingBottom: aspectRatios[playerMode] }}
            >
              <div
                ref={playerRef}
                className="absolute top-0 left-0 w-full h-full"
              />
              {!playerReady && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent mx-auto mb-2" />
                    <p className="text-sm text-gray-300">
                      Loading video player...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Metadata Section */}
      <VideoMetadataSection summary={summary} />

      {/* Primary Content Tabs */}
      <PrimaryContentTabs
        sections={sections}
        summary={summary}
        collapsedSections={collapsedSections}
        copiedSections={copiedSections}
        toggleSection={toggleSection}
        handleCopy={handleCopy}
      />

      {/* Secondary Sections */}
      <div className="space-y-6">{/* Reduced from space-y-10 */}

        {/* Debunked Assumptions Section */}
        {sections.get("debunked assumptions") && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-red-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-100">
              <button
                onClick={() => toggleSection("debunked")}
                className="flex-grow flex items-center justify-between text-left hover:opacity-90 transition-opacity"
                aria-expanded={!collapsedSections.has("debunked")}
                aria-controls="debunked-content"
              >
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-red-600">💡</span>
                  <span>Debunked Assumptions</span>
                </h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-700 transition-transform duration-200",
                    collapsedSections.has("debunked") ? "" : "rotate-180",
                  )}
                />
              </button>

              {/* Copy Button */}
              <button
                onClick={() => handleCopy(sections.get("debunked assumptions") || '', 'debunked')}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                title="Copy Debunked Assumptions section"
                aria-label="Copy Debunked Assumptions section"
              >
                {copiedSections.has('debunked') ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {!collapsedSections.has("debunked") && (
              <div id="debunked-content" className="p-4 lg:p-6">
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-6 prose-p:mb-4 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {sections.get("debunked assumptions")}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Full Summary Section - Collapsed by default */}
        {summary.content && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-blue-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-slate-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between gap-4">
                {/* Collapsible Button Wrapper */}
                <button
                  onClick={() => toggleSection('full-summary')}
                  className="flex-grow flex items-center justify-between text-left hover:opacity-90 transition-opacity"
                  aria-expanded={!collapsedSections.has('full-summary')}
                  aria-controls="full-summary-content"
                >
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-blue-600">📝</span>
                    <span>Full Summary</span>
                  </h2>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-gray-700 transition-transform duration-200",
                    collapsedSections.has('full-summary') ? "rotate-0" : "rotate-180"
                  )} />
                </button>

                {/* Standalone Copy Button */}
                <button
                  onClick={() => handleCopy(summary.content || '', 'full-summary')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                  title="Copy full summary"
                  aria-label="Copy full summary"
                >
                  {copiedSections.has('full-summary') ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {!collapsedSections.has('full-summary') && (
              <div id="full-summary-content" className="p-4 lg:p-6">
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-6 prose-p:mb-4 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {summary.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
