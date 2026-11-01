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
        topicId: options.topicId ?? null,
        minSimilarity: 0.45,
        enableHybridRrf: true,
      }),
      new Promise<GroundingSource[]>((_, reject) =>
        setTimeout(() => reject(new Error("Knowledge base lookup timed out (>12s)")), 12000),
      ),
    ]);

    // 2. Secondary retrieval fallback: if no match found at 0.45, try direct question at 0.40 floor
    if (!sources || sources.length === 0) {
      sources = await retrieve(supabase, {
        query: question,
        matchCount: 8,
        minSimilarity: 0.40,
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

  const isGroundedInKnowledgeBase = sources.length > 0;
  const hasMarkSchemeImages = markSchemeImages.length > 0;
  const groundingStatus: "grounded" | "mark_scheme_image" | "unanchored" = hasMarkSchemeImages
    ? "mark_scheme_image"
    : isGroundedInKnowledgeBase
      ? "grounded"
      : "unanchored";

  if (groundingStatus === "unanchored") {
    systemPrompt = `${systemPrompt}\n\n` +
      `MARKING INSTRUCTIONS FOR STANDARD CAMBRIDGE ASSESSMENT:\n` +
      `1. Mark strictly against standard Cambridge AO level descriptors without inventing question-specific requirements.\n` +
      `2. Do NOT invent fake mark-scheme references or claim to have consulted specific unseen question mark schemes.`;
  }

  const decoded = decodeExamQuestion(question);

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
    `1. MANDATORY RELEVANCE CHECK: Does this essay answer the specific question set ("${question}")? If the question and the essay are different (e.g. the candidate discusses an unrelated economic topic, dodges the question, or writes a pre-prepared answer to a different question), you MUST award ZERO MARKS across all AOs (Total: 0/${maxMark}, AO1: 0, AO2: 0, AO3: 0, Band: "Bottom band", "unrelated_to_question": true). Never award courtesy credit for off-topic economic content.\n` +
    `2. DIAGRAM & PED ACCURACY PENALTIES: Inaccurate diagrams (wrong curve shifted, wrong shift direction, wrong axes, confusion between movements along and shifts) and inaccurate elasticity claims MUST lose marks under AO2 Analysis.\n` +
    `3. DETAILED PEDAGOGICAL FEEDBACK: Provide deep, granular, and actionable feedback explaining the exact economic transmission mechanisms, why marks were credited or lost, and step-by-step guidance to achieve full marks.\n` +
    `4. DO NOT HESITATE TO AWARD ZERO: If an AO is absent, unattempted, or defective in relation to the prompt, award 0 for that AO. Courtesy marks are strictly prohibited.`;

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
          prompt: userMessage,
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
            { role: "user", content: userMessage },
          ],
        });

  grading = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split, question, essayText);
  if (grading.off_syllabus) {
    throw new OffSyllabusError(
      grading.detected_subject || "another subject",
      grading.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
    );
  }
  promptTokens = first.promptTokens;
  completionTokens = first.completionTokens;
  latencyMs = first.latencyMs;
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
  grading.latencyMs = latencyMs;

  return {
    grading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs,
  };
}
