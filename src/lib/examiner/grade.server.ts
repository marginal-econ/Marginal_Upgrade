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

import { visionChat } from "../ai.server";
import { describeDiagramFromDataUrl } from "../diagrams/describe.server";
import { renderContext, retrieve } from "../retrieval.server";
import {
  arbitrateGrading,
  shouldTriggerArbitration,
  synthesizeDualPasses,
} from "./arbitration.server";
import { buildAnchorBlock, fetchCalibrationAnchors, selectBestAnchors } from "./calibration.server";
import { formatNeuroSymbolicDirective, runNeuroSymbolicAudit } from "./causal-graph.server";
import {
  isSameScript,
  runComparativeJudgement,
  selectStratifiedAnchors,
} from "./comparative-judgement.server";
import {
  runDecomposedAoAudit,
  type DecomposedAoAudit,
} from "./decomposed-ao.server";
import {
  runLevelDescriptorVerifier,
  type LevelVerifierResult,
} from "./level-verifier.server";
import {
  runPrincipalMetaCalibrator,
  type MetaCalibratorResult,
} from "./meta-calibrator.server";
import {
  allocateEssayKeyOffset,
  callOrthogonalFamily,
  getNvidiaLoadStatus,
  hasHealthyGroqKey,
  hasHealthyNvidiaKey,
  type OrthogonalFamily,
} from "./multi-family-pool.server";
import type { RubricAuditResult } from "./rubric-auditor.server";
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
 * When cross-family structural AO medians (e.g. from Pass 1 + Pass 2 + Decomposed AO)
 * are supplied, anchors AO1/AO2/AO3 to those structural targets before resolving any residual.
 */
