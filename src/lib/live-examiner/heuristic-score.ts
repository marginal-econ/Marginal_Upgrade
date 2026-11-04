import { defaultSplitForMaxMark, TARIFF_SPLITS } from "@/lib/examiner/config";
import type { AoBreakdown, NextMove, ScoreEstimate, SentenceSpan } from "./types";

const DEFINITION_PATTERN =
  /\b(is defined as|refers to|means that|is when|are when|occurs when|is the responsiveness|measures the percentage change|formula for)\b/i;
const CAUSAL_CONNECTIVES =
  /\b(because|therefore|this leads to|as a result|which means|consequently|meaning that|thus|hence|causes?|results? in)\b/gi;
const EVAL_PATTERNS =
  /\b(however|on the other hand|depends on|depending on|in the short run|in the long run|to what extent|overall|in conclusion|on balance|ultimately|trade-off|limitation|unintended consequence)\b/gi;
const CONTEXT_PATTERNS =
  /\b(for example|for instance|e\.g\.|uk|us|usa|china|india|singapore|firms?|consumers?|government|market|tax|subsidy|ped|cpi|inflation|unemployment)\b/gi;

/**
 * Computes an instant, provisional Cambridge 9708 score estimate based on structural signals,
 * classified sentences, and exact tariff allocations.
 */
