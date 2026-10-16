import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isVaquitavoid } from "./auth-admin";
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

const UpiSubmissionInput = z.object({
  tier: z.enum(["foundation", "pro", "mastery", "elite"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  amount: z.number().int().min(1),
  utrReference: z.string().min(6).max(30),
});

export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.VITE_RAZORPAY_KEY_ID ||
      "rzp_test_marginal_placeholder";

    let merchantUpiId =
      process.env.MERCHANT_UPI_ID ||
      process.env.VITE_MERCHANT_UPI_ID ||
      "marginal.study@okaxis";

    try {
      const { data: settingsRow } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", 1)
        .maybeSingle();
      if (
        settingsRow?.value &&
        typeof settingsRow.value === "object" &&
        (settingsRow.value as any).merchant_upi_id
      ) {
        merchantUpiId = (settingsRow.value as any).merchant_upi_id;
      }
    } catch {
      /* fallback to env var or default */
    }

    const { supabase, userId } = context;
    const currentSub = await getUserSubscriptionDetails(
      supabase,
      userId,
      (context as any).email,
      (context as any).claims,
    );

    // Check if this student has an active pending UPI payment request
    let pendingRequest: {
      id: string;
      utr: string;
      tier: string;
      amount: number;
      submittedAt: string;
      status: string;
    } | null = null;

    try {
      const { data: userLogs } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id, error_message, created_at, ok")
        .eq("user_id", userId)
        .eq("feature", "upi_payment_request")
        .order("created_at", { ascending: false })
        .limit(5);

      if (userLogs && userLogs.length > 0) {
        for (const log of userLogs) {
          if (log.error_message) {
            try {
              const parsed = JSON.parse(log.error_message);
              if (parsed.status === "pending") {
                pendingRequest = {
                  id: log.id,
                  utr: parsed.utr,
                  tier: parsed.tier,
                  amount: parsed.amount,
                  submittedAt: parsed.submittedAt || log.created_at,
                  status: "pending",
                };
                break;
              }
            } catch {
              /* ignore parse error */
            }
          }
        }
      }
    } catch {
      /* ignore non-fatal lookup error */
    }

    return {
      keyId,
      merchantUpiId,
      isTestMode: keyId.startsWith("rzp_test_") || keyId.includes("placeholder"),
      currentTier: currentSub.tier,
      tierDetails: TIER_LIMITS,
      pendingRequest,
    };
  });

/**
 * Submits a direct UPI transaction UTR for administrator review and verification.
 * Enforces strictly 12-digit format and prevents duplicate submissions.
 */
export const submitUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpiSubmissionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const cleanUtr = data.utrReference.trim().replace(/\s+/g, "");

    // 1. Validate 12-digit numeric structure
    if (!/^\d{12}$/.test(cleanUtr)) {
      throw new Error(
        "Invalid UTR: Please enter the exact 12-digit numeric reference number from your GPay, PhonePe, or Paytm receipt.",
      );
    }

    // 2. Prevent duplicate UTR usage across all accounts
    try {
      const { data: duplicates } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id, error_message")
        .eq("feature", "upi_payment_request")
        .ilike("error_message", `%"utr":"${cleanUtr}"%`)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        throw new Error(
          "This 12-digit UPI reference (UTR) has already been submitted for verification. If you have an inquiry, please contact administrator support.",
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes("already been submitted")) {
        throw err;
      }
    }

    // 3. Log the pending payment request
    const userEmail = (context as any).email || (context as any).claims?.email || "";
    const payload = {
      utr: cleanUtr,
      tier: data.tier,
      amount: data.amount,
      billingCycle: data.billingCycle,
      userEmail,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: userId,
      feature: "upi_payment_request",
      model: `tier_${data.tier}`,
      ok: false, // false denotes pending verification
      error_message: JSON.stringify(payload),
    });

    const limits = TIER_LIMITS[data.tier];
    return {
      success: true,
      pending: true,
      utr: cleanUtr,
      tier: data.tier,
      tierName: limits.name,
      message: `Your payment reference (#${cleanUtr}) for the ${limits.name} plan has been submitted! It will be verified against our bank statement and activated shortly.`,
    };
  });

/**
 * Standard gateway or sandbox activation.
 */
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

/* ── Admin Management Functions ────────────────────────────────────────── */

/**
 * Lists all incoming UPI payment verification requests for Admin review.
 */
