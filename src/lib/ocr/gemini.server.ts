/**
 * Handwriting OCR. Resolution order: the admin-active VISION-purpose key
 * (Admin → AI providers → Vision) — Google is called directly via its own
 * REST API for the mediaResolution:HIGH legibility boost, any other vision
 * provider goes through the shared visionChat() adapter — then the
 * built-in Lovable AI gateway fallback chain, so transcription never dies
 * on config.
 */
import {
  AiGatewayError,
  visionChat,
  visionChatViaNvidia,
  resolveNvidiaVisionKeys,
  getAvailableKey,
  markKeyRateLimited,
  markKeyHealthy,
  keyCooldowns,
} from "../ai.server";
import {
  getActiveVisionProvider,
  getActiveProvider,
  buildOrderedKeyPool,
  getPrioritizedKeyOrder,
} from "../ai/active.server";
import type { ProviderConfig } from "../ai/active.server";

/**
 * Handwriting OCR. Vision is strictly routed through Google Gemini.
 */
const GOOGLE_MODEL = "models/gemini-3-flash-preview";
const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Model fallback chain through visionChat() (Google Gemini + OpenRouter vision fallback).
 */
const GATEWAY_MODELS = [
  "models/gemini-3-flash-preview",
  "models/gemini-flash-lite-latest",
  "models/gemini-3.1-flash-lite",
];
const ATTEMPTS_PER_MODEL = 2;
const CONCURRENCY = 3;
const MAX_OUTPUT_TOKENS = 16384; // dense pages with several diagram tags can run long

const SYSTEM_PROMPT = [
  "You are an expert OCR engine specialised in transcribing handwritten Cambridge Economics examination papers.",
  "Your PRIMARY and MOST CRITICAL task is to read and transcribe all handwritten English text on the page accurately into plain text.",
  "",
  "TRANSCRIPTION RULES:",
  "- Transcribe every handwritten sentence from top to bottom, exactly as written.",
  "- Preserve the student's original wording, spelling mistakes, punctuation, line breaks, and question numbering (e.g., '1(a)', 'Question 2'). Do not fix, rewrite, or polish the student's English.",
  "- Carefully examine letter shapes in context (e.g. distinguishing a vs o, n vs u, m vs n, l vs 1, e vs a). Use surrounding words for context when a letter is ambiguous. Only if a specific word is genuinely illegible after careful visual inspection, replace that single word with [?]. Never hallucinate or invent text.",
  "- Read every line meticulously — do not skip lines even if handwriting is light, faint, or small.",
  "- Lined notebook paper: Horizontal ruled lines, margins, headers, and underlines are standard features of student answer scripts. Do NOT confuse ruled notebook paper with a diagram.",
  "- Strikethroughs: If text is cleanly crossed out by the student, omit it and transcribe the final intended answer.",
  "- If handwriting is slanted, cursive, or cramped, take extra care to read each word individually before moving on.",
  "",
  "HAND-DRAWN ECONOMICS DIAGRAMS:",
  "- If and only if the student has drawn an actual economics diagram/graph (e.g. Demand and Supply, AD/AS, PPC, Monopoly, Lorenz Curve, Externalities):",
  "  insert an inline tag at that position: [DIAGRAM: <name> | axes: <labels or 'unlabelled'> | curves: <curves & shift directions> | labels: <equilibrium points/prices/quantities/areas> | accuracy: <short factual note on axis/shift accuracy>]",
  "- CRITICAL: Never replace or omit handwritten text because of a diagram. ALWAYS transcribe all written text before and after any diagram.",
  "",
  "OUTPUT REQUIREMENTS:",
  "- Output ONLY the transcribed English text and any inline [DIAGRAM: ...] tags.",
  "- Do not include any introductory remarks, commentary, apologies, or greetings (never output 'nothing visible' or 'Here is the transcription').",
  "- If this image genuinely has zero handwritten words or drawings, output '[Blank page]'.",
].join("\n");

const PAGE_PROMPT =
  "Transcribe ALL handwritten text on this page into plain text. Read every single line carefully and completely, word by word. Do not skip any lines.";

