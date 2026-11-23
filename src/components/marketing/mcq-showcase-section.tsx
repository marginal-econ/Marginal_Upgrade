import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Gamepad2,
  HelpCircle,
  Layers,
  Sparkles,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

const SAMPLE_QUESTION = {
  paper: "Cambridge 9708 / Paper 1 · AS Economics",
  topic: "Government Microeconomic Intervention · Tax Incidence",
  question:
    "A government introduces a specific indirect tax on a good where demand is price-inelastic and supply is price-elastic. What is the incidence of the tax?",
  options: [
    {
      label: "A",
      text: "The consumer and producer bear the tax incidence equally.",
      isCorrect: false,
      flaw: "Incorrect: Equal tax burden only occurs when the price elasticities of demand and supply are identical (|PED| = |PES|).",
    },
    {
      label: "B",
      text: "The consumer bears the greater share of the tax incidence.",
      isCorrect: true,
      flaw: "Correct: Inelastic demand means consumers are relatively insensitive to price changes with few substitutes, enabling producers to pass on most of the tax as higher prices.",
    },
    {
      label: "C",
      text: "The producer bears the entire tax burden because they remit the payment.",
      isCorrect: false,
      flaw: "Incorrect: Confuses the statutory incidence (who pays the tax authority) with economic incidence (who bears the real burden).",
    },
    {
      label: "D",
      text: "The government bears the tax burden through administrative deadweight loss.",
      isCorrect: false,
      flaw: "Incorrect: Deadweight loss represents lost consumer and producer surplus, not government tax absorption.",
    },
  ],
};

export function McqShowcaseSection() {
  const [selectedOption, setSelectedOption] = useState<string>("B");
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  return (
    <section
      id="mcqs"
      className="relative scroll-mt-20 border-b-[1.5px] border-ink bg-card/40 px-4 py-16 sm:px-6 md:px-10 lg:px-12 xl:px-16 lg:py-24 overflow-hidden"
    >
      <CosmicAtmosphere variant="purple" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px]">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-3 shadow-2xs">
              <Gamepad2 className="size-3.5 text-amber-500" />
              <span>Cambridge 9708 MCQ Past Paper &amp; Live Arena Suite</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Master Cambridge Paper 1 &amp; Paper 3 MCQs
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Over 1,200 past paper questions categorized by syllabus chapter. Instant line-by-line Cambridge distractor logic, auto-save resume, and live multiplayer races with PINs.
            </p>
          </Reveal>
        </div>

        {/* Quick Highlights Row */}
        <Reveal delay={60}>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-foreground block">1,200+</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Past Paper Questions</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-foreground block">Papers 1 &amp; 3</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Both AS &amp; A Level</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-amber-500 block">6-Digit PIN</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Multiplayer Quiz Arena</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-emerald-500 block">Auto-Save</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">12-Hour Exam Resume</span>
            </div>
          </div>
        </Reveal>

        {/* Two-Column Feature & Interactive Specimen */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 3 Core Pillars */}
          <div className="lg:col-span-5 space-y-4">
            <Reveal delay={80}>
              <div className="rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-6 backdrop-blur-sm hover:border-amber-500/40 transition-colors shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 shrink-0 text-amber-600 dark:text-amber-400">
                    <Gamepad2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Multiplayer Live Arena &amp; Exam Sprints
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Race past papers live with classmates using a 6-digit room PIN. Choose between a silent, timed exam sprint or the gamified Arena with power-ups (Pigouvian Tax, Steals, 50/50 &amp; Policy Shock Freezes).
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs font-bold border-amber-500/40 text-foreground bg-amber-500/10 hover:bg-amber-500/20">
                        <Link to="/quiz">Join with PIN →</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground">
                        <Link to="/mcq-live">Host a Quiz</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-6 backdrop-blur-sm hover:border-primary/40 transition-colors shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 shrink-0 text-primary">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Cambridge Distractor &amp; Trap Breakdown
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Other platforms only tell you if you got it right or wrong. Marginal reveals the examiner logic behind why option A is a common trap, why C is false, and why B matches the mark scheme.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-6 backdrop-blur-sm hover:border-emerald-500/40 transition-colors shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Topical Mastery &amp; Chapter Drills
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Filter questions by Cambridge 9708 syllabus units: Basic Economic Ideas, The Price System, Government Micro Intervention, Macroeconomic Policies, and International Trade.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Specimen MCQ Card */}
          <div className="lg:col-span-7">
            <Reveal delay={100} variant="pop">
              <div className="rounded-2xl border-2 border-border/90 bg-card p-5 sm:p-7 shadow-xl backdrop-blur-md relative overflow-hidden">
                {/* Header of the mock paper */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                      {SAMPLE_QUESTION.paper}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                      {SAMPLE_QUESTION.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <Clock className="size-3" />
                    <span>Auto-Saved · Question 14 / 30</span>
                  </div>
                </div>

                {/* Question Stem */}
                <h4 className="text-sm sm:text-base font-bold text-foreground leading-relaxed mb-4">
                  {SAMPLE_QUESTION.question}
                </h4>

                {/* Option List */}
                <div className="space-y-2.5">
                  {SAMPLE_QUESTION.options.map((opt) => {
                    const isSelected = selectedOption === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setSelectedOption(opt.label);
                          setShowExplanation(true);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer",
                          opt.isCorrect && isSelected
                            ? "border-emerald-500/60 bg-emerald-500/10 text-foreground font-medium shadow-2xs"
                            : isSelected && !opt.isCorrect
                              ? "border-destructive/60 bg-destructive/10 text-foreground"
                              : "border-border/70 bg-card/60 hover:bg-muted/50 text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                            opt.isCorrect && isSelected
                              ? "bg-emerald-500 text-white"
                              : isSelected && !opt.isCorrect
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {opt.label}
                        </span>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p>{opt.text}</p>
                        </div>
                        {opt.isCorrect && isSelected && (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {showExplanation && (
                  <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4 text-xs sm:text-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                      <Sparkles className="size-3.5" />
                      <span>Cambridge Examiner Reasoning</span>
                    </div>
                    <p className="text-foreground leading-relaxed text-xs sm:text-[13px]">
                      {SAMPLE_QUESTION.options.find((o) => o.label === selectedOption)?.flaw}
                    </p>
                  </div>
                )}

                {/* Live Arena Callout Pill inside card */}
                <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                    </span>
                    <span className="font-semibold text-foreground">Live Room PIN: 482 915</span>
                    <span>·</span>
                    <span>18 Students Racing</span>
                  </div>
                  <Button asChild size="sm" className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link to="/mcq-live">
                      <span>Practice Full Paper</span>
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
