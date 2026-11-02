import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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

async function main() {
  const { data: latestVersions } = await supabase
    .from("essay_versions")
    .select("id, essay_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  for (const v of latestVersions || []) {
    const { data: essay } = await supabase.from("essays").select("question").eq("id", v.essay_id).single();
    console.log("=================================================");
    console.log("ID:", v.essay_id, "Created:", v.created_at);
    console.log("Question:", essay?.question);
    console.log(`Marks: ${v.total_mark} (AO1: ${v.ao1_awarded}, AO2: ${v.ao2_awarded}, AO3: ${v.ao3_awarded})`);
    console.log("FULL ESSAY TEXT:\n", v.essay_text);
    console.log("EXAMINER SUMMARY:\n", (v.grading as any)?.examiner_summary);
    console.log("STRENGTHS:\n", (v.grading as any)?.strengths);
    console.log("WEAKNESSES:\n", (v.grading as any)?.weaknesses);
    console.log("ACTIONABLE FEEDBACK:\n", (v.grading as any)?.actionable_feedback);
  }
}

main().catch(console.error);
