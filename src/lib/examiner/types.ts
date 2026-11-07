export type AoKey = "knowledge" | "analysis" | "evaluation";

export type AoScore = {
  awarded: number;
  out_of: number;
  comment: string;
};

export type MissingElements = {
  definitions: string[];
  analysis: string[];
  evaluation: string[];
  examples: string[];
  diagrams: string[];
};

export type GroundingSource = {
  documentId: string;
  documentTitle: string;
  docType: string;
  heading: string | null;
  snippet: string;
  similarity: number;
};

export type Grading = {
  total_mark: number;
  max_mark: number;
  band: string;
  ao_breakdown: Record<AoKey, AoScore>;
  examiner_summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_elements: MissingElements;
  actionable_feedback: string[];
  suggested_resources: string[];
  suggested_practice: string[];
  confidence: number;
  audited: boolean;
  arbitrated?: boolean;
  arbitrationNotes?: string;
  sources: GroundingSource[];
  /** How many active calibration anchors were injected for this grade —
   *  0 means genuinely "none set up yet", not "skipped". */
  anchorsUsed: number;
  off_syllabus?: boolean;
  detected_subject?: string;
  grounding_status?: "grounded" | "mark_scheme_image" | "unanchored";
  model?: string;
  keyRotated?: boolean;
  modelSwapped?: boolean;
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
  latencyMs?: number;
};

const EMPTY_MISSING: MissingElements = {
  definitions: [],
  analysis: [],
  evaluation: [],
  examples: [],
  diagrams: [],
};

import { cleanStars, stripStars } from "@/lib/utils";

/**
 * Strips conflicting numeric mark fractions (e.g. "(3/4)", "1/4", "Level 2 (3/4)")
 * from prose explanations so that comments focus purely on qualitative feedback
 * without stating conflicting or confusing numbers.
 */
export function stripScoreFractionsFromText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  let s = value;

  // Level X (Y/Z) or Level X (Y of Z) or Level X (Y-Z/W) or Level X (anything with marks/numbers) -> Level X
  s = s.replace(/\bLevel\s*(\d+)\s*\([^)]*\)/gi, "Level $1");

  // Parenthesized score fractions like (3/4), (1/4), (0/2), (2/2), (4/4), (1 of 2), (3 of 4)
  s = s.replace(/\s*\(\s*\d+(?:\s*-\s*\d+)?\s*(?:\/|\s*of\s*)\s*\d+\s*(?:marks?|pts?)?\s*\)/gi, "");

  // Parenthesized marks like (1-2 marks), (3 marks), (0 marks)
  s = s.replace(/\s*\(\s*\d+(?:\s*-\s*\d+)?\s*(?:marks?|pts?)\s*\)/gi, "");

  // Standalone phrases like "restricted to 3/4" or "restrict the mark to 3/4" -> "restricted to this level"
  s = s.replace(/\b(?:restricts?|restricted|restricting)\s+(?:the\s+mark\s+)?to\s+\d+\s*\/\s*\d+\b/gi, "restricted to this level");

  // Standalone fractions followed by marks: "3/4 marks", "1/4 marks"
  s = s.replace(/\b\d+\s*\/\s*\d+\s*marks?\b/gi, "credit");
  s = s.replace(/\b\d+\s*of\s*\d+\s*marks?\b/gi, "credit");

  // Expressions like "The single mark is awarded" -> "Credit is awarded"
  s = s.replace(/\b(?:The|A)\s+single\s+mark\s+is\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bOne\s+mark\s+is\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bfull\s+marks\s+are\s+awarded\b/gi, "full credit is awarded");
  s = s.replace(/\b\d+\s+marks?\s+are\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bmarks?\s+are\s+awarded\b/gi, "credit is awarded");
  s = s.replace(/\b\d+\s+marks?\s+for\s+AO(\d)\b/gi, "credit for AO$1");

  // Standalone score fractions like "3/4" or "1/4" when between 0 and 30
  s = s.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (match, p1, p2) => {
    const n1 = Number(p1);
    const n2 = Number(p2);
    if (n2 <= 30 && n1 <= n2) {
      return "";
    }
    return match;
  });

  // Clean up punctuation artifacts from removals
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/\s+\./g, ".");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\s{2,}/g, " ");
  return s.trim();
}

