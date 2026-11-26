import { CheckCircle2, Circle, Cpu, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuestionRubricBlueprint } from "@/lib/live-examiner/delta-engine";
import { cn } from "@/lib/utils";

export function RubricChecklist({
  blueprint,
  hits,
  tokenStats,
  className,
}: {
  blueprint: QuestionRubricBlueprint | null;
  hits: { ao1: number[]; ao2: number[]; ao3: number[] };
  tokenStats?: { totalTokens: number; aiCalls: number; tokenBudget: number };
  className?: string;
}) {
  if (!blueprint) return null;

  const ao1Set = new Set(hits.ao1 || []);
  const ao2Set = new Set(hits.ao2 || []);
  const ao3Set = new Set(hits.ao3 || []);

  const totalItems =
    blueprint.keyTerms.length +
    blueprint.analysisMechanisms.length +
    blueprint.evaluationAngles.length;
  const hitCount =
    blueprint.keyTerms.filter((_, i) => ao1Set.has(i)).length +
    blueprint.analysisMechanisms.filter((_, i) => ao2Set.has(i)).length +
    blueprint.evaluationAngles.filter((_, i) => ao3Set.has(i)).length;

  const pct = totalItems > 0 ? Math.round((hitCount / totalItems) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm backdrop-blur-md space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Target className="size-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Mark-Scheme Checklist
          </span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          {hitCount}/{totalItems} ({pct}%)
        </Badge>
      </div>

      <div className="space-y-2.5 text-[11px]">
        {blueprint.keyTerms.length > 0 && (
          <ChecklistGroup
            label={`AO1 Knowledge (${blueprint.split.ao1_marks}m)`}
            tone="text-ao1"
            items={blueprint.keyTerms}
            hitSet={ao1Set}
          />
        )}

        {blueprint.analysisMechanisms.length > 0 && (
          <ChecklistGroup
            label={`AO2 Analysis (${blueprint.split.ao2_marks}m)`}
            tone="text-ao2"
            items={blueprint.analysisMechanisms}
            hitSet={ao2Set}
          />
        )}

        {blueprint.requiresEvaluation && blueprint.evaluationAngles.length > 0 && (
          <ChecklistGroup
            label={`AO3 Evaluation (${blueprint.split.ao3_marks}m)`}
            tone="text-ao3"
            items={blueprint.evaluationAngles}
            hitSet={ao3Set}
          />
        )}
      </div>

      {tokenStats && tokenStats.aiCalls > 0 ? (
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Cpu className="size-3 text-emerald-500" /> Delta Engine
          </span>
          <span className="font-mono">
            {(tokenStats.totalTokens / 1000).toFixed(1)}k / {(tokenStats.tokenBudget / 1000).toFixed(0)}k tok ·{" "}
            {tokenStats.aiCalls} {tokenStats.aiCalls === 1 ? "check" : "checks"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistGroup({
  label,
  tone,
  items,
  hitSet,
}: {
  label: string;
  tone: string;
  items: string[];
  hitSet: Set<number>;
}) {
  return (
    <div className="space-y-1">
      <p className={cn("text-[10px] font-bold uppercase tracking-wider", tone)}>{label}</p>
      <ul className="space-y-1">
        {items.map((item, idx) => {
          const done = hitSet.has(idx);
          return (
            <li
              key={`${label}-${idx}`}
              className={cn(
                "flex items-start gap-1.5 leading-snug",
                done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 size-3.5 shrink-0 opacity-40" />
              )}
              <span className={cn(done && "font-medium")}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
