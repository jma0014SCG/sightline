"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import type { BackendInsightEnrichment } from "@/components/organisms/SummaryViewer/SummaryViewer.types";

interface InsightEnrichmentProps {
  data: BackendInsightEnrichment;
  content?: string;
  className?: string;
}

export function InsightEnrichment({ data, content, className }: InsightEnrichmentProps) {
  // Check if we have any data to display
  const hasData =
    data.sentiment ||
    (data.stats_tools_links && data.stats_tools_links.length > 0) ||
    (data.risks_blockers_questions && data.risks_blockers_questions.length > 0) ||
    content;

  if (!hasData) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200",
        className,
      )}
    >
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 rounded-t-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-teal-100">🔍</span>
          Insight Enrichment
        </h3>
      </div>

      <div className="p-6 space-y-6">
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
    </div>
  );
}
