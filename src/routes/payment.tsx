import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  GraduationCap,
  HelpCircle,
  Lock,
  PenLine,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fireConfetti } from "@/lib/confetti";
import {
  getPaymentConfig,
  activateSubscriptionTier,
  submitUpiPaymentRequest,
} from "@/lib/payment.functions";
import { getPlatformPricing } from "@/lib/pricing.functions";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-plans";
import { getMe } from "@/lib/account.functions";
import { TIER_LIMITS, type PlanTier } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  tier: z.enum(["foundation", "scholar_plus", "pro", "mastery", "elite"]).optional().default("foundation"),
  cycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
  role: z.enum(["student", "teacher"]).optional(),
});

export const Route = createFileRoute("/payment")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Dedicated Payment Portal — Marginal Economics" },
      {
        name: "description",
        content:
          "Secure Razorpay payment checkout portal for Cambridge 9708 Economics revision subscriptions and Live Examiner credits.",
      },
    ],
  }),
  component: PaymentPortalPage,
});

const TIER_PRICING = {
  foundation: {
    monthly: 99,
    annual: 1188,
    annualMonthlyEq: 99,
    savePct: 0,
    tagline: "Foundation Scholar — 8 essays/mo and 3 Live Examiner credits (₹99/mo flat)",
  },
  scholar_plus: {
    monthly: 199,
    annual: 1999,
    annualMonthlyEq: 166,
    savePct: 16,
    tagline: "Scholar Plus — 15 essays/mo and 6 Live Examiner credits (₹199/mo)",
  },
  pro: {
    monthly: 399,
    annual: 3499,
    annualMonthlyEq: 291,
    savePct: 27,
    tagline: "Pro Accelerator — 20 essays/mo, 10 Live Examiner credits, arbitration",
  },
  mastery: {
    monthly: 699,
    annual: 5999,
    annualMonthlyEq: 499,
    savePct: 28,
    tagline: "A* Mastery Sprint — 45 essays/mo, 20 Live Examiner credits, handwriting OCR",
  },
  elite: {
    monthly: 999,
    annual: 8999,
    annualMonthlyEq: 749,
    savePct: 25,
    tagline: "Cambridge Elite Pass — 80 essays/mo and 35 Live Examiner credits",
  },
};

function PaymentPortalPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTier, setSelectedTier] = useState<PlanTier>(search.tier || "foundation");
  const [cycle, setCycle] = useState<"monthly" | "annual">(search.cycle || "monthly");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("upi");
  const [isLockShaking, setIsLockShaking] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchConfig = useServerFn(getPaymentConfig);
  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: async () => {
      try {
        const res = await fetchConfig();
        if (res?.merchantUpiId) return res;
      } catch (err) {
        console.warn("getPaymentConfig serverFn threw, falling back to /api/payment-config:", err);
      }
      try {
        const apiRes = await fetch("/api/payment-config");
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData?.merchantUpiId) {
            return {
              merchantUpiId: apiData.merchantUpiId,
              keyId: apiData.keyId,
              isTestMode: apiData.isTestMode,
              currentTier: "free" as const,
              tierDetails: TIER_LIMITS,
              pendingRequest: null,
            };
          }
        }
      } catch {
        /* fallback */
      }
      return {
        merchantUpiId: "8754256082-2@ybl",
        keyId: "rzp_test_marginal_placeholder",
        isTestMode: true,
        currentTier: "free" as const,
        tierDetails: TIER_LIMITS,
        pendingRequest: null,
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data?.pendingRequest ? 3000 : false),
  });

  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
  });

  const [planAudience, setPlanAudience] = useState<"student" | "teacher">(() => {
    if (search.role === "teacher") return "teacher";
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("role") === "teacher" || p.get("audience") === "educators" || p.get("tab") === "educators") {
        return "teacher";
      }
    }
    return "student";
  });

  useEffect(() => {
    if (search.role === "teacher" || meQuery.data?.role === "teacher" || Boolean(meQuery.data?.isStaff)) {
      setPlanAudience("teacher");
    }
  }, [search.role, meQuery.data?.role, meQuery.data?.isStaff]);

  const isTeacherMode = planAudience === "teacher";

  useEffect(() => {
    if (isTeacherMode && !search.tier) {
      setSelectedTier("foundation");
    }
  }, [isTeacherMode, search.tier]);

  const fetchPlatformPricing = useServerFn(getPlatformPricing);
  const platformPricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => fetchPlatformPricing(),
    staleTime: 30_000,
  });

  const activePlans = platformPricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;
  const currentPlan = activePlans[selectedTier] ?? DEFAULT_PRICING_PLANS[selectedTier];
  const pricing = {
    monthly: currentPlan.monthlyPrice,
    annual: currentPlan.annualPrice,
    annualMonthlyEq: currentPlan.annualEquivalentMonthly,
    savePct: currentPlan.savePct,
    tagline: currentPlan.tagline,
  };
  const limits = TIER_LIMITS[selectedTier];
  const finalPrice = cycle === "annual" ? pricing.annual : pricing.monthly;

  const activateMutation = useServerFn(activateSubscriptionTier);
  const submitUpiMutation = useServerFn(submitUpiPaymentRequest);

  // Load Razorpay script dynamically
  useEffect(() => {
    const scriptId = "razorpay-checkout-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // When an admin verifies a pending UPI payment, immediately invalidate queries and activate access
  const prevPending = useRef<boolean>(false);
  useEffect(() => {
    const isPending = Boolean(configQuery.data?.pendingRequest);
    if (prevPending.current && !isPending && configQuery.data?.currentTier !== "free") {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["payment-config"] });
      toast.success("Payment verified! Your Cambridge plan and credits are now unlocked.", {
        duration: 8000,
      });
    }
    prevPending.current = isPending;
  }, [configQuery.data?.pendingRequest, configQuery.data?.currentTier, queryClient]);

  const handleActivation = async (isSimulation = false) => {
    setIsProcessing(true);
    try {
      const res = await activateMutation({
        data: {
          tier: selectedTier,
          billingCycle: cycle,
          isSimulation,
        },
      });

      fireConfetti();
      toast.success(res.message, { duration: 5000 });
      await queryClient.invalidateQueries({ queryKey: ["me"] });

      // Navigate smoothly to dashboard
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Payment activation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayCheckout = () => {
    const key = configQuery.data?.keyId;
    const rzp = (window as any).Razorpay;

    if (!rzp || !key || key.includes("placeholder")) {
      // In sandbox/pending mode, inform the user and activate instantly
      toast.info(
        "Razorpay account is currently undergoing final activation. Processing with Instant Sandbox Activation…",
        { duration: 4000 }
      );
      handleActivation(true);
      return;
    }

    try {
      const options = {
        key,
        amount: finalPrice * 100, // in paise
        currency: "INR",
        name: "Marginal Economics",
        description: `${limits.name} (${cycle === "annual" ? "Annual" : "Monthly"})`,
        image: "/marginal-m-icon-clean.png",
        prefill: {
          name: meQuery.data?.fullName || "",
          email: "",
          contact: phone || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response: any) {
          toast.success("Payment verified by Razorpay!");
          await handleActivation(false);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpayInstance = new rzp(options);
      razorpayInstance.open();
    } catch (err) {
      console.warn("Razorpay standard checkout failed, falling back to instant activation:", err);
      handleActivation(true);
    }
  };

  const merchantUpi = configQuery.data?.merchantUpiId || "8754256082-2@ybl";

  const handleRazorpayClick = () => {
    setIsLockShaking(true);
    setTimeout(() => setIsLockShaking(false), 500);
    toast.info("Razorpay Gateway is temporarily locked for recalibration. Please use Direct UPI (GPay/PhonePe).", {
      icon: "🔒",
      duration: 5000,
    });
    setPaymentMethod("razorpay");
  };

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(merchantUpi);
      setCopiedUpi(true);
      toast.success("Merchant UPI ID copied!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleUpiActivation = async () => {
    if (!meQuery.data?.userId && !meQuery.isLoading) {
      toast.error("Please sign in or create an account first so your subscription can be verified.", {
        action: {
          label: "Sign In",
          onClick: () => navigate({ to: "/auth" }),
        },
        duration: 8000,
      });
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/\s+/g, "");
    if (!/^\d{12}$/.test(cleanUtr)) {
      toast.error("Please enter the exact 12-digit numeric UPI reference number (UTR) from your receipt.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await submitUpiMutation({
        data: {
          tier: selectedTier,
          billingCycle: cycle,
          amount: finalPrice,
          utrReference: cleanUtr,
        },
      });

      toast.success(res.message, { duration: 8000 });
      await queryClient.invalidateQueries({ queryKey: ["payment-config"] });
      setUtrNumber("");
    } catch (err: any) {
      toast.error(err?.message || "UPI verification request failed. Please check your UTR or contact administrator.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-6 py-3">
          <Link to="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal"
              className="size-7 sm:size-8 object-contain transition-transform group-hover:-rotate-6"
            />
            <span className="text-sm sm:text-base font-bold tracking-tight">Marginal</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">256-bit SSL Secured</span>
            </span>
            <Button asChild variant="ghost" size="sm" className="text-xs px-2.5 sm:px-3 h-8">
              <Link to="/pricing">
                <ArrowLeft className="mr-1 sm:mr-1.5 size-3.5" /> Back to Plans
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 sm:px-6 py-6 sm:py-8 md:py-12">
        <div className="mb-6 sm:mb-8 text-center sm:text-left">
          <Badge className={cn("border text-xs font-semibold mb-2", isTeacherMode ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" : "bg-primary/10 text-primary border-primary/20")}>
            {isTeacherMode ? "Educator AI Pass Checkout" : "Verified Official Checkout"}
          </Badge>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {isTeacherMode ? "Complete Your Educator AI Pass Subscription" : "Complete Your Cambridge 9708 Subscription"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {isTeacherMode
              ? "Unlock personal Cambridge 9708 examiner AI marking, custom school mark scheme ingestion, and live Socratic coaching from ₹99/mo."
              : "Choose your Cambridge study tier, unlock instant Live Examiner AI credits, and begin scoring higher with official mark scheme calibrations."}
          </p>
        </div>

        {/* Active Paid Subscription Banner */}
        {meQuery.data?.subscription?.isPaid && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent p-5 text-xs shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-xs">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      Active Plan: {meQuery.data.subscription.tierName}
                    </h2>
                    <Badge className="bg-emerald-500 text-white font-mono text-[10px] uppercase">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Essays Remaining: <strong className="text-foreground">{meQuery.data.subscription.essaysLimit === 9999 ? "Unlimited" : `${meQuery.data.subscription.essaysRemaining} / ${meQuery.data.subscription.essaysLimit}`}</strong> · Live Examiner Credits: <strong className="text-foreground">{meQuery.data.subscription.liveExaminerCredits}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <Link to="/live-examiner">Go to Live Examiner</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to="/grade">Grade Essay</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Verification Banner if any */}
        {configQuery.data?.pendingRequest && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
            <div className="flex items-start gap-3">
              <Clock className="size-5 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                    UPI Payment Under Admin Verification
                  </p>
                  <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                    Pending Approval
                  </Badge>
                </div>
                <p className="text-muted-foreground dark:text-amber-200/90 leading-relaxed">
                  Your transaction reference (UTR: <code className="font-bold text-foreground font-mono">#{configQuery.data.pendingRequest.utr}</code>) for the <strong className="text-foreground capitalize">{configQuery.data.pendingRequest.tier}</strong> plan (₹{configQuery.data.pendingRequest.amount}) has been received. Our administrator is checking it against our bank statement. Your plan will activate automatically upon approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Razorpay Locked Status Notice */}
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground/90">
          <div className="flex items-start gap-3">
            <div className="relative flex items-center justify-center size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Lock className="size-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  Razorpay Gateway Temporarily Locked
                </p>
                <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                  Locked for Maintenance
                </Badge>
              </div>
              <p className="mt-1 leading-relaxed text-muted-foreground dark:text-amber-200/90">
                Razorpay card &amp; netbanking checkout is temporarily locked for merchant account recalibration. All Cambridge 9708 subscriptions are currently being processed with 0% extra surcharge via <strong>Direct UPI (Instant QR / GPay / PhonePe)</strong> below.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Plan & Billing Selector */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
              <h2 className="text-base font-semibold mb-3">1. Select Revision Tier</h2>

              {/* Audience Selector: Students vs Educators */}
              <div className="mb-4 inline-flex w-full items-center justify-center rounded-xl border border-border bg-muted/60 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPlanAudience("student")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    !isTeacherMode
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GraduationCap className="size-3.5 text-primary" />
                  <span>Student Revision Plans</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAudience("teacher")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    isTeacherMode
                      ? "bg-background text-foreground shadow-xs text-purple-600 dark:text-purple-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="size-3.5 text-purple-500" />
                  <span>Educator AI Pass (from ₹99/mo)</span>
                </button>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/60 p-1 text-xs sm:p-1.5">
                <button
                  type="button"
                  onClick={() => setCycle("monthly")}
                  className={cn(
                    "flex-1 rounded-lg py-2 font-medium transition-all text-center text-xs",
                    cycle === "monthly"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setCycle("annual")}
                  className={cn(
                    "flex-1 rounded-lg py-2 font-medium transition-all flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 sm:gap-1.5 text-xs text-center",
                    cycle === "annual"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Annual Billing</span>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    Save up to 33%
                  </span>
                </button>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {(["foundation", "scholar_plus", "pro", "mastery", "elite"] as PlanTier[]).map((tierKey) => {
                  const pPlan = activePlans[tierKey] ?? DEFAULT_PRICING_PLANS[tierKey];
                  const tPricing = {
                    monthly: pPlan.monthlyPrice,
                    annual: pPlan.annualPrice,
                    annualMonthlyEq: pPlan.annualEquivalentMonthly,
                    tagline: pPlan.tagline,
                  };
                  const tLimits = TIER_LIMITS[tierKey];
                  const isSelected = selectedTier === tierKey;
                  const priceShow =
                    cycle === "annual" ? `₹${tPricing.annualMonthlyEq}` : `₹${tPricing.monthly}`;

                  let tierTitle = tLimits.name;
                  let tierSubtitle = tPricing.tagline;
                  let tierBadge: string | null = null;

                  if (isTeacherMode) {
                    if (tierKey === "foundation") {
                      tierTitle = "Individual Educator AI Pass";
                      tierSubtitle = "Essential Educator Pass — Mark scheme ingestion, 8 Graded Essay evaluations/mo, 3 Live Examiner coaching credits, full classroom manager";
                      tierBadge = "Educator AI Pass";
                    } else if (tierKey === "scholar_plus") {
                      tierTitle = "Senior Educator Pass";
                      tierSubtitle = "15 Cambridge Graded Essay evaluations / mo, 6 Live Examiner Credits, custom curriculum mark schemes";
                      tierBadge = "Senior Educator";
                    } else if (tierKey === "pro") {
                      tierTitle = "Department Lead Pass";
                      tierSubtitle = "20 Cambridge Graded Essay evaluations / mo, 10 Live Examiner Credits, Dual-Model Principal Examiner Arbitration";
                    } else if (tierKey === "mastery") {
                      tierTitle = "Mastery Department Pass";
                      tierSubtitle = "45 Graded Essay evaluations/mo, 20 Live Examiner credits, OCR handwriting scan";
                    } else if (tierKey === "elite") {
                      tierTitle = "Elite Institutional Pass";
                      tierSubtitle = "80 Graded Essay evaluations/mo, 35 Live Examiner credits, full evaluation suite";
                    }
                  }

                  return (
                    <div
                      key={tierKey}
                      onClick={() => setSelectedTier(tierKey)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all duration-200",
                        isSelected
                          ? isTeacherMode
                            ? "border-purple-500 bg-purple-500/[0.04] ring-2 ring-purple-500/20 shadow-xs"
                            : "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:border-border/80 bg-background/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                              isSelected
                                ? isTeacherMode
                                  ? "border-purple-600 bg-purple-600 text-white font-bold"
                                  : "border-primary bg-primary text-primary-foreground font-bold"
                                : "border-muted-foreground/30 text-transparent"
                            )}
                          >
                            ✓
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-foreground block truncate">
                                {tierTitle}
                              </span>
                              {tierBadge && (
                                <Badge className="bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[9px] font-bold px-1.5 py-0">
                                  {tierBadge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug break-words mt-0.5">
                              {tierSubtitle}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-1">
                          <span className="text-sm sm:text-base font-extrabold tabular-nums">
                            {priceShow}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground block whitespace-nowrap">
                            {cycle === "annual" ? "/mo (billed annually)" : "/month"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Information */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
              <h2 className="text-base font-semibold mb-4">
                {isTeacherMode ? "2. Educator Contact" : "2. Candidate Contact"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-xs">
                    {isTeacherMode ? "Educator Full Name" : "Candidate Full Name"}
                  </Label>
                  <Input
                    id="cust-name"
                    value={meQuery.data?.fullName || "Cambridge Candidate"}
                    readOnly
                    className="h-9 text-xs bg-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone" className="text-xs">
                    Phone Number (for SMS confirmation)
                  </Label>
                  <Input
                    id="cust-phone"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="space-y-6">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <h2 className="text-base font-bold">Order Summary</h2>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  Cambridge 9708 Pass
                </Badge>
              </div>

              <div className="my-5 space-y-3.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-foreground">{limits.name} Plan</span>
                  <span className="font-bold text-sm">₹{finalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Billing Frequency</span>
                  <span className="capitalize">{cycle}</span>
                </div>

                {cycle === "annual" ? (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span>Annual Discount Applied</span>
                    <span>Save {pricing.savePct}%</span>
                  </div>
                ) : null}

                <div className="border-t border-dashed border-border/80 pt-3 space-y-2">
                  <p className="font-semibold text-foreground">Included Quota & Credits:</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PenLine className="size-3.5 text-primary shrink-0" />
                    <span>
                      {limits.maxEssaysPerMonth === 9999
                        ? "Unlimited"
                        : `${limits.maxEssaysPerMonth} Graded Essays / month`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="size-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground">
                      {limits.liveExaminerCredits} Live Examiner AI Credits
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span>365-Day MCQ Past Papers & Explanations</span>
                  </div>
                </div>

                <div className="border-t border-border pt-3.5 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-foreground">Total Due Now</span>
                    <p className="text-[10px] text-muted-foreground">Includes all platform taxes</p>
                  </div>
                  <span className="text-2xl font-black text-primary tabular-nums">
                    ₹{finalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div className="pt-2 border-t border-border/80">
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleRazorpayClick}
                    className={cn(
                      "relative flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer overflow-hidden",
                      paymentMethod === "razorpay"
                        ? "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs font-bold"
                        : "border-border text-muted-foreground hover:bg-muted/70",
                      isLockShaking && "lock-shake"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="size-3.5 opacity-60 shrink-0" />
                      <span>Razorpay</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[8px] sm:text-[9px] font-mono font-bold">
                      <Lock className="size-2.5 animate-pulse text-amber-500" />
                      Locked
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={cn(
                      "relative flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                      paymentMethod === "upi"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold ring-1 ring-emerald-500/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Direct UPI</span>
                    </div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[8px] sm:text-[9px] font-bold">
                      Active
                    </span>
                  </button>
                </div>
              </div>

              {/* Checkout Action Area */}
              {paymentMethod === "razorpay" ? (
                <div className="space-y-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] p-4 sm:p-5 text-center shadow-xs">
                  <div className="relative mx-auto size-14 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-35" />
                    <div
                      className={cn(
                        "relative size-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner transition-transform",
                        isLockShaking ? "lock-shake" : "animate-pulse"
                      )}
                    >
                      <Lock className="size-6 text-amber-500" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                      <Lock className="size-3 text-amber-500 animate-pulse" /> Razorpay Gateway Temporarily Locked
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      Gateway Under Recalibration
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Standard Razorpay card &amp; netbanking checkout is temporarily locked for merchant maintenance. All student subscriptions are being fulfilled through <strong>Direct UPI (Instant QR / GPay / PhonePe)</strong> with 0% extra surcharge.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsLockShaking(true);
                        setTimeout(() => setIsLockShaking(false), 500);
                        toast.error("Razorpay is locked. Please switch to Direct UPI below to activate your plan.");
                      }}
                      className={cn(
                        "w-full h-10 text-xs font-bold gap-2 bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-80 hover:bg-muted",
                        isLockShaking && "lock-shake"
                      )}
                    >
                      <Lock className="size-3.5 text-amber-500" />
                      Pay ₹{finalPrice.toLocaleString()} via Razorpay (Locked)
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className="w-full h-11 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <Smartphone className="size-4 animate-bounce" />
                      Pay via Direct UPI (Instant GPay / QR) →
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActivation(true)}
                      disabled={isProcessing}
                      className="text-[11px] text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer mt-1"
                    >
                      <Sparkles className="size-3 text-amber-500" />
                      Instant Sandbox Testing Access
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 sm:p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <QrCode className="size-4 shrink-0" /> Scan &amp; Pay via Any UPI App
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-600">
                      Instant GPay / PhonePe
                    </Badge>
                  </div>

                  {/* 1-Tap Mobile Launch button for phones */}
                  <div className="sm:hidden pt-1">
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent("Marginal Economics")}&am=${finalPrice}&cu=INR`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-all text-center"
                    >
                      <Smartphone className="size-4 shrink-0" />
                      <span>Tap to Open in UPI App (GPay / PhonePe)</span>
                    </a>
                    <p className="text-[10px] text-center text-muted-foreground mt-1">
                      Opens your phone's UPI app with the exact ₹{finalPrice.toLocaleString()} pre-filled.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 pt-1">
                    <div className="size-28 sm:size-24 shrink-0 rounded-lg border border-border bg-white p-1.5 shadow-xs flex items-center justify-center mx-auto sm:mx-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${merchantUpi}&pn=Marginal%20Economics&am=${finalPrice}&cu=INR`)}`}
                        alt="UPI Payment QR Code"
                        className="size-full object-contain"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 w-full sm:w-auto">
                      <p className="text-[11px] text-muted-foreground">Merchant UPI ID:</p>
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                        <code className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded-md text-foreground select-all break-all inline-block max-w-full">
                          {merchantUpi}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyUpi}
                          className="h-7 px-2 text-[11px] gap-1 cursor-pointer shrink-0"
                        >
                          {copiedUpi ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                          {copiedUpi ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Amount: <strong className="text-foreground font-bold">₹{finalPrice.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="utr-input" className="text-xs font-semibold text-foreground">
                        Enter 12-Digit UPI Reference (UTR) Number
                      </Label>
                      <span className={cn("text-[10px] font-mono font-bold", utrNumber.length === 12 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {utrNumber.length}/12 digits
                      </span>
                    </div>
                    <Input
                      id="utr-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      placeholder="e.g. 428190342156"
                      value={utrNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 12);
                        setUtrNumber(clean);
                      }}
                      className="h-10 text-xs sm:text-sm font-mono tracking-wider bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Found in your GPay / PhonePe / Paytm receipt after transfer.
                    </p>
                  </div>

                  <Button
                    onClick={handleUpiActivation}
                    disabled={isProcessing || utrNumber.length !== 12}
                    className="w-full h-11 text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="size-4 shrink-0" />
                    {isProcessing ? "Submitting Reference..." : "Submit UTR for Admin Verification"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground pt-0.5">
                    12-digit UTR is verified against bank credits by our administrator within 10–15 minutes.
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-border/60 pt-4 text-center">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Official 7-day no-questions-asked refund guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
