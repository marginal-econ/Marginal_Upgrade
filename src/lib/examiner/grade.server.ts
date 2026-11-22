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
  buildPaperScopeDirective,
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
import { cleanStars } from "@/lib/utils";
import {
  bandFor,
  deduplicateAcrossSections,
  normaliseGrading,
  sanitizeALevelFeedbackText,
  type Grading,
  type GroundingSource,
} from "./types";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
  essayHasDiagram,
  questionRequiresDiagram,
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
  "mechanism_validation": {
    "core_mechanisms_sound": boolean,
    "fatal_misconceptions_found": boolean,
    "error_evidence_quotes": string[]
  },
  "ao_breakdown": {
    "knowledge":  { "awarded": number, "out_of": number, "comment": string },
    "analysis":   { "awarded": number, "out_of": number, "comment": string },
    "evaluation": { "awarded": number, "out_of": number, "comment": string }
  },
  "total_mark": number,
  "band": string,
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
"mechanism_validation": verify causal transmission directionality before scoring.
- "error_evidence_quotes": MUST contain exact verbatim quote(s) of any false economic claims. If essay is sound, keep empty [].
- ANTI-HALLUCINATION: If there is no explicit verbatim error in the text, mark mechanisms as sound and award credit. Never invent errors.
- If fatal_misconceptions_found is true, enforce Cambridge Level Ceilings (AO2 capped at Level 1, band Lower Middle or Bottom).
- Strictly NO asterisks (* or **) in any feedback string.
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
    paper_scope_directive: buildPaperScopeDirective(maxMark),
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
  // Tariff-aware source re-ranking: prioritise Paper 4 / A-Level sources for 20-mark essays,
  // and Paper 2 / AS-Level sources for 8-mark and 12-mark essays; cap to top 6 high-signal chunks
  if (sources.length > 0) {
    const scoreSourceForTariff = (s: GroundingSource): number => {
      const title = s.documentTitle || "";
      let boost = s.similarity;
      if (maxMark >= 20) {
        if (/paper\s*4|9708[_/\s-]*[a-z0-9]+[_/\s-]*ms[_/\s-]*4|\ba\s*level\b|\ba2\b/i.test(title)) boost += 0.25;
        if (/paper\s*2[123]?|\bas\s*level\b/i.test(title)) boost -= 0.18;
        if (s.docType === "mark_scheme") boost += 0.08;
      } else {
        if (/paper\s*2[123]?|\bas\s*level\b/i.test(title)) boost += 0.2;
        if (/paper\s*4[123]?|\ba2\b/i.test(title)) boost -= 0.2;
        if (s.docType === "mark_scheme") boost += 0.06;
      }
      return boost;
    };
    sources = [...sources].sort((a, b) => scoreSourceForTariff(b) - scoreSourceForTariff(a)).slice(0, 6);
    baseSystemPrompt = `${baseSystemPrompt}\n\n${renderContext(sources, 1300, question)}`;
  }

  // Compact mark-scheme excerpt centered directly on this question's indicative content for Pass 3 & Arbitration
  const compactMarkSchemeContext = sources.length > 0 ? renderContext(sources.slice(0, 3), 550, question) : "";

  // --- calibration anchors (strictly 1 or 2, matching paper level) ----------
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

  // Authoritative AS-Level Chapter 1 (Scarcity) & Chapter 5 (PPC) rubrics — ONLY for Paper 2 (<= 12m)
  if (maxMark <= 12) {
    const touchesScarcity = /\bscarcit(y|ies)|basic economic problem|unlimited wants|finite resources\b/i.test(
      `${question} ${essayText}`,
    );
    if (touchesScarcity) {
      baseSystemPrompt = `${baseSystemPrompt}\n\n` +
        `AUTHORITATIVE CHAPTER 1 (SCARCITY) RUBRIC (PAPER 2 AS LEVEL):\n` +
        `- Scarcity = finite/limited resources cannot satisfy unlimited human wants ("finite" and "limited" are synonymous Cambridge terms; never call "limited resources" vague or a tautology; do not require opportunity cost inside the definition of scarcity itself).\n` +
        `- Rich countries experience scarcity via expanding human wants against finite factors of production — NEVER demand A-Level marginal utility or diminishing returns.`;
    }

    const touchesPpc = /\bppc\b|production possibility/i.test(`${question} ${essayText}`);
    if (touchesPpc) {
      baseSystemPrompt = `${baseSystemPrompt}\n\n` +
        `AUTHORITATIVE CHAPTER 5 (PPC & EFFICIENCY) RUBRIC (PAPER 2 AS LEVEL):\n` +
        `- Point inside PPC = Productive inefficiency (unemployed/underutilised resources), NOT allocative inefficiency.\n` +
        `- Point on PPC = Productive efficiency (may still be allocatively inefficient if output mix mismatches consumer preferences).\n` +
        `- Flag any confusion between productive and allocative inefficiency on a PPC as an analytical error and NEVER praise it.`;
    }
  }

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

  const evalRequirementBanner =
    split.ao3_marks > 0
      ? `[QUESTION SPECIFICATION: ${maxMark} Marks · EVALUATIVE ESSAY (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: ${ao3_marks})]\n` +
        `EVALUATION IS MANDATORY. The prompt contains an evaluative requirement (e.g. 'consider', 'discuss', 'assess', 'whether', 'should', 'to what extent').\n` +
        `Even if the question begins with 'Explain', any evaluative clause requires critical evaluation and a concluding judgement.\n` +
        `You MUST evaluate AO3 out of exactly ${ao3_marks} marks. NEVER state that evaluation is not required.` +
        (maxMark === 8 && split.ao3_marks === 2
          ? `\n8-MARK EVALUATION CALIBRATION (~15 minutes, AS Level): Distinguish carefully across the full 0–8 range. If the candidate presents a counter-argument and a reasoned conclusion directly addressing the prompt, award Level 2 evaluation (full 2 marks). Do NOT penalise for omitting secondary topics; credit 1–2 developed mechanisms and examples positively. Award 7–8/8 when definitions are accurate, core mechanisms are complete, and evaluation is coherent and reasoned.`
          : maxMark === 12 && split.ao3_marks === 4
            ? `\n12-MARK EVALUATION CALIBRATION (~25–30 minutes, AS Level): Standard is realistic to timed examination conditions where a student cannot cover every peripheral detail. Do NOT penalise for omitting secondary aspects when the core mechanisms are well addressed. If the candidate provides accurate definitions, 2–3 clear causal analysis points with an integrated/referenced diagram or example, and balanced evaluation with a reasoned conclusion, award Top Band (10–12/12, with 3–4/4 in AO3). Reserve Level 2 (6–8/12) for descriptive/unsupported assertions, and Lower Middle/Bottom Band (3–6/12) for directional/conceptual errors (e.g. inverted interest-rate or exchange-rate links). Focus on the quality of what is written.`
          : maxMark >= 20
            ? `\n20-MARK A LEVEL PAPER 4 CALIBRATION (~40–45 minutes): Apply official Cambridge 9708 Paper 4 Table A (AO1+AO2 out of 14: L3 11–14, L2 6–10, L1 1–5) and Table B (AO3 out of 6: L2 4–6, L1 1–3) across the FULL 0–20 range. Do NOT inflate off-focus, descriptive, or muddled scripts into Level 3: scripts wasting pages on the wrong policy or making confused/non-standard causal claims with minimal evaluation belong in Level 1 (4–6/20); sound-but-compressed scripts with limited AD/AS development or minor conceptual slips belong in Level 2 (8–12/20); concise well-reasoned scripts (~420–700 words) with accurate transmission chains, accurate diagrams/models, and developed evaluation merit Level 3 (15–19/20).`
            : "")
      : `[QUESTION SPECIFICATION: ${maxMark} Marks · NON-EVALUATIVE LEGACY ESSAY (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: 0)]\n` +
        `Pure explanatory / analytical question. Evaluation is NOT required; set AO3 awarded: 0, out_of: 0, with zero penalty.`;

  const missingRequiredDiagramBanner =
    questionRequiresDiagram(question) && !essayHasDiagram(essayText)
      ? `\n[MANDATORY CAMBRIDGE DIAGRAM AUDIT: The exam question EXPLICITLY requests a diagram, and NO diagram or pay-off matrix was detected in the submission. Under official Cambridge 9708 mark schemes ("L2 maximum if no accurate diagram provided"), AO2 Analysis MUST NOT exceed Level 2 (${maxMark >= 20 ? "max 8/12" : maxMark === 12 ? "max 4/6" : "max 3/4"}), and you MUST note the omitted diagram in weaknesses and missing_elements.diagrams.]`
      : "";

  const isComparativeBestMethodQuestion =
    split.ao3_marks > 0 &&
    /\b(best\s+(?:method|way|policy)|only\s+way|most\s+effective\s+(?:method|way|policy)|more\s+effective\s+than|single\s+best)\b/i.test(
      question,
    );
  const comparativeAuditBanner = isComparativeBestMethodQuestion
    ? `\n[MANDATORY CAMBRIDGE COMPARATIVE / ONE-SIDEDNESS AUDIT: This question asks whether a named policy/factor is the "best/only/most effective" method. Check BEFORE scoring whether the candidate ACTUALLY ANALYSES at least ONE concrete alternative policy/method with its own causal mechanism (a passing 3-word mention in the conclusion like "along with demand-side policies" does NOT count!). If the essay analyses ONLY the named policy with ZERO analysed alternative, it is strictly ONE-SIDED: cap AO2 at Level 2 low (${maxMark >= 20 ? "max 6/12" : "max 3/6"}) and AO3 at ${maxMark >= 20 ? "0–2/6" : "0–1/4"} (${maxMark === 12 ? "official Cambridge L2;4 Ev0 standard" : "Level 1"}), and flag the missing alternative analysis as the top weakness.]`
    : "";

  const userMessage =
    `${evalRequirementBanner}${missingRequiredDiagramBanner}${comparativeAuditBanner}\n\n` +
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

  // Resilient pass executor: attempts visionChat if markSchemeImages are present,
  // but cleanly falls back to standard text chat if the active provider (e.g. Groq, OpenRouter)
  // or keys do not support vision, ensuring essay grading never crashes.
  const executeExaminerPass = async (systemPrompt: string, feature: string, temperature: number) => {
    if (markSchemeImages.length) {
      try {
        return await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt,
          prompt: userMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 8192,
          userId: options.userId,
          feature,
        });
      } catch (visionErr) {
        console.warn(`[gradeEssay] visionChat failed or unsupported for ${feature}, falling back to text chat:`, visionErr);
      }
    }
    return chat({
      model: MODEL_EXAMINER,
      temperature,
      json: true,
      isBudgetTier: options.isBudgetTier,
      userId: options.userId,
      feature,
      reasoningEffort: "low",
      maxCompletionTokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
  };

  if (runSinglePass) {
    // Single pass path (used when audit is explicitly disabled)
    const res = await executeExaminerPass(pass2SystemPrompt, "grade_essay", TEMPERATURE_PASS2);

    finalGrading = normaliseGrading(extractFirstJsonObject(res.text), maxMark, split, essayText, question);
    finalGrading = applyWritingQualityGuardrail(finalGrading, qualityAnalysis, maxMark, split, essayText, question);
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
      executeExaminerPass(pass1SystemPrompt, "grade_essay_pass1_error_audit", TEMPERATURE_PASS1),
      executeExaminerPass(pass2SystemPrompt, "grade_essay_pass2_holistic", TEMPERATURE_PASS2),
    ]);

    let grading1 = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split, essayText, question);
    grading1 = applyWritingQualityGuardrail(grading1, qualityAnalysis, maxMark, split, essayText, question);
    let grading2 = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split, essayText, question);
    grading2 = applyWritingQualityGuardrail(grading2, qualityAnalysis, maxMark, split, essayText, question);

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
      // Discrepancy exceeds threshold: Principal Examiner arbitration resolves the dispute
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
          markSchemeContext: compactMarkSchemeContext,
        });
        finalGrading = arbitratedGrading;
      } catch (arbitrationErr) {
        console.warn("[grade.server] Arbitration failed, synthesizing dual passes directly:", arbitrationErr);
        finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
      }
    } else {
      // Passes converged within tolerance: synthesize both passes
      finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
    }
  }

  // --- PASS 3: SENIOR REPORT REFINER & ACCURACY AUDITOR ---------------------
  // Runs a third AI pass grounded in official Cambridge mark scheme excerpts to audit economic accuracy,
  // eliminate false praise / hallucinated penalties, calibrate marks, and ensure zero repetition.
  try {
    finalGrading = await refineExaminerReport({
      question,
      essayText,
      maxMark,
      split,
      draftGrading: finalGrading,
      userId: options.userId,
      markSchemeContext: compactMarkSchemeContext,
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
  finalGrading = cleanStars(deduplicateAcrossSections(finalGrading, question));

  return {
    grading: finalGrading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs: totalLatencyMs,
  };
}
