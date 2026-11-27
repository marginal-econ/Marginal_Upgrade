import { describe, expect, it } from "vitest";
import {
  claimOrRefreshLiveExaminerSession,
  getLiveExaminerGuardStatus,
  releaseLiveExaminerLock,
  type GuardStore,
  type GuardStoreRow,
  type UserDailyQuota,
} from "./session-guard.server";
import {
  LIVE_EXAMINER_LEASE_TTL_MS,
  LIVE_EXAMINER_MAX_SESSION_MS,
  LIVE_EXAMINER_RESET_WINDOW_MS,
} from "@/lib/usage-limits";

function createMemoryGuardStore(): GuardStore {
  let lockRow: GuardStoreRow = { id: "lock-1", raw: "null" };
  const quotas = new Map<string, UserDailyQuota>();

  return {
    async getOrCreateLockRow() {
      return { ...lockRow };
    },
    async compareAndSwapLockRow(id, expectedRaw, nextRaw) {
      if (lockRow.id !== id || lockRow.raw !== expectedRaw) return false;
      lockRow = { id, raw: nextRaw };
      return true;
    },
    async getUserQuota(userId) {
      return quotas.get(userId) ?? null;
    },
    async saveUserQuota(userId, quota) {
      quotas.set(userId, { ...quota });
    },
  };
}

