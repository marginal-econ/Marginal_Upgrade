import { CheckCircle2, Play, PlayCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TOUR_VIDEO_EVENT = "marginal-open-tour-video";
const TOUR_SEEN_STORAGE_PREFIX = "marginal.platformTourVideoSeen.v2";

export const TOUR_CHAPTERS = [
  { id: "hook", label: "Overview", timeLabel: "0:00", seconds: 0 },
  { id: "grader", label: "Essay Grader & OCR", timeLabel: "0:07", seconds: 6.85 },
  { id: "liveExaminer", label: "Live Examiner", timeLabel: "0:37", seconds: 37.35 },
  { id: "ecrGenerator", label: "ECR Generator", timeLabel: "1:02", seconds: 62.35 },
  { id: "mcqAndArena", label: "MCQ Suite & Arena", timeLabel: "1:14", seconds: 73.95 },
  { id: "classrooms", label: "Classrooms", timeLabel: "1:36", seconds: 95.5 },
  { id: "dataResponse", label: "Data Response", timeLabel: "1:49", seconds: 108.85 },
  { id: "hubsAndExamples", label: "Diagrams, Defs & Examples", timeLabel: "2:03", seconds: 122.75 },
  { id: "outro", label: "Outro", timeLabel: "2:15", seconds: 135.25 },
] as const;

export function openPlatformTourVideo() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_VIDEO_EVENT));
}

function tourSeenKey(userId: string): string {
  return `${TOUR_SEEN_STORAGE_PREFIX}.${userId}`;
}

export function PlatformTourVideoModal({
  open,
  onOpenChange,
  onDismiss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!open) {
      el.pause();
      setIsPaused(true);
      return;
    }
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => setIsPaused(false))
        .catch(() => {
          // Browser blocked unmuted autoplay (e.g., auto-opened modal); keep poster + play button visible.
          setIsPaused(true);
        });
    }
  }, [open]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onDismiss?.();
      }
      onOpenChange(nextOpen);
    },
    [onDismiss, onOpenChange],
  );

  const handlePlayClick = () => {
    const el = videoRef.current;
    if (!el) return;
    void el.play().then(() => setIsPaused(false)).catch(() => {});
  };

  const jumpToChapter = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play().then(() => setIsPaused(false)).catch(() => {});
  };

  let activeChapterId: string = TOUR_CHAPTERS[0].id;
  for (const ch of TOUR_CHAPTERS) {
    if (currentTime >= ch.seconds - 0.25) {
      activeChapterId = ch.id;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[94dvh] flex flex-col p-0 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden text-left">
        <div className="px-5 py-3.5 border-b border-border/70 bg-muted/25 flex items-center justify-between gap-3 shrink-0 pr-12">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/12 text-primary border-primary/25 text-[10.5px] font-semibold">
                <Sparkles className="size-3 mr-1" /> Cambridge 9708 Platform Tour
              </Badge>
              <Badge
                variant="outline"
                className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              >
                2:23 Full Walkthrough · Audio Guided
              </Badge>
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <PlayCircle className="size-4.5 text-primary shrink-0" />
              <span>Welcome to Marginal — Platform Overview</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Explore our Essay Grader &amp; OCR, Live Examiner, ECR Generator, MCQ Suite &amp; Arena, Classrooms, Data Response Studio, and Revision Hubs.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/80 bg-black shadow-lg">
            <video
              ref={videoRef}
              src="/marginal-tour.mp4"
              poster="/marginal-tour-poster.png"
              controls
              playsInline
              preload="metadata"
              onPlay={() => setIsPaused(false)}
              onPause={() => setIsPaused(true)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="w-full h-full object-contain"
            />
            {isPaused && currentTime < 0.15 && (
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label="Play platform tour video with audio"
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer group"
              >
                <span className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-2xl shadow-primary/40 group-hover:scale-105 transition-transform">
                  <Play className="size-4 fill-current" />
                  <span>Play Tour Video (2:23)</span>
                </span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Jump to Feature
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TOUR_CHAPTERS.map((ch) => {
                const isActive = ch.id === activeChapterId;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => jumpToChapter(ch.seconds)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                        : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="font-mono text-[10px] opacity-80">{ch.timeLabel}</span>
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-muted-foreground">
            You can replay this anytime from <strong className="text-foreground">Watch Tour</strong> in the top bar or{" "}
            <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono text-[10px]">Ctrl+K</kbd>.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => handleClose(false)}
            className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Got it, start exploring</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mounted inside the authenticated layout:
 * - Automatically shows the platform tour video once for every user entering the app after this release
 *   (after PrivacyConsent and OnboardingTutorial finish so dialogs never collide).
 * - Also listens for `openPlatformTourVideo()` from anywhere in the app.
 */
export function AuthenticatedPlatformTourHost({
  userId,
  canAutoShow,
}: {
  userId: string;
  canAutoShow: boolean;
}) {
  const [open, setOpen] = useState(false);
  const autoEvaluatedRef = useRef(false);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(tourSeenKey(userId), "true");
    } catch {
      /* ignore storage errors */
    }
  }, [userId]);

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener(TOUR_VIDEO_EVENT, onOpenRequest);
    return () => window.removeEventListener(TOUR_VIDEO_EVENT, onOpenRequest);
  }, []);

  useEffect(() => {
    if (!canAutoShow || autoEvaluatedRef.current) return;
    autoEvaluatedRef.current = true;
    try {
      const alreadySeen = window.localStorage.getItem(tourSeenKey(userId)) === "true";
      if (!alreadySeen) {
        const timer = window.setTimeout(() => {
          setOpen(true);
        }, 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [canAutoShow, userId]);

  return (
    <PlatformTourVideoModal
      open={open}
      onOpenChange={setOpen}
      onDismiss={markSeen}
    />
  );
}
