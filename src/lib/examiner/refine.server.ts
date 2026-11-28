/**
 * Cambridge 9708 Third-Stage Senior Principal Examiner Report Refiner & Accuracy Auditor.
 *
 * Runs on our strongest reasoning model over the synthesized Pass 1 + Pass 2 draft to:
 * 1. Audit economic accuracy in BOTH the student essay AND the draft strengths/weaknesses
 *    (catching false praise of errors such as "profit-maximising firms overproduce",
 *    inverted causal mechanisms, or hallucinated penalties like penalising A-Level theory on a 20m essay).
 * 2. Calibrate final AO1 / AO2 / AO3 marks strictly against official Cambridge 9708 level descriptors
 *    (Paper 4 Table A & Table B for 20m; Paper 2 for 8m/12m) grounded in retrieved mark scheme excerpts.
 * 3. Enforce ZERO repetition within arrays AND across weaknesses, missing_elements, and actionable_feedback.
 * 4. Guarantee mark-to-prose consistency, zero internal contradictions, strict diagram rules,
 *    and clean plain-text Cambridge examiner prose (no asterisks, no [S#] codes, no score fractions).
 */

import { cleanStars } from "@/lib/utils";
import {
  buildAoEvaluationDirective,
  buildPaperScopeDirective,
  type AoSplit,
} from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily } from "./multi-family-pool.server";
import {
  deduplicateAcrossSections,
  normaliseGrading,
  purgeContradictions,
  type ComparativeJudgementResult,
  type Grading,
} from "./types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "./writing-quality.server";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge International AS & A Level Economics (syllabus 9708) conducting the final accuracy and quality audit before delivering the report to the student.

FIXED AO ALLOCATION ({max_mark} marks):
- AO1 Knowledge: {ao1_marks} | AO2 Analysis: {ao2_marks} | AO3 Evaluation: {ao3_marks}

{paper_scope_directive}

{ao_evaluation_directive}

