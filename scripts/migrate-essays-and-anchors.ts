import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

async function syncEssaysAndAnchors() {
  console.log("Checking target connection...");

  // 1. Calibration Anchors
  console.log("Syncing Calibration Anchors from S1...");
  const { data: anchors, error: aErr } = await s1.from("calibration_anchors").select("*");
  if (aErr) {
    console.error("Error fetching anchors from S1:", aErr.message);
  } else if (anchors && anchors.length > 0) {
    for (const a of anchors) {
      const { error: insErr } = await target.from("calibration_anchors").upsert({
        id: a.id,
        question: a.question,
        essay_text: a.essay_text,
        mark: a.mark,
        max_mark: a.max_mark,
        band_label: a.band_label,
        notes: a.notes,
        active: a.active,
        created_by: a.created_by,
        created_at: a.created_at,
      });
      if (insErr) {
        console.warn(`Anchor ${a.id} insert notice:`, insErr.message);
      } else {
        console.log(`✅ Anchor ${a.id} synced (${a.mark}/${a.max_mark})`);
      }
    }
  }

  // 2. Essays & Versions
  console.log("Syncing Essays from S1...");
  const { data: essays, error: eErr } = await s1.from("essays").select("*").limit(200);
  if (eErr) {
    console.error("Error fetching essays from S1:", eErr.message);
    return;
  }

  console.log(`Found ${essays?.length ?? 0} essays in S1.`);
  if (essays) {
    for (const e of essays) {
      const { error: insErr } = await target.from("essays").upsert({
        id: e.id,
        user_id: e.user_id,
        question: e.question,
        max_mark: e.max_mark,
        topic_id: e.topic_id,
        latest_mark: e.latest_mark,
        created_at: e.created_at,
        updated_at: e.updated_at,
      });
      if (insErr) {
        console.warn(`Essay ${e.id} notice:`, insErr.message);
      }
    }
    console.log("✅ Essays upsert complete.");
  }

  console.log("Syncing Essay Versions from S1...");
  const { data: versions, error: vErr } = await s1.from("essay_versions").select("*").limit(300);
  if (vErr) {
    console.error("Error fetching versions from S1:", vErr.message);
    return;
  }

  console.log(`Found ${versions?.length ?? 0} essay versions in S1.`);
  if (versions) {
    for (const v of versions) {
      const { error: insErr } = await target.from("essay_versions").upsert({
        id: v.id,
        essay_id: v.essay_id,
        user_id: v.user_id,
        version: v.version,
        essay_text: v.essay_text,
        grading: v.grading,
        total_mark: v.total_mark,
        ao1_awarded: v.ao1_awarded,
        ao2_awarded: v.ao2_awarded,
        ao3_awarded: v.ao3_awarded,
        confidence: v.confidence,
        audited: v.audited,
        sources: v.sources,
        model: v.model,
        showcased: v.total_mark >= 10,
        showcase_consented: true,
        created_at: v.created_at,
      });
      if (insErr) {
        console.warn(`Version ${v.id} notice:`, insErr.message);
      }
    }
    console.log("✅ Essay versions upsert complete.");
  }
}

syncEssaysAndAnchors().then(() => process.exit(0)).catch(console.error);
