import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  Gift,
  GraduationCap,
  LineChart,
  ListChecks,
  Mail,
  MessageCircle,
  PenLine,
  Scan,
  School,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import { ExaminerStage, LiveExaminer } from "@/components/marketing/live-examiner";
import { MarkingHand } from "@/components/marketing/mascot";
import { CountUp, Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { SiteNavLinks, SiteNavMobile } from "@/components/marketing/site-nav";
import { Magnetic, TiltCard } from "@/components/marketing/three-d";
import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { RealEssayShowcase } from "@/components/marketing/real-essay-showcase";
import { RagEngineSection } from "@/components/marketing/rag-engine-section";
import { TeachersSection } from "@/components/marketing/teachers-section";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { captureReferralCode } from "@/lib/waitlist-client";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal | AI Cambridge Economics (9708) Prep" },
      {
        name: "description",
        content:
          "Marginal is the complete Cambridge 9708 Economics mastery platform with AI Essay Grading, Live Examiner, and Paper 1 & 3 MCQ practice.",
      },
      {
        name: "keywords",
        content:
          "Marginal, Marginal Economics, Marginal AI, Cambridge Economics 9708, A Level Economics, AS Level Economics, Cambridge 9708 AI grading, economics essay marker, live examiner",
      },
      {
        property: "og:site_name",
        content: "Marginal",
      },
      {
        property: "og:title",
        content: "Marginal | AI Cambridge Economics (9708) Prep",
      },
      {
        property: "og:description",
        content:
          "Marginal is the complete Cambridge 9708 Economics mastery platform with AI Essay Grading, Live Examiner, and Paper 1 & 3 MCQ practice.",
      },
      {
        property: "og:url",
        content: "https://marginal-econ.com",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: "https://marginal-econ.com/marginal-m-icon-clean.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Marginal | AI Cambridge Economics (9708) Prep",
      },
      {
        name: "twitter:description",
        content:
          "Marginal is the complete Cambridge 9708 Economics mastery platform with AI Essay Grading, Live Examiner, and Paper 1 & 3 MCQ practice.",
      },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://marginal-econ.com",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Marginal",
          "alternateName": ["Marginal Economics", "Marginal AI Economics"],
          "url": "https://marginal-econ.com",
          "description":
            "AI Cambridge Economics 9708 mastery platform featuring automated essay grading and live examiner practice.",
        }),
      },
    ],
  }),
  component: Index,
});

const RIBBON_ITEMS = [
  "Live Examiner",
  "Score Maximizer",
  "AO1 Knowledge",
  "AO2 Analysis",
  "AO3 Evaluation",
  "Paper 1 & 3 MCQs",
  "12h Exam Resume",
  "Paper 2 & 4 Essays",
  "Unlimited Essay Gradings",
  "Handwriting Vision OCR",
  "Diagram Studio",
  "Definition Hub",
  "Marked to 9708",
];

// The three assessment objectives in the product's own reserved colours, so
// the vocabulary a student meets on every mark breakdown is taught here
// first.
const OBJECTIVES = [
  { code: "AO1", name: "Knowledge", dot: "bg-ao1", share: 38 },
  { code: "AO2", name: "Analysis", dot: "bg-ao2", share: 72 },
  { code: "AO3", name: "Evaluation", dot: "bg-ao3", share: 45 },
];

