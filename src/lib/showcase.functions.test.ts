import { describe, expect, it } from "vitest";
import { anchorToShowcaseItem, isShowcaseScore } from "./showcase.functions";

describe("anchorToShowcaseItem and Showcase Calibration Engine", () => {
  it("converts an 8-mark top-band calibration anchor to ShowcaseEssayItem", () => {
    const anchor = {
      id: "anchor-8m-1",
      question: "Explain two economic reasons for inequality in the distribution of income and wealth and consider why inequality in the distribution of wealth cannot easily be measured. [8]",
      essay_text: "Income refers to a flow of earnings...",
      mark: 8,
      max_mark: 8,
      band_label: "top",
      notes: "Examiner note: This is a thorough and well-focused response that addresses both aspects.",
      active: true,
      created_at: "2026-11-18T10:00:00Z",
    };

    const item = anchorToShowcaseItem(anchor);
    expect(item.essay_id).toBe("anchor-8m-1");
    expect(item.total_mark).toBe(8);
    expect(item.max_mark).toBe(8);
    expect(item.ao1_awarded).toBe(3);
    expect(item.ao2_awarded).toBe(3);
    expect(item.ao3_awarded).toBe(2);
    expect(item.author_initials).toBe("Senior Examiner");
    expect(item.grading?.band).toBe("Level 5 (Full Distinction)");
  });

  it("accurately attributes Siyonah Shyam returned scripts", () => {
    const sionaScript = {
      id: "siona-p42-q2",
      question: "Although firms in an oligopolistic market may be in competition with each other, they may also engage in collusion. Discuss. [20]",
      essay_text: "Oligopolies are a market structure where a few firms have a large market share...",
      mark: 17,
      max_mark: 20,
      band_label: "top",
      notes: "March 2025 9708/42 Returned Script (Siyonah Shyam). 17/20 (12/14 AN + 5/6 EV).",
      active: true,
      created_at: "2026-11-18T12:00:00Z",
    };

    const item = anchorToShowcaseItem(sionaScript);
    expect(item.author_initials).toBe("S. S.");
    expect(item.source).toBe("student_auto");
    expect(item.ao1_awarded).toBe(5);
    expect(item.ao2_awarded).toBe(7);
    expect(item.ao3_awarded).toBe(5);
    expect(item.topic_name).toBe("Market Structures & Firm Behaviour");
  });

  it("accurately attributes Cambridge ECR high candidate scripts", () => {
    const ecrScript = {
      id: "ecr-evs-1",
      question: "The increased use of electric vehicles (EVs) is encouraged as part of governments' climate change policies... [20]",
      essay_text: "Market failure can be defined as a situation where MSC=MSB is not met...",
      mark: 16,
      max_mark: 20,
      band_label: "top",
      notes: "Official Cambridge 9708/42/M/J/23 ECR pp.15-17. 16/20. Strong market failure framing.",
      active: true,
      created_at: "2026-11-18T13:00:00Z",
    };

    const item = anchorToShowcaseItem(ecrScript);
    expect(item.author_initials).toBe("Cambridge ECR");
    expect(item.source).toBe("cambridge_model");
    expect(item.total_mark).toBe(16);
    expect(item.max_mark).toBe(20);
    expect(item.grading?.confidence).toBe(0.98);
  });

  it("preserves isShowcaseScore helper contract for tariff thresholds", () => {
    expect(isShowcaseScore(7, 8)).toBe(true);
    expect(isShowcaseScore(6, 8)).toBe(false);
    expect(isShowcaseScore(10, 12)).toBe(true);
    expect(isShowcaseScore(9, 12)).toBe(false);
    expect(isShowcaseScore(15, 20)).toBe(true);
    expect(isShowcaseScore(14, 20)).toBe(false);
  });
});
