import { createClient } from "@supabase/supabase-js";

// From scripts/migrate-databases.ts
const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function checkS2() {
  console.log("Checking srukuuhxloxdukonmual (Database 2)...");
  try {
    const { data: usersData, error } = await s2.auth.admin.listUsers({ perPage: 100 });
    if (error) {
      console.log("S2 listUsers error:", error.message);
      return;
    }
    console.log("Total users in S2:", usersData.users.length);
    for (const u of usersData.users) {
      if (u.email?.includes("saikrish") || u.email?.includes("kiruthika") || u.email?.includes("marginal")) {
        console.log("S2 User Match:", {
          id: u.id,
          email: u.email,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
        });
      }
    }

    const { data: roles } = await s2.from("user_roles").select("*").limit(20);
    console.log("S2 user_roles:", roles);

    const { data: defs } = await s2.from("definitions").select("term, category, definition_text").ilike("category", "%sub%").limit(10);
    console.log("S2 sub definitions:", defs);
  } catch (err: any) {
    console.error("S2 check error:", err.message);
  }
}

checkS2().then(() => process.exit(0)).catch(console.error);
