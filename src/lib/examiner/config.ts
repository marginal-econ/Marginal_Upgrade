// Ported from the original Python `config.py`. Central tunables so no agent
// or route hardcodes marking values.

export const SYLLABUS_CODE = "9708";

export const DEFAULT_MAX_MARK = 12;

/** Standard 12-mark evaluative essay split for syllabus 9708. NOT an even third. */
export const DEFAULT_AO_SPLIT = {
  ao1_marks: 2, // Knowledge and understanding
  ao2_marks: 6, // Analysis
  ao3_marks: 4, // Evaluation
} as const;

export type AoSplit = { ao1_marks: number; ao2_marks: number; ao3_marks: number };

/**
 * Single source of truth for what each AO actually means — imported by both
 * the full essay grader (examiner-prompt.ts, via grade.server.ts) and the
 * live, in-progress checker (live-examiner.functions.ts). Before this, the
 * two prompts each hand-wrote their own description of AO1/AO2/AO3, so a
 * wording change to one (e.g. tightening what counts as "application" under
 * AO2) had no way to reach the other — a student could get live suggestions
 * that quietly stopped matching how their essay is actually graded. Now
 * there is exactly one place these definitions live.
 */
export const AO_DEFINITIONS = {
  ao1: {
    code: "AO1",
    name: "Knowledge and understanding",
    description: "accurate use of economic terms, theory, concepts",
  },
  ao2: {
    code: "AO2",
    name: "Analysis",
    description: "chains of reasoning: define -> explain -> analyse -> apply to context",
  },
  ao3: {
    code: "AO3",
    name: "Evaluation",
    description:
      'judgement, balance, weighing up, justified conclusions — for evaluative "discuss"/"assess"/"to what extent" questions',
  },
} as const;

export type AoKey = keyof typeof AO_DEFINITIONS;

/** e.g. "AO1 Knowledge and understanding (accurate use of economic terms, theory, concepts)" */
export function formatAoLine(key: AoKey): string {
  const ao = AO_DEFINITIONS[key];
  return `${ao.code} ${ao.name} (${ao.description})`;
}

/** The exact three-line bullet block the full marking prompt renders inline. */
export function renderAoDefinitions(): string {
  return (["ao1", "ao2", "ao3"] as AoKey[]).map((key) => `- ${formatAoLine(key)}`).join("\n");
}

/**
 * Marks available for a single point when coached in isolation. Cambridge
 * weights an evaluative essay 2 knowledge : 6 analysis : 4 evaluation, so the
 * AO skills coach scores out of those same tariffs, never out of 5.
 */
export const AO_MAX_MARKS = { ao1: 2, ao2: 6, ao3: 4 } as const;

/** Balanced temperatures: Pass 1 at 0.0 for analytical rigor & catching errors; Pass 2 at 0.2 for holistic evaluation. */
export const TEMPERATURE_PASS1 = 0.0;
export const TEMPERATURE_PASS2 = 0.2;
export const TEMPERATURE_EXAMINER = 0.2;
export const TEMPERATURE_TUTOR = 0.4;

export const MAX_ANCHORS_PER_BAND = 2;

/**
 * High-Speed 1M Context Gemini Flash Configuration:
 *
 * All pipelines are strictly locked to google/gemini-3.8-flash for maximum throughput,
 * zero timeout degradation, and instant sub-2.5-second Cambridge 9708 evaluation.
 */
export const MODEL_EXAMINER = "google/gemini-3.8-flash";
export const MODEL_FAST = "google/gemini-3.8-flash";

/**
 * Task-specific model assignments. All mapped directly to Gemini 3.8 Flash:
 */
export const MODEL_GRADING = MODEL_EXAMINER;
export const MODEL_AUDIT = MODEL_EXAMINER;
export const MODEL_ARBITRATION = MODEL_EXAMINER;
export const MODEL_ESSAY_GEN = MODEL_EXAMINER;

