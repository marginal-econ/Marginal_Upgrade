/**
 * Dynamic Pricing Plans configuration for Cambridge 9708 Economics.
 * Default tiers with prices, monthly essay quotas, live credits, and feature flags.
 */

export interface PlanRestrictions {
  // ── Segregation 1: AI Evaluation & Diagnostic Engine ──
  allowSentenceAnalysis?: boolean; // Sub-second AO1/AO2/AO3 sentence diagnostics & causal chains
  allowEvaluativeEngine?: boolean; // Level 4 & 5 Evaluative Refinement Engine (synoptic balance)
  allowArbitration: boolean; // Dual-Examiner Principal Consensus Arbitration
  allowDefinitionsDrills?: boolean; // Cambridge Definitions Hub & Vocabulary flashcard drills

  // ── Segregation 2: Exam Revision & Generation Studio ──
  allowHandwritingOcr: boolean; // Handwritten Essay OCR Photo Scanning (Camera/Upload)
  allowModelAnswers: boolean; // Perfect Model Answer Generator (20/20 Exemplars)
  allowDiagramStudio: boolean; // Interactive Cambridge Diagram Studio & Drills
  allowPdfExport?: boolean; // Downloadable Official Diagnostic PDF Reports

  // ── Segregation 3: Live Examiner Coaching & Classrooms ──
  allowLiveExaminer?: boolean; // Real-Time Live Examiner Voice & Timed Coaching Sessions
  allowClassrooms: boolean; // School Classrooms & Teacher Assignment Integration
  allowDirectExaminerSupport?: boolean; // Priority 1-on-1 pedagogical review desk

  // ── Segregation 4: Quotas, Speed & Infrastructure ──
  allowPriorityQueue: boolean; // Dedicated High-Speed Flash Acceleration Queue
  mcqAccessLevel: "full" | "topics_only" | "locked"; // Past Paper MCQ Exam Access Policy
  maxEssayWords: number; // 0 = unlimited
  dailyEssayLimit?: number; // 0 = unlimited
}

export interface PricingTierConfig {
  id?: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualEquivalentMonthly: number;
  savePct: number;
  essaysPerMonth: number;
  liveCredits: number;
  hasExperimentalLabs: boolean;
  isPublic?: boolean; // false = hidden / unlisted / admin-only
  badge?: string;
  restrictions?: PlanRestrictions;
  features: string[];
}

export type PlatformPricingPlans = Record<string, PricingTierConfig>;

export const DEFAULT_RESTRICTIONS: PlanRestrictions = {
  // ── Segregation 1: AI Evaluation Engine ──
  allowSentenceAnalysis: true,
  allowEvaluativeEngine: false,
  allowArbitration: false,
  allowDefinitionsDrills: true,

  // ── Segregation 2: Revision Studio ──
  allowHandwritingOcr: false,
  allowModelAnswers: false,
  allowDiagramStudio: true,
  allowPdfExport: true,

  // ── Segregation 3: Live Coaching & Classrooms ──
  allowLiveExaminer: true,
  allowClassrooms: false,
  allowDirectExaminerSupport: false,

  // ── Segregation 4: Quotas & Infrastructure ──
  allowPriorityQueue: false,
  mcqAccessLevel: "full",
  maxEssayWords: 2000,
  dailyEssayLimit: 0,
};

