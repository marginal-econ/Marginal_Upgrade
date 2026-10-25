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
"confidence" is your own 0-1 confidence that a real Cambridge examiner would
award the same total mark. "suggested_practice" must be concrete next tasks
(e.g. "write a 4-mark evaluation paragraph on subsidy incidence in this market").
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
  const { validateEconomicsSyllabus, OffSyllabusError } = await import("./syllabus-guard.server");
  await validateEconomicsSyllabus(question, essayText);

  // --- retrieval grounding ---------------------------------------------------
  let sources: GroundingSource[] = [];
  try {
    sources = await Promise.race([
      retrieve(supabase, {
        query: `${question}\n\nMark scheme, band descriptors and examiner report guidance for this question.`,
        matchCount: 8,
        docTypes: ["mark_scheme", "examiner_report", "syllabus", "coursebook", "notes"],
        topicId: options.topicId ?? null,
        enableHybridRrf: true,
      }),
      new Promise<GroundingSource[]>((_, reject) =>
        setTimeout(() => reject(new Error("Knowledge base lookup timed out (>5s)")), 5000),
      ),
    ]);
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
  const anchorBlock = buildAnchorBlock(anchors);
  if (anchorBlock) systemPrompt = `${systemPrompt}\n\n${anchorBlock}`;

  systemPrompt = `${systemPrompt}\n\n${RESPONSE_CONTRACT}`;

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
    `Exam question (${maxMark} marks):\n\n${question}\n\n` +
    `Student essay to mark:\n\n${essayText}${imageNote}`;

  let grading: Grading;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let latencyMs = 0;
  let activeModel = MODEL_EXAMINER;
  let keyRotated = false;
  let modelSwapped = false;
  let activeKeyType: "primary" | "backup_pool" | "vip_fallback" | undefined = undefined;

  // Distributed Specialist Swarm:
  // When no mark scheme images are present, we evaluate AO1 (Knowledge), AO2 (Analysis),
  // and AO3 (Evaluation) concurrently in parallel across independent rotated API keys.
  // This eliminates cognitive dilution, prevents AO halo bias, and slashes grading latency.
  let swarmOutcome: {
    grading: Grading;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    model: string;
  } | null = null;

  if (markSchemeImages.length === 0) {
    try {
      swarmOutcome = await runSpecialistSwarm(
        question,
        essayText,
        maxMark,
        split,
        sources.length > 0 ? renderContext(sources) : "",
        options,
      );
    } catch (swarmErr) {
      console.warn("[grade.server] Specialist swarm encounter, falling back to unified examiner:", swarmErr);
      swarmOutcome = null;
    }
  }

  if (swarmOutcome) {
    grading = swarmOutcome.grading;
    promptTokens = swarmOutcome.promptTokens;
    completionTokens = swarmOutcome.completionTokens;
    latencyMs = swarmOutcome.latencyMs;
    activeModel = swarmOutcome.model;
    keyRotated = true; // Rotated across specialist keys
  } else {
    // Authoritative Single-Shot Path (for image mark schemes or swarm fallback)
    const first = markSchemeImages.length
      ? await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt,
          prompt: userMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 8000,
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });

    grading = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split);
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

    // --- audit pass (for single-shot pass) -----------------------------------
    if (options.auditPass !== false && first.latencyMs < 18_000) {
      const auditSystemPrompt = `${loadPrompt(AUDIT_PROMPT, promptValues)}\n\n${RESPONSE_CONTRACT}`;
      const auditUserMessage =
        `Exam question (${maxMark} marks):\n\n${question}\n\n` +
        `Student essay:\n\n${essayText}\n\n` +
        `Original examiner's grading JSON to audit:\n\n${JSON.stringify(grading, null, 2)}${imageNote}`;

      try {
        const secondPromise = markSchemeImages.length
          ? visionChat({
              model: MODEL_EXAMINER,
              systemPrompt: auditSystemPrompt,
              prompt: auditUserMessage,
              imageDataUrls: markSchemeImages,
              maxCompletionTokens: 8000,
              userId: options.userId,
              feature: "grade_essay_audit",
            })
          : chat({
              model: MODEL_EXAMINER,
              temperature: TEMPERATURE_EXAMINER,
              json: true,
              isBudgetTier: options.isBudgetTier,
              userId: options.userId,
              feature: "grade_essay_audit",
              messages: [
                { role: "system", content: auditSystemPrompt },
                { role: "user", content: auditUserMessage },
              ],
            });

        const second = await Promise.race([
          secondPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Audit pass exceeded 10s timeout")), 10_000),
          ),
        ]);

        const secondGrading = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split);
        secondGrading.audited = true;
        promptTokens = (promptTokens ?? 0) + (second.promptTokens ?? 0);
        completionTokens = (completionTokens ?? 0) + (second.completionTokens ?? 0);
        latencyMs += second.latencyMs;

        const disputeCheck = shouldTriggerArbitration(grading, secondGrading, maxMark);
        if (disputeCheck.shouldArbitrate && latencyMs < 25_000) {
          try {
            const arbitrated = await Promise.race([
              arbitrateGrading({
                question,
                essayText,
                maxMark,
                split,
                examinerGrading: grading,
                moderatorGrading: secondGrading,
                disputeReason: disputeCheck.reason,
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Arbitration exceeded 8s timeout")), 8_000),
              ),
            ]);
            grading = arbitrated;
          } catch (arbitrationError) {
            console.warn(
              "Arbitration pass timed out or failed; falling back to moderated grade",
              arbitrationError,
            );
            grading = secondGrading;
            grading.confidence = computeObjectiveConfidence(grading, secondGrading, false);
          }
        } else {
          grading = secondGrading;
          grading.confidence = computeObjectiveConfidence(grading, secondGrading, false);
        }
      } catch (error) {
        console.warn("Audit pass skipped or timed out; returning authoritative first-pass grading", error);
      }
    }
  }

  grading.sources = sources;
  grading.anchorsUsed = anchors.length;
  grading.grounding_status = groundingStatus;
  grading.model = activeModel;
  grading.keyRotated = keyRotated;
  grading.modelSwapped = modelSwapped;
  grading.activeKeyType = activeKeyType;

  return {
    grading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs,
  };
}

