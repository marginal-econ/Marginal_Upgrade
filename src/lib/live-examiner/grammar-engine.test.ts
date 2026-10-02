import { describe, expect, it } from "vitest";
import { analyzeGrammarAndMechanics, CAMBRIDGE_ECONOMICS_WHITELIST } from "./grammar-engine";

describe("Grammar and Mechanics Engine", () => {
  describe("Layer 1: Mechanics and Subject-Verb Agreement", () => {
    it("detects and corrects repeated words", () => {
      const sentence = "The inflation rate in in the economy increased.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const repeated = results.find((r) => r.ruleId === "repeated_words");
      expect(repeated).toBeDefined();
      expect(repeated?.original).toBe("in in");
      expect(repeated?.suggestion).toBe("in");
      expect(repeated?.category).toBe("grammar");
    });

    it("detects singular collective subject 'the government are'", () => {
      const sentence = "The government are implementing expansionary fiscal policy.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const govIssue = results.find((r) => r.ruleId === "sv_government_plural");
      expect(govIssue).toBeDefined();
      expect(govIssue?.suggestion).toBe("the government is");
    });

    it("detects plural subject disagreement 'consumers has'", () => {
      const sentence = "When real wages rise, consumers has more disposable income.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const svIssue = results.find((r) => r.ruleId === "sv_consumers_has");
      expect(svIssue).toBeDefined();
      expect(svIssue?.suggestion).toBe("consumers have");
    });

    it("corrects modal verb inflection 'will causes'", () => {
      const sentence = "A tariff will causes import prices to rise.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const modalIssue = results.find((r) => r.ruleId === "modal_verb_inflection");
      expect(modalIssue).toBeDefined();
      expect(modalIssue?.suggestion).toBe("will cause");
    });

    it("corrects article before vowel sound 'a economy'", () => {
      const sentence = "This policy affects a economy negatively.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const articleIssue = results.find((r) => r.ruleId === "article_vowel_sound");
      expect(articleIssue).toBeDefined();
      expect(articleIssue?.suggestion).toBe("an economy");
    });
  });

  describe("Layer 2: Sentence Construction, Redundancy and Clarity", () => {
    it("streamlines 'due to the fact that' to 'because'", () => {
      const sentence = "Aggregate demand fell due to the fact that consumer confidence collapsed.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const redundancyIssue = results.find((r) => r.ruleId === "redundancy_due_to_the_fact");
      expect(redundancyIssue).toBeDefined();
      expect(redundancyIssue?.suggestion).toBe("because");
      expect(redundancyIssue?.category).toBe("clarity");
    });

    it("streamlines 'in order to' to 'to'", () => {
      const sentence = "The central bank raised rates in order to curb inflation.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const inOrderTo = results.find((r) => r.ruleId === "redundancy_in_order_to");
      expect(inOrderTo).toBeDefined();
      expect(inOrderTo?.suggestion).toBe("to");
    });

    it("streamlines 'take into consideration' to 'consider'", () => {
      const sentence = "Policymakers must take into consideration the opportunity cost.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const considerIssue = results.find((r) => r.ruleId === "redundancy_take_into_consideration");
      expect(considerIssue).toBeDefined();
      expect(considerIssue?.suggestion).toBe("consider");
    });
  });

  describe("Layer 3: Academic Tone and Precision", () => {
    it("flags informal 'a lot of' and offers academic alternative", () => {
      const sentence = "The subsidy created a lot of employment in the region.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const toneIssue = results.find((r) => r.ruleId === "academic_tone_a_lot_of");
      expect(toneIssue).toBeDefined();
      expect(toneIssue?.category).toBe("clarity");
    });

    it("replaces colloquial 'money printing' with 'quantitative easing'", () => {
      const sentence = "The central bank engaged in money printing during the crisis.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const termIssue = results.find((r) => r.ruleId === "academic_tone_money_printing");
      expect(termIssue).toBeDefined();
      expect(termIssue?.suggestion).toBe("quantitative easing");
      expect(termIssue?.category).toBe("terminology");
    });
  });

  describe("Layer 4: Economic Misconceptions", () => {
    it("flags shift vs movement on demand curve", () => {
      const sentence = "Demand increased because the price fell in the market.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const shiftIssue = results.find((r) => r.ruleId === "misconception_shift_vs_movement_demand");
      expect(shiftIssue).toBeDefined();
      expect(shiftIssue?.category).toBe("misconception");
      expect(shiftIssue?.severity).toBe("high");
      expect(shiftIssue?.evidence).toBeDefined();
    });

    it("flags fiscal policy adjusting interest rates", () => {
      const sentence = "To control inflation, fiscal policy raised interest rates.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const fiscalIssue = results.find((r) => r.ruleId === "misconception_fiscal_interest_rates");
      expect(fiscalIssue).toBeDefined();
      expect(fiscalIssue?.category).toBe("misconception");
      expect(fiscalIssue?.suggestion).toContain("monetary policy");
    });

    it("flags classifying health and education as public goods", () => {
      const sentence = "The government provides public goods such as healthcare and schools.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const publicGoodIssue = results.find((r) => r.ruleId === "misconception_public_vs_merit_health");
      expect(publicGoodIssue).toBeDefined();
      expect(publicGoodIssue?.category).toBe("misconception");
      expect(publicGoodIssue?.suggestion).toContain("merit goods");
    });

    it("flags confusing deflation with disinflation", () => {
      const sentence = "Deflation means prices are rising slower than last month.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const deflationIssue = results.find((r) => r.ruleId === "misconception_deflation_vs_disinflation");
      expect(deflationIssue).toBeDefined();
      expect(deflationIssue?.category).toBe("misconception");
      expect(deflationIssue?.suggestion).toContain("disinflation");
    });
  });

  describe("False-Positive Protection & Whitelist", () => {
    it("verifies Latin economic terms are present in the whitelist", () => {
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("ceteris paribus")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("per capita")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("ex ante")).toBe(true);
    });

    it("verifies specialized Cambridge terms are present in whitelist", () => {
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("diseconomies of scale")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("merit goods")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("marshall-lerner")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("phillips curve")).toBe(true);
    });
  });
});
