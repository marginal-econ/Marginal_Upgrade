import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkEssayWriting,
  type LiveExaminerAoClassification,
  type PredictedMark,
} from "@/lib/live-examiner.functions";
import { isDailyLimitError } from "@/lib/usage-limits";
import { buildQuestionRubric } from "@/lib/live-examiner/rubric-retrieval";
import { evaluateParagraphSemantics } from "@/lib/live-examiner/semantic-engine";
import { buildMarkLedger } from "@/lib/live-examiner/mark-ledger";
import { generateFeedbackAndOpportunities } from "@/lib/live-examiner/score-maximizer";
import type { QuestionRubric, MarkLedgerEntry, ScoreMaximizerOpportunity, EconomicArgument } from "@/lib/live-examiner/types";
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

const TYPING_PAUSE_MS = 650;
const SENTENCE_COMPLETE_PAUSE_MS = 250;
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

  // Live Examiner 2.0 Intelligence State
  const [rubric, setRubric] = useState<QuestionRubric | null>(null);
  const [ledger, setLedger] = useState<MarkLedgerEntry[]>([]);
  const [argumentsList, setArgumentsList] = useState<EconomicArgument[]>([]);
  const [opportunities, setOpportunities] = useState<ScoreMaximizerOpportunity[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<"provisional" | "verified" | "uncertain" | "complete">("uncertain");
  const [markRange, setMarkRange] = useState<[number, number] | undefined>(undefined);

  const lastCheckedTextRef = useRef<string>("");
  const lastVerifiedResultRef = useRef<any>(null);

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
    (currentText: string, verifiedResult?: any) => {
      if (!currentText || currentText.trim().length < MIN_TEXT_LENGTH) {
        setSentences([]);
        setIssues([]);
        setClassifications([]);
        setPredictedMark(null);
        setScoreEstimate(null);
        return;
      }

      const segments = segmentEssay(currentText);

      // 1. Live Examiner 2.0: Instant Rubric & Evidence Ledger
      const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
      const localRubric = buildQuestionRubric({
        question,
        level,
        maxMark: validTariff,
        contextBlock,
      });
      setRubric(localRubric);

      const sentenceObjects = segments.map((s) => ({
        id: s.id,
        text: s.text,
        paragraphIndex: s.paragraphIndex,
        sentenceIndex: s.sentenceIndex,
        isComplete: s.isComplete,
      }));

      const semanticClassifications = evaluateParagraphSemantics({
        sentences: sentenceObjects,
        paragraphText: currentText,
        docVersion: docVersionRef.current,
        rubric: localRubric,
      });

      const localLedgerResult = buildMarkLedger({
        sentences: sentenceObjects,
        classifications: semanticClassifications,
        rubric: localRubric,
        isAiVerified: false,
      });

      setLedger(localLedgerResult.ledger);
      setArgumentsList(localLedgerResult.arguments);
      setMarkRange(localLedgerResult.markRange);
      setAssessmentStatus(localLedgerResult.status);

      const localWords = currentText.trim().split(/\s+/).filter(Boolean).length;
      const localFeedback = generateFeedbackAndOpportunities({
        ledger: localLedgerResult.ledger,
        rubric: localRubric,
        aoBreakdown: localLedgerResult.aoBreakdown,
        totalWords: localWords,
      });
      setOpportunities(localFeedback.opportunities);
      setStrengths(localFeedback.strengths);
      setAreasForImprovement(localFeedback.areasForImprovement);

      // 2. Build Spans, Issues, and Visual Classifications with Semantic Awareness
      const activeIssues: ActiveIssue[] = [];
      const activeClassifications: ActiveAoClassification[] = [];
      const spans: SentenceSpan[] = [];

      const activeVerified = verifiedResult || lastVerifiedResultRef.current;
      const isZeroMarkDraft =
        (activeVerified?.predictedMark && activeVerified.predictedMark.total_mark === 0) ||
        (localLedgerResult.totalMark === 0 && localWords >= 20 && localLedgerResult.arguments.length === 0);

      for (const seg of segments) {
        const cached = cacheRef.current.get(seg.hash);
        const localIssues = runLocalChecksOnSegment(seg);
        const sentenceIssues: IssueV2[] = [...localIssues];

        let aoTag: "ao1" | "ao2" | "ao3" | "no_credit" = "no_credit";
        let aoReason = "Provisional heuristic classification";

        const semantic = semanticClassifications.find((sc) => sc.sentenceId === seg.id);

        if (cached !== undefined) {
          if (cached.ao && !isZeroMarkDraft) {
            aoTag = cached.ao.tag;
            aoReason = cached.ao.reason;
          } else {
            aoTag = "no_credit";
            aoReason = isZeroMarkDraft
              ? "Cambridge examiner evaluated: off-topic / zero marks for this prompt."
              : "Cambridge examiner evaluated: not creditworthy for this question.";
          }
          for (const aiIss of cached.issues) {
            if (!cacheRef.current.isDismissed(seg.hash, aiIss.category, aiIss.original)) {
              sentenceIssues.push(aiIss);
            }
          }
        } else if (!isZeroMarkDraft && semantic && semantic.primaryAO !== "NO_CREDIT" && semantic.primaryAO !== "UNCERTAIN") {
          aoTag = semantic.primaryAO.toLowerCase() as "ao1" | "ao2" | "ao3";
          aoReason = semantic.economicFunction || `${semantic.primaryAO} conceptual foundation.`;
        }

        // Always incorporate issues discovered by semantic intelligence (misconceptions, off-topic, superficial application)
        if (semantic?.issues && semantic.issues.length > 0) {
          for (const sIss of semantic.issues) {
            if (!cacheRef.current.isDismissed(seg.hash, sIss.category, sIss.original)) {
              if (!sentenceIssues.some((si) => si.id === sIss.id || (si.category === sIss.category && si.original === sIss.original))) {
                sentenceIssues.push({
                  ...sIss,
                  from: sIss.from !== undefined ? seg.from + sIss.from : seg.from,
                  to: sIss.to !== undefined ? seg.from + sIss.to : seg.to,
                });
              }
            }
          }
        }

        const segWords = seg.text.trim().split(/\s+/).filter(Boolean).length;
        if (segWords < 4 || !seg.isComplete || isZeroMarkDraft) {
          aoTag = "no_credit";
        }

        for (const iss of sentenceIssues) {
          const id = `${iss.category}::${seg.text.toLowerCase()}::${iss.original.toLowerCase()}`;
          if (!cacheRef.current.isDismissed(seg.hash, iss.category, iss.original)) {
            const origIdx = iss.original ? seg.text.toLowerCase().indexOf(iss.original.toLowerCase()) : -1;
            const from = origIdx !== -1 ? seg.from + origIdx : (typeof iss.from === "number" && iss.from >= seg.from && iss.from <= seg.to ? iss.from : seg.from);
            const to = origIdx !== -1 ? from + iss.original.length : (typeof iss.to === "number" && iss.to >= from && iss.to <= seg.to ? iss.to : seg.to);

            activeIssues.push({
              id,
              from,
              to,
              sentenceId: seg.id,
              original: iss.original,
              suggestion: iss.suggestion || "",
              category: iss.category as any,
              severity: iss.severity || "medium",
              explanation: iss.explanation,
              context: seg.text,
              evidence: iss.evidence,
              aoImpact: iss.aoImpact,
              status: "active",
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

      // Cap and deduplicate active issues to maximum 5 non-repeating items
      const MAX_ACTIVE_ISSUES = 5;
      const seenOriginals = new Set<string>();
      const seenSuggestions = new Set<string>();
      const seenExplanations = new Set<string>();
      const dedupedActiveIssues: ActiveIssue[] = [];

      const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sortedCandidates = [...activeIssues].sort(
        (a, b) => (severityRank[a.severity] ?? 1) - (severityRank[b.severity] ?? 1),
      );

      for (const iss of sortedCandidates) {
        const origNorm = (iss.original || "").trim().toLowerCase();
        const suggNorm = (iss.suggestion || "").trim().toLowerCase();
        const explNorm = (iss.explanation || "").trim().toLowerCase().slice(0, 50);

        if (origNorm && seenOriginals.has(`${iss.category}::${origNorm}`)) continue;
        if (suggNorm && seenSuggestions.has(`${iss.category}::${suggNorm}`)) continue;
        if (explNorm && seenExplanations.has(explNorm)) continue;

        // Prevent overlapping underlines in the same sentence
        const overlaps = dedupedActiveIssues.some(
          (existing) =>
            existing.sentenceId === iss.sentenceId &&
            Math.max(existing.from, iss.from) < Math.min(existing.to, iss.to),
        );
        if (overlaps) continue;

        if (origNorm) seenOriginals.add(`${iss.category}::${origNorm}`);
        if (suggNorm) seenSuggestions.add(`${iss.category}::${suggNorm}`);
        if (explNorm) seenExplanations.add(explNorm);

        dedupedActiveIssues.push(iss);
        if (dedupedActiveIssues.length >= MAX_ACTIVE_ISSUES) break;
      }

      setSentences(spans);
      setIssues(dedupedActiveIssues);
      setClassifications(activeClassifications);
      recordHistory(dedupedActiveIssues);

      const split = TARIFF_SPLITS[validTariff] || defaultSplitForMaxMark(validTariff);

      if (activeVerified?.predictedMark) {
        const pm = activeVerified.predictedMark;
        const score: ScoreEstimate = {
          total: pm.total_mark,
          maxMark: validTariff,
          band: pm.headline,
          confidence: pm.confidence,
          aoBreakdown: {
            ao1: pm.ao_breakdown.knowledge.awarded,
            ao2: pm.ao_breakdown.analysis.awarded,
            ao3: pm.ao_breakdown.evaluation.awarded,
          },
          nextMoves: (activeVerified.opportunities && activeVerified.opportunities.length > 0)
            ? activeVerified.opportunities.map((o: any) => ({
                id: o.id,
                aoTarget: o.aoTarget,
                title: o.title,
                detail: (o.whyItMatters ? o.whyItMatters + " " : "") + (o.suggestedAction || ""),
                potentialGain: o.potentialGain || 1,
              }))
            : localFeedback.opportunities.map((o) => ({
                id: o.id,
                aoTarget: o.aoTarget,
                title: o.title,
                detail: o.whyItMatters + " " + o.suggestedAction,
                potentialGain: o.potentialGain,
              })),
          isProvisional: false,
          timestamp: Date.now(),
        };
        setScoreEstimate(score);
        setPredictedMark(pm);
        setAssessmentStatus("verified");
        if (activeVerified.markRange) setMarkRange(activeVerified.markRange);
      } else {
        // 3. Instant provisional score from heuristic signals + TARIFF_SPLITS
        const heuristic = computeHeuristicScore({
          sentences: segments.map((s) => ({
            text: s.text,
            paragraphIndex: s.paragraphIndex,
          })),
          question,
          maxMark: validTariff,
        });
        heuristic.total = localLedgerResult.totalMark;
        heuristic.aoBreakdown = {
          ao1: localLedgerResult.aoBreakdown.ao1.awarded,
          ao2: localLedgerResult.aoBreakdown.ao2.awarded,
          ao3: localLedgerResult.aoBreakdown.ao3.awarded,
        };
        if (localFeedback.opportunities.length > 0) {
          heuristic.nextMoves = localFeedback.opportunities.map((o) => ({
            id: o.id,
            aoTarget: o.aoTarget,
            title: o.title,
            detail: o.whyItMatters + " " + o.suggestedAction,
            potentialGain: o.potentialGain,
          }));
        }
        setScoreEstimate(heuristic);

        setPredictedMark((prev) => {
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
      }
    },
    [level, maxMark, question, contextBlock, recordHistory],
  );

  // ---------------------------------------------------------------------------
  // Layer B: Fast AI Pass (sentence completion or debounce pause)
  // ---------------------------------------------------------------------------
  const runLayerB = useCallback(
    async (currentText: string) => {
      if (!enabled || !currentText || currentText.trim().length < MIN_TEXT_LENGTH) return;

      const trimmed = currentText.trim();
      if (trimmed === lastCheckedTextRef.current.trim()) return;

      setChecking(true);
      setError(null);

      try {
        const result = await checkFn({
          data: {
            essayText: currentText,
            question,
            level,
            maxMark,
            contextBlock: contextBlock || "",
          },
        });

        lastCheckedTextRef.current = trimmed;
        lastVerifiedResultRef.current = result;

        const segments = segmentEssay(currentText);

        // If the AI gave 0 total marks or marked the response off-topic, NEVER cache an AO tag!
        const isAiOffTopic = result?.predictedMark && result.predictedMark.total_mark === 0;

        // Store classifications and issues into cache for each sentence
        for (const seg of segments) {
          const segTextClean = seg.text.trim().toLowerCase();
          const matchedAo = (result.classifications || []).find((c: any) => {
            const orig = (c.original || "").trim().toLowerCase();
            const ctx = (c.context || "").trim().toLowerCase();
            return (
              orig === segTextClean ||
              ctx === segTextClean ||
              (orig.length > 5 && segTextClean.includes(orig)) ||
              (segTextClean.length > 5 && orig.includes(segTextClean))
            );
          });
          const matchedIssues = (result.issues || [])
            .filter((i: any) => {
              const ctx = (i.context || "").trim().toLowerCase();
              const orig = (i.original || "").trim().toLowerCase();
              return ctx === segTextClean || orig === segTextClean || segTextClean.includes(orig) || ctx.includes(segTextClean);
            })
            .map((i: any) => {
              const cleanOrig = stripStars(i.original);
              const origIdx = cleanOrig ? seg.text.toLowerCase().indexOf(cleanOrig.toLowerCase()) : -1;
              const issueFrom = origIdx !== -1 ? seg.from + origIdx : seg.from;
              const issueTo = origIdx !== -1 ? issueFrom + cleanOrig.length : seg.to;

              return {
                id: `${i.category}::${seg.hash}::${cleanOrig}`,
                from: issueFrom,
                to: issueTo,
                sentenceId: seg.id,
                category: i.category,
                severity: i.severity || "medium",
                original: cleanOrig,
                suggestion: cleanSuggestion(stripStars(i.suggestion)),
                insertAfter: i.insertAfter ? cleanSuggestion(stripStars(i.insertAfter)) : undefined,
                explanation: stripStars(i.explanation),
                evidence: stripStars(i.evidence),
                aoImpact: stripStars(i.aoImpact),
                status: "active" as const,
              };
            });

          cacheRef.current.set(seg.hash, {
            sentenceHash: seg.hash,
            ao: matchedAo && !isAiOffTopic
              ? {
                  tag: (matchedAo.ao.toLowerCase() as any) || "ao1",
                  reason: stripStars(matchedAo.explanation),
                }
              : null,
            issues: matchedIssues,
          });
        }

        if (result && (result as any).ledger) {
          const res = result as any;
          if (res.ledger) setLedger(res.ledger);
          if (res.arguments) setArgumentsList(res.arguments);
          if (res.opportunities) setOpportunities(res.opportunities);
          if (res.strengths) setStrengths(res.strengths);
          if (res.areasForImprovement) setAreasForImprovement(res.areasForImprovement);
          if (res.markRange) setMarkRange(res.markRange);
          if (res.status) setAssessmentStatus(res.status);
        }

        if (result?.predictedMark) {
          setPredictedMark(result.predictedMark);
          setAssessmentStatus("verified");
          setMarkRange(result.markRange || [
            Math.max(0, result.predictedMark.total_mark - (result.predictedMark.total_mark === 0 ? 0 : 1)),
            Math.min(maxMark, result.predictedMark.total_mark + (result.predictedMark.total_mark === 0 ? 0 : 1)),
          ]);
        }

        // Re-run Layer A with fresh cache populated
        runLayerA(currentText, result);
        setLastUpdatedAt(Date.now());
      } catch (err: any) {
        if (isDailyLimitError(err)) {
          setError("Daily check limit reached. Instant local checks remain active.");
        } else {
          const rawMsg = err?.message || "";
          if (rawMsg.startsWith("[") || rawMsg.includes("invalid_type")) {
            // Keep local analysis active, never show raw Zod schema dumps to user
            setError(null);
          } else {
            setError(rawMsg || "AI check paused: retrying");
          }
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
    rubric,
    ledger,
    argumentsList,
    opportunities,
    strengths,
    areasForImprovement,
    assessmentStatus,
    markRange,
  };
}
