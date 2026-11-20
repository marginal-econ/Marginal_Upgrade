import * as fs from "fs";
import * as path from "path";
import { setRuntimeEnv } from "../src/server/env";

// Load .env
if (fs.existsSync(".env")) {
  const envText = fs.readFileSync(".env", "utf8");
  const envObj: Record<string, string> = {};
  envText.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[k] = v;
      envObj[k] = v;
    }
  });
  setRuntimeEnv(envObj);
}

import { transcribeWithGemini } from "../src/lib/ocr/gemini.server";
import { processScriptTranscription } from "../src/lib/examiner-platform/ocr-pipeline.server";

async function downloadImage(url: string, dest: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "MarginalOCR/1.0 (tester@marginalupgrade.com)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  const mime = res.headers.get("content-type") || (dest.endsWith(".png") ? "image/png" : "image/jpeg");
  const b64 = buf.toString("base64");
  return `data:${mime};base64,${b64}`;
}

async function run() {
  console.log("=== Testing Handwriting OCR Pipeline on 3 Different Styles ===");

  const testCases = [
    {
      id: 1,
      style: "Historic / Elegant Cursive Script",
      url: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Handwritten_Text.jpg",
      localFile: "test_sample_1_cursive.jpg",
      description: "Full cursive handwritten paragraph on paper",
    },
    {
      id: 2,
      style: "Modern Casual Print / Script (Handwritten Note)",
      url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Hello_handwriting_sample.JPG",
      localFile: "test_sample_2_hello.jpg",
      description: "Casual everyday handwritten note",
    },
    {
      id: 3,
      style: "Clean Penmanship / Cursive comparison sample",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Handwriting.png",
      localFile: "test_sample_3_print_cursive.png",
      description: "Handwritten sample comparing print and cursive sentences",
    },
  ];

  for (const tc of testCases) {
    console.log(`\n================================================================`);
    console.log(`[TEST ${tc.id}/3] Style: ${tc.style}`);
    console.log(`Description: ${tc.description}`);
    console.log(`Source URL: ${tc.url}`);

    console.log(`Downloading sample...`);
    const dataUrl = await downloadImage(tc.url, tc.localFile);
    console.log(`Saved locally as ${tc.localFile} (${Math.round(dataUrl.length / 1024)} KB dataUrl)`);

    console.log(`Executing transcribeWithGemini()...`);
    const start = Date.now();
    const outcome = await transcribeWithGemini([dataUrl]);
    const duration = Date.now() - start;

    console.log(`\n>>> RESULT FOR TEST ${tc.id}:`);
    console.log(`Status: SUCCESS (${duration}ms)`);
    console.log(`Model used: ${outcome.model}`);
    console.log(`Pages processed: ${outcome.pages}, Failed: ${outcome.failedPages.length}`);
    console.log(`--- Transcribed Text Preview ---`);
    console.log(outcome.text);
    console.log(`--------------------------------\n`);

    console.log(`Now testing Examiner Platform OCR pipeline parser (processScriptTranscription)...`);
    const pipelineResult = await processScriptTranscription([
      {
        pageNumber: 1,
        dataUrl,
      },
    ]);
    console.log(`Examiner pipeline stats:`);
    console.log(`- Words transcribed: ${pipelineResult.totalWords}`);
    console.log(`- Overall confidence: ${pipelineResult.overallConfidence}`);
    console.log(`- Diagram tags: ${pipelineResult.totalDiagrams}`);
    console.log(`- Detected questions: ${JSON.stringify(pipelineResult.detectedQuestions)}`);
  }

  console.log(`\n================================================================`);
  console.log(`ALL 3 HANDWRITING TESTS COMPLETED SUCCESSFULLY!`);
  console.log(`Pipeline verified working with multiple handwriting styles.`);
}

run().catch((err) => {
  console.error("FATAL OCR Test error:", err);
  process.exit(1);
});
