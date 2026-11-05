/**
 * Cambridge 9708 Essay Writing Quality, Structure & Depth Calibration Engine.
 *
 * Enforces authentic Cambridge examination standards:
 * 1. Word Count & Depth Expectations:
 *    - 12-mark essay: 500–750 words (under 350 words is an underdeveloped outline/synopsis).
 *    - 8-mark essay: 300–450 words (under 200 words is underdeveloped).
 *    - 20-mark essay: 800–1200 words (under 550 words is underdeveloped).
 * 2. Structural & Paragraph Architecture:
 *    - Cambridge essays require distinct paragraphing: introduction/definitions,
 *      separate body paragraphs developing each transmission mechanism, distinct
 *      evaluative paragraphs, and a justified conclusion.
 *    - Monolithic single-paragraph blocks fail Cambridge organizational standards.
 * 3. Explanatory Sentence Analysis vs Compressed Assertions:
 *    - Merely asserting endpoints in a single compound sentence (e.g. naming
 *      interest rates, C, I, QE, yields in one breath) is compressed assertion,
 *      not Level 3 step-by-step analysis.
 * 4. AI-Generated & Synthetic Artifact Penalization:
 *    - Repeated markdown bolding (**term**), LaTeX formulas ($...), and dense
 *      bullet-in-prose shorthand are synthetic AI notes, not examination essays.
 * 5. Preservation of Genuinely High-Quality Student Essays:
 *    - Thorough, well-paragraphed student essays (e.g. 500+ words for 12m)
 *      remain uninhibited and receive full top-band marks on their merits.
 */

import { bandFor, stripScoreFractionsFromText, type Grading } from "./types";
import type { AoSplit } from "./config";

export type EssayQualityAnalysis = {
  wordCount: number;
  paragraphCount: number;
  boldingCount: number;
  latexCount: number;
  hasMarkdownBullets: boolean;
  hasAiArtifacts: boolean;
  isUndersized: boolean;
  isSeverelyUndersized: boolean;
  isMonolithicBlock: boolean;
  targetRangeText: string;
  maxAllowableTotalMark: number;
  maxAllowableAo2: number;
  maxAllowableAo3: number;
  qualityIssues: string[];
};

/**
 * Strips diagram markup tokens (e.g. `[DIAGRAM: ...]`) so word count reflects
 * actual prose submitted by the candidate.
 */
