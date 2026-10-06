import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { LIVE_EXAMINER_LIMIT_MESSAGE } from "@/lib/usage-limits";
import { deterministicTerminologyIssues } from "@/lib/live-examiner/economics-glossary";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { diffSentences, splitSentences } from "@/lib/writing-check/sentence-diff";
import { AO_DEFINITIONS, defaultSplitForMaxMark } from "@/lib/examiner/config";

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
) {
  const { data, error } = await supabase.rpc("claim_live_examiner_session", {
    p_question: question,
  });
  if (error) throw new Error(error.message);
  if (!(data as { allowed?: boolean } | null)?.allowed) {
    throw new Error(LIVE_EXAMINER_LIMIT_MESSAGE);
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

/** Sentences per model call is capped so one giant paste can't spike cost. */
const MAX_SENTENCES_PER_CALL = 24;

/** Stage-1 candidates below this self-reported confidence are dropped
 *  before they even reach verification — cheap, zero-latency filter.
 *  Lowered from 0.7: Stage 2's independent, default-reject verifier is
 *  the actual quality gate, so this only needs to filter out
 *  low-confidence noise before it wastes a verifier slot — not act as a
 *  second quality bar itself. */
const CONFIDENCE_THRESHOLD = 0.55;

/**
 * Mechanical categories (grammar/clarity/terminology) at very high
 * self-reported confidence skip Stage 2 verification entirely — a
 * misspelled word or a misused term doesn't need a second opinion the way
 * an economics-judgement call does. This is the main latency lever: it
 * means a purely mechanical fix can show up after one fast model call
 * instead of two, without touching the accuracy of the higher-stakes AO
 * categories, which always still go through the verifier.
 */
const AUTO_KEEP_CATEGORIES: ReadonlySet<string> = new Set(["grammar", "clarity", "terminology"]);
const AUTO_KEEP_CONFIDENCE = 0.9;

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
    await assertLiveExaminerSessionAllowed(context.supabase, data.question);

    const { retrieve, renderContext } = await import("./retrieval.server");
    const { fetchCalibrationAnchors, buildAnchorBlock } =
      await import("./examiner/calibration.server");

    // Mandatory, same as essay grading — a failure here throws rather than
    // silently checking essays against nothing. See grade.server.ts for
    // why this changed from a best-effort try/catch.
    const sources = await retrieve(context.supabase, {
      query: `${data.topic} — ${data.question}`,
      matchCount: 8,
      docTypes: ["syllabus", "coursebook", "mark_scheme", "examiner_report"],
      minSimilarity: 0.22,
      enableHybridRrf: true,
    });

    const anchors = await fetchCalibrationAnchors(context.supabase);
    const anchorBlock = buildAnchorBlock(anchors);

    const contextBlock = anchorBlock
      ? `${renderContext(sources)}\n\n${anchorBlock}`
      : renderContext(sources);

    return {
      contextBlock,
      sourceCount: sources.length,
      anchorsUsed: anchors.length,
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
});

const CandidateSchema = IssueSchema.extend({ confidence: z.number().min(0).max(1) });
type Candidate = z.infer<typeof CandidateSchema>;

function buildCandidateSystemPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
) {
  return `You are a Cambridge 9708 Economics examiner giving LIVE, IN-PROGRESS feedback on a student's answer as they type it — a quick, light first pass over a few sentences, not a full mark. A second, independent reviewer will check every candidate you raise before the student ever sees it, so your job here is to propose candidates, not to be the final word — but still only propose things you genuinely believe are real.

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

${contextBlock || "No syllabus material was retrieved for this question — be extremely conservative about flagging economics content, since you have nothing to check it against. Grammar/clarity/terminology issues are still fine to flag."}

Categories you may flag, and ONLY these — each one is tied to exactly how this same essay will actually be graded (the same AO definitions the full Cambridge examiner uses):
- "grammar": spelling, grammar, punctuation, tense, run-on sentences. (Not an AO — pure writing mechanics.)
- "clarity": a sentence that is genuinely hard to follow or ambiguous — not just plainly worded. (Not an AO — pure writing mechanics.)
- "economics_accuracy": a factually wrong economics claim that DIRECTLY CONTRADICTS the syllabus material above. (${AO_DEFINITIONS.ao1.code} ${AO_DEFINITIONS.ao1.name} — ${AO_DEFINITIONS.ao1.description}.)
- "misconception": a fundamental conceptual misunderstanding (e.g. confusing a shift of a curve with a movement along it, conflating fiscal and monetary instruments, conflating economic growth with economic development, or confusing public goods with merit goods).
- "terminology": a specific economics term used incorrectly (not: correct but informal phrasing). (${AO_DEFINITIONS.ao1.code} ${AO_DEFINITIONS.ao1.name} — ${AO_DEFINITIONS.ao1.description}.)
- "analysis": a point stated but not explained (the underlying mechanism/chain is missing entirely). (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name} — the "explain -> analyse" steps of ${AO_DEFINITIONS.ao2.description}.)
- "application": analysis that never once touches the specific context/numbers/scenario in the question. (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name} — the "apply to context" step of ${AO_DEFINITIONS.ao2.description}.)
- "reasoning_chain": a genuine logical jump — the conclusion contradicts or does not follow from what was just stated. (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name} — a broken link anywhere in ${AO_DEFINITIONS.ao2.description}.)
- "evaluation": a claim made with literally no justification, no counter-argument, and no condition, where the question demands evaluation. (${AO_DEFINITIONS.ao3.code} ${AO_DEFINITIONS.ao3.name} — ${AO_DEFINITIONS.ao3.description}.)

CRITICAL — recognising valid work:
- A correct argument written in the student's own words, in a different order, or via a different (but valid) route to the same conclusion is NOT an error. Economics has more than one legitimate way to make a point. Only flag analysis/application/evaluation/reasoning_chain when something is genuinely MISSING or WRONG, never because it doesn't match a "template" structure.
- If you are unsure whether something is actually wrong, it is not a candidate — leave it out entirely rather than flag it "just in case".

PROOF REQUIREMENT:
- Every candidate needs an "evidence" string: for "economics_accuracy" and "misconception", this MUST be an exact, verbatim quote copied from the syllabus material above that the claim contradicts (a made-up or paraphrased quote will be rejected outright by the verifier). For every other category, a short, concrete, checkable reason.
- Every candidate needs a "confidence" score from 0 to 1 — your own honest estimate that this is a real, useful issue. Be harsh with yourself; only high-confidence candidates survive review.

OTHER RULES:
- Never rewrite the student's voice or style. "suggestion" must be the smallest possible fix — a phrase, a missing link, a corrected term — never a rewritten sentence or paragraph.
- Do NOT flag [DIAGRAM: ...] tags. If a word is marked "[?]" (illegible handwriting), leave it as "[?]".
- Return at most a small handful of your most confident candidates. Zero candidates on a clean or already-strong passage is the correct, expected answer far more often than not.
- Each sentence below is numbered. Only report candidates for sentences under "SENTENCES TO CHECK" — sentences under "CONTEXT ONLY" are given purely so you understand references/flow and must never appear in your output.

Also classify the student's creditworthy economics writing into assessment objectives. This is separate from finding mistakes, but an underline means the phrase currently earns credit: never classify an inaccurate, incomplete, contradictory, or merely attempted point.
- AO1: knowledge, definitions, concepts, diagrams, facts, and terminology.
- AO2: application to the question plus explanation, causal links, and developed analysis.
- AO3: evaluation, judgement, counter-arguments, limitations, conditions, and weighing significance.
- Underline only the main scoring point: copy the smallest self-contained phrase that proves the AO, normally 3–12 words. Never return a whole sentence when a shorter exact phrase carries the same credit. A sentence may contain more than one AO.
- Copy each classified clause verbatim from a SENTENCES TO CHECK sentence. Do not classify filler, headings, or [DIAGRAM: ...] tags.
- Return at most 16 of the strongest classifications. It is correct to return no classification when the writing does not yet earn a mark.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "issues": [
    {
      "sentence_index": <number, from "SENTENCES TO CHECK">,
      "original": "<the exact problem word/phrase, copied verbatim from the sentence>",
      "suggestion": "<the minimal fix — a phrase, not a rewrite>",
      "category": "grammar" | "clarity" | "economics_accuracy" | "analysis" | "application" | "evaluation" | "reasoning_chain" | "terminology" | "misconception",
      "severity": "low" | "medium" | "high",
      "explanation": "<one short sentence — why this matters, in plain terms>",
      "evidence": "<verbatim syllabus quote for economics_accuracy/misconception, or a short concrete reason otherwise>",
      "confidence": <0 to 1>
    }
  ],
  "classifications": [
    {
      "sentence_index": <number, from "SENTENCES TO CHECK">,
      "original": "<the exact 3–12 word main scoring phrase copied verbatim from the sentence>",
      "ao": "AO1" | "AO2" | "AO3",
      "explanation": "<one short sentence explaining why this clause earns that AO>"
    }
  ]
}
If a sentence has no issues, omit it from issues but still classify its meaningful economics clauses.`;
}

