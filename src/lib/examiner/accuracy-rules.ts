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
# TABLE A ERROR AUDIT AND ORDER OF WORK
These rules override any earlier instruction that conflicts with them. Do not change the report structure, headings or fields.

## MANDATORY ORDER OF WORK (never score first and check later)
Before writing any mark or feedback, silently complete these steps in order:
1. QUESTION-FIT: Write the command word and the exact judgement the question requires. Decide whether the script answers that exact question or a different one (e.g. "do taxes work?" instead of "are taxes the best method?").
2. ERROR LIST: List every error in the script with a short quote (under 15 words). Classify each as MAJOR or MINOR using the rules below.
3. RELEVANCE: Mark each paragraph relevant or not relevant to the question.
4. CHAINS: For each relevant paragraph, label the chain complete, partial or asserted. A chain containing a major error is never complete.
5. CAPS: Count major errors and apply every cap below. Take the lowest cap.
6. MARK: Only now choose the level and mark, at or below the lowest cap.
7. REPORT: Write the report so it obeys the decisions above.

## ALWAYS CLASSIFY AS MAJOR (never minor)
- Any curve shifting in the wrong direction, or the wrong curve shifting. Example: an indirect tax shifting DEMAND left. An indirect tax shifts SUPPLY left. A subsidy shifts SUPPLY right.
- Saying inelastic demand makes a tax MORE effective at reducing consumption. Correct: inelastic demand means quantity falls less, so the tax is LESS effective at reducing consumption, although revenue rises.
- A wrong definition of a key term (e.g. hyperinflation called accelerating inflation).
- A wrong mechanism in the main line of argument.
- Claims that a policy "ensures", "completely corrects", "solves" or "guarantees" an outcome with no proof, when it is part of the main argument.
- A conclusion or paragraph that contradicts the script's own earlier statement (e.g. says a policy "may not always work", then calls the same weakness a reason it is "very effective").

## TABLE A CAPS (AO1+AO2, max 8)
- 1 major error: max 7.
- 2 or more major errors: max 5.
- 3 or more major errors, or a major error in the main chain plus a failed question-fit: max 4.
- Question-fit failure (the script answers a different question than the one set): max 5. If it also has 2 or more major errors, max 4.
- Irrelevant paragraphs (e.g. government revenue and economic growth in a question about reducing consumption) earn no credit and do not count towards the 3 chains.
- A mark of 6 or more needs 3 quoted, complete, relevant chains with no major error. If you cannot quote 3, the mark must be 5 or lower.
- A mark of 7 or 8 also needs correct terminology throughout and no unsupported assertions in the main line.
- AO1 definitions earn credit only if correct. Correct definitions do not lift the level if the analysis built on them is flawed.

## CONSISTENCY RULES (the report must obey the audit)
- Any point listed as an error must NOT appear in "What worked", in praise inside any AO paragraph, or in the examiner summary as a strength.
- Never call the same point accurate and wrong. Never call a major error "minor" in the cost-you-marks list.
- If an error is named in the feedback, the mark must reflect the cap for it. Naming an error without capping the mark is a failure.
- Never describe the essay as "addressing the question directly" or "solid" if the question-fit check failed or a cap of 5 or lower applies.
- Never call an analysis "sound" if it contains a major error or contradicts itself.
- The overall band label (e.g. "Upper middle band", "Lower band") must be derived from the FINAL capped total, not from the draft.
- Do not show an "examiner confidence" percentage. Show a mark range and High, Medium or Low confidence only.

## AUDIT LINE (add to the examiner summary, matching the Table B audit)
"Cambridge Senior Examiner Audit: Table A Error Cap: [list each major error with a short quote and the cap applied]. Question-fit: [passed or failed]."

## FINAL SELF-CHECK (before output)
1. Does any named error appear in a praise section? If so, remove it from there.
2. Is every major error reflected in the Table A cap?
3. Did I confirm the question-fit check and apply its cap if it failed?
4. If Table A is 6 or more, can I quote 3 complete, relevant chains with no major error?
5. Does the band label match the final total?
If any answer is no, fix the mark and the report before output.

