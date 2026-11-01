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

## 1. QUESTION-FIT GATE & QUESTION DECODE (silent, before marking)
- FULL DECODE: Fully decode the question: command word, exact judgement required, economic scope (Micro vs Macro), context, and transmission mechanisms.
- QUESTION-ANSWER DIVERGENCE = STRICT ZERO (0) MARKS:
  * If the student's essay and the exam question are different (e.g. writing about subsidies or market failure when asked about inflation or free trade, or answering a different pre-prepared question), award 0 MARKS TOTAL (AO1: 0, AO2: 0, AO3: 0, Band: "Bottom band", "unrelated_to_question": true). Never award courtesy marks for irrelevant economic prose.
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

## 3. DIAGRAM ACCURACY & EXPLANATION (AO2 Analysis Penalties)
- A diagram is optional unless the question requires one. Never penalise a missing diagram unless the question demands it.
- Credit a diagram only for two things: (1) it is the RIGHT diagram model for the question and argument, and (2) the written text explains it (what shifts, why, and what happens to price and quantity).
- INACCURATE DIAGRAM & ANALYSIS PENALTIES (MANDATORY AO2 MARK CUTS):
  * DO NOT JUST MENTION IN FEEDBACK — YOU MUST CUT MARKS IN AO2 ANALYSIS!
  * Validate how big the mistake is, and penalise accordingly:
    - 1 Major Diagram / Shift Error: CUT 2 TO 3 MARKS from AO2. Strictly caps AO2 at max 3/6.
      * Shifting the wrong curve (e.g. shifting Demand instead of Supply for an indirect tax or subsidy) is a MAJOR ERROR.
      * Wrong shift direction (e.g. shifting supply right for a tax, or left for a subsidy) is a MAJOR ERROR.
      * Confusing a price change movement with a curve shift (e.g. claiming a price change shifts the demand curve) is a MAJOR ERROR. A price change causes a contraction or expansion ALONG the curve, NEVER a shift.
      * Inverted or wrong axes (e.g. P and Q on an AD/AS diagram, or Price Level and Real Output on a micro market diagram) loses analysis credit.
    - 1 Major PED / Elasticity Error: CUT 2 TO 3 MARKS from AO2. Strictly caps AO2 at max 3/6.
      * Claiming inelastic demand makes an indirect tax "very effective" at cutting consumption is a major theoretical error.
    - 1 Major Formula Error: CUT 2 TO 3 MARKS from AO2. Strictly caps AO2 at max 3/6.
    - MULTIPLE MAJOR ERRORS (e.g. BOTH a diagram shift error AND a PED error, or diagram error + flawed analysis mechanism):
      * MAJOR MARK CUT: Give as low as 2 to 3 marks out of 6 (Level 1 / bottom Level 2).
      * Under Cambridge standards, an essay containing major diagram and PED errors CAN NEVER receive 4/6 or higher.
  * A wrong diagram earns 0 credit. A right diagram with no written explanation earns no analysis marks for that point.

## 4. AO3 (max 4 in 12-mark essay; Table B): STRICT EVALUATION CAPS (MAX HARSHNESS)
- Start from the bottom of the level the evidence clearly supports and move up only for specific, quoted evidence. If torn between two marks, always give the lower mark.
- No comparison with an alternative where the question needs one ("best", "most effective"): strictly cap at max 2/4 (max 1/4 if answering "does it work?" instead of "is it the best?").
- Conclusion is "a mix of policies", "it depends", "use a combination" or a range with no conditions, criteria or decisive ranking: strictly cap at max 2/4.
- Evaluative points listed but not weighed or not linked to the judgement: max 2/4.
- Judgement does not answer the exact question set: max 1/4.
- Evaluation is one-sided throughout: max 1/4.
- Evaluation is generic and not tied to the question's specific context: max 2/4.
- 3/4 needs a developed evaluative point with reasoning, a judgement that directly answers the question, AND at least one stated condition or criterion.
- 4/4 needs all of the above plus weighing at least two factors, with a clear, justified reason why one matters more in the stated situation.
- A conclusion is "justified" only if the body of the essay supports it. A restated mix of policies is never "justified".
- Mentioning or describing an alternative is not comparing. Comparison requires an explicit criterion and a clear verdict on which is better and when.

