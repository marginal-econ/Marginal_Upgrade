/**
 * Examiner engine — calibrated for Cambridge International AS/A Level Economics (syllabus 9708).
 *
 * Dual-Examiner Architecture with Varied Temperatures:
 *  - Pass 1: Temperature 0.0 — Rigorous analytical & theoretical error check. Scrutinizes
 *    economic mechanisms, curve shifts, elasticity claims, definitions, and transmissions.
 *  - Pass 2: Temperature 0.2 — Holistic Cambridge assessment. Evaluates argument breadth,
 *    positive marking, wide evaluation across multiple perspectives, and human tone.
 *  - Concluded Together: Both passes run concurrently (~12-18s total) and are concluded
 *    together into an authoritative final mark and constructive, human examiner report.
 *
 * Core Cambridge Rules:
 *  - Diagram Rule: Not drawing a diagram is NEVER penalized (written economics alone can score full marks).
 *    Accurate diagrams are positively rewarded under AO2.
 *  - Evaluation Rule: Evaluation must be strong and wide, comparing multiple perspectives (short vs long run,
 *    stakeholders, trade-offs, elasticity). Strict on superficial assertions, but NO artificial numeric caps.
 *  - Human Tone: Encouraging, constructive, citing verbatim student phrases, zero asterisks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat, visionChat } from "../ai.server";
import { renderContext, retrieve } from "../retrieval.server";
import {
  arbitrateGrading,
  computeObjectiveConfidence,
  shouldTriggerArbitration,
  synthesizeDualPasses,
} from "./arbitration.server";
import { AUDIT_PROMPT } from "./audit-prompt";
import { buildAnchorBlock, fetchCalibrationAnchors } from "./calibration.server";
import {
  formatStructureNote,
  getStructureGuidance,
  MODEL_EXAMINER,
  renderAoDefinitions,
  TEMPERATURE_PASS1,
  TEMPERATURE_PASS2,
  type AoSplit,
} from "./config";
import {
  EXAMINER_PROMPT,
  PASS1_ERROR_CHECK_DIRECTIVE,
  PASS2_HOLISTIC_EVALUATION_DIRECTIVE,
} from "./examiner-prompt";
import { extractFirstJsonObject } from "./json";
import { bandFor, normaliseGrading, type Grading, type GroundingSource } from "./types";

/** Fill `{placeholder}` tokens in the prompt templates. */
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
"confidence" is your own 0-1 confidence that a real Cambridge examiner would award the same total mark.
"suggested_practice" must be concrete next tasks.
Keep every comment specific to this essay's actual text — never generic advice.
`.trim();

export type GradeOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  auditPass?: boolean;
  topicId?: string | null;
  /**
   * Screenshot(s) of the relevant mark scheme page, pasted in by the
   * student. When present, both examiner passes read these directly (vision)
   * as well as the text retrieved from the knowledge base.
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
  const startedAt = Date.now();
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

  let baseSystemPrompt = loadPrompt(EXAMINER_PROMPT, promptValues);

  // --- syllabus pre-flight guardrail ----------------------------------------
  const { OffSyllabusError } = await import("./syllabus-guard.server");
  if (!options.skipSyllabusPreflight) {
    const { validateEconomicsSyllabus } = await import("./syllabus-guard.server");
    await validateEconomicsSyllabus(question, essayText);
  }

  // --- retrieval grounding ---------------------------------------------------
  let sources: GroundingSource[] = [];
  
  // Tier 1: Direct clean question query (exact vector match with syllabus and coursebook chapters)
  try {
    sources = await retrieve(supabase, {
      query: question,
      matchCount: 8,
      minSimilarity: 0.38,
      enableHybridRrf: true,
    });
  } catch (err1) {
    console.warn("[grade.server] Direct question retrieval warning:", err1 instanceof Error ? err1.message : err1);
  }

  // Tier 2: Broader similarity threshold fallback
  if (!sources || sources.length === 0) {
    try {
      sources = await retrieve(supabase, {
        query: question,
        matchCount: 8,
        minSimilarity: 0.25,
        enableHybridRrf: true,
      });
    } catch (err2) {
      console.warn("[grade.server] Fallback similarity retrieval warning:", err2 instanceof Error ? err2.message : err2);
    }
  }

  // Tier 3: Syllabus and mark scheme enriched query fallback
  if (!sources || sources.length === 0) {
    try {
      sources = await retrieve(supabase, {
        query: `${question} - Cambridge 9708 mark scheme, syllabus, and coursebook criteria`,
        matchCount: 8,
        minSimilarity: 0.20,
        enableHybridRrf: true,
      });
    } catch (err3) {
      console.warn("[grade.server] Enriched retrieval warning:", err3 instanceof Error ? err3.message : err3);
    }
  }

  // Tier 4: Broad syllabus floor fallback ensuring grounding is always established if any syllabus material exists
  if (!sources || sources.length === 0) {
    try {
      sources = await retrieve(supabase, {
        query: question,
        matchCount: 8,
        minSimilarity: 0.12,
        enableHybridRrf: true,
      });
    } catch (err4) {
      console.warn("[grade.server] Floor retrieval warning:", err4 instanceof Error ? err4.message : err4);
    }
  }
  if (sources.length > 0) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n${renderContext(sources)}`;
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
  if (anchorBlock) baseSystemPrompt = `${baseSystemPrompt}\n\n${anchorBlock}`;

  baseSystemPrompt = `${baseSystemPrompt}\n\n${RESPONSE_CONTRACT}`;

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
    baseSystemPrompt = `${baseSystemPrompt}\n\n` +
      `CRITICAL KNOWLEDGE BASE NOTICE — NO SPECIFIC MARK SCHEME OR SYLLABUS MATCH FOUND:\n` +
      `No specific Cambridge 9708 mark scheme, syllabus section, or examiner report was found in the institution's knowledge base for this question (${question}), and no mark scheme screenshot was attached.\n\n` +
      `MARKING INSTRUCTIONS FOR UNANCHORED ESSAYS:\n` +
      `1. You MUST notify the candidate in 'examiner_summary' with this exact prefix:\n` +
      `   "[UNANCHORED ASSESSMENT: No official mark scheme found in Knowledge Base — evaluated against generic Cambridge 9708 Assessment Objectives (AO1/AO2/AO3)]. "\n` +
      `2. Mark strictly against standard Cambridge AO level descriptors without inventing question-specific requirements.\n` +
      `3. In 'actionable_feedback', advise the student to attach a screenshot of the official mark scheme or have an administrator upload it to the Knowledge Base to unlock question-specific mark scheme grounding.\n` +
      `4. Do NOT invent fake mark-scheme references or claim to have consulted specific unseen question mark schemes.`;
  }

  const userMessage =
    `EXAM QUESTION TO MARK IN FULL DEPTH (${maxMark} marks):\n` +
    `"""\n${question}\n"""\n\n` +
    `STUDENT ESSAY SUBMISSION:\n` +
    `"""\n${essayText}\n"""${imageNote}\n\n` +
    `CRITICAL DIRECTIVE: Scrutinize the student's submission against EVERY clause, qualifier, and command word of the exam question above. Ensure the evaluation directly addresses the exact question asked without shifting the goalposts.`;

  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let latencyMs = 0;
  let activeModel = MODEL_EXAMINER;
  let keyRotated = false;
  let modelSwapped = false;
  let activeKeyType: "primary" | "backup_pool" | "vip_fallback" | undefined = undefined;

  const runSinglePass = options.auditPass === false;

  const pass1SystemPrompt = `${baseSystemPrompt}\n\n${PASS1_ERROR_CHECK_DIRECTIVE}`;
  const pass2SystemPrompt = `${baseSystemPrompt}\n\n${PASS2_HOLISTIC_EVALUATION_DIRECTIVE}`;

  let finalGrading: Grading;

  if (runSinglePass) {
    // Single pass path (used when audit is explicitly disabled)
    const res = markSchemeImages.length
      ? await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt: pass2SystemPrompt,
          prompt: userMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 8192,
          userId: options.userId,
          feature: "grade_essay",
        })
      : await chat({
          model: MODEL_EXAMINER,
          temperature: TEMPERATURE_PASS2,
          json: true,
          isBudgetTier: options.isBudgetTier,
          userId: options.userId,
          feature: "grade_essay",
          reasoningEffort: "low",
          maxCompletionTokens: 8192,
          messages: [
            { role: "system", content: pass2SystemPrompt },
            { role: "user", content: userMessage },
          ],
        });

    finalGrading = normaliseGrading(extractFirstJsonObject(res.text), maxMark, split);
    if (finalGrading.off_syllabus) {
      throw new OffSyllabusError(
        finalGrading.detected_subject || "another subject",
        finalGrading.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
      );
    }
    promptTokens = res.promptTokens;
    completionTokens = res.completionTokens;
    latencyMs = res.latencyMs;
    activeModel = res.model || MODEL_EXAMINER;
    keyRotated = Boolean(res.keyRotated);
    modelSwapped = Boolean(res.modelSwapped);
    activeKeyType = res.activeKeyType;
  } else {
    // Dual Examiner Passes with Varied Temperatures executed concurrently:
    // Pass 1: Temperature 0.0 (Analytical rigor & error checking)
    // Pass 2: Temperature 0.2 (Holistic evaluation & argument breadth)
    const [first, second] = await Promise.all([
      markSchemeImages.length
        ? visionChat({
            model: MODEL_EXAMINER,
            systemPrompt: pass1SystemPrompt,
            prompt: userMessage,
            imageDataUrls: markSchemeImages,
            maxCompletionTokens: 8192,
            userId: options.userId,
            feature: "grade_essay_pass1_error_audit",
          })
        : chat({
            model: MODEL_EXAMINER,
            temperature: TEMPERATURE_PASS1, // 0.0
            json: true,
            isBudgetTier: options.isBudgetTier,
            userId: options.userId,
            feature: "grade_essay_pass1_error_audit",
            reasoningEffort: "low",
            maxCompletionTokens: 8192,
            messages: [
              { role: "system", content: pass1SystemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
      markSchemeImages.length
        ? visionChat({
            model: MODEL_EXAMINER,
            systemPrompt: pass2SystemPrompt,
            prompt: userMessage,
            imageDataUrls: markSchemeImages,
            maxCompletionTokens: 8192,
            userId: options.userId,
            feature: "grade_essay_pass2_holistic",
          })
        : chat({
            model: MODEL_EXAMINER,
            temperature: TEMPERATURE_PASS2, // 0.2
            json: true,
            isBudgetTier: options.isBudgetTier,
            userId: options.userId,
            feature: "grade_essay_pass2_holistic",
            reasoningEffort: "low",
            maxCompletionTokens: 8192,
            messages: [
              { role: "system", content: pass2SystemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
    ]);

    const grading1 = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split);
    const grading2 = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split);

    if (grading1.off_syllabus || grading2.off_syllabus) {
      const rejected = grading1.off_syllabus ? grading1 : grading2;
      throw new OffSyllabusError(
        rejected.detected_subject || "another subject",
        rejected.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
      );
    }

    promptTokens = (first.promptTokens ?? 0) + (second.promptTokens ?? 0);
    completionTokens = (first.completionTokens ?? 0) + (second.completionTokens ?? 0);
    latencyMs = Math.max(first.latencyMs, second.latencyMs);
    activeModel = second.model || first.model || MODEL_EXAMINER;
    keyRotated = Boolean(first.keyRotated || second.keyRotated);
    modelSwapped = Boolean(first.modelSwapped || second.modelSwapped);
    activeKeyType = second.activeKeyType ?? first.activeKeyType;

    // --- Conclude Dual Passes Together for Final Grade ------------------------
    const disputeCheck = shouldTriggerArbitration(grading1, grading2, maxMark);

    if (disputeCheck.shouldArbitrate) {
      // Discrepancy exceeds threshold (delta >= 2 or grade band mismatch):
      // Principal Examiner arbitration resolves the dispute grounded in verbatim essay evidence
      try {
        const arbitratedGrading = await arbitrateGrading({
          question,
          essayText,
          maxMark,
          split,
          examinerGrading: grading1,
          moderatorGrading: grading2,
          disputeReason: disputeCheck.reason,
          userId: options.userId,
        });
        finalGrading = arbitratedGrading;
      } catch (arbitrationErr) {
        console.warn("[grade.server] Arbitration failed, synthesizing dual passes directly:", arbitrationErr);
        finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split);
      }
    } else {
      // Passes converged within tolerance (delta <= 1 and matching band):
      // Synthesize both passes, embedding Pass 1's error precision with Pass 2's holistic judgment
      finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split);
    }
  }

  finalGrading.sources = sources;
  finalGrading.anchorsUsed = anchors.length;
  finalGrading.grounding_status = groundingStatus;
  finalGrading.model = activeModel;
  finalGrading.keyRotated = keyRotated;
  finalGrading.modelSwapped = modelSwapped;
  finalGrading.activeKeyType = activeKeyType;
  const totalLatencyMs = Date.now() - startedAt;
  finalGrading.latencyMs = totalLatencyMs;

  return {
    grading: finalGrading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs: totalLatencyMs,
  };
}
