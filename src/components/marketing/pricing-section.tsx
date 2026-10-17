import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  GraduationCap,
  HelpCircle,
  School,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlatformPricing } from "@/lib/pricing.functions";
import { DEFAULT_PRICING_PLANS, FREE_STARTER_TIER } from "@/lib/pricing-plans";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

type Audience = "students" | "schools";
type BillingCycle = "monthly" | "annual";

interface StudentTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualEquivalentMonthly: number;
  savePct: number;
  quota: string;
  badge?: string;
  popular?: boolean;
  features: string[];
}

interface SchoolTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: string;
  annualPrice: string;
  studentCapacity: string;
  effectiveCostPerStudent: string;
  teacherSeats: string;
  quota: string;
  badge?: string;
  popular?: boolean;
  features: string[];
}

const STUDENT_TIERS: StudentTier[] = [
  {
    id: "foundation",
    name: "Foundation Scholar",
    tagline: "Accessible entry point: less than a coffee, zero friction.",
    monthlyPrice: 149,
    annualPrice: 1199,
    annualEquivalentMonthly: 99,
    savePct: 33,
    quota: "5 Graded Essays / mo · 12 Live Examiner Sessions",
    badge: "Most Accessible",
    features: [
      "5 Cambridge Graded Essays / month",
      "12 Live Examiner Sessions / month (30m AI coaching per session)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers",
    ],
  },
  {
    id: "pro",
    name: "Pro Accelerator",
    tagline: "The benchmark for serious Cambridge candidates studying year-round.",
    monthlyPrice: 399,
    annualPrice: 3599,
    annualEquivalentMonthly: 299,
    savePct: 25,
    quota: "15 Graded Essays / mo · 30 Live Examiner Sessions",
    badge: "Most Popular",
    popular: true,
    features: [
      "15 Cambridge Graded Essays / month",
      "30 Live Examiner Sessions / month (45m official exam timing AI coaching)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Sub-second Cambridge AO Sentence Diagnostics & Causal Chains",
      "Perfect Essay Generator (AI Model Answers)",
      "Dual-Model Principal Examiner Arbitration",
      "Real-time Diagram Integration Suggestions",
      "All Foundation features included",
    ],
  },
  {
    id: "mastery",
    name: "A* Mastery Sprint",
    tagline: "Peak revision powerhouse for Oct/Nov & May/June exam series.",
    monthlyPrice: 599,
    annualPrice: 5999,
    annualEquivalentMonthly: 499,
    savePct: 17,
    quota: "35 Graded Essays / mo · 60 Live Examiner Sessions",
    badge: "A* Target Cohort",
    features: [
      "Multi-Paper Diagnostic Feedback & Evaluative Refinements",
      "35 Cambridge Graded Essays / month",
      "60 Live Examiner Sessions / month (60m extended AI coaching, priority queue)",
      "Unlimited Instant In-Browser Grammar & Mechanics Checks",
      "Handwritten Essay OCR Scanning (Photo Uploads)",
      "Holistic Review Panel & Syllabus Weakness Heatmap",
      "Level 4 & 5 Evaluative Refinement Engine",
      "All Pro features included",
    ],
  },
  {
    id: "elite",
    name: "Cambridge Elite Pass",
    tagline: "VIP all-inclusive pass for complete syllabus and exam dominance.",
    monthlyPrice: 999,
    annualPrice: 9599,
    annualEquivalentMonthly: 799,
    savePct: 20,
    quota: "75 Graded Essays / mo · 120 Live Examiner Sessions",
    badge: "VIP All-Access Pass",
    features: [
      "Comprehensive Cambridge Mock Suite (Papers 1, 2, 3 & 4 Coverage)",
      "75 Cambridge Graded Essays / month & Reworks",
      "120 Live Examiner Sessions / month (90m sprint revision AI coaching per session)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Dedicated High-Speed Flash Acceleration Queue",
      "Bespoke Past Paper Mock Series Generation",
      "Personalized Examiner Video & Audio Commentary",
      "Direct 1-on-1 examiner support channel",
      "All Mastery features included",
    ],
  },
];

