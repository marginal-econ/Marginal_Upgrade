import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RequestSignupOtpInput = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  fullName: z.string().trim().min(1, "Please enter your full name."),
  password: z.string().min(6, "Use at least 6 characters for your password."),
  school: z.string().optional(),
  turnstileToken: z.string().optional().nullable(),
});

export const requestSignupOtpFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => RequestSignupOtpInput.parse(input))
  .handler(async ({ data }) => {
    const { requestSignupOtp } = await import("@/server/signup-otp");
    return requestSignupOtp(data);
  });

const VerifySignupOtpInput = z.object({
  challengeId: z.string().uuid("Invalid verification session ID."),
  code: z.string().trim().length(6, "Please enter the full 6-digit code."),
  email: z.string().trim().email("Please enter a valid email address."),
});

export const verifySignupOtpFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => VerifySignupOtpInput.parse(input))
  .handler(async ({ data }) => {
    const { verifySignupOtp } = await import("@/server/signup-otp");
    return verifySignupOtp(data);
  });

const ResendSignupOtpInput = z.object({
  challengeId: z.string().uuid("Invalid verification session ID."),
  email: z.string().trim().email("Please enter a valid email address."),
});

export const resendSignupOtpFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ResendSignupOtpInput.parse(input))
  .handler(async ({ data }) => {
    const { resendSignupOtp } = await import("@/server/signup-otp");
    return resendSignupOtp(data);
  });
