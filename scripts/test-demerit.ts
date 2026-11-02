import fs from "node:fs";
import { detectEconomicErrors, checkQuestionFit, detectHedgeConclusion, normaliseGrading } from "../src/lib/examiner/types";

const text = fs.readFileSync("scripts/demerit_essay.txt", "utf8");
const q = "Assess whether indirect taxes are the best method to reduce the consumption of demerit goods.";

console.log("=== DETECT ECONOMIC ERRORS ===");
const errors = detectEconomicErrors(text);
console.log(errors.map((e) => e.id));

console.log("\n=== CHECK QUESTION FIT ===");
const fit = checkQuestionFit(q, text);
console.log(fit);

console.log("\n=== HEDGE CONCLUSION ===");
const hedge = detectHedgeConclusion(text);
console.log(hedge);

console.log("\n=== NORMALISE GRADING WITH MOCK RAW ===");
const mockRaw = {
  total_mark: 8,
  band: "Upper middle band",
  ao_breakdown: {
    knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of demerit good and indirect tax." },
    analysis: { awarded: 4, out_of: 6, comment: "Analysis of indirect tax." },
    evaluation: { awarded: 2, out_of: 4, comment: "Evaluation of policies." },
  },
  examiner_summary: "Essay addresses the question.",
  weaknesses: [],
  strengths: [],
  actionable_feedback: [],
};

const normalised = normaliseGrading(mockRaw, 12, { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 }, q, text);
console.log("Final marks:", normalised.total_mark, `(AO1: ${normalised.ao_breakdown.knowledge.awarded}, AO2: ${normalised.ao_breakdown.analysis.awarded}, AO3: ${normalised.ao_breakdown.evaluation.awarded})`);
console.log("Examiner summary:\n", normalised.examiner_summary);
