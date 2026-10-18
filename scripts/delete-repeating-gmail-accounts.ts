import { supabaseAdmin } from "../src/integrations/backend/client.server";

const REPEATING_GMAIL_EMAILS = [
  "rajapsarvesh@gmail.com",
  "anarsharun@gmail.com",
  "saikrish.econ@gmail.com",
];

const VAQUITAVOID_USER_ID = "84ff607d-83f8-43ee-aa20-b632d1e84c14";

async function main() {
  console.log("Starting deletion of repeating Gmail accounts...\n");

  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const users = usersData?.users || [];

  for (const email of REPEATING_GMAIL_EMAILS) {
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.log(`ℹ️ ${email} not found in auth.users (already removed).`);
      // Still clean from waitlist if exists
      const { error: wlErr } = await supabaseAdmin.from("waitlist").delete().eq("email", email);
      if (!wlErr) console.log(`   Cleaned from waitlist table.`);
      continue;
    }

    console.log(`Processing duplicate account: ${email} (${user.id})...`);

    // 1. If it's saikrish.econ, reassign any essays to vaquitavoid before deleting
    if (email === "saikrish.econ@gmail.com") {
      const { data: essays } = await supabaseAdmin
        .from("essays")
        .select("id")
        .eq("user_id", user.id);

      if (essays && essays.length > 0) {
        console.log(`   Reassigning ${essays.length} essay(s) from saikrish.econ to vaquitavoid (${VAQUITAVOID_USER_ID})...`);
        const { error: reassignErr } = await supabaseAdmin
          .from("essays")
          .update({ user_id: VAQUITAVOID_USER_ID })
          .eq("user_id", user.id);

        if (reassignErr) {
          console.error(`   ⚠️ Reassign failed:`, reassignErr.message);
        } else {
          console.log(`   ✅ Essays successfully transferred.`);
        }
      }
    }

    // 2. Delete user-related records from public schema
    await supabaseAdmin.from("daily_feature_usage").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    await supabaseAdmin.from("teacher_profiles").delete().eq("user_id", user.id);
    await supabaseAdmin.from("classroom_members").delete().eq("user_id", user.id);
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);
    await supabaseAdmin.from("waitlist").delete().eq("email", email);

    // 3. Delete from auth.users via Supabase Admin API
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error(`   ❌ Failed to delete ${email} from auth.users:`, delError.message);
    } else {
      console.log(`   ✅ Successfully deleted ${email} from auth.users!`);
    }
  }

  // Final verification: recount users
  const { data: remaining } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  console.log(`\nRemaining users in auth.users: ${remaining?.users.length ?? 0}`);

  const checkStillPresent = remaining?.users.filter(u =>
    REPEATING_GMAIL_EMAILS.includes(u.email?.toLowerCase() || "")
  );

  if (checkStillPresent && checkStillPresent.length > 0) {
    console.warn("⚠️ Some repeating emails still present:", checkStillPresent.map(u => u.email));
  } else {
    console.log("🎉 All repeating Gmail accounts have been completely purged from the system!");
  }
}

main().catch(console.error);
