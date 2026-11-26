/**
 * Live Examiner 3.0 — Delta-Rubric Hybrid Engine
 *
 * Designed for maximum Cambridge 9708 accuracy under strict AI token constraints:
 * 1. One-time Question Rubric Blueprint (compiled once per question, reused all session)
 * 2. Ultra-compact indexed Delta prompts (~450 system tokens, ~150-350 output tokens)
 *    - Zero sentence echoing (returns sentence index `i`, AO tag, sub-role, 8-word reason)
 *    - Zero tokens wasted on spelling/grammar (handled 100% locally in <10ms)
 * 3. Deterministic 6-Point Verification Gate (0 extra LLM calls):
 *    - Exact span anchoring & normalization
 *    - Synonym & stylistic-nitpick rejection
 *    - Mechanical overlap deduplication
 *    - Syllabus / Cambridge law evidence grounding
 *    - Misconception -> AO downgrade coherence (never highlights wrong econ as green AO2)
 *    - Strict mathematical AO reconciliation with authentic multi-paragraph quality guardrails
 */

import { z } from "zod";
import { defaultSplitForMaxMark, isEvaluativeQuestion, type AoSplit } from "../examiner/config";
import { analyzeEssayQuality, essayHasDiagram, questionRequiresDiagram } from "../examiner/writing-quality";
import { cleanSuggestion, stripStars } from "./clean-suggestion";
import { normalizeIssueSpan } from "./normalize-issue-span";
import { detectOffTopicConcept, extractQuestionTopicTokens } from "./topic-relevance";
import { extractCommandWord, extractIndicativePoints } from "./rubric-retrieval";
import type { AoSubLabel, AoTag } from "./types";

// ============================================================================
// 1. One-Time Question Rubric Blueprint
// ============================================================================

export const QuestionRubricBlueprintSchema = z.object({
  commandWord: z.string(),
  requiresEvaluation: z.boolean(),
  requiresDiagram: z.boolean(),
  split: z.object({
    ao1_marks: z.number().int().min(0),
    ao2_marks: z.number().int().min(0),
    ao3_marks: z.number().int().min(0),
  }),
  /** 2-4 core syllabus terms expected for AO1 Knowledge */
  keyTerms: z.array(z.string()).max(5),
  /** 3-4 distinct causal mechanisms / diagrams expected for AO2 Analysis */
  analysisMechanisms: z.array(z.string()).max(5),
  /** 2-3 high-value evaluative criteria / tensions for AO3 (empty if non-evaluative) */
  evaluationAngles: z.array(z.string()).max(4),
  /** Compact syllabus grounding bullets (max ~800 chars total) */
  syllabusFacts: z.array(z.string()).max(6),
});

export type QuestionRubricBlueprint = z.infer<typeof QuestionRubricBlueprintSchema>;

/**
 * Deterministic fallback blueprint when AI blueprint compilation is unavailable.
 */
export function buildFallbackBlueprint(params: {
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock?: string;
}): QuestionRubricBlueprint {
  const { question, maxMark, contextBlock = "" } = params;
  const split = defaultSplitForMaxMark(maxMark, undefined, question);
  const commandWord = extractCommandWord(question);
  const requiresEvaluation = split.ao3_marks > 0 && isEvaluativeQuestion(question);
  const requiresDiagram = questionRequiresDiagram(question);
  const indicative = extractIndicativePoints(question, contextBlock);
  const topicTokens = extractQuestionTopicTokens(question);

  return {
    commandWord,
    requiresEvaluation,
    requiresDiagram,
    split,
    keyTerms: topicTokens.slice(0, 3).map((t) => `Define ${t}`),
    analysisMechanisms: indicative.slice(0, 3),
    evaluationAngles: requiresEvaluation
      ? [
          "Elasticity (PED/PES) or magnitude dependency",
          "Short-run vs long-run time lags & unintended consequences",
          "Prioritised concluding judgement resolving the prompt",
        ]
      : [],
    syllabusFacts: extractCompactSyllabusFacts(contextBlock),
  };
}

/**
 * Distills a raw RAG contextBlock into at most 5 concise syllabus facts (~750 chars).
 */
export function extractCompactSyllabusFacts(contextBlock: string): string[] {
  if (!contextBlock) return [];
  const facts: string[] = [];
  let charBudget = 0;
  for (const rawLine of contextBlock.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes("BAND ") && line.includes("ANCHOR")) break;
    if (line.startsWith("---") || line.startsWith("===")) continue;
    const cleaned = stripStars(line.replace(/^[-•*\d.)]+\s*/, "")).slice(0, 100);
    if (cleaned.length < 18) continue;
    if (charBudget + cleaned.length > 320) break;
    facts.push(cleaned);
    charBudget += cleaned.length;
    if (facts.length >= 4) break;
  }
  return facts;
}

