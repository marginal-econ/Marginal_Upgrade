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
import { GradingProgress, type ProgressStage } from "@/components/app/grading-progress";
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
import { cn, cleanStars, stripStars } from "@/lib/utils";

const practiceSearchSchema = z
  .object({
    ao: z.enum(["ao1", "ao2", "ao3"]).optional().catch(undefined),
    question: z.string().optional().catch(undefined),
    q: z.string().optional().catch(undefined),
    topic: z.string().optional().catch(undefined),
    tariff: z.union([z.number(), z.string()]).optional().catch(undefined),
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
          "Targeted assessment objective practice for 8, 12, and 20-mark Cambridge economics essays. Write short attempts, receive calibrated examiner marking, and rewrite weak links to full marks.",
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

export function getAoMeta(tariff: 8 | 12 | 20): Record<
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
> {
  const is8 = tariff === 8;
  const is20 = tariff === 20;

  return {
    ao1: {
      code: "AO1",
      title: "Knowledge & Understanding",
      action: "Two simple definitions, related examples, formulas, or real show of knowledge",
      practiceMax: 2,
      cambridgeScale: "Cambridge marks AO1 out of 2 marks across all tariffs (8, 12, 20).",
      timerSeconds: 180,
      softWords: "30–70 words (two clear knowledge points)",
      promptLine: "Provide two simple definitions, examples, or formulas appropriate to the question.",
      checklistTemplate: [
        "Two simple definitions appropriate to the question",
        "Examples or formulas related to the topic",
        "Any real show of economic knowledge",
      ],
    },
    ao2: {
      code: "AO2",
      title: "Analysis",
      action: "Clear chains of analysis (cause → mechanism → effect → link)",
      practiceMax: is8 ? 4 : is20 ? 12 : 6,
      cambridgeScale: `Cambridge marks AO2 out of ${is8 ? 4 : is20 ? 12 : 6} marks for a ${tariff}-mark question.`,
      timerSeconds: is8 ? 240 : is20 ? 480 : 300,
      softWords: is8
        ? "60–120 words (2 distinct causal chains)"
        : is20
          ? "160–320 words (enter all developed analysis points, both sides)"
          : "90–180 words (enter all 3 analysis points, ~2 marks each)",
      promptLine: is8
        ? "Enter both analysis points (cause → mechanism → effect → link to question) for 4 marks."
        : is20
          ? "Enter all your developed analysis points covering multiple sides and transmission mechanisms for 12 marks."
          : "Enter all 3 analysis points (cause → mechanism → effect → link to question) for 6 marks.",
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
      action: "Evaluative depth, trade-offs, conditions, and justified judgement",
      practiceMax: is8 ? 2 : is20 ? 6 : 4,
      cambridgeScale: `Cambridge Table B marks strictly out of ${is8 ? 2 : is20 ? 6 : 4} for a ${tariff}-mark question.`,
      timerSeconds: is8 ? 240 : is20 ? 480 : 360,
      softWords: is8
        ? "50–100 words (1 evaluative trade-off + 1 concise conclusion)"
        : is20
          ? "140–250 words (balanced evaluation + conditional judgement)"
          : "90–180 words (limitations, comparison, condition, justified judgement)",
      promptLine: is8
        ? "Write 1 evaluative point (limitation/condition) and a direct final conclusion answering the question."
        : is20
          ? "Write your comprehensive evaluation weighing alternative policies and reaching a conditional final judgement."
          : "Write your evaluation and final judgement in 5–8 sentences, answering the exact question.",
      checklistTemplate: [
        "State a limitation or trade-off with economic consequence",
        "Compare against an alternative on ONE stated criterion",
        "State a condition ('It is most effective when __ because __')",
        "Reach a ranked final judgement using the question's word",
      ],
    },
  };
}

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
  const [tariff, setTariff] = useState<8 | 12 | 20>(() => {
    if (search.tariff) {
      const num = Number(search.tariff);
      if (num === 8 || num === 12 || num === 20) return num as 8 | 12 | 20;
    }
    return 12;
  });
  const [selectedTopic, setSelectedTopic] = useState<string>(search.topic || "");
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>(search.question || search.q || "");
  const [questionBankSearch, setQuestionBankSearch] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [questionTab, setQuestionTab] = useState<"bank" | "custom">("bank");
  const [isConfirmingTyped, setIsConfirmingTyped] = useState(false);
  const [selectedAo, setSelectedAo] = useState<AoType>((search.ao as AoType) || "ao3");

  // Dynamic AO metadata calibrated to selected tariff
  const aoMeta = useMemo(() => getAoMeta(tariff), [tariff]);
  const meta = aoMeta[selectedAo];

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
    queryKey: ["ao-analysis", selectedQuestion, selectedTopic, tariff],
    queryFn: () =>
      fetchAnalysis({
        data: {
          question: selectedQuestion,
          topic: selectedTopic || null,
          tariff,
        },
      }),
    enabled: Boolean(selectedQuestion && selectedQuestion.length >= 10 && step >= 2),
    staleTime: 30 * 60 * 1000,
  });

  // Practice state
  const draftStorageKey = `marginal_ao_fixer_draft_${selectedAo}_${tariff}`;
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
  const [secondsRemaining, setSecondsRemaining] = useState(meta.timerSeconds);

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
      if (search.tariff) {
        const num = Number(search.tariff);
        if (num === 8 || num === 12 || num === 20) setTariff(num as 8 | 12 | 20);
      }
      setStep(2);
    }
  }, [search.fromGrader, search.question, search.ao, search.topic, search.tariff]);

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

  // Reset timer on AO switch or tariff switch
  useEffect(() => {
    setSecondsRemaining(meta.timerSeconds);
    setTimerActive(false);
  }, [selectedAo, tariff, meta.timerSeconds]);

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

  // Progress Bar Stages tailored to each AO
  const currentAoStages: ProgressStage[] = useMemo(() => {
    if (selectedAo === "ao1") {
      return [
        {
          label: "Checking Cambridge 9708 Knowledge Base & Definitions",
          weight: 2,
          shortTitle: "Syllabus Definitions",
          backendDetails: [
            "Referencing Cambridge 9708 syllabus definitions and key concepts.",
            "Validating exam-ready phrasing, terminology, and models.",
          ],
        },
        {
          label: "Auditing 2 Knowledge Points (Definitions, Examples, Formulas)",
          weight: 3,
          shortTitle: "Knowledge Audit",
          backendDetails: [
            "Auditing candidate's response for two simple definitions or real shows of knowledge.",
            "Positively crediting related economic examples, diagrams, or formulas.",
          ],
        },
        {
          label: "Calibrating Mark & Synthesizing Targeted Tips",
          weight: 2,
          shortTitle: "Examiner Calibration",
          backendDetails: [
            "Awarding marks out of 2 with positive Cambridge examiner credit.",
            "Generating instant actionable upgrade recommendations.",
          ],
        },
      ];
    }

    if (selectedAo === "ao2") {
      return [
        {
          label: "Retrieving Cambridge 9708 Analytical Transmission Mechanisms",
          weight: 3,
          shortTitle: "Transmission Pathways",
          backendDetails: [
            "Grounding against official mark scheme transmission pathways.",
            "Identifying required equilibrium shifts and market adjustments.",
          ],
        },
        {
          label: `Tracing Causal Chains: Cause -> Mechanism -> Effect -> Link (Target: /${meta.practiceMax})`,
          weight: 4,
          shortTitle: "Causal Progression",
          backendDetails: [
            "Scrutinizing step-by-step causal logic without assertions or jumps.",
            `Verifying all required analysis points are fully developed for ${meta.practiceMax} marks.`,
          ],
        },
        {
          label: "Verifying Theoretical Accuracy & Curve Shift Directions",
          weight: 3,
          shortTitle: "Theoretical Accuracy",
          backendDetails: [
            "Checking for common Cambridge traps (supply vs demand shifts, shift directions).",
            "Ensuring diagrammatic equilibrium changes match written argument.",
          ],
        },
        {
          label: "Synthesizing Chain Completeness & Actionable Fixes",
          weight: 3,
          shortTitle: "Report Synthesis",
          backendDetails: [
            "Highlighting complete vs partial vs asserted steps.",
            "Drafting precise sentence-level fixes to earn full analysis marks.",
          ],
        },
      ];
    }

    return [
      {
        label: "Analyzing Question Command Word & Evaluative Criteria",
        weight: 3,
        shortTitle: "Question Fit",
        backendDetails: [
          "Checking prompt command words ('best', 'to what extent', 'assess').",
          "Verifying whether comparative criteria against alternatives are required.",
        ],
      },
      {
        label: "Auditing Evaluative Balance, Trade-offs & Contextual Conditions",
        weight: 4,
        shortTitle: "Evaluative Depth",
        backendDetails: [
          "Testing limitation depth, opportunity costs, and stakeholder trade-offs.",
          "Checking stated conditions: elasticity, time lags, scale of intervention.",
        ],
      },
      {
        label: `Moderating Table B Standards with Examiner Slack (Target: /${meta.practiceMax})`,
        weight: 3,
        shortTitle: "Table B Moderation",
        backendDetails: [
          "Applying positive marking slack (1-3%) to reward reasoned student conclusions.",
          "Checking justified ranking to avoid uncontextualized hedge caps.",
        ],
      },
      {
        label: "Generating High-Scoring Exemplar Model Answer",
        weight: 3,
        shortTitle: "Exemplar Synthesis",
        backendDetails: [
          "Synthesizing an examiner-level model judgement incorporating student ideas.",
          "Finalizing line-by-line annotations and unlockable exemplar.",
        ],
      },
    ];
  }, [selectedAo, meta.practiceMax]);

  const currentAoEstimatedMs = selectedAo === "ao1" ? 4_000 : selectedAo === "ao2" ? 12_000 : 14_000;

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
          tariff,
        },
      });
      return cleanStars(res);
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
          toast.info(`Marked: ${data.mark}/${data.maxMark} (${stripStars(data.tableLevelLabel)})`);
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <PageHeader
        title="AO Fixer"
        description="Target one assessment objective at a time across 8, 12, or 20-mark essay prompts. Write short attempts, get strictly marked by a Cambridge examiner, and rewrite weak links until you achieve full marks."
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
              variant="secondary"
              className="gap-1 cursor-pointer"
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Tariff: {tariff} Marks
            </Badge>
            <Badge
              variant={selectedQuestion ? "secondary" : "outline"}
              className="gap-1 cursor-pointer"
              onClick={() => {}}
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              Question: {selectedQuestion ? "Selected" : "Pick or type"}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1"
            >
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                4
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

          {/* 2. TARIFF SELECTION (8m, 12m, 20m) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  Select Question Tariff ({tariff} Marks)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose your target essay length: 8-mark focused essay, 12-mark standard AS evaluative essay, or 20-mark A-Level extended essay.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Split: AO1 {aoMeta.ao1.practiceMax}m · AO2 {aoMeta.ao2.practiceMax}m · AO3 {aoMeta.ao3.practiceMax}m
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  m: 8 as const,
                  title: "8-Mark Essay",
                  sub: "Focused Essay Drill",
                  ao: "AO1: 2m · AO2: 4m (2 chains) · AO3: 2m (1 eval + verdict)",
                },
                {
                  m: 12 as const,
                  title: "12-Mark Essay",
                  sub: "Standard AS Evaluative",
                  ao: "AO1: 2m · AO2: 6m (3 chains) · AO3: 4m (balanced eval + judgement)",
                },
                {
                  m: 20 as const,
                  title: "20-Mark Essay",
                  sub: "Paper 4 A-Level Extended",
                  ao: "AO1: 2m · AO2: 12m (multi-chain) · AO3: 6m (in-depth trade-offs)",
                },
              ].map((t) => {
                const isSelected = tariff === t.m;
                return (
                  <button
                    key={t.m}
                    type="button"
                    onClick={() => setTariff(t.m)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all space-y-1.5",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm"
                        : "border-border hover:border-border/80 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
                        {t.title}
                      </span>
                      {isSelected ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">{t.m}m</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t.sub}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/80">{t.ao}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. QUESTION SECTION */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </span>
                Choose or Type a {tariff}-Mark Essay Question
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
                          onClick={() => {
                            setSelectedQuestion(q.question_text);
                            if (q.max_mark === 8 || q.max_mark === 12 || q.max_mark === 20) {
                              setTariff(q.max_mark as 8 | 12 | 20);
                            }
                          }}
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
                              {q.max_mark || tariff} marks
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
                      placeholder={`Paste or type any ${tariff}-mark essay question (e.g. 'Discuss whether an indirect tax is the most effective policy to reduce consumption of demerit goods.')`}
                      rows={4}
                      value={typedQuestion}
                      onChange={(e) => setTypedQuestion(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">
                        Accepts any standard Cambridge {tariff}-mark essay question.
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

          {/* 4. OBJECTIVE SECTION */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  4
                </span>
                Choose ONE Objective to Master (for {tariff}-Mark Question)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Work through focused attempts until that objective reaches full marks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(["ao1", "ao2", "ao3"] as AoType[]).map((aoKey) => {
                const aoInfo = aoMeta[aoKey];
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
                    Question Analysis ({tariff} Marks)
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {stripStars(analysis?.guidanceLine || "This question needs: a balanced, evaluated argument.")}
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
                    <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                      Just two simple definitions appropriate to the question, related examples, formulas, or any real show of economic knowledge:
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
                              <span className="font-semibold text-foreground">{stripStars(t.term)}</span>
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
                                {stripStars(t.definition)}
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
                          <p>{stripStars(analysis.fullMarkRequirements.ao1.commonTraps[0])}</p>
                        </div>
                      )}
                  </div>
                )}

                {/* AO2 Requirements */}
                {selectedAo === "ao2" && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                      {stripStars(analysis?.fullMarkRequirements.ao2.instruction || meta.promptLine)}
                    </p>
                    <div className="space-y-2">
                      {analysis?.fullMarkRequirements.ao2.chains.map((chain, idx) => {
                        const evalChain = currentOutcome?.chainsEvaluated?.[idx];
                        const status = evalChain?.status ?? "not_started";
                        return (
                          <div
                            key={chain.id || idx}
                            className="border border-border rounded-lg p-2.5 bg-background space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                Chain {idx + 1}: {stripStars(chain.mechanismFocus)}
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
                              {stripStars(chain.stepChain)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {analysis?.fullMarkRequirements.ao2.diagramTip && (
                      <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-2.5 text-[11px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-primary block">
                          Diagram Tip: {stripStars(analysis.fullMarkRequirements.ao2.diagramTip.name)}
                        </span>
                        <p>{stripStars(analysis.fullMarkRequirements.ao2.diagramTip.explanation)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AO3 Requirements */}
                {selectedAo === "ao3" && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                      {stripStars(analysis?.fullMarkRequirements.ao3.instruction || meta.promptLine)}
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
                              <span className="font-semibold text-foreground">{stripStars(st.title)}</span>
                              {isChecked ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                                  <Check className="size-2.5" /> Met
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Pending</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {stripStars(st.instruction)}
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
                          <span>{stripStars(cap.label)}</span>
                          <span className="text-rose-400 font-mono">
                            Max {Math.min(meta.practiceMax, cap.maxMark)}/{meta.practiceMax}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-tight text-[10px]">
                          {stripStars(cap.triggerDescription)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-1.5 text-[11px] text-muted-foreground">
                      <p>• Major theoretical errors cap analytical marks.</p>
                      <p>• Gaps or assertions in causal chains prevent reaching the top band.</p>
                      <p>• Ensure all points connect cause → mechanism → effect → link back to prompt.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Examiner Accuracy Note */}
              <p className="text-[11px] text-muted-foreground/75 leading-relaxed italic">
                Cambridge Examiner Stance: We reward positive knowledge, clear analysis, and balanced evaluation with fair examiner slack.
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
                        {stripStars(currentOutcome.tableLevelLabel)}
                      </Badge>
                    </div>

                    <p className="text-xs font-medium text-foreground/90 leading-relaxed">
                      {stripStars(currentOutcome.reasonLine)}
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
                          const scaledCap = Math.max(1, Math.round((capDef?.maxMark || 2) * (meta.practiceMax / 4)));
                          return (
                            <TooltipProvider key={capId}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs py-1 px-2.5 gap-1.5"
                                  >
                                    <ShieldAlert className="size-3" />
                                    {stripStars(capDef?.label || capId)}: Max {scaledCap}/{meta.practiceMax}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs space-y-1 p-3">
                                  <p className="font-semibold text-foreground">How to remove this cap:</p>
                                  <p className="text-muted-foreground">{stripStars(capDef?.howToFix)}</p>
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
                                      "{stripStars(ann.quote)}"
                                    </strong>
                                    : {stripStars(ann.tooltip)}
                                  </p>
                                  {ann.replacement && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Suggested syllabus phrasing: {stripStars(ann.replacement)}
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
                          "{stripStars(currentOutcome.whatYouDidRightQuote)}"
                        </strong>{" "}
                        — {stripStars(currentOutcome.whatYouDidRightComment)}
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
                                  "{stripStars(fixItem.quote)}"
                                </strong>
                              </p>
                              <p className="font-medium text-foreground">
                                ➔ {stripStars(fixItem.fix)}
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
                            navigator.clipboard.writeText(stripStars(currentOutcome.modelAnswerUnlocked!));
                            toast.success("Model answer copied to clipboard!");
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <Copy className="size-3" /> Copy
                        </Button>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed font-serif italic text-sm">
                        {stripStars(currentOutcome.modelAnswerUnlocked)}
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
                markMutation.isPending ? (
                  <div className="py-12 px-4 space-y-6 flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-200">
                    <div className="space-y-1.5 max-w-md">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                        <Sparkles className="size-3.5" /> Cambridge 9708 Examiner Live Assessment
                      </span>
                      <h3 className="text-base font-semibold text-foreground">
                        Marking {meta.code} ({meta.title}) · Out of {meta.practiceMax} Marks
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Evaluating your response against Cambridge standards with positive examiner slack...
                      </p>
                    </div>

                    <div className="w-full max-w-lg">
                      <GradingProgress
                        active={markMutation.isPending}
                        stages={currentAoStages}
                        totalMs={currentAoEstimatedMs}
                      />
                    </div>
                  </div>
                ) : (
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
                          "{stripStars(attempts[attempts.length - 1].text)}"
                        </p>
                      </div>
                    )}

                    {/* Mode Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {stripStars(meta.promptLine)}
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
                          {stripStars(activeHint)}
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
                )
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
                {stripStars(currentOutcome.reasonLine) || "Resolved all missing analytical links and evaluative caps."}
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
                setSecondsRemaining(meta.timerSeconds);
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
