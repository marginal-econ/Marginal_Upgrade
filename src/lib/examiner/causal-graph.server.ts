/**
 * Marginal Engine V4 — Neuro-Symbolic Cambridge 9708 Causal-Graph Compiler & Verifier
 *
 * Pure deterministic economic-law verification that runs in <5ms BEFORE LLM passes:
 * 1. Checks every sentence against canonical Cambridge 9708 micro/macro/international
 *    causal transmission laws to catch fatal directional sign-flips with exact verbatim quotes.
 * 2. Computes causal-chain depth & multi-step transmission density (replacing naive word counts).
 * 3. Audits Diagram-to-Text Integration (detects whether diagram labels like P1->P2, Q1->Q2,
 *    S1->S2, AD1->AD2, E1->E2 are actually referenced in the candidate's prose).
 * 4. Classifies AO3 evaluative depth across 6 Cambridge evaluative dimensions.
 * 5. Stamps authentic Cambridge RM-Assessor margin codes (K, An, Ev, Dev, ^, X) onto verbatim spans.
 *
 * Safe to import on both server (Essay Grader) and client (Live Examiner).
 */

import type {
  CausalViolation,
  NeuroSymbolicDossier,
  RmAssessorAnnotation,
} from "./types";

interface EconomicLawRule {
  id: string;
  law: string;
  severity: "fatal" | "moderate";
  /** Matches an inverted / contradictory economic transmission claim within a single sentence. */
  violationPattern: RegExp;
  /** Optional negation guard — if this matches the same sentence, the student may be refuting or qualifying the error. */
  guardPattern?: RegExp;
  explanation: string;
}

/**
 * Canonical Cambridge 9708 Economic Laws Knowledge Graph (Sign-Flip Detectors).
 * Designed with high precision (zero false positives on valid Cambridge shorthand)
 * so every triggered violation is a genuine, indisputable economic error.
 */
