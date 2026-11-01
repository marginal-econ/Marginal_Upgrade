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
  confidence_rating?: "High" | "Medium" | "Low";
  mark_range?: [number, number];
  audited: boolean;
  arbitrated?: boolean;
  arbitrationNotes?: string;
  sources: GroundingSource[];
  /** How many active calibration anchors were injected for this grade —
   *  0 means genuinely "none set up yet", not "skipped". */
  anchorsUsed: number;
  off_syllabus?: boolean;
  detected_subject?: string;
  unrelated_to_question?: boolean;
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

export function cleanMarkdownText(value: unknown): string {
  if (typeof value !== "string") return "";
  let text = stripStars(value);
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

export interface DetectedError {
  id: string;
  trap: string;
  severity: "major" | "minor";
}

/**
 * Scans candidate text for Cambridge 9708 mandatory theoretical errors.
 */
export function detectEconomicErrors(essayText: string): DetectedError[] {
  const errors: DetectedError[] = [];

  // 1. Hyperinflation as accelerating inflation (50% per month)
  if (
    /accelerating\s+inflation.*(?:50%|fifty\s+percent|a\s+month|per\s+month|hyperinflation)/i.test(essayText) ||
    /(?:50%|fifty\s+percent).*accelerating\s+inflation/i.test(essayText)
  ) {
    errors.push({
      id: "hyperinflation",
      trap: "Hyperinflation described as 'accelerating inflation' (50% per month is hyperinflation, whereas accelerating inflation is merely a rising inflation rate)",
      severity: "major",
    });
  }

  // 2. Investment expanding money supply
  if (
    /(?:investment|r&d|research\s+and\s+development).*(?:rise|increase|raising|expand).*(?:in\s+)?money\s+supply/i.test(essayText) ||
    /money\s+supply.*(?:rise|increase|expand).*(?:due\s+to|from)\s+(?:increased\s+)?investment/i.test(essayText)
  ) {
    errors.push({
      id: "investment_money_supply",
      trap: "Investment claimed to automatically raise the money supply (investment raises AD in the short run and LRAS in the long run; money supply is controlled by the central bank)",
      severity: "major",
    });
  }

  // 3. AS equals AD mechanism
  if (
    /(?:slowly|as)\s+equals\s+ad\b|demand-pull\s+inflation\s+will\s+decrease\s+as\s+.*equals\s+ad\b|as\s+equals\s+ad\b/i.test(essayText)
  ) {
    errors.push({
      id: "as_equals_ad",
      trap: "'AS equals AD' cited as an explanation or disinflation mechanism (AS = AD is equilibrium, not a transmission mechanism)",
      severity: "minor",
    });
  }

  // 4. Fall in demand shifting supply
  if (
    /(?:fall|drop|decrease|reduction|shift\s+in)\s+(?:in\s+)?(?:aggregate\s+)?demand\s+(?:shifts?|causes?\s+supply\s+to\s+shift)\s+supply\b/i.test(essayText)
  ) {
    errors.push({
      id: "demand_shifting_supply",
      trap: "A fall in demand claimed to shift the supply curve",
      severity: "major",
    });
  }

  // 5. Wrong direction of shift for tax or subsidy
  if (
    /(?:subsidy.*shifts?\s+supply\s+(?:to\s+the\s+)?left|tax(?:ation)?.*shifts?\s+supply\s+(?:to\s+the\s+)?right)/i.test(essayText)
  ) {
    errors.push({
      id: "shift_directions",
      trap: "Wrong direction of shift for tax or subsidy (subsidies shift supply right; indirect taxes shift supply left)",
      severity: "major",
    });
  }

  // 6. Inelastic demand claimed to make tax more effective at reducing consumption
  if (
    /(?:inelastic\s+demand.*(?:more|very|highly)\s+effective\s+(?:at|in)\s+reducing\s+consumption|tax.*(?:more|very|highly)\s+effective\s+(?:at|in)\s+reducing\s+consumption.*(?:when|because)\s+demand\s+is\s+(?:price\s+)?inelastic)/i.test(essayText) ||
    /inelastic\s+demand.*tax\s+(?:is\s+)?more\s+effective/i.test(essayText)
  ) {
    errors.push({
      id: "inelastic_tax_consumption",
      trap: "Saying inelastic demand makes a tax MORE effective at reducing consumption (inelastic demand means quantity falls less, so the tax is LESS effective at reducing consumption, although revenue rises)",
      severity: "major",
    });
  }

  // 7. Wrong curve shifting (e.g. indirect tax shifting demand left)
  if (
    /(?:indirect\s+tax|taxation|a\s+tax)\s+(?:will\s+)?(?:shifts?|causes?\s+demand\s+to\s+shift)\s+(?:the\s+)?demand\s+(?:curve\s+)?(?:to\s+the\s+)?left/i.test(essayText) ||
    /(?:shifts?\s+(?:the\s+)?demand\s+(?:curve\s+)?(?:to\s+the\s+)?left.*(?:due\s+to|from|because\s+of)\s+(?:an?\s+)?(?:indirect\s+)?tax)/i.test(essayText)
  ) {
    errors.push({
      id: "wrong_curve_shift",
      trap: "An indirect tax claimed to shift DEMAND left (an indirect tax shifts SUPPLY left)",
      severity: "major",
    });
  }

  // 8. Policy claimed to completely guarantee or solve outcome without proof
  if (
    /\b(?:policy|tax|subsidy|intervention|measure)\s+(?:completely\s+)?(?:ensures|guarantees|completely\s+corrects|solves)\s+(?:the\s+problem|market\s+failure|inflation|consumption)\b/i.test(essayText)
  ) {
    errors.push({
      id: "unsupported_absolutes",
      trap: "Claims that a policy 'ensures', 'completely corrects', 'solves' or 'guarantees' an outcome with no proof in the main argument",
      severity: "major",
    });
  }

  // 9. Contradictory statements
  if (
    /(?:may\s+not\s+(?:always\s+)?work|is\s+ineffective|limited\s+effectiveness).*very\s+effective/i.test(essayText) &&
    /because|as\s+a\s+reason/i.test(essayText)
  ) {
    errors.push({
      id: "contradictory_statements",
      trap: "A conclusion or paragraph that contradicts the script's own earlier statement regarding policy effectiveness",
      severity: "major",
    });
  }

  return errors;
}

/**
 * Checks whether a comparative question ("best", "most effective") has substantive
 * alternative policy analysis in the essay body.
 */
export function detectComparativeAnalysis(questionText: string, essayText: string): {
  isComparativeQuestion: boolean;
  hasAlternativeAnalysis: boolean;
  missingAlternativeNote?: string;
} {
  const q = questionText.toLowerCase();
  const isComparative = /\b(best|most|main|most effective|most likely|primary|superior)\b/i.test(q);
  if (!isComparative) {
    return { isComparativeQuestion: false, hasAlternativeAnalysis: true };
  }

  const paragraphs = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 50 && !p.startsWith("[DIAGRAM:"));

  // Check body paragraphs (all except the last conclusion paragraph)
  const bodyParagraphs = paragraphs.slice(0, -1);
  const bodyText = (bodyParagraphs.length > 0 ? bodyParagraphs.join("\n\n") : essayText).toLowerCase();

  // If question asks if supply-side policy is the "best" method to reduce inflation:
  if (q.includes("supply-side") && (q.includes("inflation") || q.includes("macro"))) {
    const mentionsMonetary =
      bodyText.includes("monetary policy") ||
      bodyText.includes("interest rate") ||
      bodyText.includes("central bank");
    const mentionsFiscal =
      bodyText.includes("fiscal policy") ||
      bodyText.includes("income tax") ||
      bodyText.includes("budget deficit") ||
      bodyText.includes("budget surplus");

    const hasAlternative = mentionsMonetary || mentionsFiscal;
    return {
      isComparativeQuestion: true,
      hasAlternativeAnalysis: hasAlternative,
      missingAlternativeNote: hasAlternative
        ? undefined
        : "Question-Fit Gate: The question requires assessing whether supply-side policy is the 'best' method to reduce inflation. The candidate writes exclusively on supply-side policies in the body and does not analyse alternative policies (contractionary monetary or fiscal policy) on a stated criterion.",
    };
  }

  // If question asks if indirect taxation/subsidy is the "best" or "most effective" method to tackle demerit goods / market failure / consumption:
  if ((q.includes("tax") || q.includes("taxation")) && (q.includes("demerit") || q.includes("market failure") || q.includes("consumption") || q.includes("pollution"))) {
    const mentionsAlternatives =
      bodyText.includes("regulation") ||
      bodyText.includes("ban") ||
      bodyText.includes("education") ||
      bodyText.includes("information") ||
      bodyText.includes("campaign") ||
      bodyText.includes("nudge") ||
      bodyText.includes("subsidy") ||
      bodyText.includes("subsidies") ||
      bodyText.includes("minimum price") ||
      bodyText.includes("tradable permit");
    return {
      isComparativeQuestion: true,
      hasAlternativeAnalysis: mentionsAlternatives,
      missingAlternativeNote: mentionsAlternatives
        ? undefined
        : "Question-Fit Gate: The question requires assessing whether indirect taxation is the 'best' or 'most effective' method. The candidate does not compare taxation against alternative policies (e.g. regulation, education campaigns, minimum prices) on a stated criterion.",
    };
  }

  return {
    isComparativeQuestion: true,
    hasAlternativeAnalysis: true,
  };
}

