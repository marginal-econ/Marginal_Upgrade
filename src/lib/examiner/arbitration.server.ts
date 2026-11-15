/**
 * Cambridge 9708 Third-Stage Principal Examiner Arbitration & Confidence Engine.
 *
 * In official Cambridge International examination practice, when a primary examiner
 * and an independent moderator disagree significantly on a script, the script is
 * escalated to a Principal Examiner for authoritative arbitration.
 *
 * This module:
 * 1. Objectively detects marking discrepancies (mark delta >= 18% of maxMark, or grade band mismatch).
 * 2. Selectively executes an evidence-grounded Principal Examiner arbitration pass.
 * 3. Synthesizes dual-pass markings when examiners converge closely.
 * 4. Calculates a rigorous, non-hallucinated confidence score derived from marking variance and evidence density.
 */

import { chat } from "../ai.server";
import { formatStructureNote, getStructureGuidance, MODEL_EXAMINER, TEMPERATURE_EXAMINER, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { bandFor, normaliseGrading, stripScoreFractionsFromText, type Grading } from "./types";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
  type EssayQualityAnalysis,
} from "./writing-quality.server";

export type DisputeCheckResult = {
  shouldArbitrate: boolean;
  delta: number;
  reason: string;
};

/**
 * Checks whether a material discrepancy exists between the primary examiner
 * and the independent moderator that warrants Principal Examiner arbitration.
 */
export function shouldTriggerArbitration(
  examiner: Grading,
  moderator: Grading,
  maxMark: number,
): DisputeCheckResult {
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const threshold = Math.max(2, Math.round(maxMark * 0.18)); // e.g. 2 for 8-mark, 2-3 for 12-mark, 4 for 20-mark

  // Zero-mark relevance contradiction: one pass zeroed the essay as off-topic while the other awarded positive marks
  const zeroDiscrepancy =
    (examiner.total_mark === 0 && moderator.total_mark > 0) ||
    (moderator.total_mark === 0 && examiner.total_mark > 0);

  if (zeroDiscrepancy) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Relevance discrepancy: one examiner awarded 0 marks (flagged as off-topic) while the other pass awarded positive marks (${Math.max(examiner.total_mark, moderator.total_mark)}/${maxMark}). Authoritative double-check required.`,
    };
  }

  const normEx = (examiner.band || "").toLowerCase();
  const normMod = (moderator.band || "").toLowerCase();
  const bandMismatch = normEx !== normMod;
  // Significant band discrepancy: e.g. Top band vs Middle band
  const extremeBandMismatch =
    (normEx.includes("top") && normMod.includes("lower")) ||
    (normMod.includes("top") && normEx.includes("lower")) ||
    (normEx.includes("bottom") && normMod.includes("upper")) ||
    (normMod.includes("bottom") && normEx.includes("upper"));

  if (delta >= threshold) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Mark discrepancy of ${delta} marks between primary pass (${examiner.total_mark}/${maxMark}) and second pass (${moderator.total_mark}/${maxMark}) exceeds tolerance threshold of ${threshold}.`,
    };
  }

  if (extremeBandMismatch) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Grade band contradiction between primary pass ("${examiner.band}") and second pass ("${moderator.band}").`,
    };
  }

  return {
    shouldArbitrate: false,
    delta,
    reason: `Marks are within acceptable tolerance (delta: ${delta}, threshold: ${threshold}).`,
  };
}

/**
 * Computes a rigorous, non-hallucinated confidence score based on:
 * - Mark convergence between independent passes
 * - Specificity and evidence quoting in feedback
 * - Scale factor bounded between [0.35, 0.98]
 */
export function computeObjectiveConfidence(
  examiner: Grading,
  moderator: Grading,
  arbitrated: boolean,
): number {
  const maxMark = examiner.max_mark || 12;
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const deltaRatio = delta / maxMark;

  // Base confidence inversely proportional to mark disagreement
  let score = 1.0 - deltaRatio * 1.1;

  // Evidence density bonus: reward assessments that cite verbatim phrases
  const allFeedback = [
    ...examiner.strengths,
    ...examiner.weaknesses,
    ...moderator.strengths,
    ...moderator.weaknesses,
  ].join(" ");

  const hasQuotes = /["'].+?["']/.test(allFeedback);
  const evidenceBonus = hasQuotes ? 0.05 : 0.0;
  score += evidenceBonus;

  // If arbitrated, confidence reflects the authoritative reconciliation
  if (arbitrated) {
    score = Math.max(score, 0.88);
  }

  return Math.max(0.35, Math.min(0.98, Number(score.toFixed(2))));
}

export const ARBITRATION_PROMPT = `You are a Principal Examiner for Cambridge International AS/A Level Economics (syllabus 9708).
A student essay has been marked independently by two Senior Examiners:
- Pass 1 focused on theoretical error checking and mechanism precision (temperature 0.0).
- Pass 2 focused on holistic Cambridge marking and evaluation breadth (temperature 0.2).
They have reached a material disagreement. Your job is to act as the final, authoritative arbitrator and conclude both passes together.

