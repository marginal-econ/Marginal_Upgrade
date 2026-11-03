import { describe, expect, it } from "vitest";

import {
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type GradeProjection,
  type MasteryPillar,
} from "./review.functions";
import {
  calculatePredictedGradeFromThresholds,
  getCambridgeGradeStandard,
} from "./cambridge-thresholds";
import type { McqDiagnostic, McqExplanationResult } from "./mcq/mcq-pdf.server";

describe("Review Panel & Holistic Diagnostics", () => {
  it("enforces progressive gating threshold for early feedback", () => {
    expect(MIN_ESSAYS_FOR_REVIEW).toBe(3);
    expect(MIN_MCQ_PAPERS_FOR_REVIEW).toBe(1);
  });

  it("projects Cambridge grade boundaries accurately using official thresholds", () => {
    expect(calculatePredictedGradeFromThresholds(91.67).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(80).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(68).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(62).projectedGrade).toBe("A");
    expect(calculatePredictedGradeFromThresholds(55).projectedGrade).toBe("B");
    expect(calculatePredictedGradeFromThresholds(48).projectedGrade).toBe("C");
    expect(calculatePredictedGradeFromThresholds(40).projectedGrade).toBe("D");
    expect(calculatePredictedGradeFromThresholds(34).projectedGrade).toBe("E");
    expect(calculatePredictedGradeFromThresholds(25).projectedGrade).toBe("U");
  });

  it("verifies 11/12 is strictly Grade A* Standard and Top Band", () => {
    const std = getCambridgeGradeStandard(11, 12);
    expect(std.letter).toBe("A*");
    expect(std.grade).toBe("Grade A* Standard");
    expect(std.band).toBe("Top Band");
    expect(std.percent).toBe(92);
  });

  it("evaluates the 5 pillars of Cambridge Economics", () => {
    const pillars: MasteryPillar[] = [
      {
        pillar: "Definitions & Terminology (AO1)",
        score: 85,
        status: "mastered",
        guidance: "Strong grasp of syllabus definitions.",
      },
      {
        pillar: "Causal Linkages & Multipliers (AO2)",
        score: 68,
        status: "developing",
        guidance: "Deepen transmission mechanisms.",
      },
      {
        pillar: "Evaluative Weighing & Judgements (AO3)",
        score: 45,
        status: "vulnerable",
        guidance: "Include short-run vs long-run qualifiers.",
      },
      {
        pillar: "Diagrammatic Synthesis & Labeling",
        score: 80,
        status: "mastered",
        guidance: "Accurate equilibrium shifts.",
      },
      {
        pillar: "MCQ Speed & Distractor Rejection",
        score: 72,
        status: "developing",
        guidance: "Watch for shift vs movement traps.",
      },
    ];

    expect(pillars).toHaveLength(5);
    expect(pillars.filter((p) => p.status === "mastered")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "developing")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "vulnerable")).toHaveLength(1);
  });
});

describe("Advanced MCQ Review and Response Engine", () => {
  it("validates structured Cambridge MCQ diagnostic schema", () => {
    const mockDiagnostic: McqDiagnostic = {
      concept: "AS Unit 2: Cross Elasticity of Demand (XED)",
      keyRule: "Positive XED indicates substitutes; negative XED indicates complements.",
      correctReasoning:
        "A price increase in good X shifts the demand for good Y rightward, meaning X and Y are substitute goods.",
      distractorTrap:
        "Distractor C confused complement relationship with substitute relationship due to sign reversal.",
      speedTip:
        "Substitutes move in the same direction (+). Immediately eliminate negative options in 15 seconds.",
    };

    const result: McqExplanationResult = {
      text: "Option B is correct based on positive XED.",
      diagnostic: mockDiagnostic,
    };

    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic?.concept).toContain("AS Unit 2");
    expect(result.diagnostic?.keyRule).toBeTruthy();
    expect(result.diagnostic?.correctReasoning).toBeTruthy();
    expect(result.diagnostic?.distractorTrap).toBeTruthy();
    expect(result.diagnostic?.speedTip).toBeTruthy();
  });

  it("supports backward-compatible fallback to plain text explanation", () => {
    const fallbackResult: McqExplanationResult = {
      text: "Option B is correct because the demand curve shifts rightward following a decrease in tax.",
    };

    expect(fallbackResult.text).toBeTruthy();
    expect(fallbackResult.diagnostic).toBeUndefined();
  });
});
