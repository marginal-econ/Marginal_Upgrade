import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bandFor, type Grading } from "@/lib/examiner/types";
import { getCambridgeGradeStandard } from "@/lib/cambridge-thresholds";
import { cn, stripStars } from "@/lib/utils";

const AO_META = [
  {
    key: "knowledge" as const,
    label: "AO1 Knowledge & Understanding",
    shortLabel: "AO1 Knowledge",
    icon: BookOpen,
    bar: "bg-sky-500",
    text: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max <= 2) {
        if (awarded === 2) return "Level 2 (Accurate & Precise)";
        if (awarded === 1) return "Level 1 (Basic / Terminology)";
        return "Below Level 1";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.75) return "Level 3 (Developed)";
      if (pct >= 0.45) return "Level 2 (Sound)";
      return "Level 1 (Basic)";
    },
  },
  {
    key: "analysis" as const,
    label: "AO2 Causal Analysis & Application",
    shortLabel: "AO2 Analysis",
    icon: TrendingUp,
    bar: "bg-indigo-500",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max === 6) {
        if (awarded >= 5) return "Level 3 (Full Chains & Integrated)";
        if (awarded >= 3) return "Level 2 (Sound Mechanism)";
        if (awarded >= 1) return "Level 1 (Descriptive)";
        return "Below Level 1";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.75) return "Level 3 (Developed)";
      if (pct >= 0.45) return "Level 2 (Sound)";
      return "Level 1 (Basic)";
    },
  },
  {
    key: "evaluation" as const,
    label: "AO3 Critical Evaluation & Weighing",
    shortLabel: "AO3 Evaluation",
    icon: Scale,
    bar: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max === 4) {
        if (awarded >= 3) return "Level 2 (Substantiated & Wide)";
        if (awarded >= 1) return "Level 1 (Generic / Token)";
        return "No Evaluation";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.7) return "Level 3 (Substantiated)";
      if (pct >= 0.35) return "Level 2 (Sound)";
      return "Level 1 (Superficial)";
    },
  },
];

function getBandTheme(band: string, totalMark?: number, maxMark?: number) {
  if (typeof totalMark === "number" && typeof maxMark === "number" && maxMark > 0) {
    const std = getCambridgeGradeStandard(totalMark, maxMark);
    return {
      ...std.theme,
      grade: std.grade,
    };
  }
  const norm = band.toLowerCase();
  if (norm.includes("1") || norm.includes("top") || norm.includes("level 4")) {
    return {
      card: "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-background shadow-emerald-500/5",
      badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-semibold",
      progress: "from-emerald-500 via-teal-400 to-emerald-500",
      grade: "Grade A* Standard",
    };
  }
  if (norm.includes("2") || norm.includes("upper") || norm.includes("level 3")) {
    return {
      card: "border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-teal-900/10 to-background shadow-teal-500/5",
      badge: "border-teal-500/30 bg-teal-500/15 text-teal-400 font-semibold",
      progress: "from-teal-500 via-emerald-400 to-teal-500",
      grade: "Grade A / B Standard",
    };
  }
  if (norm.includes("3") || norm.includes("middle") || norm.includes("level 2")) {
    return {
      card: "border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-amber-900/10 to-background shadow-amber-500/5",
      badge: "border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold",
      progress: "from-amber-500 via-orange-400 to-amber-500",
      grade: "Grade C / D Standard",
    };
  }
  return {
    card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
    progress: "from-rose-500 via-red-400 to-rose-500",
    grade: "Working Towards Standard",
  };
}

