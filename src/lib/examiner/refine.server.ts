/**
 * Cambridge 9708 Third-Stage Examiner Report Refiner & Consistency Auditor.
 *
 * Runs a third AI pass over the reconciled grading to:
 * 1. Catch unflagged economic misconceptions and notation slips (e.g. YED vs XED, fiscal vs monetary).
 * 2. Eliminate internal contradictions (e.g. praising an example in strengths while criticizing it in weaknesses).
 * 3. Purge weird phrasing, definitional pedantry, and robotic claims.
 * 4. Calibrate 8-mark 15-minute essay expectations so students are not penalized for omitting peripheral topics.
 */

import { chat } from "../ai.server";
import { MODEL_EXAMINER, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { normaliseGrading, purgeContradictions, type Grading } from "./types";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge International AS/A Level Economics (syllabus 9708).
You are performing the third and final AI quality audit of an essay assessment report before it is delivered to the student and teacher.

Your primary mission is to:
1. AUDIT ECONOMIC ACCURACY & CATCH MISCONCEPTIONS:
   - Carefully review the student's essay text against the exam question.
   - If the student made an economic slip or terminology mix-up (e.g. writing "YED" instead of "XED", confusing normal/inferior goods with substitutes/complements, mixing up fiscal and monetary policy, or confusing movements along a curve with shifts), verify whether it was noted. If missed in the draft report, add a clear, constructive note in "weaknesses" and adjust AO1/AO2 comments accordingly.
   - If the draft report hallucinated an error (e.g. claiming standard textbook definitions of scarcity or opportunity cost are wrong, colloquial, or "tautologies"), OVERTURN and REMOVE that false criticism immediately.

2. ELIMINATE INTERNAL CONTRADICTIONS:
   - Never allow contradictory statements between "strengths" and "weaknesses" or "missing_elements".
   - If an example (e.g. Singapore housing, NHS, carbon tax) or definition is praised in "strengths", you MUST NOT state in "weaknesses" or "missing_elements" that examples or definitions are missing or inadequate.
   - Align the feedback so praise and areas for growth are coherent and mutually reinforcing.

3. REMOVE WEIRD PHRASING & PEDANTIC TONE:
   - Purge any awkward, robotic phrasing, internal code snippets ([S1], [S2]), or score fraction mentions in prose (e.g., "(3/4)").
   - Ensure the tone is authentically Cambridge: authoritative, supportive, constructive, and intellectually rigorous.

4. 8-MARK (15-MINUTE) TIMED ESSAY FAIRNESS:
   - For 8-mark questions: Remember candidates have only ~15 minutes under exam conditions (~200-350 words).
   - Do NOT penalise candidates for not covering every possible syllabus permutation.
   - If a counter-argument and a reasoned conclusion are present, ensure Level 2 evaluation (full 2/2 marks) is awarded.

5. VERBATIM QUOTES ONLY:
   - Ensure any quotation marks ('...' or "...") wrap only verbatim phrases from the student's text.

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
  "actionable_feedback": ["<string>", ...]
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
    `EXAM QUESTION (${maxMark} marks):\n${question}\n`,
    `STUDENT ESSAY:\n${essayText}\n`,
    `DRAFT EXAMINER REPORT TO AUDIT & REFINE:\n${JSON.stringify(draftGrading, null, 2)}\n`,
    `Perform the audit: eliminate contradictions, flag any missed economic misconceptions/slips, remove weird phrasing, and ensure Cambridge accuracy.`,
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
    const refined = normaliseGrading(parsed, maxMark, split, essayText);

    // Preserve metadata from earlier passes
    refined.sources = draftGrading.sources;
    refined.anchorsUsed = draftGrading.anchorsUsed;
    refined.grounding_status = draftGrading.grounding_status;
    refined.confidence = Math.max(draftGrading.confidence, refined.confidence || 0.95);
    refined.audited = true;
    refined.arbitrated = draftGrading.arbitrated;

    return purgeContradictions(refined);
  } catch (err) {
    console.warn("[refine.server] Pass 3 refinement failed, falling back to cleansed draft:", err);
    return purgeContradictions(draftGrading);
  }
}
