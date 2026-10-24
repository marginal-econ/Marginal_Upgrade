import { readEnv } from "@/server/env";

export type PaidKeyAlertPayload = {
  keySuffix: string;
  model: string;
  feature?: string;
  userId?: string | null;
  latencyMs?: number;
};

/**
 * Triggers a high-priority alert when all free keys fail/exhaust and
 * Marginal has to consume an emergency Paid API key.
 *
 * 1. Logs an explicit PAID_KEY_ALERT row into ai_usage_log for the Admin Dashboard.
 * 2. Asynchronously pings the administrator email via Mailjet.
 */
export async function triggerPaidKeyAlert(payload: PaidKeyAlertPayload): Promise<void> {
  const { keySuffix, model, feature = "chat", userId = null, latencyMs = 0 } = payload;
  const nowStr = new Date().toUTCString();
  const alertText = `🚨 URGENT ADMIN ALERT: Free pool keys exhausted or rate-limited! Request for '${feature}' hopped to emergency PAID key (...${keySuffix}) on model '${model}'.`;

  // 1. Database log for instant Admin Console visibility
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: userId,
      feature: "PAID_KEY_ALERT",
      model,
      latency_ms: latencyMs,
      ok: true,
      error_message: alertText,
    });
  } catch (dbErr) {
    console.warn("[alerts.server] Failed to record PAID_KEY_ALERT in database:", dbErr);
  }

  // 2. Email ping to administrator
  try {
    const apiKey = readEnv("MAILJET_API_KEY");
    const secretKey = readEnv("MAILJET_SECRET_KEY");
    const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";
    const adminEmail = "marginal.econ.ai@gmail.com";

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
              From: { Email: sender, Name: "Marginal AI Alert System" },
              To: [{ Email: adminEmail, Name: "Marginal Admin" }],
              Subject: `🚨 [CRITICAL ALERT] Marginal AI hopped to PAID KEY (...${keySuffix})`,
              HTMLPart: `
                <div style="font-family:sans-serif;background:#fff1f2;padding:24px;border:2px solid #e11d48;border-radius:12px;max-width:600px;margin:0 auto;color:#1e293b">
                  <h2 style="color:#e11d48;margin-top:0">⚠️ Emergency Paid Key In Use</h2>
                  <p>All free pool keys in the rotation pool have been exhausted, timed out, or rate-limited by Google.</p>
                  <p>A user request just consumed paid credits on your backup Paid Key:</p>
                  <ul style="background:#fff;padding:16px 24px;border-radius:8px;border:1px solid #fda4af">
                    <li><strong>Key Suffix:</strong> ...${keySuffix}</li>
                    <li><strong>Model:</strong> ${model}</li>
                    <li><strong>Feature:</strong> ${feature}</li>
                    <li><strong>Time:</strong> ${nowStr}</li>
                  </ul>
                  <p style="margin-top:20px">
                    <a href="https://app.marginal-econ.workers.dev/admin" style="background:#e11d48;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">
                      Open Admin Panel to Add Free Keys &rarr;
                    </a>
                  </p>
                  <p style="font-size:12px;color:#64748b;margin-top:24px">This is an automated notification from Marginal Cambridge Economics Platform.</p>
                </div>
              `,
            },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    }
  } catch (emailErr) {
    console.warn("[alerts.server] Failed to send email alert:", emailErr);
  }
}
