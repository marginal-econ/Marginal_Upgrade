import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  ListChecks,
  PenLine,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Minus,
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
          "A single AI review across your recent essays and MCQ papers — recurring strengths, recurring weaknesses, and a prioritised plan for what to do next.",
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
        description="One AI pass across all your recent essays and MCQ papers together — the patterns a single grade never shows you."
        action={
          hasRequested && query.data && query.data.eligible ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
              Regenerate
            </Button>
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
        <h2 className="text-base font-semibold">Your full aggregate review</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Unlocks once you have {MIN_ESSAYS_FOR_REVIEW} graded essays and{" "}
          {MIN_MCQ_PAPERS_FOR_REVIEW} completed MCQ papers. The examiner reads across all of them at
          once — recurring strengths, recurring weaknesses with real evidence, an AO1/AO2/AO3 trend,
          your weakest MCQ topics, and a prioritised plan for exactly what to do next.
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
        Reading across your recent essays and MCQ papers — this takes a bit longer than a single
        grade…
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
        <h2 className="text-base font-semibold">Not quite enough data yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The review needs a real sample to find genuine patterns, not just restate one grade.
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
          cta={{ label: "Practice MCQ", to: "/mcq-live" }}
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
      ? "text-emerald-600"
      : data.gradeTrend === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.essayCount} essays reviewed</Badge>
          <Badge variant="secondary">{data.mcqPaperCount} MCQ papers reviewed</Badge>
          <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium", trendTone)}>
            <TrendIcon className="size-3.5" />
            {data.gradeTrend === "not enough data"
              ? "Trend unclear yet"
              : `Trend: ${data.gradeTrend}`}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{data.overallSummary}</p>
        {data.encouragement ? (
          <p className="mt-3 rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground/90">
            {data.encouragement}
          </p>
        ) : null}
      </div>

      <div className="panel p-6">
        <h2 className="text-sm font-semibold">Assessment objective trend</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {data.aoAnalysis.map((ao) => (
            <div key={ao.ao}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">{ao.ao}</span>
                <span className="text-sm font-semibold tabular-nums">{ao.averagePercent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${ao.averagePercent}%` }}
                />
              </div>
              {ao.comment ? (
                <p className="mt-2 text-xs text-muted-foreground">{ao.comment}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ThumbsUp className="size-4 text-emerald-600" /> What's genuinely working
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyStrengths.map((item, index) => (
              <li key={index} className="rounded-lg border border-border bg-card p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </li>
            ))}
            {data.keyStrengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No consistent strength yet.</p>
            ) : null}
          </ul>
        </div>

        <div className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-600" /> What's costing you marks
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyWeaknesses.map((item, index) => (
              <li key={index} className="rounded-lg border border-border bg-card p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                {item.evidence ? (
                  <p className="mt-1.5 text-xs text-muted-foreground/80 italic">{item.evidence}</p>
                ) : null}
              </li>
            ))}
            {data.keyWeaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recurring flagged.</p>
            ) : null}
          </ul>
        </div>
      </div>

      {data.mcqDomainBreakdown.length > 0 ? (
        <div className="panel p-6">
          <h2 className="text-sm font-semibold">MCQ section breakdown</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Micro vs macro, the same way SAT-style feedback splits reading and writing.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {data.mcqDomainBreakdown.map((entry) => (
              <div key={entry.domain}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">
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
          <h2 className="text-sm font-semibold">Weakest MCQ topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.weakMcqTopics.map((topic) => (
              <Badge
                key={topic.topic}
                variant={topic.accuracyPercent < 50 ? "destructive" : "outline"}
              >
                {topic.topic} — {topic.accuracyPercent}%
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel p-6">
        <h2 className="text-sm font-semibold">Your prioritised plan</h2>
        <ol className="mt-4 space-y-3">
          {data.actionPlan.map((item, index) => {
            const tool = TOOL_LABEL[item.tool];
            return (
              <li key={index} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {item.priority}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.why}</p>
                  {tool ? (
                    <Button asChild size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs">
                      <Link to={tool.to}>
                        {tool.label} <ArrowRight className="size-3" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
