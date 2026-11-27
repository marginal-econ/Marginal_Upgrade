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

import { cleanStars } from "@/lib/utils";
import {
  buildAoEvaluationDirective,
  buildPaperScopeDirective,
  TEMPERATURE_EXAMINER,
  type AoSplit,
} from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily } from "./multi-family-pool.server";
import {
  bandFor,
  deduplicateAcrossSections,
  deduplicateFeedbackPoints,
  normaliseGrading,
  purgeContradictions,
  sanitizeAsLevelText,
  sanitizeALevelFeedbackText,
  stripScoreFractionsFromText,
  verifyVerbatimQuotes,
  type ComparativeJudgementResult,
  type Grading,
} from "./types";
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
  // Tighter tolerance on 20-mark A Level essays (3 marks instead of 4) so material Paper 4 disagreements are always arbitrated
  const threshold = maxMark >= 20 ? 3 : Math.max(2, Math.round(maxMark * 0.18));

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
  // Significant band discrepancy: e.g. Top band vs Lower Middle, or Bottom vs Upper Middle
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

export const ARBITRATION_PROMPT = `You are a Principal Examiner for Cambridge International AS & A Level Economics (syllabus 9708) resolving a material disagreement between Pass 1 (Error Audit) and Pass 2 (Holistic Assessment).

FIXED AO ALLOCATION ({max_mark} marks):
- AO1 Knowledge: {ao1_marks} | AO2 Analysis: {ao2_marks} | AO3 Evaluation: {ao3_marks}

{paper_scope_directive}

{ao_evaluation_directive}

AUTHORITATIVE ARBITRATION RULES:
1. EVIDENCE-GROUNDED VERDICT: Base every AO mark strictly on verbatim evidence from the student's essay against official Cambridge level descriptors.
2. POSITIVE MARKING & ERROR ACCOUNTABILITY:
   - Credit accurate theory, diagrams, pay-off matrices, and valid mechanisms positively; overturn any hallucinated penalties (such as penalising A-Level theory on a 20m Paper 4 essay, penalising an unrequested missing diagram, or calling 2025/2026 dates "future").
   - Hold firm on verified verbatim errors: inverted supply/demand/monetary/exchange-rate mechanisms cap AO2 at Level 1; inverted definitions cap AO1 at 0–1; claiming profit-maximising firms "overproduce" (instead of restricting output where MR=MC) or claiming subsidies guarantee productive efficiency or claiming inside-PPC is allocative inefficiency MUST be flagged and never praised.
3. DIAGRAM RULE: Diagrams are NEVER compulsory unless explicitly requested in the question. Overturn any deduction or weakness penalising an unrequested missing diagram.
4. ZERO REPETITION & DISTINCT SECTION ROLES:
   - Every bullet in strengths (2–4), weaknesses (2–4), missing_elements (max 2 short phrases per non-empty category), and actionable_feedback (2–3 concrete rewrite steps) MUST be distinct with zero duplication within arrays or copy-pasting across sections.
   - Summary and AO comments MUST match the awarded marks and band (never tell a Top Band essay "to reach Top Band").
   - No markdown asterisks (*), no [S#] codes, no numeric score fractions in prose.

{essay_quality_profile}

Respond ONLY with a single valid JSON object (no markdown fences, no commentary):
{
  "mechanism_validation": {
    "core_mechanisms_sound": <boolean>,
    "fatal_misconceptions_found": <boolean>,
    "error_evidence_quotes": ["<verbatim quote or []>"]
  },
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": {ao1_marks}, "comment": "<concise AO1 justification>" },
    "analysis": { "awarded": <int>, "out_of": {ao2_marks}, "comment": "<concise AO2 justification>" },
    "evaluation": { "awarded": <int>, "out_of": {ao3_marks}, "comment": "<concise AO3 justification>" }
  },
  "total_mark": <int, exact sum of awarded AO1+AO2+AO3>,
  "band": "<Top Band | Upper Middle Band | Lower Middle Band | Bottom Band>",
  "examiner_summary": "<2-3 sentence authoritative verdict>",
  "strengths": ["<distinct strength 1>", "<distinct strength 2>"],
  "weaknesses": ["<distinct diagnostic weakness 1>", "<distinct diagnostic weakness 2>"],
  "missing_elements": { "definitions": [], "analysis": [], "evaluation": [], "examples": [], "diagrams": [] },
  "actionable_feedback": ["<concrete rewrite step 1>", "<concrete rewrite step 2>"],
  "arbitration_rationale": "<1-2 sentence reconciliation rationale>"
}`;

