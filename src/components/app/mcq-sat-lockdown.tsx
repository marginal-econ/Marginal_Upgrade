import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Maximize2,
  Minimize2,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------- */
/* Fullscreen & Device Permission Utilities                              */
/* -------------------------------------------------------------------- */

export type SatViolationType = "fullscreen_exit" | "tab_switch" | "window_blur";

export interface SatViolation {
  id: string;
  type: SatViolationType;
  timestamp: number;
  title: string;
  description: string;
}

/**
 * Check whether the current device/browser supports the Fullscreen API.
 */
export function checkDeviceFullscreenSupport(): { supported: boolean; reason?: string } {
  if (typeof document === "undefined") {
    return { supported: false, reason: "Server environment" };
  }

  const doc = document as any;
  const isEnabled = Boolean(
    doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled,
  );

  if (!isEnabled) {
    return {
      supported: false,
      reason:
        "Fullscreen API is disabled or not supported by this browser engine or device OS (e.g., iPhone Safari).",
    };
  }

  return { supported: true };
}

/**
 * Check if the browser is currently rendering in full-screen mode.
 */
export function isExamFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement,
  );
}

/**
 * Request full-screen display on documentElement with cross-browser fallback
 * and optional Keyboard Lock (Chromium).
 */
export async function requestExamFullscreen(
  targetElement: HTMLElement = document.documentElement,
): Promise<{ success: boolean; error?: string }> {
  try {
    const el = targetElement as any;

    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: "hide" }).catch(async () => {
        // Fallback without options if rejected
        await el.requestFullscreen();
      });
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    } else {
      return {
        success: false,
        error: "Your browser does not expose the Fullscreen API.",
      };
    }

    // Attempt Keyboard Lock for Chromium-based browsers (Digital SAT / Bluebook behaviour)
    // Prevents accidental single-press Escape exits without user confirmation.
    if ("keyboard" in navigator && typeof (navigator as any).keyboard?.lock === "function") {
      try {
        await (navigator as any).keyboard.lock(["Escape"]);
      } catch {
        // Ignore failure if browser policy or user denies keyboard lock
      }
    }

    return { success: true };
  } catch (err: any) {
    const message =
      err?.name === "NotAllowedError" || err?.name === "SecurityError"
        ? "Device permission denied: Your browser or operating system blocked full-screen access. Please allow full-screen permission in your browser address bar/site settings."
        : err?.message || "Failed to enter full screen.";
    return { success: false, error: message };
  }
}

/**
 * Exit full screen and unlock keyboard safely.
 */
export async function exitExamFullscreen(): Promise<void> {
  try {
    // Release keyboard lock if active
    if ("keyboard" in navigator && typeof (navigator as any).keyboard?.unlock === "function") {
      try {
        (navigator as any).keyboard.unlock();
      } catch {
        // Safe no-op
      }
    }

    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch {
    // Safe no-op
  }
}

/* -------------------------------------------------------------------- */
/* Component: SAT Mode Activation Pre-Flight Dialog                      */
/* -------------------------------------------------------------------- */

interface SatLockdownPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isStarting?: boolean;
}

