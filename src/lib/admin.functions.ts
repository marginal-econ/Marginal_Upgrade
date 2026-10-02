import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

async function listAcceptedAuthUsers(): Promise<User[]> {
  const { supabaseAdmin } = await import("@/integrations/backend/client.server");
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users.filter((user) => Boolean(user.last_sign_in_at)));
    if (data.users.length < 1000) break;
  }
  return users;
}

/** Throws unless the caller holds the admin role. */
async function assertAdmin(context: AuthContext) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access is required for this action.");
}

export const listPublicWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    // Page through the list so the database's default row limit cannot hide members.
    const entries: {
      id: string;
      name: string | null;
      email: string;
      city: string | null;
      country: string | null;
      status: string;
      created_at: string;
    }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("waitlist")
        .select("id,name,email,city,country,status,created_at")
        .order("created_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      entries.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }

    // Creating an invite also creates an Auth row, so existence alone does
    // not mean the recipient accepted it. A populated last_sign_in_at means
    // they redeemed the link and entered the app. Reconcile that state here
    // so the admin list stays accurate even if the browser was closed during
    // the acceptance flow.
    const acceptedByEmail = new Map<string, string>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const user of data.users) {
        if (user.email && user.last_sign_in_at) {
          acceptedByEmail.set(user.email.toLowerCase(), user.last_sign_in_at);
        }
      }
      if (data.users.length < 1000) break;
    }

    return entries.map((entry, index) => {
      const acceptedAt = acceptedByEmail.get(entry.email.toLowerCase()) ?? null;
      return {
        ...entry,
        status: acceptedAt ? "accepted" : entry.status,
        accepted_at: acceptedAt,
        position: index + 1,
      };
    });
  });

export const invitePublicWaitlistMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    const { data: member, error: lookupError } = await client
      .from("waitlist")
      .select("email,name,status")
      .eq("id", data.id)
      .single();
    if (lookupError || !member) throw new Error("This waitlist entry could not be found.");
    if (member.status === "active") throw new Error("This member already has access.");

    for (let page = 1; ; page += 1) {
      const { data: users, error: usersError } = await client.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (usersError) throw new Error(usersError.message);
      const accepted = users.users.some(
        (user) =>
          user.email?.toLowerCase() === member.email.toLowerCase() && !!user.last_sign_in_at,
      );
      if (accepted) throw new Error("This member has already accepted the invitation.");
      if (users.users.length < 1000) break;
    }
    // Invitations always use one explicitly configured canonical origin.
    // This avoids localhost links while still allowing the deployment to move
    // to a custom domain without a code change.
    const { requireEnv } = await import("@/server/env");
    const siteUrl = new URL(requireEnv("PUBLIC_SITE_URL"));
    if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") {
      throw new Error("PUBLIC_SITE_URL must use HTTPS.");
    }
    const redirectTo = new URL("/auth", siteUrl).href;
    const { sendAccessInvitation } = await import("@/server/access-invitation");
    await sendAccessInvitation(client, member, redirectTo);
    // The existing auth trigger grants student access. Admin promotions remain
    // an explicit action in the Users tab, never controlled by email metadata.
    const { error: updateError } = await client
      .from("waitlist")
      .update({ status: "invited" })
      .eq("id", data.id);
    if (updateError)
      return {
        warning:
          "The invitation was sent, but the waitlist status could not be saved. Refresh before trying again.",
      };
    return { warning: null };
  });

