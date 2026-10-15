/**
 * Dynamic Pricing Plans configuration for Cambridge 9708 Economics.
 * Default tiers with prices, monthly essay quotas, live credits, and feature flags.
 */

export interface PricingTierConfig {
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualEquivalentMonthly: number;
  savePct: number;
  essaysPerMonth: number;
  liveCredits: number;
  hasExperimentalLabs: boolean;
  features: string[];
}

export interface PlatformPricingPlans {
  foundation: PricingTierConfig;
  pro: PricingTierConfig;
  mastery: PricingTierConfig;
  elite: PricingTierConfig;
}

export const DEFAULT_PRICING_PLANS: PlatformPricingPlans = {
  foundation: {
    name: "Foundation Scholar",
    tagline: "Accessible entry point: less than a coffee, zero friction.",
    monthlyPrice: 149,
    annualPrice: 1199,
    annualEquivalentMonthly: 99,
    savePct: 33,
    essaysPerMonth: 10,
    liveCredits: 30,
    hasExperimentalLabs: false,
    features: [
      "10 Cambridge Graded Essays / month",
      "Daily Live Examiner Session (30m AI coaching per session)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers",
    ],
  },
  pro: {
    name: "Pro Accelerator",
    tagline: "The benchmark for serious Cambridge candidates studying year-round.",
    monthlyPrice: 399,
    annualPrice: 3599,
    annualEquivalentMonthly: 299,
    savePct: 25,
    essaysPerMonth: 30,
    liveCredits: 75,
    hasExperimentalLabs: false,
    features: [
      "30 Cambridge Graded Essays / month",
      "Daily Live Examiner Coach (45m official exam timing AI coaching)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Sub-second Cambridge AO Sentence Diagnostics & Causal Chains",
      "Perfect Essay Generator (AI Model Answers)",
      "Dual-Model Principal Examiner Arbitration",
      "Real-time Diagram Integration Suggestions",
      "All Foundation features included",
    ],
  },
  mastery: {
    name: "A* Mastery Sprint",
    tagline: "Peak revision powerhouse for Oct/Nov & May/June exam series.",
    monthlyPrice: 599,
    annualPrice: 5999,
    annualEquivalentMonthly: 499,
    savePct: 17,
    essaysPerMonth: 75,
    liveCredits: 150,
    hasExperimentalLabs: true,
    features: [
      "★ Early Access to Experimental Labs (Diagram CAD & Paper Predictor)",
      "75 Cambridge Graded Essays / month",
      "Exam Sprint Live Examiner (60m extended AI coaching, priority queue)",
      "Unlimited Instant In-Browser Grammar & Mechanics Checks",
      "Handwritten Essay OCR Scanning (Photo Uploads)",
      "Holistic Review Panel & Syllabus Weakness Heatmap",
      "Level 4 & 5 Evaluative Refinement Engine",
      "All Pro features included",
    ],
  },
  elite: {
    name: "Cambridge Elite Pass",
    tagline: "VIP all-inclusive pass for complete syllabus and exam dominance.",
    monthlyPrice: 999,
    annualPrice: 9599,
    annualEquivalentMonthly: 799,
    savePct: 20,
    essaysPerMonth: 9999,
    liveCredits: 999,
    hasExperimentalLabs: true,
    features: [
      "★ Full Experimental Labs Access (CAD Engine, Paper Predictor & Preview Suites)",
      "Unlimited Cambridge Graded Essays & Reworks",
      "Unlimited 24/7 Live Examiner Sessions (90m sprint revision AI coaching per session)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Dedicated High-Speed Flash Acceleration Queue",
      "Bespoke Past Paper Mock Series Generation",
      "Personalized Examiner Video & Audio Commentary",
      "Direct 1-on-1 examiner support channel",
    ],
  },
};

export const FREE_STARTER_TIER = {
  id: "free",
  name: "Free Starter",
  tagline: "Instant start: try Cambridge 9708 examiner marking risk-free.",
  price: "₹0",
  period: "Lifetime",
  quota: "2 Graded Essays (Lifetime) · 30-Day MCQ",
  badge: "Get Started Free",
  features: [
    "2 Full Cambridge Graded Essays (Lifetime)",
    "30-Day Full MCQ Past Paper Access with Explanations",
    "Unlimited Instant In-Browser Grammar & Economics Terminology Checks",
    "Full AO1, AO2, AO3 Diagnostic Reports",
    "Cambridge Definitions Hub & Drills",
  ],
};
