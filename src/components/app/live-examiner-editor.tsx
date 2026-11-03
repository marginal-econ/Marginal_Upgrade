import { Check, Sparkles, Wand2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ActiveAoClassification,
  ActiveIssue,
  IssueCategory,
  PredictedMark,
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
    underlineColor: "rgba(251, 113, 133, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(244, 63, 94, 0.16)",
  },
  clarity: {
    label: "Clarity",
    dot: "bg-purple-400",
    underlineColor: "rgba(192, 132, 252, 0.95)",
    underlineStyle: "dashed",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(192, 132, 252, 0.14)",
  },
  economics_accuracy: {
    label: "Economics accuracy",
    dot: "bg-rose-600 dark:bg-rose-400",
    underlineColor: "rgba(244, 63, 94, 0.98)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(225, 29, 72, 0.18)",
  },
  misconception: {
    label: "Economic misconception",
    dot: "bg-red-600 dark:bg-red-400",
    underlineColor: "rgba(239, 68, 68, 0.98)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(220, 38, 38, 0.18)",
  },
  analysis: {
    label: "Extend AO2 Analysis",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  application: {
    label: "Extend AO2 Application",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  evaluation: {
    label: "Extend AO3 Evaluation",
    dot: "bg-amber-400",
    underlineColor: "rgba(251, 191, 36, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 191, 36, 0.16)",
  },
  reasoning_chain: {
    label: "Chain of reasoning",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  terminology: {
    label: "Terminology",
    dot: "bg-purple-400",
    underlineColor: "rgba(192, 132, 252, 0.95)",
    underlineStyle: "dashed",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(192, 132, 252, 0.15)",
  },
};

const DIAGRAM_TAG = /\[DIAGRAM:[^\]]*\]/g;

export const AO_META: Record<"AO1" | "AO2" | "AO3", UnderlineStyleMeta> = {
  AO1: {
    label: "AO1 Knowledge",
    dot: "bg-sky-400",
    underlineColor: "rgba(56, 189, 248, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "6px",
    backgroundColor: "rgba(56, 189, 248, 0.11)",
  },
  AO2: {
    label: "AO2 Analysis",
    dot: "bg-emerald-400",
    underlineColor: "rgba(16, 185, 129, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  AO3: {
    label: "AO3 Evaluation",
    dot: "bg-amber-400",
    underlineColor: "rgba(245, 158, 11, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2.25px",
    offset: "6px",
    backgroundColor: "rgba(245, 158, 11, 0.13)",
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
  offset: "6px",
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

  // 2. Locate sentences in document order and apply AO classifications + issues seamlessly
  const allSentences = splitSentences(text);

  const aoPriority: Record<"AO3" | "AO2" | "AO1", number> = {
    AO3: 3,
    AO2: 2,
    AO1: 1,
  };
  const sortedClassifications = [...classifications].sort(
    (a, b) => (aoPriority[b.ao] ?? 0) - (aoPriority[a.ao] ?? 0),
  );

  const rawRanges: Range[] = [];
  let cursor = 0;

  for (const sentence of allSentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 3 || /\[DIAGRAM:[^\]]*\]/i.test(trimmed)) continue;

    // Locate sentence in text in sequential document order
    let at = text.indexOf(trimmed, cursor);
    if (at === -1) {
      at = text.indexOf(trimmed);
    }
    if (at === -1) continue;

    let sStart = at;
    let sEnd = at + trimmed.length;
    cursor = sEnd;

    // Absorb terminal punctuation (e.g. '.', '!', '?') if followed by whitespace or end of string
    if (sEnd < text.length && /[.!?]/.test(text[sEnd])) {
      const nextChar = text[sEnd + 1];
      if (!nextChar || /\s/.test(nextChar) || /[)\]"']/.test(nextChar)) {
        sEnd++;
      }
    }
    if (sEnd < text.length && /[)\]"']/.test(text[sEnd])) {
      const afterQuote = text[sEnd + 1];
      if (!afterQuote || /\s/.test(afterQuote)) {
        sEnd++;
      }
    }

    // Clean whitespace
    while (sStart < sEnd && /\s/.test(text[sStart])) sStart++;
    while (sEnd > sStart && /\s/.test(text[sEnd - 1])) sEnd--;
    if (sStart >= sEnd || overlapsProtected(sStart, sEnd)) continue;

    // Determine the Assessment Objective for this complete sentence:
    // Match against server classifications (prioritizing AO3 > AO2 > AO1), or fallback to deterministic
    const matched = sortedClassifications.find((c) => {
      const cContext = (c.context || "").trim();
      const cOrig = (c.original || "").trim();
      if (
        cContext.length >= 8 &&
        (cContext === trimmed || cContext.includes(trimmed) || trimmed.includes(cContext))
      ) {
        return true;
      }
      if (
        cOrig.length >= 8 &&
        (cOrig === trimmed || cOrig.includes(trimmed) || trimmed.includes(cOrig))
      ) {
        return true;
      }
      return false;
    });

    const activeClassification: ActiveAoClassification = matched
      ? matched
      : (() => {
          const auto = classifySentenceDeterministically(trimmed);
          return {
            id: `auto-${auto.ao}-${sStart}`,
            original: trimmed,
            context: trimmed,
            ao: auto.ao,
            explanation: auto.explanation,
          };
        })();

    // Check for issues that lie strictly inside this sentence
    const sentenceIssues = locatedIssues
      .filter((iss) => iss.start >= sStart && iss.end <= sEnd)
      .sort((a, b) => a.start - b.start);

    if (sentenceIssues.length === 0) {
      rawRanges.push({
        start: sStart,
        end: sEnd,
        id: activeClassification.id,
        kind: "classification",
        classification: activeClassification,
      });
    } else {
      let currentPos = sStart;
      for (const issue of sentenceIssues) {
        if (issue.start > currentPos) {
          rawRanges.push({
            start: currentPos,
            end: issue.start,
            id: activeClassification.id,
            kind: "classification",
            classification: activeClassification,
          });
        }
        rawRanges.push({
          start: issue.start,
          end: issue.end,
          id: issue.id,
          kind: "issue",
          issue: issue.issue,
        });
        currentPos = issue.end;
      }
      if (currentPos < sEnd) {
        rawRanges.push({
          start: currentPos,
          end: sEnd,
          id: activeClassification.id,
          kind: "classification",
          classification: activeClassification,
        });
      }
    }
  }

  // 3. Strictly sanitize against newlines: NO <mark> tag ever wraps across \n or \r
  // This guarantees zero background highlight boxes on empty lines or paragraph breaks!
  const sanitizedRanges: Range[] = [];
  for (const range of rawRanges) {
    const slice = text.slice(range.start, range.end);
    if (!/[\r\n]/.test(slice)) {
      if (range.start < range.end) {
        sanitizedRanges.push({ ...range });
      }
      continue;
    }

    let segStart = range.start;
    for (let i = range.start; i < range.end; i++) {
      if (text[i] === "\n" || text[i] === "\r") {
        if (i > segStart) {
          sanitizedRanges.push({ ...range, start: segStart, end: i, id: `${range.id}-${segStart}` });
        }
        segStart = i + 1;
      }
    }
    if (range.end > segStart) {
      sanitizedRanges.push({ ...range, start: segStart, end: range.end, id: `${range.id}-${segStart}` });
    }
  }

  // 4. Merge adjacent slices of identical identity
  sanitizedRanges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sanitizedRanges) {
    const previous = merged.at(-1);
    if (previous && previous.end === range.start && previous.id === range.id) {
      previous.end = range.end;
      continue;
    }
    merged.push({ ...range });
  }

  return merged;
}

