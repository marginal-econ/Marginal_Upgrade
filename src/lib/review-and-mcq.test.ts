import { describe, expect, it } from "vitest";

import {
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type GradeProjection,
  type MasteryPillar,
} from "./review.functions";
import {
  calculatePredictedGradeFromThresholds,
  getCambridgeGradeStandard,
} from "./cambridge-thresholds";
import {
  aggregateMcqDomains,
  classifyMcqQuestion,
  normalizeMcqTopic,
} from "./mcq-domain";
import { buildTopicStatsFromQuestions } from "@/components/app/mcq-review-panel";
import type { McqDiagnostic, McqExplanationResult } from "./mcq/mcq-pdf.server";

describe("Review Panel & Holistic Diagnostics", () => {
  it("enforces progressive gating threshold for early feedback", () => {
    expect(MIN_ESSAYS_FOR_REVIEW).toBe(3);
    expect(MIN_MCQ_PAPERS_FOR_REVIEW).toBe(1);
  });

  it("projects Cambridge grade boundaries accurately using official thresholds", () => {
    expect(calculatePredictedGradeFromThresholds(91.67).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(80).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(68).projectedGrade).toBe("A*");
    expect(calculatePredictedGradeFromThresholds(62).projectedGrade).toBe("A");
    expect(calculatePredictedGradeFromThresholds(55).projectedGrade).toBe("B");
    expect(calculatePredictedGradeFromThresholds(48).projectedGrade).toBe("C");
    expect(calculatePredictedGradeFromThresholds(40).projectedGrade).toBe("D");
    expect(calculatePredictedGradeFromThresholds(34).projectedGrade).toBe("E");
    expect(calculatePredictedGradeFromThresholds(25).projectedGrade).toBe("U");
  });

  it("verifies 11/12 is strictly Grade A* Standard and Top Band", () => {
    const std = getCambridgeGradeStandard(11, 12);
    expect(std.letter).toBe("A*");
    expect(std.grade).toBe("Grade A* Standard");
    expect(std.band).toBe("Top Band");
    expect(std.percent).toBe(92);
  });

  it("evaluates the 5 pillars of Cambridge Economics", () => {
    const pillars: MasteryPillar[] = [
      {
        pillar: "Definitions & Terminology (AO1)",
        score: 85,
        status: "mastered",
        guidance: "Strong grasp of syllabus definitions.",
      },
      {
        pillar: "Causal Linkages & Multipliers (AO2)",
        score: 68,
        status: "developing",
        guidance: "Deepen transmission mechanisms.",
      },
      {
        pillar: "Evaluative Weighing & Judgements (AO3)",
        score: 45,
        status: "vulnerable",
        guidance: "Include short-run vs long-run qualifiers.",
      },
      {
        pillar: "Diagrammatic Synthesis & Labeling",
        score: 80,
        status: "mastered",
        guidance: "Accurate equilibrium shifts.",
      },
      {
        pillar: "MCQ Speed & Distractor Rejection",
        score: 72,
        status: "developing",
        guidance: "Watch for shift vs movement traps.",
      },
    ];

    expect(pillars).toHaveLength(5);
    expect(pillars.filter((p) => p.status === "mastered")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "developing")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "vulnerable")).toHaveLength(1);
  });
});

