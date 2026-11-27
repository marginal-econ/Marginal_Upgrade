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
import { formatNeuroSymbolicDirective, runNeuroSymbolicAudit } from "./causal-graph.server";
import { isSameScript, runComparativeJudgement } from "./comparative-judgement.server";
import {
  buildLongEssayArgumentMapIfNeeded,
  runDecomposedAoAudit,
  type DecomposedAoAudit,
} from "./decomposed-ao.server";
import { callOrthogonalFamily, type OrthogonalFamily } from "./multi-family-pool.server";
import { runDynamicRubricAudit, type RubricAuditResult } from "./rubric-auditor.server";
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
  applyNeuroSymbolicGuardrail,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
  essayHasDiagram,
  questionRequiresDiagram,
  type EssayQualityAnalysis,
} from "./writing-quality.server";

/**
 * Adjusts a Grading object's AO breakdown cleanly to match a calibrated target total mark
 * (used when the Psychometric Ensemble locks the final mark across orthogonal families).
 */
function alignGradingToTargetMark(
  grading: Grading,
  targetMark: number,
  maxMark: number,
  split: AoSplit,
  minAo3 = 0,
): Grading {
  const clampedTarget = Math.max(0, Math.min(maxMark, Math.round(targetMark)));
  let ao1 = Math.max(0, Math.min(split.ao1_marks, grading.ao_breakdown.knowledge.awarded));
  let ao2 = Math.max(0, Math.min(split.ao2_marks, grading.ao_breakdown.analysis.awarded));
  let ao3 = Math.max(0, Math.min(split.ao3_marks, grading.ao_breakdown.evaluation.awarded));
  let delta = clampedTarget - (ao1 + ao2 + ao3);

  while (delta > 0) {
    if (ao2 < split.ao2_marks) {
      ao2++;
    } else if (split.ao3_marks > 0 && ao3 < split.ao3_marks) {
      ao3++;
    } else if (ao1 < split.ao1_marks) {
      ao1++;
    } else {
      break;
    }
    delta--;
  }
  const protectedAo3 = Math.max(0, Math.min(split.ao3_marks, minAo3));
  while (delta < 0) {
    if (split.ao3_marks > 0 && ao3 > protectedAo3) {
      ao3--;
    } else if (ao2 > 0) {
      ao2--;
    } else if (split.ao3_marks > 0 && ao3 > 0) {
      ao3--;
    } else if (ao1 > 0) {
      ao1--;
    } else {
      break;
    }
    delta++;
  }

  const total = ao1 + ao2 + ao3;
  return {
    ...grading,
    total_mark: total,
    band: bandFor(total, maxMark),
    ao_breakdown: {
      knowledge: { ...grading.ao_breakdown.knowledge, awarded: ao1, out_of: split.ao1_marks },
      analysis: { ...grading.ao_breakdown.analysis, awarded: ao2, out_of: split.ao2_marks },
      evaluation: { ...grading.ao_breakdown.evaluation, awarded: ao3, out_of: split.ao3_marks },
    },
  };
}

/**
 * Marginal Engine V6 — 5-Signal Trimmed-Mean Psychometric Fusion Engine.
 *
 * Combines FIVE independent orthogonal signals on 100% Free Groq keys:
 *  - P1     (OpenAI 120B Holistic Error Auditor)
 *  - P2     (Qwen 3.8 27B Holistic Positive Marker)
 *  - Decomp (Zero-Halo-Effect Decomposed AO1+AO2 + AO3 Micro-Specialists)
 *  - Rubric (Dynamic Question-Rubric & Evidence-Chain Auditor on OpenAI 20B)
 *  - Comp   (Topic-Matched Blind Comparative Judgement when balanced anchors exist)
 * Uses an unbiased Trimmed Mean (dropping min & max outlier when >= 4 signals exist)
 * plus generalizable Cambridge evidence guardrails (off-focus, fatal sign-flip, descriptive L2 cap).
 */
