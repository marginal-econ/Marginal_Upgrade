import { describe, expect, it } from "vitest";
import { runNeuroSymbolicAudit } from "./causal-graph.server";
import { stripScoreFractionsFromText, type Grading } from "./types";
import { applyNeuroSymbolicGuardrail } from "./writing-quality.server";

const SPLIT_12 = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };

function make12mDraft(): Grading {
  return {
    total_mark: 10,
    max_mark: 12,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
      analysis: { awarded: 5, out_of: 6, comment: "Accurately describes subsidy incidence using PED." },
      evaluation: { awarded: 3, out_of: 4, comment: "Balanced evaluation." },
    },
    examiner_summary:
      "A strong answer with good depth, especially regarding subsidy incidence, resulting in a top-band score of 10/12.",
    strengths: [
      "Clear definition of merit goods.",
      "Insightful discussion of how demand elasticity affects subsidy incidence.",
      "Effective use of a labelled diagram.",
    ],
    weaknesses: ["Evaluation does not prioritise the dominant factor."],
    missing_elements: {
      definitions: [],
      analysis: [],
      evaluation: [],
      examples: [],
      diagrams: [],
    },
    actionable_feedback: ["Rank evaluative criteria in your conclusion."],
    suggested_resources: ["Chapter 3"],
    suggested_practice: ["Practice merit good evaluation"],
    confidence: 0.95,
    audited: true,
    sources: [],
    anchorsUsed: 1,
  };
}

describe("Neuro-Symbolic Causal Graph & Guardrails (V5)", () => {
  it("catches inverted subsidy PED incidence (Essay #4) and strips false praise + caps AO2", () => {
    const invertedText = `
      If demand is inelastic for merit goods like education is in developed economies, incidence of subsidies causes subsidies to benefit firms more.
      When demand is relatively inelastic, consumers are less responsive to the fall in price, so the price decreases by only a small amount.
      In contrast, when demand is relatively elastic, consumers respond more strongly to lower prices, causing a larger fall in the market price.
    `;
    const dossier = runNeuroSymbolicAudit(invertedText);
    const ruleIds = dossier.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("SUBSIDY_INCIDENCE_INELASTIC_INVERTED");
    expect(ruleIds).toContain("SUBSIDY_INCIDENCE_ELASTIC_INVERTED");

    const guarded = applyNeuroSymbolicGuardrail(make12mDraft(), dossier, 12, SPLIT_12);
    expect(guarded.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
    expect(guarded.total_mark).toBeLessThanOrEqual(9);
    expect(guarded.strengths.some((s) => /subsidy incidence/i.test(s))).toBe(false);
    expect(guarded.weaknesses.some((w) => /Inverted subsidy incidence/i.test(w))).toBe(true);
    expect(guarded.examiner_summary).not.toMatch(/score of\./i);
  });

  it("does NOT false-positive on valid subsidy or tax incidence explanations", () => {
    const validText = `
      When demand is relatively inelastic, a producer subsidy shifts supply down and causes a large fall in market price, so consumers capture a larger share of the subsidy.
      When supply is inelastic, producers cannot easily adjust production when an indirect tax is imposed, meaning sellers bear the vast majority of the tax burden.
    `;
    const dossier = runNeuroSymbolicAudit(validText);
    expect(dossier.violations).toEqual([]);
  });

  it("catches own-price rise shifting demand right, monopolistic competition efficiency errors, and public-good conflation", () => {
    const flawedText = `
      Public goods create a positive externality. For ex: The government provides more education.
      The consumers get discouraged to buy the product due to an increased price, due to which the demand shifts to the right side.
      Monopolistically competitive firms are usually price-takers and might be allocatively efficient (P=MC=AR) and productively efficient (lowest point of AC).
    `;
    const dossier = runNeuroSymbolicAudit(flawedText);
    const ids = dossier.violations.map((v) => v.ruleId);
    expect(ids).toContain("PUBLIC_VS_MERIT_GOOD_CONFLATION");
    expect(ids).toContain("PRICE_RISE_SHIFTS_DEMAND_RIGHT");
    expect(ids).toContain("MONOPOLISTIC_COMP_EFFICIENCY_ERROR");
    // Should not stamp K on "Cheaper merit goods means the demand..."
    const nonDef = runNeuroSymbolicAudit("Cheaper merit goods means the demand would rise faster than the quantity supplied.");
    expect(nonDef.rmAnnotations.some((a) => a.code === "K")).toBe(false);
  });

  it("strips score fractions without leaving dangling 'score of.' prose", () => {
    const cleaned = stripScoreFractionsFromText(
      "Evaluation is balanced, resulting in a top-band score of 10/12.",
    );
    expect(cleaned).not.toContain("10/12");
    expect(cleaned).not.toMatch(/score of\s*\./i);
  });
});
