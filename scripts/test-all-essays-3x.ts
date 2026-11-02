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
    id: "demerit",
    name: "Demerit-goods essay",
    question: "Assess whether indirect taxes are the best method to reduce the consumption of demerit goods.",
    text: demeritText,
    expectedTotal: "4-5 (Table A 3-4, Table B 1)",
  },
  {
    id: "current-account",
    name: "Current-account exchange rate essay",
    question: "Assess whether a fall in the exchange rate is likely to improve a country’s current account deficit.",
    text: currentAccountText,
    expectedTotal: "4 (Table A 3, Table B 1)",
  },
  {
    id: "cambridge-4",
    name: "Cambridge 4/12 (Supply-side inflation)",
    question: cambridge4.question,
    text: cambridge4.essay_text,
    expectedTotal: "~4 (3-5)",
  },
  {
    id: "cambridge-10",
    name: "Cambridge 10/12 (Merit goods)",
    question: cambridge10.question,
    text: cambridge10.essay_text,
    expectedTotal: "~10 (9-11)",
  },
  {
    id: "free-trade",
    name: "Free trade essay",
    question: "Assess the extent to which the consequences of free trade are always positive for an economy.",
    text: freeTradeText,
    expectedTotal: "~7-8 (7-8)",
  },
];

type RunResult = {
  run: number;
  total: number;
  tableA: number;
  ao1: number;
  ao2: number;
  tableB: number;
  band: string;
  auditLine?: string;
  examinerSummary: string;
  weaknesses: string[];
};

async function main() {
  console.log("Starting 3-run verification across all 4 essays...\n");
  const allResults: Record<string, RunResult[]> = {};

  for (const essay of ESSAYS) {
    console.log(`\n======================================================================`);
    console.log(`TESTING: ${essay.name}`);
    console.log(`Question: ${essay.question}`);
    console.log(`Target: ${essay.expectedTotal}`);
    console.log(`======================================================================`);
    allResults[essay.id] = [];

    for (let r = 1; r <= 3; r++) {
      console.log(`--> Running ${essay.name} [Run ${r}/3]...`);
      const startTime = Date.now();
      const outcome = await gradeEssay(supabase, {
        question: essay.question,
        essayText: essay.text,
        maxMark: 12,
        split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
        skipSyllabusPreflight: true,
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const g = outcome.grading;
      const ao1 = g.ao_breakdown.knowledge.awarded;
      const ao2 = g.ao_breakdown.analysis.awarded;
      const ao3 = g.ao_breakdown.evaluation.awarded;
      const tableA = ao1 + ao2;
      const tableB = ao3;

      const auditMatch = g.examiner_summary.match(/\[Cambridge Senior Examiner Audit:[^\]]+\]/);
      const auditLine = auditMatch ? auditMatch[0] : undefined;

      const res: RunResult = {
        run: r,
        total: g.total_mark,
        tableA,
        ao1,
        ao2,
        tableB,
        band: g.band,
        auditLine,
        examinerSummary: g.examiner_summary,
        weaknesses: g.weaknesses,
      };

      allResults[essay.id]!.push(res);
      console.log(`    Result ${r}: Total ${res.total}/12 (Table A: ${tableA}/8 [AO1 ${ao1}, AO2 ${ao2}], Table B: ${tableB}/4) in ${elapsed}s`);
      if (auditLine) {
        console.log(`    Audit line: ${auditLine}`);
      }
    }

    const marks = allResults[essay.id]!.map((x) => x.total);
    const minM = Math.min(...marks);
    const maxM = Math.max(...marks);
    const diff = maxM - minM;
    console.log(`--> Summary for ${essay.name}: Runs=[${marks.join(", ")}], Min=${minM}, Max=${maxM}, Diff=${diff} (Pass <= 1: ${diff <= 1 ? "YES" : "NO"})`);
  }

  // Final Report
  console.log(`\n\n======================================================================`);
  console.log(`FINAL BENCHMARK SUMMARY (3 RUNS EACH)`);
  console.log(`======================================================================`);
  for (const essay of ESSAYS) {
    const runs = allResults[essay.id]!;
    const marks = runs.map((x) => x.total);
    const minM = Math.min(...marks);
    const maxM = Math.max(...marks);
    const diff = maxM - minM;
    console.log(`\nEssay: ${essay.name}`);
    console.log(`Target: ${essay.expectedTotal}`);
    console.log(`Runs: ${marks.join(", ")} (Diff: ${diff})`);
    console.log(`Table A marks: ${runs.map((x) => x.tableA).join(", ")}`);
    console.log(`Table B marks: ${runs.map((x) => x.tableB).join(", ")}`);
    console.log(`Audit lines:`);
    for (const r of runs) {
      console.log(`  Run ${r.run}: ${r.auditLine || "None"}`);
    }
  }

  // Save report to JSON for inspection
  fs.writeFileSync("scripts/test-results-3x.json", JSON.stringify(allResults, null, 2), "utf8");
  console.log("\nResults written to scripts/test-results-3x.json");
}

main().catch(console.error);
