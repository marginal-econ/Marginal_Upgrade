import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn, copyTextToClipboard } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  LineChart,
  ListChecks,
  Mail,
  MessageCircle,
  PenLine,
  Scan,
  School,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Wand2,
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
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { CommunityPartnerBanner } from "@/components/marketing/community-partner-banner";
import { captureReferralCode } from "@/lib/waitlist-client";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal | Cambridge AS & A Level Economics (9708) Past Papers & AI Examiner" },
      {
        name: "description",
        content:
          "Everything for Cambridge International AS & A Level Economics (9708). Search any past paper question, grade essays against real mark schemes across AO1, AO2, and AO3, and drill timed MCQs for Papers 1, 2, 3 & 4. Free, no account needed to explore.",
      },
      {
        name: "keywords",
        content:
          "9708 economics, Cambridge Economics 9708, Marginal AI, AS Level Economics, A Level Economics 9708 prep, parginal, marginal-econ, papergrinder economics, Cambridge topical past papers",
      },
      {
        property: "og:site_name",
        content: "Marginal",
      },
      {
        property: "og:title",
        content: "Marginal | Everything for Cambridge Economics (9708) Past-Paper Practice",
      },
      {
        property: "og:description",
        content:
          "Master Cambridge AS & A Level Economics (9708) with instant AI essay grading, line-by-line mark scheme breakdown, and timed MCQ drills for Papers 1, 2, 3 & 4.",
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
        content: "Marginal | Everything for Cambridge Economics (9708) Past-Paper Practice",
      },
      {
        name: "twitter:description",
        content:
          "Master Cambridge AS & A Level Economics (9708) with instant AI essay grading, line-by-line mark scheme breakdown, and timed MCQ drills for Papers 1, 2, 3 & 4.",
      },
      {
        name: "application-name",
        content: "Marginal",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://marginal-econ.com/",
      },
    ],
  }),
  component: IndexPage,
});

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

const FAQS = [
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

function IndexPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
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

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.success && body.settings) setSettings(body.settings);
      })
      .catch(() => {});
  }, []);

  useEffect(() => setInvitedBy(captureReferralCode()), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

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
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="size-8" />

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
              {FAQS.map((faq, index) => (
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
            <p>© {new Date().getFullYear()} Marginal AI. Not affiliated with Cambridge Assessment International Education.</p>
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
