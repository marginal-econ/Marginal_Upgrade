import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });

async function findTopEssays() {
  const { data: versions } = await s1
    .from("essay_versions")
    .select("id, essay_id, total_mark, model, ao1_awarded, ao2_awarded, ao3_awarded, created_at, showcased")
    .order("total_mark", { ascending: false });

  console.log(`Found ${versions?.length} essay versions.`);
  for (const v of versions?.slice(0, 15) || []) {
    const { data: essay } = await s1.from("essays").select("question, max_mark").eq("id", v.essay_id).single();
    console.log(`\nMark: ${v.total_mark}/${essay?.max_mark} (Model: ${v.model}, Showcased: ${v.showcased})`);
    console.log(`Question: ${essay?.question?.slice(0, 90)}...`);
    console.log(`Version ID: ${v.id}, Essay ID: ${v.essay_id}`);
  }
}

findTopEssays().then(() => process.exit(0)).catch(console.error);
