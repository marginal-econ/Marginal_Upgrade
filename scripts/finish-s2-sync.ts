import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function finishS2Sync() {
  console.log("=== FINISHING S2 DATA SYNC ===");

  // 1. Sync remaining MCQ papers
  console.log("Syncing MCQ papers...");
  const { data: papers } = await s1.from("mcq_pdf_papers").select("*");
  if (papers && papers.length > 0) {
    for (const p of papers) {
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
        uploaded_by: null, // Avoid FK check issues
        created_at: p.created_at,
        overlay: p.overlay,
        exam_year: p.exam_year,
        exam_series: p.exam_series,
      });
    }
    console.log(`✅ Synced ${papers.length} MCQ papers.`);
  }

  // 2. Sync remaining document chunks in small batches of 50
  console.log("Checking and syncing missing chunks in small batches of 50...");
  const { data: s2ChunkIds } = await s2.from("document_chunks").select("id");
  const existingSet = new Set(s2ChunkIds?.map((c) => c.id) || []);
  console.log(`S2 currently has ${existingSet.size} chunks.`);

  let offset = 0;
  const batchSize = 100;
  let added = 0;

  while (true) {
    const { data: s1Chunks, error } = await s1
      .from("document_chunks")
      .select("*")
      .range(offset, offset + batchSize - 1);

    if (error || !s1Chunks || s1Chunks.length === 0) break;

    const missing = s1Chunks.filter((c) => !existingSet.has(c.id));
    if (missing.length > 0) {
      // Insert in sub-batches of 25
      for (let i = 0; i < missing.length; i += 25) {
        const sub = missing.slice(i, i + 25);
        const { error: insErr } = await s2.from("document_chunks").upsert(sub);
        if (insErr) {
          console.warn(`Sub-batch error:`, insErr.message);
        } else {
          added += sub.length;
        }
      }
    }

    offset += batchSize;
    if (s1Chunks.length < batchSize) break;
  }
  console.log(`✅ Inserted ${added} missing chunks into S2.`);

  // 3. Add 12/12 Gold-Standard Real Student Anchor to calibration_anchors
  console.log("Adding 12/12 Real Student Anchor...");
  const { data: v12 } = await s1
    .from("essay_versions")
    .select("essay_text, grading")
    .eq("id", "a38dfd80-cd77-45ac-8404-c3c778feeccb")
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
      created_at: new Date().toISOString(),
    });
    if (ancErr) {
      console.warn("Anchor upsert warning:", ancErr.message);
    } else {
      console.log("✅ 12/12 Student Anchor added to calibration_anchors in S2.");
    }
  }

  // 4. Ensure Kiruthika teacher status
  console.log("Ensuring Kiruthika teacher profile...");
  const { data: kUserList } = await s2.auth.admin.listUsers();
  const kUser = kUserList?.users.find((u) => u.email === "kiruthika240409@gmail.com");
  if (kUser) {
    await s2.auth.admin.updateUserById(kUser.id, {
      app_metadata: {
        role: "teacher",
        teacher_status: "approved",
        provider: "email",
        providers: ["email"],
      },
    });
    await s2.from("user_roles").upsert({
      user_id: kUser.id,
      role: "teacher",
    });
    await s2.from("profiles").upsert({
      id: kUser.id,
      full_name: "Kiruthika",
      role: "teacher",
    });
    await s2.from("teacher_profiles").upsert({
      user_id: kUser.id,
      school_name: "Cambridge International",
      approval_status: "approved",
    });
    console.log(`✅ Kiruthika verified as approved teacher (${kUser.id}).`);
  }

  // 5. Final summary
  const { count: finalPapers } = await s2.from("mcq_pdf_papers").select("*", { count: "exact", head: true });
  const { count: finalChunks } = await s2.from("document_chunks").select("*", { count: "exact", head: true });
  const { count: finalAnchors } = await s2.from("calibration_anchors").select("*", { count: "exact", head: true });

  console.log(`\nFinal S2 mcq_pdf_papers: ${finalPapers}`);
  console.log(`Final S2 document_chunks: ${finalChunks}`);
  console.log(`Final S2 calibration_anchors: ${finalAnchors}`);
}

finishS2Sync().then(() => process.exit(0)).catch(console.error);
