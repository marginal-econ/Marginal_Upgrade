import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  BACKEND_PUBLISHABLE_KEY,
  BACKEND_URL,
  createBackendFetch,
  requireBackendConfig,
} from "./config";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: No request headers available");

    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.slice("Bearer ".length);
    if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

    requireBackendConfig();
    const supabase = createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
      global: {
        fetch: createBackendFetch(BACKEND_PUBLISHABLE_KEY),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw new Error("Unauthorized: Invalid token");

    const email =
      (typeof data.claims.email === "string" ? data.claims.email : null) ||
      (typeof (data.claims.user_metadata as any)?.email === "string"
        ? (data.claims.user_metadata as any).email
        : null);

    const isAdmin =
      data.claims.sub === "00296414-0221-4d5b-aa1c-04dc9366a218" ||
      Boolean(email && email.toLowerCase().trim() === "marginal.econ.ai@gmail.com");

    return next({
      context: { supabase, userId: data.claims.sub, claims: data.claims, email, isAdmin },
    });
  },
);
