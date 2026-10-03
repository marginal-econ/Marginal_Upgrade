import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  GraduationCap,
  ImagePlus,
  Loader2,
  PenLine,
  LockKeyhole,
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
import { gradeEssaySubmission } from "@/lib/grading.functions";
import {
  getLiveExaminerSession,
  getMaxOutSuggestions,
  prepareLiveExaminerContext,
  saveLiveExaminerSession,
  type MaxOutSuggestion,
} from "@/lib/live-examiner.functions";
import { topicsFor } from "@/lib/diagrams/catalog";
import { isDailyLimitError } from "@/lib/usage-limits";
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

  // --- "Max out this answer": once a student has finished writing and
  // graded it, a further, deeper suggestion pass on demand — what exactly
  // to add or change to close the gap to full marks. Separate call from
  // grading itself, triggered by its own button so it's never run unless
  // the student actually wants it. ------------------------------------
  const maxOutFn = useServerFn(getMaxOutSuggestions);
  const maxOutMutation = useMutation({
    mutationFn: () => {
      const grading = gradeMutation.data!.grading;
      return maxOutFn({
        data: {
          question,
          level,
          maxMark,
          essayText,
          contextBlock,
          totalMark: grading.total_mark,
          band: grading.band,
          weaknesses: grading.weaknesses,
          missingElements: grading.missing_elements,
          actionableFeedback: grading.actionable_feedback,
        },
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
  const contextMutation = useMutation({
    mutationFn: () => prepareContext({ data: { level, topic, question } }),
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
  } = useLiveExaminerCheck({
    text: textForCheck,
    question,
    level,
    maxMark,
    contextBlock,
    enabled: started && contextMutation.isSuccess,
  });

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

  return (
    <>
      <PageHeader
        title="Live Examiner"
        description="Write your answer and get instant, syllabus-grounded feedback as you go — grammar, clarity, economics accuracy, analysis, application, evaluation and terminology."
      />

      {!started ? (
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          {limitNotice ? (
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
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <section className="min-w-0 space-y-3 border-border p-5 lg:border-r md:p-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{level === "a2" ? "A Level" : "AS Level"}</Badge>
              <Badge variant="outline">{topic}</Badge>
              <Badge variant="outline">{maxMark} marks</Badge>
              
              {/* Word Count Indicator with Tariff Target */}
              {(() => {
                const targetMin = maxMark === 8 ? 250 : maxMark === 12 ? 450 : 750;
                const targetMax = maxMark === 8 ? 350 : maxMark === 12 ? 650 : 1000;
                const isOptimal = wordCount >= targetMin && wordCount <= targetMax;
                const isUnder = wordCount < targetMin;
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2.5 py-0.5 font-medium transition-colors",
                      isOptimal
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : isUnder && wordCount > 0
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "",
                    )}
                  >
                    {wordCount} words {wordCount > 0 ? (isOptimal ? "✓ In Target Zone" : `(Target: ${targetMin}–${targetMax})`) : `(Target: ${targetMin}–${targetMax})`}
                  </Badge>
                );
              })()}

              {sourceCount > 0 ? (
                <Badge variant="outline">
                  <GraduationCap className="mr-1 size-3" /> {sourceCount} syllabus source
                  {sourceCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {anchorsUsed > 0 ? (
                <Badge variant="outline">
                  <CheckCircle2 className="mr-1 size-3" /> {anchorsUsed} calibration anchor
                  {anchorsUsed === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {diagrams.map((d) => (
                <Badge key={d.id} variant="outline" className="gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" /> {d.label}
                  <button
                    type="button"
                    onClick={() => removeDiagram(d.id)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${d.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setDiagramDialogOpen(true)}
              >
                <ImagePlus className="size-3.5" />
                {diagrams.length > 0 ? "Add diagram" : "Attach diagram"}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs">
                    <ClipboardPaste className="size-3.5" />
                    {markSchemeImages.length > 0
                      ? `Mark scheme (${markSchemeImages.length})`
                      : "Attach mark scheme"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-2" align="start">
                  <p className="text-xs text-muted-foreground">
                    Paste a screenshot of the relevant mark scheme page — the examiner reads it
                    directly, on top of your knowledge base, when you grade this answer.
                  </p>
                  <MarkSchemeScreenshots
                    images={markSchemeImages}
                    onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
                    onRemove={(id) =>
                      setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
                    }
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleGradeNow}
              >
                <Sparkles className="size-3.5" /> Grade now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setRestartDialogOpen(true)}
              >
                <RotateCcw className="size-3.5" /> Restart exam
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs"
                onClick={() => setStarted(false)}
              >
                Change question
              </Button>
            </div>

            {/* Question prompt card */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Examination Question ({maxMark} Marks)
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-foreground">{question}</p>
                </div>
              </div>
            </div>

            {/* Editor Container */}
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2 text-foreground">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live Examiner Editor
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {level === "a2" ? "A Level" : "AS Level"} · {maxMark} marks
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border/60 bg-muted/15 px-4 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-ao1" /> AO1 Knowledge
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-ao2" /> AO2 Analysis
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-ao3" /> AO3 Evaluation
                </span>
                <span className="ml-auto text-muted-foreground">
                  Underlined phrases indicate active Cambridge AO credit
                </span>
              </div>
              <LiveExaminerEditor
                value={essayText}
                onChange={setEssayText}
                issues={issues}
                classifications={classifications}
                onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
                onDismiss={dismissIssue}
                placeholder="Start writing your answer here… The Live Examiner will evaluate your sentences in real-time."
                className="min-h-[62vh] p-4 text-[15px] leading-[1.8]"
              />
            </div>
          </section>

          <aside className="min-w-0 p-4 md:p-5">
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

      <Dialog open={modelAnswerOpen} onOpenChange={setModelAnswerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete model answer</DialogTitle>
            <DialogDescription>
              Compare this only after attempting all three hints. Focus on what the answer adds,
              links, and evaluates—not on memorising its wording.
            </DialogDescription>
          </DialogHeader>
          {fullAnswerMutation.data ? <ModelAnswer essay={fullAnswerMutation.data.essay} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** AO badge colour, reusing the same palette meaning elsewhere in the app:
 *  knowledge/ao1, analysis/ao2, evaluation/ao3, plus a neutral one for
 *  general structural suggestions that don't map to a single AO. */
function aoLabel(target: MaxOutSuggestion["target_ao"]): string {
  switch (target) {
    case "ao1":
      return "Knowledge";
    case "ao2":
      return "Analysis";
    case "ao3":
      return "Evaluation";
    default:
      return "Structure";
  }
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
        mark_uplift: "",
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
            Hints to improve your mark
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
            <div key={index} className="rounded-md border bg-background p-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span>
                  Hint {index + 1}: {hint.title}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {aoLabel(hint.target_ao)}
                </Badge>
              </div>
              <p className="mt-1 leading-relaxed text-muted-foreground">{hint.suggestion}</p>
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
