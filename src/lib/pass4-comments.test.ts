import { describe, expect, it } from "vitest";
import { generatePass4Comments } from "./pass4-comments";
import type { Grading } from "./examiner/types";

describe("generatePass4Comments", () => {
  const mockGrading: Grading = {
    total_mark: 10,
    max_mark: 12,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of maximum price." },
      analysis: { awarded: 5, out_of: 6, comment: "Detailed causal chain from price ceiling to shortage." },
      evaluation: { awarded: 3, out_of: 4, comment: "Balanced evaluation of consumer surplus vs black markets." },
    },
    examiner_summary: "A thorough response with strong economic intuition.",
    strengths: ["Clear diagrammatic positioning", "Detailed analysis of market equilibrium"],
    weaknesses: [
      "Diagram explanation lacks explicit labeling of the deadweight welfare loss triangle.",
      "Evaluation could be strengthened by examining long-run supply elasticity.",
    ],
    missing_elements: {
      definitions: [],
      analysis: ["Explicit step explaining producer surplus reduction."],
      evaluation: ["Long-run investment disincentives."],
      examples: [],
      diagrams: ["Deadweight loss triangle shading."],
    },
    actionable_feedback: [
      "Explicitly connect the curves shown on the diagram to deadweight loss.",
      "Weigh short-run affordability against long-run supply disincentives.",
    ],
    suggested_resources: [],
    suggested_practice: [],
    confidence: 0.95,
    audited: true,
    sources: [],
    anchorsUsed: 2,
  };

  const mockEssay = `A maximum price is a legally set price ceiling below the market equilibrium.

When the government imposes a maximum price at Pmax below Pe, quantity demanded extends to Qd while quantity supplied contracts to Qs.

(Diagram: Maximum Price)

This creates a persistent shortage equal to Qd - Qs.

However, price ceilings can lead to illegal black markets and reduced product quality over time.

In conclusion, maximum price controls will not always improve consumer welfare.`;

  it("decodes the diagram and generates a diagram integration comment", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, [
      { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
    ]);

    expect(comments.length).toBeGreaterThan(0);
    const diagramComment = comments.find((c) => c.category === "diagram");
    expect(diagramComment).toBeDefined();
    expect(diagramComment?.title).toContain("Maximum Price");
    expect(diagramComment?.color).toBe("emerald");
    expect(diagramComment?.highlightText).toBe("(Diagram: Maximum Price)");
  });

  it("maps analysis and evaluation weaknesses to corresponding paragraphs", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, [
      { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
    ]);

    const evalComment = comments.find((c) => c.category === "evaluation");
    expect(evalComment).toBeDefined();
    expect(evalComment?.color).toBe("sky");

    const analysisComment = comments.find((c) => c.category === "analysis");
    expect(analysisComment).toBeDefined();
    expect(analysisComment?.color).toBe("amber");
  });

  it("handles essays without diagrams and generates an omission recommendation", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, []);
    const diagramOmission = comments.find((c) => c.category === "diagram");
    expect(diagramOmission).toBeDefined();
    expect(diagramOmission?.badge).toBe("Diagram Gap");
  });
});