export const MODEL_COACH = MODEL_FAST;
export const MODEL_ANALYSIS = MODEL_FAST;
export const MODEL_CHALLENGE = MODEL_FAST;
export const MODEL_QUESTION_GEN = MODEL_FAST;
export const MODEL_EXTRACT = MODEL_FAST;
export const MODEL_LIVE_CHECK = MODEL_FAST;
export const MODEL_LIVE_CANDIDATE = MODEL_FAST;
export const MODEL_ESTIMATE = MODEL_FAST;
export const MODEL_MECHANICAL = MODEL_FAST;
/**
 * Only used as the model name for the last-resort Lovable-gateway embedding
 * path in ai.server.ts — the direct OpenRouter/Google paths pick their own
 * model constants internally so they can be swapped independently.
 */
export const MODEL_EMBEDDING = "google/gemini-embedding-2";

/**
 * Nemotron 3 Embed 1B (OpenRouter, free) is fixed at 2048 dims, so this is
 * also what Google is asked to truncate to when it's used as a fallback —
 * keeps document_chunks.embedding a single comparable size regardless of
 * which provider actually produced a given chunk's vector.
 */
export const EMBEDDING_DIMS = 2048;

/**
 * Checks whether a question explicitly requires evaluation (AO3).
 * Questions with keywords like "consider", "to what extent", "discuss",
 * "evaluate", "assess", "justify" require evaluation.
 * Legacy/analytical questions (e.g. "Explain...", "Analyse...") without these
 * keywords do NOT require evaluation and must never be penalized for omitting it.
 */
export function isEvaluativeQuestion(question?: string | null): boolean {
  if (!question || typeof question !== "string") return true;
  return /\b(consider|to\s+what\s+extent|extent\s+to\s+which|discuss|evaluate|assess|whether|justify|weigh|compare\s+and\s+contrast|is\s+it\s+desirable|should|how\s+far|do\s+you\s+agree|is\s+it\s+always|is\s+it\s+true|critically)\b/i.test(
    question,
  );
}

/** Legacy Cambridge 9708 8-mark split (no evaluation required: 2 knowledge, 6 analysis, 0 evaluation). */
export const TARIFF_SPLIT_8_LEGACY: AoSplit = {
  ao1_marks: 2,
  ao2_marks: 6,
  ao3_marks: 0,
} as const;

/**
 * Exact Cambridge 9708 AO splits per question tariff. These are authoritative
 * and must not be derived from a ratio.
 *
 *   - 8-mark evaluative questions: AO1 2 / AO2 4 / AO3 2 (standard evaluative).
 *   - 8-mark legacy / explain questions: AO1 2 / AO2 6 / AO3 0 (no evaluation).
 *   - 12-mark evaluative essays: AO1 2 / AO2 6 / AO3 4 (unchanged — original split).
 *   - There is NO 25-mark question anywhere in this syllabus. Paper 4's
 *     extended essays (Section B/C, Q2–5, EITHER/OR) are each worth 20
 *     marks, not 25 — that was the actual bug. AO1+AO2 combined out of 14,
 *     AO3 out of 6, per the published mark scheme. The 2/12 split of the
 *     combined 14 follows the same "2 fixed knowledge marks" convention as
 *     the 12-mark essay above.
 */
export const TARIFF_SPLITS: Record<number, AoSplit> = {
  8: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 },
  12: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
  20: { ao1_marks: 2, ao2_marks: 12, ao3_marks: 6 },
};

