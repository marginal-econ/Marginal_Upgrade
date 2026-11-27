/**
 * Real Cambridge 9708 ECR Leave-One-Out Benchmark for Marginal Engine V4
 * (Neuro-Symbolic Causal Graph + 3-Family Orthogonal Panel + Blind Comparative Judgement)
 *
 * Compares directly against the recorded production baseline:
 *   Overall: 89.6% Alignment | 1.50 MAE
 *   8-Mark:  90.6% Accuracy  | 0.75 MAE
 *   12-Mark: 91.7% Accuracy  | 1.00 MAE
 *   20-Mark: 86.3% Accuracy  | 1.83 MAE
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { setRuntimeEnv } from "../src/server/env";

// Load .env cleanly
const envPath = path.resolve(process.cwd(), ".env");
const envObj: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx > 0) {
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[k] = v;
      envObj[k] = v;
    }
  }
}
setRuntimeEnv(envObj);

import { gradeEssay } from "../src/lib/examiner/grade.server";
import {
  isEvaluativeQuestion,
  TARIFF_SPLIT_8_LEGACY,
  TARIFF_SPLITS,
} from "../src/lib/examiner/config";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.BACKEND_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.BACKEND_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface EcrRow {
  id: string;
  question: string;
  essay_text: string;
  mark: number;
  max_mark: number;
  band_label: string;
  notes: string | null;
}

interface ScriptResult {
  id: string;
  tariff: number;
  question: string;
  cambridgeMark: number;
  v4Mark: number;
  absError: number;
  signedError: number;
  pass1Mark: number | null;
  pass2Mark: number | null;
  compMark: number | null;
  arbitrated: boolean;
  violations: number;
  latencyMs: number;
  error?: string;
}

function getSplit(question: string, maxMark: number) {
  if (maxMark === 8 && !isEvaluativeQuestion(question)) {
    return TARIFF_SPLIT_8_LEGACY;
  }
  return TARIFF_SPLITS[maxMark] ?? { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

function summarizeGroup(label: string, rows: ScriptResult[], baselineAcc: number, baselineMae: number) {
  const valid = rows.filter((r) => !r.error);
  if (valid.length === 0) return;
  const mae = valid.reduce((s, r) => s + r.absError, 0) / valid.length;
  const avgMax = valid.reduce((s, r) => s + r.tariff, 0) / valid.length;
  const acc = Math.max(0, (1 - mae / avgMax) * 100);
  const within1 = (valid.filter((r) => r.absError <= 1).length / valid.length) * 100;
  const within2 = (valid.filter((r) => r.absError <= 2).length / valid.length) * 100;
  const exact = (valid.filter((r) => r.absError === 0).length / valid.length) * 100;
  const bias = valid.reduce((s, r) => s + r.signedError, 0) / valid.length;
  const accDelta = acc - baselineAcc;
  const maeDelta = mae - baselineMae;

  console.log(
    `${label.padEnd(10)} | n=${String(valid.length).padStart(2)} | Acc: ${acc.toFixed(1)}% (${accDelta >= 0 ? "+" : ""}${accDelta.toFixed(1)}%) | MAE: ${mae.toFixed(2)} (${maeDelta >= 0 ? "+" : ""}${maeDelta.toFixed(2)}) | Exact: ${exact.toFixed(0)}% | ±1: ${within1.toFixed(0)}% | ±2: ${within2.toFixed(0)}% | Bias: ${bias >= 0 ? "+" : ""}${bias.toFixed(2)}`,
  );
}

async function main() {
  const { data, error } = await supabase
    .from("calibration_anchors")
    .select("id, question, essay_text, mark, max_mark, band_label, notes")
    .eq("active", true)
    .order("max_mark", { ascending: true });

  if (error || !data) {
    console.error("Failed to load ECR scripts:", error);
    process.exit(1);
  }

  const scripts = data as EcrRow[];
  console.log(`\n=====================================================================================`);
  console.log(`  MARGINAL ENGINE V4 — REAL CAMBRIDGE 9708 ECR LEAVE-ONE-OUT BENCHMARK (${scripts.length} scripts)`);
  console.log(`  Zero-Cost Orthogonal Free-Groq Panel: OpenAI-120B + Qwen-3.8-27B + Comparative Judge`);
  console.log(`=====================================================================================\n`);

  const results = await runPool(scripts, 1, async (row, idx) => {
    const split = getSplit(row.question, row.max_mark);
    const t0 = Date.now();
    try {
      const out = await gradeEssay(supabase, {
        question: row.question,
        essayText: row.essay_text,
        maxMark: row.max_mark,
        split,
        auditPass: true,
        skipSyllabusPreflight: true,
      });
      const g = out.grading;
      const err = g.total_mark - row.mark;
      const absErr = Math.abs(err);
      const res: ScriptResult = {
        id: row.id.slice(0, 8),
        tariff: row.max_mark,
        question: row.question.slice(0, 58),
        cambridgeMark: row.mark,
        v4Mark: g.total_mark,
        absError: absErr,
        signedError: err,
        pass1Mark: g.ensemble_panel?.pass1Mark ?? null,
        pass2Mark: g.ensemble_panel?.pass2Mark ?? null,
        compMark: g.ensemble_panel?.comparativeMark ?? null,
        arbitrated: Boolean(g.arbitrated),
        violations: g.neuro_symbolic?.violations.length ?? 0,
        latencyMs: Date.now() - t0,
      };
      const tag = absErr === 0 ? "EXACT" : absErr === 1 ? "±1   " : absErr === 2 ? "±2   " : `ERR${absErr} `;
      console.log(
        `[${String(idx + 1).padStart(2)}/${scripts.length}] ${tag} | ${row.max_mark}m | Cam=${String(row.mark).padStart(2)} vs V4=${String(g.total_mark).padStart(2)} (P1=${res.pass1Mark}, P2=${res.pass2Mark}, Comp=${res.compMark}${res.arbitrated ? ", ARB" : ""}) | ${(res.latencyMs / 1000).toFixed(1)}s | ${res.question}`,
      );
      return res;
    } catch (e: any) {
      console.error(`[${idx + 1}/${scripts.length}] FAILED ${row.max_mark}m: ${e?.message || e}`);
      return {
        id: row.id.slice(0, 8),
        tariff: row.max_mark,
        question: row.question.slice(0, 58),
        cambridgeMark: row.mark,
        v4Mark: -1,
        absError: row.max_mark,
        signedError: -row.mark,
        pass1Mark: null,
        pass2Mark: null,
        compMark: null,
        arbitrated: false,
        violations: 0,
        latencyMs: Date.now() - t0,
        error: String(e?.message || e),
      };
    }
  });

  console.log(`\n=====================================================================================`);
  console.log(`  V4 vs PRODUCTION BASELINE COMPARISON`);
  console.log(`=====================================================================================`);
  summarizeGroup("OVERALL", results, 89.6, 1.50);
  summarizeGroup("8-MARK", results.filter((r) => r.tariff === 8), 90.6, 0.75);
  summarizeGroup("12-MARK", results.filter((r) => r.tariff === 12), 91.7, 1.00);
  summarizeGroup("20-MARK", results.filter((r) => r.tariff === 20), 86.3, 1.83);
  console.log(`=====================================================================================\n`);

  const outPath = path.resolve(
    "C:/Users/Saikrish/.gemini/antigravity/brain/69b4f558-f803-42d8-9a36-d31ce0c1d312/scratch/ecr-v4-results.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved full per-script results to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
