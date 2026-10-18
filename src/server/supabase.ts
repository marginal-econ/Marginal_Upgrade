/**
 * The one place a Supabase client is ever constructed — server only.
 *
 * It is built with the *secret* key, which bypasses Row Level Security. That
 * is deliberate and is exactly why this module must never be reachable from a
 * component: every write to `public.waitlist` goes through the endpoint in
 * `src/server/api.ts`, and RLS stays on with no public policy, so the browser
 * has no path to the table at all.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readEnv, requireEnv } from "./env";

let cached: { key: string; client: SupabaseClient } | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  // The app's authenticated server functions already use BACKEND_URL and
  // BACKEND_SERVICE_ROLE_KEY. Prefer those here too, so the public waitlist
  // always writes to the exact same Supabase project as the signed-in app.
  // The older SUPABASE_* names remain a backwards-compatible fallback.
  const url =
    readEnv("BACKEND_URL") ??
    readEnv("SUPABASE_URL") ??
    readEnv("VITE_BACKEND_URL") ??
    "https://srukuuhxloxdukonmual.supabase.co";

  const secretKey =
    readEnv("BACKEND_SERVICE_ROLE_KEY") ??
    readEnv("SUPABASE_SECRET_KEY") ??
    (typeof process !== "undefined" ? process.env["BACKEND_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] : undefined) ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

  // Cached across requests in the same isolate, but keyed on the credentials
  // so a rotated secret is picked up without a redeploy of this module.
  if (cached && cached.key === `${url}::${secretKey}`) return cached.client;

  const client = createClient(url, secretKey, {
    auth: {
      // No user sessions exist here — this is a public waitlist, not an app
      // with accounts. Leaving these on makes the client try to persist and
      // refresh tokens that will never exist.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "marginal-waitlist" },
    },
  });

  cached = { key: `${url}::${secretKey}`, client };
  return client;
}
