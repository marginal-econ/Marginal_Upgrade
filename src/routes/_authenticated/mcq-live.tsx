import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Calculator as CalculatorIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Flag,
  History,
  LayoutGrid,
  Loader2,
  Pencil,
  Play,
  Search,
  Sparkles,
  Timer as TimerIcon,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { ChainedChamber } from "@/components/app/chained-chamber";
import { McqCalculator } from "@/components/app/mcq-calculator";
import { getMe } from "@/lib/account.functions";
import {
  McqReviewPanel,
  McqQuestionReviewList,
  McqDomainBreakdown,
  type ExplanationState,
  type TopicStat,
  type GradedQuestion,
} from "@/components/app/mcq-review-panel";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  classifyMcqTopics,
  explainMcqAnswer,
  fetchPaperPdf,
  getMcqTopicPerformance,
  getMyPaperHistory,
  getPdfMcqAttempt,
  submitPdfMcqAttempt,
  type PaperHistoryEntry,
} from "@/lib/mcq-pdf.functions";
import { listMcqPapers } from "@/lib/mcq-papers.functions";
import {
  loadPdfjs,
  extractQuestionStems,
  type PdfTextItem,
  type StemBlob,
} from "@/lib/mcq-pdf-text";
import {
  aggregateMcqDomains,
  aggregateMcqDomainsFromTopicStats,
  type DomainStat,
} from "@/lib/mcq-domain";
import { cn } from "@/lib/utils";

/** Fixed render scale for the plain page image — no positions are computed
 *  against it (there's no overlay anymore), it's purely how big/sharp the
 *  page looks on screen. */
const RENDER_SCALE = 1.6;

// Optional paperId prefill lets a paper-library link start a specific paper.
// Direct navigation still opens the library picker.
const mcqLiveSearchSchema = z
  .object({
    paperId: z.string().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/mcq-live")({
  validateSearch: (search: Record<string, unknown>) => mcqLiveSearchSchema.parse(search),
  component: McqLivePage,
});

/* -------------------------------------------------------------------- */
/* Types                                                                  */
/* -------------------------------------------------------------------- */

type Letter = "A" | "B" | "C" | "D";
type Level = "as" | "a2";

/**
 * Real Cambridge 9708 paper timings — Paper 1 (AS) is 1 hour, Paper 3
 * (A Level) is 1 hour 15. Mirrors PAPER_DURATION_SECONDS in
 * src/lib/mcq/mcq.server.ts (kept local here rather than imported since
 * that file is server-side and only ever dynamically imported from
 * handlers elsewhere in this codebase — this constant must stay in sync
 * with it by hand).
 */
const PAPER_DURATION_SECONDS: Record<Level, number> = {
  as: 60 * 60,
  a2: 75 * 60,
};

const LOW_TIME_WARNING_SECONDS = 5 * 60;
const MCQ_DRAFT_VERSION = 1;
const MCQ_ACTIVE_VERSION = 1;
export const MCQ_DRAFT_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

type McqDraft = {
  version: number;
  paperId: string;
  paperTitle?: string;
  level?: Level;
  answers: Record<number, Letter>;
  flagged?: number[];
  timeLeft: number | null;
  savedAt: number;
};

function mcqDraftKey(userId: string, paperId: string) {
  const safeUser = userId || "guest";
  return `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.${paperId}`;
}

function mcqActiveKey(userId: string) {
  const safeUser = userId || "guest";
  return `marginal.mcq-active.v${MCQ_ACTIVE_VERSION}.${safeUser}`;
}

function readActiveMcqPaper(userId: string): string | null {
  const safeUser = userId || "guest";
  try {
    const raw = window.localStorage.getItem(mcqActiveKey(safeUser));
    if (raw) {
      const value = JSON.parse(raw) as { version: number; paperId: string; savedAt?: number };
      if (value.version === MCQ_ACTIVE_VERSION && value.paperId) {
        const draft = readMcqDraft(safeUser, value.paperId);
        if (draft) return value.paperId;
      }
    }
  } catch {}

  // Fallback: search for any active, unexpired draft for this user
  try {
    const prefix = `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.`;
    let latestPaperId: string | null = null;
    let latestSavedAt = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const paperId = key.slice(prefix.length);
        const draft = readMcqDraft(safeUser, paperId);
        if (draft && draft.savedAt > latestSavedAt) {
          latestSavedAt = draft.savedAt;
          latestPaperId = paperId;
        }
      }
    }
    return latestPaperId;
  } catch {
    return null;
  }
}

