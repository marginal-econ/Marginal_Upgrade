import { describe, it, expect } from "vitest";
import { parsePaperQuestionsFromTexts } from "./paper-parser";

describe("parsePaperQuestionsFromTexts", () => {
  it("extracts structured questions, tariffs, and mark scheme guides from QP and MS texts", () => {
    const qpText = `
Cambridge International AS & A Level
ECONOMICS 9708/22
Paper 2 AS Level Data Response and Essays May/June 2024
Section A
1 (a) Explain what is meant by a negative externality of consumption. [4]
1 (b) With the help of an economic diagram, assess whether an indirect tax is an effective policy to eliminate market failure caused by negative externalities. [8]

Section B
2 Evaluate the view that maximum price legislation is always harmful to consumers. [20 marks]
3 Discuss whether supply-side policies are superior to demand-side policies in achieving economic growth. [20]
`;

    const msText = `
Cambridge International AS & A Level Economics 9708/22 Mark Scheme May/June 2024
Question 1(a):
Award 2 marks AO1 for definition of negative externality (spillover cost on third parties).
Award 2 marks AO2 for explaining consumption externality (MSB < MPB).

Question 1(b):
Award up to 2 marks AO1. Award up to 4 marks AO2 for analysis showing shift of MPC to MPC+tax with accurate diagram.
Award up to 2 marks AO3 for evaluation (price elasticity, tax evasion).

Question 2:
Award up to 4 marks AO1, up to 8 marks AO2 for maximum price below equilibrium creating shortage.
Award up to 8 marks AO3 for evaluation (black markets, rationing, equity benefits).

Question 3:
Award up to 4 marks AO1, up to 8 marks AO2, up to 8 marks AO3 for comparing LRAS shifts with AD shifts.
`;

    const questions = parsePaperQuestionsFromTexts(qpText, msText, "as", "22");

    expect(questions.length).toBeGreaterThanOrEqual(4);

    // Q1(a)
    const q1a = questions.find((q) => q.number === "1(a)");
    expect(q1a).toBeDefined();
    expect(q1a?.maxMark).toBe(4);
    expect(q1a?.tariff.ao1).toBe(2);
    expect(q1a?.tariff.ao2).toBe(2);
    expect(q1a?.hasDiagramRequirement).toBe(false);

    // Q1(b)
    const q1b = questions.find((q) => q.number === "1(b)");
    expect(q1b).toBeDefined();
    expect(q1b?.maxMark).toBe(8);
    expect(q1b?.hasDiagramRequirement).toBe(true);
    expect(q1b?.markingGuide).toContain("Question 1(b)");

    // Q2
    const q2 = questions.find((q) => q.number === "2");
    expect(q2).toBeDefined();
    expect(q2?.maxMark).toBe(20);
    expect(q2?.tariff.ao3).toBeGreaterThan(0);
  });

  it("falls back gracefully to standard Cambridge paper slots when PDF text has no regex matches", () => {
    const qpEmpty = "Scanned image only or non-standard text without explicit question numbering";
    const msEmpty = "General mark scheme overview without standard headers";

    const questions = parsePaperQuestionsFromTexts(qpEmpty, msEmpty, "as", "22");
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.some((q) => q.number === "1(a)")).toBe(true);
    expect(questions.some((q) => q.number === "1(b)")).toBe(true);
  });
});