You will be given:
1. The exam question (out of {max_mark} marks).
2. The student's essay.
3. Pass 1's grading and breakdown.
4. Pass 2's grading and breakdown.
5. The specific reason for escalation.

FIXED AO MARK ALLOCATION (syllabus 9708, {max_mark}-mark essay):
- AO1 Knowledge and understanding: exactly {ao1_marks} marks
- AO2 Analysis: exactly {ao2_marks} marks
- AO3 Evaluation: exactly {ao3_marks} marks

AUTHORITATIVE PRINCIPAL EXAMINER PRINCIPLES:
1. VERBATIM EVIDENCE: Base your decision on direct evidence from the student's text.
2. RELEVANCE DIRECTIVE & MANDATORY DOUBLE-CHECK:
   - Practice POSITIVE MARKING: NEVER classify an essay as off-topic or award 0 marks unless you have double-checked and verified that the essay is 100% UNRELATED to the question asked.
   - Legitimate responses in Cambridge 9708 include:
     * Comparing the primary policy against alternative policies (e.g. comparing subsidies with direct provision, education, maximum prices, or taxes).
     * Establishing economic groundwork (e.g. market failure, positive/negative externalities, information failure, allocative inefficiency).
     * Approaching the prompt with differing analytical emphasis or partial focus.
     All of these MUST be marked positively on their economic merits.
   - Only award 0 marks across all AOs if you have double-checked that the essay has ZERO economic relation to the question prompt (no economic overlap whatsoever). No grace marks for genuinely off-topic material.
3. KNOWLEDGE & ANALYSIS CRITERIA (+3-5% STRICTNESS):
   - AO1 Knowledge: Demand syllabus-precise definitions and thorough economic knowledge and understanding across all key concepts. Vague or ambiguous terms earn 1 mark; inverted/false definitions receive 0.
   - AO2 Analysis: Demand complete, unbroken causal transmission chains and thorough analysis. Omitted causal steps restrict analysis from Top Band. For 20-mark extended essays, analysis across all 12 marks must be thorough and multi-perspective.
   - Examples & Application: If an example is related to the question and demonstrates genuine real-world application, reward that mark under AO2. For 20-mark essays, powerful and relevant use of real-life examples (naming specific countries, markets, or policy programs) integrated into the analytical mechanism is strictly required for Top Band. If theoretical, it must provide a clear demonstration of the mechanism. REJECT weak one-liner examples (e.g. passing mentions like "e.g. healthcare" without explanation).
4. DIAGRAM DIRECTIVE (STRICT CAMBRIDGE RULE):
   - Diagrams are NEVER compulsory unless the question explicitly asks for one (e.g. 'with the aid of a diagram').
   - Written economics alone can achieve full marks (including full marks in AO2 and overall).
   - NEVER penalise or deduct marks for the absence of a diagram. If either pass deducted marks for lack of a diagram, OVERTURN that deduction.
   - If an accurate diagram is described or drawn, ensure it is POSITIVELY REWARDED under AO2.
