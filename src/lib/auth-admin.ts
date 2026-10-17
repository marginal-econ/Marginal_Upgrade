/**
 * Centralized authorization rules for Marginal administrator privileges.
 * marginal.econ.ai@gmail.com is the ONE and ONLY administrator of the platform.
 */

export const MARGINAL_ADMIN_USER_ID = "00296414-0221-4d5b-aa1c-04dc9366a218";
export const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";

// Legacy export compatibility
export const VAQUITAVOID_USER_ID = MARGINAL_ADMIN_USER_ID;
export const VAQUITAVOID_EMAIL = MARGINAL_ADMIN_EMAIL;

export function isVaquitavoid(opts?: {
  userId?: string | null;
  email?: string | null;
  claims?: any;
}): boolean {
  if (!opts) return false;

  if (opts.userId && opts.userId === MARGINAL_ADMIN_USER_ID) {
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

  if (candidateEmail === MARGINAL_ADMIN_EMAIL) {
    return true;
  }

  return false;
}

export function isUserAdmin(userId?: string | null): boolean {
  return isVaquitavoid({ userId });
}
