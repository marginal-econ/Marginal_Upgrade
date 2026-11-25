export type DiagramCategory = "Microeconomics" | "Macroeconomics" | "International Trade";

export type DiagramPreset =
  // Microeconomics (AS & A Level)
  | "supply_demand"
  | "ppc"
  | "tax"
  | "subsidy"
  | "price_floor"
  | "price_ceiling"
  | "externality"
  | "monopoly"
  | "perfect_competition"
  | "monopolistic_comp"
  | "kinked_demand"
  | "labour_market"
  // Macroeconomics (AS & A Level)
  | "macro_ad_as"
  | "phillips_curve"
  | "money_market"
  | "lorenz_curve"
  // International Trade (AS & A Level)
  | "tariff"
  | "forex"
  | "j_curve";

export type ExternalityMode =
  | "neg_prod" // MSC > MPC (Pollution / Negative Production)
  | "pos_cons" // MSB > MPB (Merit Goods / Positive Consumption)
  | "neg_cons" // MSB < MPB (Demerit Goods / Negative Consumption)
  | "pos_prod"; // MSC < MPC (R&D / Positive Production)

export type TradeMode = "tariff" | "quota" | "domestic_subsidy";
export type LrasMode = "classical" | "keynesian";
export type LabourMode = "competitive" | "min_wage" | "monopsony";

export interface PresetMeta {
  id: DiagramPreset;
  title: string;
  shortTitle: string;
  category: DiagramCategory;
  level: "AS" | "A Level" | "AS & A Level";
  xAxis: string;
  yAxis: string;
  syllabusTopics: string;
  description: string;
}

export interface DiagramState {
  preset: DiagramPreset;
  // Core S&D / AD-AS / Forex / Labour linear parameters
  demandIntercept: number; // A_d (e.g. 90)
  demandSlope: number; // B_d (elasticity control, e.g. 0.8)
  demandShift: number; // delta D (e.g. 0)
  supplyIntercept: number; // A_s (e.g. 10)
  supplySlope: number; // B_s (elasticity control, e.g. 0.8)
  supplyShift: number; // delta S (e.g. 0)

  // Government intervention & trade
  taxAmount: number; // specific indirect tax
  subsidyAmount: number; // per-unit subsidy
  priceControl: number | null; // min or max price (or min wage)
  worldPrice: number; // for tariffs/quotas (e.g. 28)
  tariffAmount: number; // tariff or quota price wedge
  tradeMode: TradeMode;

  // Externalities
  externalityCost: number; // magnitude of MEC / MEB
  externalityMode: ExternalityMode;

  // PPC
  ppcMaxX: number; // Consumer Goods max (e.g. 80)
  ppcMaxY: number; // Capital Goods max (e.g. 80)
  ppcCurvature: number; // 1 = linear, >1 = concave (increasing opp cost), e.g. 2.0
  ppcGrowthX: number; // Outward/pivotal shift on X
  ppcGrowthY: number; // Outward/pivotal shift on Y
  ppcPointT: number; // Operating point angle 0.1..0.9
  ppcEfficiency: number; // 0.5..1.15 (1 = on frontier, <1 = unemployed resources, >1 = unattainable)

  // Market structures (Monopoly / Perfect Comp / Monopolistic / Kinked)
  firmFixedCost: number; // Shifts AC curve vertically (profit vs loss)
  marketPrice: number; // Horizontal P=AR=MR for Perfect Competition
  mcShift: number; // Shifts MC vertically (great for Kinked Demand rigidity)

  // Labour market
  labourMode: LabourMode;

  // Macro AD/AS
  lrasMode: LrasMode;
  lrasOutput: number; // Y_fe (e.g. 52)
  lrasShift: number; // Long-run economic growth shift

  // Phillips Curve
  nairu: number; // Natural rate of unemployment (e.g. 5%)
  srpcShift: number; // Inflation expectations / supply shock shift
  unemploymentRate: number; // Current operating point along SRPC

  // Money Market
  moneySupply: number; // Ms vertical line (e.g. 45)
  moneySupplyShift: number; // Delta Ms (QE / contraction)

  // Lorenz Curve
  giniExponent: number; // p >= 1 (1 = perfect equality, 2.5 = moderate, 5 = high inequality)
  giniCompareExponent: number; // Optional comparison curve after fiscal policy (0 = hidden)

  // J-Curve
  jCurveDip: number; // Short-run deterioration depth
  jCurveRecovery: number; // Long-run Marshall-Lerner improvement
}

export interface EquilibriumPoint {
  q: number;
  p: number;
  label: string;
}

export interface ShadedPolygon {
  id: string;
  label: string;
  points: { q: number; p: number }[];
  fillClass: string;
  strokeClass: string;
  areaValue: number;
  description: string;
}

export interface DiagramMetrics {
  eqQ: number;
  eqP: number;
  initialQ: number;
  initialP: number;
  consumerSurplus: number;
  producerSurplus: number;
  taxRevenue: number;
  subsidyCost: number;
  deadweightLoss: number;
  consumerTaxBurdenPct: number;
  producerTaxBurdenPct: number;
  shortageOrSurplus: number; // for price controls / min wage
  importsWithoutTariff: number;
  importsWithTariff: number;
  tariffRevenue: number;
  // Firm / Market Structure metrics
  firmProfit: number; // (P - AC) * Q
  firmAcAtQ: number;
  // Macro / Specialised metrics
  outputGap: number; // Y* - Y_fe
  inflationRate: number; // Phillips curve
  interestRate: number; // Money market
  giniCoefficient: number; // Lorenz curve (0 to 1)
  marshallLernerSum: number; // J-Curve elasticity indicator
  // Dynamic 4-card KPI summary for UI
  kpiCards: {
    label: string;
    value: string;
    subtext: string;
    tone?: "default" | "emerald" | "rose" | "purple" | "amber";
  }[];
}

export interface DiagramDrill {
  id: string;
  title: string;
  paperReference: string;
  prompt: string;
  hint: string;
  preset: DiagramPreset;
  targetCheck: (state: DiagramState, metrics: DiagramMetrics) => {
    passed: boolean;
    feedback: string;
    score: number; // out of 3
  };
}
