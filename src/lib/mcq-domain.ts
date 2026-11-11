/**
 * Canonical Cambridge 9708 Economics Topic, Subtopic, Skill & Domain Classifier.
 *
 * Designed to be:
 * 1. Instant (< 1ms per paper, zero network calls on submission).
 * 2. 100% deterministic and reliable — never produces "Untagged" or "unclassified".
 * 3. Grounded in the official Cambridge International AS & A Level Economics (9708)
 *    syllabus structure (AS Units 1–6 for Paper 1, A2 Units 7–11 for Paper 3).
 *
 * This is a plain (non-`.server.ts`) module so it can be imported directly from
 * client routes (`mcq-live.tsx`, `review.tsx`) as well as server functions.
 */

export type McqDomain = "micro" | "macro" | "unclassified";
export type McqSkill = "knowledge" | "application" | "analysis";

export const MCQ_DOMAIN_LABEL: Record<McqDomain, string> = {
  micro: "Microeconomics",
  macro: "Macroeconomics",
  unclassified: "Other",
};

export type SyllabusTopicRule = {
  id: string;
  topic: string;
  unit: string;
  level: "AS" | "A2" | "BOTH";
  domain: "micro" | "macro";
  /** Typical question-number range on a 30-question Cambridge 9708 paper */
  qRange: [number, number];
  /** High-weight exact phrases (score +4 each) */
  strongPhrases: string[];
  /** Standard syllabus keywords (score +2 each) */
  keywords: string[];
  /** Specific subtopic matchers */
  subtopics: { label: string; terms: string[] }[];
  /** Actionable examiner revision advice shown when a student lags in this topic */
  revisionTip: string;
};

