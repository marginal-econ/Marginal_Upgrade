import {
  Check,
  Columns2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Images,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { V8FrontierDesk } from "@/components/examiner/v8-frontier-desk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DiagramRefMatch } from "@/lib/diagram-detection";
import type { DiagramEntry } from "@/lib/diagrams/catalog";
import type { ParagraphBlock } from "@/lib/essay-paragraphs";
import type { Grading } from "@/lib/examiner/types";
import { cn } from "@/lib/utils";

export interface AttachedDiagramThumb {
  id: string;
  label: string;
  imageUrl?: string;
}

export interface GradedReviewWorkspaceProps {
  grading: Grading;
  question: string;
  essayText: string;
  essayId?: string | null;
  paragraphBlocks: ParagraphBlock[];
  essayFont: "serif" | "sans";
  onChangeEssayFont: (font: "serif" | "sans") => void;
  onEditScript: () => void;
  onOpenSavedThread?: (essayId: string) => void;
  diagramMatches?: DiagramRefMatch[];
  attachedDiagrams?: AttachedDiagramThumb[];
  onInspectDiagram?: (entry: DiagramEntry) => void;
}

type ViewMode = "split" | "report" | "script";

export function GradedReviewWorkspace({
  grading,
  question,
  essayText,
  essayId,
  paragraphBlocks,
  essayFont,
  onChangeEssayFont,
  onEditScript,
  onOpenSavedThread,
  diagramMatches = [],
  attachedDiagrams = [],
  onInspectDiagram,
}: GradedReviewWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [copiedScript, setCopiedScript] = useState(false);

  const wordCount = useMemo(
    () => (essayText.trim() ? essayText.trim().split(/\s+/).filter(Boolean).length : 0),
    [essayText],
  );
  const readMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const textParagraphCount = useMemo(
    () => paragraphBlocks.filter((b) => !b.isDiagram).length,
    [paragraphBlocks],
  );
  const uploadedDiagramImages = useMemo(
    () => attachedDiagrams.filter((d) => Boolean(d.imageUrl)),
    [attachedDiagrams],
  );

  const handleCopyScript = () => {
    if (!essayText.trim()) return;
    navigator.clipboard.writeText(essayText);
    setCopiedScript(true);
    toast.success("Candidate script copied to clipboard.");
    window.setTimeout(() => setCopiedScript(false), 2000);
  };

  const renderScriptSheet = (isSplit: boolean) => (
    <section
      aria-label="Candidate Essay Script"
      className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden min-w-0"
    >
      {/* Script Sheet Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/70 bg-muted/25">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 text-primary shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
            Candidate Essay
          </h3>
          <Badge variant="outline" className="text-[10.5px] font-mono px-2 py-0">
            {wordCount} words
          </Badge>
          <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground">
            ~{readMinutes} min read
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-background/80 p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => onChangeEssayFont("serif")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer font-serif",
                essayFont === "serif"
                  ? "bg-muted text-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Serif
            </button>
            <button
              type="button"
              onClick={() => onChangeEssayFont("sans")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer font-sans",
                essayFont === "sans"
                  ? "bg-muted text-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sans
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyScript}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {copiedScript ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="hidden sm:inline">{copiedScript ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

      {/* Prompt Strip */}
      {question.trim() && (
        <div className="px-4 sm:px-5 py-2.5 border-b border-border/50 bg-muted/10 text-xs text-muted-foreground leading-relaxed">
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-foreground/75 mr-1.5">
            Question:
          </span>
          <span className="text-foreground/90 font-medium">{question.trim()}</span>
        </div>
      )}

      {/* Clean Unannotated Essay Manuscript */}
      <div
        className={cn(
          "px-4 py-5 sm:px-7 sm:py-6 space-y-4",
          isSplit && "lg:max-h-[calc(100vh-14.5rem)] lg:overflow-y-auto overscroll-contain",
        )}
      >
        {paragraphBlocks.length > 0 ? (
          paragraphBlocks.map((block) => {
            if (block.isDiagram) {
              const matchedDiag = diagramMatches.find(
                (m) =>
                  block.text.includes(m.matchText) ||
                  m.matchText.includes(block.text) ||
                  (block.diagramTitle && m.title.toLowerCase() === block.diagramTitle.toLowerCase()),
              );
              const displayTitle =
                block.diagramTitle ||
                matchedDiag?.title ||
                block.text
                  .replace(/^[\[\(\{]\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:\s*/i, "")
                  .replace(/[\]\)\}]$/, "")
                  .trim()
                  .slice(0, 60);

              return (
                <div
                  key={block.index}
                  className="ml-0 sm:ml-8 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Images className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        Figure: {displayTitle}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{block.label}</div>
                    </div>
                  </div>

                  {matchedDiag && onInspectDiagram && (
                    <button
                      type="button"
                      onClick={() => onInspectDiagram(matchedDiag.entry)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/70 bg-background/80 text-[11px] font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Eye className="size-3 text-primary" />
                      <span>Inspect</span>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div key={block.index} className="flex items-start gap-2.5 sm:gap-3.5">
                <span className="w-6 sm:w-7 shrink-0 pt-[0.38em] text-right font-mono text-[11px] tabular-nums text-muted-foreground/45 select-none">
                  ¶{block.textParagraphNumber ?? block.index + 1}
                </span>
                <p
                  className={cn(
                    "flex-1 min-w-0 text-[15px] leading-[1.85] text-foreground/95 whitespace-pre-wrap select-text",
                    essayFont === "serif" ? "font-serif" : "font-sans",
                  )}
                >
                  {block.text}
                </p>
              </div>
            );
          })
        ) : (
          <p
            className={cn(
              "text-[15px] leading-[1.85] text-foreground/95 whitespace-pre-wrap select-text",
              essayFont === "serif" ? "font-serif" : "font-sans",
            )}
          >
            {essayText}
          </p>
        )}

        {uploadedDiagramImages.length > 0 && (
          <div className="pt-4 mt-4 border-t border-border/60 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
              Attached Diagram Images ({uploadedDiagramImages.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadedDiagramImages.map((diag) => (
                <div
                  key={diag.id}
                  className="rounded-xl border border-border/70 bg-muted/15 p-2.5 space-y-1.5"
                >
                  <img
                    src={diag.imageUrl}
                    alt={diag.label}
                    className="max-h-44 w-full rounded-lg object-contain bg-background/80"
                  />
                  <p className="text-[11px] font-medium text-muted-foreground truncate text-center">
                    {diag.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Script Sheet Footer */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-border/60 bg-muted/15 flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
        <span>
          End of Script · {textParagraphCount}{" "}
          {textParagraphCount === 1 ? "paragraph" : "paragraphs"}
        </span>
        <button
          type="button"
          onClick={onEditScript}
          className="text-primary hover:underline font-semibold cursor-pointer"
        >
          Edit &amp; Re-Grade →
        </button>
      </div>
    </section>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Examiner Desk Action & View Bar */}
      <div
        id="candidate-report-header"
        className="rounded-2xl border border-border/80 bg-card/95 px-4 py-3 sm:px-5 shadow-xs flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="border-primary/35 bg-primary/10 text-primary text-[10.5px] font-mono uppercase tracking-wider"
            >
              Cambridge 9708
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {grading.max_mark} Marks · {wordCount} words
            </span>
          </div>
          {question.trim() && (
            <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {question.trim()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* View Mode Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Grading result layout"
            className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "split"}
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer",
                viewMode === "split"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Columns2 className="size-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "report"}
              onClick={() => setViewMode("report")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer",
                viewMode === "report"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3.5" />
              <span>Report Only</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "script"}
              onClick={() => setViewMode("script")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer",
                viewMode === "script"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-3.5" />
              <span>Essay Only</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEditScript}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <PenLine className="size-3.5 text-primary" />
            <span>Edit &amp; Re-Grade</span>
          </Button>

          {essayId && onOpenSavedThread && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenSavedThread(essayId)}
              className="h-8 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <span>Saved Thread</span>
              <ExternalLink className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      {viewMode === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] gap-6 items-start">
          {/* Left Column: Full Examiner Report */}
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Cambridge Examiner Report
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {grading.audited ? "Dual-Examiner Audited" : "Examiner Evaluation"}
              </span>
            </div>
            <V8FrontierDesk grading={grading} question={question} essayText={essayText} />
            <MarkBreakdown grading={grading} question={question} />
          </div>

          {/* Right Column: Sticky Clean Candidate Essay */}
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {renderScriptSheet(true)}
          </div>
        </div>
      ) : viewMode === "report" ? (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Cambridge Examiner Report
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {grading.audited ? "Dual-Examiner Audited" : "Examiner Evaluation"}
            </span>
          </div>
          <V8FrontierDesk grading={grading} question={question} essayText={essayText} />
          <MarkBreakdown grading={grading} question={question} />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">{renderScriptSheet(false)}</div>
      )}
    </div>
  );
}
