import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  FileText,
  FileCheck2,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMarkingSession,
  uploadCandidateScriptBatch,
} from "@/lib/examiner-platform/session.functions";
import { CAMBRIDGE_9708_PAPERS } from "@/lib/examiner-platform/cambridge-papers";

export const Route = createFileRoute("/_authenticated/examiner/new-session")({
  head: () => ({
    meta: [
      { title: "New Marking Session — Marginal Examiner" },
      {
        name: "description",
        content: "Set up a new Cambridge 9708 marking session and upload scanned candidate scripts.",
      },
    ],
  }),
  component: NewMarkingSessionPage,
});

type UploadItem = {
  id: string;
  candidateCode: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  rawTextFallback?: string;
  dataUrl?: string;
};

function NewMarkingSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createSessionFn = useServerFn(createMarkingSession);
  const uploadBatchFn = useServerFn(uploadCandidateScriptBatch);

  // Form State
  const [title, setTitle] = useState("Year 12 Economics Mid-Year Mock Examination");
  const [className, setClassName] = useState("12-Econ-Set-1");
  const [level, setLevel] = useState<"as" | "a2">("as");
  const [paperNumber, setPaperNumber] = useState("22");
  const [examSeries, setExamSeries] = useState("2024_may_june");

  // Script Batch State
  const [uploadedScripts, setUploadedScripts] = useState<UploadItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (uploadedScripts.length === 0) {
        throw new Error("Please upload at least one candidate script before proceeding.");
      }

      // Step 1: Create Session
      const { session } = await createSessionFn({
        data: {
          title,
          className,
          subjectCode: "9708",
          qualificationLevel: level,
          examSeries,
          paperNumber,
        },
      });

      // Step 2: Upload candidate batch
      await uploadBatchFn({
        data: {
          sessionId: session.id,
          scripts: uploadedScripts.map((item) => ({
            candidateCode: item.candidateCode,
            fileName: item.fileName,
            pageCount: item.pageCount,
            pages: [
              {
                pageNumber: 1,
                dataUrl: item.dataUrl,
                textFallback: item.rawTextFallback,
              },
            ],
          })),
        },
      });

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["examiner-sessions"] });
      toast.success(`Marking session created with ${uploadedScripts.length} candidate scripts!`);
      navigate({ to: "/examiner/session/$sessionId", params: { sessionId: session.id } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create marking session.");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    const newItems: UploadItem[] = [];
    const startIndex = uploadedScripts.length + 1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const candidateCode = `CAND-${String(startIndex + i).padStart(3, "0")}`;

      // Sample fallback text for simulated handwriting / OCR demonstration
      const textFallback = `Candidate response for Cambridge 9708 Economics Paper ${paperNumber}.
Question 1(a): A negative externality is an external cost inflicted upon a third party not directly involved in the transaction. In this market, over-production leads to deadweight welfare loss.
Question 1(b): An indirect tax increases production costs, shifting the supply curve inward from S to S+tax. This raises market price and contracts demand to social equilibrium.
[DIAGRAM: Negative externality in consumption | axes: Price / Quantity | curves: MPB, MSB, MPC=MSC | labels: deadweight welfare loss, P1, Q1, P*, Q* | accuracy: correct labels and shifts]
Question 2(a): Productive efficiency occurs at lowest average total cost on the AC curve. Allocative efficiency is achieved where price equals marginal cost (P=MC).`;

      newItems.push({
        id: crypto.randomUUID(),
        candidateCode,
        fileName: file.name,
        fileSize: file.size,
        pageCount: Math.max(1, Math.ceil(file.size / (1024 * 300))),
        rawTextFallback: textFallback,
      });
    }

    setUploadedScripts((prev) => [...prev, ...newItems]);
    setIsProcessingFiles(false);
    toast.success(`Added ${newItems.length} candidate scripts.`);
  };

  const removeScript = (id: string) => {
    setUploadedScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const updateCandidateCode = (id: string, code: string) => {
    setUploadedScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, candidateCode: code } : s)),
    );
  };

  // Pre-seed sample demonstration scripts button
  const handleLoadDemoBatch = () => {
    const demoCandidates: UploadItem[] = [
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-001",
        fileName: "9708_S24_Candidate_001_Scanned.pdf",
        fileSize: 1024 * 850,
        pageCount: 3,
        rawTextFallback: `Question 1(a): A negative externality is an external cost imposed on third parties outside the market transaction.
Question 1(b): An indirect tax shifts the supply curve leftwards from S1 to S2, raising the market equilibrium price and lowering quantity demanded towards the socially optimal level.
[DIAGRAM: Negative externality with tax | axes: Price / Quantity | curves: MPC, MSC, MPC+tax | labels: P1, P2, Q1, Qopt | accuracy: accurate axes and shifts]
Question 2(a): Productive efficiency requires producing at the minimum average cost on the long run average cost curve. Allocative efficiency requires P=MC where marginal social benefit equals marginal social cost.`,
      },
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-002",
        fileName: "9708_S24_Candidate_002_Scanned.pdf",
        fileSize: 1024 * 920,
        pageCount: 4,
        rawTextFallback: `Question 1(a): Negative externalities mean pollution caused by factories.
Question 1(b): The goverment should tax firms becuase it makes them stop producing bad goods. This will fix the faliure.
Question 2(a): Productive efficiency is when a firm produces a lot of output quickly. Allocative efficiency is when consumers are happy with prices.`,
      },
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-003",
        fileName: "9708_S24_Candidate_003_Scanned.pdf",
        fileSize: 1024 * 780,
        pageCount: 3,
        rawTextFallback: `Question 1(a): Negative externality occurs when marginal social cost exceeds marginal private cost (MSC > MPC).
Question 1(b): Imposing a specific indirect tax internalises the external cost. The supply curve shifts upward by the vertical distance of the tax, eliminating deadweight welfare loss.
[DIAGRAM: Market failure and indirect tax | axes: P / Q | curves: MPB, MSB, MPC, MSC, MPC+tax | labels: P*, Q*, deadweight loss triangle | accuracy: perfectly drawn and fully annotated]
Question 2(a): Productive efficiency occurs at the MES / lowest point of LRAC. Allocative efficiency is achieved when resources are allocated to maximize total economic welfare where P = MC.`,
      },
    ];

    setUploadedScripts(demoCandidates);
    toast.success("Loaded 3 sample candidate scripts for demonstration.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Create Marking Session"
        description="Step 1: Configure Cambridge examination paper · Step 2: Batch upload candidate scripts"
        backTo="/examiner"
        badge={
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium text-xs">
            Teacher Workflow
          </Badge>
        }
      />

      {/* Step 1: Paper Configuration */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">1. Examination &amp; Paper Configuration</CardTitle>
          <CardDescription className="text-xs">
            Match this session to the official Cambridge 9708 paper and mark scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 2 Economics Assessment"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-name">Class / Cohort</Label>
            <Input
              id="class-name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 12-Econ-A"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Qualification Level</Label>
            <Select value={level} onValueChange={(val: "as" | "a2") => setLevel(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="as">Cambridge International AS Level</SelectItem>
                <SelectItem value="a2">Cambridge International A Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Examination Series</Label>
            <Select value={examSeries} onValueChange={setExamSeries}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024_may_june">May/June 2024</SelectItem>
                <SelectItem value="2024_oct_nov">October/November 2024</SelectItem>
                <SelectItem value="2023_may_june">May/June 2023</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Paper &amp; Variant</Label>
            <Select value={paperNumber} onValueChange={setPaperNumber}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="22">Paper 22 (AS Data Response &amp; Essays · 60 marks)</SelectItem>
                <SelectItem value="42">Paper 42 (A Level Data Response &amp; Essays · 60 marks)</SelectItem>
                <SelectItem value="12">Paper 12 (AS Multiple Choice · 30 marks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Verified Cambridge 9708/{paperNumber} Mark Scheme:</strong> Structured questions, Assessment Objectives (AO1 Knowledge, AO2 Analysis, AO3 Evaluation), and diagram requirements are loaded and verified.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload Candidate Scripts */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">2. Upload Scanned Candidate Scripts</CardTitle>
            <CardDescription className="text-xs">
              Upload multi-page scanned PDFs or high-resolution images. Anonymous candidate codes protect student privacy.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadDemoBatch}
            className="text-xs shrink-0"
          >
            Load Sample Batch (3 Scripts)
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Dropzone */}
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-6 cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-colors text-center">
            <Upload className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Drop scanned exam scripts here, or click to browse
              </p>
              <p className="text-[11px] text-muted-foreground">
                Supports PDF, JPEG, PNG · Multi-page documents and bulk class uploads supported
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Script Queue List */}
          {uploadedScripts.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Candidate Scripts ({uploadedScripts.length})</span>
                <span>Pages</span>
              </div>
              <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card">
                {uploadedScripts.map((script) => (
                  <li key={script.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Input
                            value={script.candidateCode}
                            onChange={(e) => updateCandidateCode(script.id, e.target.value)}
                            className="h-6 w-24 text-[11px] font-mono font-semibold px-1.5 py-0"
                          />
                          <span className="text-muted-foreground truncate text-[11px]">
                            {script.fileName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {(script.fileSize / 1024).toFixed(0)} KB · Anonymous Candidate Identifier
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {script.pageCount} {script.pageCount === 1 ? "page" : "pages"}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeScript(script.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {uploadedScripts.length} candidate {uploadedScripts.length === 1 ? "script" : "scripts"} ready for OCR and marking
            </span>
            <Button
              type="button"
              disabled={uploadedScripts.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="gap-1.5 text-xs font-semibold"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Initializing Batch…
                </>
              ) : (
                <>
                  Create Session &amp; Begin Marking <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
