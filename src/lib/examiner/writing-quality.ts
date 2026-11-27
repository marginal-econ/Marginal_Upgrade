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

import { cleanStars } from "@/lib/utils";
import { bandFor, stripScoreFractionsFromText, type Grading, type NeuroSymbolicDossier } from "./types";
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
export function cleanProseForWordCount(text: string): string {
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

  // Split into genuine paragraphs (ignoring purely whitespace lines and diagram tokens).
  // Supports both double-newline (\n\n) paragraphs AND single-newline (\n) pasted/Word paragraphs,
  // while still detecting true single-block monolithic pastes (0 paragraph breaks).
  const doubleBreakParagraphs = rawText
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\[DIAGRAM:[^\]]*\]$/i.test(p));

  let paragraphCount = doubleBreakParagraphs.length;
  if (paragraphCount <= 1) {
    const singleLines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^\[DIAGRAM:[^\]]*\]$/i.test(l));
    if (singleLines.length >= 2) {
      const lineWordCounts = singleLines.map((l) => l.split(/\s+/).filter(Boolean).length);
      const avgWordsPerLine =
        lineWordCounts.reduce((sum, n) => sum + n, 0) / Math.max(1, lineWordCounts.length);
      const substantialLines = lineWordCounts.filter((n) => n >= 18).length;

      if (avgWordsPerLine >= 18 || substantialLines >= 3) {
        // Genuine paragraphs separated by single newlines (common when pasting from Word/Docs/PDF)
        paragraphCount = singleLines.length;
      } else if (singleLines.length >= 8) {
        // OCR hard line-wrapped handwritten script: count paragraph-starter lines
        const starterCount = singleLines.filter((l, idx) =>
          idx === 0 ||
          /^(firstly|secondly|thirdly|finally|however|moreover|furthermore|in addition|on the other hand|conversely|in conclusion|to conclude|overall|therefore|another|alternatively)\b/i.test(l),
        ).length;
        if (starterCount >= 3) {
          paragraphCount = starterCount;
        }
      }
    }
  }

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
    } else if (words < 280) {
      isUndersized = true;
      // In Cambridge 9708, a response under 280 words lacks the length to develop multiple mechanisms and evaluation.
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 1 ? 6 : 7;
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 1 ? 3 : 4;
      maxAllowableAo3 = 2;
      qualityIssues.push(
        `Compressed outline response (${words} words vs 500–750 expected). Key mechanisms are compressed into short assertions.`,
      );
    } else if (words < 360) {
      // 280–359 words: concise timed AS script (real handwritten 10/12 Cambridge scripts often run 310–360w with diagrams).
      // Well-paragraphed genuine scripts can reach up to 11/12; monolithic or AI-formatted scripts stay capped at 7–8/12.
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 1 ? 7 : (paragraphCount >= 4 ? 11 : paragraphCount >= 3 ? 10 : 8);
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 1 ? 3 : (paragraphCount >= 3 ? 5 : 4);
      maxAllowableAo3 = hasAiArtifacts || paragraphCount <= 1 ? 2 : (paragraphCount >= 4 ? 4 : paragraphCount >= 3 ? 3 : 2);
    }
  } else if (maxMark === 8) {
    targetRangeText = split.ao3_marks === 0 ? "220–360 words" : "240–380 words";
    if (words < 100) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 3;
      maxAllowableAo2 = split.ao3_marks === 0 ? 2 : 1;
      maxAllowableAo3 = 0;
      qualityIssues.push(
        `Fragment / extreme brevity (${words} words). Cambridge 8-mark questions expect ${targetRangeText}.`,
      );
    } else if (words < 165) {
      isUndersized = true;
      maxAllowableTotalMark = 5;
      maxAllowableAo2 = split.ao3_marks === 0 ? 3 : 2;
      maxAllowableAo3 = split.ao3_marks === 0 ? 0 : 1;
      qualityIssues.push(
        `Undersized (${words} words vs ${targetRangeText} expected). Analytical points lack sufficient explanatory depth.`,
      );
    } else if (words < 220) {
      // 165–219 words: concise response. Strategic analysis can score up to 7/8.
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 1 ? 5 : (paragraphCount >= 2 ? 7 : 6);
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 1 ? 3 : (paragraphCount >= 2 ? 4 : 3);
      maxAllowableAo3 = split.ao3_marks === 0 ? 0 : (hasAiArtifacts || paragraphCount <= 1 ? 1 : 2);
    }
  } else if (maxMark >= 20) {
    targetRangeText = "450–850 words";
    if (words < 180) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 7;
      maxAllowableAo2 = 4;
      maxAllowableAo3 = 1;
      qualityIssues.push(
        `Severely stunted (${words} words). Cambridge 20-mark extended essays typically require ${targetRangeText}.`,
      );
    } else if (words < 300) {
      isUndersized = true;
      // Solid, well-paragraphed 180–299w scripts with accurate theory earn Level 2 (up to 11/20),
      // rather than being buried in Bottom Band (7/20) alongside factually inverted essays.
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 2 ? 8 : 11;
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 2 ? 5 : 7;
      maxAllowableAo3 = hasAiArtifacts || paragraphCount <= 2 ? 2 : 3;
      qualityIssues.push(
        `Underdeveloped (${words} words vs ${targetRangeText} typical depth). Needs sustained multi-perspective analysis and developed evaluation.`,
      );
    } else if (words < 380) {
      isUndersized = true;
      maxAllowableTotalMark = hasAiArtifacts || paragraphCount <= 2 ? 9 : 13;
      maxAllowableAo2 = hasAiArtifacts || paragraphCount <= 2 ? 5 : 8;
      maxAllowableAo3 = hasAiArtifacts || paragraphCount <= 2 ? 2 : 3;
      qualityIssues.push(
        `Concise (${words} words vs ${targetRangeText} typical depth). Needs fuller analytical development and evaluation.`,
      );
    } else if (words < 450) {
      // 380–449 words: real timed handwritten Cambridge Paper 4 Top-Band scripts with diagrams
      // (e.g. 9708/42 ECR High 16/20 at ~420 words across 6-8 paragraphs) must NOT be artificially capped at 12/20.
      // Only monolithic/AI-formatted blocks in this length range remain undersized & capped at 11-12/20.
      if (hasAiArtifacts || paragraphCount <= 2) {
        isUndersized = true;
        maxAllowableTotalMark = 11;
        maxAllowableAo2 = 6;
        maxAllowableAo3 = 3;
        qualityIssues.push(
          `Underdeveloped structure (${words} words across ${paragraphCount} paragraph(s)). Needs clear multi-paragraph analytical development.`,
        );
      } else {
        maxAllowableTotalMark = paragraphCount >= 4 ? 18 : 15;
        maxAllowableAo2 = paragraphCount >= 4 ? 11 : 9;
        maxAllowableAo3 = paragraphCount >= 4 ? 5 : 4;
      }
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
/**
 * Chapter 5 (PPC & Efficiency) Grounding Failsafe:
 * Ensures examiners NEVER praise a student for linking a point inside the PPC to allocative
 * or Pareto inefficiency, flags confusion between productive and allocative inefficiency as
 * a minor analytical error, and deducts 1 mark from AO2 Analysis if full marks were awarded.
 */
export function applyPpcMisconceptionGuardrail(
  grading: Grading,
  split: AoSplit,
): Grading {
  const allStrengths = grading.strengths || [];
  const allWeaknesses = grading.weaknesses || [];
  const allComments = `${grading.ao_breakdown.analysis?.comment || ""} ${grading.ao_breakdown.evaluation?.comment || ""}`;
  const strengthsText = allStrengths.join(" ");
  const weaknessesText = allWeaknesses.join(" ");

  // Explicit false praise: praising candidate for linking inside PPC to allocative/Pareto efficiency
  const falsePraiseRegex = /(?:linking|connect|associat|treat)\w*\s+(?:a\s+)?point\s+inside\s+(?:the\s+)?ppc\s+(?:to|with|as)\s+(?:allocative|pareto)/i;
  
  // Safe recognition: candidate or examiner correctly distinguishes productive from allocative efficiency
  const correctlyDistinguishes =
    /(?:distinguish|distinguishes|differentiates?|contrasts?|correctly|accurately)\s+(?:productive\s+(?:and|from)\s+allocative|allocative\s+(?:and|from)\s+productive)/i.test(
      `${strengthsText} ${allComments}`
    );

  const hadFalsePraise = !correctlyDistinguishes && allStrengths.some((s) => falsePraiseRegex.test(s));
  const filteredStrengths = allStrengths.filter((s) => !falsePraiseRegex.test(s));

  // Actual error: explicitly asserting inside PPC is allocative inefficiency, or weakness flagging actual confusion
  const hasActualPpcConfusion =
    !correctlyDistinguishes &&
    (hadFalsePraise ||
      /(?:point\s+inside|inside\s+(?:the\s+)?ppc)[^.]*?\b(?:allocativ|pareto)\s+inefficien/i.test(allComments) ||
      /(?:confus(?:es?|ed|ing)|conflat(?:es?|ed|ing))\s+(?:productive\s+with\s+allocative|allocative\s+with\s+productive)/i.test(weaknessesText) ||
      /point\s+inside\s+(the\s+)?ppc.*allocative/i.test(weaknessesText));

  if (!hasActualPpcConfusion) {
    return grading;
  }

  const ppcWeakness =
    "Clarify the distinction between productive and allocative efficiency on the PPC: a point inside the PPC indicates productive inefficiency (unemployed or underutilized resources), whereas points on the curve represent productive efficiency. Allocative efficiency depends on whether the output mix reflects consumer preferences.";

  const updatedWeaknesses = [...allWeaknesses];
  if (!updatedWeaknesses.some((w) => w.toLowerCase().includes("point inside the ppc") || w.toLowerCase().includes("distinction between productive and allocative"))) {
    updatedWeaknesses.unshift(ppcWeakness);
  }

  let ao2 = grading.ao_breakdown.analysis.awarded;
  let comment = grading.ao_breakdown.analysis.comment;
  // If AO2 was awarded full marks, restrict it by 1 mark for the analytical error
  if (ao2 === split.ao2_marks && ao2 > 0) {
    ao2 -= 1;
    comment = `${comment} Distinguish productive inefficiency inside the PPC from allocative efficiency to strengthen the analysis.`.trim();
  }

  const ao1 = grading.ao_breakdown.knowledge.awarded;
  const ao3 = grading.ao_breakdown.evaluation.awarded;
  const total = ao1 + ao2 + ao3;

  return {
    ...grading,
    total_mark: total,
    band: bandFor(total, grading.max_mark),
    ao_breakdown: {
      ...grading.ao_breakdown,
      analysis: {
        ...grading.ao_breakdown.analysis,
        awarded: ao2,
        comment: stripScoreFractionsFromText(comment),
      },
    },
    strengths: filteredStrengths.map((s) => stripScoreFractionsFromText(s)),
    weaknesses: updatedWeaknesses.slice(0, 4).map((w) => stripScoreFractionsFromText(w)),
  };
}

/**
 * 8-Mark Evaluative Essay Failsafe (AO1: 2, AO2: 4, AO3: 2 — Total: 8 marks):
 * ONLY a truly perfect essay can receive 8/8.
 * When evaluation criteria are not fully met or the concluding judgement is not satisfied,
 * the essay MUST be kept at 7 instead of 8 (AO3 awarded 1/2 marks, maximum 7/8 total).
 */
export function applyEightMarkEvaluationGuardrail(
  grading: Grading,
  maxMark: number,
  split: AoSplit,
): Grading {
  if (maxMark !== 8 || split.ao3_marks !== 2) {
    return grading;
  }

  const ao1 = grading.ao_breakdown.knowledge.awarded;
  const ao2 = grading.ao_breakdown.analysis.awarded;
  let ao3 = grading.ao_breakdown.evaluation.awarded;

  const evalComment = grading.ao_breakdown.evaluation.comment || "";
  const weaknessesText = (grading.weaknesses || []).join(" ").toLowerCase();
  const missingEval = grading.missing_elements?.evaluation || [];

  const hasEvaluationShortfall =
    missingEval.length > 0 ||
    /unmet|incomplete|unsatisfied|missing|unsupported|partially|fail(ed|s)? to|superficial|weak|not fully|room for|could be further/i.test(evalComment) ||
    /conclusion.*(missing|weak|unsupported|lacking|incomplete|unsatisfied)|evaluation.*(not fully|partially|lacking|unmet|incomplete)/i.test(weaknessesText);

  // If evaluation shortfall detected, clamp AO3 to 1 and total to 7
  if (hasEvaluationShortfall) {
    if (ao3 > 1) {
      ao3 = 1;
    }
    const newTotal = Math.min(7, ao1 + ao2 + ao3);
    const improvementNotice = "To elevate the evaluation, provide a more decisive concluding judgement that explicitly weighs the trade-offs in context (such as short-run versus long-run impacts).";
    const updatedComment = evalComment.includes("decisive concluding judgement")
      ? evalComment
      : `${evalComment} ${improvementNotice}`.trim();

    return {
      ...grading,
      total_mark: newTotal,
      band: bandFor(newTotal, maxMark),
      ao_breakdown: {
        ...grading.ao_breakdown,
        evaluation: {
          ...grading.ao_breakdown.evaluation,
          awarded: ao3,
          comment: stripScoreFractionsFromText(updatedComment),
        },
      },
    };
  }

  // If total is 8, ensure it really is 2/2 in AO1, 4/4 in AO2, and 2/2 in AO3
  if (grading.total_mark === 8) {
    if (ao1 < 2 || ao2 < 4 || ao3 < 2) {
      const fixedTotal = Math.min(7, ao1 + ao2 + ao3);
      return {
        ...grading,
        total_mark: fixedTotal,
        band: bandFor(fixedTotal, maxMark),
      };
    }
  }

  return grading;
}

function applyStructuralCeilings(
  grading: Grading,
  quality: EssayQualityAnalysis,
  maxMark: number,
  split: AoSplit,
): Grading {
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
    const lengthWeakness = `At ${quality.wordCount} words, the response is concise relative to the typical ${quality.targetRangeText} depth. Expanding each analytical transmission mechanism step-by-step in continuous prose will significantly elevate the depth of argument.`;
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

  // Specific actionable feedback: paragraph architecture ONLY when monolithic, or mechanism expansion when undersized
  if (quality.isMonolithicBlock) {
    const structAction = `Structure your response into 4–5 distinct paragraphs: an introduction defining key concepts, 2–3 dedicated body paragraphs developing each transmission mechanism step-by-step, a comparative evaluation paragraph, and a justified conclusion.`;
    if (!actionableFeedback.some((f) => f.toLowerCase().includes("structure your response into"))) {
      actionableFeedback.unshift(structAction);
    }
  }

  // Preserve the examiner's essay-specific summary & AO comments; NEVER fabricate a "without full paragraph structure" claim on multi-paragraph scripts!
  let examinerSummary = grading.examiner_summary;
  if (modified) {
    if (updatedBand !== grading.band && /\btop\s+band\b/i.test(examinerSummary)) {
      examinerSummary = examinerSummary
        .replace(/\bplacing\s+the\s+(?:work|essay|response)\s+(?:firmly\s+)?in\s+the\s+top\s+band\b/gi, `with structural constraints placing it in the ${updatedBand}`)
        .replace(/\btop\s+band\b/gi, updatedBand);
    }
    if (quality.isMonolithicBlock && !/paragraph/i.test(examinerSummary)) {
      examinerSummary = `${examinerSummary} Presenting the argument in distinct paragraphs with step-by-step causal chains will significantly improve clarity and depth.`.trim();
    } else if (quality.isUndersized && !/concise|brief|short|underdeveloped|depth|word/i.test(examinerSummary)) {
      examinerSummary = `${examinerSummary} At ${quality.wordCount} words, expanding each causal mechanism step-by-step will strengthen the analytical depth.`.trim();
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
        comment: stripScoreFractionsFromText(grading.ao_breakdown.analysis.comment),
      },
      evaluation: {
        ...grading.ao_breakdown.evaluation,
        awarded: split.ao3_marks === 0 ? 0 : ao3,
        out_of: split.ao3_marks,
        comment:
          split.ao3_marks === 0
            ? "Evaluation is not required for this question. No marks are lost for its omission."
            : stripScoreFractionsFromText(grading.ao_breakdown.evaluation.comment),
      },
    },
    examiner_summary: stripScoreFractionsFromText(examinerSummary),
    weaknesses: cleanWeaknesses.slice(0, 4),
    actionable_feedback: cleanActions.slice(0, 4),
  };
}

