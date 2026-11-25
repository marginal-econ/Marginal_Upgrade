import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookMarked,
  CheckCircle2,
  Copy,
  Download,
  LineChart,
  RotateCcw,
  Sliders,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { InteractiveDiagramCanvas } from "@/components/diagram-lab/interactive-diagram-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildDiagramTag,
  CAMBRIDGE_DIAGRAM_DRILLS,
  calculateMetrics,
  DEFAULT_DIAGRAM_STATES,
  DIAGRAM_PRESET_META,
  PRESET_CATEGORIES,
} from "@/lib/diagram-lab/math";
import type {
  DiagramPreset,
  DiagramState,
  ExternalityMode,
  LabourMode,
  LrasMode,
  TradeMode,
} from "@/lib/diagram-lab/types";
import { cn } from "@/lib/utils";

const VALID_PRESETS = new Set<string>(Object.keys(DEFAULT_DIAGRAM_STATES));

export const Route = createFileRoute("/_authenticated/diagram-lab")({
  validateSearch: (search: Record<string, unknown>): { preset?: DiagramPreset } => ({
    preset:
      typeof search.preset === "string" && VALID_PRESETS.has(search.preset)
        ? (search.preset as DiagramPreset)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Interactive Diagram CAD Library — Cambridge 9708 Economics" },
      {
        name: "description",
        content:
          "Interactive vector economics CAD library for Cambridge 9708 AS & A Level. Dynamically construct all 19 core micro, macro, and international trade diagrams with live metrics.",
      },
    ],
  }),
  component: DiagramLabPage,
});

