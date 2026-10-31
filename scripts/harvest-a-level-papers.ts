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

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function getPdfJs() {
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

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

async function fetchPdf(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
      },
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function extractTextFromPdfBuffer(pdfjs: any, buf: Buffer): Promise<string> {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    standardFontDataUrl: undefined,
  }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    fullText += `\n[PAGE ${pageNum}]\n${pageStr}`;
  }
  return fullText;
}

function parseMcqAnswerKey(text: string): Record<string, "A" | "B" | "C" | "D"> {
  const answerKey: Record<string, "A" | "B" | "C" | "D"> = {};
  const regex = /\b(\d{1,2})\s+([ABCD])\b/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    const qNum = parseInt(m[1], 10);
    if (qNum >= 1 && qNum <= 30 && !answerKey[String(qNum)]) {
      answerKey[String(qNum)] = m[2] as "A" | "B" | "C" | "D";
    }
  }

  const retractedRegex = /(\d{1,2})\s+Due to an issue with question\b/gi;
  while ((m = retractedRegex.exec(text)) !== null) {
    const qNum = parseInt(m[1], 10);
    if (qNum >= 1 && qNum <= 30 && !answerKey[String(qNum)]) {
      answerKey[String(qNum)] = "A";
    }
  }

  return answerKey;
}

function getSeriesName(seasonLetter: string): "Feb/March" | "May/June" | "Oct/Nov" {
  switch (seasonLetter) {
    case "m":
      return "Feb/March";
    case "s":
      return "May/June";
    case "w":
      return "Oct/Nov";
    default:
      return "May/June";
  }
}

async function ingestIntoKb(docTitle: string, docType: "past_paper" | "mark_scheme", examSeries: string, text: string, storagePath?: string) {
  if (text.trim().length < 150) return;
  const hash = hashContent(text);
  const { data: existing } = await supabase
    .from("knowledge_documents")
    .select("id")
    .eq("content_hash", hash)
    .maybeSingle();

  if (existing) return;

  const chunks = chunkText(text);
  const { data: doc, error: dErr } = await supabase
    .from("knowledge_documents")
    .insert({
      title: docTitle,
      doc_type: docType,
      source_name: "Cambridge Assessment International Education",
      exam_series: examSeries,
      storage_path: storagePath || null,
      content_hash: hash,
      char_count: text.length,
      chunk_count: chunks.length,
      status: "ready",
    })
    .select("id")
    .single();

  if (dErr || !doc) return;

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
}

