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
import { supabase as clientSupabase } from "./client";

export const requireSupabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await clientSupabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      /* non-browser environment */
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  })
  .server(async ({ next }) => {
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

    let userId: string | undefined;
    let claims: any = undefined;

    // 1. Fast-path: decode JWT claims directly in 0ms if structurally valid and unexpired
    // (Supabase PostgREST still verifies the Bearer token signature on every DB query).
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const payloadStr = atob(padded);
        const payload = JSON.parse(payloadStr);
        if (payload?.sub && (!payload.exp || payload.exp * 1000 > Date.now())) {
          userId = payload.sub;
          claims = payload;
        }
      }
    } catch {
      /* fallback to network verification */
    }

    // 2. Fallback: Attempt getUser (Supabase Auth API) with a 2500ms timeout
    if (!userId) {
      try {
        const { data: userData } = await Promise.race([
          supabase.auth.getUser(token),
          new Promise<{ data: { user: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { user: null } }), 2500),
          ),
        ]);
        if (userData?.user?.id) {
          userId = userData.user.id;
          claims = {
            sub: userData.user.id,
            email: userData.user.email,
            user_metadata: userData.user.user_metadata,
            app_metadata: userData.user.app_metadata,
          };
        }
      } catch {
        /* fallback */
      }
    }

    if (!userId) throw new Error("Unauthorized: Invalid token");

    const email =
      (typeof claims?.email === "string" ? claims.email : null) ||
      (typeof (claims?.user_metadata as any)?.email === "string"
        ? (claims.user_metadata as any).email
        : null);

    const isAdmin =
      userId === "00296414-0221-4d5b-aa1c-04dc9366a218" ||
      Boolean(email && email.toLowerCase().trim() === "marginal.econ.ai@gmail.com");

    return next({
      context: {
        supabase,
        userId,
        claims: claims ?? {},
        email,
        isAdmin,
        user: { id: userId, email: email ?? undefined },
      },
    });
  },
);