/**
 * Distributed Specialist Swarm:
 * Evaluates AO1 Knowledge, AO2 Analysis, and AO3 Evaluation concurrently
 * across dedicated specialist prompts and rotated API keys.
 */
async function runSpecialistSwarm(
  question: string,
  essayText: string,
  maxMark: number,
  split: AoSplit,
  groundingContext: string,
  options: GradeOptions,
): Promise<{
  grading: Grading;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  model: string;
} | null> {
  const swarmStart = Date.now();
  const { ao1_marks, ao2_marks, ao3_marks } = split;

  // Lane 1: Specialist AO1 (Knowledge & Understanding)
  const ao1Promise = chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    isBudgetTier: options.isBudgetTier,
    userId: options.userId,
    feature: "grade_specialist_ao1",
    maxCompletionTokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are an expert Cambridge 9708 Economics Examiner evaluating Assessment Objective 1 (Knowledge and Understanding).\n` +
          `Question (${maxMark} marks total, AO1 tariff: ${ao1_marks} marks):\n${question}\n\n` +
          `${groundingContext ? `Official Grounding Context:\n${groundingContext}\n\n` : ""}` +
          `Audit the student's economic definitions, terminology, foundational models, and theoretical accuracy.\n` +
          `Award marks strictly between 0 and ${ao1_marks}.\n` +
          `Return ONLY a JSON object: {"awarded": number, "comment": string, "strengths": string[], "missing_definitions": string[]}`,
      },
      { role: "user", content: `Student essay to mark:\n\n${essayText}` },
    ],
  });

  // Lane 2: Specialist AO2 (Analysis & Diagrams)
  const ao2Promise = chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    isBudgetTier: options.isBudgetTier,
    userId: options.userId,
    feature: "grade_specialist_ao2",
    maxCompletionTokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are an expert Cambridge 9708 Economics Examiner evaluating Assessment Objective 2 (Analysis).\n` +
          `Question (${maxMark} marks total, AO2 tariff: ${ao2_marks} marks):\n${question}\n\n` +
          `${groundingContext ? `Official Grounding Context:\n${groundingContext}\n\n` : ""}` +
          `Audit cause-and-effect transmission chains, economic logic, diagrams/curves, and analytical depth.\n` +
          `Award marks strictly between 0 and ${ao2_marks}.\n` +
          `Return ONLY a JSON object: {"awarded": number, "comment": string, "missing_analysis": string[], "missing_diagrams": string[]}`,
      },
      { role: "user", content: `Student essay to mark:\n\n${essayText}` },
    ],
  });

  // Lane 3: Specialist AO3 (Evaluation & Judgment)
  const ao3Promise =
    ao3_marks > 0
      ? chat({
          model: MODEL_EXAMINER,
          temperature: TEMPERATURE_EXAMINER,
          json: true,
          isBudgetTier: options.isBudgetTier,
          userId: options.userId,
          feature: "grade_specialist_ao3",
          maxCompletionTokens: 1200,
          messages: [
            {
              role: "system",
              content: `You are an expert Cambridge 9708 Economics Examiner evaluating Assessment Objective 3 (Evaluation).\n` +
                `Question (${maxMark} marks total, AO3 tariff: ${ao3_marks} marks):\n${question}\n\n` +
                `${groundingContext ? `Official Grounding Context:\n${groundingContext}\n\n` : ""}` +
                `Audit critical evaluation: ceteris paribus assumptions, short-run vs long-run distinctions, stakeholder trade-offs, and final evaluative synthesis.\n` +
                `Award marks strictly between 0 and ${ao3_marks}.\n` +
                `Return ONLY a JSON object: {"awarded": number, "comment": string, "weaknesses": string[], "missing_evaluation": string[]}`,
            },
            { role: "user", content: `Student essay to mark:\n\n${essayText}` },
          ],
        })
      : Promise.resolve({
          text: JSON.stringify({
            awarded: 0,
            comment: "No evaluation marks allocated for this question tariff.",
            weaknesses: [],
            missing_evaluation: [],
          }),
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0,
        } as any);

  // Parallel execution across rotated API keys
  const [ao1Res, ao2Res, ao3Res] = await Promise.all([ao1Promise, ao2Promise, ao3Promise]);

  const ao1Json = extractFirstJsonObject(ao1Res.text);
  const ao2Json = extractFirstJsonObject(ao2Res.text);
  const ao3Json = extractFirstJsonObject(ao3Res.text);

  const ao1Awarded = Math.max(0, Math.min(ao1_marks, Number(ao1Json.awarded) || 0));
  const ao2Awarded = Math.max(0, Math.min(ao2_marks, Number(ao2Json.awarded) || 0));
  const ao3Awarded = Math.max(0, Math.min(ao3_marks, Number(ao3Json.awarded) || 0));
  const totalAwarded = Math.min(maxMark, ao1Awarded + ao2Awarded + ao3Awarded);

  // Lane 4: Chief Examiner Synthesis
  const synthesisRes = await chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    isBudgetTier: options.isBudgetTier,
    userId: options.userId,
    feature: "grade_specialist_synthesis",
    maxCompletionTokens: 1800,
    messages: [
      {
        role: "system",
        content: `You are the Senior Chief Examiner for Cambridge 9708 Economics.\n` +
          `Specialist examiners have evaluated this student's essay across Assessment Objectives:\n` +
          `- AO1 (Knowledge): ${ao1Awarded}/${ao1_marks}. Examiner Note: ${ao1Json.comment || "N/A"}\n` +
          `- AO2 (Analysis): ${ao2Awarded}/${ao2_marks}. Examiner Note: ${ao2Json.comment || "N/A"}\n` +
          `- AO3 (Evaluation): ${ao3Awarded}/${ao3_marks}. Examiner Note: ${ao3Json.comment || "N/A"}\n` +
          `Total Mark: ${totalAwarded}/${maxMark}.\n\n` +
          `Task: Synthesize the final comprehensive diagnostic examiner feedback for the student.\n` +
          `Return ONLY a JSON object:\n` +
          `{\n` +
          `  "band": string,\n` +
          `  "examiner_summary": string (concise, professional senior examiner overview),\n` +
          `  "actionable_feedback": string[] (3 concrete upgrade recommendations),\n` +
          `  "suggested_practice": string[] (2 focused Cambridge exam tasks),\n` +
          `  "suggested_resources": string[] (2 Cambridge syllabus / reading topics),\n` +
          `  "confidence": number (0.85 to 0.98)\n` +
          `}`,
      },
      {
        role: "user",
        content: `Question (${maxMark} marks):\n${question}\n\nStudent Essay:\n${essayText}`,
      },
    ],
  });

  const synthJson = extractFirstJsonObject(synthesisRes.text);

  const combinedRaw: Record<string, unknown> = {
    total_mark: totalAwarded,
    band: synthJson.band || bandFor(totalAwarded, maxMark),
    ao_breakdown: {
      knowledge: {
        awarded: ao1Awarded,
        out_of: ao1_marks,
        comment: String(ao1Json.comment || "AO1 Knowledge assessed against syllabus definitions."),
      },
      analysis: {
        awarded: ao2Awarded,
        out_of: ao2_marks,
        comment: String(ao2Json.comment || "AO2 Analysis assessed against transmission chains."),
      },
      evaluation: {
        awarded: ao3Awarded,
        out_of: ao3_marks,
        comment: String(ao3Json.comment || "AO3 Evaluation assessed against critical judgment criteria."),
      },
    },
    examiner_summary: String(synthJson.examiner_summary || "Evaluated by Cambridge 9708 Specialist Examiner Swarm."),
    strengths: Array.isArray(ao1Json.strengths) ? ao1Json.strengths : [],
    weaknesses: Array.isArray(ao3Json.weaknesses) ? ao3Json.weaknesses : [],
    missing_elements: {
      definitions: Array.isArray(ao1Json.missing_definitions) ? ao1Json.missing_definitions : [],
      analysis: Array.isArray(ao2Json.missing_analysis) ? ao2Json.missing_analysis : [],
      evaluation: Array.isArray(ao3Json.missing_evaluation) ? ao3Json.missing_evaluation : [],
      examples: [],
      diagrams: Array.isArray(ao2Json.missing_diagrams) ? ao2Json.missing_diagrams : [],
    },
    actionable_feedback: Array.isArray(synthJson.actionable_feedback) ? synthJson.actionable_feedback : [],
    suggested_practice: Array.isArray(synthJson.suggested_practice) ? synthJson.suggested_practice : [],
    suggested_resources: Array.isArray(synthJson.suggested_resources) ? synthJson.suggested_resources : [],
    confidence: Number(synthJson.confidence) || 0.92,
  };

  const grading = normaliseGrading(combinedRaw, maxMark, split);
  grading.audited = true; // Specialists independently moderated

  const promptTokens =
    (ao1Res.promptTokens ?? 0) +
    (ao2Res.promptTokens ?? 0) +
    (ao3Res.promptTokens ?? 0) +
    (synthesisRes.promptTokens ?? 0);
  const completionTokens =
    (ao1Res.completionTokens ?? 0) +
    (ao2Res.completionTokens ?? 0) +
    (ao3Res.completionTokens ?? 0) +
    (synthesisRes.completionTokens ?? 0);
  const latencyMs = Date.now() - swarmStart;

  return {
    grading,
    promptTokens,
    completionTokens,
    latencyMs,
    model: synthesisRes.model || MODEL_EXAMINER,
  };
}
