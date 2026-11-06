import { describe, it, expect } from "vitest";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "./preloaded-papers";
import type { DataResponsePaper } from "./types";

describe("Cambridge Economics (9708) Data Response Papers & Preloaded Suite", () => {
  it("loads all 6 official Cambridge Economics 9708 papers (3 AS Level, 3 A Level)", () => {
    expect(PRELOADED_DATA_RESPONSE_PAPERS.length).toBe(6);
    const ids = PRELOADED_DATA_RESPONSE_PAPERS.map((p) => p.id);
    expect(ids).toEqual([
      "9708_22_2026_fm",
      "9708_42_2026_fm",
      "9708_22_2024_mj",
      "9708_42_2024_mj",
      "9708_22_2023_on",
      "9708_42_2023_on",
    ]);

    // Ensure all are exclusively 9708 Economics
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.subjectCode).toBe("9708");
      expect(["as", "a2"]).toContain(paper.qualificationLevel);
    }
  });

  it("verifies mathematical invariant: totalMarks equals sum of question max marks", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      const sum = paper.questions.reduce((acc, q) => acc + q.maxMark, 0);
      expect(sum).toBe(paper.totalMarks);
      expect(paper.totalMarks).toBe(20);
    }
  });

  it("enforces that questions with 6+ marks have evaluative rubrics and Level 3 descriptors", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      for (const q of paper.questions) {
        if (q.maxMark >= 6) {
          expect(q.rubricLevels).toBeDefined();
          expect(q.rubricLevels?.length).toBeGreaterThanOrEqual(3);
          // Level 3 should specify evaluative requirements
          const topLevel = q.rubricLevels?.find((l) => l.level === 3);
          expect(topLevel).toBeDefined();
          expect(topLevel?.evaluativeRequirement).toBeDefined();
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
  });

  it("verifies diagram specifications exist for questions requiring diagrams", () => {
    const diagramQuestions = PRELOADED_DATA_RESPONSE_PAPERS.flatMap((p) =>
      p.questions.filter((q) => q.hasDiagramRequirement)
    );

    expect(diagramQuestions.length).toBeGreaterThanOrEqual(4);

    for (const q of diagramQuestions) {
      expect(q.diagramSpec).toBeDefined();
      expect(q.diagramSpec?.xLabel).toBeDefined();
      expect(q.diagramSpec?.yLabel).toBeDefined();
      expect(q.diagramSpec?.curves.length).toBeGreaterThanOrEqual(2);
      expect(q.diagramGuidance?.diagramName).toBeDefined();
      expect(q.diagramGuidance?.shiftDescription).toBeDefined();
    }
  });

  it("confirms extract paragraphs, formatted tables, and context exist for every paper", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.extract.title.length).toBeGreaterThan(3);
      expect(paper.extract.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const p of paper.extract.paragraphs) {
        expect(p.length).toBeGreaterThan(50);
      }
    }

    // Verify papers with Table 1.1 formatted data
    const papersWithTables = PRELOADED_DATA_RESPONSE_PAPERS.filter(
      (p) => p.extract.tables && p.extract.tables.length > 0
    );
    expect(papersWithTables.length).toBeGreaterThanOrEqual(4);

    for (const p of papersWithTables) {
      const table = p.extract.tables![0];
      expect(table.headers.length).toBeGreaterThan(1);
      expect(table.rows.length).toBeGreaterThan(1);
    }
  });
});
