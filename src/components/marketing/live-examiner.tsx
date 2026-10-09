/**
 * Compact, Non-Overflowing Cambridge 9708 Live Examiner Showcase for the Hero.
 *
 * Types a concise, authentic Paper 2 Aggregate Demand answer while the
 * examiner marks in real time: each clause is washed in its assessment-objective
 * color (AO1, AO2, AO3), the examiner margin note updates dynamically, and the
 * running mark climbs to 8/12.
 *
 * Perfectly proportioned to sit beside the hero waitlist form with zero overflow.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, CheckCircle2, Pause, Play, Radio, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Ao = "AO1" | "AO2" | "AO3";

const AO_META: Record<Ao, { name: string; tint: string; ink: string; dot: string; text: string }> = {
  AO1: { name: "Knowledge", tint: "var(--ao1)", ink: "var(--ao1)", dot: "bg-ao1", text: "text-ao1" },
  AO2: { name: "Analysis", tint: "var(--ao2)", ink: "var(--ao2)", dot: "bg-ao2", text: "text-ao2" },
  AO3: { name: "Evaluation", tint: "var(--ao3)", ink: "var(--ao3)", dot: "bg-ao3", text: "text-ao3" },
};

export type Clause = { text: string; ao: Ao; note: string; points: number };

const CLAUSES: Clause[] = [
  {
    text: "Aggregate demand equals C + I + G + NX. AD shifts outward from expansionary monetary or fiscal policies. ",
    ao: "AO1",
    note: "AO1 credited: AD formula components & macroeconomic levers defined accurately.",
    points: 3,
  },
  {
    text: "Increased aggregate demand can cause demand-pull inflation. ",
    ao: "AO1",
    note: "Terminology recognized: demand-pull inflation correctly applied.",
    points: 1,
  },
  {
    text: "Higher AD incentivises suppliers to raise production due to profit motive, increasing real GDP and creating jobs. ",
    ao: "AO2",
    note: "AO2 credited: valid transmission chain from consumer spending to GDP growth.",
    points: 2,
  },
  {
    text: "However, if the economy operates at maximum capacity, higher AD only leads to higher prices, and fiscal spending risks budget deficits.",
    ao: "AO3",
    note: "AO3 credited: critical capacity bottleneck and fiscal deficit constraint evaluated.",
    points: 2,
  },
];

const TOTAL = 12;
const TARGET_MARK = 8;
const TYPE_SPEED = 24; // ms per character
const HOLD = 3600; // ms held at completion before gentle loop

export function LiveExaminer({ className }: { className?: string }) {
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);

  const fullText = useMemo(() => CLAUSES.map((c) => c.text).join(""), []);
  const fullLength = fullText.length;

  // Reduced motion: show full text immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setTyped(fullLength);
    }
  }, [fullLength]);

  // Autotyping loop
  useEffect(() => {
    if (still || !playing) return;
    if (typed < fullLength) {
      const timer = window.setTimeout(() => setTyped((n) => n + 1), TYPE_SPEED);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setTyped(0), HOLD);
    return () => window.clearTimeout(timer);
  }, [typed, fullLength, playing, still]);

  // Compute rendered clauses
  let cursor = 0;
  const rendered = CLAUSES.map((clause, index) => {
    const start = cursor;
    cursor += clause.text.length;
    return {
      clause,
      index,
      visible: Math.max(0, Math.min(clause.text.length, typed - start)),
      marked: typed >= cursor,
    };
  });

  const done = typed >= fullLength;
  const activeNote = [...rendered].reverse().find((row) => row.marked)?.clause.note;
  const markedClauses = rendered.filter((row) => row.marked);

  // Running mark calculation (smoothly reaches 8/12)
  const currentMark = Math.min(
    TARGET_MARK,
    markedClauses.reduce((acc, row) => acc + row.clause.points, 0)
  );

  // AO Breakdown progress
  const aoStats = (Object.keys(AO_META) as Ao[]).map((ao) => {
    const all = CLAUSES.filter((c) => c.ao === ao).length;
    const hit = rendered.filter((row) => row.marked && row.clause.ao === ao).length;
    const maxMarks = ao === "AO1" ? 3 : ao === "AO2" ? 5 : 4;
    const awardedMarks = ao === "AO1" ? Math.min(3, hit * 2) : ao === "AO2" ? (hit > 0 ? 3 : 0) : (hit > 0 ? 2 : 0);
    return {
      ao,
      pct: all === 0 ? 0 : Math.round((hit / all) * 100),
      awarded: awardedMarks,
      max: maxMarks,
    };
  });

  const handleRestart = useCallback(() => {
    setTyped(0);
    setPlaying(true);
  }, []);

  return (
    <div
      className={cn(
        "examiner-card pop examiner-float overflow-hidden rounded-2xl border-2 border-primary/25 bg-card shadow-2xl text-foreground flex flex-col justify-between max-w-lg mx-auto",
        className
      )}
    >
      {/* ── Chrome Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            {!done ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            ) : null}
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <span className="text-xs font-bold tracking-tight text-foreground font-mono flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" /> LIVE EXAMINER
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-primary">
            9708 ENGINE
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="font-mono text-[9.5px] border-primary/30 bg-primary/5 text-primary py-0"
          >
            Tariff: [12 Marks]
          </Badge>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={playing ? "Pause animation" : "Resume animation"}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Restart calibration"
            aria-label="Restart"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>

      {/* ── Question Bar ─────────────────────────────────────────────── */}
      <div className="border-b border-border/70 bg-background/90 px-4 py-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-semibold">
          <span>Question 1 · AS Paper 2</span>
          <span className="text-primary font-bold">Continuous Prose</span>
        </div>
        <p className="mt-0.5 text-xs font-bold text-foreground leading-snug">
          “Asses whether an increase in aggregate demand would be of overall benefit to an economy.”
        </p>
      </div>

      {/* ── Script Preview (Non-overflowing) ─────────────────────────── */}
      <div className="relative p-4 pb-2 bg-background/50">
        {!done ? <span className="examiner-scan" aria-hidden="true" /> : null}

        <p className="relative min-h-[9rem] font-serif text-[13.5px] leading-[1.8] text-foreground select-none">
          {rendered.map(({ clause, index, visible, marked }) => (
            <span
              key={index}
              className="clause"
              data-marked={marked ? "true" : "false"}
              style={
                {
                  "--clause-tint": `color-mix(in oklab, ${AO_META[clause.ao].tint} 16%, transparent)`,
                  "--clause-ink": AO_META[clause.ao].ink,
                } as React.CSSProperties
              }
            >
              {clause.text.slice(0, visible)}
            </span>
          ))}
          {!done ? (
            <span className="inline-block w-1 h-3.5 ml-0.5 bg-primary animate-pulse align-middle" />
          ) : null}
        </p>
      </div>

      {/* ── Dynamic Margin Note ───────────────────────────────────────── */}
      <div className="min-h-[2.75rem] px-4 pb-2">
        {activeNote ? (
          <p
            key={activeNote}
            className="note-in flex items-start gap-2 rounded-lg bg-primary/8 border border-primary/20 p-2 text-[11px] leading-snug text-foreground/90"
          >
            <span className="mt-0.5 shrink-0 rounded bg-primary/15 px-1 py-0.2 font-mono text-[9px] font-bold text-primary uppercase">
              Examiner
            </span>
            <span className="line-clamp-2">{activeNote}</span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/70 italic flex items-center gap-1.5 py-1">
            <Radio className="size-3 animate-pulse text-primary" /> Live examiner listening for Cambridge 9708 concepts…
          </p>
        )}
      </div>

      {/* ── Running Mark & AO Meters ─────────────────────────────────── */}
      <div className="flex items-center gap-4 border-t border-border/80 bg-muted/30 px-4 py-2.5">
        <div>
          <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
            {done ? "Verified Mark" : "Running Mark"}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums text-foreground">
              {currentMark}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              /{TOTAL}
            </span>
          </div>
        </div>

        <div className="ml-auto flex-1 max-w-[200px] space-y-1">
          {aoStats.map(({ ao, pct, awarded, max }) => (
            <div key={ao} className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[9.5px]">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <span className={cn("size-1.5 rounded-full shrink-0", AO_META[ao].dot)} />
                {ao}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", AO_META[ao].dot)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono font-semibold tabular-nums text-foreground/80 text-right w-5">
                {awarded}/{max}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Backwards-compatibility alias:
export const HeroScriptPreview = LiveExaminer;

/**
 * 3D stage wrapper that tilts subtly with pointer hover on desktop devices.
 */
export function ExaminerStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      node.style.setProperty("--mx", currentX.toFixed(4));
      node.style.setProperty("--my", currentY.toFixed(4));
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 1.5),
      );
      targetY = Math.max(
        -1,
        Math.min(1, ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 1.5),
      );
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("examiner-stage", className)}>
      {children}
    </div>
  );
}
