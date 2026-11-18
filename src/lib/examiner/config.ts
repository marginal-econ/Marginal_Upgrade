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
export const MODEL_EMBEDDING = "mistral-embed-2312";

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
 * Tariff-specific syllabus scope directive.
 * Prevents A-Level (Paper 4) essays from ever being penalized for using A2 concepts,
 * and prevents AS-Level (Paper 2) essays from being judged against A2 topics.
 */
export function buildPaperScopeDirective(maxMark: number): string {
  if (maxMark >= 20) {
    return `PAPER SCOPE — CAMBRIDGE 9708 PAPER 4 (A LEVEL / A2 EXTENDED ESSAYS):
- This ${maxMark}-mark question is strictly Cambridge 9708 Paper 4 (A Level). NEVER refer to it as AS Level or Paper 2.
- FULL A-LEVEL (A2) SYLLABUS THEORY IS EXPECTED AND REWARDED POSITIVELY:
  * Microeconomics (Units 6–7): Diminishing marginal utility, equi-marginal principle (MUa/Pa = MUb/Pb), indifference curves & budget lines (income and substitution effects), cost/revenue theory, law of diminishing returns, market structures (perfect competition, monopoly, oligopoly, game theory/pay-off matrices, contestable markets, monopolistic competition, price discrimination), allocative/productive/dynamic/X-efficiency, labour markets (MRPL, monopsony, trade unions, transfer earnings & economic rent), externalities/market failure & government failure.
  * Macroeconomics & International (Units 8–10): Keynesian multiplier & accelerator, liquidity preference & liquidity trap, Monetarist vs Keynesian transmission, expectations-augmented Phillips curve, supply-side & fiscal/monetary policy mixes, Marshall-Lerner condition, J-curve, globalisation, Gini/Lorenz inequality, economic development.
- NEVER penalise a Paper 4 candidate for using A-Level concepts such as the equi-marginal principle, indifference curves, MRPL, game theory, or multiplier-accelerator.`;
  }

  return `PAPER SCOPE — STRICT CAMBRIDGE 9708 PAPER 2 (AS LEVEL ONLY):
- This ${maxMark}-mark question is strictly Cambridge 9708 Paper 2 (AS Level).
- ABSOLUTE PROHIBITION OF A-LEVEL (A2 / PAPER 4) CONCEPTS:
  Do NOT demand, mention, or suggest ANY A-Level-only topics in your assessment (summary, AO comments, weaknesses, missing elements, feedback, resources):
  * NO marginal utility / diminishing marginal utility / equi-marginal principle / indifference curves / budget lines.
  * NO law of diminishing returns / returns to scale / MRPL / labour market wage theory.
  * NO market structures (monopoly, oligopoly, monopolistic competition, contestability, game theory, price discrimination).
  * NO dynamic efficiency, X-inefficiency, or Pareto efficiency (AS covers only productive & allocative efficiency).
  * NO A2 macro (expectations-augmented Phillips curve, multiplier formula k=1/MPW, accelerator, Gini/Lorenz).
- Grade and advise strictly on AS Level Paper 2 content.`;
}

/**
 * Builds the authoritative examiner directive for evaluation based on the question tariff.
 * For 8-mark questions, strictly distinguishes evaluative (AO1: 2, AO2: 4, AO3: 2) from
 * non-evaluative legacy (AO1: 2, AO2: 6, AO3: 0).
 */
