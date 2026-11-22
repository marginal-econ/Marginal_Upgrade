import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  isGuestUser,
  hasGuestUsedTrial,
  recordGuestEssayGraded,
  recordGuestMcqCompleted,
  clearGuestTrial,
  GUEST_ESSAY_GRADED_KEY,
  GUEST_MCQ_COMPLETED_KEY,
  GUEST_TRIAL_USED_KEY,
} from "./guest-session";

describe("guest-session trial lockout", () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: mockLocalStorage },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("identifies guest users accurately", () => {
    expect(isGuestUser(null)).toBe(false);
    expect(isGuestUser({ user_metadata: { is_guest: true } })).toBe(true);
    expect(isGuestUser({ email: "guest_123@guest.marginal-econ.com" })).toBe(true);

    localStorage.setItem("marginal_is_guest", "true");
    expect(isGuestUser({})).toBe(true);
  });

  it("enforces strict 1-trial lockout for guest students after grading an essay", () => {
    const guestUser = { user_metadata: { is_guest: true } };

    // Initially, no trial has been used
    expect(hasGuestUsedTrial(guestUser)).toBe(false);

    // Guest completes 1 essay
    recordGuestEssayGraded();

    expect(localStorage.getItem(GUEST_ESSAY_GRADED_KEY)).toBe("true");
    expect(localStorage.getItem(GUEST_TRIAL_USED_KEY)).toBe("true");
    expect(hasGuestUsedTrial(guestUser)).toBe(true);

    // Regular non-guest user is never locked out by guest trial keys
    expect(hasGuestUsedTrial({ user_metadata: { is_guest: false }, email: "real@school.com" })).toBe(false);
  });

  it("enforces strict 1-trial lockout for guest students after completing 1 MCQ paper", () => {
    const guestUser = { user_metadata: { is_guest: true } };

    expect(hasGuestUsedTrial(guestUser)).toBe(false);

    // Guest completes 1 MCQ
    recordGuestMcqCompleted();

    expect(localStorage.getItem(GUEST_MCQ_COMPLETED_KEY)).toBe("true");
    expect(localStorage.getItem(GUEST_TRIAL_USED_KEY)).toBe("true");
    expect(hasGuestUsedTrial(guestUser)).toBe(true);
  });

  it("clears guest trial lockout upon account upgrade", () => {
    const guestUser = { user_metadata: { is_guest: true } };

    recordGuestEssayGraded();
    expect(hasGuestUsedTrial(guestUser)).toBe(true);

    clearGuestTrial();

    expect(localStorage.getItem(GUEST_ESSAY_GRADED_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_MCQ_COMPLETED_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_TRIAL_USED_KEY)).toBeNull();
  });
});
