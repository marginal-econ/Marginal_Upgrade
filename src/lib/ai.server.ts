// Server-only Lovable AI Gateway client. Gemini stays the primary LLM.
// LOVABLE_API_KEY must never reach the browser.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

import type { AiGatewayMode, ProviderConfig } from "./ai/active.server";
import {
  getActiveEmbeddingProvider,
  getActiveProvider,
  getActiveVisionProvider,
  getAiGatewaySettings,
} from "./ai/active.server";
import { readEnv } from "../server/env";
import { EMBEDDING_DIMS } from "./examiner/config";

/** The cheap/fast model every call is swapped to in "max savings" mode. Kept
 *  as a literal here (matches MODEL_FAST in examiner/config.ts) rather than
 *  imported, so ai.server.ts's one central gateway function never depends on
 *  a feature-specific config module. */
const ECONOMY_MODEL = "google/gemini-3.6-flash";
/** Token ceilings applied by the non-"max" modes — a real lever on cost,
 *  independent of which model ends up handling the call. */
const BALANCED_TOKEN_CAP = 2000;
const ECONOMY_TOKEN_CAP = 1100;

/**
 * Applies the admin's global AI mode to one call's options, BEFORE it
 * reaches either the built-in gateway or a bring-your-own-key provider —
 * this is the single place credit-saving behaviour lives, so every feature
 * (essay grading, Live Examiner, MCQ tagging, diagrams…) gets it for free
 * just by calling chat().
 *   max      — no change, full quality.
 *   balanced — same model, but replies are capped shorter.
 *   economy  — every call forced onto the cheap/fast model, replies capped
 *              hardest. Quality/accuracy trade-off is real and deliberate.
 */
function applyAiGatewayMode(options: ChatOptions, mode: AiGatewayMode): ChatOptions {
  if (mode === "max") return options;
  if (mode === "balanced") {
    return {
      ...options,
      maxCompletionTokens: options.maxCompletionTokens
        ? Math.min(options.maxCompletionTokens, BALANCED_TOKEN_CAP)
        : BALANCED_TOKEN_CAP,
    };
  }
  return {
    ...options,
    model: ECONOMY_MODEL,
    maxCompletionTokens: options.maxCompletionTokens
      ? Math.min(options.maxCompletionTokens, ECONOMY_TOKEN_CAP)
      : ECONOMY_TOKEN_CAP,
    reasoningEffort: "none",
  };
}

export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiGatewayError";
  }
}

function apiKey(): string {
  const key = readEnv("LOVABLE_API_KEY");
  if (!key) throw new AiGatewayError("AI is not configured on this server.", 500);
  return key;
}

/** Maps gateway failures onto messages that are safe and useful in the UI. */
function explain(status: number, body: string): string {
  if (status === 429) return "The AI is rate limited right now. Please try again in a moment.";
  if (status === 402)
    return "AI credits have run out. An admin can add credits, or plug in their own provider key (Claude, Gemini, Grok, OpenAI…) under Admin → AI providers.";
  if (status === 401)
    return "The configured AI provider rejected the API key. An admin can update it under Admin → AI providers.";
  if (status === 403) return "AI access is disabled for this workspace.";
  return `The AI request failed (${status}). ${body.slice(0, 300)}`;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  json?: boolean;
  maxCompletionTokens?: number;
  /** GPT-5 family: must be sent explicitly, and "none" keeps marking fast. */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** Bypass the stored override (used by the admin "test key" action). */
  overrideProvider?: ProviderConfig | null;
};

export type ChatResult = {
  text: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
};

/**
 * Retries specific to the interactive `chat()` path (full essay grading,
 * the live examiner check, etc). Previously ONLY the embeddings path
 * (`withRetry429` below) retried on 429 — `chat()` threw immediately, so a
 * momentary rate limit surfaced straight to the user as "the AI is rate
 * limited, try again" and, for the live examiner specifically, as a check
 * that silently stopped updating. Fewer, faster retries than embeddings
 * (which run in large offline batches and can afford to wait): this path
 * is interactive, so it backs off quickly and gives up sooner rather than
 * making a keystroke-triggered check hang.
 */
const CHAT_RETRY_OPTS = { maxRetries: 3, baseMs: 400 };