/** AO split by question tariff: exact for 8, 12, 20; supports legacy 8-mark non-evaluative essays. */
export function defaultSplitForMaxMark(
  maxMark: number,
  essayType?: string,
  question?: string,
): AoSplit {
  const numericMax =
    typeof maxMark === "number" && Number.isFinite(maxMark) && maxMark > 0
      ? maxMark
      : Number.isFinite(Number(maxMark)) && Number(maxMark) > 0
        ? Number(maxMark)
        : 12;

  // Legacy 8-mark non-evaluative category (Explain / Analyse questions without evaluative command words)
  if (numericMax === 8) {
    if (
      essayType === "8_legacy" ||
      essayType === "legacy" ||
      essayType === "explain" ||
      essayType === "legacy_8" ||
      (essayType !== "8_eval" && essayType !== "eval" && question && !isEvaluativeQuestion(question))
    ) {
      return { ...TARIFF_SPLIT_8_LEGACY };
    }
  }

  const exact = TARIFF_SPLITS[numericMax];
  if (exact) return { ...exact };

  // Keep the 2:6:4 weighting and make the parts sum exactly to the tariff.
  const ao1 = Math.max(1, Math.round(numericMax * (2 / 12)));
  const ao2 = Math.max(1, Math.round(numericMax * (6 / 12)));
  const ao3 = numericMax - ao1 - ao2;
  if (ao3 >= 1) return { ao1_marks: ao1, ao2_marks: ao2, ao3_marks: ao3 };
  // Very small tariffs: protect evaluation before analysis.
  return { ao1_marks: ao1, ao2_marks: Math.max(1, numericMax - ao1 - 1), ao3_marks: 1 };
}

/** Per-AO mark ceiling for a given tariff, used by the AO skills coach. */
export function aoMaxMarks(maxMark: number): { ao1: number; ao2: number; ao3: number } {
  const split = defaultSplitForMaxMark(maxMark);
  return { ao1: split.ao1_marks, ao2: split.ao2_marks, ao3: split.ao3_marks };
}

/**
 * Builds the authoritative examiner directive for evaluation based on the question tariff.
 * For 8-mark questions, strictly distinguishes evaluative (AO1: 2, AO2: 4, AO3: 2) from
 * non-evaluative legacy (AO1: 2, AO2: 6, AO3: 0).
 */
