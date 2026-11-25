import type {
  DiagramDrill,
  DiagramMetrics,
  DiagramPreset,
  DiagramState,
  PresetMeta,
  ShadedPolygon,
} from "./types";

export const DIAGRAM_PRESET_META: Record<DiagramPreset, PresetMeta> = {
  // ── MICROECONOMICS ──────────────────────────────────────────────────────────
  supply_demand: {
    id: "supply_demand",
    title: "Supply, Demand & Elasticity",
    shortTitle: "Supply & Demand",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Demand & Supply Shifts, PED/PES, Consumer & Producer Surplus",
    description:
      "Core price mechanism diagram. Shift D or S and vary slopes (PED/PES) to model equilibrium changes and surplus redistribution.",
  },
  ppc: {
    id: "ppc",
    title: "Production Possibility Curve (PPC)",
    shortTitle: "PPC (Opportunity Cost)",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Consumer Goods",
    yAxis: "Capital Goods",
    syllabusTopics: "Scarcity, Opportunity Cost, Efficiency, Economic Growth",
    description:
      "Illustrate increasing vs constant opportunity cost, productive efficiency, unemployed resources, unattainable output, and outward/pivotal shifts.",
  },
  tax: {
    id: "tax",
    title: "Specific Indirect Tax & Incidence",
    shortTitle: "Indirect Tax",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Indirect Taxes, Tax Incidence (PED vs PES), Deadweight Loss",
    description:
      "Model per-unit indirect taxation shifting supply upward (S₁ → S₂), tax revenue, consumer vs producer incidence, and welfare loss.",
  },
  subsidy: {
    id: "subsidy",
    title: "Government Per-Unit Subsidy",
    shortTitle: "Subsidy",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Subsidies, Consumer/Producer Benefit, Government Expenditure",
    description:
      "Model per-unit subsidies shifting supply downward (S₁ → S₂), lowering consumer price, raising producer revenue, and total fiscal cost.",
  },
  price_floor: {
    id: "price_floor",
    title: "Minimum Price (Price Floor)",
    shortTitle: "Minimum Price (Floor)",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Minimum Guaranteed Price, Excess Supply, Buffer Stocks",
    description:
      "Set a legally binding price floor above equilibrium to demonstrate excess supply (surplus) and government intervention purchase cost.",
  },
  price_ceiling: {
    id: "price_ceiling",
    title: "Maximum Price (Price Ceiling)",
    shortTitle: "Maximum Price (Ceiling)",
    category: "Microeconomics",
    level: "AS",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Maximum Price Controls, Excess Demand, Rationing & Black Markets",
    description:
      "Set a legally binding price ceiling below equilibrium to demonstrate excess demand (shortage) and deadweight welfare loss.",
  },
  externality: {
    id: "externality",
    title: "Externalities & Market Failure",
    shortTitle: "Externalities (4 Types)",
    category: "Microeconomics",
    level: "AS & A Level",
    xAxis: "Quantity (Q)",
    yAxis: "Costs & Benefits (P)",
    syllabusTopics: "Negative/Positive Production & Consumption Externalities, Merit & Demerit Goods",
    description:
      "Switch across all 4 Cambridge externality models (MSC > MPC, MSB > MPB, MSB < MPB, MSC < MPC) with exact welfare loss triangles.",
  },
  monopoly: {
    id: "monopoly",
    title: "Monopoly & Profit Maximisation",
    shortTitle: "Monopoly",
    category: "Microeconomics",
    level: "A Level",
    xAxis: "Output (Q)",
    yAxis: "Cost / Revenue (P)",
    syllabusTopics: "Monopoly Equilibrium (MC=MR), Supernormal Profit, Allocative Inefficiency, DWL",
    description:
      "Downward-sloping AR & MR (2× slope) with U-shaped AC and MC. Inspect profit-maximising output (MC=MR), supernormal profit, and DWL.",
  },
  perfect_competition: {
    id: "perfect_competition",
    title: "Perfect Competition (SR & LR)",
    shortTitle: "Perfect Competition",
    category: "Microeconomics",
    level: "A Level",
    xAxis: "Output (Q)",
    yAxis: "Cost / Revenue (P)",
    syllabusTopics: "Price Taker (P=AR=MR), Short-Run Profit/Loss, Long-Run Normal Profit",
    description:
      "Adjust horizontal market price (P = AR = MR = D) relative to U-shaped AC to show short-run supernormal profit, loss, or long-run normal profit.",
  },
  monopolistic_comp: {
    id: "monopolistic_comp",
    title: "Monopolistic Competition (SR & LR)",
    shortTitle: "Monopolistic Comp.",
    category: "Microeconomics",
    level: "A Level",
    xAxis: "Output (Q)",
    yAxis: "Cost / Revenue (P)",
    syllabusTopics: "Product Differentiation, SR Supernormal Profit, LR Tangency & Excess Capacity",
    description:
      "Relatively elastic AR/MR with U-shaped AC/MC. Shift demand inward as new firms enter to transition from SR profit to LR normal profit.",
  },
  kinked_demand: {
    id: "kinked_demand",
    title: "Oligopoly: Kinked Demand Curve",
    shortTitle: "Kinked Demand (Oligopoly)",
    category: "Microeconomics",
    level: "A Level",
    xAxis: "Output (Q)",
    yAxis: "Cost / Revenue (P)",
    syllabusTopics: "Oligopoly Interdependence, Discontinuous MR, Price Rigidity",
    description:
      "Elastic upper demand and inelastic lower demand with a vertical MR discontinuity. Shift MC within the gap to prove price rigidity.",
  },
  labour_market: {
    id: "labour_market",
    title: "Labour Market, Min Wage & Monopsony",
    shortTitle: "Labour Market & Monopsony",
    category: "Microeconomics",
    level: "A Level",
    xAxis: "Employment (L)",
    yAxis: "Wage Rate (W)",
    syllabusTopics: "MRP = D_L, S_L = AC_L, National Minimum Wage, Monopsony (MC_L > AC_L)",
    description:
      "Model competitive labour equilibrium, National Minimum Wage unemployment, or a Monopsony employer paying below competitive wages.",
  },

  // ── MACROECONOMICS ──────────────────────────────────────────────────────────
  macro_ad_as: {
    id: "macro_ad_as",
    title: "Macro AD / SRAS / LRAS",
    shortTitle: "Macro AD / AS & LRAS",
    category: "Macroeconomics",
    level: "AS & A Level",
    xAxis: "Real GDP (Y)",
    yAxis: "Price Level (PL)",
    syllabusTopics: "Demand-Pull & Cost-Push Inflation, Classical vs Keynesian LRAS, Output Gaps, Growth",
    description:
      "Toggle between Classical vertical LRAS and Keynesian 3-range LRAS. Shift AD, SRAS, or LRAS to model inflation, output gaps, and growth.",
  },
  phillips_curve: {
    id: "phillips_curve",
    title: "Phillips Curve (SRPC & LRPC)",
    shortTitle: "Phillips Curve",
    category: "Macroeconomics",
    level: "A Level",
    xAxis: "Unemployment Rate (%)",
    yAxis: "Inflation Rate (%)",
    syllabusTopics: "Inflation–Unemployment Trade-off, NAIRU, Expectations-Augmented SRPC",
    description:
      "Move along the Short-Run Phillips Curve (demand management) or shift SRPC outward/inward around the vertical Long-Run Phillips Curve (NAIRU).",
  },
  money_market: {
    id: "money_market",
    title: "Money Market & Liquidity Preference",
    shortTitle: "Money Market (r vs M)",
    category: "Macroeconomics",
    level: "A Level",
    xAxis: "Quantity of Money (M)",
    yAxis: "Interest Rate (r)",
    syllabusTopics: "Liquidity Preference (Lp), Vertical Money Supply (Ms), Monetary Policy",
    description:
      "Adjust vertical Money Supply (Ms₁ → Ms₂) or Liquidity Preference (Lp) to demonstrate equilibrium interest rate determination.",
  },
  lorenz_curve: {
    id: "lorenz_curve",
    title: "Lorenz Curve & Gini Coefficient",
    shortTitle: "Lorenz Curve & Gini",
    category: "Macroeconomics",
    level: "A Level",
    xAxis: "Cumulative % of Population",
    yAxis: "Cumulative % of Income",
    syllabusTopics: "Income Inequality, Line of Perfect Equality, Gini Coefficient = A / (A + B)",
    description:
      "Adjust income concentration to compute the exact Gini coefficient and compare pre-tax vs post-tax fiscal redistribution.",
  },

  // ── INTERNATIONAL TRADE ─────────────────────────────────────────────────────
  tariff: {
    id: "tariff",
    title: "Trade Protection (Tariff / Quota / Subsidy)",
    shortTitle: "Tariff, Quota & Trade Subsidy",
    category: "International Trade",
    level: "AS & A Level",
    xAxis: "Quantity (Q)",
    yAxis: "Price (P)",
    syllabusTopics: "Import Tariff, Import Quota, Domestic Production Subsidy, DWL Triangles",
    description:
      "Switch between Import Tariff (government revenue), Import Quota (quota rent), and Domestic Trade Subsidy with live import volumes and DWL.",
  },
  forex: {
    id: "forex",
    title: "Foreign Exchange Market",
    shortTitle: "Exchange Rate (Forex)",
    category: "International Trade",
    level: "AS & A Level",
    xAxis: "Quantity of Currency (£)",
    yAxis: "Exchange Rate ($ per £)",
    syllabusTopics: "Floating Exchange Rates, Appreciation, Depreciation, Managed Float",
    description:
      "Shift currency demand (exports/interest rates) or supply (imports/capital outflows) to demonstrate appreciation and depreciation.",
  },
  j_curve: {
    id: "j_curve",
    title: "The J-Curve Effect (Marshall-Lerner)",
    shortTitle: "J-Curve Effect",
    category: "International Trade",
    level: "A Level",
    xAxis: "Time",
    yAxis: "Current Account Balance",
    syllabusTopics: "Currency Depreciation, Short-Run Inelasticity, Marshall-Lerner Condition",
    description:
      "Show initial current account deterioration following depreciation (short-run inelasticity) followed by long-run surplus improvement.",
  },
};

