import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GradedReviewWorkspace } from "./graded-review-workspace";
import { parseParagraphBlocks } from "@/lib/essay-paragraphs";
import type { Grading } from "@/lib/examiner/types";

describe("GradedReviewWorkspace", () => {
  const essay = [
    "A maximum price is a legally set ceiling below market equilibrium.",
    "(Diagram: Maximum Price)",
    "When the price ceiling is imposed, demand exceeds supply creating a shortage.",
    "However, black markets may emerge over time if enforcement is weak.",
  ].join("\n\n");

  const blocks = parseParagraphBlocks(essay, [
    { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
  ]);

  const grading: Grading = {
    total_mark: 9,
    max_mark: 12,
    band: "Upper Middle Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Clear definition of price ceiling." },
      analysis: { awarded: 5, out_of: 6, comment: "Solid shortage mechanism and diagram integration." },
      evaluation: { awarded: 2, out_of: 4, comment: "Black market trade-off noted; expand elasticity." },
    },
    examiner_summary: "Sound explanation of maximum price mechanics with credible evaluation.",
    strengths: ["Accurate equilibrium analysis", "Clear diagram reference"],
    weaknesses: ["Elasticity conditions under-developed"],
    missing_elements: {
      definitions: [],
      analysis: ["Producer surplus contraction"],
      evaluation: ["Short-run vs long-run supply response"],
      examples: [],
      diagrams: [],
    },
    actionable_feedback: ["Compare PES in the short run vs long run."],
    suggested_resources: [],
    suggested_practice: [],
    confidence: 0.91,
    anchorsUsed: 2,
    grounding_status: "grounded",
    sources: [],
    audited: true,
  };

  it("renders the examiner report and clean essay side by side without inline Pass 4 feedback", () => {
    const html = renderToStaticMarkup(
      <GradedReviewWorkspace
        grading={grading}
        question="Discuss the effectiveness of a maximum price in housing markets [12]"
        essayText={essay}
        essayId="essay-123"
        paragraphBlocks={blocks}
        essayFont="serif"
        onChangeEssayFont={() => {}}
        onEditScript={() => {}}
        onOpenSavedThread={() => {}}
        diagramMatches={[]}
      />,
    );

    expect(html).toContain("Side-by-Side");
    expect(html).toContain("Cambridge Examiner Report");
    expect(html).toContain("Candidate Essay");
    expect(html).toContain("Saved Thread");

    expect(html).toContain("9");
    expect(html).toContain("/12");
    expect(html).toContain("Upper Middle Band");
    expect(html).toContain("Sound explanation of maximum price mechanics with credible evaluation.");
    expect(html).toContain("Compare PES in the short run vs long run.");

    expect(html).toContain("¶1");
    expect(html).toContain("¶2");
    expect(html).toContain("¶3");
    expect(html).toContain("Figure: Maximum Price");
    expect(html).not.toContain("Pass 4");
    expect(html).not.toContain("Annotated Script");
  });
});
