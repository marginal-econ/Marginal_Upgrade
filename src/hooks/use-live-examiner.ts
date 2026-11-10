import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkEssayWriting,
  type LiveExaminerAoClassification,
  type PredictedMark,
} from "@/lib/live-examiner.functions";
import { isDailyLimitError } from "@/lib/usage-limits";
import { segmentEssay, type RawSegment } from "@/lib/live-examiner/segment";
import { runLocalChecksOnSegment } from "@/lib/live-examiner/local-checks";
import { computeHeuristicScore } from "@/lib/live-examiner/heuristic-score";
import {
  resolveOffsetsInSentence,
  issueDedupeKey,
  mapPositionThroughChanges,
  type DocChange,
} from "@/lib/live-examiner/anchoring";
import { LiveExaminerCache } from "@/lib/live-examiner/cache";
import { LiveExaminerScheduler } from "@/lib/live-examiner/scheduler";
import type {
  ActiveAoClassification,
  ActiveIssue,
  HistoryEntry,
  LiveExaminerIssue,
} from "./use-live-examiner-check";
import type { IssueV2, SentenceSpan, ScoreEstimate } from "@/lib/live-examiner/types";
import { defaultSplitForMaxMark, TARIFF_SPLITS } from "@/lib/examiner/config";
import { cleanSuggestion, stripStars } from "@/lib/live-examiner/clean-suggestion";

export type { PredictedMark };

const TYPING_PAUSE_MS = 500;
const SENTENCE_COMPLETE_PAUSE_MS = 150;
const MIN_TEXT_LENGTH = 3;

