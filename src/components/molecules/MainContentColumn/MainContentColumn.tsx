"use client";

import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Clock, Calendar, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryViewerProps } from "@/components/organisms/SummaryViewer/SummaryViewer.types";

interface MainContentColumnProps {
  summary: SummaryViewerProps["summary"];
  playerRef: React.RefObject<HTMLDivElement>;
  playerReady: boolean;
  sections: Map<string, string>;
  collapsedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  formatDuration: (seconds: number) => string;
  className?: string;
}

export function MainContentColumn({
  summary,
  playerRef,
  playerReady,
  sections,
  collapsedSections,
  toggleSection,
  formatDuration,
  className,
}: MainContentColumnProps) {
  return (
    <div className={cn("space-y-8 lg:space-y-12", className)}>
      {/* Header with Video Info */}
      <header className="bg-white border border-gray-200 rounded-xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {summary.videoTitle}
          </h1>

          {/* Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
            {summary.metadata?.speakers &&
              summary.metadata.speakers.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {summary.metadata.speakers.join(", ")}
                  </span>
                </div>
              )}
            {summary.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{formatDuration(summary.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Channel: {summary.channelName}</span>
            </div>
          </div>

          {/* Synopsis */}
          {summary.metadata?.synopsis && (
            <p className="text-gray-900 italic leading-relaxed text-sm sm:text-base">
              {summary.metadata.synopsis}
            </p>
          )}
        </div>
      </header>

      {/* YouTube Player */}
      {summary.videoId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div
            className="relative w-full bg-black rounded-xl overflow-hidden shadow-lg"
            style={{ paddingBottom: "56.25%" /* 16:9 aspect ratio */ }}
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
      )}

      {/* TL;DR Section */}
      <section className="bg-white border border-gray-200 border-t-4 border-t-amber-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <div className="bg-slate-100 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-amber-600">⚡</span>
            <span>Rapid TL;DR</span>
            <span className="text-sm font-medium text-gray-600">
              (30s read)
            </span>
          </h2>
        </div>
        <div className="p-6 lg:p-8">
          <div className="prose prose-lg max-w-prose prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-7 prose-p:mb-6 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {(() => {
                const tldrContent =
                  sections.get("tl;dr") ||
                  sections.get("tl;dr (≤100 words)") ||
                  summary.accelerated_learning_pack?.tldr100 ||
                  summary.metadata?.synopsis ||
                  "A concise summary of the key takeaways from this video content.";

                return tldrContent;
              })()}
            </ReactMarkdown>
          </div>
        </div>
      </section>

      {/* Core Summary Sections */}
      <div className="space-y-10">
        {/* In Practice Section */}
        {sections.get("in practice") && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-green-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => toggleSection("practice")}
              className="w-full flex items-center justify-between text-left hover:bg-slate-50 transition-colors p-6 bg-slate-100"
            >
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-green-600">⭐</span>
                <span>In Practice</span>
              </h2>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-700 transition-transform duration-200",
                  collapsedSections.has("practice") ? "" : "rotate-180",
                )}
              />
            </button>
            {!collapsedSections.has("practice") && (
              <div className="p-6 lg:p-8">
                <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-7 prose-p:mb-6 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {sections.get("in practice")}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Playbooks Section */}
        {((summary.playbooks && summary.playbooks.length > 0) ||
          sections.get("playbooks") ||
          sections.get("playbooks & heuristics")) && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-purple-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => toggleSection("playbooks")}
              className="w-full flex items-center justify-between text-left hover:bg-slate-50 transition-colors p-6 bg-slate-100"
            >
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">📋</span>
                <span>Playbooks & Heuristics</span>
                {summary.playbooks && summary.playbooks.length > 0 && (
                  <span className="text-sm font-medium text-gray-600">
                    ({summary.playbooks.length} playbooks)
                  </span>
                )}
              </h2>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-700 transition-transform duration-200",
                  collapsedSections.has("playbooks") ? "" : "rotate-180",
                )}
              />
            </button>
            {!collapsedSections.has("playbooks") && (
              <div className="p-6 lg:p-8">
                {summary.playbooks && summary.playbooks.length > 0 ? (
                  <div className="space-y-4">
                    {summary.playbooks.map((playbook, index) => (
                      <div
                        key={index}
                        className="p-5 bg-purple-50 border border-purple-100 rounded-lg shadow-sm"
                      >
                        <div className="mb-3">
                          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full mb-2">
                            TRIGGER
                          </span>
                          <p className="text-gray-900 font-medium leading-relaxed">
                            {playbook.trigger}
                          </p>
                        </div>
                        <div>
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-2">
                            ACTION
                          </span>
                          <p className="text-gray-900 leading-relaxed">
                            {playbook.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-7 prose-p:mb-6 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {sections.get("playbooks") ||
                        sections.get("playbooks & heuristics")}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Debunked Assumptions Section */}
        {sections.get("debunked assumptions") && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-red-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => toggleSection("debunked")}
              className="w-full flex items-center justify-between text-left hover:bg-slate-50 transition-colors p-6 bg-slate-100"
            >
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-red-600">💡</span>
                <span>Debunked Assumptions</span>
              </h2>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-700 transition-transform duration-200",
                  collapsedSections.has("debunked") ? "" : "rotate-180",
                )}
              />
            </button>
            {!collapsedSections.has("debunked") && (
              <div className="p-6 lg:p-8">
                <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-7 prose-p:mb-6 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
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

        {/* Summary Content Section */}
        {summary.content && (
          <section className="bg-white border border-gray-200 border-t-4 border-t-blue-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-slate-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">📝</span>
                <span>Full Summary</span>
              </h2>
            </div>
            <div className="p-6 lg:p-8">
              <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-7 prose-p:mb-6 prose-li:text-gray-900 prose-li:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {summary.content}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
