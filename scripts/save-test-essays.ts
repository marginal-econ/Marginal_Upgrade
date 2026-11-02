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
  const { data: v1 } = await supabase
    .from("essay_versions")
    .select("essay_text")
    .eq("essay_id", "f224184f-5a86-4dd4-849d-f1a9512c7059")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: v2 } = await supabase
    .from("essay_versions")
    .select("essay_text")
    .eq("essay_id", "a4f17011-87df-462b-afda-90a34ad0e2a7")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (v1) fs.writeFileSync("scripts/demerit_essay.txt", v1.essay_text);
  if (v2) fs.writeFileSync("scripts/freetrade_essay.txt", v2.essay_text);
  console.log("Saved both essays to scripts/ successfully!");
}

run();
