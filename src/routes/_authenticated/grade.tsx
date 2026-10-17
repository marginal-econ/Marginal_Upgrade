import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
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
import { useEffect, useRef, useState } from "react";
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
import { checkQuestionGrounding, gradeEssaySubmission } from "@/lib/grading.functions";
import { checkWritingQuality } from "@/lib/writing-check.functions";
import { getMe } from "@/lib/account.functions";
import type { Grading } from "@/lib/examiner/types";

// Optional prefill from the Question bank ("Practice this" links here with
// a real past-paper question already picked).
const gradeSearchSchema = z.object({
  q: z.string().trim().max(2000).optional(),
  marks: z.union([z.literal(8), z.literal(12), z.literal(20)]).optional(),
});

export const Route = createFileRoute("/_authenticated/grade")({
  validateSearch: gradeSearchSchema,
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
};
type WritingCheck = { issues: WritingIssue[]; correctedText: string; clean: boolean };

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
  const isLimitReached = !isAdmin && (isTeacherUnpaid || (sub !== undefined && !sub.canGradeEssay));

  const [question, setQuestion] = useState(search.q ?? "");

  const groundingQuery = useQuery({
    queryKey: ["question-grounding", question.trim()],
    queryFn: () => checkGrounding({ data: { question: question.trim() } }),
    enabled: question.trim().length >= 15,
    staleTime: 5 * 60_000,
  });
  const [essayText, setEssayText] = useState("");
  const [maxMark, setMaxMark] = useState(search.marks ? String(search.marks) : "12");

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
  const [isDiagramDragging, setIsDiagramDragging] = useState(false);

  // A pasted screenshot of the mark scheme, sent to the examiner as an
  // actual image (vision) alongside the retrieved text context — see
  // grading.functions.ts / grade.server.ts.
  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);

  const [writingCheck, setWritingCheck] = useState<WritingCheck | null>(null);
  const [checkedTextSnapshot, setCheckedTextSnapshot] = useState<string | null>(null);

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

  function handleDiagramFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WebP, etc.).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      describeDiagramImageMutation.mutate({ image: dataUrl, label: file.name });
    };
    reader.onerror = () => toast.error("Could not read that diagram image file.");
    reader.readAsDataURL(file);
  }

  const checkMutation = useMutation({
    mutationFn: () => checkWriting({ data: { essayText } }),
    onSuccess: (data) => {
      setWritingCheck(data as WritingCheck);
      setCheckedTextSnapshot(essayText);
      if (data.clean) toast.success("No spelling or grammar issues found.");
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
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
    },
    onError: (error: Error) => {
      const isPlanLimit =
        error.message.includes("Plan limit reached") ||
        error.message.includes("Upgrade to Foundation") ||
        error.message.includes("free Cambridge essay gradings") ||
        error.message.includes("Monthly essay quota reached");
      toast.error(error.message, {
        action: isPlanLimit
          ? {
              label: "View Plans",
              onClick: () => navigate({ to: "/pricing" }),
            }
          : undefined,
        duration: isPlanLimit ? 6000 : 4000,
      });
      if (isPlanLimit) {
        navigate({ to: "/pricing" });
      }
    },
  });

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
    if (isTeacherUnpaid) {
      toast.error("Teacher accounts require an active Educator AI Pass (from ₹99/mo) or School Department License to use the AI Essay Grader.", {
        duration: 5000,
      });
      navigate({ to: "/pricing" });
      return;
    }
    if (isLimitReached) {
      toast.error("Plan limit reached: You've completed your 2 free essays. Redirecting to pricing...", {
        duration: 4000,
      });
      navigate({ to: "/pricing" });
      return;
    }
    if (!readyToMark) {
      checkMutation.mutate();
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
          <div className="px-5 pt-6 pb-0 md:px-8 space-y-3">

        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <p className="leading-relaxed">
            <strong className="text-foreground font-semibold">Cambridge 9708 Standard:</strong>{" "}
            Marking bands, AO ratios, and model feedback are calibrated against published Cambridge
            Assessment guidelines. Marginal is an independent study platform and not endorsed by
            Cambridge Assessment.
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="panel space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Not sure how to lay out your answer?{" "}
              <Link
                to="/response-structure"
                className="font-medium text-foreground underline underline-offset-2"
              >
                See how to structure a response
              </Link>
              .
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="question">Exam question</Label>
            <Textarea
              id="question"
              rows={3}
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
                      <span className="font-semibold">No specific mark scheme found in Knowledge Base</span>
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
            <Label htmlFor="maxMark">Question type</Label>
            <Select
              value={maxMark}
              onValueChange={(value) => {
                setMaxMark(value);
                setWritingCheck(null);
              }}
            >
              <SelectTrigger id="maxMark">
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
              <Label htmlFor="essay">Your answer</Label>
              <span className="text-xs text-muted-foreground">{words} words</span>
            </div>
            <Textarea
              id="essay"
              rows={16}
              className="font-sans text-[15px] leading-[1.8] p-4 rounded-xl"
              placeholder="Paste or type your full essay here…"
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
                <input
                  ref={diagramFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    handleDiagramFile(e.target.files?.[0]);
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
                    const item = e.clipboardData?.files?.[0];
                    if (item && item.type.startsWith("image/")) {
                      e.preventDefault();
                      handleDiagramFile(item);
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
                    const file = e.dataTransfer?.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      handleDiagramFile(file);
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
                        Supports PNG, JPEG, WebP, photos of hand-drawn diagrams, or digital exports
                      </p>
                    </>
                  )}
                </div>
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

        <div>
          {mutation.isPending ? (
            <GradingProgress
              active
              stages={[
                { label: "Reading question & rubric", weight: 1 },
                { label: "Retrieving knowledge base context", weight: 2 },
                { label: "Marking AO1 · AO2 · AO3", weight: 4 },
                ...(auditPass ? [{ label: "Independent audit pass", weight: 3 }] : []),
                { label: "Finalising report", weight: 1 },
              ]}
              totalMs={auditPass ? 34_000 : 26_000}
            />
          ) : result ? (
            <div className="space-y-4">
              <MarkBreakdown grading={result.grading} />
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
            <div className="panel flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
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
  if (check.clean) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" /> No spelling or grammar issues found — ready to
        mark.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <AlertCircle className="size-4 shrink-0" />
        {check.issues.length} spelling/grammar issue{check.issues.length === 1 ? "" : "s"} found
      </div>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
        {check.issues.map((issue, index) => (
          <li key={index} className="rounded-md border border-border bg-background p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">
                {issue.type}
              </Badge>
              <span className="text-destructive line-through">{issue.original}</span>
              <span>→</span>
              <span className="font-medium">{issue.suggestion}</span>
            </div>
            {issue.context ? <p className="mt-1 text-muted-foreground">"{issue.context}"</p> : null}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onAccept}>
          Apply corrections
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        These are spelling/grammar fixes only — economics content and marks are never changed by
        this check. You can also mark the essay as originally written.
      </p>
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
