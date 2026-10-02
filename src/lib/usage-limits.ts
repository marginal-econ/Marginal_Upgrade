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

export const LIVE_EXAMINER_LIMIT_MESSAGE = `${DAILY_LIMIT_PREFIX}: you can use one Live Examiner session per day, and today's is already in use for a different question. You can keep working on that same question today. ${LIMIT_RESET_NOTE}`;

export function isDailyLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.startsWith(DAILY_LIMIT_PREFIX);
}
