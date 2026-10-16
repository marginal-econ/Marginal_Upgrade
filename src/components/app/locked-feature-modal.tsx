import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Lock,
  PenLine,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LockedFeatureType = "live_examiner" | "experimental" | null;

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LockedFeatureType;
}

export function LockedFeatureModal({
  open,
  onOpenChange,
  type,
}: LockedFeatureModalProps) {
  if (!type) return null;

  const isLiveExaminer = type === "live_examiner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-border/80 shadow-2xl">
        {/* Cool Chained Hero Graphic Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-muted/40 to-background border-b border-border/70 p-6 text-center">
          {/* Subtle starfield/glow */}
          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

          {/* Metallic Chains & Padlock Illustration */}
          <div className="relative mx-auto size-20 flex items-center justify-center">
            {/* SVG Crossed Metallic Security Chains */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full text-muted-foreground/40 stroke-current"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
            >
              {/* Chain link 1 */}
              <path d="M15 15 L35 35 M45 45 L55 55 M65 65 L85 85" strokeDasharray="6 3" />
              {/* Chain link 2 */}
              <path d="M85 15 L65 35 M55 45 L45 55 M35 65 L15 85" strokeDasharray="6 3" />
            </svg>

            {/* Glowing Padlock Centerpiece */}
            <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl border-2 border-amber-500/50 bg-card shadow-lg shadow-amber-500/20 text-amber-500">
              <Lock className="size-7 animate-pulse" />
            </div>
          </div>

          <Badge
            variant="outline"
            className="mt-4 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] tracking-wide uppercase px-3 py-0.5"
          >
            {isLiveExaminer ? "Paid Feature · Chained" : "Experimental Lab · Locked"}
          </Badge>

          <DialogTitle className="mt-2 text-xl font-extrabold tracking-tight text-foreground">
            {isLiveExaminer
              ? "Live Examiner is Chained"
              : "Experimental Labs Locked"}
          </DialogTitle>

          <DialogDescription className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {isLiveExaminer
              ? "Keystroke-level Cambridge 9708 live evaluation and real-time AO coaching are locked for Free accounts."
              : "Diagram CAD Lab, Past Paper Predictor, and Teacher Examiner Desk are reserved for Pro, Mastery, and Elite candidate passes."}
          </DialogDescription>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-5 space-y-4">
          <div className="space-y-2.5">
            {isLiveExaminer ? (
              <>
                <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 p-2.5 text-xs">
                  <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Real-Time AO Evaluation</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Grammarly-style clause checking as you type for AO1 Knowledge, AO2 Analysis, and AO3 Evaluation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 p-2.5 text-xs">
                  <Zap className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Dedicated Live Examiner Credits</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upgrade to Foundation (30 credits) or Pro (75 credits) to run live question coaching sessions.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 p-2.5 text-xs">
                  <Flame className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">15-Year Past Paper Matrix Predictor</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Statistical exam cycle modeling analyzing recurrence trends across 15 years of Cambridge papers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 p-2.5 text-xs">
                  <Sliders className="size-4 shrink-0 text-violet-500 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Diagram CAD &amp; Geometry Canvas</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Interactive vector lab to dynamically manipulate curve shifts, elasticity, and consumer surplus.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild size="default" className="w-full font-bold shadow-md">
              <Link to="/pricing" onClick={() => onOpenChange(false)}>
                <span>Unlock Plan from ₹149/mo</span>
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Continue with Free Features
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