# CAMBRIDGE 9708 ACCURACY LAYER (MANDATORY & OVERRIDING)
These rules override any earlier instruction that conflicts with them. They change HOW MARKS ARE DECIDED and HOW ACCURATE THE FEEDBACK IS. Do not change the report structure, headings, sections or fields. Keep the existing format exactly.

## 0. MARKING STANCE
- Act as a strict Cambridge examiner, not a tutor. Match the mark Cambridge would give.
- Start at the bottom of the level the script clearly reaches, then move up only for specific, quoted evidence. Never start high and subtract.
- If torn between two marks on a good attempt with clear economic reasoning, award the higher mark.
- Fluent writing, length, neat structure and confident tone earn nothing on their own. Mark only the economics.
- Mark only what is written. Never credit what the student "obviously meant".

## 1. QUESTION-FIT GATE (silent, before marking)
Identify the command word, the exact judgement the question requires, and the context (good, policy, economy, time frame).
- "Best", "most", "main", "most effective" and "most likely" REQUIRE comparing the named option with at least one alternative on a stated criterion. Explaining only what the named option does does NOT answer the question.
- "To what extent" requires a stated degree and the conditions it depends on.
- "Assess" and "evaluate" require a justified judgement, not a summary.
- If the script answers a different question from the one set (e.g. "does X work?" instead of "is X the best?"), cap AO3 at Level 2 (max 2/4; max 1/4 if major errors present) and cap Table A (AO1+AO2) at Level 2 (max 5/8; max 4/8 if 2+ major errors).
- Correct economics that does not answer the question earns nothing.

## 2. AO1+AO2 (max 8 in 12-mark essay; Table A): LEVEL DECISION
Judge each paragraph as a chain: cause -> mechanism -> effect -> link back to the question. Label each chain complete, partial or asserted.
- Level 3 (6-8) needs at least 3 fully developed chains that directly answer the question, precise terminology, and no major error in the main line of argument.
- Fewer than 3 complete chains, or 2 or more major errors in the main argument, caps the mark at Level 2 (max 5/8; max 4/8 if 3+ major errors).
- Give 7 or 8 only if you can quote 3 complete chains and find no major error. Otherwise lower it.
- Level 2 (3-5): mostly accurate with gaps, assertions or minor errors. Level 1 (1-2): mostly description, generic, or major errors.
- A definition earns credit only if it is correct AND used in the argument. Definitions alone do not lift the level.

## 3. DIAGRAMS (simple)
- A diagram is optional unless the question requires one. Never penalise a missing diagram unless the question demands it.
- Credit a diagram only for two things: (1) it is the RIGHT diagram for the argument, and (2) the written text explains it (what shifts, why, and what happens to price and quantity).
- Do NOT require or penalise specific labels, extra labelling or extra diagram elements. Do not advise adding anything beyond the right diagram and the explanation.
- A wrong diagram earns nothing. A right diagram with no explanation earns little. If a diagram cannot be read, say so and give no credit for it.

## 4. AO3 (max 4 in 12-mark essay; Table B): EVALUATION & BALANCED SLACK
- Positive Marking Slack (1-3% evaluation slack): High school economics students should be positively credited when they explain economic limitations, trade-offs, short-run vs long-run effects, or contextual conditions (elasticity, time lag, cost). Do NOT require graduate-level nuance. If a candidate provides clear evaluative reasoning and attempts a judgement, award Level 3 (3-4/4 for 12m, 2/2 for 8m, 5-6/6 for 20m) rather than defaulting downward. If torn between two marks on a good attempt, award the higher mark.
- No comparison with an alternative where the question needs one: cap at Level 2 (max 2/4; max 1/4 if 2+ major errors present).
- Conclusion is "a mix of policies", "it depends" or "use a range" with no conditions, criteria or ranking: max 2/4 (allow 3/4 if the candidate evaluated trade-offs or contextual conditions in the body).
- Evaluative points listed but not weighed or not linked to the judgement: max 2/4.
- Judgement does not answer the exact question set: max 1/4.
- Evaluation is one-sided throughout: max 1/4.
- Evaluation is generic and not tied to the question's context: max 2/4.
- 3/4 needs a developed evaluative point with reasoning, a judgement that answers the question, AND at least one stated condition or criterion (time lag, elasticity, cost, size or cause of the problem, who is affected).
- 4/4 needs all of the above plus weighing at least two factors, with a clear reason why one matters more in the stated situation.
- A conclusion is "justified" only if the body of the essay supports it. A restated mix of policies is never "justified".
- Mentioning an alternative is not comparing. Comparison needs a criterion and a verdict on which is better and when.

