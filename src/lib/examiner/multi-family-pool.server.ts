/**
 * Marginal Engine V7.5 — Zero-Gemini 2-Cloud, 6-Family Omni-Orthogonal Examiner Pool
 * (NVIDIA NIM + Groq)
 *
 * Combines genuinely distinct frontier model architectures across 2 independent clouds (0% Gemini):
 *   Cloud 1 — NVIDIA NIM (integrate.api.nvidia.com/v1, full uncompressed context, ~40 RPM/key):
 *     - "nvidia_ultra_550b":    `nvidia/nemotron-3-ultra-550b-a55b`    (550B/55B MoE Frontier Level & Meta-Calibrator)
 *     - "nvidia_super_vl_120b": `nvidia/nemotron-3.5-super-vl-120b-a12b` (120B/12B Multimodal VL + Full Examiner)
 *     - "nvidia_lightning_30b": `nvidia/nemotron-3.5-lightning-30b-a3b`  (30B/3B Ultra-Fast JSON Specialist)
 *     - "minimax_flash":        `minimaxai/minimax-m3.1-flash`         (Independent MiniMax Frontier Architecture)
 *     - "step_5":               `stepfun-ai/step-5-preview`            (Independent StepFun Reasoning Architecture)
 *   Cloud 2 — Groq (api.groq.com/openai/v1, ultra-fast micro-examiners):
 *     - "openai_120b":          `openai/gpt-oss-120b`  (OpenAI 120B Examiner & AO1+AO2 Specialist)
 *     - "qwen_27b":             `qwen/qwen3.8-27b`     (Alibaba Qwen 3.8 27B Compact AO3 & Rubric Specialist)
 *     - "openai_20b":           `openai/gpt-oss-20b`   (Emergency fast fallback only)
 *
 * Always-works 2-cloud failover guarantee:
 *   - Every cloud maintains per-(key, model) circuit-breaker cooldowns (0ms skip on 429/401/404/410).
 *   - Nemotron and MiniMax models automatically pass `chat_template_kwargs: { enable_thinking: false }`
 *     unless `enableThinking: true` is requested, eliminating hidden reasoning token truncation.
 */

import { readEnv } from "@/server/env";
import { getActiveProvider } from "../ai/active.server";
import type { ChatMessage } from "../ai.server";

export type NvidiaFamily =
  | "nvidia_ultra_550b"
  | "nvidia_super_vl_120b"
  | "nvidia_lightning_30b"
  | "minimax_flash"
  | "step_5";

export type OrthogonalFamily =
  | NvidiaFamily
  | "gemini_flash"
  | "openai_120b"
  | "qwen_27b"
  | "openai_20b";

type GroqFamily = "openai_120b" | "qwen_27b" | "openai_20b";

export type FamilyCallOptions = {
  family: OrthogonalFamily;
  messages: ChatMessage[];
  temperature?: number;
  maxCompletionTokens?: number;
  json?: boolean;
  userId?: string;
  feature?: string;
  timeoutMs?: number;
  /** Optional Gemini thinking token cap (default 256 for fast reasoning without 40s stalls). */
  thinkingBudget?: number;
  /** Optional opt-in to Nemotron thinking trace (default false so JSON never starves). */
  enableThinking?: boolean;
  /** Optional image data URLs for multimodal NVIDIA Super VL calls. */
  imageDataUrls?: string[];
  /** Optional per-essay key slot offset so parallel calls spread evenly across all NVIDIA keys. */
  keyOffset?: number;
};

export type FamilyCallResult = {
  text: string;
  model: string;
  family: OrthogonalFamily;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  keyRotated: boolean;
};

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_FAMILY_CONFIG: Record<
  NvidiaFamily,
  {
    model: string;
    envKey: string;
    defaultMaxOut: number;
    maxOutCap: number;
    supportsJsonMode: boolean;
    supportsThinkingToggle: boolean;
    defaultTimeoutMs: number;
  }
> = {
  nvidia_ultra_550b: {
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    envKey: "NVIDIA_MODEL_ULTRA",
    defaultMaxOut: 3200,
    maxOutCap: 6144,
    supportsJsonMode: true,
    supportsThinkingToggle: true,
    defaultTimeoutMs: 18000,
  },
  nvidia_super_vl_120b: {
    model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    envKey: "NVIDIA_MODEL_SUPER_VL",
    defaultMaxOut: 2400,
    maxOutCap: 6144,
    supportsJsonMode: true,
    supportsThinkingToggle: true,
    defaultTimeoutMs: 14000,
  },
  nvidia_lightning_30b: {
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    envKey: "NVIDIA_MODEL_LIGHTNING",
    defaultMaxOut: 2000,
    maxOutCap: 4096,
    supportsJsonMode: true,
    supportsThinkingToggle: true,
    defaultTimeoutMs: 12000,
  },
  minimax_flash: {
    model: "minimaxai/minimax-m3.1-flash",
    envKey: "NVIDIA_MODEL_MINIMAX",
    defaultMaxOut: 2600,
    maxOutCap: 6144,
    supportsJsonMode: true,
    // Verified live: MiniMax M3.1 Flash is ~10x slower (10.3s vs 1.1s) when chat_template_kwargs.enable_thinking=false is sent!
    supportsThinkingToggle: false,
    defaultTimeoutMs: 14000,
  },
  step_5: {
    model: "stepfun-ai/step-5-preview",
    envKey: "NVIDIA_MODEL_STEP",
    defaultMaxOut: 1600,
    maxOutCap: 4096,
    supportsJsonMode: false,
    supportsThinkingToggle: false,
    defaultTimeoutMs: 12000,
  },
};

export function isNvidiaFamily(fam: OrthogonalFamily): fam is NvidiaFamily {
  return fam in NVIDIA_FAMILY_CONFIG;
}

export function resolveNvidiaModel(fam: NvidiaFamily): string {
  const cfg = NVIDIA_FAMILY_CONFIG[fam];
  const override = readEnv(cfg.envKey)?.trim();
  return override || cfg.model;
}

export function isNvidiaEnabled(): boolean {
  const raw = (readEnv("NVIDIA_ENABLED") || "").trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  return true;
}

const GROQ_FAMILY_CONFIG: Record<
  GroqFamily,
  { model: string; envKey: string; tpmLimit: number; defaultMaxOut: number; maxOutCap: number }
