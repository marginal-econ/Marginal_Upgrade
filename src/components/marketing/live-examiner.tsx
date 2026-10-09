/**
 * Cambridge 9708 Economics Diagnostic Showcase for the Hero.
 *
 * An exquisite, high-fidelity Cambridge 9708 Examiner Audit Console.
 * Features:
 * - Authentic Cambridge examination script on parchment with official margin annotations
 * - Interactive sentence-by-sentence AO1 / AO2 / AO3 highlighter tape
 * - Dynamic Cambridge AD/AS Capacity Model with interactive curve shift
 * - Official Cambridge 9708 Mark Scheme Tariff Breakdown
 * - Strictly bounded height (~430px) with 3D pointer tilt and glowing ambient aura
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

export type ExaminerView = "script" | "diagram" | "rubric";

export function LiveExaminer({ className }: { className?: string }) {
  const [view, setView] = useState<ExaminerView>("script");
  const [activeClause, setActiveClause] = useState<number>(0);
  const [diagramShifted, setDiagramShifted] = useState<boolean>(true);

  const clauses = [
    {
      ao: "AO1",
      badge: "AO1 Knowledge",
      mark: "+3 / 3 Marks",
      dot: "bg-ao1",
      border: "border-ao1",
      bg: "bg-ao1/15",
      text: "Aggregate demand is equal to C + I + G + (X - M). AD can be increased via expansionary monetary and fiscal policies, which may stimulate demand-pull inflation.",
      margin: "Accurate formula & policy levers cited.",
      verdict: "Full AO1 credit: exact syllabus specification of consumption, investment, and government spending.",
    },
    {
      ao: "AO2",
      badge: "AO2 Analysis",
      mark: "+4 / 5 Marks",
      dot: "bg-ao2",
      border: "border-ao2",
      bg: "bg-ao2/15",
      text: "Increased aggregate demand incentivises firms to expand production due to the profit motive, leading to derived demand for labour, higher real GDP, and buoyant government tax revenue.",
      margin: "Rigorous cause-and-effect chain.",
      verdict: "Sound analytical transmission from business incentives to derived labour demand and GDP expansion.",
    },
    {
      ao: "AO3",
      badge: "AO3 Evaluation",
      mark: "+3 / 4 Marks",
      dot: "bg-ao3",
      border: "border-ao3",
      bg: "bg-ao3/15",
      text: "However, the overall benefit depends on spare capacity. If an economy operates at full capacity (Y_FE), higher AD only causes inflation without output growth, risking structural budget deficits.",
      margin: "Recognises LRAS capacity bottleneck.",
      verdict: "High-band evaluation identifying classical capacity limits and fiscal debt sustainability tradeoffs.",
    },
  ];

  return (
    <div className={cn("relative mx-auto w-full max-w-lg min-w-0 select-none", className)}>
      {/* Ambient glowing aura behind the card */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-3xl bg-linear-to-r from-primary/30 via-ao2/20 to-ao3/30 opacity-70 blur-xl transition-opacity duration-500"
        aria-hidden="true"
      />

      <div className="examiner-card pop examiner-float relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card shadow-2xl transition-all duration-300 flex flex-col justify-between">
        {/* Subtle scan-line animation */}
        <div className="examiner-scan" aria-hidden="true" />

        {/* ── Console Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-3.5 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-red-500/80" />
              <span className="size-2 rounded-full bg-amber-500/80" />
              <span className="size-2 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-tight text-foreground flex items-center gap-1.5 pl-1">
              <Sparkles className="size-3 text-primary" />
              CAMBRIDGE 9708/22
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10.5px] font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="size-3" />
              <span>10 / 12 (Band 4)</span>
            </span>
          </div>
        </div>

        {/* ── Question & Tariff Ribbon ───────────────────────────────────── */}
        <div className="border-b border-border/70 bg-background/95 px-3.5 py-2 sm:px-4">
          <div className="flex items-center justify-between text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Paper 2 · Section B Essay</span>
            <Badge variant="outline" className="text-[9px] font-mono border-primary/30 bg-primary/5 text-primary py-0 px-1.5">
              Tariff: [12 Marks]
            </Badge>
          </div>
          <p className="mt-0.5 text-[11.5px] font-semibold text-foreground leading-snug">
            “Assess whether an increase in aggregate demand is always beneficial to an economy.”
          </p>
        </div>

        {/* ── Interactive View Controls ──────────────────────────────────── */}
        <div className="border-b border-border/70 bg-muted/20 px-3 py-1 flex items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setView("script")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                view === "script"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FileText className="size-3" /> Annotated Script
            </button>
            <button
              type="button"
              onClick={() => setView("diagram")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                view === "diagram"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LineChart className="size-3" /> AD/AS Model
            </button>
            <button
              type="button"
              onClick={() => setView("rubric")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                view === "rubric"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3" /> AO Rubric
            </button>
          </div>

          <span className="font-mono text-[9.5px] text-muted-foreground uppercase font-medium hidden sm:inline">
            Live Audit
          </span>
        </div>

        {/* ── Main Viewport (Fixed ~230px to guarantee zero overflow) ────── */}
        <div className="p-3 sm:p-3.5 bg-background/50 min-h-[230px] max-h-[230px] overflow-y-auto no-scrollbar flex flex-col justify-between">
          {/* VIEW 1: Candidate Continuous Prose Script with Authentic Margin Annotations */}
          {view === "script" && (
            <div className="space-y-2 select-text">
              <div className="font-serif text-[12px] leading-[1.6] bg-card/80 p-2.5 rounded-lg border border-border/80 shadow-2xs space-y-1">
                {clauses.map((clause, index) => (
                  <span
                    key={clause.ao}
                    onClick={() => setActiveClause(index)}
                    className={cn(
                      "cursor-pointer rounded px-1 py-0.5 transition-all inline mr-1 border-b-2 font-normal",
                      clause.border,
                      clause.bg,
                      activeClause === index
                        ? "ring-2 ring-primary/40 font-medium opacity-100"
                        : "opacity-85 hover:opacity-100"
                    )}
                    title={`Click to inspect examiner justification for ${clause.ao}`}
                  >
                    <span className="font-mono text-[9px] font-bold text-foreground/80 mr-1">
                      [{clause.ao}]:
                    </span>
                    “{clause.text}”
                  </span>
                ))}
              </div>

              {/* Examiner Margin Callout */}
              <div className="rounded-lg bg-card p-2 text-[10.5px] text-muted-foreground leading-snug border border-border/90 flex items-start gap-2 shadow-2xs">
                <span className={cn("size-2 rounded-full mt-1 shrink-0", clauses[activeClause].dot)} />
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-foreground font-sans">
                      {clauses[activeClause].badge} ({clauses[activeClause].mark})
                    </span>
                    <span className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      · {clauses[activeClause].margin}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{clauses[activeClause].verdict}</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Interactive Cambridge AD/AS Diagram Shift */}
          {view === "diagram" && (
            <div className="flex flex-col items-center justify-between space-y-1">
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase">
                  Figure 1: AD Outward Expansion &amp; Capacity Bottleneck
                </span>
                <button
                  type="button"
                  onClick={() => setDiagramShifted(!diagramShifted)}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {diagramShifted ? (
                    <>
                      <RotateCcw className="size-2.5" /> Reset AD₁
                    </>
                  ) : (
                    <>
                      <TrendingUp className="size-2.5" /> Shift AD₂ →
                    </>
                  )}
                </button>
              </div>

              <svg viewBox="0 0 340 145" className="w-full h-[140px] overflow-visible">
                {/* Axes */}
                <line x1="35" y1="15" x2="35" y2="130" stroke="currentColor" strokeWidth="2" className="text-border" />
                <line x1="35" y1="130" x2="320" y2="130" stroke="currentColor" strokeWidth="2" className="text-border" />
                <text x="35" y="10" fontSize="8.5" fontWeight="bold" fill="currentColor" textAnchor="middle">Price Level (P)</text>
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
                  ? "AD expansion near full capacity causes demand-pull inflation (P₁ → P₂) with limited real GDP growth."
                  : "Initial macro equilibrium: Click 'Shift AD₂ →' to observe the classical capacity bottleneck."}
              </span>
            </div>
          )}

          {/* VIEW 3: Cambridge Mark Scheme Rubric Breakdown */}
          {view === "rubric" && (
            <div className="space-y-2 py-0.5">
              <div className="space-y-1.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span className="size-2 rounded-full bg-ao1" /> AO1 Knowledge &amp; Definitions
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
                    <span className="font-mono font-bold text-ao2">4 / 5 (80%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-ao2 transition-all duration-500 w-[80%]" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span className="size-2 rounded-full bg-ao3" /> AO3 Evaluative Synthesis
                    </span>
                    <span className="font-mono font-bold text-ao3">3 / 4 (75%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-ao3 transition-all duration-500 w-[75%]" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-[10.5px] text-foreground/90 leading-snug">
                <p className="font-semibold text-primary mb-0.5">Examiner Rubric Judgment (Band 4):</p>
                <p>
                  10 / 12 Marks awarded. Clear grasp of macro objectives and capacity limits. Adding an explicit contrast with Keynesian elastic supply will unlock the maximum 12/12.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Bar with CTA to Live Examiner Studio ─────────────────── */}
        <div className="border-t border-border/80 bg-muted/30 px-3.5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px]">
            <span className="font-bold text-foreground">Band 4</span>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <span className="text-ao1 font-semibold">AO1: 3/3</span>
              <span>·</span>
              <span className="text-ao2 font-semibold">AO2: 4/5</span>
              <span>·</span>
              <span className="text-ao3 font-semibold">AO3: 3/4</span>
            </div>
          </div>

          <a
            href="#try"
            className="pop-sm pop-press inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
          >
            <span>Test live editor below</span>
            <ArrowDown className="size-2.5 animate-bounce" />
          </a>
        </div>
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
