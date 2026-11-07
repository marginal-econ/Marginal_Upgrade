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
          (q.tariff.ao3 || 0) +
          (q.tariff.ao4 || 0);
        expect(tariffSum).toBe(q.maxMark);
      }
    }
  });

  it("enforces Cambridge 9708 Section A mathematical AO reconciliation invariant: Awarded === AO1 + AO2 + AO3 + AO4", async () => {
    const { reconcileAoMarks } = await import("./report-formatter");

    // Case 1: 6-mark evaluative question scored 6/6 with raw AO4 missing/0 -> AO4 must be at least 2, sum must be exactly 6
    const res6mFull = reconcileAoMarks({
      rawAwarded: 6,
      rawAo: { knowledge: 2, application: 2, analysis: 2, evaluation: 0 },
      maxMark: 6,
      tariff: { ao1: 2, ao2: 1, ao3: 1, ao4: 2 },
    });
    expect(res6mFull.awardedMark).toBe(6);
    expect(res6mFull.aoBreakdown.evaluation?.awarded).toBeGreaterThanOrEqual(2);
    const sum6m =
      res6mFull.aoBreakdown.knowledge.awarded +
      res6mFull.aoBreakdown.application.awarded +
      res6mFull.aoBreakdown.analysis.awarded +
      (res6mFull.aoBreakdown.evaluation?.awarded ?? 0);
    expect(sum6m).toBe(6);

    // Case 2: 6-mark evaluative question scored 5/6 with raw AO4 missing/0 -> AO4 must be at least 1, sum must be exactly 5
    const res6mL3 = reconcileAoMarks({
      rawAwarded: 5,
      rawAo: { knowledge: 2, application: 2, analysis: 1, evaluation: 0 },
      maxMark: 6,
      tariff: { ao1: 2, ao2: 1, ao3: 1, ao4: 2 },
    });
    expect(res6mL3.awardedMark).toBe(5);
    expect(res6mL3.aoBreakdown.evaluation?.awarded).toBeGreaterThanOrEqual(1);
    const sum6mL3 =
      res6mL3.aoBreakdown.knowledge.awarded +
      res6mL3.aoBreakdown.application.awarded +
      res6mL3.aoBreakdown.analysis.awarded +
      (res6mL3.aoBreakdown.evaluation?.awarded ?? 0);
    expect(sum6mL3).toBe(5);

    // Case 3: 4-mark short question without AO4
    const res4m = reconcileAoMarks({
      rawAwarded: 3,
      rawAo: { knowledge: 1, application: 1, analysis: 1 },
      maxMark: 4,
      tariff: { ao1: 1, ao2: 2, ao3: 1 },
    });
    expect(res4m.awardedMark).toBe(3);
    const sum4m =
      res4m.aoBreakdown.knowledge.awarded +
      res4m.aoBreakdown.application.awarded +
      res4m.aoBreakdown.analysis.awarded;
    expect(sum4m).toBe(3);

    // Case 4: 0 marks awarded
    const res0m = reconcileAoMarks({
      rawAwarded: 0,
      rawAo: { knowledge: 1, application: 1 },
      maxMark: 6,
      tariff: { ao1: 2, ao2: 1, ao3: 1, ao4: 2 },
    });
    expect(res0m.awardedMark).toBe(0);
    const sum0m =
      res0m.aoBreakdown.knowledge.awarded +
      res0m.aoBreakdown.application.awarded +
      res0m.aoBreakdown.analysis.awarded +
      (res0m.aoBreakdown.evaluation?.awarded ?? 0);
    expect(sum0m).toBe(0);
  });

  it("verifies numerical ranges and classification flexibility in official mark schemes (e.g. YED 0.7 to 0.8 / normal good / necessity)", () => {
    const fmPaper = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "9708_22_2026_fm");
    const q1aii = fmPaper?.questions.find((q) => q.number === "1(a)(ii)");
    expect(q1aii).toBeDefined();

    // Mark scheme accepts ranges [0.7 to 0.8] and classifications (normal good, necessity, inelastic YED)
    expect(q1aii?.markingGuide).toContain("+0.76");
    expect(q1aii?.markingGuide).toContain("normal good");
    expect(q1aii?.markingGuide).toContain("necessity");

    // Sample answer aligns with acceptable range
    const sample = fmPaper?.sampleAnswers?.["1(a)(ii)"];
    expect(sample).toContain("+0.76");
    expect(sample).toContain("normal good");
  });

  it("strictly enforces Senior Chief Examiner Output Template with zero canned/placeholder text", async () => {
    const { formatSubQuestionReport, formatFullPaperReport } = await import("./report-formatter");

    const mockEvaluation = {
      questionNumber: "1(b)",
      questionTitle: "Explain how a fall in the price of fast food affects consumer surplus in the US fast food market.",
      maxMark: 4,
      awardedMark: 3,
      category: "short_answer" as const,
      extractContextCheck: {
        usedContext: true,
        contextQuality: "strong" as const,
        feedback: "Directly referenced paragraph 3 fast food price decreases.",
      },
      aoBreakdown: {
        knowledge: { awarded: 1, outOf: 1 },
        application: { awarded: 1, outOf: 1 },
        analysis: { awarded: 1, outOf: 2 },
      },
      specificCriteriaMet: [
        {
          criterion: "Identifies consumer surplus as the difference between willingness to pay and actual price paid.",
          candidateEvidence: "Consumer surplus is the extra utility consumers get when they pay a price below what they were willing to pay.",
        },
        {
          criterion: "Explains increase in consumer surplus for existing and new fast food consumers.",
          candidateEvidence: "When price falls from P1 to P2, consumer surplus expands downwards for fast food meals.",
        },
      ],
      examinerRationale: "Candidate accurately defined consumer surplus and demonstrated how price reduction expands the surplus area. 1 mark withheld as diagrammatic transmission mechanism was not fully specified.",
      evidenceQuotes: [
        "Consumer surplus is the extra utility consumers get when they pay a price below what they were willing to pay.",
      ],
      creditedPoints: [
        "Consumer surplus definition",
        "Expansion of consumer surplus area",
      ],
      missingMarkSchemePoints: [
        "Explicit distinction between original buyers gaining more surplus and new consumers entering the market.",
      ],
      constructiveFeedback: [
        "Distinguish between original fast food consumers who gain higher surplus and new consumers who now enter the market.",
      ],
      modelAnswerSnippet: "Consumer surplus is the difference between the price consumers are willing to pay and the market price actually paid. When fast food prices decrease, consumer surplus increases for two reasons: existing fast food consumers pay a lower price on meals already consumed, expanding their surplus area, and new consumers enter the market as the lower price brings fast food within their reservation price.",
      improvementTip: "Explicitly differentiate the surplus gain to existing consumers from the gain attributed to new entrants.",
    };

    const output = formatSubQuestionReport(mockEvaluation);

    // Verify all mandatory section headers from user's directive are present
    expect(output).toContain("1(b)");
    expect(output).toContain("Explain how a fall in the price of fast food affects consumer surplus in the US fast food market. [4 Marks]");
    expect(output).toContain("Extract: strong 3/4 Marks");
    expect(output).toContain("AO Allocation:");
    expect(output).toContain("AO1 (Knowledge): 1/1");
    expect(output).toContain("AO2 (Application): 1/1");
    expect(output).toContain("AO3 (Analysis): 1/2");
    expect(output).toContain("Specific Mark Scheme Criteria Met:");
    expect(output).toContain("Candidate Evidence: \"Consumer surplus is the extra utility consumers get");
    expect(output).toContain("Principal Examiner Assessment Rationale:");
    expect(output).toContain("Cambridge Model Answer Formulation:");
    expect(output).toContain("Examiner Key Improvement Advice:");

    // Zero asterisks
    expect(output).not.toContain("**");
    expect(output).not.toContain("*");

    // Zero canned / placeholder phrases
    expect(output).not.toContain("Credited for relevant economic reasoning");
    expect(output).not.toContain("Consult the mark scheme");
    expect(output).not.toContain("Consult the official");

    // Full paper format test
    const mockFullPaper = {
      id: "sub_123",
      paperId: "9708_22_2026_fm",
      paperTitle: "Cambridge AS Economics Feb/March 2026 Paper 22",
      subjectCode: "9708",
      totalMarksAwarded: 16,
      maxTotalMarks: 20,
      percentage: 80,
      overallBand: "Band A* (Outstanding / Top Band)",
      examinerExecutiveSummary: "High standard response demonstrating accurate data extraction.",
      questionResults: { "1(b)": mockEvaluation },
      submittedAt: new Date().toISOString(),
    };

    const fullReport = formatFullPaperReport(mockFullPaper);
    expect(fullReport).toContain("DATA RESPONSE SENIOR CHIEF EXAMINER ASSESSMENT REPORT");
    expect(fullReport).toContain("Total Score: 16/20 (80%) - Cambridge Band: Band A (Outstanding / Top Band)");
    expect(fullReport).toContain("Cambridge Model Answer Formulation:");
    expect(fullReport).not.toContain("**");
  });
});
