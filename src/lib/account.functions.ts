import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export type AppRole = "student" | "teacher" | "admin";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, school, tutorial_completed")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roleList = (roles ?? []).map((row) => row.role);
    const role: AppRole = roleList.includes("admin")
      ? "admin"
      : roleList.includes("teacher")
        ? "teacher"
        : "student";

    return {
      userId,
      fullName: profile?.full_name ?? null,
      school: profile?.school ?? null,
      role,
      isStaff: role === "admin" || role === "teacher",
      // New accounts start at false so the onboarding dialog offers the
      // tutorial once; skipping or finishing it both mark this true.
      tutorialCompleted: profile?.tutorial_completed ?? true,
    };
  });

/**
 * A privacy-safe community signal for the Dashboard. It intentionally exposes
 * counts only: students can see that Marginal is active without seeing who is
 * online, their email addresses, or the pages they are using.
 */
export const getCommunityPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const [{ count: onlineCount, error: onlineError }, authResult] = await Promise.all([
      supabaseAdmin
        .from("user_presence")
        .select("user_id", { count: "exact", head: true })
        .gte("last_seen", onlineSince),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (onlineError) throw new Error(onlineError.message);
    if (authResult.error) throw new Error(authResult.error.message);
    const memberCount = authResult.data.users.filter((user) =>
      Boolean(user.last_sign_in_at),
    ).length;

    return { onlineCount: onlineCount ?? 0, memberCount };
  });

// Called when the user clicks either "Start tutorial" or "Skip" on the
// onboarding dialog — either way we don't show it again.
export const markTutorialSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ tutorial_completed: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().max(120).optional(),
        school: z.string().trim().max(160).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName ?? null, school: data.school ?? null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
