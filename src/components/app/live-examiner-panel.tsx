import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActiveIssue,
  ExaminerChallenge,
  HistoryEntry,
  IssueCategory,
  LiveExaminerSessionUsage,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { AO_DEFINITIONS } from "@/lib/examiner/config";
import {
  LIVE_EXAMINER_PALETTE,
  mapCategoryToSemanticElement,
  AO_COLOUR_SYSTEM,
} from "@/lib/live-examiner/color-coding";
import { cn } from "@/lib/utils";

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
  misconception: AO_DEFINITIONS.ao1.code,
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
  misconception: "Economic Misconception",
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

export function LiveExaminerPanel({
  issues,
  history,
  checking,
  pending,
  error,
  autosave,
  predictedMark,
  lastUpdatedAt,
  maxMark,
  challenges = [],
  fetchingChallenges = false,
  challengeOverview = null,
  onRequestChallenges,
  onDismissChallenge,
  onAddressChallenge,
  gradedHelp,
  onAccept,
  onDismiss,
  onRescan,
  onClearAll,
  durationMinutes,
  remainingSeconds,
  aiCoachingExpired = false,
  formattedTimeRemaining,
  sessionUsage,
}: {
  issues: ActiveIssue[];
  history: HistoryEntry[];
  checking: boolean;
  pending: boolean;
  error: string | null;
  autosave: AutosaveState;
  predictedMark: PredictedMark | null;
  lastUpdatedAt: number | null;
  maxMark: number;
  challenges?: ExaminerChallenge[];
  fetchingChallenges?: boolean;
  challengeOverview?: string | null;
  onRequestChallenges?: () => void;
  onDismissChallenge?: (id: string) => void;
  onAddressChallenge?: (id: string) => void;
  gradedHelp?: ReactNode;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onRescan: () => void;
  onClearAll: () => void;
  durationMinutes?: number;
  remainingSeconds?: number;
  aiCoachingExpired?: boolean;
  formattedTimeRemaining?: string;
  sessionUsage?: LiveExaminerSessionUsage;
}) {
  const [showColorGuide, setShowColorGuide] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "economics" | "mechanics" | "misconceptions"
  >("all");

  const toggleHint = (id: string) => {
    setExpandedHints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resolvedHistory = history
    .filter((entry) => entry.status !== "active")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));

  const filteredIssues = issues.filter((issue) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "misconceptions") return issue.category === "misconception";
    if (categoryFilter === "mechanics")
      return issue.category === "grammar" || issue.category === "clarity";
    if (categoryFilter === "economics") {
      return (
        issue.category !== "grammar" &&
        issue.category !== "clarity" &&
        issue.category !== "misconception"
      );
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <PredictedMarkCard
        predictedMark={predictedMark}
        maxMark={maxMark}
        aiCoachingExpired={aiCoachingExpired}
      />
      {gradedHelp}

      {/* AI Coaching Limit Reached Notice (displayed only after duration expires, no public timer beforehand) */}
      {durationMinutes && aiCoachingExpired ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
          <div className="flex items-center justify-between gap-1.5 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              AI Coaching Time Limit Reached ({durationMinutes}m)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300 font-medium"
            >
              Limit Reached
            </Badge>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-amber-200/90">
            Live Cambridge AO evaluation and mark updates have paused for this question.
            <strong className="text-foreground dark:text-amber-100 font-semibold">
              {" "}Instant in-browser grammar, mechanics, spelling, and economic terminology checks remain 100% active and unlimited.
            </strong>
          </p>
          <p className="text-[10px] text-muted-foreground dark:text-amber-200/80">
            Click <strong>"Grade now"</strong> above whenever you're ready for your complete Cambridge mark and examiner report.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border/80 bg-muted/20 p-2 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Assessment & Diagnostic Key
          </span>
          <button
            type="button"
            onClick={() => setShowColorGuide((prev) => !prev)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            {showColorGuide ? "Hide guide" : "Semantic guide"}
            {showColorGuide ? (
              <ChevronUp className="size-2.5" />
            ) : (
              <ChevronDown className="size-2.5" />
            )}
          </button>
        </div>

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
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1.5",
                  style.badge,
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
                <span className="min-w-0 text-[10px] font-semibold">
                  {code}{" "}
                  <span className="hidden font-normal text-muted-foreground xl:inline">
                    {label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {showColorGuide ? (
          <div className="mt-2 grid grid-cols-2 gap-1 pt-2 border-t border-border/60 text-[10px]">
            <div className="flex items-center gap-1.5 p-1 rounded bg-plum/10 text-plum dark:text-primary">
              <span className="size-1.5 rounded-full bg-plum dark:bg-primary" /> Examiner Questions
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Positive AO Credit
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300">
              <span className="size-1.5 rounded-full bg-rose-500" /> Mechanics / Syntax
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-red-600/15 text-red-700 dark:text-red-300 font-semibold">
              <span className="size-1.5 rounded-full bg-red-600" /> Economic Misconception
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <span className="size-1.5 rounded-full bg-blue-500" /> Theory / Terminology
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-500" /> Socratic Hints
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusLine
          checking={checking}
          pending={pending}
          count={issues.length}
          lastUpdatedAt={lastUpdatedAt}
          aiCoachingExpired={aiCoachingExpired}
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
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="active" className="text-xs">
            Suggestions {issues.length > 0 ? `(${issues.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs">
            Challenges {challenges.length > 0 ? `(${challenges.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            History {resolvedHistory.length > 0 ? `(${resolvedHistory.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-2 min-h-0 flex-1 flex flex-col gap-2">
          {issues.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 p-1 text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  categoryFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                All ({issues.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("economics")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  categoryFilter === "economics"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Economics & AO
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("mechanics")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  categoryFilter === "mechanics"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Mechanics
              </button>
              {issues.some((i) => i.category === "misconception") ? (
                <button
                  type="button"
                  onClick={() => setCategoryFilter("misconceptions")}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors text-red-600 dark:text-red-400",
                    categoryFilter === "misconceptions"
                      ? "bg-red-500/15 font-semibold shadow-sm"
                      : "text-red-600/80",
                  )}
                >
                  Misconception
                </button>
              ) : null}
            </div>
          ) : null}

          <ScrollArea className="h-full pr-2">
            {filteredIssues.length === 0 ? (
              issues.length === 0 ? (
                <EmptyState checking={checking} pending={pending} />
              ) : (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No suggestions in this category. Switch to "All" to view all feedback.
                </p>
              )
            ) : (
              <ul className="space-y-2">
                {filteredIssues.map((issue) => (
                  <li
                    key={issue.id}
                    className={cn(
                      "rounded-lg border border-border bg-card p-2.5",
                      issue.category === "misconception"
                        ? "border-l-4 border-l-red-600 bg-red-500/5 dark:bg-red-950/20"
                        : CATEGORY_AO[issue.category] === "AO1"
                          ? "border-l-4 border-l-ao1"
                          : CATEGORY_AO[issue.category] === "AO2"
                            ? "border-l-4 border-l-ao2"
                            : CATEGORY_AO[issue.category] === "AO3"
                              ? "border-l-4 border-l-ao3"
                              : "",
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          issue.category === "misconception"
                            ? "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300 font-semibold"
                            : CATEGORY_AO[issue.category] === "AO1"
                              ? AO_STYLE.AO1.badge
                              : CATEGORY_AO[issue.category] === "AO2"
                                ? AO_STYLE.AO2.badge
                                : CATEGORY_AO[issue.category] === "AO3"
                                  ? AO_STYLE.AO3.badge
                                  : "",
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
                    <p className="text-xs text-destructive line-through">{issue.original}</p>
                    <p className="text-xs font-medium">{issue.suggestion}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {issue.explanation}
                    </p>
                    {issue.evidence ? (
                      <p className="mt-1.5 rounded-md border border-border/70 bg-muted/30 p-1.5 text-[10px] leading-relaxed text-muted-foreground italic">
                        "{issue.evidence}"
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

        <TabsContent value="challenges" className="mt-2 min-h-0 flex-1">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-3">
              <div className="rounded-lg border border-plum/30 bg-plum/5 dark:bg-plum/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-plum dark:text-primary shrink-0" />
                    <span className="text-xs font-semibold text-plum dark:text-primary">
                      Adaptive Socratic Interrogation
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-plum/40 hover:bg-plum/10 text-plum dark:text-primary"
                    disabled={fetchingChallenges || aiCoachingExpired}
                    onClick={onRequestChallenges}
                    title={
                      aiCoachingExpired
                        ? "AI coaching limit reached for this session. Use 'Grade now' for full feedback."
                        : undefined
                    }
                  >
                    <Sparkles
                      className={cn(
                        "size-3.5 mr-1 text-plum dark:text-primary",
                        fetchingChallenges && "animate-spin",
                      )}
                    />
                    {fetchingChallenges
                      ? "Probing draft…"
                      : aiCoachingExpired
                        ? "Session Capped"
                        : "Probe Draft"}
                  </Button>
                </div>
                {aiCoachingExpired ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-500/10 rounded p-2 border border-amber-500/20">
                    Socratic AI interrogations are paused as this session's AI coaching limit has concluded. You can still write freely with instant grammar & terminology checks, or click <strong>"Grade now"</strong> anytime.
                  </p>
                ) : challengeOverview ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-foreground/90 bg-card/60 rounded p-2 border border-plum/20">
                    {challengeOverview}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    Ask the Examiner to challenge your essay! Socratic follow-up probes identify
                    missing economic chains, evaluate counter-arguments, and test syllabus depth.
                  </p>
                )}
              </div>

              {fetchingChallenges && challenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground space-y-2">
                  <Loader2 className="size-5 animate-spin text-plum dark:text-primary" />
                  <p className="font-medium text-foreground">
                    Examiner is evaluating your draft...
                  </p>
                  <p className="text-[11px]">
                    Identifying gaps in economic logic, terminology, and evaluation depth.
                  </p>
                </div>
              ) : challenges.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground space-y-1.5">
                  <Lightbulb className="mx-auto size-5 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">No active examiner challenges</p>
                  <p className="text-[11px]">
                    Click "Probe Draft" to have the Live Examiner test your essay with Socratic
                    follow-up questions.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {challenges.map((challenge) => {
                    const aoStyle =
                      AO_STYLE[challenge.targetAo as keyof typeof AO_STYLE] ?? AO_STYLE.AO2;
                    const isHintExpanded = Boolean(expandedHints[challenge.id]);
                    return (
                      <li
                        key={challenge.id}
                        className={cn(
                          "rounded-lg border border-border bg-card p-3 space-y-2",
                          challenge.targetAo === "AO1" && "border-l-4 border-l-ao1",
                          challenge.targetAo === "AO2" && "border-l-4 border-l-ao2",
                          challenge.targetAo === "AO3" && "border-l-4 border-l-ao3",
                        )}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] uppercase font-bold", aoStyle.badge)}
                            >
                              {challenge.targetAo} Probe
                            </Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {challenge.type}
                            </Badge>
                          </div>
                          {onDismissChallenge ? (
                            <button
                              type="button"
                              onClick={() => onDismissChallenge(challenge.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Dismiss challenge"
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>

                        {challenge.targetSentence ? (
                          <div className="rounded bg-muted/40 p-2 text-[11px] italic text-muted-foreground border border-border/40">
                            “{challenge.targetSentence}”
                          </div>
                        ) : null}

                        <div className="rounded-md border border-plum/20 bg-plum/5 dark:bg-plum/10 p-2.5">
                          <p className="text-xs font-semibold text-plum dark:text-primary flex items-start gap-1.5">
                            <span className="size-1.5 rounded-full bg-plum dark:bg-primary mt-1.5 shrink-0" />
                            <span>{challenge.examinerPrompt}</span>
                          </p>
                        </div>

                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            Examiner Rationale:{" "}
                          </span>
                          {challenge.explanation}
                        </p>

                        {challenge.hint ? (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleHint(challenge.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              <Lightbulb className="size-3" />
                              {isHintExpanded
                                ? "Hide Socratic Hint"
                                : "Need a hint to answer this?"}
                            </button>
                            {isHintExpanded ? (
                              <div className="mt-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 p-2 text-[11px] text-cyan-900 dark:text-cyan-200">
                                {challenge.hint}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="pt-1 flex items-center justify-end">
                          {onAddressChallenge ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] gap-1 hover:border-emerald-500 hover:text-emerald-600"
                              onClick={() => onAddressChallenge(challenge.id)}
                            >
                              <Check className="size-3 text-emerald-600" /> Addressed in Draft
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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
                      <span className="line-through">{entry.original}</span>
                      {entry.status === "accepted" ? (
                        <>
                          {" → "}
                          <span className="font-medium">{entry.suggestion}</span>
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
  aiCoachingExpired = false,
}: {
  predictedMark: PredictedMark | null;
  maxMark: number;
  aiCoachingExpired?: boolean;
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

  if (!predictedMark) {
    if (aiCoachingExpired) {
      return (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3.5 text-center">
          <div className="flex justify-center mb-1">
            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-foreground">AI Coaching Window Complete</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Running mark estimation has concluded for this session. Instant in-browser grammar, spelling, mechanics, and economic terminology checks remain 100% active. Use <strong>"Grade now"</strong> for your complete Cambridge mark.
          </p>
        </div>
      );
    }
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
    <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-primary/[0.04] to-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5 bg-muted/30">
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" /> Live Examiner
        </span>
        {aiCoachingExpired ? (
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
          >
            FROZEN AT TIME LIMIT
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-primary/30 bg-primary/10 text-primary font-medium"
          >
            RUNNING MARK
          </Badge>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {aiCoachingExpired ? "Final session running mark" : "Running assessment mark"}
          </span>
          {confidence < 0.5 && !aiCoachingExpired ? (
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              early estimate
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500",
              justChanged ? "text-primary scale-105" : "text-foreground",
            )}
          >
            {total_mark}
          </span>
          <span className="text-sm font-medium text-muted-foreground">/ {maxMark} marks</span>
        </div>
        {headline ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{headline}</p>
        ) : null}
        <div className="mt-3.5 space-y-2.5">
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
        <div className="mt-3.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
          <p className="text-[9px] font-semibold tracking-wider text-primary uppercase">
            Examiner next move
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-foreground/90 font-medium">
            {nextMove}
          </p>
        </div>
        {aiCoachingExpired ? (
          <p className="mt-2 text-[10px] leading-snug text-amber-700 dark:text-amber-300 font-medium">
            AI coaching window complete — running mark frozen. Instant mechanics & terminology checks remain active. Use "Grade now" for full audit.
          </p>
        ) : (
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Live running calibration — use "Grade now" for the complete two-pass examiner audit.
          </p>
        )}
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
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-700", toneClass)}
          style={{ width: `${pct}%` }}
          aria-label={`${label} ${name}: ${ao.awarded} out of ${ao.out_of}`}
        />
      </div>
      <span className="w-10 text-right font-mono font-medium text-foreground">
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
  aiCoachingExpired,
}: {
  checking: boolean;
  pending: boolean;
  count: number;
  lastUpdatedAt: number | null;
  aiCoachingExpired?: boolean;
}) {
  if (checking) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        {aiCoachingExpired ? "Checking mechanics & terminology…" : "Checking and verifying…"}
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
      {aiCoachingExpired ? (
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">· Mechanics mode</span>
      ) : lastUpdatedAt ? (
        <span className="text-[10px] opacity-70">· Live</span>
      ) : null}
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
