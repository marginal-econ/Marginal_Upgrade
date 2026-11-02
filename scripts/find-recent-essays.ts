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

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function run() {
  const essayIds = [
    "f224184f-5a86-4dd4-849d-f1a9512c7059", // demerit goods
    "9e96f4e9-da26-46ee-86fc-fd84a23cddf9", // free trade
    "a4f17011-87df-462b-afda-90a34ad0e2a7", // free trade 2
    "05122e1c-fef5-43cc-a7ad-29deb04fb40c", // supply side (4)
    "6fbe01e3-16ac-4b93-8cc0-c496a52bb3a4", // merit goods (10)
  ];

  for (const id of essayIds) {
    const { data: essay } = await supabase.from("essays").select("*").eq("id", id).single();
    const { data: versions } = await supabase.from("essay_versions").select("id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at").eq("essay_id", id).order("created_at", { ascending: false }).limit(1);
    const v = versions?.[0];
    console.log("=================================================");
    console.log("ESSAY ID:", id);
    console.log("QUESTION:", essay?.question);
    console.log("LAST TOTAL MARK:", v?.total_mark, `(AO1: ${v?.ao1_awarded}, AO2: ${v?.ao2_awarded}, AO3: ${v?.ao3_awarded})`);
    console.log("TEXT PREVIEW:\n", v?.essay_text?.slice(0, 300));
    console.log("EXAMINER SUMMARY:\n", (v?.grading as any)?.examiner_summary);
  }
}

run();
