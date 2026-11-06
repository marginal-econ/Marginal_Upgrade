import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { FEATURE_TUTORIALS, matchTutorialByPath, type FeatureTutorial } from "@/lib/tutorials-data";

const STORAGE_KEY_SEEN = "marginal_seen_tutorials_v2";
const STORAGE_KEY_AUTO_DISABLED = "marginal_auto_tutorials_disabled";

interface TutorialContextType {
  isOpen: boolean;
  activeTutorial: FeatureTutorial | null;
  activeStep: number;
  viewMode: "walkthrough" | "directory";
  seenTutorials: Record<string, boolean>;
  autoTutorialsEnabled: boolean;
  openTutorial: (tutorialId?: string, step?: number) => void;
  closeTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setViewMode: (mode: "walkthrough" | "directory") => void;
  completeCurrentTutorial: () => void;
  markTutorialSeen: (tutorialId: string) => void;
  resetSeenStatus: (tutorialId?: string) => void;
  toggleAutoTutorials: (enabled: boolean) => void;
  isFeatureSeen: (tutorialId: string) => boolean;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

function loadSeenTutorials(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEEN);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function loadAutoTutorialsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_DISABLED);
    return val !== "true";
  } catch {
    return true;
  }
}

export function FeatureTutorialProvider({
  children,
  canAutoTrigger = true,
}: {
  children: React.ReactNode;
  canAutoTrigger?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState<"walkthrough" | "directory">("walkthrough");
  const [seenTutorials, setSeenTutorials] = useState<Record<string, boolean>>({});
  const [autoTutorialsEnabled, setAutoTutorialsEnabled] = useState(true);

  // Keep a session-level set of checked routes to prevent any duplicate prompts or stuttering
  const checkedRoutesInSession = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Router pathname tracking
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  // Initialize from localStorage on client mount
  useEffect(() => {
    setSeenTutorials(loadSeenTutorials());
    setAutoTutorialsEnabled(loadAutoTutorialsEnabled());
  }, []);

  const activeTutorial = FEATURE_TUTORIALS.find((t) => t.id === activeTutorialId) || null;

  const markTutorialSeen = useCallback((tutorialId: string) => {
    setSeenTutorials((prev) => {
      const updated = { ...prev, [tutorialId]: true };
      try {
        localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save seen tutorial state:", err);
      }
      return updated;
    });
  }, []);

  const completeCurrentTutorial = useCallback(() => {
    if (activeTutorialId) {
      markTutorialSeen(activeTutorialId);
    }
    setIsOpen(false);
  }, [activeTutorialId, markTutorialSeen]);

  const closeTutorial = useCallback(() => {
    // When closing, also mark this feature's tutorial as seen so it will never repeat automatically!
    if (activeTutorialId) {
      markTutorialSeen(activeTutorialId);
    }
    setIsOpen(false);
  }, [activeTutorialId, markTutorialSeen]);

  const openTutorial = useCallback(
    (tutorialId?: string, step: number = 0) => {
      let targetId = tutorialId;
      if (!targetId) {
        const currentMatch = matchTutorialByPath(pathname);
        targetId = currentMatch ? currentMatch.id : "dashboard";
      }

      setActiveTutorialId(targetId);
      setActiveStep(step);
      setViewMode("walkthrough");
      setIsOpen(true);
    },
    [pathname],
  );

  const nextStep = useCallback(() => {
    if (!activeTutorial) return;
    if (activeStep < activeTutorial.steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      completeCurrentTutorial();
    }
  }, [activeStep, activeTutorial, completeCurrentTutorial]);

  const prevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep]);

  const goToStep = useCallback((step: number) => {
    setActiveStep(step);
  }, []);

  const resetSeenStatus = useCallback((tutorialId?: string) => {
    if (tutorialId) {
      setSeenTutorials((prev) => {
        const next = { ...prev };
        delete next[tutorialId];
        try {
          localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(next));
        } catch {}
        return next;
      });
    } else {
      setSeenTutorials({});
      try {
        localStorage.removeItem(STORAGE_KEY_SEEN);
      } catch {}
    }
  }, []);

  const toggleAutoTutorials = useCallback((enabled: boolean) => {
    setAutoTutorialsEnabled(enabled);
    try {
      if (enabled) {
        localStorage.removeItem(STORAGE_KEY_AUTO_DISABLED);
      } else {
        localStorage.setItem(STORAGE_KEY_AUTO_DISABLED, "true");
      }
    } catch {}
  }, []);

  const isFeatureSeen = useCallback(
    (tutorialId: string) => {
      return Boolean(seenTutorials[tutorialId]);
    },
    [seenTutorials],
  );

  // Auto-trigger when a user navigates to a new feature that has not been seen yet
  useEffect(() => {
    if (!canAutoTrigger || !autoTutorialsEnabled) return;

    // Do not trigger on auth or landing pages
    if (
      pathname === "/" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/about")
    ) {
      return;
    }

    const matched = matchTutorialByPath(pathname);
    if (!matched) return;

    // Check if already seen or already evaluated in this session
    if (seenTutorials[matched.id] || checkedRoutesInSession.current.has(matched.id)) {
      return;
    }

    // Mark route as evaluated in session to prevent bounce re-triggers
    checkedRoutesInSession.current.add(matched.id);

    // Clean any prior pending timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Delay briefly so the route page renders smoothly before the helpful guide appears
    timerRef.current = setTimeout(() => {
      // Re-verify that user hasn't already marked it seen in the meantime
      const currentSeen = loadSeenTutorials();
      if (!currentSeen[matched.id]) {
        setActiveTutorialId(matched.id);
        setActiveStep(0);
        setViewMode("walkthrough");
        setIsOpen(true);
      }
    }, 600);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pathname, canAutoTrigger, autoTutorialsEnabled, seenTutorials]);

  return (
    <TutorialContext.Provider
      value={{
        isOpen,
        activeTutorial,
        activeStep,
        viewMode,
        seenTutorials,
        autoTutorialsEnabled,
        openTutorial,
        closeTutorial,
        nextStep,
        prevStep,
        goToStep,
        setViewMode,
        completeCurrentTutorial,
        markTutorialSeen,
        resetSeenStatus,
        toggleAutoTutorials,
        isFeatureSeen,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useFeatureTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    return {
      isOpen: false,
      activeTutorial: null,
      activeStep: 0,
      viewMode: "walkthrough" as const,
      seenTutorials: {},
      autoTutorialsEnabled: true,
      openTutorial: () => {},
      closeTutorial: () => {},
      nextStep: () => {},
      prevStep: () => {},
      goToStep: () => {},
      setViewMode: () => {},
      completeCurrentTutorial: () => {},
      markTutorialSeen: () => {},
      resetSeenStatus: () => {},
      toggleAutoTutorials: () => {},
      isFeatureSeen: () => false,
    };
  }
  return context;
}
