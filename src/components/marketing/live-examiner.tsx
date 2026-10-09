/**
 * Cambridge 9708 Economics Diagnostic Showcase for the Hero.
 *
 * An interactive, multi-view inspection stage that lets students explore:
 * 1. Script: Real continuous prose with authentic AO1, AO2, AO3 marker highlights
 * 2. Tariff: Full Cambridge Mark Scheme breakdown across Knowledge, Analysis, and Evaluation
 * 3. Diagram: Dynamic Cambridge 9708 AD/AS curve shift with capacity bottlenecks
 * 4. Rewrite Plan: Actionable line-by-line examiner coaching to advance from 8/12 to 12/12
 *
 * Perfectly proportioned, strictly non-overflowing (~430px), and paired with 3D tilt.
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ArrowDown,
  BarChart3,
  CheckCircle2,
  FileText,
  LineChart,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TabMode = "script" | "tariff" | "diagram" | "plan";

export function LiveExaminer({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<TabMode>("script");
  const [selectedClause, setSelectedClause] = useState<number>(0);
  const [diagramShifted, setDiagramShifted] = useState<boolean>(true);

  const clauses = [
    {
      ao: "AO1",
      title: "AO1 Knowledge & Theory",
      mark: "3 / 3 Marks",
      dot: "bg-ao1",
      border: "border-ao1",
      bg: "bg-ao1/15",
      text: "Aggregate demand is equal to C + I + G + (X - M). AD can be increased through expansionary monetary or fiscal policies, which may stimulate demand-pull inflation.",
      note: "Accurate definitions of AD components and policy transmission levers. Full AO1 credit awarded.",
    },
    {
      ao: "AO2",
      title: "AO2 Causal Analysis Chain",
      mark: "3 / 5 Marks",
      dot: "bg-ao2",
      border: "border-ao2",
      bg: "bg-ao2/15",
      text: "Increased aggregate demand incentivises firms to expand production due to the profit motive, leading to derived demand for labour, higher real GDP, and buoyant government tax revenue.",
      note: "Rigorous cause-and-effect chain linking business incentives to employment and real GDP growth. Misses multiplier feedback loop.",
    },
    {
      ao: "AO3",
      title: "AO3 Evaluative Constraint",
      mark: "2 / 4 Marks",
      dot: "bg-ao3",
      border: "border-ao3",
      bg: "bg-ao3/15",
      text: "However, the overall benefit depends on spare capacity. If an economy operates at full capacity (Y_FE), higher AD only triggers inflation without real output gains, risking fiscal deficits.",
      note: "High-band evaluation recognizing classical supply bottlenecks and fiscal deficit solvency risks. Needs long-run LRAS synthesis for 12/12.",
    },
  ];

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
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <span className="text-xs font-bold tracking-tight text-foreground font-mono flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" /> CAMBRIDGE 9708
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-primary">
            EXAMINER AUDIT
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3" />
          <span>Awarded 8 / 12 (Band 3)</span>
        </div>
      </div>

      {/* ── Question Bar ─────────────────────────────────────────────── */}
      <div className="border-b border-border/70 bg-background/90 px-4 py-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-semibold">
          <span>Economics AS Paper 2 · Section B</span>
          <Badge variant="outline" className="font-mono text-[9px] border-primary/30 bg-primary/5 text-primary py-0">
            Tariff: [12 Marks]
          </Badge>
        </div>
        <p className="mt-0.5 text-xs font-bold text-foreground leading-snug">
          “Assess whether an increase in aggregate demand would be of overall benefit to an economy.”
        </p>
      </div>

      {/* ── Interactive Navigation Pills ─────────────────────────────── */}
      <div className="border-b border-border/70 bg-muted/20 px-3 py-1.5 flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("script")}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-all flex items-center gap-1.5 shrink-0",
            activeTab === "script"
              ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FileText className="size-3" /> Script
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tariff")}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-all flex items-center gap-1.5 shrink-0",
            activeTab === "tariff"
              ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <BarChart3 className="size-3" /> Mark Tariff
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("diagram")}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-all flex items-center gap-1.5 shrink-0",
            activeTab === "diagram"
              ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LineChart className="size-3" /> Diagram
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-all flex items-center gap-1.5 shrink-0",
            activeTab === "plan"
              ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="size-3" /> Rewrite Plan
        </button>
      </div>

      {/* ── Interactive Viewport (Strictly ~225px to prevent overflow) ── */}
      <div className="p-3.5 bg-background/50 min-h-[225px] max-h-[225px] overflow-y-auto no-scrollbar flex flex-col justify-between">
        {/* VIEW 1: Candidate Continuous Prose Script with Marker Tape */}
        {activeTab === "script" && (
          <div className="space-y-2 select-text">
            <div className="space-y-1.5 font-serif text-[12px] leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/60">
              {clauses.map((item, idx) => (
                <span
                  key={item.ao}
                  onClick={() => setSelectedClause(idx)}
                  className={cn(
                    "cursor-pointer rounded px-1 py-0.5 transition-all inline mr-1 border-b-2",
                    item.border,
                    item.bg,
                    selectedClause === idx
                      ? "ring-2 ring-primary/40 font-semibold"
                      : "opacity-85 hover:opacity-100"
                  )}
                  title={`Click to inspect ${item.ao} justification`}
                >
                  <span className="font-mono text-[9.5px] font-bold text-foreground/80 mr-1">
                    [{item.ao}]:
                  </span>
                  “{item.text}”
                </span>
              ))}
            </div>

            <div className="rounded-md bg-card p-2 text-[10.5px] text-muted-foreground leading-snug border border-border/80 flex items-start gap-2 shadow-2xs">
              <span className={cn("size-2 rounded-full mt-1 shrink-0", clauses[selectedClause].dot)} />
              <div>
                <span className="font-bold text-foreground">
                  {clauses[selectedClause].title} ({clauses[selectedClause].mark}):{" "}
                </span>
                <span>{clauses[selectedClause].note}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Cambridge Mark Scheme Tariff Breakdown */}
        {activeTab === "tariff" && (
          <div className="space-y-2.5 py-1">
            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="size-2 rounded-full bg-ao1" /> AO1 Knowledge & Formula
                  </span>
                  <span className="font-mono font-bold text-ao1">3 / 3 (100%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-ao1 transition-all duration-500 w-full" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="size-2 rounded-full bg-ao2" /> AO2 Causal Analysis Chain
                  </span>
                  <span className="font-mono font-bold text-ao2">3 / 5 (60%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-ao2 transition-all duration-500 w-[60%]" />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className="size-2 rounded-full bg-ao3" /> AO3 Evaluative Synthesis
                  </span>
                  <span className="font-mono font-bold text-ao3">2 / 4 (50%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-ao3 transition-all duration-500 w-[50%]" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-[10.5px] text-foreground/90 leading-snug">
              <p className="font-semibold text-primary mb-0.5">Examiner Rubric Judgment:</p>
              <p>Band 3 (8/12). Good analysis of derived labour demand and GDP. To breach Band 4 (10–12), candidate must incorporate LRAS capacity and multiplier limitations.</p>
            </div>
          </div>
        )}

        {/* VIEW 3: Pedagogical Cambridge Diagram with Interactive Shift */}
        {activeTab === "diagram" && (
          <div className="flex flex-col items-center justify-between space-y-1">
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase">
                Cambridge AD/AS Capacity Model
              </span>
              <button
                type="button"
                onClick={() => setDiagramShifted(!diagramShifted)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                {diagramShifted ? (
                  <>
                    <RotateCcw className="size-2.5" /> Reset AD₁
                  </>
                ) : (
                  <>
                    <TrendingUp className="size-2.5" /> Shift AD₂
                  </>
                )}
              </button>
            </div>

            <svg viewBox="0 0 340 145" className="w-full h-[135px] overflow-visible">
              {/* Axes */}
              <line x1="35" y1="15" x2="35" y2="130" stroke="currentColor" strokeWidth="2" className="text-border" />
              <line x1="35" y1="130" x2="320" y2="130" stroke="currentColor" strokeWidth="2" className="text-border" />
              <text x="35" y="10" fontSize="8.5" fontWeight="bold" fill="currentColor" textAnchor="middle">P (Price)</text>
              <text x="315" y="140" fontSize="8.5" fontWeight="bold" fill="currentColor" textAnchor="end">Real GDP (Y)</text>

              {/* Classical LRAS vertical line */}
              <line x1="250" y1="20" x2="250" y2="130" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className="text-muted-foreground" />
              <text x="250" y="15" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle">LRAS (Y_FE)</text>

              {/* SRAS curve */}
              <path d="M 50 120 Q 170 100 265 30" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ao2" />
              <text x="275" y="35" fontSize="8.5" fontWeight="bold" fill="var(--ao2)">SRAS</text>

              {/* AD1 curve */}
              <line x1="75" y1="35" x2="235" y2="125" stroke="currentColor" strokeWidth="2" className="text-ao1" />
              <text x="240" y="125" fontSize="8.5" fontWeight="bold" fill="var(--ao1)">AD₁</text>

              {/* AD2 curve (Shifted Right) */}
              {diagramShifted && (
                <>
                  <line x1="120" y1="25" x2="280" y2="115" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 2" className="text-primary" />
                  <text x="285" y="115" fontSize="8.5" fontWeight="bold" fill="var(--primary)">AD₂</text>

                  {/* Shift Arrow */}
                  <polygon points="208,63 216,65 211,70" fill="currentColor" className="text-primary" />

                  {/* Price Jump Indication */}
                  <line x1="35" y1="58" x2="240" y2="58" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-primary/70" />
                  <text x="30" y="61" fontSize="8" fontWeight="bold" fill="var(--primary)" textAnchor="end">P₂</text>
                </>
              )}

              {/* Price 1 Line */}
              <line x1="35" y1="85" x2="160" y2="85" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-muted-foreground/60" />
              <text x="30" y="88" fontSize="8" fill="currentColor" textAnchor="end">P₁</text>
            </svg>

            <span className="text-[9.5px] text-muted-foreground text-center font-medium leading-tight">
              {diagramShifted
                ? "AD expansion near full capacity causes demand-pull inflation (P₁ → P₂) with limited real GDP gain."
                : "Initial equilibrium: Click 'Shift AD₂' to inspect the demand-pull inflation bottleneck."}
            </span>
          </div>
        )}

        {/* VIEW 4: Cambridge Rewrite Plan */}
        {activeTab === "plan" && (
          <div className="space-y-1.5 py-0.5">
            <div className="rounded-md border border-border bg-card p-1.5 text-[10.5px] space-y-0.5">
              <span className="font-bold text-ao1 flex items-center gap-1">
                <span className="rounded-full bg-ao1 text-white size-3 flex items-center justify-center text-[8.5px]">1</span>
                Syllabus Anchor (LRAS Model):
              </span>
              <p className="text-muted-foreground text-[10px]">
                Explicitly contrast Keynesian spare capacity against classical vertical LRAS to demonstrate why real output gains plateau.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-1.5 text-[10.5px] space-y-0.5">
              <span className="font-bold text-ao2 flex items-center gap-1">
                <span className="rounded-full bg-ao2 text-white size-3 flex items-center justify-center text-[8.5px]">2</span>
                Fiscal Deficit Transmission:
              </span>
              <p className="text-muted-foreground text-[10px]">
                Weigh tax buoyancy against national debt service costs if AD was driven by debt-financed government spending.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-1.5 text-[10.5px] space-y-0.5">
              <span className="font-bold text-ao3 flex items-center gap-1">
                <span className="rounded-full bg-ao3 text-white size-3 flex items-center justify-center text-[8.5px]">3</span>
                Prioritized Conclusion (12/12):
              </span>
              <p className="text-muted-foreground text-[10px]">
                Conclude that AD expansion is only beneficial when synchronized with supply-side capacity improvements.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Bar with CTA to Live Examiner Studio ─────────────────── */}
      <div className="border-t border-border/80 bg-muted/30 px-3.5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px]">
          <span className="font-bold text-foreground">Band 3</span>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <span className="text-ao1 font-semibold">AO1: 3/3</span>
            <span>·</span>
            <span className="text-ao2 font-semibold">AO2: 3/5</span>
            <span>·</span>
            <span className="text-ao3 font-semibold">AO3: 2/4</span>
          </div>
        </div>

        <a
          href="#try"
          className="pop-sm pop-press inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
        >
          <span>Try live editor below</span>
          <ArrowDown className="size-2.5 animate-bounce" />
        </a>
      </div>
    </div>
  );
}

// Backwards-compatibility aliases:
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
