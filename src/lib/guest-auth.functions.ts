import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/backend/client.server";

export const COMMON_GUEST_EMAIL = "guest.student@marginal-econ.com";
export const COMMON_GUEST_PASSWORD = "MarginalGuest2026!CommonAccess";

export interface GuestSessionPayload {
  email: string;
  password?: string;
  otp: string;
}

/**
 * Ensures the single, shared guest account exists in Supabase and returns credentials.
 * Using a common guest account prevents guest visitors from creating endless auth rows
 * and inflating active user metrics or registered user counts.
 */
export const createGuestSession = createServerFn({ method: "POST" })
  .handler(async (): Promise<GuestSessionPayload> => {
    let existingUserId: string | null = null;
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (userList?.users || []).find(
        (u) => u.email?.toLowerCase() === COMMON_GUEST_EMAIL.toLowerCase(),
      );
      if (found) {
        existingUserId = found.id;
      }
    } catch (e) {
      console.warn("Could not list users to find common guest account:", e);
    }

    if (!existingUserId) {
      // Create the single shared guest account once
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: COMMON_GUEST_EMAIL,
        password: COMMON_GUEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          is_guest: true,
          full_name: "Guest Student",
          role: "student",
          tier: "free",
        },
      });

      if (createError && !createError.message.toLowerCase().includes("already registered")) {
        throw new Error(createError.message || "Failed to initialize common guest user");
      }
      existingUserId = createData?.user?.id || null;
    }

    // Ensure profile row exists for this shared guest account
    if (existingUserId) {
      try {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: existingUserId,
            full_name: "Guest Student",
            school: "Guest Preview",
          },
          { onConflict: "id" },
        );
      } catch {
        // Non-blocking
      }
    }

    // Generate link / OTP for seamless client sign-in verification fallback
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: COMMON_GUEST_EMAIL,
    });

    const otp = linkData?.properties?.email_otp || "";

    return {
      email: COMMON_GUEST_EMAIL,
      password: COMMON_GUEST_PASSWORD,
      otp,
    };
  });

/**
 * Upgrades a guest student to a permanent real account by creating their new user row.
 * Leaving the shared guest account untouched for future prospective students.
 */
export const upgradeGuestAccountServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string; userId?: string }> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const cleanName = data.fullName?.trim() || "Cambridge Student";

    // Create the real permanent account with email confirmed
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        is_guest: false,
        full_name: cleanName,
        role: "student",
        tier: "free",
      },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes("already registered")) {
        return {
          success: false,
          error: "An account with this email address already exists. Please sign in instead.",
        };
      }
      return { success: false, error: createError.message };
    }

    const userId = newUserData.user.id;

    // Create profile
    try {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          full_name: cleanName,
          school: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } catch (e) {
      console.warn("Could not upsert profile for upgraded account:", e);
    }

    // Grant student role
    try {
      await supabaseAdmin.from("user_roles").upsert(
        {
          user_id: userId,
          role: "student",
        },
        { onConflict: "user_id,role" },
      );
    } catch (e) {
      console.warn("Could not assign student role for upgraded account:", e);
    }

    return { success: true, userId };
  });
