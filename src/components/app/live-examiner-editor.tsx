import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ActiveAoClassification,
  ActiveIssue,
  IssueCategory,
} from "@/hooks/use-live-examiner-check";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";
import { classifySentenceDeterministically } from "@/lib/live-examiner/client-evaluation";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { AO_DEFINITIONS } from "@/lib/examiner/config";
import { cn } from "@/lib/utils";

const CATEGORY_AO: Record<IssueCategory, string | null> = {
  grammar: null,
  clarity: null,
  economics_accuracy: AO_DEFINITIONS.ao1.code,
  terminology: AO_DEFINITIONS.ao1.code,
  analysis: AO_DEFINITIONS.ao2.code,
  application: AO_DEFINITIONS.ao2.code,
  reasoning_chain: AO_DEFINITIONS.ao2.code,
  evaluation: AO_DEFINITIONS.ao3.code,
  misconception: AO_DEFINITIONS.ao1.code,
};

export type UnderlineStyleMeta = {
  label: string;
  dot: string;
  underlineColor: string;
  underlineStyle: "wavy" | "solid" | "dashed";
  underlineThickness: string;
  offset: string;
  backgroundColor: string;
};

const CATEGORY_META: Record<IssueCategory, UnderlineStyleMeta> = {
  grammar: {
    label: "Grammar",
    dot: "bg-rose-500 dark:bg-rose-400",
    underlineColor: "rgba(244, 63, 94, 0.85)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "5px",
    backgroundColor: "rgba(244, 63, 94, 0.08)",
  },
  clarity: {
    label: "Clarity",
    dot: "bg-muted-foreground",
    underlineColor: "rgba(161, 161, 170, 0.85)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "5px",
    backgroundColor: "rgba(161, 161, 170, 0.08)",
  },
  economics_accuracy: {
    label: "Economics accuracy",
    dot: "bg-rose-600 dark:bg-rose-400",
    underlineColor: "rgba(225, 29, 72, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "2.5px",
    offset: "5px",
    backgroundColor: "rgba(225, 29, 72, 0.10)",
  },
  misconception: {
    label: "Economic misconception",
    dot: "bg-red-600 dark:bg-red-400",
    underlineColor: "rgba(220, 38, 38, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "2.5px",
    offset: "5px",
    backgroundColor: "rgba(220, 38, 38, 0.10)",
  },
  analysis: {
    label: "Analysis",
    dot: "bg-ao2",
    underlineColor: "var(--ao2)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  application: {
    label: "Application",
    dot: "bg-ao2",
    underlineColor: "var(--ao2)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  evaluation: {
    label: "Evaluation",
    dot: "bg-ao3",
    underlineColor: "var(--ao3)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  reasoning_chain: {
    label: "Chain of reasoning",
    dot: "bg-ao2",
    underlineColor: "var(--ao2)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  terminology: {
    label: "Terminology",
    dot: "bg-ao1",
    underlineColor: "var(--ao1)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
};

const DIAGRAM_TAG = /\[DIAGRAM:[^\]]*\]/g;

const AO_META: Record<"AO1" | "AO2" | "AO3", UnderlineStyleMeta> = {
  AO1: {
    label: "AO1 Knowledge",
    dot: "bg-ao1",
    underlineColor: "var(--ao1)",
    underlineStyle: "solid",
    underlineThickness: "2.5px",
    offset: "5px",
    backgroundColor: "rgba(59, 130, 246, 0.22)",
  },
  AO2: {
    label: "AO2 Analysis",
    dot: "bg-ao2",
    underlineColor: "var(--ao2)",
    underlineStyle: "solid",
    underlineThickness: "2.5px",
    offset: "5px",
    backgroundColor: "rgba(16, 185, 129, 0.20)",
  },
  AO3: {
    label: "AO3 Evaluation",
    dot: "bg-ao3",
    underlineColor: "var(--ao3)",
    underlineStyle: "solid",
    underlineThickness: "2.5px",
    offset: "5px",
    backgroundColor: "rgba(245, 158, 11, 0.24)",
  },
};

export type Range =
  | { start: number; end: number; id: string; kind: "issue"; issue: ActiveIssue }
  | {
      start: number;
      end: number;
      id: string;
      kind: "classification";
      classification: ActiveAoClassification;
    };

const DEFAULT_ISSUE_META: UnderlineStyleMeta = {
  label: "Correction",
  dot: "bg-rose-500 dark:bg-rose-400",
  underlineColor: "rgba(244, 63, 94, 0.85)",
  underlineStyle: "dashed",
  underlineThickness: "1.5px",
  offset: "5px",
  backgroundColor: "rgba(244, 63, 94, 0.08)",
};

