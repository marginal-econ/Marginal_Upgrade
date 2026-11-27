import type { IssueV2 } from "./types";
import { stripStars } from "./clean-suggestion";

export type CausalChainStep = {
  text: string;
  stage: "cause" | "intermediate_adjustment" | "final_equilibrium";
};

export type CausalAnalysisResult = {
  isComplete: boolean;
  steps: CausalChainStep[];
  missingLinks: string[];
  feedback?: string;
};

// Patterns representing Cambridge economic transmission steps
const CAUSAL_CONNECTORS = /\b(because|therefore|leads to|results in|causes?|causing|resulting in|as a consequence|which means that|consequently|thus|hence|in turn|spurs?|generates?|diminishes?|compels?|forces?|when|if|as)\b/i;
const COST_PRICE_SHIFTS = /\b(costs? of production|average costs?|marginal costs?|prices? rise|prices? fall|higher prices?|lower prices?|equilibrium price|market price|profit margin|profitability|subsid|tax burden)\b/i;
const OUTPUT_EMPLOYMENT_SHIFTS = /\b(output contracts?|output expands?|production increases?|production decreases?|employment falls?|jobs? lost|unemployment rises?|hiring increases?|(?:shifting|shifts?)\s+(?:domestic\s+|market\s+)?(?:supply|demand)|supply shifts?|demand shifts?|consumer prices?|market equilibrium)\b/i;
const MACRO_SHIFTS = /\b(aggregate demand|real gdp|economic growth|current account balance|inflation rate|purchasing power|exchange rate|national debt)\b/i;

/**
 * Analyzes whether an economic argument contains an unbroken causal transmission chain.
 */
export function analyzeCausalChain(sentence: string): CausalAnalysisResult {
  const steps: CausalChainStep[] = [];
  const missingLinks: string[] = [];

  const hasConnector = CAUSAL_CONNECTORS.test(sentence);
  const hasMicroShift = COST_PRICE_SHIFTS.test(sentence);
  const hasOutputShift = OUTPUT_EMPLOYMENT_SHIFTS.test(sentence);
  const hasMacroShift = MACRO_SHIFTS.test(sentence);

  if (hasConnector && (hasMicroShift || hasOutputShift || hasMacroShift)) {
    steps.push({ text: "Cause / policy trigger", stage: "cause" });
  }

  if (hasMicroShift) {
    steps.push({ text: "Intermediate market adjustment (prices/costs/supply)", stage: "intermediate_adjustment" });
  }

  if (hasOutputShift || hasMacroShift) {
    steps.push({ text: "Final equilibrium impact (output/welfare/macro)", stage: "final_equilibrium" });
  }

  // Check for leap-in-logic: trigger mentioned with final outcome, but zero intermediate price/cost mechanism
  if (hasConnector && (hasOutputShift || hasMacroShift) && !hasMicroShift && sentence.split(/\s+/).length < 25) {
    missingLinks.push("Intermediate transmission mechanism: explain how costs, prices, or incentives adjust before the final outcome occurs.");
  }

  const isComplete = steps.length >= 2 && missingLinks.length === 0;

  return {
    isComplete,
    steps,
    missingLinks,
    feedback: missingLinks.length > 0 ? missingLinks[0] : undefined,
  };
}

/**
 * Checks for genuine Cambridge AO3 evaluative depth.
 */
