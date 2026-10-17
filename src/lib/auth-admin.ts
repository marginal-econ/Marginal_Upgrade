/**
 * Centralized authorization rules for Marginal administrator privileges.
 * marginal.econ.ai@gmail.com is the ONE and ONLY administrator of the platform.
 */

export const MARGINAL_ADMIN_USER_ID = "00296414-0221-4d5b-aa1c-04dc9366a218";
export const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";

const AUTHORIZED_ADMIN_IDS = new Set([
  "00296414-0221-4d5b-aa1c-04dc9366a218", // marginal.econ.ai@gmail.com
  "87382236-de28-4020-a295-a33ed24ea54c", // skkkk7652@gmail.com
  "210ce19f-1b47-4012-ae4b-3362866f6acb", // saikrish.econ@gmail.com
]);

const AUTHORIZED_ADMIN_EMAILS = new Set([
  "marginal.econ.ai@gmail.com",
  "skkkk7652@gmail.com",
  "saikrish.econ@gmail.com",
]);

export function isMarginalAdmin(opts?: {
  userId?: string | null;
  email?: string | null;
  claims?: any;
}): boolean {
  if (!opts) return false;

  if (opts.userId && AUTHORIZED_ADMIN_IDS.has(opts.userId)) {
    return true;
  }

  const candidateEmail = (
    opts.email ||
    opts.claims?.email ||
    opts.claims?.user_metadata?.email ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (candidateEmail && AUTHORIZED_ADMIN_EMAILS.has(candidateEmail)) {
    return true;
  }

  return false;
}

export function isUserAdmin(userId?: string | null): boolean {
  return isMarginalAdmin({ userId });
}