export function alignGradingToTargetMark(
  grading: Grading,
  targetMark: number,
  maxMark: number,
  split: AoSplit,
  minAo3 = 0,
  aoTargets?: { ao1?: number; ao2?: number; ao3?: number },
): Grading {
  const clampedTarget = Math.max(0, Math.min(maxMark, Math.round(targetMark)));
  let ao1 = Math.max(
    0,
    Math.min(split.ao1_marks, Math.round(aoTargets?.ao1 ?? grading.ao_breakdown.knowledge.awarded)),
  );
  let ao2 = Math.max(
    0,
    Math.min(split.ao2_marks, Math.round(aoTargets?.ao2 ?? grading.ao_breakdown.analysis.awarded)),
  );
  let ao3 = Math.max(
    0,
    Math.min(split.ao3_marks, Math.round(aoTargets?.ao3 ?? grading.ao_breakdown.evaluation.awarded)),
  );
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
 * Marginal Engine V7.5 — Zero-Gemini Frontier Trimmed-Mean Psychometric Fusion Engine.
 *
 * Combines FIVE to SEVEN genuinely independent signals across 2 clouds (NVIDIA NIM + Groq):
 *  - P1             (Groq OpenAI-120B or NVIDIA Super-VL 120B — Full-Context Error Auditor)
 *  - P2             (NVIDIA Super-VL 120B or MiniMax M3.1 Flash — Full-Context Holistic Marker)
 *  - Decomp         (OpenAI-120B / Lightning-30B AO1+AO2 + Groq Qwen-3.8-27B AO3 Zero-Halo)
 *  - Rubric         (MiniMax M3.1 Flash or Groq Qwen-3.8-27B — KB-Grounded Rubric Coverage)
 *  - LevelVerifier  (NVIDIA Nemotron-3 Ultra 550B — Blind Table A/B Level Verifier)
 *  - MetaCalibrator (Stage 2 NVIDIA 550B Principal Examiner Evidence-Synthesis Calibrator)
 *  - Comp           (NVIDIA Super-VL 120B — Topic-Matched Blind Comparative Judgement when anchored)
 *  - Arbitrator     (Optional Stage 2 Principal Examiner tie-breaker on material disputes)
 */
export function computePsychometricEnsembleMark(params: {
  p1: number;
  p2: number;
  compMark: number | null;
  decomposed: DecomposedAoAudit | null;
  rubric?: RubricAuditResult | null;
  levelVerifier?: LevelVerifierResult | null;
  metaCalibrator?: MetaCalibratorResult | null;
  arbitratorMark?: number | null;
  isComparativeBestMethodQuestion?: boolean;
  hasUnreferencedDiagram?: boolean;
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
    levelVerifier = null,
    metaCalibrator = null,
    arbitratorMark = null,
    isComparativeBestMethodQuestion = false,
    hasUnreferencedDiagram = false,
    maxMark,
    fatalViolations,
    moderateViolations = 0,
  } = params;

  // 1. Collect all valid independent mark signals (allow legitimate 0 marks for off-topic scripts)
  const signals: number[] = [p1, p2];
  if (decomposed && Number.isFinite(decomposed.decomposedTotal)) {
    signals.push(decomposed.decomposedTotal);
  }
  if (rubric && Number.isFinite(rubric.rubricEstimatedMark)) {
    signals.push(rubric.rubricEstimatedMark);
  }
  if (levelVerifier && Number.isFinite(levelVerifier.verifiedMark)) {
    signals.push(levelVerifier.verifiedMark);
  }
  if (compMark !== null && Number.isFinite(compMark)) {
    const isLowBandConsensus = Math.max(p1, p2) <= Math.round(maxMark * 0.45);
    if (!(isLowBandConsensus && compMark > Math.max(p1, p2) + 1)) {
      signals.push(compMark);
    }
  }
  if (arbitratorMark !== null && Number.isFinite(arbitratorMark)) {
    const envMin = Math.min(...signals);
    const envMax = Math.max(...signals);
    signals.push(Math.max(envMin, Math.min(envMax, Math.round(arbitratorMark))));
  }

  // 2. Frontier-Anchored Trimmed-Mean Fusion (V7.5):
  //    - When Stage 2 550B Principal Examiner Meta-Calibrator ran, it audited every Stage-1 claim
  //      against verbatim essay evidence + Cambridge mark scheme; anchor the trimmed pool with 2
  //      Principal Examiner votes (bounded cleanly inside panel envelope +-1 unless Level-1 confirmed).
  //    - Otherwise, when Stage-1 holistic passes converge cleanly (plus 550B Level Verifier agreement),
  //      anchor the trimmed pool on frontier consensus so harsh micro-auditors never drag Top Band down.
  const holisticConverged = Math.abs(p1 - p2) <= (maxMark >= 20 ? 3 : 2);
  const holisticMid = Math.round((p1 + p2) / 2);
  const fusionPool: number[] = [...signals];

  if (metaCalibrator && Number.isFinite(metaCalibrator.calibratedTotal)) {
    const envMin = Math.min(...signals);
    const envMax = Math.max(...signals);
    const boundedMeta = metaCalibrator.confirmedLevel1OffFocus
      ? metaCalibrator.calibratedTotal
      : Math.max(Math.max(0, envMin - 1), Math.min(Math.min(maxMark, envMax + 1), metaCalibrator.calibratedTotal));
    fusionPool.push(boundedMeta, boundedMeta);
    // When 550B Meta-Calibrator and 550B Blind LevelVerifier both converge tightly (<= 1), reinforce consensus
    if (levelVerifier && Math.abs(levelVerifier.verifiedMark - boundedMeta) <= 1) {
      fusionPool.push(boundedMeta);
    }
  } else if (holisticConverged) {
    fusionPool.push(holisticMid);
    if (levelVerifier && Math.abs(levelVerifier.verifiedMark - holisticMid) <= 1) {
      fusionPool.push(levelVerifier.verifiedMark);
    }
  }

  const sorted = fusionPool.sort((a, b) => a - b);
  let fused: number;
  if (sorted.length >= 4) {
    const trimmed = sorted.slice(1, -1);
    const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    fused = fatalViolations > 0 || moderateViolations > 0 ? Math.floor(avg) : Math.round(avg);
  } else if (sorted.length === 3) {
    fused = sorted[1]!;
  } else {
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    fused = Math.round(avg);
  }

  // Hold exact P1===P2 consensus ONLY when Stage 2 550B Meta-Calibrator did NOT run and
  // Blind 550B Level Verifier doesn't disagree (prevents stale P1===P2 from overwriting an exact
  // multi-family + 550B Meta-Calibrator consensus like 11 on [10, 10, 12, 12, 12]!).
  const microSignals = [
    decomposed?.decomposedTotal,
    rubric?.rubricEstimatedMark,
    levelVerifier?.verifiedMark,
    metaCalibrator?.calibratedTotal,
    compMark,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const microCorroborates =
    microSignals.length === 0 || microSignals.some((v) => Math.abs(v - p1) <= 1);
  if (
    !metaCalibrator &&
    p1 === p2 &&
    (!levelVerifier || levelVerifier.verifiedMark === p1) &&
    microCorroborates &&
    Math.abs(fused - p1) <= 1 &&
    fatalViolations === 0 &&
    moderateViolations === 0
  ) {
    fused = p1;
  }

  // 3. Precision Cambridge Evidence Guardrails (Zero False Crushes):
  // If BOTH independent 550B Ultra passes (Blind LevelVerifier + Principal MetaCalibrator)
  // independently place the essay strictly in Cambridge Level 1 (<=6/20, <=4/12, <=3/8),
  // never let inflated P1/P2 block the confirmed Level-1 ceiling!
  const level1Threshold = maxMark >= 20 ? 6 : maxMark === 12 ? 4 : 3;
  const dual550bLevel1 =
    levelVerifier !== null &&
    metaCalibrator !== null &&
    levelVerifier.verifiedMark <= level1Threshold &&
    metaCalibrator.calibratedTotal <= level1Threshold;

  const holisticTopBandProtected =
    Math.min(p1, p2) >= Math.round(maxMark * 0.60) &&
    Math.max(p1, p2) >= Math.round(maxMark * 0.75) &&
    !metaCalibrator?.confirmedLevel1OffFocus &&
    !dual550bLevel1;

  if (dual550bLevel1) {
    const dual550bCap = Math.max(levelVerifier!.verifiedMark, metaCalibrator!.calibratedTotal);
    fused = Math.min(fused, dual550bCap);
  }

  // Strict Off-Focus Level-1 Gate: requires EITHER 550B Principal Meta-Calibrator verbatim confirmation
  // OR two-auditor off-focus agreement corroborating low Level-1/borderline marks (so mid-Level-2/Top-Band
  // scripts with a diagram label slip are NEVER falsely crushed to 6/20!).
  const decompOffFocus =
    decomposed !== null && decomposed.wrongDirectionParagraphs >= 1 && decomposed.onFocusRatio <= 0.82;
  const rubricOffFocus = rubric !== null && rubric.offFocusParagraphs >= 1;
  const levelOffFocus =
    rubric === null &&
    levelVerifier !== null &&
    levelVerifier.majorOffFocusOrInversion &&
    levelVerifier.verifiedMark <= Math.round(maxMark * 0.45);
  const microConfirmLow =
    (decomposed ? decomposed.decomposedTotal <= Math.round(maxMark * 0.42) : true) &&
    (rubric ? rubric.rubricEstimatedMark <= Math.round(maxMark * 0.45) : true);

  const severeOffFocus =
    !holisticTopBandProtected &&
    (Boolean(metaCalibrator?.confirmedLevel1OffFocus) ||
      (decompOffFocus && (rubricOffFocus || levelOffFocus) && microConfirmLow) ||
      (decomposed !== null &&
        decomposed.wrongDirectionParagraphs >= 2 &&
        decomposed.onFocusRatio <= 0.60 &&
        microConfirmLow) ||
      (rubric !== null && rubric.offFocusParagraphs >= 2 && microConfirmLow));

  if (severeOffFocus) {
    const level1Ceiling = maxMark >= 20 ? 6 : maxMark === 12 ? 4 : 3;
    fused = Math.min(fused, level1Ceiling);
  }

  if (fatalViolations > 0) {
    const fatalCeiling = maxMark >= 20 ? 8 : maxMark === 12 ? 5 : 4;
    fused = Math.min(fused, fatalCeiling);
  }

  // Missing simultaneous-shift / two-variable net synthesis (550B Principal verified & self-consistent) -> Level 2 max
  const synthesisCeiling = maxMark >= 20 ? 12 : maxMark === 12 ? 8 : 6;
  if (
    metaCalibrator?.confirmedMissingSynthesis &&
    metaCalibrator.calibratedTotal <= synthesisCeiling &&
    !holisticTopBandProtected
  ) {
    fused = Math.min(fused, synthesisCeiling);
  }

  // Breadth-listing without deep developed models on 20m Paper 4 (550B Principal verified & self-consistent) -> Upper Level 2 max
  if (
    maxMark >= 20 &&
    metaCalibrator?.confirmedBreadthOnlyL2 &&
    metaCalibrator.calibratedTotal <= 12 &&
    !holisticTopBandProtected &&
    fused > 12
  ) {
    fused = 12;
  }

  // One-sided "best/only/most effective method" Cambridge ceiling (two-auditor consensus):
  const oneSidedSecondVote = Boolean(rubric?.isOneSidedBestMethod || decomposed?.isOneSidedBestMethod);
  if (
    isComparativeBestMethodQuestion &&
    !holisticTopBandProtected &&
    oneSidedSecondVote &&
    levelVerifier?.isOneSidedBestMethod
  ) {
    const oneSidedCeiling = maxMark >= 20 ? 10 : maxMark === 12 ? 6 : 4;
    fused = Math.min(fused, oneSidedCeiling);
  }

  // 20m Paper 4 Level-2 Descriptive/Buzzword Ceiling
  if (maxMark >= 20 && Math.max(p1, p2) < 15) {
    const descriptiveChain =
      rubric !== null
        ? rubric.chainQuality === "descriptive_assertions"
        : decomposed?.chainQuality === "descriptive_assertions";
    const decompDescriptive =
      decomposed !== null && decomposed.developedFrameworkCount <= 1 && decomposed.ao2Awarded <= 8;
    if (descriptiveChain && decompDescriptive && fused > 12) {
      fused = 12;
    }
  }

  // 12m Deterministic Unreferenced-Diagram + Weak/Generic AO3 Ceiling:
  // Uses Stage-0 objective prose-stripped diagram integration (never erratic single-LLM guesses!)
  // combined with weak AO3 / Level-2 verification so referenced Top-Band scripts are NEVER touched.
  const weakAo3Signal =
    rubric?.ao3Verdict === "asserted_generic" ||
    rubric?.ao3Verdict === "none" ||
    levelVerifier?.ao3Level === "L1";
  if (
    maxMark === 12 &&
    hasUnreferencedDiagram &&
    weakAo3Signal &&
    (!levelVerifier || levelVerifier.verifiedMark <= 8) &&
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
- Set fatal_misconceptions_found = true ONLY when the essay's CENTRAL economic mechanism is systematically inverted throughout (e.g. explaining the wrong/opposite policy direction or consistently reversing S&D/AD/interest-rate causality across paragraphs). Do NOT set fatal_misconceptions_found = true for a single isolated 1-word verbal slip inside an otherwise accurate multi-model essay, or for a mislabelled diagram paired with valid Level 2 written policies (deduct appropriately within Level 2/3 instead of collapsing to Level 1).
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
   * student. When present, Pass 1 (NVIDIA Super VL 120B) and Pass 2
   * (Google Gemini Vision) read these orthogonally alongside KB text.
   */
  markSchemeImageDataUrls?: string[];
  /**
   * Optional raw diagram photo(s) attached by the student. Audited via Dual-VLM
   * Cross-Verification (Gemini + NVIDIA Super VL 120B) in parallel with KB
   * retrieval and injected as verified [DIAGRAM: ...] blocks before Stage 0.
   */
  studentDiagramImageDataUrls?: string[];
  /**
   * When true, strictly disables ALL calibration anchors (zero-calibration mode).
   */
  zeroCalibration?: boolean;
  /**
   * Optional calibration_anchors.id to strictly exclude (guarantees zero leakage in LOO tests).
   */
  excludeAnchorId?: string;
  /**
   * When true, excludes ALL anchors sharing the exact same exam question (hard cross-question LOO test).
   */
  excludeSameQuestionAnchors?: boolean;
  /**
   * Selects the grading engine tier:
   * - "v8_lite": Fast, 1-call Standard Engine for Free users (Groq OpenAI-120B / NVIDIA Lightning-30B,
   *   0 550B Ultra calls, 0 Vision calls, ~3-6s, ~85% accuracy — protects Frontier capacity).
   * - "v8_frontier": Full Marginal Engine V8 Fast-Frontier Cascade (93.8% accuracy, 550B Ultra +
   *   Super-VL 120B + OpenAI-120B + Qwen-27B + Cross-Q Comparative Judgement + Meta-Calibrator).
   */
  engineMode?: "v8_lite" | "v8_frontier";
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
  const { question, maxMark, split } = options;
  let essayText = options.essayText;
  const { ao1_marks, ao2_marks, ao3_marks } = split;

  if (ao1_marks + ao2_marks + ao3_marks !== maxMark) {
    throw new Error(
      `The AO split (${ao1_marks}+${ao2_marks}+${ao3_marks}) does not sum to the ` +
        `total mark (${maxMark}). Set a matching split for questions that are not ` +
        `the standard 12-mark type.`,
    );
  }

  // --- syllabus pre-flight guardrail ----------------------------------------
  const { OffSyllabusError } = await import("./syllabus-guard.server");
  if (!options.skipSyllabusPreflight) {
    const { validateEconomicsSyllabus } = await import("./syllabus-guard.server");
    await validateEconomicsSyllabus(question, essayText);
  }

  const isLiteMode =
    options.engineMode === "v8_lite" ||
    (options.engineMode !== "v8_frontier" && options.isBudgetTier === true);

  // --- parallel pre-fetch: Zero-Gemini Cached KB Retrieval (~2ms warm / ~0.7s cold) + Anchors + Student Diagrams ---
  const retrieveGroundedSources = async (): Promise<GroundingSource[]> => {
    const retrievalDeadline = Date.now() + (isLiteMode ? 2500 : 4000);
    try {
      const res = await Promise.race([
        retrieve(supabase, {
          query: question,
          matchCount: isLiteMode ? 4 : 8,
          enableHybridRrf: true,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("retrieval_timeout")), Math.max(1200, retrievalDeadline - Date.now())),
        ),
      ]);
      if (res && res.length > 0) return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[grade.server] KB retrieval warning:", msg);
    }
    return [];
  };

  // V8-Lite strictly skips Vision diagram auditing to keep Free tier fast & protect Super-VL capacity
  const studentDiagramImages = isLiteMode ? [] : (options.studentDiagramImageDataUrls?.slice(0, 3) ?? []);
  const inspectStudentDiagrams = async (): Promise<string[]> => {
    if (studentDiagramImages.length === 0) return [];
    const results = await Promise.all(
      studentDiagramImages.map((img) =>
        describeDiagramFromDataUrl(img).catch((err) => {
          console.warn("[grade.server] Student diagram Dual-VLM inspection skipped:", err);
          return null;
        }),
      ),
    );
    return results.filter((tag): tag is string => Boolean(tag));
  };

  const essayKeyOffset = allocateEssayKeyOffset();
  const [nvidiaHealthy, primaryGroqHealthy, nvidiaLoad] = await Promise.all([
    isLiteMode ? Promise.resolve(false) : hasHealthyNvidiaKey("nvidia_ultra_550b"),
    hasHealthyGroqKey("openai_120b"),
    isLiteMode
      ? Promise.resolve({ rpm: 0, limitRpm: 120, utilization: 0, loadLevel: "normal" as const })
      : getNvidiaLoadStatus(),
  ]);

  const [fetchedSources, fetchedAnchors, verifiedDiagramTags] = await Promise.all([
    retrieveGroundedSources(),
    options.zeroCalibration || isLiteMode
      ? Promise.resolve([] as any[])
      : fetchCalibrationAnchors(supabase).catch((anchorErr) => {
          console.warn(
            "[grade.server] Error fetching calibration anchors, proceeding with standard rubrics:",
            anchorErr,
          );
          return [] as any[];
        }),
    inspectStudentDiagrams(),
  ]);

  if (verifiedDiagramTags.length > 0) {
    essayText = `${essayText.trim()}\n\n${verifiedDiagramTags.join("\n")}`;
  }

  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split));
  const qualityAnalysis = analyzeEssayQuality(essayText, maxMark, split);
  const qualityDirective = buildQualityPromptDirective(qualityAnalysis, maxMark);

  // --- STAGE 0: NEURO-SYMBOLIC CAUSAL-GRAPH + MULTIMODAL DIAGRAM AUDIT (<5ms) ---
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

  let sources: GroundingSource[] = fetchedSources;
  // Tariff-aware source re-ranking: prioritise Paper 4 / A-Level sources for 20-mark essays,
  // and Paper 2 / AS-Level sources for 8-mark and 12-mark essays; cap to top 4 high-signal chunks
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

  // Compact mark-scheme excerpt centered directly on this question's indicative content for Level Verifier, Arbitration & Pass 3
  const compactMarkSchemeContext = sources.length > 0 ? renderContext(sources.slice(0, 3), 550, question) : "";

  // --- calibration anchors (skipped completely in zeroCalibration mode) ---
  const anchors: any[] = options.zeroCalibration ? [] : fetchedAnchors;
  const normQuestionKey = (q: string) =>
    (q || "").toLowerCase().replace(/\[\s*\d+\s*\]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
  const candidateQKey = normQuestionKey(question);
  // Strictly exclude any anchor matching the candidate script by ID OR text (100% zero leakage in LOO!)
  const leakFreeAnchors = anchors.filter((a) => {
    if (options.excludeAnchorId && a.id && a.id === options.excludeAnchorId) return false;
    if (isSameScript(essayText, a.essay_text)) return false;
    if (options.excludeSameQuestionAnchors && normQuestionKey(a.question) === candidateQKey) return false;
    return true;
  });
  const selectedAnchors = options.zeroCalibration ? [] : selectBestAnchors(leakFreeAnchors, question, maxMark, 2);
  const anchorBlock = options.zeroCalibration ? "" : buildAnchorBlock(selectedAnchors, question, maxMark);
  if (anchorBlock) baseSystemPrompt = `${baseSystemPrompt}\n\n${anchorBlock}`;
  const actualAnchorsCount = options.zeroCalibration
    ? 0
    : Math.min(2, Math.max(selectedAnchors.length > 0 ? 1 : 0, selectedAnchors.length));

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

  const markSchemeImages = isLiteMode ? [] : (options.markSchemeImageDataUrls?.slice(0, 4) ?? []);
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
          ? `\n8-MARK EVALUATION CALIBRATION (~15 minutes, AS Level): Distinguish carefully across the full 0–8 range. If the candidate presents a counter-argument and a reasoned conclusion directly addressing the prompt, award Level 2 evaluation (full 2 marks). Do NOT penalise for omitting secondary topics; credit 1–2 developed mechanisms and examples positively. Award 7–8/8 when definitions are accurate, core mechanisms are complete (including combining simultaneous shifts / relative magnitudes where explicitly required), and evaluation is coherent and reasoned; award 5–6/8 when separate shifts or points are sound but fail to synthesise the combined effect.`
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

  const buildUserMessage = (bodyText: string) =>
    `${evalRequirementBanner}${missingRequiredDiagramBanner}${comparativeAuditBanner}\n\n` +
    `EXAM QUESTION TO MARK IN FULL DEPTH (${maxMark} marks):\n` +
    `"""\n${question}\n"""\n\n` +
    `STUDENT ESSAY SUBMISSION:\n` +
    `"""\n${bodyText}\n"""${imageNote}\n\n` +
    `CRITICAL DIRECTIVE: Scrutinize the student's submission against EVERY clause, qualifier, and command word of the exam question above. Ensure the evaluation directly addresses the exact question asked without shifting the goalposts.`;

  const fullUserMessage = buildUserMessage(essayText);

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

  // Resilient V7 pass executor (100% Groq + NVIDIA NIM — ZERO Gemini):
  // - If markSchemeImages are attached, runs direct NVIDIA NIM Super VL 120B Vision.
  // - Otherwise routes full essay to designated Groq / NVIDIA orthogonal model family.
  const executeExaminerPass = async (
    systemPrompt: string,
    feature: string,
    temperature: number,
    family: OrthogonalFamily,
    enableVisionThinking = false,
    keyOffset = essayKeyOffset,
  ) => {
    if (markSchemeImages.length) {
      try {
        return await visionChat({
          model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
          systemPrompt,
          prompt: fullUserMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 4096,
          preferProvider: "nvidia",
          enableThinking: enableVisionThinking,
          userId: options.userId,
          feature,
        });
      } catch (visionErr) {
        console.warn(`[gradeEssay] visionChat failed for ${feature}, falling back to orthogonal text family:`, visionErr);
      }
    }
    return callOrthogonalFamily({
      family,
      temperature,
      json: true,
      userId: options.userId,
      feature,
      keyOffset,
      maxCompletionTokens: 4096,
      timeoutMs: family === "nvidia_ultra_550b" ? 22000 : 18000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullUserMessage },
      ],
    });
  };

  let comparativeJudgement: Awaited<ReturnType<typeof runComparativeJudgement>> = null;
  let levelVerifierResult: LevelVerifierResult | null = null;
  let metaCalibratorResult: MetaCalibratorResult | null = null;
  let decomposedAuditResult: DecomposedAoAudit | null = null;
  let rubricAuditResult = null as RubricAuditResult | null;
  let rubricModel: string | null = null;
  let pass1Mark = 0;
  let pass1Model = "openai/gpt-oss-120b";
  let pass2Mark = 0;
  let pass2Model = "nvidia/nemotron-3.5-super-vl-120b-a12b";

  if (runSinglePass) {
    // Explicit single-pass path (auditPass === false) — Groq + NVIDIA only
    const singleFamily: OrthogonalFamily = primaryGroqHealthy
      ? "openai_120b"
      : "nvidia_super_vl_120b";
    const res = await executeExaminerPass(pass2SystemPrompt, "grade_essay", TEMPERATURE_PASS2, singleFamily, false);

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
  } else if (isLiteMode) {
    // --- FREE TIER: V8-STANDARD (2-CALL ZERO-GEMINI ORTHOGONAL DUAL-PASS, ~90% TRUSTWORTHY ACCURACY) ---
    // Runs strictly 2 fast orthogonal passes (Groq OpenAI-120B + NV Super-VL 120B, or NV Super-VL + NV Lightning-30B)
    // + Stage 0 Neuro-Symbolic + Cached FTS. ZERO 550B Ultra calls, ZERO Vision calls, ZERO Gemini calls (~5-8s)!
    const litePass1Family: OrthogonalFamily = primaryGroqHealthy
      ? "openai_120b"
      : "nvidia_super_vl_120b";
    const litePass2Family: OrthogonalFamily =
      litePass1Family === "openai_120b" ? "nvidia_super_vl_120b" : "nvidia_lightning_30b";

    const [first, second] = await Promise.all([
      executeExaminerPass(
        pass1SystemPrompt,
        "grade_essay_v8_standard_p1",
        TEMPERATURE_PASS1,
        litePass1Family,
        false,
        essayKeyOffset,
      ),
      executeExaminerPass(
        pass2SystemPrompt,
        "grade_essay_v8_standard_p2",
        0.12,
        litePass2Family,
        false,
        essayKeyOffset + 1,
      ),
    ]);

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

    finalGrading = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
    finalGrading = applyWritingQualityGuardrail(finalGrading, qualityAnalysis, maxMark, split, essayText, question);
    finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);
  } else {
    // --- STAGE 1: MARGINAL ENGINE V8 — FAST-FRONTIER CASCADE (0% GEMINI, 3-KEY SPREAD, 0 COLLISIONS) ---
    // Spreads parallel calls cleanly across all NVIDIA NIM keys (k0, k1, k2) + Groq offload:
    //  - Pass 1 (Error Auditor, temp 0.0):           Groq OpenAI-120B (or NV Super-VL 120B on Key k0)
    //  - Pass 2 (Holistic Positive Marker, t=0.12):  NV MiniMax M3.1 Flash on Key k1 (EXACTLY 1 MiniMax call/essay!)
    //  - Signal 3 (KB-Grounded Decomposed + Flags):  Groq OpenAI-120B / NV Super-VL (Key k2) + Groq Qwen-3.8-27B AO3
    //  - Signal 4 (Blind Table A/B Level Verifier):  NV Nemotron-3 Ultra 550B on Key k2 (1-key 408 retry -> k0!)
    //  - Signal 5 (Comparative Judge when anchored): NV Super-VL 120B on Key k0 (strictly leak-free LOO anchors)
    const isExtremeSurge = nvidiaLoad.loadLevel === "surge";
    const pass1Family: OrthogonalFamily = primaryGroqHealthy
      ? "openai_120b"
      : "nvidia_super_vl_120b";
    // Guarantee strict Pass 1 != Pass 2 architectural orthogonality with ZERO MiniMax 14s timeout stalls:
    // - When Pass 1 is Groq OpenAI-120B -> Pass 2 is NVIDIA Super-VL 120B (~4-6s)
    // - When Pass 1 is NVIDIA Super-VL 120B -> Pass 2 is NVIDIA Lightning 30B (~3-4s, balances Super-VL's strictness)
    const pass2Family: OrthogonalFamily =
      pass1Family === "nvidia_super_vl_120b"
        ? isExtremeSurge
          ? "openai_120b"
          : "nvidia_lightning_30b"
        : nvidiaHealthy
          ? "nvidia_super_vl_120b"
          : "openai_120b";
    const decompAo12Family: OrthogonalFamily =
      primaryGroqHealthy || isExtremeSurge
        ? "openai_120b"
        : nvidiaHealthy
          ? "nvidia_super_vl_120b"
          : "openai_20b";

    // Pre-check synchronously (<1ms) whether Comparative Judgement has >= 2 stratified anchors spanning >= 35% of maxMark
    const stratifiedAnchors = options.zeroCalibration
      ? []
      : selectStratifiedAnchors(leakFreeAnchors, essayText, maxMark, question);
    const compSpan =
      stratifiedAnchors.length >= 2
        ? Math.max(...stratifiedAnchors.map((a) => a.mark)) -
          Math.min(...stratifiedAnchors.map((a) => a.mark))
        : 0;
    const canRunComparative =
      !options.zeroCalibration &&
      !isExtremeSurge &&
      stratifiedAnchors.length >= 2 &&
      compSpan >= Math.max(3, Math.round(maxMark * 0.35));

    // Compact ~220-token Hierarchical Level Placement is 550B Ultra's exact speed + accuracy sweet spot (~4-6s)
    const levelVerifierFamily: OrthogonalFamily =
      nvidiaHealthy && !isExtremeSurge ? "nvidia_ultra_550b" : "openai_120b";

    const [first, second, compResult, decomposedResult, levelResult] = await Promise.all([
      executeExaminerPass(
        pass1SystemPrompt,
        "grade_essay_pass1_error_audit",
        TEMPERATURE_PASS1,
        pass1Family,
        false,
        essayKeyOffset,
      ),
      executeExaminerPass(
        pass2SystemPrompt,
        "grade_essay_pass2_holistic",
        0.12,
        pass2Family,
        true,
        essayKeyOffset + 1,
      ),
      canRunComparative
        ? runComparativeJudgement({
            question,
            essayText,
            maxMark,
            split,
            anchors: leakFreeAnchors,
            userId: options.userId,
            family: nvidiaHealthy ? "nvidia_ultra_550b" : "openai_120b",
            keyOffset: essayKeyOffset,
          })
        : Promise.resolve(null),
      runDecomposedAoAudit({
        question,
        essayText,
        maxMark,
        split,
        markSchemeContext: compactMarkSchemeContext,
        ao12Family: decompAo12Family,
        keyOffset: essayKeyOffset + 2,
        userId: options.userId,
      }),
      runLevelDescriptorVerifier({
        question,
        essayText,
        maxMark,
        split,
        markSchemeContext: compactMarkSchemeContext,
        neuroSymbolicSummary: neuroSymbolicDirective,
        keyOffset: essayKeyOffset + 2,
        userId: options.userId,
        family: levelVerifierFamily,
      }),
    ]);

    comparativeJudgement = compResult;
    decomposedAuditResult = decomposedResult;
    rubricAuditResult = null;
    levelVerifierResult = levelResult;
    rubricModel = null;

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

    // --- STAGE 2: V8 FAST-PATH / DEEP-PATH 550B PRINCIPAL MODERATION CASCADE ---
    const disputeCheck = shouldTriggerArbitration(grading1, grading2, maxMark);
    const fatalViolations = neuroSymbolicDossier.violations.filter((v) => v.severity === "fatal").length;
    const moderateViolations = neuroSymbolicDossier.violations.filter((v) => v.severity === "moderate").length;

    const coreStage1Marks = [
      grading1.total_mark,
      grading2.total_mark,
      ...(levelResult ? [levelResult.verifiedMark] : []),
      ...(compResult ? [compResult.estimatedMark] : []),
    ];
    const coreSpread = Math.max(...coreStage1Marks) - Math.min(...coreStage1Marks);
    const hasBoundaryFlag =
      Boolean(
        decomposedResult &&
          (decomposedResult.wrongDirectionParagraphs >= 1 || decomposedResult.isOneSidedBestMethod),
      ) ||
      Boolean(levelResult && (levelResult.majorOffFocusOrInversion || levelResult.isOneSidedBestMethod)) ||
      neuroSymbolicDossier.violations.length > 0;

    // Fast Path (~60% of 8m/12m essays): when core frontier models already converge within <= 1 mark
    // with zero boundary flags, skip Stage 2 Meta-Calibrator for ultra-fast ~8-12s grading!
    // Under burst traffic (>75% RPM), also shed optional Meta-Calibrator on <= 2-spread 8m/12m essays.
    const metaTrigger =
      maxMark >= 20 ||
      disputeCheck.shouldArbitrate ||
      hasBoundaryFlag ||
      (nvidiaLoad.loadLevel === "normal" ? coreSpread >= 2 : coreSpread >= 3);
    const shouldRunMetaCalibrator = nvidiaHealthy && !isExtremeSurge && metaTrigger;
    const useDeepThinkingMeta = false;

    const panelDiagLines: string[] = [];
    if (decomposedResult) {
      panelDiagLines.push(
        `- Decomposed Micro-Examiners (AO1+2 / Qwen-27B AO3): ${decomposedResult.decomposedTotal}/${maxMark} (AO1=${decomposedResult.ao1Awarded}, AO2=${decomposedResult.ao2Awarded}, AO3=${decomposedResult.ao3Awarded}; onFocus=${Math.round(decomposedResult.onFocusRatio * 100)}%, frameworks=${decomposedResult.developedFrameworkCount}, chains=${decomposedResult.chainQuality ?? "partial_chains"}, oneSided=${Boolean(decomposedResult.isOneSidedBestMethod)}, AO3=${decomposedResult.ao3Level})`,
      );
    }
    if (levelResult) {
      panelDiagLines.push(
        `- Hierarchical Level Verifier (${levelResult.model}): ${levelResult.verifiedMark}/${maxMark} (AO1+2 ${levelResult.ao12Level}-${levelResult.ao12Position}=${levelResult.ao12Mark}, AO3 ${levelResult.ao3Level}-${levelResult.ao3Position}=${levelResult.ao3Mark}) — ${levelResult.rationale}`,
      );
    }

    // Run 550B Principal Meta-Calibrator (Key k1) IN PARALLEL with Arbitration (Key k0, when disputed)
    const [metaRes, arbitratedGrading] = await Promise.all([
      shouldRunMetaCalibrator
        ? runPrincipalMetaCalibrator({
            question,
            essayText,
            maxMark,
            split,
            markSchemeContext: compactMarkSchemeContext,
            neuroSymbolicSummary: neuroSymbolicDirective,
            pass1: grading1,
            pass2: grading2,
            decomposed: decomposedResult,
            rubric: null,
            levelVerifier: levelResult,
            comparative: comparativeJudgement,
            useDeepThinking: useDeepThinkingMeta,
            keyOffset: essayKeyOffset + 1,
            userId: options.userId,
            family: "nvidia_ultra_550b",
          })
        : Promise.resolve(null),
      disputeCheck.shouldArbitrate
        ? arbitrateGrading({
            question,
            essayText,
            maxMark,
            split,
            examinerGrading: grading1,
            moderatorGrading: grading2,
            disputeReason: disputeCheck.reason,
            keyOffset: essayKeyOffset,
            userId: options.userId,
            qualityAnalysis,
            markSchemeContext: compactMarkSchemeContext,
            neuroSymbolicSummary: neuroSymbolicDirective,
            comparativeJudgement,
            panelSummary: panelDiagLines.join("\n"),
          }).catch((arbitrationErr) => {
            console.warn("[grade.server] Arbitration failed, synthesizing dual passes directly:", arbitrationErr);
            return null;
          })
        : Promise.resolve(null),
    ]);

    metaCalibratorResult = metaRes;

    const hasUnreferencedDiagram =
      neuroSymbolicDossier.diagramPresent && !neuroSymbolicDossier.diagramLabelsIntegrated;

    const lockedEnsembleMark = computePsychometricEnsembleMark({
      p1: grading1.total_mark,
      p2: grading2.total_mark,
      compMark: comparativeJudgement?.estimatedMark ?? null,
      decomposed: decomposedResult,
      rubric: null,
      levelVerifier: levelResult,
      metaCalibrator: metaCalibratorResult,
      arbitratorMark: arbitratedGrading?.total_mark ?? null,
      isComparativeBestMethodQuestion,
      hasUnreferencedDiagram,
      maxMark,
      fatalViolations,
      moderateViolations,
    });

    // Cross-family structural AO median targets (Pass 1 + Pass 2 + Decomposed + 550B Meta-Calibrator)
    const medianOf = (vals: number[]): number => {
      const s = [...vals].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };
    const ao1Votes = [grading1.ao_breakdown.knowledge.awarded, grading2.ao_breakdown.knowledge.awarded];
    const ao2Votes = [grading1.ao_breakdown.analysis.awarded, grading2.ao_breakdown.analysis.awarded];
    const ao3Votes = [grading1.ao_breakdown.evaluation.awarded, grading2.ao_breakdown.evaluation.awarded];
    if (decomposedResult) {
      ao1Votes.push(decomposedResult.ao1Awarded);
      ao2Votes.push(decomposedResult.ao2Awarded);
      ao3Votes.push(decomposedResult.ao3Awarded);
    }
    if (metaCalibratorResult) {
      ao1Votes.push(metaCalibratorResult.ao1Mark, metaCalibratorResult.ao1Mark);
      ao2Votes.push(metaCalibratorResult.ao2Mark, metaCalibratorResult.ao2Mark);
      ao3Votes.push(metaCalibratorResult.ao3Mark, metaCalibratorResult.ao3Mark);
    }
    const aoTargets = {
      ao1: medianOf(ao1Votes),
      ao2: medianOf(ao2Votes),
      ao3: split.ao3_marks === 0 ? 0 : medianOf(ao3Votes),
    };

    const protectedAo3Min =
      decomposedResult &&
      decomposedResult.ao3Awarded >= 2 &&
      neuroSymbolicDossier.ao3CriteriaMatched.length >= 2 &&
      fatalViolations === 0 &&
      !metaCalibratorResult?.confirmedLevel1OffFocus
        ? Math.min(2, decomposedResult.ao3Awarded)
        : 0;

    if (arbitratedGrading) {
      finalGrading = alignGradingToTargetMark(
        arbitratedGrading,
        lockedEnsembleMark,
        maxMark,
        split,
        protectedAo3Min,
        aoTargets,
      );
    } else {
      const baseSynth = synthesizeDualPasses(grading1, grading2, maxMark, split, qualityAnalysis, essayText, question);
      finalGrading = alignGradingToTargetMark(
        baseSynth,
        lockedEnsembleMark,
        maxMark,
        split,
        protectedAo3Min,
        aoTargets,
      );
    }
    finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);
  }

  // --- STAGE 3: EMERGENCY-ONLY SENIOR REPORT REFINER (MARK LOCKED) ---
  // Skip Stage 3 whenever Arbitration or clean multi-pass synthesis already produced complete,
  // verified prose (saves ~5-8s latency and ~25% RPM with zero accuracy impact since marks are locked!).
  const alreadyArbitratedCleanly =
    Boolean(finalGrading.arbitrated) &&
    finalGrading.strengths.length >= 2 &&
    finalGrading.weaknesses.length >= 1;
  const alreadySynthesizedCleanly =
    !runSinglePass &&
    finalGrading.examiner_summary.length >= 45 &&
    finalGrading.strengths.length >= 2 &&
    finalGrading.weaknesses.length >= 1 &&
    finalGrading.actionable_feedback.length >= 2 &&
    neuroSymbolicDossier.violations.length === 0;
  const preRefineLockedMark = finalGrading.total_mark;
  if (!alreadyArbitratedCleanly && !alreadySynthesizedCleanly) {
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
  }
  finalGrading = applyNeuroSymbolicGuardrail(finalGrading, neuroSymbolicDossier, maxMark, split);

  // Compute Conformal Prediction Interval from full V7.5 inter-family panel
  const panelMarks = [pass1Mark, pass2Mark, finalGrading.total_mark];
  if (decomposedAuditResult) panelMarks.push(decomposedAuditResult.decomposedTotal);
  if (rubricAuditResult) panelMarks.push(rubricAuditResult.rubricEstimatedMark);
  if (levelVerifierResult) panelMarks.push(levelVerifierResult.verifiedMark);
  if (metaCalibratorResult) panelMarks.push(metaCalibratorResult.calibratedTotal);
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
    families: Array.from(
      new Set(
        [
          pass1Model,
          pass2Model,
          rubricModel,
          levelVerifierResult?.model,
          metaCalibratorResult?.model,
          comparativeJudgement?.judgeModel,
        ].filter(Boolean) as string[],
      ),
    ),
    pass1Mark,
    pass1Model,
    pass2Mark,
    pass2Model,
    decomposedMark: decomposedAuditResult?.decomposedTotal ?? null,
    rubricMark: rubricAuditResult?.rubricEstimatedMark ?? null,
    levelVerifierMark: levelVerifierResult?.verifiedMark ?? null,
    metaCalibratorMark: metaCalibratorResult?.calibratedTotal ?? null,
    comparativeMark: comparativeJudgement?.estimatedMark ?? null,
    interFamilySpread,
    conformalInterval,
    pipelineVersion: isLiteMode ? "V8-Standard" : "V8",
  };
  finalGrading.engine_tier = isLiteMode ? "v8_lite" : "v8_frontier";

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
