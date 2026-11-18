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
import { chat } from "../ai.server";
import {
  buildAoEvaluationDirective,
  buildPaperScopeDirective,
  MODEL_EXAMINER,
  type AoSplit,
} from "./config";
import { extractFirstJsonObject } from "./json";
import {
  deduplicateAcrossSections,
  normaliseGrading,
  purgeContradictions,
  type Grading,
} from "./types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "./writing-quality.server";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge International AS & A Level Economics (syllabus 9708) conducting the final accuracy and quality audit before delivering the report to the student.

FIXED AO ALLOCATION ({max_mark} marks):
- AO1 Knowledge: {ao1_marks} | AO2 Analysis: {ao2_marks} | AO3 Evaluation: {ao3_marks}

{paper_scope_directive}

{ao_evaluation_directive}

YOUR FIVE MANDATORY AUDIT TASKS:
1. ECONOMIC ACCURACY & FALSE-PRAISE AUDIT:
   - Verify every economic claim in BOTH the student's essay AND the draft "strengths" / "weaknesses".
   - CATCH & CORRECT FALSE PRAISE: If the draft praises an economically false claim — e.g. claiming profit-maximising firms "overproduce to gain more profits" (in reality profit-maximising firms with market power RESTRICT output / underproduce where MR = MC so P > MC; overproduction arises from negative externalities where MSC > MPC), claiming subsidies guarantee productive efficiency, or linking a point inside the PPC to allocative inefficiency — REMOVE that false praise, flag the error clearly in "weaknesses", and adjust AO1/AO2 marks to the true Cambridge level.
   - OVERTURN HALLUCINATED ERRORS: If the draft wrongly penalised valid A-Level theory on a 20-mark Paper 4 essay (e.g. equi-marginal principle, indifference curves, MRPL, game theory), wrongly penalised standard textbook scarcity definitions, or wrongly called a 2024–2026 example date "a future date / factually incorrect" (the current year is 2026), OVERTURN and REMOVE that false weakness immediately and restore the earned marks!
   - STRICT CALIBRATION: Check that AO1, AO2, and AO3 marks accurately fit official Cambridge descriptors above (for 20m Paper 4: Table A AO1+AO2 out of 14 and Table B AO3 out of 6; do NOT artificially undermark strong pure-theory 20m scripts that use rigorous diagrams/matrices, and do NOT inflate scripts with conceptual errors or shallow evaluation).

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
  const { question, essayText, maxMark, split, draftGrading, userId, markSchemeContext } = options;

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

  userParts.push(
    `DRAFT EXAMINER REPORT TO AUDIT & REFINE:\n${JSON.stringify(compactDraftForRefiner(draftGrading))}\n`,
    `Audit economic accuracy (including catching any false praise or hallucinated errors), verify marks against the Cambridge level descriptors, eliminate ALL repetition within and across sections, and return clean JSON.`,
  );

  try {
    const result = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
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
