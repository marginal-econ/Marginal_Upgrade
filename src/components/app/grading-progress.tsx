import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Info, Loader2, RotateCw, Sparkles, Terminal, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProgressStage = {
  label: string;
  /** Roughly how long this stage takes relative to the others — weights, not seconds. */
  weight: number;
  shortTitle?: string;
  backendDetails?: string[];
};

const DEFAULT_STAGE_DETAILS: Record<number, { title: string; bullets: string[] }> = {
  0: {
    title: "Cambridge 9708 Knowledge Base & Vector Retrieval",
    bullets: [
      "Vector Embeddings: Executing cosine similarity search against official Cambridge mark schemes, coursebooks, and examiner reports in Supabase pgvector.",
      "Syllabus Grounding: Retrieving specific AS/A Level 9708 learning objectives and syllabus criteria corresponding to the essay prompt.",
      "Chief Examiner Benchmarks: Referencing common candidate pitfalls and grade threshold boundaries from past exam series.",
    ],
  },
  1: {
    title: "Assessment Objectives Analysis (AO1 Knowledge & AO2 Analysis)",
    bullets: [
      "AO1 (Knowledge & Understanding): Verifying accuracy of economic definitions, theoretical terms, and foundational principles.",
      "AO2 (Analysis): Tracing cause-and-effect transmission chains (e.g. monetary policy adjustments -> cost of borrowing -> consumption & investment -> AD shifts).",
      "Diagrammatical Alignment: Ensuring theoretical assertions match the shifts and equilibrium points represented in the essay.",
    ],
  },
  2: {
    title: "Evaluative Depth (AO3) & Policy Trade-offs",
    bullets: [
      "AO3 (Evaluation): Testing critical judgment, realism of underlying ceteris paribus assumptions, and short-run vs long-run distinctions.",
      "Stakeholder Impact: Evaluating divergent outcomes across consumers, producers, workers, and government finances.",
      "Synthesis: Checking whether conclusions directly address the prompt's command word ('Discuss', 'Evaluate', 'To what extent').",
    ],
  },
  3: {
    title: "Senior Examiner Moderation & Quality Benchmarks",
    bullets: [
      "Senior Examiner Verification: Calibrating level descriptors across Cambridge 9708 standards to eliminate grade clustering.",
      "Senior Examiner Moderation: Cross-verifying marks against Cambridge Assessment International Education rubric descriptors.",
      "Cambridge Grade Band Calibration: Harmonizing raw marks against historical 9708 Grade A*, A, B, C cut-offs.",
    ],
  },
  4: {
    title: "Diagnostic Examiner Report Synthesis",
    bullets: [
      "Line-by-Line Annotations: Attaching constructive examiner feedback tags directly to specific student sentences.",
      "Band Classification: Determining definitive marks across AO1, AO2, AO3, and overall tariff.",
      "Exemplar Model Rewrite: Synthesizing concrete upgrade suggestions showing how to elevate the essay to the next band.",
    ],
  },
};

const LIVE_BACKEND_OPERATIONS = [
  { atSec: 0, title: "Query Ingestion & Syllabus Expansion", detail: "Expanding question into Cambridge 9708 micro/macro syllabus keywords..." },
  { atSec: 3, title: "Knowledge Base Vector Search", detail: "Querying Supabase pgvector across official mark schemes, coursebooks, and syllabus..." },
  { atSec: 7, title: "Syllabus Grounding & Descriptors", detail: "Grounding evaluation against verified level descriptors and past exam benchmarks..." },
  { atSec: 11, title: "AO1 Theoretical Audit", detail: "Scrutinizing economic terminology, definitions, and foundational models..." },
  { atSec: 15, title: "AO2 Analytical Transmission Chains", detail: "Tracing cause-and-effect logic steps and diagrammatical equilibrium shifts..." },
  { atSec: 19, title: "AO3 Critical Evaluation Audit", detail: "Testing ceteris paribus assumptions, short-run vs long-run trade-offs, and elasticity..." },
  { atSec: 23, title: "Senior Examiner Calibration", detail: "Harmonizing raw marks against historical Cambridge 9708 grade boundaries..." },
  { atSec: 26, title: "Diagnostic Report Synthesis", detail: "Assembling final Cambridge examiner summary, missing elements, and band marks..." },
];

/**
 * Simulates staged progress calibrated to modern LLM completion speeds (~20–35s).
 * Holds at 96% until the network request completes so it is never prematurely "done".
 */
export function useStagedProgress(stages: ProgressStage[], active: boolean, totalMs = 30_000) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 120);
    return () => clearInterval(interval);
  }, [active]);

  const totalWeight = useMemo(() => stages.reduce((sum, s) => sum + s.weight, 0), [stages]);

  // Smooth quadratic ease-out curve calibrated to ~25-35s duration.
  const rawFraction = Math.min(1, elapsed / totalMs);
  const eased = 1 - Math.pow(1 - rawFraction, 2);
  const percent = Math.min(96, Math.round(eased * 96));

  let cursor = 0;
  let stageIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    cursor += stages[i]!.weight;
    if (percent < (cursor / totalWeight) * 96 || i === stages.length - 1) {
      stageIndex = i;
      break;
    }
  }

  const elapsedSeconds = Math.floor(elapsed / 1000);

  return { percent, stageIndex, elapsedSeconds };
}

