"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ShareModal } from "@/components/molecules/ShareModal";
import { ActionsSidebar } from "@/components/molecules/ActionsSidebar";
import { KeyMomentsSidebar } from "@/components/molecules/KeyMomentsSidebar";
import { LearningHubTabs } from "@/components/molecules/LearningHubTabs";
import { MainContentColumn } from "@/components/molecules/MainContentColumn";
import { InsightEnrichment } from "@/components/molecules/InsightEnrichment";

// Backend data structure interfaces
import type {
  SummaryViewerProps,
  BackendKeyMoment,
  BackendFlashcard,
  BackendQuizQuestion,
  BackendFramework,
  BackendPlaybook,
  BackendNovelIdea,
  BackendInsightEnrichment,
  BackendAcceleratedLearningPack,
} from "./SummaryViewer.types";

// Safe JSON parsing utility for Prisma Json fields
function parseJsonField<T>(value: any, fallback: T | null = null): T | null {
  // If already parsed (object/array), return as-is
  if (typeof value === 'object' && value !== null) {
    return value as T;
  }
  
  // If string, try to parse
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      // Type guard: ensure parsed value is not null
      return parsed !== null ? parsed as T : fallback;
    } catch (error) {
      console.warn('Failed to parse JSON field:', error);
      return fallback;
    }
  }
  
  // Return fallback for null, undefined, empty string, etc.
  return fallback;
}

// Type guards for validating parsed data
function isValidKeyMomentsArray(value: any): value is BackendKeyMoment[] {
  return Array.isArray(value) && value.every(item => 
    typeof item === 'object' && 
    typeof item.timestamp === 'string' && 
    typeof item.insight === 'string'
  );
}

function isValidFrameworksArray(value: any): value is BackendFramework[] {
  return Array.isArray(value) && value.every(item => 
    typeof item === 'object' && 
    typeof item.name === 'string' && 
    typeof item.description === 'string'
  );
}

