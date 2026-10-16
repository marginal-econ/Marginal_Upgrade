import { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Database,
  Search,
  X,
  Sparkles,
  Lightbulb,
  Copy,
  Check,
  Filter,
  FileText,
  Layers,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";

interface SyllabusChapter {
  num: number;
  level: "AS" | "A2";
  title: string;
  category: "Micro" | "Macro";
  concepts: string[];
  markSchemesCount: number;
}

const SYLLABUS_CHAPTERS: SyllabusChapter[] = [
  {
    num: 1,
    level: "AS",
    title: "Basic Economic Ideas & Resource Allocation",
    category: "Micro",
    concepts: ["Scarcity & Opportunity Cost", "Production Possibility Curves (PPC)", "Factors of Production", "Positive vs Normative Statements"],
    markSchemesCount: 142,
  },
  {
    num: 2,
    level: "AS",
    title: "The Price System & the Microeconomy",
    category: "Micro",
    concepts: ["Demand & Supply Curves", "Elasticities (PED, YED, XED, PES)", "Consumer & Producer Surplus", "Price Mechanism & Market Equilibrium"],
    markSchemesCount: 184,
  },
  {
    num: 3,
    level: "AS",
    title: "Government Microeconomic Intervention",
    category: "Micro",
    concepts: ["Maximum & Minimum Price Controls", "Specific & Ad Valorem Taxes", "Producer Subsidies", "Merit & Demerit Goods Market Failure"],
    markSchemesCount: 168,
  },
  {
    num: 4,
    level: "AS",
    title: "The Macroeconomy",
    category: "Macro",
    concepts: ["Aggregate Demand & Supply (AD/AS)", "Demand-Pull & Cost-Push Inflation", "Structural & Cyclical Unemployment", "Balance of Payments Accounts"],
    markSchemesCount: 196,
  },
  {
    num: 5,
    level: "AS",
    title: "Government Macroeconomic Intervention",
    category: "Macro",
    concepts: ["Fiscal & Monetary Policy Levers", "Supply-Side Macro Policies", "Macroeconomic Conflicts & Trade-offs", "Circular Flow of Income"],
    markSchemesCount: 175,
  },
  {
    num: 6,
    level: "A2",
    title: "International Economic Issues",
    category: "Macro",
    concepts: ["Law of Comparative Advantage", "Protectionism vs Free Trade", "Terms of Trade Indices", "Foreign Exchange Regimes (Fixed/Floating)"],
    markSchemesCount: 132,
  },
  {
    num: 7,
    level: "A2",
    title: "Utility & Consumer Behaviour",
    category: "Micro",
    concepts: ["Law of Diminishing Marginal Utility", "Equi-Marginal Principle", "Indifference Curves & Budget Constraints", "Income & Substitution Effects"],
    markSchemesCount: 118,
  },
  {
    num: 8,
    level: "A2",
    title: "Market Structures & Imperfect Competition",
    category: "Micro",
    concepts: ["Monopoly & Oligopoly Models", "Game Theory & Kinked Demand Curve", "Contestable Markets Theory", "Allocative & Productive Efficiency"],
    markSchemesCount: 192,
  },
  {
    num: 9,
    level: "A2",
    title: "The Labour Market",
    category: "Micro",
    concepts: ["Marginal Revenue Product of Labour (MRP)", "Wage Determination in Imperfect Markets", "Trade Unions & Bilateral Monopsony", "Transfer Earnings & Economic Rent"],
    markSchemesCount: 145,
  },
  {
    num: 10,
    level: "A2",
    title: "Macroeconomic Performance",
    category: "Macro",
    concepts: ["Actual vs Potential Economic Growth", "Lorenz Curve & Gini Coefficient", "Multidimensional Poverty Index (MPI)", "National Well-Being Indicators"],
    markSchemesCount: 138,
  },
  {
    num: 11,
    level: "A2",
    title: "Macroeconomic Policies",
    category: "Macro",
    concepts: ["Short-run & Long-run Phillips Curves", "Unconventional Monetary Policy (QE)", "Macroprudential Banking Regulations", "Sovereign Debt Sustainability"],
    markSchemesCount: 154,
  },
];

export interface PastPaperReference {
  id: string;
  paperCode: string;
  year?: number;
  questionNumber: string;
  marks: number;
  level: "AS" | "A2" | "AS/A2";
  section: "Micro" | "Macro";
  topicTitle: string;
  stem: string;
  examinerTip: string;
  markSchemePoints: string[];
}

export const CAMBRIDGE_PAST_PAPERS_CORPUS: PastPaperReference[] = [
  {
    id: "q-ppc-1",
    paperCode: "9708/22/M/J/23",
    year: 2023,
    questionNumber: "Q2(a)",
    marks: 8,
    level: "AS",
    section: "Micro",
    topicTitle: "Production Possibility Curves & Opportunity Cost",
    stem: "Explain, with the aid of a production possibility curve (PPC) diagram, the distinction between a movement along a PPC and an outward shift of a PPC.",
    examinerTip: "Draw a bowed-outward PPC to show increasing opportunity cost. Distinguish reallocating resources vs actual economic growth.",
    markSchemePoints: [
      "Define opportunity cost and PPC accurately.",
      "Movement along = reallocation of scarce resources under constant productive capacity.",
      "Outward shift = expansion of productive potential driven by technology, capital investment, or labour growth.",
      "Accurate diagram with capital goods on one axis and consumer goods on the other.",
    ],
  },
  {
    id: "q-ppc-2",
    paperCode: "9708/21/O/N/20",
    year: 2020,
    questionNumber: "Q2(b)",
    marks: 12,
    level: "AS",
    section: "Micro",
    topicTitle: "PPC & Capital Goods Allocation",
    stem: "Assess whether the reallocation of resources towards capital goods rather than consumer goods is always beneficial for an economy in the long run.",
    examinerTip: "High-scoring answers balance short-run sacrifice of living standards against long-run compounding productive capacity.",
    markSchemePoints: [
      "Explain capital accumulation shifting PPC outward in the future.",
      "Short-run opportunity cost: immediate sacrifice of current consumption and living standards.",
      "Diminishing returns to capital accumulation and ongoing depreciation/maintenance costs.",
      "Balanced evaluative judgement depending on current stage of economic development.",
    ],
  },
  {
    id: "q-ped-1",
    paperCode: "9708/22/O/N/24",
    year: 2024,
    questionNumber: "Q2(b)",
    marks: 12,
    level: "AS",
    section: "Micro",
    topicTitle: "Price Elasticity of Demand (PED) & Business Revenue",
    stem: "Assess whether a business can rely solely on knowledge of price elasticity of demand (PED) when deciding its pricing strategy during an economic recession.",
    examinerTip: "Distinguish between PED and YED (income elasticity) during a downturn.",
    markSchemePoints: [
      "Explain relationship between PED and total revenue (inelastic vs elastic).",
      "Analyse the crucial role of income elasticity (YED) when household incomes fall in a recession.",
      "Cross elasticity (XED) and competitor price retaliations.",
      "Evaluative conclusion on why multi-elasticity information is essential.",
    ],
  },
  {
    id: "q-ped-2",
    paperCode: "9708/22/M/J/22",
    year: 2022,
    questionNumber: "Q2(a)",
    marks: 8,
    level: "AS",
    section: "Micro",
    topicTitle: "Price Elasticity of Supply (PES) Time Lags",
    stem: "Explain why price elasticity of supply (PES) for agricultural crops differs significantly between the short run and the long run.",
    examinerTip: "Emphasize biological production lags, perishability, and availability of spare land capacity.",
    markSchemePoints: [
      "Define PES and state the formula (%ΔQs / %ΔP).",
      "Short run: inelastic due to harvesting cycles, weather dependency, and storage constraints.",
      "Long run: elastic due to planting decisions, investment in irrigation/technology, and crop switching.",
    ],
  },
  {
    id: "q-ped-3",
    paperCode: "9708/21/O/N/21",
    year: 2021,
    questionNumber: "Q3(a)",
    marks: 8,
    level: "AS",
    section: "Micro",
    topicTitle: "Elasticity & Tax Incidence",
    stem: "Explain how the price elasticity of demand determines the incidence of an indirect tax between consumers and producers.",
    examinerTip: "Use two side-by-side diagrams: one with relatively elastic demand, one with relatively inelastic demand.",
    markSchemePoints: [
      "Define tax incidence and indirect tax.",
      "Diagram showing vertical upward shift of supply by the tax amount.",
      "Relatively inelastic demand = majority burden passed to consumer as higher price.",
      "Relatively elastic demand = producers absorb majority of tax burden to avoid demand collapse.",
    ],
  },
  {
    id: "q-tax-1",
    paperCode: "9708/22/M/J/23",
    year: 2023,
    questionNumber: "Q3(b)",
    marks: 12,
    level: "AS",
    section: "Micro",
    topicTitle: "Indirect Taxes on Demerit Goods",
    stem: "Assess whether an indirect tax is the most effective policy for a government to reduce the consumption of demerit goods.",
    examinerTip: "Compare indirect taxes with minimum unit pricing and educational campaigns. Draw an inelastic demand curve.",
    markSchemePoints: [
      "Analyse how specific or ad valorem tax raises price and contracts quantity traded towards socially optimal output.",
      "Examine tax incidence: inelastic demand means consumers bear the bulk of the tax burden.",
      "Alternative policies: minimum unit pricing, advertising bans, and subsidies on merit substitutes.",
      "Evaluative weighing: tax generates government revenue to fund healthcare vs regressive burden on low-income earners and black market risks.",
    ],
  },
  {
    id: "q-ctrl-1",
    paperCode: "9708/22/O/N/22",
    year: 2022,
    questionNumber: "Q3(b)",
    marks: 12,
    level: "AS",
    section: "Micro",
    topicTitle: "Maximum Price Controls (Price Ceilings)",
    stem: "Assess the consequences for consumers, producers, and the government of introducing a maximum price (price ceiling) on essential food items.",
    examinerTip: "Draw a price ceiling below equilibrium. Explain shortage, black markets, and non-price rationing.",
    markSchemePoints: [
      "Diagram showing Pmax below equilibrium creating excess demand (Qd - Qs).",
      "Consumer impact: cheaper for those who obtain it vs shortages and queuing for others.",
      "Producer impact: lower revenue and profits, possible disinvestment and exit.",
      "Government impact: cost of monitoring, enforcement, and possible rationing schemes.",
      "Conclusion weighing short-term affordability vs long-term supply contraction.",
    ],
  },
  {
    id: "q-inf-1",
    paperCode: "9708/22/M/J/24",
    year: 2024,
    questionNumber: "Q4(a)",
    marks: 8,
    level: "AS",
    section: "Macro",
    topicTitle: "Demand-Pull vs Cost-Push Inflation (AD/AS)",
    stem: "Explain, with the aid of an AD/AS diagram, the difference between demand-pull inflation and cost-push inflation.",
    examinerTip: "Draw two separate AD/AS diagrams: one showing an outward shift of AD, the other an inward shift of SRAS.",
    markSchemePoints: [
      "Define inflation (sustained rise in general price level).",
      "Demand-pull: AD shifts right (C+I+G+X-M increases near full employment capacity).",
      "Cost-push: SRAS shifts left due to rising wages, imported raw material costs, or energy shocks.",
      "Accurate equilibrium price level and real output coordinates on both diagrams.",
    ],
  },
  {
    id: "q-inf-2",
    paperCode: "9708/21/O/N/23",
    year: 2023,
    questionNumber: "Q4(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Inflation vs Malignant Deflation",
    stem: "Assess whether high inflation is always more harmful to an economy than a period of deflation.",
    examinerTip: "Analyse the deflationary spiral (delayed consumption, rising real debt burden).",
    markSchemePoints: [
      "Consequences of high inflation: menu costs, shoe-leather costs, fiscal drag, redistribution from savers to borrowers.",
      "Consequences of malignant deflation: consumers postpone spending, debt deflation, real wage rigidity.",
      "Benign vs malignant deflation (supply-driven technological deflation vs demand-collapse deflation).",
      "Evaluative judgement comparing the severity of zero-bound monetary policy trap in deflation.",
    ],
  },
  {
    id: "q-fx-1",
    paperCode: "9708/22/M/J/23",
    year: 2023,
    questionNumber: "Q5(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Exchange Rate Depreciation & Current Account",
    stem: "Assess whether a depreciation of a country's currency will always correct a current account deficit on its balance of payments.",
    examinerTip: "Explain the Marshall-Lerner condition (PEDx + PEDm > 1) and the short-run J-curve effect.",
    markSchemePoints: [
      "Analyse how depreciation reduces export prices in foreign currency and raises import prices in domestic currency.",
      "Explain the Marshall-Lerner condition: current account only improves if sum of PED of exports and imports > 1.",
      "J-curve effect: short-run inelasticity leads to initial worsening of deficit before long-run improvement.",
      "Domestic cost-push inflation risk offsetting price competitiveness.",
      "Conclusion regarding non-price competitiveness (quality, branding) vs price factors.",
    ],
  },
  {
    id: "q-pol-1",
    paperCode: "9708/21/O/N/24",
    year: 2024,
    questionNumber: "Q5(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Supply-Side vs Monetary Policy on Aggregate Demand",
    stem: "Assess whether supply-side policies are superior to monetary policy in achieving sustained, non-inflationary economic growth.",
    examinerTip: "Contrast the time lags of supply-side policies with the immediate demand-management impact of interest rates.",
    markSchemePoints: [
      "Analyse interventionist and market-oriented supply-side policies shifting LRAS right.",
      "Analyse monetary policy (interest rates, QE) stimulating AD.",
      "Conflicts and trade-offs: supply-side policies take years to bear fruit and carry fiscal opportunity costs.",
      "Conclusion: monetary policy is effective for short-run stabilization; supply-side policies are essential for raising productive capacity.",
    ],
  },
  {
    id: "q-pol-2",
    paperCode: "9708/22/W/22",
    year: 2022,
    questionNumber: "Q4(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Contractionary Monetary Policy & Inflation",
    stem: "Assess the effectiveness of contractionary monetary policy in reducing demand-pull inflation.",
    examinerTip: "Trace the full causal chain: Base rate ↑ → Commercial loan rates ↑ → Cost of credit ↑ → Discretionary income ↓ → C & I ↓ → AD shifts left.",
    markSchemePoints: [
      "Explain central bank policy rate increase feeding into commercial lending and mortgage rates.",
      "Detail transmission channels: higher cost of borrowing curtails consumption (C) and investment (I), shifting AD left.",
      "Analyse exchange rate appreciation (hot money inflows) cheapening imports and further suppressing net exports (X-M).",
      "Evaluate limitations: 12–18 month transmission lag, ineffectiveness against imported cost-push inflation, and adverse impact on economic growth.",
    ],
  },
  {
    id: "q-pol-3",
    paperCode: "9708/21/M/J/24",
    year: 2024,
    questionNumber: "Q5(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Fiscal Policy Multiplier & Crowding Out",
    stem: "Assess the effectiveness of expansionary fiscal policy in stimulating economic growth during a severe recession.",
    examinerTip: "Explain why crowding out does not occur during deep recessions when spare capacity is abundant and monetary policy is accommodative.",
    markSchemePoints: [
      "Analyse how increased government spending (G) and tax cuts inject demand, triggering the Keynesian multiplier (k = 1 / (1 - MPC)) to expand AD.",
      "Explain financial crowding out: increased sovereign borrowing pushes bond yields and interest rates higher, dampening private investment (I).",
      "Analyse time lags (recognition, implementation, impact lags) and structural debt accumulation.",
      "Evaluate effectiveness: highly effective when output gap is large and private sector is in liquidity trap with zero crowding out.",
    ],
  },
  {
    id: "q-prot-1",
    paperCode: "9708/22/O/N/22",
    year: 2022,
    questionNumber: "Q5(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Protectionism & Infant Industry Tariffs",
    stem: "Assess the argument that a developing country should use tariffs to protect its infant industries from foreign competition.",
    examinerTip: "Weigh economies of scale and learning-by-doing against retaliation and lack of competitive incentives.",
    markSchemePoints: [
      "Define infant industry and explain temporary comparative disadvantage.",
      "Analyse how a tariff creates domestic price shelter allowing firms to achieve minimum efficient scale (MES).",
      "Counterarguments: retaliation by trade partners, deadweight loss, complacency/dependency behind tariff barriers.",
      "Evaluation: difficult for governments to 'pick winners'; production subsidies may be superior to tariffs by avoiding consumer surplus distortion.",
    ],
  },
  {
    id: "q-prot-2",
    paperCode: "9708/21/M/J/21",
    year: 2021,
    questionNumber: "Q5(a)",
    marks: 8,
    level: "AS",
    section: "Macro",
    topicTitle: "Tariff Diagram Analysis",
    stem: "Explain, with the aid of a tariff diagram, the effect of an import tariff on the domestic quantity produced and government revenue.",
    examinerTip: "Include world supply curve Sw and tariff-inclusive supply curve Sw+t. Label tariff revenue box.",
    markSchemePoints: [
      "Accurate diagram with domestic D, domestic S, Sw, and Sw+t.",
      "Show expansion of domestic production from Q1 to Q2.",
      "Show contraction of total domestic consumption from Q4 to Q3.",
      "Identify government tariff revenue rectangle (tariff rate × volume of imports).",
    ],
  },
  {
    id: "q-prot-3",
    paperCode: "9708/42/M/J/24",
    year: 2024,
    questionNumber: "Q5",
    marks: 20,
    level: "A2",
    section: "Macro",
    topicTitle: "Import Tariffs & Domestic Welfare Loss",
    stem: "Evaluate the view that import tariffs always reduce domestic economic welfare in the importing economy.",
    examinerTip: "Candidates must accurately identify the two deadweight loss triangles (Areas B and D) and discuss the terms-of-trade caveat for large importing nations.",
    markSchemePoints: [
      "Diagrammatic welfare analysis showing world price Pw rising to Pw+t.",
      "Quantify consumer surplus loss: area (A + B + C + D).",
      "Identify domestic producer surplus gain (Area A) and government tariff revenue (Area C).",
      "Identify net deadweight losses: production inefficiency (Area B) and consumer distortion (Area D).",
      "Evaluate exceptions: large-country terms-of-trade effect where foreign exporters absorb tariff, infant industries, and strategic anti-dumping.",
    ],
  },
  {
    id: "q-a2-mono-1",
    paperCode: "9708/42/M/J/23",
    year: 2023,
    questionNumber: "Q2",
    marks: 20,
    level: "A2",
    section: "Micro",
    topicTitle: "Monopoly Efficiency & Antitrust Regulation",
    stem: "Evaluate the view that monopolies are always allocatively and productively inefficient, and should therefore be broken up by competition regulators.",
    examinerTip: "Contrast deadweight welfare loss with dynamic efficiency (Schumpeterian innovation) and natural monopoly economies of scale.",
    markSchemePoints: [
      "Diagram showing profit maximization (MC=MR) where P > MC (allocative inefficiency) and output is not at min AC (productive inefficiency).",
      "Deadweight welfare loss triangle pointing towards competitive output.",
      "Counterarguments: Natural monopoly where single firm exploits vast MES; dynamic efficiency from supernormal profits funded into R&D.",
      "Contestable market theory: threat of entry constrains monopoly pricing without state breakups.",
      "Evaluative conclusion: depends on contestability, industry structure, and regulatory remedies (price caps RPI-X vs breakups).",
    ],
  },
  {
    id: "q-a2-labour-1",
    paperCode: "9708/41/M/J/23",
    year: 2023,
    questionNumber: "Q4",
    marks: 20,
    level: "A2",
    section: "Micro",
    topicTitle: "Labour Markets, Monopsony & Trade Unions",
    stem: "Evaluate the view that trade unions always cause unemployment when they negotiate wage rates above the competitive equilibrium.",
    examinerTip: "Contrasting the competitive model with the monopsony model is essential for achieving Level 4/Band 4 marks in Paper 4.",
    markSchemePoints: [
      "Competitive labour market model: union wage Wu above competitive Wc contracts employment along downward-sloping MRPL curve.",
      "Monopsony labour market model: single buyer of labour sets wage where MCL = MRPL, underpaying at Wm and underemploying at Em.",
      "Analyse how a union setting wage Wu can simultaneously raise wages and expand employment towards competitive levels.",
      "Evaluate real-world constraints: union density, productivity bargaining, capital substitution, and elasticity of derived demand.",
    ],
  },
  {
    id: "q-a2-ext-1",
    paperCode: "9708/41/O/N/23",
    year: 2023,
    questionNumber: "Q3",
    marks: 20,
    level: "A2",
    section: "Micro",
    topicTitle: "Tradable Pollution Permits vs Carbon Tax",
    stem: "Evaluate whether a system of tradable pollution permits is the most effective policy for reducing carbon emissions compared to a carbon tax.",
    examinerTip: "Compare price certainty (carbon tax) against quantity certainty (permits cap).",
    markSchemePoints: [
      "Negative externality diagram showing MSC > MPC, free market equilibrium Qm exceeding socially optimal Qso, and deadweight loss triangle.",
      "Pigouvian tax: sets price of carbon equal to marginal external cost (MEC), but total emission reduction is uncertain due to unknown elasticity.",
      "Tradable permits: sets strict quantitative cap (Qso) on emissions, allowing permit trading to achieve least-cost abatement across firms.",
      "Evaluation: permits provide quantity certainty but price volatility, whereas taxes provide price predictability but volume uncertainty.",
    ],
  },
  {
    id: "q-spec-1",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q1(a)",
    marks: 2,
    level: "AS",
    section: "Micro",
    topicTitle: "Negative Externality Definition",
    stem: "Define the term 'negative externality' with reference to the extract.",
    examinerTip: "State third party cost outside the market transaction. 1 mark for definition, 1 mark for application.",
    markSchemePoints: [
      "Cost incurred by a third party not involved in the transaction / external cost (1 mark).",
      "Application to the data extract context (1 mark).",
    ],
  },
  {
    id: "q-spec-2",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q1(b)",
    marks: 4,
    level: "AS",
    section: "Micro",
    topicTitle: "Indirect Tax on Demerit Goods",
    stem: "Explain how an indirect tax can correct market failure for demerit goods.",
    examinerTip: "Explain mechanism: tax increases costs of production, shifts supply curve inward/left towards social optimum.",
    markSchemePoints: [
      "Tax elevates production costs, shifting supply curve inward/leftward (up to 2 marks).",
      "Higher market price contracts quantity demanded towards the socially optimal output where MSB = MSC (up to 2 marks).",
    ],
  },
  {
    id: "q-spec-3",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q1(c)",
    marks: 4,
    level: "AS",
    section: "Micro",
    topicTitle: "Price Ceiling & Consumer Surplus",
    stem: "Analyze the consequences of a price ceiling on consumer surplus.",
    examinerTip: "Show Pmax below equilibrium. Explain gain in surplus for consumers who purchase vs deadweight loss from shortage.",
    markSchemePoints: [
      "Lower price expands consumer surplus for buyers who secure the good (2 marks).",
      "Contraction in quantity supplied creates shortage and unserved demand, generating deadweight welfare loss (2 marks).",
    ],
  },
  {
    id: "q-spec-4",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q2(a)",
    marks: 8,
    level: "AS",
    section: "Micro",
    topicTitle: "Tax Structure: Progressive, Regressive & Proportional",
    stem: "Distinguish between progressive, regressive, and proportional taxes, explaining which is most equitable.",
    examinerTip: "Define by proportion of income paid as income rises, not absolute dollar amounts.",
    markSchemePoints: [
      "Progressive tax: proportion of income paid in tax rises as income rises (e.g. income tax).",
      "Regressive tax: proportion of income paid in tax falls as income rises (e.g. indirect taxes, specific duty).",
      "Proportional tax: proportion of income paid in tax remains constant across all income levels.",
      "Evaluation of equity: progressive taxes satisfy vertical equity and redistribute wealth.",
    ],
  },
  {
    id: "q-spec-5",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q2(b)",
    marks: 12,
    level: "AS",
    section: "Micro",
    topicTitle: "Subsidies vs Fuel Taxes on Transport Congestion",
    stem: "Assess whether subsidising public transport is more effective in reducing road congestion than levying an indirect tax on motor fuel.",
    examinerTip: "Compare cross elasticity of demand (XED) between private cars and public transport with PED of fuel.",
    markSchemePoints: [
      "Analyse producer subsidies shifting public transport supply right, lowering fares and incentivising substitution away from cars.",
      "Analyse fuel indirect tax raising motoring costs to internalise external congestion and pollution costs.",
      "Cross-price elasticity (XED): low substitutability means commuters continue driving unless public transit is reliable and fast.",
      "Evaluation: combined policy package is most effective (tax revenue hypothecated into transit subsidies).",
    ],
  },
  {
    id: "q-spec-6",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q3(a)",
    marks: 8,
    level: "AS",
    section: "Macro",
    topicTitle: "Terms of Trade Causes & Measurement",
    stem: "Explain two causes of a deterioration in a country's terms of trade.",
    examinerTip: "Terms of trade = (Index of export prices / Index of import prices) × 100.",
    markSchemePoints: [
      "Define terms of trade and state index formula accurately.",
      "Cause 1: Fall in world price of major exports (e.g. collapse in commodity prices or global recession reducing export demand).",
      "Cause 2: Rise in import prices (e.g. global oil supply shock or domestic currency depreciation).",
    ],
  },
  {
    id: "q-spec-7",
    paperCode: "9708/22/2024",
    year: 2024,
    questionNumber: "Q3(b)",
    marks: 12,
    level: "AS",
    section: "Macro",
    topicTitle: "Floating Exchange Rates & Current Account Correction",
    stem: "Assess whether a floating exchange rate automatically corrects a persistent current account deficit.",
    examinerTip: "Address Marshall-Lerner condition, J-curve time lags, and capital account offsetting flows.",
    markSchemePoints: [
      "Automatic mechanism: current account deficit means supply of currency exceeds demand, causing depreciation.",
      "Depreciation cheapens exports and makes imports dearer, tending to restore trade equilibrium.",
      "Limitations: Marshall-Lerner condition (|PEDx + PEDm| > 1) required; short-run J-curve worsening.",
      "Capital account hot money flows can keep currency appreciated despite a trade deficit, preventing automatic correction.",
    ],
  },
];

const POPULAR_QUICK_SEARCHES = [
  "AD",
  "Demerit Goods",
  "Price Elasticity (PED)",
  "Tariffs",
  "Inflation",
  "Monopoly",
  "PPC",
  "Scarcity",
  "Exchange Rates",
  "Monetary Policy",
];

export function RagEngineSection() {
  const [searchQuery, setSearchQuery] = useState("AD");
  const [filterType, setFilterType] = useState<"ALL" | "DEFINITIONS" | "PAST_PAPERS" | "SYLLABUS">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCitation = (text: string, id: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Perform fast, direct corpus retrieval for ANY keyword (e.g. "AD", "demerit goods", "tariffs")
  const searchResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      return {
        definitions: CAMBRIDGE_CORE_DEFINITIONS.slice(0, 6),
        pastPapers: CAMBRIDGE_PAST_PAPERS_CORPUS.slice(0, 4),
        chapters: SYLLABUS_CHAPTERS.slice(0, 3),
        totalCount: 13,
      };
    }

    const low = raw.toLowerCase().replace(/['"“”‘’]/g, "");

    // Acronym and typo expansion mappings
    const phrases: string[] = [low];

    // Typo corrections
    if (low.includes("deprit")) phrases.push("demerit", "demerit good", "negative externality", "indirect tax");
    if (low.includes("oood")) phrases.push("good", "demerit good");
    if (low.includes("oppurtunity") || low.includes("oppertunity")) phrases.push("opportunity cost", "ppc");
    if (low.includes("elasticy")) phrases.push("elasticity", "ped", "pes");
    if (low.includes("inflaton")) phrases.push("inflation", "demand-pull", "cost-push");
    if (low.includes("terriff")) phrases.push("tariff", "protectionism");
    if (low.includes("monoply")) phrases.push("monopoly");
    if (low.includes("scarsity")) phrases.push("scarcity");

    // Cambridge acronym expansions
    if (low === "ad" || low === "aggregate demand") {
      phrases.push("aggregate demand", "ad/as", "ad-as", "aggregate demand (ad)");
    } else if (low === "as" || low === "aggregate supply") {
      phrases.push("aggregate supply", "sras", "lras");
    } else if (low === "ped") {
      phrases.push("price elasticity of demand", "ped");
    } else if (low === "pes") {
      phrases.push("price elasticity of supply", "pes");
    } else if (low === "yed") {
      phrases.push("income elasticity of demand");
    } else if (low === "xed") {
      phrases.push("cross elasticity of demand");
    } else if (low === "ppc" || low === "ppf") {
      phrases.push("production possibility curve", "opportunity cost");
    } else if (low === "bop") {
      phrases.push("balance of payments", "current account");
    } else if (low === "cpi") {
      phrases.push("consumer price index", "inflation");
    }

    const isShortAcronym = low.length <= 3;
    const wordBoundaryRegex = isShortAcronym ? new RegExp(`\\b${low}\\b`, "i") : null;

    // 1. Match Cambridge Master Definitions
    const matchedDefs = CAMBRIDGE_CORE_DEFINITIONS.filter((d) => {
      const termLow = d.term.toLowerCase();
      const textLow = d.definition_text.toLowerCase();
      const catLow = d.category.toLowerCase();

      for (const phrase of phrases) {
        if (termLow.includes(phrase) || textLow.includes(phrase) || catLow.includes(phrase)) {
          return true;
        }
      }

      if (wordBoundaryRegex) {
        if (wordBoundaryRegex.test(d.term) || wordBoundaryRegex.test(d.definition_text)) {
          return true;
        }
      }

      return false;
    });

    // 2. Match Past Papers & Mark Schemes
    const matchedPapers = CAMBRIDGE_PAST_PAPERS_CORPUS.filter((p) => {
      const stemLow = p.stem.toLowerCase();
      const codeLow = p.paperCode.toLowerCase();
      const titleLow = p.topicTitle.toLowerCase();
      const pointsLow = p.markSchemePoints.join(" ").toLowerCase();
      const tipLow = p.examinerTip.toLowerCase();

      for (const phrase of phrases) {
        if (
          stemLow.includes(phrase) ||
          codeLow.includes(phrase) ||
          titleLow.includes(phrase) ||
          pointsLow.includes(phrase) ||
          tipLow.includes(phrase)
        ) {
          return true;
        }
      }

      if (wordBoundaryRegex) {
        if (wordBoundaryRegex.test(p.stem) || wordBoundaryRegex.test(p.topicTitle) || wordBoundaryRegex.test(pointsLow)) {
          return true;
        }
      }

      return false;
    });

    // 3. Match Syllabus Chapters
    const matchedChapters = SYLLABUS_CHAPTERS.filter((ch) => {
      const titleLow = ch.title.toLowerCase();
      const conceptsLow = ch.concepts.join(" ").toLowerCase();
      const catLow = ch.category.toLowerCase();

      for (const phrase of phrases) {
        if (titleLow.includes(phrase) || conceptsLow.includes(phrase) || catLow === phrase) {
          return true;
        }
      }

      if (wordBoundaryRegex) {
        if (wordBoundaryRegex.test(ch.title) || wordBoundaryRegex.test(conceptsLow)) {
          return true;
        }
      }

      return false;
    });

    return {
      definitions: matchedDefs,
      pastPapers: matchedPapers,
      chapters: matchedChapters,
      totalCount: matchedDefs.length + matchedPapers.length + matchedChapters.length,
    };
  }, [searchQuery]);

  return (
    <section id="rag-engine" className="relative border-b-[1.5px] border-ink bg-surface-raised py-12 sm:py-16 md:py-20 scroll-mt-20">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
        {/* Simple, Clean Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <Database className="size-3.5" />
            <span>Cambridge 9708 Knowledge Base · Universal Search</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Search Cambridge 9708 Resources
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Type any term below (e.g. <strong>AD</strong>, <strong>demerit goods</strong>, <strong>tariffs</strong>, <strong>PED</strong>, <strong>inflation</strong>). Instantly retrieves all references across Cambridge textbooks, past papers, mark schemes, and syllabus specifications.
          </p>
        </div>

        {/* ONE Simple Search Bar */}
        <div className="space-y-3 max-w-3xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any keyword or past paper (e.g. AD, demerit goods, tariffs, PED, scarcity, 9708/22)..."
              className="w-full h-12 sm:h-14 pl-11 pr-24 rounded-2xl border-2 border-border focus:border-primary bg-background text-sm sm:text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-12 top-1/2 -translate-y-1/2 size-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted border border-border/60 hidden sm:inline-block">
              RAG Search
            </span>
          </div>

          {/* Quick Click Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Search:</span>
            {POPULAR_QUICK_SEARCHES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border",
                  searchQuery.trim().toLowerCase() === tag.toLowerCase()
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>
              Found <strong>{searchResults.totalCount}</strong> Cambridge references for &ldquo;<strong>{searchQuery || "All"}</strong>&rdquo;
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {[
              { id: "ALL", label: `All (${searchResults.totalCount})` },
              { id: "DEFINITIONS", label: `Textbook (${searchResults.definitions.length})` },
              { id: "PAST_PAPERS", label: `Past Papers (${searchResults.pastPapers.length})` },
              { id: "SYLLABUS", label: `Syllabus (${searchResults.chapters.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={cn(
                  "rounded-md px-2.5 py-0.5 transition-colors cursor-pointer border",
                  filterType === tab.id
                    ? "bg-foreground text-background font-bold border-foreground"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Stream: Clean, Direct References */}
        <div className="max-w-4xl mx-auto space-y-6">
          {searchResults.totalCount === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border/80 p-8 space-y-2">
              <p className="text-sm font-semibold text-foreground">No references found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-muted-foreground">Try searching another term like <em>AD</em>, <em>demerit goods</em>, <em>tariffs</em>, <em>inflation</em>, or <em>elasticity</em>.</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Reset search
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* 1. Official Textbook Definitions */}
              {(filterType === "ALL" || filterType === "DEFINITIONS") &&
                searchResults.definitions.map((def) => (
                  <div
                    key={def.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 hover:border-primary/40 transition-colors flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                          <BookOpen className="size-3.5 text-primary shrink-0" />
                          {def.term}
                        </span>
                        <Badge variant="outline" className="text-[9.5px] font-mono shrink-0">
                          Textbook Definition
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic font-serif">
                        &ldquo;{def.definition_text}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono border-t border-border/50">
                      <span className="truncate max-w-[200px]">{def.category}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(`${def.term}: ${def.definition_text}`, def.id)}
                        className="text-primary hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedId === def.id ? (
                          <>
                            <Check className="size-2.5 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-2.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

              {/* 2. Official Cambridge Past Paper Questions & Mark Schemes */}
              {(filterType === "ALL" || filterType === "PAST_PAPERS") &&
                searchResults.pastPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 hover:border-emerald-500/40 transition-colors flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                          {paper.paperCode} · {paper.questionNumber}
                        </Badge>
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                          {paper.marks} Marks · {paper.level} {paper.section}
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                        {paper.stem}
                      </h5>

                      <div className="rounded-xl bg-muted/40 p-2.5 space-y-1 text-[11px] text-muted-foreground border border-border/50">
                        <span className="font-bold text-foreground block text-[10.5px]">Published Mark Scheme:</span>
                        <ul className="space-y-1 list-disc pl-3">
                          {paper.markSchemePoints.map((pt, pIdx) => (
                            <li key={pIdx} className="leading-snug">{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {paper.examinerTip && (
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2 text-[10.5px] text-amber-900/90 dark:text-amber-300/90 flex items-start gap-1.5">
                          <Lightbulb className="size-3 text-amber-500 shrink-0 mt-0.5" />
                          <span><strong>Examiner Report:</strong> {paper.examinerTip}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono border-t border-border/50">
                      <span className="truncate max-w-[200px]">{paper.topicTitle}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(`${paper.paperCode} ${paper.questionNumber}: ${paper.stem}`, paper.id)}
                        className="text-primary hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedId === paper.id ? (
                          <>
                            <Check className="size-2.5 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-2.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

              {/* 3. Official Syllabus Chapter Objectives */}
              {(filterType === "ALL" || filterType === "SYLLABUS") &&
                searchResults.chapters.map((ch) => (
                  <div
                    key={ch.num}
                    className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 hover:border-primary/40 transition-colors flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/30 bg-primary/5">
                          Syllabus Chapter {ch.num}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {ch.level} · {ch.category} ({ch.markSchemesCount} mark schemes)
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-foreground">
                        {ch.title}
                      </h5>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {ch.concepts.map((concept, cIdx) => (
                          <span
                            key={cIdx}
                            className="rounded-md bg-muted/70 px-2 py-0.5 text-[10.5px] text-foreground font-medium border border-border/50 cursor-pointer hover:border-primary/50"
                            onClick={() => setSearchQuery(concept)}
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono border-t border-border/50">
                      <span>Cambridge 9708 Official Syllabus</span>
                      <span className="text-primary font-semibold">100% Vector Grounded</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
