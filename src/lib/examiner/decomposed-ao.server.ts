/**
 * Marginal Engine V5 — Decomposed AO Micro-Examiners & Off-Focus Paragraph Auditor
 *
 * Eliminates LLM "halo-effect bleeding" (where fluent prose inflates off-focus essays
 * or harshness on one AO drags down all three AOs) by running two tiny, ultra-focused
 * micro-specialists in parallel on 100% FREE Groq keys:
 *
 *   1. AO1+AO2 Mechanism & Off-Focus Auditor (OpenAI 120B, temp 0.0):
 *      - Audits every paragraph for policy-direction & prompt alignment (ON_TARGET vs OFF_FOCUS).
 *      - Scores AO1 + AO2 strictly blind to evaluation.
 *   2. AO3 Evaluation & Judgement Specialist (Qwen 3.8 27B, temp 0.0):
 *      - Scores AO3 strictly blind to AO1/AO2 prose length, enforcing Cambridge Table B / Paper 2 levels.
 *   3. Long-Essay Structured Argument Mapper (OpenAI 20B, temp 0.0):
 *      - For 4,200+ char essays, extracts a lossless structured argument map so Groq TPM ceilings
 *        never truncate JSON outputs on long Paper 4 scripts.
 */

import type { AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily } from "./multi-family-pool.server";