describe("Live Examiner Session Guard (1 concurrent user, 1/day, 20m timer, 24h reset)", () => {
  const q1 = "Assess whether an indirect tax is the most effective way to reduce demerit goods.";
  const q2 = "Evaluate whether supply-side policies always reduce unemployment.";

  it("allows only one user globally at a time without burning the blocked user's daily quota", async () => {
    const store = createMemoryGuardStore();
    const t0 = 1_700_000_000_000;

    const resA = await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-a1", question: q1, now: t0 },
      store,
    );
    expect(resA.isNewSession).toBe(true);
    expect(resA.sessionEndsAt).toBe(t0 + LIVE_EXAMINER_MAX_SESSION_MS);
    expect(resA.resetAt).toBe(t0 + LIVE_EXAMINER_RESET_WINDOW_MS);

    // User B tries while User A's lease is active -> blocked
    await expect(
      claimOrRefreshLiveExaminerSession(
        { userId: "user-b", tabId: "tab-b1", question: q2, now: t0 + 10_000 },
        store,
      ),
    ).rejects.toThrow(/Live Examiner busy/i);

    // User B's daily quota must NOT have been consumed
    const statusB = await getLiveExaminerGuardStatus(
      { userId: "user-b", tabId: "tab-b1", now: t0 + 10_000 },
      store,
    );
    expect(statusB.occupiedByOther).toBe(true);
    expect(statusB.dailyUsed).toBe(false);

    // Once User A releases (or 60s lease expires), User B can start normally
    await releaseLiveExaminerLock({ userId: "user-a", tabId: "tab-a1", now: t0 + 15_000 }, store);
    const resB = await claimOrRefreshLiveExaminerSession(
      { userId: "user-b", tabId: "tab-b1", question: q2, now: t0 + 15_000 },
      store,
    );
    expect(resB.isNewSession).toBe(true);
  });

  it("blocks the same user from opening a second concurrent tab", async () => {
    const store = createMemoryGuardStore();
    const t0 = 1_700_000_000_000;

    await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: t0 },
      store,
    );

    await expect(
      claimOrRefreshLiveExaminerSession(
        { userId: "user-a", tabId: "tab-2", question: q1, now: t0 + 5_000 },
        store,
      ),
    ).rejects.toThrow(/another tab/i);

    // Original tab refreshes cleanly
    const refreshed = await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: t0 + 20_000 },
      store,
    );
    expect(refreshed.isNewSession).toBe(false);
    expect(refreshed.sessionEndsAt).toBe(t0 + LIVE_EXAMINER_MAX_SESSION_MS);
  });

  it("frees the global seat automatically after 60s lease expiry if user closes tab abruptly", async () => {
    const store = createMemoryGuardStore();
    const t0 = 1_700_000_000_000;

    await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: t0 },
      store,
    );

    const afterLease = t0 + LIVE_EXAMINER_LEASE_TTL_MS + 1;
    const resB = await claimOrRefreshLiveExaminerSession(
      { userId: "user-b", tabId: "tab-b1", question: q2, now: afterLease },
      store,
    );
    expect(resB.isNewSession).toBe(true);
  });

  it("enforces the 20-minute max timer and frees the global seat upon expiration", async () => {
    const store = createMemoryGuardStore();
    const t0 = 1_700_000_000_000;

    await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: t0 },
      store,
    );

    // Resuming same question at minute 10 preserves original 20m deadline
    const resumeAt = t0 + 10 * 60 * 1000;
    const resumed = await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: resumeAt },
      store,
    );
    expect(resumed.isNewSession).toBe(false);
    expect(resumed.remainingSessionMs).toBe(10 * 60 * 1000);

    // At 20m01s, user A is locked out and global lock is released
    const expiredAt = t0 + LIVE_EXAMINER_MAX_SESSION_MS + 1000;
    await expect(
      claimOrRefreshLiveExaminerSession(
        { userId: "user-a", tabId: "tab-1", question: q1, now: expiredAt },
        store,
      ),
    ).rejects.toThrow(/Session time limit reached/i);

    const statusB = await getLiveExaminerGuardStatus(
      { userId: "user-b", tabId: "tab-b1", now: expiredAt },
      store,
    );
    expect(statusB.occupiedByOther).toBe(false);
  });

  it("limits each account to 1 question per 24 hours and resets after 24 hours", async () => {
    const store = createMemoryGuardStore();
    const t0 = 1_700_000_000_000;

    await claimOrRefreshLiveExaminerSession(
      { userId: "user-a", tabId: "tab-1", question: q1, now: t0 },
      store,
    );
    await releaseLiveExaminerLock({ userId: "user-a", tabId: "tab-1", now: t0 + 60_000 }, store);

    // Different question 2 hours later -> blocked
    await expect(
      claimOrRefreshLiveExaminerSession(
        { userId: "user-a", tabId: "tab-1", question: q2, now: t0 + 2 * 60 * 60 * 1000 },
        store,
      ),
    ).rejects.toThrow(/Daily limit reached/i);

    // 23h59m later -> still blocked
    await expect(
      claimOrRefreshLiveExaminerSession(
        {
          userId: "user-a",
          tabId: "tab-1",
          question: q2,
          now: t0 + LIVE_EXAMINER_RESET_WINDOW_MS - 60_000,
        },
        store,
      ),
    ).rejects.toThrow(/Daily limit reached/i);

    // After 24 hours -> resets and allows a new session
    const resetRes = await claimOrRefreshLiveExaminerSession(
      {
        userId: "user-a",
        tabId: "tab-1",
        question: q2,
        now: t0 + LIVE_EXAMINER_RESET_WINDOW_MS + 1,
      },
      store,
    );
    expect(resetRes.isNewSession).toBe(true);
  });

  it("handles concurrent claim races atomically via compare-and-swap", async () => {
    const baseStore = createMemoryGuardStore();
    // Simulate two concurrent callers reading the same initial lock row before either writes
    const t0 = 1_700_000_000_000;
    const [r1, r2] = await Promise.allSettled([
      claimOrRefreshLiveExaminerSession(
        { userId: "user-1", tabId: "t1", question: q1, now: t0 },
        baseStore,
      ),
      claimOrRefreshLiveExaminerSession(
        { userId: "user-2", tabId: "t2", question: q2, now: t0 },
        baseStore,
      ),
    ]);

    const fulfilled = [r1, r2].filter((r) => r.status === "fulfilled");
    const rejected = [r1, r2].filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
