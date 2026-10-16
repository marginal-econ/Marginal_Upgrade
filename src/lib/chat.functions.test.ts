import { describe, expect, it } from "vitest";
import { generateFastRagReply, buildAutoDraftPrompt } from "./chat.functions";

describe("Cambridge Grounded Chat Engine (chat.functions)", () => {
  describe("Fast RAG Mode (Zero Token Operating Cost)", () => {
    it("generates a zero-token reply with authentic Cambridge 9708 citations for inflation", () => {
      const query = "Explain demand-pull inflation";
      const reply = generateFastRagReply(query, query.toLowerCase());

      expect(reply.usedAi).toBe(false);
      expect(reply.costEstimate).toContain("₹0.00");
      expect(reply.reply).toContain("Official Cambridge 9708 Definition");
      expect(reply.reply).toContain("AO1 Knowledge & AO2 Application");
      expect(reply.reply).toContain("AO3 High-Band Distinction");
      expect(reply.diagramGuidance).toBeTruthy();
      expect(reply.sources.length).toBeGreaterThanOrEqual(3);

      const hasSyllabusSource = reply.sources.some((s) => s.type === "syllabus");
      const hasDefinitionSource = reply.sources.some((s) => s.type === "definition");
      const hasMarkSchemeSource = reply.sources.some((s) => s.type === "mark_scheme");

      expect(hasSyllabusSource).toBe(true);
      expect(hasDefinitionSource).toBe(true);
      expect(hasMarkSchemeSource).toBe(true);
    });

    it("accurately categorizes microeconomic price elasticity queries", () => {
      const query = "What is PED and price elasticity?";
      const reply = generateFastRagReply(query, query.toLowerCase());

      expect(reply.sources.some((s) => s.chapter.includes("Price System") || s.title.includes("Price System"))).toBe(true);
      expect(reply.diagramGuidance).toContain("elastic");
    });

    it("accurately categorizes macroeconomic exchange rate and trade balance queries", () => {
      const query = "How does currency depreciation impact the balance of payments?";
      const reply = generateFastRagReply(query, query.toLowerCase());

      expect(reply.sources.some((s) => s.chapter.includes("Trade") || s.title.includes("Trade"))).toBe(true);
      expect(reply.diagramGuidance).toContain("J-Curve");
    });

    it("accurately categorizes basic economic ideas (PPC, opportunity cost)", () => {
      const query = "Explain the PPC curve and opportunity cost";
      const reply = generateFastRagReply(query, query.toLowerCase());

      expect(reply.sources.some((s) => s.chapter.includes("Basic Economic Ideas") || s.title.includes("Basic Economic Ideas"))).toBe(true);
      expect(reply.diagramGuidance).toContain("PPC");
    });
  });

  describe("Auto-Draft Essay Generation", () => {
    it("builds a structured 5-paragraph 12-mark Cambridge essay draft from chat context", () => {
      const query = "Explain the economic effects of subsidies on renewable energy";
      const replyText = "Subsidies lower production costs and shift supply right.";
      const sources = [
        {
          title: "Chapter 3: Government Microeconomic Intervention",
          chapter: "Chapter 3",
          paperCode: "Cambridge 9708/s23/ms_22",
          type: "mark_scheme" as const,
        },
      ];

      const draft = buildAutoDraftPrompt(query, replyText, sources);

      expect(draft).toBeDefined();
      expect(draft?.marks).toBe(12);
      expect(draft?.question).toContain("subsidies on renewable energy");
      expect(draft?.essayDraft).toContain("### Introduction");
      expect(draft?.essayDraft).toContain("### Analytical Body Paragraph 1");
      expect(draft?.essayDraft).toContain("### Analytical Body Paragraph 2");
      expect(draft?.essayDraft).toContain("### Critical Evaluative Paragraph");
      expect(draft?.essayDraft).toContain("### Conclusion");
      expect(draft?.essayDraft).toContain("Cambridge 9708/s23/ms_22");
    });
  });
});