export type DecomposedAoAudit = {
  ao1Awarded: number;
  ao2Awarded: number;
  ao3Awarded: number;
  decomposedTotal: number;
  onFocusRatio: number;
  wrongDirectionParagraphs: number;
  developedFrameworkCount: number;
  offFocusNote: string;
  ao3Level: string;
  ao3Rationale: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Compresses very long essays (>4,200 chars) into a structured, lossless economic
 * argument map using free `openai/gpt-oss-20b` so Pass 1 & Pass 2 never hit Groq
 * TPM ceilings or truncate JSON. Returns original text untouched for normal essays.
 */
export async function buildLongEssayArgumentMapIfNeeded(
  question: string,
  essayText: string,
  userId?: string,
): Promise<string> {
  if (!essayText || essayText.length <= 4200) return essayText;

  try {
    const res = await callOrthogonalFamily({
      family: "openai_20b",
      temperature: 0.0,
      json: false,
      maxCompletionTokens: 1600,
      userId,
      feature: "v5_long_essay_mapper",
      messages: [
        {
          role: "system",
          content:
            "You are a Cambridge 9708 Economics script transcriber. Summarize EVERY paragraph of this long student essay into a faithful, lossless structured transcript (max 3,000 chars total) preserving: (1) exact definitions and equations (e.g. MV=PQ, AD=C+I+G+X-M), (2) every causal chain and curve shift (including any real errors verbatim — note if a single word is clearly a 1-word verbal slip in an otherwise correct paragraph), (3) EVERY [DIAGRAM: ...] block and its axes/shifts, (4) every evaluative counter-argument and conclusion, and (5) key verbatim quotes in double quotes. NEVER drop diagrams or analytical depth.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nFull Student Essay:\n${essayText}`,
        },
      ],
    });
    if (res.text && res.text.trim().length >= 600) {
      return `[STRUCTURED LOSSLESS TRANSCRIPT OF LONG SUBMISSION (${essayText.length} chars)]\n${res.text.trim()}`;
    }
  } catch (err) {
    console.warn("[decomposed-ao] Long essay mapper failed gracefully, using trimmed full text:", err);
  }
  return essayText;
}

/**
 * Runs the two Decomposed Micro-Examiners in parallel on 100% free Groq keys.
 */
export async function runDecomposedAoAudit(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  userId?: string;
}): Promise<DecomposedAoAudit | null> {
  const { question, essayText, maxMark, split, userId } = options;
  const trimmedEssay =
    essayText.length > 6800
      ? `${essayText.slice(0, 4200)}\n[...middle section...]\n${essayText.slice(-2400)}`
      : essayText;

  const ao12System = `You are a Cambridge International 9708 Economics AO1+AO2, Framework Depth & Off-Focus Auditor.
Your ONLY job is to grade AO1 Knowledge (out of ${split.ao1_marks}) and AO2 Analysis (out of ${split.ao2_marks}) — COMPLETELY BLIND to AO3 evaluation — AND audit paragraph-by-paragraph policy direction & analytical model depth.

CRITICAL CAMBRIDGE RULES:
1. OFF-FOCUS / WRONG-DIRECTION CHECK: Audit EVERY paragraph against the exact direction requested by the question. If asked how to REDUCE inflation, a substantial paragraph/page explaining EXPANSIONARY monetary policy (which raises inflation) counts as wrong_direction_paragraphs >= 1 and lowers on_focus_ratio proportionally.
2. DEVELOPED ECONOMIC FRAMEWORKS vs BUZZWORD ASSERTIONS (developed_framework_count 0..6): Count how many distinct economic models/diagrams/multi-step transmission chains are ACTUALLY DEVELOPED step-by-step (e.g. AD/AS shift explained via C/I/G/X-M, Keynesian Cross/multiplier, Fisher MV=PQ, MSC/MSB welfare loss diagram explained in prose, MR=MC, Marshall-Lerner + J-curve). Passing 1-sentence assertions like "AD rises -> productivity, output, economic growth" without an AD/AS or multiplier model do NOT count as a developed framework!
   - On 20m Paper 4: descriptive buzzword scripts with developed_framework_count <= 1 belong strictly in Level 2 (ao2_awarded 6–8/12), NEVER Level 3! Scripts with 3+ developed models/diagrams integrated into unbroken chains belong in Level 3 (ao2_awarded 9–11/12).
3. VERBAL SLIP vs SYSTEMATIC INVERSION: Distinguish a 1-word verbal typo inside an otherwise correct paragraph (e.g. writing "depreciation" once right after "appreciating the exchange-rate" when the rest of the paragraph correctly describes appreciation) from a true systematic inversion (e.g. "higher interest rates decrease the cost of borrowing and boost AD"). NEVER cap a strong essay in Level 1/2 over a single 1-word verbal typo!
4. If wrong_direction_paragraphs >= 1 or major systematic directional sign-flips exist, restrict AO2 to Level 1 (${maxMark >= 20 ? "2–4/12" : maxMark === 12 ? "1–2/6" : "1–2/4"}).

Return ONLY valid JSON:
{
  "ao1_awarded": <int 0..${split.ao1_marks}>,
  "ao2_awarded": <int 0..${split.ao2_marks}>,
  "on_focus_ratio": <number 0.0..1.0>,
  "wrong_direction_paragraphs": <int 0..5>,
  "developed_framework_count": <int 0..6>,
  "off_focus_note": "<1 concise sentence>"
}`;

  const ao3System =
    split.ao3_marks === 0
      ? null
      : `You are a Cambridge International 9708 Economics AO3 Evaluation Specialist.
Your ONLY job is to grade AO3 Evaluation out of ${split.ao3_marks} marks (for a ${maxMark}-mark essay) — COMPLETELY BLIND to essay length or AO1/AO2 prose polish.

CAMBRIDGE AO3 CALIBRATION (${maxMark}m, out of ${split.ao3_marks}):
${
  maxMark >= 20
    ? `- 0–1/6 (Level 0/1 Low): No real evaluation, one-sided, or only a 1–2 sentence closing assertion.
- 2–3/6 (Level 1): Simple caveats or generic "depends on" mentions without developed contextual weighing.
- 4–5/6 (Level 2): Developed two-sided evaluation using explicit criteria (PED/elasticity, short vs long run lags, magnitude, opportunity cost, state of economy) + reasoned conclusion.
- 6/6 (Level 2 Top): Sustained evaluative synthesis throughout + decisive prioritized final judgement directly answering the prompt.`
    : maxMark === 12
      ? `- 0–1/4 (Level 1 Low): One-sided or generic 1-sentence conclusion with no developed counter-argument.
- 2/4 (Level 1/2 Border): Identifies a limitation or alternative policy but lacks contextual weighing or prioritized conclusion.
- 3/4 (Level 2): Balanced counter-arguments with contextual "depends on" criteria (elasticity, time lag, budget/opportunity cost) and a clear conclusion.
- 4/4 (Level 2 Top): Sustained contextual weighing + decisive prioritized judgement answering the exact prompt.`
      : `- 0/2: Purely descriptive / no evaluative contrast.
- 1/2: Brief limitation or counter-point without reasoned conclusion.
- 2/2: Clear evaluative counter-argument + reasoned conclusion addressing the prompt.`
}

Return ONLY valid JSON:
{
  "ao3_awarded": <int 0..${split.ao3_marks}>,
  "ao3_level": "<Level 0 | Level 1 | Level 2>",
  "ao3_rationale": "<1 concise sentence>"
}`;

  try {
    const ao12Promise = callOrthogonalFamily({
      family: "openai_120b",
      temperature: 0.0,
      json: true,
      maxCompletionTokens: 700,
      userId,
      feature: "v5_decomposed_ao12",
      messages: [
        { role: "system", content: ao12System },
        { role: "user", content: `Question (${maxMark}m):\n${question}\n\nStudent Essay:\n${trimmedEssay}` },
      ],
    });

    const ao3Promise = ao3System
      ? callOrthogonalFamily({
          family: "qwen_27b",
          temperature: 0.0,
          json: true,
          maxCompletionTokens: 600,
          userId,
          feature: "v5_decomposed_ao3",
          messages: [
            { role: "system", content: ao3System },
            { role: "user", content: `Question (${maxMark}m):\n${question}\n\nStudent Essay:\n${trimmedEssay}` },
          ],
        })
      : Promise.resolve(null);

    const [ao12Res, ao3Res] = await Promise.all([ao12Promise, ao3Promise]);
    const p12 = extractFirstJsonObject(ao12Res.text) as any;
    const p3 = ao3Res ? (extractFirstJsonObject(ao3Res.text) as any) : null;

    if (!p12 || typeof p12.ao2_awarded !== "number") return null;

    const ao1Awarded = clamp(Math.round(Number(p12.ao1_awarded) || 0), 0, split.ao1_marks);
    const ao2Awarded = clamp(Math.round(Number(p12.ao2_awarded) || 0), 0, split.ao2_marks);
    const ao3Awarded =
      split.ao3_marks === 0
        ? 0
        : clamp(Math.round(Number(p3?.ao3_awarded) || 0), 0, split.ao3_marks);

    const onFocusRatio = clamp(Number(p12.on_focus_ratio ?? 1), 0, 1);
    const wrongDirectionParagraphs = Math.max(0, Math.round(Number(p12.wrong_direction_paragraphs) || 0));
    const developedFrameworkCount = clamp(Math.round(Number(p12.developed_framework_count ?? 2)), 0, 6);

    return {
      ao1Awarded,
      ao2Awarded,
      ao3Awarded,
      decomposedTotal: clamp(ao1Awarded + ao2Awarded + ao3Awarded, 0, maxMark),
      onFocusRatio,
      wrongDirectionParagraphs,
      developedFrameworkCount,
      offFocusNote: String(p12.off_focus_note || "").slice(0, 220),
      ao3Level: String(p3?.ao3_level || (split.ao3_marks === 0 ? "N/A" : "Level 1")),
      ao3Rationale: String(p3?.ao3_rationale || "").slice(0, 220),
    };
  } catch (err) {
    console.warn("[decomposed-ao] Micro-examiner panel failed gracefully:", err);
    return null;
  }
}