export function computeHeuristicScore(params: {
  sentences: { text: string; aoTag?: string | null; paragraphIndex: number }[];
  question: string;
  maxMark: 8 | 12 | 20;
}): ScoreEstimate {
  const { sentences, question, maxMark } = params;
  const split = TARIFF_SPLITS[maxMark] || defaultSplitForMaxMark(maxMark);

  if (sentences.length === 0) {
    return {
      total: 0,
      maxMark,
      band: "No text entered",
      confidence: 0.9,
      aoBreakdown: { ao1: 0, ao2: 0, ao3: 0 },
      nextMoves: [
        {
          id: "start_definition",
          aoTarget: "ao1",
          title: "Define the core concept",
          detail: "Begin by accurately defining the key economic term from the question.",
          potentialGain: 1,
        },
      ],
      isProvisional: true,
      timestamp: Date.now(),
    };
  }

  // Count features across sentences
  let defCount = 0;
  let causalLinks = 0;
  let contextLinks = 0;
  let evalLinks = 0;
  let hasConclusion = false;
  let hasDiagram = false;

  const totalWords = sentences.reduce(
    (acc, s) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );

  const paragraphs = new Set(sentences.map((s) => s.paragraphIndex));
  const maxParagraph = Math.max(...Array.from(paragraphs), 0);

  for (const s of sentences) {
    const text = s.text;
    if (DEFINITION_PATTERN.test(text)) defCount++;
    if (CAUSAL_CONNECTIVES.test(text)) causalLinks += (text.match(CAUSAL_CONNECTIVES) || []).length;
    if (CONTEXT_PATTERNS.test(text)) contextLinks += (text.match(CONTEXT_PATTERNS) || []).length;
    if (EVAL_PATTERNS.test(text)) evalLinks += (text.match(EVAL_PATTERNS) || []).length;
    if (/\[DIAGRAM:[^\]]*\]/i.test(text)) hasDiagram = true;

    if (
      s.paragraphIndex === maxParagraph &&
      maxParagraph > 0 &&
      /\b(overall|in conclusion|to conclude|on balance|ultimately)\b/i.test(text)
    ) {
      hasConclusion = true;
    }
  }

  // Calculate provisional AO marks
  // AO1: Knowledge & Understanding (Cap = split.ao1_marks)
  let rawAo1 = 0;
  if (defCount > 0) rawAo1 += 1;
  if (totalWords >= 50 && (defCount > 1 || causalLinks >= 1)) rawAo1 += 1;
  const ao1 = Math.min(split.ao1_marks, rawAo1);

  // AO2: Analysis & Application (Cap = split.ao2_marks)
  let rawAo2 = 0;
  // Analysis chains credit
  if (causalLinks >= 1) rawAo2 += 1;
  if (causalLinks >= 3) rawAo2 += 1;
  if (causalLinks >= 5) rawAo2 += 1;
  // Application credit
  if (contextLinks >= 1) rawAo2 += 1;
  if (contextLinks >= 3) rawAo2 += 1;
  if (hasDiagram || causalLinks >= 7) rawAo2 += 1;
  if (maxMark === 20) {
    // Extended tariff scaling for 20 markers
    if (causalLinks >= 9) rawAo2 += 2;
    if (causalLinks >= 12) rawAo2 += 2;
    if (contextLinks >= 5) rawAo2 += 2;
  }
  const ao2 = Math.min(split.ao2_marks, rawAo2);

  // AO3: Evaluation (Cap = split.ao3_marks)
  let rawAo3 = 0;
  if (evalLinks >= 1) rawAo3 += 1;
  if (evalLinks >= 2) rawAo3 += 1;
  if (hasConclusion) rawAo3 += 1;
  if (evalLinks >= 4 && hasConclusion) rawAo3 += 1;
  if (maxMark === 20 && evalLinks >= 6) rawAo3 += 2;
  const ao3 = Math.min(split.ao3_marks, rawAo3);

  // Total clamped
  const total = Math.min(maxMark, ao1 + ao2 + ao3);

  // Band descriptor
  const ratio = total / maxMark;
  let band = "Level 1: Basic";
  if (ratio >= 0.75) {
    band = "Level 4: Thorough & fully justified";
  } else if (ratio >= 0.5) {
    band = "Level 3: Sound analysis & balanced";
  } else if (ratio >= 0.25) {
    band = "Level 2: Developing explanation";
  }

  // Next Moves (ranked by potential marginal gain)
  const nextMoves: NextMove[] = [];

  if (ao1 < split.ao1_marks) {
    nextMoves.push({
      id: "improve_ao1",
      aoTarget: "ao1",
      title: "Add accurate economic definition",
      detail: `Your AO1 score is ${ao1}/${split.ao1_marks}. Define key concepts using formal Cambridge terms.`,
      potentialGain: split.ao1_marks - ao1,
    });
  }

  if (ao2 < split.ao2_marks) {
    if (causalLinks < 3) {
      nextMoves.push({
        id: "improve_ao2_chain",
        aoTarget: "ao2",
        title: "Build multi-step causal chains",
        detail: `Link your cause to effect with connective phrases: 'This leads to... which causes... resulting in...'.`,
        potentialGain: 1,
      });
    } else if (contextLinks < 2) {
      nextMoves.push({
        id: "improve_ao2_app",
        aoTarget: "ao2",
        title: "Apply reasoning to context",
        detail: `Ground your theory with concrete examples or context from the question.`,
        potentialGain: 1,
      });
    }
  }

  if (ao3 < split.ao3_marks) {
    if (evalLinks === 0) {
      nextMoves.push({
        id: "improve_ao3_eval",
        aoTarget: "ao3",
        title: "Add evaluative contrast",
        detail: `Introduce a counter-argument or condition: 'However, this depends on the price elasticity of demand...'.`,
        potentialGain: 1,
      });
    } else if (!hasConclusion) {
      nextMoves.push({
        id: "improve_ao3_conclusion",
        aoTarget: "ao3",
        title: "Provide a justified conclusion",
        detail: `End with a reasoned final judgement answering the command word directly.`,
        potentialGain: 1,
      });
    }
  }

  // Keep top 3 recommendations
  const topMoves = nextMoves.slice(0, 3);

  return {
    total,
    maxMark,
    band,
    confidence: 0.65, // Provisional heuristic confidence
    aoBreakdown: { ao1, ao2, ao3 },
    nextMoves: topMoves,
    isProvisional: true,
    timestamp: Date.now(),
  };
}
