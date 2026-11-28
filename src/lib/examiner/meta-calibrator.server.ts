/**
 * Marginal Engine V7.5 — Stage 2 Principal Examiner Evidence-Synthesis Meta-Calibrator
 *
 * Runs on NVIDIA NIM `nvidia/nemotron-3-ultra-550b-a55b` (550B MoE frontier reasoning model,
 * 0% Gemini, full uncompressed essay + retrieved Cambridge mark scheme + Stage 1 panel dossier).
 *
 * Mirrors official Cambridge International Principal Examiner moderation:
 *   1. Audits every specific claim and disagreement raised by the 5 independent Stage-1 models
 *      (Pass 1 Error Auditor, Pass 2 Holistic Marker, Decomposed AO1+2/AO3, Dynamic Rubric,
 *      and Blind Level Verifier) directly against verbatim quotes in the student script.
 *   2. Overturns hallucinated errors or over-harsh penalties (e.g. 1-word verbal typos,
 *      concise timed scripts penalised for length, unrequested diagram deductions).
 *   3. Enforces verified Cambridge discrimination rules strictly when verbatim proof exists
 *      (substantial opposite-policy off-focus pages -> L1; separate shifts without net-effect
 *      synthesis -> L2; mislabelled diagram with sound prose -> L2 not L1; breadth-listing
 *      5-6 topics without developed step-by-step causal chains -> Upper L2; one-sided "best
 *      method" with zero analysed alternative -> L2 low + AO3 L0/L1).
 */

import type { AoSplit } from "./config";
import type { DecomposedAoAudit } from "./decomposed-ao.server";
import { extractFirstJsonObject } from "./json";
import type { LevelVerifierResult } from "./level-verifier.server";
import { callOrthogonalFamily, type OrthogonalFamily } from "./multi-family-pool.server";
import type { RubricAuditResult } from "./rubric-auditor.server";
import type { ComparativeJudgementResult, Grading } from "./types";

