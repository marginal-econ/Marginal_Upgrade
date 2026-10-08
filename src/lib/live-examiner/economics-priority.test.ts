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
});
