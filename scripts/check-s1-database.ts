import { createClient } from "@supabase/supabase-js";

// Database 1: Knowledge & Chunks
const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });

async function checkS1() {
  console.log("Checking xdqafkfmxpekuticnpob (Database 1)...");
  try {
    const { data: usersData, error } = await s1.auth.admin.listUsers({ perPage: 100 });
    if (error) {
      console.log("S1 listUsers error:", error.message);
      return;
    }
    console.log("Total users in S1:", usersData?.users?.length);
    for (const u of usersData?.users || []) {
      if (u.email?.includes("saikrish") || u.email?.includes("kiruthika") || u.email?.includes("marginal")) {
        console.log("S1 User Match:", {
          id: u.id,
          email: u.email,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
        });
      }
    }
  } catch (err: any) {
    console.error("S1 check error:", err.message);
  }
}

checkS1().then(() => process.exit(0)).catch(console.error);
