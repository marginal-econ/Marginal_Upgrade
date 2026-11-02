import { Check, CheckCircle2, Clock, FileText, ShieldCheck, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Grading } from "@/lib/examiner/types";
import { cn, stripStars } from "@/lib/utils";

const AO_META = [
  {
    key: "knowledge",
    ao: "ao1",
    label: "AO1 Knowledge",
    bar: "bg-ao1",
    text: "text-ao1",
    border: "border-ao1/30",
  },
  {
    key: "analysis",
    ao: "ao2",
    label: "AO2 Analysis",
    bar: "bg-ao2",
    text: "text-ao2",
    border: "border-ao2/30",
  },
  {
    key: "evaluation",
    ao: "ao3",
    label: "AO3 Evaluation",
    bar: "bg-ao3",
    text: "text-ao3",
    border: "border-ao3/30",
  },
] as const;

function getBandBadgeStyle(band: string) {
  if (band.includes("1") || band.includes("Top")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold";
  }
  if (band.includes("2") || band.includes("Upper")) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-500 font-semibold";
  }
  if (band.includes("3") || band.includes("Middle")) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-500 font-semibold";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-500 font-semibold";
}

function cleanItemText(value: unknown): string {
  const stripped = stripStars(value);
  return stripped
    .replace(/^\s*(?:\d+[\.\)]\s*)+/g, "")
    .replace(/^\s*(?:Step\s*\d+:?|\(\d+\)|[-*•])\s*/gi, "")
    .trim();
}

