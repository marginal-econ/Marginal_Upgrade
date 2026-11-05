import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  Building2,
  Camera,
  Check,
  Clock,
  FileDown,
  GraduationCap,
  HelpCircle,
  LineChart,
  Mic,
  Minus,
  Scale,
  School,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMe } from "@/lib/account.functions";
import { getPlatformPricing } from "@/lib/pricing.functions";
import { DEFAULT_PRICING_PLANS, FREE_STARTER_TIER } from "@/lib/pricing-plans";
import { useCurrency } from "@/hooks/use-currency";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

type Audience = "students" | "educators" | "schools";
type BillingCycle = "monthly" | "annual";

const EDUCATOR_TIERS = [
  {
    id: "foundation",
    name: "Individual Educator AI Pass",
    tagline: "Essential AI marking, custom mark schemes, and live coaching for Cambridge 9708 educators.",
    monthlyPrice: 35,
    annualPrice: 349,
    annualEquivalentMonthly: 29,
    savePct: 17,
    quota: "8 Graded Essays / mo · 3 Live Examiner Credits",
    badge: "Most Popular for Teachers",
    popular: true,
    features: [
      "Authorised Cambridge 9708 Teacher & Examiner Platform Access",
      "Ingest Custom School Mark Schemes into Classroom RAG",
      "Anchor Calibration Suite: Lock Exam-Board Standard Exemplars",
      "8 Cambridge Graded Essays & Diagnostic Reports / mo",
      "3 Live Socratic Examiner Demo Credits / mo",
      "Create Unlimited Cambridge Cohorts & Class Assignments",
      "Class Diagnostic Heatmaps & Weakness Analytics",
      "Gradebook CSV & Spreadsheet Exports",
    ],
  },
  {
    id: "scholar_plus",
    name: "Senior Educator Pass",
    tagline: "Expanded assessment capacity: 15 essays & 5 Live Examiner credits for active Cambridge teachers.",
    monthlyPrice: 69,
    annualPrice: 690,
    annualEquivalentMonthly: 58,
    savePct: 17,
    quota: "15 Graded Essays / mo · 5 Live Examiner Credits",
    badge: "Senior Educator",
    popular: true,
    features: [
      "Everything in Individual Educator Pass",
      "15 Cambridge Graded Essays & Detailed Diagnostic Reports / mo",
      "5 Live Socratic Examiner Demo Credits / mo",
      "Upload and manage custom school mark schemes & rubrics",
      "Full cohort diagnostic heatmaps & weakness analytics",
      "Exemplar showcase & past MCQ papers with Cambridge explanations",
      "Gradebook CSV & spreadsheet exports",
    ],
  },
  {
    id: "pro",
    name: "Department Lead Pass",
    tagline: "For active departmental heads and high-volume Cambridge essay evaluation.",
    monthlyPrice: 119,
    annualPrice: 1190,
    annualEquivalentMonthly: 99,
    savePct: 17,
    quota: "20 Graded Essays / mo · 10 Live Examiner Credits",
    badge: "Head of Economics",
    features: [
      "Everything in Individual Educator Pass",
      "20 Cambridge Graded Essays / month",
      "10 Live Examiner Credits / month",
      "Dual-Model Principal Examiner Arbitration",
      "Unlimited Custom Mark Schemes & Syllabus Uploads",
      "Section-Wise Cohort Comparison Matrix",
      "Model Answer Generator for Classroom Demonstrations",
    ],
  },
  {
    id: "school-starter",
    name: "Department Starter",
    tagline: "Full school department licensing with 50 student seats and 2 teacher admins.",
    monthlyPrice: 199,
    annualPrice: 1990,
    annualEquivalentMonthly: 166,
    savePct: 17,
    quota: "50 Student Seats · 15 essays / student / mo",
    badge: "School License",
    features: [
      "50 active student seats included with independent student quotas",
      "2 Teacher Admin accounts with full classroom manager",
      "School mark scheme & curriculum RAG ingestion",
      "Cambridge AO distribution & cohort mark breakdowns",
      "Gradebook CSV & spreadsheet exports",
    ],
  },
];

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
  monthlyPriceUsd: number;
  annualPriceUsd: number;
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
    tagline: "Accessible entry point: flat $19/mo for 8 Cambridge essays & 2 Live Examiner sessions.",
    monthlyPrice: 19,
    annualPrice: 190,
    annualEquivalentMonthly: 16,
    savePct: 17,
    quota: "8 Graded Essays / mo · 2 Live Examiner Credits",
    badge: "Most Accessible",
    features: [
      "8 Cambridge Graded Essays / month",
      "2 Live Examiner Credits / month (25 min Real-time AI Coaching)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers",
    ],
  },
  {
    id: "scholar_plus",
    name: "Scholar Plus",
    tagline: "Focused exam booster: flat $35/mo for 15 Cambridge essays & 4 Live Examiner sessions.",
    monthlyPrice: 35,
    annualPrice: 349,
    annualEquivalentMonthly: 29,
    savePct: 17,
    quota: "15 Graded Essays / mo · 4 Live Examiner Credits",
    badge: "Great Value",
    features: [
      "15 Cambridge Graded Essays / month",
      "4 Live Examiner Credits / month (30 min Real-time AI Coaching)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports & Mark Scheme Matching",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers with Explanations",
      "All Foundation features included",
    ],
  },
  {
    id: "pro",
    name: "Pro Accelerator",
    tagline: "The benchmark for serious Cambridge candidates: 25 essays & 8 Live Examiner sessions.",
    monthlyPrice: 59,
    annualPrice: 590,
    annualEquivalentMonthly: 49,
    savePct: 17,
    quota: "25 Graded Essays / mo · 8 Live Examiner Credits",
    badge: "Most Popular",
    popular: true,
    features: [
      "25 Cambridge Graded Essays / month",
      "8 Live Examiner Credits / month (35m timed exam drill AI coaching)",
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
    tagline: "Peak revision powerhouse for Oct/Nov & May/June exam series: 50 essays & 14 Live Examiner sessions.",
    monthlyPrice: 99,
    annualPrice: 990,
    annualEquivalentMonthly: 82,
    savePct: 17,
    quota: "50 Graded Essays / mo · 14 Live Examiner Credits",
    badge: "A* Target Cohort",
    features: [
      "Multi-Paper Diagnostic Feedback & Evaluative Refinements",
      "50 Cambridge Graded Essays / month",
      "14 Live Examiner Credits / month (40m extended AI coaching, priority queue)",
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
    tagline: "VIP all-inclusive pass for complete syllabus dominance: 75 essays & 22 Live Examiner sessions.",
    monthlyPrice: 179,
    annualPrice: 1790,
    annualEquivalentMonthly: 149,
    savePct: 17,
    quota: "75 Graded Essays / mo · 22 Live Examiner Credits",
    badge: "VIP All-Access Pass",
    features: [
      "Comprehensive Cambridge Evaluation Suite (Papers 1, 2, 3 & 4 Coverage)",
      "75 Cambridge Graded Essays / month & Reworks",
      "22 Live Examiner Credits / month (45m Cambridge exam timing)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Dedicated High-Speed Flash Acceleration Queue",
      "Bespoke Past Paper Exam Series Generation",
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
    monthlyPriceUsd: 99,
    annualPriceUsd: 990,
    studentCapacity: "Up to 50 Students",
    effectiveCostPerStudent: "~$1.60 / student / mo",
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
    monthlyPriceUsd: 199,
    annualPriceUsd: 1990,
    studentCapacity: "Up to 150 Students",
    effectiveCostPerStudent: "~$1.10 / student / mo",
    teacherSeats: "5 Teacher Admin Seats",
    quota: "25 essays / student / mo",
    badge: "Recommended for Schools",
    popular: true,
    features: [
      "Up to 150 active student seats",
      "5 Teacher Admin seats with section management",
      "Section-wise cohort comparison matrix",
      "Custom paper grading & evaluation feedback",
      "Syllabus weakness tracking across classes",
      "All Starter features included",
    ],
  },
  {
    id: "school-institution",
    name: "Institution Premium",
    tagline: "Comprehensive capacity for large high schools and prep academies.",
    monthlyPriceUsd: 399,
    annualPriceUsd: 3990,
    studentCapacity: "Up to 400 Students",
    effectiveCostPerStudent: "~$0.80 / student / mo",
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
    monthlyPriceUsd: 799,
    annualPriceUsd: 7990,
    studentCapacity: "1,000+ Students",
    effectiveCostPerStudent: "< $0.65 / student / mo",
    teacherSeats: "Unlimited Teacher Seats",
    quota: "Unlimited cohort volume",
    badge: "Multi-Campus",
    features: [
      "1,000+ Students Across Multiple Campuses",
      "Centralized administrative console with SSO integration",
      "Dedicated AI model fine-tuning with your historical exam papers",
      "On-site teacher training & examiner workshops",
      "Custom SLA with dedicated 24/7 technical lead",
    ],
  },
];

export function PricingSection({ className }: { className?: string }) {
  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 60_000,
  });
  const isAuthenticated = Boolean(meQuery.data?.userId);
  const navigate = useNavigate();

  const [audience, setAudience] = useState<Audience>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role");
      const audParam = params.get("audience") || params.get("tab");
      if (roleParam === "teacher" || audParam === "educators" || audParam === "teacher") {
        return "educators";
      }
      if (audParam === "schools") {
        return "schools";
      }
    }
    return "students";
  });
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const { currency, setCurrency, format } = useCurrency();

  const [userSelectedAudience, setUserSelectedAudience] = useState(false);

  useEffect(() => {
    if (userSelectedAudience) return;
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const audParam = params?.get("audience") || params?.get("role") || params?.get("tab");
    if (audParam === "students" || audParam === "student") {
      setAudience("students");
      return;
    }
    if (meQuery.data?.role === "teacher") {
      setAudience("educators");
    }
  }, [meQuery.data?.role, userSelectedAudience]);

  const fetchPlatformPricing = useServerFn(getPlatformPricing);
  const pricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => fetchPlatformPricing(),
    staleTime: 30_000,
  });

  const activePlans = pricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  const dynamicStudentTiers: StudentTier[] = Object.entries(activePlans)
    .filter(([_, plan]) => plan.isPublic !== false)
    .map(([id, plan]) => ({
      id,
      name: plan.name,
      tagline: plan.tagline,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      annualEquivalentMonthly: plan.annualEquivalentMonthly,
      savePct: plan.savePct,
      quota: `${plan.essaysPerMonth} Graded Essays / mo · ${plan.liveCredits} Live Credits`,
      badge: plan.badge || (id === "pro" ? "Most Popular" : id === "foundation" ? "Most Accessible" : id === "scholar_plus" ? "Great Value" : id === "mastery" ? "A* Target Cohort" : id === "elite" ? "VIP All-Access Pass" : undefined),
      popular: id === "pro",
      features: plan.features,
    }));

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
            <span className="font-semibold text-foreground">
              {currency === "INR" ? "₹2,500 – ₹5,000 / hour" : "$45 – $120 / hour"}
            </span>. Marginal
            delivers 24/7 instant AO1/AO2/AO3 feedback and live coaching starting at just{" "}
            <span className="font-semibold text-foreground">{format(19)} / month</span>.
          </p>

          {/* ── Audience Selector (Students vs Educators vs Schools) ── */}
          <div className="mt-8 inline-flex max-w-full flex-wrap sm:flex-nowrap items-center justify-center rounded-xl border border-border bg-muted/60 p-1 sm:p-1.5 shadow-xs gap-1 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                setUserSelectedAudience(true);
                setAudience("students");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                audience === "students"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <GraduationCap className="size-4 text-primary shrink-0" />
              <span>For Students</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserSelectedAudience(true);
                setAudience("educators");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                audience === "educators"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ShieldCheck className="size-4 text-purple-500 shrink-0" />
              <span>Educator AI Pass (from ₹99/mo)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserSelectedAudience(true);
                setAudience("schools");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                audience === "schools"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <School className="size-4 text-primary shrink-0" />
              <span>For School Departments</span>
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

          {/* ── Currency Selector (Students can pick USD, INR, GBP, EUR, SGD, AED) ── */}
          <div className="mt-4 flex items-center justify-center">
            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              variant="pill-row"
              showLabel={true}
            />
          </div>
        </div>

        {/* ── Pricing Cards Grid ── */}
        {audience === "educators" ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
            {EDUCATOR_TIERS.map((tier) => {
              const displayPrice =
                cycle === "annual" ? format(tier.annualEquivalentMonthly) : format(tier.monthlyPrice);
              const periodText = cycle === "annual" ? "/ mo (billed annually)" : "/ mo";

              return (
                <div
                  key={tier.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-300 h-full",
                    tier.popular
                      ? "border-purple-500/50 bg-card shadow-lg ring-2 ring-purple-500/20"
                      : "border-border/80 bg-card/60 hover:border-purple-500/40",
                  )}
                >
                  {tier.badge ? (
                    <div className="absolute -top-3 left-6">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          tier.popular
                            ? "bg-purple-600 text-white"
                            : "bg-muted text-foreground border border-border",
                        )}
                      >
                        {tier.badge}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-foreground min-h-[28px] flex items-center">
                      {tier.name}
                    </h3>
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
                            {format(tier.annualPrice)} / year (Save {tier.savePct}%)
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground min-h-[16px]">
                            Billed monthly · Cancel anytime
                          </p>
                        )}
                      </div>
                      <div className="w-full min-h-[44px] flex items-center justify-center rounded-md bg-purple-500/10 px-2.5 py-1 text-center text-[11px] font-semibold text-purple-600 dark:text-purple-400 leading-tight">
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
                    {tier.id === "school-starter" ? (
                      <Button
                        type="button"
                        onClick={() => {
                          const subject = encodeURIComponent("Cambridge 9708 School Licensing Inquiry — Department Starter");
                          const body = encodeURIComponent(
                            "Hello Marginal Economics Team,\n\nOur school/department is interested in the Department Starter package (50 Student Seats, 2 Teacher Admins).\n\n" +
                            `Billing Preference: ${cycle === "annual" ? "Annual" : "Monthly"}\n` +
                            "School / Institution Name:\nCoordinator Name:\nContact Phone:\n\nPlease send us the official invoice & purchase order details.\n\nThank you!"
                          );
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText("marginal.econ.ai@gmail.com");
                          }
                          toast.info("School partnership email copied: marginal.econ.ai@gmail.com — opening inquiry draft", {
                            duration: 5000,
                          });
                          window.location.href = `mailto:marginal.econ.ai@gmail.com?subject=${subject}&body=${body}`;
                        }}
                        className="w-full text-xs font-semibold h-10 shadow-xs cursor-pointer hover:border-purple-500"
                        variant="outline"
                      >
                        Inquire for School <ArrowRight className="size-3.5 ml-1.5" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant={tier.popular ? "default" : "outline"}
                        className={cn(
                          "w-full text-xs font-semibold h-10 shadow-xs cursor-pointer",
                          tier.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
                        )}
                      >
                        <Link
                          to={isAuthenticated ? "/payment" : "/auth"}
                          search={
                            isAuthenticated
                              ? ({
                                  tier: tier.id as any,
                                  cycle: cycle,
                                  role: "teacher" as any,
                                  audience: "teachers" as any,
                                } as any)
                              : ({
                                  redirect: `/payment?tier=${tier.id}&cycle=${cycle}&role=teacher&audience=teachers`,
                                } as any)
                          }
                        >
                          Unlock {tier.name} <ArrowRight className="size-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : audience === "students" ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
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
                  <Link
                    to={isAuthenticated ? "/grade" : "/auth"}
                    search={isAuthenticated ? undefined : ({ redirect: "/grade" } as any)}
                  >
                    Start Free (Unlimited Essays) <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* ── Columns 2-5: Dynamic Paid Student Tiers ── */}
            {dynamicStudentTiers.map((tier) => {
              const displayPrice =
                cycle === "annual" ? format(tier.annualEquivalentMonthly) : format(tier.monthlyPrice);
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
                            {format(tier.annualPrice)} / year (Save {tier.savePct}%)
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
                        to={isAuthenticated ? "/payment" : "/auth"}
                        search={
                          isAuthenticated
                            ? ({
                                tier: tier.id as any,
                                cycle: cycle,
                                audience: "students" as any,
                                role: "student" as any,
                              } as any)
                            : ({
                                redirect: `/payment?tier=${tier.id}&cycle=${cycle}&audience=students&role=student`,
                              } as any)
                        }
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
              const displayPrice = cycle === "annual" ? format(tier.annualPriceUsd) : format(tier.monthlyPriceUsd);
              const periodText = cycle === "annual" ? " / year" : " / month";

              const handleAction = () => {
                const subject = encodeURIComponent(`Cambridge 9708 School Licensing Inquiry — ${tier.name}`);
                const body = encodeURIComponent(
                  `Hello Marginal Team,\n\nOur school/department is interested in the ${tier.name} package for Cambridge 9708 Economics.\n\n` +
                  `Student Capacity: ${tier.studentCapacity}\n` +
                  `Teacher Seats: ${tier.teacherSeats}\n` +
                  `Billing Preference: ${cycle === "annual" ? "Annual" : "Monthly"}\n` +
                  `School / Institution Name:\n` +
                  `Coordinator Name:\n` +
                  `Contact Phone:\n\n` +
                  `Please send over the institutional proposal, invoice details, and onboarding instructions.\n\nThank you.`
                );
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText("marginal.econ.ai@gmail.com");
                }
                toast.info("School partnership email copied: marginal.econ.ai@gmail.com — opening inquiry draft", {
                  duration: 5000,
                });
                window.location.href = `mailto:marginal.econ.ai@gmail.com?subject=${subject}&body=${body}`;
              };

              return (
                <div
                  key={tier.id}
                  onClick={handleAction}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-300 h-full cursor-pointer hover:shadow-lg hover:border-primary/60 group",
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
                    <h3 className="text-lg font-bold text-foreground min-h-[28px] flex items-center group-hover:text-primary transition-colors">
                      {tier.name}
                    </h3>
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

                  <div className="mt-auto pt-6 space-y-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction();
                      }}
                      variant={tier.popular ? "default" : "outline"}
                      className={cn(
                        "w-full text-xs font-semibold h-10 shadow-xs cursor-pointer",
                        tier.popular ? "bg-primary text-primary-foreground" : "group-hover:border-primary"
                      )}
                    >
                      Inquire for School <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Official school purchase orders &amp; invoices
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Feature Segregation & Tier Comparison Matrix ── */}
        <div className="mt-20 space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5 mr-1.5" /> Full Feature Segregation &amp; Specifications
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Compare Features Across All Cambridge 9708 Tiers
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Deep dive into evaluation diagnostics, revision studio modalities, Live Examiner coaching, and speed infrastructure.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-xs">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="py-4 px-4 font-bold text-foreground min-w-[220px]">
                      Capability / Feature
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[100px]">
                      Free Starter
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(0, { showFree: true })}</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[100px]">
                      Foundation
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(19)}/mo</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[100px]">
                      Scholar Plus
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(35)}/mo</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-primary min-w-[110px] bg-primary/5">
                      Pro Accelerator
                      <span className="block text-[10px] text-primary/80 font-normal">{format(59)}/mo · Popular</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[100px]">
                      A* Mastery
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(99)}/mo</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[100px]">
                      Elite Pass
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(179)}/mo</span>
                    </th>
                    <th className="py-4 px-3 text-center font-bold text-foreground min-w-[110px]">
                      Revision Sprint
                      <span className="block text-[10px] text-muted-foreground font-normal">{format(49)}/mo</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* CATEGORY 1 */}
                  <tr className="bg-blue-500/10 font-bold text-blue-700 dark:text-blue-300">
                    <td colSpan={8} className="py-2.5 px-4 text-xs">
                      <span className="flex items-center gap-2">
                        <Brain className="size-4 text-blue-500" />
                        1. AI Evaluation &amp; Diagnostic Engine
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      AO1 Knowledge &amp; Mark Scheme Rubrics
                      <span className="block text-[10px] text-muted-foreground font-normal">Grounded in Cambridge 9708 examiner notes</span>
                    </td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      AO Sentence Diagnostics &amp; Causal Chains
                      <span className="block text-[10px] text-muted-foreground font-normal">Sub-second sentence-by-sentence attribution (&lt;50ms)</span>
                    </td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Level 4 &amp; 5 Evaluative Refinement Engine
                      <span className="block text-[10px] text-muted-foreground font-normal">Advanced synoptic balance &amp; critical evaluation synthesis</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5 text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Dual-Examiner Principal Arbitration
                      <span className="block text-[10px] text-muted-foreground font-normal">Multi-model consensus for contentious essay marks</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Cambridge Definitions Hub &amp; Drills
                      <span className="block text-[10px] text-muted-foreground font-normal">Command words, flashcards &amp; glossary tests</span>
                    </td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>

                  {/* CATEGORY 2 */}
                  <tr className="bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300">
                    <td colSpan={8} className="py-2.5 px-4 text-xs">
                      <span className="flex items-center gap-2">
                        <LineChart className="size-4 text-emerald-500" />
                        2. Exam Revision &amp; Generation Studio
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Handwritten Essay OCR Photo Scanning
                      <span className="block text-[10px] text-muted-foreground font-normal">Camera / mobile photo transcription</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5 text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      AI Perfect Model Answer Generator
                      <span className="block text-[10px] text-muted-foreground font-normal">Full 20/20 &amp; Level 5 exemplar responses</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Interactive Diagram Studio &amp; Drills
                      <span className="block text-[10px] text-muted-foreground font-normal">50+ Cambridge micro/macro graphs with sliders</span>
                    </td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Diagnostic PDF Report Export
                      <span className="block text-[10px] text-muted-foreground font-normal">Downloadable official mark breakdown sheets</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>

                  {/* CATEGORY 3 */}
                  <tr className="bg-purple-500/10 font-bold text-purple-700 dark:text-purple-300">
                    <td colSpan={8} className="py-2.5 px-4 text-xs">
                      <span className="flex items-center gap-2">
                        <School className="size-4 text-purple-500" />
                        3. Live Examiner &amp; Classroom Cohorts
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Live Examiner Credits / month
                      <span className="block text-[10px] text-muted-foreground font-normal">Real-time Socratic voice &amp; timed exam drills</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">0</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">2</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">4</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary bg-primary/5">8</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">14</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">22</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-primary">6</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      School Classrooms &amp; Homework Sync
                      <span className="block text-[10px] text-muted-foreground font-normal">Teacher assignment distribution &amp; cohort markbooks</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center bg-primary/5"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Senior Examiner 1-on-1 Review Desk
                      <span className="block text-[10px] text-muted-foreground font-normal">Direct human examiner pedagogical support channel</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5 text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                  </tr>

                  {/* CATEGORY 4 */}
                  <tr className="bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300">
                    <td colSpan={8} className="py-2.5 px-4 text-xs">
                      <span className="flex items-center gap-2">
                        <Zap className="size-4 text-amber-500" />
                        4. Quotas, Speed &amp; Platform Infrastructure
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Monthly Graded Essays Quota
                      <span className="block text-[10px] text-muted-foreground font-normal">Comprehensive AO evaluations &amp; re-marks</span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-emerald-600">Unlimited</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">8 / mo</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">15 / mo</td>
                    <td className="py-3 px-3 text-center font-mono font-bold bg-primary/5">25 / mo</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">50 / mo</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">75 / mo</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">20 / mo</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Max Words Allowed Per Submission
                      <span className="block text-[10px] text-muted-foreground font-normal">Upper word count threshold for deep analysis</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">1,200</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">1,500</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">2,000</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] bg-primary/5">3,000</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">4,000</td>
                    <td className="py-3 px-3 text-center font-semibold text-emerald-600 text-[11px]">Unlimited</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px]">2,500</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Processing Queue Speed
                      <span className="block text-[10px] text-muted-foreground font-normal">Evaluation queue tier &amp; server acceleration</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">Standard</td>
                    <td className="py-3 px-3 text-center text-muted-foreground">Standard</td>
                    <td className="py-3 px-3 text-center text-muted-foreground">Standard</td>
                    <td className="py-3 px-3 text-center bg-primary/5 text-muted-foreground">Standard</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">⚡ Priority</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">⚡ Dedicated</td>
                    <td className="py-3 px-3 text-center text-muted-foreground">Standard</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Beta Experimental Labs Access
                      <span className="block text-[10px] text-muted-foreground font-normal">Early preview access to cutting-edge features</span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center bg-primary/5 text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center text-muted-foreground/40">—</td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="size-4 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Past Paper MCQ Exam Library
                      <span className="block text-[10px] text-muted-foreground font-normal">2017 to latest series with timed test canvas</span>
                    </td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600 bg-primary/5">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                    <td className="py-3 px-3 text-center text-[11px] font-medium text-emerald-600">Full + Timers</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Trust & Risk Reversal Banner ── */}
        <div className="mt-14 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-semibold">Unlimited Graded Essays</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Try the full Cambridge examiner marking engine with unlimited essays right now.
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
                <h4 className="text-sm font-semibold">Live Examiner AI Credits</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Real-time Cambridge AO guidance powered by transparent per-essay examiner credits. In-browser grammar, mechanics, and syllabus terminology checks remain unlimited.
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
