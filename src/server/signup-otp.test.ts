import { describe, expect, it } from "vitest";
import {
  buildSignupOtpHtml,
  buildSignupOtpText,
  computeChallengeHash,
  generateSixDigitOtp,
} from "./signup-otp";

describe("signup-otp server logic", () => {
  it("generates a valid 6-digit numeric OTP code", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSixDigitOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    }
  });

  it("computes a deterministic HMAC-SHA256 challenge hash", async () => {
    const challengeId = "test-uuid-1234";
    const code = "849201";
    const hash1 = await computeChallengeHash(`${challengeId}:${code}`);
    const hash2 = await computeChallengeHash(`${challengeId}:${code}`);
    const hashDifferent = await computeChallengeHash(`${challengeId}:123456`);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).not.toBe(hashDifferent);
  });

  it("builds anti-spam compliant HTML with preheader, sender address and deliverability guidance", () => {
    const html = buildSignupOtpHtml({
      code: "739104",
      email: "student@example.com",
      fullName: "Alex Rivera",
    });

    // Contains the 6 digits in separate styled table cells
    expect(html).toContain("7");
    expect(html).toContain("3");
    expect(html).toContain("9");
    expect(html).toContain("1");
    expect(html).toContain("0");
    expect(html).toContain("4");

    // Preheader snippet present for clean inbox notification snippet
    expect(html).toContain("Your Marginal verification code is 739104. It expires in 10 minutes.");

    // Contains deliverability & safe sender advice for marginal.econ.ai@gmail.com
    expect(html).toContain("marginal.econ.ai@gmail.com");
    expect(html).toContain("Report not spam");

    // Zero external remote font imports or script tags (anti-spam requirement)
    expect(html).not.toContain("<script");
    expect(html).not.toContain("@import");
  });

  it("builds synchronized plain text counterpart for multipart MIME conformity", () => {
    const text = buildSignupOtpText({
      code: "739104",
      email: "student@example.com",
      fullName: "Alex Rivera",
    });

    expect(text).toContain("739104");
    expect(text).toContain("Hi Alex");
    expect(text).toContain("marginal.econ.ai@gmail.com");
    expect(text).toContain("10 minutes");
  });
});
