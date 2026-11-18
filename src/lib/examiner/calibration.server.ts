import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_ANCHORS_PER_BAND } from "./config";

export type Anchor = {
  question: string;
  essay_text: string;
  mark: number;
  max_mark: number;
  band_label: string;
  notes: string | null;
};

let cachedAnchors: { data: Anchor[]; timestamp: number } | null = null;
const ANCHOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Loads every active calibration anchor.
 * Prefers the server admin client to avoid issues with expired student session JWTs,
 * with memory cache fallback and safe error recovery so essay grading never misses
 * calibration anchors.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any>,
): Promise<Anchor[]> {
  const now = Date.now();
  if (cachedAnchors && now - cachedAnchors.timestamp < ANCHOR_CACHE_TTL_MS && cachedAnchors.data.length > 0) {
    return cachedAnchors.data;
  }

  try {
    let client = supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      if (supabaseAdmin) {
        client = supabaseAdmin;
      }
    } catch {
      // Fall back to provided client
    }

    if (!client) return cachedAnchors?.data ?? [];

    let { data, error } = await client
      .from("calibration_anchors")
      .select("question, essay_text, mark, max_mark, band_label, notes")
      .eq("active", true)
      .order("created_at", { ascending: true });

    // If an auth or JWT error occurred on the user client, try with supabaseAdmin explicitly
    if (error && (error.message?.includes("JWT") || error.code === "PGRST301")) {
      try {
        const { supabaseAdmin } = await import("@/integrations/backend/client.server");
        if (supabaseAdmin && client !== supabaseAdmin) {
          const retry = await supabaseAdmin
            .from("calibration_anchors")
            .select("question, essay_text, mark, max_mark, band_label, notes")
            .eq("active", true)
            .order("created_at", { ascending: true });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        }
      } catch {}
    }

    if (error) {
      console.warn(`[calibration.server] Calibration anchors could not be loaded (${error.message}). Using cache if available.`);
      return cachedAnchors?.data ?? [];
    }

    const result = (data ?? []) as Anchor[];
    if (result.length > 0) {
      cachedAnchors = { data: result, timestamp: now };
    }
    return result;
  } catch (err: any) {
    console.warn(`[calibration.server] Unexpected error fetching calibration anchors: ${err?.message || err}.`);
    return cachedAnchors?.data ?? [];
  }
}

/**
 * Selects the top 1 or 2 most relevant calibration anchors based on question topic keywords
 * and mark tariff, ensuring the system strictly attaches only 1 or 2 anchors (never 18)
 * to keep prompts laser-focused and token-efficient.
 */
export function selectBestAnchors(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
  limit = 2,
): Anchor[] {
  if (anchors.length === 0) return [];

  // Strictly separate A-Level Paper 4 (>= 20m) anchors from AS-Level Paper 2 (<= 12m) anchors
  // so 20-mark essays are never calibrated against AS-level 8m/12m scripts (and vice versa).
  let pool = anchors;
  if (typeof maxMark === "number") {
    if (maxMark >= 20) {
      const a2Anchors = anchors.filter((a) => a.max_mark >= 20);
      pool = a2Anchors;
    } else if (maxMark <= 12) {
      const exactTariff = anchors.filter((a) => a.max_mark === maxMark);
      const asAnchors = anchors.filter((a) => a.max_mark <= 12);
      pool = exactTariff.length > 0 ? exactTariff : asAnchors;
    }
  }
  if (pool.length === 0) return [];
  if (!question) return pool.slice(0, Math.min(limit, 2));

  const qLower = question.toLowerCase();
  const stopwords = new Set([
    "what", "when", "where", "which", "with", "would", "could", "should",
    "discuss", "assess", "explain", "consider", "extent", "always", "between",
    "either", "about", "their", "there", "these", "those", "using", "question",
    "evaluate", "analyse", "analyze", "essay", "marks", "curve", "diagram",
    "does", "have", "more", "most", "than", "that", "this", "some", "such",
  ]);
  const qWords = qLower.match(/[a-z]{3,}/g)?.filter((w) => !stopwords.has(w)) || [];

  const scored = pool.map((anchor) => {
    let score = 0;
    const aText = `${anchor.question} ${anchor.notes || ""}`.toLowerCase();

    // Topic keyword relevance matching
    for (const word of qWords) {
      if (aText.includes(word)) {
        score += 3;
      }
    }

    // Exact tariff alignment bonus
    if (typeof maxMark === "number" && anchor.max_mark === maxMark) {
      score += 4;
    }

    // Prefer high-quality top-band anchor on ties
    if (anchor.band_label?.toLowerCase() === "top") {
      score += 0.5;
    }

    return { anchor, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const maxAnchors = Math.max(1, Math.min(2, limit));
  return scored.slice(0, maxAnchors).map((s) => s.anchor);
}

/**
 * Selects the single most relevant calibration anchor.
 */
export function selectBestAnchor(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): Anchor | null {
  const chosen = selectBestAnchors(anchors, question, maxMark, 1);
  return chosen[0] ?? null;
}

/**
 * Builds a focused, topic-aware calibration section using at most 1 or 2 relevant
 * exemplar essays matching the question's syllabus topic and mark tariff.
 */
export function buildAnchorBlock(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): string {
  if (anchors.length === 0) return "";

  const chosenAnchors = selectBestAnchors(anchors, question, maxMark, 2);
  if (chosenAnchors.length === 0) return "";

  const sections: string[] = [
    `REAL CALIBRATION ${chosenAnchors.length === 1 ? "EXAMPLE" : "EXAMPLES"} — provided by Cambridge senior examiners with confirmed marks. ` +
      "Treat this as ground truth for your scoring scale:",
  ];

  for (const anchor of chosenAnchors) {
    const label = anchor.band_label ? anchor.band_label.toUpperCase() : "EXEMPLAR";
    const trimmedScript =
      anchor.essay_text.length > 2400
        ? `${anchor.essay_text.slice(0, 2400)}... [truncated]`
        : anchor.essay_text;
    sections.push(
      `\n--- ${label} CALIBRATION BENCHMARK ---\n` +
        `Question: ${anchor.question}\n` +
        `Confirmed mark: ${anchor.mark}/${anchor.max_mark}\n` +
        `Senior Examiner Rationale: ${anchor.notes ?? "(Standard Cambridge level benchmark)"}\n` +
        `Exemplar Script:\n${trimmedScript}\n` +
        `--- END EXAMPLE ---`,
    );
  }

  return sections.join("\n");
}
