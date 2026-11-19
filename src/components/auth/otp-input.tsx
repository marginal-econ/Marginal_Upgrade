import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OtpVerificationCardProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
  busy: boolean;
}

export function OtpVerificationCard({
  email,
  onVerify,
  onResend,
  onChangeEmail,
  busy,
}: OtpVerificationCardProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(60);
  const [resending, setResending] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // Single digit entry
    const updated = [...digits];
    updated[index] = clean[clean.length - 1]!;
    setDigits(updated);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Completed last digit
      const fullCode = updated.join("");
      if (fullCode.length === 6) {
        onVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i]!;
    }
    setDigits(updated);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      onVerify(pasted);
    }
  };

  const handleResendClick = async () => {
    if (countdown > 0 || resending || busy) return;
    setResending(true);
    try {
      await onResend();
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  };

  const fullCode = digits.join("");
  const isComplete = fullCode.length === 6;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
      {/* Back button to change email */}
      <button
        type="button"
        onClick={onChangeEmail}
        disabled={busy}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ArrowLeft className="size-3.5" />
        Use a different email
      </button>

      {/* Header with Mailjet branding badge */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Mail className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Verify your email address
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            We sent a 6-digit verification code from{" "}
            <span className="font-semibold text-foreground">marginal.econ.ai@gmail.com</span> to:
          </p>
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 break-all mt-0.5">
            {email}
          </p>
        </div>
      </div>

      {/* 6 Digit Inputs */}
      <div className="py-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={busy}
              className="size-11 sm:size-12 rounded-xl border-2 border-border/80 bg-background text-center text-xl font-bold text-foreground transition-all duration-150 focus:border-purple-600 focus:outline-hidden focus:ring-4 focus:ring-purple-500/15 disabled:opacity-50"
              aria-label={`Digit ${index + 1} of verification code`}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2.5">
          Code expires in <strong>10 minutes</strong>.
        </p>
      </div>

      {/* Verify & Create Account Button */}
      <Button
        type="button"
        onClick={() => onVerify(fullCode)}
        disabled={!isComplete || busy}
        className="w-full h-11 text-sm font-semibold transition-transform duration-150 active:scale-[0.98] shadow-sm"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Verifying code…
          </>
        ) : (
          <>
            <ShieldCheck className="size-4 mr-2" />
            Verify & Create Account
          </>
        )}
      </Button>

      {/* Resend Code Section with Cooldown */}
      <div className="flex items-center justify-between text-xs pt-1 px-1">
        <span className="text-muted-foreground">Didn't receive the code?</span>
        <button
          type="button"
          onClick={handleResendClick}
          disabled={countdown > 0 || resending || busy}
          className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
        >
          {resending ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Sending…
            </>
          ) : countdown > 0 ? (
            <>
              <RefreshCw className="size-3 animate-spin duration-3000" />
              Resend code in {countdown}s
            </>
          ) : (
            "Resend code"
          )}
        </button>
      </div>

      {/* Deliverability & Anti-Spam Guidance Card */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-[12px]">
          <span>📬</span>
          <span>Ensure Primary Inbox Delivery</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
          <li>
            Check your <strong>Spam</strong> or <strong>Junk</strong> folder if you don't see it within 30 seconds.
          </li>
          <li>
            If it landed in spam, click <strong>"Report not spam"</strong> to guarantee future exam feedback reports arrive directly in your primary inbox.
          </li>
          <li>
            Add <strong>marginal.econ.ai@gmail.com</strong> to your contacts or safe sender list.
          </li>
        </ul>
      </div>
    </div>
  );
}
