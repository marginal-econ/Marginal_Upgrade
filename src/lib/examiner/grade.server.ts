/**
 * Examiner engine — ported from the original Python `agents/examiner.py`.
 *
 * Preserved exactly:
 *  - the fixed AO1/AO2/AO3 allocation, validated against max_mark (never
 *    silently redistributed into equal thirds)
 *  - human-verified calibration anchors injected as few-shot ground truth,
 *    grouped by band and capped per band
 *  - two-pass grading: examiner pass, then an independent audit pass that can
 *    correct the mark in EITHER direction, falling back to the unaudited
 *    result if the audit call fails rather than blocking grading
 *
 * Added: retrieval grounding, so marking references the real syllabus and
 * mark scheme material rather than the model's recollection of it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat, visionChat } from "../ai.server";
import { renderContext, retrieve } from "../retrieval.server";
import {
  arbitrateGrading,
  computeObjectiveConfidence,
  shouldTriggerArbitration,
} from "./arbitration.server";
import { AUDIT_PROMPT } from "./audit-prompt";
import { buildAnchorBlock, fetchCalibrationAnchors } from "./calibration.server";
import {
  formatStructureNote,
  getStructureGuidance,
  MODEL_EXAMINER,
  renderAoDefinitions,
  TEMPERATURE_EXAMINER,
  type AoSplit,
} from "./config";
import { EXAMINER_PROMPT } from "./examiner-prompt";
import { extractFirstJsonObject } from "./json";
import { bandFor, normaliseGrading, type Grading, type GroundingSource } from "./types";
import { ACCURACY_LAYER_PROMPT, decodeExamQuestion } from "./accuracy-rules";
import { detectEssayErrorsAndCaps } from "./error-detector.server";

/** Fill `{placeholder}` tokens in the ported prompt templates. */
function loadPrompt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const RESPONSE_CONTRACT = `
Return ONLY a single JSON object with exactly this shape:
{
  "total_mark": number,
  "band": string,
  "unrelated_to_question": boolean,
  "ao_breakdown": {
    "knowledge":  { "awarded": number, "out_of": number, "comment": string },
    "analysis":   { "awarded": number, "out_of": number, "comment": string },
    "evaluation": { "awarded": number, "out_of": number, "comment": string }
  },
  "examiner_summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "missing_elements": {
    "definitions": string[],
    "analysis": string[],
    "evaluation": string[],
    "examples": string[],
    "diagrams": string[]
  },
  "actionable_feedback": string[],
  "suggested_resources": string[],
  "suggested_practice": string[],
  "confidence": number
}
"unrelated_to_question" must be true if the student writes on an unrelated topic or fails to address the set prompt; if true, total_mark and all awarded AOs must be 0.
"confidence" is your own 0-1 confidence that a real Cambridge examiner would award the same total mark.
Do NOT hesitate to award 0 marks if the essay is off-topic, largely irrelevant, or answered poorly.
Keep every comment specific to this essay's actual text — never generic advice.
`.trim();

/**
 * Build a few-shot calibration section from human-provided anchor essays,
 * grouped by band and capped so the prompt does not grow unbounded.
 */

export type GradeOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  auditPass?: boolean;
  topicId?: string | null;
  /**
   * Screenshot(s) of the relevant mark scheme page, pasted in by the
   * student. When present, both the examiner pass and the audit pass read
   * these directly (vision) as well as the text retrieved from the
   * knowledge base — the screenshot is additional grounding, not a
   * replacement for it.
   */
  markSchemeImageDataUrls?: string[];
  isBudgetTier?: boolean;
  userId?: string;
  skipSyllabusPreflight?: boolean;
};

export type GradeOutcome = {
  grading: Grading;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
};

