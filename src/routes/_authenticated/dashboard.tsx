import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  BookText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Command,
  Dumbbell,
  FileSpreadsheet,
  Flame,
  GraduationCap,
  LibraryBig,
  ListChecks,
  MessageSquare,
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
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyEssays, getProgress } from "@/lib/grading.functions";
import { getMe } from "@/lib/account.functions";
import { listDocuments } from "@/lib/knowledge.functions";
import { listClassrooms } from "@/lib/classroom.functions";
import { listAnchors } from "@/lib/calibration.functions";
import { getMyMcqSummary } from "@/lib/mcq-pdf.functions";
import { TIER_LIMITS } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/backend/client";
import { TARIFF_SPLITS } from "@/lib/examiner/config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Marginal Economics" },
      {
        name: "description",
        content:
          "Search-oriented Cambridge 9708 Economics workspace: past essays, syllabus topics, MCQ papers, and performance analytics.",
      },
      { property: "og:title", content: "Dashboard — Marginal Economics" },
      {
        property: "og:description",
        content: "Search your graded essays, Cambridge syllabus units, and track candidate performance.",
      },
    ],
  }),
  component: DashboardPage,
});

// ---------------------------------------------------------------------------
// Cambridge 9708 Syllabus Search Index
// ---------------------------------------------------------------------------
interface SyllabusTopicItem {
  id: string;
  unit: string;
  title: string;
  level: "AS Level" | "A Level (A2)";
  keywords: string[];
  suggestedPrompt: string;
  tariff: "8" | "12" | "20";
}

const CAMBRIDGE_SYLLABUS_TOPICS: SyllabusTopicItem[] = [
  {
    id: "syl-ppc-scarcity",
    unit: "Unit 1",
    level: "AS Level",
    title: "Scarcity, Opportunity Cost & Production Possibility Curves",
    keywords: ["ppc", "opportunity cost", "scarcity", "choice", "capital goods", "consumer goods", "efficiency"],
    suggestedPrompt: "Discuss whether an outward shift of a country's production possibility curve will always benefit all consumers equally.",
    tariff: "12",
  },
  {
    id: "syl-merit-demerit",
    unit: "Unit 1",
    level: "AS Level",
    title: "Classification of Goods: Public, Merit & Demerit Goods",
    keywords: ["public goods", "merit goods", "demerit goods", "non-excludable", "non-rival", "free rider", "information failure"],
    suggestedPrompt: "Explain the difference between a merit good and a public good, and evaluate the case for government provision of merit goods.",
    tariff: "12",
  },
  {
    id: "syl-ped-pes",
    unit: "Unit 2",
    level: "AS Level",
    title: "Price Elasticity of Demand (PED) & Price Elasticity of Supply (PES)",
    keywords: ["ped", "pes", "elasticity", "total revenue", "inelastic", "elastic", "responsiveness", "determinants"],
    suggestedPrompt: "Assess the extent to which a business can use price elasticity of demand to maximise its revenue.",
    tariff: "12",
  },
  {
    id: "syl-price-controls",
    unit: "Unit 2",
    level: "AS Level",
    title: "Price Controls: Maximum (Ceilings) & Minimum (Floors) Prices",
    keywords: ["maximum price", "minimum price", "price ceiling", "price floor", "shortage", "black market", "minimum wage", "surplus"],
    suggestedPrompt: "Assess whether setting a maximum price on essential food items is the most effective policy to protect low-income consumers.",
    tariff: "12",
  },
  {
    id: "syl-market-failure",
    unit: "Unit 3",
    level: "AS Level",
    title: "Market Failure, Externalities & Deadweight Welfare Loss",
    keywords: ["market failure", "externalities", "negative externalities", "msc", "mpc", "msb", "mpb", "deadweight loss", "allocative inefficiency"],
    suggestedPrompt: "Evaluate whether indirect taxation is the most effective method for a government to correct market failure caused by negative externalities.",
    tariff: "12",
  },
  {
    id: "syl-indirect-taxes",
    unit: "Unit 3",
    level: "AS Level",
    title: "Indirect Taxes & Subsidies (Specific and Ad Valorem)",
    keywords: ["indirect tax", "subsidy", "specific tax", "ad valorem", "tax incidence", "consumer incidence", "producer burden"],
    suggestedPrompt: "Explain how an indirect tax can correct market failure and consider the limitations of this policy.",
    tariff: "8",
  },
  {
    id: "syl-inflation",
    unit: "Unit 4",
    level: "AS Level",
    title: "Inflation: Demand-Pull & Cost-Push Mechanisms",
    keywords: ["inflation", "demand-pull", "cost-push", "cpi", "wage-price spiral", "purchasing power", "menu costs"],
    suggestedPrompt: "Assess whether cost-push inflation is always more harmful to an economy than demand-pull inflation.",
    tariff: "12",
  },
  {
    id: "syl-exchange-rates",
    unit: "Unit 4",
    level: "AS Level",
    title: "Exchange Rates: Floating vs Fixed Systems, Depreciation & Appreciation",
    keywords: ["exchange rates", "depreciation", "appreciation", "floating exchange rate", "fixed exchange rate", "marshall-lerner", "j-curve", "current account"],
    suggestedPrompt: "Evaluate whether a depreciating exchange rate will always reduce a country's current account deficit.",
    tariff: "12",
  },
  {
    id: "syl-bop-current-account",
    unit: "Unit 4",
    level: "AS Level",
    title: "Balance of Payments: Current Account Deficits & Policies",
    keywords: ["balance of payments", "current account", "trade deficit", "expenditure-switching", "expenditure-reducing", "tariffs"],
    suggestedPrompt: "Discuss whether expenditure-switching policies are more effective than expenditure-reducing policies in correcting a current account deficit.",
    tariff: "12",
  },
  {
    id: "syl-fiscal-monetary",
    unit: "Unit 5",
    level: "AS Level",
    title: "Macroeconomic Policies: Fiscal Policy & Monetary Policy",
    keywords: ["fiscal policy", "monetary policy", "interest rates", "taxation", "budget deficit", "quantitative easing", "central bank"],
    suggestedPrompt: "Assess whether monetary policy is more effective than fiscal policy in reducing unemployment during a recession.",
    tariff: "12",
  },
  {
    id: "syl-protectionism",
    unit: "Unit 5",
    level: "AS Level",
    title: "Protectionism: Tariffs, Quotas, Subsidies & Free Trade",
    keywords: ["tariffs", "protectionism", "quotas", "free trade", "comparative advantage", "infant industry", "deadweight loss", "retaliation"],
    suggestedPrompt: "Evaluate whether the imposition of import tariffs will always protect domestic employment in the long run.",
    tariff: "12",
  },
  {
    id: "syl-market-structures",
    unit: "Unit 6",
    level: "A Level (A2)",
    title: "Market Structures: Monopoly, Oligopoly & Perfect Competition",
    keywords: ["monopoly", "oligopoly", "perfect competition", "supernormal profit", "barriers to entry", "kinked demand curve", "game theory"],
    suggestedPrompt: "Discuss whether a monopoly is always less efficient than a firm operating in perfect competition.",
    tariff: "20",
  },
  {
    id: "syl-labour-markets",
    unit: "Unit 6",
    level: "A Level (A2)",
    title: "Labour Markets: Wage Determination, Marginal Revenue Product & Trade Unions",
    keywords: ["labour markets", "mrp", "wage determination", "trade unions", "national minimum wage", "monopsony", "elasticity of demand for labour"],
    suggestedPrompt: "Evaluate whether the introduction of a national minimum wage will always lead to an increase in unemployment in a labour market.",
    tariff: "20",
  },
  {
    id: "syl-multiplier-growth",
    unit: "Unit 6",
    level: "A Level (A2)",
    title: "Economic Growth, the Multiplier & Circular Flow of Income",
    keywords: ["multiplier", "accelerator", "economic growth", "circular flow", "mpc", "mps", "injections", "withdrawals"],
    suggestedPrompt: "Assess the extent to which the national income multiplier determines the success of expansionary fiscal policy.",
    tariff: "20",
  },
];

