import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  LineChart,
  PenLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exemplar")({
  head: () => ({
    meta: [
      {
        title: "Real Cambridge 9708 Graded Essay Exemplar (10/12) — Marginal Economics",
      },
      {
        name: "description",
        content:
          "Inspection of an authentic student Cambridge 9708 Economics Paper 2 essay graded 10/12 (Band 4 Distinction) with sentence-by-sentence AO1/AO2/AO3 examiner annotations.",
      },
    ],
  }),
  component: ExemplarPage,
});

export function ExemplarPage() {
  const [activeSentence, setActiveSentence] = useState<number | null>(null);

  const essayClauses = [
    {
      ao: "AO1",
      badge: "AO1 Knowledge",
      mark: "+2 / 2",
      color: "bg-ao1/15 border-ao1/40 text-foreground",
      dot: "bg-ao1",
      text: "Aggregate demand is equal to C+I+G+NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. Increased aggregate demand can cause demand pull inflation.",
      comment:
        "Full AO1 Knowledge: Accurate specification of the AD equation (C+I+G+NX), policy levers (expansionary monetary/fiscal), and direct theoretical consequence of demand-pull price pressures.",
    },
    {
      ao: "AO2",
      badge: "AO2 Analysis",
      mark: "+3 / 3",
      color: "bg-ao2/15 border-ao2/40 text-foreground",
      dot: "bg-ao2",
      text: "Increased aggregate demand may mean an increase in production. As when aggregate demand is high, it means suppliers are incentivised to produce due to their profit motive. Increased production can lead to increased job opportunities, and also increased production leads to an increase in GDP (Economic growth). Higher output also leads to higher corporate tax revenue and income tax revenue for the government, improving the fiscal budget.",
      comment:
        "High-Band Analytical Chain (AO2): Traces a coherent causal transmission mechanism from firm incentives to derived labour demand, output growth, and fiscal multiplier receipts.",
    },
    {
      ao: "AO3",
      badge: "AO3 Evaluation",
      mark: "+2 / 2",
      color: "bg-ao3/15 border-ao3/40 text-foreground",
      dot: "bg-ao3",
      text: "However, the level of increase in production depends on the production possibility curve (PPC) and where the economy is currently operating. If the economy is operating with substantial spare capacity (a negative output gap), an increase in aggregate demand shifts real output towards full employment without immediately triggering cost or price pressures.",
      comment:
        "Evaluative Judgement (AO3): Identifies the conditionality of spare capacity and positions the economy along the PPC curve.",
    },
    {
      ao: "AO2",
      badge: "AO2 Analysis",
      mark: "+2 / 3",
      color: "bg-ao2/15 border-ao2/40 text-foreground",
      dot: "bg-ao2",
      text: "Conversely, if the economy is operating near full capacity (along the vertical segment of the LRAS), an increase in aggregate demand only generates demand-pull inflation without increasing real output. Furthermore, rapid demand expansion often triggers higher import expenditure, causing deterioration on the current account of the balance of payments.",
      comment:
        "Counter-Analysis (AO2): Correctly notes Classical LRAS constraints and the open-economy leakage via the marginal propensity to import (MPM).",
    },
    {
      ao: "AO3",
      badge: "AO3 Evaluation",
      mark: "+1 / 2",
      color: "bg-ao3/15 border-ao3/40 text-foreground",
      dot: "bg-ao3",
      text: "In evaluation, whether an increase in aggregate demand is of overall benefit depends critically on the initial macroeconomic state: it is highly beneficial during a cyclical downturn with spare capacity, but risks stagflation and currency instability if applied when the economy is at full employment without matching supply-side expansion.",
      comment:
        "Supported Synthesis (AO3): High-level conclusion weighing economic growth against macroeconomic instability depending on the initial state of the business cycle.",
    },
  ];

  const fullEssayText = essayClauses.map((c) => c.text).join("\n\n");

  const copyEssay = () => {
    navigator.clipboard.writeText(fullEssayText);
    toast.success("Exemplar essay copied to clipboard.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal"
              className="size-8 object-contain transition-transform group-hover:-rotate-6"
            />
            <span className="text-base font-bold tracking-tight">Marginal</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/grade">
                <PenLine className="mr-1.5 size-3.5" /> Grade Your Essay
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/">
                <ArrowLeft className="mr-1.5 size-3.5" /> Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        {/* Breadcrumb & Header */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
            Authentic Cambridge Exemplar
          </Badge>
          <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
            10 / 12 Marks · Band 4 Distinction
          </Badge>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Real Graded Cambridge Paper 2 Essay
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Inspect an authentic student script evaluated against Cambridge 9708 mark schemes and
            Principal Examiner levels of response. Click any sentence to reveal the examiner's
            diagnostic rubric.
          </p>
        </div>

        {/* Paper & Question Tariff Box */}
        <div className="my-8 rounded-2xl border-2 border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 text-xs text-muted-foreground font-mono">
            <span>CAMBRIDGE INTERNATIONAL AS & A LEVEL ECONOMICS (9708/22)</span>
            <span className="font-bold text-foreground">Tariff: [12 Marks]</span>
          </div>

          <div className="mt-4">
            <span className="text-xs uppercase font-bold tracking-wider text-primary">
              Section B Question:
            </span>
            <p className="mt-1 text-base font-semibold text-foreground sm:text-lg leading-snug">
              “Discuss whether an increase in aggregate demand would be of overall benefit for an
              economy. [12]”
            </p>
          </div>
        </div>

        {/* Score & AO Breakdown Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/40 bg-card shadow-xs">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Mark
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">10</span>
                <span className="text-sm text-muted-foreground">/ 12 (83%)</span>
              </div>
              <Badge className="mt-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                Band 4 Distinction
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-ao1/40 bg-card shadow-xs">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ao1" /> AO1 Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">2</span>
                <span className="text-sm text-muted-foreground">/ 2 (100%)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
                Full formula & policy levers cited without vagueness.
              </p>
            </CardContent>
          </Card>

          <Card className="border-ao2/40 bg-card shadow-xs">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ao2" /> AO2 Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">5</span>
                <span className="text-sm text-muted-foreground">/ 6 (83%)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
                Rigorous transmission to derived labour demand & GDP.
              </p>
            </CardContent>
          </Card>

          <Card className="border-ao3/40 bg-card shadow-xs">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ao3" /> AO3 Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">3</span>
                <span className="text-sm text-muted-foreground">/ 4 (75%)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
                Evaluates spare capacity & current account leakages.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Script Viewer & Annotations */}
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start mb-12">
          {/* Script Content */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Authentic Student Submission Script
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyEssay}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3 mr-1" /> Copy Script
              </Button>
            </div>

            <div className="font-serif text-base leading-[2] space-y-4">
              {essayClauses.map((clause, idx) => {
                const isSelected = activeSentence === idx;

                return (
                  <p
                    key={idx}
                    onClick={() => setActiveSentence(idx)}
                    className={cn(
                      "cursor-pointer rounded-lg p-2 transition-all duration-200 border",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block rounded px-1.5 py-0.5 text-xs font-sans font-bold mr-2 align-middle",
                        clause.ao === "AO1" && "bg-ao1/20 text-ao1",
                        clause.ao === "AO2" && "bg-ao2/20 text-ao2",
                        clause.ao === "AO3" && "bg-ao3/20 text-ao3"
                      )}
                    >
                      {clause.ao} {clause.mark}
                    </span>
                    <span className="text-foreground">{clause.text}</span>
                  </p>
                );
              })}
            </div>
          </div>

          {/* Examiner Margin Diagnostic Console */}
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-md">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-bold">Cambridge Examiner Feedback</h3>
            </div>

            {activeSentence !== null ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {essayClauses[activeSentence]?.badge}
                  </Badge>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    Awarded: {essayClauses[activeSentence]?.mark}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-foreground leading-relaxed">
                  <strong className="block text-primary font-semibold mb-1">Examiner Note:</strong>
                  {essayClauses[activeSentence]?.comment}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSentence(null)}
                  className="w-full text-xs h-7 text-muted-foreground"
                >
                  View overall report
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Click any paragraph in the script to view sentence-level marks and Cambridge 9708
                  rubric explanations.
                </p>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Key Strengths:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                    <li>Full formula definition of AD with explicit fiscal & monetary levers.</li>
                    <li>
                      Unbroken causal chain linking supplier profit motive to derived labor demand.
                    </li>
                    <li>Evaluates LRAS vertical segment and import expenditure leakages.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Award className="size-3.5 text-amber-500" /> Rewrite Step to 12/12 Marks:
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Explicitly synthesize <em>which</em> macroeconomic effect dominates when the
                    marginal propensity to import (MPM) is high versus when domestic spare capacity
                    is large.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call to action */}
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/[0.04] p-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-xl font-bold text-foreground">
              Ready to test your own essay with this engine?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every student gets 2 free full Cambridge 9708 essay gradings with line-by-line mark
              breakdowns, plus 30 days of MCQ past papers.
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-3 shrink-0">
            <Button asChild size="default" className="text-xs font-bold shadow-md">
              <Link to="/auth">
                Start Free Marking <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="text-xs font-semibold">
              <Link to="/pricing">View Revision Plans</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
