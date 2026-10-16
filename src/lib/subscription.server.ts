import type { SupabaseClient } from "@supabase/supabase-js";
import { isVaquitavoid } from "@/lib/auth-admin";
import {
  FREE_TIER_ESSAY_LIMIT,
  MCQ_FREE_TRIAL_DAYS,
  TIER_LIMITS,
  type PlanTier,
  type UserSubscriptionDetails,
} from "./usage-limits";

/**
 * Resolves the full subscription, credit balance, and usage state for a given user.
 */
export async function getUserSubscriptionDetails(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  userEmail?: string | null,
  userClaims?: any,
): Promise<UserSubscriptionDetails> {
  const isAdminUser = isVaquitavoid({ userId, email: userEmail, claims: userClaims });

  if (isAdminUser) {
    return {
      tier: "elite",
      tierName: "Cambridge Elite (Admin Pass)",
      isPaid: true,
      isAdmin: true,
      essaysGradedCount: 0,
      essaysLimit: 9999,
      essaysRemaining: 9999,
      canGradeEssay: true,
      liveExaminerCredits: 999,
      canUseLiveExaminer: true,
      mcqFreeDaysRemaining: 365,
      canUseMCQ: true,
    };
  }

  // 1. Check roles in user_roles table
  let activeTier: PlanTier = "free";
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleNames = (roles ?? []).map((r: any) => r.role);
    if (roleNames.includes("admin")) {
      activeTier = "elite";
    } else if (roleNames.includes("tier_elite") || roleNames.includes("elite")) {
      activeTier = "elite";
    } else if (roleNames.includes("tier_mastery") || roleNames.includes("mastery")) {
      activeTier = "mastery";
    } else if (roleNames.includes("tier_pro") || roleNames.includes("pro")) {
      activeTier = "pro";
    } else if (roleNames.includes("tier_foundation") || roleNames.includes("foundation")) {
      activeTier = "foundation";
    }
  } catch (err) {
    console.warn("Could not query user_roles for subscription, defaulting to free:", err);
  }

  // 2. Count total essays submitted
  let essaysGradedCount = 0;
  try {
    const { count, error } = await supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!error && typeof count === "number") {
      essaysGradedCount = count;
    }
  } catch (err) {
    console.warn("Could not query essays count for user:", err);
  }

  // 3. Count Live Examiner session credits used this cycle
  let liveCreditsUsed = 0;
  try {
    const { count } = await supabase
      .from("live_examiner_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    liveCreditsUsed = count ?? 0;
  } catch {
    /* table might be empty */
  }

  const limits = TIER_LIMITS[activeTier];
  const isPaid = activeTier !== "free";

  let essaysLimit = limits.maxEssaysPerMonth;
  if (activeTier === "free") {
    essaysLimit = FREE_TIER_ESSAY_LIMIT;
  }

  const essaysRemaining = Math.max(0, essaysLimit - essaysGradedCount);
  const canGradeEssay = essaysRemaining > 0;

  const allocatedCredits = limits.liveExaminerCredits;
  const remainingCredits = Math.max(0, allocatedCredits - liveCreditsUsed);
  const canUseLiveExaminer = limits.liveExaminerEnabled && remainingCredits > 0;

  let mcqFreeDaysRemaining = limits.mcqFreeDays;
  let canUseMCQ = true;

  if (activeTier === "free") {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.created_at) {
        const createdDate = new Date(profile.created_at);
        const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        mcqFreeDaysRemaining = Math.max(0, MCQ_FREE_TRIAL_DAYS - daysSinceCreation);
      }
    } catch {
      /* fallback to default */
    }
    canUseMCQ = mcqFreeDaysRemaining > 0;
  }

  return {
    tier: activeTier,
    tierName: limits.name,
    isPaid,
    isAdmin: false,
    essaysGradedCount,
    essaysLimit,
    essaysRemaining,
    canGradeEssay,
    liveExaminerCredits: remainingCredits,
    canUseLiveExaminer,
    mcqFreeDaysRemaining,
    canUseMCQ,
  };
}

/**
 * Assigns or upgrades a subscription tier for a user.
 */
export async function assignUserSubscriptionTier(
  supabaseAdmin: SupabaseClient<any, any, any>,
  userId: string,
  tier: PlanTier,
): Promise<{ success: boolean; message: string }> {
  try {
    // Delete any existing tier_* role
    const tierRoles = ["tier_foundation", "tier_pro", "tier_mastery", "tier_elite", "foundation", "pro", "mastery", "elite"];
    for (const r of tierRoles) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", r);
    }

    if (tier !== "free") {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: `tier_${tier}`,
      });
    }

    return {
      success: true,
      message: `Successfully updated plan to ${TIER_LIMITS[tier].name}.`,
    };
  } catch (err: any) {
    console.error("Failed to assign subscription tier:", err);
    return {
      success: false,
      message: err?.message || "Failed to assign subscription tier.",
    };
  }
}
