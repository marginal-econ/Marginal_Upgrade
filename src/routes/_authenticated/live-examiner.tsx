import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Clock,
  Copy,
  GraduationCap,
  ImagePlus,
  Loader2,
  LockKeyhole,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { LiveExaminerEditor } from "@/components/app/live-examiner-editor";
import {
  LiveExaminerHistoryPanel,
  type LiveExaminerSessionSummary,
} from "@/components/app/live-examiner-history";
import { LiveExaminerPanel, type AutosaveState } from "@/components/app/live-examiner-panel";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import {
  MarkSchemeScreenshots,
  type MarkSchemeImage,
} from "@/components/app/mark-scheme-screenshot";
import { GradingProgress } from "@/components/app/grading-progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLiveExaminerCheck } from "@/hooks/use-live-examiner-check";
import { listApprovedEssayQuestions, listBankTopics } from "@/lib/bank.functions";
import { generateEssayQuestionAI, generateModelEssay } from "@/lib/essay.functions";
import type { GeneratedEssay } from "@/lib/essay/generator.server";
import { describeDiagramImage, listDiagramLibrary } from "@/lib/diagrams.functions";
import { checkQuestionGrounding, gradeEssaySubmission } from "@/lib/grading.functions";
import {
  getLiveExaminerSession,
  getTodayLiveExaminerSession,
  getMaxOutSuggestions,
  prepareLiveExaminerContext,
  saveLiveExaminerSession,
  type MaxOutSuggestion,
  type MaxOutResponse,
} from "@/lib/live-examiner.functions";
import { isVaquitavoid } from "@/lib/auth-admin";
import { getMe } from "@/lib/account.functions";
import { topicsFor } from "@/lib/diagrams/catalog";
import { isDailyLimitError, DEFAULT_LIVE_EXAMINER_DURATION_MINUTES } from "@/lib/usage-limits";
import type { Grading } from "@/lib/examiner/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/live-examiner")({
  head: () => ({
    meta: [
      { title: "Live Examiner — Cambridge 9708 Economics" },
      {
        name: "description",
        content:
          "Write your Cambridge 9708 Economics answer and get instant, syllabus-grounded feedback as you type — grammar, clarity, accuracy, analysis, application, evaluation, and terminology, with inline highlights and clear explanations.",
      },
      { property: "og:title", content: "Live Examiner — Cambridge 9708 Economics" },
      {
        property: "og:description",
        content:
          "Grammarly-style live feedback for Cambridge Economics essays, grounded in the syllabus.",
      },
    ],
  }),
  component: LiveExaminerPage,
});

const MARKS = [8, 12, 20];
const AUTOSAVE_DEBOUNCE_MS = 4000;

