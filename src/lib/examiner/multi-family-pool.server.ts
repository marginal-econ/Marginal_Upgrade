/**
 * Marginal Engine V4 — Zero-Cost Orthogonal Groq Multi-Family Pool
 *
 * Strictly uses ONLY the FREE Groq key pool (zero Gemini, zero paid keys, zero
 * dead Mistral 402 hops) while achieving genuine cross-family diversity:
 *   - Family 1 ("openai_120b"): Groq `openai/gpt-oss-120b` (OpenAI 120B reasoning auditor, 8K TPM/key)
 *   - Family 2 ("qwen_27b"):    Groq `qwen/qwen3.8-27b`    (Alibaba Qwen 3.8 27B moderator, 6K TPM/key)
 *   - Family 3 ("openai_20b"):  Groq `openai/gpt-oss-20b`  (Ultra-fast OpenAI 20B backup)
 *
 * Includes automatic TPM budgeting (never breaches Groq 413 limits) and clean
 * 5-key round-robin rotation with brief 429 cooldown.
 */

import { readEnv } from "@/server/env";
import { getActiveProvider } from "../ai/active.server";
import type { ChatMessage } from "../ai.server";

export type OrthogonalFamily = "openai_120b" | "qwen_27b" | "openai_20b";

export type FamilyCallOptions = {
  family: OrthogonalFamily;
  messages: ChatMessage[];
  temperature?: number;
  maxCompletionTokens?: number;
  json?: boolean;
  userId?: string;
  feature?: string;
  timeoutMs?: number;
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

const FAMILY_CONFIG: Record<
  OrthogonalFamily,
  { model: string; tpmLimit: number; defaultMaxOut: number }
> = {
  openai_120b: { model: "openai/gpt-oss-120b", tpmLimit: 7600, defaultMaxOut: 1900 },
  qwen_27b: { model: "qwen/qwen3.8-27b", tpmLimit: 5700, defaultMaxOut: 1700 },
  openai_20b: { model: "openai/gpt-oss-20b", tpmLimit: 7600, defaultMaxOut: 1800 },
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const rrCursor: Record<OrthogonalFamily, number> = {
  openai_120b: 0,
  qwen_27b: 0,
  openai_20b: 0,
};

let cachedGroqKeys: { keys: string[]; ts: number } | null = null;
const POOL_TTL_MS = 5 * 60 * 1000;

function parseEnvKeyList(name: string): string[] {
  const raw = readEnv(name) || "";
  return raw
    .split(/[\n,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.startsWith("gsk_") && k.length >= 20);
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
): { messages: ChatMessage[]; maxTokens: number } {
  const maxOut = Math.min(desiredMaxOut, Math.floor(tpmLimit * 0.34));
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
  const safeMaxOut = Math.max(1200, Math.min(maxOut, tpmLimit - totalIn - 100));
  return { messages: cloned, maxTokens: safeMaxOut };
}

/**
 * Calls the requested orthogonal Groq model family using strictly FREE Groq keys.
 * Rotates across all 5 free keys, handles 429 cooldowns cleanly, and fails over
 * across orthogonal Groq families (never calls Gemini, never calls paid keys).
 */
export async function callOrthogonalFamily(
  options: FamilyCallOptions,
): Promise<FamilyCallResult> {
  const startedAt = Date.now();
  const keys = await resolveFreeGroqKeys();
  if (keys.length === 0) {
    throw new Error("No free Groq API keys available in pool.");
  }

  const tryOrder: OrthogonalFamily[] =
    options.family === "openai_120b"
      ? ["openai_120b", "qwen_27b", "openai_20b"]
      : options.family === "qwen_27b"
        ? ["qwen_27b", "openai_120b", "openai_20b"]
        : ["openai_20b", "openai_120b", "qwen_27b"];

  let lastError = "Unknown Groq pool error";

  for (const fam of tryOrder) {
    const cfg = FAMILY_CONFIG[fam];
    const fitted = fitMessagesToTpm(
      options.messages,
      cfg.tpmLimit,
      options.maxCompletionTokens ?? cfg.defaultMaxOut,
    );

    const startIdx = rrCursor[fam] % keys.length;
    rrCursor[fam] = (rrCursor[fam] + 1) % keys.length;

    let keyRotated = false;
    // Try up to 2 full sweeps of the 5 free keys if 429 rate-limited
    for (let sweep = 0; sweep < 2; sweep++) {
      let saw429Only = true;

      for (let attempt = 0; attempt < keys.length; attempt++) {
        const key = keys[(startIdx + attempt) % keys.length];
        if (attempt > 0 || sweep > 0) keyRotated = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeoutMs ?? 35000,
        );

        try {
          const body: Record<string, unknown> = {
            model: cfg.model,
            messages: fitted.messages,
            temperature: options.temperature ?? 0.0,
            max_tokens: fitted.maxTokens,
          };
          // Keep OpenAI-OSS / Qwen reasoning concise so hidden <think> blocks never exhaust max_tokens and truncate JSON
          if (cfg.model.startsWith("openai/gpt-oss")) {
            body.reasoning_effort = "low";
          } else if (cfg.model.startsWith("qwen/") && options.json) {
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
                model: cfg.model,
                family: fam,
                promptTokens: data?.usage?.prompt_tokens ?? null,
                completionTokens: data?.usage?.completion_tokens ?? null,
                latencyMs: Date.now() - startedAt,
                keyRotated,
              };
            }
          }

          const errSnippet = (await res.text().catch(() => "")).slice(0, 160);
          lastError = `${fam} (${res.status}): ${errSnippet}`;

          if (res.status === 413) {
            // Payload too large for this family's TPM: break to next family immediately
            saw429Only = false;
            console.warn(`[multi-family-pool] ${fam} 413 TPM ceiling; switching family.`);
            break;
          }

          if (res.status === 429) {
            // Rate limit on this key: immediately hop to next free key
            continue;
          }

          if (res.status >= 500) {
            saw429Only = false;
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }

          if (res.status === 400 && /json/i.test(errSnippet) && sweep === 0) {
            // Groq strict json_object validation failed (e.g. truncated token): retry next sweep without response_format
            saw429Only = false;
            console.warn(`[multi-family-pool] ${fam} strict JSON 400; retrying without response_format.`);
            break;
          }

          // 400/401/403 -> switch family
          saw429Only = false;
          console.warn(`[multi-family-pool] ${lastError}`);
          break;
        } catch (err: any) {
          clearTimeout(timeoutId);
          saw429Only = false;
          lastError = `${fam} timeout/network: ${err?.message || err}`;
        }
      }

      if (sweep === 0 && (saw429Only || /json/i.test(lastError))) {
        if (saw429Only) {
          await new Promise((r) => setTimeout(r, 4000));
        }
      } else {
        break;
      }
    }
  }

  throw new Error(`[multi-family-pool] All free Groq families failed: ${lastError}`);
}