/**
 * Detects unranked hedge conclusions ("a mix of policies", "it depends") without criteria.
 */
export function detectHedgeConclusion(essayText: string): {
  isHedge: boolean;
  matchedPhrase?: string;
} {
  const paragraphs = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !p.startsWith("[DIAGRAM:"));

  if (paragraphs.length === 0) return { isHedge: false };
  const conclusion = paragraphs[paragraphs.length - 1]!.toLowerCase();

  const hedgePatterns = [
    /\ba\s+mix\s+of\s+(?:all\s+)?(?:the\s+)?(?:policies|supply-side|demand-side|strategies|measures)\b/i,
    /\bcombination\s+of\s+both\b/i,
    /\bboth\s+policies\s+should\s+be\s+used\b/i,
    /\buse\s+a\s+range\s+of\s+policies\b/i,
    /\ba\s+mix\s+of\s+strategies\b/i,
    /\bit\s+depends\s+on\s+the\s+situation\b/i,
  ];

  for (const pattern of hedgePatterns) {
    const match = conclusion.match(pattern);
    if (match) {
      // If the candidate reached a decisive ranked verdict, it is not a pure hedge
      const hasDecisiveRanking =
        conclusion.includes("is superior to") ||
        conclusion.includes("outweighs") ||
        conclusion.includes("more effective because") ||
        conclusion.includes("primary policy should be") ||
        conclusion.includes("most effective") ||
        conclusion.includes("better because") ||
        conclusion.includes("more important") ||
        conclusion.includes("depends primarily on") ||
        conclusion.includes("key factor is") ||
        conclusion.includes("crucial condition is");

      if (!hasDecisiveRanking) {
        return { isHedge: true, matchedPhrase: match[0] };
      }
    }
  }

  return { isHedge: false };
}

