import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { gradeEssay } from "../src/lib/examiner/grade.server";
import { BUILT_IN_CAMBRIDGE_ANCHORS } from "../src/lib/examiner/calibration.server";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.BACKEND_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.BACKEND_SERVICE_ROLE_KEY!,
);

const currentAccountText = fs.readFileSync("scripts/current_account_essay.txt", "utf8");
const demeritText = fs.readFileSync("scripts/demerit_essay.txt", "utf8");
const freeTradeText = fs.readFileSync("scripts/freetrade_essay.txt", "utf8");
const cambridge4 = BUILT_IN_CAMBRIDGE_ANCHORS[0]!;
const cambridge10 = BUILT_IN_CAMBRIDGE_ANCHORS[1]!;

const ESSAYS = [
  {
    name: "Demerit-goods essay",
    question: "Assess whether indirect taxes are the best method to reduce the consumption of demerit goods.",
    text: demeritText,
  },
  {
    name: "Current-account essay",
    question: "Assess whether a fall in the exchange rate is likely to improve a country’s current account deficit.",
    text: currentAccountText,
  },
  {
    name: "Cambridge 4/12 (Supply-side inflation)",
    question: cambridge4.question,
    text: cambridge4.essay_text,
  },
  {
    name: "Cambridge 10/12 (Merit goods)",
    question: cambridge10.question,
    text: cambridge10.essay_text,
  },
  {
    name: "Free trade essay",
    question: "Assess the extent to which the consequences of free trade are always positive for an economy.",
    text: freeTradeText,
  },
];

async function run() {
  for (const e of ESSAYS.slice(0, 2)) {
    console.log(`\n========================================`);
    console.log(`Testing grader on: ${e.name}`);
    console.log(`Question: ${e.question}`);
    console.log(`========================================`);
    const outcome = await gradeEssay(supabase, {
      question: e.question,
      essayText: e.text,
      maxMark: 12,
      split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
    });

    const g = outcome.grading;
    const tableA = g.ao_breakdown.knowledge.awarded + g.ao_breakdown.analysis.awarded;
    const tableB = g.ao_breakdown.evaluation.awarded;
    console.log("Total:", g.total_mark, `(Table A: ${tableA}/8 [AO1: ${g.ao_breakdown.knowledge.awarded}, AO2: ${g.ao_breakdown.analysis.awarded}], Table B: ${tableB}/4)`);
    console.log("Band:", g.band);
    console.log("Audit line / Summary:\n", g.examiner_summary);
    console.log("Weaknesses:\n", g.weaknesses);
    console.log("Actionable feedback:\n", g.actionable_feedback);
  }
}

run().catch(console.error);
