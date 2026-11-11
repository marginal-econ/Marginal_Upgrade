import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, stripStars } from "@/lib/utils";
import {
  getSyllabusTopicMeta,
  MCQ_DOMAIN_LABEL,
  type DomainStat,
  type McqSkill,
} from "@/lib/mcq-domain";

export type TopicStat = {
  topic: string;
  attempted: number;
  correct: number;
  accuracyPct: number | null;
  unit?: string;
  domain?: "micro" | "macro" | "unclassified";
  revisionTip?: string;
  questionNumbers?: number[];
  wrongNumbers?: number[];
};

export type McqDiagnostic = {
  concept: string;
  keyRule: string;
  correctReasoning: string;
  distractorTrap: string;
  speedTip: string;
};

/** One graded question, enough to render a clickable review row and topic/skill breakdown. */
export type GradedQuestion = {
  number: number;
  topic: string;
  subtopic?: string;
  unit?: string;
  domain?: "micro" | "macro" | "unclassified";
  skill?: McqSkill;
  stem_text?: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  user_answer: "A" | "B" | "C" | "D" | null;
  correct: boolean | null;
};

/**
 * Helper to build rich per-topic diagnostic stats from a graded `questions` list.
 * Groups questions by canonical Cambridge 9708 syllabus topic and tracks exact
 * question numbers and missed question numbers for each topic.
 */
export function buildTopicStatsFromQuestions(
  questions: GradedQuestion[],
  level: "AS" | "A2" = "AS",
): TopicStat[] {
  const map = new Map<
    string,
    {
      topic: string;
      unit: string;
      domain: "micro" | "macro";
      revisionTip: string;
      attempted: number;
      correct: number;
      questionNumbers: number[];
      wrongNumbers: number[];
    }
  >();

  for (const q of questions) {
    const meta = getSyllabusTopicMeta(q.topic, level);
    const canonicalTopic = meta.topic;
    const entry = map.get(canonicalTopic) ?? {
      topic: canonicalTopic,
      unit: q.unit || meta.unit,
      domain: (q.domain === "macro" || q.domain === "micro" ? q.domain : meta.domain) as
        | "micro"
        | "macro",
      revisionTip: meta.revisionTip,
      attempted: 0,
      correct: 0,
      questionNumbers: [],
      wrongNumbers: [],
    };
    entry.attempted += 1;
    entry.questionNumbers.push(q.number);
    if (q.correct) {
      entry.correct += 1;
    } else {
      entry.wrongNumbers.push(q.number);
    }
    map.set(canonicalTopic, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      questionNumbers: entry.questionNumbers.sort((a, b) => a - b),
      wrongNumbers: entry.wrongNumbers.sort((a, b) => a - b),
      accuracyPct: Math.round((entry.correct / Math.max(1, entry.attempted)) * 100),
    }))
    .sort((a, b) => {
      if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
      return b.attempted - b.correct - (a.attempted - a.correct);
    });
}

/**
 * SAT-"Reading vs Writing" style two-section breakdown for MCQ feedback —
 * Microeconomics and Macroeconomics side by side with clear lagging indicator.
 */
