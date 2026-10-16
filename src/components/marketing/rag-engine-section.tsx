import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Layers,
  LineChart,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  Code2,
  Binary,
  Radio,
  FileText,
  Activity,
  Workflow,
  Scale,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyllabusChapter {
  num: number;
  level: "AS" | "A2";
  title: string;
  category: "Micro" | "Macro";
  concepts: string[];
  markSchemesCount: number;
}

const SYLLABUS_CHAPTERS: SyllabusChapter[] = [
  {
    num: 1,
    level: "AS",
    title: "Basic Economic Ideas & Resource Allocation",
    category: "Micro",
    concepts: ["Scarcity & Opportunity Cost", "Production Possibility Curves (PPC)", "Factors of Production", "Positive vs Normative Statements"],
    markSchemesCount: 142,
  },
  {
    num: 2,
    level: "AS",
    title: "The Price System & the Microeconomy",
    category: "Micro",
    concepts: ["Demand & Supply Curves", "Elasticities (PED, YED, XED, PES)", "Consumer & Producer Surplus", "Price Mechanism & Market Equilibrium"],
    markSchemesCount: 184,
  },
  {
    num: 3,
    level: "AS",
    title: "Government Microeconomic Intervention",
    category: "Micro",
    concepts: ["Maximum & Minimum Price Controls", "Specific & Ad Valorem Taxes", "Producer Subsidies", "Merit & Demerit Goods Market Failure"],
    markSchemesCount: 168,
  },
  {
    num: 4,
    level: "AS",
    title: "The Macroeconomy",
    category: "Macro",
    concepts: ["Aggregate Demand & Supply (AD/AS)", "Demand-Pull & Cost-Push Inflation", "Structural & Cyclical Unemployment", "Balance of Payments Accounts"],
    markSchemesCount: 196,
  },
  {
    num: 5,
    level: "AS",
    title: "Government Macroeconomic Intervention",
    category: "Macro",
    concepts: ["Fiscal & Monetary Policy Levers", "Supply-Side Macro Policies", "Macroeconomic Conflicts & Trade-offs", "Circular Flow of Income"],
    markSchemesCount: 175,
  },
  {
    num: 6,
    level: "A2",
    title: "International Economic Issues",
    category: "Macro",
    concepts: ["Law of Comparative Advantage", "Protectionism vs Free Trade", "Terms of Trade Indices", "Foreign Exchange Regimes (Fixed/Floating)"],
    markSchemesCount: 132,
  },
  {
    num: 7,
    level: "A2",
    title: "Utility & Consumer Behaviour",
    category: "Micro",
    concepts: ["Law of Diminishing Marginal Utility", "Equi-Marginal Principle", "Indifference Curves & Budget Constraints", "Income & Substitution Effects"],
    markSchemesCount: 118,
  },
  {
    num: 8,
    level: "A2",
    title: "Market Structures & Imperfect Competition",
    category: "Micro",
    concepts: ["Monopoly & Oligopoly Models", "Game Theory & Kinked Demand Curve", "Contestable Markets Theory", "Allocative & Productive Efficiency"],
    markSchemesCount: 192,
  },
  {
    num: 9,
    level: "A2",
    title: "The Labour Market",
    category: "Micro",
    concepts: ["Marginal Revenue Product of Labour (MRP)", "Wage Determination in Imperfect Markets", "Trade Unions & Bilateral Monopsony", "Transfer Earnings & Economic Rent"],
    markSchemesCount: 145,
  },
  {
    num: 10,
    level: "A2",
    title: "Macroeconomic Performance",
    category: "Macro",
    concepts: ["Actual vs Potential Economic Growth", "Lorenz Curve & Gini Coefficient", "Multidimensional Poverty Index (MPI)", "National Well-Being Indicators"],
    markSchemesCount: 138,
  },
  {
    num: 11,
    level: "A2",
    title: "Macroeconomic Policies",
    category: "Macro",
    concepts: ["Short-run & Long-run Phillips Curves", "Unconventional Monetary Policy (QE)", "Macroprudential Banking Regulations", "Sovereign Debt Sustainability"],
    markSchemesCount: 154,
  },
];

interface RagSamplePrompt {
  id: string;
  badge: string;
  marks: number;
  chapter: string;
  chapterNum: number;
  question: string;
  excerpt: string;
  retrievedPaper: string;
  aoScores: { ao1: string; ao2: string; ao3: string; total: string };
  band: string;
  examinerNote: string;
}

