/**
 * AO Fixer Server Engine — Cambridge 9708 Economics.
 *
 * Implements strict, single-objective practice:
 * - Shares the exact ACCURACY_LAYER_PROMPT, level bands, caps, error checks,
 *   retrieval grounding, and calibration anchors with the full essay grader.
 * - Supports question analysis, "what full marks needs", strict marking with
 *   quoted credits/gaps/caps, rewrite loops, and unlockable model answers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat } from "../ai.server";
import { renderContext, retrieve } from "../retrieval.server";
import { cleanStars, stripStars } from "@/lib/utils";
import {
  ACCURACY_LAYER_PROMPT,
  analyzeCommandWord,
  AO3_CAPS,
  TABLE_A_LEVELS,
  TABLE_B_LEVELS,
} from "./accuracy-rules";
import { buildAnchorBlock, fetchCalibrationAnchors } from "./calibration.server";
import {
  AO_DEFINITIONS,
  defaultSplitForMaxMark,
  MODEL_EXAMINER,
  TEMPERATURE_EXAMINER,
} from "./config";
import { extractFirstJsonObject } from "./json";
import { describeErrorInPlainEconomics, type GroundingSource } from "./types";

export type AoType = "ao1" | "ao2" | "ao3";

export interface QuestionAnalysisResult {
  commandWord: string;
  guidanceLine: string;
  tariff: number;
  fullMarkRequirements: {
    ao1: {
      terms: { term: string; definition: string }[];
      commonTraps: string[];
      instruction: string;
    };
    ao2: {
      chains: { id: string; stepChain: string; mechanismFocus: string }[];
      diagramTip?: { name: string; explanation: string };
      instruction: string;
    };
    ao3: {
      steps: { title: string; instruction: string }[];
      strictCapsPlain: string[];
      instruction: string;
    };
  };
}

export interface AnnotationSpan {
  quote: string;
  type: "credit" | "partial" | "error";
  tooltip: string;
  replacement?: string;
}

export interface FixItem {
  id: string;
  quote: string;
  fix: string;
  marksWorth: string;
  impactOrder: number;
}

export interface ChainEvaluation {
  id: string;
  description: string;
  status: "complete" | "partial" | "asserted";
  missingLink?: string;
}

export interface AoFixerMarkOutcome {
  ao: AoType;
  mark: number;
  maxMark: number;
  tableLevelLabel: string;
  reasonLine: string;
  delta?: number;
  annotations: AnnotationSpan[];
  whatYouDidRightQuote: string;
  whatYouDidRightComment: string;
  fixList: FixItem[];
  activeCapIds: string[];
  chainsEvaluated?: ChainEvaluation[];
  ao3Checklist?: {
    limitationChecked: boolean;
    comparisonChecked: boolean;
    conditionChecked: boolean;
    judgementChecked: boolean;
  };
  modelAnswerUnlocked?: string;
  confidence: number;
  sources: GroundingSource[];
  model: string;
  latencyMs: number;
}

/** Step 1 & 2: Precompute Question Analysis & Full Marks Requirements */
export async function analyzeQuestionForAo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  question: string,
  topic?: string | null,
  tariff: number = 12,
): Promise<QuestionAnalysisResult> {
  const cmd = analyzeCommandWord(question);
  const split = defaultSplitForMaxMark(tariff);

  let sources: GroundingSource[] = [];
  try {
    sources = await retrieve(supabase, {
      query: `${question}\nDefinitions, analytical mechanisms, mark scheme guidance, and evaluation criteria`,
      matchCount: 4,
      docTypes: ["syllabus", "mark_scheme", "coursebook", "examiner_report"],
      topicId: topic ?? null,
      minSimilarity: 0.42,
      enableHybridRrf: true,
    });
  } catch (err) {
    console.warn("[ao-fixer.server] Retrieval warning for question analysis:", err);
  }

  const prompt = `
You are a senior Cambridge 9708 Economics examiner.
Analyze this Cambridge ${tariff}-mark essay question and extract the exact exam requirements:
Question: "${question}"
Tariff: ${tariff} marks (AO1: ${split.ao1_marks}m, AO2: ${split.ao2_marks}m, AO3: ${split.ao3_marks}m)
Command Analysis: ${cmd.guidanceLine}

${renderContext(sources)}

CRITICAL FORMATTING INSTRUCTION:
Return ONLY clean plain text without any asterisks (* or **). Do not use bold markdown.

Return ONLY a JSON object:
{
  "commandWord": "${cmd.commandWord}",
  "guidanceLine": "${cmd.guidanceLine}",
  "tariff": ${tariff},
  "fullMarkRequirements": {
    "ao1": {
      "instruction": "Provide two simple definitions, examples, or formulas appropriate to this question.",
      "terms": [
        { "term": "<key term 1>", "definition": "<exact exam-ready 1-2 line syllabus definition>" },
        { "term": "<key term 2>", "definition": "<exact exam-ready 1-2 line syllabus definition>" }
      ],
      "commonTraps": [
        "<common topic trap, e.g. confusing demand shift with supply shift>"
      ]
    },
    "ao2": {
      "instruction": "${
        tariff === 8
          ? "Enter both analysis points (approx. 2 marks per complete chain: cause -> mechanism -> effect -> link to question) for 4 marks."
          : tariff === 20
            ? "Enter all your developed analysis points covering multiple sides and transmission mechanisms for 12 marks."
            : "Enter all 3 analysis points (approx. 2 marks per complete chain: cause -> mechanism -> effect -> link to question) for 6 marks."
      }",
      "chains": [
        { "id": "chain_1", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" },
        { "id": "chain_2", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" }${
          tariff >= 12
            ? `,
        { "id": "chain_3", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" }`
            : ""
        }
      ],
      "diagramTip": {
        "name": "<right diagram name, or empty if none needed>",
        "explanation": "<one sentence on what shifts, why, and what happens to P and Q. No label nitpicks.>"
      }
    },
    "ao3": {
      "instruction": "${
        tariff === 8
          ? "Write 1 evaluative point (limitation or condition) and a direct final conclusion answering the question for 2 marks."
          : tariff === 20
            ? "Write a comprehensive evaluation weighing alternative policies and reaching a conditional final judgement for 6 marks."
            : "Write your evaluation and justified final judgement in 5-8 sentences, answering the exact question for 4 marks."
      }",
      "steps": [
        { "title": "1. Limitation / Trade-off", "instruction": "Name a limitation of the main policy with an economic reason and consequence." },
        { "title": "2. Comparison on criterion", "instruction": "Compare against an alternative on ONE stated criterion (speed, cost, equity, side-effects), stating which is better and when." },
        { "title": "3. Condition", "instruction": "State a condition: 'It is most effective when __ because __'." },
        { "title": "4. Final Judgement", "instruction": "Directly answer whether it is the ${cmd.commandWord} using the exact question word and ranking the factors." }
      ],
      "strictCapsPlain": [
        "No comparison with an alternative: capped at max 2/4 (unless reasoned trade-offs provided).",
        "Hedge conclusion ('a mix of policies' / 'it depends') with no ranking or conditions: max 2/4.",
        "Points listed but not weighed or unlinked: capped at max 2/4.",
        "Judgement dodges the exact question: capped at max 1/4.",
        "One-sided evaluation throughout: capped at max 1/4."
      ]
    }
  }
}
`.trim();

  try {
    const res = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = extractFirstJsonObject(res.text) as QuestionAnalysisResult;
    if (parsed?.fullMarkRequirements?.ao1 && parsed?.fullMarkRequirements?.ao2 && parsed?.fullMarkRequirements?.ao3) {
      return cleanStars({ ...parsed, tariff });
    }
  } catch (e) {
    console.warn("[ao-fixer.server] Error in structured question analysis, using fallback:", e);
  }

  // Fallback
  return cleanStars({
    commandWord: cmd.commandWord,
    guidanceLine: cmd.guidanceLine,
    tariff,
    fullMarkRequirements: {
      ao1: {
        instruction: "Provide two simple definitions, examples, or formulas appropriate to this question.",
        terms: [
          { term: "Key Concepts", definition: "Accurate, syllabus-level definition applied contextually to the prompt." },
        ],
        commonTraps: ["Do not confuse shifts of the curve with movements along it."],
      },
      ao2: {
        instruction:
          tariff === 8
            ? "Enter both analysis points (approx. 2 marks per complete chain: cause -> mechanism -> effect -> link to question) for 4 marks."
            : tariff === 20
              ? "Enter all your developed analysis points covering multiple sides and transmission mechanisms for 12 marks."
              : "Enter all 3 analysis points (approx. 2 marks per complete chain: cause -> mechanism -> effect -> link to question) for 6 marks.",
        chains: [
          { id: "c1", stepChain: "Initial policy shock -> transmission through prices/costs -> output/market impact -> link to question", mechanismFocus: "Transmission mechanism" },
          { id: "c2", stepChain: "Secondary market reaction -> firm/consumer incentive response -> equilibrium change -> link to question", mechanismFocus: "Equilibrium adjustment" },
          ...(tariff >= 12
            ? [{ id: "c3", stepChain: "Wider economic outcome -> resource allocation -> welfare/target effect -> link to question", mechanismFocus: "Macro/Micro outcome" }]
            : []),
        ],
        diagramTip: {
          name: "Demand and Supply / AD-AS Equilibrium",
          explanation: "Show the initial equilibrium, shift the affected curve in the correct direction, and identify the resulting changes in equilibrium price and quantity.",
        },
      },
      ao3: {
        instruction:
          tariff === 8
            ? "Write 1 evaluative point (limitation or condition) and a direct final conclusion answering the question for 2 marks."
            : tariff === 20
              ? "Write a comprehensive evaluation weighing alternative policies and reaching a conditional final judgement for 6 marks."
              : "Write your evaluation and justified final judgement in 5-8 sentences, answering the exact question for 4 marks.",
        steps: [
          { title: "1. Limitation / Trade-off", instruction: "A limitation of the main point, with reason and consequence." },
          { title: "2. Comparison on ONE criterion", instruction: "Compare against an alternative on ONE named criterion, deciding which is superior." },
          { title: "3. Condition", instruction: "State: 'It is most effective when __ because __'." },
          { title: "4. Final Judgement", instruction: `Conclude using the question's exact word '${cmd.commandWord}', stating which factor dominates and why.` },
        ],
        strictCapsPlain: [
          "No comparison with an alternative: max 2/4.",
          "Hedge conclusion ('a mix of policies', 'it depends') without conditions/ranking: max 2/4.",
          "Evaluative points listed without weighing: max 2/4.",
          "Judgement dodges the exact question: max 1/4.",
          "One-sided evaluation throughout: max 1/4.",
        ],
      },
    },
  });
}

