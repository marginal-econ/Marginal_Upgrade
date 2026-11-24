import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn, copyTextToClipboard } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  Gift,
  GraduationCap,
  LineChart,
  ListChecks,
  Mail,
  MessageCircle,
  Minimize2,
  PenLine,
  RotateCcw,
  Scan,
  School,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Trophy,
  Wand2,
  Zap,
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
import { MarkingHand } from "@/components/marketing/mascot";
import { CountUp, Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { SiteNavLinks, SiteNavMobile } from "@/components/marketing/site-nav";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Magnetic, TiltCard } from "@/components/marketing/three-d";
import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { AccuracyCredibilitySection } from "@/components/marketing/accuracy-credibility-section";
import { McqShowcaseSection } from "@/components/marketing/mcq-showcase-section";
import { TeachersSection } from "@/components/marketing/teachers-section";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { CommunityPartnerBanner } from "@/components/marketing/community-partner-banner";
import { captureReferralCode } from "@/lib/waitlist-client";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal | AI Cambridge AS & A Level Economics (9708) Prep & Essay Examiner" },
      {
        name: "description",
        content:
          "Master Cambridge International AS & A Level Economics (9708) with Marginal. Features instant AI essay grading, line-by-line mark scheme breakdown, and Paper 1, 2, 3 & 4 practice for both AS and A Level.",
      },
      {
        name: "keywords",
        content:
          "9708 economics, Cambridge Economics 9708, Marginal AI, AS Level Economics, A Level Economics 9708 prep, parginal, parginal AI, marginal-econ, Marginal Cambridge Economics, 9708 economics prep, A Level Economics 9708, AS and A level economics",
      },
      {
        property: "og:site_name",
        content: "Marginal",
      },
      {
        property: "og:title",
        content: "Marginal | Cambridge AS & A Level Economics (9708) Prep",
      },
      {
        property: "og:description",
        content: "The complete Cambridge AS & A Level Economics (9708) mastery platform with AI essay grading and MCQ practice for Papers 1, 2, 3 & 4.",
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
        content: "Marginal | Cambridge AS & A Level Economics (9708) Prep",
      },
      {
        name: "twitter:description",
        content: "The complete Cambridge AS & A Level Economics (9708) mastery platform with AI essay grading and MCQ practice for Papers 1, 2, 3 & 4.",
      },
      {
        name: "application-name",
        content: "Marginal AI",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Marginal AI",
      },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://marginal-econ.com/",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Marginal",
          "alternateName": "Parginal",
          "url": "https://marginal-econ.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://marginal-econ.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Marginal AI?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Marginal AI is the Cambridge International AS & A Level Economics (9708) mastery platform featuring automated AO1/AO2/AO3 essay grading calibrated against official Cambridge mark schemes, and Paper 1 & 3 MCQ past paper drills.",
              },
            },
            {
              "@type": "Question",
              "name": "Is Marginal AI free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, Marginal AI provides free access to unlimited essay evaluations, syllabus citations, and full past paper MCQ practice.",
              },
            },
            {
              "@type": "Question",
              "name": "How does Marginal AI grade Cambridge 9708 essays?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Marginal AI uses Cambridge 9708 syllabus mark schemes, official examiner reports, and calibrated anchor scripts to grade essays across AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) assessment objectives.",
              },
            },
            {
              "@type": "Question",
              "name": "Can Marginal AI read handwritten essays and economic diagrams?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, photograph your handwritten script or essay diagram and Marginal AI OCR extracts the text while isolating diagrams for accurate examiner assessment.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

const RIBBON_ITEMS = [
  "Both AS & A Level",
  "8m, 12m & 20m Essays",
  "Papers 1, 2, 3 & 4",
  "Multiplayer MCQ Arena",
  "Live 6-Digit Quiz PIN",
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

// Specialized features engineered for Cambridge 9708 Economics.
const TOOLS = [
  {
    icon: Zap,
    tile: "bg-sky-600",
    badge: "Speed Edition",
    title: "Marginal Lite (Quick Practice)",
    body: "Lightweight, lightning-fast revision portal with zero setup. Instant access to questions, flashcards, and rapid practice drills.",
    href: "https://lite.marginal-econ.com/",
    external: true,
  },
  {
    icon: Gamepad2,
    tile: "bg-amber-600",
    badge: "Multiplayer Arena",
    title: "Live MCQ Quiz Arena",
    body: "Multiplayer Cambridge 9708 past paper races with 6-digit PIN, Serious Exam sprint, and Game Arena with power-ups (Steal, Swap & Tax).",
    href: "/quiz",
  },
  {
    icon: PenLine,
    tile: "bg-ao2",
    badge: "Full Audit",
    title: "Dual-Pass Essay Grader",
    body: "Line-by-line mark scheme matching across AO1, AO2, and AO3 with dual-pass bias correction and rewrite plans.",
    href: "/grade",
  },
  {
    icon: ListChecks,
    tile: "bg-ao1",
    badge: "Exam Simulation",
    title: "MCQ Live Past Papers & Resume",
    body: "Timed Paper 1 & 3 exams with distractor reasoning, question flagging, and 12-hour auto-resume.",
    href: "/mcq-live",
  },
  {
    icon: FileSpreadsheet,
    tile: "bg-emerald-600",
    badge: "Section A Studio",
    title: "Data Response & Case Studies",
    body: "Paper 2 & 4 Section A practice with Table 1.1 data interpretation, OFR calculations, and curve shift analysis.",
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
    icon: LineChart,
    tile: "bg-primary",
    badge: "Visual Studio",
    title: "Economics Diagram Studio",
    body: "Dynamic micro and macro diagrams with interactive curve shifts, equilibrium tracking, and examiner labels.",
    href: "/diagrams",
  },
  {
    icon: Flame,
    tile: "bg-amber-600",
    badge: "15-Yr Intelligence",
    title: "Past Paper Topic Predictor",
    body: "Statistical rotation modeling across 15 years of Cambridge 9708 exam papers (2010–2025).",
    href: "/paper-matrix",
  },
  {
    icon: Scan,
    tile: "bg-ao1",
    badge: "Vision AI",
    title: "Handwriting Vision OCR",
    body: "Extracts handwritten mock exam scripts and hand-drawn diagrams for instant examiner grading.",
    href: "/grade",
  },
  {
    icon: TrendingUp,
    tile: "bg-ao3",
    badge: "Intelligence",
    title: "Review & Analytics Hub",
    body: "Performance radar tracking projected Cambridge grades, MCQ topic mastery, and syllabus balance.",
    href: "/review",
  },
];

const FAQS = [
  {
    q: "Does Marginal support both Cambridge AS Level and A Level (A2)?",
    a: "Yes, 100%. Marginal is purpose-built for both AS Level (Papers 1 & 2, including 8-mark and 12-mark essays and Section A data response) and A Level / A2 (Papers 3 & 4, including 20-mark evaluative essays and advanced micro/macro case studies). Every rubric and examiner model adapts specifically to the syllabus level you choose.",
  },
  {
    q: "How does Marginal grade Cambridge 9708 essays?",
    a: "Marginal evaluates your essay against official Cambridge mark schemes and examiner reports, breaking your score into AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) assessment objectives with sentence-by-sentence feedback.",
  },
  {
    q: "Is Marginal free for students?",
    a: "Yes. Students get free instant access to essay grading, step-by-step mark breakdown, and timed Paper 1 & 3 past paper MCQ drills.",
  },
  {
    q: "Can Marginal read handwritten essays and diagrams?",
    a: "Yes. Take a photo of your handwritten mock exam or notebook. Our vision OCR extracts the text, isolates diagrams, and evaluates them directly against syllabus standards.",
  },
  {
    q: "How does the Multiplayer MCQ Arena work?",
    a: "Students or teachers can host or join live timed past paper MCQ competitions using a simple 6-digit PIN. You can choose between a focused timed mock sprint or Game Arena mode with strategic power-ups and live leaderboards.",
  },
  {
    q: "Can teachers and schools use Marginal?",
    a: "Yes. Teachers can register for dedicated cohorts to set essay assignments, track class submissions in real time, and audit cohort diagnostic heatmaps.",
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

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "https://marginal-econ.com";
  const shareUrl = `${shareOrigin}${invitedBy ? `?ref=${encodeURIComponent(invitedBy)}` : ""}`;
  const shareMessage = `Hey! I'm using Marginal for Cambridge AS & A Level Economics (9708). It breaks down essays into AO1/AO2/AO3 marks grounded in official Cambridge mark schemes, and offers full MCQ past paper practice with auto-save resume. Grade unlimited essays free:\n${shareUrl}`;

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Could not copy link to clipboard.");
    }
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(shareMessage);
    if (ok) {
      setCopiedMessage(true);
      toast.success("Study group message copied to clipboard!");
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      toast.error("Could not copy message to clipboard.");
    }
  };

  const [isTrialView, setIsTrialView] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("marginal_landing_view");
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("view") === "trial" || stored === "trial") {
        setIsTrialView(true);
      }
    }
  }, []);

  const toggleTrialView = (value?: boolean) => {
    setIsTrialView((prev) => {
      const next = typeof value === "boolean" ? value : !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("marginal_landing_view", next ? "trial" : "default");
      }
      return next;
    });
  };

  if (isTrialView) {
    return (
      <TrialHome
        onToggleDefault={() => toggleTrialView(false)}
        isAuthenticated={isAuthenticated}
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <CustomCursor />
      <ScrollProgress />

      {/* ── Community Partner Banner (r/The_IGCSE_Workaholics) ─────────── */}
      <CommunityPartnerBanner />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:px-10 lg:px-12 xl:px-16 sm:py-3">
          <Link to="/">
            <Wordmark />
          </Link>

          <SiteNavLinks />

          <div className="flex items-center gap-2">
            <SiteNavMobile />
            <ThemeToggle />

            <Link
              to="/teacher-auth"
              search={{ tab: "signup" }}
              className="hidden min-[420px]:inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 sm:px-3 py-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 hover:bg-purple-500/25 hover:border-purple-500/60 transition-all shadow-2xs whitespace-nowrap"
              title="Official Cambridge 9708 Teacher & Department Registration"
            >
              <School className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Teacher: Sign Up</span>
              <span className="sm:hidden">Teachers</span>
            </Link>
            <a
              href="https://lite.marginal-econ.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2 sm:px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 hover:border-sky-500/60 transition-all shadow-2xs whitespace-nowrap"
              title="Marginal Lite (Quick Practice Edition)"
            >
              <Zap className="size-3.5 text-sky-500 shrink-0" />
              <span>Marginal Lite</span>
              <ExternalLink className="size-2.5 opacity-70" />
            </a>
            <Link
              to="/auth"
              className="hidden rounded-lg px-3 py-1.5 text-xs xl:text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex whitespace-nowrap"
            >
              Sign in
            </Link>
            <Magnetic strength={8}>
              <Link
                to="/auth"
                className="pop-sm pop-press shine inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 whitespace-nowrap bg-primary px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-primary-foreground sm:text-sm rounded-lg"
              >
                <span className="hidden min-[380px]:inline">Get Started Free</span>
                <span className="min-[380px]:hidden">Get Started</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-0">
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
                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 shadow-2xs">
                  <GraduationCap className="size-3 text-purple-500" />
                  Both AS &amp; A Level (Papers 1, 2, 3 &amp; 4)
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Users className="size-3 text-emerald-500" />
                  100+ Active Users
                </span>
                <a
                  href="https://lite.marginal-econ.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5 shadow-2xs hover:bg-sky-500/25 hover:border-sky-500/60 transition-all cursor-pointer"
                  title="Visit Marginal Lite (https://lite.marginal-econ.com/)"
                >
                  <Zap className="size-3 text-sky-500" />
                  <span>Marginal Lite Edition ↗</span>
                </a>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-5 text-2xl min-[380px]:text-3xl sm:text-4xl md:text-[3.25rem] lg:text-[3.5rem] xl:text-[3.85rem] leading-[1.1] font-extrabold tracking-tight break-words">
                Marginal AI —{" "}
                <span className="relative inline-block mt-1 sm:mt-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-purple-950/60 dark:bg-purple-950/70 border border-purple-500/40 text-amber-300 shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-md max-w-full">
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent font-black tracking-tight break-words">
                    The Cambridge AS &amp; A Level Platform
                  </span>
                </span>
              </h1>
              <h2 className="mt-3 text-base sm:text-xl md:text-2xl font-semibold text-primary">
                Engineered for Both Cambridge AS &amp; A Level Economics (9708)
              </h2>
            </Reveal>

            <Reveal delay={85}>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex text-amber-500 text-xs tracking-wider font-bold" aria-hidden="true">
                  ★★★★★
                </div>
                <span className="font-medium text-foreground">
                  89.6% Examiner Alignment · Calibrated against 30 real Cambridge ECR candidate scripts &amp; 1,400+ mark schemes
                </span>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-pretty text-muted-foreground dark:text-foreground/90">
                {settings.heroDescription}
              </p>
            </Reveal>

            {/* Live Cambridge Metric Highlights */}
            <Reveal delay={150}>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 max-w-xl">
                <div className="rounded-xl border border-emerald-500/30 bg-card/80 p-2 sm:p-2.5 text-center backdrop-blur-md shadow-xs hover:border-emerald-500/50 transition-colors">
                  <span className="text-base min-[380px]:text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">89.6%</span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-muted-foreground font-semibold leading-tight block mt-0.5">Examiner Match</span>
                </div>
                <div className="rounded-xl border border-primary/25 bg-card/70 p-2 sm:p-2.5 text-center backdrop-blur-md shadow-xs hover:border-primary/50 transition-colors">
                  <span className="text-base min-[380px]:text-xl sm:text-2xl font-black text-foreground tracking-tight block">1,400+</span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-muted-foreground font-semibold leading-tight block mt-0.5">Mark Schemes</span>
                </div>
                <div className="rounded-xl border border-blue-500/25 bg-card/70 p-2 sm:p-2.5 text-center backdrop-blur-md shadow-xs hover:border-blue-500/50 transition-colors">
                  <span className="text-base min-[380px]:text-xl sm:text-2xl font-black text-foreground tracking-tight block">AO1/2/3</span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-muted-foreground font-semibold leading-tight block mt-0.5">Clause Auditing</span>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-card/70 p-2 sm:p-2.5 text-center backdrop-blur-md shadow-xs hover:border-amber-500/50 transition-colors">
                  <span className="text-base min-[380px]:text-xl sm:text-2xl font-black text-foreground tracking-tight block">Unlimited</span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-muted-foreground font-semibold leading-tight block mt-0.5">Essay Gradings</span>
                </div>
              </div>
            </Reveal>

            {/* AS & A Level Syllabus Scope Breakdown */}
            <Reveal delay={165}>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-xs flex items-start gap-2.5 text-left">
                  <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-black px-1.5 py-0.5 shrink-0 mt-0.5">
                    AS LEVEL
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Papers 1 &amp; 2</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Paper 1 MCQs · Paper 2 Data Response &amp; 8m/12m Essays
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-xs flex items-start gap-2.5 text-left">
                  <span className="rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-black px-1.5 py-0.5 shrink-0 mt-0.5">
                    A LEVEL (A2)
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Papers 3 &amp; 4</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Paper 3 MCQs · Paper 4 Case Studies &amp; 20m Evaluative Essays
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Direct candidate conversion actions */}
            <Reveal delay={180}>
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-sm font-extrabold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02] cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  <Link to="/auth">
                    <span>Grade Essays Free</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-5 text-sm font-semibold border-2 hover:bg-muted gap-2 shadow-xs cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                >
                  <Link to="/mcq-live">
                    <ListChecks className="size-4 text-primary shrink-0" />
                    <span>Practice MCQs</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 text-sm font-semibold border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground gap-2 shadow-xs cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                >
                  <Link to="/quiz">
                    <Gamepad2 className="size-4 text-amber-500 shrink-0" />
                    <span>Live Quiz (PIN)</span>
                  </Link>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" /> No credit card required
                </span>
                <span>•</span>
                <span>Free instant access</span>
                <span>•</span>
                <span>Grounded in Cambridge 9708</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Share2 className="size-3 shrink-0" /> Share
                </button>
              </div>
            </Reveal>

            {invitedBy ? (
              <Reveal delay={210}>
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Gift className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  Invited with code <span className="font-semibold text-foreground">{invitedBy.toLowerCase()}</span> — unlimited essay grading unlocked.
                </p>
              </Reveal>
            ) : null}
          </div>

          {/* Centered Cambridge Specimen Showcase */}
          <Reveal variant="pop" delay={120} className="relative w-full">
            <div className="relative w-full">
              {/* Ambient Stage Halo Glow */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/20 to-amber-500/20 blur-xl opacity-75 -z-10 animate-pulse" />
              <TiltCard max={6} lift={12} className="relative mx-auto w-full max-w-xl xl:max-w-2xl 2xl:max-w-[680px] min-w-0 shadow-2xl rounded-2xl overflow-visible backdrop-blur-xl">
                <SpecimenCard />
              </TiltCard>
            </div>
          </Reveal>
        </div>

        {/* Docked Cambridge 9708 Feature Marquee Ticker */}
        <div className="relative mt-8 sm:mt-10 md:mt-12 w-full">
          <Ribbon items={RIBBON_ITEMS} />
        </div>
      </section>

      {/* ── 1. Verified Cambridge Examiner Accuracy & Benchmark (First) ─────── */}
      <AccuracyCredibilitySection />

      {/* ── 2. What We Provide: Core Cambridge 9708 Capabilities ─────────────── */}
      <section
        id="tools"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="default" sparkles={true} density="high" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Cambridge 9708 Capabilities"
              title="What Marginal Provides"
              lead="Eleven specialized features engineered exclusively for Cambridge AS & A Level Economics (9708)."
            />
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool, index) => {
              const isCenteredStart = TOOLS.length % 4 === 2 && index === TOOLS.length - 2;
              const isExternal = "external" in tool && tool.external;
              const cardContent = (
                <>
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
                          {String(index + 1).padStart(2, "0")} / {String(TOOLS.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <span>{tool.title}</span>
                      {isExternal && <ExternalLink className="size-3.5 opacity-70 shrink-0" />}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {tool.body}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
                      {isExternal ? "Speed Edition" : "Cambridge 9708 Engine"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary text-[11px] font-bold group-hover:translate-x-1 transition-transform">
                      <span>{isExternal ? "Open Lite" : "View tool"}</span>
                      <span aria-hidden="true">{isExternal ? "↗" : "→"}</span>
                    </span>
                  </div>
                </>
              );

              return (
                <Reveal
                  key={tool.title}
                  variant="pop"
                  delay={index * 35}
                  className={cn(isCenteredStart && "lg:col-start-2")}
                >
                  {isExternal ? (
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pop pop-press group flex h-full flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/60 hover:shadow-xl bg-card border-2 cursor-pointer no-underline block"
                    >
                      {cardContent}
                    </a>
                  ) : (
                    <Link
                      to={isAuthenticated ? tool.href : "/auth"}
                      search={isAuthenticated ? undefined : ({ redirect: tool.href } as any)}
                      className="pop pop-press group flex h-full flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl bg-card border-2 cursor-pointer no-underline block"
                    >
                      {cardContent}
                    </Link>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Dedicated Cambridge 9708 MCQ & Arena Section ──────────────────── */}
      <McqShowcaseSection />

      {/* ── 4. Why Marginal Beats Raw AI (Real 12-Mark Stress Test) ─────────── */}
      <AiComparisonSection />

      {/* ── 5. Cambridge Teachers & Department Workspace ──────────────────────── */}
      <TeachersSection />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="default" sparkles={true} density="low" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Frequently asked, honestly answered" />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <Accordion type="single" collapsible className="pop mt-12 px-6 md:px-8 backdrop-blur-xs bg-card/80 border border-border/70 shadow-sm">
              {TRIAL_FAQS.map((faq, index) => (
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
                  Every candidate gets unlimited Cambridge essay gradings, full AO1/AO2/AO3 clause audits, and authentic past paper MCQ drills with auto-save resume completely free.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center md:justify-start gap-3 relative z-20">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 sm:h-12 px-6 text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-white/90 shadow-xl shadow-black/25 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl cursor-pointer"
                  >
                    <Link to="/auth" className="inline-flex items-center gap-2">
                      <span>Create Free Account</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 sm:h-12 px-5 text-xs sm:text-sm font-semibold border-white/25 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 backdrop-blur-md rounded-xl transition-all cursor-pointer"
                  >
                    <Link to="/grade" className="inline-flex items-center gap-2">
                      <PenLine className="size-4 text-emerald-400" />
                      <span>Grade Essays Free</span>
                    </Link>
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
                  Anyone who joins through your link gets instant access to unlimited essays marked by our Cambridge 9708 examiner engine, AO1/AO2/AO3 clause audits, and past paper drills with no credit card required.
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
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out Marginal for Cambridge AS & A Level Economics (9708) — unlimited essays graded + Cambridge MCQ past paper drills!")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <MessageCircle className="size-5 text-sky-500 transition-transform group-hover:scale-110" />
                  <span>Telegram</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Preparing for Cambridge AS & A Level Economics (9708) with Marginal — unlimited essays graded + Cambridge MCQ past paper drills:")}&url=${encodeURIComponent(shareUrl)}`}
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

      <SiteFooter onToggleTrialView={() => toggleTrialView(true)} />
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

      <div className="pop p-4 sm:p-6 md:p-7 bg-card">
        {/* Toggle between Marginal Examiner vs Generic AI */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4 mb-4">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setView("marginal")}
              className={cn(
                "rounded-md px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs transition-all",
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
                "rounded-md px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs transition-all",
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
                <a href="#benchmarks" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View Calibration Benchmarks ↓
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
        alt="Marginal AI Cambridge Economics 9708 Essay Examiner dashboard logo"
        className={
          "size-8 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6 sm:size-9 " +
          (muted ? "opacity-70 grayscale" : "")
        }
      />
      <span
        className={
          muted
            ? "text-sm font-semibold text-muted-foreground sm:text-base flex items-center gap-1.5"
            : "text-sm font-semibold sm:text-base flex items-center gap-1.5"
        }
      >
        <span>Marginal</span>
        <span className="text-[10px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
          AI
        </span>
        <span className="hidden min-[440px]:inline-flex text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
          AS &amp; A Level
        </span>
      </span>
    </span>
  );
}

/* ── Search prompt cycle options ── */
const SEARCH_PROMPTS = [
  "Evaluate whether exchange rate depreciation reduces current account deficit [12]",
  "Discuss whether monopoly always harms consumer welfare [20]",
  "Paper 1 Micro: PED, PES and indirect tax incidence",
  "Section A Data Response: Table 1.1 inflation & GDP calculations",
  "Assess the effectiveness of supply-side policies in lowering unemployment [12]",
  "Paper 3 A2: Monopolistic competition vs oligopoly game theory",
];

/* ── Cambridge 9708 Syllabus Structure for Topic Index ── */
const AS_TOPICS = [
  { id: "1", title: "Basic economic ideas and resource allocation", count: 142, code: "9708/AS/T1" },
  { id: "2", title: "The price system and the microeconomy (Demand, Supply, Elasticity)", count: 289, code: "9708/AS/T2" },
  { id: "3", title: "Government microeconomic intervention (Taxes, Subsidies, Price controls)", count: 176, code: "9708/AS/T3" },
  { id: "4", title: "The macroeconomy (Circular flow, Inflation, Balance of payments)", count: 310, code: "9708/AS/T4" },
  { id: "5", title: "Government macroeconomic intervention (Fiscal, Monetary & Supply-side)", count: 198, code: "9708/AS/T5" },
];

const A2_TOPICS = [
  { id: "6", title: "Advanced microeconomics (Efficiency, Market structures, Labour markets)", count: 215, code: "9708/A2/T6" },
  { id: "7", title: "Advanced macroeconomics (Economic growth, Employment, Living standards)", count: 264, code: "9708/A2/T7" },
  { id: "8", title: "Government macro policy & international economic development", count: 188, code: "9708/A2/T8" },
];

const TRIAL_FAQS = [
  {
    q: "Does Marginal support both Cambridge AS Level and A Level (A2)?",
    a: "Yes. Marginal is purpose-built for both AS Level (Papers 1 & 2, including 8-mark and 12-mark essays and Section A data response) and A Level / A2 (Papers 3 & 4, including 20-mark evaluative essays and advanced micro/macro case studies). Every rubric and examiner model adapts specifically to the syllabus level you choose.",
  },
  {
    q: "How does Marginal grade Cambridge 9708 essays?",
    a: "Marginal evaluates your essay against official Cambridge mark schemes and examiner reports, breaking your score into AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) assessment objectives with sentence-by-sentence feedback.",
  },
  {
    q: "Is Marginal free for students?",
    a: "Yes. Students get free instant access to essay grading, step-by-step mark breakdown, and timed Paper 1 & 3 past paper MCQ drills with no account required to begin practicing.",
  },
  {
    q: "Can Marginal read handwritten essays and economic diagrams?",
    a: "Yes. Take a photo of your handwritten mock exam or notebook script. Our vision OCR extracts the text, isolates hand-drawn diagrams, and evaluates them directly against syllabus standards.",
  },
  {
    q: "How does the Multiplayer MCQ Arena work?",
    a: "Students or teachers can host or join live timed past paper MCQ competitions using a simple 6-digit PIN. You can choose between a focused timed mock sprint or Game Arena mode with strategic power-ups and live leaderboards.",
  },
  {
    q: "Can teachers and schools use Marginal?",
    a: "Yes. Teachers can register for dedicated cohorts to set essay assignments, track class submissions in real time, and audit cohort diagnostic heatmaps.",
  },
];


function TrialHome({
  onToggleDefault,
  isAuthenticated,
  settings,
}: {
  onToggleDefault: () => void;
  isAuthenticated: boolean | null;
  settings: PublicSettings;
}) {
  const navigate = useNavigate();
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Search input state and cycling placeholder
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // "How it works" interactive state: 1 (Find), 2 (Answer), 3 (Mark), 4 (Track)
  const [howStep, setHowStep] = useState<1 | 2 | 3 | 4>(1);

  // How it works - Step 1 filter demo states
  const [selectedPaper, setSelectedPaper] = useState("Paper 2 (AS Data & Essays)");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedTopicId, setSelectedTopicId] = useState("4");

  useEffect(() => setInvitedBy(captureReferralCode()), []);

  // Cycle search placeholders every 3.8s
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PROMPTS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "https://marginal-econ.com";
  const shareUrl = `${shareOrigin}${invitedBy ? `?ref=${encodeURIComponent(invitedBy)}` : ""}`;
  const shareMessage = `Hey! I'm using Marginal for Cambridge AS & A Level Economics (9708). It breaks down essays into AO1/AO2/AO3 marks grounded in official Cambridge mark schemes, and offers full MCQ past paper practice with auto-save resume. Practice free:\n${shareUrl}`;

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Could not copy link.");
    }
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(shareMessage);
    if (ok) {
      setCopiedMessage(true);
      toast.success("Study group message copied to clipboard!");
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      toast.error("Could not copy message.");
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim() || SEARCH_PROMPTS[placeholderIndex];
    if (query.toLowerCase().includes("mcq") || query.toLowerCase().includes("paper 1") || query.toLowerCase().includes("paper 3")) {
      navigate({ to: "/mcq-live" });
    } else {
      navigate({ to: "/grade", search: { q: query } as any });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-yellow-200 dark:selection:bg-yellow-900/60 font-sans antialiased">
      {/* ── Community Partner Banner (r/The_IGCSE_Workaholics) ─────────── */}
      <CommunityPartnerBanner />

      {/* ── Minimal Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" className="group flex items-center gap-2.5 font-serif text-lg font-bold text-foreground no-underline tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-xs bg-primary text-primary-foreground font-mono text-sm font-black shadow-hard">
              M
            </span>
            <span className="font-serif text-lg tracking-tight font-bold">marginal</span>
            <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.2 rounded-xs">
              9708
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#subjects" className="hover:text-foreground transition-colors">
              Papers &amp; Topics
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link to="/definitions" className="hover:text-foreground transition-colors">
              Definitions
            </Link>
            <Link to="/quiz" className="hover:text-foreground transition-colors">
              Quiz Arena
            </Link>
            <a
              href="https://lite.marginal-econ.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground text-sky-600 dark:text-sky-400 font-semibold transition-colors inline-flex items-center gap-1"
            >
              <Zap className="size-3 text-sky-500" />
              <span>Marginal Lite ↗</span>
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="size-8" />

            <a
              href="https://lite.marginal-econ.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 rounded-xs border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
            >
              <Zap className="size-3 text-sky-500" />
              <span>Marginal Lite</span>
            </a>

            <Link
              to="/teacher-auth"
              className="hidden lg:inline-flex items-center gap-1 rounded-xs border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
            >
              <School className="size-3" />
              <span>Teachers</span>
            </Link>

            <Link
              to="/auth"
              className="rounded-xs px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>

            <Link
              to={isAuthenticated ? "/grade" : "/auth"}
              className="rounded-xs bg-blue-600 dark:bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 shadow-hard transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Start practicing</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Desk Layout on Graph Grid ───────────────────────────── */}
      <main className="pg-desk border-b border-border">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 md:px-6 md:pt-16 md:pb-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
            {/* Left Column: Editorial Copy & Interactive Search */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <span className="font-bold text-foreground">CIE · AS &amp; A LEVEL</span>
                <span>·</span>
                <span>ECONOMICS 9708</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.06]">
                <mark className="hl">Everything</mark> for Cambridge past-paper practice.
              </h1>

              <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Every question, essay, and mark scheme, 2015 to 2026. Instant AI essay grading calibrated against official Cambridge examiner reports, and timed MCQ drills.
              </p>

              {/* Interactive Search Bar (PaperGrinder style) */}
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
                <div className="relative flex items-center rounded-xs border-2 border-foreground/80 bg-card shadow-hard transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <Search className="size-5 text-muted-foreground ml-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Try "${SEARCH_PROMPTS[placeholderIndex]}"`}
                    className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 pr-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/grade" })}
                      title="Upload handwritten essay photo (OCR)"
                      className="p-1.5 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Camera className="size-4" />
                    </button>
                    <button
                      type="submit"
                      title="Search Cambridge past papers"
                      className="flex size-8 items-center justify-center rounded-xs bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              </form>

              {/* CTA Action Row */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to={isAuthenticated ? "/grade" : "/auth"}
                  className="rounded-xs bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold shadow-hard inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Start practicing</span>
                  <ArrowRight className="size-4" />
                </Link>
                <span className="text-xs text-muted-foreground font-mono">
                  Free. No account needed to explore.
                </span>
              </div>
            </div>

            {/* Right Column: Hand-drawn Cambridge Economics Diagram (PaperGrinder Margin Art) */}
            <div className="hidden lg:flex flex-col items-center justify-center pt-2">
              <div className="relative w-full max-w-sm rounded-xs border border-border/80 bg-card/60 p-5 shadow-raised backdrop-blur-xs space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>FIGURE 1.1 · MARKET EQUILIBRIUM</span>
                  <span className="text-primary font-bold">Cambridge 9708</span>
                </div>

                {/* Handcrafted Technical SVG Diagram */}
                <svg
                  viewBox="0 0 340 230"
                  className="w-full h-auto text-foreground stroke-current fill-none overflow-visible"
                  aria-label="Supply and Demand curve diagram: Specific Indirect Tax"
                >
                  {/* Axes */}
                  <line x1="35" y1="190" x2="300" y2="190" strokeWidth="1.5" stroke="currentColor" />
                  <line x1="35" y1="190" x2="35" y2="20" strokeWidth="1.5" stroke="currentColor" />
                  <text x="245" y="212" className="text-[11px] font-mono fill-current stroke-none">
                    quantity (Q)
                  </text>
                  <text x="15" y="15" className="text-[11px] font-mono fill-current stroke-none">
                    price (P)
                  </text>

                  {/* Demand Curve D */}
                  <line x1="55" y1="35" x2="280" y2="175" strokeWidth="1.75" stroke="#2563eb" />
                  <text x="285" y="180" className="text-[11px] font-mono font-bold fill-blue-600 dark:fill-blue-400 stroke-none">
                    D
                  </text>

                  {/* Initial Supply Curve S1 */}
                  <line x1="75" y1="180" x2="295" y2="55" strokeWidth="1.75" stroke="#16a34a" />
                  <text x="300" y="60" className="text-[11px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400 stroke-none">
                    S₁
                  </text>

                  {/* Shifted Supply Curve S2 (Tax shift left/upwards) */}
                  <line x1="45" y1="145" x2="265" y2="20" strokeWidth="1.75" stroke="#dc2626" strokeDasharray="4 3" />
                  <text x="268" y="24" className="text-[11px] font-mono font-bold fill-red-600 dark:fill-red-400 stroke-none">
                    S₂
                  </text>

                  {/* Initial Equilibrium E1 (P1, Q1) */}
                  <circle cx="185" cy="116" r="3.5" className="fill-emerald-600 stroke-none" />
                  <line x1="35" y1="116" x2="185" y2="116" strokeWidth="1" strokeDasharray="2 2" stroke="currentColor" opacity="0.4" />
                  <line x1="185" y1="116" x2="185" y2="190" strokeWidth="1" strokeDasharray="2 2" stroke="currentColor" opacity="0.4" />
                  <text x="15" y="120" className="text-[10px] font-mono fill-current stroke-none">P₁</text>
                  <text x="180" y="204" className="text-[10px] font-mono fill-current stroke-none">Q₁</text>

                  {/* New Equilibrium E2 (P2, Q2: higher price, lower quantity) */}
                  <circle cx="150" cy="94" r="3.5" className="fill-red-600 stroke-none" />
                  <line x1="35" y1="94" x2="150" y2="94" strokeWidth="1" strokeDasharray="2 2" stroke="currentColor" opacity="0.4" />
                  <line x1="150" y1="94" x2="150" y2="190" strokeWidth="1" strokeDasharray="2 2" stroke="currentColor" opacity="0.4" />
                  <text x="15" y="98" className="text-[10px] font-mono fill-current stroke-none">P₂</text>
                  <text x="145" y="204" className="text-[10px] font-mono fill-current stroke-none">Q₂</text>
                </svg>

                <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/60 flex items-center justify-between">
                  <span>Shift in supply: specific indirect tax</span>
                  <span className="font-mono text-primary font-bold">Paper 2 · Q3(a)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Popular Papers Strip (Joined 4-column container with hairline dividers) ── */}
          <div className="mt-14 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-mono font-bold tracking-wider text-muted-foreground uppercase">
                Popular Cambridge Papers
              </span>
              <a href="#subjects" className="font-mono text-primary hover:underline font-semibold inline-flex items-center gap-1">
                <span>All papers &amp; topics</span>
                <span>↓</span>
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 rounded-xs border border-border bg-card divide-y md:divide-y-0 md:divide-x divide-border shadow-raised overflow-hidden">
              <Link
                to="/mcq-live"
                className="group p-3.5 sm:p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Paper 1
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">9708</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">AS Level Multiple Choice · 30Q</p>
              </Link>

              <Link
                to="/grade"
                className="group p-3.5 sm:p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Paper 2
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">9708</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">AS Data Response &amp; Essays · 60m</p>
              </Link>

              <Link
                to="/mcq-live"
                className="group p-3.5 sm:p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Paper 3
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">9708</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">A Level Multiple Choice · 30Q</p>
              </Link>

              <Link
                to="/grade"
                className="group p-3.5 sm:p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Paper 4
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">9708</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">A2 Extended Case Studies &amp; 20m Essays</p>
              </Link>
            </div>
          </div>
        </section>

        {/* ── "How It Works" Interactive Walkthrough (PaperGrinder 4-Step Showcase) ── */}
        <section id="how-it-works" className="border-t border-border bg-card/40 py-16 md:py-24 scroll-mt-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-[14rem_1fr] items-start">
              {/* Left Navigation Rail: 1 Find, 2 Answer, 3 Mark, 4 Track */}
              <div className="space-y-6">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  How it works
                </span>

                <ol className="space-y-4">
                  <li>
                    <button
                      type="button"
                      onClick={() => setHowStep(1)}
                      className="group flex w-full items-start gap-3 text-left cursor-pointer"
                    >
                      <span className="font-serif text-lg text-muted-foreground pt-0.5">1</span>
                      <div>
                        <span
                          className={cn(
                            "font-serif text-2xl font-normal tracking-tight block transition-colors",
                            howStep === 1 ? "hl font-semibold" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          Find
                        </span>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          By paper, topic, or search.
                        </span>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setHowStep(2)}
                      className="group flex w-full items-start gap-3 text-left cursor-pointer"
                    >
                      <span className="font-serif text-lg text-muted-foreground pt-0.5">2</span>
                      <div>
                        <span
                          className={cn(
                            "font-serif text-2xl font-normal tracking-tight block transition-colors",
                            howStep === 2 ? "hl font-semibold" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          Answer
                        </span>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          On screen, or photo your paper.
                        </span>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setHowStep(3)}
                      className="group flex w-full items-start gap-3 text-left cursor-pointer"
                    >
                      <span className="font-serif text-lg text-muted-foreground pt-0.5">3</span>
                      <div>
                        <span
                          className={cn(
                            "font-serif text-2xl font-normal tracking-tight block transition-colors",
                            howStep === 3 ? "hl font-semibold" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          Mark
                        </span>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          Against the real mark scheme.
                        </span>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setHowStep(4)}
                      className="group flex w-full items-start gap-3 text-left cursor-pointer"
                    >
                      <span className="font-serif text-lg text-muted-foreground pt-0.5">4</span>
                      <div>
                        <span
                          className={cn(
                            "font-serif text-2xl font-normal tracking-tight block transition-colors",
                            howStep === 4 ? "hl font-semibold" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          Track
                        </span>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          Your weak topics &amp; projected grade.
                        </span>
                      </div>
                    </button>
                  </li>
                </ol>
              </div>

              {/* Right Stage: Dynamic Interactive Exam Artifacts */}
              <div className="relative min-h-[460px] rounded-xs border border-border bg-card p-5 sm:p-6 shadow-hard overflow-hidden">
                {/* ── STEP 1: FIND (Paper & Topic Filter + Stacked Exam Paper) ── */}
                {howStep === 1 && (
                  <div className="grid gap-6 md:grid-cols-[1.1fr_1.3fr] items-start animate-in fade-in duration-300">
                    <div className="space-y-4 rounded-xs border border-border bg-background p-4 shadow-raised">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="font-serif text-base font-bold">Economics 9708</span>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">Cambridge AS</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase text-muted-foreground font-semibold">
                          Component
                        </label>
                        <select
                          value={selectedPaper}
                          onChange={(e) => setSelectedPaper(e.target.value)}
                          className="w-full rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs text-foreground font-medium"
                        >
                          <option>Paper 2 (AS Data &amp; Essays)</option>
                          <option>Paper 1 (AS Multiple Choice)</option>
                          <option>Paper 4 (A2 Evaluative Essays)</option>
                          <option>Paper 3 (A2 Multiple Choice)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span className="uppercase font-semibold">Year Range</span>
                          <span>2015 to {selectedYear}</span>
                        </div>
                        <input
                          type="range"
                          min={2015}
                          max={2026}
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold block">
                          Syllabus Topic
                        </span>
                        <div className="space-y-1.5">
                          {AS_TOPICS.slice(0, 4).map((topic) => (
                            <label
                              key={topic.id}
                              className="flex items-center justify-between p-1.5 rounded-xs hover:bg-muted/40 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="selected_topic"
                                  checked={selectedTopicId === topic.id}
                                  onChange={() => setSelectedTopicId(topic.id)}
                                  className="accent-blue-600"
                                />
                                <span className="font-mono text-muted-foreground">{topic.id}</span>
                                <span className="text-foreground line-clamp-1">{topic.title}</span>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                {topic.count}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHowStep(2)}
                        className="w-full rounded-xs bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow-raised transition-colors cursor-pointer mt-2"
                      >
                        Inspect 124 questions →
                      </button>
                    </div>

                    {/* Stacked Exam Paper Preview */}
                    <div className="relative rounded-xs border border-border bg-card p-5 shadow-hard space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-border pb-2 font-mono text-muted-foreground">
                        <span className="font-bold text-foreground">Question 2 · 12 marks</span>
                        <span>May/June 2024 · Paper 22</span>
                      </div>
                      <p className="font-serif text-sm leading-relaxed text-foreground font-medium">
                        “Evaluate whether a depreciating exchange rate will always reduce a country’s current account deficit. [12]”
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Section B evaluative essay requiring definitions of depreciation and balance of payments components, Marshall-Lerner causal chains, J-curve time lags, and substantiated judgements.
                      </p>
                      <div className="pt-3 flex items-center justify-between border-t border-border/60">
                        <span className="font-mono text-[10px] text-muted-foreground">Assessment: AO1, AO2, AO3</span>
                        <button
                          type="button"
                          onClick={() => setHowStep(2)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Step 2: Answer question</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: ANSWER (Exam Desk Answer Sheet + Photo Option) ── */}
                {howStep === 2 && (
                  <div className="grid gap-6 md:grid-cols-[1.1fr_1.3fr] items-start animate-in fade-in duration-300">
                    <div className="space-y-3 rounded-xs border border-border bg-background p-4 shadow-raised">
                      <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                        <span className="font-mono font-bold text-foreground">Paper 2 · Question 2</span>
                        <span className="font-mono text-[10px] text-muted-foreground">12 Marks</span>
                      </div>
                      <p className="font-serif text-sm leading-relaxed text-foreground">
                        “Evaluate whether a depreciating exchange rate will always reduce a country’s current account deficit. [12]”
                      </p>
                      <div className="rounded-xs border border-border/80 bg-muted/30 p-2.5 text-xs text-muted-foreground space-y-1">
                        <span className="font-mono text-[10px] uppercase font-bold text-foreground block">
                          Syllabus AO Guidance:
                        </span>
                        <p>• AO1: Knowledge of exchange rates &amp; current account (2 marks)</p>
                        <p>• AO2: Transmission chains, price elasticity of demand (6 marks)</p>
                        <p>• AO3: Critical evaluation &amp; J-curve time lags (4 marks)</p>
                      </div>

                      <div className="pt-2">
                        <Link
                          to="/grade"
                          className="w-full rounded-xs border-2 border-dashed border-border hover:border-primary p-3 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          <Camera className="size-4 text-primary" />
                          <span className="font-semibold">Photo handwriting mock (Vision OCR)</span>
                          <span className="text-[10px]">Upload a photo from your phone or notebook</span>
                        </Link>
                      </div>
                    </div>

                    {/* Candidate Answer Preview (Blue Student Ink) */}
                    <div className="rounded-xs border border-border bg-card p-5 shadow-hard space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                        <span className="font-mono text-[11px] font-bold text-foreground">Your answer</span>
                        <span className="font-mono text-[10px] text-muted-foreground">374 words · 500-750w target</span>
                      </div>

                      <div className="text-xs leading-relaxed text-blue-900 dark:text-blue-300 font-sans space-y-2 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xs border border-blue-200/50 dark:border-blue-900/40">
                        <p>
                          A depreciating exchange rate occurs when the external value of a currency falls in a floating exchange rate system. The current account measures trade in goods and services, primary income, and secondary transfers.
                        </p>
                        <p>
                          According to economic theory, depreciation lowers the foreign currency price of exports (Pₓ) and raises the domestic currency price of imports (Pₘ). Assuming the Marshall-Lerner condition holds (PEDₓ + PEDₘ &gt; 1), this switches expenditure towards domestic producers and improves the trade balance.
                        </p>
                        <p>
                          However, in the short run, contracts are fixed and price elasticity of demand is often inelastic, causing the J-curve effect where the current account initially deteriorates...
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">Status: Ready to mark</span>
                        <button
                          type="button"
                          onClick={() => setHowStep(3)}
                          className="rounded-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-semibold shadow-raised transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>Grade against 9708 mark scheme</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: MARK (Authentic Cambridge Red Ink Examiner Critique) ── */}
                {howStep === 3 && (
                  <div className="grid gap-6 md:grid-cols-[1.1fr_1.3fr] items-start animate-in fade-in duration-300">
                    <div className="space-y-3 rounded-xs border border-border bg-background p-4 shadow-raised">
                      <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                        <span className="font-mono font-bold text-foreground">Cambridge 9708 Evaluation</span>
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Dual-Pass Audited</span>
                      </div>
                      <p className="font-serif text-sm leading-relaxed text-foreground font-medium">
                        “Evaluate whether a depreciating exchange rate will always reduce a country’s current account deficit. [12]”
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <span className="font-mono text-[10px] uppercase font-bold text-foreground block">
                          Examiner Model Benchmark:
                        </span>
                        <p>• Calibrated on 30 real Cambridge ECR candidate scripts</p>
                        <p>• 89.6% exact alignment with Cambridge senior examiners</p>
                        <p>• Full AO1 (2m), AO2 (6m), AO3 (4m) clause-by-clause audit</p>
                      </div>
                    </div>

                    {/* Graded Critique Sheet with Red Examiner Mark */}
                    <div className="rounded-xs border border-border bg-card p-5 shadow-hard space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <span className="font-serif text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">
                            11 / 12
                          </span>
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground uppercase font-semibold">
                            Top Band · Grade A* Standard
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-xs">
                          92% Weighted
                        </span>
                      </div>

                      {/* Line-by-line Assessment Objectives Breakdown */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                          <div>
                            <span className="font-mono font-bold text-ao1">AO1 Knowledge &amp; Understanding</span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Precise definitions of floating depreciation &amp; current account components.
                            </p>
                          </div>
                          <span className="font-mono font-bold text-red-600 dark:text-red-400 shrink-0">2 / 2</span>
                        </div>

                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                          <div>
                            <span className="font-mono font-bold text-ao2">AO2 Causal Analysis &amp; Transmission</span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Full chain linking relative price change to Marshall-Lerner condition &amp; export demand.
                            </p>
                          </div>
                          <span className="font-mono font-bold text-red-600 dark:text-red-400 shrink-0">6 / 6</span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-ao3">AO3 Critical Evaluation &amp; Synthesis</span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Effective J-curve time lags. <em>Examiner note:</em> Add domestic export capacity constraints to secure full 12/12.
                            </p>
                          </div>
                          <span className="font-mono font-bold text-red-600 dark:text-red-400 shrink-0">3 / 4</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setHowStep(4)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Step 4: View progress &amp; weak topics</span>
                          <span>→</span>
                        </button>
                        <Link
                          to="/grade"
                          className="rounded-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1.5 text-xs font-semibold"
                        >
                          Grade your essay free
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: TRACK (Student Analytics, Projected Grade & Weak Topics) ── */}
                {howStep === 4 && (
                  <div className="grid gap-6 md:grid-cols-[1.1fr_1.3fr] items-start animate-in fade-in duration-300">
                    <div className="space-y-4 rounded-xs border border-border bg-background p-4 shadow-raised">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-mono text-xs uppercase font-bold text-foreground">
                          Candidate Performance
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">Last 30 days</span>
                      </div>

                      <div className="space-y-1">
                        <span className="font-serif text-4xl font-normal tracking-tight text-foreground">
                          88%
                        </span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          +14% on the month before · Projected Cambridge Grade A*
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                        <div className="text-center p-2 rounded-xs bg-muted/40 border border-border/60">
                          <span className="font-serif text-lg font-bold text-foreground block">48</span>
                          <span className="text-[10px] font-mono text-muted-foreground block">Essays Marked</span>
                        </div>
                        <div className="text-center p-2 rounded-xs bg-muted/40 border border-border/60">
                          <span className="font-serif text-lg font-bold text-foreground block">320</span>
                          <span className="text-[10px] font-mono text-muted-foreground block">MCQs Drilled</span>
                        </div>
                        <div className="text-center p-2 rounded-xs bg-muted/40 border border-border/60">
                          <span className="font-serif text-lg font-bold text-foreground block">14h</span>
                          <span className="text-[10px] font-mono text-muted-foreground block">Exam Time</span>
                        </div>
                      </div>

                      <Link
                        to={isAuthenticated ? "/review" : "/auth"}
                        className="w-full rounded-xs bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow-raised transition-colors cursor-pointer text-center block"
                      >
                        Open Candidate Review Radar →
                      </Link>
                    </div>

                    {/* Weak Topics Checklist (PaperGrinder progress style) */}
                    <div className="rounded-xs border border-border bg-card p-5 shadow-hard space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-mono text-xs font-bold uppercase text-foreground">
                          Topic Mastery &amp; Weak Areas
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">Cambridge 9708</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between font-medium mb-1">
                            <span>1. Basic Economic Ideas &amp; Production Possibility</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">92%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-medium mb-1">
                            <span>2. Price Elasticities (PED, PES, YED, XED)</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400">84%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: "84%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-medium mb-1">
                            <span>4. Balance of Payments &amp; Exchange Rates</span>
                            <span className="font-mono text-amber-600 dark:text-amber-400">68%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: "68%" }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Priority weak area: Revise J-curve and terms of trade formulas.
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between font-medium mb-1">
                            <span>5. Government Macro Intervention (Fiscal &amp; Monetary)</span>
                            <span className="font-mono text-red-600 dark:text-red-400">54%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: "54%" }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Priority weak area: Transmission of interest rate changes to aggregate demand.
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHowStep(1)}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <span>← Back to Step 1: Find</span>
                        </button>
                        <Link
                          to="/mcq-live"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Drill Weak Topics in MCQ →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Overview ("Free. No catch.") ────────────────────── */}
        <section id="pricing" className="border-t border-border py-16 md:py-24 scroll-mt-14">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <div className="text-center md:text-left mb-8">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Free. <mark className="hl">No catch.</mark>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything required for Cambridge International AS &amp; A Level Economics preparation is available without a subscription.
              </p>
            </div>

            {/* Single Unified Divided Card (PaperGrinder style) */}
            <div className="rounded-xs border border-border bg-card shadow-hard divide-y divide-border overflow-hidden">
              {/* Free Tier Row */}
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-bold text-foreground tracking-wider">
                    FREE TIER
                  </span>
                  <span className="font-serif text-xl font-bold text-foreground">$0 · Free forever</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>All Past Papers (1, 2, 3 &amp; 4)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Official 9708 Mark Schemes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Timed MCQ Past Paper Drills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Handwritten Photo OCR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Instant AI Essay Grading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Cambridge Definition Vault</span>
                  </div>
                </div>
              </div>

              {/* Pro Tier Row */}
              <div className="p-6 md:p-8 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase font-bold text-primary tracking-wider">
                      PRO TIER
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For intensive candidate revision, unlimited evaluations &amp; teacher cohorts.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-xl font-bold text-foreground">Unlimited</span>
                    <span className="text-[11px] font-mono text-muted-foreground block">All Insights Unlocked</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>Unlimited AI Essay Evaluations &amp; Rewrite Plans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>Line-by-line AO1, AO2, AO3 Clause Audits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>Projected Cambridge Grade Radar &amp; Weak Topics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>Multiplayer Quiz Arena &amp; Teacher Cohort Sync</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>No credit card required to start practicing.</span>
              <Link to="/pricing" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                <span>View complete plan comparison</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Syllabus Index & Paper Directory ("Pick your paper") ──────── */}
        <section id="subjects" className="border-t border-border py-16 md:py-24 scroll-mt-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="max-w-2xl mb-10">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Pick your paper or topic
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Full topical past paper coverage across Cambridge International AS &amp; A Level Economics (9708).
              </p>
            </div>

            {/* 2-Column Table of Contents with Dotted Leaders */}
            <div className="grid gap-10 md:grid-cols-2">
              {/* Column 1: AS Level */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    AS Level (Papers 1 &amp; 2)
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">Code 9708/AS</span>
                </div>

                <ul className="space-y-3">
                  {AS_TOPICS.map((topic) => (
                    <li key={topic.id}>
                      <Link
                        to="/grade"
                        search={{ topic: topic.id } as any}
                        className="group flex items-baseline justify-between gap-3 p-1.5 -mx-1.5 rounded-xs hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors shrink">
                          <span className="font-mono text-muted-foreground mr-2 font-bold">{topic.id}.</span>
                          {topic.title}
                        </span>
                        <span className="min-w-8 flex-1 border-b-2 border-dotted border-border-strong/70 dark:border-border-strong/80 mx-1" />
                        <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground font-semibold shrink-0">
                          {topic.count} questions
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: A Level / A2 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    A Level / A2 (Papers 3 &amp; 4)
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">Code 9708/A2</span>
                </div>

                <ul className="space-y-3">
                  {A2_TOPICS.map((topic) => (
                    <li key={topic.id}>
                      <Link
                        to="/grade"
                        search={{ topic: topic.id } as any}
                        className="group flex items-baseline justify-between gap-3 p-1.5 -mx-1.5 rounded-xs hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors shrink">
                          <span className="font-mono text-muted-foreground mr-2 font-bold">{topic.id}.</span>
                          {topic.title}
                        </span>
                        <span className="min-w-8 flex-1 border-b-2 border-dotted border-border-strong/70 dark:border-border-strong/80 mx-1" />
                        <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground font-semibold shrink-0">
                          {topic.count} questions
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                to={isAuthenticated ? "/grade" : "/auth"}
                className="rounded-xs bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-semibold shadow-hard inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Start practicing Cambridge 9708</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Frequently Asked Questions ────────────────────────────────── */}
        <section id="faq" className="border-t border-border py-16 md:py-20 scroll-mt-14">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-foreground text-center mb-8">
              Frequently asked questions
            </h2>

            <Accordion type="single" collapsible className="space-y-3">
              {TRIAL_FAQS.map((faq, index) => (
                <AccordionItem
                  key={faq.q}
                  value={faq.q}
                  className="rounded-xs border border-border bg-card px-4 shadow-raised"
                >
                  <AccordionTrigger className="text-left font-serif text-base hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                      <span>{faq.q}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4 pl-7">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      {/* ── Minimal Footer (PaperGrinder style) ────────────────────────── */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr] items-start pb-8 border-b border-border">
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
                <span className="flex size-6 items-center justify-center rounded-xs bg-primary text-primary-foreground font-mono text-xs font-black">
                  M
                </span>
                <span>marginal</span>
              </Link>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Cambridge International AS &amp; A Level Economics (9708) past-paper practice, AI essay marking, and syllabus mastery platform.
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Founded &amp; created by Saikrish, alongside Suthir (Co-founder and Design Head) and Athithya.
              </p>
            </div>

            <div>
              <span className="font-mono text-xs uppercase font-bold text-foreground tracking-wider block mb-3">
                Practice
              </span>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link to="/grade" className="hover:text-foreground transition-colors">
                    Essay Examiner (Papers 2 &amp; 4)
                  </Link>
                </li>
                <li>
                  <Link to="/mcq-live" className="hover:text-foreground transition-colors">
                    MCQ Past Papers (Papers 1 &amp; 3)
                  </Link>
                </li>
                <li>
                  <Link to="/quiz" className="hover:text-foreground transition-colors">
                    Multiplayer Quiz Arena (6-Digit PIN)
                  </Link>
                </li>
                <li>
                  <Link to="/definitions" className="hover:text-foreground transition-colors">
                    Cambridge Definition Hub
                  </Link>
                </li>
                <li>
                  <Link to="/diagrams" className="hover:text-foreground transition-colors">
                    Economics Diagram Studio
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-mono text-xs uppercase font-bold text-foreground tracking-wider block mb-3">
                About &amp; Access
              </span>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link to="/about" className="hover:text-foreground transition-colors">
                    About Marginal &amp; Team
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-foreground transition-colors">
                    Pricing &amp; Free Access
                  </Link>
                </li>
                <li>
                  <Link to="/teachers" className="hover:text-foreground transition-colors">
                    For Teachers &amp; Schools
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <p>© {new Date().getFullYear()} Marginal AI. Not affiliated with Cambridge Assessment International Education.</p>
              <button
                type="button"
                onClick={onToggleDefault}
                className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted shadow-raised cursor-pointer"
              >
                <RotateCcw className="size-3 text-primary" />
                <span>Return to Default View</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="size-3" />
                <span>Share with classmates</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Share Modal ───────────────────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md border border-border p-6 rounded-xs shadow-hard">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-serif text-xl font-bold">Share Marginal</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Invite your classmates to practice Cambridge 9708 past papers and essay grading.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Share link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-xs border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-foreground focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 shrink-0 rounded-xs border font-semibold cursor-pointer"
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                onClick={handleCopyMessage}
                variant="outline"
                className="w-full text-xs font-semibold rounded-xs border cursor-pointer"
              >
                {copiedMessage ? "Copied study group message!" : "Copy study group chat message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
