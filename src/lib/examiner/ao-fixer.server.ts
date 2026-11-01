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
  MODEL_EXAMINER,
  TEMPERATURE_EXAMINER,
} from "./config";
import { extractFirstJsonObject } from "./json";
import type { GroundingSource } from "./types";

export type AoType = "ao1" | "ao2" | "ao3";

export interface QuestionAnalysisResult {
  commandWord: string;
  guidanceLine: string;
  fullMarkRequirements: {
    ao1: {
      terms: { term: string; definition: string }[];
      commonTraps: string[];
    };
    ao2: {
      chains: { id: string; stepChain: string; mechanismFocus: string }[];
      diagramTip?: { name: string; explanation: string };
    };
    ao3: {
      steps: { title: string; instruction: string }[];
      strictCapsPlain: string[];
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
): Promise<QuestionAnalysisResult> {
  const cmd = analyzeCommandWord(question);

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
Analyze this Cambridge 12-mark essay question and extract the exact exam requirements:
Question: "${question}"
Command Analysis: ${cmd.guidanceLine}

${renderContext(sources)}

Return ONLY a JSON object:
{
  "commandWord": "${cmd.commandWord}",
  "guidanceLine": "${cmd.guidanceLine}",
  "fullMarkRequirements": {
    "ao1": {
      "terms": [
        { "term": "<key term 1>", "definition": "<exact exam-ready 1-2 line syllabus definition>" },
        { "term": "<key term 2>", "definition": "<exact exam-ready 1-2 line syllabus definition>" }
      ],
      "commonTraps": [
        "<common topic trap, e.g. confusing demand shift with supply shift>"
      ]
    },
    "ao2": {
      "chains": [
        { "id": "chain_1", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" },
        { "id": "chain_2", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" },
        { "id": "chain_3", "stepChain": "cause -> mechanism -> effect -> link to question", "mechanismFocus": "<key economic concept>" }
      ],
      "diagramTip": {
        "name": "<right diagram name, or empty if none needed>",
        "explanation": "<one sentence on what shifts, why, and what happens to P and Q. No label nitpicks.>"
      }
    },
    "ao3": {
      "steps": [
        { "title": "1. Limitation", "instruction": "Name a limitation of the main policy with an economic reason and consequence." },
        { "title": "2. Comparison on 1 criterion", "instruction": "Compare against an alternative on ONE stated criterion (speed, cost, equity, side-effects), stating which is better and when." },
        { "title": "3. Condition", "instruction": "State a condition: 'It is most effective when __ because __'." },
        { "title": "4. Final Judgement", "instruction": "Directly answer whether it is the ${cmd.commandWord} using the exact question word and ranking the factors." }
      ],
      "strictCapsPlain": [
        "No comparison with an alternative: capped at max 2/4.",
        "Hedge conclusion ('a mix of policies' / 'it depends') with no ranking or conditions: capped at max 2/4.",
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
      return parsed;
    }
  } catch (e) {
    console.warn("[ao-fixer.server] Error in structured question analysis, using fallback:", e);
  }

  // Fallback
  return {
    commandWord: cmd.commandWord,
    guidanceLine: cmd.guidanceLine,
    fullMarkRequirements: {
      ao1: {
        terms: [
          { term: "Key Concepts", definition: "Accurate, syllabus-level definition applied contextually to the prompt." },
        ],
        commonTraps: ["Do not confuse shifts of the curve with movements along it."],
      },
      ao2: {
        chains: [
          { id: "c1", stepChain: "Initial policy shock -> transmission through prices/costs -> output/market impact -> link to question", mechanismFocus: "Transmission mechanism" },
          { id: "c2", stepChain: "Secondary market reaction -> firm/consumer incentive response -> equilibrium change -> link to question", mechanismFocus: "Equilibrium adjustment" },
          { id: "c3", stepChain: "Wider economic outcome -> resource allocation -> welfare/target effect -> link to question", mechanismFocus: "Macro/Micro outcome" },
        ],
        diagramTip: {
          name: "Demand and Supply / AD-AS Equilibrium",
          explanation: "Show the initial equilibrium, shift the affected curve in the correct direction, and identify the resulting changes in equilibrium price and quantity.",
        },
      },
      ao3: {
        steps: [
          { title: "1. Limitation", instruction: "A limitation of the main point, with reason and consequence." },
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
  };
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
  },
): Promise<AoFixerMarkOutcome> {
  const { ao, question, studentText, attemptNumber, previousMark } = options;

  let maxMark = 4;
  if (ao === "ao1") maxMark = 2;
  if (ao === "ao2") maxMark = 6;
  if (ao === "ao3") maxMark = 4;

  const cmd = analyzeCommandWord(question);

  // 1. RAG retrieval
  let sources: GroundingSource[] = [];
  try {
    sources = await retrieve(supabase, {
      query: `${question}\n${studentText}`,
      matchCount: 6,
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
  const anchorBlock = buildAnchorBlock(anchors, question, 12);

  const systemPrompt = `
You are a strict official Cambridge International 9708 Economics Examiner.
You are marking a candidate's single-objective drill response for: ${ao.toUpperCase()}.
Tariff: 12-mark AS essay.

${ACCURACY_LAYER_PROMPT}

${anchorBlock}

${renderContext(sources)}

CRITICAL DRILL MARKING RULES FOR ${ao.toUpperCase()}:
- Start at the bottom of the level band and move up ONLY for quoted evidence.
- Every credit and deduction MUST be tied to a quote under 15 words from the student's text.
- If torn between two marks, give the lower one.
- Fluent, long or confident writing earns nothing on its own.
- Mark only what is written. Never credit what the student "obviously meant".

SPECIFIC OBJECTIVE STANDARDS:
${
  ao === "ao1"
    ? `AO1 Knowledge & Understanding (practice guide max 2 marks; report Table A level and descriptor):
- Precise, correct syllabus definition used in the argument earns credit.
- Definitions alone do not lift beyond basic credit if not applied.
- Deduct for imprecise or everyday phrasing. Deduct heavily for errors (e.g. hyperinflation as accelerating inflation, wrong shift direction).`
    : ao === "ao2"
      ? `AO2 Analysis (practice guide max 6 marks; Table A Level 1 [1-2], Level 2 [3-5], Level 3 [6-8]):
- Judge each argument as a chain: cause -> mechanism -> effect -> link back to question.
- Label each chain: 'complete', 'partial', or 'asserted'. Name the exact missing link for any non-complete chain.
- Level 3 requires at least 3 complete chains.
- Major errors (e.g. demand shifting supply, investment automatically raising money supply, wrong shift directions): 1 error caps AO1+AO2 at 7, 2+ errors cap at 5.`
      : `AO3 Evaluation (strictly out of 4 marks; Table B Level 1 [1], Level 2 [2], Level 3 [3-4]):
- OBEY ALL AO3 CAPS:
  * No comparison with alternative when question requires it ('${cmd.commandWord}'): MAX 2/4.
  * Conclusion is a hedge ('mix of policies', 'it depends', 'use both') with no ranking/conditions: MAX 2/4.
  * Evaluative points listed but not weighed: MAX 2/4.
  * Judgement does not answer exact question set: MAX 1/4.
  * One-sided evaluation throughout: MAX 1/4.
  * Generic evaluation: MAX 2/4.
  * 3/4 requires: developed point with reasoning, judgement answering question, AND >= 1 stated condition/criterion.
  * 4/4 requires: all of 3/4 plus weighing >= 2 factors with clear reason why one matters more.`
}

RESPONSE CONTRACT:
Return ONLY a valid JSON object matching this structure:
{
  "mark": <number: integer from 0 to ${maxMark}>,
  "maxMark": ${maxMark},
  "tableLevelLabel": "<e.g. Table A Level 3 (7/8) or Table B Level 2 (2/4)>",
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
  "modelAnswer": "<A top-mark model answer for this exact question and AO, incorporating the candidate's ideas if possible, written to Cambridge examiner perfection>",
  "confidence": <number between 0.85 and 0.99>
}
`.trim();

  const userMessage = `
QUESTION: "${question}"
STUDENT ATTEMPT (${ao.toUpperCase()}):
"""
${studentText}
"""

SILENT CHECKS BEFORE FINALISING:
1. Did I apply every relevant AO3 cap or Table A level rule?
2. Is every credit and deduction backed by a quote under 15 words?
3. Did I check for all mandatory errors (hyperinflation, shift direction, demand shifting supply, AS=AD, etc.)?
4. If torn between two marks, did I assign the lower mark?
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

  // Enforce caps deterministically on client/server output
  const activeCaps = Array.isArray(parsed.activeCapIds) ? parsed.activeCapIds : [];
  if (ao === "ao3") {
    if (activeCaps.includes("no_comparison") || activeCaps.includes("hedge_conclusion") || activeCaps.includes("unweighed_listing") || activeCaps.includes("generic_evaluation")) {
      awardedMark = Math.min(awardedMark, 2);
    }
    if (activeCaps.includes("wrong_question_judgement") || activeCaps.includes("one_sided_evaluation")) {
      awardedMark = Math.min(awardedMark, 1);
    }
  }

  const delta = typeof previousMark === "number" ? awardedMark - previousMark : undefined;

  // Model answer is only unlocked if full marks reached OR attemptNumber >= 3
  const isFullMarks = awardedMark === maxMark;
  const canUnlockModelAnswer = isFullMarks || attemptNumber >= 3;

  return {
    ao,
    mark: awardedMark,
    maxMark,
    tableLevelLabel: parsed.tableLevelLabel || (ao === "ao3" ? `Table B (${awardedMark}/4)` : `Table A (${awardedMark}/${maxMark})`),
    reasonLine: parsed.reasonLine || (activeCaps.length > 0 ? `Capped at ${awardedMark}/${maxMark}: ${activeCaps[0]}` : `Achieves ${awardedMark}/${maxMark}`),
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
  };
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
`.trim();

  const res = await chat({
    model: MODEL_EXAMINER,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  return { hint: res.text.trim() };
}