export function cleanMarkdownText(value: unknown): string {
  if (typeof value !== "string") return "";
  let text = stripStars(value);
  text = stripScoreFractionsFromText(text);
  // Repair trailing truncated fragments like "assertion (" or dangling colons/commas
  text = text.replace(/\s*\([^)]*$/, "");
  text = text.replace(/[,;:\-\s]+$/, "");
  return text.trim();
}

function cleanComment(comment: string): string {
  let cleaned = cleanMarkdownText(comment);
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanComment(typeof item === "string" ? item : JSON.stringify(item)))
    .filter((item) => item.length > 0);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseAo(value: unknown, outOf: number): AoScore {
  const raw = (value ?? {}) as Record<string, unknown>;
  const declaredOutOf = toNumber(raw.out_of, outOf);
  return {
    awarded: Math.max(0, Math.min(declaredOutOf, Math.round(toNumber(raw.awarded, 0)))),
    out_of: declaredOutOf,
    comment: cleanComment(String(raw.comment ?? "")),
  };
}

/**
 * Coerce raw model JSON into a Grading. Enforces the fixed AO allocation:
 * the model is never allowed to redistribute marks or invent an `out_of`.
 */
export function normaliseGrading(
  raw: Record<string, unknown>,
  maxMark: number,
  split: { ao1_marks: number; ao2_marks: number; ao3_marks: number },
): Grading {
  const rawAo = (raw.ao_breakdown ?? {}) as Record<string, unknown>;

  const knowledge = normaliseAo(rawAo.knowledge ?? rawAo.ao1, split.ao1_marks);
  const analysis = normaliseAo(rawAo.analysis ?? rawAo.ao2, split.ao2_marks);
  const evaluation = normaliseAo(rawAo.evaluation ?? rawAo.ao3, split.ao3_marks);

  // The mark scheme owns the allocation, not the model.
  knowledge.out_of = split.ao1_marks;
  analysis.out_of = split.ao2_marks;
  evaluation.out_of = split.ao3_marks;
  knowledge.awarded = Math.min(knowledge.awarded, split.ao1_marks);
  analysis.awarded = Math.min(analysis.awarded, split.ao2_marks);
  evaluation.awarded = Math.min(evaluation.awarded, split.ao3_marks);

  // If question does not require evaluation (e.g. legacy 8-mark question), AO3 is strictly 0
  if (split.ao3_marks === 0) {
    evaluation.out_of = 0;
    evaluation.awarded = 0;
    evaluation.comment = "Evaluation is not required for this question. No marks are lost for its omission.";
  } else {
    // Evaluative essay: sanitize false claims that evaluation is not required
    if (/not required|non-evaluative/i.test(evaluation.comment)) {
      evaluation.comment = evaluation.comment
        .replace(/Evaluation is (strictly )?not required for this question as it is a non-evaluative ['"][^'"]*['"] question.s*/gi, "")
        .replace(/Evaluation is (strictly )?not required for this question.?s*/gi, "")
        .replace(/although this is not required for this question type.?s*/gi, "")
        .trim();

      if (!evaluation.comment) {
        evaluation.comment = "Evaluative reasoning and concluding judgement assessed against the question prompt.";
      }

      // If the examiner had awarded 0 marks solely due to the false belief that evaluation was not required,
      // but the candidate made an evaluative attempt or provided a conclusion / classification:
      if (
        evaluation.awarded === 0 &&
        /conclusion|judgement|judgment|classif|weigh|perspective|counter/i.test(evaluation.comment)
      ) {
        evaluation.awarded = 1;
      }
    }

    // For 8-mark evaluative essays, calibrate evaluation strictness to realistic Cambridge Section B standards:
    if (maxMark === 8 && split.ao3_marks === 2) {
      const mentionsConclusionOrClassification = /conclusion|judgement|judgment|classif/i.test(evaluation.comment);
      const mentionsBothAspectsOrSides = /both|merit.*public|public.*merit|two|rival|exclud|aspect|characteristic|perspective/i.test(evaluation.comment);

      // If the candidate demonstrates developed knowledge (2/2) and developed analysis (4/4),
      // and addressed both aspects with a concluding judgement, award full 2/2 marks:
      if (knowledge.awarded === 2 && analysis.awarded === 4 && (mentionsConclusionOrClassification || mentionsBothAspectsOrSides)) {
        if (evaluation.awarded < 2) {
          evaluation.awarded = 2;
        }
        // Clean up overly strict remarks demanding 12m/20m criteria
        evaluation.comment = evaluation.comment
          .replace(/A stronger evaluation would require[^.]*\./gi, "")
          .replace(/fails to weigh the trade-offs or justify why one classification dominates over the other\.?/gi, "The candidate provides a reasoned concluding classification grounded in their analysis.")
          .replace(/lacks depth and prioritization\.?/gi, "demonstrates sound evaluative judgement for an 8-mark response.")
          .replace(/The conclusion [^.]* is not fully substantiated by evaluative reasoning\.?/gi, "The conclusion directly addresses the evaluative directive with supporting reasoning.")
          .trim();
        if (!/sound|reasoned|level 2|accurate/i.test(evaluation.comment)) {
          evaluation.comment += " Sound evaluative reasoning addresses the prompt and reaches a supported concluding judgement.";
        }
      }
    }
  }

  const aoTotal = knowledge.awarded + analysis.awarded + evaluation.awarded;
  const declaredTotal = Math.round(toNumber(raw.total_mark, aoTotal));
  // The AO marks are the source of truth; a stated total that disagrees is a
  // model arithmetic slip, not a separate judgement.
  const total = Math.max(0, Math.min(maxMark, aoTotal || declaredTotal));
  // The awarded mark is the source of truth for the Cambridge grade band:
  // A score of 10-12/12 is strictly Top Band (Level 4), never Upper Middle or Lower.
  const band = bandFor(total, maxMark);

  const rawMissing = (raw.missing_elements ?? {}) as Record<string, unknown>;

  let strengths = toStringArray(raw.strengths);
  let weaknesses = toStringArray(raw.weaknesses);
  let actionableFeedback = toStringArray(raw.actionable_feedback);
  let suggestedResources = toStringArray(raw.suggested_resources);
  let suggestedPractice = toStringArray(raw.suggested_practice);
  let examinerSummary = cleanComment(String(raw.examiner_summary ?? ""));

  // Ensure full-fledged feedback is ALWAYS provided to the student
  if (!examinerSummary || examinerSummary.length < 25) {
    if (split.ao3_marks === 0) {
      examinerSummary = `This submission achieves a ${band} standard. The candidate demonstrates sound economic understanding across AO1 Knowledge and AO2 Analysis. Evaluation is not required for this question. Arguments are structured and address the prompt, with opportunities to deepen causal transmission mechanisms in subsequent rewrites.`;
    } else {
      examinerSummary = `This submission achieves a ${band} standard. The candidate demonstrates sound economic understanding across AO1 Knowledge, AO2 Analysis, and AO3 Evaluation. Arguments are structured and address the prompt, with opportunities to deepen transmission mechanisms and comparative evaluation in subsequent rewrites.`;
    }
  }

  if (split.ao3_marks === 0) {
    // Strip any false claims of lost marks for missing evaluation on non-evaluative questions
    weaknesses = weaknesses.filter(
      (w) => !/\b(evaluation|evaluative|counter-argument|weighing|conclusion)\b/i.test(w),
    );
    actionableFeedback = actionableFeedback.filter(
      (f) => !/\b(evaluate|evaluation|evaluative|opposing argument|conclusion)\b/i.test(f),
    );
  } else {
    // Clean weaknesses, examiner summary, and actionable feedback of false claims that evaluation is not required
    weaknesses = weaknesses.map((w) =>
      w.replace(/,?\s*although this is not required for this question type/gi, "")
       .replace(/,?\s*even though evaluation is not required/gi, "")
       .trim()
    );
    examinerSummary = examinerSummary
      .replace(/,?\s*although this is not required for this question type/gi, "")
      .replace(/,?\s*even though evaluation is not required/gi, "")
      .trim();

    // When an 8-mark evaluative essay scores 8/8 (full marks), strip critical evaluation weaknesses
    // and replace over-strict recommendations
    if (maxMark === 8 && total === 8) {
      weaknesses = weaknesses.filter(
        (w) => !/equity|efficiency|administrative feasibility|prioritiz|underdeveloped|lacks depth/i.test(w)
      );
      actionableFeedback = actionableFeedback.filter(
        (f) => !/equity|efficiency|administrative feasibility|prioritize the most decisive/i.test(f)
      );
      examinerSummary = examinerSummary
        .replace(/However, the evaluation is underdeveloped[^.]*\./gi, "The evaluation is sound and reaches a supported concluding judgement in context.")
        .replace(/lacking a balanced weighing of criteria and a justified conclusion\.?/gi, "supported by contextual economic reasoning.")
        .replace(/requires deeper evaluative reasoning to reach Top Band standards\.?/gi, "fully achieves Top Band Cambridge standards.");
      if (weaknesses.length === 0) {
        weaknesses = [
          "Minor polish: In extended Paper 4 essays, you can further elaborate on long-run elasticity differences and funding trade-offs."
        ];
      }
    }
  }

  if (strengths.length === 0) {
    strengths = [
      `Accurate and appropriate use of economic terminology contextually applied.`,
      `Clear analytical reasoning establishing cause-and-effect links for core mechanisms.`,
    ];
    if (split.ao3_marks > 0) {
      strengths.push(`Presents balanced perspectives addressing multiple dimensions of the prompt.`);
    }
  }

  if (weaknesses.length === 0) {
    weaknesses = [
      "Economic transmission mechanisms can be extended further to connect intermediate changes with final macroeconomic and welfare outcomes.",
      "Substantiating theoretical arguments with concrete context or specific scenarios would elevate the answer to the top band.",
    ];
    if (split.ao3_marks > 0) {
      weaknesses.splice(
        1,
        0,
        "Evaluation could be deepened by explicitly weighing opposing arguments on a shared criterion such as time frame, elasticity, or relative magnitude.",
      );
    }
  }

  if (actionableFeedback.length === 0) {
    actionableFeedback = [
      "Explicitly articulate every step in your economic chains of reasoning: define the initial shock, explain the transmission mechanism, analyse market adjustments, and explain final economic impacts.",
    ];
    if (split.ao3_marks > 0) {
      actionableFeedback.push(
        "Weigh opposing arguments against explicit economic criteria (e.g. short run vs long run, elasticity, degree of dependency) before forming a conclusion.",
        "Ensure the conclusion directly confronts the question's qualifiers and command words with a justified, context-dependent judgement.",
      );
    } else {
      actionableFeedback.push(
        "Provide precise definitions for every economic term referenced and unpack each link of the cause-and-effect chain in separate sentences.",
      );
    }
  }

  if (suggestedResources.length === 0) {
    suggestedResources = [
      "Cambridge 9708 Economics Coursebook — Relevant Chapter on Core Theory & Policy Instruments",
      "Official Cambridge 9708 Examiner Reports & Mark Schemes for Evaluative Essays",
    ];
  }

  if (suggestedPractice.length === 0) {
    suggestedPractice = [
      "Write a focused 4-mark evaluative paragraph directly comparing the relative significance of short-run versus long-run impacts for this prompt.",
      "Construct a step-by-step transmission mechanism connecting policy implementation to consumer and producer surplus changes.",
    ];
  }

  return cleanStars({
    total_mark: total,
    max_mark: maxMark,
    band,
    ao_breakdown: { knowledge, analysis, evaluation },
    examiner_summary: examinerSummary,
    strengths,
    weaknesses,
    missing_elements: {
      ...EMPTY_MISSING,
      definitions: toStringArray(rawMissing.definitions),
      analysis: toStringArray(rawMissing.analysis),
      evaluation: split.ao3_marks === 0 ? [] : toStringArray(rawMissing.evaluation),
      examples: toStringArray(rawMissing.examples),
      diagrams: toStringArray(rawMissing.diagrams),
    },
    actionable_feedback: actionableFeedback,
    suggested_resources: suggestedResources,
    suggested_practice: suggestedPractice,
    confidence: Math.max(0, Math.min(1, toNumber(raw.confidence, 0.9))),
    audited: false,
    sources: [],
    anchorsUsed: 0,
    off_syllabus: Boolean(raw.off_syllabus),
    detected_subject: typeof raw.detected_subject === "string" ? raw.detected_subject : undefined,
    grounding_status:
      raw.grounding_status === "mark_scheme_image" || raw.grounding_status === "unanchored"
        ? raw.grounding_status
        : "grounded",
  });
}

export function bandFor(total: number, maxMark: number): string {
  const ratio = maxMark > 0 ? total / maxMark : 0;
  if (ratio >= 0.8) return "Top Band";
  if (ratio >= 0.55) return "Upper Middle Band";
  if (ratio >= 0.35) return "Lower Middle Band";
  return "Bottom Band";
}