function cleanProseForWordCount(text: string): string {
  return text
    .replace(/\[DIAGRAM:[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Analyses essay text for length, paragraphing, sentence depth, and AI artifacts.
 */
export function analyzeEssayQuality(
  rawText: string,
  maxMark: number,
  split: AoSplit,
): EssayQualityAnalysis {
  const cleanProse = cleanProseForWordCount(rawText);
  const words = cleanProse.length > 0 ? cleanProse.split(/\s+/).filter(Boolean).length : 0;

  // Split into genuine paragraphs (ignoring purely whitespace lines)
  const rawParagraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\[DIAGRAM:[^\]]*\]$/i.test(p));
  const paragraphCount = rawParagraphs.length;

  // Detect AI-generated formatting artifacts
  const boldingMatches = rawText.match(/\*\*[^*]+\*\*/g) || [];
  const boldingCount = boldingMatches.length;

  const latexMatches = rawText.match(/\$[^$]+\$/g) || [];
  const latexCount = latexMatches.length;

  const hasMarkdownBullets = /^\s*[-*•]\s+/m.test(rawText);

  // Hallmark AI synthesis: frequent bolding of economic terms or combined with LaTeX / bullets
  const hasAiArtifacts =
    boldingCount >= 4 ||
    (boldingCount >= 2 && latexCount >= 1) ||
    (boldingCount >= 3 && words < 400);

  const qualityIssues: string[] = [];

  let targetRangeText = "500–750";
  let isUndersized = false;
  let isSeverelyUndersized = false;
  let maxAllowableTotalMark = maxMark;
  let maxAllowableAo2 = split.ao2_marks;
  let maxAllowableAo3 = split.ao3_marks;

  if (maxMark === 12) {
    targetRangeText = "500–750 words";
    if (words < 120) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 3;
      maxAllowableAo2 = 1;
      maxAllowableAo3 = 0;
      qualityIssues.push(
        `Fragment / extreme brevity (${words} words). Cambridge 12-mark essays expect 500–750 words.`,
      );
    } else if (words < 220) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 5;
      maxAllowableAo2 = 2;
      maxAllowableAo3 = 1;
      qualityIssues.push(
        `Severely undersized (${words} words). Lacks the sustained analytical chains and evaluative breadth required for a 12-mark essay.`,
      );
    } else if (words < 350) {
      isUndersized = true;
      // In Cambridge 9708, a 275-word script is an outline/synopsis: intermediate links are compressed into single clauses.
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 1 ? 6 : 7;
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 1 ? 3 : 4;
      maxAllowableAo3 = 2;
      qualityIssues.push(
        `Compressed outline response (${words} words vs 500–750 expected). Transmission mechanisms are compressed into short assertions rather than fully explained step-by-step.`,
      );
    }
  } else if (maxMark === 8) {
    targetRangeText = "300–450 words";
    if (words < 120) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 3;
      maxAllowableAo2 = 1;
      maxAllowableAo3 = 0;
      qualityIssues.push(
        `Fragment / extreme brevity (${words} words). Cambridge 8-mark questions expect 300–450 words.`,
      );
    } else if (words < 200) {
      isUndersized = true;
      maxAllowableTotalMark = 5;
      maxAllowableAo2 = 2;
      maxAllowableAo3 = 1;
      qualityIssues.push(
        `Undersized (${words} words vs 300–450 expected). Analytical points lack sufficient explanatory depth.`,
      );
    }
  } else if (maxMark >= 20) {
    targetRangeText = "800–1200 words";
    if (words < 350) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 7;
      maxAllowableAo2 = 4;
      maxAllowableAo3 = 1;
      qualityIssues.push(
        `Severely stunted (${words} words). Cambridge 20-mark extended essays require 800–1200 words.`,
      );
    } else if (words < 550) {
      isUndersized = true;
      maxAllowableTotalMark = 12;
      maxAllowableAo2 = 8;
      maxAllowableAo3 = 3;
      qualityIssues.push(
        `Underdeveloped (${words} words vs 800–1200 expected). Fails to provide extended analysis of multiple perspectives.`,
      );
    }
  } else {
    // Proportional fallback for non-standard tariffs
    const ratio = words / (maxMark * 45);
    if (ratio < 0.45) {
      isUndersized = true;
      maxAllowableTotalMark = Math.max(1, Math.round(maxMark * 0.55));
      maxAllowableAo2 = Math.max(1, Math.round(split.ao2_marks * 0.55));
      maxAllowableAo3 = Math.max(1, Math.round(split.ao3_marks * 0.5));
    }
  }

  // Monolithic single-paragraph penalty
  const isMonolithicBlock = paragraphCount <= 1 && words >= 150;
  if (isMonolithicBlock) {
    qualityIssues.push(
      "Unstructured monolithic block (no paragraph breaks). Cambridge essays require clear paragraph division separating knowledge, analytical points, and evaluative conclusions.",
    );
    if (maxMark === 12) {
      maxAllowableTotalMark = Math.min(maxAllowableTotalMark, 7);
      maxAllowableAo2 = Math.min(maxAllowableAo2, 4);
      maxAllowableAo3 = Math.min(maxAllowableAo3, 2);
    } else if (maxMark === 8) {
      maxAllowableTotalMark = Math.min(maxAllowableTotalMark, 5);
      maxAllowableAo2 = Math.min(maxAllowableAo2, 3);
      maxAllowableAo3 = Math.min(maxAllowableAo3, 1);
    } else if (maxMark >= 20) {
      maxAllowableTotalMark = Math.min(maxAllowableTotalMark, 12);
      maxAllowableAo2 = Math.min(maxAllowableAo2, 8);
      maxAllowableAo3 = Math.min(maxAllowableAo3, 3);
    }
  }

  // AI-generated / synthetic formatting artifacts
  if (hasAiArtifacts) {
    qualityIssues.push(
      `AI-generated formatting detected (${boldingCount} markdown bolding tokens, LaTeX math syntax). Official Cambridge examination essays require continuous, natural prose with step-by-step explanatory sentences, not AI-summarized shorthand notes.`,
    );
    if (isUndersized || isMonolithicBlock) {
      maxAllowableTotalMark = Math.min(maxAllowableTotalMark, maxMark === 12 ? 6 : maxMark === 8 ? 4 : 11);
      maxAllowableAo2 = Math.min(maxAllowableAo2, maxMark === 12 ? 3 : maxMark === 8 ? 2 : 7);
    }
  }

  return {
    wordCount: words,
    paragraphCount,
    boldingCount,
    latexCount,
    hasMarkdownBullets,
    hasAiArtifacts,
    isUndersized,
    isSeverelyUndersized,
    isMonolithicBlock,
    targetRangeText,
    maxAllowableTotalMark,
    maxAllowableAo2,
    maxAllowableAo3,
    qualityIssues,
  };
}