export function buildAoEvaluationDirective(maxMark: number, split: AoSplit): string {
  if (split.ao3_marks === 0) {
    return `SPECIAL DIRECTIVE FOR NON-EVALUATIVE LEGACY ESSAYS (0 AO3 Evaluation Marks):
- THIS IS A PURE EXPLANATORY / ANALYTICAL QUESTION (e.g. legacy Cambridge 8-mark 'Explain' or 'Analyse' question).
- EVALUATION IS STRICTLY NOT REQUIRED.
- Candidates MUST NOT be penalised in any way for the absence of evaluation, weighing, alternative policies, or a conclusion.
- The entire ${maxMark} marks are allocated exclusively across AO1 Knowledge (${split.ao1_marks} marks) and AO2 Analysis (${split.ao2_marks} marks).
- In "ao_breakdown.evaluation", you MUST set "awarded": 0, "out_of": 0, and "comment": "Evaluation is not required for this question. No marks are lost for its omission."
- Keep "missing_elements.evaluation" completely empty [].
- NEVER mention missing evaluation, lack of alternative perspectives, or missing conclusions in weaknesses, comments, or examiner summary.`;
  }

  if (maxMark === 8 && split.ao3_marks === 2) {
    return `SPECIAL DIRECTIVE FOR 8-MARK EVALUATIVE ESSAYS (2 AO3 Evaluation Marks Allocated):
- THIS IS AN 8-MARK SECTION B EVALUATIVE ESSAY — STRICTLY CAMBRIDGE 9708 PAPER 2 (AS LEVEL) (${maxMark} marks total: AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).
- NEVER mention Paper 4 or A-Level topics (NO marginal utility/utility theory, NO diminishing returns, NO indifference curves, NO monopoly/oligopoly, NO dynamic/X/Pareto efficiency, NO MRPL, NO A2 macro). Grade and advise strictly on AS Level Paper 2 content and knowledge base.
- DEFINITION FAIRNESS: Scarcity is finite or limited resources versus unlimited wants. "Finite" and "limited" are standard Cambridge synonyms; never label a basic definition of scarcity incorrect or a tautology. Do not require opportunity cost in the definition of scarcity itself.
- REALISTIC, TONED-DOWN EVALUATION STRICTNESS FOR 8-MARK QUESTIONS (~300–450 words target):
  * AO3 is allocated ONLY 2 MARKS TOTAL. This is a concise AS Level Section B essay.
  * DO NOT demand A-Level criteria or complex multi-criteria trade-off matrices.
  * AWARD FULL 2/2 MARKS (Level 2) ONLY WHEN THE ESSAY IS TRULY PERFECT: Both dimensions/perspectives are thoroughly explored in context AND a fully satisfied, supported concluding judgement answering the prompt directly is provided.
  * CRITICAL 8-MARK EVALUATION & CONCLUSION RULE:
    When evaluation criteria are NOT fully met, or the conclusion is NOT satisfied, incomplete, or unsupported:
    Award Level 1 (1 of 2 marks) for AO3, capping the total score at 7. Only a perfect essay can receive 8.
  * ZERO NUMERIC MARKS IN PROSE: Do NOT write numerical scores, mark breakdowns, or phrases like "held at 7", "instead of 8", or "cost you marks" anywhere inside the written feedback, Examiner Summary, AO explanations, or improvement bullets. Let the UI score badges display the numbers separately.
  * FOCUS STRICTLY ON STRENGTHS & IMPROVEMENTS: Focus purely on (a) what the candidate did well economically, and (b) specific, syllabus-accurate improvements to elevate their analysis and evaluation (such as distinguishing movements onto the PPC from outward shifts, and using short-run vs. long-run criteria in the conclusion).
- NEVER state that evaluation is not required.`;
  }

  if (maxMark === 20 || split.ao3_marks >= 6) {
    return `SPECIAL DIRECTIVE FOR 20-MARK A LEVEL EXTENDED ESSAYS (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
- THIS IS A 20-MARK PAPER 4 A LEVEL EXTENDED EVALUATIVE ESSAY (${maxMark} marks total: AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).
- RIGOROUS AO1 KNOWLEDGE & THOROUGH UNDERSTANDING (+3-5% STRICTNESS):
  * Strictly demand syllabus-precise definitions and thorough conceptual grounding across all relevant economic principles.
  * Sound, precise terminology must be sustained across both microeconomic and macroeconomic dimensions. Inverted or false definitions earn 0 marks.
- THOROUGH AO2 ANALYSIS & POWERFUL REAL-WORLD APPLICATION (${split.ao2_marks} MARKS TOTAL, +3-5% STRICTNESS):
  * Analysis must be extensive, thorough, and structured across multiple perspectives (e.g. opposing mechanisms, market structures, or micro/macro impacts).
  * Enforce complete, unbroken causal transmission chains with step-by-step explanatory depth (cause -> intermediate market adjustment -> outcome on prices, output, efficiency, or welfare). Candidates MUST NOT skip intermediate steps or use compressed bullet-like assertions.
  * POWERFUL USE OF REAL-LIFE EXAMPLES: Candidates must actively integrate genuine, specific real-world examples (naming countries, specific markets, historical or contemporary policy interventions such as QE programs, specific carbon tax regimes, minimum wage legislation, or tariff disputes) directly into their causal mechanisms. Passing one-liner mentions ('e.g. healthcare' or 'like the UK') do NOT qualify for Top Band (${Math.max(10, split.ao2_marks - 2)}-${split.ao2_marks}/${split.ao2_marks}).
- STRICT AO3 SYNOPTIC EVALUATION & DECISIVE PRIORITIZATION (${split.ao3_marks} MARKS TOTAL, +3-5% STRICTNESS):
  * Evaluation is strictly mandatory out of exactly ${split.ao3_marks} marks. NEVER claim evaluation is not required.
  * Scrutinize evaluative claims with high academic rigor (+3-5% strictness).
  * Demand critical prioritization: the candidate must explicitly weigh competing considerations and justify *which* factor, constraint, time-horizon (short-run vs long-run), or elasticity condition is most decisive in context against explicit criteria.
  * Reject superficial 'it depends on' lists or unweighted pros/cons. Top Band (${Math.max(5, split.ao3_marks - 1)}-${split.ao3_marks}/${split.ao3_marks}) strictly requires sustained comparative weighing and a substantiated contextual overall judgement directly resolving the question prompt.`;
  }

  return `SPECIAL DIRECTIVE FOR 12-MARK EVALUATIVE ESSAYS (${split.ao3_marks} AO3 Evaluation Marks Allocated):
- PAPER SCOPE: THIS IS STRICTLY A CAMBRIDGE 9708 PAPER 2 (AS LEVEL) SECTION B ESSAY (${maxMark} marks total: AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}).
- NEVER mention Paper 4 or A-Level topics (NO marginal utility/utility theory, NO diminishing returns, NO indifference curves, NO monopoly/oligopoly, NO dynamic/X/Pareto efficiency, NO MRPL, NO A2 macro). Grade and advise strictly on AS Level Paper 2 content and knowledge base.
- DEFINITION FAIRNESS: Scarcity is finite or limited resources versus unlimited wants. "Finite" and "limited" are standard Cambridge synonyms; never label a basic definition of scarcity incorrect or a tautology. Do not require opportunity cost in the definition of scarcity itself.
- EVALUATION IS MANDATORY. In "ao_breakdown.evaluation", evaluate the candidate's evaluation out of exactly ${split.ao3_marks} marks.
- ZERO NUMERIC MARKS IN PROSE: Do NOT write numerical scores, mark breakdowns, or phrases like "cost you marks" anywhere inside the written feedback, Examiner Summary, AO explanations, or improvement bullets.
- FOCUS STRICTLY ON STRENGTHS & IMPROVEMENTS: Focus purely on what the candidate did well economically and specific, syllabus-accurate improvements to elevate their analysis and evaluation.`;
}

