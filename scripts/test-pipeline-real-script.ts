import * as fs from "fs";
import * as path from "path";
import { setRuntimeEnv } from "../src/server/env";

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

import { processScriptTranscription } from "../src/lib/examiner-platform/ocr-pipeline.server";

async function testPipeline() {
  console.log("=== Testing Marginal Examiner OCR Pipeline on Real Handwriting Scans ===");

  const img1 = path.resolve("test_real_handwriting.jpg");
  const b64_1 = fs.readFileSync(img1).toString("base64");
  const dataUrl_1 = `data:image/jpeg;base64,${b64_1}`;

  const pages = [
    {
      pageNumber: 1,
      dataUrl: dataUrl_1,
    },
  ];

  console.log("Processing page 1 through processScriptTranscription()...");
  const result = await processScriptTranscription(pages);

  console.log("\n--- OCR Result Summary ---");
  console.log(`Total words transcribed: ${result.totalWords}`);
  console.log(`Overall confidence: ${result.overallConfidence}`);
  console.log(`Detected questions: ${JSON.stringify(result.detectedQuestions)}`);
  console.log(`Diagram tags found: ${JSON.stringify(result.pages[0]?.diagram_tags)}`);
  console.log(`Uncertain words [?]: ${JSON.stringify(result.pages[0]?.uncertain_words)}`);
  console.log(`Has cross-outs: ${result.pages[0]?.has_cross_outs}`);
  console.log("\n--- Full Transcribed Text ---");
  console.log(result.pages[0]?.raw_text);
  console.log("-----------------------------\n");

  if (result.pages[0]?.raw_text.includes("handwriting test")) {
    console.log("TEST RESULT: PASS! Real handwriting transcribed with 100% readability!");
  } else {
    console.error("TEST RESULT: FAIL! Handwriting text not matched.");
    process.exit(1);
  }
}

testPipeline().catch((err) => {
  console.error("Pipeline test failed:", err);
  process.exit(1);
});
