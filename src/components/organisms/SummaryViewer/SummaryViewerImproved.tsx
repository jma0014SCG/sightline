"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ShareModal } from "@/components/molecules/ShareModal";
import { 
  Clock, Eye, ThumbsUp, MessageSquare, Calendar, 
  Copy, Share2, Download, ChevronRight, Play,
  Lightbulb, Brain, BookOpen, Plus, ExternalLink, FileText,
  AlertTriangle
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [showAllTags, setShowAllTags] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();
  
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
    if (!player || !playerReady) return;
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
    player.seekTo(totalSeconds, true);
  };

  // Initialize YouTube player
  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !summary.videoId) return;

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
      }

      (window as any).onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, [summary.videoId, initializePlayer, player]);

  // Extract structured backend data (same as original SummaryViewer)
  const keyMoments: BackendKeyMoment[] = summary.metadata?.key_moments || [];
  const frameworks: BackendFramework[] = summary.frameworks || [];
  const playbooks: BackendPlaybook[] = summary.playbooks || [];
  const flashcards: BackendFlashcard[] = summary.flashcards || [];
  const quizQuestions: BackendQuizQuestion[] = summary.quiz_questions || [];
  const novelIdeas: BackendNovelIdea[] = summary.accelerated_learning_pack?.novel_idea_meter || [];
  const insightEnrichment: BackendInsightEnrichment = summary.insight_enrichment || {};
  
  // Get content sections with fallbacks
  const tldrContent = sections.get("tl;dr") || sections.get("tl;dr (≤100 words)") || sections.get("summary") || "";
  const inPracticeContent = sections.get("in practice") || sections.get("practical applications") || "";
  const debunkedContent = sections.get("debunked assumptions") || sections.get("myths debunked") || "";
  const frameworksContent = sections.get("frameworks") || sections.get("strategic frameworks") || "";
  const playbooksContent = sections.get("playbooks") || sections.get("playbooks & heuristics") || "";
  const glossaryContent = sections.get("glossary") || sections.get("glossary (≤15 terms)") || "";
  const flashcardsContent = sections.get("feynman flashcards (≤10)") || sections.get("flashcards") || "";
  const quizContent = sections.get("quick quiz (3 q&a)") || sections.get("quiz") || "";
  const novelIdeasContent = sections.get("novel idea meter") || sections.get("novel ideas") || "";

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
              {new Date(summary.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Compact Horizontal Tag Bar */}
          {(summary.tags?.length > 0 || summary.categories?.length > 0) && (
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
                    />
                  ))}
                  
                  {/* More button */}
                  {summary.tags?.length > 5 && !showAllTags && (
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
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column - Primary Content (60%) */}
          <div className="lg:col-span-3 space-y-6">
            
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
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="summary">Full Summary</TabsTrigger>
                <TabsTrigger value="insights">Key Insights</TabsTrigger>
                <TabsTrigger value="learning">Learning Hub</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4 mt-4">
                {/* In Practice Section */}
                {inPracticeContent && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">In Practice</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {inPracticeContent}
                      </ReactMarkdown>
                    </div>
                  </Card>
                )}

                {/* Full Summary */}
                <Card className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Complete Summary</h3>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary.content || ""}
                    </ReactMarkdown>
                  </div>
                </Card>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4 mt-4">
                {/* Debunked Assumptions */}
                {debunkedContent && (
                  <Card className="p-5 bg-gradient-to-r from-amber-50 to-white border-amber-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Debunked Assumptions</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {debunkedContent}
                      </ReactMarkdown>
                    </div>
                  </Card>
                )}

                {/* Frameworks */}
                {frameworksContent && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">Strategic Frameworks</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {frameworksContent}
                      </ReactMarkdown>
                    </div>
                  </Card>
                )}

                {/* Playbooks */}
                {playbooksContent && (
                  <Card className="p-5 bg-gradient-to-r from-purple-50 to-white border-purple-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Playbooks & Heuristics</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {playbooksContent}
                      </ReactMarkdown>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Learning Hub Tab */}
              <TabsContent value="learning" className="space-y-4 mt-4">
                <Card className="p-5">
                  <Tabs defaultValue="flashcards" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                      <TabsTrigger value="quiz">Quiz</TabsTrigger>
                      <TabsTrigger value="glossary">Glossary</TabsTrigger>
                      <TabsTrigger value="ideas">Novel Ideas</TabsTrigger>
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
                  </Tabs>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Video & Toolkit (40%) - Sticky */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              
              {/* Video Player */}
              {summary.videoId && (
                <Card className="overflow-hidden">
                  <div className="aspect-video bg-gray-900">
                    <div ref={playerRef} className="w-full h-full" />
                  </div>
                </Card>
              )}

              {/* Unified Summary Toolkit */}
              <Card className="p-4">
                <Tabs defaultValue="actions" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-3">
                    <TabsTrigger value="actions">Quick Actions</TabsTrigger>
                    <TabsTrigger value="moments">Key Moments</TabsTrigger>
                  </TabsList>

                  {/* Quick Actions */}
                  <TabsContent value="actions" className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(summary.content || "", 'full')}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowShareModal(true)}
                        className="w-full"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
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
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-2"
                              disabled={!playerReady}
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

              {/* Insight Enrichment Card */}
              {(insightEnrichment.sentiment || insightEnrichment.stats_tools_links?.length || insightEnrichment.risks_blockers_questions?.length) && (
                <Card className="p-4 bg-gradient-to-r from-indigo-50 to-white border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-600" />
                    Insight Enrichment
                  </h3>
                  <div className="space-y-2 text-sm">
                    {insightEnrichment.sentiment && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sentiment</span>
                        <span className="font-medium capitalize">{insightEnrichment.sentiment}</span>
                      </div>
                    )}
                    {insightEnrichment.stats_tools_links && insightEnrichment.stats_tools_links.length > 0 && (
                      <div>
                        <span className="text-gray-600">Tools & Resources</span>
                        <div className="mt-1 space-y-1">
                          {insightEnrichment.stats_tools_links.slice(0, 3).map((link, idx) => (
                            <div key={idx} className="text-xs text-blue-600 truncate">
                              <ExternalLink className="h-3 w-3 inline mr-1" />
                              {link}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {insightEnrichment.risks_blockers_questions && insightEnrichment.risks_blockers_questions.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risks & Questions</span>
                        <span className="font-medium">{insightEnrichment.risks_blockers_questions.length} identified</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
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