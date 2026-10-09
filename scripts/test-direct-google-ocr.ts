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

import { getActiveProvider } from "../src/lib/ai/active.server";

const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

async function testDirectOcr() {
  const cp = await getActiveProvider();
  if (!cp) throw new Error("No provider found");

  const imgPath = path.resolve("test_kaden_page.jpg");
  const base64 = fs.readFileSync(imgPath).toString("base64");
  const models = ["models/gemini-3.8-flash", "models/gemini-3.6-flash", "models/gemini-3.7-flash"];

  for (const model of models) {
    console.log(`Trying ${model}...`);
    const start = Date.now();
    try {
      const response = await fetch(`${GOOGLE_ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": cp.apiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are an OCR engine specialised in handwritten examination scripts. Transcribe the handwriting exactly as written, word for word. Preserve spelling, punctuation and line breaks. If any diagram is drawn, tag it with [DIAGRAM: ...].",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: base64 } },
                { text: "Transcribe this handwritten page exactly as written." },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2048,
          },
        }),
      });

      console.log(`Response status for ${model}:`, response.status);
      const data = await response.json();
      if (!response.ok) {
        console.warn(`${model} error:`, data?.error?.message || response.status);
        continue;
      }

      const transcribed = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const latency = Date.now() - start;
      console.log(`\n=== REAL HANDWRITING TRANSCRIBED WITH ${model} IN ${latency}ms ===`);
      console.log(transcribed);
      console.log("===================================================================\n");
      return;
    } catch (err: any) {
      console.warn(`${model} failed:`, err.message);
    }
  }
}

testDirectOcr().catch(console.error);
