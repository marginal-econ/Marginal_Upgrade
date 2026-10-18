import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tmuhpnorjydfijjotvoc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.BACKEND_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkTarget() {
  console.log("Checking target Supabase (actual GET query):", SUPABASE_URL);

  const tablesToCheck = [
    "profiles",
    "user_roles",
    "subjects",
    "units",
    "topics",
    "knowledge_documents",
    "document_chunks",
    "definitions",
    "mcq_pdf_papers",
    "mcq_pdf_attempts",
    "ai_provider_keys",
    "waitlist",
    "user_subscriptions",
    "essays",
    "essay_versions",
    "calibration_anchors",
    "classrooms",
    "classroom_members",
    "classroom_assignments",
    "classroom_submissions",
    "classroom_teachers",
    "showcase_essays"
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await sb.from(table).select("*").limit(1);
    if (error) {
      console.log(`❌ ${table}: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }
}

checkTarget().then(() => process.exit(0)).catch(console.error);