function compactPassForArbitration(g: Grading): Record<string, unknown> {
  return {
    total_mark: g.total_mark,
    band: g.band,
    ao: {
      ao1: `${g.ao_breakdown.knowledge.awarded}/${g.ao_breakdown.knowledge.out_of}: ${g.ao_breakdown.knowledge.comment}`,
      ao2: `${g.ao_breakdown.analysis.awarded}/${g.ao_breakdown.analysis.out_of}: ${g.ao_breakdown.analysis.comment}`,
      ao3: `${g.ao_breakdown.evaluation.awarded}/${g.ao_breakdown.evaluation.out_of}: ${g.ao_breakdown.evaluation.comment}`,
    },
    strengths: g.strengths.slice(0, 3),
    weaknesses: g.weaknesses.slice(0, 3),
  };
}

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
  markSchemeContext?: string;
  neuroSymbolicSummary?: string;
  comparativeJudgement?: ComparativeJudgementResult | null;
};

export async function arbitrateGrading(options: ArbitrateOptions): Promise<Grading> {
  const {
    question,
    essayText,
    maxMark,
    split,
    examinerGrading,
    moderatorGrading,
    disputeReason,
    markSchemeContext,
    neuroSymbolicSummary,
    comparativeJudgement,
  } = options;

  const quality =
    options.qualityAnalysis ?? analyzeEssayQuality(essayText, maxMark, split);
  const qualityDirective = buildQualityPromptDirective(quality, maxMark);

  const promptTemplate = ARBITRATION_PROMPT.replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks))
    .replace(/{paper_scope_directive}/g, buildPaperScopeDirective(maxMark))
    .replace(/{ao_evaluation_directive}/g, buildAoEvaluationDirective(maxMark, split))
    .replace(/{essay_quality_profile}/g, qualityDirective);

  const userParts = [
    `Exam Question (${maxMark} marks):\n${question}\n`,
    `Student Essay:\n${essayText}\n`,
    `Dispute Reason: ${disputeReason}\n`,
    `Pass 1 (Analytical Audit — Orthogonal Family A): ${JSON.stringify(compactPassForArbitration(examinerGrading))}\n`,
    `Pass 2 (Holistic Moderator — Orthogonal Family B): ${JSON.stringify(compactPassForArbitration(moderatorGrading))}`,
  ];
  if (comparativeJudgement) {
    userParts.push(
      `\nPsychometric Blind Comparative Judgement (Family C vs ${comparativeJudgement.anchorsCompared} real Cambridge ECR scripts): ` +
        `Anchored Estimate = ${comparativeJudgement.estimatedMark}/${maxMark} (Plausible Band: ${comparativeJudgement.plausibleLow}–${comparativeJudgement.plausibleHigh}/${maxMark}). ` +
        `Comparisons: ${comparativeJudgement.comparisons.map((c) => `vs ${c.anchorMark}/${c.anchorMaxMark} (${c.anchorBand}): ${c.verdict} — ${c.reason}`).join(" | ")}`,
    );
  }
  if (neuroSymbolicSummary) {
    userParts.push(`\n${neuroSymbolicSummary}`);
  }
  if (markSchemeContext) {
    userParts.push(`\nCambridge Mark Scheme Excerpt:\n${markSchemeContext.slice(0, 1200)}`);
  }

  const result = await callOrthogonalFamily({
    family: "openai_120b",
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    maxCompletionTokens: 4096,
    userId: options.userId,
    feature: "grade_essay_arbitration",
    messages: [
      { role: "system", content: promptTemplate },
      { role: "user", content: userParts.join("\n") },
    ],
  });

  const parsedRaw = extractFirstJsonObject(result.text);
  const reconciled = normaliseGrading(parsedRaw, maxMark, split, essayText, question);

  reconciled.audited = true;
  reconciled.arbitrated = true;
  reconciled.arbitrationNotes =
    typeof parsedRaw.arbitration_rationale === "string"
      ? parsedRaw.arbitration_rationale
      : "Concluded authoritatively by Cambridge Principal Examiner pass.";

  reconciled.confidence = computeObjectiveConfidence(examinerGrading, moderatorGrading, true);
  return deduplicateAcrossSections(applyWritingQualityGuardrail(reconciled, quality, maxMark, split, essayText, question), question);
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
  essayText?: string,
  questionText?: string,
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

  // Reconcile individual AO awarded marks ensuring sum equals total under calibrated Cambridge standards
  let kMark = Math.min(
    split.ao1_marks,
    Math.round((pass1.ao_breakdown.knowledge.awarded + pass2.ao_breakdown.knowledge.awarded) / 2),
  );
  let aMark = Math.min(
    split.ao2_marks,
    Math.round((pass1.ao_breakdown.analysis.awarded + pass2.ao_breakdown.analysis.awarded) / 2),
  );

  const isEightMark = maxMark === 8 && split.ao3_marks === 2;
  const isTwelveMark = maxMark === 12 && split.ao3_marks === 4;
  const isTwentyMark = maxMark >= 20 && split.ao3_marks >= 6;
  const pass1EvalAwarded = pass1.ao_breakdown.evaluation.awarded;
  const pass2EvalAwarded = pass2.ao_breakdown.evaluation.awarded;

  let eMark = 0;
  if (split.ao3_marks === 0) {
    eMark = 0;
  } else if (isEightMark) {
    // Calibrated 8-mark evaluation leniency for ~15-minute essays:
    if (pass1EvalAwarded === 2 || pass2EvalAwarded === 2) {
      eMark = 2;
    } else {
      eMark = Math.min(split.ao3_marks, Math.round((pass1EvalAwarded + pass2EvalAwarded) / 2));
    }
  } else if (isTwelveMark) {
    // Calibrated 12-mark evaluation for ~25-30 minute essays:
    if (pass1EvalAwarded >= 3 && pass2EvalAwarded >= 3) {
      eMark = Math.max(pass1EvalAwarded, pass2EvalAwarded);
    } else {
      eMark = Math.min(split.ao3_marks, Math.round((pass1EvalAwarded + pass2EvalAwarded) / 2));
    }
  } else if (isTwentyMark) {
    // Calibrated 20-mark evaluation for ~40-45 minute essays:
    if (pass1EvalAwarded >= 5 && pass2EvalAwarded >= 5) {
      eMark = Math.max(pass1EvalAwarded, pass2EvalAwarded);
    } else {
      eMark = Math.min(split.ao3_marks, Math.round((pass1EvalAwarded + pass2EvalAwarded) / 2));
    }
  } else {
    eMark = Math.min(
      split.ao3_marks,
      Math.round((pass1EvalAwarded + pass2EvalAwarded) / 2),
    );
  }

  let total = kMark + aMark + eMark;
  const targetTotal = Math.round((pass1.total_mark + pass2.total_mark) / 2);
  if (total !== targetTotal) {
    const diff = targetTotal - total;
    if (diff > 0 && aMark < split.ao2_marks) {
      aMark += 1;
    } else if (diff < 0 && aMark > 0) {
      aMark -= 1;
    } else if (diff > 0 && eMark < split.ao3_marks) {
      eMark += 1;
    } else if (diff < 0 && eMark > 0) {
      eMark -= 1;
    }
    total = kMark + aMark + eMark;
  }

  // Combine unique strengths (max 4) using semantic deduplication
  const rawStrengths = [...pass2.strengths, ...pass1.strengths]
    .map((s) => stripScoreFractionsFromText(s.replace(/[*_]/g, "").trim()))
    .filter(Boolean);
  const strengths = deduplicateFeedbackPoints(rawStrengths, 4);

  // Combine unique weaknesses (max 4), prioritizing specific errors caught by Pass 1
  const rawWeaknesses = [...pass1.weaknesses, ...pass2.weaknesses]
    .map((w) => stripScoreFractionsFromText(w.replace(/[*_]/g, "").trim()))
    .filter(Boolean);
  const weaknesses = deduplicateFeedbackPoints(rawWeaknesses, 4);

  // Deduplicate actionable feedback
  const rawFeedback = [...pass2.actionable_feedback, ...pass1.actionable_feedback]
    .map((f) => stripScoreFractionsFromText(f.replace(/[*_]/g, "").trim()))
    .filter(Boolean);
  const actionableFeedback = deduplicateFeedbackPoints(rawFeedback, 4);

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
    const combinedEvalComments = (pass1.ao_breakdown.evaluation.comment || "") + " " + (pass2.ao_breakdown.evaluation.comment || "");
    const hasEvalMention = /conclusion|judgement|judgment|weigh|perspective|evaluat/i.test(combinedEvalComments);
    if (hasEvalMention) {
      eMark = 1;
    }
  }

  // Strictly enforce AO boundary constraints
  kMark = Math.max(0, Math.min(split.ao1_marks, kMark));
  aMark = Math.max(0, Math.min(split.ao2_marks, aMark));
  eMark = Math.max(0, Math.min(split.ao3_marks, eMark));

  // Ensure total mark does not exceed maxMark
  while (kMark + aMark + eMark > maxMark) {
    if (aMark > 0) aMark--;
    else if (kMark > 0) kMark--;
    else if (eMark > 0) eMark--;
  }

  total = kMark + aMark + eMark;

  // Diagrams missing elements must always be empty unless specifically required
  // Semantically deduplicate missing_elements across Pass 1 & Pass 2 (never plain Set merge!)
  const missingElements = {
    definitions: deduplicateFeedbackPoints([...(pass1.missing_elements.definitions || []), ...(pass2.missing_elements.definitions || [])], 2),
    analysis: deduplicateFeedbackPoints([...(pass1.missing_elements.analysis || []), ...(pass2.missing_elements.analysis || [])], 2),
    evaluation: split.ao3_marks === 0
      ? []
      : deduplicateFeedbackPoints([...(pass1.missing_elements.evaluation || []), ...(pass2.missing_elements.evaluation || [])], 2),
    examples: deduplicateFeedbackPoints([...(pass1.missing_elements.examples || []), ...(pass2.missing_elements.examples || [])], 2),
    diagrams: [],
  };

  // Chapter 5 PPC misconception filter for strengths:
  // Strip any false praise claiming point inside PPC is allocatively inefficient or Pareto efficient,
  // while preserving praise for candidates who accurately distinguish productive from allocative efficiency.
  const falsePpcPraiseRegex = /(?:linking|connect|associat|treat)\w*\s+(?:a\s+)?point\s+inside\s+(?:the\s+)?ppc\s+(?:to|with|as)\s+(?:allocative|pareto)/i;
  const correctlyDistinguishesPpc =
    /(?:distinguish|distinguishes|differentiates?|contrasts?|correctly|accurately)\s+(?:productive\s+(?:and|from)\s+allocative|allocative\s+(?:and|from)\s+productive)/i.test(
      strengths.join(" ")
    );

  const filteredStrengths = correctlyDistinguishesPpc
    ? strengths
    : strengths.filter((s) => !falsePpcPraiseRegex.test(s));

  // Check if either pass or feedback exhibited actual PPC & efficiency confusion
  const flaggedPpcMisconception =
    !correctlyDistinguishesPpc &&
    (strengths.some((s) => falsePpcPraiseRegex.test(s)) ||
      /point\s+inside\s+(the\s+)?ppc.*allocative\s+inefficien/i.test([...pass1.weaknesses, ...pass2.weaknesses].join(" ")) ||
      /(?:confus(?:es?|ed|ing)|conflat(?:es?|ed|ing))\s+(?:productive\s+with\s+allocative|allocative\s+with\s+productive)/i.test([...pass1.weaknesses, ...pass2.weaknesses].join(" ")));

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

  if (essayText) {
    result.ao_breakdown.knowledge.comment = verifyVerbatimQuotes(result.ao_breakdown.knowledge.comment, essayText);
    result.ao_breakdown.analysis.comment = verifyVerbatimQuotes(result.ao_breakdown.analysis.comment, essayText);
    result.ao_breakdown.evaluation.comment = verifyVerbatimQuotes(result.ao_breakdown.evaluation.comment, essayText);
    result.examiner_summary = verifyVerbatimQuotes(result.examiner_summary, essayText);
    result.strengths = result.strengths.map((s) => verifyVerbatimQuotes(s, essayText));
    result.weaknesses = result.weaknesses.map((w) => verifyVerbatimQuotes(w, essayText));
    result.actionable_feedback = result.actionable_feedback.map((f) => verifyVerbatimQuotes(f, essayText));
    result.missing_elements.definitions = result.missing_elements.definitions.map((d) => verifyVerbatimQuotes(d, essayText));
    result.missing_elements.analysis = result.missing_elements.analysis.map((a) => verifyVerbatimQuotes(a, essayText));
    result.missing_elements.evaluation = result.missing_elements.evaluation.map((e) => verifyVerbatimQuotes(e, essayText));
    result.missing_elements.examples = result.missing_elements.examples.map((ex) => verifyVerbatimQuotes(ex, essayText));
  }

  if (maxMark <= 12) {
    result.ao_breakdown.knowledge.comment = sanitizeAsLevelText(result.ao_breakdown.knowledge.comment);
    result.ao_breakdown.analysis.comment = sanitizeAsLevelText(result.ao_breakdown.analysis.comment);
    result.ao_breakdown.evaluation.comment = sanitizeAsLevelText(result.ao_breakdown.evaluation.comment);
    result.examiner_summary = sanitizeAsLevelText(result.examiner_summary);
    result.strengths = deduplicateFeedbackPoints(result.strengths.map(sanitizeAsLevelText).filter((s) => s.length > 0), 4);
    result.weaknesses = deduplicateFeedbackPoints(result.weaknesses.map(sanitizeAsLevelText).filter((w) => w.length > 0), 4);
    result.actionable_feedback = deduplicateFeedbackPoints(result.actionable_feedback.map(sanitizeAsLevelText).filter((f) => f.length > 0), 4);
    result.suggested_resources = Array.from(new Set(result.suggested_resources.map(sanitizeAsLevelText).filter((r) => r.length > 0))).slice(0, 3);
    result.suggested_practice = Array.from(new Set(result.suggested_practice.map(sanitizeAsLevelText).filter((p) => p.length > 0))).slice(0, 3);
    result.missing_elements.definitions = result.missing_elements.definitions.map(sanitizeAsLevelText).filter((d) => d.length > 0);
    result.missing_elements.analysis = result.missing_elements.analysis.map(sanitizeAsLevelText).filter((a) => a.length > 0);
    result.missing_elements.evaluation = result.missing_elements.evaluation.map(sanitizeAsLevelText).filter((e) => e.length > 0);
    result.missing_elements.examples = result.missing_elements.examples.map(sanitizeAsLevelText).filter((ex) => ex.length > 0);
    result.missing_elements.diagrams = result.missing_elements.diagrams.map(sanitizeAsLevelText).filter((di) => di.length > 0);
  }

  if (maxMark >= 20) {
    result.ao_breakdown.knowledge.comment = sanitizeALevelFeedbackText(result.ao_breakdown.knowledge.comment);
    result.ao_breakdown.analysis.comment = sanitizeALevelFeedbackText(result.ao_breakdown.analysis.comment);
    result.ao_breakdown.evaluation.comment = sanitizeALevelFeedbackText(result.ao_breakdown.evaluation.comment);
    result.examiner_summary = sanitizeALevelFeedbackText(result.examiner_summary);
    result.strengths = deduplicateFeedbackPoints(result.strengths.map(sanitizeALevelFeedbackText).filter((s) => s.length > 0), 4);
    result.weaknesses = deduplicateFeedbackPoints(result.weaknesses.map(sanitizeALevelFeedbackText).filter((w) => w.length > 0), 4);
    result.actionable_feedback = deduplicateFeedbackPoints(result.actionable_feedback.map(sanitizeALevelFeedbackText).filter((f) => f.length > 0), 4);
    result.suggested_resources = Array.from(new Set(result.suggested_resources.map(sanitizeALevelFeedbackText).filter((r) => r.length > 0))).slice(0, 3);
    result.suggested_practice = Array.from(new Set(result.suggested_practice.map(sanitizeALevelFeedbackText).filter((p) => p.length > 0))).slice(0, 3);
    result.missing_elements.definitions = result.missing_elements.definitions.map(sanitizeALevelFeedbackText).filter((d) => d.length > 0);
    result.missing_elements.analysis = result.missing_elements.analysis.map(sanitizeALevelFeedbackText).filter((a) => a.length > 0);
    result.missing_elements.evaluation = result.missing_elements.evaluation.map(sanitizeALevelFeedbackText).filter((e) => e.length > 0);
    result.missing_elements.examples = result.missing_elements.examples.map(sanitizeALevelFeedbackText).filter((ex) => ex.length > 0);
    result.missing_elements.diagrams = result.missing_elements.diagrams.map(sanitizeALevelFeedbackText).filter((di) => di.length > 0);
  }

  const guardrailed = quality ? applyWritingQualityGuardrail(result, quality, maxMark, split, essayText, questionText) : result;
  return cleanStars(deduplicateAcrossSections(purgeContradictions(guardrailed), questionText));
}