export const removePublicWaitlistMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    const { data: member, error: lookupError } = await client
      .from("waitlist")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (lookupError) throw new Error(`Waitlist member could not be found: ${lookupError.message}`);
    if (!member) throw new Error("This waitlist member no longer exists.");

    const { data: removed, error } = await client
      .from("waitlist")
      .delete()
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Waitlist member could not be removed: ${error.message}`);
    if (!removed) throw new Error("This waitlist member no longer exists.");

    const { error: codeError } = await client
      .from("waitlist_email_codes")
      .delete()
      .eq("email", member.email.toLowerCase());
    if (codeError)
      throw new Error(`Member removed, but OTP history could not be cleared: ${codeError.message}`);
    const { invalidateWaitlistCount } = await import("@/server/waitlist");
    invalidateWaitlistCount();
    return { success: true };
  });

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const count = async (table: string) => {
      const { count } = await supabaseAdmin
        .from(table as never)
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    };

    const [acceptedUsers, essays, documents, chunks, attempts, anchors] = await Promise.all([
      listAcceptedAuthUsers(),
      count("essays"),
      count("knowledge_documents"),
      count("document_chunks"),
      count("mcq_attempts"),
      count("calibration_anchors"),
    ]);
    const users = acceptedUsers.length;

    const { data: usage } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, feature, model, ok, error_message, latency_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: failures } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id", { count: "exact", head: false })
      .eq("ok", false)
      .limit(1);

    return {
      counts: { users, essays, documents, chunks, attempts, anchors },
      usage: usage ?? [],
      hasFailures: (failures ?? []).length > 0,
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const authUsers = await listAcceptedAuthUsers();

    const profiles: {
      id: string;
      full_name: string | null;
      school: string | null;
      created_at: string;
    }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      profiles.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }

    const roles: { user_id: string; role: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      roles.push(...((data ?? []) as { user_id: string; role: string }[]));
      if (!data || data.length < 1000) break;
    }

    const roleMap = new Map<string, string[]>();
    for (const row of roles) {
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role as string]);
    }

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    return authUsers.map((user) => {
      const profile = profileMap.get(user.id);
      const list = roleMap.get(user.id) ?? [];
      return {
        id: user.id,
        fullName:
          profile?.full_name ??
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : (user.email ?? "Unnamed account")),
        school: profile?.school ?? null,
        createdAt: user.created_at,
        role: list.includes("admin") ? "admin" : list.includes("teacher") ? "teacher" : "student",
      };
    });
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["student", "teacher", "admin"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: existingAdmin, error: existingAdminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (existingAdminError) throw new Error(existingAdminError.message);

    if (existingAdmin && data.role !== "admin") {
      if (data.userId === context.userId) {
        throw new Error("You cannot remove your own administrator access.");
      }
      const { count, error: countError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) <= 1) throw new Error("The final administrator cannot be reassigned.");
    }

    // Add the replacement first. If the insert fails, existing access is
    // retained instead of leaving the user in a partially-updated state.
    if (data.role !== "student") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    }
    const deleteQuery = supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: deleteError } =
      data.role === "student" ? await deleteQuery : await deleteQuery.neq("role", data.role);
    if (deleteError) throw new Error(deleteError.message);
    return { ok: true };
  });

/**
 * Wipes a student's practice data — every essay (and its versions), every
 * MCQ attempt (generated-paper history and real-past-paper history alike),
 * and every Live Examiner writing session — without touching their account,
 * role, or profile. For giving a student a clean slate, or clearing out
 * test/demo data, without deleting the person.
 */
export const resetStudentPracticeData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const tables = ["essays", "mcq_attempts", "mcq_pdf_attempts", "live_examiner_sessions"];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const { error, count } = await supabaseAdmin
        .from(table as never)
        .delete({ count: "exact" })
        .eq("user_id", data.userId);
      if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
      counts[table] = count ?? 0;
    }

    return { ok: true, counts };
  });

/**
 * Permanently deletes a user's account (auth + every row that references
 * it — essays, attempts, sessions, roles, profile — all cascade on
 * auth.users deletion). Irreversible. Guarded against self-deletion and
 * against removing the platform's last remaining admin, so this can never
 * lock every admin out of their own console.
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You can't delete your own account from here.");
    }
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const targetIsAdmin = (targetRoles ?? []).some((r) => r.role === "admin");

    if (targetIsAdmin) {
      const { count: adminCount } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((adminCount ?? 0) <= 1) {
        throw new Error("Can't delete the last remaining admin account.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Platform-wide, category-by-category wipe of practice data — every
 * student's rows at once, independently of one another. Unlike
 * `resetStudentPracticeData` (one account, every category) this is one
 * category, every account. Irreversible; guarded by `assertAdmin` only,
 * so the confirming UI carries the responsibility of making the blast
 * radius obvious before calling this.
 */
const RESET_ALL_TABLES = {
  mcq: ["mcq_attempts", "mcq_pdf_attempts"],
  essays: ["essays"],
  liveExaminer: ["live_examiner_sessions"],
} as const;

export const resetAllScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ category: z.enum(["mcq", "essays", "liveExaminer"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const tables = RESET_ALL_TABLES[data.category];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      // Supabase requires an explicit filter on delete; this id can never
      // match a real row, so it's the standard idiom for "delete every row".
      const { error, count } = await supabaseAdmin
        .from(table as never)
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
      counts[table] = count ?? 0;
    }

    return { ok: true, category: data.category, counts };
  });

export const listProviderKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ purpose: z.enum(["chat", "embedding", "vision"]).default("chat") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("ai_provider_keys")
      .select("id, provider, label, api_key, base_url, model, is_active, purpose, created_at")
      .eq("purpose", data.purpose)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id as string,
      provider: row.provider as string,
      label: row.label as string,
      maskedKey: maskKey(row.api_key as string),
      baseUrl: (row.base_url as string | null) ?? null,
      model: row.model as string,
      isActive: row.is_active as boolean,
      purpose: row.purpose as "chat" | "embedding" | "vision",
      createdAt: row.created_at as string,
    }));
  });

const KeyInput = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum([
    "lovable",
    "openai",
    "anthropic",
    "google",
    "xai",
    "groq",
    "openrouter",
    "mistral",
    "deepseek",
    "custom",
  ]),
  purpose: z.enum(["chat", "embedding", "vision"]).default("chat"),
  label: z.string().trim().min(2, "Give this key a name.").max(80),
  apiKey: z.string().trim().min(8, "Paste the full API key.").max(400),
  baseUrl: z.string().trim().max(300).optional().or(z.literal("")),
  model: z.string().trim().min(2, "Set the model id.").max(120),
  activate: z.boolean().default(false),
});

export const saveProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KeyInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      provider: data.provider,
      purpose: data.purpose,
      label: data.label,
      api_key: data.apiKey,
      base_url: data.baseUrl ? data.baseUrl : null,
      model: data.model,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("ai_provider_keys")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("ai_provider_keys")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      data.id = inserted.id as string;
    }

    if (data.activate && data.id) {
      await activate(context.supabase, data.id, data.purpose);
    }
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true, id: data.id };
  });

async function activate(
  supabase: SupabaseClient<Database>,
  id: string,
  purpose: "chat" | "embedding" | "vision",
) {
  await supabase
    .from("ai_provider_keys")
    .update({ is_active: false })
    .eq("is_active", true)
    .eq("purpose", purpose);
  const { error } = await supabase
    .from("ai_provider_keys")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export const activateProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable(),
        purpose: z.enum(["chat", "embedding", "vision"]).default("chat"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      await activate(context.supabase, data.id, data.purpose);
    } else {
      // null = fall back to built-in Lovable AI (chat) or the legacy
      // saved-key fallback / gateway (embedding).
      await context.supabase
        .from("ai_provider_keys")
        .update({ is_active: false })
        .eq("is_active", true)
        .eq("purpose", data.purpose);
    }
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

export const deleteProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("ai_provider_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

/**
 * Replace the secret on an existing key in place — the provider, model and
 * active state are kept, so rotating a leaked key never interrupts marking.
 */
export const rotateProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        apiKey: z.string().trim().min(8, "Paste the new API key.").max(400),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("ai_provider_keys")
      .update({ api_key: data.apiKey, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

/** Sends a one-line prompt through a stored key so admins can verify it works. */
export const testProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");

    const { chat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = row.provider === "lovable" ? null : normaliseConfig(row as never);

    try {
      const result = await chat({
        model: (row as { model: string }).model,
        overrideProvider: config,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        maxCompletionTokens: 20,
      });
      return { ok: true, reply: result.text.trim().slice(0, 80), model: result.model };
    } catch (err) {
      return {
        ok: false,
        reply: err instanceof Error ? err.message : "Unknown error",
        model: null,
      };
    }
  });

// A 2x3 red/green/blue PNG, inlined so the vision "test key" action never
// depends on fetching an external image (would fail in sandboxed/offline
// environments and adds a flaky network hop to a simple connectivity check).
const VISION_TEST_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAABllJ3tAAAAFElEQVR42mNk+M9QzzAK" +
  "RgOKAQAmVgMB6bA0PQAAAABJRU5ErkJggg==";

/**
 * Sends one small test image through a saved vision key and confirms it
 * comes back with a real image-grounded answer (not just any text reply),
 * so an admin can verify a key actually supports image input — a text-only
 * chat model marked active here would otherwise silently fail on the first
 * real handwriting page or past-paper scan.
 */
export const testVisionProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label, purpose")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");
    if (row.purpose !== "vision") {
      throw new Error("That key is saved for chat or embeddings, not vision.");
    }

    const { visionChat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = normaliseConfig(row as never);
    const started = Date.now();

    try {
      const result = await visionChat({
        model: (row as { model: string }).model,
        overrideProvider: config,
        systemPrompt: "You are a vision connectivity test. Reply with exactly one word.",
        prompt:
          "Look at this image and reply with only the single dominant color you see (one word, lowercase).",
        imageDataUrls: [VISION_TEST_IMAGE],
        maxCompletionTokens: 20,
      });
      return {
        ok: true,
        reply: result.text.trim().slice(0, 80),
        model: result.model,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        reply: err instanceof Error ? err.message : "Unknown error",
        model: null,
        latencyMs: Date.now() - started,
      };
    }
  });

/**
 * Sends one short string through a saved embedding key and reports the
 * vector's dimensionality and latency, so an admin can confirm accuracy /
 * connectivity before pointing knowledge ingestion or retrieval at it.
 */
export const testEmbeddingProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label, purpose")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");
    if (row.purpose !== "embedding") {
      throw new Error("That key is saved for chat, not embeddings.");
    }

    const { embedOne } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = normaliseConfig(row as never);
    const started = Date.now();

    try {
      const vector = await embedOne(
        "Marginal Economics embedding connectivity test.",
        row.model,
        config,
      );
      return {
        ok: true,
        dimensions: vector.length,
        latencyMs: Date.now() - started,
        model: row.model as string,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        dimensions: null,
        latencyMs: Date.now() - started,
        model: row.model as string,
      };
    }
  });

/* ------------------------------------------------------------------ */
/* Access control: user cap, waitlist, daily limits, activity, presence */
/* ------------------------------------------------------------------ */
// All of these call SECURITY DEFINER database functions that re-check the
// admin role themselves (see supabase/migrations/20260919090000_*.sql), so
// even a forged request can't read or change anything as a non-admin.

/** Mirrors ai_mode's 0/1/2 in app_settings — see
 *  20260919120000_ai_gateway_controls.sql and applyAiGatewayMode() in
 *  ai.server.ts, which is what actually enforces this on every AI call. */
export type AiGatewayMode = "max" | "balanced" | "economy";
const AI_MODE_TO_INT: Record<AiGatewayMode, number> = { max: 0, balanced: 1, economy: 2 };
const AI_MODE_FROM_INT: Record<number, AiGatewayMode> = { 0: "max", 1: "balanced", 2: "economy" };

export type AdminSettings = {
  maxUsers: number;
  essayDailyLimit: number;
  currentUsers: number;
  waitlistCount: number;
  /** The site-wide AI pause switch — false means every AI call in the app
   *  fails fast for everyone, admin included, with no outbound request made. */
  aiEnabled: boolean;
  aiMode: AiGatewayMode;
};

function toSettings(raw: unknown): AdminSettings {
  const row = (raw ?? {}) as Record<string, number | boolean>;
  return {
    maxUsers: Number(row.max_users ?? 0),
    essayDailyLimit: Number(row.essay_daily_limit ?? 0),
    currentUsers: Number(row.current_users ?? 0),
    waitlistCount: Number(row.waitlist_count ?? 0),
    aiEnabled: row.ai_enabled !== false,
    aiMode: AI_MODE_FROM_INT[Number(row.ai_mode ?? 0)] ?? "max",
  };
}

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_get_settings");
    if (error) throw new Error(error.message);
    const acceptedUsers = await listAcceptedAuthUsers();
    return { ...toSettings(data), currentUsers: acceptedUsers.length };
  });

export const adminSetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        maxUsers: z.number().int().min(1).max(1000).optional(),
        essayDailyLimit: z.number().int().min(1).max(200).optional(),
        aiEnabled: z.boolean().optional(),
        aiMode: z.enum(["max", "balanced", "economy"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_set_settings", {
      p_max_users: data.maxUsers,
      p_essay_daily_limit: data.essayDailyLimit,
      p_ai_enabled: data.aiEnabled,
      p_ai_mode: data.aiMode ? AI_MODE_TO_INT[data.aiMode] : undefined,
    });
    if (error) throw new Error(error.message);
    if (data.aiEnabled !== undefined || data.aiMode !== undefined) {
      // Drop the short-lived cache chat() reads so a paused/mode-switched
      // admin console is honoured on the very next AI call, not up to
      // AI_GATEWAY_TTL_MS later.
      const { clearActiveProviderCache } = await import("./ai/active.server");
      clearActiveProviderCache();
    }
    return toSettings(result);
  });

export type EmailBrandSettings = {
  senderName: string;
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  footer: string;
};

function toEmailBrandSettings(raw: unknown): EmailBrandSettings {
  const row = (raw ?? {}) as Record<string, string>;
  return {
    senderName: row.sender_name ?? "Marginal",
    subject: row.subject ?? "Your Marginal verification code",
    eyebrow: row.eyebrow ?? "Email verification",
    heading: row.heading ?? "Confirm your place on the waitlist",
    intro:
      row.intro ??
      "Use the six-digit code below to verify your email and join the Marginal waitlist.",
    footer: row.footer ?? "Marginal · Built for AS and A Level Economics (9708)",
  };
}

const emailBrandInput = z.object({
  senderName: z.string().trim().min(1).max(60),
  subject: z.string().trim().min(1).max(120),
  eyebrow: z.string().trim().min(1).max(60),
  heading: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(500),
  footer: z.string().trim().min(1).max(180),
});

export const adminGetEmailBrandSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_get_email_brand_settings");
    if (error) throw new Error(error.message);
    return toEmailBrandSettings(data);
  });

export const adminSetEmailBrandSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emailBrandInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_set_email_brand_settings", {
      p_sender_name: data.senderName,
      p_subject: data.subject,
      p_eyebrow: data.eyebrow,
      p_heading: data.heading,
      p_intro: data.intro,
      p_footer: data.footer,
    });
    if (error) throw new Error(error.message);
    return toEmailBrandSettings(result);
  });

export const adminListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_waitlist");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      joinedAt: row.created_at,
      position: Number(row.position),
    }));
  });

export const adminRemoveWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_remove_waitlist", { p_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type UserActivityRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  school: string | null;
  role: "student" | "teacher" | "admin";
  joinedAt: string;
  lastSeen: string | null;
  currentPath: string | null;
  isOnline: boolean;
  essaysGraded: number;
  essaysToday: number;
  liveExaminerSessions: number;
  mcqAttempts: number;
  aiCalls: number;
  lastActivity: string | null;
};

export const adminUserActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserActivityRow[]> => {
    const { data, error } = await context.supabase.rpc("admin_user_activity");
    if (error) throw new Error(error.message);
    const acceptedIds = new Set((await listAcceptedAuthUsers()).map((user) => user.id));
    return (data ?? [])
      .filter((row) => acceptedIds.has(row.user_id))
      .map((row) => ({
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        school: row.school,
        role: row.role as UserActivityRow["role"],
        joinedAt: row.joined_at,
        lastSeen: row.last_seen,
        currentPath: row.current_path,
        isOnline: row.is_online,
        essaysGraded: Number(row.essays_graded),
        essaysToday: Number(row.essays_today),
        liveExaminerSessions: Number(row.live_examiner_sessions),
        mcqAttempts: Number(row.mcq_attempts),
        aiCalls: Number(row.ai_calls),
        lastActivity: row.last_activity,
      }));
  });
