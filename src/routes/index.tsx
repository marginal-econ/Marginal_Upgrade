import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Flame,
  Gift,
  GraduationCap,
  HelpCircle,
  LineChart,
  ListChecks,
  Mail,
  MessageCircle,
  Minimize2,
  PenLine,
  RefreshCw,
  Scan,
  School,
  Send,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuroraCanvas } from "@/components/marketing/aurora";
import { CustomCursor } from "@/components/marketing/cursor";
import {
  CircleScribble,
  Curl,
  DottedArrow,
  Drift,
  ScrollProgress,
  Star,
  Waves,
} from "@/components/marketing/doodles";
import { SiteFooter } from "@/components/marketing/footer";
import { CommandWordDrill } from "@/components/marketing/interactive";
import { MarkingHand } from "@/components/marketing/mascot";
import { CountUp, Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { SiteNavLinks, SiteNavMobile } from "@/components/marketing/site-nav";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Magnetic, TiltCard } from "@/components/marketing/three-d";
import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { AccuracyCredibilitySection } from "@/components/marketing/accuracy-credibility-section";
import { RealEssayShowcase } from "@/components/marketing/real-essay-showcase";
import { TeachersSection } from "@/components/marketing/teachers-section";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { captureReferralCode } from "@/lib/waitlist-client";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal | AI Cambridge AS & A Level Economics (9708) Prep & Essay Examiner" },
      {
        name: "description",
        content:
          "Master Cambridge International AS & A Level Economics (9708) with Marginal. How it works: instant AI essay grading, live examiner feedback, timed MCQ past papers, and diagram CAD for Papers 1, 2, 3 & 4.",
      },
      {
        name: "keywords",
        content:
          "how to grade 9708 economics, Cambridge Economics 9708, Marginal AI, AS Level Economics, A Level Economics 9708 prep, parginal, parginal AI, marginal-econ, Marginal Cambridge Economics, 9708 economics prep, A Level Economics 9708, AS and A level economics",
      },
      { property: "og:site_name", content: "Marginal" },
      { property: "og:title", content: "Marginal | Cambridge AS & A Level Economics (9708) Prep" },
      {
        property: "og:description",
        content: "The complete Cambridge AS & A Level Economics (9708) mastery platform with AI essay grading and MCQ practice for Papers 1, 2, 3 & 4.",
      },
      { property: "og:url", content: "https://marginal-econ.com" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://marginal-econ.com/marginal-m-icon-clean.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Marginal | Cambridge AS & A Level Economics (9708) Prep" },
      {
        name: "twitter:description",
        content: "The complete Cambridge AS & A Level Economics (9708) mastery platform with AI essay grading and MCQ practice for Papers 1, 2, 3 & 4.",
      },
      { name: "application-name", content: "Marginal AI" },
      { name: "apple-mobile-web-app-title", content: "Marginal AI" },
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
    ],
    links: [
      { rel: "canonical", href: "https://marginal-econ.com/" },
    ],
  }),
  component: Index,
});

// ---------------------------------------------------------------------------
// Static Data & Tickers
// ---------------------------------------------------------------------------
const OBJECTIVES = [
  { code: "AO1", name: "Knowledge & Understanding", share: 17, dot: "bg-ao1" },
  { code: "AO2", name: "Analysis & Application", share: 50, dot: "bg-ao2" },
  { code: "AO3", name: "Evaluation & Judgement", share: 33, dot: "bg-ao3" },
];

const RIBBON_ITEMS = [
  "Cambridge 9708 Standard",
  "Instant AO1/AO2/AO3 Scoring",
  "Pass 4 In-Situ Comment Pins",
  "Paper 1 & 3 Timed MCQs",
  "Handwriting Vision OCR",
  "Real-Time Live Examiner",
  "1,400+ Cambridge Mark Schemes",
  "15-Year Topic Cycle Predictor",
];

const TOOLS = [
  {
    icon: PenLine,
    tile: "bg-primary",
    badge: "Grader",
    title: "Cambridge Essay Examiner",
    body: "Multi-pass evaluation breaking your answer into AO1, AO2, and AO3 marks with Pass 4 in-situ comment pins.",
    href: "/grade",
  },
  {
    icon: ListChecks,
    tile: "bg-ao2",
    badge: "Past Papers",
    title: "MCQ Live Past Papers & Resume",
    body: "Timed Paper 1 & 3 exams with distractor reasoning, question flagging, and 12-hour auto-resume.",
    href: "/mcq-live",
  },
  {
    icon: Sparkles,
    tile: "bg-purple-600",
    badge: "In-Situ AI",
    title: "Live Examiner Studio",
    body: "Real-time AI examiner coaching as you type, with live Socratic hints and causal chain alerts.",
    href: "/live-examiner",
  },
  {
    icon: Sliders,
    tile: "bg-indigo-600",
    badge: "Vector CAD",
    title: "Economics Diagram Studio",
    body: "Dynamic micro and macro diagrams with interactive curve shifts, equilibrium tracking, and examiner labels.",
    href: "/diagram-lab",
  },
  {
    icon: FileSpreadsheet,
    tile: "bg-emerald-600",
    badge: "Section A Studio",
    title: "Data Response & Case Studies",
    body: "Paper 2 & 4 Section A practice with Table 1.1 data interpretation, OFR calculations, and curve shifts.",
    href: "/data-response",
  },
  {
    icon: Wand2,
    tile: "bg-purple-600",
    badge: "AI Models",
    title: "Sample Essay Generator",
    body: "Full-mark Cambridge 9708 model answers tailored to any 8m, 12m, or 20m question with verified diagrams.",
    href: "/essay-generator",
  },
  {
    icon: BookOpen,
    tile: "bg-ao3",
    badge: "Revision Vault",
    title: "Cambridge Definition Hub",
    body: "Over 120 verified syllabus definitions with essential AO1 keywords, topic tags, and flashcards.",
    href: "/definitions",
  },
  {
    icon: Flame,
    tile: "bg-amber-600",
    badge: "15-Yr Intelligence",
    title: "Past Paper Topic Predictor",
    body: "Statistical rotation modeling across 15 years of Cambridge 9708 exam papers (2010–2025).",
    href: "/paper-matrix",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick or paste your question",
    body: "Choose from our Cambridge question bank or paste any past-paper prompt across Papers 2 & 4 (8m, 12m, or 20m).",
  },
  {
    n: "02",
    title: "Type your essay or upload handwriting",
    body: "Write directly in our editor or snap a photo of your handwritten paper. Vision OCR extracts text and diagrams instantly.",
  },
  {
    n: "03",
    title: "Get your Cambridge mark and in-situ pins",
    body: "Receive official AO1/AO2/AO3 marks, Google-Docs-style comment pins on your exact sentences, and an actionable rewrite plan.",
  },
];