export const listUpiPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = isVaquitavoid({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can review payment approvals.");
    }

    const { data: logs, error } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, feature, model, ok, error_message, created_at")
      .eq("feature", "upi_payment_request")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    // Map logs to clean typed request objects
    const requests = (logs || []).map((log) => {
      let parsed: any = {};
      try {
        if (log.error_message) {
          parsed = JSON.parse(log.error_message);
        }
      } catch {
        parsed = { utr: log.error_message || "UNKNOWN", status: log.ok ? "approved" : "pending" };
      }

      return {
        id: log.id,
        userId: log.user_id || "",
        userEmail: parsed.userEmail || "Student (User " + (log.user_id?.slice(0, 8) || "") + ")",
        tier: (parsed.tier || log.model.replace("tier_", "")) as PlanTier,
        amount: parsed.amount || (parsed.tier === "foundation" ? 149 : parsed.tier === "pro" ? 399 : parsed.tier === "mastery" ? 599 : 999),
        utr: parsed.utr || "N/A",
        status: (parsed.status || (log.ok ? "approved" : "pending")) as "pending" | "approved" | "rejected",
        submittedAt: parsed.submittedAt || log.created_at,
        reviewedAt: parsed.reviewedAt,
        reviewedBy: parsed.reviewedBy,
        rejectionReason: parsed.rejectionReason,
      };
    });

    return { requests };
  });

/**
 * Admin action: approves a student's UPI payment, unlocks their tier, and grants credits.
 */
export const approveUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        userId: z.string(),
        tier: z.enum(["foundation", "pro", "mastery", "elite"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isVaquitavoid({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can approve payments.");
    }

    // 1. Upgrade user tier and assign credits
    const result = await assignUserSubscriptionTier(supabaseAdmin, data.userId, data.tier);
    if (!result.success) {
      throw new Error(result.message);
    }

    // 2. Update log record with approved state
    const { data: logRow } = await supabaseAdmin
      .from("ai_usage_log")
      .select("error_message")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (logRow?.error_message) parsed = JSON.parse(logRow.error_message);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: "vaquitavoid",
    };

    await supabaseAdmin
      .from("ai_usage_log")
      .update({
        ok: true,
        error_message: JSON.stringify(updatedPayload),
      })
      .eq("id", data.logId);

    const limits = TIER_LIMITS[data.tier];
    return {
      success: true,
      message: `Payment verified! User upgraded to ${limits.name} (${limits.liveExaminerCredits} Live Examiner credits unlocked).`,
    };
  });

/**
 * Admin action: rejects a fraudulent or invalid UPI submission.
 */
export const rejectUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        reason: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isVaquitavoid({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can reject payments.");
    }

    const { data: logRow } = await supabaseAdmin
      .from("ai_usage_log")
      .select("error_message")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (logRow?.error_message) parsed = JSON.parse(logRow.error_message);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: "vaquitavoid",
      rejectionReason: data.reason || "UTR reference not found in bank statement.",
    };

    await supabaseAdmin
      .from("ai_usage_log")
      .update({
        ok: false,
        error_message: JSON.stringify(updatedPayload),
      })
      .eq("id", data.logId);

    return {
      success: true,
      message: "Payment submission rejected and logged.",
    };
  });

/**
 * Admin action: revokes an approved subscription if a dispute occurs or bank payment bounced.
 */
export const revokeUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        userId: z.string(),
        reason: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isVaquitavoid({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can revoke payments.");
    }

    // Reset user to free tier
    await assignUserSubscriptionTier(supabaseAdmin, data.userId, "free");

    const { data: logRow } = await supabaseAdmin
      .from("ai_usage_log")
      .select("error_message")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (logRow?.error_message) parsed = JSON.parse(logRow.error_message);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "rejected",
      revokedAt: new Date().toISOString(),
      rejectionReason: data.reason || "Subscription access revoked by administrator.",
    };

    await supabaseAdmin
      .from("ai_usage_log")
      .update({
        ok: false,
        error_message: JSON.stringify(updatedPayload),
      })
      .eq("id", data.logId);

    return {
      success: true,
      message: "User plan revoked and reset to Free tier.",
    };
  });

/**
 * Admin action: updates the active Merchant UPI ID dynamically in site_settings.
 */
export const updateMerchantUpiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ upiId: z.string().min(3).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isVaquitavoid({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can update merchant UPI.");
    }

    const { data: row } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    const existing = (row?.value as Record<string, any>) || {};
    await supabaseAdmin
      .from("site_settings")
      .upsert({
        id: 1,
        value: {
          ...existing,
          merchant_upi_id: data.upiId.trim(),
        },
      });

    return {
      success: true,
      merchantUpiId: data.upiId.trim(),
      message: `Merchant UPI handle updated to ${data.upiId.trim()}!`,
    };
  });
