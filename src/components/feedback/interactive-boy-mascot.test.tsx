import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InteractiveBoyMascot } from "./interactive-boy-mascot";

describe("InteractiveBoyMascot", () => {
  it("renders mascot for general category", () => {
    const markup = renderToStaticMarkup(
      <InteractiveBoyMascot category="general" />,
    );
    expect(markup).toContain("Hey there!");
    expect(markup).toContain("<svg");
    expect(markup).toContain("boy-head");
    expect(markup).toContain("boy-body");
  });

  it("renders flying bug when category is bug", () => {
    const markup = renderToStaticMarkup(
      <InteractiveBoyMascot category="bug" />,
    );
    expect(markup).toContain("bzz!");
    expect(markup).toContain("arms-surprised");
  });

  it("renders glowing lightbulb and pointing arm when category is feature_request", () => {
    const markup = renderToStaticMarkup(
      <InteractiveBoyMascot category="feature_request" />,
    );
    expect(markup).toContain("arms-pointing");
    expect(markup).toContain("floatBulb");
  });

  it("renders examiner intel message when category is grading_question", () => {
    const markup = renderToStaticMarkup(
      <InteractiveBoyMascot category="grading_question" />,
    );
    expect(markup).toContain("Examiner Intel");
  });
});