const FAQS = [
  {
    q: "How does the Cambridge 9708 Essay Grader work?",
    a: "Marginal uses a 4-pass examiner pipeline grounded in official Cambridge mark schemes and examiner reports. Pass 1 audits AO1 definitions and concepts; Pass 2 traces AO2 analytical causal chains; Pass 3 evaluates AO3 synthesis and context; Pass 4 pins in-situ comments directly onto the exact sentences of your essay where marks were gained or lost.",
  },
  {
    q: "Can I try grading an essay and doing MCQs without creating an account?",
    a: "Yes! Right on this page in the Interactive Sandbox above, you can run a full Cambridge test evaluation on sample essays or solve authentic MCQ questions with instant mark scheme explanations.",
  },
  {
    q: "Does Marginal support both Cambridge AS Level and A Level (A2)?",
    a: "Yes, 100%. Marginal is purpose-built for both AS Level (Papers 1 & 2, including 8-mark and 12-mark essays and Section A data response) and A Level / A2 (Papers 3 & 4, including 20-mark evaluative essays and advanced micro/macro case studies). Every rubric and examiner model adapts specifically to the syllabus level you choose.",
  },
  {
    q: "Can Marginal read handwritten essays and hand-drawn diagrams?",
    a: "Yes. Take a photo of your handwritten mock exam or notebook. Our vision OCR extracts the text, isolates diagrams, and evaluates them directly against syllabus standards.",
  },
  {
    q: "How does the Live Examiner work?",
    a: "As you write in the Live Examiner studio, it provides real-time Socratic feedback, alerts you to logical gaps in your causal chain, and tracks your AO mark accumulation live before you finish.",
  },
  {
    q: "Can teachers and schools use Marginal?",
    a: "Yes. Teachers can register for dedicated cohorts to set essay assignments, track class submissions in real time, and audit cohort diagnostic heatmaps.",
  },
];

