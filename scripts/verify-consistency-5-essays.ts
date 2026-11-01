import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { setRuntimeEnv } from "../src/server/env";
import { markAoAttempt } from "../src/lib/examiner/ao-fixer.server";

function loadEnvFallback() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envObj: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
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
        envObj[key] = val;
      }
    }
  }
  setRuntimeEnv(envObj);
}
loadEnvFallback();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runConsistencyTest() {
  console.log("=== CONSISTENCY TEST: 5 REAL GRADED ESSAYS VS AO FIXER ===\n");

  // Fetch 5 graded essays that have grading metadata
  const { data: versions, error } = await supabase
    .from("essay_versions")
    .select("id, essay_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading")
    .not("grading", "is", null)
    .not("total_mark", "is", null)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !versions || versions.length < 5) {
    console.error("Could not fetch 5 versions:", error?.message);
    process.exit(1);
  }

  const selectedVersions = versions.slice(0, 5);

  let essayIndex = 1;
  for (const v of selectedVersions) {
    const { data: essay } = await supabase
      .from("essays")
      .select("question, max_mark")
      .eq("id", v.essay_id)
      .single();

    const question = essay?.question || "Discuss whether government intervention corrects market failure.";
    const grading = v.grading as any;
    const originalAo1 = grading?.ao_breakdown?.knowledge?.awarded ?? v.ao1_awarded;
    const originalAo2 = grading?.ao_breakdown?.analysis?.awarded ?? v.ao2_awarded;
    const originalAo3 = grading?.ao_breakdown?.evaluation?.awarded ?? v.ao3_awarded;

    console.log(`\n------------------------------------------------------------`);
    console.log(`ESSAY #${essayIndex}: "${question.slice(0, 80)}..."`);
    console.log(`Grader Marks: Total ${v.total_mark}/12 | AO1: ${originalAo1}/2, AO2: ${originalAo2}/6, AO3: ${originalAo3}/4`);
    console.log(`Grader Level / Band: ${grading?.band || "Standard"}`);

    // Extract actual student paragraph or conclusion (skipping diagram metadata blocks)
    const text = v.essay_text || "";
    const cleanParagraphs = text
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 50 && !p.startsWith("[DIAGRAM:"));

    const conclusion = cleanParagraphs[cleanParagraphs.length - 1] || cleanParagraphs[0] || text.slice(0, 300);

    console.log(`\nTesting AO3 Evaluation in AO Fixer with conclusion paragraph (${conclusion.split(/\s+/).length} words):`);
    console.log(`"${conclusion.slice(0, 150)}..."`);

    try {
      const aoFixerResult = await markAoAttempt(supabase, {
        ao: "ao3",
        question,
        studentText: conclusion,
        attemptNumber: 1,
      });

      console.log(`AO Fixer Result:`);
      console.log(`- Mark Awarded: ${aoFixerResult.mark}/${aoFixerResult.maxMark}`);
      console.log(`- Table Level Label: ${aoFixerResult.tableLevelLabel}`);
      console.log(`- Reason: ${aoFixerResult.reasonLine}`);
      console.log(`- Active Caps: [${aoFixerResult.activeCapIds.join(", ") || "None"}]`);
      console.log(`- Quoted Evidence: "${aoFixerResult.whatYouDidRightQuote}"`);

      // Compare
      const matchesCapOrLevel = (originalAo3 <= 2 && aoFixerResult.mark <= 2) || (originalAo3 >= 3 && aoFixerResult.mark >= 3) || (Math.abs(originalAo3 - aoFixerResult.mark) <= 1);
      console.log(`- Consistency Check: ${matchesCapOrLevel ? "PASS (Aligned with Cambridge standards)" : "DRIFT DETECTED"}`);
    } catch (e: any) {
      console.log(`Error running AO Fixer for script #${essayIndex}:`, e.message);
    }

    essayIndex++;
  }

  console.log(`\n=== CONSISTENCY TEST COMPLETED ===\n`);
}

runConsistencyTest().then(() => process.exit(0)).catch(console.error);
