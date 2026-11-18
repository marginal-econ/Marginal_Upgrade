import { requireEnv, readEnv } from "./env";
import { getSupabaseAdmin } from "./supabase";
import { isDisposableEmail, isDisposableEmailServer } from "./disposable-email";

export type SignupOtpPayload = {
  email: string;
  fullName: string;
  password: string;
  school?: string;
  turnstileToken?: string | null;
  requesterIp?: string;
};

export type EmailTemplateParams = {
  code: string;
  email: string;
  fullName?: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!,
  );
}

/**
 * Generates an anti-spam compliant, high-deliverability HTML verification email.
 * - Zero external fonts or scripts (which trigger spam filters)
 * - Semantic responsive table layout with inline styles
 * - High text-to-HTML ratio
 * - Preheader snippet for clean lockscreen/notification preview
 * - Explicit safe-sender instructions to ensure primary inbox placement
 */
export function buildSignupOtpHtml({ code, email, fullName }: EmailTemplateParams): string {
  const safeEmail = escapeHtml(email);
  const safeName = fullName ? escapeHtml(fullName.trim().split(/\s+/)[0]) : "there";
  const digits = code.split("");

  const digitCells = digits
    .map(
      (d) =>
        `<td style="width:48px;height:58px;background:#f3effe;border:2px solid #7c4edb;border-radius:12px;text-align:center;font-size:30px;font-weight:700;color:#21172d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${d}</td>`,
    )
    .join('<td style="width:8px;"></td>');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Marginal Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f2fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#21172d;-webkit-font-smoothing:antialiased;">
  <!-- Preheader text (appears in lockscreen / inbox preview, hidden in body) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Your Marginal verification code is ${code}. It expires in 10 minutes.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f2fa;padding:36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:2px solid #21172d;border-radius:24px;box-shadow:6px 6px 0 #21172d;overflow:hidden;">
          
          <!-- Brand Accent Bar -->
          <tr>
            <td style="height:10px;background:#7c4edb;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #efe9f7;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:42px;height:42px;background:#7c4edb;border:2px solid #21172d;border-radius:12px;text-align:center;color:#ffffff;font-size:22px;font-weight:700;line-height:42px;">m</td>
                  <td style="padding-left:14px;">
                    <div style="font-size:20px;font-weight:700;color:#21172d;letter-spacing:-0.2px;">Marginal</div>
                    <div style="font-size:12px;color:#6d6579;font-weight:500;">Cambridge Economics 9708 Workspace</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0 0 10px;color:#7c4edb;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Account Verification</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#181323;font-weight:700;">Verify your email address</h1>
              <p style="margin:0 0 24px;color:#5a5366;font-size:16px;line-height:1.6;">
                Hi ${safeName}, thank you for registering with Marginal. Use the 6-digit verification code below to confirm your email and activate your student account:
              </p>

              <!-- 6-digit Code Blocks -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;" aria-label="Verification code ${code}">
                <tr>
                  ${digitCells}
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#5a5366;font-size:14px;line-height:1.6;">
                <strong style="color:#21172d;">This code expires in 10 minutes.</strong><br>
                Enter this code on the verification screen to complete your registration.
              </p>

              <!-- Anti-Spam Whitelist & Safe Sender Guidance Box -->
              <div style="margin-top:28px;padding:16px 20px;border-radius:14px;background:#f8f5fd;border:1px solid #e7deff;color:#554d63;font-size:13px;line-height:1.6;">
                <strong style="color:#21172d;display:block;margin-bottom:4px;">📬 Did this email land in your spam or junk folder?</strong>
                If so, please click <strong>"Report not spam"</strong> and add <strong>marginal.econ.ai@gmail.com</strong> to your contacts or safe sender list. This ensures you receive your examination marking reports, model essays, and notifications without delay.
              </div>

              <div style="margin-top:16px;padding:14px 18px;border-radius:12px;background:#fff8ee;border:1px solid #fae6c8;color:#7d5718;font-size:12px;line-height:1.55;">
                <strong>Security Notice:</strong> Marginal administrators will never ask for your verification code or password. If you did not initiate this registration, no account has been activated and you can safely ignore this message.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#21172d;color:#d5c9e6;font-size:12px;line-height:1.6;">
              This automated verification email was sent to <strong style="color:#ffffff;">${safeEmail}</strong>.<br>
              Marginal · AS and A Level Economics (9708) · <a href="https://marginal-econ.com" style="color:#ba9eff;text-decoration:none;">marginal-econ.com</a>
            </td>
          </tr>
        </table>

        <!-- Sub-footer copyright -->
        <p style="margin:20px 0 0;color:#857d92;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} Marginal Economics. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the plain text equivalent for anti-spam multipart MIME conformity.
 */
export function buildSignupOtpText({ code, email, fullName }: EmailTemplateParams): string {
  const safeName = fullName ? fullName.trim().split(/\s+/)[0] : "there";
  return `Marginal · Cambridge Economics 9708
Account Verification

Your 6-digit verification code:
=============================
           ${code}
=============================

Hi ${safeName},

Thank you for registering with Marginal. Use the 6-digit verification code above to confirm your email and activate your student account.

• This code expires in 10 minutes.
• Enter it on the verification screen to complete your registration.
• For your security, never share this code or your password with anyone.

Delivery & Inbox Placement:
If this email appeared in your Spam or Junk folder, please mark it as "Not Spam" and add marginal.econ.ai@gmail.com to your contacts or safe senders list. This ensures you never miss essay feedback reports and exam mark schemes.

This automated security message was sent to ${email}.
If you did not request this code, no account has been activated and you can ignore this email.

Marginal · AS & A Level Economics (9708)
https://marginal-econ.com`;
}

/**
 * Computes HMAC-SHA256 digest of challenge token.
 */
export async function computeChallengeHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const secret =
    readEnv("WAITLIST_OTP_SECRET") ||
    readEnv("SUPABASE_SECRET_KEY") ||
    "marginal-account-otp-verification-secret-9708";

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates an unbiased 6-digit numeric OTP code.
 */
export function generateSixDigitOtp(): string {
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0]! >= 4294000000);
  return String(random[0]! % 1000000).padStart(6, "0");
}