const MULTIMODAL_CORRECTION_SYSTEM_PROMPT = [
  "You are a Senior Cambridge 9708 Economics Dual-VLM OCR & Diagram Verification Specialist.",
  "You are given a student's handwritten exam page image AND a primary OCR draft.",
  "",
  "YOUR STRICT VERIFICATION RULES:",
  "1. VISUAL CORRECTION ONLY: Compare the draft line-by-line against the actual image.",
  "   - Resolve any '[?]' illegible markers by re-inspecting the visual letter strokes carefully.",
  "   - Fix ONLY genuine OCR misreads of economics terms/notation (e.g. 'RED'->'PED', 'URAS'/'LR4S'->'LRAS', 'M5C'->'MSC', 'PI/PZ'->'P1/P2', garbled 'AD=C+I+G+(X-M)').",
  "   - NEVER polish, rewrite, or fix the student's genuine spelling, grammar, or economic errors — preserve the student's authentic wording faithfully!",
  "   - Recover any skipped lines at the top, bottom, or margins if visible in the image.",
  "2. DIAGRAM VISUAL AUDIT: If the page contains any hand-drawn economics diagram:",
  "   - Inspect the exact drawn axes, curve labels, shift arrows (left vs right!), and equilibrium coordinates (P1, P2, Q1, Q2, E1, E2, shaded areas).",
  "   - Ensure the inline [DIAGRAM: <name> | axes: <...> | curves: <...> | labels: <...> | accuracy: <...>] tag accurately reports what is actually drawn — explicitly noting in 'accuracy:' if axes are unlabelled/swapped or if a curve shifts in the wrong direction.",
  "   - Do NOT invent a diagram on plain ruled notebook paper.",
  "3. OUTPUT: Return ONLY the verified plain-text transcription (with inline [DIAGRAM: ...] tags). Zero preamble or commentary.",
].join("\n");

/**
 * Returns true when a primary OCR transcription benefits from a second-VLM visual
 * verification pass (illegible `[?]` tokens, hand-drawn diagrams, suspected economics
 * OCR garbles, or unusually sparse reads).
 */
export function needsMultimodalCorrection(text: string): boolean {
  if (!text) return false;
  if (text.includes("[?]")) return true;
  if (/\[DIAGRAM:/i.test(text)) return true;
  // Classic handwriting OCR confusions on Cambridge Economics notation
  if (/\b(?:UR[A4]S|LR4S|SR4S|M[5S]C\/M[5S]B|P[1lI]D|Y[1lI]D|X[1lI]D|AD\s*=\s*C\s*\+\s*[1l]\b)/i.test(text)) {
    return true;
  }
  if (text.trim().length > 0 && text.trim().length < 140) return true;
  return false;
}

async function verifyAndCorrectPageWithNvidiaVL(
  dataUrl: string,
  primaryText: string,
  hint: string | undefined,
  usedModels: Set<string>,
): Promise<string> {
  if (!needsMultimodalCorrection(primaryText)) return primaryText;
  try {
    const nvKeys = await resolveNvidiaVisionKeys();
    if (nvKeys.length === 0) return primaryText;
    const { fullDataUrl } = await prepareDataUrl(dataUrl);
    const verified = await visionChatViaNvidia({
      systemPrompt: MULTIMODAL_CORRECTION_SYSTEM_PROMPT,
      prompt:
        `${hint ? `Context: ${hint}\n\n` : ""}` +
        `PRIMARY OCR DRAFT:\n"""\n${primaryText}\n"""\n\n` +
        `Inspect the image carefully, resolve any [?] markers or economics-term OCR misreads, visually verify the exact arrow direction and axes of any hand-drawn [DIAGRAM: ...] tag against the actual drawing, and output ONLY the verified transcription.`,
      imageDataUrls: [fullDataUrl],
      maxCompletionTokens: Math.min(8192, Math.max(2400, Math.ceil(primaryText.length * 1.6))),
      temperature: 0.0,
      enableThinking: true,
      timeoutMs: 28_000,
      keys: nvKeys,
    });
    const corrected = verified.text.trim();
    // Guard against truncated/hallucinated outputs: require non-blank and >= 65% of primary length
    if (
      corrected &&
      !isBlankOrUnread(corrected) &&
      corrected.length >= Math.floor(primaryText.trim().length * 0.65)
    ) {
      usedModels.add(`nvidia-verify:${verified.model}`);
      return corrected;
    }
  } catch (err) {
    console.warn("[ocr] NVIDIA Super VL 120B cross-verification skipped gracefully:", err);
  }
  return primaryText;
}

export function isBlankOrUnread(text: string | null | undefined): boolean {
  if (!text) return true;
  const cleaned = text.trim();
  if (!cleaned) return true;
  if (/^\[blank page.*\]$/i.test(cleaned)) return true;
  if (
    /^(nothing visible|no handwriting( (detected|found|visible))?|no text (found|detected|visible)|unreadable page|blank)\.?$/i.test(
      cleaned,
    )
  )
    return true;
  if (/^\[diagram:[^\]]*accuracy:\s*(nothing visible|unlabelled|none)[^\]]*\]$/i.test(cleaned))
    return true;
  return false;
}

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
    const vision = await getActiveVisionProvider();
    if (vision) {
      const { allOrderedKeys } = buildOrderedKeyPool(vision);
      if (allOrderedKeys.length > 0) return vision;
    }
    const chat = await getActiveProvider();
    if (chat && chat.provider === "google") {
      return {
        ...chat,
        model: vision?.model || "gemini-3.8-flash",
      };
    }
    return vision ?? chat;
  } catch {
    return null;
  }
}

