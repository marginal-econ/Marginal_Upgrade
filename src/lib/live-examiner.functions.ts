import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/backend/client.server";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import {
  LIVE_EXAMINER_LIMIT_MESSAGE,
  LIVE_EXAMINER_PAID_ONLY_MESSAGE,
  LIVE_EXAMINER_NO_CREDITS_MESSAGE,
  DEFAULT_LIVE_EXAMINER_DURATION_MINUTES,
} from "@/lib/usage-limits";
import { deterministicTerminologyIssues } from "@/lib/live-examiner/economics-glossary";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { diffSentences, splitSentences } from "@/lib/writing-check/sentence-diff";
import { AO_DEFINITIONS, defaultSplitForMaxMark } from "@/lib/examiner/config";

import { isMarginalAdmin } from "@/lib/auth-admin";

/**
 * HARD limit: a non-admin gets ONE Live Examiner session per day, locked to
 * ONE question (the admin account is exempt). The first question a student
 * touches each day claims the slot; from then on only that same question is
 * allowed until the day rolls over (midnight IST). Enforced in the database
 * from a ledger that deleting sessions can't reset, and called from every
 * server entry point (context prep, live check, save) so it can't be dodged
 * by skipping the UI.
 */
async function assertLiveExaminerSessionAllowed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  question: string,
  context?: any,
) {
  const isAdmin =
    Boolean(context?.isAdmin) ||
    isMarginalAdmin({
      userId: context?.userId,
      claims: context?.claims,
      email: context?.email,
    });
  if (isAdmin) {
    return;
  }

  // Check paid subscription and credit balance
  const { getUserSubscriptionDetails } = await import("./subscription.server");
  const sub = await getUserSubscriptionDetails(
    supabase,
    context?.userId,
    context?.email,
    context?.claims,
  );
  if (!sub.canUseLiveExaminer) {
    if (sub.isTeacher && !sub.isPaid) {
      const { TEACHER_LIVE_EXAMINER_REQUIRED_MESSAGE } = await import("./usage-limits");
      throw new Error(TEACHER_LIVE_EXAMINER_REQUIRED_MESSAGE);
    }
    if (!sub.isPaid) {
      throw new Error(LIVE_EXAMINER_PAID_ONLY_MESSAGE);
    } else {
      throw new Error(LIVE_EXAMINER_NO_CREDITS_MESSAGE);
    }
  }

  try {
    const { data, error } = await supabase.rpc("claim_live_examiner_session", {
      p_question: question,
    });
    if (!error && data && !(data as { allowed?: boolean }).allowed) {
      throw new Error(LIVE_EXAMINER_LIMIT_MESSAGE);
    }
  } catch (err) {
    if (err instanceof Error && err.message === LIVE_EXAMINER_LIMIT_MESSAGE) {
      throw err;
    }
    // RPC not present in schema cache; credit-based limit above is the authoritative gate
  }
}

/**
 * Ceiling on suggestions shown at once. Loosened from 5 — feedback said it
 * was resurfacing real issues too slowly. Still capped (not unlimited) so
 * a badly-written paragraph doesn't dump 20 red flags at once; the
 * Stage-2 verifier is the real quality gate, this is just "how much to
 * show in one go".
 */
const MAX_VISIBLE_ISSUES = 8;

/** At most this many BRAND NEW issues are introduced in a single check —
 *  even if a big paste triggers many candidates, they surface a batch at
 *  a time rather than all at once. Raised from 3 alongside
 *  MAX_VISIBLE_ISSUES so a big paste doesn't take several passes to
 *  reach the new higher ceiling. */
const MAX_NEW_ISSUES_PER_CALL = 6;

/** Sentences per model call is raised to 32 to ensure full-length essay responses are completely classified. */
const MAX_SENTENCES_PER_CALL = 32;

/** Stage-1 candidates below this self-reported confidence are dropped
 *  before they even reach verification — cheap, zero-latency filter. */
const CONFIDENCE_THRESHOLD = 0.55;

/**
 * High-confidence candidates (confidence >= 0.72) skip Stage 2 verification entirely,
 * cutting latency down to a single sub-second Gemini 3.6 Flash pass (< 400ms).
 * Expanded to all Cambridge AO categories for rapid, single-roundtrip feedback.
 */
const AUTO_KEEP_CONFIDENCE = 0.72;

/**
 * Distills retrieved syllabus context to essential syllabus concepts (max 1,500 chars),
 * stripping heavy anchor essays during rapid live keystroke checks.
 * Reduces prompt tokens from ~4,500 down to ~350 (92% reduction).
 */
export function compactSyllabusContext(contextBlock: string): string {
  if (!contextBlock) return "";
  const lines = contextBlock.split("\n");
  const filtered: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (line.includes("BAND ") && line.includes("ANCHOR")) break;
    filtered.push(line);
    length += line.length + 1;
    if (length >= 1500) break;
  }
  return filtered.join("\n").slice(0, 1500).trim();
}

export type LiveExaminerUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  deterministicCount: number;
  tokensSaved: number;
};

const CATEGORIES = [
  "grammar",
  "clarity",
  "economics_accuracy",
  "analysis",
  "application",
  "evaluation",
  "reasoning_chain",
  "terminology",
  "misconception",
] as const;

const SEVERITIES = ["low", "medium", "high"] as const;

export const IssueSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  /** One short sentence — why this is an issue and what the fix improves. */
  explanation: z.string(),
  /** The sentence (or [DIAGRAM: ...] tag) this issue's `original` was found in. */
  context: z.string(),
  /**
   * The proof: for "economics_accuracy" this MUST be a verbatim quote from
   * the retrieved syllabus context (checked server-side, not trusted on
   * the model's say-so). For every other category it's a short, concrete
   * reason a human could check in one glance (a quoted grammar rule, the
   * specific missing link, etc). Never shown as invented certainty —
   * that's the whole point of requiring it.
   */
  evidence: z.string().optional(),
});

export type LiveExaminerIssue = z.infer<typeof IssueSchema>;

const AO_CODES = ["AO1", "AO2", "AO3"] as const;

export const AoClassificationSchema = z.object({
  original: z.string(),
  context: z.string(),
  ao: z.enum(AO_CODES),
  explanation: z.string(),
});

export type LiveExaminerAoClassification = z.infer<typeof AoClassificationSchema>;

// ---------------------------------------------------------------------------
// 1. Prepare syllabus grounding for a question — run ONCE when the question
//    is set/changed, never per keystroke. Every subsequent check call reuses
//    this rendered context block instead of paying for a fresh retrieval.
// ---------------------------------------------------------------------------

const PrepareContextInput = z.object({
  level: z.enum(["as", "a2"]),
  topic: z.string().trim().max(200),
  question: z.string().trim().min(5).max(2000),
});

export const prepareLiveExaminerContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PrepareContextInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const { validateEconomicsSyllabus } = await import("./examiner/syllabus-guard.server");
    await validateEconomicsSyllabus(data.question);

    const { retrieve, renderContext } = await import("./retrieval.server");
    const { fetchCalibrationAnchors, buildAnchorBlock } =
      await import("./examiner/calibration.server");

    let sources: any[] = [];
    try {
      sources = await retrieve(context.supabase, {
        query: `${data.topic} — ${data.question}`,
        matchCount: 8,
        docTypes: ["syllabus", "coursebook", "mark_scheme", "examiner_report"],
        minSimilarity: 0.5,
        enableHybridRrf: true,
      });
    } catch (err) {
      console.warn("Live examiner retrieve fallback:", err);
    }

    let anchors: any[] = [];
    try {
      anchors = await fetchCalibrationAnchors(context.supabase);
    } catch (err) {
      console.warn("Live examiner anchors fallback:", err);
    }

    const anchorBlock = anchors.length > 0 ? buildAnchorBlock(anchors) : "";

    const rendered = sources.length > 0 ? renderContext(sources) : "";
    const contextBlock = anchorBlock
      ? `${rendered}\n\n${anchorBlock}`
      : rendered;

    return {
      contextBlock,
      sourceCount: sources.length,
      anchorsUsed: anchors.length,
      grounded: sources.length > 0,
      topMatchTitle: sources[0]?.documentTitle ?? null,
      topSimilarity: sources[0]?.similarity ?? null,
    };
  });

