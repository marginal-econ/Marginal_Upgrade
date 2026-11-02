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

/**
 * Strips robotic prefixes like "Theoretical error:" or "Error:" and softens
 * academic phrasing so candidate feedback is constructive, educational, and pristine.
 */
export function cleanPristineExaminerFeedback(text: string): string {
  if (!text || typeof text !== "string") return "";
  let s = cleanComment(text);
  // Remove robotic prefixes
  s = s.replace(/^(?:major\s+)?theoretical\s+errors?\s*[:\-]\s*/gi, "");
  s = s.replace(/^(?:major\s+)?analytical\s+errors?\s*[:\-]\s*/gi, "");
  s = s.replace(/^(?:major\s+)?economic\s+errors?\s*[:\-]\s*/gi, "");
  // Replace inline phrases with singular/plural sensitivity
  s = s.replace(/\b(?:major\s+)?theoretcial\s+errors?\b/gi, (m) =>
    /errors/i.test(m) ? "analytical inaccuracies" : "analytical inaccuracy",
  );
  s = s.replace(/\b(?:major\s+)?theoretical\s+errors?\b/gi, (m) =>
    /errors/i.test(m) ? "analytical inaccuracies" : "analytical inaccuracy",
  );
  s = s.replace(/\btheoretical\s+and\s+diagrammatic\s+errors?\b/gi, "diagrammatic and analytical inaccuracies");
  s = s.replace(/\btheoretical\s+blunder\b/gi, "analytical flaw");
  s = s.replace(/\btheoretical\s+inaccuracy\b/gi, "analytical inaccuracy");
  s = s.replace(/\btheoretical\s+inaccuracies\b/gi, "analytical inaccuracies");
  s = s.replace(/\btheoretical\s+analysis\b/gi, "analytical reasoning");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanPristineExaminerFeedback(typeof item === "string" ? item : JSON.stringify(item)))
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
    comment: cleanPristineExaminerFeedback(String(raw.comment ?? "")),
  };
}

export interface DetectedError {
  id: string;
  trap: string;
  severity: "major" | "minor";
}

/**
 * Scans candidate text for Cambridge 9708 mandatory economic errors.
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

  // 6. Inelastic demand claimed to be effective at reducing quantity/consumption
  if (
    /inelastic\s+demand[\s\S]{0,120}(?:effective|successful|greatly\s+reduces?|significantly\s+reduces?|large\s+fall|large\s+drop).*(?:reducing\s+consumption|reducing\s+demand|cutting\s+consumption|falling\s+consumption)/i.test(essayText) ||
    /(?:indirect\s+tax|taxation|tax)[\s\S]{0,120}(?:highly\s+effective|very\s+effective)[\s\S]{0,120}(?:demand\s+is\s+inelastic|inelastic\s+demand)/i.test(essayText) ||
    /inelastic\s+demand[\s\S]{0,120}(?:makes?\s+(?:the\s+)?tax\s+['"]?(?:very|highly)?\s*effective|makes?\s+it\s+['"]?(?:very|highly)?\s*effective)/i.test(essayText)
  ) {
    errors.push({
      id: "ped_inelastic_effectiveness",
      trap: "Claiming an indirect tax is effective at reducing consumption because demand is inelastic (inelastic demand means quantity falls proportionally less than price rises, making the tax ineffective at cutting quantity, though effective at raising revenue)",
      severity: "major",
    });
  }

  // 7. Shifting demand for an indirect tax or subsidy
  if (
    /(?:indirect\s+tax|specific\s+tax|ad\s+valorem\s+tax|subsidy)[\s\S]{0,120}(?:shifts?\s+demand\s+(?:to\s+the\s+)?(?:left|right|inward|outward|leftward|rightward)|shifts?\s+the\s+demand\s+curve)/i.test(essayText) ||
    /(?:demand\s+curve\s+shifts?|shifts?\s+(?:the\s+)?demand\s+curve|demand\s+shifts?)\s+(?:to\s+the\s+)?(?:left|right|inward|outward|leftward|rightward)[\s\S]{0,120}(?:due\s+to|because\s+of|from|with|by)\s+(?:the\s+)?(?:indirect\s+tax|tax|subsidy)/i.test(essayText) ||
    /(?:the\s+)?demand\s+curve\s+shifts?\s+(?:to\s+the\s+)?(?:left|inward|leftward)/i.test(essayText)
  ) {
    errors.push({
      id: "tax_demand_shift",
      trap: "Claiming an indirect tax or subsidy shifts the demand curve (taxes and subsidies affect production costs and shift supply; demand only contracts or expands along the curve)",
      severity: "major",
    });
  }

  // 8. Price change claimed to shift the demand or supply curve
  if (
    /(?:rise|increase|fall|drop|change)\s+in\s+price[\s\S]{0,80}(?:shifts?\s+(?:the\s+)?(?:demand|supply)\s+curve|causes?\s+(?:the\s+)?(?:demand|supply)\s+curve\s+to\s+shift)/i.test(essayText) ||
    /(?:shifts?\s+(?:the\s+)?(?:demand|supply)\s+curve|causes?\s+(?:the\s+)?(?:demand|supply)\s+curve\s+to\s+shift)[\s\S]{0,80}(?:due\s+to|because\s+of)\s+(?:a\s+)?(?:rise|increase|fall|drop|change)\s+in\s+price/i.test(essayText)
  ) {
    errors.push({
      id: "price_causes_shift",
      trap: "A price change claimed to shift a demand or supply curve (price changes cause movements along the curve, never shifts)",
      severity: "major",
    });
  }

  // 9. Inverted PED formula: % change in price / % change in quantity demanded
  if (
    /(?:ped|price\s+elasticity\s+of\s+demand)\s*=\s*(?:%\s*Δ\s*p|%\s*change\s+in\s+price)\s*\/\s*(?:%\s*Δ\s*q|%\s*change\s+in\s+quantity)/i.test(essayText) ||
    /percentage\s+change\s+in\s+price\s+divided\s+by\s+(?:the\s+)?percentage\s+change\s+in\s+quantity/i.test(essayText)
  ) {
    errors.push({
      id: "inverted_ped_formula",
      trap: "Inverted PED formula: % change in price divided by % change in quantity demanded (correct formula is %ΔQd / %ΔP)",
      severity: "major",
    });
  }

  return errors;
}

/**
 * Detect economic errors directly flagged in the examiner's own feedback.
 * Prevents the model from writing in comments that the candidate made major
 * diagram/PED/formula errors without actually deducting marks.
 */
