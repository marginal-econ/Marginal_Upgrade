import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.BACKEND_URL || "https://xdqafkfmxpekuticnpob.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const TABLES = [
  "profiles",
  "user_roles",
  "subjects",
  "units",
  "topics",
  "knowledge_documents",
  "document_chunks",
  "document_embeddings",
  "essay_submissions",
  "essay_versions",
  "calibration_examples",
  "classes",
  "class_members",
  "class_assignments",
  "custom_diagrams",
  "mcq_papers",
  "mcq_questions",
  "live_examiner_sessions",
  "waitlist_signups",
  "definitions",
  "definition_submissions",
  "definition_topic_groups",
];

async function exportAllData() {
  console.log(`[Backup] Connecting to Supabase at ${SUPABASE_URL}...`);
  const backupDir = path.resolve(process.cwd(), "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Export Auth Users
  try {
    console.log("[Backup] Exporting Auth Users...");
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.warn("  Could not export users directly via admin API:", userError.message);
    } else {
      fs.writeFileSync(
        path.join(backupDir, "auth_users.json"),
        JSON.stringify(users.users ?? [], null, 2),
      );
      console.log(`  ✓ Exported ${users.users?.length ?? 0} auth users`);
    }
  } catch (err) {
    console.warn("  Error exporting users:", err);
  }

  // 2. Export each relational table
  for (const table of TABLES) {
    try {
      console.log(`[Backup] Exporting table: ${table}...`);
      const { data, error } = await supabase.from(table).select("*").limit(5000);
      if (error) {
        console.warn(`  Warning on table ${table}: ${error.message}`);
        fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify([], null, 2));
      } else {
        fs.writeFileSync(
          path.join(backupDir, `${table}.json`),
          JSON.stringify(data ?? [], null, 2),
        );
        console.log(`  ✓ Exported ${data?.length ?? 0} rows from ${table}`);
      }
    } catch (err) {
      console.warn(`  Error exporting ${table}:`, err);
    }
  }

  console.log(`\n[Backup Complete] All data saved to: ${backupDir}`);
}

exportAllData();
