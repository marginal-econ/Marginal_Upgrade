/**
 * Dedicated NVIDIA NIM Frontier & Vision Engine — exclusively for Live Examiner.
 *
 * Completely isolated from the Essay Grader pipeline so deploying Live Examiner
 * upgrades has zero side-effects on any other route or feature.
 *
 * Models (all verified live on integrate.api.nvidia.com/v1):
 *   - `nvidia_ultra_550b`:    `nvidia/nemotron-3-ultra-550b-a55b`       (Principal Examiner: Blueprint & Score Maximizer)
 *   - `nvidia_super_vl_120b`: `nvidia/nemotron-3.5-super-vl-120b-a12b` (Multimodal Vision Diagram Auditor + Delta Examiner)
 *   - `nvidia_lightning_30b`: `nvidia/nemotron-3.5-lightning-30b-a3b`  (Sub-second ultra-fast JSON specialist)
 *
 * Features:
 *   - Full multi-key round-robin rotation across all configured NVIDIA_API_KEYS
 *   - Per-key cooldown tracking on 429 / transient 5xx
 *   - Seamless sibling failover + Groq text fallback so Live Examiner never stalls
 */

import { readEnv } from "@/server/env";
import { supabaseAdmin } from "@/integrations/backend/client.server";

export type LiveExaminerNvidiaFamily =
  | "nvidia_ultra_550b"
  | "nvidia_super_vl_120b"
  | "nvidia_lightning_30b";

export type LiveExaminerMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LiveExaminerCallOptions = {
  family: LiveExaminerNvidiaFamily;
  feature: string;
  userId?: string;
  messages: LiveExaminerMessage[];
  temperature?: number;
  maxCompletionTokens?: number;
  json?: boolean;
  timeoutMs?: number;
  /** Optional base64 data URLs (`data:image/...;base64,...`) for NVIDIA Super-VL 120B Vision. */
  imageDataUrls?: string[];
};

export type LiveExaminerCallResult = {
  text: string;
  model: string;
  provider: "nvidia" | "groq" | "legacy";
  latencyMs: number;
};

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const FAMILY_CONFIG: Record<
  LiveExaminerNvidiaFamily,
  {
    model: string;
    envOverride: string;
    defaultMaxTokens: number;
    maxTokensCap: number;
    defaultTimeoutMs: number;
  }
> = {
  nvidia_ultra_550b: {
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    envOverride: "NVIDIA_MODEL_ULTRA",
    defaultMaxTokens: 2800,
    maxTokensCap: 6144,
    defaultTimeoutMs: 22000,
  },
  nvidia_super_vl_120b: {
    model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    envOverride: "NVIDIA_MODEL_SUPER_VL",
    defaultMaxTokens: 2200,
    maxTokensCap: 6144,
    defaultTimeoutMs: 18000,
  },
  nvidia_lightning_30b: {
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    envOverride: "NVIDIA_MODEL_LIGHTNING",
    defaultMaxTokens: 1800,
    maxTokensCap: 4096,
    defaultTimeoutMs: 12000,
  },
};

const rrCursor: Record<string, number> = {
  nvidia_ultra_550b: 0,
  nvidia_super_vl_120b: 0,
  nvidia_lightning_30b: 0,
  groq: 0,
};

/** Key cooldown map: `${scope}:${keyTail}` -> epoch ms until retry */
const cooldownUntil = new Map<string, number>();

function cleanKeyToken(token: string): string {
  return token.trim().replace(/^["']+|["']+$/g, "").trim();
}

function parseKeyList(envName: string, prefix: string): string[] {
  const raw = readEnv(envName);
  if (!raw) return [];
  return cleanKeyToken(raw)
    .split(/[,\n\r\s]+/)
    .map(cleanKeyToken)
    .filter((k) => k.startsWith(prefix) && k.length > prefix.length + 8);
}

let cachedDbNvidiaKeys: { ts: number; keys: string[] } | null = null;
let cachedDbGroqKeys: { ts: number; keys: string[] } | null = null;
const DB_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveNvidiaKeys(): Promise<string[]> {
  const envKeys = [
    ...parseKeyList("NVIDIA_API_KEYS", "nvapi-"),
    ...parseKeyList("NVIDIA_API_KEY", "nvapi-"),
    ...parseKeyList("NVAPI_KEY", "nvapi-"),
  ];

  const now = Date.now();
  if (cachedDbNvidiaKeys && now - cachedDbNvidiaKeys.ts < DB_CACHE_TTL_MS) {
    return Array.from(new Set([...envKeys, ...cachedDbNvidiaKeys.keys]));
  }

  const dbKeys: string[] = [];
  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("ai_provider_configs")
        .select("api_key, provider")
        .eq("is_active", true);
      if (Array.isArray(data)) {
        for (const row of data) {
          const p = String((row as any).provider ?? "").toLowerCase();
          const k = cleanKeyToken(String((row as any).api_key ?? ""));
          if ((p.includes("nvidia") || p.includes("nim")) && k.startsWith("nvapi-")) {
            dbKeys.push(k);
          }
        }
      }
    }
  } catch {
    // Non-fatal: env keys are primary
  }

  cachedDbNvidiaKeys = { ts: now, keys: dbKeys };
  return Array.from(new Set([...envKeys, ...dbKeys]));
}

