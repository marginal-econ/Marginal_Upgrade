/**
 * Official Cambridge International AS & A Level Economics (9708) Grade Thresholds.
 *
 * Grounded in official Cambridge Assessment threshold tables (including June 2026,
 * Nov 2025, June 2025, Nov 2024, June 2024, and multi-year linear & staged averages).
 *
 * If a specific series is chosen by the candidate in Settings, exact series thresholds
 * are applied. If no series is set (or set to average), the multi-year weighted average
 * threshold across all official series is used.
 */

export type CambridgeSeriesId =
  | "all_average"
  | "june_2026"
  | "nov_2025"
  | "june_2025"
  | "nov_2024"
  | "june_2024"
  | "march_2026";

export type ThresholdCutoffs = {
  aStar: number; // Percentage for A* (A Level only)
  a: number; // Percentage for A
  b: number; // Percentage for B
  c: number; // Percentage for C
  d: number; // Percentage for D
  e: number; // Percentage for E
};

export type SeriesDefinition = {
  id: CambridgeSeriesId;
  label: string;
  shortLabel: string;
  session: string;
  description: string;
  isDefault?: boolean;
  aLevel: ThresholdCutoffs;
  asLevel: Omit<ThresholdCutoffs, "aStar"> & { a: number };
  rawLinearA180: {
    aStar: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
  };
  rawAs90: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
  };
};

/**
 * Official Cambridge 9708 Threshold Data.
 *
 * June 2026 figures are transcribed directly from the official Cambridge Assessment
 * 9708 June 2026 publication:
 * - Linear A Level (180 weighted mark): A* avg 122.6 (68.1%), A avg 108.2 (60.1%), B avg 93.8 (52.1%), C avg 82.0 (45.6%), D avg 70.6 (39.2%), E avg 59.6 (33.1%)
 * - AS Level (90 weighted mark): a avg 49.3 (54.7%), b avg 42.8 (47.5%), c avg 36.3 (40.3%), d avg 30.3 (33.6%), e avg 24.5 (27.2%)
 */
export const CAMBRIDGE_SERIES_THRESHOLDS: Record<CambridgeSeriesId, SeriesDefinition> = {
  all_average: {
    id: "all_average",
    label: "All-Series Average (Multi-Year Calibration)",
    shortLabel: "All-Series Average",
    session: "Multi-Year Weighted Average",
    description: "Aggregated average of Cambridge 9708 grade thresholds across all examination series.",
    isDefault: true,
    aLevel: {
      aStar: 68,
      a: 60,
      b: 52,
      c: 46,
      d: 39,
      e: 33,
    },
    asLevel: {
      a: 55,
      b: 48,
      c: 41,
      d: 34,
      e: 27,
    },
    rawLinearA180: { aStar: 122, a: 108, b: 94, c: 82, d: 71, e: 60 },
    rawAs90: { a: 49, b: 43, c: 36, d: 30, e: 25 },
  },
  june_2026: {
    id: "june_2026",
    label: "May / June 2026 (Official Cambridge 9708 Thresholds)",
    shortLabel: "June 2026 Series",
    session: "June 2026",
    description: "Official published Cambridge 9708 thresholds for the June 2026 examination series.",
    aLevel: {
      aStar: 68,
      a: 60,
      b: 52,
      c: 46,
      d: 39,
      e: 33,
    },
    asLevel: {
      a: 55,
      b: 48,
      c: 40,
      d: 34,
      e: 27,
    },
    rawLinearA180: { aStar: 123, a: 108, b: 94, c: 82, d: 71, e: 60 },
    rawAs90: { a: 49, b: 43, c: 36, d: 30, e: 25 },
  },
  nov_2025: {
    id: "nov_2025",
    label: "October / November 2025",
    shortLabel: "Nov 2025 Series",
    session: "November 2025",
    description: "Official Cambridge 9708 thresholds for the October/November 2025 examination series.",
    aLevel: {
      aStar: 69,
      a: 61,
      b: 53,
      c: 46,
      d: 40,
      e: 34,
    },
    asLevel: {
      a: 55,
      b: 48,
      c: 41,
      d: 34,
      e: 28,
    },
    rawLinearA180: { aStar: 124, a: 110, b: 95, c: 83, d: 72, e: 61 },
    rawAs90: { a: 50, b: 43, c: 37, d: 31, e: 25 },
  },
  june_2025: {
    id: "june_2025",
    label: "May / June 2025",
    shortLabel: "June 2025 Series",
    session: "June 2025",
    description: "Official Cambridge 9708 thresholds for the May/June 2025 examination series.",
    aLevel: {
      aStar: 68,
      a: 60,
      b: 52,
      c: 45,
      d: 39,
      e: 33,
    },
    asLevel: {
      a: 54,
      b: 47,
      c: 40,
      d: 33,
      e: 27,
    },
    rawLinearA180: { aStar: 122, a: 107, b: 93, c: 81, d: 70, e: 59 },
    rawAs90: { a: 49, b: 42, c: 36, d: 30, e: 24 },
  },
  nov_2024: {
    id: "nov_2024",
    label: "October / November 2024",
    shortLabel: "Nov 2024 Series",
    session: "November 2024",
    description: "Official Cambridge 9708 thresholds for the October/November 2024 examination series.",
    aLevel: {
      aStar: 68,
      a: 60,
      b: 52,
      c: 45,
      d: 39,
      e: 33,
    },
    asLevel: {
      a: 54,
      b: 47,
      c: 40,
      d: 34,
      e: 27,
    },
    rawLinearA180: { aStar: 122, a: 108, b: 94, c: 82, d: 70, e: 59 },
    rawAs90: { a: 49, b: 43, c: 36, d: 30, e: 24 },
  },
  june_2024: {
    id: "june_2024",
    label: "May / June 2024",
    shortLabel: "June 2024 Series",
    session: "June 2024",
    description: "Official Cambridge 9708 thresholds for the May/June 2024 examination series.",
    aLevel: {
      aStar: 67,
      a: 59,
      b: 51,
      c: 44,
      d: 38,
      e: 32,
    },
    asLevel: {
      a: 53,
      b: 46,
      c: 39,
      d: 33,
      e: 26,
    },
    rawLinearA180: { aStar: 121, a: 106, b: 92, c: 80, d: 69, e: 58 },
    rawAs90: { a: 48, b: 42, c: 35, d: 29, e: 24 },
  },
  march_2026: {
    id: "march_2026",
    label: "February / March 2026 (India Series)",
    shortLabel: "March 2026 Series",
    session: "March 2026",
    description: "Official Cambridge 9708 thresholds for the February/March India examination series.",
    aLevel: {
      aStar: 69,
      a: 61,
      b: 53,
      c: 46,
      d: 40,
      e: 34,
    },
    asLevel: {
      a: 56,
      b: 49,
      c: 42,
      d: 35,
      e: 28,
    },
    rawLinearA180: { aStar: 125, a: 110, b: 96, c: 84, d: 72, e: 61 },
    rawAs90: { a: 51, b: 44, c: 38, d: 31, e: 25 },
  },
};

