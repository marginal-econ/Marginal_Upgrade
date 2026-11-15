import * as fs from "node:fs";
import * as path from "node:path";
import { setRuntimeEnv } from "../src/server/env";

// Load .env variables
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envObj: Record<string, string> = {};
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
      envObj[key] = val;
    }
  }
  setRuntimeEnv(envObj);
}

import { normaliseGrading } from "../src/lib/examiner/types";
import { applyWritingQualityGuardrail, analyzeEssayQuality } from "../src/lib/examiner/writing-quality.server";
import type { AoSplit } from "../src/lib/examiner/config";

interface CalibrationScenario {
  id: string;
  tariff: 8 | 12 | 20;
  category: "LOW_BAND_FLAWED" | "MIDDLE_BAND" | "TOP_BAND";
  isEvaluative: boolean;
  question: string;
  essayText: string;
  split: AoSplit;
  mockRawGrading: any;
  expectedMaxMarkAllowed: number;
  expectedMinMarkAllowed: number;
  expectedBand: string;
  description: string;
}

const SCENARIOS: CalibrationScenario[] = [
  // =========================================================================
  // 1. LOW BAND & FLAWED ESSAYS (Verifying strict clamping & non-inflation)
  // =========================================================================
  {
    id: "LOW_12M_INVERTED_MECHANISM",
    tariff: 12,
    category: "LOW_BAND_FLAWED",
    isEvaluative: true,
    question: "Assess whether an increase in interest rates is the most effective policy to reduce demand-pull inflation. [12]",
    essayText: `Inflation is defined as the sustained increase in the general price level in an economy over a given period of time. In this essay I will discuss monetary policy, which is when the government changes government spending and direct taxation to manage the economy, such as changing interest rates.

When the central bank increases interest rates, the cost of borrowing becomes cheaper for households and firms. Consumers take out more mortgages and firms expand capital investments because loans cost less. However, this causes aggregate demand to shift to the right, which increases the price level and increases inflation even further because firms have to pay higher interest costs on their existing debt.

Also, higher interest rates cause the exchange rate to depreciate because foreign investors move money away. A weaker currency makes exports cheaper and imports expensive, which reduces net exports and cools down the economy.

Therefore, higher interest rates will always reduce inflation because central banks use interest rates to control money. However, other policies like fiscal policy or supply-side policies could also be used depending on circumstances.`,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
    mockRawGrading: {
      total_mark: 7, // Hallucinated 7/12 (Grade B) before fix
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment: "Candidate understands inflation, though conflates monetary policy with fiscal policy tools.",
        },
        analysis: {
          awarded: 4,
          out_of: 6,
          comment: "The candidate's analysis contains fundamental errors that invert the transmission mechanism of monetary policy. The claim that higher interest rates make borrowing cheaper and shift AD to the right is incorrect. The analysis is held at Level 2 due to these errors.",
        },
        evaluation: {
          awarded: 3,
          out_of: 4,
          comment: "Candidate mentions alternatives but provides superficial evaluation. This restricts AO3 to Level 1.",
        },
      },
      examiner_summary: "Contains significant inaccuracies in economic theory, particularly inverting the transmission mechanism.",
      strengths: ["Basic essay structure.", "Identifies exchange rate link."],
      weaknesses: [
        "Inverts the transmission mechanism of monetary policy: higher interest rates reduce AD, not increase it.",
        "Conflates monetary policy with fiscal policy.",
        "Superficial evaluation lacking explicit criteria.",
      ],
    },
    expectedMinMarkAllowed: 1,
    expectedMaxMarkAllowed: 5,
    expectedBand: "Bottom Band | Lower Middle Band",
    description: "Inverted AD shift + monetary/fiscal conflation + comment restricting AO3 to Level 1. MUST clamp to <= 5/12.",
  },
  {
    id: "LOW_8M_INVERTED_SUPPLY_SHIFT",
    tariff: 8,
    category: "LOW_BAND_FLAWED",
    isEvaluative: true,
    question: "Discuss whether the imposition of an indirect tax on sugary drinks will reduce consumption. [8]",
    essayText: `An indirect tax is a tax on income. When the government puts a tax on sugary drinks, this shifts the supply curve to the right, which lowers the price of drinks and makes firms produce more. Consumers then buy more drinks because price is lower. In conclusion, taxes work.`,
    split: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 },
    mockRawGrading: {
      total_mark: 5,
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: {
          awarded: 1,
          out_of: 2,
          comment: "Incorrect definition of indirect tax (direct tax confusion).",
        },
        analysis: {
          awarded: 3,
          out_of: 4,
          comment: "The candidate shifts supply the wrong way: claiming a tax shifts supply to the right and lowers price is a fatal analytical error.",
        },
        evaluation: {
          awarded: 1,
          out_of: 2,
          comment: "Superficial one-liner conclusion without weighing.",
        },
      },
      examiner_summary: "Major analytical errors regarding tax incidence.",
      strengths: ["Attempts to answer prompt."],
      weaknesses: ["Shifts supply the wrong way.", "Incorrect tax definition."],
    },
    expectedMinMarkAllowed: 0,
    expectedMaxMarkAllowed: 2,
    expectedBand: "Bottom Band",
    description: "Inverted supply shift (claiming tax shifts supply right) + wrong tax definition. MUST clamp to <= 2/8.",
  },
  {
    id: "LOW_20M_INVERTED_DEMAND_CURVE",
    tariff: 20,
    category: "LOW_BAND_FLAWED",
    isEvaluative: true,
    question: "Evaluate whether protectionist policies are always beneficial for developing economies. [20]",
    essayText: `Protectionism means trade barriers like tariffs. When tariffs are put on imports, the price of imports increases so demand shifts to the left and domestic firms get all the market. Protectionism is always good because it makes the country richer and creates jobs.`,
    split: { ao1_marks: 4, ao2_marks: 10, ao3_marks: 6 },
    mockRawGrading: {
      total_mark: 12,
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 4, comment: "Basic definition of tariffs." },
        analysis: {
          awarded: 7,
          out_of: 10,
          comment: "Analytical confusion: higher price causes a contraction along the demand curve, not a leftward shift of the demand curve. Descriptive assertions without complete causal links.",
        },
        evaluation: {
          awarded: 3,
          out_of: 6,
          comment: "Unsubstantiated sweeping conclusion without acknowledging costs or deadweight loss.",
        },
      },
      examiner_summary: "Underdeveloped 20m essay with curve shift vs movement confusion.",
      strengths: ["Identifies infant industry rationale."],
      weaknesses: ["Confuses price contraction with demand curve shift.", "No counter-arguments."],
    },
    expectedMinMarkAllowed: 4,
    expectedMaxMarkAllowed: 8,
    expectedBand: "Bottom Band | Lower Middle Band",
    description: "Underdeveloped outline (< 100 words on 20m) with curve confusion and sweeping verdict. MUST clamp to <= 8/20.",
  },
  {
    id: "LOW_8M_NON_EVALUATIVE_WEAK",
    tariff: 8,
    category: "LOW_BAND_FLAWED",
    isEvaluative: false,
    question: "Explain the difference between productive and allocative efficiency. [8]",
    essayText: `Productive efficiency is making goods. Allocative efficiency is when everyone gets goods. Both are good for an economy.`,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 },
    mockRawGrading: {
      total_mark: 5,
      band: "Lower Middle Band",
      ao_breakdown: {
        knowledge: { awarded: 1, out_of: 2, comment: "Vague, colloquial descriptions without syllabus terms." },
        analysis: { awarded: 3, out_of: 6, comment: "Lacks cost curves (AC=MC) and price mechanism links (P=MC)." },
        evaluation: { awarded: 1, out_of: 0, comment: "Non-evaluative question." },
      },
      examiner_summary: "Very brief descriptive attempt.",
      strengths: ["Names both types of efficiency."],
      weaknesses: ["No economic formulas or diagrams.", "Severely underdeveloped."],
    },
    expectedMinMarkAllowed: 1,
    expectedMaxMarkAllowed: 3,
    expectedBand: "Bottom Band | Lower Middle Band",
    description: "Severely stunted non-evaluative response (30 words) with zero evaluation and colloquial knowledge. MUST clamp to <= 3/8.",
  },

  // =========================================================================
  // 2. MIDDLE BAND ESSAYS (Verifying sound performance is preserved)
  // =========================================================================
  {
    id: "MID_8M_EXCHANGE_RATE",
    tariff: 8,
    category: "MIDDLE_BAND",
    isEvaluative: true,
    question: "Discuss whether a depreciating exchange rate will always improve a country's current account balance. [8]",
    essayText: `An exchange rate is the price of one currency in terms of another currency. A depreciation occurs when the value of a currency falls under a floating exchange rate system due to market forces of demand and supply. The current account of the balance of payments records trade in goods, trade in services, primary income, and secondary transfers.

When a currency depreciates, domestic exports become cheaper when converted into foreign currencies, which leads to an expansion in foreign demand for exports and increases total export revenue, assuming demand is price elastic. Simultaneously, foreign imports become more expensive in terms of the domestic currency, which encourages domestic households and firms to switch expenditure away from foreign imports towards locally produced import substitutes. Consequently, the volume of imports contracts, reducing total import spending and improving the trade balance.

However, a currency depreciation might not always improve the current account balance. In the short run, the Marshall-Lerner condition may not be satisfied if the sum of price elasticities of demand for exports and imports is less than one (|PEDx + PEDm| < 1). This is especially true for countries that depend on imports of essential raw materials, crude oil, and specialized capital equipment, where demand is price inelastic. In such cases, total import expenditure will initially rise before consumers and firms can adjust, causing the current account deficit to deteriorate before it improves—a phenomenon known as the J-curve effect. Furthermore, higher import prices may generate cost-push inflation domestically, eroding export price competitiveness over time.

In conclusion, while a depreciating exchange rate usually improves the current account balance in the long run, its success is not guaranteed because it depends crucially on trade price elasticities, the absence of retaliatory foreign tariffs, and domestic spare capacity.`,
    split: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 },
    mockRawGrading: {
      total_mark: 6,
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of exchange rate and current account." },
        analysis: { awarded: 3, out_of: 4, comment: "Sound analytical links connecting price changes to export and import demand." },
        evaluation: { awarded: 1, out_of: 2, comment: "Evaluates short-run inelasticity and time lags; conclusion is sound." },
      },
      examiner_summary: "Competent Cambridge Upper Middle Band response.",
      strengths: ["Clear transmission chains.", "Considers price inelasticity of demand."],
      weaknesses: ["Deepen explanation of the Marshall-Lerner condition."],
    },
    expectedMinMarkAllowed: 5,
    expectedMaxMarkAllowed: 7,
    expectedBand: "Upper Middle Band",
    description: "Middle-performing 8m essay with sound analysis and balanced caveats. MUST NOT be penalized (expected 6/8).",
  },
  {
    id: "MID_12M_INFRASTRUCTURE_GROWTH",
    tariff: 12,
    category: "MIDDLE_BAND",
    isEvaluative: true,
    question: "Assess the extent to which an increase in government spending on infrastructure is the most effective way to stimulate economic growth. [12]",
    essayText: `Government spending (G) is a major autonomous component of aggregate demand (AD), which consists of C + I + G + (X - M). Economic growth refers to an increase in a country's productive potential and real gross domestic product (GDP) over time, which can be categorized into short-run actual growth and long-run potential growth.

Infrastructure spending by the government on major capital projects—such as high-speed rail networks, modern container ports, telecommunications, and highway expansion—can stimulate economic growth through both demand-side and supply-side channels. In the short run, the initial capital expenditure acts as an injection into the circular flow of income, directly increasing aggregate demand from AD1 to AD2. Through the Keynesian multiplier effect, this initial expenditure creates employment for construction workers, engineers, and suppliers, who subsequently spend their wages in the wider economy, generating secondary rounds of consumption and driving actual real output growth.

In the long run, completed infrastructure projects enhance the productive capacity and efficiency of the entire economy. Modern transport networks reduce freight times, lower business logistics costs, and improve geographical labour mobility. These supply-side improvements lower average costs of production across industrial sectors, shifting the Long-Run Aggregate Supply (LRAS) curve outward to the right. This allows the economy to achieve higher sustainable real GDP growth without triggering demand-pull inflationary pressures.

However, infrastructure expenditure may not be the most effective way to stimulate growth under all macroeconomic conditions. Firstly, infrastructure projects suffer from substantial implementation time lags; planning approvals, environmental assessments, and construction often take years or even decades, meaning they cannot quickly alleviate a short-term recession. Secondly, financing large-scale capital projects requires substantial government borrowing, which can expand the fiscal deficit, increase national debt-to-GDP ratios, and cause financial crowding out of private sector investment by driving up market bond yields. 

Furthermore, alternative policy measures may prove significantly more effective depending on the economic context. For example, in a deep demand-deficient downturn, expansionary monetary policy (cutting central bank interest rates or quantitative easing) or immediate reductions in direct taxes can stimulate household consumption and business investment far more rapidly than long-term infrastructure construction.

In conclusion, while infrastructure expenditure is exceptionally effective in driving long-run supply-side productive capacity and potential growth, it is not the most effective tool for counteracting short-term cyclical downturns due to protracted time lags. Therefore, an optimal strategy requires pairing rapid short-term monetary easing with targeted long-term infrastructure investment.`,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
    mockRawGrading: {
      total_mark: 8,
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of government spending and economic growth." },
        analysis: { awarded: 4, out_of: 6, comment: "Sound causal transmission explaining AD multiplier and LRAS capacity expansion." },
        evaluation: { awarded: 2, out_of: 4, comment: "Balanced evaluation weighing time lags, crowding out, and alternative short-run policies." },
      },
      examiner_summary: "Sound Upper Middle Band essay addressing both short-run and long-run aspects.",
      strengths: ["Distinguishes AD short-run impact from LRAS long-run growth.", "Relevant policy comparison."],
      weaknesses: ["Provide specific real-world project context to reach Top Band."],
    },
    expectedMinMarkAllowed: 7,
    expectedMaxMarkAllowed: 9,
    expectedBand: "Upper Middle Band",
    description: "Middle-performing 12m essay with dual-shift analysis and balanced trade-offs. MUST NOT be penalized (expected 8/12).",
  },
  {
    id: "MID_20M_RECESSION_POLICIES",
    tariff: 20,
    category: "MIDDLE_BAND",
    isEvaluative: true,
    question: "Evaluate whether expansionary fiscal policy or expansionary monetary policy is more effective in lifting an economy out of a severe recession. [20]",
    essayText: `A recession is formally defined as two or more consecutive quarters of negative real gross domestic product (GDP) growth, characterized by declining aggregate demand, rising cyclical unemployment, and falling business confidence. To lift an economy out of a downturn, governments and central banks can deploy expansionary macroeconomic policies.

Expansionary fiscal policy involves discretionary increases in government expenditure (G) and reductions in direct or indirect taxation (T). When the government undertakes direct capital spending or raises public sector wages, it injects spending directly into the circular flow of income. This shifts aggregate demand outward from AD1 to AD2. Through the Keynesian multiplier mechanism (k = 1 / (1 - MPC)), each dollar of government expenditure generates successive rounds of consumer spending, raising real output and reducing unemployment. Furthermore, reducing income tax increases disposable household income, boosting consumer spending (C), while cutting corporate taxation enhances retained profits, stimulating business capital investment (I).

Conversely, expansionary monetary policy operates through the central bank manipulating the cost and availability of money. By cutting the base interest rate, the central bank lowers borrowing costs across commercial retail banks. This reduces the servicing costs on existing variable-rate mortgages, expanding discretionary household income. Furthermore, lower interest rates reduce the hurdle rate of return on capital investments, encouraging private firms to undertake investment projects. Lower interest rates also typically cause a depreciation of the exchange rate as international financial capital flows outward seeking higher yields, which boosts net exports (X - M).

However, in a severe recession, monetary policy often confronts major structural limitations. Firstly, when interest rates approach the zero lower bound (ZLB), monetary policy can become trapped in a Keynesian liquidity trap, where further reductions in interest rates or quantitative easing fail to stimulate borrowing because commercial banks become excessively risk-averse and hoard reserves. Secondly, during a severe crisis, business and consumer pessimism is so entrenched that even zero interest rates fail to stimulate borrowing—a phenomenon described by Keynes as 'pushing on a string'.

On the other hand, fiscal policy also possesses significant limitations. Large-scale fiscal spending projects incur substantial administrative and legislative time lags, meaning stimulus may only take effect after the economy has already begun self-correcting, potentially causing pro-cyclical overheating. Moreover, extensive government borrowing expands the national debt, which may prompt credit rating downgrades or cause crowding out, where government bond issuance drives up long-term interest rates and displaces private sector capital investment.

In conclusion, in a severe recession, expansionary fiscal policy is markedly more effective than monetary policy. Because direct government expenditure injects demand independently of private sector confidence, it can bypass the liquidity trap that paralyzes monetary policy. Nonetheless, fiscal policy is most effective when supported by accommodating monetary policy that keeps interest rates low, preventing crowding out and ensuring debt sustainability.`,
    split: { ao1_marks: 4, ao2_marks: 10, ao3_marks: 6 },
    mockRawGrading: {
      total_mark: 13,
      band: "Upper Middle Band",
      ao_breakdown: {
        knowledge: { awarded: 3, out_of: 4, comment: "Clear definitions of recession and policy instruments." },
        analysis: { awarded: 7, out_of: 10, comment: "Sound step-by-step transmission mechanisms for both fiscal and monetary channels." },
        evaluation: { awarded: 3, out_of: 6, comment: "Identifies liquidity trap and fiscal time lags, reaching a comparative conclusion." },
      },
      examiner_summary: "Competent Upper Middle Band response with balanced multi-policy coverage.",
      strengths: ["Contrasts direct fiscal injection with interest rate channel.", "Explains liquidity trap."],
      weaknesses: ["Incorporate specific historical examples (e.g. 2008 GFC or 2020 pandemic) to reach Top Band."],
    },
    expectedMinMarkAllowed: 12,
    expectedMaxMarkAllowed: 15,
    expectedBand: "Upper Middle Band",
    description: "Solid 20m essay with sound analysis and liquidity trap evaluation. MUST NOT be penalized (expected 13/20).",
  },

  // =========================================================================
  // 3. TOP BAND ESSAYS (Verifying top marks and 8/8, 12/12, 20/20 are retained)
  // =========================================================================
  {
    id: "TOP_8M_XED_FACTORS_USEFULNESS",
    tariff: 8,
    category: "TOP_BAND",
    isEvaluative: true,
    question: "Discuss the factors that affect the cross elasticity of demand and consider the usefulness of this concept to firms. [8]",
    essayText: `Cross elasticity of demand (XED) measures the responsiveness of the quantity demanded of Good A to a change in the price of Good B (%ΔQd of A / %ΔP of B). When goods are substitutes, XED is positive (XED > 0), meaning an increase in the price of one good leads to higher demand for the alternative. For complementary goods, XED is negative (XED < 0).

The magnitude of XED depends primarily on three factors. First, the closeness of substitutes determines consumer responsiveness; very close substitutes exhibit high cross elasticity because consumers easily switch if prices vary (for example, Netflix and Amazon Prime). Second, brand loyalty and switching costs reduce responsiveness; strong brand allegiance shields a firm from rival price changes. Third, the time period under consideration affects elasticity, as consumers require time to identify alternative suppliers and alter purchasing habits. The attached diagram illustrates a positive relationship between the price of Good B and the quantity demanded of Good A for close substitutes.

In assessing the usefulness of XED for firms, knowledge of cross elasticity is valuable when devising competitive pricing strategies. If a firm operates in a market with high positive XED, raising prices without competitor alignment risks severe demand loss. In addition, XED informs merger and acquisition due diligence by revealing market concentration and substitution risk under competition law.

However, the usefulness of XED is subject to significant practical constraints. Primarily, XED calculations rely on exogenous competitor data and historical market surveys, which suffer from temporal invalidity during economic volatility. Furthermore, price elasticity of demand (PED) may be more directly actionable for short-term revenue management because own-price adjustments are entirely within the firm's administrative control. In conclusion, while XED is a crucial diagnostic indicator for strategic market positioning, firms must synthesize it with PED and broader qualitative insights rather than relying solely upon static cross-elasticity figures.`,
    split: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 },
    mockRawGrading: {
      total_mark: 8,
      band: "Top Band",
      ao_breakdown: {
        knowledge: {
          awarded: 2,
          out_of: 2,
          comment: "The candidate provides a clear and accurate definition of cross elasticity of demand (XED), correctly distinguishing between positive values (substitute goods) and negative values (complementary goods).",
        },
        analysis: {
          awarded: 4,
          out_of: 4,
          comment: "The candidate demonstrates a strong understanding of the three key factors affecting XED: closeness of substitutes, brand loyalty, and time period. Each factor is logically explained with relevant examples (e.g., Netflix vs. Prime for substitutes). The diagram is correctly applied to illustrate XED > 0 for substitutes, reinforcing the analysis. The causal chains are complete and coherent, with no inverted mechanisms or reversed curve shifts.",
        },
        evaluation: {
          awarded: 2,
          out_of: 2,
          comment: "The candidate discusses the usefulness of XED for firms (e.g., pricing strategies, merger due diligence) and its limitations (temporal validity, reliance on exogenous data). The conclusion reaches a reasoned judgement directly addressing the evaluative demand.",
        },
      },
      examiner_summary: "This is a well-structured response that thoroughly addresses the question’s two parts: factors affecting XED and its usefulness to firms. Demonstrates excellent knowledge and analysis.",
      strengths: [
        "Syllabus-accurate definition of XED.",
        "Analysis of the three key factors affecting XED is thorough and logically structured.",
        "Diagram is correctly applied.",
      ],
      weaknesses: [
        "Minor refinement: To elevate evaluation further in extended essays, explicit weighing of short-run versus long-run manipulability can be integrated.",
      ],
    },
    expectedMinMarkAllowed: 7,
    expectedMaxMarkAllowed: 8,
    expectedBand: "Top Band",
    description: "Well-drafted 498-word 8m XED essay containing diagram and 'no inverted mechanisms' praise. MUST SCORE 7-8/8 (Top Band).",
  },
  {
    id: "TOP_8M_SCARCITY_RICH_COUNTRIES",
    tariff: 8,
    category: "TOP_BAND",
    isEvaluative: true,
    question: "Discuss whether scarcity will always exist even in rich countries. [8]",
    essayText: `Scarcity is the fundamental economic problem where finite factors of production (land, labour, capital, and enterprise) are insufficient to satisfy infinite and expanding human wants. Because resources are scarce relative to unlimited desires, economic agents are forced to make choices, and every choice incurs an opportunity cost—defined as the benefit of the next best alternative forgone.

In affluent nations, some observers argue that scarcity has been largely overcome due to high gross domestic product (GDP) per capita, technological advancement, and material abundance. In developed countries like Germany or Japan, supermarket shelves are filled with diverse food products, households possess advanced electronics, and the vast majority of citizens have access to clean running water, sanitation, and basic biological survival necessities, thereby eradicating absolute material deprivation.

However, scarcity will always persist even in the wealthiest economies for two fundamental economic reasons. Firstly, human wants are insatiable and dynamic; as basic physiological needs are satisfied, consumers develop desires for higher-order goods and services, such as cutting-edge personalized healthcare, renewable energy infrastructure, luxury electric vehicles, and higher-quality education. Secondly, critical resources remain strictly finite in supply. For example, in wealthy city-states like Singapore or metropolitan centres like London, land is strictly limited, causing exceptionally high commercial and residential property prices. Furthermore, even affluent governments face finite tax revenues and must confront severe opportunity cost trade-offs, such as choosing whether to fund cancer research, build high-speed rail lines, or subsidize elderly social care.

In conclusion, while high national income effectively eradicates absolute material poverty, scarcity remains an inescapable, universal economic condition because human aspirations expand continuously while the earth's resource endowment remains strictly finite.`,
    split: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 2 },
    mockRawGrading: {
      total_mark: 8,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Precise, textbook definitions of scarcity and opportunity cost." },
        analysis: { awarded: 4, out_of: 4, comment: "Exemplary causal analysis developing expanding wants and finite factors with real-world examples (Singapore land, UK NHS)." },
        evaluation: { awarded: 2, out_of: 2, comment: "Balanced counter-perspective distinguishing absolute poverty from relative scarcity, reaching a fully substantiated conclusion." },
      },
      examiner_summary: "Exemplary Top Band Cambridge 8-mark assessment demonstrating flawless economic reasoning.",
      strengths: ["Precise terminology throughout.", "Excellent distinction between expanding wants and finite resources.", "Substantiated verdict."],
      weaknesses: [],
    },
    expectedMinMarkAllowed: 8,
    expectedMaxMarkAllowed: 8,
    expectedBand: "Top Band",
    description: "Flawless 8-mark evaluative essay. MUST RETAIN 8/8 (Top Band).",
  },
  {
    id: "TOP_12M_PES_AGRICULTURE_VS_MANUFACTURING",
    tariff: 12,
    category: "TOP_BAND",
    isEvaluative: true,
    question: "Explain the factors affecting the price elasticity of supply (PES) and assess whether PES is more significant for manufacturing firms than agricultural firms. [12]",
    essayText: `Price elasticity of supply (PES) measures the responsiveness of the quantity supplied of a good or service to a change in its price. It is calculated mathematically as the percentage change in quantity supplied divided by the percentage change in price (%ΔQs / %ΔP). When PES > 1, supply is price elastic, meaning output responds proportionately more than the change in price; when PES < 1, supply is price inelastic, indicating that producers are relatively unresponsive to price changes.

The PES of any product is fundamentally determined by several microeconomic determinants. The primary factor is the existence of spare productive capacity: if a firm possesses idle machinery and underutilized factory workers, it can rapidly expand output in response to a price increase without incurring escalating marginal costs, rendering supply elastic. A second critical determinant is the level of available stock and inventory: firms holding substantial finished inventories can release products onto the market instantaneously following a price rise. A third determinant is the length of the production period and factor mobility: the easier and quicker capital and labour can be reallocated to production, the more price elastic supply will be.

For agricultural producers, PES is typically highly price inelastic in the short run due to biological production lags. Crops take months to germinate and harvest, while livestock herds require several years to breed and mature. Consequently, farmers cannot instantaneously expand output even if market prices surge dramatically. Furthermore, raw agricultural commodities are perishable, severely restricting long-term warehousing and storage. As a consequence of this short-run inelasticity, any sudden shift in market demand precipitates sharp, volatile fluctuations in equilibrium market price, creating severe revenue and income instability for agricultural communities. For farming enterprises, understanding PES is vital for hedging risk and accessing futures markets.

In contrast, manufacturing firms generally enjoy significantly higher price elasticity of supply. Manufactured goods—such as electronics, textiles, and automotive parts—are produced in controlled factory environments where production lines can quickly be accelerated by introducing overtime shifts or bringing standby machinery online. Additionally, manufactured goods are durable and non-perishable, allowing firms to build up buffer stocks that can be liquidated during price spikes. While specialized high-tech manufacturing relying on scarce skilled engineering labour or rare earth minerals can experience temporary bottlenecks, industrial supply remains fundamentally more flexible than agriculture.

In conclusion, PES is economically significant for both sectors, but it is of paramount importance for agricultural firms. Because agricultural supply is inherently constrained by biological production horizons and perishability, low PES exposes primary producers to extreme market volatility and severe income insecurity compared to manufacturing firms.`,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
    mockRawGrading: {
      total_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Thorough definitions and PES mathematical formula." },
        analysis: { awarded: 6, out_of: 6, comment: "Exemplary causal chains linking biological lags, perishability, spare capacity, and factor mobility." },
        evaluation: { awarded: 4, out_of: 4, comment: "Substantiated comparative evaluation contrasting revenue volatility and income stability between sectors." },
      },
      examiner_summary: "Outstanding Cambridge performance demonstrating deep understanding and rigorous comparative evaluation.",
      strengths: ["Precise formulas and definitions.", "Detailed sector comparison.", "Decisive, criteria-based concluding verdict."],
      weaknesses: [],
    },
    expectedMinMarkAllowed: 11,
    expectedMaxMarkAllowed: 12,
    expectedBand: "Top Band",
    description: "Flawless 12-mark evaluative essay. MUST RETAIN 11-12/12 (Top Band).",
  },
  {
    id: "TOP_20M_PROTECTIONISM_DEVELOPING",
    tariff: 20,
    category: "TOP_BAND",
    isEvaluative: true,
    question: "Evaluate whether protectionist policies are always beneficial for developing economies. [20]",
    essayText: `Protectionism refers to government policies that restrict international trade to shield domestic industries from foreign competition. Common policy instruments include ad valorem tariffs, import quotas, production subsidies, and non-tariff administrative barriers. In the context of developing nations, trade intervention is frequently advocated as a necessary catalyst for structural transformation and industrialization.

The core theoretical argument supporting protectionism in developing economies is the infant industry hypothesis. Emerging domestic industries in developing nations initially lack the output scale to achieve minimum efficient scale (MES) along their long-run average cost (LRAC) curves, leaving them vulnerable to predatory pricing by established multinational corporations from advanced economies. By imposing tariffs on imported manufactured goods, the domestic market price of imports rises, allowing domestic nascent firms to capture domestic market share and expand production. Through cumulative learning-by-doing, firms upgrade technological capability, train domestic labour, and achieve internal economies of scale, eventually becoming dynamically competitive internationally. Furthermore, diversifying the economy away from volatile primary commodity exports mitigates vulnerability to the Prebisch-Singer hypothesis and helps alleviate persistent structural current account deficits.

In addition to nurturing infant manufacturing, protectionism can be justified as a defence against predatory dumping and unfair foreign state subsidies. When foreign firms export goods below their marginal cost of production, unshielded developing industries can be permanently eliminated, leading to severe structural unemployment and de-industrialization. Furthermore, for low-income countries with weak internal revenue services, tariffs on imports represent an easily administrable and essential source of government tax revenue required to finance basic public health and education.

However, protectionist policies impose substantial microeconomic and macroeconomic costs, demonstrating that they are rarely 'always beneficial'. Firstly, tariffs generate severe deadweight welfare losses. By raising prices above the world price, consumer surplus is eroded, forcing domestic households—especially low-income families—to pay inflated prices for basic goods. Secondly, shielding domestic enterprises from competitive global discipline often breeds X-inefficiency, technological complacency, and rent-seeking behaviour, where firms lobby politicians for perpetual trade barriers rather than innovating to lower costs. Thirdly, import protection risks retaliatory tariffs from trading partners, which can trigger damaging trade conflicts and decimate developing nations' primary export sectors.

Furthermore, protectionism can distort domestic resource allocation by artificially pulling scarce labour and capital into uncompetitive sectors where the country lacks comparative advantage. When tariffs are placed on intermediate capital goods, domestic export industries experience escalating production costs, compromising their global competitiveness. Historical experience highlights that countries pursuing inward-looking import substitution industrialization (such as Latin America in the 1970s) frequently experienced macroeconomic stagnation, high inflation, and fiscal crises, whereas East Asian economies that used temporary targeted protection paired with outward export discipline achieved rapid, sustained growth.

In conclusion, protectionist policies are by no means universally beneficial for developing economies. While temporary, strictly targeted tariffs and subsidies can successfully nurture strategic infant industries possessing genuine dynamic comparative advantage, perpetual blanket protectionism inevitably leads to allocative inefficiency, deadweight loss, and corruption. Ultimately, protectionism is only beneficial when implemented with enforceable sunset clauses, tied to competitive export performance benchmarks, and complemented by heavy domestic investment in transport infrastructure, education, and institutional governance.`,
    split: { ao1_marks: 4, ao2_marks: 10, ao3_marks: 6 },
    mockRawGrading: {
      total_mark: 19,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 4, out_of: 4, comment: "Authoritative Cambridge definitions of protectionist instruments and infant industry theory." },
        analysis: { awarded: 9, out_of: 10, comment: "Exemplary causal chains incorporating MES, dynamic efficiency, deadweight loss, and diversification." },
        evaluation: { awarded: 6, out_of: 6, comment: "Sophisticated synoptic evaluation weighing X-inefficiency, retaliation risk, and decisive sunset clause criteria." },
      },
      examiner_summary: "Exceptional Cambridge Paper 4 script demonstrating advanced economics knowledge and rigorous synoptic evaluation.",
      strengths: ["Advanced concepts (MES, X-inefficiency, dynamic efficiency).", "Nuanced weighing of short-run vs long-run trade-offs.", "Concrete sunset clause criterion."],
      weaknesses: [],
    },
    expectedMinMarkAllowed: 16,
    expectedMaxMarkAllowed: 20,
    expectedBand: "Top Band",
    description: "Flawless 20-mark extended essay. MUST RETAIN 16-20/20 (Top Band).",
  },
  {
    id: "TOP_8M_NON_EVALUATIVE_PPC",
    tariff: 8,
    category: "TOP_BAND",
    isEvaluative: false,
    question: "Explain how a production possibility curve (PPC) can be used to demonstrate scarcity, choice, and opportunity cost. [8]",
    essayText: `A Production Possibility Curve (PPC) illustrates the maximum potential output combinations of two goods or services that an economy can achieve when all available factors of production are fully and efficiently employed, assuming a fixed state of technology.

Scarcity is illustrated by the boundary frontier of the PPC itself. All points lying on the curve (such as points A and B) represent productively efficient combinations of output achievable with current resources. Conversely, any output combination lying beyond the frontier is completely unobtainable given the current endowment of scarce factors of production, visually demonstrating that finite resources cannot satisfy unlimited desires.

Choice is demonstrated by the necessity of economic agents to choose a single specific point along the PPC boundary. Because an economy cannot produce every desired combination of capital goods and consumer goods simultaneously, society must allocate its finite resources between competing uses, deciding the exact composition of current consumption versus future productive investment.

Opportunity cost is demonstrated by the negative downward slope and concave shape of the PPC frontier. Because resources are finite, increasing the production of consumer goods from point A to point B necessitates reallocating labour and capital away from capital goods, meaning the forgone quantity of capital goods represents the opportunity cost. Furthermore, the bowed-out concave shape reflects the law of increasing opportunity costs due to imperfect factor mobility.`,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 },
    mockRawGrading: {
      total_mark: 8,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Precise syllabus definition of PPC and its core assumptions." },
        analysis: { awarded: 6, out_of: 6, comment: "Step-by-step analytical reasoning connecting unobtainable points to scarcity, curve positions to choice, and trade-offs to opportunity cost." },
        evaluation: { awarded: 0, out_of: 0, comment: "Evaluation is not required for this question. No marks are lost for its omission." },
      },
      examiner_summary: "Complete and precise Cambridge explanatory response demonstrating thorough understanding of the basic economic problem on a PPC.",
      strengths: ["Addresses all three concepts systematically.", "Precise PPC definitions."],
      weaknesses: [],
    },
    expectedMinMarkAllowed: 8,
    expectedMaxMarkAllowed: 8,
    expectedBand: "Top Band",
    description: "Top-band non-evaluative 8m essay (AO3 = 0). MUST RETAIN 8/8 (Top Band, AO3 = 0).",
  },
];

