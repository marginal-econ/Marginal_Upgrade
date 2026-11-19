import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VerifySignupInput = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  turnstileToken: z.string().optional().nullable(),
});

export const verifySignupEligibility = createServerFn({ method: "POST" })
  .validator((input: unknown) => VerifySignupInput.parse(input))
  .handler(async ({ data }) => {
    const { isDisposableEmail } = await import("@/server/disposable-email");
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const { readEnv } = await import("@/server/env");

    const email = data.email.trim().toLowerCase();

    // 1. Strict Disposable / Temporary Email Check
    if (isDisposableEmail(email)) {
      throw new Error(
        "Temporary or disposable email addresses (such as temp-mail, 10minutemail, mailinator) are not permitted. Please use your permanent personal or institutional email.",
      );
    }

    // 2. Cloudflare Turnstile Verification
    const turnstileSecret =
      readEnv("TURNSTILE_SECRET_KEY") || readEnv("VITE_TURNSTILE_SECRET_KEY");

    if (data.turnstileToken && turnstileSecret) {
      try {
        const formData = new URLSearchParams();
        formData.append("secret", turnstileSecret);
        formData.append("response", data.turnstileToken);

        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          },
        );
        const verifyData: any = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error("Bot verification failed. Please refresh and try again.");
        }
      } catch (err: any) {
        if (err?.message?.includes("Bot verification")) throw err;
        console.warn("Turnstile siteverify warning:", err);
      }
    }

    // 3. Existing User Account Check
    const admin = getSupabaseAdmin();
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      throw new Error(
        "An account with this email address already exists. Please sign in instead.",
      );
    }

    return { allowed: true };
  });