export const CAMBRIDGE_9708_TOPICS: SyllabusTopicRule[] = [
  // ───────────────────────── AS LEVEL (PAPER 1: UNITS 1–6) ─────────────────────────
  {
    id: "as-basic-ideas",
    topic: "Basic Economic Ideas & Resource Allocation",
    unit: "AS Unit 1",
    level: "AS",
    domain: "micro",
    qRange: [1, 5],
    strongPhrases: [
      "production possibility",
      "opportunity cost",
      "factors of production",
      "normative statement",
      "positive statement",
      "division of labour",
      "division of labor",
      "planned economy",
      "market economy",
      "mixed economy",
      "transition economy",
      "ceteris paribus",
      "economic problem",
      "free good",
      "economic good",
      "medium of exchange",
      "store of value",
      "unit of account",
      "standard of deferred payment",
    ],
    keywords: [
      "scarcity",
      "scarce",
      "ppc",
      "ppf",
      "enterprise",
      "entrepreneur",
      "capital good",
      "consumer good",
      "specialisation",
      "specialization",
      "barter",
      "normative",
      "positive",
      "margin",
      "short run",
      "long run",
      "very long run",
      "resource allocation",
    ],
    subtopics: [
      {
        label: "Production Possibility Curves (PPC) & Opportunity Cost",
        terms: ["ppc", "ppf", "production possibility", "opportunity cost", "reallocation"],
      },
      {
        label: "Factors of Production & Specialisation",
        terms: ["factors of production", "land", "labour", "capital", "enterprise", "entrepreneur", "specialisation", "division of labour"],
      },
      {
        label: "Economic Systems (Market, Planned & Mixed)",
        terms: ["planned economy", "market economy", "mixed economy", "command economy", "transition"],
      },
      {
        label: "Positive vs Normative Statements & Methodology",
        terms: ["positive", "normative", "ceteris paribus", "value judgement", "value judgment"],
      },
      {
        label: "Functions & Characteristics of Money",
        terms: ["medium of exchange", "store of value", "unit of account", "deferred payment", "barter", "functions of money"],
      },
    ],
    revisionTip:
      "Check whether a PPC shift is a movement along the curve (reallocation / opportunity cost) vs an outward shift (growth in factor quantity/quality), and distinguish reward to capital (interest) from enterprise (profit).",
  },
  {
    id: "as-demand-supply",
    topic: "Demand, Supply & Market Equilibrium",
    unit: "AS Unit 2",
    level: "AS",
    domain: "micro",
    qRange: [5, 10],
    strongPhrases: [
      "consumer surplus",
      "producer surplus",
      "joint demand",
      "joint supply",
      "derived demand",
      "composite demand",
      "competitive demand",
      "excess demand",
      "excess supply",
      "market equilibrium",
      "equilibrium price",
      "equilibrium quantity",
      "shift in the demand",
      "shift in the supply",
      "price mechanism",
    ],
    keywords: [
      "demand curve",
      "supply curve",
      "complement",
      "substitute",
      "normal good",
      "inferior good",
      "equilibrium",
      "disequilibrium",
      "shortage",
      "surplus",
      "signalling",
      "rationing",
      "incentive",
    ],
    subtopics: [
      {
        label: "Consumer & Producer Surplus",
        terms: ["consumer surplus", "producer surplus", "area represents", "welfare"],
      },
      {
        label: "Shifts in Demand & Supply vs Movements Along",
        terms: ["demand curve", "supply curve", "equilibrium price", "equilibrium quantity", "excess demand", "excess supply"],
      },
      {
        label: "Interrelated Markets (Joint, Derived & Composite Demand/Supply)",
        terms: ["joint demand", "joint supply", "derived demand", "composite demand", "complement", "substitute"],
      },
      {
        label: "Functions of the Price Mechanism",
        terms: ["price mechanism", "rationing", "signalling", "incentive"],
      },
    ],
    revisionTip:
      "Always separate a change in the good's own price (movement along the curve) from a non-price determinant (shift of the curve), and remember consumer surplus is the area below the demand curve and above market price.",
  },
  {
    id: "as-elasticities",
    topic: "Elasticities (PED, PES, YED & XED)",
    unit: "AS Unit 2",
    level: "AS",
    domain: "micro",
    qRange: [7, 13],
    strongPhrases: [
      "price elasticity of demand",
      "price elasticity of supply",
      "income elasticity of demand",
      "cross elasticity of demand",
      "cross-price elasticity",
      "perfectly inelastic",
      "perfectly elastic",
      "unitary elastic",
      "unit elastic",
      "elasticity of demand",
      "elasticity of supply",
    ],
    keywords: [
      "elasticity",
      "elastic",
      "inelastic",
      "ped",
      "pes",
      "yed",
      "xed",
      "total revenue",
      "total expenditure",
      "percentage change in quantity",
    ],
    subtopics: [
      {
        label: "Price Elasticity of Demand (PED) & Total Revenue",
        terms: ["price elasticity of demand", "ped", "total revenue", "total expenditure"],
      },
      {
        label: "Income Elasticity of Demand (YED)",
        terms: ["income elasticity", "yed", "inferior", "normal good", "luxury"],
      },
      {
        label: "Cross Elasticity of Demand (XED)",
        terms: ["cross elasticity", "cross-price", "xed", "substitute", "complement"],
      },
      {
        label: "Price Elasticity of Supply (PES)",
        terms: ["price elasticity of supply", "pes", "spare capacity", "stocks"],
      },
    ],
    revisionTip:
      "Watch signs carefully: YED < 0 means an inferior good; XED > 0 means substitutes and XED < 0 means complements. When PED is inelastic (< 1), raising price increases total revenue.",
  },
  {
    id: "as-govt-micro",
    topic: "Government Microeconomic Intervention",
    unit: "AS Unit 3",
    level: "AS",
    domain: "micro",
    qRange: [11, 18],
    strongPhrases: [
      "maximum price",
      "minimum price",
      "price ceiling",
      "price floor",
      "indirect tax",
      "specific tax",
      "ad valorem",
      "incidence of",
      "tax incidence",
      "buffer stock",
      "public good",
      "merit good",
      "demerit good",
      "non-rival",
      "non-excludable",
      "free rider",
      "information failure",
      "asymmetric information",
      "gini coefficient",
      "lorenz curve",
      "transfer payment",
      "progressive tax",
      "regressive tax",
    ],
    keywords: [
      "subsidy",
      "subsidies",
      "privatisation",
      "privatization",
      "nationalisation",
      "nationalization",
      "deregulation",
      "inequality",
      "wealth",
      "redistribution",
      "means-tested",
      "universal benefit",
      "excise duty",
      "overconsumption",
      "underconsumption",
    ],
    subtopics: [
      {
        label: "Indirect Taxes & Subsidies (Incidence & Welfare)",
        terms: ["indirect tax", "specific tax", "ad valorem", "subsidy", "subsidies", "incidence"],
      },
      {
        label: "Maximum & Minimum Price Controls & Buffer Stocks",
        terms: ["maximum price", "minimum price", "price ceiling", "price floor", "buffer stock"],
      },
      {
        label: "Public Goods, Merit/Demerit Goods & Information Failure",
        terms: ["public good", "merit good", "demerit good", "non-rival", "non-excludable", "free rider", "information failure"],
      },
      {
        label: "Income & Wealth Inequality (Gini, Lorenz & Taxation)",
        terms: ["gini", "lorenz", "progressive", "regressive", "proportional", "inequality", "transfer payment", "wealth"],
      },
    ],
    revisionTip:
      "Remember: an effective maximum price MUST be set below equilibrium (causing a shortage), while an effective minimum price MUST be set above equilibrium (causing a surplus). Pure public goods are both non-rival and non-excludable.",
  },
  {
    id: "as-national-income",
    topic: "National Income, Circular Flow & AD/AS",
    unit: "AS Unit 4",
    level: "AS",
    domain: "macro",
    qRange: [18, 23],
    strongPhrases: [
      "circular flow",
      "national income",
      "aggregate demand",
      "aggregate supply",
      "gross domestic product",
      "gross national income",
      "net national income",
      "real gdp",
      "nominal gdp",
      "gdp deflator",
      "market prices",
      "basic prices",
      "factor cost",
    ],
    keywords: [
      "injection",
      "withdrawal",
      "leakage",
      "ad/as",
      "sras",
      "lras",
      "gdp",
      "gni",
      "gnp",
      "nni",
      "depreciation",
      "capital consumption",
      "price level",
      "real output",
    ],
    subtopics: [
      {
        label: "Circular Flow of Income (Injections & Withdrawals)",
        terms: ["circular flow", "injection", "withdrawal", "leakage", "saving", "investment"],
      },
      {
        label: "Aggregate Demand & Aggregate Supply (AD/AS) Equilibrium",
        terms: ["aggregate demand", "aggregate supply", "sras", "lras", "ad/as", "price level", "real output"],
      },
      {
        label: "National Income Statistics (GDP, GNI, Real vs Nominal)",
        terms: ["gross domestic", "gross national", "gdp", "gni", "gnp", "nni", "deflator", "factor cost", "market prices", "real"],
      },
    ],
    revisionTip:
      "Master the national income conversions: GDP -> GNI adds Net Property Income from Abroad; Gross -> Net subtracts capital consumption (depreciation); Market Prices -> Basic Prices/Factor Cost subtracts indirect taxes and adds subsidies.",
  },
  {
    id: "as-macro-indicators",
    topic: "Inflation, Unemployment & Economic Growth",
    unit: "AS Unit 4",
    level: "AS",
    domain: "macro",
    qRange: [21, 26],
    strongPhrases: [
      "consumer price index",
      "cost-push inflation",
      "demand-pull inflation",
      "rate of inflation",
      "structural unemployment",
      "frictional unemployment",
      "cyclical unemployment",
      "Seasonal unemployment",
      "claimant count",
      "labour force survey",
      "economic growth",
      "potential economic growth",
      "actual economic growth",
      "output gap",
    ],
    keywords: [
      "inflation",
      "deflation",
      "disinflation",
      "hyperinflation",
      "cpi",
      "price index",
      "weight",
      "base year",
      "unemployment",
      "unemployed",
      "labour force",
      "labor force",
      "participation rate",
      "recession",
    ],
    subtopics: [
      {
        label: "Inflation, Deflation & Disinflation (CPI & Causes)",
        terms: ["inflation", "deflation", "disinflation", "cpi", "consumer price index", "cost-push", "demand-pull", "price index"],
      },
      {
        label: "Types & Measurement of Unemployment",
        terms: ["unemployment", "unemployed", "frictional", "structural", "cyclical", "claimant", "labour force"],
      },
      {
        label: "Actual vs Potential Economic Growth & Output Gaps",
        terms: ["economic growth", "actual growth", "potential growth", "output gap", "recession"],
      },
    ],
    revisionTip:
      "Do not confuse disinflation (a fall in the positive rate of inflation, where prices are still rising more slowly) with deflation (a negative inflation rate where the general price level actually falls).",
  },
  {
    id: "as-macro-policy",
    topic: "Macroeconomic Policies (Fiscal, Monetary & Supply-Side)",
    unit: "AS Unit 5",
    level: "AS",
    domain: "macro",
    qRange: [24, 28],
    strongPhrases: [
      "fiscal policy",
      "monetary policy",
      "supply-side policy",
      "supply side policy",
      "budget deficit",
      "budget surplus",
      "national debt",
      "expansionary fiscal",
      "contractionary fiscal",
      "expansionary monetary",
      "contractionary monetary",
      "automatic stabiliser",
      "automatic stabilizer",
      "central bank",
    ],
    keywords: [
      "government spending",
      "government expenditure",
      "tax rate",
      "income tax",
      "corporation tax",
      "interest rate",
      "money supply",
      "quantitative easing",
      "reflationary",
      "deflationary policy",
    ],
    subtopics: [
      {
        label: "Fiscal Policy & The Government Budget",
        terms: ["fiscal policy", "budget deficit", "budget surplus", "national debt", "government spending", "automatic stabiliser"],
      },
      {
        label: "Monetary Policy (Interest Rates & Money Supply)",
        terms: ["monetary policy", "interest rate", "central bank", "quantitative easing", "money supply"],
      },
      {
        label: "Supply-Side Policies & Long-Run Productive Capacity",
        terms: ["supply-side", "supply side", "training", "deregulation", "productive capacity"],
      },
    ],
    revisionTip:
      "Distinguish demand-side policies (fiscal and monetary changes that shift AD) from supply-side policies (education, deregulation, R&D incentives that shift LRAS right and reduce inflationary pressure).",
  },
  {
    id: "as-international-trade",
    topic: "International Trade, Protectionism & Balance of Payments",
    unit: "AS Unit 6",
    level: "AS",
    domain: "macro",
    qRange: [26, 30],
    strongPhrases: [
      "comparative advantage",
      "absolute advantage",
      "terms of trade",
      "balance of payments",
      "current account",
      "exchange rate",
      "floating exchange rate",
      "fixed exchange rate",
      "depreciation",
      "appreciation",
      "devaluation",
      "revaluation",
      "primary income",
      "secondary income",
      "trade in goods",
      "trade in services",
      "export subsidy",
      "import quota",
      "marshall-lerner",
      "j-curve",
    ],
    keywords: [
      "tariff",
      "quota",
      "embargo",
      "protectionism",
      "protectionist",
      "free trade",
      "export",
      "import",
      "visible trade",
      "invisible trade",
      "current account deficit",
      "current account surplus",
      "foreign exchange",
      "currency",
    ],
    subtopics: [
      {
        label: "Absolute & Comparative Advantage & Terms of Trade",
        terms: ["comparative advantage", "absolute advantage", "terms of trade", "export price index", "import price index"],
      },
      {
        label: "Protectionism (Tariffs, Quotas & Export Subsidies)",
        terms: ["tariff", "quota", "embargo", "protectionism", "protectionist", "free trade", "export subsidy"],
      },
      {
        label: "Balance of Payments & Current Account Components",
        terms: ["balance of payments", "current account", "primary income", "secondary income", "trade in goods", "trade in services"],
      },
      {
        label: "Exchange Rate Determination & Depreciation/Appreciation",
        terms: ["exchange rate", "depreciation", "appreciation", "devaluation", "revaluation", "marshall-lerner", "j-curve", "currency"],
      },
    ],
    revisionTip:
      "Terms of Trade = (Index of Export Prices / Index of Import Prices) × 100. Also keep Current Account sections clear: dividends/interest/profits from abroad belong in Primary Income, while foreign aid/remittances belong in Secondary Income.",
  },

  // ───────────────────────── A2 LEVEL (PAPER 3: UNITS 7–11) ─────────────────────────
  {
    id: "a2-utility-efficiency",
    topic: "Utility Theory, Indifference Curves & Efficiency",
    unit: "A2 Unit 7",
    level: "A2",
    domain: "micro",
    qRange: [1, 5],
    strongPhrases: [
      "marginal utility",
      "total utility",
      "diminishing marginal utility",
      "equi-marginal principle",
      "equimarginal principle",
      "indifference curve",
      "budget line",
      "income effect",
      "substitution effect",
      "giffen good",
      "productive efficiency",
      "allocative efficiency",
      "pareto optimality",
      "pareto efficient",
      "dynamic efficiency",
      "x-inefficiency",
      "marginal rate of substitution",
    ],
    keywords: [
      "utility",
      "indifference",
      "pareto",
      "allocative",
      "giffen",
      "rational consumer",
      "behavioural",
      "behavioral",
    ],
    subtopics: [
      {
        label: "Marginal Utility & The Equi-Marginal Principle",
        terms: ["marginal utility", "total utility", "diminishing marginal utility", "equi-marginal", "equimarginal"],
      },
      {
        label: "Indifference Curves, Budget Lines & Income/Substitution Effects",
        terms: ["indifference curve", "budget line", "income effect", "substitution effect", "giffen", "marginal rate of substitution"],
      },
      {
        label: "Economic Efficiency (Productive, Allocative, Pareto & Dynamic)",
        terms: ["productive efficiency", "allocative efficiency", "pareto", "dynamic efficiency", "x-inefficiency"],
      },
    ],
    revisionTip:
      "For indifference curve questions: the substitution effect ALWAYS moves toward the relatively cheaper good; for an inferior good, the income effect moves in the opposite direction (and outweighs the substitution effect only for a Giffen good).",
  },
  {
    id: "a2-externalities-market-failure",
    topic: "Externalities, Market Failure & Cost-Benefit Analysis",
    unit: "A2 Unit 7",
    level: "A2",
    domain: "micro",
    qRange: [2, 7],
    strongPhrases: [
      "marginal social cost",
      "marginal private cost",
      "marginal social benefit",
      "marginal private benefit",
      "external cost",
      "external benefit",
      "negative externality",
      "positive externality",
      "deadweight loss",
      "deadweight welfare loss",
      "welfare loss",
      "cost-benefit analysis",
      "cost benefit analysis",
      "pollution permit",
      "tradable permit",
      "asymmetric information",
      "moral hazard",
      "adverse selection",
    ],
    keywords: [
      "externality",
      "externalities",
      "msb",
      "mpb",
      "msc",
      "mpc",
      "socially optimal",
      "social optimum",
      "shadow price",
      "nudge",
      "pigouvian",
    ],
    subtopics: [
      {
        label: "Positive & Negative Externalities (MSC/MPC & MSB/MPB Diagrams)",
        terms: ["marginal social", "marginal private", "externality", "externalities", "msb", "mpb", "msc", "mpc", "deadweight"],
      },
      {
        label: "Cost-Benefit Analysis (CBA) & Government Intervention",
        terms: ["cost-benefit", "cost benefit", "shadow price", "pollution permit", "tradable permit", "nudge"],
      },
      {
        label: "Asymmetric Information, Moral Hazard & Adverse Selection",
        terms: ["asymmetric information", "moral hazard", "adverse selection"],
      },
    ],
    revisionTip:
      "The socially optimal output is always where MSB = MSC, whereas the free-market equilibrium is where MPB = MPC. The deadweight loss triangle always points toward the socially optimal output.",
  },
  {
    id: "a2-costs-revenue-firms",
    topic: "Costs, Revenue, Profit & Growth of Firms",
    unit: "A2 Unit 7",
    level: "A2",
    domain: "micro",
    qRange: [5, 11],
    strongPhrases: [
      "marginal cost",
      "average cost",
      "average variable cost",
      "average fixed cost",
      "average total cost",
      "marginal revenue",
      "average revenue",
      "diminishing returns",
      "returns to scale",
      "economies of scale",
      "diseconomies of scale",
      "minimum efficient scale",
      "supernormal profit",
      "abnormal profit",
      "normal profit",
      "shut-down",
      "shut down",
      "profit maximisation",
      "profit maximization",
      "revenue maximisation",
      "sales maximisation",
      "principal-agent",
    ],
    keywords: [
      "fixed cost",
      "variable cost",
      "sunk cost",
      "satisficing",
      "horizontal integration",
      "vertical integration",
      "conglomerate",
      "merger",
      "takeover",
      "cartel",
      "divorce of ownership",
    ],
    subtopics: [
      {
        label: "Short-Run & Long-Run Costs, Economies of Scale & Returns",
        terms: ["marginal cost", "average cost", "average variable", "average fixed", "diminishing returns", "returns to scale", "economies of scale", "diseconomies of scale", "minimum efficient scale"],
      },
      {
        label: "Revenue Curves, Normal/Supernormal Profit & Shut-Down Point",
        terms: ["marginal revenue", "average revenue", "normal profit", "supernormal profit", "abnormal profit", "shut-down", "shut down"],
      },
      {
        label: "Objectives of Firms (Profit, Revenue, Sales Maximisation & Satisficing)",
        terms: ["profit maximis", "revenue maximis", "sales maximis", "satisficing", "principal-agent", "divorce of ownership"],
      },
      {
        label: "Growth of Firms & Integration (Horizontal, Vertical, Conglomerate)",
        terms: ["horizontal integration", "vertical integration", "conglomerate", "merger", "takeover"],
      },
    ],
    revisionTip:
      "Keep firm objectives crystal clear: Profit maximisation is where MC = MR; Revenue maximisation is where MR = 0; Sales (output) maximisation subject to normal profit is where AR = ATC.",
  },
  {
    id: "a2-market-structures",
    topic: "Market Structures, Contestability & Pricing",
    unit: "A2 Unit 7",
    level: "A2",
    domain: "micro",
    qRange: [9, 15],
    strongPhrases: [
      "perfect competition",
      "monopolistic competition",
      "natural monopoly",
      "kinked demand",
      "concentration ratio",
      "contestable market",
      "price discrimination",
      "first-degree price",
      "third-degree price",
      "prisoner's dilemma",
      "prisoners' dilemma",
      "game theory",
      "nash equilibrium",
      "limit pricing",
      "predatory pricing",
      "price leadership",
      "barriers to entry",
    ],
    keywords: [
      "monopoly",
      "oligopoly",
      "monopolistic",
      "collusion",
      "collusive",
      "price taker",
      "price maker",
      "hit and run",
      "hit-and-run",
      "excess capacity",
      "non-price competition",
    ],
    subtopics: [
      {
        label: "Perfect Competition & Monopolistic Competition",
        terms: ["perfect competition", "monopolistic competition", "price taker", "excess capacity"],
      },
      {
        label: "Oligopoly, Game Theory & Kinked Demand Curve",
        terms: ["oligopoly", "kinked demand", "game theory", "prisoner", "nash", "collusion", "concentration ratio", "price leadership"],
      },
      {
        label: "Monopoly, Price Discrimination & Contestable Markets",
        terms: ["monopoly", "natural monopoly", "price discrimination", "contestable", "barriers to entry", "limit pricing", "predatory pricing"],
      },
    ],
    revisionTip:
      "In long-run equilibrium, both perfect competition and monopolistic competition earn only normal profit (AR = AC), Set apart by whether AR is horizontal (P = MC = minimum AC in perfect competition) or downward-sloping (excess capacity in monopolistic competition).",
  },
  {
    id: "a2-labour-markets",
    topic: "Labour Markets, Wage Determination & Distribution",
    unit: "A2 Unit 8",
    level: "A2",
    domain: "micro",
    qRange: [14, 18],
    strongPhrases: [
      "marginal revenue product",
      "marginal physical product",
      "labour market",
      "labor market",
      "supply of labour",
      "demand for labour",
      "backward-bending",
      "backward bending",
      "economic rent",
      "transfer earnings",
      "trade union",
      "collective bargaining",
      "monopsony",
      "marginal cost of labour",
      "wage rate",
      "wage differential",
    ],
    keywords: [
      "mrp",
      "mrpl",
      "mpp",
      "wage",
      "wages",
      "monopsonist",
      "union",
      "minimum wage",
      "worker",
    ],
    subtopics: [
      {
        label: "Demand for Labour (MRP Theory) & Supply of Labour",
        terms: ["marginal revenue product", "marginal physical product", "mrp", "mrpl", "demand for labour", "supply of labour", "backward-bending"],
      },
      {
        label: "Imperfect Labour Markets (Monopsony, Trade Unions & Minimum Wage)",
        terms: ["monopsony", "monopsonist", "trade union", "collective bargaining", "marginal cost of labour", "minimum wage"],
      },
      {
        label: "Transfer Earnings & Economic Rent",
        terms: ["economic rent", "transfer earnings", "wage differential"],
      },
    ],
    revisionTip:
      "A profit-maximising firm hires labour up to the point where MRP_L = MCL. In a monopsony labour market, a trade union or statutory minimum wage set above the monopsony wage (up to the competitive wage) can increase BOTH wages and employment.",
  },
  {
    id: "a2-multiplier-accelerator",
    topic: "The Multiplier, Accelerator & Keynesian Macroeconomics",
    unit: "A2 Unit 9",
    level: "A2",
    domain: "macro",
    qRange: [18, 24],
    strongPhrases: [
      "marginal propensity to consume",
      "marginal propensity to save",
      "marginal propensity to import",
      "marginal propensity to tax",
      "marginal propensity to withdraw",
      "average propensity to consume",
      "average propensity to save",
      "accelerator",
      "deflationary gap",
      "inflationary gap",
      "paradox of thrift",
      "autonomous investment",
      "induced investment",
      "45-degree",
      "45°",
      "keynesian",
    ],
    keywords: [
      "multiplier",
      "mpc",
      "mps",
      "mpm",
      "mpt",
      "mpw",
      "apc",
      "aps",
      "consumption function",
      "Aggregate expenditure",
      "autonomous",
      "capital-output ratio",
    ],
    subtopics: [
      {
        label: "The Multiplier & Marginal Propensities (MPC, MPS, MPT, MPM)",
        terms: ["multiplier", "marginal propensity", "mpc", "mps", "mpm", "mpt", "mpw", "apc", "aps"],
      },
      {
        label: "Keynesian 45° Diagram, Inflationary & Deflationary Gaps",
        terms: ["deflationary gap", "inflationary gap", "45", "keynesian", "paradox of thrift", "consumption function", "aggregate expenditure"],
      },
      {
        label: "Autonomous vs Induced Investment & The Accelerator Theory",
        terms: ["accelerator", "autonomous investment", "induced investment", "capital-output ratio"],
      },
    ],
    revisionTip:
      "In an open economy with government, Multiplier k = 1 / (MPS + MPT + MPM) = 1 / (1 - MPC + MPT + MPM). To close a deflationary/inflationary gap of ΔY, the required initial injection change is ΔJ = ΔY / k.",
  },
  {
    id: "a2-money-phillips-policy",
    topic: "Money, Banking, Phillips Curve & Macroeconomic Policy",
    unit: "A2 Unit 9/10",
    level: "A2",
    domain: "macro",
    qRange: [22, 27],
    strongPhrases: [
      "phillips curve",
      "liquidity preference",
      "liquidity trap",
      "quantity theory of money",
      "credit multiplier",
      "credit creation",
      "commercial bank",
      "speculative motive",
      "transactions motive",
      "precautionary motive",
      "loanable funds",
      "natural rate of unemployment",
      "laffer curve",
      "policy conflict",
      "velocity of circulation",
    ],
    keywords: [
      "nairu",
      "srpc",
      "lrpc",
      "mv=pt",
      "mv = pt",
      "fisher equation",
      "reserve ratio",
      "liquidity ratio",
      "bond price",
      "yield",
      "monetarist",
      "tinbergen",
    ],
    subtopics: [
      {
        label: "Money Supply, Commercial Bank Credit Creation & Quantity Theory (MV = PT)",
        terms: ["credit creation", "credit multiplier", "commercial bank", "quantity theory", "velocity", "reserve ratio", "liquidity ratio"],
      },
      {
        label: "Liquidity Preference Theory, Bond Prices & Interest Rates",
        terms: ["liquidity preference", "liquidity trap", "speculative", "transactions motive", "precautionary", "bond price", "loanable funds"],
      },
      {
        label: "Short-Run & Long-Run Phillips Curve (SRPC/LRPC) & Laffer Curve",
        terms: ["phillips curve", "srpc", "lrpc", "nairu", "natural rate", "laffer", "policy conflict"],
      },
    ],
    revisionTip:
      "Remember the inverse relationship between market price of fixed-interest government bonds and the market rate of interest, and in a liquidity trap, speculative demand for money is horizontal (perfectly interest-elastic) so monetary expansion fails to lower interest rates.",
  },
  {
    id: "a2-development-globalisation",
    topic: "Economic Development, Globalisation & Trade Blocs",
    unit: "A2 Unit 11",
    level: "A2",
    domain: "macro",
    qRange: [26, 30],
    strongPhrases: [
      "human development index",
      "multidimensional poverty",
      "measurable economic welfare",
      "kuznets curve",
      "poverty trap",
      "poverty cycle",
      "customs union",
      "common market",
      "free trade area",
      "economic union",
      "trade creation",
      "trade diversion",
      "multinational",
      "foreign direct investment",
      "prebisch-singer",
      "developing economy",
      "developing country",
      "developed country",
    ],
    keywords: [
      "hdi",
      "mew",
      "mpi",
      "kuznets",
      "globalisation",
      "globalization",
      "trade bloc",
      "fdi",
      "mnc",
      "foreign aid",
      "external debt",
      "world bank",
      "imf",
      "shadow economy",
      "informal economy",
      "demographic",
      "dependency ratio",
    ],
    subtopics: [
      {
        label: "Indicators of Development (HDI, MEW, MPI & Kuznets Curve)",
        terms: ["human development", "hdi", "mew", "mpi", "kuznets", "measurable economic welfare", "multidimensional poverty"],
      },
      {
        label: "Developing Economies, Poverty Cycles, Aid, FDI & MNCs",
        terms: ["poverty trap", "poverty cycle", "foreign direct investment", "fdi", "multinational", "mnc", "foreign aid", "external debt", "prebisch-singer", "developing"],
      },
      {
        label: "Globalisation, Trade Blocs & Trade Creation/Diversion",
        terms: ["customs union", "common market", "free trade area", "economic union", "trade creation", "trade diversion", "trade bloc", "globalisation", "globalization"],
      },
    ],
    revisionTip:
      "HDI combines three equally weighted dimensions: Health (life expectancy at birth), Education (mean and expected years of schooling), and Living Standards (GNI per capita at PPP). Distinguish Trade Creation (shift from high-cost domestic to low-cost partner producer) from Trade Diversion.",
  },
];

