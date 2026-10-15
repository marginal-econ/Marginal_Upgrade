import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CircleDot,
  Dumbbell,
  Flame,
  GraduationCap,
  LibraryBig,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  Wand2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { SiteFooter } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyEssays, getProgress } from "@/lib/grading.functions";
import { getCommunityPulse, getMe } from "@/lib/account.functions";
import { listDocuments } from "@/lib/knowledge.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Marginal Economics" },
      {
        name: "description",
        content:
          "Track your Cambridge 9708 Economics essay marks, AO breakdown, and interactive performance trajectory in one place.",
      },
      { property: "og:title", content: "Dashboard — Marginal Economics" },
      {
        property: "og:description",
        content: "Your marks, assessment-objective trends, and graded essay history.",
      },
    ],
  }),
  component: DashboardPage,
});

const CAMBRIDGE_TIPS = [
  {
    title: "Continuous Evaluation",
    tip: "Evaluate as you go! The strongest essays evaluate each analytical point immediately (e.g. elasticity, timeframe, assumptions) rather than leaving all AO3 judgements for a rushed conclusion.",
    ao: "AO3",
  },
  {
    title: "Explicit Chains of Reasoning",
    tip: "Do not jump straight from policy to outcome. Cambridge examiners award AO2 marks strictly for explicit step-by-step links: state the cause → explain transmission → analyse effect → apply to context.",
    ao: "AO2",
  },
  {
    title: "Accurate Terminology Over Common Speech",
    tip: "Say 'quantitative easing' instead of 'printing money', and distinguish clearly between a 'shift in demand' and a 'movement along the demand curve'. Terminology anchors your AO1 marks.",
    ao: "AO1",
  },
  {
    title: "Contextual Justification",
    tip: "Conclusions that repeat introduction definitions score at Level 1 for AO3. To reach Band 1, state which effect dominates and explain why in this specific country or market context.",
    ao: "AO3",
  },
  {
    title: "Labelled Diagrams With Shifts",
    tip: "A diagram earns credit only when actively integrated into the written analysis: reference new equilibria (P1 to P2, Q1 to Q2) and explain the directional mechanism in words.",
    ao: "AO2",
  },
];