/**
 * Tiny (~200-token) system prompt to compile a Question Rubric Blueprint ONCE per question.
 */
export function buildBlueprintCompilerPrompt(params: {
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock?: string;
}): string {
  const { question, level, maxMark, contextBlock = "" } = params;
  const split = defaultSplitForMaxMark(maxMark, undefined, question);
  const requiresEval = split.ao3_marks > 0 && isEvaluativeQuestion(question);
  const facts = extractCompactSyllabusFacts(contextBlock).join("\n- ");

  return `You are a Principal Cambridge 9708 Economics Examiner. Distill this question into a compact marking rubric JSON (plain text, NO markdown/asterisks).
QUESTION (${level.toUpperCase()}, ${maxMark}m | AO1:${split.ao1_marks} AO2:${split.ao2_marks} AO3:${split.ao3_marks}): ${question}
${facts ? `SYLLABUS CONTEXT:\n- ${facts}` : ""}
Return ONLY valid JSON:
{
  "keyTerms": ["2-3 concise core terms to define for AO1 (max 8 words each)"],
  "analysisMechanisms": ["3-4 distinct causal chains/diagrams for AO2 (max 12 words each)"],
  "evaluationAngles": ${requiresEval ? '["2-3 key AO3 evaluative tensions/judgements (max 12 words each)"]' : "[]"}
}`;
}

// ============================================================================
// 2. Ultra-Compact Delta AI Prompt & Response Schema
// ============================================================================

export type DirtySentencePayload = {
  /** 1-based index used in the LLM prompt/response */
  i: number;
  id: string;
  hash: string;
  text: string;
  paragraphIndex: number;
};

export type CachedSentenceSummary = {
  ao: AoTag;
  /** 1 = basic, 2 = developed */
  strength?: number;
  /** Ultra-short 5-8 word gist */
  gist: string;
};

export const CompactDeltaResponseSchema = z.object({
  /** Classifications for dirty sentences only, keyed by 1-based index `i` */
  c: z
    .array(
      z.object({
        i: z.coerce.number().int().positive(),
        ao: z.enum(["AO1", "AO2", "AO3", "NO_CREDIT"]),
        s: z.coerce.number().int().min(0).max(2).optional().default(1),
        sub: z
          .enum([
            "definition",
            "chain_link",
            "application",
            "diagram_reference",
            "evaluative_point",
            "judgement",
            "conclusion",
          ])
          .nullable()
          .optional()
          .catch(null),
        r: z.string().default(""),
      }),
    )
    .default([]),
  /** Economics-only issues (NEVER spelling/punctuation/basic grammar) */
  iss: z
    .array(
      z.object({
        i: z.coerce.number().int().positive(),
        orig: z.string(),
        fix: z.string(),
        cat: z.enum([
          "economics_accuracy",
          "misconception",
          "terminology",
          "analysis",
          "application",
          "reasoning_chain",
          "evaluation",
        ]),
        sev: z.enum(["low", "medium", "high"]).default("medium"),
        why: z.string(),
        ev: z.string().optional().default(""),
        ao_imp: z.string().optional().default(""),
        conf: z.coerce.number().min(0).max(1).optional().default(0.8),
      }),
    )
    .default([]),
  /** Indices of blueprint items satisfied so far (0-based) */
  hits: z
    .object({
      ao1: z.array(z.coerce.number().int().nonnegative()).default([]),
      ao2: z.array(z.coerce.number().int().nonnegative()).default([]),
      ao3: z.array(z.coerce.number().int().nonnegative()).default([]),
    })
    .optional(),
  /** Running Cambridge 9708 mark calibrated to full essay progress */
  m: z
    .object({
      ao1: z.coerce.number().int().min(0),
      ao2: z.coerce.number().int().min(0),
      ao3: z.coerce.number().int().min(0),
      conf: z.coerce.number().min(0).max(1).default(0.75),
      head: z.string().default(""),
      next: z.string().optional().default(""),
      /** Official Grader mechanism validation flags (0 or 1): inv=inverted mechanism, def_err=misdefined key term */
      inv: z.coerce.number().int().min(0).max(1).optional().catch(0),
      def_err: z.coerce.number().int().min(0).max(1).optional().catch(0),
    })
    .optional(),
});

export type CompactDeltaResponse = z.infer<typeof CompactDeltaResponseSchema>;

/**
 * Builds the ultra-compact (~420-token) Cambridge 9708 Delta Examiner system prompt.
 * Cuts prompt tokens by ~75% vs the legacy prompt while sharpening marking precision.
 */