async function prepareDataUrl(input: string): Promise<{ mimeType: string; data: string; fullDataUrl: string }> {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetch(trimmed);
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

  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/s.exec(trimmed);
  if (!match) throw new Error("A page image was not a valid base64 or remote image URL.");
  const cleanData = match[2]!.replace(/\s+/g, "");
  return { mimeType: match[1]!, data: cleanData, fullDataUrl: `data:${match[1]};base64,${cleanData}` };
}

async function transcribeViaGoogle(
  apiKeyInput: string | string[],
  model: string,
  dataUrl: string,
  hint?: string,
) {
  const { mimeType, data } = await prepareDataUrl(dataUrl);
  const candidateModels = Array.from(
    new Set(
      [
        model ? (model.startsWith("models/") ? model : `models/${model}`) : null,
        "models/gemini-3-flash-preview",
        "models/gemini-flash-lite-latest",
        "models/gemini-3.8-flash",
        "models/gemini-3.1-flash-lite",
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
      ].filter(Boolean) as string[],
    ),
  );

  const rawKeys = Array.isArray(apiKeyInput) ? apiKeyInput : [apiKeyInput];
  // Preserves exact prioritized order: healthy free keys first, cooled free keys second, emergency paid keys strictly last
  const keysToTry = Array.from(new Set(rawKeys.filter((k) => k && k.length > 5)));

  let lastErr: unknown = null;
  for (const m of candidateModels) {
    for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
      const currentKey = keysToTry[kIdx]!;
      try {
        const genConfig: Record<string, unknown> = {
          temperature: 0.1,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        };
        if (m.includes("1.5-pro")) {
          genConfig.mediaResolution = "MEDIA_RESOLUTION_HIGH";
        }

        const response = await fetch(`${GOOGLE_ENDPOINT}/${m}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": currentKey },
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
            generationConfig: genConfig,
          }),
          signal: AbortSignal.timeout(40_000),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          lastErr = new Error(`Google (${m}) returned ${response.status}. ${detail.slice(0, 200)}`);
          const isQuotaOrAuth =
            response.status === 429 ||
            response.status === 503 ||
            response.status === 402 ||
            response.status === 401 ||
            response.status === 403;
          if (isQuotaOrAuth) {
            markKeyRateLimited(currentKey, response.status === 429 || response.status === 503 ? 180_000 : 600_000);
            console.warn(
              `[transcribeViaGoogle] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
            );
            if (kIdx + 1 < keysToTry.length) continue;
          }
          if (response.status === 404) {
            break; // Model not available, try next candidate model
          }
          continue;
        }

        markKeyHealthy(currentKey);
        const payload = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
        };
        const text = (payload.candidates?.[0]?.content?.parts ?? [])
          .filter((part) => !part.thought)
          .map((part) => part.text ?? "")
          .join("")
          .trim();
        if (text && !isBlankOrUnread(text)) return text;
        lastErr = new Error(`Google (${m}) returned empty or unreadable handwriting output.`);
      } catch (err: any) {
        lastErr = err;
        const isTimeout =
          err?.name === "AbortError" ||
          err?.name === "TimeoutError" ||
          err?.message?.includes("timed out") ||
          err?.message?.includes("aborted");
        if (isTimeout) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[transcribeViaGoogle] Key ...${currentKey.slice(-4)} timed out (>30s). Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
        }
      }
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
  if (isBlankOrUnread(text)) {
    throw new Error(`Model ${model} found no legible handwriting on this page.`);
  }
  return text;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof AiGatewayError) return error.status === 429;
  const status = (error as { status?: number } | null)?.status;
  return status === 429;
}

