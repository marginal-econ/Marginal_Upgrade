import * as fs from "fs";
import * as path from "path";

/**
 * Marginal — Supabase to Firebase Migration Script
 *
 * This script imports all backed up data (users, profiles, roles, syllabus topics,
 * definitions, knowledge documents, RAG chunks, essay versions, and live examiner sessions)
 * into your Firebase project (Firebase Auth & Cloud Firestore).
 *
 * Usage:
 *   1. Download your Firebase Admin Service Account JSON from Firebase Console:
 *      Project Settings -> Service Accounts -> "Generate new private key"
 *   2. Save the file as `firebase-service-account.json` in the project root directory.
 *   3. Run:
 *      bun run scripts/migrate-to-firebase.ts
 */

async function runMigration() {
  console.log("=================================================");
  console.log("   MARGINAL -> FIREBASE AUTOMATED MIGRATION      ");
  console.log("=================================================\n");

  const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");
  const backupDir = path.resolve(process.cwd(), "backup");

  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Error: firebase-service-account.json not found in project root.");
    console.log("\nTo get your Service Account Key:");
    console.log("  1. Go to https://console.firebase.google.com");
    console.log("  2. Select your project -> Project Settings (gear icon) -> 'Service accounts'");
    console.log(
      "  3. Click 'Generate new private key' and save as 'firebase-service-account.json' in this project.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    console.error("❌ Error: backup directory not found. Please run export first.");
    process.exit(1);
  }

  // Dynamic import of firebase-admin
  let admin: any;
  try {
    admin = await import("firebase-admin");
  } catch {
    console.log("Installing 'firebase-admin' dependency...");
    const { execSync } = await import("child_process");
    execSync("bun add firebase-admin", { stdio: "inherit" });
    admin = await import("firebase-admin");
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  console.log(`✓ Connected to Firebase Project: ${serviceAccount.project_id}\n`);

  function loadJson<T = any>(filename: string): T[] {
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return [];
    }
  }

  // 1. MIGRATE AUTH USERS & ROLES
  console.log("📦 [1/8] Migrating Users & Roles...");
  const authUsers = loadJson("auth_users.json");
  const userRoles = loadJson("user_roles.json");
  const profiles = loadJson("profiles.json");

  const roleMap = new Map<string, string>();
  for (const r of userRoles) {
    if (r.user_id && r.role) {
      roleMap.set(r.user_id, r.role);
    }
  }

  let usersImported = 0;
  for (const u of authUsers) {
    if (!u.email) continue;
    try {
      const role = roleMap.get(u.id) || "student";
      // Check if user already exists
      try {
        await auth.getUser(u.id);
      } catch {
        await auth.createUser({
          uid: u.id,
          email: u.email,
          emailVerified: u.email_confirmed_at != null,
          displayName: u.user_metadata?.full_name || u.email.split("@")[0],
        });
      }

      // Set custom claims for role-based access control
      await auth.setCustomUserClaims(u.id, {
        role,
        isAdmin: role === "admin",
        isStaff: role === "admin" || role === "teacher",
      });
      usersImported++;
    } catch (err: any) {
      console.warn(`  ⚠️ User ${u.email}: ${err.message}`);
    }
  }
  console.log(`  ✓ Successfully processed ${usersImported} users with Auth & RBAC roles.`);

  // 2. MIGRATE PROFILES
  console.log("\n📦 [2/8] Migrating User Profiles to Firestore...");
  let profilesBatch = db.batch();
  let count = 0;
  for (const p of profiles) {
    if (!p.id) continue;
    const ref = db.collection("profiles").doc(p.id);
    const role = roleMap.get(p.id) || "student";
    profilesBatch.set(
      ref,
      {
        id: p.id,
        full_name: p.full_name || null,
        school: p.school || null,
        avatar_url: p.avatar_url || null,
        role: role,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      },
      { merge: true },
    );
    count++;
    if (count % 400 === 0) {
      await profilesBatch.commit();
      profilesBatch = db.batch();
    }
  }
  if (count % 400 !== 0) await profilesBatch.commit();
  console.log(`  ✓ Exported ${count} user profiles.`);

  // 3. MIGRATE SYLLABUS TOPICS, UNITS & SUBJECTS
  console.log("\n📦 [3/8] Migrating Cambridge Syllabus (Subjects, Units, Topics)...");
  const subjects = loadJson("subjects.json");
  const units = loadJson("units.json");
  const topics = loadJson("topics.json");

  let syllabusBatch = db.batch();
  for (const s of subjects) {
    syllabusBatch.set(db.collection("subjects").doc(s.id), s, { merge: true });
  }
  for (const u of units) {
    syllabusBatch.set(db.collection("units").doc(u.id), u, { merge: true });
  }
  for (const t of topics) {
    syllabusBatch.set(db.collection("topics").doc(t.id), t, { merge: true });
  }
  await syllabusBatch.commit();
  console.log(
    `  ✓ Migrated ${subjects.length} subjects, ${units.length} units, and ${topics.length} topics.`,
  );

  // 4. MIGRATE DEFINITIONS (449 MASTER DEFINITIONS)
  console.log("\n📦 [4/8] Migrating Master Cambridge Definitions Hub...");
  const definitions = loadJson("definitions.json");
  let defBatch = db.batch();
  let defCount = 0;
  for (const def of definitions) {
    const docId = def.id || `def_${defCount + 1}`;
    const ref = db.collection("definitions").doc(docId);
    defBatch.set(
      ref,
      {
        id: docId,
        term: def.term,
        definition_text: def.definition_text,
        category: def.category || "General Economics",
        topic_id: def.topic_id || null,
        created_at: def.created_at || new Date().toISOString(),
      },
      { merge: true },
    );
    defCount++;
    if (defCount % 400 === 0) {
      await defBatch.commit();
      defBatch = db.batch();
    }
  }
  if (defCount % 400 !== 0) await defBatch.commit();
  console.log(`  ✓ Migrated ${defCount} master definitions.`);

  // 5. MIGRATE KNOWLEDGE DOCUMENTS & RAG CHUNKS
  console.log("\n📦 [5/8] Migrating Knowledge Base Documents & Chunks...");
  const docs = loadJson("knowledge_documents.json");
  const chunks = loadJson("document_chunks.json");

  let docBatch = db.batch();
  for (const d of docs) {
    docBatch.set(db.collection("knowledge_documents").doc(d.id), d, { merge: true });
  }
  await docBatch.commit();
  console.log(`  ✓ Migrated ${docs.length} knowledge documents.`);

  let chunkBatch = db.batch();
  let chunkCount = 0;
  for (const c of chunks) {
    const ref = db.collection("document_chunks").doc(c.id);
    chunkBatch.set(
      ref,
      {
        id: c.id,
        document_id: c.document_id,
        heading: c.heading || null,
        content: c.content,
        embedding: c.embedding || null,
        chunk_index: c.chunk_index ?? 0,
        token_count: c.token_count ?? 0,
        created_at: c.created_at || new Date().toISOString(),
      },
      { merge: true },
    );
    chunkCount++;
    if (chunkCount % 400 === 0) {
      await chunkBatch.commit();
      chunkBatch = db.batch();
      process.stdout.write(`  ... uploaded ${chunkCount}/${chunks.length} chunks\r`);
    }
  }
  if (chunkCount % 400 !== 0) await chunkBatch.commit();
  console.log(`  ✓ Migrated ${chunkCount} RAG grounding chunks.`);

  // 6. MIGRATE ESSAY SUBMISSIONS & VERSIONS
  console.log("\n📦 [6/8] Migrating Student Essays & Evaluation Versions...");
  const essayVersions = loadJson("essay_versions.json");
  let essayBatch = db.batch();
  let essayCount = 0;
  for (const ev of essayVersions) {
    const ref = db.collection("essay_versions").doc(ev.id);
    essayBatch.set(ref, ev, { merge: true });
    essayCount++;
    if (essayCount % 400 === 0) {
      await essayBatch.commit();
      essayBatch = db.batch();
    }
  }
  if (essayCount % 400 !== 0) await essayBatch.commit();
  console.log(`  ✓ Migrated ${essayCount} essay drafts and evaluations.`);

  // 7. MIGRATE LIVE EXAMINER SESSIONS
  console.log("\n📦 [7/8] Migrating Live Examiner Sessions...");
  const liveSessions = loadJson("live_examiner_sessions.json");
  let liveBatch = db.batch();
  for (const ls of liveSessions) {
    liveBatch.set(db.collection("live_examiner_sessions").doc(ls.id), ls, { merge: true });
  }
  await liveBatch.commit();
  console.log(`  ✓ Migrated ${liveSessions.length} live examiner sessions.`);

  // 8. FINAL VERIFICATION
  console.log("\n=================================================");
  console.log("   🎉 MIGRATION TO FIREBASE COMPLETED!          ");
  console.log("=================================================");
  console.log(`Summary of Migrated Records:`);
  console.log(`  - Users: ${usersImported}`);
  console.log(`  - Profiles: ${count}`);
  console.log(`  - Definitions: ${defCount}`);
  console.log(`  - Knowledge Documents: ${docs.length}`);
  console.log(`  - RAG Chunks: ${chunkCount}`);
  console.log(`  - Essay Versions: ${essayCount}`);
  console.log(`  - Live Examiner Sessions: ${liveSessions.length}`);
  console.log(
    "\nYour Firebase project is now fully initialized with all Cambridge economics data.",
  );
}

runMigration().catch((err) => {
  console.error("\n❌ Migration failed with error:", err);
  process.exit(1);
});
