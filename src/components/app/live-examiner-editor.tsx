import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ActiveAoClassification,
  ActiveIssue,
  IssueCategory,
} from "@/hooks/use-live-examiner-check";
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
};

const CATEGORY_META: Record<IssueCategory, { label: string; mark: string; dot: string }> = {
  grammar: {
    label: "Grammar",
    mark: "decoration-rose-500/70 decoration-wavy underline underline-offset-2",
    dot: "bg-rose-500",
  },
  clarity: {
    label: "Clarity",
    mark: "decoration-muted-foreground/70 decoration-dotted underline underline-offset-2",
    dot: "bg-muted-foreground",
  },
  economics_accuracy: {
    label: "Economics accuracy",
    mark: "bg-ao1/15 decoration-ao1 underline decoration-2 underline-offset-2",
    dot: "bg-ao1",
  },
  analysis: {
    label: "Analysis",
    mark: "bg-ao2/15 decoration-ao2 underline decoration-2 underline-offset-2",
    dot: "bg-ao2",
  },
  application: {
    label: "Application",
    mark: "bg-ao2/15 decoration-ao2 underline decoration-2 underline-offset-2",
    dot: "bg-ao2",
  },
  evaluation: {
    label: "Evaluation",
    mark: "bg-ao3/15 decoration-ao3 underline decoration-2 underline-offset-2",
    dot: "bg-ao3",
  },
  reasoning_chain: {
    label: "Chain of reasoning",
    mark: "bg-ao2/15 decoration-ao2 underline decoration-2 underline-offset-2",
    dot: "bg-ao2",
  },
  terminology: {
    label: "Terminology",
    mark: "bg-ao1/15 decoration-ao1 underline decoration-2 underline-offset-2",
    dot: "bg-ao1",
  },
};

const DIAGRAM_TAG = /\[DIAGRAM:[^\]]*\]/g;

const AO_META = {
  AO1: {
    label: "AO1 Knowledge",
    mark: "bg-ao1/10 shadow-[inset_0_-3px_0_var(--ao1)]",
    dot: "bg-ao1",
  },
  AO2: {
    label: "AO2 Analysis",
    mark: "bg-ao2/10 shadow-[inset_0_-3px_0_var(--ao2)]",
    dot: "bg-ao2",
  },
  AO3: {
    label: "AO3 Evaluation",
    mark: "bg-ao3/10 shadow-[inset_0_-3px_0_var(--ao3)]",
    dot: "bg-ao3",
  },
} as const;

type Range =
  | { start: number; end: number; id: string; kind: "issue"; issue: ActiveIssue }
  | {
      start: number;
      end: number;
      id: string;
      kind: "classification";
      classification: ActiveAoClassification;
    };

/** Locate every issue's `original` text inside the full essay, skipping
 *  anything that overlaps a [DIAGRAM: ...] tag or another issue's range —
 *  highlights must never cover diagram/table content or double up. */
