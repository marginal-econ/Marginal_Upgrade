import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isMarginalAdmin } from "./auth-admin";

export type DirectMessage = {
  id: string;
  userId: string;
  sender: "admin" | "user";
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
};

export type UserConversation = {
  userId: string;
  name: string;
  email: string;
  school: string | null;
  role: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSender: "admin" | "user" | null;
  totalMessages: number;
};

function parseMessagePayload(row: {
  id: string;
  user_id: string | null;
  error_message: string | null;
  created_at: string;
  ok: boolean;
}): DirectMessage {
  try {
    const parsed = JSON.parse(row.error_message || "{}");
    return {
      id: row.id,
      userId: row.user_id || "",
      sender: parsed.sender === "admin" ? "admin" : "user",
      senderName: parsed.senderName || (parsed.sender === "admin" ? "Marginal Team" : "Student"),
      text: parsed.text || row.error_message || "",
      createdAt: row.created_at,
      read: row.ok === true,
    };
  } catch {
    return {
      id: row.id,
      userId: row.user_id || "",
      sender: "user",
      senderName: "User",
      text: row.error_message || "",
      createdAt: row.created_at,
      read: row.ok === true,
    };
  }
}

/**
 * Admin: List all user conversations with their latest direct message,
 * unread badges, and user contact details.
 */
export const listAdminConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserConversation[]> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });
    if (!isMarginal) {
      throw new Error("Admin access is restricted to Marginal Team.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // 1. Fetch all registered users
    const authUsers: any[] = [];
    try {
      for (let page = 1; ; page += 1) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users) break;
        authUsers.push(...data.users);
        if (data.users.length < 1000) break;
      }
    } catch (e) {
      console.warn("Failed to fetch auth users in listAdminConversations:", e);
    }

    // 2. Fetch profiles
    const profilesMap = new Map<string, { full_name: string | null; school: string | null }>();
    try {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school");
      for (const p of profiles ?? []) {
        profilesMap.set(p.id, { full_name: p.full_name, school: p.school });
      }
    } catch {}

    // 3. Fetch direct messages
    const { data: rawMessages } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, error_message, created_at, ok")
      .eq("feature", "DIRECT_MESSAGE")
      .order("created_at", { ascending: false })
      .limit(2000);

    const messagesByUser = new Map<string, DirectMessage[]>();
    for (const row of rawMessages ?? []) {
      if (!row.user_id) continue;
      const parsed = parseMessagePayload(row);
      const list = messagesByUser.get(row.user_id) ?? [];
      list.push(parsed);
      messagesByUser.set(row.user_id, list);
    }

    // 4. Combine into UserConversation summaries
    const conversations: UserConversation[] = [];
    const seenUserIds = new Set<string>();

    for (const u of authUsers) {
      if (seenUserIds.has(u.id)) continue;
      seenUserIds.add(u.id);

      const profile = profilesMap.get(u.id);
      const msgs = messagesByUser.get(u.id) ?? [];
      const unreadCount = msgs.filter((m) => m.sender === "user" && !m.read).length;
      const latestMsg = msgs[0] ?? null;

      const name =
        profile?.full_name ||
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        (u.email ? u.email.split("@")[0] : "Student");

      const role =
        u.user_metadata?.role ||
        u.app_metadata?.role ||
        (u.email === "marginal.econ.ai@gmail.com" ? "admin" : "student");

      conversations.push({
        userId: u.id,
        name,
        email: u.email || "No email",
        school: profile?.school || u.user_metadata?.school || null,
        role,
        unreadCount,
        lastMessage: latestMsg?.text ?? null,
        lastMessageAt: latestMsg?.createdAt ?? null,
        lastSender: latestMsg?.sender ?? null,
        totalMessages: msgs.length,
      });
    }

    // Sort: users with unread messages first, then latest messages, then recent signups
    return conversations.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.name.localeCompare(b.name);
    });
  });

/**
 * Fetch direct message thread between Admin and a specific student.
 */
