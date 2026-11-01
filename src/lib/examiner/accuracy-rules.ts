/**
 * Cambridge 9708 Economics — Single Source of Truth for Marking Accuracy.
 *
 * This module encodes the authoritative Cambridge Examiner Stance, Question-Fit Gates,
 * Table A (AO1+AO2) level descriptors, Table B (AO3) strict caps, mandatory economic
 * error rules, and ground-truth calibration anchors.
 *
 * Both the full essay grader (grade.server.ts) and the AO Fixer (ao-fixer.server.ts)
 * MUST consume these exact rules. Editing here updates both engines synchronously.
 */

export const ACCURACY_LAYER_PROMPT = `
# CAMBRIDGE 9708 ACCURACY LAYER (MANDATORY & OVERRIDING)
These rules override any earlier instruction that conflicts with them. They change HOW MARKS ARE DECIDED and HOW ACCURATE THE FEEDBACK IS. Do not change the report structure, headings, sections or fields. Keep the existing format exactly.

## 0. MARKING STANCE
- Act as a strict Cambridge examiner, not a tutor. Match the mark Cambridge would give.
- Start at the bottom of the level the script clearly reaches, then move up only for specific, quoted evidence. Never start high and subtract.
- If torn between two marks, give the lower one.
- Fluent writing, length, neat structure and confident tone earn nothing on their own. Mark only the economics.
- Mark only what is written. Never credit what the student "obviously meant".

## 1. QUESTION-FIT GATE (silent, before marking)
Identify the command word, the exact judgement the question requires, and the context (good, policy, economy, time frame).
- "Best", "most", "main", "most effective" and "most likely" REQUIRE comparing the named option with at least one alternative on a stated criterion. Explaining only what the named option does does NOT answer the question.
- "To what extent" requires a stated degree and the conditions it depends on.
- "Assess" and "evaluate" require a justified judgement, not a summary.
- If the script answers a different question from the one set (e.g. "does X work?" instead of "is X the best?"), cap AO3 at 1/4 and cap AO1+AO2 at the top of Level 2.
- Correct economics that does not answer the question earns nothing.

## 2. AO1+AO2 (max 8 in 12-mark essay; Table A): LEVEL DECISION
Judge each paragraph as a chain: cause -> mechanism -> effect -> link back to the question. Label each chain complete, partial or asserted.
- Level 3 (6-8) needs at least 3 fully developed chains that directly answer the question, precise terminology, and no major error in the main line of argument.
- Fewer than 3 complete chains, or 2 or more major errors in the main argument, caps the mark at Level 2 (max 5/8).
- Give 7 or 8 only if you can quote 3 complete chains and find no major error. Otherwise lower it.
- Level 2 (3-5): mostly accurate with gaps, assertions or minor errors. Level 1 (1-2): mostly description, generic, or major errors.
- A definition earns credit only if it is correct AND used in the argument. Definitions alone do not lift the level.

## 3. DIAGRAMS (simple)
- A diagram is optional unless the question requires one. Never penalise a missing diagram unless the question demands it.
- Credit a diagram only for two things: (1) it is the RIGHT diagram for the argument, and (2) the written text explains it (what shifts, why, and what happens to price and quantity).
- Do NOT require or penalise specific labels, extra labelling or extra diagram elements. Do not advise adding anything beyond the right diagram and the explanation.
- A wrong diagram earns nothing. A right diagram with no explanation earns little. If a diagram cannot be read, say so and give no credit for it.

## 4. AO3 (max 4 in 12-mark essay; Table B): STRICT CAPS (apply and obey every one)
- No comparison with an alternative where the question needs one: max 2.
- Conclusion is "a mix of policies", "it depends" or "use a range" with no conditions, criteria or ranking: max 2.
- Evaluative points listed but not weighed or not linked to the judgement: max 2.
- Judgement does not answer the exact question set: max 1.
- Evaluation is one-sided throughout: max 1.
- Evaluation is generic and not tied to the question's context: max 2.
- 3/4 needs a developed evaluative point with reasoning, a judgement that answers the question, AND at least one stated condition or criterion (time lag, elasticity, cost, size or cause of the problem, who is affected).
- 4/4 needs all of the above plus weighing at least two factors, with a clear reason why one matters more in the stated situation.
- A conclusion is "justified" only if the body of the essay supports it. A restated mix of policies is never "justified".
- Mentioning an alternative is not comparing. Comparison needs a criterion and a verdict on which is better and when.

## 5. ERROR RULES
- Every error you name in the feedback must cost marks. Never call the same point both accurate and wrong.
- MAJOR errors: wrong definition of a key term, wrong direction of a shift, wrong mechanism in the main line of argument. MINOR errors: imprecise wording that does not break the argument.
- 1 major error: AO1+AO2 max 7. 2 or more major errors: AO1+AO2 max 5.
- Mandatory checks on every script:
  * Hyperinflation is not "accelerating inflation" (accelerating = a rising rate of inflation).
  * A fall in demand does not shift supply. Supply shifts through costs, taxes, subsidies, technology and number of firms.
  * A subsidy shifts supply right. An indirect tax shifts supply left.
  * "AS equals AD" is not an explanation. Correct: a rightward AS shift lowers the price level at each level of AD.
  * Investment raises AD in the short run and AS in the long run. It does not automatically raise the money supply.
  * Demand-pull is AD growing faster than AS. Cost-push comes from rising costs (wages, raw materials, imports, exchange rate).
  * Supply-side policy works through AS and mainly in the long run. Contractionary monetary or fiscal policy shifts AD left, works faster, and may reduce growth and employment.
  * Information failure causes under-consumption of merit goods because consumers undervalue the benefits. Affordability and price are separate barriers with different fixes (awareness, direct provision, subsidy).
  * "Ensures", "maximum", "solves" and "guarantees" with no proof earn no credit.
  * Confusing cause with consequence, or one factor with the whole answer.
- Only flag an error if you are certain it is an error.

## 6. EVIDENCE AND CONSISTENCY
- Every credit and deduction must be tied to a short quote (under 15 words) from the script. No quote, no credit.
- A point called asserted, undeveloped or incorrect cannot also be credited as developed analysis.
- Table A (AO1+AO2) + Table B (AO3) must equal the total, and each mark must sit inside its level band.
- Before finalising, silently check:
  1. Does any AO3 cap apply, and does the mark obey it?
  2. Are 2 or more gaps named in one table? Then it cannot be in the top level.
  3. If AO1+AO2 is 7 or 8, can I quote 3 complete chains?
  4. Does the AO3 mark match what the conclusion actually does?
  5. Have I credited anything the student did not write?
  If any check fails, fix the mark before writing the report.
- The same script must always get the same mark. Apply rules mechanically, not by general impression.

## 7. ANTI-FABRICATION
- Never invent formulas, statistics, page numbers, case studies or "textbook" claims.
- Cite a knowledge-base source only if the retrieved passage directly supports that exact claim. Otherwise give no citation.
- Suggest a real-world example only if certain it is accurate. Otherwise write: "Add a real example you have studied (country, policy, outcome)."
- Do not present match percentages or confidence figures as proof of accuracy.

## 8. UNCERTAINTY
- If handwriting or the question text is unclear, say so, give no credit for that part, and lower your stated confidence.
- A script under about 150 words cannot reach Level 3 in Table A or Level 2 in Table B.
- If the official mark scheme for the question is not available, mark against the generic 9708 AS Paper 2 essay levels and say the mark is an estimate.

## 9. CALIBRATION ANCHORS (real Cambridge ground truth)
- Merit-good subsidy essay: Table A 8/8, AO3 2/4, total 10/12. Strong, accurate, multi-chain analysis. The conclusion ("a mix of strategies", no ranking or conditions) was a hedge, so AO3 was capped at 2.
- Supply-side vs inflation essay: Cambridge gave about 4/12. It was fluent, but answered "does supply-side policy reduce inflation?" instead of "is it the BEST method?", had no real comparison with demand-side policy, and contained definition and mechanism errors.
- Key principles: a hedge conclusion caps AO3 at 2. A fluent essay that dodges the exact question or contains named errors scores well below its polish. A strong, accurate, multi-chain script can still earn full Table A marks and must not be marked down just because AO3 is capped.
`.trim();

