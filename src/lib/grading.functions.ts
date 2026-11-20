import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { essayLimitMessage, FREE_ESSAY_LIMIT_MESSAGE } from "@/lib/usage-limits";

const GradeInput = z.object({
  question: z.string().trim().min(10, "Paste the exam question.").max(2000),
  essayText: z.string().trim().min(40, "That essay is too short to mark.").max(40_000),
  // Ceiling of 20, not 30 — no 9708 question is worth more than 20 marks
  // (matches essay.functions.ts's generator validator and grade.tsx's
  // dropdown, which only ever offers 8/12/20).
  maxMark: z.number().int().min(4).max(20),
  essayType: z.string().optional(),
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

    // Unlimited essay grading active for all users — no artificial caps or limits
    const { getUserSubscriptionDetails } = await import("./subscription.server");
    const sub = await getUserSubscriptionDetails(supabase, userId, (context as any).email, (context as any).claims);
    if (!sub.canGradeEssay) {
      if (sub.isTeacher && !sub.isPaid) {
        const { TEACHER_FREE_ESSAY_LIMIT_MESSAGE } = await import("./usage-limits");
        throw new Error(TEACHER_FREE_ESSAY_LIMIT_MESSAGE);
      }
      if (!sub.isPaid) {
        throw new Error(FREE_ESSAY_LIMIT_MESSAGE);
      } else {
        throw new Error(
          `Monthly essay quota reached (${sub.essaysLimit} essays on your ${sub.tierName} plan). Upgrade your plan or wait for the cycle reset.`
        );
      }
    }

    // Optional daily cap reservation in database (if RPC installed)
    try {
      const { data: reservation, error: reserveError } = await supabase.rpc("reserve_essay_grading");
      if (!reserveError && reservation && !(reservation as { allowed?: boolean }).allowed) {
        const { essayLimitMessage } = await import("./usage-limits");
        // In unlimited mode, do not block grading
      }
    } catch (err) {
      const { DAILY_LIMIT_PREFIX } = await import("./usage-limits");
      if (err instanceof Error && err.message.startsWith(DAILY_LIMIT_PREFIX)) {
        throw err;
      }
      // RPC not present in schema cache; the authoritative tier quota check above governs
    }

    const { gradeEssay } = await import("./examiner/grade.server");
    const { defaultSplitForMaxMark } = await import("./examiner/config");

    const split = defaultSplitForMaxMark(data.maxMark, data.essayType, data.question);

    // A referenced diagram is appended after the student's own text, exactly
    // like a hand-drawn diagram tag from OCR, so the examiner prompt's
    // existing diagram-handling rules apply unchanged.
    const gradedText = data.diagramReference
      ? `${data.essayText}\n\n${data.diagramReference}`
      : data.essayText;

    const isBudgetTier =
      !sub.isAdmin &&
      !sub.isTeacher &&
      (sub.tier === "free" || sub.tier === "foundation" || sub.tier === "scholar_plus");

    let outcome;
    try {
      outcome = await gradeEssay(supabaseAdmin || supabase, {
        question: data.question,
        essayText: gradedText,
        maxMark: data.maxMark,
        split,
        essayType: data.essayType,
        auditPass: data.auditPass,
        markSchemeImageDataUrls: data.markSchemeImageDataUrls,
        isBudgetTier,
        userId,
        skipSyllabusPreflight: true,
      });
    } catch (error) {
      // The grading never happened, so it shouldn't use up today's allowance.
      try {
        await supabase.rpc("refund_essay_grading");
      } catch {
        /* best-effort */
      }
      const failurePayload = JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        question: data.question,
        essayText: data.essayText,
        maxMark: data.maxMark,
        diagramReference: data.diagramReference ?? null,
        failedAt: new Date().toISOString(),
      });
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "grade_essay_failed",
        model: "google/gemini-3.8-flash",
        ok: false,
        error_message: failurePayload,
      });
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "grade_essay",
        model: "google/gemini-3.8-flash",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    const { grading } = outcome;

    // Clean up any live drafting telemetry now that essay has been graded
    try {
      await supabaseAdmin
        .from("ai_usage_log")
        .delete()
        .eq("user_id", userId)
        .eq("feature", "LIVE_DRAFT_GRADE");
    } catch {}

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

    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: userId,
      feature: "grade_essay",
      model: outcome.model || "google/gemini-3.8-flash",
      prompt_tokens: outcome.promptTokens,
      completion_tokens: outcome.completionTokens,
      latency_ms: outcome.latencyMs,
      ok: true,
    });

    try {
      const todayDateStr = new Date().toISOString().slice(0, 10);
      const { data: curDfu } = await supabaseAdmin
        .from("daily_feature_usage")
        .select("uses")
        .eq("user_id", userId)
        .eq("feature", "essay_grade")
        .eq("usage_day", todayDateStr)
        .maybeSingle();

      const newUses = (curDfu?.uses ?? 0) + 1;
      await supabaseAdmin.from("daily_feature_usage").upsert({
        user_id: userId,
        feature: "essay_grade",
        usage_day: todayDateStr,
        uses: newUses,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,feature,usage_day" });
    } catch (dfuErr) {
      console.warn("Could not update daily_feature_usage:", dfuErr);
    }

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
    const isAdmin = isUserAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
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
      .select("id, essay_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, confidence, created_at, essays(id, max_mark, question)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Proactively check if a question matches verified Cambridge Knowledge Base materials (coursebooks, mark schemes, syllabus, notes) */
export const checkQuestionGrounding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ question: z.string().trim().max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.question.length < 15) return { checked: false, grounded: false, sourceCount: 0 };
    const { retrieve } = await import("./retrieval.server");
    try {
      // 1. Direct question against coursebooks, syllabus, notes, and past papers
      let sources = await retrieve(context.supabase, {
        query: data.question,
        matchCount: 6,
        minSimilarity: 0.35,
      });

      // 2. Second search fallback: broader similarity threshold ensuring all Cambridge questions ground
      if (!sources || sources.length === 0) {
        sources = await retrieve(context.supabase, {
          query: data.question,
          matchCount: 6,
          minSimilarity: 0.28,
        });
      }

      const top = sources?.[0];
      return {
        checked: true,
        grounded: (sources?.length ?? 0) > 0,
        sourceCount: sources?.length ?? 0,
        topMatchTitle: top?.documentTitle ?? null,
        topMatchDocType: top?.docType ?? null,
        topSimilarity: top?.similarity ?? null,
      };
    } catch (err) {
      console.warn("[checkQuestionGrounding] Retrieval warning:", err);
      return { checked: false, grounded: false, sourceCount: 0 };
    }
  });