export function buildCompactDeltaSystemPrompt(params: {
  question: string;
  level: "as" | "a2";
  maxMark: number;
  blueprint: QuestionRubricBlueprint;
}): string {
  const { question, level, maxMark, blueprint } = params;
  const { ao1_marks, ao2_marks, ao3_marks } = blueprint.split;

  const rubricLines = [
    `AO1(${ao1_marks}): ${blueprint.keyTerms.map((t, idx) => `[${idx}]${t}`).join("; ") || "Core definitions"}`,
    `AO2(${ao2_marks}): ${blueprint.analysisMechanisms.map((t, idx) => `[${idx}]${t}`).join("; ") || "Causal chains"}`,
    ao3_marks > 0
      ? `AO3(${ao3_marks}): ${blueprint.evaluationAngles.map((t, idx) => `[${idx}]${t}`).join("; ") || "Weighed evaluation & judgement"}`
      : "AO3(0): Not required for this command word.",
  ].join("\n");

  const factsBlock =
    blueprint.syllabusFacts.length > 0
      ? `\nSYLLABUS FACTS:\n${blueprint.syllabusFacts.map((f) => `- ${f}`).join("\n")}`
      : "";

  const scopeNote =
    maxMark >= 20
      ? "Paper 4 (A2): Reward A-Level theory/diagrams; Table A (AO1+AO2=14), Table B (AO3=6)."
      : "Paper 2 (AS): Strict AS scope only; never demand A2 concepts.";

  return `Cambridge 9708 Economics Examiner. Strict, positive marking. Plain English (no markdown/asterisks).
Q(${level.toUpperCase()},${maxMark}m): ${question}
${scopeNote}
RUBRIC:
${rubricLines}${factsBlock}
RULES:
1. SKIP spelling/punctuation/basic grammar (handled locally). Flag ONLY genuine errors: economics_accuracy, misconception, terminology (ONLY actual wrong terms — never valid Cambridge terms like hot money/ceteris paribus or writing 'government' for monetary policy), analysis (missing link), application (off-topic), reasoning_chain (contradiction), evaluation (unsupported claim). Max 3 issues.
2. NO SYNONYMS. Valid Cambridge axioms (NEVER flag): demerit=MSB<MPB; merit=MSB>MPB; neg prod=MSC>MPC; profit max=MR=MC; allocative eff=P=MC; 2024-2026 examples valid. "orig"=exact 1-8w substring; "fix"=drop-in replacement.
3. CLASSIFY every NEW SENTENCE: AO1=definition/concept; AO2=causal chain(cause->shift->P/Q/welfare)/continuation/application; AO3=${ao3_marks > 0 ? "PED/PES/SR-LR/alternatives/trade-offs/judgement" : "NEVER AO3 on non-evaluative Q (use AO2/AO1)"}; NO_CREDIT=off-topic/non-econ/inverted mechanism.
4. MARK(m) covers WHOLE essay (PRIOR+NEW). Off-topic=0/0/0. Set inv=1 ONLY if core mechanism runs backwards (e.g. tax shifts S right, higher rates cut borrowing cost/depreciate currency); set def_err=1 if a key term is misdefined. Diagram:${blueprint.requiresDiagram ? "REQUIRED(missing caps AO2 L2)" : "optional"}. Ceilings: ao1<=${ao1_marks},ao2<=${ao2_marks},ao3<=${ao3_marks}.
5. "hits"=0-based RUBRIC indices [0..N] met so far (NOT sentence numbers).
JSON ONLY ("m" and "hits" FIRST):
{"m":{"ao1":1,"ao2":2,"ao3":0,"conf":0.8,"inv":0,"def_err":0,"head":"<=8w summary","next":"<=12w next move"},"hits":{"ao1":[0],"ao2":[0],"ao3":[]},"c":[{"i":1,"ao":"AO1|AO2|AO3|NO_CREDIT","s":1,"sub":"definition|chain_link|application|diagram_reference|evaluative_point|judgement|conclusion","r":"<=8w why"}],"iss":[{"i":1,"orig":"exact","fix":"replacement","cat":"economics_accuracy|misconception|terminology|analysis|application|reasoning_chain|evaluation","sev":"low|medium|high","why":"1 short sentence","ev":"syllabus/econ principle","ao_imp":"+1 AO2","conf":0.85}]}`;
}

/**
 * Builds the compact user message containing ONLY:
 * - Compact 1-line summary of already-verified sentences (no redundant prose!)
 * - Full text of ONLY the dirty/new sentences (numbered 1..K)
 * - Essay structural stats (word count, paragraphs, diagram presence)
 */