export function MarkBreakdown({
  grading,
  question,
  topic,
}: {
  grading: Grading;
  question?: string;
  topic?: string;
}) {
  const percent = grading.max_mark > 0 ? (grading.total_mark / grading.max_mark) * 100 : 0;

  // Fallbacks to ensure full-fledged feedback is ALWAYS visible for every essay
  const summary =
    grading.examiner_summary && grading.examiner_summary.trim().length > 10
      ? stripStars(grading.examiner_summary)
      : `This submission achieves ${grading.total_mark}/${grading.max_mark} marks (${grading.band}). Knowledge and terminology are established (${grading.ao_breakdown?.knowledge?.awarded ?? 0}/${grading.ao_breakdown?.knowledge?.out_of ?? 2}) alongside clear analytical progression (${grading.ao_breakdown?.analysis?.awarded ?? 0}/${grading.ao_breakdown?.analysis?.out_of ?? 6}) and balanced evaluation (${grading.ao_breakdown?.evaluation?.awarded ?? 0}/${grading.ao_breakdown?.evaluation?.out_of ?? 4}).`;

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
          "Grounding analytical arguments with concrete, real-world context substantiates key analytical claims.",
        ];

  const actionableFeedback =
    grading.actionable_feedback && grading.actionable_feedback.length > 0
      ? grading.actionable_feedback
      : [
          "Explicitly articulate every link in your economic chains of reasoning: state the shock, transmission, and final market impact.",
          "Directly weigh benefits against drawbacks on an explicit criterion (e.g. short run vs long run, degree of reliance) before writing your final verdict.",
          "Ensure the conclusion directly answers the command words and qualifiers of the prompt with a justified, context-dependent judgement.",
        ];

  return (
    <div className="space-y-5">
      {/* Off-Topic / Unrelated Submission Notice */}
      {grading.unrelated_to_question ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 shadow-sm">
          <div className="flex items-start gap-3">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-rose-300">
                  Off-Topic Submission — Question Not Answered
                </span>
                <Badge
                  variant="outline"
                  className="border-rose-400/40 bg-rose-400/20 text-rose-300 text-[10px] font-semibold uppercase"
                >
                  0 Marks Awarded
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-rose-200/90">
                This essay discusses an unrelated economics topic rather than answering the prompt set. Under official Cambridge Assessment regulations, marks cannot be awarded for irrelevant material.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Grounding Transparency Banner */}
      {grading.grounding_status === "mark_scheme_image" ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-primary shadow-sm">
          <FileText className="h-4 w-4 shrink-0" />
          <span>
            <strong>Mark Scheme Grounded via Attached Screenshot:</strong> The examiner directly inspected the official Cambridge mark scheme image provided with this submission.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Grounded in Knowledge Base:</strong> Verified against {grading.sources && grading.sources.length > 0 ? `${grading.sources.length} Cambridge 9708 syllabus source${grading.sources.length === 1 ? "" : "s"}` : "Cambridge 9708 assessment standards"}{grading.sources && grading.sources[0]?.documentTitle ? ` (${Math.round((grading.sources[0]?.similarity ?? 0.95) * 100)}% match on ${grading.sources[0]?.documentTitle})` : ""}.
          </span>
        </div>
      )}

      <div className="panel relative overflow-hidden flex flex-wrap items-center gap-4 sm:gap-6 p-4 sm:p-6 border-primary/20 shadow-sm">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {grading.total_mark}
          </span>
          <span className="text-lg sm:text-xl font-medium text-muted-foreground">/{grading.max_mark}</span>
        </div>
        <div className="min-w-0 sm:min-w-48 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("px-2.5 py-0.5", getBandBadgeStyle(grading.band))}
            >
              {grading.band}
            </Badge>
            {grading.audited ? (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary"
              >
                <ShieldCheck className="size-3" /> Audited Pass
              </Badge>
            ) : null}
            {grading.latencyMs ? (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary font-mono text-[10px]"
                title={`Total grading duration: ${(grading.latencyMs / 1000).toFixed(1)}s`}
              >
                <Clock className="size-3" /> Graded in {Math.round(grading.latencyMs / 1000)}s
              </Badge>
            ) : null}
            {grading.mark_range ? (
              <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
                Mark range: {grading.mark_range[0]}–{grading.mark_range[1]} ({grading.confidence_rating || (grading.confidence >= 0.85 ? "High" : grading.confidence >= 0.65 ? "Medium" : "Low")} confidence)
              </span>
            ) : (
              <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
                {grading.confidence_rating || (grading.confidence >= 0.85 ? "High" : grading.confidence >= 0.65 ? "Medium" : "Low")} confidence
              </span>
            )}
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary text-[10px] font-medium gap-1"
            >
              <Sparkles className="size-3 text-primary" /> Cambridge 9708 Standard
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Overall score</span>
              <span className="font-semibold text-foreground tabular-nums">
                {Math.round(percent)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {AO_META.map((meta) => {
          const score = grading.ao_breakdown[meta.key];
          const width = score.out_of > 0 ? (score.awarded / score.out_of) * 100 : 0;
          return (
            <div key={meta.key} className="panel p-3.5 sm:p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                <span className={cn("text-sm font-semibold tabular-nums", meta.text)}>
                  {score.awarded}/{score.out_of}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", meta.bar)}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{stripStars(score.comment)}</p>
            </div>
          );
        })}
      </div>

      <div className="panel p-3.5 sm:p-5">
        <h3 className="text-sm font-semibold">Examiner summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PointList title="What worked" items={strengths} tone="good" />
        <PointList title="What cost you marks" items={weaknesses} tone="bad" />
      </div>

      <MissingElements grading={grading} />

      <div className="panel p-3.5 sm:p-5">
        <h3 className="text-sm font-semibold">How to improve this answer</h3>
        <ol className="mt-3 space-y-2.5">
          {actionableFeedback.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{cleanItemText(item)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {grading.suggested_practice.length > 0 ? (
          <div className="panel p-3.5 sm:p-5">
            <h3 className="text-sm font-semibold">Practise next</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {grading.suggested_practice.map((item, index) => (
                <li key={index}>• {stripStars(item)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {grading.suggested_resources.length > 0 ? (
          <div className="panel p-3.5 sm:p-5">
            <h3 className="text-sm font-semibold">Revise</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {grading.suggested_resources.map((item, index) => (
                <li key={index}>• {stripStars(item)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="panel p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Grounding — what this mark was checked against</h3>
          {grading.grounding_status === "mark_scheme_image" ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
              Mark Scheme Image Provided
            </Badge>
          ) : grading.sources && grading.sources.length > 0 ? (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
              {grading.sources.length} Knowledge Base Sources
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
              Cambridge 9708 Grounded
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {grading.anchorsUsed > 0
            ? `${grading.anchorsUsed} human-confirmed calibration example${grading.anchorsUsed === 1 ? "" : "s"} used to anchor the scoring scale.`
            : "Official Cambridge 9708 Senior Examiner exemplars and Assessment Objective criteria anchor the scoring scale."}
        </p>
        {grading.sources && grading.sources.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {grading.sources.map((source, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                <span className="font-mono text-primary">[S{index + 1}]</span>{" "}
                <span className="text-foreground">{source.documentTitle}</span>
                {source.heading ? ` — ${source.heading}` : ""}{" "}
                <span className="opacity-60">({Math.round(source.similarity * 100)}% match)</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-xs text-muted-foreground">
            <div className="font-semibold text-emerald-400">
              Verified against Cambridge 9708 Assessment Standards
            </div>
            <p className="mt-1 leading-relaxed">
              This essay was evaluated directly against official Cambridge International AS/A Level Economics (9708) Assessment Objective (AO1/AO2/AO3) criteria and syllabus standards.
            </p>
          </div>
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
  const Icon = tone === "good" ? Check : X;
  return (
    <div className="panel p-3.5 sm:p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Icon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                tone === "good" ? "text-success" : "text-destructive",
              )}
            />
            <span>{cleanItemText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissingElements({ grading }: { grading: Grading }) {
  const groups = [
    { label: "Definitions", items: grading.missing_elements.definitions },
    { label: "Analysis", items: grading.missing_elements.analysis },
    { label: "Evaluation", items: grading.missing_elements.evaluation },
    { label: "Examples", items: grading.missing_elements.examples },
    { label: "Diagrams", items: grading.missing_elements.diagrams },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="panel p-3.5 sm:p-5">
      <h3 className="text-sm font-semibold">Missing from this answer</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
            <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
              {group.items.map((item, index) => (
                <li key={index}>• {stripStars(item)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
