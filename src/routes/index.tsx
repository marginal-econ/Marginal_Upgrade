import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Gift,
  LineChart,
  ListChecks,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

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
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { captureReferralCode } from "@/lib/waitlist-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginal — AS and A Level Economics (9708) essay marking waitlist" },
      {
        name: "description",
        content:
          "Marginal marks AS and A Level Economics (9708) essays with AO1/AO2/AO3 breakdowns, grounded in your own coursebook, syllabus and mark schemes. An independent AI tool, not connected to Cambridge. Join the waitlist for the first cohort.",
      },
      {
        property: "og:title",
        content: "Marginal — AS and A Level Economics (9708) essay marking waitlist",
      },
      {
        property: "og:description",
        content:
          "Examiner-standard marks, assessment-objective breakdowns and rewrite plans for AS and A Level Economics (9708). Waitlist open now.",
      },
    ],
  }),
  component: Index,
});

const RIBBON_ITEMS = [
  "AO1 Knowledge",
  "AO2 Analysis",
  "AO3 Evaluation",
  "Paper 1",
  "Paper 2",
  "Paper 3",
  "Paper 4",
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

// What's actually inside, in the words a student would use. Each tile takes
// one of the reserved hues — no new colours invented for decoration. `back`
// is the detail on the reverse of the flip card, so the front can stay a
// single scannable line.
const TOOLS = [
  {
    icon: PenLine,
    tile: "bg-primary",
    title: "Essay marking",
    lead: "A real mark, split by objective",
    body: "A mark out of the real total, split by assessment objective, with the mark-scheme points you hit and the ones you didn't.",
  },
  {
    icon: ListChecks,
    tile: "bg-ao1",
    title: "Question bank & MCQs",
    lead: "Past papers, by topic and level",
    body: "Real past-paper questions by topic and level, plus multiple-choice papers you can sit against a timer.",
  },
  {
    icon: Target,
    tile: "bg-ao3",
    title: "AO skills coach",
    lead: "Drills on the one thing costing you marks",
    body: "Short drills on the one thing costing you marks — chains of analysis, evaluation that actually judges, precise definitions.",
  },
  {
    icon: LineChart,
    tile: "bg-ao2",
    title: "Diagram library",
    lead: "Every 9708 diagram, drawn properly",
    body: "Every diagram on the 9708 syllabus, drawn properly, with the labelling examiners look for.",
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
              <a
                href="#waitlist-primary"
                aria-label={settings.cta}
                className="pop-sm pop-press shine inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:px-3.5 sm:text-sm"
              >
                <span className="min-[380px]:hidden">Join</span>
                <span className="hidden min-[380px]:inline">{settings.cta}</span>
              </a>
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

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-5 sm:py-14 md:px-8 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-soft">
                  <Sparkles className="size-3.5" />
                  AS and A Level Economics (9708)
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-5 text-[2.15rem] leading-[1.08] font-bold text-balance min-[380px]:text-4xl md:text-[3.4rem]">
                {settings.heroTitle}{" "}
                <span className="highlight highlight-deep">{settings.heroHighlight}</span>
              </h1>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg dark:text-foreground/90">
                {settings.heroDescription}
              </p>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg dark:text-foreground/90">
                {settings.heroNotice}
              </p>
            </Reveal>

            {/* The form itself, above the fold. No modal, no second page: the
                only thing being asked for is an email, and asking for it
                behind a click loses the people who would have given it. */}
            <Reveal delay={210}>
              <div id="waitlist-primary" className="mt-8 max-w-lg scroll-mt-24">
                <WaitlistForm
                  variant="hero"
                  cta={settings.cta}
                  settings={settings}
                  settingsLoaded={settingsLoaded}
                />
              </div>
            </Reveal>

            {invitedBy ? (
              <Reveal delay={240}>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Gift className="size-4 text-primary" aria-hidden="true" />A friend invited you
                  with code{" "}
                  <span className="font-mono font-semibold text-foreground">{invitedBy}</span> —
                  they move up when you join.
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={260}>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground dark:text-foreground/70">
                <a href="#try" className="nav-link font-medium">
                  Or watch it mark one first
                </a>
                <span>Built for AS and A Level Economics (9708) — nothing else.</span>
              </div>
            </Reveal>
          </div>

          {/* The product, marking, on its own 3D stage: the panel leans toward
              the pointer and the two stickers ride in front of it on separate
              Z planes, so the group reads as depth rather than as one flat
              picture. It loops forever — the claim on the left demonstrated
              rather than described. */}
          <Reveal variant="pop" delay={120} className="relative">
            <ExaminerStage className="relative mx-auto w-full max-w-md min-w-0">
              <LiveExaminer />
              <span className="sticker layer-3 absolute -top-3 left-1 z-10 bg-ao3 text-foreground md:-left-6">
                Nice evaluation
              </span>
              <span className="sticker layer-3 absolute right-1 bottom-24 z-10 rotate-6 bg-surface text-foreground md:-right-6">
                AO3 · 5/6
              </span>
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
              eyebrow="Watch it work"
              title={
                <>
                  Every clause lands in <span className="aurora-text">an objective</span>
                </>
              }
              lead="This is a real Paper 2 answer being typed. The highlight underneath each clause is the assessment objective it just earned — and the marks climb as it goes. Nothing here is a mock-up; it's the marking engine, running."
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
              title="Four tools, one syllabus"
              lead="Everything here exists because a 9708 student needed it. Nothing here is a generic study widget. Hover or tap a card to turn it over."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {TOOLS.map((tool, index) => (
              <Reveal key={tool.title} variant="pop" delay={index * 70}>
                {/* Front and back are the same card turned over. The shell is
                    focusable so the reverse is reachable from the keyboard,
                    not just from a hover. */}
                <button
                  type="button"
                  className="scene flip-shell block h-full w-full text-left"
                  aria-label={`${tool.title}. ${tool.lead}. ${tool.body}`}
                >
                  <div aria-hidden="true" className="flip relative h-full min-h-[13.5rem]">
                    <div className="flip-face pop pop-press flex h-full flex-col p-6">
                      <span
                        className={`pop-sm flex size-11 items-center justify-center text-background transition-transform duration-300 ${tool.tile}`}
                      >
                        <tool.icon className="size-5" />
                      </span>
                      <h3 className="mt-5 text-lg font-semibold">{tool.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {tool.lead}
                      </p>
                      <span className="mt-auto pt-4 font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")} / 04
                      </span>
                    </div>

                    <div
                      className={`flip-face flip-back pop flex h-full flex-col justify-center p-6 ${tool.tile}`}
                    >
                      <h3 className="text-lg font-semibold text-background">{tool.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-background/90">{tool.body}</p>
                    </div>
                  </div>
                </button>
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

      {/* ── Join ─────────────────────────────────────────────────────────── */}
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
                  <Mail className="size-3.5" />
                  One email. When it opens.
                </span>

                <h2 className="mt-4 text-3xl font-bold text-balance text-plum-foreground md:text-4xl">
                  {settings.joinTitle}
                </h2>
                <p className="mt-4 max-w-md text-sm text-pretty text-plum-foreground/85 md:text-base">
                  {settings.joinDescription}
                </p>

                <div className="mt-7 max-w-lg text-left">
                  <WaitlistForm
                    variant="wide"
                    cta={settings.cta}
                    settings={settings}
                    settingsLoaded={settingsLoaded}
                  />
                </div>

                {/* Said where the decision is made, not buried in the footer. */}
                <p className="mt-4 text-xs text-plum-foreground/70">
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
  return (
    <div className="relative">
      <span className="sticker layer-2 absolute -top-3 -right-2 z-10 bg-ao3 text-foreground md:-right-4">
        Example
      </span>

      <div className="pop p-6 md:p-7">
        <p className="eyebrow">Paper 2 · Question 4(b)</p>
        <p className="mt-2.5 text-sm leading-relaxed font-medium">
          “Assess whether a minimum price is the most effective way to reduce consumption of a
          demerit good.”
        </p>

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
          <p className="eyebrow">What's missing</p>
          <ul className="mt-2.5 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ao3" aria-hidden="true" />
              <span>
                No judgement on <em>which</em> policy is most effective — only a list.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ao2" aria-hidden="true" />
              <span>Chain of analysis stops at “demand falls”; no effect on the shortage.</span>
            </li>
          </ul>
        </div>
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
