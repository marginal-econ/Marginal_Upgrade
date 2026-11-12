import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompactProgressBar, type ProgressStage } from "./grading-progress";

const SAMPLE_STAGES: ProgressStage[] = [
  { label: "Checking extract evidence, figures & units", weight: 3 },
  { label: "Applying Cambridge 9708 mark scheme & OFR rules", weight: 5 },
  { label: "Compiling sub-question marks & diagnostic feedback", weight: 2 },
];

describe("CompactProgressBar", () => {
  it("renders nothing when inactive", () => {
    const markup = renderToStaticMarkup(
      <CompactProgressBar active={false} stages={SAMPLE_STAGES} title="Marking…" />,
    );
    expect(markup).toBe("");
  });

  it("renders progress status, percentage, stage indicator, and stages when active", () => {
    const markup = renderToStaticMarkup(
      <CompactProgressBar
        active
        stages={SAMPLE_STAGES}
        title="Marking Data Response paper against Cambridge mark scheme…"
        estimatedTimeLabel="Est: ~25–45s"
        statusBadge="Marking Active"
        showStages
      />,
    );

    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("role=\"progressbar\"");
    expect(markup).toContain("Marking Data Response paper against Cambridge mark scheme…");
    expect(markup).toContain("Est: ~25–45s");
    expect(markup).toContain("Marking Active");
    expect(markup).toContain("Stage 1/3");
    expect(markup).toContain("Checking extract evidence, figures &amp; units");
    expect(markup).toContain("Applying Cambridge 9708 mark scheme &amp; OFR rules");
    expect(markup).toContain("Compiling sub-question marks &amp; diagnostic feedback");
  });
});
