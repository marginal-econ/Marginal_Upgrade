import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Clock,
  Construction,
  Copy,
  GraduationCap,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MapPin,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { ChainedChamber } from "@/components/app/chained-chamber";
import { LiveExaminerEditor } from "@/components/app/live-examiner-editor";
import { AoLegend } from "@/components/app/live-examiner/ao-legend";
import { ScoreWidget } from "@/components/app/live-examiner/score-widget";
import { NextMarks } from "@/components/app/live-examiner/next-marks";
import { RubricChecklist } from "@/components/app/live-examiner/rubric-checklist";
import type { LiveExaminerEditorHandle } from "@/components/app/live-examiner/editor";
import {
  LiveExaminerHistoryPanel,
  type LiveExaminerSessionSummary,
} from "@/components/app/live-examiner-history";
import { LiveExaminerPanel, type AutosaveState } from "@/components/app/live-examiner-panel";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { DiagramCheckDialog } from "@/components/app/diagram-check-dialog";
import {
  MarkSchemeScreenshots,
  type MarkSchemeImage,
} from "@/components/app/mark-scheme-screenshot";
import { CompactProgressBar, GradingProgress, type ProgressStage } from "@/components/app/grading-progress";
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
import { listDiagramLibrary } from "@/lib/diagrams.functions";
import { gradeEssaySubmission } from "@/lib/grading.functions";
import {
  auditLiveExaminerDiagram,
  getLiveExaminerGuardStatusFn,
  getLiveExaminerSession,
  getMaxOutSuggestions,
  heartbeatLiveExaminerSeat,
  prepareLiveExaminerContext,
  releaseLiveExaminerSeat,
  saveLiveExaminerSession,
  type LiveDiagramAudit,
  type MaxOutSuggestion,
  type MaxOutResponse,
} from "@/lib/live-examiner.functions";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { getMe } from "@/lib/account.functions";
import { topicsFor } from "@/lib/diagrams/catalog";
import {
  formatRemainingDuration,
  isDailyLimitError,
  LIVE_EXAMINER_MAX_SESSION_MINUTES,
} from "@/lib/usage-limits";
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