const TOPIC_BY_NAME = new Map<string, SyllabusTopicRule>(
  CAMBRIDGE_9708_TOPICS.map((r) => [r.topic.toLowerCase(), r]),
);

export type McqQuestionClassification = {
  topic: string;
  subtopic: string;
  unit: string;
  domain: "micro" | "macro";
  skill: McqSkill;
  revisionTip: string;
};

/**
 * Infers assessment skill (AO1 Knowledge, AO2 Application, AO3 Analysis)
 * from the question stem/options text and question number.
 */
export function inferQuestionSkill(text: string, questionNumber = 1): McqSkill {
  const lower = text.toLowerCase();
  // AO2 Application: numerical tables, calculations, % changes, diagrams with values
  if (
    /\bcalculate\b|\bwhat is the value\b|\bhow much\b|\btable shows\b|\bindex\b|\b\$|\b%|million|billion/.test(
      lower,
    ) ||
    /\b\d+\s*%/.test(lower)
  ) {
    return "application";
  }
  // AO3 Analysis: multi-step cause-and-effect, shifts, policy outcomes, diagrams
  if (
    /\bwhat will be the effect\b|\bmost likely to cause\b|\bmost likely result\b|\bconsequence\b|\blead to\b|\bshift\b|\bdiagram shows\b|\bcombination\b|\blong run\b|\bequilibrium\b/.test(
      lower,
    )
  ) {
    return "analysis";
  }
  // Default by question position if text is minimal
  if (questionNumber >= 1 && questionNumber <= 5) return "knowledge";
  if (questionNumber >= 18 && questionNumber <= 21) return "knowledge";
  return "analysis";
}

