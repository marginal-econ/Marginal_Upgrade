import { describe, expect, it } from "vitest";

import {
  assertSafeRemoteImageUrl,
  extractDiagramTag,
  parseDiagramTag,
  reconcileDiagramTags,
} from "./describe.server";

describe("remote diagram URL validation", () => {
  it.each([
    "http://localhost/image.png",
    "http://127.0.0.1/image.png",
    "http://10.1.2.3/image.png",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/image.png",
    "http://metadata.google.internal/image.png",
  ])("blocks private or metadata address %s", (url) => {
    expect(() => assertSafeRemoteImageUrl(url)).toThrow();
  });

  it("blocks embedded credentials and unusual ports", () => {
    expect(() => assertSafeRemoteImageUrl("https://user:pass@example.com/image.png")).toThrow();
    expect(() => assertSafeRemoteImageUrl("https://example.com:8443/image.png")).toThrow();
  });

  it("accepts a normal public HTTPS image URL", () => {
    expect(assertSafeRemoteImageUrl("https://images.example.com/diagram.png").hostname).toBe(
      "images.example.com",
    );
  });
});

describe("Dual-VLM Diagram Cross-Verification & Tag Reconciliation (V7)", () => {
  it("merges richer axis and curve labels across Gemini Vision and NVIDIA Super VL 120B", () => {
    const geminiTag =
      "[DIAGRAM: AD/AS | axes: unlabelled | curves: AD shifts right | labels: Y1, Y2 | accuracy: axes unlabelled]";
    const nvidiaTag =
      "[DIAGRAM: AD/AS Macro Equilibrium | axes: Price Level (Y) / Real GDP (X) | curves: AD shifts right AD1->AD2, SRAS static | labels: P1, P2, Y1, Y2, E1, E2 | accuracy: accurate rightward AD shift]";
    const merged = reconcileDiagramTags(geminiTag, nvidiaTag)!;
    const parsed = parseDiagramTag(merged);
    expect(parsed.axes).toContain("Price Level");
    expect(parsed.curves).toContain("AD1->AD2");
    expect(parsed.labels).toContain("E2");
    // Preserves visual error flagged by Gemini even though NVIDIA didn't flag it
    expect(parsed.accuracy).toContain("unlabelled");
  });

  it("flags shift-direction contradictions when the two VLMs disagree on left vs right", () => {
    const tagA =
      "[DIAGRAM: Indirect Tax | axes: Price / Quantity | curves: Supply shifts left S1->S2 | labels: P1, P2 | accuracy: accurate]";
    const tagB =
      "[DIAGRAM: Indirect Tax | axes: Price / Quantity | curves: Supply shifts right S1->S2 | labels: P1, P2 | accuracy: inverted supply shift]";
    const merged = reconcileDiagramTags(tagA, tagB)!;
    expect(merged).toContain("inverted supply shift");
    expect(merged).toContain("shift direction ambiguous");
  });

  it("extracts or wraps raw VLM descriptions cleanly", () => {
    expect(extractDiagramTag("Here it is: [DIAGRAM: PPC | axes: Good X / Good Y]")).toBe(
      "[DIAGRAM: PPC | axes: Good X / Good Y]",
    );
    expect(extractDiagramTag("Demand and supply curve showing a shortage")).toContain("[DIAGRAM:");
  });
});
