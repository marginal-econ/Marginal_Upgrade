import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });

async function checkS1Tables() {
  console.log("Checking S1 (xdqafkfmxpekuticnpob) tables...");

  const tablesToCheck = [
    "profiles",
    "user_roles",
    "teacher_profiles",
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
    const { count, error } = await s1.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ ${table}: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ ${table}: count = ${count}`);
    }
  }
}

checkS1Tables().then(() => process.exit(0)).catch(console.error);