export type MetaCalibratorResult = {
  ao1Mark: number;
  ao2Mark: number;
  ao3Mark: number;
  calibratedTotal: number;
  confirmedLevel1OffFocus: boolean;
  confirmedMissingSynthesis: boolean;
  confirmedBreadthOnlyL2: boolean;
  rationale: string;
  model: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getTariffModerationGuide(maxMark: number, split: AoSplit): string {
  const ao12Max = split.ao1_marks + split.ao2_marks;
  if (maxMark >= 20) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 4 (${maxMark}m · AO1=${split.ao1_marks}, AO2=${split.ao2_marks}, AO3=${split.ao3_marks}):
- Table A (AO1+AO2 out of ${ao12Max}):
  * L3 (11–${ao12Max}): Accurate knowledge + 2–3+ genuinely DEVELOPED economic models/diagrams/pay-off matrices with unbroken step-by-step causal chains directly answering the prompt, ZERO off-focus pages or systematic inversions. (Concise ~450–750w timed scripts with 2+ fully developed models/pay-off matrices earn 11–13/14 here!)
  * L2 (6–10): Valid economic direction & knowledge, BUT either: (a) breadth-listing 4–6 concepts/terms briefly (1–2 sentences each) without deep step-by-step AD/AS or model development -> 8–9/14, OR (b) mislabelled/flawed diagram while written policy analysis remains valid -> 6–8/14 (NEVER drop to L1 over a diagram label error alone!), OR (c) compressed chains / unreferenced diagrams / 1–2 notable conceptual slips -> 7–9/14.
  * L1 (1–5): Substantial off-focus paragraph/page explaining the OPPOSITE policy direction (e.g. expansionary MP when asked to cut inflation), OR core prose mechanisms systematically inverted/broken.
- Table B (AO3 out of ${split.ao3_marks}):
  * L2 (4–${split.ao3_marks}): Developed two-sided evaluation applying explicit contextual criteria (elasticity, time lags, magnitude, state of economy, opportunity cost, trade-offs, government failure) + reasoned judgement (5–6/6 when sustained & prioritised).
  * L1 (1–3): Simple caveats, undeveloped counter-points, or a generic 1–2 sentence closing assertion ("depends on / uncertain").
  * L0 (0): Purely one-sided, absent, or incoherent evaluation.`;
  }
  if (maxMark === 12) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (12m · AO1=${split.ao1_marks}, AO2=${split.ao2_marks}, AO3=${split.ao3_marks}):
- AO1+AO2 (out of ${ao12Max}):
  * L3 (7–${ao12Max}): Accurate definitions + 2–3 clear step-by-step causal chains/examples/diagram answering EVERY clause of the prompt with zero directional inversions. Strong timed scripts (~320–550w) that directly nail every clause merit 7–8/8 — do NOT withhold full marks for omitting peripheral topics!
  * L2 (4–6): Valid ideas that are descriptive/compressed, missing synthesis of competing shifts, OR ONE-SIDED on a "best/only way" question (zero analysed alternative policy -> max 4–5/8), OR mislabelled/unreferenced diagram.
  * L1 (1–3): Major directional inversions, confused definitions, or substantial off-focus pages.
- AO3 (out of ${split.ao3_marks}):
  * L2 (3–${split.ao3_marks}): Specific contextual weighing (elasticity, time lags, cost, reliability, cause of problem) + clear reasoned conclusion (4/4 when prioritised & directly answers the prompt).
  * L1 (1–2): Brief/generic caveats or undeveloped counter-argument (0–1/4 if completely one-sided on a "best/only" question).`;
  }
  if (split.ao3_marks === 0) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (8m NON-EVALUATIVE · AO1=${split.ao1_marks}, AO2=${split.ao2_marks}, AO3=0):
- L3 (7–8/8): Clear accurate definitions + well-developed explanation with accurate diagram/examples answering EVERY clause of the prompt (award 7–8/8 positively under 15-min timed conditions!).
- L2 (4–6/8): Generally accurate ideas but partially developed, compressed, missing requested diagram, missing synthesis of interacting shifts, or a notable definition/label slip.
- L1 (1–3/8): Major directional error, inverted definition, or vague generalities.`;
  }
  return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (8m EVALUATIVE, ~15 min timed · AO1=${split.ao1_marks}, AO2=${split.ao2_marks}, AO3=${split.ao3_marks}):
- AO1+AO2 (out of ${ao12Max}):
  * L3 (5–${ao12Max}): Accurate definitions + 1–2 clear, developed causal mechanisms/examples/diagrams answering ALL parts (including combined net-effect synthesis if two shifts interact!). Strong complete timed scripts earn full 6/6!
  * L2 (3–4): Partial/compressed explanation, OR analyses two simultaneous shifts separately WITHOUT synthesising the combined net outcome (e.g. certain price change vs indeterminate quantity), OR missing requested diagram.
  * L1 (1–2): Major directional inversion, inverted core definition, or off-focus.
- AO3 (out of ${split.ao3_marks}):
  * L2 (2/2): Specific contextual evaluation directly addressing the evaluative clause (e.g. measurement difficulty, relative shift magnitude, limitation) + reasoned conclusion.
  * L1 (1/2): Brief caveat or generic assertion without contextual weighing or conclusion.
  * L0 (0/2): Purely descriptive / absent / incoherent evaluation.`;
}