/** Locate every issue's `original` text and AO classification inside the essay.
 *  Issues take precedence over classifications for styling and suggestions,
 *  while allowing the surrounding sentence to retain its AO underline.
 *  Diagram and table tags ([DIAGRAM: ...]) are protected from underlines. */
export function computeRanges(
  text: string,
  issues: ActiveIssue[],
  classifications: ActiveAoClassification[],
): Range[] {
  if (!text) return [];

  const protectedSpans: Array<[number, number]> = [];
  for (const match of text.matchAll(DIAGRAM_TAG)) {
    protectedSpans.push([match.index!, match.index! + match[0].length]);
  }

  const overlapsProtected = (start: number, end: number) =>
    protectedSpans.some(([pStart, pEnd]) => start < pEnd && end > pStart);

  // 1. Locate issues (non-overlapping among each other, skipping diagrams)
  type LocatedIssue = { start: number; end: number; id: string; issue: ActiveIssue };
  const locatedIssues: LocatedIssue[] = [];

  for (const issue of issues) {
    if (!issue.original) continue;
    let foundStart = -1;

    // First try: locate within issue.context
    if (issue.context) {
      let searchContextFrom = 0;
      while (true) {
        const at = text.indexOf(issue.context, searchContextFrom);
        if (at === -1) break;
        let searchOriginalFrom = 0;
        while (true) {
          const localIndex = issue.context.indexOf(issue.original, searchOriginalFrom);
          if (localIndex === -1) break;
          const candidateStart = at + localIndex;
          const candidateEnd = candidateStart + issue.original.length;
          const collides =
            overlapsProtected(candidateStart, candidateEnd) ||
            locatedIssues.some((r) => candidateStart < r.end && candidateEnd > r.start);
          if (!collides) {
            foundStart = candidateStart;
            break;
          }
          searchOriginalFrom = localIndex + 1;
        }
        if (foundStart !== -1) break;
        searchContextFrom = at + 1;
      }
    }

    // Fallback: search issue.original directly in text
    if (foundStart === -1) {
      let searchOriginalFrom = 0;
      while (true) {
        const at = text.indexOf(issue.original, searchOriginalFrom);
        if (at === -1) break;
        const candidateStart = at;
        const candidateEnd = candidateStart + issue.original.length;
        const collides =
          overlapsProtected(candidateStart, candidateEnd) ||
          locatedIssues.some((r) => candidateStart < r.end && candidateEnd > r.start);
        if (!collides) {
          foundStart = candidateStart;
          break;
        }
        searchOriginalFrom = at + 1;
      }
    }

    if (foundStart !== -1) {
      locatedIssues.push({
        start: foundStart,
        end: foundStart + issue.original.length,
        id: issue.id,
        issue,
      });
    }
  }

  // 2. Locate classifications (non-overlapping among each other, skipping diagrams)
  // Classifications are located INDEPENDENTLY of issues, prioritizing higher-order objectives:
  // AO3 (Evaluation) > AO2 (Analysis) > AO1 (Knowledge).
  // Highlights and underlines the WHOLE sentence, not just phrases.
  type LocatedClassification = {
    start: number;
    end: number;
    id: string;
    classification: ActiveAoClassification;
  };
  const locatedClassifications: LocatedClassification[] = [];

  const aoPriority: Record<"AO3" | "AO2" | "AO1", number> = {
    AO3: 3,
    AO2: 2,
    AO1: 1,
  };
  const sortedClassifications = [...classifications].sort(
    (a, b) => (aoPriority[b.ao] ?? 0) - (aoPriority[a.ao] ?? 0),
  );

  for (const classification of sortedClassifications) {
    const targetSentence = (classification.context || classification.original || "").trim();
    if (!targetSentence) continue;

    let foundStart = -1;
    let foundLength = targetSentence.length;

    let searchFrom = 0;
    while (true) {
      const at = text.indexOf(targetSentence, searchFrom);
      if (at === -1) break;
      const candidateStart = at;
      const candidateEnd = candidateStart + targetSentence.length;
      const collides =
        overlapsProtected(candidateStart, candidateEnd) ||
        locatedClassifications.some((r) => candidateStart < r.end && candidateEnd > r.start);
      if (!collides) {
        foundStart = candidateStart;
        foundLength = targetSentence.length;
        break;
      }
      searchFrom = at + 1;
    }

    // Fallback: search classification.original if context was not matched verbatim
    if (foundStart === -1 && classification.original && classification.original.trim() !== targetSentence) {
      const fallbackStr = classification.original.trim();
      let searchFromOrig = 0;
      while (true) {
        const at = text.indexOf(fallbackStr, searchFromOrig);
        if (at === -1) break;
        const candidateStart = at;
        const candidateEnd = candidateStart + fallbackStr.length;
        const collides =
          overlapsProtected(candidateStart, candidateEnd) ||
          locatedClassifications.some((r) => candidateStart < r.end && candidateEnd > r.start);
        if (!collides) {
          foundStart = candidateStart;
          foundLength = fallbackStr.length;
          break;
        }
        searchFromOrig = at + 1;
      }
    }

    if (foundStart !== -1) {
      locatedClassifications.push({
        start: foundStart,
        end: foundStart + foundLength,
        id: classification.id,
        classification,
      });
    }
  }

  // 2b. Full Coverage Guarantee: ensure 100% of sentences in text are identified and color-coded
  const allSentences = splitSentences(text);
  for (const sentence of allSentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 5 || /\[DIAGRAM:[^\]]*\]/i.test(trimmed)) continue;

    // Check if this sentence is already located
    const alreadyLocated = locatedClassifications.some((loc) => {
      const locText = text.slice(loc.start, loc.end).trim();
      return locText.includes(trimmed) || trimmed.includes(locText);
    });

    if (!alreadyLocated) {
      let searchFrom = 0;
      while (true) {
        const at = text.indexOf(trimmed, searchFrom);
        if (at === -1) break;
        const candidateStart = at;
        const candidateEnd = candidateStart + trimmed.length;
        const collides =
          overlapsProtected(candidateStart, candidateEnd) ||
          locatedClassifications.some((r) => candidateStart < r.end && candidateEnd > r.start);
        if (!collides) {
          const auto = classifySentenceDeterministically(trimmed);
          locatedClassifications.push({
            start: candidateStart,
            end: candidateEnd,
            id: `auto-${auto.ao}-${candidateStart}`,
            classification: {
              id: `auto-${auto.ao}-${candidateStart}`,
              original: trimmed,
              context: trimmed,
              ao: auto.ao,
              explanation: auto.explanation,
            },
          });
          break;
        }
        searchFrom = at + 1;
      }
    }
  }

  // 3. Sweep-line interval subdivision: split text into disjoint slices where issues take priority over classifications
  const points = new Set<number>();
  for (const item of locatedIssues) {
    points.add(item.start);
    points.add(item.end);
  }
  for (const item of locatedClassifications) {
    points.add(item.start);
    points.add(item.end);
  }

  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const rawRanges: Range[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const pStart = sortedPoints[i];
    const pEnd = sortedPoints[i + 1];
    if (pStart >= pEnd) continue;

    // Issue takes priority for underline & suggestion card
    const matchingIssue = locatedIssues.find(
      (item) => item.start <= pStart && item.end >= pEnd,
    );
    if (matchingIssue) {
      rawRanges.push({
        start: pStart,
        end: pEnd,
        id: matchingIssue.id,
        kind: "issue",
        issue: matchingIssue.issue,
      });
      continue;
    }

    // Otherwise, check if within an AO classification
    const matchingClassification = locatedClassifications.find(
      (item) => item.start <= pStart && item.end >= pEnd,
    );
    if (matchingClassification) {
      rawRanges.push({
        start: pStart,
        end: pEnd,
        id: matchingClassification.id,
        kind: "classification",
        classification: matchingClassification.classification,
      });
      continue;
    }
  }

  // 4. Merge adjacent slices of identical identity or contiguous same-AO classifications
  const merged: Range[] = [];
  for (const range of rawRanges) {
    const previous = merged.at(-1);
    if (previous && previous.end === range.start) {
      // Merge identical issues
      if (previous.kind === "issue" && range.kind === "issue" && previous.id === range.id) {
        previous.end = range.end;
        continue;
      }
      // Merge identical classifications
      if (
        previous.kind === "classification" &&
        range.kind === "classification" &&
        previous.id === range.id
      ) {
        previous.end = range.end;
        continue;
      }
    }
    // Also merge adjacent classifications of the same AO if separated only by whitespace (<= 3 chars)
    if (previous) {
      const gap = text.slice(previous.end, range.start);
      if (
        previous.kind === "classification" &&
        range.kind === "classification" &&
        previous.classification.ao === range.classification.ao &&
        gap.length <= 3 &&
        gap.trim() === ""
      ) {
        previous.end = range.end;
        continue;
      }
    }
    merged.push({ ...range });
  }

  return merged;
}