/**
 * Renders syllabus-exact AO3 level descriptors matching the exact allocated mark tariff.
 */
export function renderAo3Descriptors(maxMark: number, ao3Marks: number): string {
  if (ao3Marks === 0) {
    return `- AO3 Evaluation (0 marks): Evaluation is NOT required for this question. Candidates must not be penalised for omitting evaluation, weighing, or conclusions.`;
  }
  if (ao3Marks === 2) {
    return `- AO3 Evaluation & Concluding Judgement (2 marks total) — 8-MARK PAPER 2 (AS LEVEL) EVALUATIVE ESSAY:
      * Level 2 (2 of 2): Strictly reserved for a perfect essay where both perspectives are thoroughly evaluated in context with a fully satisfied, supported concluding judgement answering the prompt.
      * Level 1 (1 of 2): Awarded when evaluation criteria are not fully met or the concluding judgement is not fully satisfied (caps total score at 7). In written prose, do NOT mention numeric scores or phrases like "held at 7" or "instead of 8"; provide constructive AS Level improvements.
      * Level 0 (0 of 2): Purely descriptive or one-sided analysis with no evaluative weighing and no concluding judgement.`;
  }
  if (ao3Marks === 4) {
    return `- AO3 Evaluation & Question Focus (4 marks total) — 12-MARK AS ESSAY:
      * Top Band (3-4 of 4): Highly rigorous standard. Requires genuine critical evaluation and prioritization, directly answering the prompt. Compares policies against explicit economic criteria and explicitly prioritizes the decisive consideration.
      * Middle Band (2 of 4): Evaluative points present on both sides with some judgement, but comparison with alternatives is limited, criteria are listed rather than prioritized, or conclusion is a mechanical summary.
      * Lower Band (0-1 of 4): Purely one-sided assertion, token closing sentence without comparative analysis.`;
  }
  if (ao3Marks >= 6) {
    return `- AO3 Evaluation & Synoptic Synthesis (${ao3Marks} marks total) — 20-MARK A LEVEL ESSAY (+3-5% STRICTNESS):
      * Top Band (5-6 of ${ao3Marks}): Sustained, rigorous synoptic evaluation (+3-5% strictness). Evaluates critical trade-offs with explicit prioritization—explaining which constraint, assumption, or stakeholder impact is most decisive in context. Grounded in powerful real-world application and thorough understanding of micro/macro interactions, leading to a substantiated contextual overall verdict directly resolving the prompt.
      * Middle Band (3-4 of ${ao3Marks}): Clear balanced evaluation across multiple perspectives with sound economic criteria, but prioritization of decisive factors is less sustained, real-world contextualization is limited, or the concluding judgement is partially formulaic.
      * Lower Band (1-2 of ${ao3Marks}): Basic, limited evaluative comments without structured weighing, or generic unevidenced 'it depends on' lists without contextual application.
      * Zero (0 of ${ao3Marks}): No evaluative reasoning or conclusions.`;
  }
  return `- AO3 Evaluation (${ao3Marks} marks total): Evaluate the candidate's evaluative reasoning, weighing of perspectives, and concluding judgement out of ${ao3Marks} marks.`;
}

