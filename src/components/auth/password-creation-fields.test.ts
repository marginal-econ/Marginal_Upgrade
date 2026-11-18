import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "./password-creation-fields";

describe("validatePasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const res = validatePasswordStrength("Ab1!");
    expect(res.minLength).toBe(false);
    expect(res.isStrong).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it("checks for uppercase letters", () => {
    const resMissingUpper = validatePasswordStrength("lowercase123!");
    expect(resMissingUpper.hasUpper).toBe(false);
    expect(resMissingUpper.isStrong).toBe(false);

    const resWithUpper = validatePasswordStrength("Lowercase123!");
    expect(resWithUpper.hasUpper).toBe(true);
  });

  it("checks for lowercase letters", () => {
    const resMissingLower = validatePasswordStrength("UPPERCASE123!");
    expect(resMissingLower.hasLower).toBe(false);
    expect(resMissingLower.isStrong).toBe(false);

    const resWithLower = validatePasswordStrength("UPPERcase123!");
    expect(resWithLower.hasLower).toBe(true);
  });

  it("checks for numbers", () => {
    const resMissingNumber = validatePasswordStrength("ValidPassword!");
    expect(resMissingNumber.hasNumber).toBe(false);
    expect(resMissingNumber.isStrong).toBe(false);

    const resWithNumber = validatePasswordStrength("ValidPassword1!");
    expect(resWithNumber.hasNumber).toBe(true);
  });

  it("checks for special characters", () => {
    const resMissingSpecial = validatePasswordStrength("ValidPassword1");
    expect(resMissingSpecial.hasSpecial).toBe(false);
    expect(resMissingSpecial.isStrong).toBe(false);

    const resWithSpecial = validatePasswordStrength("ValidPassword1@");
    expect(resWithSpecial.hasSpecial).toBe(true);
  });

  it("marks a password satisfying all 5 criteria as strong", () => {
    const res = validatePasswordStrength("Cambridge2026!Econ");
    expect(res.minLength).toBe(true);
    expect(res.hasUpper).toBe(true);
    expect(res.hasLower).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.hasSpecial).toBe(true);
    expect(res.isStrong).toBe(true);
    expect(res.criteria.every((c) => c.met)).toBe(true);
  });

  it("validates confirm password matching", () => {
    const strongPass = "Economics9708$";
    const resMismatch = validatePasswordStrength(strongPass, "Economics9708");
    expect(resMismatch.isStrong).toBe(true);
    expect(resMismatch.matchesConfirm).toBe(false);
    expect(resMismatch.isValid).toBe(false);

    const resMatch = validatePasswordStrength(strongPass, strongPass);
    expect(resMatch.isStrong).toBe(true);
    expect(resMatch.matchesConfirm).toBe(true);
    expect(resMatch.isValid).toBe(true);
  });
});