// All eight specialized features engineered for Cambridge 9708 Economics.
const TOOLS = [
  {
    icon: Sparkles,
    tile: "bg-purple-600",
    badge: "Real-Time AI",
    title: "Live Examiner & Score Maximizer",
    lead: "Instant Cambridge coaching as you type",
    body: "Grammarly for Economics: instant AO1/AO2/AO3 sentence highlighting, live running marks, terminology checks, and step-by-step Score Maximizer blueprints.",
    href: "/live-examiner",
  },
  {
    icon: PenLine,
    tile: "bg-ao2",
    badge: "Full Audit",
    title: "Dual-Pass Essay Grader",
    lead: "Unlimited Cambridge 9708 essay evaluations",
    body: "Grounded in official 9708 mark schemes and coursebooks. Two independent evaluation passes correct AI central-tendency bias, providing line-by-line mark scheme matching and rewrite plans.",
    href: "/grade",
  },
  {
    icon: ListChecks,
    tile: "bg-ao1",
    badge: "Exam Simulation",
    title: "MCQ Live Past Papers & Resume",
    lead: "Authentic timed Paper 1 & 3 exams with 12h resume",
    body: "Real Cambridge past papers with official mark schemes. Features interactive question flagging, jump matrix, distractor reasoning, and automatic 12-hour draft save & resume.",
    href: "/mcq-live",
  },
  {
    icon: BookOpen,
    tile: "bg-ao3",
    badge: "Revision Vault",
    title: "Cambridge Definition Hub",
    lead: "Over 120 verified textbook definitions",
    body: "Precise definitions for every 9708 economic concept with essential syllabus keywords, topic tags, and copyable flashcards so you never surrender easy AO1 knowledge marks.",
    href: "/definitions",
  },
  {
    icon: LineChart,
    tile: "bg-primary",
    badge: "Visual Studio",
    title: "Economics Diagram Studio",
    lead: "Every 9708 diagram with dynamic curve shifts",
    body: "Interactive micro and macro diagrams with real-time shifts, equilibrium price/quantity tracking, and examiner labelling standards for tariffs, externalities, and market structures.",
    href: "/diagrams",
  },
  {
    icon: Flame,
    tile: "bg-amber-600",
    badge: "15-Yr Intelligence",
    title: "Past Paper Topic Predictor",
    lead: "Statistical cycle intelligence across 15 years",
    body: "Analyzes 15 years of Cambridge 9708 past papers (2010–2025) to model rotation probability, detect cyclically overdue topics, and practice verified past questions.",
    href: "/paper-matrix",
  },
  {
    icon: Scan,
    tile: "bg-ao1",
    badge: "Vision AI",
    title: "Handwriting Vision OCR",
    lead: "Upload photos of handwritten mock exams",
    body: "Specialized vision engine lifts student handwriting off paper, detects hand-drawn diagrams, verifies economic terminology, and sends it directly for examiner grading.",
    href: "/grade",
  },
  {
    icon: TrendingUp,
    tile: "bg-ao3",
    badge: "Intelligence",
    title: "Review & Analytics Hub",
    lead: "Projected Cambridge grades & domain radar",
    body: "Executive performance dashboard tracking your projected grade, essay averages, MCQ topic mastery, and syllabus balance across Micro, Macro, Trade, and Market Failure.",
    href: "/review",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Paste the question",
    body: "A real past-paper question, or one from the question bank. Marginal reads the command word and the mark allocation before it reads a single word of your answer.",
  },
  {
    n: "02",
    title: "Add your answer",
    body: "Type it, paste it, or photograph a handwritten script and let the OCR lift it off the page. Diagrams are read as diagrams, not ignored.",
  },
  {
    n: "03",
    title: "Get marked, then get a plan",
    body: "A mark with an AO1/AO2/AO3 split, the exact points the mark scheme wanted, and an ordered rewrite plan for the next attempt.",
  },
];

const TRUST = [
  {
    icon: BookOpen,
    title: "Your materials, not a generic model",
    body: "Your coursebook, the 9708 syllabus, mark schemes and examiner reports go in. Every mark is retrieved from those documents and cited back to them, so you can check the working.",
  },
  {
    icon: Target,
    title: "Calibrated against real marks",
    body: "Anchor essays with confirmed marks are verified by a separate authorised team with special access rights, then shown to the examiner as exemplars. The standard stays where the syllabus sets it, not where a model guesses it should be.",
  },
  {
    icon: ShieldCheck,
    title: "Marked twice, independently",
    body: "A second pass re-marks the script without seeing the first. That corrects the central-tendency bias that makes AI quietly cluster every essay in the middle bands.",
  },
];