export const PRESET_LIST: PresetMeta[] = Object.values(DIAGRAM_PRESET_META);

export const PRESET_CATEGORIES: { category: PresetMeta["category"]; items: PresetMeta[] }[] = [
  {
    category: "Microeconomics",
    items: PRESET_LIST.filter((p) => p.category === "Microeconomics"),
  },
  {
    category: "Macroeconomics",
    items: PRESET_LIST.filter((p) => p.category === "Macroeconomics"),
  },
  {
    category: "International Trade",
    items: PRESET_LIST.filter((p) => p.category === "International Trade"),
  },
];

const BASE_STATE: Omit<DiagramState, "preset"> = {
  demandIntercept: 90,
  demandSlope: 0.8,
  demandShift: 0,
  supplyIntercept: 10,
  supplySlope: 0.8,
  supplyShift: 0,
  taxAmount: 0,
  subsidyAmount: 0,
  priceControl: null,
  worldPrice: 28,
  tariffAmount: 0,
  tradeMode: "tariff",
  externalityCost: 0,
  externalityMode: "neg_prod",
  ppcMaxX: 80,
  ppcMaxY: 80,
  ppcCurvature: 2.0,
  ppcGrowthX: 0,
  ppcGrowthY: 0,
  ppcPointT: 0.5,
  ppcEfficiency: 1.0,
  firmFixedCost: 22,
  marketPrice: 58,
  mcShift: 0,
  labourMode: "competitive",
  lrasMode: "classical",
  lrasOutput: 52,
  lrasShift: 0,
  nairu: 5.0,
  srpcShift: 0,
  unemploymentRate: 4.0,
  moneySupply: 45,
  moneySupplyShift: 12,
  giniExponent: 2.6,
  giniCompareExponent: 0,
  jCurveDip: 22,
  jCurveRecovery: 28,
};

export const DEFAULT_DIAGRAM_STATES: Record<DiagramPreset, DiagramState> = {
  supply_demand: {
    ...BASE_STATE,
    preset: "supply_demand",
    demandShift: 12,
  },
  ppc: {
    ...BASE_STATE,
    preset: "ppc",
    ppcMaxX: 76,
    ppcMaxY: 76,
    ppcCurvature: 2.1,
    ppcGrowthX: 12,
    ppcGrowthY: 12,
    ppcPointT: 0.52,
    ppcEfficiency: 1.0,
  },
  tax: {
    ...BASE_STATE,
    preset: "tax",
    taxAmount: 18,
  },
  subsidy: {
    ...BASE_STATE,
    preset: "subsidy",
    subsidyAmount: 18,
  },
  price_floor: {
    ...BASE_STATE,
    preset: "price_floor",
    priceControl: 65,
  },
  price_ceiling: {
    ...BASE_STATE,
    preset: "price_ceiling",
    priceControl: 35,
  },
  externality: {
    ...BASE_STATE,
    preset: "externality",
    supplySlope: 0.7,
    externalityCost: 22,
    externalityMode: "neg_prod",
  },
  monopoly: {
    ...BASE_STATE,
    preset: "monopoly",
    demandIntercept: 92,
    demandSlope: 0.95,
    supplyIntercept: 14,
    supplySlope: 0.55,
    firmFixedCost: 26,
  },
  perfect_competition: {
    ...BASE_STATE,
    preset: "perfect_competition",
    marketPrice: 60,
    firmFixedCost: 34,
    mcShift: 0,
  },
  monopolistic_comp: {
    ...BASE_STATE,
    preset: "monopolistic_comp",
    demandIntercept: 84,
    demandSlope: 0.65,
    demandShift: 0,
    firmFixedCost: 34,
  },
  kinked_demand: {
    ...BASE_STATE,
    preset: "kinked_demand",
    mcShift: 0,
  },
  labour_market: {
    ...BASE_STATE,
    preset: "labour_market",
    demandIntercept: 88,
    demandSlope: 0.8,
    supplyIntercept: 12,
    supplySlope: 0.75,
    priceControl: 62,
    labourMode: "monopsony",
  },
  macro_ad_as: {
    ...BASE_STATE,
    preset: "macro_ad_as",
    demandIntercept: 92,
    demandSlope: 0.85,
    demandShift: 12,
    supplyIntercept: 12,
    supplySlope: 0.75,
    supplyShift: 0,
    lrasMode: "classical",
    lrasOutput: 50,
    lrasShift: 0,
  },
  phillips_curve: {
    ...BASE_STATE,
    preset: "phillips_curve",
    nairu: 5.0,
    srpcShift: 0,
    unemploymentRate: 3.5,
  },
  money_market: {
    ...BASE_STATE,
    preset: "money_market",
    demandIntercept: 86,
    demandSlope: 0.9,
    moneySupply: 42,
    moneySupplyShift: 16,
  },
  lorenz_curve: {
    ...BASE_STATE,
    preset: "lorenz_curve",
    giniExponent: 2.8,
    giniCompareExponent: 1.8,
  },
  tariff: {
    ...BASE_STATE,
    preset: "tariff",
    demandIntercept: 95,
    demandSlope: 0.75,
    supplyIntercept: 10,
    supplySlope: 0.9,
    worldPrice: 28,
    tariffAmount: 14,
    tradeMode: "tariff",
  },
  forex: {
    ...BASE_STATE,
    preset: "forex",
    demandIntercept: 88,
    demandSlope: 0.8,
    demandShift: 14,
    supplyIntercept: 12,
    supplySlope: 0.8,
    supplyShift: 0,
  },
  j_curve: {
    ...BASE_STATE,
    preset: "j_curve",
    jCurveDip: 22,
    jCurveRecovery: 28,
  },
};

// ── SHARED MATHEMATICAL CURVE HELPERS ─────────────────────────────────────────

/** U-shaped Average Cost curve for firm theory models (min AC at Q ≈ 46). */
export function evalFirmAC(q: number, fixedCost: number): number {
  const safeQ = Math.max(8, q);
  // Smooth U-shaped AC with minimum near Q = 45
  return fixedCost + 0.022 * Math.pow(safeQ - 46, 2);
}

/** Marginal Cost curve passing strictly through minimum of AC at Q = 46! */
export function evalFirmMC(q: number, fixedCost: number, mcShift = 0): number {
  // Exact derivative of TC = Q * AC(Q) shifted slightly for clean Cambridge visual clarity
  // At Q = 46: AC'(46) = 0 => MC(46) = AC(46) = fixedCost
  const dq = q - 46;
  return Math.max(4, fixedCost + mcShift + 0.022 * dq * dq + 0.044 * q * dq);
}