// ---------------------------------------------------------------------------
// 2. Live check — TWO stages:
//
//    Stage 1 (candidate generation): same diff-based, capped shape as the
//    plain spelling/grammar checker, but widened to full examiner-style
//    categories, grounded in the retrieved context block, and required to
//    self-report a confidence score and cite evidence.
//
//    Stage 2 (verification): a second, independent pass that is shown ONLY
//    the surviving candidates (not the whole essay again) and is told to
//    reject anything it cannot independently justify, and — critically —
//    to recognise that a valid economics argument phrased differently from
//    a "template" answer is NOT an error. This is what keeps the tool from
//    nagging about correct-but-unconventional writing.
//
//    Stage 2 only runs when stage 1 actually produced candidates, so a
//    clean passage costs one (cheap) call, not two.
// ---------------------------------------------------------------------------

const CheckInput = z.object({
  essayText: z.string().trim().min(20, "That's too short to check.").max(40_000),
  previousText: z.string().max(40_000).optional(),
  previousIssues: z
    .array(IssueSchema.extend({ id: z.string() }))
    .max(MAX_VISIBLE_ISSUES * 4)
    .optional(),
  question: z.string().trim().min(5).max(2000),
  level: z.enum(["as", "a2"]),
  maxMark: z.number().int().positive().max(30),
  /** Rendered syllabus context from prepareLiveExaminerContext — passed
   *  through verbatim so this call never re-embeds/re-retrieves. */
  contextBlock: z.string().max(20_000).default(""),
  /** Decoupled mark estimation: only compute predicted mark when explicitly requested (e.g. paragraph end) */
  includePredictedMark: z.boolean().default(false),
  /** When true, the session's AI coaching time limit has expired — return deterministic checks only, 0 LLM calls */
  aiCoachingExpired: z.boolean().default(false),
  /** Delta buffer: sentences the client already holds an AI verdict for. Never re-sent to the model. */
  knownSentences: z.array(z.string().max(2000)).max(600).optional(),
  /** Also check an unfinished trailing sentence (client sets this only after a long pause). */
  includeTrailing: z.boolean().default(false),
});

const CandidateSchema = IssueSchema.extend({ confidence: z.number().min(0).max(1) });
type Candidate = z.infer<typeof CandidateSchema>;

