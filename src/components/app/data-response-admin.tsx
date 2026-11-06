import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  FileCheck2,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clock,
  Trophy,
  Play,
  Trash2,
  Copy,
  ChevronRight,
  RefreshCw,
  Search,
  Eye,
  Check,
  Award,
  Layers,
  ArrowRight,
  Filter,
  HelpCircle,
  FileSearch,
  PenTool,
  Send,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  listDataResponsePapers,
  getDataResponsePaper,
  saveDataResponsePaper,
  parseDataResponseUpload,
  gradeDataResponseSubmission,
  deleteDataResponsePaper,
} from "@/lib/data-response/data-response.functions";
import type {
  DataResponsePaper,
  DataResponseQuestion,
  DataResponseSubmissionResult,
  QuestionEvaluationResult,
} from "@/lib/data-response/types";
import { extractTextFromFile } from "@/lib/extract-text";
import { ocrPdf } from "@/lib/pdf-ocr";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

export function DataResponseAdminPanel() {
  const queryClient = useQueryClient();

  const listPapersFn = useServerFn(listDataResponsePapers);
  const savePaperFn = useServerFn(saveDataResponsePaper);
  const parseUploadFn = useServerFn(parseDataResponseUpload);
  const gradeSubmissionFn = useServerFn(gradeDataResponseSubmission);
  const deletePaperFn = useServerFn(deleteDataResponsePaper);

  // Top level active tab: "practice" | "results" | "upload" | "library"
  const [activeTab, setActiveTab] = useState<"practice" | "results" | "upload" | "library">("practice");

  // Selected Paper State
  const [selectedPaperId, setSelectedPaperId] = useState<string>("9708_22_2026_fm");

  // Answering State (questionId/number -> text)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [extractFilter, setExtractFilter] = useState<string>("");

  // Marking Results State
  const [lastSubmission, setLastSubmission] = useState<DataResponseSubmissionResult | null>(null);

  // Upload & OCR State
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [uploadSubject, setUploadSubject] = useState<"9708" | "9609">("9708");
  const [uploadLevel, setUploadLevel] = useState<"as" | "a2">("as");
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<string>("");
  const [parsedPreviewPaper, setParsedPreviewPaper] = useState<DataResponsePaper | null>(null);

  // Query: Fetch papers list
  const { data: papersData, isLoading: isLoadingPapers } = useQuery({
    queryKey: ["data-response-papers"],
    queryFn: () => listPapersFn(),
  });

  const papers: DataResponsePaper[] = papersData?.papers || [];

  // Active Selected Paper
  const currentPaper = useMemo(() => {
    return papers.find((p) => p.id === selectedPaperId) || papers[0] || null;
  }, [papers, selectedPaperId]);

  // Current sub-question
  const currentQuestion: DataResponseQuestion | null = useMemo(() => {
    if (!currentPaper || !currentPaper.questions || currentPaper.questions.length === 0) return null;
    return currentPaper.questions[activeQuestionIdx] || currentPaper.questions[0];
  }, [currentPaper, activeQuestionIdx]);

  // Mutation: Grade paper
  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!currentPaper) throw new Error("No paper selected.");
      return await gradeSubmissionFn({
        data: {
          paperId: currentPaper.id,
          candidateName: "Admin Standardisation Candidate",
          answers,
        },
      });
    },
    onSuccess: (data) => {
      setLastSubmission(data.result);
      setActiveTab("results");
      toast.success("Exam paper successfully marked strictly against Mark Scheme!");
    },
    onError: (err: any) => {
      toast.error(`Grading failed: ${err.message || "Unknown error"}`);
    },
  });

  // Mutation: Save parsed custom paper
  const savePaperMutation = useMutation({
    mutationFn: async (paperToSave: DataResponsePaper) => {
      return await savePaperFn({
        data: { paper: paperToSave },
      });
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["data-response-papers"] });
      setSelectedPaperId(vars.id);
      setParsedPreviewPaper(null);
      setQpFile(null);
      setMsFile(null);
      setActiveTab("practice");
      toast.success("New Data Response Paper saved & loaded into Practice Studio!");
    },
    onError: (err: any) => {
      toast.error(`Failed to save paper: ${err.message}`);
    },
  });

  // Mutation: Delete custom paper
  const deletePaperMutation = useMutation({
    mutationFn: async (paperId: string) => {
      return await deletePaperFn({ data: { paperId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-response-papers"] });
      toast.success("Paper removed.");
      if (selectedPaperId === papers[0]?.id) {
        setSelectedPaperId("9708_22_2026_fm");
      }
    },
  });

  // Quick Action: Pre-fill realistic sample answers for standardisation testing
  const handleFillSampleAnswers = () => {
    if (!currentPaper) return;
    if (currentPaper.sampleAnswers) {
      setAnswers({ ...currentPaper.sampleAnswers });
      toast.info("Pre-filled realistic sample answers from Cambridge standardisation.");
    } else {
      const sample: Record<string, string> = {};
      currentPaper.questions.forEach((q) => {
        sample[q.number] = `According to the extract, this situation relates to ${currentPaper.extract.title}. Evidence indicates clear transmission mechanisms and relevant business/economic application.`;
      });
      setAnswers(sample);
      toast.info("Generated sample candidate text for all questions.");
    }
  };

  // Quick Action: Copy extract snippet to current question answer
  const handleInsertExtractQuote = (paragraphText: string) => {
    if (!currentQuestion) return;
    const key = currentQuestion.number;
    const existing = answers[key] || "";
    const quote = `As stated in the extract: "${paragraphText.slice(0, 140)}..." `;
    setAnswers({
      ...answers,
      [key]: existing ? `${existing}\n\n${quote}` : quote,
    });
    toast.success("Inserted extract quote into answer.");
  };

  // OCR and Extraction pipeline
  const handleRunOcrExtraction = async () => {
    if (!qpFile || !msFile) {
      toast.error("Please select both a Question Paper (QP) and a Mark Scheme (MS) file.");
      return;
    }

    setIsOcrProcessing(true);
    setOcrStatusMessage("Reading Question Paper text & tables…");

    try {
      // 1. Extract QP text
      let qpText = "";
      try {
        qpText = await extractTextFromFile(qpFile);
      } catch {
        setOcrStatusMessage("Running OCR on Question Paper…");
        const ocrRes = await ocrPdf(qpFile);
        qpText = ocrRes.text;
      }

      setOcrStatusMessage("Reading Mark Scheme text & rubrics…");

      // 2. Extract MS text
      let msText = "";
      try {
        msText = await extractTextFromFile(msFile);
      } catch {
        setOcrStatusMessage("Running OCR on Mark Scheme…");
        const ocrRes = await ocrPdf(msFile);
        msText = ocrRes.text;
      }

      setOcrStatusMessage("AI Extracting Section A case study, questions, and mark schemes…");

      // 3. Send to Server Parser
      const parseRes = await parseUploadFn({
        data: {
          qpText,
          msText,
          defaultLevel: uploadLevel,
          defaultSubject: uploadSubject,
        },
      });

      setParsedPreviewPaper(parseRes.paper);
      setOcrStatusMessage("Extraction complete! Review parsed paper below.");
      toast.success("Paper and Mark Scheme successfully extracted!");
    } catch (err: any) {
      console.error("OCR extraction failed:", err);
      toast.error(`Extraction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-500" />
              Cambridge Data Response & Case Study Studio
            </h2>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
              Section A Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Strict Mark Scheme evaluation for Paper 2 & Paper 4 Data Response questions. OCR full paper upload, extract context verification, and 6+ marks Level 3 rubrics.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="bg-muted/80 p-1">
              <TabsTrigger value="practice" className="gap-1.5 text-xs">
                <PenTool className="h-3.5 w-3.5" />
                Practice Studio
              </TabsTrigger>
              {lastSubmission && (
                <TabsTrigger value="results" className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Award className="h-3.5 w-3.5" />
                  Marking Report
                </TabsTrigger>
              )}
              <TabsTrigger value="upload" className="gap-1.5 text-xs">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload & OCR
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Paper Library ({papers.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: PRACTICE STUDIO (Split-View Extract Reader & Answering)       */}
      {/* ==================================================================== */}
      {activeTab === "practice" && (
        <div className="space-y-6">
          {/* Paper Selector Toolbar */}
          <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Active Paper:
                </Label>
                <Select value={selectedPaperId} onValueChange={(id) => { setSelectedPaperId(id); setActiveQuestionIdx(0); }}>
                  <SelectTrigger className="w-full md:w-[480px] bg-background font-medium">
                    <SelectValue placeholder="Select Data Response Paper..." />
                  </SelectTrigger>
                  <SelectContent>
                    {papers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {p.subjectCode}/{p.paperNumber}
                          </Badge>
                          <span className="truncate">{p.title}</span>
                          <span className="text-xs text-muted-foreground">({p.totalMarks} marks)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillSampleAnswers}
                  className="text-xs gap-1.5 border-dashed"
                  title="Fills realistic student responses from standardisation scripts for immediate examiner testing"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Fill Sample Answers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnswers({})}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => gradeMutation.mutate()}
                  disabled={gradeMutation.isPending || !currentPaper}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  {gradeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Marking strictly against MS…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit for Strict Marking
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {currentPaper ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: CASE STUDY / EXTRACT VIEWER (5 COLS) */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border border-border/80 h-full flex flex-col shadow-sm">
                  <CardHeader className="p-4 border-b bg-muted/40 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-bold tracking-tight">
                          Case Study & Extract
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        {currentPaper.extract.paragraphs.length} Paragraphs
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-medium text-foreground">
                      {currentPaper.extract.title}
                    </CardDescription>

                    {/* Search inside extract */}
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search data, names, keywords in extract…"
                        value={extractFilter}
                        onChange={(e) => setExtractFilter(e.target.value)}
                        className="pl-8 h-8 text-xs bg-background"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 flex-1">
                    <ScrollArea className="h-[620px] pr-3">
                      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
                        {currentPaper.extract.paragraphs.map((para, idx) => {
                          const isMatch = extractFilter && para.toLowerCase().includes(extractFilter.toLowerCase());
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "group relative p-3 rounded-lg border transition-colors",
                                isMatch
                                  ? "bg-amber-500/10 border-amber-500/40"
                                  : "bg-muted/20 border-border/50 hover:border-primary/40 hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground">
                                  Paragraph {idx + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInsertExtractQuote(para)}
                                  className="h-6 px-1.5 text-[10px] text-muted-foreground opacity-70 group-hover:opacity-100 hover:text-primary gap-1"
                                >
                                  <Copy className="h-3 w-3" />
                                  Quote
                                </Button>
                              </div>
                              <p className="text-xs/relaxed">{para}</p>
                            </div>
                          );
                        })}

                        {/* Tables / Data figures */}
                        {currentPaper.extract.tables && currentPaper.extract.tables.length > 0 && (
                          <div className="space-y-3 pt-2">
                            {currentPaper.extract.tables.map((tbl, tIdx) => (
                              <div key={tIdx} className="rounded-lg border border-border/70 overflow-hidden text-xs">
                                {tbl.title && (
                                  <div className="bg-muted/60 px-3 py-1.5 font-semibold text-[11px] border-b">
                                    {tbl.title}
                                  </div>
                                )}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-muted/30 border-b border-border/50">
                                        {tbl.headers.map((h, hIdx) => (
                                          <th key={hIdx} className="px-2.5 py-1.5 font-semibold text-[11px]">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {tbl.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-muted/20">
                                          {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-2.5 py-1.5 text-[11px] font-mono">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPaper.extract.sources && (
                          <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border/50">
                            {currentPaper.extract.sources}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: QUESTIONS & ANSWERING CANVAS (7 COLS) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Question Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {currentPaper.questions.map((q, idx) => {
                    const ans = answers[q.number] || "";
                    const hasAnswer = ans.trim().length > 0;
                    const isActive = idx === activeQuestionIdx;
                    return (
                      <Button
                        key={q.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveQuestionIdx(idx)}
                        className={cn(
                          "text-xs font-medium h-8 px-3 gap-1.5 shrink-0",
                          isActive ? "shadow-sm" : hasAnswer ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" : ""
                        )}
                      >
                        {hasAnswer ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                        {q.number}
                        <span className="text-[10px] opacity-70">[{q.maxMark}m]</span>
                      </Button>
                    );
                  })}
                </div>

                {currentQuestion && (
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="p-4 border-b bg-card pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-bold font-mono px-2 py-0.5 border-primary/40 text-primary bg-primary/5">
                            Question {currentQuestion.number}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {currentQuestion.maxMark} Marks
                          </Badge>
                          {currentQuestion.maxMark >= 6 ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">
                              Levels-Based Rubric (AO3/AO4 Evaluation)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase font-mono">
                              Point-Based Criteria
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>
                            AO1: {currentQuestion.tariff.ao1} · AO2: {currentQuestion.tariff.ao2} · AO3: {currentQuestion.tariff.ao3}
                            {currentQuestion.tariff.ao4 ? ` · AO4: ${currentQuestion.tariff.ao4}` : ""}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-foreground leading-snug">
                        {currentQuestion.title}
                      </h3>

                      {currentQuestion.extractLinkageExpected && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            <strong>Extract Linkage Required:</strong> Cambridge mark schemes strictly penalise generic textbook answers that fail to quote or apply specific facts, numbers, or names from the case extract.
                          </span>
                        </div>
                      )}

                      {/* Collapsible Mark Scheme / Rubric preview for Teacher/Admin reference */}
                      <Accordion type="single" collapsible className="mt-2 text-xs">
                        <AccordionItem value="rubric-preview" className="border-border/40">
                          <AccordionTrigger className="py-1.5 text-xs text-muted-foreground hover:text-foreground">
                            Inspect Official Mark Scheme Criteria & Rubric
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 pt-1 pb-2">
                            <div className="bg-muted/40 p-3 rounded border border-border/50 text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground">
                              {currentQuestion.markingGuide}
                            </div>
                            {currentQuestion.rubricLevels && (
                              <div className="grid grid-cols-1 gap-1.5 pt-1">
                                {currentQuestion.rubricLevels.map((lvl) => (
                                  <div key={lvl.level} className="text-xs p-2 rounded bg-muted/20 border border-border/40">
                                    <div className="font-semibold text-foreground flex items-center justify-between">
                                      <span>Level {lvl.level}: {lvl.label}</span>
                                      <span className="font-mono text-primary">{lvl.marksRange}</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] mt-0.5">{lvl.description}</p>
                                    {lvl.evaluativeRequirement && (
                                      <p className="text-amber-600 dark:text-amber-400 text-[11px] mt-1 font-medium">
                                        Evaluation Requirement: {lvl.evaluativeRequirement}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Label htmlFor={`answer_${currentQuestion.number}`} className="font-medium text-foreground">
                          Candidate Script:
                        </Label>
                        <span>
                          Word Count: {(answers[currentQuestion.number] || "").trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>

                      <Textarea
                        id={`answer_${currentQuestion.number}`}
                        rows={11}
                        placeholder={`Write candidate response for question ${currentQuestion.number} here. Explicitly reference extract facts, data points, and economic/business theory...`}
                        value={answers[currentQuestion.number] || ""}
                        onChange={(e) => setAnswers({ ...answers, [currentQuestion.number]: e.target.value })}
                        className="font-sans text-sm leading-relaxed resize-y bg-background"
                      />
                    </CardContent>

                    <CardFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIdx === 0}
                        onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                        className="text-xs"
                      >
                        Previous Question
                      </Button>

                      <div className="flex items-center gap-2">
                        {activeQuestionIdx < currentPaper.questions.length - 1 ? (
                          <Button
                            size="sm"
                            onClick={() => setActiveQuestionIdx((prev) => prev + 1)}
                            className="text-xs gap-1"
                          >
                            Next Question
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => gradeMutation.mutate()}
                            disabled={gradeMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                          >
                            {gradeMutation.isPending ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Finish & Mark Entire Paper
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No Data Response paper loaded. Select a paper from the dropdown or upload a new one.</p>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: MARKING REPORT & DIAGNOSTIC REVIEW                           */}
      {/* ==================================================================== */}
      {activeTab === "results" && lastSubmission && (
        <div className="space-y-6">
          {/* Executive Performance Banner */}
          <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-background to-emerald-500/5 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-emerald-500" />
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      Official Cambridge Mark Scheme Assessment
                    </h3>
                  </div>
                  <p className="text-sm text-foreground/90 font-medium">
                    {lastSubmission.paperTitle}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lastSubmission.examinerExecutiveSummary}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-card/80 p-4 rounded-xl border border-border/80 shadow-sm shrink-0">
                  <div className="text-center px-3 border-r border-border/60">
                    <div className="text-3xl font-extrabold text-foreground">
                      {lastSubmission.totalMarksAwarded}
                      <span className="text-lg text-muted-foreground font-normal">/{lastSubmission.maxTotalMarks}</span>
                    </div>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                      Total Marks
                    </div>
                  </div>

                  <div className="text-center px-3 border-r border-border/60">
                    <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {lastSubmission.percentage}%
                    </div>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                      Percentage
                    </div>
                  </div>

                  <div className="text-center px-3">
                    <Badge className="bg-emerald-600 text-white font-bold text-xs py-1">
                      {lastSubmission.overallBand}
                    </Badge>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mt-1">
                      Cambridge Band
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("practice")}
                  className="text-xs gap-1.5"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Return to Answering Studio (Edit & Regrade)
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  Standardised: {new Date(lastSubmission.submittedAt).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Question Detailed Breakdown */}
          <div className="space-y-4">
            <h4 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Sub-Question Detailed Review & Rubric Audits
            </h4>

            {Object.values(lastSubmission.questionResults).map((result, idx) => (
              <Card key={idx} className="border border-border/80 overflow-hidden shadow-sm">
                <CardHeader className="p-4 border-b bg-muted/20 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                        {result.questionNumber}
                      </Badge>
                      <h5 className="font-semibold text-sm text-foreground">
                        {result.questionTitle}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Extract Context Verification Pill */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium",
                          result.extractContextCheck.contextQuality === "strong"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : result.extractContextCheck.contextQuality === "adequate"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        )}
                      >
                        Extract: {result.extractContextCheck.contextQuality.replace(/_/g, " ")}
                      </Badge>

                      <Badge
                        className={cn(
                          "font-bold font-mono text-xs px-2.5 py-0.5",
                          result.awardedMark === result.maxMark
                            ? "bg-emerald-600 text-white"
                            : result.awardedMark > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        )}
                      >
                        {result.awardedMark} / {result.maxMark} Marks
                      </Badge>
                    </div>
                  </div>

                  {/* Rubric level awarded banner for 6+ mark questions */}
                  {result.rubricLevelAwarded && (
                    <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          {result.rubricLevelAwarded.label} ({result.rubricLevelAwarded.marksRange})
                        </span>
                      </div>
                      {result.rubricLevelAwarded.evaluativeComment && (
                        <span className="text-muted-foreground italic text-[11px]">
                          {result.rubricLevelAwarded.evaluativeComment}
                        </span>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* AO Breakdown Pills */}
                  <div className="flex flex-wrap items-center gap-3 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      AO Allocation:
                    </span>
                    <span className="font-mono">
                      <strong>AO1 (Knowledge):</strong> {result.aoBreakdown.knowledge.awarded}/{result.aoBreakdown.knowledge.outOf}
                    </span>
                    <span className="font-mono">
                      <strong>AO2 (Application):</strong> {result.aoBreakdown.application.awarded}/{result.aoBreakdown.application.outOf}
                    </span>
                    <span className="font-mono">
                      <strong>AO3 (Analysis):</strong> {result.aoBreakdown.analysis.awarded}/{result.aoBreakdown.analysis.outOf}
                    </span>
                    {result.aoBreakdown.evaluation && (
                      <span className="font-mono text-primary font-bold">
                        <strong>AO4/AO3 (Evaluation):</strong> {result.aoBreakdown.evaluation.awarded}/{result.aoBreakdown.evaluation.outOf}
                      </span>
                    )}
                  </div>

                  {/* Examiner Rationale */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Principal Examiner Rationale:
                    </span>
                    <p className="text-xs/relaxed text-foreground bg-card p-3 rounded border border-border/60">
                      {result.examinerRationale}
                    </p>
                  </div>

                  {/* Context Check Feedback */}
                  {result.extractContextCheck.feedback && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/40">
                      <strong>Contextual Evidence Assessment:</strong> {result.extractContextCheck.feedback}
                    </div>
                  )}

                  {/* Verbatim quotes rewarded */}
                  {result.evidenceQuotes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Rewarded Quotations from Candidate Script:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {result.evidenceQuotes.map((quote, qIdx) => (
                          <Badge key={qIdx} variant="secondary" className="text-xs font-normal italic bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20">
                            "{quote}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Mark Scheme Criteria */}
                  {result.missingMarkSchemePoints.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Omitted / Missing Mark Scheme Criteria:
                      </span>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
                        {result.missingMarkSchemePoints.map((miss, mIdx) => (
                          <li key={mIdx}>{miss}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model Answer Exemplar & Improvement Tip */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1">
                      <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Cambridge Model Answer Formulation
                      </span>
                      <p className="text-foreground/90 text-xs/relaxed">{result.modelAnswerSnippet}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        Examiner Key Improvement Advice
                      </span>
                      <p className="text-foreground/90 text-xs/relaxed">{result.improvementTip}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: UPLOAD & OCR EXTRACTOR                                       */}
      {/* ==================================================================== */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-5 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold">
                  Upload Whole Examination Paper (QP & MS)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Upload both Question Paper (QP) and Mark Scheme (MS) as PDF, Word (.docx), or scanned images. Our browser OCR and AI parser automatically extract the Section A Case Study extract, tables, sub-questions, and exact mark scheme rubrics.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Paper Metadata selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject Syllabus:</Label>
                  <Select value={uploadSubject} onValueChange={(v: any) => setUploadSubject(v)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9708">Economics (9708)</SelectItem>
                      <SelectItem value="9609">Business (9609)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qualification Level:</Label>
                  <Select value={uploadLevel} onValueChange={(v: any) => setUploadLevel(v)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="as">AS Level (Paper 2)</SelectItem>
                      <SelectItem value="a2">A Level (Paper 4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload Dropzones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QP Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>1. Question Paper (QP) File:</span>
                    {qpFile && <Badge variant="secondary" className="text-[10px]">{qpFile.name}</Badge>}
                  </Label>
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/10">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                    <p className="text-xs font-medium text-foreground mb-1">
                      Drag & Drop or Select QP PDF / DOCX
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Contains the Section A Case Study article, data tables, and sub-questions.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setQpFile(file);
                      }}
                      className="max-w-xs mx-auto text-xs"
                    />
                  </div>
                </div>

                {/* MS Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>2. Mark Scheme (MS) File:</span>
                    {msFile && <Badge variant="secondary" className="text-[10px]">{msFile.name}</Badge>}
                  </Label>
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/10">
                    <FileCheck2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                    <p className="text-xs font-medium text-foreground mb-1">
                      Drag & Drop or Select MS PDF / DOCX
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Contains official points, calculation answers, and 6+ marks Level 3 rubrics.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMsFile(file);
                      }}
                      className="max-w-xs mx-auto text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Extraction Trigger Button & Progress */}
              <div className="pt-2">
                <Button
                  onClick={handleRunOcrExtraction}
                  disabled={!qpFile || !msFile || isOcrProcessing}
                  className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold text-xs gap-2"
                >
                  {isOcrProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {ocrStatusMessage || "Running OCR & AI parsing…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Run OCR & Extract Section A Questions & Mark Scheme
                    </>
                  )}
                </Button>

                {isOcrProcessing && (
                  <div className="mt-3 space-y-1.5">
                    <Progress value={65} className="h-1.5" />
                    <p className="text-xs text-muted-foreground animate-pulse font-mono">{ocrStatusMessage}</p>
                  </div>
                )}
              </div>

              {/* Preview of Parsed Paper */}
              {parsedPreviewPaper && (
                <div className="space-y-4 pt-6 border-t border-border/70">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Parsed Paper Preview: {parsedPreviewPaper.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {parsedPreviewPaper.questions.length} Sub-questions extracted · {parsedPreviewPaper.totalMarks} Total marks
                      </p>
                    </div>

                    <Button
                      onClick={() => savePaperMutation.mutate(parsedPreviewPaper)}
                      disabled={savePaperMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                    >
                      {savePaperMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save to Library & Practice
                    </Button>
                  </div>

                  {/* Extract Preview */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-2">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      Extracted Case Study Extract: {parsedPreviewPaper.extract.title}
                    </span>
                    <p className="text-foreground/90 text-xs/relaxed max-h-36 overflow-y-auto pr-2">
                      {parsedPreviewPaper.extract.paragraphs.join("\n\n")}
                    </p>
                  </div>

                  {/* Extracted Questions list */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      Extracted Sub-Questions & Mark Schemes:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {parsedPreviewPaper.questions.map((q, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border/60 bg-card text-xs flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[11px] font-bold">
                                {q.number}
                              </Badge>
                              <span className="font-semibold text-foreground">{q.title}</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] line-clamp-2">
                              <strong>Mark Scheme:</strong> {q.markingGuide}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs font-mono">
                            {q.maxMark} Marks
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: PAPER LIBRARY & REPOSITORY                                   */}
      {/* ==================================================================== */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Available Cambridge Data Response Papers ({papers.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("upload")}
              className="text-xs gap-1.5"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload New Paper
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {papers.map((paper) => {
              const isSelected = paper.id === selectedPaperId;
              return (
                <Card
                  key={paper.id}
                  className={cn(
                    "border transition-all hover:shadow-md",
                    isSelected ? "border-primary shadow-sm bg-primary/5" : "border-border/70"
                  )}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                          {paper.subjectCode} / {paper.paperNumber}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {paper.qualificationLevel.toUpperCase()}
                        </Badge>
                        {paper.isOfficial && (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                            Official Series
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {paper.totalMarks} Marks
                      </span>
                    </div>

                    <CardTitle className="text-sm font-bold text-foreground">
                      {paper.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                      {paper.extract.title}: {paper.extract.paragraphs[0]?.slice(0, 140)}…
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 pb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4 text-[11px]">
                      <span>{paper.questions.length} Sub-questions</span>
                      <span>·</span>
                      <span>{paper.durationMinutes} Mins</span>
                      <span>·</span>
                      <span>{paper.seriesLabel}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 border-t border-border/40 flex items-center justify-between">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedPaperId(paper.id);
                        setActiveQuestionIdx(0);
                        setActiveTab("practice");
                      }}
                      className="text-xs gap-1.5 h-8 font-semibold"
                    >
                      <Play className="h-3 w-3" />
                      {isSelected ? "Practice Now" : "Load in Practice Studio"}
                    </Button>

                    {!paper.isOfficial && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePaperMutation.mutate(paper.id)}
                        className="text-xs text-destructive hover:text-destructive h-8 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
