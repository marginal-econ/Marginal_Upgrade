import { describe, expect, it } from "vitest";
import { compactSyllabusContext } from "../live-examiner.functions";

describe("Live Examiner Economics Feedback & Context Engine", () => {
  it("compacts syllabus context while preserving core definitions", () => {
    const rawContext = `9708 Economics Syllabus 2023-2025
Core Topic: Price Elasticity of Demand (PED)
PED measures the percentage change in quantity demanded divided by percentage change in price.
When PED > 1 demand is price elastic; when PED < 1 demand is price inelastic.
BAND 4 ANCHOR ESSAY EXAMPLE
Here is a very long script that was 4000 characters long and should be stripped out during keystroke checks.`;

    const compacted = compactSyllabusContext(rawContext);
    expect(compacted).toContain("Price Elasticity of Demand");
    expect(compacted).toContain("percentage change in quantity demanded");
    expect(compacted).not.toContain("BAND 4 ANCHOR ESSAY EXAMPLE");
  });

  it("handles empty context gracefully without failing", () => {
    expect(compactSyllabusContext("")).toBe("");
  });

  it("sanitises standard predicted mark responses correctly", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: 6,
      confidence: 0.85,
      headline: "Strong AD definition and initial analysis",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 3 },
        analysis: { awarded: 3, out_of: 6 },
        evaluation: { awarded: 1, out_of: 3 },
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBe(6);
    expect(res?.confidence).toBe(0.85);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(2);
    expect(res?.ao_breakdown.analysis.awarded).toBe(3);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(1);
  });

  it("handles stringified numbers, percentage confidence, and alternative AO keys", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: "6",
      confidence: 85, // 85% instead of 0.85
      headline: "Good progress",
      ao_breakdown: {
        AO1: 2,
        AO2: 4,
        AO3: 0,
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBe(6);
    expect(res?.confidence).toBe(0.85);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(2);
    expect(res?.ao_breakdown.analysis.awarded).toBe(4);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(0);
  });

  it("clamps marks accurately to maxMark tariff", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: 25,
      confidence: 0.9,
      headline: "Exceeds max",
      ao_breakdown: {
        knowledge: { awarded: 10, out_of: 4 },
        analysis: { awarded: 10, out_of: 6 },
        evaluation: { awarded: 5, out_of: 2 },
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBeLessThanOrEqual(12);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(4);
    expect(res?.ao_breakdown.analysis.awarded).toBe(6);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(2);
  });

  it("validates MaxOutResponseSchema with placement and placement_rationale", async () => {
    const { MaxOutResponseSchema } = await import("../live-examiner.functions");
    const testData = {
      headline: "Upgrade your draft to full marks",
      target_band: "Band 1 / Level 5",
      perfection_summary: "Deepen analytical mechanisms",
      suggestions: [
        {
          target_ao: "ao1",
          title: "Rigorous Definitions",
          suggestion: "Define minimum price and market failure",
          mark_uplift: "+1 mark",
          placement: "Paragraph 1 (Introduction & Core Definitions)",
          placement_rationale: "Establishes baseline knowledge early.",
          how_to_write: ["Step 1", "Step 2"],
          strategic_options: [
            {
              label: "Option 1",
              description: "Information failure",
              sentence_starter: "Demerit goods...",
            },
          ],
          model_phrasing: "A minimum price intervention...",
        },
      ],
    };

    const parsed = MaxOutResponseSchema.parse(testData);
    expect(parsed.suggestions[0].placement).toBe("Paragraph 1 (Introduction & Core Definitions)");
    expect(parsed.suggestions[0].placement_rationale).toBe("Establishes baseline knowledge early.");
  });
});
