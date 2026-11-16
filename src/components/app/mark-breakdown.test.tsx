import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkBreakdown } from "./mark-breakdown";
import type { Grading } from "@/lib/examiner/types";

describe("MarkBreakdown dynamic full-mark headers", () => {
  const baseGrading: Grading = {
    total_mark: 8,
    max_mark: 8,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
      analysis: { awarded: 4, out_of: 4, comment: "Detailed causal chains." },
      evaluation: { awarded: 2, out_of: 2, comment: "Sound reasoned conclusion." },
    },
    examiner_summary: "Exceptional response fully addressing all aspects.",
    strengths: ["Clear definitions", "Step-by-step causal links"],
    weaknesses: ["Minor polish: could expand on long-run elasticity"],
    missing_elements: {
      definitions: [],
      analysis: [],
      evaluation: [],
      examples: ["Extended empirical examples"],
      diagrams: [],
    },
    actionable_feedback: ["Elaborate further on trade-offs"],
    suggested_resources: ["Cambridge 9708 Chapter 8: Price elasticity"],
    suggested_practice: ["Practice evaluating elasticity coefficients"],
    confidence: 0.98,
    anchorsUsed: 2,
    grounding_status: "grounded",
    sources: [],
    audited: true,
  };

  it("dynamically displays 'Optional Refinements' when score === max_mark (8/8)", () => {
    const markup = renderToStaticMarkup(<MarkBreakdown grading={baseGrading} />);

    // Must NOT contain "What cost you marks"
    expect(markup).not.toContain("What cost you marks");
    // Must NOT contain "How to elevate this answer to the next band"
    expect(markup).not.toContain("How to elevate this answer to the next band");

    // MUST contain "Optional Refinements"
    expect(markup).toContain("Optional Refinements");
  });

  it("displays 'What cost you marks' and 'How to elevate this answer to the next band' when score < max_mark", () => {
    const partialGrading: Grading = {
      ...baseGrading,
      total_mark: 5,
      max_mark: 8,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
        analysis: { awarded: 2, out_of: 4, comment: "Basic causal links." },
        evaluation: { awarded: 1, out_of: 2, comment: "Generic conclusion." },
      },
    };

    const markup = renderToStaticMarkup(<MarkBreakdown grading={partialGrading} />);

    expect(markup).toContain("What cost you marks");
    expect(markup).toContain("How to elevate this answer to the next band");
  });
});
