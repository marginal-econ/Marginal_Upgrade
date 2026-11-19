import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isMarginalAdmin } from "@/lib/auth-admin";

export type ShowcaseAoScore = {
  awarded: number;
  out_of: number;
  comment?: string;
};

export type ShowcaseAoBreakdown = {
  knowledge?: ShowcaseAoScore;
  analysis?: ShowcaseAoScore;
  evaluation?: ShowcaseAoScore;
};

export type ShowcaseGrading = {
  band?: string;
  examiner_summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  actionable_feedback?: string[];
  ao_breakdown?: ShowcaseAoBreakdown;
  confidence?: number;
};

export type ShowcaseEssayItem = {
  essay_id: string;
  version_id: string;
  question: string;
  max_mark: number;
  total_mark: number;
  ao1_awarded: number | null;
  ao2_awarded: number | null;
  ao3_awarded: number | null;
  essay_text: string;
  grading: ShowcaseGrading | null;
  topic_id: string | null;
  topic_name: string | null;
  author_initials: string;
  showcased_at: string;
  is_hidden?: boolean;
  is_removed?: boolean;
  source?: "student_auto" | "teacher_model" | "cambridge_model" | "admin_added";
};

export type ShowcaseModerationData = {
  hidden_ids: string[];
  removed_ids: string[];
  custom_exemplars: ShowcaseEssayItem[];
};

// Edge-resilient in-memory cache with short TTL backed by persistent database storage
let cachedModeration: ShowcaseModerationData | null = null;
let cachedModerationAt = 0;
const CACHE_TTL_MS = 15_000;

async function loadShowcaseModeration(client: any): Promise<ShowcaseModerationData> {
  const now = Date.now();
  if (cachedModeration && now - cachedModerationAt < CACHE_TTL_MS) {
    return cachedModeration;
  }

  const result: ShowcaseModerationData = {
    hidden_ids: [],
    removed_ids: [],
    custom_exemplars: [],
  };

  // 1. Primary Store: definitions table key '__SYS_SHOWCASE_MODERATION__'
  try {
    const { data: defRow, error: defErr } = await client
      .from("definitions")
      .select("definition_text")
      .eq("term", "__SYS_SHOWCASE_MODERATION__")
      .maybeSingle();

    if (!defErr && defRow?.definition_text) {
      const parsed = JSON.parse(defRow.definition_text);
      if (parsed && typeof parsed === "object") {
        result.hidden_ids = Array.isArray(parsed.hidden_ids) ? parsed.hidden_ids : [];
        result.removed_ids = Array.isArray(parsed.removed_ids) ? parsed.removed_ids : [];
        result.custom_exemplars = Array.isArray(parsed.custom_exemplars) ? parsed.custom_exemplars : [];
        cachedModeration = result;
        cachedModerationAt = now;
        return result;
      }
    }
  } catch (err) {
    console.warn("Failed reading showcase moderation from definitions table:", err);
  }

  // 2. Secondary Store: site_settings table (JSONB column 'value.showcase_moderation')
  try {
    const { data: settingsRow, error: sErr } = await client
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    if (!sErr && settingsRow?.value && typeof settingsRow.value === "object") {
      const mod = (settingsRow.value as any).showcase_moderation;
      if (mod && typeof mod === "object") {
        result.hidden_ids = Array.isArray(mod.hidden_ids) ? mod.hidden_ids : [];
        result.removed_ids = Array.isArray(mod.removed_ids) ? mod.removed_ids : [];
        result.custom_exemplars = Array.isArray(mod.custom_exemplars) ? mod.custom_exemplars : [];
        cachedModeration = result;
        cachedModerationAt = now;
        return result;
      }
    }
  } catch (err) {
    console.warn("Failed reading showcase moderation from site_settings table:", err);
  }

  cachedModeration = result;
  cachedModerationAt = now;
  return result;
}

