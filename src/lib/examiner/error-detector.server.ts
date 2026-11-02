/**
 * Error Detector Server Engine — Cambridge 9708 Economics.
 *
 * Implements FIX 1 & FIX 2:
 * 1. Dedicated diagnostic error detection LLM call at temperature 0:
 *    Rigorously detects curve shift errors, elasticity errors, definitional
 *    errors, mechanism flaws, contradictions, absolute claims, irrelevant paragraphs,
 *    and question-fit gates. Returns structured findings with quotes and corrections.
 * 2. Deterministic safety net and code-computed caps:
 *    Calculates Table A (AO1+AO2, max 8) cap as one number first, splits AO1 and AO2,
 *    calculates Table B (AO3, max 4) cap, and generates the authoritative single
 *    audit line matching final marks.
 */

import { chat } from "../ai.server";
import { MODEL_EXAMINER, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import {
  checkQuestionFit,
  detectEconomicErrors,
  detectHedgeConclusion,
  type DetectedError,
  type GroundingSource,
} from "./types";

export interface DetectorFinding {
  category:
    | "wrong_curve_or_shift"
    | "wrong_elasticity"
    | "wrong_definition"
    | "wrong_mechanism"
    | "contradiction"
    | "absolute_claim"
    | "irrelevant_paragraph";
  quote: string;
  correct_version: string;
  severity: "major" | "minor";
  is_definition_error?: boolean;
}

export interface ParagraphAnalysis {
  paragraph_index: number;
  relevant: boolean;
  chain_status: "complete" | "partial" | "asserted";
  has_major_error: boolean;
  summary?: string;
}

export interface QuestionFitAnalysis {
  is_comparative: boolean;
  compares_with_alternative_on_criterion: boolean;
  states_which_is_better_or_when: boolean;
  is_to_what_extent: boolean;
  gives_degree_and_conditions: boolean;
  answers_different_question: boolean;
  is_hedge_conclusion: boolean;
  fails_question_fit: boolean;
  reason?: string;
}

export interface DetectorResult {
  findings: DetectorFinding[];
  paragraphs: ParagraphAnalysis[];
  question_fit: QuestionFitAnalysis;
}

export interface ComputedCaps {
  majorErrorCount: number;
  distinctFindings: DetectorFinding[];
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
  irrelevantParagraphs?: Array<{ index: number; summary?: string; quote?: string }>;
}

export const ERROR_DETECTOR_PROMPT = `You are the Cambridge 9708 Economics Diagnostic Error Detector.
Your SOLE TASK is to detect factual, analytical, diagrammatic, definitional, and question-fit errors in an A-Level Economics essay.
You DO NOT award marks. You DO NOT provide student advice or generic feedback.

MANDATORY RULES:
1. STRICT RIGOR: High school A-Level candidates must be accurate. You must rigorously check for:
   a) WRONG CURVE OR WRONG SHIFT DIRECTION / PRICE CONTROLS:
      - Indirect tax or subsidy shifting the demand curve (taxes and subsidies shift supply; demand only contracts or expands along the curve).
      - Price change claimed to shift demand or supply (causes movement along the curve, never a shift).
      - Wrong direction of supply shift (indirect tax shifts supply left/up; subsidy shifts supply right/down).
      - Confusing depreciation with devaluation (depreciation is market-driven under floating exchange rates; devaluation is an official government or central bank decision under fixed rates; claiming the government "lowers" or "depreciates" its currency is devaluation).
      - Excess demand and excess supply reversed at a price floor or ceiling (a minimum wage or price floor above equilibrium causes excess supply of labour, meaning unemployment / surplus; a price ceiling or maximum price below equilibrium causes excess demand / shortage).
      - A price floor called a ceiling or the reverse (minimum wage/price is a price floor; maximum price/rent control is a price ceiling).
   b) WRONG ELASTICITY CLAIMS:
      - Claiming inelastic demand makes an indirect tax "more effective" or "very effective" at cutting consumption (with inelastic demand, %ΔQd < %ΔP, so quantity cut is small, though revenue is high).
      - Claiming depreciation works best when demand is inelastic (inelastic demand means export revenue falls and import spending rises, worsening the deficit).
      - Inverting the Marshall-Lerner condition (must be PEDx + PEDm > 1, not < 1).
      - Inverting the PED formula (%ΔP / %ΔQd instead of %ΔQd / %ΔP).
   c) WRONG DEFINITION OF KEY TERMS:
      - Allocative efficiency defined as P = AC instead of P = MC.
      - Productive efficiency defined as P = MC instead of minimum AC.
      - Demerit good defined as under-consumed or under-provided (they are over-consumed).
      - Merit good defined as over-consumed (they are under-consumed).
      - Hyperinflation defined as accelerating inflation (hyperinflation is >50% per month; accelerating is merely a rising inflation rate).
      - Depreciation defined as government lowering currency value.
   d) WRONG PRICING OR OUTPUT MECHANISM:
      - Monopoly price set at MR = MC point instead of read from the demand / AR curve.
      - Monopoly said to produce at minimum average cost.
      - Inverted J-curve (J-curve worsens first in short run due to inelastic demand, then improves in long run).
      - Claiming capital investment automatically increases the money supply (investment raises AD in short run and LRAS in long run; money supply is controlled by central bank).
      - Citing "AS equals AD" as a disinflation transmission mechanism (it is equilibrium, not a mechanism).
   e) CONTRADICTION WITH MARKET STRUCTURE OR ESSAY'S OWN EARLIER POINT:
      - Supernormal profit attracting entry into a monopoly (monopolies have insurmountable barriers to entry).
      - Claiming inelastic demand works best right after explaining the J-curve.
      - Contradiction where the script says "no negative effects", "no drawbacks", or "only benefits" and later admits a negative effect or cost.
   f) ABSOLUTE CLAIMS IN MAIN ARGUMENT:
      - Using unhedged absolute assertions: "always", "ensures", "completely corrects", "solves", "guarantees", "never" (e.g. "ensures a surplus", "completely corrects market failure", "export revenue always rises").
   g) IRRELEVANT PARAGRAPHS:
      - Paragraphs that do not help answer the question as set (e.g. analyzing tourism employment growth on a current account deficit question without linking to export revenue).
   h) QUESTION-FIT:
      - For "best", "most", "main", "most effective": does the script compare the named option with an alternative on a stated criterion AND say which is better or when? If it only explains the named policy without alternative comparison, question-fit FAILS.
      - For "to what extent": does it give a stated degree and conditions it depends on? If not, question-fit FAILS.
      - Does it answer a different question from the one set (e.g. "does it work" instead of "is it the best")?
      - Is the conclusion an unranked hedge ("a mix of policies", "depends on situation" without explicit criteria/ranking)?
   i) PARAGRAPH ANALYSIS & COMPLETE CHAINS:
      - For each paragraph: is it relevant (yes/no), and is its chain complete, partial, or asserted?
      - A complete chain must have: cause -> mechanism -> effect -> link to question.
      - CRITICAL: A chain containing ANY major error is NEVER complete!
   j) UNCERTAINTY RULE:
      - When unsure, report the item as an error.

Return ONLY a single valid JSON object matching this schema:
{
  "findings": [
    {
      "category": "wrong_curve_or_shift" | "wrong_elasticity" | "wrong_definition" | "wrong_mechanism" | "contradiction" | "absolute_claim" | "irrelevant_paragraph",
      "quote": "short quote under 15 words from candidate text",
      "correct_version": "the accurate economic correction",
      "severity": "major",
      "is_definition_error": boolean
    }
  ],
  "paragraphs": [
    {
      "paragraph_index": number,
      "relevant": boolean,
      "chain_status": "complete" | "partial" | "asserted",
      "has_major_error": boolean,
      "summary": "one sentence"
    }
  ],
  "question_fit": {
    "is_comparative": boolean,
    "compares_with_alternative_on_criterion": boolean,
    "states_which_is_better_or_when": boolean,
    "is_to_what_extent": boolean,
    "gives_degree_and_conditions": boolean,
    "answers_different_question": boolean,
    "is_hedge_conclusion": boolean,
    "fails_question_fit": boolean,
    "reason": "precise reason"
  }
}
`.trim();

/**
 * Strips duplicate prefixes from question-fit reasons.
 */
export function cleanQuestionFitReason(reason?: string): string {
  if (!reason) return "does not compare on a stated criterion";
  return reason.replace(/^(?:Question-fit failure:\s*)+/gi, "").trim();
}

function getParagraphIndexForQuote(quote: string, paras: string[]): number {
  if (!quote) return -1;
  const qClean = quote.toLowerCase().replace(/['"]/g, "").trim();
  if (qClean.length < 5) return -1;
  const snippet = qClean.slice(0, 30);
  for (let i = 0; i < paras.length; i++) {
    const pClean = paras[i].toLowerCase();
    if (pClean.includes(qClean) || pClean.includes(snippet)) {
      return i;
    }
  }
  return -1;
}

function quotesOverlap(q1: string, q2: string): boolean {
  const s1 = q1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = q2.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.length >= 12 && s2.length >= 12) {
    if (s1.includes(s2) || s2.includes(s1)) return true;
  }
  return false;
}

export function getCanonicalMistakeKey(
  f: DetectorFinding,
  essayParagraphs: string[],
): { key: string; isAbsoluteClaim: boolean; paraIdx: number } {
  const qLower = (f.quote + " " + f.correct_version).toLowerCase();
  const quoteLower = f.quote.toLowerCase();
  const paraIdx = getParagraphIndexForQuote(f.quote, essayParagraphs);

  // 1. Price control reversal (excess demand / excess supply reversed at floor/ceiling)
  if (
    (qLower.includes("excess demand") || qLower.includes("excess supply") || qLower.includes("shortage") || qLower.includes("surplus")) &&
    (qLower.includes("minimum wage") || qLower.includes("price floor") || qLower.includes("minimum price") || qLower.includes("price ceiling") || qLower.includes("maximum price") || qLower.includes("rent control"))
  ) {
    return { key: "price_control_reversal", isAbsoluteClaim: false, paraIdx };
  }

  // 2. Price floor called ceiling or reverse
  if (
    (qLower.includes("price floor") && qLower.includes("ceiling")) ||
    (qLower.includes("minimum price") && qLower.includes("ceiling")) ||
    (qLower.includes("minimum wage") && qLower.includes("ceiling")) ||
    (qLower.includes("maximum price") && qLower.includes("floor")) ||
    (qLower.includes("price ceiling") && qLower.includes("floor"))
  ) {
    return { key: "price_floor_ceiling_confusion", isAbsoluteClaim: false, paraIdx };
  }

  // 3. "No negative effects" contradiction
  if (
    qLower.includes("no negative effect") ||
    qLower.includes("no drawback") ||
    qLower.includes("no disadvantage") ||
    qLower.includes("only benefit") ||
    qLower.includes("no downside") ||
    qLower.includes("no negative impact")
  ) {
    return { key: "no_negative_effects_contradiction", isAbsoluteClaim: false, paraIdx };
  }

  // 4. Diagram / curve shift errors
  if (
    qLower.includes("demand curve") ||
    qLower.includes("shift demand") ||
    qLower.includes("supply curve") ||
    qLower.includes("shifts supply") ||
    f.category === "wrong_curve_or_shift"
  ) {
    return { key: "diagram_shift", isAbsoluteClaim: false, paraIdx };
  }

  // 5. Depreciation confused with devaluation
  if (
    (qLower.includes("depreciation") && qLower.includes("devaluation")) ||
    (qLower.includes("government") && qLower.includes("lowers") && qLower.includes("currency"))
  ) {
    return { key: "depreciation_devaluation", isAbsoluteClaim: false, paraIdx };
  }

  // 6. Marshall-Lerner reversed (< 1)
  if (qLower.includes("marshall-lerner") || qLower.includes("marshall lerner") || qLower.includes("pedx")) {
    return { key: "marshall_lerner", isAbsoluteClaim: false, paraIdx };
  }

  // 7. J-curve sequence inverted
  if (qLower.includes("j-curve") || qLower.includes("j curve")) {
    return { key: "j_curve", isAbsoluteClaim: false, paraIdx };
  }

  // 8. Inelastic demand with exchange rate / depreciation
  if (
    (qLower.includes("inelastic") || qLower.includes("ped")) &&
    (qLower.includes("depreciation") || qLower.includes("exchange rate") || qLower.includes("deficit") || qLower.includes("improve"))
  ) {
    return { key: "ped_exchange_rate", isAbsoluteClaim: false, paraIdx };
  }

  // 9. Elasticity reasoning / Inelastic demand with tax / PED formula
  if (
    qLower.includes("inelastic demand") ||
    qLower.includes("ped") ||
    f.category === "wrong_elasticity" ||
    qLower.includes("tax is very effective") ||
    qLower.includes("tax is effective")
  ) {
    return { key: "ped_elasticity", isAbsoluteClaim: false, paraIdx };
  }

  // 10. Absolute claims in main argument ("always", "ensures", "completely corrects", "solves", "guarantees", "never")
  if (
    qLower.includes("ensures") ||
    qLower.includes("always") ||
    qLower.includes("completely correct") ||
    qLower.includes("guarantee") ||
    qLower.includes("solves") ||
    qLower.includes("never") ||
    f.category === "absolute_claim"
  ) {
    return { key: `absolute_claim:p${paraIdx >= 0 ? paraIdx : "all"}`, isAbsoluteClaim: true, paraIdx };
  }

  // 11. Hyperinflation definition
  if (qLower.includes("hyperinflation")) {
    return { key: "hyperinflation", isAbsoluteClaim: false, paraIdx };
  }

  // 12. Investment automatically raising money supply
  if (qLower.includes("money supply")) {
    return { key: "money_supply", isAbsoluteClaim: false, paraIdx };
  }

  const cleanQ = quoteLower.replace(/[^a-z0-9]/g, "").slice(0, 25);
  return { key: `${f.category}:${cleanQ}`, isAbsoluteClaim: false, paraIdx };
}

/**
 * Deduplicates findings before counting:
 * - Merges findings describing the same mistake (e.g. "wrong elasticity" and "inelastic demand reasoning" for one quote).
 * - Counts each distinct quote once.
 * - Counts all absolute claims in the same paragraph as one.
 */
export function deduplicateFindings(
  rawFindings: DetectorFinding[],
  essayText: string,
): DetectorFinding[] {
  const essayParagraphs = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith("[DIAGRAM:"));

  const merged: DetectorFinding[] = [];
  const seenCanonicalKeys = new Set<string>();

  for (const f of rawFindings) {
    if (f.severity !== "major") continue;

    const { key } = getCanonicalMistakeKey(f, essayParagraphs);

    // 1. If absolute claim in same paragraph, or duplicate canonical mistake key
    if (seenCanonicalKeys.has(key)) {
      const existingIdx = merged.findIndex((m) => {
        const { key: mKey } = getCanonicalMistakeKey(m, essayParagraphs);
        return mKey === key;
      });
      if (existingIdx !== -1) {
        if (f.correct_version.length > merged[existingIdx]!.correct_version.length) {
          merged[existingIdx]!.correct_version = f.correct_version;
        }
        if (f.is_definition_error) {
          merged[existingIdx]!.is_definition_error = true;
        }
      }
      continue;
    }

    // 2. Count each distinct quote once: check if quote overlaps with any already merged finding
    const existingQuoteIdx = merged.findIndex((m) => quotesOverlap(m.quote, f.quote));
    if (existingQuoteIdx !== -1) {
      const existing = merged[existingQuoteIdx]!;
      if (f.correct_version.length > existing.correct_version.length) {
        existing.correct_version = f.correct_version;
      }
      if (f.quote.length > existing.quote.length) {
        existing.quote = f.quote;
      }
      if (f.is_definition_error) {
        existing.is_definition_error = true;
      }
      seenCanonicalKeys.add(key);
      continue;
    }

    seenCanonicalKeys.add(key);
    merged.push({ ...f });
  }

  return merged;
}

/**
 * Computes deterministic level caps in code from the detector output.
 * Never allows the LLM to choose its own caps.
 */
export function computeCapsFromDetector(
  detectorResult: DetectorResult,
  maxMark: number,
  split: AoSplit,
  question: string,
  essayText: string,
): ComputedCaps {
  const tableAMax = split.ao1_marks + split.ao2_marks; // 8 for 12-mark essay
  const tableBMax = split.ao3_marks; // 4 for 12-mark essay

  const essayParagraphs = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith("[DIAGRAM:"));

  // De-duplicate findings before counting:
  // - Merge findings that describe same mistake
  // - Count each distinct quote once
  // - Count all absolute claims in same paragraph as one
  const distinctFindings = deduplicateFindings(detectorResult.findings, essayText);
  const majorErrorCount = distinctFindings.length;

  const hasDefinitionError = distinctFindings.some(
    (f) =>
      f.is_definition_error ||
      f.category === "wrong_definition" ||
      f.correct_version.toLowerCase().includes("devaluation") ||
      f.correct_version.toLowerCase().includes("hyperinflation"),
  );

  // Paragraph chains analysis: A chain containing ANY major error is NEVER complete!
  const completeRelevantChainsCount = detectorResult.paragraphs.filter(
    (p) => p.relevant && p.chain_status === "complete" && !p.has_major_error,
  ).length;

  // Extract irrelevant paragraphs for zero-credit handling
  const irrelevantParagraphs = detectorResult.paragraphs
    .filter((p) => p.relevant === false)
    .map((p) => ({
      index: p.paragraph_index,
      summary: p.summary,
    }));

  for (const f of detectorResult.findings) {
    if (f.category === "irrelevant_paragraph") {
      const pIdx = getParagraphIndexForQuote(f.quote, essayParagraphs);
      if (pIdx !== -1 && !irrelevantParagraphs.some((ip) => ip.index === pIdx)) {
        irrelevantParagraphs.push({
          index: pIdx,
          summary: f.correct_version || f.quote,
          quote: f.quote,
        });
      }
    }
  }

  // Question-fit analysis
  const qf = detectorResult.question_fit;
  const failsQuestionFit = Boolean(qf.fails_question_fit);
  const isHedgeConclusion = Boolean(qf.is_hedge_conclusion);
  const cleanQfReason = cleanQuestionFitReason(qf.reason);

  // Build human-readable named errors for single audit line
  const namedErrors: string[] = [];
  for (const f of distinctFindings) {
    const { key } = getCanonicalMistakeKey(f, essayParagraphs);
    if (key === "price_control_reversal") {
      namedErrors.push("excess demand/supply reversal at price control");
    } else if (key === "price_floor_ceiling_confusion") {
      namedErrors.push("price floor/ceiling confusion");
    } else if (key === "no_negative_effects_contradiction") {
      namedErrors.push("contradiction regarding 'no negative effects'");
    } else if (key === "diagram_shift") {
      namedErrors.push("demand curve shift");
    } else if (key === "depreciation_devaluation") {
      namedErrors.push("depreciation confused with devaluation (government lowering currency)");
    } else if (key === "marshall_lerner") {
      namedErrors.push("Marshall-Lerner condition reversed (< 1)");
    } else if (key === "ped_exchange_rate") {
      namedErrors.push("inelastic demand claimed to improve deficit");
    } else if (key === "ped_elasticity") {
      namedErrors.push("inelastic demand reasoning");
    } else if (key === "j_curve") {
      namedErrors.push("inverted J-curve sequence");
    } else if (key.startsWith("absolute_claim")) {
      namedErrors.push("unsubstantiated 'always rises / ensures surplus' claim");
    } else if (key === "hyperinflation") {
      namedErrors.push("hyperinflation definition");
    } else if (key === "money_supply") {
      namedErrors.push("investment money supply claim");
    } else {
      namedErrors.push(f.category.replace(/_/g, " "));
    }
  }
  const namedErrorsStr = namedErrors.length > 0 ? Array.from(new Set(namedErrors)).join(", ") : "major analytical errors";

  // FIX 2: TABLE A (AO1+AO2, max 8) cap is lowest of:
  // - 0 errors: 8
  // - 1 error: 7
  // - 2 errors: 5
  // - 3 or more errors: 4
  // - question-fit failure: 5
  // - question-fit failure with 2 or more errors: 4
  // - fewer than 3 complete relevant error-free chains means max 5
  let tableACap = tableAMax;
  let tableAReason = "no major analytical errors, 3+ complete chains";

  if (majorErrorCount >= 3 || (failsQuestionFit && majorErrorCount >= 2)) {
    tableACap = 4;
    tableAReason = failsQuestionFit
      ? `Question-fit failure and ${majorErrorCount} major errors: ${namedErrorsStr}`
      : `${majorErrorCount} major errors: ${namedErrorsStr}`;
  } else if (majorErrorCount === 2) {
    tableACap = 5;
    tableAReason = `2 major errors: ${namedErrorsStr}`;
  } else if (failsQuestionFit) {
    tableACap = 5;
    tableAReason = `Question-fit failure: ${cleanQfReason}`;
  } else if (completeRelevantChainsCount < 3) {
    tableACap = 5;
    tableAReason = `fewer than 3 complete relevant error-free chains (${completeRelevantChainsCount} found)`;
  } else if (majorErrorCount === 1) {
    tableACap = 7;
    tableAReason = `1 major error: ${namedErrorsStr}`;
  }

  // Table A split: AO1 gets up to 2 (max 1 if key definition error), AO2 is Table A minus AO1
  const maxAo1 = hasDefinitionError ? 1 : Math.min(split.ao1_marks, tableACap);
  const maxAo2 = Math.max(0, tableACap - maxAo1);

  // FIX 2: TABLE B (AO3, max 4) cap is lowest of:
  // - no comparison on a criterion where question needs one: 1
  // - question-fit failure: 1
  // - hedge conclusion with no ranking or conditions: 2
  // - no stated conditions: 2
  let tableBCap = tableBMax;
  let tableBReason = "direct comparison on stated criteria and justified judgement";

  if (failsQuestionFit) {
    tableBCap = 1;
    tableBReason = `Question-fit failure: ${cleanQfReason}`;
  } else if (isHedgeConclusion) {
    tableBCap = 2;
    tableBReason = "Hedge conclusion with no ranking or conditions";
  }

  // Single authoritative audit line matching computed caps (never duplicate "Question-fit failure:")
  let auditLine = `Audit: Table A capped at ${tableACap}/${tableAMax} (${tableAReason}); Table B capped at ${tableBCap}/${tableBMax} (${tableBReason}). Final marks: AO1 ${maxAo1}, AO2 ${maxAo2}, AO3 ${tableBCap}.`;
  auditLine = auditLine.replace(/(?:Question-fit failure:\s*)+/gi, "Question-fit failure: ");

  return {
    majorErrorCount,
    distinctFindings,
    hasDefinitionError,
    completeRelevantChainsCount,
    failsQuestionFit,
    isHedgeConclusion,
    questionFitReason: cleanQfReason,
    tableAMax,
    tableACap,
    tableAReason,
    maxAo1,
    maxAo2,
    tableBMax,
    tableBCap,
    tableBReason,
    auditLine,
    irrelevantParagraphs,
  };
}

