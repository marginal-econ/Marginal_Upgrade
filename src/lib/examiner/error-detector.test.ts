import { describe, expect, it } from "vitest";
import { computeCapsFromDetector, type DetectorResult } from "./error-detector.server";
import { detectEconomicErrors } from "./types";

describe("computeCapsFromDetector — Code-computed Cambridge 9708 Caps", () => {
  const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
  const question = "Assess whether indirect taxes are the best method to reduce the consumption of demerit goods.";
  const essayText = "An indirect tax shifts demand left. Inelastic demand makes the tax very effective. It ensures socially optimal consumption.";

  it("calculates Table A capped at 4/8 and Table B capped at 1/4 on Demerit Goods essay with 3 errors and question-fit failure", () => {
    const detectorResult: DetectorResult = {
      findings: [
        {
          category: "wrong_curve_or_shift",
          quote: "shifts demand left",
          correct_version: "Indirect taxes increase costs and shift supply upwards/leftwards; demand does not shift.",
          severity: "major",
        },
        {
          category: "wrong_elasticity",
          quote: "inelastic demand makes the tax very effective",
          correct_version: "Inelastic demand means quantity falls proportionally less than price rises, so tax is ineffective at cutting consumption.",
          severity: "major",
        },
        {
          category: "absolute_claim",
          quote: "ensures socially optimal consumption",
          correct_version: "Asserting that a tax 'ensures' an optimal outcome without qualification ignores information failure and enforcement costs.",
          severity: "major",
        },
      ],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 1, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 2, relevant: true, chain_status: "partial", has_major_error: true },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: false,
        states_which_is_better_or_when: false,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: true,
        reason: "does not compare indirect taxes with an alternative on a stated criterion",
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);

    expect(caps.majorErrorCount).toBe(3);
    expect(caps.tableACap).toBe(4);
    expect(caps.tableBCap).toBe(1);
    expect(caps.maxAo1).toBe(2);
    expect(caps.maxAo2).toBe(2); // 4 - 2 = 2
    expect(caps.failsQuestionFit).toBe(true);

    // Audit line must match final marks and format
    expect(caps.auditLine).toContain("Audit: Table A capped at 4/8");
    expect(caps.auditLine).toContain("Table B capped at 1/4");
    expect(caps.auditLine).toContain("Final marks: AO1 2, AO2 2, AO3 1.");
  });

  it("caps AO1 at 1 when a key definition is incorrect (e.g. depreciation confused with devaluation)", () => {
    const detectorResult: DetectorResult = {
      findings: [
        {
          category: "wrong_definition",
          quote: "government lowers currency",
          correct_version: "Depreciation is market-driven under floating rates; government lowering currency is devaluation under fixed rates.",
          severity: "major",
          is_definition_error: true,
        },
        {
          category: "wrong_elasticity",
          quote: "inelastic demand works best",
          correct_version: "Inelastic demand means export revenue falls and import spending rises, worsening the deficit.",
          severity: "major",
        },
      ],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 1, relevant: true, chain_status: "partial", has_major_error: true },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);

    expect(caps.majorErrorCount).toBe(2);
    expect(caps.hasDefinitionError).toBe(true);
    expect(caps.tableACap).toBe(5);
    // Definition error caps AO1 at max 1!
    expect(caps.maxAo1).toBe(1);
    // AO2 is Table A minus AO1 = 5 - 1 = 4
    expect(caps.maxAo2).toBe(4);
    expect(caps.auditLine).toContain("Final marks: AO1 1, AO2 4, AO3 4.");
  });

  it("awards full Table A (8/8) and Table B (4/4) when zero errors and 3+ complete chains", () => {
    const detectorResult: DetectorResult = {
      findings: [],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 2, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);

    expect(caps.majorErrorCount).toBe(0);
    expect(caps.tableACap).toBe(8);
    expect(caps.tableBCap).toBe(4);
    expect(caps.maxAo1).toBe(2);
    expect(caps.maxAo2).toBe(6);
    expect(caps.auditLine).toContain("Table A capped at 8/8");
    expect(caps.auditLine).toContain("Table B capped at 4/4");
    expect(caps.auditLine).toContain("Final marks: AO1 2, AO2 6, AO3 4.");
  });

  it("caps Table B at 2 for an unranked hedge conclusion", () => {
    const detectorResult: DetectorResult = {
      findings: [],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 2, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: false,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: true,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);

    expect(caps.tableACap).toBe(8);
    expect(caps.tableBCap).toBe(2);
    expect(caps.auditLine).toContain("Table B capped at 2/4 (Hedge conclusion with no ranking or conditions)");
    expect(caps.auditLine).toContain("Final marks: AO1 2, AO2 6, AO3 2.");
  });

  it("de-duplicates multiple absolute claims in the same paragraph into 1 error", () => {
    const multiClaimEssay =
      "An indirect tax is imposed on demerit goods.\n\n" +
      "This policy always works and guarantees that consumption drops. It completely corrects the market failure and ensures a surplus.\n\n" +
      "Consumers may instead switch to substitutes, which reduces consumption.\n\n" +
      "In conclusion, taxes are effective under specific conditions.";

    const detectorResult: DetectorResult = {
      findings: [
        {
          category: "absolute_claim",
          quote: "always works",
          correct_version: "Economic policies do not 'always' work due to unintended consequences.",
          severity: "major",
        },
        {
          category: "absolute_claim",
          quote: "guarantees that consumption drops",
          correct_version: "Policies cannot guarantee outcomes.",
          severity: "major",
        },
        {
          category: "absolute_claim",
          quote: "completely corrects the market failure",
          correct_version: "Tax cannot completely correct failure if demand is inelastic.",
          severity: "major",
        },
        {
          category: "absolute_claim",
          quote: "ensures a surplus",
          correct_version: "Revenue does not guarantee a surplus.",
          severity: "major",
        },
      ],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 2, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 3, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, multiClaimEssay);

    // All 4 absolute claims are in paragraph 1, so they MUST be de-duplicated to 1 major error!
    expect(caps.majorErrorCount).toBe(1);
    expect(caps.tableACap).toBe(7); // 1 error caps at 7
    expect(caps.auditLine).toContain("1 major error");
    expect(caps.auditLine).not.toContain("4 major errors");
  });

  it("merges findings that describe the same mistake for the same quote", () => {
    const essay =
      "Demerit goods have negative externalities in consumption.\n\n" +
      "Cigarettes are addictive, so demand is price inelastic. Therefore the tax is very effective.\n\n" +
      "Subsidies on substitutes would encourage clean alternatives.\n\n" +
      "Overall, taxes work best when demand is elastic.";

    const detectorResult: DetectorResult = {
      findings: [
        {
          category: "wrong_elasticity",
          quote: "demand is price inelastic. Therefore the tax is very effective",
          correct_version: "Inelastic demand means quantity falls proportionally less than price rises.",
          severity: "major",
        },
        {
          category: "wrong_elasticity",
          quote: "tax is very effective",
          correct_version: "Inelastic demand makes tax ineffective at cutting consumption.",
          severity: "major",
        },
      ],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 2, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 3, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essay);
    expect(caps.majorErrorCount).toBe(1);
    expect(caps.tableACap).toBe(7);
  });

  it("prevents repeated 'Question-fit failure: Question-fit failure:' in audit line", () => {
    const detectorResult: DetectorResult = {
      findings: [],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: false,
        states_which_is_better_or_when: false,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: true,
        reason: "Question-fit failure: Question-fit failure: Candidate does not compare alternatives on a criterion.",
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);
    expect(caps.auditLine).not.toContain("Question-fit failure: Question-fit failure:");
    expect(caps.auditLine).toContain("Question-fit failure: Candidate does not compare alternatives");
  });

  it("detects price control reversal, floor/ceiling confusion, and no negative effects contradiction", () => {
    const detectorResult: DetectorResult = {
      findings: [
        {
          category: "wrong_mechanism",
          quote: "minimum wage causes excess demand for labour",
          correct_version: "A minimum wage above equilibrium creates excess supply of labour (unemployment), not excess demand.",
          severity: "major",
        },
        {
          category: "wrong_mechanism",
          quote: "rent control is a price floor",
          correct_version: "Rent control is a price ceiling (set below equilibrium), not a price floor.",
          severity: "major",
        },
        {
          category: "contradiction",
          quote: "policy has no negative effects",
          correct_version: "Candidate claims policy has no negative effects, but later discusses regressive tax burdens.",
          severity: "major",
        },
      ],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 1, relevant: true, chain_status: "partial", has_major_error: true },
        { paragraph_index: 2, relevant: true, chain_status: "partial", has_major_error: true },
      ],
      question_fit: {
        is_comparative: false,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const essay =
      "A minimum wage causes excess demand for labour.\n\n" +
      "Furthermore, rent control is a price floor.\n\n" +
      "The policy has no negative effects, though it is regressive.";

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essay);
    expect(caps.majorErrorCount).toBe(3);
    expect(caps.tableACap).toBe(4);
    expect(caps.auditLine).toContain("excess demand/supply reversal at price control");
    expect(caps.auditLine).toContain("price floor/ceiling confusion");
    expect(caps.auditLine).toContain("contradiction regarding 'no negative effects'");
  });

  it("detects new traps: growth without real, trickle-down inequality, and wrong formula components", () => {
    const essayWithGrowthError = "Economic growth is defined as an increase in GDP over time.";
    const errors1 = detectEconomicErrors(essayWithGrowthError);
    expect(errors1.some((e: any) => e.id === "growth_definition_missing_real")).toBe(true);

    const essayWithLivingStandards = "We measure living standards solely by GDP per capita.";
    const errors2 = detectEconomicErrors(essayWithLivingStandards);
    expect(errors2.some((e: any) => e.id === "living_standards_income_only")).toBe(true);

    const essayWithTrickleDown = "Economic growth always reduces inequality because wealth trickles down.";
    const errors3 = detectEconomicErrors(essayWithTrickleDown);
    expect(errors3.some((e: any) => e.id === "trickle_down_inequality_claim")).toBe(true);

    const essayWithFormula = "Aggregate demand is calculated as AD = C + I + G + (X + M).";
    const errors4 = detectEconomicErrors(essayWithFormula);
    expect(errors4.some((e: any) => e.id === "wrong_formula_imports_added")).toBe(true);
  });

  it("caps Table A at 5 when fewer than 3 complete chains are found and states count in audit line", () => {
    const detectorResult: DetectorResult = {
      findings: [],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 2, relevant: true, chain_status: "asserted", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, question, essayText);
    expect(caps.majorErrorCount).toBe(0);
    expect(caps.tableACap).toBe(5);
    expect(caps.auditLine).toContain("2 complete chains found");
    expect(caps.auditLine).toContain("Table A capped at 5/8");
  });

  it("USER REAL ESSAY TEST: correctly awards top caps (8/8 Table A, 4/4 Table B) to a sound 10/12 merit goods essay", () => {
    const meritQuestion = "Assess whether a subsidy is likely to be the best method to increase the consumption of merit goods.";
    const meritEssay = `
      A subsidy is a financial grant given by the government to producers of a good to increase the quantity produced and to decrease the price at which it is sold. A merit good is a good that creates more positive externalities than what is internalised leading to underproduction if left to the free market.

      In a free market there is the existence of information failure which is a type of market failure means that consumers don't internalise all the benefits produced after consumption of merit goods. This in turn leads producers to decrease supply as there is a signal that demand is low for this good. This leads to underconsumption and underproduction of merit goods. Thus government intervention is needed to fix this market failure.

      By providing a per-unit subsidy to producers, production costs fall, causing the market supply curve to shift vertically downwards and rightwards. This lowers the equilibrium price from P1 to P2 and expands output from Q1 to Q2, moving consumption closer to the socially optimal equilibrium where marginal social benefit equals marginal social cost.

      However, subsidies carry an opportunity cost for government finances and depend heavily on price elasticity of demand. If demand is price inelastic, a large subsidy expenditure is required to generate only a modest expansion in consumption. Alternatively, the government could deploy public information and awareness campaigns to directly target information failure, though advertising involves significant time lags. State provision, such as free healthcare, ensures universal access regardless of income.

      In conclusion, a subsidy is effective at addressing price barriers in the short run, but it is not the decisive best method on its own. For long-term welfare gains, combining subsidies with education campaigns is superior because it simultaneously addresses both affordability and the underlying consumer information failure.
    `;

    // 1. Deterministic error detector should NOT flag standard merit good definitions or mechanisms
    const detectedErrors = detectEconomicErrors(meritEssay);
    expect(detectedErrors.length).toBe(0);

    // 2. Question-fit should pass because candidate discusses education, state provision, opportunity cost, and time lags
    const detectorResult: DetectorResult = {
      findings: [],
      paragraphs: [
        { paragraph_index: 0, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 1, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 2, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 3, relevant: true, chain_status: "complete", has_major_error: false },
        { paragraph_index: 4, relevant: true, chain_status: "complete", has_major_error: false },
      ],
      question_fit: {
        is_comparative: true,
        compares_with_alternative_on_criterion: true,
        states_which_is_better_or_when: true,
        is_to_what_extent: false,
        gives_degree_and_conditions: true,
        answers_different_question: false,
        is_hedge_conclusion: false,
        fails_question_fit: false,
      },
    };

    const caps = computeCapsFromDetector(detectorResult, 12, split, meritQuestion, meritEssay);
    expect(caps.majorErrorCount).toBe(0);
    expect(caps.hasDefinitionError).toBe(false);
    expect(caps.failsQuestionFit).toBe(false);
    expect(caps.tableACap).toBe(8);
    expect(caps.tableBCap).toBe(4);
    expect(caps.maxAo1).toBe(2);
    expect(caps.maxAo2).toBe(6);
    expect(caps.auditLine).toContain("Table A capped at 8/8");
    expect(caps.auditLine).toContain("Table B capped at 4/4");
    expect(caps.auditLine).toContain("Final marks: AO1 2, AO2 6, AO3 4.");
  });
});