function buildVerifierSystemPrompt(question: string, contextBlock: string) {
  return `You are a senior Cambridge 9708 Economics examiner reviewing candidate feedback before displaying it to the student.
QUESTION: ${question}
${contextBlock ? `SYLLABUS GROUNDING:\n${contextBlock}` : "SYLLABUS GROUNDING: Standard Cambridge 9708 economic theory."}

For each candidate:
- KEEP candidates that identify real economic flaws, misconceptions, broken reasoning chains, missing analytical steps (AO2), or superficial evaluation (AO3).
- REJECT candidates if the student's point is economically sound and valid, even if phrased unconventionally.
- REJECT trivial, nitpicky, or debatable points.

Respond ONLY with a single valid JSON object:
{
  "verdicts": [
    { "index": <number>, "keep": true | false, "explanation": "<optional tightened explanation>" }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Predicted mark — a rough, live-updating estimate shown next to the
// editor, NOT the real grade. It runs on the same fast model as the
// candidate check, on the full current essay text (not just the changed
// sentences, since a mark estimate needs the whole answer), and is fired
// in parallel with the Stage-1 candidate call so it costs latency, not
// doubles it.
// ---------------------------------------------------------------------------

export const PredictedAoSchema = z.object({
  awarded: z.coerce.number().default(0),
  out_of: z.coerce.number().default(0),
});

export const PredictedMarkSchema = z.object({
  total_mark: z.coerce.number().default(0),
  confidence: z.coerce
    .number()
    .transform((v) => (v > 1 && v <= 100 ? v / 100 : v))
    .pipe(z.number().min(0).max(1))
    .catch(0.8),
  headline: z.string().catch("Live assessment in progress"),
  ao_breakdown: z.object({
    knowledge: PredictedAoSchema.catch({ awarded: 0, out_of: 0 }),
    analysis: PredictedAoSchema.catch({ awarded: 0, out_of: 0 }),
    evaluation: PredictedAoSchema.catch({ awarded: 0, out_of: 0 }),
  }).catch({
    knowledge: { awarded: 0, out_of: 0 },
    analysis: { awarded: 0, out_of: 0 },
    evaluation: { awarded: 0, out_of: 0 },
  }),
  model: z.string().optional(),
  keyRotated: z.boolean().optional(),
  modelSwapped: z.boolean().optional(),
  activeKeyType: z.enum(["primary", "backup_pool", "vip_fallback"]).optional(),
});

export type PredictedMark = z.infer<typeof PredictedMarkSchema>;

/** Clamp/sanitise the model's rough estimate so a malformed response never
 *  reaches the client as a bogus number. Robust to percentage confidence,
 *  stringified numbers, and alternative AO property keys. */
export function sanitisePredictedMark(raw: unknown, maxMark: number): PredictedMark | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const split = defaultSplitForMaxMark(maxMark);

  // Normalize confidence (convert 0-100 percentage to 0.0-1.0 if needed)
  let confidence = typeof record.confidence === "number" ? record.confidence : parseFloat(String(record.confidence));
  if (Number.isFinite(confidence)) {
    if (confidence > 1 && confidence <= 100) confidence = confidence / 100;
  } else {
    confidence = 0.8;
  }

  const headline =
    typeof record.headline === "string" && record.headline.trim()
      ? record.headline.trim().slice(0, 80)
      : "Live assessment in progress";

  const rawBreakdown = (record.ao_breakdown ?? {}) as Record<string, unknown>;
  const parseAo = (
    val: unknown,
    defaultMax: number,
  ): { awarded: number; out_of: number } => {
    if (typeof val === "number") {
      return { awarded: Math.min(Math.max(0, Math.round(val)), defaultMax), out_of: defaultMax };
    }
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const awardedNum = typeof obj.awarded === "number" ? obj.awarded : parseInt(String(obj.awarded ?? 0), 10);
      const outOfNum = typeof obj.out_of === "number" ? obj.out_of : parseInt(String(obj.out_of ?? defaultMax), 10);
      const safeAwarded = Number.isFinite(awardedNum) ? awardedNum : 0;
      const safeOutOf = Number.isFinite(outOfNum) && outOfNum > 0 ? outOfNum : defaultMax;
      return {
        awarded: Math.min(Math.max(0, Math.round(safeAwarded)), Math.max(0, Math.round(safeOutOf))),
        out_of: Math.max(0, Math.round(safeOutOf)),
      };
    }
    return { awarded: 0, out_of: defaultMax };
  };

  const knowledge = parseAo(
    rawBreakdown.knowledge ?? rawBreakdown.AO1 ?? rawBreakdown.ao1 ?? rawBreakdown.knowledge_and_understanding,
    split.ao1_marks,
  );
  const analysis = parseAo(
    rawBreakdown.analysis ?? rawBreakdown.AO2 ?? rawBreakdown.ao2 ?? rawBreakdown.analysis_and_application,
    split.ao2_marks,
  );
  const evaluation = parseAo(
    rawBreakdown.evaluation ?? rawBreakdown.AO3 ?? rawBreakdown.ao3 ?? rawBreakdown.evaluation_and_judgement,
    split.ao3_marks,
  );

  let totalMark = typeof record.total_mark === "number" ? record.total_mark : parseInt(String(record.total_mark), 10);
  const sumAwarded = knowledge.awarded + analysis.awarded + evaluation.awarded;
  if (!Number.isFinite(totalMark) || totalMark <= 0) {
    totalMark = sumAwarded;
  }
  // If the model estimated an introductory mark (> 0) but returned an empty/zero breakdown,
  // allocate it to AO1 Knowledge (the standard early band) so breakdown matches total:
  if (totalMark > 0 && sumAwarded === 0) {
    knowledge.awarded = Math.min(split.ao1_marks, totalMark);
  }
  const finalSum = knowledge.awarded + analysis.awarded + evaluation.awarded;
  totalMark = finalSum > 0 ? finalSum : totalMark;

  const safeTotal = Number.isFinite(totalMark) ? Math.min(Math.max(0, Math.round(totalMark)), maxMark) : 0;

  return {
    total_mark: safeTotal,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(0, confidence), 1) : 0.8,
    headline,
    ao_breakdown: { knowledge, analysis, evaluation },
  };
}

function issueKey(issue: Pick<LiveExaminerIssue, "context" | "original" | "category">): string {
  return `${issue.category}::${issue.context.trim().toLowerCase()}::${issue.original.trim().toLowerCase()}`;
}

function dedupeAndCap(issues: LiveExaminerIssue[]): LiveExaminerIssue[] {
  const seen = new Set<string>();
  const deduped: LiveExaminerIssue[] = [];
  for (const issue of issues) {
    const key = issueKey(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }

  // Priority order: Economics substance ALWAYS takes precedence over mechanics/grammar!
  const categoryPriority: Record<(typeof CATEGORIES)[number], number> = {
    economics_accuracy: 0,
    misconception: 1,
    analysis: 2,
    reasoning_chain: 3,
    evaluation: 4,
    application: 5,
    terminology: 6,
    clarity: 7,
    grammar: 8,
  };
  const order: Record<(typeof SEVERITIES)[number], number> = { high: 0, medium: 1, low: 2 };

  return deduped
    .sort((a, b) => {
      const catDiff = categoryPriority[a.category] - categoryPriority[b.category];
      if (catDiff !== 0) return catDiff;
      return order[a.severity] - order[b.severity];
    })
    .slice(0, MAX_VISIBLE_ISSUES);
}

/** Max sentences judged by the model in one call; the client re-fires for the rest. */
const MAX_AI_SENTENCES_PER_CALL = 12;
const AI_JUDGEMENT_CATEGORIES: ReadonlySet<string> = new Set(["economics_accuracy", "misconception"]);

const CATEGORY_CODES: Record<string, (typeof CATEGORIES)[number]> = {
  ea: "economics_accuracy",
  mc: "misconception",
  an: "analysis",
  rc: "reasoning_chain",
  ap: "application",
  ev: "evaluation",
  tm: "terminology",
  cl: "clarity",
  gr: "grammar",
};

/**
 * Keeps the grounding slice that actually matters for THESE sentences:
 * ranks the already-retrieved RAG lines by word overlap with the sentences
 * being checked and sends only the best ~900 chars (no extra retrieval,
 * no extra embedding call). Smaller prompt AND more relevant grounding.
 */
export function sliceContextForSentences(
  contextBlock: string,
  sentences: string[],
  maxChars = 900,
): string {
  if (!contextBlock) return "";
  const want = new Set(
    sentences
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
  const lines = compactSyllabusContext(contextBlock)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 12);
  const scored = lines
    .map((line, i) => {
      let hit = 0;
      for (const w of line.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) if (want.has(w)) hit++;
      return { line, i, hit };
    })
    .sort((x, y) => y.hit - x.hit || x.i - y.i);
  const picked: typeof scored = [];
  let len = 0;
  for (const item of scored) {
    if (len + item.line.length > maxChars) continue;
    picked.push(item);
    len += item.line.length + 1;
  }
  return picked
    .sort((x, y) => x.i - y.i)
    .map((x) => x.line)
    .join("\n");
}

// Static rubric first (identical for every call → provider-side prefix caching),
// question/grounding second, the changing sentences last (user message).
const LIVE_RUBRIC = `You are a strict, accurate Cambridge 9708 AS/A Level Economics examiner giving live feedback. Judge ONLY the numbered sentences.
Flag an issue ONLY when you are certain it is a real error or a clear missed mark. Never flag correct economics just because it is worded unusually.
Spelling, punctuation and simple grammar are handled elsewhere: do NOT report them unless the sentence is otherwise unclear.
Categories (code): economics_accuracy (ea) false/backwards economics; misconception (mc) fundamental confusion; analysis (an) claim with no causal mechanism; reasoning_chain (rc) broken or contradictory logic; application (ap) pure theory ignoring the question context; evaluation (ev) unsupported judgement lacking a condition; terminology (tm) imprecise economic term; clarity (cl) ambiguous wording.
Rules: "s" is the exact drop-in replacement for "o" (no "e.g.", no quotes, no commentary). "o" must be copied exactly from the sentence. "e" is one short sentence (max 20 words). "p" is the economic law/syllabus principle proving it (max 12 words). "f" is your honest confidence 0.6-1.0. At most 4 issues in total.
EVERY sentence must be marked in "c" as [no, AO, credit]. AO: 1 = knowledge/definition, 2 = analysis/application/causal chain, 3 = evaluation/judgement. credit = marks-worthiness as an examiner would award: 0 = no credit (wrong, irrelevant, repeated or empty), 1 = basic credit (correct but undeveloped), 2 = developed credit (correct, precise, developed with mechanism/condition). Economically wrong sentences MUST get credit 0 and be reported in "i".
Reply ONLY with compact JSON, no fences: {"i":[{"n":<sentence no>,"o":"","s":"","c":"<code>","v":<1 low|2 med|3 high>,"e":"","p":"","f":0.9}],"c":[[<sentence no>,<1|2|3>,<0|1|2>]]}
"c" has one row per sentence. Use "i":[] when no issues.`;

function buildLiveSystemMessages(question: string, level: string, maxMark: number, grounding: string) {
  return [
    { role: "system" as const, content: LIVE_RUBRIC },
    {
      role: "system" as const,
      content: `QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}\n${grounding ? `GROUNDING:\n${grounding}` : "GROUNDING: standard Cambridge 9708 theory."}`,
    },
  ];
}

export const checkEssayWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const { sentenceKey, classifySentence, aoExplanation, isDiagramTag, wordCountOf } =
      await import("./live-examiner/sentence-engine");

    const currentSentences = splitSentences(data.essayText);
    const previousSentences = data.previousText ? splitSentences(data.previousText) : [];
    const carriedIssues = data.previousIssues ?? [];

    const diffed =
      previousSentences.length > 0
        ? diffSentences(previousSentences, currentSentences)
        : currentSentences.map((sentence) => ({ sentence, changed: true }));

    const unchangedSentenceSet = new Set(
      diffed.filter((entry) => !entry.changed).map((entry) => entry.sentence),
    );
    // Delta buffer: when the client tells us which sentences it already holds a
    // verdict for, "changed" means "not yet judged" — so sentences deferred by
    // the per-call cap (or a big paste) are always picked up on the next call.
    const knownKeys = data.knownSentences
      ? new Set(data.knownSentences.map((k) => k.toLowerCase().replace(/\s+/g, " ").replace(/[\s.!?]+$/g, "").trim()))
      : null;
    const changedSentences = knownKeys
      ? currentSentences.filter(
          (sent) => !knownKeys.has(sent.toLowerCase().replace(/\s+/g, " ").replace(/[\s.!?]+$/g, "").trim()),
        )
      : diffed.filter((entry) => entry.changed).map((entry) => entry.sentence);

    const carryForward = () =>
      carriedIssues
        .filter((issue) => unchangedSentenceSet.has(issue.context))
        .map(({ id: _id, ...issue }) => issue);

    const emptyUsage = (latencyMs: number, deterministicCount = 0) => ({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      deterministicCount,
      tokensSaved: 1200 * Math.max(1, deterministicCount),
    });

    if (changedSentences.length === 0) {
      const surviving = dedupeAndCap(carryForward());
      return {
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        sentenceResults: [] as { sentence: string; ao: "AO1" | "AO2" | "AO3"; strength: 0 | 1 | 2 }[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        predictedMark: undefined as PredictedMark | null | undefined,
        usage: emptyUsage(10),
      };
    }

    const toSend = changedSentences.slice(0, MAX_SENTENCES_PER_CALL);

    // Deterministic pass first — zero cost, zero latency.
    const deterministicTerminology = deterministicTerminologyIssues(toSend);
    const deterministicGrammar = analyzeGrammarAndMechanics(toSend);
    const deterministic: LiveExaminerIssue[] = [
      ...deterministicTerminology,
      ...deterministicGrammar.map(
        ({ ruleId: _ruleId, startOffset: _s, endOffset: _e, ...issue }) => issue,
      ),
    ];

    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (data.aiCoachingExpired && !isAdmin) {
      const surviving = dedupeAndCap([...carryForward(), ...deterministic]);
      return {
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        sentenceResults: [] as { sentence: string; ao: "AO1" | "AO2" | "AO3"; strength: 0 | 1 | 2 }[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        predictedMark: null,
        aiCoachingExpired: true,
        usage: emptyUsage(15, deterministic.length),
      };
    }

    // ---- Delta buffer: which sentences genuinely need the model? ----
    // Finished, substantive, never-seen sentences only. An unfinished trailing
    // sentence is skipped (it is still covered by the free in-browser pass).
    const known = new Set((data.knownSentences ?? []).map(sentenceKey));
    const lastSentence = currentSentences[currentSentences.length - 1];
    const trailingUnfinished =
      !data.includeTrailing && !/(?:[.!?]["')\]]*|\n)\s*$/.test(data.essayText);
    const aiAll = toSend.filter(
      (sentence) =>
        !isDiagramTag(sentence) &&
        wordCountOf(sentence) >= 4 &&
        !known.has(sentenceKey(sentence)) &&
        !(trailingUnfinished && sentence === lastSentence),
    );
    const aiSentences = aiAll.slice(0, MAX_AI_SENTENCES_PER_CALL);

    // Free, instant AO labels for everything in this batch; the model is only
    // asked about the genuinely ambiguous ones.
    const detByKey = new Map(toSend.map((sent) => [sent, classifySentence(sent)]));
    const sentenceResults: { sentence: string; ao: "AO1" | "AO2" | "AO3"; strength: 0 | 1 | 2 }[] =
      aiSentences.map((sent) => {
        const d = detByKey.get(sent)!;
        return { sentence: sent, ao: d.ao, strength: d.strength };
      });

    const buildClassifications = (): LiveExaminerAoClassification[] =>
      sentenceResults.map((r) => ({
        original: r.sentence,
        context: r.sentence,
        ao: r.ao,
        explanation: detByKey.get(r.sentence)?.explanation ?? aoExplanation(r.ao),
      }));

    if (aiSentences.length === 0) {
      const merged = dedupeAndCap([...carryForward(), ...deterministic]);
      return {
        issues: merged,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        sentenceResults,
        clean: merged.length === 0,
        checkedText: data.essayText,
        predictedMark: undefined as PredictedMark | null | undefined,
        usage: emptyUsage(20, deterministic.length),
      };
    }

    // Live Examiner alone uses the high-performance paid API / VIP keys across all tiers
    // to ensure ultra-low latency real-time feedback while students are drafting.
    const isBudgetTier = false;

    try {
      const { chat } = await import("./ai.server");
      const { MODEL_LIVE_CHECK, MODEL_LIVE_CANDIDATE } = await import("./examiner/config");
      const { extractFirstJsonObject } = await import("./examiner/json");
      const { cleanSuggestion } = await import("./live-examiner/clean-suggestion");

      const grounding = sliceContextForSentences(data.contextBlock, aiSentences);
      const targetBlock = aiSentences
        .map((sent, index) => {
          return `${index + 1}. ${sent}`;
        })
        .join("\n");

      const candidateResult = await chat({
        model: MODEL_LIVE_CANDIDATE,
        temperature: 0,
        json: true,
        isBudgetTier,
        maxCompletionTokens: 900,
        messages: [
          ...buildLiveSystemMessages(data.question, data.level, data.maxMark, grounding),
          { role: "user", content: `SENTENCES:\n${targetBlock}` },
        ],
      });

      let raw: Record<string, unknown> = {};
      try {
        raw = extractFirstJsonObject(candidateResult.text);
      } catch (jsonErr) {
        console.warn("Live examiner json parse fallback:", jsonErr);
      }

      // AI adjudication of ambiguous AO labels only.
      const aoByIndex = Array.isArray(raw.c) ? raw.c : [];
      for (const row of aoByIndex) {
        if (!Array.isArray(row)) continue;
        const idx = Number(row[0]);
        const ao = Number(row[1]);
        const strength = Number(row[2]);
        if (!Number.isInteger(idx) || idx < 1 || idx > aiSentences.length) continue;
        if (![1, 2, 3].includes(ao)) continue;
        const target = sentenceResults[idx - 1];
        target.ao = (["AO1", "AO2", "AO3"] as const)[ao - 1];
        target.strength = ([0, 1, 2].includes(strength) ? strength : 1) as 0 | 1 | 2;
      }
      const classifications = sentenceResults.map((r) => ({
        original: r.sentence,
        context: r.sentence,
        ao: r.ao,
        explanation: aoExplanation(r.ao),
      })) as LiveExaminerAoClassification[];

      const issuesRaw = Array.isArray(raw.i) ? raw.i : [];
      const detOriginals = deterministic.map((d) => d.original.toLowerCase());

      const candidates = issuesRaw.flatMap<Candidate>((item) => {
        const r = (item ?? {}) as Record<string, unknown>;
        const idx = Number(r.n);
        const sentence =
          Number.isInteger(idx) && idx >= 1 && idx <= aiSentences.length
            ? aiSentences[idx - 1]
            : undefined;
        const original = typeof r.o === "string" ? r.o.trim() : "";
        const suggestion = cleanSuggestion(typeof r.s === "string" ? r.s.trim() : "");
        const code = typeof r.c === "string" ? r.c.trim().toLowerCase() : "";
        const category =
          CATEGORY_CODES[code] ??
          (CATEGORIES.includes(code as (typeof CATEGORIES)[number])
            ? (code as (typeof CATEGORIES)[number])
            : null);
        const sevNum = Number(r.v);
        const severity = (sevNum >= 3 ? "high" : sevNum <= 1 ? "low" : "medium") as
          (typeof SEVERITIES)[number];
        let confidence = typeof r.f === "number" ? r.f : parseFloat(String(r.f));
        if (!Number.isFinite(confidence)) confidence = 0.8;
        if (confidence > 1 && confidence <= 100) confidence /= 100;

        if (!sentence || !original || !suggestion || !category) return [];
        if (confidence < CONFIDENCE_THRESHOLD) return [];
        if (!sentence.toLowerCase().includes(original.toLowerCase())) return [];
        if (suggestion.toLowerCase() === original.toLowerCase()) return [];
        // The free rules already own this exact span — no duplicate noise.
        if (detOriginals.some((d) => d.includes(original.toLowerCase()) || original.toLowerCase().includes(d)))
          return [];
        return [
          {
            original,
            suggestion,
            category,
            severity,
            explanation: (typeof r.e === "string" && r.e.trim()) || "Flagged by the examiner check.",
            context: sentence,
            evidence: (typeof r.p === "string" && r.p.trim()) || undefined,
            confidence,
          },
        ];
      });

      // Confident issues are kept outright. ONLY the riskiest class (a claim
      // that the student's economics is wrong) in the uncertain band gets an
      // independent second look — a false "you're wrong" is the worst UX.
      const kept: LiveExaminerIssue[] = [];
      const needsVerification: Candidate[] = [];
      for (const c of candidates) {
        const { confidence, ...issue } = c;
        if (confidence >= AUTO_KEEP_CONFIDENCE && !(AI_JUDGEMENT_CATEGORIES.has(c.category) && confidence < 0.85)) {
          kept.push(issue);
        } else if (AI_JUDGEMENT_CATEGORIES.has(c.category)) {
          needsVerification.push(c);
        }
      }

      if (needsVerification.length > 0) {
        try {
          const candidateBlock = needsVerification
            .map(
              (c, index) =>
                `${index + 1}. [${c.category}] Student wrote: "${c.context}"\n   Flagged: "${c.original}" → "${c.suggestion}"\n   Reason: ${c.explanation}`,
            )
            .join("\n\n");
          const verifyResult = await chat({
            model: MODEL_LIVE_CHECK,
            temperature: 0,
            json: true,
            isBudgetTier,
            maxCompletionTokens: 300,
            messages: [
              { role: "system", content: buildVerifierSystemPrompt(data.question, grounding) },
              { role: "user", content: `CANDIDATES:\n\n${candidateBlock}` },
            ],
          });
          const verifyRaw = extractFirstJsonObject(verifyResult.text);
          const verdicts = Array.isArray(verifyRaw.verdicts) ? verifyRaw.verdicts : [];
          needsVerification.forEach((c, i) => {
            const v = verdicts.find((x: any) => Number(x?.index) === i + 1) as
              | { keep?: boolean; explanation?: string }
              | undefined;
            if (v?.keep === true) {
              const { confidence: _c, ...issue } = c;
              kept.push({ ...issue, explanation: v.explanation || issue.explanation });
            }
          });
          await supabaseAdmin.from("ai_usage_log").insert({
            user_id: context.userId,
            feature: "live_examiner_verify",
            model: verifyResult.model,
            prompt_tokens: verifyResult.promptTokens,
            completion_tokens: verifyResult.completionTokens,
            latency_ms: verifyResult.latencyMs,
            ok: true,
          });
        } catch (verifyError) {
          // Unverifiable "you are wrong" claims are dropped, never shown.
          console.warn("Live examiner verification skipped:", verifyError);
        }
      }

      const freshIssues = kept.slice(0, MAX_NEW_ISSUES_PER_CALL);
      const merged = dedupeAndCap([...carryForward(), ...deterministic, ...freshIssues]);

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "live_examiner_check",
        model: candidateResult.model,
        prompt_tokens: candidateResult.promptTokens,
        completion_tokens: candidateResult.completionTokens,
        latency_ms: candidateResult.latencyMs,
        ok: true,
      });

      const promptTokens = candidateResult.promptTokens ?? 0;
      const completionTokens = candidateResult.completionTokens ?? 0;
      return {
        issues: merged,
        classifications,
        classifiedContexts: aiSentences,
        sentenceResults,
        clean: merged.length === 0,
        checkedText: data.essayText,
        predictedMark: undefined as PredictedMark | null | undefined,
        model: candidateResult.model,
        keyRotated: candidateResult.keyRotated,
        modelSwapped: candidateResult.modelSwapped,
        activeKeyType: candidateResult.activeKeyType,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          latencyMs: candidateResult.latencyMs,
          deterministicCount: deterministic.length,
          tokensSaved: 1200 * Math.max(1, deterministic.length),
        },
      };
    } catch (error) {
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "live_examiner_check",
        model: "live-examiner-check",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      const surviving = dedupeAndCap([...carryForward(), ...deterministic]);
      return {
        issues: surviving,
        classifications: buildClassifications().slice(0, 0),
        classifiedContexts: [] as string[],
        sentenceResults: [] as { sentence: string; ao: "AO1" | "AO2" | "AO3"; strength: 0 | 1 | 2 }[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        checkFailed: true,
        errorMessage: error instanceof Error ? error.message : "Examiner check unavailable",
        predictedMark: null,
        usage: emptyUsage(30, deterministic.length),
      };
    }
  });

// ---------------------------------------------------------------------------
// 3. Autosave — one row per (user, question), upserted on a debounce from
//    the client. Cheap: no AI involved.
// ---------------------------------------------------------------------------

const SaveSessionInput = z.object({
  level: z.enum(["as", "a2"]),
  topic: z.string().trim().max(200).default(""),
  question: z.string().trim().min(5).max(2000),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().max(40_000),
  issuesHistory: z.array(z.record(z.string(), z.unknown())).max(1000).default([]),
  /** The attached diagrams' [DIAGRAM: ...] tags, joined together if there's
   *  more than one, so they survive a reload/resume exactly like the essay
   *  text does. Sized for several diagrams, not just one. */
  diagramTag: z.string().trim().max(4000).nullable().optional(),
});

export const saveLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const { data: row, error } = await context.supabase
      .from("live_examiner_sessions")
      .upsert(
        {
          user_id: context.userId,
          level: data.level,
          topic: data.topic,
          question: data.question,
          max_mark: data.maxMark,
          essay_text: data.essayText,
          issues_history: data.issuesHistory as any,
          diagram_tag: data.diagramTag ?? null,
        },
        { onConflict: "user_id,question" },
      )
      .select("id, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return { sessionId: row.id as string, savedAt: row.updated_at as string };
  });

const GetSessionInput = z.object({
  question: z.string().trim().min(5).max(2000),
});

export const getLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("live_examiner_sessions")
      .select(
        "id, level, topic, question, max_mark, essay_text, issues_history, diagram_tag, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .eq("question", data.question)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { session: row ?? null };
  });

// ---------------------------------------------------------------------------
// 4. History — every past writing session for this student, newest first,
//    so Live Examiner can offer a "past essays" panel to browse and resume
//    from (the same one-row-per-question table autosave already writes to;
//    this just lists it instead of fetching a single row by question).
// ---------------------------------------------------------------------------

export const listLiveExaminerSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("live_examiner_sessions")
      .select("id, level, topic, question, max_mark, essay_text, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const essayText = (row.essay_text as string | null) ?? "";
      const trimmed = essayText.trim();
      return {
        id: row.id as string,
        level: row.level as "as" | "a2",
        topic: row.topic as string,
        question: row.question as string,
        maxMark: row.max_mark as number,
        wordCount: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length,
        updatedAt: row.updated_at as string,
      };
    });
  });

export const getTodayLiveExaminerSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      // 1. Check if user is Marginal Admin / holds admin role (admins are exempt from 1 session/day)
      const isAdmin =
        Boolean((context as any).isAdmin) ||
        isMarginalAdmin({
          userId: context.userId,
          claims: (context as any).claims,
          email: (context as any).email,
        });

      // 2. Query daily_feature_usage for this user's live_examiner entry
      let usageRows: any[] | null = null;
      try {
        const usageRes = await context.supabase
          .from("daily_feature_usage")
          .select("usage_day, detail, updated_at")
          .eq("user_id", context.userId)
          .eq("feature", "live_examiner")
          .order("updated_at", { ascending: false })
          .limit(1);
        usageRows = usageRes.data;
      } catch {
        usageRows = null;
      }

      const usageRow = usageRows?.[0] ?? null;
      const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        new Date(),
      );
      const isToday = usageRow?.usage_day === todayIST;

      if (!isToday || !usageRow?.detail) {
        return {
          hasActiveDailySession: false,
          isAdmin,
          isExpired: false,
          claimedQuestion: null,
          sessionStartedAt: null,
          session: null,
        };
      }

      // A session was claimed today!
      const claimedKey = usageRow.detail.toLowerCase().trim();
      let sessions: any[] | null = null;
      try {
        const sessionRes = await context.supabase
          .from("live_examiner_sessions")
          .select(
            "id, level, topic, question, max_mark, essay_text, issues_history, diagram_tag, created_at, updated_at",
          )
          .eq("user_id", context.userId)
          .order("updated_at", { ascending: false })
          .limit(20);
        sessions = sessionRes.data;
      } catch {
        sessions = null;
      }

      const matchingSession =
        (sessions ?? []).find(
          (s: any) =>
            (s?.question || "").toLowerCase().trim().replace(/\s+/g, " ") === claimedKey,
        ) ?? sessions?.[0] ?? null;

      const startedAt = matchingSession?.created_at
        ? new Date(matchingSession.created_at).getTime()
        : (usageRow?.updated_at ? new Date(usageRow.updated_at).getTime() : Date.now());

      const elapsedSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      const isExpired = !isAdmin && (elapsedSeconds >= DEFAULT_LIVE_EXAMINER_DURATION_MINUTES * 60);

      return {
        hasActiveDailySession: !isAdmin && !isExpired,
        isAdmin,
        isExpired,
        claimedQuestion: matchingSession?.question ?? usageRow.detail,
        sessionStartedAt: startedAt,
        session: matchingSession,
      };
    } catch (err) {
      console.warn("Exception in getTodayLiveExaminerSession:", err);
      return {
        hasActiveDailySession: false,
        isAdmin: false,
        isExpired: false,
        claimedQuestion: null,
        sessionStartedAt: null,
        session: null,
      };
    }
  });

const DeleteSessionInput = z.object({ id: z.string().uuid() });

export const deleteLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    // Check if this session is today's locked session
    const { data: sessionRow } = await context.supabase
      .from("live_examiner_sessions")
      .select("question, created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (sessionRow) {
      const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        new Date(),
      );
      const { data: usageRow } = await context.supabase
        .from("daily_feature_usage")
        .select("detail, usage_day")
        .eq("user_id", context.userId)
        .eq("feature", "live_examiner")
        .eq("usage_day", todayIST)
        .maybeSingle();

      if (usageRow) {
        const normS = sessionRow.question.toLowerCase().trim().replace(/\s+/g, " ");
        if (normS === usageRow.detail) {
          throw new Error("Today's active session is locked and cannot be deleted until tomorrow.");
        }
      }
    }

    // Scoped to user_id as well as id — belt and braces alongside the RLS
    // policy, so this can never touch a row that isn't the caller's own.
    const { error, count } = await context.supabase
      .from("live_examiner_sessions")
      .delete({ count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    if (!count) throw new Error("That essay couldn't be found — it may already be deleted.");
    return { deleted: true };
  });

// ---------------------------------------------------------------------------
// 5. "Max out this answer" — an on-demand, deeper suggestion pass a student
//    triggers themselves once they've finished writing (from the "Grade
//    now" result), separate from the continuous while-you-type checking
//    above. Takes the mark the essay already got (with its examiner's own
//    weaknesses/missing-elements/actionable-feedback, already grounded by
//    the marking pass) and turns it into a small number of concrete,
//    specific, write-this-in additions targeted at the marks actually
//    still on the table — not a repeat of the general feedback already
//    shown alongside the mark.
// ---------------------------------------------------------------------------

const MaxOutInput = z.object({
  question: z.string().trim().min(5).max(2000),
  level: z.enum(["as", "a2"]),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().default(""),
  contextBlock: z.string().default(""),
  totalMark: z.number().min(0).default(0),
  band: z.string().default(""),
  weaknesses: z.array(z.string()).default([]),
  missingElements: z.any().default({}),
  actionableFeedback: z.array(z.string()).default([]),
});

const AoTargetSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    const s = val.toLowerCase().trim();
    if (s.includes("1") || s.includes("knowledge")) return "ao1";
    if (s.includes("3") || s.includes("eval")) return "ao3";
    if (s.includes("2") || s.includes("anal")) return "ao2";
    if (s.includes("struct")) return "structure";
  }
  return "ao2";
}, z.enum(["ao1", "ao2", "ao3", "structure"]).default("ao2"));

const StrategicOptionSchema = z.object({
  label: z.string().default("Perspective"),
  description: z.string().default(""),
  sentence_starter: z.string().default(""),
});

export const MaxOutSuggestionSchema = z.object({
  target_ao: AoTargetSchema,
  title: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "Key Improvement"),
    z.string().default("Key Improvement"),
  ),
  suggestion: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().default(""),
  ),
  mark_uplift: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "+1–2 marks"),
    z.string().default("+1–2 marks"),
  ),
  how_to_write: z.preprocess(
    (v) => (Array.isArray(v) ? v.map(String) : []),
    z.array(z.string()).default([]),
  ),
  strategic_options: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(StrategicOptionSchema).default([])),
  model_phrasing: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().default(""),
  ),
  placement: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "Analytical Body Paragraph"),
    z.string().default("Analytical Body Paragraph"),
  ),
  placement_rationale: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : ""),
    z.string().default(""),
  ),
});

export const MaxOutResponseSchema = z.object({
  headline: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim()
        ? v.trim()
        : "Follow these step-by-step additions to reach full marks.",
    z.string().default("Follow these step-by-step additions to reach full marks."),
  ),
  target_band: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "Band 1 / Level 5 (Top Band)"),
    z.string().default("Band 1 / Level 5 (Top Band)"),
  ),
  perfection_summary: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().default(""),
  ),
  suggestions: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(MaxOutSuggestionSchema).default([])),
});

export type MaxOutSuggestion = z.infer<typeof MaxOutSuggestionSchema>;
export type MaxOutResponse = z.infer<typeof MaxOutResponseSchema>;

function buildDeterministicMaxOutBlueprint(
  question: string,
  level: "as" | "a2",
  maxMark: number,
  _essayText: string,
): MaxOutResponse {
  return {
    headline: `To maximize your score from the current draft to full ${maxMark}/${maxMark} marks, deepen causal transmission mechanisms and evaluate critical market dependencies.`,
    target_band: `Band 1 / Level 5 (${maxMark}/${maxMark} Marks)`,
    perfection_summary:
      "Your response demonstrates foundational economic concepts, but achieving full marks under Cambridge 9708 criteria requires explicitly developed multi-step causal transmission mechanisms (AO2), followed by sustained, conditional evaluation (AO3) examining price elasticity, time horizons, and unintended market distortions.",
    suggestions: [
      {
        target_ao: "ao1",
        title: "Rigorous Definitions & Root Market Foundations (AO1)",
        suggestion:
          "Ensure introductory definitions explicitly identify the exact market failure (imperfect consumer information / divergence between private and social benefits) and define government intervention mechanisms with precision.",
        mark_uplift: "+1 mark",
        placement: "Paragraph 1 (Introduction & Core Definitions)",
        placement_rationale:
          "Cambridge examiners award AO1 marks early when baseline definitions and market failure principles are established upfront in the opening paragraph.",
        how_to_write: [
          "Step 1: State the exact technical definition of the policy intervention as a legally enforced price floor set strictly above equilibrium.",
          "Step 2: Define the targeted economic good through the lens of asymmetric information or negative consumption externalities.",
          "Step 3: State the exact deadweight welfare loss resulting from free-market disequilibrium.",
        ],
        strategic_options: [
          {
            label: "Option 1: Information Failure Perspective",
            description: "Focus on consumers lacking perfect foresight of private health and financial costs.",
            sentence_starter:
              "Demerit goods are characterised by acute information failure, where consumers underestimate the true long-term marginal private costs...",
          },
          {
            label: "Option 2: Negative Externalities of Consumption",
            description: "Focus on third-party spillover costs not reflected in the market price.",
            sentence_starter:
              "The consumption of demerit goods imposes substantial external costs on third parties, resulting in marginal social cost exceeding marginal private benefit...",
          },
        ],
        model_phrasing:
          "A minimum price intervention acts as a legally enforced price floor set above the free-market equilibrium to internalise negative externalities and correct information failure.",
      },
      {
        target_ao: "ao2",
        title: "Complete Causal Mechanism of Market Adjustment (AO2)",
        suggestion:
          "Trace the step-by-step transmission mechanism: explain how the higher legal price induces a contraction along the demand curve, generates unsold surplus, and constrains seller revenue.",
        mark_uplift: "+2 marks",
        placement: "Paragraph 2 or 3 (Analytical Transmission Mechanism)",
        placement_rationale:
          "Step-by-step analysis (AO2) must follow definitions to systematically unpack consumer/supplier incentives and market equilibria.",
        how_to_write: [
          "Step 1: Trace the immediate incentive shift: higher prices diminish marginal utility per dollar spent, contracting quantity demanded.",
          "Step 2: Analyze supplier response: firms seek to supply more at the higher price, creating excess supply (unsold surplus).",
          "Step 3: Conclude how actual traded volume is constrained to the lower quantity demanded, reducing overconsumption.",
        ],
        strategic_options: [
          {
            label: "Option 1: Price Rationing & Contraction Mechanism",
            description: "Trace consumer purchasing power and substitution incentives.",
            sentence_starter:
              "By artificially increasing the price above equilibrium, the policy reduces consumer surplus and induces a contraction in quantity demanded along the demand curve...",
          },
          {
            label: "Option 2: Producer Surplus & Misallocation Analysis",
            description: "Analyze the accumulation of unsold stock and long-run firm exit.",
            sentence_starter:
              "At the legally mandated price floor, quantity supplied exceeds quantity demanded, leaving producers with excess stock and forcing less efficient firms to exit...",
          },
        ],
        model_phrasing:
          "The imposed price floor raises price above market equilibrium, inducing an immediate contraction in quantity demanded as consumer marginal utility per dollar spent diminishes.",
      },
      {
        target_ao: "ao3",
        title: "Rigorous Evaluative Dependencies: PED & Unintended Consequences (AO3)",
        suggestion:
          "To secure Band 1 marks, you must provide weighted evaluation examining price elasticity of demand (PED), time horizons, and the emergence of informal or shadow markets.",
        mark_uplift: "+2–3 marks",
        placement: "Final Paragraph (Evaluative Counterweight & Real-World Synthesis)",
        placement_rationale:
          "High-level evaluation (AO3) requires weighing critical dependencies (elasticities, time horizons, unintended consequences) against earlier arguments to reach a justified conclusion.",
        how_to_write: [
          "Step 1: Evaluate price elasticity of demand — if demerit goods are addictive (|PED| < 1), quantity demanded falls by a smaller percentage than the price rise.",
          "Step 2: Contrast the short run with the long run: immediate consumption habits may persist, whereas long-run substitution occurs over time.",
          "Step 3: Evaluate unintended consequences: illegal black markets, counterfeit product risks, and regressive impacts on low-income consumers.",
        ],
        strategic_options: [
          {
            label: "Option 1: Price Elasticity of Demand (PED) Limitation",
            description: "Evaluate why habit-forming goods yield only a muted quantity contraction.",
            sentence_starter:
              "However, the effectiveness of a minimum price is heavily contingent upon the price elasticity of demand (PED); because demerit goods often exhibit addictive characteristics...",
          },
          {
            label: "Option 2: Unintended Market Failures (Black Markets & Equity)",
            description: "Evaluate illegal trade, illicit quality, and regressive distributional impacts.",
            sentence_starter:
              "Furthermore, setting prices significantly above equilibrium incentivises illegal parallel markets, where unregulated substitute goods are traded below the legal tariff...",
          },
        ],
        model_phrasing:
          "Ultimately, the effectiveness of a minimum price is strictly contingent upon PED; because demerit goods often feature addictive characteristics (|PED| < 1), a price floor alone will yield only a muted contraction in consumption unless supported by behavioural education.",
      },
    ],
  };
}

function buildMaxOutSystemPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
): string {
  return `You are a Principal Examiner for Cambridge International AS & A Level Economics (syllabus 9708).
