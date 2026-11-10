import { ArrowRight, Lightbulb, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NextMove } from "@/lib/live-examiner/types";
import { stripStars } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

export type NextMarksProps = {
  nextMoves: NextMove[];
  onSelectMove?: (move: NextMove) => void;
  onOpenMaximizer?: () => void;
  maximizerLoading?: boolean;
  className?: string;
};

const AO_THEME = {
  ao1: {
    badge: "border-ao1/40 bg-ao1/15 text-ao1",
    label: "AO1 Knowledge",
  },
  ao2: {
    badge: "border-ao2/40 bg-ao2/15 text-ao2",
    label: "AO2 Analysis",
  },
  ao3: {
    badge: "border-ao3/40 bg-ao3/15 text-ao3",
    label: "AO3 Evaluation",
  },
  no_credit: {
    badge: "border-muted-foreground/40 bg-muted/20 text-muted-foreground",
    label: "Relevance",
  },
};

export function NextMarks({
  nextMoves,
  onSelectMove,
  onOpenMaximizer,
  maximizerLoading,
  className,
}: NextMarksProps) {
  if (nextMoves.length === 0) return null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Your Next Mark Moves
        </h3>
      </div>

      <div className="space-y-2">
        {nextMoves.map((move) => {
          const theme = AO_THEME[move.aoTarget] || AO_THEME.ao1;

          return (
            <div
              key={move.id}
              onClick={() => onSelectMove?.(move)}
              className={cn(
                "group relative cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-primary/50 hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0.5", theme.badge)}>
                    {theme.label}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {stripStars(move.title)}
                  </span>
                </div>

                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border-emerald-500/30">
                  +{move.potentialGain} Mark
                </Badge>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {stripStars(move.detail)}
              </p>
            </div>
          );
        })}
      </div>

      {onOpenMaximizer ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenMaximizer}
          disabled={maximizerLoading}
          className="w-full h-8 gap-1.5 text-xs font-semibold border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
        >
          {maximizerLoading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Generating Blueprint…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 text-amber-500" /> Maximise Score Blueprint
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}
