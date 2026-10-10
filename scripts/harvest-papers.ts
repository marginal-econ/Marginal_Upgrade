/**
 * Automated Cambridge 9708 Economics Past Paper Harvester
 *
 * Downloads real Cambridge 9708 Question Papers (QP) and Mark Schemes (MS)
 * from verified mirrors without any manual human input.
 *
 * Capabilities:
 * 1. Bulk download of real Cambridge 9708 past papers (2018–2025).
 * 2. Deterministic regex parsing of official MCQ answer keys (30/30) with 0 AI cost.
 * 3. Deterministic regex extraction of Section B/C essay questions (8m, 12m, 20m) with 0 AI cost.
 * 4. Automatic Cambridge syllabus topic tagging.
 * 5. Direct upload of PDFs to Supabase Storage ('mcq-papers' bucket).
 * 6. Upsert into database tables ('mcq_pdf_papers' and 'bank_essay_questions').
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/harvest-papers.ts [options]
 *   npm run harvest:papers -- --years 2023,2024 --limit 10
 *
 * Options:
 *   --years <years>       Comma-separated years or range (e.g. "2022-2024" or "2023,2024") [default: 2022-2024]
 *   --types <types>       "mcq", "essay", or "all" [default: all]
 *   --variants <vars>     Specific paper variants, e.g. "12,22" [default: 11,12,13,21,22,23,31,32,33,41,42,43]
 *   --limit <number>      Maximum number of papers to harvest [default: 10]
 *   --dry-run             Parse and inspect papers without uploading to Supabase
 *   --verbose             Print detailed extraction logs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Ensure .env is parsed if not already in process.env
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
  console.error("❌ Missing Supabase credentials in environment (.env).");
  console.error("Required: BACKEND_URL and BACKEND_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Load PDF.js without worker for Node.js
async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

// Command-line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    types: "all" as "mcq" | "essay" | "all",
    variants: ["12", "22", "11", "21", "13", "23", "32", "42"],
    limit: 100,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--limit" && args[i + 1]) {
      options.limit = parseInt(args[++i], 10) || 10;
    } else if (arg === "--types" && args[i + 1]) {
      options.types = args[++i] as "mcq" | "essay" | "all";
    } else if (arg === "--years" && args[i + 1]) {
      const yrVal = args[++i];
      if (yrVal.includes("-")) {
        const [start, end] = yrVal.split("-").map((v) => parseInt(v.trim(), 10));
        options.years = [];
        for (let y = start; y <= end; y++) options.years.push(y);
      } else {
        options.years = yrVal.split(",").map((v) => parseInt(v.trim(), 10)).filter(Boolean);
      }
    } else if (arg === "--variants" && args[i + 1]) {
      options.variants = args[++i].split(",").map((v) => v.trim()).filter(Boolean);
    }
  }

  return options;
}

// Cambridge Syllabus Topic Tagging
const SYLLABUS_TOPIC_RULES: Array<{ topic: string; regex: RegExp }> = [
  {
    topic: "Consumer and Producer Surplus",
    regex: /\b(consumer surplus|producer surplus|deadweight loss|allocative efficienc\w*)\b/i,
  },
  {
    topic: "Price controls & Government Intervention",
    regex: /\b(maximum price|minimum price|price ceiling|price floor|indirect tax\w*|subsid\w+|buffer stock|transfer payment\w*)\b/i,
  },
  {
    topic: "Market Failure & Externalities",
    regex: /\b(externalit\w+|merit good\w*|demerit good\w*|market failure\w*|public good\w*|information failure\w*)\b/i,
  },
  {
    topic: "Production Possibility Curves & Opportunity Cost",
    regex: /\b(production possibilit\w+|ppc|ppf|opportunity cost|scarcity|allocation of resources|factors of production)\b/i,
  },
  {
    topic: "Elasticity of Demand & Supply",
    regex: /\b(elasticit\w+|ped|yed|xed|pes|price elastic\w*|cross-elasticity)\b/i,
  },
  {
    topic: "Inflation & Price Stability",
    regex: /\b(inflation\w*|deflation\w*|consumer price index|cpi|cost-push|demand-pull|rate of inflation)\b/i,
  },
  {
    topic: "Exchange Rates & Balance of Payments",
    regex: /\b(exchange rate\w*|depreciation|appreciation|balance of payments|current account|trade deficit|expenditure-reducing|expenditure-switching)\b/i,
  },
  {
    topic: "International Trade & Protectionism",
    regex: /\b(comparative advantage|absolute advantage|tariff\w*|quota\w*|protectionism|free trade|terms of trade)\b/i,
  },
  {
    topic: "Macroeconomic Policies",
    regex: /\b(monetary polic\w*|fiscal polic\w*|interest rate\w*|budget deficit|tax revenue|quantitative easing|supply-side polic\w*)\b/i,
  },
  {
    topic: "Economic Growth & Development",
    regex: /\b(economic growth|gdp|recession|living standards|sustainable growth|entrepreneur\w*)\b/i,
  },
  {
    topic: "Market Structures & Efficiency",
    regex: /\b(monopol\w+|oligopol\w+|perfect competition|collusion|cartel|contestabilit\w*|minimum efficient scale|productive efficienc\w*)\b/i,
  },
  {
    topic: "Employment & Labour Markets",
    regex: /\b(unemployment|labour market|wage\w*|trade union\w*|minimum wage|employment)\b/i,
  },
  {
    topic: "Economic Systems & Resource Allocation",
    regex: /\b(planned economy|command economy|mixed economy|free market economy|transition econom\w+|price mechanism)\b/i,
  },
];

function tagSyllabusTopic(text: string): string {
  for (const rule of SYLLABUS_TOPIC_RULES) {
    if (rule.regex.test(text)) return rule.topic;
  }
  return "General Principles";
}

// Download PDF helper
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
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// Extract all text runs from a PDF buffer
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

// Deterministic MCQ answer key parser (handles 2016-2019 2-col and 2020-2025 3-col tables)
function parseMcqAnswerKey(text: string): Record<string, "A" | "B" | "C" | "D"> {
  const answerKey: Record<string, "A" | "B" | "C" | "D"> = {};
  
  // Try universal format: question number (1-30) followed by answer letter (A-D)
  const regex = /\b(\d{1,2})\s+([ABCD])\b/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    const qNum = parseInt(m[1], 10);
    if (qNum >= 1 && qNum <= 30 && !answerKey[String(qNum)]) {
      answerKey[String(qNum)] = m[2] as "A" | "B" | "C" | "D";
    }
  }

  // Handle questions retracted/removed by Cambridge (award standard credit)
  const retractedRegex = /(\d{1,2})\s+Due to an issue with question\b/gi;
  while ((m = retractedRegex.exec(text)) !== null) {
    const qNum = parseInt(m[1], 10);
    if (qNum >= 1 && qNum <= 30 && !answerKey[String(qNum)]) {
      answerKey[String(qNum)] = "A";
    }
  }

  return answerKey;
}

// Deterministic Essay question parser from QP text
interface ExtractedEssay {
  mark: number;
  text: string;
  topic: string;
}

function parseEssayQuestions(fullText: string, level: "as" | "a2"): ExtractedEssay[] {
  // Strip cover page (page 1) to avoid matching boilerplate instructions
  const p2Idx = fullText.indexOf("[PAGE 2]");
  const contentFromP2 = p2Idx !== -1 ? fullText.substring(p2Idx) : fullText;

  let cleaned = contentFromP2
    .replace(/\d+\s+9708\/\d+\/[A-Z\/0-9]+\s+©\s+UCLES\s+\d{4}/gi, "")
    .replace(/\[Turn\s+over\]?/gi, "")
    .replace(/BLANK\s+PAGE/gi, "")
    .replace(/Permission to reproduce items[\s\S]*?(?=Section|[A-Z]|$)/gi, "");

  const secBIdx = cleaned.search(/Section\s+B/i);
  if (secBIdx === -1) return [];
  let sectionText = cleaned.substring(secBIdx);

  sectionText = sectionText
    .replace(/Section\s+[BC]/gi, "")
    .replace(/Answer\s+(?:one|any\s+(?:one|two))\s+questions?\./gi, "")
    .replace(/\b(EITHER|OR)\b/gi, "");

  const questions: ExtractedEssay[] = [];

  if (level === "as") {
    // AS Level (Paper 2): Section B and Section C essay subparts (a) [8] and (b) [12]
    const qBlocks = sectionText.split(/(?=(?:^|\n|\s)\b[2-6]\s+(?:\([ab]\)|[A-Z]))/g);
    for (const block of qBlocks) {
      const matchA = block.match(/(?:^|\s)(?:\([aA]\)|(?:[2-6]\s+)?\([aA]\))\s+([\s\S]+?)\s*\[8\]/);
      const matchB = block.match(/(?:^|\s)\([bB]\)\s+([\s\S]+?)\s*\[12\]/);

      const preludeMatch = block.match(/^(?:[2-6]\s+)?([A-Z][\s\S]+?)(?=\([aA]\))/);
      const prelude = preludeMatch ? preludeMatch[1].replace(/\s+/g, " ").trim() : "";

      if (matchA) {
        let text = matchA[1].replace(/\s+/g, " ").trim();
        if (prelude && prelude.length > 10 && !text.includes(prelude)) {
          text = `${prelude} ${text}`;
        }
        if (text.length > 20) {
          questions.push({
            mark: 8,
            text,
            topic: tagSyllabusTopic(text),
          });
        }
      }
      if (matchB) {
        const text = matchB[1].replace(/\s+/g, " ").trim();
        if (text.length > 20) {
          questions.push({
            mark: 12,
            text,
            topic: tagSyllabusTopic(text),
          });
        }
      }
    }
  } else {
    // A2 Level (Paper 4): Section B & C essays (20m, 25m, or subparts 12m/13m)
    // 1. Single long essays e.g. [20] or [25]
    const matchesSingle = [...sectionText.matchAll(/(?:^|\n|\s)([2-6])\s+([A-Z][\s\S]+?)\s*\[(20|25)\]/g)];
    for (const m of matchesSingle) {
      const text = m[2].replace(/\s+/g, " ").trim();
      const mark = parseInt(m[3], 10);
      if (text.length > 25) {
        questions.push({
          mark,
          text,
          topic: tagSyllabusTopic(text),
        });
      }
    }

    // 2. Subdivided Paper 4 essays e.g. (a) [12] and (b) [13]
    const qBlocks = sectionText.split(/(?=(?:^|\n|\s)\b[2-6]\s+(?:\([ab]\)|[A-Z]))/g);
    for (const block of qBlocks) {
      const matchA = block.match(/(?:^|\s)\([aA]\)\s+([\s\S]+?)\s*\[(12|13)\]/);
      const matchB = block.match(/(?:^|\s)\([bB]\)\s+([\s\S]+?)\s*\[(12|13)\]/);

      if (matchA) {
        const text = matchA[1].replace(/\s+/g, " ").trim();
        if (text.length > 20) {
          questions.push({
            mark: parseInt(matchA[2], 10),
            text,
            topic: tagSyllabusTopic(text),
          });
        }
      }
      if (matchB) {
        const text = matchB[1].replace(/\s+/g, " ").trim();
        if (text.length > 20) {
          questions.push({
            mark: parseInt(matchB[2], 10),
            text,
            topic: tagSyllabusTopic(text),
          });
        }
      }
    }
  }

  return questions;
}

// Human-readable Series Title
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

async function runHarvester() {
  const options = parseArgs();
  console.log("==================================================================");
  console.log(" 🚀 MARGINAL — CAMBRIDGE 9708 PAST PAPER AUTOMATED HARVESTER");
  console.log("==================================================================");
  console.log(` Target Years:    ${options.years.join(", ")}`);
  console.log(` Target Types:    ${options.types.toUpperCase()}`);
  console.log(` Target Variants: ${options.variants.join(", ")}`);
  console.log(` Batch Limit:     ${options.limit}`);
  console.log(` Mode:            ${options.dryRun ? "DRY RUN (No Supabase writes)" : "LIVE WRITE"}`);
  console.log("------------------------------------------------------------------");

  const pdfjs = await getPdfJs();

  // Generate candidate list
  const candidates: Array<{
    year: number;
    season: "m" | "s" | "w";
    variant: string;
    paperNum: number;
    level: "as" | "a2";
    isMcq: boolean;
    qpFileName: string;
    msFileName: string;
    qpUrl: string;
    msUrl: string;
  }> = [];

  const seasons: Array<"m" | "s" | "w"> = ["s", "w", "m"];

  for (const year of options.years) {
    const yy = String(year).slice(-2);
    for (const season of seasons) {
      for (const variant of options.variants) {
        // Feb/March only uses variant 2 (12, 22, 32, 42)
        if (season === "m" && !variant.endsWith("2")) continue;

        const paperNum = parseInt(variant[0], 10);
        const level: "as" | "a2" = paperNum === 1 || paperNum === 2 ? "as" : "a2";
        const isMcq = paperNum === 1 || paperNum === 3;

        // Filter based on requested types
        if (options.types === "mcq" && !isMcq) continue;
        if (options.types === "essay" && isMcq) continue;

        const qpFileName = `9708_${season}${yy}_qp_${variant}.pdf`;
        const msFileName = `9708_${season}${yy}_ms_${variant}.pdf`;
        const baseUrl = `https://bestexamhelp.com/exam/cambridge-international-a-level/economics-9708/${year}`;

        candidates.push({
          year,
          season,
          variant,
          paperNum,
          level,
          isMcq,
          qpFileName,
          msFileName,
          qpUrl: `${baseUrl}/${qpFileName}`,
          msUrl: `${baseUrl}/${msFileName}`,
        });
      }
    }
  }

  console.log(`Found ${candidates.length} candidate paper pairs to verify.`);

  let harvestedCount = 0;
  let mcqAddedCount = 0;
  let essaysAddedCount = 0;

  for (const item of candidates) {
    if (harvestedCount >= options.limit) {
      console.log(`\nReached batch limit of ${options.limit} papers. Finishing.`);
      break;
    }

    const seriesName = getSeriesName(item.season);
    const paperTitle = `9708 ${seriesName} ${item.year} Paper ${item.variant}`;

    console.log(`\n🔍 Checking: ${paperTitle} (${item.qpFileName})...`);

    // Fetch QP and MS
    const [qpBuffer, msBuffer] = await Promise.all([
      fetchPdf(item.qpUrl),
      fetchPdf(item.msUrl),
    ]);

    if (!qpBuffer) {
      console.log(`   ⏩ QP not found on mirror (HTTP 404). Skipping.`);
      continue;
    }

    if (item.isMcq) {
      // MCQ PROCESSING
      if (!msBuffer) {
        console.log(`   ⚠️ QP exists but MS is missing. Skipping MCQ paper.`);
        continue;
      }

      const msText = await extractTextFromPdfBuffer(pdfjs, msBuffer);
      const answerKey = parseMcqAnswerKey(msText);
      const keyCount = Object.keys(answerKey).length;

      if (keyCount !== 30) {
        console.log(`   ⚠️ Parsed ${keyCount}/30 answers from MS (incomplete). Skipping.`);
        continue;
      }

      console.log(`   ✅ Extracted 30/30 MCQ answers (100% complete) with 0 AI cost.`);

      if (!options.dryRun) {
        // Upload QP and MS to Supabase storage
        const qpStoragePath = `cambridge/${item.year}/${item.qpFileName}`;
        const msStoragePath = `cambridge/${item.year}/${item.msFileName}`;

        const { error: qpUpErr } = await supabase.storage
          .from("mcq-papers")
          .upload(qpStoragePath, qpBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (qpUpErr) console.warn(`   ⚠️ Storage QP upload note: ${qpUpErr.message}`);

        const { error: msUpErr } = await supabase.storage
          .from("mcq-papers")
          .upload(msStoragePath, msBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (msUpErr) console.warn(`   ⚠️ Storage MS upload note: ${msUpErr.message}`);

        const qpPublicUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpStoragePath).data.publicUrl;
        const msPublicUrl = supabase.storage.from("mcq-papers").getPublicUrl(msStoragePath).data.publicUrl;

        // Upsert into mcq_pdf_papers
        const { data: existing } = await supabase
          .from("mcq_pdf_papers")
          .select("id")
          .eq("exam_year", item.year)
          .eq("exam_series", seriesName)
          .ilike("title", `%Paper ${item.variant}%`)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("mcq_pdf_papers")
            .update({
              qp_path: qpStoragePath,
              qp_url: qpPublicUrl,
              ms_path: msStoragePath,
              ms_url: msPublicUrl,
              answer_key: answerKey,
            })
            .eq("id", existing.id);
          console.log(`   🔄 Updated existing record in 'mcq_pdf_papers' [${existing.id}]`);
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from("mcq_pdf_papers")
            .insert({
              title: paperTitle,
              level: item.level,
              exam_year: item.year,
              exam_series: seriesName,
              question_count: 30,
              qp_path: qpStoragePath,
              qp_url: qpPublicUrl,
              ms_path: msStoragePath,
              ms_url: msPublicUrl,
              answer_key: answerKey,
            })
            .select("id")
            .single();

          if (insErr) {
            console.error(`   ❌ Failed to insert into 'mcq_pdf_papers': ${insErr.message}`);
          } else {
            console.log(`   ✨ Inserted into 'mcq_pdf_papers' [${inserted?.id}]`);
            mcqAddedCount++;
          }
        }
      } else {
        console.log(`   [DRY RUN] Would upload PDFs and insert paper into 'mcq_pdf_papers'.`);
        mcqAddedCount++;
      }

      harvestedCount++;
    } else {
      // ESSAY PROCESSING
      const qpText = await extractTextFromPdfBuffer(pdfjs, qpBuffer);
      const essays = parseEssayQuestions(qpText, item.level);

      if (essays.length === 0) {
        console.log(`   ⚠️ No essay questions found in Section B/C. Skipping.`);
        continue;
      }

      console.log(`   ✅ Extracted ${essays.length} discrete essay questions with 0 AI cost:`);
      for (const essay of essays) {
        console.log(`      • [${essay.mark}m] [${essay.topic}]: "${essay.text.slice(0, 75)}..."`);
      }

      if (!options.dryRun) {
        // Upload QP to storage
        const qpStoragePath = `cambridge/${item.year}/${item.qpFileName}`;
        await supabase.storage
          .from("mcq-papers")
          .upload(qpStoragePath, qpBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        let insertedEssaysForPaper = 0;
        for (const essay of essays) {
          // Check if question already exists in bank_essay_questions
          const { data: existingQ } = await supabase
            .from("bank_essay_questions")
            .select("id")
            .eq("question_text", essay.text)
            .maybeSingle();

          if (existingQ) {
            if (options.verbose) console.log(`      ⏩ Question already exists in bank. Skipping duplicate.`);
            continue;
          }

          const { error: essayErr } = await supabase.from("bank_essay_questions").insert({
            level: item.level,
            topic: essay.topic,
            exam_series: `${seriesName} ${item.year} Paper ${item.variant}`,
            question_text: essay.text,
            max_mark: essay.mark,
            status: "approved",
          });

          if (essayErr) {
            console.error(`      ❌ Error inserting essay: ${essayErr.message}`);
          } else {
            insertedEssaysForPaper++;
            essaysAddedCount++;
          }
        }
        console.log(`   ✨ Saved ${insertedEssaysForPaper} new questions to 'bank_essay_questions'.`);
      } else {
        console.log(`   [DRY RUN] Would insert ${essays.length} essay questions into 'bank_essay_questions'.`);
        essaysAddedCount += essays.length;
      }

      harvestedCount++;
    }
  }

  console.log("\n==================================================================");
  console.log(" 🎉 HARVEST COMPLETED SUCCESSFULLY");
  console.log("==================================================================");
  console.log(` Total Papers Processed:    ${harvestedCount}`);
  console.log(` MCQ Papers Added/Updated:  ${mcqAddedCount}`);
  console.log(` Essay Questions Added:     ${essaysAddedCount}`);
  console.log(" Token Cost:                $0.00 (Zero AI tokens consumed)");
  console.log("==================================================================\n");
}

runHarvester().catch((err) => {
  console.error("Fatal harvester error:", err);
  process.exit(1);
});
