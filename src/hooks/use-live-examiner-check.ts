import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkEssayWriting,
  type LiveExaminerAoClassification,
  type PredictedMark,
} from "@/lib/live-examiner.functions";
import { isDailyLimitError } from "@/lib/usage-limits";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";
import { normalizeIssueSpan } from "@/lib/live-examiner/normalize-issue-span";
import { evaluateCambridgeAnswer } from "@/lib/live-examiner/client-evaluation";

export type { PredictedMark };

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

// Adaptive cadence: instant 0ms synchronous client-side hybrid engine updates highlights,
// grammar/misconception underlines, and running marks immediately on every word, while
// background Mistral AI calibration fires rapidly on sentence completion or brief pause.
const TYPING_PAUSE_MS = 450;
const SENTENCE_COMPLETE_PAUSE_MS = 140;
const MIN_REQUEST_INTERVAL_MS = 850;
const MIN_CHANGED_CHARS = 2;
const MIN_TEXT_LENGTH = 3;

function cleanStars(str: string): string {
  if (!str) return "";
  return str.replace(/\*\*/g, "").replace(/\*/g, "").replace(/[`_]/g, "").trim();
}

function issueId(issue: Pick<LiveExaminerIssue, "context" | "original" | "category">): string {
  return `${issue.category}::${cleanStars(issue.context).toLowerCase()}::${cleanStars(issue.original).toLowerCase()}`;
}

function classificationId(
  classification: Pick<LiveExaminerAoClassification, "context" | "original" | "ao">,
): string {
  return `${classification.ao}::${cleanStars(classification.context).toLowerCase()}::${cleanStars(classification.original).toLowerCase()}`;
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
}) {
  const { text, question, level, maxMark, contextBlock, enabled } = params;
  const check = useServerFn(checkEssayWriting);

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

  const lastCheckedTextRef = useRef<string>("");
  const issuesRef = useRef<ActiveIssue[]>([]);
  const aiIssuesRef = useRef<ActiveIssue[]>([]);
  const aiClassificationsRef = useRef<Map<string, ActiveAoClassification>>(new Map());
  const resolvedIdsRef = useRef<Set<string>>(new Set());
  const lastAiMarkRef = useRef<{ mark: PredictedMark; baselineClientMark: PredictedMark } | null>(
    null,
  );
  const historyRef = useRef<HistoryEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastRequestAtRef = useRef(0);
  const queuedTextRef = useRef<string | null>(null);
  const latestTextRef = useRef(text);

  issuesRef.current = issues;
  historyRef.current = history;
  latestTextRef.current = text;

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

  /**
   * Instant 0ms client-side hybrid pass:
   * - Highlights whole sentences by AO (AO1/AO2/AO3) immediately as the user writes
   * - Flags deterministic grammar, spelling, terminology, and misconception spans immediately
   * - Updates running mark immediately, calibrated with the most recent AI mark if available
   */
  const runInstantClientPass = useCallback(
    (currentText: string) => {
      const trimmed = currentText.trim();
      if (!enabled || !question || trimmed.length < 2) {
        if (trimmed.length < 2) {
          setIssues([]);
          setClassifications([]);
          setPredictedMark(null);
          lastAiMarkRef.current = null;
        }
        return;
      }

      const clientEval = evaluateCambridgeAnswer(currentText, question, maxMark, level);

      // 1. Merge deterministic issues with surviving AI issues, excluding resolved IDs
      const detIssues: ActiveIssue[] = clientEval.issues
        .map((issue) => {
          const original = cleanStars(issue.original);
          const suggestion = cleanStars(issue.suggestion);
          const explanation = cleanStars(issue.explanation);
          const context = cleanStars(issue.context);
          const evidence = issue.evidence ? cleanStars(issue.evidence) : undefined;
          const id = issueId({ ...issue, original, context });
          return {
            ...issue,
            original,
            suggestion,
            explanation,
            context,
            evidence,
            id,
          };
        })
        .filter((issue) => !resolvedIdsRef.current.has(issue.id));

      const survivingAiIssues = aiIssuesRef.current.filter(
        (issue) =>
          !resolvedIdsRef.current.has(issue.id) &&
          currentText.includes(issue.context) &&
          issue.context.includes(issue.original),
      );

      const mergedIssuesMap = new Map<string, ActiveIssue>();
      for (const item of [...survivingAiIssues, ...detIssues]) {
        if (!mergedIssuesMap.has(item.id)) {
          mergedIssuesMap.set(item.id, item);
        }
      }
      const nextIssues = Array.from(mergedIssuesMap.values()).slice(0, 10);
      setIssues(nextIssues);
      if (detIssues.length > 0) {
        recordHistory(detIssues);
      }

      // 2. Merge deterministic whole-sentence AO classifications with settled AI classifications
      const nextClassifications: ActiveAoClassification[] = clientEval.classifications.map(
        (detCls) => {
          const aiCls = aiClassificationsRef.current.get(detCls.context.trim().toLowerCase());
          if (aiCls && currentText.includes(aiCls.context)) {
            return aiCls;
          }
          return {
            ...detCls,
            id: classificationId(detCls),
          };
        },
      );
      setClassifications(nextClassifications);

      // 3. Hybrid Running Mark: if we have an AI mark anchor, adjust smoothly by any new client delta
      if (lastAiMarkRef.current) {
        const { mark: aiMark, baselineClientMark } = lastAiMarkRef.current;
        const deltaAo1 =
          clientEval.predictedMark.ao_breakdown.knowledge.awarded -
          baselineClientMark.ao_breakdown.knowledge.awarded;
        const deltaAo2 =
          clientEval.predictedMark.ao_breakdown.analysis.awarded -
          baselineClientMark.ao_breakdown.analysis.awarded;
        const deltaAo3 =
          clientEval.predictedMark.ao_breakdown.evaluation.awarded -
          baselineClientMark.ao_breakdown.evaluation.awarded;

        if (deltaAo1 === 0 && deltaAo2 === 0 && deltaAo3 === 0) {
          setPredictedMark(aiMark);
        } else {
          const kOut = aiMark.ao_breakdown.knowledge.out_of;
          const aOut = aiMark.ao_breakdown.analysis.out_of;
          const eOut = aiMark.ao_breakdown.evaluation.out_of;
          const kAw = Math.min(
            kOut,
            Math.max(0, aiMark.ao_breakdown.knowledge.awarded + deltaAo1),
          );
          const aAw = Math.min(aOut, Math.max(0, aiMark.ao_breakdown.analysis.awarded + deltaAo2));
          const eAw = Math.min(
            eOut,
            Math.max(0, aiMark.ao_breakdown.evaluation.awarded + deltaAo3),
          );
          const total = Math.min(maxMark, kAw + aAw + eAw);
          setPredictedMark({
            total_mark: total,
            confidence: aiMark.confidence,
            headline: clientEval.predictedMark.headline,
            ao_breakdown: {
              knowledge: { awarded: kAw, out_of: kOut },
              analysis: { awarded: aAw, out_of: aOut },
              evaluation: { awarded: eAw, out_of: eOut },
            },
          });
        }
      } else {
        setPredictedMark(clientEval.predictedMark);
      }
    },
    [enabled, question, maxMark, level, recordHistory],
  );

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
        },
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return; // superseded
          lastCheckedTextRef.current = result.checkedText ?? currentText;
          // Never flash a mark or annotations for an older draft while a
          // newer edit is already waiting to be checked.
          if (latestTextRef.current !== currentText) {
            setDirty(true);
            return;
          }
          const fresh = result.issues
            .map((issue) => {
              const original = cleanStars(issue.original);
              const suggestion = cleanStars(issue.suggestion);
              const explanation = cleanStars(issue.explanation);
              const context = cleanStars(issue.context);
              const evidence = issue.evidence ? cleanStars(issue.evidence) : undefined;
              return {
                ...issue,
                original,
                suggestion,
                explanation,
                context,
                evidence,
                id: issueId({ ...issue, original, context }),
              };
            })
            .filter((issue) => !resolvedIdsRef.current.has(issue.id));

          aiIssuesRef.current = fresh;

          const clientBaseline = evaluateCambridgeAnswer(currentText, question, maxMark, level);
          const detIssues = clientBaseline.issues
            .map((issue) => {
              const original = cleanStars(issue.original);
              const suggestion = cleanStars(issue.suggestion);
              const explanation = cleanStars(issue.explanation);
              const context = cleanStars(issue.context);
              const evidence = issue.evidence ? cleanStars(issue.evidence) : undefined;
              return {
                ...issue,
                original,
                suggestion,
                explanation,
                context,
                evidence,
                id: issueId({ ...issue, original, context }),
              };
            })
            .filter((issue) => !resolvedIdsRef.current.has(issue.id));

          const combinedIssues = Array.from(
            new Map([...fresh, ...detIssues].map((item) => [item.id, item])).values(),
          ).slice(0, 10);

          setIssues(combinedIssues);

          // Store AI sentence classifications in the persistent map and merge with full-essay classifications
          for (const classification of result.classifications) {
            const original = cleanStars(classification.original);
            const context = cleanStars(classification.context);
            const explanation = cleanStars(classification.explanation);
            const activeCls: ActiveAoClassification = {
              ...classification,
              original,
              context,
              explanation,
              id: classificationId({ ...classification, original, context }),
            };
            aiClassificationsRef.current.set(context.trim().toLowerCase(), activeCls);
          }

          setClassifications(
            clientBaseline.classifications.map((detCls) => {
              const aiCls = aiClassificationsRef.current.get(detCls.context.trim().toLowerCase());
              if (aiCls && currentText.includes(aiCls.context)) {
                return aiCls;
              }
              return {
                ...detCls,
                id: classificationId(detCls),
              };
            }),
          );

          recordHistory(combinedIssues);
          setDirty(false);
          setLastUpdatedAt(Date.now());
          if (result.predictedMark) {
            const kOut = result.predictedMark.ao_breakdown.knowledge.out_of;
            const aOut = result.predictedMark.ao_breakdown.analysis.out_of;
            const eOut = result.predictedMark.ao_breakdown.evaluation.out_of;
            const hasClientCredit = clientBaseline.predictedMark.total_mark > 0;
            const kAw = hasClientCredit
              ? Math.min(
                  kOut,
                  Math.max(
                    result.predictedMark.ao_breakdown.knowledge.awarded,
                    clientBaseline.predictedMark.ao_breakdown.knowledge.awarded,
                  ),
                )
              : result.predictedMark.ao_breakdown.knowledge.awarded;
            const aAw = hasClientCredit
              ? Math.min(
                  aOut,
                  Math.max(
                    result.predictedMark.ao_breakdown.analysis.awarded,
                    clientBaseline.predictedMark.ao_breakdown.analysis.awarded,
                  ),
                )
              : result.predictedMark.ao_breakdown.analysis.awarded;
            const eAw = hasClientCredit
              ? Math.min(
                  eOut,
                  Math.max(
                    result.predictedMark.ao_breakdown.evaluation.awarded,
                    clientBaseline.predictedMark.ao_breakdown.evaluation.awarded,
                  ),
                )
              : result.predictedMark.ao_breakdown.evaluation.awarded;
            const calibratedMark: PredictedMark = {
              total_mark: Math.min(maxMark, kAw + aAw + eAw),
              confidence: result.predictedMark.confidence,
              headline:
                kAw + aAw + eAw > result.predictedMark.total_mark
                  ? clientBaseline.predictedMark.headline
                  : result.predictedMark.headline,
              ao_breakdown: {
                knowledge: { awarded: kAw, out_of: kOut },
                analysis: { awarded: aAw, out_of: aOut },
                evaluation: { awarded: eAw, out_of: eOut },
              },
            };
            lastAiMarkRef.current = {
              mark: calibratedMark,
              baselineClientMark: clientBaseline.predictedMark,
            };
            setPredictedMark(calibratedMark);
          } else {
            setPredictedMark(clientBaseline.predictedMark);
          }
          if (result.checkFailed) {
            setError(
              "The examiner check is temporarily unavailable — showing the last known issues.",
            );
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
          const nextText =
            queuedTextRef.current ||
            (latestTextRef.current !== lastCheckedTextRef.current ? latestTextRef.current : null);
          if (
            nextText &&
            nextText.trim().length >= MIN_TEXT_LENGTH &&
            nextText !== lastCheckedTextRef.current
          ) {
            if (timerRef.current) clearTimeout(timerRef.current);
            const remaining = Math.max(
              TYPING_PAUSE_MS,
              MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAtRef.current),
            );
            timerRef.current = setTimeout(() => runCheck(nextText, false), remaining);
          }
        });
    },
    [check, question, level, maxMark, contextBlock, recordHistory],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (instantTimerRef.current) clearTimeout(instantTimerRef.current);

    if (!enabled || !question) {
      setDirty(false);
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setIssues([]);
      setClassifications([]);
      setPredictedMark(null);
      lastCheckedTextRef.current = "";
      lastAiMarkRef.current = null;
      setDirty(false);
      return;
    }

    // Fire the instant client-side hybrid engine synchronously (0ms latency)
    runInstantClientPass(text);

    if (trimmed.length < MIN_TEXT_LENGTH) {
      setDirty(false);
      return;
    }

    if (text === lastCheckedTextRef.current) {
      setDirty(false);
      return;
    }

    if (changedAmount(text, lastCheckedTextRef.current) < MIN_CHANGED_CHARS) {
      return;
    }

    setDirty(true);
    const completedThought = /(?:[.!?]|\n)\s*$/.test(text);
    timerRef.current = setTimeout(
      () => runCheck(text, false),
      completedThought ? SENTENCE_COMPLETE_PAUSE_MS : TYPING_PAUSE_MS,
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, question, maxMark, level]);

  /** Apply one suggestion in place and return the corrected text for the caller to set. */
  function acceptIssue(id: string, currentText: string): string {
    const issue = issuesRef.current.find((item) => item.id === id);
    if (!issue) return currentText;

    resolvedIdsRef.current.add(id);

    const normalized = normalizeIssueSpan({
      sentence: issue.context,
      original: issue.original,
      suggestion: issue.suggestion,
      category: issue.category,
    });

    const targetOriginal = normalized ? normalized.original : issue.original;
    const cleanSug = normalized ? normalized.suggestion : cleanSuggestion(issue.suggestion);

    // Critical safeguard: Never allow a tiny 1-2 word fragment to replace a full sentence
    if (
      targetOriginal.split(/\s+/).length >= 4 &&
      cleanSug.split(/\s+/).length <= 2 &&
      ["grammar", "clarity", "terminology", "spelling"].includes(issue.category.toLowerCase())
    ) {
      return currentText;
    }

    const replaceOnce = (source: string) => {
      const at = source.indexOf(issue.context);
      if (at === -1) {
        if (targetOriginal && source.includes(targetOriginal)) {
          return source.replace(targetOriginal, cleanSug);
        }
        return source;
      }

      let fixedSentence = issue.context;
      if (/^\w+$/.test(targetOriginal)) {
        const escaped = targetOriginal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordRegex = new RegExp(`\\b${escaped}\\b`);
        if (wordRegex.test(issue.context)) {
          fixedSentence = issue.context.replace(wordRegex, cleanSug);
        } else {
          fixedSentence = issue.context.replace(targetOriginal, cleanSug);
        }
      } else {
        fixedSentence = issue.context.replace(targetOriginal, cleanSug);
      }
      return source.slice(0, at) + fixedSentence + source.slice(at + issue.context.length);
    };

    const nextText = replaceOnce(currentText);
    lastCheckedTextRef.current = replaceOnce(lastCheckedTextRef.current);
    aiIssuesRef.current = aiIssuesRef.current.filter((item) => item.id !== id);
    setIssues((prev) => prev.filter((item) => item.id !== id));
    setClassifications((prev) => prev.filter((item) => nextText.includes(item.context)));
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, status: "accepted", resolvedAt: Date.now() } : entry,
      ),
    );
    return nextText;
  }

  /** Apply all active suggestions in sequence and return the updated essay text. */
  function acceptAllIssues(currentText: string): string {
    let workingText = currentText;
    const currentList = [...issuesRef.current];
    for (const issue of currentList) {
      workingText = acceptIssue(issue.id, workingText);
    }
    return workingText;
  }

  function dismissIssue(id: string) {
    resolvedIdsRef.current.add(id);
    aiIssuesRef.current = aiIssuesRef.current.filter((item) => item.id !== id);
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
    resolvedIdsRef.current.clear();
    setDirty(false);
    runInstantClientPass(currentText);
    if (currentText.trim().length >= MIN_TEXT_LENGTH) {
      runCheck(currentText, true);
    }
  }

  /** Clear what's currently showing without touching the history log. */
  function clearAll() {
    setIssues([]);
  }

  return {
    issues,
    classifications,
    history,
    checking,
    pending: dirty,
    error,
    predictedMark,
    lastUpdatedAt,
    acceptIssue,
    acceptAllIssues,
    dismissIssue,
    rescan,
    clearAll,
  };
}
