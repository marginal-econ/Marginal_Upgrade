import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const supabase = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

async function grantAdmin() {
  const { data, error } = await supabase
    .from("user_roles")
    .update({ role: "admin" })
    .eq("user_id", "210ce19f-1b47-4012-ae4b-3362866f6acb");

  if (error) {
    console.error("❌ Failed to grant admin role:", error);
  } else {
    console.log("✅ Successfully updated role to 'admin' for saikrish.econ@gmail.com!");
  }
}

grantAdmin().catch(console.error);
