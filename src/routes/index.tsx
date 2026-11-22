import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Flame,
  HelpCircle,
  ListChecks,
  PenLine,
  Scan,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  Wand2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
import { ScrollProgress } from "@/components/marketing/doodles";
import { CommandWordDrill } from "@/components/marketing/interactive";
import { Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Magnetic } from "@/components/marketing/three-d";
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
          "Master Cambridge International AS & A Level Economics (9708) with Marginal. How it works: instant AI essay grading, handwriting OCR, diagram curve tracking, timed MCQ past papers, and line-by-line examiner pins.",
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
// Static Data & Specifications
// ---------------------------------------------------------------------------
const RIBBON_ITEMS = [
  "Cambridge 9708 Official Standards",
  "Instant AO1/AO2/AO3 Scoring",
  "Pass 4 In-Situ Sentence Comment Pins",
  "Paper 1 & 3 Timed MCQs with Rationales",
  "Handwriting Vision OCR for Mock Papers",
  "Hand-Drawn Diagram OCR & Curve Shifts",
  "1,400+ Cambridge Mark Schemes",
  "15-Year Topic Cycle Predictor",
];

const CAMBRIDGE_TOOLS = [
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
    tile: "bg-emerald-600",
    badge: "Past Papers",
    title: "MCQ Live Past Papers & Resume",
    body: "Timed Paper 1 & 3 exams with distractor reasoning, question flagging, and 12-hour auto-resume.",
    href: "/mcq-live",
  },
  {
    icon: Target,
    tile: "bg-indigo-600",
    badge: "Skills Coach",
    title: "AO Skills & Command Word Coach",
    body: "Interactive command word drill to master Cambridge assessment objectives (AO1, AO2, AO3) and evaluation criteria.",
    href: "/practice",
  },
  {
    icon: Flame,
    tile: "bg-amber-600",
    badge: "15-Yr Intelligence",
    title: "Question Bank & Cycle Predictor",
    body: "15 years of Cambridge 9708 past papers, topic rotation predictor, and prompt generator.",
    href: "/question-bank",
  },
  {
    icon: FileSpreadsheet,
    tile: "bg-teal-600",
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
    tile: "bg-sky-600",
    badge: "Revision Vault",
    title: "Cambridge Definition Hub",
    body: "Over 120 verified syllabus definitions with essential AO1 keywords, topic tags, and flashcards.",
    href: "/definitions",
  },
  {
    icon: Target,
    tile: "bg-rose-600",
    badge: "Paper Matrix",
    title: "Past Paper Topic Matrix",
    body: "Statistical rotation modeling across 15 years of Cambridge 9708 exam papers (2010–2025).",
    href: "/paper-matrix",
  },
];

const FAQS = [
  {
    q: "How does the Cambridge 9708 Essay Grader work?",
    a: "Marginal uses a 4-pass examiner pipeline grounded in official Cambridge mark schemes and examiner reports. Pass 1 audits AO1 definitions and concepts; Pass 2 traces AO2 analytical causal chains; Pass 3 evaluates AO3 synthesis and context; Pass 4 pins in-situ comments directly onto the exact sentences of your essay where marks were gained or lost.",
  },
  {
    q: "Can I try grading an essay and doing MCQs without logging in?",
    a: "Yes! Click 'Grade Your Essay Free' or 'Practice Timed MCQs' to enter the real tool immediately as a guest. Once you grade your essay or complete an MCQ attempt, you can create a permanent account in 5 seconds to preserve your marks, reports, and revision history.",
  },
  {
    q: "How does handwriting OCR and diagram import work?",
    a: "Inside the Essay Grader, click 'Import Handwriting' to upload clear photos or scans of your handwritten mock papers. Vision OCR extracts candidate text and isolates handwritten diagrams. You can also attach economics curve tokens (e.g. [DIAGRAM: Tax shift MPC > MSC]) or upload diagram screenshots.",
  },
  {
    q: "Does Marginal support both Cambridge AS Level and A Level (A2)?",
    a: "Yes, 100%. Marginal is purpose-built for both AS Level (Papers 1 & 2, including 8-mark and 12-mark essays and Section A data response) and A Level / A2 (Papers 3 & 4, including 20-mark evaluative essays and advanced micro/macro case studies). Every rubric and examiner model adapts specifically to the syllabus level you choose.",
  },
  {
    q: "Can teachers and schools use Marginal?",
    a: "Yes. Teachers can create dedicated classroom cohorts to set essay assignments, monitor student submissions in real time, and audit cohort diagnostic heatmaps across AO1, AO2, and AO3 competencies.",
  },
];