function computeRanges(
  text: string,
  issues: ActiveIssue[],
  classifications: ActiveAoClassification[],
): Range[] {
  const protectedSpans: Array<[number, number]> = [];
  for (const match of text.matchAll(DIAGRAM_TAG)) {
    protectedSpans.push([match.index!, match.index! + match[0].length]);
  }

  const overlapsProtected = (start: number, end: number) =>
    protectedSpans.some(([pStart, pEnd]) => start < pEnd && end > pStart);

  const ranges: Range[] = [];

  function locate(context: string, original: string): { start: number; end: number } | null {
    let sentenceStart = -1;
    let searchFrom = 0;
    while (true) {
      const at = text.indexOf(context, searchFrom);
      if (at === -1) break;
      const localIndex = context.indexOf(original);
      if (localIndex === -1) return null;
      const candidateStart = at + localIndex;
      const candidateEnd = candidateStart + original.length;
      if (
        !overlapsProtected(candidateStart, candidateEnd) &&
        !ranges.some((range) => candidateStart < range.end && candidateEnd > range.start)
      ) {
        sentenceStart = at;
        break;
      }
      searchFrom = at + 1;
    }
    if (sentenceStart === -1) return null;
    const start = sentenceStart + context.indexOf(original);
    return { start, end: start + original.length };
  }

  // Corrections take priority when they overlap an AO classification so
  // the accept/dismiss interaction is never hidden by the colour layer.
  for (const issue of issues) {
    const located = locate(issue.context, issue.original);
    if (located) ranges.push({ ...located, id: issue.id, kind: "issue", issue });
  }
  for (const classification of classifications) {
    const located = locate(classification.context, classification.original);
    if (located) {
      ranges.push({
        ...located,
        id: classification.id,
        kind: "classification",
        classification,
      });
    }
  }

  const sorted = ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    const gap = previous ? text.slice(previous.end, range.start) : "";
    if (
      previous?.kind === "classification" &&
      range.kind === "classification" &&
      previous.classification.ao === range.classification.ao &&
      gap.length <= 3 &&
      gap.trim() === ""
    ) {
      previous.end = range.end;
      previous.classification = {
        ...previous.classification,
        original: text.slice(previous.start, range.end),
      };
      continue;
    }
    merged.push(range);
  }

  return merged;
}

export function LiveExaminerEditor({
  value,
  onChange,
  issues,
  classifications,
  onAccept,
  onDismiss,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  issues: ActiveIssue[];
  classifications: ActiveAoClassification[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  placeholder?: string;
  className?: string;
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
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }

  function handleClick(event: React.MouseEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;
    const at = textarea.selectionStart;
    const hit = ranges.find((r) => at >= r.start && at <= r.end);
    if (!hit) {
      setActiveAnnotationId(null);
      setCardPos(null);
      return;
    }
    const containerBox = container.getBoundingClientRect();
    setActiveAnnotationId(hit.id);
    setCardPos({
      top: event.clientY - containerBox.top + 14,
      left: Math.min(event.clientX - containerBox.left, containerBox.width - 300),
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={highlightRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words text-transparent",
          className,
        )}
      >
        {segments.map((segment, index) =>
          segment.range ? (
            <mark
              key={index}
              className={cn(
                "box-decoration-clone rounded-[2px] bg-transparent",
                segment.range.kind === "issue"
                  ? CATEGORY_META[segment.range.issue.category].mark
                  : AO_META[segment.range.classification.ao].mark,
              )}
            >
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
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
        className={cn(
          "relative w-full resize-none whitespace-pre-wrap break-words bg-transparent text-foreground caret-foreground outline-none",
          className,
        )}
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
  const meta = AO_META[classification.ao];
  const ref = useRef<HTMLDivElement>(null);

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
      className="absolute z-20 w-72 space-y-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
        <Badge variant="outline" className="text-[10px]">
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
  const meta = CATEGORY_META[issue.category];
  const ref = useRef<HTMLDivElement>(null);

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
      className="absolute z-20 w-72 space-y-2.5 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
        <Badge variant="outline" className="text-[10px]">
          {meta.label}
          {CATEGORY_AO[issue.category] ? ` · ${CATEGORY_AO[issue.category]}` : ""}
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">
          {issue.severity}
        </Badge>
      </div>

      <div className="space-y-1 text-xs">
        <p className="text-destructive line-through">{issue.original}</p>
        <p className="font-medium">{issue.suggestion}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{issue.explanation}</p>

      {issue.evidence ? (
        <p className="rounded-md border border-border/70 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground italic">
          "{issue.evidence}"
        </p>
      ) : null}

      <div className="flex gap-1.5 pt-0.5">
        <Button type="button" size="sm" className="h-7 flex-1 text-xs" onClick={onAccept}>
          <Check className="size-3.5" /> Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 flex-1 text-xs"
          onClick={onDismiss}
        >
          <X className="size-3.5" /> Dismiss
        </Button>
      </div>
    </div>
  );
}
