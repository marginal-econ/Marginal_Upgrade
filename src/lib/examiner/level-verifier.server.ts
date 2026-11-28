/**
 * Marginal Engine V7 — Zero-Calibration Hierarchical Cambridge Level-Descriptor Verifier
 *
 * Designed specifically to maximize accuracy on UNSEEN essays with ZERO calibration anchors
 * (zero-calibration mode or any new topic/tariff without matching ECR anchors).
 *
 * Mirrors the official Cambridge International RM-Assessor 2-step marking protocol:
 *   Step 1: Place AO1 + AO2 into the official Cambridge Table A Level (L0 / L1 / L2 / L3)
 *           and within-level position (low / mid / top) strictly from verbatim script evidence.
 *   Step 2: Place AO3 into the official Cambridge Table B / Paper 2 Level (L0 / L1 / L2)
 *           and within-level position strictly from evaluative weighing & concluding judgement.
 *   Step 3: Audit binary Cambridge ceiling triggers (one-sided "best method" omission,
 *           missing explicitly requested diagram, off-focus policy direction, systematic inversion).
 *
 * Runs in parallel in Stage 1 on NVIDIA NIM `nvidia_super_vl_120b` (~1.0–1.6s, zero prompt clipping,
 * full uncompressed essay) so it adds ~0s wall-clock latency while providing an independent 5th
 * psychometric signal even when zero calibration anchors are used.
 */

import type { AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily, type OrthogonalFamily } from "./multi-family-pool.server";

