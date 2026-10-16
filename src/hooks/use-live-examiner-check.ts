import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkEssayWriting,
  getExaminerChallenges,
  type ExaminerChallenge,
  type LiveExaminerAoClassification,
  type PredictedMark,
} from "@/lib/live-examiner.functions";
import { isDailyLimitError, DEFAULT_LIVE_EXAMINER_DURATION_MINUTES } from "@/lib/usage-limits";
import { deterministicTerminologyIssues } from "@/lib/live-examiner/economics-glossary";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";

export type { PredictedMark, ExaminerChallenge };
export { cleanSuggestion };

export type IssueCategory =
  | "grammar"
  | "clarity"
  | "economics_accuracy"
  | "analysis"
  | "application"
  | "evaluation"
  | "reasoning_chain"
  | "terminology"
  | "misconception";

export type IssueSeverity = "low" | "medium" | "high";

export type LiveExaminerIssue = {
  original: string;
  suggestion: string;
  category: IssueCategory;
  severity: IssueSeverity;
  explanation: string;
  context: string;
  /** The proof behind this suggestion — a verbatim syllabus quote for
   *  economics_accuracy, or a short concrete reason otherwise. Always
   *  shown in the UI: nothing is flagged as "wrong" without this. */
  evidence?: string;
};

export type ActiveIssue = LiveExaminerIssue & { id: string };
export type ActiveAoClassification = LiveExaminerAoClassification & { id: string };

export type HistoryEntry = LiveExaminerIssue & {
  id: string;
  status: "active" | "accepted" | "dismissed";
  firstSeenAt: number;
  resolvedAt: number | null;
};

export type LiveExaminerSessionUsage = {
  totalTokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  aiCallsCount: number;
  instantChecksCount: number;
  tokensSaved: number;
  lastLatencyMs: number;
  lastCheckType: "instant" | "ai" | "idle";
};

// Rapid adaptive cadence:
// - Instant deterministic pre-pass: fires immediately (< 25ms) in-browser (grammar, typos, definitions)
// - Sentence completion (punctuation or newline): fires in 1,200ms
// - Mid-sentence pause: 2,000ms
// - Minimum request interval: 3,500ms
// - Minimum changed characters: 16 chars
const INSTANT_LOCAL_PAUSE_MS = 25;
const TYPING_PAUSE_MS = 2000;
const SENTENCE_COMPLETE_PAUSE_MS = 1200;
const MIN_REQUEST_INTERVAL_MS = 3500;
const MIN_CHANGED_CHARS = 16;
const MIN_TEXT_LENGTH = 20;

function issueId(issue: Pick<LiveExaminerIssue, "context" | "original" | "category">): string {
  return `${issue.category}::${issue.context.trim().toLowerCase()}::${issue.original.trim().toLowerCase()}`;
}

function classificationId(
  classification: Pick<LiveExaminerAoClassification, "context" | "original" | "ao">,
): string {
  return `${classification.ao}::${classification.context.trim().toLowerCase()}::${classification.original.trim().toLowerCase()}`;
}

function changedAmount(a: string, b: string): number {
  if (a === b) return 0;
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return a.length + b.length - prefix * 2 - suffix * 2;
}