/**
 * Every path that reaches the AI (built-in gateway or a bring-your-own-key
 * provider) funnels through this one function — which is exactly what
 * makes the admin's site-wide pause switch and credit-saving mode work
 * everywhere at once instead of needing to be wired into each feature
 * separately. Order matters: the pause check happens before ANY network
 * call, so a paused admin console genuinely stops outbound AI traffic, not
 * just the UI that surfaces it.
 */
export async function chat(rawOptions: ChatOptions): Promise<ChatResult> {
  const started = Date.now();

  const gateway = await getAiGatewaySettings();
  if (!gateway.enabled) {
    throw new AiGatewayError(
      "AI features are temporarily paused by an admin (to save credits). Please try again shortly, or check with your teacher/admin.",
      503,
    );
  }
  const options = applyAiGatewayMode(rawOptions, gateway.mode);

  const override =
    options.overrideProvider !== undefined ? options.overrideProvider : await getActiveProvider();

  if (override) {
    // chatViaProvider retries its own fetch internally (see below) — don't
    // wrap it again here, or a real rate limit waits through two nested
    // backoff sequences instead of one.
    const result = await chatViaProvider(override, options);
    return { ...result, latencyMs: Date.now() - started };
  }

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
  };
  if (typeof options.temperature === "number") body.temperature = options.temperature;
  if (options.json) body.response_format = { type: "json_object" };
  if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;
  if (options.model.startsWith("openai/gpt-5")) {
    body.reasoning_effort = options.reasoningEffort ?? "none";
    // GPT-5 models reject a non-default temperature on chat completions.
    delete body.temperature;
  }

  const data = await withRetry429(async () => {
    let response = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey(),
      },
      body: JSON.stringify(body),
    });

    if (
      !response.ok &&
      (response.status === 400 || response.status === 404) &&
      body.model !== ECONOMY_MODEL
    ) {
      const errText = await response.text();
      if (
        errText.toLowerCase().includes("model") ||
        errText.toLowerCase().includes("not found") ||
        errText.toLowerCase().includes("invalid") ||
        errText.toLowerCase().includes("unsupported")
      ) {
        body.model = ECONOMY_MODEL;
        response = await fetch(`${GATEWAY}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey(),
          },
          body: JSON.stringify(body),
        });
      } else {
        throw new AiGatewayError(explain(response.status, errText), response.status);
      }
    }

    if (!response.ok) {
      throw new AiGatewayError(explain(response.status, await response.text()), response.status);
    }

    return (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
  }, CHAT_RETRY_OPTS);

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: options.model,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - started,
  };
}

/**
 * Bring-your-own-key path. Anthropic has its own request shape; every other
 * supported provider accepts the OpenAI chat-completions body.
 */
async function chatViaProvider(
  config: ProviderConfig,
  options: ChatOptions,
): Promise<Omit<ChatResult, "latencyMs">> {
  if (config.provider === "anthropic") {
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const data = await withRetry429(async () => {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: options.maxCompletionTokens ?? 8000,
          ...(system ? { system } : {}),
          ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
          messages: options.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new AiGatewayError(explain(response.status, await response.text()), response.status);
      }

      return (await response.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
    }, CHAT_RETRY_OPTS);
    return {
      text: (data.content ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join(""),
      model: config.model,
      promptTokens: data.usage?.input_tokens ?? null,
      completionTokens: data.usage?.output_tokens ?? null,
    };
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
  };
  if (typeof options.temperature === "number" && !/^gpt-5/.test(config.model)) {
    body.temperature = options.temperature;
  }
  // OpenRouter models with reasoning capability default to whatever depth
  // OpenRouter/the upstream host picks (often "medium"), which is a real
  // source of run-to-run variance independent of temperature — a model's
  // internal reasoning trace isn't pinned by temperature the way its final
  // token sampling is. Capping at "low" (not "none") is deliberate: some
  // models mark reasoning mandatory and reject "none" outright with a 400,
  // but "low" is accepted broadly and still meaningfully cuts the variance.
  // Providers/models that don't support reasoning at all just ignore an
  // unknown field, per OpenRouter's own normalisation — this is safe to
  // send unconditionally for every OpenRouter request.
  if (config.provider === "openrouter") {
    body.reasoning = { effort: "low" };
  }
  if (options.json) body.response_format = { type: "json_object" };
  if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

  const candidateModels =
    config.provider === "google"
      ? Array.from(
          new Set([
            config.model.replace(/^(google\/|models\/)/, ""),
            "gemini-3.8-flash",
            "gemini-3.6-flash",
            "gemini-3.7-flash",
          ]),
        )
      : [config.model];

  let usedModel = candidateModels[0];
  const data = await withRetry429(async () => {
    let lastErrStatus = 500;
    let lastErrDetail = "";

    for (const m of candidateModels) {
      usedModel = m;
      const modelBody = { ...body, model: m };
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(modelBody),
      });

      if (response.ok) {
        return (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
      }

      const text = await response.text();
      lastErrStatus = response.status;
      lastErrDetail = text;

      // Rate limit or server error on this specific model — try next candidate model
      if (response.status === 429 || response.status === 503) {
        console.warn(`[chatViaProvider] Model ${m} returned ${response.status}. Attempting fallback candidate model...`);
        continue;
      }

      // Any other client error (e.g. 401 unauthorized, 400 bad request) fails immediately
      throw new AiGatewayError(explain(response.status, text), response.status);
    }

    // If all models failed with 429/503, throw so withRetry429 can backoff if 429
    throw new AiGatewayError(explain(lastErrStatus, lastErrDetail), lastErrStatus);
  }, CHAT_RETRY_OPTS);

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: usedModel,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
  };
}

/** Streaming chat used by the AI tutor. Yields text deltas. */
export async function streamChat(options: ChatOptions): Promise<Response> {
  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new AiGatewayError(explain(response.status, await response.text()), response.status);
  }
  return response;
}

const EMBED_BATCH_LIMIT = 100; // Google/OpenRouter embedding endpoints reject larger batches.
const EMBED_MAX_RETRIES = 6;
const EMBED_RETRY_BASE_MS = 1000;

const GOOGLE_EMBED_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_EMBED_MODEL = "models/gemini-embedding-001";

/**
 * Runs `attempt`, retrying with exponential backoff + jitter only on 429s —
 * embedding providers' free/shared tiers throttle per-minute during a big
 * upload, and the interactive chat gateway throttles per-second under
 * concurrent load (e.g. several live examiner checks in flight at once).
 * Any other error (bad key, quota fully exhausted, network failure)
 * surfaces immediately rather than burning retries on something backoff
 * can't fix. `opts` lets a fast, interactive caller (chat) use fewer,
 * shorter retries than a background batch job (embeddings) — see
 * `CHAT_RETRY_OPTS` above.
 */
async function withRetry429<T>(
  attempt: () => Promise<T>,
  opts: { maxRetries: number; baseMs: number } = {
    maxRetries: EMBED_MAX_RETRIES,
    baseMs: EMBED_RETRY_BASE_MS,
  },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= opts.maxRetries; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const status = error instanceof AiGatewayError ? error.status : null;
      if (status !== 429 || i === opts.maxRetries) throw error;
      const delay = opts.baseMs * 2 ** i + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/** Direct call to Google's embeddings API — no Lovable gateway involved. */
async function embedViaGoogle(
  inputs: string[],
  apiKeyValue: string,
  model: string,
  outputDimensionality: number,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const googleModel = model.startsWith("models/") ? model : GOOGLE_EMBED_MODEL;

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const data = await withRetry429(async () => {
      const response = await fetch(`${GOOGLE_EMBED_ENDPOINT}/${googleModel}:batchEmbedContents`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKeyValue },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: googleModel,
            content: { parts: [{ text }] },
            outputDimensionality,
          })),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AiGatewayError(
          `Google embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
          response.status,
        );
      }

      return (await response.json()) as { embeddings?: { values: number[] }[] };
    });

    (data.embeddings ?? []).forEach((item, i) => {
      vectors[offset + i] = item.values;
    });
  }

  return vectors;
}

