import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { TIER_LIMITS } from "@/lib/usage-limits";
import { type CambridgeSeriesId, normalizeSeriesId } from "@/lib/cambridge-thresholds";

export type AppRole = "student" | "teacher" | "admin";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const isMarginal = isMarginalAdmin({
      userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });

    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const db = supabaseAdmin ?? supabase;

      let profile: {
        id: string;
        full_name: string | null;
        school: string | null;
        tutorial_completed: boolean;
        avatar_url?: string | null;
        bio?: string | null;
        birthday?: string | null;
      } | null = null;
      let roles: { role: string }[] | null = null;

      // Resilient extended profile lookup (bio, birthday, custom avatar) from definitions table
      let extendedProfile: { bio?: string; birthday?: string; avatarUrl?: string } = {};
      try {
        const { data: extData } = await db
          .from("definitions")
          .select("definition_text")
          .eq("term", `__USER_PROFILE_EXT_${userId}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (extData?.definition_text) {
          extendedProfile = JSON.parse(extData.definition_text);
        }
      } catch {
        /* fallback */
      }

      // Fast-path for Marginal Admin: skip unnecessary sequential role/teacher DB lookups
      if (isMarginal) {
        const { getUserSubscriptionDetails } = await import("./subscription.server");
        const subscription = await getUserSubscriptionDetails(
          db,
          userId,
          (context as any).email,
          (context as any).claims,
        );
        const metaName =
          (context as any).claims?.user_metadata?.full_name ||
          (context as any).claims?.user_metadata?.name;

        let adminProfileRes: any = null;
        try {
          adminProfileRes = await db
            .from("profiles")
            .select("id, full_name, school, tutorial_completed, avatar_url")
            .eq("id", userId)
            .maybeSingle();
        } catch {
          /* fallback */
        }

        const adminAvatar =
          adminProfileRes?.data?.avatar_url ||
          extendedProfile?.avatarUrl ||
          (context as any).claims?.user_metadata?.avatar_url ||
          null;

        return {
          userId,
          fullName: adminProfileRes?.data?.full_name || metaName || "Marginal Admin",
          school: adminProfileRes?.data?.school ?? (context as any).claims?.user_metadata?.school ?? null,
          avatarUrl: adminAvatar,
          bio: extendedProfile?.bio || "",
          birthday: extendedProfile?.birthday || "",
          role: "admin" as AppRole,
          isAdmin: true,
          isStaff: true,
          tutorialCompleted: true,
          subscription,
        };
      }

      try {
        const profileRes = await db
          .from("profiles")
          .select("id, full_name, school, tutorial_completed, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        profile = profileRes.data;
      } catch {
        profile = null;
      }

      try {
        const rolesRes = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        roles = rolesRes.data as { role: string }[] | null;
      } catch {
        roles = null;
      }

      const roleList = (roles ?? []).map((row: any) => row.role);
      let isTeacherUser =
        roleList.includes("teacher") ||
        (context as any).claims?.user_metadata?.role === "teacher" ||
        (context as any).claims?.app_metadata?.role === "teacher";

      if (!isTeacherUser) {
        try {
          const { data: tp } = await (db as any)
            .from("teacher_profiles")
            .select("status")
            .eq("user_id", userId)
            .maybeSingle();
          if (tp?.status === "approved") {
            isTeacherUser = true;
          }
        } catch {
          /* fallback */
        }
      }

      let role: AppRole = "student";

      // Only Marginal Admin can ever hold admin role or privileges
      if (isMarginal) {
        role = "admin";
      } else if (isTeacherUser) {
        role = "teacher";
      } else {
        role = "student";
      }

      const metaName = (context as any).claims?.user_metadata?.full_name || (context as any).claims?.user_metadata?.name;
      const emailPrefix = (context as any).email ? (context as any).email.split("@")[0] : null;
      const resolvedName = profile?.full_name || metaName || (isMarginal ? "Marginal Admin" : emailPrefix);

      const { getUserSubscriptionDetails } = await import("./subscription.server");
      const subscription = await getUserSubscriptionDetails(
        db,
        userId,
        (context as any).email,
        (context as any).claims,
      );

      const resolvedAvatar =
        profile?.avatar_url ||
        extendedProfile?.avatarUrl ||
        (context as any).claims?.user_metadata?.avatar_url ||
        null;

      return {
        userId,
        fullName: resolvedName,
        school: profile?.school ?? (context as any).claims?.user_metadata?.school ?? null,
        avatarUrl: resolvedAvatar,
        bio: (profile as any)?.bio || extendedProfile?.bio || "",
        birthday: (profile as any)?.birthday || extendedProfile?.birthday || "",
        role,
        isAdmin: isMarginal,
        isStaff: isMarginal || role === "teacher",
        tutorialCompleted: profile?.tutorial_completed ?? true,
        subscription,
      };
    } catch (err) {
      console.warn("Exception in getMe, returning fallback role:", err);
      const fallbackTier =
        (context as any).claims?.app_metadata?.tier ||
        (context as any).claims?.user_metadata?.tier ||
        "free";
      const isPaidTier = fallbackTier !== "free";
      const tierLimit = (TIER_LIMITS as any)[fallbackTier] || TIER_LIMITS.free;

      return {
        userId,
        fullName: isMarginal ? "Marginal Admin" : null,
        school: null,
        avatarUrl: null,
        bio: "",
        birthday: "",
        role: isMarginal ? ("admin" as AppRole) : ("student" as AppRole),
        isAdmin: isMarginal,
        isStaff: isMarginal,
        tutorialCompleted: true,
        subscription: {
          tier: fallbackTier,
          tierName: tierLimit.name,
          isPaid: isPaidTier,
          isAdmin: isMarginal,
          essaysGradedCount: 0,
          essaysLimit: tierLimit.monthlyEssayLimit,
          essaysRemaining: tierLimit.monthlyEssayLimit,
          canGradeEssay: true,
          liveExaminerCredits: tierLimit.liveExaminerCredits,
          canUseLiveExaminer: tierLimit.liveExaminerCredits > 0,
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
        avatarUrl: z.string().trim().max(500000).optional().nullable(),
        bio: z.string().trim().max(500).optional().nullable(),
        birthday: z.string().trim().max(30).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? supabase;

    // 1. Update profiles table safely
    try {
      const updatePayload: Record<string, any> = {
        full_name: data.fullName ?? null,
        school: data.school ?? null,
        updated_at: new Date().toISOString(),
      };
      if (data.avatarUrl !== undefined) {
        updatePayload.avatar_url = data.avatarUrl;
      }
      if (data.bio !== undefined) updatePayload.bio = data.bio;
      if (data.birthday !== undefined) updatePayload.birthday = data.birthday;

      const { error } = await db
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (error) {
        // If bio or birthday columns don't exist yet in remote profiles table, fallback to core columns
        await db
          .from("profiles")
          .update({
            full_name: data.fullName ?? null,
            school: data.school ?? null,
            ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    } catch (err) {
      console.warn("Profiles table update error:", err);
    }

    // 2. Persist extended profile info to definitions table as a resilient guaranteed store
    try {
      const extPayload = {
        bio: data.bio ?? "",
        birthday: data.birthday ?? "",
        avatarUrl: data.avatarUrl ?? "",
        updatedAt: new Date().toISOString(),
      };
      await db.from("definitions").upsert(
        {
          term: `__USER_PROFILE_EXT_${userId}`,
          definition_text: JSON.stringify(extPayload),
          syllabus_section: "candidate_profile",
          importance: "low",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "term" },
      );
    } catch (extErr) {
      console.warn("Could not save to definitions table:", extErr);
    }

    return { ok: true };
  });

export type NavigationLayout = "topbar" | "sidebar" | "dock";

export type UserAcademicPreferences = {
  examSeries: CambridgeSeriesId;
  targetLevel: "as_level" | "a2_level" | "full_a_level";
  targetGrade: "A*" | "A" | "B" | "C";
  currencyContext?: string;
  feedbackDepth?: string;
  timedModeDefault?: boolean;
  showDiagramLabels?: boolean;
  navigationLayout?: NavigationLayout;
};

export const getUserAcademicPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserAcademicPreferences> => {
    const { supabase, userId } = context;
    const term = `__USER_PREFS_${userId}`;

    try {
      const { data } = await supabase
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.definition_text) {
        const parsed = JSON.parse(data.definition_text);
        return {
          examSeries: normalizeSeriesId(parsed.examSeries),
          targetLevel: parsed.targetLevel || "full_a_level",
          targetGrade: parsed.targetGrade || "A*",
          currencyContext: parsed.currencyContext || "uk_intl",
          feedbackDepth: parsed.feedbackDepth || "detailed",
          timedModeDefault: parsed.timedModeDefault ?? true,
          showDiagramLabels: parsed.showDiagramLabels ?? true,
          navigationLayout: (parsed.navigationLayout as NavigationLayout) || "topbar",
        };
      }
    } catch {
      // Fallback
    }

    return {
      examSeries: "all_average",
      targetLevel: "full_a_level",
      targetGrade: "A*",
      currencyContext: "uk_intl",
      feedbackDepth: "detailed",
      timedModeDefault: true,
      showDiagramLabels: true,
      navigationLayout: "topbar",
    };
  });

export const saveUserAcademicPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        examSeries: z.string().optional(),
        targetLevel: z.enum(["as_level", "a2_level", "full_a_level"]).optional(),
        targetGrade: z.enum(["A*", "A", "B", "C"]).optional(),
        currencyContext: z.string().optional(),
        feedbackDepth: z.string().optional(),
        timedModeDefault: z.boolean().optional(),
        showDiagramLabels: z.boolean().optional(),
        navigationLayout: z.enum(["topbar", "sidebar", "dock"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const term = `__USER_PREFS_${userId}`;
    const cacheTerm = `__REVIEW_CACHE_${userId}`;

    const normalizedSeries = normalizeSeriesId(data.examSeries);
    const payload: UserAcademicPreferences = {
      examSeries: normalizedSeries,
      targetLevel: data.targetLevel || "full_a_level",
      targetGrade: data.targetGrade || "A*",
      currencyContext: data.currencyContext || "uk_intl",
      feedbackDepth: data.feedbackDepth || "detailed",
      timedModeDefault: data.timedModeDefault ?? true,
      showDiagramLabels: data.showDiagramLabels ?? true,
      navigationLayout: data.navigationLayout || "topbar",
    };

    // Upsert into definitions
    try {
      const { data: existing } = await supabase
        .from("definitions")
        .select("id")
        .eq("term", term)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("definitions")
          .update({
            definition_text: JSON.stringify(payload),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("definitions").insert({
          term,
          definition_text: JSON.stringify(payload),
          subject: "Cambridge 9708 Candidate Preferences",
        });
      }
    } catch (err) {
      console.warn("Could not persist preferences in definitions table:", err);
    }

    // Bust review cache so predicted grades recalculate with chosen series immediately
    try {
      await supabase.from("definitions").delete().eq("term", cacheTerm);
    } catch {
      // Non-fatal if delete fails
    }

    return { ok: true, preferences: payload };
  });
