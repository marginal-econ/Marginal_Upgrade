import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Hourglass, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureReferralCode } from "@/lib/waitlist-client";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/backend/client";

/**
 * A progress bar for waits with no real percentage to report (a single
 * network round trip, not a batched job) — same shimmer/fill styling as the
 * real staged bars elsewhere (MCQ generation, knowledge upload) so a wait
 * always reads the same way across the app. Ticks up while `active`, snaps
 * to 100 the instant it isn't (the caller flips `active` off on success).
 */
function WaitingBar({ active, label }: { active: boolean; label: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      if (value !== 0) {
        setValue(100);
        const reset = window.setTimeout(() => setValue(0), 400);
        return () => window.clearTimeout(reset);
      }
      return;
    }
    setValue(12);
    const interval = window.setInterval(() => {
      setValue((current) => (current < 88 ? current + (88 - current) * 0.18 : current));
    }, 220);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (value === 0) return null;

  return (
    <div className="space-y-1.5 animate-in fade-in duration-200">
      <div className="progress-shimmer overflow-hidden rounded-full">
        <Progress value={value} className="h-1.5 transition-[width] duration-300" />
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Marginal | AS/A Level Economics marking" },
      {
        name: "description",
        content:
          "Sign in to Marginal to mark Cambridge 9708 Economics essays against your own coursebook, syllabus and mark schemes.",
      },
      { property: "og:title", content: "Sign in — Marginal" },
      {
        property: "og:description",
        content: "Cambridge 9708 Economics essay marking, calibrated to real examiner standards.",
      },
    ],
  }),
  component: AuthPage,
});

// Which panel is showing inside the auth card. "signin"/"signup" are the
// normal tabbed form; "forgot" is the "send me a reset link" step; "recovery"
// is the "set a new password" step; "verifying" is the brief moment right
// after landing back from the emailed link, before we know which of the two
// above it should become.
type AuthView = "credentials" | "forgot" | "recovery" | "verifying";

/**
 * Reads the recovery link's own tokens straight out of the URL, synchronously,
 * instead of waiting on Supabase's async getSession()/onAuthStateChange to
 * tell us. That async path is a race: Supabase can finish parsing the
 * recovery tokens and fire PASSWORD_RECOVERY before this component's
 * listener has even subscribed to it (or the events can arrive out of
 * order), and when that happens the plain "already signed in → /dashboard"
 * redirect below fires first — the person's whole session ends there, on
 * what looks like a normal page reload, and the "set a new password" screen
 * never shows. Checking the URL itself can't race with anything.
 *
 * Supabase links use one of two shapes depending on flow type:
 *   implicit: /auth#access_token=...&type=recovery
 *   PKCE:     /auth?code=...&type=recovery  (or just ?code=... with no type)
 * Either shape means "this load is a password-reset link", so redirect
 * decisions must wait for it to resolve into a session before doing anything.
 */
