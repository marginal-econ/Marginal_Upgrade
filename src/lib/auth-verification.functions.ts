import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VerifySignupInput = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  turnstileToken: z.string().optional().nullable(),
});

const DirectSignupInput = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().optional().nullable(),
  school: z.string().optional().nullable(),
  turnstileToken: z.string().optional().nullable(),
});

export const directSignupFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => DirectSignupInput.parse(input))
  .handler(async ({ data }) => {
    const { isDisposableEmail } = await import("@/server/disposable-email");
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const { readEnv } = await import("@/server/env");

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName?.trim() || email.split("@")[0];
    const password = data.password;
    const school = data.school?.trim();

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

    // 3. Check for existing profile
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

    // 4. Create pre-confirmed user in Supabase Auth (instant access with email_confirm: true)
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        school: school || undefined,
        role: "student",
      },
    });

    let userId = createData?.user?.id;

    if (createError) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const match = listData?.users?.find((u) => u.email?.toLowerCase() === email);

      if (match) {
        userId = match.id;
        await admin.auth.admin.updateUserById(match.id, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            school: school || undefined,
            role: "student",
          },
        });
      } else {
        throw new Error(createError.message || "Failed to create account.");
      }
    }

    // 5. Ensure profile row exists
    if (userId) {
      await admin.from("profiles").upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          school: school || null,
          role: "student",
        },
        { onConflict: "id" },
      );
    }

    return { success: true, userId };
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