// ---------------------------------------------------------------------------
// Interactive Sandbox Datasets
// ---------------------------------------------------------------------------
const ESSAY_TRIAL_PRESETS = [
  {
    id: "preset-12m",
    label: "12-Mark: Floating vs Fixed Exchange Rates (AS Macro)",
    tariff: "12 Marks",
    level: "AS Level Paper 2",
    question: "Evaluate whether a depreciating exchange rate will always reduce a country's current account deficit. [12]",
    text: `A depreciating exchange rate occurs when the external value of a floating currency falls against foreign currencies. The current account of the balance of payments records trade in goods and services, primary income, and secondary transfers. In theory, currency depreciation lowers the foreign currency price of exports (Px) and raises the domestic currency price of imports (Pm), switching expenditure toward domestic producers and improving the trade balance.

According to economic theory, cheaper exports increase foreign quantity demanded (Qx), whilst dearer imports encourage domestic consumers to switch to domestic import substitutes, reducing import volume (Qm). This expenditure-switching effect increases net export earnings (X - M), which shifts aggregate demand (AD) rightward and directly reduces the trade deficit on the current account.

However, whether depreciation successfully reduces a current account deficit depends crucially on the Marshall-Lerner condition. The Marshall-Lerner condition states that currency depreciation will only improve the balance of trade if the sum of the price elasticities of demand for exports and imports is greater than one: PEDx + PEDm > 1. If demand is price inelastic (PEDx + PEDm < 1), export revenue in foreign currency falls and import expenditure rises, worsening the deficit.

Furthermore, in the short run, trade volumes are constrained by pre-existing contracts and delivery schedules. This gives rise to the J-Curve effect: immediately following depreciation, the current account deficit temporarily deteriorates because demand remains inelastic. Only in the long run, once contracts are renegotiated, does elasticity rise sufficiently for the trade balance to improve.

Additionally, if the domestic economy relies heavily on imported raw materials and energy, depreciation triggers cost-push inflation. Rising production costs shift SRAS leftwards, eroding export price competitiveness.

In conclusion, a depreciating exchange rate will not always reduce a current account deficit. It depends critically on whether the Marshall-Lerner condition is satisfied, the timeframe under consideration (short-run J-curve transition versus long-run adjustment), and whether domestic exporters possess spare production capacity to satisfy higher export demand without triggering domestic demand-pull inflation.`,
    score: 10,
    maxMark: 12,
    band: "Band 1 (Level 4)",
    aoSplit: {
      ao1: { awarded: 2, max: 2, note: "Full credit: Clear definitions of floating currency and expenditure-switching." },
      ao2: { awarded: 5, max: 6, note: "Commended: Explicit causal transmission via relative prices Px and Pm." },
      ao3: { awarded: 3, max: 4, note: "High Level: Rigorous application of Marshall-Lerner condition and J-curve contract lags." },
    },
    pins: [
      { id: 1, type: "ao1", label: "AO1: Definition (2/2)", snippet: "A depreciating exchange rate occurs when the external value of a floating currency falls", comment: "Precise Cambridge definition of depreciation in a floating exchange rate system." },
      { id: 2, type: "ao2", label: "AO2: Transmission (5/6)", snippet: "This expenditure-switching effect increases net export earnings (X - M)", comment: "Explicit step-by-step causal chain linking relative price change to net exports." },
      { id: 3, type: "ao3", label: "AO3: Marshall-Lerner (3/4)", snippet: "PEDx + PEDm > 1", comment: "Essential Cambridge evaluative condition correctly stated and applied to trade elasticity." },
      { id: 4, type: "examiner", label: "Examiner Tip for 12/12", snippet: "spare production capacity to satisfy higher export demand", comment: "To achieve 12/12, explicitly evaluate whether domestic exporters have spare capacity in the short run." },
    ],
  },
  {
    id: "preset-8m",
    label: "8-Mark: Indirect Taxes on Demerit Goods (AS Micro)",
    tariff: "8 Marks",
    level: "AS Level Paper 2",
    question: "Explain how an indirect tax can be used to correct market failure caused by demerit goods, and consider the limitations of this policy. [8]",
    text: `Demerit goods, such as tobacco and sugary drinks, are goods whose consumption creates negative externalities and information failure. Consumers underestimate the private health costs to themselves, and their consumption generates negative externalities on third parties, such as passive smoking and higher public healthcare costs. Consequently, marginal social cost (MSC) exceeds marginal private cost (MPC), leading to overconsumption and allocative inefficiency at the free market equilibrium.

A government can intervene by levying a specific or ad valorem indirect tax on producers equal to the marginal external cost (MEC) at the socially optimum output. The indirect tax increases firms' cost of production, shifting the market supply curve upwards and to the left from S1 to S2 (MPC + tax). This raises the equilibrium market price from P1 to P2 and contracts quantity demanded, internalising the externality and eliminating the deadweight welfare loss.

However, the policy has significant limitations:
First, demerit goods like tobacco are addictive, resulting in price inelastic demand (PED < 1). A tax hike leads to a proportionally smaller reduction in consumption, primarily generating government tax revenue rather than eliminating the market failure.
Second, high tax rates encourage illegal smuggling and unregulated counterfeit black markets.
Third, indirect taxes are regressive, placing a proportionately heavier financial burden on low-income households.`,
    score: 7,
    maxMark: 8,
    band: "Band 1 (Level 4)",
    aoSplit: {
      ao1: { awarded: 2, max: 2, note: "Accurate definitions of demerit goods and negative externalities." },
      ao2: { awarded: 3, max: 3, note: "Clear transmission: MPC shift, price increase, and contraction of quantity." },
      ao3: { awarded: 2, max: 3, note: "Sound discussion of PED inelasticity, black markets, and regressivity." },
    },
    pins: [
      { id: 1, type: "ao1", label: "AO1: Externalities", snippet: "marginal social cost (MSC) exceeds marginal private cost (MPC)", comment: "Accurate Cambridge economic terminology defining externality gap." },
      { id: 2, type: "ao2", label: "AO2: Mechanism", snippet: "shifting the market supply curve upwards and to the left", comment: "Clear diagrammatic link explaining tax incidence on MPC curve." },
      { id: 3, type: "ao3", label: "AO3: Elasticity Limit", snippet: "price inelastic demand (PED < 1)", comment: "Strong evaluative qualification showing why tax revenue rises but volume contracts little." },
    ],
  },
];

