import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { assertAdmin } from "@/lib/auth-admin";
import { readEnv } from "@/server/env";

export const FEEDBACK_CATEGORIES = [
  "feedback",
  "bug",
  "feature_request",
  "grading_question",
  "general",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const CATEGORY_DISPLAY_LABELS: Record<FeedbackCategory, string> = {
  feedback: "Feedback & Suggestions",
  bug: "Bug Report / Technical Issue",
  feature_request: "Feature Request",
  grading_question: "Essay Grading Question",
  general: "General Enquiry",
};

export type FeedbackItem = {
  id: string;
  category: FeedbackCategory;
  categoryLabel: string;
  subject: string;
  message: string;
  name: string;
  email: string;
  pageUrl?: string;
  userId?: string | null;
  createdAt: string;
};

const FeedbackInput = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).default("feedback"),
  subject: z.string().trim().min(2, "Subject is required").max(160),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(4000),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Valid email required").max(254).optional(),
  pageUrl: z.string().trim().max(500).optional(),
});

/**
 * Direct channel for users to send feedback, bug reports, and messages directly to the Marginal team.
 * Persists in the database and triggers an email notification to marginal.econ.ai@gmail.com.
 */
export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    let authedUser: any = null;
    try {
      const { data: userData } = await (context as any)?.supabase?.auth?.getUser() ?? {};
      authedUser = userData?.user ?? null;
    } catch {}

    const resolvedEmail = data.email || authedUser?.email || "anonymous@marginal.internal";
    const resolvedName =
      data.name ||
      authedUser?.user_metadata?.full_name ||
      authedUser?.user_metadata?.name ||
      (authedUser?.email ? authedUser.email.split("@")[0] : "Student / User");
    const userId = authedUser?.id ?? null;

    const payloadObj = {
      name: resolvedName,
      email: resolvedEmail,
      category: data.category,
      subject: data.subject,
      message: data.message,
      pageUrl: data.pageUrl || "",
      userId,
      submittedAt: new Date().toISOString(),
    };

    // 1. Persist directly to database (using ai_usage_log for universal storage across environments)
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "USER_FEEDBACK",
        model: data.category,
        latency_ms: 0,
        ok: true,
        error_message: JSON.stringify(payloadObj),
      });
    } catch (dbErr) {
      console.warn("[feedback.functions] Failed to insert feedback into database:", dbErr);
    }

    // 2. Dispatch email notification to marginal.econ.ai@gmail.com
    try {
      const apiKey = readEnv("MAILJET_API_KEY");
      const secretKey = readEnv("MAILJET_SECRET_KEY");
      const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";
      const adminEmail = "marginal.econ.ai@gmail.com";
      const categoryLabel = CATEGORY_DISPLAY_LABELS[data.category] || data.category;

      if (apiKey && secretKey) {
        await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: sender, Name: "Marginal User Feedback" },
                To: [{ Email: adminEmail, Name: "Marginal Team" }],
                ReplyTo: { Email: resolvedEmail, Name: resolvedName },
                Subject: `[${categoryLabel}] ${data.subject}`,
                HTMLPart: `
                  <div style="font-family:sans-serif;background:#f8fafc;padding:24px;border:1px solid #cbd5e1;border-radius:12px;max-width:600px;margin:0 auto;color:#0f172a">
                    <span style="display:inline-block;background:#3b82f6;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;text-transform:uppercase">
                      ${categoryLabel}
                    </span>
                    <h2 style="margin:12px 0 6px">${data.subject}</h2>
                    <p style="color:#64748b;font-size:13px;margin:0 0 16px">
                      From: <strong>${resolvedName}</strong> &lt;${resolvedEmail}&gt;
                      ${data.pageUrl ? ` · Page: ${data.pageUrl}` : ""}
                    </p>
                    <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;line-height:1.6">
                      ${data.message}
                    </div>
                    <p style="margin-top:20px;font-size:12px;color:#94a3b8">
                      Sent via Marginal in-app direct communication channel.
                    </p>
                  </div>
                `,
              },
            ],
          }),
          signal: AbortSignal.timeout(8000),
        });
      }
    } catch (emailErr) {
      console.warn("[feedback.functions] Failed to dispatch email notification:", emailErr);
    }

    return {
      ok: true,
      message: "Thank you! Your feedback has been sent directly to the team.",
    };
  });

/**
 * Admin: List all direct feedback and user messages.
 */
export const fetchFeedbackList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: FeedbackItem[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, feature, model, error_message, created_at")
      .eq("feature", "USER_FEEDBACK")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[feedback.functions] Error fetching user feedback:", error.message);
      return { items: [] };
    }

    const items: FeedbackItem[] = [];

    for (const row of rows ?? []) {
      try {
        const parsed = JSON.parse(row.error_message || "{}");
        const cat = (parsed.category as FeedbackCategory) || "feedback";
        items.push({
          id: row.id,
          category: cat,
          categoryLabel: CATEGORY_DISPLAY_LABELS[cat] || cat,
          subject: parsed.subject || "No subject",
          message: parsed.message || "",
          name: parsed.name || "Student",
          email: parsed.email || "No email",
          pageUrl: parsed.pageUrl || "",
          userId: row.user_id || parsed.userId || null,
          createdAt: row.created_at,
        });
      } catch {
        // Fallback for unparseable rows
        items.push({
          id: row.id,
          category: "feedback",
          categoryLabel: "Feedback",
          subject: "User Message",
          message: row.error_message || "",
          name: "User",
          email: "unknown",
          createdAt: row.created_at,
        });
      }
    }

    return { items };
  });

/**
 * Admin: Dismiss or delete a feedback item.
 */
export const deleteFeedbackItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { error } = await supabaseAdmin.from("ai_usage_log").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