type AttachedDiagram = {
  id: string;
  label: string;
  tag: string;
  previewUrl?: string;
  audit?: LiveDiagramAudit;
  referenceSentence?: string;
};
const DIAGRAM_TAG_RE = /\[DIAGRAM:[^\]]*\]/g;
const DIAGRAM_TITLE_RE = /\[DIAGRAM:\s*([^|]+?)\s*\|/;

/**
 * Compresses large phone photos / screenshots down to max 1280px JPEG before
 * sending to NVIDIA Super-VL 120B Vision so uploads are fast and never hit
 * worker payload limits.
 */
async function compressDiagramFile(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Couldn't read that photo — try again."));
    reader.readAsDataURL(file);
  });

  if (typeof window === "undefined" || !rawDataUrl.startsWith("data:image/")) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width <= MAX_DIM && height <= MAX_DIM && rawDataUrl.length < 900_000) {
          resolve(rawDataUrl);
          return;
        }
        const scale = Math.min(1, MAX_DIM / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

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

function formatCountdownMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function LiveExaminerPage() {
  const routeContext = Route.useRouteContext() as { user?: { id?: string; email?: string } } | undefined;
  const routeUser = routeContext?.user;
  const isRouteUserAdmin = isMarginalAdmin({ userId: routeUser?.id, email: routeUser?.email });
  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
    retry: 1,
  });

  const isAdmin = Boolean(
    isRouteUserAdmin ||
      meQuery.data?.role === "admin" ||
      meQuery.data?.isAdmin ||
      meQuery.data?.subscription?.isAdmin ||
      (meQuery.data?.userId && isMarginalAdmin({ userId: meQuery.data.userId }))
  );

  const [level, setLevel] = useState<"as" | "a2">("as");
  const [topic, setTopic] = useState("Government microeconomic intervention");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState(12);
  const [questionSource, setQuestionSource] = useState<"type" | "ai" | "bank">("type");
  const [essayText, setEssayText] = useState("");
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [started, setStarted] = useState(false);
  // Set when the 1/24h, 20m timer, or 1-concurrent-user lock blocks a start or ends a session.
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  // Per-tab ID stored in sessionStorage so reloading the same tab can resume
  // within the 20m window, while opening a second tab is blocked.
  const [tabId] = useState<string>(() => {
    if (typeof window === "undefined") return "ssr";
    try {
      const existing = window.sessionStorage.getItem("le_tab_id");
      if (existing) return existing;
      const fresh =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem("le_tab_id", fresh);
      return fresh;
    } catch {
      return `tab-${Date.now()}`;
    }
  });

  const [sessionEndsAt, setSessionEndsAt] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [seatLostMessage, setSeatLostMessage] = useState<string | null>(null);

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

  const [diagramDragActive, setDiagramDragActive] = useState(false);

  const auditDiagram = useServerFn(auditLiveExaminerDiagram);
  const describeDiagramMutation = useMutation({
    mutationFn: (image: string) =>
      auditDiagram({
        data: {
          image,
          question: question || "Cambridge 9708 Economics essay question",
          level,
          maxMark,
          essayText,
          tabId,
        },
      }).then((audit) => ({ audit, previewUrl: image })),
    onSuccess: ({ audit, previewUrl }) => {
      setDiagrams((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          label: audit.title || "Audited diagram",
          tag: audit.tag,
          previewUrl,
          audit,
          referenceSentence: audit.proseIntegrationSentence || undefined,
        },
      ]);
      toast.success(
        `Diagram audited (${audit.diagramScore}/4 · ${audit.verdict}) — ready in Live Examiner.`,
      );
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

  const handleDiagramFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG, or WebP).");
        return;
      }
      try {
        const compressed = await compressDiagramFile(file);
        describeDiagramMutation.mutate(compressed);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't read that photo — try again.");
      }
    },
    [describeDiagramMutation],
  );

  // Support Ctrl+V / clipboard screenshot paste while the Diagram Studio dialog is open
  useEffect(() => {
    if (!diagramDialogOpen) return;
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void handleDiagramFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [diagramDialogOpen, handleDiagramFile]);

  function applyLibraryDiagram(id: string) {
    const entry = diagramLibraryQuery.data?.find((item) => item.id === id);
    if (!entry) return;
    const curves = entry.curveLabels.filter(Boolean).join(", ") || "not specified";
    const tag =
      `[DIAGRAM: ${entry.title} | axes: ${entry.yLabel} (y) / ${entry.xLabel} (x) | ` +
      `curves: ${curves} | labels: as per the standard ${entry.title} diagram | ` +
      `accuracy: reference diagram selected from the diagram library by the student — verify it is correctly applied to their written argument]`;
    const referenceSentence = `As illustrated in the ${entry.title} diagram (${entry.yLabel} against ${entry.xLabel}), the interaction between ${curves} demonstrates the shift in equilibrium and resulting change in price and quantity.`;
    setDiagrams((current) => [
      ...current,
      { id: crypto.randomUUID(), label: entry.title, tag, referenceSentence },
    ]);
    toast.success(`Attached "${entry.title}" — you can also insert a prose reference sentence.`);
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
  const [diagramPromptOpen, setDiagramPromptOpen] = useState(false);
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

  function handleGradeNow(options?: { skipDiagramCheck?: boolean }) {
    const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
    if (words < 20) {
      toast.error("Write at least a short paragraph before grading.");
      return;
    }

    if (!options?.skipDiagramCheck && diagrams.length === 0) {
      setDiagramPromptOpen(true);
      return;
    }

    setGradeDialogOpen(true);
    gradeMutation.mutate();
    maxOutMutation.reset();
  }

  // --- Score Maximizer & Perfection Blueprint: on-demand or post-grade
  // guidance powered by NVIDIA 550B Ultra showing exact paragraph rewrites,
  // diagram-to-prose linkages, AO3 evaluation synthesis, and mark-boost cards.
  const [scoreMaximizerOpen, setScoreMaximizerOpen] = useState(false);
  const maxOutFn = useServerFn(getMaxOutSuggestions);
  const buildDiagramAuditSummary = () =>
    diagrams
      .filter((d) => d.audit)
      .map((d) => {
        const a = d.audit!;
        return `${a.title}: ${a.diagramScore}/4 (${a.verdict}). Axes: ${a.axes.detail}. Curves: ${a.curves.detail}. Shifts: ${a.shiftsAndEquilibria.detail}. Fixes: ${a.fixes.join("; ") || "None"}.`;
      })
      .join("\n");

  const maxOutMutation = useMutation({
    mutationFn: (overrideInput?: {
      question: string;
      level: "as" | "a2";
      maxMark: number;
      essayText: string;
      contextBlock: string;
      totalMark: number;
      band: string;
      weaknesses: string[];
      missingElements: { knowledge?: string[]; analysis?: string[]; evaluation?: string[]; examples?: string[] };
      actionableFeedback: string[];
    }) => {
      const grading = gradeMutation.data?.grading;
      const payload = overrideInput ?? {
        question,
        level,
        maxMark,
        essayText,
        contextBlock: contextBlock || "",
        totalMark: grading?.total_mark ?? (predictedMark?.total_mark ?? Math.round(maxMark * 0.5)),
        band: grading?.band ?? (predictedMark ? `Est. ${predictedMark.total_mark}/${maxMark}` : "Draft Attempt"),
        weaknesses: grading?.weaknesses ?? [],
        missingElements: grading?.missing_elements ?? {},
        actionableFeedback: grading?.actionable_feedback ?? [],
      };
      return maxOutFn({
        data: {
          ...payload,
          attachedDiagrams: diagrams.map((d) => d.tag),
          diagramAuditSummary: buildDiagramAuditSummary(),
          tabId,
        },
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleOpenScoreMaximizer() {
    const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
    if (words < 15) {
      toast.error("Write at least a few sentences (~15+ words) before opening Score Maximizer.");
      return;
    }
    setScoreMaximizerOpen(true);
    const grading = gradeMutation.data?.grading;
    maxOutMutation.mutate({
      question,
      level,
      maxMark,
      essayText,
      contextBlock: contextBlock || "",
      totalMark: grading?.total_mark ?? (predictedMark?.total_mark ?? Math.round(maxMark * 0.5)),
      band: grading?.band ?? (predictedMark ? `Est. ${predictedMark.total_mark}/${maxMark}` : "Draft Attempt"),
      weaknesses: grading?.weaknesses ?? [],
      missingElements: grading?.missing_elements ?? {},
      actionableFeedback: grading?.actionable_feedback ?? [],
    });
  }

  function handleReplaceWeakestParagraph(beforeQuote: string, afterRewrite: string) {
    const cleanAfter = afterRewrite.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    if (!cleanAfter) return;
    const cleanBefore = beforeQuote.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    let replaced = false;

    setEssayText((current) => {
      if (cleanBefore.length >= 15) {
        const directIdx = current.indexOf(cleanBefore);
        if (directIdx !== -1) {
          replaced = true;
          return `${current.slice(0, directIdx)}${cleanAfter}${current.slice(directIdx + cleanBefore.length)}`;
        }
        const lowerCurrent = current.toLowerCase();
        const lowerQuote = cleanBefore.toLowerCase();
        const ciIdx = lowerCurrent.indexOf(lowerQuote);
        if (ciIdx !== -1) {
          replaced = true;
          return `${current.slice(0, ciIdx)}${cleanAfter}${current.slice(ciIdx + cleanBefore.length)}`;
        }
        // Fuzzy match by paragraph word overlap if student edited a few words
        const paragraphs = current.split(/\n\s*\n/);
        const quoteWords = new Set(lowerQuote.split(/\W+/).filter((w) => w.length > 3));
        let bestIdx = -1;
        let bestScore = 0;
        paragraphs.forEach((p, idx) => {
          const pWords = p.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
          const overlap = pWords.filter((w) => quoteWords.has(w)).length;
          const ratio = quoteWords.size > 0 ? overlap / quoteWords.size : 0;
          if (ratio > bestScore) {
            bestScore = ratio;
            bestIdx = idx;
          }
        });
        if (bestIdx !== -1 && bestScore >= 0.45) {
          replaced = true;
          paragraphs[bestIdx] = cleanAfter;
          return paragraphs.join("\n\n");
        }
      }
      const trimmed = current.trim();
      return trimmed ? `${trimmed}\n\n${cleanAfter}` : cleanAfter;
    });

    toast.success(
      replaced
        ? "Applied A* paragraph upgrade directly into your draft!"
        : "Added A* upgraded paragraph to your essay draft.",
    );
  }

  function handleInsertSentence(
    text: string,
    targetAo?: "ao1" | "ao2" | "ao3" | "structure",
    placementLabel?: string,
    forceEnd = false,
  ) {
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    if (!cleanText) return;
    setEssayText((current) => {
      const trimmed = current.trim();
      if (!trimmed) return cleanText;
      if (forceEnd || !targetAo || targetAo === "ao3" || targetAo === "structure") {
        return `${trimmed}\n\n${cleanText}`;
      }
      const paragraphs = trimmed.split(/\n\s*\n/);
      if (targetAo === "ao1") {
        paragraphs[0] = `${paragraphs[0].trim()} ${cleanText}`;
        return paragraphs.join("\n\n");
      }
      if (targetAo === "ao2") {
        const bodyIdx = paragraphs.length >= 2 ? 1 : 0;
        paragraphs[bodyIdx] = `${paragraphs[bodyIdx].trim()} ${cleanText}`;
        return paragraphs.join("\n\n");
      }
      return `${trimmed}\n\n${cleanText}`;
    });
    toast.success(
      placementLabel
        ? `Inserted into ${placementLabel}.`
        : "Inserted into your essay draft.",
    );
  }

  const generateFullAnswer = useServerFn(generateModelEssay);
  const fullAnswerMutation = useMutation({
    mutationFn: () => generateFullAnswer({ data: { level, topic, question, maxMark } }),
    onSuccess: () => setModelAnswerOpen(true),
    onError: (error: Error) => toast.error(error.message),
  });

  const topics = Array.from(
    new Set(topicsFor("Microeconomics").concat(topicsFor("Macroeconomics"))),
  );

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

  // --- Guard status polling on setup screen (1 user at a time, 1/24h, 20m max) ---
  const fetchGuardStatus = useServerFn(getLiveExaminerGuardStatusFn);
  const guardStatusQuery = useQuery({
    queryKey: ["live-examiner-guard-status", tabId],
    queryFn: () => fetchGuardStatus({ data: { tabId } }),
    enabled: !started,
    refetchInterval: !started ? 15_000 : false,
    staleTime: 5_000,
  });
  const guardStatus = guardStatusQuery.data;

  // --- Syllabus grounding — fetched ONCE per question, reused by every
  // subsequent live check call so nothing re-embeds on every keystroke ---
  const prepareContext = useServerFn(prepareLiveExaminerContext);
  const contextMutation = useMutation({
    mutationFn: (override?: { level: "as" | "a2"; topic: string; question: string; maxMark?: number }) =>
      prepareContext({ data: { ...(override ?? { level, topic, question, maxMark }), tabId } }),
    onSuccess: (result) => {
      if ((result as any)?.sessionGuard) {
        const sg = (result as any).sessionGuard as {
          sessionEndsAt: number;
          resetAt: number;
        };
        setSessionEndsAt(sg.sessionEndsAt);
        setResetAt(sg.resetAt);
        setNowMs(Date.now());
        setSeatLostMessage(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["live-examiner-guard-status"] });
    },
    onError: (error: Error) => {
      // Surface concurrency / 24h / 20m limit errors cleanly and return to setup
      toast.error(error.message);
      setStarted(false);
      setSessionEndsAt(null);
      setLimitNotice(error.message);
      void queryClient.invalidateQueries({ queryKey: ["live-examiner-guard-status"] });
    },
  });

  // --- Resume an existing draft for this question, if one exists --------
  const queryClient = useQueryClient();
  const hydratedQuestionRef = useRef<string | null>(null);
  const fetchSession = useServerFn(getLiveExaminerSession);
  const sessionQuery = useQuery({
    queryKey: ["live-examiner-session", question],
    queryFn: () => fetchSession({ data: { question } }),
    enabled: started && question.length > 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!started) {
      hydratedQuestionRef.current = null;
      return;
    }
    const session = sessionQuery.data?.session;
    if (!session || hydratedQuestionRef.current === question) return;
    hydratedQuestionRef.current = question;
    if (session.essay_text) {
      setEssayText(session.essay_text);
      lastSavedTextRef.current = session.essay_text;
    }
    if (session.diagram_tag) {
      setDiagrams(parseDiagramTags(session.diagram_tag));
    }
  }, [sessionQuery.data, started, question]);

  function handleStart() {
    if (question.trim().length < 5) {
      toast.error("Enter or pick a question first.");
      return;
    }
    hydratedQuestionRef.current = null;
    setLimitNotice(null);
    setSeatLostMessage(null);
    setSessionEndsAt(null);
    setStarted(true);
    contextMutation.mutate({ level, topic, question, maxMark });
  }

  /** Resume a past essay from the history panel — same as picking that
   *  question and starting, and the existing session-resume effect below
   *  fills in the saved draft text/diagram once the question matches. */
  function resumeSession(entry: LiveExaminerSessionSummary) {
    hydratedQuestionRef.current = null;
    setLevel(entry.level);
    setTopic(entry.topic);
    setQuestion(entry.question);
    setMaxMark(entry.maxMark);
    setLimitNotice(null);
    setSeatLostMessage(null);
    setSessionEndsAt(null);
    setStarted(true);
    contextMutation.mutate({
      level: entry.level,
      topic: entry.topic,
      question: entry.question,
      maxMark: entry.maxMark,
    });
  }

  const remainingSessionMs = sessionEndsAt ? Math.max(0, sessionEndsAt - nowMs) : null;
  const isSessionExpired = remainingSessionMs !== null && remainingSessionMs <= 0;
  const isLiveAiEnabled =
    started &&
    contextMutation.isSuccess &&
    !isSessionExpired &&
    !seatLostMessage;

  const heartbeatFn = useServerFn(heartbeatLiveExaminerSeat);
  const releaseSeatFn = useServerFn(releaseLiveExaminerSeat);

  const releaseSeatBestEffort = useCallback(() => {
    releaseSeatFn({ data: { tabId } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["live-examiner-guard-status"] });
      })
      .catch(() => {});
  }, [queryClient, releaseSeatFn, tabId]);

  // 1-second timer tick while a session is active
  useEffect(() => {
    if (!started || sessionEndsAt === null) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [started, sessionEndsAt]);

  // Immediately release global seat when 20-minute timer expires
  const expiredReleaseSentRef = useRef(false);
  useEffect(() => {
    if (!started || !isSessionExpired) {
      expiredReleaseSentRef.current = false;
      return;
    }
    if (!expiredReleaseSentRef.current) {
      expiredReleaseSentRef.current = true;
      releaseSeatBestEffort();
      toast.warning(
        `Your ${LIVE_EXAMINER_MAX_SESSION_MINUTES}-minute Live Examiner session has ended. Your draft is saved.`,
      );
    }
  }, [started, isSessionExpired, releaseSeatBestEffort]);

  // 20-second heartbeat to keep the 60s single-user global lease alive while active
  useEffect(() => {
    if (!isLiveAiEnabled || question.trim().length < 5) return;
    const id = window.setInterval(() => {
      heartbeatFn({ data: { question, tabId } })
        .then((res) => {
          setSessionEndsAt(res.sessionEndsAt);
          setResetAt(res.resetAt);
        })
        .catch((err: Error) => {
          setSeatLostMessage(err?.message || "Live Examiner session ended.");
        });
    }, 20_000);
    return () => window.clearInterval(id);
  }, [heartbeatFn, isLiveAiEnabled, question, tabId]);

  // Release global seat on unmount or tab close (pagehide)
  useEffect(() => {
    if (!started) return;
    const onPageHide = () => {
      releaseSeatBestEffort();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      releaseSeatBestEffort();
    };
  }, [started, releaseSeatBestEffort]);

  const contextBlock = contextMutation.data?.contextBlock ?? "";
  const rubricBlueprint = contextMutation.data?.blueprint ?? null;
  const sourceCount = contextMutation.data?.sourceCount ?? 0;
  const anchorsUsed = contextMutation.data?.anchorsUsed ?? 0;

  // The attached diagram tags ride along with the essay text for every
  // live check, exactly like they do for full grading — so a referenced
  // diagram gets credited/checked instead of the checker only ever seeing
  // the written prose.
  const combinedDiagramTag = combineDiagramTags(diagrams);
  const textForCheck = combinedDiagramTag ? `${essayText}\n\n${combinedDiagramTag}` : essayText;

  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [showAo, setShowAo] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [activeAoFilter, setActiveAoFilter] = useState<any>(null);
  const editorRef = useRef<LiveExaminerEditorHandle>(null);

  // Effortless keyboard shortcuts: Alt+1 toggles AO highlights, Alt+2 toggles issue underlines
  useEffect(() => {
    if (!started) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setShowAo((prev) => !prev);
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        setShowIssues((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started]);

  const {
    issues,
    classifications,
    sentences,
    history,
    checking,
    pending,
    error: checkError,
    predictedMark,
    scoreEstimate,
    lastUpdatedAt,
    acceptIssue,
    acceptAllIssues,
    acceptAllMechanical,
    dismissIssue,
    rescan,
    clearAll,
    resetSession,
    cache,
    rubric,
    rubricHits,
    tokenStats,
    ledger,
    opportunities,
    strengths,
    areasForImprovement,
    assessmentStatus,
    markRange,
  } = useLiveExaminerCheck({
    text: textForCheck,
    question,
    level,
    maxMark,
    contextBlock,
    blueprint: rubricBlueprint,
    enabled: isLiveAiEnabled,
    tabId,
    onGuardError: (err) => {
      setSeatLostMessage(err.message);
      if (err.message.startsWith("Session time limit reached")) {
        setSessionEndsAt(Date.now());
      }
      releaseSeatBestEffort();
    },
    initialCache: sessionQuery.data?.session
      ? { sentences: (sessionQuery.data.session as any).sentence_cache }
      : undefined,
  });

  // --- Autosave, debounced, independent of the AI check debounce --------
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
          sentenceCache: (cache as any)?.toJSON()?.sentences || {},
          scoreHistory: scoreEstimate ? [scoreEstimate] : [],
          docVersion: 1,
          schemaVersion: 2,
          diagramTag: combinedDiagramTag,
        },
      })
        .then(() => {
          savingRef.current = false;
          lastSavedTextRef.current = textToSave;
          retryCountRef.current = 0;
          setAutosave("saved");
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
    savingRef.current = false;
    hydratedQuestionRef.current = question; // Prevent stale sessionQuery from resurrecting old text
    resetSession();
    setEssayText("");
    setFocusedIssueId(null);
    setActiveAoFilter(null);
    clearDiagrams();
    setMarkSchemeImages([]);
    gradeMutation.reset();
    maxOutMutation.reset();
    fullAnswerMutation.reset();
    setAutosave("idle");
    lastSavedTextRef.current = "";
    retryCountRef.current = 0;

    // Immediately clear TanStack Query cache so tab-switching or refetch never resurrects the old draft
    queryClient.setQueryData(["live-examiner-session", question], { session: null });

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
        sentenceCache: {},
        scoreHistory: [],
        diagramTag: undefined,
      },
    }).catch(() => {
      /* best-effort — the next real edit will autosave and retry as usual */
    });
    setRestartDialogOpen(false);
    toast.success("Session restarted — ready for a fresh attempt.");
  }

  return (
    <>
      <PageHeader
        title="Live Examiner"
        description="Write your Cambridge 9708 answer with instant AO highlighting, zero-latency grammar checking, and live mark-scheme feedback."
      />

      {!started ? (
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Clock className="size-3.5 text-primary" />
              1 user at a time · 1 session per 24 hours · {LIVE_EXAMINER_MAX_SESSION_MINUTES} min max
            </span>
            {guardStatus ? (
              guardStatus.occupiedByOther ? (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Seat occupied — retry in ~{formatRemainingDuration(guardStatus.lockReleaseInMs ?? 60_000)}
                </Badge>
              ) : guardStatus.occupiedByOtherTab ? (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Active in another tab on your account
                </Badge>
              ) : guardStatus.dailyUsed && guardStatus.isSessionExpired ? (
                <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                  Daily limit used · Resets in {formatRemainingDuration(guardStatus.remainingResetMs)}
                </Badge>
              ) : guardStatus.dailyUsed && guardStatus.canResumeActiveSession ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Active session ({formatCountdownMmSs(guardStatus.remainingSessionMs)} left)
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Seat available
                </Badge>
              )
            ) : null}
          </div>

          {limitNotice ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {limitNotice}
            </div>
          ) : guardStatus?.occupiedByOther ? (
            <div
              role="status"
              className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            >
              Another user is currently in Live Examiner (only 1 active user at a time to keep the system fast). Availability refreshes automatically every 15s.
            </div>
          ) : guardStatus?.dailyUsed && guardStatus.isSessionExpired ? (
            <div
              role="status"
              className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              You have completed your 1 Live Examiner session ({LIVE_EXAMINER_MAX_SESSION_MINUTES} min max) for this 24-hour cycle. Next session unlocks in{" "}
              <span className="font-mono font-semibold">{formatRemainingDuration(guardStatus.remainingResetMs)}</span>.
            </div>
          ) : guardStatus?.dailyUsed && guardStatus.canResumeActiveSession && guardStatus.activeQuestion ? (
            <div
              role="status"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
            >
              <div>
                <p className="font-medium">
                  Active daily session in progress ({formatCountdownMmSs(guardStatus.remainingSessionMs)} remaining)
                </p>
                <p className="text-xs opacity-85 line-clamp-1">{guardStatus.activeQuestion}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuestion(guardStatus.activeQuestion!);
                  setLimitNotice(null);
                  setSeatLostMessage(null);
                  setSessionEndsAt(null);
                  setStarted(true);
                  contextMutation.mutate({
                    level,
                    topic,
                    question: guardStatus.activeQuestion!,
                    maxMark,
                  });
                }}
              >
                Resume active session
              </Button>
            </div>
          ) : null}
          <div className="grid gap-8 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
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
                <div className="space-y-2">
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
                  <CompactProgressBar
                    active={aiQuestionMutation.isPending}
                    stages={[
                      { label: "Checking Cambridge 9708 syllabus scope", weight: 2 },
                      { label: "Drafting authentic command-word question", weight: 4 },
                    ] satisfies ProgressStage[]}
                    totalMs={10_000}
                    title="Generating Cambridge-style question…"
                  />
                </div>
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleStart}
                disabled={
                  contextMutation.isPending ||
                  Boolean(guardStatus?.occupiedByOther) ||
                  Boolean(guardStatus?.occupiedByOtherTab) ||
                  Boolean(guardStatus?.dailyUsed && guardStatus.isSessionExpired)
                }
              >
                <PenLine className="size-4" />{" "}
                {guardStatus?.occupiedByOther
                  ? "Seat Occupied (1 User Max)"
                  : guardStatus?.dailyUsed && guardStatus.isSessionExpired
                    ? `Resets in ${formatRemainingDuration(guardStatus.remainingResetMs)}`
                    : "Start writing"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Suggestions are grounded only in your syllabus, coursebook, mark scheme and examiner
                report material — nothing is invented.
              </p>
            </div>

            <LiveExaminerHistoryPanel onResume={resumeSession} />
          </div>
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
          <section className="min-w-0 space-y-3 border-border p-5 lg:border-r md:p-6">
            {/* Clean, minimal studio header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-base font-semibold leading-snug text-foreground">{question}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    {level === "a2" ? "A Level" : "AS Level"} · {maxMark}m
                  </Badge>
                  <span className="text-muted-foreground/70">·</span>
                  <span>{topic}</span>
                  <span className="text-muted-foreground/70">·</span>
                  <span className="font-mono">{wordCount} words</span>
                  {remainingSessionMs !== null ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 font-mono text-[11px]",
                        isSessionExpired
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : remainingSessionMs <= 60_000
                            ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
                            : remainingSessionMs <= 5 * 60_000
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-primary/30 bg-primary/5 text-primary",
                      )}
                      title="20-minute maximum Live Examiner session timer"
                    >
                      <Clock className="size-3" />
                      {isSessionExpired ? "0:00 · Time Up" : `${formatCountdownMmSs(remainingSessionMs)} left`}
                    </Badge>
                  ) : null}
                  {contextMutation.isPending ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                      <Loader2 className="size-3 animate-spin" /> Loading rubric…
                    </span>
                  ) : sourceCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <GraduationCap className="size-3" /> Syllabus grounded
                    </span>
                  ) : null}
                  {diagrams.map((d) => (
                    <Badge
                      key={d.id}
                      variant="outline"
                      className={cn(
                        "gap-1 text-[10px] cursor-pointer",
                        d.audit?.verdict === "Exam-Ready"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : d.audit?.verdict === "Needs Correction"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "",
                      )}
                      onClick={() => setDiagramDialogOpen(true)}
                    >
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      <span>{d.label}</span>
                      {d.audit ? (
                        <span className="font-mono font-bold">({d.audit.diagramScore}/4)</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDiagram(d.id);
                        }}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${d.label}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setDiagramDialogOpen(true)}
                >
                  <ImagePlus className="size-3.5" />
                  {diagrams.length > 0 ? `Diagrams (${diagrams.length})` : "Diagram"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  disabled={isSessionExpired || Boolean(seatLostMessage)}
                  onClick={handleOpenScoreMaximizer}
                >
                  <Sparkles className="size-3.5 text-amber-500" /> Maximize
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  onClick={() => handleGradeNow()}
                >
                  <Sparkles className="size-3.5" /> Grade now
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs">
                      More
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-2.5 p-3" align="end">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-foreground">Mark scheme screenshot</p>
                      <MarkSchemeScreenshots
                        images={markSchemeImages}
                        onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
                        onRemove={(id) =>
                          setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1 border-t border-border pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 justify-start gap-2 text-xs"
                        onClick={() => setRestartDialogOpen(true)}
                      >
                        <RotateCcw className="size-3.5" /> Restart essay
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 justify-start gap-2 text-xs"
                        onClick={() => {
                          if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
                          if (retryTimer.current) clearTimeout(retryTimer.current);
                          savingRef.current = false;
                          hydratedQuestionRef.current = null;
                          resetSession();
                          setEssayText("");
                          lastSavedTextRef.current = "";
                          setFocusedIssueId(null);
                          setActiveAoFilter(null);
                          clearDiagrams();
                          gradeMutation.reset();
                          maxOutMutation.reset();
                          fullAnswerMutation.reset();
                          releaseSeatBestEffort();
                          setSessionEndsAt(null);
                          setSeatLostMessage(null);
                          setStarted(false);
                        }}
                      >
                        <PenLine className="size-3.5" /> Change question
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {isSessionExpired || seatLostMessage ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
              >
                <span>
                  {seatLostMessage ||
                    `Your ${LIVE_EXAMINER_MAX_SESSION_MINUTES}-minute Live Examiner session has ended and your seat has been released. Your draft is saved and local checks remain active.${
                      resetAt ? ` Next session resets in ${formatRemainingDuration(resetAt - nowMs)}.` : ""
                    }`}
                </span>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-sm backdrop-blur-md transition-all">
              <AoLegend
                sentences={sentences}
                issuesCount={issues.length}
                showAo={showAo}
                showIssues={showIssues}
                onToggleAo={() => setShowAo((prev) => !prev)}
                onToggleIssues={() => setShowIssues((prev) => !prev)}
                activeFilter={activeAoFilter}
                onSelectAo={(tag) => {
                  setActiveAoFilter((current: any) => (current === tag ? null : tag));
                  const target = sentences.find((s) => s.ao?.tag === tag);
                  if (target) {
                    editorRef.current?.focusSpan(target.id);
                  }
                }}
              />
              <LiveExaminerEditor
                ref={editorRef}
                value={essayText}
                onChange={setEssayText}
                issues={issues}
                sentences={sentences}
                classifications={classifications}
                showAo={showAo}
                showIssues={showIssues}
                onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
                onDismiss={dismissIssue}
                focusedIssueId={focusedIssueId}
                predictedMark={predictedMark}
                maxMark={maxMark}
                checking={checking}
                placeholder="Start writing your answer here — sentences highlight automatically as AO1 Knowledge, AO2 Analysis, or AO3 Evaluation. Click any highlighted sentence to see why…"
                className="min-h-[65vh] border-0 bg-transparent shadow-none"
              />
            </div>
          </section>

          <aside className="min-w-0 p-4 md:p-5 flex flex-col gap-3.5 lg:sticky lg:top-16 lg:self-start">
            <ScoreWidget
              scoreEstimate={scoreEstimate}
              wordCount={wordCount}
              maxMark={maxMark}
              question={question}
              checking={checking}
              status={assessmentStatus}
              markRange={markRange}
            />

            <LiveExaminerPanel
              issues={issues}
              history={history}
              checking={checking}
              pending={pending}
              error={checkError}
              autosave={autosave}
              predictedMark={predictedMark}
              finalGrading={gradeMutation.data?.grading as Grading | null}
              lastUpdatedAt={lastUpdatedAt}
              maxMark={maxMark}
              onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
              onAcceptAll={() => setEssayText((current) => acceptAllIssues(current))}
              onAcceptAllMechanical={() => setEssayText((current) => acceptAllMechanical(current))}
              onDismiss={dismissIssue}
              onRescan={() => rescan(essayText)}
              onClearAll={clearAll}
              onFocusIssue={(id) => {
                setFocusedIssueId(id);
                editorRef.current?.focusSpan(id);
              }}
              onOpenMaximizer={handleOpenScoreMaximizer}
              maximizerLoading={maxOutMutation.isPending}
              checklistContent={
                <div className="space-y-4">
                  <RubricChecklist
                    blueprint={rubricBlueprint}
                    hits={rubricHits}
                    tokenStats={tokenStats}
                  />
                  <NextMarks
                    nextMoves={scoreEstimate?.nextMoves || []}
                    opportunities={opportunities}
                    strengths={strengths}
                    areasForImprovement={areasForImprovement}
                    onSelectMove={(move) => {
                      toast.info(`Next mark tip: ${move.title}`, {
                        description: move.detail,
                      });
                    }}
                    onOpenMaximizer={handleOpenScoreMaximizer}
                    maximizerLoading={maxOutMutation.isPending}
                  />
                </div>
              }
            />
          </aside>
        </div>
      )}

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your written answer, attached diagrams, and all suggestions for this
              question — including the saved draft — so you can write the full response again from a
              blank sheet. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>Restart exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={diagramDialogOpen} onOpenChange={setDiagramDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] font-semibold">
                <Sparkles className="mr-1 size-3" /> Live Diagram Vision Studio
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                NVIDIA Super-VL 120B Vision
              </Badge>
            </div>
            <DialogTitle className="mt-1">Attach &amp; Audit Your Cambridge 9708 Diagram</DialogTitle>
            <DialogDescription>
              Upload a photo, drag-and-drop, paste a screenshot (Ctrl+V), or pick from the diagram library.
              Live Examiner audits axes, curves, shifts, shading, and prose linkage — and credits it immediately in your live mark.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* NVIDIA 550B Recommended Diagram Guide for this Question */}
            {rubricBlueprint?.recommendedDiagram ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Target className="size-3.5 text-primary" />
                    Recommended Diagram: {rubricBlueprint.recommendedDiagram.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    Examiner Blueprint
                  </Badge>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2 text-[11px] text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Axes:</strong> {rubricBlueprint.recommendedDiagram.axes}
                  </p>
                  {rubricBlueprint.recommendedDiagram.curves.length > 0 ? (
                    <p>
                      <strong className="text-foreground">Curves:</strong>{" "}
                      {rubricBlueprint.recommendedDiagram.curves.join(", ")}
                    </p>
                  ) : null}
                  {rubricBlueprint.recommendedDiagram.shift ? (
                    <p className="sm:col-span-2">
                      <strong className="text-foreground">Shift &amp; Equilibrium:</strong>{" "}
                      {rubricBlueprint.recommendedDiagram.shift}
                    </p>
                  ) : null}
                  {rubricBlueprint.recommendedDiagram.shadedArea ? (
                    <p className="sm:col-span-2">
                      <strong className="text-foreground">Key Area:</strong>{" "}
                      {rubricBlueprint.recommendedDiagram.shadedArea}
                    </p>
                  ) : null}
                </div>
                {rubricBlueprint.recommendedDiagram.proseLinkCue ? (
                  <p className="text-[11px] text-primary/90 italic">
                    Prose cue: {rubricBlueprint.recommendedDiagram.proseLinkCue}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Interactive Upload / Drag-and-Drop / Ctrl+V Zone */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Upload, Drop, or Paste Diagram Image (Ctrl+V)</Label>
              <input
                ref={diagramFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  void handleDiagramFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDiagramDragActive(true);
                }}
                onDragLeave={() => setDiagramDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDiagramDragActive(false);
                  const dropped = e.dataTransfer.files?.[0];
                  void handleDiagramFile(dropped);
                }}
                onClick={() => !describeDiagramMutation.isPending && diagramFileRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all",
                  diagramDragActive
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
                  describeDiagramMutation.isPending && "pointer-events-none opacity-70",
                )}
              >
                {describeDiagramMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-xs font-semibold text-foreground">
                      Auditing diagram with NVIDIA Super-VL 120B Vision…
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Checking axes, curve slopes, shift arrows, equilibrium points &amp; shaded areas
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Click to upload a diagram photo, drag &amp; drop, or press Ctrl+V to paste
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Hand-drawn notebook sketches, iPad drawings, or past-paper screenshots — auto-compressed for fast AI vision audit
                    </p>
                  </div>
                )}
              </div>
              <CompactProgressBar
                active={describeDiagramMutation.isPending}
                stages={[
                  { label: "Inspecting axes, curves & shift arrows (NVIDIA Vision)", weight: 3 },
                  { label: "Scoring Cambridge 9708 accuracy & prose linkage", weight: 4 },
                ] satisfies ProgressStage[]}
                totalMs={10_000}
                title="Auditing your diagram…"
              />
            </div>

            {/* Attached Diagrams + Live Audit Cards */}
            {diagrams.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Attached Diagrams ({diagrams.length})
                </p>
                {diagrams.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {d.previewUrl ? (
                          <img
                            src={d.previewUrl}
                            alt={d.label}
                            className="size-16 shrink-0 rounded-lg border border-border object-cover bg-white"
                          />
                        ) : null}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground truncate">
                              {d.label}
                            </span>
                            {d.audit ? (
                              <>
                                <Badge
                                  className={cn(
                                    "text-[10px] font-bold",
                                    d.audit.diagramScore >= 4
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                      : d.audit.diagramScore >= 3
                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                                        : "bg-destructive/15 text-destructive hover:bg-destructive/15",
                                  )}
                                >
                                  {d.audit.diagramScore}/4 · {d.audit.verdict}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  Prose link: {d.audit.proseLinkStatus}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600">
                                Library Diagram Attached
                              </Badge>
                            )}
                          </div>
                          {d.audit?.accuracyNote ? (
                            <p className="text-[11px] text-muted-foreground">{d.audit.accuracyNote}</p>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => removeDiagram(d.id)}
                        aria-label={`Remove ${d.label}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>

                    {/* 5-Point Cambridge Vision Audit Grid */}
                    {d.audit ? (
                      <div className="grid gap-1.5 sm:grid-cols-2 text-[11px]">
                        {[
                          { label: "Axes", item: d.audit.axes },
                          { label: "Curves", item: d.audit.curves },
                          { label: "Shifts & Equilibria", item: d.audit.shiftsAndEquilibria },
                          { label: "Shaded Areas", item: d.audit.shadedAreas },
                          { label: "Question Fit", item: d.audit.questionRelevance },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className={cn(
                              "flex items-start gap-1.5 rounded-lg border p-2",
                              row.item.ok
                                ? "border-emerald-500/25 bg-emerald-500/5"
                                : "border-amber-500/35 bg-amber-500/10",
                            )}
                          >
                            {row.item.ok ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 mt-0.5" />
                            ) : (
                              <AlertTriangle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground">{row.label}: </span>
                              <span className="text-muted-foreground">{row.item.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Pinpoint Fixes */}
                    {d.audit && d.audit.fixes.length > 0 ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Quick Fixes for 4/4 Diagram Marks
                        </p>
                        <ul className="space-y-1 text-[11px] text-foreground/90">
                          {d.audit.fixes.map((fix, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5">
                              <ChevronRight className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                              <span>{fix}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* 1-Click Prose Integration Sentence */}
                    {d.referenceSentence ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Ready-to-Insert Diagram Reference (AO2 Linkage)
                        </p>
                        <p className="text-xs italic text-foreground leading-relaxed">
                          "{d.referenceSentence}"
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <CopyButton text={d.referenceSentence} label="Copy" />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1"
                            onClick={() => {
                              handleInsertSentence(
                                d.referenceSentence!,
                                "ao2",
                                "Analytical Body (Diagram Link)",
                                false,
                              );
                              setDiagramDialogOpen(false);
                            }}
                          >
                            <Sparkles className="size-3" /> Insert Diagram Link into Essay
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Diagram Library Picker */}
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <Label className="text-xs font-semibold">Or pick a reference diagram from the Cambridge library</Label>
              <Select onValueChange={applyLibraryDiagram}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a Cambridge 9708 diagram…" />
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

            <Button type="button" className="w-full font-semibold" onClick={() => setDiagramDialogOpen(false)}>
              Done — Return to Live Examiner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiagramCheckDialog
        open={diagramPromptOpen}
        onOpenChange={setDiagramPromptOpen}
        question={question}
        essayText={essayText}
        onAddDiagram={() => setDiagramDialogOpen(true)}
        onProceedAnyway={() => handleGradeNow({ skipDiagramCheck: true })}
      />

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
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
                { label: "Referring Cambridge 9708 Knowledge Base & Mark Schemes", weight: 3 },
                { label: "Dual-Examiner Parallel Evaluation (Pass 1 & Pass 2)", weight: 5 },
                { label: "Checking Assessment Objectives: AO1 Knowledge · AO2 Analysis · AO3 Evaluation", weight: 4 },
                { label: "Synthesizing diagnostic examiner report & actionable feedback", weight: 3 },
              ]}
              totalMs={48_000}
            />
          ) : gradeMutation.data ? (
            <div className="space-y-4">
              <MarkBreakdown grading={gradeMutation.data.grading as Grading} />
              {gradeMutation.data.grading.total_mark < gradeMutation.data.grading.max_mark ? (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-700 dark:bg-amber-950/40">
                  <div className="flex items-start gap-2">
                    <Sparkles className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                        Score Maximizer &amp; Perfection Blueprint
                      </p>
                      <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                        Official score: {gradeMutation.data.grading.total_mark}/{gradeMutation.data.grading.max_mark}. View step-by-step improvements to reach a perfect score.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 font-semibold"
                    onClick={() => {
                      setGradeDialogOpen(false);
                      handleOpenScoreMaximizer();
                    }}
                  >
                    <Sparkles className="size-4 mr-1.5" /> Open Score Maximizer
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

      {/* Score Maximizer Dialog */}
      <ScoreMaximizerDialog
        open={scoreMaximizerOpen}
        onOpenChange={setScoreMaximizerOpen}
        question={question}
        level={level}
        maxMark={maxMark}
        currentMark={
          gradeMutation.data?.grading.total_mark ?? predictedMark?.total_mark ?? null
        }
        data={maxOutMutation.data}
        loading={maxOutMutation.isPending}
        error={maxOutMutation.isError}
        onRetry={handleOpenScoreMaximizer}
        onInsertText={handleInsertSentence}
        onReplaceParagraph={handleReplaceWeakestParagraph}
        onOpenDiagramStudio={() => {
          setScoreMaximizerOpen(false);
          setDiagramDialogOpen(true);
        }}
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

function defaultPlacement(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Paragraph 1 (Introduction & Core Definitions)";
    case "ao2":
      return "Paragraph 2 or 3 (Analytical Transmission Mechanism)";
    case "ao3":
      return "Final Section (Evaluative Balance & Synthesis)";
    default:
      return "Essay Body";
  }
}

function defaultPlacementRationale(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Establishes precise conceptual grounding before the analytical steps unfold.";
    case "ao2":
      return "Deepens the step-by-step causal chain showing how one economic effect triggers the next.";
    case "ao3":
      return "Weighs counterarguments, time lags, and assumptions to reach a nuanced, justified conclusion.";
    default:
      return "Integrates the analytical requirement directly into the core essay structure.";
  }
}

function shortPlacement(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Intro (¶1)";
    case "ao2":
      return "Body (¶2)";
    case "ao3":
      return "Evaluation";
    default:
      return "Draft";
  }
}

function ScoreMaximizerDialog({
  open,
  onOpenChange,
  question,
  level,
  maxMark,
  currentMark,
  data,
  loading,
  error,
  onRetry,
  onInsertText,
  onReplaceParagraph,
  onOpenDiagramStudio,
  onShowModelAnswer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  currentMark: number | null;
  data: MaxOutResponse | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onInsertText: (
    text: string,
    targetAo?: "ao1" | "ao2" | "ao3" | "structure",
    placementLabel?: string,
    forceEnd?: boolean,
  ) => void;
  onReplaceParagraph: (beforeQuote: string, afterRewrite: string) => void;
  onOpenDiagramStudio: () => void;
  onShowModelAnswer: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 font-semibold">
              <Sparkles className="mr-1 size-3.5" /> Score Maximizer &amp; Perfection Blueprint
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              NVIDIA 550B Frontier
            </Badge>
            <Badge variant="outline">
              {level === "a2" ? "A Level" : "AS Level"} · {maxMark} Marks
            </Badge>
            {data?.predicted_mark_after !== undefined ? (
              <Badge
                variant="secondary"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
              >
                {currentMark !== null ? `${currentMark}/${maxMark} → ` : "Projected: "}
                {data.predicted_mark_after}/{maxMark}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                Target: Full {maxMark}/{maxMark} (Band 1)
              </Badge>
            )}
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
              NVIDIA 550B Principal Examiner is building your A* Upgrade Blueprint…
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Pinpointing your weakest paragraph for an A* Before/After rewrite, checking diagram-to-prose
              linkage, synthesizing AO3 evaluation, and ranking your highest-value mark gains.
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
            <div className="rounded-xl border border-amber-300/60 bg-linear-to-br from-amber-500/10 via-background to-card p-4 shadow-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Examiner Blueprint Summary</h3>
                    <p className="text-xs font-semibold leading-relaxed text-amber-900 dark:text-amber-200">
                      {data.headline}
                    </p>
                    {data.perfection_summary ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {data.perfection_summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                {data.target_band ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    {data.target_band}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* 1. Weakest Paragraph -> A* Before/After Rewrite */}
            {data.weakest_paragraph_upgrade ? (
              <div className="rounded-xl border border-emerald-500/40 bg-card p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-foreground">
                      Weakest Paragraph → A* Rewrite ({data.weakest_paragraph_upgrade.paragraph_label})
                    </h4>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 text-[10px] font-bold">
                    {data.weakest_paragraph_upgrade.mark_gain}
                  </Badge>
                </div>
                {data.weakest_paragraph_upgrade.why_it_caps_mark ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Why this caps your band:</strong>{" "}
                    {data.weakest_paragraph_upgrade.why_it_caps_mark}
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  {data.weakest_paragraph_upgrade.before_quote ? (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                        Your Current Draft
                      </span>
                      <p className="text-xs leading-relaxed text-foreground/85">
                        "{data.weakest_paragraph_upgrade.before_quote}"
                      </p>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "rounded-lg border border-emerald-500/35 bg-emerald-500/5 p-3 space-y-1",
                      !data.weakest_paragraph_upgrade.before_quote && "md:col-span-2",
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Top-Band Cambridge 9708 A* Upgrade
                    </span>
                    <p className="text-xs leading-relaxed text-foreground">
                      {data.weakest_paragraph_upgrade.after_rewrite}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <CopyButton text={data.weakest_paragraph_upgrade.after_rewrite} label="Copy Rewrite" />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      onReplaceParagraph(
                        data.weakest_paragraph_upgrade!.before_quote,
                        data.weakest_paragraph_upgrade!.after_rewrite,
                      );
                      onOpenChange(false);
                    }}
                  >
                    <ArrowRight className="size-3.5" /> Apply A* Rewrite to Draft
                  </Button>
                </div>
              </div>
            ) : null}

            {/* 2. Diagram-to-Prose Bridge Upgrade */}
            {data.diagram_upgrade ? (
              <div className="rounded-xl border border-blue-500/35 bg-blue-500/[0.04] p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="size-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-bold text-foreground">
                      Diagram Blueprint: {data.diagram_upgrade.diagram_title}
                    </h4>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 text-[10px] font-bold">
                    {data.diagram_upgrade.mark_gain}
                  </Badge>
                </div>
                {data.diagram_upgrade.what_to_draw ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">What to draw / verify:</strong>{" "}
                    {data.diagram_upgrade.what_to_draw}
                  </p>
                ) : null}
                {data.diagram_upgrade.labels_to_include.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                      Must-have labels:
                    </span>
                    {data.diagram_upgrade.labels_to_include.map((lbl, lIdx) => (
                      <Badge key={lIdx} variant="outline" className="text-[10px] font-mono bg-background">
                        {lbl}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {data.diagram_upgrade.text_integration_sentence ? (
                  <div className="rounded-lg border border-blue-500/25 bg-background/80 p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Diagram-to-Prose Linkage Sentence
                    </span>
                    <p className="text-xs italic leading-relaxed text-foreground">
                      "{data.diagram_upgrade.text_integration_sentence}"
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={onOpenDiagramStudio}
                      >
                        <ImagePlus className="size-3" /> Open Diagram Studio
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs font-semibold gap-1"
                        onClick={() => {
                          onInsertText(
                            data.diagram_upgrade!.text_integration_sentence,
                            "ao2",
                            "Body (Diagram Integration)",
                            false,
                          );
                          onOpenChange(false);
                        }}
                      >
                        Insert Diagram Link
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 3. AO3 A* Evaluation Synthesis Booster */}
            {data.evaluation_booster ? (
              <div className="rounded-xl border border-purple-500/35 bg-purple-500/[0.04] p-4 shadow-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-sm font-bold text-foreground">
                      AO3 Evaluation Booster: {data.evaluation_booster.angle_title || "Decisive Cambridge Synthesis"}
                    </h4>
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 text-[10px] font-bold">
                    {data.evaluation_booster.mark_gain}
                  </Badge>
                </div>
                {data.evaluation_booster.why_examiners_reward_it ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.evaluation_booster.why_examiners_reward_it}
                  </p>
                ) : null}
                <div className="rounded-lg border border-purple-500/25 bg-background/80 p-3 space-y-2">
                  <p className="text-xs leading-relaxed text-foreground italic">
                    "{data.evaluation_booster.ready_paragraph}"
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <CopyButton text={data.evaluation_booster.ready_paragraph} label="Copy Evaluation" />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1"
                      onClick={() => {
                        onInsertText(
                          data.evaluation_booster!.ready_paragraph,
                          "ao3",
                          "Evaluative Conclusion",
                          true,
                        );
                        onOpenChange(false);
                      }}
                    >
                      Insert Evaluation Paragraph
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Individual Upgrade Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Step-by-step Improvements ({data.suggestions.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Apply these upgrades to reach full marks
                </span>
              </div>

              {data.suggestions.map((suggestion, index) => {
                const placementText =
                  suggestion.placement || defaultPlacement(suggestion.target_ao);
                const placementReason =
                  suggestion.placement_rationale ||
                  defaultPlacementRationale(suggestion.target_ao);
                const exemplarText = suggestion.model_phrasing || suggestion.suggestion;

                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-border/90 space-y-3.5"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-foreground text-sm">
                          {suggestion.title}
                        </h4>
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

                    {/* Diagnostic suggestion */}
                    <p className="text-xs leading-relaxed text-foreground/90">
                      {suggestion.suggestion}
                    </p>

                    {/* Placement Guidance */}
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground text-[11px]">
                          Where to place this: <span className="text-primary">{placementText}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">{placementReason}</p>
                      </div>
                    </div>

                    {/* How to Write Step-by-Step Checklist */}
                    {suggestion.how_to_write && suggestion.how_to_write.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          How to Construct This Point
                        </p>
                        <ul className="space-y-1">
                          {suggestion.how_to_write.map((step, sIdx) => (
                            <li
                              key={sIdx}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Strategic Argument Options */}
                    {suggestion.strategic_options && suggestion.strategic_options.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Strategic Economic Angles (Click starter to insert)
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {suggestion.strategic_options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-1.5 flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                {opt.label ? (
                                  <p className="text-xs font-semibold text-foreground">
                                    {opt.label}
                                  </p>
                                ) : null}
                                {opt.description ? (
                                  <p className="text-[11px] text-muted-foreground leading-snug">
                                    {opt.description}
                                  </p>
                                ) : null}
                              </div>
                              {opt.sentence_starter ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onInsertText(
                                      opt.sentence_starter!,
                                      suggestion.target_ao,
                                      placementText,
                                      false,
                                    );
                                    onOpenChange(false);
                                  }}
                                  className="text-left rounded border border-primary/30 bg-primary/5 hover:bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary transition-colors"
                                >
                                  + "{opt.sentence_starter}"
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Top-Band Exemplar Phrasing Box */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Sparkles className="size-3" /> Top-Band Cambridge 9708 Phrasing
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Ready to insert into {shortPlacement(suggestion.target_ao)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground italic">
                        "{exemplarText}"
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <CopyButton text={exemplarText} label="Copy Phrasing" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            onInsertText(
                              exemplarText,
                              suggestion.target_ao,
                              "End of Draft",
                              true,
                            );
                            onOpenChange(false);
                          }}
                        >
                          Append to End
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs gap-1 font-semibold"
                          onClick={() => {
                            onInsertText(
                              exemplarText,
                              suggestion.target_ao,
                              placementText,
                              false,
                            );
                            onOpenChange(false);
                          }}
                        >
                          Insert into {shortPlacement(suggestion.target_ao)}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