export const LIVE_EXAMINER_TYPOGRAPHY: React.CSSProperties = {
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: "16px",
  lineHeight: "32px",
  letterSpacing: "0px",
  wordSpacing: "0px",
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  tabSize: 2,
};

export function LiveExaminerEditor({
  value,
  onChange,
  issues,
  classifications,
  onAccept,
  onDismiss,
  placeholder,
  className,
  focusedIssueId,
}: {
  value: string;
  onChange: (next: string) => void;
  issues: ActiveIssue[];
  classifications: ActiveAoClassification[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  placeholder?: string;
  className?: string;
  focusedIssueId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  const ranges = useMemo(
    () => computeRanges(value, issues, classifications),
    [value, issues, classifications],
  );
  const activeRange = ranges.find((range) => range.id === activeAnnotationId) ?? null;

  // React to programmatic focus from the side panel
  useEffect(() => {
    if (focusedIssueId) {
      const hit = ranges.find((r) => r.id === focusedIssueId);
      if (hit && containerRef.current && textareaRef.current) {
        setActiveAnnotationId(hit.id);
        const containerBox = containerRef.current.getBoundingClientRect();
        // Position card near middle-top if clicked from panel
        setCardPos({
          top: 40,
          left: Math.max(16, Math.min(containerBox.width - 340, 60)),
        });
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(hit.start, hit.end);
      }
    }
  }, [focusedIssueId, ranges]);

  // Close the card if its issue was resolved elsewhere (accept/dismiss from
  // the side panel) or disappeared from a fresh check result.
  useEffect(() => {
    if (activeAnnotationId && !ranges.some((range) => range.id === activeAnnotationId)) {
      setActiveAnnotationId(null);
      setCardPos(null);
    }
  }, [ranges, activeAnnotationId]);

  const segments = useMemo(() => {
    const nodes: Array<{ text: string; range: Range | null }> = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) nodes.push({ text: value.slice(cursor, range.start), range: null });
      nodes.push({ text: value.slice(range.start, range.end), range });
      cursor = range.end;
    }
    if (cursor < value.length) nodes.push({ text: value.slice(cursor), range: null });
    return nodes;
  }, [value, ranges]);

  function syncScroll() {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
  }

  function handleClick(event: React.MouseEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;
    const at = textarea.selectionStart;
    const hit =
      ranges.find((r) => r.kind === "issue" && at >= r.start && at <= r.end) ??
      ranges.find((r) => at >= r.start && at <= r.end);
    if (!hit) {
      setActiveAnnotationId(null);
      setCardPos(null);
      return;
    }
    const containerBox = container.getBoundingClientRect();
    const clickY = event.clientY - containerBox.top;
    const cardHeight = hit.kind === "issue" ? 280 : 200;
    const top =
      clickY + cardHeight > containerBox.height && clickY - cardHeight > 20
        ? Math.max(20, clickY - cardHeight - 8)
        : Math.max(20, clickY + 16);
    const cardWidth = hit.kind === "issue" ? 320 : 288;
    const maxLeft = Math.max(16, containerBox.width - cardWidth - 24);
    const left = Math.max(16, Math.min(event.clientX - containerBox.left, maxLeft));

    setCardPos({ top, left });
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[580px]">
      <div
        ref={highlightRef}
        aria-hidden
        style={{
          ...LIVE_EXAMINER_TYPOGRAPHY,
          position: "absolute",
          inset: 0,
          color: "transparent",
          WebkitTextFillColor: "transparent",
          backgroundColor: "transparent",
          userSelect: "none",
          pointerEvents: "none",
          overflowY: "scroll",
          overflowX: "hidden",
          scrollbarWidth: "none",
        }}
        className={cn("p-6 md:p-8 [&::-webkit-scrollbar]:hidden", className)}
      >
        {segments.map((segment, index) => {
          if (!segment.range) {
            return (
              <span
                key={index}
                style={{
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                  backgroundColor: "transparent",
                  userSelect: "none",
                }}
              >
                {segment.text}
              </span>
            );
          }

          const meta =
            segment.range.kind === "issue"
              ? CATEGORY_META[segment.range.issue.category] ?? DEFAULT_ISSUE_META
              : AO_META[segment.range.classification.ao] ?? AO_META.AO1;

          return (
            <mark
              key={index}
              style={{
                color: "transparent",
                WebkitTextFillColor: "transparent",
                backgroundColor: meta.backgroundColor || "transparent",
                textDecorationLine: "underline",
                textDecorationStyle: meta.underlineStyle,
                textDecorationColor: meta.underlineColor,
                textDecorationThickness: meta.underlineThickness,
                textUnderlineOffset: meta.offset,
                textDecorationSkipInk: "none",
                fontWeight: "normal",
                userSelect: "none",
                borderRadius: "3px",
              }}
            >
              {segment.text}
            </mark>
          );
        })}
        {/* Trailing newline keeps the mirror's height in sync with the textarea. */}
        {"\n"}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        onMouseUp={handleClick}
        onKeyUp={(event) => {
          if (event.key === "Escape") {
            setActiveAnnotationId(null);
            setCardPos(null);
          }
        }}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          ...LIVE_EXAMINER_TYPOGRAPHY,
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "580px",
          backgroundColor: "transparent",
          color: "inherit",
          caretColor: "currentColor",
          outline: "none",
          resize: "none",
          overflowY: "scroll",
          overflowX: "hidden",
        }}
        className={cn("p-6 md:p-8", className)}
      />

      {activeRange?.kind === "issue" && cardPos ? (
        <SuggestionCard
          issue={activeRange.issue}
          style={{ top: cardPos.top, left: cardPos.left }}
          onAccept={() => {
            onAccept(activeRange.issue.id);
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onDismiss={() => {
            onDismiss(activeRange.issue.id);
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onClose={() => {
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
        />
      ) : null}

      {activeRange?.kind === "classification" && cardPos ? (
        <ClassificationCard
          classification={activeRange.classification}
          style={{ top: cardPos.top, left: cardPos.left }}
          onClose={() => {
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ClassificationCard({
  classification,
  style,
  onClose,
}: {
  classification: ActiveAoClassification;
  style: React.CSSProperties;
  onClose: () => void;
}) {
  const meta = AO_META[classification.ao] ?? AO_META.AO1;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  const aoBadgeClass = {
    AO1: "border-ao1/40 bg-ao1/10 text-ao1 font-semibold",
    AO2: "border-ao2/40 bg-ao2/10 text-ao2 font-semibold",
    AO3: "border-ao3/40 bg-ao3/10 text-ao3 font-semibold",
  }[classification.ao] ?? "border-ao1/40 bg-ao1/10 text-ao1 font-semibold";

  return (
    <div
      ref={ref}
      style={style}
      className="absolute z-20 w-72 space-y-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
        <Badge variant="outline" className={cn("text-[10px]", aoBadgeClass)}>
          {meta.label}
        </Badge>
      </div>
      <p className="text-xs font-medium leading-relaxed">{classification.original}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{classification.explanation}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-full text-xs"
        onClick={onClose}
      >
        Close
      </Button>
    </div>
  );
}

function SuggestionCard({
  issue,
  style,
  onAccept,
  onDismiss,
  onClose,
}: {
  issue: ActiveIssue;
  style: React.CSSProperties;
  onAccept: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const meta = CATEGORY_META[issue.category] ?? DEFAULT_ISSUE_META;
  const ref = useRef<HTMLDivElement>(null);
  const isEssential = issue.category === "misconception" || issue.severity === "high";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={style}
      className="absolute z-30 w-80 space-y-3 rounded-xl border border-border/90 bg-popover/95 p-3.5 text-popover-foreground shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold",
              issue.category === "misconception"
                ? "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300"
                : CATEGORY_AO[issue.category] === "AO1"
                  ? "border-ao1/40 bg-ao1/10 text-ao1"
                  : CATEGORY_AO[issue.category] === "AO2"
                    ? "border-ao2/40 bg-ao2/10 text-ao2"
                    : CATEGORY_AO[issue.category] === "AO3"
                      ? "border-ao3/40 bg-ao3/10 text-ao3"
                      : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {meta.label}
            {CATEGORY_AO[issue.category] ? ` · ${CATEGORY_AO[issue.category]}` : ""}
          </Badge>
          <Badge
            variant={isEssential ? "destructive" : "secondary"}
            className="text-[9px] uppercase tracking-wider font-semibold"
          >
            {isEssential ? "Essential Correction" : "Stylistic Enhancement"}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Visual Diff Box */}
      <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs">
        <div className="flex items-start gap-1.5 text-destructive">
          <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 mt-0.5 text-destructive/80">
            Original:
          </span>
          <span className="line-through">{issue.original}</span>
        </div>
        <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-border/50">
          <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 mt-0.5 text-emerald-600/80 dark:text-emerald-400/80">
            Revision:
          </span>
          <span>{cleanSuggestion(issue.suggestion)}</span>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
          Examiner Rationale
        </p>
        <p className="leading-relaxed text-muted-foreground">{issue.explanation}</p>
      </div>

      {issue.evidence ? (
        <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground italic">
          "{issue.evidence}"
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="h-7 flex-1 text-xs gap-1.5 font-medium"
          onClick={onAccept}
        >
          <Check className="size-3.5" /> Accept Revision
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs px-3 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
