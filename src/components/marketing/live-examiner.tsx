/**
 * The hero's Live Examiner.
 *
 * A short Paper 2 answer types itself while the examiner marks underneath
 * it: each clause is washed in its assessment-objective colour the moment it
 * lands, an underline wipes in behind it, the margin note changes, and the
 * running mark climbs. Then it holds, clears, and goes again.
 *
 * It replaces a static illustration on purpose — this is the product's one
 * claim ("marked as you write") demonstrated rather than described, and it
 * is the first thing on the page a visitor can watch actually happen.
 *
 * Timing is deliberately unhurried: ~24ms a character is fast enough to feel
 * live and slow enough that the highlight lands somewhere the eye is already
 * looking. Reduced motion gets the finished, fully-marked state at once —
 * the marking is the information, the typing is the flourish.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Radio } from "lucide-react";

import { cn } from "@/lib/utils";

type Ao = "AO1" | "AO2" | "AO3";

const AO_META: Record<Ao, { name: string; tint: string; ink: string; dot: string }> = {
  AO1: { name: "Knowledge", tint: "var(--ao1)", ink: "var(--ao1)", dot: "bg-ao1" },
  AO2: { name: "Analysis", tint: "var(--ao2)", ink: "var(--ao2)", dot: "bg-ao2" },
  AO3: { name: "Evaluation", tint: "var(--ao3)", ink: "var(--ao3)", dot: "bg-ao3" },
};

type Clause = { text: string; ao: Ao; note: string };

/* A real answer, cut to the length that fits a hero panel without scrolling.
   Every clause earns exactly one objective, which is what makes the running
   mark legible at a glance. */
const CLAUSES: Clause[] = [
  {
    text: "A minimum price is a price floor set above equilibrium, ",
    ao: "AO1",
    note: "Definition, precisely stated. AO1 credited.",
  },
  {
    text: "used where a demerit good is over-consumed because its external costs are ignored. ",
    ao: "AO1",
    note: "Policy tied to the market failure it answers.",
  },
  {
    text: "Raising price to Pmin contracts demand to Q2, so external cost falls toward the social optimum. ",
    ao: "AO2",
    note: "Cause reaches consequence — the sentence most answers stop before.",
  },
  {
    text: "However for an addictive good demand is inelastic, so a large price rise buys a small fall in quantity.",
    ao: "AO3",
    note: "Judgement with a condition attached. AO3 in full.",
  },
];

const TOTAL = 12;
const TYPE_SPEED = 24; // ms per character
const HOLD = 3200; // ms the finished mark stays up before the loop restarts

export function LiveExaminer({ className }: { className?: string }) {
  const [typed, setTyped] = useState(0);
  const [still, setStill] = useState(false);
  const full = useMemo(() => CLAUSES.map((c) => c.text).join("").length, []);

  // Reduced motion: land on the finished state and never move again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setTyped(full);
    }
  }, [full]);

  useEffect(() => {
    if (still) return;
    if (typed < full) {
      const timer = window.setTimeout(() => setTyped((n) => n + 1), TYPE_SPEED);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setTyped(0), HOLD);
    return () => window.clearTimeout(timer);
  }, [typed, full, still]);

  // Walk the clauses once, splitting the one being typed into seen/unseen.
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

  const done = typed >= full;
  const note = [...rendered].reverse().find((row) => row.marked)?.clause.note;
  const earned = rendered.filter((row) => row.marked).length;
  const mark = Math.round((earned / CLAUSES.length) * TOTAL);

  const shares = (Object.keys(AO_META) as Ao[]).map((ao) => {
    const all = CLAUSES.filter((c) => c.ao === ao).length;
    const hit = rendered.filter((row) => row.marked && row.clause.ao === ao).length;
    return { ao, pct: all === 0 ? 0 : Math.round((hit / all) * 100) };
  });

  return (
    <div className={cn("examiner-card pop examiner-float overflow-hidden", className)}>
      {/* ── Chrome ───────────────────────────────────────────────────────
          Deep purple, so the panel reads as a piece of the product sitting
          on the page rather than another white card. */}
      <div className="flex items-center gap-2.5 border-b-[1.5px] border-ink bg-plum px-4 py-2.5 text-plum-foreground">
        <span className="relative flex size-2.5" aria-hidden="true">
          {!done ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-plum-foreground opacity-80" />
          ) : null}
          <span className="relative inline-flex size-2.5 rounded-full bg-plum-foreground" />
        </span>
        <span className="text-sm font-bold">Live Examiner</span>
        <Radio className="size-4 opacity-80" aria-hidden="true" />
        <span className="ml-auto font-mono text-[0.68rem] tracking-wide opacity-75">
          Paper 2 · 4(b)
        </span>
      </div>

      {/* ── The script ───────────────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-1 md:px-5">
        {!done ? <span className="examiner-scan" aria-hidden="true" /> : null}

        <p className="text-[0.78rem] leading-snug font-semibold text-pretty">
          Assess whether a minimum price is the most effective way to reduce consumption of a
          demerit good.
        </p>

        <p className="relative mt-3 min-h-[10.5rem] font-serif text-[0.94rem] leading-[1.85] text-pretty sm:min-h-[9.5rem]">
          {rendered.map(({ clause, index, visible, marked }) => (
            <span
              key={index}
              className="clause"
              data-marked={marked ? "true" : "false"}
              style={
                {
                  "--clause-tint": `color-mix(in oklab, ${AO_META[clause.ao].tint} 15%, transparent)`,
                  "--clause-ink": AO_META[clause.ao].ink,
                } as React.CSSProperties
              }
            >
              {clause.text.slice(0, visible)}
            </span>
          ))}
          {!done ? <span className="caret" aria-hidden="true" /> : null}
        </p>
      </div>

      {/* ── The examiner's margin note ───────────────────────────────── */}
      <div className="min-h-[3.5rem] px-4 pb-3 md:px-5">
        {note ? (
          <p
            key={note}
            className="note-in flex gap-2.5 rounded-lg bg-plum/8 p-2.5 text-[0.72rem] leading-relaxed text-muted-foreground"
          >
            <span className="mt-px shrink-0 font-mono font-semibold text-plum dark:text-primary">
              examiner
            </span>
            <span>{note}</span>
          </p>
        ) : null}
      </div>

      {/* ── The running mark ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-t-[1.5px] border-ink/12 bg-surface-raised px-4 py-3 md:px-5">
        <div>
          <p className="eyebrow">{done ? "Marked" : "Running mark"}</p>
          <p className="font-display text-2xl leading-none font-bold tabular-nums">
            {mark}
            <span className="text-base text-muted-foreground">/{TOTAL}</span>
          </p>
        </div>

        <div className="ml-auto flex-1 space-y-1.5">
          {shares.map(({ ao, pct }) => (
            <Meter key={ao} label={ao} dot={AO_META[ao].dot} pct={pct} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Meter({ label, dot, pct }: { label: string; dot: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      <span className="w-8 font-mono text-[0.62rem] text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-700 ease-out", dot)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

/**
 * Wraps the panel in a 3D stage: it leans a few degrees toward the pointer
 * and eases back to centre when the pointer leaves. Touch devices and anyone
 * who asked for reduced motion get the panel flat — there is no hover to
 * lean toward, and the lean is decoration either way.
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