> = {
  openai_120b: { model: "openai/gpt-oss-120b", envKey: "GROQ_MODEL_PRIMARY", tpmLimit: 7600, defaultMaxOut: 1900, maxOutCap: 2200 },
  // Groq enforces an Output Tokens Per Minute (OTPM) cap of 1,000 on qwen/qwen3.8-27b; cap at 920 so it never 429s
  qwen_27b: { model: "qwen/qwen3.8-27b", envKey: "GROQ_MODEL_SECONDARY", tpmLimit: 7600, defaultMaxOut: 920, maxOutCap: 920 },
  openai_20b: { model: "openai/gpt-oss-20b", envKey: "GROQ_MODEL_FAST", tpmLimit: 7600, defaultMaxOut: 1800, maxOutCap: 2200 },
};

export function resolveGroqModel(fam: GroqFamily): string {
  const cfg = GROQ_FAMILY_CONFIG[fam];
  const override = readEnv(cfg.envKey)?.trim();
  return override || cfg.model;
}

export function isGeminiEnabled(): boolean {
  // Gemini is strictly disabled in the V7 Groq + NVIDIA NIM pipeline (slow/unreliable free keys).
  // Kept as an explicit opt-in stub only if GEMINI_ENABLED=force is ever set for diagnostics.
  const raw = (readEnv("GEMINI_ENABLED") || "").trim().toLowerCase();
  return raw === "force";
}

// Fast Gemini models only (gemini-3.1-flash-lite excluded by default due to 25-30s stalls / 503 spikes;
// override anytime via GEMINI_MODEL_CHAIN env var).
const DEFAULT_GEMINI_FREE_MODELS = [
  "models/gemini-3.6-flash",
  "models/gemini-3.5-flash",
  "models/gemini-3-flash-preview",
] as const;

const DEFAULT_GEMINI_PAID_MODELS = [
  "models/gemini-3.6-flash",
  "models/gemini-3.8-flash",
  "models/gemini-3-flash-preview",
] as const;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const rrCursor: Record<OrthogonalFamily, number> = {
  nvidia_ultra_550b: 0,
  nvidia_super_vl_120b: 0,
  nvidia_lightning_30b: 0,
  minimax_flash: 0,
  step_5: 0,
  gemini_flash: 0,
  openai_120b: 0,
  qwen_27b: 0,
  openai_20b: 0,
};

/**
 * In-memory circuit-breaker cooldown maps keyed by `${keyTail}:${model}` (or `${keyTail}:*` for dead 401/402 keys).
 * Prevents re-hitting exhausted free-tier Gemini, NVIDIA NIM, or Groq TPD/TPM models on subsequent calls (0ms skip).
 */
const geminiCooldownUntil = new Map<string, number>();
const groqCooldownUntil = new Map<string, number>();
const nvidiaCooldownUntil = new Map<string, number>();

export function resetGeminiCooldownsForTests(): void {
  geminiCooldownUntil.clear();
}

export function resetGroqCooldownsForTests(): void {
  groqCooldownUntil.clear();
}

export function resetNvidiaCooldownsForTests(): void {
  nvidiaCooldownUntil.clear();
}

export function isNvidiaPairCoolingDown(key: string, model: string, now = Date.now()): boolean {
  const tail = key.slice(-8);
  const keyDeadUntil = nvidiaCooldownUntil.get(`${tail}:*`) ?? 0;
  if (keyDeadUntil > now) return true;
  const pairUntil = nvidiaCooldownUntil.get(`${tail}:${model}`) ?? 0;
  return pairUntil > now;
}

export function markNvidiaCooldown(
  key: string,
  model: string,
  status: number,
  _errText: string,
  retryAfterSec?: number | null,
  now = Date.now(),
): "rpm" | "dead" | "transient" {
  const tail = key.slice(-8);
  if (status === 401 || status === 402 || status === 403) {
    nvidiaCooldownUntil.set(`${tail}:*`, now + 24 * 60 * 60 * 1000);
    return "dead";
  }
  if (status === 404 || status === 410) {
    nvidiaCooldownUntil.set(`${tail}:${model}`, now + 24 * 60 * 60 * 1000);
    return "dead";
  }
  if (status === 429) {
    const waitMs =
      retryAfterSec && Number.isFinite(retryAfterSec)
        ? Math.min(15_000, Math.max(3_000, retryAfterSec * 1000))
        : 5_000;
    nvidiaCooldownUntil.set(`${tail}:${model}`, now + waitMs);
    return "rpm";
  }
  if (status >= 500 || status === 408) {
    nvidiaCooldownUntil.set(`${tail}:${model}`, now + 6_000);
  }
  return "transient";
}

export function isGroqPairCoolingDown(key: string, model: string, now = Date.now()): boolean {
  const tail = key.slice(-8);
  const keyDeadUntil = groqCooldownUntil.get(`${tail}:*`) ?? 0;
  if (keyDeadUntil > now) return true;
  const pairUntil = groqCooldownUntil.get(`${tail}:${model}`) ?? 0;
  return pairUntil > now;
}

/**
 * Returns true if at least one free Groq key is currently NOT in cooldown for `fam`.
 * Allows callers (e.g. grade.server.ts) to keep Gemini strictly at <= 1 parallel call/essay.
 */
export async function hasHealthyGroqKey(fam: GroqFamily, now = Date.now()): Promise<boolean> {
  const keys = await resolveFreeGroqKeys();
  if (keys.length === 0) return false;
  const model = resolveGroqModel(fam);
  return keys.some((k) => !isGroqPairCoolingDown(k, model, now));
}

