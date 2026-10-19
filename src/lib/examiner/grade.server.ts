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
import { normaliseGrading, type Grading, type GroundingSource } from "./types";

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
  // Mandatory, not best-effort: every mark must be grounded in this
  // teacher's actual syllabus/mark-scheme/examiner-report material. A
  // retrieval failure used to be swallowed here (logged server-side only)
  // and marking would silently continue ungrounded — a teacher had no way
  // to know a mark wasn't actually checked against their knowledge base.
  // It now throws, so a broken embedding provider surfaces as a visible
  // error instead of a quietly-wrong mark. Zero MATCHES (as opposed to a
  // failed call) is not an error — that's "nothing relevant is in the
  // knowledge base for this question yet" — so it's exposed via
  // `grading.sources` instead, not thrown.
  let sources: GroundingSource[] = [];
  try {
    sources = await retrieve(supabase, {
      query: `${question}\n\nMark scheme, band descriptors and examiner report guidance for this question.`,
      matchCount: 8,
      docTypes: ["mark_scheme", "examiner_report", "syllabus", "coursebook", "notes"],
      topicId: options.topicId ?? null,
      enableHybridRrf: true,
    });
  } catch (error) {
    console.warn(
      "Knowledge base retrieval failed, proceeding with Cambridge 9708 syllabus marking:",
      error,
    );
    sources = [];
  }
  if (sources.length > 0) {
    systemPrompt = `${systemPrompt}\n\n${renderContext(sources)}`;
  }

  // --- calibration anchors -----------------------------------------------
  // Also mandatory now, for the same reason: a DB error fetching anchors
  // used to be silently ignored (the `error` from the query was never
  // even read) and marking proceeded with no calibration at all. A real
  // query error throws now; zero ACTIVE ANCHORS (nobody has added one, or
  // none are marked active) is still a normal, non-error state — that
  // just means this teacher hasn't set any up yet, so it's exposed via
  // `grading.anchorsUsed` rather than blocking every single grade.
  const anchors = await fetchCalibrationAnchors(supabase);
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

  const first = markSchemeImages.length
    ? await visionChat({
        model: MODEL_EXAMINER,
        systemPrompt,
        prompt: userMessage,
        imageDataUrls: markSchemeImages,
        maxCompletionTokens: 8000,
      })
    : await chat({
        model: MODEL_EXAMINER,
        temperature: TEMPERATURE_EXAMINER,
        json: true,
        isBudgetTier: options.isBudgetTier,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

  let grading = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split);
  if (grading.off_syllabus) {
    throw new OffSyllabusError(
      grading.detected_subject || "another subject",
      grading.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
    );
  }
  let promptTokens = first.promptTokens;
  let completionTokens = first.completionTokens;
  let latencyMs = first.latencyMs;

  // --- audit pass ----------------------------------------------------------
  if (options.auditPass !== false) {
    const auditSystemPrompt = `${loadPrompt(AUDIT_PROMPT, promptValues)}\n\n${RESPONSE_CONTRACT}`;
    const auditUserMessage =
      `Exam question (${maxMark} marks):\n\n${question}\n\n` +
      `Student essay:\n\n${essayText}\n\n` +
      `Original examiner's grading JSON to audit:\n\n${JSON.stringify(grading, null, 2)}${imageNote}`;

    try {
      const second = markSchemeImages.length
        ? await visionChat({
            model: MODEL_EXAMINER,
            systemPrompt: auditSystemPrompt,
            prompt: auditUserMessage,
            imageDataUrls: markSchemeImages,
            maxCompletionTokens: 8000,
          })
        : await chat({
            model: MODEL_EXAMINER,
            temperature: TEMPERATURE_EXAMINER,
            json: true,
            isBudgetTier: options.isBudgetTier,
            messages: [
              { role: "system", content: auditSystemPrompt },
              { role: "user", content: auditUserMessage },
            ],
          });

      const secondGrading = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split);
      secondGrading.audited = true;
      promptTokens = (promptTokens ?? 0) + (second.promptTokens ?? 0);
      completionTokens = (completionTokens ?? 0) + (second.completionTokens ?? 0);
      latencyMs += second.latencyMs;

      // --- Stage 3: Selective Principal Examiner Arbitration ---
      // Triggered only when a material discrepancy or grade band contradiction
      // exists between the Primary Examiner and Independent Moderator.
      const disputeCheck = shouldTriggerArbitration(grading, secondGrading, maxMark);
      if (disputeCheck.shouldArbitrate) {
        try {
          const arbitrated = await arbitrateGrading({
            question,
            essayText,
            maxMark,
            split,
            examinerGrading: grading,
            moderatorGrading: secondGrading,
            disputeReason: disputeCheck.reason,
          });
          grading = arbitrated;
        } catch (arbitrationError) {
          console.error(
            "Arbitration pass encountered error; falling back to moderated grade",
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
      // The audit is a correction pass, not a gate. A transient audit failure
      // returns the already-valid first-pass result instead of failing.
      console.error("Audit pass failed; returning unaudited grading", error);
    }
  }

  grading.sources = sources;
  grading.anchorsUsed = anchors.length;
  grading.grounding_status = groundingStatus;

  return {
    grading,
    model: MODEL_EXAMINER,
    promptTokens,
    completionTokens,
    latencyMs,
  };
}
