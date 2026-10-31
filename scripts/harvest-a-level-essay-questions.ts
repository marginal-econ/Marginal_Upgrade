/**
 * harvest-a-level-essay-questions.ts
 *
 * Extracts real past-paper 20-mark and 12-mark A Level (A2) essay questions
 * from Paper 4 Question Papers in the knowledge base and ingests them into
 * the bank_essay_questions table.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanQuestionText(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\[PAGE\s*\d+\]/gi, "")
    .replace(/\d+\s+9708\/\d+\/[A-Z0-9\/]+\s+©\s*UCLES\s*\d+/gi, "")
    .replace(/\[Turn over/gi, "")
    .replace(/Permission to reproduce items[\s\S]*$/gi, "")
    .replace(/^(\([a-b]\)|\d+\s*(\([a-b]\))?)\s*/i, "")
    .replace(/^\s*(EITHER|OR)\s*/i, "")
    .trim();
}

function classifyTopic(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("indifference") || t.includes("marginal utility") || t.includes("rational consumer") || t.includes("giffen") || t.includes("budget line") || t.includes("consumer equilibrium") || t.includes("diminishing marginal utility") || t.includes("equi-marginal")) {
    return "General Principles";
  }
  if (t.includes("labour") || t.includes("wage") || t.includes("trade union") || t.includes("trades union") || t.includes("monopsony") || t.includes("mrp") || t.includes("marginal revenue product")) {
    return "Employment & Labour Markets";
  }
  if (t.includes("market failure") || t.includes("externalit") || t.includes("public good") || t.includes("merit good") || t.includes("pollution") || t.includes("climate change") || t.includes("negative external")) {
    return "Market Failure & Externalities";
  }
  if (t.includes("perfect competition") || t.includes("monopoly") || t.includes("monopolistic") || t.includes("oligopoly") || t.includes("cartel") || t.includes("collud") || t.includes("price discrimination") || t.includes("profit maximis") || t.includes("sales maximis") || t.includes("principal-agent") || t.includes("economies of scale") || t.includes("merger") || t.includes("contestable") || t.includes("privatisation") || t.includes("small firms") || t.includes("large firms") || t.includes("survival of firms") || t.includes("allocative efficienc") || t.includes("dynamic efficienc") || t.includes("productive efficienc") || t.includes("economic efficienc")) {
    return "Market Structures & Efficiency";
  }
  if (t.includes("inflation") || t.includes("price stability") || t.includes("expectations of the future rate of inflation") || t.includes("cost-push") || t.includes("demand-pull") || t.includes("deflation")) {
    return "Inflation & Price Stability";
  }
  if (t.includes("exchange rate") || t.includes("balance of payments") || t.includes("current account") || t.includes("depreciation") || t.includes("devaluation") || t.includes("terms of trade")) {
    return "Exchange Rates & Balance of Payments";
  }
  if (t.includes("globalisation") || t.includes("free trade") || t.includes("protectionism") || t.includes("tariff") || t.includes("comparative advantage") || t.includes("fta") || t.includes("trade area") || t.includes("customs union")) {
    return "International Trade & Protectionism";
  }
  if (t.includes("monetary policy") || t.includes("fiscal policy") || t.includes("supply-side policy") || t.includes("interest rate") || t.includes("government spending") || t.includes("budget deficit") || t.includes("budget surplus") || t.includes("national debt") || t.includes("macroeconomic") || t.includes("keynesian") || t.includes("quantitative easing") || t.includes("demand for money") || t.includes("unemployment") || t.includes("recession")) {
    return "Macroeconomic Policies";
  }
  if (t.includes("standard of living") || t.includes("gni") || t.includes("gross national income") || t.includes("gdp") || t.includes("gross domestic product") || t.includes("poverty") || t.includes("multinational") || t.includes("foreign direct investment") || t.includes("fdi") || t.includes("international aid") || t.includes("developing") || t.includes("low-income country") || t.includes("low-income countries") || t.includes("economic growth") || t.includes("export-led growth") || t.includes("productivity")) {
    return "Economic Growth & Development";
  }
  return "General Principles";
}

