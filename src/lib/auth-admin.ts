/**
 * Centralized authorization rules for Marginal administrator privileges.
 * Vaquitavoid is the one and only administrator of the platform.
 */

export const VAQUITAVOID_USER_ID = "84ff607d-83f8-43ee-aa20-b632d1e84c14";
export const VAQUITAVOID_EMAIL = "vaquitavoid@gmail.com";

export function isVaquitavoid(opts?: {
  userId?: string | null;
  email?: string | null;
  claims?: any;
}): boolean {
  if (!opts) return false;

  if (opts.userId && opts.userId === VAQUITAVOID_USER_ID) {
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

  if (candidateEmail === VAQUITAVOID_EMAIL || candidateEmail.includes("vaquitavoid")) {
    return true;
  }

  return false;
}

export function isUserAdmin(userId?: string | null): boolean {
  return isVaquitavoid({ userId });
}
