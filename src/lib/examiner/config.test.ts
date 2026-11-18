import { describe, expect, it } from "vitest";

import { REPORT_REFINER_PROMPT } from "./refine.server";
import {
  AO_DEFINITIONS,
  defaultSplitForMaxMark,
  formatAoLine,
  MODEL_ANALYSIS,
  MODEL_ARBITRATION,
  MODEL_AUDIT,
  MODEL_CHALLENGE,
  MODEL_COACH,
  MODEL_ESTIMATE,
  MODEL_EXAMINER,
  MODEL_EXTRACT,
  MODEL_FAST,
  MODEL_GRADING,
  MODEL_LIVE_CANDIDATE,
  MODEL_LIVE_CHECK,
  MODEL_MECHANICAL,
  MODEL_QUESTION_GEN,
  TARIFF_SPLITS,
} from "./config";

describe("Examiner Configuration & Gemini Model Allocation", () => {
  it("allocates Gemini 3.8 Flash for deep evaluative grading and arbitration", () => {
    expect(MODEL_EXAMINER).toBe("google/gemini-3.8-flash");
    expect(MODEL_GRADING).toBe("google/gemini-3.8-flash");
    expect(MODEL_AUDIT).toBe("google/gemini-3.8-flash");
    expect(MODEL_ARBITRATION).toBe("google/gemini-3.8-flash");
  });

  it("allocates Gemini 3.8 Flash for high-frequency live typing and diagnostic tasks", () => {
    expect(MODEL_FAST).toBe("google/gemini-3.8-flash");
    expect(MODEL_LIVE_CHECK).toBe("google/gemini-3.8-flash");
    expect(MODEL_LIVE_CANDIDATE).toBe("google/gemini-3.8-flash");
    expect(MODEL_ESTIMATE).toBe("google/gemini-3.8-flash");
    expect(MODEL_MECHANICAL).toBe("google/gemini-3.8-flash");
    expect(MODEL_EXTRACT).toBe("google/gemini-3.8-flash");
    expect(MODEL_COACH).toBe("google/gemini-3.8-flash");
    expect(MODEL_CHALLENGE).toBe("google/gemini-3.8-flash");
    expect(MODEL_QUESTION_GEN).toBe("google/gemini-3.8-flash");
    expect(MODEL_ANALYSIS).toBe("google/gemini-3.8-flash");
  });

  it("preserves authoritative Cambridge 9708 AO splits across tariffs", () => {
    expect(TARIFF_SPLITS[8]).toEqual({ ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 });
    expect(TARIFF_SPLITS[12]).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 });
    expect(TARIFF_SPLITS[20]).toEqual({ ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 });

    const split12 = defaultSplitForMaxMark(12);
    expect(split12.ao1_marks + split12.ao2_marks + split12.ao3_marks).toBe(12);

    const split8 = defaultSplitForMaxMark(8);
    expect(split8.ao1_marks + split8.ao2_marks + split8.ao3_marks).toBe(8);

    const split20 = defaultSplitForMaxMark(20);
    expect(split20.ao1_marks + split20.ao2_marks + split20.ao3_marks).toBe(20);
  });

  it("formats AO lines accurately according to syllabus standard", () => {
    expect(formatAoLine("ao1")).toContain("AO1 Knowledge and understanding");
    expect(formatAoLine("ao2")).toContain("AO2 Analysis");
    expect(formatAoLine("ao3")).toContain("AO3 Evaluation");
  });

  it("correctly identifies evaluative vs non-evaluative legacy questions", async () => {
    const { isEvaluativeQuestion, TARIFF_SPLIT_8_LEGACY } = await import("./config");
    expect(isEvaluativeQuestion("Discuss whether tariffs are beneficial")).toBe(true);
    expect(isEvaluativeQuestion("Evaluate the impact of monetary policy")).toBe(true);
    expect(isEvaluativeQuestion("Consider the extent to which inflation causes unemployment")).toBe(true);
    expect(isEvaluativeQuestion("Assess whether a subsidy is effective")).toBe(true);

    // Non-evaluative legacy questions (no "consider", "to what extent", "discuss", "evaluate")
    expect(isEvaluativeQuestion("Explain two causes of an increase in aggregate demand")).toBe(false);
    expect(isEvaluativeQuestion("Analyse how changes in interest rates affect consumption")).toBe(false);
    expect(isEvaluativeQuestion("Distinguish between allocative and productive efficiency")).toBe(false);

    // Legacy 8-mark split has AO3 = 0, AO1 = 2, AO2 = 6
    expect(TARIFF_SPLIT_8_LEGACY).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 });

    // Explicit legacy essayType parameter
    const legacySplit = defaultSplitForMaxMark(8, "8_legacy");
    expect(legacySplit).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 });

    // Automatic detection for 8-mark question lacking evaluative keywords
    const autoSplit = defaultSplitForMaxMark(8, undefined, "Explain two causes of an increase in aggregate demand");
    expect(autoSplit).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 });

    // 8-mark question with evaluative keywords retains 2/4/2
    const evalSplit = defaultSplitForMaxMark(8, undefined, "Discuss whether interest rate rises reduce inflation");
    expect(evalSplit).toEqual({ ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 });
  });
  it("builds exact evaluation directives and level descriptors matching 8m tariffs", async () => {
    const { buildAoEvaluationDirective, buildPaperScopeDirective, renderAo3Descriptors, defaultSplitForMaxMark, isEvaluativeQuestion } = await import("./config");

    const compoundQuestion = "Explain the difference between public goods and merit goods and consider whether healthcare should be classified as a public good or a merit good";
    expect(isEvaluativeQuestion(compoundQuestion)).toBe(true);

    const evalSplit = defaultSplitForMaxMark(8, "8_eval", compoundQuestion);
    expect(evalSplit).toEqual({ ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 });

    const evalDirective = buildAoEvaluationDirective(8, evalSplit);
    expect(evalDirective).toContain("8-MARK PAPER 2 (AS LEVEL) EVALUATIVE ESSAY");
    expect(evalDirective).toContain("Award 2/2 (Level 2)");

    const scope8 = buildPaperScopeDirective(8);
    expect(scope8).toContain("STRICT CAMBRIDGE 9708 PAPER 2 (AS LEVEL ONLY)");
    expect(scope8).toContain("ABSOLUTE PROHIBITION OF A-LEVEL");

    const legacySplit = defaultSplitForMaxMark(8, "8_legacy");
    expect(legacySplit).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 });

    const legacyDirective = buildAoEvaluationDirective(8, legacySplit);
    expect(legacyDirective).toContain("NON-EVALUATIVE LEGACY ESSAY");
    expect(legacyDirective).toContain("EVALUATION IS NOT REQUIRED");

    const evalAo3Descriptors = renderAo3Descriptors(8, 2);
    expect(evalAo3Descriptors).toContain("AO3 Evaluation (2 marks — Paper 2 8m)");

    const legacyAo3Descriptors = renderAo3Descriptors(8, 0);
    expect(legacyAo3Descriptors).toContain("AO3 Evaluation (0 marks): Evaluation is NOT required");
  });

  it("builds exact evaluation directives and level descriptors matching 12m tariffs (calibrated timed standard, AS Level Paper 2)", async () => {
    const { buildAoEvaluationDirective, buildPaperScopeDirective, renderAo3Descriptors, defaultSplitForMaxMark } = await import("./config");

    const split12 = defaultSplitForMaxMark(12);
    expect(split12).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 });

    const directive12 = buildAoEvaluationDirective(12, split12);
    expect(directive12).toContain("12-MARK PAPER 2 (AS LEVEL) EVALUATIVE ESSAY");
    expect(directive12).toContain("Top Band (10–12/12");

    const scope12 = buildPaperScopeDirective(12);
    expect(scope12).toContain("ABSOLUTE PROHIBITION OF A-LEVEL (A2 / PAPER 4) CONCEPTS");

    const descriptors12 = renderAo3Descriptors(12, 4);
    expect(descriptors12).toContain("Paper 2 12m");
    expect(descriptors12).toContain("3–4/4");
  });

  it("verifies the third AI refiner prompt covers economic accuracy, paper scope, zero repetition, and mark consistency", () => {
    expect(REPORT_REFINER_PROMPT).toContain("ECONOMIC ACCURACY & FALSE-PRAISE AUDIT");
    expect(REPORT_REFINER_PROMPT).toContain("ZERO REPETITION — DISTINCT ROLES FOR EVERY SECTION");
    expect(REPORT_REFINER_PROMPT).toContain("MARK-TO-PROSE CONSISTENCY & ZERO CONTRADICTIONS");
    expect(REPORT_REFINER_PROMPT).toContain("STRICT DIAGRAM RULE");
    expect(REPORT_REFINER_PROMPT).toContain("{paper_scope_directive}");
    expect(REPORT_REFINER_PROMPT).toContain("{ao_evaluation_directive}");
  });

  it("builds exact official Cambridge 9708 Paper 4 Table A & Table B directives matching 20m tariffs", async () => {
    const { buildAoEvaluationDirective, buildPaperScopeDirective, renderAo3Descriptors, defaultSplitForMaxMark } = await import("./config");

    const split20 = defaultSplitForMaxMark(20);
    expect(split20).toEqual({ ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 });

    const directive20 = buildAoEvaluationDirective(20, split20);
    expect(directive20).toContain("OFFICIAL CAMBRIDGE 9708 PAPER 4 (A LEVEL) 20-MARK EXTENDED ESSAY");
    expect(directive20).toContain("TABLE A — AO1 KNOWLEDGE (2) + AO2 ANALYSIS (12) = 14 MARKS TOTAL");
    expect(directive20).toContain("TABLE B — AO3 EVALUATION (6 MARKS TOTAL");
    expect(directive20).toContain("WHERE APPROPRIATE");

    const scope20 = buildPaperScopeDirective(20);
    expect(scope20).toContain("PAPER 4 (A LEVEL / A2 EXTENDED ESSAYS)");
    expect(scope20).toContain("FULL A-LEVEL (A2) SYLLABUS THEORY IS EXPECTED AND REWARDED POSITIVELY");

    const descriptors20 = renderAo3Descriptors(20, 6);
    expect(descriptors20).toContain("Official Cambridge 9708 Paper 4 Table B");
    expect(descriptors20).toContain("Level 2 (4–6 of 6)");
    expect(descriptors20).toContain("Level 1 (1–3 of 6)");
  });
});