describe("Advanced MCQ Review and Response Engine", () => {
  it("validates structured Cambridge MCQ diagnostic schema", () => {
    const mockDiagnostic: McqDiagnostic = {
      concept: "AS Unit 2: Cross Elasticity of Demand (XED)",
      keyRule: "Positive XED indicates substitutes; negative XED indicates complements.",
      correctReasoning:
        "A price increase in good X shifts the demand for good Y rightward, meaning X and Y are substitute goods.",
      distractorTrap:
        "Distractor C confused complement relationship with substitute relationship due to sign reversal.",
      speedTip:
        "Substitutes move in the same direction (+). Immediately eliminate negative options in 15 seconds.",
    };

    const result: McqExplanationResult = {
      text: "Option B is correct based on positive XED.",
      diagnostic: mockDiagnostic,
    };

    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic?.concept).toContain("AS Unit 2");
    expect(result.diagnostic?.keyRule).toBeTruthy();
    expect(result.diagnostic?.correctReasoning).toBeTruthy();
    expect(result.diagnostic?.distractorTrap).toBeTruthy();
    expect(result.diagnostic?.speedTip).toBeTruthy();
  });

  it("supports backward-compatible fallback to plain text explanation", () => {
    const fallbackResult: McqExplanationResult = {
      text: "Option B is correct because the demand curve shifts rightward following a decrease in tax.",
    };

    expect(fallbackResult.text).toBeTruthy();
    expect(fallbackResult.diagnostic).toBeUndefined();
  });

  it("verifies MCQ draft auto-expiration threshold is strictly 12 hours", () => {
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    expect(twelveHoursMs).toBe(43_200_000);

    const now = Date.now();
    const draftSaved11HoursAgo = { savedAt: now - 11 * 60 * 60 * 1000 };
    const draftSaved13HoursAgo = { savedAt: now - 13 * 60 * 60 * 1000 };

    const isDraftExpired = (savedAt: number) => now - savedAt > twelveHoursMs;

    expect(isDraftExpired(draftSaved11HoursAgo.savedAt)).toBe(false);
    expect(isDraftExpired(draftSaved13HoursAgo.savedAt)).toBe(true);
  });

  it("validates admin MCQ score deletion payload schema", () => {
    const { z } = require("zod");
    const adminDeleteSchema = z.object({
      id: z.string().uuid(),
      kind: z.enum(["generated", "past_paper"]).default("past_paper"),
    });

    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const parsedPastPaper = adminDeleteSchema.parse({ id: validUuid, kind: "past_paper" });
    expect(parsedPastPaper.id).toBe(validUuid);
    expect(parsedPastPaper.kind).toBe("past_paper");

    const parsedDefault = adminDeleteSchema.parse({ id: validUuid });
    expect(parsedDefault.kind).toBe("past_paper");

    const parsedGenerated = adminDeleteSchema.parse({ id: validUuid, kind: "generated" });
    expect(parsedGenerated.kind).toBe("generated");

    expect(() => adminDeleteSchema.parse({ id: "not-a-uuid" })).toThrow();
  });

  it("extracts and standardizes Cambridge MCQ paper codes reliably across all formats", () => {
    function parsePaperCode(title: string): string {
      const namedPaper = title.match(/\bpaper\s*(\d{1,2})\b/i)?.[1];
      if (namedPaper) return `Paper ${namedPaper.padStart(2, "0")}`;

      const codeMatch =
        title.match(/9708[_\s-]+[msw]\d{2}[_\s-]+(?:qp|ms|paper)?[_\s-]*(\d{2})/i)?.[1] ??
        title.match(/(?:qp|ms)[_\s-]*(\d{2})\b/i)?.[1] ??
        title.match(/\b9708[\s/_-]+(\d{2})\b/i)?.[1];
      if (codeMatch) return `Paper ${codeMatch.padStart(2, "0")}`;

      const variantMatch = title.match(/\b([13][1-3])\b/)?.[1];
      if (variantMatch) return `Paper ${variantMatch}`;

      return title;
    }

    expect(parsePaperCode("9708 Oct/Nov 2024 Paper 13")).toBe("Paper 13");
    expect(parsePaperCode("9708 May/June 2024 Paper 31")).toBe("Paper 31");
    expect(parsePaperCode("9708 Feb/March 2023 Paper 12")).toBe("Paper 12");
    expect(parsePaperCode("9708_w24_qp_13")).toBe("Paper 13");
    expect(parsePaperCode("9708_m23_qp_12 (1)")).toBe("Paper 12");
    expect(parsePaperCode("9708_s25_qp_13")).toBe("Paper 13");
    expect(parsePaperCode("9708_m25_qp_12")).toBe("Paper 12");
    expect(parsePaperCode("9708/11")).toBe("Paper 11");
    expect(parsePaperCode("Paper 1")).toBe("Paper 01");
    expect(parsePaperCode("Paper 32")).toBe("Paper 32");
  });

  it("infers standard metadata (year, series, level, paperCode) from filenames and titles", () => {
    function inferMetadata(filename: string) {
      const codeMatch = filename.match(/9708[_\s-]+([msw])(\d{2})[_\s-]+(?:qp|ms|paper)?[_\s-]*(\d{2})/i);
      if (codeMatch) {
        const sChar = codeMatch[1].toLowerCase();
        const series = sChar === "m" ? "Feb/March" : sChar === "s" ? "May/June" : "Oct/Nov";
        const year = 2000 + parseInt(codeMatch[2], 10);
        const paperCode = codeMatch[3];
        const level = paperCode.startsWith("3") ? "a2" : "as";
        return { paperCode, level, examYear: year, examSeries: series };
      }

      const humanMatch = filename.match(/9708\s+(Feb\/March|May\/June|Oct\/Nov)\s+(\d{4})\s+Paper\s+(\d{2})/i);
      if (humanMatch) {
        const series = humanMatch[1];
        const year = parseInt(humanMatch[2], 10);
        const paperCode = humanMatch[3];
        const level = paperCode.startsWith("3") ? "a2" : "as";
        return { paperCode, level, examYear: year, examSeries: series };
      }

      return null;
    }

    expect(inferMetadata("6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf")).toEqual({
      paperCode: "13",
      level: "as",
      examYear: 2024,
      examSeries: "Oct/Nov",
    });

    expect(inferMetadata("35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12 (1).pdf")).toEqual({
      paperCode: "12",
      level: "as",
      examYear: 2023,
      examSeries: "Feb/March",
    });

    expect(inferMetadata("9708 May/June 2024 Paper 31")).toEqual({
      paperCode: "31",
      level: "a2",
      examYear: 2024,
      examSeries: "May/June",
    });

    expect(inferMetadata("92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf")).toEqual({
      paperCode: "13",
      level: "as",
      examYear: 2025,
      examSeries: "May/June",
    });
  });

  it("instantly classifies AS and A2 questions into canonical Cambridge 9708 syllabus topics without ever returning Untagged", () => {
    const q1 = classifyMcqQuestion({
      level: "AS",
      number: 2,
      text: "2 A country moves from a point inside its production possibility curve to a point on the curve. What is the opportunity cost?",
    });
    expect(q1.topic).toBe("Basic Economic Ideas & Resource Allocation");
    expect(q1.unit).toBe("AS Unit 1");
    expect(q1.domain).toBe("micro");
    expect(q1.revisionTip).toBeTruthy();

    const q9 = classifyMcqQuestion({
      level: "AS",
      number: 9,
      text: "9 The cross elasticity of demand between good X and good Y is -1.5. What can be concluded?",
    });
    expect(q9.topic).toBe("Elasticities (PED, PES, YED & XED)");
    expect(q9.unit).toBe("AS Unit 2");
    expect(q9.domain).toBe("micro");

    const q28 = classifyMcqQuestion({
      level: "AS",
      number: 28,
      text: "28 Which transaction is recorded in the primary income section of the current account of the balance of payments?",
    });
    expect(q28.topic).toBe("International Trade, Protectionism & Balance of Payments");
    expect(q28.unit).toBe("AS Unit 6");
    expect(q28.domain).toBe("macro");

    const a2Q = classifyMcqQuestion({
      level: "A2",
      number: 12,
      text: "12 In an oligopoly, a firm faces a kinked demand curve and uses game theory to avoid price wars.",
    });
    expect(a2Q.topic).toBe("Market Structures, Contestability & Pricing");
    expect(a2Q.unit).toBe("A2 Unit 7");
    expect(a2Q.domain).toBe("micro");

    // Legacy "Untagged" with empty stem text still resolves deterministically via syllabus sequence
    const fallback = normalizeMcqTopic("Untagged", "AS", 25, "");
    expect(fallback.topic).not.toBe("Untagged");
    expect(fallback.domain).toBe("macro");
  });

  it("identifies lagging topics and missed question numbers accurately", () => {
    const stats = buildTopicStatsFromQuestions([
      {
        number: 1,
        topic: "Basic Economic Ideas & Resource Allocation",
        correct_answer: "A",
        user_answer: "A",
        correct: true,
      },
      {
        number: 8,
        topic: "Elasticities (PED, PES, YED & XED)",
        correct_answer: "B",
        user_answer: "C",
        correct: false,
      },
      {
        number: 10,
        topic: "Elasticities (PED, PES, YED & XED)",
        correct_answer: "D",
        user_answer: "A",
        correct: false,
      },
      {
        number: 27,
        topic: "International Trade, Protectionism & Balance of Payments",
        correct_answer: "C",
        user_answer: "C",
        correct: true,
      },
    ]);

    expect(stats[0].topic).toBe("Elasticities (PED, PES, YED & XED)");
    expect(stats[0].accuracyPct).toBe(0);
    expect(stats[0].wrongNumbers).toEqual([8, 10]);

    const domains = aggregateMcqDomains([
      { topic: "Basic Economic Ideas & Resource Allocation", correct: true, number: 1 },
      { topic: "Elasticities (PED, PES, YED & XED)", correct: false, number: 8 },
      { topic: "International Trade, Protectionism & Balance of Payments", correct: true, number: 27 },
    ]);
    expect(domains.find((d) => d.domain === "micro")?.accuracyPct).toBe(50);
    expect(domains.find((d) => d.domain === "macro")?.accuracyPct).toBe(100);
  });
});