5. EVALUATION DIRECTIVE (STRONG, WIDE, AND RIGOROUS +3-5% STRICTNESS):
   - EVALUATIVE VS NON-EVALUATIVE TARIFF DIRECTIVE:
     * If {ao3_marks} is 0 marks: Evaluation is strictly NOT required (legacy Cambridge 8-mark 'Explain' questions). Set awarded: 0, out_of: 0, and comment: "Evaluation is not required for this question. No marks are lost for its omission." Keep missing_elements.evaluation empty [].
     * If {ao3_marks} > 0 marks: Evaluation IS MANDATORY. You MUST grade AO3 out of {ao3_marks} marks. NEVER state that evaluation is not required, even if the question starts with 'Explain'.
      * PAPER SCOPE FOR 8-MARK & 12-MARK ESSAYS: Strictly Cambridge 9708 Paper 2 (AS Level). NEVER mention Paper 4, A-Level topics (oligopoly, monopolistic competition, Pareto efficiency, Chapter 32), or extended Paper 4 essays.
     * For 8-mark evaluative questions ({ao3_marks} = 2 marks):
        - ONLY A PERFECT ESSAY CAN RECEIVE 8 MARKS (8/8).
        - Full 2/2 marks for AO3 is strictly reserved for a truly perfect evaluative essay where all evaluation criteria are fully met and a supported concluding judgement resolves the prompt.
        - When evaluation criteria are NOT fully met, or the concluding judgement is NOT satisfied, award Level 1 (1 of 2 marks) for AO3 (caps total score at 7).
        - ZERO NUMERIC MARKS IN PROSE: Do NOT write numerical scores, mark breakdowns, or phrases like "held at 7", "instead of 8", or "cost you marks" anywhere inside written feedback or comments. Focus strictly on strengths and AS syllabus-accurate improvements.
     * For 20-mark extended essays ({ao3_marks} = 6 marks): Scrutinize synoptic evaluation rigorously with +3-5% strictness. Require candidates to synthesize micro and macro impacts, evaluate short-run vs long-run trade-offs, test elasticity conditions, and provide a reasoned, decisive contextual verdict answering the question prompt directly. Top Band (5-6/6) strictly demands critical prioritization of decisive factors.
   - Apply calibrated strictness (+3-5%) to AO3 Evaluation:
   - Demand critical prioritization: top band evaluation requires the candidate to explicitly justify which factor or criterion is most decisive (e.g. why inelastic demand limits short-run effectiveness vs long-run substitution).
   - Reject unprioritized textbook lists: merely reciting 'it depends on PED, time, and government budget' without contextual weighing belongs in middle band.
   - For questions assessing whether a policy is the 'best way' or 'most effective' intervention, candidates must directly compare against alternative policies (e.g. permits, regulation, subsidies) against explicit criteria (PED pass-through, equity/regressive impacts, administrative feasibility, government failure in tax calibration). Superficial or missing comparative weighing cannot exceed Level 1 in AO3.
   - Be strict on superficial evaluation: a single token sentence or generic conclusion ('a mix of both is best') without justified weighing criteria must not reach top band.
   - NO ARTIFICIAL NUMERIC CAPS: Do NOT apply rigid programmatic caps or formulaic ceiling rules (such as 'caps AO3' or 'Table B capped'). Evaluate the candidate's evaluative depth and breadth holistically on its economic merit.
