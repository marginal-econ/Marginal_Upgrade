import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isVaquitavoid } from "@/lib/auth-admin";

export type AppRole = "student" | "teacher" | "admin";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const isVaquita = isVaquitavoid({
      userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });

    try {
      let profile: { id: string; full_name: string | null; school: string | null; tutorial_completed: boolean } | null = null;
      let roles: { role: string }[] | null = null;

      try {
        const profileRes = await supabase
          .from("profiles")
          .select("id, full_name, school, tutorial_completed")
          .eq("id", userId)
          .maybeSingle();
        profile = profileRes.data;
      } catch {
        profile = null;
      }

      try {
        const rolesRes = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        roles = rolesRes.data as { role: string }[] | null;
      } catch {
        roles = null;
      }

      const roleList = (roles ?? []).map((row: any) => row.role);
      let role: AppRole = "student";

      // Admin check
      if (isVaquita || roleList.includes("admin")) {
        role = "admin";
      } else if (roleList.includes("teacher")) {
        role = "teacher";
      } else {
        role = "student";
      }

      const { getUserSubscriptionDetails } = await import("./subscription.server");
      const subscription = await getUserSubscriptionDetails(
        supabase,
        userId,
        (context as any).email,
        (context as any).claims,
      );

      return {
        userId,
        fullName: profile?.full_name ?? (isVaquita ? "Vaquitavoid" : null),
        school: profile?.school ?? null,
        role,
        isAdmin: isVaquita || role === "admin",
        isStaff: isVaquita || role === "teacher",
        tutorialCompleted: profile?.tutorial_completed ?? true,
        subscription,
      };
    } catch (err) {
      console.warn("Exception in getMe, returning fallback role:", err);
      return {
        userId,
        fullName: isVaquita ? "Vaquitavoid" : null,
        school: null,
        role: isVaquita ? ("admin" as AppRole) : ("student" as AppRole),
        isAdmin: isVaquita,
        isStaff: isVaquita,
        tutorialCompleted: true,
        subscription: {
          tier: "free" as const,
          tierName: "Free Tier",
          isPaid: false,
          isAdmin: isVaquita,
          essaysGradedCount: 0,
          essaysLimit: 2,
          essaysRemaining: 2,
          canGradeEssay: true,
          liveExaminerCredits: 0,
          canUseLiveExaminer: false,
          mcqFreeDaysRemaining: 30,
          canUseMCQ: true,
        },
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
