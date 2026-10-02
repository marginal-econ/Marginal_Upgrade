import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2, SpellCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
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
import { describeDiagramUrl, listDiagramLibrary } from "@/lib/diagrams.functions";
import { gradeEssaySubmission } from "@/lib/grading.functions";
import { checkWritingQuality } from "@/lib/writing-check.functions";
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
  const checkWriting = useServerFn(checkWritingQuality);
  const describeDiagram = useServerFn(describeDiagramUrl);
  const listDiagrams = useServerFn(listDiagramLibrary);

  const [question, setQuestion] = useState(search.q ?? "");
  const [essayText, setEssayText] = useState("");
  const [maxMark, setMaxMark] = useState(search.marks ? String(search.marks) : "12");
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
  const [diagramMode, setDiagramMode] = useState<"none" | "library" | "url">("none");
  const [diagramLibraryId, setDiagramLibraryId] = useState<string>("");
  const [diagramUrl, setDiagramUrl] = useState("");

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

  const describeDiagramMutation = useMutation({
    mutationFn: (url: string) => describeDiagram({ data: { url } }),
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
    onError: (error: Error) => toast.error(error.message),
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
              className="font-mono text-[13px] leading-relaxed"
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
              onValueChange={(value: "none" | "library" | "url") => setDiagramMode(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a diagram…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {diagrams.length > 0 ? "No more diagrams to add" : "No diagram to reference"}
                </SelectItem>
                <SelectItem value="library">Choose from the diagram library</SelectItem>
                <SelectItem value="url">Paste a diagram image URL</SelectItem>
              </SelectContent>
            </Select>

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
                  disabled={!diagramUrl.trim() || describeDiagramMutation.isPending}
                  onClick={() => describeDiagramMutation.mutate(diagramUrl.trim())}
                >
                  {describeDiagramMutation.isPending ? (
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
            className="w-full"
            disabled={
              mutation.isPending ||
              checkMutation.isPending ||
              question.trim().length < 10 ||
              words < 20
            }
            onClick={handleMarkClick}
          >
            {checkMutation.isPending ? (
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
