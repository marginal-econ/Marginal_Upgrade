import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  isGuestUser,
  hasGuestUsedTrial,
  clearGuestTrial,
  GUEST_ESSAY_GRADED_KEY,
  GUEST_MCQ_COMPLETED_KEY,
  GUEST_TRIAL_USED_KEY,
} from "./guest-session";

describe("guest-session mode disabled", () => {
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

  it("always returns false for guest user checks", () => {
    expect(isGuestUser(null)).toBe(false);
    expect(isGuestUser({ user_metadata: { is_guest: true } })).toBe(false);
    expect(isGuestUser({ email: "guest_123@guest.marginal-econ.com" })).toBe(false);
    expect(hasGuestUsedTrial()).toBe(false);
  });

  it("clears guest storage keys properly", () => {
    localStorage.setItem(GUEST_ESSAY_GRADED_KEY, "true");
    localStorage.setItem(GUEST_MCQ_COMPLETED_KEY, "true");
    localStorage.setItem(GUEST_TRIAL_USED_KEY, "true");
    localStorage.setItem("marginal_is_guest", "true");

    clearGuestTrial();

    expect(localStorage.getItem(GUEST_ESSAY_GRADED_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_MCQ_COMPLETED_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_TRIAL_USED_KEY)).toBeNull();
    expect(localStorage.getItem("marginal_is_guest")).toBeNull();
  });
});