export function markGroqCooldown(
  key: string,
  model: string,
  status: number,
  errText: string,
  retryAfterSec?: number | null,
  now = Date.now(),
): "tpd" | "tpm" | "otpm" | "dead" | "transient" {
  const tail = key.slice(-8);
  if (status === 401 || status === 402 || status === 403) {
    groqCooldownUntil.set(`${tail}:*`, now + 24 * 60 * 60 * 1000);
    return "dead";
  }
  if (status === 404) {
    groqCooldownUntil.set(`${tail}:${model}`, now + 24 * 60 * 60 * 1000);
    return "dead";
  }
  if (status === 429) {
    // Distinguish permanent "Request too large ... OTPM" (single request exceeds limit) from
    // transient rolling 1-minute OTPM exhaustion ("Rate limit reached ... OTPM: Limit 1000, Used 695, Requested 720")
    if (/request too large[\s\S]*?(?:output tokens per minute|otpm)/i.test(errText)) {
      return "otpm";
    }
    const isDaily = /tokens per day|\btpd\b|requests per day|\brpd\b/i.test(errText);
    if (isDaily) {
      const waitMs =
        retryAfterSec && Number.isFinite(retryAfterSec)
          ? Math.min(60 * 60_000, Math.max(5 * 60_000, retryAfterSec * 1000))
          : 15 * 60_000;
      groqCooldownUntil.set(`${tail}:${model}`, now + waitMs);
      return "tpd";
    }
    // Rolling 1-minute TPM or OTPM: short 5s cooldown (or parsed retry-after capped at 8s)
    // so parallel requests spread across other keys without locking out the entire pool.
    const waitMs =
      retryAfterSec && Number.isFinite(retryAfterSec)
        ? Math.min(8_000, Math.max(3_000, retryAfterSec * 1000))
        : 5_000;
    groqCooldownUntil.set(`${tail}:${model}`, now + waitMs);
    return "tpm";
  }
  if (status >= 500 || status === 408) {
    groqCooldownUntil.set(`${tail}:${model}`, now + 60_000);
  }
  return "transient";
}

function getShortestGroqCooldownMs(keys: string[], model: string, now = Date.now()): number | null {
  let shortest: number | null = null;
  for (const key of keys) {
    const tail = key.slice(-8);
    if ((groqCooldownUntil.get(`${tail}:*`) ?? 0) > now) continue;
    const until = groqCooldownUntil.get(`${tail}:${model}`) ?? 0;
    const rem = until - now;
    if (rem > 0 && rem <= 10_000) {
      if (shortest === null || rem < shortest) shortest = rem;
    }
  }
  return shortest;
}

export function isGeminiPairCoolingDown(key: string, model: string, now = Date.now()): boolean {
  const tail = key.slice(-8);
  const keyDeadUntil = geminiCooldownUntil.get(`${tail}:*`) ?? 0;
  if (keyDeadUntil > now) return true;
  const pairUntil = geminiCooldownUntil.get(`${tail}:${model}`) ?? 0;
  return pairUntil > now;
}

export function markGeminiCooldown(key: string, model: string, status: number, errText: string, now = Date.now()): void {
  const tail = key.slice(-8);
  if (status === 401 || status === 402 || status === 403) {
    // Invalid key or depleted credits: skip this key for 24h
    geminiCooldownUntil.set(`${tail}:*`, now + 24 * 60 * 60 * 1000);
    return;
  }
  if (status === 404) {
    // Model deprecated/unavailable on this key: skip pair for 24h
    geminiCooldownUntil.set(`${tail}:${model}`, now + 24 * 60 * 60 * 1000);
    return;
  }
  if (status === 429) {
    const isDaily = /per\s*day|daily|rpd|free_tier/i.test(errText);
    geminiCooldownUntil.set(`${tail}:${model}`, now + (isDaily ? 60 : 10) * 60 * 1000);
    return;
  }
  if (status >= 500 || status === 408) {
    // Transient slow/5xx: brief 90s cooldown so next request skips the sluggish endpoint
    geminiCooldownUntil.set(`${tail}:${model}`, now + 90 * 1000);
  }
}

export function resolveGeminiModelChain(tier: "free" | "paid"): string[] {
  const envRaw =
    readEnv(tier === "free" ? "GEMINI_MODEL_CHAIN" : "GEMINI_PAID_MODEL_CHAIN") ||
    readEnv("GEMINI_MODEL_CHAIN") ||
    "";
  const parsed = envRaw
    .split(/[\n,;]+/)
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => (m.startsWith("models/") ? m : `models/${m}`));
  if (parsed.length > 0) return parsed;
  return tier === "free" ? [...DEFAULT_GEMINI_FREE_MODELS] : [...DEFAULT_GEMINI_PAID_MODELS];
}

let cachedGroqKeys: { keys: string[]; ts: number } | null = null;
let cachedNvidiaKeys: { keys: string[]; ts: number } | null = null;
const POOL_TTL_MS = 5 * 60 * 1000;

function parseEnvKeyList(name: string, prefix = "gsk_"): string[] {
  const raw = readEnv(name) || "";
  return raw
    .split(/[\n,;]+/)
    .map((k) => k.trim())
    .filter((k) => (!prefix || k.startsWith(prefix)) && k.length >= 20);
}

/**
 * Resolves NVIDIA NIM API keys from env vars (NVIDIA_API_KEYS / NVIDIA_API_KEY / NVAPI_KEY)
 * and active DB provider config (cached for 5m).
 */
export async function resolveNvidiaKeys(): Promise<string[]> {
  const now = Date.now();
  const envKeys = [
    ...parseEnvKeyList("NVIDIA_API_KEYS", "nvapi-"),
    ...parseEnvKeyList("NVIDIA_API_KEY", "nvapi-"),
    ...parseEnvKeyList("NVAPI_KEY", "nvapi-"),
  ];
  if (cachedNvidiaKeys && now - cachedNvidiaKeys.ts < POOL_TTL_MS && cachedNvidiaKeys.keys.length > 0) {
    return Array.from(new Set([...envKeys, ...cachedNvidiaKeys.keys]));
  }

  const keySet = new Set<string>(envKeys);
  try {
    const chatProv = await getActiveProvider().catch(() => null);
    if (chatProv && chatProv.provider === "nvidia") {
      const candidates = [
        ...(chatProv.freeKeys ?? []),
        ...(chatProv.budgetPoolKeys ?? []),
        ...(chatProv.apiKeys ?? []),
      ];
      for (const k of candidates) {
        if (typeof k === "string" && k.startsWith("nvapi-") && k.length >= 20) {
          keySet.add(k);
        }
      }
    }
  } catch {
    // Env keys remain available
  }

  const keys = Array.from(keySet);
  if (keys.length > 0) {
    cachedNvidiaKeys = { keys, ts: now };
  }
  return keys;
}

