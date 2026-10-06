import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Layers,
  ListChecks,
  Loader2,
  Minus,
  PenLine,
  Printer,
  RefreshCw,
  Scale,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getReviewPanel,
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type ReviewTool,
} from "@/lib/review.functions";
import { MCQ_DOMAIN_LABEL } from "@/lib/mcq-domain";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review panel — Marginal Economics" },
      {
        name: "description",
        content:
          "A single AI review across your recent essays and MCQ papers — Cambridge grade projection, 5 mastery pillars, micro vs macro domain splits, and a prioritised plan for what to do next.",
      },
    ],
  }),
  component: ReviewPanelPage,
});

const TOOL_LABEL: Record<ReviewTool, { label: string; to: string }> = {
  grade: { label: "Essay marking", to: "/grade" },
  practice: { label: "AO skills coach", to: "/practice" },
  "response-structure": { label: "Response structure", to: "/response-structure" },
  "essay-generator": { label: "Perfect essay generator", to: "/essay-generator" },
  diagrams: { label: "Diagram library", to: "/diagrams" },
  mcq: { label: "MCQ papers", to: "/mcq-live" },
  "question-bank": { label: "Question bank", to: "/question-bank" },
};

function ReviewPanelPage() {
  const fetchReview = useServerFn(getReviewPanel);
  const [hasRequested, setHasRequested] = useState(false);

  const query = useQuery({
    queryKey: ["review-panel"],
    queryFn: () => fetchReview(),
    enabled: hasRequested,
    staleTime: 0,
  });

  return (
    <>
      <PageHeader
        title="Review panel"
        description="One holistic AI pass across your recent essays and MCQ papers together — Cambridge grade boundaries, syllabus pillars, and actionable mark gains."
        action={
          hasRequested && query.data && query.data.eligible ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="hidden sm:inline-flex print:hidden"
              >
                <Printer className="size-4" />
                Print report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                className="print:hidden"
              >
                <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
                Regenerate
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6 md:px-8">
        {!hasRequested ? (
          <StartCard onStart={() => setHasRequested(true)} />
        ) : query.isLoading || query.isFetching ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
        ) : query.data && !query.data.eligible ? (
          <NotEligibleCard
            essayCount={query.data.essayCount}
            mcqPaperCount={query.data.mcqPaperCount}
            essaysNeeded={query.data.essaysNeeded}
            mcqPapersNeeded={query.data.mcqPapersNeeded}
          />
        ) : query.data && query.data.eligible ? (
          <ReviewResults data={query.data} />
        ) : null}
      </div>
    </>
  );
}

function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="panel flex flex-col items-center gap-4 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ClipboardCheck className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold">Your holistic aggregate review</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Unlocks once you have {MIN_ESSAYS_FOR_REVIEW} graded essays or {MIN_MCQ_PAPERS_FOR_REVIEW}{" "}
          completed past MCQ paper. The examiner reads across all of them at once — Cambridge grade
          projection, 5 core mastery pillars, Micro vs Macro domain balance, and a step-by-step mark
          gain roadmap.
        </p>
      </div>
      <Button onClick={onStart}>
        <Sparkles className="size-4" /> Check my review
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="panel flex flex-col items-center gap-3 p-12 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Synthesizing across your recent essays, MCQ papers, and Cambridge 9708 grade boundaries…
      </p>
      <div className="mt-2 w-full max-w-sm space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function NotEligibleCard({
  essayCount,
  mcqPaperCount,
  essaysNeeded,
  mcqPapersNeeded,
}: {
  essayCount: number;
  mcqPaperCount: number;
  essaysNeeded: number;
  mcqPapersNeeded: number;
}) {
  return (
    <div className="panel space-y-6 p-8">
      <div className="text-center">
        <h2 className="text-base font-semibold">Not quite enough diagnostic data yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marginal requires a real sample to spot genuine Cambridge patterns and give you reliable
          grade boundaries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressToward
          icon={PenLine}
          label="Graded essays"
          current={essayCount}
          target={MIN_ESSAYS_FOR_REVIEW}
          remaining={essaysNeeded}
          cta={{ label: "Mark an essay", to: "/grade" }}
        />
        <ProgressToward
          icon={ListChecks}
          label="Completed MCQ papers"
          current={mcqPaperCount}
          target={MIN_MCQ_PAPERS_FOR_REVIEW}
          remaining={mcqPapersNeeded}
          cta={{ label: "Practice past MCQ", to: "/mcq-live" }}
        />
      </div>
    </div>
  );
}