/**
 * The 8-mark AO3 allocation (2 marks) is not a single undifferentiated
 * "evaluation" bucket in how a Cambridge 9708 script is actually written:
 * candidates are expected to produce one justified evaluative point AND a
 * short overall judgement/conclusion. Both live inside the same 2-mark AO3
 * total — this is a reporting/coaching split, not a change to the fixed
 * split above, and the examiner may still award the 2 marks holistically.
 */
export const AO3_SUBSPLIT_8_MARK = {
  evaluation_marks: 1,
  conclusion_marks: 1,
} as const;

export type StructureStep = { title: string; detail: string };

export type StructureGuidance = {
  tariff: number;
  label: string;
  questionType: string;
  aoSummary: string;
  steps: StructureStep[];
  note: string;
};

/**
 * "How to structure a response" reference content, matching the approach
 * taught in class. These are a sensible default shape, not a rigid template
 * the examiner enforces — the marking prompt is explicitly told a different,
 * equally well-argued structure must never be penalised.
 */
export const STRUCTURE_GUIDANCE: Record<number, StructureGuidance> = {
  8: {
    tariff: 8,
    label: "8-mark question",
    questionType:
      "A Cambridge 9708 Paper 2 (AS Level) Section B 8-mark essay — a short, tightly-focused AS essay.",
    aoSummary: "AO1 Knowledge: 2 marks · AO2 Analysis: 4 marks · AO3 Evaluation: 2 marks",
    steps: [
      {
        title: "Knowledge (2 marks)",
        detail:
          "Define the key term(s) in the question accurately and set up the economic concept you'll use to answer it.",
      },
      {
        title: "Analysis (4 marks)",
        detail:
          "Build one or two clear chains of reasoning: define -> explain the mechanism -> analyse the effect -> apply to the context in the question. Depth matters more than the number of points at this tariff.",
      },
      {
        title: "Evaluation (1 of the 2 AO3 marks)",
        detail:
          "Make one genuinely justified evaluative point — a reason why the analysis might not hold, or a factor that determines whether it holds (e.g. elasticity, time period, market structure).",
      },
      {
        title: "Conclusion (the other 1 of the 2 AO3 marks)",
        detail:
          "Close with a brief, direct overall judgement that follows from the evaluation above — it can be short, but it must be a real answer to the question, not a restatement of it.",
      },
    ],
    note: "This 2/4/1/1 shape is a strong default for an 8-mark question, not a rigid rule — a well-argued response structured differently is never marked down for that reason alone.",
  },
  12: {
    tariff: 12,
    label: "12-mark question",
    questionType: 'A Cambridge 9708 Paper 2 (AS Level) Section B 12-mark evaluative essay ("discuss"/"assess"/"to what extent").',
    aoSummary: "AO1 Knowledge: 2 marks · AO2 Analysis: 6 marks · AO3 Evaluation: 4 marks",
    steps: [
      {
        title: "Knowledge (2 marks)",
        detail:
          "Open with two clear knowledge points — accurate definitions/concepts the essay will build its analysis from.",
      },
      {
        title: "Analysis — three points (6 marks)",
        detail:
          "Write three separate analytical points, each following define -> explain -> analyse -> apply to the specific context in the question. Roughly 2 marks of depth per point.",
      },
      {
        title: "Evaluate each analysis point (part of the 4 AO3 marks)",
        detail:
          "Immediately after each analysis point, evaluate it — is it significant, does it depend on a condition (elasticity, time frame, size of the effect), is there a counter-argument? Evaluating alongside each point (rather than only at the end) usually produces stronger, better-linked evaluation.",
      },
      {
        title: "Conclusion paragraph (remainder of the 4 AO3 marks)",
        detail:
          'Finish with a conclusion paragraph that weighs the evaluative points against each other and reaches a reasoned, ideally conditional, overall judgement (e.g. "this depends on X, because..."). A conclusion that just repeats the introduction earns little here.',
      },
    ],
    note: "This 2 knowledge points -> 3 analysis points (each evaluated) -> conclusion shape is how this is taught in class. It is a strong, reliable default — not the only valid structure — and the examiner is told never to penalise a different structure that is equally well-argued.",
  },
  20: {
    tariff: 20,
    label: "20-mark question",
    questionType:
      'A Paper 4 (A Level) extended evaluative essay ("discuss"/"assess"/"consider the extent to which") — Section B or C, EITHER/OR.',
    aoSummary:
      "AO1 Knowledge: 2 marks · AO2 Analysis: 12 marks · AO3 Evaluation: 6 marks",
    steps: [
      {
        title: "Knowledge and Understanding (2 of the 14 AO1+AO2 marks)",
        detail:
          "Open with precise, syllabus-accurate definitions and thorough conceptual grounding from which the essay builds its analysis.",
      },
      {
        title: "Analysis — thorough, multi-perspective causal chains (12 marks AO2)",
        detail:
          "At this length the mark scheme expects thorough analysis of multiple perspectives (e.g. opposing mechanisms, market structures, or micro/macro impacts), each following define -> explain -> analyse -> apply to the specific context in the question, with unbroken transmission chains and powerful use of real-life examples (naming countries, specific markets, or policy cases).",
      },
      {
        title: "Synoptic Evaluation & Critical Prioritization (part of the 6 AO3 marks)",
        detail:
          "Evaluate synoptically — weigh trade-offs, examine short-run vs long-run dynamics, test elasticity and behavioural assumptions, and prioritize which constraints or effects are most decisive in context against explicit criteria.",
      },
      {
        title: "Substantiated Conclusion (remainder of the 6 AO3 marks)",
        detail:
          "Close with a reasoned, contextual overall judgement that directly resolves the question as asked, weighing the evaluative points against each other decisively rather than offering an unweighted summary.",
      },
    ],
    note: "This extended Paper 4 structure combines thorough knowledge and understanding, comprehensive causal analysis with powerful real-life examples, and strict synoptic evaluation with decisive prioritization. Not the only valid structure — an equally well-argued response structured differently is never marked down for that reason alone.",
  },
};

