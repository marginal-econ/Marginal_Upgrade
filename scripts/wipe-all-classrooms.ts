import { supabaseAdmin } from "../src/integrations/backend/client.server";

async function main() {
  console.log("Checking and wiping all classrooms as requested by user...");

  // 1. Check existing classrooms count
  const { data: existingClassrooms, error: listErr } = await supabaseAdmin
    .from("classrooms")
    .select("id, name, teacher_id, level, join_code, created_at");

  if (listErr) {
    console.error("Error listing classrooms:", listErr);
    process.exit(1);
  }

  console.log(`Found ${existingClassrooms?.length ?? 0} existing classroom(s):`, existingClassrooms);

  // 2. Cascade delete dependent tables first
  const tablesToClear = [
    "classroom_comments",
    "classroom_submissions",
    "classroom_messages",
    "classroom_announcements",
    "classroom_assignments",
    "classroom_teachers",
    "classroom_members",
    "classrooms",
  ];

  for (const table of tablesToClear) {
    try {
      const { error, count } = await supabaseAdmin
        .from(table as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows

      if (error) {
        console.warn(`Note when clearing ${table}:`, error.message);
      } else {
        console.log(`✅ Cleared table ${table} successfully`);
      }
    } catch (err: any) {
      console.warn(`Exception clearing ${table}:`, err?.message || err);
    }
  }

  // Verify classrooms is empty
  const { count: finalCount } = await supabaseAdmin
    .from("classrooms")
    .select("id", { count: "exact", head: true });

  console.log(`Final active classroom count in database: ${finalCount ?? 0}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