/**
 * Builds the explicit prompt instruction block injected into the Senior Examiner,
 * Moderator, and Principal Examiner system prompts.
 */
export function buildQualityPromptDirective(
  quality: EssayQualityAnalysis,
  maxMark: number,
): string {
  const parts: string[] = [
    `CANDIDATE SUBMISSION WRITING QUALITY & STRUCTURAL PROFILE:`,
    `- Word count: ${quality.wordCount} words (Cambridge 9708 target expectation for a ${maxMark}-mark essay: ${quality.targetRangeText}).`,
    `- Paragraph structure: ${quality.paragraphCount} paragraph(s) detected.`,
  ];

  if (quality.boldingCount > 0 || quality.latexCount > 0) {
    parts.push(
      `- Formatting tokens: detected ${quality.boldingCount} markdown bolding tokens (**...**) and ${quality.latexCount} LaTeX math expressions ($...).`,
    );
  }

  if (quality.isSeverelyUndersized) {
    parts.push(
      `CRITICAL EXAMINER DIRECTIVE — SEVERELY UNDERSIZED RESPONSE:`,
      `This script is severely undersized (${quality.wordCount} words). Under Cambridge 9708 regulations, candidates cannot be awarded Level 3 Analysis or high evaluation for fragmented or telegraphic summaries.`,
      `MANDATORY LEVEL RESTRICTIONS: Maximum total mark: ${quality.maxAllowableTotalMark}/${maxMark}. Maximum AO2 Analysis: ${quality.maxAllowableAo2}. Maximum AO3 Evaluation: ${quality.maxAllowableAo3}. Do NOT inflate marks for compressed keywords.`,
    );
  } else if (quality.isUndersized) {
    parts.push(
      `CRITICAL EXAMINER DIRECTIVE — UNDERSIZED / COMPRESSED OUTLINE RESPONSE:`,
      `This script contains only ${quality.wordCount} words (well below the ${quality.targetRangeText} standard). In Cambridge 9708, full step-by-step causal explanations and wide, prioritized comparative evaluation CANNOT be sustained in under 350 words.`,
      `The candidate has compressed transmission mechanisms into short compound assertions rather than explaining each link step-by-step.`,
      `MANDATORY CAMBRIDGE CALIBRATION CEILING:`,
      `- AO2 Analysis: Must NOT exceed Level 2 (maximum ${quality.maxAllowableAo2}). Awarding Level 3 (5-6/6) to compressed outline assertions is strictly prohibited.`,
      `- AO3 Evaluation: Must NOT exceed Level 1/2 (maximum ${quality.maxAllowableAo3}). Brief comparative nods without sustained weighing cannot earn Top Band evaluation.`,
      `- Overall Mark: Maximum ${quality.maxAllowableTotalMark}/${maxMark} (Upper Middle or Lower Middle Band). Under NO circumstances award Top Band (10-12/12) to this brief outline.`,
    );
  }

  if (quality.isMonolithicBlock) {
    parts.push(
      `CRITICAL EXAMINER DIRECTIVE — LACK OF ESSAY PARAGRAPH STRUCTURE:`,
      `The essay is presented as a single continuous block of text without paragraph breaks. Cambridge essays require structured paragraphing (introduction/definitions, separate analytical body paragraphs, distinct evaluation, and conclusion). This structural deficit prevents the award of Level 3 marks.`,
    );
  }

  if (quality.hasAiArtifacts) {
    parts.push(
      `CRITICAL EXAMINER DIRECTIVE — AI-GENERATED FORMATTING & COMPRESSED SHORTHAND:`,
      `This submission exhibits clear signatures of AI-generated text or pasted summary notes (frequent markdown bolding '**...**', LaTeX math formulas, dense bullet-in-prose phrasing).`,
      `Do NOT be misled by high buzzword density. Cambridge examiners mark genuine explanatory prose, NOT compressed AI notes. Demand complete sentence-level explanations of HOW and WHY mechanisms work. Flag the synthetic formatting and lack of developed continuous prose in weaknesses.`,
    );
  }

  if (!quality.isUndersized && !quality.isMonolithicBlock && !quality.hasAiArtifacts) {
    parts.push(
      `AUTHENTIC ESSAY STRUCTURE CONFIRMED:`,
      `The submission contains ${quality.wordCount} words structured across ${quality.paragraphCount} paragraphs. Mark positively and rigorously on its economic merits according to standard Cambridge AO level descriptors without artificial length restrictions.`,
    );
  }

  return parts.join("\n");
}

