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
const ECONOMY_MODEL = "google/gemini-3.8-flash";
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
  /**
   * When true (budget tiers <= 199: free, foundation, scholar_plus), enables
   * dynamic key rotation across the configured pool and graceful fallback to Flash models.
   * High-tier users (> 199, school, teacher, admin) retain dedicated keys and premium models without degradation.
   */
  isBudgetTier?: boolean;
};

export type ChatResult = {
  text: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  /** True when a rate-limit or failover caused the request to jump to a backup/extra key */
  keyRotated?: boolean;
  /** True when all keys failed on the primary model and degraded to a fallback model */
  modelSwapped?: boolean;
  /** Specific type of key that successfully resolved the call */
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
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
 * In-memory cooldown registry for provider keys in a rotation pool.
 * If a key returns 429 (rate limit) or 503 (model busy), it is temporarily
 * cooled down (default 60s) so subsequent requests immediately use an active key.
 */
export const keyCooldowns = new Map<string, number>();

export function getAvailableKey(keys: string[]): string {
  if (!keys || keys.length === 0) return "";
  const now = Date.now();
  for (const k of keys) {
    const cd = keyCooldowns.get(k) ?? 0;
    if (now >= cd) return k;
  }
  return keys.reduce((earliest, k) => {
    const cd = keyCooldowns.get(k) ?? 0;
    const earliestCd = keyCooldowns.get(earliest) ?? 0;
    return cd < earliestCd ? k : earliest;
  }, keys[0]!);
}

export function markKeyRateLimited(key: string, cooldownMs = 60_000) {
  keyCooldowns.set(key, Date.now() + cooldownMs);
}

export function markKeyHealthy(key: string) {
  keyCooldowns.delete(key);
}

/**
 * Bring-your-own-key path. Anthropic has its own request shape; every other
 * supported provider accepts the OpenAI chat-completions body.
 */
async function chatViaProvider(
  config: ProviderConfig,
  options: ChatOptions,
): Promise<Omit<ChatResult, "latencyMs">> {
  const isBudget = options.isBudgetTier === true;
  let purePoolKeysCount = 0;

  let activeKeysToTry: string[] = [];
  if (isBudget) {
    // Budget tier (<= 199: 0, 99, 199):
    // 1. Try all priority pool keys in configured priority order (Priority 1, 2, 3...)
    // 2. If all priority keys hit rate limits (429/503), seamlessly use the VIP access keys as last resort!
    const pool =
      config.budgetPoolKeys && config.budgetPoolKeys.length > 0
        ? config.budgetPoolKeys
        : config.apiKeys && config.apiKeys.length > 0
          ? config.apiKeys
          : [config.apiKey];

    const vipKeys = [config.paidPrimaryKey, config.paidSecondaryKey].filter(
      (k): k is string => Boolean(k && k.length > 5),
    );

    // Keep pool keys distinct from VIP keys so VIP keys are strictly tried at the end
    const purePoolKeys = pool.filter((k) => !vipKeys.includes(k));
    const poolKeysToOrder = purePoolKeys.length > 0 ? purePoolKeys : pool;
    purePoolKeysCount = purePoolKeys.length;

    // Filter available (not in cooldown) pool keys preserving their priority order,
    // followed by cooled-down pool keys (in priority order)
    const now = Date.now();
    const availablePoolKeys = poolKeysToOrder.filter((k) => (keyCooldowns.get(k) ?? 0) <= now);
    const cooledPoolKeys = poolKeysToOrder.filter((k) => (keyCooldowns.get(k) ?? 0) > now);
    const orderedPoolKeys = [...availablePoolKeys, ...cooledPoolKeys];

    // Append VIP keys as last resort (avoiding duplicates if any were already in the pool)
    const fallbackVipKeys = vipKeys.filter((k) => !orderedPoolKeys.includes(k));

    activeKeysToTry = [...orderedPoolKeys, ...fallbackVipKeys];
  } else {
    // High-tier users (> 199, school, teacher, admin):
    // Dedicated Primary Paid Key first. If it ever hits 429/503, fails over to Secondary Paid Key,
    // and if still exhausted or empty, seamlessly falls back across all available Priority Pool keys!
    const paidKeys = [config.paidPrimaryKey, config.paidSecondaryKey].filter(
      (k): k is string => Boolean(k && k.length > 5),
    );
    const pool =
      config.apiKeys && config.apiKeys.length > 0
        ? config.apiKeys
        : config.budgetPoolKeys && config.budgetPoolKeys.length > 0
          ? config.budgetPoolKeys
          : [config.apiKey];
    const nonPaidPool = pool.filter((k) => !paidKeys.includes(k));
    activeKeysToTry = [...paidKeys, ...nonPaidPool];
    if (activeKeysToTry.length === 0) activeKeysToTry = [config.apiKey];
  }

  if (config.provider === "anthropic") {
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    let successfulAnthropicKeyIdx = 0;
    const data = await withRetry429(async () => {
      let lastErrStatus = 500;
      let lastErrDetail = "";
      for (let kIdx = 0; kIdx < activeKeysToTry.length; kIdx++) {
        const currentKey = activeKeysToTry[kIdx]!;
        const response = await fetch(`${config.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": currentKey,
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

        if (response.ok) {
          markKeyHealthy(currentKey);
          successfulAnthropicKeyIdx = kIdx;
          return (await response.json()) as {
            content?: { type: string; text?: string }[];
            usage?: { input_tokens?: number; output_tokens?: number };
          };
        }

        const text = await response.text();
        lastErrStatus = response.status;
        lastErrDetail = text;
        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(`[chatViaProvider:anthropic] Key returned ${response.status}. Rotating key...`);
          if (kIdx + 1 < activeKeysToTry.length) continue;
        }
        throw new AiGatewayError(explain(response.status, text), response.status);
      }
      throw new AiGatewayError(explain(lastErrStatus, lastErrDetail), lastErrStatus);
    }, CHAT_RETRY_OPTS);

    const isVipFallback = isBudget && successfulAnthropicKeyIdx >= (purePoolKeysCount > 0 ? purePoolKeysCount : activeKeysToTry.length);
    const isRotated = successfulAnthropicKeyIdx > 0;
    const activeKeyType: "primary" | "backup_pool" | "vip_fallback" = isVipFallback
      ? "vip_fallback"
      : isRotated
        ? "backup_pool"
        : "primary";

    return {
      text: (data.content ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join(""),
      model: config.model,
      promptTokens: data.usage?.input_tokens ?? null,
      completionTokens: data.usage?.output_tokens ?? null,
      keyRotated: isRotated,
      modelSwapped: false,
      activeKeyType,
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

  function resolveGoogleModel(rawModel: string): string {
    const cleaned = rawModel.replace(/^(google\/|models\/)/, "");
    if (cleaned === "gemini-2.5-pro" || cleaned === "gemini-3.1-pro-preview") return "gemini-3.1-pro";
    if (
      cleaned === "gemini-2.5-flash" ||
      cleaned === "gemini-2.0-flash" ||
      cleaned === "gemini-3.6-flash" ||
      cleaned === "gemini-3.7-flash"
    )
      return "gemini-3.8-flash";
    return cleaned;
  }

  const resolvedBaseModel =
    config.provider === "google" ? resolveGoogleModel(config.model) : config.model;

  // High-tier users (> 199) preserve their premium model (falling back to flash only if 404/429/503 occurs).
  // Budget users (<= 199) degrade strictly through: gemini-3.8-flash -> gemini-3.1-flash.
  const candidateModels =
    config.provider === "google"
      ? isBudget
        ? Array.from(
            new Set([
              resolvedBaseModel,
              "gemini-3.8-flash",
              "gemini-3.1-flash",
            ]),
          )
        : Array.from(
            new Set([
              resolvedBaseModel,
              "gemini-3.1-pro-preview",
              "gemini-3.8-flash",
              "gemini-3.1-flash",
            ]),
          )
      : [config.model];

  let usedModel = candidateModels[0];
  let successfulKeyIdx = 0;
  const data = await withRetry429(async () => {
    let lastErrStatus = 500;
    let lastErrDetail = "";

    for (const m of candidateModels) {
      usedModel = m;
      const modelBody = { ...body, model: m };

      for (let kIdx = 0; kIdx < activeKeysToTry.length; kIdx++) {
        const currentKey = activeKeysToTry[kIdx]!;
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentKey}`,
          },
          body: JSON.stringify(modelBody),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          successfulKeyIdx = kIdx;
          return (await response.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
        }

        const text = await response.text();
        lastErrStatus = response.status;
        lastErrDetail = text;

        // Rate limit, server error, or 404 deprecated model on Google: rotate key or try next candidate model
        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[chatViaProvider] Model ${m} (key ...${currentKey.slice(-4)}) returned ${response.status}. Attempting key rotation / fallback...`,
          );
          if (kIdx + 1 < activeKeysToTry.length) {
            continue; // Try next key on this same model
          }
          break; // All keys exhausted on this model, step to next candidate model
        }

        const isModelUnavailable =
          (response.status === 404 ||
            (response.status === 400 &&
              (text.toLowerCase().includes("model") ||
                text.toLowerCase().includes("not found") ||
                text.toLowerCase().includes("unsupported")))) &&
          config.provider === "google";

        if (isModelUnavailable) {
          console.warn(
            `[chatViaProvider] Google Model ${m} returned ${response.status} (deprecated/unavailable). Falling back to next candidate model...`,
          );
          break; // Step to next candidate model immediately
        }

        // Any other client error (e.g. 401 unauthorized, 400 bad request) fails immediately
        throw new AiGatewayError(explain(response.status, text), response.status);
      }
    }

    // If all models and keys failed with 429/503, throw so withRetry429 can backoff
    throw new AiGatewayError(explain(lastErrStatus, lastErrDetail), lastErrStatus);
  }, CHAT_RETRY_OPTS);

  const isVipFallback = isBudget && successfulKeyIdx >= (purePoolKeysCount > 0 ? purePoolKeysCount : activeKeysToTry.length);
  const isRotated = successfulKeyIdx > 0;
  const isModelSwapped = usedModel !== candidateModels[0];
  const activeKeyType: "primary" | "backup_pool" | "vip_fallback" = isVipFallback
    ? "vip_fallback"
    : isRotated
      ? "backup_pool"
      : "primary";

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: usedModel,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
    keyRotated: isRotated,
    modelSwapped: isModelSwapped,
    activeKeyType,
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
      if ((status !== 429 && status !== 503) || i === opts.maxRetries) throw error;
      const delay = opts.baseMs * 2 ** i + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/** Direct call to Google's embeddings API with automatic key hopping across configured keys. */
async function embedViaGoogle(
  inputs: string[],
  config: ProviderConfig,
  outputDimensionality: number,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const googleModel = config.model.startsWith("models/") ? config.model : GOOGLE_EMBED_MODEL;
  const candidateKeys =
    config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const data = await withRetry429(async () => {
      const bestKey = getAvailableKey(candidateKeys);
      const keysToTry =
        candidateKeys.length > 1
          ? [bestKey, ...candidateKeys.filter((k) => k !== bestKey)]
          : candidateKeys;

      let lastErrStatus = 500;
      let lastErrDetail = "";

      for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
        const currentKey = keysToTry[kIdx]!;
        let response = await fetch(`${GOOGLE_EMBED_ENDPOINT}/${googleModel}:batchEmbedContents`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": currentKey },
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: googleModel,
              content: { parts: [{ text }] },
              outputDimensionality,
            })),
          }),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          return (await response.json()) as { embeddings?: { values: number[] }[] };
        }

        const detail = await response.text().catch(() => "");
        lastErrStatus = response.status;
        lastErrDetail = detail;

        // If rate limit or server error, mark cooldown and hop to next key
        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[embedViaGoogle] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
        }

        // If Google Generative Language REST endpoint returns location error (e.g. from Cloudflare worker edge IPs),
        // try Google's OpenAI-compatible endpoint /v1beta/openai/embeddings as an alternative
        if (
          detail.includes("User location is not supported") ||
          detail.includes("FAILED_PRECONDITION") ||
          response.status === 400
        ) {
          try {
            const cleanModel = googleModel.replace(/^models\//, "");
            const altRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${currentKey}`,
              },
              body: JSON.stringify({
                model: cleanModel,
                input: batch,
                dimensions: outputDimensionality,
              }),
            });
            if (altRes.ok) {
              markKeyHealthy(currentKey);
              const altJson = (await altRes.json()) as {
                data?: { index: number; embedding: number[] }[];
              };
              if (altJson.data && altJson.data.length > 0) {
                return { embeddings: altJson.data.map((d) => ({ values: d.embedding })) };
              }
            } else if (altRes.status === 429 || altRes.status === 503) {
              markKeyRateLimited(currentKey, 60_000);
              console.warn(
                `[embedViaGoogle alt] Key ...${currentKey.slice(-4)} returned ${altRes.status}. Hopping to next key...`,
              );
              if (kIdx + 1 < keysToTry.length) continue;
            }
          } catch (altErr) {
            console.warn("Google embeddings OpenAI-compatible endpoint fallback failed:", altErr);
          }
        }

        if (response.status !== 429 && response.status !== 503) {
          throw new AiGatewayError(
            `Google embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
            response.status,
          );
        }
      }

      throw new AiGatewayError(
        `Google embeddings returned ${lastErrStatus}. ${lastErrDetail.slice(0, 300)}`,
        lastErrStatus,
      );
    });

    (data.embeddings ?? []).forEach((item, i) => {
      vectors[offset + i] = item.values;
    });
  }

  return vectors;
}

/**
 * Direct call to any OpenAI-compatible /embeddings endpoint — covers
 * OpenAI, OpenRouter, Mistral, DeepSeek, and custom self-hosted endpoints
 * with automatic key hopping across configured keys.
 */
async function embedViaOpenAiCompatible(
  inputs: string[],
  config: ProviderConfig,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const candidateKeys =
    config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const data = await withRetry429(async () => {
      const supportsDimensionsParam =
        config.provider === "openai" || config.provider === "openrouter";
      const bestKey = getAvailableKey(candidateKeys);
      const keysToTry =
        candidateKeys.length > 1
          ? [bestKey, ...candidateKeys.filter((k) => k !== bestKey)]
          : candidateKeys;

      let lastErrStatus = 500;
      let lastErrDetail = "";

      for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
        const currentKey = keysToTry[kIdx]!;
        const response = await fetch(`${config.baseUrl}/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            input: batch,
            ...(supportsDimensionsParam ? { dimensions: EMBEDDING_DIMS } : {}),
          }),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          return (await response.json()) as { data?: { index: number; embedding: number[] }[] };
        }

        const detail = await response.text().catch(() => "");
        lastErrStatus = response.status;
        lastErrDetail = detail;

        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[embedViaOpenAiCompatible] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
        }

        throw new AiGatewayError(
          `${config.label || config.provider} embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
          response.status,
        );
      }

      throw new AiGatewayError(
        `${config.label || config.provider} embeddings returned ${lastErrStatus}. ${lastErrDetail.slice(0, 300)}`,
        lastErrStatus,
      );
    });

    for (const item of data.data ?? []) {
      vectors[offset + item.index] = item.embedding;
    }
  }

  return vectors;
}

async function embedViaConfig(inputs: string[], config: ProviderConfig): Promise<number[][]> {
  if (config.provider === "google") {
    return embedViaGoogle(inputs, config, EMBEDDING_DIMS);
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

/** Anthropic's image-block shape differs from the OpenAI image_url shape. Supports automatic key hopping across configured keys. */
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
  const candidateKeys =
    config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];
  const bestKey = getAvailableKey(candidateKeys);
  const keysToTry =
    candidateKeys.length > 1
      ? [bestKey, ...candidateKeys.filter((k) => k !== bestKey)]
      : candidateKeys;

  let lastStatus = 500;
  let lastText = "";

  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx]!;
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": currentKey,
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

    if (response.ok) {
      markKeyHealthy(currentKey);
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

    const text = await response.text();
    lastStatus = response.status;
    lastText = text;

    if (response.status === 429 || response.status === 503) {
      markKeyRateLimited(currentKey, 60_000);
      console.warn(
        `[visionChatViaAnthropic] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
      );
      if (kIdx + 1 < keysToTry.length) continue;
    }

    throw new AiGatewayError(explain(response.status, text), response.status);
  }

  throw new AiGatewayError(explain(lastStatus, lastText), lastStatus);
}

/** Every non-Anthropic provider in AI_PROVIDERS speaks the OpenAI image_url shape. Supports automatic key hopping across configured keys. */
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
  const candidateKeys =
    config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];
  const bestKey = getAvailableKey(candidateKeys);
  const keysToTry =
    candidateKeys.length > 1
      ? [bestKey, ...candidateKeys.filter((k) => k !== bestKey)]
      : candidateKeys;

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

  let lastStatus = 500;
  let lastText = "";

  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx]!;
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      markKeyHealthy(currentKey);
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

    const text = await response.text();
    lastStatus = response.status;
    lastText = text;

    if (response.status === 429 || response.status === 503) {
      markKeyRateLimited(currentKey, 60_000);
      console.warn(
        `[visionChatViaOpenAiCompatible] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
      );
      if (kIdx + 1 < keysToTry.length) continue;
    }

    throw new AiGatewayError(explain(response.status, text), response.status);
  }

  throw new AiGatewayError(explain(lastStatus, lastText), lastStatus);
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