/**
 * Fallback topic assignment based strictly on Cambridge 9708 Paper 1 (AS) / Paper 3 (A2)
 * syllabus question ordering (Q1–Q18 Microeconomics, Q19–Q30 Macroeconomics).
 * Used when stem text is empty or purely graphical.
 */
function fallbackRuleByQuestionNumber(
  level: "AS" | "A2",
  questionNumber: number,
): SyllabusTopicRule {
  const q = Math.max(1, Math.min(30, questionNumber || 1));
  if (level === "A2") {
    if (q <= 3) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-utility-efficiency")!;
    if (q <= 6) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-externalities-market-failure")!;
    if (q <= 10) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-costs-revenue-firms")!;
    if (q <= 14) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-market-structures")!;
    if (q <= 17) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-labour-markets")!;
    if (q <= 22) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-multiplier-accelerator")!;
    if (q <= 26) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-money-phillips-policy")!;
    return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "a2-development-globalisation")!;
  }
  // AS Level (Paper 1)
  if (q <= 4) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-basic-ideas")!;
  if (q <= 8) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-demand-supply")!;
  if (q <= 12) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-elasticities")!;
  if (q <= 17) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-govt-micro")!;
  if (q <= 21) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-national-income")!;
  if (q <= 24) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-macro-indicators")!;
  if (q <= 27) return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-macro-policy")!;
  return CAMBRIDGE_9708_TOPICS.find((t) => t.id === "as-international-trade")!;
}

