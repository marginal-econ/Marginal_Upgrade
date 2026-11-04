import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { DEFAULT_PRICING_PLANS, type PlatformPricingPlans } from "./pricing-plans";
import { assignUserSubscriptionTier } from "./subscription.server";
import type { PlanTier } from "./usage-limits";

/**
 * Public server function: retrieves the current active platform pricing plans.
 * Dynamic: reads custom prices set by Admin from site_settings (or defaults).
 */
export const getPlatformPricing = createServerFn({ method: "GET" }).handler(async () => {
  // 1. Primary: definitions table
  try {
    const { data: defRow } = await supabaseAdmin
      .from("definitions")
      .select("definition_text")
      .eq("term", "__SYS_PRICING_PLANS__")
      .maybeSingle();

    if (defRow?.definition_text) {
      const customPlans = JSON.parse(defRow.definition_text);
      if (customPlans && typeof customPlans === "object") {
        const merged: PlatformPricingPlans = { ...DEFAULT_PRICING_PLANS };
        for (const [key, val] of Object.entries(customPlans)) {
          if (val && typeof val === "object") {
            const base = (DEFAULT_PRICING_PLANS as any)[key] || {};
            merged[key] = {
              ...base,
              ...(val as any),
              restrictions: {
                ...(base.restrictions || {}),
                ...((val as any).restrictions || {}),
              },
            };
          }
        }
        return {
          plans: merged,
          isCustom: true,
        };
      }
    }
  } catch (err) {
    console.warn("Exception reading custom pricing from definitions:", err);
  }

  // 2. Secondary: site_settings table
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && "pricing_plans" in data.value) {
      const customPlans = (data.value as any).pricing_plans;
      if (customPlans && typeof customPlans === "object") {
        const merged: PlatformPricingPlans = { ...DEFAULT_PRICING_PLANS };
        for (const [key, val] of Object.entries(customPlans)) {
          if (val && typeof val === "object") {
            const base = (DEFAULT_PRICING_PLANS as any)[key] || {};
            merged[key] = {
              ...base,
              ...(val as any),
              restrictions: {
                ...(base.restrictions || {}),
                ...((val as any).restrictions || {}),
              },
            };
          }
        }
        return {
          plans: merged,
          isCustom: true,
        };
      }
    }
  } catch (err) {
    console.warn("Exception in getPlatformPricing, using defaults:", err);
  }

  return { plans: DEFAULT_PRICING_PLANS, isCustom: false };
});

const TierUpdateSchema = z.object({
  tier: z.string().min(1).max(64),
  name: z.string().optional(),
  tagline: z.string().optional(),
  monthlyPrice: z.number().int().min(0).max(1000000),
  annualPrice: z.number().int().min(0).max(10000000),
  essaysPerMonth: z.number().int().min(1).max(999999),
  liveCredits: z.number().int().min(0).max(999999),
  hasExperimentalLabs: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  badge: z.string().optional(),
  restrictions: z
    .object({
      allowHandwritingOcr: z.boolean().optional(),
      allowModelAnswers: z.boolean().optional(),
      allowDiagramStudio: z.boolean().optional(),
      allowArbitration: z.boolean().optional(),
      allowClassrooms: z.boolean().optional(),
      allowPriorityQueue: z.boolean().optional(),
      mcqAccessLevel: z.enum(["full", "topics_only", "locked"]).optional(),
      maxEssayWords: z.number().optional(),
      dailyEssayLimit: z.number().optional(),
    })
    .optional(),
  features: z.array(z.string()).optional(),
});

/**
 * Admin-only server function: updates prices, quotas, credit allowances, visibility, and feature restrictions for any tier.
 * Immediately persists to definitions and site_settings.
 */