export async function harvestALevelEssayQuestions() {
  console.log("=== INGESTING A LEVEL ESSAY QUESTIONS TO QUESTION BANK ===");

  const { data: existingRows, error: exErr } = await supabase
    .from("bank_essay_questions")
    .select("question_text");

  if (exErr) {
    console.error("Error fetching existing questions:", exErr);
    return;
  }

  const existingSet = new Set<string>();
  for (const r of existingRows || []) {
    existingSet.add(normalizeText(r.question_text));
  }
  console.log(`Initial count in database: ${existingSet.size}`);

  const { data: allDocs, error: docErr } = await supabase
    .from("knowledge_documents")
    .select("id, title, exam_series")
    .like("title", "%Paper 4%")
    .not("title", "like", "%Compendium%")
    .not("title", "like", "%Mark Scheme%");

  if (docErr || !allDocs) {
    console.error("Error fetching documents:", docErr);
    return;
  }

  const toInsert: Array<{
    level: "a2";
    topic: string;
    source_document_id: string;
    exam_series: string;
    question_text: string;
    max_mark: number;
    status: "approved";
  }> = [];

  const seenInBatch = new Set<string>();

  const addQuestion = (text: string, maxMark: number, docId: string, series: string) => {
    const cleaned = cleanQuestionText(text);
    if (cleaned.length < 25) return;
    if (cleaned.includes("Section A") || cleaned.includes("Answer all parts of Question 1")) return;
    const norm = normalizeText(cleaned);
    if (existingSet.has(norm) || seenInBatch.has(norm)) return;
    seenInBatch.add(norm);
    toInsert.push({
      level: "a2",
      topic: classifyTopic(cleaned),
      source_document_id: docId,
      exam_series: series,
      question_text: cleaned,
      max_mark: maxMark,
      status: "approved",
    });
  };

  for (const doc of allDocs) {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", doc.id)
      .order("chunk_index");

    const fullText = (chunks || []).map(c => c.content).join("\n\n");
    const isModern = /2023|2024/i.test(doc.title);
    const series = doc.exam_series || doc.title.replace(/\s*\(Question Paper\)/i, "");

    if (isModern) {
      const secBIdx = fullText.lastIndexOf("Section B");
      const secCIdx = fullText.lastIndexOf("Section C");
      if (secBIdx === -1 || secCIdx === -1) continue;

      const secB = fullText.slice(secBIdx, secCIdx);
      const secC = fullText.slice(secCIdx);

      const m2 = secB.match(/(?:EITHER\s*)?2\s+([\s\S]+?)\s*\[20\]/i);
      const m3 = secB.match(/\bOR\s*3\s+([\s\S]+?)\s*\[20\]/i);
      const m4 = secC.match(/(?:EITHER\s*)?4\s+([\s\S]+?)\s*\[20\]/i);
      const m5 = secC.match(/\bOR\s*5\s+([\s\S]+?)\s*\[20\]/i);

      if (m2) addQuestion(m2[1], 20, doc.id, series);
      if (m3) addQuestion(m3[1], 20, doc.id, series);
      if (m4) addQuestion(m4[1], 20, doc.id, series);
      if (m5) addQuestion(m5[1], 20, doc.id, series);
    } else {
      const secBIdx = fullText.lastIndexOf("Section B");
      if (secBIdx === -1) continue;
      const secB = fullText.slice(secBIdx);

      const qIndices: Array<{ num: number; index: number }> = [];
      for (let q = 2; q <= 7; q++) {
        const reg = new RegExp(`(?:\\s{2,}|\\n|\\r\\n)(${q})\\s+([A-Z]|\\(a\\))`, "i");
        const m = reg.exec(secB);
        if (m) {
          qIndices.push({ num: q, index: m.index + m[0].indexOf(m[1]) });
        }
      }
      qIndices.sort((a, b) => a.index - b.index);

      for (let i = 0; i < qIndices.length; i++) {
        const curr = qIndices[i];
        const nextIdx = i < qIndices.length - 1 ? qIndices[i + 1].index : secB.indexOf("Permission to reproduce");
        const block = secB.slice(curr.index, nextIdx !== -1 ? nextIdx : undefined);

        if (block.includes("[12]") && block.includes("[13]")) {
          const mA = block.match(/\(a\)\s+([\s\S]+?)\s*\[12\]/i);
          const mB = block.match(/\(b\)\s+([\s\S]+?)\s*\[13\]/i);
          if (mA) addQuestion(mA[1], 12, doc.id, series);
          if (mB) addQuestion(mB[1], 12, doc.id, series);
        } else if (block.includes("[25]")) {
          const m25 = block.match(/(?:^\d+\s+)?([\s\S]+?)\s*\[25\]/i);
          if (m25) addQuestion(m25[1], 20, doc.id, series);
        }
      }
    }
  }

  console.log(`Inserting ${toInsert.length} new unique A Level essay questions...`);

  let totalInserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { data: inserted, error: insErr } = await supabase
      .from("bank_essay_questions")
      .insert(batch)
      .select("id");

    if (insErr) {
      console.error(`Error inserting batch ${Math.floor(i / 50) + 1}:`, insErr);
    } else {
      totalInserted += inserted?.length || 0;
      console.log(`Batch ${Math.floor(i / 50) + 1}: inserted ${inserted?.length} (${totalInserted}/${toInsert.length})`);
    }
  }

  const { count: finalTotal } = await supabase
    .from("bank_essay_questions")
    .select("id", { count: "exact", head: true });

  console.log(`Total questions in bank_essay_questions: ${finalTotal}`);
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("harvest-a-level-essay-questions")) {
  harvestALevelEssayQuestions().catch(console.error);
}