function buildVerifierSystemPrompt(question: string, contextBlock: string) {
  return `You are a strict, sceptical second reviewer checking a junior examiner's candidate feedback on a Cambridge 9708 Economics answer before any of it is shown to the student. Your default is REJECT — a candidate only survives if it is clearly, provably correct.

QUESTION: ${question}

${contextBlock || "No syllabus material is available."}

For EACH candidate below, decide keep or reject:
- REJECT any "economics_accuracy" or "misconception" candidate whose "evidence" is not an exact, verbatim quote from the syllabus material above, or whose evidence does not actually contradict the student's sentence when you re-read both side by side.
- REJECT any "analysis" / "application" / "evaluation" / "reasoning_chain" candidate if the student's original sentence is actually a valid — even if unconventional or differently-phrased — way of making a correct point. A different structure, order, or wording is NOT grounds to keep a candidate.
- REJECT anything vague, debatable, or where a reasonable examiner could disagree.
- KEEP only candidates you would be comfortable defending in front of the student with the evidence shown.
- You may also lightly tighten a kept candidate's "explanation" to be clearer, but never change what it claims.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary:
{
  "verdicts": [
    { "index": <number, matching the candidate list below>, "keep": true | false, "explanation": "<optionally tightened, only if keep is true>" }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Predicted mark — a rough, live-updating estimate shown next to the
// editor, NOT the real grade. It runs on the same fast model as the
// candidate check, on the full current essay text (not just the changed
// sentences, since a mark estimate needs the whole answer), and is fired
// in parallel with the Stage-1 candidate call so it costs latency, not
// doubles it. It intentionally skips retrieval grounding, the audit pass,
// and calibration anchors — all the things that make full grading slow —
// because a rough live number is the point; "Grade now" still runs the
// real, fully-grounded two-pass examiner for the mark that counts.
// ---------------------------------------------------------------------------

const PredictedAoSchema = z.object({
  awarded: z.number(),
  out_of: z.number(),
});

const PredictedMarkSchema = z.object({
  total_mark: z.number(),
  confidence: z.number().min(0).max(1),
  headline: z.string(),
  ao_breakdown: z.object({
    knowledge: PredictedAoSchema,
    analysis: PredictedAoSchema,
    evaluation: PredictedAoSchema,
  }),
});

export type PredictedMark = z.infer<typeof PredictedMarkSchema>;

function buildPredictedMarkPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
) {
  const split = defaultSplitForMaxMark(maxMark);
  return `You are giving a QUICK, ROUGH, live running estimate of the mark an unfinished Cambridge 9708 Economics answer is currently on track for — shown to the student as they type, updated every few seconds. This is NOT the final grade and will never be shown as one; it exists purely so the student can see their estimated mark move as they add real content, so lean toward a fast, reasonable read of what's on the page rather than an exhaustively justified one.

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

${contextBlock || "No syllabus material was retrieved for this question — judge on general Cambridge 9708 standards."}

FIXED AO ALLOCATION for this question: knowledge (${AO_DEFINITIONS.ao1.name}) out of ${split.ao1_marks}, analysis (${AO_DEFINITIONS.ao2.name}) out of ${split.ao2_marks}, evaluation (${AO_DEFINITIONS.ao3.name}) out of ${split.ao3_marks}. These "out_of" values are fixed — use exactly these three numbers, never invent different ones.

Judge only what is actually written so far — an incomplete essay should score low on whichever AOs it hasn't reached yet (e.g. no evaluation paragraph yet means evaluation is currently near 0, not an assumed future score). Be a fair, firm, mid-level examiner: reward real, developed points in full; don't invent credit for what isn't there yet, but don't punish an in-progress essay for being unfinished beyond the AOs it genuinely hasn't attempted.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary:
{
  "total_mark": <integer, 0 to ${maxMark}, sum of the three awarded values below>,
  "confidence": <0 to 1, your own honest confidence in this rough read — lower for a very short or very early draft>,
  "headline": "<max 8 words, plain, e.g. 'Solid knowledge, analysis still thin'>",
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": ${split.ao1_marks} },
    "analysis": { "awarded": <int>, "out_of": ${split.ao2_marks} },
    "evaluation": { "awarded": <int>, "out_of": ${split.ao3_marks} }
  }
}`;
}

/** Clamp/sanitise the model's rough estimate so a malformed response never
 *  reaches the client as a bogus number (e.g. negative, or exceeding the
 *  fixed out_of for an AO). Returns null on anything unusable — the caller
 *  treats that exactly like "estimate unavailable this round", never as an
 *  error that should block the real issue-checking result. */
function sanitisePredictedMark(raw: unknown, maxMark: number): PredictedMark | null {
  const parsed = PredictedMarkSchema.safeParse(raw);
  if (!parsed.success) return null;
  const clampAo = (ao: { awarded: number; out_of: number }) => ({
    out_of: Math.max(0, Math.round(ao.out_of)),
    awarded: Math.min(Math.max(0, Math.round(ao.awarded)), Math.max(0, Math.round(ao.out_of))),
  });
  const knowledge = clampAo(parsed.data.ao_breakdown.knowledge);
  const analysis = clampAo(parsed.data.ao_breakdown.analysis);
  const evaluation = clampAo(parsed.data.ao_breakdown.evaluation);
  const total = knowledge.awarded + analysis.awarded + evaluation.awarded;
  return {
    total_mark: Math.min(Math.max(0, total), maxMark),
    confidence: Math.min(Math.max(0, parsed.data.confidence), 1),
    headline: parsed.data.headline.slice(0, 80),
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
  const order: Record<(typeof SEVERITIES)[number], number> = { high: 0, medium: 1, low: 2 };
  return deduped.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, MAX_VISIBLE_ISSUES);
}

/** Case-insensitive substring check — the deterministic half of "no economics
 *  claim without proof": a citation that isn't literally in the retrieved
 *  material is rejected before it ever reaches the verifier. */
function evidenceAppearsInContext(evidence: string, contextBlock: string): boolean {
  if (!evidence.trim()) return false;
  return contextBlock.toLowerCase().includes(evidence.trim().toLowerCase());
}

export const checkEssayWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question);

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
    const changedSentences = diffed.filter((entry) => entry.changed).map((entry) => entry.sentence);

    const carryForward = () =>
      carriedIssues
        .filter((issue) => unchangedSentenceSet.has(issue.context))
        .map(({ id: _id, ...issue }) => issue);

    // Nothing new to check (e.g. only whitespace changed) — no model call.
    if (changedSentences.length === 0) {
      const surviving = dedupeAndCap(carryForward());
      // predictedMark omitted (not undefined-but-typed) on purpose: the
      // client treats a missing field as "no fresh estimate this round,
      // keep showing the last one" — see useLiveExaminerCheck.
      return {
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        predictedMark: undefined as PredictedMark | null | undefined,
      };
    }

    const toSend = changedSentences.slice(0, MAX_SENTENCES_PER_CALL);

    // Deterministic pass first — zero cost, zero latency, needs no AI
    // confirmation since these are exact-string glossary & rule matches.
    const deterministicTerminology = deterministicTerminologyIssues(toSend);
    const deterministicGrammar = analyzeGrammarAndMechanics(toSend);
    const deterministic: LiveExaminerIssue[] = [
      ...deterministicTerminology,
      ...deterministicGrammar.map(
        ({ ruleId: _ruleId, startOffset: _s, endOffset: _e, ...issue }) => issue,
      ),
    ];

    // Whether this call bothers estimating a mark at all: skip it on tiny
    // diffs (a couple of words changed) so a running estimate doesn't
    // re-fire on every check when nothing mark-relevant has changed, and
    // skip it once too little has been written for a number to mean
    // anything. Neither guard applies to the issue-checking side above.
    const shouldEstimateMark = data.essayText.trim().length >= 40;

    try {
      const { chat } = await import("./ai.server");
      const { MODEL_LIVE_CHECK, MODEL_LIVE_CANDIDATE, MODEL_ESTIMATE } =
        await import("./examiner/config");
      const { extractFirstJsonObject } = await import("./examiner/json");

      // ---- Stage 1: candidate generation, and the rough predicted-mark
      // estimate, fired together. Both are independent fast-model calls,
      // so running them with Promise.allSettled costs one round trip of
      // latency, not two — this is what lets the mark on the side update
      // live without slowing down the suggestion check that was already
      // there.
      const targetBlock = toSend.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n");

      const [candidateOutcome, predictedOutcome] = await Promise.allSettled([
        chat({
          model: MODEL_LIVE_CANDIDATE,
          temperature: 0,
          json: true,
          messages: [
            {
              role: "system",
              content: buildCandidateSystemPrompt(
                data.question,
                data.level,
                data.maxMark,
                data.contextBlock,
              ),
            },
            { role: "user", content: `SENTENCES TO CHECK:\n${targetBlock}` },
          ],
        }),
        shouldEstimateMark
          ? chat({
              model: MODEL_ESTIMATE,
              temperature: 0,
              json: true,
              messages: [
                {
                  role: "system",
                  content: buildPredictedMarkPrompt(
                    data.question,
                    data.level,
                    data.maxMark,
                    data.contextBlock,
                  ),
                },
                { role: "user", content: `CURRENT ANSWER SO FAR:\n\n${data.essayText}` },
              ],
            })
          : Promise.resolve(null),
      ]);

      if (candidateOutcome.status === "rejected") throw candidateOutcome.reason;
      const candidateResult = candidateOutcome.value;

      let predictedMark: PredictedMark | null = null;
      if (predictedOutcome.status === "fulfilled" && predictedOutcome.value) {
        try {
          predictedMark = sanitisePredictedMark(
            extractFirstJsonObject(predictedOutcome.value.text),
            data.maxMark,
          );
          await context.supabase.from("ai_usage_log").insert({
            user_id: context.userId,
            feature: "live_examiner_predicted_mark",
            model: predictedOutcome.value.model,
            prompt_tokens: predictedOutcome.value.promptTokens,
            completion_tokens: predictedOutcome.value.completionTokens,
            latency_ms: predictedOutcome.value.latencyMs,
            ok: true,
          });
        } catch {
          predictedMark = null; // Malformed estimate this round — just omit it, never fail the check for it.
        }
      }

      const raw = extractFirstJsonObject(candidateResult.text);
      const issuesRaw = Array.isArray(raw.issues) ? raw.issues : [];
      const classificationsRaw = Array.isArray(raw.classifications) ? raw.classifications : [];
      const classifications = classificationsRaw.flatMap<LiveExaminerAoClassification>((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        const idx = Number(record.sentence_index);
        const sentence = Number.isInteger(idx) ? toSend[idx - 1] : undefined;
        const original = typeof record.original === "string" ? record.original.trim() : "";
        const explanation = typeof record.explanation === "string" ? record.explanation.trim() : "";
        const ao = AO_CODES.includes(record.ao as (typeof AO_CODES)[number])
          ? (record.ao as (typeof AO_CODES)[number])
          : null;
        if (!sentence || !original || !ao) return [];
        const localIndex = sentence.toLowerCase().indexOf(original.toLowerCase());
        if (localIndex === -1 || /\[DIAGRAM:[^\]]*\]/i.test(original)) return [];

        // Preserve the student's exact casing and punctuation so locating
        // the coloured range in the textarea is deterministic.
        const exactOriginal = sentence.slice(localIndex, localIndex + original.length);
        return [
          {
            original: exactOriginal,
            context: sentence,
            ao,
            explanation: explanation || `${ao} evidence identified by the live examiner.`,
          },
        ];
      });
      const candidates = issuesRaw.flatMap<Candidate>((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        const idx = Number(record.sentence_index);
        const sentence = Number.isInteger(idx) ? toSend[idx - 1] : undefined;
        const original = typeof record.original === "string" ? record.original : "";
        const suggestion = typeof record.suggestion === "string" ? record.suggestion : "";
        const explanation = typeof record.explanation === "string" ? record.explanation : "";
        const evidence = typeof record.evidence === "string" ? record.evidence : "";
        const confidence = Number(record.confidence);
        const parsedCategory = CATEGORIES.includes(record.category as (typeof CATEGORIES)[number])
          ? (record.category as (typeof CATEGORIES)[number])
          : null;
        const parsedSeverity = SEVERITIES.includes(record.severity as (typeof SEVERITIES)[number])
          ? (record.severity as (typeof SEVERITIES)[number])
          : "medium";
        if (!sentence || !original || !suggestion || !parsedCategory) return [];
        if (!Number.isFinite(confidence) || confidence < CONFIDENCE_THRESHOLD) return [];
        // Guard against a hallucinated correction that doesn't even
        // appear in the sentence it claims to fix.
        if (!sentence.toLowerCase().includes(original.toLowerCase())) return [];
        // Economics claims need real proof: the cited evidence must
        // literally exist in the retrieved syllabus material, checked
        // here rather than trusted from the model's own claim.
        if (
          parsedCategory === "economics_accuracy" &&
          !evidenceAppearsInContext(evidence, data.contextBlock)
        ) {
          return [];
        }
        return [
          {
            original,
            suggestion,
            category: parsedCategory,
            severity: parsedSeverity,
            explanation: explanation || "Flagged by the examiner check.",
            context: sentence,
            evidence: evidence || undefined,
            confidence,
          },
        ];
      });

      let freshIssues: LiveExaminerIssue[] = [];

      // Split off the mechanical, high-confidence candidates so they skip
      // Stage 2 entirely (see AUTO_KEEP_CATEGORIES above) — they show up a
      // full round trip sooner. Everything else (every AO-judgement
      // category, and any lower-confidence mechanical one) still goes
      // through independent verification exactly as before; accuracy on
      // the categories that actually affect a mark is unchanged.
      const autoKept: LiveExaminerIssue[] = [];
      const needsVerification: Candidate[] = [];
      for (const candidate of candidates) {
        if (
          AUTO_KEEP_CATEGORIES.has(candidate.category) &&
          candidate.confidence >= AUTO_KEEP_CONFIDENCE
        ) {
          const { confidence: _confidence, ...issue } = candidate;
          autoKept.push(issue);
        } else {
          needsVerification.push(candidate);
        }
      }

      // ---- Stage 2: independent verification ----
      // Only spend a second call when there are still candidates that need
      // it — a clean passage, or one where everything was auto-kept, never
      // pays for verification it doesn't need.
      if (needsVerification.length > 0) {
        const candidateBlock = needsVerification
          .map(
            (c, index) =>
              `${index + 1}. [${c.category}] Student wrote: "${c.context}"\n   Flagged phrase: "${c.original}" → suggested: "${c.suggestion}"\n   Claimed reason: ${c.explanation}\n   Evidence offered: ${c.evidence || "(none)"}`,
          )
          .join("\n\n");

        const verifyResult = await chat({
          model: MODEL_LIVE_CHECK,
          temperature: 0,
          json: true,
          messages: [
            {
              role: "system",
              content: buildVerifierSystemPrompt(data.question, data.contextBlock),
            },
            { role: "user", content: `CANDIDATES:\n\n${candidateBlock}` },
          ],
        });

        const verifyRaw = extractFirstJsonObject(verifyResult.text);
        const verdicts = Array.isArray(verifyRaw.verdicts) ? verifyRaw.verdicts : [];
        const verdictByIndex = new Map<number, { keep: boolean; explanation?: string }>();
        for (const v of verdicts) {
          const record = (v ?? {}) as Record<string, unknown>;
          const idx = Number(record.index);
          if (!Number.isInteger(idx)) continue;
          verdictByIndex.set(idx, {
            keep: record.keep === true,
            explanation: typeof record.explanation === "string" ? record.explanation : undefined,
          });
        }

        const verified = needsVerification
          .map((candidate, i) => {
            const verdict = verdictByIndex.get(i + 1);
            if (!verdict?.keep) return null;
            const { confidence: _confidence, ...issue } = candidate;
            return { ...issue, explanation: verdict.explanation || issue.explanation };
          })
          .filter((item): item is LiveExaminerIssue => item !== null);

        // Trickle new issues in rather than dumping all of them at once.
        freshIssues = [...autoKept, ...verified].slice(0, MAX_NEW_ISSUES_PER_CALL);

        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "live_examiner_verify",
          model: verifyResult.model,
          prompt_tokens: verifyResult.promptTokens,
          completion_tokens: verifyResult.completionTokens,
          latency_ms: verifyResult.latencyMs,
          ok: true,
        });
      } else {
        freshIssues = autoKept.slice(0, MAX_NEW_ISSUES_PER_CALL);
      }

      const merged = dedupeAndCap([...carryForward(), ...deterministic, ...freshIssues]);

      await context.supabase.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "live_examiner_check",
        model: candidateResult.model,
        prompt_tokens: candidateResult.promptTokens,
        completion_tokens: candidateResult.completionTokens,
        latency_ms: candidateResult.latencyMs,
        ok: true,
      });

      return {
        issues: merged,
        classifications,
        classifiedContexts: toSend,
        clean: merged.length === 0,
        checkedText: data.essayText,
        predictedMark,
      };
    } catch (error) {
      await context.supabase.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "live_examiner_check",
        model: "live-examiner-check",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      // A failed check is an enhancement failing, never a hard gate — keep
      // whatever was already found (plus the free deterministic pass).
      const surviving = dedupeAndCap([...carryForward(), ...deterministic]);
      return {
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        checkFailed: true,
        predictedMark: null,
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
    await assertLiveExaminerSessionAllowed(context.supabase, data.question);

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
          issues_history: data.issuesHistory as Json,
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
        "id, level, topic, question, max_mark, essay_text, issues_history, diagram_tag, updated_at",
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

const DeleteSessionInput = z.object({ id: z.string().uuid() });

export const deleteLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteSessionInput.parse(input))
  .handler(async ({ data, context }) => {
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

const MaxOutMissingElements = z
  .object({
    definitions: z.array(z.string()).default([]),
    analysis: z.array(z.string()).default([]),
    evaluation: z.array(z.string()).default([]),
    examples: z.array(z.string()).default([]),
    diagrams: z.array(z.string()).default([]),
  })
  .partial()
  .default({});

const MaxOutInput = z.object({
  question: z.string().trim().min(5).max(2000),
  level: z.enum(["as", "a2"]),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().trim().min(1).max(40_000),
  contextBlock: z.string().max(20_000).default(""),
  totalMark: z.number().min(0).default(0),
  band: z.string().max(120).default(""),
  weaknesses: z.array(z.string()).max(20).default([]),
  missingElements: MaxOutMissingElements,
  actionableFeedback: z.array(z.string()).max(20).default([]),
});

const AoTargetSchema = z.enum(["ao1", "ao2", "ao3", "structure"]);

const StrategicOptionSchema = z.object({
  label: z.string().default("Perspective"),
  description: z.string().default(""),
  sentence_starter: z.string().default(""),
});

export const MaxOutSuggestionSchema = z.object({
  target_ao: AoTargetSchema,
  title: z.string().min(1).max(120),
  suggestion: z.string().min(1).max(1200),
  mark_uplift: z.string().max(40).default("+1–2 marks"),
  how_to_write: z.array(z.string()).default([]),
  strategic_options: z.array(StrategicOptionSchema).default([]),
  model_phrasing: z.string().default(""),
});

export const MaxOutResponseSchema = z.object({
  headline: z.string().max(240),
  target_band: z.string().max(100).default("Band 1 / Level 5 (Top Band)"),
  perfection_summary: z.string().max(1000).default(""),
  suggestions: z.array(MaxOutSuggestionSchema).max(6),
});

export type MaxOutSuggestion = z.infer<typeof MaxOutSuggestionSchema>;
export type MaxOutResponse = z.infer<typeof MaxOutResponseSchema>;

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
  missingElements: z.infer<typeof MaxOutMissingElements>,
  actionableFeedback: string[],
): string {
  const missingLines = (Object.entries(missingElements) as [string, string[] | undefined][])
    .filter(([, items]) => (items ?? []).length > 0)
    .map(([key, items]) => `- ${key}: ${(items ?? []).join("; ")}`)
    .join("\n");

  return `CURRENT MARK: ${totalMark}/${maxMark} (${band || "band not set"})

