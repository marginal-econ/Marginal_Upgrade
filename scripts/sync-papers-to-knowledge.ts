/**
 * Sync Harvested Cambridge 9708 Papers to Knowledge Base
 *
 * Takes all harvested papers from `mcq_pdf_papers` and `bank_essay_questions`,
 * reads their text from storage/mirror, chunks them, and upserts them into
 * `knowledge_documents` and `document_chunks` with status "ready".
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/sync-papers-to-knowledge.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFallback() {
  if (process.env.BACKEND_URL && process.env.BACKEND_SERVICE_ROLE_KEY) return;
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
loadEnvFallback();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Structure-aware chunking
const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 180;

function chunkText(raw: string) {
  const normalised = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalised.length === 0) return [];

  const chunks: Array<{
    index: number;
    content: string;
    heading: string | null;
    tokenEstimate: number;
  }> = [];

  const paragraphs = normalised.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let buffer = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (buffer.length + para.length > TARGET_CHARS && buffer.length > 0) {
      chunks.push({
        index: chunkIndex++,
        content: buffer.trim(),
        heading: null,
        tokenEstimate: Math.ceil(buffer.length / 4),
      });
      buffer = buffer.slice(-OVERLAP_CHARS);
    }
    buffer += (buffer.length > 0 ? "\n\n" : "") + para;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      index: chunkIndex++,
      content: buffer.trim(),
      heading: null,
      tokenEstimate: Math.ceil(buffer.length / 4),
    });
  }

  return chunks;
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function getPdfJs() {
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

async function extractTextFromPdf(pdfjs: any, buf: Buffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    text += "\n" + content.items.map((i: any) => ("str" in i ? i.str : "")).join(" ");
  }
  return text;
}

async function syncAllToKnowledge() {
  console.log("==================================================================");
  console.log(" 📚 SYNCING PAST PAPERS TO KNOWLEDGE BASE");
  console.log("==================================================================");

  const pdfjs = await getPdfJs();

  // 1. Fetch all MCQ papers from mcq_pdf_papers
  const { data: papers, error: pErr } = await supabase
    .from("mcq_pdf_papers")
    .select("id, title, exam_year, exam_series, qp_path, qp_url, ms_path, ms_url");

  if (pErr) throw pErr;
  console.log(`Found ${papers.length} past papers in mcq_pdf_papers.`);

  let docsCreated = 0;
  let chunksCreated = 0;

  for (const paper of papers) {
    console.log(`Processing: ${paper.title}...`);

    // Ingest QP if available
    if (paper.qp_url) {
      try {
        const res = await fetch(paper.qp_url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const text = await extractTextFromPdf(pdfjs, Buffer.from(ab));

          if (text.trim().length > 200) {
            const hash = hashContent(text);
            const docTitle = `${paper.title} (Question Paper)`;
            const examSeries = paper.exam_series ? `${paper.exam_series} ${paper.exam_year ?? ""}`.trim() : null;

            // Check if document already exists
            const { data: existing } = await supabase
              .from("knowledge_documents")
              .select("id")
              .eq("content_hash", hash)
              .maybeSingle();

            if (!existing) {
              const chunks = chunkText(text);
              const { data: doc, error: dErr } = await supabase
                .from("knowledge_documents")
                .insert({
                  title: docTitle,
                  doc_type: "past_paper",
                  source_name: "Cambridge Assessment International Education",
                  exam_series: examSeries,
                  storage_path: paper.qp_path,
                  content_hash: hash,
                  char_count: text.length,
                  chunk_count: chunks.length,
                  status: "ready",
                })
                .select("id")
                .single();

              if (!dErr && doc) {
                const chunkRows = chunks.map((c) => ({
                  document_id: doc.id,
                  chunk_index: c.index,
                  content: c.content,
                  heading: c.heading,
                  token_estimate: c.tokenEstimate,
                }));

                for (let offset = 0; offset < chunkRows.length; offset += 100) {
                  await supabase.from("document_chunks").insert(chunkRows.slice(offset, offset + 100));
                }
                docsCreated++;
                chunksCreated += chunks.length;
                console.log(`   ✨ Ingested QP: ${docTitle} (${chunks.length} chunks)`);
              }
            } else {
              console.log(`   ⏩ QP already in Knowledge Base.`);
            }
          }
        }
      } catch (err: any) {
        console.warn(`   ⚠️ QP fetch/ingest error: ${err.message}`);
      }
    }

    // Ingest MS if available
    if (paper.ms_url) {
      try {
        const res = await fetch(paper.ms_url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const text = await extractTextFromPdf(pdfjs, Buffer.from(ab));

          if (text.trim().length > 200) {
            const hash = hashContent(text);
            const docTitle = `${paper.title} (Mark Scheme)`;
            const examSeries = paper.exam_series ? `${paper.exam_series} ${paper.exam_year ?? ""}`.trim() : null;

            const { data: existing } = await supabase
              .from("knowledge_documents")
              .select("id")
              .eq("content_hash", hash)
              .maybeSingle();

            if (!existing) {
              const chunks = chunkText(text);
              const { data: doc, error: dErr } = await supabase
                .from("knowledge_documents")
                .insert({
                  title: docTitle,
                  doc_type: "mark_scheme",
                  source_name: "Cambridge Assessment International Education",
                  exam_series: examSeries,
                  storage_path: paper.ms_path,
                  content_hash: hash,
                  char_count: text.length,
                  chunk_count: chunks.length,
                  status: "ready",
                })
                .select("id")
                .single();

              if (!dErr && doc) {
                const chunkRows = chunks.map((c) => ({
                  document_id: doc.id,
                  chunk_index: c.index,
                  content: c.content,
                  heading: c.heading,
                  token_estimate: c.tokenEstimate,
                }));

                for (let offset = 0; offset < chunkRows.length; offset += 100) {
                  await supabase.from("document_chunks").insert(chunkRows.slice(offset, offset + 100));
                }
                docsCreated++;
                chunksCreated += chunks.length;
                console.log(`   ✨ Ingested MS: ${docTitle} (${chunks.length} chunks)`);
              }
            } else {
              console.log(`   ⏩ MS already in Knowledge Base.`);
            }
          }
        }
      } catch (err: any) {
        console.warn(`   ⚠️ MS fetch/ingest error: ${err.message}`);
      }
    }
  }

  // 2. Also package approved essay questions by exam series as syllabus study documents
  const { data: essayQuestions } = await supabase
    .from("bank_essay_questions")
    .select("exam_series, topic, max_mark, question_text")
    .order("exam_series", { ascending: false });

  if (essayQuestions && essayQuestions.length > 0) {
    const grouped = new Map<string, Array<any>>();
    for (const q of essayQuestions) {
      const key = q.exam_series || "General Cambridge Essay Bank";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(q);
    }

    for (const [seriesName, qList] of grouped.entries()) {
      const content = qList
        .map(
          (q, idx) =>
            `### Question ${idx + 1} [${q.max_mark} marks]\n**Topic:** ${q.topic}\n**Question Text:** ${q.question_text}\n`
        )
        .join("\n\n");

      const hash = hashContent(content);
      const docTitle = `Cambridge 9708 ${seriesName} Essay Question Compendium`;

      const { data: existing } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("content_hash", hash)
        .maybeSingle();

      if (!existing) {
        const chunks = chunkText(content);
        const { data: doc, error: dErr } = await supabase
          .from("knowledge_documents")
          .insert({
            title: docTitle,
            doc_type: "past_paper",
            source_name: "Cambridge International Question Bank",
            exam_series: seriesName,
            content_hash: hash,
            char_count: content.length,
            chunk_count: chunks.length,
            status: "ready",
          })
          .select("id")
          .single();

        if (!dErr && doc) {
          const chunkRows = chunks.map((c) => ({
            document_id: doc.id,
            chunk_index: c.index,
            content: c.content,
            heading: c.heading,
            token_estimate: c.tokenEstimate,
          }));

          for (let offset = 0; offset < chunkRows.length; offset += 100) {
            await supabase.from("document_chunks").insert(chunkRows.slice(offset, offset + 100));
          }
          docsCreated++;
          chunksCreated += chunks.length;
          console.log(`   ✨ Ingested Essay Compendium: ${docTitle} (${chunks.length} chunks)`);
        }
      }
    }
  }

  console.log("\n==================================================================");
  console.log(" 🎉 KNOWLEDGE BASE SYNC COMPLETE");
  console.log("==================================================================");
  console.log(` Documents Created: ${docsCreated}`);
  console.log(` Chunks Generated:  ${chunksCreated}`);
  console.log(" All documents set to status: 'ready'");
  console.log("==================================================================\n");
}

syncAllToKnowledge().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
