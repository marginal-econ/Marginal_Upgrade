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
  console.log("Connecting to Supabase...");
  
  // 1. Auth Users
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const totalAuthUsers = authUsers?.users?.length ?? 0;

  // 2. Profiles
  const { count: profileCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  // 3. Waitlist
  const { count: waitlistCount } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
  const { data: waitlistSamples } = await supabase.from("waitlist").select("status, created_at").limit(500);

  // 4. Essays
  const { count: essayCount } = await supabase.from("essays").select("*", { count: "exact", head: true });
  const { count: essayVersionCount } = await supabase.from("essay_versions").select("*", { count: "exact", head: true });
  
  // 5. Live Examiner Sessions
  const { count: liveSessionsCount } = await supabase.from("live_examiner_sessions").select("*", { count: "exact", head: true });

  // 6. MCQ Attempts
  const { count: mcqAttemptsCount } = await supabase.from("mcq_attempts").select("*", { count: "exact", head: true });
  const { count: mcqPdfAttemptsCount } = await supabase.from("mcq_pdf_attempts").select("*", { count: "exact", head: true });

  // 7. Schools / Organizations
  const { count: schoolsCount } = await supabase.from("schools").select("*", { count: "exact", head: true });
  const { data: profilesWithSchools } = await supabase.from("profiles").select("school").not("school", "is", null);

  // 8. Calibration Anchors / Benchmarks
  const { count: anchorsCount } = await supabase.from("calibration_anchors").select("*", { count: "exact", head: true });
  const { count: benchmarksCount } = await supabase.from("examiner_benchmarks").select("*", { count: "exact", head: true });
  const { count: markingSessionsCount } = await supabase.from("examiner_marking_sessions").select("*", { count: "exact", head: true });
  const { count: candidateScriptsCount } = await supabase.from("examiner_candidate_scripts").select("*", { count: "exact", head: true });

  // 9. AI Usage Log
  const { count: aiLogCount } = await supabase.from("ai_usage_log").select("*", { count: "exact", head: true });
  const { data: aiLogSamples } = await supabase.from("ai_usage_log").select("tokens, prompt_tokens, completion_tokens, model, cost").limit(100);

  // 10. Sample Users for creation date analysis (retention)
  const userCreationDates = authUsers?.users?.map(u => ({
    id: u.id,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email: u.email
  })) ?? [];

  console.log(JSON.stringify({
    totalAuthUsers,
    profileCount,
    waitlistCount,
    waitlistStatusCounts: waitlistSamples?.reduce((acc: any, cur: any) => {
      acc[cur.status] = (acc[cur.status] || 0) + 1;
      return acc;
    }, {}),
    essayCount,
    essayVersionCount,
    liveSessionsCount,
    mcqAttemptsCount,
    mcqPdfAttemptsCount,
    schoolsCount,
    uniqueProfileSchools: Array.from(new Set(profilesWithSchools?.map(p => p.school).filter(Boolean))),
    anchorsCount,
    benchmarksCount,
    markingSessionsCount,
    candidateScriptsCount,
    aiLogCount,
    userActiveSample: {
      total: userCreationDates.length,
      sample: userCreationDates.slice(0, 10)
    }
  }, null, 2));
}

run().catch(console.error);