function buildPanelDossier(params: {
  maxMark: number;
  pass1: Grading;
  pass2: Grading;
  decomposed: DecomposedAoAudit | null;
  rubric: RubricAuditResult | null;
  levelVerifier: LevelVerifierResult | null;
  comparative: ComparativeJudgementResult | null;
}): string {
  const { maxMark, pass1, pass2, decomposed, rubric, levelVerifier, comparative } = params;
  const lines: string[] = [
    `STAGE-1 PANEL EVIDENCE DOSSIER (VERIFY EVERY CLAIM AGAINST THE ACTUAL STUDENT ESSAY — DO NOT BLINDLY TRUST ANY SINGLE EXAMINER):`,
    `- Examiner 1 (Error Auditor): ${pass1.total_mark}/${maxMark} (AO1=${pass1.ao_breakdown.knowledge.awarded}, AO2=${pass1.ao_breakdown.analysis.awarded}, AO3=${pass1.ao_breakdown.evaluation.awarded}) | Weaknesses flagged: ${pass1.weaknesses.slice(0, 3).join(" ; ") || "none"}`,
    `- Examiner 2 (Holistic Marker): ${pass2.total_mark}/${maxMark} (AO1=${pass2.ao_breakdown.knowledge.awarded}, AO2=${pass2.ao_breakdown.analysis.awarded}, AO3=${pass2.ao_breakdown.evaluation.awarded}) | Summary: ${pass2.examiner_summary.slice(0, 200)}`,
  ];
  if (decomposed) {
    lines.push(
      `- Decomposed Micro-Examiner: ${decomposed.decomposedTotal}/${maxMark} (AO1=${decomposed.ao1Awarded}, AO2=${decomposed.ao2Awarded}, AO3=${decomposed.ao3Awarded} | onFocus=${Math.round(decomposed.onFocusRatio * 100)}%, wrongDirParas=${decomposed.wrongDirectionParagraphs}, developedFrameworks=${decomposed.developedFrameworkCount}) | Note: ${decomposed.offFocusNote || "none"} | AO3: ${decomposed.ao3Rationale}`,
    );
  }
  if (rubric) {
    lines.push(
      `- Rubric Coverage Auditor: ${rubric.rubricEstimatedMark}/${maxMark} (covered=${rubric.coveredComponentsCount}/${rubric.requiredComponentsCount}, developed=${rubric.developedComponentsCount}, chains=${rubric.chainQuality}, AO3=${rubric.ao3Verdict}, offFocusParas=${rubric.offFocusParagraphs}, oneSided=${Boolean(rubric.isOneSidedBestMethod)}) | Note: ${rubric.rationale}`,
    );
  }
  if (levelVerifier) {
    lines.push(
      `- Blind Level Verifier (550B): ${levelVerifier.verifiedMark}/${maxMark} (AO1+2 ${levelVerifier.ao12Level}-${levelVerifier.ao12Position}=${levelVerifier.ao12Mark}, AO3 ${levelVerifier.ao3Level}-${levelVerifier.ao3Position}=${levelVerifier.ao3Mark}, majorOffFocusOrInv=${levelVerifier.majorOffFocusOrInversion}, oneSided=${levelVerifier.isOneSidedBestMethod}) | Note: ${levelVerifier.rationale}`,
    );
  }
  if (comparative) {
    const compDetails = comparative.comparisons
      .slice(0, 2)
      .map((c) => `vs ${c.anchorMark}/${c.anchorMaxMark}: ${c.verdict} (${c.reason})`)
      .join(" | ");
    lines.push(
      `- Comparative Judgement: ${comparative.estimatedMark}/${maxMark}${compDetails ? ` — ${compDetails}` : ""}`,
    );
  }
  return lines.join("\n");
}

