import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  GitCompare,
  Layers,
  LineChart,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  Code2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const RAG_PIPELINE_STEPS = [
  {
    step: "01",
    title: "Syllabus Ingestion & Semantic Chunking",
    desc: "1,400+ official Cambridge 9708 mark schemes (2010–2025), syllabus guides, and principal examiner reports are chunked into high-dimensional vector embeddings with economic entity tags.",
    icon: Database,
  },
  {
    step: "02",
    title: "Context-Grounded Vector Retrieval",
    desc: "When a student submits an essay or prompt, our hybrid cosine similarity retrieval engine queries the knowledge base in < 40ms to extract the exact Cambridge mark scheme criteria.",
    icon: Search,
  },
  {
    step: "03",
    title: "Dual-Pass Independent Audit",
    desc: "A second independent model re-evaluates the paper without seeing the first pass. This eliminates AI central-tendency bias (where generic LLMs clump every essay around 55%).",
    icon: ShieldCheck,
  },
  {
    step: "04",
    title: "AO Breakdown & Causal Synthesis",
    desc: "The response is partitioned into strict AO1 Knowledge, AO2 Analysis, and AO3 Evaluation mark quotas, citing exact Cambridge rubrics with rewrite pathways to the next band.",
    icon: Network,
  },
];

export function RagEngineSection() {
  const [levelTab, setLevelTab] = useState<"ALL" | "AS" | "A2">("ALL");

  const filteredChapters = SYLLABUS_CHAPTERS.filter(
    (ch) => levelTab === "ALL" || ch.level === levelTab
  );

  return (
    <section id="rag-engine" className="relative border-b-[1.5px] border-ink bg-surface-raised py-16 sm:py-20 md:py-24 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
            <Cpu className="size-3.5 mr-1.5" /> Cambridge 9708 Retrieval-Augmented Generation
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            11 Syllabus Chapters. <span className="aurora-text">1,400+ Mark Schemes.</span> Zero Hallucinations.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generic AI models guess what sounds like economics. Marginal's proprietary RAG knowledge engine vectorizes every chapter of the official Cambridge 9708 syllabus to mark your essays against published Cambridge Assessment standards.
          </p>
        </div>

        {/* High-Level Architecture Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Syllabus Coverage</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">11 Chapters</div>
            <p className="text-[11.5px] text-muted-foreground">100% of Cambridge AS (Ch 1–5) &amp; A2 (Ch 6–11) specifications.</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Past Papers Grounded</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">1,400+ Papers</div>
            <p className="text-[11.5px] text-muted-foreground">2010–2025 mark schemes, examiner reports &amp; candidate rubrics.</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Retrieval Latency</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">&lt; 40ms</div>
            <p className="text-[11.5px] text-muted-foreground">Sub-second vector cosine similarity on high-speed edge workers.</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Central-Tendency Bias</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">Eliminated</div>
            <p className="text-[11.5px] text-muted-foreground">Dual-pass independent auditor stops clustering in middle bands.</p>
          </div>
        </div>

        {/* ── Visual RAG Pipeline ── */}
        <div className="rounded-2xl border-2 border-border/80 bg-card p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Network className="size-5 text-primary" />
                How Marginal's RAG Architecture Works
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every student essay travels through a 4-stage pipeline grounded in Cambridge Assessment evidence.
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono self-start sm:self-auto">
              Real-time Ingestion
            </Badge>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {RAG_PIPELINE_STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="relative flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{step.step}</span>
                    <step.icon className="size-4 text-muted-foreground" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-foreground">{step.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
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

            <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-semibold self-start sm:self-auto">
              {(["ALL", "AS", "A2"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLevelTab(tab)}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all",
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
                className="group rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-sm space-y-3"
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
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-md space-y-6">
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
                  <td className="py-3 px-4 font-semibold text-foreground">Mark Scheme Grounding</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ 1,400+ published Cambridge mark schemes &amp; examiner reports
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    ✗ Generic web data; frequently hallucinates criteria
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Assessment Objectives</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Exact AO1 (Knowledge), AO2 (Analysis), AO3 (Evaluation) split
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    ✗ Single overall number with no syllabus tariff breakdown
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Central-Tendency Bias</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Dual-pass independent auditor corrects middle-band clumping
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    ✗ Clumps 85% of student essays into the 50–60% middle band
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Rewrite Actionability</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Sentence-level diagnostic annotations &amp; next-band blueprint
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    ✗ Polite encouragement (“Good job! Keep practicing!”)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-foreground">
              Experience the Cambridge 9708 RAG Engine on Your Own Writing
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start free today: 2 full essays graded with line-by-line mark scheme citations + 30 days of MCQ papers.
            </p>
          </div>
          <Button asChild size="default" className="font-semibold text-xs shrink-0 shadow-xs">
            <Link to="/grade">
              Grade an Essay for Free <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