export const DEFAULT_PRICING_PLANS: PlatformPricingPlans = {
  foundation: {
    id: "foundation",
    name: "Foundation Scholar",
    tagline: "Accessible entry point: less than a coffee, flat ₹99/mo for 8 essays & 2 Live Examiner sessions.",
    monthlyPrice: 99,
    annualPrice: 1188,
    annualEquivalentMonthly: 99,
    savePct: 0,
    essaysPerMonth: 8,
    liveCredits: 2,
    hasExperimentalLabs: false,
    isPublic: true,
    badge: "Most Accessible",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: false,
      allowArbitration: false,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: false,
      allowModelAnswers: false,
      allowDiagramStudio: true,
      allowPdfExport: false,
      allowLiveExaminer: true,
      allowClassrooms: false,
      allowDirectExaminerSupport: false,
      allowPriorityQueue: false,
      mcqAccessLevel: "full",
      maxEssayWords: 1500,
      dailyEssayLimit: 0,
    },
    features: [
      "8 Cambridge Graded Essays / month",
      "2 Live Examiner Credits / month (25 min Real-time AI Coaching)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers",
    ],
  },
  scholar_plus: {
    id: "scholar_plus",
    name: "Scholar Plus",
    tagline: "Focused exam booster: flat ₹199/mo for 15 essays & 4 Live Examiner sessions.",
    monthlyPrice: 199,
    annualPrice: 1999,
    annualEquivalentMonthly: 166,
    savePct: 16,
    essaysPerMonth: 15,
    liveCredits: 4,
    hasExperimentalLabs: false,
    isPublic: true,
    badge: "Great Value",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: false,
      allowArbitration: false,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: false,
      allowModelAnswers: false,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: true,
      allowDirectExaminerSupport: false,
      allowPriorityQueue: false,
      mcqAccessLevel: "full",
      maxEssayWords: 2000,
      dailyEssayLimit: 0,
    },
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
  pro: {
    id: "pro",
    name: "Pro Accelerator",
    tagline: "The benchmark for serious Cambridge candidates: 25 essays & 8 Live Examiner sessions.",
    monthlyPrice: 399,
    annualPrice: 3499,
    annualEquivalentMonthly: 291,
    savePct: 27,
    essaysPerMonth: 25,
    liveCredits: 8,
    hasExperimentalLabs: false,
    isPublic: true,
    badge: "Most Popular",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: false,
      allowArbitration: true,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: false,
      allowModelAnswers: true,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: true,
      allowDirectExaminerSupport: false,
      allowPriorityQueue: false,
      mcqAccessLevel: "full",
      maxEssayWords: 3000,
      dailyEssayLimit: 0,
    },
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
  mastery: {
    id: "mastery",
    name: "A* Mastery Sprint",
    tagline: "Peak revision powerhouse for Oct/Nov & May/June exam series: 50 essays & 14 Live Examiner sessions.",
    monthlyPrice: 699,
    annualPrice: 5999,
    annualEquivalentMonthly: 499,
    savePct: 28,
    essaysPerMonth: 50,
    liveCredits: 14,
    hasExperimentalLabs: false,
    isPublic: true,
    badge: "A* Target Cohort",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: true,
      allowArbitration: true,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: true,
      allowModelAnswers: true,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: true,
      allowDirectExaminerSupport: true,
      allowPriorityQueue: true,
      mcqAccessLevel: "full",
      maxEssayWords: 4000,
      dailyEssayLimit: 0,
    },
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
  elite: {
    id: "elite",
    name: "Cambridge Elite Pass",
    tagline: "VIP all-inclusive pass for complete syllabus dominance: 75 essays & 22 Live Examiner sessions.",
    monthlyPrice: 999,
    annualPrice: 8999,
    annualEquivalentMonthly: 749,
    savePct: 25,
    essaysPerMonth: 75,
    liveCredits: 22,
    hasExperimentalLabs: false,
    isPublic: true,
    badge: "VIP All-Access Pass",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: true,
      allowArbitration: true,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: true,
      allowModelAnswers: true,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: true,
      allowDirectExaminerSupport: true,
      allowPriorityQueue: true,
      mcqAccessLevel: "full",
      maxEssayWords: 0,
      dailyEssayLimit: 0,
    },
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

  // ── Pre-configured Plans (Can be toggled Public or Unlisted / Private at any time) ──
  revision_sprint: {
    id: "revision_sprint",
    name: "Revision Sprint Pass",
    tagline: "Targeted 30-day exam preparation sprint with focused essay and Live Examiner quotas.",
    monthlyPrice: 249,
    annualPrice: 1999,
    annualEquivalentMonthly: 166,
    savePct: 33,
    essaysPerMonth: 20,
    liveCredits: 6,
    hasExperimentalLabs: true,
    isPublic: true, // 🌐 Public by default
    badge: "30-Day Exam Sprint",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: true,
      allowArbitration: false,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: true,
      allowModelAnswers: true,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: false,
      allowDirectExaminerSupport: false,
      allowPriorityQueue: false,
      mcqAccessLevel: "full",
      maxEssayWords: 2500,
      dailyEssayLimit: 0,
    },
    features: [
      "20 Cambridge Graded Essays / month",
      "6 Live Examiner Credits / month (30 min AI coaching)",
      "Handwritten Essay OCR Photo Scanning",
      "AI Model Answer Generator",
      "Interactive Economics Diagram Studio",
      "Self-Study Only (Classroom integration restricted)",
      "Standard Queue Processing",
    ],
  },
  institutional_scholar: {
    id: "institutional_scholar",
    name: "Institutional Partner Pass",
    tagline: "Bespoke tier for partner schools and tuition academies with full classroom collaboration.",
    monthlyPrice: 499,
    annualPrice: 3999,
    annualEquivalentMonthly: 333,
    savePct: 33,
    essaysPerMonth: 40,
    liveCredits: 12,
    hasExperimentalLabs: true,
    isPublic: true, // 🌐 Public by default
    badge: "School Partner",
    restrictions: {
      allowSentenceAnalysis: true,
      allowEvaluativeEngine: true,
      allowArbitration: true,
      allowDefinitionsDrills: true,
      allowHandwritingOcr: true,
      allowModelAnswers: true,
      allowDiagramStudio: true,
      allowPdfExport: true,
      allowLiveExaminer: true,
      allowClassrooms: true,
      allowDirectExaminerSupport: true,
      allowPriorityQueue: true,
      mcqAccessLevel: "full",
      maxEssayWords: 4500,
      dailyEssayLimit: 0,
    },
    features: [
      "40 Cambridge Graded Essays / month & re-marks",
      "12 Live Examiner Credits / month (40 min extended sessions)",
      "Full School Classroom & Teacher Assignment Integration",
      "Dual-Model Principal Examiner Arbitration",
      "Priority High-Speed Flash Grading Queue",
      "Handwritten Essay OCR & Diagram Studio",
    ],
  },
};

export const FREE_STARTER_TIER = {
  id: "free",
  name: "Free Community Edition",
  tagline: "Instant start: grade Cambridge 9708 essays with zero limits.",
  price: "₹0",
  period: "Free Access",
  quota: "Unlimited Graded Essays · Full MCQ Access",
  badge: "100% Free Access",
  features: [
    "Unlimited Cambridge Graded Essays (No Limits)",
    "Full Cambridge Past Paper MCQ Access with Timers & Resume",
    "Unlimited Instant In-Browser Grammar & Economics Terminology Checks",
    "Full AO1, AO2, AO3 Diagnostic Reports",
    "Cambridge Definitions Hub, Diagram Studio & Drills",
  ],
};
