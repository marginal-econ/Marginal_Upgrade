import {
  DAILY_LIMIT_PREFIX,
  formatRemainingDuration,
  LIVE_EXAMINER_BUSY_PREFIX,
  LIVE_EXAMINER_LEASE_TTL_MS,
  LIVE_EXAMINER_MAX_CONCURRENT_USERS,
  LIVE_EXAMINER_MAX_SESSION_MINUTES,
  LIVE_EXAMINER_MAX_SESSION_MS,
  LIVE_EXAMINER_RESET_HOURS,
  LIVE_EXAMINER_RESET_WINDOW_MS,
  LIVE_EXAMINER_TIMER_EXPIRED_PREFIX,
} from "@/lib/usage-limits";

export const GLOBAL_LOCK_TERM = "__SYS_LIVE_EXAMINER_LOCK__";
export const USER_QUOTA_TERM_PREFIX = "__SYS_LE_QUOTA_";

export type GlobalLiveLock = {
  userId: string;
  tabId: string;
  questionKey: string;
  questionText?: string;
  startedAt: number;
  sessionEndsAt: number;
  leaseExpiresAt: number;
};

export type UserDailyQuota = {
  userId: string;
  questionKey: string;
  questionText: string;
  startedAt: number;
  sessionEndsAt: number;
  resetAt: number;
};

export type LiveExaminerGuardStatus = {
  now: number;
  maxSessionMinutes: number;
  resetHours: number;
  maxConcurrentUsers: number;
  occupiedByOther: boolean;
  occupiedByOtherTab: boolean;
  lockReleaseInMs: number | null;
  dailyUsed: boolean;
  activeQuestion: string | null;
  sessionStartedAt: number | null;
  sessionEndsAt: number | null;
  remainingSessionMs: number;
  resetAt: number | null;
  remainingResetMs: number;
  canStartNewQuestion: boolean;
  canResumeActiveSession: boolean;
  isSessionExpired: boolean;
};

export type ClaimSessionResult = {
  sessionStartedAt: number;
  sessionEndsAt: number;
  resetAt: number;
  remainingSessionMs: number;
  isNewSession: boolean;
};

export interface GuardStoreRow {
  id: string;
  raw: string;
}

export interface GuardStore {
  getOrCreateLockRow(): Promise<GuardStoreRow>;
  compareAndSwapLockRow(id: string, expectedRaw: string, nextRaw: string, nowMs: number): Promise<boolean>;
  getUserQuota(userId: string): Promise<UserDailyQuota | null>;
  saveUserQuota(userId: string, quota: UserDailyQuota, nowMs: number): Promise<void>;
  recordDailyUsageBestEffort?(userId: string, questionKey: string, nowMs: number): Promise<void>;
}