YOUR FIVE MANDATORY AUDIT TASKS:
1. ECONOMIC ACCURACY, FALSE-PRAISE & ANTI-INFLATION LEVEL AUDIT:
   - Verify every economic claim in BOTH the student's essay AND the draft "strengths" / "weaknesses".
   - CATCH & CORRECT FALSE PRAISE AND MODEL HALLUCINATIONS:
     * Interest rates & Exchange rates: HIGHER domestic interest rates attract hot-money inflows -> currency APPRECIATES (stronger exchange rate) -> exports dearer, imports cheaper. LOWER interest rates cause DEPRECIATION. NEVER claim higher interest rates depreciate a currency! If the draft got this backwards, FIX IT immediately!
     * Subsidy & Tax Incidence vs Elasticity: With a producer subsidy (S shifts right/down), INELASTIC demand causes a LARGE fall in price so CONSUMERS capture the larger share; ELASTIC demand causes a SMALL fall in price so PRODUCERS retain the larger share. If the essay claims inelastic demand gives a smaller price fall / benefits producers more (or contradicts its own rule), FLAG IT and REMOVE any praise of subsidy incidence!
     * Own-Price Shifts & Market Structure: Higher own-price causes a contraction along demand (NEVER a rightward demand shift). Monopolistically competitive firms are price-makers with P > MC and excess capacity (NEVER allocatively/productively efficient). Education/healthcare are merit goods, NOT public goods.
     * Producer surplus = difference between market price and minimum price producers are WILLING TO ACCEPT/SUPPLY AT (NOT "willing to pay" — if the student wrote "willing to pay", flag it as an AO1 error and cap AO1 at 1/2!).
     * Current account vs Capital account: Net exports (X-M) affect the CURRENT account, NOT "capital inflows".
     * Profit-maximising firms with market power RESTRICT output where MR = MC (P > MC); they do NOT "overproduce to gain more profits" (overproduction comes from negative externalities MSC > MPC). Subsidies do NOT guarantee productive efficiency. Point inside PPC = productive inefficiency, NOT allocative inefficiency.
   - OVERTURN HALLUCINATED ERRORS & PEDANTRY:
     * NEVER penalise "the government uses monetary policy / increases interest rates" as an error (standard Cambridge AS/A-Level shorthand for macroeconomic authorities — ZERO mark deduction! If the draft downgraded a strong essay over "government vs central bank", OVERTURN it and restore the earned Top Band marks!).
     * NEVER label basic valid Level 2 mechanisms (e.g. tariffs/taxes raising petrol car prices -> consumers switch to EVs; subsidies lowering EV production costs -> lower prices) as "inverted mechanisms" — those belong in Level 2 (8–11/20), NOT Level 1 (6/20)!
     * If the draft wrongly penalised valid A-Level theory on a 20m Paper 4 essay, wrongly penalised standard textbook scarcity definitions, or called a 2024–2026 example a "future date" (current year is 2026), REMOVE that false weakness and restore earned marks.
   - ACTIVE ANTI-INFLATION RE-LEVELING (CRITICAL — READ EVERY PARAGRAPH OF THE STUDENT ESSAY): Check whether Pass 1/2 missed an off-focus section, one-sidedness, missing core relationship, or absent evaluation and OVER-MARKED the script! You have FULL authority to LOWER inflated AO1/AO2/AO3 marks to the true Cambridge level:
     * ONE-SIDED "BEST METHOD / ONLY WAY" CAP (OFFICIAL CAMBRIDGE L2;4 Ev0 STANDARD): If the question asks whether Policy X is the "best method / best way / only way / most effective way" (e.g. "Assess whether supply-side policy is the best method to reduce inflation") and the student analyses ONLY Policy X for the entire essay WITHOUT actually analysing any alternative policy (a passing mention like "along with demand-side policies" in the conclusion does NOT count!), you MUST lower AO2 to max 3/6 (12m) / max 6/12 (20m) and AO3 to 0–1/4 (12m) / 0–2/6 (20m) (total 4–6/12 on 12m!), and flag the missing alternative policy as the #1 weakness!
     * ZERO-EVALUATION / MISSING CORE INTERACTION CAP: If a 20m evaluative essay has NO evaluative paragraphs/counter-arguments/limitations and ends with only a 1–2 sentence closing assertion (e.g. "Hence X and Y determine Z to a great degree"), you MUST lower AO3 to 0–1/6 (NEVER 4/6!). And if a question asks how TWO variables interact (e.g. total market demand size relative to MES -> number of firms N = Q/MES) and the essay misses that core link (e.g. treating total market demand as product differentiation), lower AO2 to Level 2 (max 6–7/12 -> total 7–9/20 when evaluation is also minimal!).
     * LEVEL 1 (20m: 4–6/20 -> AO1=1, AO2=2–4, AO3=0–1; 12m: 2–4/12; 8m: 2–3/8): Enforce whenever the student: (a) wasted a substantial page/paragraph explaining the WRONG/OPPOSITE policy (e.g. expansionary monetary policy when asked how to REDUCE inflation) while giving only weak/confused contractionary analysis without AD/AS (e.g. claiming decreasing money supply makes producers raise export prices) — NEVER give 6/12 AO2 or 4/6 AO3 when there is a major directional/off-focus error!, OR (b) proposed an inappropriate policy whose core mechanism fails (price ceiling to encourage EV supply without analysing shortages) alongside flawed tax/definition claims, OR (c) relied on muddled/invented causal stories without an AD/AS or S&D framework with only a 1-sentence asserted conclusion or incoherent gibberish evaluation (0/2 on 8m, 0–1/6 on 20m!).
     * LEVEL 2 (20m: 9–12/20 -> AO1=1–2, AO2=5–8, AO3=2–3; 12m: 5–8/12; 8m: 4–6/8): Enforce strictly (NEVER award 4/6 AO3 or 14–16/20 on Paper 4!) whenever a script: (a) asserts effects descriptively without developed AD/AS or multiplier models and ends with a generic 2-sentence "uncertain" conclusion (AO3 MUST be Level 1: 2/6, NOT 4/6!), OR (b) leaves diagrams completely unreferenced in prose AND contains a directional slip (such as claiming devaluation reduces inflation!), OR (c) misses a central synthesis (separate D and S shifts never combined), OR (d) mixes valid basic Level 2 policies with mislabeled diagrams and simple caveats (give Level 2: 8–10/20, NOT Level 1 6/20!).
     * LEVEL 3 / TOP BAND (20m: 15–19/20; 12m: 10–12/12; 8m: 7–8/8): Protect Top Band marks for concise, authentic timed handwritten scripts (e.g. ~420–700w on 20m, ~320–550w on 12m) that have accurate definitions, unbroken step-by-step causal chains across policies, accurate diagrams/models (AD/AS, multiplier, MSC/MSB), ZERO major directional errors or off-focus pages, and reasoned contextual evaluation (e.g. on 12m, tying policy choice to demand-pull vs cost-push causes and government budget merits 3/4 AO3 and 10/12!).