export const updatePlatformPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TierUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can modify pricing plans.");
    }

    // Retrieve existing custom plans
    let currentPricing: Record<string, any> = { ...DEFAULT_PRICING_PLANS };
    try {
      const { data: defRow } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .eq("term", "__SYS_PRICING_PLANS__")
        .maybeSingle();

      if (defRow?.definition_text) {
        const parsed = JSON.parse(defRow.definition_text);
        if (parsed && typeof parsed === "object") {
          currentPricing = { ...currentPricing, ...parsed };
        }
      }
    } catch {
      /* fallback to defaults */
    }

    const tierKey = data.tier;
    const baseTier = currentPricing[tierKey] || (DEFAULT_PRICING_PLANS as any)[tierKey] || {
      name: data.name || tierKey,
      tagline: data.tagline || "Custom platform tier",
      monthlyPrice: data.monthlyPrice,
      annualPrice: data.annualPrice,
      annualEquivalentMonthly: Math.round(data.annualPrice / 12),
      savePct: 0,
      essaysPerMonth: data.essaysPerMonth,
      liveCredits: data.liveCredits,
      hasExperimentalLabs: Boolean(data.hasExperimentalLabs),
      isPublic: data.isPublic ?? false,
      badge: data.badge,
      restrictions: {
        allowHandwritingOcr: false,
        allowModelAnswers: false,
        allowDiagramStudio: true,
        allowArbitration: false,
        allowClassrooms: false,
        allowPriorityQueue: false,
        mcqAccessLevel: "full",
        maxEssayWords: 2000,
      },
      features: [
        `${data.essaysPerMonth} Graded Essays / month`,
        `${data.liveCredits} Live Examiner Credits / month`,
        "Cambridge 9708 Diagnostics & Syllabus Rubrics",
      ],
    };

    const savePct =
      data.annualPrice > 0 && data.monthlyPrice > 0
        ? Math.max(0, Math.round((1 - data.annualPrice / (data.monthlyPrice * 12)) * 100))
        : baseTier.savePct ?? 0;
    const annualEquivalentMonthly =
      data.annualPrice > 0 ? Math.round(data.annualPrice / 12) : data.monthlyPrice;

    const updatedTier = {
      ...baseTier,
      id: tierKey,
      name: data.name || baseTier.name,
      tagline: data.tagline || baseTier.tagline,
      monthlyPrice: data.monthlyPrice,
      annualPrice: data.annualPrice,
      annualEquivalentMonthly,
      savePct,
      essaysPerMonth: data.essaysPerMonth,
      liveCredits: data.liveCredits,
      hasExperimentalLabs:
        data.hasExperimentalLabs !== undefined
          ? data.hasExperimentalLabs
          : baseTier.hasExperimentalLabs,
      isPublic: data.isPublic !== undefined ? data.isPublic : baseTier.isPublic ?? true,
      badge: data.badge !== undefined ? data.badge : baseTier.badge,
      restrictions: {
        ...(baseTier.restrictions || {}),
        ...(data.restrictions || {}),
      },
      features: data.features || baseTier.features,
    };

    const nextPricing = {
      ...currentPricing,
      [tierKey]: updatedTier,
    };

    // 1. Primary: Save to definitions table
    try {
      const { data: existing } = await supabaseAdmin
        .from("definitions")
        .select("id")
        .eq("term", "__SYS_PRICING_PLANS__")
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from("definitions")
          .update({
            definition_text: JSON.stringify(nextPricing),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("definitions").insert({
          term: "__SYS_PRICING_PLANS__",
          definition_text: JSON.stringify(nextPricing),
          category: "system_config",
          source_label: "admin_pricing_plans",
        });
      }
    } catch (err) {
      console.warn("Failed saving pricing plans to definitions table:", err);
    }

    // 2. Secondary: site_settings table
    try {
      const { data: row } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", 1)
        .maybeSingle();
      const existingVal = row?.value && typeof row.value === "object" ? row.value : {};
      await supabaseAdmin.from("site_settings").upsert({
        id: 1,
        value: {
          ...existingVal,
          pricing_plans: nextPricing,
        },
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* non-fatal fallback */
    }

    return {
      success: true,
      tier: tierKey,
      updatedTier,
      message: `Successfully saved ${updatedTier.name} (${updatedTier.isPublic ? "Public" : "Private"}). Changes are live.`,
    };
  });

/**
 * Admin-only server function: deletes a custom or unlisted tier.
 */
export const adminDeletePlatformTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tier: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can delete pricing plans.");
    }

    try {
      const { data: defRow } = await supabaseAdmin
        .from("definitions")
        .select("id, definition_text")
        .eq("term", "__SYS_PRICING_PLANS__")
        .maybeSingle();

      let currentPricing: Record<string, any> = { ...DEFAULT_PRICING_PLANS };
      if (defRow?.definition_text) {
        currentPricing = JSON.parse(defRow.definition_text);
      }

      delete currentPricing[data.tier];

      if (defRow?.id) {
        await supabaseAdmin
          .from("definitions")
          .update({
            definition_text: JSON.stringify(currentPricing),
            updated_at: new Date().toISOString(),
          })
          .eq("id", defRow.id);
      }
      return { success: true, message: `Deleted plan "${data.tier}".` };
    } catch (err: any) {
      throw new Error(`Failed to delete tier: ${err.message}`);
    }
  });

/**
 * Admin-only server function: resets pricing back to hardcoded platform defaults.
 */
export const adminResetPlatformPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized.");
    }

    try {
      await supabaseAdmin.from("definitions").delete().eq("term", "__SYS_PRICING_PLANS__");
      return { success: true, message: "Pricing plans reset to platform defaults." };
    } catch (err: any) {
      throw new Error(`Failed to reset: ${err.message}`);
    }
  });

const AdminManageCreditsSchema = z.object({
  targetUserId: z.string().uuid(),
  tier: z.enum(["free", "foundation", "scholar_plus", "pro", "mastery", "elite"]).optional(),
  additionalCredits: z.number().int().optional(),
});

/**
 * Admin-only server function: manages user credits, promotes tiers, or grants bonus Live Examiner credits.
 */
export const adminManageUserCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AdminManageCreditsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can manage user credits.");
    }

    if (data.tier) {
      await assignUserSubscriptionTier(supabaseAdmin, data.targetUserId, data.tier as PlanTier);
    }

    if (data.additionalCredits && data.additionalCredits !== 0) {
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: data.targetUserId,
        feature: "admin_credit_grant",
        model: `credits_${data.additionalCredits > 0 ? "added" : "deducted"}`,
        prompt_tokens: Math.abs(data.additionalCredits),
        ok: true,
        error_message: `Admin granted ${data.additionalCredits} Live Examiner credits`,
      });
    }

    return {
      success: true,
      message: `User ${data.targetUserId.slice(0, 8)} updated successfully.`,
    };
  });
