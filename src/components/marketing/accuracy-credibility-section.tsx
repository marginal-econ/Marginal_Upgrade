import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

interface AuditedScript {
  id: string;
  paper: string;
  tariff: "8m" | "12m" | "20m";
  question: string;
  source: string;
  cambridgeMark: number;
  totalMarks: number;
  cambridgeBand: string;
  marginalMark: number;
  marginalBand: string;
  generalAiMark: number;
  varianceNote: string;
  examinerNotes: string;
}

const AUDITED_SCRIPTS: AuditedScript[] = [
  {
    id: "p2-12m-merit",
    paper: "Cambridge 9708/22 (AS Level)",
    tariff: "12m",
    question:
      "Assess whether governments should always support the provision of merit goods in markets such as education or health care.",
    source: "Cambridge International ECR (Examiner Candidate Responses)",
    cambridgeMark: 10,
    totalMarks: 12,
    cambridgeBand: "Level 3 (AO1 2/2, AO2 6/6, AO3 2/4)",
    marginalMark: 10,
    marginalBand: "Level 3 (AO1 2/2, AO2 6/6, AO3 2/4)",
    generalAiMark: 12,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Candidate developed strong two-sided analysis of subsidies and direct provision, but the final evaluation did not prioritize opportunity costs against fiscal deficits. Marginal correctly capped AO3 at 2/4, whereas raw LLMs gave 12/12.",
  },
  {
    id: "p2-8m-subsidy",
    paper: "Cambridge 9708/22 (AS Level)",
    tariff: "8m",
    question:
      "Explain, using an economic diagram, how a government subsidy on solar panels affects consumer surplus and producer surplus.",
    source: "Cambridge International ECR (June 2023 Series)",
    cambridgeMark: 6,
    totalMarks: 8,
    cambridgeBand: "Level 2 (AO1 2/2, AO2 4/6)",
    marginalMark: 6,
    marginalBand: "Level 2 (AO1 2/2, AO2 4/6)",
    generalAiMark: 8,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Diagram correctly plotted shift in supply and welfare surplus changes. However, explanation of relative price elasticity determining the incidence was incomplete. Marginal avoided unwarranted AO3 inflation and scored 6/8.",
  },
  {
    id: "p4-20m-monopoly",
    paper: "Cambridge 9708/42 (A Level)",
    tariff: "20m",
    question:
      "Evaluate whether contestable monopoly markets always lead to dynamic efficiency and consumer welfare gains.",
    source: "Cambridge International ECR (A2 Paper 4)",
    cambridgeMark: 17,
    totalMarks: 20,
    cambridgeBand: "Level 4 (AO1/2 11/12, AO3 6/8)",
    marginalMark: 16,
    marginalBand: "Level 4 (AO1/2 10/12, AO3 6/8)",
    generalAiMark: 20,
    varianceNote: "Within 1 Mark (5% variance)",
    examinerNotes:
      "Thorough multi-market comparative analysis featuring hit-and-run entry and sunk costs. Evaluative synthesis recognized regulatory barriers. Calibrated within 1 mark of Cambridge Principal Examiner.",
  },
  {
    id: "p4-20m-floating",
    paper: "Cambridge 9708/42 (A Level)",
    tariff: "20m",
    question:
      "Discuss whether a floating exchange rate is the most effective policy mechanism to correct a persistent current account deficit.",
    source: "Cambridge March 2025 Paper 4 Series",
    cambridgeMark: 9,
    totalMarks: 20,
    cambridgeBand: "Level 2 (AO1/2 7/12, AO3 2/8)",
    marginalMark: 9,
    marginalBand: "Level 2 (AO1/2 7/12, AO3 2/8)",
    generalAiMark: 15,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Student provided descriptive explanation of Marshall-Lerner and J-curve but failed to evaluate expenditure-reducing vs expenditure-switching alternatives. Raw AI awarded 15/20; Marginal correctly applied Cambridge Level 2 criteria.",
  },
];

