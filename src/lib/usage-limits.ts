/**
 * Shared (client + server safe) constants and helpers for the per-day usage
 * limits. The limits themselves are enforced in the database — see
 * supabase/migrations/20260919090000_user_cap_waitlist_limits_presence.sql —
 * this file only holds the wording and the error-detection helper so the UI
 * can react to a limit error differently from an ordinary failure.
 */

/** Every limit error starts with this, so the UI can recognise it. */
export const DAILY_LIMIT_PREFIX = "Daily limit reached";

/** Fixed, NOT admin-configurable: one Live Examiner session (one question) a day. */
export const LIVE_EXAMINER_DAILY_LIMIT = 1;

/** The day rolls over at midnight India Standard Time (see app_today() in SQL). */
export const LIMIT_RESET_NOTE = "Limits reset at midnight IST.";

export function essayLimitMessage(limit: number): string {
  return `${DAILY_LIMIT_PREFIX}: you can have up to ${limit} essay${
    limit === 1 ? "" : "s"
  } graded per day and today's ${limit === 1 ? "one is" : `${limit} are`} used up. ${LIMIT_RESET_NOTE}`;
}

export const LIVE_EXAMINER_LIMIT_MESSAGE = `${DAILY_LIMIT_PREFIX}: you can start 1 Live Examiner question session per day on your current plan, and today's session is already active for another question. You can continue typing on your active question with unlimited checks today, or upgrade for multi-session access. ${LIMIT_RESET_NOTE}`;

export function isDailyLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.startsWith(DAILY_LIMIT_PREFIX);
}

/**
 * Session duration caps for deep AI Cambridge Examiner coaching (in minutes).
 * When the duration expires, remote LLM checks pause to protect unit economics,
 * while in-browser grammar, spelling, mechanics, and terminology checks remain
 * 100% active for free.
 */
export const LIVE_EXAMINER_DURATION_MINUTES = {
  foundation: 30, // 30 min timed drill
  pro: 45,        // 45 min official Cambridge exam essay timing
  mastery: 60,    // 60 min extended evaluative revision
  elite: 90,      // 90 min sprint revision
} as const;

export type SubscriptionTier = keyof typeof LIVE_EXAMINER_DURATION_MINUTES;

export const DEFAULT_LIVE_EXAMINER_DURATION_MINUTES = LIVE_EXAMINER_DURATION_MINUTES.pro;