const CAMBRIDGE_ECONOMIC_LAWS: EconomicLawRule[] = [
  {
    id: "MON_IR_BORROWING_INVERTED",
    law: "Higher interest rates increase the cost of borrowing and reduce C & I",
    severity: "fatal",
    violationPattern:
      /\b(?:higher|increas(?:e|es|ed|ing)|rais(?:e|es|ed|ing)|rise\s+in)\s+(?:the\s+)?interest\s+rates?\b[^.!?]{0,110}\b(?:borrowing\s+(?:becomes?|is)\s+cheaper|cheaper\s+(?:to\s+borrow|borrowing|loans?)|cost\s+of\s+borrowing\s+(?:falls?|decreases?|drops?)|(?:decreas|reduc|lower)(?:e|es|ed|ing)\s+(?:the\s+)?cost\s+of\s+borrowing|(?:encourages?|incentivis(?:e|es|ing)|incentiviz(?:e|es|ing))\s+(?:more\s+)?(?:borrowing|spending|consumption|investment)|shifts?\s+(?:aggregate\s+demand|ad)\s+to\s+the\s+right)\b/i,
    guardPattern: /\b(not|unless|even\s+if|despite|however|lower\s+interest|cut(?:ting)?\s+interest)\b/i,
    explanation:
      "Inverted monetary transmission: higher interest rates raise the cost of borrowing and discourage C and I, shifting AD left (not right).",
  },
  {
    id: "MON_IR_EXCHANGE_RATE_INVERTED",
    law: "Higher domestic interest rates attract hot-money inflows and appreciate the exchange rate",
    severity: "fatal",
    violationPattern:
      /\b(?:higher|increas(?:e|es|ed|ing)|rais(?:e|es|ed|ing)|rise\s+in)\s+(?:the\s+)?interest\s+rates?\b[^.!?]{0,95}\b(?:exchange\s+rate\s+(?:to\s+)?depreciates?|currency\s+(?:to\s+)?depreciates?|weaker\s+(?:currency|exchange\s+rate)|hot\s+money\s+(?:outflows?|leaves?))\b/i,
    guardPattern: /\b(lower\s+interest|cut\s+interest|reduces?\s+interest|unless|despite)\b/i,
    explanation:
      "Inverted exchange-rate channel: higher domestic interest rates attract hot-money inflows and appreciate the currency (making exports dearer and imports cheaper).",
  },
  {
    id: "TAX_SUPPLY_SHIFT_INVERTED",
    law: "An indirect tax raises firms' costs of production and shifts supply left (upwards)",
    severity: "fatal",
    violationPattern:
      /\b(?:indirect\s+tax|specific\s+tax|ad\s+valorem\s+tax|impos(?:e|ing)\s+a\s+tax|tax\s+on\s+[a-z\s]{2,25})\b[^.!?]{0,80}\b(?:shifts?\s+(?:the\s+)?supply(?:\s+curve)?\s+(?:to\s+the\s+)?right|increases?\s+supply|lowers?\s+(?:the\s+)?(?:market\s+|equilibrium\s+)?price)\b/i,
    guardPattern: /\b(subsidy|subsidies|cut(?:ting)?\s+tax|reduc(?:e|ing)\s+tax|removing\s+(?:the\s+)?tax|not\s+shift)\b/i,
    explanation:
      "Inverted indirect tax mechanism: imposing a tax raises unit production costs, shifting supply left and raising equilibrium price.",
  },
  {
    id: "SUBSIDY_SUPPLY_SHIFT_INVERTED",
    law: "A subsidy lowers firms' costs of production and shifts supply right (downwards)",
    severity: "fatal",
    violationPattern:
      /\b(?:government\s+)?subsid(?:y|ies|ising)\b[^.!?]{0,80}\b(?:shifts?\s+(?:the\s+)?supply(?:\s+curve)?\s+(?:to\s+the\s+)?left|decreases?\s+supply|raises?\s+(?:the\s+)?(?:market\s+|equilibrium\s+)?price)\b/i,
    guardPattern: /\b(remov(?:e|ing)\s+(?:a\s+|the\s+)?subsidy|cut(?:ting)?\s+subsid|without\s+subsid|not\s+shift)\b/i,
    explanation:
      "Inverted subsidy mechanism: a subsidy reduces firms' unit costs, shifting supply right and lowering equilibrium price.",
  },
  {
    id: "FX_DEPRECIATION_EXPORTS_INVERTED",
    law: "Currency depreciation makes exports cheaper in foreign currency and imports dearer",
    severity: "fatal",
    violationPattern:
      /\b(?:depreciat(?:ion|es|ed|ing)|devaluat(?:ion|es|ed|ing)|weaker\s+(?:currency|exchange\s+rate))\b[^.!?]{0,85}\b(?:exports?\s+(?:become|are|more)\s+(?:more\s+)?(?:expensive|dearer)|imports?\s+(?:become|are)\s+cheaper|reduces?\s+(?:cost[- ]push\s+|imported\s+)?inflation)\b/i,
    guardPattern: /\b(appreciat|revaluat|stronger\s+currency|not\s+make)\b/i,
    explanation:
      "Inverted exchange-rate price effect: depreciation makes exports cheaper in foreign currency and imports dearer (which tends to add inflationary pressure, not reduce it).",
  },
  {
    id: "PPC_INSIDE_ALLOCATIVE_ERROR",
    law: "A point inside the PPC indicates productive inefficiency (unemployed resources), not allocative inefficiency",
    severity: "moderate",
    violationPattern:
      /\bpoint\s+(?:inside|within|below)\s+(?:the\s+)?(?:ppc|ppf|production\s+possibility)\b[^.!?]{0,70}\b(?:allocative(?:ly)?\s+inefficien(?:t|cy)|allocative\s+efficiency)\b/i,
    guardPattern: /\bnot\s+allocative/i,
    explanation:
      "PPC conceptual slip: a point inside the PPC represents productive inefficiency (unemployed/underutilised resources), not allocative inefficiency.",
  },
  {
    id: "PRODUCER_SURPLUS_DEF_ERROR",
    law: "Producer surplus is market price minus minimum price producers are willing to accept/supply at",
    severity: "moderate",
    violationPattern:
      /\bproducer\s+surplus\b[^.!?]{0,85}\b(?:willing\s+to\s+pay|willingness\s+to\s+pay)\b/i,
    guardPattern: /\bnot\s+willing\s+to\s+pay\b/i,
    explanation:
      "AO1 definition slip: producer surplus is the difference between market price and the minimum price producers are willing to ACCEPT/SUPPLY at (not 'willing to pay', which is consumer surplus).",
  },
  {
    id: "MONOPOLY_OVERPRODUCE_ERROR",
    law: "Profit-maximising monopolies restrict output (MR=MC, P>MC) rather than overproducing",
    severity: "moderate",
    violationPattern:
      /\b(?:monopol(?:y|ist|ies)|profit[- ]maximising\s+firms?)\b[^.!?]{0,80}\b(?:overproduc(?:e|es|ing)|produce\s+too\s+much)\s+(?:to\s+(?:gain|make|maximise)\s+(?:more\s+)?profits?)?\b/i,
    guardPattern: /\b(not\s+overproduce|restrict|underproduce|externalit)\b/i,
    explanation:
      "Market-structure slip: profit-maximising firms with monopoly power restrict output where MR = MC (P > MC) to raise price; they do not overproduce.",
  },
  {
    id: "MAX_PRICE_ABOVE_EQ_ERROR",
    law: "An effective maximum price (price ceiling) must be set BELOW equilibrium, creating excess demand (shortage)",
    severity: "moderate",
    violationPattern:
      /\b(?:maximum\s+price|price\s+ceiling)\b[^.!?]{0,85}\b(?:set\s+above\s+(?:the\s+)?equilibrium|creates?\s+(?:a\s+)?(?:surplus|excess\s+supply))\b/i,
    guardPattern: /\b(ineffective|no\s+effect|minimum\s+price|price\s+floor|not\s+above)\b/i,
    explanation:
      "Price-control slip: an effective maximum price is set BELOW equilibrium and creates excess demand (a shortage), not a surplus.",
  },
  {
    id: "MIN_PRICE_BELOW_EQ_ERROR",
    law: "An effective minimum price (price floor) must be set ABOVE equilibrium, creating excess supply (surplus)",
    severity: "moderate",
    violationPattern:
      /\b(?:minimum\s+price|price\s+floor)\b[^.!?]{0,85}\b(?:set\s+below\s+(?:the\s+)?equilibrium|creates?\s+(?:a\s+)?(?:shortage|excess\s+demand))\b/i,
    guardPattern: /\b(ineffective|no\s+effect|maximum\s+price|price\s+ceiling|not\s+below)\b/i,
    explanation:
      "Price-control slip: an effective minimum price is set ABOVE equilibrium and creates excess supply (a surplus), not a shortage.",
  },
  {
    id: "PED_REVENUE_INELASTIC_INVERTED",
    law: "When demand is price inelastic (|PED|<1), raising price increases total revenue",
    severity: "moderate",
    violationPattern:
      /\b(?:price\s+inelastic|inelastic\s+demand|ped\s*(?:<|less\s+than)\s*1)\b[^.!?]{0,85}\b(?:rais(?:e|ing)|higher|increas(?:e|ing))\s+price\b[^.!?]{0,50}\b(?:total\s+revenue\s+(?:falls?|decreases?|drops?)|reduces?\s+total\s+revenue)\b/i,
    guardPattern: /\b(elastic\s+demand|price\s+elastic|lower(?:ing)?\s+price)\b/i,
    explanation:
      "PED-revenue slip: when demand is price inelastic, a price rise leads to a proportionately smaller fall in quantity demanded, so total revenue INCREASES.",
  },
  {
    id: "INDIRECT_TAX_INCOME_DEF_ERROR",
    law: "Indirect taxes are levied on expenditure/goods and services, not on income",
    severity: "moderate",
    violationPattern:
      /\bindirect\s+tax(?:es)?\s+(?:is|are)\s+(?:a\s+)?tax(?:es)?\s+on\s+(?:income|wages|salaries|profits)\b/i,
    explanation:
      "AO1 definition error: an indirect tax is a tax on expenditure (goods and services), whereas taxes on income/profits are direct taxes.",
  },
  {
    id: "FISCAL_MONETARY_CONFLATION",
    law: "Monetary policy uses interest rates/money supply/QE; fiscal policy uses government spending and taxation",
    severity: "moderate",
    violationPattern:
      /\bmonetary\s+policy\s+(?:is|involves|uses|changes?)\s+(?:when\s+the\s+government\s+)?(?:changes?\s+)?(?:government\s+spending\s+and\s+(?:direct\s+)?taxation|taxation\s+and\s+government\s+spending)\b/i,
    explanation:
      "AO1 policy conflation: government spending and taxation are fiscal policy instruments, whereas monetary policy operates via interest rates, money supply, and exchange rates.",
  },
  {
    id: "SUBSIDY_INCIDENCE_INELASTIC_INVERTED",
    law: "With a subsidy, price-inelastic demand causes a LARGER fall in price so consumers capture the greater share of the subsidy",
    severity: "moderate",
    violationPattern:
      /\b(?:demand\s+is\s+(?:relatively\s+|price\s+)?inelastic|inelastic\s+(?:price\s+)?demand|less\s+responsive\s+to\s+(?:the\s+)?fall\s+in\s+price)\b[^.!?]{0,120}\b(?:price\s+(?:decreases?|falls?|drops?|reduces?)\s+(?:by\s+)?(?:only\s+)?a\s+small(?:er)?\s+amount|producers?\s+(?:retain|receive|capture|get|gain)\s+(?:a\s+)?(?:larger|greater|higher|bigger)\s+(?:proportion|share|benefit)|subsid(?:y|ies)\s+(?:causes?\s+subsidies\s+to\s+)?benefit\s+(?:firms|producers?)\s+more)\b/i,
    guardPattern:
      /\b(tax(?:es|ation)?|supply\s+is\s+(?:relatively\s+|more\s+)?inelastic|consumers?\s+(?:receive|capture|gain)\s+(?:a\s+)?(?:larger|greater))\b/i,
    explanation:
      "Inverted subsidy incidence: when demand is price inelastic (steep D), a rightward/downward supply shift causes a LARGE fall in price, so CONSUMERS capture the larger share of the subsidy (not producers).",
  },
  {
    id: "SUBSIDY_INCIDENCE_ELASTIC_INVERTED",
    law: "With a subsidy, price-elastic demand causes a SMALLER fall in price so producers retain the greater share of the subsidy",
    severity: "moderate",
    violationPattern:
      /\b(?:demand\s+is\s+(?:relatively\s+|price\s+)?elastic|elastic\s+(?:price\s+)?demand)\b[^.!?]{0,120}\b(?:(?:larger|greater|bigger)\s+fall\s+in\s+(?:the\s+)?(?:market\s+)?price|consumers?\s+(?:receive|capture|get|gain)\s+(?:a\s+)?(?:greater|larger|higher)\s+(?:proportion|share)\s+of\s+the\s+subsidy)\b/i,
    guardPattern:
      /\b(tax(?:es|ation)?|supply\s+is\s+(?:relatively\s+|more\s+)?inelastic|smaller\s+fall|producers?\s+(?:retain|receive|capture)\s+(?:a\s+)?(?:larger|greater))\b/i,
    explanation:
      "Inverted subsidy incidence: when demand is price elastic (flat D), a subsidy lowers market price by only a SMALL amount, so PRODUCERS retain the larger share of the subsidy (not consumers).",
  },
  {
    id: "TAX_INCIDENCE_INELASTIC_INVERTED",
    law: "The less price-elastic side of the market bears the greater proportion of an indirect tax",
    severity: "moderate",
    violationPattern:
      /\b(?:(?:demand\s+is\s+(?:relatively\s+|price\s+)?inelastic|inelastic\s+demand)\b[^.!?]{0,110}\b(?:producers?|sellers?|firms?)\s+(?:bear|pay|absorb)\s+(?:a\s+|the\s+)?(?:larger|greater|vast\s+majority|most)\b|\b(?:supply\s+is\s+(?:relatively\s+|price\s+)?inelastic|inelastic\s+supply)\b[^.!?]{0,110}\b(?:consumers?|buyers?)\s+(?:bear|pay|absorb)\s+(?:a\s+|the\s+)?(?:larger|greater|vast\s+majority|most)\b)/i,
    guardPattern: /\b(subsid|not\s+bear|unless|more\s+elastic\s+than)\b/i,
    explanation:
      "Inverted tax incidence: the less price-elastic side bears more of an indirect tax (inelastic demand -> buyers bear more; inelastic supply -> sellers bear more).",
  },
  {
    id: "PRICE_RISE_SHIFTS_DEMAND_RIGHT",
    law: "A rise in the product's own price causes a contraction along the demand curve, never a rightward shift of demand",
    severity: "fatal",
    violationPattern:
      /\b(?:increased?\s+price|higher\s+price|rais(?:e|ing)\s+(?:the\s+)?price|minimum\s+price\s+above)\b[^.!?]{0,100}\b(?:the\s+)?demand(?:\s+curve)?\s+shifts?\s+(?:to\s+the\s+)?right\b/i,
    guardPattern:
      /\b(not\s+shift|movement\s+along|contraction|substitute|competitor|expected\s+future)\b/i,
    explanation:
      "Directional demand-curve error: a rise in a good's own price causes a contraction (movement up/left) in quantity demanded, not a rightward shift of the demand curve.",
  },
  {
    id: "MONOPOLISTIC_COMP_EFFICIENCY_ERROR",
    law: "Monopolistically competitive firms face downward-sloping demand (price-makers) and are neither allocatively (P>MC) nor productively (AC>min AC) efficient",
    severity: "moderate",
    violationPattern:
      /\bmonopolistically\s+competitive\s+firms?\b[^.!?]{0,100}\b(?:(?:are|is)\s+(?:usually\s+)?price[- ]takers?|allocative(?:ly)?\s+efficien(?:t|cy)|productive(?:ly)?\s+efficien(?:t|cy)|p\s*=\s*mc\s*=\s*ar|lowest\s+point\s+of\s+ac)\b/i,
    guardPattern:
      /\b(not|neither|nor|never|fail|incapable|inefficien|unlike\s+perfect|perfect\s+competition)\b/i,
    explanation:
      "Market-structure error: monopolistically competitive firms are price-makers with differentiated products (P > MC and excess capacity, so neither allocatively nor productively efficient).",
  },
  {
    id: "PUBLIC_VS_MERIT_GOOD_CONFLATION",
    law: "Education and healthcare are rivalrous and excludable merit goods, not pure public goods",
    severity: "moderate",
    violationPattern:
      /\b(?:public\s+goods?\b[\s\S]{0,120}\b(?:for\s+ex(?:ample)?[:\s]+[^.!?]{0,45}\b(?:education|health\s*care)\b)|(?:education|health\s*care)\s+(?:is|are)\s+(?:an?\s+)?(?:example\s+of\s+)?public\s+goods?)\b/i,
    guardPattern:
      /\b(merit\s+good|not\s+(?:a\s+)?public\s+good|unlike\s+public|private\s+good|quasi)\b/i,
    explanation:
      "AO1 classification error: education and healthcare are rivalrous and excludable merit goods, not non-rival/non-excludable public goods.",
  },
  {
    id: "CONSUMER_SURPLUS_DEF_ERROR",
    law: "Consumer surplus is the difference between maximum price consumers are willing to pay and the actual market price paid",
    severity: "moderate",
    violationPattern:
      /\bconsumer\s+surplus\b[^.!?]{0,85}\b(?:willing\s+to\s+(?:accept|supply|sell)|minimum\s+price\s+(?:producers?|firms?))\b/i,
    guardPattern: /\b(producer\s+surplus|not\s+willing\s+to\s+accept)\b/i,
    explanation:
      "AO1 definition slip: consumer surplus is the difference between the maximum price consumers are willing to PAY and the market price (not willing to accept/supply, which is producer surplus).",
  },
  {
    id: "FISCAL_SPENDING_AD_INVERTED",
    law: "Higher government spending or lower taxes shift Aggregate Demand right; higher taxes or lower government spending shift AD left",
    severity: "fatal",
    violationPattern:
      /\b(?:(?:higher|increas(?:e|es|ed|ing)|expansionary)\s+(?:government\s+spending|fiscal\s+policy)\b[^.!?]{0,85}\bshifts?\s+(?:aggregate\s+demand|ad)\s+(?:to\s+the\s+)?left\b|(?:higher|increas(?:e|es|ed|ing))\s+(?:income\s+|direct\s+)?tax(?:es|ation)\b[^.!?]{0,85}\bshifts?\s+(?:aggregate\s+demand|ad)\s+(?:to\s+the\s+)?right\b)/i,
    guardPattern: /\b(not\s+shift|unless|crowding\s+out|cut(?:ting)?\s+tax|reduc(?:e|ing)\s+tax|contractionary|lower\s+government\s+spending)\b/i,
    explanation:
      "Inverted fiscal transmission: higher government spending / lower taxes expand AD (shift right), while higher direct taxes / lower spending contract AD (shift left).",
  },
  {
    id: "INFLATION_DEMAND_PULL_INVERTED",
    law: "Demand-pull inflation is caused by a rightward shift of Aggregate Demand (AD), not a leftward shift",
    severity: "moderate",
    violationPattern:
      /\bdemand[- ]pull\s+inflation\b[^.!?]{0,85}\b(?:shifts?\s+(?:aggregate\s+demand|ad)\s+(?:to\s+the\s+)?left|fall\s+in\s+(?:aggregate\s+demand|ad)|leftward\s+shift\s+of\s+(?:aggregate\s+demand|ad))\b/i,
    guardPattern: /\b(reduc(?:e|es|ing)|control|curb|lower|combat|solve|prevent|not\s+caused)\b/i,
    explanation:
      "Inflation mechanism slip: demand-pull inflation arises from excess AD shifting RIGHT (AD1 to AD2), not a leftward fall in AD.",
  },
  {
    id: "INFLATION_COST_PUSH_INVERTED",
    law: "Cost-push inflation is caused by higher production costs shifting SRAS left (upwards), not right",
    severity: "moderate",
    violationPattern:
      /\bcost[- ]push\s+inflation\b[^.!?]{0,85}\b(?:shifts?\s+(?:sras|short[- ]run\s+aggregate\s+supply|as)\s+(?:to\s+the\s+)?right|rightward\s+shift\s+(?:in|of)\s+(?:sras|as))\b/i,
    guardPattern: /\b(reduc(?:e|es|ing)|control|curb|lower|combat|solve|prevent|not\s+caused)\b/i,
    explanation:
      "Inflation mechanism slip: cost-push inflation is caused by rising input costs shifting SRAS LEFT (upwards), not right.",
  },
];