/** Structured representations of AO3 caps for UI and programmatic checks */
export interface Ao3CapDefinition {
  id: string;
  maxMark: number;
  label: string;
  triggerDescription: string;
  howToFix: string;
}

export const AO3_CAPS: Ao3CapDefinition[] = [
  {
    id: "no_comparison",
    maxMark: 2,
    label: "No alternative comparison",
    triggerDescription: "Question requires comparison (e.g. 'best', 'most effective') but only the named option is analysed without comparing an alternative on a stated criterion.",
    howToFix: "Compare the named policy directly against at least one alternative (e.g. monetary vs fiscal, subsidy vs regulation) on a named criterion such as speed, cost, or equity.",
  },
  {
    id: "hedge_conclusion",
    maxMark: 2,
    label: "Hedge / 'Mix of policies' conclusion",
    triggerDescription: "Conclusion states 'a mix is needed', 'it depends', or 'use a range' with no condition, criterion, or ranking.",
    howToFix: "Provide a ranked, conditional judgement: state which policy is superior, under what exact conditions, and on what criterion.",
  },
  {
    id: "unweighed_listing",
    maxMark: 2,
    label: "Evaluative points listed without weighing",
    triggerDescription: "Evaluative points are merely listed or added on without being weighed against each other or linked to the final judgement.",
    howToFix: "Weigh at least two factors against each other with a reasoned explanation of why one factor outweighs the other in this context.",
  },
  {
    id: "wrong_question_judgement",
    maxMark: 1,
    label: "Judgement fails to answer set question",
    triggerDescription: "The judgement addresses a different question (e.g. 'does X work?' rather than 'is X the best?').",
    howToFix: "Directly use the question's exact command qualifier ('best', 'most effective', 'to what extent') in your concluding sentence.",
  },
  {
    id: "one_sided_evaluation",
    maxMark: 1,
    label: "One-sided evaluation",
    triggerDescription: "The evaluation only considers one perspective throughout without genuine counter-argument or limitation.",
    howToFix: "Introduce a clear limitation or counter-argument with economic reasoning before stating your verdict.",
  },
  {
    id: "generic_evaluation",
    maxMark: 2,
    label: "Generic / uncontextualised evaluation",
    triggerDescription: "Evaluation consists of boilerplate phrases (e.g. 'depends on time lags', 'ceteris paribus') not applied to the question's specific good/economy.",
    howToFix: "Anchor every evaluative point to the specific market, good, or economic context in the question.",
  },
];