export function buildCompactDeltaUserPrompt(params: {
  dirtySentences: DirtySentencePayload[];
  priorSummaries: CachedSentenceSummary[];
  essayStats: { wordCount: number; paragraphCount: number; hasDiagram: boolean };
  /** Optional verbatim last 1-2 sentences before dirty block for pronoun/causal continuity (~35 tokens) */
  precedingContext?: string[];
}): string {
  const { dirtySentences, priorSummaries, essayStats, precedingContext = [] } = params;

  const priorBlock =
    priorSummaries.length > 0
      ? `PRIOR VERIFIED (${priorSummaries.length} sentences):\n` +
        priorSummaries
          .slice(0, 30)
          .map((p, idx) => `P${idx + 1}[${p.ao.toUpperCase()}]: ${p.gist.slice(0, 65)}`)
          .join("\n")
      : "PRIOR VERIFIED: (none yet)";

  const contextBlock =
    precedingContext.length > 0
      ? `\nIMMEDIATELY PRECEDING SENTENCES (context only, do not re-check):\n${precedingContext
          .slice(-2)
          .map((s) => `> ${s.slice(0, 220)}`)
          .join("\n")}`
      : "";

  const newBlock =
    "NEW SENTENCES TO CHECK:\n" +
    dirtySentences.map((s) => `${s.i}. [P${s.paragraphIndex + 1}] ${s.text}`).join("\n");

  const statsLine = `ESSAY STATS: ${essayStats.wordCount} words | ${essayStats.paragraphCount} paragraphs | diagram: ${essayStats.hasDiagram ? "yes" : "no"}`;

  return `${statsLine}\n\n${priorBlock}${contextBlock}\n\n${newBlock}`;
}

// ============================================================================
// 3. Deterministic 6-Point Verification Gate (0 extra AI tokens!)
// ============================================================================

const SYNONYM_SWAP_PAIRS: ReadonlyArray<[string, string]> = [
  ["leads to", "results in"],
  ["causes", "brings about"],
  ["increases", "rises"],
  ["decreases", "falls"],
  ["reduces", "lowers"],
  ["raises", "increases"],
  ["however", "nevertheless"],
  ["therefore", "consequently"],
  ["because", "since"],
  ["due to", "because of"],
  ["shows", "demonstrates"],
  ["impacts", "affects"],
  ["helps", "assists"],
  ["big", "large"],
  ["many", "numerous"],
];

function isSynonymSwap(orig: string, fix: string): boolean {
  const a = orig.trim().toLowerCase();
  const b = fix.trim().toLowerCase();
  if (a === b) return true;
  for (const [x, y] of SYNONYM_SWAP_PAIRS) {
    if ((a === x && b === y) || (a === y && b === x)) return true;
  }
  return false;
}

const CORE_ECON_LAW_TOKENS = new Set([
  "supply",
  "demand",
  "elastic",
  "inelastic",
  "ped",
  "pes",
  "yed",
  "shift",
  "movement",
  "marginal",
  "cost",
  "benefit",
  "externality",
  "externalities",
  "tax",
  "subsidy",
  "fiscal",
  "monetary",
  "interest",
  "inflation",
  "deflation",
  "disinflation",
  "hyperinflation",
  "monopoly",
  "monopsony",
  "merit",
  "demerit",
  "public",
  "private",
  "social",
  "welfare",
  "deadweight",
  "equilibrium",
  "surplus",
  "shortage",
  "deficit",
  "gdp",
  "lras",
  "sras",
  "ppc",
  "opportunity",
  "comparative",
  "tariff",
  "quota",
  "off-topic",
  "prompt",
]);

function isEvidenceGrounded(evidence: string, explanation: string, blueprint: QuestionRubricBlueprint): boolean {
  const combined = `${evidence} ${explanation}`.toLowerCase();
  if (/off[- ]topic|prompt|unrelated/i.test(combined)) return true;

  // Check token overlap with retrieved syllabus facts
  if (blueprint.syllabusFacts.length > 0) {
    const factsLower = blueprint.syllabusFacts.join(" ").toLowerCase();
    const evTokens = combined
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    let overlap = 0;
    for (const tok of evTokens) {
      if (factsLower.includes(tok)) overlap++;
      if (overlap >= 2) return true;
    }
  }

  // Fallback: grounded in core Cambridge 9708 economic laws
  const words = combined.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/);
  let econHits = 0;
  for (const w of words) {
    if (CORE_ECON_LAW_TOKENS.has(w)) econHits++;
    if (econHits >= 2) return true;
  }
  return false;
}

export type VerifiedIssue = {
  sentenceIndex: number; // 1-based into dirtySentences
  sentenceId: string;
  sentenceHash: string;
  original: string;
  suggestion: string;
  category:
    | "economics_accuracy"
    | "misconception"
    | "terminology"
    | "analysis"
    | "application"
    | "reasoning_chain"
    | "evaluation";
  severity: "low" | "medium" | "high";
  explanation: string;
  context: string;
  evidence?: string;
  aoImpact?: string;
};

export type VerificationGateResult = {
  verifiedIssues: VerifiedIssue[];
  /** 1-based sentence indices containing a verified fatal economic error or off-topic content */
  fatalSentenceIndices: Set<number>;
  rejectedCount: number;
};

