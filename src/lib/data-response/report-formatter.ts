import { stripStars } from "@/lib/utils";
import type { QuestionEvaluationResult, DataResponseSubmissionResult } from "./types";

/**
 * Deterministically reconciles raw awarded marks with AO components so that:
 * Total Awarded === AO1 + AO2 + AO3 + AO4
 * And guarantees Level 3 evaluation minimums (AO4 >= 1 for 5m, AO4 >= 2 for 6m).
 */
export function reconcileAoMarks(params: {
  rawAwarded: number;
  rawAo?: { knowledge?: number; application?: number; analysis?: number; evaluation?: number };
  maxMark: number;
  tariff: { ao1: number; ao2: number; ao3: number; ao4?: number };
}): {
  awardedMark: number;
  aoBreakdown: {
    knowledge: { awarded: number; outOf: number };
    application: { awarded: number; outOf: number };
    analysis: { awarded: number; outOf: number };
    evaluation?: { awarded: number; outOf: number };
  };
} {
  const { rawAwarded, rawAo, maxMark, tariff } = params;

  let awarded = typeof rawAwarded === "number" ? Math.round(rawAwarded) : 0;
  if (isNaN(awarded) || awarded < 0) awarded = 0;
  if (awarded > maxMark) awarded = maxMark;

  const maxAo1 = tariff.ao1;
  const maxAo2 = tariff.ao2;
  const maxAo3 = tariff.ao3;
  const hasAo4 = tariff.ao4 !== undefined || maxMark >= 6;
  const maxAo4 = hasAo4
    ? (tariff.ao4 ?? Math.max(2, maxMark - maxAo1 - maxAo2 - maxAo3))
    : 0;

  let safeAo1 = Math.min(maxAo1, Math.max(0, Math.round(Number(rawAo?.knowledge ?? 0))));
  let safeAo2 = Math.min(maxAo2, Math.max(0, Math.round(Number(rawAo?.application ?? 0))));
  let safeAo3 = Math.min(maxAo3, Math.max(0, Math.round(Number(rawAo?.analysis ?? 0))));
  let safeAo4 = hasAo4
    ? Math.min(maxAo4, Math.max(0, Math.round(Number(rawAo?.evaluation ?? 0))))
    : 0;

  if (awarded === 0) {
    return {
      awardedMark: 0,
      aoBreakdown: {
        knowledge: { awarded: 0, outOf: maxAo1 },
        application: { awarded: 0, outOf: maxAo2 },
        analysis: { awarded: 0, outOf: maxAo3 },
        evaluation: hasAo4 ? { awarded: 0, outOf: maxAo4 } : undefined,
      },
    };
  }

  // RULE 2: ZERO-CLASH MATHEMATICAL AO RECONCILIATION
  // For 6-mark evaluative questions scoring 5 or 6 marks (Level 3): AO4 (Evaluation) MUST NEVER BE OUTPUT AS 0/2.
  if (hasAo4 && maxAo4 > 0) {
    if (maxMark === 6) {
      if (awarded === 6 && maxAo4 >= 2) {
        safeAo4 = Math.max(safeAo4, 2);
      } else if (awarded >= 5 && maxAo4 >= 1) {
        safeAo4 = Math.max(safeAo4, 1);
      }
    } else if (maxMark >= 7) {
      if (awarded >= maxMark - 1 && maxAo4 >= 2) {
        safeAo4 = Math.max(safeAo4, 2);
      } else if (awarded >= 5 && maxAo4 >= 1) {
        safeAo4 = Math.max(safeAo4, 1);
      }
    }
  }

  let currentAoSum = safeAo1 + safeAo2 + safeAo3 + (hasAo4 ? safeAo4 : 0);

  if (currentAoSum < awarded) {
    let deficit = awarded - currentAoSum;
    if (hasAo4 && safeAo4 < maxAo4) {
      const add = Math.min(deficit, maxAo4 - safeAo4);
      safeAo4 += add;
      deficit -= add;
    }
    if (deficit > 0 && safeAo3 < maxAo3) {
      const add = Math.min(deficit, maxAo3 - safeAo3);
      safeAo3 += add;
      deficit -= add;
    }
    if (deficit > 0 && safeAo2 < maxAo2) {
      const add = Math.min(deficit, maxAo2 - safeAo2);
      safeAo2 += add;
      deficit -= add;
    }
    if (deficit > 0 && safeAo1 < maxAo1) {
      const add = Math.min(deficit, maxAo1 - safeAo1);
      safeAo1 += add;
      deficit -= add;
    }
    if (deficit > 0 && hasAo4 && safeAo4 < maxAo4) {
      const add = Math.min(deficit, maxAo4 - safeAo4);
      safeAo4 += add;
      deficit -= add;
    }
  } else if (currentAoSum > awarded) {
    let excess = currentAoSum - awarded;
    const minAo4 = (hasAo4 && maxMark === 6 && awarded === 6 && maxAo4 >= 2)
      ? 2
      : (hasAo4 && awarded >= 5 && maxAo4 >= 1)
      ? 1
      : 0;

    if (excess > 0 && safeAo1 > 0) {
      const sub = Math.min(excess, safeAo1);
      safeAo1 -= sub;
      excess -= sub;
    }
    if (excess > 0 && safeAo2 > 0) {
      const sub = Math.min(excess, safeAo2);
      safeAo2 -= sub;
      excess -= sub;
    }
    if (excess > 0 && safeAo3 > 0) {
      const sub = Math.min(excess, safeAo3);
      safeAo3 -= sub;
      excess -= sub;
    }
    if (excess > 0 && hasAo4 && safeAo4 > minAo4) {
      const sub = Math.min(excess, safeAo4 - minAo4);
      safeAo4 -= sub;
      excess -= sub;
    }
    if (excess > 0 && hasAo4 && safeAo4 > 0) {
      const sub = Math.min(excess, safeAo4);
      safeAo4 -= sub;
      excess -= sub;
    }
  }

  const finalAoSum = safeAo1 + safeAo2 + safeAo3 + (hasAo4 ? safeAo4 : 0);
  if (finalAoSum !== awarded) {
    awarded = finalAoSum;
  }

  return {
    awardedMark: awarded,
    aoBreakdown: {
      knowledge: { awarded: safeAo1, outOf: maxAo1 },
      application: { awarded: safeAo2, outOf: maxAo2 },
      analysis: { awarded: safeAo3, outOf: maxAo3 },
      evaluation: hasAo4 ? { awarded: safeAo4, outOf: maxAo4 } : undefined,
    },
  };
}