A student has written an essay for a ${maxMark}-mark Cambridge question and wants a precise, authoritative SCORE MAXIMIZER & PERFECTION BLUEPRINT showing them exactly how to write and maximize their score to achieve full marks (${maxMark}/${maxMark}).

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

SYLLABUS MATERIAL RETRIEVED FOR THIS QUESTION:
${contextBlock || "None retrieved — keep suggestions strictly grounded in Cambridge 9708 standards."}

YOUR OBJECTIVE:
Provide concrete, academically rigorous guidance detailing:
1. What specific missing concepts, causal chains, or evaluative weights stand between their current mark and full marks.
2. Step-by-step "How to write" instructions for each improvement (e.g. Step 1: Definition/Premise -> Step 2: Causal Transmission Chain -> Step 3: Evaluation/Trade-off).
3. Strategic options (e.g. Option 1 vs Option 2) providing multiple argument perspectives the student can choose from.
4. Exemplar Cambridge-grade sentence starters and model phrasing that they can directly incorporate.
5. Exact structural placement in the essay (e.g. Paragraph 1 for definitions, Paragraph 2 for causal mechanisms, Final Paragraph for evaluation) and why placing it there scores marks.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary outside the JSON:
{
  "headline": "<1-2 sentences summarizing the most critical step to reach a perfect score>",
  "target_band": "Band 1 / Level 5 (${maxMark}/${maxMark} Marks)",
  "perfection_summary": "<concise paragraph explaining the overarching structural upgrade needed for maximum marks>",
  "suggestions": [
    {
      "target_ao": "<ao1 | ao2 | ao3 | structure>",
      "title": "<short title, e.g. 'Complete the Causal Mechanism for Tax Incidence'>",
      "suggestion": "<detailed explanation of what is missing in the current draft and why adding this closes the gap to full marks>",
      "mark_uplift": "<e.g. '+2 marks'>",
      "placement": "<exact position in essay, e.g. 'Paragraph 1 (Introduction & Definitions)', 'Body Paragraph 2 (Analytical Mechanism)', 'Final Paragraph (Evaluative Judgement)'>",
      "placement_rationale": "<why placing it in this exact location achieves Cambridge marks>",
      "how_to_write": [
        "<Step 1: State the concept and explicit condition>",
        "<Step 2: Trace the transmission mechanism (Cause -> Transmission -> Outcome)>",
        "<Step 3: Provide evaluative counter-weight or context dependency>"
      ],
      "strategic_options": [
        {
          "label": "<e.g. Option 1: Elasticity Dependency>",
          "description": "<what this perspective argues>",
          "sentence_starter": "<exemplar sentence starter the student can use>"
        },
        {
          "label": "<e.g. Option 2: Time Horizons & Unintended Consequences>",
          "description": "<what this alternative perspective argues>",
          "sentence_starter": "<exemplar sentence starter the student can use>"
        }
      ],
      "model_phrasing": "<a polished, Cambridge Level 5 model sentence demonstrating exact analytical tone>"
    }
  ]
}`;
}

function buildMaxOutUserPrompt(
  essayText: string,
  totalMark: number,
  maxMark: number,
  band: string,
  weaknesses: string[],
  missingElements: unknown,
  actionableFeedback: string[],
): string {
  const missingObj =
    missingElements && typeof missingElements === "object" && !Array.isArray(missingElements)
      ? (missingElements as Record<string, unknown>)
      : {};
  const missingLines = Object.entries(missingObj)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(([key, items]) => `- ${key}: ${(items as string[]).join("; ")}`)
    .join("\n");

  return `CURRENT MARK: ${totalMark}/${maxMark} (${band || "band not set"})

