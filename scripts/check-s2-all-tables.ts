import { createClient } from "@supabase/supabase-js";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function checkS2Tables() {
  console.log("Checking S2 (srukuuhxloxdukonmual) tables...");

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
    const { count, error } = await s2.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ ${table}: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ ${table}: count = ${count}`);
    }
  }
}

checkS2Tables().then(() => process.exit(0)).catch(console.error);
