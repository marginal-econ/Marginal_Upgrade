/**
 * Handwriting OCR. Resolution order: the admin-active VISION-purpose key
 * (Admin → AI providers → Vision) — Google is called directly via its own
 * REST API for the mediaResolution:HIGH legibility boost, any other vision
 * provider goes through the shared visionChat() adapter — then the
 * built-in Lovable AI gateway fallback chain, so transcription never dies
 * on config.
 */
import { AiGatewayError, visionChat } from "../ai.server";
import { getActiveVisionProvider, getActiveProvider } from "../ai/active.server";
import type { ProviderConfig } from "../ai/active.server";

// Gemini 3.7 Flash reads small/cramped handwriting far more reliably than
// 2.5 Flash and is the only line that supports mediaResolution — the biggest
// lever we have for legibility. This is used ONLY for the direct Google AI
// Studio path (an admin-saved key calling Google's API directly).
const GOOGLE_MODEL = "models/gemini-3.7-flash";
const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Gateway fallback chain. IMPORTANT: this must only ever contain models the
 * Lovable AI gateway actually serves (see AI_PROVIDERS in ai/providers.ts —
 * "google/gemini-3.6-flash", "openai/gpt-5.6-sol", "openai/gpt-5.6-terra").
 * A previous version of this list led with "google/gemini-3.7-flash", which
 * the gateway does not serve — every page burned 3 guaranteed-failed attempts
 * (with backoff) on a non-existent model before ever reaching a working one,
 * which both slowed every transcription down and made pages fail outright
 * under load, since the wasted retries increased the odds of a genuine rate
 * limit on the models that do work. Keep this list gateway-verified.
 */
const GATEWAY_MODELS = ["google/gemini-3.6-flash", "openai/gpt-5.6-sol", "openai/gpt-5.6-terra"];
const ATTEMPTS_PER_MODEL = 2;
const CONCURRENCY = 3;
const MAX_OUTPUT_TOKENS = 16384; // dense pages with several diagram tags can run long

const SYSTEM_PROMPT = [
  "You are an OCR engine specialised in Cambridge examination papers. Read handwritten English exactly as written.",
  "Preserve spelling mistakes, grammar mistakes, punctuation and line breaks. Never improve or rewrite the student's wording.",
  "This is a photographed or scanned exam script: handwriting may be cursive, cramped, faint pencil, or written over crossed-out text.",
  "Look closely at individual letter shapes before deciding a word is unreadable — use the surrounding sentence to resolve a genuinely",
  "ambiguous letter (e.g. a vs o, n vs u, or a word split across a line break), but never invent a word that isn't visually supported.",
  "If a word cannot be confidently read after that, replace only that word with [?]. Do not guess wildly.",
  "",
  "HAND-DRAWN DIAGRAMS: if the page contains a drawn economics diagram (axes, curves, shifts, arrows, shaded areas),",
  "do NOT skip it and do NOT invent handwriting for it. Insert a single structured tag at the exact point in the flow",
  "where the diagram appears, on its own line, in this format:",
  "[DIAGRAM: <best-guess standard name, e.g. AD/AS, demand and supply with price ceiling, PPC, monopoly, Lorenz curve>",
  "| axes: <x-axis label / y-axis label exactly as drawn, or 'unlabelled'>",
  "| curves: <curves drawn and any shifts/directions, e.g. 'AD shifts right AD1->AD2, SRAS static'>",
  "| labels: <equilibrium points, prices, quantities, shaded areas, annotations written on the diagram>",
  "| accuracy: <short factual note on what is correct, missing or mislabelled — no marks, no praise>]",
  "Describe only what is actually drawn. If a feature is missing (e.g. no axis labels), say so in that field.",
  "Do not summarise. Do not explain. Output only the transcription and any diagram tags.",
  "",
  "This page WILL contain something to transcribe — every page comes from a real, non-blank exam script. If the",
  "handwriting is faint, small or partly obscured, do your best rather than giving up; use [?] only for individual",
  "words you genuinely cannot resolve. If there is genuinely no writing or diagram on this page, return '[Blank page]'.",
].join("\n");

