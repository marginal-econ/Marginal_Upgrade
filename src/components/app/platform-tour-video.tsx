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
const TOUR_SEEN_GLOBAL_KEY = "marginal.platformTourVideoSeen.v2";

// In-memory guard so even if storage is unavailable (e.g. strict private mode),
// the auto-popup can never fire more than once in a session.
let tourAutoShownInMemory = false;

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

function tourSeenUserKey(userId: string): string {
  return `${TOUR_SEEN_GLOBAL_KEY}.${userId}`;
}

export function hasSeenPlatformTourVideo(userId?: string): boolean {
  if (tourAutoShownInMemory) return true;
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(TOUR_SEEN_GLOBAL_KEY) === "true") return true;
    if (userId && window.localStorage.getItem(tourSeenUserKey(userId)) === "true") return true;
    if (window.sessionStorage.getItem(TOUR_SEEN_GLOBAL_KEY) === "true") return true;
  } catch {
    /* ignore storage errors */
  }
  return false;
}

export function markPlatformTourVideoSeen(userId?: string): void {
  tourAutoShownInMemory = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_SEEN_GLOBAL_KEY, "true");
    if (userId) {
      window.localStorage.setItem(tourSeenUserKey(userId), "true");
    }
    window.sessionStorage.setItem(TOUR_SEEN_GLOBAL_KEY, "true");
  } catch {
    /* ignore storage errors */
  }
}

export function openPlatformTourVideo() {
  if (typeof window === "undefined") return;
  // Opening manually also marks seen so the auto-popup will never interrupt them later.
  markPlatformTourVideoSeen();
  window.dispatchEvent(new CustomEvent(TOUR_VIDEO_EVENT));
}

export function PlatformTourVideoModal({
  open,
  onOpenChange,
  onDismiss,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  userId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  const persistSeen = useCallback(() => {
    markPlatformTourVideoSeen(userId);
    onDismiss?.();
  }, [onDismiss, userId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!open) {
      el.pause();
      setIsPaused(true);
      return;
    }
    // The moment the modal opens (whether auto or manual), record it as seen
    // so navigating, refreshing, or closing never causes it to pop up again.
    markPlatformTourVideoSeen(userId);
    if (el.ended) {
      el.currentTime = 0;
      setCurrentTime(0);
    }

    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => setIsPaused(false))
        .catch(() => {
          // Browser blocked unmuted autoplay; keep crisp poster + Play overlay visible.
          setIsPaused(true);
        });
    }
  }, [open, userId]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        persistSeen();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, persistSeen],
  );

  const handlePlayClick = () => {
    persistSeen();
    const el = videoRef.current;
    if (!el) return;
    void el.play().then(() => setIsPaused(false)).catch(() => {});
  };

  const jumpToChapter = (seconds: number) => {
    persistSeen();
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
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-4xl max-h-[94dvh] flex flex-col p-0 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden text-left">
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
              onPlay={() => {
                setIsPaused(false);
                persistSeen();
              }}
              onPause={() => setIsPaused(true)}
              onEnded={() => {
                // Once they finish watching the video once, reset cleanly and close.
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
                setCurrentTime(0);
                setIsPaused(true);
                handleClose(false);
              }}
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
            Replay anytime from the <strong className="text-foreground">Watch Platform Tour</strong> button, the top bar Play button, or{" "}
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
 * - Automatically shows the platform tour video AT MOST ONCE per user/browser
 *   (after PrivacyConsent and OnboardingTutorial finish so dialogs never collide).
 * - Persists seen state immediately when shown, played, clicked, or finished, so it
 *   never keeps popping up across refreshes, route changes, or future sessions.
 * - Also listens for `openPlatformTourVideo()` for intentional manual replays.
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
    markPlatformTourVideoSeen(userId);
  }, [userId]);

  useEffect(() => {
    const onOpenRequest = () => {
      markPlatformTourVideoSeen(userId);
      setOpen(true);
    };
    window.addEventListener(TOUR_VIDEO_EVENT, onOpenRequest);
    return () => window.removeEventListener(TOUR_VIDEO_EVENT, onOpenRequest);
  }, [userId]);

  useEffect(() => {
    if (!canAutoShow || autoEvaluatedRef.current) return;
    autoEvaluatedRef.current = true;
    if (hasSeenPlatformTourVideo(userId)) return;

    const timer = window.setTimeout(() => {
      if (hasSeenPlatformTourVideo(userId)) return;
      // Mark permanently seen immediately on pop-out so any click, navigation, or refresh dismisses it for good.
      markPlatformTourVideoSeen(userId);
      setOpen(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [canAutoShow, userId]);

  return (
    <PlatformTourVideoModal
      open={open}
      onOpenChange={setOpen}
      onDismiss={markSeen}
      userId={userId}
    />
  );
}
