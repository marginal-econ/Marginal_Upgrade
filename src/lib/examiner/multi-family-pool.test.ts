import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isGeminiEnabled,
  isGeminiPairCoolingDown,
  isGroqPairCoolingDown,
  isNvidiaEnabled,
  isNvidiaPairCoolingDown,
  markGeminiCooldown,
  markGroqCooldown,
  markNvidiaCooldown,
  resetGeminiCooldownsForTests,
  resetGroqCooldownsForTests,
  resetNvidiaCooldownsForTests,
  resolveGeminiModelChain,
  resolveGroqModel,
  resolveNvidiaModel,
} from "./multi-family-pool.server";

describe("multi-family-pool circuit breakers & hot-swappable model chains", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const trackedKeys = [
    "GEMINI_ENABLED",
    "GEMINI_MODEL_CHAIN",
    "GEMINI_PAID_MODEL_CHAIN",
    "GROQ_MODEL_PRIMARY",
    "GROQ_MODEL_SECONDARY",
    "GROQ_MODEL_FAST",
    "NVIDIA_ENABLED",
    "NVIDIA_MODEL_ULTRA",
    "NVIDIA_MODEL_SUPER_VL",
    "NVIDIA_MODEL_LIGHTNING",
    "NVIDIA_MODEL_MINIMAX",
    "NVIDIA_MODEL_STEP",
  ];

  beforeEach(() => {
    resetGeminiCooldownsForTests();
    resetGroqCooldownsForTests();
    resetNvidiaCooldownsForTests();
    for (const k of trackedKeys) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    resetGeminiCooldownsForTests();
    resetGroqCooldownsForTests();
    resetNvidiaCooldownsForTests();
    for (const k of trackedKeys) {
      if (savedEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = savedEnv[k];
      }
    }
  });

  it("cools down only the rate-limited (key, model) pair on 429 RPM for 10 minutes", () => {
    const t0 = 1_700_000_000_000;
    const keyA = "AQ.test-key-alpha-12345678";
    const keyB = "AQ.test-key-bravo-87654321";

    markGeminiCooldown(keyA, "models/gemini-3.6-flash", 429, "Rate limit exceeded", t0);

    // Same (key, model) cools down for 10m
    expect(isGeminiPairCoolingDown(keyA, "models/gemini-3.6-flash", t0 + 1000)).toBe(true);
    expect(isGeminiPairCoolingDown(keyA, "models/gemini-3.6-flash", t0 + 9 * 60_000)).toBe(true);
    expect(isGeminiPairCoolingDown(keyA, "models/gemini-3.6-flash", t0 + 10 * 60_000 + 1)).toBe(false);

    // Different model on same key and different key on same model remain immediately available
    expect(isGeminiPairCoolingDown(keyA, "models/gemini-3.5-flash", t0 + 1000)).toBe(false);
    expect(isGeminiPairCoolingDown(keyB, "models/gemini-3.6-flash", t0 + 1000)).toBe(false);
  });

  it("cools down for 60 minutes when 429 mentions free-tier or daily RPD exhaustion", () => {
    const t0 = 1_700_000_000_000;
    const key = "AQ.test-key-daily-11112222";

    markGeminiCooldown(key, "models/gemini-3.6-flash", 429, "Quota exceeded for free_tier_requests per day", t0);

    expect(isGeminiPairCoolingDown(key, "models/gemini-3.6-flash", t0 + 55 * 60_000)).toBe(true);
    expect(isGeminiPairCoolingDown(key, "models/gemini-3.6-flash", t0 + 60 * 60_000 + 1)).toBe(false);
  });

  it("blacklists dead keys (401/402/403) across ALL models for 24h without affecting other keys", () => {
    const t0 = 1_700_000_000_000;
    const deadKey = "AQ.test-key-dead-99990000";
    const goodKey = "AQ.test-key-good-33334444";

    markGeminiCooldown(deadKey, "models/gemini-3.6-flash", 402, "Credits depleted", t0);

    expect(isGeminiPairCoolingDown(deadKey, "models/gemini-3.6-flash", t0 + 1000)).toBe(true);
    expect(isGeminiPairCoolingDown(deadKey, "models/gemini-3.5-flash", t0 + 1000)).toBe(true);
    expect(isGeminiPairCoolingDown(deadKey, "models/gemini-3.1-flash-lite", t0 + 23 * 3600_000)).toBe(true);
    expect(isGeminiPairCoolingDown(deadKey, "models/gemini-3.6-flash", t0 + 24 * 3600_000 + 1)).toBe(false);

    expect(isGeminiPairCoolingDown(goodKey, "models/gemini-3.6-flash", t0 + 1000)).toBe(false);
  });

  it("applies 24h cooldown on 404 deprecated model and 90s brief cooldown on 5xx/timeout", () => {
    const t0 = 1_700_000_000_000;
    const key = "AQ.test-key-misc-55556666";

    markGeminiCooldown(key, "models/gemini-2.5-flash", 404, "Not found", t0);
    expect(isGeminiPairCoolingDown(key, "models/gemini-2.5-flash", t0 + 12 * 3600_000)).toBe(true);
    expect(isGeminiPairCoolingDown(key, "models/gemini-3.6-flash", t0 + 1000)).toBe(false);

    markGeminiCooldown(key, "models/gemini-3.6-flash", 408, "timeout", t0);
    expect(isGeminiPairCoolingDown(key, "models/gemini-3.6-flash", t0 + 60_000)).toBe(true);
    expect(isGeminiPairCoolingDown(key, "models/gemini-3.6-flash", t0 + 91_000)).toBe(false);
  });

  it("resolves default and hot-swappable GEMINI_MODEL_CHAIN / GEMINI_PAID_MODEL_CHAIN overrides", () => {
    expect(resolveGeminiModelChain("free")).toEqual([
      "models/gemini-3.6-flash",
      "models/gemini-3.5-flash",
      "models/gemini-3-flash-preview",
    ]);
    expect(resolveGeminiModelChain("paid")).toEqual([
      "models/gemini-3.6-flash",
      "models/gemini-3.8-flash",
      "models/gemini-3-flash-preview",
    ]);

    process.env.GEMINI_MODEL_CHAIN = "gemini-3.1-flash-lite, models/gemini-3.5-flash; gemini-3-flash-preview";
    expect(resolveGeminiModelChain("free")).toEqual([
      "models/gemini-3.1-flash-lite",
      "models/gemini-3.5-flash",
      "models/gemini-3-flash-preview",
    ]);
    // Paid falls back to GEMINI_MODEL_CHAIN if GEMINI_PAID_MODEL_CHAIN isn't explicitly set
    expect(resolveGeminiModelChain("paid")).toEqual([
      "models/gemini-3.1-flash-lite",
      "models/gemini-3.5-flash",
      "models/gemini-3-flash-preview",
    ]);

    process.env.GEMINI_PAID_MODEL_CHAIN = "gemini-3.8-flash, gemini-3.1-pro-preview";
    expect(resolveGeminiModelChain("paid")).toEqual([
      "models/gemini-3.8-flash",
      "models/gemini-3.1-pro-preview",
    ]);
  });

  it("cools down Groq TPD-exhausted keys cleanly while leaving other models/keys active", () => {
    const t0 = 1_700_000_000_000;
    const keyA = "gsk_testGroqAlpha11112222";
    const keyB = "gsk_testGroqBravo33334444";

    // Daily TPD with retry-after=900s -> 15m cooldown on (keyA, openai/gpt-oss-120b) only
    const kindTpd = markGroqCooldown(
      keyA,
      "openai/gpt-oss-120b",
      429,
      "Rate limit reached on tokens per day (TPD): Limit 200000",
      900,
      t0,
    );
    expect(kindTpd).toBe("tpd");
    expect(isGroqPairCoolingDown(keyA, "openai/gpt-oss-120b", t0 + 10 * 60_000)).toBe(true);
    expect(isGroqPairCoolingDown(keyA, "openai/gpt-oss-120b", t0 + 15 * 60_000 + 1)).toBe(false);
    // Other model on keyA and same model on keyB stay immediately available
    expect(isGroqPairCoolingDown(keyA, "qwen/qwen3.8-27b", t0 + 1000)).toBe(false);
    expect(isGroqPairCoolingDown(keyB, "openai/gpt-oss-120b", t0 + 1000)).toBe(false);

    // Permanent "Request too large" OTPM error classifies as "otpm" (shrinks max_tokens immediately)
    const kindOtpm = markGroqCooldown(
      keyA,
      "qwen/qwen3.8-27b",
      429,
      "Request too large on output tokens per minute (OTPM): Limit 1000",
      null,
      t0,
    );
    expect(kindOtpm).toBe("otpm");
    expect(isGroqPairCoolingDown(keyA, "qwen/qwen3.8-27b", t0 + 1000)).toBe(false);

    // Rolling 1-minute OTPM ("Rate limit reached ... Used 695, Requested 720") classifies as short "tpm" (5s default)
    const kindRollingOtpm = markGroqCooldown(
      keyA,
      "qwen/qwen3.8-27b",
      429,
      "Rate limit reached on output tokens per minute (OTPM): Limit 1000, Used 695, Requested 720",
      null,
      t0,
    );
    expect(kindRollingOtpm).toBe("tpm");
    expect(isGroqPairCoolingDown(keyA, "qwen/qwen3.8-27b", t0 + 3_000)).toBe(true);
    expect(isGroqPairCoolingDown(keyA, "qwen/qwen3.8-27b", t0 + 6_000)).toBe(false);

    // Short TPM error cools down briefly (5s default)
    const kindTpm = markGroqCooldown(keyB, "openai/gpt-oss-120b", 429, "Rate limit reached on tokens per minute (TPM)", null, t0);
    expect(kindTpm).toBe("tpm");
    expect(isGroqPairCoolingDown(keyB, "openai/gpt-oss-120b", t0 + 3_000)).toBe(true);
    expect(isGroqPairCoolingDown(keyB, "openai/gpt-oss-120b", t0 + 6_000)).toBe(false);
  });

  it("keeps Gemini disabled by default in V7 Groq+NVIDIA pool and supports GROQ_MODEL_* env overrides", () => {
    expect(isGeminiEnabled()).toBe(false);
    process.env.GEMINI_ENABLED = "true";
    expect(isGeminiEnabled()).toBe(false);
    process.env.GEMINI_ENABLED = "force";
    expect(isGeminiEnabled()).toBe(true);
    process.env.GEMINI_ENABLED = "false";
    expect(isGeminiEnabled()).toBe(false);

    expect(resolveGroqModel("openai_120b")).toBe("openai/gpt-oss-120b");
    expect(resolveGroqModel("qwen_27b")).toBe("qwen/qwen3.8-27b");
    expect(resolveGroqModel("openai_20b")).toBe("openai/gpt-oss-20b");

    process.env.GROQ_MODEL_PRIMARY = "llama-3.3-70b-versatile";
    expect(resolveGroqModel("openai_120b")).toBe("llama-3.3-70b-versatile");
  });

  it("supports NVIDIA NIM V7 circuit-breakers, 410 deprecation blacklist, kill-switch, and model overrides", () => {
    const t0 = 1_700_000_000_000;
    const keyA = "nvapi-testNvidiaAlpha11112222";
    const keyB = "nvapi-testNvidiaBravo33334444";

    expect(isNvidiaEnabled()).toBe(true);
    process.env.NVIDIA_ENABLED = "false";
    expect(isNvidiaEnabled()).toBe(false);
    process.env.NVIDIA_ENABLED = "true";
    expect(isNvidiaEnabled()).toBe(true);

    expect(resolveNvidiaModel("nvidia_ultra_550b")).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(resolveNvidiaModel("nvidia_super_vl_120b")).toBe("nvidia/nemotron-3.5-super-vl-120b-a12b");
    expect(resolveNvidiaModel("nvidia_lightning_30b")).toBe("nvidia/nemotron-3.5-lightning-30b-a3b");
    expect(resolveNvidiaModel("minimax_flash")).toBe("minimaxai/minimax-m3.1-flash");
    expect(resolveNvidiaModel("step_5")).toBe("stepfun-ai/step-5-preview");

    process.env.NVIDIA_MODEL_ULTRA = "nvidia/nemotron-4-ultra";
    expect(resolveNvidiaModel("nvidia_ultra_550b")).toBe("nvidia/nemotron-4-ultra");

    // 429 RPM cools only that (key, model) briefly (5s default)
    expect(markNvidiaCooldown(keyA, "nvidia/nemotron-3-ultra-550b-a55b", 429, "RPM limit", null, t0)).toBe("rpm");
    expect(isNvidiaPairCoolingDown(keyA, "nvidia/nemotron-3-ultra-550b-a55b", t0 + 3_000)).toBe(true);
    expect(isNvidiaPairCoolingDown(keyA, "nvidia/nemotron-3-ultra-550b-a55b", t0 + 6_000)).toBe(false);
    expect(isNvidiaPairCoolingDown(keyA, "minimaxai/minimax-m3.1-flash", t0 + 1_000)).toBe(false);
    expect(isNvidiaPairCoolingDown(keyB, "nvidia/nemotron-3-ultra-550b-a55b", t0 + 1_000)).toBe(false);

    // 410 Gone blacklists model for 24h; 401 blacklists entire key for 24h
    expect(markNvidiaCooldown(keyA, "openai/gpt-oss-120b", 410, "Gone", null, t0)).toBe("dead");
    expect(isNvidiaPairCoolingDown(keyA, "openai/gpt-oss-120b", t0 + 12 * 3600_000)).toBe(true);
    expect(markNvidiaCooldown(keyB, "minimaxai/minimax-m3.1-flash", 401, "Unauthorized", null, t0)).toBe("dead");
    expect(isNvidiaPairCoolingDown(keyB, "nvidia/nemotron-3-ultra-550b-a55b", t0 + 12 * 3600_000)).toBe(true);
  });
});