function computePsychometricEnsembleMark(params: {
  p1: number;
  p2: number;
  compMark: number | null;
  decomposed: DecomposedAoAudit | null;
  rubric?: RubricAuditResult | null;
  maxMark: number;
  fatalViolations: number;
  moderateViolations?: number;
}): number {
  const {
    p1,
    p2,
    compMark,
    decomposed,
    rubric = null,
    maxMark,
    fatalViolations,
    moderateViolations = 0,
  } = params;

  // 1. Collect all valid independent mark signals
  const signals: number[] = [p1, p2];
  if (decomposed && decomposed.decomposedTotal > 0) {
    signals.push(decomposed.decomposedTotal);
  }
  if (rubric && rubric.rubricEstimatedMark > 0) {
    signals.push(rubric.rubricEstimatedMark);
  }
  if (compMark !== null) {
    // Only include Comp if it doesn't wildly inflate a low-band P1/P2 consensus
    const isLowBandConsensus = Math.max(p1, p2) <= Math.round(maxMark * 0.45);
    if (!(isLowBandConsensus && compMark > Math.max(p1, p2) + 1)) {
      signals.push(compMark);
    }
  }

  // 2. Unbiased Trimmed-Mean / Median Fusion (eliminates single-pass outliers & +1 hi-bias)
  const sorted = [...signals].sort((a, b) => a - b);
  let fused: number;
  if (sorted.length >= 4) {
    const trimmed = sorted.slice(1, -1);
    const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    fused = fatalViolations > 0 || moderateViolations > 0 ? Math.floor(avg) : Math.round(avg);
  } else if (sorted.length === 3) {
    fused = sorted[1];
  } else {
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    fused = Math.round(avg);
  }

  // 3. Generalizable Cambridge Evidence Guardrails
  const severeOffFocus =
    (decomposed !== null &&
      decomposed.wrongDirectionParagraphs >= 1 &&
      decomposed.onFocusRatio < 0.75) ||
    (rubric !== null &&
      rubric.offFocusParagraphs >= 1 &&
      (decomposed === null || decomposed.onFocusRatio < 0.78));

  if (severeOffFocus) {
    const level1Ceiling = maxMark >= 20 ? 6 : maxMark === 12 ? 4 : 3;
    fused = Math.min(fused, level1Ceiling);
  }

  if (fatalViolations > 0) {
    const fatalCeiling = maxMark >= 20 ? 8 : maxMark === 12 ? 5 : 4;
    fused = Math.min(fused, fatalCeiling);
  }

  // 20m Paper 4 Level-2 Descriptive/Buzzword Ceiling: only cap at 12/20 when BOTH
  // Rubric Auditor and Decomposed AO agree the script lacks developed models AND neither
  // holistic examiner placed it solidly in Top Band (>= 15/20).
  if (maxMark >= 20 && Math.max(p1, p2) < 15) {
    const rubricDescriptive = rubric !== null && rubric.chainQuality === "descriptive_assertions";
    const decompDescriptive =
      decomposed !== null && decomposed.developedFrameworkCount <= 1 && decomposed.ao2Awarded <= 8;
    if (rubricDescriptive && decompDescriptive && fused > 12) {
      fused = 12;
    }
  }

  // 12m Unreferenced Diagram + Generic/Asserted AO3 Ceiling: prevents Level 2 scripts from drifting into Top Band
  if (
    maxMark === 12 &&
    rubric !== null &&
    rubric.unreferencedDiagram &&
    (rubric.ao3Verdict === "asserted_generic" || rubric.ao3Verdict === "none") &&
    fused > 8
  ) {
    fused = 8;
  }

  return Math.max(0, Math.min(maxMark, fused));
}

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

  // --- STAGE 0: NEURO-SYMBOLIC CAUSAL-GRAPH AUDIT (<5ms deterministic) -------
  const neuroSymbolicDossier = runNeuroSymbolicAudit(essayText, question);
  const neuroSymbolicDirective = formatNeuroSymbolicDirective(neuroSymbolicDossier);

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
    sources = [...sources].sort((a, b) => scoreSourceForTariff(b) - scoreSourceForTariff(a)).slice(0, 4);
    baseSystemPrompt = `${baseSystemPrompt}\n\n${renderContext(sources, 750, question)}`;
  }

  // Compact mark-scheme excerpt centered directly on this question's indicative content for Pass 3 & Arbitration
  const compactMarkSchemeContext = sources.length > 0 ? renderContext(sources.slice(0, 3), 550, question) : "";

  // --- calibration anchors (1 concise in-prompt anchor + 3 stratified in Comparative Judge) -
  let anchors: any[] = [];
  try {
    anchors = await fetchCalibrationAnchors(supabase);
  } catch (anchorErr) {
    console.warn("[grade.server] Error fetching calibration anchors, proceeding with standard rubrics:", anchorErr);
    anchors = [];
  }
  // Strictly exclude any anchor matching the candidate script itself (zero leakage in LOO benchmarks or re-submissions)
  const leakFreeAnchors = anchors.filter((a) => !isSameScript(essayText, a.essay_text));
  const selectedAnchors = selectBestAnchors(leakFreeAnchors, question, maxMark, 1);
  const anchorBlock = buildAnchorBlock(selectedAnchors, question, maxMark);
  if (anchorBlock) baseSystemPrompt = `${baseSystemPrompt}\n\n${anchorBlock}`;
  const actualAnchorsCount = Math.min(2, Math.max(selectedAnchors.length > 0 ? 1 : 0, selectedAnchors.length));

  // Inject Stage 0 Neuro-Symbolic Deterministic Audit into examiner context
  baseSystemPrompt = `${baseSystemPrompt}\n\n${neuroSymbolicDirective}`;

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

  // For very long Paper 4 essays (>4,200 chars), build a lossless structured argument transcript
  // on free openai/gpt-oss-20b so Pass 1 & Pass 2 never hit Groq TPM ceilings or truncate JSON.
  const promptEssayText = await buildLongEssayArgumentMapIfNeeded(question, essayText, options.userId);

  const userMessage =
    `${evalRequirementBanner}${missingRequiredDiagramBanner}${comparativeAuditBanner}\n\n` +
    `EXAM QUESTION TO MARK IN FULL DEPTH (${maxMark} marks):\n` +
    `"""\n${question}\n"""\n\n` +
    `STUDENT ESSAY SUBMISSION:\n` +
    `"""\n${promptEssayText}\n"""${imageNote}\n\n` +
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
  // otherwise routes to the designated orthogonal frontier model family
  // (OpenAI 120B vs Google Gemini 3 Flash vs Qwen 3.8 27B) with automatic fallback.
  const executeExaminerPass = async (
    systemPrompt: string,
    feature: string,
    temperature: number,
    family: OrthogonalFamily,
  ) => {
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
        console.warn(`[gradeEssay] visionChat failed or unsupported for ${feature}, falling back to orthogonal text family:`, visionErr);
      }
    }
    return callOrthogonalFamily({
      family,
      temperature,
      json: true,
      userId: options.userId,
      feature,
      maxCompletionTokens: 6144,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
  };

  let comparativeJudgement: Awaited<ReturnType<typeof runComparativeJudgement>> = null;
  let pass1Mark = 0;
  let pass1Model = "openai/gpt-oss-120b";
  let pass2Mark = 0;
  let pass2Model = "qwen/qwen3.8-27b";

  if (runSinglePass) {
    // Single pass path (used when audit is explicitly disabled)
    const res = await executeExaminerPass(pass2SystemPrompt, "grade_essay", TEMPERATURE_PASS2, "openai_120b");

    finalGrading = normaliseGrading(extractFirstJsonObject(res.text), maxMark, split, essayText, question);
    finalGrading = applyWritingQualityGuardrail(finalGrading, qualityAnalysis, maxMark, split, essayText, question);
    finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);
    if (finalGrading.off_syllabus) {
      throw new OffSyllabusError(
        finalGrading.detected_subject || "another subject",
        finalGrading.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
      );
    }
    pass1Mark = finalGrading.total_mark;
    pass2Mark = finalGrading.total_mark;
    pass1Model = res.model || pass1Model;
    pass2Model = res.model || pass2Model;
    promptTokens = res.promptTokens;
    completionTokens = res.completionTokens;
    latencyMs = res.latencyMs;
    activeModel = res.model || MODEL_EXAMINER;
    keyRotated = Boolean(res.keyRotated);
  } else {
    // --- STAGE 1: V6 5-SIGNAL FREE-GROQ ORTHOGONAL PANEL (PARALLEL) ----------
    // Signal 1 (OpenAI 120B @ temp 0.0): Holistic Analytical & Causal-Graph Auditor
    // Signal 2 (Qwen 3.8 27B @ temp 0.15): Holistic Positive-Marking Cambridge Moderator
    // Signal 3 (OpenAI 120B @ temp 0.0): Topic-Matched Blind Comparative Judgement vs real Cambridge ECRs
    // Signal 4 (OpenAI 120B + Qwen 27B): Decomposed Zero-Halo AO1+AO2 / AO3 & Off-Focus Specialists
    // Signal 5 (OpenAI 20B @ temp 0.0): Dynamic Question-Rubric & Evidence-Chain Auditor
    const [first, second, compResult, decomposedResult, rubricResult] = await Promise.all([
      executeExaminerPass(pass1SystemPrompt, "grade_essay_pass1_error_audit", TEMPERATURE_PASS1, "openai_120b"),
      executeExaminerPass(pass2SystemPrompt, "grade_essay_pass2_holistic", 0.15, "qwen_27b"),
      runComparativeJudgement({
        question,
        essayText,
        maxMark,
        split,
        anchors: leakFreeAnchors,
        userId: options.userId,
      }),
      runDecomposedAoAudit({
        question,
        essayText,
        maxMark,
        split,
        userId: options.userId,
      }),
      runDynamicRubricAudit({
        question,
        essayText,
        maxMark,
        split,
        userId: options.userId,
      }),
    ]);

    comparativeJudgement = compResult;

    const raw1 = extractFirstJsonObject(first.text) as Record<string, unknown>;
    const raw2 = extractFirstJsonObject(second.text) as Record<string, unknown>;
    const valid1 = raw1 && typeof raw1 === "object" && Object.keys(raw1).length > 0 && "ao_breakdown" in raw1;
    const valid2 = raw2 && typeof raw2 === "object" && Object.keys(raw2).length > 0 && "ao_breakdown" in raw2;

    let grading1 = normaliseGrading(valid1 ? raw1 : raw2, maxMark, split, essayText, question);
    grading1 = applyWritingQualityGuardrail(grading1, qualityAnalysis, maxMark, split, essayText, question);
    grading1 = applyNeuroSymbolicGuardrail(grading1, neuroSymbolicDossier, maxMark, split);
    let grading2 = normaliseGrading(valid2 ? raw2 : raw1, maxMark, split, essayText, question);
    grading2 = applyWritingQualityGuardrail(grading2, qualityAnalysis, maxMark, split, essayText, question);
    grading2 = applyNeuroSymbolicGuardrail(grading2, neuroSymbolicDossier, maxMark, split);

    // Guard against truncated JSON where one pass (or both) salvaged 0 marks on a non-empty, on-syllabus essay
    if (grading2.total_mark === 0 && !grading2.off_syllabus && grading1.total_mark >= 3) {
      grading2 = grading1;
    } else if (grading1.total_mark === 0 && !grading1.off_syllabus && grading2.total_mark >= 3) {
      grading1 = grading2;
    } else if (
      grading1.total_mark === 0 &&
      grading2.total_mark === 0 &&
      !grading1.off_syllabus &&
      !grading2.off_syllabus &&
      decomposedResult &&
      decomposedResult.decomposedTotal >= 3
    ) {
      grading1 = alignGradingToTargetMark(grading1, decomposedResult.decomposedTotal, maxMark, split);
      grading2 = alignGradingToTargetMark(grading2, decomposedResult.decomposedTotal, maxMark, split);
    }

    if (grading1.off_syllabus || grading2.off_syllabus) {
      const rejected = grading1.off_syllabus ? grading1 : grading2;
      throw new OffSyllabusError(
        rejected.detected_subject || "another subject",
        rejected.examiner_summary || "The examiner flagged this submission as outside the Cambridge 9708 Economics syllabus.",
      );
    }

    pass1Mark = grading1.total_mark;
    pass1Model = first.model || pass1Model;
    pass2Mark = grading2.total_mark;
    pass2Model = second.model || pass2Model;

    promptTokens = (first.promptTokens ?? 0) + (second.promptTokens ?? 0);
    completionTokens = (first.completionTokens ?? 0) + (second.completionTokens ?? 0);
    latencyMs = Math.max(first.latencyMs, second.latencyMs);
    activeModel = `${pass1Model} + ${pass2Model}`;
    keyRotated = Boolean(first.keyRotated || second.keyRotated);

    // --- STAGE 2: V5 4-SIGNAL PSYCHOMETRIC LOCKED-ENSEMBLE RECONCILIATION ----
    const disputeCheck = shouldTriggerArbitration(grading1, grading2, maxMark);
    const fatalViolations = neuroSymbolicDossier.violations.filter((v) => v.severity === "fatal").length;
    const moderateViolations = neuroSymbolicDossier.violations.filter((v) => v.severity === "moderate").length;
    const lockedEnsembleMark = computePsychometricEnsembleMark({
      p1: grading1.total_mark,
      p2: grading2.total_mark,
      compMark: comparativeJudgement?.estimatedMark ?? null,
      decomposed: decomposedResult,
      rubric: rubricResult,
      maxMark,
      fatalViolations,
      moderateViolations,
    });
    const protectedAo3Min =
      decomposedResult &&
      decomposedResult.ao3Awarded >= 2 &&
      neuroSymbolicDossier.ao3CriteriaMatched.length >= 2 &&
      fatalViolations === 0
        ? Math.min(2, decomposedResult.ao3Awarded)
        : 0;

    if (disputeCheck.shouldArbitrate) {
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
          neuroSymbolicSummary: neuroSymbolicDirective,
          comparativeJudgement,
        });
        // Anchor arbitration within ±1 mark of the 3-signal psychometric median so it never swings wildly
        const clampedArbMark = Math.max(
          lockedEnsembleMark - 1,
          Math.min(lockedEnsembleMark + 1, arbitratedGrading.total_mark),
        );
        finalGrading = alignGradingToTargetMark(
          arbitratedGrading,
          clampedArbMark,
          maxMark,
          split,
          protectedAo3Min,
        );
      } catch (arbitrationErr) {
        console.warn("[grade.server] Arbitration failed, synthesizing dual passes directly:", arbitrationErr);
        const baseSynth = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
        finalGrading = alignGradingToTargetMark(
          baseSynth,
          lockedEnsembleMark,
          maxMark,
          split,
          protectedAo3Min,
        );
      }
    } else {
      // Orthogonal families converged: synthesize prose and lock to Psychometric Ensemble Mark
      const baseSynth = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
      finalGrading = alignGradingToTargetMark(
        baseSynth,
        lockedEnsembleMark,
        maxMark,
        split,
        protectedAo3Min,
      );
    }
    finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);
  }

  // --- STAGE 3: SENIOR REPORT REFINER (PROSE & CONSISTENCY POLISH, MARK LOCKED) ---
  // Preserves the calibrated V4.1 Psychometric Ensemble Mark so Pass 3 never introduces
  // erratic mark drift while still refining examiner prose, deduplication, and quote accuracy.
  const preRefineLockedMark = finalGrading.total_mark;
  try {
    finalGrading = await refineExaminerReport({
      question,
      essayText,
      maxMark,
      split,
      draftGrading: finalGrading,
      userId: options.userId,
      markSchemeContext: compactMarkSchemeContext,
      neuroSymbolicSummary: neuroSymbolicDirective,
      comparativeJudgement,
      lockTotalMark: preRefineLockedMark,
    });
  } catch (refineErr) {
    console.warn("[grade.server] Pass 3 refinement error, proceeding with cleansed draft:", refineErr);
  }
  finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);

  // Compute Conformal Prediction Interval from inter-family spread + comparative judgement
  const panelMarks = [pass1Mark, pass2Mark, finalGrading.total_mark];
  if (comparativeJudgement) panelMarks.push(comparativeJudgement.estimatedMark);
  const interFamilySpread = Math.max(...panelMarks) - Math.min(...panelMarks);
  const halfWidth = Math.max(1, Math.min(maxMark >= 20 ? 3 : 2, Math.ceil(interFamilySpread / 2)));
  const conformalInterval = {
    low: Math.max(0, finalGrading.total_mark - halfWidth),
    high: Math.min(maxMark, finalGrading.total_mark + halfWidth),
    coverage: interFamilySpread <= 2 ? 0.92 : 0.85,
  };

  finalGrading.neuro_symbolic = neuroSymbolicDossier;
  finalGrading.comparative_judgement = comparativeJudgement ?? undefined;
  finalGrading.rm_annotations = neuroSymbolicDossier.rmAnnotations;
  finalGrading.ensemble_panel = {
    families: comparativeJudgement
      ? [pass1Model, pass2Model, comparativeJudgement.judgeModel]
      : [pass1Model, pass2Model],
    pass1Mark,
    pass1Model,
    pass2Mark,
    pass2Model,
    comparativeMark: comparativeJudgement?.estimatedMark ?? null,
    interFamilySpread,
    conformalInterval,
  };

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
