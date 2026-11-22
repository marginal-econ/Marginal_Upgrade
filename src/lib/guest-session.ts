import { supabase } from "@/integrations/backend/client";
import {
  COMMON_GUEST_EMAIL,
  COMMON_GUEST_PASSWORD,
  createGuestSession,
  upgradeGuestAccountServer,
} from "@/lib/guest-auth.functions";

export const GUEST_ESSAY_GRADED_KEY = "marginal_guest_essay_graded";
export const GUEST_MCQ_COMPLETED_KEY = "marginal_guest_mcq_completed";
export const GUEST_TRIAL_USED_KEY = "marginal_guest_trial_used";

/**
 * Checks whether the current user is an anonymous guest student.
 */
export function isGuestUser(user?: any): boolean {
  if (typeof window === "undefined") return false;
  if (user?.user_metadata?.is_guest === true) return true;
  if (user?.email) {
    const email = user.email.toLowerCase();
    if (
      email === COMMON_GUEST_EMAIL.toLowerCase() ||
      email.includes("@guest.marginal-econ.com") ||
      email.startsWith("guest_") ||
      email.startsWith("test_guest_") ||
      email.startsWith("upgrade_test_")
    ) {
      return true;
    }
  }
  return localStorage.getItem("marginal_is_guest") === "true";
}

/**
 * Returns true if the guest user has already graded 1 essay or completed 1 MCQ session.
 */
export function hasGuestUsedTrial(user?: any): boolean {
  if (typeof window === "undefined") return false;
  if (!isGuestUser(user)) return false;
  return (
    localStorage.getItem(GUEST_TRIAL_USED_KEY) === "true" ||
    localStorage.getItem(GUEST_ESSAY_GRADED_KEY) === "true" ||
    localStorage.getItem(GUEST_MCQ_COMPLETED_KEY) === "true"
  );
}

/**
 * Records that a guest has graded their 1 trial essay.
 */
export function recordGuestEssayGraded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_ESSAY_GRADED_KEY, "true");
  localStorage.setItem(GUEST_TRIAL_USED_KEY, "true");
}

/**
 * Records that a guest has completed their 1 trial MCQ paper.
 */
export function recordGuestMcqCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_MCQ_COMPLETED_KEY, "true");
  localStorage.setItem(GUEST_TRIAL_USED_KEY, "true");
}

/**
 * Clears guest trial status upon successful account registration.
 */
export function clearGuestTrial(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_ESSAY_GRADED_KEY);
  localStorage.removeItem(GUEST_MCQ_COMPLETED_KEY);
  localStorage.removeItem(GUEST_TRIAL_USED_KEY);
}

/**
 * Ensures that the client has an active Supabase session.
 * If the user is already signed in, returns their session user.
 * If not, transparently signs into the single common shared guest account
 * (`guest.student@marginal-econ.com`), ensuring database metrics are never inflated.
 */
export async function ensureSessionOrGuest(): Promise<any> {
  if (typeof window === "undefined") return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      if (isGuestUser(sessionData.session.user)) {
        localStorage.setItem("marginal_is_guest", "true");
      } else {
        localStorage.removeItem("marginal_is_guest");
      }
      return sessionData.session.user;
    }

    // Initialize session using the single common shared guest account
    const guestCreds = await createGuestSession();

    // 1. Try instant direct password sign-in first
    if (guestCreds.password) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: guestCreds.email,
        password: guestCreds.password,
      });

      if (!signInError && signInData?.session?.user) {
        localStorage.setItem("marginal_is_guest", "true");
        return signInData.session.user;
      }
    }

    // 2. Fallback to OTP verification
    if (guestCreds.otp) {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: guestCreds.email,
        token: guestCreds.otp,
        type: "email",
      });

      if (!verifyError && verifyData?.session?.user) {
        localStorage.setItem("marginal_is_guest", "true");
        return verifyData.session.user;
      }
    }

    return null;
  } catch (err) {
    console.warn("Guest auth error:", err);
    return null;
  }
}

/**
 * Upgrades a guest student account to a permanent registered account.
 * Creates a new personal account for the student and signs them in,
 * keeping the shared guest account clean and reusable for future visitors.
 */
export async function upgradeGuestAccount(input: {
  email: string;
  password?: string;
  fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.password || input.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    // 1. Create the permanent student account on server
    const res = await upgradeGuestAccountServer({
      data: {
        email: input.email.trim(),
        password: input.password,
        fullName: input.fullName?.trim() || "Cambridge Student",
      },
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to create account" };
    }

    // 2. Sign out of shared guest account
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-blocking
    }

    // 3. Sign in to the newly created permanent account
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (signInError) {
      return {
        success: false,
        error: `Account created, but sign-in failed: ${signInError.message}. Please sign in manually.`,
      };
    }

    // 4. Clear guest trial state
    localStorage.removeItem("marginal_is_guest");
    clearGuestTrial();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update account" };
  }
}