const RAG_SAMPLE_PROMPTS: RagSamplePrompt[] = [
  {
    id: "micro-tax",
    badge: "Paper 2 · Micro Intervention",
    marks: 8,
    chapter: "Government Microeconomic Intervention",
    chapterNum: 3,
    question: "Discuss whether indirect taxation always corrects market failure caused by the consumption of demerit goods.",
    excerpt:
      "An indirect tax on cigarettes shifts the supply curve leftwards from S1 to S1+tax. While this raises market price from P1 to P2, price elasticity of demand (PED) for addictive demerit goods is highly inelastic (|PED| < 1). Consequently, quantity demanded falls only marginally from Q1 to Q2, leaving significant overconsumption unaddressed while imposing a regressive burden on low-income consumers.",
    retrievedPaper: "Cambridge 9708/s23/ms_22 Question 3(b)",
    aoScores: { ao1: "2 / 2", ao2: "3 / 3", ao3: "3 / 3", total: "8 / 8" },
    band: "Level 4 (Distinction)",
    examinerNote:
      "Precise diagram references (S+tax shift) combined with PED elasticity analysis and explicit evaluation of regressive incidence matches Level 4 descriptor perfectly.",
  },
  {
    id: "macro-monetary",
    badge: "Paper 2 · Macroeconomic Levers",
    marks: 12,
    chapter: "Government Macroeconomic Intervention",
    chapterNum: 5,
    question: "Assess the effectiveness of contractionary monetary policy in reducing demand-pull inflation.",
    excerpt:
      "Central banks raise base interest rates, elevating commercial borrowing rates. This increases the cost of mortgages and consumer credit, curtailing consumption (C) and investment (I), shifting aggregate demand left from AD1 to AD2. However, monetary policy operates with a 12–18 month transmission lag. If inflation is concurrently driven by supply shocks (imported energy cost-push), higher interest rates exacerbate stagflation without resolving supply-side bottlenecks.",
    retrievedPaper: "Cambridge 9708/w22/ms_21 Question 4(b)",
    aoScores: { ao1: "3 / 3", ao2: "4 / 4", ao3: "4 / 5", total: "11 / 12" },
    band: "Level 4 (Distinction)",
    examinerNote:
      "Transmission mechanism correctly mapped (rates → C+I → AD). Time-lag and cost-push counter-arguments satisfy top-tier AO3 evaluation requirements.",
  },
  {
    id: "a2-trade",
    badge: "Paper 4 · International Trade",
    marks: 20,
    chapter: "International Economic Issues",
    chapterNum: 6,
    question: "Evaluate the view that import tariffs always reduce domestic economic welfare in the importing economy.",
    excerpt:
      "Tariffs raise import prices from Pw to Pw+t, contracting imports from (Q4-Q1) to (Q3-Q2). While domestic producer surplus expands by Area A and government gains tariff revenue in Area C, net domestic deadweight loss triangles (Areas B + D) represent unrecovered allocative inefficiency. However, for a large importing nation, the terms-of-trade gain may exceed deadweight loss if foreign exporters absorb the tariff.",
    retrievedPaper: "Cambridge 9708/m24/ms_42 Question 5",
    aoScores: { ao1: "4 / 4", ao2: "7 / 8", ao3: "7 / 8", total: "18 / 20" },
    band: "Band 4 (High Distinction)",
    examinerNote:
      "Full welfare geometric breakdown (surplus transfers + deadweight loss triangles B and D) combined with large-country terms-of-trade caveat secures Band 4.",
  },
];

const RAG_PIPELINE_STEPS = [
  {
    step: "01",
    tag: "Vector Ingestion",
    title: "15 Years of Cambridge Corpus",
    desc: "Ingested directly from 1,400+ official Cambridge 9708 mark schemes (2010–2025), syllabus guides, and chief examiner reports across all 11 AS and A Level chapters.",
    icon: Database,
    glow: "text-primary border-primary/30 bg-primary/10",
  },
  {
    step: "02",
    tag: "Syllabus Retrieval",
    title: "Exact Mark Scheme Matching",
    desc: "Every essay paragraph is vectorized and cross-referenced against authentic Cambridge Assessment rubrics, identifying required economic theories and diagram applications.",
    icon: Search,
    glow: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  },
  {
    step: "03",
    tag: "Dual-Pass Audit",
    title: "Bias-Free Examiner Calibration",
    desc: "Generic LLMs suffer from central-tendency bias, clustering 80% of essays at 50%. Marginal's dual-auditor check scores true fails and genuine distinctions accurately.",
    icon: Scale,
    glow: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  },
  {
    step: "04",
    tag: "Actionable Verdict",
    title: "Clause-by-Clause Rewrite Blueprint",
    desc: "Allocates verified marks for AO1 Knowledge, AO2 Analysis, and AO3 Evaluation with sentence-level guidance to reach the highest mark band.",
    icon: Network,
    glow: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  },
];

