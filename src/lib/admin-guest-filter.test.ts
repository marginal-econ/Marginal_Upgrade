import { describe, expect, it } from "vitest";
import { isGuestAccount, isGuestProfile } from "./admin.functions";

describe("Admin Guest Filter & Metrics Isolation", () => {
  it("correctly flags ephemeral and shared guest accounts", () => {
    expect(isGuestAccount({ email: "guest.student@marginal-econ.com" })).toBe(true);
    expect(isGuestAccount({ email: "guest_1795329430454_iddmpwt@guest.marginal-econ.com" })).toBe(true);
    expect(isGuestAccount({ user_metadata: { is_guest: true } })).toBe(true);
    expect(isGuestAccount({ email: "test_guest_12345@gmail.com" })).toBe(true);
  });

  it("never flags genuine registered students or teachers as guest accounts", () => {
    expect(isGuestAccount({ email: "siyona.shyam@dps.edu", user_metadata: { is_guest: false } })).toBe(false);
    expect(isGuestAccount({ email: "alex.economics@cambridge.org" })).toBe(false);
    expect(isGuestAccount({ email: "teacher@oakridge.in" })).toBe(false);
  });

  it("identifies guest profiles", () => {
    expect(isGuestProfile({ full_name: "Guest Student" })).toBe(true);
    expect(isGuestProfile({ full_name: "Guest Student (Preview)" })).toBe(true);
    expect(isGuestProfile({ full_name: "Siyona Shyam" })).toBe(false);
  });
});
