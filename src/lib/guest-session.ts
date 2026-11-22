import { supabase } from "@/integrations/backend/client";

export const GUEST_ESSAY_GRADED_KEY = "marginal_guest_essay_graded";
export const GUEST_MCQ_COMPLETED_KEY = "marginal_guest_mcq_completed";
export const GUEST_TRIAL_USED_KEY = "marginal_guest_trial_used";

/**
 * Guest mode is disabled. All interactive features require genuine user authentication.
 */
export function isGuestUser(_user?: any): boolean {
  return false;
}

/**
 * Returns false since guest mode is disabled.
 */
export function hasGuestUsedTrial(_user?: any): boolean {
  return false;
}

/**
 * No-op when guest mode is disabled.
 */
export function recordGuestEssayGraded(): void {}

/**
 * No-op when guest mode is disabled.
 */
export function recordGuestMcqCompleted(): void {}

/**
 * Clears any residual guest keys from localStorage.
 */
export function clearGuestTrial(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_ESSAY_GRADED_KEY);
  localStorage.removeItem(GUEST_MCQ_COMPLETED_KEY);
  localStorage.removeItem(GUEST_TRIAL_USED_KEY);
  localStorage.removeItem("marginal_is_guest");
}

/**
 * Guest mode is disabled. Always returns null, requiring login.
 */
export async function ensureSessionOrGuest(): Promise<any> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user ?? null;
}

/**
 * Upgrades / redirect to registration.
 */
export async function upgradeGuestAccount(_input: {
  email: string;
  password?: string;
  fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  clearGuestTrial();
  return { success: true };
}
