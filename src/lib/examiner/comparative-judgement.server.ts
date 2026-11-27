/**
 * Marginal Engine V4 — Psychometric Blind Comparative Judgement Tournament
 *
 * Educational assessment research (Cambridge Assessment / No More Marking) proves
 * that pairwise comparative judgement against real calibrated anchor scripts
 * dramatically reduces grade clustering and LLM score inflation.
 *
 * This module:
 * 1. Selects up to 3 real Cambridge ECR anchor scripts spanning Low / Middle / Top
 *    bands for the exact same tariff (8m, 12m, or 20m), strictly excluding the
 *    candidate script itself (leave-one-out hygiene).
 * 2. Runs a fast blind comparative tournament on an orthogonal model family in
 *    parallel with Pass 1 & Pass 2 (adding ~0s wall-clock latency).
 * 3. Computes a Bradley-Terry / ordinal anchor-interpolated mark and plausible
 *    band interval [plausibleLow, plausibleHigh] used to calibrate synthesis and
 *    trigger Principal Examiner arbitration when raw LLM scores drift.
 */

import type { Anchor } from "./calibration.server";
import type { AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { callOrthogonalFamily } from "./multi-family-pool.server";
import type { ComparativeAnchorMatch, ComparativeJudgementResult } from "./types";

function normalizeSnippet(text: string): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Checks whether an anchor is actually the same essay as the candidate submission
 * (prevents data leakage during Leave-One-Out ECR benchmarks or re-submissions).
 */
export function isSameScript(candidateText: string, anchorText: string): boolean {
  const c = normalizeSnippet(candidateText);
  const a = normalizeSnippet(anchorText);
  if (!c || !a) return false;
  if (c === a) return true;
  const prefixLen = Math.min(180, c.length, a.length);
  if (prefixLen >= 80 && c.slice(0, prefixLen) === a.slice(0, prefixLen)) {
    return true;
  }
  // Token Jaccard check for near-duplicate scripts
  const cTokens = new Set(c.split(" ").filter((w) => w.length >= 4));
  const aTokens = new Set(a.split(" ").filter((w) => w.length >= 4));
  if (cTokens.size === 0 || aTokens.size === 0) return false;
  let overlap = 0;
  for (const t of cTokens) if (aTokens.has(t)) overlap++;
  const jaccard = overlap / (cTokens.size + aTokens.size - overlap);
  return jaccard >= 0.85;
}

const TOPIC_STOPWORDS = new Set([
  "explain", "discuss", "assess", "evaluate", "consider", "extent", "which", "whether",
  "always", "should", "would", "could", "using", "diagram", "diagrams", "example",
  "examples", "between", "about", "their", "there", "these", "those", "economy",
  "economic", "government", "governments", "policy", "policies", "market", "markets",
  "country", "most", "effective", "best", "only", "help", "with", "from", "that", "this",
]);

function extractTopicKeywords(question: string): Set<string> {
  const words = (question || "").toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  return new Set(words.filter((w) => !TOPIC_STOPWORDS.has(w)));
}

function topicOverlapScore(qA: string, qB: string): number {
  const a = extractTopicKeywords(qA);
  const b = extractTopicKeywords(qB);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const w of a) if (b.has(w)) hits++;
  return hits / Math.min(a.size, b.size);
}

/**
 * Selects up to 3 topic-matched stratified real Cambridge anchors (Low, Middle, Top)
 * for the exact same tariff, strictly excluding the candidate script.
 */
export function selectStratifiedAnchors(
  anchors: Anchor[],
  candidateEssay: string,
  maxMark: number,
  candidateQuestion?: string,
): Anchor[] {
  const sameTariff = anchors.filter((a) => {
    if (a.max_mark !== maxMark) return false;
    if (isSameScript(candidateEssay, a.essay_text)) return false;
    return true;
  });

  if (sameTariff.length === 0) return [];

  const lowThresh = Math.round(maxMark * 0.45);
  const highThresh = Math.round(maxMark * 0.72);

  const pickBestInBand = (candidates: Anchor[], targetMark: number): Anchor | null => {
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
      const topicA = candidateQuestion ? topicOverlapScore(candidateQuestion, a.question) : 0;
      const topicB = candidateQuestion ? topicOverlapScore(candidateQuestion, b.question) : 0;
      // Strongly prefer topic-matched anchors within the same mark band
      const scoreA = topicA * 3.0 - Math.abs(a.mark - targetMark) / maxMark;
      const scoreB = topicB * 3.0 - Math.abs(b.mark - targetMark) / maxMark;
      return scoreB - scoreA;
    })[0];
  };

  const lowPool = sameTariff.filter((a) => a.mark <= lowThresh);
  const midPool = sameTariff.filter((a) => a.mark > lowThresh && a.mark < highThresh);
  const highPool = sameTariff.filter((a) => a.mark >= highThresh);

  const sorted = [...sameTariff].sort((a, b) => a.mark - b.mark);
  const low = pickBestInBand(lowPool, Math.round(maxMark * 0.3)) ?? sorted[0];
  const high = pickBestInBand(highPool, Math.round(maxMark * 0.85)) ?? sorted[sorted.length - 1];
  const midFallback = sorted.filter((a) => a !== low && a !== high);
  const mid =
    pickBestInBand(midPool.filter((a) => a !== low && a !== high), Math.round(maxMark * 0.58)) ??
    pickBestInBand(midFallback, Math.round(maxMark * 0.58));

  const picked: Anchor[] = [];
  if (low) picked.push(low);
  if (mid && mid !== low && mid !== high) picked.push(mid);
  if (high && high !== low) picked.push(high);

  return picked.slice(0, 3);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Proper Bradley-Terry / Ordinal Bracketing Estimator.
 *
 * Unlike naive offset averaging (which biases Top Band scripts downward when
 * compared against a Low anchor), bracketing treats:
 *   - "equal" to anchor M       -> strong point estimate at M
 *   - "slightly_better" than M  -> point estimate M + 1 (or +2 on 20m)
 *   - "slightly_worse" than M   -> point estimate M - 1 (or -2 on 20m)
 *   - "much_better" than M      -> LOWER BOUND only (mark >= M + step)
 *   - "much_worse" than M       -> UPPER BOUND only (mark <= M - step)
 */