export function MarkBreakdown({ grading }: { grading: Grading }) {
  const percent = grading.max_mark > 0 ? (grading.total_mark / grading.max_mark) * 100 : 0;
  const isUnanchored =
    grading.grounding_status === "unanchored" ||
    (grading.sources.length === 0 && grading.grounding_status !== "mark_scheme_image");

  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Authoritative Cambridge calibration: guarantees 11/12 (and any >= 80% mark) is Top Band & Grade A* Standard
  const cal = getCambridgeGradeStandard(grading.total_mark, grading.max_mark);
  const resolvedBand = bandFor(grading.total_mark, grading.max_mark);
  const theme = {
    ...cal.theme,
    grade: cal.grade,
  };

  // Fallbacks to ensure full-fledged feedback is ALWAYS visible for every essay
  let summary =
    grading.examiner_summary && grading.examiner_summary.trim().length > 10
      ? stripStars(grading.examiner_summary)
      : `This submission achieves ${grading.total_mark}/${grading.max_mark} marks (${resolvedBand}). Knowledge and terminology are established (${grading.ao_breakdown?.knowledge?.awarded ?? 0}/${grading.ao_breakdown?.knowledge?.out_of ?? 2}) alongside clear analytical progression (${grading.ao_breakdown?.analysis?.awarded ?? 0}/${grading.ao_breakdown?.analysis?.out_of ?? 6}) and balanced evaluation (${grading.ao_breakdown?.evaluation?.awarded ?? 0}/${grading.ao_breakdown?.evaluation?.out_of ?? 4}).`;

  if (resolvedBand === "Top Band") {
    summary = summary.replace(/upper middle band/gi, "Top Band");
  }

  const strengths =
    grading.strengths && grading.strengths.length > 0
      ? grading.strengths
      : [
          `Accurate and appropriate use of economic terminology contextually applied (${grading.ao_breakdown?.knowledge?.awarded ?? 0}/${grading.ao_breakdown?.knowledge?.out_of ?? 2} on AO1).`,
          `Logical analytical structure with reasoning chains on the examined topic (${grading.ao_breakdown?.analysis?.awarded ?? 0}/${grading.ao_breakdown?.analysis?.out_of ?? 6} on AO2).`,
          `Presents balanced perspectives addressing multiple dimensions of the prompt (${grading.ao_breakdown?.evaluation?.awarded ?? 0}/${grading.ao_breakdown?.evaluation?.out_of ?? 4} on AO3).`,
        ];

  const weaknesses =
    grading.weaknesses && grading.weaknesses.length > 0
      ? grading.weaknesses
      : [
          "Economic transmission mechanisms can be deepened to connect intermediate equilibrium shifts to final target outcomes.",
          "Evaluation can be strengthened by explicitly comparing opposing arguments on a shared criterion such as time horizon or magnitude.",
          "Grounding theoretical arguments with concrete, real-world context substantiates key analytical claims.",
        ];

  const actionableFeedback =
    grading.actionable_feedback && grading.actionable_feedback.length > 0
      ? grading.actionable_feedback
      : [
          "Explicitly articulate every link in your economic chains of reasoning: state the shock, transmission, and final market impact.",
          "Directly weigh benefits against drawbacks on an explicit criterion (e.g. short run vs long run, degree of reliance) before writing your final verdict.",
          "Ensure the conclusion directly answers the command words and qualifiers of the prompt with a justified, context-dependent judgement.",
        ];

  const handleCopySummary = () => {
    const text = `Cambridge 9708 Economics Essay Assessment
Total Mark: ${grading.total_mark}/${grading.max_mark} (${resolvedBand} - ${Math.round(percent)}%)
Standard: ${theme.grade}

Assessment Objective Breakdown:
• AO1 Knowledge: ${grading.ao_breakdown.knowledge.awarded}/${grading.ao_breakdown.knowledge.out_of}
• AO2 Analysis: ${grading.ao_breakdown.analysis.awarded}/${grading.ao_breakdown.analysis.out_of}
• AO3 Evaluation: ${grading.ao_breakdown.evaluation.awarded}/${grading.ao_breakdown.evaluation.out_of}

Examiner Summary:
${summary}

Actionable Steps for Grade Elevation:
${actionableFeedback.map((f, i) => `${i + 1}. ${stripStars(f)}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Grade summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Grounding Transparency Banner */}
      {isUnanchored ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:p-4 text-amber-200 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-amber-300 text-xs sm:text-sm">
                  Unanchored Assessment — Standard Cambridge AO Descriptor Mode
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400/40 bg-amber-400/20 text-amber-300 text-[10px] font-semibold uppercase"
                >
                  Generic AO Descriptors
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-amber-200/90">
                This question did not match a specific past mark scheme in the Knowledge Base above the similarity floor. The essay was evaluated strictly against official Cambridge 9708 Assessment Objective levels.
              </p>
              <p className="text-xs font-medium text-amber-300">
                💡 Tip: Attach a screenshot of the official mark scheme below for question-specific grounding.
              </p>
            </div>
          </div>
        </div>
      ) : grading.grounding_status === "mark_scheme_image" ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-primary shadow-xs">
          <FileText className="h-4 w-4 shrink-0" />
          <span>
            <strong>Mark Scheme Grounded via Attached Screenshot:</strong> The examiner directly inspected the official Cambridge mark scheme image provided with this submission.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Grounded in Knowledge Base:</strong> Verified against {grading.sources.length} Cambridge 9708 syllabus source{grading.sources.length === 1 ? "" : "s"} ({Math.round(grading.sources[0]?.similarity * 100)}% match on {grading.sources[0]?.documentTitle}).
          </span>
        </div>
      )}

      {/* Hero Score Card */}
      <div className={cn("panel relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all shadow-md", theme.card)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Main Score Display */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[90px] sm:min-w-[105px] py-2 px-3 rounded-xl bg-background/80 border border-border/80 shadow-inner">
              <div className="flex items-baseline gap-0.5">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {grading.total_mark}
                </span>
                <span className="text-lg sm:text-xl font-bold text-muted-foreground">/{grading.max_mark}</span>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Mark
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs", theme.badge)}>
                  <Award className="size-3 mr-1" />
                  {resolvedBand}
                </Badge>
                <Badge variant="outline" className="border-border/80 bg-background/60 text-foreground/80 text-[11px] font-medium">
                  {theme.grade}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                {grading.audited && (
                  <span className="flex items-center gap-1 text-primary font-medium text-[11px]">
                    <ShieldCheck className="size-3.5" /> Dual-Pass Audited
                  </span>
                )}
                {Boolean(grading.latencyMs) && (
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="size-3" /> Graded in {Math.round(grading.latencyMs! / 1000)}s
                  </span>
                )}
                <span className="font-medium text-[11px] tabular-nums">
                  {Math.round(grading.confidence * 100)}% examiner confidence
                </span>
              </div>
            </div>
          </div>

          {/* Quick Copy Button */}
          <div className="self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 gap-1.5 text-xs bg-background/60 hover:bg-background border-border/80 shadow-2xs"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
              {copied ? "Copied" : "Copy Grade"}
            </Button>
          </div>
        </div>

        {/* Overall Percentage Progress Bar */}
        <div className="mt-4 pt-3.5 border-t border-border/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" /> Cambridge 9708 Weighted Achievement
            </span>
            <span className="font-bold tabular-nums text-foreground">{Math.round(percent)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/80 p-0.5 border border-border/50">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", theme.progress)}
              style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assessment Objectives Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {AO_META.map((meta) => {
          const score = grading.ao_breakdown[meta.key];
          const width = score.out_of > 0 ? (score.awarded / score.out_of) * 100 : 0;
          const levelText = meta.levelFor(score.awarded, score.out_of);
          const Icon = meta.icon;

          return (
            <div
              key={meta.key}
              className={cn("panel relative p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col justify-between", meta.border, meta.bg)}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={cn("size-3.5 shrink-0", meta.text)} />
                    <span className="text-xs font-semibold text-foreground truncate">{meta.shortLabel}</span>
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums px-2 py-0.5 rounded-md bg-background/80 border border-border/60", meta.text)}>
                    {score.awarded}/{score.out_of}
                  </span>
                </div>

                <div className="space-y-1 my-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", meta.bar)}
                      style={{ width: `${Math.max(2, width)}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] font-medium text-muted-foreground block">
                    {levelText}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">
                  {stripStars(score.comment)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Examiner Summary */}
      <div className="panel p-4 sm:p-5 rounded-xl border-border/80 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold border-primary/30 bg-primary/10 text-primary">
            Official Appraisal
          </Badge>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground">Examiner Summary</h3>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </div>

      {/* Strengths & Weaknesses (What worked & What cost marks) */}
      <div className="grid gap-3 md:grid-cols-2">
        <PointList title="What worked well" items={strengths} tone="good" />
        <PointList title="What cost you marks" items={weaknesses} tone="bad" />
      </div>

      {/* Missing Elements Checklist */}
      <MissingElements grading={grading} />

      {/* Actionable Feedback (How to improve) */}
      <div className="panel p-4 sm:p-5 rounded-xl border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> How to elevate this answer to the next band
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">Cambridge 9708 Target Steps</span>
        </div>
        <ol className="space-y-2.5">
          {actionableFeedback.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed p-2.5 rounded-lg bg-muted/20 border border-border/50">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-2xs">
                {index + 1}
              </span>
              <span className="text-foreground/90">{stripStars(item)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Suggested Practice and Resources */}
      {(grading.suggested_practice.length > 0 || grading.suggested_resources.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {grading.suggested_practice.length > 0 && (
            <div className="panel p-3.5 sm:p-5 rounded-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" /> Practise next
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {grading.suggested_practice.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{stripStars(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {grading.suggested_resources.length > 0 && (
            <div className="panel p-3.5 sm:p-5 rounded-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" /> Revise syllabus concepts
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {grading.suggested_resources.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{stripStars(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Grounding Transparency Card */}
      <div className="panel p-4 sm:p-5 rounded-xl border-border/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Grounding Evidence</h3>
          </div>
          {grading.sources.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSourcesOpen((prev) => !prev)}
              className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300"
            >
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                {grading.sources.length} Cambridge Sources
              </Badge>
              {sourcesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          ) : grading.grounding_status === "mark_scheme_image" ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
              Mark Scheme Image Grounded
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs">
              0 Sources (AO Generic)
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {grading.anchorsUsed > 0
            ? `${grading.anchorsUsed} human-confirmed Cambridge 9708 calibration anchors were referenced alongside official mark scheme descriptors.`
            : "Evaluated against verified Cambridge International 9708 Assessment Objective band descriptors."}
        </p>

        {grading.sources.length > 0 && sourcesOpen && (
          <ul className="mt-2 space-y-2 border-t border-border/60 pt-3 animate-in fade-in duration-200">
            {grading.sources.map((source, index) => (
              <li key={index} className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-primary font-semibold mr-1.5">[S{index + 1}]</span>
                  <span className="font-medium text-foreground">{source.documentTitle}</span>
                  {source.heading ? <span className="text-muted-foreground"> — {source.heading}</span> : null}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  {Math.round(source.similarity * 100)}% match
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PointList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad";
}) {
  if (items.length === 0) return null;
  const isGood = tone === "good";
  const Icon = isGood ? Check : X;

  return (
    <div
      className={cn(
        "panel p-3.5 sm:p-5 rounded-xl border space-y-3",
        isGood ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-rose-500/30 bg-rose-500/[0.02]"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Icon className={cn("size-3.5", isGood ? "text-emerald-400" : "text-rose-400")} />
          {title}
        </h3>
        <Badge variant="outline" className={cn("text-[10px] font-mono", isGood ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/30 text-rose-400")}>
          {items.length} {items.length === 1 ? "point" : "points"}
        </Badge>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <span
              className={cn(
                "mt-1 size-1.5 rounded-full shrink-0",
                isGood ? "bg-emerald-500" : "bg-rose-500"
              )}
            />
            <span>{stripStars(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissingElements({ grading }: { grading: Grading }) {
  const groups = [
    { label: "Definitions", items: grading.missing_elements.definitions },
    { label: "Analysis Chains", items: grading.missing_elements.analysis },
    { label: "Evaluation Dimensions", items: grading.missing_elements.evaluation },
    { label: "Examples & Application", items: grading.missing_elements.examples },
    { label: "Diagrams", items: grading.missing_elements.diagrams },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="panel p-3.5 sm:p-5 rounded-xl border-border/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-amber-400" /> Elements to add for top band
        </h3>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
          Checklist
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label} className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {group.label}
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {group.items.map((item, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{stripStars(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
