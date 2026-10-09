/**
 * Cambridge 9708 Candidate Answer Script Hero Showcase.
 *
 * Provides a beautifully proportioned, realistic preview of a Cambridge 9708
 * continuous prose script with authentic examiner markings and verified marks.
 * Smoothly links to the dedicated Live Examiner Studio (#try).
 */

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowDown, CheckCircle2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function HeroScriptPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "examiner-card pop examiner-float overflow-hidden rounded-2xl border-2 border-primary/25 bg-card shadow-2xl text-foreground flex flex-col justify-between max-w-xl mx-auto",
        className,
      )}
    >
      {/* ── Official Cambridge Assessment Header ─────────────────────────── */}
      <div className="border-b border-border/80 bg-muted/40 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-foreground font-mono">
                CAMBRIDGE 9708/22
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-primary">
                OFFICIAL SPECIMEN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <CheckCircle2 className="size-3" />
          <span>Verified 8 / 12</span>
        </div>
      </div>

      {/* ── Question & Tariff Banner ─────────────────────────────────────── */}
      <div className="border-b border-border/70 bg-background/80 px-4 py-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-semibold">
          <span>Economics AS Level · Paper 2</span>
          <Badge variant="outline" className="font-mono text-[9.5px] border-primary/30 bg-primary/5 text-primary py-0">
            Max Tariff: [12 Marks]
          </Badge>
        </div>
        <p className="text-xs font-bold text-foreground leading-snug">
          “Asses whether an increase in aggregate demand would be of overall benefit to an economy.”
        </p>
      </div>

      {/* ── Annotated Candidate Script Excerpt ────────────────────────────── */}
      <div className="p-4 space-y-2.5 font-serif text-[12.5px] leading-relaxed bg-background/50">
        {/* Paragraph 1: AO1 Knowledge */}
        <div className="rounded-lg bg-ao1/10 border-l-3 border-ao1 p-2.5 space-y-1 transition-all hover:bg-ao1/15">
          <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-ao1">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-ao1" /> AO1 Knowledge & Concepts
            </span>
            <span className="font-mono font-bold">3 / 3 Marks</span>
          </div>
          <p className="text-foreground/90 italic">
            “Aggregate demand is equal C + I + G + NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. Increased aggregate demand can cause demand-pull inflation.”
          </p>
        </div>

        {/* Paragraph 2: AO2 Analysis */}
        <div className="rounded-lg bg-ao2/10 border-l-3 border-ao2 p-2.5 space-y-1 transition-all hover:bg-ao2/15">
          <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-ao2">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-ao2" /> AO2 Causal Analysis Chain
            </span>
            <span className="font-mono font-bold">3 / 5 Marks</span>
          </div>
          <p className="text-foreground/90 italic">
            “Suppliers are incentivised to produce due to their profit motive, increasing job opportunities and real GDP growth. Revenue from corporate and income tax rises, expanding the budget for merit goods…”
          </p>
        </div>

        {/* Paragraph 3: AO3 Evaluation */}
        <div className="rounded-lg bg-ao3/10 border-l-3 border-ao3 p-2.5 space-y-1 transition-all hover:bg-ao3/15">
          <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-ao3">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-ao3" /> AO3 Evaluative Constraint
            </span>
            <span className="font-mono font-bold">2 / 4 Marks</span>
          </div>
          <p className="text-foreground/90 italic">
            “However, the benefit depends on production capacity. If already operating at full capacity, high AD only causes inflation. Furthermore, expansionary fiscal policy may cause severe budget deficits.”
          </p>
        </div>
      </div>

      {/* ── Footer Bar with CTA to Live Examiner Studio ─────────────────── */}
      <div className="border-t border-border/80 bg-muted/30 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-bold text-foreground">Band 3</span>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground">
            <span className="text-ao1 font-semibold">AO1: 3/3</span>
            <span>·</span>
            <span className="text-ao2 font-semibold">AO2: 3/5</span>
            <span>·</span>
            <span className="text-ao3 font-semibold">AO3: 2/4</span>
          </div>
        </div>

        <a
          href="#try"
          className="pop-sm pop-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
        >
          <span>Try live examiner</span>
          <ArrowDown className="size-3 animate-bounce" />
        </a>
      </div>
    </div>
  );
}

// Backwards-compatibility alias:
export const LiveExaminer = HeroScriptPreview;

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
