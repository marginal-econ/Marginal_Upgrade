/**
 * MCQ shared types and constants — Cambridge 9708 Paper 1 style multiple
 * choice questions. AI question generation has been removed as a product
 * decision: every question in the app now comes from a real, uploaded past
 * paper (see mcq-pdf.server.ts / mcq-live.tsx). This file keeps only the
 * shapes and syllabus reference lists that the past-paper flow, marking,
 * and history still depend on.
 */
export type McqOption = "A" | "B" | "C" | "D";

export type McqQuestion = {
  number: number;
  stem: string;
  options: Record<McqOption, string>;
  answer: McqOption;
  explanation: string;
  distractorNotes: Partial<Record<McqOption, string>>;
  topic: string;
  syllabusRef: string | null;
  skill: "knowledge" | "application" | "analysis";
  /** Optional diagram from the library shown above the stem. */
  diagramId?: string | null;
  /** Real cropped exam figure (bank questions only) — takes priority over diagramId when set. */
  diagramImageUrl?: string | null;
};

/** Paper 1 (AS) and Paper 3 (A Level) both run 30 questions, 1 mark each. */
export const PAPER_TOTAL = 30;

/**
 * Real Cambridge 9708 paper timings — Paper 1 (AS) is 1 hour, Paper 3
 * (A Level) is 1 hour 15. Single source of truth: both the client (for
 * display/countdown) and the server (for starting/resuming the clock)
 * import this instead of hardcoding the numbers twice.
 */
export const PAPER_DURATION_SECONDS: Record<"as" | "a2", number> = {
  as: 60 * 60,
  a2: 75 * 60,
};

export const AS_SECTIONS = [
  "Basic economic ideas and resource allocation (scarcity, PPCs, positive vs normative, factors of production, specialisation)",
  "The price system and the microeconomy (demand and supply, elasticities, consumer/producer surplus, price controls)",
  "Government microeconomic intervention (taxes, subsidies, market failure, externalities, public and merit goods)",
  "The macroeconomy (AD/AS, national income, inflation, unemployment, balance of payments, exchange rates)",
  "Government macroeconomic intervention (fiscal, monetary and supply-side policy, policy conflicts)",
  "International economic issues (comparative advantage, protectionism, terms of trade)",
];

export const A2_SECTIONS = [
  "Utility, indifference curves and budget lines, behavioural economics",
  "Costs, revenues and market structures (perfect competition, monopoly, oligopoly, contestability)",
  "Labour market, wage determination and trade unions",
  "Market failure and government intervention (regulation, privatisation, cost-benefit analysis)",
  "Economic growth, development and sustainability (Gini, HDI, Kuznets, Lorenz curve)",
  "Macro policy, money supply, quantity theory, Phillips curve, exchange rate systems",
];