const LiveDraftInput = z.object({
  question: z.string().max(2000),
  essayText: z.string().max(30000),
  maxMark: z.number().int().min(1).max(100).default(12),
  wordCount: z.number().int().nonnegative().optional(),
});

/**
 * Real-time draft telemetry sync: informs God Mode what question and essay text
 * the student is currently writing in the Essay Grader.
 */
export const syncLiveEssayDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LiveDraftInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    try {
      const trimmedText = data.essayText.trim();
      const trimmedQ = data.question.trim();

      // If user completely cleared both fields, wipe their draft telemetry
      if (!trimmedText && !trimmedQ) {
        await supabaseAdmin
          .from("ai_usage_log")
          .delete()
          .eq("user_id", userId)
          .eq("feature", "LIVE_DRAFT_GRADE");
        return { ok: true, cleared: true };
      }

      const words = data.wordCount ?? (trimmedText ? trimmedText.split(/\s+/).length : 0);
      const payload = JSON.stringify({
        question: data.question,
        essayText: data.essayText,
        maxMark: data.maxMark,
        wordCount: words,
        charCount: data.essayText.length,
        updatedAt: new Date().toISOString(),
      });

      // Keep only latest draft snapshot for this user
      await supabaseAdmin
        .from("ai_usage_log")
        .delete()
        .eq("user_id", userId)
        .eq("feature", "LIVE_DRAFT_GRADE");

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "LIVE_DRAFT_GRADE",
        model: "live-telemetry",
        ok: true,
        error_message: payload,
      });
    } catch {
      /* non-blocking telemetry */
    }

    return { ok: true };
  });
