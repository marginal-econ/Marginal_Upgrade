import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function setAnchorsAndKiruthika() {
  console.log("Adding 12/12 real student anchor to S2...");
  const { data: v12 } = await s1
    .from("essay_versions")
    .select("essay_text, grading")
    .eq("id", "a38dfd80-cd77-45ac-8404-c3c778feeccb")
    .single();

  if (v12) {
    const { error: ancErr } = await s2.from("calibration_anchors").upsert({
      id: "a38dfd80-cd77-45ac-8404-c3c778feeccb",
      question:
        "Unemployment can be measured by the claimant count or the labour force survey. Discuss the difficulties involved in measuring unemployment and assess which of these two measures is more reliable. [12]",
      essay_text: v12.essay_text,
      mark: 12,
      max_mark: 12,
      band_label: "top",
      notes: "Genuine student 12/12 Level 4/5 full marks response comparing claimant count vs ILO Labour Force Survey.",
      active: true,
      created_at: new Date().toISOString(),
    });
    if (ancErr) {
      console.warn("Anchor upsert warning:", ancErr.message);
    } else {
      console.log("✅ 12/12 Student Anchor added to calibration_anchors in S2.");
    }
  }

  // Check anchors
  const { data: anchors } = await s2.from("calibration_anchors").select("id, question, mark, max_mark, band_label");
  console.log("S2 Calibration Anchors now:", anchors);

  // Check Kiruthika
  const { data: kUserList } = await s2.auth.admin.listUsers();
  const kUser = kUserList?.users.find((u) => u.email === "kiruthika240409@gmail.com");
  if (kUser) {
    console.log("Found Kiruthika user:", kUser.id);
    const { error: rErr } = await s2.from("user_roles").upsert({
      user_id: kUser.id,
      role: "teacher",
    });
    const { error: pErr } = await s2.from("profiles").upsert({
      id: kUser.id,
      full_name: "Kiruthika",
      role: "teacher",
    });
    const { error: tpErr } = await s2.from("teacher_profiles").upsert({
      user_id: kUser.id,
      school_name: "Cambridge International",
      approval_status: "approved",
    });
    console.log("Kiruthika updates:", { rErr, pErr, tpErr });
  }

  // Check MCQ papers
  const { count: mcqCount } = await s2.from("mcq_pdf_papers").select("*", { count: "exact", head: true });
  console.log("MCQ papers in S2:", mcqCount);
}

setAnchorsAndKiruthika().then(() => process.exit(0)).catch(console.error);
