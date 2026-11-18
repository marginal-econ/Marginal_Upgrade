import { describe, expect, it } from "vitest";
import { buildAoEvaluationDirective, buildPaperScopeDirective } from "./config";
import { shouldTriggerArbitration } from "./arbitration.server";
import { selectBestAnchors, type Anchor } from "./calibration.server";
import { deduplicateAcrossSections, deduplicateFeedbackPoints, normaliseGrading, verifyVerbatimQuotes, type Grading } from "./types";
import { extractRelevantSnippetWindow } from "../retrieval.server";
import { analyzeEssayQuality, applyWritingQualityGuardrail, essayHasDiagram, questionRequiresDiagram } from "./writing-quality.server";

function makeGrading(overrides: Partial<Grading> = {}): Grading {
  return {
    total_mark: 17,
    max_mark: 20,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate A-Level concepts." },
      analysis: { awarded: 10, out_of: 12, comment: "Strong multi-perspective analysis." },
      evaluation: { awarded: 5, out_of: 6, comment: "Balanced evaluation with clear judgement." },
    },
    examiner_summary: "Strong Top Band response. To reach Top Band, deepen long-run analysis.",
    strengths: [
      "The explanation of market equilibrium and its role in achieving economic efficiency is clear and logically structured.",
      "The explanation of market equilibrium and its role in achieving economic efficiency is sound: 'Market equilibrium occurs when firms produce exactly what is demanded without surplus or deficit.'",
      "Accurately applies game theory using a pay-off matrix.",
    ],
    weaknesses: [
      "The incentive to cheat is mentioned but not fully developed in terms of cartel breakdown over time.",
      "While the analysis is thorough, the absence of a diagram to illustrate efficiency comparisons slightly limits depth.",
      "To reach Top Band, prioritize which factor is most decisive in determining cartel stability.",
    ],
    missing_elements: {
      definitions: [],
      analysis: [
        "A deeper analysis of how the incentive to cheat leads to cartel breakdown over time.",
        "Explicit link between n-firm concentration ratios and market power.",
      ],
      evaluation: [
        "Prioritize which factor is most decisive in determining cartel stability.",
      ],
      examples: [],
      diagrams: ["Include a labeled diagram showing efficiency comparisons."],
    },
    actionable_feedback: [
      "Deepen your analysis by explaining how the incentive to cheat leads to cartel breakdown over time.",
      "Include a clear diagram comparing monopoly and perfect competition.",
      "Add a short paragraph on regulatory enforcement penalties (e.g. CMA or EU antitrust fines) to strengthen your real-world context.",
    ],
    suggested_resources: ["Chapter 7"],
    suggested_practice: ["Practice oligopoly evaluation"],
    confidence: 0.94,
    audited: true,
    sources: [],
    anchorsUsed: 1,
    ...overrides,
  };
}