/**
 * Sends the verification email via Mailjet API with optimal anti-spam parameters.
 */
export async function sendOtpEmailViaMailjet(params: {
  email: string;
  fullName?: string;
  code: string;
}): Promise<void> {
  const apiKey = readEnv("MAILJET_API_KEY");
  const secretKey = readEnv("MAILJET_SECRET_KEY");
  const senderEmail = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";

  if (!apiKey || !secretKey) {
    console.warn(
      `[signup-otp] MAILJET_API_KEY / MAILJET_SECRET_KEY not set. OTP code for ${params.email} is: ${params.code}`,
    );
    return;
  }

  const htmlPart = buildSignupOtpHtml(params);
  const textPart = buildSignupOtpText(params);

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: senderEmail,
            Name: "Marginal Economics",
          },
          ReplyTo: {
            Email: senderEmail,
            Name: "Marginal Support",
          },
          To: [
            {
              Email: params.email,
              Name: params.fullName || undefined,
            },
          ],
          Subject: `${params.code} is your Marginal verification code`,
          TextPart: textPart,
          HTMLPart: htmlPart,
          CustomID: "signup-otp-verification",
          CustomCampaign: "signup-otp",
          Priority: 2,
          TrackOpens: "disabled", // Anti-spam: disables 1x1 tracking pixel
          TrackClicks: "disabled", // Anti-spam: disables link rewriting proxies
          Headers: {
            "X-Entity-Ref-ID": `signup-${Date.now()}`,
            "Feedback-ID": "signup-otp:marginal:marginal-econ.com",
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[signup-otp] Mailjet dispatch error:", response.status, errorText);
    throw new Error(`Email delivery service error (HTTP ${response.status}). Please try again.`);
  }
}

/**
 * Handles the initial request to generate and dispatch a sign-up OTP.
 */
export async function requestSignupOtp(payload: SignupOtpPayload) {
  const email = payload.email.trim().toLowerCase();
  const fullName = payload.fullName.trim();
  const password = payload.password;
  const school = payload.school?.trim();

  // 1. Disposable email verification
  if (await isDisposableEmailServer(email)) {
    throw new Error(
      "Temporary or disposable email addresses are not permitted. Please use your permanent personal or institutional email.",
    );
  }

  // 2. Password minimum check
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const admin = getSupabaseAdmin();

  // 3. Existing User Account check
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    throw new Error(
      "An account with this email address already exists. Please sign in or reset your password.",
    );
  }

  // 4. Rate-limiting check: prevent spamming OTP requests (max 1 request per 45s)
  const { data: recentCodes } = await admin
    .from("waitlist_email_codes")
    .select("created_at")
    .eq("email", email)
    .gt("created_at", new Date(Date.now() - 45 * 1000).toISOString())
    .limit(1);

  if (recentCodes && recentCodes.length > 0) {
    throw new Error(
      "A verification code was recently sent to this address. Please wait a moment before requesting another.",
    );
  }

  // 5. Generate secure 6-digit code and challenge ID
  const challengeId = crypto.randomUUID();
  const code = generateSixDigitOtp();
  const codeHash = await computeChallengeHash(`${challengeId}:${code}`);
  const requesterHash = await computeChallengeHash(`ip:${payload.requesterIp || email}`);

  // Invalidate any previously unconsumed challenges for this email
  await admin
    .from("waitlist_email_codes")
    .update({ consumed: true })
    .eq("email", email)
    .eq("consumed", false);

  // 6. Store challenge in waitlist_email_codes
  const { error: insertError } = await admin.from("waitlist_email_codes").insert({
    id: challengeId,
    email,
    signup: {
      type: "student_signup_otp",
      email,
      fullName,
      password,
      school: school || null,
    },
    code_hash: codeHash,
    requester_hash: requesterHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    attempts: 0,
    consumed: false,
  });

  if (insertError) {
    console.error("[signup-otp] Failed to store OTP challenge:", insertError);
    throw new Error("Could not initialize account verification. Please try again.");
  }

  // 7. Dispatch verification email via Mailjet
  await sendOtpEmailViaMailjet({
    email,
    fullName,
    code,
  });

  return {
    challengeId,
    email,
    resendCooldownSeconds: 60,
  };
}