const SCHOOL_TIERS: SchoolTier[] = [
  {
    id: "school-starter",
    name: "Department Starter",
    tagline: "For boutique classes and small Economics cohorts.",
    monthlyPrice: "₹4,999",
    annualPrice: "₹49,999",
    studentCapacity: "Up to 50 Students",
    effectiveCostPerStudent: "~₹83 / student / mo",
    teacherSeats: "2 Teacher Admin Seats",
    quota: "15 essays / student / mo",
    badge: "Small Cohorts",
    features: [
      "Up to 50 active student seats",
      "2 Teacher Admin accounts with full dashboard",
      "Interactive Cambridge classroom cohort manager",
      "Cambridge AO distribution & mark breakdowns",
      "Gradebook CSV & spreadsheet exports",
    ],
  },
  {
    id: "school-campus",
    name: "Campus Standard",
    tagline: "Ideal for Cambridge international schools and exam centers.",
    monthlyPrice: "₹11,999",
    annualPrice: "₹1,19,999",
    studentCapacity: "Up to 150 Students",
    effectiveCostPerStudent: "~₹66 / student / mo",
    teacherSeats: "5 Teacher Admin Seats",
    quota: "25 essays / student / mo",
    badge: "Recommended for Schools",
    popular: true,
    features: [
      "Up to 150 active student seats",
      "5 Teacher Admin seats with section management",
      "Section-wise cohort comparison matrix",
      "Custom mock paper grading & feedback",
      "Syllabus weakness tracking across classes",
      "All Starter features included",
    ],
  },
  {
    id: "school-institution",
    name: "Institution Premium",
    tagline: "Comprehensive capacity for large high schools and prep academies.",
    monthlyPrice: "₹24,999",
    annualPrice: "₹2,49,999",
    studentCapacity: "Up to 400 Students",
    effectiveCostPerStudent: "~₹52 / student / mo",
    teacherSeats: "15 Teacher Admin Seats",
    quota: "40 essays / student / mo",
    badge: "Large Departments",
    features: [
      "Up to 400 active student seats",
      "15 Teacher Admin seats with custom permissions",
      "School mark scheme & curriculum RAG ingestion",
      "Full syllabus topic mastery analytics",
      "Examiner arbitration on disputed marks",
      "Priority SLA and dedicated support line",
    ],
  },
  {
    id: "school-enterprise",
    name: "Multi-Campus Enterprise",
    tagline: "Custom solution for school networks, trusts, and franchises.",
    monthlyPrice: "₹49,999+",
    annualPrice: "Custom Contract",
    studentCapacity: "1,000+ Students",
    effectiveCostPerStudent: "< ₹45 / student / mo",
    teacherSeats: "Unlimited Teacher Seats",
    quota: "Unlimited cohort volume",
    badge: "Multi-Campus",
    features: [
      "1,000+ student capacity across campuses",
      "Unlimited teacher and administrative seats",
      "Custom school branding & LMS/ERP integration",
      "Dedicated Cambridge Academic Account Manager",
      "Onsite or remote faculty training workshops",
      "Custom mark scheme and mock calibration",
    ],
  },
];