export function describeErrorInPlainEconomics(errorId: string): string {
  switch (errorId) {
    case "hyperinflation":
      return "hyperinflation wrongly defined as accelerating inflation";
    case "investment_money_supply":
      return "investment claimed to automatically increase the money supply";
    case "as_equals_ad":
      return "'AS equals AD' cited as an explanation or transmission mechanism";
    case "demand_shifting_supply":
      return "a fall in demand claimed to shift the supply curve";
    case "shift_directions":
      return "indirect tax shown shifting supply right or subsidy shifting supply left";
    case "inelastic_tax_consumption":
      return "inelastic demand wrongly called effective at reducing consumption";
    case "wrong_curve_shift":
      return "indirect tax shown shifting demand";
    case "unsupported_absolutes":
      return "policy claimed to guarantee or completely solve outcome without proof";
    case "contradictory_statements":
      return "conclusion contradicts script's earlier statement on policy effectiveness";
    case "wrong_question_judgement":
      return "essay answers 'does policy work?' instead of 'is it the best method?'";
    case "one_sided_evaluation":
      return "one-sided evaluation without weighing opposing perspectives";
    case "no_comparison":
      return "no comparison with an alternative policy on a stated criterion";
    case "hedge_conclusion":
      return "conclusion hedges without a decisive ranking or stated condition";
    case "unweighed_listing":
      return "alternatives listed without criteria or verdict";
    case "generic_evaluation":
      return "generic evaluative statement without contextual reasoning";
    default:
      return errorId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toLowerCase());
  }
}