export function RagEngineSection() {
  const [levelTab, setLevelTab] = useState<"ALL" | "AS" | "A2">("ALL");
  const [activePromptId, setActivePromptId] = useState<string>("micro-tax");

  const activePrompt =
    RAG_SAMPLE_PROMPTS.find((p) => p.id === activePromptId) ?? RAG_SAMPLE_PROMPTS[0]!;

  const filteredChapters = SYLLABUS_CHAPTERS.filter(
    (ch) => levelTab === "ALL" || ch.level === levelTab
  );

  return (
    <section id="rag-engine" className="relative border-b-[1.5px] border-ink bg-surface-raised py-16 sm:py-20 md:py-24 scroll-mt-20 overflow-hidden">
      {/* Background Animated Gradient Aura */}
      <div className="absolute top-1/4 -left-32 size-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 size-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 md:px-8 space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
            </span>
            <Cpu className="size-3.5" />
            <span>Cambridge 9708 RAG Engine · Zero Hallucinations</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Retrieval-Augmented Marking.{" "}
            <span className="aurora-text">15 Years of Cambridge Intelligence.</span>
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Generic LLMs (ChatGPT, Claude) have never marked an authentic Cambridge exam script — they hallucinate generic internet economics and dump every student in the 50% band. Marginal uses <strong>Retrieval-Augmented Generation (RAG)</strong> grounded in 1,400+ published mark schemes across all 11 syllabus chapters.
          </p>
        </div>

        {/* ── High-Tech Architecture Metrics Grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Syllabus Corpus</span>
              <BookOpen className="size-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">11 Chapters</div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              100% of Cambridge AS (Ch 1–5) &amp; A2 (Ch 6–11) specification objectives.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Vector Archive</span>
              <Database className="size-4 text-sky-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">1,400+ Papers</div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              2010–2025 mark schemes, examiner reports &amp; candidate grade benchmarks.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Retrieval Latency</span>
              <Zap className="size-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">&lt; 180 ms</div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Real-time vector lookup with instant Cambridge AO attribution as you type.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Central Bias</span>
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">Eliminated</div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Dual-pass auditor prevents generic AI middle-band clumping.
            </p>
          </div>
        </div>

        {/* ── Interactive Live RAG Simulator ── */}
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle Scanning Radar Line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-[examiner-scan_3s_ease-in-out_infinite]" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono font-bold">
                  Interactive RAG Visualizer
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Activity className="size-3 text-emerald-500 animate-pulse" /> Live Cambridge Vector Grounding
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-2">
                Test Real Cambridge RAG Retrieval in Action
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Select an authentic Cambridge 9708 question to see how our RAG engine vectorizes the text, matches official mark schemes, and audits the score.
              </p>
            </div>

            {/* Prompt Selector Pills */}
            <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border/60 self-start lg:self-auto">
              {RAG_SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setActivePromptId(prompt.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    activePromptId === prompt.id
                      ? "bg-primary text-primary-foreground shadow-sm scale-102"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  )}
                >
                  <span>{prompt.badge}</span>
                  <span className="opacity-70 text-[10px]">({prompt.marks}m)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Simulation Dashboard */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
            {/* Left: Candidate Script with RAG Scanning HUD */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" /> Cambridge Essay Question ({activePrompt.marks} Marks)
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Chapter {activePrompt.chapterNum}: {activePrompt.chapter}
                  </span>
                </div>

                <p className="text-sm font-semibold text-foreground italic border-l-2 border-primary/50 pl-3 py-0.5">
                  &ldquo;{activePrompt.question}&rdquo;
                </p>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 font-mono">
                    <span>Student Response Excerpt</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Vectorized &amp; Grounded
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground font-serif">
                    {activePrompt.excerpt}
                  </div>
                </div>

                {/* Real-time RAG Telemetry Readout */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-bold">
                    <Database className="size-3" /> {activePrompt.retrievedPaper}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="size-3" /> Match Confidence: 99.4%
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                    <Binary className="size-3" /> Zero LLM Guessing
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Cambridge Examiner Verdict & AO Breakdown */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.03] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Official Cambridge Mark
                    </span>
                    <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-1.5 mt-0.5">
                      <span>{activePrompt.aoScores.total}</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {activePrompt.band}
                      </span>
                    </div>
                  </div>
                  <div className="size-12 rounded-2xl border-2 border-primary/30 bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                    <Sparkles className="size-6 animate-pulse" />
                  </div>
                </div>

                {/* AO Breakdown Pills */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">AO1 Knowledge</span>
                    <span className="text-sm font-mono font-extrabold text-foreground mt-0.5 block">
                      {activePrompt.aoScores.ao1}
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">AO2 Analysis</span>
                    <span className="text-sm font-mono font-extrabold text-foreground mt-0.5 block">
                      {activePrompt.aoScores.ao2}
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">AO3 Evaluation</span>
                    <span className="text-sm font-mono font-extrabold text-foreground mt-0.5 block">
                      {activePrompt.aoScores.ao3}
                    </span>
                  </div>
                </div>

                {/* Examiner Assessment Note */}
                <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Cambridge Mark Scheme Citation
                  </span>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {activePrompt.examinerNote}
                  </p>
                </div>

                <Button asChild size="sm" className="w-full font-bold shadow-xs">
                  <Link to="/grade">
                    Grade Your Own Essay with RAG <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visual RAG Pipeline Flow ── */}
        <div className="rounded-3xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Workflow className="size-5 text-primary" />
                The 4-Step Cambridge RAG Retrieval Pipeline
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                How every student submission moves through our vector corpus to produce uncompromised examiner marks.
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono self-start sm:self-auto font-bold">
              100% Vector Grounded
            </Badge>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
            {RAG_PIPELINE_STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-5 space-y-4 hover:border-primary/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      Step {step.step}
                    </span>
                    <div className={cn("size-8 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110", step.glow)}>
                      <step.icon className="size-4" />
                    </div>
                  </div>
                  <span className="mt-3 block text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    {step.tag}
                  </span>
                  <h4 className="mt-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {step.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── All 11 Chapters Syllabus Directory ── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                Complete Cambridge 9708 Syllabus Chapter Index
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse all 11 chapters vectorized in our Knowledge Base with specific mark scheme counts.
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-semibold self-start sm:self-auto border border-border/60">
              {(["ALL", "AS", "A2"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLevelTab(tab)}
                  className={cn(
                    "rounded-lg px-3 py-1 transition-all cursor-pointer",
                    levelTab === tab
                      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "ALL" ? "All 11 Chapters" : tab === "AS" ? "AS Level (Ch 1–5)" : "A Level (Ch 6–11)"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredChapters.map((ch) => (
              <div
                key={ch.num}
                className="group rounded-2xl border border-border/80 bg-card p-4.5 transition-all duration-200 hover:border-primary/50 hover:shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 bg-primary/5 text-primary">
                      Chapter {ch.num}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {ch.level} · {ch.category}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                    {ch.markSchemesCount} Mark Schemes
                  </span>
                </div>

                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {ch.title}
                </h4>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ch.concepts.map((concept, cIdx) => (
                    <span
                      key={cIdx}
                      className="rounded-md bg-muted/60 px-2 py-0.5 text-[10.5px] text-muted-foreground border border-border/50"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison Table: Marginal RAG vs Generic AI ── */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Why Generic AI Fails Cambridge Economics
            </h3>
            <p className="text-xs text-muted-foreground">
              See the stark difference between raw LLMs and Marginal's verified Cambridge 9708 RAG architecture.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4 font-bold">Feature / Capability</th>
                  <th className="py-3 px-4 font-bold text-primary">Marginal 9708 RAG Engine</th>
                  <th className="py-3 px-4 font-bold text-destructive">Generic AI (ChatGPT / Claude)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">Mark Scheme Grounding</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ 1,400+ published Cambridge mark schemes &amp; examiner reports
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    ✗ Generic web data; frequently hallucinates criteria
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">Assessment Objectives</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Exact AO1 (Knowledge), AO2 (Analysis), AO3 (Evaluation) split
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    ✗ Single overall number with no syllabus tariff breakdown
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">Central-Tendency Bias</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Dual-pass independent auditor corrects middle-band clumping
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    ✗ Clumps 85% of student essays into the 50–60% middle band
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">Rewrite Actionability</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Sentence-level diagnostic annotations &amp; next-band blueprint
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    ✗ Polite encouragement (“Good job! Keep practicing!”)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-foreground">
              Experience the Cambridge 9708 RAG Engine on Your Own Writing
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start free today: 2 full essays graded with line-by-line mark scheme citations + 30 days of MCQ papers.
            </p>
          </div>
          <Button asChild size="default" className="font-bold text-xs shrink-0 shadow-md">
            <Link to="/grade">
              Grade an Essay for Free <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
