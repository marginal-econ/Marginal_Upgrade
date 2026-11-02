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
  audit_line?: string;
};

export interface ComputedCaps {
  majorErrorCount: number;
  distinctFindings: {
    category: string;
    quote: string;
    correct_version: string;
    severity: "major" | "minor";
    is_definition_error?: boolean;
  }[];
  hasDefinitionError: boolean;
  completeRelevantChainsCount: number;
  failsQuestionFit: boolean;
  isHedgeConclusion: boolean;
  questionFitReason?: string;
  tableAMax: number;
  tableACap: number;
  tableAReason: string;
  maxAo1: number;
  maxAo2: number;
  tableBMax: number;
  tableBCap: number;
  tableBReason: string;
  auditLine: string;
}

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
  // Remove hard-coded cap sentences and legacy audit labels
  s = s.replace(/\bTable B Hedge Cap:[^\n\.]*\.?/gi, "");
  s = s.replace(/\bAO2 Analysis Accuracy Penalty:[^\n\.]*\.?/gi, "");
  s = s.replace(/\bcontradicts earlier claim regarding policy effectiveness[^\n\.]*\.?/gi, "");
  s = s.replace(/\bQuestion-fit:\s*passed[^\n\.]*\.?/gi, "");
  s = s.replace(/\[Cambridge Senior Examiner Audit:[^\]]*\]/gs, "");
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
    /(?:demand\s+is\s+(?:price\s+)?inelastic|inelastic\s+demand)[\s\S]{0,150}(?:the\s+tax\s+is\s+(?:very\s+|highly\s+)?effective|effective\s+because)/i.test(essayText) ||
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

  // 10. Unsubstantiated absolute claim: always rises/falls, ensures / completely corrects / solves / guarantees in main argument
  if (
    /\b(?:export\s+revenue|revenue|exports?)\s+always\s+(?:rises?|increases?)\b/i.test(essayText) ||
    /\b(?:import\s+spending|spending|imports?)\s+always\s+(?:falls?|decreases?)\b/i.test(essayText) ||
    /\b(?:ensures|completely\s+corrects|solves|guarantees)\b[\s\S]{0,100}\b(?:socially\s+optimal|market\s+failure|externalit|problem|allocative\s+efficiency|current\s+account|surplus|deficit|balance\s+of\s+payments|bop)\b/i.test(essayText) ||
    /\b(?:the\s+)?(?:tax|subsidy|policy|intervention|depreciation|devaluation)\s+(?:ensures|guarantees|solves|completely\s+corrects)\b/i.test(essayText) ||
    /\bensures\s+(?:that\s+)?(?:the\s+)?(?:current\s+account|trade\s+balance|bop)\b/i.test(essayText)
  ) {
    errors.push({
      id: "unsubstantiated_absolute_claim",
      trap: "Claiming an economic policy 'always' causes an outcome, 'ensures' a surplus, or 'completely corrects' a deficit/market failure without qualification",
      severity: "major",
    });
  }

  // 11. Depreciation vs Devaluation Confusion
  if (
    /\bdepreciation\b[\s\S]{0,120}\b(?:government|central\s+bank|state)\s+(?:lowers|reduces|decreases|cuts|sets|devalues)\s+(?:the\s+)?(?:value\s+of\s+its\s+)?currency\b/i.test(essayText) ||
    /\b(?:when\s+the\s+government|government\s+lowers)\b[\s\S]{0,80}\b(?:depreciation|depreciates)\b/i.test(essayText)
  ) {
    errors.push({
      id: "depreciation_devaluation_confusion",
      trap: "Confusing depreciation with devaluation: depreciation is a market-driven fall under floating exchange rates, whereas devaluation is an official government/central bank decision under fixed exchange rates",
      severity: "major",
    });
  }

  // 12. Marshall-Lerner Condition Reversal
  if (
    /\bmarshall[\s-]?lerner\b[\s\S]{0,150}\b(?:less\s+than\s+(?:one|1)|<\s*1|below\s+(?:one|1)|inelastic)\b/i.test(essayText) ||
    /\b(?:pedx?\s*\+\s*pedm?|elasticities\s+of\s+demand\s+for\s+exports\s+and\s+imports)\b[\s\S]{0,80}\b(?:less\s+than\s+(?:one|1)|<\s*1)\b/i.test(essayText)
  ) {
    errors.push({
      id: "marshall_lerner_error",
      trap: "Inverting the Marshall-Lerner condition: depreciation improves the current account only if the sum of PED for exports and imports is greater than 1 (PEDx + PEDm > 1), not less than 1",
      severity: "major",
    });
  }

  // 13. Inelastic demand claimed to work best for depreciation / shrink deficit
  if (
    /\b(?:depreciation|fall\s+in\s+(?:the\s+)?exchange\s+rate|devaluation)\b[\s\S]{0,100}\bworks?\s+best\b[\s\S]{0,80}\binelastic\b/i.test(essayText) ||
    /\binelastic\s+demand\b[\s\S]{0,120}\b(?:works?\s+best|deficit\s+shrinks|improves?\s+(?:the\s+)?(?:current\s+account|trade\s+balance|deficit))\b/i.test(essayText) ||
    /\bdepreciation\s+works\s+best\s+when\s+goods\s+are\s+necessities\b/i.test(essayText)
  ) {
    errors.push({
      id: "ped_inelastic_exchange_rate",
      trap: "Flawed elasticity analysis: claiming depreciation works best when demand is inelastic (inelastic demand means export revenue falls and import spending rises, worsening the deficit)",
      severity: "major",
    });
  }

  // 14. Inverted J-Curve Mechanism
  if (
    /\bj[\s-]?curve\b[\s\S]{0,150}\b(?:at\s+first|initially|in\s+the\s+short\s+run)[\s\S]{0,80}\b(?:improves?|gets?\s+better|surplus)[\s\S]{0,120}\b(?:worsens?|deteriorates?|deficit\s+worsens?)\b/i.test(essayText) ||
    /\bj[\s-]?curve\b[\s\S]{0,150}\b(?:improves?\s+(?:quickly|immediately)[\s\S]{0,80}\bdeficit\s+worsens?)\b/i.test(essayText)
  ) {
    errors.push({
      id: "inverted_j_curve",
      trap: "Inverted J-curve mechanism: the J-curve shows the current account worsens in the short run due to inelastic demand contracts, and only improves in the long run as elasticities adjust",
      severity: "major",
    });
  }

  // 15. Price control excess demand / supply reversal
  if (
    /\b(?:minimum\s+wage|price\s+floor|minimum\s+price)\b[\s\S]{0,120}\b(?:excess\s+demand|shortage\s+of\s+labou?r|labou?r\s+shortage)\b/i.test(essayText) ||
    /\b(?:maximum\s+price|price\s+ceiling|rent\s+control)\b[\s\S]{0,120}\b(?:excess\s+supply|surplus)\b/i.test(essayText)
  ) {
    errors.push({
      id: "price_control_reversal",
      trap: "Excess demand and excess supply reversed at a price control (minimum wage above equilibrium causes excess supply of labour / unemployment, not shortage; price ceiling causes excess demand / shortage)",
      severity: "major",
    });
  }

  // 16. Price floor called ceiling or reverse
  if (
    /\b(?:minimum\s+wage|minimum\s+price|price\s+floor)\b[\s\S]{0,80}\b(?:is\s+a\s+(?:price\s+)?ceiling|acts?\s+as\s+a\s+(?:price\s+)?ceiling|called\s+a\s+(?:price\s+)?ceiling)\b/i.test(essayText) ||
    /\b(?:maximum\s+price|rent\s+control|price\s+ceiling)\b[\s\S]{0,80}\b(?:is\s+a\s+(?:price\s+)?floor|acts?\s+as\s+a\s+(?:price\s+)?floor|called\s+a\s+(?:price\s+)?floor)\b/i.test(essayText)
  ) {
    errors.push({
      id: "price_floor_ceiling_confusion",
      trap: "Confusing a price floor with a price ceiling (minimum wage and minimum price are price floors; maximum price and rent control are price ceilings)",
      severity: "major",
    });
  }

  // 17. Contradiction where script says "no negative effects" and later admits a negative effect
  if (
    /\b(?:no\s+negative\s+effects?|no\s+drawbacks?|no\s+disadvantages?|only\s+benefits?|no\s+downside|no\s+adverse\s+effects?)\b/i.test(essayText) &&
    /\b(?:regressive|worsen\s+inequality|inequality|unemployment|black\s+market|opportunity\s+cost|cost\s+to\s+the\s+government|government\s+(?:debt|cost|spending)|inflationary|trade-off|deadweight\s+loss)\b/i.test(essayText)
  ) {
    errors.push({
      id: "no_negative_effects_contradiction",
      trap: "Contradiction: asserting that an economic policy has 'no negative effects' or 'only benefits', but later discussing negative consequences, regressivity, or costs",
      severity: "major",
    });
  }

  // 18. Growth, GDP or key-term definition omitting essential element (e.g. growth without "real", living standards as income only)
  if (
    /\b(?:economic\s+growth\s+(?:is\s+defined\s+as|is\s+referred\s+to\s+as|refers\s+to|is|defined\s+as|means?)\s+(?:an?\s+)?(?:increase|rise|expansion)\s+in\s+(?:gdp|output|national\s+income))\b/i.test(essayText) &&
    !/\b(?:real\s+gdp|real\s+national\s+income|adjusted\s+for\s+inflation|productive\s+capacity|real\s+output)\b/i.test(essayText)
  ) {
    errors.push({
      id: "growth_definition_missing_real",
      trap: "Economic growth defined without 'real': economic growth is an increase in real GDP (adjusted for inflation) or an expansion in productive capacity, not merely nominal GDP",
      severity: "major",
    });
  } else if (
    /\bliving\s+standards?\s+(?:are|is|defined\s+as|means?)\s+(?:only\s+)?(?:national\s+income|gdp|income\s+per\s+capita)\b/i.test(essayText) ||
    /\bmeasure\s+living\s+standards?\s+solely\s+by\s+(?:gdp|income)\b/i.test(essayText)
  ) {
    errors.push({
      id: "living_standards_income_only",
      trap: "Living standards defined as income/GDP only (living standards encompass both material factors and non-material welfare including health, education, environmental quality, and income distribution)",
      severity: "major",
    });
  }

  // 19. Trickle-down or "inequality always falls" claims
  if (
    /\b(?:trickle[\s-]?down\s+(?:economics\s+)?(?:ensures?|guarantees?|means?\s+everyone\s+benefits)|inequality\s+always\s+(?:falls?|decreases?|reduces?))\b/i.test(essayText) ||
    /\b(?:economic\s+growth|tax\s+cuts?)\s+always\s+(?:reduces?|decreases?|eliminates?)\s+inequality\b/i.test(essayText)
  ) {
    errors.push({
      id: "trickle_down_inequality_claim",
      trap: "Unsubstantiated claim: asserting that trickle-down economics ensures broad benefit or that 'inequality always falls' with growth (growth can increase income inequality without redistribution)",
      severity: "major",
    });
  }

  // 20. Wrong formula components (e.g. imports added to GDP)
  if (
    /\b(?:ad|gdp|aggregate\s+demand)\s*=\s*c\s*\+\s*i\s*\+\s*g\s*\+\s*\(?\s*x\s*\+\s*m\s*\)?/i.test(essayText) ||
    /\bimports?\s+(?:add|adds|increases?|contributes?)\s+to\s+(?:gdp|aggregate\s+demand|ad)\b/i.test(essayText) ||
    /\b\(\s*x\s*\+\s*m\s*\)\s*(?:in\s+ad|in\s+gdp|is\s+net\s+exports)\b/i.test(essayText)
  ) {
    errors.push({
      id: "wrong_formula_imports_added",
      trap: "Formula error: imports added to GDP/AD (imports are a withdrawal from the circular flow and must be subtracted: AD = C + I + G + (X - M))",
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
    fullFeedback.includes("curve shifts") ||
    fullFeedback.includes("demand curve left instead of supply") ||
    (fullFeedback.includes("demand curve") && fullFeedback.includes("supply curve") && (fullFeedback.includes("instead of") || fullFeedback.includes("error"))) ||
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
      fullFeedback.includes("error") ||
      fullFeedback.includes("contradicts the economic principle") ||
      fullFeedback.includes("contradicts economic")) ||
    fullFeedback.includes("inelastic demand makes the tax 'very effective'") ||
    fullFeedback.includes("inelastic demand makes the tax very effective") ||
    fullFeedback.includes("inelastic demand means the tax is less effective") ||
    (fullFeedback.includes("elasticity") && (fullFeedback.includes("flawed") || fullFeedback.includes("inaccurac") || fullFeedback.includes("logical error") || fullFeedback.includes("error")))
  ) {
    errors.push({
      id: "ped_inelastic_effectiveness",
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

  // 5. Unsubstantiated absolute claim in feedback
  if (
    fullFeedback.includes("ensures that society reaches") ||
    fullFeedback.includes("market failure is completely corrected") ||
    fullFeedback.includes("overstatement and lacks nuance") ||
    fullFeedback.includes("completely corrects") ||
    fullFeedback.includes("unsubstantiated absolute claim") ||
    fullFeedback.includes("always rises") ||
    fullFeedback.includes("ensures that the current account") ||
    fullFeedback.includes("ensures surplus") ||
    (fullFeedback.includes("ensures") && (fullFeedback.includes("market failure") || fullFeedback.includes("surplus") || fullFeedback.includes("deficit")))
  ) {
    errors.push({
      id: "unsubstantiated_absolute_claim",
      trap: "Claiming a policy 'always' causes an outcome, 'ensures' a surplus, or 'completely corrects' a deficit/market failure without qualification",
      severity: "major",
    });
  }

  // 6. Depreciation vs Devaluation in feedback
  if (
    fullFeedback.includes("confuses depreciation with devaluation") ||
    fullFeedback.includes("depreciation is market-driven") ||
    fullFeedback.includes("government lowers the value of its currency") ||
    (fullFeedback.includes("depreciation") && fullFeedback.includes("devaluation"))
  ) {
    errors.push({
      id: "depreciation_devaluation_confusion",
      trap: "Confusing depreciation with devaluation (floating vs fixed exchange rate mechanisms)",
      severity: "major",
    });
  }

  // 7. Marshall-Lerner error in feedback
  if (
    (fullFeedback.includes("marshall-lerner") || fullFeedback.includes("marshall lerner")) &&
    (fullFeedback.includes("less than one") || fullFeedback.includes("greater than one") || fullFeedback.includes("error") || fullFeedback.includes("incorrect") || fullFeedback.includes("misstated") || fullFeedback.includes("inaccura"))
  ) {
    errors.push({
      id: "marshall_lerner_error",
      trap: "Inverting the Marshall-Lerner condition (requires PEDx + PEDm > 1)",
      severity: "major",
    });
  }

  // 8. Inverted J-curve in feedback
  if (
    (fullFeedback.includes("j-curve") || fullFeedback.includes("j curve")) &&
    (fullFeedback.includes("misdescribed") || fullFeedback.includes("worsens again") || fullFeedback.includes("inverted") || fullFeedback.includes("error") || fullFeedback.includes("incorrect") || fullFeedback.includes("short-run worsening"))
  ) {
    errors.push({
      id: "inverted_j_curve",
      trap: "Inverting the J-curve effect (short-run worsening followed by long-run improvement)",
      severity: "major",
    });
  }

  // 9. Inelastic demand on exchange rate in feedback
  if (
    (fullFeedback.includes("depreciation") || fullFeedback.includes("exchange rate")) &&
    (fullFeedback.includes("inelastic demand") || fullFeedback.includes("elasticity theory")) &&
    (fullFeedback.includes("error") || fullFeedback.includes("misconception") || fullFeedback.includes("flaw") || fullFeedback.includes("works best"))
  ) {
    errors.push({
      id: "ped_inelastic_exchange_rate",
      trap: "Flawed elasticity analysis: claiming depreciation works best when demand is inelastic",
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

export interface QuestionFitResult {
  isComparativeQuestion: boolean;
  isToWhatExtentQuestion: boolean;
  hasAlternativeAnalysis: boolean;
  hasDegreeAndConditions: boolean;
  failsQuestionFit: boolean;
  missingAlternativeNote?: string;
  auditReason?: string;
}

/**
 * Checks question-fit against command words:
 * - "best", "most", "main", "most effective": requires comparing named option with alternative on a criterion
 * - "to what extent": requires stated degree and conditions
 */
export function checkQuestionFit(questionText: string, essayText: string): QuestionFitResult {
  const q = questionText.toLowerCase();
  const isComparative =
    /\b(best|most|main|most\s+effective|most\s+likely|primary|superior|only\s+way)\b/i.test(q) ||
    (/\bassess\s+whether\b/i.test(q) && /\b(?:likely\s+to|improve|reduce|solve|correct)\b/i.test(q));
  const isToWhatExtent = /\b(to\s+what\s+extent|assess\s+the\s+extent|how\s+far)\b/i.test(q);

  if (!isComparative && !isToWhatExtent) {
    return {
      isComparativeQuestion: false,
      isToWhatExtentQuestion: false,
      hasAlternativeAnalysis: true,
      hasDegreeAndConditions: true,
      failsQuestionFit: false,
    };
  }

  const paragraphs = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !p.startsWith("[DIAGRAM:"));

  const bodyParagraphs = paragraphs.slice(0, -1);
  const bodyText = (bodyParagraphs.length > 0 ? bodyParagraphs.join("\n\n") : essayText).toLowerCase();
  const fullText = essayText.toLowerCase();

  // 1. For "best", "most", "main", "most effective":
  if (isComparative) {
    // Specific question: supply-side vs inflation
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
        isToWhatExtentQuestion: false,
        hasAlternativeAnalysis: hasAlternative,
        hasDegreeAndConditions: true,
        failsQuestionFit: !hasAlternative,
        missingAlternativeNote: hasAlternative
          ? undefined
          : "The question requires assessing whether supply-side policy is the 'best' method to reduce inflation. The candidate writes exclusively on supply-side policies in the body and does not analyse alternative policies (contractionary monetary or fiscal policy) on a stated criterion.",
        auditReason: "does not compare supply-side policy with an alternative on a stated criterion",
      };
    }

    // Specific question: indirect tax vs demerit goods
    if (q.includes("indirect tax") && q.includes("demerit")) {
      const mentionsAltPolicy =
        fullText.includes("advertising") ||
        fullText.includes("education") ||
        fullText.includes("awareness") ||
        fullText.includes("campaign") ||
        fullText.includes("regulation") ||
        fullText.includes("legislation") ||
        fullText.includes("ban") ||
        fullText.includes("subsidy") ||
        fullText.includes("subsidies") ||
        fullText.includes("minimum price") ||
        fullText.includes("price floor") ||
        fullText.includes("alternative");

      const hasComparativeCriterion =
        mentionsAltPolicy &&
        (fullText.includes("compared to") ||
          fullText.includes("in comparison") ||
          fullText.includes("more effective") ||
          fullText.includes("less effective") ||
          fullText.includes("superior to") ||
          fullText.includes("preferable") ||
          fullText.includes("whereas") ||
          fullText.includes("in contrast") ||
          fullText.includes("alternatively") ||
          fullText.includes("however") ||
          fullText.includes("while") ||
          fullText.includes("on the other hand") ||
          fullText.includes("on the criterion of") ||
          fullText.includes("opportunity cost") ||
          fullText.includes("cost to the government") ||
          fullText.includes("time lag") ||
          fullText.includes("elasticity") ||
          fullText.includes("ped") ||
          fullText.includes("trade-off") ||
          fullText.includes("trade off") ||
          fullText.includes("effectiveness"));

      return {
        isComparativeQuestion: true,
        isToWhatExtentQuestion: false,
        hasAlternativeAnalysis: hasComparativeCriterion,
        hasDegreeAndConditions: true,
        failsQuestionFit: !hasComparativeCriterion,
        missingAlternativeNote: hasComparativeCriterion
          ? undefined
          : "The question asks whether indirect taxes are the 'best' method to reduce consumption of demerit goods. The candidate does not compare indirect taxes against alternative policies on an explicit economic criterion.",
        auditReason: "does not compare indirect taxes with an alternative on a stated criterion",
      };
    }

    // Specific question: exchange rate vs current account deficit
    if ((q.includes("exchange rate") || q.includes("depreciation")) && (q.includes("current account") || q.includes("deficit") || q.includes("bop"))) {
      const mentionsAltPolicy =
        bodyText.includes("expenditure-reducing") ||
        bodyText.includes("expenditure reducing") ||
        bodyText.includes("expenditure-switching") ||
        bodyText.includes("expenditure switching") ||
        bodyText.includes("tariff") ||
        bodyText.includes("quota") ||
        bodyText.includes("protectionism") ||
        bodyText.includes("contractionary") ||
        bodyText.includes("fiscal policy") ||
        bodyText.includes("raise interest rates") ||
        bodyText.includes("higher interest rates") ||
        bodyText.includes("supply-side") ||
        bodyText.includes("supply side");

      const hasComparativeCriterion =
        mentionsAltPolicy &&
        (bodyText.includes("compared to") ||
          bodyText.includes("in comparison with") ||
          bodyText.includes("more effective than") ||
          bodyText.includes("superior to") ||
          bodyText.includes("preferable to") ||
          bodyText.includes("whereas") ||
          bodyText.includes("on the criterion of") ||
          bodyText.includes("opportunity cost") ||
          bodyText.includes("inflationary impact") ||
          bodyText.includes("time lag"));

      return {
        isComparativeQuestion: true,
        isToWhatExtentQuestion: false,
        hasAlternativeAnalysis: hasComparativeCriterion,
        hasDegreeAndConditions: true,
        failsQuestionFit: !hasComparativeCriterion,
        missingAlternativeNote: hasComparativeCriterion
          ? undefined
          : "The question requires assessing whether a fall in the exchange rate is likely to improve a country's current account deficit. The candidate writes exclusively on depreciation and does not evaluate alternative deficit-reduction policies (e.g. expenditure-reducing monetary/fiscal policies, tariffs, or supply-side reforms) on a stated criterion.",
        auditReason: "does not compare exchange rate depreciation with alternative deficit-reduction policies on a stated criterion",
      };
    }

    // Specific question: subsidy vs merit goods
    if (q.includes("subsidy") && (q.includes("merit") || q.includes("consumption"))) {
      const mentionsAltPolicy =
        fullText.includes("education") ||
        fullText.includes("advertising") ||
        fullText.includes("campaign") ||
        fullText.includes("information") ||
        fullText.includes("direct provision") ||
        fullText.includes("state provision") ||
        fullText.includes("free provision") ||
        fullText.includes("maximum price") ||
        fullText.includes("price ceiling") ||
        fullText.includes("regulation") ||
        fullText.includes("legislation") ||
        fullText.includes("mandate") ||
        fullText.includes("compulsory") ||
        fullText.includes("tax cut") ||
        fullText.includes("income tax") ||
        fullText.includes("voucher") ||
        fullText.includes("alternative");

      const hasComparativeCriterion =
        mentionsAltPolicy &&
        (fullText.includes("compared to") ||
          fullText.includes("in comparison") ||
          fullText.includes("more effective") ||
          fullText.includes("less effective") ||
          fullText.includes("superior to") ||
          fullText.includes("preferable") ||
          fullText.includes("whereas") ||
          fullText.includes("in contrast") ||
          fullText.includes("alternatively") ||
          fullText.includes("however") ||
          fullText.includes("while") ||
          fullText.includes("on the other hand") ||
          fullText.includes("opportunity cost") ||
          fullText.includes("fiscal") ||
          fullText.includes("cost to the government") ||
          fullText.includes("time lag") ||
          fullText.includes("elasticity") ||
          fullText.includes("ped") ||
          fullText.includes("trade-off") ||
          fullText.includes("trade off") ||
          fullText.includes("drawback") ||
          fullText.includes("limitation") ||
          fullText.includes("effectiveness"));

      return {
        isComparativeQuestion: true,
        isToWhatExtentQuestion: false,
        hasAlternativeAnalysis: hasComparativeCriterion,
        hasDegreeAndConditions: true,
        failsQuestionFit: !hasComparativeCriterion,
        missingAlternativeNote: hasComparativeCriterion
          ? undefined
          : "The question asks whether a subsidy is the best method to increase consumption of merit goods. The candidate does not compare subsidies against alternative policies on an explicit economic criterion.",
        auditReason: "does not compare subsidy with an alternative on a stated criterion",
      };
    }

    // General comparative check
    const mentionsGeneralAlternative =
      /\b(alternativ|other\s+polic|another\s+polic|second\s+polic|supplementary\s+polic|instead|education|advertising|campaign|awareness|regulation|legislation|ban|direct\s+provision|state\s+provision|free\s+provision|maximum\s+price|minimum\s+price|price\s+ceiling|price\s+floor|tax|subsid|monetary\s+policy|fiscal\s+policy|supply[\s-]side|interest\s+rate|tariff|quota|protectionism)\b/i.test(fullText);

    const hasComparativeLanguage =
      mentionsGeneralAlternative &&
      (/\b(compared\s+to|in\s+comparison|more\s+effective|less\s+effective|superior|preferable|outweighs?|on\s+the\s+criterion|criterion\s+of|time\s+lag|opportunity\s+cost|fiscal|trade[\s-]?off|drawback|limitation|elasticity|ped|better\s+than|worse\s+than|whereas|in\s+contrast|alternatively|however|while|relative\s+to|effectiveness|first\s+policy|second\s+policy|best\s+method)\b/i.test(fullText) ||
       /\b(first\s+policy|second\s+policy|best\s+method|more\s+suitable)\b/i.test(bodyText));

    return {
      isComparativeQuestion: true,
      isToWhatExtentQuestion: false,
      hasAlternativeAnalysis: hasComparativeLanguage,
      hasDegreeAndConditions: true,
      failsQuestionFit: !hasComparativeLanguage,
      missingAlternativeNote: hasComparativeLanguage
        ? undefined
        : "Candidate does not compare the named policy against alternatives on an explicit criterion.",
      auditReason: "does not compare the named option with an alternative on a criterion",
    };
  }

  // 2. For "to what extent":
  const hasDegree =
    /\b(to\s+a\s+(?:large|great|limited|significant|certain)\s+extent|partially|not\s+always|depends\s+on|in\s+the\s+short\s+run\s+vs\s+long\s+run)\b/i.test(fullText);
  const hasConditions =
    /\b(depends\s+on|provided\s+that|conditional|short\s+run|long\s+run|if\s+the\s+government|elasticity)\b/i.test(fullText);

  const passesExtent = hasDegree && hasConditions;
  return {
    isComparativeQuestion: false,
    isToWhatExtentQuestion: true,
    hasAlternativeAnalysis: true,
    hasDegreeAndConditions: passesExtent,
    failsQuestionFit: !passesExtent,
    missingAlternativeNote: passesExtent
      ? undefined
      : "Question-fit failure: Candidate does not evaluate a stated degree and the conditions it depends on for a 'to what extent' question.",
    auditReason: "does not give a stated degree and conditions",
  };
}

export const detectComparativeAnalysis = checkQuestionFit;

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
  unsubstantiated_absolute_claim: {
    category: "mechanism",
    text: "Unsubstantiated absolute claim: Asserting that a policy 'always' causes an outcome, 'ensures' a surplus, or 'completely corrects' market failure ignores elasticity conditions, time lags, domestic inflation, and foreign retaliation.",
  },
  depreciation_devaluation_confusion: {
    category: "definition",
    text: "Definitional confusion: The essay defines depreciation as the government lowering currency value; depreciation is a market-driven decrease in value under floating exchange rates, whereas devaluation is an official government/central bank adjustment under fixed exchange rates.",
  },
  marshall_lerner_error: {
    category: "elasticity",
    text: "Marshall-Lerner condition inverted: A currency depreciation improves the current account balance only if the sum of export and import price elasticities of demand exceeds 1 (PEDx + PEDm > 1), not less than 1.",
  },
  ped_inelastic_exchange_rate: {
    category: "elasticity",
    text: "Flawed elasticity reasoning: Asserting that depreciation works best when demand is price inelastic contradicts elasticity theory and the J-curve; with inelastic demand (%ΔQ < %ΔP), export revenue falls and import expenditure rises, worsening the deficit.",
  },
  inverted_j_curve: {
    category: "mechanism",
    text: "J-curve sequence inverted: The J-curve demonstrates that the current account deficit worsens in the short run because trade contracts are fixed and demand is inelastic, only improving in the longer run as elasticities adjust.",
  },
  price_control_reversal: {
    category: "mechanism",
    text: "Excess demand and excess supply reversed at a price control: A minimum wage or price floor set above equilibrium creates excess supply of labour (unemployment / surplus), not excess demand or shortage; a price ceiling set below equilibrium creates excess demand (shortage), not excess supply.",
  },
  price_floor_ceiling_confusion: {
    category: "mechanism",
    text: "Price control confusion: A minimum wage or minimum unit price is a price floor (minimum price set above equilibrium), not a price ceiling; rent control or maximum pricing is a price ceiling (set below equilibrium), not a price floor.",
  },
  no_negative_effects_contradiction: {
    category: "mechanism",
    text: "Internal contradiction: The essay makes an absolute claim that a policy has 'no negative effects' or 'only benefits', but elsewhere identifies significant negative trade-offs, unintended consequences, or government costs.",
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
          s.includes("marshall-lerner") ||
          s.includes("marshall lerner") ||
          (s.includes("elasticity") && (s.includes("inelastic") || s.includes("elastic") || s.includes("flaw") || s.includes("error")))
        );
      case "formula":
        return s.includes("formula") || s.includes("%Δ") || s.includes("calculation");
      case "definition":
        return (
          s.includes("hyperinflation") ||
          s.includes("accelerating inflation") ||
          (s.includes("depreciation") && s.includes("devaluation")) ||
          s.includes("definitional confusion") ||
          s.includes("definition")
        );
      case "mechanism":
        return (
          s.includes("money supply") ||
          s.includes("as equals ad") ||
          s.includes("transmission") ||
          s.includes("j-curve") ||
          s.includes("j curve") ||
          s.includes("ensures") ||
          s.includes("always rises") ||
          s.includes("completely correct") ||
          s.includes("absolute claim")
        );
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
 * Sanitizes AO3 prose comment so that any numeric cap mentioned in text
 * strictly matches the code-computed Table B cap (or is updated to match).
 */
export function sanitizeAo3ProseCaps(comment: string, computedAo3Cap: number): string {
  let c = comment.replace(
    /\b(?:caps?|capped|max(?:imum)?)\s+(?:AO3|evaluation|Table\s*B)?\s*(?:at\s+|to\s+)?([0-4])(?:\s*\/\s*4)?\b/gi,
    (match, num) => {
      if (parseInt(num, 10) !== computedAo3Cap) {
        return `capped at ${computedAo3Cap}/4`;
      }
      return match;
    },
  );
  c = c.replace(
    /\b(?:AO3|evaluation|Table\s*B)\s+(?:is\s+)?(?:capped|restricted|limited)\s+(?:at\s+|to\s+)?([0-4])(?:\s*\/\s*4)?\b/gi,
    (match, num) => {
      if (parseInt(num, 10) !== computedAo3Cap) {
        return `AO3 is capped at ${computedAo3Cap}/4`;
      }
      return match;
    },
  );
  c = c.replace(
    /\b(?:cap|restricted\s+to)\s+([0-4])\/4\b/gi,
    (match, num) => {
      if (parseInt(num, 10) !== computedAo3Cap) {
        return `cap ${computedAo3Cap}/4`;
      }
      return match;
    },
  );
  return c;
}

export const isDiagramError = (id: string) =>
  id === "tax_demand_shift" ||
  id === "shift_directions" ||
  id === "price_causes_shift" ||
  id === "demand_shifting_supply" ||
  id === "diagram_shift_error";

export const isPedError = (id: string) =>
  id === "ped_inelastic_effectiveness" ||
  id === "ped_inelastic_exchange_rate" ||
  id === "inverted_ped_formula";

export const isFormulaError = (id: string) =>
  id === "inverted_ped_formula" ||
  id === "formula_error" ||
  id === "wrong_formula_imports_added";

export const isDefinitionError = (id: string) =>
  id === "hyperinflation" ||
  id === "depreciation_devaluation_confusion" ||
  id === "growth_definition_missing_real" ||
  id === "living_standards_income_only";

export const isAbsoluteClaimError = (id: string) =>
  id === "unsubstantiated_absolute_claim" ||
  id === "trickle_down_inequality_claim";

export const isMarshallLernerError = (id: string) =>
  id === "marshall_lerner_error";

export const isJCurveError = (id: string) =>
  id === "inverted_j_curve";

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
  sources?: GroundingSource[],
  computedCaps?: ComputedCaps,
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
    const ao1Max = split.ao1_marks;

    const hasDiagramErr = majorErrors.some((e) => isDiagramError(e.id));
    const hasPedErr = majorErrors.some((e) => isPedError(e.id));
    const hasDefErr = computedCaps?.hasDefinitionError ?? majorErrors.some((e) => isDefinitionError(e.id));
    const hasAbsoluteClaimErr = majorErrors.some((e) => isAbsoluteClaimError(e.id));
    const hasDevalErr = majorErrors.some((e) => e.id === "depreciation_devaluation_confusion");
    const hasMLErr = majorErrors.some((e) => isMarshallLernerError(e.id));
    const hasJCurveErr = majorErrors.some((e) => isJCurveError(e.id));

    // Question-Fit Analysis
    const questionFit = question && essayText
      ? checkQuestionFit(question, essayText)
      : {
          isComparativeQuestion: false,
          isToWhatExtentQuestion: false,
          hasAlternativeAnalysis: true,
          hasDegreeAndConditions: true,
          failsQuestionFit: false,
        };

    const failsQuestionFit = computedCaps?.failsQuestionFit ?? questionFit.failsQuestionFit;

    // Deduplicate major errors by category so diagram error or PED error isn't counted twice
    const distinctMajorErrorCategories = new Set<string>();
    const distinctMajorErrors: DetectedError[] = [];
    for (const err of majorErrors) {
      const cat = isDiagramError(err.id)
        ? "diagram"
        : err.id === "depreciation_devaluation_confusion"
          ? "devaluation_confusion"
          : isDefinitionError(err.id)
            ? "definition"
            : isMarshallLernerError(err.id)
              ? "marshall_lerner"
              : isJCurveError(err.id)
                ? "j_curve"
                : err.id === "ped_inelastic_exchange_rate"
                  ? "ped_exchange_rate"
                  : isPedError(err.id)
                    ? "ped"
                    : isAbsoluteClaimError(err.id)
                      ? "absolute_claim"
                      : err.id;
      if (!distinctMajorErrorCategories.has(cat)) {
        distinctMajorErrorCategories.add(cat);
        distinctMajorErrors.push(err);
      }
    }

    // Distinct named errors list for single audit line
    const namedErrors: string[] = [];
    if (hasDiagramErr) namedErrors.push("demand curve shift");
    if (hasDevalErr) namedErrors.push("depreciation confused with devaluation (government lowering currency)");
    if (hasMLErr) namedErrors.push("Marshall-Lerner condition reversed (< 1)");
    if (majorErrors.some((e) => e.id === "ped_inelastic_exchange_rate")) {
      namedErrors.push("inelastic demand claimed to improve deficit");
    } else if (hasPedErr) {
      namedErrors.push("inelastic demand reasoning");
    }
    if (hasJCurveErr) namedErrors.push("inverted J-curve sequence");
    if (hasAbsoluteClaimErr) {
      namedErrors.push("unsubstantiated 'always rises / ensures surplus' claim");
    }
    if (majorErrors.some((e) => e.id === "hyperinflation")) {
      namedErrors.push("hyperinflation definition");
    }
    for (const e of distinctMajorErrors) {
      if (
        !isDiagramError(e.id) &&
        !isPedError(e.id) &&
        !isAbsoluteClaimError(e.id) &&
        !isDefinitionError(e.id) &&
        !isMarshallLernerError(e.id) &&
        !isJCurveError(e.id)
      ) {
        namedErrors.push(e.id.replace(/_/g, " "));
      }
    }
    const namedErrorsStr = namedErrors.length > 0 ? namedErrors.join(", ") : "major analytical errors";

    // -----------------------------------------------------------------
    // 1. TABLE B CAPPING (Question-Fit & Hedge Caps)
    // -----------------------------------------------------------------
    let tableBCap = computedCaps ? computedCaps.tableBCap : split.ao3_marks;
    let tableBReason = computedCaps
      ? computedCaps.tableBReason
      : "direct comparison on stated criteria and justified judgement";

    if (!computedCaps) {
      if (failsQuestionFit) {
        tableBCap = 1;
        tableBReason = `Question-fit failure: ${questionFit.auditReason || "does not address comparative criterion or degree"}`;
      } else if (hedgeCheck.isHedge) {
        tableBCap = 2;
        tableBReason = "Hedge conclusion without an explicit comparative ranking or conditions";
      }
    }

    const rawAo3 = evaluation.awarded;
    let finalAo3 = Math.min(rawAo3, tableBCap);
    if (hasConclusionAttempt && finalAo3 === 0 && split.ao3_marks > 0) {
      finalAo3 = 1;
    }
    evaluation.awarded = finalAo3;

    // Never write a numeric cap in the AO3 text that differs from the computed cap
    evaluation.comment = sanitizeAo3ProseCaps(evaluation.comment, finalAo3);

    // -----------------------------------------------------------------
    // 2. TABLE A CAPPING (AO1+AO2, max 8) — Compute as ONE number first
    // -----------------------------------------------------------------
    let tableACap = computedCaps ? computedCaps.tableACap : tableAMax;
    let tableAReason = computedCaps
      ? computedCaps.tableAReason
      : "no major analytical errors, 3+ complete chains";

    if (!computedCaps) {
      if (distinctMajorErrors.length >= 3 || (distinctMajorErrors.length >= 2 && failsQuestionFit)) {
        tableACap = 3;
        tableAReason = failsQuestionFit
          ? `Question-fit failure and ${distinctMajorErrors.length} major errors: ${namedErrorsStr}`
          : `${distinctMajorErrors.length} major errors: ${namedErrorsStr}`;
      } else if (distinctMajorErrors.length === 2) {
        tableACap = 5;
        tableAReason = `2 major errors: ${namedErrorsStr}`;
      } else if (failsQuestionFit) {
        tableACap = 5;
        tableAReason = `Question-fit failure: ${questionFit.auditReason || "does not compare on a criterion"}`;
      } else if (distinctMajorErrors.length === 1) {
        tableACap = 7;
        tableAReason = `1 major error: ${namedErrorsStr}`;
      }
    }

    const rawTableA = Math.min(tableAMax, knowledge.awarded + analysis.awarded);
    const cappedTableA = Math.min(rawTableA, tableACap);

    // Split Table A: AO1 gets up to 2 (max 1 if key definition error), AO2 is Table A minus AO1
    const maxAo1Allowed = computedCaps ? computedCaps.maxAo1 : (hasDefErr ? 1 : Math.min(split.ao1_marks, cappedTableA));
    const finalAo1 = Math.min(knowledge.awarded, maxAo1Allowed, cappedTableA);
    const finalAo2 = Math.max(0, cappedTableA - finalAo1);

    knowledge.awarded = finalAo1;
    analysis.awarded = finalAo2;

    // -----------------------------------------------------------------
    // 3. AUDIT LINE GENERATION (Only ONE cap per table, matching final marks)
    // -----------------------------------------------------------------
    tableAReason = tableAReason.replace(/(?:Question-fit failure:\s*)+/gi, "Question-fit failure: ");
    tableBReason = tableBReason.replace(/(?:Question-fit failure:\s*)+/gi, "Question-fit failure: ");
    let singleAuditLine = `Audit: Table A capped at ${cappedTableA}/${tableAMax} (${tableAReason}); Table B capped at ${finalAo3}/${split.ao3_marks} (${tableBReason}). Final marks: AO1 ${finalAo1}, AO2 ${finalAo2}, AO3 ${finalAo3}.`;
    singleAuditLine = singleAuditLine.replace(/(?:Question-fit failure:\s*)+/gi, "Question-fit failure: ");
    auditNotes.push(singleAuditLine);
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
  const rawWeaknessList = toStringArray(raw.weaknesses).map(cleanPristineExaminerFeedback);
  let actionableFeedback = toStringArray(raw.actionable_feedback).map(cleanPristineExaminerFeedback);
  let suggestedResources = toStringArray(raw.suggested_resources).map(cleanPristineExaminerFeedback);
  let suggestedPractice = toStringArray(raw.suggested_practice).map(cleanPristineExaminerFeedback);
  let examinerSummary = cleanPristineExaminerFeedback(String(raw.examiner_summary ?? ""));

  // Only list a point under "What cost you marks" (weaknesses) if the detector flagged it as an error.
  // Move opinion-type criticisms (e.g. could, should, consider, would benefit) to "How to improve" (actionableFeedback).
  const opinionRegex = /\b(?:could|should|would\s+benefit|consider|recommend|might|can\s+be\s+deepened|suggest|opportunity\s+to|needs?\s+to|would\s+be\s+improved|better\s+to)\b/i;
  const keptWeaknesses: string[] = [];

  for (const w of rawWeaknessList) {
    const wLower = w.toLowerCase();
    const isDetectorError =
      (computedCaps?.distinctFindings || []).some(
        (f) =>
          (f.quote.length >= 6 && wLower.includes(f.quote.toLowerCase().slice(0, 20))) ||
          wLower.includes(f.correct_version.toLowerCase().slice(0, 25)),
      ) ||
      detectedErrors.some((e) => {
        if (
          isDiagramError(e.id) &&
          ((wLower.includes("demand") || wLower.includes("supply")) && (wLower.includes("shift") || wLower.includes("curve")))
        ) {
          return true;
        }
        if (
          isPedError(e.id) &&
          (wLower.includes("ped") || wLower.includes("elasticity") || wLower.includes("inelastic"))
        ) {
          return true;
        }
        if (
          e.id.includes("devaluation") &&
          (wLower.includes("depreciation") || wLower.includes("devaluation"))
        ) {
          return true;
        }
        if (e.id.includes("marshall") && wLower.includes("marshall")) {
          return true;
        }
        if (e.id.includes("j_curve") && wLower.includes("j-curve")) {
          return true;
        }
        if (
          e.id.includes("absolute") &&
          (wLower.includes("ensures") || wLower.includes("always") || wLower.includes("guarantee"))
        ) {
          return true;
        }
        return (
          wLower.includes(e.id.replace(/_/g, " ")) ||
          (ERROR_DESCRIPTIONS[e.id] && wLower.includes(ERROR_DESCRIPTIONS[e.id]!.category))
        );
      }) ||
      wLower.includes("off-topic") ||
      wLower.includes("zero marks credited");

    if (isDetectorError && !opinionRegex.test(w)) {
      keptWeaknesses.push(w);
    } else {
      actionableFeedback.push(w);
    }
  }
  let weaknesses = keptWeaknesses;

  // Strip legacy audit/cap lines and append the authoritative single audit line for every essay
  if (auditNotes.length > 0) {
    const singleAuditLine = auditNotes[auditNotes.length - 1]!;
    examinerSummary = examinerSummary
      .replace(/\[Cambridge Senior Examiner Audit:[^\]]*\]/gs, "")
      .replace(/\[Audit:[^\]]*\]/gs, "")
      .replace(/\bAudit:\s*Table A capped at[^.\n]*\.[^.\n]*\./gi, "")
      .replace(/\bTable B Hedge Cap:[^\n\.]*\.?/gi, "")
      .replace(/\bAO2 Analysis Accuracy Penalty:[^\n\.]*\.?/gi, "")
      .replace(/\bcontradicts earlier claim regarding policy effectiveness[^\n\.]*\.?/gi, "")
      .replace(/\bQuestion-fit:\s*passed[^\n\.]*\.?/gi, "")
      .trim();

    examinerSummary = examinerSummary ? `${examinerSummary}\n\n${singleAuditLine}` : singleAuditLine;

    // "What cost you marks" may only contain findings from the current script's detector output
    if (computedCaps) {
      if (computedCaps.distinctFindings && computedCaps.distinctFindings.length > 0) {
        weaknesses = computedCaps.distinctFindings.map((f) => {
          const cleanQuote = f.quote.replace(/^['"]+|['"]+$/g, "").trim();
          return `"${cleanQuote}" — ${f.correct_version}`;
        });
      } else {
        weaknesses = [];
      }
    } else {
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
  }

  // Handle irrelevant paragraphs: must never appear in "What worked" or AO paragraph as relevant; name as off-topic with no credit
  const irrelevantParas = computedCaps?.irrelevantParagraphs || [];
  if (irrelevantParas.length > 0) {
    const scriptParagraphs = essayText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith("[DIAGRAM:"));

    strengths = strengths.filter((s) => {
      const sLower = s.toLowerCase();
      for (const ip of irrelevantParas) {
        if (ip.summary && sLower.includes(ip.summary.toLowerCase().slice(0, 20))) {
          return false;
        }
        if (ip.quote && sLower.includes(ip.quote.toLowerCase().slice(0, 20))) {
          return false;
        }
      }
      return true;
    });

    for (const ip of irrelevantParas) {
      // Verify paragraph number by matching the paragraph's first words in the script
      let verifiedIdx = ip.index;
      let targetPara = scriptParagraphs[verifiedIdx];

      if (ip.quote && (!targetPara || !targetPara.toLowerCase().includes(ip.quote.toLowerCase().slice(0, 20)))) {
        const foundIdx = scriptParagraphs.findIndex((p) => p.toLowerCase().includes(ip.quote!.toLowerCase().slice(0, 20)));
        if (foundIdx !== -1) {
          verifiedIdx = foundIdx;
          targetPara = scriptParagraphs[foundIdx];
        }
      }

      if (targetPara) {
        const firstWords = targetPara.split(/\s+/).slice(0, 6).join(" ");
        const offTopicNote = `Paragraph ${verifiedIdx + 1} (starting with "${firstWords}..."): Off-topic analysis that does not answer the question set; zero marks credited under Cambridge 9708 assessment standards.`;
        if (!weaknesses.some((w) => w.includes(`Paragraph ${verifiedIdx + 1}`))) {
          weaknesses.push(offTopicNote);
        }
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

  const normalisedResult = cleanStars({
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

  return runReportPostCheckAndSanitize(normalisedResult, question, essayText, sources);
}

/**
 * Report Post-Check and Sanitization:
 * 1. Invented numbers / percentages not in student script
 * 2. Named country or policy examples as advice -> replace with "Add a real example you have studied (country, policy, outcome)."
 * 3. Past-paper citations not in retrieved sources
 * 4. Request for diagram labels such as "deadweight loss" or "tax burden"
 * 5. Criticism for not drawing a diagram (when question did not ask for one)
 * 6. Error listed under weaknesses but praised under strengths
 * 7. AO1 comment saying a term is missing when script contains it
 * 8. Double numbering cleanup (e.g. "1. 1.")
 */
export function runReportPostCheckAndSanitize(
  grading: Grading,
  question?: string,
  essayText?: string,
  sources?: GroundingSource[],
): Grading {
  if (!essayText) return grading;
  const qLower = (question || "").toLowerCase();

  // Helper 1: Clean double numbering and strip leading list markers/numbers
  const cleanDoubleNumbering = (s: string): string => {
    return s
      .replace(/^\s*\d+[\.\)]\s*(\d+[\.\)])\s*/g, "$1 ")
      .replace(/^\s*\d+[\.\)]\s*(?:\d+[\.\)]\s*)+/g, (m) => m.trim().split(/\s+/)[0] + " ");
  };

  const cleanLeadingListNumbers = (s: string): string => {
    return cleanDoubleNumbering(s)
      .replace(/^\s*(?:\d+[\.\)]\s*)+/g, "")
      .replace(/^\s*(?:Step\s*\d+:?|\(\d+\)|[-*•])\s*/gi, "")
      .trim();
  };

  // Helper 2: Invented numbers/percentages and arbitrary thresholds not in student script
  const scriptNumbers = new Set(essayText.match(/\b\d+(?:\.\d+)?%?\b/g) || []);
  const sanitizeInventedNumbers = (text: string): string => {
    let t = text.replace(/\b(?:Gini\s*(?:coefficient\s*)?(?:exceeds?|is\s+above|over|>|greater\s+than)\s*\d+(?:\.\d+)?)\b/gi, "high levels of income inequality");
    t = t.replace(/\b(?:threshold\s+of\s+\d+(?:\.\d+)?%?)\b/gi, "critical threshold");

    t = t.replace(/\b(\d+(?:\.\d+)?%)\b/g, (match) => {
      if (scriptNumbers.has(match) || match === "50%") return match;
      return "a proportion";
    });
    t = t.replace(/\b[\$£€]\d+(?:\.\d+)?\b/g, (match) => {
      if (scriptNumbers.has(match)) return match;
      return "a given price";
    });
    return t;
  };

  // Helper 3: Named country/policy examples as advice
  const sanitizeNamedExamples = (text: string): string => {
    let t = text.replace(
      /(?:for\s+example|such\s+as|e\.g\.|recommend|suggest|consider|like|in\s+the|study|look\s+at)?\s*[^,\.;\n]*\b(UK|United Kingdom|Britain|British|US|USA|United States|Egypt|Egyptian|Brexit|Mexico|Mexican|Singapore|France|French|Germany|German|Denmark|Sweden|Australia|Australian|South Africa|Japan|China|Zimbabwe|Argentina|Turkey|Sri Lanka|Venezuela)\b(?:\s+[^,\.;\n]*)?/gi,
      "Add a real example you have studied (country, policy, outcome).",
    );
    t = t.replace(/(?:Add a real example you have studied \(country, policy, outcome\)\.\s*)+/g, "Add a real example you have studied (country, policy, outcome). ");
    return t;
  };

  // Helper 4: Past paper citations not in retrieved sources
  const sourceTexts = (sources || [])
    .map((s) => `${s.documentTitle} ${s.snippet} ${s.heading || ""}`)
    .join(" ")
    .toLowerCase();
  const sanitizePastPaperCitations = (text: string): string => {
    return text.replace(
      /\b(9708\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}|Paper\s*\d+\s*(?:May\/June|Oct\/Nov|March|\d{4}))\b/gi,
      (match) => {
        if (sourceTexts.includes(match.toLowerCase())) return match;
        return "Cambridge 9708 examination standards";
      },
    );
  };

  // Helper 5: Request for diagram labels such as "deadweight loss" or "tax burden"
  const sanitizeDiagramLabels = (text: string): string => {
    return text
      .replace(
        /\b(?:label\s+(?:the\s+)?|show\s+(?:the\s+)?|including\s+labels?\s+for\s+)\b(?:deadweight\s+loss|tax\s+burden|consumer\s+burden|producer\s+burden)\b/gi,
        "label equilibrium price and quantity shifts",
      )
      .replace(/\b(?:deadweight\s+loss|tax\s+burden)\s+labels?\b/gi, "equilibrium labels");
  };

  // Helper 6: Criticism for not drawing a diagram (when question did not ask for one)
  const questionDemandedDiagram = /with\s+the\s+aid\s+of\s+a\s+diagram|draw\s+a\s+diagram/i.test(qLower);
  const sanitizeDiagramAdvice = (text: string): string => {
    if (questionDemandedDiagram) return text;
    return text
      .replace(
        /(?:(?:for\s+example,?\s*)?(?:draw|sketch|include|provide|use)\s+(?:an?\s+)?(?:ad\/as|j-curve|demand\s+and\s+supply|micro|macro)?\s*(?:diagram|graph|curve)\b[^,\.;\n]*)/gi,
        "",
      )
      .replace(/\b(?:j-curve\s+graph|ad\/as\s+diagram)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const filterDiagramCriticism = (items: string[]): string[] => {
    if (questionDemandedDiagram) return items;
    return items.filter((item) => {
      const s = item.toLowerCase();
      const isMissingDiagramCriticism =
        s.includes("no diagram") ||
        s.includes("failed to draw a diagram") ||
        s.includes("failed to provide a diagram") ||
        s.includes("did not include a diagram") ||
        s.includes("omission of a diagram") ||
        s.includes("lacks a diagram") ||
        s.includes("without a diagram") ||
        s.includes("drawing a diagram would") ||
        s.includes("missing diagram") ||
        s.includes("include a diagram") ||
        s.includes("draw an ad/as") ||
        s.includes("include a j-curve");
      return !isMissingDiagramCriticism;
    });
  };

  // Helper 7: False causal chain accusations on imported inflation and supply constraints
  const sanitizeFalseCausalChain = (text: string): string => {
    if (
      (text.toLowerCase().includes("imported inflation") || text.toLowerCase().includes("supply constraint") || text.toLowerCase().includes("capacity")) &&
      (text.toLowerCase().includes("lack") || text.toLowerCase().includes("fails to link") || text.toLowerCase().includes("no causal chain"))
    ) {
      return text
        .replace(/lacks?\s+a\s+causal\s+chain[^,\.;\n]*/gi, "can be developed further by showing how cost-push inflation erodes price competitiveness")
        .replace(/fails?\s+to\s+link[^,\.;\n]*/gi, "should explicitly link higher import costs to deteriorating export price margins");
    }
    return text;
  };

  // Helper 7b: Check script before generating "missing" or "lacks" comments
  const hasRankingInScript = /\b(most\s+important|matters?\s+most|greatest\s+significance|primary\s+factor|main\s+factor|decisive\s+factor|ranks?|crucial\s+factor|outweighs?|more\s+important\s+than|key\s+determinant|highest\s+priority)\b/i.test(essayText);
  const hasExamplesInScript = /\b(for\s+example|for\s+instance|such\s+as|e\.g\.|in\s+the\s+case\s+of|cigarettes?|tobacco|alcohol|oil|petrol|tariffs?|minimum\s+wage|subsidies|sugar\s+tax)\b/i.test(essayText);
  const hasCausalInScript = /\b(leads?\s+to|results?\s+in|causes?|causing|transmitted\s+through|shifts?|which\s+(?:increases|decreases|reduces|raises)|therefore|consequently|as\s+a\s+result|in\s+turn)\b/i.test(essayText);

  const sanitizeMissingOrLacksComments = (text: string): string => {
    let t = text;
    if (hasRankingInScript) {
      t = t.replace(/(?:does\s+not\s+rank|fails?\s+to\s+rank|lacks?\s+a\s+ranking|without\s+a\s+ranking|no\s+ranking|lacks?\s+prioritization|failed\s+to\s+prioritize|no\s+prioritization)[^.\n]*\.?/gi, "");
    }
    if (hasExamplesInScript) {
      t = t.replace(/(?:lacks?\s+(?:real-world\s+|concrete\s+)?examples?|fails?\s+to\s+provide\s+(?:concrete\s+|real-world\s+)?examples?|does\s+not\s+provide\s+examples?|without\s+examples?|no\s+examples?)[^.\n]*\.?/gi, "");
    }
    if (hasCausalInScript && /imported\s+inflation|supply\s+constraint|spare\s+capacity|cost-push/i.test(essayText)) {
      t = t.replace(/(?:lacks?\s+a\s+causal\s+chain|fails?\s+to\s+link|no\s+causal\s+chain|no\s+transmission\s+mechanism)[^.\n]*\.?/gi, "");
    }
    if (!questionDemandedDiagram) {
      t = t.replace(/(?:lacks?\s+(?:an?\s+)?diagram|fails?\s+to\s+include\s+(?:an?\s+)?diagram|omission\s+of\s+(?:an?\s+)?diagram|without\s+(?:an?\s+)?diagram|no\s+diagram|missing\s+diagram)[^.\n]*\.?/gi, "");
    }
    return t.replace(/\s{2,}/g, " ").trim();
  };

  // Helper 8: Error listed under weaknesses but praised under strengths or AO paragraph
  const weaknessText = grading.weaknesses.join(" ").toLowerCase();
  const hasShiftWeakness = weaknessText.includes("shift") || weaknessText.includes("curve");
  const hasPedWeakness = weaknessText.includes("elasticity") || weaknessText.includes("ped") || weaknessText.includes("inelastic");
  const hasEnsuresWeakness = weaknessText.includes("ensures") || weaknessText.includes("completely correct");

  const isCurrentAccountQuestion =
    qLower.includes("current account") || qLower.includes("balance of payments") || qLower.includes("bop") || qLower.includes("trade deficit");
  const isOffTopicStrengthForCA = (s: string): boolean => {
    if (!isCurrentAccountQuestion) return false;
    const l = s.toLowerCase();
    return (
      (l.includes("tourism") || l.includes("tourist")) &&
      (l.includes("growth") || l.includes("employment") || l.includes("jobs") || l.includes("economic growth")) &&
      !l.includes("current account")
    );
  };

  const sanitizedStrengths = grading.strengths.filter((s) => {
    const lower = s.toLowerCase();
    if (isOffTopicStrengthForCA(s)) return false;
    if (hasShiftWeakness && (lower.includes("diagram") || lower.includes("curve shift") || lower.includes("shifting of curves"))) {
      return false;
    }
    if (hasPedWeakness && (lower.includes("elasticity") || lower.includes("ped"))) {
      return false;
    }
    if (hasEnsuresWeakness && (lower.includes("socially optimal") || lower.includes("completely correct") || lower.includes("ensures"))) {
      return false;
    }
    if (weaknessText.includes("marshall-lerner") && lower.includes("marshall-lerner")) {
      return false;
    }
    if (weaknessText.includes("j-curve") && lower.includes("j-curve")) {
      return false;
    }
    if (weaknessText.includes("devaluation") && lower.includes("depreciation")) {
      return false;
    }
    return true;
  });

  // Helper 9: AO1 comment saying a term is missing when script contains it
  const definedTermsInScript = [
    { term: "demerit good", regex: /\bdemerit\s+goods?\b/i },
    { term: "indirect tax", regex: /\bindirect\s+taxes?\b/i },
    { term: "information failure", regex: /\binformation\s+failure\b/i },
    { term: "externalities", regex: /\bexternalit(?:y|ies)\b/i },
    { term: "free trade", regex: /\bfree\s+trade\b/i },
    { term: "comparative advantage", regex: /\bcomparative\s+advantage\b/i },
  ];

  let ao1Comment = grading.ao_breakdown.knowledge.comment;
  const missingDefs = (grading.missing_elements?.definitions || []).filter((def) => {
    for (const dt of definedTermsInScript) {
      if (dt.regex.test(def) && dt.regex.test(essayText)) {
        return false;
      }
    }
    return true;
  });

  for (const dt of definedTermsInScript) {
    if (dt.regex.test(essayText)) {
      const falseMissingRegex = new RegExp(`(?:missing\\s+definition|fails?\\s+to\\s+define|does\\s+not\\s+define)[^\\.]*${dt.term}`, "gi");
      if (falseMissingRegex.test(ao1Comment)) {
        ao1Comment = ao1Comment.replace(falseMissingRegex, `correctly identifies ${dt.term}`);
      }
    }
  }

  // Prevent internal contradiction in evaluation comment
  if (grading.ao_breakdown.evaluation.awarded <= 2) {
    grading.ao_breakdown.evaluation.comment = grading.ao_breakdown.evaluation.comment
      .replace(/\bjustified\s+conclusion\b/gi, "concluding evaluation")
      .replace(/\bjustified\s+judgement\b/gi, "concluding judgement")
      .replace(/\bis\s+justified\b/gi, "is a generic summary");
  }

  // Prevent summary contradictions when major errors are present or caps apply
  if (grading.total_mark <= 6 || grading.weaknesses.length >= 2) {
    grading.examiner_summary = grading.examiner_summary
      .replace(/demonstrates\s+(?:an?\s+)?(?:accurate|sound|strong|solid|thorough)\s+knowledge/gi, "demonstrates partial knowledge")
      .replace(/demonstrates\s+(?:an?\s+)?(?:accurate|sound|strong|solid|thorough)\s+understanding/gi, "contains significant analytical inaccuracies")
      .replace(/shows\s+(?:an?\s+)?(?:accurate|sound|strong|solid|thorough)\s+knowledge/gi, "shows partial knowledge")
      .replace(/shows\s+(?:an?\s+)?(?:accurate|sound|strong|solid|thorough)\s+understanding/gi, "contains analytical inaccuracies")
      .replace(/accurate\s+knowledge\s+of/gi, "familiarity with")
      .replace(/addresses\s+the\s+question\s+directly\s+and\s+demonstrates\s+(?:an?\s+)?(?:accurate|sound|strong|solid)/gi, "addresses the topic but demonstrates flawed")
      .replace(/addresses\s+the\s+question\s+directly/gi, "addresses the topic but fails to meet comparative question-fit requirements");
  }

  const cleanField = (s: string): string => {
    return cleanDoubleNumbering(
      sanitizeMissingOrLacksComments(
        sanitizeFalseCausalChain(
          sanitizeDiagramAdvice(
            sanitizeInventedNumbers(
              sanitizeNamedExamples(
                sanitizePastPaperCitations(
                  sanitizeDiagramLabels(s)
                )
              )
            )
          )
        )
      )
    ).trim();
  };

  // Helper 10: Remove diagram tasks from "Practise next" and "How to improve"
  const isDiagramTask = (item: string): boolean => {
    if (questionDemandedDiagram) return false;
    const s = item.toLowerCase();
    return (
      /\b(?:draw|sketch|label|annotate|illustrate\s+with|construct|plot|draft)\s+(?:an?\s+|the\s+)?[a-z\s\/-]*(?:diagram|graph|curve|axes|figure)\b/i.test(s) ||
      /\b(?:deadweight\s+loss|tax\s+burden|consumer\s+surplus|producer\s+surplus)\s+(?:diagram|graph|curve|label)\b/i.test(s) ||
      /\b(?:ad\/as|demand\s+and\s+supply|j-curve)\s+(?:diagram|graph)\b/i.test(s) ||
      /\b(?:draw|sketch|illustrate)\s+an?\s+ad\/as\b/i.test(s) ||
      /\b(?:draw|sketch|illustrate)\s+a\s+j-curve\b/i.test(s) ||
      /\b(?:diagrammatic|diagrams?)\b/i.test(s)
    );
  };

  // Helper 11: Remove "True but unhelpful" style lines
  const isTrueButUnhelpful = (s: string): boolean => {
    const l = s.toLowerCase();
    return (
      l.includes("true but unhelpful") ||
      l.includes("true, but unhelpful") ||
      l.includes("while true, this is unhelpful") ||
      l.includes("while correct, this is unhelpful") ||
      /\btrue\s+but\s+unhelpful\b/i.test(l)
    );
  };

  grading.ao_breakdown.knowledge.comment = cleanField(ao1Comment)
    .replace(/\b(?:true\s+but\s+unhelpful|while\s+true,?\s+this\s+is\s+unhelpful)[^.\n]*\.?/gi, "")
    .trim();
  grading.ao_breakdown.analysis.comment = cleanField(grading.ao_breakdown.analysis.comment)
    .replace(/\b(?:true\s+but\s+unhelpful|while\s+true,?\s+this\s+is\s+unhelpful)[^.\n]*\.?/gi, "")
    .trim();
  grading.ao_breakdown.evaluation.comment = cleanField(grading.ao_breakdown.evaluation.comment)
    .replace(/\b(?:true\s+but\s+unhelpful|while\s+true,?\s+this\s+is\s+unhelpful)[^.\n]*\.?/gi, "")
    .trim();
  grading.examiner_summary = cleanField(grading.examiner_summary)
    .replace(/\b(?:true\s+but\s+unhelpful|while\s+true,?\s+this\s+is\s+unhelpful)[^.\n]*\.?/gi, "")
    .trim();

  let cleanedWeaknesses = filterDiagramCriticism(grading.weaknesses.map(cleanField).map(cleanLeadingListNumbers))
    .filter((w) => w.length > 5 && !isTrueButUnhelpful(w));

  let cleanedActionable = grading.actionable_feedback
    .map(cleanField)
    .map(cleanLeadingListNumbers)
    .filter((a) => a.length > 5 && !isDiagramTask(a) && !isTrueButUnhelpful(a));

  let cleanedPractice = (grading.suggested_practice || [])
    .map(cleanField)
    .map(cleanLeadingListNumbers)
    .filter((p) => p.length > 5 && !isDiagramTask(p) && !isTrueButUnhelpful(p));

  if (cleanedPractice.length === 0) {
    cleanedPractice = [
      "Construct a step-by-step written transmission mechanism connecting policy implementation to intermediate market price signals and final economic outcomes.",
      "Write a focused evaluative paragraph directly comparing the relative effectiveness of the named policy against an alternative on an explicit economic criterion.",
    ];
  }

  // Helper 12: Remove from strengths any praise that credits a sentence or error criticized in weaknesses
  const criticizedQuotes: string[] = [];
  for (const w of cleanedWeaknesses) {
    const mQuote = w.match(/"([^"]{8,})"/);
    if (mQuote && mQuote[1]) {
      criticizedQuotes.push(mQuote[1].toLowerCase().trim());
    }
  }

  let cleanedStrengths = sanitizedStrengths
    .map(cleanField)
    .map(cleanLeadingListNumbers)
    .filter((s) => {
      if (s.length <= 5 || isTrueButUnhelpful(s)) return false;
      const sLower = s.toLowerCase();
      for (const q of criticizedQuotes) {
        if (sLower.includes(q.slice(0, 20))) {
          return false;
        }
      }
      return true;
    });

  grading.strengths = cleanedStrengths;
  grading.weaknesses = cleanedWeaknesses;
  grading.actionable_feedback = cleanedActionable;
  grading.suggested_practice = cleanedPractice;

  if (grading.missing_elements) {
    grading.missing_elements.definitions = missingDefs.map(cleanField).map(cleanLeadingListNumbers);
    grading.missing_elements.analysis = grading.missing_elements.analysis.map(cleanField).map(cleanLeadingListNumbers);
    grading.missing_elements.evaluation = grading.missing_elements.evaluation.map(cleanField).map(cleanLeadingListNumbers);
    grading.missing_elements.examples = grading.missing_elements.examples.map(cleanField).map(cleanLeadingListNumbers);
    if (!questionDemandedDiagram) {
      grading.missing_elements.diagrams = [];
    } else {
      grading.missing_elements.diagrams = grading.missing_elements.diagrams.map(cleanField).map(cleanLeadingListNumbers);
    }
  }

  return grading;
}

export function bandFor(total: number, maxMark: number): string {
  const ratio = maxMark > 0 ? total / maxMark : 0;
  if (ratio >= 0.8) return "Top band";
  if (ratio >= 0.55) return "Upper middle band";
  if (ratio >= 0.35) return "Lower middle band";
  return "Bottom band";
}