async function saveShowcaseModeration(client: any, data: ShowcaseModerationData): Promise<void> {
  // Update cache immediately
  cachedModeration = data;
  cachedModerationAt = Date.now();

  const payloadStr = JSON.stringify(data);

  // 1. Primary: Save to definitions table
  try {
    const { data: existing } = await client
      .from("definitions")
      .select("id")
      .eq("term", "__SYS_SHOWCASE_MODERATION__")
      .maybeSingle();

    if (existing?.id) {
      await client
        .from("definitions")
        .update({
          definition_text: payloadStr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await client.from("definitions").insert({
        term: "__SYS_SHOWCASE_MODERATION__",
        definition_text: payloadStr,
        category: "system_config",
        source_label: "admin_showcase_moderation",
      });
    }
  } catch (err) {
    console.warn("Failed saving showcase moderation to definitions table:", err);
  }

  // 2. Secondary: Save to site_settings table
  try {
    const { data: row } = await client
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();
    const existingVal = row?.value && typeof row.value === "object" ? row.value : {};
    await client.from("site_settings").upsert({
      id: 1,
      value: {
        ...existingVal,
        showcase_moderation: data,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed saving showcase moderation to site_settings table:", err);
  }
}

// Built-in Cambridge exemplar storage (AI model answers removed in favor of real student distinction submissions)
const CAMBRIDGE_SHOWCASE_EXEMPLARS: ShowcaseEssayItem[] = [];

function formatAuthorInitials(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Anonymous";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase() + ".";
  return (
    parts[0].slice(0, 1).toUpperCase() +
    ". " +
    parts[parts.length - 1].slice(0, 1).toUpperCase() +
    "."
  );
}

/**
 * Checks whether an essay qualifies for automatic showcase display.
 * (Maintained for backward compatibility; public showcase now exclusively displays
 * vetted Cambridge examiner calibration anchors and authentic distinction candidate scripts.)
 */
export function isShowcaseScore(totalMark: number, maxMark: number): boolean {
  if (maxMark === 8) return totalMark >= 7;
  if (maxMark === 12) return totalMark >= 10;
  if (maxMark === 20) return totalMark >= 15;
  return totalMark >= Math.round(maxMark * 0.75);
}

/**
 * Converts a verified Cambridge examiner calibration anchor into a ShowcaseEssayItem.
 */
export function anchorToShowcaseItem(
  anchor: any,
  isHidden = false,
  isRemoved = false,
): ShowcaseEssayItem {
  const maxMark = anchor.max_mark ?? 12;
  const totalMark = anchor.mark ?? 0;
  const notes = anchor.notes || "";

  // Author attribution & source
  let authorInitials = "Cambridge Exemplar";
  let source: ShowcaseEssayItem["source"] = "teacher_model";

  if (
    notes.includes("Siyonah Shyam") ||
    notes.includes("M25") ||
    notes.includes("Genuine student") ||
    anchor.question?.includes("avoid price competition while maintaining supernormal profits") ||
    anchor.question?.includes("merit goods in markets such as those for education or health care")
  ) {
    authorInitials = "S. S.";
    source = "student_auto";
  } else if (notes.includes("ECR") || notes.includes("Official Cambridge")) {
    authorInitials = "Cambridge ECR";
    source = "cambridge_model";
  } else {
    authorInitials = "Senior Examiner";
    source = "teacher_model";
  }

  // Derive AO marks according to Cambridge 9708 assessment objectives
  let ao1 = 0;
  let ao2 = 0;
  let ao3 = 0;
  let ao1Max = 0;
  let ao2Max = 0;
  let ao3Max = 0;

  if (maxMark === 8) {
    ao1Max = 3;
    ao2Max = 3;
    ao3Max = 2;
    if (totalMark >= 8) {
      ao1 = 3;
      ao2 = 3;
      ao3 = 2;
    } else {
      ao1 = 3;
      ao2 = 3;
      ao3 = Math.max(0, totalMark - 6);
    }
  } else if (maxMark === 12) {
    ao1Max = 4;
    ao2Max = 4;
    ao3Max = 4;
    if (totalMark >= 12) {
      ao1 = 4;
      ao2 = 4;
      ao3 = 4;
    } else if (totalMark === 11) {
      ao1 = 4;
      ao2 = 4;
      ao3 = 3;
    } else if (totalMark === 10) {
      ao1 = 4;
      ao2 = 4;
      ao3 = 2;
    } else {
      ao1 = Math.min(4, Math.round(totalMark * 0.35));
      ao2 = Math.min(4, Math.round(totalMark * 0.4));
      ao3 = Math.max(0, totalMark - ao1 - ao2);
    }
  } else {
    // 20-mark A-Level tariff
    ao1Max = 5;
    ao2Max = 9;
    ao3Max = 6;
    if (notes.includes("12/14") && notes.includes("5/6")) {
      ao1 = 5;
      ao2 = 7;
      ao3 = 5;
    } else if (notes.includes("11/14") && notes.includes("4/6")) {
      ao1 = 4;
      ao2 = 7;
      ao3 = 4;
    } else if (totalMark >= 17) {
      ao1 = 5;
      ao2 = 7;
      ao3 = 5;
    } else if (totalMark === 16) {
      ao1 = 5;
      ao2 = 6;
      ao3 = 5;
    } else {
      ao1 = Math.min(5, Math.round(totalMark * 0.25));
      ao2 = Math.min(9, Math.round(totalMark * 0.45));
      ao3 = Math.max(0, totalMark - ao1 - ao2);
    }
  }

  // Deduce topic group
  let topicName = "Cambridge 9708 Economics";
  const qLower = (anchor.question + " " + notes).toLowerCase();
  if (
    qLower.includes("protection") ||
    qLower.includes("exchange rate") ||
    qLower.includes("balance of payment") ||
    qLower.includes("depreciation") ||
    qLower.includes("tariff") ||
    qLower.includes("current account")
  ) {
    topicName = "International Economics";
  } else if (
    qLower.includes("inflation") ||
    qLower.includes("aggregate demand") ||
    qLower.includes("aggregate supply") ||
    qLower.includes("monetary policy") ||
    qLower.includes("fiscal policy") ||
    qLower.includes("unemployment") ||
    qLower.includes("recession")
  ) {
    topicName = "Macroeconomic Policy";
  } else if (
    qLower.includes("merit good") ||
    qLower.includes("demerit good") ||
    qLower.includes("subsidy") ||
    qLower.includes("externalities") ||
    qLower.includes("market failure") ||
    qLower.includes("inequality") ||
    qLower.includes("public good") ||
    qLower.includes("consumer surplus") ||
    qLower.includes("producer surplus") ||
    qLower.includes("ped") ||
    qLower.includes("yed") ||
    qLower.includes("elasticity")
  ) {
    topicName = "Microeconomics & Market Failure";
  } else if (
    qLower.includes("oligopol") ||
    qLower.includes("monopoly") ||
    qLower.includes("competition") ||
    qLower.includes("market structure") ||
    qLower.includes("electric vehicle")
  ) {
    topicName = "Market Structures & Firm Behaviour";
  }

  const cleanNotes = notes
    .replace(/^Examiner note:\s*/i, "")
    .replace(/^Official Cambridge 9708\/[^\s]+\s+ECR[^\.]*\.\s*\d+\/\d+\.\s*/i, "")
    .trim();

  const grading: ShowcaseGrading = {
    band:
      totalMark === maxMark
        ? "Level 5 (Full Distinction)"
        : totalMark >= maxMark * 0.85
          ? "Level 4 (Distinction / High Merit)"
          : "Level 4 (Merit)",
    examiner_summary:
      cleanNotes ||
      "Cambridge senior examiner calibrated exemplar demonstrating top-band analytical chains and reasoned evaluation.",
    strengths: [
      "Precise economic terminology and accurate Cambridge 9708 definitions",
      "Disciplined cause-and-effect transmission mechanisms with diagram integration",
      "Balanced evaluative conditionality and substantiated concluding judgment",
    ],
    weaknesses:
      totalMark === maxMark
        ? []
        : ["Minor scope to deepen specific empirical contextualisation"],
    actionable_feedback: [
      "Notice the precise linkage between diagrams and analytical prose.",
      "Observe how evaluative qualifiers are sustained throughout each paragraph.",
    ],
    ao_breakdown: {
      knowledge: {
        awarded: ao1,
        out_of: ao1Max,
        comment: "Accurate definitions and conceptual foundations.",
      },
      analysis: {
        awarded: ao2,
        out_of: ao2Max,
        comment: "Structured analytical progression with diagrams.",
      },
      evaluation: {
        awarded: ao3,
        out_of: ao3Max,
        comment: "Critical weighing of limitations and conditional conclusion.",
      },
    },
    confidence: 0.98,
  };

  return {
    essay_id: anchor.id,
    version_id: anchor.id,
    question: anchor.question,
    max_mark: maxMark,
    total_mark: totalMark,
    ao1_awarded: ao1,
    ao2_awarded: ao2,
    ao3_awarded: ao3,
    essay_text: anchor.essay_text,
    grading,
    topic_id: null,
    topic_name: topicName,
    author_initials: authorInitials,
    showcased_at: anchor.created_at || new Date().toISOString(),
    source,
    is_hidden: isHidden,
    is_removed: isRemoved,
  };
}

async function getAdminDatabaseClient(fallbackClient: any) {
  try {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    if (admin) return admin;
  } catch {
    /* fallback */
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    if (supabaseAdmin) return supabaseAdmin;
  } catch {
    /* fallback */
  }
  return fallbackClient;
}

/**
 * List showcase essays — returns exclusively verified Cambridge examiner calibration anchors
 * and authentic distinction scripts (Siyonah Shyam returned scripts, Cambridge ECR exemplars).
 * Any unvetted generic user submissions scoring >=90% are excluded to prevent overcrowding.
 */
export const listShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicId: z.string().optional(),
        tariff: z.number().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const results: ShowcaseEssayItem[] = [];

    try {
      const client = await getAdminDatabaseClient(context.supabase);
      const mod = await loadShowcaseModeration(client);
      const blockedIds = new Set([...mod.hidden_ids, ...mod.removed_ids]);

      // Query only verified high-scoring exam calibration anchors (Cambridge ECR & Siyonah Shyam returned scripts)
      const { data: dbAnchors, error: aError } = await client
        .from("calibration_anchors")
        .select("id, question, essay_text, mark, max_mark, band_label, notes, active, created_at")
        .eq("band_label", "top")
        .order("mark", { ascending: false });

      if (!aError && dbAnchors && dbAnchors.length > 0) {
        for (const anchor of dbAnchors) {
          if (anchor.active === false) continue;
          if (blockedIds.has(anchor.id)) continue;

          results.push(anchorToShowcaseItem(anchor, false, false));
        }
      }

      // Append any admin custom exemplars if active
      const visibleCustom = mod.custom_exemplars.filter(
        (e) => !blockedIds.has(e.version_id) && !blockedIds.has(e.essay_id) && !e.is_hidden,
      );

      let combined = [...visibleCustom, ...results];

      // Filter by tariff if requested
      if (data.tariff) {
        combined = combined.filter((e) => e.max_mark === data.tariff);
      }

      // Filter by topic if requested
      if (data.topicId) {
        combined = combined.filter(
          (e) => e.topic_id === data.topicId || e.topic_name === data.topicId,
        );
      }

      // Sort by highest mark percentage first, then date
      combined.sort((a, b) => {
        const scoreDiff = b.total_mark / b.max_mark - a.total_mark / a.max_mark;
        if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
        return new Date(b.showcased_at).getTime() - new Date(a.showcased_at).getTime();
      });

      return combined.slice(0, data.limit ?? 100);
    } catch (err) {
      console.warn("Database query for showcase essays encountered error:", err);
      return [];
    }
  });

/* ------------------------------------------------------------------ */
/* Admin Showcase Management Functions                                 */
/* ------------------------------------------------------------------ */

/**
 * List all showcase essays for administrators, including hidden items and source details.
 */
export const adminListShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const allItems: ShowcaseEssayItem[] = [];

    try {
      const client = await getAdminDatabaseClient(context.supabase);
      const mod = await loadShowcaseModeration(client);
      const hiddenSet = new Set(mod.hidden_ids);
      const removedSet = new Set(mod.removed_ids);

      const { data: dbAnchors } = await client
        .from("calibration_anchors")
        .select("id, question, essay_text, mark, max_mark, band_label, notes, active, created_at")
        .eq("band_label", "top")
        .order("mark", { ascending: false });

      if (dbAnchors && dbAnchors.length > 0) {
        for (const anchor of dbAnchors) {
          const isHidden = hiddenSet.has(anchor.id) || anchor.active === false;
          const isRemoved = removedSet.has(anchor.id);
          allItems.push(anchorToShowcaseItem(anchor, isHidden, isRemoved));
        }
      }

      // Append custom admin exemplars
      for (const custom of mod.custom_exemplars) {
        const isRemoved = removedSet.has(custom.version_id) || removedSet.has(custom.essay_id);
        const isHidden =
          isRemoved ||
          Boolean(custom.is_hidden) ||
          hiddenSet.has(custom.version_id) ||
          hiddenSet.has(custom.essay_id);
        allItems.push({
          ...custom,
          is_hidden: isHidden,
          is_removed: isRemoved,
          source: "admin_added",
        });
      }

      return allItems;
    } catch {
      return [];
    }
  });

/**
 * Toggle visibility of an essay in the showcase (hide / restore).
 */
export const adminToggleShowcaseVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        versionId: z.string(),
        hidden: z.boolean(),
        essayId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);

    const hiddenSet = new Set(mod.hidden_ids);
    const removedSet = new Set(mod.removed_ids);

    if (data.hidden) {
      // HIDE from student public showcase
      hiddenSet.add(data.versionId);
      if (data.essayId) hiddenSet.add(data.essayId);
      removedSet.delete(data.versionId);
      if (data.essayId) removedSet.delete(data.essayId);

      for (const c of mod.custom_exemplars) {
        if (c.version_id === data.versionId || (data.essayId && c.essay_id === data.essayId)) {
          c.is_hidden = true;
        }
      }

      try {
        await client
          .from("essay_versions")
          .update({ showcased: false, showcase_consented: false })
          .eq("id", data.versionId);
        if (data.essayId) {
          await client
            .from("essay_versions")
            .update({ showcased: false, showcase_consented: false })
            .eq("essay_id", data.essayId);
        }
        await client
          .from("calibration_anchors")
          .update({ active: false })
          .eq("id", data.versionId);
      } catch (err) {
        console.warn("Failed updating essay_versions for hidden showcase:", err);
      }
    } else {
      // RESTORE to student showcase
      hiddenSet.delete(data.versionId);
      removedSet.delete(data.versionId);
      if (data.essayId) {
        hiddenSet.delete(data.essayId);
        removedSet.delete(data.essayId);
      }

      for (const c of mod.custom_exemplars) {
        if (c.version_id === data.versionId || (data.essayId && c.essay_id === data.essayId)) {
          c.is_hidden = false;
        }
      }

      try {
        await client
          .from("essay_versions")
          .update({ showcased: true, showcase_consented: true })
          .eq("id", data.versionId);
        if (data.essayId) {
          await client
            .from("essay_versions")
            .update({ showcased: true, showcase_consented: true })
            .eq("essay_id", data.essayId);
        }
        await client
          .from("calibration_anchors")
          .update({ active: true })
          .eq("id", data.versionId);
      } catch (err) {
        console.warn("Failed updating essay_versions for restored showcase:", err);
      }
    }

    mod.hidden_ids = Array.from(hiddenSet);
    mod.removed_ids = Array.from(removedSet);
    await saveShowcaseModeration(client, mod);

    return { ok: true, versionId: data.versionId, hidden: data.hidden };
  });