export const getConversationThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string() }).parse(input))
  .handler(async ({ data, context }): Promise<DirectMessage[]> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });

    if (!isMarginal && context.userId !== data.userId) {
      throw new Error("You can only read your own conversation thread.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // Fetch messages
    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, error_message, created_at, ok")
      .eq("feature", "DIRECT_MESSAGE")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const thread = (rows ?? []).map(parseMessagePayload);

    // If admin is reading, mark incoming student messages as read (ok: true)
    if (isMarginal) {
      const unreadIds = (rows ?? [])
        .filter((r) => !r.ok)
        .map((r) => r.id);

      if (unreadIds.length > 0) {
        void supabaseAdmin
          .from("ai_usage_log")
          .update({ ok: true })
          .in("id", unreadIds)
          .then();
      }
    }

    return thread;
  });

/**
 * Admin: Send direct text message to a specific student inside the app.
 */
export const sendAdminTextMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        recipientUserId: z.string().min(5),
        text: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });
    if (!isMarginal) {
      throw new Error("Only platform administrators can send admin direct messages.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const payload = {
      sender: "admin",
      senderName: "Marginal Team",
      text: data.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("ai_usage_log")
      .insert({
        user_id: data.recipientUserId,
        feature: "DIRECT_MESSAGE",
        model: "direct_text",
        ok: false, // unread by student
        error_message: JSON.stringify(payload),
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);

    return {
      ok: true,
      id: inserted.id,
      createdAt: inserted.created_at,
    };
  });

/**
 * Student: Send a direct text message to Marginal Admin inside the app.
 */
export const sendStudentTextMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const senderName =
      (context as any).claims?.user_metadata?.full_name ||
      (context as any).claims?.user_metadata?.name ||
      ((context as any).email ? (context as any).email.split("@")[0] : "Student");

    const payload = {
      sender: "user",
      senderName,
      text: data.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("ai_usage_log")
      .insert({
        user_id: context.userId,
        feature: "DIRECT_MESSAGE",
        model: "direct_text",
        ok: false, // unread by admin
        error_message: JSON.stringify(payload),
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);

    return {
      ok: true,
      id: inserted.id,
      createdAt: inserted.created_at,
    };
  });

/**
 * Student: Fetch own direct messages thread with Marginal Team.
 */
export const getMyStudentThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ messages: DirectMessage[]; unreadCount: number }> => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, user_id, error_message, created_at, ok")
      .eq("feature", "DIRECT_MESSAGE")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const thread = (rows ?? []).map(parseMessagePayload);
    const unreadCount = thread.filter((m) => m.sender === "admin" && !m.read).length;

    // Mark admin messages as read now that student has opened the thread
    const unreadAdminRowIds = (rows ?? [])
      .filter((r) => {
        const parsed = parseMessagePayload(r);
        return parsed.sender === "admin" && !r.ok;
      })
      .map((r) => r.id);

    if (unreadAdminRowIds.length > 0) {
      void supabaseAdmin
        .from("ai_usage_log")
        .update({ ok: true })
        .in("id", unreadAdminRowIds)
        .then();
    }

    return {
      messages: thread,
      unreadCount,
    };
  });

/**
 * Quick unread message check for header badge (Student or Admin).
 */
export const getUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ unreadCount: number }> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    if (isMarginal) {
      // Admin sees count of unread messages sent by students
      const { data } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id, error_message")
        .eq("feature", "DIRECT_MESSAGE")
        .eq("ok", false)
        .limit(100);

      const unreadFromUsers = (data ?? []).filter((r) => {
        try {
          return JSON.parse(r.error_message || "{}").sender === "user";
        } catch {
          return true;
        }
      }).length;

      return { unreadCount: unreadFromUsers };
    } else {
      // Student sees count of unread messages sent by Admin
      const { data } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id, error_message")
        .eq("feature", "DIRECT_MESSAGE")
        .eq("user_id", context.userId)
        .eq("ok", false)
        .limit(100);

      const unreadFromAdmin = (data ?? []).filter((r) => {
        try {
          return JSON.parse(r.error_message || "{}").sender === "admin";
        } catch {
          return false;
        }
      }).length;

      return { unreadCount: unreadFromAdmin };
    }
  });
