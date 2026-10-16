import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { assignUserSubscriptionTier, getUserSubscriptionDetails } from "./subscription.server";
import { TIER_LIMITS, type PlanTier } from "./usage-limits";

const ActivateInput = z.object({
  tier: z.enum(["foundation", "pro", "mastery", "elite"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  signature: z.string().optional(),
  isSimulation: z.boolean().optional(),
  method: z.enum(["razorpay", "upi_direct", "sandbox"]).optional(),
  utrReference: z.string().optional(),
});

export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.VITE_RAZORPAY_KEY_ID ||
      "rzp_test_marginal_placeholder";

    const merchantUpiId =
      process.env.MERCHANT_UPI_ID ||
      process.env.VITE_MERCHANT_UPI_ID ||
      "marginal.study@okaxis";

    const { supabase, userId } = context;
    const currentSub = await getUserSubscriptionDetails(
      supabase,
      userId,
      (context as any).email,
      (context as any).claims,
    );

    return {
      keyId,
      merchantUpiId,
      isTestMode: keyId.startsWith("rzp_test_") || keyId.includes("placeholder"),
      currentTier: currentSub.tier,
      tierDetails: TIER_LIMITS,
    };
  });

export const activateSubscriptionTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const tier = data.tier as PlanTier;

    // Log the transaction attempt
    try {
      const errorMsg = data.utrReference
        ? `Direct UPI UTR: ${data.utrReference}`
        : data.isSimulation
          ? "Activated via sandbox instant verification"
          : `Razorpay payment ID: ${data.paymentId ?? "direct"}`;

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "payment_activation",
        model: `tier_${tier}`,
        ok: true,
        error_message: errorMsg,
      });
    } catch {
      /* logging failure is non-fatal */
    }

    const result = await assignUserSubscriptionTier(supabaseAdmin, userId, tier);
    if (!result.success) {
      throw new Error(result.message);
    }

    const limits = TIER_LIMITS[tier];
    return {
      success: true,
      tier,
      tierName: limits.name,
      liveExaminerCredits: limits.liveExaminerCredits,
      maxEssays: limits.maxEssaysPerMonth,
      message: `Congratulations! Your ${limits.name} plan is now active with ${limits.liveExaminerCredits} Live Examiner credits.`,
    };
  });
