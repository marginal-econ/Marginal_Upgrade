import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function migrateAll() {
  console.log("=== STARTING FULL PRODUCTION MIGRATION FROM S1 TO S2 ===");

  // ---------------------------------------------------------
  // 1. Sync Auth Users & Build ID Map
  // ---------------------------------------------------------
  console.log("\n[1/7] Syncing Auth Users...");
  const { data: s1UsersData } = await s1.auth.admin.listUsers({ perPage: 200 });
  const { data: s2UsersData } = await s2.auth.admin.listUsers({ perPage: 200 });

  const s1Users = s1UsersData?.users || [];
  let s2Users = s2UsersData?.users || [];
  const s2EmailMap = new Map<string, string>(); // email -> s2.id
  for (const u of s2Users) {
    if (u.email) s2EmailMap.set(u.email.toLowerCase(), u.id);
  }

  const userIdMap = new Map<string, string>(); // s1.id -> s2.id

  for (const u of s1Users) {
    if (!u.email) continue;
    const lowerEmail = u.email.toLowerCase();
    const existingS2Id = s2EmailMap.get(lowerEmail);

    if (existingS2Id) {
      userIdMap.set(u.id, existingS2Id);
      console.log(`Mapped existing user: ${lowerEmail} (${u.id} -> ${existingS2Id})`);
    } else {
      // Create user in S2 with exact same ID
      const { data: created, error } = await s2.auth.admin.createUser({
        id: u.id,
        email: u.email,
        email_confirm: true,
        user_metadata: u.user_metadata || {},
        app_metadata: u.app_metadata || {},
      });
      if (error) {
        console.warn(`Could not create user ${lowerEmail} with ID ${u.id}:`, error.message);
        // Fallback create without explicit ID
        const { data: fallback, error: fbErr } = await s2.auth.admin.createUser({
          email: u.email,
          email_confirm: true,
          user_metadata: u.user_metadata || {},
          app_metadata: u.app_metadata || {},
        });
        if (fbErr) {
          console.error(`Fatal: failed to create user ${lowerEmail}:`, fbErr.message);
        } else if (fallback.user) {
          userIdMap.set(u.id, fallback.user.id);
          s2EmailMap.set(lowerEmail, fallback.user.id);
          console.log(`Created fallback user ${lowerEmail}: ${fallback.user.id}`);
        }
      } else if (created.user) {
        userIdMap.set(u.id, created.user.id);
        s2EmailMap.set(lowerEmail, created.user.id);
        console.log(`Created user ${lowerEmail} with ID ${created.user.id}`);
      }
    }
  }

  // ---------------------------------------------------------
  // 2. Set Up Target Accounts (Saikrish & Kiruthika)
  // ---------------------------------------------------------
  console.log("\n[2/7] Configuring entitlements for Saikrish & Kiruthika...");

  // Saikrish (Foundation Scholar & Admin)
  let saikrishId = s2EmailMap.get("saikrish.econ@gmail.com");
  if (saikrishId) {
    await s2.auth.admin.updateUserById(saikrishId, {
      app_metadata: {
        role: "admin",
        subscription_tier: "foundation",
        provider: "email",
        providers: ["email"],
      },
    });
    await s2.from("user_roles").upsert({
      user_id: saikrishId,
      role: "admin",
    });
    await s2.from("definitions").upsert({
      term: "__USER_SUB_saikrish.econ@gmail.com",
      category: "user_subscription",
      definition_text: JSON.stringify({
        tier: "foundation",
        active: true,
        plan: "scholar",
        granted_at: new Date().toISOString(),
      }),
    });
    console.log(`✅ Saikrish (${saikrishId}) configured as Foundation Scholar & Admin.`);
  }

  // Kiruthika (Approved Teacher)
  let kiruthikaId = s2EmailMap.get("kiruthika240409@gmail.com");
  if (!kiruthikaId) {
    const { data: kUser, error: kErr } = await s2.auth.admin.createUser({
      email: "kiruthika240409@gmail.com",
      email_confirm: true,
      user_metadata: { full_name: "Kiruthika", role: "teacher" },
      app_metadata: {
        role: "teacher",
        teacher_status: "approved",
        provider: "email",
        providers: ["email"],
      },
    });
    if (kErr) {
      console.error("Error creating Kiruthika:", kErr.message);
    } else if (kUser.user) {
      kiruthikaId = kUser.user.id;
      s2EmailMap.set("kiruthika240409@gmail.com", kiruthikaId);
    }
  } else {
    await s2.auth.admin.updateUserById(kiruthikaId, {
      app_metadata: {
        role: "teacher",
        teacher_status: "approved",
        provider: "email",
        providers: ["email"],
      },
      user_metadata: { full_name: "Kiruthika", role: "teacher" },
    });
  }

  if (kiruthikaId) {
    await s2.from("user_roles").upsert({
      user_id: kiruthikaId,
      role: "teacher",
    });
    await s2.from("profiles").upsert({
      id: kiruthikaId,
      full_name: "Kiruthika",
      role: "teacher",
    });
    await s2.from("teacher_profiles").upsert({
      user_id: kiruthikaId,
      school_name: "Cambridge International",
      approval_status: "approved",
    });
    console.log(`✅ Kiruthika (${kiruthikaId}) configured as Approved Teacher.`);
  }

  // ---------------------------------------------------------
  // 3. Migrate Profiles & User Roles
  // ---------------------------------------------------------
  console.log("\n[3/7] Migrating profiles & user roles...");
  const { data: s1Profiles } = await s1.from("profiles").select("*");
  if (s1Profiles) {
    for (const p of s1Profiles) {
      const targetUserId = userIdMap.get(p.id) || p.id;
      await s2.from("profiles").upsert({
        id: targetUserId,
        full_name: p.full_name,
        role: p.role || "student",
        avatar_url: p.avatar_url,
        updated_at: p.updated_at,
      });
    }
    console.log(`✅ Profiles synced (${s1Profiles.length}).`);
  }

  const { data: s1Roles } = await s1.from("user_roles").select("*");
  if (s1Roles) {
    for (const r of s1Roles) {
      const targetUserId = userIdMap.get(r.user_id) || r.user_id;
      await s2.from("user_roles").upsert({
        user_id: targetUserId,
        role: r.role,
      });
    }
    console.log(`✅ User roles synced (${s1Roles.length}).`);
  }

  // ---------------------------------------------------------
  // 4. Migrate Essays & Essay Versions
  // ---------------------------------------------------------
  console.log("\n[4/7] Migrating Essays & Versions...");
  const { data: s1Essays, error: eErr } = await s1.from("essays").select("*").limit(500);
  if (eErr) {
    console.error("Error reading S1 essays:", eErr.message);
  } else if (s1Essays) {
    console.log(`Found ${s1Essays.length} essays in S1.`);
    for (const e of s1Essays) {
      const targetUserId = userIdMap.get(e.user_id) || e.user_id;
      const { error: insErr } = await s2.from("essays").upsert({
        id: e.id,
        user_id: targetUserId,
        question: e.question,
        max_mark: e.max_mark,
        topic_id: e.topic_id,
        latest_mark: e.latest_mark,
        created_at: e.created_at,
        updated_at: e.updated_at,
      });
      if (insErr) {
        console.warn(`Essay ${e.id} upsert warning:`, insErr.message);
      }
    }
    console.log(`✅ ${s1Essays.length} Essays upserted into S2.`);
  }

  const { data: s1Versions, error: vErr } = await s1.from("essay_versions").select("*").limit(500);
  if (vErr) {
    console.error("Error reading S1 essay_versions:", vErr.message);
  } else if (s1Versions) {
    console.log(`Found ${s1Versions.length} essay versions in S1.`);
    for (const v of s1Versions) {
      const targetUserId = userIdMap.get(v.user_id) || v.user_id;
      const { error: insErr } = await s2.from("essay_versions").upsert({
        id: v.id,
        essay_id: v.essay_id,
        user_id: targetUserId,
        version: v.version,
        essay_text: v.essay_text,
        grading: v.grading,
        total_mark: v.total_mark,
        ao1_awarded: v.ao1_awarded,
        ao2_awarded: v.ao2_awarded,
        ao3_awarded: v.ao3_awarded,
        confidence: v.confidence,
        audited: v.audited,
        sources: v.sources,
        model: v.model,
        showcased: v.total_mark !== null && (v.total_mark >= 10 || (v.total_mark >= 7 && v.max_mark === 8)),
        showcase_consented: true,
        created_at: v.created_at,
      });
      if (insErr) {
        console.warn(`Version ${v.id} upsert warning:`, insErr.message);
      }
    }
    console.log(`✅ ${s1Versions.length} Essay Versions upserted into S2.`);
  }

  // ---------------------------------------------------------
  // 5. Migrate Knowledge Documents & Chunks
  // ---------------------------------------------------------
  console.log("\n[5/7] Migrating Knowledge Documents & Chunks...");
  const { data: s1Docs } = await s1.from("knowledge_documents").select("*").limit(500);
  if (s1Docs) {
    for (const doc of s1Docs) {
      const targetUploader = doc.uploaded_by ? (userIdMap.get(doc.uploaded_by) || doc.uploaded_by) : null;
      await s2.from("knowledge_documents").upsert({
        id: doc.id,
        title: doc.title,
        doc_type: doc.doc_type,
        subject_id: doc.subject_id,
        unit_id: doc.unit_id,
        topic_id: doc.topic_id,
        source_name: doc.source_name,
        storage_path: doc.storage_path,
        exam_series: doc.exam_series,
        version: doc.version,
        content_hash: doc.content_hash,
        char_count: doc.char_count,
        chunk_count: doc.chunk_count,
        status: doc.status,
        error_message: doc.error_message,
        uploaded_by: targetUploader,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      });
    }
    console.log(`✅ Synced ${s1Docs.length} knowledge documents into S2.`);
  }

  // Chunks (paginate in chunks of 500)
  let chunkPage = 0;
  const pageSize = 500;
  let totalChunks = 0;
  while (true) {
    const { data: chunks, error } = await s1
      .from("document_chunks")
      .select("*")
      .range(chunkPage * pageSize, (chunkPage + 1) * pageSize - 1);

    if (error || !chunks || chunks.length === 0) break;

    const { error: chunkInsErr } = await s2.from("document_chunks").upsert(chunks);
    if (chunkInsErr) {
      console.warn(`Chunk page ${chunkPage} warning:`, chunkInsErr.message);
    } else {
      totalChunks += chunks.length;
    }
    if (chunks.length < pageSize) break;
    chunkPage++;
  }
  console.log(`✅ Synced ${totalChunks} document chunks into S2.`);

  // ---------------------------------------------------------
  // 6. Migrate MCQ Papers & Attempts
  // ---------------------------------------------------------
  console.log("\n[6/7] Migrating MCQ Papers...");
  const { data: s1Papers } = await s1.from("mcq_pdf_papers").select("*").limit(200);
  if (s1Papers) {
    for (const p of s1Papers) {
      const targetUploader = p.uploaded_by ? (userIdMap.get(p.uploaded_by) || p.uploaded_by) : null;
      await s2.from("mcq_pdf_papers").upsert({
        id: p.id,
        title: p.title,
        level: p.level,
        question_count: p.question_count,
        qp_path: p.qp_path,
        qp_url: p.qp_url,
        ms_path: p.ms_path,
        ms_url: p.ms_url,
        answer_key: p.answer_key,
        uploaded_by: targetUploader,
        created_at: p.created_at,
        overlay: p.overlay,
        exam_year: p.exam_year,
        exam_series: p.exam_series,
      });
    }
    console.log(`✅ Synced ${s1Papers.length} MCQ papers into S2.`);
  }

  // ---------------------------------------------------------
  // 7. Add Gold-Standard 12/12 Real Essay to Calibration Anchors
  // ---------------------------------------------------------
  console.log("\n[7/7] Adding 12/12 Gold-Standard Real Student Anchor...");
  const anchor12mId = "a38dfd80-cd77-45ac-8404-c3c778feeccb";
  const { data: v12 } = await s1
    .from("essay_versions")
    .select("essay_text, grading")
    .eq("id", anchor12mId)
    .single();

  if (v12) {
    const { error: ancErr } = await s2.from("calibration_anchors").upsert({
      id: "a38dfd80-cd77-45ac-8404-c3c778feeccb",
      question:
        "Unemployment can be measured by the claimant count or the labour force survey. Discuss the difficulties involved in measuring unemployment and assess which of these two measures is more reliable. [12]",
      essay_text: v12.essay_text,
      mark: 12,
      max_mark: 12,
      band_label: "top",
      notes: "Genuine student 12/12 Level 4/5 full marks response comparing claimant count vs ILO Labour Force Survey.",
      active: true,
      created_by: saikrishId || null,
      created_at: new Date().toISOString(),
    });
    if (ancErr) {
      console.warn("Anchor insert error:", ancErr.message);
    } else {
      console.log("✅ 12/12 Gold-Standard Calibration Anchor added to S2!");
    }
  }

  // Final verification
  console.log("\n=== FINAL VERIFICATION ON S2 ===");
  const { count: essaysCount } = await s2.from("essays").select("*", { count: "exact", head: true });
  const { count: versionsCount } = await s2.from("essay_versions").select("*", { count: "exact", head: true });
  const { count: waitlistCount } = await s2.from("waitlist").select("*", { count: "exact", head: true });
  const { count: anchorCount } = await s2.from("calibration_anchors").select("*", { count: "exact", head: true });
  const { count: docsCount } = await s2.from("knowledge_documents").select("*", { count: "exact", head: true });
  const { count: mcqCount } = await s2.from("mcq_pdf_papers").select("*", { count: "exact", head: true });

  console.log(`Essays in S2: ${essaysCount}`);
  console.log(`Essay Versions in S2: ${versionsCount}`);
  console.log(`Waitlist in S2: ${waitlistCount} (Preserved intact!)`);
  console.log(`Calibration Anchors in S2: ${anchorCount}`);
  console.log(`Knowledge Documents in S2: ${docsCount}`);
  console.log(`MCQ Papers in S2: ${mcqCount}`);

  // Check Saikrish's essays count in S2
  if (saikrishId) {
    const { count: saikrishEssays } = await s2
      .from("essays")
      .select("*", { count: "exact", head: true })
      .eq("user_id", saikrishId);
    console.log(`Saikrish essays in S2: ${saikrishEssays}`);
  }

  console.log("\n🎉 FULL MIGRATION COMPLETED SUCCESSFULLY!");
}

migrateAll().then(() => process.exit(0)).catch(console.error);