/**
 * Deterministic 6-point verification gate for AI-generated issues.
 * Ensures every surfaced suggestion is anchored, non-synonym, grounded, and coherent.
 */
export function verifyDeltaIssues(params: {
  rawIssues: CompactDeltaResponse["iss"];
  dirtySentences: DirtySentencePayload[];
  blueprint: QuestionRubricBlueprint;
  localIssueKeys?: Set<string>;
}): VerificationGateResult {
  const { rawIssues, dirtySentences, blueprint, localIssueKeys = new Set() } = params;
  const verifiedIssues: VerifiedIssue[] = [];
  const fatalSentenceIndices = new Set<number>();
  let rejectedCount = 0;

  const seenPerSentence = new Set<string>();

  for (const raw of rawIssues) {
    const target = dirtySentences.find((s) => s.i === raw.i);
    if (!target) {
      rejectedCount++;
      continue;
    }

    // Confidence floor
    if ((raw.conf ?? 0.8) < 0.6) {
      rejectedCount++;
      continue;
    }

    let orig = stripStars(raw.orig);
    let fix = cleanSuggestion(stripStars(raw.fix));
    const why = stripStars(raw.why);
    const ev = stripStars(raw.ev || "");
    const aoImp = stripStars(raw.ao_imp || "");

    if (!orig || !fix || !why || why.length < 10) {
      rejectedCount++;
      continue;
    }

    // Gate 1: Synonym / trivial swap / grammar-leakage / valid Cambridge term protection
    if (isSynonymSwap(orig, fix)) {
      rejectedCount++;
      continue;
    }
    // Reject AI grammar/spelling leaks (handled 100% by Tier 0 in-house engine)
    if (/\b(grammatical|grammar error|modal verb|spelling error|typo)\b/i.test(why)) {
      rejectedCount++;
      continue;
    }
    // Protect valid Cambridge 9708 core axioms from LLM false positives
    if (raw.cat === "economics_accuracy" || raw.cat === "misconception") {
      const sLower = target.text.toLowerCase();
      const isValidDemeritMsbMpb =
        /\b(marginal social benefit|msb)\b/.test(sLower) &&
        /\b(marginal private benefit|mpb)\b/.test(sLower) &&
        /\b(lower|less|below|<)\b/.test(sLower) &&
        /\b(demerit|negative externality|consumption)\b/.test(blueprint.keyTerms.join(" ").toLowerCase() + " " + sLower);
      const isValidMeritMsbMpb =
        /\b(marginal social benefit|msb)\b/.test(sLower) &&
        /\b(marginal private benefit|mpb)\b/.test(sLower) &&
        /\b(greater|higher|exceeds|above|>)\b/.test(sLower) &&
        /\b(merit|positive externality|consumption)\b/.test(blueprint.keyTerms.join(" ").toLowerCase() + " " + sLower);
      const isValidProdMscMpc =
        /\b(marginal social cost|msc)\b/.test(sLower) &&
        /\b(marginal private cost|mpc)\b/.test(sLower) &&
        /\b(greater|higher|exceeds|above|>)\b/.test(sLower) &&
        /\b(negative|pollution|production|externality)\b/.test(sLower);
      const isValidProfitMax = /\bmr\s*=\s*mc\b|\bmarginal revenue\s+equals\s+marginal cost\b/.test(sLower);
      const isValidAllocative = /\bp\s*=\s*mc\b|\bprice\s+equals\s+marginal cost\b|\bmsb\s*=\s*msc\b/.test(sLower);

      if (
        (isValidDemeritMsbMpb && /benefit|msb|mpb|msc|mpc/i.test(orig + " " + why)) ||
        (isValidMeritMsbMpb && /benefit|msb|mpb|msc|mpc/i.test(orig + " " + why)) ||
        (isValidProdMscMpc && /cost|msc|mpc/i.test(orig + " " + why)) ||
        (isValidProfitMax && /mr|mc|profit/i.test(orig)) ||
        (isValidAllocative && /allocative|p\s*=\s*mc|msb\s*=\s*msc/i.test(orig + " " + why))
      ) {
        rejectedCount++;
        continue;
      }
    }
    // Reject low-severity stylistic terminology nitpicks on valid Cambridge terms
    if (
      raw.cat === "terminology" &&
      raw.sev === "low" &&
      /\b(hot[- ]money|ceteris paribus|deadweight|crowding[- ]out|liquidity trap|phillips curve|lorenz|gini|pigouvian)\b/i.test(orig)
    ) {
      rejectedCount++;
      continue;
    }

    // Gate 2: Exact span normalization & verbatim check
    const normalized = normalizeIssueSpan({
      sentence: target.text,
      original: orig,
      suggestion: fix,
      category: raw.cat,
    });
    if (!normalized) {
      rejectedCount++;
      continue;
    }
    orig = stripStars(normalized.original);
    fix = cleanSuggestion(stripStars(normalized.suggestion));
    if (!orig || !fix || isSynonymSwap(orig, fix)) {
      rejectedCount++;
      continue;
    }
    if (!target.text.toLowerCase().includes(orig.toLowerCase())) {
      rejectedCount++;
      continue;
    }

    // Gate 3: Deduplicate against in-house local engine catches (exact or substring overlap)
    const localKey = `${target.hash}::${orig.toLowerCase()}`;
    const overlapsLocal =
      localIssueKeys.has(localKey) ||
      Array.from(localIssueKeys).some((k) => {
        if (!k.startsWith(`${target.hash}::`)) return false;
        const localOrig = k.slice(target.hash.length + 2);
        return localOrig.includes(orig.toLowerCase()) || orig.toLowerCase().includes(localOrig);
      });
    if (overlapsLocal) {
      rejectedCount++;
      continue;
    }

    // Gate 4: Syllabus / Cambridge law grounding for accuracy & misconception claims
    if (
      (raw.cat === "economics_accuracy" || raw.cat === "misconception") &&
      !isEvidenceGrounded(ev, why, blueprint)
    ) {
      rejectedCount++;
      continue;
    }

    // Gate 5: Prevent stacking duplicate issues on the same sentence/phrase
    const dedupeKey = `${target.i}::${raw.cat}::${orig.toLowerCase()}`;
    if (seenPerSentence.has(dedupeKey)) {
      rejectedCount++;
      continue;
    }
    seenPerSentence.add(dedupeKey);

    // Gate 6: Track fatal misconceptions/off-topic for AO highlight coherence
    if (
      raw.sev === "high" &&
      (raw.cat === "economics_accuracy" || raw.cat === "misconception" || /off[- ]topic/i.test(why))
    ) {
      fatalSentenceIndices.add(target.i);
    }

    verifiedIssues.push({
      sentenceIndex: target.i,
      sentenceId: target.id,
      sentenceHash: target.hash,
      original: orig,
      suggestion: fix,
      category: raw.cat,
      severity: raw.sev,
      explanation: why,
      context: target.text,
      evidence: ev || undefined,
      aoImpact: aoImp || undefined,
    });
  }

  return { verifiedIssues, fatalSentenceIndices, rejectedCount };
}

