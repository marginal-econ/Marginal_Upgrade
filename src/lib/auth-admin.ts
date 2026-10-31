/**
 * Centralized authorization rules for Marginal administrator privileges.
 * marginal.econ.ai@gmail.com is the ONE and ONLY administrator of the platform.
 */

export const MARGINAL_ADMIN_USER_ID = "00296414-0221-4d5b-aa1c-04dc9366a218";
export const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";

const AUTHORIZED_ADMIN_IDS = new Set([
  "00296414-0221-4d5b-aa1c-04dc9366a218", // marginal.econ.ai@gmail.com ONLY
]);

const AUTHORIZED_ADMIN_EMAILS = new Set([
  "marginal.econ.ai@gmail.com", // Marginal ONLY
]);

export function isMarginalAdmin(
  opts?:
    | {
        userId?: string | null;
        email?: string | null;
        claims?: any;
      }
    | string
    | null,
): boolean {
  if (!opts) return false;

  if (typeof opts === "string") {
    const trimmed = opts.trim();
    if (AUTHORIZED_ADMIN_IDS.has(trimmed)) {
      return true;
    }
    if (AUTHORIZED_ADMIN_EMAILS.has(trimmed.toLowerCase())) {
      return true;
    }
    return false;
  }

  const candidateId = opts.userId || opts.claims?.sub;
  if (candidateId && AUTHORIZED_ADMIN_IDS.has(candidateId)) {
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

export function isUserAdmin(
  opts?:
    | {
        userId?: string | null;
        email?: string | null;
        claims?: any;
      }
    | string
    | null,
): boolean {
  if (!opts) return false;
  if (typeof opts === "string") {
    return isMarginalAdmin({ userId: opts });
  }
  return isMarginalAdmin(opts);
}

export function assertAdmin(context: any): void {
  const isMarginal = isMarginalAdmin({
    userId: context?.userId ?? context?.user?.id,
    claims: context?.claims,
    email: context?.email ?? context?.user?.email,
  });

  if (isMarginal) {
    return;
  }

  throw new Error("Admin access is restricted. Marginal is the sole administrator of this platform.");
}

