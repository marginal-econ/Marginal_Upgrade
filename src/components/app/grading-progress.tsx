import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProgressStage = {
  label: string;
  /** Roughly how long this stage takes relative to the others — weights, not seconds. */
  weight: number;
};

/**
 * There is no server-sent progress channel for grading (it's a single
 * request/response server function), so this simulates progress against
 * expected stage durations rather than pretending to report real ticks from
 * the model. It never claims 100% until the request actually resolves —
 * it eases up to 96% and holds there so it's never dishonest about being
 * "done" while still waiting on the network.
 */
export function useStagedProgress(stages: ProgressStage[], active: boolean, totalMs = 26_000) {
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

  // Ease-out curve so the bar moves fast at first (feels responsive) and
  // slows near the cap, since real latency varies request to request.
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

  return { percent, stageIndex, elapsedSeconds: Math.floor(elapsed / 1000) };
}

export function GradingProgress({
  stages,
  active,
  totalMs,
}: {
  stages: ProgressStage[];
  active: boolean;
  totalMs?: number;
}) {
  const { percent, stageIndex, elapsedSeconds } = useStagedProgress(stages, active, totalMs);
  if (!active) return null;

  return (
    <div className="panel space-y-4 p-6">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="size-4 animate-spin text-primary" />
          {stages[stageIndex]?.label ?? "Working…"}
        </span>
        <span className="tabular-nums text-xs text-muted-foreground">{elapsedSeconds}s</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="space-y-1.5">
        {stages.map((stage, index) => (
          <li key={stage.label} className="flex items-center gap-2 text-xs">
            {index < stageIndex ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            ) : index === stageIndex ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <span className="size-3.5 shrink-0 rounded-full border border-border" />
            )}
            <span
              className={cn(
                index <= stageIndex ? "text-foreground" : "text-muted-foreground",
                index === stageIndex && "font-medium",
              )}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
