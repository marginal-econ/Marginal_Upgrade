import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Gift,
  LineChart,
  ListChecks,
  Mail,
  PenLine,
  Scan,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

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
import { CommandWordDrill, LiveMarkDemo } from "@/components/marketing/interactive";
import { ExaminerStage, LiveExaminer } from "@/components/marketing/live-examiner";
import { MarkingHand } from "@/components/marketing/mascot";
import { CountUp, Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { SiteNavLinks, SiteNavMobile } from "@/components/marketing/site-nav";
import { Magnetic, TiltCard } from "@/components/marketing/three-d";
import { PricingSection } from "@/components/marketing/pricing-section";
import { captureReferralCode } from "@/lib/waitlist-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal — Cambridge AS & A Level Economics (9708) Marking & Live Examiner" },
      {
        name: "description",
        content:
          "Marginal marks AS and A Level Economics (9708) essays with AO1/AO2/AO3 breakdowns, grounded in official syllabus and mark schemes. Start free with 2 graded essays.",
      },
      {
        property: "og:title",
        content: "Marginal — Cambridge AS & A Level Economics (9708) Marking & Live Examiner",
      },
      {
        property: "og:description",
        content:
          "Examiner-standard marks, assessment-objective breakdowns and rewrite plans for Cambridge 9708 Economics.",
      },
    ],
  }),
  component: Index,
});