// In-memory 60s sliding-window NVIDIA RPM tracker for automatic multi-student load-shedding
const nvidiaRequestTimestamps: number[] = [];
let essayKeySeq = 0;

export function allocateEssayKeyOffset(): number {
  const slot = essayKeySeq;
  essayKeySeq = (essayKeySeq + 1) % 100000;
  return slot;
}

function recordNvidiaRequest(now = Date.now()): void {
  nvidiaRequestTimestamps.push(now);
  const cutoff = now - 60_000;
  while (nvidiaRequestTimestamps.length > 0 && nvidiaRequestTimestamps[0]! < cutoff) {
    nvidiaRequestTimestamps.shift();
  }
}

export async function getNvidiaLoadStatus(now = Date.now()): Promise<{
  rpm: number;
  capacityRpm: number;
  utilization: number;
  loadLevel: "normal" | "burst" | "surge";
}> {
  const cutoff = now - 60_000;
  while (nvidiaRequestTimestamps.length > 0 && nvidiaRequestTimestamps[0]! < cutoff) {
    nvidiaRequestTimestamps.shift();
  }
  const keys = await resolveNvidiaKeys();
  const capacityRpm = Math.max(40, keys.length * 40);
  const rpm = nvidiaRequestTimestamps.length;
  const utilization = rpm / capacityRpm;
  const loadLevel = utilization >= 0.90 ? "surge" : utilization >= 0.75 ? "burst" : "normal";
  return { rpm, capacityRpm, utilization, loadLevel };
}

export async function hasHealthyNvidiaKey(
  fam: NvidiaFamily = "nvidia_ultra_550b",
  now = Date.now(),
): Promise<boolean> {
  if (!isNvidiaEnabled()) return false;
  const keys = await resolveNvidiaKeys();
  if (keys.length === 0) return false;
  const model = resolveNvidiaModel(fam);
  return keys.some((k) => !isNvidiaPairCoolingDown(k, model, now));
}

function buildNvidiaFallbackOrder(primary: NvidiaFamily): NvidiaFamily[] {
  // Limit to at most 1 fast NVIDIA sibling hop before cross-cloud failover to Groq (prevents 60s tail stalls)
  switch (primary) {
    case "nvidia_ultra_550b":
      return ["nvidia_ultra_550b", "nvidia_super_vl_120b"];
    case "nvidia_super_vl_120b":
      return ["nvidia_super_vl_120b", "nvidia_lightning_30b"];
    case "minimax_flash":
      return ["minimax_flash", "nvidia_super_vl_120b"];
    case "nvidia_lightning_30b":
      return ["nvidia_lightning_30b", "nvidia_super_vl_120b"];
    case "step_5":
      return ["step_5", "nvidia_super_vl_120b"];
  }
}

async function callNvidiaFamily(
  primaryFam: NvidiaFamily,
  options: FamilyCallOptions,
  startedAt: number,
): Promise<FamilyCallResult | null> {
  if (!isNvidiaEnabled()) return null;
  const keys = await resolveNvidiaKeys();
  if (keys.length === 0) return null;

  // If multimodal images were attached, only try vision-capable Super VL 120B
  const tryFamilies: NvidiaFamily[] =
    options.imageDataUrls && options.imageDataUrls.length > 0
      ? ["nvidia_super_vl_120b"]
      : buildNvidiaFallbackOrder(primaryFam);

  for (const fam of tryFamilies) {
    const cfg = NVIDIA_FAMILY_CONFIG[fam];
    const resolvedModel = resolveNvidiaModel(fam);
    const maxTokens = Math.min(
      cfg.maxOutCap,
      Math.max(400, options.maxCompletionTokens ?? cfg.defaultMaxOut),
    );
    const timeoutMs = options.timeoutMs ?? cfg.defaultTimeoutMs;
    const startIdx =
      typeof options.keyOffset === "number"
        ? ((options.keyOffset % keys.length) + keys.length) % keys.length
        : rrCursor[fam] % keys.length;
    rrCursor[fam] = (rrCursor[fam] + 1) % keys.length;

    // Build messages (multimodal if images attached for Super VL)
    const formattedMessages: Array<Record<string, unknown>> = options.messages.map((m, idx) => {
      const isLastUser =
        m.role === "user" &&
        idx === options.messages.map((x) => x.role).lastIndexOf("user") &&
        options.imageDataUrls &&
        options.imageDataUrls.length > 0;
      if (isLastUser) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content },
            ...options.imageDataUrls!.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    let keyRotated = false;
    let timeoutRetries = 0;
    // Sweep 0 uses strict json_object (if supported); sweep 1 retries without response_format on 400 JSON error
    for (let sweep = 0; sweep < 2; sweep++) {
      let retryWithoutStrictJson = false;
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const key = keys[(startIdx + attempt) % keys.length]!;
        if (isNvidiaPairCoolingDown(key, resolvedModel)) continue;
        if (attempt > 0 || sweep > 0) keyRotated = true;
        recordNvidiaRequest();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const body: Record<string, unknown> = {
            model: resolvedModel,
            messages: formattedMessages,
            temperature: options.temperature ?? 0.0,
            max_tokens: maxTokens,
          };
          if (cfg.supportsThinkingToggle && !options.enableThinking) {
            body.chat_template_kwargs = { enable_thinking: false };
          }
          if (options.json && cfg.supportsJsonMode && sweep === 0) {
            body.response_format = { type: "json_object" };
          }

          const res = await fetch(NVIDIA_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = (await res.json()) as any;
            const rawContent = data?.choices?.[0]?.message?.content ?? "";
            const text = stripThinkingTags(typeof rawContent === "string" ? rawContent : "");
            if (text.trim().length > 0) {
              return {
                text,
                model: resolvedModel,
                family: fam,
                promptTokens: data?.usage?.prompt_tokens ?? null,
                completionTokens: data?.usage?.completion_tokens ?? null,
                latencyMs: Date.now() - startedAt,
                keyRotated,
              };
            }
            // Empty content (e.g. reasoning consumed tokens): cool briefly & hop
            markNvidiaCooldown(key, resolvedModel, 500, "empty_content");
            continue;
          }

          const retryHeader = Number(res.headers.get("retry-after"));
          const retryAfterSec = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null;
          const errSnippet = (await res.text().catch(() => "")).slice(0, 220);

          if (res.status === 400 && /json|response_format/i.test(errSnippet) && sweep === 0) {
            retryWithoutStrictJson = true;
            break;
          }

          markNvidiaCooldown(key, resolvedModel, res.status, errSnippet, retryAfterSec);
          if (res.status === 429 || res.status >= 500) {
            continue;
          }
          break;
        } catch (err: any) {
          clearTimeout(timeoutId);
          markNvidiaCooldown(key, resolvedModel, 408, String(err?.message || err));
          // Tiered 408 timeout policy:
          // - 550B Ultra is our highest-accuracy anchor: allow 1 retry on a different healthy key
          //   before falling back to Super-VL 120B (prevents fams=2 collapse on 20m essays!).
          // - All other models: switch immediately to fast sibling instead of burning 32-48s across keys.
          if (fam === "nvidia_ultra_550b" && timeoutRetries < 1 && keys.length > 1) {
            timeoutRetries += 1;
            continue;
          }
          break;
        }
      }
      if (!retryWithoutStrictJson) break;
    }
  }

  return null;
}