// ---------------------------------------------------------------------------
// Main Index Page Component
// ---------------------------------------------------------------------------
function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  const [fullFeaturesOpen, setFullFeaturesOpen] = useState(false);

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
            <a href="#how-to-grade" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <PenLine className="size-3.5 text-primary" />
              <span>Grade Essays</span>
            </a>
            <a href="#how-to-mcq" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <ListChecks className="size-3.5 text-emerald-500" />
              <span>Do MCQs for Free</span>
            </a>
            <button
              type="button"
              onClick={() => setFullFeaturesOpen(true)}
              className="hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer text-muted-foreground"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>All Features &amp; Specs</span>
            </button>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <ThemeToggle className="size-8" />

            <Link
              to="/teacher-auth"
              className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Teacher Sign In
            </Link>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            )}

            <Magnetic strength={8}>
              <Link
                to="/grade"
                className="inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 bg-primary px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground rounded-lg shadow-xs hover:bg-primary/90 transition-all font-bold"
              >
                <span>Get Started</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* ── 1. Hero: Grade Economics Essays & Do MCQs for Free ─────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-12 pt-10 sm:pt-16">
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
                Papers 1, 2, 3 &amp; 4
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Direct Guest Access (No Login Required)
              </span>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="max-w-4xl mx-auto text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground">
              Grade Economics Essays &amp;{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Do MCQs for Free.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={100}>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              Experience authentic Cambridge 9708 examiner evaluation. Type or photograph handwritten mock papers, attach curve shifts, and get line-by-line comment pins — or practice authentic Papers 1 &amp; 3 timed MCQs.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 text-sm font-extrabold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Link to="/grade" className="inline-flex items-center gap-2">
                  <PenLine className="size-4" />
                  <span>Grade Your Essay Free (Direct Access)</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-5 text-sm font-semibold border-2 hover:bg-muted gap-2 shadow-xs cursor-pointer"
              >
                <Link to="/mcq-live">
                  <ListChecks className="size-4 text-emerald-500" />
                  <span>Practice Timed MCQs</span>
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ✓ Start immediately as Guest &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Official 9708 Cambridge Standards
            </p>
          </Reveal>
        </div>

        {/* Feature Marquee Ticker */}
        <div className="relative mt-10 w-full">
          <Ribbon items={RIBBON_ITEMS} />
        </div>
      </section>

      {/* ── 2. Grade Cambridge Economics Essays Free (Visual Walkthrough) ── */}
      <section id="how-to-grade" className="relative border-b-[1.5px] border-ink py-16 sm:py-24 scroll-mt-16 bg-muted/10">
        <CosmicAtmosphere variant="cyan" sparkles={true} density="low" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 space-y-12">
          <Reveal>
            <div className="text-center space-y-2 max-w-3xl mx-auto">
              <span className="chip-soft border border-primary/30 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                <PenLine className="size-3.5 mr-1" /> Instant Essay Examiner
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                Grade Cambridge Economics Essays Free
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                From a blank draft or a handwritten mock paper photo to official Cambridge AO1, AO2, and AO3 marks with Pass 4 in-situ comment pins.
              </p>
            </div>
          </Reveal>

          {/* 4 Step Cards for Essay Grader */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Step 1: Prompt & Command Word Detection */}
            <Reveal variant="pop" delay={50}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-primary/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      Command Word
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Pick or Enter Question</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select AS Level (8m, 12m) or A2 Level (20m). Marginal detects command words ("Discuss", "Explain", "Evaluate") to calibrate AO1, AO2, and AO3 mark quotas automatically.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 text-[11px] font-mono text-muted-foreground">
                  "Evaluate whether a depreciating exchange rate will always reduce a current account deficit. [12]"
                </div>
              </div>
            </Reveal>

            {/* Step 2: Write or Import Handwriting (Vision OCR) */}
            <Reveal variant="pop" delay={100}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-primary/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-sky-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      02
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-sky-500/30 text-sky-600 dark:text-sky-400">
                      Vision OCR
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Write or Import Handwriting</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Type directly in the clean editor OR click <span className="font-semibold text-foreground">Import Handwriting</span> to snap photos of handwritten mock papers. Vision OCR extracts text and hand-drawn diagrams instantly.
                  </p>
                </div>
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 text-[11px] text-sky-700 dark:text-sky-300 flex items-center gap-2">
                  <Scan className="size-4 shrink-0 text-sky-500" />
                  <span>Transcribes handwritten exam scripts &amp; isolates notebook drawings</span>
                </div>
              </div>
            </Reveal>

            {/* Step 3: Attach Diagrams & Add Curve Shifts */}
            <Reveal variant="pop" delay={150}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-primary/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      03
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                      Diagrams &amp; Curves
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Attach Diagrams &amp; Curves</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload handwritten diagrams or tag curve shifts like tax incidence, deadweight loss, or AD/AS shifts with tags (e.g. <span className="font-mono text-[10.5px] bg-muted px-1 rounded">[DIAGRAM: Tax shift]</span>) for examiner auditing.
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-2.5 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <Sliders className="size-4 shrink-0 text-indigo-500" />
                  <span>Audits axis labels ($P, Q$), equilibrium shifts ($E_1 \to E_2$), and incidence</span>
                </div>
              </div>
            </Reveal>

            {/* Step 4: Cambridge AO Marks & Pass 4 Comment Pins */}
            <Reveal variant="pop" delay={200}>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full hover:border-primary/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      04
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Pass 4 Pins
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Cambridge Marks &amp; Pins</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Receive official AO1, AO2, and AO3 marks grounded in Cambridge mark schemes. Pass 4 pins Google-Docs-style comments directly to your exact sentences where marks were awarded or dropped.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span>Line-by-line comment pins reveal examiner rationale</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Direct CTA */}
          <div className="pt-2 flex justify-center">
            <Button asChild size="lg" className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm gap-2 shadow-lg shadow-primary/25 cursor-pointer">
              <Link to="/grade">
                <PenLine className="size-4" />
                <span>Launch Cambridge Essay Grader Now (No Login Required)</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 3. Do Cambridge Past Paper MCQs Free (Visual Walkthrough) ──────── */}
      <section id="how-to-mcq" className="relative border-b-[1.5px] border-ink py-16 sm:py-24 scroll-mt-16">
        <CosmicAtmosphere variant="amber" sparkles={true} density="low" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 space-y-12">
          <Reveal>
            <div className="text-center space-y-2 max-w-3xl mx-auto">
              <span className="chip-soft border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ListChecks className="size-3.5 mr-1" /> Timed MCQ Desk
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                Do Cambridge Past Paper MCQs Free
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Practice authentic Paper 1 (AS) and Paper 3 (A2) past exams with realistic timers, scratchpad annotation, and official mark scheme rationales.
              </p>
            </div>
          </Reveal>

          {/* 3 Step Cards for MCQ Desk */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Step 1: Select Paper 1 or Paper 3 */}
            <Reveal variant="pop" delay={50}>
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between h-full hover:border-emerald-500/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      15-Year Bank
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Select Paper 1 or Paper 3</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose from 15 years of Cambridge 9708 past papers (2010–2025) across March, June, and November exam series, or drill by syllabus topic (Elasticity, Market Structure, Macro Policy).
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-[11px] font-mono text-muted-foreground">
                  9708/12/M/J/24 • Paper 1 AS Microeconomics (30 Questions)
                </div>
              </div>
            </Reveal>

            {/* Step 2: Timed Exam Desk & Jump Matrix */}
            <Reveal variant="pop" delay={100}>
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between h-full hover:border-emerald-500/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-amber-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      02
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
                      Exam Desk
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Timed Exam Desk &amp; Jump Matrix</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practice under genuine exam conditions with a 60-minute Cambridge countdown timer, scratchpad tools, question flag matrix, and 12-hour session auto-resume so you never lose your answers.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Target className="size-4 shrink-0 text-amber-500" />
                  <span>Flag tough questions and jump freely via the 1–30 question grid</span>
                </div>
              </div>
            </Reveal>

            {/* Step 3: Official Mark Scheme Distractor Rationales */}
            <Reveal variant="pop" delay={150}>
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between h-full hover:border-emerald-500/50 transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                      03
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-600 dark:text-purple-400">
                      Examiner Rationales
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground">Mark Scheme Distractor Rationales</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Instant marking upon submission. Marginal explains why the correct option is grounded in economic theory, and breaks down the exact distractor traps in options A, C, and D.
                  </p>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5 text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-purple-500" />
                  <span>Eliminate common misconceptions and careless calculation slips</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Direct CTA */}
          <div className="pt-2 flex justify-center">
            <Button asChild size="lg" className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer">
              <Link to="/mcq-live">
                <ListChecks className="size-4" />
                <span>Start Timed MCQ Past Paper Now (No Login Required)</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 4. Interactive Command Word Drill ─────────────────────────────── */}
      <section id="drill" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16 bg-muted/10">
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

      {/* ── 5. FAQs ──────────────────────────────────────────────────────── */}
      <section id="faq" className="relative border-b-[1.5px] border-ink py-16 scroll-mt-16">
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

      {/* ── 6. ⭐ BOTTOM MASTER BUTTON: SEE HOW EVERYTHING WORKS IN DETAIL ── */}
      <section className="relative py-16 px-4 sm:px-6 md:px-8 text-center bg-muted/20 border-b-[1.5px] border-ink">
        <div className="mx-auto max-w-4xl space-y-6">
          <span className="chip-soft border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
            Complete Cambridge 9708 Specifications
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-foreground">
            Want to See All Tools, Accuracy Benchmarks &amp; Examiner Exemplars?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Explore our complete suite of 8 Cambridge tools, examiner calibration data, real candidate 10/12 scripts, and educator workspace.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => setFullFeaturesOpen(true)}
              size="lg"
              className="h-12 px-7 text-xs sm:text-sm font-extrabold bg-foreground text-background hover:bg-foreground/90 shadow-xl cursor-pointer gap-2"
            >
              <Sparkles className="size-4 text-amber-400" />
              <span>Explore All Features &amp; Specifications in Detail</span>
              <ArrowRight className="size-4" />
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 text-xs sm:text-sm font-semibold border-2 hover:bg-muted"
            >
              <Link to="/grade">
                <span>Start Grading as Guest</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 7. Detailed Features Modal / Explorer Dialog ──────────────────── */}
      <Dialog open={fullFeaturesOpen} onOpenChange={setFullFeaturesOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto border-2 border-border p-6 sm:p-8 rounded-2xl shadow-2xl space-y-10">
          <DialogHeader className="space-y-2 text-left border-b border-border/80 pb-5">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-bold">
                Cambridge 9708 Complete Architecture
              </Badge>
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                8 Dedicated Tools
              </Badge>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-foreground">
              All Marginal Tools, Benchmarks &amp; Specifications
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Marginal is engineered exclusively for Cambridge International AS &amp; A Level Economics. Explore every tool, benchmark, and educator feature below.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="tools" className="w-full space-y-5">
            <TabsList className="bg-muted/80 p-1 h-auto flex-wrap sm:flex-nowrap gap-1 w-full justify-start rounded-xl">
              <TabsTrigger value="tools" className="text-xs font-semibold py-1.5 px-3">
                8 Cambridge Tools
              </TabsTrigger>
              <TabsTrigger value="accuracy" className="text-xs font-semibold py-1.5 px-3">
                Accuracy &amp; Benchmarks
              </TabsTrigger>
              <TabsTrigger value="ai-comparison" className="text-xs font-semibold py-1.5 px-3">
                Why Raw AI Fails
              </TabsTrigger>
              <TabsTrigger value="exemplar" className="text-xs font-semibold py-1.5 px-3">
                10/12 Candidate Script
              </TabsTrigger>
              <TabsTrigger value="teachers" className="text-xs font-semibold py-1.5 px-3">
                For Teachers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="space-y-4 focus-visible:outline-none">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <span>The 8 Specialized Cambridge 9708 Tools</span>
                </h3>
                <span className="text-xs font-mono text-muted-foreground">Papers 1, 2, 3 &amp; 4</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CAMBRIDGE_TOOLS.map((tool) => (
                  <Link
                    key={tool.title}
                    to={tool.href}
                    onClick={() => setFullFeaturesOpen(false)}
                    className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className={cn("size-8 rounded-lg flex items-center justify-center text-white", tool.tile)}>
                          <tool.icon className="size-4" />
                        </div>
                        <Badge variant="outline" className="text-[9.5px] font-mono px-1.5 py-0">
                          {tool.badge}
                        </Badge>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {tool.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                        {tool.body}
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-primary">
                      <span>Open Tool</span>
                      <ArrowUpRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="accuracy" className="focus-visible:outline-none">
              <AccuracyCredibilitySection className="py-2 sm:py-4 border-0 bg-transparent px-0" />
            </TabsContent>

            <TabsContent value="ai-comparison" className="focus-visible:outline-none">
              <AiComparisonSection className="py-2 sm:py-4 border-0 bg-transparent px-0" />
            </TabsContent>

            <TabsContent value="exemplar" className="focus-visible:outline-none">
              <RealEssayShowcase className="py-2 sm:py-4 border-0 bg-transparent px-0" />
            </TabsContent>

            <TabsContent value="teachers" className="focus-visible:outline-none">
              <TeachersSection className="py-2 sm:py-4 border-0 bg-transparent px-0" />
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button onClick={() => setFullFeaturesOpen(false)} className="bg-primary text-primary-foreground font-bold text-xs px-5">
              Close Explorer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t-[1.5px] border-ink bg-card py-10 px-4 sm:px-6 md:px-10">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <Wordmark muted={true} />
          <p>© {new Date().getFullYear()} Marginal AI. Dedicated to Cambridge International 9708 Economics.</p>
          <div className="flex items-center gap-4 font-semibold">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
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
