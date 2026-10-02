import { providerMeta } from "./providers";

export type ProviderConfig = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  label: string;
};

let chatCache: { value: ProviderConfig | null; at: number } | null = null;
let embeddingCache: { value: ProviderConfig | null; at: number } | null = null;
let visionCache: { value: ProviderConfig | null; at: number } | null = null;
const TTL_MS = 20_000;

export function normaliseConfig(row: {
  provider: string;
  api_key: string;
  base_url: string | null;
  model: string;
  label: string;
}): ProviderConfig {
  const meta = providerMeta(row.provider);
  return {
    provider: row.provider,
    apiKey: row.api_key,
    baseUrl: (row.base_url?.trim() || meta.baseUrl).replace(/\/+$/, ""),
    model: row.model,
    label: row.label,
  };
}

/** The admin-selected chat/marking provider override, or null to use built-in Lovable AI. */
export async function getActiveProvider(): Promise<ProviderConfig | null> {
  if (chatCache && Date.now() - chatCache.at < TTL_MS) return chatCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "chat")
      .maybeSingle();
    if (data && data.provider !== "lovable" && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null; // Never block AI because the override lookup failed.
  }

  chatCache = { value, at: Date.now() };
  return value;
}

/**
 * The admin-selected embedding provider override, or null to use the
 * legacy saved-key priority fallback in ai.server.ts's embed(). Kept as a
 * fully separate cache/lookup from getActiveProvider() so switching the
 * chat model can never accidentally change what embeds the knowledge base,
 * or vice versa.
 */
export async function getActiveEmbeddingProvider(): Promise<ProviderConfig | null> {
  if (embeddingCache && Date.now() - embeddingCache.at < TTL_MS) return embeddingCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "embedding")
      .maybeSingle();
    if (data && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null;
  }

  embeddingCache = { value, at: Date.now() };
  return value;
}

/**
 * The admin-selected vision provider override, or null to fall back to
 * whatever visionChat()'s own fallback chain does (active chat provider,
 * then the built-in gateway). Fully separate cache/lookup from both
 * getActiveProvider() and getActiveEmbeddingProvider() — this is what
 * powers handwriting transcription and MCQ/essay past-paper extraction
 * (reading real diagrams/figures off the page), and an admin should be
 * able to point those at a stronger/cheaper vision model without touching
 * what marks essays or what embeds the knowledge base.
 */
export async function getActiveVisionProvider(): Promise<ProviderConfig | null> {
  if (visionCache && Date.now() - visionCache.at < TTL_MS) return visionCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "vision")
      .maybeSingle();
    if (data && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null; // Never block OCR/extraction because the override lookup failed.
  }

  visionCache = { value, at: Date.now() };
  return value;
}

/** Look up one saved provider key by id, for per-call embedding overrides. */
export async function getProviderConfigById(id: string): Promise<ProviderConfig | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("id", id)
      .maybeSingle();
    if (!data || !data.api_key) return null;
    return normaliseConfig(data);
  } catch {
    return null;
  }
}

export function clearActiveProviderCache() {
  chatCache = null;
  embeddingCache = null;
  visionCache = null;
  aiGatewayCache = null;
}

export type AiGatewayMode = "max" | "balanced" | "economy";

export type AiGatewaySettings = {
  /** The admin's site-wide pause switch. false = every chat() call fails fast. */
  enabled: boolean;
  mode: AiGatewayMode;
};

const AI_MODE_BY_INT: Record<number, AiGatewayMode> = { 0: "max", 1: "balanced", 2: "economy" };

let aiGatewayCache: { value: AiGatewaySettings; at: number } | null = null;
/** Short TTL: an admin flipping the pause switch during a credits emergency
 *  should take effect in seconds, not the 20s used for provider overrides. */
const AI_GATEWAY_TTL_MS = 5_000;

/**
 * The admin's global AI controls, read straight off app_settings (service
 * role, bypasses RLS — see 20260919120000_ai_gateway_controls.sql). Cached
 * briefly so every single chat() call doesn't cost its own round trip; on
 * any lookup failure this defaults to fully enabled/max quality so a
 * transient DB hiccup can never itself take AI offline.
 */
export async function getAiGatewaySettings(): Promise<AiGatewaySettings> {
  if (aiGatewayCache && Date.now() - aiGatewayCache.at < AI_GATEWAY_TTL_MS) {
    return aiGatewayCache.value;
  }

  let value: AiGatewaySettings = { enabled: true, mode: "max" };
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("key, int_value")
      .in("key", ["ai_enabled", "ai_mode"]);
    const row = (data ?? []) as { key: string; int_value: number }[];
    const enabledRow = row.find((r) => r.key === "ai_enabled");
    const modeRow = row.find((r) => r.key === "ai_mode");
    value = {
      enabled: enabledRow ? enabledRow.int_value !== 0 : true,
      mode: modeRow ? (AI_MODE_BY_INT[modeRow.int_value] ?? "max") : "max",
    };
  } catch {
    value = { enabled: true, mode: "max" }; // Never block AI because the settings lookup failed.
  }

  aiGatewayCache = { value, at: Date.now() };
  return value;
}