export function useLiveExaminer(params: {
  text: string;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock: string;
  enabled: boolean;
  initialCache?: any;
}) {
  const { text, question, level, maxMark, contextBlock, enabled, initialCache } = params;
  const checkFn = useServerFn(checkEssayWriting);

  // Document version and change history for rebasing
  const docVersionRef = useRef(1);
  const docChangesRef = useRef<DocChange[]>([]);
  const previousTextRef = useRef(text);

  // Client-side sentence cache & scheduler
  const cacheRef = useRef<LiveExaminerCache>(new LiveExaminerCache(initialCache));
  const schedulerRef = useRef<LiveExaminerScheduler>(new LiveExaminerScheduler());

  const [issues, setIssues] = useState<ActiveIssue[]>([]);
  const [classifications, setClassifications] = useState<ActiveAoClassification[]>([]);
  const [sentences, setSentences] = useState<SentenceSpan[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [predictedMark, setPredictedMark] = useState<PredictedMark | null>(null);
  const [scoreEstimate, setScoreEstimate] = useState<ScoreEstimate | null>(null);
  const [lastDelta, setLastDelta] = useState<{ text: string; time: number } | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const issuesRef = useRef<ActiveIssue[]>([]);
  issuesRef.current = issues;

  // Track doc changes and advance docVersion
  useEffect(() => {
    if (text !== previousTextRef.current) {
      docVersionRef.current += 1;
      const prev = previousTextRef.current;
      previousTextRef.current = text;

      // Calculate diff for rebase history
      let prefix = 0;
      while (prefix < prev.length && prefix < text.length && prev[prefix] === text[prefix]) {
        prefix++;
      }
      let suffix = 0;
      while (
        suffix < prev.length - prefix &&
        suffix < text.length - prefix &&
        prev[prev.length - 1 - suffix] === text[text.length - 1 - suffix]
      ) {
        suffix++;
      }

      const from = prefix;
      const to = prev.length - suffix;
      const insertedLength = text.length - prefix - suffix;

      docChangesRef.current.push({
        from,
        to,
        insertedLength,
        version: docVersionRef.current,
      });

      // Keep change history bounded
      if (docChangesRef.current.length > 50) {
        docChangesRef.current.shift();
      }
    }
  }, [text]);

  // Record history helper
  const recordHistory = useCallback((fresh: LiveExaminerIssue[]) => {
    setHistory((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      const now = Date.now();
      for (const iss of fresh) {
        const id = `${iss.category}::${iss.context.trim().toLowerCase()}::${iss.original.trim().toLowerCase()}`;
        if (!byId.has(id)) {
          byId.set(id, { ...iss, id, status: "active", firstSeenAt: now, resolvedAt: null });
        }
      }
      return Array.from(byId.values());
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Layer A: Local, synchronous, no network (< 50ms)
  // ---------------------------------------------------------------------------
  const runLayerA = useCallback(
    (currentText: string) => {
      if (!currentText || currentText.trim().length < MIN_TEXT_LENGTH) {
        setSentences([]);
        setIssues([]);
        setClassifications([]);
        setPredictedMark(null);
        setScoreEstimate(null);
        return;
      }

      const segments = segmentEssay(currentText);
      const activeIssues: ActiveIssue[] = [];
      const activeClassifications: ActiveAoClassification[] = [];
      const spans: SentenceSpan[] = [];

      for (const seg of segments) {
        // Check cache first for existing AI sentence result
        const cached = cacheRef.current.get(seg.hash);

        // Run local spell/mechanics checks
        const localIssues = runLocalChecksOnSegment(seg);
        const sentenceIssues: IssueV2[] = [...localIssues];

        let aoTag: "ao1" | "ao2" | "ao3" | "no_credit" = "no_credit";
        let aoReason = "Provisional heuristic classification";

        if (cached?.ao) {
          aoTag = cached.ao.tag;
          aoReason = cached.ao.reason;
          // Merge verified AI issues from cache
          for (const aiIss of cached.issues) {
            if (!cacheRef.current.isDismissed(seg.hash, aiIss.category, aiIss.original)) {
              sentenceIssues.push(aiIss);
            }
          }
        }

        const segWords = seg.text.trim().split(/\s+/).filter(Boolean).length;
        // Incomplete fragments or short phrases (< 5 words) earn NO AO credit until completed
        if (segWords < 5 || !seg.isComplete) {
          aoTag = "no_credit";
        }

        // Add to active issues
        for (const iss of sentenceIssues) {
          const id = `${iss.category}::${seg.text.toLowerCase()}::${iss.original.toLowerCase()}`;
          if (!cacheRef.current.isDismissed(seg.hash, iss.category, iss.original)) {
            activeIssues.push({
              id,
              original: iss.original,
              suggestion: iss.suggestion || "",
              category: iss.category as any,
              severity: iss.severity,
              explanation: iss.explanation,
              context: seg.text,
              evidence: iss.evidence,
            });
          }
        }

        if (aoTag !== "no_credit") {
          activeClassifications.push({
            id: `ao::${seg.hash}`,
            ao: aoTag === "ao1" ? "AO1" : aoTag === "ao2" ? "AO2" : "AO3",
            original: seg.text,
            context: seg.text,
            explanation: aoReason,
          });
        }

        spans.push({
          id: seg.id,
          from: seg.from,
          to: seg.to,
          text: seg.text,
          hash: seg.hash,
          paragraphIndex: seg.paragraphIndex,
          sentenceIndex: seg.sentenceIndex,
          isComplete: seg.isComplete,
          ao: {
            tag: aoTag,
            reason: aoReason,
            isProvisional: !cached,
          },
          issues: sentenceIssues,
        });
      }

      setSentences(spans);
      setIssues(activeIssues);
      setClassifications(activeClassifications);
      recordHistory(activeIssues);

      // Instant provisional score from heuristic signals + TARIFF_SPLITS
      const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
      const heuristic = computeHeuristicScore({
        sentences: segments.map((s) => ({
          text: s.text,
          paragraphIndex: s.paragraphIndex,
        })),
        question,
        maxMark: validTariff,
      });
      setScoreEstimate(heuristic);

      const split = TARIFF_SPLITS[validTariff] || defaultSplitForMaxMark(validTariff);
      setPredictedMark((prev) => {
        // Hysteresis: only update if changed
        const newTotal = heuristic.total;
        if (prev && prev.total_mark === newTotal) return prev;
        return {
          total_mark: newTotal,
          confidence: heuristic.confidence,
          headline: heuristic.band,
          ao_breakdown: {
            knowledge: { awarded: heuristic.aoBreakdown.ao1, out_of: split.ao1_marks },
            analysis: { awarded: heuristic.aoBreakdown.ao2, out_of: split.ao2_marks },
            evaluation: { awarded: heuristic.aoBreakdown.ao3, out_of: split.ao3_marks },
          },
        };
      });
    },
    [maxMark, question, recordHistory],
  );

  // ---------------------------------------------------------------------------
  // Layer B: Fast AI Pass (sentence completion or debounce pause)
  // ---------------------------------------------------------------------------
  const runLayerB = useCallback(
    async (currentText: string) => {
      if (!enabled || !currentText || currentText.trim().length < MIN_TEXT_LENGTH) return;

      const segments = segmentEssay(currentText);
      const dirtySegments = segments.filter((s) => s.isComplete && !cacheRef.current.has(s.hash));

      if (dirtySegments.length === 0) return;

      setChecking(true);
      setError(null);

      try {
        const sentencesToSend = dirtySegments.slice(0, 6).map((s) => ({
          id: s.id,
          text: s.text,
          start: s.from,
          end: s.to,
          hash: s.hash,
        }));

        const result = await checkFn({
          data: {
            essayText: currentText,
            question,
            level,
            maxMark,
            contextBlock,
          },
        });

        // Store classifications and issues into cache for each sentence
        for (const seg of dirtySegments) {
          const matchedAo = (result.classifications || []).find(
            (c: any) => c.original?.trim().toLowerCase() === seg.text.trim().toLowerCase(),
          );
          const matchedIssues = (result.issues || [])
            .filter((i: any) => i.context?.trim().toLowerCase() === seg.text.trim().toLowerCase())
            .map((i: any) => ({
              id: `${i.category}::${seg.hash}::${stripStars(i.original)}`,
              from: seg.from,
              to: seg.to,
              sentenceId: seg.id,
              category: i.category,
              severity: i.severity || "medium",
              original: stripStars(i.original),
              suggestion: cleanSuggestion(stripStars(i.suggestion)),
              insertAfter: i.insertAfter ? cleanSuggestion(stripStars(i.insertAfter)) : undefined,
              explanation: stripStars(i.explanation),
              evidence: stripStars(i.evidence),
              aoImpact: stripStars(i.aoImpact),
              status: "active" as const,
            }));

          cacheRef.current.set(seg.hash, {
            sentenceHash: seg.hash,
            ao: matchedAo
              ? {
                  tag: (matchedAo.ao.toLowerCase() as any) || "ao1",
                  reason: stripStars(matchedAo.explanation),
                }
              : null,
            issues: matchedIssues,
          });
        }

        // Re-run Layer A with fresh cache populated
        runLayerA(currentText);
        setLastUpdatedAt(Date.now());
      } catch (err: any) {
        if (isDailyLimitError(err)) {
          setError("Daily check limit reached. Instant local checks remain active.");
        } else {
          setError(err?.message || "AI check paused: retrying");
        }
      } finally {
        setChecking(false);
      }
    },
    [checkFn, contextBlock, enabled, level, maxMark, question, runLayerA],
  );

  // Trigger cadence
  useEffect(() => {
    // Synchronous immediate Layer A update (<50ms)
    runLayerA(text);

    // Schedule Layer B debounced check
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const endsComplete = /[.!?]['"’”\)\]]*\s*$/.test(text);
    const delay = endsComplete ? SENTENCE_COMPLETE_PAUSE_MS : TYPING_PAUSE_MS;

    debounceTimerRef.current = setTimeout(() => {
      runLayerB(text);
    }, delay);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [text, runLayerA, runLayerB]);

  // Actions
  const acceptIssue = useCallback((id: string, currentText: string): string => {
    const target = issuesRef.current.find((iss) => iss.id === id);
    if (!target || !target.suggestion) return currentText;

    const from = currentText.indexOf(target.original);
    if (from === -1) return currentText;

    const nextText =
      currentText.slice(0, from) + target.suggestion + currentText.slice(from + target.original.length);

    setIssues((prev) => prev.filter((i) => i.id !== id));
    setHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "accepted", resolvedAt: Date.now() } : e)),
    );
    return nextText;
  }, []);

  const acceptAllIssues = useCallback(
    (currentText: string): string => {
      let working = currentText;
      for (const iss of [...issuesRef.current]) {
        working = acceptIssue(iss.id, working);
      }
      return working;
    },
    [acceptIssue],
  );

  const acceptAllMechanical = useCallback(
    (currentText: string): string => {
      let working = currentText;
      const mechanical = issuesRef.current.filter((i) =>
        ["spelling", "grammar", "punctuation"].includes(i.category),
      );
      for (const iss of mechanical) {
        working = acceptIssue(iss.id, working);
      }
      return working;
    },
    [acceptIssue],
  );

  const dismissIssue = useCallback((id: string) => {
    setIssues((prev) => {
      const hit = prev.find((i) => i.id === id);
      if (hit) {
        cacheRef.current.dismiss("", hit.category, hit.original);
      }
      return prev.filter((i) => i.id !== id);
    });
    setHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "dismissed", resolvedAt: Date.now() } : e)),
    );
  }, []);

  const rescan = useCallback(
    (currentText: string) => {
      cacheRef.current.clear();
      runLayerA(currentText);
      runLayerB(currentText);
    },
    [runLayerA, runLayerB],
  );

  const clearAll = useCallback(() => {
    setIssues([]);
  }, []);

  return {
    issues,
    classifications,
    sentences,
    history,
    checking,
    pending,
    error,
    predictedMark,
    scoreEstimate,
    lastUpdatedAt,
    lastDelta,
    acceptIssue,
    acceptAllIssues,
    acceptAllMechanical,
    dismissIssue,
    rescan,
    clearAll,
    cache: cacheRef.current,
  };
}