function DiagramLabPage() {
  const routeSearch = Route.useSearch();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const initialPreset: DiagramPreset = routeSearch.preset ?? "tax";
  const [activeTab, setActiveTab] = useState<"sandbox" | "drills">("sandbox");
  const [preset, setPreset] = useState<DiagramPreset>(initialPreset);
  const [state, setState] = useState<DiagramState>(DEFAULT_DIAGRAM_STATES[initialPreset]);

  useEffect(() => {
    if (routeSearch.preset) {
      setPreset(routeSearch.preset);
      setState(DEFAULT_DIAGRAM_STATES[routeSearch.preset]);
      setActiveTab("sandbox");
    }
  }, [routeSearch.preset]);

  // Drill mode state
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const activeDrill = CAMBRIDGE_DIAGRAM_DRILLS[activeDrillIndex]!;
  const [drillEvaluated, setDrillEvaluated] = useState(false);

  const handlePresetChange = (newPreset: DiagramPreset) => {
    setPreset(newPreset);
    setState(DEFAULT_DIAGRAM_STATES[newPreset]);
    setDrillEvaluated(false);
  };

  const metrics = useMemo(() => calculateMetrics(state), [state]);
  const meta = DIAGRAM_PRESET_META[state.preset];

  const drillResult = useMemo(
    () => activeDrill.targetCheck(state, metrics),
    [activeDrill, state, metrics],
  );

  const resetCurrent = () => {
    setState(DEFAULT_DIAGRAM_STATES[state.preset]);
    setDrillEvaluated(false);
    toast.info("Diagram reset to default Cambridge 9708 calibration.");
  };

  const copyDiagramTag = () => {
    const tag = buildDiagramTag(state, metrics);
    navigator.clipboard.writeText(tag);
    toast.success("Copied Cambridge [DIAGRAM: ...] Tag! Paste it directly into your essay.");
  };

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cambridge-9708-${state.preset}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${meta.shortTitle} as vector SVG.`);
  };

  const usesLinearSD =
    state.preset === "supply_demand" ||
    state.preset === "tax" ||
    state.preset === "subsidy" ||
    state.preset === "price_floor" ||
    state.preset === "price_ceiling" ||
    state.preset === "externality" ||
    state.preset === "labour_market" ||
    state.preset === "macro_ad_as" ||
    state.preset === "tariff" ||
    state.preset === "forex";

  return (
    <>
      <PageHeader
        title="Diagram CAD Library"
        description="Interactive vector economics studio for Cambridge 9708 AS & A Level — 19 parametric micro, macro & trade models with live welfare, profit, and elasticity calculations."
        action={
          <div className="flex items-center gap-2">
            <Link to="/diagrams">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <BookMarked className="size-3.5" /> Static Reference Library
              </Button>
            </Link>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              19 Syllabus Models
            </Badge>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              const tab = val as "sandbox" | "drills";
              setActiveTab(tab);
              if (tab === "drills") {
                const targetPreset = activeDrill.preset;
                setPreset(targetPreset);
                setState(DEFAULT_DIAGRAM_STATES[targetPreset]);
                setDrillEvaluated(false);
              }
            }}
          >
            <TabsList className="grid grid-cols-2 w-72">
              <TabsTrigger value="sandbox" className="flex items-center gap-1.5 text-xs">
                <Sliders className="size-3.5" /> CAD Sandbox (19)
              </TabsTrigger>
              <TabsTrigger value="drills" className="flex items-center gap-1.5 text-xs">
                <Award className="size-3.5 text-amber-500" /> Exam Drills ({CAMBRIDGE_DIAGRAM_DRILLS.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetCurrent} className="text-xs">
              <RotateCcw className="size-3.5 mr-1" /> Reset
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSvg} className="text-xs">
              <Download className="size-3.5 mr-1" /> Export SVG
            </Button>
            <Button variant="secondary" size="sm" onClick={copyDiagramTag} className="text-xs">
              <Copy className="size-3.5 mr-1" /> Copy [DIAGRAM] Tag
            </Button>
          </div>
        </div>

        {/* DRILL HEADER (If in drill mode) */}
        {activeTab === "drills" && (
          <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  >
                    Drill {activeDrillIndex + 1} of {CAMBRIDGE_DIAGRAM_DRILLS.length}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {activeDrill.paperReference}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {CAMBRIDGE_DIAGRAM_DRILLS.map((d, idx) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setActiveDrillIndex(idx);
                        setPreset(d.preset);
                        setState(DEFAULT_DIAGRAM_STATES[d.preset]);
                        setDrillEvaluated(false);
                      }}
                      className={cn(
                        "size-7 rounded-md text-xs font-semibold transition-all",
                        activeDrillIndex === idx
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                {activeDrill.title}
              </CardTitle>
              <CardDescription className="text-xs text-foreground/80 leading-relaxed">
                {activeDrill.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-background/80">
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-muted-foreground">Diagnostic Result: </span>
                  {drillEvaluated ? (
                    drillResult.passed ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Full Cambridge Marks (3/3)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <XCircle className="size-3.5" /> Partial ({drillResult.score}/3)
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground">
                      Adjust curves on canvas and click Evaluate
                    </span>
                  )}
                  {drillEvaluated && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      {drillResult.feedback}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setDrillEvaluated(true)}
                  className="shrink-0 text-xs font-semibold"
                >
                  Evaluate Drill
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT: CANVAS VIEW */}
          <div className="xl:col-span-7 space-y-4 min-w-0">
            <Card className="border-border shadow-xs overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <LineChart className="size-4 text-primary shrink-0" />
                    <span className="truncate">{meta.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {meta.level}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    {meta.syllabusTopics}
                  </CardDescription>
                </div>
                {activeTab === "sandbox" && (
                  <Select value={preset} onValueChange={(v) => handlePresetChange(v as DiagramPreset)}>
                    <SelectTrigger className="w-full sm:w-56 h-8 text-xs font-medium bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {PRESET_CATEGORIES.map((group) => (
                        <SelectGroup key={group.category}>
                          <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {group.category} ({group.items.length})
                          </SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="text-xs">
                              {item.shortTitle}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent className="p-4 bg-card flex justify-center">
                <InteractiveDiagramCanvas
                  svgRef={svgRef}
                  state={state}
                  metrics={metrics}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* DYNAMIC 4-CARD KPI STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {metrics.kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="p-3 rounded-lg border border-border bg-muted/20 space-y-1"
                >
                  <span className="text-[11px] text-muted-foreground font-medium block truncate">
                    {card.label}
                  </span>
                  <p
                    className={cn(
                      "text-base font-bold font-mono truncate",
                      card.tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
                      card.tone === "rose" && "text-rose-600 dark:text-rose-400",
                      card.tone === "purple" && "text-purple-600 dark:text-purple-400",
                      card.tone === "amber" && "text-amber-600 dark:text-amber-400",
                      (!card.tone || card.tone === "default") && "text-foreground",
                    )}
                  >
                    {card.value}
                  </p>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {card.subtext}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: CONTEXTUAL INTERACTIVE CONTROLS */}
          <div className="xl:col-span-5 space-y-4 min-w-0">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  Curve Parameters &amp; Policy Controls
                </CardTitle>
                <CardDescription className="text-xs">{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 text-xs">
                {/* ── PPC CONTROLS ── */}
                {state.preset === "ppc" && (
                  <>
                    <SliderControl
                      label={`Opportunity Cost Curvature (${state.ppcCurvature.toFixed(1)})`}
                      badge={state.ppcCurvature > 1.25 ? "Concave (Increasing)" : "Linear (Constant)"}
                      value={state.ppcCurvature}
                      min={1.0}
                      max={3.5}
                      step={0.1}
                      onChange={(v) => setState((s) => ({ ...s, ppcCurvature: v }))}
                    />
                    <SliderControl
                      label={`Consumer Goods Growth (ΔX: ${state.ppcGrowthX >= 0 ? `+${state.ppcGrowthX}` : state.ppcGrowthX})`}
                      badge="Pivotal / Outward"
                      value={state.ppcGrowthX}
                      min={-15}
                      max={18}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, ppcGrowthX: v }))}
                    />
                    <SliderControl
                      label={`Capital Goods Growth (ΔY: ${state.ppcGrowthY >= 0 ? `+${state.ppcGrowthY}` : state.ppcGrowthY})`}
                      badge="Pivotal / Outward"
                      value={state.ppcGrowthY}
                      min={-15}
                      max={18}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, ppcGrowthY: v }))}
                    />
                    <SliderControl
                      label="Resource Allocation Mix (Point A)"
                      badge={`${Math.round(state.ppcPointT * 100)}% Consumer`}
                      value={state.ppcPointT}
                      min={0.12}
                      max={0.88}
                      step={0.02}
                      onChange={(v) => setState((s) => ({ ...s, ppcPointT: v }))}
                    />
                    <SliderControl
                      label="Productive Efficiency Scale"
                      badge={
                        state.ppcEfficiency < 0.97
                          ? "Inside (Unemployed)"
                          : state.ppcEfficiency > 1.03
                            ? "Outside (Unattainable)"
                            : "On Frontier"
                      }
                      value={state.ppcEfficiency}
                      min={0.55}
                      max={1.18}
                      step={0.02}
                      onChange={(v) => setState((s) => ({ ...s, ppcEfficiency: v }))}
                    />
                  </>
                )}

                {/* ── FIRM THEORY CONTROLS (MONOPOLY / PERFECT COMP / MONOPOLISTIC / KINKED) ── */}
                {(state.preset === "monopoly" || state.preset === "monopolistic_comp") && (
                  <>
                    <SliderControl
                      label={`Demand (AR) Shift (${state.demandShift >= 0 ? `+${state.demandShift}` : state.demandShift})`}
                      badge={state.preset === "monopolistic_comp" ? "Entry shifts AR left" : "Market demand"}
                      value={state.demandShift}
                      min={-24}
                      max={20}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, demandShift: v }))}
                    />
                    <SliderControl
                      label={`AR Elasticity Slope (${state.demandSlope.toFixed(2)})`}
                      badge={state.demandSlope >= 0.85 ? "Inelastic (Monopoly)" : "Elastic (Substitutes)"}
                      value={state.demandSlope}
                      min={0.45}
                      max={1.35}
                      step={0.05}
                      onChange={(v) => setState((s) => ({ ...s, demandSlope: v }))}
                    />
                    <SliderControl
                      label={`Average Cost (AC) Base: £${state.firmFixedCost}`}
                      badge="Shifts AC & MC"
                      value={state.firmFixedCost}
                      min={14}
                      max={52}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, firmFixedCost: v }))}
                    />
                  </>
                )}

                {state.preset === "perfect_competition" && (
                  <>
                    <SliderControl
                      label={`Market Price (P = AR = MR): £${state.marketPrice}`}
                      badge={
                        state.marketPrice > state.firmFixedCost + 2
                          ? "SR Supernormal Profit"
                          : state.marketPrice < state.firmFixedCost - 2
                            ? "SR Economic Loss"
                            : "LR Normal Profit"
                      }
                      value={state.marketPrice}
                      min={22}
                      max={76}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, marketPrice: v }))}
                    />
                    <SliderControl
                      label={`Minimum Average Cost (min AC): £${state.firmFixedCost}`}
                      badge="LR Equilibrium P"
                      value={state.firmFixedCost}
                      min={22}
                      max={54}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, firmFixedCost: v }))}
                    />
                  </>
                )}

                {state.preset === "kinked_demand" && (
                  <SliderControl
                    label={`Marginal Cost (MC) Shift (${state.mcShift >= 0 ? `+${state.mcShift}` : state.mcShift})`}
                    badge={state.mcShift >= -12 && state.mcShift <= 11 ? "Inside MR Gap → Rigid P*" : "Outside Gap → P Changes"}
                    value={state.mcShift}
                    min={-18}
                    max={22}
                    step={1}
                    onChange={(v) => setState((s) => ({ ...s, mcShift: v }))}
                    hint="Keep MC between -12 and +11 to prove why oligopolists keep price rigid at P* despite rising costs."
                  />
                )}

                {/* ── PHILLIPS CURVE CONTROLS ── */}
                {state.preset === "phillips_curve" && (
                  <>
                    <SliderControl
                      label={`Current Unemployment Rate: ${state.unemploymentRate.toFixed(1)}%`}
                      badge="Movement along SRPC"
                      value={state.unemploymentRate}
                      min={1.8}
                      max={9.0}
                      step={0.1}
                      onChange={(v) => setState((s) => ({ ...s, unemploymentRate: v }))}
                    />
                    <SliderControl
                      label={`Natural Rate / NAIRU (LRPC): ${state.nairu.toFixed(1)}%`}
                      badge="Supply-side shift"
                      value={state.nairu}
                      min={3.0}
                      max={7.5}
                      step={0.1}
                      onChange={(v) => setState((s) => ({ ...s, nairu: v }))}
                    />
                    <SliderControl
                      label={`Inflation Expectations Shift (${state.srpcShift >= 0 ? `+${state.srpcShift.toFixed(1)}` : state.srpcShift.toFixed(1)}%)`}
                      badge="Shifts SRPC"
                      value={state.srpcShift}
                      min={-1.5}
                      max={5.0}
                      step={0.2}
                      onChange={(v) => setState((s) => ({ ...s, srpcShift: v }))}
                    />
                  </>
                )}

                {/* ── MONEY MARKET CONTROLS ── */}
                {state.preset === "money_market" && (
                  <>
                    <SliderControl
                      label={`Money Supply Shift (ΔMs: ${state.moneySupplyShift >= 0 ? `+${state.moneySupplyShift}` : state.moneySupplyShift})`}
                      badge={state.moneySupplyShift > 0 ? "Expansionary" : state.moneySupplyShift < 0 ? "Contractionary" : "Unchanged"}
                      value={state.moneySupplyShift}
                      min={-24}
                      max={30}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, moneySupplyShift: v }))}
                    />
                    <SliderControl
                      label={`Liquidity Preference Shift (ΔLp: ${state.demandShift >= 0 ? `+${state.demandShift}` : state.demandShift})`}
                      badge="Money demand"
                      value={state.demandShift}
                      min={-18}
                      max={18}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, demandShift: v }))}
                    />
                  </>
                )}

                {/* ── LORENZ CURVE CONTROLS ── */}
                {state.preset === "lorenz_curve" && (
                  <>
                    <SliderControl
                      label={`Income Inequality Exponent (${state.giniExponent.toFixed(2)})`}
                      badge={`Gini = ${metrics.giniCoefficient.toFixed(3)}`}
                      value={state.giniExponent}
                      min={1.0}
                      max={6.0}
                      step={0.1}
                      onChange={(v) => setState((s) => ({ ...s, giniExponent: v }))}
                    />
                    <SliderControl
                      label={`Post-Tax Comparison Curve (${state.giniCompareExponent < 1 ? "Off" : state.giniCompareExponent.toFixed(2)})`}
                      badge="Fiscal redistribution"
                      value={state.giniCompareExponent}
                      min={0}
                      max={5.0}
                      step={0.1}
                      onChange={(v) => setState((s) => ({ ...s, giniCompareExponent: v }))}
                      hint="Set to 0 to hide, or lower than the primary curve to show progressive taxation reducing Gini."
                    />
                  </>
                )}

                {/* ── J-CURVE CONTROLS ── */}
                {state.preset === "j_curve" && (
                  <>
                    <SliderControl
                      label={`Short-Run Deterioration Depth (${state.jCurveDip})`}
                      badge="Short-run inelasticity"
                      value={state.jCurveDip}
                      min={5}
                      max={35}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, jCurveDip: v }))}
                    />
                    <SliderControl
                      label={`Long-Run Marshall-Lerner Recovery (+${state.jCurveRecovery})`}
                      badge={`|PEDx|+|PEDm| ≈ ${metrics.marshallLernerSum.toFixed(2)}`}
                      value={state.jCurveRecovery}
                      min={0}
                      max={42}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, jCurveRecovery: v }))}
                    />
                  </>
                )}

                {/* ── LINEAR S&D / MACRO / TRADE / LABOUR / EXTERNALITY CONTROLS ── */}
                {usesLinearSD && (
                  <>
                    {/* Mode toggles where applicable */}
                    {state.preset === "externality" && (
                      <div className="space-y-1.5 pb-2 border-b border-border/60">
                        <Label className="text-xs font-semibold">Externality Type (All 4 Cambridge Models)</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              ["neg_prod", "Neg. Production (MSC>MPC)"],
                              ["pos_cons", "Pos. Consumption (Merit)"],
                              ["neg_cons", "Neg. Consumption (Demerit)"],
                              ["pos_prod", "Pos. Production (MSC<MPC)"],
                            ] as [ExternalityMode, string][]
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setState((s) => ({ ...s, externalityMode: mode }))}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors text-left",
                                state.externalityMode === mode
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {state.preset === "macro_ad_as" && (
                      <div className="space-y-1.5 pb-2 border-b border-border/60">
                        <Label className="text-xs font-semibold">LRAS School of Thought</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              ["classical", "Classical (Vertical LRAS)"],
                              ["keynesian", "Keynesian (3-Range L-Curve)"],
                            ] as [LrasMode, string][]
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setState((s) => ({ ...s, lrasMode: mode }))}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                                state.lrasMode === mode
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {state.preset === "labour_market" && (
                      <div className="space-y-1.5 pb-2 border-b border-border/60">
                        <Label className="text-xs font-semibold">Labour Market Structure</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["competitive", "Competitive"],
                              ["min_wage", "Min. Wage"],
                              ["monopsony", "Monopsony"],
                            ] as [LabourMode, string][]
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setState((s) => ({ ...s, labourMode: mode }))}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                                state.labourMode === mode
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {state.preset === "tariff" && (
                      <div className="space-y-1.5 pb-2 border-b border-border/60">
                        <Label className="text-xs font-semibold">Protectionist Policy Tool</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["tariff", "Import Tariff"],
                              ["quota", "Import Quota"],
                              ["domestic_subsidy", "Trade Subsidy"],
                            ] as [TradeMode, string][]
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setState((s) => ({ ...s, tradeMode: mode }))}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                                state.tradeMode === mode
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Common Slopes */}
                    <SliderControl
                      label={
                        state.preset === "macro_ad_as"
                          ? `AD Slope (${state.demandSlope.toFixed(2)})`
                          : `Demand Elasticity Slope (${state.demandSlope.toFixed(2)})`
                      }
                      badge={state.demandSlope >= 1.0 ? "Inelastic" : "Elastic"}
                      value={state.demandSlope}
                      min={0.35}
                      max={1.5}
                      step={0.05}
                      onChange={(v) => setState((s) => ({ ...s, demandSlope: v }))}
                    />

                    {!(state.preset === "macro_ad_as" && state.lrasMode === "keynesian") && (
                      <SliderControl
                        label={
                          state.preset === "macro_ad_as"
                            ? `SRAS Slope (${state.supplySlope.toFixed(2)})`
                            : `Supply Elasticity Slope (${state.supplySlope.toFixed(2)})`
                        }
                        badge={state.supplySlope >= 1.0 ? "Inelastic" : "Elastic"}
                        value={state.supplySlope}
                        min={0.35}
                        max={1.5}
                        step={0.05}
                        onChange={(v) => setState((s) => ({ ...s, supplySlope: v }))}
                      />
                    )}

                    <SliderControl
                      label={
                        state.preset === "macro_ad_as"
                          ? `Aggregate Demand Shift ΔAD (${state.demandShift >= 0 ? `+${state.demandShift}` : state.demandShift})`
                          : `Demand Shift ΔD (${state.demandShift >= 0 ? `+${state.demandShift}` : state.demandShift})`
                      }
                      badge={state.demandShift > 0 ? "Right" : state.demandShift < 0 ? "Left" : "Zero"}
                      value={state.demandShift}
                      min={-25}
                      max={25}
                      step={1}
                      onChange={(v) => setState((s) => ({ ...s, demandShift: v }))}
                    />

                    {(state.preset === "supply_demand" ||
                      state.preset === "forex" ||
                      (state.preset === "macro_ad_as" && state.lrasMode === "classical")) && (
                      <SliderControl
                        label={
                          state.preset === "macro_ad_as"
                            ? `SRAS Shift ΔSRAS (${state.supplyShift >= 0 ? `+${state.supplyShift}` : state.supplyShift})`
                            : `Supply Shift ΔS (${state.supplyShift >= 0 ? `+${state.supplyShift}` : state.supplyShift})`
                        }
                        badge={state.supplyShift > 0 ? "Inward (Cost-Push)" : state.supplyShift < 0 ? "Outward" : "Zero"}
                        value={state.supplyShift}
                        min={-22}
                        max={22}
                        step={1}
                        onChange={(v) => setState((s) => ({ ...s, supplyShift: v }))}
                      />
                    )}

                    {state.preset === "macro_ad_as" && (
                      <SliderControl
                        label={`LRAS Capacity Shift (Y_fe = ${(state.lrasOutput + state.lrasShift).toFixed(0)})`}
                        badge={state.lrasShift > 0 ? "LR Growth" : "Static"}
                        value={state.lrasShift}
                        min={-15}
                        max={22}
                        step={1}
                        onChange={(v) => setState((s) => ({ ...s, lrasShift: v }))}
                      />
                    )}

                    {/* Policy-specific wedges */}
                    {state.preset === "tax" && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <SliderControl
                          label={`Specific Indirect Tax: £${state.taxAmount}`}
                          badge={`Yield: £${metrics.taxRevenue.toFixed(0)}`}
                          value={state.taxAmount}
                          min={0}
                          max={35}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, taxAmount: v }))}
                        />
                        {state.taxAmount > 0 && (
                          <div className="rounded-md bg-muted/40 p-2.5 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span>Consumer Tax Burden:</span>
                              <span className="font-semibold">{metrics.consumerTaxBurdenPct.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Producer Tax Burden:</span>
                              <span className="font-semibold">{metrics.producerTaxBurdenPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-amber-500/30 rounded-full overflow-hidden flex">
                              <div
                                className="bg-purple-600 h-full"
                                style={{ width: `${metrics.consumerTaxBurdenPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {state.preset === "subsidy" && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <SliderControl
                          label={`Per-Unit Subsidy: £${state.subsidyAmount}`}
                          badge={`Cost: £${metrics.subsidyCost.toFixed(0)}`}
                          value={state.subsidyAmount}
                          min={0}
                          max={32}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, subsidyAmount: v }))}
                        />
                      </div>
                    )}

                    {(state.preset === "price_floor" ||
                      state.preset === "price_ceiling" ||
                      (state.preset === "labour_market" && state.labourMode === "min_wage")) && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <SliderControl
                          label={
                            state.preset === "labour_market"
                              ? `National Minimum Wage (W_min): £${state.priceControl ?? 62}`
                              : state.preset === "price_floor"
                                ? `Minimum Price Floor (P_min): £${state.priceControl ?? 65}`
                                : `Maximum Price Ceiling (P_max): £${state.priceControl ?? 35}`
                          }
                          badge={
                            state.preset === "price_ceiling"
                              ? metrics.shortageOrSurplus < 0
                                ? `Shortage: ${Math.abs(metrics.shortageOrSurplus).toFixed(1)}`
                                : "Non-binding"
                              : metrics.shortageOrSurplus > 0
                                ? `Surplus: +${metrics.shortageOrSurplus.toFixed(1)}`
                                : "Non-binding"
                          }
                          value={state.priceControl ?? 50}
                          min={18}
                          max={82}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, priceControl: v }))}
                        />
                      </div>
                    )}

                    {state.preset === "tariff" && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <SliderControl
                          label={`World Price (Pw): £${state.worldPrice}`}
                          badge="Free-trade price"
                          value={state.worldPrice}
                          min={16}
                          max={42}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, worldPrice: v }))}
                        />
                        <SliderControl
                          label={
                            state.tradeMode === "quota"
                              ? `Quota Price Wedge: £${state.tariffAmount}`
                              : state.tradeMode === "domestic_subsidy"
                                ? `Domestic Production Subsidy: £${state.tariffAmount}`
                                : `Import Tariff Rate: £${state.tariffAmount}`
                          }
                          badge={`Imports: ${metrics.importsWithTariff.toFixed(1)} u`}
                          value={state.tariffAmount}
                          min={0}
                          max={28}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, tariffAmount: v }))}
                        />
                      </div>
                    )}

                    {state.preset === "externality" && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <SliderControl
                          label={`Externality Divergence (MEC / MEB): £${state.externalityCost}`}
                          badge={`DWL: ${metrics.deadweightLoss.toFixed(1)} u²`}
                          value={state.externalityCost}
                          min={0}
                          max={35}
                          step={1}
                          onChange={(v) => setState((s) => ({ ...s, externalityCost: v }))}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* CAMBRIDGE EXAMINER TIP BOX */}
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Cambridge 9708 Examiner Convention:
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Examiners award up to <strong>3–4 marks</strong> for accurately labelled diagrams.
                Always label both axes (<strong>{meta.yAxis}</strong> vs <strong>{meta.xAxis}</strong>),
                draw dashed drop-lines to equilibria, and explain the exact shift or shaded area in your
                written analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SliderControl({
  label,
  badge,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  badge?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center gap-2 font-medium">
        <Label className="text-xs">{label}</Label>
        {badge && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{badge}</span>}
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([val]) => onChange(val ?? value)}
      />
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}