/**
 * Direct call to any OpenAI-compatible /embeddings endpoint — covers
 * OpenAI, OpenRouter, Mistral, DeepSeek, and custom self-hosted endpoints.
 * (Anthropic, xAI and Groq don't expose an embeddings endpoint, so those
 * providers are excluded from the embedding-purpose picker in the console.)
 */
async function embedViaOpenAiCompatible(
  inputs: string[],
  config: ProviderConfig,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const data = await withRetry429(async () => {
      // OpenAI's text-embedding-3-* family (and OpenAI-compatible endpoints
      // that mirror it, e.g. OpenRouter) natively return more than
      // EMBEDDING_DIMS — 3072 for -large, 1536 for -small. Without this the
      // vector comes back a different size than document_chunks.embedding
      // is declared as and pgvector rejects the insert outright. Sending
      // `dimensions` truncates it at the API side to the size the column
      // actually is. Endpoints that don't support the param (Mistral,
      // Nemotron, most custom ones) ignore an unknown field rather than
      // erroring, and models already fixed at EMBEDDING_DIMS are unaffected.
      const supportsDimensionsParam =
        config.provider === "openai" || config.provider === "openrouter";
      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          input: batch,
          ...(supportsDimensionsParam ? { dimensions: EMBEDDING_DIMS } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AiGatewayError(
          `${config.label || config.provider} embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
          response.status,
        );
      }

      return (await response.json()) as { data?: { index: number; embedding: number[] }[] };
    });

    for (const item of data.data ?? []) {
      vectors[offset + item.index] = item.embedding;
    }
  }

  return vectors;
}

async function embedViaConfig(inputs: string[], config: ProviderConfig): Promise<number[][]> {
  if (config.provider === "google") {
    return embedViaGoogle(inputs, config.apiKey, config.model, EMBEDDING_DIMS);
  }
  return embedViaOpenAiCompatible(inputs, config);
}

/**
 * Embed a list of texts. Splits into provider-safe batches and reassembles
 * by index so every input gets a vector — nothing is silently dropped.
 *
 * Resolution order:
 * 1. `overrideProvider`, if passed explicitly — this is what lets a single
 *    ingestion/grading call pick a specific saved embedding key rather than
 *    always using whichever one is flagged active (Admin → Embeddings).
 * 2. The admin-flagged active embedding-purpose provider.
 * 3. The Lovable gateway, only if a LOVABLE_API_KEY is actually present.
 *
 * Note switching providers is a same-size, not same-space, change — a chunk
 * embedded via Google and one via OpenRouter aren't in the same embedding
 * space, so a mixed-provider knowledge base should be re-embedded under one
 * provider before it's trusted for retrieval.
 */
export async function embed(
  inputs: string[],
  model: string,
  overrideProvider?: ProviderConfig | null,
): Promise<number[][]> {
  const config =
    overrideProvider !== undefined ? overrideProvider : await getActiveEmbeddingProvider();

  if (config) {
    return embedViaConfig(inputs, config);
  }

  if (!readEnv("LOVABLE_API_KEY")) {
    throw new AiGatewayError(
      "No embedding provider is configured. Add one under Admin → Embeddings and mark it active.",
      500,
    );
  }

  const vectors: number[][] = new Array(inputs.length);

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const response = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey(),
      },
      body: JSON.stringify({ model, input: batch }),
    });

    if (!response.ok) {
      throw new AiGatewayError(explain(response.status, await response.text()), response.status);
    }

    const data = (await response.json()) as {
      data?: { index: number; embedding: number[] }[];
    };
    for (const item of data.data ?? []) {
      vectors[offset + item.index] = item.embedding;
    }
  }

  return vectors;
}

export async function embedOne(
  input: string,
  model: string,
  overrideProvider?: ProviderConfig | null,
): Promise<number[]> {
  const [vector] = await embed([input], model, overrideProvider);
  if (!vector) throw new AiGatewayError("The AI returned no embedding.", 500);
  return vector;
}

function splitImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AiGatewayError("A page image was not a valid base64 image.", 400);
  return { mimeType: match[1]!, data: match[2]! };
}

/** Anthropic's image-block shape differs from the OpenAI image_url shape. */
async function visionChatViaAnthropic(
  config: ProviderConfig,
  options: {
    model: string;
    systemPrompt: string;
    prompt: string;
    imageDataUrls: string[];
    maxCompletionTokens?: number;
  },
): Promise<Omit<ChatResult, "latencyMs">> {
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options.maxCompletionTokens ?? 8000,
      system: options.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            ...options.imageDataUrls.map((url) => {
              const { mimeType, data } = splitImageDataUrl(url);
              return {
                type: "image" as const,
                source: { type: "base64" as const, media_type: mimeType, data },
              };
            }),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new AiGatewayError(explain(response.status, await response.text()), response.status);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    text: (data.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join(""),
    model: config.model,
    promptTokens: data.usage?.input_tokens ?? null,
    completionTokens: data.usage?.output_tokens ?? null,
  };
}

/** Every non-Anthropic provider in AI_PROVIDERS speaks the OpenAI image_url shape. */
async function visionChatViaOpenAiCompatible(
  config: ProviderConfig,
  options: {
    model: string;
    systemPrompt: string;
    prompt: string;
    imageDataUrls: string[];
    maxCompletionTokens?: number;
  },
): Promise<Omit<ChatResult, "latencyMs">> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: options.systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          ...options.imageDataUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url, detail: "high" as const },
          })),
        ],
      },
    ],
  };
  if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AiGatewayError(explain(response.status, await response.text()), response.status);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: config.model,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
  };
}

/**
 * Multimodal read of one or more page images (scans/photos of handwriting,
 * or photographed/scanned past-paper pages for MCQ/essay bank extraction).
 *
 * Provider resolution order (each step only runs if the previous one is
 * unset):
 *   1. `overrideProvider`, if the caller passed one explicitly (admin
 *      "test key" action, or a call that wants a specific saved key).
 *   2. The admin-configured active VISION provider (Admin → AI providers →
 *      Vision) — a key saved and activated specifically for image reads,
 *      independent of what marks essays or embeds the knowledge base.
 *   3. The admin-configured active CHAT provider, for back-compatibility
 *      with setups that only ever configured one BYOK key and expect it to
 *      cover everything (and because many chat-capable models are also
 *      vision-capable).
 *   4. The built-in Lovable AI gateway, if LOVABLE_API_KEY is present.
 * Otherwise this fails loudly with a clear, actionable message instead of
 * a silent 500.
 */
export async function visionChat(options: {
  model: string;
  systemPrompt: string;
  prompt: string;
  imageDataUrls: string[];
  maxCompletionTokens?: number;
  /** Bypass the stored override, same convention as chat(). */
  overrideProvider?: ProviderConfig | null;
}): Promise<ChatResult> {
  const started = Date.now();
  const override =
    options.overrideProvider !== undefined
      ? options.overrideProvider
      : ((await getActiveVisionProvider()) ?? (await getActiveProvider()));

  if (override) {
    const result =
      override.provider === "anthropic"
        ? await visionChatViaAnthropic(override, options)
        : await visionChatViaOpenAiCompatible(override, options);
    return { ...result, latencyMs: Date.now() - started };
  }

  if (!readEnv("LOVABLE_API_KEY")) {
    throw new AiGatewayError(
      "No AI provider is configured for handwriting/vision. Add a provider key that supports vision (Anthropic, OpenAI, or Google) under Admin → AI providers and mark it active.",
      500,
    );
  }

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [
      { role: "system", content: options.systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          // "detail: high" tells the underlying vision model to spend more
          // tokens on this image instead of a downsampled thumbnail — the
          // OpenAI-compatible lever for image fidelity, matters a lot for
          // reading small/faint handwriting.
          ...options.imageDataUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url, detail: "high" as const },
          })),
        ],
      },
    ],
  };
  if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

  let response = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify(body),
  });

  if (
    !response.ok &&
    (response.status === 400 || response.status === 404) &&
    body.model !== ECONOMY_MODEL
  ) {
    const errText = await response.text();
    if (
      errText.toLowerCase().includes("model") ||
      errText.toLowerCase().includes("not found") ||
      errText.toLowerCase().includes("invalid") ||
      errText.toLowerCase().includes("unsupported")
    ) {
      body.model = ECONOMY_MODEL;
      response = await fetch(`${GATEWAY}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey(),
        },
        body: JSON.stringify(body),
      });
    } else {
      throw new AiGatewayError(explain(response.status, errText), response.status);
    }
  }

  if (!response.ok) {
    throw new AiGatewayError(explain(response.status, await response.text()), response.status);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: options.model,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - started,
  };
}