function resolveGeminiPools(): { freeKeys: string[]; paidKeys: string[] } {
  const freeSet = new Set<string>([
    ...parseEnvKeyList("GEMINI_FREE_KEYS", ""),
    ...parseEnvKeyList("GOOGLE_FREE_KEYS", ""),
  ]);
  const paidSet = new Set<string>([
    ...parseEnvKeyList("GEMINI_PAID_KEYS", ""),
    ...parseEnvKeyList("GOOGLE_API_KEY", ""),
    ...parseEnvKeyList("GEMINI_API_KEY", ""),
  ]);
  for (const fk of freeSet) paidSet.delete(fk);
  return { freeKeys: Array.from(freeSet), paidKeys: Array.from(paidSet) };
}

async function callGeminiFamily(
  options: FamilyCallOptions,
  startedAt: number,
): Promise<FamilyCallResult | null> {
  if (!isGeminiEnabled()) {
    return null;
  }
  const { freeKeys, paidKeys } = resolveGeminiPools();
  if (freeKeys.length === 0 && paidKeys.length === 0) {
    return null;
  }

  // Strict wall-clock budget measured from THIS Gemini invocation (never the parent's stale startedAt!).
  // Uses Google "Tail at Scale" staggered hedging: free Gemini keys respond in 1.2–3.5s ~83% of the time,
  // but suffer ~17% random 12s+ tail stalls. Firing a staggered backup on a different key/model (and paid
  // key if needed) only when attempt 1 stalls eliminates tail hangs without wasting quota on fast calls.
  const geminiStartedAt = Date.now();
  const totalBudgetMs = Math.min(options.timeoutMs ?? 11000, 14000);
  const isHeavyPass = (options.maxCompletionTokens ?? 1800) > 2000;
  const hedgeDelayMs = isHeavyPass ? 4800 : 3200;

  const systemParts: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const m of options.messages) {
    if (m.role === "system") {
      if (m.content) systemParts.push(m.content);
    } else {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
  }
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Respond in valid JSON." }] });
  }

  const thinkingBudget = options.thinkingBudget ?? 256;
  // Add thinkingBudget headroom so Gemini models that count thinking tokens inside maxOutputTokens never hit MAX_TOKENS
  const maxOut = Math.min(4096, Math.max(1200, options.maxCompletionTokens ?? 1800) + thinkingBudget);
  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.0,
      maxOutputTokens: maxOut,
      thinkingConfig: { thinkingBudget },
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
  }

  // Build up to 4 diverse, non-cooling (key, model) candidates:
  //   #1: Free key[rr] + free model[0]
  //   #2: Different free key + different free model (bypasses both key & model stalls)
  //   #3: Another free key + next free model (if available)
  //   #4: Paid key + paid model[0] (reliable ~1.5s anchor if free tier stalls/429s)
  type GeminiCandidate = { key: string; model: string; tier: "free" | "paid" };
  const candidates: GeminiCandidate[] = [];
  const freeModels = resolveGeminiModelChain("free");
  const paidModels = resolveGeminiModelChain("paid");

  if (freeKeys.length > 0 && freeModels.length > 0) {
    const startIdx = rrCursor.gemini_flash % freeKeys.length;
    rrCursor.gemini_flash = (rrCursor.gemini_flash + 1) % freeKeys.length;
    const seen = new Set<string>();
    // Round-robin diagonally across (key, model) pairs so hedged backup always hits a fresh key + model
    for (let step = 0; step < Math.max(freeKeys.length, freeModels.length) * 2 && candidates.length < 3; step++) {
      const key = freeKeys[(startIdx + step) % freeKeys.length];
      const model = freeModels[step % freeModels.length];
      const sig = `${key.slice(-8)}:${model}`;
      if (seen.has(sig) || isGeminiPairCoolingDown(key, model)) continue;
      seen.add(sig);
      candidates.push({ key, model, tier: "free" });
    }
  }
  if (paidKeys.length > 0 && paidModels.length > 0) {
    for (const model of paidModels) {
      let added = false;
      for (const key of paidKeys) {
        if (!isGeminiPairCoolingDown(key, model)) {
          candidates.push({ key, model, tier: "paid" });
          added = true;
          break;
        }
      }
      if (added) break;
    }
  }

  if (candidates.length === 0) return null;

  const activeControllers = new Set<AbortController>();
  const abortAll = () => {
    for (const c of activeControllers) {
      try {
        c.abort();
      } catch {}
    }
    activeControllers.clear();
  };

  const runCandidate = async (cand: GeminiCandidate, attemptIdx: number): Promise<FamilyCallResult | null> => {
    const remainingMs = totalBudgetMs - (Date.now() - geminiStartedAt);
    if (remainingMs < 1500) return null;

    const controller = new AbortController();
    activeControllers.add(controller);
    const timeoutId = setTimeout(() => controller.abort(), remainingMs);
    try {
      const res = await fetch(
        `${GEMINI_API_BASE}/${cand.model}:generateContent?key=${encodeURIComponent(cand.key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      activeControllers.delete(controller);

      if (res.ok) {
        const data = (await res.json()) as any;
        const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
        const rawText = parts
          .filter((p) => !p?.thought && typeof p?.text === "string")
          .map((p) => p.text)
          .join("")
          .trim();
        const text = stripThinkingTags(rawText);
        if (text.length > 0) {
          return {
            text,
            model: `google/${cand.model.replace(/^models\//, "")}`,
            family: "gemini_flash",
            promptTokens: data?.usageMetadata?.promptTokenCount ?? null,
            completionTokens: data?.usageMetadata?.candidatesTokenCount ?? null,
            latencyMs: Date.now() - startedAt,
            keyRotated: attemptIdx > 0,
          };
        }
        markGeminiCooldown(cand.key, cand.model, 500, "empty_response");
        return null;
      }

      const errText = await res.text().catch(() => "");
      markGeminiCooldown(cand.key, cand.model, res.status, errText);
      return null;
    } catch {
      clearTimeout(timeoutId);
      activeControllers.delete(controller);
      // Only cool down if this candidate wasn't aborted because a faster hedge already won
      if (Date.now() - geminiStartedAt >= totalBudgetMs - 100) {
        markGeminiCooldown(cand.key, cand.model, 408, "timeout");
      }
      return null;
    }
  };

  // Race candidates with staggered launches: next candidate fires immediately on fast failure OR after hedgeDelayMs
  return await new Promise<FamilyCallResult | null>((resolve) => {
    let settled = false;
    let nextIdx = 0;
    let inFlight = 0;
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    const deadlineTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (hedgeTimer) clearTimeout(hedgeTimer);
        abortAll();
        resolve(null);
      }
    }, totalBudgetMs);

    const finish = (result: FamilyCallResult | null) => {
      if (settled) return;
      settled = true;
      if (hedgeTimer) clearTimeout(hedgeTimer);
      clearTimeout(deadlineTimer);
      abortAll();
      resolve(result);
    };

    const launchNext = () => {
      if (settled || nextIdx >= candidates.length) return;
      if (totalBudgetMs - (Date.now() - geminiStartedAt) < 1500) {
        if (inFlight === 0) finish(null);
        return;
      }
      const idx = nextIdx++;
      const cand = candidates[idx];
      inFlight++;

      // Schedule staggered hedge for next candidate in case this one hits a Google free-tier tail stall
      if (hedgeTimer) clearTimeout(hedgeTimer);
      if (nextIdx < candidates.length) {
        const delay = cand.tier === "free" ? hedgeDelayMs : 4000;
        hedgeTimer = setTimeout(() => launchNext(), delay);
      }

      runCandidate(cand, idx).then((res) => {
        inFlight--;
        if (settled) return;
        if (res) {
          finish(res);
          return;
        }
        // Fast error (e.g. 429 in 300ms): immediately launch next candidate without waiting for hedgeDelayMs
        if (nextIdx < candidates.length) {
          if (hedgeTimer) clearTimeout(hedgeTimer);
          launchNext();
        } else if (inFlight === 0) {
          finish(null);
        }
      });
    };

    launchNext();
  });
}