/** Mandatory error checks for both grader and AO Fixer */
export interface MandatoryErrorCheck {
  id: string;
  trap: string;
  correctEconomics: string;
  severity: "major" | "minor";
}

export const MANDATORY_ERROR_CHECKS: MandatoryErrorCheck[] = [
  {
    id: "hyperinflation",
    trap: "Hyperinflation described as 'accelerating inflation'",
    correctEconomics: "Accelerating inflation is simply a rising rate of inflation. Hyperinflation is extremely rapid, out-of-control inflation (typically >50% per month) causing currency collapse.",
    severity: "major",
  },
  {
    id: "demand_shifting_supply",
    trap: "A fall or rise in demand claimed to shift the supply curve",
    correctEconomics: "A change in demand changes price and causes a movement along supply. Supply only shifts from costs, taxes, subsidies, technology, productivity, and number of firms.",
    severity: "major",
  },
  {
    id: "shift_directions",
    trap: "Wrong direction of shift for tax or subsidy",
    correctEconomics: "A subsidy lowers production costs and shifts supply RIGHT. An indirect tax increases production costs and shifts supply LEFT.",
    severity: "major",
  },
  {
    id: "as_equals_ad",
    trap: "'AS equals AD' cited as an explanation",
    correctEconomics: "AS = AD is the equilibrium condition, not a causal explanation. A rightward AS shift increases real output and lowers the price level at each level of AD.",
    severity: "minor",
  },
  {
    id: "investment_money_supply",
    trap: "Investment claimed to automatically expand the money supply",
    correctEconomics: "Investment increases AD in the short run (I component) and expands productive capacity (LRAS) in the long run. It does not automatically raise the money supply.",
    severity: "major",
  },
  {
    id: "inflation_types",
    trap: "Confusing demand-pull with cost-push inflation",
    correctEconomics: "Demand-pull is AD growing faster than productive potential. Cost-push is caused by rising costs of production (wages, imported raw materials, indirect taxes, currency depreciation).",
    severity: "major",
  },
  {
    id: "supply_side_timing",
    trap: "Supply-side policies claimed to act immediately or shift AD left",
    correctEconomics: "Supply-side policies shift LRAS/AS and operate with significant long time lags. Contractionary demand management shifts AD left, works faster, but may harm growth and employment.",
    severity: "major",
  },
  {
    id: "merit_good_failures",
    trap: "Confusing information failure with affordability or price barriers",
    correctEconomics: "Information failure causes under-consumption because consumers undervalue private benefits. Affordability/price is an income barrier, needing different policy solutions (subsidies/direct provision vs information campaigns).",
    severity: "major",
  },
  {
    id: "unsupported_absolutes",
    trap: "Claiming a policy 'ensures', 'guarantees', or 'solves' the problem with no proof",
    correctEconomics: "Economic policies reduce or mitigate market issues under specific conditions, subject to opportunity costs, time lags, and elasticity constraints.",
    severity: "minor",
  },
];

