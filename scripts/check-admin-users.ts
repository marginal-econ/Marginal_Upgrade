import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const supabase = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

async function checkAdmin() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const { data: roles } = await supabase.from("user_roles").select("*");
  const { data: profiles } = await supabase.from("profiles").select("*");

  console.log("=== AUTH USERS ===");
  users?.users?.forEach((u) => console.log({ id: u.id, email: u.email, confirmed: u.email_confirmed_at }));

  console.log("\n=== USER ROLES ===");
  console.log(roles);

  console.log("\n=== PROFILES ===");
  console.log(profiles);
}

checkAdmin().catch(console.error);