/**
 * Resolves strictly FREE Groq keys (never touches paid keys or Gemini).
 */
async function resolveFreeGroqKeys(): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqKeys && now - cachedGroqKeys.ts < POOL_TTL_MS && cachedGroqKeys.keys.length > 0) {
    return cachedGroqKeys.keys;
  }

  const groqSet = new Set<string>(parseEnvKeyList("GROQ_API_KEYS"));

  try {
    const chatProv = await getActiveProvider().catch(() => null);
    if (chatProv && chatProv.provider === "groq") {
      // Strictly use freeKeys / budgetPoolKeys / apiKeys — NEVER paidPrimaryKey/paidSecondaryKey
      const candidates = [
        ...(chatProv.freeKeys ?? []),
        ...(chatProv.budgetPoolKeys ?? []),
        ...(chatProv.apiKeys ?? []),
      ];
      for (const k of candidates) {
        if (typeof k === "string" && k.startsWith("gsk_") && k.length >= 20) {
          groqSet.add(k);
        }
      }
    }
  } catch (err) {
    console.warn("[multi-family-pool] Warning reading Groq free pool:", err);
  }

  const keys = Array.from(groqSet);
  if (keys.length > 0) {
    cachedGroqKeys = { keys, ts: now };
  }
  return keys;
}

function stripThinkingTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 3.4);
}

/**
 * Trims overly verbose system prompt sections gracefully so requests NEVER hit
 * Groq 413 (Request Too Large for on-demand TPM ceiling), while ALWAYS keeping
 * the Neuro-Symbolic audit, top KB mark-scheme grounding, student essay, and
 * response JSON contract intact.
 */
