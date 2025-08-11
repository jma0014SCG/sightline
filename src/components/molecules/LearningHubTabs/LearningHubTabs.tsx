"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy, Check } from "lucide-react";
import type {
  BackendFramework,
  BackendFlashcard,
  BackendQuizQuestion,
  BackendNovelIdea,
} from "@/components/organisms/SummaryViewer/SummaryViewer.types";

interface LearningHubTabsProps {
  frameworks: BackendFramework[];
  flashcards: BackendFlashcard[];
  quizQuestions: BackendQuizQuestion[];
  glossary: Array<{ term: string; definition: string }>;
  novelIdeas: BackendNovelIdea[];
  frameworksContent?: string;
  flashcardsContent?: string;
  quickQuizContent?: string;
  novelIdeasContent?: string;
  collapsedSections: Set<string>;
  copiedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  handleCopy: (content: string, sectionId?: string) => void;
  className?: string;
}

type TabType =
  | "frameworks"
  | "flashcards"
  | "glossary"
  | "quiz"
  | "ideas";

export function LearningHubTabs({
  frameworks = [],
  flashcards = [],
  quizQuestions = [],
  glossary = [],
  novelIdeas = [],
  frameworksContent = "",
  flashcardsContent = "",
  quickQuizContent = "",
  novelIdeasContent = "",
  collapsedSections,
  copiedSections,
  toggleSection,
  handleCopy,
  className,
}: LearningHubTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("frameworks");

  // Calculate content availability and counts
  const tabs = [
    {
      id: "frameworks" as TabType,
      label: "Frameworks",
      icon: "🧠",
      count: frameworks.length || (frameworksContent ? 1 : 0),
      hasContent: frameworks.length > 0 || frameworksContent,
    },
    {
      id: "flashcards" as TabType,
      label: "Flashcards",
      icon: "🗂️",
      count: flashcards.length || (flashcardsContent ? 1 : 0),
      hasContent: flashcards.length > 0 || flashcardsContent,
    },
    {
      id: "glossary" as TabType,
      label: "Glossary",
      icon: "📖",
      count: glossary.length,
      hasContent: glossary.length > 0,
    },
    {
      id: "quiz" as TabType,
      label: "Quiz",
      icon: "🎯",
      count: quizQuestions.length || (quickQuizContent ? 1 : 0),
      hasContent: quizQuestions.length > 0 || quickQuizContent,
    },
    {
      id: "ideas" as TabType,
      label: "Ideas",
      icon: "💡",
      count: novelIdeas.length || (novelIdeasContent ? 1 : 0),
      hasContent: novelIdeas.length > 0 || novelIdeasContent,
    },
  ];

  const availableTabs = tabs.filter((tab) => tab.hasContent);

  // Set the first available tab as active if current active tab has no content
  const currentTab = tabs.find((tab) => tab.id === activeTab);
  if (!currentTab?.hasContent && availableTabs.length > 0) {
    setActiveTab(availableTabs[0].id);
  }

  if (availableTabs.length === 0) {
    return null;
  }

  // Function to get content for copying based on active tab
  // Priority: 1) Markdown content (richer), 2) Structured data fallback
  const getCopyContent = () => {
    switch (activeTab) {
      case "frameworks":
        if (frameworksContent) return frameworksContent;
        if (frameworks.length > 0) {
          return frameworks.map(f => `${f.name}: ${f.description}`).join('\n\n');
        }
        return '';
      case "flashcards":
        if (flashcardsContent) return flashcardsContent;
        if (flashcards.length > 0) {
          return flashcards.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
        }
        return '';
      case "glossary":
        // Glossary only has structured data, no markdown version
        return glossary.map(g => `${g.term}: ${g.definition}`).join('\n\n');
      case "quiz":
        if (quickQuizContent) return quickQuizContent;
        if (quizQuestions.length > 0) {
          return quizQuestions.map((q, i) => `${i + 1}. ${q.question}\nAnswer: ${q.answer}`).join('\n\n');
        }
        return '';
      case "ideas":
        if (novelIdeasContent) return novelIdeasContent;
        if (novelIdeas.length > 0) {
          return novelIdeas.map(i => `${i.insight} (Novelty: ${i.score}/5)`).join('\n\n');
        }
        return '';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "frameworks":
        return (
          <div className="space-y-3">
            {/* Priority: 1) Markdown content (richer), 2) Structured data fallback */}
            {frameworksContent ? (
              <div className="prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {frameworksContent}
                </ReactMarkdown>
              </div>
            ) : frameworks.length > 0 ? (
              frameworks.map((framework, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm"
                >
                  <h4 className="font-semibold text-blue-900 mb-1.5">
                    {framework.name}
                  </h4>
                  <p className="text-sm text-gray-900 leading-snug">
                    {framework.description}
                  </p>
                </div>
              ))
            ) : null}
          </div>
        );


      case "flashcards":
        return (
          <div className="space-y-3">
            {/* Priority: 1) Markdown content (richer), 2) Structured data fallback */}
            {flashcardsContent ? (
              <div className="prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {flashcardsContent}
                </ReactMarkdown>
              </div>
            ) : flashcards.length > 0 ? (
              flashcards.map((flashcard, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-indigo-100 rounded-lg shadow-sm"
                >
                  <h4 className="font-semibold text-indigo-900 mb-1.5">
                    {flashcard.question}
                  </h4>
                  <p className="text-sm text-gray-900 leading-snug">{flashcard.answer}</p>
                </div>
              ))
            ) : null}
          </div>
        );

      case "glossary":
        return (
          <div className="space-y-2">
            {glossary.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm"
              >
                <h4 className="font-semibold text-blue-900 mb-1">
                  {item.term}
                </h4>
                <div className="text-sm prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {item.definition}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        );

      case "quiz":
        return (
          <div className="space-y-3">
            {/* Priority: 1) Markdown content (richer), 2) Structured data fallback */}
            {quickQuizContent ? (
              <div className="prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {quickQuizContent}
                </ReactMarkdown>
              </div>
            ) : quizQuestions.length > 0 ? (
              quizQuestions.map((quiz, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-purple-100 rounded-lg shadow-sm"
                >
                  <h4 className="font-semibold text-purple-900 mb-1.5">
                    {index + 1}. {quiz.question}
                  </h4>
                  <p className="text-sm text-gray-900 leading-snug">
                    <span className="font-medium text-purple-700">Answer:</span>{" "}
                    {quiz.answer}
                  </p>
                </div>
              ))
            ) : null}
          </div>
        );

      case "ideas":
        return (
          <div className="space-y-4">
            {/* Priority: 1) Markdown content (richer), 2) Structured data fallback */}
            {novelIdeasContent ? (
              <div className="prose prose-sm max-w-none prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {novelIdeasContent}
                </ReactMarkdown>
              </div>
            ) : novelIdeas.length > 0 ? (
              novelIdeas.map((idea, index) => (
                <div
                  key={index}
                  className="p-4 bg-white border border-amber-100 rounded-lg shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-amber-900 text-sm leading-relaxed flex-1 mr-3">
                      {idea.insight}
                    </h4>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, starIndex) => (
                          <span
                            key={starIndex}
                            className={cn(
                              "text-lg",
                              starIndex < idea.score
                                ? "text-amber-400"
                                : "text-gray-300",
                            )}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-600 text-center mt-1">
                        {idea.score}/5
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">
                      Novelty Score:
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(idea.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200",
        className,
      )}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Collapsible Button Wrapper */}
          <button
            onClick={() => toggleSection('learning-hub')}
            className="flex-grow flex items-center justify-between text-left hover:opacity-90 transition-opacity"
            aria-expanded={!collapsedSections.has('learning-hub')}
            aria-controls="learning-hub-content"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-indigo-100">📚</span>
              Learning Hub
            </h3>
            <ChevronDown className={cn(
              "h-4 w-4 text-white transition-transform duration-200",
              collapsedSections.has('learning-hub') ? "rotate-0" : "rotate-180"
            )} />
          </button>

          {/* Standalone Copy Button */}
          <button
            onClick={() => {
              const content = getCopyContent();
              handleCopy(content || '', `learning-hub-${activeTab}`);
            }}
            className="p-2 text-indigo-100 hover:text-white hover:bg-indigo-500 rounded-lg transition-all flex-shrink-0"
            title={`Copy ${activeTab} content`}
            aria-label={`Copy ${activeTab} content`}
          >
            {copiedSections.has(`learning-hub-${activeTab}`) ? (
              <Check className="h-4 w-4 text-green-300" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {!collapsedSections.has('learning-hub') && (
        <div id="learning-hub-content" className="p-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
            {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              )}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-600",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

          {/* Tab Content */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