type AttachedDiagram = { id: string; label: string; tag: string };
const DIAGRAM_TAG_RE = /\[DIAGRAM:[^\]]*\]/g;
const DIAGRAM_TITLE_RE = /\[DIAGRAM:\s*([^|]+?)\s*\|/;

/** Splits a saved (possibly multi-tag) diagram_tag string back into
 *  individual attached-diagram entries when resuming a session, so each one
 *  gets its own removable badge instead of one opaque blob. */
function parseDiagramTags(raw: string): AttachedDiagram[] {
  const matches = raw.match(DIAGRAM_TAG_RE) ?? [];
  return matches.map((tag) => {
    const titleMatch = tag.match(DIAGRAM_TITLE_RE);
    return {
      id: crypto.randomUUID(),
      label: titleMatch ? titleMatch[1].trim() : "Attached diagram (resumed)",
      tag,
    };
  });
}

function combineDiagramTags(diagrams: AttachedDiagram[]): string | undefined {
  return diagrams.length > 0 ? diagrams.map((d) => d.tag).join("\n\n") : undefined;
}

function LiveExaminerPage() {
  const [level, setLevel] = useState<"as" | "a2">("as");
  const [topic, setTopic] = useState("Government microeconomic intervention");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState(12);
  const [questionSource, setQuestionSource] = useState<"type" | "ai" | "bank">("type");
  const [essayText, setEssayText] = useState("");
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [started, setStarted] = useState(false);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [zenMode, setZenMode] = useState(false);
  // Set when the one-session-per-day limit blocks a start; shown on the setup screen.
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  // --- Diagram attach: a photo or a library pick becomes a [DIAGRAM: ...]
  // tag, same format the full grader and handwriting OCR already use. A
  // student can attach more than one (e.g. a supply/demand diagram AND a
  // PPC diagram) — every attached tag is appended to what gets sent for
  // live feedback and for grading, but never shown inside the essay text
  // box itself. ---------------------------------------------------------
  const [diagrams, setDiagrams] = useState<AttachedDiagram[]>([]);
  const [diagramDialogOpen, setDiagramDialogOpen] = useState(false);
  const diagramFileRef = useRef<HTMLInputElement>(null);

  // --- Mark scheme screenshot: pasted straight in, sent to the examiner
  // as an image (vision) alongside the retrieved text context, for both
  // the live "Grade now" pass and the full /grade page. Ephemeral —
  // not persisted with the autosaved session, only used for the next grade.
  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);

  const describeDiagram = useServerFn(describeDiagramImage);
  const describeDiagramMutation = useMutation({
    mutationFn: (image: string) => describeDiagram({ data: { image } }),
    onSuccess: (result) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: "Attached photo", tag: result.tag },
      ]);
      toast.success("Diagram read and ready — it'll be considered in your feedback.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchDiagramLibrary = useServerFn(listDiagramLibrary);
  const diagramLibraryQuery = useQuery({
    queryKey: ["live-examiner-diagram-library"],
    queryFn: () => fetchDiagramLibrary(),
    enabled: diagramDialogOpen,
    staleTime: 10 * 60_000,
  });

  function handleDiagramFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      describeDiagramMutation.mutate(dataUrl);
    };
    reader.onerror = () => toast.error("Couldn't read that photo — try again.");
    reader.readAsDataURL(file);
  }

  function applyLibraryDiagram(id: string) {
    const entry = diagramLibraryQuery.data?.find((item) => item.id === id);
    if (!entry) return;
    const curves = entry.curveLabels.filter(Boolean).join(", ") || "not specified";
    const tag =
      `[DIAGRAM: ${entry.title} | axes: ${entry.yLabel} (y) / ${entry.xLabel} (x) | ` +
      `curves: ${curves} | labels: as per the standard ${entry.title} diagram | ` +
      `accuracy: reference diagram selected from the diagram library by the student — verify it is correctly applied to their written argument]`;
    setDiagrams((current) => [...current, { id: crypto.randomUUID(), label: entry.title, tag }]);
  }

  function removeDiagram(id: string) {
    setDiagrams((current) => current.filter((d) => d.id !== id));
  }

  function clearDiagrams() {
    setDiagrams([]);
  }

  // --- Restart exam: wipes the current draft for this question and gives
  // the student a blank sheet to write the full answer again, without
  // leaving the question/level/mark setup behind. ---------------------
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // --- Grade now: the same full examiner pipeline the /grade page uses,
  // called right from here so a student never has to leave the editor to
  // get a real mark. --------------------------------------------------
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [modelAnswerOpen, setModelAnswerOpen] = useState(false);
  const gradeNow = useServerFn(gradeEssaySubmission);
  const gradeMutation = useMutation({
    mutationFn: () =>
      gradeNow({
        data: {
          question,
          essayText,
          maxMark,
          diagramReference: combineDiagramTags(diagrams),
          markSchemeImageDataUrls:
            markSchemeImages.length > 0 ? markSchemeImages.map((img) => img.dataUrl) : undefined,
        },
      }),
    onSuccess: (data) => {
      setRevealedHints(0);
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleGradeNow() {
    const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
    if (words < 20) {
      toast.error("Write at least a short paragraph before grading.");
      return;
    }
    setGradeDialogOpen(true);
    gradeMutation.mutate();
    maxOutMutation.reset();
  }

  // --- Score Maximizer & Perfection Blueprint: on-demand or post-grade
  // advice showing students exactly how to structure, write, and select
  // arguments to reach a perfect score (full marks). -----------------
  const [scoreMaximizerOpen, setScoreMaximizerOpen] = useState(false);
  const maxOutFn = useServerFn(getMaxOutSuggestions);
  const maxOutMutation = useMutation({
    mutationFn: (
      overrideInput?: {
        question: string;
        level: "as" | "a2";
        maxMark: number;
        essayText: string;
        contextBlock: string;
        totalMark: number;
        band: string;
        weaknesses: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        missingElements: any;
        actionableFeedback: string[];
      } | void,
    ) => {
      const grading = gradeMutation.data?.grading;
      const payload = overrideInput ?? {
        question,
        level,
        maxMark,
        essayText,
        contextBlock,
        totalMark: grading?.total_mark ?? Math.round(maxMark * 0.5),
        band: grading?.band ?? "Draft Attempt",
        weaknesses: grading?.weaknesses ?? [],
        missingElements: grading?.missing_elements ?? {},
        actionableFeedback: grading?.actionable_feedback ?? [],
      };
      return maxOutFn({ data: payload });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleOpenScoreMaximizer() {
    const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
    if (words < 15) {
      toast.error(
        "Write at least a short paragraph before generating score maximization blueprints.",
      );
      return;
    }
    setScoreMaximizerOpen(true);
    const grading = gradeMutation.data?.grading;
    maxOutMutation.mutate({
      question,
      level,
      maxMark,
      essayText,
      contextBlock,
      totalMark: grading?.total_mark ?? Math.round(maxMark * 0.5),
      band: grading?.band ?? "Draft Attempt",
      weaknesses: grading?.weaknesses ?? [],
      missingElements: grading?.missing_elements ?? {},
      actionableFeedback: grading?.actionable_feedback ?? [],
    });
  }

  function handleInsertSentence(text: string) {
    setEssayText((current) => {
      if (!current.trim()) return text;
      return `${current}\n\n${text}`;
    });
    toast.success("Inserted into essay draft.");
  }

  useEffect(() => {
    const grading = gradeMutation.data?.grading;
    if (!grading || grading.total_mark >= grading.max_mark) return;
    maxOutMutation.mutate();
    // A completed grade is the only event that requests fresh hints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeMutation.data]);

  const generateFullAnswer = useServerFn(generateModelEssay);
  const fullAnswerMutation = useMutation({
    mutationFn: () => generateFullAnswer({ data: { level, topic, question, maxMark } }),
    onSuccess: () => setModelAnswerOpen(true),
    onError: (error: Error) => toast.error(error.message),
  });

  const topics = topicsFor("Microeconomics").concat(topicsFor("Macroeconomics"));

  // --- Question source: type / AI-generated / question bank (same pattern
  // as the essay generator's question picker) --------------------------
  const generateQuestion = useServerFn(generateEssayQuestionAI);
  const aiQuestionMutation = useMutation({
    mutationFn: () => generateQuestion({ data: { level, topic } }),
    onSuccess: (result) => {
      setQuestion(result.question);
      setTopic(result.topic);
      setMaxMark(result.maxMark);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchBankTopics = useServerFn(listBankTopics);
  const bankTopics = useQuery({
    queryKey: ["live-examiner-bank-topics", level],
    queryFn: () => fetchBankTopics({ data: { kind: "essay", level } }),
    enabled: questionSource === "bank",
  });

  const [bankTopicFilter, setBankTopicFilter] = useState<string>("__any__");
  const fetchBankQuestions = useServerFn(listApprovedEssayQuestions);
  const bankQuestions = useQuery({
    queryKey: ["live-examiner-bank-questions", level, bankTopicFilter],
    queryFn: () =>
      fetchBankQuestions({
        data: { level, topic: bankTopicFilter === "__any__" ? undefined : bankTopicFilter },
      }),
    enabled: questionSource === "bank",
  });

  // --- Syllabus grounding — fetched ONCE per question, reused by every
  // subsequent live check call so nothing re-embeds on every keystroke ---
  const prepareContext = useServerFn(prepareLiveExaminerContext);
  const checkGrounding = useServerFn(checkQuestionGrounding);

  const groundingQuery = useQuery({
    queryKey: ["live-examiner-grounding", question.trim()],
    queryFn: () => checkGrounding({ data: { question: question.trim() } }),
    enabled: !started && question.trim().length >= 15,
    staleTime: 5 * 60_000,
  });

  const contextMutation = useMutation({
    mutationFn: (variables?: { level?: "as" | "a2"; topic?: string; question?: string }) =>
      prepareContext({
        data: {
          level: variables?.level ?? level,
          topic: variables?.topic ?? topic,
          question: variables?.question ?? question,
        },
      }),
    onError: (error: Error) => {
      toast.error(error.message);
      // Today's one session is already used on another question — send the
      // student back to the setup screen instead of leaving a dead editor.
      if (isDailyLimitError(error)) {
        setStarted(false);
        setLimitNotice(error.message);
      }
    },
  });

  // --- Authoritative check: today's claimed session ledger (prevents restarting new sessions) ---
  const fetchTodaySession = useServerFn(getTodayLiveExaminerSession);
  const todaySessionQuery = useQuery({
    queryKey: ["live-examiner-today-session"],
    queryFn: () => fetchTodaySession(),
    staleTime: 30_000,
  });

  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
  });

  const isAdmin = Boolean(
    todaySessionQuery.data?.isAdmin ||
      meQuery.data?.role === "admin" ||
      (meQuery.data?.userId && isVaquitavoid({ userId: meQuery.data.userId }))
  );

  const DURATION_SECONDS = DEFAULT_LIVE_EXAMINER_DURATION_MINUTES * 60;
  const isTimeExceeded =
    Boolean(todaySessionQuery.data?.sessionStartedAt) &&
    (Date.now() - (todaySessionQuery.data?.sessionStartedAt ?? 0)) >= DURATION_SECONDS * 1000;

  const isTodaySessionExpired =
    !isAdmin &&
    (Boolean((todaySessionQuery.data as any)?.isExpired) || isTimeExceeded);

  const hasActiveDailySession =
    !isAdmin && !isTodaySessionExpired && Boolean(todaySessionQuery.data?.hasActiveDailySession);

  // Auto-resume active daily session when page loads (only when not expired)
  useEffect(() => {
    const today = todaySessionQuery.data;
    if (today?.hasActiveDailySession && !started && !isTodaySessionExpired) {
      const targetLevel = (today.session?.level as "as" | "a2") ?? level;
      const targetTopic = today.session?.topic ?? topic;
      const targetQuestion = today.session?.question ?? today.claimedQuestion ?? question;

      if (today.session) {
        setLevel(targetLevel);
        setTopic(targetTopic);
        setQuestion(targetQuestion);
        setMaxMark(today.session.max_mark);
        if (today.session.essay_text) setEssayText(today.session.essay_text);
        if (today.session.diagram_tag) {
          setDiagrams(parseDiagramTags(today.session.diagram_tag));
        }
      } else if (today.claimedQuestion) {
        setQuestion(today.claimedQuestion);
      }
      setStarted(true);
      if (targetQuestion && targetQuestion.trim().length >= 5) {
        contextMutation.mutate({
          level: targetLevel,
          topic: targetTopic,
          question: targetQuestion,
        });
      }
    }
  }, [todaySessionQuery.data, started, isTodaySessionExpired]);

  // --- Resume an existing draft for this question, if one exists --------
  const fetchSession = useServerFn(getLiveExaminerSession);
  const sessionQuery = useQuery({
    queryKey: ["live-examiner-session", question],
    queryFn: () => fetchSession({ data: { question } }),
    enabled: started && question.length > 0,
  });

  useEffect(() => {
    const session = sessionQuery.data?.session;
    if (session && session.essay_text) setEssayText(session.essay_text);
    if (session && session.diagram_tag) {
      setDiagrams(parseDiagramTags(session.diagram_tag));
    }
  }, [sessionQuery.data]);

  function handleStart() {
    if (question.trim().length < 5) {
      toast.error("Enter or pick a question first.");
      return;
    }
    setLimitNotice(null);
    setStarted(true);
    contextMutation.mutate();
  }

  /** Resume a past essay from the history panel — same as picking that
   *  question and starting, and the existing session-resume effect below
   *  fills in the saved draft text/diagram once the question matches. */
  function resumeSession(entry: LiveExaminerSessionSummary) {
    setLevel(entry.level);
    setTopic(entry.topic);
    setQuestion(entry.question);
    setMaxMark(entry.maxMark);
    setLimitNotice(null);
    setStarted(true);
    contextMutation.mutate();
  }

  const contextBlock = contextMutation.data?.contextBlock ?? "";
  const sourceCount = contextMutation.data?.sourceCount ?? 0;
  const anchorsUsed = contextMutation.data?.anchorsUsed ?? 0;

  // The attached diagram tags ride along with the essay text for every
  // live check, exactly like they do for full grading — so a referenced
  // diagram gets credited/checked instead of the checker only ever seeing
  // the written prose.
  const combinedDiagramTag = combineDiagramTags(diagrams);
  const textForCheck = combinedDiagramTag ? `${essayText}\n\n${combinedDiagramTag}` : essayText;

  const authoritativeStartedAt =
    todaySessionQuery.data?.sessionStartedAt ??
    (sessionQuery.data?.session?.created_at
      ? new Date(sessionQuery.data.session.created_at).getTime()
      : null);

  const {
    issues,
    classifications,
    history,
    checking,
    pending,
    error: checkError,
    predictedMark,
    lastUpdatedAt,
    challenges,
    fetchingChallenges,
    challengeOverview,
    requestChallenges,
    dismissChallenge,
    markChallengeAddressed,
    acceptIssue,
    dismissIssue,
    rescan,
    clearAll,
    durationMinutes,
    remainingSeconds,
    aiCoachingExpired,
    formattedTimeRemaining,
    sessionUsage,
  } = useLiveExaminerCheck({
    text: textForCheck,
    question,
    level,
    maxMark,
    contextBlock,
    enabled: started && contextMutation.isSuccess && !isTodaySessionExpired,
    sessionStartedAt: authoritativeStartedAt,
    isAdmin,
  });

  // For students, when time limit is reached, locked out of live examiner itself:
  // only able to see their essay, with a small notification on top.
  const isLockedOut =
    !isAdmin && (isTodaySessionExpired || (started && aiCoachingExpired));

  // --- Autosave, debounced, independent of the AI check debounce --------
  // Flawless here means: never silently stop trying. A failed save keeps
  // retrying with backoff on its own — it doesn't wait for the next
  // keystroke to get another chance — and the tab warns before closing if
  // anything typed hasn't made it to the server yet.
  const saveSession = useServerFn(saveLiveExaminerSession);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTextRef = useRef("");
  const retryCountRef = useRef(0);
  const essayTextRef = useRef(essayText);
  const savingRef = useRef(false);
  essayTextRef.current = essayText;

  const doSave = useCallback(
    (textToSave: string) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setAutosave("saving");
      // Cap what's sent, newest-first — the server itself rejects payloads
      // over 500 entries, and a long session's full issue history can grow
      // past that. Without this cap, autosave would fail validation forever
      // once a session crossed the limit, retrying the same oversized
      // payload on an endless loop instead of ever succeeding again.
      const boundedHistory = [...history]
        .sort((a, b) => (b.resolvedAt ?? b.firstSeenAt) - (a.resolvedAt ?? a.firstSeenAt))
        .slice(0, 400);
      saveSession({
        data: {
          level,
          topic,
          question,
          maxMark,
          essayText: textToSave,
          issuesHistory: boundedHistory,
          diagramTag: combinedDiagramTag,
        },
      })
        .then(() => {
          savingRef.current = false;
          lastSavedTextRef.current = textToSave;
          retryCountRef.current = 0;
          setAutosave("saved");
          // If more was typed while this save was in flight, it's already
          // covered by the text-change effect below re-firing on the newer
          // value — nothing further to do here.
        })
        .catch(() => {
          savingRef.current = false;
          setAutosave("error");
          // Keep retrying on its own — capped backoff, 5s/10s/20s/30s/30s…
          // — rather than leaving unsaved work stuck until the next edit.
          const delay = Math.min(30_000, 5_000 * 2 ** retryCountRef.current);
          retryCountRef.current += 1;
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            if (essayTextRef.current !== lastSavedTextRef.current) doSave(essayTextRef.current);
          }, delay);
        });
    },
    [saveSession, level, topic, question, maxMark, history, combinedDiagramTag],
  );

  useEffect(() => {
    if (!started || essayText.trim().length < 5 || essayText === lastSavedTextRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current); // fresh edit supersedes a pending retry
    autosaveTimer.current = setTimeout(() => doSave(essayText), AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [essayText, started, doSave]);

  // When time limit locks out the session, immediately save any pending draft text
  useEffect(() => {
    if (isLockedOut && essayText.trim() && essayText !== lastSavedTextRef.current) {
      doSave(essayText);
    }
  }, [isLockedOut, essayText, doSave]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Warn before leaving the tab with anything unsaved — a pending debounce,
  // an in-flight save, or a save that's currently in its retry backoff.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      const unsaved = started && essayTextRef.current !== lastSavedTextRef.current;
      if (!unsaved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [started]);

  const wordCount = essayText.trim().length === 0 ? 0 : essayText.trim().split(/\s+/).length;

  function handleRestart() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setEssayText("");
    clearDiagrams();
    setMarkSchemeImages([]);
    clearAll();
    setAutosave("idle");
    lastSavedTextRef.current = "";
    retryCountRef.current = 0;
    // Wipe the saved draft server-side too, so a refresh doesn't resurrect
    // the old attempt via session resume.
    saveSession({
      data: {
        level,
        topic,
        question,
        maxMark,
        essayText: "",
        issuesHistory: [],
        diagramTag: undefined,
      },
    }).catch(() => {
      /* best-effort — the next real edit will autosave and retry as usual */
    });
    setRestartDialogOpen(false);
    toast.success("Cleared — write the full answer again from scratch.");
  }

  if (todaySessionQuery.isLoading && !started) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLockedOut) {
    const displayEssayText =
      essayText.trim() || todaySessionQuery.data?.session?.essay_text || "";
    const displayQuestion =
      question.trim() ||
      todaySessionQuery.data?.session?.question ||
      todaySessionQuery.data?.claimedQuestion ||
      "";
    const displayLevel =
      (todaySessionQuery.data?.session?.level as "as" | "a2") ?? level;
    const displayTopic = todaySessionQuery.data?.session?.topic ?? topic;
    const displayMaxMark =
      todaySessionQuery.data?.session?.max_mark ?? maxMark;

    return (
      <div className="mx-auto max-w-3xl p-5 md:p-8 space-y-5">
        {/* One small notification on top saying exceed limit. Nothing else. */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Examiner
          </span>
          <span className="text-xs text-muted-foreground bg-muted border border-border/60 px-2.5 py-0.5 rounded-full font-medium">
            Exceeded limit
          </span>
        </div>

        {/* Only able to see their essay. Nothing else. */}
        <div className="rounded-xl border border-border/70 bg-card p-6 md:p-8 shadow-sm space-y-6">
          {displayQuestion ? (
            <div className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {displayLevel === "a2" ? "A Level" : "AS Level"} · [{displayMaxMark} Marks]
                </span>
                {displayTopic ? (
                  <span className="text-xs text-muted-foreground truncate">· {displayTopic}</span>
                ) : null}
              </div>
              <p className="text-sm md:text-base font-medium text-foreground leading-relaxed">
                {displayQuestion}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Written Answer
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {displayEssayText.trim() ? displayEssayText.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans text-foreground/90 select-text p-5 rounded-lg bg-muted/20 border border-border/40 min-h-[300px]">
              {displayEssayText.trim() || "(No written answer was submitted for this session.)"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Live Examiner"
        description="Write your answer and get instant, syllabus-grounded feedback as you go — grammar, clarity, economics accuracy, analysis, application, evaluation and terminology."
      />

      {!started ? (
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          {hasActiveDailySession && todaySessionQuery.data ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 font-semibold text-primary">
                <LockKeyhole className="size-4" />
                <span>Today's Live Examiner Session Active</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your daily Live Examiner session is active for today's question:{" "}
                <strong className="text-foreground">
                  "{todaySessionQuery.data.claimedQuestion}"
                </strong>
                . Regular plans include 1 question session per day. You can continue writing with unlimited checks on this question.
              </p>
              <Button
                type="button"
                onClick={() => {
                  const today = todaySessionQuery.data;
                  if (today.session) {
                    setLevel(today.session.level as "as" | "a2");
                    setTopic(today.session.topic);
                    setQuestion(today.session.question);
                    setMaxMark(today.session.max_mark);
                    if (today.session.essay_text) setEssayText(today.session.essay_text);
                    if (today.session.diagram_tag) {
                      setDiagrams(parseDiagramTags(today.session.diagram_tag));
                    }
                  } else if (today.claimedQuestion) {
                    setQuestion(today.claimedQuestion);
                  }
                  setStarted(true);
                  contextMutation.mutate();
                }}
                className="gap-2"
              >
                <span>Continue your essay</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : limitNotice ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {limitNotice}
            </div>
          ) : null}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Level</Label>
                <Tabs value={level} onValueChange={(value) => setLevel(value as "as" | "a2")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="as" className="flex-1">
                      AS Level
                    </TabsTrigger>
                    <TabsTrigger value="a2" className="flex-1">
                      A Level
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="le-topic">Topic</Label>
                <Input
                  id="le-topic"
                  list="live-examiner-topics"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. Market failure and externalities"
                />
                <datalist id="live-examiner-topics">
                  {topics.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Question source</Label>
                <Tabs
                  value={questionSource}
                  onValueChange={(value) => setQuestionSource(value as "type" | "ai" | "bank")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="type" className="flex-1">
                      Type my own
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1">
                      AI-generated
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="flex-1">
                      Question bank
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {questionSource === "ai" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={aiQuestionMutation.isPending}
                  onClick={() => aiQuestionMutation.mutate()}
                >
                  {aiQuestionMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Writing a unique question…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Generate a unique question on this topic
                    </>
                  )}
                </Button>
              ) : null}

              {questionSource === "bank" ? (
                <div className="space-y-2">
                  <Select value={bankTopicFilter} onValueChange={setBankTopicFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any topic</SelectItem>
                      {(bankTopics.data ?? []).map((entry) => (
                        <SelectItem key={entry.topic} value={entry.topic}>
                          {entry.topic} ({entry.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={question}
                    onValueChange={(value) => {
                      const picked = (bankQuestions.data ?? []).find(
                        (q) => q.question_text === value,
                      );
                      setQuestion(value);
                      if (picked) {
                        setTopic(picked.topic);
                        setMaxMark(picked.max_mark);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a real past-paper question" />
                    </SelectTrigger>
                    <SelectContent>
                      {(bankQuestions.data ?? []).map((entry) => (
                        <SelectItem key={entry.id} value={entry.question_text}>
                          {entry.question_text.slice(0, 70)}
                          {entry.question_text.length > 70 ? "…" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="le-question">Question</Label>
                  <Textarea
                    id="le-question"
                    rows={3}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Paste or type the exact exam question…"
                  />
                  {question.trim().length >= 15 ? (
                    groundingQuery.isLoading ? (
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
                        <Loader2 className="size-3 animate-spin" />
                        Checking Knowledge Base for official Cambridge mark schemes...
                      </p>
                    ) : groundingQuery.data?.grounded ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>
                          Knowledge Base Grounded: Verified against {groundingQuery.data.topMatchTitle} ({Math.round((groundingQuery.data.topSimilarity ?? 0) * 100)}% match)
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-400" />
                          <div className="space-y-0.5">
                            <span className="font-semibold">No specific mark scheme found in Knowledge Base</span>
                            <p className="text-amber-200/80 leading-normal">
                              Live keystroke suggestions and estimated marks will evaluate against standard Cambridge AO rubrics. Attach a mark scheme screenshot during the session for question-specific grounding.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <Label>Marks available</Label>
                <div className="flex gap-2">
                  {MARKS.map((mark) => (
                    <Button
                      key={mark}
                      type="button"
                      size="sm"
                      variant={maxMark === mark ? "default" : "outline"}
                      onClick={() => setMaxMark(mark)}
                    >
                      {mark} marks
                    </Button>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStart}>
                <PenLine className="size-4" /> Start writing
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Suggestions are grounded only in your syllabus, coursebook, mark scheme and examiner
                report material — nothing is invented.
              </p>
            </div>

            <LiveExaminerHistoryPanel onResume={resumeSession} />
          </div>
        </div>
      ) : contextMutation.isPending || !contextMutation.isSuccess ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preparing syllabus context for this question…
          </p>
        </div>
      ) : (
        <div className={cn("grid gap-6 transition-all duration-300", zenMode ? "grid-cols-1 max-w-5xl mx-auto" : "grid-cols-1 lg:grid-cols-[1fr_360px]")}>
          <section className="min-w-0 space-y-5 p-4 md:p-6 lg:p-8">
            {/* Top Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-muted/40">
                  {level === "a2" ? "A Level" : "AS Level"} · {maxMark} Marks
                </Badge>
                {topic ? (
                  <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[220px]">
                    {topic}
                  </span>
                ) : null}
              </div>

              {/* Running Score Pill, Word Count, and Timer */}
              <div className="flex items-center gap-3">
                {predictedMark ? (
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all duration-300 shadow-sm">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Est. {predictedMark.total_mark} / {maxMark} marks</span>
                    <span className="text-[10px] opacity-75 font-normal hidden md:inline">
                      (AO1: {predictedMark.ao_breakdown.knowledge.awarded} · AO2: {predictedMark.ao_breakdown.analysis.awarded} · AO3: {predictedMark.ao_breakdown.evaluation.awarded})
                    </span>
                  </div>
                ) : null}

                <span className="text-xs font-mono text-muted-foreground">
                  {wordCount} words
                </span>

                <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Clock className="size-3.5" />
                  <span>{isAdmin ? "Admin (Unlimited)" : formattedTimeRemaining}</span>
                </div>

                {autosave === "saving" ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                  </span>
                ) : autosave === "saved" ? (
                  <span className="text-[11px] text-emerald-600/80 flex items-center gap-1" title="Autosaved">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={handleGradeNow}
                >
                  <CheckCircle2 className="size-3.5" /> Grade now
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setDiagramDialogOpen(true)}
                >
                  <ImagePlus className="size-3.5" />
                  {diagrams.length > 0 ? `Diagram (${diagrams.length})` : "Diagram"}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      <ClipboardPaste className="size-3.5" />
                      {markSchemeImages.length > 0 ? `MS (${markSchemeImages.length})` : "Mark Scheme"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 space-y-2" align="end">
                    <p className="text-xs text-muted-foreground">
                      Paste a mark scheme screenshot to evaluate against official marking criteria.
                    </p>
                    <MarkSchemeScreenshots
                      images={markSchemeImages}
                      onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
                      onRemove={(id) => setMarkSchemeImages((current) => current.filter((img) => img.id !== id))}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-medium"
                  onClick={handleOpenScoreMaximizer}
                  title="Open Score Maximizer guidance"
                >
                  <Sparkles className="size-3.5 text-amber-500" /> Maximizer
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={zenMode ? "secondary" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setZenMode((prev) => !prev)}
                  title="Toggle Zen / Focus Mode"
                >
                  {zenMode ? "Panel" : "Focus"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setRestartDialogOpen(true)}
                  title="Clear & restart exam"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Official Cambridge Examination Answer Script Paper */}
            <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-xl backdrop-blur-sm transition-all duration-200">
              {/* Cambridge Official Script Header Banner */}
              <div className="border-b border-border/70 bg-muted/30 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          Cambridge Assessment International Education
                        </span>
                        <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1.5 border-primary/30 text-primary bg-primary/5">
                          9708 SYLLABUS
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground tracking-tight">
                        Economics {level === "a2" ? "A Level · Paper 4" : "AS Level · Paper 2"} Digital Answer Script
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-muted-foreground font-mono">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Script Active</span>
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      Max Tariff: [{maxMark} Marks]
                    </Badge>
                  </div>
                </div>

                {/* Cambridge Question Presentation Box */}
                <div className="mt-3.5 rounded-xl border border-border/80 bg-background/90 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary tracking-wide">
                        QUESTION 1 [{maxMark}]
                      </span>
                      {topic ? (
                        <span className="text-xs text-muted-foreground font-medium truncate max-w-sm">
                          · {topic}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground italic hidden sm:inline">
                      Continuous prose response
                    </span>
                  </div>
                  <p className="text-[15px] md:text-[16px] font-medium text-foreground leading-relaxed">
                    {question}
                  </p>
                </div>

                {/* Economics Quick Insert Notation Strip */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                      Quick Notation:
                    </span>
                    {[
                      { label: "PED formula", insert: "PED = (%ΔQd / %ΔP)" },
                      { label: "YED formula", insert: "YED = (%ΔQd / %ΔY)" },
                      { label: "PES formula", insert: "PES = (%ΔQs / %ΔP)" },
                      { label: "AD equation", insert: "AD = C + I + G + (X - M)" },
                      { label: "LRAS / SRAS", insert: "SRAS and LRAS curves" },
                      { label: "PPC", insert: "Production Possibility Curve (PPC)" },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handleInsertSentence(btn.insert)}
                        className="rounded border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                        title={`Insert ${btn.insert}`}
                      >
                        + {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Answer Script Body with Left Margin Gutter */}
              <div className="relative flex min-h-[64vh]">
                {/* Left Margin Ruling: For Examiner's Use */}
                <div className="hidden sm:flex w-12 shrink-0 flex-col items-center border-r border-border/60 bg-muted/10 py-6 select-none">
                  <span className="[writing-mode:vertical-lr] rotate-180 text-[9px] font-bold tracking-widest text-muted-foreground/50 uppercase">
                    For Examiner's Use
                  </span>
                </div>

                {/* The Math-Locked Live Examiner Editor */}
                <div className="min-w-0 flex-1">
                  <LiveExaminerEditor
                    value={essayText}
                    onChange={setEssayText}
                    issues={issues}
                    classifications={classifications}
                    focusedIssueId={focusedIssueId}
                    onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
                    onDismiss={dismissIssue}
                    placeholder="Begin typing your examination response here in continuous prose… The Live Examiner evaluates your economic accuracy (AO1), causal mechanisms (AO2), and evaluative synthesis (AO3) with inline annotations."
                    className="min-h-[64vh]"
                  />
                </div>
              </div>

              {/* Official Answer Script Verification Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium">
                    Cambridge 9708 · Page 1 of 1
                  </span>
                  <span className="text-[11px] font-mono">
                    {wordCount} words {wordCount > 0 ? `(~${Math.max(1, Math.round(wordCount / 180))} min read)` : ""}
                  </span>
                  {wordCount < 150 ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      (Standard: 350–550 words)
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  {predictedMark ? (
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span>Cambridge Live Standard: {predictedMark.total_mark}/{maxMark} Marks</span>
                    </div>
                  ) : null}

                  {autosave === "saving" ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Saving…
                    </span>
                  ) : autosave === "saved" ? (
                    <span className="text-[11px] text-emerald-600/90 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="size-3" /> Autosaved
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {!zenMode ? (
            <aside className="min-w-0 p-4 md:p-5 border-t lg:border-t-0 lg:border-l border-border/60">
              <LiveExaminerPanel
                issues={issues}
                history={history}
                checking={checking}
                pending={pending}
                error={checkError}
                autosave={autosave}
                predictedMark={predictedMark}
                lastUpdatedAt={lastUpdatedAt}
                maxMark={maxMark}
                challenges={challenges}
                fetchingChallenges={fetchingChallenges}
                challengeOverview={challengeOverview}
                onRequestChallenges={requestChallenges}
                onDismissChallenge={dismissChallenge}
                onAddressChallenge={markChallengeAddressed}
                durationMinutes={durationMinutes}
                remainingSeconds={remainingSeconds}
                aiCoachingExpired={aiCoachingExpired}
                formattedTimeRemaining={formattedTimeRemaining}
                sessionUsage={sessionUsage}
                isAdmin={isAdmin}
                onFocusIssue={(id) => setFocusedIssueId(id)}
                gradedHelp={
                  gradeMutation.data &&
                  gradeMutation.data.grading.total_mark < gradeMutation.data.grading.max_mark ? (
                    <GradedHelpCard
                      grading={gradeMutation.data.grading as Grading}
                      suggestions={maxOutMutation.data?.suggestions ?? []}
                      headline={maxOutMutation.data?.headline}
                      loading={maxOutMutation.isPending}
                      error={maxOutMutation.isError}
                      revealed={revealedHints}
                      onReveal={() => setRevealedHints((count) => Math.min(3, count + 1))}
                      onRetry={() => maxOutMutation.mutate()}
                      generatingAnswer={fullAnswerMutation.isPending}
                      onShowAnswer={() => fullAnswerMutation.mutate()}
                    />
                  ) : gradeMutation.data ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                      <p className="font-semibold">Full marks achieved</p>
                      <p className="mt-0.5">
                        No hints needed — this answer has met the full standard.
                      </p>
                    </div>
                  ) : null
                }
                onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
                onDismiss={dismissIssue}
                onRescan={() => rescan(essayText)}
                onClearAll={clearAll}
              />
            </aside>
          ) : null}
        </div>
      )}

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart this exam attempt?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This clears your written draft, attached diagrams, and active suggestions so you can write the full response again from scratch.
              </span>
              {hasActiveDailySession ? (
                <span className="block rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                  Note: Your session timer continues running and today's session remains locked to this question. Restarting does not grant additional AI coaching time.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>Clear &amp; restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={diagramDialogOpen} onOpenChange={setDiagramDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach a diagram</DialogTitle>
            <DialogDescription>
              Photograph a hand-drawn diagram, or pick one from the library — either way it's
              considered alongside your writing, exactly like a diagram drawn on a scanned script.
              Attach as many as your answer refers to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {diagrams.length > 0 ? (
              <ul className="space-y-1.5">
                {diagrams.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      {d.label}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => removeDiagram(d.id)}
                      aria-label={`Remove ${d.label}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-1.5">
              <Label>Photo of your diagram</Label>
              <input
                ref={diagramFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleDiagramFile(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={describeDiagramMutation.isPending}
                onClick={() => diagramFileRef.current?.click()}
              >
                {describeDiagramMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Reading your diagram…
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4" /> Upload a photo
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Or pick from the diagram library</Label>
              <Select onValueChange={applyLibraryDiagram}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a diagram…" />
                </SelectTrigger>
                <SelectContent>
                  {(diagramLibraryQuery.data ?? []).map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title} ({entry.topic})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full" onClick={() => setDiagramDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Grade now</DialogTitle>
            <DialogDescription>
              A full examiner-standard mark for what you've written so far — your feedback and draft
              keep working after you close this.
            </DialogDescription>
          </DialogHeader>

          {gradeMutation.isPending ? (
            <GradingProgress
              active
              stages={[
                { label: "Reading question & rubric", weight: 1 },
                { label: "Marking AO1 · AO2 · AO3", weight: 4 },
                { label: "Independent audit pass", weight: 3 },
                { label: "Finalising report", weight: 1 },
              ]}
              totalMs={26_000}
            />
          ) : gradeMutation.data ? (
            <div className="space-y-4">
              <MarkBreakdown grading={gradeMutation.data.grading as Grading} />
              {gradeMutation.data.grading.total_mark < gradeMutation.data.grading.max_mark ? (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
                  <p className="text-sm text-amber-950 dark:text-amber-100">
                    Your three personalised hints are ready in the side panel.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
                    onClick={() => {
                      setGradeDialogOpen(false);
                      window.setTimeout(
                        () =>
                          document
                            .getElementById("live-examiner-hints")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        100,
                      );
                    }}
                  >
                    <Sparkles className="size-4" /> Open hints in sidebar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : gradeMutation.isError ? (
            <p className="text-sm text-destructive">
              {gradeMutation.error instanceof Error
                ? gradeMutation.error.message
                : "Couldn't grade that just now — try again."}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Score Maximizer & Perfection Blueprint Dialog */}
      <ScoreMaximizerDialog
        open={scoreMaximizerOpen}
        onOpenChange={setScoreMaximizerOpen}
        question={question}
        level={level}
        maxMark={maxMark}
        data={maxOutMutation.data}
        loading={maxOutMutation.isPending}
        error={maxOutMutation.isError}
        onRetry={handleOpenScoreMaximizer}
        onInsertText={handleInsertSentence}
        onShowModelAnswer={() => {
          setScoreMaximizerOpen(false);
          fullAnswerMutation.mutate();
        }}
      />

      <Dialog open={modelAnswerOpen} onOpenChange={setModelAnswerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete model answer</DialogTitle>
            <DialogDescription>
              Compare this only after attempting the score maximization hints. Focus on what the
              answer adds, links, and evaluates—not on memorising its wording.
            </DialogDescription>
          </DialogHeader>
          {fullAnswerMutation.data ? <ModelAnswer essay={fullAnswerMutation.data.essay} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5"
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** AO badge colour, reusing the same palette meaning elsewhere in the app:
 *  knowledge/ao1, analysis/ao2, evaluation/ao3, plus a neutral one for
 *  general structural suggestions that don't map to a single AO. */
function aoLabel(target: MaxOutSuggestion["target_ao"]): string {
  switch (target) {
    case "ao1":
      return "Knowledge (AO1)";
    case "ao2":
      return "Analysis (AO2)";
    case "ao3":
      return "Evaluation (AO3)";
    default:
      return "Essay Structure";
  }
}

function aoBadgeStyle(target: MaxOutSuggestion["target_ao"]): string {
  switch (target) {
    case "ao1":
      return "border-ao1/40 bg-ao1/10 text-ao1 font-semibold";
    case "ao2":
      return "border-ao2/40 bg-ao2/10 text-ao2 font-semibold";
    case "ao3":
      return "border-ao3/40 bg-ao3/10 text-ao3 font-semibold";
    default:
      return "border-primary/40 bg-primary/10 text-primary font-semibold";
  }
}

function ScoreMaximizerDialog({
  open,
  onOpenChange,
  question,
  level,
  maxMark,
  data,
  loading,
  error,
  onRetry,
  onInsertText,
  onShowModelAnswer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  data: MaxOutResponse | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onInsertText: (text: string) => void;
  onShowModelAnswer: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 font-semibold">
              <Sparkles className="mr-1 size-3.5" /> Score Maximizer & Perfection Blueprint
            </Badge>
            <Badge variant="outline">
              {level === "a2" ? "A Level" : "AS Level"} · {maxMark} Marks
            </Badge>
            <Badge
              variant="secondary"
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              Target: Full {maxMark}/{maxMark} (Band 1)
            </Badge>
          </div>
          <DialogTitle className="mt-2 text-xl font-bold">
            How to reach a perfect {maxMark}/{maxMark} score
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            Exam Question: {question}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <p className="font-semibold text-foreground">
              Analyzing your essay against Cambridge Level 5 criteria…
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Identifying missing causal chains, evaluative trade-offs, strategic argument options,
              and model phrasing.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-destructive">Could not generate suggestions right now.</p>
            <Button onClick={onRetry}>Try Again</Button>
          </div>
        ) : data ? (
          <div className="space-y-6 pt-2">
            {/* Headline & Overview Banner */}
            <div className="rounded-xl border border-amber-300/60 bg-linear-to-br from-amber-500/10 via-background to-card p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Examiner Blueprint Summary</h3>
                  <p className="text-xs font-medium leading-relaxed text-amber-900 dark:text-amber-200">
                    {data.headline}
                  </p>
                  {data.perfection_summary ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {data.perfection_summary}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Individual Upgrade Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Step-by-step Improvements ({data.suggestions.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Apply these to close the gap to full marks
                </span>
              </div>

              {data.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-border/90"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-foreground text-sm">{suggestion.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", aoBadgeStyle(suggestion.target_ao))}
                      >
                        {aoLabel(suggestion.target_ao)}
                      </Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px] font-semibold">
                        {suggestion.mark_uplift}
                      </Badge>
                    </div>
                  </div>

                  {/* Diagnostic */}
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {suggestion.suggestion}
                  </p>

                  {/* How To Write Checklist */}
                  {suggestion.how_to_write && suggestion.how_to_write.length > 0 ? (
                    <div className="mt-3.5 rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
                      <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-primary" /> How to write this:
                      </p>
                      <ol className="space-y-1.5 pl-1 text-xs text-muted-foreground">
                        {suggestion.how_to_write.map((step, sIdx) => (
                          <li
                            key={sIdx}
                            className="flex items-start gap-2 text-[11px] leading-relaxed"
                          >
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background border text-[9px] font-bold text-muted-foreground">
                              {sIdx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {/* Strategic Options */}
                  {suggestion.strategic_options && suggestion.strategic_options.length > 0 ? (
                    <div className="mt-3.5 space-y-2">
                      <p className="text-[11px] font-bold text-foreground">
                        Choose an argument perspective to write:
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {suggestion.strategic_options.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className="flex flex-col justify-between rounded-lg border border-primary/20 bg-primary/[0.02] p-2.5 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-primary text-[11px]">
                                {option.label}
                              </p>
                              {option.description ? (
                                <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
                                  {option.description}
                                </p>
                              ) : null}
                              {option.sentence_starter ? (
                                <p className="mt-2 rounded bg-background/90 p-2 font-mono text-[10px] leading-relaxed text-foreground border border-border/60">
                                  "{option.sentence_starter}"
                                </p>
                              ) : null}
                            </div>
                            {option.sentence_starter ? (
                              <div className="mt-2.5 flex items-center justify-end gap-1.5 pt-1.5 border-t border-border/40">
                                <CopyButton text={option.sentence_starter} label="Copy starter" />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    onInsertText(option.sentence_starter);
                                    onOpenChange(false);
                                  }}
                                >
                                  <Plus className="size-3" /> Insert into draft
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Model Phrasing */}
                  {suggestion.model_phrasing ? (
                    <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Cambridge Level 5 Exemplar Phrasing
                        </span>
                        <div className="flex items-center gap-1.5">
                          <CopyButton text={suggestion.model_phrasing} label="Copy" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => {
                              onInsertText(suggestion.model_phrasing);
                              onOpenChange(false);
                            }}
                          >
                            <Plus className="size-3" /> Insert
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs italic leading-relaxed text-foreground/90 font-serif">
                        "{suggestion.model_phrasing}"
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Back to editor
              </Button>
              <Button onClick={onShowModelAnswer} className="gap-1.5">
                <Sparkles className="size-4" /> Compare with complete model answer
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GradedHelpCard({
  grading,
  suggestions,
  headline,
  loading,
  error,
  revealed,
  onReveal,
  onRetry,
  generatingAnswer,
  onShowAnswer,
}: {
  grading: Grading;
  suggestions: MaxOutSuggestion[];
  headline?: string;
  loading: boolean;
  error: boolean;
  revealed: number;
  onReveal: () => void;
  onRetry: () => void;
  generatingAnswer: boolean;
  onShowAnswer: () => void;
}) {
  const fallbacks = [
    ...grading.actionable_feedback,
    ...grading.missing_elements.analysis,
    ...grading.missing_elements.evaluation,
    ...grading.missing_elements.examples,
  ];
  const hints = Array.from(
    { length: 3 },
    (_, index) =>
      suggestions[index] ??
      ({
        target_ao: index === 0 ? "ao1" : index === 1 ? "ao2" : "ao3",
        title: `Improvement ${index + 1}`,
        suggestion:
          fallbacks[index] ??
          "Add one precise, question-focused point and explain how it changes the final judgement.",
        mark_uplift: "+1–2 marks",
        how_to_write: [],
        strategic_options: [],
        model_phrasing: "",
      } as MaxOutSuggestion),
  );

  return (
    <div
      id="live-examiner-hints"
      className="scroll-mt-4 space-y-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-700 dark:bg-amber-950/40"
    >
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div>
          <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
            Hints to maximize your mark
          </p>
          <p className="text-[11px] leading-snug text-amber-900/75 dark:text-amber-100/75">
            {headline ??
              `You scored ${grading.total_mark}/${grading.max_mark}. Reveal each hint one at a time.`}
          </p>
        </div>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Preparing three personalised hints…
        </p>
      ) : error ? (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={onRetry}>
          Try loading hints again
        </Button>
      ) : (
        <div className="space-y-2">
          {hints.slice(0, revealed).map((hint, index) => (
            <div
              key={index}
              className="rounded-md border bg-background p-2.5 text-[11px] space-y-2"
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span>
                  Hint {index + 1}: {hint.title}
                </span>
                <Badge variant="outline" className={cn("text-[9px]", aoBadgeStyle(hint.target_ao))}>
                  {aoLabel(hint.target_ao)}
                </Badge>
              </div>
              <p className="leading-relaxed text-muted-foreground">{hint.suggestion}</p>

              {hint.how_to_write && hint.how_to_write.length > 0 ? (
                <div className="rounded border bg-muted/40 p-2 space-y-1 text-[10px]">
                  <p className="font-semibold text-foreground">How to write:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {hint.how_to_write.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hint.model_phrasing ? (
                <p className="rounded bg-emerald-500/10 p-2 text-[10px] italic text-emerald-800 dark:text-emerald-200">
                  Exemplar: "{hint.model_phrasing}"
                </p>
              ) : null}
            </div>
          ))}
          {revealed < 3 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={onReveal}
            >
              Reveal hint {revealed + 1}
              <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={generatingAnswer}
              onClick={onShowAnswer}
            >
              {generatingAnswer ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Building full answer…
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Show complete model answer
                </>
              )}
            </Button>
          )}
          {revealed < 3 ? (
            <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <LockKeyhole className="size-3" /> Full answer unlocks after all three hints
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ModelAnswer({ essay }: { essay: GeneratedEssay }) {
  return (
    <article className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Estimated {essay.estimatedMark}/{essay.maxMark}
        </Badge>
        <Badge variant="outline">{essay.wordCount} words</Badge>
      </div>
      {essay.sections.map((section, index) => (
        <section key={`${section.heading}-${index}`} className="space-y-2">
          <h3 className="font-semibold">{section.heading}</h3>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} className="text-sm leading-7 text-foreground/90">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Why this reaches the standard</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {essay.examinerComments.map((comment, index) => (
            <li key={index}>{comment}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