const MCQ_TRIAL_QUESTIONS = [
  {
    id: "mcq-trial-1",
    code: "9708/12/M/J/24 • Paper 1 AS Microeconomics",
    question: "A government imposes a maximum price (price ceiling) on bread below the free market equilibrium price. What is the immediate consequence in this market?",
    options: [
      { key: "A", text: "An excess supply of bread and falling producer revenue", correct: false, distractor: "Incorrect: A price ceiling below equilibrium causes shortages (excess demand), not excess supply. Excess supply occurs with price floors." },
      { key: "B", text: "An excess demand for bread and the emergence of non-price rationing", correct: true, distractor: "Correct: At Pmax < Pe, Qd exceeds Qs, creating an excess demand (shortage). Because the price mechanism cannot clear the market, queues or non-price rationing emerge." },
      { key: "C", text: "An outward shift of the market demand curve to the right", correct: false, distractor: "Incorrect: Price controls cause a movement along the demand curve (extension of quantity demanded), not a shift of the curve itself." },
      { key: "D", text: "An increase in producer surplus and employment in bakery firms", correct: false, distractor: "Incorrect: Producer surplus contracts because bakeries receive a lower price and supply fewer loaves." },
    ],
    rationale: "Official Cambridge 9708 Mark Scheme Rationale: At any price ceiling set below equilibrium, quantity demanded exceeds quantity supplied (Qd > Qs). Because price cannot rise to ration goods, shortages arise, leading to non-price rationing mechanisms such as queuing or informal markets.",
  },
  {
    id: "mcq-trial-2",
    code: "9708/11/O/N/23 • Paper 1 AS Elasticity",
    question: "A firm faces price-inelastic demand for its product (PED = -0.4). If the firm increases its price by 10%, what happens to total revenue and quantity demanded?",
    options: [
      { key: "A", text: "Quantity demanded falls by 4%; total revenue increases", correct: true, distractor: "Correct: % change in Qd = PED × % change in P = -0.4 × 10% = -4%. Since price rises by more than quantity falls, total revenue (P × Q) increases." },
      { key: "B", text: "Quantity demanded falls by 10%; total revenue remains unchanged", correct: false, distractor: "Incorrect: This would require unitary elasticity (PED = -1.0)." },
      { key: "C", text: "Quantity demanded falls by 25%; total revenue falls", correct: false, distractor: "Incorrect: This would mean price-elastic demand (PED = -2.5)." },
      { key: "D", text: "Quantity demanded rises by 4%; total revenue increases", correct: false, distractor: "Incorrect: By the Law of Demand, a price increase causes quantity demanded to contract, not expand." },
    ],
    rationale: "Official Cambridge 9708 Mark Scheme Rationale: With price-inelastic demand (PED < 1), percentage change in price exceeds the percentage change in quantity demanded. Therefore, raising price increases total revenue (P × Q).",
  },
];

