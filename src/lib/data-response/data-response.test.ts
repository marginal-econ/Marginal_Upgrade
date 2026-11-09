import { describe, it, expect } from "vitest";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "./preloaded-papers";
import { reconcileAoBreakdown } from "./marking-engine.server";
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

  it("verifies zero-hallucination verbatim question stem and mark scheme exemplars for official paper 9708_22_2024_fm", () => {
    const fmPaper = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "9708_22_2024_fm");
    expect(fmPaper).toBeDefined();

    const q1d = fmPaper?.questions.find((q) => q.number === "1(d)");
    expect(q1d).toBeDefined();
    // Verbatim Cambridge 9708/22/F/M/24 question stem
    expect(q1d?.title).toContain("Assess the possible impact on unemployment in Japan as a result of the increased investment in AI");
    expect(q1d?.category).toBe("essay_evaluative");
    expect(q1d?.maxMark).toBe(6);

    // Question 1(b) contains official Cambridge diagram requirements and marking guide
    const q1b = fmPaper?.questions.find((q) => q.number === "1(b)");
    expect(q1b).toBeDefined();
    expect(q1b?.markingGuide).toContain("1 mark for correct PPC diagram with outward shift");

    // Sample answers are provided and unstarred
    expect(fmPaper?.sampleAnswers).toBeDefined();
    expect(fmPaper?.sampleAnswers?.["1(d)"]).toContain("structural unemployment");
    expect(fmPaper?.sampleAnswers?.["1(d)"]).not.toMatch(/\*+/);
  });

  it("verifies ALL 30 papers in bank have complete benchmark sample answers for every sub-question with ZERO asterisks", () => {
    expect(PRELOADED_DATA_RESPONSE_PAPERS.length).toBe(30);

    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.sampleAnswers).toBeDefined();
      const samples = paper.sampleAnswers!;
      expect(Object.keys(samples).length).toBeGreaterThan(0);

      // Verify each question has a benchmark answer accessible by both ID and question number
      for (const q of paper.questions) {
        const answerById = samples[q.id];
        const answerByNum = samples[q.number];

        expect(answerById).toBeDefined();
        expect(answerByNum).toBeDefined();
        expect(answerById?.length).toBeGreaterThan(20);
        expect(answerByNum?.length).toBeGreaterThan(20);

        // Strict Cambridge Principal Examiner rule: ZERO asterisks in sample answers
        expect(answerById).not.toContain("*");
        expect(answerByNum).not.toContain("*");
      }
    }
  });

  it("enforces zero asterisks across all question titles, indicative points, marking guides, and tariffs in all 30 papers", () => {
    for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
      expect(paper.title).not.toContain("*");
      expect(paper.extract.title).not.toContain("*");

      for (const q of paper.questions) {
        expect(q.title).not.toContain("*");
        expect(q.markingGuide).not.toContain("*");

        if (q.indicativePoints) {
          for (const pt of q.indicativePoints) {
            expect(pt).not.toContain("*");
          }
        }

        // Verify tariff sums match maxMark exactly across every paper
        const tariffSum =
          (q.tariff.ao1 || 0) +
          (q.tariff.ao2 || 0) +
          (q.tariff.ao3 || 0);
        expect(tariffSum).toBe(q.maxMark);
      }
    }
  });

  describe("AO Reconciliation Engine (reconcileAoBreakdown)", () => {
    it("guarantees sum(AO awarded) strictly equals awardedMark for 2-mark definition questions", () => {
      const res = reconcileAoBreakdown({
        awardedMark: 2,
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        rawAo: { knowledge: { awarded: 1 } },
      });
      expect(res.awardedMark).toBe(2);
      const sum = res.aoBreakdown.knowledge.awarded + res.aoBreakdown.analysis.awarded;
      expect(sum).toBe(2);
      expect(res.aoBreakdown.knowledge.outOf).toBe(2);
    });

    it("guarantees sum(AO awarded) strictly equals awardedMark for 4-mark questions", () => {
      const res = reconcileAoBreakdown({
        awardedMark: 3,
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        rawAo: { knowledge: { awarded: 1 }, analysis: { awarded: 1 } },
      });
      expect(res.awardedMark).toBe(3);
      const sum = res.aoBreakdown.knowledge.awarded + res.aoBreakdown.analysis.awarded;
      expect(sum).toBe(3);
      expect(res.aoBreakdown.knowledge.outOf + res.aoBreakdown.analysis.outOf).toBe(4);
    });

    it("places application marks under analysis (AO2) and eliminates AO4", () => {
      const res = reconcileAoBreakdown({
        awardedMark: 4,
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        rawAo: { knowledge: { awarded: 2 }, application: { awarded: 2 } },
      });
      expect(res.awardedMark).toBe(4);
      expect(res.aoBreakdown.knowledge.awarded).toBe(2);
      expect(res.aoBreakdown.analysis.awarded).toBe(2);
      expect((res.aoBreakdown as any).ao4).toBeUndefined();
      expect(res.aoBreakdown.evaluation).toBeUndefined();
    });

    it("guarantees 6-mark evaluative questions reconcile outOf sum to 6 and awarded sum to awardedMark", () => {
      // Full marks: 6/6
      const res6 = reconcileAoBreakdown({
        awardedMark: 6,
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        rawAo: { knowledge: { awarded: 2 }, analysis: { awarded: 2 }, evaluation: { awarded: 2 } },
      });
      expect(res6.awardedMark).toBe(6);
      expect(res6.aoBreakdown.evaluation).toBeDefined();
      expect(res6.aoBreakdown.evaluation?.awarded).toBe(2); // Top evaluative level credited
      const outOfSum = res6.aoBreakdown.knowledge.outOf + res6.aoBreakdown.analysis.outOf + (res6.aoBreakdown.evaluation?.outOf ?? 0);
      expect(outOfSum).toBe(6);
      const awardedSum = res6.aoBreakdown.knowledge.awarded + res6.aoBreakdown.analysis.awarded + (res6.aoBreakdown.evaluation?.awarded ?? 0);
      expect(awardedSum).toBe(6);

      // Level 3 Pass: 5/6 (evaluation must never be 0)
      const res5 = reconcileAoBreakdown({
        awardedMark: 5,
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        rawAo: { knowledge: { awarded: 2 }, analysis: { awarded: 2 }, evaluation: { awarded: 1 } },
      });
      expect(res5.awardedMark).toBe(5);
      expect(res5.aoBreakdown.evaluation?.awarded).toBeGreaterThanOrEqual(1);
      const awardedSum5 = res5.aoBreakdown.knowledge.awarded + res5.aoBreakdown.analysis.awarded + (res5.aoBreakdown.evaluation?.awarded ?? 0);
      expect(awardedSum5).toBe(5);

      // Level 2: 4/6 (evaluation can be 0)
      const res4 = reconcileAoBreakdown({
        awardedMark: 4,
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        rawAo: { knowledge: { awarded: 2 }, analysis: { awarded: 2 } },
      });
      expect(res4.awardedMark).toBe(4);
      const awardedSum4 = res4.aoBreakdown.knowledge.awarded + res4.aoBreakdown.analysis.awarded + (res4.aoBreakdown.evaluation?.awarded ?? 0);
      expect(awardedSum4).toBe(4);
    });

    it("handles zero marks gracefully with all AOs equal to 0", () => {
      const res0 = reconcileAoBreakdown({
        awardedMark: 0,
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
      });
      expect(res0.awardedMark).toBe(0);
      expect(res0.aoBreakdown.knowledge.awarded).toBe(0);
      expect(res0.aoBreakdown.analysis.awarded).toBe(0);
      expect(res0.aoBreakdown.evaluation?.awarded).toBe(0);
    });

    it("reconciles across every single question across all 30 papers for any arbitrary test score", () => {
      for (const paper of PRELOADED_DATA_RESPONSE_PAPERS) {
        for (const q of paper.questions) {
          for (let score = 0; score <= q.maxMark; score++) {
            const result = reconcileAoBreakdown({
              awardedMark: score,
              maxMark: q.maxMark,
              tariff: q.tariff,
            });
            expect(result.awardedMark).toBe(score);
            const sumAwarded =
              result.aoBreakdown.knowledge.awarded +
              result.aoBreakdown.analysis.awarded +
              (result.aoBreakdown.evaluation?.awarded ?? 0);
            expect(sumAwarded).toBe(score);

            const sumOutOf =
              result.aoBreakdown.knowledge.outOf +
              result.aoBreakdown.analysis.outOf +
              (result.aoBreakdown.evaluation?.outOf ?? 0);
            expect(sumOutOf).toBe(q.maxMark);
          }
        }
      }
    });
  });
});