export const LIVE_EXAMINER_TYPOGRAPHY: React.CSSProperties = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: "15px",
  lineHeight: "28px",
  letterSpacing: "-0.01em",
  wordSpacing: "0px",
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  tabSize: 2,
  textRendering: "geometricPrecision",
  fontVariantLigatures: "none",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
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
  predictedMark,
  maxMark,
  checking,
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
  predictedMark?: PredictedMark | null;
  maxMark?: number;
  checking?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringCardRef = useRef(false);
  const hoveredRangeIdRef = useRef<string | null>(null);

  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  const ranges = useMemo(
    () => computeRanges(value, issues, classifications),
    [value, issues, classifications],
  );
  const activeRange = ranges.find((range) => range.id === activeAnnotationId) ?? null;

  const computeCardPositionFromRect = useCallback(
    (rect: { top: number; bottom: number; left: number }, kind: "issue" | "classification") => {
      const container = containerRef.current;
      if (!container) return { top: 40, left: 24 };
      const containerBox = container.getBoundingClientRect();
      const relBottom = rect.bottom - containerBox.top;
      const relTop = rect.top - containerBox.top;
      const cardHeight = kind === "issue" ? 290 : 195;
      const cardWidth = kind === "issue" ? 340 : 300;
      const top =
        relBottom + cardHeight + 16 > containerBox.height && relTop - cardHeight > 16
          ? Math.max(12, relTop - cardHeight - 10)
          : Math.max(12, relBottom + 10);
      const maxLeft = Math.max(16, containerBox.width - cardWidth - 20);
      const left = Math.max(16, Math.min(rect.left - containerBox.left, maxLeft));
      return { top, left };
    },
    [],
  );

  // React to programmatic focus from the side panel
  useEffect(() => {
    if (focusedIssueId) {
      const hit = ranges.find((r) => r.id === focusedIssueId);
      if (hit && containerRef.current && textareaRef.current) {
        setActiveAnnotationId(hit.id);
        const markEl = highlightRef.current?.querySelector(
          `mark[data-range-id="${CSS.escape(hit.id)}"]`,
        );
        const markRect = markEl?.getBoundingClientRect();
        if (markRect && markRect.width > 0) {
          setCardPos(computeCardPositionFromRect(markRect, hit.kind));
        } else {
          const containerBox = containerRef.current.getBoundingClientRect();
          setCardPos({
            top: 40,
            left: Math.max(16, Math.min(containerBox.width - 340, 60)),
          });
        }
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(hit.start, hit.end);
      }
    }
  }, [focusedIssueId, ranges, computeCardPositionFromRect]);

  // Close the card if its issue was resolved elsewhere (accept/dismiss from
  // the side panel) or disappeared from a fresh check result.
  useEffect(() => {
    if (activeAnnotationId && !ranges.some((range) => range.id === activeAnnotationId)) {
      setActiveAnnotationId(null);
      setCardPos(null);
    }
  }, [ranges, activeAnnotationId]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

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

  // Keep scroll position strictly synchronized on every value change
  useEffect(() => {
    syncScroll();
  }, [value]);

  function handleMouseMove(event: React.MouseEvent<HTMLTextAreaElement>) {
    const highlightContainer = highlightRef.current;
    if (!highlightContainer) return;

    const { clientX, clientY } = event;
    const marks = highlightContainer.querySelectorAll<HTMLElement>("mark[data-range-id]");

    let matchedIssue: { id: string; rect: DOMRect } | null = null;
    let matchedClassification: { id: string; rect: DOMRect } | null = null;

    for (const mark of marks) {
      const rangeId = mark.dataset.rangeId;
      const rangeKind = mark.dataset.rangeKind as "issue" | "classification" | undefined;
      if (!rangeId || !rangeKind) continue;

      const rects = mark.getClientRects();
      for (const rect of rects) {
        if (
          clientX >= rect.left - 2 &&
          clientX <= rect.right + 2 &&
          clientY >= rect.top - 2 &&
          clientY <= rect.bottom + 7
        ) {
          if (rangeKind === "issue") {
            matchedIssue = { id: rangeId, rect };
            break;
          } else if (!matchedClassification) {
            matchedClassification = { id: rangeId, rect };
          }
        }
      }
      if (matchedIssue) break;
    }

    const bestHit = matchedIssue
      ? { ...matchedIssue, kind: "issue" as const }
      : matchedClassification
        ? { ...matchedClassification, kind: "classification" as const }
        : null;

    if (bestHit) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (hoveredRangeIdRef.current === bestHit.id) return;
      hoveredRangeIdRef.current = bestHit.id;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      const delay = bestHit.kind === "issue" ? 130 : 320;
      hoverTimerRef.current = setTimeout(() => {
        setActiveAnnotationId(bestHit.id);
        setCardPos(computeCardPositionFromRect(bestHit.rect, bestHit.kind));
      }, delay);
    } else {
      hoveredRangeIdRef.current = null;
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (activeAnnotationId && !isHoveringCardRef.current && !closeTimerRef.current) {
        closeTimerRef.current = setTimeout(() => {
          if (!isHoveringCardRef.current) {
            setActiveAnnotationId(null);
            setCardPos(null);
          }
          closeTimerRef.current = null;
        }, 280);
      }
    }
  }

  function handleMouseLeave() {
    hoveredRangeIdRef.current = null;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (activeAnnotationId && !isHoveringCardRef.current) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        if (!isHoveringCardRef.current) {
          setActiveAnnotationId(null);
          setCardPos(null);
        }
        closeTimerRef.current = null;
      }, 260);
    }
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
    setActiveAnnotationId(hit.id);
    const markEl = highlightRef.current?.querySelector(
      `mark[data-range-id="${CSS.escape(hit.id)}"]`,
    );
    const markRect = markEl?.getBoundingClientRect();
    if (markRect && markRect.width > 0) {
      setCardPos(computeCardPositionFromRect(markRect, hit.kind));
      return;
    }

    const containerBox = container.getBoundingClientRect();
    const clickY = event.clientY - containerBox.top;
    const cardHeight = hit.kind === "issue" ? 290 : 200;
    const top =
      clickY + cardHeight > containerBox.height && clickY - cardHeight > 20
        ? Math.max(20, clickY - cardHeight - 8)
        : Math.max(20, clickY + 16);
    const cardWidth = hit.kind === "issue" ? 340 : 300;
    const maxLeft = Math.max(16, containerBox.width - cardWidth - 24);
    const left = Math.max(16, Math.min(event.clientX - containerBox.left, maxLeft));

    setCardPos({ top, left });
  }

  function cycleNextIssue() {
    const issueRanges = ranges.filter((r) => r.kind === "issue");
    if (issueRanges.length === 0) return;
    const currentIdx = issueRanges.findIndex((r) => r.id === activeAnnotationId);
    const next = issueRanges[(currentIdx + 1) % issueRanges.length];
    setActiveAnnotationId(next.id);
    const markEl = highlightRef.current?.querySelector(
      `mark[data-range-id="${CSS.escape(next.id)}"]`,
    );
    const markRect = markEl?.getBoundingClientRect();
    if (markRect && markRect.width > 0) {
      setCardPos(computeCardPositionFromRect(markRect, "issue"));
    } else if (containerRef.current) {
      const containerBox = containerRef.current.getBoundingClientRect();
      setCardPos({
        top: 40,
        left: Math.max(16, Math.min(containerBox.width - 350, 60)),
      });
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(next.start, next.end);
    }
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
          msOverflowStyle: "none",
          margin: 0,
          border: 0,
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

          // Strictly isolate leading and trailing whitespace outside the <mark> tag
          // so whitespace NEVER receives a colored background box or underline
          const match = segment.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
          const leadingWs = match ? match[1] : "";
          const coreText = match ? match[2] : segment.text;
          const trailingWs = match ? match[3] : "";

          if (!coreText) {
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
            <span key={index}>
              {leadingWs ? (
                <span
                  style={{
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    backgroundColor: "transparent",
                    userSelect: "none",
                  }}
                >
                  {leadingWs}
                </span>
              ) : null}
              <mark
                data-range-id={segment.range.id}
                data-range-kind={segment.range.kind}
                style={{
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                  backgroundColor:
                    activeAnnotationId === segment.range.id
                      ? segment.range.kind === "issue"
                        ? "rgba(244, 63, 94, 0.18)"
                        : meta.backgroundColor
                      : meta.backgroundColor || "transparent",
                  textDecorationLine: "underline",
                  textDecorationStyle: meta.underlineStyle,
                  textDecorationColor: meta.underlineColor,
                  textDecorationThickness:
                    activeAnnotationId === segment.range.id ? "2.25px" : meta.underlineThickness,
                  textUnderlineOffset: meta.offset,
                  textDecorationSkipInk: "auto",
                  fontWeight: "normal",
                  userSelect: "none",
                  borderRadius: "3px",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                }}
              >
                {coreText}
              </mark>
              {trailingWs ? (
                <span
                  style={{
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    backgroundColor: "transparent",
                    userSelect: "none",
                  }}
                >
                  {trailingWs}
                </span>
              ) : null}
            </span>
          );
        })}
        {/* Trailing newline keeps the mirror's height in sync with the textarea. */}
        {"\n"}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          if (activeAnnotationId) {
            setActiveAnnotationId(null);
            setCardPos(null);
          }
          onChange(event.target.value);
        }}
        onScroll={syncScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleClick}
        onKeyDown={(event) => {
          if (event.key === "Tab" && activeRange?.kind === "issue") {
            event.preventDefault();
            onAccept(activeRange.issue.id);
            setActiveAnnotationId(null);
            setCardPos(null);
          }
        }}
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
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          margin: 0,
          border: 0,
        }}
        className={cn("p-6 md:p-8 [&::-webkit-scrollbar]:hidden", className)}
      />

      {/* Grammarly-style Floating Live Assistant HUD Pill at bottom-right of canvas */}
      {value.trim().length > 0 ? (
        <div className="pointer-events-auto absolute bottom-3 right-4 z-10 flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all">
          {predictedMark && maxMark ? (
            <div className="flex items-center gap-2 pr-2 border-r border-border/60">
              <div className="flex items-center gap-1">
                <Sparkles className="size-3.5 text-primary" />
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {predictedMark.total_mark}
                  <span className="text-muted-foreground font-normal">/{maxMark}</span>
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium tabular-nums">
                <span className="rounded bg-ao1/15 px-1.5 py-0.5 text-ao1">
                  AO1 {predictedMark.ao_breakdown.knowledge.awarded}/
                  {predictedMark.ao_breakdown.knowledge.out_of}
                </span>
                <span className="rounded bg-ao2/15 px-1.5 py-0.5 text-ao2">
                  AO2 {predictedMark.ao_breakdown.analysis.awarded}/
                  {predictedMark.ao_breakdown.analysis.out_of}
                </span>
                {predictedMark.ao_breakdown.evaluation.out_of > 0 ? (
                  <span className="rounded bg-ao3/15 px-1.5 py-0.5 text-ao3">
                    AO3 {predictedMark.ao_breakdown.evaluation.awarded}/
                    {predictedMark.ao_breakdown.evaluation.out_of}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {issues.length > 0 ? (
            <button
              type="button"
              onClick={cycleNextIssue}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:opacity-80 transition-opacity"
              title="Click to jump through active issues in your essay"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
              <span className="tabular-nums">
                {issues.length} {issues.length === 1 ? "fix" : "fixes"}
              </span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              {checking ? "Calibrating..." : "Clean"}
            </span>
          )}
        </div>
      ) : null}

      {activeRange?.kind === "issue" && cardPos ? (
        <SuggestionCard
          issue={activeRange.issue}
          style={{ top: cardPos.top, left: cardPos.left }}
          onMouseEnter={() => {
            isHoveringCardRef.current = true;
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isHoveringCardRef.current = false;
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onAccept={() => {
            isHoveringCardRef.current = false;
            onAccept(activeRange.issue.id);
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onDismiss={() => {
            isHoveringCardRef.current = false;
            onDismiss(activeRange.issue.id);
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onClose={() => {
            isHoveringCardRef.current = false;
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
        />
      ) : null}

      {activeRange?.kind === "classification" && cardPos ? (
        <ClassificationCard
          classification={activeRange.classification}
          style={{ top: cardPos.top, left: cardPos.left }}
          onMouseEnter={() => {
            isHoveringCardRef.current = true;
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isHoveringCardRef.current = false;
            setActiveAnnotationId(null);
            setCardPos(null);
          }}
          onClose={() => {
            isHoveringCardRef.current = false;
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
  onMouseEnter,
  onMouseLeave,
}: {
  classification: ActiveAoClassification;
  style: React.CSSProperties;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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

  const aoBadgeClass =
    {
      AO1: "border-ao1/40 bg-ao1/15 text-ao1 font-semibold",
      AO2: "border-ao2/40 bg-ao2/15 text-ao2 font-semibold",
      AO3: "border-ao3/40 bg-ao3/15 text-ao3 font-semibold",
    }[classification.ao] ?? "border-ao1/40 bg-ao1/15 text-ao1 font-semibold";

  return (
    <div
      ref={ref}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="
        absolute z-30 w-80 space-y-2.5 rounded-xl border border-border/90
        bg-popover/95 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-md
        animate-in fade-in-0 zoom-in-95 duration-150
      "
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} />
          <Badge variant="outline" className={cn("text-[10px] tracking-wide", aoBadgeClass)}>
            {meta.label}
          </Badge>
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Creditworthy Sentence
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-xs font-medium leading-relaxed line-clamp-3 rounded-md bg-muted/40 p-2 border border-border/50">
        "{classification.original}"
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{classification.explanation}</p>
    </div>
  );
}

function SuggestionCard({
  issue,
  style,
  onAccept,
  onDismiss,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  issue: ActiveIssue;
  style: React.CSSProperties;
  onAccept: () => void;
  onDismiss: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const meta = CATEGORY_META[issue.category] ?? DEFAULT_ISSUE_META;
  const ref = useRef<HTMLDivElement>(null);
  const isEssential =
    issue.category === "misconception" ||
    issue.category === "economics_accuracy" ||
    issue.severity === "high";

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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="
        absolute z-30 w-[340px] space-y-3 rounded-xl border border-border/90
        bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur-md
        animate-in fade-in-0 zoom-in-95 duration-150
      "
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} />
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold",
              issue.category === "misconception" || issue.category === "economics_accuracy"
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
            {isEssential ? "Mark-Critical Fix" : "Precision Fix"}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Interactive One-Click Diff Pill */}
      <div
        onClick={onAccept}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAccept();
          }
        }}
        className="
          group cursor-pointer space-y-1.5 rounded-lg border border-border/80
          bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/40
          p-2.5 text-xs transition-colors
        "
        title="Click to apply revision"
      >
        <div className="flex items-start gap-1.5 text-destructive">
          <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 mt-0.5 text-destructive/80">
            Original:
          </span>
          <span className="line-through">{issue.original}</span>
        </div>
        <div className="flex items-start justify-between gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold pt-1.5 border-t border-border/50">
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 mt-0.5 text-emerald-600/80 dark:text-emerald-400/80">
              Revision:
            </span>
            <span>{cleanSuggestion(issue.suggestion)}</span>
          </div>
          <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Tab ↵
          </span>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Wand2 className="size-3 text-primary" /> Examiner Diagnostic
        </p>
        <p className="leading-relaxed text-foreground/90">{issue.explanation}</p>
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
          className="h-8 flex-1 text-xs gap-1.5 font-semibold shadow-sm"
          onClick={onAccept}
        >
          <Check className="size-3.5" /> Accept Revision
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs px-3 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