async function runCalibrationSuite() {
  console.log("=".repeat(85));
  console.log("CAMBRIDGE 9708 COMPREHENSIVE ESSAY CALIBRATION SUITE");
  console.log("Testing Low Band, Middle Band, and Top Band Essays Across All Tariffs (8m, 12m, 20m)");
  console.log("=".repeat(85));

  let passed = 0;
  let failed = 0;
  const resultsTable: Array<{
    id: string;
    category: string;
    tariff: string;
    awardedTotal: string;
    band: string;
    aoBreakdown: string;
    status: string;
    notes: string;
  }> = [];

  for (const sc of SCENARIOS) {
    const quality = analyzeEssayQuality(sc.essayText, sc.tariff, sc.split);
    const normalized = normaliseGrading(sc.mockRawGrading, sc.tariff, sc.split, sc.essayText);
    const finalGrading = applyWritingQualityGuardrail(normalized, quality, sc.tariff, sc.split, sc.essayText);

    const mark = finalGrading.total_mark;
    const isWithinExpectedRange = mark >= sc.expectedMinMarkAllowed && mark <= sc.expectedMaxMarkAllowed;
    const bandMatches = sc.expectedBand.toLowerCase().includes(finalGrading.band.toLowerCase());

    const isSuccess = isWithinExpectedRange && bandMatches;
    if (isSuccess) {
      passed++;
    } else {
      failed++;
    }

    const aoStr = `AO1=${finalGrading.ao_breakdown.knowledge.awarded}/${sc.split.ao1_marks}, AO2=${finalGrading.ao_breakdown.analysis.awarded}/${sc.split.ao2_marks}, AO3=${finalGrading.ao_breakdown.evaluation.awarded}/${sc.split.ao3_marks}`;

    resultsTable.push({
      id: sc.id,
      category: sc.category,
      tariff: `${sc.tariff}m ${sc.isEvaluative ? "Eval" : "Non-Eval"}`,
      awardedTotal: `${mark}/${sc.tariff} (Expected: ${sc.expectedMinMarkAllowed}-${sc.expectedMaxMarkAllowed})`,
      band: finalGrading.band,
      aoBreakdown: aoStr,
      status: isSuccess ? "PASSED" : "FAILED",
      notes: sc.description,
    });
  }

  console.log("\n" + "-".repeat(85));
  console.log("RESULTS MATRIX:");
  console.log("-".repeat(85));
  for (const r of resultsTable) {
    console.log(`[${r.status}] ${r.id.padEnd(35)} | ${r.tariff.padEnd(12)} | Score: ${r.awardedTotal.padEnd(20)} | Band: ${r.band}`);
    console.log(`       Breakdown: ${r.aoBreakdown}`);
    console.log(`       Target: ${r.notes}\n`);
  }

  console.log("=".repeat(85));
  console.log(`CALIBRATION SUMMARY: ${passed}/${SCENARIOS.length} Scenarios Passed (${failed} Failures)`);
  console.log("=".repeat(85));

  if (failed > 0) {
    process.exit(1);
  }
}

runCalibrationSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