// ---------------------------------------------------------------------------
// Tools Search Index
// ---------------------------------------------------------------------------
const TOOLS_INDEX = [
  {
    id: "tool-grade",
    title: "Essay Grader",
    category: "Tools & Features",
    subtitle: "Authoritative Cambridge 9708 marking, AO breakdown & Pass 4 in-situ comments",
    href: "/grade",
    badge: "Grader",
    icon: PenLine,
    keywords: ["grade", "essay", "mark", "examiner", "marking", "ao1", "ao2", "ao3", "rubric"],
  },
  {
    id: "tool-mcq",
    title: "MCQ Past Papers",
    category: "Tools & Features",
    subtitle: "Real Paper 1 & Paper 3 exam papers with timer, question matrix & AI explanations",
    href: "/mcq-live",
    badge: "Papers 1 & 3",
    icon: ListChecks,
    keywords: ["mcq", "multiple choice", "paper 1", "paper 3", "past papers", "quiz", "timer"],
  },
  {
    id: "tool-question-bank",
    title: "Cambridge Question Bank",
    category: "Tools & Features",
    subtitle: "Filter hundreds of past paper essay and MCQ questions or generate fresh prompts",
    href: "/question-bank",
    badge: "Question Bank",
    icon: LibraryBig,
    keywords: ["question bank", "past questions", "prompts", "questions", "past papers"],
  },
  {
    id: "tool-predictor",
    title: "Paper Matrix & Topic Predictor",
    category: "Tools & Features",
    subtitle: "15-year cycle intelligence analyzing overdue Cambridge 9708 syllabus topics",
    href: "/paper-matrix",
    badge: "15-Yr Intelligence",
    icon: Flame,
    keywords: ["matrix", "predictor", "prediction", "forecast", "overdue", "trends", "exam"],
  },
  {
    id: "tool-diagrams",
    title: "Diagram CAD Lab",
    category: "Tools & Features",
    subtitle: "Interactive vector economics curves, tax shifts, deadweight loss & price ceilings",
    href: "/diagram-lab",
    badge: "Diagram CAD",
    icon: Sliders,
    keywords: ["diagram", "diagrams", "curves", "graph", "supply", "demand", "cad", "equilibrium"],
  },
  {
    id: "tool-data-response",
    title: "Data Response Papers",
    category: "Tools & Features",
    subtitle: "Paper 2 & 4 Section A practice with Table 1.1 case study data interpretation",
    href: "/data-response",
    badge: "Section A",
    icon: FileSpreadsheet,
    keywords: ["data response", "section a", "table 1.1", "case study", "paper 2", "paper 4"],
  },
  {
    id: "tool-model-generator",
    title: "Sample Essay Generator",
    category: "Tools & Features",
    subtitle: "Examiner-standard Cambridge model essays with embedded diagrams and AO mark allocations",
    href: "/essay-generator",
    badge: "Model Answers",
    icon: Wand2,
    keywords: ["sample", "model essay", "generator", "exemplar", "full mark", "example"],
  },
  {
    id: "tool-definitions",
    title: "Cambridge Definitions Hub",
    category: "Tools & Features",
    subtitle: "120+ verified Cambridge 9708 definitions with essential AO1 keywords & flashcards",
    href: "/definitions",
    badge: "Definitions",
    icon: BookText,
    keywords: ["definition", "definitions", "glossary", "ao1", "terms", "flashcards"],
  },
  {
    id: "tool-ao-drills",
    title: "AO Skills Coach",
    category: "Tools & Features",
    subtitle: "Targeted drills for AO1 definitions, AO2 causal chains, and AO3 evaluative judgements",
    href: "/practice",
    badge: "Skills Coach",
    icon: Dumbbell,
    keywords: ["practice", "drills", "ao skills", "causal chains", "evaluation drills"],
  },
];

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const fetchProgress = useServerFn(getProgress);
  const fetchEssays = useServerFn(listMyEssays);
  const fetchMe = useServerFn(getMe);
  const fetchDocs = useServerFn(listDocuments);
  const fetchClassrooms = useServerFn(listClassrooms);
  const fetchAnchors = useServerFn(listAnchors);
  const fetchMcqSummary = useServerFn(getMyMcqSummary);

  const progress = useQuery({ queryKey: ["progress"], queryFn: () => fetchProgress() });
  const essays = useQuery({ queryKey: ["essays"], queryFn: () => fetchEssays() });
  const mcqSummary = useQuery({ queryKey: ["my-mcq-summary"], queryFn: () => fetchMcqSummary() });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocs(),
    enabled: me.data?.isStaff === true,
  });

  const [clientSessionUser, setClientSessionUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setClientSessionUser(data.user);
    });
  }, []);

  const routeContext = Route.useRouteContext();
  const sessionUser = (routeContext as any)?.user || clientSessionUser;

  const rawUserTier =
    me.data?.subscription?.tier ??
    (sessionUser?.app_metadata as any)?.tier ??
    (sessionUser?.user_metadata as any)?.tier;
  const userTierName =
    me.data?.subscription?.tierName ||
    (rawUserTier ? (TIER_LIMITS as any)[rawUserTier]?.name : "Free Tier");
  const isTeacherUser =
    me.data?.role === "teacher" ||
    (sessionUser?.user_metadata as any)?.role === "teacher" ||
    (sessionUser?.app_metadata as any)?.role === "teacher";
  const userDisplayName =
    me.data?.fullName ||
    (sessionUser?.user_metadata as any)?.full_name ||
    (sessionUser?.email ? sessionUser.email.split("@")[0] : "Candidate");

  const classrooms = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => fetchClassrooms(),
    enabled: Boolean(isTeacherUser || me.data?.isStaff),
  });

  const anchors = useQuery({
    queryKey: ["anchors"],
    queryFn: () => fetchAnchors(),
    enabled: Boolean(isTeacherUser || me.data?.isStaff),
  });

  // Spotlight Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "essays" | "syllabus" | "mcq" | "tools">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / / shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Performance calculation data
  const versions = useMemo(() => progress.data ?? [], [progress.data]);
  const marks = useMemo(() => versions.map((v) => v.total_mark ?? 0), [versions]);

  const essayMap = useMemo(
    () => new Map((essays.data ?? []).map((e) => [e.id, e.max_mark])),
    [essays.data],
  );

  const getVersionMaxMark = useCallback(
    (v: {
      essay_id?: string | null;
      total_mark?: number | null;
      essays?: { max_mark?: number | null; question?: string | null } | { max_mark?: number | null; question?: string | null }[] | null;
    }) => {
      const essayObj = Array.isArray(v.essays) ? v.essays[0] : v.essays;
      if (essayObj?.max_mark && Number(essayObj.max_mark) > 0) {
        return Number(essayObj.max_mark);
      }
      if (v.essay_id && essayMap.has(v.essay_id)) {
        return essayMap.get(v.essay_id)!;
      }
      const mark = v.total_mark ?? 0;
      if (mark > 12) return 20;
      if (mark > 8) return 12;
      return 12;
    },
    [essayMap],
  );

  // Personal Best Attempt
  const bestAttempt = useMemo(() => {
    if (!versions.length) return null;
    let topVersion = versions[0];
    let topPct = -1;
    let topMark = -1;

    for (const v of versions) {
      const mark = v.total_mark ?? 0;
      const max = getVersionMaxMark(v);
      const pct = max > 0 ? mark / max : 0;
      if (pct > topPct || (pct === topPct && mark > topMark)) {
        topPct = pct;
        topMark = mark;
        topVersion = v;
      }
    }
    const maxMark = topVersion ? getVersionMaxMark(topVersion) : 12;
    const mark = topVersion?.total_mark ?? 0;
    return {
      mark,
      maxMark,
      percentage: maxMark > 0 ? Math.round((mark / maxMark) * 100) : 0,
    };
  }, [versions, getVersionMaxMark]);

  // Robust Average metrics across tariffs
  const averageMetrics = useMemo(() => {
    if (!versions.length) {
      return {
        display: "—",
        avgPct: 0,
        trend: 0,
      };
    }

    const versionPercentages = versions.map((v) => {
      const mark = v.total_mark ?? 0;
      const max = getVersionMaxMark(v);
      return max > 0 ? (mark / max) * 100 : 0;
    });

    const avgPct =
      versionPercentages.reduce((a, b) => a + b, 0) / versionPercentages.length;

    const firstMax = getVersionMaxMark(versions[0]);
    const allSameTariff = versions.every((v) => getVersionMaxMark(v) === firstMax);

    let display = "";
    if (allSameTariff) {
      const avgMark = marks.reduce((a, b) => a + b, 0) / marks.length;
      display = `${avgMark.toFixed(1)}/${firstMax}`;
    } else {
      display = `${Math.round(avgPct)}%`;
    }

    const recentPct = versionPercentages.slice(-5);
    const earlierPct = versionPercentages.slice(0, -5);
    const trend =
      recentPct.length && earlierPct.length
        ? recentPct.reduce((a, b) => a + b, 0) / recentPct.length -
          earlierPct.reduce((a, b) => a + b, 0) / earlierPct.length
        : 0;

    return {
      display,
      avgPct: Math.round(avgPct),
      trend,
    };
  }, [versions, marks, getVersionMaxMark]);

  // Study Progress & Consistency Index (0 - 100%)
  const progressIndex = useMemo(() => {
    if (versions.length === 0) return 0;
    const avgPercent = Math.min(100, Math.max(0, averageMetrics.avgPct));
    const volumeScore = Math.min(30, versions.length * 6);
    const consistencyScore = averageMetrics.trend >= 0 ? 10 : 0;
    return Math.min(100, Math.round(avgPercent * 0.6 + volumeScore + consistencyScore));
  }, [averageMetrics.avgPct, averageMetrics.trend, versions.length]);

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

  // AO Averages
  const aoAverage = (key: "ao1_awarded" | "ao2_awarded" | "ao3_awarded") => {
    const values = versions.map((v) => v[key] ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  // Trajectory hover state
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    mark: number;
    maxMark?: number;
    date: string;
    question: string;
  } | null>(null);

  // Greeting by hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // -------------------------------------------------------------------------
  // Search Filtering Engine
  // -------------------------------------------------------------------------
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Search Results: Graded Essays
  const essaySearchResults = useMemo(() => {
    if (!essays.data) return [];
    if (!normalizedQuery && activeFilter !== "essays") return [];
    return essays.data.filter((essay) => {
      if (!normalizedQuery) return true;
      return essay.question.toLowerCase().includes(normalizedQuery);
    });
  }, [essays.data, normalizedQuery, activeFilter]);

  // Search Results: Syllabus Topics
  const syllabusSearchResults = useMemo(() => {
    if (!normalizedQuery && activeFilter !== "syllabus") return [];
    return CAMBRIDGE_SYLLABUS_TOPICS.filter((topic) => {
      if (!normalizedQuery) return true;
      return (
        topic.title.toLowerCase().includes(normalizedQuery) ||
        topic.unit.toLowerCase().includes(normalizedQuery) ||
        topic.level.toLowerCase().includes(normalizedQuery) ||
        topic.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [normalizedQuery, activeFilter]);

  // Search Results: Tools
  const toolSearchResults = useMemo(() => {
    if (!normalizedQuery && activeFilter !== "tools") return [];
    return TOOLS_INDEX.filter((tool) => {
      if (!normalizedQuery) return true;
      return (
        tool.title.toLowerCase().includes(normalizedQuery) ||
        tool.subtitle.toLowerCase().includes(normalizedQuery) ||
        tool.badge.toLowerCase().includes(normalizedQuery) ||
        tool.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [normalizedQuery, activeFilter]);

  // Search Results: MCQ Papers
  const mcqSearchResults = useMemo(() => {
    if (!normalizedQuery && activeFilter !== "mcq") return [];
    const papers = [
      { id: "mcq-p1-2024", title: "Paper 1 AS Micro & Macro (Summer 2024)", level: "AS Level", questions: 30, code: "9708/12/M/J/24" },
      { id: "mcq-p1-2023", title: "Paper 1 AS Micro & Macro (Summer 2023)", level: "AS Level", questions: 30, code: "9708/12/M/J/23" },
      { id: "mcq-p3-2024", title: "Paper 3 A2 Advanced Economics (Summer 2024)", level: "A2 Level", questions: 30, code: "9708/32/M/J/24" },
      { id: "mcq-p3-2023", title: "Paper 3 A2 Advanced Economics (Summer 2023)", level: "A2 Level", questions: 30, code: "9708/32/M/J/23" },
      { id: "mcq-p1-2022", title: "Paper 1 AS Economics Multiple Choice (2022)", level: "AS Level", questions: 30, code: "9708/11/O/N/22" },
    ];
    return papers.filter((p) => {
      if (!normalizedQuery) return true;
      return (
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.code.toLowerCase().includes(normalizedQuery) ||
        p.level.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes("mcq") ||
        normalizedQuery.includes("paper 1") ||
        normalizedQuery.includes("paper 3")
      );
    });
  }, [normalizedQuery, activeFilter]);

  const hasSearchQuery = normalizedQuery.length > 0 || activeFilter !== "all";
  const totalSearchResultsCount =
    essaySearchResults.length +
    syllabusSearchResults.length +
    toolSearchResults.length +
    mcqSearchResults.length;

  // Educator View Branch
  if (isTeacherUser && !me.data?.isAdmin) {
    return (
      <EducatorDashboardView
        userName={userDisplayName}
        school={me.data?.school ?? (sessionUser?.user_metadata as any)?.school ?? null}
        tierName={userTierName}
        classrooms={classrooms.data?.classes ?? (Array.isArray(classrooms.data) ? classrooms.data : [])}
        docs={docs.data ?? []}
        anchors={anchors.data ?? []}
        essays={essays.data ?? []}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Cambridge 9708 Economics candidate hub. Search past essays, syllabus topics, and monitor exam readiness."
        action={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
              <Link to="/grade">
                <PenLine className="size-3.5 mr-1.5" /> Mark New Essay
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl 2xl:max-w-[1520px] mx-auto space-y-6 px-4 py-5 sm:px-6 md:px-8">
        {/* ── 1. Clean Candidate Metrics Header ────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-gradient-to-br from-purple-500/[0.05] via-card to-card p-4 sm:p-5 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {greeting},{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                  {userDisplayName.split(" ")[0]}
                </span>
              </h2>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-mono font-semibold">
                Cambridge 9708 Standard
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Candidate command center. Type in the search bar below or press{" "}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted border border-border rounded text-foreground">Ctrl+K</kbd>{" "}
              to jump directly to any topic, past essay, or exam tool.
            </p>
          </div>

          {/* Core Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            {/* Candidate Average */}
            <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 sm:px-3 text-center min-w-[110px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Candidate Avg
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-foreground block tabular-nums">
                {averageMetrics.display}
              </span>
              <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 block -mt-0.5">
                {averageMetrics.trend !== 0 ? `${averageMetrics.trend > 0 ? "+" : ""}${averageMetrics.trend.toFixed(1)}% trend` : "Calibrated"}
              </span>
            </div>

            {/* Essays Evaluated */}
            <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 sm:px-3 text-center min-w-[110px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Essays Marked
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-foreground block tabular-nums">
                {versions.length}
              </span>
              <span className="text-[9.5px] text-muted-foreground block -mt-0.5">
                {essays.data?.length ?? 0} threads
              </span>
            </div>

            {/* Personal Best */}
            <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 sm:px-3 text-center min-w-[110px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Personal Best
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-foreground block tabular-nums">
                {bestAttempt ? `${bestAttempt.mark}/${bestAttempt.maxMark}` : "—"}
              </span>
              <span className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 block -mt-0.5">
                {bestAttempt ? `${bestAttempt.percentage}% score` : "First draft"}
              </span>
            </div>

            {/* Exam Readiness */}
            <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 sm:px-3 text-center min-w-[110px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Readiness
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-foreground block tabular-nums">
                {progressIndex}%
              </span>
              <span className="text-[9.5px] font-semibold text-primary truncate block -mt-0.5">
                {progressIndex >= 75 ? "Band 1 Track" : progressIndex >= 50 ? "Band 2 Track" : "Calibrating"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Universal Spotlight Search Command Bar ────────────────── */}
        <section className="space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="size-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your graded essays, Cambridge 9708 syllabus topics (e.g. elasticity, inflation, exchange rates), MCQs, or tools..."
              className="w-full h-13 pl-12 pr-28 rounded-2xl border-2 border-border/80 bg-card/90 shadow-xs text-sm sm:text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[11px] font-mono text-muted-foreground border border-border/60">
                <Command className="size-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold mr-1 shrink-0">
              Filter by:
            </span>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all whitespace-nowrap cursor-pointer text-xs",
                activeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              All Results
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("essays")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1",
                activeFilter === "essays"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <PenLine className="size-3" /> My Graded Essays ({essays.data?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("syllabus")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1",
                activeFilter === "syllabus"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <BookOpen className="size-3" /> Syllabus &amp; Topics
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("mcq")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1",
                activeFilter === "mcq"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <ListChecks className="size-3" /> MCQ Past Papers
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("tools")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1",
                activeFilter === "tools"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Sliders className="size-3" /> Tools &amp; Features
            </button>
          </div>
        </section>

        {/* ── 3. Search Results State (When user is searching) ──────────── */}
        {hasSearchQuery ? (
          <section className="space-y-6 pt-2">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <p className="text-sm font-semibold text-foreground">
                Found <span className="font-bold text-primary">{totalSearchResultsCount}</span> match{totalSearchResultsCount === 1 ? "" : "es"}
                {searchQuery ? ` for "${searchQuery}"` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Reset to Full Dashboard
              </button>
            </div>

            {totalSearchResultsCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <Search className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">No matches found for "{searchQuery}"</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                  Try searching for general Cambridge 9708 terms like <em>elasticity</em>, <em>market failure</em>, <em>inflation</em>, <em>exchange rate</em>, or <em>MCQ</em>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-xs font-semibold"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* A. Graded Essays Matches */}
                {(activeFilter === "all" || activeFilter === "essays") && essaySearchResults.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <PenLine className="size-3.5 text-primary" />
                      <span>Your Graded Essays ({essaySearchResults.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {essaySearchResults.map((essay) => (
                        <Link
                          key={essay.id}
                          to="/essay/$essayId"
                          params={{ essayId: essay.id }}
                          className="group rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary/50 hover:shadow-xs transition-all flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {essay.question}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Tariff: {essay.max_mark}m</span>
                              <span>•</span>
                              <span>{new Date(essay.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 font-mono text-xs font-bold bg-primary/5 text-primary border-primary/20">
                            {essay.latest_mark ?? "—"}/{essay.max_mark}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* B. Cambridge Syllabus Topics Matches */}
                {(activeFilter === "all" || activeFilter === "syllabus") && syllabusSearchResults.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <BookOpen className="size-3.5 text-primary" />
                      <span>Cambridge 9708 Syllabus Topics ({syllabusSearchResults.length})</span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {syllabusSearchResults.map((topic) => (
                        <div
                          key={topic.id}
                          className="rounded-xl border border-border/80 bg-card p-4 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {topic.unit} · {topic.level}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {topic.tariff}m Syllabus Prompt
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                              {topic.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                              "{topic.suggestedPrompt}"
                            </p>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                            <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 p-0 font-semibold">
                              <Link to="/grade" search={{ sample: Number(topic.tariff) as any }}>
                                Write essay on this topic →
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* C. MCQ Past Papers Matches */}
                {(activeFilter === "all" || activeFilter === "mcq") && mcqSearchResults.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <ListChecks className="size-3.5 text-primary" />
                      <span>Cambridge MCQ Past Papers ({mcqSearchResults.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {mcqSearchResults.map((mcq) => (
                        <Link
                          key={mcq.id}
                          to="/mcq-live"
                          className="group rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary/50 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {mcq.title}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {mcq.code} · {mcq.questions} Questions · Timed
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 shrink-0">
                            Start Paper <ArrowUpRight className="size-3" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* D. Tools & Features Matches */}
                {(activeFilter === "all" || activeFilter === "tools") && toolSearchResults.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Sliders className="size-3.5 text-primary" />
                      <span>Cambridge Tools &amp; Features ({toolSearchResults.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {toolSearchResults.map((tool) => {
                        const IconComponent = tool.icon;
                        return (
                          <Link
                            key={tool.id}
                            to={tool.href}
                            className="group rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary/50 hover:shadow-xs transition-all flex items-start gap-3"
                          >
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <IconComponent className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  {tool.title}
                                </h4>
                                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 shrink-0">
                                  {tool.badge}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {tool.subtitle}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          /* ── 4. Clean Uncluttered Default View (When not searching) ──── */
          <div className="space-y-6">
            {/* 4 Primary Fast-Launcher Action Hub Cards (No billion buttons) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Essay Grader */}
              <Link
                to="/grade"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                      <PenLine className="size-4.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold border-primary/20 bg-primary/5 text-primary">
                      AO Grader
                    </Badge>
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Grade an Essay
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    Line-by-line Cambridge 9708 AO1/AO2/AO3 marks, Pass 4 in-situ comment pins &amp; rewrite roadmap.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Mark New Essay</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>

              {/* Card 2: MCQ Desk */}
              <Link
                to="/mcq-live"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                      <ListChecks className="size-4.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                      Papers 1 &amp; 3
                    </Badge>
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    MCQ Past Papers
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    Official Cambridge past papers with interactive exam timer, auto-marking &amp; distractor explanations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Practice MCQs</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>

              {/* Card 3: Question Bank & Cycle Predictor */}
              <Link
                to="/question-bank"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-amber-500/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs">
                      <Flame className="size-4.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                      15-Yr Bank
                    </Badge>
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Question Bank &amp; Predictor
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    15 years of Cambridge 9708 past papers, topic rotation predictor &amp; prompt generator.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span>Explore Papers</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>

              {/* Card 4: Diagram CAD Lab */}
              <Link
                to="/diagram-lab"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-purple-500/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                      <Sliders className="size-4.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400">
                      Vector CAD
                    </Badge>
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Diagram CAD Lab
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    Interactive economics curves: tax shifts, subsidies, deadweight loss &amp; equilibrium labels.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <span>Open Diagram CAD</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </div>

            {/* Main Content Layout: Left (Recent Essays) + Right (Performance Chart & AO Mastery) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (7 cols): Recent Graded Essays */}
              <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/70 px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <PenLine className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Your Graded Essays</h3>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {essays.data?.length ?? 0}
                    </Badge>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary font-semibold hover:bg-primary/10">
                    <Link to="/grade">
                      + Grade New
                    </Link>
                  </Button>
                </div>

                {essays.isLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !essays.data || essays.data.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Ready for your first essay</p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                        Submit an essay or try our 1-click sample to unlock your Cambridge performance trajectory.
                      </p>
                    </div>
                    <Button asChild size="sm" className="text-xs font-semibold mt-2">
                      <Link to="/grade" search={{ sample: 12 }}>
                        <Wand2 className="size-3.5 mr-1.5" /> Try 1-Click Sample Essay
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {essays.data.slice(0, 6).map((essay) => {
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
                            className="group flex items-center justify-between gap-3 px-4 sm:px-5 py-3 transition-colors hover:bg-muted/40"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="truncate text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {essay.question}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{new Date(essay.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                <span>•</span>
                                <span>Tariff: {essay.max_mark}m</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-2 py-0.5 font-bold font-mono",
                                  isTopBand
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : isMidBand
                                      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                )}
                              >
                                {isTopBand ? "Band 1" : isMidBand ? "Band 2" : "Band 3"} · {pct}%
                              </Badge>
                              <span className="text-xs sm:text-sm font-bold tabular-nums">
                                {essay.latest_mark ?? "—"}/{essay.max_mark}
                              </span>
                              <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Right Column (5 cols): Performance Trajectory & AO Mastery */}
              <div className="lg:col-span-5 space-y-4">
                {/* Performance Chart Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Score Trajectory</h3>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Level 4 (80%+) · Level 3 (55%+)
                    </span>
                  </div>

                  {marks.length >= 2 ? (
                    <PerformanceChart
                      versions={versions}
                      hoveredPoint={hoveredPoint}
                      onHoverPoint={setHoveredPoint}
                    />
                  ) : (
                    <div className="py-6 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/20">
                      <Sparkles className="size-6 text-primary/60 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">Trajectory unlocks after 2 submissions</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Grade your second essay to begin plotting chronological progression.
                      </p>
                    </div>
                  )}
                </div>

                {/* Compact AO Mastery Summary */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Award className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Assessment Objective Mastery</h3>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Official Cambridge 9708</span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* AO1 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-sky-500" /> AO1 Knowledge &amp; Definitions
                        </span>
                        <span className="font-mono font-bold text-muted-foreground text-[11px]">
                          {aoAverage("ao1_awarded").toFixed(1)} / 2m
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${Math.min(100, (aoAverage("ao1_awarded") / 2) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* AO2 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-indigo-500" /> AO2 Analysis &amp; Causal Chains
                        </span>
                        <span className="font-mono font-bold text-muted-foreground text-[11px]">
                          {aoAverage("ao2_awarded").toFixed(1)} / 6m
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, (aoAverage("ao2_awarded") / 6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* AO3 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-amber-500" /> AO3 Evaluation &amp; Context
                        </span>
                        <span className="font-mono font-bold text-muted-foreground text-[11px]">
                          {aoAverage("ao3_awarded").toFixed(1)} / 4m
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (aoAverage("ao3_awarded") / 4) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Focus: Evaluation is the #1 Band 1 decider</span>
                    <Link to="/practice" className="font-semibold text-primary hover:underline">
                      Train Drills →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Performance Trajectory Chart Subcomponent
// ---------------------------------------------------------------------------
function PerformanceChart({
  versions,
  hoveredPoint,
  onHoverPoint,
}: {
  versions: Array<{
    total_mark?: number | null;
    created_at: string;
    essay_id?: string | null;
    essays?: { max_mark?: number | null; question?: string | null } | { max_mark?: number | null; question?: string | null }[] | null;
  }>;
  hoveredPoint: { index: number; mark: number; maxMark?: number; date: string; question: string } | null;
  onHoverPoint: (
    pt: { index: number; mark: number; maxMark?: number; date: string; question: string } | null,
  ) => void;
}) {
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 90, bottom: 25, left: 30 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    const list = versions.slice(-10);
    return list.map((v, i) => {
      const mark = v.total_mark ?? 0;
      const essayObj = Array.isArray(v.essays) ? v.essays[0] : v.essays;
      const maxMark = Number(essayObj?.max_mark) || (mark > 12 ? 20 : 12);
      const pct = maxMark > 0 ? Math.min(1, Math.max(0, mark / maxMark)) : 0;
      const x = padding.left + (i / Math.max(1, list.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - pct * chartHeight;
      const date = new Date(v.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const qText = essayObj?.question || `Essay submission #${i + 1}`;
      return { x, y, mark, maxMark, pct: Math.round(pct * 100), date, question: qText };
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
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-muted-foreground">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Top Band 80% */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.8)}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight * (1 - 0.8)}
          stroke="currentColor"
          strokeDasharray="3 3"
          className="text-emerald-500/40"
          strokeWidth="1"
        />
        <text
          x={width - 5}
          y={padding.top + chartHeight * (1 - 0.8) + 3}
          textAnchor="end"
          className="text-[9px] fill-emerald-600 dark:fill-emerald-400 font-semibold select-none font-mono"
        >
          Band 1 (80%+)
        </text>

        {/* Mid Band 55% */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.55)}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight * (1 - 0.55)}
          stroke="currentColor"
          strokeDasharray="3 3"
          className="text-blue-500/40"
          strokeWidth="1"
        />
        <text
          x={width - 5}
          y={padding.top + chartHeight * (1 - 0.55) + 3}
          textAnchor="end"
          className="text-[9px] fill-blue-600 dark:fill-blue-400 font-semibold select-none font-mono"
        >
          Band 2 (55%+)
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

        {/* Points */}
        {points.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() =>
              onHoverPoint({ index: idx, mark: pt.mark, maxMark: pt.maxMark, date: pt.date, question: pt.question })
            }
            onMouseLeave={() => onHoverPoint(null)}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.index === idx ? "5" : "3.5"}
              className="fill-background stroke-primary transition-all duration-200"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Tooltip on hover */}
        {hoveredPoint !== null && points[hoveredPoint.index] ? (
          <g
            transform={`translate(${Math.max(45, Math.min(width - 60, points[hoveredPoint.index]?.x ?? 0))}, ${Math.max(25, (points[hoveredPoint.index]?.y ?? 0) - 10)})`}
          >
            <rect
              x="-45"
              y="-22"
              width="90"
              height="20"
              rx="4"
              className="fill-popover stroke-border shadow-md"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-8"
              textAnchor="middle"
              className="text-[10px] font-bold fill-foreground"
            >
              {hoveredPoint.mark}/{hoveredPoint.maxMark ?? 12} ({Math.round(((hoveredPoint.mark) / (hoveredPoint.maxMark ?? 12)) * 100)}%)
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Educator View (Preserved for Teachers)
// ---------------------------------------------------------------------------
function EducatorDashboardView({
  userName,
  school,
  tierName,
  classrooms,
  docs,
  anchors,
  essays,
}: {
  userName: string;
  school: string | null;
  tierName: string;
  classrooms: any;
  docs: any[];
  anchors: any[];
  essays: any[];
}) {
  const classList: any[] = Array.isArray(classrooms)
    ? classrooms
    : classrooms?.classes && Array.isArray(classrooms.classes)
      ? classrooms.classes
      : [];
  const safeDocs = Array.isArray(docs) ? docs : [];
  const safeAnchors = Array.isArray(anchors) ? anchors : [];
  const safeEssays = Array.isArray(essays) ? essays : [];

  const readyDocs = safeDocs.filter((d) => d.status === "ready").length;
  const activeAnchors = safeAnchors.filter((a) => a.active !== false).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Educator Command Center"
        description="Cambridge 9708 Economics educator workspace, classrooms, mark schemes, and calibrated anchors."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/classes">
                <UsersRound className="size-3.5 text-primary mr-1.5" /> My Classrooms
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/grade">
                <PenLine className="size-3.5 mr-1.5" /> Grade Essay
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4 sm:space-y-6 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto">
        <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card p-3.5 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Welcome back, {userName}!
                </h2>
                <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10.5px] font-bold">
                  Authorized Cambridge 9708 Educator
                </Badge>
                {school ? (
                  <Badge variant="outline" className="border-border text-foreground text-[10.5px] font-medium">
                    {school}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Your academic workspace is active. Manage your classrooms, evaluate candidate essays, ingest mark schemes, and calibrate standard anchors.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <Button asChild size="sm" variant="outline" className="border-purple-500/30 hover:bg-purple-500/10 text-xs">
                <Link to="/classes">
                  <UsersRound className="size-3.5 mr-1 text-purple-600 dark:text-purple-400" /> My Classrooms
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs">
                <Link to="/grade">
                  <PenLine className="size-3.5 mr-1" /> Grade Essay
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {classList.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-purple-500/40 bg-purple-500/[0.04] p-5 sm:p-8 text-center">
            <div className="mx-auto size-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <UsersRound className="size-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">No Classrooms Created Yet</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Create your first Cambridge 9708 classroom to invite students, set homework essays, and view student progress.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4">
                <Link to="/classes">
                  <UsersRound className="size-3.5 mr-1.5" /> Create Your First Classroom
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/grade">
                  <PenLine className="size-3.5 mr-1.5" /> Grade an Essay Now
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Classrooms</p>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UsersRound className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{classList.length}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active classrooms</span>
                  <Link to="/classes" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Manage <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Knowledge Base</p>
                  <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{readyDocs}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ingested RAG documents</span>
                  <Link to="/knowledge" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Search &amp; Add <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Calibrated Anchors</p>
                  <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{activeAnchors}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Standardized benchmarks</span>
                  <Link to="/calibration" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Calibrate <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Evaluated Essays</p>
                  <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <PenLine className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{safeEssays.length}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Submissions evaluated</span>
                  <Link to="/grade" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Grade <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Enrolled Classrooms</h3>
                  <p className="text-xs text-muted-foreground">
                    Classroom analytics, assignment submissions, and student performance diagnostic gradebooks.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to="/classes">
                    <UsersRound className="size-3.5 mr-1" /> View All Classrooms
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classList.map((cls) => (
                  <div key={cls.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{cls.name}</h4>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                          {cls.level.toUpperCase()} Level Cambridge Economics
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0">
                        Code: {cls.join_code}
                      </Badge>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Student Roster &amp; Grades</span>
                      <Link to="/classes" className="font-semibold text-primary hover:underline flex items-center gap-1">
                        Open Classroom &amp; Grades →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
