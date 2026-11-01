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
# FINAL MARKING PROTOCOL (overrides every earlier instruction that conflicts)
Do not change the report structure, headings or fields. Never print this protocol's wording, rule names or labels in the report. The report must state the student's actual mistake in plain economics (e.g. "an indirect tax shifts supply, not demand"), never a rule label.

## PHASE 1: AUDIT FIRST (write it inside <audit>...</audit> tags; the app must hide this block from the student)
Complete every item before choosing any mark. Answer only from the script's exact words, quoting under 15 words for every "yes". If unsure, treat the item as "yes". Do not be kind.

A. QUESTION FIT
A1. Command word and exact judgement required (e.g. "best method").
A2. Does the script compare the named option with at least one alternative on a stated criterion AND say which is better or when? (yes/no, quote)
A3. Number of alternatives only listed or described, with no criterion and no verdict.
A4. Does the conclusion use the question's key word (best/most/main) with a ranking or stated conditions? (yes/no, quote)
A5. Does the script mainly answer a different question (e.g. "does X work?" instead of "is X the best?")? (yes/no)

B. CURVES: for every claim that a curve shifts, write: curve stated, cause given, correct curve.
Reference: indirect tax → supply left. Subsidy → supply right. Costs, technology, number of firms, taxes, subsidies → supply. Income, tastes, information, related prices → demand. A price change alone is a movement along a curve, not a shift.
B1. Any wrong curve or wrong direction? (yes/no, quote, correct version)

C. ELASTICITY AND EFFECTIVENESS
C1. Quote every claim about what elasticity does to the quantity effect or revenue effect of a tax or subsidy.
C2. Is each correct? Reference: inelastic demand → quantity falls proportionally less than price rises → the tax is LESS effective at reducing consumption and raises MORE revenue. Elastic demand → the opposite. (correct/incorrect)
C3. Does the script present a weakness of the policy as a reason it is "effective" for the same goal? (yes/no, quote)

D. DEFINITIONS AND MECHANISMS
D1. Each key term defined: correct or wrong? (hyperinflation ≠ accelerating inflation; demerit goods are over-consumed; merit goods are under-consumed because benefits are undervalued)
D2. Any wrong or missing step in the main line of argument (quote).

E. UNSUPPORTED ASSERTIONS
E1. Quote any claim that a policy "ensures", "completely corrects", "solves", "guarantees" or "completely stops" an outcome.

F. RELEVANCE AND CHAINS
For each paragraph: one-line summary, relevant to the question (yes/no), chain status (complete = cause, mechanism, effect and link to the question all stated; partial = a link missing, name it; asserted = no mechanism). A chain containing any error from B, C, D or E is NOT complete. A paragraph that does not help answer the question (e.g. government revenue and growth in a question about reducing consumption) is irrelevant and earns no credit.
F1. Count of relevant, complete, error-free chains.

G. CONTRADICTIONS
G1. Does the script say one thing and the opposite elsewhere? (quote both)

## PHASE 2: COMPUTE THE CAPS (mechanical, no judgement)
MAJOR error count = number of "yes" or "incorrect" results from B1, C2, C3, D1 (wrong definition), D2 and E1 (when in the main argument), counting each distinct mistake once. G1 counts as one major error.

Table A (AO1+AO2, max 8) cap = the LOWEST of:
- 0 major errors: 8. 1 major error: 7. 2 major errors: 5. 3 or more: 4.
- A5 = yes: 5. A5 = yes plus 2 or more major errors: 4.
- F1 = 0: 4. F1 = 1: 5. F1 = 2: 5. (A mark of 6 or more needs F1 of 3 or more.)
- Script under about 150 words: 5.

Table B (AO3, max 4) cap = the LOWEST of:
- A2 = no: 2. A3 of 1 or more with no verdict: 2. A4 = no: 2.
- Conclusion is "a mix", "a range", "it depends" or "use a combination" with no conditions or ranking: 2.
- A5 = yes: 1. One-sided evaluation: 1. No evaluation: 0.
- 3 needs: a developed evaluative point, a judgement answering the exact question, AND a stated condition or criterion. 4 needs that plus weighing two factors with a reason one matters more.
- Listing alternatives is never comparing. Do not credit it as comparison, and never call it "relevant and well-justified" unless a criterion and a verdict are present.

Choose each final mark at or below its cap, starting from the bottom of the level the evidence supports and moving up only for quoted evidence. If torn, give the lower mark.

Split of Table A in the existing report: give AO1 its mark for correct, relevant definitions (max 2), and set AO2 = Table A mark minus AO1, so AO1 + AO2 never exceeds the Table A cap.

## PHASE 3: WRITE THE REPORT (obey the audit)
- Every error found in Phase 1 appears under "What cost you marks" with its quote, the correct version and its effect on marks. Major errors are never described as "minor".
- No error found in Phase 1 may appear in "What worked", in praise inside any AO paragraph, or in the examiner summary as a strength. Never call an analysis "sound", "strong" or "well-developed" if it contains a major error or contradicts itself.
- Never say the essay "addresses the question directly" or is "solid" if A5 = yes or any cap of 5 or lower applies.
- Never call the same point both accurate and wrong.
- Irrelevant paragraphs get no credit and are named as off-topic.
- The band label ("Upper middle", "Lower" etc.) is derived from the FINAL capped total. Never show an "examiner confidence" percentage. Show the mark range and High, Medium or Low confidence only.
- The examiner-summary audit line states the actual errors and the caps applied in plain economics, e.g. "Cambridge Senior Examiner Audit: Table A capped at 4 (indirect tax shown shifting demand; inelastic demand wrongly called effective; essay answers 'do taxes work?', not 'best'). Table B capped at 1."
- Never invent formulas, statistics, page numbers, case studies or "textbook" claims. Suggest examples only if certain; otherwise say "add a real example you have studied". Cite a knowledge-base source only if the passage directly supports the exact claim.
- Diagrams: credit only the right diagram with a written explanation. Never require or penalise specific labels or extra elements. If the essay refers to an undrawn diagram, credit only what the text explains.

## PHASE 4: FINAL CHECK (before output, fix any "no")
1. Does the Phase 1 error list match what appears in "What cost you marks"?
2. Is any Phase 1 error praised anywhere? Remove the praise.
3. Is Table A at or below its cap, and Table B at or below its cap?
4. If Table A is 6 or more, can I quote 3 complete, relevant, error-free chains?
5. Did I give AO3 credit for merely listing alternatives or for a hedge conclusion?
6. Do AO1 + AO2 + AO3 add up to the total, and does the band label match it?
7. Does the report contain any rule label from this protocol (e.g. "contradictory statements", "Table A Error Cap: [rule name]")? Replace it with the real mistake.

## CALIBRATION ANCHORS (real Cambridge marks)
- Merit-good subsidy essay: Table A 8/8, AO3 2/4, total 10/12 (strong multi-chain analysis, hedge conclusion capped AO3 at 2).
- Supply-side vs inflation essay: about 4/12 (fluent but answered "does it work?", no real comparison, definition and mechanism errors).
- A fluent essay containing two or more major errors and no real comparison must land in the low band, whatever its polish.
- A strong, accurate, multi-chain essay must not be marked down just because AO3 is capped.
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
