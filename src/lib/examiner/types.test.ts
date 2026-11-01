import { describe, expect, it } from "vitest";
import { normaliseGrading } from "./types";

describe("normaliseGrading - Question Relevance and Zero-Mark Protection", () => {
  const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };

  it("FOOLPROOF TEST (User Screenshot Case): zeroes out marks when examiner comments confirm essay is off-topic", () => {
    // The exact feedback from the user's screenshot where AI gave 3/12 on subsidies for a free trade question
    const raw = {
      total_mark: 3,
      band: "Bottom band",
      ao_breakdown: {
        knowledge: {
          awarded: 0,
          out_of: 2,
          comment:
            "The essay does not address the question about free trade at all. Instead, it discusses subsidies, merit goods, and government intervention, which are unrelated to the topic of free trade. The definitions provided are accurate but entirely off-topic.",
        },
        analysis: {
          awarded: 1,
          out_of: 6,
          comment:
            "The essay contains no analysis of free trade or its consequences. The single mark is awarded for the correct description of a subsidy diagram, but this is irrelevant to the question. The analysis is entirely absent for the required topic.",
        },
        evaluation: {
          awarded: 2,
          out_of: 4,
          comment:
            "The essay attempts to evaluate government intervention strategies for merit goods, but this is unrelated to the question. However, these points do not address whether free trade consequences are always positive.",
        },
      },
      examiner_summary:
        "The candidate has written an essay on subsidies and merit goods rather than addressing the question on free trade.",
      strengths: ["Clear explanation of subsidy diagram."],
      weaknesses: ["Entirely off-topic."],
    };

    const normalised = normaliseGrading(raw, 12, split);

    // Marks must be completely clamped to 0
    expect(normalised.total_mark).toBe(0);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(0);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(0);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(0);
    expect(normalised.band).toBe("Bottom band");
    expect(normalised.unrelated_to_question).toBe(true);
  });

  it("zeroes out marks when raw.unrelated_to_question is explicitly true", () => {
    const raw = {
      total_mark: 4,
      unrelated_to_question: true,
      band: "Lower middle band",
      ao_breakdown: {
        knowledge: { awarded: 1, out_of: 2, comment: "Some knowledge." },
        analysis: { awarded: 2, out_of: 6, comment: "Some analysis." },
        evaluation: { awarded: 1, out_of: 4, comment: "Some evaluation." },
      },
    };

    const normalised = normaliseGrading(raw, 12, split);

    expect(normalised.total_mark).toBe(0);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(0);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(0);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(0);
    expect(normalised.band).toBe("Bottom band");
    expect(normalised.unrelated_to_question).toBe(true);
  });

  it("preserves legitimate marks on relevant essays", () => {
    const raw = {
      total_mark: 10,
      band: "Top band",
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment: "Accurate definitions of free trade and comparative advantage.",
        },
        analysis: {
          awarded: 5,
          out_of: 6,
          comment: "Clear causal chain showing how tariff elimination enhances consumer surplus.",
        },
        evaluation: {
          awarded: 3,
          out_of: 4,
          comment: "Well-balanced evaluation contrasting short-run adjustment costs with long-run efficiency gains.",
        },
      },
    };

    const normalised = normaliseGrading(raw, 12, split);

    expect(normalised.total_mark).toBe(10);
    expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
    expect(normalised.ao_breakdown.analysis.awarded).toBe(5);
    expect(normalised.ao_breakdown.evaluation.awarded).toBe(3);
    expect(normalised.band).toBe("Top band");
    expect(normalised.unrelated_to_question).toBe(false);
  });
});