export function SummaryViewer({
  summary,
  isStreaming = false,
  className,
}: SummaryViewerProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  
  // Progressive disclosure: Start with reference sections collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set([
      "frameworks",
      "debunked",
      "practice",
      "playbooks",
      "enrichment",
      "learning",
      "full-summary", // Collapse full summary by default for above-the-fold optimization
    ]), // Start with reference sections collapsed
  );

  // YouTube player state management
  const [player, setPlayer] = useState<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const openShareModal = () => {
    setIsSharing(true);
    setShowShareModal(true);
  };
  const closeShareModal = () => {
    setIsSharing(false);
    setShowShareModal(false);
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

  // YouTube player initialization and API loading
  useEffect(() => {
    // Only load player if we have a valid videoId
    if (!summary.videoId) return;

    // Check if YouTube API is already loaded
    if (
      typeof (window as any).YT !== "undefined" &&
      (window as any).YT.Player
    ) {
      initializePlayer();
    } else {
      // Load YouTube IFrame API
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
  }, [initializePlayer, summary.videoId]);

  // Handle timestamp click navigation
  const handleTimestampClick = (timestamp: string) => {
    if (player && playerReady) {
      const seconds = parseTimestampToSeconds(timestamp);
      player.seekTo(seconds, true);
      player.playVideo();
    }
  };

  /**
   * Parse timestamp string to seconds for YouTube player navigation
   * 
   * Converts timestamp strings in MM:SS or HH:MM:SS format to total seconds.
   * Used for YouTube player seekTo functionality when users click timestamps.
   * 
   * @param {string} timestamp - Time string in MM:SS or HH:MM:SS format
   * @returns {number} Total seconds as integer
   * @example
   * ```typescript
   * parseTimestampToSeconds('5:30')    // 330 seconds
   * parseTimestampToSeconds('1:05:45') // 3945 seconds
   * parseTimestampToSeconds('invalid') // 0
   * ```
   * 
   * @category UI
   * @since 1.0.0
   */
  const parseTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  };

  // Toggle section collapse/expand
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle copying content to clipboard
  const handleCopy = async (content: string, sectionId?: string) => {
    try {
      await navigator.clipboard.writeText(content);
      if (sectionId) {
        setCopiedSections((prev) => new Set(prev).add(sectionId));
        setTimeout(() => {
          setCopiedSections((prev) => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  /**
   * Format duration from seconds to human-readable time format
   * 
   * Converts total seconds to HH:MM:SS or MM:SS format depending on duration.
   * Used for displaying video durations and progress times in the UI.
   * Handles padding with zeros for consistent formatting.
   * 
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted time string (HH:MM:SS or MM:SS)
   * @example
   * ```typescript
   * formatDuration(90)   // '1:30'
   * formatDuration(3665) // '1:01:05'
   * formatDuration(0)    // '0:00'
   * ```
   * 
   * @category UI
   * @since 1.0.0
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  /**
   * DATA PRIORITY PATTERN: Markdown-First Approach
   * 
   * This component prioritizes markdown sections from Gumloop over structured backend data.
   * 
   * Rationale:
   * 1. Markdown sections contain richer formatting and more complete content from Gumloop
   * 2. Structured data may have parsing issues or be incomplete  
   * 3. Markdown preserves the original Gumloop formatting (tables, lists, emphasis)
   * 
   * Priority Order:
   * 1. FIRST: Parsed markdown sections from summary.content
   * 2. SECOND: Structured backend fields (e.g., summary.playbooks, summary.frameworks)
   * 3. THIRD: Default/placeholder content
   * 
   * All child components (MainContentColumn, LearningHubTabs, InsightEnrichment) follow
   * this same markdown-first pattern for consistency.
   */
  
  // Parse content into sections
  const sections = new Map<string, string>();

  // Parse the content into sections based on markdown headers
  if (summary.content) {
    // Enhanced Gumloop content unwrapping - handle multiple format variations
    let contentToParse = summary.content;
    
    // Strip markdown code block wrapper if present
    const markdownBlockPatterns = [
      '```markdown\n',
      '```markdown',
      '```\n',
      '📄 MARKDOWN BLOCK\n',
      '📄 MARKDOWN BLOCK',
      '## MARKDOWN OUTPUT\n',
      '## MARKDOWN OUTPUT'
    ];
    
    for (const pattern of markdownBlockPatterns) {
      const startIndex = contentToParse.indexOf(pattern);
      if (startIndex !== -1) {
        const contentStart = startIndex + pattern.length;
        
        // For markdown blocks, find the closing ```
        if (pattern.startsWith('```')) {
          const markdownEnd = contentToParse.indexOf('```', contentStart);
          contentToParse = markdownEnd !== -1 
            ? contentToParse.slice(contentStart, markdownEnd)
            : contentToParse.slice(contentStart);
        } else {
          contentToParse = contentToParse.slice(contentStart);
        }
        break;
      }
    }
    
    // Clean up any remaining wrapper content
    contentToParse = contentToParse
      .replace(/^[\s\n]*/, '') // Remove leading whitespace
      .replace(/[\s\n]*$/, '') // Remove trailing whitespace
      .replace(/^---+[\s\n]*/, '') // Remove horizontal rules at start
      .replace(/[\s\n]*---+$/, ''); // Remove horizontal rules at end

    const lines = contentToParse.split("\n");
    let currentSection = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^#+\s*(.+)/);
      if (headerMatch) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections.set(
            currentSection.toLowerCase(),
            currentContent.join("\n").trim(),
          );
        }
        // Start new section
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections.set(
        currentSection.toLowerCase(),
        currentContent.join("\n").trim(),
      );
    }

    // Add common section name variations for better content extraction
    const sectionAliases = new Map<string, string[]>([
      [
        "playbooks",
        [
          "playbooks & heuristics",
          "playbook",
          "strategic playbooks",
          "heuristics",
        ],
      ],
      [
        "in practice",
        [
          "practical applications",
          "application",
          "implementation",
          "how to apply",
        ],
      ],
      [
        "debunked assumptions",
        [
          "myths debunked",
          "common misconceptions",
          "debunked myths",
          "assumptions",
        ],
      ],
      ["glossary", ["terms", "definitions", "key terms", "terminology"]],
      [
        "glossary (≤15 terms)", 
        ["glossary (≤15 terms)", "glossary", "terms", "definitions"]
      ],
      [
        "frameworks",
        ["strategic frameworks", "mental models", "framework", "models"],
      ],
      ["tl;dr", ["tl;dr (≤100 words)", "summary", "quick summary", "overview"]],
      [
        "feynman flashcards (≤10)", 
        ["feynman flashcards (≤10)", "feynman flashcards", "flashcards", "flash cards"]
      ],
      [
        "quick quiz (3 q&a)", 
        ["quick quiz (3 q&a)", "quick quiz", "quiz"]
      ],
      [
        "novel idea meter",
        ["novel-idea meter", "novel ideas", "innovation", "new concepts", "fresh insights"],
      ],
      [
        "insight enrichment",
        ["additional insights", "enrichment", "meta insights"],
      ],
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

  // Extract structured data from summary - handle both direct fields and nested JSON structures
  // Parse JSON strings from database safely with validation
  const parsedKeyMoments = parseJsonField<BackendKeyMoment[]>(summary.keyMoments, []) || parseJsonField<BackendKeyMoment[]>(summary.metadata?.key_moments, []) || [];
  const keyMoments: BackendKeyMoment[] = isValidKeyMomentsArray(parsedKeyMoments) ? parsedKeyMoments : [];
  
  const parsedFrameworks = parseJsonField<BackendFramework[]>(summary.frameworks, []) || [];
  const frameworks: BackendFramework[] = isValidFrameworksArray(parsedFrameworks) ? parsedFrameworks : [];
  const playbooks: BackendPlaybook[] = parseJsonField<BackendPlaybook[]>(summary.playbooks, []) || [];
  
  // Handle learning pack data - could be in learningPack or nested structures
  const learningPack = parseJsonField<BackendAcceleratedLearningPack>(summary.learningPack, {}) || parseJsonField<BackendAcceleratedLearningPack>(summary.accelerated_learning_pack, {}) || {};
  const flashcards: BackendFlashcard[] = learningPack.feynman_flashcards || parseJsonField<BackendFlashcard[]>(summary.flashcards, []) || [];
  const quizQuestions: BackendQuizQuestion[] = learningPack.quick_quiz || parseJsonField<BackendQuizQuestion[]>(summary.quiz_questions, []) || [];
  const novelIdeas: BackendNovelIdea[] = learningPack.novel_idea_meter || [];
  
  const insightEnrichment: BackendInsightEnrichment = parseJsonField<BackendInsightEnrichment>(summary.enrichment, {}) || parseJsonField<BackendInsightEnrichment>(summary.insight_enrichment, {}) || {};

  // Get parsed section content directly
  const novelIdeasContent = sections.get("novel idea meter") || sections.get("novel ideas") || "";
  const insightEnrichmentContent = sections.get("insight enrichment") || sections.get("additional insights") || "";

  /**
   * Parse glossary content into structured term-definition pairs
   * 
   * Extracts glossary terms and definitions from markdown content using pattern matching.
   * Looks for bold terms followed by colons and definitions. Used to populate
   * the Learning Hub glossary tab with key concepts from video content.
   * 
   * @param {string} content - Raw markdown content containing glossary items
   * @returns {Array<{term: string, definition: string}>} Array of term-definition objects
   * @example
   * ```typescript
   * const content = `
   * **React:** A JavaScript library for building user interfaces
   * **JSX:** A syntax extension for JavaScript
   * `
   * const glossary = parseSectionToGlossary(content)
   * // [
   * //   { term: 'React', definition: 'A JavaScript library for building user interfaces' },
   * //   { term: 'JSX', definition: 'A syntax extension for JavaScript' }
   * // ]
   * ```
   * 
   * @category UI
   * @since 1.0.0
   */
  const parseSectionToGlossary = (
    content: string,
  ): Array<{ term: string; definition: string }> => {
    const glossaryItems: Array<{ term: string; definition: string }> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("**") && line.includes(":**")) {
        const termMatch = line.match(/\*\*(.+?):\*\*(.*)/);
        if (termMatch) {
          glossaryItems.push({
            term: termMatch[1].trim(),
            definition: termMatch[2].trim(),
          });
        }
      }
    }

    return glossaryItems;
  };

  const glossary = parseSectionToGlossary(sections.get("glossary") || "");

  return (
    <article
      className={cn(
        "max-w-7xl mx-auto bg-slate-50 px-3 sm:px-4 lg:px-6 py-4",
        className,
      )}
      aria-label="Video summary"
    >
      {/* Optimized Layout - 2/3 + 1/3 split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Content Column (2/3 width on large screens) */}
        <div className="lg:col-span-2">
          <MainContentColumn
            summary={summary}
            playerRef={playerRef}
            playerReady={playerReady}
            sections={sections}
            collapsedSections={collapsedSections}
            copiedSections={copiedSections}
            toggleSection={toggleSection}
            handleCopy={handleCopy}
            formatDuration={formatDuration}
          />
        </div>

        {/* Sidebar (1/3 width on large screens) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Actions Sidebar */}
          <ActionsSidebar summary={summary} onShare={openShareModal} isSharing={isSharing} />

          {/* Key Moments Sidebar */}
          {keyMoments.length > 0 && (
            <KeyMomentsSidebar
              keyMoments={keyMoments}
              onTimestampClick={handleTimestampClick}
              playerReady={playerReady}
              collapsedSections={collapsedSections}
              copiedSections={copiedSections}
              toggleSection={toggleSection}
              handleCopy={handleCopy}
            />
          )}

          {/* Learning Hub Tabs */}
          <LearningHubTabs
            frameworks={frameworks}
            flashcards={flashcards}
            quizQuestions={quizQuestions}
            glossary={glossary}
            novelIdeas={novelIdeas}
            frameworksContent={
              sections.get("frameworks") || sections.get("strategic frameworks")
            }
            flashcardsContent={
              sections.get("feynman flashcards (≤10)") || sections.get("feynman flashcards") || sections.get("flashcards")
            }
            quickQuizContent={
              sections.get("quick quiz (3 q&a)") || sections.get("quick quiz") || sections.get("quiz")
            }
            novelIdeasContent={novelIdeasContent}
            collapsedSections={collapsedSections}
            copiedSections={copiedSections}
            toggleSection={toggleSection}
            handleCopy={handleCopy}
          />

          {/* Insight Enrichment */}
          <InsightEnrichment 
            data={insightEnrichment} 
            content={insightEnrichmentContent}
            collapsedSections={collapsedSections}
            copiedSections={copiedSections}
            toggleSection={toggleSection}
            handleCopy={handleCopy}
          />
        </div>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Generating summary...
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        summaryId={summary.id || ""}
        summaryTitle={summary.videoTitle || "Untitled Summary"}
        onSuccess={() => setIsSharing(false)}
      />
    </article>
  );
}