export function detectErrorsFromExaminerFeedback(raw: Record<string, unknown>): DetectedError[] {
  const errors: DetectedError[] = [];
  const rawAo = (raw.ao_breakdown ?? {}) as Record<string, unknown>;
  const analysisObj = (rawAo.analysis ?? rawAo.ao2 ?? {}) as Record<string, unknown>;
  const analysisComment = String(analysisObj.comment ?? "");
  const summary = String(raw.examiner_summary ?? "");
  const weaknesses = Array.isArray(raw.weaknesses)
    ? raw.weaknesses.map(String).join(" ")
    : String(raw.weaknesses ?? "");

  const fullFeedback = [analysisComment, summary, weaknesses].join(" ").toLowerCase();

  // 1. Diagram / curve shift error in feedback
  if (
    fullFeedback.includes("demand curve does not shift") ||
    fullFeedback.includes("supply curve does not shift") ||
    fullFeedback.includes("shifting the wrong curve") ||
    fullFeedback.includes("shift the wrong curve") ||
    fullFeedback.includes("incorrectly states that the demand curve shifts") ||
    fullFeedback.includes("incorrectly states that the supply curve shifts") ||
    fullFeedback.includes("contracts along the demand curve") ||
    fullFeedback.includes("movement along the demand curve") ||
    fullFeedback.includes("wrong direction of shift") ||
    fullFeedback.includes("inaccurate diagram") ||
    fullFeedback.includes("diagram error") ||
    fullFeedback.includes("diagrammatic error") ||
    fullFeedback.includes("curve shift error") ||
    (fullFeedback.includes("shifting of curves") && (fullFeedback.includes("inaccurac") || fullFeedback.includes("error"))) ||
    (fullFeedback.includes("movement along") && fullFeedback.includes("rather than")) ||
    (fullFeedback.includes("movement along") && fullFeedback.includes("instead of"))
  ) {
    errors.push({
      id: "diagram_shift_error",
      trap: "Major diagram or curve shift inaccuracy (e.g. incorrectly shifting the demand curve instead of supply, or confusing a movement along with a curve shift)",
      severity: "major",
    });
  }

  // 2. PED / Elasticity error in feedback
  if (
    (fullFeedback.includes("price elasticity of demand") || fullFeedback.includes("ped")) &&
    (fullFeedback.includes("logical error") ||
      fullFeedback.includes("flawed") ||
      fullFeedback.includes("inaccurate") ||
      fullFeedback.includes("contradicts the economic principle") ||
      fullFeedback.includes("contradicts economic")) ||
    fullFeedback.includes("inelastic demand makes the tax 'very effective'") ||
    fullFeedback.includes("inelastic demand makes the tax very effective") ||
    fullFeedback.includes("inelastic demand means the tax is less effective") ||
    (fullFeedback.includes("elasticity") && (fullFeedback.includes("flawed") || fullFeedback.includes("inaccurac") || fullFeedback.includes("logical error")))
  ) {
    errors.push({
      id: "ped_logical_error",
      trap: "Flawed price elasticity of demand (PED) analysis (e.g. claiming inelastic demand makes an indirect tax very effective at reducing consumption)",
      severity: "major",
    });
  }

  // 3. Formula error in feedback
  if (
    fullFeedback.includes("formula error") ||
    fullFeedback.includes("incorrect formula") ||
    fullFeedback.includes("wrong formula") ||
    fullFeedback.includes("inverted formula") ||
    fullFeedback.includes("miscalculated elasticity")
  ) {
    errors.push({
      id: "formula_error",
      trap: "Formula error or inverted calculation in economic analysis",
      severity: "major",
    });
  }

  // 4. Analysis mechanism error in feedback
  if (
    fullFeedback.includes("wrong analysis") ||
    fullFeedback.includes("flawed analysis") ||
    fullFeedback.includes("logical error in analysis") ||
    fullFeedback.includes("several economic inaccuracies")
  ) {
    errors.push({
      id: "analysis_mechanism_error",
      trap: "Flawed economic reasoning or transmission mechanisms in analysis",
      severity: "major",
    });
  }

  return errors;
}