async function run() {
  console.log("==========================================================");
  console.log("🚀 HARVESTING A-LEVEL (A2) PAPERS INTO MCQ & KNOWLEDGE BASE");
  console.log("==========================================================");

  const pdfjs = await getPdfJs();

  // We target A-Level Paper 3 (MCQ variants 31, 32, 33) and Paper 4 (Essay variants 41, 42, 43)
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
  const seasons: Array<"m" | "s" | "w"> = ["s", "w", "m"];
  const mcqVariants = ["31", "32", "33"];
  const essayVariants = ["41", "42", "43"];

  // 1. HARVEST A-LEVEL MCQ PAPERS (Paper 3)
  console.log("\n--- Processing A-Level MCQ (Paper 3) ---");
  let mcqAdded = 0;

  for (const year of years) {
    const yy = String(year).slice(-2);
    for (const season of seasons) {
      for (const variant of mcqVariants) {
        if (season === "m" && variant !== "32") continue; // Feb/March is only variant 2

        const seriesName = getSeriesName(season);
        const paperTitle = `9708 ${seriesName} ${year} Paper ${variant}`;

        // Check if paper already exists with complete answers
        const { data: existing } = await supabase
          .from("mcq_pdf_papers")
          .select("id, question_count, answer_key")
          .eq("exam_year", year)
          .eq("exam_series", seriesName)
          .ilike("title", `%Paper ${variant}%`)
          .maybeSingle();

        if (existing && Object.keys(existing.answer_key || {}).length === 30) {
          // Already have 30/30 in mcq_pdf_papers
          continue;
        }

        const qpFileName = `9708_${season}${yy}_qp_${variant}.pdf`;
        const msFileName = `9708_${season}${yy}_ms_${variant}.pdf`;
        const baseUrl = `https://bestexamhelp.com/exam/cambridge-international-a-level/economics-9708/${year}`;

        console.log(`Checking A-Level MCQ: ${paperTitle}...`);
        const [qpBuffer, msBuffer] = await Promise.all([
          fetchPdf(`${baseUrl}/${qpFileName}`),
          fetchPdf(`${baseUrl}/${msFileName}`),
        ]);

        if (!qpBuffer || !msBuffer) {
          console.log(`   ⏩ Not found on mirror. Skipping.`);
          continue;
        }

        const msText = await extractTextFromPdfBuffer(pdfjs, msBuffer);
        const answerKey = parseMcqAnswerKey(msText);
        const keyCount = Object.keys(answerKey).length;

        if (keyCount !== 30) {
          console.log(`   ⚠️ Answer key parsed only ${keyCount}/30. Skipping.`);
          continue;
        }

        // Upload to Storage
        const qpPath = `cambridge/${year}/${qpFileName}`;
        const msPath = `cambridge/${year}/${msFileName}`;

        await Promise.all([
          supabase.storage.from("mcq-papers").upload(qpPath, qpBuffer, { contentType: "application/pdf", upsert: true }),
          supabase.storage.from("mcq-papers").upload(msPath, msBuffer, { contentType: "application/pdf", upsert: true }),
        ]);

        const qpUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpPath).data.publicUrl;
        const msUrl = supabase.storage.from("mcq-papers").getPublicUrl(msPath).data.publicUrl;

        // Save to mcq_pdf_papers
        if (existing) {
          await supabase
            .from("mcq_pdf_papers")
            .update({
              qp_path: qpPath,
              qp_url: qpUrl,
              ms_path: msPath,
              ms_url: msUrl,
              answer_key: answerKey,
            })
            .eq("id", existing.id);
          console.log(`   🔄 Updated ${paperTitle} in mcq_pdf_papers`);
        } else {
          await supabase.from("mcq_pdf_papers").insert({
            title: paperTitle,
            level: "a2",
            exam_year: year,
            exam_series: seriesName,
            question_count: 30,
            qp_path: qpPath,
            qp_url: qpUrl,
            ms_path: msPath,
            ms_url: msUrl,
            answer_key: answerKey,
          });
          console.log(`   ✨ Inserted ${paperTitle} into mcq_pdf_papers [A2]`);
          mcqAdded++;
        }

        // Also index both QP and MS text into Knowledge Base
        const qpText = await extractTextFromPdfBuffer(pdfjs, qpBuffer);
        const examSeriesStr = `${seriesName} ${year}`;
        await ingestIntoKb(`${paperTitle} (Question Paper)`, "past_paper", examSeriesStr, qpText, qpPath);
        await ingestIntoKb(`${paperTitle} (Mark Scheme)`, "mark_scheme", examSeriesStr, msText, msPath);
        console.log(`   📚 Synced QP and MS to Knowledge Base`);
      }
    }
  }

  console.log(`\n✅ A-Level MCQ Harvest Complete: Added ${mcqAdded} new A-Level MCQ papers.`);

  // 2. HARVEST A-LEVEL ESSAY PAPERS (Paper 4) INTO KNOWLEDGE BASE
  console.log("\n--- Processing A-Level Paper 4 (Essays & Data Response) into Knowledge Base ---");
  let essayPapersAdded = 0;

  for (const year of [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]) {
    const yy = String(year).slice(-2);
    for (const season of seasons) {
      for (const variant of essayVariants) {
        if (season === "m" && variant !== "42") continue;

        const seriesName = getSeriesName(season);
        const paperTitle = `9708 ${seriesName} ${year} Paper ${variant}`;
        const examSeriesStr = `${seriesName} ${year}`;

        const qpFileName = `9708_${season}${yy}_qp_${variant}.pdf`;
        const msFileName = `9708_${season}${yy}_ms_${variant}.pdf`;
        const baseUrl = `https://bestexamhelp.com/exam/cambridge-international-a-level/economics-9708/${year}`;

        // Check if already in Knowledge Base
        const { data: existingQp } = await supabase
          .from("knowledge_documents")
          .select("id")
          .ilike("title", `${paperTitle} (Question Paper)%`)
          .maybeSingle();

        if (existingQp) continue;

        console.log(`Checking A-Level Paper 4: ${paperTitle}...`);
        const [qpBuffer, msBuffer] = await Promise.all([
          fetchPdf(`${baseUrl}/${qpFileName}`),
          fetchPdf(`${baseUrl}/${msFileName}`),
        ]);

        if (qpBuffer) {
          const qpText = await extractTextFromPdfBuffer(pdfjs, qpBuffer);
          await ingestIntoKb(`${paperTitle} (Question Paper)`, "past_paper", examSeriesStr, qpText);
          essayPapersAdded++;
          console.log(`   📄 Ingested Paper 4 QP: ${paperTitle}`);
        }

        if (msBuffer) {
          const msText = await extractTextFromPdfBuffer(pdfjs, msBuffer);
          await ingestIntoKb(`${paperTitle} (Mark Scheme)`, "mark_scheme", examSeriesStr, msText);
          console.log(`   📋 Ingested Paper 4 MS: ${paperTitle}`);
        }
      }
    }
  }

  console.log(`\n✅ A-Level Paper 4 Ingestion Complete: Added ${essayPapersAdded} paper sets to Knowledge Base.`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