export function buildAoEvaluationDirective(maxMark: number, split: AoSplit): string {
  if (split.ao3_marks === 0) {
    return `TARIFF DIRECTIVE — NON-EVALUATIVE LEGACY ESSAY (${maxMark}m · AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: 0):
- Pure explanatory/analytical question. EVALUATION IS NOT REQUIRED; never penalise omitting evaluation or a conclusion.
- Set ao_breakdown.evaluation = { awarded: 0, out_of: 0, comment: "Evaluation is not required for this question. No marks are lost for its omission." } and missing_elements.evaluation = [].`;
  }

  if (maxMark === 8 && split.ao3_marks === 2) {
    return `TARIFF DIRECTIVE — 8-MARK PAPER 2 (AS LEVEL) EVALUATIVE ESSAY (~15 min, ~200–350 words · AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
- Do NOT penalise omitting peripheral syllabus topics when 1–2 core mechanisms are well explained.
- AO3 (2 marks): Award 2/2 (Level 2) for a clear counter-argument/balanced perspective PLUS a reasoned concluding judgement directly answering the prompt; 1/2 (Level 1) for a brief/unsupported evaluative comment; 0/2 for purely one-sided analysis.`;
  }

  if (maxMark === 20 || split.ao3_marks >= 6) {
    return `TARIFF DIRECTIVE — OFFICIAL CAMBRIDGE 9708 PAPER 4 (A LEVEL) 20-MARK EXTENDED ESSAY (~40–45 min · AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
Apply official Cambridge 9708 Paper 4 Table A (AO1+AO2 combined out of 14, mapped to AO1=2 + AO2=12) and Table B (AO3 out of 6):
- TABLE A — AO1 KNOWLEDGE (2) + AO2 ANALYSIS (12) = 14 MARKS TOTAL:
  * Level 3 (11–14 combined -> AO1=2, AO2=9–12): Detailed knowledge and understanding with relevant explanations, supported by examples WHERE APPROPRIATE. Clearly addresses the question and fully develops multi-perspective causal chains. Accurate, well-explained analytical tools (diagrams, formulae, or pay-off matrices) where used. Well-organised, logical, and coherent.
    - High Level 3 (13–14 combined: AO1=2, AO2=11–12): Sustained, thorough multi-perspective analysis with precise A-Level theory and strong contextual/model application.
    - Mid/Low Level 3 (11–12 combined: AO1=2, AO2=9–10): Developed, accurate analysis across key perspectives, with minor compression or one secondary angle less developed.
  * Level 2 (6–10 combined -> AO1=1–2, AO2=5–8): Sound knowledge of some relevant concepts, though explanations/examples are limited, overgeneralised, or contain inaccuracies. Addresses the general theme with limited development; analysis is generally accurate but lacks full step-by-step detail or misses a major part of the prompt.
    - Strong Level 2 (9–10 combined: AO1=2, AO2=7–8): Clear valid mechanisms, but compressed chains, limited breadth, or a notable analytical slip.
    - Mid/Low Level 2 (6–8 combined: AO1=1–2, AO2=5–6): Basic valid points mixed with unsupported assertions or a significant conceptual error (e.g. claiming profit-maximising monopolies "overproduce" instead of restricting output where MR=MC).
  * Level 1 (1–5 combined -> AO1=0–1, AO2=1–4): Small number of relevant knowledge points limited by significant errors or omissions; largely descriptive or built on inverted/false causal mechanisms.
  * Level 0 (0): No creditable response.
- EXAMPLES RULE FOR PAPER 4 (OFFICIAL CAMBRIDGE): Follow Table A — "supported by examples, WHERE APPROPRIATE." For pure A-Level micro theory essays (utility theory, indifference curves, oligopoly game theory/pay-off matrix, contestable markets, market structure efficiency, MRPL/monopsony), rigorous theoretical models, diagrams, numerical illustrations, or pay-off matrices qualify fully for Level 3 AO2 without requiring named countries. For applied macro or policy essays, contextual real-world application strengthens analysis.
- TABLE B — AO3 EVALUATION (${split.ao3_marks} MARKS TOTAL, MANDATORY):
  * Level 2 (4–6 of 6): Provides a justified conclusion/judgement addressing the specific requirements of the question AND makes developed, reasoned, well-supported evaluative comments.
    - 6/6: Sustained, prioritized evaluation weighing competing conditions/trade-offs (SR vs LR, assumptions/limitations, magnitude, elasticity, stakeholder impacts) culminating in a decisive contextual verdict directly resolving the prompt.
    - 5/6: Developed, reasoned evaluative points weighing key trade-offs/limitations and a clear justified conclusion addressing the prompt.
    - 4/6: Reasoned evaluative comments with some development and a relevant supported conclusion, though prioritization or depth is partial.
  * Level 1 (1–3 of 6): Vague/general conclusion or simple evaluative comments with little development or supporting evidence.
    - 3/6: Multiple valid but undeveloped caveats ("depends on X, Y, Z") with a general conclusion.
    - 2/6: Brief counter-argument or limited evaluative remark with a formulaic conclusion.
    - 1/6: Single token evaluative sentence or unsupported closing assertion.
  * Level 0 (0 of 6): No creditable evaluation.
- TIMED EXAM REALISM: Real 40-minute handwritten Paper 4 scripts (especially with diagrams or pay-off matrices) often run 500–850 words. Judge by analytical depth, conceptual accuracy, and evaluative quality — NOT encyclopedic length.`;
  }

  return `TARIFF DIRECTIVE — 12-MARK PAPER 2 (AS LEVEL) EVALUATIVE ESSAY (~25–30 min, ~350–550 words · AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
- Higher standard than 8-mark, but realistic for timed AS conditions; do NOT penalise omitting peripheral topics when 2–3 core mechanisms are well developed.
- Top Band (10–12/12: AO1=2, AO2=5–6, AO3=3–4): 2–3 well-explained causal chains with relevant application/examples, balanced evaluation against clear economic criteria (elasticity, timeframe, magnitude, stakeholders), and a reasoned concluding judgement answering the prompt.`;
}

