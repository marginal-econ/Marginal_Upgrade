import { describe, expect, it } from "bun:test";

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
  it("allocates Gemini 2.5 Pro for deep evaluative grading and arbitration", () => {
    expect(MODEL_EXAMINER).toBe("google/gemini-2.5-pro");
    expect(MODEL_GRADING).toBe("google/gemini-2.5-pro");
    expect(MODEL_AUDIT).toBe("google/gemini-2.5-pro");
    expect(MODEL_ARBITRATION).toBe("google/gemini-2.5-pro");
  });

  it("allocates Gemini 3.6 Flash for high-frequency live typing and diagnostic tasks", () => {
    expect(MODEL_FAST).toBe("google/gemini-3.6-flash");
    expect(MODEL_LIVE_CHECK).toBe("google/gemini-3.6-flash");
    expect(MODEL_LIVE_CANDIDATE).toBe("google/gemini-3.6-flash");
    expect(MODEL_ESTIMATE).toBe("google/gemini-3.6-flash");
    expect(MODEL_MECHANICAL).toBe("google/gemini-3.6-flash");
    expect(MODEL_EXTRACT).toBe("google/gemini-3.6-flash");
    expect(MODEL_COACH).toBe("google/gemini-3.6-flash");
    expect(MODEL_CHALLENGE).toBe("google/gemini-3.6-flash");
    expect(MODEL_QUESTION_GEN).toBe("google/gemini-3.6-flash");
    expect(MODEL_ANALYSIS).toBe("google/gemini-3.6-flash");
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
});