6. ACCURATE ECONOMICS VS ERRORS & REALISTIC CALIBRATION:
    - CHAPTER 5 (PPC) & EFFICIENCY GROUNDING — STRICT AS LEVEL MISCONCEPTION CHECK:
      * Point inside PPC = Productive inefficiency / unemployment or underutilisation of resources (idle factors, X-inefficiency). A PPC shows productive capacity alone; it contains NO information about consumer preferences and does NOT represent allocative inefficiency!
      * Point on PPC = Productive efficiency (maximum possible output from given resources), though it may still be allocatively inefficient if the output mix does not match consumer preferences (P != MC).
      * MANDATORY ANALYTICAL ERROR FLAG: Flag any confusion between productive and allocative inefficiency on a PPC diagram as an analytical error (deduct 1 mark in AO2). You must NEVER praise this confusion. Overturn any pass that praised it and advise constructively on distinguishing productive inefficiency from allocative efficiency.
    - Distinguish correct economics from genuine errors:
     * When a subsidy lowers market price, quantity demanded extends/increases along the curve (from Q to Q1). That is accurate economic terminology, not an error.
     * Merit goods are defined both by positive externalities and by information failure / undervaluation of private benefits. Both are syllabus-correct.
   - ACCOUNTABILITY ON MAJOR THEORETICAL ERRORS:
     * Inverted definitions (e.g. defining negative externality as a benefit to firms paid by government, claiming carbon tax is a direct tax on income) earn 0 marks on AO1.
     * Flawed causal mechanisms built on false economic premises cannot exceed Level 1 in AO2.
     * Realistic calibration: essays with fundamental conceptual errors and weak comparative evaluation belong in Lower Middle or Bottom band, never Upper Middle or Top Band.
7. HUMAN, CONSTRUCTIVE TONE:
   - Write feedback that feels genuinely human, encouraging, and supportive. Quote verbatim phrases from the student's text.
   - Zero asterisks (* or **): return clean plain text only.

8. CAMBRIDGE WRITING QUALITY, DEPTH & PARAGRAPH STRUCTURE:
   - Ensure the arbitrated mark complies with Cambridge writing standards:
   - An essay under 350 words (for 12 marks) or under 550 words (for 20 marks) is an outline summary where transmission links are compressed. It must NOT be awarded Top Band Level 3/4 for AO2 or AO3.
   - Single-paragraph monolithic submissions fail Cambridge organizational standards and cannot exceed Level 2.
   - AI-generated formatting artifacts (**bolding**, raw LaTeX) must be penalized as compressed outline notes rather than examination essays.
   - Preserve full credit for well-developed, paragraphed student essays (500+ words for 12m, 800+ words for 20m) that demonstrate sustained analysis, powerful real-life examples, and prioritized evaluation.

9. OFFICIAL CAMBRIDGE RESPONSE STRUCTURE GUIDANCE:
{structure_note}

10. SUBMISSION QUALITY & DEPTH PROFILE:
{essay_quality_profile}