export function AccuracyCredibilitySection({ className }: { className?: string }) {
  const [selectedScriptId, setSelectedScriptId] = useState<string>(AUDITED_SCRIPTS[0].id);

  const selectedScript =
    AUDITED_SCRIPTS.find((s) => s.id === selectedScriptId) || AUDITED_SCRIPTS[0];

  return (
    <section
      id="benchmarks"
      className={cn(
        "relative scroll-mt-20 border-b-[1.5px] border-ink bg-card/60 px-4 py-16 sm:px-6 md:px-10 lg:px-12 xl:px-16 lg:py-24 overflow-hidden",
        className
      )}
    >
      <div id="examiner-accuracy" className="absolute -top-20" aria-hidden="true" />
      <CosmicAtmosphere variant="default" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px]">
        {/* ── Section Header ── */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3 shadow-2xs">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Empirical Cambridge 9708 Benchmark · 30 Real Exam Scripts</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Audited for Strict Cambridge Examiner Accuracy
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Generic AI models hallucinate marks, reward repetitive length, and inflate grades by up to 40%. Marginal is calibrated against official Cambridge Examiner Candidate Responses (ECRs) to deliver pitch-accurate, level-banded marking.
          </p>
        </div>

        {/* ── Key Empirical Benchmark Cards ── */}
        <div className="mt-12 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Overall Alignment */}
          <div className="rounded-2xl border border-primary/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-primary/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Senior Examiner Match</span>
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">89.6%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Score Align</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Audited against 30 authentic Cambridge handwritten candidate responses with a Mean Absolute Error of only 1.5 marks.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>30 ECR Scripts Audited</span>
            </div>
          </div>

          {/* Card 2: 12-Mark AS Alignment */}
          <div className="rounded-2xl border border-blue-500/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-blue-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">12-Mark AS Evaluative</span>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Paper 2</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">91.7%</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Accuracy</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                1.00 Mark Mean Error. 100% of tested scripts graded within ±2 marks of Cambridge Senior Examiners; 75% exact or ±1.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Scale className="size-3.5 text-blue-500 shrink-0" />
              <span>Table B Level Descriptor Gated</span>
            </div>
          </div>

          {/* Card 3: 8-Mark AS Alignment */}
          <div className="rounded-2xl border border-purple-500/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-purple-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">8-Mark AS Analytical</span>
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">Paper 2</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">90.6%</span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Accuracy</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                0.75 Mark Mean Error. 100% within ±1 mark. Strictly isolates analytical chains (AO1/AO2) with zero false evaluation bleed.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Target className="size-3.5 text-purple-500 shrink-0" />
              <span>Zero Evaluation Inflation</span>
            </div>
          </div>

          {/* Card 4: 20-Mark A-Level Extended Alignment */}
          <div className="rounded-2xl border border-amber-500/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-amber-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">20-Mark A-Level Extended</span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Paper 4</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">86.3%</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Accuracy</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                1.83 Mark Mean Error. 75% within ±2 marks of Cambridge Principal Examiners across Section B evaluative essays.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Award className="size-3.5 text-amber-500 shrink-0" />
              <span>Table A &amp; Table B Calibrated</span>
            </div>
          </div>
        </div>

        {/* ── Interactive Script Audit Deep-Dive ── */}
        <div className="mt-12 rounded-2xl border border-border bg-card/95 p-5 sm:p-7 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <span>Real Cambridge ECR Script Calibration Inspector</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspect how Marginal's examiner engine performs against official Cambridge International examiner marks.
              </p>
            </div>

            {/* Script Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/70 p-1 rounded-xl border border-border">
              {AUDITED_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => setSelectedScriptId(script.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    selectedScriptId === script.id
                      ? "bg-background text-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      script.tariff === "12m"
                        ? "bg-blue-500"
                        : script.tariff === "8m"
                        ? "bg-purple-500"
                        : "bg-amber-500"
                    )}
                  />
                  <span>{script.tariff}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Script Details */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Script Context & Prompt */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                    {selectedScript.paper}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/25 text-[10px] font-bold">
                    Tariff: {selectedScript.tariff}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {selectedScript.source}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground leading-snug">
                  “{selectedScript.question}”
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-primary" />
                  <span>Senior Cambridge Examiner Commentary &amp; Calibration</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedScript.examinerNotes}
                </p>
              </div>

              {/* 4 Core Calibrated Safeguards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Deterministic Caps</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Caps one-sided "best method" essays to L2 Max 4 marks.
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Diagram Gating</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Requires valid economic diagram analysis for L3/L4 marks.
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Multi-Band Anchors</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Anchored to High &amp; Middle Cambridge exemplar pairs.
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Zero Repetition</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    100% unique, non-repetitive feedback guaranteed.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Comparative Mark Matrix */}
            <div className="lg:col-span-5 rounded-xl border border-primary/25 bg-gradient-to-b from-primary/[0.04] to-card p-5 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary font-mono flex items-center justify-between">
                <span>Score Comparison</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {selectedScript.varianceNote}
                </span>
              </h4>

              {/* 3 Benchmarks: Cambridge Official vs Marginal vs Raw AI */}
              <div className="space-y-3">
                {/* Official Cambridge */}
                <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-foreground block">
                      Cambridge Principal Examiner
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      {selectedScript.cambridgeBand}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-foreground">
                      {selectedScript.cambridgeMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>

                {/* Marginal Examiner */}
                <div className="rounded-xl border-2 border-primary bg-primary/10 p-3 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-primary block">
                        Marginal Examiner Engine
                      </span>
                      <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4">
                        Calibrated
                      </Badge>
                    </div>
                    <span className="text-[10px] font-mono text-foreground font-semibold block">
                      {selectedScript.marginalBand}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary">
                      {selectedScript.marginalMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>

                {/* Raw AI (ChatGPT / Gemini) */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3 flex items-center justify-between opacity-80">
                  <div>
                    <span className="text-[11px] font-bold text-destructive block">
                      Raw ChatGPT / Gemini 1.5
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Uncalibrated Generic LLM
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-destructive line-through">
                      {selectedScript.generalAiMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs text-xs"
                >
                  <Link to="/auth">
                    <span>Test Your Own Cambridge Essay Now</span>
                    <ChevronRight className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
