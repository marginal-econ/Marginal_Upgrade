import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Lock, Mail, Shield, Sparkles, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upgradeGuestAccount } from "@/lib/guest-session";

interface GuestUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  scoreText?: string;
  isLocked?: boolean;
}

export function GuestUpgradeDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  scoreText,
  isLocked = false,
}: GuestUpgradeDialogProps) {
  const resolvedTitle =
    title ||
    (isLocked
      ? "1 Free Guest Trial Completed — Create Your Free Account"
      : "Save Your Cambridge Diagnostic & Keep Access");
  const resolvedSubtitle =
    subtitle ||
    (isLocked
      ? "You have completed your 1 free guest trial. Create your permanent free student account now to save all your reports, unlock unlimited marking, and track past papers."
      : "You are currently testing Marginal as a Guest. Claim your free student account now to save this candidate report, track past paper history, and unlock full platform access.");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await upgradeGuestAccount({
        email: email.trim(),
        password,
        fullName: fullName.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Could not upgrade account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Account successfully created! Your essay report and history are now saved.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error during upgrade");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isLocked && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        onPointerDownOutside={(e) => {
          if (isLocked) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isLocked) e.preventDefault();
        }}
        className="max-w-md sm:max-w-lg border-2 border-primary/30 p-6 rounded-2xl shadow-2xl"
      >
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="size-4" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                Cambridge 9708 Candidate Hub
              </span>
            </div>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <Lock className="size-3" /> 1 Guest Trial Completed
              </span>
            )}
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
            {resolvedTitle}
          </DialogTitle>
          {scoreText && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>{scoreText}</span>
            </div>
          )}
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {resolvedSubtitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpgrade} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name" className="text-xs font-semibold">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="guest-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Siyona Shyam"
                className="pl-9 text-xs sm:text-sm h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-email" className="text-xs font-semibold">
              Email Address <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="pl-9 text-xs sm:text-sm h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-password" className="text-xs font-semibold">
              Create Password <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="guest-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pl-9 text-xs sm:text-sm h-10"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                <span>Creating Profile...</span>
              ) : (
                <>
                  <span>Save Report &amp; Claim Account</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
            {!isLocked && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-foreground h-10"
              >
                Remind Me Later
              </Button>
            )}
          </div>

          <div className="space-y-1 pt-1 text-center">
            <p className="text-[11px] text-muted-foreground">
              🔒 100% Free • No credit card • Keeps all your marks and comment pins
            </p>
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <a
                href="/auth"
                className="text-primary font-semibold underline underline-offset-4 hover:text-primary/80"
              >
                Sign in here
              </a>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
