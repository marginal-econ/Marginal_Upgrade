import fs from "node:fs";
import { detectEconomicErrors, checkQuestionFit, detectHedgeConclusion, normaliseGrading } from "../src/lib/examiner/types";

const text = fs.readFileSync("scripts/current_account_essay.txt", "utf8");
const q = "Assess whether a fall in the exchange rate is likely to improve a country’s current account deficit.";

console.log("=== DETECT ECONOMIC ERRORS ===");
const errors = detectEconomicErrors(text);
console.log(errors);

console.log("\n=== CHECK QUESTION FIT ===");
const fit = checkQuestionFit(q, text);
console.log(fit);

console.log("\n=== HEDGE CONCLUSION ===");
const hedge = detectHedgeConclusion(text);
console.log(hedge);

console.log("\n=== NORMALISE GRADING WITH MOCK RAW ===");
const mockRaw = {
  total_mark: 7,
  band: "Upper middle band",
  ao_breakdown: {
    knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
    analysis: { awarded: 4, out_of: 6, comment: "Analysis of exchange rate." },
    evaluation: { awarded: 1, out_of: 4, comment: "Superficial evaluation." },
  },
  examiner_summary: "Essay addresses the question.",
  weaknesses: [],
  strengths: [],
  actionable_feedback: [],
};

const normalised = normaliseGrading(mockRaw, 12, { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 }, q, text);
console.log("Final marks:", normalised.total_mark, `(AO1: ${normalised.ao_breakdown.knowledge.awarded}, AO2: ${normalised.ao_breakdown.analysis.awarded}, AO3: ${normalised.ao_breakdown.evaluation.awarded})`);
console.log("Examiner summary:", normalised.examiner_summary);
