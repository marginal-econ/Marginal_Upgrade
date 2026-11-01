import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  History,
  Lightbulb,
  ListChecks,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getQuestionAnalysis,
  reportIncorrectAoMark,
  requestAoHint,
  submitAoAttempt,
} from "@/lib/ao-fixer.functions";
import { listApprovedEssayQuestions, listBankTopics } from "@/lib/bank.functions";
import { AO3_CAPS, TABLE_A_LEVELS, TABLE_B_LEVELS } from "@/lib/examiner/accuracy-rules";
import type {
  AnnotationSpan,
  AoFixerMarkOutcome,
  AoType,
  FixItem,
  QuestionAnalysisResult,
} from "@/lib/examiner/ao-fixer.server";
import { cn } from "@/lib/utils";

const practiceSearchSchema = z
  .object({
    ao: z.enum(["ao1", "ao2", "ao3"]).optional().catch(undefined),
    question: z.string().optional().catch(undefined),
    q: z.string().optional().catch(undefined),
    topic: z.string().optional().catch(undefined),
    fromGrader: z.union([z.boolean(), z.string()]).optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/practice")({
  validateSearch: (search: Record<string, unknown>) => practiceSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "AO Fixer — Cambridge 9708 Economics" },
      {
        name: "description",
        content:
          "Targeted assessment objective practice. Write short attempts, receive strict Cambridge examiner marking, and rewrite weak links until you achieve full marks.",
      },
    ],
  }),
  component: AoFixerPage,
});

const DEFAULT_TOPICS = [
  "Basic economic ideas and resource allocation",
  "The price system and the micro economy",
  "Government microeconomic intervention",
  "The macro economy",
  "Government macro intervention",
  "International economic issues",
  "Other / not sure",
];

const AO_META: Record<
  AoType,
  {
    code: string;
    title: string;
    action: string;
    practiceMax: number;
    cambridgeScale: string;
    timerSeconds: number;
    softWords: string;
    promptLine: string;
    checklistTemplate: string[];
  }
> = {
  ao1: {
    code: "AO1",
    title: "Knowledge & Understanding",
    action: "Define the right terms precisely",
    practiceMax: 2,
    cambridgeScale: "Cambridge marks AO1 & AO2 together out of 8 (Table A). Practice guide: /2.",
    timerSeconds: 180,
    softWords: "30–70 words (1–2 precise definitions)",
    promptLine: "Define the key terms for this question, one exam-ready line each.",
    checklistTemplate: [
      "Define key terms using exact syllabus wording",
      "Explain the core economic concept accurately",
      "Apply the definition to the question context",
    ],
  },
  ao2: {
    code: "AO2",
    title: "Analysis",
    action: "Build full chains of reasoning",
    practiceMax: 6,
    cambridgeScale: "Cambridge marks AO1 & AO2 together out of 8 (Table A). Practice guide: /6.",
    timerSeconds: 300,
    softWords: "60–140 words (3–5 linked sentences)",
    promptLine: "Write ONE full chain (cause → mechanism → effect → link to the question) in 3–5 sentences.",
    checklistTemplate: [
      "State the initial cause or policy shock",
      "Detail each mechanism step using linking words",
      "Specify correct market movements (prices, costs, curves)",
      "Link directly back to answering the question",
    ],
  },
  ao3: {
    code: "AO3",
    title: "Evaluation",
    action: "Reach a justified judgement",
    practiceMax: 4,
    cambridgeScale: "Cambridge Table B marks strictly out of 4.",
    timerSeconds: 360,
    softWords: "90–180 words (5–8 sentences)",
    promptLine: "Write your evaluation and final judgement in 5–8 sentences, answering the exact question.",
    checklistTemplate: [
      "State a limitation of the main point with consequence",
      "Compare with an alternative on ONE stated criterion",
      "State a condition ('It is most effective when __ because __')",
      "Reach a ranked final judgement using the question's word",
    ],
  },
};

interface AttemptRecord {
  attemptNumber: number;
  text: string;
  outcome: AoFixerMarkOutcome;
  timestamp: string;
}

function AoFixerPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Screen state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTopic, setSelectedTopic] = useState<string>(search.topic || "");
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>(search.question || search.q || "");
  const [questionBankSearch, setQuestionBankSearch] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [questionTab, setQuestionTab] = useState<"bank" | "custom">("bank");
  const [isConfirmingTyped, setIsConfirmingTyped] = useState(false);
  const [selectedAo, setSelectedAo] = useState<AoType>((search.ao as AoType) || "ao3");

  // Server functions
  const fetchTopics = useServerFn(listBankTopics);
  const fetchEssays = useServerFn(listApprovedEssayQuestions);
  const fetchAnalysis = useServerFn(getQuestionAnalysis);
  const executeMark = useServerFn(submitAoAttempt);
  const executeHint = useServerFn(requestAoHint);
  const sendReport = useServerFn(reportIncorrectAoMark);

  // Queries
  const topicsQuery = useQuery({
    queryKey: ["bank-topics-essay"],
    queryFn: () => fetchTopics({ data: { kind: "essay", level: "as" } }),
    staleTime: 10 * 60 * 1000,
  });

  const essaysQuery = useQuery({
    queryKey: ["bank-essays", selectedTopic],
    queryFn: () =>
      fetchEssays({
        data: {
          level: "as",
          topic: selectedTopic && selectedTopic !== "Other / not sure" ? selectedTopic : undefined,
        },
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Analysis query for the current question
  const analysisQuery = useQuery({
    queryKey: ["ao-analysis", selectedQuestion, selectedTopic],
    queryFn: () =>
      fetchAnalysis({
        data: {
          question: selectedQuestion,
          topic: selectedTopic || null,
        },
      }),
    enabled: Boolean(selectedQuestion && selectedQuestion.length >= 10 && step >= 2),
    staleTime: 30 * 60 * 1000,
  });

  // Practice state
  const draftStorageKey = `marginal_ao_fixer_draft_${selectedAo}`;
  const [studentText, setStudentText] = useState("");
  const [structureMode, setStructureMode] = useState(false);
  const [ao3Structure, setAo3Structure] = useState({
    limitation: "",
    comparison: "",
    condition: "",
    judgement: "",
  });
  const [oneChainMode, setOneChainMode] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [currentOutcome, setCurrentOutcome] = useState<AoFixerMarkOutcome | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  const [revealedAo1Defs, setRevealedAo1Defs] = useState<Record<string, boolean>>({});
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(AO_META[selectedAo].timerSeconds);

  // Modals
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeExpected, setDisputeExpected] = useState<number>(0);
  const [disputeNotes, setDisputeNotes] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if started from grader
  useEffect(() => {
    if (search.fromGrader && search.question) {
      setSelectedQuestion(search.question);
      if (search.ao && (search.ao === "ao1" || search.ao === "ao2" || search.ao === "ao3")) {
        setSelectedAo(search.ao);
      }
      if (search.topic) setSelectedTopic(search.topic);
      setStep(2);
    }
  }, [search.fromGrader, search.question, search.ao, search.topic]);

  // Load draft from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved && !studentText) {
        setStudentText(saved);
      }
    } catch {}
  }, [selectedAo, draftStorageKey]);

  // Save draft to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (studentText.trim()) {
        localStorage.setItem(draftStorageKey, studentText);
      }
    } catch {}
  }, [studentText, draftStorageKey]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive) return;
    if (secondsRemaining <= 0) {
      toast.warning("Time's up! Finish your sentence and submit for marking.");
      setTimerActive(false);
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  // Reset timer on AO switch
  useEffect(() => {
    setSecondsRemaining(AO_META[selectedAo].timerSeconds);
    setTimerActive(false);
  }, [selectedAo]);

  // Combine structure boxes into student text for AO3
  const syncAo3StructureToText = useCallback(() => {
    const parts = [
      ao3Structure.limitation.trim(),
      ao3Structure.comparison.trim(),
      ao3Structure.condition.trim(),
      ao3Structure.judgement.trim(),
    ].filter(Boolean);
    if (parts.length > 0) {
      setStudentText(parts.join(" "));
    }
  }, [ao3Structure]);

  // Mark attempt mutation
  const markMutation = useMutation({
    mutationFn: async () => {
      if (structureMode && selectedAo === "ao3") {
        syncAo3StructureToText();
      }
      const textToMark = studentText.trim();
      if (textToMark.length < 15) {
        throw new Error("Write at least two sentences before submitting for marking.");
      }
      const prev = currentOutcome?.mark;
      const res = await executeMark({
        data: {
          ao: selectedAo,
          question: selectedQuestion,
          studentText: textToMark,
          attemptNumber: attempts.length + 1,
          previousMark: prev,
          topic: selectedTopic || null,
        },
      });
      return res;
    },
    onSuccess: (data) => {
      setCurrentOutcome(data);
      const newRecord: AttemptRecord = {
        attemptNumber: attempts.length + 1,
        text: studentText,
        outcome: data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAttempts((prev) => [...prev, newRecord]);

      if (data.mark === data.maxMark) {
        setStep(4);
        toast.success(`Full marks achieved! ${data.mark}/${data.maxMark}`);
      } else {
        setStep(3);
        if (data.delta && data.delta > 0) {
          toast.success(`Mark increased by +${data.delta}! (${data.mark}/${data.maxMark})`);
        } else {
          toast.info(`Marked: ${data.mark}/${data.maxMark} (${data.tableLevelLabel})`);
        }
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Marking failed. Your text is saved — please try again.");
    },
  });

  // Request hint mutation
  const hintMutation = useMutation({
    mutationFn: () =>
      executeHint({
        data: {
          ao: selectedAo,
          question: selectedQuestion,
          studentText,
        },
      }),
    onSuccess: (data) => {
      setActiveHint(data.hint);
      toast.info("Examiner Nudge", { description: data.hint, duration: 8000 });
    },
    onError: () => toast.error("Could not fetch a hint right now."),
  });

  // Dispute mutation
  const disputeMutation = useMutation({
    mutationFn: () =>
      sendReport({
        data: {
          question: selectedQuestion,
          ao: selectedAo,
          studentText,
          awardedMark: currentOutcome?.mark ?? 0,
          expectedMark: disputeExpected,
          notes: disputeNotes,
        },
      }),
    onSuccess: () => {
      toast.success("Dispute reported for examiner review.");
      setShowDisputeModal(false);
      setDisputeNotes("");
    },
    onError: () => toast.error("Could not submit report."),
  });

  // Word count and sentence count
  const wordCount = useMemo(() => {
    return studentText.trim().split(/\s+/).filter(Boolean).length;
  }, [studentText]);

  const sentenceCount = useMemo(() => {
    const matches = studentText.match(/[^.!?]+[.!?]+/g);
    return matches ? matches.length : studentText.trim().length > 0 ? 1 : 0;
  }, [studentText]);

  const bestMark = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.max(...attempts.map((a) => a.outcome.mark));
  }, [attempts]);

  // Topic list with counts or fallback
  const availableTopics = useMemo(() => {
    if (topicsQuery.data && topicsQuery.data.length > 0) {
      return topicsQuery.data.map((t) => t.topic);
    }
    return DEFAULT_TOPICS;
  }, [topicsQuery.data]);

  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return availableTopics;
    return availableTopics.filter((t) =>
      t.toLowerCase().includes(topicSearch.toLowerCase()),
    );
  }, [availableTopics, topicSearch]);

  const bankEssays = essaysQuery.data ?? [];
  const filteredBankEssays = useMemo(() => {
    if (!questionBankSearch.trim()) return bankEssays;
    const lower = questionBankSearch.toLowerCase();
    return bankEssays.filter(
      (e) =>
        e.question_text.toLowerCase().includes(lower) ||
        (e.topic && e.topic.toLowerCase().includes(lower)) ||
        (e.exam_series && e.exam_series.toLowerCase().includes(lower)),
    );
  }, [bankEssays, questionBankSearch]);

  // Handle start practice from Setup
  const handleStartPractice = () => {
    if (!selectedQuestion.trim()) {
      toast.error("Choose or type a 12-mark essay question first.");
      return;
    }
    setStep(2);
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!markMutation.isPending && studentText.trim().length >= 15) {
        markMutation.mutate();
      }
    }
  };

  // Jump to specific quote in editor
  const handleFixOneClick = (quote: string) => {
    setStep(2);
    if (textareaRef.current) {
      textareaRef.current.focus();
      const idx = studentText.indexOf(quote);
      if (idx !== -1) {
        textareaRef.current.setSelectionRange(idx, idx + quote.length);
      }
    }
  };

  const analysis = analysisQuery.data;
  const meta = AO_META[selectedAo];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <PageHeader
        title="AO Fixer"
        description="Target one assessment objective at a time. Write short attempts, get strictly marked by a Cambridge examiner, and rewrite the weak links to reach full marks."
      />

      {/* Screen 1: SETUP */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-200">
          {/* Step Progress Chips */}
          <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Setup Flow:
            </span>
            <Badge
              variant={selectedTopic ? "secondary" : "default"}
              className="gap-1 cursor-pointer"
              onClick={() => {}}
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              Topic: {selectedTopic || "Choose topic"}
            </Badge>
            <Badge
              variant={selectedQuestion ? "secondary" : "outline"}
              className="gap-1 cursor-pointer"
              onClick={() => {}}
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Question: {selectedQuestion ? "Selected" : "Pick or type"}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1"
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              Objective: {meta.code} ({meta.title})
            </Badge>
          </div>

          {/* 1. TOPIC SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  Select a Syllabus Topic
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick a Cambridge 9708 unit to load official past-paper questions.
                </p>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search topics..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(topic);
                      // Clear previously selected question if switching topic
                      if (selectedTopic !== topic) setSelectedQuestion("");
                    }}
                    className={cn(
                      "text-left p-3.5 rounded-xl border transition-all text-xs font-medium flex items-center justify-between",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm"
                        : "border-border hover:border-border/80 hover:bg-muted/50 text-foreground",
                    )}
                  >
                    <span className="line-clamp-2 leading-snug">{topic}</span>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. QUESTION SECTION */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Choose or Type a 12-Mark Essay Question
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Practice against past Cambridge questions or type in any essay prompt.
              </p>
            </div>

            <Tabs
              value={questionTab}
              onValueChange={(v) => setQuestionTab(v as "bank" | "custom")}
              className="space-y-3"
            >
              <TabsList className="grid grid-cols-2 max-w-xs h-9">
                <TabsTrigger value="bank" className="text-xs gap-1.5">
                  <BookMarked className="size-3.5" /> Question Bank
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-xs gap-1.5">
                  <PenLine className="size-3.5" /> Type Your Own
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Question Bank */}
              <TabsContent value="bank" className="space-y-3 mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search question text, command words ('best', 'assess'), or years..."
                    value={questionBankSearch}
                    onChange={(e) => setQuestionBankSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="border border-border rounded-xl divide-y divide-border max-h-72 overflow-y-auto bg-card">
                  {essaysQuery.isLoading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                      <p>Loading Cambridge essay questions...</p>
                    </div>
                  ) : filteredBankEssays.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
                      <p>No questions found in this topic matching your search.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuestionTab("custom");
                          setTypedQuestion(questionBankSearch);
                        }}
                        className="text-xs"
                      >
                        Type your own question instead
                      </Button>
                    </div>
                  ) : (
                    filteredBankEssays.map((q) => {
                      const isSelected = selectedQuestion === q.question_text;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuestion(q.question_text)}
                          className={cn(
                            "p-3.5 cursor-pointer transition-colors text-xs space-y-2",
                            isSelected
                              ? "bg-primary/10 border-l-4 border-l-primary"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-foreground leading-relaxed">
                              {q.question_text}
                            </p>
                            {isSelected && (
                              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            {q.exam_series && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {q.exam_series}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {q.max_mark || 12} marks
                            </Badge>
                            {q.topic && (
                              <span className="text-muted-foreground/80 truncate max-w-xs">
                                {q.topic}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Type Your Own */}
              <TabsContent value="custom" className="space-y-3 mt-0">
                {!isConfirmingTyped ? (
                  <div className="space-y-2.5">
                    <Textarea
                      placeholder="Paste or type any 12-mark essay question (e.g. 'Discuss whether an indirect tax is the most effective policy to reduce consumption of demerit goods.')"
                      rows={4}
                      value={typedQuestion}
                      onChange={(e) => setTypedQuestion(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">
                        Accepts any standard Cambridge 12-mark essay question.
                      </span>
                      <Button
                        size="sm"
                        disabled={typedQuestion.trim().length < 15}
                        onClick={() => {
                          setIsConfirmingTyped(true);
                          setSelectedQuestion(typedQuestion.trim());
                        }}
                      >
                        Verify Question
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        Is this the exact wording?
                      </span>
                      <p className="text-sm font-medium text-foreground italic">
                        "{selectedQuestion}"
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success("Question confirmed!");
                        }}
                        className="text-xs"
                      >
                        <Check className="size-3.5 mr-1" /> Exact Wording Confirmed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsConfirmingTyped(false)}
                        className="text-xs"
                      >
                        Edit Wording
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* 3. OBJECTIVE SECTION */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </span>
                Choose ONE Objective to Master
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Work through short focused attempts until that objective reaches full marks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(["ao1", "ao2", "ao3"] as AoType[]).map((aoKey) => {
                const aoInfo = AO_META[aoKey];
                const isSelected = selectedAo === aoKey;
                return (
                  <Card
                    key={aoKey}
                    onClick={() => setSelectedAo(aoKey)}
                    className={cn(
                      "p-4 cursor-pointer transition-all border relative flex flex-col justify-between space-y-3",
                      isSelected
                        ? "border-primary bg-primary/[0.06] ring-2 ring-primary shadow-md"
                        : "border-border hover:border-border/80 hover:bg-muted/40",
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold font-mono text-xs",
                            aoKey === "ao1"
                              ? "text-ao1 border-ao1/40"
                              : aoKey === "ao2"
                                ? "text-ao2 border-ao2/40"
                                : "text-ao3 border-ao3/40",
                          )}
                        >
                          {aoInfo.code}
                        </Badge>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          Max: {aoInfo.practiceMax} marks
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">
                        {aoInfo.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {aoInfo.action}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
                      <p className="font-mono text-[10px]">
                        Target: {aoInfo.softWords}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80">
                        {aoInfo.cambridgeScale}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Marks are estimates calibrated against Cambridge 9708 examiner standards.
            </span>
            <Button
              size="lg"
              disabled={!selectedQuestion.trim() || !selectedTopic}
              onClick={handleStartPractice}
              className="gap-2 px-6"
            >
              Start Practice
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Screen 2 & 3: PRACTICE WORKSPACE & MARKING RESULT */}
      {(step === 2 || step === 3) && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Bar */}
          <div className="border-b border-border bg-card/60 backdrop-blur px-4 py-2.5 md:px-8 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0"
              >
                <ArrowLeft className="size-3.5" /> Setup
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono font-bold text-xs uppercase px-2 py-0.5",
                      selectedAo === "ao1"
                        ? "text-ao1 border-ao1/40 bg-ao1/10"
                        : selectedAo === "ao2"
                          ? "text-ao2 border-ao2/40 bg-ao2/10"
                          : "text-ao3 border-ao3/40 bg-ao3/10",
                    )}
                  >
                    {meta.code} Practice
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setIsQuestionCollapsed(!isQuestionCollapsed)}
                    className="text-xs font-semibold text-foreground truncate hover:underline flex items-center gap-1"
                  >
                    <span className="truncate">{selectedQuestion}</span>
                    {isQuestionCollapsed ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Attempt strip & Score Tracker */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Attempt {attempts.length + (step === 3 ? 0 : 1)}/3
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span>
                  Best:{" "}
                  <strong className="text-foreground">
                    {bestMark}/{meta.practiceMax}
                  </strong>
                </span>
              </div>

              {/* Live Timer Toggle */}
              <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1 bg-background text-xs font-mono">
                <Clock className="size-3.5 text-muted-foreground" />
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    secondsRemaining < 30 ? "text-rose-500 animate-pulse" : "text-foreground",
                  )}
                >
                  {Math.floor(secondsRemaining / 60)}:
                  {(secondsRemaining % 60).toString().padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setTimerActive(!timerActive)}
                  className="ml-1 text-[10px] text-primary hover:underline font-sans"
                >
                  {timerActive ? "Pause" : "Start"}
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Full Question Header */}
          {!isQuestionCollapsed && (
            <div className="px-4 py-2 bg-muted/40 border-b border-border/80 text-xs text-muted-foreground flex items-center justify-between">
              <p className="line-clamp-2 leading-relaxed">
                <strong className="text-foreground font-semibold">Exam Prompt: </strong>
                {selectedQuestion}
              </p>
              <button
                type="button"
                onClick={() => setIsQuestionCollapsed(true)}
                className="text-[11px] text-primary hover:underline ml-3 shrink-0"
              >
                Hide
              </button>
            </div>
          )}

          {/* Main Split Body */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[40%_60%] divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* COACH PANEL (Left 40%) */}
            <div className="p-4 md:p-6 space-y-5 overflow-y-auto bg-muted/[0.15]">
              {/* Card 1: This Question Needs */}
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Question Analysis
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {analysis?.guidanceLine || "This question needs: a balanced, evaluated argument."}
                </p>
              </div>

              {/* Card 2: What Full Marks Needs */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> What Full Marks Needs (
                    {meta.code})
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Max {meta.practiceMax} marks
                  </Badge>
                </div>

                {/* AO1 Requirements */}
                {selectedAo === "ao1" && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-[11px]">
                      Tap any term chip to inspect its syllabus-accurate definition:
                    </p>
                    <div className="space-y-2">
                      {analysis?.fullMarkRequirements.ao1.terms.map((t, idx) => {
                        const isRevealed = Boolean(revealedAo1Defs[t.term]);
                        return (
                          <div
                            key={idx}
                            className="border border-border rounded-lg p-2.5 bg-background space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{t.term}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedAo1Defs((prev) => ({
                                    ...prev,
                                    [t.term]: !prev[t.term],
                                  }))
                                }
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                {isRevealed ? (
                                  <>
                                    <EyeOff className="size-3" /> Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="size-3" /> Reveal definition
                                  </>
                                )}
                              </button>
                            </div>
                            {isRevealed && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40 font-serif italic">
                                {t.definition}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {analysis?.fullMarkRequirements.ao1.commonTraps &&
                      analysis.fullMarkRequirements.ao1.commonTraps.length > 0 && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300 space-y-1">
                          <span className="font-semibold block flex items-center gap-1">
                            <AlertTriangle className="size-3" /> Common Trap
                          </span>
                          <p>{analysis.fullMarkRequirements.ao1.commonTraps[0]}</p>
                        </div>
                      )}
                  </div>
                )}

                {/* AO2 Requirements */}
                {selectedAo === "ao2" && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-[11px]">
                      Required causal progression (cause → mechanism → effect → link):
                    </p>
                    <div className="space-y-2">
                      {analysis?.fullMarkRequirements.ao2.chains.map((chain, idx) => {
                        // Check if this chain was evaluated
                        const evalChain = currentOutcome?.chainsEvaluated?.[idx];
                        const status = evalChain?.status ?? "not_started";
                        return (
                          <div
                            key={chain.id || idx}
                            className="border border-border rounded-lg p-2.5 bg-background space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                Chain {idx + 1}: {chain.mechanismFocus}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-mono",
                                  status === "complete"
                                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                    : status === "partial"
                                      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                      : "border-border text-muted-foreground",
                                )}
                              >
                                {status === "complete"
                                  ? "Complete"
                                  : status === "partial"
                                    ? "Partial"
                                    : "Not started"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {chain.stepChain}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {analysis?.fullMarkRequirements.ao2.diagramTip && (
                      <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-2.5 text-[11px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-primary block">
                          Diagram Tip: {analysis.fullMarkRequirements.ao2.diagramTip.name}
                        </span>
                        <p>{analysis.fullMarkRequirements.ao2.diagramTip.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AO3 Requirements */}
                {selectedAo === "ao3" && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-[11px]">
                      Four-step structure required for full marks:
                    </p>
                    <div className="space-y-2">
                      {analysis?.fullMarkRequirements.ao3.steps.map((st, idx) => {
                        const isChecked =
                          idx === 0
                            ? currentOutcome?.ao3Checklist?.limitationChecked
                            : idx === 1
                              ? currentOutcome?.ao3Checklist?.comparisonChecked
                              : idx === 2
                                ? currentOutcome?.ao3Checklist?.conditionChecked
                                : currentOutcome?.ao3Checklist?.judgementChecked;

                        return (
                          <div
                            key={idx}
                            className="border border-border rounded-lg p-2.5 bg-background space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{st.title}</span>
                              {isChecked ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                                  <Check className="size-2.5" /> Met
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Pending</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {st.instruction}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: How You Lose Marks (Strict Caps) */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5 text-rose-400" /> How You Lose Marks (Caps)
                  </h3>
                </div>
                <div className="space-y-2 text-xs">
                  {selectedAo === "ao3" ? (
                    AO3_CAPS.slice(0, 4).map((cap) => (
                      <div
                        key={cap.id}
                        className="p-2 rounded-lg bg-background/80 border border-border text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{cap.label}</span>
                          <span className="text-rose-400 font-mono">Max {cap.maxMark}/4</span>
                        </div>
                        <p className="text-muted-foreground leading-tight text-[10px]">
                          {cap.triggerDescription}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-1.5 text-[11px] text-muted-foreground">
                      <p>• 1 major error caps AO1+AO2 at 7/8.</p>
                      <p>• 2 or more major errors cap mark at Level 2 (max 5/8).</p>
                      <p>• Fewer than 3 complete chains caps at Level 2 (max 5/8).</p>
                      <p>• Definitions alone do not lift beyond basic credit.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Examiner Accuracy Note */}
              <p className="text-[11px] text-muted-foreground/75 leading-relaxed italic">
                Cambridge Examiner Stance: We mark only what is written, start at the bottom of
                the level, and move up only for quoted evidence. Fluent tone earns nothing on its own.
              </p>
            </div>

            {/* WRITING PANEL & RESULTS (Right 60%) */}
            <div className="p-4 md:p-6 space-y-5 overflow-y-auto flex flex-col justify-between">
              {/* STEP 3: MARKING RESULT IN-PLACE */}
              {step === 3 && currentOutcome && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Mark Card */}
                  <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 space-y-3 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                          {currentOutcome.mark}
                        </span>
                        <span className="text-lg text-muted-foreground font-medium">
                          /{currentOutcome.maxMark}
                        </span>
                        {typeof currentOutcome.delta === "number" && currentOutcome.delta !== 0 && (
                          <Badge
                            className={cn(
                              "text-xs font-bold font-mono ml-2",
                              currentOutcome.delta > 0
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {currentOutcome.delta > 0 ? `+${currentOutcome.delta}` : currentOutcome.delta}
                          </Badge>
                        )}
                      </div>

                      <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                        {currentOutcome.tableLevelLabel}
                      </Badge>
                    </div>

                    <p className="text-xs font-medium text-foreground/90 leading-relaxed">
                      {currentOutcome.reasonLine}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <Progress
                        value={(currentOutcome.mark / currentOutcome.maxMark) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Active Caps Chips */}
                  {currentOutcome.activeCapIds.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                        Active Caps Preventing Higher Marks:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentOutcome.activeCapIds.map((capId) => {
                          const capDef = AO3_CAPS.find((c) => c.id === capId);
                          return (
                            <TooltipProvider key={capId}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs py-1 px-2.5 gap-1.5"
                                  >
                                    <ShieldAlert className="size-3" />
                                    {capDef?.label || capId}: Max {capDef?.maxMark || 2}/4
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs space-y-1 p-3">
                                  <p className="font-semibold text-foreground">How to remove this cap:</p>
                                  <p className="text-muted-foreground">{capDef?.howToFix}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Annotated Student Script */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Your Answer, Annotated
                      </h4>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowHighlights(!showHighlights)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          {showHighlights ? "Hide annotations" : "Show annotations"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed font-sans text-foreground/90 whitespace-pre-wrap">
                      {showHighlights && currentOutcome.annotations.length > 0 ? (
                        <div className="space-y-3">
                          <p>{studentText}</p>
                          <div className="pt-3 border-t border-border/60 space-y-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground block">
                              Examiner Line Annotations:
                            </span>
                            {currentOutcome.annotations.map((ann, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "p-2 rounded-lg text-[11px] flex items-start gap-2 border",
                                  ann.type === "credit"
                                    ? "bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-300"
                                    : ann.type === "partial"
                                      ? "bg-amber-500/[0.08] border-amber-500/30 text-amber-300"
                                      : "bg-rose-500/[0.08] border-rose-500/30 text-rose-300",
                                )}
                              >
                                {ann.type === "credit" ? (
                                  <Check className="size-3.5 shrink-0 mt-0.5 text-emerald-400" />
                                ) : ann.type === "partial" ? (
                                  <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                                ) : (
                                  <X className="size-3.5 shrink-0 mt-0.5 text-rose-400" />
                                )}
                                <div className="space-y-0.5">
                                  <p>
                                    <strong className="underline decoration-dotted italic">
                                      "{ann.quote}"
                                    </strong>
                                    : {ann.tooltip}
                                  </p>
                                  {ann.replacement && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Suggested syllabus phrasing: {ann.replacement}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p>{studentText}</p>
                      )}
                    </div>
                  </div>

                  {/* What You Did Right */}
                  {currentOutcome.whatYouDidRightQuote && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 text-xs space-y-1">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" /> What You Did Right
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">
                          "{currentOutcome.whatYouDidRightQuote}"
                        </strong>{" "}
                        — {currentOutcome.whatYouDidRightComment}
                      </p>
                    </div>
                  )}

                  {/* Actionable Fix List */}
                  {currentOutcome.fixList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Exact Missing Links to Fix
                      </h4>
                      <div className="space-y-2">
                        {currentOutcome.fixList.map((fixItem) => (
                          <div
                            key={fixItem.id}
                            className="rounded-xl border border-border bg-card p-3.5 text-xs flex items-start justify-between gap-3 shadow-sm"
                          >
                            <div className="space-y-1 min-w-0">
                              <p className="text-muted-foreground">
                                Weak link:{" "}
                                <strong className="text-foreground italic">
                                  "{fixItem.quote}"
                                </strong>
                              </p>
                              <p className="font-medium text-foreground">
                                ➔ {fixItem.fix}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                {fixItem.marksWorth}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFixOneClick(fixItem.quote)}
                                className="text-[11px] h-7 px-2"
                              >
                                Fix this one
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Answer (if unlocked) */}
                  {currentOutcome.modelAnswerUnlocked && (
                    <div className="rounded-xl border border-primary/40 bg-primary/[0.04] p-4 text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary flex items-center gap-1.5">
                          <Trophy className="size-4" /> Full-Mark Model Answer (Unlocked)
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(currentOutcome.modelAnswerUnlocked!);
                            toast.success("Model answer copied to clipboard!");
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <Copy className="size-3" /> Copy
                        </Button>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed font-serif italic text-sm">
                        {currentOutcome.modelAnswerUnlocked}
                      </p>
                    </div>
                  )}

                  {/* Next Step Action Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDisputeModal(true)}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      Report an incorrect mark
                    </button>

                    <Button
                      size="default"
                      onClick={() => {
                        setStep(2);
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="gap-2"
                    >
                      <RotateCcw className="size-3.5" /> Rewrite the Weak Part
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: WRITING WORKSPACE */}
              {step === 2 && (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* Previous Attempt Reference */}
                  {attempts.length > 0 && (
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold">
                          Previous Attempt ({attempts[attempts.length - 1].outcome.mark}/
                          {meta.practiceMax})
                        </span>
                        <span className="font-mono text-[10px]">
                          {attempts[attempts.length - 1].timestamp}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-foreground/80 italic">
                        "{attempts[attempts.length - 1].text}"
                      </p>
                    </div>
                  )}

                  {/* Mode Toggles */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {meta.promptLine}
                    </span>

                    <div className="flex items-center gap-2">
                      {selectedAo === "ao3" && (
                        <Button
                          variant={structureMode ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setStructureMode(!structureMode)}
                          className="h-7 text-xs"
                        >
                          {structureMode ? "Free text mode" : "Guided 4-box mode"}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={hintMutation.isPending}
                        onClick={() => hintMutation.mutate()}
                        className="h-7 text-xs text-primary gap-1"
                      >
                        <Lightbulb className="size-3.5" />
                        {hintMutation.isPending ? "Nudging..." : "Hint"}
                      </Button>
                    </div>
                  </div>

                  {/* Active Hint Banner */}
                  {activeHint && (
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-start justify-between gap-2">
                      <p>
                        <strong>Examiner Hint: </strong>
                        {activeHint}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveHint(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {/* AO3 Structured 4-Box Inputs */}
                  {structureMode && selectedAo === "ao3" ? (
                    <div className="space-y-3 flex-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          1. Limitation of main policy (with reason & consequence):
                        </label>
                        <Input
                          value={ao3Structure.limitation}
                          onChange={(e) => {
                            setAo3Structure((prev) => ({ ...prev, limitation: e.target.value }));
                            syncAo3StructureToText();
                          }}
                          placeholder="e.g. However, this policy is limited by high opportunity cost..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          2. Comparison with an alternative on ONE stated criterion:
                        </label>
                        <Input
                          value={ao3Structure.comparison}
                          onChange={(e) => {
                            setAo3Structure((prev) => ({ ...prev, comparison: e.target.value }));
                            syncAo3StructureToText();
                          }}
                          placeholder="e.g. Compared to regulation, a tax acts faster because..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          3. Specific condition:
                        </label>
                        <Input
                          value={ao3Structure.condition}
                          onChange={(e) => {
                            setAo3Structure((prev) => ({ ...prev, condition: e.target.value }));
                            syncAo3StructureToText();
                          }}
                          placeholder="e.g. It is most effective when demand is price elastic because..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          4. Final judgement using exact question word:
                        </label>
                        <Input
                          value={ao3Structure.judgement}
                          onChange={(e) => {
                            setAo3Structure((prev) => ({ ...prev, judgement: e.target.value }));
                            syncAo3StructureToText();
                          }}
                          placeholder="e.g. Therefore, while both have merit, policy X is the best method because..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Standard Large Textarea */
                    <div className="space-y-1 flex-1 flex flex-col">
                      <Textarea
                        ref={textareaRef}
                        rows={12}
                        value={studentText}
                        onChange={(e) => setStudentText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Write your ${meta.title} response here...\nTarget: ${meta.softWords}`}
                        className="flex-1 min-h-[220px] text-xs leading-relaxed font-sans"
                      />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <span>
                          {wordCount} words · {sentenceCount} sentences
                        </span>
                        <span className="font-mono text-[10px]">
                          Ctrl/Cmd + Enter to mark
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submission Notice & Submit Button */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {sentenceCount < 2 && studentText.trim().length > 0 && (
                      <p className="text-[11px] text-amber-400">
                        ⚠️ Note: responses under 2 sentences are too short to reach top Cambridge
                        levels.
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Drafts auto-save continuously.
                      </span>

                      <Button
                        size="lg"
                        disabled={markMutation.isPending || studentText.trim().length < 15}
                        onClick={() => markMutation.mutate()}
                        className="gap-2 px-6"
                      >
                        {markMutation.isPending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Marking like an examiner...
                          </>
                        ) : (
                          <>
                            Mark My Answer
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen 4: FULL MARKS CELEBRATION */}
      {step === 4 && currentOutcome && (
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 max-w-4xl mx-auto w-full space-y-6 animate-in zoom-in-95 duration-200">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-6 text-center space-y-3 shadow-lg">
            <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Trophy className="size-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">
                Full Marks Reached! {currentOutcome.mark}/{currentOutcome.maxMark}
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Your script now satisfies every Cambridge criterion for {meta.code}: accurate
                definitions, complete causal mechanisms, and justified evaluative weighing.
              </p>
            </div>
          </div>

          {/* Marks Journey Card */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Marks Progression Across Attempts
            </h3>
            <div className="flex items-center gap-3">
              {attempts.map((att, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-xl border border-border bg-card text-center min-w-[72px]">
                    <span className="text-[10px] text-muted-foreground block">
                      Attempt {att.attemptNumber}
                    </span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {att.outcome.mark}/{meta.practiceMax}
                    </span>
                  </div>
                  {i < attempts.length - 1 && (
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/90 font-medium pt-1">
              What fixed it:{" "}
              <span className="text-muted-foreground">
                {currentOutcome.reasonLine || "Resolved all missing analytical links and evaluative caps."}
              </span>
            </p>
          </Card>

          {/* Copyable Exam Checklist */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ListChecks className="size-4 text-primary" /> Cambridge Exam Checklist (
                {meta.code})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(meta.checklistTemplate.join("\n"));
                  toast.success("Checklist copied!");
                }}
                className="h-7 text-xs gap-1"
              >
                <Copy className="size-3" /> Copy checklist
              </Button>
            </div>
            <ul className="space-y-2 text-xs">
              {meta.checklistTemplate.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground/90">
                  <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Next Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStudentText("");
                setAttempts([]);
                setCurrentOutcome(null);
                setStep(1);
              }}
              className="text-xs"
            >
              Same AO, new question
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextAo = selectedAo === "ao1" ? "ao2" : selectedAo === "ao2" ? "ao3" : "ao1";
                setSelectedAo(nextAo);
                setStudentText("");
                setAttempts([]);
                setCurrentOutcome(null);
                setStep(2);
              }}
              className="text-xs"
            >
              Different AO, same question
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimerActive(true);
                setSecondsRemaining(AO_META[selectedAo].timerSeconds);
                setStudentText("");
                setStep(2);
              }}
              className="text-xs"
            >
              Try under exam timer
            </Button>

            <Button
              size="sm"
              onClick={() => navigate({ to: "/grade" })}
              className="text-xs gap-1"
            >
              Back to Full Grader
            </Button>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Report an Incorrect Mark</DialogTitle>
            <DialogDescription className="text-xs">
              Disputed marks are reviewed by senior examiners to refine automated marking accuracy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground">Question:</span>
              <p className="line-clamp-2 italic text-foreground">{selectedQuestion}</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground">App Awarded Mark:</span>
              <p className="font-mono text-sm">
                {currentOutcome?.mark}/{currentOutcome?.maxMark}
              </p>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="dispute-expected">
                Expected Mark (0–{currentOutcome?.maxMark}):
              </label>
              <Input
                id="dispute-expected"
                type="number"
                min={0}
                max={currentOutcome?.maxMark || 4}
                value={disputeExpected}
                onChange={(e) => setDisputeExpected(Number(e.target.value))}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="dispute-notes">
                Why do you believe this mark was incorrect?
              </label>
              <Textarea
                id="dispute-notes"
                rows={3}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="Mention specific economic points or chains that were overlooked..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisputeModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
              className="text-xs"
            >
              {disputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