const FAQS = [
  {
    q: "When does it actually open?",
    a: "The first cohort opens for AS and A Level Economics (9708) students. Everyone on the waitlist gets one email when it does — in queue order, so an earlier place is a real advantage rather than a badge.",
  },
  {
    q: "Is this the same as a real Cambridge mark?",
    a: "No, and we won't pretend otherwise. It's a second opinion that shows its reasoning and cites the mark scheme it used, so you can check it and argue with it. Your teacher's mark is still the one that counts.",
  },
  {
    q: "Can it read my handwriting?",
    a: "Usually. Photograph the script, and the OCR lifts the text off the page; you get a chance to correct anything it misread before it's marked. Diagrams are cropped and read separately.",
  },
  {
    q: "What if it marks something wrong?",
    a: "Then argue with it — that's what the citations are for. Marginal runs on AI, and AI makes mistakes: a mark can land too high or too low, a mark-scheme point can be missed, a word of handwriting can be misread. Every mark comes with the reasoning and the mark-scheme line behind it, so a wrong one is visible instead of hidden. Anything that matters, check with your teacher.",
  },
  {
    q: "Who decides what a good answer looks like?",
    a: "The syllabus and the mark schemes — held in place by a separate authorised team with special access rights, who verify the anchor essays the marking is measured against. Teachers don't calibrate it and neither do students, so the standard stays in one place rather than drifting school by school.",
  },
  {
    q: "What do you do with my email?",
    a: "It sits in one table and is used for exactly one thing: telling you when your place comes up. No newsletter, no partners, no reselling. There's an unsubscribe in the only email we'll send.",
  },
];

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
  // Read once here purely so the invitation banner can be shown. The form
  // does its own capture; both read the same stored value, and whichever
  // runs first is the one that cleans the query string.
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

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.marginal-econ.workers.dev";
  const shareUrl = `${shareOrigin}${invitedBy ? `?ref=${encodeURIComponent(invitedBy)}` : ""}`;
  const shareMessage = `Hey! I'm using Marginal for Cambridge AS & A Level Economics (9708). It gives real-time Live Examiner coaching, breaks down essays into AO1/AO2/AO3 marks grounded in official Cambridge mark schemes, and offers full MCQ past paper practice with resume. Grade unlimited essays free:\n${shareUrl}`;

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <CustomCursor />
      <ScrollProgress />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:px-10 lg:px-12 xl:px-16 sm:py-3">
          <Link to="/">
            <Wordmark />
          </Link>

          <SiteNavLinks />

          <div className="flex items-center gap-2">
            <SiteNavMobile />
            <Link
              to="/teacher-auth"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            >
              <School className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Teacher Portal</span>
            </Link>
            <Link
              to="/teacher-auth"
              search={{ tab: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all shadow-2xs"
            >
              <GraduationCap className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Sign up as a teacher</span>
            </Link>
            <Link
              to="/auth"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            >
              Sign in
            </Link>
            <Magnetic strength={8}>
              <Link
                to="/auth"
                className="pop-sm pop-press shine inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground sm:text-sm rounded-lg"
              >
                <span>Get Started Free</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-10 sm:pb-12 md:pb-14">
        {/* Three background layers, back to front: the CSS aurora wash, WebGL curtain,
            cosmic twinkling starfield, and paper-grid overlay. */}
        <div className="aurora-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <AuroraCanvas />
        <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
        <div className="paper-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <Drift speed={0.1} className="top-52 left-[1%] hidden xl:block">
          <Curl className="w-16 text-primary/30" />
        </Drift>
        <Drift speed={-0.06} className="top-40 right-[2%] hidden xl:block">
          <Waves className="w-20 text-ao3/60" />
        </Drift>
        <Drift speed={0.14} className="bottom-36 left-[40%] hidden lg:block">
          <Star className="doodle size-6 text-primary/25" />
        </Drift>
        <Star className="doodle absolute top-32 left-[46%] hidden size-4 text-ao3/30 md:block" />

        <div className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[1440px] items-center gap-8 lg:gap-10 xl:gap-14 px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-soft shadow-xs flex items-center gap-1.5 border border-primary/30 bg-primary/10 text-primary font-semibold">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                  </span>
                  <Sparkles className="size-3.5 text-primary animate-pulse" />
                  Cambridge 9708 Examiner Calibration
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  RAG Grounded · May/June 2026 Series
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-5 text-[2.35rem] leading-[1.08] font-extrabold text-balance min-[380px]:text-4xl md:text-[3.25rem] lg:text-[3.5rem] xl:text-[3.85rem] tracking-tight">
                Marginal —{" "}
                <span className="relative inline-block mt-1 sm:mt-1.5 px-3 py-1 rounded-xl bg-purple-950/60 dark:bg-purple-950/70 border border-purple-500/40 text-amber-300 shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-md">
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent font-black tracking-tight">
                    The AI Cambridge Economics Platform
                  </span>
                </span>
              </h1>
              <h2 className="mt-3 text-lg font-semibold text-primary sm:text-xl md:text-2xl">
                Master AS & A Level Economics (9708) with AI Grading
              </h2>
            </Reveal>

            <Reveal delay={85}>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex text-amber-500 text-xs tracking-wider font-bold" aria-hidden="true">
                  ★★★★★
                </div>
                <span className="font-medium text-foreground">
                  Calibrated against 1,400+ real Cambridge exam scripts
                </span>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-pretty text-muted-foreground dark:text-foreground/90">
                {settings.heroDescription}
              </p>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-pretty text-muted-foreground dark:text-foreground/80">
                {settings.heroNotice}
              </p>
            </Reveal>

            {/* Live Cambridge Metric Highlights */}
            <Reveal delay={180}>
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3 max-w-xl">
                <div className="rounded-xl border border-primary/25 bg-card/70 p-3 text-center backdrop-blur-md shadow-xs hover:border-primary/50 transition-colors">
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight block">1,400+</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">Mark Schemes</span>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-card/70 p-3 text-center backdrop-blur-md shadow-xs hover:border-emerald-500/50 transition-colors">
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight block">AO1/2/3</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">Clause Auditing</span>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-card/70 p-3 text-center backdrop-blur-md shadow-xs hover:border-amber-500/50 transition-colors">
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight block">Unlimited</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">Essay Gradings</span>
                </div>
              </div>
            </Reveal>

            {/* Direct candidate conversion actions */}
            <Reveal delay={210}>
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-sm font-extrabold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02] cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  <Link to="/auth">
                    <span>Grade Essays Free (Unlimited)</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShareOpen(true)}
                  className="h-12 px-5 text-sm font-semibold border-2 hover:bg-muted gap-2 shadow-xs group cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                >
                  <Share2 className="size-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                  <span>Share with Classmates</span>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                No credit card required &bull; Unlimited essays graded free &bull; Full MCQ past paper practice
              </p>
            </Reveal>

            {invitedBy ? (
              <Reveal delay={240}>
                <p className="mt-3.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Gift className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  Invited with code <span className="font-semibold text-foreground">{invitedBy.toLowerCase()}</span> — unlimited essay grading unlocked.
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={260}>
              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground dark:text-foreground/70">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 shadow-2xs">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" /> Grounded in 9708 mark schemes
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 shadow-2xs">
                  <Target className="size-3.5 text-primary shrink-0" /> Papers 1, 2, 3 &amp; 4
                </span>
                <a
                  href="#rag-engine"
                  className="inline-flex items-center gap-1.5 font-bold text-foreground bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-lg border border-primary/30 shadow-2xs"
                >
                  <Cpu className="size-3.5 text-primary animate-pulse shrink-0" /> Cambridge RAG Engine ↓
                </a>
                <a
                  href="#graded-exemplar"
                  className="inline-flex items-center gap-1.5 font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-lg border border-primary/30 shadow-2xs"
                >
                  Inspect real graded essay below ↓
                </a>
              </div>
            </Reveal>
          </div>

          {/* Centered Cambridge Specimen Showcase & Founder Statement */}
          <Reveal variant="pop" delay={120} className="relative w-full space-y-3 sm:space-y-3.5">
            <div className="relative w-full">
              {/* Ambient Stage Halo Glow */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/20 to-amber-500/20 blur-xl opacity-75 -z-10 animate-pulse" />
              <TiltCard max={6} lift={12} className="relative mx-auto w-full max-w-xl xl:max-w-2xl 2xl:max-w-[680px] min-w-0 shadow-2xl rounded-2xl overflow-visible backdrop-blur-xl">
                <SpecimenCard />
              </TiltCard>
            </div>

            {/* Founder Mission & Inspiration — Unboxed Normal Text, Highly Visible and Bold */}
            <div className="mx-auto w-full max-w-xl xl:max-w-2xl 2xl:max-w-[680px] px-1 pt-1 space-y-1.5">
              <p className="text-xs sm:text-sm md:text-[14px] font-bold leading-relaxed text-foreground">
                “I personally lost critical marks in IGCSE Economics on structured answers despite knowing the theory. I refused to let that happen again in AS &amp; A Level. That is why I created Marginal — to give myself and all economics students the exact line-by-line mark scheme diagnosis and examiner structuring needed to master the top band.”
              </p>
              <p className="text-xs sm:text-[12.5px] font-extrabold text-foreground tracking-wide flex flex-wrap items-center gap-2">
                <span className="text-primary font-black">— Saikrish</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="font-bold text-foreground">CS Academy</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="text-muted-foreground font-semibold">Founder, Marginal</span>
              </p>
            </div>
          </Reveal>
        </div>

        <Ribbon
          items={RIBBON_ITEMS}
          className="right-8 bottom-3 left-8 -rotate-[1deg] md:right-20 md:bottom-4 md:left-20"
        />
      </section>

      {/* ── Real Graded Essay Showcase (User Scored Exemplar) ────────────── */}
      <RealEssayShowcase />

      {/* ── Why Marginal Beats Raw AI (Real 12-Mark Stress Test) ─────────── */}
      <AiComparisonSection />

      {/* ── Cambridge Syllabus Coverage & RAG Knowledge Engine ────────────── */}
      <RagEngineSection />

      {/* ── Cambridge Teachers & Department Workspace ──────────────────────── */}
      <TeachersSection />

      {/* ── What you get back ────────────────────────────────────────────── */}
      <section id="result" className="relative border-b-[1.5px] border-ink scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="amber" sparkles={true} density="medium" />
        <Drift speed={-0.08} className="top-24 right-[3%] hidden xl:block">
          <CircleScribble className="w-24 text-primary/35" />
        </Drift>
        <div className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[1440px] items-center gap-12 px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="eyebrow eyebrow-accent">What you get back</p>
              <h2 className="mt-2.5 text-2xl font-bold text-balance md:text-4xl">
                Not a grade. A diagnosis.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
                Every mark comes apart into the three assessment objectives, so you can see which
                one is actually costing you the grade — and read the specific sentence where the
                argument stopped short.
              </p>
            </Reveal>

            <dl className="mt-8 space-y-4">
              {OBJECTIVES.map((objective, index) => (
                <Reveal key={objective.code} delay={140 + index * 90}>
                  <div className="group flex gap-3">
                    <span
                      className={`mt-1.5 size-3 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-150 ${objective.dot}`}
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-sm font-semibold">
                        {objective.code} · {objective.name}
                      </dt>
                      <dd className="text-sm text-muted-foreground">
                        {objective.code === "AO1"
                          ? "Definitions, theory, the right diagram — the marks you lose by being vague."
                          : objective.code === "AO2"
                            ? "Chains of cause and effect that actually reach a conclusion."
                            : "Judgement: which effect dominates, under what conditions, and why."}
                      </dd>
                    </div>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          <Reveal variant="pop" delay={80} className="relative">
            <DottedArrow className="absolute -top-16 -left-20 hidden w-24 -rotate-[8deg] text-plum/45 lg:block dark:text-primary/55" />
            <TiltCard max={8} lift={18}>
              <SpecimenCard />
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ── What's inside ────────────────────────────────────────────────── */}
      <section
        id="tools"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="default" sparkles={true} density="high" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="What's inside"
              title="Eight specialized tools, one Cambridge syllabus"
              lead="Everything in Marginal is engineered exclusively for Cambridge AS & A Level Economics (9708). No generic chatbots, no vague study widgets. Hover or tap a card to see what it does."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool, index) => (
              <Reveal key={tool.title} variant="pop" delay={index * 35}>
                <Link
                  to={isAuthenticated ? tool.href : "/auth"}
                  search={isAuthenticated ? undefined : ({ redirect: tool.href } as any)}
                  className="pop pop-press group flex h-full flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl bg-card border-2 cursor-pointer no-underline block"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`pop-sm flex size-10 items-center justify-center rounded-xl text-primary-foreground transition-transform duration-300 group-hover:scale-110 ${tool.tile}`}
                      >
                        <tool.icon className="size-5" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9.5px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/60">
                          {tool.badge}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                          {String(index + 1).padStart(2, "0")} / 08
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-primary/90 leading-snug">
                      {tool.lead}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {tool.body}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
                      Cambridge 9708 Engine
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary text-[11px] font-bold group-hover:translate-x-1 transition-transform">
                      <span>View engine</span>
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="relative border-b-[1.5px] border-ink scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="cyan" sparkles={true} density="medium" />
        <Drift speed={-0.09} className="top-16 right-[5%] hidden lg:block pointer-events-none">
          <Waves className="w-24 text-primary/40" />
        </Drift>
        <Drift speed={0.07} className="bottom-20 left-[4%] hidden xl:block pointer-events-none">
          <Curl className="w-20 -scale-x-100 text-ao1/40" />
        </Drift>
        <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Three steps, about four minutes"
              lead="No setup, no onboarding tour. On day one you'll bring one essay you're unsure about."
            />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <ol className="pop mt-12 divide-y-[1.5px] divide-ink/12 overflow-hidden bg-card/80 backdrop-blur-xs border border-border/70 shadow-sm">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="group flex flex-col gap-4 p-6 transition-colors duration-200 hover:bg-accent/40 md:flex-row md:gap-8 md:p-8"
                >
                  <span className="pop-sm flex size-10 shrink-0 items-center justify-center bg-primary font-mono text-sm font-semibold text-primary-foreground transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 shadow-sm">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Command-word drill ───────────────────────────────────────────── */}
      <section
        id="drill"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="purple" sparkles={true} density="medium" />
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[1440px] items-center gap-12 px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <p className="eyebrow eyebrow-accent">Two minutes, four words</p>
            <h2 className="mt-2.5 text-2xl font-bold text-balance md:text-4xl">
              The command word decides <span className="aurora-text">where the marks are</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
              “Explain” and “assess” are not two ways of saying the same thing — they are two
              different objectives, worth different marks, answered in different shapes. Most lost
              marks start here, before a single point of theory.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
              Have a go. No account, no waitlist, no score kept.
            </p>
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <CommandWordDrill />
          </Reveal>
        </div>
      </section>

      {/* ── Why trust it ─────────────────────────────────────────────────── */}
      <section id="trust" className="relative border-b-[1.5px] border-ink scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="amber" sparkles={true} density="medium" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Why the mark is worth something"
              title="An AI mark is only useful if you can check where it came from"
              lead="So all three of these are mechanisms, not promises. You'll be able to go and look at each one."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TRUST.map((item, index) => (
              <Reveal key={item.title} variant="pop" delay={index * 80}>
                <TiltCard max={7} lift={12} className="h-full">
                  <div className="pop flex h-full flex-col p-6 backdrop-blur-xs bg-card/85 border border-border/70 hover:border-amber-500/40 transition-colors shadow-sm">
                    <span className="layer-1 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <item.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100} className="mt-8">
            <div className="mx-auto max-w-3xl px-3 py-2 text-center sm:text-left space-y-2">
              <p className="text-sm sm:text-base font-bold leading-relaxed text-foreground">
                “I personally lost critical marks in IGCSE Economics on structured answers despite knowing the theory inside out. I refused to let that repeat in AS &amp; A Level. That is why I built Marginal — to give myself and every economics student the exact line-by-line mark scheme diagnosis, causal structuring, and live exam calibration needed to master the top band.”
              </p>
              <p className="text-xs sm:text-[13px] font-extrabold text-foreground tracking-wide flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-primary font-black">— Saikrish</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="font-bold text-foreground">CS Academy</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="text-muted-foreground font-semibold">Founder, Marginal</span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-pretty text-muted-foreground">
              It still isn't a Cambridge examiner. Treat the mark as a second opinion that shows its
              reasoning — then argue with it. That argument is where most of the learning happens.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Experimental Lab: Live Examiner (Under Development) ──────────── */}
      <section
        id="experimental-live-examiner"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden py-16 md:py-24"
      >
        <CosmicAtmosphere variant="purple" sparkles={true} density="high" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <Reveal>
            <div className="text-center space-y-3 mb-10">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold uppercase text-[11px] tracking-wider">
                <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
                Experimental Feature · In Active Development
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Live Examiner — Real-Time Keystroke Economics AI
              </h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
                We are currently engineering our next-generation live typing evaluator that diagnoses grammar, causal chains, and Cambridge AO marks in real-time as you write. Try out our interactive development prototype below.
              </p>
            </div>
          </Reveal>

          <Reveal variant="pop" delay={120}>
            <div className="relative mx-auto w-full max-w-3xl">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/25 to-amber-500/25 blur-2xl opacity-75 -z-10 animate-pulse" />
              <ExaminerStage className="relative mx-auto w-full min-w-0 shadow-2xl border-2 border-primary/40 rounded-2xl overflow-hidden backdrop-blur-xl ring-1 ring-primary/20">
                <LiveExaminer />
              </ExaminerStage>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="default" sparkles={true} density="low" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Frequently asked, honestly answered" />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <Accordion type="single" collapsible className="pop mt-12 px-6 md:px-8 backdrop-blur-xs bg-card/80 border border-border/70 shadow-sm">
              {FAQS.map((faq, index) => (
                <AccordionItem key={faq.q} value={faq.q} className="border-ink/12 last:border-0">
                  <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                    <span className="flex min-w-0 items-baseline gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-semibold">{faq.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pl-10 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ── Candidate Onboarding CTA ──────────────────────────────────── */}
      <section
        id="join"
        className="relative scroll-mt-20 px-4 py-14 sm:px-5 sm:py-16 md:px-8 md:py-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
        <div className="aurora-wash pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <Reveal variant="pop" className="relative z-10">
          <div className="pop relative mx-auto max-w-5xl overflow-hidden bg-plum bg-linear-to-br from-plum-soft via-plum to-plum-deep px-4 py-10 sm:px-6 sm:py-14 md:px-12 border border-plum-soft/40 shadow-2xl">
            <CosmicAtmosphere variant="hero" sparkles={true} density="medium" />
            <div
              className="paper-grid pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div className="starfield" aria-hidden="true" />
            <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div className="text-center md:text-left">
                <span className="chip-soft bg-plum-foreground/15 text-plum-foreground">
                  <Sparkles className="size-3.5" />
                  Cambridge 9708 Candidate Workspace
                </span>

                <h2 className="mt-4 text-3xl font-bold text-balance text-plum-foreground md:text-4xl">
                  Start scoring higher in AS & A Level Economics
                </h2>
                <p className="mt-4 max-w-md text-sm text-pretty text-plum-foreground/85 md:text-base">
                  Every candidate gets unlimited Cambridge essay gradings, the real-time Live Examiner, and authentic past paper MCQ drills with auto-save resume completely free.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 px-6 text-xs sm:text-sm font-bold bg-background text-foreground hover:bg-background/90 shadow-lg"
                  >
                    <Link to="/auth">
                      Create Free Account <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 px-5 text-xs sm:text-sm font-semibold border-white/30 text-plum-foreground hover:bg-white/10"
                  >
                    <Link to="/grade">Grade Unlimited Essays</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 px-5 text-xs sm:text-sm font-semibold border-white/30 text-plum-foreground hover:bg-white/10"
                  >
                    <Link to="/live-examiner">Live Examiner</Link>
                  </Button>
                </div>

                <p className="mt-5 text-xs text-plum-foreground/70">
                  By joining you agree to the{" "}
                  <Link to="/terms" className="font-medium underline underline-offset-4">
                    terms &amp; conditions
                  </Link>{" "}
                  and the{" "}
                  <Link to="/privacy" className="font-medium underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
              <MarkingHand className="wiggle mx-auto w-52 md:w-full md:max-w-xs" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Share with Classmates Modal ──────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md sm:max-w-lg border-2 border-border p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Users className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold sm:text-xl">
                  Share Marginal with Classmates
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Invite your study group to practice with official Cambridge 9708 mark schemes &amp; live feedback.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Free Classmate Benefit Callout */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
              <Gift className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Unlimited Graded Essays + Full MCQ Practice
                </p>
                <p className="text-muted-foreground dark:text-emerald-200/80 leading-relaxed">
                  Anyone who joins through your link gets instant access to unlimited essays marked by our Cambridge 9708 examiner engine, Live Examiner coaching, and past paper drills with no credit card required.
                </p>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Quick Share via Social &amp; Chat
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <MessageCircle className="size-5 text-emerald-600 transition-transform group-hover:scale-110" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out Marginal for Cambridge AS & A Level Economics (9708) — unlimited essays graded + Live Examiner & MCQ past paper drills!")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Send className="size-5 text-sky-500 transition-transform group-hover:scale-110" />
                  <span>Telegram</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Preparing for Cambridge AS & A Level Economics (9708) with Marginal — unlimited essays graded + Live Examiner & MCQ past paper drills:")}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Share2 className="size-5 text-primary transition-transform group-hover:scale-110" />
                  <span>X / Twitter</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Cambridge 9708 Economics Prep — Unlimited Graded Essays on Marginal")}&body=${encodeURIComponent(shareMessage)}`}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-border transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Mail className="size-5 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Direct Copy Link Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Your Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 shrink-0 h-9 font-semibold border-2 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Study Group Quick Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Ready-made message for Discord or group chats
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="size-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy full message
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed font-sans select-all">
                {shareMessage}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

/**
 * A specimen of the thing itself, clearly labelled as an example rather than
 * a real script — it shows the actual vocabulary (command word, AO split,
 * missing points) a student will meet inside.
 */
function SpecimenCard() {
  const [view, setView] = useState<"marginal" | "generic">("marginal");

  return (
    <div className="relative pt-2.5">
      <span className="sticker layer-2 absolute top-0 right-3 z-10 bg-ao3 text-foreground font-bold shadow-sm">
        Live Inspection
      </span>

      <div className="pop p-6 md:p-7 bg-card">
        {/* Toggle between Marginal Examiner vs Generic AI */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4 mb-4">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setView("marginal")}
              className={cn(
                "rounded-md px-3 py-1 transition-all",
                view === "marginal"
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Marginal 9708 Examiner
            </button>
            <button
              type="button"
              onClick={() => setView("generic")}
              className={cn(
                "rounded-md px-3 py-1 transition-all",
                view === "generic"
                  ? "bg-destructive/20 text-destructive font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Generic AI Bot
            </button>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold hidden sm:inline">
            Paper 2 · Q4(b)
          </span>
        </div>

        <p className="eyebrow">AS Economics Paper 2 · Section B [12 Marks]</p>
        <p className="mt-2 text-sm leading-relaxed font-medium">
          “Assess whether a minimum price is the most effective way to reduce consumption of a
          demerit good.”
        </p>

        {view === "marginal" ? (
          <>
            <div className="layer-1 mt-6 space-y-3.5">
              {OBJECTIVES.map((objective, index) => (
                <div key={objective.code}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={`size-2 rounded-full ${objective.dot}`} aria-hidden="true" />
                      {objective.code}
                      <span className="text-muted-foreground">{objective.name}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      <CountUp value={objective.share} suffix="%" delay={240 + index * 130} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`grow-bar h-full rounded-full ${objective.dot}`}
                      style={
                        {
                          width: `${objective.share}%`,
                          "--bar-delay": `${240 + index * 130}ms`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="eyebrow text-primary">Marginal Diagnostic Feedback</p>
              <ul className="mt-2.5 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ao3" aria-hidden="true" />
                  <span>
                    <strong className="text-foreground">AO3 Gap:</strong> Listed alternative policies (taxation, education) without synthesizing <em>which</em> policy dominates when price elasticity of demand is inelastic.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ao2" aria-hidden="true" />
                  <span>
                    <strong className="text-foreground">AO2 Gap:</strong> Transmission halts at “quantity demanded falls”; omitted informal black-market emergence and producer surplus changes.
                  </span>
                </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Calibrated against real 9708 candidates</span>
                <a href="#graded-exemplar" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View Full 10/12 Script Exemplar ↓
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-destructive">
                <span>⚠️ Generic Chatbot Output (ChatGPT / Claude default):</span>
              </div>
              <p className="italic text-foreground/80 leading-relaxed">
                “This is a very good essay! You clearly understand minimum prices and explain how they reduce demand for demerit goods like cigarettes. You also mentioned other policies. Mark: 8 / 12 (Grade B). Keep practicing!”
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">Why generic AI fails Cambridge students:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cannot separate marks into official AO1, AO2, AO3 quotas.</li>
                <li>Suffers from central-tendency bias (clusters all scores around 60%).</li>
                <li>Provides polite encouragement instead of actionable mark-scheme rubrics.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow eyebrow-accent">{eyebrow}</p>
      <h2 className="mt-2.5 text-2xl font-bold text-balance md:text-4xl">{title}</h2>
      {lead ? (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

function Wordmark({ muted = false }: { muted?: boolean }) {
  return (
    <span className="group flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
      <img
        src="/marginal-m-icon-clean.png"
        alt=""
        aria-hidden="true"
        className={
          "size-8 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6 sm:size-9 " +
          (muted ? "opacity-70 grayscale" : "")
        }
      />
      <span
        className={
          muted
            ? "text-sm font-semibold text-muted-foreground sm:text-base"
            : "text-sm font-semibold sm:text-base"
        }
      >
        Marginal
      </span>
    </span>
  );
}