/**
 * Checks whether an essay has substantive topical overlap with the exam question.
 * Prevents false-positive off-topic zeroing for essays that directly discuss the set topic.
 */
export function isEssayTopicallyRelated(questionText: string, essayText: string): boolean {
  if (!questionText || !essayText) return true;

  const q = questionText.toLowerCase();
  const e = essayText.toLowerCase();

  // Key compound economic phrases
  const compoundPhrases = [
    "indirect tax", "indirect taxes", "demerit good", "demerit goods", "merit good", "merit goods",
    "public good", "public goods", "free trade", "trade protection", "monetary policy",
    "fiscal policy", "supply-side", "supply side", "market failure", "minimum wage",
    "maximum price", "minimum price", "price ceiling", "price floor", "balance of payments",
    "current account", "exchange rate", "exchange rates", "aggregate demand", "aggregate supply",
    "cost-push", "demand-pull", "consumer surplus", "producer surplus", "income elasticity",
    "cross elasticity", "price elasticity", "externalities", "external costs", "external benefits",
    "information failure", "negative externalities", "positive externalities",
  ];

  for (const phrase of compoundPhrases) {
    if (q.includes(phrase) && e.includes(phrase)) {
      return true;
    }
  }

  // Common stop words and generic exam phrasing to filter out
  const stopWords = new Set([
    "assess", "whether", "discuss", "evaluate", "to", "what", "extent", "how", "far",
    "explain", "consider", "analyse", "analyze", "the", "a", "an", "is", "are", "was",
    "were", "in", "on", "at", "by", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below", "from", "up",
    "down", "out", "off", "over", "under", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "than", "too", "very", "can", "will", "just", "don",
    "should", "now", "best", "method", "policy", "policies", "measure", "measures",
    "way", "ways", "effective", "effectively", "always", "positive", "negative",
    "reduce", "increase", "impact", "effect", "consequences", "role", "economic",
    "economy", "economies", "market", "markets", "government", "governments",
  ]);

  // Extract non-stop words with length >= 4
  const words = q
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  if (words.length === 0) return true;

  // Check how many topic words appear in the essay
  const matchedWords = words.filter((w) => e.includes(w));
  return matchedWords.length > 0;
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

export interface ErrorDescriptor {
  category: "diagram" | "elasticity" | "formula" | "definition" | "mechanism";
  text: string;
}

export const ERROR_DESCRIPTIONS: Record<string, ErrorDescriptor> = {
  tax_demand_shift: {
    category: "diagram",
    text: "Curve shift error: An indirect tax increases production costs and shifts the market supply curve upwards/leftwards; it does not shift the demand curve (consumption contracts along the demand curve).",
  },
  shift_directions: {
    category: "diagram",
    text: "Curve shift direction: Indirect taxes increase production costs and shift supply leftwards, whereas subsidies lower costs and shift supply rightwards.",
  },
  price_causes_shift: {
    category: "diagram",
    text: "Movement vs shift: A change in market price causes a movement along the demand or supply curve, never a shift of the curve itself.",
  },
  demand_shifting_supply: {
    category: "diagram",
    text: "Interdependence inaccuracy: A change in demand alters equilibrium market price and quantity, but does not directly shift the supply curve.",
  },
  diagram_shift_error: {
    category: "diagram",
    text: "Diagrammatic inaccuracy: The essay incorrectly shifts the wrong curve or confuses a movement along the curve with an exogenous curve shift.",
  },
  ped_inelastic_effectiveness: {
    category: "elasticity",
    text: "Flawed elasticity reasoning: When demand is price inelastic, quantity demanded falls proportionally less than price rises (%ΔQd < %ΔP), meaning an indirect tax is less effective at cutting consumption, despite generating higher tax revenue.",
  },
  ped_logical_error: {
    category: "elasticity",
    text: "Elasticity inaccuracy: Inelastic demand implies consumers are relatively unresponsive to price increases, so an indirect tax has a muted impact on reducing quantity consumed.",
  },
  inverted_ped_formula: {
    category: "formula",
    text: "Formula error: Price elasticity of demand is defined as %ΔQd / %ΔP; inverting the ratio undermines quantitative elasticity analysis.",
  },
  formula_error: {
    category: "formula",
    text: "Formula inaccuracy: Economic calculations or elasticity formulas must correctly specify the independent and dependent percentage variables.",
  },
  hyperinflation: {
    category: "definition",
    text: "Definitional imprecision: A monthly price level rise exceeding 50% defines hyperinflation, whereas accelerating inflation denotes an increasing rate of inflation.",
  },
  investment_money_supply: {
    category: "mechanism",
    text: "Transmission flaw: Capital investment increases aggregate demand and productive capacity, but does not directly expand the broad money supply.",
  },
  as_equals_ad: {
    category: "mechanism",
    text: "Mechanism gap: Stating that AS equals AD describes macroeconomic equilibrium rather than explaining the transmission mechanism causing disinflation.",
  },
  analysis_mechanism_error: {
    category: "mechanism",
    text: "Analytical flaw: Causal transmission mechanisms fail to logically trace how the initial economic shock leads to the asserted market outcome.",
  },
};

/**
 * Checks whether an array of feedback points already covers a specific error category.
 */
export function coversErrorCategory(
  items: string[],
  category: "diagram" | "elasticity" | "formula" | "definition" | "mechanism",
): boolean {
  return items.some((item) => {
    const s = item.toLowerCase();
    switch (category) {
      case "diagram":
        return (
          ((s.includes("demand") || s.includes("supply")) &&
            (s.includes("shift") || s.includes("curve") || s.includes("movement") || s.includes("contract"))) ||
          s.includes("curve does not shift") ||
          s.includes("wrong curve") ||
          s.includes("shift left") ||
          s.includes("shift right") ||
          s.includes("movement along") ||
          s.includes("contracts along") ||
          s.includes("diagram")
        );
      case "elasticity":
        return (
          s.includes("ped") ||
          s.includes("price elasticity") ||
          (s.includes("elasticity") && (s.includes("inelastic") || s.includes("elastic") || s.includes("flaw") || s.includes("error")))
        );
      case "formula":
        return s.includes("formula") || s.includes("%Δ") || s.includes("calculation");
      case "definition":
        return s.includes("hyperinflation") || s.includes("accelerating inflation") || s.includes("definition");
      case "mechanism":
        return s.includes("money supply") || s.includes("as equals ad") || s.includes("transmission");
      default:
        return false;
    }
  });
}

/**
 * Deduplicates examiner feedback points so the same concept/error is not repeated.
 */
export function deduplicateFeedbackPoints(points: string[]): string[] {
  const result: string[] = [];
  for (const pt of points) {
    const cleaned = cleanPristineExaminerFeedback(pt);
    if (!cleaned || cleaned.length < 10) continue;

    const s = cleaned.toLowerCase();
    const isDiagram =
      ((s.includes("demand") || s.includes("supply")) && (s.includes("shift") || s.includes("curve") || s.includes("movement") || s.includes("contract"))) ||
      s.includes("curve does not shift") ||
      s.includes("wrong curve") ||
      s.includes("movement along") ||
      s.includes("contracts along");
    const isPed =
      s.includes("ped") ||
      s.includes("price elasticity") ||
      (s.includes("elasticity") && (s.includes("inelastic") || s.includes("effective")));
    const isQuestionFit =
      (s.includes("alternative") || s.includes("compare") || s.includes("best method") || s.includes("best policy")) &&
      (s.includes("does not") || s.includes("fail") || s.includes("omit") || s.includes("without"));

    const isDuplicate = result.some((existing) => {
      const ex = existing.toLowerCase();
      if (
        isDiagram &&
        (((ex.includes("demand") || ex.includes("supply")) && (ex.includes("shift") || ex.includes("curve") || ex.includes("movement") || ex.includes("contract"))) ||
          ex.includes("curve does not shift") ||
          ex.includes("movement along") ||
          ex.includes("contracts along"))
      ) {
        return true;
      }
      if (
        isPed &&
        (ex.includes("ped") || ex.includes("price elasticity") || (ex.includes("elasticity") && (ex.includes("inelastic") || ex.includes("effective"))))
      ) {
        return true;
      }
      if (
        isQuestionFit &&
        (ex.includes("alternative") || ex.includes("compare") || ex.includes("best method") || ex.includes("best policy")) &&
        (ex.includes("does not") || ex.includes("fail") || ex.includes("omit") || ex.includes("without"))
      ) {
        return true;
      }
      if (ex === s || (s.length > 30 && ex.includes(s.slice(0, 30))) || (ex.length > 30 && s.includes(ex.slice(0, 30)))) {
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      result.push(cleaned);
    }
  }
  return result;
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

  // Detect internal contradiction in examiner comments (only when the whole essay is declared off-topic):
  const allComments = [
    knowledge.comment,
    analysis.comment,
    evaluation.comment,
    String(raw.examiner_summary ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  const statesCompletelyOffTopic =
    allComments.includes("entirely off-topic") ||
    allComments.includes("completely off-topic") ||
    allComments.includes("entirely off topic") ||
    allComments.includes("completely off topic") ||
    allComments.includes("does not address the question about") ||
    allComments.includes("diverges completely from the set question") ||
    allComments.includes("zero marks are awarded for irrelevant") ||
    allComments.includes("answers a different question from the one set") ||
    allComments.includes("different economic topic instead of") ||
    (allComments.includes("unrelated to the topic") && allComments.includes("irrelevant")) ||
    (allComments.includes("different economic topic") && (allComments.includes("rather than") || allComments.includes("instead of") || allComments.includes("instead"))) ||
    (allComments.includes("different topic rather than addressing")) ||
    (allComments.includes("does not address the question at all") && allComments.includes("instead"));

  // Verify topical relevance between question and essay text to prevent false-positive zeroing
  const hasContext = Boolean(question && essayText);
  const isTopicallyRelated = hasContext ? isEssayTopicallyRelated(question!, essayText!) : false;

  // An essay is ONLY unrelated if:
  // 1. Without context (e.g. raw unit tests): explicit off-topic flag or comments declaring completely off-topic
  // 2. With context: the essay MUST NOT be topically related, AND (explicitly flagged OR comments declare completely off-topic)
  const isUnrelated = hasContext
    ? !isTopicallyRelated && (isUnrelatedExplicit || statesCompletelyOffTopic)
    : isUnrelatedExplicit || statesCompletelyOffTopic;

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

  if (!isUnrelated) {
    const comparativeCheck =
      question && essayText
        ? detectComparativeAnalysis(question, essayText)
        : { isComparativeQuestion: false, hasAlternativeAnalysis: true };

    const essayErrors = question && essayText ? detectEconomicErrors(essayText) : [];
    const feedbackErrors = detectErrorsFromExaminerFeedback(raw);

    const errorMap = new Map<string, DetectedError>();
    for (const e of [...essayErrors, ...feedbackErrors]) {
      if (!errorMap.has(e.id)) {
        errorMap.set(e.id, e);
      }
    }
    detectedErrors.push(...Array.from(errorMap.values()));

    const hedgeCheck = essayText ? detectHedgeConclusion(essayText) : { isHedge: false };

    const majorErrors = detectedErrors.filter((e) => e.severity === "major");
    const totalErrors = detectedErrors.length;
    const failsComparativeGate =
      comparativeCheck.isComparativeQuestion && !comparativeCheck.hasAlternativeAnalysis;

    // Check if an evaluative conclusion was attempted (candidate wrote a conclusion paragraph)
    const paragraphs = essayText
      ? essayText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 30 && !p.startsWith("[DIAGRAM:"))
      : [];

    const hasConclusionAttempt = essayText
      ? /\b(in\s+conclusion|to\s+conclude|overall|to\s+summarise|in\s+summary)\b/i.test(essayText) ||
        (paragraphs.length >= 3 && paragraphs[paragraphs.length - 1]!.length > 40)
      : false;

    // If an evaluative conclusion was attempted, Table B Level 1 descriptor (1 mark) applies rather than 0
    if (hasConclusionAttempt && evaluation.awarded === 0 && split.ao3_marks > 0) {
      evaluation.awarded = 1;
    }

    const tableAMax = split.ao1_marks + split.ao2_marks;
    const ao2Max = split.ao2_marks;
    const ao1Max = split.ao1_marks;

    const isDiagramError = (id: string) =>
      id === "tax_demand_shift" ||
      id === "shift_directions" ||
      id === "price_causes_shift" ||
      id === "demand_shifting_supply" ||
      id === "diagram_shift_error";

    const isPedError = (id: string) =>
      id === "ped_inelastic_effectiveness" ||
      id === "inverted_ped_formula" ||
      id === "ped_logical_error";

    const isFormulaError = (id: string) =>
      id === "inverted_ped_formula" ||
      id === "formula_error";

    const isDefinitionError = (id: string) =>
      id === "hyperinflation";

    const hasDiagramErr = majorErrors.some((e) => isDiagramError(e.id));
    const hasPedErr = majorErrors.some((e) => isPedError(e.id));
    const hasFormulaErr = majorErrors.some((e) => isFormulaError(e.id));
    const hasDefErr = majorErrors.some((e) => isDefinitionError(e.id));

    const majorAnalysisErrors = majorErrors.filter((e) => !isDefinitionError(e.id));
    const majorAnalysisCount =
      (hasDiagramErr ? 1 : 0) +
      (hasPedErr ? 1 : 0) +
      (hasFormulaErr && !hasPedErr ? 1 : 0) +
      (majorAnalysisErrors.some(
        (e) =>
          e.id === "analysis_mechanism_error" ||
          e.id === "investment_money_supply" ||
          e.id === "inflation_types" ||
          e.id === "supply_side_timing",
      )
        ? 1
        : 0);

    // -----------------------------------------------------------------
    // 1. DIRECT AO2 ANALYSIS ACCURACY PENALTIES
    // If a major diagram, PED, formula, or analysis error occurs:
    // Deduct marks directly in AO2 Analysis (not just mentioned in feedback).
    // -----------------------------------------------------------------
    if (hasDiagramErr && hasPedErr) {
      // Both major diagram error AND PED error (double major theoretical blunder):
      // Major mark cuts: cap AO2 at 2-3/6, and cut at least 2 marks.
      const targetAo2Cap = Math.round(2.5 * (ao2Max / 6)); // max 2-3 out of 6
      const initialAo2 = analysis.awarded;
      analysis.awarded = Math.max(1, Math.min(initialAo2 - 2, targetAo2Cap));
      auditNotes.push(
        `AO2 Analysis Accuracy Penalty: Identified major diagram/curve shift error and flawed PED analysis. Under Cambridge 9708 standards, diagrammatic and elasticity inaccuracies require direct mark deductions in AO2 Analysis; AO2 Analysis capped at ${analysis.awarded}/${ao2Max}.`,
      );
    } else if (majorAnalysisCount >= 2) {
      // 2 or more major analysis/formula errors:
      const targetAo2Cap = Math.round(2.5 * (ao2Max / 6)); // max 2-3 out of 6
      const initialAo2 = analysis.awarded;
      analysis.awarded = Math.max(1, Math.min(initialAo2 - 2, targetAo2Cap));
      auditNotes.push(
        `AO2 Analysis Accuracy Penalty: Identified 2+ major economic errors in analysis (${majorAnalysisErrors.map((e) => e.id).join(", ")}). AO2 Analysis capped at ${analysis.awarded}/${ao2Max}.`,
      );
    } else if (majorAnalysisCount === 1) {
      // 1 major analysis error (Diagram alone, PED alone, Formula alone, or Mechanism alone):
      const targetAo2Cap = Math.round(3.5 * (ao2Max / 6)); // max 3-4 out of 6
      const initialAo2 = analysis.awarded;
      const deduction = initialAo2 >= 5 ? 2 : 1;
      analysis.awarded = Math.max(1, Math.min(initialAo2 - deduction, targetAo2Cap));
      auditNotes.push(
        `AO2 Analysis Accuracy Penalty: Identified major error in analysis (${majorAnalysisErrors[0]!.id}). AO2 Analysis capped at ${analysis.awarded}/${ao2Max}.`,
      );
    }

    // -----------------------------------------------------------------
    // 2. DIRECT AO1 KNOWLEDGE ACCURACY PENALTIES
    // If there is an explicit definition error:
    // -----------------------------------------------------------------
    if (hasDefErr) {
      knowledge.awarded = Math.min(knowledge.awarded, Math.round(1 * (ao1Max / 2)));
      auditNotes.push(
        `AO1 Knowledge Error Penalty: Major definition error identified. AO1 Knowledge capped at ${knowledge.awarded}/${ao1Max}.`,
      );
    }

    // -----------------------------------------------------------------
    // 3. QUESTION-FIT GATE & OVERALL TABLE A CAPS
    // -----------------------------------------------------------------
    if (failsComparativeGate) {
      // Question-Fit Gate: Answering "does X work?" instead of "is X the best?"
      // Under Cambridge rules: if 2+ major errors present, strictly cap Table A at Level 2 bottom band (3/8) and AO3 at 1/4.
      if (majorErrors.length >= 2 || totalErrors >= 2) {
        const targetAo3 = split.ao3_marks > 0 ? (hasConclusionAttempt ? 1 : Math.min(evaluation.awarded, 1)) : 0;
        evaluation.awarded = targetAo3;

        // 2+ major analytical errors + Question-Fit failure: Table A strictly capped at Level 2 bottom band (3/8)
        const targetTableA = Math.round(3 * (tableAMax / 8));
        const targetAo1 = Math.min(knowledge.awarded, Math.max(1, Math.round(targetTableA * (split.ao1_marks / tableAMax))));
        const targetAo2 = Math.min(analysis.awarded, targetTableA - targetAo1);
        knowledge.awarded = Math.max(1, targetAo1);
        analysis.awarded = Math.max(1, targetAo2);

        auditNotes.push(
          "Question-Fit Gate & Major Errors Cap: Essay addresses 'does supply-side policy work?' rather than evaluating if it is the 'best' method against alternatives, and contains 2+ major analytical inaccuracies. Table A (AO1+AO2) is capped at Level 2 bottom band (3/8) and AO3 is capped at 1/4 under Cambridge 9708 examiner standards.",
        );
      } else {
        // Question dodge without major errors: allow Level 2 (max 2/4 for AO3) for evaluating policy limitations
        const targetAo3 = split.ao3_marks > 0 ? Math.min(evaluation.awarded, Math.max(1, Math.round(2 * (split.ao3_marks / 4)))) : 0;
        evaluation.awarded = targetAo3;

        // Question dodge alone caps Table A at Level 2 top band (5/8)
        const targetTableA = Math.round(5 * (tableAMax / 8));
        const currentTableA = knowledge.awarded + analysis.awarded;
        if (currentTableA > targetTableA) {
          const delta = currentTableA - targetTableA;
          analysis.awarded = Math.max(1, analysis.awarded - delta);
          if (knowledge.awarded + analysis.awarded > targetTableA) {
            knowledge.awarded = Math.max(1, targetTableA - analysis.awarded);
          }
          auditNotes.push(
            "Question-Fit Gate Cap: Candidate did not compare the named policy against alternatives on a stated criterion. AO3 capped at Level 2 and Table A capped at Level 2 (max 5/8).",
          );
        }
      }
    } else if (majorErrors.length >= 2) {
      // 2 or more major errors: Table A capped at Level 2 (max 5/8)
      const targetTableA = Math.round(5 * (tableAMax / 8));
      const currentTableA = knowledge.awarded + analysis.awarded;
      if (currentTableA > targetTableA) {
        const delta = currentTableA - targetTableA;
        analysis.awarded = Math.max(1, analysis.awarded - delta);
        if (knowledge.awarded + analysis.awarded > targetTableA) {
          knowledge.awarded = Math.max(1, targetTableA - analysis.awarded);
        }
        auditNotes.push(
          `Table A Error Cap: 2 or more major economic errors identified. AO1+AO2 capped at Level 2 (max 5/8).`,
        );
      }
    } else if (majorErrors.length === 1) {
      // 1 major error: Table A max 7/8
      const targetTableA = Math.round(7 * (tableAMax / 8));
      const currentTableA = knowledge.awarded + analysis.awarded;
      if (currentTableA > targetTableA) {
        const delta = currentTableA - targetTableA;
        analysis.awarded = Math.max(1, analysis.awarded - delta);
        if (knowledge.awarded + analysis.awarded > targetTableA) {
          knowledge.awarded = Math.max(1, targetTableA - analysis.awarded);
        }
        auditNotes.push(`Table A Error Cap: 1 major economic error identified. AO1+AO2 capped at max 7/8.`);
      }
    }

    // -----------------------------------------------------------------
    // 4. HEDGE CONCLUSION CAP
    // -----------------------------------------------------------------
    if (hedgeCheck.isHedge) {
      const maxAo3Hedge = failsComparativeGate
        ? 1
        : Math.min(evaluation.awarded, Math.max(1, Math.round(2 * (split.ao3_marks / 4))));
      evaluation.awarded = Math.min(evaluation.awarded, maxAo3Hedge);
      auditNotes.push(
        `Table B Hedge Cap: Concluding with '${hedgeCheck.matchedPhrase}' without an explicit comparative ranking or conditions caps AO3 at ${maxAo3Hedge}/${split.ao3_marks}.`,
      );
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

  let strengths = toStringArray(raw.strengths).map(cleanPristineExaminerFeedback);
  let weaknesses = toStringArray(raw.weaknesses).map(cleanPristineExaminerFeedback);
  let actionableFeedback = toStringArray(raw.actionable_feedback).map(cleanPristineExaminerFeedback);
  let suggestedResources = toStringArray(raw.suggested_resources).map(cleanPristineExaminerFeedback);
  let suggestedPractice = toStringArray(raw.suggested_practice).map(cleanPristineExaminerFeedback);
  let examinerSummary = cleanPristineExaminerFeedback(String(raw.examiner_summary ?? ""));

  // Append audit summary if accuracy caps were triggered
  if (auditNotes.length > 0) {
    const auditSummary = `[Cambridge Senior Examiner Audit: ${auditNotes.join(" ")}]`;
    if (examinerSummary.includes("Cambridge Senior Examiner Audit")) {
      examinerSummary = examinerSummary.replace(/\[Cambridge Senior Examiner Audit:[^\]]*\]/gs, auditSummary);
      if (!examinerSummary.includes(auditSummary)) {
        examinerSummary = examinerSummary ? `${examinerSummary}\n\n${auditSummary}` : auditSummary;
      }
    } else {
      examinerSummary = examinerSummary ? `${examinerSummary}\n\n${auditSummary}` : auditSummary;
    }

    // Ensure detected errors are reflected in weaknesses without duplication or robotic phrasing
    for (const err of detectedErrors) {
      const desc = ERROR_DESCRIPTIONS[err.id];
      const category = desc?.category;

      const alreadyCovered = category
        ? coversErrorCategory(weaknesses, category)
        : weaknesses.some((w) => w.toLowerCase().includes(err.id.replace(/_/g, " ")));

      if (!alreadyCovered && desc) {
        weaknesses.unshift(desc.text);
      }
    }
  }

  // Deduplicate weaknesses and actionable feedback so no errors are repeated
  weaknesses = deduplicateFeedbackPoints(weaknesses);
  actionableFeedback = deduplicateFeedbackPoints(actionableFeedback);

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
      "Substantiating analytical arguments with concrete context or specific real-world examples would elevate the answer to the top band.",
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
      raw.grounding_status === "mark_scheme_image"
        ? "mark_scheme_image"
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