const RIBBON_ITEMS = [
  "AO1 Knowledge",
  "AO2 Analysis",
  "AO3 Evaluation",
  "Paper 1 & 3 MCQs",
  "Paper 2 & 4 Essays",
  "Live Examiner",
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
    tile: "bg-primary",
    badge: "Real-Time AI",
    title: "Live Examiner",
    lead: "Instant calibration sentence by sentence",
    body: "Running Cambridge marks out of 8, 12, or 20, real-time AO1/AO2/AO3 progress meters, economics terminology checks, and dynamic examiner next-move coaching while you write.",
    href: "/live-examiner",
  },
  {
    icon: PenLine,
    tile: "bg-ao2",
    badge: "Full Audit",
    title: "Dual-Pass Essay Lab",
    lead: "Independent two-pass Cambridge 9708 grading",
    body: "Grounded in official 9708 mark schemes and coursebooks. Two independent evaluation passes correct AI central-tendency bias, providing line-by-line mark scheme matching and rewrite plans.",
    href: "/practice",
  },
  {
    icon: ListChecks,
    tile: "bg-ao1",
    badge: "Exam Simulation",
    title: "MCQ Live Simulation",
    lead: "Authentic timed Paper 1 & Paper 3 exams",
    body: "Real Cambridge past papers with official mark schemes. Features question flagging for review, interactive jump matrix, domain accuracy breakdown, and on-demand AI explanations.",
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
    icon: Target,
    tile: "bg-primary",
    badge: "Exam Technique",
    title: "Command Words Explorer",
    lead: "Assess, Evaluate, Explain — exact AO rubrics",
    body: "Master what Cambridge examiners demand for every command word. Learn the exact analytical and evaluative weights to structure high-band answers without wasted prose.",
    href: "/command-words",
  },
  {
    icon: LineChart,
    tile: "bg-ao2",
    badge: "Visual Studio",
    title: "Economics Diagram Studio",
    lead: "Every 9708 diagram with dynamic curve shifts",
    body: "Interactive micro and macro diagrams with real-time shifts, equilibrium price/quantity tracking, and examiner labelling standards for tariffs, externalities, and market structures.",
    href: "/diagrams",
  },
  {
    icon: Scan,
    tile: "bg-ao1",
    badge: "Vision AI",
    title: "Handwriting Vision OCR",
    lead: "Upload photos of handwritten mock exams",
    body: "Specialized vision engine lifts student handwriting off paper, detects hand-drawn diagrams, verifies economic terminology, and sends it directly for examiner grading.",
    href: "/practice",
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <CustomCursor />
      <ScrollProgress />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3 md:px-8">
          <Link to="/">
            <Wordmark />
          </Link>

          <SiteNavLinks />

          <div className="flex items-center gap-2">
            <SiteNavMobile />
            <Link
              to="/auth"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
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
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-14">
        {/* Three background layers, back to front: the CSS aurora wash (which
            is also the fallback), the WebGL curtain, and the star-field that
            only appears at night. All pointer-transparent. */}
        <div className="aurora-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <AuroraCanvas />
        <div className="starfield" aria-hidden="true" />
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

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-5 sm:py-14 md:px-8 md:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-soft">
                  <Sparkles className="size-3.5 text-primary" />
                  Cambridge 9708 Examiner Calibration
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  May/June 2026 Aligned
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-5 text-[2.25rem] leading-[1.06] font-bold text-balance min-[380px]:text-4xl md:text-[3.25rem] tracking-tight">
                {settings.heroTitle}{" "}
                <span className="highlight highlight-deep shadow-xs">{settings.heroHighlight}</span>
              </h1>
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
              <p className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg dark:text-foreground/90">
                {settings.heroDescription}
              </p>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-pretty text-muted-foreground md:text-base dark:text-foreground/80">
                {settings.heroNotice}
              </p>
            </Reveal>

            {/* Direct candidate conversion actions */}
            <Reveal delay={210}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-6 text-sm font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link to="/auth">
                    Get Started Free (2 Free Essays) <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 px-5 text-sm font-semibold border-2 hover:bg-muted"
                >
                  <Link to="/exemplar">
                    Real Graded Essay (10/12) <ExternalLink className="size-3.5 ml-1.5 text-primary" />
                  </Link>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                No credit card required &bull; 2 full essays graded free &bull; 30-day MCQ access
              </p>
            </Reveal>

            {invitedBy ? (
              <Reveal delay={240}>
                <p className="mt-3.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Gift className="size-3.5 text-primary" aria-hidden="true" />
                  Invited with code <span className="font-semibold text-foreground">{invitedBy.toLowerCase()}</span> — 2 free essays ready.
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={260}>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground dark:text-foreground/70">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60">
                  <ShieldCheck className="size-3.5 text-emerald-500" /> Grounded in 9708 mark schemes
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60">
                  <Target className="size-3.5 text-primary" /> Papers 1, 2, 3 &amp; 4
                </span>
                <a href="#try" className="nav-link font-semibold text-primary inline-flex items-center gap-1 ml-1">
                  Try live editor below ↓
                </a>
              </div>
            </Reveal>
          </div>

          {/* Compact, Non-Overflowing Live Examiner Showcase Card */}
          <Reveal variant="pop" delay={120} className="relative">
            <ExaminerStage className="relative mx-auto w-full max-w-lg min-w-0">
              <LiveExaminer />
            </ExaminerStage>
          </Reveal>
        </div>

        <Ribbon
          items={RIBBON_ITEMS}
          className="right-12 bottom-10 left-12 -rotate-[1deg] md:right-24 md:left-24"
        />
      </section>

      {/* ── Live marking demo ────────────────────────────────────────────── */}
      <section
        id="try"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20"
      >
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Interactive Live Examiner Studio"
              title={
                <>
                  Test the examiner <span className="aurora-text">live in real-time</span>
                </>
              }
              lead="Type or paste your own economics essay into the editor, or test Level 1, 2, and 3 exemplars. The Live Examiner evaluates your writing in real time — detecting Cambridge 9708 terms, scoring AO1/AO2/AO3 breakdowns, and delivering strategic examiner next-move guidance."
            />
          </Reveal>

          <Reveal variant="pop" delay={90} className="mt-12 scroll-rise">
            <LiveMarkDemo />
          </Reveal>
        </div>
      </section>

      {/* ── What you get back ────────────────────────────────────────────── */}
      <section id="result" className="relative border-b-[1.5px] border-ink scroll-mt-20">
        <Drift speed={-0.08} className="top-24 right-[3%] hidden xl:block">
          <CircleScribble className="w-24 text-primary/35" />
        </Drift>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-2">
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
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20"
      >
        <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
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
                  to={tool.href}
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
                      <span>Explore engine</span>
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
      <section id="how" className="relative border-b-[1.5px] border-ink scroll-mt-20">
        <Drift speed={-0.09} className="top-16 right-[5%] hidden lg:block">
          <Waves className="w-24 text-primary/40" />
        </Drift>
        <Drift speed={0.07} className="bottom-20 left-[4%] hidden xl:block">
          <Curl className="w-20 -scale-x-100 text-ao1/40" />
        </Drift>
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Three steps, about four minutes"
              lead="No setup, no onboarding tour. On day one you'll bring one essay you're unsure about."
            />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <ol className="pop mt-12 divide-y-[1.5px] divide-ink/12 overflow-hidden">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="group flex flex-col gap-4 p-6 transition-colors duration-200 hover:bg-accent/40 md:flex-row md:gap-8 md:p-8"
                >
                  <span className="pop-sm flex size-10 shrink-0 items-center justify-center bg-primary font-mono text-sm font-semibold text-primary-foreground transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
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
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20"
      >
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
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
      <section id="trust" className="border-b-[1.5px] border-ink scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
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
                  <div className="pop flex h-full flex-col p-6">
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

          <Reveal delay={120}>
            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-pretty text-muted-foreground">
              It still isn't a Cambridge examiner. Treat the mark as a second opinion that shows its
              reasoning — then argue with it. That argument is where most of the learning happens.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Frequently asked, honestly answered" />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <Accordion type="single" collapsible className="pop mt-12 px-6 md:px-8">
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
        className="relative scroll-mt-20 px-4 py-14 sm:px-5 sm:py-16 md:px-8 md:py-20"
      >
        <div className="aurora-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <Reveal variant="pop" className="relative">
          <div className="pop relative mx-auto max-w-5xl overflow-hidden bg-plum bg-linear-to-br from-plum-soft via-plum to-plum-deep px-4 py-10 sm:px-6 sm:py-14 md:px-12">
            <div
              className="paper-grid pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div className="starfield" aria-hidden="true" />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div className="text-center md:text-left">
                <span className="chip-soft bg-plum-foreground/15 text-plum-foreground">
                  <Sparkles className="size-3.5" />
                  Cambridge 9708 Candidate Workspace
                </span>

                <h2 className="mt-4 text-3xl font-bold text-balance text-plum-foreground md:text-4xl">
                  Start scoring higher in AS & A Level Economics
                </h2>
                <p className="mt-4 max-w-md text-sm text-pretty text-plum-foreground/85 md:text-base">
                  Every candidate gets 2 full essay gradings and 30 days of MCQ past papers completely free. Instant access with line-by-line mark scheme matching.
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
                    <Link to="/pricing">View Revision Plans</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="h-11 px-4 text-xs sm:text-sm font-semibold text-plum-foreground/80 hover:text-plum-foreground hover:bg-white/10"
                  >
                    <Link to="/exemplar">View 10/12 Exemplar</Link>
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
    <div className="relative">
      <span className="sticker layer-2 absolute -top-3 -right-2 z-10 bg-ao3 text-foreground md:-right-4">
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
                <Link to="/exemplar" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View Full 10/12 Script Exemplar →
                </Link>
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
                “This is a very good essay! You clearly understand minimum prices and explain how they reduce demand for demerit goods like cigarettes. You also mentioned other policies. Mark: 7 / 12 (Grade B). Keep practicing!”
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
    <span className="group flex items-center gap-2 sm:gap-2.5">
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