export function useLiveExaminerCheck(params: {
  text: string;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock: string;
  /** Off while there's no question set yet, or the panel is collapsed. */
  enabled: boolean;
  /** Duration limit in minutes for deep AI feedback (defaults to 45 min). Instant grammar & mechanics remain unlimited. */
  sessionDurationMinutes?: number;
  /** Timestamp when session started (from database session created_at). */
  sessionStartedAt?: number | null;
  /** When true, all AI session timers and duration limits are bypassed completely. */
  isAdmin?: boolean;
}) {
  const {
    text,
    question,
    level,
    maxMark,
    contextBlock,
    enabled,
    sessionDurationMinutes,
    sessionStartedAt,
    isAdmin = false,
  } = params;
  const check = useServerFn(checkEssayWriting);

  const durationMinutes = sessionDurationMinutes ?? DEFAULT_LIVE_EXAMINER_DURATION_MINUTES;
  const durationSeconds = durationMinutes * 60;

  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    if (sessionStartedAt && sessionStartedAt > 0) return sessionStartedAt;
    if (typeof window !== "undefined" && question) {
      const key = `marginal_session_start_${encodeURIComponent(question.toLowerCase().trim())}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
      const now = Date.now();
      localStorage.setItem(key, String(now));
      return now;
    }
    return Date.now();
  });

  useEffect(() => {
    if (sessionStartedAt && sessionStartedAt > 0) {
      setSessionStartTime(sessionStartedAt);
      if (typeof window !== "undefined" && question) {
        const key = `marginal_session_start_${encodeURIComponent(question.toLowerCase().trim())}`;
        localStorage.setItem(key, String(sessionStartedAt));
      }
    }
  }, [sessionStartedAt, question]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
    return Math.max(0, durationSeconds - elapsed);
  });

  useEffect(() => {
    if (!enabled || !question) return;
    const updateRemaining = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
      setRemainingSeconds(Math.max(0, durationSeconds - elapsed));
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [enabled, question, sessionStartTime, durationSeconds]);

  const aiCoachingExpired = isAdmin ? false : remainingSeconds <= 0;
  const mins = Math.max(0, Math.floor(remainingSeconds / 60));
  const secs = Math.max(0, remainingSeconds % 60);
  const formattedTimeRemaining = isAdmin ? "Unlimited" : `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  const [sessionUsage, setSessionUsage] = useState<LiveExaminerSessionUsage>({
    totalTokensUsed: 0,
    promptTokens: 0,
    completionTokens: 0,
    aiCallsCount: 0,
    instantChecksCount: 0,
    tokensSaved: 0,
    lastLatencyMs: 0,
    lastCheckType: "idle",
  });

  const [issues, setIssues] = useState<ActiveIssue[]>([]);
  const [classifications, setClassifications] = useState<ActiveAoClassification[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [checking, setChecking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  // Rough, live-updating estimate — see PredictedMark. Missing from a given
  // check result (e.g. a whitespace-only edit, or too little written yet)
  // means "unchanged", not "reset to zero", so this only ever moves when a
  // check actually produces a fresh number.
  const [predictedMark, setPredictedMark] = useState<PredictedMark | null>(null);

  // Socratic Examiner Challenges & Adaptive Follow-up state
  const fetchChallengesFn = useServerFn(getExaminerChallenges);
  const [challenges, setChallenges] = useState<ExaminerChallenge[]>([]);
  const [fetchingChallenges, setFetchingChallenges] = useState(false);
  const [challengeOverview, setChallengeOverview] = useState<string | null>(null);

  const lastCheckedTextRef = useRef<string>("");
  const issuesRef = useRef<ActiveIssue[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEstimatedMarkAtRef = useRef<number>(0);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastRequestAtRef = useRef(0);
  const queuedTextRef = useRef<string | null>(null);
  const latestTextRef = useRef(text);
  const isAdminRef = useRef(isAdmin);

  issuesRef.current = issues;
  historyRef.current = history;
  latestTextRef.current = text;
  isAdminRef.current = isAdmin;

  const recordHistory = useCallback((fresh: LiveExaminerIssue[]) => {
    setHistory((prev) => {
      const byId = new Map(prev.map((entry) => [entry.id, entry]));
      const now = Date.now();
      for (const issue of fresh) {
        const id = issueId(issue);
        if (byId.has(id)) continue; // already tracked (active or resolved)
        byId.set(id, { ...issue, id, status: "active", firstSeenAt: now, resolvedAt: null });
      }
      return Array.from(byId.values());
    });
  }, []);

  // Instant client-side check (< 25ms): runs in-browser immediately on typing
  // Catches spelling, grammar mechanics, and exact Cambridge terminology errors instantly.
  useEffect(() => {
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    if (!enabled || !question || text.trim().length < MIN_TEXT_LENGTH) return;

    localTimerRef.current = setTimeout(() => {
      const sentences = splitSentences(text);
      const terms = deterministicTerminologyIssues(sentences);
      const grammar = analyzeGrammarAndMechanics(sentences);
      const instantIssues: ActiveIssue[] = [
        ...terms.map((t) => ({ ...t, id: issueId(t) })),
        ...grammar.map(({ ruleId: _r, startOffset: _s, endOffset: _e, ...g }) => ({
          ...g,
          id: issueId(g),
        })),
      ];

      if (instantIssues.length > 0) {
        setSessionUsage((prev) => ({
          ...prev,
          instantChecksCount: prev.instantChecksCount + 1,
          tokensSaved: prev.tokensSaved + 1200 * instantIssues.length,
          lastLatencyMs: 15,
          lastCheckType: "instant",
        }));
        setIssues((prev) => {
          const map = new Map<string, ActiveIssue>();
          // Keep existing issues still present in text
          for (const item of prev) {
            if (text.includes(item.context)) map.set(item.id, item);
          }
          // Layer fresh instant issues
          for (const item of instantIssues) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
        recordHistory(instantIssues);
      }
    }, INSTANT_LOCAL_PAUSE_MS);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
    };
  }, [text, enabled, question, recordHistory]);

  const runCheck = useCallback(
    (currentText: string, force: boolean) => {
      queuedTextRef.current = currentText;
      const waitFor = Math.max(
        0,
        MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAtRef.current),
      );
      if (inFlightRef.current || waitFor > 0) {
        if (!inFlightRef.current) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(
            () => runCheck(queuedTextRef.current ?? currentText, force),
            waitFor,
          );
        }
        return;
      }

      queuedTextRef.current = null;
      inFlightRef.current = true;
      lastRequestAtRef.current = Date.now();
      const requestId = ++requestIdRef.current;
      const previousText = force ? undefined : lastCheckedTextRef.current || undefined;
      const previousIssues = force ? [] : issuesRef.current;

      const isSentenceOrThoughtEnd = /(?:[.!?]|\n)\s*$/.test(currentText);
      const timeSinceLastEstimate = Date.now() - lastEstimatedMarkAtRef.current;
      const shouldIncludeEstimate =
        isSentenceOrThoughtEnd || timeSinceLastEstimate > 10_000 || !predictedMark;
      if (shouldIncludeEstimate) {
        lastEstimatedMarkAtRef.current = Date.now();
      }

      const coachingExpired = !isAdminRef.current && (remainingSeconds <= 0 || aiCoachingExpired);
      if (coachingExpired) {
        // AI coaching time limit reached for this non-admin session.
        lastCheckedTextRef.current = currentText;
        setChecking(false);
        setDirty(false);
        setLastUpdatedAt(Date.now());
        return;
      }

      setChecking(true);
      setError(null);
      check({
        data: {
          essayText: currentText,
          previousText,
          previousIssues,
          question,
          level,
          maxMark,
          contextBlock,
          includePredictedMark: shouldIncludeEstimate,
          aiCoachingExpired: isAdminRef.current ? false : aiCoachingExpired,
        },
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return; // superseded
          lastCheckedTextRef.current = result.checkedText ?? currentText;
          const latestText = latestTextRef.current;

          // Always accept predicted mark if returned, otherwise preserve or compute client evaluation
          if (result.predictedMark) {
            setPredictedMark(result.predictedMark);
          }

          // Layer server issues that are valid in latest text
          const fresh = result.issues
            .filter((issue) => latestText.includes(issue.context))
            .map((issue) => ({ ...issue, id: issueId(issue) }));

          setIssues((prev) => {
            const map = new Map<string, ActiveIssue>();
            // Keep local/existing issues still valid in latestText
            for (const item of prev) {
              if (latestText.includes(item.context)) map.set(item.id, item);
            }
            // Add server issues
            for (const item of fresh) {
              map.set(item.id, item);
            }
            return Array.from(map.values());
          });

          setClassifications((previous) => {
            const currentSentenceList = splitSentences(latestText);
            const currentSentenceSet = new Set(
              currentSentenceList.map((s) => s.trim().toLowerCase()).filter((s) => s.length >= 5),
            );

            const replacedContexts = new Set(
              (result.classifiedContexts || []).map((c) => c.trim().toLowerCase()),
            );
            const surviving = (force && !result.checkFailed ? [] : previous).filter(
              (classification) => {
                const normContext = (classification.context || classification.original || "")
                  .trim()
                  .toLowerCase();
                // ONLY survive if it matches an actual current complete sentence in latestText,
                // NEVER an obsolete or truncated substring fragment from mid-keystroke typing!
                return currentSentenceSet.has(normContext) && !replacedContexts.has(normContext);
              },
            );
            const incoming = result.classifications
              .filter((c) => {
                const normContext = (c.context || c.original || "").trim().toLowerCase();
                return currentSentenceSet.has(normContext) || latestText.toLowerCase().includes(normContext);
              })
              .map((classification) => ({
                ...classification,
                id: classificationId(classification),
              }));
            return Array.from(
              new Map([...surviving, ...incoming].map((item) => [item.id, item])).values(),
            );
          });

          recordHistory(result.issues);
          setDirty(latestText !== currentText);
          setLastUpdatedAt(Date.now());
          if (result.usage) {
            setSessionUsage((prev) => ({
              totalTokensUsed: prev.totalTokensUsed + result.usage.totalTokens,
              promptTokens: prev.promptTokens + result.usage.promptTokens,
              completionTokens: prev.completionTokens + result.usage.completionTokens,
              aiCallsCount: prev.aiCallsCount + (result.usage.totalTokens > 0 ? 1 : 0),
              instantChecksCount: prev.instantChecksCount + result.usage.deterministicCount,
              tokensSaved: prev.tokensSaved + result.usage.tokensSaved,
              lastLatencyMs: result.usage.latencyMs,
              lastCheckType: result.usage.totalTokens > 0 ? "ai" : "instant",
            }));
          }
          if (result.checkFailed) {
            setError(
              "The examiner check is temporarily unavailable — showing the last known issues.",
            );
          } else {
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (requestId !== requestIdRef.current) return;
          // A daily-limit refusal is a real answer, not a network blip —
          // show the actual reason instead of promising a retry.
          setError(
            isDailyLimitError(caught)
              ? (caught as Error).message
              : "Couldn't reach the examiner check. Your writing is safe — this will retry shortly.",
          );
        })
        .finally(() => {
          inFlightRef.current = false;
          if (requestId === requestIdRef.current) setChecking(false);
          const latest = latestTextRef.current;
          if (latest && latest !== lastCheckedTextRef.current) {
            if (timerRef.current) clearTimeout(timerRef.current);
            const remaining = Math.max(
              TYPING_PAUSE_MS,
              MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAtRef.current),
            );
            timerRef.current = setTimeout(() => runCheck(latest, false), remaining);
          }
        });
    },
    [
      check,
      question,
      level,
      maxMark,
      contextBlock,
      recordHistory,
      predictedMark,
      aiCoachingExpired,
      isAdmin,
      remainingSeconds,
    ],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!enabled || !question) {
      setDirty(false);
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) {
      setIssues([]);
      setClassifications([]);
      setPredictedMark(null);
      lastCheckedTextRef.current = "";
      setDirty(false);
      return;
    }

    if (text === lastCheckedTextRef.current) {
      setDirty(false);
      return;
    }

    const completedThought = /(?:[.!?]|\n)\s*$/.test(text);
    if (!completedThought && changedAmount(text, lastCheckedTextRef.current) < MIN_CHANGED_CHARS) {
      return;
    }

    setDirty(true);
    timerRef.current = setTimeout(
      () => runCheck(text, false),
      completedThought ? SENTENCE_COMPLETE_PAUSE_MS : TYPING_PAUSE_MS,
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, question]);

  /** Apply one suggestion in place and return the corrected text for the caller to set. */
  function acceptIssue(id: string, currentText: string): string {
    const issue = issuesRef.current.find((item) => item.id === id);
    if (!issue) return currentText;

    const clean = cleanSuggestion(issue.suggestion);

    const applySub = (sourceSentence: string) => {
      const idx = sourceSentence.indexOf(issue.original);
      if (idx === -1) return sourceSentence;
      let replacement = clean;
      const nextChar = sourceSentence[idx + issue.original.length];
      if (nextChar && /[.,;:!?]/.test(nextChar) && replacement.endsWith(nextChar)) {
        replacement = replacement.slice(0, -1);
      }
      return (
        sourceSentence.slice(0, idx) +
        replacement +
        sourceSentence.slice(idx + issue.original.length)
      );
    };

    const replaceOnce = (source: string) => {
      let at = source.indexOf(issue.context);
      if (at !== -1) {
        const fixedSentence = applySub(issue.context);
        return source.slice(0, at) + fixedSentence + source.slice(at + issue.context.length);
      }
      return applySub(source);
    };

    const nextText = replaceOnce(currentText);
    lastCheckedTextRef.current = replaceOnce(lastCheckedTextRef.current);

    // Update remaining issues so their context stays synchronized with the fixed text
    setIssues((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.context === issue.context) {
            return {
              ...item,
              context: applySub(item.context),
            };
          }
          return item;
        })
        .filter((item) => nextText.includes(item.context)),
    );

    // Update classifications so their context and original stay synchronized without being dropped!
    setClassifications((prev) =>
      prev
        .map((item) => {
          if (item.context === issue.context) {
            const nextContext = applySub(item.context);
            const nextOriginal =
              item.original === item.context ? nextContext : applySub(item.original);
            return {
              ...item,
              context: nextContext,
              original: nextOriginal,
            };
          }
          return item;
        })
        .filter((item) => nextText.includes(item.context)),
    );

    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, status: "accepted", resolvedAt: Date.now() } : entry,
      ),
    );
    return nextText;
  }

  function dismissIssue(id: string) {
    setIssues((prev) => prev.filter((item) => item.id !== id));
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, status: "dismissed", resolvedAt: Date.now() } : entry,
      ),
    );
  }

  /** Force a fresh full-pass check, ignoring the diff cache. */
  function rescan(currentText: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(null);
    setDirty(false);
    runCheck(currentText, true);
  }

  function clearAll() {
    setIssues([]);
    setClassifications([]);
  }

  /** Request active Socratic examiner challenges based on the student's draft. */
  const requestChallenges = useCallback(
    async (currentText?: string) => {
      if (aiCoachingExpired) return;
      const textToCheck = (currentText ?? text).trim();
      if (textToCheck.length < 25) return;
      setFetchingChallenges(true);
      try {
        const res = await fetchChallengesFn({
          data: {
            question,
            level,
            maxMark,
            essayText: textToCheck,
            contextBlock,
          },
        });
        setChallenges(res.challenges);
        setChallengeOverview(res.overview);
      } catch {
        // Handled silently
      } finally {
        setFetchingChallenges(false);
      }
    },
    [text, question, level, maxMark, contextBlock, fetchChallengesFn, aiCoachingExpired],
  );

  const dismissChallenge = useCallback((id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const markChallengeAddressed = useCallback((id: string) => {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status: "addressed" } : c)));
  }, []);

  return {
    issues,
    classifications,
    history,
    checking,
    pending: dirty,
    error,
    predictedMark,
    lastUpdatedAt,
    challenges,
    fetchingChallenges,
    challengeOverview,
    requestChallenges,
    dismissChallenge,
    markChallengeAddressed,
    acceptIssue,
    dismissIssue,
    rescan,
    clearAll,
    // Session duration & AI limit status
    durationMinutes,
    remainingSeconds,
    aiCoachingExpired,
    formattedTimeRemaining,
    // Real-time credit, token and latency metrics
    sessionUsage,
  };
}
