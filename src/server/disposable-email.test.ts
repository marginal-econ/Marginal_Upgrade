import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "./disposable-email";

describe("disposable email protection", () => {
  it("detects and blocks popular temporary and disposable email providers", () => {
    const tempEmails = [
      "user@tempmail.com",
      "student@temp-mail.org",
      "test@10minutemail.com",
      "bot@mailinator.com",
      "spam@guerrillamail.com",
      "fake@yopmail.com",
      "throw@trashmail.com",
      "drop@sharklasers.com",
      "anon@dispostable.com",
      "burner@emailondeck.com",
      "test@mohmal.com",
      "abc@subdomain.mailinator.com",
    ];

    for (const email of tempEmails) {
      expect(isDisposableEmail(email)).toBe(true);
    }
  });

  it("permits legitimate student and school emails", () => {
    const legitimateEmails = [
      "student@gmail.com",
      "teacher@yahoo.com",
      "candidate@outlook.com",
      "user@icloud.com",
      "applicant@hotmail.com",
      "staff@csaicoimbatore.com",
      "candidate@cambridge.org",
      "economics@school.edu.sg",
      "user@proton.me",
    ];

    for (const email of legitimateEmails) {
      expect(isDisposableEmail(email)).toBe(false);
    }
  });

  it("handles empty or invalid email strings gracefully", () => {
    expect(isDisposableEmail("")).toBe(false);
    expect(isDisposableEmail("notanemail")).toBe(false);
    expect(isDisposableEmail("missingdomain@")).toBe(false);
  });
});