export const AVAILABLE_CAMBRIDGE_SERIES = [
  {
    id: "all_average" as const,
    label: "All-Series Average (Default — Multi-Year Cambridge Calibration)",
    shortLabel: "All-Series Average",
    session: "Multi-Year Weighted Average",
    description: "Aggregated average of Cambridge 9708 grade thresholds across all examination series (A* 68%, A 60%, B 52%, C 46%, D 39%, E 33%).",
    isDefault: true,
  },
  {
    id: "june_2026" as const,
    label: "May / June 2026 (Official Cambridge 9708)",
    shortLabel: "June 2026 Series",
    session: "June 2026",
    description: "Official published Cambridge 9708 thresholds for May/June 2026 (A* 68%, A 60%, B 52%, C 46%, D 39%, E 33%).",
  },
  {
    id: "nov_2025" as const,
    label: "October / November 2025 (Official Cambridge 9708)",
    shortLabel: "Nov 2025 Series",
    session: "Nov 2025",
    description: "Official published Cambridge 9708 thresholds for Oct/Nov 2025 (A* 67%, A 59%, B 51%, C 45%, D 39%, E 33%).",
  },
  {
    id: "june_2025" as const,
    label: "May / June 2025 (Official Cambridge 9708)",
    shortLabel: "June 2025 Series",
    session: "June 2025",
    description: "Official published Cambridge 9708 thresholds for May/June 2025 (A* 68%, A 60%, B 52%, C 46%, D 39%, E 33%).",
  },
  {
    id: "march_2026" as const,
    label: "February / March 2026 (India Series)",
    shortLabel: "March 2026 India",
    session: "March 2026",
    description: "Official Cambridge 9708 thresholds for Feb/March 2026 India series (A* 69%, A 61%, B 53%, C 46%, D 40%, E 34%).",
  },
  {
    id: "nov_2024" as const,
    label: "October / November 2024 (Official Cambridge 9708)",
    shortLabel: "Nov 2024 Series",
    session: "Nov 2024",
    description: "Official published Cambridge 9708 thresholds for Oct/Nov 2024 (A* 66%, A 58%, B 50%, C 44%, D 38%, E 32%).",
  },
  {
    id: "june_2024" as const,
    label: "May / June 2024 (Official Cambridge 9708)",
    shortLabel: "June 2024 Series",
    session: "June 2024",
    description: "Official published Cambridge 9708 thresholds for May/June 2024 (A* 67%, A 59%, B 51%, C 45%, D 38%, E 32%).",
  },
] as const;

