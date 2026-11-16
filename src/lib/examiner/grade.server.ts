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
import { buildAnchorBlock, fetchCalibrationAnchors, selectBestAnchors } from "./calibration.server";
import {
  buildAoEvaluationDirective,
  formatStructureNote,
  getStructureGuidance,
  MODEL_EXAMINER,
  renderAoDefinitions,
  renderAo3Descriptors,
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
import { refineExaminerReport } from "./refine.server";
import { buildSyllabusErrorPromptCatalog } from "./syllabus-errors";
import { bandFor, normaliseGrading, sanitizeALevelFeedbackText, type Grading, type GroundingSource } from "./types";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
  type EssayQualityAnalysis,
} from "./writing-quality.server";

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
  essayType?: string;
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
  const qualityAnalysis = analyzeEssayQuality(essayText, maxMark, split);
  const qualityDirective = buildQualityPromptDirective(qualityAnalysis, maxMark);

  const promptValues = {
    syllabus_code: "9708",
    max_mark: maxMark,
    ao1_marks,
    ao2_marks,
    ao3_marks,
    ao_definitions: renderAoDefinitions(),
    ao_evaluation_directive: buildAoEvaluationDirective(maxMark, split),
    ao3_level_descriptors: renderAo3Descriptors(maxMark, ao3_marks),
    structure_note: structureNote,
    essay_quality_profile: qualityDirective,
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

  // --- calibration anchors (strictly 1 or 2, never 18) ---------------------
  let anchors: any[] = [];
  try {
    anchors = await fetchCalibrationAnchors(supabase);
  } catch (anchorErr) {
    console.warn("[grade.server] Error fetching calibration anchors, proceeding with standard rubrics:", anchorErr);
    anchors = [];
  }
  const selectedAnchors = selectBestAnchors(anchors, question, maxMark, 2);
  const anchorBlock = buildAnchorBlock(selectedAnchors, question, maxMark);
  if (anchorBlock) baseSystemPrompt = `${baseSystemPrompt}\n\n${anchorBlock}`;
  const actualAnchorsCount = Math.min(2, Math.max(selectedAnchors.length > 0 ? 1 : 0, selectedAnchors.length));

  // Critical Paper Scope & Feedback Rules for Paper 2 (8-mark and 12-mark essays)
  if (maxMark <= 12) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n` +
      `CRITICAL PAPER SCOPE DIRECTIVE — STRICT CAMBRIDGE 9708 PAPER 2 (AS LEVEL ONLY):\n` +
      `This ${maxMark}-mark question is strictly Cambridge 9708 Paper 2 (AS Level).\n` +
      `1. ABSOLUTE PROHIBITION OF A-LEVEL (A2 / PAPER 4) CONCEPTS:\n` +
      `   You are STRICTLY FORBIDDEN from mentioning, demanding, or suggesting ANY A-Level topics anywhere in your assessment (examiner_summary, weaknesses, missing_elements, actionable_feedback, suggested_resources, suggested_practice, AO comments):\n` +
      `   * NO marginal utility, diminishing marginal utility, equi-marginal principle, or utility theory.\n` +
      `   * NO diminishing returns, law of diminishing returns, or diminishing marginal returns (these are A-Level / cost theory).\n` +
      `   * NO indifference curves, budget lines, or income and substitution effect breakdown.\n` +
      `   * NO market structures (monopoly, oligopoly, monopolistic competition, contestability, game theory, price discrimination).\n` +
      `   * NO dynamic efficiency, X-inefficiency, or Pareto efficiency.\n` +
      `   * NO labour market wage theory (MRPL).\n` +
      `   * NO A2 macro (expectations Phillips curve, multiplier formulas k=1/MPW, Gini/Lorenz).\n` +
      `   Grade and advise strictly on AS Level Paper 2 content and knowledge base.\n` +
      `2. DEFINITION FAIRNESS & ANTI-HALLUCINATION DIRECTIVE:\n` +
      `   * Scarcity = finite or limited resources cannot satisfy unlimited human wants. "Finite resources" and "limited resources" are standard, synonymous Cambridge terms. NEVER call "limited resources" vague, colloquial, or inaccurate.\n` +
      `   * Stating "scarcity takes place when resources are limited but wants are unlimited" is accurate syllabus economics. NEVER label it a tautology or incorrect.\n` +
      `   * Do NOT require opportunity cost within the definition of scarcity itself. Opportunity cost is a consequence of choice, not a clause of the definition of scarcity.\n` +
      `   * Candidates write timed examination essays; NEVER demand citations or [S#] snippet codes, and NEVER fabricate claims about what snippets require.\n` +
      `3. ZERO NUMERIC MARKS IN PROSE: Do NOT write numerical scores, mark breakdowns, or phrases like "held at 7", "instead of 8", or "cost you marks" anywhere inside written feedback, Examiner Summary, AO explanations, or improvement bullets. Let the UI score badges display the numbers separately.\n` +
      `4. FOCUS STRICTLY ON STRENGTHS & IMPROVEMENTS: In all written feedback sections, focus purely on (a) what the candidate did well economically, and (b) specific, syllabus-accurate improvements to elevate their analysis and evaluation (such as distinguishing movements onto the PPC from outward shifts, and using short-run vs. long-run criteria in the conclusion).`;
  }

  if (maxMark >= 20) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n` +
      `CRITICAL PAPER SCOPE DIRECTIVE — CAMBRIDGE 9708 PAPER 4 (A LEVEL EXTENDED ESSAYS):\n` +
      `This 20-mark question is Cambridge 9708 Paper 4 (A Level).\n` +
      `1. TIMED EXAM CALIBRATION (~40-45 MINUTES): Standard is highest on Paper 4, but ensure it is realistic and NOT an impossible academic standard. High school exam essay, not an academic journal. Do NOT expect exhaustive coverage of every edge case. Reward thorough multi-perspective causal analysis, real-world examples, and prioritized evaluation.\n` +
      `2. DEFINITION FAIRNESS & ANTI-HALLUCINATION DIRECTIVE:\n` +
      `   * Standard Cambridge definitions must be credited positively; never penalize accurate syllabus concepts with pedantic or hallucinated criticisms.\n` +
      `   * Candidates write timed examination essays; NEVER demand citations or [S#] snippet codes, and NEVER fabricate claims about what snippets require.\n` +
      `3. ZERO NUMERIC MARKS IN PROSE: Do NOT write numerical scores, mark breakdowns, or phrases like "cost you marks" anywhere inside written feedback, Examiner Summary, AO explanations, or improvement bullets.\n` +
      `4. FOCUS STRICTLY ON STRENGTHS & IMPROVEMENTS: Focus purely on (a) what the candidate did well economically, and (b) specific, syllabus-accurate improvements.`;
  }

  // Authoritative Chapter 1 (Scarcity & The Basic Economic Problem) Rubric:
  const touchesScarcity = /\bscarcit(y|ies)|basic economic problem|unlimited wants|finite resources\b/i.test(
    `${question} ${essayText}`,
  );
  if (touchesScarcity) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n` +
      `AUTHORITATIVE CHAPTER 1 (SCARCITY & THE BASIC ECONOMIC PROBLEM) RUBRIC (PAPER 2 AS LEVEL):\n` +
      `- Scarcity is defined as finite / limited resources being insufficient to satisfy infinite / unlimited human wants.\n` +
      `- "Finite resources" and "limited resources" are standard, synonymous Cambridge terms. Do NOT claim "limited resources" is vague or incorrect.\n` +
      `- Stating "scarcity takes place when resources are limited but wants are unlimited" is accurate syllabus economics. NEVER label this a tautology, colloquial, or an error.\n` +
      `- Scarcity necessitates choice, and every choice incurs an opportunity cost (the benefit of the next best alternative forgone). Opportunity cost is the result of choice, not a mandatory clause of the definition of scarcity itself.\n` +
      `- Rich countries experience persistent scarcity because human wants expand (e.g. higher-quality healthcare, luxury goods, cleaner environment, advanced technology), while resources (land, skilled labour, capital) remain finite.\n` +
      `- FORBIDDEN A-LEVEL THEORIES: Do NOT mention or expect marginal utility, diminishing marginal utility, or diminishing returns to explain scarcity in rich countries. Explain scarcity strictly via expanding consumer wants, finite factors of production, and opportunity cost trade-offs.`;
  }

  // Authoritative Chapter 5 (PPC & Efficiency) Knowledge Base Rubric:
  const touchesPpcOrEfficiency = /ppc|production possibility|productive eff|allocative eff/i.test(
    `${question} ${essayText}`,
  );
  if (touchesPpcOrEfficiency) {
    if (maxMark >= 20) {
      baseSystemPrompt = `${baseSystemPrompt}\n\n` +
        `AUTHORITATIVE CHAPTER 7 (ECONOMIC EFFICIENCY & UTILITY THEORY) KNOWLEDGE BASE RUBRIC (CAMBRIDGE 9708 A LEVEL PAPER 4):\n` +
        `- 20-mark essay questions belong exclusively to Cambridge 9708 Paper 4 (A Level extended essays).\n` +
        `- Economic efficiency (allocative, productive, and dynamic) is covered under Chapter 7: Economic Efficiency and Utility Theory (A Level / Paper 4).\n` +
        `- Allocative efficiency: P = MC or MSB = MSC (social efficiency), optimizing consumer welfare.\n` +
        `- Productive efficiency: producing at minimum average total cost (lowest point of LRAC) and on the PPC.\n` +
        `- In a market economy without government intervention, market failures (externalities, monopoly power, public goods, information failure) prevent the price mechanism from achieving economic efficiency on its own.\n` +
        `- When citing or suggesting syllabus concepts in feedback, label Chapter 7 as A Level: "Chapter 7: Economic Efficiency and Utility Theory (Cambridge 9708 A Level, Paper 4)". NEVER label 20-mark essays or Chapter 7 topics as AS Level or Paper 21.`;
    } else {
      baseSystemPrompt = `${baseSystemPrompt}\n\n` +
        `AUTHORITATIVE CHAPTER 5 (PPC & EFFICIENCY) KNOWLEDGE BASE RUBRIC (PAPER 2 AS LEVEL):\n` +
        `- Point inside PPC = Productive inefficiency / unemployment or underutilisation of resources (idle factors, X-inefficiency). A PPC diagram shows maximum combinations of two goods given current resources; it contains NO information on consumer preferences. It does NOT represent allocative inefficiency.\n` +
        `- Point on PPC = Productive efficiency (maximum possible output achievable from given resources at lowest cost). However, a point on the PPC may still be allocatively inefficient if the output combination does not match consumer preferences (where P != MC).\n` +
        `- MANDATORY ANALYTICAL ERROR AUDIT: Flag any confusion between productive and allocative inefficiency on a PPC diagram as an analytical error (deduct AO2 credit). Examiners MUST NEVER praise a student for linking a point inside the PPC to allocative inefficiency. Focus feedback constructively on distinguishing movements onto the PPC from outward shifts and productive from allocative efficiency.`;
    }
  }

  baseSystemPrompt = `${baseSystemPrompt}\n\n${buildSyllabusErrorPromptCatalog()}\n\n${RESPONSE_CONTRACT}`;

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

  const evalRequirementBanner =
    split.ao3_marks > 0
      ? `[QUESTION SPECIFICATION: ${maxMark} Marks · EVALUATIVE ESSAY (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: ${ao3_marks})]\n` +
        `EVALUATION IS MANDATORY. The prompt contains an evaluative requirement (e.g. 'consider', 'discuss', 'assess', 'whether', 'should', 'to what extent').\n` +
        `Even if the question begins with 'Explain', any evaluative clause requires critical evaluation and a concluding judgement.\n` +
        `You MUST evaluate AO3 out of exactly ${ao3_marks} marks. NEVER state that evaluation is not required.` +
        (maxMark === 8 && split.ao3_marks === 2
          ? `\n8-MARK EVALUATION CALIBRATION (~15 minutes): If the candidate presents a counter-argument and a reasoned conclusion directly addressing the prompt, award Level 2 evaluation (full 2 marks). Do NOT penalise for omitting secondary topics; credit 1-2 developed mechanisms and examples positively.`
          : maxMark === 12 && split.ao3_marks === 4
            ? `\n12-MARK EVALUATION CALIBRATION (~25-30 minutes, AS Level): Standard is higher than 8-mark, but NOT overly strict. A student writes under timed conditions and cannot cover everything. Do NOT penalise for omitting peripheral aspects when the core mechanisms are well addressed. If the candidate provides 2-3 clear causal analysis points with an example and balanced evaluation with a reasoned conclusion, award Top Band (10-12/12, with 3-4/4 in AO3). Focus on the quality of what is written.`
            : maxMark >= 20
              ? `\n20-MARK EVALUATION CALIBRATION (~40-45 minutes, A Level): Standard is the highest on Paper 4, but ensure it is realistic and NOT an impossible academic standard. It is a timed school exam essay, not a published thesis. Do NOT expect exhaustive coverage of every edge case. If the candidate demonstrates thorough multi-perspective causal chains with real-world application, weighs trade-offs (e.g. short-run vs long-run or prioritized factors), and provides a substantiated overall verdict, award Top Band (16-20/20, with 5-6/6 in AO3).`
              : "")
      : `[QUESTION SPECIFICATION: ${maxMark} Marks · NON-EVALUATIVE LEGACY ESSAY (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: 0)]\n` +
        `Pure explanatory / analytical question. Evaluation is NOT required; set AO3 awarded: 0, out_of: 0, with zero penalty.`;

  const userMessage =
    `${evalRequirementBanner}\n\n` +
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

    finalGrading = normaliseGrading(extractFirstJsonObject(res.text), maxMark, split, essayText);
    finalGrading = applyWritingQualityGuardrail(finalGrading, qualityAnalysis, maxMark, split);
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

    let grading1 = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split, essayText);
    grading1 = applyWritingQualityGuardrail(grading1, qualityAnalysis, maxMark, split);
    let grading2 = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split, essayText);
    grading2 = applyWritingQualityGuardrail(grading2, qualityAnalysis, maxMark, split);

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
          qualityAnalysis,
        });
        finalGrading = arbitratedGrading;
      } catch (arbitrationErr) {
        console.warn("[grade.server] Arbitration failed, synthesizing dual passes directly:", arbitrationErr);
        finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText);
      }
    } else {
      // Passes converged within tolerance (delta <= 1 and matching band):
      // Synthesize both passes, embedding Pass 1's error precision with Pass 2's holistic judgment
      finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText);
    }
  }

  // --- PASS 3: SENIOR REPORT REFINER & CONSISTENCY AUDITOR ------------------
  // Runs a third AI pass to eliminate contradictions, catch any unflagged
  // economic misconceptions/slips, remove weird phrasing, and ensure Cambridge accuracy
  try {
    finalGrading = await refineExaminerReport({
      question,
      essayText,
      maxMark,
      split,
      draftGrading: finalGrading,
      userId: options.userId,
    });
  } catch (refineErr) {
    console.warn("[grade.server] Pass 3 refinement error, proceeding with cleansed draft:", refineErr);
  }

  if (maxMark >= 20) {
    if (sources && sources.length > 0) {
      sources = sources.map((s) => ({
        ...s,
        documentTitle: s.documentTitle
          .replace(/\bPaper 21\b/g, "Paper 41")
          .replace(/\bPaper 22\b/g, "Paper 42")
          .replace(/\bPaper 23\b/g, "Paper 43")
          .replace(/\bPaper 2\b/g, "Paper 4")
          .replace(/\bAS Level\b/g, "A Level"),
      }));
    }
    finalGrading.ao_breakdown.knowledge.comment = sanitizeALevelFeedbackText(finalGrading.ao_breakdown.knowledge.comment);
    finalGrading.ao_breakdown.analysis.comment = sanitizeALevelFeedbackText(finalGrading.ao_breakdown.analysis.comment);
    finalGrading.ao_breakdown.evaluation.comment = sanitizeALevelFeedbackText(finalGrading.ao_breakdown.evaluation.comment);
    finalGrading.examiner_summary = sanitizeALevelFeedbackText(finalGrading.examiner_summary);
    finalGrading.strengths = finalGrading.strengths.map(sanitizeALevelFeedbackText);
    finalGrading.weaknesses = finalGrading.weaknesses.map(sanitizeALevelFeedbackText);
    finalGrading.actionable_feedback = finalGrading.actionable_feedback.map(sanitizeALevelFeedbackText);
    finalGrading.suggested_resources = finalGrading.suggested_resources.map(sanitizeALevelFeedbackText);
    finalGrading.suggested_practice = finalGrading.suggested_practice.map(sanitizeALevelFeedbackText);
    if (finalGrading.missing_elements) {
      finalGrading.missing_elements.definitions = finalGrading.missing_elements.definitions.map(sanitizeALevelFeedbackText);
      finalGrading.missing_elements.analysis = finalGrading.missing_elements.analysis.map(sanitizeALevelFeedbackText);
      finalGrading.missing_elements.evaluation = finalGrading.missing_elements.evaluation.map(sanitizeALevelFeedbackText);
      finalGrading.missing_elements.examples = finalGrading.missing_elements.examples.map(sanitizeALevelFeedbackText);
      finalGrading.missing_elements.diagrams = finalGrading.missing_elements.diagrams.map(sanitizeALevelFeedbackText);
    }
  }

  finalGrading.sources = sources;
  finalGrading.anchorsUsed = actualAnchorsCount;
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
