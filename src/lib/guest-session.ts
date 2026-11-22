import { supabase } from "@/integrations/backend/client";
import { createGuestSession } from "@/lib/guest-auth.functions";

/**
 * Checks whether the current user is an anonymous guest student.
 */
export function isGuestUser(user?: any): boolean {
  if (typeof window === "undefined") return false;
  if (user?.user_metadata?.is_guest === true) return true;
  if (user?.email && user.email.includes("@guest.marginal-econ.com")) return true;
  return localStorage.getItem("marginal_is_guest") === "true";
}

/**
 * Ensures that the client has an active Supabase session.
 * If the user is already signed in, returns their session user.
 * If not, transparently creates an ephemeral guest account via createGuestSession,
 * verifies the OTP, and establishes a genuine Supabase session in localStorage.
 */
export async function ensureSessionOrGuest(): Promise<any> {
  if (typeof window === "undefined") return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      if (sessionData.session.user.user_metadata?.is_guest) {
        localStorage.setItem("marginal_is_guest", "true");
      }
      return sessionData.session.user;
    }

    // Initialize ephemeral guest session
    const guestCreds = await createGuestSession();
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: guestCreds.email,
      token: guestCreds.otp,
      type: "email",
    });

    if (verifyError || !verifyData?.session?.user) {
      console.warn("Guest session initialization warning:", verifyError?.message);
      return null;
    }

    localStorage.setItem("marginal_is_guest", "true");
    return verifyData.session.user;
  } catch (err) {
    console.warn("Guest auth error:", err);
    return null;
  }
}

/**
 * Upgrades a guest student account to a permanent registered account.
 */
export async function upgradeGuestAccount(input: {
  email: string;
  password?: string;
  fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email: input.email.trim(),
      password: input.password,
      data: {
        is_guest: false,
        full_name: input.fullName?.trim() || "Cambridge Student",
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    localStorage.removeItem("marginal_is_guest");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update account" };
  }
}