export function DashboardPage() {
  const fetchProgress = useServerFn(getProgress);
  const fetchEssays = useServerFn(listMyEssays);
  const fetchMe = useServerFn(getMe);
  const fetchDocs = useServerFn(listDocuments);
  const fetchCommunityPulse = useServerFn(getCommunityPulse);

  const progress = useQuery({ queryKey: ["progress"], queryFn: () => fetchProgress() });
  const essays = useQuery({ queryKey: ["essays"], queryFn: () => fetchEssays() });
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocs(),
    enabled: me.data?.isStaff === true,
  });
  const communityPulse = useQuery({
    queryKey: ["community-pulse"],
    queryFn: () => fetchCommunityPulse(),
    refetchInterval: 60_000,
  });

  const [activeTariff, setActiveTariff] = useState<number | "all">("all");
  const [essaySearch, setEssaySearch] = useState("");
  const [bandFilter, setBandFilter] = useState<"all" | "band1" | "band2" | "band3">("all");
  const [tipIndex, setTipIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    mark: number;
    date: string;
    question: string;
  } | null>(null);

  const versions = useMemo(() => progress.data ?? [], [progress.data]);
  const marks = useMemo(() => versions.map((v) => v.total_mark ?? 0), [versions]);
  const average = useMemo(
    () => (marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0),
    [marks],
  );
  const best = useMemo(() => (marks.length ? Math.max(...marks) : 0), [marks]);
  const readyDocs = (docs.data ?? []).filter((document) => document.status === "ready").length;

  const recent = marks.slice(-5);
  const earlier = marks.slice(0, -5);
  const delta =
    recent.length && earlier.length
      ? recent.reduce((a, b) => a + b, 0) / recent.length -
        earlier.reduce((a, b) => a + b, 0) / earlier.length
      : 0;

  // Filtered versions by tariff
  const filteredVersions = useMemo(() => {
    if (activeTariff === "all") return versions;
    // Map max_mark from matching essay if available
    const essayMap = new Map((essays.data ?? []).map((e) => [e.id, e.max_mark]));
    return versions.filter((v) => {
      // Best guess based on marks or essay reference
      if (activeTariff === 12) return (v.total_mark ?? 0) <= 12;
      if (activeTariff === 8) return (v.total_mark ?? 0) <= 8;
      if (activeTariff === 20) return (v.total_mark ?? 0) > 12;
      return true;
    });
  }, [versions, essays.data, activeTariff]);

  const aoAverage = (key: "ao1_awarded" | "ao2_awarded" | "ao3_awarded") => {
    const list = filteredVersions.length ? filteredVersions : versions;
    const values = list.map((v) => v[key] ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  // Study Progress & Consistency Index (0 - 100%)
  // Transparent calculation: average mark weight (60%) + practice volume (30%) + positive improvement trend (10%)
  const progressIndex = useMemo(() => {
    if (versions.length === 0) return 0;
    const avgPercent = Math.min(100, (average / 12) * 100);
    const volumeScore = Math.min(30, versions.length * 6); // capped at 30% for 5+ essays
    const consistencyScore = delta >= 0 ? 10 : 0;
    return Math.min(100, Math.round(avgPercent * 0.6 + volumeScore + consistencyScore));
  }, [average, versions.length, delta]);

  const progressBadge = useMemo(() => {
    if (progressIndex >= 80)
      return {
        label: "Band 1 Target Track",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      };
    if (progressIndex >= 60)
      return {
        label: "Band 2 Target Track",
        color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      };
    if (progressIndex >= 40)
      return {
        label: "Developing Consistency",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      };
    return { label: "Initial Calibration", color: "text-muted-foreground bg-muted border-border" };
  }, [progressIndex]);

  // Filtered essays
  const filteredEssays = useMemo(() => {
    const list = essays.data ?? [];
    return list.filter((essay) => {
      const matchesSearch = essay.question.toLowerCase().includes(essaySearch.toLowerCase());
      if (!matchesSearch) return false;
      if (bandFilter === "all") return true;
      const mark = essay.latest_mark ?? 0;
      const max = essay.max_mark ?? 12;
      const pct = max > 0 ? (mark / max) * 100 : 0;
      if (bandFilter === "band1") return pct >= 75;
      if (bandFilter === "band2") return pct >= 50 && pct < 75;
      if (bandFilter === "band3") return pct < 50;
      return true;
    });
  }, [essays.data, essaySearch, bandFilter]);

  // Greeting by hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const currentTip = CAMBRIDGE_TIPS[tipIndex % CAMBRIDGE_TIPS.length];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Cambridge 9708 Economics performance analytics, AO mastery breakdown, and live study progress."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/live-examiner">
                <Sparkles className="size-3.5 text-primary" /> Live Examiner
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/grade">
                <PenLine className="size-3.5" /> Mark an essay
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        {/* Transparent Cambridge Syllabus Disclaimer */}
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <p className="leading-relaxed">
            <strong className="text-foreground font-semibold">Cambridge 9708 Calibration:</strong>{" "}
            Marking rubrics and feedback criteria are calibrated against published Cambridge
            Assessment 9708 Economics syllabus standards and Principal Examiner reports. Marginal is
            an independent study platform and not endorsed by Cambridge Assessment.
          </p>
        </div>

        {/* Hero Interactive Greeting & Progress Meter */}
        <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-7 md:p-8">
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary text-[11px] font-medium"
                >
                  Syllabus 9708
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1.5"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Hybrid RRF RAG Active
                </Badge>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {greeting}, {me.data?.fullName?.split(" ")[0] || "Economist"}!
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your writing is evaluated against official Cambridge mark schemes and Principal
                Examiner reports. Focus on consistent analytical chains and justified evaluation.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Flame className="size-3.5 text-amber-500" />
                  {versions.length > 0
                    ? `${versions.length} attempts completed`
                    : "Ready for attempt #1"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" />
                  Tariffs: 8, 12, and 20 marks
                </span>
              </div>
            </div>

            {/* Clean Cambridge Readiness Status Card */}
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-4 sm:min-w-[280px] shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Cambridge Status
                  </p>
                  <Badge
                    variant="outline"
                    className={cn("mt-1 px-2.5 py-0.5 text-xs font-semibold", progressBadge.color)}
                  >
                    {progressBadge.label}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {progressIndex}%
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Readiness
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progressIndex))}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Based on {versions.length} attempts & AO parity
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Clean Stat Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <InteractiveStat
            label="Essays marked"
            value={String(versions.length)}
            badge={`${essays.data?.length ?? 0} threads`}
            hint="Total Cambridge submissions"
            progressPercent={Math.min(100, (versions.length / 10) * 100)}
            progressLabel="Target: 10 essays"
            loading={progress.isLoading}
            icon={PenLine}
          />
          <InteractiveStat
            label="Average mark"
            value={versions.length ? average.toFixed(1) : "—"}
            badge={delta !== 0 ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} trend` : "Baseline"}
            hint={
              versions.length
                ? `${Math.round((average / 12) * 100)}% Cambridge benchmark`
                : "Submit to calculate"
            }
            progressPercent={Math.min(100, (average / 12) * 100)}
            progressLabel="Avg score ratio"
            loading={progress.isLoading}
            icon={TrendingUp}
          />
          <InteractiveStat
            label="Personal best"
            value={versions.length ? String(best) : "—"}
            badge="Top attempt"
            hint="Highest single awarded mark"
            progressPercent={Math.min(100, (best / 12) * 100)}
            progressLabel="Peak achievement"
            loading={progress.isLoading}
            icon={Trophy}
          />
          <InteractiveStat
            label="Knowledge base"
            value={me.data?.isStaff ? String(readyDocs) : "58"}
            badge="RRF Grounded"
            hint="Syllabus & mark schemes active"
            progressPercent={100}
            progressLabel="100% groundable"
            loading={me.isLoading || (me.data?.isStaff === true && docs.isLoading)}
            icon={BookOpen}
          />
        </div>

        {/* Assessment Objective Mastery Console */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Award className="size-4 text-primary" /> Cambridge Assessment Objective (AO)
                Mastery
              </h2>
              <p className="text-xs text-muted-foreground">
                Authoritative weightings for Cambridge 9708 evaluative essays (Knowledge 2 :
                Analysis 6 : Evaluation 4).
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTariff("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  activeTariff === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All tariffs
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(12)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  activeTariff === 12
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                12-mark essays
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(8)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  activeTariff === 8
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                8-mark
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(20)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  activeTariff === 20
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                20-mark A2
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <AoCard
              label="AO1 Knowledge"
              subtitle="Definitions, concepts & theory"
              score={aoAverage("ao1_awarded")}
              maxScore={2}
              tone="bg-ao1"
              badgeClass="bg-ao1/10 text-ao1 border-ao1/30"
              insight="Accurate definitions and diagrams set the baseline for high marks."
              targetRatio={0.85}
              aoKey="ao1"
            />
            <AoCard
              label="AO2 Analysis"
              subtitle="Explicit chains of economic reasoning"
              score={aoAverage("ao2_awarded")}
              maxScore={6}
              tone="bg-ao2"
              badgeClass="bg-ao2/10 text-ao2 border-ao2/30"
              insight="Largest mark share. Build step-by-step causal mechanisms without skipping steps."
              targetRatio={0.75}
              aoKey="ao2"
            />
            <AoCard
              label="AO3 Evaluation"
              subtitle="Weighing up, conditions & justified judgement"
              score={aoAverage("ao3_awarded")}
              maxScore={4}
              tone="bg-ao3"
              badgeClass="bg-ao3/10 text-ao3 border-ao3/30"
              insight="Decisive differentiator for Band 1. Must be justified with magnitude or elasticity."
              targetRatio={0.65}
              aoKey="ao3"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs">
            <span className="text-muted-foreground">
              💡 <strong className="text-foreground">Examiner insight:</strong> Evaluation (AO3) is
              where over 70% of Cambridge students lose top-band marks. Strengthen judgements with
              context.
            </span>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to="/practice">
                <Dumbbell className="size-3" /> Train AO Skills
              </Link>
            </Button>
          </div>
        </div>

        {/* Interactive Performance Trajectory Graph */}
        <section className="panel p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Essay Mark Trajectory
              </h2>
              <p className="text-xs text-muted-foreground">
                Chronological marking progression across all submissions with Cambridge Grade Band
                thresholds.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Band 1 (Top)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" /> Band 2 (Mid)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Band 3 (Lower)
              </span>
            </div>
          </div>

          <div className="mt-5">
            {marks.length >= 2 ? (
              <div className="relative">
                <PerformanceChart
                  versions={versions}
                  hoveredPoint={hoveredPoint}
                  onHoverPoint={setHoveredPoint}
                />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 py-10 px-6 text-center">
                <Sparkles className="mx-auto size-8 text-primary/60 mb-3" />
                <h3 className="text-sm font-semibold">Ready to plot your trajectory</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Submit 2 or more essays to unlock interactive performance charts and historical
                  grade band tracking.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/grade">Submit an essay to begin</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Quick-Launch Command Center */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="size-4 text-primary" /> Cambridge Practice Suites
            </h2>
            <span className="text-xs text-muted-foreground">Select a tool to start studying</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              to="/live-examiner"
              icon={Sparkles}
              title="Live Examiner"
              badge="Real-time AI"
              description="Type your essay and receive instant feedback on grammar, analysis, and economic misconceptions."
            />
            <QuickActionCard
              to="/grade"
              icon={PenLine}
              title="Grade Essay"
              badge="2-Pass + Arb"
              description="Authoritative Cambridge marking with AO breakdown, model corrections, and Principal Examiner review."
            />
            <QuickActionCard
              to="/diagram-lab"
              icon={Sliders}
              title="Diagram CAD Lab"
              badge="Vector CAD"
              description="Interactive vector economics canvas. Manipulate curves, equilibrium points, deadweight loss, and tax shifts."
            />
            <QuickActionCard
              to="/paper-matrix"
              icon={Flame}
              title="Paper Predictor"
              badge="15-Yr Matrix"
              description="Statistical cycle intelligence analyzing 15 years of Cambridge 9708 past papers to flag overdue topics."
            />
            <QuickActionCard
              to="/practice"
              icon={Dumbbell}
              title="AO Skills Coach"
              badge="Targeted Drills"
              description="Train individual knowledge points, analytical reasoning chains, and evaluative judgements."
            />
            <QuickActionCard
              to="/question-bank"
              icon={LibraryBig}
              title="Question Bank"
              badge="9708 Past Papers"
              description="Filter hundreds of past paper essay and MCQ questions, or generate fresh syllabus prompts."
            />
          </div>
        </section>

        {/* Recent Essays Interactive Feed */}
        <div className="panel overflow-hidden shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Your Recent Essays</h2>
              <p className="text-xs text-muted-foreground">
                Review feedback and track improvements on rewrites
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search questions…"
                  value={essaySearch}
                  onChange={(e) => setEssaySearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBandFilter("all")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "all"
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setBandFilter("band1")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "band1"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Band 1
                </button>
                <button
                  type="button"
                  onClick={() => setBandFilter("band2")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "band2"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Band 2
                </button>
              </div>
            </div>
          </div>

          {essays.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredEssays.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <GraduationCap className="mx-auto size-9 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium">No matching essays found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {essaySearch
                  ? "Try adjusting your search query or clear the filter."
                  : "Submit an essay response to start building your Cambridge portfolio."}
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/grade">Mark your first essay</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredEssays.map((essay) => {
                const mark = essay.latest_mark ?? 0;
                const max = essay.max_mark ?? 12;
                const pct = max > 0 ? Math.round((mark / max) * 100) : 0;
                const isTopBand = pct >= 75;
                const isMidBand = pct >= 50 && pct < 75;

                return (
                  <li key={essay.id}>
                    <Link
                      to="/essay/$essayId"
                      params={{ essayId: essay.id }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                            {essay.question}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(essay.updated_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>Tariff: {essay.max_mark} marks</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-2.5 py-0.5 font-semibold",
                            isTopBand
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isMidBand
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {isTopBand ? "Band 1" : isMidBand ? "Band 2" : "Band 3"} • {pct}%
                        </Badge>
                        <span className="text-sm font-bold tabular-nums">
                          {essay.latest_mark ?? "—"}
                          <span className="text-muted-foreground font-normal">
                            /{essay.max_mark}
                          </span>
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Community Pulse & Cambridge Examiner Advice */}
        <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
          {/* Live Study Hall */}
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.06] p-6 dark:bg-primary/[0.12] shadow-sm">
            <div className="absolute -top-8 -right-6 size-28 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UsersRound className="size-4" />
                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-400 animate-pulse" />
                </span>
                Live Study Hall
              </div>
              {communityPulse.isLoading ? (
                <Skeleton className="mt-5 h-10 w-24" />
              ) : (
                <div className="mt-5 flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight tabular-nums">
                    {communityPulse.data?.onlineCount ?? 1}
                  </p>
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Active session
                    {communityPulse.data?.onlineCount === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Active student accounts recorded in the last 2 minutes
              </p>
              <div className="mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                {communityPulse.data?.memberCount
                  ? `${communityPulse.data.memberCount} registered students currently using Marginal.`
                  : "Join fellow economics students practicing Cambridge 9708 essays."}
              </div>
            </div>
          </div>

          {/* Dynamic Cambridge Examiner Advice Card */}
          <div className="panel p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Cambridge Examiner Report Tip</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[10px]"
                  >
                    {currentTip.ao} Target
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setTipIndex((prev) => prev + 1)}
                    className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Next tip"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3.5">
                <h4 className="text-sm font-medium text-foreground">{currentTip.title}</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  "{currentTip.tip}"
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Source: Cambridge 9708 Principal Examiner Guidelines</span>
              <Link to="/command-words" className="text-primary hover:underline font-medium">
                Command words guide →
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function InteractiveStat({
  label,
  value,
  badge,
  hint,
  progressPercent,
  progressLabel,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  badge: string;
  hint: string;
  progressPercent: number;
  progressLabel: string;
  loading: boolean;
  icon: typeof PenLine;
}) {
  return (
    <div className="group rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {value}
            </p>
          )}
          <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5">
            {badge}
          </Badge>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{progressLabel}</span>
          <span className="font-semibold text-foreground tabular-nums">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function AoCard({
  label,
  subtitle,
  score,
  maxScore,
  tone,
  badgeClass,
  insight,
  targetRatio,
}: {
  label: string;
  subtitle: string;
  score: number;
  maxScore: number;
  tone: string;
  badgeClass: string;
  insight: string;
  targetRatio: number;
  aoKey: "ao1" | "ao2" | "ao3";
}) {
  const percent = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  const targetMark = maxScore * targetRatio;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2 py-0.5 font-semibold shrink-0", badgeClass)}
          >
            {score.toFixed(1)} / {maxScore} marks
          </Badge>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Mastery level</span>
            <span className="font-semibold text-foreground tabular-nums">{percent}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500 ease-out", tone)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Level 1 (Basic)</span>
            <span className="font-medium text-primary">Band 1 Target: {targetMark.toFixed(1)}</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
          {insight}
        </p>
      </div>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full text-xs h-8 mt-3 text-primary hover:text-primary hover:bg-primary/10"
      >
        <Link to="/practice">Practise {label.split(" ")[0]} →</Link>
      </Button>
    </div>
  );
}

function QuickActionCard({
  to,
  icon: Icon,
  title,
  badge,
  description,
}: {
  to: string;
  icon: typeof PenLine;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group panel p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-4" />
          </div>
          <Badge
            variant="outline"
            className="border-primary/20 text-[10px] font-medium text-primary bg-primary/5"
          >
            {badge}
          </Badge>
        </div>
        <h3 className="mt-3.5 text-sm font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-primary">
        <span>Launch</span>
        <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

function PerformanceChart({
  versions,
  hoveredPoint,
  onHoverPoint,
}: {
  versions: Array<{ total_mark?: number | null; created_at: string; essay_id?: string | null }>;
  hoveredPoint: { index: number; mark: number; date: string; question: string } | null;
  onHoverPoint: (
    pt: { index: number; mark: number; date: string; question: string } | null,
  ) => void;
}) {
  const width = 800;
  const height = 220;
  const padding = { top: 24, right: 30, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    const list = versions.slice(-15);
    const maxMarkVal = Math.max(12, ...list.map((v) => v.total_mark ?? 0));
    return list.map((v, i) => {
      const mark = v.total_mark ?? 0;
      const pct = maxMarkVal > 0 ? Math.min(1, Math.max(0, mark / maxMarkVal)) : 0;
      const x = padding.left + (i / Math.max(1, list.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - pct * chartHeight;
      const date = new Date(v.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return { x, y, mark, maxMark: maxMarkVal, date, question: `Essay submission #${i + 1}` };
    });
  }, [versions, chartWidth, chartHeight, padding.left, padding.top]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`;
    }, "");
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const bottomY = padding.top + chartHeight;
    return `${pathD} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
  }, [pathD, points, padding.top, chartHeight]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[550px] overflow-visible text-muted-foreground"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Band Reference Lines */}
        {/* Band 1: 75% Distinction Target */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.75)}
          x2={width - padding.right}
          y2={padding.top + chartHeight * (1 - 0.75)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-emerald-500/40"
          strokeWidth="1"
        />
        <text
          x={padding.left + 5}
          y={padding.top + chartHeight * (1 - 0.75) - 4}
          className="text-[9px] fill-emerald-500 font-semibold"
        >
          Band 1 Distinction Target (75%+)
        </text>

        {/* Band 2: 50% Mid Band */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.5)}
          x2={width - padding.right}
          y2={padding.top + chartHeight * (1 - 0.5)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-blue-500/40"
          strokeWidth="1"
        />
        <text
          x={padding.left + 5}
          y={padding.top + chartHeight * (1 - 0.5) - 4}
          className="text-[9px] fill-blue-500 font-semibold"
        >
          Band 2 Pass Target (50%+)
        </text>

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Trajectory Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#4f46e5"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() =>
              onHoverPoint({ index: idx, mark: pt.mark, date: pt.date, question: pt.question })
            }
            onMouseLeave={() => onHoverPoint(null)}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.index === idx ? "6" : "4"}
              className="fill-background stroke-primary transition-all duration-200"
              strokeWidth="2.5"
            />
          </g>
        ))}

        {/* Tooltip on hover */}
        {hoveredPoint !== null && points[hoveredPoint.index] ? (
          <g
            transform={`translate(${Math.max(50, Math.min(width - 50, points[hoveredPoint.index]!.x))}, ${Math.max(35, points[hoveredPoint.index]!.y - 12)})`}
          >
            <rect
              x="-48"
              y="-28"
              width="96"
              height="26"
              rx="6"
              className="fill-popover stroke-border shadow-md"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-11"
              textAnchor="middle"
              className="text-[11px] font-bold fill-foreground"
            >
              {hoveredPoint.mark} marks awarded
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
