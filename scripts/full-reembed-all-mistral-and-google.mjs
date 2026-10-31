import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { randomUUID } from "crypto";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.BACKEND_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.BACKEND_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

function normalizeVectorTo2048(vec) {
  if (!Array.isArray(vec)) return new Array(2048).fill(0);
  if (vec.length === 2048) return vec;
  if (vec.length < 2048) return [...vec, ...new Array(2048 - vec.length).fill(0)];
  return vec.slice(0, 2048);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatchGoogle(texts, googleKey, googleModel) {
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${googleModel}:batchEmbedContents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleKey },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: googleModel,
            content: { parts: [{ text: t }] },
            outputDimensionality: 2048,
          })),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.embeddings.map((e) => normalizeVectorTo2048(e.values));
      }

      if (res.status === 429 || res.status === 503) {
        console.warn(`[Google] Rate limited (429/503), retrying in ${attempt * 3000}ms...`);
        await sleep(attempt * 3000);
        continue;
      }

      const errText = await res.text();
      throw new Error(`Google API returned ${res.status}: ${errText.slice(0, 200)}`);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`[Google] Attempt ${attempt} failed: ${err.message}. Retrying...`);
      await sleep(attempt * 2000);
    }
  }
}

async function embedBatchMistral(texts, mistralKey, mistralModel) {
  if (texts.length === 0) return [];
  // Ensure individual texts don't exceed 16,000 characters (~4,000 tokens)
  const safeTexts = texts.map((t) => (t && t.length > 16000 ? t.slice(0, 16000) : t || ""));

  // Mistral embedding endpoint has strict per-request total token limits.
  // Split into chunks of max 10 texts or max 15,000 characters combined.
  const totalChars = safeTexts.reduce((sum, t) => sum + (t ? t.length : 0), 0);
  if (safeTexts.length > 1 && (safeTexts.length > 10 || totalChars > 15000)) {
    const mid = Math.floor(safeTexts.length / 2);
    const left = await embedBatchMistral(safeTexts.slice(0, mid), mistralKey, mistralModel);
    const right = await embedBatchMistral(safeTexts.slice(mid), mistralKey, mistralModel);
    return [...left, ...right];
  }

  const maxRetries = 12;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: mistralModel,
          input: safeTexts,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.data.map((d) => normalizeVectorTo2048(d.embedding));
      }

      if (res.status === 429 || res.status === 503) {
        const backoff = Math.min(attempt * 3000, 20000);
        console.warn(`[Mistral] Rate limited (${res.status}), backing off for ${backoff}ms (attempt ${attempt}/${maxRetries})...`);
        await sleep(backoff);
        continue;
      }

      const errText = await res.text();
      // If prompt is still too large and we have more than 1 item, split and retry
      if (errText.includes("Too many tokens") && safeTexts.length > 1) {
        console.warn(`[Mistral] Batch of ${safeTexts.length} had too many tokens, splitting in half...`);
        const mid = Math.floor(safeTexts.length / 2);
        const left = await embedBatchMistral(safeTexts.slice(0, mid), mistralKey, mistralModel);
        const right = await embedBatchMistral(safeTexts.slice(mid), mistralKey, mistralModel);
        return [...(left || []), ...(right || [])];
      }

      throw new Error(`Mistral API returned ${res.status}: ${errText.slice(0, 200)}`);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`[Mistral] Attempt ${attempt} failed: ${err.message}. Retrying in 3000ms...`);
      await sleep(3000);
    }
  }
}

