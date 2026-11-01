import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  GraduationCap,
  ImagePlus,
  Images,
  Loader2,
  ShieldCheck,
  SpellCheck,
  Sparkles,
  Upload,
  X,
  PenLine,
  Building2,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { ChainedChamber } from "@/components/app/chained-chamber";
import { GradingProgress } from "@/components/app/grading-progress";
import { HandwritingUpload } from "@/components/app/handwriting-upload";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import {
  MarkSchemeScreenshots,
  type MarkSchemeImage,
} from "@/components/app/mark-scheme-screenshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  describeDiagramImage,
  describeDiagramUrl,
  listDiagramLibrary,
} from "@/lib/diagrams.functions";
import { checkQuestionGrounding, gradeEssaySubmission, syncLiveEssayDraft } from "@/lib/grading.functions";
import { gradeAssignmentSubmission } from "@/lib/classroom.functions";
import { checkWritingQuality } from "@/lib/writing-check.functions";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { getMe } from "@/lib/account.functions";
import { cn } from "@/lib/utils";
import type { Grading } from "@/lib/examiner/types";

// Optional prefill from the Question bank, Practice desk, or Classroom Direct Grading
const gradeSearchSchema = z
  .object({
    q: z.string().trim().max(2000).optional().catch(undefined),
    marks: z
      .union([
        z.literal(8),
        z.literal(12),
        z.literal(20),
        z.literal("8"),
        z.literal("12"),
        z.literal("20"),
      ])
      .optional()
      .transform((val) => (val ? (Number(val) as 8 | 12 | 20) : undefined))
      .catch(undefined),
    text: z.string().optional().catch(undefined),
    assignmentId: z.string().uuid().optional().catch(undefined),
    studentId: z.string().uuid().optional().catch(undefined),
    classroomId: z.string().uuid().optional().catch(undefined),
    studentName: z.string().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/grade")({
  validateSearch: (search: Record<string, unknown>) => gradeSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Mark an essay — Marginal Economics" },
      {
        name: "description",
        content:
          "Submit a Cambridge 9708 Economics essay and get an examiner-standard mark with AO1, AO2 and AO3 breakdown plus rewrite guidance.",
      },
      { property: "og:title", content: "Mark an essay — Marginal Economics" },
      {
        property: "og:description",
        content: "Examiner-standard marking with a full assessment-objective breakdown.",
      },
    ],
  }),
  component: GradePage,
});

type WritingIssue = {
  original: string;
  suggestion: string;
  type: "spelling" | "grammar";
  context: string;
  explanation?: string;
};
type WritingCheck = {
  issues: WritingIssue[];
  correctedText: string;
  clean: boolean;
  engine?: "in_house" | "ai";
};

type AttachedDiagram = { id: string; label: string; tag: string };

function GradePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const grade = useServerFn(gradeEssaySubmission);
  const checkGrounding = useServerFn(checkQuestionGrounding);
  const checkWriting = useServerFn(checkWritingQuality);
  const describeDiagramImg = useServerFn(describeDiagramImage);
  const describeDiagramLink = useServerFn(describeDiagramUrl);
  const listDiagrams = useServerFn(listDiagramLibrary);

  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });
  const sub = meQuery.data?.subscription;
  const isAdmin = meQuery.data?.isAdmin ?? false;
  const isTeacher = meQuery.data?.role === "teacher" || Boolean(sub?.isTeacher);
  const isTeacherUnpaid = isTeacher && !sub?.isPaid && !isAdmin;
  const isLimitReached = false;

  const DRAFT_STORAGE_KEY = "marginal_essay_draft_v1";

  const gradeSubmissionFn = useServerFn(gradeAssignmentSubmission);
  const [isReturningGrade, setIsReturningGrade] = useState(false);
  const isDirectGradingMode = Boolean(search.assignmentId && search.studentId && search.classroomId);

  const [question, setQuestion] = useState(() => {
    if (search.q) return search.q;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.question) return parsed.question;
        }
      } catch {}
    }
    return "";
  });

  const groundingQuery = useQuery({
    queryKey: ["question-grounding", question.trim()],
    queryFn: () => checkGrounding({ data: { question: question.trim() } }),
    enabled: question.trim().length >= 15,
    staleTime: 5 * 60_000,
  });

  const [essayText, setEssayText] = useState(() => {
    if (search.text) return search.text;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.essayText) return parsed.essayText;
        }
      } catch {}
    }
    return "";
  });

  const [maxMark, setMaxMark] = useState(() => {
    if (search.marks) return String(search.marks);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.maxMark) return String(parsed.maxMark);
        }
      } catch {}
    }
    return "12";
  });

  // Sync state if direct grading search params arrive
  useEffect(() => {
    if (search.q) setQuestion(search.q);
    if (search.text) setEssayText(search.text);
    if (search.marks) setMaxMark(String(search.marks));
  }, [search.q, search.text, search.marks]);

  const handleReturnToClassroom = async () => {
    if (!search.assignmentId || !search.studentId || !search.classroomId || !result) return;
    setIsReturningGrade(true);
    try {
      const feedback = result.grading.overall_comment || "";
      await gradeSubmissionFn({
        data: {
          assignmentId: search.assignmentId,
          studentId: search.studentId,
          classroomId: search.classroomId,
          teacherScore: result.grading.total_mark,
          teacherFeedback: feedback,
          returnToStudent: true,
        },
      });
      toast.success(`Grade returned to ${search.studentName || "student"} in Classroom!`);
      navigate({
        to: "/classes/$classroomId",
        params: { classroomId: search.classroomId },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to return grade to student.");
    } finally {
      setIsReturningGrade(false);
    }
  };

  const syncDraftFn = useServerFn(syncLiveEssayDraft);

  // Autosave question, essay answer, and maxMark across page navigation & sync live draft to God Mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (question.trim() || essayText.trim()) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            question,
            essayText,
            maxMark,
            updatedAt: Date.now(),
          }),
        );
      }
    } catch {}

    const timer = window.setTimeout(() => {
      if (question.trim() || essayText.trim()) {
        void syncDraftFn({
          data: {
            question,
            essayText,
            maxMark: Number(maxMark) || 12,
            wordCount: essayText.trim() ? essayText.trim().split(/\s+/).length : 0,
          },
        }).catch(() => {});
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [question, essayText, maxMark, syncDraftFn]);

  // Load auto-drafted essay from Cambridge Chat if transferred
  useEffect(() => {
    try {
      const prefillDraft = sessionStorage.getItem("marginal_prefill_draft");
      const prefillQ = sessionStorage.getItem("marginal_prefill_q");
      if (prefillDraft) {
        setEssayText(prefillDraft);
        sessionStorage.removeItem("marginal_prefill_draft");
        toast.info("Auto-drafted Cambridge essay loaded into grader.");
      }
      if (prefillQ && !question) {
        setQuestion(prefillQ);
        sessionStorage.removeItem("marginal_prefill_q");
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [question]);
  const [auditPass, setAuditPass] = useState(true);
  // Spelling/grammar is a proofreading nicety, not a hard gate — some
  // people want it every time, others (especially re-marking a script
  // they've already proofread themselves) just want to mark straight away.
  // Optional and on by default; turning it off skips the check entirely
  // instead of forcing that extra round trip before marking can start.
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [result, setResult] = useState<{ grading: Grading; essayId: string | null } | null>(null);

  // A student can reference more than one diagram in the same essay (e.g. a
  // supply/demand diagram AND a PPC diagram) — each attached diagram becomes
  // its own [DIAGRAM: ...] tag, and all of them are joined together when the
  // essay is submitted for marking.
  const [diagrams, setDiagrams] = useState<AttachedDiagram[]>([]);
  const [diagramMode, setDiagramMode] = useState<"none" | "upload" | "library" | "url">("none");
  const [diagramLibraryId, setDiagramLibraryId] = useState<string>("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const diagramFileInputRef = useRef<HTMLInputElement>(null);
  const diagramCameraInputRef = useRef<HTMLInputElement>(null);
  const [isDiagramDragging, setIsDiagramDragging] = useState(false);

  // A pasted screenshot of the mark scheme, sent to the examiner as an
  // actual image (vision) alongside the retrieved text context — see
  // grading.functions.ts / grade.server.ts.
  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);

  const [writingCheck, setWritingCheck] = useState<WritingCheck | null>(null);
  const [checkedTextSnapshot, setCheckedTextSnapshot] = useState<string | null>(null);
  const [grammarCheckEngine, setGrammarCheckEngine] = useState<"in_house" | "ai">("in_house");
  const resultRef = useRef<HTMLDivElement>(null);

  const diagramLibraryQuery = useQuery({
    queryKey: ["diagram-library"],
    queryFn: () => listDiagrams(),
    staleTime: 10 * 60_000,
  });

  const describeDiagramImageMutation = useMutation({
    mutationFn: ({ image, label }: { image: string; label?: string }) =>
      describeDiagramImg({ data: { image } }).then((res) => ({ ...res, label })),
    onSuccess: (data) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: data.label || "Uploaded diagram", tag: data.tag },
      ]);
      setDiagramMode("none");
      toast.success("Diagram image read and attached to your essay.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const describeDiagramUrlMutation = useMutation({
    mutationFn: (url: string) => describeDiagramLink({ data: { url } }),
    onSuccess: (data) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: "Diagram from URL", tag: data.tag },
      ]);
      setDiagramUrl("");
      setDiagramMode("none");
      toast.success("Diagram read and attached to your essay.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleDiagramFiles(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|heic|heif|bmp|gif|avif|tiff?)$/i.test(file.name);
      if (!isImage) {
        toast.error(`${file.name} is not an image file (PNG, JPEG, WebP, HEIC).`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        describeDiagramImageMutation.mutate({ image: dataUrl, label: file.name });
      };
      reader.onerror = () => toast.error(`Could not read diagram image: ${file.name}`);
      reader.readAsDataURL(file);
    }
  }

  const runInHouseCheck = useCallback(() => {
    if (!essayText.trim() || essayText.trim().split(/\s+/).length < 5) {
      toast.info("Please write at least a few sentences before running grammar check.");
      return;
    }
    const sentences = splitSentences(essayText);
    const rawIssues = analyzeGrammarAndMechanics(sentences);
    // Explicit safeguard: Never flag capital "I"
    const safeIssues = rawIssues.filter((iss) => iss.original.trim() !== "I");

    let workingText = essayText;
    for (const iss of safeIssues) {
      if (iss.original && iss.suggestion && iss.original !== iss.suggestion) {
        workingText = workingText.split(iss.original).join(iss.suggestion);
      }
    }

    const formattedIssues: WritingIssue[] = safeIssues.map((iss) => ({
      original: iss.original,
      suggestion: iss.suggestion,
      type: iss.category === "grammar" ? "grammar" : "spelling",
      context: iss.context,
      explanation: iss.explanation,
    }));

    setWritingCheck({
      issues: formattedIssues,
      correctedText: workingText,
      clean: formattedIssues.length === 0,
      engine: "in_house",
    });
    setCheckedTextSnapshot(essayText);
    if (formattedIssues.length === 0) {
      toast.success("In-House Engine: No grammar issues or economic misconceptions found.");
    } else {
      toast.info(`In-House Engine: Found ${formattedIssues.length} suggestion${formattedIssues.length === 1 ? "" : "s"}.`);
    }
  }, [essayText]);

  const checkMutation = useMutation({
    mutationFn: () => checkWriting({ data: { essayText } }),
    onSuccess: (data) => {
      // Safeguard: Filter out any accidental capital "I" issue
      const issues = (data.issues as WritingIssue[]).filter((iss) => iss.original.trim() !== "I");
      setWritingCheck({
        issues,
        correctedText: data.correctedText,
        clean: issues.length === 0,
        engine: "ai",
      });
      setCheckedTextSnapshot(essayText);
      if (issues.length === 0) toast.success("AI Proofreader: No spelling or grammar issues found.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mutation = useMutation({
    mutationFn: () =>
      grade({
        data: {
          question,
          essayText,
          maxMark: Number(maxMark),
          auditPass,
          diagramReference:
            diagrams.length > 0 ? diagrams.map((d) => d.tag).join("\n\n") : undefined,
          markSchemeImageDataUrls:
            markSchemeImages.length > 0 ? markSchemeImages.map((img) => img.dataUrl) : undefined,
        },
      }),
    onSuccess: (data) => {
      setResult({ grading: data.grading as Grading, essayId: data.essayId });
      queryClient.invalidateQueries({ queryKey: ["essays"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        duration: 5000,
      });
    },
  });

  useEffect(() => {
    if (resultRef.current && (mutation.isPending || result)) {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [mutation.isPending, result]);

  const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  // Any edit to the essay after a check invalidates it, so a stale "clean"
  // result can never be carried into a since-edited essay.
  const checkIsStale = writingCheck !== null && checkedTextSnapshot !== essayText;
  const readyToMark = !spellCheckEnabled || (writingCheck !== null && !checkIsStale);

  function applyLibraryDiagram(id: string) {
    const entry = diagramLibraryQuery.data?.find((item) => item.id === id);
    if (!entry) return;
    const curves = entry.curveLabels.filter(Boolean).join(", ") || "not specified";
    const tag =
      `[DIAGRAM: ${entry.title} | axes: ${entry.yLabel} (y) / ${entry.xLabel} (x) | ` +
      `curves: ${curves} | labels: as per the standard ${entry.title} diagram | ` +
      `accuracy: reference diagram selected from the diagram library by the student — verify it is correctly applied to their written argument]`;
    setDiagrams((current) => [...current, { id: crypto.randomUUID(), label: entry.title, tag }]);
    setDiagramLibraryId("");
    setDiagramMode("none");
  }

  function removeDiagram(id: string) {
    setDiagrams((current) => current.filter((d) => d.id !== id));
  }

  function handleMarkClick() {
    if (isLimitReached) {
      toast.error(
        isTeacher
          ? "Plan limit reached: You've completed your 3 free educator trial evaluations. Upgrade to an Educator AI Pass (from ₹99/mo) to continue."
          : "Plan limit reached: You've completed your 2 free essays. Redirecting to pricing...",
        {
          duration: 4000,
        }
      );
      navigate({ to: "/pricing" });
      return;
    }
    if (!readyToMark) {
      if (grammarCheckEngine === "in_house") {
        runInHouseCheck();
      } else {
        checkMutation.mutate();
      }
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Mark an essay"
        description="Marked to Cambridge 9708 standards, grounded in your own coursebook and mark schemes, then independently audited for central-tendency bias."
      />

      {isLimitReached ? (
        <ChainedChamber
          badgeText={
            isTeacherUnpaid
              ? "Teacher AI Pass Required"
              : `Limit Reached · ${sub?.essaysGradedCount ?? 2}/${sub?.essaysLimit ?? 2} Essays Used`
          }
          title={isTeacherUnpaid ? "Unlock Teacher AI Grading & Moderation" : "Essay Grader is Chained"}
          description={
            isTeacherUnpaid
              ? "Teacher accounts require an active Educator AI Pass (from ₹99/mo) or School Department License to grade essays directly. Student homework assignments in your Cambridge classrooms are covered under your students' accounts."
              : `You have completed your included Cambridge essay evaluations for your ${sub?.tierName ?? "Free Tier"} account. Upgrade your revision pass to unlock additional essay evaluations, Live Examiner credits, and full Cambridge mark schemes.`
          }
          primaryCtaText={isTeacherUnpaid ? "Unlock Educator AI Pass (from ₹99/mo)" : "Unlock Plan from ₹99/mo"}
          primaryCtaLink="/pricing"
          secondaryCtaText={isTeacherUnpaid ? "View School Department Licensing" : "View Previous Submissions"}
          secondaryCtaLink={isTeacherUnpaid ? "/pricing" : "/showcase"}
          features={
            isTeacherUnpaid
              ? [
                  {
                    icon: Sparkles,
                    iconColor: "text-amber-500",
                    title: "Educator AI Pass (From ₹99/mo)",
                    description: "Subscribe individually to grade student essays, test mark schemes, and generate exemplar Cambridge answers.",
                  },
                  {
                    icon: Building2,
                    iconColor: "text-primary",
                    title: "School Department Licensing",
                    description: "License 50 to 400+ student seats for your department with teacher administrative seats and moderation tools.",
                  },
                  {
                    icon: Users,
                    iconColor: "text-purple-500",
                    title: "Students Submit with Their Own Quotas",
                    description: "Students enrolled in your classrooms submit essay assignments using their own student tier quotas (2 free + upgrades).",
                  },
                ]
              : [
                  {
                    icon: PenLine,
                    iconColor: "text-primary",
                    title: "Higher Monthly Essay Quota",
                    description: "Get 10 essays/mo on Foundation, 30 essays/mo on Pro, or Unlimited essays on Cambridge Elite.",
                  },
                  {
                    icon: Sparkles,
                    iconColor: "text-amber-500",
                    title: "Clause-by-Clause Cambridge Grounding",
                    description: "Audited against 1,400+ published mark schemes with sentence-level AO1/AO2/AO3 allocations.",
                  },
                  {
                    icon: Zap,
                    iconColor: "text-emerald-500",
                    title: "Live Examiner Keystroke Credits",
                    description: "Real-time socratic coaching and grammar checking as you draft your answers.",
                  },
                  {
                    icon: ShieldCheck,
                    iconColor: "text-blue-500",
                    title: "Dual-Pass Auditor Bias Elimination",
                    description: "Stops AI central-tendency clumping and awards genuine distinction marks.",
                  },
                ]
          }
        />
      ) : (
        <>
          {isDirectGradingMode && (
            <div className="px-3.5 pt-3 pb-0 sm:px-6 sm:pt-4 md:px-8">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Teacher Direct Grading Desk
                      </span>
                      <Badge className="bg-purple-900/80 text-purple-200 border-purple-700 text-[10px]">
                        Class Assignment Submission
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      Directly evaluating submission for:{" "}
                      <strong className="text-purple-300">{search.studentName || "Student"}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/classes/$classroomId",
                        params: { classroomId: search.classroomId! },
                      })
                    }
                    className="border-purple-700/60 text-purple-200 hover:text-white hover:bg-purple-900/40 text-xs"
                  >
                    Back to Classroom
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="px-3.5 pt-3 pb-0 sm:px-6 sm:pt-4 md:px-8">
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2 text-[11px] sm:text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 sm:size-4 shrink-0 text-primary" />
              <p className="leading-snug sm:leading-relaxed">
                <span className="text-foreground font-semibold">Cambridge 9708 Standard:</span>{" "}
                Calibrated against official assessment guidelines. Independent study platform.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 px-3.5 py-3 sm:py-5 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="panel space-y-3.5 sm:space-y-4 p-3.5 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="question" className="text-xs sm:text-sm font-semibold text-foreground">
                    Exam question
                  </Label>
                  <Link
                    to="/response-structure"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
                  >
                    Structure guide
                  </Link>
                </div>
                <Textarea
                  id="question"
                  rows={2}
                  className="min-h-[64px] sm:min-h-[80px] text-xs sm:text-sm"
                  placeholder="Discuss whether a rise in the minimum wage will always reduce employment."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
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
                          <span className="font-semibold">No specific mark scheme or book reference found</span>
                          <p className="text-amber-200/80 leading-normal">
                            Paste or attach a screenshot of the official mark scheme below for question-specific grounding, or this essay will be marked against standard Cambridge AO level rubrics.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxMark" className="text-xs sm:text-sm font-semibold text-foreground">
                  Question type
                </Label>
                <Select
                  value={maxMark}
                  onValueChange={(value) => {
                    setMaxMark(value);
                    setWritingCheck(null);
                  }}
                >
                  <SelectTrigger id="maxMark" className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">
                      8 marks (normal 8-mark question — AO1 2 / AO2 4 / AO3 2)
                    </SelectItem>
                    <SelectItem value="12">
                      12 marks (AS evaluative essay — AO1 2 / AO2 6 / AO3 4)
                    </SelectItem>
                    <SelectItem value="20">
                      20 marks (A Level extended essay — AO1 2 / AO2 12 / AO3 6)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="essay" className="text-xs sm:text-sm font-semibold text-foreground">
                    Your answer
                  </Label>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">{words} words</span>
                </div>
                <Textarea
                  id="essay"
                  rows={8}
                  className="font-sans text-xs sm:text-[15px] leading-relaxed sm:leading-[1.8] p-3 sm:p-4 rounded-xl min-h-[160px] sm:min-h-[280px]"
                  placeholder="Paste or type your full essay here, or upload handwritten pages below…"
                  value={essayText}
                  onChange={(event) => {
                    setEssayText(event.target.value);
                    setWritingCheck(null);
                  }}
                />
              </div>

              <HandwritingUpload
                hint={question}
                onText={(text) => {
                  setEssayText((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
                  setWritingCheck(null);
                }}
              />

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Diagram references (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Typed your essay online and referred to one or more diagrams without drawing them?
              Attach each one so it's marked like a diagram drawn on the page — pick from the
              diagram library, or paste a link to an image of it.
            </p>

            {diagrams.length > 0 ? (
              <ul className="space-y-1.5">
                {diagrams.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5 text-xs"
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

            <Select
              value={diagramMode}
              onValueChange={(value: "none" | "upload" | "library" | "url") => setDiagramMode(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a diagram…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {diagrams.length > 0 ? "No more diagrams to add" : "No diagram to reference"}
                </SelectItem>
                <SelectItem value="upload">Upload diagram image / photo</SelectItem>
                <SelectItem value="library">Choose from the diagram library</SelectItem>
                <SelectItem value="url">Paste a diagram image URL</SelectItem>
              </SelectContent>
            </Select>

            {diagramMode === "upload" ? (
              <div className="space-y-2">
                {/* Photo Library / Gallery Input - uncaptured to open photo gallery */}
                <input
                  ref={diagramFileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleDiagramFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {/* Camera Input - explicit environment capture */}
                <input
                  ref={diagramCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleDiagramFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!describeDiagramImageMutation.isPending) {
                      diagramFileInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !describeDiagramImageMutation.isPending) {
                      e.preventDefault();
                      diagramFileInputRef.current?.click();
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.files;
                    if (items && items.length > 0) {
                      e.preventDefault();
                      handleDiagramFiles(items);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDiagramDragging(true);
                  }}
                  onDragLeave={() => setIsDiagramDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDiagramDragging(false);
                    const files = e.dataTransfer?.files;
                    if (files && files.length > 0) {
                      handleDiagramFiles(files);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    isDiagramDragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted/30"
                  } ${describeDiagramImageMutation.isPending ? "opacity-70 pointer-events-none" : ""}`}
                >
                  {describeDiagramImageMutation.isPending ? (
                    <div className="flex items-center gap-2 text-primary font-medium text-xs">
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing diagram and extracting economic labels…
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                        <Upload className="size-4 text-primary" />
                        Click to upload diagram image, drag &amp; drop, or paste (Ctrl+V)
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Supports PNG, JPEG, WebP, HEIC photos of hand-drawn diagrams, or digital exports
                      </p>
                    </>
                  )}
                </div>

                {!describeDiagramImageMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => diagramFileInputRef.current?.click()}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Images className="size-3.5 text-primary" />
                      Photos / Gallery
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => diagramCameraInputRef.current?.click()}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Camera className="size-3.5 text-primary" />
                      Take Photo
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {diagramMode === "library" ? (
              <Select value={diagramLibraryId} onValueChange={applyLibraryDiagram}>
                <SelectTrigger>
                  <SelectValue placeholder="Search the diagram library…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(diagramLibraryQuery.data ?? []).map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title} · {entry.section === "Microeconomics" ? "Micro" : "Macro"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {diagramMode === "url" ? (
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/my-diagram.png"
                  value={diagramUrl}
                  onChange={(event) => setDiagramUrl(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!diagramUrl.trim() || describeDiagramUrlMutation.isPending}
                  onClick={() => describeDiagramUrlMutation.mutate(diagramUrl.trim())}
                >
                  {describeDiagramUrlMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Read diagram"
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Mark scheme screenshot (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Paste a screenshot of the relevant mark scheme page and the examiner will read it
              directly — on top of your knowledge base — while marking this essay.
            </p>
            <MarkSchemeScreenshots
              images={markSchemeImages}
              onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
              onRemove={(id) =>
                setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <Toggle
              label="Independent audit pass"
              hint="A second examiner re-checks the mark to correct clustering around the middle bands."
              checked={auditPass}
              onChange={setAuditPass}
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" />
              Every mark is grounded in your knowledge base and any calibration anchors you've set
              up — this always runs now, not just when it happens to help.
            </p>
            <Toggle
              label="Spelling & grammar check"
              hint="Quick proofreading pass before marking — optional, and never changes economics content or marks. Turn off to mark straight away."
              checked={spellCheckEnabled}
              onChange={(value) => {
                setSpellCheckEnabled(value);
                if (!value) {
                  setWritingCheck(null);
                  setCheckedTextSnapshot(null);
                }
              }}
            />

            {spellCheckEnabled && (
              <div className="pt-3 border-t border-border/60 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <SpellCheck className="size-3.5 text-primary" /> Proofreading Engine
                  </span>
                  <span className="text-[11px] text-muted-foreground">Select preferred checker</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGrammarCheckEngine("in_house");
                      setWritingCheck(null);
                    }}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer",
                      grammarCheckEngine === "in_house"
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                        : "border-border/80 bg-background/60 hover:bg-background"
                    )}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Zap className="size-3 text-amber-500 fill-amber-500" /> In-House Cambridge Engine
                    </span>
                    <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-relaxed">
                      0ms instant · Subject terminology &amp; misconceptions · Zero tokens
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGrammarCheckEngine("ai");
                      setWritingCheck(null);
                    }}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer",
                      grammarCheckEngine === "ai"
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                        : "border-border/80 bg-background/60 hover:bg-background"
                    )}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Sparkles className="size-3 text-primary" /> AI Deep Proofreader
                    </span>
                    <span className="text-[10.5px] text-muted-foreground mt-0.5 leading-relaxed">
                      Comprehensive neural proofreading · Contextual suggestions
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={runInHouseCheck}
                    disabled={words < 5}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Zap className="size-3 text-amber-500 fill-amber-500" /> Check with In-House Engine (0ms)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => checkMutation.mutate()}
                    disabled={checkMutation.isPending || words < 5}
                    className="h-7 text-xs gap-1.5"
                  >
                    {checkMutation.isPending ? (
                      <Loader2 className="size-3 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="size-3 text-primary" />
                    )}
                    Check with AI
                  </Button>
                </div>
              </div>
            )}
          </div>

          {spellCheckEnabled && writingCheck && !checkIsStale ? (
            <WritingCheckPanel
              check={writingCheck}
              onAccept={() => {
                const corrected = writingCheck.correctedText;
                setEssayText(corrected);
                setCheckedTextSnapshot(corrected);
                // Corrections have now been applied to the essay text, so the
                // panel must reflect "clean" — otherwise it keeps showing the
                // same stale issue list and an Apply button that looks like
                // it does nothing on a second click.
                setWritingCheck({ issues: [], correctedText: corrected, clean: true });
                toast.success("Corrections applied.");
              }}
            />
          ) : null}

          {(question.trim() || essayText.trim()) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-1">
              <span className="flex items-center gap-1.5 opacity-80">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Question &amp; essay answer autosaved in browser
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuestion("");
                  setEssayText("");
                  try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                  } catch {}
                  toast.info("Essay draft cleared.");
                }}
                className="hover:text-destructive underline underline-offset-2 transition-colors cursor-pointer"
              >
                Clear draft
              </button>
            </div>
          )}

          <Button
            className={`w-full ${isLimitReached ? "bg-amber-600 hover:bg-amber-500 text-white font-medium" : ""}`}
            disabled={
              !isLimitReached && (
                mutation.isPending ||
                checkMutation.isPending ||
                question.trim().length < 10 ||
                words < 20
              )
            }
            onClick={handleMarkClick}
          >
            {isLimitReached ? (
              <>
                <Sparkles className="size-4" /> Upgrade Plan to Mark Essay (Limit Reached)
              </>
            ) : checkMutation.isPending ? (
              <>
                <SpellCheck className="size-4 animate-pulse" /> Checking spelling &amp; grammar…
              </>
            ) : mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Marking — this takes up to a minute
              </>
            ) : readyToMark ? (
              <>
                <Sparkles className="size-4" /> Mark this essay
              </>
            ) : (
              <>
                <SpellCheck className="size-4" /> Check spelling &amp; grammar, then mark
              </>
            )}{" "}
          </Button>
        </div>

        <div ref={resultRef}>
          {mutation.isPending ? (
            <GradingProgress
              active
              stages={[
                { label: "Referring Cambridge 9708 Knowledge Base & Mark Schemes", weight: 3 },
                { label: "Checking Assessment Objectives: AO1 Knowledge · AO2 Analysis · AO3 Evaluation", weight: 4 },
                { label: "Evaluating diagrams, chains of reasoning & policy trade-offs", weight: 3 },
                ...(auditPass ? [{ label: "Independent moderation & multi-pass verification", weight: 2 }] : []),
                { label: "Synthesizing diagnostic examiner report & actionable feedback", weight: 2 },
              ]}
              totalMs={30_000}
            />
          ) : result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs shadow-sm">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Cambridge 9708 Standard Assessment Complete</span>
                </div>
                {(result.latencyMs || result.grading?.latencyMs) ? (
                  <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary font-mono text-[11px] font-semibold">
                    <Clock className="size-3.5" /> Graded in {Math.round((result.latencyMs || result.grading?.latencyMs || 0) / 1000)}s
                  </Badge>
                ) : null}
              </div>
              <MarkBreakdown grading={result.grading} question={question} />

              {isDirectGradingMode && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-purple-950/90 border border-purple-500/50 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-purple-400" />
                      <span className="font-bold text-sm text-white">Save &amp; Return to Student</span>
                    </div>
                    <Badge className="bg-purple-600 text-white border-0 text-xs font-bold px-2.5 py-1">
                      Final Score: {result.grading.total_mark} / {maxMark}
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-200">
                    Sync this examiner score and diagnostic commentary back to{" "}
                    <strong className="text-white">{search.studentName || "the student"}</strong>'s
                    classroom gradebook.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
                      disabled={isReturningGrade}
                      onClick={handleReturnToClassroom}
                    >
                      {isReturningGrade ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Returning Grade...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Save Grade &amp; Return to Classroom
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/classes/$classroomId",
                          params: { classroomId: search.classroomId! },
                        })
                      }
                      className="border-border text-xs text-muted-foreground hover:text-white"
                    >
                      Back to Class
                    </Button>
                  </div>
                </div>
              )}
              {result.essayId ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate({ to: "/essay/$essayId", params: { essayId: result.essayId! } })
                  }
                >
                  Open full report and rewrite
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="panel hidden lg:flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
              <Sparkles className="size-6 text-muted-foreground" />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Your mark, AO breakdown, missing elements and rewrite plan will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </>
  );
}

function WritingCheckPanel({ check, onAccept }: { check: WritingCheck; onAccept: () => void }) {
  const isClean = check.clean || check.issues.length === 0;

  if (isClean) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            {check.engine === "in_house" ? "In-House Engine: " : "AI Proofread: "}
            No spelling, grammar, or terminology issues found — ready to mark.
          </span>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px] font-mono">
          {check.engine === "in_house" ? "0ms Verified" : "AI Clean"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            {check.issues.length} {check.engine === "in_house" ? "In-House" : "AI"} suggestion{check.issues.length === 1 ? "" : "s"} found
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-background/80 font-mono">
          {check.engine === "in_house" ? "⚡ Cambridge Whitelisted" : "✨ AI Proofreader"}
        </Badge>
      </div>

      <ul className="max-h-56 space-y-2 overflow-y-auto text-xs pr-1">
        {check.issues.map((issue, index) => (
          <li key={index} className="rounded-md border border-border bg-background p-2.5 space-y-1 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize font-mono">
                {issue.type}
              </Badge>
              <span className="text-destructive font-mono line-through font-medium">{issue.original}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{issue.suggestion}</span>
            </div>
            {issue.explanation && (
              <p className="text-[11px] text-foreground font-medium">{issue.explanation}</p>
            )}
            {issue.context ? (
              <p className="text-[11px] text-muted-foreground italic">"{issue.context}"</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <Button type="button" size="sm" onClick={onAccept} className="h-8 text-xs font-semibold">
          Apply corrections ({check.issues.length})
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Economics content &amp; marks are never altered.
        </span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
