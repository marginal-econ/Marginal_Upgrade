import { describe, expect, it } from "vitest";

import { extractMarksFromText, splitQuestionAndEssay } from "./essay-document-import";

describe("extractMarksFromText", () => {
  it("detects 8, 12, and 20 mark tags from brackets, parens, and prose", () => {
    expect(extractMarksFromText("Discuss whether monetary policy works [12]")).toBe(12);
    expect(extractMarksFromText("Evaluate supply-side policies (20 marks)")).toBe(20);
    expect(extractMarksFromText("Explain consumer surplus. 8 marks")).toBe(8);
    expect(extractMarksFromText("General essay without marks")).toBeNull();
  });
});

describe("splitQuestionAndEssay", () => {
  it("extracts explicit Question: header, mark tariff, and keeps diagram slots intact", () => {
    const doc = [
      "Name: Aarav Sharma",
      "Question: Discuss whether a depreciation of the exchange rate will always improve the current account balance. [12]",
      "A depreciation lowers the foreign-currency price of exports and raises the domestic price of imports.",
      "[[DOC_DIAGRAM_0]]",
      "However, the Marshall-Lerner condition states that the current account only improves in the long run if PEDx + PEDm > 1.",
    ].join("\n\n");

    const res = splitQuestionAndEssay(doc);
    expect(res.question).toBe(
      "Discuss whether a depreciation of the exchange rate will always improve the current account balance.",
    );
    expect(res.detectedMarks).toBe(12);
    expect(res.essayText).toContain("[[DOC_DIAGRAM_0]]");
    expect(res.essayText).not.toContain("Question:");
  });

  it("extracts a Cambridge command-word first paragraph separated by single or double newline", () => {
    const doc = [
      "Evaluate the effectiveness of monetary policy in reducing demand-pull inflation (20 marks)",
      "Monetary policy involves the central bank adjusting interest rates and money supply to influence aggregate demand. When inflation rises above target, higher interest rates increase the cost of borrowing and raise the incentive to save.",
      "Nevertheless, monetary policy operates with significant time lags of 12 to 18 months and may be less effective if inflation is primarily cost-push.",
    ].join("\n\n");

    const res = splitQuestionAndEssay(doc);
    expect(res.question).toBe(
      "Evaluate the effectiveness of monetary policy in reducing demand-pull inflation",
    );
    expect(res.detectedMarks).toBe(20);
    expect(res.essayText).toMatch(/^Monetary policy involves/);
  });

  it("does not falsely strip the first paragraph when the document starts directly with the essay", () => {
    const doc = [
      "Inflation is a sustained increase in the general price level over a period of time, reducing the purchasing power of money.",
      "Central banks may raise interest rates to curb excess aggregate demand, shifting AD left from AD1 to AD2 and easing inflationary pressure.",
    ].join("\n\n");

    const res = splitQuestionAndEssay(doc);
    expect(res.question).toBeNull();
    expect(res.essayText).toContain("Inflation is a sustained increase");
  });
});
