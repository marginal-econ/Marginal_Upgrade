import { describe, expect, it } from "vitest";
import { OffSyllabusError, validateEconomicsSyllabus } from "./syllabus-guard.server";

describe("validateEconomicsSyllabus", () => {
  it("approves authentic Cambridge 9708 Economics questions via high-confidence fast heuristics", async () => {
    const questions = [
      "Assess whether the potential benefits of an increasing rate of inflation outweigh the potential costs for an economy.",
      "With the help of a formula, explain the meaning of income elasticity of demand and consider the extent to which a rise in income will increase the consumption of all goods and services.",
      "Explain what is meant by aggregate supply and explain one reason why the aggregate supply curve of an economy would shift outwards.",
      "Assess whether fixing a minimum price is likely to be the best policy to reduce the consumption of a demerit good.",
      "Discuss whether reducing inflation should always be the main objective of government macroeconomic policy.",
      "With the help of a demand and supply diagram, explain how the introduction of an effective maximum price affects the equilibrium in the market.",
      "Discuss the usefulness to businesses of a knowledge of price elasticity of demand and income elasticity of demand (12 marks)",
    ];

    for (const q of questions) {
      const res = await validateEconomicsSyllabus(q);
      expect(res.isEconomics).toBe(true);
      expect(res.detectedSubject).toContain("Economics");
    }
  });

  it("immediately rejects Cambridge 9990 Psychology questions with OffSyllabusError", async () => {
    const psychQuestion =
      "Mary is conducting a case study on a boy diagnosed with an autistic spectrum disorder. He produces many detailed doodles and Mary wants to learn about him and his doodling.";

    await expect(validateEconomicsSyllabus(psychQuestion)).rejects.toThrow(OffSyllabusError);

    try {
      await validateEconomicsSyllabus(psychQuestion);
    } catch (err) {
      expect(err).toBeInstanceOf(OffSyllabusError);
      const offErr = err as OffSyllabusError;
      expect(offErr.detectedSubject).toContain("Psychology");
      expect(offErr.message).toContain("Psychology");
      expect(offErr.message).toContain("9708");
    }
  });

  it("immediately rejects Cambridge 9700 Biology questions", async () => {
    const bioQuestion = "Explain the process of photosynthesis in chloroplasts and how light intensity affects rate.";
    await expect(validateEconomicsSyllabus(bioQuestion)).rejects.toThrow(OffSyllabusError);
  });

  it("immediately rejects Cambridge 9695 Literature questions", async () => {
    const litQuestion = "Discuss how Shakespeare presents guilt in Macbeth through the soliloquy.";
    await expect(validateEconomicsSyllabus(litQuestion)).rejects.toThrow(OffSyllabusError);
  });

  it("rejects questions that are too short", async () => {
    await expect(validateEconomicsSyllabus("hello")).rejects.toThrow(
      "Question is too short to evaluate",
    );
  });
});