const PAGE_PROMPT =
  "Transcribe the handwriting on this page exactly as written, and tag any hand-drawn diagram using the [DIAGRAM: ...] format. Ignore page numbers and printed exam instructions.";

export type PageTranscription = { page: number; text: string | null; error: string | null };

export type GeminiOcrOutcome = {
  text: string;
  /** Per-page text in original page order, null where that page failed. */
  pageTexts: (string | null)[];
  model: string;
  pages: number;
  failedPages: number[];
  /** Human-readable reason each failed page could not be read, keyed by page number. */
  pageErrors: Record<number, string>;
  latencyMs: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Full jitter backoff: never lets concurrent workers retry in lockstep. */
function backoffDelay(attempt: number, isRateLimited: boolean): number {
  const base = isRateLimited ? 2500 : 500;
  const cap = base * 2 ** attempt;
  return Math.round(Math.random() * cap);
}

/** The admin-active vision-purpose key, if any — direct Google path or generic vision path. */
async function getVisionConfig(): Promise<ProviderConfig | null> {
  try {
    return (await getActiveVisionProvider()) ?? (await getActiveProvider());
  } catch {
    return null;
  }
}

async function prepareDataUrl(input: string): Promise<{ mimeType: string; data: string; fullDataUrl: string }> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const res = await fetch(input);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const buf = Buffer.from(await res.arrayBuffer());
        const b64 = buf.toString("base64");
        return {
          mimeType: contentType,
          data: b64,
          fullDataUrl: `data:${contentType};base64,${b64}`,
        };
      }
    } catch (e) {
      console.warn("Could not fetch remote page image:", e);
    }
  }

  const match = /^data:([^;]+);base64,(.+)$/s.exec(input);
  if (!match) throw new Error("A page image was not a valid base64 or remote image URL.");
  return { mimeType: match[1]!, data: match[2]!, fullDataUrl: input };
}

