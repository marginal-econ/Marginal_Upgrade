import { Check, Loader2, RefreshCw, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActiveIssue,
  HistoryEntry,
  IssueCategory,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { AO_DEFINITIONS } from "@/lib/examiner/config";
import type { Grading } from "@/lib/examiner/types";
import { cn } from "@/lib/utils";

function cleanStars(str: string): string {
  if (!str) return "";
  return str.replace(/\*\*/g, "").replace(/\*/g, "").replace(/[`_]/g, "").trim();
}

// Which AO this category maps to, shown next to the label so it's visibly
// the same AO structure the essay is actually graded against — not just an
// internal detail. "null" categories (grammar/clarity) are writing
// mechanics, not an AO.
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

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  grammar: "Grammar",
  clarity: "Clarity",
  economics_accuracy: "Economics accuracy",
  analysis: "Analysis",
  application: "Application",
  evaluation: "Evaluation",
  reasoning_chain: "Chain of reasoning",
  terminology: "Terminology",
};

const SEVERITY_VARIANT: Record<ActiveIssue["severity"], "destructive" | "default" | "outline"> = {
  high: "destructive",
  medium: "default",
  low: "outline",
};

const AO_STYLE = {
  AO1: { dot: "bg-ao1", badge: "border-ao1/40 bg-ao1/10" },
  AO2: { dot: "bg-ao2", badge: "border-ao2/40 bg-ao2/10" },
  AO3: { dot: "bg-ao3", badge: "border-ao3/40 bg-ao3/10" },
} as const;

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function getLiveExaminerIssueVisual(category: string) {
  if (category === "economics_accuracy" || category === "misconception") {
    return {
      cardBorder: "border-l-4 border-l-red-600 bg-red-500/5",
      badge: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300",
      dot: "bg-red-600",
    };
  }
  if (category === "terminology") {
    return {
      cardBorder: "border-l-4 border-l-ao1 bg-ao1/5",
      badge: "border-ao1/40 bg-ao1/10 text-ao1",
      dot: "bg-ao1",
    };
  }
  if (category === "analysis" || category === "application" || category === "reasoning_chain") {
    return {
      cardBorder: "border-l-4 border-l-ao2 bg-ao2/5",
      badge: "border-ao2/40 bg-ao2/10 text-ao2",
      dot: "bg-ao2",
    };
  }
  if (category === "evaluation") {
    return {
      cardBorder: "border-l-4 border-l-ao3 bg-ao3/5",
      badge: "border-ao3/40 bg-ao3/10 text-ao3",
      dot: "bg-ao3",
    };
  }
  return {
    cardBorder: "border-l-4 border-l-rose-500 bg-rose-500/5",
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  };
}

export function LiveExaminerPanel({
  issues,
  history,
  checking,
  pending,
  error,
  autosave,
  predictedMark,
  finalGrading,
  lastUpdatedAt,
  maxMark,
  gradedHelp,
  onAccept,
  onDismiss,
  onRescan,
  onClearAll,
}: {
  issues: ActiveIssue[];
  history: HistoryEntry[];
  checking: boolean;
  pending: boolean;
  error: string | null;
  autosave: AutosaveState;
  predictedMark: PredictedMark | null;
  finalGrading?: Grading | null;
  lastUpdatedAt: number | null;
  maxMark: number;
  gradedHelp?: ReactNode;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onRescan: () => void;
  onClearAll: () => void;
}) {
  const resolvedHistory = history
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));

  return (
    <div className="flex h-full flex-col gap-3">
      <PredictedMarkCard
        predictedMark={predictedMark}
        maxMark={maxMark}
        finalGrading={finalGrading}
      />
      {gradedHelp}

      <div className="grid grid-cols-3 gap-1.5" aria-label="Assessment objective colour key">
        {[
          ["AO1", "Knowledge"],
          ["AO2", "Analysis"],
          ["AO3", "Evaluation"],
        ].map(([code, label]) => {
          const style = AO_STYLE[code as keyof typeof AO_STYLE];
          return (
            <div
              key={code}
              className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1.5", style.badge)}
            >
              <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
              <span className="min-w-0 text-[10px] font-semibold">
                {code}{" "}
                <span className="hidden font-normal text-muted-foreground xl:inline">{label}</span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Every suggestion here is independently double-checked and grounded in your syllabus material
        before it's shown — nothing is flagged on a guess.
      </p>

      <div className="flex items-center justify-between gap-2">
        <StatusLine
          checking={checking}
          pending={pending}
          count={issues.length}
          lastUpdatedAt={lastUpdatedAt}
        />
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRescan}
          >
            <RefreshCw className={cn("size-3.5", checking && "animate-spin")} /> Rescan
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={issues.length === 0}
            onClick={onClearAll}
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        </div>
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Tabs defaultValue="active" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            Suggestions {issues.length > 0 ? `(${issues.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            History {resolvedHistory.length > 0 ? `(${resolvedHistory.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-2 min-h-0 flex-1">
          <ScrollArea className="h-full pr-2">
            {issues.length === 0 ? (
              <EmptyState checking={checking} pending={pending} />
            ) : (
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className={cn(
                      "rounded-lg border border-border bg-card p-2.5",
                      CATEGORY_AO[issue.category] === "AO1" && "border-l-4 border-l-ao1",
                      CATEGORY_AO[issue.category] === "AO2" && "border-l-4 border-l-ao2",
                      CATEGORY_AO[issue.category] === "AO3" && "border-l-4 border-l-ao3",
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          CATEGORY_AO[issue.category] === "AO1" && AO_STYLE.AO1.badge,
                          CATEGORY_AO[issue.category] === "AO2" && AO_STYLE.AO2.badge,
                          CATEGORY_AO[issue.category] === "AO3" && AO_STYLE.AO3.badge,
                        )}
                      >
                        {CATEGORY_LABEL[issue.category]}
                        {CATEGORY_AO[issue.category] ? ` · ${CATEGORY_AO[issue.category]}` : ""}
                      </Badge>
                      <Badge
                        variant={SEVERITY_VARIANT[issue.severity]}
                        className="text-[10px] capitalize"
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-destructive line-through">{cleanStars(issue.original)}</p>
                    <p className="text-xs font-medium">{cleanStars(issue.suggestion)}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {cleanStars(issue.explanation)}
                    </p>
                    {issue.evidence ? (
                      <p className="mt-1.5 rounded-md border border-border/70 bg-muted/30 p-1.5 text-[10px] leading-relaxed text-muted-foreground italic">
                        "{cleanStars(issue.evidence)}"
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 flex-1 text-[11px]"
                        onClick={() => onAccept(issue.id)}
                      >
                        <Check className="size-3" /> Accept
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 flex-1 text-[11px]"
                        onClick={() => onDismiss(issue.id)}
                      >
                        <X className="size-3" /> Dismiss
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-2 min-h-0 flex-1">
          <ScrollArea className="h-full pr-2">
            {resolvedHistory.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Accepted and dismissed suggestions will appear here.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {resolvedHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-[11px]"
                  >
                    {entry.status === "accepted" ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <span className="text-muted-foreground">
                        {CATEGORY_LABEL[entry.category]}
                        {CATEGORY_AO[entry.category] ? ` (${CATEGORY_AO[entry.category]})` : ""}
                        :{" "}
                      </span>
                      <span className="line-through">{cleanStars(entry.original)}</span>
                      {entry.status === "accepted" ? (
                        <>
                          {" → "}
                          <span className="font-medium">{cleanStars(entry.suggestion)}</span>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AutosaveIndicator state={autosave} />
    </div>
  );
}

/**
 * The live, rough predicted-mark indicator "on the side" — updates
 * automatically every time a check produces a fresh estimate, no manual
 * refresh needed. A brief highlight flashes on the number itself whenever
 * it changes (up or down) so movement is visible even if you're looking at
 * the editor, not the panel, when it updates.
 */
function PredictedMarkCard({
  predictedMark,
  maxMark,
  finalGrading,
}: {
  predictedMark: PredictedMark | null;
  maxMark: number;
  finalGrading?: Grading | null;
}) {
  const [justChanged, setJustChanged] = useState(false);
  const previousMarkRef = useRef<number | null>(null);

  useEffect(() => {
    if (!predictedMark) return;
    const prev = previousMarkRef.current;
    previousMarkRef.current = predictedMark.total_mark;
    if (prev !== null && prev !== predictedMark.total_mark) {
      setJustChanged(true);
      const timeout = setTimeout(() => setJustChanged(false), 900);
      return () => clearTimeout(timeout);
    }
  }, [predictedMark]);

  if (finalGrading && Number.isFinite(finalGrading.total_mark)) {
    const total_mark = finalGrading.total_mark;
    const band = finalGrading.band;
    const knowledgeAw =
      finalGrading.ao_breakdown?.knowledge?.mark ??
      finalGrading.breakdown?.knowledge?.mark ??
      0;
    const knowledgeMax =
      finalGrading.ao_breakdown?.knowledge?.max_mark ??
      finalGrading.breakdown?.knowledge?.max_mark ??
      0;
    const analysisAw =
      finalGrading.ao_breakdown?.analysis?.mark ??
      finalGrading.breakdown?.analysis?.mark ??
      0;
    const analysisMax =
      finalGrading.ao_breakdown?.analysis?.max_mark ??
      finalGrading.breakdown?.analysis?.max_mark ??
      0;
    const evalAw =
      finalGrading.ao_breakdown?.evaluation?.mark ??
      finalGrading.breakdown?.evaluation?.mark ??
      0;
    const evalMax =
      finalGrading.ao_breakdown?.evaluation?.max_mark ??
      finalGrading.breakdown?.evaluation?.max_mark ??
      0;

    return (
      <div className="overflow-hidden rounded-xl border-2 border-emerald-600 bg-card shadow-[3px_3px_0_0_rgba(16,185,129,0.3)]">
        <div className="flex items-center justify-between bg-emerald-600 px-3 py-2 text-white">
          <span className="flex items-center gap-2 text-xs font-semibold">
            <span className="size-2 rounded-full bg-white animate-pulse" /> Official Cambridge Grade
          </span>
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider">{band || "Marked"}</span>
        </div>
        <div className="p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Examiner Score</span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 font-semibold">
              Verified
            </Badge>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {total_mark}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/ {maxMark}</span>
          </div>
          {finalGrading.summary ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
              {cleanStars(finalGrading.summary)}
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            <AoMini
              label={AO_DEFINITIONS.ao1.code}
              name="Knowledge"
              ao={{ awarded: knowledgeAw, out_of: knowledgeMax }}
              tone="ao1"
            />
            <AoMini
              label={AO_DEFINITIONS.ao2.code}
              name="Analysis"
              ao={{ awarded: analysisAw, out_of: analysisMax }}
              tone="ao2"
            />
            <AoMini
              label={AO_DEFINITIONS.ao3.code}
              name="Evaluation"
              ao={{ awarded: evalAw, out_of: evalMax }}
              tone="ao3"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!predictedMark) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-center">
        <p className="text-[11px] text-muted-foreground">
          Your predicted mark will appear here once you've written a bit more.
        </p>
      </div>
    );
  }

  const { total_mark, ao_breakdown, headline, confidence } = predictedMark;
  const nextMove = getNextMove(ao_breakdown);
  return (
    <div className="overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--foreground)]">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <span className="size-2 rounded-full bg-white/90" /> Live Examiner
        </span>
        <span className="font-mono text-[10px] opacity-75">RUNNING MARK</span>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Predicted mark</span>
          {confidence < 0.5 ? (
            <span className="text-[10px] text-muted-foreground">early estimate</span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums transition-colors duration-500",
              justChanged && "text-primary",
            )}
          >
            {total_mark}
          </span>
          <span className="text-sm text-muted-foreground">/ {maxMark}</span>
        </div>
        {headline ? <p className="mt-1.5 text-[11px] text-muted-foreground">{headline}</p> : null}
        <div className="mt-3 space-y-2">
          <AoMini
            label={AO_DEFINITIONS.ao1.code}
            name="Knowledge"
            ao={ao_breakdown.knowledge}
            tone="ao1"
          />
          <AoMini
            label={AO_DEFINITIONS.ao2.code}
            name="Analysis"
            ao={ao_breakdown.analysis}
            tone="ao2"
          />
          <AoMini
            label={AO_DEFINITIONS.ao3.code}
            name="Evaluation"
            ao={ao_breakdown.evaluation}
            tone="ao3"
          />
        </div>
        <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-2">
          <p className="text-[9px] font-semibold tracking-wide text-primary uppercase">
            Best next move
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-foreground">{nextMove}</p>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          A rough, live running estimate — not your final grade. Use "Grade now" for the real, fully
          checked mark.
        </p>
      </div>
    </div>
  );
}

function getNextMove(breakdown: PredictedMark["ao_breakdown"]): string {
  if (breakdown.knowledge.awarded === 0) {
    return "State one accurate definition or core economic concept in the question.";
  }
  if (breakdown.analysis.awarded < Math.ceil(breakdown.analysis.out_of / 2)) {
    return "Develop a because → effect → consequence chain and apply it to the question.";
  }
  if (breakdown.evaluation.awarded === 0) {
    return "Add a justified limitation, condition, or counter-argument—not just a second opinion.";
  }
  if (breakdown.evaluation.awarded < breakdown.evaluation.out_of) {
    return "Weigh your arguments and finish with a conditional overall judgement.";
  }
  return "Strengthen the weakest chain with a precise example, data point, or named context.";
}

function AoMini({
  label,
  name,
  ao,
  tone,
}: {
  label: string;
  name: string;
  ao: { awarded: number; out_of: number };
  tone: "ao1" | "ao2" | "ao3";
}) {
  const pct = ao.out_of > 0 ? Math.min(100, Math.round((ao.awarded / ao.out_of) * 100)) : 0;
  const toneClass = { ao1: "bg-ao1", ao2: "bg-ao2", ao3: "bg-ao3" }[tone];
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px]">
      <span className="flex w-16 items-center gap-1.5 font-semibold">
        <span className={cn("size-2 rounded-full", toneClass)} />
        {label}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", toneClass)}
          style={{ width: `${pct}%` }}
          aria-label={`${label} ${name}: ${ao.awarded} out of ${ao.out_of}`}
        />
      </div>
      <span className="w-9 text-right font-mono text-muted-foreground">
        {ao.awarded}/{ao.out_of}
      </span>
    </div>
  );
}

function StatusLine({
  checking,
  pending,
  count,
  lastUpdatedAt,
}: {
  checking: boolean;
  pending: boolean;
  count: number;
  lastUpdatedAt: number | null;
}) {
  if (checking) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" /> Checking and verifying…
      </p>
    );
  }
  if (pending) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0" /> Will check shortly…
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0" />
      {count > 0 ? `${count} suggestion${count === 1 ? "" : "s"}` : "No issues found"}
      {lastUpdatedAt ? <span className="text-[10px] opacity-70">· Live</span> : null}
    </p>
  );
}

function EmptyState({ checking, pending }: { checking: boolean; pending: boolean }) {
  if (checking || pending) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Reading your latest sentences…</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <Sparkles className="size-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Keep writing — suggestions will appear here as you go, grounded in the syllabus.
      </p>
    </div>
  );
}

function AutosaveIndicator({ state }: { state: AutosaveState }) {
  if (state === "idle") return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3 text-emerald-600" /> Saved
        </>
      ) : (
        <>
          <TriangleAlert className="size-3 text-amber-600" /> Couldn't autosave — keep this tab open
        </>
      )}
    </p>
  );
}