/** Solve MC(q) = targetY for q in [10, 90] via binary search. */
export function solveMcEquals(
  targetFn: (q: number) => number,
  fixedCost: number,
  mcShift = 0,
  qMin = 10,
  qMax = 88,
): number {
  let lo = qMin;
  let hi = qMax;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const mc = evalFirmMC(mid, fixedCost, mcShift);
    const target = targetFn(mid);
    if (mc < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Evaluate PPC Y given X for (X/maxX)^k + (Y/maxY)^k = 1. */
export function evalPpcY(x: number, maxX: number, maxY: number, k: number): number {
  const ratio = Math.max(0, Math.min(1, x / Math.max(1, maxX)));
  const yTerm = Math.max(0, 1 - Math.pow(ratio, k));
  return maxY * Math.pow(yTerm, 1 / k);
}

/** Evaluate Keynesian 3-range LRAS curve (flat -> curving -> vertical at yFe). */
export function evalKeynesianAS(q: number, yFe: number): number {
  if (q <= yFe * 0.45) return 22;
  if (q >= yFe - 0.5) return 94;
  const t = (q - yFe * 0.45) / (yFe - yFe * 0.45);
  return Math.min(94, 22 + 72 * Math.pow(t, 2.8));
}

/** Evaluate Short-Run Phillips Curve inflation rate (%) given unemployment rate (%). */
export function evalSrpc(u: number, nairu: number, shift: number): number {
  const safeU = Math.max(1.2, u);
  // Hyperbolic downward-sloping SRPC crossing 2% target inflation at u = nairu when shift = 0
  return Math.max(0.5, Math.min(14, 2 + shift + 14 * (1 / safeU - 1 / Math.max(1.5, nairu))));
}

/** Evaluate Lorenz Curve cumulative income % (0..100) for population % x (0..100). */
export function evalLorenz(xPct: number, exponent: number): number {
  const t = Math.max(0, Math.min(1, xPct / 100));
  return 100 * Math.pow(t, Math.max(1, exponent));
}

/** Evaluate J-Curve Current Account Balance (-40..+45) over Time t (0..100). */
export function evalJCurve(t: number, dip: number, recovery: number): number {
  // Starts at -10, dips further down around t=24, crosses 0 around t=55, rises to +recovery
  const x = t / 100;
  const start = -8;
  const shortRunDip = -dip * Math.sin(Math.min(1, x / 0.48) * Math.PI);
  const longRunGain = (recovery - start) * (1 / (1 + Math.exp(-9 * (x - 0.52))));
  return start + shortRunDip + longRunGain;
}

// ── CORE METRICS ENGINE ───────────────────────────────────────────────────────

export function calculateMetrics(state: DiagramState): DiagramMetrics {
  const {
    preset,
    demandIntercept,
    demandSlope,
    demandShift,
    supplyIntercept,
    supplySlope,
    supplyShift,
    taxAmount,
    subsidyAmount,
    priceControl,
    worldPrice,
    tariffAmount,
    externalityCost,
    externalityMode,
  } = state;

  // Base equilibrium (unshifted D0 & S0)
  const baseQ = Math.max(
    0,
    (demandIntercept - supplyIntercept) / Math.max(0.1, demandSlope + supplySlope),
  );
  const baseP = supplyIntercept + supplySlope * baseQ;

  // Effective shifted D1 & S1
  const effD = demandIntercept + demandShift;
  const effS = supplyIntercept + supplyShift;
  const shiftedQ = Math.max(0, (effD - effS) / Math.max(0.1, demandSlope + supplySlope));
  const shiftedP = effS + supplySlope * shiftedQ;

  let initialQ = preset === "supply_demand" || preset === "forex" || preset === "macro_ad_as" ? baseQ : shiftedQ;
  let initialP = preset === "supply_demand" || preset === "forex" || preset === "macro_ad_as" ? baseP : shiftedP;
  let eqQ = shiftedQ;
  let eqP = shiftedP;

  let consumerSurplus = Math.max(0, 0.5 * (effD - eqP) * eqQ);
  let producerSurplus = Math.max(0, 0.5 * (eqP - effS) * eqQ);
  let taxRevenue = 0;
  let subsidyCost = 0;
  let deadweightLoss = 0;
  let consumerTaxBurdenPct = 50;
  let producerTaxBurdenPct = 50;
  let shortageOrSurplus = 0;
  let importsWithoutTariff = 0;
  let importsWithTariff = 0;
  let tariffRevenue = 0;
  let firmProfit = 0;
  let firmAcAtQ = 0;
  let outputGap = 0;
  let inflationRate = 2;
  let interestRate = 5;
  let giniCoefficient = 0;
  let marshallLernerSum = 1.4;

  // Preset-specific calculations
  if (preset === "tax") {
    const taxedS = effS + taxAmount;
    eqQ = Math.max(0, (effD - taxedS) / (demandSlope + supplySlope));
    eqP = effD - demandSlope * eqQ;
    const producerP = eqP - taxAmount;
    consumerSurplus = Math.max(0, 0.5 * (effD - eqP) * eqQ);
    producerSurplus = Math.max(0, 0.5 * (producerP - effS) * eqQ);
    taxRevenue = taxAmount > 0 ? taxAmount * eqQ : 0;
    deadweightLoss = taxAmount > 0 ? 0.5 * taxAmount * Math.max(0, initialQ - eqQ) : 0;
    const priceRise = eqP - initialP;
    consumerTaxBurdenPct =
      taxAmount > 0 ? Math.min(100, Math.max(0, (priceRise / taxAmount) * 100)) : 50;
    producerTaxBurdenPct = 100 - consumerTaxBurdenPct;
  } else if (preset === "subsidy") {
    const subS = effS - subsidyAmount;
    eqQ = Math.max(0, Math.min(95, (effD - subS) / (demandSlope + supplySlope)));
    eqP = effD - demandSlope * eqQ; // Consumer price (lower)
    const producerP = eqP + subsidyAmount; // Producer price received (higher)
    consumerSurplus = Math.max(0, 0.5 * (effD - eqP) * eqQ);
    producerSurplus = Math.max(0, 0.5 * (producerP - effS) * eqQ);
    subsidyCost = subsidyAmount > 0 ? subsidyAmount * eqQ : 0;
    deadweightLoss = subsidyAmount > 0 ? 0.5 * subsidyAmount * Math.max(0, eqQ - initialQ) : 0;
    const priceDrop = initialP - eqP;
    consumerTaxBurdenPct =
      subsidyAmount > 0 ? Math.min(100, Math.max(0, (priceDrop / subsidyAmount) * 100)) : 50;
    producerTaxBurdenPct = 100 - consumerTaxBurdenPct;
  } else if (preset === "price_floor" || preset === "price_ceiling") {
    if (priceControl !== null) {
      const qd = Math.max(0, (effD - priceControl) / demandSlope);
      const qs = Math.max(0, (priceControl - effS) / supplySlope);
      shortageOrSurplus = qs - qd; // >0 surplus, <0 shortage
      const isBinding =
        (preset === "price_floor" && priceControl > initialP) ||
        (preset === "price_ceiling" && priceControl < initialP);
      if (isBinding) {
        eqQ = Math.min(qd, qs);
        eqP = priceControl;
        const wedge = Math.abs(effD - demandSlope * eqQ - (effS + supplySlope * eqQ));
        deadweightLoss = 0.5 * wedge * Math.max(0, initialQ - eqQ);
      }
    }
  } else if (preset === "externality") {
    // Market equilibrium is always MPC = MPB => (initialQ, initialP)
    let optQ = initialQ;
    let optP = initialP;
    if (externalityMode === "neg_prod") {
      // MSC = MPC + MEC
      optQ = Math.max(0, (effD - (effS + externalityCost)) / (demandSlope + supplySlope));
      optP = effD - demandSlope * optQ;
    } else if (externalityMode === "pos_cons") {
      // MSB = MPB + MEB
      optQ = Math.min(95, (effD + externalityCost - effS) / (demandSlope + supplySlope));
      optP = effS + supplySlope * optQ;
    } else if (externalityMode === "neg_cons") {
      // MSB = MPB - MEC
      optQ = Math.max(0, (effD - externalityCost - effS) / (demandSlope + supplySlope));
      optP = effS + supplySlope * optQ;
    } else {
      // pos_prod: MSC = MPC - MEB
      optQ = Math.min(95, (effD - (effS - externalityCost)) / (demandSlope + supplySlope));
      optP = effD - demandSlope * optQ;
    }
    eqQ = optQ;
    eqP = optP;
    deadweightLoss = 0.5 * externalityCost * Math.abs(initialQ - optQ);
  } else if (preset === "tariff") {
    const qdFree = Math.max(0, (effD - worldPrice) / demandSlope);
    const qsFree = Math.max(0, (worldPrice - effS) / supplySlope);
    importsWithoutTariff = Math.max(0, qdFree - qsFree);

    if (state.tradeMode === "domestic_subsidy") {
      const subS = effS - tariffAmount;
      const qsSub = Math.max(0, (worldPrice - subS) / supplySlope);
      importsWithTariff = Math.max(0, qdFree - qsSub);
      subsidyCost = tariffAmount * qsSub;
      deadweightLoss = 0.5 * tariffAmount * Math.max(0, qsSub - qsFree);
      eqP = worldPrice;
      eqQ = qdFree;
    } else {
      const tariffP = worldPrice + tariffAmount;
      const qdT = Math.max(0, (effD - tariffP) / demandSlope);
      const qsT = Math.max(0, (tariffP - effS) / supplySlope);
      importsWithTariff = Math.max(0, qdT - qsT);
      tariffRevenue = tariffAmount * importsWithTariff;
      const prodDwl = 0.5 * tariffAmount * Math.max(0, qsT - qsFree);
      const consDwl = 0.5 * tariffAmount * Math.max(0, qdFree - qdT);
      deadweightLoss = prodDwl + consDwl;
      eqP = tariffP;
      eqQ = qdT;
    }
  } else if (preset === "monopoly" || preset === "monopolistic_comp") {
    // AR: P = effD - demandSlope * Q; MR: P = effD - 2 * demandSlope * Q
    const qm = solveMcEquals(
      (q) => effD - 2 * demandSlope * q,
      state.firmFixedCost,
      state.mcShift,
      8,
      78,
    );
    const pm = Math.max(0, effD - demandSlope * qm);
    const ac = evalFirmAC(qm, state.firmFixedCost);
    const qAlloc = solveMcEquals(
      (q) => effD - demandSlope * q,
      state.firmFixedCost,
      state.mcShift,
      8,
      88,
    );
    const pAlloc = Math.max(0, effD - demandSlope * qAlloc);
    const mcAtQm = evalFirmMC(qm, state.firmFixedCost, state.mcShift);

    initialQ = qAlloc;
    initialP = pAlloc;
    eqQ = qm;
    eqP = pm;
    firmAcAtQ = ac;
    firmProfit = (pm - ac) * qm;
    consumerSurplus = Math.max(0, 0.5 * (effD - pm) * qm);
    deadweightLoss = Math.max(0, 0.5 * (pm - mcAtQm) * Math.max(0, qAlloc - qm));
  } else if (preset === "perfect_competition") {
    const p = state.marketPrice;
    const qEq = solveMcEquals(() => p, state.firmFixedCost, state.mcShift, 12, 86);
    const ac = evalFirmAC(qEq, state.firmFixedCost);
    initialQ = 46; // min AC output
    initialP = state.firmFixedCost; // LR equilibrium price
    eqQ = qEq;
    eqP = p;
    firmAcAtQ = ac;
    firmProfit = (p - ac) * qEq;
  } else if (preset === "kinked_demand") {
    // Kink fixed at Q* = 46, P* = 58
    // Upper AR: P = 81 - 0.5*Q (for Q <= 46), MR_upper = 81 - 1.0*Q -> at Q=46, MR = 35
    // Lower AR: P = 131.6 - 1.6*Q (for Q >= 46), MR_lower = 131.6 - 3.2*Q -> at Q=46, MR = -15.6 (clipped to 12)
    eqQ = 46;
    eqP = 58;
    initialQ = 46;
    initialP = 58;
    const mcAtKink = 24 + state.mcShift;
    firmAcAtQ = 44;
    firmProfit = (eqP - firmAcAtQ) * eqQ;
    // If MC shifts outside discontinuous gap [12, 35], price would adjust
    if (mcAtKink > 35) {
      eqQ = Math.max(20, 46 - (mcAtKink - 35) * 0.5);
      eqP = 81 - 0.5 * eqQ;
    } else if (mcAtKink < 12) {
      eqQ = Math.min(70, 46 + (12 - mcAtKink) * 0.3);
      eqP = 131.6 - 1.6 * eqQ;
    }
  } else if (preset === "labour_market") {
    if (state.labourMode === "monopsony") {
      // MC_L = effS + 2 * supplySlope * L; set MC_L = MRP (effD - demandSlope * L)
      const lm = Math.max(0, (effD - effS) / (demandSlope + 2 * supplySlope));
      const wm = effS + supplySlope * lm; // Wage read off S_L = AC_L
      const mrpAtLm = effD - demandSlope * lm;
      eqQ = lm;
      eqP = wm;
      deadweightLoss = 0.5 * (mrpAtLm - wm) * Math.max(0, initialQ - lm);
    } else if (state.labourMode === "min_wage" && priceControl !== null) {
      const ld = Math.max(0, (effD - priceControl) / demandSlope);
      const ls = Math.max(0, (priceControl - effS) / supplySlope);
      shortageOrSurplus = Math.max(0, ls - ld); // Unemployment
      eqQ = priceControl > initialP ? ld : initialQ;
      eqP = Math.max(priceControl, initialP);
    }
  } else if (preset === "macro_ad_as") {
    const yFe = state.lrasOutput + state.lrasShift;
    if (state.lrasMode === "keynesian") {
      // Solve AD(Y) = KeynesianAS(Y) via binary search
      let lo = 5;
      let hi = Math.min(95, yFe - 0.1);
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (evalKeynesianAS(mid, yFe) < effD - demandSlope * mid) lo = mid;
        else hi = mid;
      }
      eqQ = (lo + hi) / 2;
      eqP = evalKeynesianAS(eqQ, yFe);
    }
    outputGap = eqQ - yFe;
  } else if (preset === "phillips_curve") {
    inflationRate = evalSrpc(state.unemploymentRate, state.nairu, state.srpcShift);
    eqQ = state.unemploymentRate;
    eqP = inflationRate;
    initialQ = state.nairu;
    initialP = 2 + state.srpcShift;
  } else if (preset === "money_market") {
    const m0 = state.moneySupply;
    const m1 = Math.max(15, Math.min(88, state.moneySupply + state.moneySupplyShift));
    const r0 = Math.max(0.5, (effD - demandSlope * m0) / 10);
    const r1 = Math.max(0.5, (effD - demandSlope * m1) / 10);
    initialQ = m0;
    initialP = r0 * 10;
    eqQ = m1;
    eqP = r1 * 10;
    interestRate = r1;
  } else if (preset === "lorenz_curve") {
    // For L(x) = x^p, Gini = (p - 1) / (p + 1)
    const p = Math.max(1, state.giniExponent);
    giniCoefficient = (p - 1) / (p + 1);
    eqP = giniCoefficient;
    eqQ = p;
  } else if (preset === "ppc") {
    const curX = state.ppcMaxX + state.ppcGrowthX;
    const curY = state.ppcMaxY + state.ppcGrowthY;
    const xOnCurve = curX * state.ppcPointT;
    const yOnCurve = evalPpcY(xOnCurve, curX, curY, state.ppcCurvature);
    eqQ = xOnCurve * state.ppcEfficiency;
    eqP = yOnCurve * state.ppcEfficiency;
    initialQ = curX;
    initialP = curY;
  } else if (preset === "j_curve") {
    // Higher recovery relative to dip => stronger Marshall-Lerner sum (> 1)
    marshallLernerSum = 0.8 + (state.jCurveRecovery / 25) * 0.9;
    eqP = evalJCurve(95, state.jCurveDip, state.jCurveRecovery);
    initialP = evalJCurve(24, state.jCurveDip, state.jCurveRecovery);
  }

  // Build 4 tailored KPI cards for the current preset
  const kpiCards = buildKpiCards(state, {
    eqQ,
    eqP,
    initialQ,
    initialP,
    consumerSurplus,
    producerSurplus,
    taxRevenue,
    subsidyCost,
    deadweightLoss,
    consumerTaxBurdenPct,
    producerTaxBurdenPct,
    shortageOrSurplus,
    importsWithoutTariff,
    importsWithTariff,
    tariffRevenue,
    firmProfit,
    firmAcAtQ,
    outputGap,
    inflationRate,
    interestRate,
    giniCoefficient,
    marshallLernerSum,
  });

  return {
    eqQ,
    eqP,
    initialQ,
    initialP,
    consumerSurplus,
    producerSurplus,
    taxRevenue,
    subsidyCost,
    deadweightLoss,
    consumerTaxBurdenPct,
    producerTaxBurdenPct,
    shortageOrSurplus,
    importsWithoutTariff,
    importsWithTariff,
    tariffRevenue,
    firmProfit,
    firmAcAtQ,
    outputGap,
    inflationRate,
    interestRate,
    giniCoefficient,
    marshallLernerSum,
    kpiCards,
  };
}

function buildKpiCards(
  state: DiagramState,
  m: Omit<DiagramMetrics, "kpiCards">,
): DiagramMetrics["kpiCards"] {
  switch (state.preset) {
    case "ppc": {
      const status =
        state.ppcEfficiency < 0.97
          ? "Inefficient (Inside)"
          : state.ppcEfficiency > 1.03
            ? "Unattainable (Outside)"
            : "Productively Efficient";
      return [
        { label: "Consumer Goods (X)", value: m.eqQ.toFixed(1), subtext: `Max capacity: ${m.initialQ.toFixed(0)}` },
        { label: "Capital Goods (Y)", value: m.eqP.toFixed(1), subtext: `Max capacity: ${m.initialP.toFixed(0)}` },
        {
          label: "Operating Point A",
          value: status,
          subtext: state.ppcCurvature > 1.2 ? "Increasing opp. cost" : "Constant opp. cost",
          tone: state.ppcEfficiency < 0.97 ? "amber" : state.ppcEfficiency > 1.03 ? "rose" : "emerald",
        },
        {
          label: "Capacity Shift",
          value: state.ppcGrowthX !== 0 || state.ppcGrowthY !== 0 ? `+${state.ppcGrowthX}X / +${state.ppcGrowthY}Y` : "Static",
          subtext: "Outward = LR growth",
          tone: "purple",
        },
      ];
    }
    case "subsidy":
      return [
        { label: "Consumer Price", value: `P₂ = ${m.eqP.toFixed(1)}`, subtext: `Down from P₁ = ${m.initialP.toFixed(1)}`, tone: "emerald" },
        { label: "New Quantity", value: `Q₂ = ${m.eqQ.toFixed(1)}`, subtext: `Up from Q₁ = ${m.initialQ.toFixed(1)}` },
        { label: "Gov. Subsidy Cost", value: `£${m.subsidyCost.toFixed(0)}`, subtext: "Subsidy × Q₂", tone: "purple" },
        { label: "Deadweight Loss", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Overproduction triangle", tone: "rose" },
      ];
    case "price_floor":
      return [
        { label: "Price Floor (P_min)", value: `£${(state.priceControl ?? 50).toFixed(0)}`, subtext: `Free market P* = ${m.initialP.toFixed(1)}` },
        { label: "Excess Supply", value: m.shortageOrSurplus > 0 ? `+${m.shortageOrSurplus.toFixed(1)} u` : "Non-binding", subtext: "Surplus = Qs − Qd", tone: m.shortageOrSurplus > 0 ? "amber" : "default" },
        { label: "Gov. Purchase Cost", value: `£${Math.max(0, m.shortageOrSurplus * (state.priceControl ?? 0)).toFixed(0)}`, subtext: "Buffer stock outlay", tone: "purple" },
        { label: "Deadweight Loss", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Allocative loss", tone: "rose" },
      ];
    case "price_ceiling":
      return [
        { label: "Price Ceiling (P_max)", value: `£${(state.priceControl ?? 35).toFixed(0)}`, subtext: `Free market P* = ${m.initialP.toFixed(1)}` },
        { label: "Excess Demand", value: m.shortageOrSurplus < 0 ? `${Math.abs(m.shortageOrSurplus).toFixed(1)} u` : "Non-binding", subtext: "Shortage = Qd − Qs", tone: m.shortageOrSurplus < 0 ? "rose" : "default" },
        { label: "Quantity Traded", value: `Qs = ${m.eqQ.toFixed(1)}`, subtext: `Down from Q* = ${m.initialQ.toFixed(1)}` },
        { label: "Deadweight Loss", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Under-allocation loss", tone: "rose" },
      ];
    case "externality":
      return [
        { label: "Market Output (Qm)", value: `${m.initialQ.toFixed(1)}`, subtext: `Market Price Pm = ${m.initialP.toFixed(1)}` },
        { label: "Social Optimum (Q*)", value: `${m.eqQ.toFixed(1)}`, subtext: `Social Price P* = ${m.eqP.toFixed(1)}`, tone: "emerald" },
        {
          label: "Allocation Gap",
          value: m.initialQ > m.eqQ ? "Over-allocation" : m.initialQ < m.eqQ ? "Under-allocation" : "Efficient",
          subtext: `ΔQ = ${Math.abs(m.initialQ - m.eqQ).toFixed(1)} units`,
          tone: "amber",
        },
        { label: "Welfare Loss (DWL)", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Triangle points to Q*", tone: "rose" },
      ];
    case "monopoly":
    case "perfect_competition":
    case "monopolistic_comp":
    case "kinked_demand":
      return [
        { label: "Profit-Max Price", value: `P = ${m.eqP.toFixed(1)}`, subtext: "Where MC = MR" },
        { label: "Profit-Max Output", value: `Q = ${m.eqQ.toFixed(1)}`, subtext: `AC at Q = ${m.firmAcAtQ.toFixed(1)}` },
        {
          label: m.firmProfit > 30 ? "Supernormal Profit" : m.firmProfit < -30 ? "Economic Loss" : "Normal Profit",
          value: `${m.firmProfit >= 0 ? "+" : ""}£${m.firmProfit.toFixed(0)}`,
          subtext: "(P − AC) × Q",
          tone: m.firmProfit > 30 ? "emerald" : m.firmProfit < -30 ? "rose" : "amber",
        },
        {
          label: state.preset === "kinked_demand" ? "Price Rigidity" : "Deadweight Loss",
          value:
            state.preset === "kinked_demand"
              ? state.mcShift >= -12 && state.mcShift <= 11
                ? "Rigid (P* = 58)"
                : "Kink Broken"
              : `${m.deadweightLoss.toFixed(1)} u²`,
          subtext: state.preset === "kinked_demand" ? "MC inside MR gap" : "vs Allocative eff. (P=MC)",
          tone: state.preset === "kinked_demand" ? "purple" : "rose",
        },
      ];
    case "labour_market":
      return [
        { label: "Equilibrium Wage", value: `W = £${m.eqP.toFixed(1)}`, subtext: `Competitive W* = £${m.initialP.toFixed(1)}` },
        { label: "Employment Level", value: `L = ${m.eqQ.toFixed(1)}`, subtext: `Competitive L* = ${m.initialQ.toFixed(1)}` },
        {
          label: state.labourMode === "min_wage" ? "Unemployment" : state.labourMode === "monopsony" ? "Wage Markdown" : "Market Status",
          value:
            state.labourMode === "min_wage"
              ? `${m.shortageOrSurplus.toFixed(1)} workers`
              : state.labourMode === "monopsony"
                ? `-£${Math.max(0, m.initialP - m.eqP).toFixed(1)}`
                : "Clears (D_L = S_L)",
          subtext: state.labourMode === "monopsony" ? "Monopsony exploitation" : "Ls − Ld gap",
          tone: state.labourMode === "competitive" ? "emerald" : "rose",
        },
        { label: "Welfare Loss", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Labour misallocation", tone: "amber" },
      ];
    case "macro_ad_as":
      return [
        { label: "Price Level (PL)", value: `${m.eqP.toFixed(1)}`, subtext: `Initial PL₁ = ${m.initialP.toFixed(1)}` },
        { label: "Real GDP (Y)", value: `${m.eqQ.toFixed(1)}`, subtext: `Full-Emp Y_fe = ${(state.lrasOutput + state.lrasShift).toFixed(0)}` },
        {
          label: "Output Gap",
          value: `${m.outputGap >= 0 ? "+" : ""}${m.outputGap.toFixed(1)}`,
          subtext: m.outputGap > 2 ? "Inflationary Gap" : m.outputGap < -2 ? "Deflationary Gap" : "Full Employment",
          tone: Math.abs(m.outputGap) <= 2 ? "emerald" : m.outputGap > 2 ? "rose" : "amber",
        },
        { label: "LRAS Model", value: state.lrasMode === "classical" ? "Classical" : "Keynesian", subtext: state.lrasMode === "classical" ? "Vertical at Y_fe" : "3-range L-shaped", tone: "purple" },
      ];
    case "phillips_curve":
      return [
        { label: "Inflation Rate", value: `${m.inflationRate.toFixed(1)}%`, subtext: "Current SRPC point", tone: m.inflationRate > 4 ? "rose" : "emerald" },
        { label: "Unemployment Rate", value: `${state.unemploymentRate.toFixed(1)}%`, subtext: `NAIRU (LRPC) = ${state.nairu.toFixed(1)}%` },
        {
          label: "Expectations Shift",
          value: `${state.srpcShift >= 0 ? "+" : ""}${state.srpcShift.toFixed(1)}%`,
          subtext: state.srpcShift > 0 ? "Stagflation / Outward" : state.srpcShift < 0 ? "Supply-side gain" : "Anchored at 2%",
          tone: "purple",
        },
        {
          label: "Labour Slack",
          value: state.unemploymentRate < state.nairu ? "Overheating" : state.unemploymentRate > state.nairu ? "Spare Capacity" : "At NAIRU",
          subtext: "U vs Natural Rate",
          tone: "amber",
        },
      ];
    case "money_market":
      return [
        { label: "Equilibrium Interest", value: `${m.interestRate.toFixed(2)}%`, subtext: `Initial r₁ = ${(m.initialP / 10).toFixed(2)}%`, tone: "emerald" },
        { label: "Money Supply (Ms₂)", value: `${m.eqQ.toFixed(0)} bn`, subtext: `Initial Ms₁ = ${m.initialQ.toFixed(0)} bn` },
        {
          label: "Monetary Stance",
          value: state.moneySupplyShift > 0 ? "Expansionary (QE)" : state.moneySupplyShift < 0 ? "Contractionary" : "Neutral",
          subtext: "Ms vertical shift",
          tone: "purple",
        },
        { label: "Rate Change (Δr)", value: `${(m.interestRate - m.initialP / 10).toFixed(2)}%`, subtext: "Transmission to AD", tone: "amber" },
      ];
    case "lorenz_curve":
      return [
        { label: "Gini Coefficient", value: m.giniCoefficient.toFixed(3), subtext: "0 = equal, 1 = unequal", tone: m.giniCoefficient > 0.45 ? "rose" : "emerald" },
        { label: "Bottom 50% Share", value: `${evalLorenz(50, state.giniExponent).toFixed(1)}%`, subtext: "of total national income", tone: "amber" },
        { label: "Top 20% Share", value: `${(100 - evalLorenz(80, state.giniExponent)).toFixed(1)}%`, subtext: "of total national income", tone: "purple" },
        {
          label: "Post-Tax Gini",
          value: state.giniCompareExponent >= 1 ? ((state.giniCompareExponent - 1) / (state.giniCompareExponent + 1)).toFixed(3) : "Hidden",
          subtext: "Comparison curve",
        },
      ];
    case "tariff":
      return [
        { label: "Domestic Price", value: `£${m.eqP.toFixed(1)}`, subtext: `World Price Pw = £${state.worldPrice}` },
        { label: "Imports Volume", value: `${m.importsWithTariff.toFixed(1)} u`, subtext: `Free trade: ${m.importsWithoutTariff.toFixed(1)} u`, tone: "emerald" },
        {
          label: state.tradeMode === "quota" ? "Quota Rent" : state.tradeMode === "domestic_subsidy" ? "Subsidy Outlay" : "Tariff Revenue",
          value: `£${(state.tradeMode === "domestic_subsidy" ? m.subsidyCost : m.tariffRevenue).toFixed(0)}`,
          subtext: state.tradeMode === "quota" ? "Goes to licence holders" : "Fiscal impact",
          tone: "purple",
        },
        { label: "Total DWL", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Prod + Cons triangles", tone: "rose" },
      ];
    case "forex":
      return [
        { label: "Exchange Rate", value: `$${(m.eqP / 35).toFixed(2)} / £`, subtext: `Initial: $${(m.initialP / 35).toFixed(2)} / £` },
        {
          label: "Currency Movement",
          value: m.eqP > m.initialP + 0.5 ? "Appreciation" : m.eqP < m.initialP - 0.5 ? "Depreciation" : "Unchanged",
          subtext: `${(((m.eqP - m.initialP) / Math.max(1, m.initialP)) * 100).toFixed(1)}% change`,
          tone: m.eqP > m.initialP + 0.5 ? "emerald" : m.eqP < m.initialP - 0.5 ? "rose" : "default",
        },
        { label: "Currency Volume", value: `Q = ${m.eqQ.toFixed(1)}`, subtext: `Initial Q₁ = ${m.initialQ.toFixed(1)}` },
        { label: "Trade Effect", value: m.eqP > m.initialP ? "WPIDEC" : "SPICED", subtext: "Exports vs Imports price", tone: "purple" },
      ];
    case "j_curve":
      return [
        { label: "Short-Run Trough", value: `${m.initialP.toFixed(1)} bn`, subtext: "Inelastic PEDx + PEDm", tone: "rose" },
        { label: "Long-Run Balance", value: `${m.eqP >= 0 ? "+" : ""}${m.eqP.toFixed(1)} bn`, subtext: "Elastic long-run response", tone: m.eqP >= 0 ? "emerald" : "rose" },
        {
          label: "Marshall-Lerner",
          value: `|PEDx|+|PEDm| ≈ ${m.marshallLernerSum.toFixed(2)}`,
          subtext: m.marshallLernerSum > 1 ? "Satisfied (> 1)" : "Not satisfied (< 1)",
          tone: m.marshallLernerSum > 1 ? "emerald" : "amber",
        },
        { label: "Time Lag", value: "6–18 months", subtext: "Contract & switching lag", tone: "purple" },
      ];
    default:
      return [
        { label: "Equilibrium Price", value: `P* = ${m.eqP.toFixed(1)}`, subtext: `Initial P₁ = ${m.initialP.toFixed(1)}` },
        { label: "Equilibrium Quantity", value: `Q* = ${m.eqQ.toFixed(1)}`, subtext: `Initial Q₁ = ${m.initialQ.toFixed(1)}` },
        { label: "Consumer Surplus", value: `${m.consumerSurplus.toFixed(0)} u²`, subtext: "Below D, above P", tone: "emerald" },
        { label: "Deadweight Loss", value: `${m.deadweightLoss.toFixed(1)} u²`, subtext: "Welfare triangle", tone: "rose" },
      ];
  }
}

// ── SHADED POLYGONS ENGINE ────────────────────────────────────────────────────

export function getShadedPolygons(
  state: DiagramState,
  metrics: DiagramMetrics,
): ShadedPolygon[] {
  const { preset, taxAmount, subsidyAmount, worldPrice, tariffAmount, externalityCost, externalityMode } = state;
  const polygons: ShadedPolygon[] = [];

  const effD = state.demandIntercept + state.demandShift;
  const effS = state.supplyIntercept + state.supplyShift;

  if (preset === "tax" && taxAmount > 0) {
    const pc = metrics.eqP;
    const pp = pc - taxAmount;
    const q = metrics.eqQ;
    const q0 = metrics.initialQ;

    polygons.push(
      {
        id: "cs",
        label: "Consumer Surplus (CS)",
        points: [{ q: 0, p: pc }, { q: 0, p: effD }, { q, p: pc }],
        fillClass: "fill-emerald-500/20",
        strokeClass: "stroke-emerald-600/60",
        areaValue: metrics.consumerSurplus,
        description: "Remaining economic benefit enjoyed by consumers after paying the higher price.",
      },
      {
        id: "ps",
        label: "Producer Surplus (PS)",
        points: [{ q: 0, p: effS }, { q: 0, p: pp }, { q, p: pp }],
        fillClass: "fill-amber-500/20",
        strokeClass: "stroke-amber-600/60",
        areaValue: metrics.producerSurplus,
        description: "Remaining benefit earned by producers above their marginal production cost.",
      },
      {
        id: "tax_rev",
        label: "Tax Revenue (T × Q₂)",
        points: [{ q: 0, p: pp }, { q: 0, p: pc }, { q, p: pc }, { q, p: pp }],
        fillClass: "fill-purple-500/25",
        strokeClass: "stroke-purple-600/70",
        areaValue: metrics.taxRevenue,
        description: "Direct tax yield collected by government (box between consumer price and producer price).",
      },
      {
        id: "dwl",
        label: "Deadweight Welfare Loss (DWL)",
        points: [{ q, p: pc }, { q: q0, p: metrics.initialP }, { q, p: pp }],
        fillClass: "fill-rose-500/30",
        strokeClass: "stroke-rose-600/80",
        areaValue: metrics.deadweightLoss,
        description: "Net loss of social welfare resulting from output contraction below market equilibrium.",
      },
    );
  } else if (preset === "subsidy" && subsidyAmount > 0) {
    const pc = metrics.eqP;
    const pp = pc + subsidyAmount;
    const q = metrics.eqQ;
    const q0 = metrics.initialQ;

    polygons.push(
      {
        id: "sub_cost",
        label: "Total Government Subsidy Cost",
        points: [{ q: 0, p: pc }, { q: 0, p: pp }, { q, p: pp }, { q, p: pc }],
        fillClass: "fill-purple-500/22",
        strokeClass: "stroke-purple-600/70",
        areaValue: metrics.subsidyCost,
        description: "Total fiscal expenditure by the government (Per-unit subsidy × Q₂).",
      },
      {
        id: "sub_dwl",
        label: "Subsidy Deadweight Loss",
        points: [{ q: q0, p: metrics.initialP }, { q, p: pp }, { q, p: pc }],
        fillClass: "fill-rose-500/30",
        strokeClass: "stroke-rose-600/80",
        areaValue: metrics.deadweightLoss,
        description: "Welfare loss from overproduction where marginal cost exceeds marginal benefit beyond Q₁.",
      },
    );
  } else if (preset === "price_floor" && state.priceControl !== null && state.priceControl > metrics.initialP) {
    const pMin = state.priceControl;
    const qd = Math.max(0, (effD - pMin) / state.demandSlope);
    const qs = Math.max(0, (pMin - effS) / state.supplySlope);
    const sAtQd = effS + state.supplySlope * qd;

    polygons.push(
      {
        id: "gov_buffer",
        label: "Gov. Intervention Purchase Cost",
        points: [{ q: qd, p: 0 }, { q: qd, p: pMin }, { q: qs, p: pMin }, { q: qs, p: 0 }],
        fillClass: "fill-amber-500/20",
        strokeClass: "stroke-amber-600/70",
        areaValue: (qs - qd) * pMin,
        description: "Expenditure required if the government buys up the entire excess supply (Qs − Qd) at P_min.",
      },
      {
        id: "floor_dwl",
        label: "Deadweight Welfare Loss",
        points: [{ q: qd, p: pMin }, { q: metrics.initialQ, p: metrics.initialP }, { q: qd, p: sAtQd }],
        fillClass: "fill-rose-500/30",
        strokeClass: "stroke-rose-600/80",
        areaValue: metrics.deadweightLoss,
        description: "Lost consumer & producer surplus due to restricted quantity demanded at P_min.",
      },
    );
  } else if (preset === "price_ceiling" && state.priceControl !== null && state.priceControl < metrics.initialP) {
    const pMax = state.priceControl;
    const qs = Math.max(0, (pMax - effS) / state.supplySlope);
    const dAtQs = effD - state.demandSlope * qs;

    polygons.push({
      id: "ceil_dwl",
      label: "Deadweight Welfare Loss",
      points: [{ q: qs, p: dAtQs }, { q: metrics.initialQ, p: metrics.initialP }, { q: qs, p: pMax }],
      fillClass: "fill-rose-500/30",
      strokeClass: "stroke-rose-600/80",
      areaValue: metrics.deadweightLoss,
      description: "Welfare lost because quantity supplied contracts to Qs despite high consumer willingness to pay.",
    });
  } else if (preset === "tariff" && tariffAmount > 0) {
    const pw = worldPrice;
    const qs1 = Math.max(0, (pw - effS) / state.supplySlope);
    const qd1 = Math.max(0, (effD - pw) / state.demandSlope);

    if (state.tradeMode === "domestic_subsidy") {
      const qsSub = Math.max(0, (pw - (effS - tariffAmount)) / state.supplySlope);
      polygons.push(
        {
          id: "trade_sub_cost",
          label: "Domestic Subsidy Expenditure",
          points: [{ q: 0, p: pw }, { q: 0, p: pw + tariffAmount }, { q: qsSub, p: pw + tariffAmount }, { q: qsSub, p: pw }],
          fillClass: "fill-purple-500/22",
          strokeClass: "stroke-purple-600/70",
          areaValue: metrics.subsidyCost,
          description: "Taxpayer cost of subsidising domestic producers while keeping consumer price at Pw.",
        },
        {
          id: "trade_sub_dwl",
          label: "Production Inefficiency Loss",
          points: [{ q: qs1, p: pw }, { q: qsSub, p: pw + tariffAmount }, { q: qsSub, p: pw }],
          fillClass: "fill-rose-500/30",
          strokeClass: "stroke-rose-600/80",
          areaValue: metrics.deadweightLoss,
          description: "Production distortion only — consumers avoid consumption loss because price stays at Pw.",
        },
      );
    } else {
      const pt = worldPrice + tariffAmount;
      const qs2 = Math.max(0, (pt - effS) / state.supplySlope);
      const qd2 = Math.max(0, (effD - pt) / state.demandSlope);

      polygons.push(
        {
          id: "tariff_rev",
          label: state.tradeMode === "quota" ? "Quota Rent (Licence Holders)" : "Government Tariff Revenue",
          points: [{ q: qs2, p: pw }, { q: qs2, p: pt }, { q: qd2, p: pt }, { q: qd2, p: pw }],
          fillClass: state.tradeMode === "quota" ? "fill-amber-500/25" : "fill-purple-500/25",
          strokeClass: state.tradeMode === "quota" ? "stroke-amber-600/70" : "stroke-purple-600/70",
          areaValue: metrics.tariffRevenue,
          description:
            state.tradeMode === "quota"
              ? "Windfall rent captured by foreign exporters or import quota licence holders (no automatic tax revenue)."
              : "Revenue collected by government on remaining imports (Q2 to Q3) at the tariff rate.",
        },
        {
          id: "dwl_prod",
          label: "Production Inefficiency Loss",
          points: [{ q: qs1, p: pw }, { q: qs2, p: pt }, { q: qs2, p: pw }],
          fillClass: "fill-rose-500/30",
          strokeClass: "stroke-rose-600/80",
          areaValue: 0.5 * tariffAmount * Math.max(0, qs2 - qs1),
          description: "Welfare lost by replacing cheaper foreign imports with higher-cost domestic output.",
        },
        {
          id: "dwl_cons",
          label: "Consumption Distortion Loss",
          points: [{ q: qd2, p: pw }, { q: qd2, p: pt }, { q: qd1, p: pw }],
          fillClass: "fill-rose-500/30",
          strokeClass: "stroke-rose-600/80",
          areaValue: 0.5 * tariffAmount * Math.max(0, qd1 - qd2),
          description: "Welfare lost by domestic consumers priced out of the market by the higher protected price.",
        },
      );
    }
  } else if (preset === "externality" && externalityCost > 0) {
    const qm = metrics.initialQ;
    const pm = metrics.initialP;
    const qs = metrics.eqQ;
    const ps = metrics.eqP;

    let thirdPoint = { q: qm, p: pm };
    if (externalityMode === "neg_prod") {
      thirdPoint = { q: qm, p: effS + externalityCost + state.supplySlope * qm };
    } else if (externalityMode === "pos_cons") {
      thirdPoint = { q: qm, p: effD + externalityCost - state.demandSlope * qm };
    } else if (externalityMode === "neg_cons") {
      thirdPoint = { q: qm, p: effD - externalityCost - state.demandSlope * qm };
    } else {
      thirdPoint = { q: qm, p: effS - externalityCost + state.supplySlope * qm };
    }

    polygons.push({
      id: "dwl_externality",
      label: "Deadweight Welfare Loss Triangle",
      points: [{ q: qs, p: ps }, thirdPoint, { q: qm, p: pm }],
      fillClass: "fill-rose-500/35",
      strokeClass: "stroke-rose-600/90",
      areaValue: metrics.deadweightLoss,
      description:
        "Net social welfare loss from market failure. Note the triangle's apex always points to the social optimum Q*!",
    });
  } else if (
    preset === "monopoly" ||
    preset === "perfect_competition" ||
    preset === "monopolistic_comp"
  ) {
    const q = metrics.eqQ;
    const p = metrics.eqP;
    const ac = metrics.firmAcAtQ;
    const isProfit = p >= ac;

    if (Math.abs(p - ac) > 0.8) {
      polygons.push({
        id: "firm_profit",
        label: isProfit ? "Supernormal (Abnormal) Profit" : "Economic Loss",
        points: [
          { q: 0, p: Math.min(p, ac) },
          { q: 0, p: Math.max(p, ac) },
          { q, p: Math.max(p, ac) },
          { q, p: Math.min(p, ac) },
        ],
        fillClass: isProfit ? "fill-emerald-500/25" : "fill-rose-500/25",
        strokeClass: isProfit ? "stroke-emerald-600/75" : "stroke-rose-600/75",
        areaValue: Math.abs(metrics.firmProfit),
        description: isProfit
          ? "Abnormal profit earned where AR (Price) exceeds Average Cost (AC) at MC = MR."
          : "Short-run economic loss where Average Cost (AC) exceeds Price (AR) at MC = MR.",
      });
    }
    if (preset === "monopoly" && metrics.deadweightLoss > 5) {
      const mcAtQm = evalFirmMC(q, state.firmFixedCost, state.mcShift);
      polygons.push({
        id: "monopoly_dwl",
        label: "Monopoly Welfare Loss (DWL)",
        points: [{ q, p }, { q: metrics.initialQ, p: metrics.initialP }, { q, p: mcAtQm }],
        fillClass: "fill-rose-500/30",
        strokeClass: "stroke-rose-600/80",
        areaValue: metrics.deadweightLoss,
        description: "Allocative inefficiency caused by restricting output below competitive level (P > MC).",
      });
    }
  } else if (preset === "lorenz_curve") {
    const ptsA: { q: number; p: number }[] = [];
    for (let x = 0; x <= 100; x += 5) ptsA.push({ q: x, p: x });
    for (let x = 100; x >= 0; x -= 5) ptsA.push({ q: x, p: evalLorenz(x, state.giniExponent) });

    polygons.push({
      id: "gini_a",
      label: "Area A (Inequality Gap)",
      points: ptsA,
      fillClass: "fill-rose-500/25",
      strokeClass: "stroke-rose-600/70",
      areaValue: metrics.giniCoefficient * 5000,
      description: "Area between the 45° Line of Perfect Equality and the Lorenz Curve. Gini = A / (A + B).",
    });
  } else if (preset === "supply_demand") {
    polygons.push(
      {
        id: "cs",
        label: "Consumer Surplus (CS)",
        points: [{ q: 0, p: metrics.eqP }, { q: 0, p: effD }, { q: metrics.eqQ, p: metrics.eqP }],
        fillClass: "fill-emerald-500/20",
        strokeClass: "stroke-emerald-600/60",
        areaValue: metrics.consumerSurplus,
        description: "Difference between what consumers are willing to pay and equilibrium market price.",
      },
      {
        id: "ps",
        label: "Producer Surplus (PS)",
        points: [{ q: 0, p: effS }, { q: 0, p: metrics.eqP }, { q: metrics.eqQ, p: metrics.eqP }],
        fillClass: "fill-amber-500/20",
        strokeClass: "stroke-amber-600/60",
        areaValue: metrics.producerSurplus,
        description: "Difference between market price and minimum supply price producers accept.",
      },
    );
  }

  return polygons;
}

// ── ESSAY TAG BUILDER ─────────────────────────────────────────────────────────

export function buildDiagramTag(state: DiagramState, metrics: DiagramMetrics): string {
  const meta = DIAGRAM_PRESET_META[state.preset];
  const axes = `${meta.yAxis} / ${meta.xAxis}`;
  const kpiSummary = metrics.kpiCards
    .slice(0, 3)
    .map((k) => `${k.label}: ${k.value}`)
    .join(" | ");
  return `[DIAGRAM: ${meta.title} | axes: ${axes} | ${kpiSummary} | plotted with Marginal Cambridge 9708 Diagram CAD]`;
}

// ── CAMBRIDGE 9708 INTERACTIVE DRILLS ─────────────────────────────────────────

export const CAMBRIDGE_DIAGRAM_DRILLS: DiagramDrill[] = [
  {
    id: "drill-tax-inelastic",
    title: "1. Specific Indirect Tax on Inelastic Good",
    paperReference: "Cambridge 9708/22/M/J/23 Q2(a)",
    prompt:
      "A government introduces an indirect specific tax on cigarettes, where demand is price inelastic (PED < 1). Make the Demand Slope steep (≥ 1.0) and apply a specific tax of at least 15. Verify that consumers bear the majority of the tax incidence.",
    hint: "Increase Demand Slope above 1.0 and Tax Amount above 15.",
    preset: "tax",
    targetCheck: (state, metrics) => {
      if (state.taxAmount < 14) {
        return { passed: false, score: 1, feedback: "Increase the Tax slider to at least 15." };
      }
      if (state.demandSlope < 1.0) {
        return { passed: false, score: 2, feedback: "Make Demand Slope steeper (≥ 1.0) so PED is inelastic." };
      }
      if (metrics.consumerTaxBurdenPct >= 58) {
        return {
          passed: true,
          score: 3,
          feedback: `Exemplary Cambridge execution! Consumer incidence is ${metrics.consumerTaxBurdenPct.toFixed(0)}% vs Producer ${metrics.producerTaxBurdenPct.toFixed(0)}%.`,
        };
      }
      return { passed: false, score: 2, feedback: "Make demand steeper to show heavier consumer incidence." };
    },
  },
  {
    id: "drill-min-price",
    title: "2. Minimum Guaranteed Price (Price Floor)",
    paperReference: "Cambridge 9708/21/O/N/22 Q3(a)",
    prompt:
      "A government sets a Minimum Guaranteed Price (P_min) above market equilibrium to support grain farmers. Set P_min to at least 60 and verify the resulting excess supply (surplus).",
    hint: "Slide P_min above 60 to make the floor binding.",
    preset: "price_floor",
    targetCheck: (state, metrics) => {
      if ((state.priceControl ?? 0) < 58) {
        return { passed: false, score: 1, feedback: "P_min must be ABOVE equilibrium (~50) to be binding." };
      }
      if (metrics.shortageOrSurplus > 10) {
        return {
          passed: true,
          score: 3,
          feedback: `Full marks! P_min = £${state.priceControl} creates a surplus of ${metrics.shortageOrSurplus.toFixed(1)} units requiring buffer-stock purchase.`,
        };
      }
      return { passed: false, score: 2, feedback: "Raise P_min higher to clearly display the Qs − Qd surplus." };
    },
  },
  {
    id: "drill-tariff",
    title: "3. Import Tariff & Welfare Loss",
    paperReference: "Cambridge 9708/42/M/J/24 Q4",
    prompt:
      "A country imposes a specific tariff on imported steel. Set Tariff Mode to 'Import Tariff' and Tariff Amount ≥ 14 to observe import contraction, government revenue, and both DWL triangles.",
    hint: "Use Tariff mode and set Tariff Amount ≥ 14.",
    preset: "tariff",
    targetCheck: (state, metrics) => {
      if (state.tradeMode !== "tariff") {
        return { passed: false, score: 1, feedback: "Switch Trade Protection Mode to Import Tariff." };
      }
      if (state.tariffAmount < 14) {
        return { passed: false, score: 2, feedback: "Increase Tariff Amount to at least 14." };
      }
      return {
        passed: true,
        score: 3,
        feedback: `Accurately calibrated! Imports fell from ${metrics.importsWithoutTariff.toFixed(1)} to ${metrics.importsWithTariff.toFixed(1)}, yielding £${metrics.tariffRevenue.toFixed(0)} tariff revenue.`,
      };
    },
  },
  {
    id: "drill-negative-externality",
    title: "4. Negative Production Externality (MSC > MPC)",
    paperReference: "Cambridge 9708/22/F/M/23 Q2",
    prompt:
      "A chemical plant emits toxic waste during production (MSC = MPC + MEC). Select Negative Production Externality and set External Cost ≥ 20 to display the welfare loss triangle pointing toward Q*.",
    hint: "Select Negative Production (MSC > MPC) and set MEC ≥ 20.",
    preset: "externality",
    targetCheck: (state, metrics) => {
      if (state.externalityMode !== "neg_prod") {
        return { passed: false, score: 1, feedback: "Select 'Negative Production (MSC > MPC)' mode." };
      }
      if (state.externalityCost < 20) {
        return { passed: false, score: 2, feedback: "Increase External Cost (MEC) to at least 20." };
      }
      return {
        passed: true,
        score: 3,
        feedback: `Full Cambridge credit! Market overproduction (Qm = ${metrics.initialQ.toFixed(1)} > Q* = ${metrics.eqQ.toFixed(1)}) creates a DWL of ${metrics.deadweightLoss.toFixed(1)} u².`,
      };
    },
  },
  {
    id: "drill-monopoly-profit",
    title: "5. Monopoly Supernormal Profit & Allocative Inefficiency",
    paperReference: "Cambridge 9708/41/M/J/23 Q2",
    prompt:
      "Demonstrate a profit-maximising monopoly earning substantial supernormal profit (> £700) by setting MC = MR with low average cost (Fixed Cost ≤ 26) and strong market demand.",
    hint: "Lower Average Cost Floor (≤ 26) or shift Demand outward so AR lies well above AC at Qm.",
    preset: "monopoly",
    targetCheck: (_state, metrics) => {
      if (metrics.firmProfit < 700) {
        return {
          passed: false,
          score: 2,
          feedback: `Current supernormal profit is £${metrics.firmProfit.toFixed(0)}. Lower Fixed Cost or shift Demand right so profit exceeds £700.`,
        };
      }
      return {
        passed: true,
        score: 3,
        feedback: `A* Paper 4 diagram! Monopoly sets MC = MR at Qm = ${metrics.eqQ.toFixed(1)}, Pm = ${metrics.eqP.toFixed(1)}, earning £${metrics.firmProfit.toFixed(0)} supernormal profit with DWL = ${metrics.deadweightLoss.toFixed(1)} u².`,
      };
    },
  },
  {
    id: "drill-macro-inflationary-gap",
    title: "6. Demand-Pull Inflation & Inflationary Output Gap",
    paperReference: "Cambridge 9708/42/O/N/23 Q5",
    prompt:
      "Using Classical LRAS, simulate an expansionary fiscal shock that shifts AD sharply right (Demand Shift ≥ 16), pushing short-run Real GDP above full employment (Y_fe) to create an inflationary gap.",
    hint: "Choose Classical LRAS and push AD Shift to +16 or higher.",
    preset: "macro_ad_as",
    targetCheck: (state, metrics) => {
      if (state.lrasMode !== "classical") {
        return { passed: false, score: 1, feedback: "Select Classical LRAS to show an inflationary gap beyond Y_fe." };
      }
      if (metrics.outputGap <= 5) {
        return { passed: false, score: 2, feedback: "Shift AD further right (≥ +16) so Y* exceeds Y_fe clearly." };
      }
      return {
        passed: true,
        score: 3,
        feedback: `Full marks! AD shift pushed PL up to ${metrics.eqP.toFixed(1)} and created a positive inflationary gap of +${metrics.outputGap.toFixed(1)} above Y_fe.`,
      };
    },
  },
  {
    id: "drill-lorenz-redistribution",
    title: "7. Progressive Taxation on the Lorenz Curve",
    paperReference: "Cambridge 9708/41/O/N/22 Q4",
    prompt:
      "Model an unequal economy (Gini ≥ 0.45) and show the effect of progressive income taxation by setting a post-tax comparison Lorenz curve that shifts closer to the 45° Line of Perfect Equality.",
    hint: "Set Inequality Exponent ≥ 2.7 and Post-Tax Comparison Curve lower (e.g. 1.6).",
    preset: "lorenz_curve",
    targetCheck: (state, metrics) => {
      if (metrics.giniCoefficient < 0.45) {
        return { passed: false, score: 1, feedback: "Increase Inequality Exponent so initial Gini ≥ 0.45." };
      }
      if (state.giniCompareExponent < 1 || state.giniCompareExponent >= state.giniExponent - 0.4) {
        return {
          passed: false,
          score: 2,
          feedback: "Set the Post-Tax Comparison curve meaningfully lower than the initial curve to show redistribution.",
        };
      }
      const postGini = (state.giniCompareExponent - 1) / (state.giniCompareExponent + 1);
      return {
        passed: true,
        score: 3,
        feedback: `Exemplary! Progressive fiscal policy shifted the Lorenz curve inward, reducing the Gini coefficient from ${metrics.giniCoefficient.toFixed(3)} to ${postGini.toFixed(3)}.`,
      };
    },
  },
];
