import { describe, expect, it } from "vitest";

import { parseParagraphBlocks } from "./essay-paragraphs";

describe("parseParagraphBlocks", () => {
  it("splits single-newline essays cleanly even when a diagram tag is present", () => {
    const singleNewlineEssay = [
      "A maximum price is set below equilibrium.",
      "This causes excess demand and a shortage in the market.",
      "(Diagram: Maximum Price)",
      "However, informal black markets can emerge.",
      "In conclusion, maximum prices carry unintended welfare costs.",
    ].join("\n");

    const blocks = parseParagraphBlocks(singleNewlineEssay, [
      { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
    ]);

    expect(blocks).toHaveLength(5);
    expect(blocks[0].isDiagram).toBe(false);
    expect(blocks[0].textParagraphNumber).toBe(1);
    expect(blocks[1].textParagraphNumber).toBe(2);
    expect(blocks[2].isDiagram).toBe(true);
    expect(blocks[2].label).toBe("Diagram (after ¶2)");
    expect(blocks[3].textParagraphNumber).toBe(3);
    expect(blocks[4].textParagraphNumber).toBe(4);
  });

  it("rejoins mid-sentence hard line-wraps from PDF/OCR pastes without shredding paragraphs", () => {
    const hardWrapped =
      "A depreciation lowers the foreign currency price of exports\nand raises the domestic price of imports.\n\nHowever, the Marshall-Lerner condition states that trade improves only if:\nPEDx + PEDm > 1";

    const blocks = parseParagraphBlocks(hardWrapped, []);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe(
      "A depreciation lowers the foreign currency price of exports and raises the domestic price of imports.",
    );
    expect(blocks[1].text).toContain("PEDx + PEDm > 1");
  });

  it("isolates curly-brace {Diagram: ...} tags cleanly", () => {
    const essay = "Intro paragraph.\n{Diagram: Depreciation}\nClosing paragraph.";
    const blocks = parseParagraphBlocks(essay, [
      { title: "Depreciation", matchText: "{Diagram: Depreciation}" },
    ]);
    expect(blocks).toHaveLength(3);
    expect(blocks[1].isDiagram).toBe(true);
    expect(blocks[1].label).toBe("Diagram (after ¶1)");
  });
});
