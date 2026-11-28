/**
 * Marginal Engine V6 — Dynamic Question-Rubric & Evidence-Chain Auditor
 *
 * Generalizable to ANY unseen Cambridge 9708 Economics essay (8m, 12m, or 20m):
 * 1. Decomposes the exam question into its 2–4 mandatory Cambridge rubric components
 *    (command words, dualities, required synthesis, required diagrams).
 * 2. Scores each component strictly on evidence (0 = missing, 1 = asserted/descriptive,
 *    2 = developed step-by-step with model/diagram).
 * 3. Classifies analytical chain quality ("descriptive_assertions" vs "partial_chains"
 *    vs "developed_models") and AO3 evaluative depth ("none" | "asserted_generic" |
 *    "balanced_contextual" | "prioritised_judgement").
 * 4. Runs ONCE per essay in parallel on Google Gemini (`gemini_flash`, 1M context, full uncompressed
 *    essay, hard-capped at 8.5s with low thinking budget and automatic Groq failover) so it adds ~0s
 *    wall-clock latency while providing a genuine 3rd frontier model family & generalizable level caps.
 */

import type { AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily, type OrthogonalFamily } from "./multi-family-pool.server";

export type RubricAuditResult = {
  requiredComponentsCount: number;
  coveredComponentsCount: number;
  developedComponentsCount: number;
  chainQuality: "descriptive_assertions" | "partial_chains" | "developed_models";
  ao3Verdict: "none" | "asserted_generic" | "balanced_contextual" | "prioritised_judgement";
  unreferencedDiagram: boolean;
  offFocusParagraphs: number;
  isOneSidedBestMethod?: boolean;
  rubricEstimatedMark: number;
  rationale: string;
  model?: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function runDynamicRubricAudit(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  markSchemeContext?: string;
  userId?: string;
  family?: OrthogonalFamily;
}): Promise<RubricAuditResult | null> {
  const {
    question,
    essayText,
    maxMark,
    split,
    markSchemeContext,
    userId,
    family = "minimax_flash",
  } = options;
  const trimmedEssay =
    essayText.length > 14000
      ? `${essayText.slice(0, 9000)}\n[...middle...]\n${essayText.slice(-4500)}`
      : essayText;

  const systemPrompt = `You are a Cambridge International 9708 Economics Principal Examiner performing a fast, objective RUBRIC COVERAGE & EVIDENCE-DEPTH AUDIT on an unseen ${maxMark}-mark essay (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).

YOUR TASK (GENERALIZABLE TO ANY 9708 QUESTION):
1. Identify the 2–4 mandatory rubric components required by the exact question (e.g. definitions, both sides/policies, combined net-effect synthesis when two shifts interact, required diagram, evaluation).
2. Score how many are covered at all (covered_components_count) and how many are FULLY DEVELOPED step-by-step with economic models/diagrams (developed_components_count).
3. Classify "chain_quality" strictly:
   - "descriptive_assertions": mostly 1-step assertions or breadth-listing 4–6 concepts/terms briefly without step-by-step AD/AS, S&D, multiplier, or MR=MC mechanics.
   - "partial_chains": some valid 2-step causal chains, OR separate shifts never synthesised into a combined net effect, OR mislabelled/unreferenced diagrams alongside valid written policies.
   - "developed_models": sustained 3-step causal chains with accurately integrated diagrams/models/equations/pay-off matrices (AD/AS, Keynesian multiplier, MSC/MSB, MR=MC, Marshall-Lerner + J-curve, game theory).
4. Classify "ao3_verdict" strictly:
   - "none": no evaluation or incoherent evaluation.
   - "asserted_generic": brief/repetitive caveats or a generic 1–2 sentence "it depends / uncertain / both effective" ending without contextual weighing.
   - "balanced_contextual": multiple developed counter-arguments with explicit criteria (elasticity, time lags, opportunity cost, measurement limitations, state of economy) + clear conclusion.
   - "prioritised_judgement": sustained contextual weighing throughout + decisive prioritised judgement directly answering the prompt.
5. Detect "unreferenced_diagram" (true if a diagram is present but NOT explained in the prose), "off_focus_paragraphs" (count of substantial paragraphs explaining the WRONG/OPPOSITE policy direction or irrelevant topic — NEVER count a mislabelled diagram or 1-word verbal slip as off_focus_paragraphs!), and "is_one_sided_best_method" (true ONLY if the question asks whether Policy X is the "best/only/most effective" method AND the essay fails to analyse any concrete alternative policy).
6. CAMBRIDGE TIMED-EXAM POSITIVE MARKING CALIBRATION (CRITICAL — DO NOT UNDER-MARK AUTHENTIC TIMED SCRIPTS):
${
  maxMark <= 8
    ? `   - 8-mark AS Paper 2 (~15 minutes timed): Credit what IS demonstrated without demanding textbook exhaustiveness. Accurate definitions + 1–2 clear causal mechanisms/examples/diagram answering EVERY clause (including combined net-effect synthesis if two shifts interact)${split.ao3_marks > 0 ? " + specific contextual evaluation & reasoned conclusion" : ""} merits Top Band (7–8/8). Reserve 4–6/8 for partial/compressed explanations or un-synthesised simultaneous shifts, and 1–3/8 for major directional errors or vague generalities.`
    : maxMark === 12
      ? `   - 12-mark AS Paper 2 (~25–30 minutes timed): Realistic timed standard — do NOT deduct for omitting peripheral topics. Accurate definitions + 2–3 clear causal mechanisms/diagram + contextual evaluation & conclusion answering every clause merits Top Band (10–12/12). Reserve 6–8/12 for descriptive/compressed or one-sided answers and 2–5/12 for directional errors or off-focus responses.`
      : `   - 20-mark A-Level Paper 4 (~40–45 minutes timed): Authentic concise handwritten scripts (~400–750w) with accurate definitions, 2+ genuinely developed economic models/diagrams/pay-off matrices, zero off-focus pages/systematic inversions, and contextual evaluation merit Level 3 Top Band (15–19/20). Reserve 9–12/20 for breadth-listing without deep step-by-step models, mislabelled diagrams with valid written analysis, or descriptive Level 2 scripts; reserve 4–6/20 strictly for substantial opposite-policy off-focus pages or systematically broken Level 1 scripts.`
}
7. Output "rubric_estimated_mark" (int 0..${maxMark}) strictly aligned with authentic Cambridge 9708 timed-exam standards.

Return ONLY valid JSON:
{
  "required_components_count": <int 2..5>,
  "covered_components_count": <int 0..5>,
  "developed_components_count": <int 0..5>,
  "chain_quality": "descriptive_assertions" | "partial_chains" | "developed_models",
  "ao3_verdict": "none" | "asserted_generic" | "balanced_contextual" | "prioritised_judgement",
  "unreferenced_diagram": <boolean>,
  "off_focus_paragraphs": <int 0..5>,
  "is_one_sided_best_method": <boolean>,
  "rubric_estimated_mark": <int 0..${maxMark}>,
  "rationale": "<1 concise sentence>"
}`;

  const userContent =
    markSchemeContext && markSchemeContext.trim().length > 0
      ? `Question (${maxMark}m):\n${question}\n\nStudent Essay:\n${trimmedEssay}\n\nRetrieved Mark Scheme Context:\n${markSchemeContext.slice(0, 1200)}`
      : `Question (${maxMark}m):\n${question}\n\nStudent Essay:\n${trimmedEssay}`;

  try {
    const res = await callOrthogonalFamily({
      family,
      temperature: 0.0,
      json: true,
      maxCompletionTokens: family === "qwen_27b" ? 650 : 900,
      timeoutMs: family === "gemini_flash" ? 9000 : 14000,
      thinkingBudget: 128,
      userId,
      feature: "v7_dynamic_rubric_audit",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const parsed = extractFirstJsonObject(res.text) as any;
    if (!parsed || typeof parsed.rubric_estimated_mark !== "number") return null;

    const cqRaw = String(parsed.chain_quality || "partial_chains").toLowerCase();
    const chainQuality: RubricAuditResult["chainQuality"] =
      cqRaw === "descriptive_assertions" || cqRaw === "developed_models" ? cqRaw : "partial_chains";

    const ao3Raw = String(parsed.ao3_verdict || "asserted_generic").toLowerCase();
    const ao3Verdict: RubricAuditResult["ao3Verdict"] =
      ao3Raw === "none" ||
      ao3Raw === "asserted_generic" ||
      ao3Raw === "balanced_contextual" ||
      ao3Raw === "prioritised_judgement"
        ? ao3Raw
        : "asserted_generic";

    return {
      requiredComponentsCount: clamp(Math.round(Number(parsed.required_components_count) || 3), 1, 6),
      coveredComponentsCount: clamp(Math.round(Number(parsed.covered_components_count) || 0), 0, 6),
      developedComponentsCount: clamp(Math.round(Number(parsed.developed_components_count) || 0), 0, 6),
      chainQuality,
      ao3Verdict,
      unreferencedDiagram: Boolean(parsed.unreferenced_diagram),
      offFocusParagraphs: clamp(Math.round(Number(parsed.off_focus_paragraphs) || 0), 0, 5),
      isOneSidedBestMethod: Boolean(parsed.is_one_sided_best_method),
      rubricEstimatedMark: clamp(Math.round(Number(parsed.rubric_estimated_mark)), 0, maxMark),
      rationale: String(parsed.rationale || "").slice(0, 220),
      model: res.model,
    };
  } catch (err) {
    console.warn("[rubric-auditor] Dynamic rubric audit failed gracefully:", err);
    return null;
  }
}