describe("Feedback Deduplication, Paper Scope & 20-Mark Calibration", () => {
  it("deduplicates near-identical feedback bullets even when one contains a long verbatim quote", () => {
    const deduped = deduplicateFeedbackPoints([
      "The explanation of market equilibrium and its role in achieving economic efficiency is clear and logically structured.",
      "The explanation of market equilibrium and its role in achieving economic efficiency is sound: 'Market equilibrium occurs when firms produce exactly what is demanded without surplus or deficit.'",
      "Strong application of the prisoner's dilemma pay-off matrix.",
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toContain("market equilibrium");
    expect(deduped[1]).toContain("prisoner's dilemma");
  });

  it("eliminates cross-section repetition, unrequested diagram demands, and 'to reach Top Band' on Top Band essays", () => {
    const g = makeGrading();
    const cleaned = deduplicateAcrossSections(
      g,
      "Evaluate whether a contestable monopoly is more beneficial for economic efficiency than perfect competition.",
    );

    // Duplicate strength collapsed
    expect(cleaned.strengths).toHaveLength(2);
    // Unrequested diagram weakness & missing diagram & actionable diagram stripped
    expect(cleaned.weaknesses.some((w) => /diagram/i.test(w))).toBe(false);
    expect(cleaned.missing_elements.diagrams).toEqual([]);
    expect(cleaned.actionable_feedback.some((a) => /diagram/i.test(a))).toBe(false);
    // Repeated missing_elements.analysis[0] ("incentive to cheat ... cartel breakdown") stripped, distinct item kept
    expect(cleaned.missing_elements.analysis).toHaveLength(1);
    expect(cleaned.missing_elements.analysis[0]).toContain("concentration ratios");
    // Repeated missing_elements.evaluation[0] stripped
    expect(cleaned.missing_elements.evaluation).toHaveLength(0);
    // Distinct actionable item preserved; duplicate stripped
    expect(cleaned.actionable_feedback).toHaveLength(1);
    expect(cleaned.actionable_feedback[0]).toContain("antitrust fines");
    // Top Band phrasing fixed
    expect(cleaned.examiner_summary).not.toMatch(/to reach Top Band/i);
    expect(cleaned.examiner_summary).toMatch(/push toward full marks/i);
  });

  it("preserves distinct diagram feedback when the exam question explicitly requests a diagram", () => {
    const g = makeGrading({
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: ["Monopoly MR=MC cost-revenue diagram marking deadweight welfare loss."],
      },
    });
    const cleaned = deduplicateAcrossSections(
      g,
      "With the help of a diagram, evaluate whether a contestable monopoly achieves economic efficiency.",
    );
    expect(cleaned.weaknesses.some((w) => /diagram/i.test(w))).toBe(true);
    expect(cleaned.missing_elements.diagrams).toHaveLength(1);
  });

  it("strictly separates A-Level Paper 4 scope from AS-Level Paper 2 scope", () => {
    const a2Scope = buildPaperScopeDirective(20);
    expect(a2Scope).toContain("PAPER 4 (A LEVEL");
    expect(a2Scope).toContain("equi-marginal principle");
    expect(a2Scope).not.toContain("NO marginal utility");

    const asScope = buildPaperScopeDirective(12);
    expect(asScope).toContain("PAPER 2 (AS LEVEL ONLY)");
    expect(asScope).toContain("NO marginal utility");

    const a2Eval = buildAoEvaluationDirective(20, { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 });
    expect(a2Eval).toContain("TABLE A");
    expect(a2Eval).toContain("TABLE B");
    expect(a2Eval).toContain("WHERE APPROPRIATE");
  });

  it("strictly separates 20-mark A-Level anchors from AS-Level 8m/12m anchors", () => {
    const anchors: Anchor[] = [
      { question: "Inflation 12m question", essay_text: "as essay", mark: 11, max_mark: 12, band_label: "top", notes: "inflation" },
      { question: "Oligopoly 20m question", essay_text: "a2 essay", mark: 17, max_mark: 20, band_label: "top", notes: "oligopoly" },
    ];

    const for20m = selectBestAnchors(anchors, "Consider whether central banks should have a 0% inflation target", 20, 2);
    expect(for20m).toHaveLength(1);
    expect(for20m[0].max_mark).toBe(20);

    const for12m = selectBestAnchors(anchors, "Oligopoly or inflation", 12, 2);
    expect(for12m).toHaveLength(1);
    expect(for12m[0].max_mark).toBe(12);
  });

  it("triggers arbitration on 20-mark essays when pass delta >= 3", () => {
    const p1 = makeGrading({ total_mark: 13, band: "Upper Middle Band" });
    const p2 = makeGrading({ total_mark: 16, band: "Top Band" });
    expect(shouldTriggerArbitration(p1, p2, 20).shouldArbitrate).toBe(true);
  });

  it("never falsely claims 'without full paragraph structure' on a multi-paragraph undersized essay", () => {
    const split20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
    const paras = Array(5).fill(Array(75).fill("economics").join(" ")).join("\n\n"); // 375 words, 5 paragraphs
    const quality = analyzeEssayQuality(paras, 20, split20);
    expect(quality.isUndersized).toBe(true);
    expect(quality.isMonolithicBlock).toBe(false);

    const graded = makeGrading({
      total_mark: 15,
      band: "Upper Middle Band",
      examiner_summary: "Specific economic feedback about efficiency.",
    });
    const out = applyWritingQualityGuardrail(graded, quality, 20, split20);
    expect(out.total_mark).toBeLessThanOrEqual(13);
    expect(out.examiner_summary).toContain("Specific economic feedback about efficiency.");
    expect(out.examiner_summary).not.toMatch(/without full paragraph structure/i);
  });

  it("does not artificially cap well-paragraphed 420-word timed handwritten Cambridge 20-mark essays", () => {
    const split20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
    const para = Array(60).fill("inflation").join(" ");
    const essay420 = [para, para, para, para, para, para, para].join("\n\n");
    const quality = analyzeEssayQuality(essay420, 20, split20);
    expect(quality.paragraphCount).toBe(7);
    expect(quality.isUndersized).toBe(false);
    expect(quality.maxAllowableTotalMark).toBeGreaterThanOrEqual(16);
  });

  it("recognises single-newline pasted paragraphs so genuine multi-paragraph essays are not capped as monolithic", () => {
    const split12 = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
    const singleNewlineEssay = [
      Array(80).fill("inflation").join(" ") + ".",
      Array(95).fill("demand").join(" ") + ".",
      Array(110).fill("supply").join(" ") + ".",
      Array(90).fill("evaluation").join(" ") + ".",
      Array(60).fill("conclusion").join(" ") + ".",
    ].join("\n");

    const quality = analyzeEssayQuality(singleNewlineEssay, 12, split12);
    expect(quality.paragraphCount).toBe(5);
    expect(quality.isMonolithicBlock).toBe(false);
    expect(quality.maxAllowableTotalMark).toBe(12);
  });

  it("preserves possessive apostrophes in verifyVerbatimQuotes without corrupting words like theory's", () => {
    const essay = "The law of diminishing marginal utility explains demand for normal goods.";
    const feedback = "The essay evaluates the theory's applicability to 'all goods and services' and the candidate's conclusion.";
    const verified = verifyVerbatimQuotes(feedback, essay);
    expect(verified).toContain("theory's");
    expect(verified).toContain("candidate's");
    expect(verified).not.toContain("theorys");
  });

  it("extracts the exact question Indicative Content window from giant 25k-char Paper 4 mark schemes instead of Page 1 boilerplate", () => {
    const coverBoilerplate =
      "This document consists of 17 printed pages. Generic Marking Principle 1. Mark schemes should be read in conjunction with the question paper. ".repeat(
        80,
      );
    const actualQuestionMs =
      "\n[PAGE 12] Question 3: The introduction of a trade union into a perfectly competitive labour market will always lead to higher wage levels and unemployment. Indicative content: MRPL diagram, wage floor above equilibrium, L2 maximum if no accurate diagram provided. AO3 Evaluation: productivity agreements, capital-labour substitution.\n";
    const trailing = "Question 5 Globalisation and low-income country standard of living. ".repeat(60);

    const extracted = extractRelevantSnippetWindow(
      coverBoilerplate + actualQuestionMs + trailing,
      600,
      "The introduction of a trade union into a perfectly competitive labour market will always lead to higher wage levels and unemployment.",
    );

    expect(extracted).toContain("Indicative content: MRPL diagram");
    expect(extracted).toContain("L2 maximum if no accurate diagram provided");
    expect(extracted).not.toContain("Generic Marking Principle 1");
  });

  it("enforces Cambridge Level 2 AO2 maximum when a required diagram is omitted, without affecting unrequested-diagram questions", () => {
    const qReq = "With the help of a diagram, assess whether a buffer stock scheme benefits always outweigh its disadvantages.";
    const qNoReq = "Assess whether protectionism is the best way to correct a current account deficit.";
    const essayNoDiag = Array(4).fill(Array(90).fill("buffer stock price band").join(" ")).join("\n\n");
    const essayWithDiag = `[DIAGRAM: Buffer Stock | axes: P, Q]\n\n${essayNoDiag}`;

    expect(questionRequiresDiagram(qReq)).toBe(true);
    expect(questionRequiresDiagram(qNoReq)).toBe(false);
    expect(essayHasDiagram(essayNoDiag)).toBe(false);
    expect(essayHasDiagram(essayWithDiag)).toBe(true);

    const split12 = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
    const qProfile = analyzeEssayQuality(essayNoDiag, 12, split12);
    const highDraft = makeGrading({
      total_mark: 11,
      max_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Precise." },
        analysis: { awarded: 5, out_of: 6, comment: "Strong written analysis." },
        evaluation: { awarded: 4, out_of: 4, comment: "Balanced evaluation." },
      },
      weaknesses: ["Could deepen storage cost point."],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
    });

    // Omitting required diagram caps 12m AO2 at Level 2 max (4/6) and adds diagram weakness
    const capped = applyWritingQualityGuardrail(highDraft, qProfile, 12, split12, essayNoDiag, qReq);
    expect(capped.ao_breakdown.analysis.awarded).toBe(4);
    expect(capped.total_mark).toBe(10);
    expect(capped.missing_elements.diagrams.length).toBeGreaterThan(0);

    // Same essay WITH diagram keeps full AO2 = 5/6
    const uncappedWithDiag = applyWritingQualityGuardrail(highDraft, qProfile, 12, split12, essayWithDiag, qReq);
    expect(uncappedWithDiag.ao_breakdown.analysis.awarded).toBe(5);

    // Question that did NOT request a diagram keeps full AO2 = 5/6
    const uncappedNoReq = applyWritingQualityGuardrail(highDraft, qProfile, 12, split12, essayNoDiag, qNoReq);
    expect(uncappedNoReq.ao_breakdown.analysis.awarded).toBe(5);
  });

  it("allows well-paragraphed 260-word Level 2 20-mark essays up to 11/20 instead of burying them at 7/20", () => {
    const split20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
    const essay260 = Array(4).fill(Array(65).fill("utility").join(" ")).join("\n\n");
    const quality = analyzeEssayQuality(essay260, 20, split20);
    expect(quality.isSeverelyUndersized).toBe(false);
    expect(quality.maxAllowableTotalMark).toBe(11);
    expect(quality.maxAllowableAo2).toBe(7);
    expect(quality.maxAllowableAo3).toBe(3);
  });

  it("enforces Cambridge Level 1 ceilings when fatal_misconceptions_found=true and AO3=0 on incoherent 8m evaluation", () => {
    const split20 = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };
    const raw20 = {
      mechanism_validation: { core_mechanisms_sound: false, fatal_misconceptions_found: true, error_evidence_quotes: ["higher interest rates lower borrowing cost"] },
      ao_breakdown: {
        knowledge: { awarded: 1, out_of: 2, comment: "Basic terms." },
        analysis: { awarded: 8, out_of: 12, comment: "Inverted mechanism." },
        evaluation: { awarded: 3, out_of: 6, comment: "Generic closing." },
      },
      examiner_summary: "Broken transmission.",
      strengths: ["Defines inflation."],
      weaknesses: ["Inverts interest rate transmission."],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: ["Fix the interest rate transmission chain."],
    };
    const norm20 = normaliseGrading(raw20, 20, split20);
    expect(norm20.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
    expect(norm20.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(2);
    expect(norm20.total_mark).toBeLessThanOrEqual(7);

    const split8 = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };
    const raw8 = {
      ao_breakdown: {
        knowledge: { awarded: 1, out_of: 2, comment: "Wrong producer surplus definition." },
        analysis: { awarded: 2, out_of: 4, comment: "Basic leftward shift." },
        evaluation: { awarded: 1, out_of: 2, comment: "The evaluation is incoherent and unsupported." },
      },
      examiner_summary: "Basic shift with incoherent evaluation.",
      strengths: ["Draws supply shift."],
      weaknesses: ["The evaluation is incoherent and fails to answer the prompt."],
      missing_elements: {
        definitions: [],
        analysis: ["Step-by-step transmission of how higher interest rates increase the cost of borrowing and reduce AD."],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: ["Rewrite the paragraph to explain how higher interest rates increase the cost of borrowing and reduce AD."],
    };
    const norm8 = normaliseGrading(raw8, 8, split8);
    expect(norm8.ao_breakdown.evaluation.awarded).toBe(0);
    expect(norm8.total_mark).toBe(3);
    expect(norm8.missing_elements.analysis).toEqual([]);
  });

  it("pairs a Top/High anchor with a contrasting Middle/Low anchor for multi-band calibration", () => {
    const anchors: Anchor[] = [
      { question: "Evaluate monetary policy to reduce inflation", essay_text: "A", mark: 16, max_mark: 20, band_label: "top", notes: "High" },
      { question: "Evaluate monetary policy to control inflation", essay_text: "B", mark: 17, max_mark: 20, band_label: "top", notes: "High 2" },
      { question: "Evaluate monetary policy to reduce inflation", essay_text: "C", mark: 10, max_mark: 20, band_label: "middle", notes: "Mid" },
    ];
    const picked = selectBestAnchors(anchors, "Evaluate monetary policy to reduce inflation", 20, 2);
    expect(picked).toHaveLength(2);
    expect(picked.map((a) => a.band_label).sort()).toEqual(["middle", "top"]);
  });
});