export function evaluateEvaluativeDepth(text: string): {
  depth: "none" | "superficial" | "sustained" | "justified_judgement";
  criteriaDetected: string[];
} {
  const criteriaDetected: string[] = [];
  const norm = text.toLowerCase();

  if (/\b(in the short[- ]run|in the long[- ]run|time lag|short vs long run)\b/i.test(norm)) {
    criteriaDetected.push("Time Horizon / Elasticity Dynamics");
  }
  if (/\b(ped|pes|yed|elastic|inelastic|degree of elasticity)\b/i.test(norm)) {
    criteriaDetected.push("Price Elasticity Dependency");
  }
  if (/\b(magnitude|scale of|size of the (?:tax|subsidy|cut|deficit)|significance of)\b/i.test(norm)) {
    criteriaDetected.push("Magnitude & Scale");
  }
  if (/\b(depends (?:on|upon)|contingent on|crucially relies)\b/i.test(norm)) {
    criteriaDetected.push("Contextual Dependency ('Depends On' Factor)");
  }
  if (/\b(opportunity cost|trade-?off|conflicting (?:macroeconomic|policy) objective)\b/i.test(norm)) {
    criteriaDetected.push("Opportunity Cost / Policy Trade-off");
  }
  if (/\b(on balance|overall|in conclusion|ultimately|most decisive factor|weighing both)\b/i.test(norm)) {
    criteriaDetected.push("Decisive Supported Judgement");
  }

  let depth: "none" | "superficial" | "sustained" | "justified_judgement" = "none";
  if (criteriaDetected.length >= 3 || (criteriaDetected.includes("Decisive Supported Judgement") && criteriaDetected.length >= 2)) {
    depth = "justified_judgement";
  } else if (criteriaDetected.length >= 2) {
    depth = "sustained";
  } else if (criteriaDetected.length === 1) {
    depth = "superficial";
  } else if (
    /\b(however|on the other hand|nevertheless|conversely)\b/i.test(norm) &&
    /\b(price|cost|demand|supply|market|tax|subsidy|firm|consumer|inflation|gdp|elastic|ped|goods?|revenue|output|welfare)\b/i.test(norm)
  ) {
    depth = "superficial";
  }

  return { depth, criteriaDetected };
}

export type MisconceptionRule = {
  id: string;
  pattern: RegExp;
  flagWord: string;
  suggestion: string;
  explanation: string;
  category: "economics_accuracy" | "terminology";
};

/**
 * Deterministic Cambridge Economics Misconception Rules.
 */
