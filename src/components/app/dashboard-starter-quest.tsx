import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  PenLine,
  ListChecks,
  LineChart,
  GraduationCap,
  ArrowRight,
  Trophy,
  ChevronRight,
  Flame,
  X,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const QUEST_DISMISSED_KEY = "marginal_starter_quest_dismissed";
const DIAGRAM_INSPECTED_KEY = "marginal_diagram_inspected";

export function DashboardStarterQuest({
  versionsCount,
  mcqAttemptsCount,
  className,
}: {
  versionsCount: number;
  mcqAttemptsCount: number;
  className?: string;
}) {
  const [hasInspectedDiagram, setHasInspectedDiagram] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = localStorage.getItem(QUEST_DISMISSED_KEY) === "true";
      setIsDismissed(dismissed);
      const diagramDone = localStorage.getItem(DIAGRAM_INSPECTED_KEY) === "true";
      setHasInspectedDiagram(diagramDone);
    } catch {}
  }, []);

  const step1Done = versionsCount > 0;
  const step2Done = mcqAttemptsCount > 0;
  const step3Done = hasInspectedDiagram;

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const totalSteps = 3;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(QUEST_DISMISSED_KEY, "true");
    } catch {}
  };

  if (isDismissed && allDone) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5 shadow-xs transition-all text-left",
        allDone
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-primary/30 bg-gradient-to-br from-primary/[0.06] via-card to-card",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "size-9 rounded-xl flex items-center justify-center shrink-0 border",
              allDone
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                : "bg-primary/15 border-primary/25 text-primary",
            )}
          >
            {allDone ? <Trophy className="size-5" /> : <Sparkles className="size-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {allDone
                  ? "Cambridge 9708 Flight Readiness Complete! 🎓"
                  : "Cambridge 9708 Flight Check (Starter Quest)"}
              </h3>
              <Badge
                className={cn(
                  "text-[10px] font-semibold py-0",
                  allDone
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-primary/20 text-primary border-primary/30",
                )}
              >
                {completedCount} of {totalSteps} Completed ({progressPct}%)
              </Badge>
            </div>
            <p className="text-[11.5px] sm:text-xs text-muted-foreground mt-0.5">
              {allDone
                ? "Your academic profile is fully calibrated across Cambridge essay grading, MCQs, and syllabus models."
                : "Complete these 3 quick milestones in under 3 minutes to unlock your projected grade band."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {allDone && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5 mr-1" /> Dismiss
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <Progress
          value={progressPct}
          className="h-2 rounded-full bg-muted/60"
        />
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3.5">
        {/* STEP 1 */}
        <div
          className={cn(
            "p-3 rounded-xl border flex flex-col justify-between transition-all",
            step1Done
              ? "border-emerald-500/25 bg-emerald-500/[0.03]"
              : "border-border/70 bg-card hover:border-primary/40",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Step 1: Essay Grader
              </span>
              {step1Done ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                  <CheckCircle2 className="size-3.5" /> Done
                </span>
              ) : (
                <Badge variant="outline" className="text-[9.5px] px-1 py-0 text-primary border-primary/30">
                  Try 1-Click
                </Badge>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Grade Your First Essay
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Paste text, snap a photo of handwriting, or load our pre-written Cambridge sample essay.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40">
            {step1Done ? (
              <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Baseline score recorded
              </span>
            ) : (
              <Button asChild size="sm" className="w-full h-7 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link to="/grade" search={{ sample: 12 }}>
                  <Wand2 className="size-3" />
                  Try 1-Click Sample
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* STEP 2 */}
        <div
          className={cn(
            "p-3 rounded-xl border flex flex-col justify-between transition-all",
            step2Done
              ? "border-emerald-500/25 bg-emerald-500/[0.03]"
              : "border-border/70 bg-card hover:border-primary/40",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Step 2: Paper 1 &amp; 3
              </span>
              {step2Done ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                  <CheckCircle2 className="size-3.5" /> Done
                </span>
              ) : (
                <Badge variant="outline" className="text-[9.5px] px-1 py-0 text-primary border-primary/30">
                  3 Min
                </Badge>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Practice 3 MCQs
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Solve official past-paper multiple choice questions with instant examiner explanations.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40">
            {step2Done ? (
              <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> MCQ accuracy tracking
              </span>
            ) : (
              <Button asChild size="sm" variant="outline" className="w-full h-7 text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10">
                <Link to="/mcq-live">
                  <ListChecks className="size-3" />
                  Start MCQ Sprint
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* STEP 3 */}
        <div
          className={cn(
            "p-3 rounded-xl border flex flex-col justify-between transition-all",
            step3Done
              ? "border-emerald-500/25 bg-emerald-500/[0.03]"
              : "border-border/70 bg-card hover:border-primary/40",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Step 3: Visual Models
              </span>
              {step3Done ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                  <CheckCircle2 className="size-3.5" /> Done
                </span>
              ) : (
                <Badge variant="outline" className="text-[9.5px] px-1 py-0 text-primary border-primary/30">
                  Quick View
                </Badge>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Inspect an Exam Diagram
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Master syllabus curves: AD/AS, negative externalities, tariffs, and elasticity shifts.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40">
            {step3Done ? (
              <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Diagram library explored
              </span>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.setItem(DIAGRAM_INSPECTED_KEY, "true");
                    setHasInspectedDiagram(true);
                  } catch {}
                }}
                className="w-full h-7 text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Link to="/diagrams">
                  <LineChart className="size-3" />
                  Explore Diagrams
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modern "What would you like to achieve today?" Intent Launcher
 */
export function DashboardGoalLauncher({ className }: { className?: string }) {
  const goals = [
    {
      to: "/grade",
      search: { sample: 12 },
      title: "Grade an Essay (or Sample)",
      tag: "Paper 2 & 4",
      icon: PenLine,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Paste typed text or snap phone photos with OCR. Instant AO1-AO4 Cambridge rubric marking.",
      actionLabel: "Try 1-Click Demo",
    },
    {
      to: "/mcq-live",
      search: {},
      title: "5-Minute MCQ Sprint",
      tag: "Paper 1 & 3",
      icon: ListChecks,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description: "Official past-paper MCQs with built-in timer, calculator, and examiner explanations.",
      actionLabel: "Start Questions",
    },
    {
      to: "/diagrams",
      search: {},
      title: "Cambridge Diagram Library",
      tag: "Key for AO2",
      icon: LineChart,
      color: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
      description: "20+ syllabus-standard economic diagrams with curve shifts and written analysis points.",
      actionLabel: "View Library",
    },
    {
      to: "/response-structure",
      search: {},
      title: "Essay Structure & Evaluation",
      tag: "Band 1 Rubrics",
      icon: GraduationCap,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Step-by-step master guides for 8m, 12m, and 20m evaluation, command words, and exemplars.",
      actionLabel: "Read Structure Guide",
    },
  ];

  return (
    <div className={cn("space-y-2.5 text-left", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            What would you like to achieve today?
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Choose a path to get started immediately
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {goals.map((g) => (
          <Link
            key={g.title}
            to={g.to}
            search={g.search}
            className="group relative rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div
                  className={cn(
                    "size-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                    g.color,
                  )}
                >
                  <g.icon className="size-4" />
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  {g.tag}
                </Badge>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {g.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                {g.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-primary mt-3 pt-2.5 border-t border-border/50">
              <span>{g.actionLabel}</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
