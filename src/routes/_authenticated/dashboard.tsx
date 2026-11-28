import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookText,
  Camera,
  ClipboardCheck,
  FileSpreadsheet,
  Gamepad2,
  Globe2,
  GraduationCap,
  LibraryBig,
  LineChart,
  ListChecks,
  MessageSquare,
  PenLine,
  Search,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/backend/client";
import { getMe } from "@/lib/account.functions";
import { listAnchors } from "@/lib/calibration.functions";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";
import { listClassrooms } from "@/lib/classroom.functions";
import { DIAGRAMS } from "@/lib/diagrams/catalog";
import { getProgress, listMyEssays } from "@/lib/grading.functions";
import { listDocuments } from "@/lib/knowledge.functions";
import { getMyMcqSummary } from "@/lib/mcq-pdf.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Marginal Economics" },
      {
        name: "description",
        content:
          "Search-first Cambridge 9708 Economics command hub — launch Live Examiner, Essay Grader, MCQ Suite & Arena, and syllabus tools in one click.",
      },
      { property: "og:title", content: "Dashboard — Marginal Economics" },
      {
        property: "og:description",
        content: "Search Cambridge 9708 tools, launch Live Examiner, grade essays, and drill past-paper MCQs.",
      },
    ],
  }),
  component: DashboardPage,
});

const SEARCH_PLACEHOLDERS = [
  'Search definitions, diagrams, past essays — or paste any essay question...',
  'Try "minimum price", "cost-push inflation", "PED", or "Paper 1 MCQ"...',
  'Paste a Paper 2 or Paper 4 prompt to grade or practice live...',
];

const QUICK_SEARCH_CHIPS: Array<{
  label: string;
  action: "grade" | "definitions" | "diagram" | "mcq" | "live";
  query?: string;
  marks?: 8 | 12 | 20;
}> = [
  {
    label: "Minimum price [12m]",
    action: "grade",
    query: "Assess the effectiveness of a minimum price on demerit goods.",
    marks: 12,
  },
  {
    label: "Cost-push inflation [20m]",
    action: "grade",
    query: "Evaluate whether monetary policy is the best way to reduce cost-push inflation.",
    marks: 20,
  },
  { label: "Live Examiner", action: "live" },
  { label: "PED definition", action: "definitions", query: "Price Elasticity of Demand" },
  { label: "AD/AS Diagram", action: "diagram" },
  { label: "Paper 1 & 3 MCQs", action: "mcq" },
];

type SearchResult = {
  id: string;
  group: "Launch" | "Workspaces" | "Definitions" | "Diagrams" | "Your Essays";
  title: string;
  subtitle: string;
  badge?: string;
  icon: typeof Search;
  iconColor: string;
  onSelect: () => void;
};

const WORKSPACE_DIRECTORY: Array<{
  id: string;
  title: string;
  subtitle: string;
  to: string;
  badge: string;
  keywords: string[];
  icon: typeof Search;
  iconColor: string;
}> = [
  {
    id: "ws-live",
    title: "Live Examiner",
    subtitle: "Real-time line-by-line essay coaching, running mark & checklist",
    to: "/live-examiner",
    badge: "Live AI",
    keywords: ["live", "examiner", "coach", "typing", "real-time", "checklist", "line"],
    icon: Zap,
    iconColor: "text-indigo-500",
  },
  {
    id: "ws-grade",
    title: "Essay Grader & Vision OCR",
    subtitle: "Full Paper 2 & 4 AO1/AO2/AO3 marking, photo upload & rewrites",
    to: "/grade",
    badge: "90% Aligned",
    keywords: ["grade", "essay", "mark", "ocr", "handwriting", "photo", "ao1", "ao2", "ao3"],
    icon: PenLine,
    iconColor: "text-primary",
  },
  {
    id: "ws-mcq",
    title: "MCQ Past Paper Suite",
    subtitle: "1,400+ Paper 1 & Paper 3 questions with per-option distractor logic",
    to: "/mcq-live",
    badge: "P1 & P3",
    keywords: ["mcq", "multiple choice", "paper 1", "paper 3", "past paper", "quiz"],
    icon: ListChecks,
    iconColor: "text-sky-500",
  },
  {
    id: "ws-arena",
    title: "MCQ Live Quiz Arena",
    subtitle: "Join or host live 6-digit PIN races with classmates",
    to: "/quiz",
    badge: "Multiplayer",
    keywords: ["arena", "quiz", "pin", "multiplayer", "race", "friends", "game"],
    icon: Gamepad2,
    iconColor: "text-amber-500",
  },
  {
    id: "ws-data",
    title: "Data Response Studio",
    subtitle: "Section A extracts, OFR calculations & curve shift analysis (P2 & P4)",
    to: "/data-response",
    badge: "Section A",
    keywords: ["data", "response", "section a", "extract", "ofr", "table", "paper 2", "paper 4"],
    icon: FileSpreadsheet,
    iconColor: "text-emerald-500",
  },
  {
    id: "ws-ecr",
    title: "ECR Model Essay Generator",
    subtitle: "Generate examiner-standard full-mark essays for any 9708 question",
    to: "/essay-generator",
    badge: "20/20 Models",
    keywords: ["ecr", "example", "candidate", "model", "generator", "sample", "structure"],
    icon: Wand2,
    iconColor: "text-purple-500",
  },
  {
    id: "ws-diagrams",
    title: "Diagram CAD Lab",
    subtitle: "19 interactive Cambridge 9708 vector models with live welfare readouts",
    to: "/diagram-lab",
    badge: "19 Models",
    keywords: ["diagram", "graph", "curve", "shift", "cad", "ad/as", "monopoly", "tax", "tariff"],
    icon: Sliders,
    iconColor: "text-violet-500",
  },
  {
    id: "ws-defs",
    title: "Definitions Hub",
    subtitle: "Official Cambridge 9708 mark-scheme definitions & recall flashcards",
    to: "/definitions",
    badge: "200+ Terms",
    keywords: ["definition", "glossary", "terms", "flashcard", "ao1", "meaning"],
    icon: BookText,
    iconColor: "text-sky-500",
  },
  {
    id: "ws-examples",
    title: "Real-World Examples Bank",
    subtitle: "Curated micro, macro & trade evidence for AO2 and AO3 evaluation",
    to: "/examples",
    badge: "Case Bank",
    keywords: ["example", "real world", "case", "evidence", "application", "evaluation"],
    icon: Globe2,
    iconColor: "text-emerald-500",
  },
  {
    id: "ws-bank",
    title: "Question Bank",
    subtitle: "Browse Cambridge 9708 past paper prompts by topic & tariff",
    to: "/question-bank",
    badge: "Past Papers",
    keywords: ["question", "bank", "prompts", "topics", "syllabus"],
    icon: LibraryBig,
    iconColor: "text-indigo-500",
  },
  {
    id: "ws-review",
    title: "Diagnostics & Review",
    subtitle: "AO1–AO3 mastery radar, mark trajectory & weakness breakdown",
    to: "/review",
    badge: "Analytics",
    keywords: ["review", "diagnostics", "analytics", "progress", "chart", "radar", "history"],
    icon: ClipboardCheck,
    iconColor: "text-primary",
  },
  {
    id: "ws-classes",
    title: "Marginal Classrooms",
    subtitle: "Join cohorts, submit essay assignments & track class grades",
    to: "/classes",
    badge: "Cohorts",
    keywords: ["class", "classroom", "teacher", "assignment", "cohort", "homework"],
    icon: UsersRound,
    iconColor: "text-emerald-500",
  },
];