export const EXTENDED_MISCONCEPTIONS: MisconceptionRule[] = [
  {
    id: "tax_shifts_demand",
    pattern: /\b(?:an?|the)?\s*indirect tax\s+(?:will\s+)?shifts?\s+(?:the\s+)?demand\s+curve\s+(?:to the\s+)?left\b/i,
    flagWord: "shifts the demand curve left",
    suggestion: "shifts the supply curve vertically upwards by the amount of the tax",
    explanation: "An indirect tax is levied on producers, increasing marginal costs and shifting the SUPPLY curve upward/left, NEVER the demand curve.",
    category: "economics_accuracy",
  },
  {
    id: "subsidy_shifts_demand",
    pattern: /\b(?:a|the)?\s*subsidy\s+(?:will\s+)?shifts?\s+(?:the\s+)?demand\s+curve\s+(?:to the\s+)?right\b/i,
    flagWord: "shifts the demand curve right",
    suggestion: "shifts the supply curve vertically downwards/right by the unit subsidy amount",
    explanation: "A producer subsidy reduces per-unit production costs, shifting SUPPLY rightwards, causing an extension along the demand curve.",
    category: "economics_accuracy",
  },
  {
    id: "demand_vs_quantity_demanded",
    pattern: /\b(?:a\s+)?rise in price\s+(?:will\s+)?decreases?\s+demand\b/i,
    flagWord: "decreases demand",
    suggestion: "causes a contraction in quantity demanded along the existing demand curve",
    explanation: "A change in price causes a movement ALONG the demand curve (change in quantity demanded), NOT a shift of the demand curve itself.",
    category: "economics_accuracy",
  },
  {
    id: "supply_vs_quantity_supplied",
    pattern: /\b(?:a\s+)?fall in price\s+(?:will\s+)?decreases?\s+supply\b/i,
    flagWord: "decreases supply",
    suggestion: "causes a contraction in quantity supplied along the supply curve",
    explanation: "A change in own-price causes a movement ALONG the supply curve, not a change in underlying supply conditions.",
    category: "economics_accuracy",
  },
  {
    id: "inelastic_tax_consumption_trap",
    pattern: /\bbecause demand is inelastic,?\s+(?:the\s+)?tax is (?:very|highly|most)\s+effective at reducing consumption\b/i,
    flagWord: "tax is very effective at reducing consumption",
    suggestion: "tax is relatively ineffective at reducing consumption because consumers are unresponsive to price changes",
    explanation: "When demand is price-inelastic (|PED| < 1), a price increase leads to a smaller percentage fall in quantity demanded (%ΔQd < %ΔP). Thus consumption falls very little, although tax revenue is maximized.",
    category: "economics_accuracy",
  },
  {
    id: "hyperinflation_misconception",
    pattern: /\bhyperinflation is when inflation (?:rises|increases|is high|goes up)\b/i,
    flagWord: "hyperinflation is when inflation rises",
    suggestion: "hyperinflation is an extreme, unmanageable rise in price levels (typically exceeding 50% per month) where money loses its medium-of-exchange function",
    explanation: "Hyperinflation is not merely rising or high inflation; it is catastrophic price growth exceeding 50% monthly where the domestic currency collapses.",
    category: "economics_accuracy",
  },
  {
    id: "growth_vs_development",
    pattern: /\beconomic growth (?:guarantees|ensures|automatically means)\s+(?:an?\s+)?increase in economic development\b/i,
    flagWord: "automatically means an increase in economic development",
    suggestion: "does not automatically guarantee economic development if gains are concentrated among elites, generate severe pollution, or neglect health and education",
    explanation: "Economic growth measures quantitative increases in real GDP, whereas economic development reflects qualitative improvements in living standards, life expectancy, and education (HDI).",
    category: "economics_accuracy",
  },
  {
    id: "fiscal_vs_monetary_mixup",
    pattern: /\bfiscal policy (?:involves|uses|adjusts)\s+(?:changing\s+)?interest rates\b/i,
    flagWord: "fiscal policy involves changing interest rates",
    suggestion: "monetary policy involves changing interest rates, whereas fiscal policy uses government taxation and public expenditure",
    explanation: "Interest rate manipulation and quantitative easing are tools of MONETARY policy managed by the central bank. Fiscal policy is controlled by the government via taxation and state spending.",
    category: "economics_accuracy",
  },
  {
    id: "current_account_vs_fdi",
    pattern: /\bforeign direct investment\s+(?:is recorded in|enters)\s+the current account\b/i,
    flagWord: "enters the current account",
    suggestion: "is recorded in the financial account of the balance of payments (though subsequent profit repatriation enters the primary income balance)",
    explanation: "FDI (e.g. building a manufacturing plant abroad) is recorded in the FINANCIAL account. Only the investment income flows (profits, dividends) return to the current account.",
    category: "economics_accuracy",
  },
  {
    id: "real_vs_nominal",
    pattern: /\bnominal gdp (?:measures|shows|adjusts for)\s+(?:inflation|real output|price changes)\b/i,
    flagWord: "nominal gdp measures inflation",
    suggestion: "real GDP is adjusted for inflation using the GDP deflator, whereas nominal GDP is measured at current market prices without inflation adjustment",
    explanation: "Nominal values reflect current market prices and can rise purely from inflation; Real values are adjusted for price changes to measure physical output volume.",
    category: "economics_accuracy",
  },
  {
    id: "min_price_below_equilibrium",
    pattern: /\bminimum price\s+(?:set\s+)?below\s+(?:the\s+)?equilibrium(?:\s+price)?\s+(?:causes?|creates?|leads?\s+to|results?\s+in)\s+(?:a\s+)?(?:surplus|excess supply)\b/i,
    flagWord: "minimum price below equilibrium causes a surplus",
    suggestion: "minimum price set ABOVE the equilibrium price creates excess supply (a surplus), whereas one set below equilibrium has no effect",
    explanation: "A minimum price (price floor) is only binding and creates excess supply when set ABOVE the free-market equilibrium price.",
    category: "economics_accuracy",
  },
  {
    id: "max_price_above_equilibrium",
    pattern: /\bmaximum price\s+(?:set\s+)?above\s+(?:the\s+)?equilibrium(?:\s+price)?\s+(?:causes?|creates?|leads?\s+to|results?\s+in)\s+(?:a\s+)?(?:shortage|excess demand)\b/i,
    flagWord: "maximum price above equilibrium causes a shortage",
    suggestion: "maximum price set BELOW the equilibrium price creates excess demand (a shortage), whereas one set above equilibrium has no effect",
    explanation: "A maximum price (price ceiling) is only binding and creates a shortage when set BELOW the free-market equilibrium price.",
    category: "economics_accuracy",
  },
  {
    id: "depreciation_exports_expensive",
    pattern: /\b(?:a\s+)?(?:currency\s+)?depreciation\s+(?:makes?|causes?)\s+exports\s+(?:more\s+)?expensive\b/i,
    flagWord: "depreciation makes exports more expensive",
    suggestion: "depreciation makes exports cheaper in foreign currency (and imports more expensive domestically)",
    explanation: "When a currency depreciates, foreign buyers need less of their currency to buy domestic goods, making exports CHEAPER and imports more expensive.",
    category: "economics_accuracy",
  },
  {
    id: "appreciation_exports_cheaper",
    pattern: /\b(?:a\s+)?(?:currency\s+)?appreciation\s+(?:makes?|causes?)\s+exports\s+cheaper\b/i,
    flagWord: "appreciation makes exports cheaper",
    suggestion: "appreciation makes exports more expensive in foreign currency (and imports cheaper domestically)",
    explanation: "When a currency appreciates, foreign buyers must pay more of their currency for domestic goods, making exports MORE EXPENSIVE and imports cheaper.",
    category: "economics_accuracy",
  },
  {
    id: "ppc_inside_allocative",
    pattern: /\b(?:a\s+)?point\s+inside\s+(?:the\s+)?(?:ppc|ppf)\s+(?:shows?|represents?|indicates?|means?)\s+(?:allocative|pareto)\s+inefficiency\b/i,
    flagWord: "point inside the PPC indicates allocative inefficiency",
    suggestion: "point inside the PPC indicates productive inefficiency (unemployed or underutilised resources)",
    explanation: "A point inside the PPC shows productive inefficiency (idle/underutilised resources). Allocative efficiency depends on whether the output mix matches consumer preferences (P = MC).",
    category: "economics_accuracy",
  },
  {
    id: "monopoly_allocative_efficient",
    pattern: /\b(?:a\s+)?profit[- ]maximis(?:ing|zing)\s+monopol(?:y|ist)\s+(?:produces?\s+where\s+p\s*=\s*mc|is\s+allocatively\s+efficient)\b/i,
    flagWord: "profit-maximising monopoly is allocatively efficient",
    suggestion: "profit-maximising monopoly produces where MR = MC and sets P > MC, causing allocative inefficiency and deadweight loss",
    explanation: "A profit-maximising monopolist restricts output to MR = MC where price exceeds marginal cost (P > MC), resulting in allocative inefficiency.",
    category: "economics_accuracy",
  },
  {
    id: "indirect_tax_on_income",
    pattern: /\b(?:an?\s+)?indirect\s+tax\s+(?:is|means)\s+(?:a\s+)?tax\s+on\s+income\b/i,
    flagWord: "indirect tax is a tax on income",
    suggestion: "indirect tax is a tax on expenditure (goods and services), whereas a direct tax is levied on income or wealth",
    explanation: "Taxes on income and profits are DIRECT taxes; INDIRECT taxes are levied on expenditure (goods and services).",
    category: "economics_accuracy",
  },
  {
    id: "tax_shifts_supply_right",
    pattern: /\b(?:a|the|this)?\s*(?:indirect\s+)?tax\s+(?:will\s+)?shifts?\s+(?:the\s+)?supply\s+curve\s+(?:to\s+the\s+)?right\b/i,
    flagWord: "shifts the supply curve to the right",
    suggestion: "shifts the supply curve vertically upwards (to the left) by the amount of the tax",
    explanation: "An indirect tax raises firms' unit production costs, shifting the supply curve LEFT/UPWARDS, raising price and reducing quantity.",
    category: "economics_accuracy",
  },
  {
    id: "higher_rates_cheaper_borrowing",
    pattern: /\b(?:increases?|higher|rising|raises?)\s+interest\s+rates?,?\s+(?:the\s+)?cost\s+of\s+borrowing\s+(?:becomes?|gets?|is)\s+(?:cheaper|lower)\b/i,
    flagWord: "cost of borrowing becomes cheaper",
    suggestion: "cost of borrowing becomes more expensive, reducing consumption and investment",
    explanation: "Higher interest rates RAISE the cost of borrowing and increase the reward for saving, contracting C and I and shifting AD left.",
    category: "economics_accuracy",
  },
  {
    id: "higher_rates_depreciate_currency",
    pattern: /\b(?:higher|rising|increased?)\s+interest\s+rates?\s+(?:causes?|leads?\s+to|results?\s+in)\s+(?:the\s+)?(?:exchange\s+rate|currency)\s+to\s+depreciate\b/i,
    flagWord: "causes the exchange rate to depreciate",
    suggestion: "attracts hot-money inflows and causes the exchange rate to appreciate",
    explanation: "Higher domestic interest rates attract foreign capital inflows, increasing demand for the domestic currency and causing it to APPRECIATE.",
    category: "economics_accuracy",
  },
  {
    id: "producer_surplus_willing_to_pay",
    pattern: /\bproducer\s+surplus\s+(?:is|means)\s+(?:the\s+difference\s+between\s+)?(?:the\s+price\s+)?(?:producers?|firms?)\s+(?:are\s+)?willing\s+to\s+pay\b/i,
    flagWord: "producers are willing to pay",
    suggestion: "producers are willing and able to accept (minimum supply price) and the market price they actually receive",
    explanation: "Producer surplus is the difference between the market price received and the minimum price producers are willing to ACCEPT — 'willing to pay' defines consumer surplus.",
    category: "economics_accuracy",
  },
  {
    id: "devaluation_reduces_inflation",
    pattern: /\b(?:a\s+)?(?:currency\s+)?devaluation\s+(?:reduces?|lowers?|decreases?)\s+inflation\b/i,
    flagWord: "devaluation reduces inflation",
    suggestion: "devaluation raises import prices, fueling imported cost-push inflation and higher AD",
    explanation: "A currency devaluation makes imports more expensive (cost-push inflation) and boosts net exports (demand-pull inflation), INCREASING inflation rather than reducing it.",
    category: "economics_accuracy",
  },
  {
    id: "subsidy_shifts_supply_left",
    pattern: /\b(?:a\s+)?(?:government\s+)?subsid(?:y|ies)\s+(?:will\s+)?(?:shifts?|moves?)\s+(?:the\s+)?supply(?:\s+curve)?\s+(?:to\s+the\s+)?left\b/i,
    flagWord: "subsidy shifts the supply curve left",
    suggestion: "subsidy lowers firms' unit production costs and shifts the supply curve vertically downwards (to the right)",
    explanation: "A subsidy reduces production costs per unit, shifting supply RIGHT/DOWNWARDS to lower equilibrium price and expand quantity.",
    category: "economics_accuracy",
  },
  {
    id: "ppc_inside_allocative",
    pattern: /\bpoint\s+(?:inside|within|below)\s+(?:the\s+)?(?:ppc|ppf|production\s+possibility)\b[^.!?]{0,65}\b(?:allocative(?:ly)?\s+inefficien(?:t|cy)|allocative\s+efficiency)\b/i,
    flagWord: "point inside the PPC is allocatively inefficient",
    suggestion: "point inside the PPC represents productive inefficiency (unemployed or underutilised resources)",
    explanation: "Cambridge 9708 Chapter 5: a point inside the PPC shows productive inefficiency (idle resources), not allocative inefficiency.",
    category: "economics_accuracy",
  },
  {
    id: "monopoly_overproduce",
    pattern: /\b(?:monopol(?:y|ist|ies)|profit[- ]maximising\s+firms?)\b[^.!?]{0,60}\b(?:overproduc(?:e|es|ing)|produce\s+too\s+much)\b/i,
    flagWord: "monopoly overproduces",
    suggestion: "profit-maximising monopoly restricts output where MR = MC (charging P > MC), causing allocative inefficiency",
    explanation: "Profit-maximising monopolies restrict output below the socially optimal level to raise price; overproduction is associated with negative externalities (MSC > MPC).",
    category: "economics_accuracy",
  },
  {
    id: "max_price_above_equilibrium",
    pattern: /\b(?:maximum\s+price|price\s+ceiling)\b[^.!?]{0,70}\b(?:set\s+above\s+(?:the\s+)?equilibrium|creates?\s+(?:a\s+)?(?:surplus|excess\s+supply))\b/i,
    flagWord: "maximum price set above equilibrium / creates surplus",
    suggestion: "an effective maximum price is set below equilibrium and creates excess demand (a shortage)",
    explanation: "A binding price ceiling must sit BELOW equilibrium, where quantity demanded exceeds quantity supplied (shortage).",
    category: "economics_accuracy",
  },
  {
    id: "min_price_below_equilibrium",
    pattern: /\b(?:minimum\s+price|price\s+floor)\b[^.!?]{0,70}\b(?:set\s+below\s+(?:the\s+)?equilibrium|creates?\s+(?:a\s+)?(?:shortage|excess\s+demand))\b/i,
    flagWord: "minimum price set below equilibrium / creates shortage",
    suggestion: "an effective minimum price is set above equilibrium and creates excess supply (a surplus)",
    explanation: "A binding price floor must sit ABOVE equilibrium, where quantity supplied exceeds quantity demanded (surplus).",
    category: "economics_accuracy",
  },
  {
    id: "ped_inelastic_revenue_inverted",
    pattern: /\b(?:price\s+inelastic|inelastic\s+demand|ped\s*(?:<|less\s+than)\s*1)\b[^.!?]{0,70}\b(?:rais(?:e|ing)|higher|increas(?:e|ing))\s+price\b[^.!?]{0,45}\b(?:total\s+revenue\s+(?:falls?|decreases?|drops?)|reduces?\s+total\s+revenue)\b/i,
    flagWord: "inelastic demand: raising price reduces total revenue",
    suggestion: "when demand is price inelastic (|PED| < 1), raising price causes a proportionately smaller fall in quantity demanded, so total revenue rises",
    explanation: "With inelastic demand, price and total revenue move in the SAME direction.",
    category: "economics_accuracy",
  },
  {
    id: "fiscal_monetary_conflation",
    pattern: /\bmonetary\s+policy\s+(?:is|involves|uses)\s+(?:when\s+the\s+government\s+)?(?:changes?\s+)?(?:government\s+spending\s+and\s+(?:direct\s+)?taxation|taxation\s+and\s+government\s+spending)\b/i,
    flagWord: "monetary policy changes government spending and taxation",
    suggestion: "monetary policy operates via interest rates, money supply, and exchange rates (government spending and taxation are fiscal policy)",
    explanation: "Government spending and taxation are FISCAL policy instruments; monetary policy uses interest rates, money supply, and quantitative easing.",
    category: "economics_accuracy",
  },
];

