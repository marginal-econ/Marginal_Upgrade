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
 * 4. Runs in parallel on free `openai/gpt-oss-20b` (~1.2s, zero added wall-clock latency)
 *    to provide an independent 5th psychometric signal and generalizable Cambridge level caps.
 */

import type { AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily } from "./multi-family-pool.server";

export type RubricAuditResult = {
  requiredComponentsCount: number;
  coveredComponentsCount: number;
  developedComponentsCount: number;
  chainQuality: "descriptive_assertions" | "partial_chains" | "developed_models";
  ao3Verdict: "none" | "asserted_generic" | "balanced_contextual" | "prioritised_judgement";
  unreferencedDiagram: boolean;
  offFocusParagraphs: number;
  rubricEstimatedMark: number;
  rationale: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function runDynamicRubricAudit(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  userId?: string;
}): Promise<RubricAuditResult | null> {
  const { question, essayText, maxMark, split, userId } = options;
  const trimmedEssay =
    essayText.length > 4400
      ? `${essayText.slice(0, 2700)}\n[...middle...]\n${essayText.slice(-1500)}`
      : essayText;

  const systemPrompt = `You are a Cambridge International 9708 Economics Principal Examiner performing a fast, objective RUBRIC COVERAGE & EVIDENCE-DEPTH AUDIT on an unseen ${maxMark}-mark essay (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).

YOUR TASK (GENERALIZABLE TO ANY 9708 QUESTION):
1. Identify the 2–4 mandatory rubric components required by the exact question (e.g. definitions, both sides/policies, simultaneous shift synthesis, required diagram, evaluation).
2. Score how many are covered at all (covered_components_count) and how many are FULLY DEVELOPED step-by-step with economic models/diagrams (developed_components_count).
3. Classify "chain_quality" strictly:
   - "descriptive_assertions": mostly 1-step assertions or buzzword lists (e.g. "AD rises -> productivity, output, economic growth") without step-by-step AD/AS, S&D, multiplier, or MR=MC mechanics.
   - "partial_chains": some valid 2-step causal chains, but compressed, missing synthesis, or containing notable conceptual slips/unreferenced diagrams.
   - "developed_models": sustained 3-step causal chains with accurately integrated diagrams/models/equations (AD/AS, Keynesian multiplier, MSC/MSB, MR=MC, Marshall-Lerner + J-curve).
4. Classify "ao3_verdict" strictly:
   - "none": no evaluation or incoherent evaluation.
   - "asserted_generic": brief/repetitive caveats or a generic 1–2 sentence "it depends / uncertain / both effective" ending without contextual weighing.
   - "balanced_contextual": multiple developed counter-arguments with explicit criteria (elasticity, time lags, opportunity cost, state of economy) + clear conclusion.
   - "prioritised_judgement": sustained contextual weighing throughout + decisive prioritised judgement directly answering the prompt.
5. Detect "unreferenced_diagram" (true if a diagram is present but NOT explained in the prose) and "off_focus_paragraphs" (count of substantial paragraphs explaining the WRONG/opposite policy direction or irrelevant topic).
6. Output "rubric_estimated_mark" (int 0..${maxMark}) strictly aligned with Cambridge 9708 level descriptors (do NOT inflate descriptive Level 2 scripts into Level 3; do NOT crush valid Level 2 scripts into Level 1).

Return ONLY valid JSON:
{
  "required_components_count": <int 2..5>,
  "covered_components_count": <int 0..5>,
  "developed_components_count": <int 0..5>,
  "chain_quality": "descriptive_assertions" | "partial_chains" | "developed_models",
  "ao3_verdict": "none" | "asserted_generic" | "balanced_contextual" | "prioritised_judgement",
  "unreferenced_diagram": <boolean>,
  "off_focus_paragraphs": <int 0..5>,
  "rubric_estimated_mark": <int 0..${maxMark}>,
  "rationale": "<1 concise sentence>"
}`;

  try {
    const res = await callOrthogonalFamily({
      family: "openai_20b",
      temperature: 0.0,
      json: true,
      maxCompletionTokens: 600,
      userId,
      feature: "v6_dynamic_rubric_audit",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question (${maxMark}m):\n${question}\n\nStudent Essay:\n${trimmedEssay}` },
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
      rubricEstimatedMark: clamp(Math.round(Number(parsed.rubric_estimated_mark)), 0, maxMark),
      rationale: String(parsed.rationale || "").slice(0, 220),
    };
  } catch (err) {
    console.warn("[rubric-auditor] Dynamic rubric audit failed gracefully:", err);
    return null;
  }
}
