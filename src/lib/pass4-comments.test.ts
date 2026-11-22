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

  it("does not treat 'acknowledge' as a knowledge/terminology weakness and avoids duplicate diagnostic sentences", () => {
    const duplicateBugGrading: Grading = {
      total_mark: 10,
      max_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate exchange rate definition." },
        analysis: { awarded: 5, out_of: 6, comment: "Detailed causal chain on depreciation." },
        evaluation: { awarded: 3, out_of: 4, comment: "Good discussion of J-curve effect." },
      },
      examiner_summary: "Strong candidate response.",
      strengths: ["Clear terminology"],
      weaknesses: [
        "The analysis of production capacity constraints could briefly acknowledge potential domestic demand-pull inflation risks if spare capacity is limited.",
      ],
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.95,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      `An exchange rate is the price of one currency in terms of another.\n\nA depreciation leads to cheaper exports.\n\nHowever, capacity constraints matter.`,
      "Assess the impact of currency depreciation [12]",
      duplicateBugGrading,
      [],
    );

    // Ensure no duplicate critique text across any comments
    const critiques = comments.map((c) => c.critique);
    const uniqueCritiques = new Set(critiques);
    expect(critiques.length).toBe(uniqueCritiques.size);

    // Verify 'acknowledge' was NOT falsely tagged as a terminology gap
    const knowledgeGap = comments.find((c) => c.category === "knowledge");
    expect(knowledgeGap).toBeUndefined();
  });

  it("relabels defect badges and softens suggestions for 12/12 exemplar scripts", () => {
    const fullMarksGrading: Grading = {
      total_mark: 12,
      max_mark: 12,
      band: "Band 1 / Level 3 Exemplar",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Flawless knowledge." },
        analysis: { awarded: 6, out_of: 6, comment: "Comprehensive causal chain." },
        evaluation: { awarded: 4, out_of: 4, comment: "Nuanced, contextual evaluation." },
      },
      examiner_summary: "Exemplar Cambridge 9708 script.",
      strengths: ["Thorough analysis", "Sharp evaluation"],
      weaknesses: ["Could briefly consider secondary international feedback loops."],
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: ["To push toward full marks, consider secondary feedback loops."],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.98,
      audited: true,
      sources: [],
      anchorsUsed: 3,
    };

    const comments = generatePass4Comments(
      `Definition paragraph.\n\nAnalysis paragraph with detailed mechanism.\n\nEvaluative weighing paragraph.`,
      "Evaluate policy [12]",
      fullMarksGrading,
      [],
    );

    for (const comment of comments) {
      expect(comment.badge).not.toMatch(/gap/i);
      expect(comment.suggestion).not.toMatch(/to push toward full marks/i);
      expect(comment.color).not.toBe("amber");
      expect(comment.color).not.toBe("rose");
    }
  });

  it("accurately labels J-Curve diagrams as inserts (e.g. after ¶4) and provides time vs current account balance advice", () => {
    const essayWithJCurve = `Paragraph 1: An exchange rate is the price of one currency in terms of another.

Paragraph 2: A depreciation lowers export prices in foreign currency terms.

Paragraph 3: However, in the short run, trade contracts are fixed.

Paragraph 4: Therefore, the import bill rises before demand can adjust.

(Diagram: The J-Curve)

Paragraph 5: In the long run, once consumers switch to domestic goods, the trade deficit reverses.`;

    const jCurveGrading: Grading = {
      total_mark: 10,
      max_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "" },
        analysis: { awarded: 5, out_of: 6, comment: "" },
        evaluation: { awarded: 3, out_of: 4, comment: "" },
      },
      examiner_summary: "Solid script.",
      strengths: [],
      weaknesses: [],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.9,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      essayWithJCurve,
      "Discuss whether currency depreciation improves the balance of payments [12]",
      jCurveGrading,
      [{ title: "The J-Curve", matchText: "(Diagram: The J-Curve)" }],
    );

    const diagramComment = comments.find((c) => c.category === "diagram");
    expect(diagramComment).toBeDefined();

    // Check paragraphLabel shows "Diagram (after ¶4)" instead of "Paragraph 5" or "Paragraph 6"
    expect(diagramComment?.paragraphLabel).toBe("Diagram (after ¶4)");

    // Check J-Curve syllabus-specific advice: must reference Current Account Balance / Time / Marshall-Lerner
    expect(diagramComment?.suggestion).toMatch(/current account/i);
    expect(diagramComment?.suggestion).toMatch(/time/i);
    expect(diagramComment?.suggestion).toMatch(/marshall/i);

    // Must NOT contain generic supply/demand price & quantity coordinate text
    expect(diagramComment?.critique).not.toMatch(/price and quantity coordinates/i);
    expect(diagramComment?.suggestion).not.toMatch(/price and quantity coordinates/i);
  });
});
