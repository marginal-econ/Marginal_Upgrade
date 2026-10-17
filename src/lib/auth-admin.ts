/**
 * Centralized authorization rules for Marginal administrator privileges.
 * Vaquitavoid is the one and only administrator of the platform.
 */

export const VAQUITAVOID_USER_ID = "84ff607d-83f8-43ee-aa20-b632d1e84c14";
export const VAQUITAVOID_EMAIL = "vaquitavoid@gmail.com";

export const ADMIN_USER_IDS = [
  "84ff607d-83f8-43ee-aa20-b632d1e84c14", // vaquitavoid
  "00296414-0221-4d5b-aa1c-04dc9366a218", // marginal.econ.ai@gmail.com
  "210ce19f-1b47-4012-ae4b-3362866f6acb", // saikrish.econ@gmail.com
];

export const ADMIN_EMAILS = [
  "vaquitavoid@gmail.com",
  "marginal.econ.ai@gmail.com",
  "saikrish.econ@gmail.com",
];

export function isVaquitavoid(opts?: {
  userId?: string | null;
  email?: string | null;
  claims?: any;
}): boolean {
  if (!opts) return false;

  if (opts.userId && (opts.userId === VAQUITAVOID_USER_ID || ADMIN_USER_IDS.includes(opts.userId))) {
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

  if (
    candidateEmail === VAQUITAVOID_EMAIL ||
    ADMIN_EMAILS.includes(candidateEmail) ||
    candidateEmail.includes("vaquitavoid")
  ) {
    return true;
  }

  return false;
}

export function isUserAdmin(userId?: string | null): boolean {
  return isVaquitavoid({ userId });
}