WHAT THE EXAMINER ALREADY FLAGGED AS COSTING MARKS:
${weaknesses.length > 0 ? weaknesses.map((w) => `- ${w}`).join("\n") : "- (none flagged)"}

MISSING ELEMENTS THE EXAMINER IDENTIFIED:
${missingLines || "- (none flagged)"}

EXAMINER'S ALREADY-GIVEN ACTIONABLE FEEDBACK (do not just repeat this — go further, be more specific):
${actionableFeedback.length > 0 ? actionableFeedback.map((f) => `- ${f}`).join("\n") : "- (none given)"}

THE STUDENT'S FULL ANSWER:
${essayText}`;
}

/**
 * Triggered from the "Grade now" result once a student has finished
 * writing — a single, deeper, on-demand call (not part of the live
 * while-typing checker), so it's fine for it to cost a real model call.
 * Deliberately reuses the grading pass's own weaknesses/missing-elements/
 * actionable-feedback as grounding input rather than re-deriving them, so
 * this call is about turning "what's wrong" into "here's exactly what to
 * write", not re-judging the essay from scratch.
 */
export const getMaxOutSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MaxOutInput.parse(input))
  .handler(async ({ data }) => {
    const { chat } = await import("./ai.server");
    const { MODEL_COACH, TEMPERATURE_TUTOR } = await import("./examiner/config");
    const { extractFirstJsonObject } = await import("./examiner/json");

    const result = await chat({
      model: MODEL_COACH,
      temperature: TEMPERATURE_TUTOR,
      json: true,
      maxCompletionTokens: 1800,
      messages: [
        {
          role: "system",
          content: buildMaxOutSystemPrompt(
            data.question,
            data.level,
            data.maxMark,
            data.contextBlock,
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

    const parsed = MaxOutResponseSchema.safeParse(extractFirstJsonObject(result.text));
    if (!parsed.success) {
      throw new Error("Couldn't generate suggestions just now — try again.");
    }
    return parsed.data;
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
    await assertLiveExaminerSessionAllowed(context.supabase, data.question);

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

    await context.supabase.from("ai_usage_log").insert({
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