export const STRUCTURE_GUIDANCE_8_LEGACY: StructureGuidance = {
  tariff: 8,
  label: "8-mark legacy question (no evaluation required)",
  questionType:
    "A legacy Cambridge 8-mark question (e.g. 'Explain...' or 'Analyse...' without evaluative keywords like 'discuss', 'consider', or 'to what extent') — pure knowledge and causal analysis.",
  aoSummary: "AO1 Knowledge: 2 marks · AO2 Analysis: 6 marks · AO3 Evaluation: 0 marks (NOT REQUIRED)",
  steps: [
    {
      title: "Knowledge and Understanding (2 marks)",
      detail:
        "Open by defining all core economic terms accurately and establishing the key economic concepts relevant to the prompt.",
    },
    {
      title: "Causal Analysis (6 marks)",
      detail:
        "Build clear, step-by-step causal transmission mechanisms (define -> explain mechanism -> analyse effects -> apply to context). Unpack each link in explanatory sentences.",
    },
  ],
  note: "This legacy question requires ONLY knowledge (2 marks) and analysis (6 marks). Evaluation, weighing of alternatives, and overall conclusions are NOT required and candidates are NOT penalized for omitting them.",
};

/**
 * Single source of truth for "how a response should be structured" across
 * every tool (grading's structure note, the essay generator's section plan,
 * the response-structure reference page). STRUCTURE_GUIDANCE has exact,
 * hand-written entries for 8, 12 and 20 — every tariff that actually exists
 * in the 9708 syllabus — so this only synthesises a shape for a genuinely
 * non-standard tariff a teacher might set, rather than letting a caller
 * invent its own structure independently.
 */
