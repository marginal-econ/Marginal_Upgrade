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
import {
  getCumulativeSuggestionBudget,
  getMaxActiveIssues,
  MAX_SESSION_SUGGESTIONS,
} from "@/lib/live-examiner/suggestion-pacing";
import type { QuestionRubricBlueprint } from "@/lib/live-examiner/delta-engine";

export type { PredictedMark };

const SINGLE_SENTENCE_DEBOUNCE_MS = 900;
const BATCH_SENTENCE_DEBOUNCE_MS = 500;
const MIN_TEXT_LENGTH = 3;
const SESSION_TOKEN_BUDGET = 18_000;
const MAX_DIRTY_BATCH = 18;
const AI_CHECK_TIMEOUT_MS = 25_000;
const MECHANICAL_CATEGORIES = new Set(["spelling", "grammar", "punctuation", "terminology", "misconception"]);

/**
 * Ensures suggestions are genuine, actionable, and substantive.
 * Discards blank suggestions, redundant edits, or hollow fragments.
 */
function isGenuineSuggestion(iss: {
  original?: string;
  suggestion?: string;
  explanation?: string;
  category?: string;
}): boolean {
  if (!iss.original || !iss.original.trim()) return false;
  if (!iss.explanation || !iss.explanation.trim()) return false;

  const orig = iss.original.trim().toLowerCase();
  const sugg = (iss.suggestion || "").trim().toLowerCase();
  const expl = iss.explanation.trim();

  // If suggestion is provided and matches original, discard
  if (sugg && orig === sugg) return false;

  // For spelling/grammar, suggestion must be distinct and non-empty
  if (iss.category === "spelling" || iss.category === "grammar") {
    if (!sugg || orig === sugg) return false;
    if (sugg.length <= 1 && orig.length > 1) return false;
  }

  // Explanation must be substantive (more than 8 characters)
  if (expl.length < 8) return false;

  return true;
}

