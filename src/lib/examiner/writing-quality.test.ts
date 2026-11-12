import { describe, expect, it } from "vitest";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
} from "./writing-quality.server";
import type { Grading } from "./types";

const SAMPLE_AI_ESSAY_275_WORDS = `**Deflation** is a sustained decrease in the general price level of goods and services, and central banks use **expansionary monetary policy**—lowering policy interest rates, increasing the money supply, or conducting Quantitative Easing ($QE$)—to shift Aggregate Demand ($AD = C + I + G + X - M$) rightward, pushing real GDP toward full employment and driving the general price level back up toward target. Lowering interest rates reduces borrowing costs to stimulate household **consumption ($C$)** and corporate **investment ($I$)**, while $QE$ injects liquidity into commercial banks to lower long-term bond yields and expand credit. Additionally, lower domestic interest rates induce short-term capital ("hot money") outflows, causing an **exchange rate depreciation** that makes exports cheaper and imports more expensive, boosting net export demand ($X - M$) and raising imported inflation. However, expansionary monetary policy suffers from severe limitations in deep deflationary recessions due to the **zero lower bound (ZLB)** on nominal interest rates; when nominal rates reach 0%, high deflation leaves real interest rates positive ($\\text{Real Rate} = \\text{Nominal Rate} - \\text{Inflation Rate}$), continuing to discourage borrowing. Furthermore, **deflationary expectations** lead consumers to postpone purchases in anticipation of lower future prices, while weak confidence makes investment interest-inelastic and prompts commercial banks to hoard $QE$ liquidity rather than lend. Therefore, while expansionary monetary policy is effective against mild deflation, it is **not the single best method in isolation** for severe deflation, as it is far more powerful when combined with **expansionary fiscal policy** (direct government spending $G$), which directly injects demand into the economy without relying on private sector borrowing confidence, creating a multiplier effect that restores market sentiment and allows monetary transmission to function effectively again.`;

const GENUINE_STUDENT_ESSAY_550_WORDS = `Deflation refers to a sustained decrease in the general price level of an economy over a given period of time. Central banks primarily tackle deflation through expansionary monetary policy, which involves lowering policy interest rates, increasing the money supply, or implementing unconventional measures such as Quantitative Easing (QE) to stimulate aggregate demand.

The primary transmission mechanism operates through the reduction of the central bank policy rate. A reduction in the base rate lowers interbank lending rates, which commercial banks pass on to households and businesses through cheaper mortgages, credit cards, and corporate loans. Lower borrowing costs incentivize households to increase consumption, especially of durable goods, by reducing the opportunity cost of saving. Simultaneously, lower financing costs increase the net present value of potential investment projects, prompting firms to expand capital investment. Consequently, the components of aggregate demand (AD = C + I + G + X - M) expand, shifting the AD curve rightward, raising real output, and placing upward pressure on the price level.

When policy interest rates approach the zero lower bound, central banks may execute Quantitative Easing. By creating electronic central bank reserves to purchase government bonds and private financial assets from the secondary market, the central bank raises bond prices. Because bond prices and yields are inversely related, this policy compresses long-term yields across financial markets, lowering the long-term borrowing costs for corporations and encouraging commercial bank lending. Furthermore, lower domestic yields can trigger short-term capital outflows, leading to a depreciation of the exchange rate which makes domestic exports more competitive and raises the price of imported goods, directly adding to headline inflation.

However, expansionary monetary policy faces critical limitations during severe deflationary episodes. When an economy enters a liquidity trap, nominal interest rates cannot be reduced significantly below zero, meaning that persistent deflation keeps real interest rates positive, actively discouraging borrowing. Moreover, persistent deflation engenders entrenched deflationary expectations: rational consumers delay purchases of goods in anticipation of further price declines, while firms postpone capital investments due to widespread pessimistic business confidence. Under these conditions, the demand for credit becomes highly interest-inelastic, rendering rate cuts and QE largely ineffective as commercial banks choose to hoard excess reserves.

In assessing whether monetary policy is the single best method, it is crucial to compare it against alternative interventions such as expansionary fiscal policy. While monetary policy acts with greater operational speed and avoids parliamentary delays, its efficacy relies entirely on the willingness of the private sector to borrow and spend. In contrast, discretionary government spending injects autonomous demand directly into the circular flow of income, stimulating national output through the multiplier effect without requiring prior borrowing confidence from households.

In conclusion, expansionary monetary policy is not the single best method to correct severe deflation when used in isolation. In mild deflation, interest rate cuts and exchange rate pass-through can successfully stabilize prices. However, in deep deflationary depressions characterized by a liquidity trap and pessimistic expectations, monetary policy must be coordinated alongside direct fiscal stimulus to restore price stability effectively.`;

