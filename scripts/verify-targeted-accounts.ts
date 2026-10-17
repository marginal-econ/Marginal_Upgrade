import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const url = process.env.BACKEND_URL || process.env.SUPABASE_URL || "";
const serviceKey = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("=== PROFILES AND ROLES IN DATABASE ===");
  const { data: profiles } = await adminClient.from("profiles").select("id, full_name, school").limit(20);
  console.log("Profiles count:", profiles?.length);
  for (const p of profiles || []) {
    console.log(`Profile: id=${p.id}, name=${p.full_name}, school=${p.school}`);
  }

  const { data: roles } = await adminClient.from("user_roles").select("*").limit(20);
  console.log("\nUser roles count:", roles?.length);
  for (const r of roles || []) {
    console.log(`UserRole: user_id=${r.user_id}, role=${r.role}`);
  }

  console.log("\n=== AUTH USERS (bounded to 20 users) ===");
  const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 20 });
  console.log("Total auth users found in page 1:", authData?.users?.length);
  for (const u of authData?.users || []) {
    console.log(`AuthUser: id=${u.id}, email=${u.email}, role=${u.app_metadata?.role || u.user_metadata?.role || "none"}, tier=${u.app_metadata?.tier || u.user_metadata?.tier || "none"}`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
