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
  const { data, error } = await supabase.from("essays").select("*").limit(1);
  if (error) {
    console.error("Essays error:", error);
  } else {
    console.log("Essays cols:", Object.keys(data[0] || {}));
  }

  const { data: anchors, error: aErr } = await supabase.from("calibration_anchors").select("*").limit(1);
  if (aErr) {
    console.error("Anchors error:", aErr);
  } else {
    console.log("Anchors cols:", Object.keys(anchors[0] || {}));
    console.log("Sample anchor:", anchors[0]);
  }
}

run().catch(console.error);