// ============================================================================
// 4. Verified Mark Reconciliation (Accurate, Multi-Paragraph Aware, No Regex Sabotage!)
// ============================================================================

export type ReconciledMark = {
  total_mark: number;
  confidence: number;
  headline: string;
  nextStep?: string;
  ao_breakdown: {
    knowledge: { awarded: number; out_of: number };
    analysis: { awarded: number; out_of: number };
    evaluation: { awarded: number; out_of: number };
  };
};

export type VerifiedAoEvidenceCounts = {
  ao1Sentences: number;
  ao2Sentences: number;
  ao3Sentences: number;
  hasConcludingJudgement: boolean;
  fatalMisconceptionCount: number;
};

const CONCLUSION_JUDGEMENT_RE =
  /\b(on balance|in conclusion|to conclude|overall|ultimately|all things considered|most effective|most decisive|to a large extent|to a limited extent|combination of|combined approach|prioritis(?:e|ing)|prioritiz(?:e|ing)|weighing both)\b/i;

/**
 * Reconciles the AI's mark with Cambridge 9708 tariff ceilings, authentic multi-paragraph
 * quality guardrails, required-diagram caps, fatal-misconception caps, verified-AO coherence,
 * and official Cambridge Table A/B conclusion requirements.
 *
 * CRITICAL DIFFERENCE from legacy sanitisePredictedMark:
 * - Does NOT override the AI's AO2/AO3 marks with naive regex keyword counts!
 * - Uses AI-verified AO sentence evidence counts (when supplied) so editor highlights
 *   and the running mark are 100% mathematically coherent.
 * - Uses the REAL essayText (preserving `\n\n` paragraph breaks) so multi-paragraph
 *   essays are NEVER hit by the monolithic-block penalty!
 */
