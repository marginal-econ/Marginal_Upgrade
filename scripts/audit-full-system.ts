import { createClient } from "@supabase/supabase-js";

const url = process.env.BACKEND_URL || process.env.SUPABASE_URL;
const key = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE credentials in env");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log("=== CHECKING TABLES EXISTENCE ===");
  const checkTables = [
    "profiles",
    "user_roles",
    "user_subscriptions",
    "teacher_profiles",
    "definitions",
    "essays",
    "mcq_pdf_papers",
    "classrooms",
    "classroom_students",
    "classroom_assignments",
    "classroom_teachers"
  ];
  for (const table of checkTables) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    console.log(`Table ${table}: count=${count}, error=${error ? error.message : "none"}`);
  }

  console.log("\n=== AUDITING USERS ===");
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers error:", listErr);
    return;
  }
  const users = listData.users;

  for (const email of ["saikrish.econ@gmail.com", "kiruthika240409@gmail.com", "marginal.econ.ai@gmail.com"]) {
    const u = users.find(x => x.email === email);
    console.log(`\n--- USER: ${email} ---`);
    if (!u) {
      console.log("Not found in auth.users");
      continue;
    }
    console.log("auth.users entry:", {
      id: u.id,
      email: u.email,
      email_confirmed_at: u.email_confirmed_at,
      app_metadata: u.app_metadata,
      user_metadata: u.user_metadata,
    });

    const { data: roles } = await admin.from("user_roles").select("*").eq("user_id", u.id);
    console.log("user_roles rows:", roles);

    const { data: tp } = await admin.from("teacher_profiles").select("*").eq("user_id", u.id);
    console.log("teacher_profiles rows:", tp);

    const { data: userSub } = await admin.from("user_subscriptions").select("*").eq("user_id", u.id);
    console.log("user_subscriptions rows:", userSub);

    const { data: defSub } = await admin.from("definitions").select("id, term, category, definition_text").eq("term", `__USER_SUB_${u.id}`);
    console.log("definitions __USER_SUB_:", defSub);

    const { data: upiLogs } = await admin.from("definitions").select("id, term, category, definition_text").eq("category", "upi_payment_request").ilike("definition_text", `%"userId":"${u.id}"%`);
    console.log("UPI payment logs:", upiLogs?.map(l => l.definition_text));
  }

  console.log("\n=== ALL ADMIN ROLES IN DB ===");
  const { data: admins } = await admin.from("user_roles").select("*").eq("role", "admin");
  console.log("Admin rows:", admins);
}

main().catch(console.error);
