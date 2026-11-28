import { describe, expect, it } from "vitest";
import { buildAutoDraftPrompt, cleanDiagramSymbol, sanitizeCustomDiagramSpec } from "./chat.functions";

describe("Marginal Tutor Backend (chat.functions)", () => {
  describe("Zero-Overlap Custom Diagram Sanitiser", () => {
    it("shortens verbose labels to clean Cambridge exam symbols without mid-word truncation", () => {
      expect(cleanDiagramSymbol("P_black (Black Market Price)", "tick")).toBe("Pb");
      expect(cleanDiagramSymbol("Q* (Equilibrium)", "tick")).toBe("Q*");
      expect(cleanDiagramSymbol("P_max (Ceiling)", "tick")).toBe("Pmax");
      expect(cleanDiagramSymbol("A (Qd at P_max)", "marker")).toBe("A");
      expect(cleanDiagramSymbol("Black Market Gain (Profit)", "shade")).toBe("Black mkt");
      expect(cleanDiagramSymbol("Excess Demand (Shortage)", "shade")).toBe("Shortage");
      expect(cleanDiagramSymbol("S_2", "curve")).toBe("S₂");
    });

    it("de-conflicts overlapping markers, shades, and crowded axis ticks", () => {
      const spec = sanitizeCustomDiagramSpec({
        xLabel: "Quantity (Q)",
        yLabel: "Price (P)",
        curves: [
          { points: [[12, 86], [86, 14]], label: "D", tone: "demand" },
          { points: [[14, 16], [84, 84]], label: "S_1", tone: "supply" },
        ],
        markers: [
          { at: [50, 50], label: "E (Equilibrium)", guides: "both" },
          { at: [52, 51], label: "Duplicate too close", guides: "both" }, // dropped (< 8 units away)
          { at: [34, 34], label: "B (Qs at P_max)", guides: "both" },
        ],
        shades: [
          { points: [[34, 66], [50, 50], [34, 34]], label: "Excess Demand", tone: "danger" },
        ],
        xTicks: [
          { at: 34, label: "Qs (Supplied)" },
          { at: 36, label: "TooClose" }, // dropped (< 11 units away)
          { at: 50, label: "Q* (Equilibrium)" },
          { at: 85, label: "Qd (Demanded)" }, // clamped to <= 76 so never collides with xLabel
        ],
        yTicks: [
          { at: 34, label: "P_max (Ceiling)" },
          { at: 50, label: "P*" },
          { at: 66, label: "P_black (Black Market)" },
        ],
      });

      expect(spec).not.toBeNull();
      expect(spec?.curves[1]?.label).toBe("S₁");
      expect(spec?.markers).toHaveLength(2);
      expect(spec?.markers?.[0]?.label).toBe("E");
      expect(spec?.xTicks?.every((t) => t.at <= 76 && t.label.length <= 7)).toBe(true);
      expect(spec?.yTicks?.map((t) => t.label)).toEqual(["Pmax", "P*", "Pb"]);
    });

    it("rejects empty or invalid diagram specs gracefully", () => {
      expect(sanitizeCustomDiagramSpec(null)).toBeNull();
      expect(sanitizeCustomDiagramSpec({ curves: [] })).toBeNull();
      expect(sanitizeCustomDiagramSpec({ curves: [{ points: [[10, 20]] }] })).toBeNull();
    });
  });

  describe("Auto-Draft Essay Generation", () => {
    it("builds a structured 12-mark Cambridge essay draft from chat context", () => {
      const query = "Explain the economic effects of subsidies on renewable energy";
      const replyText = "Subsidies lower production costs and shift supply right.";
      const sources = [
        {
          title: "Chapter 3: Government Microeconomic Intervention",
          chapter: "Chapter 3",
          type: "mark_scheme" as const,
        },
      ];

      const draft = buildAutoDraftPrompt(query, replyText, sources);

      expect(draft).toBeDefined();
      expect(draft?.marks).toBe(12);
      expect(draft?.question).toContain("subsidies on renewable energy");
      expect(draft?.essayDraft).toContain("### Introduction");
      expect(draft?.essayDraft).toContain("### Critical Evaluation");
      expect(draft?.essayDraft).toContain("Chapter 3: Government Microeconomic Intervention");
    });
  });
});