export function normalizeGuardQuestion(question: string): string {
  return String(question || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseJsonSafe<T>(raw: string | null | undefined): T | null {
  if (!raw || raw === "null") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function isLockActive(lock: GlobalLiveLock | null, now: number): lock is GlobalLiveLock {
  return Boolean(
    lock &&
      lock.userId &&
      typeof lock.leaseExpiresAt === "number" &&
      typeof lock.sessionEndsAt === "number" &&
      lock.leaseExpiresAt > now &&
      lock.sessionEndsAt > now,
  );
}

function isQuotaIn24hWindow(quota: UserDailyQuota | null, now: number): quota is UserDailyQuota {
  return Boolean(
    quota &&
      quota.userId &&
      typeof quota.resetAt === "number" &&
      typeof quota.sessionEndsAt === "number" &&
      now < quota.resetAt,
  );
}

async function createSupabaseGuardStore(): Promise<GuardStore> {
  const { supabaseAdmin } = await import("@/integrations/backend/client.server");

  return {
    async getOrCreateLockRow(): Promise<GuardStoreRow> {
      const { data: existing } = await supabaseAdmin
        .from("definitions")
        .select("id, definition_text")
        .eq("term", GLOBAL_LOCK_TERM)
        .order("created_at", { ascending: true })
        .limit(1);

      if (existing && existing.length > 0 && existing[0]?.id) {
        return { id: existing[0].id, raw: existing[0].definition_text };
      }

      await supabaseAdmin.from("definitions").insert({
        term: GLOBAL_LOCK_TERM,
        definition_text: "null",
        category: "system_config",
        source_label: "live_examiner_global_lock",
      });

      const { data: afterInsert, error } = await supabaseAdmin
        .from("definitions")
        .select("id, definition_text")
        .eq("term", GLOBAL_LOCK_TERM)
        .order("created_at", { ascending: true })
        .limit(1);

      if (error || !afterInsert || afterInsert.length === 0 || !afterInsert[0]?.id) {
        throw new Error("Could not initialize Live Examiner concurrency lock.");
      }
      return { id: afterInsert[0].id, raw: afterInsert[0].definition_text };
    },

    async compareAndSwapLockRow(
      id: string,
      expectedRaw: string,
      nextRaw: string,
      nowMs: number,
    ): Promise<boolean> {
      const { data, error } = await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: nextRaw,
          updated_at: new Date(nowMs).toISOString(),
        })
        .eq("id", id)
        .eq("definition_text", expectedRaw)
        .select("id");

      if (error) {
        throw new Error(`Live Examiner lock update failed: ${error.message}`);
      }
      return Array.isArray(data) && data.length > 0;
    },

    async getUserQuota(userId: string): Promise<UserDailyQuota | null> {
      const term = `${USER_QUOTA_TERM_PREFIX}${userId}`;
      const { data } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .order("updated_at", { ascending: false })
        .limit(1);

      return parseJsonSafe<UserDailyQuota>(data?.[0]?.definition_text);
    },

    async saveUserQuota(userId: string, quota: UserDailyQuota, nowMs: number): Promise<void> {
      const term = `${USER_QUOTA_TERM_PREFIX}${userId}`;
      const serialized = JSON.stringify(quota);
      const isoNow = new Date(nowMs).toISOString();

      const { data: existing } = await supabaseAdmin
        .from("definitions")
        .select("id")
        .eq("term", term)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0 && existing[0]?.id) {
        await supabaseAdmin
          .from("definitions")
          .update({ definition_text: serialized, updated_at: isoNow })
          .eq("id", existing[0].id);
      } else {
        await supabaseAdmin.from("definitions").insert({
          term,
          definition_text: serialized,
          category: "system_config",
          source_label: "live_examiner_daily_quota",
        });
      }
    },

    async recordDailyUsageBestEffort(userId: string, questionKey: string, nowMs: number): Promise<void> {
      try {
        // Compute IST date (matches app_today() in SQL migration)
        const istOffsetMs = 330 * 60 * 1000;
        const usageDay = new Date(nowMs + istOffsetMs).toISOString().slice(0, 10);
        await supabaseAdmin.from("daily_feature_usage").upsert(
          {
            user_id: userId,
            feature: "live_examiner",
            usage_day: usageDay,
            uses: 1,
            detail: questionKey.slice(0, 500),
            updated_at: new Date(nowMs).toISOString(),
          },
          { onConflict: "user_id,feature,usage_day" },
        );
      } catch {
        /* best-effort telemetry sync */
      }
    },
  };
}

