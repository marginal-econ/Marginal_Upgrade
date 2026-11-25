import React, { useMemo, useState } from "react";
import type { DiagramMetrics, DiagramState, ShadedPolygon } from "@/lib/diagram-lab/types";
import {
  DIAGRAM_PRESET_META,
  evalFirmAC,
  evalFirmMC,
  evalJCurve,
  evalKeynesianAS,
  evalLorenz,
  evalPpcY,
  evalSrpc,
  getShadedPolygons,
} from "@/lib/diagram-lab/math";
import { cn } from "@/lib/utils";

interface CanvasProps {
  state: DiagramState;
  metrics: DiagramMetrics;
  className?: string;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export function InteractiveDiagramCanvas({ state, metrics, className, svgRef }: CanvasProps) {
  const [hoveredPolygon, setHoveredPolygon] = useState<ShadedPolygon | null>(null);

  const meta = DIAGRAM_PRESET_META[state.preset];

  // SVG viewport: 580 x 430 (extra right margin for clean curve labels)
  const margin = { top: 34, right: 78, bottom: 52, left: 66 };
  const width = 580;
  const height = 430;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Standard 0..100 coordinate mapper
  const toSvgX = (q: number) => margin.left + (Math.max(0, Math.min(100, q)) / 100) * plotWidth;
  const toSvgY = (p: number) =>
    margin.top + plotHeight - (Math.max(0, Math.min(100, p)) / 100) * plotHeight;

  // Helper to build polyline path from sampled (x, y) pairs in 0..100 coordinates
  const buildPath = (pts: { x: number; y: number }[]) =>
    pts
      .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y))
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`)
      .join(" ");

  const polygons = useMemo(() => getShadedPolygons(state, metrics), [state, metrics]);

  const effD = state.demandIntercept + state.demandShift;
  const effS = state.supplyIntercept + state.supplyShift;

  // Clip linear line segment inside [0..96] x [2..96]
  const clipLine = (intercept: number, slope: number, downward: boolean) => {
    const pts: { x: number; y: number }[] = [];
    for (let q = 0; q <= 96; q += 2) {
      const p = downward ? intercept - slope * q : intercept + slope * q;
      if (p >= 2 && p <= 96) pts.push({ x: q, y: p });
    }
    if (pts.length < 2) return null;
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    return {
      x1: toSvgX(first.x),
      y1: toSvgY(first.y),
      x2: toSvgX(last.x),
      y2: toSvgY(last.y),
    };
  };

  // Determine whether this preset uses standard linear S&D base axes
  const isJCurve = state.preset === "j_curve";

  return (
    <div className={cn("relative flex flex-col items-center select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[470px] drop-shadow-sm font-sans"
        style={{ aspectRatio: `${width} / ${height}` }}
        aria-label={`Interactive Cambridge Economics Diagram: ${meta.title}`}
      >
        <defs>
          <marker id="arrowhead-p" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" className="fill-foreground/75" />
          </marker>
          <marker id="arrowhead-q" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" className="fill-foreground/75" />
          </marker>
          <pattern id="cad-grid" width="44" height="34" patternUnits="userSpaceOnUse">
            <path
              d="M 44 0 L 0 0 0 34"
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/[0.08]"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect
          x={margin.left}
          y={margin.top}
          width={plotWidth}
          height={plotHeight}
          fill="url(#cad-grid)"
        />

        {/* Shaded Area Polygons (CS, PS, Tax Revenue, Subsidy, Profit, DWL, Gini) */}
        {polygons.map((poly) => {
          const pathD =
            poly.points
              .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${toSvgX(pt.q).toFixed(1)} ${toSvgY(pt.p).toFixed(1)}`)
              .join(" ") + " Z";
          const isHovered = hoveredPolygon?.id === poly.id;

          return (
            <path
              key={poly.id}
              d={pathD}
              className={cn(
                poly.fillClass,
                poly.strokeClass,
                "transition-opacity cursor-pointer stroke-[1.2]",
                isHovered ? "opacity-95 stroke-[2]" : "opacity-80 hover:opacity-95",
              )}
              onMouseEnter={() => setHoveredPolygon(poly)}
              onMouseLeave={() => setHoveredPolygon(null)}
            />
          );
        })}

        {/* AXES */}
        {/* Y Axis */}
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left}
          y2={margin.top - 12}
          stroke="currentColor"
          strokeWidth="2"
          markerEnd="url(#arrowhead-p)"
          className="text-foreground/85"
        />
        <text
          x={margin.left - 8}
          y={margin.top - 16}
          textAnchor="start"
          className="text-[12px] font-bold fill-foreground"
        >
          {meta.yAxis}
        </text>

        {/* X Axis (centered at y=0 for J-Curve, bottom for all others) */}
        {isJCurve ? (
          <>
            <line
              x1={margin.left}
              y1={toSvgY(45)}
              x2={margin.left + plotWidth + 16}
              y2={toSvgY(45)}
              stroke="currentColor"
              strokeWidth="1.8"
              markerEnd="url(#arrowhead-q)"
              className="text-foreground/85"
            />
            <text
              x={margin.left + plotWidth + 20}
              y={toSvgY(45) + 4}
              textAnchor="start"
              className="text-[12px] font-bold fill-foreground"
            >
              Time
            </text>
            <text x={margin.left - 8} y={toSvgY(45) + 4} textAnchor="end" className="text-[11px] font-semibold fill-muted-foreground">
              0
            </text>
            <text x={margin.left - 8} y={toSvgY(82)} textAnchor="end" className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
              + Surplus
            </text>
            <text x={margin.left - 8} y={toSvgY(12)} textAnchor="end" className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
              − Deficit
            </text>
          </>
        ) : (
          <>
            <line
              x1={margin.left}
              y1={margin.top + plotHeight}
              x2={margin.left + plotWidth + 18}
              y2={margin.top + plotHeight}
              stroke="currentColor"
              strokeWidth="2"
              markerEnd="url(#arrowhead-q)"
              className="text-foreground/85"
            />
            <text
              x={margin.left + plotWidth}
              y={margin.top + plotHeight + 36}
              textAnchor="end"
              className="text-[12px] font-bold fill-foreground"
            >
              {meta.xAxis}
            </text>
            <text
              x={margin.left - 8}
              y={margin.top + plotHeight + 16}
              textAnchor="end"
              className="text-[11px] font-medium fill-muted-foreground"
            >
              0
            </text>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PRESET-SPECIFIC VECTOR LAYERS                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* 1. PPC */}
        {state.preset === "ppc" && (() => {
          const ppc1Pts: { x: number; y: number }[] = [];
          for (let i = 0; i <= 60; i++) {
            const x = (i / 60) * state.ppcMaxX;
            ppc1Pts.push({ x, y: evalPpcY(x, state.ppcMaxX, state.ppcMaxY, state.ppcCurvature) });
          }
          const hasShift = state.ppcGrowthX !== 0 || state.ppcGrowthY !== 0;
          const ppc2Pts: { x: number; y: number }[] = [];
          if (hasShift) {
            const mx = Math.max(20, Math.min(96, state.ppcMaxX + state.ppcGrowthX));
            const my = Math.max(20, Math.min(96, state.ppcMaxY + state.ppcGrowthY));
            for (let i = 0; i <= 60; i++) {
              const x = (i / 60) * mx;
              ppc2Pts.push({ x, y: evalPpcY(x, mx, my, state.ppcCurvature) });
            }
          }
          const ptX = Math.min(96, metrics.eqQ);
          const ptY = Math.min(96, metrics.eqP);

          return (
            <>
              <path
                d={buildPath(ppc1Pts)}
                fill="none"
                stroke="#2563eb"
                strokeWidth={hasShift ? "2" : "2.6"}
                strokeDasharray={hasShift ? "5 3" : undefined}
              />
              <text
                x={toSvgX(state.ppcMaxX) + 4}
                y={toSvgY(4)}
                className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400"
              >
                PPC₁
              </text>
              {hasShift && (
                <>
                  <path d={buildPath(ppc2Pts)} fill="none" stroke="#10b981" strokeWidth="2.6" />
                  <text
                    x={toSvgX(Math.min(96, state.ppcMaxX + state.ppcGrowthX)) + 4}
                    y={toSvgY(8)}
                    className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400"
                  >
                    PPC₂
                  </text>
                </>
              )}
              {/* Operating Point A */}
              <line
                x1={toSvgX(ptX)}
                y1={toSvgY(ptY)}
                x2={toSvgX(ptX)}
                y2={margin.top + plotHeight}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-muted-foreground/60"
              />
              <line
                x1={margin.left}
                y1={toSvgY(ptY)}
                x2={toSvgX(ptX)}
                y2={toSvgY(ptY)}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-muted-foreground/60"
              />
              <circle
                cx={toSvgX(ptX)}
                cy={toSvgY(ptY)}
                r="5"
                className={cn(
                  "stroke-background stroke-2",
                  state.ppcEfficiency < 0.97
                    ? "fill-amber-500"
                    : state.ppcEfficiency > 1.03
                      ? "fill-rose-500"
                      : "fill-emerald-500",
                )}
              />
              <text x={toSvgX(ptX) + 8} y={toSvgY(ptY) - 6} className="text-[11px] font-bold fill-foreground">
                Point A ({state.ppcEfficiency < 0.97 ? "Inefficient" : state.ppcEfficiency > 1.03 ? "Unattainable" : "Efficient"})
              </text>
              <text x={toSvgX(ptX)} y={margin.top + plotHeight + 15} textAnchor="middle" className="text-[11px] font-semibold fill-muted-foreground">
                X₁
              </text>
              <text x={margin.left - 6} y={toSvgY(ptY) + 4} textAnchor="end" className="text-[11px] font-semibold fill-muted-foreground">
                Y₁
              </text>
            </>
          );
        })()}

        {/* 2. FIRM THEORY: MONOPOLY, PERFECT COMPETITION, MONOPOLISTIC COMP */}
        {(state.preset === "monopoly" ||
          state.preset === "perfect_competition" ||
          state.preset === "monopolistic_comp") && (() => {
          const acPts: { x: number; y: number }[] = [];
          const mcPts: { x: number; y: number }[] = [];
          for (let q = 10; q <= 88; q += 2) {
            const ac = evalFirmAC(q, state.firmFixedCost);
            const mc = evalFirmMC(q, state.firmFixedCost, state.mcShift);
            if (ac <= 96 && ac >= 4) acPts.push({ x: q, y: ac });
            if (mc <= 96 && mc >= 4) mcPts.push({ x: q, y: mc });
          }

          const arLine =
            state.preset === "perfect_competition"
              ? { x1: margin.left, y1: toSvgY(state.marketPrice), x2: margin.left + plotWidth, y2: toSvgY(state.marketPrice) }
              : clipLine(effD, state.demandSlope, true);
          const mrLine =
            state.preset === "perfect_competition"
              ? null
              : clipLine(effD, state.demandSlope * 2, true);

          const lastAc = acPts[acPts.length - 1];
          const lastMc = mcPts[mcPts.length - 1];
          const q = metrics.eqQ;
          const p = metrics.eqP;
          const ac = metrics.firmAcAtQ;

          return (
            <>
              {/* AC Curve */}
              <path d={buildPath(acPts)} fill="none" stroke="#f59e0b" strokeWidth="2.4" />
              {lastAc && (
                <text x={toSvgX(lastAc.x) + 4} y={toSvgY(lastAc.y) + 4} className="text-[12px] font-bold fill-amber-600 dark:fill-amber-400">
                  AC
                </text>
              )}

              {/* MC Curve */}
              <path d={buildPath(mcPts)} fill="none" stroke="#e11d48" strokeWidth="2.5" />
              {lastMc && (
                <text x={toSvgX(lastMc.x) + 4} y={toSvgY(lastMc.y) + 4} className="text-[12px] font-bold fill-rose-600 dark:fill-rose-400">
                  MC
                </text>
              )}

              {/* AR = D Curve */}
              {arLine && (
                <>
                  <line x1={arLine.x1} y1={arLine.y1} x2={arLine.x2} y2={arLine.y2} stroke="#2563eb" strokeWidth="2.5" />
                  <text x={arLine.x2 + 4} y={arLine.y2 + 4} className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                    {state.preset === "perfect_competition" ? "P = AR = MR" : "AR = D"}
                  </text>
                </>
              )}

              {/* MR Curve */}
              {mrLine && (
                <>
                  <line x1={mrLine.x1} y1={mrLine.y1} x2={mrLine.x2} y2={mrLine.y2} stroke="#7c3aed" strokeWidth="2.2" strokeDasharray="5 3" />
                  <text x={mrLine.x2 + 4} y={mrLine.y2 + 4} className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    MR
                  </text>
                </>
              )}

              {/* MC = MR drop line & Price/AC horizontal lines */}
              <line x1={toSvgX(q)} y1={toSvgY(Math.max(p, ac))} x2={toSvgX(q)} y2={margin.top + plotHeight} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/70" />
              <line x1={margin.left} y1={toSvgY(p)} x2={toSvgX(q)} y2={toSvgY(p)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/70" />
              <line x1={margin.left} y1={toSvgY(ac)} x2={toSvgX(q)} y2={toSvgY(ac)} stroke="currentColor" strokeDasharray="2 2" className="text-amber-600/70" />

              <circle cx={toSvgX(q)} cy={toSvgY(p)} r="4.5" className="fill-blue-600 stroke-background stroke-2" />
              <circle cx={toSvgX(q)} cy={toSvgY(ac)} r="4" className="fill-amber-500 stroke-background stroke-2" />

              <text x={toSvgX(q)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-bold fill-foreground">
                Qm
              </text>
              <text x={margin.left - 6} y={toSvgY(p) + 4} textAnchor="end" className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                Pm
              </text>
              <text x={margin.left - 6} y={toSvgY(ac) + 4} textAnchor="end" className="text-[11px] font-semibold fill-amber-600 dark:fill-amber-400">
                C₁
              </text>
            </>
          );
        })()}

        {/* 3. KINKED DEMAND CURVE (OLIGOPOLY) */}
        {state.preset === "kinked_demand" && (() => {
          const kinkQ = 46;
          const kinkP = 58;
          const mcY1 = Math.max(8, Math.min(82, 24 + state.mcShift));
          const mcPts = [
            { x: 18, y: Math.max(4, mcY1 - 12) },
            { x: kinkQ, y: mcY1 },
            { x: 74, y: Math.min(92, mcY1 + 26) },
          ];
          return (
            <>
              {/* Upper elastic AR + Lower inelastic AR */}
              <path
                d={buildPath([{ x: 6, y: 78 }, { x: kinkQ, y: kinkP }, { x: 76, y: 10 }])}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.6"
              />
              <text x={toSvgX(76) + 4} y={toSvgY(10) + 4} className="text-[12px] font-bold fill-blue-600 dark:fill-blue-400">
                D = AR
              </text>
              {/* Discontinuous MR */}
              <line x1={toSvgX(6)} y1={toSvgY(75)} x2={toSvgX(kinkQ)} y2={toSvgY(35)} stroke="#7c3aed" strokeWidth="2.2" />
              <line x1={toSvgX(kinkQ)} y1={toSvgY(35)} x2={toSvgX(kinkQ)} y2={toSvgY(12)} stroke="#7c3aed" strokeWidth="1.8" strokeDasharray="4 3" />
              <line x1={toSvgX(kinkQ)} y1={toSvgY(12)} x2={toSvgX(58)} y2={toSvgY(2)} stroke="#7c3aed" strokeWidth="2.2" />
              <text x={toSvgX(58) + 4} y={toSvgY(4)} className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                MR
              </text>
              {/* Shifted MC */}
              <path d={buildPath(mcPts)} fill="none" stroke="#e11d48" strokeWidth="2.5" />
              <text x={toSvgX(74) + 4} y={toSvgY(mcPts[2]!.y)} className="text-[12px] font-bold fill-rose-600 dark:fill-rose-400">
                MC
              </text>
              {/* Kink drop lines */}
              <line x1={toSvgX(metrics.eqQ)} y1={toSvgY(metrics.eqP)} x2={toSvgX(metrics.eqQ)} y2={margin.top + plotHeight} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/70" />
              <line x1={margin.left} y1={toSvgY(metrics.eqP)} x2={toSvgX(metrics.eqQ)} y2={toSvgY(metrics.eqP)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/70" />
              <circle cx={toSvgX(metrics.eqQ)} cy={toSvgY(metrics.eqP)} r="5" className="fill-blue-600 stroke-background stroke-2" />
              <text x={toSvgX(metrics.eqQ) + 8} y={toSvgY(metrics.eqP) - 6} className="text-[11px] font-bold fill-foreground">
                Kink (P*, Q*)
              </text>
              <text x={toSvgX(metrics.eqQ)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-bold fill-foreground">
                Q*
              </text>
              <text x={margin.left - 6} y={toSvgY(metrics.eqP) + 4} textAnchor="end" className="text-[11px] font-bold fill-foreground">
                P*
              </text>
            </>
          );
        })()}

        {/* 4. PHILLIPS CURVE (SRPC & LRPC) */}
        {state.preset === "phillips_curve" && (() => {
          const mapU = (u: number) => (u / 10) * 95;
          const mapInf = (inf: number) => (inf / 14) * 92;
          const basePts: { x: number; y: number }[] = [];
          const shiftedPts: { x: number; y: number }[] = [];
          for (let u = 1.4; u <= 9.5; u += 0.25) {
            basePts.push({ x: mapU(u), y: mapInf(evalSrpc(u, state.nairu, 0)) });
            if (state.srpcShift !== 0) {
              shiftedPts.push({ x: mapU(u), y: mapInf(evalSrpc(u, state.nairu, state.srpcShift)) });
            }
          }
          const curX = mapU(state.unemploymentRate);
          const curY = mapInf(metrics.inflationRate);
          const nairuX = mapU(state.nairu);

          return (
            <>
              {/* Vertical LRPC (NAIRU) */}
              <line x1={toSvgX(nairuX)} y1={margin.top} x2={toSvgX(nairuX)} y2={margin.top + plotHeight} stroke="#7c3aed" strokeWidth="2.4" />
              <text x={toSvgX(nairuX) + 5} y={margin.top + 14} className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                LRPC (NAIRU)
              </text>
              <text x={toSvgX(nairuX)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                U_n ({state.nairu}%)
              </text>

              {/* Base SRPC1 */}
              <path
                d={buildPath(basePts)}
                fill="none"
                stroke="#2563eb"
                strokeWidth={state.srpcShift !== 0 ? "1.8" : "2.6"}
                strokeDasharray={state.srpcShift !== 0 ? "4 3" : undefined}
              />
              <text x={toSvgX(90) + 2} y={toSvgY(basePts[basePts.length - 1]!.y)} className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                SRPC₁
              </text>

              {/* Shifted SRPC2 */}
              {shiftedPts.length > 0 && (
                <>
                  <path d={buildPath(shiftedPts)} fill="none" stroke="#e11d48" strokeWidth="2.6" />
                  <text x={toSvgX(90) + 2} y={toSvgY(shiftedPts[shiftedPts.length - 1]!.y)} className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
                    SRPC₂
                  </text>
                </>
              )}

              {/* Operating Point */}
              <line x1={toSvgX(curX)} y1={toSvgY(curY)} x2={toSvgX(curX)} y2={margin.top + plotHeight} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/60" />
              <line x1={margin.left} y1={toSvgY(curY)} x2={toSvgX(curX)} y2={toSvgY(curY)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/60" />
              <circle cx={toSvgX(curX)} cy={toSvgY(curY)} r="5" className="fill-emerald-500 stroke-background stroke-2" />
              <text x={margin.left - 6} y={toSvgY(curY) + 4} textAnchor="end" className="text-[11px] font-bold fill-foreground">
                {metrics.inflationRate.toFixed(1)}%
              </text>
            </>
          );
        })()}

        {/* 5. MONEY MARKET (LIQUIDITY PREFERENCE) */}
        {state.preset === "money_market" && (() => {
          const lpLine = clipLine(effD, state.demandSlope, true);
          const m1 = state.moneySupply;
          const m2 = Math.max(15, Math.min(88, state.moneySupply + state.moneySupplyShift));
          const hasShift = state.moneySupplyShift !== 0;

          return (
            <>
              {lpLine && (
                <>
                  <line x1={lpLine.x1} y1={lpLine.y1} x2={lpLine.x2} y2={lpLine.y2} stroke="#2563eb" strokeWidth="2.6" />
                  <text x={lpLine.x2 + 4} y={lpLine.y2 + 4} className="text-[12px] font-bold fill-blue-600 dark:fill-blue-400">
                    Lp (Md)
                  </text>
                </>
              )}
              {/* Ms1 */}
              <line x1={toSvgX(m1)} y1={margin.top + 8} x2={toSvgX(m1)} y2={margin.top + plotHeight} stroke="#ea580c" strokeWidth="2.4" strokeDasharray={hasShift ? "5 3" : undefined} />
              <text x={toSvgX(m1)} y={margin.top + 4} textAnchor="middle" className="text-[11px] font-bold fill-orange-600 dark:fill-orange-400">
                Ms₁
              </text>
              <line x1={margin.left} y1={toSvgY(metrics.initialP)} x2={toSvgX(m1)} y2={toSvgY(metrics.initialP)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/60" />
              <circle cx={toSvgX(m1)} cy={toSvgY(metrics.initialP)} r="4.5" className="fill-orange-500 stroke-background stroke-2" />
              <text x={margin.left - 6} y={toSvgY(metrics.initialP) + 4} textAnchor="end" className="text-[11px] font-semibold fill-muted-foreground">
                r₁
              </text>

              {/* Ms2 */}
              {hasShift && (
                <>
                  <line x1={toSvgX(m2)} y1={margin.top + 8} x2={toSvgX(m2)} y2={margin.top + plotHeight} stroke="#7c3aed" strokeWidth="2.6" />
                  <text x={toSvgX(m2)} y={margin.top + 4} textAnchor="middle" className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    Ms₂
                  </text>
                  <line x1={margin.left} y1={toSvgY(metrics.eqP)} x2={toSvgX(m2)} y2={toSvgY(metrics.eqP)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/60" />
                  <circle cx={toSvgX(m2)} cy={toSvgY(metrics.eqP)} r="4.5" className="fill-violet-600 stroke-background stroke-2" />
                  <text x={margin.left - 6} y={toSvgY(metrics.eqP) + 4} textAnchor="end" className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    r₂
                  </text>
                </>
              )}
            </>
          );
        })()}

        {/* 6. LORENZ CURVE & GINI COEFFICIENT */}
        {state.preset === "lorenz_curve" && (() => {
          const l1Pts: { x: number; y: number }[] = [];
          const l2Pts: { x: number; y: number }[] = [];
          for (let x = 0; x <= 100; x += 2) {
            l1Pts.push({ x, y: evalLorenz(x, state.giniExponent) });
            if (state.giniCompareExponent >= 1) {
              l2Pts.push({ x, y: evalLorenz(x, state.giniCompareExponent) });
            }
          }
          return (
            <>
              {/* 100% Bounding Box */}
              <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="none" stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/30" />
              {/* 45° Line of Perfect Equality */}
              <line x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(100)} y2={toSvgY(100)} stroke="#10b981" strokeWidth="2.2" strokeDasharray="5 3" />
              <text x={toSvgX(42)} y={toSvgY(48)} className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                45° Perfect Equality
              </text>
              {/* Primary Lorenz Curve */}
              <path d={buildPath(l1Pts)} fill="none" stroke="#e11d48" strokeWidth="2.8" />
              <text x={toSvgX(66)} y={toSvgY(evalLorenz(66, state.giniExponent)) + 16} className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
                Lorenz L₁ (Gini {metrics.giniCoefficient.toFixed(2)})
              </text>
              {/* Comparison Lorenz Curve */}
              {l2Pts.length > 0 && (
                <>
                  <path d={buildPath(l2Pts)} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeDasharray="5 3" />
                  <text x={toSvgX(54)} y={toSvgY(evalLorenz(54, state.giniCompareExponent)) - 6} className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                    Post-Tax L₂
                  </text>
                </>
              )}
              <text x={toSvgX(100)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-semibold fill-muted-foreground">
                100%
              </text>
              <text x={margin.left - 6} y={toSvgY(100) + 4} textAnchor="end" className="text-[11px] font-semibold fill-muted-foreground">
                100%
              </text>
            </>
          );
        })()}

        {/* 7. J-CURVE EFFECT */}
        {state.preset === "j_curve" && (() => {
          const pts: { x: number; y: number }[] = [];
          for (let t = 0; t <= 100; t += 2) {
            // Map current account [-45..+50] -> SVG y [5..95] where 0 = 45
            const bal = evalJCurve(t, state.jCurveDip, state.jCurveRecovery);
            pts.push({ x: t, y: Math.max(4, Math.min(95, 45 + bal)) });
          }
          const troughY = Math.max(4, Math.min(95, 45 + evalJCurve(24, state.jCurveDip, state.jCurveRecovery)));
          const endY = Math.max(4, Math.min(95, 45 + evalJCurve(96, state.jCurveDip, state.jCurveRecovery)));

          return (
            <>
              <path d={buildPath(pts)} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
              <circle cx={toSvgX(24)} cy={toSvgY(troughY)} r="4.5" className="fill-rose-500 stroke-background stroke-2" />
              <text x={toSvgX(24)} y={toSvgY(troughY) + 18} textAnchor="middle" className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
                Short-run worsening (inelastic)
              </text>
              <circle cx={toSvgX(96)} cy={toSvgY(endY)} r="4.5" className="fill-emerald-500 stroke-background stroke-2" />
              <text x={toSvgX(86)} y={toSvgY(endY) - 10} textAnchor="end" className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                Long-run surplus (Marshall-Lerner)
              </text>
            </>
          );
        })()}

        {/* 8. LINEAR MARKET / MACRO / LABOUR / TRADE / EXTERNALITY MODELS */}
        {(state.preset === "supply_demand" ||
          state.preset === "tax" ||
          state.preset === "subsidy" ||
          state.preset === "price_floor" ||
          state.preset === "price_ceiling" ||
          state.preset === "externality" ||
          state.preset === "labour_market" ||
          state.preset === "macro_ad_as" ||
          state.preset === "tariff" ||
          state.preset === "forex") && (() => {
          const isMacro = state.preset === "macro_ad_as";
          const isLabour = state.preset === "labour_market";
          const isExt = state.preset === "externality";
          const isShiftCompare =
            state.preset === "supply_demand" || state.preset === "forex" || isMacro;

          const baseD = clipLine(state.demandIntercept, state.demandSlope, true);
          const curD = clipLine(effD, state.demandSlope, true);
          const baseS = clipLine(state.supplyIntercept, state.supplySlope, false);
          const curS = clipLine(effS, state.supplySlope, false);

          const hasDShift = isShiftCompare && state.demandShift !== 0;
          const hasSShift = isShiftCompare && state.supplyShift !== 0;
          const hasTax = state.preset === "tax" && state.taxAmount > 0;
          const hasSub = state.preset === "subsidy" && state.subsidyAmount > 0;
          const sTaxed = hasTax ? clipLine(effS + state.taxAmount, state.supplySlope, false) : null;
          const sSub = hasSub ? clipLine(effS - state.subsidyAmount, state.supplySlope, false) : null;
          const tradeSubS =
            state.preset === "tariff" && state.tradeMode === "domestic_subsidy" && state.tariffAmount > 0
              ? clipLine(effS - state.tariffAmount, state.supplySlope, false)
              : null;

          // Externality shifted curve
          let extLine = null;
          let extLabel = "";
          if (isExt && state.externalityCost > 0) {
            if (state.externalityMode === "neg_prod") {
              extLine = clipLine(effS + state.externalityCost, state.supplySlope, false);
              extLabel = "MSC";
            } else if (state.externalityMode === "pos_cons") {
              extLine = clipLine(effD + state.externalityCost, state.demandSlope, true);
              extLabel = "MSB";
            } else if (state.externalityMode === "neg_cons") {
              extLine = clipLine(effD - state.externalityCost, state.demandSlope, true);
              extLabel = "MSB";
            } else {
              extLine = clipLine(effS - state.externalityCost, state.supplySlope, false);
              extLabel = "MSC";
            }
          }

          // Monopsony MC_L curve
          const mcLabourLine =
            isLabour && state.labourMode === "monopsony"
              ? clipLine(effS, state.supplySlope * 2, false)
              : null;

          // Macro LRAS
          const yFe = Math.max(20, Math.min(92, state.lrasOutput + state.lrasShift));
          const keynesPts: { x: number; y: number }[] = [];
          if (isMacro && state.lrasMode === "keynesian") {
            for (let q = 4; q <= yFe; q += 1.5) {
              keynesPts.push({ x: q, y: evalKeynesianAS(q, yFe) });
            }
          }

          const dLabel = isMacro
            ? hasDShift ? "AD₂" : "AD"
            : isLabour
              ? "MRP = D_L"
              : isExt
                ? state.externalityMode === "neg_prod" || state.externalityMode === "pos_prod"
                  ? "MPB = MSB"
                  : "MPB"
                : hasDShift ? "D₂" : "D";

          const sLabel = isMacro
            ? hasSShift ? "SRAS₂" : "SRAS"
            : isLabour
              ? "S_L = AC_L"
              : isExt
                ? state.externalityMode === "pos_cons" || state.externalityMode === "neg_cons"
                  ? "MPC = MSC"
                  : "MPC"
                : hasTax || hasSub || hasSShift ? "S₁" : "S";

          return (
            <>
              {/* Macro LRAS */}
              {isMacro && state.lrasMode === "classical" && (
                <>
                  <line x1={toSvgX(yFe)} y1={margin.top} x2={toSvgX(yFe)} y2={margin.top + plotHeight} stroke="#7c3aed" strokeWidth="2.4" />
                  <text x={toSvgX(yFe) + 5} y={margin.top + 14} className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    LRAS
                  </text>
                  <text x={toSvgX(yFe)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    Y_fe
                  </text>
                </>
              )}
              {isMacro && state.lrasMode === "keynesian" && (
                <>
                  <path d={buildPath(keynesPts)} fill="none" stroke="#7c3aed" strokeWidth="2.8" />
                  <text x={toSvgX(yFe) + 5} y={margin.top + 14} className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                    Keynesian LRAS
                  </text>
                </>
              )}

              {/* Unshifted ghost D1 & S1 when shifted */}
              {hasDShift && baseD && (
                <>
                  <line x1={baseD.x1} y1={baseD.y1} x2={baseD.x2} y2={baseD.y2} stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="4 3" />
                  <text x={baseD.x2 + 4} y={baseD.y2 + 4} className="text-[11px] font-semibold fill-muted-foreground">
                    {isMacro ? "AD₁" : "D₁"}
                  </text>
                </>
              )}
              {hasSShift && baseS && !(isMacro && state.lrasMode === "keynesian") && (
                <>
                  <line x1={baseS.x1} y1={baseS.y1} x2={baseS.x2} y2={baseS.y2} stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="4 3" />
                  <text x={baseS.x2 + 4} y={baseS.y2} className="text-[11px] font-semibold fill-muted-foreground">
                    {isMacro ? "SRAS₁" : "S₁"}
                  </text>
                </>
              )}

              {/* Primary Demand / AD / MRP */}
              {curD && (
                <>
                  <line x1={curD.x1} y1={curD.y1} x2={curD.x2} y2={curD.y2} stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                  <text x={curD.x2 + 4} y={curD.y2 + 4} className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                    {dLabel}
                  </text>
                </>
              )}

              {/* Primary Supply / SRAS / MPC (hidden in Keynesian LRAS mode) */}
              {curS && !(isMacro && state.lrasMode === "keynesian") && (
                <>
                  <line x1={curS.x1} y1={curS.y1} x2={curS.x2} y2={curS.y2} stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                  <text x={curS.x2 + 4} y={curS.y2} className="text-[11px] font-bold fill-orange-600 dark:fill-orange-400">
                    {sLabel}
                  </text>
                </>
              )}

              {/* Taxed Supply S2 */}
              {sTaxed && (
                <>
                  <line x1={sTaxed.x1} y1={sTaxed.y1} x2={sTaxed.x2} y2={sTaxed.y2} stroke="#c026d3" strokeWidth="2.5" strokeDasharray="5 3" />
                  <text x={sTaxed.x2 + 4} y={sTaxed.y2} className="text-[11px] font-bold fill-fuchsia-600 dark:fill-fuchsia-400">
                    S₂ (S+Tax)
                  </text>
                </>
              )}

              {/* Subsidised Supply S2 */}
              {sSub && (
                <>
                  <line x1={sSub.x1} y1={sSub.y1} x2={sSub.x2} y2={sSub.y2} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
                  <text x={sSub.x2 + 4} y={sSub.y2} className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                    S₂ (S−Sub)
                  </text>
                </>
              )}

              {/* Domestic Trade Subsidy Supply */}
              {tradeSubS && (
                <>
                  <line x1={tradeSubS.x1} y1={tradeSubS.y1} x2={tradeSubS.x2} y2={tradeSubS.y2} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
                  <text x={tradeSubS.x2 + 4} y={tradeSubS.y2} className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                    S_dom + Sub
                  </text>
                </>
              )}

              {/* Externality Shifted Curve */}
              {extLine && (
                <>
                  <line x1={extLine.x1} y1={extLine.y1} x2={extLine.x2} y2={extLine.y2} stroke="#e11d48" strokeWidth="2.5" />
                  <text x={extLine.x2 + 4} y={extLine.y2 + 4} className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
                    {extLabel}
                  </text>
                </>
              )}

              {/* Monopsony MC_L */}
              {mcLabourLine && (
                <>
                  <line x1={mcLabourLine.x1} y1={mcLabourLine.y1} x2={mcLabourLine.x2} y2={mcLabourLine.y2} stroke="#e11d48" strokeWidth="2.4" />
                  <text x={mcLabourLine.x2 + 4} y={mcLabourLine.y2} className="text-[11px] font-bold fill-rose-600 dark:fill-rose-400">
                    MC_L
                  </text>
                </>
              )}

              {/* Price Floor / Ceiling / Minimum Wage horizontal line */}
              {(state.preset === "price_floor" ||
                state.preset === "price_ceiling" ||
                (isLabour && state.labourMode === "min_wage")) &&
                state.priceControl !== null && (() => {
                  const pc = state.priceControl;
                  const qd = Math.max(0, (effD - pc) / state.demandSlope);
                  const qs = Math.max(0, (pc - effS) / state.supplySlope);
                  return (
                    <>
                      <line x1={margin.left} y1={toSvgY(pc)} x2={margin.left + plotWidth} y2={toSvgY(pc)} stroke="#059669" strokeWidth="2.2" strokeDasharray="4 4" />
                      <text x={margin.left + plotWidth + 4} y={toSvgY(pc) + 4} className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                        {isLabour ? "W_min" : state.preset === "price_floor" ? "P_min" : "P_max"}
                      </text>
                      <text x={margin.left - 6} y={toSvgY(pc) + 4} textAnchor="end" className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">
                        {isLabour ? "W_min" : state.preset === "price_floor" ? "P_min" : "P_max"}
                      </text>
                      {/* Qd & Qs drop lines */}
                      <line x1={toSvgX(qd)} y1={toSvgY(pc)} x2={toSvgX(qd)} y2={margin.top + plotHeight} stroke="#059669" strokeDasharray="2 2" strokeWidth="1.2" />
                      <line x1={toSvgX(qs)} y1={toSvgY(pc)} x2={toSvgX(qs)} y2={margin.top + plotHeight} stroke="#059669" strokeDasharray="2 2" strokeWidth="1.2" />
                      <text x={toSvgX(qd)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400">
                        {isLabour ? "Ld" : "Qd"}
                      </text>
                      <text x={toSvgX(qs)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400">
                        {isLabour ? "Ls" : "Qs"}
                      </text>
                    </>
                  );
                })()}

              {/* World Price & Tariff/Quota horizontal lines */}
              {state.preset === "tariff" && (
                <>
                  <line x1={margin.left} y1={toSvgY(state.worldPrice)} x2={margin.left + plotWidth} y2={toSvgY(state.worldPrice)} stroke="#2563eb" strokeWidth="1.8" strokeDasharray="3 3" />
                  <text x={margin.left - 6} y={toSvgY(state.worldPrice) + 4} textAnchor="end" className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400">
                    Pw
                  </text>
                  <text x={margin.left + plotWidth + 4} y={toSvgY(state.worldPrice) + 4} className="text-[10px] font-bold fill-blue-600 dark:fill-blue-400">
                    S_world
                  </text>
                  {state.tariffAmount > 0 && state.tradeMode !== "domestic_subsidy" && (
                    <>
                      <line x1={margin.left} y1={toSvgY(state.worldPrice + state.tariffAmount)} x2={margin.left + plotWidth} y2={toSvgY(state.worldPrice + state.tariffAmount)} stroke="#7c3aed" strokeWidth="2.2" />
                      <text x={margin.left - 6} y={toSvgY(state.worldPrice + state.tariffAmount) + 4} textAnchor="end" className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400">
                        {state.tradeMode === "quota" ? "Pq" : "Pw+t"}
                      </text>
                      <text x={margin.left + plotWidth + 4} y={toSvgY(state.worldPrice + state.tariffAmount) + 4} className="text-[10px] font-bold fill-violet-600 dark:fill-violet-400">
                        {state.tradeMode === "quota" ? "Quota Price" : "S_w+tariff"}
                      </text>
                    </>
                  )}
                </>
              )}

              {/* Initial Equilibrium E1 */}
              {state.preset !== "tariff" && (
                <>
                  <line x1={toSvgX(metrics.initialQ)} y1={toSvgY(metrics.initialP)} x2={toSvgX(metrics.initialQ)} y2={margin.top + plotHeight} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/55" />
                  <line x1={margin.left} y1={toSvgY(metrics.initialP)} x2={toSvgX(metrics.initialQ)} y2={toSvgY(metrics.initialP)} stroke="currentColor" strokeDasharray="3 3" className="text-muted-foreground/55" />
                  <circle cx={toSvgX(metrics.initialQ)} cy={toSvgY(metrics.initialP)} r="4.5" className="fill-orange-500 stroke-background stroke-2" />
                  <text x={toSvgX(metrics.initialQ) + 6} y={toSvgY(metrics.initialP) - 6} className="text-[11px] font-bold fill-foreground">
                    {isExt ? "Em" : "E₁"}
                  </text>
                  <text x={toSvgX(metrics.initialQ)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-semibold fill-muted-foreground">
                    {isMacro ? "Y₁" : isLabour ? "L*" : isExt ? "Qm" : "Q₁"}
                  </text>
                  <text x={margin.left - 6} y={toSvgY(metrics.initialP) + 4} textAnchor="end" className="text-[11px] font-semibold fill-muted-foreground">
                    {isMacro ? "PL₁" : isLabour ? "W*" : isExt ? "Pm" : "P₁"}
                  </text>
                </>
              )}

              {/* Secondary Equilibrium E2 (when shifted / taxed / subsidised / externality / monopsony) */}
              {(hasTax ||
                hasSub ||
                hasDShift ||
                hasSShift ||
                (isExt && state.externalityCost > 0) ||
                (isLabour && state.labourMode === "monopsony")) && (
                <>
                  <line x1={toSvgX(metrics.eqQ)} y1={toSvgY(metrics.eqP)} x2={toSvgX(metrics.eqQ)} y2={margin.top + plotHeight} stroke="currentColor" strokeDasharray="3 3" className="text-primary/70" />
                  <line x1={margin.left} y1={toSvgY(metrics.eqP)} x2={toSvgX(metrics.eqQ)} y2={toSvgY(metrics.eqP)} stroke="currentColor" strokeDasharray="3 3" className="text-primary/70" />
                  <circle cx={toSvgX(metrics.eqQ)} cy={toSvgY(metrics.eqP)} r="4.5" className="fill-fuchsia-600 stroke-background stroke-2" />
                  <text x={toSvgX(metrics.eqQ) - 18} y={toSvgY(metrics.eqP) - 6} className="text-[11px] font-bold fill-fuchsia-600 dark:fill-fuchsia-400">
                    {isExt ? "E*" : isLabour ? "Em" : "E₂"}
                  </text>
                  <text x={toSvgX(metrics.eqQ)} y={margin.top + plotHeight + 16} textAnchor="middle" className="text-[11px] font-bold fill-purple-600 dark:fill-purple-400">
                    {isMacro ? "Y₂" : isLabour ? "Lm" : isExt ? "Q*" : "Q₂"}
                  </text>
                  <text x={margin.left - 6} y={toSvgY(metrics.eqP) + 4} textAnchor="end" className="text-[11px] font-bold fill-purple-600 dark:fill-purple-400">
                    {isMacro ? "PL₂" : isLabour ? "Wm" : isExt ? "P*" : "P₂"}
                  </text>
                </>
              )}
            </>
          );
        })()}
      </svg>

      {/* Hover tooltip for shaded polygon */}
      {hoveredPolygon && (
        <div className="absolute top-3 right-3 max-w-xs rounded-lg border border-border/80 bg-background/95 p-2.5 shadow-md backdrop-blur-sm text-xs pointer-events-none transition-all">
          <p className="font-semibold text-foreground flex items-center justify-between gap-2">
            <span>{hoveredPolygon.label}</span>
            <span className="font-mono text-primary font-bold">
              {hoveredPolygon.areaValue.toFixed(1)} u²
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{hoveredPolygon.description}</p>
        </div>
      )}
    </div>
  );
}
