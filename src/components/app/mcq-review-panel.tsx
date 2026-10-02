import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MCQ_DOMAIN_LABEL, type DomainStat } from "@/lib/mcq-domain";

export type TopicStat = {
  topic: string;
  attempted: number;
  correct: number;
  accuracyPct: number | null;
};

/**
 * SAT-"Reading vs Writing" style two-section breakdown for MCQ feedback —
 * micro and macro side by side, sitting above the fine-grained per-topic
 * list rather than replacing it. Renders nothing for a section with zero
 * attempted questions (e.g. a paper that happened to be all-micro).
 */
export function McqDomainBreakdown({
  domains,
  title = "Micro vs macro",
}: {
  domains: DomainStat[];
  title?: string;
}) {
  const shown = domains.filter((d) => d.attempted > 0 && d.domain !== "unclassified");
  if (shown.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {shown.map((entry) => (
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
            <p className="mt-1.5 text-xs text-muted-foreground">
              {entry.correct}/{entry.attempted} correct
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Short, written review of an MCQ attempt — a couple of sentences on what's
 * solid and what needs work, instead of a per-topic progress-bar column.
 * Used both inline after a single attempt and as the standing summary
 * pulled from mcq_topic_performance (which unions both sources, so this
 * component reads either shape).
 */
export function McqReviewPanel({
  topics,
  title = "How you're doing",
  emptyLabel = "Answer a few questions and you'll get a quick read on your strengths and weaknesses here.",
}: {
  topics: TopicStat[];
  title?: string;
  emptyLabel?: string;
}) {
  const withData = topics
    .filter((t) => t.attempted > 0)
    .map((t) => ({ ...t, pct: t.accuracyPct ?? Math.round((t.correct / t.attempted) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  if (withData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{emptyLabel}</CardContent>
      </Card>
    );
  }

  const weak = withData.filter((t) => t.pct < 50).slice(0, 3);
  const strong = [...withData]
    .filter((t) => t.pct >= 70)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const totalAttempted = withData.reduce((s, t) => s + t.attempted, 0);
  const totalCorrect = withData.reduce((s, t) => s + t.correct, 0);
  const overallPct = Math.round((totalCorrect / Math.max(totalAttempted, 1)) * 100);

  const list = (items: typeof withData) =>
    items.map((t) => `${t.topic} (${t.correct}/${t.attempted})`).join(", ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          {totalCorrect}/{totalAttempted} correct overall ({overallPct}%).
        </p>
        {strong.length > 0 ? (
          <p>
            <span className="font-medium text-foreground">Strength: </span>
            <span className="text-muted-foreground">
              solid on {list(strong)}
              {strong.length > 1 ? "." : "."}
            </span>
          </p>
        ) : null}
        {weak.length > 0 ? (
          <p>
            <span className="font-medium text-foreground">Weakness: </span>
            <span className="text-muted-foreground">focus next on {list(weak)}.</span>
          </p>
        ) : null}
        {strong.length === 0 && weak.length === 0 ? (
          <p className="text-muted-foreground">
            Mixed results so far — nothing standing out as a clear strength or weak spot yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** One graded question, enough to render a clickable review row. */
export type GradedQuestion = {
  number: number;
  topic: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  user_answer: "A" | "B" | "C" | "D" | null;
  correct: boolean | null;
};

/** State for one question's on-demand AI explanation, keyed by question number. */
export type ExplanationState = "loading" | { text: string } | { error: string };

/**
 * Full per-question list: right/wrong, what the student picked vs. the
 * correct answer, and its topic tag. Clicking a row calls `onSelect` so the
 * caller can scroll to and highlight that question on the page — this
 * component doesn't know about pages/canvases itself, just the list.
 *
 * Any question with a correct answer on record also gets an "Explain"
 * button — fetches a short written explanation on demand (never before
 * the attempt is marked) and expands it inline, most useful on the ones
 * marked wrong.
 */
export function McqQuestionReviewList({
  questions,
  onSelect,
  onExplain,
  explanations,
  title = "Review each question",
}: {
  questions: GradedQuestion[];
  onSelect: (number: number) => void;
  /** Called when the student presses "Explain" for a question — caller owns fetching + state. */
  onExplain?: (number: number) => void;
  /** Current explanation state per question number, if any request has been made for it. */
  explanations?: Record<number, ExplanationState>;
  title?: string;
}) {
  const sorted = [...questions].sort((a, b) => a.number - b.number);
  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {sorted.map((q) => {
            const skipped = q.user_answer === null;
            const explanation = explanations?.[q.number];
            return (
              <li key={q.number}>
                <div className="flex w-full items-center gap-3 px-4 py-2.5 text-sm">
                  <button
                    type="button"
                    onClick={() => onSelect(q.number)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
                  >
                    {q.correct === true ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : q.correct === false ? (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                    )}
                    <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                      Q{q.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.topic}</span>
                    <span className="shrink-0 font-mono text-xs">
                      {skipped ? (
                        <span className="text-muted-foreground">skipped</span>
                      ) : q.correct ? (
                        <span className="text-primary">{q.user_answer}</span>
                      ) : (
                        <span className="text-destructive">
                          {q.user_answer} <span className="text-muted-foreground">→</span>{" "}
                          {q.correct_answer}
                        </span>
                      )}
                    </span>
                  </button>
                  {onExplain && q.correct_answer ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 gap-1 px-2 text-xs"
                      disabled={explanation === "loading"}
                      onClick={() => onExplain(q.number)}
                    >
                      {explanation === "loading" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Explain
                    </Button>
                  ) : null}
                </div>
                {explanation && explanation !== "loading" ? (
                  <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    {"text" in explanation ? explanation.text : explanation.error}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