/**
 * Picks the most specific subtopic within a matched `SyllabusTopicRule`.
 */
function pickSubtopic(rule: SyllabusTopicRule, haystack: string): string {
  let bestLabel = rule.subtopics[0]?.label ?? rule.topic;
  let bestCount = 0;
  for (const sub of rule.subtopics) {
    let count = 0;
    for (const term of sub.terms) {
      if (haystack.includes(term)) count += 1;
    }
    if (count > bestCount) {
      bestCount = count;
      bestLabel = sub.label;
    }
  }
  return bestLabel;
}

/**
 * Instantly classifies any Cambridge 9708 MCQ question into its canonical
 * Syllabus Topic, Subtopic, Syllabus Unit, Domain (micro/macro), Skill (AO1/AO2/AO3),
 * and Examiner Revision Tip.
 *
 * Guaranteed to NEVER return "Untagged" or "unclassified".
 */
export function classifyMcqQuestion(params: {
  level?: "AS" | "A2" | string;
  number?: number;
  text?: string | null;
  existingTopic?: string | null;
  existingSubtopic?: string | null;
  existingSkill?: string | null;
}): McqQuestionClassification {
  const level: "AS" | "A2" =
    typeof params.level === "string" && params.level.toUpperCase() === "A2" ? "A2" : "AS";
  const qNum = params.number && params.number > 0 ? params.number : 1;

  const cleanExistingTopic =
    params.existingTopic &&
    params.existingTopic.trim().toLowerCase() !== "untagged" &&
    params.existingTopic.trim().toLowerCase() !== "other" &&
    params.existingTopic.trim().toLowerCase() !== "unclassified"
      ? params.existingTopic.trim()
      : "";

  // Combine stem text + any existing freeform topic/subtopic so both new PDF stems
  // and legacy AI-tagged attempts are matched accurately.
  const combinedRaw = [params.text ?? "", cleanExistingTopic, params.existingSubtopic ?? ""]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const haystack = ` ${combinedRaw} `;

  // Check if `cleanExistingTopic` is already an exact canonical topic name
  if (cleanExistingTopic && TOPIC_BY_NAME.has(cleanExistingTopic.toLowerCase()) && !(params.text ?? "").trim()) {
    const exactRule = TOPIC_BY_NAME.get(cleanExistingTopic.toLowerCase())!;
    return {
      topic: exactRule.topic,
      subtopic: params.existingSubtopic?.trim() || pickSubtopic(exactRule, haystack),
      unit: exactRule.unit,
      domain: exactRule.domain,
      skill:
        params.existingSkill === "knowledge" ||
        params.existingSkill === "application" ||
        params.existingSkill === "analysis"
          ? params.existingSkill
          : inferQuestionSkill(combinedRaw, qNum),
      revisionTip: exactRule.revisionTip,
    };
  }

  let bestRule: SyllabusTopicRule | null = null;
  let bestScore = 0;

  for (const rule of CAMBRIDGE_9708_TOPICS) {
    let score = 0;
    for (const phrase of rule.strongPhrases) {
      if (haystack.includes(phrase)) score += 4;
    }
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) score += 2;
    }
    if (score > 0) {
      // Bonus if rule matches the paper's level (AS vs A2)
      if (rule.level === level) score += 1.5;
      // Bonus if question number falls in or near the typical syllabus range on a 30-Q paper
      if (qNum >= rule.qRange[0] - 2 && qNum <= rule.qRange[1] + 2) {
        score += 1;
      }
      // Bonus if micro/macro matches the paper's half (Q1-17 micro, Q19-30 macro)
      if (qNum <= 16 && rule.domain === "micro") score += 0.5;
      if (qNum >= 19 && rule.domain === "macro") score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestRule = rule;
      }
    }
  }

  const resolvedRule = bestRule ?? fallbackRuleByQuestionNumber(level, qNum);
  const subtopic = pickSubtopic(resolvedRule, haystack);
  const validSkill: McqSkill =
    params.existingSkill === "knowledge" ||
    params.existingSkill === "application" ||
    params.existingSkill === "analysis"
      ? params.existingSkill
      : inferQuestionSkill(combinedRaw, qNum);

  return {
    topic: resolvedRule.topic,
    subtopic,
    unit: resolvedRule.unit,
    domain: resolvedRule.domain,
    skill: validSkill,
    revisionTip: resolvedRule.revisionTip,
  };
}

