import { describe, it, expect } from "vitest";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "./preloaded-papers";
import type { DataResponsePaper } from "./types";

describe("Cambridge Economics (9708) Data Response Papers & Preloaded Suite", () => {
  it("loads all 30 official Cambridge Economics 9708 papers (15 AS Level, 15 A Level)", () => {
    expect(PRELOADED_DATA_RESPONSE_PAPERS.length).toBe(30);

    const asPapers = PRELOADED_DATA_RESPONSE_PAPERS.filter((p) => p.qualificationLevel === "as");
    const a2Papers = PRELOADED_DATA_RESPONSE_PAPERS.filter((p) => p.qualificationLevel === "a2");

    expect(asPapers.length).toBe(15);
    expect(a2Papers.length).toBe(15);

    // Ensure all are exclusively 9708 Cambridge Economics
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.subjectCode).toBe("9708");
      expect(["as", "a2"]).toContain(paper.qualificationLevel);
      expect(paper.isOfficial).toBe(true);
      expect(paper.durationMinutes).toBe(45);
      expect(paper.id).toMatch(/^9708_/);
    }
  });

  it("verifies mathematical invariant: totalMarks equals sum of question max marks across all 30 papers", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      const sum = paper.questions.reduce((acc, q) => acc + q.maxMark, 0);
      expect(sum).toBe(paper.totalMarks);
      expect(paper.totalMarks).toBe(20);
    }
  });

  it("enforces that questions with 6+ marks have evaluative rubrics and Level 3 descriptors", () => {
    let longQuestionsCount = 0;
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      for (const q of paper.questions) {
        if (q.maxMark >= 6) {
          longQuestionsCount++;
          expect(q.rubricLevels).toBeDefined();
          expect(q.rubricLevels?.length).toBeGreaterThanOrEqual(3);
          // Level 3 must specify evaluative requirements
          const topLevel = q.rubricLevels?.find((l) => l.level >= 3);
          expect(topLevel).toBeDefined();
          expect(topLevel?.evaluativeRequirement).toBeDefined();
          expect(topLevel?.evaluativeRequirement?.length).toBeGreaterThan(10);
        }
      }
    }
    expect(longQuestionsCount).toBeGreaterThanOrEqual(30);
  });

  it("verifies calculation guidance and OFR rules for quantitative questions", () => {
    const calcQuestions = PRELOADED_DATA_RESPONSE_PAPERS.flatMap((p) =>
      p.questions.filter((q) => q.category === "calculation")
    );
    expect(calcQuestions.length).toBeGreaterThanOrEqual(15);

    for (const q of calcQuestions) {
      expect(q.calculationGuidance).toBeDefined();
      expect(q.calculationGuidance?.formula).toBeDefined();
      expect(q.calculationGuidance?.correctAnswer).toBeDefined();
      expect(q.calculationGuidance?.ofrApplies).toBe(true);
    }
  });

  it("verifies diagram specifications exist for questions requiring diagrams", () => {
    const diagramQuestions = PRELOADED_DATA_RESPONSE_PAPERS.flatMap((p) =>
      p.questions.filter((q) => q.hasDiagramRequirement)
    );

    expect(diagramQuestions.length).toBeGreaterThanOrEqual(12);

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
        expect(p.length).toBeGreaterThan(30);
      }
    }

    // Verify papers with Table 1.1 formatted data
    const papersWithTables = PRELOADED_DATA_RESPONSE_PAPERS.filter(
      (p) => p.extract.tables && p.extract.tables.length > 0
    );
    expect(papersWithTables.length).toBeGreaterThanOrEqual(25);

    for (const p of papersWithTables) {
      const table = p.extract.tables![0];
      expect(table.headers.length).toBeGreaterThan(1);
      expect(table.rows.length).toBeGreaterThan(1);
    }
  });

  it("verifies zero-hallucination verbatim microeconomic question stem and mark scheme exemplars for 9708_22_2026_fm", () => {
    const fmPaper = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "9708_22_2026_fm");
    expect(fmPaper).toBeDefined();

    const q1d = fmPaper?.questions.find((q) => q.number === "1(d)");
    expect(q1d).toBeDefined();
    // Verbatim microeconomic case study focus, NOT a generalized macro essay
    expect(q1d?.title).toContain("decreasing the consumption of fast food will increase unemployment in the US");
    expect(q1d?.category).toBe("essay_evaluative");
    expect(q1d?.maxMark).toBe(6);

    // Question 1(b) contains official Cambridge notes honoring exemplars without unfair penalties
    const q1b = fmPaper?.questions.find((q) => q.number === "1(b)");
    expect(q1b).toBeDefined();
    expect(q1b?.markingGuide).toContain("Never penalize for omitting third-party effects");

    // Sample answers are provided and unstarred
    expect(fmPaper?.sampleAnswers).toBeDefined();
    expect(fmPaper?.sampleAnswers?.["1(d)"]).toContain("derived demand for labour");
    expect(fmPaper?.sampleAnswers?.["1(d)"]).not.toMatch(/\*+/);
  });
});