/**
 * Scans a sentence for deterministic economic misconceptions.
 */
export function checkEconomicMisconceptions(sentence: string, sentenceId: string): IssueV2[] {
  const issues: IssueV2[] = [];
  const norm = sentence.trim();

  for (const rule of EXTENDED_MISCONCEPTIONS) {
    if (rule.pattern.test(norm)) {
      const match = norm.match(rule.pattern);
      const original = match ? match[0] : rule.flagWord;
      const from = norm.indexOf(original);
      const to = from >= 0 ? from + original.length : norm.length;

      issues.push({
        id: `${rule.id}::${sentenceId}`,
        sentenceId,
        from: Math.max(0, from),
        to: Math.max(0, to),
        category: rule.category,
        severity: "high",
        original: stripStars(original),
        suggestion: stripStars(rule.suggestion),
        explanation: stripStars(rule.explanation),
        evidence: "Cambridge 9708 Syllabus Core Specification",
        aoImpact: "Major AO1/AO2 mark penalty if left uncorrected.",
        status: "active",
      });
    }
  }

  return issues;
}

/**
 * Assesses the quality of real-world application in a sentence.
 */
export function assessApplicationQuality(sentence: string): {
  hasApplication: boolean;
  isSuperficial: boolean;
  contextFound?: string;
  feedback?: string;
} {
  const COUNTRY_MARKET_RE = /\b(uk|united kingdom|us|usa|united states|singapore|china|india|germany|japan|eu|european union|zimbabwe|venezuela|nhs|railway|steel industry|electric vehicles?|minimum wage in the uk|sugar tax|congestion charge)\b/i;
  const match = sentence.match(COUNTRY_MARKET_RE);

  if (!match) {
    return { hasApplication: false, isSuperficial: false };
  }

  const contextFound = match[0];
  const words = sentence.trim().split(/\s+/).length;

  // If a country is mentioned in a sentence with under 12 words (e.g. "for example in the UK."), it is superficial
  if (words < 12) {
    return {
      hasApplication: true,
      isSuperficial: true,
      contextFound,
      feedback: `Superficial reference to "${contextFound}". Integrate how the economic mechanism applies to this example to demonstrate application.`,
    };
  }

  return {
    hasApplication: true,
    isSuperficial: false,
    contextFound,
  };
}