/** Step 4 & 5: Strict Marking of a Single AO Attempt */
export async function markAoAttempt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: {
    ao: AoType;
    question: string;
    studentText: string;
    attemptNumber: number;
    previousMark?: number;
    topic?: string | null;
    tariff?: number;
  },
): Promise<AoFixerMarkOutcome> {
  const { ao, question, studentText, attemptNumber, previousMark } = options;
  const tariff = options.tariff || 12;
  const split = defaultSplitForMaxMark(tariff);

  let maxMark = split.ao3_marks;
  if (ao === "ao1") maxMark = split.ao1_marks; // always 2
  if (ao === "ao2") maxMark = split.ao2_marks; // 4 (8m), 6 (12m), 12 (20m)
  if (ao === "ao3") maxMark = split.ao3_marks; // 2 (8m), 4 (12m), 6 (20m)

  const cmd = analyzeCommandWord(question);

  // -------------------------------------------------------------
  // ULTRA-FAST PATH FOR AO1 (Knowledge & Understanding — Max 2m)
  // Per specification: Just 2 simple definitions appropriate to question,
  // related examples, formulas, or any real show of economic knowledge.
  // -------------------------------------------------------------
  if (ao === "ao1") {
    let sources: GroundingSource[] = [];
    try {
      sources = await retrieve(supabase, {
        query: `${question} syllabus definitions and key concepts`,
        matchCount: 2,
        docTypes: ["syllabus", "mark_scheme"],
        topicId: options.topic ?? null,
        minSimilarity: 0.45,
      });
    } catch {
      // Non-blocking retrieval fallback
    }

    const ao1Prompt = `
You are a senior Cambridge 9708 Economics Examiner marking AO1 (Knowledge & Understanding) for a ${tariff}-mark question.
Tariff: ${tariff} marks. Max available for AO1 is STRICTLY 2 marks.

QUESTION: "${question}"
STUDENT ATTEMPT (AO1):
"""
${studentText}
"""

${renderContext(sources)}

CAMBRIDGE AO1 MARKING RULES (STRICTLY OUT OF 2 MARKS):
Reward ANY real show of economic knowledge appropriate to the question:
- Just two simple definitions appropriate to the question.
- Relevant real-world examples or diagrams if related.
- Formulas and foundational economic models.
- Any genuine display of economic knowledge.
AWARDING MARKS:
- 2/2 marks: Candidate provides TWO clear, appropriate definitions, examples, formulas, or real shows of economic knowledge.
- 1/2 mark: Candidate provides ONE accurate definition, example, formula, or show of economic knowledge.
- 0/2 marks: Completely off-topic, unrelated, or factually incorrect claims.

DO NOT penalize for lack of long analytical chains, diagrams, or evaluation. This is strictly AO1.
NO ASTERISKS: Return ONLY plain text strings with ZERO asterisks (* or **).

Return ONLY a JSON object:
{
  "mark": <0 | 1 | 2>,
  "maxMark": 2,
  "tableLevelLabel": "AO1 Knowledge (<mark>/2)",
  "reasonLine": "<one concise sentence stating whether 1 or 2 knowledge points were credited>",
  "annotations": [
    {
      "quote": "<exact quote under 15 words>",
      "type": "<credit | partial | error>",
      "tooltip": "<concise explanation>"
    }
  ],
  "whatYouDidRightQuote": "<exact quote under 15 words>",
  "whatYouDidRightComment": "<one clear sentence explaining why this meets Cambridge criteria>",
  "fixList": [
    {
      "id": "fix_1",
      "quote": "<quote of missing or weak term/concept>",
      "fix": "<one sentence actionable instruction>",
      "marksWorth": "+1 mark",
      "impactOrder": 1
    }
  ],
  "modelAnswer": "<An exam-ready 2-sentence response demonstrating the 2 knowledge points for full marks>",
  "confidence": 0.96
}
`.trim();

    const res = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      messages: [{ role: "user", content: ao1Prompt }],
    });

    const parsed = extractFirstJsonObject(res.text) as any;
    let awardedMark = typeof parsed.mark === "number" ? Math.min(2, Math.max(0, Math.round(parsed.mark))) : 0;
    const delta = typeof previousMark === "number" ? awardedMark - previousMark : undefined;
    const isFullMarks = awardedMark === 2;
    const canUnlockModelAnswer = isFullMarks || attemptNumber >= 3;

    return cleanStars({
      ao: "ao1",
      mark: awardedMark,
      maxMark: 2,
      tableLevelLabel: parsed.tableLevelLabel || `AO1 Knowledge (${awardedMark}/2)`,
      reasonLine: parsed.reasonLine || (awardedMark === 2 ? "Full credit: Two accurate knowledge points established." : "One accurate knowledge point credited. Add a second definition or example for full marks."),
      delta,
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      whatYouDidRightQuote: parsed.whatYouDidRightQuote || studentText.slice(0, 40) + "...",
      whatYouDidRightComment: parsed.whatYouDidRightComment || "Accurate economic concept applied to the question prompt.",
      fixList: Array.isArray(parsed.fixList) ? parsed.fixList : [],
      activeCapIds: [],
      modelAnswerUnlocked: canUnlockModelAnswer ? parsed.modelAnswer : undefined,
      confidence: parsed.confidence ?? 0.96,
      sources,
      model: res.model || MODEL_EXAMINER,
      latencyMs: res.latencyMs,
    });
  }

  // -------------------------------------------------------------
  // PATH FOR AO2 (Analysis) & AO3 (Evaluation)
  // -------------------------------------------------------------
  // 1. RAG retrieval
  let sources: GroundingSource[] = [];
  try {
    sources = await retrieve(supabase, {
      query: `${question}\n${studentText}`,
      matchCount: 4,
      docTypes: ["syllabus", "mark_scheme", "coursebook", "examiner_report"],
      topicId: options.topic ?? null,
      minSimilarity: 0.45,
      enableHybridRrf: true,
    });
  } catch (err) {
    console.warn("[ao-fixer.server] Retrieval warning for marking:", err);
  }

  // 2. Calibration anchors
  let anchors: any[] = [];
  try {
    anchors = await fetchCalibrationAnchors(supabase);
  } catch (err) {
    console.warn("[ao-fixer.server] Anchors fetch warning:", err);
  }
  const anchorBlock = buildAnchorBlock(anchors, question, tariff);

  const systemPrompt = `
You are a senior official Cambridge International 9708 Economics Examiner.
You are marking a candidate's single-objective drill response for: ${ao.toUpperCase()}.
Tariff: ${tariff}-mark essay (AO1: ${split.ao1_marks}m, AO2: ${split.ao2_marks}m, AO3: ${split.ao3_marks}m).
Target for this drill: STRICTLY out of ${maxMark} marks.

${ACCURACY_LAYER_PROMPT}

${anchorBlock}

${renderContext(sources)}

CRITICAL DRILL MARKING RULES FOR ${ao.toUpperCase()}:
- Every credit and deduction MUST be tied to a quote under 15 words from the student's text.
- Fluent, long or confident writing earns nothing on its own.
- Mark only what is written.
- NO ASTERISKS: Return ONLY clean plain text with ZERO asterisks (* or **). Do not use bold markdown or bullet asterisks.

SPECIFIC OBJECTIVE STANDARDS:
${
  ao === "ao2"
    ? `AO2 Analysis (strictly out of ${maxMark} marks):
