import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const supabase = createClient(
  process.env.BACKEND_URL!,
  process.env.BACKEND_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ADMIN_ID = "00296414-0221-4d5b-aa1c-04dc9366a218";
const ADMIN_EMAIL = "marginal.econ.ai@gmail.com";
const ADMIN_PASSWORD = "MarginalAdmin2026!";

async function setupAdmin() {
  console.log(`Creating/provisioning sole admin: ${ADMIN_EMAIL}...`);
  
  // 1. Create auth user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    id: ADMIN_ID,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Marginal Admin", role: "admin" },
  });

  if (createError) {
    if (createError.message.includes("already")) {
      console.log("User already exists, updating password and metadata...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(ADMIN_ID, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Marginal Admin", role: "admin" },
      });
      if (updateError) {
        console.error("Failed to update admin user:", updateError);
        return;
      }
    } else {
      console.error("Failed to create admin user:", createError);
      return;
    }
  } else {
    console.log("✅ Admin user created in auth.users:", userData.user.id);
  }

  // 2. Ensure profile exists in profiles table
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: ADMIN_ID,
    full_name: "Marginal Admin",
  });
  if (profileError) console.warn("Profile upsert:", profileError.message);
  else console.log("✅ Profile created/updated.");

  // 3. Ensure user_roles has admin role
  const { error: roleError } = await supabase.from("user_roles").upsert(
    { user_id: ADMIN_ID, role: "admin" },
    { onConflict: "user_id,role" }
  );
  if (roleError) console.warn("Role upsert:", roleError.message);
  else console.log("✅ Role 'admin' assigned to", ADMIN_ID);

  // 4. Remove any other admin roles in user_roles
  const { data: roles } = await supabase.from("user_roles").select("*").eq("role", "admin");
  for (const r of (roles || [])) {
    if (r.user_id !== ADMIN_ID) {
      console.log(`Removing non-admin role from ${r.user_id}...`);
      await supabase.from("user_roles").delete().eq("id", r.id);
    }
  }

  console.log("\n🎉 Sole Administrator Setup Complete!");
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   User ID: ${ADMIN_ID}`);
}

setupAdmin().catch(console.error);