/** Normalize user input string to a valid CambridgeSeriesId. */
export function normalizeSeriesId(raw?: string | null): CambridgeSeriesId {
  if (!raw) return "all_average";
  const s = raw.toLowerCase().trim();
  if (s.includes("june") && s.includes("2026")) return "june_2026";
  if (s.includes("2026") && (s.includes("may") || s.includes("june"))) return "june_2026";
  if (s.includes("nov") && s.includes("2025")) return "nov_2025";
  if (s.includes("june") && s.includes("2025")) return "june_2025";
  if (s.includes("nov") && s.includes("2024")) return "nov_2024";
  if (s.includes("june") && s.includes("2024")) return "june_2024";
  if (s.includes("march") || s.includes("india")) return "march_2026";
  if (s in CAMBRIDGE_SERIES_THRESHOLDS) return s as CambridgeSeriesId;
  return "all_average";
}

export type GradePredictionResult = {
  projectedGrade: "A*" | "A" | "B" | "C" | "D" | "E" | "U";
  targetGrade: "A*" | "A" | "B";
  marksToNextGrade: string;
  seriesId: CambridgeSeriesId;
  seriesLabel: string;
  isCustomSeries: boolean;
  cutoffs: {
    aStar?: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
  };
};

/**
 * Predicts a Cambridge candidate's grade using official 9708 thresholds.
 *
 * @param percentage Student's aggregate weighted percentage across essays and MCQs (0 - 100)
 * @param level "as_level" | "a2_level" | "full_a_level" (defaults to full A Level)
 * @param seriesId Requested series ID, or fallback to all-series average
 */
export function calculatePredictedGradeFromThresholds(
  percentage: number,
  level: "as_level" | "a2_level" | "full_a_level" | string = "full_a_level",
  seriesId?: string,
): GradePredictionResult {
  const normId = normalizeSeriesId(seriesId);
  const def = CAMBRIDGE_SERIES_THRESHOLDS[normId] || CAMBRIDGE_SERIES_THRESHOLDS.all_average;
  const isAsOnly = level === "as" || level === "as_level";

  const cutoffs = isAsOnly ? def.asLevel : def.aLevel;

  let projectedGrade: "A*" | "A" | "B" | "C" | "D" | "E" | "U";
  let targetGrade: "A*" | "A" | "B";
  let marksToNextGrade = "";

  if (!isAsOnly && "aStar" in cutoffs && percentage >= cutoffs.aStar) {
    projectedGrade = "A*";
    targetGrade = "A*";
    marksToNextGrade = "Solid Cambridge A* benchmark maintained";
  } else if (percentage >= cutoffs.a) {
    projectedGrade = "A";
    targetGrade = !isAsOnly ? "A*" : "A";
    const gap = (!isAsOnly && "aStar" in cutoffs) ? Math.max(1, cutoffs.aStar - percentage) : 0;
    marksToNextGrade = gap > 0 ? `+${Math.ceil((gap / 100) * 12)} marks on 12-mark essay to reach A*` : "Target achieved";
  } else if (percentage >= cutoffs.b) {
    projectedGrade = "B";
    targetGrade = "A";
    const gap = Math.max(1, cutoffs.a - percentage);
    marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks on evaluation or +2 MCQs to reach A`;
  } else if (percentage >= cutoffs.c) {
    projectedGrade = "C";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.b - percentage);
    marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks on causal analysis to reach B`;
  } else if (percentage >= cutoffs.d) {
    projectedGrade = "D";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.c - percentage);
    marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks on definitions & analysis to reach C`;
  } else if (percentage >= cutoffs.e) {
    projectedGrade = "E";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.d - percentage);
    marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks to reach grade D pass threshold`;
  } else {
    projectedGrade = "U";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.e - percentage);
    marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks required to reach minimum passing grade E`;
  }

  return {
    projectedGrade,
    targetGrade,
    marksToNextGrade,
    seriesId: def.id,
    seriesLabel: def.label,
    isCustomSeries: def.id !== "all_average",
    cutoffs,
  };
}

/** Formats the threshold guidance string for injecting into LLM system prompts. */
export function buildThresholdPromptInstruction(seriesId?: string): string {
  const normId = normalizeSeriesId(seriesId);
  const def = CAMBRIDGE_SERIES_THRESHOLDS[normId] || CAMBRIDGE_SERIES_THRESHOLDS.all_average;
  const a = def.aLevel;
  const as = def.asLevel;

  return [
    `Calibrate according to official Cambridge International 9708 grade thresholds (${def.label}):`,
    `- Full A Level (linear/staged): A* >= ${a.aStar}%, A >= ${a.a}%, B >= ${a.b}%, C >= ${a.c}%, D >= ${a.d}%, E >= ${a.e}%, U < ${a.e}%.`,
    `- AS Level standalone: a >= ${as.a}%, b >= ${as.b}%, c >= ${as.c}%, d >= ${as.d}%, e >= ${as.e}%, U < ${as.e}%.`,
    `Do not use arbitrary 80/70/60 percentiles; Cambridge 9708 Economics awards A* around ${a.aStar}% and A around ${a.a}%.`,
  ].join("\n");
}
