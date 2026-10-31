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
import { cleanStars, cn } from "@/lib/utils";

const CATEGORY_AO: Record<IssueCategory, string | null> = {
  grammar: null,
  clarity: null,
  economics_accuracy: "Accuracy",
  terminology: AO_DEFINITIONS.ao1.code,
  analysis: AO_DEFINITIONS.ao2.code,
  application: AO_DEFINITIONS.ao2.code,
  reasoning_chain: AO_DEFINITIONS.ao2.code,
  evaluation: AO_DEFINITIONS.ao3.code,
  misconception: "Misconception",
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
    offset: "6px",
    backgroundColor: "rgba(244, 63, 94, 0.08)",
  },
  clarity: {
    label: "Clarity",
    dot: "bg-rose-500 dark:bg-rose-400",
    underlineColor: "rgba(244, 63, 94, 0.75)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(244, 63, 94, 0.07)",
  },
  economics_accuracy: {
    label: "Economics accuracy",
    dot: "bg-red-600 dark:bg-red-400",
    underlineColor: "rgba(220, 38, 38, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "1.75px",
    offset: "6px",
    backgroundColor: "rgba(220, 38, 38, 0.09)",
  },
  misconception: {
    label: "Economic misconception",
    dot: "bg-red-600 dark:bg-red-400",
    underlineColor: "rgba(220, 38, 38, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "1.75px",
    offset: "6px",
    backgroundColor: "rgba(220, 38, 38, 0.09)",
  },
  analysis: {
    label: "Analysis",
    dot: "bg-ao2",
    underlineColor: "rgba(16, 185, 129, 0.85)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.09)",
  },
  application: {
    label: "Application",
    dot: "bg-ao2",
    underlineColor: "rgba(16, 185, 129, 0.85)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.09)",
  },
  evaluation: {
    label: "Evaluation",
    dot: "bg-ao3",
    underlineColor: "rgba(245, 158, 11, 0.85)",
    underlineStyle: "dashed",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(245, 158, 11, 0.10)",
  },
  reasoning_chain: {
    label: "Chain of reasoning",
    dot: "bg-amber-500",
    underlineColor: "rgba(245, 158, 11, 0.90)",
    underlineStyle: "wavy",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(245, 158, 11, 0.09)",
  },
  terminology: {
    label: "Terminology",
    dot: "bg-ao1",
    underlineColor: "rgba(59, 130, 246, 0.85)",
    underlineStyle: "solid",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(59, 130, 246, 0.09)",
  },
};

const DIAGRAM_TAG = /\[DIAGRAM:[^\]]*\]/g;