function createMockGrading(totalMark: number, k: number, a: number, e: number): Grading {
  return {
    total_mark: totalMark,
    max_mark: 12,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: k, out_of: 2, comment: "Full knowledge." },
      analysis: { awarded: a, out_of: 6, comment: "Full analysis." },
      evaluation: { awarded: e, out_of: 4, comment: "Full evaluation." },
    },
    examiner_summary: "High calibre essay achieving top band.",
    strengths: ["Strong definitions", "Complete mechanisms"],
    weaknesses: ["Could prioritize criteria slightly more"],
    missing_elements: {
      definitions: [],
      analysis: [],
      evaluation: [],
      examples: [],
      diagrams: [],
    },
    actionable_feedback: ["Compare with supply side"],
    suggested_resources: ["Topic 5.2"],
    suggested_practice: ["Practice 12-mark essay"],
    confidence: 0.95,
    audited: true,
    sources: [],
    anchorsUsed: 0,
  };
}

describe("Cambridge 9708 Writing Quality & Structural Calibration Engine", () => {
  describe("Analysis of Underdeveloped / AI-Generated Script (User Sample)", () => {
    it("detects word count, monolithic paragraph, and AI artifacts in user sample", () => {
      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const quality = analyzeEssayQuality(SAMPLE_AI_ESSAY_275_WORDS, 12, split);

      expect(quality.wordCount).toBeGreaterThanOrEqual(265);
      expect(quality.wordCount).toBeLessThan(300);
      expect(quality.paragraphCount).toBe(1);
      expect(quality.isMonolithicBlock).toBe(true);
      expect(quality.isUndersized).toBe(true);
      expect(quality.hasAiArtifacts).toBe(true);
      expect(quality.boldingCount).toBeGreaterThanOrEqual(6);
      expect(quality.latexCount).toBeGreaterThanOrEqual(3);

      // Mandatory Cambridge ceiling: cannot exceed Upper Middle Band (max 6-7/12)
      expect(quality.maxAllowableTotalMark).toBeLessThanOrEqual(7);
      expect(quality.maxAllowableAo2).toBeLessThanOrEqual(4);
      expect(quality.maxAllowableAo3).toBeLessThanOrEqual(2);
    });

    it("strictly penalizes and clamps an overgenerous 11/12 mark to Middle Band", () => {
      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const quality = analyzeEssayQuality(SAMPLE_AI_ESSAY_275_WORDS, 12, split);
      const overmarked = createMockGrading(11, 2, 6, 3);

      const clamped = applyWritingQualityGuardrail(overmarked, quality, 12, split);

      expect(clamped.total_mark).toBeLessThanOrEqual(7);
      expect(clamped.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
      expect(clamped.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(2);
      expect(clamped.band).not.toBe("Top Band");
      expect(clamped.band).toMatch(/(Middle Band|Lower Middle Band|Upper Middle Band)/);

      // Verify that weaknesses highlight brevity, paragraphing, and AI formatting
      const allWeaknesses = clamped.weaknesses.join(" ").toLowerCase();
      expect(allWeaknesses).toMatch(/(word|compressed|paragraph|unstructured|markdown|latex|ai)/);

      // Verify that actionable feedback advises paragraph structuring
      const allFeedback = clamped.actionable_feedback.join(" ").toLowerCase();
      expect(allFeedback).toMatch(/(paragraph|structure)/);
    });
  });

  describe("Preservation of Genuinely High-Quality Student Essays", () => {
    it("does not penalize or cap a well-developed 550-word structured student essay", () => {
      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const quality = analyzeEssayQuality(GENUINE_STUDENT_ESSAY_550_WORDS, 12, split);

      expect(quality.wordCount).toBeGreaterThanOrEqual(500);
      expect(quality.paragraphCount).toBeGreaterThanOrEqual(4);
      expect(quality.isUndersized).toBe(false);
      expect(quality.isMonolithicBlock).toBe(false);
      expect(quality.hasAiArtifacts).toBe(false);
      expect(quality.maxAllowableTotalMark).toBe(12);
      expect(quality.maxAllowableAo2).toBe(6);
      expect(quality.maxAllowableAo3).toBe(4);

      const topGrade = createMockGrading(11, 2, 5, 4);
      const processed = applyWritingQualityGuardrail(topGrade, quality, 12, split);

      // Full marks and feedback are completely preserved
      expect(processed.total_mark).toBe(11);
      expect(processed.band).toBe("Top Band");
      expect(processed.ao_breakdown.analysis.awarded).toBe(5);
      expect(processed.ao_breakdown.evaluation.awarded).toBe(4);
    });
  });

  describe("Tariff-Specific Length Thresholds", () => {
    it("enforces 8-mark thresholds (< 200 words capped, 350 words uninhibited)", () => {
      const split = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };

      const shortText = "Subsidies shift supply right. Quantity increases. However it costs government money. In conclusion subsidies work.";
      const shortQuality = analyzeEssayQuality(shortText, 8, split);
      expect(shortQuality.isSeverelyUndersized).toBe(true);
      expect(shortQuality.maxAllowableTotalMark).toBeLessThanOrEqual(5);

      const words350 = Array(350).fill("economics").join(" ");
      const paragraphs350 = `${words350.slice(0, 500)}\n\n${words350.slice(500, 1000)}\n\n${words350.slice(1000)}`;
      const healthyQuality = analyzeEssayQuality(paragraphs350, 8, split);
      expect(healthyQuality.isUndersized).toBe(false);
      expect(healthyQuality.maxAllowableTotalMark).toBe(8);
    });

    it("enforces 20-mark thresholds (< 550 words capped, 900 words uninhibited)", () => {
      const split = { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 };

      const text400Words = Array(400).fill("word").join(" ");
      const shortQuality = analyzeEssayQuality(text400Words, 20, split);
      expect(shortQuality.isUndersized).toBe(true);
      expect(shortQuality.maxAllowableTotalMark).toBeLessThanOrEqual(12);

      const text900Words = Array(900).fill("word").join(" ");
      const paragraphed900 = `${text900Words.slice(0, 1000)}\n\n${text900Words.slice(1000, 2000)}\n\n${text900Words.slice(2000, 3000)}\n\n${text900Words.slice(3000)}`;
      const healthyQuality = analyzeEssayQuality(paragraphed900, 20, split);
      expect(healthyQuality.isUndersized).toBe(false);
      expect(healthyQuality.maxAllowableTotalMark).toBe(20);
    });
  });

  describe("Prompt Directive Generation", () => {
    it("generates clear examiner instructions referencing word count and ceiling limits", () => {
      const split = { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
      const quality = analyzeEssayQuality(SAMPLE_AI_ESSAY_275_WORDS, 12, split);
      const directive = buildQualityPromptDirective(quality, 12);

      expect(directive).toContain("CANDIDATE SUBMISSION WRITING QUALITY & STRUCTURAL PROFILE:");
      expect(directive).toContain("Word count:");
      expect(directive).toContain("UNDERSIZED");
      expect(directive).toContain("MANDATORY CAMBRIDGE CALIBRATION CEILING");
      expect(directive).toContain("AO2 Analysis");
    });
  });
  describe("8-Mark Evaluative Essay 7/8 Strict Failsafe", () => {
    const split8 = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };
    const mockHealthyQuality = {
      wordCount: 380,
      paragraphCount: 4,
      boldingCount: 0,
      latexCount: 0,
      hasMarkdownBullets: false,
      hasAiArtifacts: false,
      isUndersized: false,
      isSeverelyUndersized: false,
      isMonolithicBlock: false,
      targetRangeText: "300–450 words",
      maxAllowableTotalMark: 8,
      maxAllowableAo2: 4,
      maxAllowableAo3: 2,
      qualityIssues: [],
    };

    it("clamps an 8/8 essay to 7/8 when conclusion is not satisfied or evaluation criteria unmet", () => {
      const overgenerous8: Grading = {
        total_mark: 8,
        max_mark: 8,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Precise definitions." },
          analysis: { awarded: 4, out_of: 4, comment: "Thorough causal mechanisms." },
          evaluation: { awarded: 2, out_of: 2, comment: "Good points, but concluding judgement is not fully satisfied." },
        },
        examiner_summary: "Well argued response.",
        strengths: ["Strong definitions", "Detailed analysis"],
        weaknesses: ["Conclusion is partially incomplete and unsupported"],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: ["More decisive evaluation criterion needed"],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: ["Strengthen the concluding judgement"],
        suggested_resources: ["Topic 1.4"],
        suggested_practice: ["Practice 8-mark evaluation"],
        confidence: 0.95,
      };

      const clamped = applyWritingQualityGuardrail(overgenerous8, mockHealthyQuality, 8, split8);
      expect(clamped.total_mark).toBe(7);
      expect(clamped.ao_breakdown.evaluation.awarded).toBe(1);
      expect(clamped.ao_breakdown.evaluation.comment).toContain("keeping the essay at 7 instead of 8");
    });

    it("allows a truly flawless 8-mark essay with fully satisfied conclusion to score 8/8", () => {
      const perfect8: Grading = {
        total_mark: 8,
        max_mark: 8,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Precise definitions." },
          analysis: { awarded: 4, out_of: 4, comment: "Complete causal chains." },
          evaluation: { awarded: 2, out_of: 2, comment: "Balanced perspectives with a fully justified, decisive concluding verdict answering the prompt." },
        },
        examiner_summary: "Flawless Cambridge 8-mark essay.",
        strengths: ["Exemplary knowledge", "Clear causal links", "Decisive justified conclusion"],
        weaknesses: [],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: [],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: [],
        suggested_resources: [],
        suggested_practice: [],
        confidence: 0.98,
      };

      const result = applyWritingQualityGuardrail(perfect8, mockHealthyQuality, 8, split8);
      expect(result.total_mark).toBe(8);
      expect(result.ao_breakdown.evaluation.awarded).toBe(2);
    });
  });

  describe("Chapter 5 PPC Misconception Failsafe", () => {
    const split8 = { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 };
    const mockHealthyQuality = {
      wordCount: 380,
      paragraphCount: 4,
      boldingCount: 0,
      latexCount: 0,
      hasMarkdownBullets: false,
      hasAiArtifacts: false,
      isUndersized: false,
      isSeverelyUndersized: false,
      isMonolithicBlock: false,
      targetRangeText: "300–450 words",
      maxAllowableTotalMark: 8,
      maxAllowableAo2: 4,
      maxAllowableAo3: 2,
      qualityIssues: [],
    };

    it("strips false praise linking point inside PPC to allocative inefficiency and deducts AO2", () => {
      const flawedGrading: Grading = {
        total_mark: 8,
        max_mark: 8,
        band: "Top Band",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Good PPC definition." },
          analysis: { awarded: 4, out_of: 4, comment: "Analysis discusses points on and inside curve." },
          evaluation: { awarded: 2, out_of: 2, comment: "Reasoned conclusion." },
        },
        examiner_summary: "Good essay.",
        strengths: [
          "Accurately defines the PPC",
          "Excellent analysis linking a point inside the PPC to allocative inefficiency and Pareto efficiency",
        ],
        weaknesses: [],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: [],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: [],
        suggested_resources: [],
        suggested_practice: [],
        confidence: 0.9,
      };

      const fixed = applyWritingQualityGuardrail(flawedGrading, mockHealthyQuality, 8, split8);

      // False praise stripped from strengths
      expect(fixed.strengths.some((s) => s.toLowerCase().includes("allocative") && s.toLowerCase().includes("ppc"))).toBe(false);

      // Weakness added calling out the misconception
      expect(fixed.weaknesses.some((w) => w.includes("Economic misconception on PPC and efficiency"))).toBe(true);

      // AO2 reduced by 1 for the minor analytical error (4/4 -> 3/4)
      expect(fixed.ao_breakdown.analysis.awarded).toBe(3);
      expect(fixed.total_mark).toBeLessThanOrEqual(7);
    });
  });
});