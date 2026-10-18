import { describe, it, expect, vi } from "vitest";
import { getUserSubscriptionDetails } from "./subscription.server";
import { TIER_LIMITS } from "./usage-limits";

describe("Subscription Details & Entitlements", () => {
  function createMockSupabase(definitionsRows: any[] = [], userRolesRows: any[] = []) {
    return {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: any) => ({
            maybeSingle: vi.fn(async () => {
              if (table === "definitions") {
                const row = definitionsRows.find(r => r.term === val);
                return { data: row ?? null, error: null };
              }
              return { data: null, error: null };
            }),
            ilike: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
            limit: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })) as any,
    };
  }

  it("grants admin full unlimited access", async () => {
    const mockDb = createMockSupabase();
    const details = await getUserSubscriptionDetails(
      mockDb,
      "00296414-0221-4d5b-aa1c-04dc9366a218",
      "marginal.econ.ai@gmail.com"
    );

    expect(details.isAdmin).toBe(true);
    expect(details.isPaid).toBe(true);
    expect(details.tier).toBe("elite");
    expect(details.essaysLimit).toBe(9999);
    expect(details.liveExaminerCredits).toBe(999);
    expect(details.canUseLiveExaminer).toBe(true);
    expect(details.canGradeEssay).toBe(true);
  });

  it("resolves foundation tier correctly with 8 essays and 2 Live Examiner credits", async () => {
    const mockDb = createMockSupabase([
      {
        term: "__USER_SUB_user-foundation-123",
        definition_text: JSON.stringify({ tier: "foundation" }),
      },
    ]);

    const details = await getUserSubscriptionDetails(
      mockDb,
      "user-foundation-123",
      "student@example.com"
    );

    expect(details.isAdmin).toBe(false);
    expect(details.isPaid).toBe(true);
    expect(details.tier).toBe("foundation");
    expect(details.tierName).toBe("Foundation Scholar");
    expect(details.essaysLimit).toBe(8);
    expect(details.essaysRemaining).toBe(8);
    expect(details.liveExaminerCredits).toBe(2);
    expect(details.canUseLiveExaminer).toBe(true);
    expect(details.canGradeEssay).toBe(true);
  });

  it("resolves scholar_plus tier correctly with 15 essays and 4 Live Examiner credits", async () => {
    const mockDb = createMockSupabase([
      {
        term: "__USER_SUB_user-scholar-plus-123",
        definition_text: JSON.stringify({ tier: "scholar_plus" }),
      },
    ]);

    const details = await getUserSubscriptionDetails(
      mockDb,
      "user-scholar-plus-123",
      "scholar@example.com"
    );

    expect(details.isAdmin).toBe(false);
    expect(details.isPaid).toBe(true);
    expect(details.tier).toBe("scholar_plus");
    expect(details.tierName).toBe("Scholar Plus");
    expect(details.essaysLimit).toBe(15);
    expect(details.essaysRemaining).toBe(15);
    expect(details.liveExaminerCredits).toBe(4);
    expect(details.canUseLiveExaminer).toBe(true);
    expect(details.canGradeEssay).toBe(true);
  });

  it("restricts free tier user to 2 essays and 0 Live Examiner credits", async () => {
    const mockDb = createMockSupabase([]);

    const details = await getUserSubscriptionDetails(
      mockDb,
      "user-free-456",
      "freestudent@example.com"
    );

    expect(details.isAdmin).toBe(false);
    expect(details.isPaid).toBe(false);
    expect(details.tier).toBe("free");
    expect(details.tierName).toBe("Free Tier");
    expect(details.essaysLimit).toBe(2);
    expect(details.liveExaminerCredits).toBe(0);
    expect(details.canUseLiveExaminer).toBe(false);
  });

  it("correctly identifies teachers with evaluation desk access and grading privileges", async () => {
    const mockDb = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: any) => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            ilike: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        })),
      })) as any,
    };

    const details = await getUserSubscriptionDetails(
      mockDb,
      "user-teacher-789",
      "teacher@school.org",
      { user_metadata: { role: "teacher" } }
    );

    expect(details.isTeacher).toBe(true);
    expect(details.isPaid).toBe(false);
    expect(details.essaysLimit).toBe(3);
    expect(details.canGradeEssay).toBe(true);
    expect(details.liveExaminerCredits).toBe(0);
    expect(details.canUseLiveExaminer).toBe(false);
  });

  it("enforces compulsory 2-essay free student trial and locks after 2 essays", async () => {
    function createMockWithEssayCount(essayCount: number) {
      return {
        from: vi.fn((table: string) => {
          if (table === "essays") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ count: essayCount, error: null })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                ilike: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })),
                limit: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          };
        }),
      } as any;
    }

    const freeStudentFresh = await getUserSubscriptionDetails(
      createMockWithEssayCount(0),
      "student-0",
      "student0@test.com"
    );
    expect(freeStudentFresh.essaysLimit).toBe(2);
    expect(freeStudentFresh.essaysRemaining).toBe(2);
    expect(freeStudentFresh.canGradeEssay).toBe(true);

    const freeStudentOneUsed = await getUserSubscriptionDetails(
      createMockWithEssayCount(1),
      "student-1",
      "student1@test.com"
    );
    expect(freeStudentOneUsed.essaysRemaining).toBe(1);
    expect(freeStudentOneUsed.canGradeEssay).toBe(true);

    const freeStudentExhausted = await getUserSubscriptionDetails(
      createMockWithEssayCount(2),
      "student-2",
      "student2@test.com"
    );
    expect(freeStudentExhausted.essaysRemaining).toBe(0);
    expect(freeStudentExhausted.canGradeEssay).toBe(false);
  });

  it("enforces educator 3-essay trial and locks after 3 essays", async () => {
    function createTeacherMockWithEssayCount(essayCount: number) {
      return {
        from: vi.fn((table: string) => {
          if (table === "essays") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ count: essayCount, error: null })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                ilike: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })),
                limit: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          };
        }),
      } as any;
    }

    const teacherFresh = await getUserSubscriptionDetails(
      createTeacherMockWithEssayCount(0),
      "teacher-0",
      "teacher@test.com",
      { user_metadata: { role: "teacher" } }
    );
    expect(teacherFresh.isTeacher).toBe(true);
    expect(teacherFresh.essaysLimit).toBe(3);
    expect(teacherFresh.essaysRemaining).toBe(3);
    expect(teacherFresh.canGradeEssay).toBe(true);

    const teacherExhausted = await getUserSubscriptionDetails(
      createTeacherMockWithEssayCount(3),
      "teacher-3",
      "teacher@test.com",
      { user_metadata: { role: "teacher" } }
    );
    expect(teacherExhausted.essaysRemaining).toBe(0);
    expect(teacherExhausted.canGradeEssay).toBe(false);
  });
});