export async function runPrincipalMetaCalibrator(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  markSchemeContext?: string;
  neuroSymbolicSummary?: string;
  pass1: Grading;
  pass2: Grading;
  decomposed: DecomposedAoAudit | null;
  rubric: RubricAuditResult | null;
  levelVerifier: LevelVerifierResult | null;
  comparative: ComparativeJudgementResult | null;
  useDeepThinking?: boolean;
  keyOffset?: number;
  userId?: string;
  family?: OrthogonalFamily;
}): Promise<MetaCalibratorResult | null> {
  const {
    question,
    essayText,
    maxMark,
    split,
    markSchemeContext,
    neuroSymbolicSummary,
    pass1,
    pass2,
    decomposed,
    rubric,
    levelVerifier,
    comparative,
    useDeepThinking = false,
    keyOffset,
    userId,
    family = "nvidia_ultra_550b",
  } = options;

  const trimmedEssay =
    essayText.length > 14000
      ? `${essayText.slice(0, 9000)}\n[...middle...]\n${essayText.slice(-4500)}`
      : essayText;

  const systemPrompt = `You are the Chief Principal Examiner for Cambridge International 9708 Economics moderating a ${maxMark}-mark script after 5 examiners graded it.
Your ONLY job is to verify EVERY examiner's claim directly against the student's actual text and determine the EXACT true Cambridge mark (AO1 + AO2 + AO3).

${getTariffModerationGuide(maxMark, split)}

SEVEN MANDATORY PRINCIPAL-EXAMINER MODERATION RULES:
0. ANTI-ANCHORING INDEPENDENT VERIFICATION (CRITICAL):
   - NEVER blindly follow the Stage-1 majority mark! Examiners routinely miss a hidden opposite-policy off-focus paragraph, miss an un-synthesised simultaneous shift, or get fooled by breadth-listing. Conversely, a single examiner can hallucinate a fatal error over a 1-word verbal typo.
   - If EVEN ONE Stage-1 examiner flags a specific defect (opposite-policy paragraph, missing combined net-effect synthesis, breadth-only listing without step-by-step models, or one-sided missing alternative), read the student essay directly and VERIFY whether that defect is genuinely true! If TRUE, enforce the true Cambridge level even if other examiners gave higher marks!
1. VERIFY ALLEGED DEFECTS VERBATIM:
   - Check every paragraph for opposite-policy off-focus content (e.g. spending a substantial paragraph/page explaining EXPANSIONARY policy when asked how to REDUCE inflation -> set confirmed_level1_off_focus = true and place Table A strictly in L1: ${maxMark >= 20 ? "4–6/20 total" : maxMark === 12 ? "2–4/12 total" : "2–3/8 total"}!).
   - An isolated 1-word verbal slip inside an otherwise accurate multi-model essay (e.g. writing "depreciation" once right after "appreciating the exchange rate") is NOT a fatal inversion — OVERTURN any Level-1/2 cap caused by it!
   - A mislabelled diagram when the written policy mechanisms remain directionally valid belongs in **Level 2** (${maxMark >= 20 ? "9–11/20" : maxMark === 12 ? "6–8/12" : "4–5/8"}), NEVER Level 1 (4–6/20)!
2. SIMULTANEOUS-SHIFT & MULTI-CLAUSE SYNTHESIS GATE:
   - If the question involves two simultaneous/competing shifts (e.g. economy-wide wage rise shifting BOTH D right and S left) and the student analyses each shift separately WITHOUT synthesising the combined net effect (what is certain vs indeterminate depending on relative shift magnitudes), set confirmed_missing_synthesis = true and cap in **Level 2** (${maxMark <= 8 ? "5/8" : maxMark === 12 ? "7–8/12" : "10–12/20"}) — do NOT award Top Band!
3. BREADTH-LISTING vs DEVELOPED ANALYTICAL DEPTH (20m PAPER 4):
   - Listing 4–6 valid concepts/diagrams briefly (1–2 sentences each) without deep step-by-step AD/AS or causal mechanism development belongs in **Upper Level 2 (10–12/20)** — set confirmed_breadth_only_l2 = true! (NEVER set confirmed_breadth_only_l2 = true if you award >= 13/20!)
   - Conversely, a focused ~450–700w timed script that develops **2–3 economic models / diagrams / pay-off matrices** thoroughly step-by-step with contextual evaluation earns **Top Band (15–18/20)**!
4. ONE-SIDED "BEST / ONLY METHOD" GATE:
   - If the question asks whether Policy X is the "best / only / most effective" way AND the student fails to analyse ANY concrete alternative policy, cap at L2 low + AO3 L0/L1 (${maxMark >= 20 ? "max 9–10/20" : maxMark === 12 ? "max 5–6/12" : "max 4/8"}).
5. AUTHENTIC TIMED-EXAM POSITIVE FULL-MARKS CREDIT (8m & 12m):
   - Under timed exam conditions (${maxMark <= 8 ? "~15 min" : maxMark === 12 ? "~25 min" : "~45 min"}), when a candidate accurately defines key terms, develops clear step-by-step mechanisms answering EVERY clause, and provides contextual evaluation with a reasoned conclusion — award **FULL OR NEAR-FULL TOP-BAND MARKS** (${maxMark <= 8 ? "7–8/8" : maxMark === 12 ? "10–12/12" : "16–18/20"})! Never deduct 1–2 marks for omitting peripheral subtopics!
6. ANTI-PEDANTRY: Never penalise writing "the government uses monetary policy", never penalise an unrequested missing diagram, and never penalise 2024–2026 examples.

Return ONLY valid JSON:
{
  "ao1_mark": <int 0..${split.ao1_marks}>,
  "ao2_mark": <int 0..${split.ao2_marks}>,
  "ao3_mark": <int 0..${split.ao3_marks}>,
  "confirmed_level1_off_focus": <boolean>,
  "confirmed_missing_synthesis": <boolean>,
  "confirmed_breadth_only_l2": <boolean>,
  "rationale": "<1–2 concise sentences explaining which Stage-1 examiners were right/wrong based on verbatim essay evidence>"
}`;

  const panelDossier = buildPanelDossier({
    maxMark,
    pass1,
    pass2,
    decomposed,
    rubric,
    levelVerifier,
    comparative,
  });

  const userParts = [
    `EXAM QUESTION (${maxMark} marks · AO1=${split.ao1_marks}, AO2=${split.ao2_marks}, AO3=${split.ao3_marks}):\n${question}\n`,
    `STUDENT ESSAY:\n${trimmedEssay}\n`,
    panelDossier,
  ];
  if (neuroSymbolicSummary) {
    userParts.push(`\n${neuroSymbolicSummary}`);
  }
  if (markSchemeContext && markSchemeContext.trim().length > 0) {
    userParts.push(`\nRETRIEVED CAMBRIDGE MARK SCHEME CONTEXT:\n${markSchemeContext.slice(0, 1500)}`);
  }
  const userContent = userParts.join("\n");

  const runOnce = async (thinking: boolean): Promise<MetaCalibratorResult | null> => {
    const res = await callOrthogonalFamily({
      family,
      temperature: 0.0,
      json: !thinking,
      enableThinking: thinking,
      maxCompletionTokens: thinking ? 2400 : 800,
      timeoutMs: thinking ? 23000 : 18000,
      keyOffset,
      userId,
      feature: thinking ? "v75_principal_meta_calibrator_think" : "v75_principal_meta_calibrator",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const parsed = extractFirstJsonObject(res.text) as any;
    if (
      !parsed ||
      typeof parsed.ao1_mark !== "number" ||
      typeof parsed.ao2_mark !== "number"
    ) {
      return null;
    }

    const ao1Mark = clamp(Math.round(Number(parsed.ao1_mark)), 0, split.ao1_marks);
    const ao2Mark = clamp(Math.round(Number(parsed.ao2_mark)), 0, split.ao2_marks);
    const ao3Mark =
      split.ao3_marks === 0
        ? 0
        : clamp(Math.round(Number(parsed.ao3_mark) || 0), 0, split.ao3_marks);

    return {
      ao1Mark,
      ao2Mark,
      ao3Mark,
      calibratedTotal: clamp(ao1Mark + ao2Mark + ao3Mark, 0, maxMark),
      confirmedLevel1OffFocus: Boolean(parsed.confirmed_level1_off_focus),
      confirmedMissingSynthesis: Boolean(parsed.confirmed_missing_synthesis),
      confirmedBreadthOnlyL2: Boolean(parsed.confirmed_breadth_only_l2),
      rationale: String(parsed.rationale || "").slice(0, 260),
      model: res.model,
    };
  };

  try {
    if (useDeepThinking) {
      try {
        const deepRes = await runOnce(true);
        if (deepRes) return deepRes;
      } catch {
        // Gracefully fall back to fast non-thinking 550B pass if thinking times out
      }
    }
    return await runOnce(false);
  } catch (err) {
    console.warn("[meta-calibrator] Stage 2 Principal Examiner meta-calibration skipped:", err);
    return null;
  }
}