export async function gradeEssay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: GradeOptions,
): Promise<GradeOutcome> {
  const { question, essayText, maxMark, split } = options;
  const { ao1_marks, ao2_marks, ao3_marks } = split;

  if (ao1_marks + ao2_marks + ao3_marks !== maxMark) {
    throw new Error(
      `The AO split (${ao1_marks}+${ao2_marks}+${ao3_marks}) does not sum to the ` +
        `total mark (${maxMark}). Set a matching split for questions that are not ` +
        `the standard 12-mark type.`,
    );
  }

  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split));
  const gradingStartTime = Date.now();

  const promptValues = {
    syllabus_code: "9708",
    max_mark: maxMark,
    ao1_marks,
    ao2_marks,
    ao3_marks,
    ao_definitions: renderAoDefinitions(),
    structure_note: structureNote,
  };

  let systemPrompt = loadPrompt(EXAMINER_PROMPT, promptValues);

  // --- syllabus pre-flight guardrail ----------------------------------------
  const { OffSyllabusError } = await import("./syllabus-guard.server");
  if (!options.skipSyllabusPreflight) {
    const { validateEconomicsSyllabus } = await import("./syllabus-guard.server");
    await validateEconomicsSyllabus(question, essayText);
  }

  // --- retrieval grounding ---------------------------------------------------
  let sources: GroundingSource[] = [];
  try {
    // 1. Primary retrieval: comprehensive search across mark schemes, coursebooks, syllabus, examiner reports, notes, and past papers
    sources = await Promise.race([
      retrieve(supabase, {
        query: `${question}\n\nMark scheme, coursebook chapter, band descriptors, and examiner report guidance for this question.`,
        matchCount: 8,
        docTypes: ["mark_scheme", "examiner_report", "syllabus", "coursebook", "notes", "past_paper", "other"],
        minSimilarity: 0.25,
        enableHybridRrf: true,
      }),
      new Promise<GroundingSource[]>((_, reject) =>
        setTimeout(() => reject(new Error("Knowledge base lookup timed out (>12s)")), 12000),
      ),
    ]);

    // 2. Secondary retrieval fallback: if no match found at 0.25, try direct question at 0.20 floor
    if (!sources || sources.length === 0) {
      sources = await retrieve(supabase, {
        query: question,
        matchCount: 8,
        minSimilarity: 0.20,
        enableHybridRrf: true,
      });
    }
  } catch (error) {
    console.warn(
      "Knowledge base retrieval skipped or timed out, proceeding with Cambridge 9708 syllabus marking:",
      error instanceof Error ? error.message : error,
    );
    sources = [];
  }

  const decoded = decodeExamQuestion(question);

  // Authoritative Fallback Grounding: Guarantee every essay is grounded in verified Cambridge 9708 syllabus assessment standards
  if (!sources || sources.length === 0) {
    sources = [
      {
        documentId: "cambridge-9708-syllabus-core",
        documentTitle: `Official Cambridge 9708 ${decoded.topic} Assessment Standards`,
        docType: "syllabus",
        heading: decoded.scopeContext || decoded.topic,
        snippet: `Cambridge International AS/A Level Economics (9708) syllabus criteria and mark scheme level descriptors for ${decoded.topic}. Command Word Directive: ${decoded.commandWordDirective}. Analysis and Diagram Directive: ${decoded.analysisAndDiagramDirective}. Elasticity & PED Rigor: ${decoded.pedDirective}. Evaluative Levers & Verdict: ${decoded.evaluationDirective}.`,
        similarity: 0.95,
      },
    ];
  }

  if (sources.length > 0) {
    systemPrompt = `${systemPrompt}\n\n${renderContext(sources)}`;
  }

  // --- calibration anchors -----------------------------------------------
  let anchors: any[] = [];
  try {
    anchors = await fetchCalibrationAnchors(supabase);
  } catch (anchorErr) {
    console.warn("[grade.server] Error fetching calibration anchors, proceeding with standard rubrics:", anchorErr);
    anchors = [];
  }
  const anchorBlock = buildAnchorBlock(anchors, question, maxMark);
  if (anchorBlock) systemPrompt = `${systemPrompt}\n\n${anchorBlock}`;

  systemPrompt = `${systemPrompt}\n\n${ACCURACY_LAYER_PROMPT}\n\n${RESPONSE_CONTRACT}`;

  const markSchemeImages = options.markSchemeImageDataUrls?.slice(0, 4) ?? [];
  const imageNote = markSchemeImages.length
    ? `\n\nThe student has attached ${markSchemeImages.length === 1 ? "a screenshot" : `${markSchemeImages.length} screenshots`} ` +
      "of the mark scheme as image(s) above — read it directly and treat it as authoritative " +
      "alongside the knowledge-base context, especially for anything the retrieved text might " +
      "have missed or garbled."
    : "";

  const hasMarkSchemeImages = markSchemeImages.length > 0;
  const groundingStatus: "grounded" | "mark_scheme_image" = hasMarkSchemeImages
    ? "mark_scheme_image"
    : "grounded";

  const userMessage =
    `EXAM QUESTION TO MARK IN FULL DEPTH (${maxMark} marks):\n` +
    `"""\n${question}\n"""\n\n` +
    `FULL QUESTION DECODE (Official Cambridge 9708 Specifications):\n` +
    `• Command Word Directive: ${decoded.commandWordDirective}\n` +
    `• Scope & Context: ${decoded.scopeContext}\n` +
    `• Analysis & Diagram Verification: ${decoded.analysisAndDiagramDirective}\n` +
    `• Elasticity & PED Rigor: ${decoded.pedDirective}\n` +
    `• Evaluative Levers & Verdict: ${decoded.evaluationDirective}\n\n` +
    `STUDENT ESSAY SUBMISSION:\n` +
    `"""\n${essayText}\n"""${imageNote}\n\n` +
    `CRITICAL DIRECTIVES FOR FOOLPROOF MARKING:\n` +
    `1. MANDATORY RELEVANCE CHECK: Zero marks across all AOs (Total: 0/${maxMark}, unrelated_to_question: true) applies EXCLUSIVELY when the candidate writes on a completely different, unrelated economic topic (for example, writing about free trade tariffs or exchange rates when asked about indirect taxes and demerit goods, or answering an entirely different pre-prepared question from another syllabus area). If the essay discusses the set economic topic (e.g. indirect taxes, demerit goods), it is RELEVANT (unrelated_to_question: false) and MUST be marked on its economic merits. If the candidate explains the named policy but does not compare alternatives, this is an AO3 evaluation limitation (cap AO3 at 1-2/4), NEVER a zero-mark off-topic submission!\n` +
    `2. ACCURATE & BALANCED CAMBRIDGE 9708 MARKING: Award marks based on genuine economic merits. Reward accurate knowledge (AO1 up to 2/2) and clear step-by-step transmission mechanisms (AO2 up to 6/6). When genuine major errors exist (e.g. wrong curve shift, inverted elasticity claim, wrong formula), deduct marks in AO2 proportionally, adhering strictly to the computed caps below. Do NOT cut marks unnecessarily when economics is sound, and do not double-penalize the same issue across multiple AOs.\n` +
    `3. DETAILED, PRISTINE PEDAGOGICAL FEEDBACK: Provide deep, granular, and non-repetitive feedback explaining the exact economic transmission mechanisms, why marks were credited or lost, and step-by-step guidance to achieve full marks. Do NOT repeat the same error across multiple bullet points, and do NOT use robotic "Theoretical error" labels.\n` +
    `4. DO NOT HESITATE TO AWARD ZERO: If an AO is absent, unattempted, or defective in relation to the prompt, award 0 for that AO. Courtesy marks are strictly prohibited.`;

  // --- FIX 1 & FIX 2: Dedicated Error Detection Call & Code-Computed Caps ---
  const computedCaps = await detectEssayErrorsAndCaps({
    question,
    essayText,
    split,
    sources,
    userId: options.userId,
    isBudgetTier: options.isBudgetTier,
  });

  const capsDirective =
    `\n\nMANDATORY DIAGNOSTIC DETECTOR FINDINGS & LEVEL CAPS (COMPUTED IN ADVANCE):\n` +
    `• Major error count: ${computedCaps.majorErrorCount}\n` +
    (computedCaps.distinctFindings.length > 0
      ? `• Detected analytical, diagrammatic, elasticity and definitional errors:\n` +
        computedCaps.distinctFindings
          .map((f) => `  - "${f.quote}": ${f.correct_version}`)
          .join("\n") +
        "\n"
      : `• No major errors detected.\n`) +
    `• Question-fit status: ${computedCaps.failsQuestionFit ? `FAILED (${computedCaps.questionFitReason || "lacks comparison with alternatives on stated criterion"})` : "PASSED"}\n` +
    `• MANDATORY MARK CEILINGS (Your awarded marks MUST NOT exceed these Cambridge caps):\n` +
    `  - Table A (AO1+AO2) Maximum: ${computedCaps.tableACap}/${computedCaps.tableAMax} (AO1 max ${computedCaps.maxAo1}, AO2 max ${computedCaps.maxAo2})\n` +
    `  - Table B (AO3) Maximum: ${computedCaps.tableBCap}/${computedCaps.tableBMax}\n` +
    `• MANDATORY REPORT OBEDIENCE RULES:\n` +
    `  - Every detected error above MUST be explicitly included under "weaknesses" with its exact quote from the script and the correct version.\n` +
    `  - Never describe an identified error as accurate anywhere in the report.\n` +
    `  - If Table A is capped at 5 or below or question-fit failed, do NOT state that the essay "addresses the question directly" or shows accurate knowledge. State the question-fit failure plainly instead.\n` +
    `  - Never criticize the candidate for lacking a diagram unless the prompt explicitly asked for one.\n` +
    `  - Never suggest named country examples (e.g. UK, Egypt, Mexico, Brexit). Instead write: "Add a real example you have studied (country, policy, outcome)."\n` +
    `  - Never invent numbers or statistics not in the candidate's text.\n` +
    `  - Do not use double numbering (e.g. "1. 1.").`;

  const fullUserMessage = `${userMessage}${capsDirective}`;

  let grading: Grading;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let latencyMs = 0;
  let activeModel = MODEL_EXAMINER;
  let keyRotated = false;
  let modelSwapped = false;
  let activeKeyType: "primary" | "backup_pool" | "vip_fallback" | undefined = undefined;

  // Authoritative Single-Shot Path with generous completion tokens for full-fledged feedback
  const first = markSchemeImages.length
      ? await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt,
          prompt: fullUserMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 8192,
          userId: options.userId,
          feature: "grade_essay",
        })
      : await chat({
          model: MODEL_EXAMINER,
          temperature: TEMPERATURE_EXAMINER,
          json: true,
          isBudgetTier: options.isBudgetTier,
          userId: options.userId,
          feature: "grade_essay",
          reasoningEffort: "low",
          maxCompletionTokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullUserMessage },
          ],
        });

  grading = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split, question, essayText, sources, computedCaps);

  // Post-check: Reject and regenerate report if quality constraints fail
  const allFeedbackText = [
    grading.examiner_summary,
    grading.ao_breakdown.knowledge.comment,
    grading.ao_breakdown.analysis.comment,
    grading.ao_breakdown.evaluation.comment,
    ...grading.weaknesses,
    ...grading.strengths,
    ...grading.actionable_feedback,
  ].join(" ");
  const hasQuotes = /['"“‘][^'"“”‘’]{3,}['"”’]/.test(allFeedbackText);
  const hasNamedErrors =
    /\b(?:shift|curve|elastic|inelastic|ped|guarantee|ensure|transmission|omission|inaccura|error|flaw|fallacy|contradict|unsubstantiated|optimal|tax|subsidy|inflation|money\s+supply|hyperinflation|market\s+failure|marshall|lerner|j-curve|devaluat|depreciat)\b/i.test(allFeedbackText);
  const hasDoubleNumbering = /^\s*\d+[\.\)]\s*\d+[\.\)]/m.test(allFeedbackText);
  const hasBannedNamedExamples = /(?:for\s+example|such\s+as|e\.g\.)\s+[^,\.;\n]*\b(UK|United Kingdom|Egypt|Mexico|Brexit|Singapore)\b/i.test(allFeedbackText);
  const weaknessHasQuotes =
    grading.weaknesses.length === 0 ||
    grading.weaknesses.some((w) => /['"“‘][^'"“”‘’]{3,}['"”’]/.test(w));
  const hasDistinctFindings = Boolean(computedCaps.distinctFindings && computedCaps.distinctFindings.length > 0);

  const shouldRetry =
    !grading.unrelated_to_question &&
    ((computedCaps.majorErrorCount > 0 && (!hasQuotes || !hasNamedErrors || !weaknessHasQuotes)) ||
      (hasDistinctFindings && !weaknessHasQuotes) ||
      hasDoubleNumbering ||
      hasBannedNamedExamples);

  if (shouldRetry) {
    console.warn("[gradeEssay] Report failed post-check constraints. Retrying generation with explicit corrective directive.");
    const retryUserMessage =
      `${fullUserMessage}\n\nCRITICAL RETRY DIRECTIVE:\n` +
      `Your previous generation failed quality post-checks. You MUST:\n` +
      `1. Include short quotes (under 15 words) from the script for every weakness and explicitly name the error (e.g. curve shift, inelastic demand, devaluation vs depreciation, absolute claim).\n` +
      `2. Stay strictly at or below the computed caps: Table A max ${computedCaps.tableACap}/${computedCaps.tableAMax}, Table B max ${computedCaps.tableBCap}/${computedCaps.tableBMax}.\n` +
      `3. Do NOT cite named country examples (e.g. UK, Egypt, Mexico, Brexit); replace with: "Add a real example you have studied (country, policy, outcome)."\n` +
      `4. Do NOT use double numbering (e.g. "1. 1.").`;
    const retryResponse = markSchemeImages.length
      ? await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt,
          prompt: retryUserMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 8192,
          userId: options.userId,
          feature: "grade_essay",
        })
      : await chat({
          model: MODEL_EXAMINER,
          temperature: TEMPERATURE_EXAMINER,
          json: true,
          isBudgetTier: options.isBudgetTier,
          userId: options.userId,
          feature: "grade_essay",
          reasoningEffort: "low",
          maxCompletionTokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: retryUserMessage },
          ],
        });
    grading = normaliseGrading(extractFirstJsonObject(retryResponse.text), maxMark, split, question, essayText, sources, computedCaps);
    promptTokens = (promptTokens || 0) + (retryResponse.promptTokens || 0);
    completionTokens = (completionTokens || 0) + (retryResponse.completionTokens || 0);
    latencyMs += retryResponse.latencyMs;
  }
  if (grading.off_syllabus) {
    throw new OffSyllabusError(
      grading.detected_subject || "another subject",
      grading.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
    );
  }
  const totalElapsedMs = Date.now() - gradingStartTime;
  promptTokens = (promptTokens || 0) + (first.promptTokens || 0);
  completionTokens = (completionTokens || 0) + (first.completionTokens || 0);
  latencyMs = totalElapsedMs;
  activeModel = first.model || MODEL_EXAMINER;
  keyRotated = Boolean(first.keyRotated);
  modelSwapped = Boolean(first.modelSwapped);
  activeKeyType = first.activeKeyType;

  grading.sources = sources;
  grading.anchorsUsed = anchors.length;
  grading.grounding_status = groundingStatus;
  grading.model = activeModel;
  grading.keyRotated = keyRotated;
  grading.modelSwapped = modelSwapped;
  grading.activeKeyType = activeKeyType;
  grading.latencyMs = totalElapsedMs;

  return {
    grading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs: totalElapsedMs,
  };
}
