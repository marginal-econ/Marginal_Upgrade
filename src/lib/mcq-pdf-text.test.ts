import { describe, expect, it } from "vitest";
import { extractQuestionStems, type PdfTextItem } from "./mcq-pdf-text";

describe("MCQ PDF Text Extraction & Page Mapping", () => {
  it("ignores cover / instructions pages completely (preventing false matches like 12 from 9708/12)", () => {
    const coverPageItems: PdfTextItem[] = [
      { str: "CAMBRIDGE INTERNATIONAL EXAMINATIONS", transform: [1, 0, 0, 1, 50, 800] },
      { str: "ECONOMICS", transform: [1, 0, 0, 1, 50, 750] },
      { str: "9708/12", transform: [1, 0, 0, 1, 150, 750] },
      { str: "READ THESE INSTRUCTIONS FIRST", transform: [1, 0, 0, 1, 50, 700] },
      {
        str: "There are thirty questions on this paper. Answer all questions.",
        transform: [1, 0, 0, 1, 50, 650],
      },
      { str: "12", transform: [1, 0, 0, 1, 50, 500] }, // Stray 12 token
    ];

    const stems = extractQuestionStems(coverPageItems);
    expect(stems).toEqual([]);
  });

  it("does not treat '12' inside '9708/12' or 'Paper 12' as question 12", () => {
    const pageWithVariantCode: PdfTextItem[] = [
      { str: "Paper", transform: [1, 0, 0, 1, 50, 800] },
      { str: "12", transform: [1, 0, 0, 1, 90, 800] },
      { str: "Multiple Choice", transform: [1, 0, 0, 1, 120, 800] },
      { str: "1", transform: [1, 0, 0, 1, 50, 600] },
      { str: "What is an advantage of a market economy?", transform: [1, 0, 0, 1, 80, 600] },
      { str: "A It ensures equality.", transform: [1, 0, 0, 1, 80, 550] },
    ];

    const stems = extractQuestionStems(pageWithVariantCode);
    const questionNumbers = stems.map((s) => s.number);
    expect(questionNumbers).toContain(1);
    expect(questionNumbers).not.toContain(12);
  });

  it("correctly extracts true Question 12 on a question page", () => {
    const questionPageItems: PdfTextItem[] = [
      { str: "11", transform: [1, 0, 0, 1, 50, 700] },
      { str: "Which policy shifts aggregate demand right?", transform: [1, 0, 0, 1, 80, 700] },
      { str: "12", transform: [1, 0, 0, 1, 50, 500] },
      {
        str: "In the diagram, what represents consumer surplus?",
        transform: [1, 0, 0, 1, 80, 500],
      },
    ];

    const stems = extractQuestionStems(questionPageItems);
    const questionNumbers = stems.map((s) => s.number);
    expect(questionNumbers).toContain(11);
    expect(questionNumbers).toContain(12);
  });
});