export function useLiveExaminer(params: {
  text: string;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock: string;
  blueprint?: QuestionRubricBlueprint | null;
  enabled: boolean;
  initialCache?: any;
  tabId?: string;
  onGuardError?: (err: Error) => void;
}) {
  const { text, question, level, maxMark, contextBlock, blueprint, enabled, initialCache, tabId, onGuardError } = params;
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
  const [rubricHits, setRubricHits] = useState<{ ao1: number[]; ao2: number[]; ao3: number[] }>({
    ao1: [],
    ao2: [],
    ao3: [],
  });
  const [tokenStats, setTokenStats] = useState<{
    totalTokens: number;
    aiCalls: number;
    tokenBudget: number;
  }>({
    totalTokens: 0,
    aiCalls: 0,
    tokenBudget: SESSION_TOKEN_BUDGET,
  });

  const lastCheckedTextRef = useRef<string>("");
  const lastVerifiedResultRef = useRef<any>(null);
  const requestSeqRef = useRef<number>(0);
  const totalTokensRef = useRef<number>(0);

  // Lifetime session-level dismissals and seen suggestions (hard-capped at 10)
  const dismissedKeysRef = useRef<Set<string>>(new Set());
  const sessionSeenSuggestionsRef = useRef<Set<string>>(new Set());

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

  // Record history helper (strictly capped at progressive lifetime budget up to 18 suggestions)
  const recordHistory = useCallback(
    (fresh: (LiveExaminerIssue & { id?: string })[], maxAllowedBudget: number = MAX_SESSION_SUGGESTIONS) => {
      setHistory((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        const now = Date.now();
        for (const iss of fresh) {
          const stableKey = `${iss.category}::${(iss.original || "").trim().toLowerCase()}`;
          if (
            !sessionSeenSuggestionsRef.current.has(stableKey) &&
            sessionSeenSuggestionsRef.current.size < maxAllowedBudget
          ) {
            sessionSeenSuggestionsRef.current.add(stableKey);
            const id = iss.id || `${iss.category}-${(iss.original || "").slice(0, 15)}-${now}-${Math.random().toString(36).slice(2, 6)}`;
            byId.set(id, { ...iss, id, status: "active", firstSeenAt: now, resolvedAt: null });
          }
        }
        return Array.from(byId.values()).slice(0, MAX_SESSION_SUGGESTIONS);
      });
    },
    [],
  );

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

      // Wait until 2+ complete sentences for AI coaching suggestions,
      // while ALWAYS allowing instant 0-token in-house grammar/spelling/misconception fixes on any completed sentence!
      const completedSentenceCount = segments.filter((s) => s.isComplete).length;
      const allowEconomicsCoaching = completedSentenceCount >= 2 && localWords >= 20;

      for (const seg of segments) {
        const cached = cacheRef.current.get(seg.hash);
        // STRICT RULE: Only evaluate suggestions on completed sentences!
        const localIssues = seg.isComplete ? runLocalChecksOnSegment(seg) : [];
        const sentenceIssues: IssueV2[] = [...localIssues];

        let aoTag: "ao1" | "ao2" | "ao3" | "no_credit" = "no_credit";
        let aoSub: any = null;
        let aoReason = "Provisional heuristic classification";

        const semantic = semanticClassifications.find((sc) => sc.sentenceId === seg.id);

        if (cached !== undefined) {
          if (cached.ao && !isZeroMarkDraft) {
            aoTag = cached.ao.tag;
            aoSub = cached.ao.sub ?? null;
            aoReason = cached.ao.reason;
          } else {
            aoTag = "no_credit";
            aoReason = isZeroMarkDraft
              ? "Cambridge examiner evaluated: off-topic / zero marks for this prompt."
              : "Cambridge examiner evaluated: not creditworthy for this question.";
          }
          if (allowEconomicsCoaching && seg.isComplete) {
            for (const aiIss of cached.issues) {
              if (!cacheRef.current.isDismissed(seg.hash, aiIss.category, aiIss.original)) {
                sentenceIssues.push(aiIss);
              }
            }
          }
        } else if (!isZeroMarkDraft && semantic && semantic.primaryAO !== "NO_CREDIT" && semantic.primaryAO !== "UNCERTAIN") {
          aoTag = semantic.primaryAO.toLowerCase() as "ao1" | "ao2" | "ao3";
          aoReason = semantic.economicFunction || `${semantic.primaryAO} conceptual foundation.`;
        }

        // Misconception coherence: NEVER highlight a sentence with a deterministic economic misconception as green AO2!
        const hasFatalLocalMisconception = localIssues.some(
          (li) => (li.category === "misconception" || li.category === "economics_accuracy") && li.severity === "high",
        );
        if (hasFatalLocalMisconception) {
          aoTag = "no_credit";
          aoReason = "Contains an economic misconception — correct it to earn AO credit.";
        }

        // Always incorporate issues discovered by semantic intelligence if sentence is complete
        if (seg.isComplete && semantic?.issues && semantic.issues.length > 0) {
          for (const sIss of semantic.issues) {
            const rawSIss = sIss as any;
            const isHighPriority = sIss.severity === "high" || MECHANICAL_CATEGORIES.has(sIss.category);
            if (!isHighPriority && !allowEconomicsCoaching) continue;
            if (!cacheRef.current.isDismissed(seg.hash, sIss.category, sIss.original)) {
              if (!sentenceIssues.some((si) => si.id === rawSIss.id || (si.category === sIss.category && si.original === sIss.original))) {
                const sFrom = rawSIss.from !== undefined ? seg.from + rawSIss.from : seg.from;
                const sTo = rawSIss.to !== undefined ? seg.from + rawSIss.to : seg.to;
                sentenceIssues.push({
                  id: rawSIss.id || `${sIss.category}-${seg.id}-${sFrom}`,
                  sentenceId: seg.id,
                  category: sIss.category as any,
                  severity: sIss.severity,
                  original: sIss.original,
                  suggestion: sIss.suggestion || "",
                  explanation: sIss.explanation,
                  status: "active",
                  from: sFrom,
                  to: sTo,
                  evidence: sIss.evidence,
                  aoImpact: sIss.aoImpact,
                });
              }
            }
          }
        }

        const segWords = seg.text.trim().split(/\s+/).filter(Boolean).length;
        if (segWords < 4 || !seg.isComplete || isZeroMarkDraft) {
          aoTag = "no_credit";
        }

        // Evaluate completed-sentence suggestions (instant for in-house grammar/spelling/misconceptions; paced for AI coaching)
        if (seg.isComplete) {
          for (const iss of sentenceIssues) {
            const isMechanicalOrFatal =
              MECHANICAL_CATEGORIES.has(iss.category) || iss.severity === "high";
            if (!isMechanicalOrFatal && !allowEconomicsCoaching) {
              continue;
            }
            const origNorm = (iss.original || "").trim().toLowerCase();
            const catNorm = (iss.category || "").trim().toLowerCase();
            const id = `${catNorm}::${seg.id}::${origNorm}`;

            if (
              dismissedKeysRef.current.has(id) ||
              dismissedKeysRef.current.has(`${catNorm}::${origNorm}`) ||
              (origNorm && dismissedKeysRef.current.has(origNorm)) ||
              cacheRef.current.isDismissed(seg.hash, iss.category, iss.original)
            ) {
              continue;
            }

            if (!isGenuineSuggestion(iss)) {
              continue;
            }

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
            sub: aoSub,
            reason: aoReason,
            isProvisional: !cached,
          },
          issues: sentenceIssues,
        });
      }

      // Progressive cumulative suggestion budget and max on-screen active issues
      // Spreads the 18 suggestions across the entire essay so they don't run out in the first three lines:
      // - <= 3 sentences or < 75 words (first 3 lines): max 3 lifetime budget, max 2 on-screen
      // - <= 6 sentences or < 150 words: max 6 lifetime budget, max 3 on-screen
      // - <= 9 sentences or < 250 words: max 10 lifetime budget, max 5 on-screen
      // - <= 13 sentences or < 380 words: max 14 lifetime budget, max 5 on-screen
      // - 14+ sentences or 380+ words: max 18 lifetime budget, max 5 on-screen
      const progressBudget = getCumulativeSuggestionBudget(localWords, completedSentenceCount);
      const maxActiveIssues = getMaxActiveIssues(localWords, completedSentenceCount);

      const seenOriginals = new Set<string>();
      const seenSuggestions = new Set<string>();
      const seenExplanations = new Set<string>();
      const sentenceIssueCount = new Map<string, number>();
      const dedupedActiveIssues: ActiveIssue[] = [];

      const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sortedCandidates = [...activeIssues].sort(
        (a, b) => (severityRank[a.severity] ?? 1) - (severityRank[b.severity] ?? 1),
      );

      for (const iss of sortedCandidates) {
        const origNorm = (iss.original || "").trim().toLowerCase();
        const suggNorm = (iss.suggestion || "").trim().toLowerCase();
        const explNorm = (iss.explanation || "").trim().toLowerCase().slice(0, 50);
        const stableKey = `${iss.category}::${origNorm}`;

        // Respect progressive lifetime budget: if this is a brand new suggestion,
        // only introduce it if sessionSeenSuggestions hasn't reached current progressBudget
        const isAlreadySeenInSession = sessionSeenSuggestionsRef.current.has(stableKey);
        if (!isAlreadySeenInSession && sessionSeenSuggestionsRef.current.size >= progressBudget) {
          continue;
        }

        if (origNorm && seenOriginals.has(stableKey)) continue;
        if (suggNorm && seenSuggestions.has(`${iss.category}::${suggNorm}`)) continue;
        if (explNorm && seenExplanations.has(explNorm)) continue;

        // Spread suggestions: max 1 active suggestion per sentence to avoid clustering
        const sid = iss.sentenceId || "";
        const currentInSentence = sid ? (sentenceIssueCount.get(sid) || 0) : 0;
        if (sid && currentInSentence >= 1) continue;

        // Prevent overlapping underlines in the same sentence
        if (iss.from !== undefined && iss.to !== undefined) {
          const from = iss.from;
          const to = iss.to;
          const overlaps = dedupedActiveIssues.some(
            (existing) =>
              existing.sentenceId === iss.sentenceId &&
              existing.from !== undefined &&
              existing.to !== undefined &&
              Math.max(existing.from, from) < Math.min(existing.to, to),
          );
          if (overlaps) continue;
        }

        if (origNorm) seenOriginals.add(stableKey);
        if (suggNorm) seenSuggestions.add(`${iss.category}::${suggNorm}`);
        if (explNorm) seenExplanations.add(explNorm);
        if (sid) sentenceIssueCount.set(sid, currentInSentence + 1);

        dedupedActiveIssues.push(iss);
        if (dedupedActiveIssues.length >= maxActiveIssues) break;
      }

      setSentences(spans);
      setIssues(dedupedActiveIssues);
      setClassifications(activeClassifications);
      recordHistory(dedupedActiveIssues, progressBudget);

      const split = defaultSplitForMaxMark(validTariff, undefined, question);

      if (activeVerified?.predictedMark) {
        const pm = activeVerified.predictedMark;
        const ao1Awarded = Math.min(split.ao1_marks, Math.max(0, pm.ao_breakdown.knowledge.awarded));
        const ao2Awarded = Math.min(split.ao2_marks, Math.max(0, pm.ao_breakdown.analysis.awarded));
        const ao3Awarded = Math.min(split.ao3_marks, Math.max(0, pm.ao_breakdown.evaluation.awarded));
        // Preserve strict invariant: total === ao1 + ao2 + ao3 (never sabotaged by naive regex ledger!)
        const totalMark = Math.min(validTariff, ao1Awarded + ao2Awarded + ao3Awarded);

        const score: ScoreEstimate = {
          total: totalMark,
          maxMark: validTariff,
          band: pm.headline,
          confidence: pm.confidence,
          aoBreakdown: {
            ao1: ao1Awarded,
            ao2: ao2Awarded,
            ao3: ao3Awarded,
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
        setPredictedMark({
          ...pm,
          total_mark: totalMark,
          ao_breakdown: {
            knowledge: { awarded: ao1Awarded, out_of: split.ao1_marks },
            analysis: { awarded: ao2Awarded, out_of: split.ao2_marks },
            evaluation: { awarded: ao3Awarded, out_of: split.ao3_marks },
          },
        });
        setAssessmentStatus("verified");
        if (activeVerified.markRange) setMarkRange(activeVerified.markRange);
      } else {
        // 3. Instant provisional score from heuristic signals + exact tariff split
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
  // Layer B: Delta-Only AI Pass (ONLY on uncached, completed sentences!)
  // ---------------------------------------------------------------------------
  const runLayerB = useCallback(
    async (currentText: string, forceFull = false) => {
      if (!enabled || !currentText || currentText.trim().length < MIN_TEXT_LENGTH) return;

      const trimmed = currentText.trim();
      if (!forceFull && trimmed === lastCheckedTextRef.current.trim()) return;

      const segments = segmentEssay(currentText);
      const completeSegments = segments.filter(
        (s) =>
          s.isComplete &&
          !/^\[DIAGRAM:[^\]]*\]$/i.test(s.text.trim()) &&
          s.text.trim().split(/\s+/).filter(Boolean).length >= 4,
      );

      // Find ONLY dirty (uncached) complete sentences
      const dirtySegments = forceFull
        ? completeSegments
        : completeSegments.filter((s) => !cacheRef.current.has(s.hash));

      if (dirtySegments.length === 0) {
        setPending(false);
        return;
      }

      // Soft session token budget governor (protects cost; Layer A continues at 0 tokens)
      if (!forceFull && totalTokensRef.current >= SESSION_TOKEN_BUDGET) {
        setPending(false);
        return;
      }

      // Build ultra-compact 1-line summaries of already-verified sentences
      const dirtyHashSet = new Set(dirtySegments.map((s) => s.hash));
      const priorSummaries = completeSegments
        .filter((s) => !dirtyHashSet.has(s.hash))
        .map((s) => {
          const cached = cacheRef.current.get(s.hash);
          const tag = cached?.ao?.tag ?? "no_credit";
          const gist = (cached?.ao?.reason || s.text).slice(0, 80);
          return { ao: tag, gist };
        });

      const hasMoreBatches = dirtySegments.length > MAX_DIRTY_BATCH;
      const dirtyPayloads = dirtySegments.slice(0, MAX_DIRTY_BATCH).map((s, idx) => ({
        i: idx + 1,
        id: s.id,
        hash: s.hash,
        text: s.text,
        paragraphIndex: s.paragraphIndex,
      }));

      const mySeq = ++requestSeqRef.current;
      setChecking(true);
      setPending(false);
      setError(null);

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("AI check timed out — local checks remain active.")),
            AI_CHECK_TIMEOUT_MS,
          );
        });

        const result = await Promise.race([
          checkFn({
            data: {
              essayText: currentText,
              previousText: lastCheckedTextRef.current || undefined,
              question,
              level,
              maxMark,
              contextBlock: contextBlock || "",
              dirtySentences: dirtyPayloads,
              priorSummaries,
              blueprint: blueprint ?? undefined,
              tabId: tabId || "default",
            },
          }),
          timeoutPromise,
        ]);

        // Ignore stale out-of-order response if a newer check or restart has occurred
        if (mySeq !== requestSeqRef.current) return;

        // If the backend AI call failed, do NOT cache empty ao:null verdicts on dirty sentences
        if ((result as any)?.checkFailed) {
          setError("AI check briefly unavailable — instant local checks remain active.");
          runLayerA(currentText);
          return;
        }

        if (!hasMoreBatches) {
          lastCheckedTextRef.current = trimmed;
        }
        lastVerifiedResultRef.current = result;

        // Track session token usage
        const usage = (result as any)?.tokenUsage;
        if (usage && typeof usage.totalTokens === "number" && usage.totalTokens > 0) {
          totalTokensRef.current += usage.totalTokens;
          setTokenStats((prev) => ({
            totalTokens: totalTokensRef.current,
            aiCalls: prev.aiCalls + 1,
            tokenBudget: prev.tokenBudget,
          }));
        }

        // Monotonically merge rubric checklist hits so prior verified items don't flicker off on delta checks
        if ((result as any)?.rubricHits) {
          const nextHits = (result as any).rubricHits as { ao1?: number[]; ao2?: number[]; ao3?: number[] };
          setRubricHits((prev) => ({
            ao1: Array.from(new Set([...(forceFull ? [] : prev.ao1), ...(nextHits.ao1 ?? [])])).sort((a, b) => a - b),
            ao2: Array.from(new Set([...(forceFull ? [] : prev.ao2), ...(nextHits.ao2 ?? [])])).sort((a, b) => a - b),
            ao3: Array.from(new Set([...(forceFull ? [] : prev.ao3), ...(nextHits.ao3 ?? [])])).sort((a, b) => a - b),
          }));
        }

        const isAiOffTopic = result?.predictedMark && result.predictedMark.total_mark === 0;

        // Exact hash-indexed caching from Live Examiner 3.0 sentenceResults
        const sentenceResults = (result as any)?.sentenceResults as
          | Array<{
              sentenceId: string;
              sentenceHash: string;
              ao: "ao1" | "ao2" | "ao3" | "no_credit";
              sub?: any;
              reason: string;
              issues: any[];
            }>
          | undefined;

        if (Array.isArray(sentenceResults) && sentenceResults.length > 0) {
          const segByHash = new Map(segments.map((s) => [s.hash, s]));
          for (const sr of sentenceResults) {
            const seg = segByHash.get(sr.sentenceHash);
            if (!seg) continue;

            const mappedIssues: IssueV2[] = (sr.issues || []).map((i: any) => {
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
              ao:
                !isAiOffTopic && sr.ao !== "no_credit"
                  ? {
                      tag: sr.ao,
                      sub: sr.sub ?? null,
                      reason: stripStars(sr.reason),
                    }
                  : null,
              issues: mappedIssues,
            });
          }
        } else {
          // Legacy fallback if sentenceResults not present
          for (const seg of dirtySegments) {
            const segTextClean = seg.text.trim().toLowerCase();
            const matchedAo = (result.classifications || []).find((c: any) => {
              const orig = (c.original || "").trim().toLowerCase();
              const ctx = (c.context || "").trim().toLowerCase();
              return orig === segTextClean || ctx === segTextClean;
            });
            const matchedIssues = (result.issues || [])
              .filter((i: any) => (i.context || "").trim().toLowerCase() === segTextClean)
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
                  explanation: stripStars(i.explanation),
                  evidence: stripStars(i.evidence),
                  aoImpact: stripStars(i.aoImpact),
                  status: "active" as const,
                };
              });

            cacheRef.current.set(seg.hash, {
              sentenceHash: seg.hash,
              ao:
                matchedAo && !isAiOffTopic
                  ? {
                      tag: (matchedAo.ao.toLowerCase() as any) || "ao1",
                      reason: stripStars(matchedAo.explanation),
                    }
                  : null,
              issues: matchedIssues,
            });
          }
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
          setMarkRange(
            (result as any)?.markRange || [
              Math.max(0, result.predictedMark.total_mark - (result.predictedMark.total_mark === 0 ? 0 : 1)),
              Math.min(maxMark, result.predictedMark.total_mark + (result.predictedMark.total_mark === 0 ? 0 : 1)),
            ],
          );
        }

        // Re-run Layer A with freshly cached AI sentence verdicts
        runLayerA(currentText, result);
        setLastUpdatedAt(Date.now());

        // Seamlessly continue remaining uncached sentences for long pasted essays (>18 sentences)
        if (hasMoreBatches && mySeq === requestSeqRef.current && totalTokensRef.current < SESSION_TOKEN_BUDGET) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            if (mySeq === requestSeqRef.current) {
              runLayerB(currentText, false);
            }
          }, 150);
        }
      } catch (err: any) {
        if (mySeq !== requestSeqRef.current) return;
        if (isDailyLimitError(err)) {
          const errObj = err instanceof Error ? err : new Error(String(err));
          setError(errObj.message);
          onGuardError?.(errObj);
        } else {
          const rawMsg = err?.message || "";
          if (rawMsg.startsWith("[") || rawMsg.includes("invalid_type")) {
            setError(null);
          } else {
            setError(rawMsg || "AI check paused: retrying");
          }
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (mySeq === requestSeqRef.current) {
          setChecking(false);
        }
      }
    },
    [blueprint, checkFn, contextBlock, enabled, level, maxMark, onGuardError, question, runLayerA, tabId],
  );

  // Trigger cadence: synchronous Layer A (<15ms), smart delta-only Layer B ONLY on uncached completed sentences
  useEffect(() => {
    runLayerA(text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!enabled || !text || text.trim().length < MIN_TEXT_LENGTH) {
      setPending(false);
      return;
    }

    const segments = segmentEssay(text);
    const uncachedCompleteCount = segments.filter(
      (s) =>
        s.isComplete &&
        !cacheRef.current.has(s.hash) &&
        !/^\[DIAGRAM:[^\]]*\]$/i.test(s.text.trim()) &&
        s.text.trim().split(/\s+/).filter(Boolean).length >= 4,
    ).length;

    // Zero new complete sentences -> ZERO AI calls scheduled!
    if (uncachedCompleteCount === 0) {
      setPending(false);
      return;
    }

    setPending(true);
    const delay =
      uncachedCompleteCount >= 2 ? BATCH_SENTENCE_DEBOUNCE_MS : SINGLE_SENTENCE_DEBOUNCE_MS;

    debounceTimerRef.current = setTimeout(() => {
      runLayerB(text);
    }, delay);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [text, enabled, runLayerA, runLayerB]);

  // Actions — uses exact [from, to] offsets so accepting never corrupts an earlier occurrence!
  const acceptIssue = useCallback((id: string, currentText: string): string => {
    const target = issuesRef.current.find((iss) => iss.id === id);
    if (!target || !target.suggestion) return currentText;

    let from = -1;
    let to = -1;

    // 1. Exact UTF-16 offset match
    if (
      typeof target.from === "number" &&
      typeof target.to === "number" &&
      target.from >= 0 &&
      target.to <= currentText.length &&
      currentText.slice(target.from, target.to).toLowerCase() === target.original.toLowerCase()
    ) {
      from = target.from;
      to = target.to;
    }

    // 2. Context-scoped match
    if (from === -1 && target.context) {
      const ctxIdx = currentText.indexOf(target.context);
      if (ctxIdx !== -1) {
        const localIdx = target.context.toLowerCase().indexOf(target.original.toLowerCase());
        if (localIdx !== -1) {
          from = ctxIdx + localIdx;
          to = from + target.original.length;
        }
      }
    }

    // 3. Fallback global match
    if (from === -1) {
      const idx = currentText.indexOf(target.original);
      if (idx === -1) return currentText;
      from = idx;
      to = idx + target.original.length;
    }

    const nextText =
      currentText.slice(0, from) + target.suggestion + currentText.slice(to);

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
        const normOrig = (hit.original || "").trim().toLowerCase();
        const cat = (hit.category || "").trim().toLowerCase();
        dismissedKeysRef.current.add(id);
        dismissedKeysRef.current.add(`${cat}::${normOrig}`);
        if (normOrig) dismissedKeysRef.current.add(normOrig);
        cacheRef.current.dismiss(hit.sentenceId || "", cat, normOrig);
      }
      return prev.filter((i) => i.id !== id);
    });
    setHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "dismissed", resolvedAt: Date.now() } : e)),
    );
  }, []);

  const rescan = useCallback(
    (currentText: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      requestSeqRef.current += 1;
      cacheRef.current.clear();
      lastCheckedTextRef.current = "";
      lastVerifiedResultRef.current = null;
      setRubricHits({ ao1: [], ao2: [], ao3: [] });
      setError(null);
      runLayerA(currentText);
      runLayerB(currentText, true);
    },
    [runLayerA, runLayerB],
  );

  const resetSession = useCallback(() => {
    // Cancel any pending debounce and invalidate any in-flight AI request
    requestSeqRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    cacheRef.current.clear();
    lastCheckedTextRef.current = "";
    lastVerifiedResultRef.current = null;
    totalTokensRef.current = 0;
    dismissedKeysRef.current.clear();
    sessionSeenSuggestionsRef.current.clear();
    docChangesRef.current = [];

    setChecking(false);
    setPending(false);
    setError(null);
    setIssues([]);
    setClassifications([]);
    setSentences([]);
    setHistory([]);
    setPredictedMark(null);
    setScoreEstimate(null);
    setLastUpdatedAt(null);
    setLastDelta(null);
    setLedger([]);
    setArgumentsList([]);
    setOpportunities([]);
    setStrengths([]);
    setAreasForImprovement([]);
    setAssessmentStatus("uncertain");
    setMarkRange(undefined);
    setRubricHits({ ao1: [], ao2: [], ao3: [] });
    setTokenStats({
      totalTokens: 0,
      aiCalls: 0,
      tokenBudget: SESSION_TOKEN_BUDGET,
    });
  }, []);

  // Automatically reset hook state when switching questions or exiting an active session
  const prevQuestionRef = useRef(question);
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    const questionChanged = prevQuestionRef.current !== question;
    const exitedSession = prevEnabledRef.current && !enabled;
    prevQuestionRef.current = question;
    prevEnabledRef.current = enabled;

    if (questionChanged || exitedSession) {
      resetSession();
    }
  }, [question, enabled, resetSession]);

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
    resetSession,
    cache: cacheRef.current,
    rubric,
    rubricHits,
    tokenStats,
    ledger,
    argumentsList,
    opportunities,
    strengths,
    areasForImprovement,
    assessmentStatus,
    markRange,
  };
}