function computeBracketedEstimate(
  comparisons: ComparativeAnchorMatch[],
  judgeEst: number,
  maxMark: number,
): { estimatedMark: number; plausibleLow: number; plausibleHigh: number } {
  const slightStep = maxMark >= 20 ? 2 : 1;
  const muchStep = maxMark >= 20 ? 4 : maxMark >= 12 ? 3 : 2;

  let lowerBound = 0;
  let upperBound = maxMark;
  const directAnchors: number[] = [];

  for (const c of comparisons) {
    switch (c.verdict) {
      case "equal":
        directAnchors.push(c.anchorMark);
        break;
      case "slightly_better":
        directAnchors.push(clamp(c.anchorMark + slightStep, 0, maxMark));
        lowerBound = Math.max(lowerBound, c.anchorMark);
        break;
      case "slightly_worse":
        directAnchors.push(clamp(c.anchorMark - slightStep, 0, maxMark));
        upperBound = Math.min(upperBound, c.anchorMark);
        break;
      case "much_better":
        lowerBound = Math.max(lowerBound, clamp(c.anchorMark + muchStep, 0, maxMark));
        break;
      case "much_worse":
        upperBound = Math.min(upperBound, clamp(c.anchorMark - muchStep, 0, maxMark));
        break;
    }
  }

  // If bounds crossed due to noisy comparison, relax bounds gracefully around judgeEst
  if (lowerBound > upperBound) {
    lowerBound = clamp(judgeEst - slightStep, 0, maxMark);
    upperBound = clamp(judgeEst + slightStep, 0, maxMark);
  }

  let estimatedMark: number;
  if (directAnchors.length > 0) {
    const directAvg = directAnchors.reduce((a, b) => a + b, 0) / directAnchors.length;
    estimatedMark = clamp(Math.round(directAvg * 0.55 + judgeEst * 0.45), lowerBound, upperBound);
  } else {
    estimatedMark = clamp(judgeEst, lowerBound, upperBound);
  }

  const spread = maxMark >= 20 ? 2 : 1;
  const plausibleLow = clamp(Math.max(lowerBound, estimatedMark - spread), 0, estimatedMark);
  const plausibleHigh = clamp(Math.min(upperBound, estimatedMark + spread), estimatedMark, maxMark);

  return { estimatedMark, plausibleLow, plausibleHigh };
}

function trimEssayForComparison(text: string, maxChars = 1500): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  // Keep intro + middle + conclusion so evaluation at the end is NEVER cut off
  const head = clean.slice(0, Math.floor(maxChars * 0.65));
  const tail = clean.slice(-Math.floor(maxChars * 0.35));
  return `${head} [...] ${tail}`;
}

