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
  replied?: boolean;
  repliedAt?: string;
  replyMessage?: string;
  replySubject?: string;
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
          replied: Boolean(parsed.replied),
          repliedAt: parsed.repliedAt || undefined,
          replyMessage: parsed.replyMessage || undefined,
          replySubject: parsed.replySubject || undefined,
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

/**
 * Admin: Reply directly to a user's bug report or feedback.
 * Sends an email notification (via Mailjet) and/or creates an in-app message.
 */
export const replyToFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        feedbackId: z.string().uuid(),
        recipientEmail: z.string().trim().email(),
        recipientName: z.string().trim(),
        recipientUserId: z.string().nullable().optional(),
        replySubject: z.string().trim().min(2).max(200),
        replyMessage: z.string().trim().min(5).max(4000),
        originalMessage: z.string().optional(),
        sendEmail: z.boolean().default(true),
        sendInApp: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    let emailSent = false;
    let inAppSent = false;

    // 1. Send via Mailjet email if requested
    if (data.sendEmail && data.recipientEmail && !data.recipientEmail.includes("anonymous")) {
      try {
        const apiKey = readEnv("MAILJET_API_KEY");
        const secretKey = readEnv("MAILJET_SECRET_KEY");
        const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";

        if (apiKey && secretKey) {
          const resp = await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: sender, Name: "Marginal Team" },
                  To: [{ Email: data.recipientEmail, Name: data.recipientName }],
                  Subject: data.replySubject,
                  HTMLPart: `
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0914;padding:32px 16px;color:#f8fafc;">
                      <div style="max-width:580px;margin:0 auto;background:#181124;border:1px solid rgba(147,51,234,0.3);border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                          <div style="background:#7c3aed;color:#ffffff;font-weight:bold;font-size:16px;width:32px;height:32px;border-radius:8px;text-align:center;line-height:32px;">m</div>
                          <span style="font-weight:bold;font-size:16px;color:#ffffff;letter-spacing:-0.02em;">Marginal Support</span>
                        </div>
                        <h2 style="margin:0 0 16px;font-size:18px;color:#ffffff;line-height:1.4;">${data.replySubject}</h2>
                        <p style="margin:0 0 16px;font-size:14px;color:#cbd5e1;line-height:1.6;">Hi ${data.recipientName},</p>
                        <div style="background:#221833;border-left:3px solid #a855f7;padding:16px;border-radius:8px;margin-bottom:20px;font-size:14px;line-height:1.6;color:#f1f5f9;white-space:pre-wrap;">${data.replyMessage}</div>
                        ${
                          data.originalMessage
                            ? `
                          <div style="border-top:1px solid #2d2244;padding-top:16px;margin-top:20px;">
                            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">Your Original Report</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;font-style:italic;line-height:1.5;">${data.originalMessage.slice(0, 300)}${data.originalMessage.length > 300 ? "..." : ""}</p>
                          </div>
                        `
                            : ""
                        }
                        <p style="margin:24px 0 0;font-size:12px;color:#64748b;border-top:1px solid #2d2244;padding-top:16px;">
                          Marginal · Cambridge 9708 Economics Platform · <a href="https://marginal-econ.com" style="color:#a855f7;text-decoration:none;">marginal-econ.com</a>
                        </p>
                      </div>
                    </div>
                  `,
                },
              ],
            }),
            signal: AbortSignal.timeout(10000),
          });
          emailSent = resp.ok;
        }
      } catch (err) {
        console.warn("[feedback.functions] Failed to send email reply:", err);
      }
    }

    // 2. Send in-app message if user has an account
    if (data.sendInApp && data.recipientUserId) {
      try {
        const inAppPayload = {
          sender: "admin",
          senderName: "Marginal Team",
          text: `[Reply to: ${data.replySubject}]\n\n${data.replyMessage}`,
          createdAt: new Date().toISOString(),
        };

        await supabaseAdmin.from("ai_usage_log").insert({
          user_id: data.recipientUserId,
          feature: "DIRECT_MESSAGE",
          model: "feedback_reply",
          ok: false, // unread
          error_message: JSON.stringify(inAppPayload),
        });
        inAppSent = true;
      } catch (err) {
        console.warn("[feedback.functions] Failed to send in-app message:", err);
      }
    }

    // 3. Mark feedback item as replied in database
    try {
      const { data: row } = await supabaseAdmin
        .from("ai_usage_log")
        .select("error_message")
        .eq("id", data.feedbackId)
        .single();

      if (row?.error_message) {
        const existing = JSON.parse(row.error_message);
        existing.replied = true;
        existing.repliedAt = new Date().toISOString();
        existing.replyMessage = data.replyMessage;
        existing.replySubject = data.replySubject;

        await supabaseAdmin
          .from("ai_usage_log")
          .update({
            ok: true, // mark as handled
            error_message: JSON.stringify(existing),
          })
          .eq("id", data.feedbackId);
      }
    } catch (err) {
      console.warn("[feedback.functions] Failed to update feedback replied state:", err);
    }

    return {
      ok: true,
      emailSent,
      inAppSent,
      message:
        emailSent && inAppSent
          ? "Reply dispatched via Email and In-App notification!"
          : emailSent
          ? "Reply sent to user's email."
          : inAppSent
          ? "Reply delivered as an in-app message."
          : "Reply recorded successfully.",
    };
  });
