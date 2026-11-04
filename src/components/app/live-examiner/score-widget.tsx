import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "@/lib/examiner/config";
import type { ScoreEstimate, AoBreakdown } from "@/lib/live-examiner/types";
import { cn } from "@/lib/utils";

export type ScoreWidgetProps = {
  scoreEstimate: ScoreEstimate | null;
  wordCount: number;
  maxMark: number;
  checking?: boolean;
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
  checking = false,
  className,
}: ScoreWidgetProps) {
  const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
  const split = TARIFF_SPLITS[validTariff] || defaultSplitForMaxMark(validTariff);

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

  const band = scoreEstimate?.band || "No answer written yet";
  const targetInfo = WORD_TARGETS[validTariff] || { min: 200, target: 400, label: "~350 words" };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/90 p-5 shadow-lg backdrop-blur-md transition-all duration-200",
        className,
      )}
    >
      {/* Header & Big Score Display */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Live Predicted Mark
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground">
              Estimate
            </Badge>
            {checking && (
              <span className="size-2 animate-ping rounded-full bg-primary" title="AI verifying" />
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-black text-foreground">
              {total}
              <span className="text-xl font-normal text-muted-foreground"> / {validTariff}</span>
            </span>

            {deltaChip && (
              <Badge className="animate-in fade-in zoom-in-95 bg-emerald-500 text-white font-mono text-xs">
                {deltaChip}
              </Badge>
            )}
          </div>

          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{band}</p>
        </div>

        {/* Word Count Indicator */}
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-foreground">{wordCount} words</span>
          <p className="text-[11px] text-muted-foreground">{targetInfo.label}</p>
        </div>
      </div>

      {/* AO Breakdown Bars with Exact Cambridge Tariffs */}
      <div className="mt-5 space-y-3">
        {/* AO1 Knowledge */}
        <div>
          <div className="flex justify-between text-xs font-medium pb-1">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="size-2 rounded-full bg-[var(--ao1)]" />
              <span>AO1 Knowledge & Understanding</span>
            </span>
            <span className="font-mono text-muted-foreground font-semibold">
              {ao1} / {split.ao1_marks}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-[var(--ao1)] transition-all duration-300"
              style={{ width: `${Math.min(100, (ao1 / split.ao1_marks) * 100)}%` }}
            />
          </div>
        </div>

        {/* AO2 Analysis */}
        <div>
          <div className="flex justify-between text-xs font-medium pb-1">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="size-2 rounded-full bg-[var(--ao2)]" />
              <span>AO2 Analysis & Application</span>
            </span>
            <span className="font-mono text-muted-foreground font-semibold">
              {ao2} / {split.ao2_marks}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-[var(--ao2)] transition-all duration-300"
              style={{ width: `${Math.min(100, (ao2 / split.ao2_marks) * 100)}%` }}
            />
          </div>
        </div>

        {/* AO3 Evaluation */}
        <div>
          <div className="flex justify-between text-xs font-medium pb-1">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="size-2 rounded-full bg-[var(--ao3)]" />
              <span>AO3 Evaluation & Judgement</span>
            </span>
            <span className="font-mono text-muted-foreground font-semibold">
              {ao3} / {split.ao3_marks}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-[var(--ao3)] transition-all duration-300"
              style={{ width: `${Math.min(100, (ao3 / split.ao3_marks) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
