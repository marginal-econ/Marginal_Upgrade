import { describe, it, expect } from "vitest";
import { extractFirstJsonObject } from "./json";

describe("extractFirstJsonObject", () => {
  it("parses pure JSON directly", () => {
    const raw = '{"total_mark": 2, "confidence": 0.95}';
    expect(extractFirstJsonObject(raw)).toEqual({ total_mark: 2, confidence: 0.95 });
  });

  it("extracts JSON surrounded by markdown fences", () => {
    const raw = 'Here is the response:\n```json\n{"status": "ok", "items": [1, 2]}\n```\nDone.';
    expect(extractFirstJsonObject(raw)).toEqual({ status: "ok", items: [1, 2] });
  });

  it("extracts JSON surrounded by conversational prose", () => {
    const raw = 'Certainly! The evaluation is:\n{"issues": [{"original": "bad"}]}\nHope that helps!';
    expect(extractFirstJsonObject(raw)).toEqual({ issues: [{ original: "bad" }] });
  });

  it("recovers truncated JSON when string was cut off mid-sentence", () => {
    const truncated = '{"issues": [{"original": "demerit goods", "explanation": "In Cambridge 9708';
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect((parsed.issues as any)[0].original).toBe("demerit goods");
  });

  it("recovers truncated JSON when array was cut off after a comma", () => {
    const truncated = '{"issues": [{"original": "demerit goods"}], "classifications": [';
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(parsed.issues).toEqual([{ original: "demerit goods" }]);
  });

  it("recovers root object from real-world candidate truncated response", () => {
    const truncated = `{
  "issues": [
    {
      "sentence_index": 2,
      "original": "demerit goods",
      "suggestion": "Demerit goods",
      "category": "grammar",
      "severity": "low",
      "explanation": "Sentences should begin with a capital letter.",
      "evidence": "Standard academic writing conventions.",
      "confidence": 0.98
    },
    {
      "sentence_index": 2,
      "original": "because consumers are not aware of its negative externalities due to information failure.",
      "suggestion": "because consumers underestimate the private harm to themselves due to information failure, and their consumption generates negative externalities.",
      "category": "economics_accuracy",
      "severity": "medium",
      "explanation": "In Cambridge 9708 Economics,`;
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect((parsed.issues as any).length).toBeGreaterThanOrEqual(1);
    expect((parsed.issues as any)[0].original).toBe("demerit goods");
  });

  it("strips DeepSeek-R1 <think> tags before extracting JSON", () => {
    const raw = `<think>
I need to evaluate this essay. Let's think about {knowledge, analysis, evaluation}.
The candidate scored well on AO1.
</think>
{"total_mark": 11, "band": "top", "confidence": 0.9}`;
    expect(extractFirstJsonObject(raw)).toEqual({ total_mark: 11, band: "top", confidence: 0.9 });
  });

  it("prioritizes Cambridge schema root object over preamble metadata JSON", () => {
    const raw = `Examiner Note: {"status": "ok"}\n\n{"total_mark": 10, "ao_breakdown": {}}`;
    const parsed = extractFirstJsonObject(raw);
    expect(parsed.total_mark).toBe(10);
  });

  it("throws on completely non-JSON content", () => {
    expect(() => extractFirstJsonObject("Just some text without any JSON at all")).toThrow(
      "The examiner returned a response that could not be read as valid JSON.",
    );
  });

  it("strips conflicting score fractions from comments and explanations", async () => {
    const { stripScoreFractionsFromText } = await import("./types");

    // The exact string from the user's screenshot
    const text1 = "The missing intermediate steps (e.g., multiplier effect, transmission to AD) restrict the mark to Level 2 (3/4).";
    expect(stripScoreFractionsFromText(text1)).toBe(
      "The missing intermediate steps (e.g., multiplier effect, transmission to AD) restrict the mark to Level 2.",
    );

    // The other exact string from the user's screenshot
    const text2 = "Since the question is purely descriptive, the absence of evaluation is not penalized beyond the standard AO3 expectation. The single mark is awarded for the direct, accurate response to the question without errors.";
    expect(stripScoreFractionsFromText(text2)).toBe(
      "Since the question is purely descriptive, the absence of evaluation is not penalized beyond the standard AO3 expectation. Credit is awarded for the direct, accurate response to the question without errors.",
    );

    // Score fractions like (1/4), (0/2), (2/2)
    expect(stripScoreFractionsFromText("Analysis is sound (3/4) but could be deeper.")).toBe(
      "Analysis is sound but could be deeper.",
    );
  });

  it("normalises legacy 8-mark question with 0 evaluation marks and no evaluation penalty", async () => {
    const { normaliseGrading } = await import("./types");
    const raw = {
      total_mark: 6,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
        analysis: { awarded: 4, out_of: 4, comment: "Developed mechanism restrict the mark to Level 2 (3/4)." },
        evaluation: { awarded: 1, out_of: 2, comment: "The single mark is awarded for accurate response." },
      },
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: ["Needs evaluation of alternatives"],
      },
      weaknesses: ["Missing evaluation weakens the overall conclusion."],
    };

    const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 };
    const result = normaliseGrading(raw, 8, split);

    expect(result.ao_breakdown.evaluation.out_of).toBe(0);
    expect(result.ao_breakdown.evaluation.awarded).toBe(0);
    expect(result.ao_breakdown.evaluation.comment).toContain("Evaluation is not required");
    expect(result.missing_elements.evaluation).toEqual([]);
    // Comments must have score fractions stripped
    expect(result.ao_breakdown.analysis.comment).not.toContain("(3/4)");
    // Weaknesses mentioning missing evaluation must be filtered out for non-evaluative essays
    expect(result.weaknesses.some((w) => w.toLowerCase().includes("missing evaluation"))).toBe(false);
  });
  it("normalises 8-mark evaluative essay, stripping false 'not required' claims and crediting conclusion", async () => {
    const { normaliseGrading } = await import("./types");
    const raw = {
      total_mark: 6,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of public goods and merit goods." },
        analysis: { awarded: 4, out_of: 4, comment: "Clear analysis of non-rivalry, non-excludability, and positive externalities." },
        evaluation: {
          awarded: 0,
          out_of: 2,
          comment: "Evaluation is not required for this question as it is a non-evaluative 'Explain' question. However, the candidate does not directly address the evaluative component of the question ('consider whether healthcare should be classified as a public good or a merit good'). The conclusion merely restates the classification without weighing the arguments or considering alternative perspectives.",
        },
      },
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: ["Deeper comparative evaluation"],
      },
      weaknesses: [
        "The response lacks a structured evaluative paragraph, although this is not required for this question type.",
      ],
      examiner_summary: "The essay demonstrates strong knowledge and analysis, although this is not required for this question type.",
    };

    const split = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };
    const result = normaliseGrading(raw, 8, split);

    // AO3 is out of 2 marks
    expect(result.ao_breakdown.evaluation.out_of).toBe(2);
    // Because a conclusion / classification was present and acknowledged alongside developed knowledge (2/2) and analysis (4/4),
    // the toned-down 8-mark standard awards full Level 2 evaluation (2/2)
    expect(result.ao_breakdown.evaluation.awarded).toBe(2);
    // The false claim that evaluation is not required must be stripped
    expect(result.ao_breakdown.evaluation.comment).not.toContain("Evaluation is not required for this question as it is a non-evaluative");
    expect(result.ao_breakdown.evaluation.comment).not.toContain("although this is not required");
    // Weaknesses and summary must not contain contradictory claims
    expect(result.weaknesses.some((w) => w.includes("although this is not required"))).toBe(false);
    expect(result.examiner_summary).not.toContain("although this is not required");
    // Total mark must exactly equal AO1 + AO2 + AO3: 2 + 4 + 2 = 8 (8/8 Top Band)
    expect(result.total_mark).toBe(8);
    expect(result.band).toBe("Top Band");
    expect(result.ao_breakdown.knowledge.awarded + result.ao_breakdown.analysis.awarded + result.ao_breakdown.evaluation.awarded).toBe(result.total_mark);
  });

  it("sanitizes A-Level concepts and definitional pedantry out of AS Level (8m & 12m) examiner reports", async () => {
    const { normaliseGrading, sanitizeAsLevelText } = await import("./types");

    // 1. Direct test of sanitizeAsLevelText
    const hallucinatedSummary =
      "The student also incorrectly states 'Scarcity takes place when the resources are limited but the wants are unlimited'—this is a tautology and does not fully capture the economic concept of opportunity cost (the next best alternative forgone). The phrase 'limited resources' is vague and does not explicitly reference the fundamental economic problem of finite resources (as per [S1] and [S6]). Missing critical economic mechanisms like marginal utility, diminishing returns, or resource allocation trade-offs.";

    const sanitizedSummary = sanitizeAsLevelText(hallucinatedSummary);
    expect(sanitizedSummary).not.toContain("this is a tautology");
    expect(sanitizedSummary).not.toContain("incorrectly states 'Scarcity takes place");
    expect(sanitizedSummary).not.toContain("marginal utility");
    expect(sanitizedSummary).not.toContain("diminishing returns");

    // 2. Normalisation of 8-mark essay containing A-Level concepts and definitional hallucinations
    const raw8 = {
      total_mark: 3,
      ao_breakdown: {
        knowledge: {
          awarded: 1,
          out_of: 2,
          comment:
            "The student also incorrectly states 'Scarcity takes place when the resources are limited but the wants are unlimited'—this is a tautology and does not fully capture the economic concept of opportunity cost (the next best alternative forgone).",
        },
        analysis: {
          awarded: 2,
          out_of: 6,
          comment:
            "The analysis is descriptive rather than analytical. Missing critical economic mechanisms like marginal utility, diminishing returns, or resource allocation trade-offs.",
        },
        evaluation: {
          awarded: 0,
          out_of: 0,
          comment: "Evaluation is not required for this question.",
        },
      },
      examiner_summary:
        "The response is missing key economic mechanisms such as opportunity cost, marginal utility, or resource allocation trade-offs.",
      weaknesses: [
        "The definition of scarcity is vague and colloquial ('resources are limited but wants are unlimited') and does not explicitly reference opportunity cost or the fundamental economic problem (as required by [S3] and [S6]).",
        "The analysis is descriptive rather than analytical, missing critical economic mechanisms like marginal utility, diminishing returns, or resource allocation trade-offs.",
      ],
      missing_elements: {
        definitions: [
          "Explanation of how unlimited wants are economically defined (e.g., through marginal utility theory or diminishing returns).",
        ],
        analysis: [
          "A step-by-step explanation of how high income levels in rich countries lead to persistent scarcity (e.g., through increased marginal wants, diminishing returns, or resource allocation trade-offs).",
        ],
        evaluation: [],
        examples: ["Real world example in rich country."],
        diagrams: [],
      },
      actionable_feedback: [
        "Revise your definition of scarcity and integrate resource constraints without relying on diminishing returns.",
      ],
      suggested_resources: ["Cambridge 9708 Chapter 1: Scarcity, choice"],
      suggested_practice: ["Practice scarcity questions"],
    };

    const split8 = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 };
    const result8 = normaliseGrading(raw8, 8, split8);

    // Verify all A-level topics are purged
    expect(result8.examiner_summary).not.toContain("marginal utility");
    expect(result8.examiner_summary).not.toContain("diminishing returns");
    expect(result8.weaknesses.some((w) => /marginal utility|diminishing returns/i.test(w))).toBe(false);
    expect(result8.weaknesses.some((w) => /vague and colloquial/i.test(w))).toBe(false);
    expect(result8.missing_elements.definitions.some((d) => /marginal utility|diminishing returns/i.test(d))).toBe(false);
    expect(result8.missing_elements.analysis.some((a) => /marginal utility|diminishing returns/i.test(a))).toBe(false);
    expect(result8.ao_breakdown.knowledge.comment).not.toContain("this is a tautology");
    expect(result8.ao_breakdown.analysis.comment).not.toContain("marginal utility");

    // 3. For 20-mark A Level essays, A-Level terms are legitimately preserved
    const raw20 = {
      total_mark: 16,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Sound knowledge of utility theory." },
        analysis: { awarded: 9, out_of: 12, comment: "Detailed explanation using diminishing returns and marginal utility." },
        evaluation: { awarded: 5, out_of: 6, comment: "Thorough evaluation." },
      },
      examiner_summary: "Strong essay analyzing oligopoly and dynamic efficiency.",
      weaknesses: ["Could deepen the analysis of marginal utility."],
      missing_elements: {
        definitions: ["Equi-marginal principle"],
        analysis: ["Diminishing returns mechanism"],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
    };
    const split20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
    const result20 = normaliseGrading(raw20, 20, split20);
    expect(result20.examiner_summary).toContain("oligopoly");
    expect(result20.ao_breakdown.analysis.comment).toContain("diminishing returns");
  });

  it("strips all internal knowledge base chunk markers [S#] and (S#) from student feedback", async () => {
    const { stripInternalSnippetCitations } = await import("./types");

    expect(
      stripInternalSnippetCitations(
        "explicitly reference the fundamental economic problem of finite resources (as per [S1] and [S6]).",
      ),
    ).toBe("explicitly reference the fundamental economic problem of finite resources.");

    expect(
      stripInternalSnippetCitations(
        "structured paragraphing, which is a core requirement for Cambridge essays (see [S2], [S4]).",
      ),
    ).toBe("structured paragraphing, which is a core requirement for Cambridge essays.");

    expect(
      stripInternalSnippetCitations(
        "foundational economic concept (S1, S3).",
      ),
    ).toBe("foundational economic concept.");

    expect(
      stripInternalSnippetCitations(
        "opportunity cost (S6), which are core to answering the question.",
      ),
    ).toBe("opportunity cost, which are core to answering the question.");

    expect(
      stripInternalSnippetCitations(
        "Chapter 1: Scarcity, Choice, and Opportunity Cost ([S1], [S3], [S6]) — Focus on syllabus definitions.",
      ),
    ).toBe("Chapter 1: Scarcity, Choice, and Opportunity Cost — Focus on syllabus definitions.");

    expect(
      stripInternalSnippetCitations(
        "Chapter 5: Production Possibility Curves ([S7], [S8]) — Use PPC diagrams to illustrate.",
      ),
    ).toBe("Chapter 5: Production Possibility Curves — Use PPC diagrams to illustrate.");
  });

  it("deduplicates semantically repetitive feedback points using Jaccard similarity", async () => {
    const { deduplicateFeedbackPoints } = await import("./types");

    const repetitiveWeaknesses = [
      "The definition of scarcity is vague and lacks syllabus precision. The student does not explicitly reference the fundamental economic problem or opportunity cost, which are core to answering the question.",
      "The analysis is descriptive rather than analytical. The student does not explain how or why high income leads to persistent scarcity, missing critical economic mechanisms like resource allocation trade-offs.",
      "The essay lacks structured paragraphing and coherent prose, which is a requirement for Cambridge essays. The response reads more like a list of observations than a developed economic argument.",
      "The definition of scarcity is vague and colloquial ('resources are limited but wants are unlimited') and does not explicitly reference opportunity cost or the fundamental economic problem.",
    ];

    const deduped = deduplicateFeedbackPoints(repetitiveWeaknesses, 4);
    // Point 4 is semantically identical to point 1 and must be pruned
    expect(deduped.length).toBe(3);
    expect(deduped[0]).toContain("The definition of scarcity is vague and lacks syllabus precision");
    expect(deduped[1]).toContain("The analysis is descriptive rather than analytical");
    expect(deduped[2]).toContain("The essay lacks structured paragraphing");

    const repetitiveStrengths = [
      "The student correctly identifies the core idea of scarcity as the mismatch between unlimited wants and limited resources, which is the foundational concept for the question.",
      "The essay acknowledges that income levels and cultural factors influence wants, which is a relevant observation.",
      "The student attempts to link high income to unlimited wants, which is a starting point for discussing why scarcity persists.",
      "The student correctly identifies that scarcity arises from the gap between limited resources and unlimited wants, which is a foundational economic concept.",
    ];

    const dedupedStrengths = deduplicateFeedbackPoints(repetitiveStrengths, 4);
    expect(dedupedStrengths.length).toBe(3);
  });

  it("verifies quotes against student essay and unwraps hallucinated/phantom quotations", async () => {
    const { verifyVerbatimQuotes } = await import("./types");

    const essay =
      "ScArcity tAkes plAce when The resources Are limited But The wAnts Are unlimited. Rich countries usuAlly HAve high Income per An IndividuAl or household. When There is A high Income Level The wAnts of A person Are expensive or unlimited. This forces The government to produce goods rigorously With The use of resources And oTher fActors of production.";

    // Genuine quote: exists verbatim in the student essay
    const realQuote = "The candidate correctly states 'The resources Are limited But The wAnts Are unlimited' in their opening.";
    expect(verifyVerbatimQuotes(realQuote, essay)).toBe(realQuote);

    // Phantom quote: AI fabricated words and wrapped in quotes that do not exist in the essay
    const phantomQuote = "The candidate's phrasing ('high income level leads to unlimited wants') is colloquial.";
    const unwrapped = verifyVerbatimQuotes(phantomQuote, essay);
    expect(unwrapped).not.toContain("'high income level leads to unlimited wants'");
    expect(unwrapped).toContain("high income level leads to unlimited wants");
  });

  it("purges contradictions between strengths and weaknesses / missing elements", async () => {
    const { purgeContradictions } = await import("./types");

    const contradictoryGrading: any = {
      total_mark: 7,
      max_mark: 8,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
        analysis: { awarded: 3, out_of: 4, comment: "Sound mechanisms." },
        evaluation: { awarded: 2, out_of: 2, comment: "Sound conclusion." },
      },
      examiner_summary: "Good essay.",
      strengths: [
        "The candidate provides a good real-world example of healthcare in the UK.",
        "Accurately defines the core concepts.",
      ],
      weaknesses: [
        "The essay lacks real-world examples to support the theoretical points.",
        "Analysis could be developed further with intermediate steps.",
      ],
      missing_elements: {
        definitions: ["Opportunity cost"],
        analysis: [],
        evaluation: [],
        examples: ["Real-world application in healthcare"],
        diagrams: [],
      },
      actionable_feedback: ["Extend transmission links."],
      suggested_resources: [],
      suggested_practice: [],
    };

    const resolved = purgeContradictions(contradictoryGrading);

    // Contradictory weakness claiming examples are lacking must be pruned because strengths praised UK healthcare example
    expect(resolved.weaknesses.some((w) => w.toLowerCase().includes("lacks real-world examples"))).toBe(false);
    // Non-contradictory weakness must remain
    expect(resolved.weaknesses.some((w) => w.toLowerCase().includes("intermediate steps"))).toBe(true);
    // Missing examples list must be cleared
    expect(resolved.missing_elements.examples).toEqual([]);
  });

  it("selects at most 2 calibration anchors even when database contains 18", async () => {
    const { selectBestAnchors } = await import("./calibration.server");

    // Mock 18 database anchors
    const mockAnchors: any[] = Array.from({ length: 18 }, (_, i) => ({
      question: `Question ${i + 1}: Discuss the economic effects of fiscal policy and taxation`,
      essay_text: `Essay ${i + 1} content...`,
      mark: 10,
      max_mark: 12,
      band_label: i % 2 === 0 ? "top" : "sound",
      notes: null,
    }));

    const selected = selectBestAnchors(mockAnchors, "Explain how indirect taxes affect market equilibrium", 12, 2);
    expect(selected.length).toBeLessThanOrEqual(2);
    expect(selected.length).toBeGreaterThanOrEqual(1);
    expect(selected.length).not.toBe(18);
  });

  it("normaliseGrading generates topic-specific Cambridge chapters instead of generic placeholders", async () => {
    const { normaliseGrading } = await import("./types");
    const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };

    // Case 1: Elasticity essay with empty or generic resources
    const elasticityRaw: any = {
      total_mark: 10,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate XED definition" },
        analysis: { awarded: 5, out_of: 6, comment: "Sound substitutes and complements analysis" },
        evaluation: { awarded: 3, out_of: 4, comment: "Evaluates pricing decisions" },
      },
      examiner_summary: "The candidate provides a detailed discussion of cross elasticity of demand (XED) and pricing strategy.",
      strengths: ["Clear calculation of XED."],
      weaknesses: ["Minor slip in discussion."],
      suggested_resources: [
        "Cambridge 9708 Economics Coursebook — Relevant Chapter on Core Theory & Policy Instruments"
      ],
      suggested_practice: [
        "Construct a step-by-step transmission mechanism connecting policy implementation to consumer and producer surplus changes."
      ],
    };

    const result = normaliseGrading(elasticityRaw, 12, split, "Cross elasticity of demand XED explains close substitutes and complementary goods.");

    // Must NOT contain generic placeholder
    expect(result.suggested_resources.some((r) => r.includes("Relevant Chapter"))).toBe(false);
    // Must contain specific Chapter 8 or 9 for elasticity
    expect(result.suggested_resources.some((r) => r.includes("Price elasticity") || r.includes("cross elasticities"))).toBe(true);

    // Practice must NOT contain policy surplus drift
    expect(result.suggested_practice.some((p) => p.includes("consumer and producer surplus"))).toBe(false);
    // Practice must stay strictly on elasticity/pricing
    expect(result.suggested_practice.some((p) => /elasticity|pricing|substitute|xed/i.test(p))).toBe(true);
  });
});
