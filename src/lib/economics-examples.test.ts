import { describe, expect, it } from "vitest";
import {
  ECONOMICS_EXAMPLES,
  EXAMPLE_SECTIONS,
  INTEGRATION_STEPS,
  matchExamplesToQuestion,
} from "./economics-examples";

describe("Cambridge 9708 Real-World Examples & Integration Bank", () => {
  it("contains rich, complete examples across all 3 syllabus sections", () => {
    expect(ECONOMICS_EXAMPLES.length).toBeGreaterThanOrEqual(20);
    expect(INTEGRATION_STEPS).toHaveLength(4);

    for (const sec of EXAMPLE_SECTIONS) {
      expect(ECONOMICS_EXAMPLES.some((e) => e.section === sec)).toBe(true);
    }

    for (const ex of ECONOMICS_EXAMPLES) {
      expect(ex.title.length).toBeGreaterThan(5);
      expect(ex.keyData.length).toBeGreaterThan(15);
      expect(ex.essayQuestions.length).toBeGreaterThanOrEqual(2);
      expect(ex.integrationChain.length).toBeGreaterThanOrEqual(2);
      expect(ex.weakMention.length).toBeGreaterThan(10);
      expect(ex.aStarIntegration.length).toBeGreaterThan(80);
      expect(ex.ao3Evaluation.length).toBeGreaterThan(40);
    }
  });

  it("ranks the best matching examples for pasted Cambridge essay prompts", () => {
    const tariffMatches = matchExamplesToQuestion(
      "Evaluate the impact of tariffs on domestic industries and consumers",
    );
    expect(tariffMatches[0]?.example.id).toBe("us-china-steel-ev-tariffs");

    const minWageMatches = matchExamplesToQuestion(
      "Assess whether a national minimum wage always causes unemployment in a monopsony",
    );
    expect(minWageMatches[0]?.example.id).toBe("uk-nlw-minimum-wage-monopsony");

    const inflationMatches = matchExamplesToQuestion(
      "Evaluate the effectiveness of monetary policy and interest rates in controlling inflation",
    );
    expect(inflationMatches.slice(0, 2).some((m) => m.example.id === "fed-boe-rate-hikes-monetary")).toBe(true);
  });
});