- Judge each argument as a chain: cause -> mechanism -> effect -> link back to question.
- Chains should be clear, detailed, and logical (not complicated, not weird).
- Tell the student whether each required analysis point is present and developed.
${
  tariff === 8
    ? "- Tariff 8 marks: candidate needs 2 complete causal chains (~2 marks per complete chain, max 4 marks)."
    : tariff === 20
      ? "- Tariff 20 marks: candidate needs comprehensive analytical progression covering multiple sides and transmission mechanisms (max 12 marks)."
      : "- Tariff 12 marks: candidate needs 3 complete causal chains (~2 marks per complete chain, max 6 marks). Level 3 requires all 3 complete chains."
}
- Major errors (e.g. demand shifting supply, investment automatically raising money supply, wrong shift directions): 1 major error caps AO2.`
    : `AO3 Evaluation (strictly out of ${maxMark} marks):
- STRICT CAMBRIDGE EXAMINER STANDARD:
  * Start from the bottom of the level the evidence supports and move up only for quoted evidence. If torn, give the lower mark.
  * 3 marks (or proportional Level 3) needs: a developed evaluative point, a judgement answering the exact question, AND a stated condition or criterion.
  * 4 marks (or top mark) needs that plus weighing two factors with a reason one matters more.
  * Listing alternatives is never comparing. Do not credit it as comparison unless an explicit criterion and a verdict are present.