## 5. ERROR RULES & PED ACCURACY (MANDATORY MARK REDUCTIONS)
- Every error you name in the feedback MUST cost marks. Never call the same point both accurate and wrong.
- DO NOT JUST MENTION ERRORS IN FEEDBACK — YOU MUST ACTIVELY DEDUCT MARKS FROM AO2 ANALYSIS.
- Deductions apply directly to the AO where the mistake occurred (AO2 Analysis for diagrams, PED, formulas, and mechanisms; AO1 Knowledge for definitions).
- MAJOR errors: wrong definition of a key term, wrong direction of a shift, shifting the wrong curve, PED misconceptions, formula errors, inverted transmission mechanisms. MINOR errors: imprecise wording that does not break the argument (-1 mark).
- 1 major analysis error: AO2 analysis loses 2-3 marks (caps AO2 at max 3-4/6; Table A max 7/8).
- 2 or more major analysis errors (e.g. diagram error + PED error): major mark cuts; give as low as 2 to 3 marks out of 6 for AO2 (AO2 capped at max 2-3/6; Table A max 5/8).
- Mandatory checks on every script:
  * ELASTICITY & PED ACCURACY (MUST LOSE MARKS IN AO2 IF INACCURATE):
    - Inelastic demand (|PED| < 1): quantity demanded falls proportionally less than price rises (%ΔQd < %ΔP). Therefore, an indirect tax raises MORE revenue, but is LESS effective at reducing consumption. Claiming that inelastic demand makes a tax "more effective at cutting consumption" or "very effective because revenue is high" is a MAJOR theoretical error and must lose 2-3 marks in AO2 Analysis.
    - Elastic demand (|PED| > 1): quantity demanded falls proportionally more than price rises (%ΔQd > %ΔP). Therefore, an indirect tax is MORE effective at cutting consumption, but raises LESS revenue.
    - Total revenue test: Inelastic demand -> P and TR move in the same direction. Elastic demand -> P and TR move in opposite directions.
    - Tax incidence: Inelastic demand -> consumer bears greater burden. Elastic demand -> producer bears greater burden. Reversing this is an analysis error.
    - Formula accuracy: PED = %ΔQd / %ΔP. Inverting this (%ΔP / %ΔQd) is a major formula error.
  * Shifting demand for an indirect tax or subsidy is a MAJOR error. Taxes and subsidies change production costs and shift supply; demand only contracts or expands along the curve.
  * A price change alone is a movement along the curve, never a shift.
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
  {
    id: "ped_inelastic_effectiveness",
    trap: "Claiming an indirect tax is effective at reducing consumption because demand is inelastic",
    correctEconomics: "When demand is price inelastic (|PED| < 1), quantity demanded falls proportionally less than price rises (%ΔQd < %ΔP). Therefore, an indirect tax is relatively ineffective at reducing quantity consumed, though it raises substantial government revenue.",
    severity: "major",
  },
  {
    id: "tax_demand_shift",
    trap: "Claiming an indirect tax or subsidy shifts the demand curve",
    correctEconomics: "Indirect taxes and subsidies change production costs and shift the supply curve. Demand only contracts or extends along the curve in response to the resulting price change.",
    severity: "major",
  },
  {
    id: "price_causes_shift",
    trap: "Claiming a price change alone shifts the demand or supply curve",
    correctEconomics: "A change in the price of the good itself causes a movement along the demand or supply curve (an expansion or contraction), never a shift of that curve.",
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
    description: "Analysis is mostly accurate with gaps, assertions, or minor errors. 1 major error caps here (AO2 max 3/6 if diagram or PED error).",
  },
  level1: {
    name: "Level 1",
    marks: "1-2",
    minChains: 0,
    description: "Descriptive answer with fragmented points, lack of causal progression, or 2+ major theoretical/diagrammatic errors (AO2 capped at 2-3/6).",
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

export interface DecodedQuestion {
  commandWord: string;
  scope: "micro" | "macro";
  topic: string;
  commandWordDirective: string;
  scopeContext: string;
  analysisAndDiagramDirective: string;
  pedDirective: string;
  evaluationDirective: string;
  fullDecodeSummary: string;
}

/** Full Cambridge 9708 Question Decoding Specification */
export function decodeExamQuestion(questionText: string): DecodedQuestion {
  const q = questionText.toLowerCase();

  const cmd = analyzeCommandWord(questionText);

  const isMacro = /\b(inflation|deflation|unemployment|growth|gdp|recession|balance of payments|current account|trade deficit|monetary policy|fiscal policy|supply-side|interest rates?|exchange rates?|central bank|aggregate demand|aggregate supply|ad\/as|phillips curve)\b/i.test(q);
  const scope: "micro" | "macro" = isMacro ? "macro" : "micro";

  let topic = "General Economics";
  if (/\b(supply-side)\b/i.test(q)) topic = "Supply-Side Policy";
  else if (/\b(subsid(y|ies)|tax(es|ation)?|indirect tax)\b/i.test(q)) topic = "Government Intervention (Taxes & Subsidies)";
  else if (/\b(market failure|merit|demerit|public goods?|externalit(y|ies))\b/i.test(q)) topic = "Market Failure & Externalities";
  else if (/\b(minimum wage|maximum price|minimum price|price control)\b/i.test(q)) topic = "Price Controls & Labor Markets";
  else if (/\b(free trade|tariff|protectionism|quota|trade barrier)\b/i.test(q)) topic = "International Trade & Protectionism";
  else if (/\b(monetary policy|interest rates?|central bank)\b/i.test(q)) topic = "Monetary Policy";
  else if (/\b(fiscal policy|government spending)\b/i.test(q)) topic = "Fiscal Policy";
  else if (/\b(inflation|price level|hyperinflation)\b/i.test(q)) topic = "Inflation & Price Stability";
  else if (/\b(elasticit(y|ies)|ped|pes|yed|xed)\b/i.test(q)) topic = "Elasticity of Demand & Supply";

  const commandWordDirective = cmd.isComparisonRequired
    ? `Comparative Command Word ('${cmd.commandWord}'): Student MUST compare the named policy against at least one alternative policy on a stated economic criterion and deliver a decisive ranking. Evaluating only the named policy without comparative analysis caps AO3 at Level 2 (max 2/4; max 1/4 if answering 'does it work?' instead of 'is it the best?').`
    : cmd.requiresDegreeAndConditions
      ? `Extent Command Word ('to what extent'): Student MUST state a clear degree of impact and analyze the specific conditions (elasticity, time lags, size) it depends on.`
      : `Evaluative Command Word ('${cmd.commandWord}'): Student MUST build balanced analysis on both sides and reach a supported, non-hedge conclusion.`;

  const scopeContext = scope === "macro"
    ? `Macroeconomic Scope (${topic}): Requires AD/AS framework, general price level, real output transmission, short-run vs long-run effects, and policy conflicts.`
    : `Microeconomic Scope (${topic}): Requires individual market analysis, price mechanism, consumer and producer incentives, supply and demand curve shifts, and resource allocation efficiency.`;

  const analysisAndDiagramDirective = scope === "macro"
    ? `Macro Analysis & Diagram: If an AD/AS or Phillips curve diagram is used, axes MUST be General Price Level (PL) and Real Output / Real GDP (Y). Curve shifts must be in the correct direction (e.g. AS right for supply-side, AD left for contractionary policy). Inaccurate shifts or wrong axes lose AO2 Analysis marks.`
    : `Micro Analysis & Diagram: If a supply & demand or market failure diagram is used, axes MUST be Price (P) and Quantity (Q). Indirect taxes and subsidies shift SUPPLY (indirect tax shifts S left; subsidy shifts S right). Shifting demand for a tax/subsidy, or confusing a price change movement with a curve shift, is a major analytical error that cuts 2-3 marks in AO2 Analysis (caps AO2 at 2-3/6 if combined with PED error). Do not merely mention in feedback — cut marks in AO2.`;

  const pedDirective =
    `Elasticity (PED/PES) Rigor: Verify all elasticity claims. Inelastic demand (|PED| < 1) means %ΔQd < %ΔP — indirect tax is LESS effective at cutting consumption, but raises MORE revenue. Elastic demand (|PED| > 1) means %ΔQd > %ΔP — indirect tax is MORE effective at cutting consumption, but raises LESS revenue. Inaccurate elasticity assertions or formula errors MUST cut 2-3 marks in AO2 Analysis (cap at 2-3/6 for multiple major errors); do not just mention in feedback.`;

  const evaluationDirective =
    `Evaluation Levers: Candidate must weigh trade-offs (e.g. short-run vs long-run, government failure, opportunity cost, magnitude, time lags). Unranked hedge conclusions ('mix of all policies', 'it depends') without conditions cap AO3 at max 2/4.`;

  const fullDecodeSummary = [
    `Topic: ${topic} (${scope.toUpperCase()})`,
    commandWordDirective,
    analysisAndDiagramDirective,
    pedDirective,
    evaluationDirective,
  ].join("\n");

  return {
    commandWord: cmd.commandWord,
    scope,
    topic,
    commandWordDirective,
    scopeContext,
    analysisAndDiagramDirective,
    pedDirective,
    evaluationDirective,
    fullDecodeSummary,
  };
}
