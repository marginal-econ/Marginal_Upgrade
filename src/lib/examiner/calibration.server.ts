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

/**
 * Loads every active calibration anchor.
 * Prefers the server admin client to avoid issues with expired student session JWTs,
 * with graceful fallback to the passed client and safe error recovery so essay
 * grading never crashes if calibration anchors fail to load.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any>,
): Promise<Anchor[]> {
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

    if (!client) return [];

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
            return (retry.data ?? []) as Anchor[];
          }
        }
      } catch {}
    }

    if (error) {
      console.warn(`[calibration.server] Calibration anchors could not be loaded (${error.message}). Grading will proceed with standard rubrics.`);
      return [];
    }

    return (data ?? []) as Anchor[];
  } catch (err: any) {
    console.warn(`[calibration.server] Unexpected error fetching calibration anchors: ${err?.message || err}. Grading will proceed with standard rubrics.`);
    return [];
  }
}

/**
 * Build a few-shot calibration section from human-provided anchor essays,
 * grouped by band and capped so the prompt does not grow unbounded.
 * Returns "" for an empty list (nothing to inject) rather than a
 * near-empty header — callers check for that before appending.
 */
export function buildAnchorBlock(anchors: Anchor[]): string {
  if (anchors.length === 0) return "";

  const byBand = new Map<string, Anchor[]>();
  for (const anchor of anchors) {
    const band = anchor.band_label || "top";
    byBand.set(band, [...(byBand.get(band) ?? []), anchor]);
  }

  const sections: string[] = [
    "REAL CALIBRATION EXAMPLES — provided by a human expert, with a mark they " +
      "have confirmed is correct. Treat these as ground truth for your scoring " +
      "scale: if a new essay is of similar quality to one of these, it should " +
      "receive a similar mark, even at the top or bottom of the range.",
  ];

  for (const [band, bandAnchors] of byBand) {
    const label =
      band === "top" ? "TOP-BAND" : band === "bottom" ? "BOTTOM-BAND" : band.toUpperCase();
    for (const anchor of bandAnchors.slice(0, MAX_ANCHORS_PER_BAND)) {
      sections.push(
        `\n--- ${label} EXAMPLE ---\n` +
          `Question: ${anchor.question}\n` +
          `Confirmed mark: ${anchor.mark}/${anchor.max_mark}\n` +
          `Why it deserves this mark: ${anchor.notes ?? "(no additional notes provided)"}\n` +
          `Essay:\n${anchor.essay_text}\n` +
          `--- END EXAMPLE ---`,
      );
    }
  }

  return sections.join("\n");
}