/**
 * Detects whether a Cambridge exam question EXPLICITLY requires a diagram or pay-off matrix
 * (e.g. "With the help of a diagram(s)", "With the aid of a diagram", "Using a diagram").
 */
export function questionRequiresDiagram(question?: string | null): boolean {
  if (!question) return false;
  return /\b(?:with\s+the\s+(?:help|aid)\s+of|using|draw(?:ing)?|illustrat(?:e|ing)\s+with)\s+(?:an?\s+)?(?:[\w/-]+\s+){0,4}(?:diagrams?(?:\(s\))?|pay[- ]?off\s+matrix)\b/i.test(
    question,
  );
}

/**
 * Detects whether a student essay actually includes a diagram, pay-off matrix, or explicit
 * graphical/axes illustration.
 */
export function essayHasDiagram(essayText?: string | null): boolean {
  if (!essayText) return false;
  return (
    /\[DIAGRAM:/i.test(essayText) ||
    /\|---+\|/.test(essayText) ||
    /\b(?:as\s+shown\s+in\s+the\s+(?:diagram|graph|matrix|table)|diagram\s+(?:above|below)|attached\s+diagram|vertical\s+axis|horizontal\s+axis|x-axis|y-axis|pay[- ]?off\s+matrix\s+below|table\s+below)\b/i.test(
      essayText,
    )
  );
}

/**
 * Official Cambridge 9708 Required-Diagram Guardrail:
 * When a question EXPLICITLY demands "With the help/aid of a diagram(s)" and the candidate
 * omits any diagram/matrix, official Cambridge Mark Schemes cap Table A / AO2 at Level 2 maximum
 * (max 8/12 on 20m Paper 4, max 4/6 on 12m Paper 2, max 3/4 on 8m eval / 4/6 on 8m legacy).
 * Conversely, when a question does NOT request a diagram, this guardrail does nothing.
 */
export function applyRequiredDiagramGuardrail(
  grading: Grading,
  question: string | undefined,
  essayText: string | undefined,
  maxMark: number,
  split: AoSplit,
): Grading {
  if (!question || !essayText) return grading;
  if (!questionRequiresDiagram(question) || essayHasDiagram(essayText)) {
    return grading;
  }

  const maxAo2WithoutDiagram =
    maxMark >= 20
      ? Math.min(split.ao2_marks, 8)
      : maxMark === 12
        ? Math.min(split.ao2_marks, 4)
        : split.ao3_marks === 0
          ? Math.min(split.ao2_marks, 4)
          : Math.min(split.ao2_marks, 3);

  let ao2 = grading.ao_breakdown.analysis.awarded;
  const capped = ao2 > maxAo2WithoutDiagram;
  if (capped) {
    ao2 = maxAo2WithoutDiagram;
  }

  const ao1 = grading.ao_breakdown.knowledge.awarded;
  const ao3 = grading.ao_breakdown.evaluation.awarded;
  const total = ao1 + ao2 + ao3;
  const updatedBand = bandFor(total, maxMark);

  const diagWeakness =
    "The question explicitly requested a diagram, which is missing from the submission; under Cambridge 9708 mark scheme rules, omitting a required diagram restricts analysis to Level 2.";
  const weaknesses = [...(grading.weaknesses || [])];
  if (!weaknesses.some((w) => /diagram|matrix/i.test(w))) {
    weaknesses.unshift(diagWeakness);
  }

  const missingDiagrams = [...(grading.missing_elements?.diagrams || [])];
  if (missingDiagrams.length === 0) {
    missingDiagrams.push("Accurately labelled economic diagram explicitly requested by the question prompt.");
  }

  let analysisComment = grading.ao_breakdown.analysis.comment;
  if (!/diagram|matrix/i.test(analysisComment)) {
    analysisComment = `${analysisComment} Because the question explicitly asked for a diagram and none was included, analytical credit is capped at Level 2 under Cambridge marking rules.`.trim();
  }

  let summary = grading.examiner_summary;
  if (capped && updatedBand !== grading.band && /\btop\s+band\b/i.test(summary)) {
    summary = summary
      .replace(/\bplacing\s+the\s+(?:work|essay|response)\s+(?:firmly\s+)?in\s+the\s+top\s+band\b/gi, `though omitting the requested diagram holds it in the ${updatedBand}`)
      .replace(/\btop\s+band\b/gi, updatedBand);
  }

  return {
    ...grading,
    total_mark: total,
    band: updatedBand,
    examiner_summary: stripScoreFractionsFromText(summary),
    ao_breakdown: {
      ...grading.ao_breakdown,
      analysis: {
        ...grading.ao_breakdown.analysis,
        awarded: ao2,
        comment: stripScoreFractionsFromText(analysisComment),
      },
    },
    weaknesses: weaknesses.slice(0, 4),
    missing_elements: {
      ...grading.missing_elements,
      diagrams: missingDiagrams.slice(0, 2),
    },
  };
}

/**
 * Deterministic calibration failsafe: enforces Cambridge quality ceilings,
 * required-diagram L2 caps, Chapter 5 PPC misconception checks, 8-mark evaluation
 * 7/8 limits, and economic mechanics / causal integrity guardrails.
 */
export function applyWritingQualityGuardrail(
  grading: Grading,
  quality: EssayQualityAnalysis,
  maxMark: number,
  split: AoSplit,
  essayText?: string,
  questionText?: string,
): Grading {
  let result = grading;

  // 1. Structural writing quality checks (undersized, monolithic, AI artifacts)
  if (quality.isUndersized || quality.isSeverelyUndersized || quality.isMonolithicBlock || quality.hasAiArtifacts) {
    result = applyStructuralCeilings(result, quality, maxMark, split);
  }

  // 2. Official Cambridge required-diagram Level 2 cap (ONLY when question explicitly asks for a diagram & none is present)
  result = applyRequiredDiagramGuardrail(result, questionText, essayText, maxMark, split);

  // 3. Authoritative Chapter 5 PPC misconception check
  result = applyPpcMisconceptionGuardrail(result, split);

  // 4. Authoritative 8-mark evaluative essay failsafe (keeps at 7 if evaluation criteria unmet or conclusion unsatisfied)
  result = applyEightMarkEvaluationGuardrail(result, maxMark, split);

  // 5. Economic mechanics & causal integrity guardrail (ensures fatal misconceptions and broken causal chains are capped)
  result = applyEconomicMechanicsGuardrail(result, maxMark, split, essayText);

  // 6. Guarantee strict mathematical invariant across all guardrail branches:
  const sumAo =
    result.ao_breakdown.knowledge.awarded +
    result.ao_breakdown.analysis.awarded +
    result.ao_breakdown.evaluation.awarded;
  if (result.total_mark !== sumAo) {
    result = {
      ...result,
      total_mark: sumAo,
      band: bandFor(sumAo, maxMark),
    };
  }

  // Clean stars and asterisks across all feedback fields
  return cleanStars(result);
}

/**
 * Economic Mechanics & Causal Integrity Guardrail:
 * Protects against 14B model leniency bias by enforcing Cambridge Level Ceilings
 * whenever the examiner feedback identifies a verified fatal misconception or broken transmission chain,
 * while leaving genuinely sound essays completely uninhibited.
 */
export function applyEconomicMechanicsGuardrail(
  grading: Grading,
  maxMark: number,
  split: AoSplit,
  _essayText?: string,
): Grading {
  const weaknessesText = (grading.weaknesses || []).join(" ").toLowerCase();
  const summaryText = (grading.examiner_summary || "").toLowerCase();
  const commentsText = `${grading.ao_breakdown.knowledge?.comment || ""} ${grading.ao_breakdown.analysis?.comment || ""}`.toLowerCase();
  const combinedFeedback = `${weaknessesText} ${summaryText} ${commentsText}`;

  // Only trigger if an explicit fatal economic misconception or inverted causal link was verified by the examiner
  const hasFatalMisconception =
    /\b(fundamental misconception|fatal economic error|inverted definition|inverted concept|claims? that an? increase in supply (causes?|leads? to|results? in) (higher|rising) price)\b/i.test(combinedFeedback) ||
    /\b(claims? that (a )?subsid(y|ies) shifts? demand|claims? that (a )?tax shifts? demand to the right)\b/i.test(combinedFeedback);

  const hasInvertedCausalTransmission =
    /\b(broken causal transmission|inverted transmission chain|reversed cause and effect|mechanism operates in reverse)\b/i.test(combinedFeedback);

  if (!hasFatalMisconception && !hasInvertedCausalTransmission) {
    return grading;
  }

  let { knowledge, analysis, evaluation } = grading.ao_breakdown;
  let ao1 = knowledge.awarded;
  let ao2 = analysis.awarded;
  let ao3 = evaluation.awarded;
  let modified = false;

  // 1. Inverted definition / fatal concept error: AO1 capped at 1
  if (hasFatalMisconception && ao1 > 1) {
    ao1 = 1;
    modified = true;
  }

  // 2. Broken transmission chain: AO2 Analysis cannot exceed Level 1
  const maxAo2 = maxMark === 8 ? 1 : maxMark === 12 ? 2 : Math.max(2, Math.floor(split.ao2_marks * 0.35));
  if (hasInvertedCausalTransmission && ao2 > maxAo2) {
    ao2 = maxAo2;
    modified = true;
  }

  // 3. Overall mark ceiling: fatal misconceptions disqualify essay from Top Band and Upper Middle Band
  const maxTotalAllowed = maxMark === 8 ? 4 : maxMark === 12 ? 6 : Math.round(maxMark * 0.5);
  let total = ao1 + ao2 + ao3;

  if (total > maxTotalAllowed) {
    const excess = total - maxTotalAllowed;
    ao3 = Math.max(0, ao3 - excess);
    total = ao1 + ao2 + ao3;
    if (total > maxTotalAllowed) {
      ao2 = Math.max(1, ao2 - (total - maxTotalAllowed));
      total = ao1 + ao2 + ao3;
    }
    modified = true;
  }

  if (!modified) {
    return grading;
  }

  const updatedBand = bandFor(total, maxMark);
  return {
    ...grading,
    total_mark: total,
    band: updatedBand,
    ao_breakdown: {
      knowledge: { ...knowledge, awarded: ao1 },
      analysis: { ...analysis, awarded: ao2 },
      evaluation: { ...evaluation, awarded: ao3 },
    },
  };
}

const AO1_VIOLATION_IDS = new Set([
  "PRODUCER_SURPLUS_DEF_ERROR",
  "INDIRECT_TAX_INCOME_DEF_ERROR",
  "FISCAL_MONETARY_CONFLATION",
  "PUBLIC_VS_MERIT_GOOD_CONFLATION",
]);

function falsePraisePatternForViolation(ruleId: string): RegExp | null {
  if (ruleId.startsWith("SUBSIDY_INCIDENCE_")) {
    return /\b(?:subsidy\s+incidence|incidence\s+of\s+(?:the\s+|a\s+)?subsid|elasticity\s+(?:affects|and)\s+subsid)/i;
  }
  if (ruleId.startsWith("TAX_INCIDENCE_")) {
    return /\b(?:tax\s+incidence|incidence\s+of\s+(?:the\s+|an?\s+)?(?:indirect\s+)?tax)/i;
  }
  if (ruleId === "MONOPOLISTIC_COMP_EFFICIENCY_ERROR") {
    return /\b(?:allocative(?:ly)?\s+efficien|productive(?:ly)?\s+efficien|price[- ]taker)/i;
  }
  if (ruleId === "PRICE_RISE_SHIFTS_DEMAND_RIGHT") {
    return /\b(?:demand\s+shift|minimum\s+price\s+diagram)/i;
  }
  if (ruleId === "PUBLIC_VS_MERIT_GOOD_CONFLATION") {
    return /\bpublic\s+goods?\b/i;
  }
  return null;
}

/**
 * Deterministic Neuro-Symbolic Economic Law Guardrail:
 * Guarantees that verified economic-law inversions flagged by `causal-graph.server.ts`
 * are NEVER praised in `strengths`, are ALWAYS surfaced in `weaknesses`, and enforce
 * Cambridge AO1/AO2 level ceilings even when dual LLM passes miss an inversion.
 */
export function applyNeuroSymbolicGuardrail(
  grading: Grading,
  dossier: NeuroSymbolicDossier | undefined | null,
  maxMark: number,
  split: AoSplit,
): Grading {
  if (!dossier || dossier.violations.length === 0) {
    return grading;
  }

  let strengths = [...(grading.strengths || [])];
  const weaknesses = [...(grading.weaknesses || [])];
  let summary = grading.examiner_summary || "";
  let ao1 = grading.ao_breakdown.knowledge.awarded;
  let ao2 = grading.ao_breakdown.analysis.awarded;
  let ao3 = grading.ao_breakdown.evaluation.awarded;
  let analysisComment = grading.ao_breakdown.analysis.comment || "";

  let hasFatal = false;
  let hasModerate = false;
  let hasAo1Violation = false;

  for (const v of dossier.violations) {
    if (v.severity === "fatal") hasFatal = true;
    else hasModerate = true;
    if (AO1_VIOLATION_IDS.has(v.ruleId)) hasAo1Violation = true;

    const praiseRe = falsePraisePatternForViolation(v.ruleId);
    if (praiseRe) {
      strengths = strengths.filter((s) => !praiseRe.test(s));
      if (v.ruleId.startsWith("SUBSIDY_INCIDENCE_")) {
        summary = summary
          .replace(/,?\s*especially\s+(?:regarding|on)\s+subsidy\s+incidence/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        analysisComment = analysisComment
          .replace(/\b(?:accurately|insightfully)\s+(?:links?|describes?)\s+subsidy\s+incidence[^.]*\./gi, "")
          .trim();
      }
    }

    const shortKey = v.explanation.slice(0, 42).toLowerCase();
    const alreadyNoted = weaknesses.some(
      (w) =>
        w.toLowerCase().includes(shortKey) ||
        (v.ruleId.startsWith("SUBSIDY_INCIDENCE_") && /subsidy\s+incidence/i.test(w) && /invert|inelastic|consumer/i.test(w)) ||
        (v.ruleId.startsWith("TAX_INCIDENCE_") && /tax\s+incidence/i.test(w) && /invert|inelastic/i.test(w)),
    );
    if (!alreadyNoted) {
      weaknesses.unshift(v.explanation);
    }
  }

  if (hasAo1Violation && ao1 >= split.ao1_marks && split.ao1_marks > 0) {
    ao1 = split.ao1_marks - 1;
  }

  if (hasFatal) {
    const fatalAo2Cap = maxMark === 8 ? 1 : maxMark === 12 ? 2 : 4;
    ao2 = Math.min(ao2, fatalAo2Cap);
    const fatalTotalCap = maxMark === 8 ? 4 : maxMark === 12 ? 6 : 10;
    if (ao1 + ao2 + ao3 > fatalTotalCap) {
      const excess = ao1 + ao2 + ao3 - fatalTotalCap;
      ao3 = Math.max(0, ao3 - excess);
    }
  } else if (hasModerate) {
    // Moderate analytical inversion: cap AO2 at Level 2 maximum (never Level 3 / Top Band AO2)
    const modAo2Cap = maxMark === 8 ? 3 : maxMark === 12 ? 4 : 8;
    if (ao2 > modAo2Cap) {
      ao2 = modAo2Cap;
      if (!/incidence|inversion|error|misconception/i.test(analysisComment)) {
        analysisComment = `${analysisComment} A conceptual inversion in the causal analysis restricts AO2 to Level 2.`.trim();
      }
    }
  }

  const newTotal = ao1 + ao2 + ao3;
  return cleanStars({
    ...grading,
    total_mark: newTotal,
    band: bandFor(newTotal, maxMark),
    examiner_summary: stripScoreFractionsFromText(summary),
    ao_breakdown: {
      knowledge: { ...grading.ao_breakdown.knowledge, awarded: ao1 },
      analysis: {
        ...grading.ao_breakdown.analysis,
        awarded: ao2,
        comment: stripScoreFractionsFromText(analysisComment),
      },
      evaluation: { ...grading.ao_breakdown.evaluation, awarded: ao3 },
    },
    strengths: strengths.slice(0, 4).map((s) => stripScoreFractionsFromText(s)),
    weaknesses: weaknesses.slice(0, 4).map((w) => stripScoreFractionsFromText(w)),
  });
}
