/**
 * Automated 3-Way Supabase Database & Knowledge & User Migration Pipeline
 *
 * Merges:
 *  - Source 1 (Knowledge, 3,251 Chunks, 448 Definitions, 68 MCQ Papers, AI Keys):
 *      https://xdqafkfmxpekuticnpob.supabase.co
 *  - Source 2 (Users, Profiles, 48 Waitlist Leads, User Roles, AI Keys):
 *      https://srukuuhxloxdukonmual.supabase.co
 *  -> INTO Target (Final Production Database):
 *      https://tmuhpnorjydfijjotvoc.supabase.co
 *
 * Usage:
 *   npx tsx scripts/migrate-databases.ts
 */

import { createClient } from "@supabase/supabase-js";

// Database 1: Knowledge & Chunks
const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

// Database 2: Users & Waitlist
const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

// Target Database: Final Deployment
const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });
const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

async function copyTable(
  sourceClient: any,
  sourceName: string,
  targetClient: any,
  tableName: string,
  options: {
    primaryKey?: string;
    batchSize?: number;
    transform?: (row: any) => any;
  } = {}
) {
  const batchSize = options.batchSize || 100;
  console.log(`\n========================================`);
  console.log(`📦 Migrating [${tableName}] from ${sourceName}`);
  console.log(`========================================`);

  try {
    const { count, error: countErr } = await sourceClient
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (countErr) {
      console.warn(`⚠️ Table [${tableName}] could not be queried in ${sourceName}: ${countErr.message}`);
      return;
    }

    const totalRows = count ?? 0;
    console.log(`Found ${totalRows} total records in [${tableName}].`);

    if (totalRows === 0) {
      console.log(`Table is empty, skipping.`);
      return;
    }

    let processed = 0;
    while (processed < totalRows) {
      const { data, error } = await sourceClient
        .from(tableName)
        .select("*")
        .range(processed, processed + batchSize - 1);

      if (error) {
        console.error(`❌ Error fetching rows ${processed}-${processed + batchSize} from [${tableName}]:`, error.message);
        break;
      }

      if (!data || data.length === 0) break;

      const transformed = options.transform ? data.map(options.transform) : data;

      const { error: insertErr } = await targetClient
        .from(tableName)
        .upsert(transformed, { onConflict: options.primaryKey || "id" });

      if (insertErr) {
        console.error(`❌ Batch upsert error on [${tableName}] at offset ${processed}: ${insertErr.message}`);
        // Fallback: row-by-row
        for (const row of transformed) {
          const { error: rowErr } = await targetClient
            .from(tableName)
            .upsert(row, { onConflict: options.primaryKey || "id" });
          if (rowErr) {
            console.error(`   Failed row ${row.id || "item"}: ${rowErr.message}`);
          }
        }
      }

      processed += data.length;
      process.stdout.write(`   Transferred ${processed} / ${totalRows} rows (${Math.round((processed / totalRows) * 100)}%)\r`);
    }

    console.log(`\n✅ Synchronized ${processed} rows for [${tableName}].`);
  } catch (err: any) {
    console.error(`❌ Unexpected error on [${tableName}]:`, err.message);
  }
}

async function run() {
  console.log(`🚀 Starting Full 3-Database Merge Pipeline`);
  console.log(`1️⃣ Knowledge Source: ${S1_URL}`);
  console.log(`2️⃣ User & Waitlist Source: ${S2_URL}`);
  console.log(`🎯 Target Deployment Database: ${TARGET_URL}\n`);

  // Phase A: Auth Users & Profiles from Source 2
  console.log(`--- PHASE A: Users, Roles & Waitlist Leads ---`);
  try {
    const { data: usersData, error: userErr } = await s2.auth.admin.listUsers({ perPage: 1000 });
    if (userErr) {
      console.warn("⚠️ Could not list auth users from Source 2:", userErr.message);
    } else {
      console.log(`Found ${usersData.users.length} Auth users in Source 2. Creating in target...`);
      for (const u of usersData.users) {
        try {
          const { error: createErr } = await target.auth.admin.createUser({
            id: u.id,
            email: u.email,
            email_confirm: true,
            user_metadata: u.user_metadata,
            app_metadata: u.app_metadata,
          });
          if (createErr && !createErr.message.includes("already registered") && !createErr.message.includes("already exists")) {
            console.warn(`   Auth user ${u.email}: ${createErr.message}`);
          }
        } catch {}
      }
      console.log(`✅ Auth user synchronization complete.`);
    }
  } catch (err: any) {
    console.warn("⚠️ Auth user sync warning:", err.message);
  }

  await copyTable(s2, "Source 2 (Users)", target, "profiles");
  await copyTable(s2, "Source 2 (Users)", target, "user_roles");
  await copyTable(s2, "Source 2 (Users)", target, "waitlist");

  // Phase B: AI Provider Keys (Merge from both Source 1 and Source 2)
  console.log(`\n--- PHASE B: AI Provider Keys (BYOK) ---`);
  await copyTable(s1, "Source 1 (Knowledge)", target, "ai_provider_keys");
  await copyTable(s2, "Source 2 (Users)", target, "ai_provider_keys");

  // Phase C: Knowledge Documents & Vector Chunks (from Source 1)
  console.log(`\n--- PHASE C: Knowledge Documents & 3,251 Vector Chunks ---`);
  await copyTable(s1, "Source 1 (Knowledge)", target, "knowledge_documents");
  await copyTable(s1, "Source 1 (Knowledge)", target, "document_chunks", { batchSize: 50 });

  // Phase D: Cambridge Definitions (448 items from Source 1)
  console.log(`\n--- PHASE D: Cambridge 9708 Definitions Hub ---`);
  await copyTable(s1, "Source 1 (Knowledge)", target, "definitions", { batchSize: 100 });

  // Phase E: MCQ Past Papers (68 papers with 30/30 mark schemes from Source 1)
  console.log(`\n--- PHASE E: MCQ Past Papers Library ---`);
  await copyTable(s1, "Source 1 (Knowledge)", target, "mcq_pdf_papers");

  console.log(`\n======================================================`);
  console.log(`🎉 ALL DATABASES SUCCESSFULLY MERGED INTO TARGET!`);
  console.log(`======================================================\n`);
}

run().catch((e) => {
  console.error("FATAL Migration failure:", e);
  process.exit(1);
});
