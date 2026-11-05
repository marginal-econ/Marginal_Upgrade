import { describe, expect, it } from "vitest";

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
});
