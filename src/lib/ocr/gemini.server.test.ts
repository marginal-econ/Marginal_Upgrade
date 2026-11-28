import { describe, it, expect } from "vitest";
import { isBlankOrUnread, needsMultimodalCorrection } from "./gemini.server";

describe("Handwriting OCR Validation & Blank Filter", () => {
  it("detects empty or null transcriptions as blank/unread", () => {
    expect(isBlankOrUnread(null)).toBe(true);
    expect(isBlankOrUnread(undefined)).toBe(true);
    expect(isBlankOrUnread("")).toBe(true);
    expect(isBlankOrUnread("   \n\t  ")).toBe(true);
  });

  it("detects blank page annotations from vision models", () => {
    expect(isBlankOrUnread("[Blank page]")).toBe(true);
    expect(isBlankOrUnread("[Blank page / no handwriting detected]")).toBe(true);
    expect(isBlankOrUnread("[blank page - unreadable]")).toBe(true);
  });

  it("detects 'nothing visible' or 'no handwriting' phrases that previously leaked into essays", () => {
    expect(isBlankOrUnread("nothing visible")).toBe(true);
    expect(isBlankOrUnread("nothing visible.")).toBe(true);
    expect(isBlankOrUnread("No handwriting detected.")).toBe(true);
    expect(isBlankOrUnread("no text found")).toBe(true);
    expect(isBlankOrUnread("no text visible.")).toBe(true);
    expect(isBlankOrUnread("unreadable page")).toBe(true);
    expect(isBlankOrUnread("blank")).toBe(true);
  });

  it("detects empty diagram tags with accuracy: nothing visible", () => {
    expect(
      isBlankOrUnread(
        "[DIAGRAM: unlabelled | axes: unlabelled | curves: none | labels: none | accuracy: nothing visible]",
      ),
    ).toBe(true);
  });

  it("confirms genuine student handwriting transcriptions are treated as valid", () => {
    const studentAnswer =
      "Fiscal policy involves the government manipulating taxation and government spending to influence aggregate demand.\n\n" +
      "An expansionary fiscal policy shifts AD to the right from AD1 to AD2, increasing real output from Y1 to Y2.";
    expect(isBlankOrUnread(studentAnswer)).toBe(false);
  });

  it("confirms student transcription containing inline economics diagrams is valid", () => {
    const answerWithDiagram =
      "Question 2(a)\n\n" +
      "A subsidy on agricultural goods shifts the supply curve downwards and to the right.\n\n" +
      "[DIAGRAM: Demand and Supply with specific subsidy | axes: Price / Quantity | curves: S1 shifts down to S2 | labels: P1, P2, Q1, Q2]\n\n" +
      "As shown in the diagram, consumer surplus increases from area A to area A+B.";
    expect(isBlankOrUnread(answerWithDiagram)).toBe(false);
    expect(needsMultimodalCorrection(answerWithDiagram)).toBe(true);
  });

  it("triggers Dual-VLM multimodal correction on [?] tokens, diagrams, and economics OCR garbles, but skips clean long prose", () => {
    expect(needsMultimodalCorrection("Fiscal policy raises [?] and shifts AD right across the whole economy in the short run, leading to higher output and employment over time.")).toBe(true);
    expect(needsMultimodalCorrection("Because LR4S is vertical at full employment, an increase in aggregate demand only causes demand-pull inflation with no real output expansion.")).toBe(true);
    const cleanLongEssay =
      "Monetary policy involves the central bank adjusting base interest rates or money supply to control inflation and influence aggregate demand. When interest rates increase, borrowing costs rise for households and firms, discouraging consumption and investment and shifting AD to the left from AD1 to AD2.";
    expect(needsMultimodalCorrection(cleanLongEssay)).toBe(false);
  });
});
