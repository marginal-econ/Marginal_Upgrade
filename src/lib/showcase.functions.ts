import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

/**
 * Essays land here automatically — a database trigger (see migration
 * 20260922090000) flips essay_versions.showcased to true the moment a mark
 * is saved that clears the showcase threshold (8/8, 11-12/12, 18-20/20).
 * Nothing here decides *whether* to publish; this just reads what the
 * trigger has already published, via a SECURITY DEFINER function that
 * returns only the author's initials — never their full name.
 */
export const listShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("list_showcase_essays", {
      _limit: data.limit ?? 60,
      _topic_id: data.topicId ?? null,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMyShowcaseCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_my_showcase_candidates");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setShowcaseConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ versionId: z.string().uuid(), consent: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: changed, error } = await context.supabase.rpc("set_showcase_consent", {
      _version_id: data.versionId,
      _consent: data.consent,
    });
    if (error) throw new Error(error.message);
    if (!changed) throw new Error("That essay is not eligible for your showcase.");
    return { ok: true };
  });