export function DashboardPage() {
  const navigate = useNavigate();

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

  const [clientSessionUser, setClientSessionUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setClientSessionUser(data.user);
    });
  }, []);

  const routeContext = Route.useRouteContext();
  const sessionUser = (routeContext as any)?.user || clientSessionUser;

  const isTeacherUser =
    me.data?.role === "teacher" ||
    (sessionUser?.user_metadata as any)?.role === "teacher" ||
    (sessionUser?.app_metadata as any)?.role === "teacher";
  const userDisplayName =
    me.data?.fullName ||
    (sessionUser?.user_metadata as any)?.full_name ||
    (sessionUser?.email ? sessionUser.email.split("@")[0] : "Economist");
  const firstName = userDisplayName.trim().split(/\s+/)[0] || "Economist";

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocs(),
    enabled: me.data?.isStaff === true,
  });
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

  // Search-first state
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [activityTab, setActivityTab] = useState<"essays" | "mcqs">("essays");
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }, 4500);
    return () => window.clearInterval(t);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const versions = useMemo(() => progress.data ?? [], [progress.data]);
  const essayList = useMemo(() => essays.data ?? [], [essays.data]);

  const essayMap = useMemo(
    () => new Map(essayList.map((e) => [e.id, e.max_mark])),
    [essayList],
  );

  const getVersionMaxMark = useCallback(
    (v: {
      essay_id?: string | null;
      total_mark?: number | null;
      essays?:
        | { max_mark?: number | null; question?: string | null }
        | { max_mark?: number | null; question?: string | null }[]
        | null;
    }) => {
      const essayObj = Array.isArray(v.essays) ? v.essays[0] : v.essays;
      if (essayObj?.max_mark && Number(essayObj.max_mark) > 0) return Number(essayObj.max_mark);
      if (v.essay_id && essayMap.has(v.essay_id)) return essayMap.get(v.essay_id)!;
      const mark = v.total_mark ?? 0;
      return mark > 12 ? 20 : 12;
    },
    [essayMap],
  );

  const stats = useMemo(() => {
    const sortedVersions = [...versions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    let essayAvgPct: number | null = null;
    let avgDisplay = "—";
    let bestDisplay = "—";
    let essayTrend = 0;

    if (sortedVersions.length > 0) {
      const pcts = sortedVersions.map((v) => {
        const max = getVersionMaxMark(v);
        return max > 0 ? ((v.total_mark ?? 0) / max) * 100 : 0;
      });
      essayAvgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
      avgDisplay = `${essayAvgPct}%`;

      const recentPct = pcts.slice(-5);
      const earlierPct = pcts.slice(0, -5);
      if (recentPct.length && earlierPct.length) {
        essayTrend =
          recentPct.reduce((a, b) => a + b, 0) / recentPct.length -
          earlierPct.reduce((a, b) => a + b, 0) / earlierPct.length;
      }

      let topMark = -1;
      let topMax = 12;
      let topPct = -1;
      for (const v of sortedVersions) {
        const m = v.total_mark ?? 0;
        const max = getVersionMaxMark(v);
        const p = max > 0 ? m / max : 0;
        if (p > topPct || (p === topPct && m > topMark)) {
          topPct = p;
          topMark = m;
          topMax = max;
        }
      }
      bestDisplay = `${topMark}/${topMax}`;
    }

    const mcqAccuracyPct =
      mcqSummary.data?.accuracyPct !== null && mcqSummary.data?.accuracyPct !== undefined
        ? mcqSummary.data.accuracyPct
        : null;
    const mcqAcc = mcqAccuracyPct !== null ? `${mcqAccuracyPct}%` : "—";
    const mcqBest =
      mcqSummary.data?.bestPercentage !== null && mcqSummary.data?.bestPercentage !== undefined
        ? `${mcqSummary.data.bestPercentage}%`
        : "—";
    const mcqAttempts = mcqSummary.data?.totalAttempts ?? 0;

    // Combined Accuracy Rating (60% Essay / 40% MCQ when both exist, else whichever is available)
    const overallAccuracyPct =
      essayAvgPct !== null && mcqAccuracyPct !== null
        ? Math.round(essayAvgPct * 0.6 + mcqAccuracyPct * 0.4)
        : essayAvgPct !== null
          ? essayAvgPct
          : mcqAccuracyPct;
    const overallAccuracyDisplay = overallAccuracyPct !== null ? `${overallAccuracyPct}%` : "—";

    // Exam Readiness Index (0-100%): 60% accuracy + 30% practice volume (5+ submissions) + 10% consistency
    const totalSubmissions = sortedVersions.length + mcqAttempts;
    const readinessPct =
      totalSubmissions === 0 || overallAccuracyPct === null
        ? 0
        : Math.min(
            100,
            Math.round(
              overallAccuracyPct * 0.6 +
                Math.min(30, totalSubmissions * 6) +
                (essayTrend >= 0 ? 10 : 0),
            ),
          );

    const readinessBand =
      readinessPct >= 80
        ? {
            label: "Band 1 · A* Track",
            tone: "text-emerald-600 dark:text-emerald-400",
            ring: "text-emerald-500",
            pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          }
        : readinessPct >= 60
          ? {
              label: "Band 2 · A/B Track",
              tone: "text-sky-600 dark:text-sky-400",
              ring: "text-sky-500",
              pill: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
            }
          : readinessPct >= 40
            ? {
                label: "Developing",
                tone: "text-amber-600 dark:text-amber-400",
                ring: "text-amber-500",
                pill: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
              }
            : {
                label: "Calibrating",
                tone: "text-muted-foreground",
                ring: "text-primary",
                pill: "border-border/80 bg-muted/60 text-muted-foreground",
              };

    const essayChartPoints: TrajectoryPoint[] = sortedVersions.slice(-15).map((v, idx) => {
      const mark = v.total_mark ?? 0;
      const max = getVersionMaxMark(v);
      const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((mark / max) * 100))) : 0;
      const essayObj = Array.isArray(v.essays) ? v.essays[0] : v.essays;
      const date = new Date(v.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return {
        id: `e-${idx}-${v.created_at}`,
        label: essayObj?.question || `Essay submission #${idx + 1}`,
        scoreText: `${mark}/${max}`,
        pct,
        date,
      };
    });

    const mcqChartPoints: TrajectoryPoint[] = [...(mcqSummary.data?.recentAttempts ?? [])]
      .reverse()
      .map((a) => ({
        id: `m-${a.id}`,
        label: `${a.level.toUpperCase()} · ${a.title}`,
        scoreText: `${a.score}/${a.total}`,
        pct: Math.min(100, Math.max(0, a.percentage)),
        date: new Date(a.completedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      }));

    return {
      essaysCount: sortedVersions.length,
      essayAvgPct,
      avgDisplay,
      bestDisplay,
      mcqAccuracyPct,
      mcqAcc,
      mcqBest,
      mcqAttempts,
      overallAccuracyPct,
      overallAccuracyDisplay,
      readinessPct,
      readinessBand,
      essayChartPoints,
      mcqChartPoints,
    };
  }, [versions, getVersionMaxMark, mcqSummary.data]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Build instant multi-source search results
  const searchResults: SearchResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    const out: SearchResult[] = [];

    // 1. Direct workspace matches
    for (const ws of WORKSPACE_DIRECTORY) {
      const hit =
        ws.title.toLowerCase().includes(ql) ||
        ws.subtitle.toLowerCase().includes(ql) ||
        ws.keywords.some((k) => k.includes(ql) || ql.includes(k));
      if (hit) {
        out.push({
          id: ws.id,
          group: "Workspaces",
          title: ws.title,
          subtitle: ws.subtitle,
          badge: ws.badge,
          icon: ws.icon,
          iconColor: ws.iconColor,
          onSelect: () => {
            setSearchFocused(false);
            navigate({ to: ws.to as any });
          },
        });
      }
      if (out.length >= 4) break;
    }

    // 2. Direct prompt launch actions (always helpful when typing a topic or essay question)
    out.push({
      id: "act-grade",
      group: "Launch",
      title: `Grade "${q.length > 52 ? `${q.slice(0, 52)}…` : q}"`,
      subtitle: "Open in Essay Grader with this question prefilled",
      badge: "Essay Grader",
      icon: PenLine,
      iconColor: "text-primary",
      onSelect: () => {
        setSearchFocused(false);
        navigate({ to: "/grade", search: { q } as any });
      },
    });
    out.push({
      id: "act-live",
      group: "Launch",
      title: "Practice line-by-line in Live Examiner",
      subtitle: "Real-time running mark, rubric checklist & next-mark hints",
      badge: "Live AI",
      icon: Zap,
      iconColor: "text-indigo-500",
      onSelect: () => {
        setSearchFocused(false);
        navigate({ to: "/live-examiner" });
      },
    });

    // 3. Matching Cambridge 9708 Definitions (top 3)
    let defCount = 0;
    for (const def of CAMBRIDGE_CORE_DEFINITIONS) {
      if (
        def.term.toLowerCase().includes(ql) ||
        def.definition_text.toLowerCase().includes(ql) ||
        def.category.toLowerCase().includes(ql)
      ) {
        out.push({
          id: `def-${def.id}`,
          group: "Definitions",
          title: def.term,
          subtitle: def.definition_text,
          badge: "CIE Definition",
          icon: BookText,
          iconColor: "text-sky-500",
          onSelect: () => {
            setSearchFocused(false);
            navigate({ to: "/definitions", search: { q: def.term } });
          },
        });
        defCount++;
        if (defCount >= 3) break;
      }
    }

    // 4. Matching Interactive Diagrams (top 2)
    let diagCount = 0;
    for (const d of DIAGRAMS) {
      if (
        d.title.toLowerCase().includes(ql) ||
        d.topic.toLowerCase().includes(ql) ||
        d.represents.toLowerCase().includes(ql)
      ) {
        out.push({
          id: `diag-${d.id}`,
          group: "Diagrams",
          title: d.title,
          subtitle: `${d.section} · ${d.topic}`,
          badge: "CAD Lab",
          icon: LineChart,
          iconColor: "text-violet-500",
          onSelect: () => {
            setSearchFocused(false);
            navigate({ to: "/diagram-lab" });
          },
        });
        diagCount++;
        if (diagCount >= 2) break;
      }
    }

    // 5. Matching Past Graded Essays (top 2)
    let essayCount = 0;
    for (const e of essayList) {
      if (e.question.toLowerCase().includes(ql)) {
        out.push({
          id: `essay-${e.id}`,
          group: "Your Essays",
          title: e.question,
          subtitle: `Marked ${e.latest_mark ?? "—"}/${e.max_mark ?? 12} · ${new Date(e.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
          badge: `${e.latest_mark ?? "—"}/${e.max_mark ?? 12}`,
          icon: GraduationCap,
          iconColor: "text-emerald-500",
          onSelect: () => {
            setSearchFocused(false);
            navigate({ to: "/essay/$essayId", params: { essayId: e.id } });
          },
        });
        essayCount++;
        if (essayCount >= 2) break;
      }
    }

    return out;
  }, [query, essayList, navigate]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults[selectedIdx]) {
      searchResults[selectedIdx].onSelect();
      return;
    }
    const q = query.trim();
    if (!q) {
      searchInputRef.current?.focus();
      return;
    }
    const ql = q.toLowerCase();
    if (ql.includes("mcq") || ql.includes("paper 1") || ql.includes("paper 3")) {
      navigate({ to: "/mcq-live" });
    } else if (ql.includes("live") || ql.includes("coach")) {
      navigate({ to: "/live-examiner" });
    } else if (ql.includes("diagram") || ql.includes("graph") || ql.includes("curve")) {
      navigate({ to: "/diagram-lab" });
    } else {
      navigate({ to: "/grade", search: { q } as any });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
  };

  const handleChipClick = (chip: (typeof QUICK_SEARCH_CHIPS)[number]) => {
    if (chip.action === "grade") {
      navigate({ to: "/grade", search: { q: chip.query, marks: chip.marks } as any });
    } else if (chip.action === "live") {
      navigate({ to: "/live-examiner" });
    } else if (chip.action === "definitions") {
      navigate({ to: "/definitions", search: { q: chip.query } });
    } else if (chip.action === "diagram") {
      navigate({ to: "/diagram-lab" });
    } else if (chip.action === "mcq") {
      navigate({ to: "/mcq-live" });
    }
  };

  if (isTeacherUser && !me.data?.isAdmin) {
    return (
      <EducatorDashboardView
        firstName={firstName}
        greeting={greeting}
        school={me.data?.school ?? (sessionUser?.user_metadata as any)?.school ?? null}
        classrooms={classrooms.data?.classes ?? (Array.isArray(classrooms.data) ? classrooms.data : [])}
        docs={docs.data ?? []}
        anchors={anchors.data ?? []}
        essays={essayList}
      />
    );
  }

  const recentEssays = essayList.slice(0, 3);
  const recentMcqs = (mcqSummary.data?.recentAttempts ?? []).slice(0, 3);

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] bg-background">
      {/* Subtle Ambient Top Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ── BAND 1: Search-First Hero + Exam Readiness & Accuracy Rating ── */}
        <section className="space-y-4">
          {/* Calm Header Row with Top Exam Readiness & Accuracy Rating */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                    {firstName}
                  </span>
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-semibold border-border/80 bg-muted/40 text-muted-foreground"
                >
                  Cambridge 9708
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pl-4.5">
                {stats.essaysCount} graded essay{stats.essaysCount === 1 ? "" : "s"} ·{" "}
                {stats.mcqAttempts} MCQ paper{stats.mcqAttempts === 1 ? "" : "s"} completed
              </p>
            </div>

            {/* Top Exam Readiness Gauge + Accuracy Rating Strip */}
            <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 sm:gap-4 px-3.5 py-2.5 rounded-2xl border border-border/80 bg-card/85 backdrop-blur-sm shadow-xs">
              {/* Exam Readiness Radial Mini-Gauge */}
              <div className="flex items-center gap-2.5">
                <div className="relative size-11 shrink-0 flex items-center justify-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-muted/45"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={106.8}
                      strokeDashoffset={
                        106.8 - (106.8 * Math.min(100, Math.max(0, stats.readinessPct))) / 100
                      }
                      strokeLinecap="round"
                      className={cn("transition-all duration-700 ease-out", stats.readinessBand.ring)}
                    />
                  </svg>
                  <span className="absolute text-[11px] font-extrabold font-mono tabular-nums text-foreground">
                    {stats.readinessPct}%
                  </span>
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Exam Readiness
                  </p>
                  <p className={cn("text-xs font-bold mt-0.5", stats.readinessBand.tone)}>
                    {stats.readinessBand.label}
                  </p>
                </div>
              </div>

              <span className="hidden sm:block h-8 w-px bg-border/70 shrink-0" />

              {/* Accuracy Rating */}
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Target className="size-4" />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Accuracy
                    </span>
                    <strong className="text-sm font-extrabold font-mono tabular-nums text-foreground">
                      {stats.overallAccuracyDisplay}
                    </strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    Essay <span className="font-mono font-semibold text-foreground">{stats.avgDisplay}</span>
                    {" · "}
                    MCQ{" "}
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {stats.mcqAcc}
                    </span>
                  </p>
                </div>
              </div>

              <span className="hidden sm:block h-8 w-px bg-border/70 shrink-0" />

              <Link
                to="/review"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap ml-auto sm:ml-0"
              >
                Diagnostics
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Search-First Command Bar */}
          <div ref={searchBoxRef} className="relative">
            <form onSubmit={handleSearchSubmit}>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-2xl border bg-card/95 backdrop-blur-md px-3.5 sm:px-4 h-13 sm:h-14 shadow-md transition-all",
                  searchFocused
                    ? "border-primary/60 ring-4 ring-primary/10 shadow-lg"
                    : "border-border/80 hover:border-primary/35",
                )}
              >
                <Search className="size-4.5 sm:size-5 text-primary shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={SEARCH_PLACEHOLDERS[placeholderIdx]}
                  aria-label="Search Marginal Economics tools, definitions, diagrams, or paste an essay question"
                  className="flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] text-foreground placeholder:text-muted-foreground/75 focus:outline-none"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}

                <Link
                  to="/grade"
                  title="Upload handwritten essay photo (Vision OCR)"
                  aria-label="Upload handwritten essay photo"
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Camera className="size-3.5 text-primary" />
                  <span>OCR</span>
                </Link>

                <Button
                  type="submit"
                  size="sm"
                  className="h-8.5 sm:h-9 px-3.5 sm:px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Go</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </form>

            {/* Live Instant Search Results Popover */}
            {searchFocused && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border/80 bg-popover/98 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
                  {searchResults.map((item, idx) => {
                    const Icon = item.icon;
                    const active = idx === selectedIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={item.onSelect}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer",
                          active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center shrink-0">
                            <Icon className={cn("size-4", item.iconColor)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold truncate">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-border/80">
                              {item.badge}
                            </Badge>
                          )}
                          <ArrowUpRight className="size-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="px-3.5 py-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Use ↑↓ arrows and Enter to launch</span>
                  <span className="font-mono">Esc to close</span>
                </div>
              </div>
            )}

            {/* Single-Row Quick Jump Chips */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Quick jump:</span>
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 rounded-full border border-border/70 bg-card/70 hover:bg-muted/80 hover:border-primary/40 text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── BAND 2: Three Dedicated Core Workspaces (Live Examiner · Essay Grader · MCQ) ── */}
        <section aria-label="Core Workspaces" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* SPACE 1: LIVE EXAMINER */}
          <div className="group relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.09] via-card to-card p-5 shadow-xs hover:border-indigo-500/55 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-indigo-500/15 blur-2xl" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform">
                  <Zap className="size-5" />
                </div>
                <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-mono font-bold gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE AI COACH
                </Badge>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  Live Examiner
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Write line by line with a running mark estimate, live rubric checklist, and instant A* next-mark hints.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Running Mark", "Rubric Checklist", "Intro · Analysis · Eval"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-border/50">
              <Button
                asChild
                size="sm"
                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Link to="/live-examiner">
                  <Zap className="size-3.5" />
                  <span>Open Live Examiner</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Link>
              </Button>
            </div>
          </div>

          {/* SPACE 2: ESSAY GRADER */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.09] via-card to-card p-5 shadow-xs hover:border-primary/55 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <PenLine className="size-5" />
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-mono font-bold">
                  90% EXAM ALIGNED
                </Badge>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  Essay Grader
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Full Paper 2 &amp; 4 marking with AO1/AO2/AO3 breakdowns, Handwriting Vision OCR, and model rewrites.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Handwriting OCR", "AO1 · AO2 · AO3", "8m / 12m / 20m"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-border/50 flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Link to="/grade">
                  <PenLine className="size-3.5" />
                  <span>Mark an Essay</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl text-xs font-semibold border-border/80 bg-background/80 hover:bg-muted shrink-0"
                title="Load a 1-click sample essay to test the grader"
              >
                <Link to="/grade" search={{ sample: 12 }}>
                  <Sparkles className="size-3.5 text-primary mr-1" />
                  Sample
                </Link>
              </Button>
            </div>
          </div>

          {/* SPACE 3: MCQ SUITE & ARENA */}
          <div className="group relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.08] via-card to-card p-5 shadow-xs hover:border-sky-500/55 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-sky-500/15 blur-2xl" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 group-hover:scale-105 transition-transform">
                  <ListChecks className="size-5" />
                </div>
                <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30 text-[10px] font-mono font-bold">
                  1,400+ PAST Qs
                </Badge>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  MCQ Suite &amp; Arena
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Solve Paper 1 &amp; 3 past papers with per-option distractor logic, or race friends live with a 6-digit PIN.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Papers 1 & 3", "Distractor Logic", "Live 6-Digit PIN"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-border/50 flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="flex-1 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Link to="/mcq-live">
                  <ListChecks className="size-3.5" />
                  <span>Past Papers</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl text-xs font-semibold border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground shrink-0"
              >
                <Link to="/quiz">
                  <Gamepad2 className="size-3.5 text-amber-500 mr-1" />
                  Arena
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── BAND 3: Switchable Performance Trajectory Chart (Essays / MCQs) + More Tools ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left (8 cols): Switchable Essay & MCQ Trajectory Chart + Synced Recent Attempts */}
          <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card/90 shadow-xs overflow-hidden flex flex-col">
            {/* Header + Essay/MCQ Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center border shrink-0 transition-colors",
                    activityTab === "essays"
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "bg-sky-500/10 border-sky-500/25 text-sky-500",
                  )}
                >
                  <TrendingUp className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold tracking-tight text-foreground">
                      {activityTab === "essays" ? "Essay Trajectory" : "MCQ Accuracy Trajectory"}
                    </h2>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {activityTab === "essays"
                        ? `Avg ${stats.avgDisplay} · Best ${stats.bestDisplay}`
                        : `Accuracy ${stats.mcqAcc} · Best ${stats.mcqBest}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setActivityTab("essays")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      activityTab === "essays"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Essays
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("mcqs")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      activityTab === "mcqs"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    MCQs
                  </button>
                </div>

                <Link
                  to="/review"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Full review
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Interactive SVG Trajectory Chart */}
            <div className="px-4 pt-3.5 pb-2">
              {activityTab === "essays" ? (
                progress.isLoading ? (
                  <Skeleton className="h-[185px] w-full rounded-xl" />
                ) : stats.essayChartPoints.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-bold text-foreground">Plot your Cambridge essay trajectory</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mark your first script or try a 1-click 12-mark sample to start tracking Band progression.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold shrink-0">
                      <Link to="/grade" search={{ sample: 12 }}>
                        <Wand2 className="size-3.5 text-primary mr-1" /> Try Sample
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <TrajectoryChart key="essay" points={stats.essayChartPoints} accent="essay" />
                )
              ) : mcqSummary.isLoading ? (
                <Skeleton className="h-[185px] w-full rounded-xl" />
              ) : stats.mcqChartPoints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-foreground">Plot your Paper 1 &amp; 3 MCQ accuracy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Complete a Cambridge past paper to track accuracy against the 80%+ Top Band benchmark.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold shrink-0">
                    <Link to="/mcq-live">
                      <ListChecks className="size-3.5 text-sky-500 mr-1" /> Start Paper
                    </Link>
                  </Button>
                </div>
              ) : (
                <TrajectoryChart key="mcq" points={stats.mcqChartPoints} accent="mcq" />
              )}
            </div>

            {/* Compact Synced Recent Attempts Footer (max 3 rows) */}
            {(activityTab === "essays" ? recentEssays.length > 0 : recentMcqs.length > 0) && (
              <div className="border-t border-border/60 mt-auto">
                {activityTab === "essays" ? (
                  <ul className="divide-y divide-border/50">
                    {recentEssays.map((essay) => {
                      const mark = essay.latest_mark ?? 0;
                      const max = essay.max_mark ?? 12;
                      const pct = max > 0 ? Math.round((mark / max) * 100) : 0;
                      const bandClass =
                        pct >= 75
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : pct >= 50
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
                      return (
                        <li key={essay.id}>
                          <Link
                            to="/essay/$essayId"
                            params={{ essayId: essay.id }}
                            className="group flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
                          >
                            <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {essay.question}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="hidden sm:inline text-[10.5px] text-muted-foreground">
                                {new Date(essay.updated_at).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] font-mono font-bold px-1.5 py-0", bandClass)}>
                                {pct}%
                              </Badge>
                              <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                                {essay.latest_mark ?? "—"}/{max}
                              </span>
                              <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {recentMcqs.map((attempt) => (
                      <li key={attempt.id}>
                        <Link
                          to="/mcq-live"
                          search={attempt.paperId ? { paperId: attempt.paperId } : undefined}
                          className="group flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono font-bold uppercase px-1.5 py-0 shrink-0"
                            >
                              {attempt.level}
                            </Badge>
                            <p className="text-xs font-medium text-foreground truncate group-hover:text-sky-500 transition-colors">
                              {attempt.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-mono font-bold px-1.5 py-0",
                                attempt.percentage >= 80
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
                              )}
                            >
                              {attempt.percentage}%
                            </Badge>
                            <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                              {attempt.score}/{attempt.total}
                            </span>
                            <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-sky-500 transition-colors" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right (4 cols): Compact More 9708 Tools Panel */}
          <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card/90 p-3.5 shadow-xs flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-foreground tracking-tight">More 9708 Tools</span>
              {Boolean(me.data?.isAdmin) && (
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <MessageSquare className="size-3" /> Chat Lab
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 flex-1">
              {[
                { to: "/data-response", label: "Data Response", tag: "P2 & P4 Sec A", icon: FileSpreadsheet, color: "text-emerald-500" },
                { to: "/essay-generator", label: "ECR Models", tag: "20/20 Essays", icon: Wand2, color: "text-purple-500" },
                { to: "/diagram-lab", label: "Diagram Lab", tag: "19 CAD Models", icon: Sliders, color: "text-violet-500" },
                { to: "/definitions", label: "Definitions", tag: "200+ Terms", icon: BookText, color: "text-sky-500" },
                { to: "/examples", label: "Examples Bank", tag: "AO2 & AO3", icon: Globe2, color: "text-emerald-500" },
                { to: "/classes", label: "Classrooms", tag: "Cohorts", icon: UsersRound, color: "text-indigo-500" },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to as any}
                    className="group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl border border-border/60 bg-background/60 hover:bg-muted/60 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-lg bg-muted/70 border border-border/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className={cn("size-3.5", tool.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {tool.label}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{tool.tag}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-foreground/70 group-hover:text-primary shrink-0 transition-colors hidden lg:block" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clean Switchable Performance Trajectory Chart (Supports both Essays & MCQs)
// ---------------------------------------------------------------------------

type TrajectoryPoint = {
  id: string;
  label: string;
  scoreText: string;
  pct: number;
  date: string;
};

function TrajectoryChart({
  points,
  accent,
}: {
  points: TrajectoryPoint[];
  accent: "essay" | "mcq";
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 740;
  const height = 186;
  const padding = { top: 18, right: 98, bottom: 26, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const coords = useMemo(() => {
    const n = points.length;
    return points.map((pt, i) => {
      const x =
        n === 1
          ? padding.left + chartW * 0.5
          : padding.left + (i / (n - 1)) * chartW;
      const y = padding.top + chartH - (Math.min(100, Math.max(0, pt.pct)) / 100) * chartH;
      return { ...pt, x, y };
    });
  }, [points, chartW, chartH, padding.left, padding.top]);

  const pathD = useMemo(() => {
    if (coords.length < 2) return "";
    return coords.reduce(
      (acc, curr, idx) => (idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`),
      "",
    );
  }, [coords]);

  const areaD = useMemo(() => {
    if (coords.length < 2) return "";
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const bottomY = padding.top + chartH;
    return `${pathD} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
  }, [pathD, coords, padding.top, chartH]);

  const strokeColor = accent === "essay" ? "#7c3aed" : "#0284c7";
  const gradId = `trajGrad-${accent}`;
  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : coords[coords.length - 1];

  return (
    <div className="space-y-1.5">
      {/* Subtle Live Readout Line (hover any point or shows latest) */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground px-0.5 min-h-[18px]">
        {activePoint ? (
          <>
            <span className="truncate">
              <span className="font-mono font-bold text-foreground">{activePoint.scoreText}</span>{" "}
              <span
                className={cn(
                  "font-mono font-semibold",
                  accent === "essay" ? "text-primary" : "text-sky-600 dark:text-sky-400",
                )}
              >
                ({activePoint.pct}%)
              </span>
              <span className="mx-1.5 opacity-50">·</span>
              <span>{activePoint.date}</span>
              <span className="mx-1.5 opacity-50">·</span>
              <span className="text-foreground/85">{activePoint.label}</span>
            </span>
            {points.length === 1 && (
              <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                1 more to plot trend
              </span>
            )}
          </>
        ) : null}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[460px] sm:min-w-0 select-none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Left Y-axis percentage ticks & Cambridge Band reference lines */}
          {[
            { pct: 80, label: "Top 80%+", lineClass: "text-emerald-500/40", textClass: "fill-emerald-600 dark:fill-emerald-400", boxClass: "stroke-emerald-500/30" },
            { pct: 55, label: "Upper 55%+", lineClass: "text-sky-500/35", textClass: "fill-sky-600 dark:fill-sky-400", boxClass: "stroke-sky-500/30" },
            { pct: 35, label: "Lower 35%+", lineClass: "text-amber-500/35", textClass: "fill-amber-600 dark:fill-amber-400", boxClass: "stroke-amber-500/30" },
          ].map((band) => {
            const y = padding.top + chartH * (1 - band.pct / 100);
            return (
              <g key={band.pct}>
                <text
                  x={padding.left - 7}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9.5px] font-mono fill-muted-foreground/75"
                >
                  {band.pct}%
                </text>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartW + 4}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                  className={band.lineClass}
                />
                <rect
                  x={width - 88}
                  y={y - 8}
                  width="82"
                  height="16"
                  rx="4"
                  className={cn("fill-background/90", band.boxClass)}
                  strokeWidth="1"
                />
                <text
                  x={width - 47}
                  y={y + 3}
                  textAnchor="middle"
                  className={cn("text-[9px] font-semibold", band.textClass)}
                >
                  {band.label}
                </text>
              </g>
            );
          })}

          {/* Baseline (0%) */}
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={padding.left + chartW}
            y2={padding.top + chartH}
            stroke="currentColor"
            strokeWidth="1"
            className="text-border/70"
          />

          {/* Area & Line */}
          {areaD && <path d={areaD} fill={`url(#${gradId})`} />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-axis date ticks (first & last) */}
          {coords.length > 0 && (
            <text
              x={coords[0]!.x}
              y={height - 6}
              textAnchor={coords.length === 1 ? "middle" : "start"}
              className="text-[9.5px] font-mono fill-muted-foreground/80"
            >
              {coords[0]!.date}
            </text>
          )}
          {coords.length > 1 && (
            <text
              x={coords[coords.length - 1]!.x}
              y={height - 6}
              textAnchor="end"
              className="text-[9.5px] font-mono fill-muted-foreground/80"
            >
              {coords[coords.length - 1]!.date}
            </text>
          )}

          {/* Interactive Data Points */}
          {coords.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle cx={pt.x} cy={pt.y} r="13" fill="transparent" />
                {isHovered && (
                  <circle cx={pt.x} cy={pt.y} r="8.5" fill={strokeColor} fillOpacity="0.16" />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "5.5" : "3.8"}
                  stroke={strokeColor}
                  strokeWidth="2.4"
                  className="fill-background transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streamlined Educator Dashboard (matches the same compact, calm aesthetic)
// ---------------------------------------------------------------------------

function EducatorDashboardView({
  firstName,
  greeting,
  school,
  classrooms,
  docs,
  anchors,
  essays,
}: {
  firstName: string;
  greeting: string;
  school: string | null;
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
  const readyDocs = (Array.isArray(docs) ? docs : []).filter((d) => d.status === "ready").length;
  const activeAnchors = (Array.isArray(anchors) ? anchors : []).filter((a) => a.active !== false).length;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-purple-500/[0.06] via-transparent to-transparent"
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Compact Educator Header & Telemetry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold">
              Cambridge 9708 Educator
            </Badge>
            {school && (
              <Badge variant="outline" className="text-[10px] font-medium">
                {school}
              </Badge>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-3 py-1.5 rounded-xl border border-border/70 bg-card/70 text-xs">
            <span className="text-muted-foreground">
              Classrooms <strong className="font-mono text-foreground ml-0.5">{classList.length}</strong>
            </span>
            <span className="h-3 w-px bg-border/70" />
            <span className="text-muted-foreground">
              Essays <strong className="font-mono text-foreground ml-0.5">{essays.length}</strong>
            </span>
            <span className="h-3 w-px bg-border/70" />
            <span className="text-muted-foreground">
              Mark Schemes <strong className="font-mono text-foreground ml-0.5">{readyDocs}</strong>
            </span>
            <span className="h-3 w-px bg-border/70" />
            <span className="text-muted-foreground">
              Anchors <strong className="font-mono text-foreground ml-0.5">{activeAnchors}</strong>
            </span>
          </div>
        </div>

        {/* 3 Dedicated Core Educator Spaces */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <UsersRound className="size-5" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Marginal Classrooms</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage cohorts, issue Cambridge 9708 essay assignments, and track class AO performance in one hub.
              </p>
            </div>
            <Button asChild size="sm" className="mt-5 w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              <Link to="/classes">
                <span>Open Classrooms</span>
                <ArrowRight className="size-3.5 ml-auto" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                <PenLine className="size-5" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Essay Grader &amp; Live Examiner</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluate scripts against calibrated 9708 mark schemes or demonstrate live line-by-line marking in class.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <Button asChild size="sm" className="flex-1 h-9 rounded-xl text-xs font-semibold">
                <Link to="/grade">Grade Essay</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold">
                <Link to="/live-examiner">Live AI</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.08] via-card to-card p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="size-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500">
                <BookOpen className="size-5" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">MCQ Arena &amp; Mark Schemes</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Host live 6-digit PIN MCQ sprints for your class or manage mark schemes and calibration anchors.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <Button asChild size="sm" className="flex-1 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold">
                <Link to="/quiz">Host Quiz PIN</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold">
                <Link to="/knowledge">Knowledge</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Active Classrooms Row */}
        {classList.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Classrooms</h3>
              <Link to="/classes" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Manage all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {classList.slice(0, 6).map((cls) => (
                <Link
                  key={cls.id}
                  to="/classes"
                  className="group flex items-center justify-between gap-2 p-3 rounded-xl border border-border/70 bg-background/60 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary">
                      {cls.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase">{cls.level} Level</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0">
                    {cls.join_code}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