export function McqDomainBreakdown({
  domains,
  title = "Section Breakdown: Microeconomics vs Macroeconomics",
}: {
  domains: DomainStat[];
  title?: string;
}) {
  const shown = domains.filter((d) => d.attempted > 0 && d.domain !== "unclassified");
  if (shown.length === 0) return null;

  const micro = shown.find((d) => d.domain === "micro");
  const macro = shown.find((d) => d.domain === "macro");
  let insightText: string | null = null;
  if (micro && macro) {
    const diff = micro.accuracyPct - macro.accuracyPct;
    if (Math.abs(diff) <= 7) {
      insightText = `Balanced performance across Microeconomics (${micro.accuracyPct}%) and Macroeconomics (${macro.accuracyPct}%).`;
    } else if (diff < 0) {
      insightText = `Microeconomics is lagging Macroeconomics by ${Math.abs(diff)} percentage points (${micro.attempted - micro.correct} marks lost in Micro).`;
    } else {
      insightText = `Macroeconomics is lagging Microeconomics by ${diff} percentage points (${macro.attempted - macro.correct} marks lost in Macro).`;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {micro && macro && Math.abs(micro.accuracyPct - macro.accuracyPct) > 7 ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]"
            >
              Lagging Section:{" "}
              {micro.accuracyPct < macro.accuracyPct ? "Microeconomics" : "Macroeconomics"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((entry) => {
            const marksLost = entry.attempted - entry.correct;
            const isLagging = entry.accuracyPct < 65;
            return (
              <div
                key={entry.domain}
                className={cn(
                  "rounded-lg border p-3",
                  isLagging
                    ? "border-rose-500/25 bg-rose-500/5"
                    : "border-border/70 bg-muted/20",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {MCQ_DOMAIN_LABEL[entry.domain]}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      entry.accuracyPct >= 75
                        ? "text-emerald-600 dark:text-emerald-400"
                        : entry.accuracyPct >= 55
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {entry.accuracyPct}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      entry.accuracyPct >= 75
                        ? "bg-emerald-500"
                        : entry.accuracyPct >= 55
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${entry.accuracyPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {entry.correct}/{entry.attempted} correct
                  </span>
                  {marksLost > 0 ? (
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      -{marksLost} {marksLost === 1 ? "mark" : "marks"}
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Full marks
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {insightText ? (
          <p className="text-xs text-muted-foreground">{insightText}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Advanced, comprehensive Topic-Wise Diagnostic Report for Cambridge 9708 MCQ attempts.
 * Pinpoints exact lagging syllabus topics, marks lost per topic, clickable missed questions,
 * Cambridge examiner revision tips, full topic mastery matrix, and AO1/AO2/AO3 skill performance.
 */
export function McqReviewPanel({
  topics,
  questions,
  onSelectQuestion,
  title = "Topic-Wise Diagnostic & Lagging Areas",
  emptyLabel = "Complete an MCQ paper to unlock your topic-by-topic Cambridge 9708 diagnostic report.",
}: {
  topics: TopicStat[];
  questions?: GradedQuestion[];
  onSelectQuestion?: (questionNumber: number) => void;
  title?: string;
  emptyLabel?: string;
}) {
  // Normalize & merge topics so legacy "Untagged" or duplicate canonical topics combine cleanly
  const mergedMap = new Map<
    string,
    {
      topic: string;
      unit: string;
      domain: "micro" | "macro";
      revisionTip: string;
      attempted: number;
      correct: number;
      questionNumbers: number[];
      wrongNumbers: number[];
    }
  >();

  const baseList =
    questions && questions.length > 0 ? buildTopicStatsFromQuestions(questions) : topics;

  for (const raw of baseList) {
    if (raw.attempted <= 0) continue;
    const meta = getSyllabusTopicMeta(raw.topic);
    const key = meta.topic;
    const existing = mergedMap.get(key) ?? {
      topic: meta.topic,
      unit: raw.unit || meta.unit,
      domain:
        raw.domain === "macro" || raw.domain === "micro" ? raw.domain : meta.domain,
      revisionTip: raw.revisionTip || meta.revisionTip,
      attempted: 0,
      correct: 0,
      questionNumbers: [],
      wrongNumbers: [],
    };
    existing.attempted += raw.attempted;
    existing.correct += raw.correct;
    if (raw.questionNumbers) {
      existing.questionNumbers.push(...raw.questionNumbers);
    }
    if (raw.wrongNumbers) {
      existing.wrongNumbers.push(...raw.wrongNumbers);
    }
    mergedMap.set(key, existing);
  }

  const withData = [...mergedMap.values()]
    .map((t) => {
      const pct = Math.round((t.correct / Math.max(1, t.attempted)) * 100);
      const marksLost = t.attempted - t.correct;
      return {
        ...t,
        pct,
        marksLost,
      };
    })
    .sort((a, b) => {
      if (a.pct !== b.pct) return a.pct - b.pct;
      return b.marksLost - a.marksLost;
    });

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

  const totalAttempted = withData.reduce((s, t) => s + t.attempted, 0);
  const totalCorrect = withData.reduce((s, t) => s + t.correct, 0);
  const totalMarksLost = totalAttempted - totalCorrect;
  const overallPct = Math.round((totalCorrect / Math.max(totalAttempted, 1)) * 100);

  // Lagging topics: any topic < 70% accuracy (or if all topics >= 70%, any topic where marks were lost)
  const laggingTopics = withData
    .filter((t) => t.pct < 70 && t.marksLost > 0)
    .slice(0, 4);
  const fallbackLagging =
    laggingTopics.length === 0
      ? withData.filter((t) => t.marksLost > 0).slice(0, 3)
      : laggingTopics;

  const strongTopics = [...withData]
    .filter((t) => t.pct >= 75)
    .sort((a, b) => b.pct - a.pct || b.attempted - a.attempted);

  const gradeBand =
    overallPct >= 80
      ? { grade: "A*", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
      : overallPct >= 70
        ? { grade: "A", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" }
        : overallPct >= 60
          ? { grade: "B", color: "text-sky-600 bg-sky-500/10 border-sky-500/30" }
          : overallPct >= 50
            ? { grade: "C", color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/30" }
            : overallPct >= 40
              ? { grade: "D", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" }
              : overallPct >= 33
                ? { grade: "E", color: "text-orange-600 bg-orange-500/10 border-orange-500/30" }
                : { grade: "U", color: "text-rose-600 bg-rose-500/10 border-rose-500/30" };

  // Compute AO skill stats if questions are provided
  const skillStats = (() => {
    if (!questions || questions.length === 0) return [];
    const map = new Map<McqSkill, { label: string; attempted: number; correct: number }>([
      ["knowledge", { label: "AO1 Knowledge & Definitions", attempted: 0, correct: 0 }],
      ["application", { label: "AO2 Data & Numerical Application", attempted: 0, correct: 0 }],
      ["analysis", { label: "AO3 Diagram & Causal Analysis", attempted: 0, correct: 0 }],
    ]);
    for (const q of questions) {
      const sk: McqSkill =
        q.skill === "application" || q.skill === "analysis" ? q.skill : "knowledge";
      const entry = map.get(sk)!;
      entry.attempted += 1;
      if (q.correct) entry.correct += 1;
    }
    return [...map.entries()]
      .filter(([, v]) => v.attempted > 0)
      .map(([skill, v]) => ({
        skill,
        label: v.label,
        attempted: v.attempted,
        correct: v.correct,
        pct: Math.round((v.correct / v.attempted) * 100),
      }));
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cambridge 9708 syllabus topic accuracy, marks lost &amp; targeted revision priorities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Est. Grade:</span>
          <Badge variant="outline" className={cn("font-bold text-xs px-2.5 py-0.5", gradeBand.color)}>
            <Award className="size-3.5 mr-1" /> Grade {gradeBand.grade}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm leading-relaxed">
        {/* ── 1. High-Level Score & Topic Summary Strip ── */}
        <div className="grid grid-cols-3 gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-3">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">Overall Accuracy</span>
            <p className="text-base font-bold tabular-nums sm:text-lg">
              {totalCorrect} / {totalAttempted}{" "}
              <span className="text-xs font-normal text-muted-foreground">({overallPct}%)</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">Marks Lost</span>
            <p
              className={cn(
                "text-base font-bold tabular-nums sm:text-lg",
                totalMarksLost > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {totalMarksLost > 0 ? `-${totalMarksLost} marks` : "0 lost"}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">Topics Mastered</span>
            <p className="text-base font-bold tabular-nums sm:text-lg">
              {strongTopics.length} / {withData.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">(&ge;75%)</span>
            </p>
          </div>
        </div>

        {/* ── 2. Lagging Topics (Priority Revision Action Cards) ── */}
        {fallbackLagging.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <TrendingDown className="size-3.5" />
                <span>
                  Lagging Topics — Priority Revision ({fallbackLagging.length}{" "}
                  {fallbackLagging.length === 1 ? "Topic" : "Topics"})
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Sorted weakest first</span>
            </div>

            <div className="grid gap-2.5">
              {fallbackLagging.map((t) => (
                <div
                  key={t.topic}
                  className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-border bg-background/80 text-[10px] font-mono px-1.5 py-0"
                        >
                          {t.unit}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border bg-background/80 text-[10px] px-1.5 py-0"
                        >
                          {t.domain === "macro" ? "Macro" : "Micro"}
                        </Badge>
                        <span className="font-semibold text-foreground text-xs sm:text-sm">
                          {t.topic}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-xs"
                      >
                        {t.correct}/{t.attempted} ({t.pct}%)
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[11px]"
                      >
                        -{t.marksLost} {t.marksLost === 1 ? "mark" : "marks"}
                      </Badge>
                    </div>
                  </div>

                  {/* Clickable Missed / Attempted Question Pills */}
                  {t.wrongNumbers.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        Missed Questions:
                      </span>
                      {t.wrongNumbers.map((qNum) =>
                        onSelectQuestion ? (
                          <button
                            key={qNum}
                            type="button"
                            onClick={() => onSelectQuestion(qNum)}
                            className="inline-flex items-center gap-0.5 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                          >
                            Q{qNum} &times;
                          </button>
                        ) : (
                          <span
                            key={qNum}
                            className="inline-flex items-center gap-0.5 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-rose-700 dark:text-rose-300"
                          >
                            Q{qNum} &times;
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}

                  {/* Actionable Examiner Revision Tip */}
                  {t.revisionTip ? (
                    <div className="mt-2 flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-foreground/90">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <div>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          How to fix:{" "}
                        </span>
                        <span>{t.revisionTip}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Zero lagging topics detected — every tested Cambridge 9708 topic achieved 100% accuracy!
            </span>
          </div>
        )}

        {/* ── 3. Complete Topic-by-Topic Performance Breakdown ── */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="size-3.5" />
              <span>All Tested Syllabus Topics ({withData.length})</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Weakest &rarr; Strongest</span>
          </div>

          <div className="divide-y divide-border/60 rounded-lg border border-border/80">
            {withData.map((t) => {
              const status =
                t.pct < 55
                  ? {
                      label: "Lagging",
                      badgeClass:
                        "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      barClass: "bg-rose-500",
                    }
                  : t.pct < 75
                    ? {
                        label: "Developing",
                        badgeClass:
                          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        barClass: "bg-amber-500",
                      }
                    : {
                        label: "Strong",
                        badgeClass:
                          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        barClass: "bg-emerald-500",
                      };

              return (
                <div key={t.topic} className="p-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 font-semibold", status.badgeClass)}
                      >
                        {status.label}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">{t.unit}</span>
                      <span className="font-medium text-foreground">{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      {t.marksLost > 0 ? (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400">
                          -{t.marksLost}m
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {t.correct}/{t.attempted}
                      </span>
                      <span className="w-9 text-right font-bold">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", status.barClass)}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Syllabus Strengths Summary ── */}
        {strongTopics.length > 0 ? (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              <span>Strongest Syllabus Topics (&ge;75%)</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {strongTopics.map((t) => (
                <Badge
                  key={t.topic}
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 text-xs py-0.5"
                >
                  {t.topic} ({t.correct}/{t.attempted} &bull; {t.pct}%)
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── 5. Assessment Skill Breakdown (AO1 / AO2 / AO3) ── */}
        {skillStats.length > 0 ? (
          <div className="space-y-2 border-t border-border/60 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assessment Skill Breakdown (AO1 / AO2 / AO3)
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {skillStats.map((sk) => (
                <div
                  key={sk.skill}
                  className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-foreground truncate">{sk.label}</span>
                    <span className="font-bold tabular-nums">{sk.pct}%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sk.correct}/{sk.attempted} correct
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** State for one question's on-demand AI explanation, keyed by question number. */
export type ExplanationState =
  "loading" | { text: string; diagnostic?: McqDiagnostic } | { error: string };

/**
 * Advanced per-question list: right/wrong, student's answer vs correct mark scheme,
 * canonical syllabus topic + subtopic classification, filter tabs, and on-demand
 * Cambridge Examiner diagnostic feedback.
 */
export function McqQuestionReviewList({
  questions,
  onSelect,
  onExplain,
  explanations,
  title = "Question-by-Question Review & Explanations",
}: {
  questions: GradedQuestion[];
  onSelect: (number: number) => void;
  /** Called when the student presses "Explain" for a question — caller owns fetching + state. */
  onExplain?: (number: number) => void;
  /** Current explanation state per question number, if any request has been made for it. */
  explanations?: Record<number, ExplanationState>;
  title?: string;
}) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct">("all");
  const sorted = [...questions].sort((a, b) => a.number - b.number);
  if (sorted.length === 0) return null;

  const wrongCount = sorted.filter((q) => !q.correct).length;
  const correctCount = sorted.filter((q) => q.correct === true).length;

  const filtered = sorted.filter((q) => {
    if (filter === "wrong") return !q.correct;
    if (filter === "correct") return q.correct === true;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              filter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All ({sorted.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("wrong")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              filter === "wrong"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Incorrect / Missed ({wrongCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("correct")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              filter === "correct"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Correct ({correctCount})
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {filter === "wrong"
              ? "No incorrect questions — every question was answered correctly!"
              : "No questions match this filter."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((q) => {
              const skipped = q.user_answer === null;
              const explanation = explanations?.[q.number];
              const meta = getSyllabusTopicMeta(q.topic);
              const displayTopic = meta.topic;
              const displayUnit = q.unit || meta.unit;

              return (
                <li key={q.number} className="transition-colors hover:bg-muted/10">
                  <div className="flex w-full items-center gap-3 px-4 py-2.5 text-sm">
                    <button
                      type="button"
                      onClick={() => onSelect(q.number)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
                    >
                      {q.correct === true ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : q.correct === false ? (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                      )}
                      <span className="w-9 shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                        Q{q.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {displayUnit}
                          </span>
                          <span className="truncate font-medium text-foreground text-xs sm:text-sm">
                            {displayTopic}
                          </span>
                        </div>
                        {q.subtopic && q.subtopic !== displayTopic ? (
                          <p className="truncate text-[11px] text-muted-foreground">{q.subtopic}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-mono text-xs">
                        {skipped ? (
                          <span className="text-muted-foreground">
                            skipped &rarr;{" "}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {q.correct_answer}
                            </span>
                          </span>
                        ) : q.correct ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {q.user_answer}
                          </span>
                        ) : (
                          <span className="text-destructive font-semibold">
                            {q.user_answer}{" "}
                            <span className="text-muted-foreground font-normal">&rarr;</span>{" "}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {q.correct_answer}
                            </span>
                          </span>
                        )}
                      </span>
                    </button>

                    {onExplain && q.correct_answer ? (
                      <Button
                        variant={explanation && explanation !== "loading" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 shrink-0 gap-1 px-2.5 text-xs"
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

                  {/* ── Structured Examiner Explanation ── */}
                  {explanation && explanation !== "loading" ? (
                    <div className="border-t border-border/70 bg-card/60 px-4 py-3 text-xs leading-relaxed">
                      {"error" in explanation ? (
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="size-4 shrink-0" />
                          <span>{explanation.error}</span>
                        </div>
                      ) : explanation.diagnostic ? (
                        <div className="space-y-3">
                          {/* Concept & Target Reference */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                            <div className="flex items-center gap-1.5 text-primary">
                              <BookOpen className="size-3.5" />
                              <span className="font-semibold">
                                {stripStars(explanation.diagnostic.concept)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              {q.user_answer && !q.correct ? (
                                <Badge
                                  variant="outline"
                                  className="text-destructive border-destructive/30 bg-destructive/10"
                                >
                                  Student Pick: {q.user_answer}
                                </Badge>
                              ) : null}
                              <Badge
                                variant="outline"
                                className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                              >
                                Cambridge Mark Scheme: {q.correct_answer}
                              </Badge>
                            </div>
                          </div>

                          {/* Golden Rule / Cambridge Principle */}
                          {explanation.diagnostic.keyRule ? (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-foreground/90">
                              <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                                <Lightbulb className="size-3.5 shrink-0" />
                                <span>Cambridge Principle / Golden Rule</span>
                              </div>
                              <p className="mt-1 text-xs leading-normal">
                                {stripStars(explanation.diagnostic.keyRule)}
                              </p>
                            </div>
                          ) : null}

                          {/* Step-by-Step Worked Derivation */}
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-foreground/90">
                            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5 shrink-0" />
                              <span>
                                Step-by-Step Worked Derivation (Why Option {q.correct_answer} is
                                Correct)
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-normal">
                              {stripStars(explanation.diagnostic.correctReasoning)}
                            </p>
                          </div>

                          {/* Distractor Trap Analysis */}
                          {explanation.diagnostic.distractorTrap ? (
                            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-foreground/90">
                              <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                <span>Distractor Trap &amp; Misconception Diagnosis</span>
                              </div>
                              <p className="mt-1 text-xs leading-normal">
                                {stripStars(explanation.diagnostic.distractorTrap)}
                              </p>
                            </div>
                          ) : null}

                          {/* Speed Elimination Tip */}
                          {explanation.diagnostic.speedTip ? (
                            <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 text-xs text-foreground/90">
                              <Zap className="size-3.5 shrink-0 text-sky-500 mt-0.5" />
                              <div>
                                <span className="font-semibold text-sky-600 dark:text-sky-400">
                                  Paper Speed Shortcut (&lt; 45s):{" "}
                                </span>
                                <span>{stripStars(explanation.diagnostic.speedTip)}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground leading-relaxed">
                          {stripStars(explanation.text)}
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
