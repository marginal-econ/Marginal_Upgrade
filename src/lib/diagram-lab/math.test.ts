import { describe, expect, it } from "vitest";
import {
  buildDiagramTag,
  CAMBRIDGE_DIAGRAM_DRILLS,
  calculateMetrics,
  DEFAULT_DIAGRAM_STATES,
  DIAGRAM_PRESET_META,
  getShadedPolygons,
  PRESET_LIST,
} from "./math";

describe("Cambridge 9708 Diagram CAD Math Engine", () => {
  it("supports all 19 core Cambridge 9708 AS & A Level presets with finite metrics and 4 KPI cards", () => {
    expect(PRESET_LIST.length).toBe(19);

    for (const meta of PRESET_LIST) {
      const state = DEFAULT_DIAGRAM_STATES[meta.id];
      expect(state).toBeDefined();
      expect(DIAGRAM_PRESET_META[meta.id]).toBeDefined();

      const metrics = calculateMetrics(state);
      expect(Number.isFinite(metrics.eqP)).toBe(true);
      expect(Number.isFinite(metrics.eqQ)).toBe(true);
      expect(Number.isFinite(metrics.deadweightLoss)).toBe(true);
      expect(metrics.kpiCards).toHaveLength(4);

      const polygons = getShadedPolygons(state, metrics);
      for (const poly of polygons) {
        expect(poly.points.length).toBeGreaterThanOrEqual(3);
        expect(Number.isFinite(poly.areaValue)).toBe(true);
      }

      const tag = buildDiagramTag(state, metrics);
      expect(tag).toContain("[DIAGRAM:");
      expect(tag).toContain(meta.title);
    }
  });

  it("computes accurate Lorenz Gini coefficient (0 for equality, >0.4 for unequal distribution)", () => {
    const equal = calculateMetrics({ ...DEFAULT_DIAGRAM_STATES.lorenz_curve, giniExponent: 1 });
    expect(equal.giniCoefficient).toBeCloseTo(0, 5);

    const unequal = calculateMetrics({ ...DEFAULT_DIAGRAM_STATES.lorenz_curve, giniExponent: 3 });
    expect(unequal.giniCoefficient).toBeCloseTo(0.5, 5);
  });

  it("computes all 4 externality modes with positive deadweight loss", () => {
    const modes = ["neg_prod", "pos_cons", "neg_cons", "pos_prod"] as const;
    for (const mode of modes) {
      const state = {
        ...DEFAULT_DIAGRAM_STATES.externality,
        externalityMode: mode,
        externalityCost: 20,
      };
      const metrics = calculateMetrics(state);
      expect(metrics.deadweightLoss).toBeGreaterThan(0);
      expect(getShadedPolygons(state, metrics)).toHaveLength(1);
    }
  });

  it("evaluates all Cambridge interactive drills without throwing", () => {
    expect(CAMBRIDGE_DIAGRAM_DRILLS.length).toBeGreaterThanOrEqual(7);
    for (const drill of CAMBRIDGE_DIAGRAM_DRILLS) {
      const state = DEFAULT_DIAGRAM_STATES[drill.preset];
      const metrics = calculateMetrics(state);
      const res = drill.targetCheck(state, metrics);
      expect(typeof res.passed).toBe("boolean");
      expect(res.score).toBeGreaterThanOrEqual(1);
      expect(res.score).toBeLessThanOrEqual(3);
    }
  });
});