/**
 * Formats an individual sub-question evaluation strictly adhering to the
 * mandatory Cambridge 9708 Data Response Senior Chief Examiner Output Template.
 */
export function formatSubQuestionReport(result: QuestionEvaluationResult): string {
  const quality = result.extractContextCheck?.contextQuality
    ? result.extractContextCheck.contextQuality.replace(/_/g, "")
    : "adequate";

  const ao = result.aoBreakdown;
  const aoLines = [
    `AO1 (Knowledge): ${ao.knowledge.awarded}/${ao.knowledge.outOf}`,
    `AO2 (Application): ${ao.application.awarded}/${ao.application.outOf}`,
    `AO3 (Analysis): ${ao.analysis.awarded}/${ao.analysis.outOf}`,
  ];
  if (ao.evaluation) {
    aoLines.push(`AO4 (Evaluation): ${ao.evaluation.awarded}/${ao.evaluation.outOf}`);
  }

  let criteriaMetText = "";
  if (result.specificCriteriaMet && result.specificCriteriaMet.length > 0) {
    criteriaMetText = result.specificCriteriaMet
      .map((item, idx) => {
        const crit = stripStars(item.criterion);
        const ev = item.candidateEvidence
          ? `\n  Candidate Evidence: "${stripStars(item.candidateEvidence)}"`
          : "";
        return `- [Criterion ${idx + 1}]: ${crit}${ev}`;
      })
      .join("\n");
  } else if (result.creditedPoints && result.creditedPoints.length > 0) {
    criteriaMetText = result.creditedPoints
      .map((pt, idx) => `- [Criterion ${idx + 1}]: ${stripStars(pt)}`)
      .join("\n");
  } else {
    criteriaMetText = "- [Criterion 1]: No specific official mark scheme criteria met in response.";
  }

  return `${result.questionNumber}
${stripStars(result.questionTitle)} [${result.maxMark} Marks]
Extract: ${quality} ${result.awardedMark}/${result.maxMark} Marks
AO Allocation:
${aoLines.join("\n")}

Specific Mark Scheme Criteria Met:
${criteriaMetText}

Principal Examiner Assessment Rationale:
${stripStars(result.examinerRationale)}

Cambridge Model Answer Formulation:
${stripStars(result.modelAnswerSnippet)}

Examiner Key Improvement Advice:
${stripStars(result.improvementTip)}`;
}

/**
 * Formats a full paper assessment report combining executive summary and all sub-questions.
 */
export function formatFullPaperReport(submission: DataResponseSubmissionResult): string {
  const header = `CAMBRIDGE INTERNATIONAL AS & A LEVEL ECONOMICS (9708)
DATA RESPONSE SENIOR CHIEF EXAMINER ASSESSMENT REPORT
Paper: ${submission.paperId}
Candidate: ${submission.candidateName || "Candidate Script"}
Total Score: ${submission.totalMarksAwarded}/${submission.maxTotalMarks} (${submission.percentage}%) - Cambridge Band: ${stripStars(submission.overallBand)}
Standardised: ${new Date(submission.submittedAt).toLocaleString()}
============================================================`;

  const questionReports = Object.values(submission.questionResults)
    .map((res) => formatSubQuestionReport(res))
    .join("\n\n============================================================\n\n");

  return `${header}\n\n${questionReports}`;
}