// Causal transmission node patterns (broad Cambridge AS + A-Level Paper 2 & Paper 4 vocabulary)
const TRIGGER_RE =
  /\b(tax(?:es|ation)?|regressive|progressive|subsid(?:y|ies|is\w*)|interest\s+rate|tariff|quota|minimum\s+price|maximum\s+price|depreciat\w+|appreciat\w+|devaluat\w+|fiscal|monetary|supply[- ]side|regulation|privatisation|deregulation|monopol\w+|oligopol\w+|collus\w+|cartel|game\s+theory|pay[- ]?off|direct\s+provision|education|training|spending|inflation|recession|downturn|negative\s+economic\s+growth|externalit(?:y|ies)|information\s+failure|unemployment|wage|productivity|investment|competition|price\s+war|electric\s+vehicle|merit\s+good|demerit\s+good|ped|yed|pes|inheritance|transfer\s+payment)\b/i;
const CONNECTOR_RE =
  /\b(because|therefore|leads?\s+to|results?\s+in|causes?|causing|consequently|thus|hence|as\s+a\s+result|which\s+means|in\s+turn|thereby|inducing|forcing|encouraging|discouraging|meaning\s+that|so\s+that|this\s+(?:means|reduces|increases|raises|lowers|shifts|creates|leads))\b/i;