/**
 * Add a custom exemplar essay to the showcase (Admin only).
 */
export const adminAddShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(5, "Question must be at least 5 characters."),
        maxMark: z.number().int().min(1).max(30),
        totalMark: z.number().int().min(1).max(30),
        ao1Awarded: z.number().int().optional(),
        ao2Awarded: z.number().int().optional(),
        ao3Awarded: z.number().int().optional(),
        essayText: z.string().trim().min(20, "Essay text must be at least 20 characters."),
        examinerSummary: z.string().trim().optional(),
        topicName: z.string().trim().optional(),
        authorName: z.string().trim().optional(),
        source: z
          .enum(["student_auto", "teacher_model", "cambridge_model", "admin_added"])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const id = `custom-ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newExemplar: ShowcaseEssayItem = {
      essay_id: id,
      version_id: id,
      question: data.question,
      max_mark: data.maxMark,
      total_mark: data.totalMark,
      ao1_awarded: data.ao1Awarded ?? null,
      ao2_awarded: data.ao2Awarded ?? null,
      ao3_awarded: data.ao3Awarded ?? null,
      essay_text: data.essayText,
      grading: {
        band: "Cambridge Level 5 Exemplar",
        examiner_summary:
          data.examinerSummary ||
          "Master-level Cambridge response with balanced chains of reasoning and thorough evaluation.",
        strengths: [
          "Cohesive analytical structure addressing all directive command words.",
          "Strong integration of economic theory with evaluative context.",
        ],
        actionable_feedback: ["Exemplary standard for Level 4/5 revision."],
        ao_breakdown: {
          knowledge: {
            awarded: data.ao1Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Accurate definitions and conceptual foundations.",
          },
          analysis: {
            awarded: data.ao2Awarded ?? Math.round(data.maxMark * 0.5),
            out_of: Math.round(data.maxMark * 0.5),
            comment: "Stepwise economic reasoning and mechanism analysis.",
          },
          evaluation: {
            awarded: data.ao3Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Balanced evaluation with contextual synthesis.",
          },
        },
      },
      topic_id: null,
      topic_name: data.topicName || "Cambridge Economics",
      author_initials: data.authorName ? formatAuthorInitials(data.authorName) : "Exemplar Author",
      showcased_at: new Date().toISOString(),
      source: data.source || "admin_added",
      is_hidden: false,
      is_removed: false,
    };

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);
    mod.custom_exemplars.unshift(newExemplar);
    await saveShowcaseModeration(client, mod);

    return { ok: true, exemplar: newExemplar };
  });

/**
 * Remove or delete an essay from the showcase permanently.
 */
export const adminDeleteShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        essayId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginalAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);

    // Look up essay_id if not provided
    let targetEssayId = data.essayId;
    if (!targetEssayId) {
      try {
        const { data: verRow } = await client
          .from("essay_versions")
          .select("essay_id")
          .eq("id", data.id)
          .maybeSingle();
        if (verRow?.essay_id) {
          targetEssayId = verRow.essay_id;
        }
      } catch {
        /* ignore */
      }
    }

    // Remove from custom exemplars if present
    mod.custom_exemplars = mod.custom_exemplars.filter(
      (e) =>
        e.version_id !== data.id &&
        e.essay_id !== data.id &&
        (!targetEssayId || e.essay_id !== targetEssayId),
    );

    // Permanently blacklist in removed_ids and hidden_ids
    const removedSet = new Set(mod.removed_ids);
    const hiddenSet = new Set(mod.hidden_ids);
    removedSet.add(data.id);
    hiddenSet.add(data.id);
    if (targetEssayId) {
      removedSet.add(targetEssayId);
      hiddenSet.add(targetEssayId);
    }
    mod.removed_ids = Array.from(removedSet);
    mod.hidden_ids = Array.from(hiddenSet);

    // Update database row: permanently set showcased = false, showcase_consented = false
    try {
      await client
        .from("essay_versions")
        .update({ showcased: false, showcase_consented: false })
        .eq("id", data.id);
      if (targetEssayId) {
        await client
          .from("essay_versions")
          .update({ showcased: false, showcase_consented: false })
          .eq("essay_id", targetEssayId);
      }
      await client
        .from("calibration_anchors")
        .update({ active: false })
        .eq("id", data.id);
    } catch (err) {
      console.warn("Failed updating essay_versions on deletion:", err);
    }

    // Persist to definitions table and site_settings table
    await saveShowcaseModeration(client, mod);

    return { ok: true, id: data.id, essayId: targetEssayId };
  });