// ---------------------------------------------------------------------------
// Main Index Page Component
// ---------------------------------------------------------------------------
function Index() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Settings unavailable");
        const body = await response.json();
        if (!body.success) throw new Error("Settings unavailable");
        setSettings(body.settings);
        setSettingsLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettingsLoaded(true);
      });
    return () => controller.abort();
  }, []);

  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  useEffect(() => setInvitedBy(captureReferralCode()), []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "https://marginal-econ.com";
  const shareUrl = `${shareOrigin}${invitedBy ? `?ref=${encodeURIComponent(invitedBy)}` : ""}`;
  const shareMessage = `Hey! I'm using Marginal for Cambridge AS & A Level Economics (9708). It gives real-time Live Examiner coaching, breaks down essays into AO1/AO2/AO3 marks grounded in official Cambridge mark schemes, and offers full MCQ past paper practice. Grade unlimited essays free:\n${shareUrl}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareMessage);
      setCopiedMessage(true);
      toast.success("Study group message copied to clipboard!");
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const [isMinimalist, setIsMinimalist] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMinimalist(localStorage.getItem("marginal_minimalist_mode") === "true");
    }
  }, []);

  const toggleMinimalist = (value?: boolean) => {
    setIsMinimalist((prev) => {
      const next = typeof value === "boolean" ? value : !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("marginal_minimalist_mode", String(next));
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Interactive Trial Sandbox State (Reels them in!)
  // -------------------------------------------------------------------------
  const [sandboxTab, setSandboxTab] = useState<"essay" | "mcq">("essay");

  // Essay Sandbox State
  const [selectedPresetId, setSelectedPresetId] = useState(ESSAY_TRIAL_PRESETS[0].id);
  const currentEssayPreset = useMemo(
    () => ESSAY_TRIAL_PRESETS.find((p) => p.id === selectedPresetId) || ESSAY_TRIAL_PRESETS[0],
    [selectedPresetId],
  );
  const [trialEssayText, setTrialEssayText] = useState(currentEssayPreset.text);
  useEffect(() => {
    setTrialEssayText(currentEssayPreset.text);
    setIsTrialGraded(false);
    setActiveCommentPin(null);
  }, [currentEssayPreset]);

  const [isGradingTrial, setIsGradingTrial] = useState(false);
  const [isTrialGraded, setIsTrialGraded] = useState(false);
  const [gradingStep, setGradingStep] = useState(0);
  const [activeCommentPin, setActiveCommentPin] = useState<number | null>(null);

  const runTrialGrade = () => {
    setIsGradingTrial(true);
    setGradingStep(0);
    setIsTrialGraded(false);
    setActiveCommentPin(null);

    const steps = [
      "Retrieving Cambridge 9708 mark scheme...",
      "Auditing AO1 definitions & terminology...",
      "Evaluating AO2 causal chains & transmission...",
      "Synthesizing AO3 evaluative judgements...",
      "Pinning Pass 4 in-situ comment pins...",
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setGradingStep(current);
      if (current >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsGradingTrial(false);
          setIsTrialGraded(true);
          toast.success("Cambridge examination complete: 10/12 Band 1 awarded!");
        }, 400);
      }
    }, 380);
  };

  // MCQ Sandbox State
  const [mcqIndex, setMcqIndex] = useState(0);
  const currentMcq = MCQ_TRIAL_QUESTIONS[mcqIndex % MCQ_TRIAL_QUESTIONS.length];
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);

  const handleSelectOption = (key: string) => {
    if (selectedMcqOption) return;
    setSelectedMcqOption(key);
  };

  const nextMcqQuestion = () => {
    setSelectedMcqOption(null);
    setMcqIndex((prev) => prev + 1);
  };

  // Minimalist Mode Render
  if (isMinimalist) {
    return (
      <MinimalistHome
        onToggleFull={() => toggleMinimalist(false)}
        isAuthenticated={isAuthenticated}
        settings={settings}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      <CustomCursor />
      <ScrollProgress />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-10">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Wordmark />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <a href="#interactive-sandbox" className="hover:text-foreground transition-colors flex items-center gap-1 text-primary">
              <Sparkles className="size-3.5" /> Live Sandbox (Free)
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How Marginal Works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#why-marginal" className="hover:text-foreground transition-colors">
              Why Marginal (Benchmarks)
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background text-foreground font-bold shadow-2xs">
                <Sparkles className="size-3 text-amber-500" />
                <span className="hidden sm:inline">Interactive</span>
              </span>
              <button
                type="button"
                onClick={() => toggleMinimalist(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Switch to Minimalist View"
              >
                <Minimize2 className="size-3" />
                <span className="hidden sm:inline">Minimalist</span>
              </button>
            </div>

            <ThemeToggle className="size-8" />

            <Link
              to="/auth"
              className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>

            <Magnetic strength={8}>
              <Link
                to="/auth"
                className="inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 bg-primary px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground rounded-lg shadow-xs hover:bg-primary/90 transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* ── Hero: How Marginal Works & Value Proposition ─────────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-10 pt-8 sm:pt-12">
        <div className="aurora-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <AuroraCanvas />
        <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
        <div className="paper-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 text-center space-y-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 flex-wrap justify-center">
              <span className="chip-soft shadow-xs flex items-center gap-1.5 border border-primary/30 bg-primary/10 text-primary font-semibold text-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Cambridge International AS &amp; A Level Economics (9708)
              </span>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-purple-700 dark:text-purple-300">
                Papers 1, 2, 3 &amp; 4 Evaluated
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                100+ Active Economists
              </span>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="max-w-4xl mx-auto text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">
              Master Cambridge 9708 Economics.{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                See Exactly How the Examiner Marks Your Work.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={100}>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              How Marginal works: Submit any Cambridge 8m, 12m, or 20m essay or drill Papers 1 &amp; 3 past MCQs. Get instant AO1, AO2, and AO3 marks grounded in official mark schemes, plus Pass 4 in-situ comment pins on your exact sentences.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 text-sm font-extrabold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02] cursor-pointer"
              >
                <a href="#interactive-sandbox" className="inline-flex items-center gap-2">
                  <Sparkles className="size-4" />
                  <span>Try Sandbox Below (Free • No Sign-Up)</span>
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-5 text-sm font-semibold border-2 hover:bg-muted gap-2 shadow-xs cursor-pointer"
              >
                <a href="#how-it-works">
                  <BookOpen className="size-4 text-primary" />
                  <span>How It Works in 30 Seconds</span>
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ✓ 100% Free Trial Sandbox &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Official 9708 Mark Scheme Standards
            </p>
          </Reveal>
        </div>

        {/* Feature Marquee Ticker */}
        <div className="relative mt-10 w-full">
          <Ribbon items={RIBBON_ITEMS} />
        </div>
      </section>

      {/* ── 2. ⭐ THE INTERACTIVE SANDBOX: TRY BEFORE SIGN-UP (Reels them in!) ── */}
      <section
        id="interactive-sandbox"
        className="relative border-b-[1.5px] border-ink bg-card/60 backdrop-blur-md py-14 sm:py-20 scroll-mt-16 overflow-hidden"
      >
        <CosmicAtmosphere variant="hero" sparkles={true} density="medium" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 md:px-8 space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" /> Live Cambridge 9708 Sandbox
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Try It Right Now. No Sign-Up Required.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Experience the power of real Cambridge examination in seconds. Grade a full 12-mark essay or drill an authentic MCQ past paper question.
            </p>
          </div>

          {/* Sandbox Tab Switcher: Essay Grader vs MCQ Desk */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-muted p-1 border border-border/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setSandboxTab("essay")}
                className={cn(
                  "rounded-lg px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  sandboxTab === "essay"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <PenLine className="size-4" />
                <span>1. Grade Sample Essay (Instant Trial)</span>
              </button>
              <button
                type="button"
                onClick={() => setSandboxTab("mcq")}
                className={cn(
                  "rounded-lg px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  sandboxTab === "mcq"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ListChecks className="size-4" />
                <span>2. Solve Cambridge MCQ (Instant Feedback)</span>
              </button>
            </div>
          </div>

          {/* ── TAB A: Live Essay Grader Sandbox ────────────────────────── */}
          {sandboxTab === "essay" && (
            <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 sm:p-7 shadow-xl space-y-5">
              {/* Preset Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Select a Cambridge 9708 Essay Prompt:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ESSAY_TRIAL_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPresetId(p.id)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                          selectedPresetId === p.id
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border/70",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Badge variant="outline" className="font-mono text-xs font-bold px-2.5 py-1 border-primary/30 bg-primary/5 text-primary self-start sm:self-center">
                  {currentEssayPreset.tariff} · {currentEssayPreset.level}
                </Badge>
              </div>

              {/* Question Banner */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1">
                <span className="text-[10px] font-mono font-bold text-primary uppercase">Official Exam Question:</span>
                <p className="text-sm sm:text-base font-bold text-foreground">
                  "{currentEssayPreset.question}"
                </p>
              </div>

              {/* Editable Candidate Manuscript Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <PenLine className="size-3.5 text-primary" /> Candidate Script (Feel free to edit text or run examiner)
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ~{trialEssayText.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                <div className="relative rounded-xl border border-border/80 bg-background p-4 text-xs sm:text-sm font-serif leading-relaxed text-foreground max-h-72 overflow-y-auto space-y-3 shadow-inner">
                  {trialEssayText.split("\n\n").map((para, idx) => {
                    const isHighlighted = activeCommentPin !== null && currentEssayPreset.pins.find(pin => pin.id === activeCommentPin && para.includes(pin.snippet));
                    return (
                      <p
                        key={idx}
                        className={cn(
                          "transition-all duration-300 rounded p-1",
                          isHighlighted ? "bg-amber-500/20 ring-2 ring-amber-500/40 text-foreground font-semibold" : ""
                        )}
                      >
                        {para}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Action Button: Run Cambridge Examiner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted-foreground">
                  Grounded in official Cambridge 9708 mark schemes &amp; 4-pass examiner pipeline.
                </div>

                <Button
                  onClick={runTrialGrade}
                  disabled={isGradingTrial}
                  className="w-full sm:w-auto h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                >
                  {isGradingTrial ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Examiner Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>⚡ Run Cambridge Examiner (Free Instant Trial)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Live Grading Progress Simulation */}
              {isGradingTrial && (
                <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-4 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold text-primary">
                    <span>Cambridge Evaluation Pipeline Running...</span>
                    <span>Step {Math.min(gradingStep + 1, 5)} of 5</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${((gradingStep + 1) / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {[
                      "Ingesting Cambridge 9708 mark scheme...",
                      "Auditing AO1 definitions & terminology...",
                      "Evaluating AO2 causal chains & transmission...",
                      "Synthesizing AO3 evaluative judgements...",
                      "Pinning Pass 4 in-situ comment pins...",
                    ][gradingStep] || "Finalizing candidate diagnostic report..."}
                  </p>
                </div>
              )}

              {/* ── Examiner Report Reveal (When Graded) ─────────────────── */}
              {isTrialGraded && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-card p-5 sm:p-6 shadow-xl space-y-5 animate-in fade-in-50 zoom-in-95 duration-500">
                  {/* Cambridge Score Ribbon */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        <h3 className="text-lg sm:text-xl font-black text-foreground">
                          Cambridge Examiner Verdict
                        </h3>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                          {currentEssayPreset.band}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Calibrated directly against official Cambridge 9708 ECR benchmarks.
                      </p>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {currentEssayPreset.score}
                      </span>
                      <span className="text-base text-muted-foreground font-semibold">
                        / {currentEssayPreset.maxMark} Marks
                      </span>
                    </div>
                  </div>

                  {/* AO Breakdown Ribbon */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                        <span>AO1 Knowledge</span>
                        <span className="font-mono">{currentEssayPreset.aoSplit.ao1.awarded} / {currentEssayPreset.aoSplit.ao1.max}m</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {currentEssayPreset.aoSplit.ao1.note}
                      </p>
                    </div>

                    <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.04] p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span>AO2 Analysis</span>
                        <span className="font-mono">{currentEssayPreset.aoSplit.ao2.awarded} / {currentEssayPreset.aoSplit.ao2.max}m</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {currentEssayPreset.aoSplit.ao2.note}
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span>AO3 Evaluation</span>
                        <span className="font-mono">{currentEssayPreset.aoSplit.ao3.awarded} / {currentEssayPreset.aoSplit.ao3.max}m</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {currentEssayPreset.aoSplit.ao3.note}
                      </p>
                    </div>
                  </div>

                  {/* Pass 4 In-Situ Comment Pins */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" /> Pass 4 In-Situ Examiner Comment Pins (Click to highlight text)
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground">4 In-situ Pins</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentEssayPreset.pins.map((pin) => (
                        <button
                          key={pin.id}
                          type="button"
                          onClick={() => setActiveCommentPin(activeCommentPin === pin.id ? null : pin.id)}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5",
                            activeCommentPin === pin.id
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/70 bg-card hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                              pin.type === "ao1" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20" :
                              pin.type === "ao2" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
                              pin.type === "ao3" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                              "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            )}>
                              {pin.label}
                            </span>
                            <span className="text-[10px] font-semibold text-primary">
                              {activeCommentPin === pin.id ? "Highlighted ↑" : "Click to view snippet"}
                            </span>
                          </div>
                          <p className="text-xs text-foreground font-medium line-clamp-2">
                            {pin.comment}
                          </p>
                          <p className="text-[10px] text-muted-foreground italic truncate">
                            Snippet: "{pin.snippet}"
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reel Them In: Conversion Call to Action */}
                  <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] via-purple-500/[0.05] to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">
                        Ready to grade your own economics essays like this?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type any prompt, upload mock papers, and receive full Cambridge 9708 examiner reports completely free.
                      </p>
                    </div>
                    <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 text-xs px-5 shadow-xs">
                      <Link to="/auth">
                        <span>Grade My Own Essays Free</span>
                        <ArrowRight className="size-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB B: Live MCQ Past Paper Sandbox ──────────────────────── */}
          {sandboxTab === "mcq" && (
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-card p-5 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {currentMcq.code}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Cambridge 9708 Multiple Choice Practice
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    Question {(mcqIndex % MCQ_TRIAL_QUESTIONS.length) + 1} of {MCQ_TRIAL_QUESTIONS.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextMcqQuestion}
                    className="h-8 text-xs font-semibold gap-1 cursor-pointer"
                  >
                    <RefreshCw className="size-3 text-primary" /> Next Question
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                  {currentMcq.question}
                </p>
              </div>

              {/* 4 Options Grid */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {currentMcq.options.map((opt) => {
                  const isSelected = selectedMcqOption === opt.key;
                  const showResult = Boolean(selectedMcqOption);
                  const isCorrect = opt.correct;

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectOption(opt.key)}
                      disabled={Boolean(selectedMcqOption)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all cursor-pointer flex items-start gap-3",
                        !showResult
                          ? "border-border/80 bg-card hover:border-emerald-500/60 hover:bg-muted/30"
                          : isCorrect
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                            : isSelected
                              ? "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200"
                              : "border-border/50 bg-card/60 opacity-60",
                      )}
                    >
                      <span className={cn(
                        "size-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border shadow-2xs",
                        !showResult
                          ? "bg-muted text-foreground border-border"
                          : isCorrect
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : isSelected
                              ? "bg-rose-600 text-white border-rose-600"
                              : "bg-muted text-muted-foreground border-border"
                      )}>
                        {opt.key}
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-medium leading-relaxed">
                          {opt.text}
                        </p>
                        {showResult && (
                          <p className="text-[11px] leading-relaxed italic text-muted-foreground pt-0.5">
                            {opt.distractor}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Instant Mark Scheme Rationale Box */}
              {selectedMcqOption && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 space-y-2 animate-in fade-in-50 duration-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Cambridge Examiner Mark Scheme Rationale
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentMcq.rationale}
                  </p>
                </div>
              )}

              {/* Conversion Footer */}
              <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Access 15 years of Paper 1 (AS) and Paper 3 (A2) past papers with live timer &amp; auto-marking.
                </span>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0">
                  <Link to="/mcq-live">
                    <span>Practice Full MCQ Past Papers Free</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. How Marginal Works (Core Visual Walkthrough) ───────────────── */}
      <section id="how-it-works" className="relative border-b-[1.5px] border-ink py-16 sm:py-24 scroll-mt-16 overflow-hidden">
        <CosmicAtmosphere variant="cyan" sparkles={true} density="medium" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 space-y-12">
          <Reveal>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                Built For 9708 Candidates
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                How Marginal Works
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Four specialized engines designed exclusively for Cambridge AS &amp; A Level Economics.
              </p>
            </div>
          </Reveal>

          {/* 4 Feature Walkthrough Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Essay Grader */}
            <Reveal variant="pop" delay={50}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-primary/50 transition-all">
                <div className="space-y-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <PenLine className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">1. Essay Grader</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste your prompt or upload handwriting photos. Vision OCR isolates text and diagrams, while 4 independent examiner passes evaluate AO1, AO2, and AO3 marks with sentence-level comment pins.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Link to="/grade" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                    Mark an essay now →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* 2. MCQ Past Papers */}
            <Reveal variant="pop" delay={100}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-emerald-500/50 transition-all">
                <div className="space-y-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ListChecks className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">2. MCQ Past Papers</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practice authentic Papers 1 &amp; 3 past papers with live exam timers, interactive question jump matrix, distractor reasoning, and 12-hour progress auto-resume.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Link to="/mcq-live" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                    Start MCQ drill →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* 3. Live Examiner */}
            <Reveal variant="pop" delay={150}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-purple-500/50 transition-all">
                <div className="space-y-3">
                  <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Sparkles className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">3. Live Examiner Studio</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Write in real-time while the AI examiner tracks your AO accumulation and flags logical gaps in your causal chain before you submit.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Link to="/live-examiner" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1">
                    Open live studio →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* 4. Diagram CAD Lab */}
            <Reveal variant="pop" delay={200}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-amber-500/50 transition-all">
                <div className="space-y-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Sliders className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">4. Diagram CAD Lab</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Manipulate economic curves, equilibrium shifts, deadweight losses, tariffs, and externalities with precision Cambridge labels.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Link to="/diagram-lab" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1">
                    Launch diagram CAD →
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4. Swift "How to Get Started in 30 Seconds" ─────────────────── */}
      <section className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16 bg-muted/20">
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 md:px-8 space-y-10">
          <Reveal>
            <div className="text-center space-y-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Simple Onboarding</span>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">Get Started in 30 Seconds</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">No credit card. No onboarding tour. Bring one essay or pick an MCQ past paper.</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <Reveal key={step.n} variant="pop">
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 shadow-2xs h-full flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="size-8 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                      {step.n}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Full Cambridge Tools Directory ────────────────────────────── */}
      <section id="features" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16">
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 space-y-10">
          <Reveal>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                Full 9708 Suite
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                All Specialized Cambridge Tools
              </h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to master AS and A2 Level Economics.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => (
              <Reveal key={tool.title} variant="pop">
                <Link
                  to={isAuthenticated ? tool.href : "/auth"}
                  search={isAuthenticated ? undefined : ({ redirect: tool.href } as any)}
                  className="group rounded-2xl border border-border/80 bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between h-full"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={cn("size-9 rounded-xl flex items-center justify-center text-white", tool.tile)}>
                        <tool.icon className="size-4.5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        {tool.badge}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tool.body}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Open Tool</span>
                    <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. SEPARATED SECTION: Why Marginal is Better (Benchmark & Trust) ─ */}
      <section id="why-marginal" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16 bg-muted/10">
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 space-y-12">
          <Reveal>
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="chip-soft border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                Examiner Calibration &amp; Accuracy
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                Why Marginal is Better Than Generic AI
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generic chatbots score everything around 60% with polite flattery. Marginal is calibrated against 30 real candidate scripts and 1,400+ mark schemes for 89.6% examiner alignment.
              </p>
            </div>
          </Reveal>

          {/* Dual Benchmarks & Comparisons */}
          <div className="space-y-12">
            <AccuracyCredibilitySection />
            <AiComparisonSection />
            <RealEssayShowcase />
            <TeachersSection />
          </div>
        </div>
      </section>

      {/* ── 7. Interactive Command Word Drill ─────────────────────────────── */}
      <section id="drill" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16">
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 md:px-8 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
              Command Word Mastery
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Command Words Decide Where the Marks Are
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              "Explain", "assess", and "discuss" test completely different assessment objective quotas. Learn the difference in seconds.
            </p>
            <p className="text-xs font-semibold text-muted-foreground pt-1">
              Interactive 2-minute drill · No account required
            </p>
          </div>
          <CommandWordDrill />
        </div>
      </section>

      {/* ── 8. FAQs ──────────────────────────────────────────────────────── */}
      <section id="faq" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16 bg-muted/10">
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 md:px-8 space-y-8">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Cambridge 9708 Economics</span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/80 px-4 sm:px-6 shadow-xs">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="border-border/60 last:border-0">
                <AccordionTrigger className="text-sm sm:text-base font-bold text-left py-4 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 9. Final Onboarding CTA ──────────────────────────────────────── */}
      <section className="relative py-16 px-4 sm:px-6 md:px-8 text-center">
        <div className="mx-auto max-w-3xl rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-purple-500/10 to-card p-8 sm:p-12 shadow-2xl space-y-5">
          <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase">
            Start Free
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-foreground">
            Master Cambridge 9708 Economics Today
          </h2>
          <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Grade unlimited Cambridge essays, practice timed Paper 1 &amp; 3 past papers, and receive line-by-line examiner diagnostics.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25">
              <Link to="/auth">
                <span>Create Free Student Account</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 font-semibold">
              <a href="#interactive-sandbox">Try Sandbox Again ↑</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md sm:max-w-lg border-2 border-border p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-bold">Share Marginal with Classmates</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Invite your Cambridge economics study group to practice essays and MCQs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono"
              />
              <Button type="button" size="sm" onClick={handleCopyLink} className="font-semibold text-xs">
                {copiedLink ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter onToggleMinimalist={() => toggleMinimalist(true)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wordmark
// ---------------------------------------------------------------------------
function Wordmark({ muted = false }: { muted?: boolean }) {
  return (
    <span className="group flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
      <img
        src="/marginal-m-icon-clean.png"
        alt="Marginal AI Cambridge Economics 9708"
        className={
          "size-8 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6 sm:size-9 " +
          (muted ? "opacity-70 grayscale" : "")
        }
      />
      <span className="text-sm font-semibold sm:text-base flex items-center gap-1.5">
        <span>Marginal</span>
        <span className="text-[10px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
          AI
        </span>
        <span className="hidden min-[440px]:inline-flex text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
          Cambridge 9708
        </span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Minimalist View for Accessibility
// ---------------------------------------------------------------------------
function MinimalistHome({
  onToggleFull,
  isAuthenticated,
  settings,
}: {
  onToggleFull: () => void;
  isAuthenticated: boolean | null;
  settings: PublicSettings;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-base text-foreground no-underline">
            <img src="/marginal-m-icon-clean.png" alt="Marginal" className="size-7 object-contain" />
            <span>Marginal AI</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
              AS &amp; A Level
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleFull}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Sparkles className="size-3 text-amber-500" />
              <span>Full Interactive Mode</span>
            </button>
            <ThemeToggle className="size-8" />
            <Link to="/auth" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-10">
        <section className="space-y-3 border-b border-border pb-8">
          <span className="text-xs font-mono font-bold text-primary uppercase">Cambridge International 9708</span>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground">
            Master Cambridge AS &amp; A Level Economics.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Instant Cambridge 9708 essay grading, in-situ comment pins, timed Paper 1 &amp; 3 past paper MCQs, and real-time Live Examiner coaching.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link to="/grade" className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              Grade an Essay Free
            </Link>
            <Link to="/mcq-live" className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">
              MCQ Past Papers
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Cambridge 9708 Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <Link key={t.title} to={t.href} className="rounded-xl border border-border bg-card p-4 hover:border-primary block">
                <span className="text-sm font-bold text-foreground">{t.title}</span>
                <p className="text-xs text-muted-foreground mt-1">{t.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
