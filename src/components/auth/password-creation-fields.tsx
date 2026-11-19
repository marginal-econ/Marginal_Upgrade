import { useState } from "react";
import { Eye, EyeOff, Check, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PasswordCriterion {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isStrong: boolean;
  matchesConfirm: boolean;
  isValid: boolean;
  criteria: PasswordCriterion[];
}

export function validatePasswordStrength(
  password: string,
  confirmPassword?: string,
): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isStrong = minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const matchesConfirm =
    confirmPassword !== undefined
      ? Boolean(password && confirmPassword && password === confirmPassword)
      : true;

  const criteria: PasswordCriterion[] = [
    { id: "length", label: "At least 8 characters", met: minLength },
    { id: "upper", label: "At least one uppercase letter (A–Z)", met: hasUpper },
    { id: "lower", label: "At least one lowercase letter (a–z)", met: hasLower },
    { id: "number", label: "At least one number (0–9)", met: hasNumber },
    { id: "special", label: "At least one special character (!@#$%^&*)", met: hasSpecial },
  ];

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isStrong,
    matchesConfirm,
    isValid: isStrong && matchesConfirm,
    criteria,
  };
}

export interface PasswordCreationFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  showRequirements: boolean;
  idPrefix?: string;
  className?: string;
  disabled?: boolean;
}

export function PasswordCreationFields({
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  showRequirements,
  idPrefix = "signup",
  className = "",
  disabled = false,
}: PasswordCreationFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validation = validatePasswordStrength(password, confirmPassword);
  const metCount = validation.criteria.filter((c) => c.met).length;
  const passwordsMatch = Boolean(confirmPassword && password === confirmPassword);

  const passwordId = `${idPrefix}-password`;
  const confirmPasswordId = `${idPrefix}-confirm-password`;

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* ── 1. Primary Password Entry ── */}
      <div className="space-y-1.5">
        <Label htmlFor={passwordId} className="text-xs font-semibold text-foreground">
          Password
        </Label>
        <div className="relative">
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            required
            disabled={disabled}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className="pr-10 transition-shadow duration-150 focus-visible:ring-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md focus:outline-hidden"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* ── 2. Live Password Strength Checklist (Shown on attempt if rules aren't met) ── */}
      {showRequirements && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2 text-xs transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Password requirements</span>
            <span
              className={cn(
                "font-semibold transition-colors",
                validation.isStrong
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {validation.isStrong ? "All requirements satisfied ✓" : `${metCount} of 5 satisfied`}
            </span>
          </div>

          <ul className="space-y-1.5 text-[11.5px]" aria-label="Password requirements">
            {validation.criteria.map((crit) => (
              <li key={crit.id} className="flex items-center gap-2 transition-colors">
                <span
                  className={cn(
                    "shrink-0 transition-colors",
                    crit.met
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/50"
                  )}
                  aria-hidden="true"
                >
                  {crit.met ? (
                    <CheckCircle2 className="size-3.5 fill-emerald-600/10 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="size-3.5 stroke-[1.5]" />
                  )}
                </span>
                <span
                  className={cn(
                    "transition-colors",
                    crit.met
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {crit.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 3. Confirm Password Entry ── */}
      <div className="space-y-1.5">
        <Label htmlFor={confirmPasswordId} className="text-xs font-semibold text-foreground">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id={confirmPasswordId}
            type={showConfirmPassword ? "text" : "password"}
            required
            disabled={disabled}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className={cn(
              "pr-10 transition-shadow duration-150 focus-visible:ring-2",
              confirmPassword && !passwordsMatch && "border-destructive focus-visible:ring-destructive/30"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={disabled}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md focus:outline-hidden"
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {/* Real-time Match Feedback */}
        {confirmPassword.length > 0 && (
          <p
            className={cn(
              "text-[11.5px] flex items-center gap-1.5 pt-0.5 transition-colors",
              passwordsMatch
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-destructive font-medium"
            )}
          >
            {passwordsMatch ? (
              <>
                <Check className="size-3.5 stroke-[2.5]" /> Passwords match
              </>
            ) : (
              <>
                <AlertCircle className="size-3.5 stroke-[2]" /> Passwords do not match
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