export function SatLockdownPromptDialog({
  open,
  onOpenChange,
  onConfirm,
  isStarting = false,
}: SatLockdownPromptDialogProps) {
  const support = checkDeviceFullscreenSupport();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border/80 p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                SAT-Style Fullscreen Lockdown Mode
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Simulate official proctored exam conditions and prevent window switching
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Maximize2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Full-Screen Display</p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">
                  Replicates the College Board Bluebook SAT app by taking over the full display, hiding browser tabs, URL bars, and system docks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Window & Tab Switch Monitoring</p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">
                  Tabbing out, opening other apps, or exiting full screen triggers an immediate focus loss warning and obscures questions to prevent cheating.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Anti-Cheat Protection</p>
                <p className="text-muted-foreground leading-relaxed mt-0.5">
                  Right-click inspection, copy-paste shortcuts, and developer shortcuts are intercepted and locked.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Device & Browser Permissions:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When you click <strong className="text-foreground">Enable SAT Lockdown</strong>, your browser will prompt for full-screen permission. You can enable or disable this mode at any time using the toolbar button or the Exit SAT toggle.
            </p>
            {!support.supported && (
              <p className="text-amber-600 dark:text-amber-400 font-medium pt-1">
                Note: {support.reason} On this device, SAT Mode will operate in enhanced full-viewport lockdown.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isStarting ? "Start in SAT Lockdown" : "Enable SAT Lockdown"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- */
/* Component: Violation Warning Overlay                                 */
/* -------------------------------------------------------------------- */

interface SatViolationOverlayProps {
  violation: SatViolation | null;
  totalViolations: SatViolation[];
  onResume: () => void;
  onDisableSatMode: () => void;
}

export function SatViolationOverlay({
  violation,
  totalViolations,
  onResume,
  onDisableSatMode,
}: SatViolationOverlayProps) {
  if (!violation) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="SAT Exam Lockdown Warning"
      className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-destructive/50 bg-card p-6 shadow-2xl space-y-5 text-center">
        {/* Warning Icon Banner */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive animate-pulse">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5"
            >
              Strike {totalViolations.length} of 3
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Official SAT Lockdown Monitor
            </span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Focus Loss Detected!
          </h3>
          <p className="text-sm font-semibold text-destructive">
            {violation.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            {violation.description} To ensure exam authenticity and prevent cheating, all exam content is obscured until you return to full-screen mode.
          </p>
        </div>

        {/* Violations Summary Pill */}
        {totalViolations.length > 0 && (
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-left space-y-2 max-h-36 overflow-y-auto">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Logged Event History ({totalViolations.length})
            </span>
            <div className="space-y-1 text-xs">
              {totalViolations.map((v, i) => (
                <div
                  key={v.id || i}
                  className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-1 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-[11px]">
                    {new Date(v.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[240px]">
                    {v.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            size="default"
            onClick={onResume}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 px-5 py-2.5 shadow-md"
          >
            <Maximize2 className="h-4 w-4" />
            Return to Fullscreen & Resume
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={onDisableSatMode}
            className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Turn Off SAT Mode
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Component: Practice Top Bar SAT Control                              */
/* -------------------------------------------------------------------- */

interface SatToolbarControlProps {
  isActive: boolean;
  onOpenPrompt: () => void;
  onExitSatMode: () => void;
}

export function SatToolbarControl({
  isActive,
  onOpenPrompt,
  onExitSatMode,
}: SatToolbarControlProps) {
  if (!isActive) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onOpenPrompt}
        className="h-8 px-2.5 text-xs gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-foreground font-medium transition-all shadow-2xs"
        title="Enable SAT-Style Fullscreen Lockdown Mode (locks screen & detects window changes)"
      >
        <Shield className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">SAT Mode</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none shadow-xs"
        title="SAT Lockdown Active: Window and tab switches are monitored."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline font-mono text-[10.5px] font-bold tracking-tight">
          SAT LOCKDOWN
        </span>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={onExitSatMode}
        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        title="Exit SAT Fullscreen Lockdown Mode"
      >
        <Minimize2 className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Exit</span>
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Component: Post-Exam Proctoring Integrity Report                     */
/* -------------------------------------------------------------------- */

interface SatIntegrityReportProps {
  wasSatModeActive: boolean;
  violations: SatViolation[];
}

export function SatIntegrityReport({
  wasSatModeActive,
  violations,
}: SatIntegrityReportProps) {
  if (!wasSatModeActive) return null;

  const count = violations.length;

  if (count === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>SAT Proctoring: 100% Verified (0 window switches)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-2xs">
      <ShieldAlert className="h-3.5 w-3.5" />
      <span>
        SAT Proctoring: {count} focus warning{count === 1 ? "" : "s"} logged
      </span>
    </div>
  );
}