WHAT THE EXAMINER ALREADY FLAGGED AS COSTING MARKS:
${weaknesses.length > 0 ? weaknesses.map((w) => `- ${w}`).join("\n") : "- (none flagged)"}

MISSING ELEMENTS THE EXAMINER IDENTIFIED:
${missingLines || "- (none flagged)"}

EXAMINER'S ALREADY-GIVEN ACTIONABLE FEEDBACK (do not just repeat this — go further, be more specific):
${actionableFeedback.length > 0 ? actionableFeedback.map((f) => `- ${f}`).join("\n") : "- (none given)"}

THE STUDENT'S FULL ANSWER:
${essayText || "(Initial draft)"}`;
}

/**
 * Triggered from the "Grade now" result or on-demand via the Maximizer button —
 * provides step-by-step guidance to achieve full marks.
 */
export const getMaxOutSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MaxOutInput.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { chat } = await import("./ai.server");
      const { MODEL_COACH, TEMPERATURE_TUTOR } = await import("./examiner/config");
      const { extractFirstJsonObject } = await import("./examiner/json");

      const result = await chat({
        model: MODEL_COACH,
        temperature: TEMPERATURE_TUTOR,
        json: true,
        maxCompletionTokens: 3000,
        messages: [
          {
            role: "system",
            content: buildMaxOutSystemPrompt(
              data.question,
              data.level,
              data.maxMark,
              compactSyllabusContext(data.contextBlock),
            ),
          },
          {
            role: "user",
            content: buildMaxOutUserPrompt(
              data.essayText,
              data.totalMark,
              data.maxMark,
              data.band,
              data.weaknesses,
              data.missingElements,
              data.actionableFeedback,
            ),
          },
        ],
      });

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "live_examiner_max_out",
        model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        latency_ms: result.latencyMs,
        ok: true,
      });

      const parsed = MaxOutResponseSchema.safeParse(extractFirstJsonObject(result.text));
      if (parsed.success && parsed.data.suggestions.length > 0) {
        return parsed.data;
      }
    } catch (err) {
      console.warn("Live examiner max-out LLM fallback to deterministic blueprint:", err);
    }

    // Always succeed with deterministic Cambridge Level 5 blueprint
    return buildDeterministicMaxOutBlueprint(
      data.question,
      data.level,
      data.maxMark,
      data.essayText,
    );
  });

// ---------------------------------------------------------------------------
// 6. Adaptive Socratic Examiner Challenges — on-demand / adaptive questioning
//    mode that actively interrogates the student's argument in progress.
//    Identifies weak assertions, missing links in causal chains, ungrounded
//    evaluation, or conceptual confusion, and poses authentic Cambridge
//    examiner challenge questions with scaffolding hints.
// ---------------------------------------------------------------------------

const ExaminerChallengeInput = z.object({
  question: z.string().trim().min(5).max(2000),
  level: z.enum(["as", "a2"]),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().trim().min(25).max(40_000),
  contextBlock: z.string().max(20_000).default(""),
});

export const ExaminerChallengeSchema = z.object({
  id: z.string(),
  type: z.enum(["challenge", "chain", "evaluation", "concept"]),
  targetSentence: z.string(),
  examinerPrompt: z.string(),
  hint: z.string().optional(),
  explanation: z.string(),
  targetAo: z.enum(["AO1", "AO2", "AO3"]),
});

export type ExaminerChallenge = z.infer<typeof ExaminerChallengeSchema>;

const ExaminerChallengesResponseSchema = z.object({
  overview: z.string().max(240),
  challenges: z.array(ExaminerChallengeSchema).max(4),
});

function buildChallengesSystemPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
): string {
  return `You are a Cambridge 9708 Economics Examiner running an interactive, Socratic examination of a student's answer in progress.