function ProgressToward({
  icon: Icon,
  label,
  current,
  target,
  remaining,
  cta,
}: {
  icon: typeof PenLine;
  label: string;
  current: number;
  target: number;
  remaining: number;
  cta: { label: string; to: string };
}) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {current}
        <span className="text-base text-muted-foreground">/{target}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {remaining > 0 ? `${remaining} more to go` : "Ready"}
      </p>
      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}

type Eligible = Extract<Awaited<ReturnType<typeof getReviewPanel>>, { eligible: true }>;

function ReviewResults({ data }: { data: Eligible }) {
  const trendIcon =
    data.gradeTrend === "improving"
      ? TrendingUp
      : data.gradeTrend === "declining"
        ? TrendingDown
        : Minus;
  const TrendIcon = trendIcon;
  const trendTone =
    data.gradeTrend === "improving"
      ? "text-emerald-600 dark:text-emerald-400"
      : data.gradeTrend === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  const { gradeProjection, masteryPillars, domainComparison } = data;

  const gradeColor =
    gradeProjection?.projectedGrade === "A*"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : gradeProjection?.projectedGrade === "A"
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
        : gradeProjection?.projectedGrade === "B"
          ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
          : "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-6">
      {/* ── 1. Cambridge Grade Projection Header ── */}
      {gradeProjection ? (
        <div className="panel relative overflow-hidden p-6 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="size-4" />
                </span>
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Cambridge 9708 Performance Benchmark
                </span>
                <Badge variant="outline" className="ml-1 text-[11px] capitalize">
                  {data.sampleLevel} review
                </Badge>
              </div>

              <div className="flex items-baseline gap-3">
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl border text-3xl font-extrabold tracking-tight shadow-sm",
                    gradeColor,
                  )}
                >
                  {gradeProjection.projectedGrade}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Projected Grade: {gradeProjection.projectedGrade}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Current average across scripts:{" "}
                    <span className="font-semibold text-foreground">
                      {gradeProjection.currentAveragePercent}%
                    </span>{" "}
                    · Target:{" "}
                    <span className="font-semibold text-foreground">
                      Grade {gradeProjection.targetGrade}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:max-w-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Target Distance:</span>
                <span className="font-semibold text-primary">
                  {gradeProjection.marksToNextGrade}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Model Confidence:</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] capitalize",
                    gradeProjection.confidence === "high"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {gradeProjection.confidence}
                </Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                Calibrated against official Cambridge 9708 June/November grade boundaries.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 2. Overall Summary & Trend ── */}
      <div className="panel p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.essayCount} essays evaluated</Badge>
          <Badge variant="secondary">{data.mcqPaperCount} MCQ papers evaluated</Badge>
          <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium", trendTone)}>
            <TrendIcon className="size-3.5" />
            {data.gradeTrend === "not enough data"
              ? "Trend unclear yet"
              : `Trajectory: ${data.gradeTrend}`}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{data.overallSummary}</p>
        {data.encouragement ? (
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
            {data.encouragement}
          </p>
        ) : null}
      </div>

      {/* ── 3. The 5 Pillars of Cambridge Economics Mastery ── */}
      {masteryPillars && masteryPillars.length > 0 ? (
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-primary" /> 5 Pillars of Cambridge Economics
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rigorous diagnostics across definitions, causal depth, evaluative weigh-ups,
                diagrams, and MCQ traps.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {masteryPillars.map((pillar) => {
              const statusBadge =
                pillar.status === "mastered"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                  : pillar.status === "developing"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400";

              const barColor =
                pillar.status === "mastered"
                  ? "bg-emerald-600"
                  : pillar.status === "developing"
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <div
                  key={pillar.pillar}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold leading-tight">{pillar.pillar}</h3>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] shrink-0 uppercase", statusBadge)}
                      >
                        {pillar.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Proficiency</span>
                      <span className="font-semibold tabular-nums">{pillar.score}%</span>
                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground border-t border-border/60 pt-2.5">
                    {pillar.guidance}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── 4. Assessment Objective (AO) Breakdown & Micro vs Macro Split ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="size-4 text-primary" /> Assessment objective profile
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Official Cambridge weights: AO1 Knowledge, AO2 Analysis, AO3 Evaluation.
          </p>
          <div className="mt-4 space-y-4">
            {data.aoAnalysis.map((ao) => (
              <div
                key={ao.ao}
                className="rounded-lg border border-border/80 bg-background/50 p-3.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{ao.ao}</span>
                  <span className="text-sm font-semibold tabular-nums">{ao.averagePercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${ao.averagePercent}%` }}
                  />
                </div>
                {ao.comment ? (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{ao.comment}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {domainComparison ? (
          <div className="panel p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="size-4 text-primary" /> Micro vs Macro balance
                </h2>
                <Badge variant="outline" className="text-[10px] capitalize font-medium">
                  {domainComparison.strongerDomain === "balanced"
                    ? "Equilibrium"
                    : `${domainComparison.strongerDomain} leading`}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Comparing aggregate mastery across syllabus Sections 1–3 (Micro) vs 4–6 (Macro).
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Microeconomics (Firms, Markets, Efficiency)
                    </span>
                    <span className="font-semibold tabular-nums">
                      {domainComparison.microAvgPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${domainComparison.microAvgPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Macroeconomics (Monetary, Fiscal, Trade, Growth)
                    </span>
                    <span className="font-semibold tabular-nums">
                      {domainComparison.macroAvgPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${domainComparison.macroAvgPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-card p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Examiner Guidance
              </span>
              <p className="mt-1 text-xs text-foreground/90 leading-relaxed">
                {domainComparison.recommendation}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 5. Strengths & Weaknesses ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" /> What's genuinely
            working
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyStrengths.map((item, index) => (
              <li key={index} className="rounded-lg border border-border bg-card p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
              </li>
            ))}
            {data.keyStrengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No consistent strength flagged yet.</p>
            ) : null}
          </ul>
        </div>

        <div className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> What's costing
            you marks
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyWeaknesses.map((item, index) => (
              <li key={index} className="rounded-lg border border-border bg-card p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                {item.evidence ? (
                  <div className="mt-2 rounded bg-muted/60 px-2.5 py-1.5 text-xs text-foreground/80 italic border-l-2 border-amber-500">
                    “{item.evidence}”
                  </div>
                ) : null}
              </li>
            ))}
            {data.keyWeaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recurring flagged.</p>
            ) : null}
          </ul>
        </div>
      </div>

      {/* ── 6. MCQ Section Breakdown & Weakest MCQ Topics ── */}
      {data.mcqDomainBreakdown.length > 0 ? (
        <div className="panel p-6">
          <h2 className="text-sm font-semibold">MCQ domain accuracy</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Micro vs Macro accuracy across your completed past papers.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {data.mcqDomainBreakdown.map((entry) => (
              <div key={entry.domain} className="rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {MCQ_DOMAIN_LABEL[entry.domain]}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{entry.accuracyPct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${entry.accuracyPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {entry.correct}/{entry.attempted} correct
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data.weakMcqTopics.length > 0 ? (
        <div className="panel p-6">
          <h2 className="text-sm font-semibold">Weakest MCQ syllabus topics</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Topics where distractors were most frequently chosen. Review these before your next
            timed mock.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.weakMcqTopics.map((topic) => (
              <Badge
                key={topic.topic}
                variant={topic.accuracyPercent < 50 ? "destructive" : "outline"}
                className="py-1 px-2.5 text-xs font-normal"
              >
                {topic.topic} — {topic.accuracyPercent}%
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── 7. Action Plan with Mark Gains ── */}
      <div className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-primary" /> Your prioritised mark gain plan
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ranked high-yield actions with estimated mark gains on Cambridge Papers 1, 2, 3 & 4.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3.5">
          {data.actionPlan.map((item, index) => {
            const tool = TOOL_LABEL[item.tool];
            return (
              <li
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="flex gap-3.5 min-w-0 flex-1">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {item.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.action}</p>
                      {item.estimatedMarkGain ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium"
                        >
                          Gain: {item.estimatedMarkGain}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.why}</p>
                  </div>
                </div>

                {tool ? (
                  <Button asChild size="sm" variant="outline" className="shrink-0 text-xs h-8">
                    <Link to={tool.to}>
                      {tool.label} <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
