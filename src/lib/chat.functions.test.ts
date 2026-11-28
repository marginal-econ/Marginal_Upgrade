import { describe, expect, it } from "vitest";
import { buildAutoDraftPrompt, sanitizeCustomDiagramSpec } from "./chat.functions";

describe("Marginal EconGPT Backend (chat.functions)", () => {
  describe("Custom Diagram Spec Sanitiser", () => {
    it("accepts and clamps a valid AI-generated custom DiagramSpec", () => {
      const spec = sanitizeCustomDiagramSpec({
        xLabel: "Quantity of Carbon",
        yLabel: "Price / Cost ($)",
        curves: [
          { points: [[10, 88], [90, 12]], label: "MPB=MSB", tone: "demand" },
          { points: [[10, 15], [85, 80]], label: "MPC", tone: "supply" },
          { points: [[10, 32], [75, 95]], label: "MSC", tone: "warn", dashed: true },
        ],
        markers: [{ at: [50, 50], label: "Em", guides: "both" }],
        shades: [{ points: [[40, 60], [50, 50], [40, 42]], label: "DWL", tone: "danger" }],
        arrows: [{ from: [65, 62], to: [55, 74], label: "Tax" }],
        xTicks: [{ at: 40, label: "Q*" }, { at: 50, label: "Qm" }],
        yTicks: [{ at: 50, label: "Pm" }, { at: 60, label: "P*" }],
      });

      expect(spec).not.toBeNull();
      expect(spec?.curves).toHaveLength(3);
      expect(spec?.shades).toHaveLength(1);
      expect(spec?.markers).toHaveLength(1);
      expect(spec?.arrows).toHaveLength(1);
    });

    it("rejects empty or invalid diagram specs gracefully", () => {
      expect(sanitizeCustomDiagramSpec(null)).toBeNull();
      expect(sanitizeCustomDiagramSpec({ curves: [] })).toBeNull();
      expect(sanitizeCustomDiagramSpec({ curves: [{ points: [[10, 20]] }] })).toBeNull();
    });
  });

  describe("Auto-Draft Essay Generation", () => {
    it("builds a structured 12-mark Cambridge essay draft from EconGPT context", () => {
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