async function main() {
  console.log("=========================================================");
  console.log("  DUAL-ENGINE EMBEDDING PIPELINE: GOOGLE + MISTRAL");
  console.log("=========================================================");

  // 1. Fetch AI keys
  const { data: gKeyRow, error: gKeyErr } = await supabase
    .from("ai_provider_keys")
    .select("*")
    .eq("provider", "google")
    .eq("purpose", "embedding")
    .single();

  if (gKeyErr || !gKeyRow) {
    throw new Error("Google embedding key not found in ai_provider_keys!");
  }

  const { data: mKeyRow, error: mKeyErr } = await supabase
    .from("ai_provider_keys")
    .select("*")
    .eq("provider", "mistral")
    .eq("purpose", "embedding")
    .single();

  if (mKeyErr || !mKeyRow) {
    throw new Error("Mistral embedding key not found in ai_provider_keys!");
  }

  const googleKey = gKeyRow.api_key;
  const googleModel = gKeyRow.model || "models/gemini-embedding-001";
  const mistralKey = mKeyRow.api_key;
  const mistralModel = mKeyRow.model || "mistral-embed-2312";

  console.log(`✓ Google Provider: ${gKeyRow.label} | Model: ${googleModel}`);
  console.log(`✓ Mistral Provider: ${mKeyRow.label} | Model: ${mistralModel}`);

  // -----------------------------------------------------------------
  // STEP A: Ensure 100% of canonical chunks have Google embeddings
  // -----------------------------------------------------------------
  console.log("\n--- STEP A: Checking Missing Google Embeddings ---");
  const { count: nullGoogleCount } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .lt("chunk_index", 100000)
    .is("embedding", null);

  console.log(`Canonical chunks missing Google embeddings: ${nullGoogleCount}`);

  if (nullGoogleCount > 0) {
    console.log(`Generating Google Gemini embeddings for ${nullGoogleCount} chunks...`);
    let processed = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("document_chunks")
        .select("id, content")
        .lt("chunk_index", 100000)
        .is("embedding", null)
        .limit(20);

      if (error) {
        console.error("Error fetching missing Google chunks:", error);
        break;
      }
      if (!batch || batch.length === 0) break;

      const vectors = await embedBatchGoogle(
        batch.map((b) => b.content),
        googleKey,
        googleModel
      );

      for (let i = 0; i < batch.length; i++) {
        await supabase
          .from("document_chunks")
          .update({
            embedding: JSON.stringify(vectors[i]),
            model_version: "google/gemini-embedding-2",
          })
          .eq("id", batch[i].id);
      }

      processed += batch.length;
      console.log(`[Google] Embedded ${processed}/${nullGoogleCount} missing chunks...`);
      await sleep(300);
    }
    console.log("✓ Google embeddings complete for all canonical chunks!");
  } else {
    console.log("✓ All canonical chunks already have Google embeddings!");
  }

  // -----------------------------------------------------------------
  // STEP B: Fetch all canonical chunks and embed with Mistral
  // -----------------------------------------------------------------
  console.log("\n--- STEP B: Generating Full Mistral Embeddings ---");

  // Get existing Mistral chunks set (by document_id and chunk_index)
  console.log("Checking already embedded Mistral chunks...");
  let existingMistralMap = new Set();
  let mPage = 0;
  const mPageSize = 1000;
  while (true) {
    const { data: existingM, error: exErr } = await supabase
      .from("document_chunks")
      .select("document_id, chunk_index")
      .gte("chunk_index", 100000)
      .range(mPage * mPageSize, (mPage + 1) * mPageSize - 1);

    if (exErr) {
      console.error("Error fetching existing Mistral chunks:", exErr);
      break;
    }
    for (const r of existingM || []) {
      existingMistralMap.add(`${r.document_id}::${r.chunk_index - 100000}`);
    }
    if (!existingM || existingM.length < mPageSize) break;
    mPage++;
  }
  console.log(`Found ${existingMistralMap.size} existing Mistral chunks.`);

  // Load all canonical chunks
  let canonicalChunks = [];
  let cPage = 0;
  const cPageSize = 1000;
  while (true) {
    const { data: chunks, error: cErr } = await supabase
      .from("document_chunks")
      .select("id, document_id, chunk_index, content, heading, token_estimate, topic_id")
      .lt("chunk_index", 100000)
      .range(cPage * cPageSize, (cPage + 1) * cPageSize - 1);

    if (cErr) {
      console.error("Error loading canonical chunks:", cErr);
      break;
    }
    canonicalChunks.push(...chunks);
    if (!chunks || chunks.length < cPageSize) break;
    cPage++;
  }

  console.log(`Total canonical chunks in database: ${canonicalChunks.length}`);

  const pendingMistral = canonicalChunks.filter(
    (c) => !existingMistralMap.has(`${c.document_id}::${c.chunk_index}`)
  );

  console.log(`Chunks pending Mistral embedding: ${pendingMistral.length}`);

  const MISTRAL_BATCH_SIZE = 25;
  const batches = [];
  for (let offset = 0; offset < pendingMistral.length; offset += MISTRAL_BATCH_SIZE) {
    batches.push(pendingMistral.slice(offset, offset + MISTRAL_BATCH_SIZE));
  }

  const CONCURRENCY = 1;
  let batchIndex = 0;
  let mistralEmbedded = 0;

  async function worker(workerId) {
    while (batchIndex < batches.length) {
      const idx = batchIndex++;
      const slice = batches[idx];
      if (!slice) break;

      const texts = slice.map((c) => c.content);
      const vectors = await embedBatchMistral(texts, mistralKey, mistralModel);

      const insertRows = slice.map((c, i) => ({
        id: randomUUID(),
        document_id: c.document_id,
        chunk_index: 100000 + c.chunk_index,
        content: c.content,
        heading: c.heading,
        token_estimate: c.token_estimate,
        topic_id: c.topic_id,
        model_version: mistralModel,
        embedding: JSON.stringify(vectors[i]),
      }));

      const { error: insErr } = await supabase.from("document_chunks").insert(insertRows);
      if (insErr) {
        for (const row of insertRows) {
          await supabase.from("document_chunks").insert(row);
        }
      }

      mistralEmbedded += slice.length;
      console.log(
        `[Mistral] Embedded & saved ${mistralEmbedded}/${pendingMistral.length} chunks (${Math.round(
          (mistralEmbedded / pendingMistral.length) * 100
        )}%)...`
      );
      await sleep(350);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  // -----------------------------------------------------------------
  // STEP C: Verification & Quality Audit
  // -----------------------------------------------------------------
  console.log("\n--- STEP C: Verification & Quality Audit ---");
  const { count: totalGoogle } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .lt("chunk_index", 100000)
    .not("embedding", "is", null);

  const { count: totalMistral } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .gte("chunk_index", 100000)
    .not("embedding", "is", null);

  console.log(`✓ Active Google Embedded Chunks:  ${totalGoogle}`);
  console.log(`✓ Active Mistral Embedded Chunks: ${totalMistral}`);

  const testQuery = "What is the relationship between inflation and unemployment in the short run?";
  console.log(`\nTesting semantic retrieval with query: "${testQuery}"`);

  // 1. Google test
  const gTestVectors = await embedBatchGoogle([testQuery], googleKey, googleModel);
  const { data: gResults } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(gTestVectors[0]),
    match_count: 3,
  });
  console.log("\n[Google Engine Results]");
  gResults?.forEach((r, i) =>
    console.log(`  ${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.document_title} - ${r.heading || "Section"}`)
  );

  // 2. Mistral test
  const mTestVectors = await embedBatchMistral([testQuery], mistralKey, mistralModel);
  const { data: mResults } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(mTestVectors[0]),
    match_count: 3,
  });
  console.log("\n[Mistral Engine Results]");
  mResults?.forEach((r, i) =>
    console.log(`  ${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.document_title} - ${r.heading || "Section"}`)
  );

  console.log("\n=========================================================");
  console.log("✓ SUCCESS: Full dual Google + Mistral embedding complete!");
  console.log("=========================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR in main pipeline:", err);
  process.exit(1);
});