function readMcqDraft(userId: string, paperId: string): McqDraft | null {
  const safeUser = userId || "guest";
  try {
    const key = mcqDraftKey(safeUser, paperId);
    let raw = window.localStorage.getItem(key);
    if (!raw && safeUser !== "guest") {
      const guestRaw = window.localStorage.getItem(mcqDraftKey("guest", paperId));
      if (guestRaw) {
        raw = guestRaw;
        try {
          window.localStorage.setItem(key, guestRaw);
          window.localStorage.removeItem(mcqDraftKey("guest", paperId));
        } catch {}
      }
    }
    if (!raw) return null;
    const draft = JSON.parse(raw) as McqDraft;
    if (draft.version !== MCQ_DRAFT_VERSION || draft.paperId !== paperId) return null;

    // Auto-expire after 12 hours
    const age = Date.now() - (draft.savedAt || 0);
    if (age > MCQ_DRAFT_EXPIRY_MS) {
      window.localStorage.removeItem(key);
      const activeRaw = window.localStorage.getItem(mcqActiveKey(safeUser));
      if (activeRaw) {
        try {
          const parsed = JSON.parse(activeRaw);
          if (parsed.paperId === paperId) {
            window.localStorage.removeItem(mcqActiveKey(safeUser));
          }
        } catch {}
      }
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function getActiveDraftSummary(userId: string, papers: McqPaperSummary[]): {
  paper: McqPaperSummary;
  draft: McqDraft;
  remainingMs: number;
} | null {
  const activePaperId = readActiveMcqPaper(userId);
  if (!activePaperId) return null;
  const draft = readMcqDraft(userId, activePaperId);
  if (!draft) return null;
  const paper = papers.find((p) => p.id === activePaperId);
  if (!paper) return null;
  const elapsed = Date.now() - (draft.savedAt || 0);
  const remainingMs = Math.max(0, MCQ_DRAFT_EXPIRY_MS - elapsed);
  if (remainingMs <= 0) return null;
  return { paper, draft, remainingMs };
}

export function cleanupExpiredMcqDrafts(userId: string): void {
  const safeUser = userId || "guest";
  try {
    const prefixes = [
      `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.`,
      `marginal_mcq_draft_${safeUser}_`,
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) {
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw);
            if (Date.now() - (draft.savedAt || 0) > MCQ_DRAFT_EXPIRY_MS) {
              toRemove.push(key);
            }
          }
        } catch {
          toRemove.push(key);
        }
      }
    }
    for (const key of toRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function formatRemainingTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(totalSeconds, 0);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Tiered result messaging — a real verdict on how the attempt went, not
 * just a bare score. Used to give the post-mark banner actual weight
 * instead of a subdued one-line readout.
 */
function resultTier(pct: number): {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
} {
  if (pct >= 90)
    return {
      label: "Outstanding!",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      Icon: Award,
    };
  if (pct >= 70)
    return {
      label: "Great work!",
      className: "border-primary/40 bg-primary/10 text-primary",
      Icon: TrendingUp,
    };
  if (pct >= 50)
    return {
      label: "Solid effort — keep going.",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      Icon: CheckCircle2,
    };
  return {
    label: "Tough one — let's review what went wrong.",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: XCircle,
  };
}

type AnnotateTool = "pen" | "eraser";
const ANNOTATE_COLORS = ["#e11d48", "#111827", "#2563eb", "#16a34a"] as const;

// Badge/pill placement is gone entirely — a page is just its rendered
// image. Stem text (for topic tagging + on-demand explanations) is pulled
// separately, straight from the PDF text layer.
type PageImage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/* -------------------------------------------------------------------- */
/* Component                                                             */
/* -------------------------------------------------------------------- */


function McqLivePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const routeContext = Route.useRouteContext() as { user?: { id?: string; email?: string } } | undefined;
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const effectiveUserId = routeContext?.user?.id || me.data?.userId || "guest";
  const [stage, setStage] = useState<"library" | "practice">("library");
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("as");
  const [qCount, setQCount] = useState(30);
  const [paperTitle, setPaperTitle] = useState("Past paper practice");
  const [answerKey, setAnswerKey] = useState<Record<number, Letter>>({});
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const [pages, setPages] = useState<PageImage[]>([]);
  const [stemBlobs, setStemBlobs] = useState<StemBlob[]>([]);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  // Autosave status & immediate-persistence tracking
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimerRef = useRef<number | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const flaggedRef = useRef(flagged);
  flaggedRef.current = flagged;
  const selectedPaperIdRef = useRef(selectedPaperId);
  selectedPaperIdRef.current = selectedPaperId;
  const paperTitleRef = useRef(paperTitle);
  paperTitleRef.current = paperTitle;
  const levelRef = useRef(level);
  levelRef.current = level;

  const [graded, setGraded] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // Global Alt+C shortcut to toggle Cambridge Economics Calculator
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setCalcOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [attemptTopics, setAttemptTopics] = useState<TopicStat[]>([]);
  // SAT-"Reading vs Writing" style micro/macro split for this one paper,
  // computed alongside attemptTopics from the same graded questions.
  const [attemptDomains, setAttemptDomains] = useState<DomainStat[]>([]);
  // Full per-question breakdown for the click-to-review list — populated
  // alongside `result`/`attemptTopics` once grading finishes.
  const [reviewQuestions, setReviewQuestions] = useState<GradedQuestion[]>([]);
  // On-demand explanation per question number, fetched only when the
  // student presses "Explain" in the post-attempt review list.
  const [explanations, setExplanations] = useState<Record<number, ExplanationState>>({});
  // Active question number currently selected / being viewed
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  // Map of question number -> PDF page number (1-indexed)
  const [questionPages, setQuestionPages] = useState<Record<number, number>>({});
  // Mobile bottom sheets
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);
  // Currently visible PDF page during scrolling
  const [visiblePage, setVisiblePage] = useState<number>(1);

  // Which question number to visually pulse right now (set briefly when a
  // student clicks a row in the review list), so the matching row in the
  // answer side panel is easy to find among dozens of others.
  const [highlightNumber, setHighlightNumber] = useState<number | null>(null);
  const answerRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const goToQuestion = useCallback(
    (number: number, options?: { skipScrollPaper?: boolean }) => {
      setActiveQuestion(number);
      setHighlightNumber(number);

      // 1. Scroll PDF paper directly to the page containing this question.
      // Auto-scrolling the paper is designed for phone view where the viewport is narrow.
      // On laptop/desktop (screen width >= 1024px), NEVER scroll the paper if the target page
      // is already visible, or if skipScrollPaper is requested, preventing disruptive "scroll-up" jumps.
      if (!options?.skipScrollPaper) {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
        const targetPage =
          questionPages[number] ??
          Math.min(pages.length, Math.max(1, Math.ceil(number / 2) + 1));

        const shouldScrollPaper = !isDesktop || targetPage !== visiblePage;

        if (shouldScrollPaper) {
          const pageEl = document.getElementById(`mcq-page-${targetPage}`);
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }

      // 2. Scroll answer row in the desktop side panel
      const el = answerRowRefs.current.get(number);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      window.setTimeout(() => setHighlightNumber((cur) => (cur === number ? null : cur)), 2000);
    },
    [pages.length, questionPages, visiblePage],
  );

  // ---- timer ----
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const [timeUp, setTimeUp] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(() => {
    try {
      const saved = window.localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timedModeDefault === "boolean") return parsed.timedModeDefault;
      }
    } catch {
      // fallback
    }
    return true;
  });
  const autoSubmittedRef = useRef(false);

  // ---- annotate ----
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>("pen");
  const [annotateColor, setAnnotateColor] = useState<string>(ANNOTATE_COLORS[0]);
  const annotationCanvases = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const registerAnnotationCanvas = useCallback(
    (pageNumber: number, el: HTMLCanvasElement | null) => {
      if (el) annotationCanvases.current.set(pageNumber, el);
      else annotationCanvases.current.delete(pageNumber);
    },
    [],
  );

  const clearAllAnnotations = useCallback(() => {
    annotationCanvases.current.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const listPapersFn = useServerFn(listMcqPapers);
  const papersQuery = useQuery({ queryKey: ["mcq-papers"], queryFn: () => listPapersFn() });

  const [draftRefreshKey, setDraftRefreshKey] = useState(0);

  // Proactively clean up any abandoned drafts older than 12 hours
  useEffect(() => {
    cleanupExpiredMcqDrafts(effectiveUserId);
  }, [effectiveUserId]);

  const activeDraftSummary = useMemo(() => {
    if (stage !== "library" || !papersQuery.data?.papers) return null;
    return getActiveDraftSummary(effectiveUserId, papersQuery.data.papers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, effectiveUserId, papersQuery.data?.papers, draftRefreshKey]);

  // Tick every 15 seconds while on library stage to update time left and auto-purge if expired
  useEffect(() => {
    if (stage !== "library" || !activeDraftSummary) return;
    const interval = window.setInterval(() => {
      setDraftRefreshKey((k) => k + 1);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [stage, !activeDraftSummary]);

  const classifyTopicsFn = useServerFn(classifyMcqTopics);
  const submitAttemptFn = useServerFn(submitPdfMcqAttempt);
  const explainFn = useServerFn(explainMcqAnswer);
  const fetchPaperPdfFn = useServerFn(fetchPaperPdf);

  /** Fetches a short written explanation for one question, on demand — only
   *  ever called from the post-attempt review list, never during the attempt. */
  async function handleExplain(number: number) {
    if (explanations[number] === "loading") return;
    setExplanations((prev) => ({ ...prev, [number]: "loading" }));
    const q = reviewQuestions.find((r) => r.number === number);
    const correctAnswer = q?.correct_answer;
    if (!correctAnswer) {
      setExplanations((prev) => ({
        ...prev,
        [number]: { error: "No mark-scheme answer on record for this question." },
      }));
      return;
    }
    try {
      const stem = stemBlobs.find((s) => s.number === number)?.text ?? "";
      const { explanation } = await explainFn({
        data: {
          level,
          number,
          stemText: stem,
          correctAnswer,
          userAnswer: q?.user_answer ?? null,
        },
      });
      setExplanations((prev) => ({
        ...prev,
        [number]:
          typeof explanation === "string"
            ? { text: explanation }
            : { text: explanation.text, diagnostic: explanation.diagnostic },
      }));
    } catch (error) {
      setExplanations((prev) => ({
        ...prev,
        [number]: {
          error:
            error instanceof Error
              ? error.message
              : "Couldn't get an explanation right now — try again.",
        },
      }));
    }
  }

  const fetchTopicPerformance = useServerFn(getMcqTopicPerformance);
  const topicPerformance = useQuery({
    queryKey: ["mcq-topic-performance"],
    queryFn: () => fetchTopicPerformance(),
  });

  // ---- paper history sidebar (student's own attempted papers + scores) ----
  const fetchPaperHistoryFn = useServerFn(getMyPaperHistory);
  const paperHistory = useQuery({
    queryKey: ["mcq-paper-history"],
    queryFn: () => fetchPaperHistoryFn(),
  });

  // Clicking a history entry opens the full past attempt (score + review +
  // on-demand explanations) in a side sheet, so a student can revise a
  // paper they've already finished without leaving the library page.
  const [historyAttemptId, setHistoryAttemptId] = useState<string | null>(null);
  const fetchAttemptFn = useServerFn(getPdfMcqAttempt);
  const historyAttempt = useQuery({
    queryKey: ["mcq-pdf-attempt", historyAttemptId],
    queryFn: () => fetchAttemptFn({ data: { attemptId: historyAttemptId! } }),
    enabled: !!historyAttemptId,
  });
  const [historyExplanations, setHistoryExplanations] = useState<Record<number, ExplanationState>>(
    {},
  );

  async function handleHistoryExplain(number: number) {
    if (!historyAttempt.data) return;
    if (historyExplanations[number] === "loading") return;
    setHistoryExplanations((prev) => ({ ...prev, [number]: "loading" }));
    const q = historyAttempt.data.questions.find((r) => r.number === number);
    const correctAnswer = q?.correct_answer;
    if (!correctAnswer) {
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]: { error: "No mark-scheme answer on record for this question." },
      }));
      return;
    }
    try {
      const { explanation } = await explainFn({
        data: {
          level: historyAttempt.data.level,
          number,
          stemText: "",
          correctAnswer,
          userAnswer: q?.user_answer ?? null,
        },
      });
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]:
          typeof explanation === "string"
            ? { text: explanation }
            : { text: explanation.text, diagnostic: explanation.diagnostic },
      }));
    } catch (error) {
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]: {
          error:
            error instanceof Error
              ? error.message
              : "Couldn't get an explanation right now — try again.",
        },
      }));
    }
  }

/**
 * Interpolates or estimates PDF page locations for any questions not cleanly
 * captured by OCR text-layer parsing, guaranteeing every question maps to a real page
 * and questions follow a strictly non-decreasing page sequence (monotonic).
 */
