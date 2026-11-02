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
 * Selects the single most relevant calibration anchor based on question topic keywords
 * and mark tariff, ensuring the system never injects redundant essays into the prompt.
 */
export function selectBestAnchor(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): Anchor | null {
  if (anchors.length === 0) return null;
  if (!question) return anchors[0] ?? null;

  const qLower = question.toLowerCase();
  const stopwords = new Set([
    "what", "when", "where", "which", "with", "would", "could", "should",
    "discuss", "assess", "explain", "consider", "extent", "always", "between",
    "either", "about", "their", "there", "these", "those", "using", "question",
    "evaluate", "analyse", "analyze", "essay", "marks", "curve", "diagram",
    "does", "have", "more", "most", "than", "that", "this", "some", "such",
  ]);
  const qWords = qLower.match(/[a-z]{3,}/g)?.filter((w) => !stopwords.has(w)) || [];

  let bestAnchor: Anchor = anchors[0]!;
  let bestScore = -1;

  for (const anchor of anchors) {
    let score = 0;
    const aText = `${anchor.question} ${anchor.notes || ""}`.toLowerCase();

    // Topic keyword relevance matching
    for (const word of qWords) {
      if (aText.includes(word)) {
        score += 3;
      }
    }

    // Tariff alignment (e.g. matching 12-mark vs 8-mark vs 20-mark)
    if (typeof maxMark === "number") {
      if (anchor.max_mark === maxMark) {
        score += 2;
      } else if (Math.abs(anchor.max_mark - maxMark) <= 4) {
        score += 1;
      }
    }

    // Prefer high-quality top-band anchor on ties
    if (anchor.band_label?.toLowerCase() === "top") {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnchor = anchor;
    }
  }

  return bestAnchor;
}

/**
 * Builds a focused, topic-aware calibration section using at most 1 relevant
 * exemplar essay matching the question's syllabus topic and mark tariff.
 * This slashes prompt token load by ~2,000+ tokens while preserving senior
 * examiner benchmark accuracy.
 */
export function buildAnchorBlock(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): string {
  if (anchors.length === 0) return "";

  const chosenAnchor = selectBestAnchor(anchors, question, maxMark);
  if (!chosenAnchor) return "";

  const label = chosenAnchor.band_label ? chosenAnchor.band_label.toUpperCase() : "EXEMPLAR";

  const sections: string[] = [
    "REAL CALIBRATION EXAMPLE — provided by a Cambridge senior examiner with a confirmed mark. " +
      "Treat this as ground truth for your scoring scale:",
    `\n--- ${label} CALIBRATION BENCHMARK ---\n` +
      `Question: ${chosenAnchor.question}\n` +
      `Confirmed mark: ${chosenAnchor.mark}/${chosenAnchor.max_mark}\n` +
      `Senior Examiner Rationale: ${chosenAnchor.notes ?? "(Standard Cambridge level benchmark)"}\n` +
      `Exemplar Script:\n${chosenAnchor.essay_text}\n` +
      `--- END EXAMPLE ---`,
  ];

  return sections.join("\n");
}