export function PricingSection({ className }: { className?: string }) {
  const [audience, setAudience] = useState<Audience>("students");
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  const fetchPlatformPricing = useServerFn(getPlatformPricing);
  const pricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => fetchPlatformPricing(),
    staleTime: 30_000,
  });

  const activePlans = pricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  const dynamicStudentTiers: StudentTier[] = [
    {
      id: "foundation",
      name: activePlans.foundation.name,
      tagline: activePlans.foundation.tagline,
      monthlyPrice: activePlans.foundation.monthlyPrice,
      annualPrice: activePlans.foundation.annualPrice,
      annualEquivalentMonthly: activePlans.foundation.annualEquivalentMonthly,
      savePct: activePlans.foundation.savePct,
      quota: `${activePlans.foundation.essaysPerMonth} Graded Essays / mo · ${activePlans.foundation.liveCredits} Live Credits`,
      badge: "Most Accessible",
      features: activePlans.foundation.features,
    },
    {
      id: "pro",
      name: activePlans.pro.name,
      tagline: activePlans.pro.tagline,
      monthlyPrice: activePlans.pro.monthlyPrice,
      annualPrice: activePlans.pro.annualPrice,
      annualEquivalentMonthly: activePlans.pro.annualEquivalentMonthly,
      savePct: activePlans.pro.savePct,
      quota: `${activePlans.pro.essaysPerMonth} Graded Essays / mo · ${activePlans.pro.liveCredits} Live Credits`,
      badge: "Most Popular",
      popular: true,
      features: activePlans.pro.features,
    },
    {
      id: "mastery",
      name: activePlans.mastery.name,
      tagline: activePlans.mastery.tagline,
      monthlyPrice: activePlans.mastery.monthlyPrice,
      annualPrice: activePlans.mastery.annualPrice,
      annualEquivalentMonthly: activePlans.mastery.annualEquivalentMonthly,
      savePct: activePlans.mastery.savePct,
      quota: `${activePlans.mastery.essaysPerMonth} Graded Essays / mo · ${activePlans.mastery.liveCredits} Live Credits`,
      badge: "A* Target Cohort",
      features: activePlans.mastery.features,
    },
    {
      id: "elite",
      name: activePlans.elite.name,
      tagline: activePlans.elite.tagline,
      monthlyPrice: activePlans.elite.monthlyPrice,
      annualPrice: activePlans.elite.annualPrice,
      annualEquivalentMonthly: activePlans.elite.annualEquivalentMonthly,
      savePct: activePlans.elite.savePct,
      quota: `Unlimited Essays · ${activePlans.elite.liveCredits}+ Live Credits`,
      badge: "VIP All-Access Pass",
      features: activePlans.elite.features,
    },
  ];

  return (
    <section
      id="pricing"
      className={cn("relative scroll-mt-20 px-4 py-16 sm:px-6 md:px-8 lg:py-24 overflow-hidden border-b-[1.5px] border-ink", className)}
    >
      <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ── Section Header ── */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow eyebrow-accent">Transparent Cambridge Economics Pricing</p>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Examiner-standard AI at a fraction of private tutoring.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Private 1-on-1 Cambridge tutoring costs{" "}
            <span className="font-semibold text-foreground">₹2,500 – ₹5,000 / hour</span>. Marginal
            delivers 24/7 instant AO1/AO2/AO3 feedback and live coaching starting at just{" "}
            <span className="font-semibold text-foreground">₹99 / month</span> (billed annually) or ₹149 / month.
          </p>

          {/* ── Audience Selector (Students vs Schools) ── */}
          <div className="mt-8 inline-flex max-w-full flex-wrap sm:flex-nowrap items-center justify-center rounded-xl border border-border bg-muted/60 p-1 sm:p-1.5 shadow-xs gap-1 sm:gap-0">
            <button
              type="button"
              onClick={() => setAudience("students")}
              className={cn(
                "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                audience === "students"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <GraduationCap className="size-4 text-primary shrink-0" />
              <span>For Students &amp; Educators</span>
            </button>
            <button
              type="button"
              onClick={() => setAudience("schools")}
              className={cn(
                "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                audience === "schools"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <School className="size-4 text-primary shrink-0" />
              <span>For Schools &amp; Departments</span>
            </button>
          </div>

          {/* ── Billing Cycle Toggle ── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <span
              className={cn(
                "text-xs font-medium transition-colors sm:text-sm",
                cycle === "monthly" ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              Monthly Billing
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={cycle === "annual"}
              onClick={() => setCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                cycle === "annual" ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                  cycle === "annual" ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors sm:text-sm",
                cycle === "annual" ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              Annual Billing
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold whitespace-nowrap"
              >
                Save up to 33%
              </Badge>
            </span>
          </div>
        </div>

        {/* ── Pricing Cards Grid ── */}
        {audience === "students" ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
            {/* ── Column 1: Get Started for Free ── */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-6 transition-all duration-300 hover:border-primary/40 h-full">
              <div className="absolute -top-3 left-6">
                <Badge className="bg-muted text-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  {FREE_STARTER_TIER.badge}
                </Badge>
              </div>

              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-foreground min-h-[28px] flex items-center">{FREE_STARTER_TIER.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed min-h-[38px] flex items-start">
                  {FREE_STARTER_TIER.tagline}
                </p>

                <div className="mt-5 border-y border-border/60 py-4 min-h-[148px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                        {FREE_STARTER_TIER.price}
                      </span>
                      <span className="text-xs text-muted-foreground">/ {FREE_STARTER_TIER.period}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground min-h-[16px]">
                      Zero card required · Instant start
                    </p>
                  </div>
                  <div className="w-full min-h-[44px] flex items-center justify-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                    <Check className="size-3 shrink-0 mr-1.5" />
                    <span>{FREE_STARTER_TIER.quota}</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                  {FREE_STARTER_TIER.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-6">
                <Button
                  asChild
                  variant="outline"
                  className="w-full text-xs font-semibold h-10 shadow-xs border-primary/30 hover:bg-primary/10 cursor-pointer"
                >
                  <Link to="/grade">
                    Start Free (2 Essays) <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* ── Columns 2-5: Dynamic Paid Student Tiers ── */}
            {dynamicStudentTiers.map((tier) => {
              const displayPrice =
                cycle === "annual" ? `₹${tier.annualEquivalentMonthly}` : `₹${tier.monthlyPrice}`;
              const periodText = cycle === "annual" ? "/ mo (billed annually)" : "/ mo";

              return (
                <div
                  key={tier.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-300 h-full",
                    tier.popular
                      ? "border-primary/50 bg-card shadow-lg ring-2 ring-primary/20"
                      : "border-border/80 bg-card/60 hover:border-primary/40",
                  )}
                >
                  {tier.badge ? (
                    <div className="absolute -top-3 left-6">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          tier.popular
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-border",
                        )}
                      >
                        {tier.badge}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-foreground min-h-[28px] flex items-center">{tier.name}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed min-h-[38px] flex items-start">
                      {tier.tagline}
                    </p>

                    <div className="mt-5 border-y border-border/60 py-4 min-h-[148px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            {displayPrice}
                          </span>
                          <span className="text-xs text-muted-foreground">{periodText}</span>
                        </div>
                        {cycle === "annual" ? (
                          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 min-h-[16px]">
                            ₹{tier.annualPrice.toLocaleString()} / year (Save {tier.savePct}%)
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground min-h-[16px]">
                            Billed monthly · Cancel anytime
                          </p>
                        )}
                      </div>
                      <div className="w-full min-h-[44px] flex items-center justify-center rounded-md bg-primary/10 px-2.5 py-1 text-center text-[11px] font-semibold text-primary leading-tight">
                        <Zap className="size-3 shrink-0 mr-1.5" />
                        <span>{tier.quota}</span>
                      </div>
                    </div>

                    <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      variant={tier.popular ? "default" : "outline"}
                      className="w-full text-xs font-semibold h-10 shadow-xs cursor-pointer"
                    >
                      <Link
                        to="/payment"
                        search={{
                          tier: tier.id as any,
                          cycle: cycle,
                        }}
                      >
                        Choose {tier.name} <ArrowRight className="size-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {SCHOOL_TIERS.map((tier) => {
              const displayPrice = cycle === "annual" ? tier.annualPrice : tier.monthlyPrice;
              const periodText = cycle === "annual" ? " / year" : " / month";

              return (
                <div
                  key={tier.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-300 h-full",
                    tier.popular
                      ? "border-primary/50 bg-card shadow-lg ring-2 ring-primary/20"
                      : "border-border/80 bg-card/60 hover:border-primary/40",
                  )}
                >
                  {tier.badge ? (
                    <div className="absolute -top-3 left-6">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          tier.popular
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-border",
                        )}
                      >
                        {tier.badge}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-foreground min-h-[28px] flex items-center">{tier.name}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed min-h-[38px] flex items-start">
                      {tier.tagline}
                    </p>

                    <div className="mt-5 border-y border-border/60 py-4 min-h-[148px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                            {displayPrice}
                          </span>
                          <span className="text-xs text-muted-foreground">{periodText}</span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-primary min-h-[16px]">
                          {tier.effectiveCostPerStudent}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-muted/50">
                          {tier.studentCapacity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-muted/50">
                          {tier.teacherSeats}
                        </Badge>
                      </div>
                    </div>

                    <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      variant={tier.popular ? "default" : "outline"}
                      className="w-full text-xs font-semibold h-10 shadow-xs cursor-pointer"
                    >
                      <a href="mailto:licensing@marginal.app?subject=Cambridge%209708%20School%20License%20Inquiry">
                        Request School Demo <ArrowRight className="size-3.5 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Trust & Risk Reversal Banner ── */}
        <div className="mt-14 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">2 Free Graded Essays</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Try the full Cambridge examiner marking engine with 2 full essays completely free.
                  No credit card required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">Syllabus 9708 Grounded</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Every mark is grounded in Cambridge mark schemes, levels of response, and official
                  assessment objective criteria.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">Timed Cambridge Sessions</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Deep AI AO analysis runs for 30–90 min per session. Instant in-browser grammar, mechanics, and terminology checks remain unlimited.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">Department Pilot Grants</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Cambridge school economics departments receive a 30-day cohort trial for up to 100
                  students upon request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