function fillMissingQuestionPages(
  map: Record<number, number>,
  totalQuestions: number,
  numPages: number,
): Record<number, number> {
  const result: Record<number, number> = { ...map };

  // Step 1: Discard any impossible outliers that violate non-decreasing order
  // (e.g. false positives where variant codes like 12 or 30 matched on page 1).
  let runningMax = 1;
  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q] !== undefined) {
      if (result[q] < runningMax) {
        delete result[q];
      } else {
        runningMax = result[q];
      }
    }
  }

  // Step 2: Interpolate missing questions between known surrounding questions
  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q]) continue;
    let prevQ = -1;
    for (let k = q - 1; k >= 1; k--) {
      if (result[k]) {
        prevQ = k;
        break;
      }
    }
    let nextQ = -1;
    for (let k = q + 1; k <= totalQuestions; k++) {
      if (result[k]) {
        nextQ = k;
        break;
      }
    }

    if (prevQ !== -1 && nextQ !== -1) {
      const fraction = (q - prevQ) / (nextQ - prevQ);
      const estPage = Math.round(result[prevQ] + fraction * (result[nextQ] - result[prevQ]));
      result[q] = Math.max(result[prevQ], Math.min(result[nextQ], estPage));
    } else if (prevQ !== -1) {
      const estPage = Math.min(numPages, result[prevQ] + Math.floor((q - prevQ) / 2));
      result[q] = Math.max(result[prevQ], estPage);
    } else if (nextQ !== -1) {
      const estPage = Math.max(1, result[nextQ] - Math.ceil((nextQ - q) / 2));
      result[q] = Math.min(result[nextQ], estPage);
    } else {
      result[q] = Math.min(numPages, Math.max(1, Math.ceil(q / 2) + 1));
    }
  }

  // Step 3: Absolute final guarantee: result[q] >= result[q - 1]
  for (let q = 2; q <= totalQuestions; q++) {
    if (result[q] < result[q - 1]) {
      result[q] = result[q - 1];
    }
  }

  return result;
}

  /* ---------------- start practice: fetch the picked library paper + its cached overlay ----------------
   *
   * Renders every page of the PDF plainly and pulls a rough stem-text
   * blob per question straight from the text layer — nothing is
   * positioned against the page. Answering happens from the fixed
   * A/B/C/D side panel instead.
   */

  async function beginPractice(
    paper: NonNullable<typeof papersQuery.data>["papers"][number],
    completedAttempt?: {
      score: number | null;
      total: number;
      questions: GradedQuestion[];
    },
  ) {
    setSelectedPaperId(paper.id);
    selectedPaperIdRef.current = paper.id;
    setPaperTitle(paper.title);
    paperTitleRef.current = paper.title;
    setLevel(paper.level);
    levelRef.current = paper.level;
    setQCount(paper.questionCount);
    setAnswerKey(paper.answerKey as Record<number, Letter>);
    const draft =
      !completedAttempt ? readMcqDraft(effectiveUserId, paper.id) : null;
    const completedAnswers = completedAttempt
      ? Object.fromEntries(
          completedAttempt.questions.flatMap((question) =>
            question.user_answer ? [[question.number, question.user_answer]] : [],
          ),
        )
      : null;
    const initialAnswers = completedAnswers ?? draft?.answers ?? {};
    const initialFlagged = new Set(draft?.flagged ?? []);
    setAnswers(initialAnswers);
    answersRef.current = initialAnswers;
    setFlagged(initialFlagged);
    flaggedRef.current = initialFlagged;
    setGraded(!!completedAttempt);
    setResult(
      completedAttempt && completedAttempt.score !== null
        ? { score: completedAttempt.score, total: completedAttempt.total }
        : null,
    );
    setReviewQuestions(completedAttempt?.questions ?? []);
    if (completedAttempt) {
      const byTopic = new Map<string, { attempted: number; correct: number }>();
      for (const question of completedAttempt.questions) {
        const entry = byTopic.get(question.topic) ?? { attempted: 0, correct: 0 };
        entry.attempted += 1;
        if (question.correct) entry.correct += 1;
        byTopic.set(question.topic, entry);
      }
      setAttemptTopics(
        [...byTopic.entries()].map(([savedTopic, value]) => ({
          topic: savedTopic,
          attempted: value.attempted,
          correct: value.correct,
          accuracyPct: Math.round((value.correct / value.attempted) * 100),
        })),
      );
      setAttemptDomains(
        aggregateMcqDomains(
          completedAttempt.questions.map((question) => ({
            topic: question.topic,
            correct: !!question.correct,
          })),
        ),
      );
    } else {
      setAttemptTopics([]);
      setAttemptDomains([]);
    }
    setExplanations({});

    // Reset the clock and scratch marks for this fresh attempt — real
    // Cambridge 9708 timings: Paper 1 (AS) is 1 hour, Paper 3 (A Level) is
    // 1 hour 15.
    const initialTimeLeft = completedAttempt
      ? null
      : draft?.timeLeft == null
        ? PAPER_DURATION_SECONDS[paper.level]
        : Math.min(draft.timeLeft, PAPER_DURATION_SECONDS[paper.level]);
    setTimeLeft(initialTimeLeft);
    timeLeftRef.current = initialTimeLeft;
    setTimeUp(false);
    autoSubmittedRef.current = false;
    setAnnotateMode(false);
    annotationCanvases.current.clear();

    setBusyLabel("Fetching the paper…");
    try {
      const pdfjs = await loadPdfjs();
      let buf: ArrayBuffer;
      try {
        const res = await fetch(paper.qpUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      } catch (directErr) {
        // Fallback to server-side proxy download (handles CORS, ISP/network blocks, missing headers)
        try {
          const { base64 } = await fetchPaperPdfFn({ data: { qpUrl: paper.qpUrl } });
          buf = base64ToArrayBuffer(base64);
        } catch (proxyErr) {
          throw new Error("Could not download the question paper file.");
        }
      }

      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buf),
      }).promise;

      const built: PageImage[] = [];
      const stems: StemBlob[] = [];
      const candidatePageMap: Record<number, number[]> = {};
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        built.push({ pageNumber: p, canvas });

        try {
          const content = await page.getTextContent();
          const pageStems = extractQuestionStems(content.items as PdfTextItem[]);
          stems.push(...pageStems);
          for (const s of pageStems) {
            if (s.number >= 1 && s.number <= paper.questionCount) {
              if (!candidatePageMap[s.number]) {
                candidatePageMap[s.number] = [];
              }
              candidatePageMap[s.number].push(p);
            }
          }
        } catch (textErr) {
          console.warn(`Text extraction skipped for page ${p}:`, textErr);
        }
      }

      // Resolve candidate sightings into a strictly monotonic question -> page map.
      // An exam paper is always sequentially ordered: page(q) >= page(q - 1).
      const rawPageMap: Record<number, number> = {};
      let lastPage = 1;
      for (let q = 1; q <= paper.questionCount; q++) {
        const sightings = candidatePageMap[q];
        if (!sightings || sightings.length === 0) continue;

        // Discard page 1 if total pages > 1 and q > 1 (multi-page exam cover page false positive)
        const validSightings = sightings.filter((p) => doc.numPages <= 1 || q === 1 || p > 1);
        if (validSightings.length === 0) continue;

        // Pick candidate page that respects monotonicity (p >= lastPage)
        const monotonicMatch = validSightings.find((p) => p >= lastPage);
        if (monotonicMatch !== undefined) {
          rawPageMap[q] = monotonicMatch;
          lastPage = monotonicMatch;
        } else {
          const highest = validSightings[validSightings.length - 1];
          if (highest >= lastPage) {
            rawPageMap[q] = highest;
            lastPage = highest;
          }
        }
      }

      const completedPageMap = fillMissingQuestionPages(
        rawPageMap,
        paper.questionCount,
        doc.numPages,
      );
      setQuestionPages(completedPageMap);
      setPages(built);
      setStemBlobs(stems);
      setActiveQuestion(1);
      setStage("practice");
      if (!completedAttempt) {
        saveDraftToStorage(
          initialAnswers,
          initialFlagged,
          initialTimeLeft,
          paper.id,
        );
        navigate({
          search: (prev) => ({ ...prev, paperId: paper.id }),
          replace: true,
        });
      }
      if (draft && Object.keys(draft.answers).length > 0) {
        toast.success(
          `Restored ${Object.keys(draft.answers).length} saved answer${Object.keys(draft.answers).length === 1 ? "" : "s"}.`,
        );
      }
    } catch (err) {
      console.error("MCQ PDF practice load error:", err);
      toast.error(
        err instanceof Error
          ? `Could not load PDF: ${err.message}`
          : "Couldn't process that PDF.",
      );
    } finally {
      setBusyLabel(null);
    }
  }

  // A link supplied a specific paper, so start it automatically instead of
  // making the student pick it again. Only fires once when the library loads.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (stage !== "library") return;
    if (!search.paperId) return; // Only auto-start on explicit link search parameter
    const paper = papersQuery.data?.papers.find((p) => p.id === search.paperId);
    if (!paper) return;
    autoStartedRef.current = true;
    beginPractice(paper);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.paperId, papersQuery.data, stage]);

  // Track currently visible page during scrolling so questions on the viewed page are known
  useEffect(() => {
    if (stage !== "practice" || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.id.replace("mcq-page-", ""), 10);
            if (!isNaN(pageNum)) {
              setVisiblePage(pageNum);
            }
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: "-10% 0px -55% 0px",
        threshold: 0,
      },
    );

    for (let p = 1; p <= pages.length; p++) {
      const el = document.getElementById(`mcq-page-${p}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stage, pages.length]);

  // When visible page updates as student scrolls the paper, gently scroll the side panel to keep those questions in view
  useEffect(() => {
    if (stage !== "practice" || !visiblePage) return;
    const pageQuestions = Object.entries(questionPages)
      .filter(([, p]) => p === visiblePage)
      .map(([q]) => Number(q))
      .sort((a, b) => a - b);
    if (pageQuestions.length > 0) {
      const firstQ = pageQuestions[0];
      const el = answerRowRefs.current.get(firstQ);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [visiblePage, questionPages, stage]);


  /* ---------------- countdown timer ----------------
   *
   * One interval per practice attempt (restarted only when `stage` or
   * `graded` changes, not on every tick) counting down from the paper's
   * real exam duration. Auto-submits once, exactly like a real exam
   * running out of time, via the effect below.
   */
  useEffect(() => {
    if (stage !== "practice" || graded || !timerEnabled) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage, graded, timerEnabled]);

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      stage !== "practice" ||
      graded ||
      !timerEnabled ||
      autoSubmittedRef.current
    )
      return;
    autoSubmittedRef.current = true;
    setTimeUp(true);
    toast.warning("Time's up — submitting your answers automatically.");
    gradeAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, stage, graded, timerEnabled]);

  /* ---------------- resilient autosave engine ---------------- */

  const saveDraftToStorage = useCallback(
    (
      currentAnswers: Record<number, Letter>,
      currentFlagged: Set<number>,
      currentTimeLeft: number | null,
      overridePaperId?: string,
    ) => {
      const targetPaperId = overridePaperId || selectedPaperIdRef.current;
      if (!targetPaperId || graded) return;
      try {
        const draft: McqDraft = {
          version: MCQ_DRAFT_VERSION,
          paperId: targetPaperId,
          paperTitle: paperTitleRef.current,
          level: levelRef.current,
          answers: currentAnswers,
          flagged: Array.from(currentFlagged),
          timeLeft: currentTimeLeft,
          savedAt: Date.now(),
        };
        window.localStorage.setItem(
          mcqDraftKey(effectiveUserId, targetPaperId),
          JSON.stringify(draft),
        );
        window.localStorage.setItem(
          mcqActiveKey(effectiveUserId),
          JSON.stringify({ version: MCQ_ACTIVE_VERSION, paperId: targetPaperId, savedAt: Date.now() }),
        );
        setSaveStatus("saved");
      } catch (err) {
        console.warn("MCQ autosave error:", err);
      }
    },
    [effectiveUserId, graded],
  );

  const toggleFlag = useCallback(
    (number: number) => {
      setSaveStatus("saving");
      setFlagged((prev) => {
        const next = new Set(prev);
        if (next.has(number)) next.delete(number);
        else next.add(number);
        saveDraftToStorage(answersRef.current, next, timeLeftRef.current);
        return next;
      });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [saveDraftToStorage],
  );

  const pick = useCallback(
    (number: number, letter: Letter) => {
      if (timeUp) return;
      setSaveStatus("saving");
      setAnswers((prev) => {
        const next = { ...prev, [number]: letter };
        saveDraftToStorage(next, flaggedRef.current, timeLeftRef.current);
        return next;
      });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [timeUp, saveDraftToStorage],
  );

  // Periodic background draft sync (saves timer countdown progress every 5 seconds)
  useEffect(() => {
    if (stage !== "practice" || graded || !selectedPaperId) return;
    const interval = window.setInterval(() => {
      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [stage, graded, selectedPaperId, saveDraftToStorage]);

  // Immediately flush draft state on tab close, page refresh, or navigation
  useEffect(() => {
    const handleFlush = () => {
      if (stage === "practice" && !graded && selectedPaperIdRef.current) {
        saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
      }
    };
    window.addEventListener("beforeunload", handleFlush);
    window.addEventListener("pagehide", handleFlush);
    return () => {
      window.removeEventListener("beforeunload", handleFlush);
      window.removeEventListener("pagehide", handleFlush);
    };
  }, [stage, graded, saveDraftToStorage]);

  /* ---------------- grading + feedback ---------------- */

  async function gradeAndSave() {
    if (Object.keys(answerKey).length === 0) {
      toast.error("No mark scheme loaded yet — upload one, or the answers can't be checked.");
      return;
    }
    setBusyLabel("Marking…");
    try {
      let tags: Record<number, { topic: string; skill: "knowledge" | "application" | "analysis" }> =
        {};
      if (stemBlobs.length > 0) {
        try {
          const { tags: rows } = await classifyTopicsFn({ data: { level, items: stemBlobs } });
          tags = Object.fromEntries(
            rows.map((t) => [t.number, { topic: t.topic, skill: t.skill }]),
          );
        } catch {
          // Grading still works without topic tags — feedback just won't be broken down.
        }
      }

      const allNumbers = new Set<number>([
        ...Object.keys(answerKey).map(Number),
        ...Object.keys(answers).map(Number),
      ]);
      const graded_ = [...allNumbers]
        .sort((a, b) => a - b)
        .map((number) => {
          const correctAnswer = answerKey[number] ?? null;
          const userAnswer = answers[number] ?? null;
          return {
            number,
            topic: tags[number]?.topic ?? "Untagged",
            skill: tags[number]?.skill ?? "knowledge",
            correct_answer: correctAnswer,
            user_answer: userAnswer,
            correct: correctAnswer ? correctAnswer === userAnswer : null,
          };
        });

      const scored = graded_.filter((q) => q.correct !== null);
      const score = scored.filter((q) => q.correct).length;
      setResult({ score, total: scored.length });
      setGraded(true);
      setReviewQuestions(
        graded_.map((q) => ({
          number: q.number,
          topic: q.topic,
          correct_answer: q.correct_answer,
          user_answer: q.user_answer,
          correct: q.correct,
        })),
      );

      const byTopic = new Map<string, { attempted: number; correct: number }>();
      for (const q of scored) {
        const entry = byTopic.get(q.topic) ?? { attempted: 0, correct: 0 };
        entry.attempted += 1;
        if (q.correct) entry.correct += 1;
        byTopic.set(q.topic, entry);
      }
      setAttemptTopics(
        [...byTopic.entries()].map(([topic, v]) => ({
          topic,
          attempted: v.attempted,
          correct: v.correct,
          accuracyPct: Math.round((v.correct / v.attempted) * 100),
        })),
      );
      setAttemptDomains(
        aggregateMcqDomains(scored.map((q) => ({ topic: q.topic, correct: !!q.correct }))),
      );

      await submitAttemptFn({
        data: {
          title: paperTitle,
          filename: paperTitle,
          level,
          paperId: selectedPaperId!,
          questions: graded_,
        },
      });
      if (selectedPaperId) {
        window.localStorage.removeItem(mcqDraftKey(effectiveUserId, selectedPaperId));
        window.localStorage.removeItem(mcqActiveKey(effectiveUserId));
        window.localStorage.removeItem(mcqDraftKey("guest", selectedPaperId));
        window.localStorage.removeItem(mcqActiveKey("guest"));
      }
      setDraftRefreshKey((k) => k + 1);
      navigate({
        search: (prev) => {
          const next = { ...prev };
          delete next.paperId;
          return next;
        },
        replace: true,
      });
      topicPerformance.refetch();
      queryClient.invalidateQueries({ queryKey: ["mcq-paper-history"] });
      queryClient.invalidateQueries({ queryKey: ["review-mcq-history"] });
      queryClient.invalidateQueries({ queryKey: ["review-mcq-topics"] });
      queryClient.invalidateQueries({ queryKey: ["review-panel"] });
      toast.success(`Marked — ${score}/${scored.length}.`);
    } catch (err) {
      toast.error("Marking failed — your answers are still on screen, try again.");
    } finally {
      setBusyLabel(null);
    }
  }

  /* ---------------- render ---------------- */

  const answeredCount = Object.keys(answers).length;
  // Full ordered list of question numbers, straight off the mark scheme —
  // this is what the answer side panel renders, one row per question,
  // regardless of where (or how reliably) that question landed on the
  // page image.
  const questionNumbers = useMemo(
    () =>
      Object.keys(answerKey)
        .map(Number)
        .sort((a, b) => a - b),
    [answerKey],
  );

  function leavePractice() {
    setStage("library");
    setDraftRefreshKey((k) => k + 1);
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.paperId;
        return next;
      },
      replace: true,
    });
  }

  async function openFullPastPaper() {
    const attempt = historyAttempt.data;
    if (!attempt) return;
    const paper = papersQuery.data?.papers.find((entry) => entry.id === attempt.paperId);
    if (!paper) {
      toast.error("That paper is no longer available in the library.");
      return;
    }
    setHistoryAttemptId(null);
    setHistoryExplanations({});
    await beginPractice(paper, attempt);
  }

  return (
    <div>
      {stage === "library" ? (
        <PageHeader
          title="MCQ Live"
          description="Practice straight off a real past paper — answer from the button panel beside it."
          action={
            <Button
              size="sm"
              variant={calcOpen ? "default" : "outline"}
              onClick={() => setCalcOpen((v) => !v)}
              className="h-9 gap-1.5 rounded-xl border-border font-medium shadow-2xs hover:bg-muted"
              title="Open Cambridge Economics Calculator & Solvers (Alt+C)"
            >
              <CalculatorIcon className="h-4 w-4 text-primary" />
              <span>Cambridge Calculator</span>
            </Button>
          }
        />
      ) : null}

      {stage === "library" ? (
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 max-w-2xl">
            {activeDraftSummary ? (
              <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm transition-all hover:border-primary/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold tracking-wider uppercase text-primary">
                        In-Progress Exam Draft
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                        <Clock className="h-3.5 w-3.5" />
                        Expires in {formatRemainingTime(activeDraftSummary.remainingMs)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground truncate">
                      {activeDraftSummary.paper.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">
                        {Object.keys(activeDraftSummary.draft.answers).length}
                      </strong>{" "}
                      of {activeDraftSummary.paper.questionCount} questions answered
                      {activeDraftSummary.draft.timeLeft !== null && (
                        <>
                          {" "}
                          ·{" "}
                          <strong className="text-foreground">
                            {formatTime(activeDraftSummary.draft.timeLeft)}
                          </strong>{" "}
                          remaining
                        </>
                      )}
                      {" · "}Auto-purged after 12h without resuming.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:border-destructive/40"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to discard your in-progress exam? All unsaved answers will be deleted.",
                          )
                        ) {
                          window.localStorage.removeItem(
                            mcqDraftKey(effectiveUserId, activeDraftSummary.paper.id),
                          );
                          window.localStorage.removeItem(mcqActiveKey(effectiveUserId));
                          window.localStorage.removeItem(
                            mcqDraftKey("guest", activeDraftSummary.paper.id),
                          );
                          window.localStorage.removeItem(mcqActiveKey("guest"));
                          setDraftRefreshKey((k) => k + 1);
                          toast.success("Exam draft discarded.");
                        }
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90"
                      onClick={() => beginPractice(activeDraftSummary.paper)}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                      Resume Exam
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Pick a paper to practice</p>
              </div>
              <a
                href="/mcq-papers-admin"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Admin? Manage the library
              </a>
            </div>

            {topicPerformance.data && topicPerformance.data.topics.length > 0 ? (
              <div className="mb-6 space-y-4">
                <McqDomainBreakdown
                  domains={aggregateMcqDomainsFromTopicStats(
                    topicPerformance.data.topics.map((t) => ({
                      topic: t.topic,
                      attempted: t.attempted,
                      correct: t.correct,
                    })),
                  )}
                  title="Overall Performance: micro vs macro"
                />
                <McqReviewPanel topics={topicPerformance.data.topics} />
              </div>
            ) : null}

            {papersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading the library…</p>
            ) : (papersQuery.data?.papers.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No papers are published in the library yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <PastPaperSelector
                  papers={papersQuery.data!.papers}
                  busy={!!busyLabel}
                  busyPaperId={selectedPaperId}
                  onStart={beginPractice}
                  activeDraftPaperId={activeDraftSummary?.paper.id}
                  activeDraftAnswersCount={
                    activeDraftSummary ? Object.keys(activeDraftSummary.draft.answers).length : 0
                  }
                />
              </div>
            )}

            <p className="mt-5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              Read each question off the real paper, then answer from the button panel next to it —
              nothing is placed on a guess, and AI never writes, changes, or places any question.
            </p>
          </div>

          <div className="lg:sticky lg:top-10 lg:self-start">
            <PaperHistorySidebar
              entries={paperHistory.data?.papers ?? []}
              isLoading={paperHistory.isLoading}
              onReview={(attemptId) => setHistoryAttemptId(attemptId)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[100dvh] overflow-hidden bg-background">
          <div className="shrink-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur md:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <Button size="sm" variant="ghost" onClick={leavePractice} className="h-8 px-2 text-xs gap-1 shrink-0">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Papers</span>
              </Button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold truncate text-foreground max-w-[130px] sm:max-w-xs md:max-w-md" title={paperTitle}>
                  {paperTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {timeLeft !== null ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={timerEnabled ? "default" : "outline"}
                    onClick={() => setTimerEnabled((v) => !v)}
                    className="h-8 px-2 text-xs gap-1 hidden sm:inline-flex"
                    title={
                      timerEnabled
                        ? "Turn the timer off — it pauses, nothing is submitted early."
                        : "Turn the timer back on — it resumes from where it paused."
                    }
                  >
                    <TimerIcon className="h-3.5 w-3.5" />
                    <span>Timer</span>
                  </Button>

                  {timerEnabled ? (
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap tabular-nums",
                        timeLeft === 0
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : timeLeft <= LOW_TIME_WARNING_SECONDS
                            ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted/60 text-foreground"
                      )}
                      title={`${level === "a2" ? "Paper 3 (A Level)" : "Paper 1 (AS)"} — ${
                        PAPER_DURATION_SECONDS[level] / 60
                      } minutes`}
                    >
                      <TimerIcon className="h-3 w-3 sm:hidden" />
                      {formatTime(timeLeft)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Button
                size="sm"
                variant={annotateMode ? "default" : "outline"}
                onClick={() => setAnnotateMode((v) => !v)}
                className="h-8 px-2 text-xs gap-1"
                title="Toggle freehand pen markup"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Annotate</span>
              </Button>

              <Button
                size="sm"
                variant={calcOpen ? "default" : "outline"}
                onClick={() => setCalcOpen((v) => !v)}
                className={cn(
                  "h-8 px-2 text-xs gap-1.5 transition-all",
                  calcOpen && "bg-primary text-primary-foreground shadow-xs font-semibold"
                )}
                title="Cambridge Economics Calculator & Formula Solvers (Alt+C)"
              >
                <CalculatorIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calculator</span>
              </Button>

              <div className="hidden md:flex items-center gap-2 min-w-[7rem]">
                <Progress value={(answeredCount / Math.max(qCount, 1)) * 100} className="h-2" />
                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {answeredCount}/{qCount}
                </span>
              </div>

              {flagged.size > 0 ? (
                <UiBadge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs px-2 py-0.5 hidden xs:inline-flex"
                >
                  <Flag className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{flagged.size}</span>
                </UiBadge>
              ) : null}

              {!graded ? (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 font-mono text-[11px] text-muted-foreground select-none"
                  title="Autosave is active — all answers and timer progress are saved locally in your browser."
                >
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                      <span className="hidden xs:inline">Saving…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="hidden xs:inline">Saved</span>
                    </>
                  )}
                </div>
              ) : null}

              <Button
                size="sm"
                onClick={gradeAndSave}
                disabled={!!busyLabel}
                className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-sm"
              >
                {busyLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Submit</span>
              </Button>
            </div>
          </div>

          {annotateMode ? (
            <div className="shrink-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-3 py-2 backdrop-blur md:px-6">
              <span className="text-xs text-muted-foreground">Mark up the page:</span>
              <div className="flex items-center gap-1.5">
                {ANNOTATE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setAnnotateTool("pen");
                      setAnnotateColor(c);
                    }}
                    className={[
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      annotateTool === "pen" && annotateColor === c
                        ? "scale-110 border-foreground"
                        : "border-transparent",
                    ].join(" ")}
                    style={{ backgroundColor: c }}
                    title="Pen"
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant={annotateTool === "eraser" ? "default" : "outline"}
                onClick={() => setAnnotateTool("eraser")}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Eraser className="h-3.5 w-3.5" />
                Eraser
              </Button>
              <Button size="sm" variant="outline" onClick={clearAllAnnotations} className="h-7 px-2 text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Marks are personal scratchpad notes — not saved or graded.
              </span>
            </div>
          ) : null}

          {timeUp ? (
            <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-center text-xs text-destructive md:px-8">
              Time's up — this attempt has been submitted automatically.
            </div>
          ) : null}

          {result
            ? (() => {
                const pct = Math.round((result.score / Math.max(result.total, 1)) * 100);
                const tier = resultTier(pct);
                return (
                  <div
                    className={[
                      "shrink-0 animate-in fade-in slide-in-from-top-2 zoom-in-95 flex flex-col items-center justify-center gap-1.5 border-b px-5 py-5 text-center duration-300",
                      tier.className,
                    ].join(" ")}
                  >
                    <tier.Icon className="h-8 w-8" />
                    <span className="text-3xl font-bold tracking-tight">
                      {result.score} / {result.total}
                    </span>
                    <span className="text-base font-semibold">{tier.label}</span>
                    <span className="text-sm opacity-80">{pct}% correct</span>
                  </div>
                );
              })()
            : null}

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Paper Column: Independently scrollable, only the paper scrolls */}
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 h-full overflow-y-auto px-2 sm:px-4 py-4 scroll-smooth"
            >
              <div className="w-full max-w-[820px] mx-auto flex flex-col items-center gap-8 pb-36 lg:pb-16">
                {graded && attemptTopics.length > 0 ? (
                  <div className="w-full max-w-2xl space-y-4 pt-2 pb-6 border-b border-border/80">
                    <McqDomainBreakdown domains={attemptDomains} title="This paper: micro vs macro" />
                    <McqReviewPanel
                      topics={attemptTopics}
                      title="This paper, in short"
                      emptyLabel="No topics tagged."
                    />
                  </div>
                ) : null}

                {pages.map((page) => (
                  <PageCanvas
                    key={page.pageNumber}
                    page={page}
                    totalPages={pages.length}
                    pageQuestions={Object.entries(questionPages)
                      .filter(([, p]) => p === page.pageNumber)
                      .map(([q]) => Number(q))
                      .sort((a, b) => a - b)}
                    answers={answers}
                    activeQuestion={activeQuestion}
                    onSelectQuestion={goToQuestion}
                    annotateMode={annotateMode}
                    annotateTool={annotateTool}
                    annotateColor={annotateColor}
                    onRegisterAnnotationCanvas={registerAnnotationCanvas}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Side Panel: Permanently FIXED right beside the paper, NEVER disappears */}
            <aside
              className={cn(
                "hidden lg:flex flex-col shrink-0 h-full border-l border-border/80 bg-card/40 backdrop-blur-xs z-10",
                graded ? "w-80 xl:w-96" : "w-72 xl:w-84"
              )}
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-28">
                {graded ? (
                  <McqQuestionReviewList
                    questions={reviewQuestions}
                    onSelect={goToQuestion}
                    onExplain={handleExplain}
                    explanations={explanations}
                    title="Review & explain"
                  />
                ) : (
                  <AnswerSidePanel
                    numbers={questionNumbers}
                    answers={answers}
                    answerKey={answerKey}
                    graded={graded}
                    onPick={pick}
                    flagged={flagged}
                    onToggleFlag={toggleFlag}
                    highlightNumber={highlightNumber}
                    rowRefs={answerRowRefs}
                    onJumpToQuestion={goToQuestion}
                    activeQuestion={activeQuestion}
                    questionPages={questionPages}
                    saveStatus={saveStatus}
                  />
                )}
              </div>
            </aside>
          </div>

          {/* Mobile floating bottom answering dock */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {graded ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    Score: {result?.score ?? 0} / {result?.total ?? qCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(((result?.score ?? 0) / Math.max(result?.total ?? qCount, 1)) * 100)}%)
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setMobileReviewOpen(true)}
                  className="gap-1.5 h-9"
                >
                  <BookOpen className="size-3.5" />
                  Review &amp; Explain
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Top navigation row: Prev, Active Question info & flag, Sheet toggle, Next */}
                <div className="flex items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activeQuestion <= 1}
                    onClick={() => goToQuestion(Math.max(1, activeQuestion - 1))}
                    className="h-8 px-2 text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Prev</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFlag(activeQuestion)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                        flagged.has(activeQuestion)
                          ? "border-amber-500 bg-amber-500/15 text-amber-500"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      title={flagged.has(activeQuestion) ? "Unflag" : "Flag"}
                    >
                      <Flag className={cn("h-3.5 w-3.5", flagged.has(activeQuestion) && "fill-amber-500")} />
                    </button>

                    <span className="font-mono font-bold text-sm text-foreground">
                      Q{activeQuestion}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {qCount}
                    </span>

                    {answers[activeQuestion] ? (
                      <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                        {answers[activeQuestion]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setMobileSheetOpen(true)}
                      className="h-8 px-2.5 text-xs gap-1 font-mono"
                      title="Open full question sheet"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>{answeredCount}/{qCount}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeQuestion >= qCount}
                      onClick={() => goToQuestion(Math.min(qCount, activeQuestion + 1))}
                      className="h-8 px-2 text-xs gap-1"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Bottom row: Four large touch buttons for A, B, C, D */}
                <div className="grid grid-cols-4 gap-2">
                  {(["A", "B", "C", "D"] as Letter[]).map((l) => {
                    const isPicked = answers[activeQuestion] === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          pick(activeQuestion, l);
                          if (activeQuestion < qCount) {
                            window.setTimeout(() => {
                              goToQuestion(activeQuestion + 1);
                            }, 250);
                          }
                        }}
                        className={cn(
                          "h-11 rounded-xl font-bold text-base transition-all flex items-center justify-center border shadow-sm active:scale-95",
                          isPicked
                            ? "bg-primary text-primary-foreground border-primary shadow-md font-extrabold ring-2 ring-primary/40"
                            : "bg-background border-border/80 text-foreground hover:bg-muted"
                        )}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Question Grid Sheet */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-t-2xl">
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span>Answer Sheet Matrix</span>
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {answeredCount} / {qCount} answered
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 pb-24">
                <AnswerSidePanel
                  numbers={questionNumbers}
                  answers={answers}
                  answerKey={answerKey}
                  graded={graded}
                  onPick={pick}
                  flagged={flagged}
                  onToggleFlag={toggleFlag}
                  highlightNumber={highlightNumber}
                  rowRefs={answerRowRefs}
                  onJumpToQuestion={(q, opts) => {
                    goToQuestion(q, opts);
                    if (!opts?.skipScrollPaper) {
                      setMobileSheetOpen(false);
                    }
                  }}
                  activeQuestion={activeQuestion}
                  questionPages={questionPages}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Review Sheet */}
          <Sheet open={mobileReviewOpen} onOpenChange={setMobileReviewOpen}>
            <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-t-2xl">
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span>Question Review &amp; Explanations</span>
                  {result ? (
                    <span className="font-mono text-xs font-bold text-primary">
                      {result.score} / {result.total} ({Math.round((result.score / Math.max(result.total, 1)) * 100)}%)
                    </span>
                  ) : null}
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <McqQuestionReviewList
                  questions={reviewQuestions}
                  onSelect={(q) => {
                    goToQuestion(q);
                    setMobileReviewOpen(false);
                  }}
                  onExplain={handleExplain}
                  explanations={explanations}
                  title="Review & explain"
                />
                {attemptTopics.length > 0 ? (
                  <div className="space-y-4 pt-4 border-t">
                    <McqDomainBreakdown domains={attemptDomains} title="Micro vs Macro" />
                    <McqReviewPanel topics={attemptTopics} title="Topic Breakdown" />
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <PastAttemptSheet
        attemptId={historyAttemptId}
        attempt={historyAttempt.data ?? null}
        isLoading={historyAttempt.isLoading}
        explanations={historyExplanations}
        onExplain={handleHistoryExplain}
        onOpenFullPaper={openFullPastPaper}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryAttemptId(null);
            setHistoryExplanations({});
          }
        }}
      />
      <McqCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Paper history sidebar + past-attempt review sheet                     */
/* -------------------------------------------------------------------- */

/** Formats a score as "X/Y (Z%)", or a dash when there's nothing to show. */
function formatScore(score: number | null, total: number): string {
  if (score === null || total === 0) return "—";
  return `${score}/${total}`;
}

function scorePct(score: number | null, total: number): number | null {
  if (score === null || total === 0) return null;
  return Math.round((score / total) * 100);
}

/**
 * Sidebar list of every paper the student has attempted, one row per
 * paper — retakes collapse together. Shows the aggregate (first-attempt,
 * counts-toward-progress) score plus the latest attempt's score when it
 * differs, and how many times the paper's been retaken. Clicking a row
 * opens that paper's most recent attempt for revision.
 */
function PaperHistorySidebar({
  entries,
  isLoading,
  onReview,
}: {
  entries: PaperHistoryEntry[];
  isLoading: boolean;
  onReview: (attemptId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Your history</p>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Papers you finish will show up here with your score, so you can come back and revise
            them any time.
          </p>
        ) : (
          <ul className="-mx-1 max-h-[70vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
            {entries.map((entry) => {
              const key = entry.paperId ?? entry.aggregateAttemptId;
              const aggregatePct = scorePct(entry.aggregateScore, entry.aggregateTotal);
              const latestDiffers = entry.latestAttemptId !== entry.aggregateAttemptId;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onReview(entry.latestAttemptId)}
                    className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="truncate font-medium text-foreground">{entry.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                      <span
                        className={
                          aggregatePct !== null
                            ? aggregatePct >= 70
                              ? "font-semibold text-emerald-600 dark:text-emerald-400"
                              : aggregatePct >= 50
                                ? "font-semibold text-amber-600 dark:text-amber-400"
                                : "font-semibold text-destructive"
                            : "font-semibold"
                        }
                      >
                        {formatScore(entry.aggregateScore, entry.aggregateTotal)}
                      </span>
                      {aggregatePct !== null ? <span>({aggregatePct}%)</span> : null}
                      {entry.attemptsCount > 1 ? (
                        <span>· {entry.attemptsCount} attempts</span>
                      ) : null}
                    </span>
                    {latestDiffers ? (
                      <span className="text-muted-foreground/80">
                        Latest retake: {formatScore(entry.latestScore, entry.latestTotal)}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground/80">
          Only your first attempt at a paper counts toward your score — retake freely to revise, it
          just won't change the number above.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Side sheet for revisiting a finished attempt: score banner plus the same
 * click-to-review, explain-on-demand list used right after marking — just
 * fed from a saved attempt instead of the one just completed. Deliberately
 * skips re-fetching or re-rendering the original PDF pages; the review
 * list already carries everything needed to revise.
 */
function PastAttemptSheet({
  attemptId,
  attempt,
  isLoading,
  explanations,
  onExplain,
  onOpenFullPaper,
  onOpenChange,
}: {
  attemptId: string | null;
  attempt: {
    title: string;
    paperId: string;
    score: number | null;
    total: number;
    questions: GradedQuestion[];
  } | null;
  isLoading: boolean;
  explanations: Record<number, ExplanationState>;
  onExplain: (number: number) => void;
  onOpenFullPaper: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const pct = attempt ? scorePct(attempt.score, attempt.total) : null;
  const tier = pct !== null ? resultTier(pct) : null;

  return (
    <Sheet open={!!attemptId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{attempt?.title ?? "Past attempt"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !attempt ? (
            <p className="text-sm text-destructive">Couldn't load that attempt.</p>
          ) : (
            <>
              {tier ? (
                <div
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg border px-4 py-4 text-center",
                    tier.className,
                  ].join(" ")}
                >
                  <tier.Icon className="h-6 w-6" />
                  <span className="text-2xl font-bold tracking-tight">
                    {attempt.score} / {attempt.total}
                  </span>
                  <span className="text-sm font-medium">{tier.label}</span>
                </div>
              ) : null}

              <Button type="button" className="w-full" onClick={onOpenFullPaper}>
                <BookOpen className="size-4" /> Open full paper and questions
              </Button>

              <McqQuestionReviewList
                questions={attempt.questions}
                onSelect={() => {}}
                onExplain={onExplain}
                explanations={explanations}
                title="Review & explain"
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- */
/* Page canvas                                                            */
/* -------------------------------------------------------------------- */

function PageCanvas({
  page,
  totalPages,
  pageQuestions,
  answers,
  activeQuestion,
  onSelectQuestion,
  annotateMode,
  annotateTool,
  annotateColor,
  onRegisterAnnotationCanvas,
}: {
  page: PageImage;
  totalPages: number;
  pageQuestions: number[];
  answers: Record<number, Letter>;
  activeQuestion: number;
  onSelectQuestion: (number: number) => void;
  annotateMode: boolean;
  annotateTool: AnnotateTool;
  annotateColor: string;
  onRegisterAnnotationCanvas: (pageNumber: number, el: HTMLCanvasElement | null) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dataUrl = useMemo(() => page.canvas.toDataURL("image/png"), [page.canvas]);

  return (
    <div
      id={`mcq-page-${page.pageNumber}`}
      className="w-full max-w-[820px] scroll-mt-20 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="font-semibold text-foreground">Page {page.pageNumber}</span>
          <span className="opacity-60">/ {totalPages}</span>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-md shadow-xl border border-border/80 bg-white dark:bg-card select-none"
        style={{ aspectRatio: `${page.canvas.width} / ${page.canvas.height}` }}
      >
        <img
          ref={imgRef}
          src={dataUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-full object-contain pointer-events-none block"
        />

        <AnnotationLayer
          width={page.canvas.width}
          height={page.canvas.height}
          enabled={annotateMode}
          tool={annotateTool}
          color={annotateColor}
          registerCanvas={(el) => onRegisterAnnotationCanvas(page.pageNumber, el)}
        />
      </div>
    </div>
  );
}

/**
 * A transparent freehand-drawing canvas layered above the page image.
 * Purely a client-side scratchpad — nothing here is persisted or graded,
 * it just lets a student circle a distractor, cross out an option, or
 * mark up a diagram the way they would on paper.
 *
 * Pointer events only land on this layer while `enabled` — otherwise
 * `pointer-events: none` lets clicks pass straight through to the page
 * underneath, so toggling "Annotate" off instantly restores normal
 * behaviour with nothing else to change.
 */
function AnnotationLayer({
  width,
  height,
  enabled,
  tool,
  color,
  registerCanvas,
}: {
  width: number;
  height: number;
  enabled: boolean;
  tool: AnnotateTool;
  color: string;
  registerCanvas: (el: HTMLCanvasElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    registerCanvas(canvasRef.current);
    return () => registerCanvas(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;
    const pos = getPos(e);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    }
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    lastPointRef.current = pos;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-20"
      style={{
        touchAction: "none",
        pointerEvents: enabled ? "auto" : "none",
        cursor: enabled ? (tool === "eraser" ? "cell" : "crosshair") : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}

/**
 * The answer panel itself: one plain row per question, each with normal
 * A/B/C/D buttons — no positioning against the page, no overlay, just a
 * list a student clicks down. Grading/highlighting logic is identical to
 * before; only where the buttons live has changed.
 */
function AnswerSidePanel({
  numbers,
  answers,
  answerKey,
  graded,
  onPick,
  flagged = new Set(),
  onToggleFlag,
  highlightNumber,
  rowRefs,
  onJumpToQuestion,
  activeQuestion,
  questionPages,
  saveStatus,
}: {
  numbers: number[];
  answers: Record<number, Letter>;
  answerKey: Record<number, Letter>;
  graded: boolean;
  onPick: (number: number, letter: Letter) => void;
  flagged?: Set<number>;
  onToggleFlag?: (number: number) => void;
  /** Question number to visually pulse right now (from clicking a review-list row), or null. */
  highlightNumber?: number | null;
  rowRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onJumpToQuestion?: (number: number, options?: { skipScrollPaper?: boolean }) => void;
  activeQuestion?: number;
  questionPages?: Record<number, number>;
  saveStatus?: "saved" | "saving";
}) {
  const [filter, setFilter] = useState<"all" | "flagged" | "unanswered">("all");
  const [showGrid, setShowGrid] = useState(false);

  if (numbers.length === 0) {
    return <p className="text-xs text-muted-foreground">No questions loaded.</p>;
  }

  const answeredCount = numbers.filter((n) => !!answers[n]).length;
  const flaggedCount = numbers.filter((n) => flagged.has(n)).length;
  const unansweredCount = numbers.length - answeredCount;

  const filteredNumbers = numbers.filter((n) => {
    if (filter === "flagged") return flagged.has(n);
    if (filter === "unanswered") return !answers[n];
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header controls & status */}
      <div className="space-y-2 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Questions ({answeredCount}/{numbers.length})
          </span>
          <div className="flex items-center gap-1.5">
            {!graded && saveStatus ? (
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground select-none"
                title="Autosave is active — all answers and timer progress are saved locally in your browser."
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-500" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                    <span>Saved</span>
                  </>
                )}
              </span>
            ) : null}
            <Button
              type="button"
              variant={showGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowGrid((v) => !v)}
              className="h-7 px-2 text-xs gap-1"
              title={showGrid ? "Hide question matrix" : "Show quick jump matrix"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Matrix</span>
            </Button>
          </div>
        </div>

        {/* Quick jump matrix */}
        {showGrid ? (
          <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>Quick jump:</span>
              <span className="flex items-center gap-1.5 text-[10px]">
                <span className="inline-block w-2 h-2 rounded-full bg-primary/70" /> Answered
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Flagged
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {numbers.map((n) => {
                const isAnswered = !!answers[n];
                const isFlagged = flagged.has(n);
                const isCurrent = activeQuestion === n || highlightNumber === n;
                const pageNum = questionPages?.[n];
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (filter !== "all" && !filteredNumbers.includes(n)) {
                        setFilter("all");
                      }
                      onJumpToQuestion?.(n);
                    }}
                    className={cn(
                      "relative h-7 text-[11px] font-mono rounded border flex items-center justify-center transition-all",
                      isCurrent
                        ? "ring-2 ring-primary border-primary font-bold bg-primary/15 text-primary"
                        : isAnswered
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          : "bg-background border-border/60 text-muted-foreground hover:bg-muted",
                      isFlagged && "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                    title={`Question ${n}${pageNum ? ` (Page ${pageNum})` : ""}${isFlagged ? " (Flagged)" : ""}${isAnswered ? ` (Answer: ${answers[n]})` : " (Unanswered)"}`}
                  >
                    {n}
                    {isFlagged ? (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Filter pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "flex-1 text-center py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All ({numbers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("flagged")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "flagged"
                ? "bg-amber-500 text-white shadow-sm"
                : flaggedCount > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Flag className={cn("h-3 w-3", filter === "flagged" || flaggedCount > 0 ? "fill-current" : "")} />
            Flagged ({flaggedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unanswered")}
            className={cn(
              "flex-1 text-center py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "unanswered"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Left ({unansweredCount})
          </button>
        </div>
      </div>

      {/* Question list */}
      {filteredNumbers.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {filter === "flagged" ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">No flagged questions</p>
              <p>Click the flag icon next to any question to mark it for review.</p>
            </div>
          ) : filter === "unanswered" ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">All answered!</p>
              <p>You have answered all {numbers.length} questions in this paper.</p>
            </div>
          ) : (
            <p>No questions found.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 pb-24">
          {filteredNumbers.map((number) => {
            const isFlagged = flagged.has(number);
            const isCurrent = activeQuestion === number || highlightNumber === number;
            const pageNum = questionPages?.[number];
            return (
              <div
                key={number}
                ref={(el) => {
                  if (el) rowRefs.current.set(number, el);
                  else rowRefs.current.delete(number);
                }}
                className={cn(
                  "flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 transition-all",
                  isCurrent
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40 font-medium"
                    : isFlagged
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-transparent hover:border-border/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {onToggleFlag ? (
                    <button
                      type="button"
                      onClick={() => onToggleFlag(number)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded transition-transform hover:scale-110",
                        isFlagged
                          ? "text-amber-500"
                          : "text-muted-foreground/30 hover:text-amber-500/70"
                      )}
                      title={isFlagged ? `Question ${number} flagged — click to unflag` : `Flag question ${number} for review`}
                    >
                      <Flag className={cn("h-3.5 w-3.5", isFlagged && "fill-amber-500")} />
                      <span className="sr-only">Flag Q{number}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onJumpToQuestion?.(number)}
                    className="flex items-baseline gap-1 text-left group/btn"
                    title={`Jump paper to Question ${number}${pageNum ? ` (Page ${pageNum})` : ""}`}
                  >
                    <span className={cn(
                      "font-mono text-xs font-semibold group-hover/btn:text-primary transition-colors",
                      isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {number}
                    </span>
                    {pageNum ? (
                      <span className="text-[10px] text-muted-foreground/60 font-mono group-hover/btn:text-primary">
                        p.{pageNum}
                      </span>
                    ) : null}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {(["A", "B", "C", "D"] as Letter[]).map((l) => (
                    <AnswerOptionButton
                      key={l}
                      letter={l}
                      picked={answers[number] === l}
                      correct={graded && answerKey[number] === l}
                      wrong={graded && answers[number] === l && answerKey[number] !== l}
                      onClick={() => {
                        onPick(number, l);
                        // On laptop/desktop side panel, picking an answer should NOT auto-scroll the paper!
                        onJumpToQuestion?.(number, { skipScrollPaper: true });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnswerOptionButton({
  letter,
  picked,
  correct,
  wrong,
  onClick,
}: {
  letter: Letter;
  picked: boolean;
  correct: boolean;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all duration-150 active:scale-95",
        "hover:scale-105",
        picked
          ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40 font-extrabold"
          : "border-border/80 bg-background/90 text-foreground hover:bg-muted",
        correct
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
          : "",
        wrong ? "badge-shake border-destructive bg-destructive text-white" : ""
      )}
    >
      {letter}
    </button>
  );
}

/* -------------------------------------------------------------------- */
/* Mark scheme parsing                                                   */
/* -------------------------------------------------------------------- */

type McqPaperSummary = Awaited<ReturnType<typeof listMcqPapers>>["papers"][number];

/** Oldest-defined-first because we want most-recent series shown first within a year. */
const SERIES_DISPLAY_ORDER = ["Oct/Nov", "May/June", "Feb/March"] as const;

function paperCode(paper: McqPaperSummary): string {
  // 1. Look for explicit "Paper XX"
  const namedPaper = paper.title.match(/\bpaper\s*(\d{1,2})\b/i)?.[1];
  if (namedPaper) return `Paper ${namedPaper.padStart(2, "0")}`;

  // 2. Look for Cambridge code e.g. 9708_w24_qp_13 or 9708-m23-12
  const codeMatch =
    paper.title.match(/9708[_\s-]+[msw]\d{2}[_\s-]+(?:qp|ms|paper)?[_\s-]*(\d{2})/i)?.[1] ??
    paper.title.match(/(?:qp|ms)[_\s-]*(\d{2})\b/i)?.[1] ??
    paper.title.match(/\b9708[\s/_-]+(\d{2})\b/i)?.[1];
  if (codeMatch) return `Paper ${codeMatch.padStart(2, "0")}`;

  // 3. Fallback: match any two-digit paper code like 11, 12, 13, 31, 32, 33
  const variantMatch = paper.title.match(/\b([13][1-3])\b/)?.[1];
  if (variantMatch) return `Paper ${variantMatch}`;

  return paper.title;
}

function hasCompleteAnswerKey(paper: McqPaperSummary): boolean {
  return Array.from(
    { length: paper.questionCount },
    (_, index) => paper.answerKey[String(index + 1)],
  ).every(Boolean);
}

function uniqueSorted<T>(values: T[], compare: (a: T, b: T) => number): T[] {
  return Array.from(new Set(values)).sort(compare);
}

function PastPaperSelector({
  papers,
  busy,
  busyPaperId,
  onStart,
  activeDraftPaperId,
  activeDraftAnswersCount = 0,
}: {
  papers: McqPaperSummary[];
  busy: boolean;
  busyPaperId: string | null;
  onStart: (paper: McqPaperSummary) => void;
  activeDraftPaperId?: string | null;
  activeDraftAnswersCount?: number;
}) {
  const years = useMemo(() => {
    return uniqueSorted(
      papers.map((paper) => (paper.examYear ? String(paper.examYear) : "Unsorted")),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        return Number(b) - Number(a);
      },
    );
  }, [papers]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const activeYear = years.includes(selectedYear) ? selectedYear : (years[0] ?? "");

  const yearPapers = useMemo(() => {
    return papers.filter(
      (paper) => (paper.examYear ? String(paper.examYear) : "Unsorted") === activeYear,
    );
  }, [papers, activeYear]);

  const seriesOptions = useMemo(() => {
    return uniqueSorted(
      yearPapers.map((paper) => paper.examSeries ?? "Unsorted"),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
        const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      },
    );
  }, [yearPapers]);

  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const activeSeries = seriesOptions.includes(selectedSeries)
    ? selectedSeries
    : (seriesOptions[0] ?? "");

  const seriesPapers = useMemo(() => {
    return yearPapers.filter((paper) => (paper.examSeries ?? "Unsorted") === activeSeries);
  }, [yearPapers, activeSeries]);

  const levels = useMemo(() => {
    return uniqueSorted(
      seriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
  }, [seriesPapers]);

  const [preferredLevel, setPreferredLevel] = useState<Level>(() => {
    try {
      const saved = window.localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetLevel === "a2_level") return "a2";
        if (parsed.targetLevel === "as_level") return "as";
      }
    } catch {
      // fallback
    }
    return "as";
  });

  const activeLevel = levels.includes(preferredLevel) ? preferredLevel : (levels[0] ?? "as");

  const matchingPapers = useMemo(() => {
    return seriesPapers
      .filter((paper) => paper.level === activeLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
  }, [seriesPapers, activeLevel]);

  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const selectedPaper = useMemo(() => {
    return matchingPapers.find((paper) => paper.id === selectedPaperId) ?? matchingPapers[0] ?? null;
  }, [matchingPapers, selectedPaperId]);

  function chooseYear(nextYear: string) {
    setSelectedYear(nextYear);
    const nextYearPapers = papers.filter(
      (paper) => (paper.examYear ? String(paper.examYear) : "Unsorted") === nextYear,
    );
    const nextSeriesOptions = uniqueSorted(
      nextYearPapers.map((paper) => paper.examSeries ?? "Unsorted"),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
        const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      },
    );
    const nextSeries = nextSeriesOptions.includes(activeSeries)
      ? activeSeries
      : (nextSeriesOptions[0] ?? "");
    setSelectedSeries(nextSeries);

    const nextSeriesPapers = nextYearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevels = uniqueSorted(
      nextSeriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
    const nextLevel = nextLevels.includes(activeLevel) ? activeLevel : (nextLevels[0] ?? "as");
    setPreferredLevel(nextLevel);

    const nextMatching = nextSeriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function chooseSeries(nextSeries: string) {
    setSelectedSeries(nextSeries);
    const nextSeriesPapers = yearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevels = uniqueSorted(
      nextSeriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
    const nextLevel = nextLevels.includes(activeLevel) ? activeLevel : (nextLevels[0] ?? "as");
    setPreferredLevel(nextLevel);

    const nextMatching = nextSeriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function chooseLevel(nextLevel: Level) {
    setPreferredLevel(nextLevel);
    const nextMatching = seriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function choosePaperId(nextId: string) {
    setSelectedPaperId(nextId);
  }

  return (
    <Card className="overflow-hidden border-2 border-foreground/80 shadow-[6px_6px_0_hsl(var(--foreground))]">
      <CardContent className="space-y-6 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
            Paper selection
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-xl border bg-muted/25 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Board and subject</p>
          <p className="mt-1 font-semibold">Cambridge International · Economics (9708)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PaperSelect label="Year" value={activeYear} options={years} onChange={chooseYear} />
          <PaperSelect
            label="Exam session"
            value={activeSeries}
            options={seriesOptions}
            onChange={chooseSeries}
          />
          <PaperSelect
            label="Level"
            value={activeLevel}
            options={levels}
            format={(value) => (value === "as" ? "AS Level" : "A Level")}
            onChange={(value) => chooseLevel(value as Level)}
          />
          <PaperSelect
            label="Paper code"
            value={selectedPaper?.id ?? ""}
            options={matchingPapers.map((paper) => paper.id)}
            format={(id) => {
              const paper = matchingPapers.find((entry) => entry.id === id);
              return paper ? paperCode(paper) : "Select a paper";
            }}
            onChange={choosePaperId}
          />
        </div>

        {selectedPaper ? (
          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{selectedPaper.title}</p>
                {activeDraftPaperId === selectedPaper.id ? (
                  <UiBadge variant="secondary" className="border-primary/40 text-primary text-[10px] uppercase font-bold tracking-wider">
                    In-Progress ({activeDraftAnswersCount} answered)
                  </UiBadge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPaper.questionCount} questions
                {hasCompleteAnswerKey(selectedPaper)
                  ? " · Complete mark scheme included"
                  : " · Incomplete mark scheme — ask an administrator to re-upload it"}
              </p>
            </div>
            <Button
              size="lg"
              disabled={busy || !hasCompleteAnswerKey(selectedPaper)}
              onClick={() => onStart(selectedPaper)}
              className="min-w-44"
            >
              {busy && busyPaperId === selectedPaper.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : activeDraftPaperId === selectedPaper.id ? (
                <>
                  <Play className="mr-1.5 h-4 w-4 fill-current" />
                  Resume in-progress exam
                </>
              ) : (
                "Load question paper"
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No paper is available for this combination. Choose another session or level.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PaperSelect<T extends string>({
  label,
  value,
  options,
  format = (option) => option,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  format?: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="h-12 w-full rounded-xl border-2 border-foreground/80 bg-background font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {format(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Groups the flat paper list into Year → Series buckets for the student
 * picker. Papers uploaded before the exam_year/exam_series columns existed
 * have neither set — those fall into an "Unsorted" bucket at the end
 * rather than being hidden, so nothing an administrator already uploaded
 * disappears.
 */
function groupPapersByYearAndSeries(papers: McqPaperSummary[]) {
  const byYear = new Map<string, McqPaperSummary[]>();
  for (const paper of papers) {
    const key = paper.examYear ? String(paper.examYear) : "Unsorted";
    const list = byYear.get(key);
    if (list) list.push(paper);
    else byYear.set(key, [paper]);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => {
    if (a === "Unsorted") return 1;
    if (b === "Unsorted") return -1;
    return Number(b) - Number(a);
  });

  return years.map((year) => {
    const papersForYear = byYear.get(year)!;
    const bySeries = new Map<string, McqPaperSummary[]>();
    for (const paper of papersForYear) {
      const key = paper.examSeries ?? "Unsorted";
      const list = bySeries.get(key);
      if (list) list.push(paper);
      else bySeries.set(key, [paper]);
    }

    const seriesKeys = Array.from(bySeries.keys()).sort((a, b) => {
      if (a === "Unsorted") return 1;
      if (b === "Unsorted") return -1;
      const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
      const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return {
      year,
      seriesGroups: seriesKeys.map((series) => ({
        series,
        papers: bySeries.get(series)!,
      })),
    };
  });
}

function parseAnswerKeyFromText(text: string): Record<number, Letter> {
  const re = /(\d{1,3})\s+([ABCD])\s+\d+/g;
  let m: RegExpExecArray | null;
  let expected = 1;
  const out: Record<number, Letter> = {};
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n === expected) {
      out[n] = m[2] as Letter;
      expected++;
    }
  }
  return out;
}