async function resolveGroqKeys(): Promise<string[]> {
  const envKeys = [
    ...parseKeyList("GROQ_API_KEYS", "gsk_"),
    ...parseKeyList("GROQ_API_KEY", "gsk_"),
  ];

  const now = Date.now();
  if (cachedDbGroqKeys && now - cachedDbGroqKeys.ts < DB_CACHE_TTL_MS) {
    return Array.from(new Set([...envKeys, ...cachedDbGroqKeys.keys]));
  }

  const dbKeys: string[] = [];
  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("ai_provider_configs")
        .select("api_key, provider")
        .eq("is_active", true);
      if (Array.isArray(data)) {
        for (const row of data) {
          const p = String((row as any).provider ?? "").toLowerCase();
          const k = cleanKeyToken(String((row as any).api_key ?? ""));
          if (p.includes("groq") && k.startsWith("gsk_")) {
            dbKeys.push(k);
          }
        }
      }
    }
  } catch {
    // Non-fatal
  }

  cachedDbGroqKeys = { ts: now, keys: dbKeys };
  return Array.from(new Set([...envKeys, ...dbKeys]));
}

function resolveModelId(family: LiveExaminerNvidiaFamily): string {
  const cfg = FAMILY_CONFIG[family];
  const override = readEnv(cfg.envOverride)?.trim();
  return override || cfg.model;
}

function stripThinkingTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function buildFallbackOrder(
  primary: LiveExaminerNvidiaFamily,
  hasImages: boolean,
): LiveExaminerNvidiaFamily[] {
  if (hasImages) {
    return ["nvidia_super_vl_120b"];
  }
  switch (primary) {
    case "nvidia_ultra_550b":
      return ["nvidia_ultra_550b", "nvidia_super_vl_120b", "nvidia_lightning_30b"];
    case "nvidia_super_vl_120b":
      return ["nvidia_super_vl_120b", "nvidia_lightning_30b"];
    case "nvidia_lightning_30b":
      return ["nvidia_lightning_30b", "nvidia_super_vl_120b"];
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryNvidiaCloud(
  options: LiveExaminerCallOptions,
  startedAt: number,
): Promise<LiveExaminerCallResult | null> {
  const keys = await resolveNvidiaKeys();
  if (keys.length === 0) return null;

  const hasImages = Boolean(options.imageDataUrls && options.imageDataUrls.length > 0);
  const families = buildFallbackOrder(options.family, hasImages);
  const lastUserIdx = options.messages.map((m) => m.role).lastIndexOf("user");

  for (const fam of families) {
    const cfg = FAMILY_CONFIG[fam];
    const model = resolveModelId(fam);
    const maxTokens = Math.min(
      cfg.maxTokensCap,
      Math.max(256, options.maxCompletionTokens ?? cfg.defaultMaxTokens),
    );
    const timeoutMs = options.timeoutMs ?? cfg.defaultTimeoutMs;

    const formattedMessages: Array<Record<string, unknown>> = options.messages.map((m, idx) => {
      if (hasImages && m.role === "user" && idx === lastUserIdx) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content },
            ...(options.imageDataUrls ?? []).map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const startSlot = rrCursor[fam] % keys.length;
    rrCursor[fam] = (rrCursor[fam] + 1) % keys.length;

    let attemptsForFam = 0;
    const maxAttempts = Math.min(keys.length, hasImages ? keys.length : 2);

    for (let offset = 0; offset < keys.length && attemptsForFam < maxAttempts; offset++) {
      const key = keys[(startSlot + offset) % keys.length];
      const cooldownKey = `${fam}:${key.slice(-8)}`;
      const until = cooldownUntil.get(cooldownKey) ?? 0;
      if (Date.now() < until && offset < keys.length - 1) {
        continue;
      }
      attemptsForFam++;

      const sendOnce = async (useJsonFormat: boolean): Promise<Response> => {
        const body: Record<string, unknown> = {
          model,
          messages: formattedMessages,
          temperature: options.temperature ?? 0,
          max_tokens: maxTokens,
          chat_template_kwargs: { enable_thinking: false },
        };
        // Avoid strict json_object on multimodal requests where some VL builds reject it
        if (useJsonFormat && !hasImages) {
          body.response_format = { type: "json_object" };
        }
        return fetchWithTimeout(
          NVIDIA_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
          },
          timeoutMs,
        );
      };

      try {
        let res = await sendOnce(Boolean(options.json));
        if (res.status === 400 && options.json && !hasImages) {
          res = await sendOnce(false);
        }

        if (res.status === 429) {
          cooldownUntil.set(cooldownKey, Date.now() + 25_000);
          continue;
        }
        if (res.status >= 500) {
          cooldownUntil.set(cooldownKey, Date.now() + 10_000);
          continue;
        }
        if (!res.ok) {
          const errSnippet = (await res.text().catch(() => "")).slice(0, 220);
          console.warn(`[live-examiner-nvidia] ${fam} HTTP ${res.status}: ${errSnippet}`);
          break;
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string | null } }>;
        };
        const rawText = data?.choices?.[0]?.message?.content ?? "";
        const text = stripThinkingTags(rawText);
        if (!text) continue;

        return {
          text,
          model,
          provider: "nvidia",
          latencyMs: Date.now() - startedAt,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[live-examiner-nvidia] ${fam} call error: ${msg}`);
        // On abort/timeout, try next key once for Ultra/VL or fall through to fast sibling
      }
    }
  }

  return null;
}

async function tryGroqTextFallback(
  options: LiveExaminerCallOptions,
  startedAt: number,
): Promise<LiveExaminerCallResult | null> {
  if (options.imageDataUrls && options.imageDataUrls.length > 0) return null;
  const keys = await resolveGroqKeys();
  if (keys.length === 0) return null;

  const models = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"];
  const startSlot = rrCursor.groq % keys.length;
  rrCursor.groq = (rrCursor.groq + 1) % keys.length;

  for (const model of models) {
    for (let offset = 0; offset < Math.min(keys.length, 2); offset++) {
      const key = keys[(startSlot + offset) % keys.length];
      try {
        const body: Record<string, unknown> = {
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0,
          max_tokens: Math.min(3200, Math.max(256, options.maxCompletionTokens ?? 1800)),
        };
        if (options.json) {
          body.response_format = { type: "json_object" };
        }
        let res = await fetchWithTimeout(
          GROQ_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
          },
          Math.min(12000, options.timeoutMs ?? 12000),
        );
        if (res.status === 400 && options.json) {
          delete body.response_format;
          res = await fetchWithTimeout(
            GROQ_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify(body),
            },
            10000,
          );
        }
        if (!res.ok) continue;

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string | null } }>;
        };
        const text = stripThinkingTags(data?.choices?.[0]?.message?.content ?? "");
        if (!text) continue;

        return {
          text,
          model,
          provider: "groq",
          latencyMs: Date.now() - startedAt,
        };
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Primary entry point for all Live Examiner AI calls.
 * Always prioritizes NVIDIA NIM (3-key rotation across 550B Ultra / 120B Super-VL / 30B Lightning),
 * with automatic Groq fallback for text and legacy vision fallback if NVIDIA keys are absent.
 */
export async function callLiveExaminerNvidia(
  options: LiveExaminerCallOptions,
): Promise<LiveExaminerCallResult> {
  const startedAt = Date.now();

  const nvidiaRes = await tryNvidiaCloud(options, startedAt);
  if (nvidiaRes) return nvidiaRes;

  const groqRes = await tryGroqTextFallback(options, startedAt);
  if (groqRes) return groqRes;

  // Last-resort safety net so Live Examiner never breaks even in local dev without NVIDIA/Groq env
  if (options.imageDataUrls && options.imageDataUrls.length > 0) {
    const { visionChat } = await import("../ai.server");
    const systemMsg = options.messages.find((m) => m.role === "system")?.content ?? "";
    const userMsg =
      [...options.messages].reverse().find((m) => m.role === "user")?.content ??
      "Inspect this Cambridge 9708 economics diagram.";
    const legacy = await visionChat({
      systemPrompt: systemMsg,
      prompt: userMsg,
      imageDataUrls: options.imageDataUrls,
      maxCompletionTokens: options.maxCompletionTokens ?? 1600,
    });
    return {
      text: stripThinkingTags(legacy.text),
      model: legacy.model ?? "legacy-vision",
      provider: "legacy",
      latencyMs: Date.now() - startedAt,
    };
  }

  const { chat } = await import("../ai.server");
  const { MODEL_LIVE_CANDIDATE } = await import("../examiner/config");
  const legacy = await chat({
    model: MODEL_LIVE_CANDIDATE,
    feature: options.feature,
    userId: options.userId,
    temperature: options.temperature ?? 0,
    maxCompletionTokens: options.maxCompletionTokens ?? 1600,
    json: options.json,
    messages: options.messages,
  });
  return {
    text: stripThinkingTags(legacy.text),
    model: legacy.model ?? MODEL_LIVE_CANDIDATE,
    provider: "legacy",
    latencyMs: Date.now() - startedAt,
  };
}