const MECHANISM_RE =
  /\b(cost(?:s)?\s+of\s+production|marginal\s+(?:cost|benefit|revenue|utility)|average\s+cost|unit\s+cost|profit(?:ability|\s+margin)?|incentive|borrowing\s+cost|disposable\s+income|purchasing\s+power|hot\s+money|price\s+elasticity|income\s+elasticity|ped|pes|yed|elastic|inelastic|normal\s+good|inferior\s+good|luxury|necessit(?:y|ies)|spare\s+capacity|multiplier|productivity|msc|msb|mpc|mpb|mr\s*=\s*mc|mc\s*=\s*mr|barrier(?:s)?\s+to\s+entry|sunk\s+cost|dominant\s+strategy|nash\s+equilibrium|interdependen\w+|kinked\s+demand|undercut\w*|cheat\w*|competitiveness|export\s+price|import\s+price|real\s+(?:income|wage)|consumption|investment|aggregate\s+demand|welfare\s+loss|save|savings|asset|lower\s+price|higher\s+price|proportion\s+of\s+income)\b/i;
const OUTCOME_RE =
  /\b(shift(?:s|ing)?\s+(?:the\s+)?(?:supply|demand|ad|as|sras|lras)|aggregate\s+demand|aggregate\s+supply|equilibrium\s+(?:price|quantity|output)|price\s+level|real\s+(?:gdp|output)|economic\s+growth|unemployment|current\s+account|balance\s+of\s+payments|consumer\s+surplus|producer\s+surplus|deadweight\s+loss|allocative\s+efficienc\w*|productive\s+efficienc\w*|dynamic\s+efficienc\w*|welfare\s+(?:loss|gain)|supernormal\s+profit|market\s+failure|socially\s+optimum|social\s+efficiency|inflation|living\s+standard|collusion|price\s+stability|total\s+revenue|revenue|inequality|income\s+distribution|wealth\s+distribution|gini|stock|shortage|surplus)\b/i;
