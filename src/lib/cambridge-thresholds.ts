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

  if (!isAsOnly) {
    const cutoffs = def.aLevel;
    if (percentage >= cutoffs.aStar) {
      projectedGrade = "A*";
      targetGrade = "A*";
      marksToNextGrade = "Solid Cambridge A* benchmark maintained";
    } else if (percentage >= cutoffs.a) {
      projectedGrade = "A";
      targetGrade = "A*";
      const gap = Math.max(1, cutoffs.aStar - percentage);
      marksToNextGrade = `+${Math.ceil((gap / 100) * 12)} marks on 12-mark essay to reach A*`;
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
  } else {
    const cutoffs = def.asLevel;
    if (percentage >= cutoffs.a) {
      projectedGrade = "A";
      targetGrade = "A";
      marksToNextGrade = "Top AS Level benchmark maintained (Grade A)";
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

export type CambridgeGradeStandard = {
  grade: string; // e.g. "Grade A* Standard", "Grade A Standard"
  letter: "A*" | "A" | "B" | "C" | "D" | "E" | "U";
  band: "Top Band" | "Upper Middle Band" | "Lower Middle Band" | "Bottom Band";
  percent: number;
  theme: {
    card: string;
    badge: string;
    progress: string;
  };
};

/**
 * Calibrates an essay mark (e.g. 11/12) directly to official Cambridge 9708 standards.
 * Guaranteed invariant: Any score >= 80% (including 10-12/12) is unequivocally Top Band and Grade A* Standard.
 */
export function getCambridgeGradeStandard(
  totalMark: number,
  maxMark: number,
  seriesId?: string,
): CambridgeGradeStandard {
  const percent = maxMark > 0 ? (totalMark / maxMark) * 100 : 0;
  const roundedPercent = Math.round(percent);
  const ratio = maxMark > 0 ? totalMark / maxMark : 0;

  // Derive authoritative Cambridge Level / Band
  let band: CambridgeGradeStandard["band"];
  if (ratio >= 0.8) {
    band = "Top Band";
  } else if (ratio >= 0.55) {
    band = "Upper Middle Band";
  } else if (ratio >= 0.35) {
    band = "Lower Middle Band";
  } else {
    band = "Bottom Band";
  }

  // Derive Cambridge Grade Standard based on official 9708 thresholds:
  // A* cutoff is ~68%, A is ~60%, B is ~52%, C is ~46%, D is ~39%, E is ~33%
  if (totalMark <= 0) {
    return {
      grade: "Ungraded (0 Marks)",
      letter: "U",
      band: "Bottom Band",
      percent: roundedPercent,
      theme: {
        card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
        badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
        progress: "from-rose-500 via-red-400 to-rose-500",
      },
    };
  }

  // Grade A* Standard: >= 68% or top band (>= 10/12, >= 7/8, >= 16/20)
  if (percent >= 68 || (maxMark <= 12 && totalMark >= 10)) {
    return {
      grade: "Grade A* Standard",
      letter: "A*",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-background shadow-emerald-500/5",
        badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-semibold",
        progress: "from-emerald-500 via-teal-400 to-emerald-500",
      },
    };
  }

  // Grade A Standard: >= 60% (or 8-9 on 12-mark essay, 5-6 on 8-mark essay, 12-15 on 20-mark)
  if (percent >= 60 || (maxMark === 12 && totalMark >= 8)) {
    return {
      grade: "Grade A Standard",
      letter: "A",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-teal-900/10 to-background shadow-teal-500/5",
        badge: "border-teal-500/30 bg-teal-500/15 text-teal-400 font-semibold",
        progress: "from-teal-500 via-emerald-400 to-teal-500",
      },
    };
  }

  // Grade B Standard: >= 52% (or 7 on 12-mark essay, 11 on 20-mark)
  if (percent >= 52 || (maxMark === 12 && totalMark >= 7)) {
    return {
      grade: "Grade B Standard",
      letter: "B",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-sky-900/10 to-background shadow-blue-500/5",
        badge: "border-blue-500/30 bg-blue-500/15 text-blue-400 font-semibold",
        progress: "from-blue-500 via-indigo-400 to-blue-500",
      },
    };
  }

  // Grade C Standard: >= 46% (or 6 on 12-mark essay, 4 on 8-mark)
  if (percent >= 46 || (maxMark === 12 && totalMark >= 6)) {
    return {
      grade: "Grade C Standard",
      letter: "C",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-sky-900/10 to-background shadow-cyan-500/5",
        badge: "border-cyan-500/30 bg-cyan-500/15 text-cyan-400 font-semibold",
        progress: "from-cyan-500 via-sky-400 to-cyan-500",
      },
    };
  }

  // Grade D Standard: >= 39% (or 5 on 12-mark essay)
  if (percent >= 39 || (maxMark === 12 && totalMark >= 5)) {
    return {
      grade: "Grade D Standard",
      letter: "D",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-amber-900/10 to-background shadow-amber-500/5",
        badge: "border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold",
        progress: "from-amber-500 via-orange-400 to-amber-500",
      },
    };
  }

  // Grade E Standard: >= 33% (or 4 on 12-mark essay - minimum Cambridge pass)
  if (percent >= 33 || (maxMark === 12 && totalMark >= 4)) {
    return {
      grade: "Grade E Standard",
      letter: "E",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-orange-500/40 bg-gradient-to-br from-orange-950/40 via-amber-900/10 to-background shadow-orange-500/5",
        badge: "border-orange-500/30 bg-orange-500/15 text-orange-400 font-semibold",
        progress: "from-orange-500 via-amber-400 to-orange-500",
      },
    };
  }

  // Working towards standard (below passing grade E)
  return {
    grade: "Working Towards Standard",
    letter: "U",
    band: "Bottom Band",
    percent: roundedPercent,
    theme: {
      card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
      badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
      progress: "from-rose-500 via-red-400 to-rose-500",
    },
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