export function reconcileVerifiedMark(params: {
  aiMark?: CompactDeltaResponse["m"];
  essayText: string;
  question: string;
  maxMark: number;
  blueprint: QuestionRubricBlueprint;
  verifiedCounts?: VerifiedAoEvidenceCounts;
}): ReconciledMark | null {
  const { aiMark, essayText, question, maxMark, blueprint, verifiedCounts } = params;
  if (!aiMark) return null;

  const split: AoSplit = blueprint.split;
  const cleanText = essayText.replace(/\[DIAGRAM:[^\]]*\]/gi, " ").trim();
  const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

  if (wordCount < 10) {
    return {
      total_mark: 0,
      confidence: 0.9,
      headline: "Keep writing to earn marks",
      nextStep: blueprint.keyTerms[0] || "Define the core concept in the question.",
      ao_breakdown: {
        knowledge: { awarded: 0, out_of: split.ao1_marks },
        analysis: { awarded: 0, out_of: split.ao2_marks },
        evaluation: { awarded: 0, out_of: split.ao3_marks },
      },
    };
  }

  let ao1 = Math.min(split.ao1_marks, Math.max(0, Math.round(aiMark.ao1)));
  let ao2 = Math.min(split.ao2_marks, Math.max(0, Math.round(aiMark.ao2)));
  let ao3 = blueprint.requiresEvaluation
    ? Math.min(split.ao3_marks, Math.max(0, Math.round(aiMark.ao3)))
    : 0;

  // Authentic multi-paragraph Cambridge writing quality guardrail (uses REAL essayText with paragraphs!)
  const quality = analyzeEssayQuality(essayText, maxMark, split);
  // For concise, well-paragraphed 8-mark non-evaluative Explain essays (165-219w, 3+ paras), allow up to 5/6 AO2 (7/8 total)
  const effectiveMaxAo2 =
    maxMark === 8 &&
    split.ao3_marks === 0 &&
    wordCount >= 165 &&
    quality.paragraphCount >= 3 &&
    !quality.hasAiArtifacts
      ? Math.max(quality.maxAllowableAo2, 5)
      : quality.maxAllowableAo2;
  ao2 = Math.min(ao2, effectiveMaxAo2);
  ao3 = Math.min(ao3, quality.maxAllowableAo3);

  // Official Grader Mechanism Validation Guardrails (applyEconomicMechanicsGuardrail parity)
  const hasInvertedMechanism = aiMark.inv === 1;
  const hasDefError = aiMark.def_err === 1;

  if (hasDefError && ao1 > 1) {
    ao1 = 1; // Official Cambridge rule: never award 2/2 AO1 when a key term is misdefined
  }
  if (hasInvertedMechanism) {
    // Inverted transmission mechanism caps AO2 at Level 1 and total at Lower Middle / Bottom Band
    const l1MaxAo2 = maxMark === 8 ? 1 : maxMark === 12 ? 2 : Math.max(2, Math.floor(split.ao2_marks * 0.35));
    ao2 = Math.min(ao2, l1MaxAo2);
    const maxTotalWithInversion = maxMark === 8 ? 4 : maxMark === 12 ? 6 : Math.round(maxMark * 0.5);
    while (ao1 + ao2 + ao3 > maxTotalWithInversion) {
      if (ao3 > 0) ao3 -= 1;
      else if (ao2 > 0) ao2 -= 1;
      else if (ao1 > 0) ao1 -= 1;
      else break;
    }
  }

  // Official Grader Comparative / "Best Way / Most Effective" One-Sidedness Gate
  const asksForComparativeBest =
    /\b(best way|best method|most effective|only way|more effective than)\b/i.test(question);
  if (asksForComparativeBest && blueprint.requiresEvaluation && wordCount >= 140) {
    const discussesAlternative =
      /\b(alternative|by contrast|on the other hand|conversely|compared (?:to|with)|instead of|information campaign|education|regulation|subsid(?:y|ies)|direct provision|fiscal policy|monetary policy|supply[- ]side|minimum price|maximum price|ban|quota|tradable permit)\b/i.test(
        cleanText,
      );
    if (!discussesAlternative) {
      // One-sided single-policy essay cannot reach Top Band evaluation
      ao3 = Math.min(ao3, maxMark >= 20 ? 2 : maxMark === 12 ? 2 : 1);
    }
  }

  // Verified-AO highlight coherence & official Cambridge fatal-misconception / conclusion guardrails
  if (verifiedCounts) {
    // 1. Highlight-to-mark coherence:
    //    - AO1 Knowledge can be demonstrated either standalone OR embedded inside valid AO2/AO3 prose
    //      (common in Cambridge Data Responses), so only zero AO1 when ALL AOs have 0 verified sentences.
    //    - Positive marking: if >=1 verified AO1 sentence exists and the essay isn't off-topic, award at least 1 AO1.
    const totalVerifiedSentences =
      verifiedCounts.ao1Sentences + verifiedCounts.ao2Sentences + verifiedCounts.ao3Sentences;
    if (totalVerifiedSentences === 0) {
      ao1 = 0;
    } else if (verifiedCounts.ao1Sentences >= 1 && ao1 === 0 && split.ao1_marks > 0) {
      ao1 = 1;
    }
    if (verifiedCounts.ao2Sentences === 0) ao2 = 0;
    if (verifiedCounts.ao3Sentences === 0) ao3 = 0;

    // 2. Fatal economic misconception cap (Cambridge 9708: uncorrected major misconception caps AO2 at Level 2)
    if (verifiedCounts.fatalMisconceptionCount > 0) {
      const maxAo2WithMisconception =
        maxMark >= 20 ? 8 : maxMark === 12 ? 4 : split.ao3_marks === 0 ? 4 : 3;
      ao2 = Math.min(ao2, Math.min(split.ao2_marks, maxAo2WithMisconception));
    }

    // 3. Official Cambridge AO3 depth & concluding-judgement requirement for top-band AO3
    const hasJudgement =
      verifiedCounts.hasConcludingJudgement || CONCLUSION_JUDGEMENT_RE.test(cleanText);
    if (blueprint.requiresEvaluation) {
      if (!hasJudgement) {
        if (maxMark === 8 && split.ao3_marks === 2) {
          ao3 = Math.min(ao3, 1); // 2/2 on 8m requires evaluative point + concluding judgement
        } else if (maxMark === 12 && split.ao3_marks === 4) {
          ao3 = Math.min(ao3, 3); // 4/4 on 12m requires prioritised concluding judgement
        } else if (maxMark >= 20 && split.ao3_marks >= 6) {
          ao3 = Math.min(ao3, 3); // Paper 4 Table B Level 2 (4-6/6) requires justified conclusion
        }
      }
      // Single passing evaluative sentence cannot jump straight to Top-Band AO3 on 12m/20m essays
      if (verifiedCounts.ao3Sentences < 2) {
        if (maxMark === 12 && split.ao3_marks === 4) {
          ao3 = Math.min(ao3, 2);
        } else if (maxMark >= 20 && split.ao3_marks >= 6) {
          ao3 = Math.min(ao3, 3);
        }
      }
    }
  }

  // Cambridge AO3 proportionality: top-band AO3 requires developed AO2 analysis
  if (blueprint.requiresEvaluation && split.ao3_marks >= 4 && ao2 < Math.ceil(split.ao2_marks * 0.5)) {
    ao3 = Math.min(ao3, Math.max(1, Math.floor(split.ao3_marks * 0.5)));
  }

  // Official Cambridge required-diagram Level 2 cap (ONLY when prompt explicitly demands a diagram)
  if (blueprint.requiresDiagram && !essayHasDiagram(essayText)) {
    const maxAo2NoDiagram =
      maxMark >= 20 ? 8 : maxMark === 12 ? 4 : split.ao3_marks === 0 ? 4 : 3;
    ao2 = Math.min(ao2, Math.min(split.ao2_marks, maxAo2NoDiagram));
  }

  // Strict off-topic safety guard (only if >= 25 words and zero overlap with question topic tokens
  // AND every sentence is flagged off-topic or AI itself gave 0)
  const topicTokens = extractQuestionTopicTokens(question);
  const lowerEssay = cleanText.toLowerCase();
  const hasAnyTopicToken =
    topicTokens.length === 0 || topicTokens.some((t) => lowerEssay.includes(t));
  if (!hasAnyTopicToken && wordCount >= 25 && aiMark.ao1 + aiMark.ao2 + aiMark.ao3 === 0) {
    ao1 = 0;
    ao2 = 0;
    ao3 = 0;
  }

  // Also check if the entire short draft is an explicit off-topic concept swap
  if (wordCount < 60 && detectOffTopicConcept(cleanText, question).isOffTopic) {
    ao1 = 0;
    ao2 = 0;
    ao3 = 0;
  }

  // Reconcile total against quality.maxAllowableTotalMark while preserving strict invariant: total === ao1 + ao2 + ao3
  while (ao1 + ao2 + ao3 > quality.maxAllowableTotalMark) {
    if (ao2 > 0 && ao2 >= ao3) {
      ao2 -= 1;
    } else if (ao3 > 0) {
      ao3 -= 1;
    } else if (ao1 > 0) {
      ao1 -= 1;
    } else {
      break;
    }
  }

  const total = Math.min(maxMark, ao1 + ao2 + ao3);
  const conf = Number.isFinite(aiMark.conf) ? Math.min(1, Math.max(0.1, aiMark.conf)) : 0.8;

  return {
    total_mark: total,
    confidence: Math.round(conf * 100) / 100,
    headline: stripStars(aiMark.head || "").slice(0, 85) || `Running mark: ${total}/${maxMark}`,
    nextStep: aiMark.next ? stripStars(aiMark.next).slice(0, 140) : undefined,
    ao_breakdown: {
      knowledge: { awarded: ao1, out_of: split.ao1_marks },
      analysis: { awarded: ao2, out_of: split.ao2_marks },
      evaluation: { awarded: ao3, out_of: split.ao3_marks },
    },
  };
}
