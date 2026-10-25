import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL || "https://srukuuhxloxdukonmual.supabase.co";
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function ingestQuestions() {
  console.log("=== INGESTING EXTRACTED KB QUESTIONS TO QUESTION BANK ===");

  // 1. Fetch existing bank questions to avoid any duplicates
  const { data: existingRows, error: exErr } = await supabase
    .from("bank_essay_questions")
    .select("id, question_text");
  if (exErr) {
    console.error("Error fetching existing bank questions:", exErr);
    return;
  }
  const existingSet = new Set<string>();
  for (const r of existingRows || []) {
    existingSet.add(normalizeText(r.question_text));
  }
  console.log(`Currently in bank_essay_questions: ${existingRows?.length || 0} questions.`);

  // 2. Fetch all Essay Question Compendiums from knowledge_documents
  const { data: compendiums, error: docErr } = await supabase
    .from("knowledge_documents")
    .select("id, title, doc_type, exam_series")
    .like("title", "%Essay Question Compendium%");

  if (docErr || !compendiums) {
    console.error("Error fetching compendiums:", docErr);
    return;
  }
  console.log(`Found ${compendiums.length} Essay Question Compendium documents.`);

  // 3. Fetch chunks in batches
  const docIds = compendiums.map((d) => d.id);
  const allChunks: Array<{ document_id: string; chunk_index: number; content: string }> = [];

  for (let i = 0; i < docIds.length; i += 30) {
    const slice = docIds.slice(i, i + 30);
    const { data: chunks, error: chunkErr } = await supabase
      .from("document_chunks")
      .select("document_id, chunk_index, content")
      .in("document_id", slice)
      .order("chunk_index", { ascending: true });
    if (chunkErr) console.error("Chunk fetch error:", chunkErr);
    if (chunks) allChunks.push(...chunks);
  }
  console.log(`Fetched ${allChunks.length} chunks.`);

  // Group chunks by document_id
  const chunksByDoc = new Map<string, Array<{ chunk_index: number; content: string }>>();
  for (const c of allChunks) {
    const list = chunksByDoc.get(c.document_id) ?? [];
    list.push(c);
    chunksByDoc.set(c.document_id, list);
  }

  // 4. Extract questions from each document
  const toInsert: Array<{
    level: "as" | "a2";
    topic: string;
    source_document_id: string;
    exam_series: string;
    question_text: string;
    max_mark: number;
    status: "approved";
  }> = [];

  const seenInBatch = new Set<string>();

  for (const doc of compendiums) {
    const docChunks = chunksByDoc.get(doc.id) || [];
    docChunks.sort((a, b) => a.chunk_index - b.chunk_index);
    const fullText = docChunks.map((c) => c.content).join("\n\n");

    const seriesMatch = doc.title.match(/(Feb\/March|May\/June|Oct\/Nov)\s+\d{4}\s+Paper\s+\d+/i);
    const examSeries = seriesMatch ? seriesMatch[0] : (doc.exam_series || "Cambridge 9708 Past Paper");
    const isA2 = /Paper\s*4/i.test(doc.title);
    const level: "as" | "a2" = isA2 ? "a2" : "as";

    const qRegex =
      /###\s*Question\s*\d+\s*\[(\d+)\s*marks?\]\s*(?:\n|\r\n)\s*\*\*Topic:\*\*\s*([^\n\r]+)\s*(?:\n|\r\n)\s*\*\*Question Text:\*\*\s*([\s\S]*?)(?=(?:###\s*Question|\n\n\n|$))/gi;

    let match;
    while ((match = qRegex.exec(fullText)) !== null) {
      const rawMark = parseInt(match[1], 10);
      const topic = match[2].trim();
      let questionText = match[3].trim();
      questionText = questionText.replace(/\n---\s*CHUNK.*$/g, "").trim();

      // Normalize mark: 25 marks in A2 or older syllabus -> 20 marks in current 9708 syllabus
      let maxMark = rawMark;
      if (rawMark === 25 || rawMark === 20) {
        maxMark = 20;
      } else if (rawMark === 13) {
        maxMark = 12;
      }

      // Check valid tariff
      if (![8, 12, 20].includes(maxMark)) {
        continue;
      }

      if (questionText.length < 20) {
        continue;
      }

      const normalized = normalizeText(questionText);
      if (existingSet.has(normalized) || seenInBatch.has(normalized)) {
        continue;
      }

      seenInBatch.add(normalized);
      toInsert.push({
        level,
        topic: topic || "General Economics",
        source_document_id: doc.id,
        exam_series: examSeries,
        question_text: questionText,
        max_mark: maxMark,
        status: "approved",
      });
    }
  }

  console.log(`\nReady to insert ${toInsert.length} new unique questions!`);
  console.log("Breakdown by marks to insert:", {
    8: toInsert.filter((q) => q.max_mark === 8).length,
    12: toInsert.filter((q) => q.max_mark === 12).length,
    20: toInsert.filter((q) => q.max_mark === 20).length,
  });
  console.log("Breakdown by level:", {
    as: toInsert.filter((q) => q.level === "as").length,
    a2: toInsert.filter((q) => q.level === "a2").length,
  });

  // 5. Insert in batches of 50
  let totalInserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { data: inserted, error: insErr } = await supabase
      .from("bank_essay_questions")
      .insert(batch)
      .select("id");
    if (insErr) {
      console.error(`Error inserting batch ${i / 50 + 1}:`, insErr);
    } else {
      totalInserted += inserted?.length || 0;
      console.log(`Inserted batch ${Math.floor(i / 50) + 1} (${totalInserted}/${toInsert.length})`);
    }
  }

  // 6. Verify total in bank
  const { count: finalCount } = await supabase
    .from("bank_essay_questions")
    .select("id", { count: "exact", head: true });
  console.log(`\nFinal count in bank_essay_questions: ${finalCount} questions.`);
}

ingestQuestions().catch(console.error);
