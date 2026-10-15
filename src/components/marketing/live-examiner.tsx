/**
 * The original, automated typewriter-animated Live Examiner demo for the homepage hero.
 *
 * Types out an AS/A Level Economics answer sentence-by-sentence, showing
 * the Live Examiner scanning, detecting Cambridge 9708 assessment objectives,
 * applying live margin annotations, and updating the running mark and AO meters in real-time.
 */

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { Radio, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Ao = "ao1" | "ao2" | "ao3";

interface Clause {
  ao: Ao;
  text: string;
  note: string;
}

const CLAUSES: Clause[] = [
  {
    ao: "ao1",
    text: "A minimum price set above the free-market equilibrium legally prevents price from falling below a mandated threshold. ",
    note: "AO1 Knowledge: accurately defines mandatory price floor above equilibrium.",
  },
  {
    ao: "ao2",
    text: "This incentivises profit-seeking suppliers to expand output to Q2, whilst higher prices contract consumer demand to Q1, creating excess supply. ",
    note: "AO2 Analysis: sound causal transmission to market surplus and contraction.",
  },
  {
    ao: "ao3",
    text: "However, the overall policy effectiveness is compromised if demerit goods have inelastic demand, or if consumers switch to unregulated black markets.",
    note: "AO3 Evaluation: recognizes PED inelasticity and informal market emergence.",
  },
];

const AO_META: Record<Ao, { label: string; dot: string; tint: string; ink: string }> = {
  ao1: {
    label: "AO1",
    dot: "bg-ao1",
    tint: "var(--ao1)",
    ink: "var(--ao1)",
  },
  ao2: {
    label: "AO2",
    dot: "bg-ao2",
    tint: "var(--ao2)",
    ink: "var(--ao2)",
  },
  ao3: {
    label: "AO3",
    dot: "bg-ao3",
    tint: "var(--ao3)",
    ink: "var(--ao3)",
  },
};

const TYPE_SPEED = 28;
const HOLD_TIME = 4000;
const TOTAL_MARKS = 12;

export function LiveExaminer({ className }: { className?: string }) {
  const [typedChars, setTypedChars] = useState(0);
  const [motionDisabled, setMotionDisabled] = useState(false);

  const fullTextLength = useMemo(
    () => CLAUSES.map((c) => c.text).join("").length,
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotionDisabled(true);
      setTypedChars(fullTextLength);
    }
  }, [fullTextLength]);

  useEffect(() => {
    if (motionDisabled) return;

    if (typedChars < fullTextLength) {
      const timer = window.setTimeout(
        () => setTypedChars((prev) => prev + 1),
        TYPE_SPEED,
      );
      return () => window.clearTimeout(timer);
    }

    const holdTimer = window.setTimeout(() => setTypedChars(0), HOLD_TIME);
    return () => window.clearTimeout(holdTimer);
  }, [typedChars, fullTextLength, motionDisabled]);

  // Walk clauses and compute visible substring
  let charCursor = 0;
  const renderedClauses = CLAUSES.map((clause, index) => {
    const start = charCursor;
    charCursor += clause.text.length;
    return {
      clause,
      index,
      visibleLength: Math.max(0, Math.min(clause.text.length, typedChars - start)),
      isCompleted: typedChars >= charCursor,
    };
  });

  const isFinished = typedChars >= fullTextLength;
  const activeNote = [...renderedClauses]
    .reverse()
    .find((row) => row.isCompleted)?.clause.note;

  const completedCount = renderedClauses.filter((row) => row.isCompleted).length;
  const runningMark = Math.min(
    10,
    Math.round((completedCount / CLAUSES.length) * 10),
  );

  const aoProgress = (Object.keys(AO_META) as Ao[]).map((ao) => {
    const total = CLAUSES.filter((c) => c.ao === ao).length;
    const completed = renderedClauses.filter(
      (row) => row.isCompleted && row.clause.ao === ao,
    ).length;
    return {
      ao,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  return (
    <div
      className={cn(
        "examiner-card pop examiner-float relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card shadow-2xl transition-all duration-300",
        className,
      )}
    >
      {/* ── Header Chrome ── */}
      <div className="flex items-center gap-2.5 border-b border-border bg-plum px-4 py-2.5 text-plum-foreground">
        <span className="relative flex size-2.5" aria-hidden="true">
          {!isFinished ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-80" />
          ) : null}
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-bold tracking-tight">Live Examiner</span>
        <Radio className="size-3.5 opacity-80" aria-hidden="true" />
        <span className="ml-auto font-mono text-[10.5px] font-semibold tracking-wide opacity-80">
          Paper 2 · Section B [12 Marks]
        </span>
      </div>

      {/* ── Typewriter Script Area ── */}
      <div className="relative px-4 pt-4 pb-2 md:px-5">
        {!isFinished ? <span className="examiner-scan" aria-hidden="true" /> : null}

        <p className="text-xs font-bold text-foreground leading-snug">
          “Assess whether a minimum price is the most effective way to reduce consumption of a demerit good.”
        </p>

        <p className="relative mt-3 min-h-[9.5rem] font-serif text-[0.94rem] leading-[1.8] text-foreground sm:min-h-[8.5rem]">
          {renderedClauses.map(({ clause, index, visibleLength, isCompleted }) => (
            <span
              key={index}
              className={cn(
                "transition-colors duration-300",
                isCompleted && clause.ao === "ao1" && "bg-ao1/20 rounded px-1 text-foreground",
                isCompleted && clause.ao === "ao2" && "bg-ao2/20 rounded px-1 text-foreground",
                isCompleted && clause.ao === "ao3" && "bg-ao3/20 rounded px-1 text-foreground",
              )}
            >
              {clause.text.slice(0, visibleLength)}
            </span>
          ))}
          {!isFinished ? (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse align-middle" />
          ) : null}
        </p>
      </div>

      {/* ── Live Examiner Margin Note ── */}
      <div className="min-h-[3.25rem] px-4 pb-3 md:px-5">
        {activeNote ? (
          <p
            key={activeNote}
            className="note-in flex gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] p-2.5 text-xs text-foreground leading-relaxed"
          >
            <span className="shrink-0 font-mono text-[10px] uppercase font-bold text-primary flex items-center gap-1">
              <Sparkles className="size-3" /> Examiner
            </span>
            <span>{activeNote}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic py-2">
            Evaluating sentence structures for Cambridge 9708 criteria…
          </p>
        )}
      </div>

      {/* ── Real-Time Running Mark & AO Meters ── */}
      <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-3 md:px-5">
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            {isFinished ? "Calibrated Mark" : "Running Mark"}
          </p>
          <p className="text-2xl font-black text-foreground tabular-nums leading-none mt-1">
            {runningMark}
            <span className="text-xs font-normal text-muted-foreground">/{TOTAL_MARKS}</span>
          </p>
        </div>

        <div className="ml-auto flex-1 space-y-1.5 max-w-[200px]">
          {aoProgress.map(({ ao, percent }) => (
            <div key={ao} className="flex items-center gap-2 text-[10px]">
              <span className={cn("size-2 shrink-0 rounded-full", AO_META[ao].dot)} />
              <span className="w-7 font-mono font-bold text-muted-foreground uppercase">{ao}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full transition-all duration-500 ease-out", AO_META[ao].dot)}
                  style={{ width: `${percent}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 3D tilt stage for the card.
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