/**
 * Verifies the user-entered 6-digit OTP code and creates the Supabase account.
 */
export async function verifySignupOtp(params: {
  challengeId: string;
  code: string;
  email: string;
}) {
  const challengeId = params.challengeId.trim();
  const code = params.code.trim();
  const email = params.email.trim().toLowerCase();

  if (!code || code.length !== 6) {
    throw new Error("Please enter the full 6-digit verification code.");
  }

  const admin = getSupabaseAdmin();

  // 1. Fetch challenge record
  const { data: challenge, error } = await admin
    .from("waitlist_email_codes")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();

  if (error || !challenge) {
    throw new Error("Verification session not found or expired. Please request a new code.");
  }

  if (challenge.consumed) {
    throw new Error("This verification code has already been used. Please sign in or request a new one.");
  }

  if (new Date(challenge.expires_at) <= new Date()) {
    throw new Error("This verification code has expired. Please request a new code.");
  }

  if (challenge.attempts >= 5) {
    throw new Error("Too many incorrect attempts. Please request a new verification code.");
  }

  // 2. Validate Code Hash
  const expectedHash = await computeChallengeHash(`${challengeId}:${code}`);
  if (challenge.code_hash !== expectedHash) {
    const remainingAttempts = Math.max(0, 4 - challenge.attempts);
    await admin
      .from("waitlist_email_codes")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challengeId);

    if (remainingAttempts === 0) {
      throw new Error("Incorrect verification code. Maximum attempts reached. Please request a new code.");
    }
    throw new Error(`Incorrect verification code. ${remainingAttempts} attempts remaining.`);
  }

  // 3. Mark code as consumed
  await admin.from("waitlist_email_codes").update({ consumed: true }).eq("id", challengeId);

  // 4. Retrieve signup payload
  const signupData = challenge.signup as {
    fullName?: string;
    password?: string;
    school?: string;
  };

  const fullName = signupData?.fullName?.trim() || email.split("@")[0];
  const password = signupData?.password;
  const school = signupData?.school?.trim();

  if (!password) {
    throw new Error("Registration session expired. Please restart sign-up.");
  }

  // 5. Create or confirm user in Supabase Auth
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Pre-verified via Mailjet OTP!
    user_metadata: {
      full_name: fullName,
      school: school || undefined,
      role: "student",
    },
  });

  let userId: string | undefined = createData?.user?.id;

  if (createError) {
    // If the user already exists in auth (e.g. unconfirmed from previous session), update password & confirm email
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const match = listData?.users?.find((u) => u.email?.toLowerCase() === email);

    if (match) {
      userId = match.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(match.id, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          school: school || undefined,
          role: "student",
        },
      });
      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      throw new Error(createError.message);
    }
  }

  // 6. Ensure profile exists in profiles table
  if (userId) {
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "student",
      school: school || null,
      updated_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    email,
  };
}

/**
 * Resends a fresh 6-digit OTP code to the student.
 */
export async function resendSignupOtp(params: { challengeId: string; email: string }) {
  const challengeId = params.challengeId.trim();
  const email = params.email.trim().toLowerCase();

  const admin = getSupabaseAdmin();

  const { data: challenge } = await admin
    .from("waitlist_email_codes")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge) {
    throw new Error("Previous session not found. Please re-enter your details to sign up.");
  }

  // Cooldown check: 45 seconds from created_at
  const timeSinceCreated = Date.now() - new Date(challenge.created_at).getTime();
  if (timeSinceCreated < 45 * 1000) {
    const waitSeconds = Math.ceil((45 * 1000 - timeSinceCreated) / 1000);
    throw new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
  }

  // Invalidate previous code
  await admin.from("waitlist_email_codes").update({ consumed: true }).eq("id", challengeId);

  // Generate new code and new challenge
  const newChallengeId = crypto.randomUUID();
  const newCode = generateSixDigitOtp();
  const codeHash = await computeChallengeHash(`${newChallengeId}:${newCode}`);

  await admin.from("waitlist_email_codes").insert({
    id: newChallengeId,
    email,
    signup: challenge.signup,
    code_hash: codeHash,
    requester_hash: challenge.requester_hash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    attempts: 0,
    consumed: false,
  });

  const signupData = challenge.signup as { fullName?: string };
  await sendOtpEmailViaMailjet({
    email,
    fullName: signupData?.fullName,
    code: newCode,
  });

  return {
    challengeId: newChallengeId,
    success: true,
    resendCooldownSeconds: 60,
  };
}
