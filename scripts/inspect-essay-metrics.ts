import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
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
}
loadEnv();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: essays } = await supabase.from("essays").select("id, question, mark, max_mark, grade, created_at, user_id").limit(20);
  console.log("Sample essays:", JSON.stringify(essays, null, 2));

  // Check unique active users who submitted essays
  const { data: allEssays } = await supabase.from("essays").select("user_id, created_at, mark, max_mark, grade");
  const activeEssayUsers = new Set(allEssays?.map(e => e.user_id).filter(Boolean));
  console.log("Total essays:", allEssays?.length);
  console.log("Unique users who submitted essays:", activeEssayUsers.size);

  // Check date ranges
  const dates = allEssays?.map(e => new Date(e.created_at).getTime()).filter(Boolean) || [];
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates)).toISOString();
    const maxDate = new Date(Math.max(...dates)).toISOString();
    console.log("Essay date range:", { minDate, maxDate });
  }

  // Check calibration anchors
  const { data: anchors } = await supabase.from("calibration_anchors").select("id, subject, paper, question_number, human_mark, total_marks, grade").limit(10);
  console.log("Calibration anchors sample:", JSON.stringify(anchors, null, 2));
}

run().catch(console.error);
