import { describe, expect, it } from "vitest";
import {
  TOPICAL_MCQ_PAPERS,
  getTopicalPaperById,
  isTopicalPaperId,
  toMcqPaperSummaryFromTopical,
} from "./topical-mcq-papers";

describe("topical-mcq-papers", () => {
  it("defines a complete 16-paper topical past paper series (8 AS + 8 A2) with valid PDF slice coordinates", () => {
    expect(TOPICAL_MCQ_PAPERS.length).toBe(16);
    expect(TOPICAL_MCQ_PAPERS.filter((p) => p.level === "as").length).toBe(8);
    expect(TOPICAL_MCQ_PAPERS.filter((p) => p.level === "a2").length).toBe(8);

    for (const paper of TOPICAL_MCQ_PAPERS) {
      expect(paper.questions.length).toBe(paper.questionCount);
      expect(paper.questionCount).toBeGreaterThanOrEqual(12);
      expect(Object.keys(paper.answerKey).length).toBe(paper.questionCount);
      expect(["micro", "macro"]).toContain(paper.domain);

      paper.questions.forEach((q, idx) => {
        expect(q.number).toBe(idx + 1);
        expect(paper.answerKey[String(q.number)]).toBe(q.correctAnswer);
        expect(["A", "B", "C", "D"]).toContain(q.correctAnswer);
        expect(q.yTop).toBeGreaterThan(q.yBottom);
        expect(q.yBottom).toBeGreaterThanOrEqual(70);
        expect(q.yTop).toBeLessThanOrEqual(800);
        expect(q.qpUrl).toMatch(/^https:\/\//);
        expect(q.pageNumber).toBeGreaterThanOrEqual(2);
      });
    }
  });

  it("looks up topical papers by id and converts them to McqPaperSummary", () => {
    const first = TOPICAL_MCQ_PAPERS[0];
    expect(isTopicalPaperId(first.id)).toBe(true);
    expect(isTopicalPaperId("not-a-topical-id")).toBe(false);
    expect(getTopicalPaperById(first.id)?.title).toBe(first.title);

    const summary = toMcqPaperSummaryFromTopical(first);
    expect(summary.id).toBe(first.id);
    expect(summary.questionCount).toBe(first.questionCount);
    expect(summary.answerKey).toEqual(first.answerKey);
  });
});