export async function getLiveExaminerGuardStatus(
  params: { userId: string; tabId?: string; now?: number },
  providedStore?: GuardStore,
): Promise<LiveExaminerGuardStatus> {
  const now = params.now ?? Date.now();
  const store = providedStore ?? (await createSupabaseGuardStore());

  const [lockRow, rawQuota] = await Promise.all([
    store.getOrCreateLockRow(),
    store.getUserQuota(params.userId),
  ]);

  const lock = parseJsonSafe<GlobalLiveLock>(lockRow.raw);
  const lockActive = isLockActive(lock, now);
  const occupiedByOther = lockActive && lock.userId !== params.userId;
  const occupiedByOtherTab = Boolean(
    lockActive && lock.userId === params.userId && params.tabId && lock.tabId !== params.tabId,
  );
  const lockReleaseInMs = lockActive
    ? Math.max(0, Math.min(lock.leaseExpiresAt, lock.sessionEndsAt) - now)
    : null;

  const activeQuota = isQuotaIn24hWindow(rawQuota, now) ? rawQuota : null;
  const dailyUsed = activeQuota !== null;
  const remainingResetMs = activeQuota ? Math.max(0, activeQuota.resetAt - now) : 0;
  const remainingSessionMs = activeQuota ? Math.max(0, activeQuota.sessionEndsAt - now) : 0;
  const isSessionExpired = Boolean(activeQuota && now >= activeQuota.sessionEndsAt);
  const canResumeActiveSession = Boolean(
    activeQuota && now < activeQuota.sessionEndsAt && !occupiedByOther,
  );

  return {
    now,
    maxSessionMinutes: LIVE_EXAMINER_MAX_SESSION_MINUTES,
    resetHours: LIVE_EXAMINER_RESET_HOURS,
    maxConcurrentUsers: LIVE_EXAMINER_MAX_CONCURRENT_USERS,
    occupiedByOther,
    occupiedByOtherTab,
    lockReleaseInMs,
    dailyUsed,
    activeQuestion: activeQuota?.questionText ?? null,
    sessionStartedAt: activeQuota?.startedAt ?? null,
    sessionEndsAt: activeQuota?.sessionEndsAt ?? null,
    remainingSessionMs,
    resetAt: activeQuota?.resetAt ?? null,
    remainingResetMs,
    canStartNewQuestion: !dailyUsed && !occupiedByOther,
    canResumeActiveSession,
    isSessionExpired,
  };
}

export async function releaseLiveExaminerLock(
  params: { userId: string; tabId?: string; now?: number },
  providedStore?: GuardStore,
): Promise<{ released: boolean }> {
  const now = params.now ?? Date.now();
  const store = providedStore ?? (await createSupabaseGuardStore());

  for (let attempt = 0; attempt < 3; attempt++) {
    const lockRow = await store.getOrCreateLockRow();
    const lock = parseJsonSafe<GlobalLiveLock>(lockRow.raw);
    if (!lock || lock.userId !== params.userId) {
      return { released: false };
    }
    if (params.tabId && lock.tabId !== params.tabId && lock.leaseExpiresAt > now) {
      return { released: false };
    }
    const ok = await store.compareAndSwapLockRow(lockRow.id, lockRow.raw, "null", now);
    if (ok) return { released: true };
  }
  return { released: false };
}