Respond ONLY with a single valid JSON object, no markdown fences, no commentary outside the JSON. Never use markdown asterisks or bolding (**) in any string field:
{
  "total_mark": <integer, sum of the three awarded values below>,
  "max_mark": {max_mark},
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": {ao1_marks}, "comment": "<string explaining authoritative decision>" },
    "analysis": { "awarded": <int>, "out_of": {ao2_marks}, "comment": "<string explaining authoritative decision>" },
    "evaluation": { "awarded": <int>, "out_of": {ao3_marks}, "comment": "<string explaining authoritative decision>" }
  },
  "band": "<Top Band | Upper Middle Band | Lower Middle Band | Bottom Band>",
  "examiner_summary": "<authoritative 2-3 sentence Principal Examiner verdict>",
  "strengths": ["<string quoting student text>", "..."],
  "weaknesses": ["<string highlighting genuine economic improvement>", "..."],
  "missing_elements": {
    "definitions": ["<string>"],
    "analysis": ["<string>"],
    "evaluation": ["<string>"],
    "examples": ["<string>"],
    "diagrams": []
  },
  "actionable_feedback": ["<string>", "..."],
  "arbitration_rationale": "<precise explanation of how the two passes were reconciled>"
}`;

export type ArbitrateOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  examinerGrading: Grading;
  moderatorGrading: Grading;
  disputeReason: string;
  userId?: string;
  qualityAnalysis?: EssayQualityAnalysis;
};

export async function arbitrateGrading(options: ArbitrateOptions): Promise<Grading> {
  const { question, essayText, maxMark, split, examinerGrading, moderatorGrading, disputeReason } =
    options;

  const quality =
    options.qualityAnalysis ?? analyzeEssayQuality(essayText, maxMark, split);
  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split));
  const qualityDirective = buildQualityPromptDirective(quality, maxMark);

  const promptTemplate = ARBITRATION_PROMPT.replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks))
    .replace(/{structure_note}/g, structureNote)
    .replace(/{essay_quality_profile}/g, qualityDirective);

  const userMessage = [
    `Exam Question (${maxMark} marks):\n${question}\n`,
    `Student Essay:\n${essayText}\n`,
    `Dispute Escalation Reason:\n${disputeReason}\n`,
    `Examiner Pass 1 (Error Audit, temp 0.0):\n${JSON.stringify(examinerGrading, null, 2)}\n`,
    `Examiner Pass 2 (Holistic Evaluation, temp 0.2):\n${JSON.stringify(moderatorGrading, null, 2)}\n`,
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    userId: options.userId,
    feature: "grade_essay_arbitration",
    messages: [
      { role: "system", content: promptTemplate },
      { role: "user", content: userMessage },
    ],
  });

  const parsedRaw = extractFirstJsonObject(result.text);
  const reconciled = normaliseGrading(parsedRaw, maxMark, split);

  reconciled.audited = true;
  reconciled.arbitrated = true;
  reconciled.arbitrationNotes =
    typeof parsedRaw.arbitration_rationale === "string"
      ? parsedRaw.arbitration_rationale
      : "Concluded authoritatively by Cambridge Principal Examiner pass.";

  reconciled.confidence = computeObjectiveConfidence(examinerGrading, moderatorGrading, true);
  return applyWritingQualityGuardrail(reconciled, quality, maxMark, split);
}

/**
 * Synthesizes two convergent examiner passes (delta <= 1) into an authoritative final grading.
 * Preserves specific diagnostic weaknesses caught by Pass 1 while maintaining Pass 2's
 * holistic perspective, constructive tone, and Cambridge standard.
 */
export function synthesizeDualPasses(
  pass1: Grading,
  pass2: Grading,
  maxMark: number,
  split: AoSplit,
  quality?: EssayQualityAnalysis,
): Grading {
  // If BOTH passes independently determined the essay was completely off-topic / unrelated (both awarded 0),
  // uphold the strict Cambridge zero-marks rule:
  if (pass1.total_mark === 0 && pass2.total_mark === 0) {
    const zeroGrading = pass1;
    return {
      ...zeroGrading,
      total_mark: 0,
      band: "Bottom band",
      ao_breakdown: {
        knowledge: { awarded: 0, out_of: split.ao1_marks, comment: zeroGrading.ao_breakdown.knowledge.comment || "No relevant economic knowledge demonstrated for the question asked." },
        analysis: { awarded: 0, out_of: split.ao2_marks, comment: zeroGrading.ao_breakdown.analysis.comment || "Content is unrelated to the question; no analytical credit can be awarded." },
        evaluation: { awarded: 0, out_of: split.ao3_marks, comment: zeroGrading.ao_breakdown.evaluation.comment || "No evaluative credit awarded for off-topic material." },
      },
      audited: true,
      arbitrated: false,
      confidence: 0.98,
    };
  }

  // If marks are identical, consensus is established.
  // When delta is 1, prefer the rigorous Error-Audit pass (pass1) to maintain calibrated evaluative strictness.
  const preferred = pass1.total_mark <= pass2.total_mark ? pass1 : pass2;

  // Reconcile individual AO awarded marks ensuring sum equals total with calibrated strictness (+3-5% on AO1/AO2/AO3)
  let kMark = Math.min(
    split.ao1_marks,
    Math.floor((pass1.ao_breakdown.knowledge.awarded + pass2.ao_breakdown.knowledge.awarded) / 2 + 0.45),
  );
  let aMark = Math.min(
    split.ao2_marks,
    Math.floor((pass1.ao_breakdown.analysis.awarded + pass2.ao_breakdown.analysis.awarded) / 2 + 0.45),
  );
  // For 8-mark evaluative essays (AO3 = 2 marks):
  // 8/8 is strictly reserved for a truly perfect essay.
  // When evaluation criteria are not fully met or conclusion is not satisfied, award 1/2 marks, keeping the essay at 7.
  const isEightMark = maxMark === 8 && split.ao3_marks === 2;
  const pass1EvalAwarded = pass1.ao_breakdown.evaluation.awarded;
  const pass2EvalAwarded = pass2.ao_breakdown.evaluation.awarded;
  const allWeaknessesText = [...pass1.weaknesses, ...pass2.weaknesses].join(" ").toLowerCase();
  const allEvalCommentsText = `${pass1.ao_breakdown.evaluation.comment || ""} ${pass2.ao_breakdown.evaluation.comment || ""}`.toLowerCase();

  const hasUnmetEvaluationOrConclusion =
    pass1EvalAwarded < 2 ||
    pass2EvalAwarded < 2 ||
    pass1.total_mark < 8 ||
    pass2.total_mark < 8 ||
    (pass1.missing_elements.evaluation && pass1.missing_elements.evaluation.length > 0) ||
    (pass2.missing_elements.evaluation && pass2.missing_elements.evaluation.length > 0) ||
    /unmet|incomplete|unsatisfied|missing|unsupported|partially|fail(ed|s)? to|superficial|weak|not fully|room for|could be further/i.test(allEvalCommentsText) ||
    /conclusion.*(missing|weak|unsupported|lacking|incomplete|unsatisfied)|evaluation.*(not fully|partially|lacking|unmet|incomplete)/i.test(allWeaknessesText);

  let eMark = 0;
  if (split.ao3_marks === 0) {
    eMark = 0;
  } else if (isEightMark) {
    // Only a truly perfect essay gets 2/2 and 8/8.
    // If evaluation criteria are not fully met or conclusion is not satisfied, award 1/2, keeping total <= 7.
    eMark = (!hasUnmetEvaluationOrConclusion && pass1EvalAwarded === 2 && pass2EvalAwarded === 2) ? 2 : 1;
  } else {
    eMark = Math.min(
      split.ao3_marks,
      Math.floor((pass1EvalAwarded + pass2EvalAwarded) / 2 + 0.45),
    );
  }

  let total = kMark + aMark + eMark;
  if (isEightMark && hasUnmetEvaluationOrConclusion) {
    // Keep the essay at 7 instead of 8: maximum 7/8
    total = Math.min(7, total);
    if (eMark > 1) eMark = 1;
  } else if (total !== preferred.total_mark) {
    const diff = preferred.total_mark - total;
    if (diff > 0 && aMark < split.ao2_marks) {
      aMark += 1;
    } else if (diff < 0 && aMark > 0) {
      aMark -= 1;
    } else if (diff > 0 && eMark < split.ao3_marks && !(isEightMark && hasUnmetEvaluationOrConclusion)) {
      eMark += 1;
    } else if (diff < 0 && eMark > 0) {
      eMark -= 1;
    }
    total = kMark + aMark + eMark;
    if (isEightMark && hasUnmetEvaluationOrConclusion) {
      total = Math.min(7, total);
    }
  }

  // Combine unique strengths (max 4)
  const strengthsSet = new Set<string>();
  const strengths: string[] = [];
  for (const s of [...pass2.strengths, ...pass1.strengths]) {
    const clean = s.replace(/[*_]/g, "").trim();
    if (clean && !strengthsSet.has(clean.toLowerCase())) {
      strengthsSet.add(clean.toLowerCase());
      strengths.push(clean);
      if (strengths.length >= 4) break;
    }
  }

  // Combine unique weaknesses (max 4), prioritizing specific errors caught by Pass 1
  const weaknessesSet = new Set<string>();
  const weaknesses: string[] = [];
  for (const w of [...pass1.weaknesses, ...pass2.weaknesses]) {
    const clean = w.replace(/[*_]/g, "").trim();
    if (clean && !weaknessesSet.has(clean.toLowerCase())) {
      weaknessesSet.add(clean.toLowerCase());
      weaknesses.push(clean);
      if (weaknesses.length >= 4) break;
    }
  }

  // Deduplicate actionable feedback
  const feedbackSet = new Set<string>();
  const actionableFeedback: string[] = [];
  for (const f of [...pass2.actionable_feedback, ...pass1.actionable_feedback]) {
    const clean = f.replace(/[*_]/g, "").trim();
    if (clean && !feedbackSet.has(clean.toLowerCase())) {
      feedbackSet.add(clean.toLowerCase());
      actionableFeedback.push(clean);
      if (actionableFeedback.length >= 4) break;
    }
  }

  // Pick the best comment for each AO and strip any numeric fractions
  const rawKComment = pass2.ao_breakdown.knowledge.comment.length > pass1.ao_breakdown.knowledge.comment.length
    ? pass2.ao_breakdown.knowledge.comment
    : pass1.ao_breakdown.knowledge.comment;
  const kComment = stripScoreFractionsFromText(rawKComment.replace(/[*_]/g, "").trim());

  const rawAComment = pass2.ao_breakdown.analysis.comment.length > pass1.ao_breakdown.analysis.comment.length
    ? pass2.ao_breakdown.analysis.comment
    : pass1.ao_breakdown.analysis.comment;
  const aComment = stripScoreFractionsFromText(rawAComment.replace(/[*_]/g, "").trim());

  let rawEComment = pass2.ao_breakdown.evaluation.comment.length > pass1.ao_breakdown.evaluation.comment.length
    ? pass2.ao_breakdown.evaluation.comment
    : pass1.ao_breakdown.evaluation.comment;

  if (split.ao3_marks > 0) {
    if (/not required|non-evaluative/i.test(rawEComment)) {
      const altComment = [pass1.ao_breakdown.evaluation.comment, pass2.ao_breakdown.evaluation.comment]
        .find(c => !/not required|non-evaluative/i.test(c));
      rawEComment = altComment || "Evaluative points consider context and reach a supported conclusion.";
    }
  }

  const eComment = split.ao3_marks === 0
    ? "Evaluation is not required for this question. No marks are lost for its omission."
    : stripScoreFractionsFromText(rawEComment.replace(/[*_]/g, "").trim());

  if (split.ao3_marks === 0) {
    eMark = 0;
  } else if (eMark === 0) {
    const hasEvalMention = /conclusion|judgement|judgment|weigh|perspective|evaluat/i.test(
      (pass1.ao_breakdown.evaluation.comment || "") + " " + (pass2.ao_breakdown.evaluation.comment || "")
    );
    if (hasEvalMention) {
      eMark = 1;
    }
  }

  // Strictly enforce AO boundary constraints
  kMark = Math.max(0, Math.min(split.ao1_marks, kMark));
  aMark = Math.max(0, Math.min(split.ao2_marks, aMark));
  eMark = Math.max(0, Math.min(split.ao3_marks, eMark));

  if (isEightMark && hasUnmetEvaluationOrConclusion) {
    eMark = Math.min(1, eMark);
    while (kMark + aMark + eMark > 7) {
      if (aMark > 0) aMark--;
      else if (kMark > 0) kMark--;
      else if (eMark > 0) eMark--;
    }
  }

  // Ensure total mark does not exceed maxMark
  while (kMark + aMark + eMark > maxMark) {
    if (aMark > 0) aMark--;
    else if (kMark > 0) kMark--;
    else if (eMark > 0) eMark--;
  }

  total = kMark + aMark + eMark;

  // Diagrams missing elements must always be empty unless specifically required
  const missingElements = {
    definitions: Array.from(new Set([...(pass1.missing_elements.definitions || []), ...(pass2.missing_elements.definitions || [])])).slice(0, 3),
    analysis: Array.from(new Set([...(pass1.missing_elements.analysis || []), ...(pass2.missing_elements.analysis || [])])).slice(0, 3),
    evaluation: split.ao3_marks === 0
      ? []
      : Array.from(new Set([...(pass1.missing_elements.evaluation || []), ...(pass2.missing_elements.evaluation || [])])).slice(0, 3),
    examples: Array.from(new Set([...(pass1.missing_elements.examples || []), ...(pass2.missing_elements.examples || [])])).slice(0, 3),
    diagrams: [],
  };

  // Chapter 5 PPC misconception filter for strengths:
  // Strip any false praise claiming point inside PPC is allocatively inefficient or Pareto efficient
  const ppcMisconceptionRegex = /(?=.*(ppc|production possibility))(?=.*(allocative|pareto))/i;
  const filteredStrengths = strengths.filter(s => !ppcMisconceptionRegex.test(s));

  // Check if either pass or feedback exhibited PPC & efficiency confusion
  const flaggedPpcMisconception =
    ppcMisconceptionRegex.test([...pass1.strengths, ...pass2.strengths].join(" ")) ||
    /point\s+inside\s+(the\s+)?ppc.*allocative/i.test([...pass1.weaknesses, ...pass2.weaknesses].join(" "));

  if (flaggedPpcMisconception) {
    const ppcWeakness = "Clarify the distinction between productive and allocative efficiency on the PPC: a point inside the PPC indicates productive inefficiency (unemployed or underutilized resources), whereas points on the curve represent productive efficiency. Allocative efficiency depends on whether the output mix reflects consumer preferences.";
    if (!weaknesses.some(w => w.toLowerCase().includes("point inside the ppc") || w.toLowerCase().includes("distinction between productive and allocative"))) {
      weaknesses.unshift(ppcWeakness);
    }
    // Deduct AO2 Analysis if full marks were awarded (minor analytical error)
    if (aMark === split.ao2_marks && aMark > 0) {
      aMark -= 1;
      total = kMark + aMark + eMark;
    }
  }

  const confidence = computeObjectiveConfidence(pass1, pass2, false);

  const result: Grading = {
    total_mark: total,
    max_mark: maxMark,
    band: bandFor(total, maxMark),
    ao_breakdown: {
      knowledge: {
        awarded: kMark,
        out_of: split.ao1_marks,
        comment: kComment || "Accurate knowledge demonstrated with appropriate economic concepts.",
      },
      analysis: {
        awarded: aMark,
        out_of: split.ao2_marks,
        comment: aComment || "Sound analytical chains of reasoning linking cause and economic effect.",
      },
      evaluation: {
        awarded: eMark,
        out_of: split.ao3_marks,
        comment: eComment || "Evaluative points consider context and reach a supported conclusion.",
      },
    },
    examiner_summary: stripScoreFractionsFromText(preferred.examiner_summary.replace(/[*_]/g, "").trim()),
    strengths: filteredStrengths.map((s) => stripScoreFractionsFromText(s)),
    weaknesses: weaknesses.map((w) => stripScoreFractionsFromText(w)),
    missing_elements: missingElements,
    actionable_feedback: actionableFeedback.map((f) => stripScoreFractionsFromText(f)),
    suggested_resources: Array.from(new Set([...pass2.suggested_resources, ...pass1.suggested_resources])).slice(0, 3),
    suggested_practice: Array.from(new Set([...pass2.suggested_practice, ...pass1.suggested_practice])).slice(0, 3),
    confidence,
    audited: true,
    arbitrated: false,
  };

  return quality ? applyWritingQualityGuardrail(result, quality, maxMark, split) : result;
}