2. ZERO REPETITION — DISTINCT ROLES FOR EVERY SECTION:
   - Eliminate ALL duplicate or near-duplicate points inside "strengths", "weaknesses", "missing_elements.*", and "actionable_feedback".
   - Enforce STRICT NON-OVERLAPPING ROLES across sections so the student NEVER reads the same criticism three times:
     * "examiner_summary" (2–3 concise sentences): High-level verdict explaining why the essay sits in its band.
     * "ao_breakdown.*.comment" (1–2 sentences each): Concise justification specific to THAT AO only.
     * "strengths" (2–4 distinct bullets): Specific things done well with verified verbatim quotes.
     * "weaknesses" (2–4 distinct bullets): Diagnostic issues in what was written (each bullet = a DIFFERENT economic issue).
     * "missing_elements": Ultra-concise checklist phrases (8–18 words, MAX 2 items per category, [] if none) listing ONLY omitted concepts/steps/criteria NOT already explained in full in "weaknesses".
     * "actionable_feedback" (2–3 concrete bullets): Concrete HOW-TO rewrite instructions (specific paragraph, causal chain, or weighing criterion to write next), phrased distinctly from "weaknesses" and "missing_elements".

3. MARK-TO-PROSE CONSISTENCY & ZERO CONTRADICTIONS:
   - Never contradict the awarded marks (e.g. never write "restricted to Level 1" when awarding Level 2 / Top Band).
   - Never tell a Top Band essay ("Top Band") "to reach Top Band" — say "to push toward full marks" or "to refine further".
   - Never praise an example, definition, or diagram in "strengths" while claiming it is missing/inadequate in "weaknesses" or "missing_elements".
   - Never claim the essay "ends without a decisive judgement" if the final paragraph explicitly weighs trade-offs and states a prioritised conclusion.

4. STRICT DIAGRAM RULE & ANTI-PEDANTRY:
   - If the exam question did NOT explicitly request a diagram/graph/pay-off matrix: PURGE any weakness, actionable bullet, or missing_elements.diagrams entry that criticises the absence of a diagram or tells the student to add/draw one.
   - If the exam question EXPLICITLY requested a diagram ("With the help/aid of a diagram(s)") and NONE is present in the essay: ENFORCE official Cambridge "L2 maximum" for AO2 (max 8/12 on 20m, max 4/6 on 12m, max 3/4 on 8m) and ensure the omitted diagram is noted in "weaknesses" and "missing_elements.diagrams".
   - ANTI-PEDANTRY: Remove unrealistic quantitative demands (such as demanding "percentage changes in AD vs LRAS" or "X% of budgets"). Also strictly enforce AO3 prioritization boundaries: an unweighted "it depends on A, B, and C" conclusion without prioritizing which factor dominates MUST stay at max 3/4 (12m) or max 4/6 (20m).

5. CLEAN CAMBRIDGE PROSE:
   - Strictly NO asterisks (* or **), NO internal snippet tags ([S1], [S2]), NO numeric score fractions in prose (e.g. "7/8", "3/4", "cost you marks").
   - Quotation marks ('...' or "...") MUST wrap ONLY exact verbatim phrases from the student's essay.
   - "suggested_resources": Exact Cambridge 9708 chapter titles matching the question's paper scope (AS Paper 2 vs A-Level Paper 4).
   - "suggested_practice": 2 targeted practice tasks strictly on this question's topic.