export function GradingProgress({
  stages,
  active,
  totalMs = 30_000,
}: {
  stages: ProgressStage[];
  active: boolean;
  totalMs?: number;
}) {
  const { percent, stageIndex, elapsedSeconds } = useStagedProgress(stages, active, totalMs);
  const [inspectedStageIndex, setInspectedStageIndex] = useState<number | null>(null);

  if (!active) return null;

  const currentInspectorIndex = inspectedStageIndex ?? stageIndex;
  const currentInspectorStage = stages[currentInspectorIndex];
  const inspectorDetails = currentInspectorStage?.backendDetails
    ? {
        title: currentInspectorStage.shortTitle || currentInspectorStage.label,
        bullets: currentInspectorStage.backendDetails,
      }
    : DEFAULT_STAGE_DETAILS[currentInspectorIndex] ?? {
        title: currentInspectorStage?.label || "Backend Processing",
        bullets: [
          "Processing Cambridge 9708 evaluation pipeline.",
          "Grounding student response with verified mark scheme criteria.",
          "Synthesizing structured examiner feedback and band marks.",
        ],
      };

  // Find the active live backend operation based on elapsed seconds
  const activeLiveOpIndex = LIVE_BACKEND_OPERATIONS.reduce((acc, op, idx) => {
    return elapsedSeconds >= op.atSec ? idx : acc;
  }, 0);
  const currentLiveOp = LIVE_BACKEND_OPERATIONS[activeLiveOpIndex]!;

  return (
    <div className="panel relative overflow-hidden space-y-4 p-5 sm:p-6 border-primary/20 shadow-md">
      {/* Top Status & Timer Row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground truncate">
            {stages[stageIndex]?.label ?? "Referring knowledge base & evaluating…"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Clock className="size-3 text-primary shrink-0" />
            <span>Est: 20–35s</span>
          </span>

          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
            {percent}%
          </span>
          <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums font-mono">
            {elapsedSeconds}s elapsed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground px-0.5">
          <span>Stage {stageIndex + 1} of {stages.length} in progress</span>
          <span>Click any stage below to inspect evaluation criteria</span>
        </div>
      </div>

      {/* Real-time Dynamic Backend Operations Stream */}
      <div className="rounded-xl border border-primary/20 bg-muted/30 p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="size-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground text-xs">Cambridge Examination Engine</span>
          </div>
          <span className="text-[10px] text-emerald-500 font-mono font-medium flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Marking
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-start gap-2">
            <Loader2 className="size-3.5 text-primary shrink-0 animate-spin mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground text-xs">{currentLiveOp.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">{currentLiveOp.detail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Extended evaluation notice */}
      {elapsedSeconds >= 45 && (
        <div className="flex items-center gap-2 text-[11.5px] text-primary font-medium bg-primary/10 border border-primary/20 rounded-md px-3 py-2 animate-in fade-in duration-300">
          <RotateCw className="size-3.5 shrink-0 animate-spin" />
          <span>Thorough Assessment In Progress: Examiner completing comprehensive line-by-line mark breakdown and exemplar rewrite...</span>
        </div>
      )}

      {/* Interactive Stage Grid */}
      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        {stages.map((stage, index) => {
          const isInspected = currentInspectorIndex === index;
          const isDone = index < stageIndex;
          const isCurrent = index === stageIndex;

          return (
            <button
              key={stage.label}
              type="button"
              onClick={() => setInspectedStageIndex(index)}
              className={cn(
                "group flex items-center justify-between gap-2.5 rounded-lg border p-2.5 text-xs text-left transition-all duration-200 cursor-pointer select-none",
                isInspected
                  ? "ring-2 ring-primary/40 border-primary bg-primary/[0.08] shadow-sm"
                  : isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 text-foreground hover:border-emerald-500/60"
                    : isCurrent
                      ? "border-primary/40 bg-primary/5 text-foreground font-medium shadow-sm hover:border-primary"
                      : "border-border/60 bg-muted/20 text-muted-foreground opacity-70 hover:opacity-100 hover:border-border",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isDone ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border/80" />
                )}
                <span className="truncate">{stage.label}</span>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/80 group-hover:text-primary transition-colors">
                {isInspected ? "Active View" : "Click to view"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Backend Explanation Panel */}
      {inspectorDetails && (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="size-3.5 text-primary shrink-0" />
              <h4 className="text-xs font-bold text-foreground truncate">
                Backend Operations: {inspectorDetails.title}
              </h4>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              currentInspectorIndex < stageIndex
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : currentInspectorIndex === stageIndex
                  ? "bg-primary/10 text-primary border-primary/30 animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
            )}>
              {currentInspectorIndex < stageIndex
                ? "Completed in Backend"
                : currentInspectorIndex === stageIndex
                  ? "Running Now"
                  : "Queued in Pipeline"}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {inspectorDetails.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grounding & Fast Execution Guarantee Footer */}
      <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
        <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-xs">
            Cambridge 9708 Senior Examiner Grounding Guarantee
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Estimated completion time: <strong>40–80 seconds</strong> (max 100 seconds). High-throughput evaluation performs vector retrieval across syllabus materials, verifies diagrams, and completes dual-pass moderation.
          </p>
        </div>
      </div>
    </div>
  );
}