export function getStructureGuidance(maxMark: number, split?: AoSplit): StructureGuidance {
  if (maxMark === 8 && split?.ao3_marks === 0) {
    return STRUCTURE_GUIDANCE_8_LEGACY;
  }

  const exact = STRUCTURE_GUIDANCE[maxMark];
  if (exact) return exact;

  const { ao1_marks, ao2_marks, ao3_marks } = split ?? defaultSplitForMaxMark(maxMark);

  return {
    tariff: maxMark,
    label: `${maxMark}-mark question`,
    questionType: `An extended Cambridge 9708 evaluative essay worth ${maxMark} marks.`,
    aoSummary: `AO1 Knowledge: ${ao1_marks} marks · AO2 Analysis: ${ao2_marks} marks · AO3 Evaluation: ${ao3_marks} marks`,
    steps: [
      {
        title: `Knowledge (${ao1_marks} marks)`,
        detail:
          "Open by defining the key term(s) in the question accurately and setting up the economic concept(s) the essay will build its analysis from.",
      },
      {
        title: `Analysis (${ao2_marks} marks)`,
        detail:
          "Build separate, clearly signposted chains of reasoning: define -> explain the mechanism -> analyse the effect -> apply to the exact context in the question. Roughly 2 marks of depth per point.",
      },
      {
        title: `Evaluate each analysis point (part of the ${ao3_marks} AO3 marks)`,
        detail:
          "Evaluate each analytical point as you make it — is it significant, does it depend on a condition (elasticity, time frame, market structure), is there a counter-argument? — rather than leaving all evaluation to the end.",
      },
      {
        title: `Conclusion (remainder of the ${ao3_marks} AO3 marks)`,
        detail:
          "Close with a reasoned, ideally conditional, overall judgement that directly answers the question and weighs the evaluative points against each other. A conclusion that just repeats the introduction earns little here.",
      },
    ],
    note: `This ${ao1_marks}/${ao2_marks}/${ao3_marks} shape is a strong default for a ${maxMark}-mark question, not a rigid rule — a well-argued response structured differently is never marked down for that reason alone.`,
  };
}

/**
 * Renders a StructureGuidance as the numbered plain-text note used in the
 * examiner's marking prompt. Kept here (rather than duplicated per caller)
 * so the essay generator and the grader describe the exact same structure
 * in the exact same words.
 */
export function formatStructureNote(structure: StructureGuidance): string {
  return (
    `For a ${structure.label} (${structure.questionType}), a strong default shape taught to candidates is:\n` +
    structure.steps.map((step, index) => `${index + 1}. ${step.title} — ${step.detail}`).join("\n")
  );
}
