"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShareModal } from "@/components/molecules/ShareModal";
import { 
  Clock, Eye, ThumbsUp, MessageSquare, Calendar, 
  Copy, Share2, Download, ChevronRight, Play,
  Lightbulb, BookOpen, Plus, ExternalLink, FileText,
  AlertTriangle, Menu, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, Button, Badge, ScrollArea, ScrollBar } from './ui-components';
import { useToast } from "@/components/providers/ToastProvider";
import { TagBadge } from "@/components/atoms/TagBadge";
import { CategoryBadge } from "@/components/atoms/CategoryBadge";
import { formatCount } from "@/lib/tag-utils";

// Import existing types for full compatibility
import type {
  SummaryViewerProps,
  BackendKeyMoment,
  BackendFlashcard,
  BackendQuizQuestion,
  BackendFramework,
  BackendPlaybook,
  BackendNovelIdea,
  BackendInsightEnrichment,
} from "./SummaryViewer.types";

export function SummaryViewerImproved({
  summary,
  isStreaming = false,
  className,
}: SummaryViewerProps) {
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [showAllTags, setShowAllTags] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showMobileToolkit, setShowMobileToolkit] = useState(false);
  const toastContext = useToast();
  const toast = {
    success: toastContext.showSuccess,
    error: toastContext.showError
  };
  
  // YouTube player state
  const [player, setPlayer] = useState<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Parse content sections
  const sections = new Map<string, string>();
  if (summary.content) {
    const lines = summary.content.split("\n");
    let currentSection = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^#+\s*(.+)/);
      if (headerMatch) {
        if (currentSection && currentContent.length > 0) {
          sections.set(currentSection.toLowerCase(), currentContent.join("\n").trim());
        }
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections.set(currentSection.toLowerCase(), currentContent.join("\n").trim());
    }

    // Add common section name variations for better content extraction
    const sectionAliases = new Map<string, string[]>([
      ["playbooks", ["playbooks & heuristics", "playbook", "strategic playbooks", "heuristics"]],
      ["in practice", ["practical applications", "application", "implementation", "how to apply"]],
      ["debunked assumptions", ["myths debunked", "common misconceptions", "debunked myths", "assumptions"]],
      ["glossary", ["terms", "definitions", "key terms", "terminology", "glossary (≤15 terms)"]],
      ["frameworks", ["strategic frameworks", "mental models", "framework", "models"]],
      ["tl;dr", ["tl;dr (≤100 words)", "summary", "quick summary", "overview"]],
      ["feynman flashcards", ["feynman flashcards (≤10)", "flashcards", "flash cards"]],
      ["quick quiz", ["quick quiz (3 q&a)", "quiz"]],
      ["novel idea meter", ["novel-idea meter", "novel ideas", "innovation", "new concepts", "fresh insights"]],
      ["insight enrichment", ["additional insights", "enrichment", "meta insights"]],
      ["how to think like", ["thinking patterns", "mental models", "thinking framework", "cognitive patterns"]],
    ]);

    // Create reverse lookup for section aliases
    sectionAliases.forEach((aliases, canonical) => {
      aliases.forEach((alias) => {
        if (sections.has(alias.toLowerCase()) && !sections.has(canonical)) {
          sections.set(canonical, sections.get(alias.toLowerCase()) || "");
        }
      });
    });
  }

  // Helper functions
  const formatCount = (count?: number | null): string => {
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const handleCopy = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
    const blob = new Blob([summary.content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.videoTitle || 'summary'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary exported successfully');
  };

  const handleTimestampClick = (timestamp: string) => {
    if (!player || !playerReady) {
      return;
    }
    
    // Parse various timestamp formats
    const parts = timestamp.split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 3) {
      // HH:MM:SS format
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS format
      totalSeconds = parts[0] * 60 + parts[1];
    }
    
    // Use the YouTube Player API methods
    if (typeof player.seekTo === 'function') {
      player.seekTo(totalSeconds, true);
    }
    
    if (typeof player.playVideo === 'function') {
      player.playVideo();
    }
  };

  // Initialize YouTube player
  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !summary.videoId) {
      return;
    }
    
    const newPlayer = new (window as any).YT.Player(playerRef.current, {
      height: "315",
      width: "560",
      videoId: summary.videoId,
      playerVars: {
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: any) => {
          setPlayerReady(true);
        },
        onError: (event: any) => {
          console.error("YouTube player error:", event.data);
        },
      },
    });
    setPlayer(newPlayer);
  }, [summary.videoId]);

  // YouTube API loading
  useEffect(() => {
    if (!summary.videoId) return;

    if (typeof (window as any).YT !== "undefined" && (window as any).YT.Player) {
      initializePlayer();
    } else {
      const existingScript = document.getElementById("youtube-api");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "youtube-api";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);

        // Set up the callback for when the API is ready
        (window as any).onYouTubeIframeAPIReady = () => {
          initializePlayer();
        };
      } else if ((window as any).YT && (window as any).YT.Player) {
        // API is loaded but player not initialized
        initializePlayer();
      }
    }
  }, [summary.videoId, initializePlayer]);

  // Separate cleanup effect for player destruction
  useEffect(() => {
    return () => {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, [player]);

  // Extract structured backend data with multiple fallbacks
  const keyMoments: BackendKeyMoment[] = 
    summary.metadata?.key_moments || 
    summary.key_moments || 
    [];
  
  // Removed unused variables (frameworks and playbooks are parsed from content sections)
  
  const flashcards: BackendFlashcard[] = 
    summary.metadata?.flashcards || 
    summary.flashcards || 
    summary.metadata?.accelerated_learning_pack?.feynman_flashcards?.map((fc: any) => ({
      question: fc.q,
      answer: fc.a
    })) ||
    [];
  
  const quizQuestions: BackendQuizQuestion[] = 
    summary.metadata?.quiz_questions || 
    summary.quiz_questions || 
    summary.metadata?.accelerated_learning_pack?.quick_quiz?.map((q: any) => ({
      question: q.q,
      answer: q.a
    })) ||
    [];
  
  const novelIdeas: BackendNovelIdea[] = 
    summary.metadata?.accelerated_learning_pack?.novel_idea_meter ||
    summary.accelerated_learning_pack?.novel_idea_meter ||
    summary.metadata?.novel_ideas ||
    [];
  
  const insightEnrichment: BackendInsightEnrichment = 
    summary.metadata?.insight_enrichment || 
    summary.insight_enrichment || 
    {};
  
  // Get content sections with fallbacks (using canonical names after alias mapping)
  const tldrContent = sections.get("tl;dr") || "";
  const inPracticeContent = sections.get("in practice") || "";
  const debunkedContent = sections.get("debunked assumptions") || "";
  const frameworksContent = sections.get("frameworks") || "";
  const playbooksContent = sections.get("playbooks") || "";
  const glossaryContent = sections.get("glossary") || "";
  const flashcardsContent = sections.get("feynman flashcards") || "";
  const quizContent = sections.get("quick quiz") || "";
  const novelIdeasContent = sections.get("novel idea meter") || "";
  const insightEnrichmentContent = sections.get("insight enrichment") || "";
  const howToThinkContent = sections.get("how to think like") || "";
  
  // Handler functions for navigation
  const handleTagClick = (tagName: string) => {
    router.push(`/library?tag=${encodeURIComponent(tagName)}`);
  };
  
  const handleCategoryClick = (categoryName: string) => {
    router.push(`/library?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <article className={cn("min-h-screen bg-gray-50", className)}>
      {/* Compact Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Title and Quick Metadata */}
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {summary.videoTitle}
          </h1>
          
          {/* Compact Metadata Bar */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="font-medium">{summary.channelName}</span>
            {summary.viewCount && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatCount(summary.viewCount)} views
              </span>
            )}
            {summary.likeCount && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                {formatCount(summary.likeCount)}
              </span>
            )}
            {summary.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {Math.floor(summary.duration / 60)}m
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {summary.createdAt ? new Date(summary.createdAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>

          {/* Compact Horizontal Tag Bar */}
          {((summary.tags && summary.tags.length > 0) || (summary.categories && summary.categories.length > 0)) && (
            <div className="flex items-center gap-2">
              <ScrollArea className="max-w-full">
                <div className="flex items-center gap-2 pb-2">
                  {/* Categories first */}
                  {summary.categories?.map((cat: any) => (
                    <CategoryBadge
                      key={cat.id}
                      name={cat.name}
                      interactive
                      size="sm"
                      className="hover:scale-105"
                      onClick={() => handleCategoryClick(cat.name)}
                    />
                  ))}
                  
                  {/* Then tags */}
                  {summary.tags?.slice(0, showAllTags ? undefined : 5).map((tag: any) => (
                    <TagBadge
                      key={tag.id}
                      name={tag.name}
                      type={tag.type}
                      interactive
                      size="sm"
                      onClick={() => handleTagClick(tag.name)}
                    />
                  ))}
                  
                  {/* More button */}
                  {summary.tags && summary.tags.length > 5 && !showAllTags && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllTags(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {summary.tags.length - 5} more
                    </Button>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Left Column - Primary Content (60%) */}
          <div className="xl:col-span-3 order-2 xl:order-1 space-y-6">
            
            {/* TL;DR Card - Always Visible */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-white border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  TL;DR
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(tldrContent, 'tldr')}
                  className="h-8 px-2"
                >
                  {copiedSection === 'tldr' ? 
                    <span className="text-green-600 text-xs">Copied!</span> : 
                    <Copy className="h-4 w-4" />
                  }
                </Button>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {tldrContent || "Summary not available"}
                </ReactMarkdown>
              </div>
            </Card>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 w-full">
                <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
                <TabsTrigger value="learning" className="col-span-2 sm:col-span-1 text-xs sm:text-sm">Learning</TabsTrigger>
              </TabsList>

              {/* Summary Tab - Now with tabbed layout like Learning */}
              <TabsContent value="summary" className="space-y-4 mt-4">
                <Card className="p-5">
                  <Tabs defaultValue="practice" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full mb-4 gap-1">
                      <TabsTrigger value="practice" className="text-xs">In Practice</TabsTrigger>
                      <TabsTrigger value="enrichment" className="text-xs">Enrichment</TabsTrigger>
                      <TabsTrigger value="summary" className="text-xs">Full Text</TabsTrigger>
                    </TabsList>
                    
                    {/* In Practice Tab */}
                    <TabsContent value="practice">
                      {inPracticeContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {inPracticeContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No practical applications available</p>
                      )}
                    </TabsContent>
                    
                    {/* Insight Enrichment Tab */}
                    <TabsContent value="enrichment">
                      {((insightEnrichment && Object.keys(insightEnrichment).length > 0 && 
                        (insightEnrichment.sentiment || insightEnrichment.stats_tools_links?.length || insightEnrichment.risks_blockers_questions?.length)) || 
                        insightEnrichmentContent) ? (
                        <div className="space-y-4">
                          {insightEnrichment.sentiment && (
                            <div className="p-3 bg-indigo-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">Sentiment: </span>
                              <span className="text-sm font-medium capitalize">{insightEnrichment.sentiment}</span>
                            </div>
                          )}
                          {insightEnrichment.stats_tools_links && insightEnrichment.stats_tools_links.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Tools & Resources:</p>
                              <div className="space-y-2">
                                {insightEnrichment.stats_tools_links.map((link, idx) => (
                                  <div key={idx} className="p-2 bg-blue-50 rounded text-sm text-blue-700 flex items-start gap-1">
                                    <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span className="break-all">{link}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {insightEnrichment.risks_blockers_questions && insightEnrichment.risks_blockers_questions.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Risks & Questions:</p>
                              <div className="space-y-2">
                                {insightEnrichment.risks_blockers_questions.map((item, idx) => (
                                  <div key={idx} className="p-2 bg-amber-50 rounded text-sm text-gray-700">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {insightEnrichmentContent && !insightEnrichment.sentiment && !insightEnrichment.stats_tools_links?.length && !insightEnrichment.risks_blockers_questions?.length && (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {insightEnrichmentContent}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No enrichment data available</p>
                      )}
                    </TabsContent>
                    
                    {/* Full Summary Tab */}
                    <TabsContent value="summary">
                      <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {summary.content || "Summary not available"}
                        </ReactMarkdown>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>

              </TabsContent>

              {/* Insights Tab - Now with tabbed layout like Learning */}
              <TabsContent value="insights" className="space-y-4 mt-4">
                <Card className="p-5">
                  <Tabs defaultValue="debunked" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full mb-4 gap-1">
                      <TabsTrigger value="debunked" className="text-xs">Debunked</TabsTrigger>
                      <TabsTrigger value="frameworks" className="text-xs">Frameworks</TabsTrigger>
                      <TabsTrigger value="playbooks" className="text-xs">Playbooks</TabsTrigger>
                    </TabsList>
                    
                    {/* Debunked Assumptions Tab */}
                    <TabsContent value="debunked">
                      {debunkedContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {debunkedContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No debunked assumptions available</p>
                      )}
                    </TabsContent>
                    
                    {/* Frameworks Tab */}
                    <TabsContent value="frameworks">
                      {frameworksContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {frameworksContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No frameworks available</p>
                      )}
                    </TabsContent>
                    
                    {/* Playbooks Tab */}
                    <TabsContent value="playbooks">
                      {playbooksContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {playbooksContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No playbooks available</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              </TabsContent>

              {/* Learning Hub Tab */}
              <TabsContent value="learning" className="space-y-4 mt-4">
                <Card className="p-5">
                  <Tabs defaultValue="flashcards" className="w-full">
                    <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full mb-4 gap-1">
                      <TabsTrigger value="flashcards" className="text-xs">Flashcards</TabsTrigger>
                      <TabsTrigger value="quiz" className="text-xs">Quiz</TabsTrigger>
                      <TabsTrigger value="glossary" className="text-xs">Glossary</TabsTrigger>
                      <TabsTrigger value="ideas" className="text-xs">Ideas</TabsTrigger>
                      <TabsTrigger value="thinking" className="col-span-2 sm:col-span-1 text-xs">Thinking</TabsTrigger>
                    </TabsList>
                    
                    {/* Flashcards */}
                    <TabsContent value="flashcards">
                      {flashcards.length > 0 ? (
                        <div className="space-y-3">
                          {flashcards.map((card, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium text-sm mb-2">Q: {card.question}</p>
                              <p className="text-sm text-gray-600">A: {card.answer}</p>
                            </div>
                          ))}
                        </div>
                      ) : flashcardsContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {flashcardsContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No flashcards available</p>
                      )}
                    </TabsContent>
                    
                    {/* Quiz */}
                    <TabsContent value="quiz">
                      {quizQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {quizQuestions.map((q, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium text-sm mb-2">{idx + 1}. {q.question}</p>
                              <p className="text-sm text-gray-600">Answer: {q.answer}</p>
                            </div>
                          ))}
                        </div>
                      ) : quizContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {quizContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No quiz available</p>
                      )}
                    </TabsContent>
                    
                    {/* Glossary */}
                    <TabsContent value="glossary">
                      {glossaryContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {glossaryContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No glossary available</p>
                      )}
                    </TabsContent>
                    
                    {/* Novel Ideas */}
                    <TabsContent value="ideas">
                      {novelIdeas.length > 0 ? (
                        <div className="space-y-3">
                          {novelIdeas.map((idea, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-white rounded-lg">
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={cn(
                                    "text-lg",
                                    i < idea.score ? "text-yellow-500" : "text-gray-300"
                                  )}>★</span>
                                ))}
                              </div>
                              <p className="text-sm flex-1">{idea.insight}</p>
                            </div>
                          ))}
                        </div>
                      ) : novelIdeasContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {novelIdeasContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No novel ideas available</p>
                      )}
                    </TabsContent>
                    
                    {/* How to Think Like */}
                    <TabsContent value="thinking">
                      {howToThinkContent ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {howToThinkContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No thinking patterns available</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Video & Toolkit (40%) - Sticky on desktop */}
          <div className="xl:col-span-2 order-1 xl:order-2">
            {/* Mobile toggle button */}
            <div className="xl:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setShowMobileToolkit(!showMobileToolkit)}
                className="w-full flex items-center justify-between"
                aria-label="Toggle toolkit"
              >
                <span>Video & Toolkit</span>
                {showMobileToolkit ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className={cn(
              "xl:sticky xl:top-24 space-y-4",
              !showMobileToolkit && "hidden xl:block"
            )}>
              
              {/* Video Player */}
              {summary.videoId && (
                <Card className="overflow-hidden">
                  <div className="aspect-video bg-gray-900">
                    <div ref={playerRef} className="w-full h-full" />
                  </div>
                </Card>
              )}

              {/* Unified Summary Toolkit - Default to Moments tab */}
              <Card className="p-4">
                <Tabs defaultValue="moments" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-3">
                    <TabsTrigger value="actions" className="text-xs sm:text-sm">Actions</TabsTrigger>
                    <TabsTrigger value="moments" className="text-xs sm:text-sm">Moments</TabsTrigger>
                  </TabsList>

                  {/* Quick Actions */}
                  <TabsContent value="actions" className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(summary.content || "", 'full')}
                        className="w-full text-xs sm:text-sm"
                        aria-label="Copy summary to clipboard"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Copy</span>
                        <span className="sm:hidden">Copy</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowShareModal(true)}
                        className="w-full text-xs sm:text-sm"
                        aria-label="Share summary"
                      >
                        <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Share</span>
                        <span className="sm:hidden">Share</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="w-full col-span-2 sm:col-span-1 text-xs sm:text-sm"
                        aria-label="Export as markdown"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Export</span>
                        <span className="sm:hidden">Export</span>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Key Moments */}
                  <TabsContent value="moments" className="space-y-2">
                    {keyMoments.length > 0 ? (
                      <>
                        <ScrollArea className="h-64">
                          {keyMoments.map((moment: BackendKeyMoment, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleTimestampClick(moment.timestamp)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleTimestampClick(moment.timestamp);
                                }
                              }}
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-2"
                              disabled={!playerReady}
                              aria-label={`Jump to ${moment.timestamp}`}
                            >
                              <Play className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-xs text-blue-600 font-mono">
                                  {moment.timestamp}
                                </span>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {moment.insight}
                                </p>
                              </div>
                            </button>
                          ))}
                        </ScrollArea>
                        
                        {keyMoments.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full">
                            <ChevronRight className="h-4 w-4 mr-1" />
                            View All {keyMoments.length} Key Moments
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No key moments available
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Insight Enrichment moved to Summary tab - removed from sidebar */}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        summaryId={summary.id || ""}
        summaryTitle={summary.videoTitle || ""}
      />

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Generating summary...
          </div>
        </div>
      )}
    </article>
  );
}