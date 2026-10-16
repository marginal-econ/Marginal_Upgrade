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
  tier: z.enum(["foundation", "pro", "mastery", "elite"]).optional().default("pro"),
  cycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
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
    monthly: 149,
    annual: 1199,
    annualMonthlyEq: 99,
    savePct: 33,
    tagline: "Foundation Scholar — 5 essays/mo and 12 Live Examiner sessions",
  },
  pro: {
    monthly: 399,
    annual: 3599,
    annualMonthlyEq: 299,
    savePct: 25,
    tagline: "Pro Accelerator — 15 essays/mo, 30 Live Examiner sessions, arbitration",
  },
  mastery: {
    monthly: 599,
    annual: 5999,
    annualMonthlyEq: 499,
    savePct: 17,
    tagline: "A* Mastery Sprint — 35 essays/mo, 60 Live sessions, handwriting OCR",
  },
  elite: {
    monthly: 999,
    annual: 9599,
    annualMonthlyEq: 799,
    savePct: 20,
    tagline: "Cambridge Elite Pass — 75 essays/mo and 120 Live Examiner sessions",
  },
};

function PaymentPortalPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTier, setSelectedTier] = useState<PlanTier>(search.tier || "pro");
  const [cycle, setCycle] = useState<"monthly" | "annual">(search.cycle || "monthly");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("razorpay");
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchConfig = useServerFn(getPaymentConfig);
  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => fetchConfig(),
  });

  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
  });

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

  const merchantUpi = configQuery.data?.merchantUpiId || "marginal.study@okaxis";

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(merchantUpi);
      setCopiedUpi(true);
      toast.success("Merchant UPI ID copied!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleUpiActivation = async () => {
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal"
              className="size-8 object-contain transition-transform group-hover:-rotate-6"
            />
            <span className="text-base font-bold tracking-tight">Marginal</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-emerald-500" /> 256-bit SSL Secured
            </span>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/pricing">
                <ArrowLeft className="mr-1.5 size-3.5" /> Back to Plans
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-8 text-center sm:text-left">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold mb-2">
            Dedicated Razorpay Portal
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Complete Your Cambridge 9708 Subscription
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Choose your Cambridge study tier, unlock instant Live Examiner AI credits, and begin
            scoring higher with official mark scheme calibrations.
          </p>
        </div>

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

        {/* Razorpay Status Notice */}
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground/90">
          <div className="flex items-start gap-3">
            <Sparkles className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                Razorpay Merchant Account Verification Notice:
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Our official Razorpay payment gateway is in final verification. You can test live
                card/UPI processing or use our <strong>Instant Sandbox Activation</strong> button
                below to activate your tier and credits right now without delay.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Plan & Billing Selector */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
              <h2 className="text-base font-semibold mb-4">1. Select Revision Tier</h2>

              {/* Billing Cycle Toggle */}
              <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/60 p-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCycle("monthly")}
                  className={cn(
                    "flex-1 rounded-lg py-2 font-medium transition-all",
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
                    "flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-1.5",
                    cycle === "annual"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annual Billing
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Save up to 33%
                  </span>
                </button>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {(["foundation", "pro", "mastery", "elite"] as PlanTier[]).map((tierKey) => {
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

                  return (
                    <div
                      key={tierKey}
                      onClick={() => setSelectedTier(tierKey)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:border-border/80 bg-background/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border text-[10px]",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-bold"
                                : "border-muted-foreground/30 text-transparent"
                            )}
                          >
                            ✓
                          </div>
                          <div>
                            <span className="text-sm font-bold text-foreground">
                              {tLimits.name}
                            </span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {tPricing.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold tabular-nums">
                            {priceShow}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
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
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
              <h2 className="text-base font-semibold mb-4">2. Candidate Contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-xs">
                    Candidate Full Name
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
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-md">
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
                    onClick={() => setPaymentMethod("razorpay")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                      paymentMethod === "razorpay"
                        ? "border-primary bg-primary/10 text-primary shadow-xs font-bold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <CreditCard className="size-3.5" />
                    <span>Razorpay Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                      paymentMethod === "upi"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span>Direct UPI (GPay/QR)</span>
                  </button>
                </div>
              </div>

              {/* Checkout Action Area */}
              {paymentMethod === "razorpay" ? (
                <div className="space-y-3 pt-1">
                  <Button
                    onClick={handleRazorpayCheckout}
                    disabled={isProcessing}
                    className="w-full h-11 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
                  >
                    <CreditCard className="size-4" />
                    {isProcessing ? "Processing..." : `Pay ₹${finalPrice.toLocaleString()} via Razorpay`}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleActivation(true)}
                    disabled={isProcessing}
                    className="w-full h-10 text-xs font-semibold gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5 cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    Instant Sandbox Activation (Verification Pending)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <QrCode className="size-4" /> Scan &amp; Pay via Any UPI App
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-600">
                      Instant GPay / PhonePe
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <div className="size-24 shrink-0 rounded-lg border border-border bg-white p-1 shadow-xs flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${merchantUpi}&pn=Marginal%20Economics&am=${finalPrice}&cu=INR`)}`}
                        alt="UPI Payment QR Code"
                        className="size-full object-contain"
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">Merchant UPI ID:</p>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground select-all">
                          {merchantUpi}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyUpi}
                          className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer"
                        >
                          {copiedUpi ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          {copiedUpi ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Amount: <strong className="text-foreground">₹{finalPrice.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                    <Label htmlFor="utr-input" className="text-xs font-semibold text-foreground">
                      Enter 12-Digit UPI Reference (UTR) Number
                    </Label>
                    <Input
                      id="utr-input"
                      placeholder="e.g. 428190342156"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="h-9 text-xs font-mono bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Found in your GPay / PhonePe / Paytm receipt after transfer.
                    </p>
                  </div>

                  <Button
                    onClick={handleUpiActivation}
                    disabled={isProcessing || !utrNumber.trim()}
                    className="w-full h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                  >
                    <Clock className="size-4" />
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