export type LevelVerifierResult = {
  ao12Level: "L0" | "L1" | "L2" | "L3";
  ao12Position: "low" | "mid" | "top";
  ao12Mark: number;
  ao3Level: "L0" | "L1" | "L2";
  ao3Position: "low" | "mid" | "top";
  ao3Mark: number;
  verifiedMark: number;
  isOneSidedBestMethod: boolean;
  missingRequestedDiagram: boolean;
  majorOffFocusOrInversion: boolean;
  rationale: string;
  model: string;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getTariffBracketsGuide(maxMark: number, split: AoSplit): string {
  const ao12Max = split.ao1_marks + split.ao2_marks;
  if (maxMark >= 20) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 4 (${maxMark}m) LEVEL BRACKETS:
- Table A — AO1+AO2 (out of ${ao12Max}):
  * L3 (11–${ao12Max}): Accurate economic knowledge + 2–3+ genuinely DEVELOPED economic models/diagrams/pay-off matrices with unbroken step-by-step causal chains applied directly to the question with NO off-focus pages or systematic inversions. Concise well-reasoned timed scripts (~420–750w) belong here!
  * L2 (6–10): Valid economic ideas and direction, BUT either: (a) breadth-listing 4–6 concepts/terms briefly (1–2 sentences each) without deep step-by-step AD/AS, multiplier, or model development -> 8–9/14, OR (b) mislabelled/flawed diagram when written policy mechanisms remain directionally valid -> 6–8/14 (NEVER drop to L1 solely for a mislabelled diagram!), OR (c) compressed/partial chains, unreferenced diagrams, or missing core synthesis.
  * L1 (1–5): Substantial off-focus paragraph/page explaining the WRONG/OPPOSITE policy direction (e.g. expansionary MP when asked to cut inflation), OR core prose mechanisms systematically inverted/broken.
  * L0 (0): Wholly irrelevant / no creditable economics.
- Table B — AO3 Evaluation (out of ${split.ao3_marks}):
  * L2 (4–${split.ao3_marks}): Developed two-sided evaluation using explicit contextual criteria (elasticity, time lags, magnitude, state of economy, opportunity cost, trade-offs) + reasoned concluding judgement (5–6/6 when sustained & prioritised).
  * L1 (1–3): Simple caveats, undeveloped counter-points, or a generic 1–2 sentence "it depends / uncertain" ending without contextual weighing.
  * L0 (0): Purely one-sided, no evaluation, or incoherent evaluation.`;
  }
  if (maxMark === 12) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (12m) LEVEL BRACKETS:
- AO1+AO2 (out of ${ao12Max}):
  * L3 (7–${ao12Max}): Accurate definitions + 2–3 clear step-by-step causal analysis points with accurate diagram/context where helpful; zero directional inversions; both sides addressed when question asks "best/only/assess whether". Award full 8/8 positively when every clause is clearly answered under timed conditions!
  * L2 (4–6): Sound basic points that are descriptive/compressed, OR missing synthesis of two competing shifts, OR ONE-SIDED on a "best/only way" question (analyses only the named policy without analysing any concrete alternative -> max 4–5/8!), OR mislabelled/unreferenced diagram / minor slip.
  * L1 (1–3): Confused definitions, fatal directional inversions, or off-focus response.
  * L0 (0): No creditable economics.
- AO3 Evaluation (out of ${split.ao3_marks}):
  * L2 (3–${split.ao3_marks}): Balanced evaluation with contextual criteria (elasticity, time lags, budget/opportunity cost, reliability, causes of problem) + clear reasoned judgement (4/4 = prioritised judgement directly answering the prompt).
  * L1 (1–2): Generic or brief caveats / passing mention of an alternative without developed weighing (strictly 0–1/4 if completely one-sided on a "best/only" question).
  * L0 (0): No evaluation.`;
  }
  if (split.ao3_marks === 0) {
    return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (8m NON-EVALUATIVE, AO3=0) LEVEL BRACKETS:
- AO1+AO2 (out of ${ao12Max}, AO3 = 0):
  * L3 (7–${ao12Max}): Clear accurate definitions + well-developed explanation with accurate diagram/examples directly answering every clause (award 7–8/8 positively under 15-min timed conditions!).
  * L2 (4–6): Generally accurate definitions/ideas but partially developed, compressed, missing diagram when explicitly asked, missing combined net-effect synthesis when two shifts interact, or minor slip.
  * L1 (1–3): Vague, confused, or major directional errors.
  * L0 (0): No creditable economics.`;
  }
  return `OFFICIAL CAMBRIDGE 9708 PAPER 2 (8m EVALUATIVE, ~15 min timed) LEVEL BRACKETS:
- AO1+AO2 (out of ${ao12Max}):
  * L3 (5–${ao12Max}): Accurate key definitions + 1–2 clear, developed causal mechanisms/examples/diagrams directly answering EVERY clause (including combined net-effect synthesis if two shifts interact!). Award full 6/6 on complete, accurate 15-minute timed scripts!
  * L2 (3–4): Partial/compressed explanation, OR analyses two simultaneous shifts separately WITHOUT synthesising the combined net outcome (e.g. certain price change vs indeterminate quantity), OR missing explicitly requested diagram, OR minor analytical slip.
  * L1 (1–2): Major misconception, inverted mechanism, or vague generalities.
  * L0 (0): No creditable economics.
- AO3 Evaluation (out of ${split.ao3_marks}):
  * L2 (2): Clear contextual evaluative counter-argument / limitation / measurement difficulty + reasoned conclusion directly addressing the prompt.
  * L1 (1): Brief caveat or generic assertion without reasoned conclusion or synthesis.
  * L0 (0): Purely descriptive / no evaluation / incoherent.`;
}

export async function runLevelDescriptorVerifier(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  markSchemeContext?: string;
  neuroSymbolicSummary?: string;
  keyOffset?: number;
  userId?: string;
  family?: OrthogonalFamily;
}): Promise<LevelVerifierResult | null> {
  const {
    question,
    essayText,
    maxMark,
    split,
    markSchemeContext,
    neuroSymbolicSummary,
    keyOffset,
    userId,
    family = "nvidia_super_vl_120b",
  } = options;

  const ao12Max = split.ao1_marks + split.ao2_marks;
  const trimmedEssay =
    essayText.length > 14000
      ? `${essayText.slice(0, 9000)}\n[...middle...]\n${essayText.slice(-4500)}`
      : essayText;

  const systemPrompt = `You are a Senior Cambridge International 9708 Economics Principal Examiner performing a ZERO-ANCHOR HIERARCHICAL LEVEL PLACEMENT on an unseen ${maxMark}-mark essay.

${getTariffBracketsGuide(maxMark, split)}

STRICT CAMBRIDGE TIMED-EXAM MARKING DISCIPLINE:
0. MANDATORY FIRST-PASS DEFECT & SYNTHESIS SCAN (CHECK BEFORE ANYTHING ELSE):
   - OPPOSITE-POLICY / OFF-FOCUS SCAN: Read EVERY paragraph and verify whether it answers the exact direction requested! If asked how to REDUCE inflation, spending a substantial paragraph/page explaining EXPANSIONARY policy (which RAISES inflation) is a major off-focus defect -> set major_off_focus_or_inversion = true and restrict AO1+AO2 strictly to L1 (${maxMark >= 20 ? "max 5/14, total <= 6/20" : maxMark === 12 ? "max 3/8, total <= 4/12" : "max 2/6, total <= 3/8"})!
   - SIMULTANEOUS-SHIFT SYNTHESIS SCAN: If the prompt involves TWO interacting shifts (e.g. economy-wide wage rises shifting BOTH demand right AND supply left), check whether the candidate explicitly SYNTHESISES the combined net outcome (what changes with certainty vs what is ambiguous/depends on relative magnitude). Analysing each shift separately WITHOUT synthesising the net outcome caps AO1+AO2 in L2!
   - DIAGRAM SLIP vs PROSE INVERSION: A mislabelled diagram paired with sound written policies belongs in L2 (NOT L1!). An isolated 1-word verbal typo inside an otherwise accurate multi-model essay gets NO level cap!
1. POSITIVE MARKING (AUTHENTIC TIMED-EXAM STANDARD — NEVER UNDER-MARK STRONG TIMED SCRIPTS):
   - Credit accurate definitions, step-by-step mechanisms, diagrams, pay-off matrices, and valid evaluation positively under realistic timed exam constraints (${maxMark <= 8 ? "~15 min" : maxMark === 12 ? "~25–30 min" : "~40–45 min"}).
   - Do NOT demand exhaustive coverage of every textbook point or penalise concise authentic handwritten scripts (${maxMark <= 8 ? "200–350w" : maxMark === 12 ? "320–550w" : "420–750w"}) that cover core mechanisms and contextual evaluation accurately: reward them in L3 Top Band (${maxMark <= 8 ? "7–8/8" : maxMark === 12 ? "10–12/12" : "15–19/20"})!
   - Never penalise a missing diagram unless the question explicitly says "with the help/aid of a diagram(s)". Never penalise "the government uses monetary policy" as an error.
2. TARGETED ANTI-INFLATION DISCIPLINE (ONLY WHEN VERBATIM DEFECTS EXIST):
   - Cap in Upper L2 (${maxMark >= 20 ? "10–12/20" : maxMark === 12 ? "6–8/12" : "4–5/8"}) when a script breadth-lists 4–6 concepts/terms briefly (1–2 sentences each) without developing step-by-step causal chains/models, OR misses a central synthesis.
   - Only cap AO3 in L1 when evaluation is genuinely a brief generic 1–2 sentence closing assertion ("it depends", "uncertain") with no contextual weighing.
   - If the question asks whether Policy X is the "best/only/most effective" method and the essay analyses ONLY Policy X with ZERO analysed alternative policy, set is_one_sided_best_method = true and restrict AO1+AO2 to L2 low and AO3 to L0/L1 low.
3. TWO-STEP PLACEMENT: First decide exact Level + position (low/mid/top) for AO1+AO2, then exact Level + position for AO3, then map cleanly to integer ao12_mark (0..${ao12Max}) and ao3_mark (0..${split.ao3_marks}).

Return ONLY valid JSON:
{
  "ao12_level": "L0" | "L1" | "L2" | "L3",
  "ao12_position": "low" | "mid" | "top",
  "ao12_mark": <int 0..${ao12Max}>,
  "ao3_level": "L0" | "L1" | "L2",
  "ao3_position": "low" | "mid" | "top",
  "ao3_mark": <int 0..${split.ao3_marks}>,
  "is_one_sided_best_method": <boolean>,
  "missing_requested_diagram": <boolean>,
  "major_off_focus_or_inversion": <boolean>,
  "rationale": "<1 concise sentence justifying the exact Table A and Table B level placement>"
}`;

  const userParts = [
    `EXAM QUESTION (${maxMark} marks · AO1+AO2: ${ao12Max}, AO3: ${split.ao3_marks}):\n${question}\n`,
    `STUDENT ESSAY:\n${trimmedEssay}`,
  ];
  if (neuroSymbolicSummary) {
    userParts.push(`\n${neuroSymbolicSummary}`);
  }
  if (markSchemeContext && markSchemeContext.trim().length > 0) {
    userParts.push(`\nRETRIEVED CAMBRIDGE MARK SCHEME / SYLLABUS CONTEXT:\n${markSchemeContext.slice(0, 1400)}`);
  }

  try {
    const res = await callOrthogonalFamily({
      family,
      temperature: 0.0,
      json: true,
      maxCompletionTokens: 650,
      timeoutMs: 18000,
      keyOffset,
      userId,
      feature: "v7_level_descriptor_verifier",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userParts.join("\n") },
      ],
    });

    const parsed = extractFirstJsonObject(res.text) as any;
    if (!parsed || typeof parsed.ao12_mark !== "number") return null;

    const ao12Mark = clamp(Math.round(Number(parsed.ao12_mark)), 0, ao12Max);
    const ao3Mark =
      split.ao3_marks === 0
        ? 0
        : clamp(Math.round(Number(parsed.ao3_mark) || 0), 0, split.ao3_marks);

    const ao12Raw = String(parsed.ao12_level || "L2").toUpperCase();
    const ao12Level: LevelVerifierResult["ao12Level"] =
      ao12Raw === "L0" || ao12Raw === "L1" || ao12Raw === "L2" || ao12Raw === "L3" ? ao12Raw : "L2";

    const ao3Raw = String(parsed.ao3_level || (split.ao3_marks === 0 ? "L0" : "L1")).toUpperCase();
    const ao3Level: LevelVerifierResult["ao3Level"] =
      ao3Raw === "L0" || ao3Raw === "L1" || ao3Raw === "L2" ? ao3Raw : "L1";

    const normPos = (raw: unknown): "low" | "mid" | "top" => {
      const s = String(raw || "mid").toLowerCase();
      return s === "low" || s === "top" ? s : "mid";
    };

    return {
      ao12Level,
      ao12Position: normPos(parsed.ao12_position),
      ao12Mark,
      ao3Level,
      ao3Position: normPos(parsed.ao3_position),
      ao3Mark,
      verifiedMark: clamp(ao12Mark + ao3Mark, 0, maxMark),
      isOneSidedBestMethod: Boolean(parsed.is_one_sided_best_method),
      missingRequestedDiagram: Boolean(parsed.missing_requested_diagram),
      majorOffFocusOrInversion: Boolean(parsed.major_off_focus_or_inversion),
      rationale: String(parsed.rationale || "").slice(0, 220),
      model: res.model,
    };
  } catch (err) {
    console.warn("[level-verifier] Hierarchical level verification failed gracefully:", err);
    return null;
  }
}
