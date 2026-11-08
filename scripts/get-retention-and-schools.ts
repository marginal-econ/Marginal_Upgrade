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
  // 1. Fetch all users from Auth
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = authData?.users || [];
  
  const now = new Date("2026-11-08T06:50:00Z").getTime();
  const d7 = 7 * 24 * 60 * 60 * 1000;
  const d30 = 30 * 24 * 60 * 60 * 1000;

  let activeLast7Days = 0;
  let activeLast30Days = 0;
  let returningUsersCount = 0; // users where last_sign_in_at is > 24 hours after created_at

  for (const u of users) {
    const created = new Date(u.created_at).getTime();
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : created;

    if (now - lastSignIn <= d7) activeLast7Days++;
    if (now - lastSignIn <= d30) activeLast30Days++;
    if (lastSignIn - created > 24 * 60 * 60 * 1000) returningUsersCount++;
  }

  // 2. Fetch profiles for schools
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, school, created_at");
  const schoolCounts: Record<string, number> = {};
  for (const p of profiles || []) {
    const s = p.school?.trim() || "Unknown / Not specified";
    schoolCounts[s] = (schoolCounts[s] || 0) + 1;
  }

  // 3. Fetch essays stats
  const { data: essays } = await supabase.from("essays").select("id, user_id, latest_mark, max_mark, created_at");
  const essaysCount = essays?.length || 0;
  const essayUsers = new Set(essays?.map(e => e.user_id).filter(Boolean));

  // 4. MCQ attempts stats
  const { count: mcqPdfCount } = await supabase.from("mcq_pdf_attempts").select("*", { count: "exact", head: true });

  console.log(JSON.stringify({
    totalRegisteredUsers: users.length,
    activeLast7Days,
    activeLast30Days,
    returningUsersAfter24h: returningUsersCount,
    returnRatePercentage: ((returningUsersCount / users.length) * 100).toFixed(1) + "%",
    schoolBreakdown: schoolCounts,
    totalEssays: essaysCount,
    uniqueEssaySubmitters: essayUsers.size,
    mcqPdfAttempts: mcqPdfCount
  }, null, 2));
}

run().catch(console.error);