/**
 * Runs the dedicated diagnostic error detection pass (FIX 1) at temperature 0,
 * merges with deterministic safety nets, and computes Cambridge caps (FIX 2).
 */
export async function detectEssayErrorsAndCaps(options: {
  question: string;
  essayText: string;
  split: AoSplit;
  sources?: GroundingSource[];
  userId?: string;
  isBudgetTier?: boolean;
}): Promise<ComputedCaps> {
  const { question, essayText, split, userId, isBudgetTier } = options;

  let detectorResult: DetectorResult = {
    findings: [],
    paragraphs: [],
    question_fit: {
      is_comparative: false,
      compares_with_alternative_on_criterion: true,
      states_which_is_better_or_when: true,
      is_to_what_extent: false,
      gives_degree_and_conditions: true,
      answers_different_question: false,
      is_hedge_conclusion: false,
      fails_question_fit: false,
    },
  };

  try {
    const userPrompt =
      `EXAM QUESTION TO ANALYSE:\n"""\n${question}\n"""\n\n` +
      `CANDIDATE ESSAY SUBMISSION:\n"""\n${essayText}\n"""\n\n` +
      `DIAGNOSTIC TASK:\nDetect all wrong curve shifts, wrong elasticity claims, wrong definitions, wrong pricing/output mechanisms, contradictions, absolute claims, irrelevant paragraphs, question-fit failures, and paragraph chain statuses. When unsure, report as an error. Return JSON only.`;

    const response = await chat({
      model: MODEL_EXAMINER,
      temperature: 0,
      json: true,
      userId,
      isBudgetTier,
      feature: "error_detector",
      reasoningEffort: "low",
      maxCompletionTokens: 4096,
      messages: [
        { role: "system", content: ERROR_DETECTOR_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const parsed = extractFirstJsonObject(response.text) as Partial<DetectorResult>;
    if (parsed && Array.isArray(parsed.findings)) {
      detectorResult = {
        findings: parsed.findings.map((f: any) => ({
          category: f.category || "wrong_mechanism",
          quote: String(f.quote || "").slice(0, 150),
          correct_version: String(f.correct_version || ""),
          severity: f.severity === "minor" ? "minor" : "major",
          is_definition_error: Boolean(f.is_definition_error),
        })),
        paragraphs: Array.isArray(parsed.paragraphs)
          ? parsed.paragraphs.map((p: any) => ({
              paragraph_index: Number(p.paragraph_index) || 0,
              relevant: Boolean(p.relevant !== false),
              chain_status:
                p.chain_status === "complete"
                  ? "complete"
                  : p.chain_status === "partial"
                    ? "partial"
                    : "asserted",
              has_major_error: Boolean(p.has_major_error),
              summary: p.summary ? String(p.summary) : undefined,
            }))
          : [],
        question_fit: {
          is_comparative: Boolean(parsed.question_fit?.is_comparative),
          compares_with_alternative_on_criterion: Boolean(
            parsed.question_fit?.compares_with_alternative_on_criterion !== false,
          ),
          states_which_is_better_or_when: Boolean(
            parsed.question_fit?.states_which_is_better_or_when !== false,
          ),
          is_to_what_extent: Boolean(parsed.question_fit?.is_to_what_extent),
          gives_degree_and_conditions: Boolean(
            parsed.question_fit?.gives_degree_and_conditions !== false,
          ),
          answers_different_question: Boolean(
            parsed.question_fit?.answers_different_question,
          ),
          is_hedge_conclusion: Boolean(parsed.question_fit?.is_hedge_conclusion),
          fails_question_fit: Boolean(parsed.question_fit?.fails_question_fit),
          reason: parsed.question_fit?.reason ? String(parsed.question_fit.reason) : undefined,
        },
      };
    }
  } catch (err) {
    console.warn("[error-detector.server] Error running LLM detector, falling back to deterministic safety net:", err);
  }

  // --- DETERMINISTIC SAFETY NETS ---
  // 1. Economic Error Safety Net
  const deterministicErrors = detectEconomicErrors(essayText);
  for (const de of deterministicErrors) {
    const alreadyFound = detectorResult.findings.some((f) => {
      const text = (f.quote + " " + f.correct_version).toLowerCase();
      if (de.id === "tax_demand_shift" && (text.includes("demand") || text.includes("shift"))) return true;
      if (de.id === "depreciation_devaluation_confusion" && (text.includes("depreciation") || text.includes("devaluation"))) return true;
      if (de.id === "marshall_lerner_error" && text.includes("marshall")) return true;
      if (de.id === "ped_inelastic_exchange_rate" && (text.includes("inelastic") || text.includes("exchange"))) return true;
      if (de.id === "ped_inelastic_effectiveness" && (text.includes("inelastic") || text.includes("tax"))) return true;
      if (de.id === "inverted_j_curve" && text.includes("j-curve")) return true;
      if (de.id === "unsubstantiated_absolute_claim" && (text.includes("ensures") || text.includes("always") || text.includes("completely correct"))) return true;
      if (de.id === "hyperinflation" && text.includes("hyperinflation")) return true;
      if (de.id === "investment_money_supply" && text.includes("money supply")) return true;
      if (de.id === "price_control_reversal" && (text.includes("excess demand") || text.includes("excess supply") || text.includes("shortage") || text.includes("surplus"))) return true;
      if (de.id === "price_floor_ceiling_confusion" && (text.includes("floor") || text.includes("ceiling"))) return true;
      if (de.id === "no_negative_effects_contradiction" && (text.includes("no negative effect") || text.includes("no drawback") || text.includes("only benefit"))) return true;
      return false;
    });

    if (!alreadyFound) {
      let quote = "";
      if (de.id === "tax_demand_shift") {
        const m = essayText.match(/shifts?\s+(?:the\s+)?demand\s+curve\s+(?:to\s+the\s+)?(?:left|right|inward|outward)|demand\s+curve\s+shifts?\s+(?:to\s+the\s+)?left/i);
        quote = m ? m[0] : "shifts the demand curve to the left";
      } else if (de.id === "depreciation_devaluation_confusion") {
        const m = essayText.match(/government\s+(?:lowers|reduces|decreases|cuts|sets|devalues)\s+(?:the\s+)?(?:value\s+of\s+its\s+)?currency|when\s+the\s+government\s+lowers/i);
        quote = m ? m[0] : "government lowers the value of its currency";
      } else if (de.id === "ped_inelastic_effectiveness") {
        const m = essayText.match(/(?:demand\s+is\s+(?:price\s+)?inelastic|cigarettes\s+are\s+addictive)[\s\S]{0,100}(?:tax\s+is\s+(?:very\s+)?effective|effective\s+because)/i);
        quote = m ? m[0].slice(0, 100) : "inelastic demand... therefore the tax is very effective";
      } else if (de.id === "ped_inelastic_exchange_rate") {
        const m = essayText.match(/depreciation\s+works\s+best\s+when\s+demand\s+is\s+(?:price\s+)?inelastic|inelastic\s+demand\s+works\s+best/i);
        quote = m ? m[0] : "depreciation works best when demand is price inelastic";
      } else if (de.id === "unsubstantiated_absolute_claim") {
        const m = essayText.match(/ensures?\s+(?:that\s+)?(?:society\s+reaches|the\s+current\s+account|a\s+surplus|market\s+failure)|always\s+rises|completely\s+corrects/i);
        quote = m ? m[0] : "ensures that society reaches the socially optimal level";
      } else if (de.id === "marshall_lerner_error") {
        const m = essayText.match(/marshall[\s-]?lerner[\s\S]{0,80}(?:less\s+than\s+1|<\s*1)/i);
        quote = m ? m[0] : "Marshall-Lerner condition is less than 1";
      } else if (de.id === "inverted_j_curve") {
        const m = essayText.match(/j[\s-]?curve[\s\S]{0,80}(?:improves?[\s\S]{0,40}worsens?)/i);
        quote = m ? m[0] : "J-curve improves initially then worsens";
      } else if (de.id === "price_control_reversal") {
        const m = essayText.match(/\b(?:minimum\s+wage|price\s+floor|minimum\s+price|maximum\s+price|price\s+ceiling)[\s\S]{0,80}(?:excess\s+(?:demand|supply)|shortage|surplus)\b/i);
        quote = m ? m[0] : "minimum wage causes excess demand / shortage of labour";
      } else if (de.id === "price_floor_ceiling_confusion") {
        const m = essayText.match(/\b(?:minimum\s+wage|minimum\s+price|price\s+floor|maximum\s+price|rent\s+control|price\s+ceiling)[\s\S]{0,60}(?:ceiling|floor)\b/i);
        quote = m ? m[0] : "price floor called a ceiling";
      } else if (de.id === "no_negative_effects_contradiction") {
        const m = essayText.match(/\b(?:no\s+negative\s+effects?|no\s+drawbacks?|no\s+disadvantages?|only\s+benefits?|no\s+downside)\b/i);
        quote = m ? m[0] : "policy has no negative effects";
      } else {
        quote = de.trap.slice(0, 50);
      }

      detectorResult.findings.push({
        category: de.id.includes("shift")
          ? "wrong_curve_or_shift"
          : de.id.includes("ped") || de.id.includes("marshall")
            ? "wrong_elasticity"
            : de.id.includes("devaluation") || de.id.includes("hyperinflation")
              ? "wrong_definition"
              : de.id.includes("contradiction")
                ? "contradiction"
                : de.id.includes("absolute")
                  ? "absolute_claim"
                  : "wrong_mechanism",
        quote,
        correct_version: de.trap,
        severity: de.severity,
        is_definition_error: de.id === "depreciation_devaluation_confusion" || de.id === "hyperinflation",
      });
    }
  }

  // 2. Question-Fit Safety Net
  const detQf = checkQuestionFit(question, essayText);
  if (detQf.failsQuestionFit) {
    detectorResult.question_fit.fails_question_fit = true;
    detectorResult.question_fit.is_comparative = detQf.isComparativeQuestion;
    detectorResult.question_fit.is_to_what_extent = detQf.isToWhatExtentQuestion;
    detectorResult.question_fit.reason = detQf.missingAlternativeNote || detQf.auditReason;
  }

  // 3. Hedge Conclusion Safety Net
  const detHedge = detectHedgeConclusion(essayText);
  if (detHedge.isHedge) {
    detectorResult.question_fit.is_hedge_conclusion = true;
  }

  // 4. Ensure paragraph array is populated
  if (detectorResult.paragraphs.length === 0) {
    const rawParas = essayText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30 && !p.startsWith("[DIAGRAM:"));

    const majorCount = detectorResult.findings.filter((f) => f.severity === "major").length;
    detectorResult.paragraphs = rawParas.map((para, idx) => {
      const hasMajor = detectorResult.findings.some(
        (f) => f.severity === "major" && para.toLowerCase().includes(f.quote.toLowerCase().slice(0, 20)),
      );
      const status: "complete" | "partial" | "asserted" = hasMajor
        ? "partial"
        : majorCount === 0 && para.length > 100
          ? "complete"
          : "partial";

      return {
        paragraph_index: idx,
        relevant: true,
        chain_status: status,
        has_major_error: hasMajor,
      };
    });
  }

  return computeCapsFromDetector(detectorResult, 12, split, question, essayText);
}
