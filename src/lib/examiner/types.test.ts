import { describe, expect, it } from "vitest";
import {
  normaliseGrading,
  detectEconomicErrors,
  detectComparativeAnalysis,
  detectHedgeConclusion,
} from "./types";

describe("normaliseGrading - Question Relevance and Zero-Mark Protection", () => {
  const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };

  it("FOOLPROOF TEST (User Screenshot Case): zeroes out marks when examiner comments confirm essay is off-topic", () => {
    // The exact feedback from the user's screenshot where AI gave 3/12 on subsidies for a free trade question
    const raw = {
      total_mark: 3,
      band: "Bottom band",
      ao_breakdown: {
        knowledge: {
          awarded: 0,
          out_of: 2,
          comment:
            "The essay does not address the question about free trade at all. Instead, it discusses subsidies, merit goods, and government intervention, which are unrelated to the topic of free trade. The definitions provided are accurate but entirely off-topic.",
        },
        analysis: {
          awarded: 1,
          out_of: 6,
          comment:
            "The essay contains no analysis of free trade or its consequences. The single mark is awarded for the correct description of a subsidy diagram, but this is irrelevant to the question. The analysis is entirely absent for the required topic.",
        },
        evaluation: {
          awarded: 2,
          out_of: 4,
          comment:
            "The essay attempts to evaluate government intervention strategies for merit goods, but this is unrelated to the question. However, these points do not address whether free trade consequences are always positive.",
        },
      },
      examiner_summary:
        "The candidate has written an essay on subsidies and merit goods rather than addressing the question on free trade.",
      strengths: ["Clear explanation of subsidy diagram."],
      weaknesses: ["Entirely off-topic."],
    };

    const normalised = normaliseGrading(raw, 12, split);

    // Marks must be completely clamped to 0
    expect(normalised.total_mark).toBe(0);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(0);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(0);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(0);
    expect(normalised.band).toBe("Bottom band");
    expect(normalised.unrelated_to_question).toBe(true);
  });

  it("zeroes out marks when raw.unrelated_to_question is explicitly true", () => {
    const raw = {
      total_mark: 4,
      unrelated_to_question: true,
      band: "Lower middle band",
      ao_breakdown: {
        knowledge: { awarded: 1, out_of: 2, comment: "Some knowledge." },
        analysis: { awarded: 2, out_of: 6, comment: "Some analysis." },
        evaluation: { awarded: 1, out_of: 4, comment: "Some evaluation." },
      },
    };

    const normalised = normaliseGrading(raw, 12, split);

    expect(normalised.total_mark).toBe(0);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(0);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(0);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(0);
    expect(normalised.band).toBe("Bottom band");
    expect(normalised.unrelated_to_question).toBe(true);
  });

  it("preserves legitimate marks on relevant essays", () => {
    const raw = {
      total_mark: 10,
      band: "Top band",
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment: "Accurate definitions of free trade and comparative advantage.",
        },
        analysis: {
          awarded: 5,
          out_of: 6,
          comment: "Clear causal chain showing how tariff elimination enhances consumer surplus.",
        },
        evaluation: {
          awarded: 3,
          out_of: 4,
          comment: "Well-balanced evaluation contrasting short-run adjustment costs with long-run efficiency gains.",
        },
      },
    };

    const normalised = normaliseGrading(raw, 12, split);

    expect(normalised.total_mark).toBe(10);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(5);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(3);
    expect(normalised.band).toBe("Top band");
    expect(normalised.unrelated_to_question).toBe(false);
  });

  it("CAMBRIDGE 4/12 BENCHMARK: clamps inflated 8/12 down to 4/12 on supply-side vs inflation essay", () => {
    const question = "Assess whether supply-side policy is the best method to reduce the rate of inflation.";
    const essayText = `Supply-side policies are policies aimed at increasing the aggregate supply of the economy. This involves retraining workers to increase their skills and qualifications to increase their employability, thus increasing their standard of living, causing economic growth. Inflation is essentially the rise in price level of an economy over a period of time.

Inflation rate is the percentage by which the inflation changes and can be classified into two types, there is creeping inflation and accelerating inflation. Creeping inflation is a very low rate of inflation and accelerating inflation is an extremely high growth rate of inflation. It is characterised by over a 50% increase in price level a month.

One type of supply-side policy is reformation of trade unions. This involves reducing the negotiating power trade unions have in bargaining for high wages, so that firms can instead employ a larger number of workers at a lower wage level. This helps prevent the wage-inflation spiral that occurs after workers press for higher wages leading to higher costs of production for the firm thus higher prices. So due to higher prices workers again press for higher wages which results in a spiral that leads to inflation. Thus prevents the rate of inflation from increasing to a certain extent.

Another supply-side policy is provision of education and training. This increases the skills thus productivity of each worker thus increasing the productive capacity of a firm leading to economic growth. This can lead to low export prices as increased productivity and efficiency lead to more competitive goods. This leads to lower import prices for trading countries, thus reducing their cost-push inflation leading to low rate of inflation for them. This may lead to a more favourable trading agreement for the exporting country, so cost-push inflation of exporting country also decreases. Reducing the rate of inflation. Furthermore this increase in aggregate supply means that demand-pull inflation will decrease as slowly equals AD.

Provision of increased health care will also lead to better living standard of consumers which will increase their productivity thus increasing aggregate supply, thereby controlling demand-pull inflation leading to low rate of inflation.

Overtime as skills and productivity of workers rise both AD and AS are more likely to stay in equilibrium which leads to a good rate of inflation aka ‘creeping inflation’. This low level of inflation is positive since it promises a good economic future.

However increased skills and qualification of workers may make them move out of the country in search of better employment opportunities or better living standards. This is called ‘brain drain’. This means those who are less skilled and qualified are left behind, meaning the home country’s workers still present in the country have low skill so low productive potential of firm. There will be a rise in cost of production due to mismatch between productivity and wage rate of workers leading to cost-push inflation which increases the rate of inflation.

Investing in technology and research and development as a form of supply side policy may exacerbate the rate of inflation in the short-run due to increased investment leading to rise in money supply without increasing aggregate supply to combat increase in aggregate demand. However in the long-run it will lead to development of better methods of production leading to increased quantity and quality of domestically produced goods. This increase in aggregate supply helps lower rate of inflation by lowering cost-push inflation.

In conclusion a mix of all the supply-side policies along with the implementation of contractionary demand side policies will help reduce the rate of inflation in both the short-run and the long-run. The government should analyse the situation of the economy and accordingly decide the magnitude of implementation of the supply-side and demand-side policies to ensure a low and stable rate of inflation. As a high rate of inflation causes uncertainty and instability in an economy which leads to low economic growth. However if only one supply-side policy had to be chosen it would be to improve the education and training of workers as it would help increase aggregate supply sustainably according to aggregate demand.`;

    // The raw model hallucinated 8/12 because of essay length and fluent vocabulary
    const inflatedRaw = {
      total_mark: 8,
      band: "Upper middle band",
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment: "Good knowledge of supply-side policies and inflation.",
        },
        analysis: {
          awarded: 4,
          out_of: 6,
          comment: "Detailed chains linking training and trade unions to cost reductions.",
        },
        evaluation: {
          awarded: 2,
          out_of: 4,
          comment: "Evaluation considers short run vs long run and concludes with a mix of policies.",
        },
      },
      examiner_summary: "The candidate demonstrates understanding of supply-side interventions.",
    };

    const normalised = normaliseGrading(inflatedRaw, 12, split, question, essayText);

    // Cambridge confirmed ground truth: Table A Level 2 bottom band (3/8: AO1 1/2, AO2 2/6), Table B (AO3: 1/4) -> Total 4/12!
    expect(normalised.total_mark).toBe(4);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(1);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(2);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(1);
    expect(normalised.band).toBe("Bottom band");
    expect(normalised.examiner_summary).toContain("Cambridge Senior Examiner Audit");
    expect(normalised.examiner_summary).toContain("Question-Fit Gate");
  });

  it("detects Cambridge theoretical error traps correctly", () => {
    const textWithErrors = `
      Accelerating inflation is characterised by over a 50% increase in price level a month.
      Furthermore increased investment leads to a rise in money supply.
      Demand-pull inflation will decrease as slowly equals AD.
    `;
    const errors = detectEconomicErrors(textWithErrors);
    expect(errors.some((e) => e.id === "hyperinflation")).toBe(true);
    expect(errors.some((e) => e.id === "investment_money_supply")).toBe(true);
    expect(errors.some((e) => e.id === "as_equals_ad")).toBe(true);
  });

  it("detects hedge conclusions without ranking", () => {
    const textWithHedge = `
      Some analysis here.
      In conclusion a mix of all the supply-side policies along with the implementation of contractionary demand side policies will help reduce the rate of inflation.
    `;
    const hedge = detectHedgeConclusion(textWithHedge);
    expect(hedge.isHedge).toBe(true);
    expect(hedge.matchedPhrase).toContain("mix of all");
  });

  describe("Table A Error Audit & Caps (Mandatory Order of Work)", () => {
    it("detects newly classified major error traps", () => {
      const text = `
        An indirect tax will shift the demand curve to the left.
        Furthermore inelastic demand makes a tax more effective at reducing consumption of demerit goods.
        This policy completely ensures the problem is solved.
      `;
      const errors = detectEconomicErrors(text);
      expect(errors.some((e) => e.id === "wrong_curve_shift" && e.severity === "major")).toBe(true);
      expect(errors.some((e) => e.id === "inelastic_tax_consumption" && e.severity === "major")).toBe(true);
      expect(errors.some((e) => e.id === "unsupported_absolutes" && e.severity === "major")).toBe(true);
    });

    it("caps Table A at max 7/8 for 1 major error and outputs senior examiner audit line", () => {
      const question = "Discuss whether indirect taxation is effective at reducing consumption of demerit goods.";
      const essay = `
        Demerit goods create negative externalities.
        An indirect tax will shift the demand curve to the left causing quantity to fall.
        However, consumers may still purchase the good if substitutes are unavailable.
        Therefore, while taxation reduces demand, it depends on consumer awareness.
      `;
      const raw = {
        total_mark: 11,
        band: "Top band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate knowledge." },
          analysis: { awarded: 6, out_of: 6, comment: "Detailed analysis." },
          evaluation: { awarded: 3, out_of: 4, comment: "Good evaluation." },
        },
        strengths: ["Clear analysis of tax shift", "Good structure"],
      };

      const res = normaliseGrading(raw, 12, split, question, essay);
      // 1 major error (tax shifting demand left): Table A (AO1+AO2) capped at max 7/8
      expect(res.ao_breakdown.knowledge.awarded + res.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(7);
      expect(res.examiner_summary).toContain("Cambridge Senior Examiner Audit: Table A Error Cap:");
      expect(res.examiner_summary).toContain("Question-fit: passed.");
      // Consistency rule: strengths mentioning the error must be removed
      expect(res.strengths.some((s) => s.includes("tax shift"))).toBe(false);
    });

    it("caps Table A at max 5/8 for 2 major errors", () => {
      const question = "Discuss whether indirect taxation is effective at reducing consumption of demerit goods.";
      const essay = `
        An indirect tax will shift the demand curve to the left.
        Furthermore inelastic demand makes a tax more effective at reducing consumption of cigarettes.
        In conclusion taxation is effective.
      `;
      const raw = {
        total_mark: 10,
        band: "Top band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Knowledge." },
          analysis: { awarded: 5, out_of: 6, comment: "Analysis." },
          evaluation: { awarded: 3, out_of: 4, comment: "Evaluation." },
        },
      };

      const res = normaliseGrading(raw, 12, split, question, essay);
      // 2 major errors: Table A capped at max 5/8
      expect(res.ao_breakdown.knowledge.awarded + res.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(5);
      expect(res.examiner_summary).toContain("Cambridge Senior Examiner Audit: Table A Error Cap:");
      expect(res.examiner_summary).toContain("5/8");
    });

    it("caps Table A at max 4/8 for 3+ major errors", () => {
      const question = "Discuss whether indirect taxation is effective at reducing consumption of demerit goods.";
      const essay = `
        Accelerating inflation is over 50% a month.
        An indirect tax will shift the demand curve to the left.
        Inelastic demand makes a tax more effective at reducing consumption.
        In conclusion taxation reduces consumption.
      `;
      const raw = {
        total_mark: 10,
        band: "Top band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Knowledge." },
          analysis: { awarded: 5, out_of: 6, comment: "Analysis." },
          evaluation: { awarded: 3, out_of: 4, comment: "Evaluation." },
        },
      };

      const res = normaliseGrading(raw, 12, split, question, essay);
      // 3 major errors: Table A capped at max 4/8
      expect(res.ao_breakdown.knowledge.awarded + res.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
      expect(res.examiner_summary).toContain("4/8");
    });

    it("caps Table A at max 4/8 for 1 major error plus failed question-fit", () => {
      const question = "Assess whether indirect taxation is the best method to reduce the consumption of demerit goods.";
      // Comparative question ("best method"), but essay only analyzes tax (no alternatives), plus wrong curve shift error
      const essay = `
        An indirect tax will shift the demand curve to the left.
        This increases prices and reduces quantity demanded.
        However, taxation may increase black market activity.
        Overall, taxation is very effective.
      `;
      const raw = {
        total_mark: 9,
        band: "Upper middle band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Knowledge." },
          analysis: { awarded: 4, out_of: 6, comment: "Analysis." },
          evaluation: { awarded: 3, out_of: 4, comment: "Evaluation." },
        },
        strengths: ["Solid understanding of taxation"],
      };

      const res = normaliseGrading(raw, 12, split, question, essay);
      // 1 major error + failed question-fit: Table A capped at max 4/8
      expect(res.ao_breakdown.knowledge.awarded + res.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
      expect(res.examiner_summary).toContain("Question-fit: failed.");
      // Consistency rule: "solid" sanitized to "developing"
      expect(res.strengths.some((s) => s.includes("Solid"))).toBe(false);
    });
  });
});