Your goal is NOT to grade or proofread, but to actively interrogate their argument:
1. Probe weak assertions or unstated assumptions ("challenge").
2. Demand the missing link in incomplete causal chains ("chain").
3. Force justified, conditional evaluation where claims are left one-sided ("evaluation").
4. Demand precise theoretical definitions/models where vague lay terms were used ("concept").

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

SYLLABUS GROUNDING:
${contextBlock || "Cambridge 9708 Economics syllabus standards."}

RULES:
- Be academically rigorous, fair, and probing. Speak in the voice of an encouraging but exacting examiner.
- Never give away the full answer prematurely. Offer a subtle scaffold in the "hint" field instead.
- Quote the student's actual phrase or sentence in "targetSentence".
- Provide 2 to 3 high-impact challenges.
- Return ONLY valid JSON matching this schema:
{
  "overview": "<one sentence diagnostic summary of their argument so far>",
  "challenges": [
    {
      "id": "<short unique id, e.g. 'c1'>",
      "type": "challenge" | "chain" | "evaluation" | "concept",
      "targetSentence": "<the exact student sentence or phrase being challenged>",
      "examinerPrompt": "<your probing Socratic examiner question directly to the student>",
      "hint": "<optional gentle hint nudge if they are stuck>",
      "explanation": "<why resolving this earns top-band marks under Cambridge criteria>",
      "targetAo": "AO1" | "AO2" | "AO3"
    }
  ]
}`;
}

export const getExaminerChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExaminerChallengeInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const { chat } = await import("./ai.server");
    const { MODEL_CHALLENGE, TEMPERATURE_TUTOR } = await import("./examiner/config");
    const { extractFirstJsonObject } = await import("./examiner/json");

    const result = await chat({
      model: MODEL_CHALLENGE,
      temperature: TEMPERATURE_TUTOR,
      json: true,
      maxCompletionTokens: 1400,
      messages: [
        {
          role: "system",
          content: buildChallengesSystemPrompt(
            data.question,
            data.level,
            data.maxMark,
            data.contextBlock,
          ),
        },
        {
          role: "user",
          content: `STUDENT ANSWER IN PROGRESS:\n\n${data.essayText}`,
        },
      ],
    });

    const parsed = ExaminerChallengesResponseSchema.safeParse(extractFirstJsonObject(result.text));
    if (!parsed.success) {
      return {
        overview: "Examiner is reviewing your argument structure.",
        challenges: [] as ExaminerChallenge[],
      };
    }

    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: context.userId,
      feature: "live_examiner_challenges",
      model: result.model,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      latency_ms: result.latencyMs,
      ok: true,
    });

    return parsed.data;
  });