/** Standard Cambridge 12-mark essay levels */
export const TABLE_A_LEVELS = {
  level3: {
    name: "Level 3",
    marks: "6-8",
    minChains: 3,
    description: "At least 3 fully developed chains of reasoning (cause -> mechanism -> effect -> link to question), precise economic terminology, no major error in main argument.",
  },
  level2: {
    name: "Level 2",
    marks: "3-5",
    minChains: 1,
    description: "Analysis is mostly accurate with gaps, assertions, or minor errors. Fewer than 3 complete chains or 2+ major errors cap the mark here.",
  },
  level1: {
    name: "Level 1",
    marks: "1-2",
    minChains: 0,
    description: "Descriptive answer with fragmented points, lack of causal progression, or major theoretical errors.",
  },
};

export const TABLE_B_LEVELS = {
  level3: {
    name: "Level 3 (Top)",
    marks: "3-4",
    description: "Weighs opposing arguments on stated criteria (e.g. elasticity, time lags, cost), reaches a justified judgement directly answering the question set.",
  },
  level2: {
    name: "Level 2 (Middle)",
    marks: "2",
    description: "Evaluative points present but listed without weighing, generic, or capped by a hedge conclusion ('mix of policies').",
  },
  level1: {
    name: "Level 1 (Lower)",
    marks: "1",
    description: "One-sided evaluation or token assertion that does not answer the exact question set.",
  },
};

/** Analyze command words to determine required question-fit criteria */
export function analyzeCommandWord(questionText: string): {
  commandWord: string;
  isComparisonRequired: boolean;
  requiresDegreeAndConditions: boolean;
  requiresJustifiedJudgement: boolean;
  guidanceLine: string;
} {
  const q = questionText.toLowerCase();

  const isComparison = /\b(best|most|main|most effective|most likely|primary|superior)\b/i.test(q);
  const isExtent = /\b(to what extent|how far)\b/i.test(q);
  const isAssessOrEvaluate = /\b(assess|evaluate|discuss|consider)\b/i.test(q);

  let commandWord = "discuss";
  if (isComparison) {
    const match = questionText.match(/\b(best|most effective|most likely|main|most)\b/i);
    commandWord = match ? match[0].toLowerCase() : "best";
  } else if (isExtent) {
    commandWord = "to what extent";
  } else if (/\bassess\b/i.test(q)) {
    commandWord = "assess";
  } else if (/\bevaluate\b/i.test(q)) {
    commandWord = "evaluate";
  }

  let guidanceLine = `This question needs: a balanced, evaluated argument landing on a justified final conclusion.`;

  if (isComparison) {
    guidanceLine = `This question needs: comparing the named policy against at least one alternative on a stated criterion to decide if it is the "${commandWord}".`;
  } else if (isExtent) {
    guidanceLine = `This question needs: a stated degree of impact ("to a large / limited extent") and the specific conditions it depends on.`;
  } else if (isAssessOrEvaluate) {
    guidanceLine = `This question needs: a justified, weighed judgement on the issue, not merely a summary of both sides.`;
  }

  return {
    commandWord,
    isComparisonRequired: isComparison,
    requiresDegreeAndConditions: isExtent,
    requiresJustifiedJudgement: isAssessOrEvaluate || isComparison || isExtent,
    guidanceLine,
  };
}
