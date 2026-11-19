import { describe, expect, it } from "vitest";
import { detectDiagramRequirement } from "./diagram-prompt";

describe("detectDiagramRequirement", () => {
  it("detects 'with the help of diagram(s)' in Cambridge Paper 4 prompt", () => {
    const q =
      "Governments and trade unions should be excluded from taking part in wage negotiations, as their intervention always causes higher levels of unemployment. With the help of diagram(s), evaluate this statement.";
    const req = detectDiagramRequirement(q, "");
    expect(req.isExplicitlyRequested).toBe(true);
    expect(req.matchedPhrase).toBe("with the help of diagram(s)");
  });

  it("detects 'with the aid of a diagram' in micro prompt", () => {
    const q = "Explain, with the aid of a diagram, the equilibrium position of a profit-maximising monopoly.";
    const req = detectDiagramRequirement(q, "");
    expect(req.isExplicitlyRequested).toBe(true);
    expect(req.matchedPhrase).toBe("with the help of diagram(s)");
  });

  it("detects 'Using a diagram' and 'Use diagrams'", () => {
    const q1 = "Using a diagram, discuss whether indirect taxation is effective in reducing demerit goods consumption.";
    expect(detectDiagramRequirement(q1).isExplicitlyRequested).toBe(true);

    const q2 = "Use relevant diagrams to explain the difference between cost-push and demand-pull inflation.";
    expect(detectDiagramRequirement(q2).isExplicitlyRequested).toBe(true);
  });

  it("detects when student script references figures or diagrams (e.g. 'Fig a', 'Fig b')", () => {
    const q = "Evaluate the impact of high inflation on an economy.";
    const script =
      "Inflation reduces real wages. As seen in Fig a, the aggregate supply curve shifts leftward causing stagflation.";
    const req = detectDiagramRequirement(q, script);
    expect(req.isExplicitlyRequested).toBe(false);
    expect(req.isMentionedInScript).toBe(true);
  });

  it("handles standard questions with no diagram mention", () => {
    const q = "Discuss whether supply-side policies are the most effective method of achieving economic growth.";
    const script = "Supply side policies improve productive capacity through education and infrastructure.";
    const req = detectDiagramRequirement(q, script);
    expect(req.isExplicitlyRequested).toBe(false);
    expect(req.isMentionedInScript).toBe(false);
  });
});