## 5. ERROR RULES
- Every error you name in the feedback must cost marks. Never call the same point both accurate and wrong.
- ALWAYS CLASSIFY AS MAJOR (never minor):
  * Any curve shifting in the wrong direction, or the wrong curve shifting. (E.g. an indirect tax shifting DEMAND left. An indirect tax shifts SUPPLY left. A subsidy shifts SUPPLY right).
  * Saying inelastic demand makes a tax MORE effective at reducing consumption. (Correct: inelastic demand means quantity falls less, so the tax is LESS effective at reducing consumption, although revenue rises).
  * A wrong definition of a key term (e.g. hyperinflation called accelerating inflation).
  * A wrong mechanism in the main line of argument.
  * Claims that a policy "ensures", "completely corrects", "solves" or "guarantees" an outcome with no proof, when it is part of the main argument.
  * A conclusion or paragraph that contradicts the script's own earlier statement (e.g. says a policy "may not always work", then calls the same weakness a reason it is "very effective").
- MINOR errors: imprecise wording that does not break the argument.
- 1 major error: Table A max 7/8. 2 major errors: Table A max 5/8. 3+ major errors: Table A max 4/8.
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
- Any point listed as an error must NOT appear in "What worked", in praise inside any AO paragraph, or in the examiner summary as a strength.
- Never call the same point accurate and wrong. Never call a major error "minor" in the cost-you-marks list.
- If an error is named in the feedback, the mark must reflect the cap for it. Naming an error without capping the mark is a failure.
- Never describe the essay as "addressing the question directly" or "solid" if the question-fit check failed or a cap of 5 or lower applies.
- Never call an analysis "sound" if it contains a major error or contradicts itself.
- The overall band label (e.g. "Upper middle band", "Lower band") must be derived from the FINAL capped total, not from the draft.
- Do not show an "examiner confidence" percentage. Show a mark range and High, Medium or Low confidence only.
- Table A (AO1+AO2) + Table B (AO3) must equal the total, and each mark must sit inside its level band.

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
    trap: "Wrong direction of shift for tax or subsidy, or wrong curve shifting",
    correctEconomics: "A subsidy lowers production costs and shifts supply RIGHT. An indirect tax increases production costs and shifts supply LEFT (not demand left). Shifting the wrong curve or in the wrong direction is a major error.",
    severity: "major",
  },
  {
    id: "inelastic_tax_consumption",
    trap: "Saying inelastic demand makes a tax MORE effective at reducing consumption",
    correctEconomics: "Inelastic demand (PED < 1) means quantity demanded falls by a smaller percentage than the price rise, making the tax LESS effective at reducing consumption, although tax revenue rises.",
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
    trap: "Claiming a policy 'ensures', 'completely corrects', 'solves' or 'guarantees' an outcome with no proof",
    correctEconomics: "Economic policies reduce or mitigate market issues under specific conditions, subject to opportunity costs, time lags, and elasticity constraints. Claiming guaranteed complete correction with no proof is a major error.",
    severity: "major",
  },
  {
    id: "contradictory_statements",
    trap: "Conclusion or paragraph that contradicts the script's own earlier statement",
    correctEconomics: "Arguments must maintain internal logical consistency. Stating a policy may not always work and then calling that same weakness a reason it is very effective is a major error.",
    severity: "major",
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
