import { describe, expect, it } from "vitest";
import { splitIntoChapters } from "./chapter-split";

describe("splitIntoChapters textbook parser", () => {
  it("splits classic Chapter N headings with titles", () => {
    const text = `
Chapter 1: Basic Economic Ideas and Resource Allocation
${"Economic scarcity is the fundamental problem. ".repeat(80)}

Chapter 2: The Price System and the Microeconomy
${"Demand and supply interact to establish equilibrium. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Coursebook");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toContain("Chapter 1: Basic Economic Ideas");
    expect(result[1]!.title).toContain("Chapter 2: The Price System");
  });

  it("splits Unit N headings and Roman numerals", () => {
    const text = `
Unit I: Microeconomics
${"Consumers maximize utility subject to their budget constraint. ".repeat(80)}

Unit II: Macroeconomics
${"Aggregate demand and aggregate supply determine national income. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Economics Coursebook");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toContain("Unit I: Microeconomics");
    expect(result[1]!.title).toContain("Unit II: Macroeconomics");
  });

  it("collapses repeated running page headers into single chapter boundaries", () => {
    const text = `
Chapter 3: Government Micro Intervention
${"Indirect taxes shift the supply curve vertically upwards. ".repeat(40)}

Chapter 3: Government Micro Intervention
${"Subsidies reduce the cost of production for firms. ".repeat(40)}

Chapter 3: Government Micro Intervention
${"Maximum price ceilings create shortages when set below equilibrium. ".repeat(40)}

Chapter 4: The Macroeconomy
${"Circular flow of income models economic injections and leakages. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Cambridge Coursebook");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toContain("Chapter 3");
    expect(result[1]!.title).toContain("Chapter 4");
  });

  it("safely partitions massive textbooks (> 150k characters) lacking explicit keywords", () => {
    const chunk = "Economics is the study of scarcity, choice, and allocation of resources under constraints.\n\n";
    // 200,000+ characters of content without standard chapter markers
    const hugeText = chunk.repeat(2200);

    const result = splitIntoChapters(hugeText, "General Economics Handbook");
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]!.title).toContain("General Economics Handbook — Part 1");
    expect(result[1]!.title).toContain("General Economics Handbook — Part 2");
  });
});
