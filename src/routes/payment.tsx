import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  PenLine,
  QrCode,
  RefreshCw,
  School,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fireConfetti } from "@/lib/confetti";
import { validateCouponCode } from "@/lib/coupon.functions";
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
import { useCurrency } from "@/hooks/use-currency";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { convertFromUsd } from "@/lib/currency";

const searchSchema = z
  .object({
    tier: z
      .string()
      .optional()
      .default("foundation")
      .catch("foundation"),
    cycle: z
      .enum(["monthly", "annual"])
      .optional()
      .default("monthly")
      .catch("monthly"),
    role: z.enum(["student", "teacher", "school"]).optional().catch(undefined),
    audience: z.enum(["students", "teachers", "schools", "student", "teacher", "school"]).optional().catch(undefined),
  })
  .passthrough()
  .catch({
    tier: "foundation",
    cycle: "monthly",
  });

type PlanAudience = "student" | "teacher" | "school";

const SCHOOL_PLANS: Record<
  string,
  {
    name: string;
    tagline: string;
    monthlyPrice: number;
    annualPrice: number;
    annualEquivalentMonthly: number;
    savePct: number;
    studentCapacity: string;
    teacherSeats: string;
    quota: string;
    badge: string;
  }
> = {
  school_starter: {
    name: "Department Starter",
    tagline: "For boutique classes and small cohorts (up to 50 students, 2 teacher admins).",
    monthlyPrice: 99,
    annualPrice: 990,
    annualEquivalentMonthly: 83,
    savePct: 17,
    studentCapacity: "Up to 50 Students",
    teacherSeats: "2 Teacher Admin Seats",
    quota: "15 essays / student / mo",
    badge: "Small Cohorts",
  },
  school_campus: {
    name: "Campus Standard",
    tagline: "Ideal for Cambridge international schools (up to 150 students, 5 teacher admins).",
    monthlyPrice: 199,
    annualPrice: 1990,
    annualEquivalentMonthly: 166,
    savePct: 17,
    studentCapacity: "Up to 150 Students",
    teacherSeats: "5 Teacher Admin Seats",
    quota: "25 essays / student / mo",
    badge: "Recommended for Schools",
  },
  school_institution: {
    name: "Institution Premium",
    tagline: "Comprehensive capacity for large high schools (up to 400 students, 15 teacher admins).",
    monthlyPrice: 399,
    annualPrice: 3990,
    annualEquivalentMonthly: 333,
    savePct: 17,
    studentCapacity: "Up to 400 Students",
    teacherSeats: "15 Teacher Admin Seats",
    quota: "40 essays / student / mo",
    badge: "Large Departments",
  },
};

export const Route = createFileRoute("/payment")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
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
    monthly: 19,
    annual: 190,
    annualMonthlyEq: 16,
    savePct: 17,
    tagline: "Foundation Scholar — 8 essays/mo and 2 Live Examiner credits",
  },
  scholar_plus: {
    monthly: 35,
    annual: 349,
    annualMonthlyEq: 29,
    savePct: 17,
    tagline: "Scholar Plus — 15 essays/mo and 4 Live Examiner credits",
  },
  pro: {
    monthly: 59,
    annual: 590,
    annualMonthlyEq: 49,
    savePct: 17,
    tagline: "Pro Accelerator — 25 essays/mo, 8 Live Examiner credits, arbitration",
  },
  mastery: {
    monthly: 99,
    annual: 990,
    annualMonthlyEq: 82,
    savePct: 17,
    tagline: "A* Mastery Sprint — 50 essays/mo, 14 Live Examiner credits, handwriting OCR",
  },
  elite: {
    monthly: 179,
    annual: 1790,
    annualMonthlyEq: 149,
    savePct: 17,
    tagline: "Cambridge Elite Pass — 75 essays/mo and 22 Live Examiner credits",
  },
};

function PaymentPortalPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTier, setSelectedTier] = useState<string>(
    (search.tier || "foundation").replace("-", "_")
  );
  const [cycle, setCycle] = useState<"monthly" | "annual">(search.cycle || "monthly");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("upi");
  const [isLockShaking, setIsLockShaking] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [school, setSchool] = useState("");
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

  // Prefill user details if already available
  useEffect(() => {
    if (meQuery.data) {
      if (!fullName && meQuery.data.fullName) {
        setFullName(meQuery.data.fullName);
      }
      if (!school && (meQuery.data as any)?.school) {
        setSchool((meQuery.data as any).school);
      }
    }
  }, [meQuery.data]);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-5 shadow-xl">
        <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/25">
          <Sparkles className="size-7" />
        </div>
        <div className="space-y-2">
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
            100% Free Community Access Active
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            No Payment Required
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            All payments and pricing plans are currently locked and disabled. Marginal is open 100% free with unlimited Cambridge 9708 essay evaluations, past papers, and classroom cohorts for all students and educators.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2.5">
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Link to="/grade">
              <PenLine className="mr-2 size-4" /> Go to Essay Grader
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  const isExplicitStudent =
    search.role === "student" ||
    search.audience === "student" ||
    search.audience === "students" ||
    (["foundation", "scholar_plus", "pro", "mastery", "elite"].includes((search.tier || "").replace("-", "_")) &&
      search.role !== "teacher" &&
      search.audience !== "teachers" &&
      search.audience !== "teacher");

  const [userSelectedAudience, setUserSelectedAudience] = useState(false);

  const [planAudience, setPlanAudience] = useState<PlanAudience>(() => {
    if (isExplicitStudent) return "student";
    if (search.role === "teacher" || search.audience === "teachers" || search.audience === "teacher") return "teacher";
    if (search.role === "school" || search.audience === "schools" || search.audience === "school") return "school";
    if (search.tier?.startsWith("school_") || search.tier?.startsWith("school-")) return "school";
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const r = p.get("role") || p.get("audience") || p.get("tab");
      if (r === "student" || r === "students") return "student";
      if (r === "teacher" || r === "teachers" || r === "educators") return "teacher";
      if (r === "school" || r === "schools") return "school";
    }
    return "student";
  });

  const isSchoolMode = planAudience === "school";
  const isTeacherMode = planAudience === "teacher";

  useEffect(() => {
    if (userSelectedAudience || isExplicitStudent) return;
    if (search.role === "teacher" || search.audience === "teachers" || search.audience === "teacher") {
      setPlanAudience("teacher");
    } else if (meQuery.data?.role === "teacher" && !search.tier) {
      if (!isSchoolMode) setPlanAudience("teacher");
    }
  }, [search.role, search.audience, search.tier, meQuery.data?.role, isSchoolMode, userSelectedAudience, isExplicitStudent]);

  useEffect(() => {
    if (isSchoolMode && !selectedTier.startsWith("school_")) {
      setSelectedTier("school_starter");
    } else if (!isSchoolMode && selectedTier.startsWith("school_")) {
      setSelectedTier("foundation");
    }
  }, [isSchoolMode]);

  const { currency, setCurrency, format, convert, meta } = useCurrency();

  const fetchPlatformPricing = useServerFn(getPlatformPricing);
  const platformPricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => fetchPlatformPricing(),
    staleTime: 30_000,
  });

  const activePlans = platformPricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  let baseAmountUsd = 0;
  let activePlanName = "";
  let activePlanTagline = "";
  let savePct = 0;

  if (isSchoolMode) {
    const sPlan = SCHOOL_PLANS[selectedTier] ?? SCHOOL_PLANS.school_starter;
    baseAmountUsd = cycle === "annual" ? sPlan.annualPrice : sPlan.monthlyPrice;
    activePlanName = sPlan.name;
    activePlanTagline = sPlan.tagline;
    savePct = sPlan.savePct;
  } else {
    const currentPlan =
      activePlans[selectedTier] ??
      (DEFAULT_PRICING_PLANS as any)[selectedTier] ??
      activePlans.foundation ??
      DEFAULT_PRICING_PLANS.foundation;
    baseAmountUsd = cycle === "annual" ? currentPlan.annualPrice : currentPlan.monthlyPrice;
    activePlanName = isTeacherMode
      ? selectedTier === "foundation"
        ? "Individual Educator AI Pass"
        : selectedTier === "scholar_plus"
        ? "Senior Educator Pass"
        : selectedTier === "pro"
        ? "Department Lead Pass"
        : selectedTier === "mastery"
        ? "Mastery Department Pass"
        : "Elite Institutional Pass"
      : currentPlan.name;
    activePlanTagline = currentPlan.tagline;
    savePct = currentPlan.savePct;
  }

  // Convert base USD amount to active localized currency
  const finalBasePrice = convert(baseAmountUsd);

  const limits = TIER_LIMITS[selectedTier as PlanTier] ?? TIER_LIMITS.foundation;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
    discountAmount: number;
    finalAmount: number;
    description?: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const validateCouponMutation = useServerFn(validateCouponCode);

  // Dynamically calculate discount based on active plan price
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? Math.round((finalBasePrice * appliedCoupon.value) / 100)
      : Math.min(currency === "INR" ? appliedCoupon.value : convert(appliedCoupon.value), finalBasePrice)
    : 0;
  const payableAmount = Math.max(0, finalBasePrice - discountAmount);
  // Alias for backward compatibility with existing component references
  const finalPrice = payableAmount;

  const handleApplyCoupon = async (codeToTry?: string) => {
    const code = (codeToTry ?? couponInput).trim();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setIsValidatingCoupon(true);
    try {
      const res = await validateCouponMutation({
        data: {
          code,
          tier: selectedTier,
          audience: planAudience,
          billingCycle: cycle,
          baseAmount: finalBasePrice,
        },
      });
      setAppliedCoupon({
        code: res.code,
        type: res.type as "percentage" | "fixed",
        value: res.value,
        discountAmount: res.discountAmount,
        finalAmount: res.finalAmount,
        description: res.description,
      });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || "Invalid coupon code.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Coupon code removed.");
  };

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

  // Ensure user is signed in to pay
  useEffect(() => {
    if (!meQuery.isLoading && !meQuery.data?.userId) {
      const currentUrl =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/payment";
      toast.info("Please sign in or create an account to proceed with subscription payment.", {
        id: "auth-required-payment",
        duration: 4000,
      });
      navigate({
        to: "/auth",
        search: { redirect: currentUrl },
      });
    }
  }, [meQuery.isLoading, meQuery.data?.userId, navigate]);

  const validateCustomerDetails = (): boolean => {
    if (!fullName.trim()) {
      toast.error("Please enter your Full Name before proceeding with payment.");
      return false;
    }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!phone.trim() || cleanPhone.length < 7) {
      toast.error("Please enter a valid Phone Number for SMS/WhatsApp activation receipt.");
      return false;
    }
    if (!location.trim()) {
      toast.error("Please enter your Location (City / Country) before proceeding.");
      return false;
    }
    if (!school.trim()) {
      toast.error("Please enter your School or Institution name before proceeding.");
      return false;
    }
    return true;
  };

  const handleActivation = async (isSimulation = false) => {
    if (!validateCustomerDetails()) return;
    if (!meQuery.data?.userId) {
      toast.error("Please sign in or create an account first to complete payment.");
      navigate({
        to: "/auth",
        search: {
          redirect:
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/payment",
        },
      });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await activateMutation({
        data: {
          tier: selectedTier,
          billingCycle: cycle,
          isSimulation,
          couponCode: appliedCoupon?.code,
          fullName: fullName.trim(),
          phoneNumber: phone.trim(),
          location: location.trim(),
          school: school.trim(),
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
    if (!validateCustomerDetails()) return;
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
        description: `${activePlanName} (${cycle === "annual" ? "Annual" : "Monthly"})`,
        image: "/marginal-m-icon-clean.png",
        prefill: {
          name: fullName.trim() || meQuery.data?.fullName || "",
          email: "",
          contact: phone.trim() || "",
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
    if (!validateCustomerDetails()) return;
    if (!meQuery.data?.userId) {
      toast.error("Please sign in or create an account first to complete payment.");
      navigate({
        to: "/auth",
        search: {
          redirect:
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/payment",
        },
      });
      return;
    }
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

  const [copiedSchoolEmail, setCopiedSchoolEmail] = useState(false);

  const handleCopySchoolEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("marginal.econ.ai@gmail.com");
      setCopiedSchoolEmail(true);
      toast.success("School partnership email copied: marginal.econ.ai@gmail.com");
      setTimeout(() => setCopiedSchoolEmail(false), 2000);
    }
  };

  const handleSchoolEmailClick = () => {
    const sPlan = SCHOOL_PLANS[selectedTier] ?? SCHOOL_PLANS.school_starter;
    const subject = encodeURIComponent(`Cambridge 9708 School Licensing Inquiry — ${sPlan.name}`);
    const body = encodeURIComponent(
      `Hello Marginal Economics Team,\n\nOur school/department is interested in procuring the ${sPlan.name} package (${sPlan.studentCapacity}, ${sPlan.teacherSeats}) for Cambridge International 9708 Economics.\n\n` +
      `School / Institution Name:\n` +
      `City / Country:\n` +
      `Estimated Student Cohort Size:\n` +
      `Coordinator / Head of Department Name:\n` +
      `Contact Phone / WhatsApp:\n` +
      `Billing Preference: ${cycle === "annual" ? "Annual Billing" : "Monthly Billing"}\n\n` +
      `Please send us the formal price quotation, institutional purchase order (PO) requirements, and teacher onboarding documentation.\n\nThank you!`
    );
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("marginal.econ.ai@gmail.com");
    }
    toast.info("School partnership email copied: marginal.econ.ai@gmail.com — opening inquiry draft", { duration: 5000 });
    window.location.href = `mailto:marginal.econ.ai@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleUpiActivation = async () => {
    if (!validateCustomerDetails()) return;
    if (!meQuery.data?.userId) {
      toast.error("Please sign in or create an account first so your subscription can be verified.", {
        action: {
          label: "Sign In",
          onClick: () =>
            navigate({
              to: "/auth",
              search: {
                redirect:
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/payment",
              },
            }),
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
          couponCode: appliedCoupon?.code,
          fullName: fullName.trim(),
          phoneNumber: phone.trim(),
          location: location.trim(),
          school: school.trim(),
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

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  if (!meQuery.data?.userId) {
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/payment";
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-6 text-center space-y-4 shadow-xl border-border">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Lock className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Sign In Required to Pay</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please sign in to your Marginal account so your Cambridge subscription plan and Live Examiner credits are linked to your profile.
            </p>
          </div>
          <Button asChild className="w-full font-bold shadow-md">
            <Link to="/auth" search={{ redirect: currentUrl }}>
              Sign In to Continue <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-6 py-3">
          <Link to="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal AI Cambridge Economics 9708 Prep"
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
          <Badge
            className={cn(
              "border text-xs font-semibold mb-2",
              isSchoolMode
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : isTeacherMode
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                : "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {isSchoolMode
              ? "School Department Licensing Checkout"
              : isTeacherMode
              ? "Educator AI Pass Checkout"
              : "Verified Official Checkout"}
          </Badge>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {isSchoolMode
              ? "Complete Your School Cohort Licensing"
              : isTeacherMode
              ? "Complete Your Educator AI Pass Subscription"
              : "Complete Your Cambridge 9708 Subscription"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {isSchoolMode
              ? "Equip your economics department with bulk student essay allocations, teacher dashboard oversight, and shared mark scheme calibrations."
              : isTeacherMode
              ? `Unlock personal Cambridge 9708 examiner AI marking, custom school mark scheme ingestion, and live Socratic coaching from ${format(19)}/mo.`
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

        {/* Top Status Banner: School Invoicing vs Razorpay Locked */}
        {isSchoolMode ? (
          <div className="mb-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-foreground/90">
            <div className="flex items-start gap-3">
              <div className="relative flex items-center justify-center size-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <School className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                    Institutional Invoicing &amp; Department Procurement
                  </p>
                  <Badge variant="outline" className="border-emerald-500/50 text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                    Official Purchase Order (PO)
                  </Badge>
                </div>
                <p className="mt-1 leading-relaxed text-muted-foreground dark:text-emerald-200/90">
                  School department packages cannot be paid via personal consumer QR codes. They require an official institutional Purchase Order, custom GST invoice, teacher coordinator provisioning, and bulk student CSV enrollment. Inquire below or contact <strong className="text-foreground">marginal.econ.ai@gmail.com</strong>.
                </p>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSchoolEmailClick}
                    className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                  >
                    <Mail className="size-3" /> Draft Inquiry Email
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Link to="/help">
                      <Send className="size-3 mr-1" /> Contact Desk
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
        )}

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Plan & Billing Selector */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
              <h2 className="text-base font-semibold mb-3">1. Select Revision Tier</h2>

              {/* Audience Selector: Students vs Educators vs Schools */}
              <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/60 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUserSelectedAudience(true);
                    setPlanAudience("student");
                    if (selectedTier.startsWith("school_")) setSelectedTier("foundation");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    planAudience === "student"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GraduationCap className="size-3.5 text-primary" />
                  <span className="hidden sm:inline">Student Plans</span>
                  <span className="sm:hidden">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSelectedAudience(true);
                    setPlanAudience("teacher");
                    if (selectedTier.startsWith("school_")) setSelectedTier("foundation");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    planAudience === "teacher"
                      ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="size-3.5 text-purple-500" />
                  <span className="hidden sm:inline">Educator Pass</span>
                  <span className="sm:hidden">Teacher</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSelectedAudience(true);
                    setPlanAudience("school");
                    if (!selectedTier.startsWith("school_")) setSelectedTier("school_starter");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                    planAudience === "school"
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <School className="size-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">School Licensing</span>
                  <span className="sm:hidden">Schools</span>
                </button>
              </div>

              {/* Billing Cycle & Currency Bar */}
              <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-1.5 sm:p-2 rounded-xl border border-border/60">
                <div className="flex-1 flex items-center rounded-lg bg-muted/80 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setCycle("monthly")}
                    className={cn(
                      "flex-1 rounded-md py-1.5 font-medium transition-all text-center text-xs",
                      cycle === "monthly"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("annual")}
                    className={cn(
                      "flex-1 rounded-md py-1.5 font-medium transition-all flex items-center justify-center gap-1 text-xs text-center",
                      cycle === "annual"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Annual</span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      Save 17%
                    </span>
                  </button>
                </div>
                <div className="shrink-0 flex items-center justify-end">
                  <CurrencySelector value={currency} onChange={setCurrency} variant="select" />
                </div>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {isSchoolMode ? (
                  Object.entries(SCHOOL_PLANS).map(([tierKey, sPlan]) => {
                    const isSelected = selectedTier === tierKey;
                    const priceShow =
                      cycle === "annual" ? format(sPlan.annualEquivalentMonthly) : format(sPlan.monthlyPrice);

                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        className={cn(
                          "cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all duration-200",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/[0.04] ring-2 ring-emerald-500/20 shadow-xs"
                            : "border-border hover:border-border/80 bg-background/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                                isSelected
                                  ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                                  : "border-muted-foreground/30 text-transparent"
                              )}
                            >
                              ✓
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-foreground block truncate">
                                  {sPlan.name}
                                </span>
                                <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0">
                                  {sPlan.studentCapacity}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground px-1.5 py-0">
                                  {sPlan.teacherSeats}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug break-words mt-0.5">
                                {sPlan.tagline} · <strong className="text-foreground">{sPlan.quota}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-1">
                            <span className="text-sm sm:text-base font-extrabold tabular-nums text-foreground">
                              {priceShow}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground block whitespace-nowrap">
                              {cycle === "annual" ? "/mo (billed annually)" : "/month"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <School className="size-3 text-emerald-500" />
                            Official PO &amp; GST Invoicing
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link to="/help">Contact Desk</Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTier(tierKey);
                                handleSchoolEmailClick();
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                            >
                              <Mail className="size-3" /> Inquire via Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  (["foundation", "scholar_plus", "pro", "mastery", "elite"] as PlanTier[]).map((tierKey) => {
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
                      cycle === "annual" ? format(tPricing.annualMonthlyEq) : format(tPricing.monthly);

                    let tierTitle: string = tLimits.name;
                    let tierSubtitle = tPricing.tagline;
                    let tierBadge: string | null = null;

                    if (isTeacherMode) {
                      if (tierKey === "foundation") {
                        tierTitle = "Individual Educator AI Pass";
                        tierSubtitle = "Essential Educator Pass — Mark scheme ingestion, 8 Graded Essay evaluations/mo, 3 Live Examiner coaching credits, full classroom manager";
                        tierBadge = "Educator AI Pass";
                      } else if (tierKey === "scholar_plus") {
                        tierTitle = "Senior Educator Pass";
                        tierSubtitle = "15 Cambridge Graded Essay evaluations / mo, 5 Live Examiner Credits, custom curriculum mark schemes";
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
                        onClick={() => {
                          setUserSelectedAudience(true);
                          setPlanAudience(isTeacherMode ? "teacher" : "student");
                          setSelectedTier(tierKey);
                        }}
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
                  })
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">
                  {isSchoolMode ? "2. School Coordinator Contact" : isTeacherMode ? "2. Educator Contact" : "2. Candidate Information"}
                </h2>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  All 4 fields mandatory
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Required before activating your Cambridge 9708 subscription to ensure official syllabus entitlement and WhatsApp/SMS delivery.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-xs flex items-center justify-between font-semibold">
                    <span>{isSchoolMode ? "Coordinator / Head of Dept" : isTeacherMode ? "Educator Full Name" : "Candidate Full Name"}</span>
                    <span className="text-[10px] text-destructive font-bold">*Required</span>
                  </Label>
                  <Input
                    id="cust-name"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone" className="text-xs flex items-center justify-between font-semibold">
                    <span>Phone Number (SMS / WhatsApp)</span>
                    <span className="text-[10px] text-destructive font-bold">*Required</span>
                  </Label>
                  <Input
                    id="cust-phone"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-location" className="text-xs flex items-center justify-between font-semibold">
                    <span>Location (City, Country)</span>
                    <span className="text-[10px] text-destructive font-bold">*Required</span>
                  </Label>
                  <Input
                    id="cust-location"
                    placeholder="e.g. Mumbai, India or Singapore"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-school" className="text-xs flex items-center justify-between font-semibold">
                    <span>School / Institution Name</span>
                    <span className="text-[10px] text-destructive font-bold">*Required</span>
                  </Label>
                  <Input
                    id="cust-school"
                    placeholder="e.g. The International School Bangalore"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
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
                <Badge
                  className={cn(
                    "text-[10px]",
                    isSchoolMode
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : isTeacherMode
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {isSchoolMode ? "School Cohort License" : isTeacherMode ? "Educator Pass" : "Cambridge 9708 Pass"}
                </Badge>
              </div>

              <div className="my-5 space-y-3.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-foreground">{activePlanName}</span>
                  <span className="font-bold text-sm">{meta.symbol}{finalBasePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Billing Frequency</span>
                  <span className="capitalize">{cycle}</span>
                </div>

                {cycle === "annual" ? (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span>Annual Discount Applied</span>
                    <span>Save {savePct}%</span>
                  </div>
                ) : null}

                {/* Coupon Code Section (for student & individual teacher plans) */}
                {!isSchoolMode && (
                  <div className="border-t border-border/60 pt-3">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs flex items-center gap-1.5">
                              <span className="font-mono tracking-wider">{appliedCoupon?.code}</span>
                              <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-none text-[9px] px-1.5 py-0 font-bold">
                                {appliedCoupon?.type === "percentage" ? `${appliedCoupon?.value}% OFF` : `${meta.symbol}${appliedCoupon?.value} OFF`}
                              </Badge>
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {appliedCoupon?.description || "Discount coupon applied"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                            -{meta.symbol}{discountAmount.toLocaleString()}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveCoupon}
                            className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Remove coupon"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <Tag className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Have a coupon? (e.g. SAVE20)"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyCoupon();
                                }
                              }}
                              className="h-8 pl-8 text-xs font-mono tracking-wider uppercase placeholder:normal-case placeholder:font-sans"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!couponInput.trim() || isValidatingCoupon}
                            onClick={() => handleApplyCoupon()}
                            className="h-8 text-xs font-semibold px-3 shrink-0 cursor-pointer"
                          >
                            {isValidatingCoupon ? <Loader2 className="size-3 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-dashed border-border/80 pt-3 space-y-2">
                  <p className="font-semibold text-foreground">Included Quota &amp; Features:</p>
                  {isSchoolMode ? (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium text-foreground">
                          {SCHOOL_PLANS[selectedTier]?.studentCapacity ?? "Up to 50 Students"} ({SCHOOL_PLANS[selectedTier]?.teacherSeats ?? "2 Teacher Admins"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PenLine className="size-3.5 text-primary shrink-0" />
                        <span>{SCHOOL_PLANS[selectedTier]?.quota ?? "15 essays / student / mo"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="size-3.5 text-amber-500 shrink-0" />
                        <span>Teacher Cohort Dashboard &amp; Shared School Mark Scheme Ingestion</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PenLine className="size-3.5 text-primary shrink-0" />
                        <span>
                          {limits.maxEssaysPerMonth > 1000
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
                        <span>365-Day MCQ Past Papers &amp; Explanations</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-border pt-3.5 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      {isSchoolMode ? "Estimated Institutional Rate" : "Total Due Now"}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {isSchoolMode
                        ? "Official GST invoice issued on PO requisition"
                        : appliedCoupon
                        ? `Discount applied (saved ${meta.symbol}${discountAmount.toLocaleString()})`
                        : "Includes all platform taxes"}
                    </p>
                  </div>
                  <div className="text-right">
                    {appliedCoupon && discountAmount > 0 ? (
                      <span className="text-xs line-through text-muted-foreground mr-1.5 tabular-nums">
                        {meta.symbol}{finalBasePrice.toLocaleString()}
                      </span>
                    ) : null}
                    <span className="text-2xl font-black text-primary tabular-nums">
                      {meta.symbol}{payableAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Switcher or Institutional Inquiry Card */}
              {isSchoolMode ? (
                <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-emerald-500/[0.02] p-4 sm:p-5 text-center shadow-xs">
                  <div className="relative mx-auto size-14 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-35" />
                    <div className="relative size-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <School className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                      <School className="size-3 text-emerald-600 dark:text-emerald-400" /> Institutional Invoicing &amp; Onboarding
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      School Licensing Inquiry &amp; Direct Invoice
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      School &amp; Department packages ({SCHOOL_PLANS[selectedTier]?.name ?? "Institutional License"}) are fulfilled through institutional Purchase Orders (PO), dedicated GST invoices, teacher cohort onboarding, and bulk student CSV enrollment.
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-500/20 bg-background/80 p-3 text-left space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Package:</span>
                      <strong className="text-foreground font-semibold">{SCHOOL_PLANS[selectedTier]?.name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Included Seats:</span>
                      <strong className="text-foreground font-semibold">
                        {SCHOOL_PLANS[selectedTier]?.studentCapacity} ({SCHOOL_PLANS[selectedTier]?.teacherSeats})
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Allocation:</span>
                      <strong className="text-foreground font-semibold">{SCHOOL_PLANS[selectedTier]?.quota}</strong>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/60">
                      <span>Institutional Rate:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm tabular-nums">
                        {meta.symbol}{finalPrice.toLocaleString()}{cycle === "annual" ? " / yr" : " / mo"}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      onClick={handleSchoolEmailClick}
                      className="w-full h-11 text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <Mail className="size-4 shrink-0" />
                      Email School Partnerships (marginal.econ.ai@gmail.com) →
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-10 text-xs font-semibold gap-2 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      <Link to="/help">
                        <Send className="size-3.5" />
                        Open School Inquiry &amp; Contact Desk
                      </Link>
                    </Button>

                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <code className="text-[11px] font-mono font-bold bg-muted px-2 py-1 rounded text-foreground select-all">
                        marginal.econ.ai@gmail.com
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySchoolEmail}
                        className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                      >
                        {copiedSchoolEmail ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        {copiedSchoolEmail ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground pt-1">
                    Formal GST quotations and procurement onboarding are issued within 24 hours.
                  </p>
                </div>
              ) : (
                <>
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
                          Standard Razorpay card &amp; netbanking checkout is temporarily locked for merchant maintenance. All Cambridge subscriptions are being fulfilled through <strong>Direct UPI (Instant QR / GPay / PhonePe)</strong> with 0% extra surcharge.
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
                          Pay {meta.symbol}{finalPrice.toLocaleString()} via Card / Razorpay (Locked)
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
                            Amount: <strong className="text-foreground font-bold">{currency === "INR" ? `₹${finalPrice.toLocaleString()}` : `${meta.symbol}${finalPrice.toLocaleString()} (₹${convertFromUsd(baseAmountUsd, "INR").toLocaleString()})`}</strong>
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
                </>
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
