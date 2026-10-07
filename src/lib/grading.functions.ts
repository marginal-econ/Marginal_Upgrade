import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { essayLimitMessage } from "@/lib/usage-limits";

const GradeInput = z.object({
  question: z.string().trim().min(10, "Paste the exam question.").max(2000),
  essayText: z.string().trim().min(40, "That essay is too short to mark.").max(40_000),
  // Ceiling of 20, not 30 — no 9708 question is worth more than 20 marks
  // (matches essay.functions.ts's generator validator and grade.tsx's
  // dropdown, which only ever offers 8/12/20).
  maxMark: z.number().int().min(4).max(20),
  essayId: z.string().uuid().nullable().optional(),
  auditPass: z.boolean().optional(),
  /**
   * A [DIAGRAM: ...] tag describing a diagram the student referenced for a
   * typed (non-handwritten) essay — either picked from the diagram library
   * or generated from a pasted image URL. Appended to the graded text so it
   * gets the same credit a scanned script's hand-drawn diagram would.
   */
  // Up to a few diagrams can be attached to one essay (e.g. a
  // supply/demand diagram AND a PPC diagram), each contributing its own
  // [DIAGRAM: ...] tag joined together — 1000 chars only fit one, so this
  // is sized for several without inviting arbitrary essay-length input.
  diagramReference: z.string().trim().max(4000).optional(),
  /**
   * Screenshot(s) of the relevant mark scheme page, pasted straight into the
   * grader or Live Examiner (see mark-scheme-screenshot.tsx). Sent to the
   * examiner as an actual image (vision), not just text — on top of, not
   * instead of, the retrieval-grounded knowledge base context.
   */
  markSchemeImageDataUrls: z.array(z.string().trim().startsWith("data:image/")).max(4).optional(),
});

/**
 * Mark an essay and persist it as a new version of the same essay thread, so a
 * student can rewrite and watch the mark move rather than losing the history.
 */
export const gradeEssaySubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fast pre-flight check: reject non-economics questions before consuming quota or incurring AI cost
    const { validateEconomicsSyllabus } = await import("./examiner/syllabus-guard.server");
    await validateEconomicsSyllabus(data.question, data.essayText);

    // Hard per-day cap on essays graded (admin-configurable, default 5; the
    // admin account is exempt). Enforced atomically in the database — this
    // reserves one of today's slots BEFORE any AI cost is incurred, and the
    // slot is handed back below if the AI call itself fails.
    const { data: reservation, error: reserveError } = await supabase.rpc("reserve_essay_grading");
    if (reserveError) throw new Error(reserveError.message);
    const reserved = reservation as { allowed?: boolean; limit?: number } | null;
    if (!reserved?.allowed) throw new Error(essayLimitMessage(reserved?.limit ?? 5));

    const { gradeEssay } = await import("./examiner/grade.server");
    const { defaultSplitForMaxMark } = await import("./examiner/config");

    const split = defaultSplitForMaxMark(data.maxMark);

    // A referenced diagram is appended after the student's own text, exactly
    // like a hand-drawn diagram tag from OCR, so the examiner prompt's
    // existing diagram-handling rules apply unchanged.
    const gradedText = data.diagramReference
      ? `${data.essayText}\n\n${data.diagramReference}`
      : data.essayText;

    let outcome;
    try {
      outcome = await gradeEssay(supabase, {
        question: data.question,
        essayText: gradedText,
        maxMark: data.maxMark,
        split,
        auditPass: data.auditPass,
        markSchemeImageDataUrls: data.markSchemeImageDataUrls,
      });
    } catch (error) {
      // The grading never happened, so it shouldn't use up today's allowance.
      try {
        await supabase.rpc("refund_essay_grading");
      } catch {
        /* best-effort */
      }
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "grade_essay",
        model: "google/gemini-2.5-pro",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    const { grading } = outcome;

    // Reuse the existing essay thread on a rewrite; otherwise open a new one.
    let essayId = data.essayId ?? null;
    if (essayId) {
      await supabase
        .from("essays")
        .update({ latest_mark: grading.total_mark, updated_at: new Date().toISOString() })
        .eq("id", essayId)
        .eq("user_id", userId);
    } else {
      const { data: essay, error } = await supabase
        .from("essays")
        .insert({
          user_id: userId,
          question: data.question,
          max_mark: data.maxMark,
          latest_mark: grading.total_mark,
        })
        .select("id")
        .single();
      if (error || !essay) throw new Error(error?.message ?? "Could not save this essay.");
      essayId = essay.id;
    }

    const { count } = await supabase
      .from("essay_versions")
      .select("id", { count: "exact", head: true })
      .eq("essay_id", essayId);

    const { data: version, error: versionError } = await supabase
      .from("essay_versions")
      .insert({
        essay_id: essayId,
        user_id: userId,
        version: (count ?? 0) + 1,
        essay_text: gradedText,
        grading: grading as unknown as never,
        total_mark: grading.total_mark,
        ao1_awarded: grading.ao_breakdown.knowledge.awarded,
        ao2_awarded: grading.ao_breakdown.analysis.awarded,
        ao3_awarded: grading.ao_breakdown.evaluation.awarded,
        confidence: grading.confidence,
        audited: grading.audited,
        sources: grading.sources as unknown as never,
        model: outcome.model,
      })
      .select("id, version")
      .single();

    if (versionError) throw new Error(versionError.message);

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      feature: "grade_essay",
      model: outcome.model,
      prompt_tokens: outcome.promptTokens,
      completion_tokens: outcome.completionTokens,
      latency_ms: outcome.latencyMs,
      ok: true,
    });

    return {
      essayId,
      versionId: version?.id ?? null,
      version: version?.version ?? 1,
      grading,
      latencyMs: outcome.latencyMs,
    };
  });

export const listMyEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("essays")
      .select("id, question, max_mark, latest_mark, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEssayThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ essayId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isUserAdmin } = await import("@/lib/auth-admin");
    const isAdmin = isUserAdmin(context.userId);
    const client = isAdmin
      ? (await import("@/integrations/backend/client.server")).supabaseAdmin
      : context.supabase;

    const { data: essay, error } = await client
      .from("essays")
      .select("id, question, max_mark, latest_mark, created_at, user_id")
      .eq("id", data.essayId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!essay) throw new Error("That essay could not be found.");

    const { data: versions, error: versionError } = await client
      .from("essay_versions")
      .select("id, version, essay_text, grading, total_mark, confidence, audited, created_at")
      .eq("essay_id", data.essayId)
      .order("version", { ascending: true });
    if (versionError) throw new Error(versionError.message);

    return { essay, versions: versions ?? [] };
  });

/** Student progress figures for the dashboard. */
export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("essay_versions")
      .select("total_mark, ao1_awarded, ao2_awarded, ao3_awarded, confidence, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Proactively check if a question matches verified Cambridge Knowledge Base materials */
export const checkQuestionGrounding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ question: z.string().trim().max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.question.length < 15) return { checked: false, grounded: false, sourceCount: 0 };
    const { retrieve } = await import("./retrieval.server");
    try {
      const sources = await retrieve(context.supabase, {
        query: `${data.question}\n\nMark scheme, band descriptors and examiner report guidance for this question.`,
        matchCount: 4,
        minSimilarity: 0.5,
      });
      return {
        checked: true,
        grounded: sources.length > 0,
        sourceCount: sources.length,
        topMatchTitle: sources[0]?.documentTitle ?? null,
        topSimilarity: sources[0]?.similarity ?? null,
      };
    } catch {
      return { checked: false, grounded: false, sourceCount: 0 };
    }
  });