/** Try NVIDIA NIM Super VL 120B first (ZERO Google Gemini), then non-Gemini visionConfig/gateway fallback; deep-verify uncertain/diagram pages with thinking pass. */
async function transcribePage(
  dataUrl: string,
  page: number,
  visionConfig: ProviderConfig | null,
  hint: string | undefined,
  usedModels: Set<string>,
): Promise<{ text: string | null; error: string | null }> {
  let lastError: unknown = null;

  // 1. Primary: Direct NVIDIA NIM Super VL 120B (fast, reliable, 0% Google Gemini)
  try {
    const nvKeys = await resolveNvidiaVisionKeys();
    if (nvKeys.length > 0) {
      const { fullDataUrl } = await prepareDataUrl(dataUrl);
      const nvOutcome = await visionChatViaNvidia({
        systemPrompt: SYSTEM_PROMPT,
        prompt: hint ? `${PAGE_PROMPT}\nContext: ${hint}` : PAGE_PROMPT,
        imageDataUrls: [fullDataUrl],
        maxCompletionTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.1,
        enableThinking: false,
        timeoutMs: 30_000,
        keys: nvKeys,
      });
      const nvText = nvOutcome.text.trim();
      if (nvText && !isBlankOrUnread(nvText)) {
        usedModels.add(`nvidia:${nvOutcome.model}`);
        // Run Pass 2 Deep Visual Verification (thinking enabled) when [?] tokens, diagrams, or OCR garbles are present
        const verifiedText = await verifyAndCorrectPageWithNvidiaVL(dataUrl, nvText, hint, usedModels);
        return { text: verifiedText, error: null };
      }
    }
  } catch (nvErr) {
    lastError = nvErr;
    console.warn(`OCR page ${page}: NVIDIA Super VL 120B primary pass failed`, nvErr);
  }

  // 2. Non-Google configured vision override (e.g. OpenRouter / Mistral / OpenAI / Anthropic)
  if (visionConfig && visionConfig.provider !== "google" && visionConfig.provider !== "gemini") {
    try {
      const rawText = (
        await visionChat({
          model: visionConfig.model,
          systemPrompt: SYSTEM_PROMPT,
          prompt: hint ? `${PAGE_PROMPT}\nContext: ${hint}` : PAGE_PROMPT,
          imageDataUrls: [dataUrl],
          maxCompletionTokens: MAX_OUTPUT_TOKENS,
          overrideProvider: visionConfig,
        })
      ).text.trim();
      if (!rawText || isBlankOrUnread(rawText)) throw new Error(`${visionConfig.label} returned no legible handwriting.`);
      usedModels.add(`${visionConfig.provider}:${visionConfig.model}`);
      const verifiedText = await verifyAndCorrectPageWithNvidiaVL(dataUrl, rawText, hint, usedModels);
      return { text: verifiedText, error: null };
    } catch (error) {
      lastError = error;
      console.error(`OCR page ${page}: vision key (${visionConfig.provider}) failed`, error);
    }
  }

  // 3. Final non-Gemini visionChat fallback (NVIDIA / OpenRouter)
  for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
    try {
      const rawText = await transcribeViaGateway("nvidia/nemotron-3.5-super-vl-120b-a12b", dataUrl, hint);
      usedModels.add("nvidia/nemotron-3.5-super-vl-120b-a12b");
      return { text: rawText, error: null };
    } catch (error) {
      lastError = error;
      console.error(`OCR page ${page}: fallback attempt ${attempt} failed`, error);
      if (attempt < ATTEMPTS_PER_MODEL) {
        await sleep(backoffDelay(attempt, isRateLimitError(error)));
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Every vision model failed to read this page.";
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
  const stillFailed = results.filter((page) => !page.text || isBlankOrUnread(page.text)).map((page) => page.page - 1);
  if (stillFailed.length > 0) {
    await transcribeAll(results, imageDataUrls, stillFailed, visionConfig, hint, usedModels, 1);
  }

  const successfulResults = results.filter((page) => page.text && !isBlankOrUnread(page.text));
  const failedPages = results.filter((page) => !page.text || isBlankOrUnread(page.text)).map((page) => page.page);
  const pageErrors = Object.fromEntries(
    results
      .filter((page) => !page.text || isBlankOrUnread(page.text))
      .map((page) => [page.page, page.error ?? "No legible handwriting detected. Try a brighter, upright photo."]),
  );

  const text = successfulResults
    .map((page) => page.text!.trim())
    .join("\n\n");

  if (!text || successfulResults.length === 0) {
    throw new Error(
      "No legible handwriting could be read from the uploaded image(s). Please make sure the photo is upright, well-lit, and in focus.",
    );
  }

  return {
    text,
    pageTexts: results.map((page) => (page.text && !isBlankOrUnread(page.text) ? page.text : null)),
    model: [...usedModels].join(", ") || GATEWAY_MODELS[0]!,
    pages: results.length,
    failedPages,
    pageErrors,
    latencyMs: Date.now() - startedAt,
  };
}
