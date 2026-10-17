import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const supabase = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

const MARGINAL_ADMIN_ID = "00296414-0221-4d5b-aa1c-04dc9366a218";
const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";
const ADMIN_PASSWORD = "MarginalAdmin2026!";

async function run() {
  console.log(`Setting password for admin ${MARGINAL_ADMIN_EMAIL}...`);

  const { data: user, error: userError } = await supabase.auth.admin.updateUserById(
    MARGINAL_ADMIN_ID,
    {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    }
  );

  if (userError) {
    console.error("❌ Failed to set password:", userError.message);
  } else {
    console.log(`✅ Successfully set password for ${MARGINAL_ADMIN_EMAIL}!`);
  }

  // Ensure ONLY marginal.econ.ai@gmail.com has role 'admin'
  console.log("\nEnforcing ONE ADMIN ONLY in user_roles table...");

  // Update saikrish.econ to student
  await supabase
    .from("user_roles")
    .update({ role: "student" })
    .eq("user_id", "210ce19f-1b47-4012-ae4b-3362866f6acb");

  // Ensure marginal.econ.ai is admin
  await supabase
    .from("user_roles")
    .update({ role: "admin" })
    .eq("user_id", MARGINAL_ADMIN_ID);

  const { data: roles } = await supabase.from("user_roles").select("*");
  console.log("Updated user_roles:", roles);
}

run().catch(console.error);
