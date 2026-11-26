import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "@/lib/examiner/config";
import type { ScoreEstimate } from "@/lib/live-examiner/types";
import { stripStars } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

export type ScoreWidgetProps = {
  scoreEstimate: ScoreEstimate | null;
  wordCount: number;
  maxMark: number;
  question?: string;
  checking?: boolean;
  status?: "provisional" | "verified" | "uncertain" | "complete";
  markRange?: [number, number];
  className?: string;
};

const WORD_TARGETS: Record<number, { min: number; target: number; label: string }> = {
  8: { min: 150, target: 250, label: "~200-300 words" },
  12: { min: 250, target: 450, label: "~400-550 words" },
  20: { min: 500, target: 800, label: "~750-1000 words" },
};

export function ScoreWidget({
  scoreEstimate,
  wordCount,
  maxMark,
  question,
  checking = false,
  status = "provisional",
  markRange,
  className,
}: ScoreWidgetProps) {
  const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
  const split = defaultSplitForMaxMark(validTariff, undefined, question);

  const [deltaChip, setDeltaChip] = useState<string | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  // Smooth delta animation
  useEffect(() => {
    if (!scoreEstimate) return;
    if (prevScore !== null && scoreEstimate.total > prevScore) {
      const diff = scoreEstimate.total - prevScore;
      setDeltaChip(`+${diff} mark${diff > 1 ? "s" : ""}`);
      const t = setTimeout(() => setDeltaChip(null), 2500);
      return () => clearTimeout(t);
    }
    setPrevScore(scoreEstimate.total);
  }, [scoreEstimate?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = scoreEstimate ? Math.min(validTariff, Math.max(0, scoreEstimate.total)) : 0;
  const ao1 = scoreEstimate ? Math.min(split.ao1_marks, Math.max(0, scoreEstimate.aoBreakdown.ao1)) : 0;
  const ao2 = scoreEstimate ? Math.min(split.ao2_marks, Math.max(0, scoreEstimate.aoBreakdown.ao2)) : 0;
  const ao3 = scoreEstimate ? Math.min(split.ao3_marks, Math.max(0, scoreEstimate.aoBreakdown.ao3)) : 0;

  const band = stripStars(scoreEstimate?.band || "No answer written yet");
  const targetInfo = WORD_TARGETS[validTariff] || { min: 200, target: 400, label: "~350 words" };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/95 p-4 shadow-md backdrop-blur-md transition-all duration-200",
        className,
      )}
    >
      {/* Header row: Title + Status Badge + Word Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Running Mark
          </span>
          {status === "verified" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1 px-1.5 py-0 h-5 shrink-0">
              <CheckCircle2 className="size-2.5" /> Verified
            </Badge>
          ) : status === "uncertain" ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-semibold gap-1 px-1.5 py-0 h-5 shrink-0">
              <HelpCircle className="size-2.5" /> Draft
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1 px-1.5 py-0 h-5 shrink-0">
              <Clock className="size-2.5" /> Live
            </Badge>
          )}
          {checking && (
            <span className="size-2 animate-ping rounded-full bg-primary shrink-0" title="AI verifying in background" />
          )}
        </div>

        <div className="text-right shrink-0 whitespace-nowrap">
          <span className="text-xs font-semibold text-foreground font-mono">
            {wordCount} <span className="text-[10px] font-normal text-muted-foreground">words</span>
          </span>
        </div>
      </div>

      {/* Big Score Row — strictly single-line, zero wrapping */}
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-mono text-4xl font-black tracking-tight text-foreground tabular-nums">
            {total}
            <span className="text-xl font-medium text-muted-foreground">/{validTariff}</span>
          </span>

          {deltaChip && (
            <Badge className="animate-in fade-in zoom-in-95 bg-emerald-500 text-white font-mono text-[11px] px-1.5 py-0">
              {deltaChip}
            </Badge>
          )}
        </div>

        <div className="flex flex-col items-end text-right shrink-0 whitespace-nowrap">
          {markRange && markRange[0] !== markRange[1] ? (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Range {markRange[0]}–{markRange[1]}
            </span>
          ) : null}
          <span className="mt-0.5 text-[10px] text-muted-foreground/80">{targetInfo.label}</span>
        </div>
      </div>

      <p className="mt-1.5 text-xs font-medium leading-snug text-muted-foreground">{band}</p>

      {/* AO Breakdown Meters — exact color match to editor AO1/AO2/AO3 highlights */}
      <div className="mt-4 space-y-2.5">
        {/* AO1 Knowledge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-[var(--ao1)]">
              <span className="size-2 rounded-full bg-[var(--ao1)]" />
              AO1 Knowledge &amp; Definitions
            </span>
            <span className="font-mono text-foreground tabular-nums">
              {ao1}/{split.ao1_marks}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ao1)]/15">
            <div
              className="h-full rounded-full bg-[var(--ao1)] transition-all duration-500 ease-out"
              style={{ width: `${split.ao1_marks > 0 ? Math.min(100, (ao1 / split.ao1_marks) * 100) : 100}%` }}
            />
          </div>
        </div>

        {/* AO2 Analysis */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-[var(--ao2)]">
              <span className="size-2 rounded-full bg-[var(--ao2)]" />
              AO2 Causal Analysis &amp; Application
            </span>
            <span className="font-mono text-foreground tabular-nums">
              {ao2}/{split.ao2_marks}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ao2)]/15">
            <div
              className="h-full rounded-full bg-[var(--ao2)] transition-all duration-500 ease-out"
              style={{ width: `${split.ao2_marks > 0 ? Math.min(100, (ao2 / split.ao2_marks) * 100) : 100}%` }}
            />
          </div>
        </div>

        {/* AO3 Evaluation */}
        {split.ao3_marks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--ao3)]">
                <span className="size-2 rounded-full bg-[var(--ao3)]" />
                AO3 Evaluation &amp; Judgement
              </span>
              <span className="font-mono text-foreground tabular-nums">
                {ao3}/{split.ao3_marks}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ao3)]/15">
              <div
                className="h-full rounded-full bg-[var(--ao3)] transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (ao3 / split.ao3_marks) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Instant 1-line Examiner Next Move (visible without switching tabs) */}
      {scoreEstimate?.nextMoves && scoreEstimate.nextMoves.length > 0 && total < validTariff ? (
        <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-snug">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <span className="font-semibold text-foreground">Next move: </span>
            <span className="text-muted-foreground">
              {stripStars(scoreEstimate.nextMoves[0]!.title)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
