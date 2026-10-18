import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function compareUsers() {
  const { data: s1Users } = await s1.auth.admin.listUsers({ perPage: 100 });
  const { data: s2Users } = await s2.auth.admin.listUsers({ perPage: 100 });

  console.log(`S1 Users count: ${s1Users?.users.length ?? 0}`);
  console.log(`S2 Users count: ${s2Users?.users.length ?? 0}`);

  console.log("\nS2 Users:");
  for (const u of s2Users?.users || []) {
    console.log(`- ${u.id} | ${u.email} | app_meta: ${JSON.stringify(u.app_metadata)}`);
  }

  // Check which user IDs own essays in S1
  const { data: essayOwners } = await s1.from("essays").select("user_id");
  const uniqueOwnerIds = Array.from(new Set(essayOwners?.map((e) => e.user_id) || []));
  console.log(`\nUnique essay owner IDs in S1 (${uniqueOwnerIds.length}):`, uniqueOwnerIds);

  for (const ownerId of uniqueOwnerIds) {
    const s1Owner = s1Users?.users.find((u) => u.id === ownerId);
    const s2Owner = s2Users?.users.find((u) => u.id === ownerId);
    console.log(`Owner ${ownerId}: S1 email=${s1Owner?.email || "NOT FOUND"}, S2 exists=${!!s2Owner}`);
  }
}

compareUsers().then(() => process.exit(0)).catch(console.error);