/**
 * Normalizes any raw topic string (including legacy freeform AI labels or "Untagged")
 * into its canonical Cambridge 9708 Syllabus Topic metadata.
 */
export function normalizeMcqTopic(
  rawTopic: string | null | undefined,
  level: "AS" | "A2" | string = "AS",
  questionNumber = 1,
  stemText?: string | null,
): McqQuestionClassification {
  return classifyMcqQuestion({
    level,
    number: questionNumber,
    text: stemText,
    existingTopic: rawTopic,
  });
}

/**
 * Looks up metadata (unit, domain, revisionTip) for a canonical or raw topic string.
 */
export function getSyllabusTopicMeta(topic: string, level: "AS" | "A2" = "AS") {
  const exact = TOPIC_BY_NAME.get(topic.trim().toLowerCase());
  if (exact) {
    return {
      topic: exact.topic,
      unit: exact.unit,
      domain: exact.domain,
      revisionTip: exact.revisionTip,
    };
  }
  const classified = normalizeMcqTopic(topic, level, 1);
  return {
    topic: classified.topic,
    unit: classified.unit,
    domain: classified.domain,
    revisionTip: classified.revisionTip,
  };
}

/** Cambridge 9708 micro topics — the price system, firms, market failure, labour. */
const MICRO_KEYWORDS = [
  "demand",
  "supply",
  "elastic",
  "price control",
  "price ceiling",
  "price floor",
  "maximum price",
  "minimum price",
  "subsidy",
  "subsidies",
  "indirect tax",
  "externalit",
  "market failure",
  "public good",
  "merit good",
  "demerit good",
  "consumer surplus",
  "producer surplus",
  "utility",
  "indifference",
  "budget line",
  "behavioural econom",
  "behavioral econom",
  "cost curve",
  "cost of production",
  "costs, revenue",
  "revenue",
  "monopoly",
  "oligopoly",
  "perfect competition",
  "monopolistic competition",
  "contestab",
  "market structure",
  "labour market",
  "labor market",
  "wage",
  "trade union",
  "monopsony",
  "privatisation",
  "privatization",
  "nationalisation",
  "nationalization",
  "regulation",
  "cost-benefit",
  "resource allocation",
  "basic economic ideas",
  "scarcity",
  "production possibility",
  " ppc",
  "factors of production",
  "specialisation",
  "specialization",
  "opportunity cost",
  "firm",
  "profit",
  "price discrimination",
  "minimum wage",
  "efficiency",
  "pareto",
  "economies of scale",
  "microeconomic",
];