Respond ONLY with a single valid JSON object (no markdown fences, no commentary):
{
  "total_mark": <int, exact sum of awarded AO1+AO2+AO3>,
  "max_mark": {max_mark},
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": {ao1_marks}, "comment": "<string>" },
    "analysis": { "awarded": <int>, "out_of": {ao2_marks}, "comment": "<string>" },
    "evaluation": { "awarded": <int>, "out_of": {ao3_marks}, "comment": "<string>" }
  },
  "band": "<Top Band | Upper Middle Band | Lower Middle Band | Bottom Band>",
  "examiner_summary": "<string>",
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "missing_elements": {
    "definitions": [],
    "analysis": [],
    "evaluation": [],
    "examples": [],
    "diagrams": []
  },
  "actionable_feedback": ["<string>", ...],
  "suggested_resources": ["<string>", ...],
  "suggested_practice": ["<string>", ...]
}`;

export type RefineReportOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  draftGrading: Grading;
  userId?: string;
  markSchemeContext?: string;
  neuroSymbolicSummary?: string;
  comparativeJudgement?: ComparativeJudgementResult | null;
  /** When set, locks the calibrated V4.1 Psychometric Ensemble total mark so Pass 3 only polishes prose & consistency. */
  lockTotalMark?: number;
};

function compactDraftForRefiner(draft: Grading): Record<string, unknown> {
  return {
    total_mark: draft.total_mark,
    max_mark: draft.max_mark,
    band: draft.band,
    ao_breakdown: draft.ao_breakdown,
    examiner_summary: draft.examiner_summary,
    strengths: draft.strengths,
    weaknesses: draft.weaknesses,
    missing_elements: draft.missing_elements,
    actionable_feedback: draft.actionable_feedback,
    suggested_resources: draft.suggested_resources,
    suggested_practice: draft.suggested_practice,
  };
}

export async function refineExaminerReport(options: RefineReportOptions): Promise<Grading> {
  const {
    question,
    essayText,
    maxMark,
    split,
    draftGrading,
    userId,
    markSchemeContext,
    neuroSymbolicSummary,
    comparativeJudgement,
  } = options;

  const promptTemplate = REPORT_REFINER_PROMPT
    .replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks))
    .replace(/{paper_scope_directive}/g, buildPaperScopeDirective(maxMark))
    .replace(/{ao_evaluation_directive}/g, buildAoEvaluationDirective(maxMark, split));

  const userParts = [
    `EXAM QUESTION (${maxMark} marks · AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):\n${question}\n`,
    `STUDENT ESSAY:\n${essayText}\n`,
  ];

  if (markSchemeContext && markSchemeContext.trim().length > 0) {
    userParts.push(`OFFICIAL CAMBRIDGE MARK SCHEME / SYLLABUS EXCERPT:\n${markSchemeContext.slice(0, 1400)}\n`);
  }

  if (neuroSymbolicSummary) {
    userParts.push(`${neuroSymbolicSummary}\n`);
  }

  if (comparativeJudgement) {
    userParts.push(
      `PSYCHOMETRIC COMPARATIVE ANCHOR CONTEXT (vs ${comparativeJudgement.anchorsCompared} real Cambridge ECR scripts):\n` +
        `- Comparative placement: ${comparativeJudgement.estimatedMark}/${maxMark} (Band range: ${comparativeJudgement.plausibleLow}–${comparativeJudgement.plausibleHigh}/${maxMark}).\n` +
        `- Treat this as secondary diagnostic context only — if the Draft Examiner Report already reflects accurate Cambridge positive marking and zero major errors, preserve its earned marks rather than downgrading.\n`,
    );
  }

  if (typeof options.lockTotalMark === "number") {
    userParts.push(
      `CALIBRATED ENSEMBLE MARK LOCK: The orthogonal examiner panel has locked this script at ${options.lockTotalMark}/${maxMark} (AO1: ${draftGrading.ao_breakdown.knowledge.awarded}/${split.ao1_marks}, AO2: ${draftGrading.ao_breakdown.analysis.awarded}/${split.ao2_marks}, AO3: ${draftGrading.ao_breakdown.evaluation.awarded}/${split.ao3_marks}). KEEP these exact awarded marks and focus 100% on refining prose clarity, economic accuracy of comments, verbatim quotes, and zero repetition.\n`,
    );
  }

  userParts.push(
    `DRAFT EXAMINER REPORT TO AUDIT & REFINE:\n${JSON.stringify(compactDraftForRefiner(draftGrading))}\n`,
    `Audit economic accuracy (including catching any false praise or hallucinated errors), verify marks against the Cambridge level descriptors, eliminate ALL repetition within and across sections, and return clean JSON.`,
  );

  try {
    const result = await callOrthogonalFamily({
      family: "nvidia_super_vl_120b",
      temperature: 0.05,
      json: true,
      maxCompletionTokens: 2600,
      timeoutMs: 14000,
      userId,
      feature: "grade_essay_pass3_refiner",
      messages: [
        { role: "system", content: promptTemplate },
        { role: "user", content: userParts.join("\n") },
      ],
    });

    const parsed = extractFirstJsonObject(result.text);
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) {
      console.warn("[refine.server] Refiner returned empty or invalid JSON, preserving draft grading.");
      return deduplicateAcrossSections(purgeContradictions(draftGrading), question);
    }

    let refined = normaliseGrading(parsed, maxMark, split, essayText, question);

    // Apply writing quality, required-diagram L2 cap & economic mechanics guardrail directly to the refined report
    const quality = analyzeEssayQuality(essayText, maxMark, split);
    refined = applyWritingQualityGuardrail(refined, quality, maxMark, split, essayText, question);

    // Enforce V4.1 Psychometric Ensemble Mark Lock so prose polishing never mutates calibrated scores
    if (typeof options.lockTotalMark === "number" && refined.total_mark !== draftGrading.total_mark) {
      refined.total_mark = draftGrading.total_mark;
      refined.band = draftGrading.band;
      refined.ao_breakdown = {
        knowledge: { ...refined.ao_breakdown.knowledge, awarded: draftGrading.ao_breakdown.knowledge.awarded },
        analysis: { ...refined.ao_breakdown.analysis, awarded: draftGrading.ao_breakdown.analysis.awarded },
        evaluation: { ...refined.ao_breakdown.evaluation, awarded: draftGrading.ao_breakdown.evaluation.awarded },
      };
    }

    // Preserve metadata from earlier passes
    refined.sources = draftGrading.sources;
    refined.anchorsUsed = draftGrading.anchorsUsed;
    refined.grounding_status = draftGrading.grounding_status;
    refined.confidence = Math.max(draftGrading.confidence, refined.confidence || 0.95);
    refined.audited = true;
    refined.arbitrated = draftGrading.arbitrated;

    // Preserve topic-specific suggested_resources and practice from draftGrading if refiner omitted them or returned generic
    if (
      (!refined.suggested_resources ||
        refined.suggested_resources.length === 0 ||
        refined.suggested_resources.some((r) => /relevant chapter|core theory & policy/i.test(r))) &&
      draftGrading.suggested_resources &&
      draftGrading.suggested_resources.length > 0 &&
      !draftGrading.suggested_resources.some((r) => /relevant chapter|core theory & policy/i.test(r))
    ) {
      refined.suggested_resources = draftGrading.suggested_resources;
    }

    if (
      (!refined.suggested_practice ||
        refined.suggested_practice.length === 0 ||
        refined.suggested_practice.some((p) => /policy implementation to consumer and producer surplus/i.test(p))) &&
      draftGrading.suggested_practice &&
      draftGrading.suggested_practice.length > 0 &&
      !draftGrading.suggested_practice.some((p) => /policy implementation to consumer and producer surplus/i.test(p))
    ) {
      refined.suggested_practice = draftGrading.suggested_practice;
    }

    return cleanStars(deduplicateAcrossSections(purgeContradictions(refined), question));
  } catch (err) {
    console.warn("[refine.server] Pass 3 refinement failed, falling back to cleansed draft:", err);
    return cleanStars(deduplicateAcrossSections(purgeContradictions(draftGrading), question));
  }
}