/**
 * Renders syllabus-exact AO3 level descriptors matching the exact allocated mark tariff.
 */
export function renderAo3Descriptors(maxMark: number, ao3Marks: number): string {
  if (ao3Marks === 0) {
    return `- AO3 Evaluation (0 marks): Evaluation is NOT required. Award 0/0 with zero penalty.`;
  }
  if (ao3Marks === 2) {
    return `- AO3 Evaluation (2 marks — Paper 2 8m):
      * Level 2 (2/2): Counter-argument or balanced perspective + supported concluding judgement addressing the prompt.
      * Level 1 (1/2): Brief evaluative comment or unsupported concluding assertion.
      * Level 0 (0/2): Purely descriptive/one-sided with no evaluation.`;
  }
  if (ao3Marks === 4) {
    return `- AO3 Evaluation (4 marks — Paper 2 12m):
      * Level 2 Top (3–4/4): Balanced critical evaluation weighing perspectives against economic criteria (elasticity, timeframe, magnitude, stakeholders) + reasoned concluding judgement answering the prompt.
      * Level 1/2 Borderline (2/4): Both sides noted, but caveats are listed rather than weighed, or conclusion is mechanical.
      * Level 1 Low (0–1/4): One-sided assertion or token closing sentence.`;
  }
  if (ao3Marks >= 6) {
    return `- AO3 Evaluation (${ao3Marks} marks — Official Cambridge 9708 Paper 4 Table B):
      * Level 2 (4–6 of ${ao3Marks}): Justified conclusion/judgement addressing the specific prompt + developed, reasoned, well-supported evaluative comments (6 = sustained prioritization + decisive verdict; 5 = developed weighing + clear justified verdict; 4 = reasoned evaluation + relevant conclusion with partial prioritization).
      * Level 1 (1–3 of ${ao3Marks}): Vague/general conclusion or simple undeveloped evaluative comments (3 = multiple undeveloped caveats; 2 = brief counter-argument/formulaic ending; 1 = single token remark).
      * Level 0 (0 of ${ao3Marks}): No creditable evaluation.`;
  }
  return `- AO3 Evaluation (${ao3Marks} marks): Assess evaluative weighing and concluding judgement out of ${ao3Marks}.`;
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