/** Cambridge 9708 macro topics — the macroeconomy, policy, growth, and international issues. */
const MACRO_KEYWORDS = [
  "aggregate demand",
  "aggregate supply",
  "ad/as",
  "national income",
  " gdp",
  "gross domestic",
  " gnp",
  "gni",
  "gross national",
  "inflation",
  "deflation",
  "unemployment",
  "balance of payments",
  "current account",
  "exchange rate",
  "fiscal",
  "monetary",
  "supply-side",
  "macroeconomic",
  "economic growth",
  "development",
  "gini",
  "human development",
  " hdi",
  "kuznets",
  "lorenz",
  "phillips curve",
  "quantity theory",
  "money",
  "banking",
  "comparative advantage",
  "absolute advantage",
  "protectionism",
  "international trade",
  "tariff",
  "terms of trade",
  "trade bloc",
  "customs union",
  "free trade",
  "circular flow",
  "multiplier",
  "accelerator",
  "keynesian",
  "government spending",
  "budget deficit",
  "national debt",
  "interest rate",
  "policy conflict",
  "globalisation",
  "globalization",
];

/** Classifies one topic label into micro / macro / unclassified. */
export function classifyTopicDomain(topic: string): McqDomain {
  const trimmed = topic.trim();
  if (!trimmed || trimmed.toLowerCase() === "untagged") return "unclassified";

  const exact = TOPIC_BY_NAME.get(trimmed.toLowerCase());
  if (exact) return exact.domain;

  const t = ` ${trimmed.toLowerCase()} `;
  const isMicro = MICRO_KEYWORDS.some((k) => t.includes(k));
  const isMacro = MACRO_KEYWORDS.some((k) => t.includes(k));
  if (isMicro && !isMacro) return "micro";
  if (isMacro && !isMicro) return "macro";
  if (isMicro && isMacro) {
    const classified = classifyMcqQuestion({ existingTopic: trimmed });
    return classified.domain;
  }
  return "unclassified";
}

