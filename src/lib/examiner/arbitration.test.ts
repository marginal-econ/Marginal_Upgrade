import { describe, expect, it } from "vitest";
import { computeObjectiveConfidence, shouldTriggerArbitration, synthesizeDualPasses } from "./arbitration.server";
import type { Grading } from "./types";

function mockGrading(totalMark: number, band: string, strengths: string[] = []): Grading {
  return {
    total_mark: totalMark,
    max_mark: 12,
    band,
    ao_breakdown: {
      knowledge: { awarded: Math.round(totalMark * 0.25), out_of: 3, comment: "" },
      analysis: { awarded: Math.round(totalMark * 0.5), out_of: 6, comment: "" },
      evaluation: { awarded: Math.round(totalMark * 0.25), out_of: 3, comment: "" },
    },
    examiner_summary: "Test summary",
    strengths,
    weaknesses: [],
    missing_elements: {
      definitions: [],
      analysis: [],
      evaluation: [],
      examples: [],
      diagrams: [],
    },
    actionable_feedback: [],
    suggested_resources: [],
    suggested_practice: [],
    confidence: 0.8,
    audited: false,
    sources: [],
    anchorsUsed: 0,
  };
}

describe("Principal Examiner Arbitration & Confidence Engine", () => {
  describe("Dispute Detection (shouldTriggerArbitration)", () => {
    it("does not trigger arbitration when examiner and moderator agree closely", () => {
      const examiner = mockGrading(8, "Upper middle band");
      const moderator = mockGrading(9, "Upper middle band");

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(false);
      expect(result.delta).toBe(1);
    });

    it("triggers arbitration when mark difference exceeds tolerance threshold", () => {
      const examiner = mockGrading(10, "Top band");
      const moderator = mockGrading(6, "Lower middle band"); // 4 marks discrepancy on 12-mark essay

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(true);
      expect(result.delta).toBe(4);
      expect(result.reason).toContain("discrepancy of 4 marks");
    });

    it("triggers arbitration on severe grade band contradiction", () => {
      const examiner = mockGrading(8, "Top band");
      const moderator = mockGrading(7, "Lower middle band");

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(true);
      expect(result.reason).toContain("contradiction");
    });
  });

  describe("Objective Confidence Computation", () => {
    it("awards high confidence when examiner and moderator closely converge", () => {
      const examiner = mockGrading(9, "Upper middle band", [
        'Quotes: "AD shifts right due to investment"',
      ]);
      const moderator = mockGrading(9, "Upper middle band", ['Agrees with "AD shifts right"']);

      const confidence = computeObjectiveConfidence(examiner, moderator, false);
      expect(confidence).toBeGreaterThanOrEqual(0.9);
      expect(confidence).toBeLessThanOrEqual(0.98);
    });

    it("reduces confidence proportionally when examiner and moderator diverge", () => {
      const examiner = mockGrading(11, "Top band");
      const moderator = mockGrading(6, "Lower middle band");

      const confidence = computeObjectiveConfidence(examiner, moderator, false);
      expect(confidence).toBeLessThan(0.7);
      expect(confidence).toBeGreaterThanOrEqual(0.35);
    });

    it("maintains authoritative high baseline confidence when successfully arbitrated", () => {
      const examiner = mockGrading(10, "Top band");
      const moderator = mockGrading(7, "Lower middle band");

      const confidence = computeObjectiveConfidence(examiner, moderator, true);
      expect(confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
  describe("Dual-Pass Synthesis (synthesizeDualPasses)", () => {
    const split8 = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };

    it("synthesizes an 8-mark essay to 7 instead of 8 when one pass awarded 1 for AO3", () => {
      const pass1: Grading = {
        ...mockGrading(7, "Top Band"),
        max_mark: 8,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate terms." },
          analysis: { awarded: 4, out_of: 4, comment: "Detailed causal chains." },
          evaluation: { awarded: 1, out_of: 2, comment: "Evaluation points present but concluding judgement is not fully satisfied." },
        },
        weaknesses: ["Conclusion lacks full justification"],
        missing_elements: { definitions: [], analysis: [], evaluation: ["Decisive conclusion"], examples: [], diagrams: [] },
      };

      const pass2: Grading = {
        ...mockGrading(8, "Top Band"),
        max_mark: 8,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Good definitions." },
          analysis: { awarded: 4, out_of: 4, comment: "Sound mechanisms." },
          evaluation: { awarded: 2, out_of: 2, comment: "Good evaluation." },
        },
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      };

      const reconciled = synthesizeDualPasses(pass1, pass2, 8, split8);
      expect(reconciled.total_mark).toBe(7);
      expect(reconciled.ao_breakdown.evaluation.awarded).toBe(1);
    });

    it("filters false praise praising point inside PPC as allocatively inefficient and flags weakness", () => {
      const pass1: Grading = {
        ...mockGrading(8, "Top Band"),
        max_mark: 8,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Good definitions." },
          analysis: { awarded: 4, out_of: 4, comment: "Analysis of PPC." },
          evaluation: { awarded: 2, out_of: 2, comment: "Sound conclusion." },
        },
        strengths: ["Great analysis linking a point inside the PPC to allocative inefficiency"],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      };

      const pass2: Grading = {
        ...mockGrading(8, "Top Band"),
        max_mark: 8,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate PPC." },
          analysis: { awarded: 4, out_of: 4, comment: "Complete curves." },
          evaluation: { awarded: 2, out_of: 2, comment: "Justified ending." },
        },
        strengths: ["Clear terminology"],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      };

      const reconciled = synthesizeDualPasses(pass1, pass2, 8, split8);
      // Praise stripped
      expect(reconciled.strengths.some((s) => s.toLowerCase().includes("allocative"))).toBe(false);
      // Weakness added
      expect(reconciled.weaknesses.some((w) => w.includes("Economic misconception on PPC and efficiency"))).toBe(true);
      // AO2 deducted for the analytical error
      expect(reconciled.ao_breakdown.analysis.awarded).toBe(3);
      expect(reconciled.total_mark).toBeLessThanOrEqual(7);
    });
  });
});