function trimSectionAwareSystemPrompt(sys: string, targetLen: number): string {
  if (sys.length <= targetLen) return sys;

  // 1. Preserve any Neuro-Symbolic Causal-Graph Audit block verbatim
  const nsMatch = sys.match(/NEURO-SYMBOLIC CAUSAL-GRAPH AUDIT[\s\S]*?(?=\n\n(?:AUTHORITATIVE|Return ONLY|CRITICAL KNOWLEDGE BASE)|$)/);
  const nsBlock = nsMatch ? nsMatch[0].trim() : "";

  // 2. Preserve the top KB grounding block (compact up to 1100 chars so [S1]/[S2] mark schemes survive)
  const kbMatch = sys.match(/RETRIEVED CAMBRIDGE 9708 SYLLABUS & MARK SCHEME GROUNDING MATERIAL:[\s\S]*?(?=\n\n(?:CALIBRATION|NEURO-SYMBOLIC|AUTHORITATIVE|Return ONLY|CRITICAL KNOWLEDGE BASE)|$)/);
  const kbCompact = kbMatch ? kbMatch[0].trim().slice(0, 1100) : "";

  // Remove verbose middle blocks first (long calibration anchors / oversized KB snippets) before trimming core rules
  let reduced = sys;
  if (kbMatch && kbMatch[0].length > 1100) {
    reduced = reduced.replace(kbMatch[0], `${kbCompact}\n[...extra KB snippets compacted for TPM...]`);
  }
  if (reduced.length <= targetLen) return reduced;

  // Compact calibration anchor essay prose if present
  reduced = reduced.replace(
    /(CALIBRATION ANCHOR[\s\S]{0,600})[\s\S]*?(?=\n\n(?:NEURO-SYMBOLIC|AUTHORITATIVE|Return ONLY))/,
    "$1\n[...anchor body compacted for TPM...]\n",
  );
  if (reduced.length <= targetLen) return reduced;

  // Fallback: preserve head, protected Neuro-Symbolic + compact KB blocks, and tail JSON contract
  const reserved = [kbCompact, nsBlock].filter(Boolean).join("\n\n");
  const remainingBudget = Math.max(2000, targetLen - reserved.length - 80);
  const headLen = Math.floor(remainingBudget * 0.45);
  const tailLen = Math.floor(remainingBudget * 0.55);
  const head = reduced.slice(0, headLen);
  const tail = reduced.slice(-tailLen);

  // Avoid duplicating nsBlock if it is already inside tail
  const extraReserved = [
    kbCompact && !head.includes(kbCompact.slice(0, 60)) && !tail.includes(kbCompact.slice(0, 60)) ? kbCompact : "",
    nsBlock && !head.includes("NEURO-SYMBOLIC CAUSAL-GRAPH AUDIT") && !tail.includes("NEURO-SYMBOLIC CAUSAL-GRAPH AUDIT")
      ? nsBlock
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return extraReserved
    ? `${head}\n[...trimmed for TPM budget...]\n${extraReserved}\n\n${tail}`
    : `${head}\n[...trimmed for TPM budget...]\n${tail}`;
}

function fitMessagesToTpm(
  messages: ChatMessage[],
  tpmLimit: number,
  desiredMaxOut: number,
  maxOutCap = 2200,
): { messages: ChatMessage[]; maxTokens: number } {
  const maxOut = Math.min(desiredMaxOut, maxOutCap, Math.floor(tpmLimit * 0.34));
  const maxInTokens = tpmLimit - maxOut - 200;

  let totalIn = messages.reduce((sum, m) => sum + estimateTokens(m.content) + 12, 0);
  if (totalIn <= maxInTokens) {
    return { messages, maxTokens: maxOut };
  }

  // Trim system message middle only (ALWAYS preserve instructions head, Neuro-Symbolic, compact KB, and JSON RESPONSE_CONTRACT tail)
  const cloned = messages.map((m) => ({ ...m }));
  const sysIdx = cloned.findIndex((m) => m.role === "system");
  if (sysIdx >= 0) {
    const excessTokens = totalIn - maxInTokens;
    const excessChars = excessTokens * 3.5;
    const sys = cloned[sysIdx].content;
    const targetLen = Math.max(2600, Math.floor(sys.length - excessChars - 200));
    cloned[sysIdx].content = trimSectionAwareSystemPrompt(sys, targetLen);
    if (!/json/i.test(cloned[sysIdx].content)) {
      cloned[sysIdx].content += "\nRespond ONLY with a valid JSON object.";
    }
  }

  totalIn = cloned.reduce((sum, m) => sum + estimateTokens(m.content) + 12, 0);
  // If user message itself is oversized (e.g. 14,000-char essay failing over from 1M-ctx Gemini to Groq),
  // safely middle-trim user content so Groq NEVER returns 413 Request Too Large.
  if (totalIn > maxInTokens) {
    const userIdx = cloned.findIndex((m) => m.role === "user");
    if (userIdx >= 0 && cloned[userIdx].content.length > 3500) {
      const excessChars = Math.ceil((totalIn - maxInTokens) * 3.6);
      const userContent = cloned[userIdx].content;
      const targetUserLen = Math.max(3000, userContent.length - excessChars - 200);
      const headLen = Math.floor(targetUserLen * 0.62);
      const tailLen = Math.floor(targetUserLen * 0.38);
      cloned[userIdx].content = `${userContent.slice(0, headLen)}\n[...middle trimmed for TPM budget...]\n${userContent.slice(-tailLen)}`;
      totalIn = cloned.reduce((sum, m) => sum + estimateTokens(m.content) + 12, 0);
    }
  }
  const minFloor = Math.min(maxOut, 750);
  const safeMaxOut = Math.min(maxOut, Math.max(minFloor, tpmLimit - totalIn - 100));
  return { messages: cloned, maxTokens: safeMaxOut };
}

/**
 * Calls the requested orthogonal frontier model family with automatic key rotation,
 * cooldown circuit-breaking, and 2-cloud cross-provider failover (NVIDIA NIM <-> Groq).
 * Google Gemini is completely excluded from the grading pool.
 */
export async function callOrthogonalFamily(
  options: FamilyCallOptions,
): Promise<FamilyCallResult> {
  const startedAt = Date.now();

  // Any legacy "gemini_flash" caller is transparently rerouted to NVIDIA Super VL 120B -> Groq (0% Gemini!)
  const effectiveFamily: OrthogonalFamily =
    options.family === "gemini_flash" ? "nvidia_super_vl_120b" : options.family;

  // 1. Direct NVIDIA NIM Cloud (full uncompressed context, 550B / 120B-VL / 30B / MiniMax / Step-5)
  if (isNvidiaFamily(effectiveFamily)) {
    const nvidiaRes = await callNvidiaFamily(effectiveFamily, options, startedAt);
    if (nvidiaRes) return nvidiaRes;
    console.warn(`[multi-family-pool] NVIDIA family (${effectiveFamily}) unavailable; failing over to Groq pool.`);
  }

  const keys = await resolveFreeGroqKeys();
  if (keys.length === 0) {
    // Fail over to NVIDIA NIM if Groq keys are absent
    if (!isNvidiaFamily(effectiveFamily)) {
      const nvidiaFallback = await callNvidiaFamily("nvidia_super_vl_120b", options, startedAt);
      if (nvidiaFallback) return nvidiaFallback;
    }
    throw new Error("No NVIDIA NIM or free Groq API keys available in pool.");
  }

  const tryOrder: GroqFamily[] =
    effectiveFamily === "openai_120b" ||
    effectiveFamily === "nvidia_ultra_550b" ||
    effectiveFamily === "nvidia_super_vl_120b"
      ? ["openai_120b", "qwen_27b", "openai_20b"]
      : effectiveFamily === "qwen_27b"
        ? ["qwen_27b", "openai_120b", "openai_20b"]
        : ["openai_20b", "openai_120b", "qwen_27b"];

  let lastError = "Unknown Groq pool error";

  for (const fam of tryOrder) {
    const cfg = GROQ_FAMILY_CONFIG[fam];
    const resolvedModel = resolveGroqModel(fam);
    let fitted = fitMessagesToTpm(
      options.messages,
      cfg.tpmLimit,
      options.maxCompletionTokens ?? cfg.defaultMaxOut,
      cfg.maxOutCap,
    );

    const startIdx = rrCursor[fam] % keys.length;
    rrCursor[fam] = (rrCursor[fam] + 1) % keys.length;

    let keyRotated = false;
    let otpmAdjusted = false;
    // Try up to 2 sweeps ONLY if we hit a short 1-min TPM limit or strict JSON 400 (never re-sweep TPD-exhausted keys)
    for (let sweep = 0; sweep < 2; sweep++) {
      let sawShortTpm429 = false;
      let sawJson400 = false;
      let attemptedAnyKey = false;

      for (let attempt = 0; attempt < keys.length; attempt++) {
        const key = keys[(startIdx + attempt) % keys.length];
        if (isGroqPairCoolingDown(key, resolvedModel)) {
          continue; // 0ms skip of TPD-exhausted or dead (key, model) pair
        }

        if (attemptedAnyKey || sweep > 0) keyRotated = true;
        attemptedAnyKey = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeoutMs ?? 20000,
        );

        try {
          const body: Record<string, unknown> = {
            model: resolvedModel,
            messages: fitted.messages,
            temperature: options.temperature ?? 0.0,
            max_tokens: fitted.maxTokens,
          };
          // Keep OpenAI-OSS / Qwen reasoning concise so hidden <think> blocks never exhaust max_tokens and truncate JSON
          if (resolvedModel.startsWith("openai/gpt-oss")) {
            body.reasoning_effort = "low";
          } else if (resolvedModel.startsWith("qwen/") && options.json) {
            body.reasoning_effort = "none";
          }
          // Only attach strict json_object mode on sweep 0; if Groq throws 400 json_validate_failed,
          // sweep 1 retries without strict json_object so our robust extractFirstJsonObject handles it cleanly
          if (options.json && sweep === 0) {
            body.response_format = { type: "json_object" };
          }

          const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = (await res.json()) as any;
            const rawContent = data?.choices?.[0]?.message?.content ?? "";
            const text = stripThinkingTags(typeof rawContent === "string" ? rawContent : "");
            if (text.trim().length > 0) {
              return {
                text,
                model: resolvedModel,
                family: fam,
                promptTokens: data?.usage?.prompt_tokens ?? null,
                completionTokens: data?.usage?.completion_tokens ?? null,
                latencyMs: Date.now() - startedAt,
                keyRotated,
              };
            }
            lastError = `${fam} (200 empty content)`;
            continue;
          }

          const retryHeader = Number(res.headers.get("retry-after"));
          const retryAfterSec = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null;
          const errSnippet = (await res.text().catch(() => "")).slice(0, 220);
          lastError = `${fam} (${res.status}): ${errSnippet}`;

          if (res.status === 413) {
            // Payload too large for this family's TPM: break to next family immediately
            console.warn(`[multi-family-pool] ${fam} 413 TPM ceiling; switching family.`);
            break;
          }

          if (res.status === 429) {
            const kind = markGroqCooldown(key, resolvedModel, 429, errSnippet, retryAfterSec);
            if (kind === "otpm" && !otpmAdjusted) {
              // Dynamically drop max_tokens below Groq's reported OTPM limit and retry immediately
              const m = errSnippet.match(/Limit\s+(\d+)/i);
              const reportedLimit = m ? Number(m[1]) : 1000;
              fitted = { ...fitted, maxTokens: Math.max(600, Math.min(fitted.maxTokens - 200, reportedLimit - 80)) };
              otpmAdjusted = true;
              attempt--; // retry same key with reduced max_tokens
              continue;
            }
            if (kind === "tpm") {
              sawShortTpm429 = true;
            }
            // TPD or TPM on this key -> immediately hop to next non-cooled key
            continue;
          }

          if (res.status >= 500) {
            markGroqCooldown(key, resolvedModel, res.status, errSnippet);
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }

          if (res.status === 400 && /json/i.test(errSnippet) && sweep === 0) {
            // Groq strict json_object validation failed (e.g. truncated token): retry next sweep without response_format
            sawJson400 = true;
            console.warn(`[multi-family-pool] ${fam} strict JSON 400; retrying without response_format.`);
            break;
          }

          // 400/401/403/404 -> mark dead if auth/model error and switch family
          markGroqCooldown(key, resolvedModel, res.status, errSnippet);
          console.warn(`[multi-family-pool] ${lastError}`);
          break;
        } catch (err: any) {
          clearTimeout(timeoutId);
          markGroqCooldown(key, resolvedModel, 408, String(err?.message || err));
          lastError = `${fam} timeout/network: ${err?.message || err}`;
        }
      }

      if (!attemptedAnyKey) {
        // If keys are only in brief rolling 1-min TPM cooldown (<= 6s), wait once on sweep 0 before skipping family
        const shortestRem = sweep === 0 ? getShortestGroqCooldownMs(keys, resolvedModel) : null;
        if (shortestRem !== null && shortestRem <= 6000) {
          await new Promise((r) => setTimeout(r, shortestRem + 200));
          continue;
        }
        // Otherwise (daily TPD / dead keys) skip straight to next family in 0ms!
        break;
      }
      if (sweep === 0 && (sawShortTpm429 || sawJson400)) {
        if (sawShortTpm429 && !sawJson400) {
          const shortestRem = getShortestGroqCooldownMs(keys, resolvedModel);
          await new Promise((r) => setTimeout(r, Math.min(5500, (shortestRem ?? 2500) + 200)));
        }
      } else {
        break;
      }
    }
  }

  // Last-resort 2-cloud failover: if all Groq families fail, try NVIDIA NIM (NEVER Google Gemini)
  if (!isNvidiaFamily(effectiveFamily)) {
    const nvidiaFallback = await callNvidiaFamily("nvidia_super_vl_120b", options, startedAt);
    if (nvidiaFallback) return nvidiaFallback;
  }

  throw new Error(`[multi-family-pool] All Groq & NVIDIA orthogonal examiner families failed: ${lastError}`);
}