/**
 * Coerce raw model JSON into a Grading. Enforces the fixed AO allocation:
 * the model is never allowed to redistribute marks or invent an `out_of`.
 * Applies deterministic Cambridge 9708 Accuracy Gates, Table A Level caps,
 * Table B strict caps, and Ground-Truth Calibration Anchors.
 */
export function normaliseGrading(
  raw: Record<string, unknown>,
  maxMark: number,
  split: { ao1_marks: number; ao2_marks: number; ao3_marks: number },
  question?: string,
  essayText?: string,
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

  // Programmatic safeguard against awarding marks to unrelated or off-topic essays:
  const isUnrelatedExplicit =
    raw.unrelated_to_question === true ||
    raw.is_unrelated === true ||
    raw.off_topic === true ||
    raw.is_off_topic === true;

  // Detect internal contradiction in examiner comments:
  const allComments = [
    knowledge.comment,
    analysis.comment,
    evaluation.comment,
    String(raw.examiner_summary ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  const statesOffTopic =
    allComments.includes("entirely off-topic") ||
    allComments.includes("completely off-topic") ||
    allComments.includes("entirely off topic") ||
    allComments.includes("does not address the question at all") ||
    allComments.includes("does not address the question about") ||
    (allComments.includes("unrelated to the topic") && allComments.includes("irrelevant to the question")) ||
    (allComments.includes("does not address the question") && allComments.includes("analysis is entirely absent"));

  const isUnrelated = isUnrelatedExplicit || statesOffTopic;

  if (isUnrelated) {
    knowledge.awarded = 0;
    analysis.awarded = 0;
    evaluation.awarded = 0;
  }

  // -----------------------------------------------------------------
  // Cambridge 9708 Accuracy Layer: Question-Fit & Mandatory Error Caps
  // -----------------------------------------------------------------
  const auditNotes: string[] = [];
  const detectedErrors: DetectedError[] = [];
  let majorErrors: DetectedError[] = [];
  let failsComparativeGate = false;
  const tableAMax = split.ao1_marks + split.ao2_marks;
  let targetTableABase = 8;
  let targetTableA = tableAMax;

  if (!isUnrelated && question && essayText) {
    const comparativeCheck = detectComparativeAnalysis(question, essayText);
    const errors = detectEconomicErrors(essayText);
    detectedErrors.push(...errors);
    const hedgeCheck = detectHedgeConclusion(essayText);

    majorErrors = detectedErrors.filter((e) => e.severity === "major");
    const totalErrors = detectedErrors.length;
    failsComparativeGate =
      comparativeCheck.isComparativeQuestion && !comparativeCheck.hasAlternativeAnalysis;

    // Check if an evaluative conclusion was attempted (candidate wrote a conclusion paragraph)
    const paragraphs = essayText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30 && !p.startsWith("[DIAGRAM:"));

    const hasConclusionAttempt =
      /\b(in\s+conclusion|to\s+conclude|overall|to\s+summarise|in\s+summary)\b/i.test(essayText) ||
      (paragraphs.length >= 3 && paragraphs[paragraphs.length - 1]!.length > 40);

    // If an evaluative conclusion was attempted, Table B Level 1 descriptor (1 mark) applies rather than 0
    if (hasConclusionAttempt && evaluation.awarded === 0 && split.ao3_marks > 0) {
      evaluation.awarded = 1;
    }

    // Table A Caps (AO1+AO2, max 8 scaled to tableAMax):
    // - 0 major errors: 8. 1 major error: 7. 2 major errors: 5. 3 or more: 4.
    // - A5 = yes: 5. A5 = yes plus 2 or more major errors: 4 (or 3 for Level 2 bottom band on 2+ errors).
    // - Script under about 150 words: 5.
    targetTableABase = 8;
    if (majorErrors.length >= 3) {
      targetTableABase = Math.min(targetTableABase, 4);
    } else if (majorErrors.length === 2) {
      targetTableABase = Math.min(targetTableABase, 5);
    } else if (majorErrors.length === 1) {
      targetTableABase = Math.min(targetTableABase, 7);
    }

    const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 0 && wordCount < 150) {
      targetTableABase = Math.min(targetTableABase, 5);
    }

    if (failsComparativeGate) {
      if (majorErrors.length >= 2 || totalErrors >= 2) {
        // Severe combined failure: Table A capped at Level 2 bottom band (3/8)
        targetTableABase = Math.min(targetTableABase, 3);
      } else if (majorErrors.length === 1) {
        // 1 major error + failed question-fit: max 4/8
        targetTableABase = Math.min(targetTableABase, 4);
      } else {
        // Question-fit failure alone: max 5/8
        targetTableABase = Math.min(targetTableABase, 5);
      }
    }

    targetTableA = Math.round(targetTableABase * (tableAMax / 8));
    const currentTableA = knowledge.awarded + analysis.awarded;

    // Strict Table B Caps (AO3, max 4 scaled to split.ao3_marks)
    if (failsComparativeGate) {
      // A5 = yes: strictly cap AO3 at max 1/4 (Level 1)
      evaluation.awarded = Math.min(evaluation.awarded, 1);
      auditNotes.push(
        "Question-Fit Gate: Essay answers 'does policy work?' instead of 'is it the best method?', capping Table B at 1/4 and Table A at Level 2 under Cambridge 9708 examiner standards."
      );
    } else if (hedgeCheck.isHedge) {
      // Conclusion is "a mix", "a range", "it depends" with no conditions or ranking: strictly cap at max 2/4
      evaluation.awarded = Math.min(evaluation.awarded, 2);
      auditNotes.push(
        `Table B Hedge Cap: Concluding with '${hedgeCheck.matchedPhrase}' without an explicit comparative ranking or conditions caps AO3 at 2/${split.ao3_marks}.`
      );
    }

    // Split Table A: give AO1 for correct definitions (max 2), set AO2 = Table A mark minus AO1
    // If Table A cap is 3, AO1 gets max 1 and AO2 gets 2 under Cambridge 9708 Level 2 bottom band.
    if (currentTableA > targetTableA || failsComparativeGate || majorErrors.length > 0) {
      let targetAo1: number;
      if (targetTableA <= 3) {
        targetAo1 = Math.min(knowledge.awarded, 1);
      } else {
        targetAo1 = Math.min(knowledge.awarded, Math.min(split.ao1_marks, targetTableA));
      }
      const targetAo2 = Math.min(analysis.awarded, targetTableA - targetAo1);
      knowledge.awarded = targetAo1;
      analysis.awarded = targetAo2;
      if (currentTableA > targetTableA) {
        auditNotes.push(
          `Table A Error Cap: ${majorErrors.length} major error(s) identified. AO1+AO2 capped at max ${targetTableA}/${tableAMax}.`
        );
      }
    }
  }

  const aoTotal = knowledge.awarded + analysis.awarded + evaluation.awarded;
  const declaredTotal = isUnrelated ? 0 : Math.round(toNumber(raw.total_mark, aoTotal));

  // The AO marks are the definitive source of truth
  const total = isUnrelated
    ? 0
    : auditNotes.length > 0
      ? Math.max(0, Math.min(maxMark, aoTotal))
      : Math.max(0, Math.min(maxMark, aoTotal || declaredTotal));

  const band = isUnrelated
    ? "Bottom band"
    : auditNotes.length > 0
      ? bandFor(total, maxMark)
      : typeof raw.band === "string"
        ? raw.band
        : bandFor(total, maxMark);

  const rawMissing = (raw.missing_elements ?? {}) as Record<string, unknown>;

  let strengths = toStringArray(raw.strengths);
  let weaknesses = toStringArray(raw.weaknesses);
  let actionableFeedback = toStringArray(raw.actionable_feedback);
  let suggestedResources = toStringArray(raw.suggested_resources);
  let suggestedPractice = toStringArray(raw.suggested_practice);
  let examinerSummary = cleanComment(String(raw.examiner_summary ?? ""));

  // Append audit summary if accuracy caps were triggered
  if (auditNotes.length > 0 || majorErrors.length > 0 || failsComparativeGate) {
    const errorDescriptions: string[] = [];
    for (const err of majorErrors) {
      errorDescriptions.push(describeErrorInPlainEconomics(err.id));
    }
    if (failsComparativeGate) {
      errorDescriptions.push("essay answers 'do taxes work?' or 'does policy work?', not 'best'");
    }
    const tableADetails = errorDescriptions.length > 0 ? ` (${errorDescriptions.join("; ")})` : "";
    const tableBDetails = failsComparativeGate
      ? " (no comparison with alternative on stated criterion)"
      : "";
    const questionFitStatus = failsComparativeGate ? "Question-fit: failed." : "Question-fit: passed.";

    const tableAAuditLine = `Cambridge Senior Examiner Audit: Table A capped at ${targetTableA}${tableADetails}. Table B capped at ${evaluation.awarded}${tableBDetails}. ${questionFitStatus}`;

    if (!examinerSummary.includes("Cambridge Senior Examiner Audit")) {
      const auditSummary = `[${tableAAuditLine}${auditNotes.length > 0 ? ` ${auditNotes.join(" ")}` : ""}]`;
      examinerSummary = examinerSummary ? `${examinerSummary}\n\n${auditSummary}` : auditSummary;
    }

    // Ensure detected errors are reflected in weaknesses
    for (const err of detectedErrors) {
      const alreadyInWeaknesses = weaknesses.some((w) => w.toLowerCase().includes(err.id));
      if (!alreadyInWeaknesses) {
        weaknesses.unshift(`Theoretical error: ${err.trap}`);
      }
    }
  }

  // Consistency Rules:
  // 1. Any point listed as an error must NOT appear in strengths (What worked)
  if (detectedErrors.length > 0) {
    strengths = strengths.filter((s) => {
      const sLower = s.toLowerCase();
      for (const err of detectedErrors) {
        if (err.id === "hyperinflation" && (sLower.includes("hyperinflation") || sLower.includes("accelerating inflation"))) return false;
        if (err.id === "demand_shifting_supply" && (sLower.includes("shifting supply") || sLower.includes("demand shifts"))) return false;
        if (err.id === "shift_directions" && (sLower.includes("tax shift") || sLower.includes("subsidy shift") || sLower.includes("direction of shift"))) return false;
        if (err.id === "wrong_curve_shift" && (sLower.includes("tax shift") || sLower.includes("demand curve"))) return false;
        if (err.id === "inelastic_tax_consumption" && (sLower.includes("inelastic") || sLower.includes("reducing consumption"))) return false;
        if (err.id === "investment_money_supply" && sLower.includes("money supply")) return false;
        if (err.id === "as_equals_ad" && sLower.includes("equals ad")) return false;
        if (err.id === "unsupported_absolutes" && (sLower.includes("ensures") || sLower.includes("guarantees"))) return false;
        if (err.id === "contradictory_statements" && sLower.includes("effective")) return false;
      }
      return true;
    });
  }

  // 2. Never describe essay as "addressing the question directly" or "solid" if question-fit check failed or Table A cap <= 5/8 applies
  if (failsComparativeGate || targetTableABase <= 5) {
    examinerSummary = examinerSummary
      .replace(/addressing the question directly/gi, "addressing some aspects of the topic")
      .replace(/addresses the question directly/gi, "addresses some aspects of the topic")
      .replace(/addresses the prompt directly/gi, "addresses the topic broadly")
      .replace(/\bsolid\b/gi, "developing")
      .replace(/\bsound economic understanding\b/gi, "developing economic understanding");

    strengths = strengths.map((s) =>
      s
        .replace(/addressing the question directly/gi, "addressing some aspects of the topic")
        .replace(/addresses the question directly/gi, "addresses some aspects of the topic")
        .replace(/\bsolid\b/gi, "developing")
    );
  }

  // 3. Never call an analysis "sound" if it contains a major error or contradicts itself
  if (majorErrors.length > 0) {
    examinerSummary = examinerSummary
      .replace(/\bsound analysis\b/gi, "partial analysis")
      .replace(/\bsound economic\b/gi, "partial economic");
    analysis.comment = analysis.comment
      .replace(/\bsound analysis\b/gi, "partial analysis")
      .replace(/\bsound economic\b/gi, "partial economic");
  }

  if (isUnrelated) {
    if (!examinerSummary || examinerSummary.length < 25) {
      examinerSummary = `This submission scores 0/${maxMark} marks (Bottom band). The essay is completely off-topic and discusses an unrelated economics topic rather than answering the specific question set. Under official Cambridge 9708 regulations, zero marks are awarded for irrelevant material.`;
    }
    if (strengths.length === 0 || strengths.some((s) => s.includes("contextually applied"))) {
      strengths = [
        "Economic concepts were recalled in the essay, demonstrating general economic literacy.",
        "Writing contains coherent sentences and paragraphs.",
      ];
    }
    if (weaknesses.length === 0 || weaknesses.some((w) => w.includes("transmission mechanisms can be deepened"))) {
      weaknesses = [
        "The submission does not address the specific question asked; it discusses an unrelated syllabus topic.",
        "No relevant economic knowledge, analysis, or evaluation was presented for the examined question prompt.",
      ];
    }
    if (actionableFeedback.length === 0 || actionableFeedback.some((f) => f.includes("Explicitly articulate every link"))) {
      actionableFeedback = [
        "Always read the exam question carefully and verify that your answer directly addresses the specific economic topic, qualifiers, and command words asked.",
        "Ensure every definition, causal chain, and evaluative point is directly anchored to the specific prompt.",
      ];
    }
  } else if (!examinerSummary || examinerSummary.length < 25) {
    examinerSummary = `This submission achieves ${total}/${maxMark} marks (${band}). The candidate demonstrates sound economic understanding with ${knowledge.awarded}/${knowledge.out_of} for AO1 Knowledge, ${analysis.awarded}/${analysis.out_of} for AO2 Analysis, and ${evaluation.awarded}/${evaluation.out_of} for AO3 Evaluation. Arguments are structured and address the prompt, with opportunities to deepen transmission mechanisms and comparative evaluation in subsequent rewrites.`;
  }

  if (strengths.length === 0) {
    strengths = [
      `Accurate and appropriate use of economic terminology contextually applied (${knowledge.awarded}/${knowledge.out_of} on AO1).`,
      `Clear analytical reasoning establishing cause-and-effect links for core mechanisms (${analysis.awarded}/${analysis.out_of} on AO2).`,
      `Presents balanced perspectives addressing multiple dimensions of the prompt (${evaluation.awarded}/${evaluation.out_of} on AO3).`,
    ];
  }

  if (weaknesses.length === 0) {
    weaknesses = [
      "Economic transmission mechanisms can be extended further to connect intermediate changes with final macroeconomic and welfare outcomes.",
      "Evaluation could be deepened by explicitly weighing opposing arguments on a shared criterion such as time frame, elasticity, or relative magnitude.",
      "Substantiating theoretical arguments with concrete context or specific scenarios would elevate the answer to the top band.",
    ];
  }

  if (actionableFeedback.length === 0) {
    actionableFeedback = [
      "Explicitly articulate every step in your economic chains of reasoning: define the initial shock, explain the transmission mechanism, analyse market adjustments, and evaluate final welfare impacts.",
      "Weigh opposing arguments against explicit economic criteria (e.g. short run vs long run, elasticity, degree of dependency) before forming a conclusion.",
      "Ensure the conclusion directly confronts the question's qualifiers and command words with a justified, context-dependent judgement.",
    ];
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
      evaluation: toStringArray(rawMissing.evaluation),
      examples: toStringArray(rawMissing.examples),
      diagrams: toStringArray(rawMissing.diagrams),
    },
    actionable_feedback: actionableFeedback,
    suggested_resources: suggestedResources,
    suggested_practice: suggestedPractice,
    confidence: Math.max(0, Math.min(1, toNumber(raw.confidence, 0.9))),
    confidence_rating: toNumber(raw.confidence, 0.9) >= 0.85 ? "High" : toNumber(raw.confidence, 0.9) >= 0.65 ? "Medium" : "Low",
    mark_range: [Math.max(0, total - 1), Math.min(maxMark, total + 1)] as [number, number],
    audited: false,
    sources: [],
    anchorsUsed: 0,
    off_syllabus: Boolean(raw.off_syllabus),
    detected_subject: typeof raw.detected_subject === "string" ? raw.detected_subject : undefined,
    unrelated_to_question: isUnrelated,
    grounding_status:
      raw.grounding_status === "mark_scheme_image" || raw.grounding_status === "unanchored"
        ? raw.grounding_status
        : "grounded",
  });
}

export function bandFor(total: number, maxMark: number): string {
  const ratio = maxMark > 0 ? total / maxMark : 0;
  if (ratio >= 0.8) return "Top band";
  if (ratio >= 0.55) return "Upper middle band";
  if (ratio >= 0.35) return "Lower middle band";
  return "Bottom band";
}