export const AO_META: Record<"AO1" | "AO2" | "AO3", UnderlineStyleMeta> = {
  AO1: {
    label: "AO1 Knowledge",
    dot: "bg-ao1",
    underlineColor: "rgba(59, 130, 246, 0.65)",
    underlineStyle: "solid",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(59, 130, 246, 0.09)",
  },
  AO2: {
    label: "AO2 Analysis",
    dot: "bg-ao2",
    underlineColor: "rgba(16, 185, 129, 0.65)",
    underlineStyle: "solid",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.09)",
  },
  AO3: {
    label: "AO3 Evaluation",
    dot: "bg-ao3",
    underlineColor: "rgba(245, 158, 11, 0.70)",
    underlineStyle: "solid",
    underlineThickness: "1.5px",
    offset: "6px",
    backgroundColor: "rgba(245, 158, 11, 0.10)",
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

function findWordOrSubIndex(source: string, target: string, fromIndex = 0): number {
  if (!target) return -1;
  // Whole words or single letters (like pronoun "i") must match word boundaries
  // to avoid falsely underlining occurrences inside other words (e.g. "this", "prices").
  if (/^\w+$/.test(target)) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    regex.lastIndex = fromIndex;
    const match = regex.exec(source);
    if (match) return match.index;
  }
  return source.indexOf(target, fromIndex);
}

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
          const localIndex = findWordOrSubIndex(issue.context, issue.original, searchOriginalFrom);
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
        const at = findWordOrSubIndex(text, issue.original, searchOriginalFrom);
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
    const target = trimmed.toLowerCase();
    const aoRank: Record<string, number> = { AO3: 3, AO2: 2, AO1: 1 };

    // 1. Exact match against server classifications (check original and context)
    const exactMatches = classifications.filter((c) => {
      const cContext = (c.context || "").trim().toLowerCase();
      const cOrig = (c.original || "").trim().toLowerCase();
      return cOrig === target || cContext === target;
    });

    let matched: ActiveAoClassification | undefined;
    if (exactMatches.length > 0) {
      matched = exactMatches.sort((a, b) => {
        const aFull = (a.original || "").trim().toLowerCase() === target ? 1 : 0;
        const bFull = (b.original || "").trim().toLowerCase() === target ? 1 : 0;
        if (aFull !== bFull) return bFull - aFull;
        return (aoRank[b.ao] ?? 0) - (aoRank[a.ao] ?? 0);
      })[0];
    }

    // 2. High overlap match (at least 75% length agreement)
    if (!matched) {
      const overlapMatches = classifications.filter((c) => {
        const cContext = (c.context || "").trim().toLowerCase();
        const cOrig = (c.original || "").trim().toLowerCase();
        if (cContext && cContext.length >= 10 && target.length >= 10) {
          if (cContext.includes(target) && target.length >= cContext.length * 0.75) return true;
          if (target.includes(cContext) && cContext.length >= target.length * 0.75) return true;
        }
        if (cOrig && cOrig.length >= 10 && target.length >= 10) {
          if (cOrig.includes(target) && target.length >= cOrig.length * 0.75) return true;
          if (target.includes(cOrig) && cOrig.length >= target.length * 0.75) return true;
        }
        return false;
      });
      if (overlapMatches.length > 0) {
        matched = overlapMatches.sort((a, b) => (aoRank[b.ao] ?? 0) - (aoRank[a.ao] ?? 0))[0];
      }
    }

    const activeClassification: ActiveAoClassification = (() => {
      // Unified resolver result (rules + AI adjudication) is final — paint as-is.
      if (matched?.resolved) return matched;
      const auto = classifySentenceDeterministically(trimmed);
      // Unmistakable explicit definitions must always remain AO1 Knowledge
      if (auto.ao === "AO1" && auto.explanation.includes("definition")) {
        return {
          id: matched?.id || `auto-${auto.ao}-${sStart}`,
          original: trimmed,
          context: trimmed,
          ao: auto.ao,
          explanation: matched?.explanation || auto.explanation,
        };
      }
      // Evaluative criteria (AO3) detected deterministically (however, on the other hand, depends on, etc.)
      // should never be downgraded to AO2 by older server classifications.
      if (auto.ao === "AO3") {
        return {
          id: matched?.id || `auto-${auto.ao}-${sStart}`,
          original: trimmed,
          context: trimmed,
          ao: "AO3",
          explanation:
            matched?.ao === "AO3" && matched.explanation ? matched.explanation : auto.explanation,
        };
      }
      if (matched) return matched;
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

  // Keep scroll position strictly synchronized on every value change
  useEffect(() => {
    syncScroll();
  }, [value]);

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
                style={{
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                  backgroundColor: meta.backgroundColor || "transparent",
                  textDecorationLine: "underline",
                  textDecorationStyle: meta.underlineStyle,
                  textDecorationColor: meta.underlineColor,
                  textDecorationThickness: meta.underlineThickness,
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
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          margin: 0,
          border: 0,
        }}
        className={cn("p-6 md:p-8 [&::-webkit-scrollbar]:hidden", className)}
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
              issue.category === "misconception" || issue.category === "economics_accuracy"
                ? "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300"
                : issue.category === "grammar" || issue.category === "clarity"
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
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
          <span className="line-through">{cleanStars(issue.original)}</span>
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
        <p className="leading-relaxed text-muted-foreground">{cleanStars(issue.explanation)}</p>
      </div>

      {issue.evidence ? (
        <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground italic">
          "{cleanStars(issue.evidence)}"
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
