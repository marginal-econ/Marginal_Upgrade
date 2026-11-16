import { describe, expect, it } from "vitest";
import {
  detectSyllabusErrors,
  SYLLABUS_ECONOMICS_ERRORS,
} from "./syllabus-errors";
import { normaliseGrading } from "./types";

describe("Authoritative Cambridge 9708 Syllabus Misconceptions Catalog", () => {
  it("contains all 22 distinct required error categories across Micro and Macro", () => {
    expect(SYLLABUS_ECONOMICS_ERRORS).toHaveLength(22);

    const ids = SYLLABUS_ECONOMICS_ERRORS.map((e) => e.id);
    expect(ids).toContain("movement_along_vs_shift");
    expect(ids).toContain("ped_vs_pes_confusion");
    expect(ids).toContain("yed_vs_xed_sign_confusion");
    expect(ids).toContain("price_controls_maximum_minimum");
    expect(ids).toContain("consumer_vs_producer_surplus");
    expect(ids).toContain("public_goods_vs_merit_goods");
    expect(ids).toContain("social_vs_external_cost_benefit");
    expect(ids).toContain("productive_vs_allocative_efficiency");
    expect(ids).toContain("economies_of_scale_vs_returns_to_scale");
    expect(ids).toContain("normal_vs_supernormal_profit");
    expect(ids).toContain("deflation_vs_disinflation");
    expect(ids).toContain("growth_vs_development");
    expect(ids).toContain("real_vs_nominal_variables");
    expect(ids).toContain("productivity_vs_production");
    expect(ids).toContain("budget_balance_vs_current_account");
    expect(ids).toContain("central_bank_vs_government_policy");
    expect(ids).toContain("quantitative_easing_mechanics");
    expect(ids).toContain("supply_side_policy_time_lags");
    expect(ids).toContain("depreciation_vs_devaluation");
    expect(ids).toContain("currency_depreciation_current_account");
    expect(ids).toContain("comparative_vs_absolute_advantage");
    expect(ids).toContain("tariffs_vs_quotas_revenue");
  });

  describe("Section 1: Microeconomics Misconception Detection", () => {
    it("detects 1.1 Movement along vs shift: price causes demand/supply to shift", () => {
      const essay = "When firms face higher costs, an increase in price causes demand to shift left.";
      const detected = detectSyllabusErrors(essay);
      expect(detected.some((d) => d.rule.id === "movement_along_vs_shift")).toBe(true);
    });

    it("does not falsely flag correct price extension statement", () => {
      const essay = "An increase in price leads to a contraction in quantity demanded along the curve.";
      const detected = detectSyllabusErrors(essay);
      expect(detected.some((d) => d.rule.id === "movement_along_vs_shift")).toBe(false);
    });

    it("detects 1.1 PED vs PES confusion: PES determined by brand loyalty or applying PED revenue rule to PES", () => {
      const essay1 = "The PES is determined by brand loyalty and consumer tastes.";
      expect(detectSyllabusErrors(essay1).some((d) => d.rule.id === "ped_vs_pes_confusion")).toBe(true);

      const essay2 = "When supply is elastic, an increase in price causes total revenue to fall.";
      expect(detectSyllabusErrors(essay2).some((d) => d.rule.id === "ped_vs_pes_confusion")).toBe(true);
    });

    it("detects 1.1 YED vs XED sign confusion: negative XED called inferior good or negative YED called complement", () => {
      const essay1 = "The good has a negative XED, showing it is an inferior good.";
      expect(detectSyllabusErrors(essay1).some((d) => d.rule.id === "yed_vs_xed_sign_confusion")).toBe(true);

      const essay2 = "Because it has a negative YED, it is a complement.";
      expect(detectSyllabusErrors(essay2).some((d) => d.rule.id === "yed_vs_xed_sign_confusion")).toBe(true);
    });

    it("detects 1.1 Price controls: maximum price set above equilibrium or minimum price set below equilibrium", () => {
      const essay1 = "To protect consumers, the maximum price is set above equilibrium.";
      expect(detectSyllabusErrors(essay1).some((d) => d.rule.id === "price_controls_maximum_minimum")).toBe(true);

      const essay2 = "The minimum price is imposed below equilibrium to support farmers.";
      expect(detectSyllabusErrors(essay2).some((d) => d.rule.id === "price_controls_maximum_minimum")).toBe(true);
    });

    it("detects 1.1 Consumer vs Producer Surplus: defined as extra money saved or incorrect geometric area", () => {
      const essay1 = "Consumer surplus is the extra money that consumers save when buying products.";
      expect(detectSyllabusErrors(essay1).some((d) => d.rule.id === "consumer_vs_producer_surplus")).toBe(true);

      const essay2 = "Consumer surplus is the area above the demand curve.";
      expect(detectSyllabusErrors(essay2).some((d) => d.rule.id === "consumer_vs_producer_surplus")).toBe(true);
    });

    it("detects 1.2 Public goods vs Merit goods: healthcare, education, transport called public goods", () => {
      const essay = "Governments must provide healthcare and education because healthcare is a public good.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "public_goods_vs_merit_goods")).toBe(true);
    });

    it("does not falsely flag street lighting or national defense as public goods", () => {
      const essay = "Street lighting is a pure public good because it is non-rival and non-excludable.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "public_goods_vs_merit_goods")).toBe(false);
    });

    it("detects 1.2 Social cost vs External cost: Social Cost = External Cost", () => {
      const essay = "Due to pollution, social cost is equal to external cost.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "social_vs_external_cost_benefit")).toBe(true);
    });

    it("detects 1.2 Productive vs Allocative efficiency: inverting definitions", () => {
      const essay1 = "The monopoly is allocatively efficient because it minimizes average costs.";
      expect(detectSyllabusErrors(essay1).some((d) => d.rule.id === "productive_vs_allocative_efficiency")).toBe(true);

      const essay2 = "A competitive firm is productively efficient because price equals marginal cost.";
      expect(detectSyllabusErrors(essay2).some((d) => d.rule.id === "productive_vs_allocative_efficiency")).toBe(true);
    });

    it("detects 1.2 Economies of scale vs Increasing returns to scale: equating concepts", () => {
      const essay = "Economies of scale is the same as increasing returns to scale in production.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "economies_of_scale_vs_returns_to_scale")).toBe(true);
    });

    it("detects 1.2 Normal profit vs Supernormal profit: zero accounting profit or shutdown", () => {
      const essay = "Normal profit means zero accounting profit for the business.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "normal_vs_supernormal_profit")).toBe(true);
    });
  });

  describe("Section 2: Macroeconomics Misconception Detection", () => {
    it("detects 2.1 Deflation vs Disinflation: inflation drop labeled deflation", () => {
      const essay = "A fall in the inflation rate from 6% to 2% is deflation.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "deflation_vs_disinflation")).toBe(true);
    });

    it("detects 2.1 Growth vs Development: Real GDP growth proves development", () => {
      const essay = "An increase in real GDP guarantees economic development for all citizens.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "growth_vs_development")).toBe(true);
    });

    it("detects 2.1 Real vs Nominal variables: nominal adjusted for inflation", () => {
      const essay = "Nominal wages is adjusted for inflation to show buying power.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "real_vs_nominal_variables")).toBe(true);
    });

    it("detects 2.1 Productivity vs Production: output increase equated to productivity increase", () => {
      const essay = "Total output increased, so productivity increased across the economy.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "productivity_vs_production")).toBe(true);
    });

    it("detects 2.2 Budget balance vs Current account balance: trade deficit called budget deficit", () => {
      const essay = "A budget deficit means imports exceed exports in international trade.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "budget_balance_vs_current_account")).toBe(true);
    });

    it("detects 2.2 Central bank vs Government policy control: attributing monetary to government", () => {
      const essay = "The government raises interest rates to combat rising inflation.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "central_bank_vs_government_policy")).toBe(true);
    });

    it("detects 2.2 QE mechanics: central bank printing physical banknotes", () => {
      const essay = "Quantitative easing is simply printing more physical banknotes.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "quantitative_easing_mechanics")).toBe(true);
    });

    it("detects 2.2 Supply-side time lags: supply-side as immediate fix for recession", () => {
      const essay = "Supply-side policies are the quickest solution to cure an immediate recession.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "supply_side_policy_time_lags")).toBe(true);
    });

    it("detects 2.3 Depreciation vs Devaluation: devalued under floating exchange rate", () => {
      const essay = "The pound devalued under a floating exchange rate against the dollar.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "depreciation_vs_devaluation")).toBe(true);
    });

    it("detects 2.3 Currency depreciation on Current Account: automatically worsens deficit", () => {
      const essay = "Depreciation makes imports more expensive, so it automatically worsens the current account.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "currency_depreciation_current_account")).toBe(true);
    });

    it("detects 2.3 Comparative vs Absolute advantage: produce cheapest", () => {
      const essay = "Countries should export the goods they can produce cheapest.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "comparative_vs_absolute_advantage")).toBe(true);
    });

    it("detects 2.3 Tariffs vs Quotas: quotas generate tax revenue", () => {
      const essay = "Import quotas generate tax revenue for the domestic government.";
      expect(detectSyllabusErrors(essay).some((d) => d.rule.id === "tariffs_vs_quotas_revenue")).toBe(true);
    });
  });

  describe("Integration into Grading Engine & Penalisation", () => {
    it("penalises marks and populates flagged_errors when an error is present (12-mark essay)", () => {
      const rawModelOutput = {
        total_mark: 12,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Precise definitions." },
          analysis: { awarded: 6, out_of: 6, comment: "Thorough causal mechanisms." },
          evaluation: { awarded: 4, out_of: 4, comment: "Critical evaluation." },
        },
        strengths: ["Strong analysis of market adjustments."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: [],
        suggested_resources: [],
        suggested_practice: [],
        confidence: 0.95,
      };

      const essayWithErrors =
        "In this essay, healthcare is a public good because the government provides it. An increase in price causes demand to shift left. Overall, this demonstrates market dynamics.";

      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const graded = normaliseGrading(rawModelOutput, 12, split, essayWithErrors);

      // Should have flagged errors
      expect(graded.flagged_errors).toBeDefined();
      expect(graded.flagged_errors!.length).toBeGreaterThanOrEqual(2);
      expect(graded.flagged_errors!.some((e) => e.id === "public_goods_vs_merit_goods")).toBe(true);
      expect(graded.flagged_errors!.some((e) => e.id === "movement_along_vs_shift")).toBe(true);

      // Marks should be penalized: AO1 and AO2 deducted
      expect(graded.ao_breakdown.knowledge.awarded).toBeLessThan(2);
      expect(graded.ao_breakdown.analysis.awarded).toBeLessThan(6);
      expect(graded.total_mark).toBeLessThan(12);

      // Band cannot be Top Band when fundamental errors exist
      expect(graded.band).not.toBe("Top Band");

      // Weaknesses must explicitly inform the student
      expect(graded.weaknesses.some((w) => w.includes("Economic Misconception"))).toBe(true);
      expect(graded.actionable_feedback.some((f) => f.includes("Correct syllabus understanding"))).toBe(true);
    });

    it("preserves exact full marks and leaves flagged_errors undefined when NO misconceptions are present", () => {
      const rawModelOutput = {
        total_mark: 12,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Precise definitions." },
          analysis: { awarded: 6, out_of: 6, comment: "Thorough causal mechanisms." },
          evaluation: { awarded: 4, out_of: 4, comment: "Critical evaluation." },
        },
        strengths: ["Accurate economic concepts applied throughout."],
        weaknesses: ["Expand real-world examples in extended paragraphs."],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Deepen long-run considerations."],
        suggested_resources: ["Cambridge 9708 Chapter 8"],
        suggested_practice: ["Evaluate pricing strategies."],
        confidence: 0.95,
      };

      const cleanEssay =
        "Healthcare is a merit good under-consumed due to information failure and positive externalities. When price changes, quantity demanded extends or contracts along the demand curve.";

      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const graded = normaliseGrading(rawModelOutput, 12, split, cleanEssay);

      expect(graded.flagged_errors).toBeUndefined();
      expect(graded.total_mark).toBe(12);
      expect(graded.band).toBe("Top Band");
      expect(graded.ao_breakdown.knowledge.awarded).toBe(2);
      expect(graded.ao_breakdown.analysis.awarded).toBe(6);
      expect(graded.ao_breakdown.evaluation.awarded).toBe(4);
    });

    it("operates accurately on 8-mark legacy non-evaluative essays", () => {
      const rawModelOutput = {
        total_mark: 8,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Definitions." },
          analysis: { awarded: 6, out_of: 6, comment: "Analysis." },
          evaluation: { awarded: 0, out_of: 0, comment: "Evaluation is not required." },
        },
        strengths: ["Sound explanation."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: [],
        suggested_resources: [],
        suggested_practice: [],
        confidence: 0.95,
      };

      const essay = "Import quotas generate tax revenue for the domestic government.";
      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 };
      const graded = normaliseGrading(rawModelOutput, 8, split, essay);

      expect(graded.flagged_errors).toBeDefined();
      expect(graded.flagged_errors![0].id).toBe("tariffs_vs_quotas_revenue");
      expect(graded.ao_breakdown.knowledge.awarded).toBeLessThan(2);
      expect(graded.total_mark).toBeLessThan(8);
    });

    it("operates accurately on 20-mark A Level Paper 4 essays", () => {
      const rawModelOutput = {
        total_mark: 20,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Definitions." },
          analysis: { awarded: 12, out_of: 12, comment: "Full chains." },
          evaluation: { awarded: 6, out_of: 6, comment: "Synoptic evaluation." },
        },
        strengths: ["Thorough analysis."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: [],
        suggested_resources: [],
        suggested_practice: [],
        confidence: 0.95,
      };

      const essay = "Firms will shut down when earning normal profit in long-run equilibrium.";
      const split = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
      const graded = normaliseGrading(rawModelOutput, 20, split, essay);

      expect(graded.flagged_errors).toBeDefined();
      expect(graded.flagged_errors![0].id).toBe("normal_vs_supernormal_profit");
      expect(graded.ao_breakdown.knowledge.awarded).toBeLessThan(2);
      expect(graded.total_mark).toBeLessThan(20);
      expect(graded.band).toBe("Upper Middle Band");
    });

    it("purges hallucinated 'embargoes generate revenue' accusation and restores deducted mark to full 12/12 Top Band", () => {
      // The exact scenario reported by the user:
      // The student wrote about tariffs generating revenue and discussed embargoes as an alternative,
      // but NEVER claimed embargoes generate revenue. The AI model hallucinated the claim and docked 1 mark in AO2.
      const essayText = `
        Tariffs are customs duties placed on imported goods that raise the price of foreign goods and reduce dumping.
        When tariffs are imposed, import expenditure falls, domestic producers are protected, and the government collects substantial tax revenue.
        Alternative protectionist policies include quotas and embargoes. An embargo acts as a physical ban on imports from a specific nation.
        In evaluation, the effectiveness of tariffs depends on price elasticity of demand and whether trading partners retaliate.
      `;

      // Mock raw output produced by an over-zealous LLM pass
      const hallucinatedRawOutput = {
        total_mark: 11,
        max_mark: 12,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "The candidate demonstrates accurate definitions of tariffs." },
          analysis: {
            awarded: 5,
            out_of: 6,
            comment:
              "The analysis is well-developed. However, the discussion of embargoes generating government revenue is incorrect (embargoes do not generate revenue; only tariffs do). This misconception deducts 1 mark in AO2 for theoretical mechanism error. Additionally, the analysis could better distinguish between short-run and long-run effects.",
          },
          evaluation: { awarded: 4, out_of: 4, comment: "Balanced evaluation considering PED and retaliation." },
        },
        examiner_summary:
          "This is a strong 12-mark essay. However, a 1-mark deduction in AO2 is applied for the incorrect claim that embargoes generate government revenue (only tariffs do). While the essay meets high standards, minor refinements would elevate it to Top Band.",
        strengths: ["Clear explanation of tariffs raising prices and collecting government revenue."],
        weaknesses: [
          "The candidate incorrectly states that embargoes generate government revenue, which is false (only tariffs generate revenue). This is a 1-mark AO2 deduction for theoretical mechanism error. Embargoes are quantitative restrictions that do not yield tax revenue for the government.",
          "The analysis does not explicitly distinguish between short-run and long-run effects of tariffs on the current account deficit.",
        ],
        actionable_feedback: [
          "Correct the misconception that embargoes generate government revenue. Only tariffs (customs duties) generate tax revenue for the government. Revise this point to clarify the distinction.",
          "Explicitly distinguish between short-run and long-run effects of tariffs in your analysis.",
        ],
        suggested_resources: ["Cambridge 9708 Chapter 29: Protectionist policies"],
        suggested_practice: ["Practice evaluating tariffs vs quotas"],
        confidence: 0.98,
      };

      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const normalized = normaliseGrading(hallucinatedRawOutput, 12, split, essayText);

      // 1. Hallucinated misconception must be completely purged
      expect(normalized.flagged_errors).toBeUndefined();
      expect(normalized.weaknesses.some((w) => w.toLowerCase().includes("embargoes generate"))).toBe(false);
      expect(normalized.actionable_feedback.some((f) => f.toLowerCase().includes("embargoes generate"))).toBe(false);
      expect(normalized.ao_breakdown.analysis.comment).not.toContain("embargoes generating government revenue is incorrect");
      expect(normalized.examiner_summary).not.toContain("incorrect claim that embargoes generate government revenue");

      // 2. The 1 mark wrongfully deducted in AO2 must be restored!
      expect(normalized.ao_breakdown.analysis.awarded).toBe(6);
      expect(normalized.total_mark).toBe(12);
      expect(normalized.band).toBe("Top Band");
      expect(normalized.examiner_summary).not.toContain("would elevate it to Top Band");
    });
  });
});