- Table B Strict Caps:
  * No comparison with alternative when question requires it ('${cmd.commandWord}'): max ${Math.round(maxMark * 0.5)}/${maxMark}.
  * Conclusion is an unranked hedge ('mix of policies', 'it depends', 'use a combination') without conditions or ranking: max ${Math.round(maxMark * 0.5)}/${maxMark}.
  * Judgement answers a different question or dodges exact question set: max 1/${maxMark}.
  * Purely one-sided evaluation throughout: max 1/${maxMark}.
  * No evaluation attempted: 0 marks.`
}

RESPONSE CONTRACT:
Return ONLY a valid JSON object matching this structure:
{
  "mark": <number: integer from 0 to ${maxMark}>,
  "maxMark": ${maxMark},
  "tableLevelLabel": "<e.g. Table A (${maxMark}/${maxMark}) or Table B (${maxMark}/${maxMark})>",
  "reasonLine": "<one concise line giving the exact level or cap reason>",
  "annotations": [
    {
      "quote": "<exact quote under 15 words from student text>",
      "type": "<credit | partial | error>",
      "tooltip": "<concise explanation of why this was credited, why it is partial, or what the error is>",
      "replacement": "<optional correct economic replacement if partial or error>"
    }
  ],
  "whatYouDidRightQuote": "<exact quote under 15 words>",
  "whatYouDidRightComment": "<one clear sentence explaining why this meets Cambridge criteria>",
  "fixList": [
    {
      "id": "fix_1",
      "quote": "<exact quote under 15 words of the weak or missing part>",
      "fix": "<one sentence actionable instruction to fix this specific link>",
      "marksWorth": "<e.g. +1 mark>",
      "impactOrder": 1
    }
  ],
  "activeCapIds": [<array of cap ids that currently apply: "no_comparison" | "hedge_conclusion" | "unweighed_listing" | "wrong_question_judgement" | "one_sided_evaluation" | "generic_evaluation">],
  "chainsEvaluated": [
    {
      "id": "c1",
      "description": "<brief description of the chain>",
      "status": "<complete | partial | asserted>",
      "missingLink": "<exact missing transmission link, if any>"
    }
  ],
  "ao3Checklist": {
    "limitationChecked": <boolean>,
    "comparisonChecked": <boolean>,
    "conditionChecked": <boolean>,
    "judgementChecked": <boolean>
  },
  "modelAnswer": "<A top-mark model answer for this exact question and AO, incorporating candidate ideas if possible, written to Cambridge examiner perfection>",
  "confidence": <number between 0.85 and 0.99>
}
`.trim();

  const userMessage = `
QUESTION: "${question}"
TARIFF: ${tariff} marks (Max for this objective: ${maxMark})
STUDENT ATTEMPT (${ao.toUpperCase()}):
"""
${studentText}
"""

SILENT CHECKS BEFORE FINALISING:
1. Did I apply strict Cambridge level rules and Table B caps? If torn, did I give the lower mark?
2. Is every credit and deduction backed by a quote under 15 words?
3. Did I check for mandatory errors (hyperinflation, shift direction, demand shifting supply, AS=AD)?
4. Are all strings free of asterisks?
`.trim();

  const res = await chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = extractFirstJsonObject(res.text) as any;
  let awardedMark = typeof parsed.mark === "number" ? Math.min(maxMark, Math.max(0, Math.round(parsed.mark))) : 0;

  // Enforce caps deterministically with strict Cambridge rules (no slack)
  const activeCaps = Array.isArray(parsed.activeCapIds) ? parsed.activeCapIds : [];
  if (ao === "ao3") {
    if (activeCaps.includes("wrong_question_judgement") || activeCaps.includes("one_sided_evaluation")) {
      awardedMark = Math.min(awardedMark, 1);
    } else if (
      activeCaps.includes("no_comparison") ||
      activeCaps.includes("hedge_conclusion") ||
      activeCaps.includes("unweighed_listing") ||
      activeCaps.includes("generic_evaluation")
    ) {
      awardedMark = Math.min(awardedMark, Math.round(maxMark * 0.5));
    }
  }

  let formattedReasonLine = parsed.reasonLine;
  if (!formattedReasonLine || activeCaps.length > 0) {
    if (activeCaps.length > 0) {
      const plainError = describeErrorInPlainEconomics(activeCaps[0]);
      formattedReasonLine = `Capped at ${awardedMark}/${maxMark}: ${plainError}`;
    } else {
      formattedReasonLine = `Achieves ${awardedMark}/${maxMark}`;
    }
  } else {
    for (const cap of activeCaps) {
      formattedReasonLine = formattedReasonLine.replace(new RegExp(cap, "gi"), describeErrorInPlainEconomics(cap));
    }
  }

  const delta = typeof previousMark === "number" ? awardedMark - previousMark : undefined;

  // Model answer is only unlocked if full marks reached OR attemptNumber >= 3
  const isFullMarks = awardedMark === maxMark;
  const canUnlockModelAnswer = isFullMarks || attemptNumber >= 3;

  return cleanStars({
    ao,
    mark: awardedMark,
    maxMark,
    tableLevelLabel: parsed.tableLevelLabel || (ao === "ao3" ? `Table B (${awardedMark}/${maxMark})` : `Table A (${awardedMark}/${maxMark})`),
    reasonLine: formattedReasonLine,
    delta,
    annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
    whatYouDidRightQuote: parsed.whatYouDidRightQuote || (studentText.slice(0, 40) + "..."),
    whatYouDidRightComment: parsed.whatYouDidRightComment || "Clear economic terminology applied to the context.",
    fixList: Array.isArray(parsed.fixList) ? parsed.fixList : [],
    activeCapIds: activeCaps,
    chainsEvaluated: Array.isArray(parsed.chainsEvaluated) ? parsed.chainsEvaluated : undefined,
    ao3Checklist: parsed.ao3Checklist,
    modelAnswerUnlocked: canUnlockModelAnswer ? parsed.modelAnswer : undefined,
    confidence: parsed.confidence ?? 0.95,
    sources,
    model: res.model || MODEL_EXAMINER,
    latencyMs: res.latencyMs,
  });
}

/** Generate a gentle, non-revealing hint */
export async function getAoHint(
  ao: AoType,
  question: string,
  studentText: string,
): Promise<{ hint: string }> {
  const prompt = `
You are an encouraging Cambridge 9708 Economics coach.
The student is practicing ${ao.toUpperCase()} for this question: "${question}".
Their current draft is: "${studentText || "(blank)"}".

Give ONE short, constructive nudge (max 2 sentences) telling them what economic mechanism or structure to focus on next.
DO NOT write the answer or give away the solution.
NO ASTERISKS: Plain text only.
`.trim();

  const res = await chat({
    model: MODEL_EXAMINER,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  return cleanStars({ hint: stripStars(res.text.trim()) });
}