function readRecoveryLinkState(): "recovery" | "error" | null {
  if (typeof window === "undefined") return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  const errorCode = hash.get("error_code") || query.get("error_code");
  if (errorCode) return "error";

  const type = hash.get("type") || query.get("type");
  if (type === "recovery" || type === "invite") return "recovery";
  if (hash.get("access_token") && !type) return "recovery"; // older Supabase links omit type
  if (query.get("code") && window.location.pathname === "/auth") return "recovery";

  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Set when the platform is at capacity and this sign-up went on the waitlist.
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistChallengeId, setWaitlistChallengeId] = useState<string | null>(null);
  const [waitlistOtp, setWaitlistOtp] = useState("");
  const [waitlistResendIn, setWaitlistResendIn] = useState(0);

  useEffect(() => {
    setReferralCode(captureReferralCode() ?? "");
  }, []);

  useEffect(() => {
    if (waitlistResendIn <= 0) return;
    const timer = window.setInterval(
      () => setWaitlistResendIn((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [waitlistResendIn]);

  const initialLinkState = useState(() => readRecoveryLinkState())[0];
  const [view, setView] = useState<AuthView>(initialLinkState ? "verifying" : "credentials");
  const [linkError, setLinkError] = useState(initialLinkState === "error");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Bail out of "verifying" if Supabase never turns the link into a
    // session (expired/already-used links redirect back with an error in
    // the URL, which readRecoveryLinkState already caught, but a silent
    // failure with no error param is possible too) — don't leave the person
    // staring at a progress bar forever.
    const timeout = window.setTimeout(() => {
      setView((current) => {
        if (current !== "verifying") return current;
        setLinkError(true);
        return "forgot";
      });
    }, 8000);

    supabase.auth.getSession().then(({ data }) => {
      // A recovery session is still a session, so the plain "already signed
      // in" redirect below must not fire for it — it would bounce the
      // person straight to the dashboard instead of letting them set a new
      // password. view is read fresh via the functional update below rather
      // than closed over, so this can't act on a stale "credentials" value.
      setView((current) => {
        if (data.session && current !== "recovery" && current !== "verifying") {
          navigate({ to: "/dashboard", replace: true });
        }
        if (data.session && current === "verifying") return "recovery";
        return current;
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.clearTimeout(timeout);
        setLinkError(false);
        setView("recovery");
      }
    });
    return () => {
      window.clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard", replace: true });
  };

  const sendResetLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: resetEmail.trim() }),
    });
    setBusy(false);
    const result = (await response.json()) as { message?: string };
    if (!response.ok) return toast.error(result.message ?? "The reset email could not be sent.");
    setResetSent(true);
  };

  const setNewPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/dashboard", replace: true });
  };

  const joinWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalisedReferral = referralCode.trim().toUpperCase();
    if (normalisedReferral && !/^[A-Z0-9]{4,16}$/.test(normalisedReferral)) {
      toast.error("Enter a valid referral code using 4–16 letters or numbers.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          city,
          country,
          referredBy: normalisedReferral || null,
          source: "account-access",
          challengeId: waitlistChallengeId ?? undefined,
          otp: waitlistChallengeId ? waitlistOtp : undefined,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        code?: string;
        challengeId?: string;
        position?: number | null;
      };
      if (response.ok && result.code === "VERIFICATION_REQUIRED" && result.challengeId) {
        setWaitlistChallengeId(result.challengeId);
        setWaitlistOtp("");
        setWaitlistResendIn(60);
        toast.success(result.message ?? "Verification code sent.");
        return;
      }
      if (!response.ok && response.status !== 409) throw new Error(result.message);
      setWaitlistPosition(result.position ?? null);
      setWaitlistChallengeId(null);
      toast.success(result.message ?? "Your access request has been received.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join the waitlist.");
    } finally {
      setBusy(false);
    }
  };

  const resendWaitlistCode = async () => {
    if (busy || waitlistResendIn > 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          city,
          country,
          referredBy: referralCode.trim().toUpperCase() || null,
          source: "account-access",
        }),
      });
      const result = (await response.json()) as { message?: string; challengeId?: string };
      if (!response.ok || !result.challengeId) throw new Error(result.message);
      setWaitlistChallengeId(result.challengeId);
      setWaitlistOtp("");
      setWaitlistResendIn(60);
      toast.success("A new verification code was sent. Check your inbox and spam folder.");
    } catch (error) {
      setWaitlistResendIn(60);
      toast.error(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-glow relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto px-3 py-4 sm:items-center sm:px-4 sm:py-10">
      <div
        className="paper-grid pointer-events-none absolute inset-0 opacity-25"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6 sm:gap-4">
          <Link to="/" className="group flex animate-in fade-in items-center gap-2 duration-500">
            <img
              src="/marginal-m-icon-clean.png"
              alt=""
              aria-hidden="true"
              className="size-8 object-contain transition-transform duration-200 group-hover:-rotate-6 sm:size-9"
            />
            <span className="text-base font-semibold sm:text-lg">Marginal</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden min-[360px]:inline">Back to website</span>
            <span className="min-[360px]:hidden">Back</span>
          </Link>
        </div>

        <div className="panel animate-in fade-in slide-in-from-bottom-2 overflow-hidden p-4 duration-500 sm:p-6 md:p-8">
          {view === "credentials" ? (
            <div className="animate-in fade-in duration-300" key="credentials">
              <div className="mb-6">
                <p className="eyebrow eyebrow-accent">Your workspace</p>
                <h1 className="mt-2 text-2xl font-bold">Welcome to Marginal</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Sign in to continue, or join the waitlist for access.
                </p>
              </div>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="signin"
                    className="transition-colors duration-150 data-[state=active]:animate-in data-[state=active]:fade-in"
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="transition-colors duration-150 data-[state=active]:animate-in data-[state=active]:fade-in"
                  >
                    Join waitlist
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="signin"
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  <form onSubmit={signIn} className="mt-5 space-y-4">
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                          onClick={() => {
                            setResetEmail(email);
                            setResetSent(false);
                            setView("forgot");
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="transition-shadow duration-150 focus-visible:ring-2"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full transition-transform duration-150 active:scale-[0.98]"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent
                  value="signup"
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  {waitlistPosition !== null ? (
                    <div className="mt-5 animate-in fade-in space-y-3 rounded-lg border border-border bg-muted/30 p-5 text-center duration-300">
                      <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Hourglass className="size-5" />
                      </span>
                      <p className="text-sm font-medium">You're on the waitlist</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Your request is waiting for an administrator to review it.
                        {waitlistPosition > 0
                          ? ` You're number ${waitlistPosition} in line.`
                          : ""}{" "}
                        If approved, we’ll send access instructions to{" "}
                        <span className="font-medium text-foreground">{email.trim()}</span>.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setWaitlistPosition(null)}
                      >
                        Use a different email
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={joinWaitlist} className="mt-5 space-y-4">
                      {waitlistChallengeId ? (
                        <Field
                          id="waitlist-code"
                          label="Verification code"
                          value={waitlistOtp}
                          onChange={(value) => setWaitlistOtp(value.replace(/\D/g, "").slice(0, 6))}
                        />
                      ) : (
                        <>
                          <Field
                            id="name"
                            label="Full name"
                            value={fullName}
                            onChange={setFullName}
                          />
                          <Field
                            id="email-up"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={setEmail}
                          />
                          <Field id="city" label="City" value={city} onChange={setCity} />
                          <Field
                            id="country"
                            label="Country"
                            value={country}
                            onChange={setCountry}
                            autoComplete="country-name"
                            placeholder="Your country"
                          />
                          <Field
                            id="referral-code"
                            label="Referral code (optional)"
                            value={referralCode}
                            onChange={(value) =>
                              setReferralCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                            }
                            required={false}
                            maxLength={16}
                            autoComplete="off"
                            placeholder="Enter a friend’s referral code"
                          />
                        </>
                      )}
                      <p className="-mt-1 text-xs text-muted-foreground">
                        {waitlistChallengeId
                          ? `Enter the six-digit code sent to ${email}. It expires in 10 minutes.`
                          : "We'll verify your email first. Access is then reviewed by an administrator."}
                      </p>
                      {waitlistChallengeId ? (
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy || waitlistResendIn > 0}
                            onClick={resendWaitlistCode}
                          >
                            {waitlistResendIn > 0
                              ? `Resend code in ${waitlistResendIn}s`
                              : "Resend code"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWaitlistChallengeId(null);
                              setWaitlistOtp("");
                              setWaitlistResendIn(0);
                            }}
                          >
                            Change email
                          </Button>
                        </div>
                      ) : null}
                      <Button
                        type="submit"
                        className="w-full transition-transform duration-150 active:scale-[0.98]"
                        disabled={busy}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {waitlistChallengeId ? "Verifying…" : "Sending code…"}
                          </>
                        ) : waitlistChallengeId ? (
                          "Verify & join"
                        ) : (
                          "Send verification code"
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : view === "verifying" ? (
            <div
              key="verifying"
              className="animate-in fade-in flex flex-col items-center gap-4 py-6 text-center duration-300"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Verifying your email link…</p>
                <p className="mt-1 text-xs text-muted-foreground">This only takes a moment.</p>
              </div>
              <div className="w-full">
                <WaitingBar active label="Confirming with your email link" />
              </div>
            </div>
          ) : view === "forgot" ? (
            <div
              key="forgot"
              className="animate-in fade-in slide-in-from-right-3 space-y-4 duration-300"
            >
              <button
                type="button"
                onClick={() => {
                  setLinkError(false);
                  setView("credentials");
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Back to sign in
              </button>

              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Reset your password</h2>
                  <p className="text-xs text-muted-foreground">
                    We'll email you a link to choose a new one.
                  </p>
                </div>
              </div>

              {linkError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  That reset link has expired or was already used. Request a new one below.
                </p>
              ) : null}

              {resetSent ? (
                <div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-6 text-center duration-300">
                  <CheckCircle2 className="size-6 animate-in zoom-in text-primary duration-500" />
                  <p className="text-sm font-medium">Check your email</p>
                  <p className="text-xs text-muted-foreground">
                    If an account exists for {resetEmail || "that address"}, a secure password reset
                    link has been sent. Delivery may take a few minutes. Please check your inbox and
                    spam or junk folder.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 transition-transform duration-150 active:scale-95"
                    onClick={() => setView("credentials")}
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={sendResetLink} className="space-y-4">
                  <Field
                    id="reset-email"
                    label="Email"
                    type="email"
                    value={resetEmail}
                    onChange={setResetEmail}
                  />
                  <Button
                    type="submit"
                    className="w-full transition-transform duration-150 active:scale-[0.98]"
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                  <WaitingBar active={busy} label="Sending your reset link" />
                </form>
              )}
            </div>
          ) : (
            <div
              key="recovery"
              className="animate-in fade-in slide-in-from-right-3 space-y-4 duration-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Choose a new password</h2>
                  <p className="text-xs text-muted-foreground">
                    You're verified via the emailed link — set a new password to finish.
                  </p>
                </div>
              </div>

              <form onSubmit={setNewPasswordSubmit} className="space-y-4">
                <Field
                  id="new-password"
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <Field
                  id="confirm-password"
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
                <p
                  className={cn(
                    "-mt-1 text-xs transition-colors duration-200",
                    confirmPassword.length > 0 && confirmPassword !== newPassword
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {confirmPassword.length > 0 && confirmPassword !== newPassword
                    ? "Passwords don't match yet."
                    : "At least 6 characters — words, spaces and simple phrases are all fine."}
                </p>
                <Button
                  type="submit"
                  className="w-full transition-transform duration-150 active:scale-[0.98]"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
                <WaitingBar active={busy} label="Updating your password" />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = true,
  maxLength,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