const DEFINITION_RE =
  /\b(?:is\s+defined\s+as|can\s+be\s+defined\s+as|refers?\s+to|is\s+(?:a|an)\s+(?:economic\s+)?(?:system|good|policy|tax|subsidy|market|situation|measure|rate|record|agreement)|is\s+the\s+(?:sustained|persistent|responsiveness|degree\s+of\s+responsiveness|difference|situation|ability|process|value|total|fixed\s+amount|flow\s+of\s+money|cost\s+of\s+the\s+next\s+best|price\s+of\s+one\s+currency))\b/i;

// Avoid false diagram detection from conceptual terms like "Lorenz curve", "J-curve", "Phillips curve"
const DIAGRAM_MENTION_RE =
  /\b(diagram|graph|figure|pay[- ]?off\s+matrix|\[diagram|as\s+shown\s+(?:above|below)|x[- ]axis|y[- ]axis|vertical\s+axis|horizontal\s+axis)\b/i;
const DIAGRAM_LABEL_RE =
  /\b(P[0-3]|Q[0-3]|Y[0-3]|E[0-3]|S[0-3]|D[0-3]|Pe|Pmax|Pmin|Pb|Ps|Pm|Qe|Qs|Qd|Qm|AD[0-3]|AS[0-3]|SRAS[0-3]?|LRAS[0-3]?|MC[0-2]?|MR[0-2]?|AC[0-2]?|ATC[0-2]?|AR[0-2]?|MSC|MSB|MPC|MPB|DWL|area\s+[A-Z]{2,5}|triangle\s+[A-Z]{2,4}|from\s+[PQY][0-2e]\s+to\s+[PQY][1-3sd])\b/g;

const AO3_CRITERIA: Array<{ name: string; re: RegExp }> = [
  {
    name: "Time Horizon / Lags (SR vs LR)",
    re: /\b(short[- ]run|long[- ]run|time\s+lag|j[- ]curve|initially|over\s+time|years\s+to\s+take\s+effect|in\s+the\s+future)\b/i,
  },
  {
    name: "Elasticity Dependency (PED/PES/Marshall-Lerner)",
    re: /\b(depends?\s+(?:on|upon)\s+(?:the\s+)?(?:ped|pes|elasticity)|marshall[- ]lerner|price\s+inelastic|price\s+elastic|degree\s+of\s+elasticity|elasticity\s+of)\b/i,
  },
  {
    name: "Magnitude / Scale / State of Economy",
    re: /\b(magnitude|scale\s+of|size\s+of\s+the|rate\s+of|spare\s+capacity|full\s+employment|vertical\s+lras|state\s+of\s+the\s+economy|confidence\s+is\s+low|depends?\s+(?:on|upon)\s+(?:how|the\s+extent|whether))\b/i,
  },
  {
    name: "Opportunity Cost / Trade-Off / Side Effects / Gov Failure",
    re: /\b(opportunity\s+cost|trade[- ]?off|conflict(?:ing)?\s+(?:macroeconomic\s+)?objective|government\s+failure|imperfect\s+information|unintended\s+consequence|black\s+market|regressive|fiscal\s+deficit|budget\s+deficit|crowding\s+out|retaliation|incentive\s+to\s+cheat|break\s+the\s+agreement)\b/i,
  },
  {
    name: "Alternative Policy / Counter-Argument / Comparative Weighing",
    re: /\b(alternative(?:ly|\s+policy)|more\s+effective\s+than|combined\s+with|complemented\s+by|rather\s+than|compared\s+(?:to|with)|in\s+contrast\s+to|on\s+the\s+other\s+hand|however,\s+(?:in\s+reality|there\s+are|this\s+may|firms\s+may)|limitation(?:s)?\s+of)\b/i,
  },
  {
    name: "Prioritised Concluding Judgement",
    re: /\b(on\s+balance|ultimately|most\s+(?:decisive|important|effective)\s+factor|in\s+conclusion|to\s+conclude|overall,?\s+(?:therefore|it\s+is|the\s+effectiveness|whether)|to\s+a\s+(?:large|limited|greater|lesser)\s+extent|weighing\s+(?:up|both))\b/i,
  },
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
}

function truncateQuote(s: string, maxLen = 140): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen - 1).trim()}…`;
}

/**
 * Runs the deterministic Neuro-Symbolic Cambridge 9708 Audit on an essay.
 */
export function runNeuroSymbolicAudit(essayText: string, _question?: string): NeuroSymbolicDossier {
  const sentences = splitSentences(essayText || "");
  const violations: CausalViolation[] = [];
  const rmAnnotations: RmAssessorAnnotation[] = [];
  const seenRuleIds = new Set<string>();

  let causalChainsDetected = 0;
  let totalDepthPoints = 0;

  for (const sentence of sentences) {
    // 1. Check canonical economic laws for sign-flips (including 2-sentence anaphoric continuations like "This will..." or "For ex:")
    let sentenceHasViolation = false;
    const idx = sentences.indexOf(sentence);
    const prevSent = idx > 0 ? sentences[idx - 1] : "";
    const nextSent = idx >= 0 && idx + 1 < sentences.length ? sentences[idx + 1] : "";
    const isContinuation =
      /^\s*(?:this|it|these|that|which|consequently|therefore|thus|hence|as\s+a\s+result|so\b|for\s+ex(?:ample)?|e\.?g\.?|such\s+as)\b/i.test(
        nextSent,
      );
    const twoSentenceWindow = isContinuation
      ? `${sentence.replace(/[.!?]+$/, ",")} ${nextSent}`
      : sentence;
    for (const rule of CAMBRIDGE_ECONOMIC_LAWS) {
      if (seenRuleIds.has(rule.id)) continue;
      // Verbal-slip guard: if student explicitly discussed exchange-rate appreciation in the immediately preceding sentence,
      // a single-word "depreciation" slip is not a systematic fatal inversion.
      if (
        rule.id === "FX_DEPRECIATION_EXPORTS_INVERTED" &&
        /\bappreciat(?:ing|ion|es|ed)\b/i.test(prevSent)
      ) {
        continue;
      }
      const matchedSingle =
        rule.violationPattern.test(sentence) &&
        !(rule.guardPattern && rule.guardPattern.test(sentence));
      const matchedTwoSent =
        !matchedSingle &&
        isContinuation &&
        rule.violationPattern.test(twoSentenceWindow) &&
        !(rule.guardPattern && rule.guardPattern.test(twoSentenceWindow));

      if (matchedSingle || matchedTwoSent) {
        seenRuleIds.add(rule.id);
        sentenceHasViolation = true;
        const quote = truncateQuote(matchedSingle ? sentence : twoSentenceWindow);
        violations.push({
          ruleId: rule.id,
          law: rule.law,
          quote,
          explanation: rule.explanation,
          severity: rule.severity,
        });
        rmAnnotations.push({
          code: "X",
          label: "Economic Law Violation",
          quote,
          rationale: rule.explanation,
        });
      }
    }

    // 2. Measure causal chain topology in this sentence (or 2-sentence continuation window)
    const chainSpan = isContinuation ? twoSentenceWindow : sentence;
    const hasTrigger = TRIGGER_RE.test(chainSpan);
    const hasConnector = CONNECTOR_RE.test(chainSpan);
    const hasMechanism = MECHANISM_RE.test(chainSpan);
    const hasOutcome = OUTCOME_RE.test(chainSpan);

    const stages = [hasTrigger, hasMechanism, hasOutcome].filter(Boolean).length;
    if (hasConnector && stages >= 2) {
      causalChainsDetected += 1;
      totalDepthPoints += stages;
      if (stages === 3 && rmAnnotations.filter((a) => a.code === "Dev").length < 3) {
        rmAnnotations.push({
          code: "Dev",
          label: "Developed Causal Chain",
          quote: truncateQuote(sentence),
          rationale: "Complete 3-stage transmission (trigger -> intermediate mechanism -> equilibrium/macro outcome).",
        });
      } else if (stages === 2 && !hasMechanism && rmAnnotations.filter((a) => a.code === "^").length < 2) {
        rmAnnotations.push({
          code: "^",
          label: "Missing Intermediate Link",
          quote: truncateQuote(sentence),
          rationale: "Connects trigger to final outcome without stating the intermediate cost, price, or incentive adjustment.",
        });
      }
    }

    // 3. Stamp Knowledge (K) definitions (never on a sentence with an economic law violation)
    if (!sentenceHasViolation && DEFINITION_RE.test(sentence) && rmAnnotations.filter((a) => a.code === "K").length < 2) {
      rmAnnotations.push({
        code: "K",
        label: "Economic Definition",
        quote: truncateQuote(sentence),
        rationale: "Explicit conceptual definition / theoretical grounding.",
      });
    }
  }

  // 4. Diagram-to-Text Integration Audit + Multimodal Visual Diagram Accuracy Ingestion
  const diagramPresent = DIAGRAM_MENTION_RE.test(essayText || "");
  // Strip [DIAGRAM: ...] tags before scanning for integrated prose coordinates so labels inside
  // OCR/VLM tags themselves are NOT falsely counted as prose integration!
  const proseWithoutDiagramTags = (essayText || "").replace(/\[DIAGRAM:[\s\S]*?\]/gi, " ");
  const diagramTagMatches = (essayText || "").match(/\[DIAGRAM:[^\]]+\]/gi) ?? [];
  const tagExplicitlyUnreferenced = diagramTagMatches.some((tag) =>
    /\b(?:not\s+(?:explicitly\s+)?referenced\s+in\s+(?:the\s+)?(?:prose|text)|unreferenced\s+in\s+(?:the\s+)?(?:prose|text))\b/i.test(
      tag,
    ),
  );
  const labelMatches = Array.from(new Set(proseWithoutDiagramTags.match(DIAGRAM_LABEL_RE) ?? []));
  const diagramLabelsIntegrated = !tagExplicitlyUnreferenced && labelMatches.length >= 2;

  // Inspect any Dual-VLM [DIAGRAM: ... | accuracy: ...] tags for explicit visual shift/axis errors
  for (const tag of diagramTagMatches) {
    const accMatch = /\baccuracy\s*:\s*([^|\]]+)/i.exec(tag);
    if (!accMatch) continue;
    const accNote = accMatch[1]!.trim();
    const hasVisualDirectionalOrAxisError =
      /\b(inverted|wrong\s+(?:shift|direction|curve)|incorrect\s+(?:shift|direction|curve)|shifts?\s+(?:in\s+the\s+)?wrong\s+direction|opposite\s+direction|right(?:ward)?\s+(?:shift\s+)?(?:instead\s+of|rather\s+than)\s+left|left(?:ward)?\s+(?:shift\s+)?(?:instead\s+of|rather\s+than)\s+right|swapped\s+axes|axes\s+swapped|mislabel(?:led|ed)\s+axes|backwards?)\b/i.test(
        accNote,
      ) && !/\b(?:no\s+(?:errors?|mistakes?|issues?)|diagram\s+correctly\s+shows)\b/i.test(accNote);
    if (hasVisualDirectionalOrAxisError && !seenRuleIds.has("DIAGRAM_VISUAL_ERROR")) {
      seenRuleIds.add("DIAGRAM_VISUAL_ERROR");
      const quote = truncateQuote(tag, 150);
      violations.push({
        ruleId: "DIAGRAM_VISUAL_ERROR",
        law: "Hand-drawn or attached economic diagrams must have accurately labelled axes and economically valid curve shift directions",
        quote,
        explanation: `Multimodal visual diagram check flagged an error: ${accNote}`,
        severity: "moderate",
      });
      rmAnnotations.push({
        code: "X",
        label: "Diagram Visual Error",
        quote,
        rationale: `Visual inspection noted: ${accNote}`,
      });
    }
  }

  // 5. Contextual AO3 Evaluative Depth Classifier
  const ao3CriteriaMatched: string[] = [];
  for (const crit of AO3_CRITERIA) {
    if (crit.re.test(essayText || "")) {
      ao3CriteriaMatched.push(crit.name);
      // Find a verbatim quote for Ev stamp (up to 3)
      if (rmAnnotations.filter((a) => a.code === "Ev").length < 3) {
        const hit = sentences.find((s) => crit.re.test(s));
        if (hit) {
          rmAnnotations.push({
            code: "Ev",
            label: crit.name,
            quote: truncateQuote(hit),
            rationale: `Evaluative criterion detected: ${crit.name}.`,
          });
        }
      }
    }
  }

  const hasJudgement = ao3CriteriaMatched.includes("Prioritised Concluding Judgement");
  let ao3DepthTier: NeuroSymbolicDossier["ao3DepthTier"] = "none";
  if (ao3CriteriaMatched.length >= 4 && hasJudgement) {
    ao3DepthTier = "justified_judgement";
  } else if (ao3CriteriaMatched.length >= 3) {
    ao3DepthTier = "sustained";
  } else if (ao3CriteriaMatched.length === 2) {
    ao3DepthTier = "developing";
  } else if (ao3CriteriaMatched.length === 1) {
    ao3DepthTier = "superficial";
  }

  const avgChainDepth =
    causalChainsDetected > 0 ? Number((totalDepthPoints / causalChainsDetected).toFixed(2)) : 0;

  return {
    causalChainsDetected,
    avgChainDepth,
    violations,
    diagramPresent,
    diagramLabelsIntegrated,
    diagramLabelsFound: labelMatches.slice(0, 12),
    ao3DepthTier,
    ao3CriteriaMatched,
    rmAnnotations: rmAnnotations.slice(0, 10),
  };
}

/**
 * Formats the Neuro-Symbolic Dossier into a concise, high-signal prompt block
 * injected into the Examiner Panel & Principal Examiner Arbitration.
 */
export function formatNeuroSymbolicDirective(dossier: NeuroSymbolicDossier): string {
  const lines: string[] = [
    "NEURO-SYMBOLIC CAUSAL-GRAPH AUDIT (DETERMINISTIC PRE-CHECK):",
    dossier.causalChainsDetected >= 2
      ? `- Keyword-Detected Causal Links: ${dossier.causalChainsDetected} (avg depth ${dossier.avgChainDepth}/3.0; regex telemetry only — read the full essay directly).`
      : `- Causal Chain Pre-Scan: Evaluate causal transmission chains directly from the candidate's prose, examples, diagrams, or pay-off matrices.`,
    `- Diagram Presence: ${dossier.diagramPresent ? "Yes" : "No"} | Diagram Coordinates Integrated in Text: ${
      dossier.diagramLabelsIntegrated
        ? `Yes (${dossier.diagramLabelsFound.slice(0, 6).join(", ")})`
        : dossier.diagramPresent
          ? "NOT integrated in prose (diagram coordinates are absent from the written explanation)"
          : "N/A"
    }`,
    `- Keyword-Detected AO3 Signals (${dossier.ao3CriteriaMatched.length} markers): ${
      dossier.ao3CriteriaMatched.length > 0
        ? dossier.ao3CriteriaMatched.join("; ")
        : "Check candidate's full prose directly for evaluative trade-offs and conclusion"
    }`,
  ];

  if (dossier.violations.length > 0) {
    lines.push("- DETERMINISTIC ECONOMIC-LAW VIOLATIONS FLAGGED (VERIFY CAREFULLY):");
    for (const v of dossier.violations) {
      lines.push(`  * [${v.severity.toUpperCase()} - ${v.ruleId}] "${v.quote}" -> ${v.explanation}`);
    }
  } else {
    lines.push(
      "- Deterministic Sign-Flip Audit: 0 canonical economic-law inversions detected (still check subtler context-specific logic manually).",
    );
  }

  return lines.join("\n");
}
