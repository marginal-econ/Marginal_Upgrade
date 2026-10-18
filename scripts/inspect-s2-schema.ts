import { createClient } from "@supabase/supabase-js";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function inspectSchema() {
  console.log("Checking columns by inserting dummy and catching or checking definitions...");

  // We can query pg_catalog / information_schema or just inspect an empty select
  const { data: eData, error: eErr } = await s2.from("essays").select("*").limit(0);
  console.log("essays select empty error:", eErr);

  const { data: evData, error: evErr } = await s2.from("essay_versions").select("*").limit(0);
  console.log("essay_versions select empty error:", evErr);
  
  const { data: kdData, error: kdErr } = await s2.from("knowledge_documents").select("*").limit(1);
  console.log("knowledge_documents sample:", kdData ? Object.keys(kdData[0] || {}) : kdErr);

  const { data: caData, error: caErr } = await s2.from("calibration_anchors").select("*").limit(1);
  console.log("calibration_anchors sample:", caData ? Object.keys(caData[0] || {}) : caErr);
}

inspectSchema().then(() => process.exit(0)).catch(console.error);