export type DomainStat = {
  domain: McqDomain;
  attempted: number;
  correct: number;
  accuracyPct: number;
};

function finalizeDomainBuckets(
  buckets: Map<McqDomain, { attempted: number; correct: number }>,
): DomainStat[] {
  const order: McqDomain[] = ["micro", "macro", "unclassified"];
  return order
    .filter((d) => buckets.has(d))
    .map((domain) => {
      const entry = buckets.get(domain)!;
      return {
        domain,
        attempted: entry.attempted,
        correct: entry.correct,
        accuracyPct: Math.round((entry.correct / Math.max(entry.attempted, 1)) * 100),
      };
    });
}

/** Groups a flat list of graded questions into micro/macro/unclassified buckets. */
export function aggregateMcqDomains(
  items: { topic: string; correct: boolean; number?: number; level?: string }[],
): DomainStat[] {
  const buckets = new Map<McqDomain, { attempted: number; correct: number }>();
  for (const item of items) {
    let domain = classifyTopicDomain(item.topic);
    if (domain === "unclassified" && item.number) {
      domain = normalizeMcqTopic(item.topic, item.level ?? "AS", item.number).domain;
    }
    const entry = buckets.get(domain) ?? { attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (item.correct) entry.correct += 1;
    buckets.set(domain, entry);
  }
  return finalizeDomainBuckets(buckets);
}

/**
 * Same grouping, but starting from already-aggregated per-topic stats
 * (attempted/correct counts) rather than one row per question.
 */
export function aggregateMcqDomainsFromTopicStats(
  items: { topic: string; attempted: number; correct: number }[],
): DomainStat[] {
  const buckets = new Map<McqDomain, { attempted: number; correct: number }>();
  for (const item of items) {
    const domain = classifyTopicDomain(item.topic);
    const entry = buckets.get(domain) ?? { attempted: 0, correct: 0 };
    entry.attempted += item.attempted;
    entry.correct += item.correct;
    buckets.set(domain, entry);
  }
  return finalizeDomainBuckets(buckets);
}
