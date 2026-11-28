import { describe, expect, it } from "vitest";
import {
  alignGradingToTargetMark,
  computePsychometricEnsembleMark,
} from "./grade.server";
import type { Grading } from "./types";

const SPLIT_12 = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
const SPLIT_20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };

function makeDraft(maxMark: number, split = SPLIT_12): Grading {
  return {
    total_mark: 8,
    max_mark: maxMark,
    band: "Upper middle band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: split.ao1_marks, comment: "K" },
      analysis: { awarded: 4, out_of: split.ao2_marks, comment: "A" },
      evaluation: { awarded: 2, out_of: split.ao3_marks, comment: "E" },
    },
    examiner_summary: "Summary",
    strengths: ["S1"],
    weaknesses: ["W1"],
    missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
    actionable_feedback: ["F1"],
    suggested_resources: [],
    suggested_practice: [],
    confidence: 0.9,
    audited: true,
    sources: [],
    anchorsUsed: 0,
  };
}

describe("Marginal Engine V7 — 5/6-Signal Psychometric Fusion & AO Alignment", () => {
  it("eliminates single-model outliers in zero-calibration 5-signal trimmed mean", () => {
    // 4 families agree on 16–17/20, 1 rogue family misfires at 9/20
    const fused = computePsychometricEnsembleMark({
      p1: 17,
      p2: 16,
      compMark: null,
      decomposed: {
        ao1Awarded: 2,
        ao2Awarded: 10,
        ao3Awarded: 4,
        decomposedTotal: 16,
        onFocusRatio: 1,
        wrongDirectionParagraphs: 0,
        developedFrameworkCount: 3,
        offFocusNote: "",
        ao3Level: "Level 2",
        ao3Rationale: "",
      },
      rubric: {
        requiredComponentsCount: 4,
        coveredComponentsCount: 4,
        developedComponentsCount: 3,
        chainQuality: "developed_models",
        ao3Verdict: "balanced_contextual",
        unreferencedDiagram: false,
        offFocusParagraphs: 0,
        rubricEstimatedMark: 9, // extreme harsh outlier
        rationale: "",
      },
      levelVerifier: {
        ao12Level: "L3",
        ao12Position: "mid",
        ao12Mark: 12,
        ao3Level: "L2",
        ao3Position: "mid",
        ao3Mark: 5,
        verifiedMark: 17,
        isOneSidedBestMethod: false,
        missingRequestedDiagram: false,
        majorOffFocusOrInversion: false,
        rationale: "",
        model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      },
      maxMark: 20,
      fatalViolations: 0,
    });
    // Holistic-anchored pool [9, 16, 16, 17, 17, 17] -> trimmed [16, 16, 17, 17] -> round(16.5) = 17 (9 outlier dropped!)
    expect(fused).toBe(17);
  });

  it("preserves legitimate 0 marks on wholly off-topic essays instead of dropping 0 signals", () => {
    const fused = computePsychometricEnsembleMark({
      p1: 0,
      p2: 1,
      compMark: null,
      decomposed: {
        ao1Awarded: 0,
        ao2Awarded: 0,
        ao3Awarded: 0,
        decomposedTotal: 0,
        onFocusRatio: 0,
        wrongDirectionParagraphs: 3,
        developedFrameworkCount: 0,
        offFocusNote: "Off topic",
        ao3Level: "Level 0",
        ao3Rationale: "",
      },
      rubric: {
        requiredComponentsCount: 3,
        coveredComponentsCount: 0,
        developedComponentsCount: 0,
        chainQuality: "descriptive_assertions",
        ao3Verdict: "none",
        unreferencedDiagram: false,
        offFocusParagraphs: 3,
        rubricEstimatedMark: 0,
        rationale: "",
      },
      levelVerifier: {
        ao12Level: "L0",
        ao12Position: "low",
        ao12Mark: 0,
        ao3Level: "L0",
        ao3Position: "low",
        ao3Mark: 0,
        verifiedMark: 0,
        isOneSidedBestMethod: false,
        missingRequestedDiagram: false,
        majorOffFocusOrInversion: true,
        rationale: "",
        model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      },
      maxMark: 12,
      fatalViolations: 0,
    });
    expect(fused).toBe(0);
  });

  it("enforces two-auditor one-sided best-method ceiling on 12m essays without crushing Top Band consensus", () => {
    const capped = computePsychometricEnsembleMark({
      p1: 7,
      p2: 8,
      compMark: null,
      decomposed: null,
      rubric: {
        requiredComponentsCount: 3,
        coveredComponentsCount: 2,
        developedComponentsCount: 1,
        chainQuality: "partial_chains",
        ao3Verdict: "asserted_generic",
        unreferencedDiagram: false,
        offFocusParagraphs: 0,
        isOneSidedBestMethod: true,
        rubricEstimatedMark: 6,
        rationale: "",
      },
      levelVerifier: {
        ao12Level: "L2",
        ao12Position: "low",
        ao12Mark: 5,
        ao3Level: "L1",
        ao3Position: "low",
        ao3Mark: 1,
        verifiedMark: 6,
        isOneSidedBestMethod: true,
        missingRequestedDiagram: false,
        majorOffFocusOrInversion: false,
        rationale: "",
        model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      },
      isComparativeBestMethodQuestion: true,
      maxMark: 12,
      fatalViolations: 0,
    });
    expect(capped).toBeLessThanOrEqual(6);
  });

  it("incorporates bounded Principal Examiner arbitration cleanly into disputed fusion", () => {
    // P1=10 vs P2=16 dispute; Arbitrator finds 15; others at 14, 15, 16
    const fused = computePsychometricEnsembleMark({
      p1: 10,
      p2: 16,
      compMark: null,
      decomposed: {
        ao1Awarded: 2,
        ao2Awarded: 8,
        ao3Awarded: 4,
        decomposedTotal: 14,
        onFocusRatio: 1,
        wrongDirectionParagraphs: 0,
        developedFrameworkCount: 3,
        offFocusNote: "",
        ao3Level: "Level 2",
        ao3Rationale: "",
      },
      rubric: {
        requiredComponentsCount: 4,
        coveredComponentsCount: 4,
        developedComponentsCount: 3,
        chainQuality: "developed_models",
        ao3Verdict: "balanced_contextual",
        unreferencedDiagram: false,
        offFocusParagraphs: 0,
        rubricEstimatedMark: 15,
        rationale: "",
      },
      levelVerifier: {
        ao12Level: "L3",
        ao12Position: "low",
        ao12Mark: 11,
        ao3Level: "L2",
        ao3Position: "mid",
        ao3Mark: 5,
        verifiedMark: 16,
        isOneSidedBestMethod: false,
        missingRequestedDiagram: false,
        majorOffFocusOrInversion: false,
        rationale: "",
        model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      },
      arbitratorMark: 15,
      maxMark: 20,
      fatalViolations: 0,
    });
    expect(fused).toBe(15);
  });

  it("aligns AO1/AO2/AO3 cleanly using Decomposed-informed structural medians", () => {
    const draft = makeDraft(20, SPLIT_20);
    const aligned = alignGradingToTargetMark(draft, 16, 20, SPLIT_20, 2, {
      ao1: 2,
      ao2: 10,
      ao3: 4,
    });
    expect(aligned.total_mark).toBe(16);
    expect(aligned.ao_breakdown.knowledge.awarded).toBe(2);
    expect(aligned.ao_breakdown.analysis.awarded).toBe(10);
    expect(aligned.ao_breakdown.evaluation.awarded).toBe(4);
  });

  it("never falsely crushes non-off-focus 20m essays to 6/20 over diagram slips or single-auditor flags", () => {
    // Pattern of ECR #21/#23/#25: Rubric scores >= 10 (mid-L2/Top Band) or offFocusParagraphs === 0,
    // even if LevelVerifier flagged majorOffFocusOrInversion over a diagram label slip.
    const fused = computePsychometricEnsembleMark({
      p1: 14,
      p2: 12,
      compMark: null,
      decomposed: {
        ao1Awarded: 2,
        ao2Awarded: 7,
        ao3Awarded: 3,
        decomposedTotal: 12,
        onFocusRatio: 0.9,
        wrongDirectionParagraphs: 1,
        developedFrameworkCount: 2,
        offFocusNote: "Minor diagram label slip",
        ao3Level: "Level 1",
        ao3Rationale: "",
      },
      rubric: {
        requiredComponentsCount: 4,
        coveredComponentsCount: 4,
        developedComponentsCount: 2,
        chainQuality: "partial_chains",
        ao3Verdict: "balanced_contextual",
        unreferencedDiagram: false,
        offFocusParagraphs: 0,
        rubricEstimatedMark: 15,
        rationale: "",
      },
      levelVerifier: {
        ao12Level: "L2",
        ao12Position: "mid",
        ao12Mark: 8,
        ao3Level: "L1",
        ao3Position: "top",
        ao3Mark: 3,
        verifiedMark: 11,
        isOneSidedBestMethod: false,
        missingRequestedDiagram: false,
        majorOffFocusOrInversion: true,
        rationale: "Diagram mislabelled",
        model: "nvidia/nemotron-3-ultra-550b-a55b",
      },
      maxMark: 20,
      fatalViolations: 0,
    });
    expect(fused).toBeGreaterThanOrEqual(11);
  });

  it("still enforces Level 1 off-focus ceiling (<=6/20) when genuine opposite-policy off-focus is corroborated", () => {
    // Pattern of ECR #22 (Cam=5/20): P1/P2 inflated to 14/20, but Decomposed + Rubric both flag off-focus
    // with low marks (6 and 8), AND 550B Principal Meta-Calibrator confirms Level 1 off-focus!
    const fused = computePsychometricEnsembleMark({
      p1: 14,
      p2: 14,
      compMark: null,
      decomposed: {
        ao1Awarded: 1,
        ao2Awarded: 3,
        ao3Awarded: 2,
        decomposedTotal: 6,
        onFocusRatio: 0.8,
        wrongDirectionParagraphs: 1,
        developedFrameworkCount: 1,
        offFocusNote: "Substantial expansionary policy section when asked to cut inflation",
        ao3Level: "Level 1",
        ao3Rationale: "",
      },
      rubric: {
        requiredComponentsCount: 3,
        coveredComponentsCount: 2,
        developedComponentsCount: 1,
        chainQuality: "partial_chains",
        ao3Verdict: "asserted_generic",
        unreferencedDiagram: false,
        offFocusParagraphs: 1,
        rubricEstimatedMark: 8,
        rationale: "",
      },
      metaCalibrator: {
        ao1Mark: 1,
        ao2Mark: 3,
        ao3Mark: 2,
        calibratedTotal: 6,
        confirmedLevel1OffFocus: true,
        confirmedMissingSynthesis: false,
        confirmedBreadthOnlyL2: false,
        rationale: "Confirmed substantial opposite-policy expansionary section.",
        model: "nvidia/nemotron-3-ultra-550b-a55b",
      },
      maxMark: 20,
      fatalViolations: 0,
    });
    expect(fused).toBeLessThanOrEqual(6);
  });

  it("applies 550B Principal Meta-Calibrator breadth-only L2 cap (<=12/20) and missing-synthesis L2 cap (<=6/8)", () => {
    const breadthCapped = computePsychometricEnsembleMark({
      p1: 12,
      p2: 15,
      compMark: null,
      decomposed: null,
      rubric: null,
      metaCalibrator: {
        ao1Mark: 2,
        ao2Mark: 6,
        ao3Mark: 3,
        calibratedTotal: 11,
        confirmedLevel1OffFocus: false,
        confirmedMissingSynthesis: false,
        confirmedBreadthOnlyL2: true,
        rationale: "Breadth-lists 6 concepts briefly without deep AD/AS chains.",
        model: "nvidia/nemotron-3-ultra-550b-a55b",
      },
      maxMark: 20,
      fatalViolations: 0,
    });
    expect(breadthCapped).toBeLessThanOrEqual(12);

    const synthCapped = computePsychometricEnsembleMark({
      p1: 7,
      p2: 5,
      compMark: null,
      decomposed: null,
      rubric: null,
      metaCalibrator: {
        ao1Mark: 2,
        ao2Mark: 2,
        ao3Mark: 1,
        calibratedTotal: 5,
        confirmedLevel1OffFocus: false,
        confirmedMissingSynthesis: true,
        confirmedBreadthOnlyL2: false,
        rationale: "Draws D right and S left separately without synthesising net P & Q.",
        model: "nvidia/nemotron-3-ultra-550b-a55b",
      },
      maxMark: 8,
      fatalViolations: 0,
    });
    expect(synthCapped).toBeLessThanOrEqual(6);
  });
});
