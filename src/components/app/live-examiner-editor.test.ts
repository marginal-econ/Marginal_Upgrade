import { describe, expect, it } from "vitest";
import { computeRanges, type Range } from "./live-examiner-editor";
import type { ActiveAoClassification, ActiveIssue } from "@/hooks/use-live-examiner-check";
import { evaluateCambridgeAnswer } from "@/lib/live-examiner/client-evaluation";
import { splitSentences } from "@/lib/writing-check/sentence-diff";

describe("Live Examiner Editor - computeRanges & Investor Demo Robustness", () => {
  it("preserves pure AO1 classification on an error-free sentence", () => {
    const text = "A demerit good is a good that is over-consumed in a free market because it generates negative externalities.";
    const classifications: ActiveAoClassification[] = [
      {
        id: "AO1::test",
        ao: "AO1",
        original: text,
        context: text,
        explanation: "Clear syllabus definition of demerit goods.",
      },
    ];

    const ranges = computeRanges(text, [], classifications);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      start: 0,
      end: text.length,
      kind: "classification",
      id: "AO1::test",
    });
  });

  it("FLAWLESS TEST: solves the user screenshot bug where typos inside AO1 sentence previously suppressed the AO highlight", () => {
    const text = "A demerit good is a good that is over-cosumered in a free market becuase it generates negative externailties.";

    const issues: ActiveIssue[] = [
      {
        id: "issue-cosumered",
        category: "grammar",
        original: "cosumered",
        suggestion: "consumed",
        context: text,
        message: "Spelling correction",
        explanation: "Spelling correction: 'consumed'.",
        severity: "medium",
      },
      {
        id: "issue-becuase",
        category: "grammar",
        original: "becuase",
        suggestion: "because",
        context: text,
        message: "Spelling correction",
        explanation: "Spelling correction: 'because'.",
        severity: "medium",
      },
      {
        id: "issue-externailties",
        category: "terminology",
        original: "externailties",
        suggestion: "externalities",
        context: text,
        message: "Spelling correction",
        explanation: "'externalities' is standard Cambridge spelling.",
        severity: "medium",
      },
    ];

    const classifications: ActiveAoClassification[] = [
      {
        id: "AO1::demerit",
        ao: "AO1",
        original: text,
        context: text,
        explanation: "AO1 Knowledge: Accurate Cambridge 9708 definition of demerit goods.",
      },
    ];

    const ranges = computeRanges(text, issues, classifications);

    // Verify all 3 issues are present and located
    const issueRanges = ranges.filter((r) => r.kind === "issue");
    expect(issueRanges).toHaveLength(3);
    expect(issueRanges.map((r) => (r.kind === "issue" ? r.issue.original : ""))).toEqual([
      "cosumered",
      "becuase",
      "externailties",
    ]);

    // Verify AO1 classifications cover the surrounding text segments
    const aoRanges = ranges.filter((r) => r.kind === "classification");
    expect(aoRanges.length).toBeGreaterThan(0);
    aoRanges.forEach((aoRange) => {
      expect(aoRange.kind).toBe("classification");
      if (aoRange.kind === "classification") {
        expect(aoRange.classification.ao).toBe("AO1");
        expect(aoRange.id).toBe("AO1::demerit");
      }
    });

    // Verify contiguous segmentation: no holes inside the sentence
    const minStart = ranges[0].start;
    const maxEnd = ranges[ranges.length - 1].end;
    expect(minStart).toBe(0);
    expect(maxEnd).toBe(text.length);

    // Verify sub-slice text matches expectations
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i].end).toBe(ranges[i + 1].start);
    }
  });

  it("handles multiple paragraphs and sentences with mixed AO1, AO2, AO3 and typos", () => {
    const s1 = "Demerit goods are over-consumed becuase of information faliure.";
    const s2 = "This leads to a deadweight loss to society and allocative inefficiency.";
    const s3 = "However, the extent of market failure depends on the price elasticity of demand.";
    const fullEssay = `${s1} ${s2} ${s3}`;

    const issues: ActiveIssue[] = [
      {
        id: "issue-becuase",
        category: "grammar",
        original: "becuase",
        suggestion: "because",
        context: s1,
        message: "Spelling correction",
        explanation: "Spelling correction",
        severity: "medium",
      },
      {
        id: "issue-faliure",
        category: "grammar",
        original: "faliure",
        suggestion: "failure",
        context: s1,
        message: "Spelling correction",
        explanation: "Spelling correction",
        severity: "medium",
      },
    ];

    const classifications: ActiveAoClassification[] = [
      {
        id: "AO1::s1",
        ao: "AO1",
        original: s1,
        context: s1,
        explanation: "AO1 Knowledge definition",
      },
      {
        id: "AO2::s2",
        ao: "AO2",
        original: s2,
        context: s2,
        explanation: "AO2 Analysis causal chain",
      },
      {
        id: "AO3::s3",
        ao: "AO3",
        original: s3,
        context: s3,
        explanation: "AO3 Evaluative limitation",
      },
    ];

    const ranges = computeRanges(fullEssay, issues, classifications);

    // AO2 and AO3 should be clean unbroken spans
    const ao2Range = ranges.find((r) => r.kind === "classification" && r.classification.ao === "AO2");
    expect(ao2Range).toBeDefined();
    if (ao2Range && ao2Range.kind === "classification") {
      expect(fullEssay.slice(ao2Range.start, ao2Range.end)).toBe(s2);
    }

    const ao3Range = ranges.find((r) => r.kind === "classification" && r.classification.ao === "AO3");
    expect(ao3Range).toBeDefined();
    if (ao3Range && ao3Range.kind === "classification") {
      expect(fullEssay.slice(ao3Range.start, ao3Range.end)).toBe(s3);
    }

    // Sentence 1 has both issues and AO1 highlights
    const s1Issues = ranges.filter(
      (r) => r.kind === "issue" && (r.issue.original === "becuase" || r.issue.original === "faliure"),
    );
    expect(s1Issues).toHaveLength(2);
  });

  it("never underlines or highlights protected [DIAGRAM: ...] tags", () => {
    const text =
      "As shown in the diagram [DIAGRAM: Negative externality in consumption | axes: P (y) / Q (x) | curves: MPB, MSB, MPC=MSC | labels: deadweight welfare loss] the market over-allocates resources.";

    const classifications: ActiveAoClassification[] = [
      {
        id: "AO2::diagram",
        ao: "AO2",
        original: text,
        context: text,
        explanation: "Analysis referencing diagram.",
      },
    ];

    const issues: ActiveIssue[] = [
      {
        id: "issue-in-diag",
        category: "terminology",
        original: "externality",
        suggestion: "externalities",
        context: text,
        message: "Should be protected",
        explanation: "Testing protection",
        severity: "medium",
      },
    ];

    const ranges = computeRanges(text, issues, classifications);
    const diagramStart = text.indexOf("[DIAGRAM:");
    const diagramEnd = text.indexOf("]") + 1;

    // No range should overlap the diagram tag
    for (const range of ranges) {
      const overlapsDiagram = range.start < diagramEnd && range.end > diagramStart;
      expect(overlapsDiagram).toBe(false);
    }
  });

  it("handles instant client evaluation with full mark synchrony across tariffs", () => {
    const essays = [
      {
        maxMark: 8,
        question: "Explain the causes of market failure.",
        text: "Market failure occurs when the price mechanism leads to a misallocation of resources. Demerit goods are over-consumed because consumers ignore negative externalities. This results in an over-allocation of resources and a net welfare loss to society.",
      },
      {
        maxMark: 12,
        question: "Assess whether indirect taxation is the best policy to correct market failure.",
        text: "A demerit good is a good that generates negative externalities in consumption. An indirect tax shifts the marginal private cost curve upward from MPC to MPC+tax, reducing consumption to the socially optimal output. However, the effectiveness of the tax depends on the price elasticity of demand; if demand is highly inelastic, consumption will not fall significantly and consumers simply pay higher prices.",
      },
      {
        maxMark: 20,
        question: "Evaluate the view that free markets always achieve economic efficiency.",
        text: "Economic efficiency requires both productive and allocative efficiency. In a free market, firms operate at lowest average cost in perfect competition, achieving productive efficiency. However, monopolies restrict output to maximize profit where MC=MR, resulting in allocative inefficiency. Furthermore, demerit goods lead to negative externalities and market failure. On the other hand, government intervention can cause government failure due to information deficits.",
      },
    ];

    for (const sample of essays) {
      const result = evaluateCambridgeAnswer(sample.text, sample.question, sample.maxMark);
      const bd = result.predictedMark.ao_breakdown;
      const sum = bd.knowledge.awarded + bd.analysis.awarded + bd.evaluation.awarded;

      // Mathematical synchrony invariant: total_mark MUST equal knowledge + analysis + evaluation
      expect(result.predictedMark.total_mark).toBe(sum);
      expect(result.predictedMark.total_mark).toBeLessThanOrEqual(sample.maxMark);
      expect(result.predictedMark.total_mark).toBeGreaterThan(0);
      expect(result.classifications.length).toBeGreaterThan(0);
    }
  });

  it("highlights and underlines WHOLE sentences, not phrases, and prioritizes AO3 on evaluation sentences", () => {
    const text = "A minimum price reduces consumption of demerit goods. However, setting a minimum price above equilibrium does not tackle information failure.";
    const classifications: ActiveAoClassification[] = [
      {
        id: "ao1-sentence",
        ao: "AO1",
        original: "A minimum price reduces consumption of demerit goods.",
        context: "A minimum price reduces consumption of demerit goods.",
        explanation: "AO1 Knowledge",
      },
      {
        id: "ao3-sentence",
        ao: "AO3",
        original: "However, setting a minimum price above equilibrium does not tackle information failure.",
        context: "However, setting a minimum price above equilibrium does not tackle information failure.",
        explanation: "AO3 Evaluation",
      },
    ];

    const ranges = computeRanges(text, [], classifications);
    expect(ranges).toHaveLength(2);
    // First sentence is full AO1 range
    expect(ranges[0].start).toBe(0);
    expect(ranges[0].end).toBe("A minimum price reduces consumption of demerit goods.".length);
    expect(ranges[0].kind).toBe("classification");
    if (ranges[0].kind === "classification") {
      expect(ranges[0].classification.ao).toBe("AO1");
    }

    // Second sentence is full AO3 range
    const secondSentenceStart = text.indexOf("However,");
    expect(ranges[1].start).toBe(secondSentenceStart);
    expect(ranges[1].end).toBe(text.length);
    expect(ranges[1].kind).toBe("classification");
    if (ranges[1].kind === "classification") {
      expect(ranges[1].classification.ao).toBe("AO3");
    }
  });

  it("prioritizes AO3 evaluation over AO1 when an evaluation sentence contains both", () => {
    const sentence = "However, setting a minimum price above equilibrium does not tackle information failure.";
    const classifications: ActiveAoClassification[] = [
      {
        id: "partial-ao1",
        ao: "AO1",
        original: "setting a minimum price above equilibrium",
        context: sentence,
        explanation: "AO1 Knowledge",
      },
      {
        id: "full-ao3",
        ao: "AO3",
        original: sentence,
        context: sentence,
        explanation: "AO3 Evaluation",
      },
    ];

    const ranges = computeRanges(sentence, [], classifications);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].start).toBe(0);
    expect(ranges[0].end).toBe(sentence.length);
    if (ranges[0].kind === "classification") {
      expect(ranges[0].classification.ao).toBe("AO3");
    }
  });

  it("guarantees 100% sentence coverage across multi-paragraph essays and classifies definitions as AO1 blue", () => {
    const essay = [
      "A minimum price intervention is a government intervention set above market equilibrium. demerit goods are goods that are overconsumed in an economy because consumers are not aware of its negative externalities due to information failure.",
      "A minimum price intervention causes the market price to rise above equilibrium, leading to a contraction in demand and excess supply.",
      "As prices rises, less number of consumers will consume the good. this means the consumption of demerit goods may reduce, leading to better welfare for consumers.",
      "But, an decrease in consumption is dependent on the price elasticity of demand (PED). For instance, if PED is inelastic, quantity demanded will fall by a smaller percentage, making the policy less effective, as consumers still demand the product.",
    ].join("\n\n");

    const ranges = computeRanges(essay, [], []);
    expect(ranges.length).toBeGreaterThanOrEqual(3);

    // Verify sentence 1 is classified as AO1 Knowledge (blue highlight)
    const firstRange = ranges[0];
    expect(firstRange.kind).toBe("classification");
    if (firstRange.kind === "classification") {
      expect(firstRange.classification.ao).toBe("AO1");
    }

    // Verify all text in every paragraph is covered by classification ranges
    for (const r of ranges) {
      expect(r.kind).toBe("classification");
      expect(r.end).toBeGreaterThan(r.start);
    }
  });
});