export async function claimOrRefreshLiveExaminerSession(
  params: {
    userId: string;
    tabId: string;
    question: string;
    allowCreate?: boolean;
    now?: number;
  },
  providedStore?: GuardStore,
): Promise<ClaimSessionResult> {
  const now = params.now ?? Date.now();
  const allowCreate = params.allowCreate !== false;
  const questionKey = normalizeGuardQuestion(params.question);
  if (!questionKey) {
    throw new Error("A valid exam question is required to start Live Examiner.");
  }
  const tabId = (params.tabId || "default").trim().slice(0, 120) || "default";
  const store = providedStore ?? (await createSupabaseGuardStore());

  // 1. Check account's 24-hour quota BEFORE touching the global lock
  const rawQuota = await store.getUserQuota(params.userId);
  const existingQuota = isQuotaIn24hWindow(rawQuota, now) ? rawQuota : null;

  if (existingQuota) {
    const resetWait = formatRemainingDuration(existingQuota.resetAt - now);
    if (existingQuota.questionKey !== questionKey) {
      throw new Error(
        `${DAILY_LIMIT_PREFIX}: Live Examiner is limited to 1 session per ${LIVE_EXAMINER_RESET_HOURS} hours (${LIVE_EXAMINER_MAX_SESSION_MINUTES} minutes max). Your next session resets in ${resetWait}.`,
      );
    }
    if (now >= existingQuota.sessionEndsAt) {
      await releaseLiveExaminerLock({ userId: params.userId, now }, store);
      throw new Error(
        `${LIVE_EXAMINER_TIMER_EXPIRED_PREFIX}: Your ${LIVE_EXAMINER_MAX_SESSION_MINUTES}-minute Live Examiner session has ended. Your next session resets in ${resetWait}.`,
      );
    }
  } else if (!allowCreate) {
    throw new Error(
      `${LIVE_EXAMINER_TIMER_EXPIRED_PREFIX}: No active Live Examiner session found. Start a session to continue.`,
    );
  }

  const isNewSession = !existingQuota;
  const startedAt = existingQuota ? existingQuota.startedAt : now;
  const sessionEndsAt = existingQuota
    ? existingQuota.sessionEndsAt
    : startedAt + LIVE_EXAMINER_MAX_SESSION_MS;
  const resetAt = existingQuota
    ? existingQuota.resetAt
    : startedAt + LIVE_EXAMINER_RESET_WINDOW_MS;

  // 2. Atomically acquire or refresh the global 1-user-at-a-time seat lock via CAS
  const nextLock: GlobalLiveLock = {
    userId: params.userId,
    tabId,
    questionKey,
    questionText: params.question.trim().slice(0, 300),
    startedAt,
    sessionEndsAt,
    leaseExpiresAt: Math.min(sessionEndsAt, now + LIVE_EXAMINER_LEASE_TTL_MS),
  };
  const nextLockRaw = JSON.stringify(nextLock);

  let acquired = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const lockRow = await store.getOrCreateLockRow();
    const currentLock = parseJsonSafe<GlobalLiveLock>(lockRow.raw);

    if (isLockActive(currentLock, now)) {
      if (currentLock.userId !== params.userId) {
        const waitStr = formatRemainingDuration(
          Math.min(currentLock.leaseExpiresAt, currentLock.sessionEndsAt) - now,
        );
        throw new Error(
          `${LIVE_EXAMINER_BUSY_PREFIX}: Only ${LIVE_EXAMINER_MAX_CONCURRENT_USERS} user can use Live Examiner at a time to protect system capacity. Please retry in ~${waitStr}.`,
        );
      }
      if (currentLock.tabId !== tabId) {
        throw new Error(
          `${LIVE_EXAMINER_BUSY_PREFIX}: Live Examiner is already active in another tab or window on your account. Close the other tab or wait up to 60s before continuing here.`,
        );
      }
    }

    const swapped = await store.compareAndSwapLockRow(lockRow.id, lockRow.raw, nextLockRaw, now);
    if (swapped) {
      acquired = true;
      break;
    }
  }

  if (!acquired) {
    throw new Error(
      `${LIVE_EXAMINER_BUSY_PREFIX}: Another user just claimed the single Live Examiner seat. Please try again shortly.`,
    );
  }

  // 3. Persist the 24-hour account quota ONLY AFTER the global lock succeeded
  if (isNewSession) {
    const newQuota: UserDailyQuota = {
      userId: params.userId,
      questionKey,
      questionText: params.question.trim().slice(0, 500),
      startedAt,
      sessionEndsAt,
      resetAt,
    };
    await store.saveUserQuota(params.userId, newQuota, now);
    if (store.recordDailyUsageBestEffort) {
      await store.recordDailyUsageBestEffort(params.userId, questionKey, now);
    }
  }

  return {
    sessionStartedAt: startedAt,
    sessionEndsAt,
    resetAt,
    remainingSessionMs: Math.max(0, sessionEndsAt - now),
    isNewSession,
  };
}