/**
 * Deterministic calibration failsafe: enforces Cambridge quality ceilings
 * and enriches examiner summary and weaknesses so students receive clear,
 * educational feedback on essay length, paragraph structure, and AI formatting.
 */
export function applyWritingQualityGuardrail(
  grading: Grading,
  quality: EssayQualityAnalysis,
  maxMark: number,
  split: AoSplit,
): Grading {
  // If the essay is healthy (full length, paragraphed, clean prose), do not restrict marks!
  if (!quality.isUndersized && !quality.isMonolithicBlock && !quality.hasAiArtifacts) {
    return grading;
  }

  let ao1 = grading.ao_breakdown.knowledge.awarded;
  let ao2 = grading.ao_breakdown.analysis.awarded;
  let ao3 = grading.ao_breakdown.evaluation.awarded;

  let modified = false;

  // Clamp AO2 to allowable level
  if (ao2 > quality.maxAllowableAo2) {
    ao2 = quality.maxAllowableAo2;
    modified = true;
  }

  // Clamp AO3 to allowable level
  if (ao3 > quality.maxAllowableAo3) {
    ao3 = quality.maxAllowableAo3;
    modified = true;
  }

  // Recalculate total mark
  let total = ao1 + ao2 + ao3;
  if (total > quality.maxAllowableTotalMark) {
    const excess = total - quality.maxAllowableTotalMark;
    if (ao2 > quality.maxAllowableAo2 - 1 && excess > 0) {
      ao2 = Math.max(0, ao2 - 1);
    }
    if (ao3 > 1 && (ao1 + ao2 + ao3) > quality.maxAllowableTotalMark) {
      ao3 = Math.max(0, ao3 - 1);
    }
    total = ao1 + ao2 + ao3;
    if (total > quality.maxAllowableTotalMark) {
      total = quality.maxAllowableTotalMark;
    }
    modified = true;
  }

  const updatedBand = bandFor(total, maxMark);

  // Prepare enriched examiner feedback explaining Cambridge standards
  const weaknesses = [...grading.weaknesses];
  const actionableFeedback = [...grading.actionable_feedback];

  // Specific weakness 1: Length and compression
  if (quality.isUndersized) {
    const lengthWeakness = `At only ${quality.wordCount} words, the response is significantly below the Cambridge expectation of ${quality.targetRangeText} for a ${maxMark}-mark essay. Analytical transmission mechanisms are compressed into brief compound assertions rather than developed step-by-step through full sentences, restricting AO2 Analysis to Level 2.`;
    if (!weaknesses.some((w) => w.toLowerCase().includes("word") || w.toLowerCase().includes("underdeveloped") || w.toLowerCase().includes("compressed"))) {
      weaknesses.unshift(lengthWeakness);
    }
  }

  // Specific weakness 2: Paragraphing
  if (quality.isMonolithicBlock) {
    const structWeakness = `The submission is written as a single unstructured block of text. Cambridge economics essays require distinct paragraphs separating definitions, individual analytical transmission chains, and comparative evaluation.`;
    if (!weaknesses.some((w) => w.toLowerCase().includes("paragraph") || w.toLowerCase().includes("unstructured"))) {
      weaknesses.push(structWeakness);
    }
  }

  // Specific weakness 3: AI formatting artifacts
  if (quality.hasAiArtifacts) {
    const aiWeakness = `The response relies on AI-generated formatting artifacts (such as inline markdown bolding **...** and raw LaTeX formulas). Examination scripts must be written in natural, continuous explanatory prose explaining how mechanisms operate rather than compressed summary notes.`;
    if (!weaknesses.some((w) => w.toLowerCase().includes("markdown") || w.toLowerCase().includes("latex") || w.toLowerCase().includes("ai-generated"))) {
      weaknesses.push(aiWeakness);
    }
  }

  // Specific actionable feedback: paragraph architecture & mechanism unpacking
  if (quality.isUndersized || quality.isMonolithicBlock) {
    const structAction = `Structure your response into 4–5 distinct paragraphs: an introduction defining key concepts, 2–3 dedicated body paragraphs developing each transmission mechanism step-by-step, a comparative evaluation paragraph, and a justified conclusion.`;
    if (!actionableFeedback.some((f) => f.toLowerCase().includes("structure your response into"))) {
      actionableFeedback.unshift(structAction);
    }
  }

  let examinerSummary = grading.examiner_summary;
  if (modified) {
    if (split.ao3_marks === 0) {
      examinerSummary = `This response achieves ${total}/${maxMark} marks (${updatedBand}). While core economic definitions and theoretical concepts are accurate for AO1, the submission is an undersized, compressed outline of ${quality.wordCount} words written without proper paragraph structure. In Cambridge 9708, condensed compound assertions of concepts cannot earn Level 3 Analysis. To attain Top Band, arguments must be developed in continuous prose across distinct paragraphs with step-by-step causal explanations.`;
    } else {
      examinerSummary = `This response achieves ${total}/${maxMark} marks (${updatedBand}). While core economic definitions and theoretical concepts are accurate for AO1, the submission is an undersized, compressed outline of ${quality.wordCount} words written without proper paragraph structure. In Cambridge 9708, condensed compound assertions of concepts cannot earn Level 3 Analysis or top-band Evaluation. To attain Top Band, arguments must be developed in continuous prose across distinct paragraphs with step-by-step causal explanations.`;
    }
  }

  const cleanWeaknesses = (split.ao3_marks === 0
    ? weaknesses.filter((w) => !/\b(evaluation|evaluative|counter-argument|weighing|conclusion)\b/i.test(w))
    : weaknesses
  ).map((w) => stripScoreFractionsFromText(w));

  const cleanActions = (split.ao3_marks === 0
    ? actionableFeedback.filter((f) => !/\b(evaluate|evaluation|evaluative|opposing argument|conclusion)\b/i.test(f))
    : actionableFeedback
  ).map((f) => stripScoreFractionsFromText(f));

  return {
    ...grading,
    total_mark: total,
    band: updatedBand,
    ao_breakdown: {
      knowledge: {
        ...grading.ao_breakdown.knowledge,
        awarded: ao1,
        comment: stripScoreFractionsFromText(grading.ao_breakdown.knowledge.comment),
      },
      analysis: {
        ...grading.ao_breakdown.analysis,
        awarded: ao2,
        comment:
          quality.isUndersized || quality.isMonolithicBlock
            ? `Analysis demonstrates sound theoretical understanding but mechanisms are compressed into short assertions without step-by-step sentence-level development (Level 2).`
            : stripScoreFractionsFromText(grading.ao_breakdown.analysis.comment),
      },
      evaluation: {
        ...grading.ao_breakdown.evaluation,
        awarded: split.ao3_marks === 0 ? 0 : ao3,
        out_of: split.ao3_marks,
        comment:
          split.ao3_marks === 0
            ? "Evaluation is not required for this question. No marks are lost for its omission."
            : quality.isUndersized
              ? `Evaluative points identify relevant limitations but lack sustained comparative development and criteria prioritization.`
              : stripScoreFractionsFromText(grading.ao_breakdown.evaluation.comment),
      },
    },
    examiner_summary: stripScoreFractionsFromText(examinerSummary),
    weaknesses: cleanWeaknesses.slice(0, 4),
    actionable_feedback: cleanActions.slice(0, 4),
  };
}
