import { describe, it, expect } from "vitest";
import { isMarginalAdmin, MARGINAL_ADMIN_EMAIL, MARGINAL_ADMIN_USER_ID } from "./auth-admin";

describe("Marginal Admin Security Authorization", () => {
  it("authorizes the designated administrator by ID", () => {
    expect(isMarginalAdmin({ userId: MARGINAL_ADMIN_USER_ID })).toBe(true);
  });

  it("authorizes the designated administrator by email", () => {
    expect(isMarginalAdmin({ email: MARGINAL_ADMIN_EMAIL })).toBe(true);
    expect(isMarginalAdmin({ email: " Marginal.Econ.AI@gmail.com " })).toBe(true);
  });

  it("authorizes the designated administrator by JWT claims sub or email", () => {
    expect(isMarginalAdmin({ claims: { sub: MARGINAL_ADMIN_USER_ID } })).toBe(true);
    expect(isMarginalAdmin({ claims: { email: MARGINAL_ADMIN_EMAIL } })).toBe(true);
  });

  it("STRICTLY REJECTS ordinary students from admin permissions", () => {
    expect(isMarginalAdmin({ userId: "210ce19f-1b47-4012-ae4b-3362866f6acb", email: "saikrish.econ@gmail.com" })).toBe(false);
    expect(isMarginalAdmin({ userId: "some-random-uuid", email: "student@example.com" })).toBe(false);
  });

  it("STRICTLY REJECTS teachers from admin permissions", () => {
    expect(isMarginalAdmin({ userId: "ceefe050-d868-41c6-82ab-16d63fda9c01", email: "kiruthika24@gmail.com" })).toBe(false);
    expect(isMarginalAdmin({ email: "teacher@school.org" })).toBe(false);
  });

  it("rejects empty, null, or undefined context", () => {
    expect(isMarginalAdmin({})).toBe(false);
    expect(isMarginalAdmin(undefined)).toBe(false);
    expect(isMarginalAdmin({ email: "" })).toBe(false);
  });
});
