/**
 * Cambridge 9708 Third-Stage Examiner Report Refiner & Consistency Auditor.
 *
 * Runs a third AI pass over the reconciled grading across all tariffs (8m, 12m, 20m) to:
 * 1. Catch unflagged economic misconceptions and notation slips (e.g. YED vs XED, fiscal vs monetary,
 *    substitutes vs complements, PPC productive vs allocative efficiency).
 * 2. Eliminate internal contradictions (e.g. praising an example in strengths while criticizing it in weaknesses).
 * 3. Purge weird phrasing, definitional pedantry, and robotic claims.
 * 4. Calibrate timed exam expectations across 8-mark (~15 min), 12-mark (~25-30 min), and 20-mark (~40-45 min)
 *    essays so candidates are rewarded for what is written well without penalizing for omitting secondary topics.
 */

import { cleanStars } from "@/lib/utils";
import { chat } from "../ai.server";
import { MODEL_EXAMINER, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { normaliseGrading, purgeContradictions, type Grading } from "./types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "./writing-quality.server";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge International AS/A Level Economics (syllabus 9708).
You are performing the third and final AI quality audit of an essay assessment report before it is delivered to the student and teacher.
STRICT PLAIN TEXT DIRECTIVE: NEVER use markdown asterisks (*, **, or ***) anywhere in your output. Return clean plain text only.

Your primary mission is to:
1. AUDIT ECONOMIC ACCURACY & CATCH MISCONCEPTIONS ACROSS ALL CHAPTERS:
   - Carefully review the student's essay text against the exam question.
   - ANTI-HALLUCINATION & PROTECTION OF SOUND ESSAYS:
     * NEVER invent errors or penalize students for sound explanations. If the student accurately distinguished productive efficiency on the PPC from allocative efficiency, accurately traced supply/demand shifts, or defined scarcity correctly, NEVER add a false weakness or penalize marks.
     * Only flag a misconception or error if you can verify an explicit economic falsehood in the student's text.
   - If the student made an explicit economic slip or terminology mix-up (e.g. writing "YED" instead of "XED", confusing normal/inferior goods with substitutes/complements, mixing up fiscal and monetary policy, confusing movements along a curve with shifts, or confusing productive with allocative inefficiency on a PPC), verify whether it was noted. If missed in the draft report, add a clear, constructive note in "weaknesses" and adjust AO1/AO2 comments accordingly.
   - If the draft report hallucinated an error (e.g. claiming standard textbook definitions of scarcity or opportunity cost are wrong, colloquial, or "tautologies"), OVERTURN and REMOVE that false criticism immediately.
   - STRICT AS LEVEL (PAPER 2) VS A LEVEL (PAPER 4) BOUNDARY: For 8-mark and 12-mark questions (Paper 2 AS Level), PURGE any mentions or demands of A-Level content (marginal utility, diminishing returns, indifference curves, market structures like monopoly/oligopoly, MRPL, dynamic efficiency). Never penalise an AS student for omitting A-Level theories.

2. ELIMINATE ALL INTERNAL CONTRADICTIONS:
   - Never allow contradictory statements between "strengths" and "weaknesses" or "missing_elements".
   - If an example (e.g. Singapore housing, NHS, carbon tax, minimum wage), definition, diagram, or argument is praised in "strengths", you MUST NOT state in "weaknesses" or "missing_elements" that examples or definitions are missing, inadequate, or uncredited.
   - Align the feedback so praise and areas for growth are coherent, accurate, and mutually reinforcing.

3. REMOVE WEIRD PHRASING, SCORE FRACTIONS & DATABASE CODES:
   - Purge any awkward, robotic phrasing, internal code snippets ([S1], [S2], (as per [S1]), (see [S2], [S4])), or score fraction mentions in prose (e.g., "(3/4)", "held at 7", "cost you marks").
   - Ensure the tone is authentically Cambridge: authoritative, supportive, constructive, and intellectually rigorous.

4. TARIFF-SPECIFIC TIMED EXAM CALIBRATION & FAIRNESS:
   - High school students write essays under timed exam conditions. A student cannot write everything. Don't expect encyclopedic coverage or penalise for omitting secondary/peripheral topics when the core mechanisms are well addressed. What is written should be accurate, coherent, and good.
   - For 8-mark questions (~15 min, ~200-350 words):
     * Do NOT penalise candidates for omitting secondary syllabus topics.
     * If a counter-argument and a reasoned conclusion directly address the prompt, ensure Level 2 evaluation (full 2/2 marks) and top band (up to 8/8) are awarded.
   - For 12-mark questions (~25-30 min, ~350-550 words):
     * The standard is higher than an 8-marker, but the grading must NOT be overly strict.
     * Do NOT penalise candidates for not covering every possible policy or consequence.
     * If the student develops 2-3 clear causal analysis points with real-world application and provides balanced evaluation with a reasoned conclusion, award Top Band (10-12/12, with 3-4/4 in AO3).
   - For 20-mark questions (~40-45 min, ~550-800+ words):
     * The standard is the highest on Paper 4, but ensure it is realistic and NOT an impossible academic standard. High school exam essay, not an academic journal.
     * If the candidate develops thorough multi-perspective causal chains with real-world application, weighs trade-offs (e.g. short-run vs long-run or prioritized factors), and provides a substantiated overall verdict, award Top Band (16-20/20, with 5-6/6 in AO3).

5. VERBATIM QUOTES ONLY:
   - Ensure any quotation marks ('...' or "...") wrap only verbatim phrases from the student's text.

6. SYLLABUS RESOURCES & TOPIC-ALIGNED PRACTICE:
   - "suggested_resources": Cite the exact relevant Cambridge 9708 chapter (e.g. "Cambridge 9708 Chapter 8: Price elasticity of demand and supply", "Cambridge 9708 Chapter 1: Scarcity, choice and opportunity cost"). NEVER use generic placeholders like "Relevant Chapter on Core Theory & Policy Instruments".
   - "suggested_practice": Every practice bullet MUST stay strictly on the question's specific economic topic (e.g. for an XED/PED question, focus strictly on elasticity or pricing; NEVER drift into unrelated policy intervention, government failure, or consumer/producer surplus unless the question was specifically about policy).

Respond ONLY with a single valid JSON object, no markdown fences, matching the schema:
{
  "total_mark": <integer, sum of awarded marks below>,
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
    "definitions": ["<string>"],
    "analysis": ["<string>"],
    "evaluation": ["<string>"],
    "examples": ["<string>"],
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
};

export async function refineExaminerReport(options: RefineReportOptions): Promise<Grading> {
  const { question, essayText, maxMark, split, draftGrading, userId } = options;

  const promptTemplate = REPORT_REFINER_PROMPT
    .replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks));

  const userMessage = [
    `EXAM QUESTION (${maxMark} marks, AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):\n${question}\n`,
    `STUDENT ESSAY:\n${essayText}\n`,
    `DRAFT EXAMINER REPORT TO AUDIT & REFINE:\n${JSON.stringify(draftGrading, null, 2)}\n`,
    `Perform the audit: eliminate contradictions, flag any missed economic misconceptions/slips (e.g. YED vs XED, curve movements vs shifts), remove weird phrasing, and ensure fair, realistic Cambridge accuracy for this ${maxMark}-mark essay.`,
  ].join("\n");

  try {
    const result = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      userId,
      feature: "grade_essay_pass3_refiner",
      messages: [
        { role: "system", content: promptTemplate },
        { role: "user", content: userMessage },
      ],
    });

    const parsed = extractFirstJsonObject(result.text);
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) {
      console.warn("[refine.server] Refiner returned empty or invalid JSON, preserving draft grading.");
      return purgeContradictions(draftGrading);
    }

    let refined = normaliseGrading(parsed, maxMark, split, essayText);

    // Apply writing quality & economic mechanics guardrail directly to the refined report
    const quality = analyzeEssayQuality(essayText, maxMark, split);
    refined = applyWritingQualityGuardrail(refined, quality, maxMark, split, essayText);

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

    return cleanStars(purgeContradictions(refined));
  } catch (err) {
    console.warn("[refine.server] Pass 3 refinement failed, falling back to cleansed draft:", err);
    return cleanStars(purgeContradictions(draftGrading));
  }
}