export async function runComparativeJudgement(options: {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  anchors: Anchor[];
  userId?: string;
}): Promise<ComparativeJudgementResult | null> {
  const { question, essayText, maxMark, split, anchors, userId } = options;
  const stratified = selectStratifiedAnchors(anchors, essayText, maxMark, question);
  if (stratified.length < 2) return null;

  // Band-coverage guard: only run a comparative tournament when the anchor set actually spans
  // multiple bands (e.g. >= 35% of maxMark spread), preventing a high-only pool (8/12, 10/12, 11/12)
  // from extrapolating upward on a low-band script.
  const anchorMarks = stratified.map((a) => a.mark);
  const anchorSpan = Math.max(...anchorMarks) - Math.min(...anchorMarks);
  const minRequiredSpan = Math.max(3, Math.round(maxMark * 0.35));
  if (anchorSpan < minRequiredSpan) return null;

  const anchorBlocks = stratified
    .map(
      (a, idx) =>
        `=== REFERENCE SCRIPT ${idx + 1} (Official Cambridge Mark: ${a.mark}/${a.max_mark} · Band: ${a.band_label}) ===\n` +
        `Question: ${a.question}\n` +
        `Examiner Notes: ${a.notes ? a.notes.slice(0, 320) : "Calibrated official Cambridge ECR response."}\n` +
        `Script Excerpt: """${trimEssayForComparison(a.essay_text, 850)}"""`,
    )
    .join("\n\n");

  const systemPrompt = `You are a Cambridge International 9708 Economics Psychometric Comparative Judge.
Your job is NOT to mark in isolation — your job is to compare the CANDIDATE SCRIPT directly head-to-head against ${stratified.length} REAL OFFICIAL CAMBRIDGE ECR REFERENCE SCRIPTS of the exact same ${maxMark}-mark tariff (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).

COMPARATIVE JUDGEMENT RULES:
1. Ignore essay length alone — judge strictly by:
   - Accuracy of economic theory & transmission chains (no inverted shifts or off-focus pages)
   - Depth of AO2 step-by-step analysis & diagram/context integration
   - Genuine AO3 evaluative weighing & justified conclusion (if AO3 > 0)
2. Compare the CANDIDATE SCRIPT against EACH Reference Script independently:
   - "much_worse": clearly belongs a full level band below this reference
   - "slightly_worse": same general band, slightly weaker depth/accuracy/evaluation
   - "equal": virtually identical Cambridge standard
   - "slightly_better": same general band, slightly stronger depth/accuracy/evaluation
   - "much_better": clearly belongs a full level band above this reference
3. Then output your anchored "estimated_mark" (integer 0..${maxMark}) strictly consistent with where the candidate falls between the reference scripts.

Respond ONLY with valid JSON:
{
  "comparisons": [
    {
      "reference_index": 1,
      "verdict": "much_worse" | "slightly_worse" | "equal" | "slightly_better" | "much_better",
      "ao12_delta": <int -4..4>,
      "ao3_delta": <int -3..3>,
      "reason": "<1 concise sentence comparing economic depth, accuracy, and evaluation>"
    }
  ],
  "estimated_mark": <int 0..${maxMark}>,
  "plausible_low": <int 0..${maxMark}>,
  "plausible_high": <int 0..${maxMark}>
}`;

  const userPrompt =
    `${anchorBlocks}\n\n` +
    `=== CANDIDATE SCRIPT TO PLACE (${maxMark} marks) ===\n` +
    `Question: ${question}\n` +
    `Candidate Essay (FULL SUBMISSION — judge objectively against Cambridge 9708 level standards):\n"""${trimEssayForComparison(essayText, 4400)}"""`;

  try {
    const res = await callOrthogonalFamily({
      family: "openai_120b",
      temperature: 0.0,
      json: true,
      maxCompletionTokens: 1200,
      userId,
      feature: "v4_comparative_judgement",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const parsed = extractFirstJsonObject(res.text) as any;
    const rawComparisons: any[] = Array.isArray(parsed?.comparisons) ? parsed.comparisons : [];

    const comparisons: ComparativeAnchorMatch[] = [];

    for (let i = 0; i < stratified.length; i++) {
      const anchor = stratified[i];
      const match =
        rawComparisons.find((c) => Number(c?.reference_index) === i + 1) ?? rawComparisons[i];
      if (!match) continue;
      const verdictRaw = String(match.verdict || "equal").toLowerCase();
      const verdict: ComparativeAnchorMatch["verdict"] =
        verdictRaw === "much_worse" ||
        verdictRaw === "slightly_worse" ||
        verdictRaw === "equal" ||
        verdictRaw === "slightly_better" ||
        verdictRaw === "much_better"
          ? verdictRaw
          : "equal";

      comparisons.push({
        anchorMark: anchor.mark,
        anchorMaxMark: anchor.max_mark,
        anchorBand: anchor.band_label,
        verdict,
        ao12Delta: clamp(Number(match.ao12_delta) || 0, -6, 6),
        ao3Delta: clamp(Number(match.ao3_delta) || 0, -4, 4),
        reason: String(match.reason || "").slice(0, 220),
      });
    }

    if (comparisons.length === 0) return null;

    const judgeEst = Number.isFinite(Number(parsed?.estimated_mark))
      ? clamp(Math.round(Number(parsed.estimated_mark)), 0, maxMark)
      : Math.round(maxMark * 0.5);

    const { estimatedMark, plausibleLow, plausibleHigh } = computeBracketedEstimate(
      comparisons,
      judgeEst,
      maxMark,
    );

    return {
      estimatedMark,
      plausibleLow,
      plausibleHigh,
      anchorsCompared: comparisons.length,
      comparisons,
      judgeModel: res.model,
    };
  } catch (err) {
    console.warn("[comparative-judgement] Comparative tournament failed gracefully:", err);
    return null;
  }
}
