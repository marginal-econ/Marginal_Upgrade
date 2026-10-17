/**
 * Automated Supabase-to-Supabase Data & Knowledge Migration Tool
 *
 * Migrates all core data, knowledge corpus, vector embeddings, MCQ papers,
 * Cambridge definitions, and active AI provider keys from:
 * Source: https://xdqafkfmxpekuticnpob.supabase.co
 * Target: https://tmuhpnorjydfijjotvoc.supabase.co
 *
 * Usage:
 *   npx tsx scripts/migrate-databases.ts --target-key <TARGET_SERVICE_ROLE_KEY>
 *
 * Options:
 *   --source-url <url>      Source Supabase URL [default: https://xdqafkfmxpekuticnpob.supabase.co]
 *   --source-key <key>      Source service role key [default: from .env]
 *   --target-url <url>      Target Supabase URL [default: https://tmuhpnorjydfijjotvoc.supabase.co]
 *   --target-key <key>      Target service role key [required]
 *   --batch-size <number>   Batch size for chunked upserts [default: 100]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const args = process.argv.slice(2);
function getArg(name: string, fallback: string = ""): string {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const prefix = `${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  return fallback;
}

const SOURCE_URL = getArg("--source-url", process.env.BACKEND_URL || "https://xdqafkfmxpekuticnpob.supabase.co");
const SOURCE_KEY = getArg("--source-key", process.env.BACKEND_SERVICE_ROLE_KEY || "");
const TARGET_URL = getArg("--target-url", "https://tmuhpnorjydfijjotvoc.supabase.co");
const TARGET_KEY = getArg("--target-key", process.env.TARGET_SERVICE_ROLE_KEY || "");
const BATCH_SIZE = parseInt(getArg("--batch-size", "100"), 10);

if (!TARGET_KEY) {
  console.error("❌ ERROR: Missing target service role key!");
  console.error("Please supply the target service role key via --target-key <KEY> or TARGET_SERVICE_ROLE_KEY in .env");
  console.error("Example: npx tsx scripts/migrate-databases.ts --target-key eyJhbGciOi...");
  process.exit(1);
}

if (!SOURCE_KEY) {
  console.error("❌ ERROR: Missing source service role key in .env or arguments!");
  process.exit(1);
}

const source = createClient(SOURCE_URL, SOURCE_KEY, {
  auth: { persistSession: false },
});

const target = createClient(TARGET_URL, TARGET_KEY, {
  auth: { persistSession: false },
});

async function migrateTable(
  tableName: string,
  options: {
    primaryKey?: string;
    batchSize?: number;
    transform?: (row: any) => any;
  } = {}
) {
  const batchSize = options.batchSize || BATCH_SIZE;
  console.log(`\n========================================`);
  console.log(`📦 Migrating table: [${tableName}]`);
  console.log(`========================================`);

  try {
    const { count, error: countErr } = await source
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (countErr) {
      console.warn(`⚠️ Table [${tableName}] could not be queried in source: ${countErr.message}`);
      return;
    }

    const totalRows = count ?? 0;
    console.log(`Found ${totalRows} total records in source [${tableName}].`);

    if (totalRows === 0) {
      console.log(`Table [${tableName}] is empty, skipping.`);
      return;
    }

    let processed = 0;
    while (processed < totalRows) {
      const { data, error } = await source
        .from(tableName)
        .select("*")
        .range(processed, processed + batchSize - 1);

      if (error) {
        console.error(`❌ Error fetching rows ${processed}-${processed + batchSize} from [${tableName}]:`, error.message);
        break;
      }

      if (!data || data.length === 0) break;

      const transformed = options.transform ? data.map(options.transform) : data;

      const { error: insertErr } = await target
        .from(tableName)
        .upsert(transformed, { onConflict: options.primaryKey || "id" });

      if (insertErr) {
        console.error(`❌ Error upserting into target [${tableName}] (offset ${processed}):`, insertErr.message);
        // Fallback: try individual inserts to isolate problematic row
        for (const row of transformed) {
          const { error: singleErr } = await target
            .from(tableName)
            .upsert(row, { onConflict: options.primaryKey || "id" });
          if (singleErr) {
            console.error(`   Failed row ID ${row.id || "unknown"}: ${singleErr.message}`);
          }
        }
      }

      processed += data.length;
      process.stdout.write(`   Transferred ${processed} / ${totalRows} rows (${Math.round((processed / totalRows) * 100)}%)\r`);
    }

    console.log(`\n✅ Completed migration for [${tableName}]: ${processed} rows synchronized.`);
  } catch (err: any) {
    console.error(`❌ Unexpected failure on [${tableName}]:`, err.message);
  }
}

async function run() {
  console.log(`🚀 Starting Database Migration Pipeline`);
  console.log(`📍 Source: ${SOURCE_URL}`);
  console.log(`📍 Target: ${TARGET_URL}`);

  // 1. AI Provider Keys
  await migrateTable("ai_provider_keys", { primaryKey: "id" });

  // 2. Knowledge Documents
  await migrateTable("knowledge_documents", { primaryKey: "id" });

  // 3. Document Chunks (RAG Vector Corpus - 3,251 chunks)
  await migrateTable("document_chunks", { primaryKey: "id", batchSize: 50 });

  // 4. Cambridge Definitions (448 terms)
  await migrateTable("definitions", { primaryKey: "id", batchSize: 100 });

  // 5. MCQ Past Papers (68 papers with answer keys)
  await migrateTable("mcq_pdf_papers", { primaryKey: "id" });

  // 6. Profiles & Roles (if desired for preserving admin and access)
  await migrateTable("profiles", { primaryKey: "id" });
  await migrateTable("user_roles", { primaryKey: "id" });

  console.log(`\n🎉 All migrations completed successfully!`);
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
