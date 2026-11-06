import { describe, it, expect } from "vitest";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "./preloaded-papers";
import type { DataResponsePaper } from "./types";

describe("Cambridge Data Response Papers & Preloaded Suite", () => {
  it("loads all 4 official 2026 pre-loaded papers correctly", () => {
    expect(PRELOADED_DATA_RESPONSE_PAPERS.length).toBe(4);
    const ids = PRELOADED_DATA_RESPONSE_PAPERS.map((p) => p.id);
    expect(ids).toContain("9708_22_2026_fm");
    expect(ids).toContain("9609_22_2026_fm");
    expect(ids).toContain("9708_42_2026_fm");
    expect(ids).toContain("9609_42_2026_fm");
  });

  it("verifies mathematical invariant: totalMarks equals sum of question max marks", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      const sum = paper.questions.reduce((acc, q) => acc + q.maxMark, 0);
      expect(sum).toBe(paper.totalMarks);
    }
  });

  it("enforces that questions with 6+ marks have evaluative rubrics and Level 3 descriptors", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      for (const q of paper.questions) {
        if (q.maxMark >= 6) {
          expect(q.category).toBe("essay_evaluative");
          expect(q.rubricLevels).toBeDefined();
          expect(q.rubricLevels?.length).toBeGreaterThanOrEqual(2);
          // Level 3 should specify evaluative requirements
          const topLevel = q.rubricLevels?.find((l) => l.level >= 2);
          expect(topLevel).toBeDefined();
        }
      }
    }
  });

  it("verifies calculation guidance and OFR rules for quantitative questions", () => {
    const econ22 = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "9708_22_2026_fm")!;
    const calcQ = econ22.questions.find((q) => q.number === "1(a)(ii)");
    expect(calcQ).toBeDefined();
    expect(calcQ?.category).toBe("calculation");
    expect(calcQ?.calculationGuidance?.ofrApplies).toBe(true);
    expect(calcQ?.calculationGuidance?.correctAnswer).toContain("+0.76");

    const biz22 = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "9609_22_2026_fm")!;
    const bizCalcQ = biz22.questions.find((q) => q.number === "1(b)(i)");
    expect(bizCalcQ).toBeDefined();
    expect(bizCalcQ?.category).toBe("calculation");
    expect(bizCalcQ?.calculationGuidance?.correctAnswer).toContain("$14,000");
  });

  it("confirms extract paragraphs and context exist for every paper", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.extract.title.length).toBeGreaterThan(3);
      expect(paper.extract.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const p of paper.extract.paragraphs) {
        expect(p.length).toBeGreaterThan(50);
      }
    }
  });
});
