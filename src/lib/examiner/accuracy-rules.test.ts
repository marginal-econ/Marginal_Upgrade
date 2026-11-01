import { describe, expect, it } from "vitest";

import {
  analyzeCommandWord,
  AO3_CAPS,
  MANDATORY_ERROR_CHECKS,
  TABLE_A_LEVELS,
  TABLE_B_LEVELS,
} from "./accuracy-rules";

describe("accuracy-rules", () => {
  it("detects comparison command words requiring alternatives", () => {
    const q1 = "Discuss whether a subsidy is the best policy to tackle market failure.";
    const analysis1 = analyzeCommandWord(q1);
    expect(analysis1.isComparisonRequired).toBe(true);
    expect(analysis1.commandWord).toBe("best");
    expect(analysis1.guidanceLine).toContain("comparing the named policy against at least one alternative");

    const q2 = "Assess whether indirect taxation is the most effective way to reduce pollution.";
    const analysis2 = analyzeCommandWord(q2);
    expect(analysis2.isComparisonRequired).toBe(true);
    expect(analysis2.commandWord).toBe("most effective");
  });

  it("detects 'to what extent' requiring stated degree and conditions", () => {
    const q = "To what extent does a depreciation of the currency improve the balance of trade?";
    const analysis = analyzeCommandWord(q);
    expect(analysis.requiresDegreeAndConditions).toBe(true);
    expect(analysis.commandWord).toBe("to what extent");
    expect(analysis.guidanceLine).toContain("stated degree of impact");
  });

  it("contains all Cambridge AO3 strict caps", () => {
    const capIds = AO3_CAPS.map((c) => c.id);
    expect(capIds).toContain("no_comparison");
    expect(capIds).toContain("hedge_conclusion");
    expect(capIds).toContain("unweighed_listing");
    expect(capIds).toContain("wrong_question_judgement");
    expect(capIds).toContain("one_sided_evaluation");
    expect(capIds).toContain("generic_evaluation");

    const hedgeCap = AO3_CAPS.find((c) => c.id === "hedge_conclusion");
    expect(hedgeCap?.maxMark).toBe(2);

    const wrongQCap = AO3_CAPS.find((c) => c.id === "wrong_question_judgement");
    expect(wrongQCap?.maxMark).toBe(1);
  });

  it("defines all mandatory economic error rules", () => {
    const errorIds = MANDATORY_ERROR_CHECKS.map((e) => e.id);
    expect(errorIds).toContain("hyperinflation");
    expect(errorIds).toContain("demand_shifting_supply");
    expect(errorIds).toContain("shift_directions");
    expect(errorIds).toContain("as_equals_ad");
    expect(errorIds).toContain("investment_money_supply");
    expect(errorIds).toContain("inflation_types");
    expect(errorIds).toContain("supply_side_timing");
    expect(errorIds).toContain("merit_good_failures");
  });

  it("verifies Table A and Table B scale consistency", () => {
    expect(TABLE_A_LEVELS.level3.marks).toBe("6-8");
    expect(TABLE_A_LEVELS.level3.minChains).toBe(3);
    expect(TABLE_B_LEVELS.level3.marks).toBe("3-4");
    expect(TABLE_B_LEVELS.level2.marks).toBe("2");
    expect(TABLE_B_LEVELS.level1.marks).toBe("1");
  });
});