async function transcribeViaGoogle(apiKey: string, model: string, dataUrl: string, hint?: string) {
  const { mimeType, data } = await prepareDataUrl(dataUrl);
  const primary = model.startsWith("models/") ? model : `models/${model}`;
  const candidateModels = Array.from(
    new Set([primary, "models/gemini-3.8-flash", "models/gemini-3.7-flash", "models/gemini-3.6-flash"]),
  );

  let lastErr: unknown = null;
  for (const m of candidateModels) {
    try {
      const response = await fetch(`${GOOGLE_ENDPOINT}/${m}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data } },
                { text: hint ? `${PAGE_PROMPT}\nContext: ${hint}` : PAGE_PROMPT },
              ],
            },
          ],
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            mediaResolution: "MEDIA_RESOLUTION_HIGH",
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastErr = new Error(`Google (${m}) returned ${response.status}. ${detail.slice(0, 200)}`);
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();
      if (text) return text;
      // If the candidate model stopped without text, it resolved the page as blank
      return "[Blank page / no handwriting detected]";
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("All Google vision models failed for this page.");
}

async function transcribeViaGateway(model: string, dataUrl: string, hint?: string) {
  const { fullDataUrl } = await prepareDataUrl(dataUrl);
  const result = await visionChat({
    model,
    systemPrompt: SYSTEM_PROMPT,
    prompt: hint ? `${PAGE_PROMPT}\nContext: ${hint}` : PAGE_PROMPT,
    imageDataUrls: [fullDataUrl],
    maxCompletionTokens: MAX_OUTPUT_TOKENS,
  });
  const text = result.text.trim();
  if (!text) return "[Blank page]";
  return text;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof AiGatewayError) return error.status === 429;
  const status = (error as { status?: number } | null)?.status;
  return status === 429;
}

/** Try every path for one page: admin vision key, then each gateway model with backoff. */
async function transcribePage(
  dataUrl: string,
  page: number,
  visionConfig: ProviderConfig | null,
  hint: string | undefined,
  usedModels: Set<string>,
): Promise<{ text: string | null; error: string | null }> {
  let lastError: unknown = null;

  if (visionConfig) {
    try {
      const text =
        visionConfig.provider === "google"
          ? await transcribeViaGoogle(
              visionConfig.apiKey,
              visionConfig.model || GOOGLE_MODEL,
              dataUrl,
              hint,
            )
          : (
              await visionChat({
                model: visionConfig.model,
                systemPrompt: SYSTEM_PROMPT,
                prompt: hint ? `${PAGE_PROMPT}\nContext: ${hint}` : PAGE_PROMPT,
                imageDataUrls: [dataUrl],
                maxCompletionTokens: MAX_OUTPUT_TOKENS,
                overrideProvider: visionConfig,
              })
            ).text.trim();
      if (!text) throw new Error(`${visionConfig.label} returned no text for this page.`);
      usedModels.add(`${visionConfig.provider}:${visionConfig.model}`);
      return { text, error: null };
    } catch (error) {
      lastError = error;
      console.error(`OCR page ${page}: admin vision key (${visionConfig.provider}) failed`, error);
    }
  }

  for (const model of GATEWAY_MODELS) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const text = await transcribeViaGateway(model, dataUrl, hint);
        usedModels.add(model);
        return { text, error: null };
      } catch (error) {
        lastError = error;
        console.error(`OCR page ${page}: ${model} attempt ${attempt} failed`, error);
        if (attempt < ATTEMPTS_PER_MODEL) {
          await sleep(backoffDelay(attempt, isRateLimitError(error)));
        }
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Every model failed to read this page.";
  return { text: null, error: message };
}

async function transcribeAll(
  pages: PageTranscription[],
  imageDataUrls: string[],
  pageIndexes: number[],
  visionConfig: ProviderConfig | null,
  hint: string | undefined,
  usedModels: Set<string>,
  concurrency: number,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, pageIndexes.length) }, async () => {
    while (cursor < pageIndexes.length) {
      const listIndex = cursor++;
      const pageIndex = pageIndexes[listIndex]!;
      const outcome = await transcribePage(
        imageDataUrls[pageIndex]!,
        pageIndex + 1,
        visionConfig,
        hint,
        usedModels,
      );
      pages[pageIndex]!.text = outcome.text;
      pages[pageIndex]!.error = outcome.error;
    }
  });
  await Promise.all(workers);
}

export async function transcribeWithGemini(
  imageDataUrls: string[],
  hint?: string,
): Promise<GeminiOcrOutcome> {
  const startedAt = Date.now();
  const visionConfig = await getVisionConfig();
  const usedModels = new Set<string>();
  const results: PageTranscription[] = imageDataUrls.map((_, index) => ({
    page: index + 1,
    text: null,
    error: null,
  }));

  const allIndexes = imageDataUrls.map((_, index) => index);
  await transcribeAll(
    results,
    imageDataUrls,
    allIndexes,
    visionConfig,
    hint,
    usedModels,
    CONCURRENCY,
  );

  // Second sweep: any page that failed the first pass gets one more full
  // life-cycle through every model, run with reduced concurrency so it isn't
  // competing against the rest of the batch for the same rate limits. This
  // is what turns "usually works" into "works every time" — most first-pass
  // failures are transient (a momentary 429 or network blip), not a page
  // that is genuinely unreadable.
  const stillFailed = results.filter((page) => !page.text).map((page) => page.page - 1);
  if (stillFailed.length > 0) {
    await transcribeAll(results, imageDataUrls, stillFailed, visionConfig, hint, usedModels, 1);
  }

  const failedPages = results.filter((page) => !page.text).map((page) => page.page);
  const pageErrors = Object.fromEntries(
    results.filter((page) => !page.text).map((page) => [page.page, page.error ?? "Unknown error"]),
  );
  const text = results
    .filter((page) => page.text)
    .map((page) => page.text!.trim())
    .join("\n\n");

  if (!text) {
    throw new Error(
      "No handwriting could be read from those pages. Try a brighter, straight-on photo of the full page.",
    );
  }

  return {
    text,
    pageTexts: results.map((page) => page.text),
    model: [...usedModels].join(", ") || GATEWAY_MODELS[0]!,
    pages: results.length,
    failedPages,
    pageErrors,
    latencyMs: Date.now() - startedAt,
  };
}
