import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export type AppRole = "student" | "teacher" | "admin";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, school, tutorial_completed")
          .eq("id", userId)
          .maybeSingle()
          .catch(() => ({ data: null })),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .catch(() => ({ data: null })),
      ]);

      const roleList = (roles ?? []).map((row: any) => row.role);
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
        tutorialCompleted: profile?.tutorial_completed ?? true,
      };
    } catch (err) {
      console.warn("Exception in getMe, returning default student role:", err);
      return {
        userId,
        fullName: null,
        school: null,
        role: "student" as AppRole,
        isStaff: false,
        tutorialCompleted: true,
      };
    }
  });

/**
 * A privacy-safe community signal for the Dashboard. It intentionally exposes
 * counts only: students can see that Marginal is active without seeing who is
 * online, their email addresses, or the pages they are using.
 */
export const getCommunityPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      let onlineCount = 0;
      try {
        const { count, error } = await supabaseAdmin
          .from("user_presence")
          .select("user_id", { count: "exact", head: true })
          .gte("last_seen", onlineSince);
        if (!error && count != null) onlineCount = count;
      } catch {
        // user_presence table might not be present
      }

      let memberCount = 0;
      try {
        const authResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!authResult.error && authResult.data?.users) {
          memberCount = authResult.data.users.filter((user) =>
            Boolean(user.last_sign_in_at),
          ).length;
        }
      } catch {
        // Safe fallback if auth list fails
      }

      return { onlineCount, memberCount };
    } catch {
      return { onlineCount: 0, memberCount: 0 };
    }
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
