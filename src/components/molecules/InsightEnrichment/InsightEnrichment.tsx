"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy, Check } from "lucide-react";
import type { BackendInsightEnrichment } from "@/components/organisms/SummaryViewer/SummaryViewer.types";

interface InsightEnrichmentProps {
  data: BackendInsightEnrichment;
  content?: string;
  collapsedSections: Set<string>;
  copiedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  handleCopy: (content: string, sectionId?: string) => void;
  className?: string;
}

export function InsightEnrichment({ 
  data, 
  content, 
  collapsedSections, 
  copiedSections, 
  toggleSection, 
  handleCopy, 
  className 
}: InsightEnrichmentProps) {
  // Check if we have any data to display
  const hasData =
    data.sentiment ||
    (data.stats_tools_links && data.stats_tools_links.length > 0) ||
    (data.risks_blockers_questions && data.risks_blockers_questions.length > 0) ||
    content;

  if (!hasData) {
    return null;
  }

  // Function to get all content for copying
  const getCopyContent = () => {
    const sections = [];
    
    if (data.sentiment) {
      sections.push(`Sentiment: ${data.sentiment}`);
    }
    
    if (data.stats_tools_links && data.stats_tools_links.length > 0) {
      sections.push(`Tools & Resources:\n${data.stats_tools_links.join('\n')}`);
    }
    
    if (data.risks_blockers_questions && data.risks_blockers_questions.length > 0) {
      sections.push(`Risks & Considerations:\n${data.risks_blockers_questions.join('\n')}`);
    }
    
    if (content && !data.sentiment && (!data.stats_tools_links || data.stats_tools_links.length === 0) && (!data.risks_blockers_questions || data.risks_blockers_questions.length === 0)) {
      sections.push(content);
    }
    
    return sections.join('\n\n');
  };

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200",
        className,
      )}
    >
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Collapsible Button Wrapper */}
          <button
            onClick={() => toggleSection('insight-enrichment')}
            className="flex-grow flex items-center justify-between text-left hover:opacity-90 transition-opacity"
            aria-expanded={!collapsedSections.has('insight-enrichment')}
            aria-controls="insight-enrichment-content"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-teal-100">🔍</span>
              Insight Enrichment
            </h3>
            <ChevronDown className={cn(
              "h-5 w-5 text-white transition-transform duration-200",
              collapsedSections.has('insight-enrichment') ? "rotate-0" : "rotate-180"
            )} />
          </button>

          {/* Standalone Copy Button */}
          <button
            onClick={() => {
              const copyContent = getCopyContent();
              handleCopy(copyContent, 'insight-enrichment');
            }}
            className="p-2 text-teal-100 hover:text-white hover:bg-teal-500 rounded-lg transition-all flex-shrink-0"
            title="Copy Insight Enrichment"
            aria-label="Copy Insight Enrichment"
          >
            {copiedSections.has('insight-enrichment') ? (
              <Check className="h-5 w-5 text-green-300" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {!collapsedSections.has('insight-enrichment') && (
        <div id="insight-enrichment-content" className="p-6 space-y-6">
          {/* Sentiment Analysis */}
          {data.sentiment && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-teal-600">😊</span>
              Sentiment
            </h4>
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
              <p className="text-sm text-gray-900 font-medium capitalize">
                {data.sentiment}
              </p>
            </div>
          </div>
        )}

        {/* Stats, Tools & Links */}
        {data.stats_tools_links && data.stats_tools_links.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">🔗</span>
              Tools & Resources
            </h4>
            <div className="space-y-2">
              {data.stats_tools_links.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks, Blockers & Questions */}
        {data.risks_blockers_questions &&
          data.risks_blockers_questions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                Risks & Considerations
              </h4>
              <div className="space-y-2">
                {data.risks_blockers_questions.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 border border-red-100 rounded-lg"
                  >
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content fallback when structured data isn't available */}
          {content && !data.sentiment && (!data.stats_tools_links || data.stats_tools_links.length === 0) && (!data.risks_blockers_questions || data.risks_blockers_questions.length === 0) && (
            <div className="prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
