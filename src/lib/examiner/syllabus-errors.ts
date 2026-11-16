/**
 * Cambridge International AS & A Level Economics (9708)
 * Authoritative Syllabus Misconceptions & Error Penalisation Catalog.
 *
 * Covers all required Microeconomics and Macroeconomics error categories:
 * - Section 1: Microeconomics (AS & A Level)
 *   1.1 Price Mechanism & Elasticity (Shift vs Movement, PED vs PES, YED vs XED, Price Controls, Surplus)
 *   1.2 Market Failure & Theory of the Firm (Public vs Merit, Social vs External, Efficiency, Scale, Profit)
 * - Section 2: Macroeconomics (AS & A Level)
 *   2.1 Inflation, Deflation & Growth (Deflation vs Disinflation, Growth vs Development, Real vs Nominal, Productivity vs Production)
 *   2.2 Fiscal, Monetary & Supply-Side Policy (Budget vs Current Account, Central Bank vs Government, QE, Supply-Side Time Lags)
 *   2.3 International Trade & Exchange Rates (Depreciation vs Devaluation, Depreciation on Current Account, Comparative vs Absolute, Tariffs vs Quotas)
 */

export type SyllabusEconomicsError = {
  id: string;
  section: string;
  topic: string;
  studentError: string;
  correction: string;
  pattern: RegExp;
  flagWord: string;
  aoTarget: "ao1" | "ao2";
  aoImpact: string;
};

export const SYLLABUS_ECONOMICS_ERRORS: SyllabusEconomicsError[] = [
  // =========================================================================
  // SECTION 1: MICROECONOMICS (AS & A LEVEL)
  // 1.1 Price Mechanism & Elasticity
  // =========================================================================
  {
    id: "movement_along_vs_shift",
    section: "SECTION 1.1: Price Mechanism & Elasticity",
    topic: "Movement Along vs. Shift of Curves",
    studentError: 'Claiming that "an increase/fall in price causes demand or supply to shift left or right".',
    correction:
      "A change in the good's own price causes a movement along the curve (extension or contraction in quantity demanded/supplied). Only non-price determinants (e.g., consumer income, tastes/preferences, costs of production, indirect taxes, technology) shift the entire curve.",
    pattern:
      /(?<!not\s+|never\s+|doesn't\s+|does\s+not\s+|cannot\s+)(?:(?:an?\s+)?(?:increase|rise|fall|decrease|reduction|change)\s+in\s+(?:the\s+good'?s?\s+own\s+)?price|(?:higher|lower|rising|falling)\s+prices?)\s+(?:causes?|leads\s+to|results\s+in|shifts?|makes)\s+(?:the\s+)?(?:demand|supply)(?:\s+curve)?\s+(?:to\s+)?shift\s+(?:to\s+the\s+)?(?:left|right|inward|outward|upwards?|downwards?)/i,
    flagWord: "price causes demand/supply to shift",
    aoTarget: "ao2",
    aoImpact: "Deduct 1 mark in AO2 Analysis for theoretical mechanism error (confusing shifts with movements along curves).",
  },
  {
    id: "ped_vs_pes_confusion",
    section: "SECTION 1.1: Price Mechanism & Elasticity",
    topic: "PED vs. PES Confusion",
    studentError:
      'Explaining Price Elasticity of Supply (PES) using consumer factors (brand loyalty, advertising, consumer substitutes, "normal good") OR applying the PED Total Revenue rule (claiming price rise causes total revenue to fall when supply is elastic) to PES.',
    correction:
      "PES is strictly governed by producer constraints (spare capacity, stock levels, production time lags, factor mobility). Furthermore, along a standard upward-sloping supply curve, price and quantity supplied move in the same direction, so a price increase raises producer revenue (P × Q) regardless of whether PES is elastic or inelastic.",
    pattern:
      /(?:\b(?:pes|price\s+elasticity\s+of\s+supply)\s+(?:is\s+determined\s+by|depends\s+on|is\s+governed\s+by|is\s+influenced\s+by)\s+[^.]*?\b(brand\s+loyalty|advertising|consumer\s+tastes|normal\s+good|consumer\s+substitutes)\b|\b(?:when|if)\s+(?:pes|supply)\s+is\s+elastic,?\s+[^.]*?\b(?:rise|increase)\s+in\s+price\s+(?:leads\s+to|causes|results\s+in)\s+(?:total\s+)?revenue\s+(?:to\s+)?(?:fall|decrease|drop)\b|\b(?:when|if)\s+(?:pes|supply)\s+is\s+inelastic,?\s+[^.]*?\b(?:fall|decrease)\s+in\s+price\s+(?:leads\s+to|causes|results\s+in)\s+(?:total\s+)?revenue\s+(?:to\s+)?(?:rise|increase)\b)/i,
    flagWord: "PES confused with PED factors or revenue rule",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge / AO2 Analysis for confusing consumer demand elasticity with producer supply elasticity.",
  },
  {
    id: "yed_vs_xed_sign_confusion",
    section: "SECTION 1.1: Price Mechanism & Elasticity",
    topic: "YED (Income) vs. XED (Cross) Sign Confusion",
    studentError:
      'Calling a good with a negative XED an "inferior good", or calling a good with a negative YED a "complement".',
    correction:
      "YED measures income responsiveness (less than 0 = inferior good, greater than 0 = normal good). XED measures cross-price responsiveness (less than 0 = complementary good, greater than 0 = substitute good).",
    pattern:
      /(?:\b(?:negative\s+xed|xed\s*(?:is\s*)?<\s*0|xed\s+is\s+negative)\b[^.]*?\b(inferior(?:\s+goods?)?|normal(?:\s+goods?)?)\b|\b(?:negative\s+yed|yed\s*(?:is\s*)?<\s*0|yed\s+is\s+negative)\b[^.]*?\b(complement(?:ary|s)?(?:\s+goods?)?|substitutes?(?:\s+goods?)?)\b|\b(inferior(?:\s+goods?)?|normal(?:\s+goods?)?)\b[^.]*?\b(?:negative\s+xed|xed\s*<\s*0|xed\s+is\s+negative)\b|\b(complement(?:ary|s)?(?:\s+goods?)?|substitutes?(?:\s+goods?)?)\b[^.]*?\b(?:negative\s+yed|yed\s*<\s*0|yed\s+is\s+negative)\b)/i,
    flagWord: "negative XED called inferior good or negative YED called complement",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing income elasticity signs with cross-price elasticity signs.",
  },
  {
    id: "price_controls_maximum_minimum",
    section: "SECTION 1.1: Price Mechanism & Elasticity",
    topic: "Price Controls (Maximum vs. Minimum Price)",
    studentError:
      "Claiming that a maximum price (price ceiling) is set above equilibrium, or that a minimum price (price floor) is set below equilibrium.",
    correction:
      "To be effective, a maximum price (price ceiling) must be set below equilibrium (creating excess demand/shortages). A minimum price (price floor) must be set above equilibrium (creating excess supply/surpluses).",
    pattern:
      /(?<!not\s+|never\s+|doesn't\s+|does\s+not\s+)(?:\b(?:maximum\s+price|price\s+ceiling)\s+(?:is\s+)?(?:set|placed|imposed|fixed|must\s+be(?:\s+set)?)\s+above\s+(?:the\s+)?equilibrium\b|\b(?:minimum\s+price|price\s+floor)\s+(?:is\s+)?(?:set|placed|imposed|fixed|must\s+be(?:\s+set)?)\s+below\s+(?:the\s+)?equilibrium\b)/i,
    flagWord: "maximum price above equilibrium or minimum price below equilibrium",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge / AO2 Analysis for inverting statutory price control positions relative to market equilibrium.",
  },
  {
    id: "consumer_vs_producer_surplus",
    section: "SECTION 1.1: Price Mechanism & Elasticity",
    topic: "Consumer vs. Producer Surplus",
    studentError:
      'Defining consumer surplus as "the extra money/profit consumers save" or confusing the geometric areas on a supply-demand diagram.',
    correction:
      "Consumer surplus is the difference between the maximum price consumers are willing and able to pay and the market price actually paid (the geometric area below the demand curve and above the equilibrium price). Producer surplus is the difference between the market price received and the minimum price firms are willing to accept (the area above the supply curve and below the equilibrium price).",
    pattern:
      /(?:\bconsumer\s+surplus\s+(?:is|means)\s+(?:the\s+)?(?:extra\s+)?(?:money|profit|cash|savings)\s+(?:that\s+)?consumers?\s+(?:save|make|earn|receive)\b|\bconsumer\s+surplus\s+(?:is|is\s+the\s+area)\s+(?:above\s+(?:the\s+)?demand|below\s+(?:the\s+)?supply)\b|\bproducer\s+surplus\s+(?:is|is\s+the\s+area)\s+(?:below\s+(?:the\s+)?demand|above\s+(?:the\s+)?price\s+and\s+below\s+demand)\b)/i,
    flagWord: "consumer surplus defined as extra money/profit saved or incorrect diagram area",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for misdefining consumer surplus or inverting surplus diagram areas.",
  },

  // =========================================================================
  // SECTION 1.2: Market Failure & A-Level Theory of the Firm
  // =========================================================================
  {
    id: "public_goods_vs_merit_goods",
    section: "SECTION 1.2: Market Failure & Theory of the Firm",
    topic: "Public Goods vs. Merit Goods",
    studentError: 'Calling healthcare, education, or public transport "public goods".',
    correction:
      "Healthcare, education, and public transport are merit goods (excludable and rivalrous, under-consumed in a free market due to positive externalities and information failure). Pure public goods (e.g., street lighting, national defense, lighthouses) must be strictly non-excludable and non-rivalrous, leading to the free-rider problem.",
    pattern:
      /(?<!not\s+|never\s+|doesn't\s+|isn't\s+a\s+|aren't\s+)(?:\b(healthcare|education|schools?|hospitals?|public\s+transport|buses|trains)\s+(?:is|are)\s+(?:an?\s+)?(?:pure\s+)?public\s+goods?\b|\bpublic\s+goods?\s+(?:such\s+as|like|for\s+example|including)\s+(?:healthcare|education|schools?|hospitals?|public\s+transport)\b)/i,
    flagWord: "healthcare/education/transport called public goods",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing rival/excludable merit goods with non-rival/non-excludable public goods.",
  },
  {
    id: "social_vs_external_cost_benefit",
    section: "SECTION 1.2: Market Failure & Theory of the Firm",
    topic: "Social Cost/Benefit vs. External Cost/Benefit",
    studentError: 'Writing "Social Cost = External Cost" or omitting private costs/benefits.',
    correction:
      "Social Cost (MSC) = Private Cost (MPC) + External Cost (MEC). Social Benefit (MSB) = Private Benefit (MPB) + External Benefit (MEB). Externalities represent the third-party spillover divergence between private and social costs/benefits.",
    pattern:
      /(?:\bsocial\s+costs?\s*(?:=|is\s+equal\s+to|is\s+the\s+same\s+as|equals?)\s*(?:the\s+)?external\s+costs?\b|\bsocial\s+benefits?\s*(?:=|is\s+equal\s+to|is\s+the\s+same\s+as|equals?)\s*(?:the\s+)?external\s+benefits?\b|\bmsc\s*=\s*mec\b|\bmsb\s*=\s*meb\b)/i,
    flagWord: "Social Cost equated to External Cost (omitting private costs)",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing total social costs/benefits with external third-party spillover costs/benefits.",
  },
  {
    id: "productive_vs_allocative_efficiency",
    section: "SECTION 1.2: Market Failure & Theory of the Firm",
    topic: "Productive vs. Allocative Efficiency",
    studentError:
      "Saying a firm is allocatively efficient because it minimizes average costs, or productively efficient because P = MC.",
    correction:
      "Productive efficiency occurs when production takes place at the lowest possible average cost (MC = AC, the minimum point of the LRAC curve, or any point along the PPC). Allocative efficiency occurs when resources are allocated to match consumer preferences (P = MC, or MSB = MSC).",
    pattern:
      /(?:\ballocative(?:ly)?\s+efficien(?:t|cy)\s+[^.]*?\b(?:minimizes?|minimises?|lowest)\s+(?:average\s+costs?|ac|atc)\b|\ballocative(?:ly)?\s+efficien(?:t|cy)\s+[^.]*?\b(?:mc\s*=\s*ac|mc\s*=\s*atc)\b|\bproductive(?:ly)?\s+efficien(?:t|cy)\s+[^.]*?\b(?:p\s*=\s*mc|price\s*=\s*marginal\s+cost|price\s+equals\s+marginal\s+cost)\b)/i,
    flagWord: "allocative efficiency confused with productive efficiency criteria",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge / AO2 Analysis for inverting the definitions and conditions of allocative and productive efficiency.",
  },
  {
    id: "economies_of_scale_vs_returns_to_scale",
    section: "SECTION 1.2: Market Failure & Theory of the Firm",
    topic: "Economies of Scale vs. Increasing Returns to Scale",
    studentError: "Treating economies of scale and increasing returns to scale as identical concepts.",
    correction:
      "Increasing returns to scale is a purely physical/technical relationship (doubling all inputs more than doubles physical output). Economies of scale is a financial/cost concept (falling long-run average cost as output expands, which encompasses bulk-buying, managerial, financial, and marketing economies in addition to technical returns).",
    pattern:
      /(?:\beconomies\s+of\s+scale\s+(?:is\s+the\s+same\s+as|is\s+identical\s+to|means|is\s+when)\s+(?:increasing\s+)?returns\s+to\s+scale\b|\bincreasing\s+returns\s+to\s+scale\s+(?:means|is\s+when)\s+(?:long[- ]run\s+)?average\s+costs?\s+fall\b|\beconomies\s+of\s+scale\s+is\s+when\s+doubling\s+inputs\s+(?:more\s+than\s+doubles|doubles)\s+(?:physical\s+)?output\b)/i,
    flagWord: "economies of scale equated to increasing returns to scale",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for conflating technical returns to scale with financial long-run cost economies.",
  },
  {
    id: "normal_vs_supernormal_profit",
    section: "SECTION 1.2: Market Failure & Theory of the Firm",
    topic: "Normal Profit vs. Supernormal Profit",
    studentError:
      'Thinking "normal profit" means zero accounting profit or average profit, or claiming firms shut down when making zero economic profit.',
    correction:
      "Normal profit (TR = TC, where TC includes implicit opportunity costs of capital and entrepreneurship) is the minimum return required to keep factors of production in their current use. A firm earning zero economic profit is making normal profit and will remain in the industry in the long run.",
    pattern:
      /(?:\bnormal\s+profit\s+(?:means|is)\s+(?:zero\s+accounting\s+profit|making\s+no\s+money|average\s+profit)\b|\b(?:firms?|businesses?)\s+(?:will\s+)?shut\s+down\s+(?:when|if)\s+(?:making|earning)\s+(?:zero\s+economic\s+profit|normal\s+profit)\b|\bzero\s+economic\s+profit\s+means\s+(?:the\s+)?firm\s+(?:shuts\s+down|exits\s+the\s+industry|stops\s+operating)\b)/i,
    flagWord: "normal profit defined as zero accounting profit or firm shutdown",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing zero economic profit (normal profit) with zero accounting profit or shutdown conditions.",
  },

  // =========================================================================
  // SECTION 2: MACROECONOMICS (AS & A LEVEL)
  // 2.1 Inflation, Deflation & Growth
  // =========================================================================
  {
    id: "deflation_vs_disinflation",
    section: "SECTION 2.1: Inflation, Deflation & Growth",
    topic: "Deflation vs. Disinflation",
    studentError: 'Claiming that a fall in the inflation rate (e.g. from 6% to 2%) is "deflation".',
    correction:
      "A fall in the rate of inflation (while still positive) is disinflation (prices are still rising, just at a slower rate). Deflation is a sustained decrease in the general price level (represented by a negative inflation rate, where CPI decreases).",
    pattern:
      /(?<!not\s+|never\s+|doesn't\s+mean\s+)(?:\b(?:a\s+)?(?:fall|drop|decrease|reduction)\s+in\s+(?:the\s+)?(?:rate\s+of\s+inflation|inflation(?:\s+rate)?)\b[^.]*?\b(?:is|means|leads\s+to|results\s+in|called)\s+deflation\b|\bdeflation\s+is\s+when\s+[^.]*?\b(?:rate\s+of\s+inflation|inflation(?:\s+rate)?)\s+(?:falls|drops|decreases|slows\s+down)\b|\binflation\s+(?:falling|fell|drops?|dropped)\s+from\s+\d+%\s+to\s+\d+%\b[^.]*?\bdeflation\b)/i,
    flagWord: "fall in inflation rate labeled deflation",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing disinflation (slower price rise) with deflation (falling price level).",
  },
  {
    id: "growth_vs_development",
    section: "SECTION 2.1: Inflation, Deflation & Growth",
    topic: "Economic Growth vs. Economic Development",
    studentError: "Treating an increase in Real GDP per capita as proof of economic development.",
    correction:
      "Economic growth is a narrow quantitative increase in real national output (Real GDP). Economic development is a broader qualitative improvement in living standards, welfare, healthcare, education, freedom, and poverty reduction (measured via HDI, MPI, etc.). Real GDP growth does not guarantee development if gains are captured by elites or accompanied by severe pollution.",
    pattern:
      /(?:\b(?:an?\s+)?(?:increase|rise|growth)\s+in\s+real\s+gdp(?:\s+per\s+capita)?\s+(?:proves|guarantees|ensures|automatically\s+means|is\s+proof\s+of)\s+economic\s+development\b|\beconomic\s+development\s+is\s+proven\s+by\s+(?:an?\s+)?(?:increase|rise|growth)\s+in\s+real\s+gdp\b)/i,
    flagWord: "Real GDP increase treated as automatic proof of economic development",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge / AO2 Analysis for treating quantitative GDP expansion as identical to multidimensional human development.",
  },
  {
    id: "real_vs_nominal_variables",
    section: "SECTION 2.1: Inflation, Deflation & Growth",
    topic: "Real vs. Nominal Variables",
    studentError: "Conflating nominal GDP, wages, or interest rates with real values.",
    correction:
      "Real economic variables are adjusted for inflation (Real ≈ Nominal minus Inflation), measuring purchasing power and physical volume. Nominal variables are measured at current prices without adjusting for changes in the general price level.",
    pattern:
      /(?:\bnominal\s+(?:gdp|wages?|interest\s+rates?|values?)\s+(?:is|are)\s+adjusted\s+for\s+inflation\b|\bnominal\s+(?:gdp|wages?|interest\s+rates?)\s+measures?\s+real\s+(?:purchasing\s+power|output)\b|\breal\s+(?:gdp|wages?|interest\s+rates?|values?)\s+(?:is|are)\s+measured\s+at\s+current\s+prices\s+without\s+adjusting\b)/i,
    flagWord: "nominal variables confused with inflation-adjusted real values",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for conflating unadjusted nominal figures with inflation-adjusted real purchasing power.",
  },
  {
    id: "productivity_vs_production",
    section: "SECTION 2.1: Inflation, Deflation & Growth",
    topic: "Productivity vs. Production",
    studentError: 'Saying "output increased, so productivity increased" or defining productivity as total production.',
    correction:
      "Production is total physical output produced. Productivity is output per unit of input (e.g., output per worker or per hour worked). Total production can rise simply by employing more factors of production (e.g. hiring more workers) without any increase in productivity.",
    pattern:
      /(?:\b(?:output|production)\s+(?:increased|rose|expanded),?\s+(?:so|meaning\s+that|therefore)\s+productivity\s+(?:increased|rose|grew)\b|\bhigher\s+(?:output|production)\s+means\s+(?:higher|increased)\s+productivity\b|\bproductivity\s+is\s+(?:the\s+)?(?:total\s+output|total\s+amount\s+produced)\b)/i,
    flagWord: "production increase equated to productivity increase",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing total physical production volume with factor productivity efficiency.",
  },

  // =========================================================================
  // SECTION 2.2: Fiscal, Monetary & Supply-Side Policy
  // =========================================================================
  {
    id: "budget_balance_vs_current_account",
    section: "SECTION 2.2: Fiscal, Monetary & Supply-Side Policy",
    topic: "Budget Balance vs. Current Account (Trade) Balance",
    studentError:
      'Saying "the government has a current account surplus, so it can afford to increase government spending" or "a budget deficit means imports exceed exports".',
    correction:
      "The budget balance (fiscal balance) compares government tax revenue (T) with public expenditure (G). The current account balance records international trade in goods and services (X − M), primary income (remittances, profit repatriation), and secondary transfers.",
    pattern:
      /(?:\bcurrent\s+account\s+surplus\s+(?:allows|enables|means|so)\s+(?:the\s+)?government\s+can\s+afford\s+to\s+(?:increase|spend)\b|\bbudget\s+deficit\s+(?:means|is\s+when)\s+imports\s+(?:exceed|are\s+greater\s+than)\s+exports\b|\bbudget\s+surplus\s+(?:means|is\s+when)\s+exports\s+exceed\s+imports\b)/i,
    flagWord: "budget balance confused with current account balance",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing domestic government fiscal balances with external balance of payments current accounts.",
  },
  {
    id: "central_bank_vs_government_policy",
    section: "SECTION 2.2: Fiscal, Monetary & Supply-Side Policy",
    topic: "Central Bank vs. Government Policy Control",
    studentError:
      'Attributing interest rate or money supply changes to "the government", or tax and spending changes to "the central bank".',
    correction:
      "Monetary policy (official interest rates, money supply, quantitative easing) is conducted independently by the Central Bank. Fiscal policy (direct and indirect taxation, government capital and current expenditure) is conducted by the Government / Ministry of Finance.",
    pattern:
      /(?:\bthe\s+government\s+(?:decides|controls|sets?|raises?|lowers?|cuts?)\s+(?:the\s+)?interest\s+rates?\b|\bthe\s+government\s+(?:conducts|implements)\s+monetary\s+policy\b|\b(?:the\s+)?central\s+bank\s+(?:sets?|changes?|imposes?|raises?|cuts?)\s+(?:taxes|taxation|tax\s+rates?|government\s+spending)\b|\b(?:the\s+)?central\s+bank\s+(?:conducts|implements)\s+fiscal\s+policy\b)/i,
    flagWord: "government attributed monetary policy or central bank attributed fiscal policy",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing central bank monetary governance with government fiscal administration.",
  },
  {
    id: "quantitative_easing_mechanics",
    section: "SECTION 2.2: Fiscal, Monetary & Supply-Side Policy",
    topic: "Quantitative Easing (QE) Mechanics",
    studentError: 'Describing Quantitative Easing (QE) simply as "the central bank printing more physical banknotes".',
    correction:
      "QE involves the central bank creating digital/electronic central bank reserves to purchase financial assets (primarily government bonds) from commercial banks and financial institutions. This raises bond prices, depresses long-term bond yields (interest rates), and increases commercial banking liquidity to encourage lending.",
    pattern:
      /(?:\bquantitative\s+easing\s+(?:is|involves)\s+(?:simply\s+)?printing\s+(?:more\s+)?(?:physical\s+)?(?:banknotes?|paper\s+money|cash)\b|\bqe\s+is\s+when\s+the\s+central\s+bank\s+prints\s+(?:more\s+)?(?:physical\s+)?(?:banknotes?|paper\s+money|cash)\b)/i,
    flagWord: "QE described simply as printing physical banknotes",
    aoTarget: "ao2",
    aoImpact: "Deduct 1 mark in AO2 Analysis for failing to explain the electronic asset purchase transmission mechanism of QE.",
  },
  {
    id: "supply_side_policy_time_lags",
    section: "SECTION 2.2: Fiscal, Monetary & Supply-Side Policy",
    topic: "Supply-Side Policy Time Lags",
    studentError:
      "Claiming supply-side policies (e.g. education, retraining, infrastructure) are the best or quickest solution to cure an immediate short-run recession or immediate deflation.",
    correction:
      "Supply-side policies act primarily in the long run to shift LRAS rightward; they suffer from substantial implementation and gestation time lags (often taking years to build infrastructure or upskill human capital) and cannot quickly resolve immediate short-run aggregate demand deficiencies.",
    pattern:
      /(?:\bsupply[- ]side\s+polic(?:y|ies)\s+[^.]*?\b(?:best|ideal|quickest|immediate|fastest)\s+(?:solution|way|cure|method)\s+to\s+(?:cure|fix|solve|recover\s+from)\s+(?:an?\s+)?(?:immediate|short[- ]run)\s+(?:recession|deflation)\b|\bto\s+(?:cure|fix|solve)\s+an?\s+immediate\s+(?:short[- ]run\s+)?recession,?\s+(?:the\s+)?(?:government|economy)\s+should\s+use\s+supply[- ]side\s+policies?\b)/i,
    flagWord: "supply-side policy recommended as immediate fix for short-run recession",
    aoTarget: "ao2",
    aoImpact: "Deduct 1 mark in AO2 Analysis / AO3 Evaluation for ignoring severe implementation time lags of supply-side interventions.",
  },

  // =========================================================================
  // SECTION 2.3: International Trade & Exchange Rates
  // =========================================================================
  {
    id: "depreciation_vs_devaluation",
    section: "SECTION 2.3: International Trade & Exchange Rates",
    topic: "Depreciation/Appreciation vs. Devaluation/Revaluation",
    studentError:
      'Saying a currency "devalued" under a floating exchange rate system, or "depreciated" under a fixed exchange rate system.',
    correction:
      "Depreciation and appreciation are market-driven adjustments resulting from shifts in supply and demand in a floating exchange rate system. Devaluation and revaluation are deliberate, official government or central bank peg adjustments in a fixed (or managed) exchange rate system.",
    pattern:
      /(?:\b(?:currency\s+)?(?:devalued|devaluation|revalued|revaluation)\s+under\s+a\s+floating\s+(?:exchange\s+rate)?\b|\bfloating\s+(?:exchange\s+rate\s+)?(?:system\s+)?(?:leads\s+to|causes)\s+(?:currency\s+)?(?:devaluation|revaluation)\b|\b(?:currency\s+)?(?:depreciated|depreciation|appreciated|appreciation)\s+under\s+a\s+fixed\s+(?:exchange\s+rate)?\b|\bfixed\s+(?:exchange\s+rate\s+)?(?:system\s+)?(?:leads\s+to|causes)\s+(?:currency\s+)?(?:depreciation|appreciation)\b)/i,
    flagWord: "devaluation used for floating exchange rate or depreciation for fixed rate",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for misapplying fixed exchange rate terminology to floating currency markets.",
  },
  {
    id: "currency_depreciation_current_account",
    section: "SECTION 2.3: International Trade & Exchange Rates",
    topic: "Effect of Currency Depreciation on the Current Account",
    studentError:
      "Claiming that because depreciation makes imports more expensive, it automatically worsens the current account deficit.",
    correction:
      "Depreciation makes exports cheaper in foreign currency (increasing export volume) and imports more expensive in domestic currency (reducing import volume). Assuming the Marshall-Lerner condition holds (|PEDx + PEDm| > 1), depreciation improves the current account balance in the long run (though it may temporarily worsen in the short run due to the J-curve effect).",
    pattern:
      /(?:\bdepreciation\s+makes\s+imports\s+more\s+expensive,?\s+(?:so\s+it\s+)?automatically\s+worsens?\s+(?:the\s+)?current\s+account\b|\bcurrency\s+depreciation\s+(?:automatically|always)\s+worsens?\s+(?:the\s+)?current\s+account\s+deficit\b|\bdepreciation\s+worsens?\s+the\s+current\s+account\s+because\s+import\s+prices\s+rise\b)/i,
    flagWord: "currency depreciation claimed to automatically worsen current account",
    aoTarget: "ao2",
    aoImpact: "Deduct 1 mark in AO2 Analysis for ignoring export volume expansion and the Marshall-Lerner condition.",
  },
  {
    id: "comparative_vs_absolute_advantage",
    section: "SECTION 2.3: International Trade & Exchange Rates",
    topic: "Comparative Advantage vs. Absolute Advantage",
    studentError: 'Saying a country should export goods it can produce "cheapest" or "in the largest quantity".',
    correction:
      "International trade is driven by comparative advantage—producing a good at a lower domestic opportunity cost than trading partners, even if another country holds an absolute advantage (can produce more output or at absolute lowest factor cost) across all goods.",
    pattern:
      /(?:\bcountries?\s+should\s+(?:specialize\s+in\s+and\s+)?export\s+(?:the\s+)?goods?\s+(?:they|it)\s+can\s+produce\s+(?:the\s+)?cheapest\b|\bcountries?\s+should\s+export\s+goods?\s+they\s+can\s+produce\s+in\s+the\s+largest\s+quantity\b|\bcomparative\s+advantage\s+(?:means|is)\s+producing\s+(?:a\s+good\s+)?(?:cheaper|cheapest|at\s+the\s+lowest\s+cost|in\s+largest\s+quantity)\b)/i,
    flagWord: "comparative advantage defined as producing cheapest or in largest quantity",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for confusing comparative advantage (lower opportunity cost) with absolute advantage.",
  },
  {
    id: "tariffs_vs_quotas_revenue",
    section: "SECTION 2.3: International Trade & Exchange Rates",
    topic: "Tariffs vs. Quotas (Government Revenue)",
    studentError: "Claiming that import quotas generate tax revenue for the domestic government.",
    correction:
      "Tariffs are customs duties that generate tax revenue for the domestic government. Quotas are quantitative physical limits that generate quota rents (windfall profits) that typically accrue to foreign exporters or domestic license holders, NOT government tax revenue (unless import licenses are auctioned).",
    pattern:
      /(?:\b(?:import\s+)?quotas?\s+(?:generate|generates|provide|provides|raise|raises|yields?)\s+(?:tax\s+)?revenue\s+for\s+(?:the\s+)?(?:domestic\s+)?government\b|\bquotas?\s+(?:give|gives|brings?)\s+(?:the\s+)?government\s+tariff\s+revenue\b|\bgovernment\s+collects?\s+tax\s+revenue\s+from\s+(?:import\s+)?quotas?\b)/i,
    flagWord: "import quotas claimed to generate government tax revenue",
    aoTarget: "ao1",
    aoImpact: "Deduct 1 mark in AO1 Knowledge for falsely attributing customs tax revenue to non-tariff import quotas.",
  },
];

export type DetectedEconomicsError = {
  rule: SyllabusEconomicsError;
  matchedText: string;
  from: number;
  to: number;
};

/**
 * Scans an essay for deterministic occurrences of any of the 22 syllabus misconceptions.
 */
export function detectSyllabusErrors(text: string): DetectedEconomicsError[] {
  if (!text || text.trim().length === 0) return [];
  const detected: DetectedEconomicsError[] = [];

  for (const rule of SYLLABUS_ECONOMICS_ERRORS) {
    const match = rule.pattern.exec(text);
    if (match) {
      detected.push({
        rule,
        matchedText: match[0],
        from: match.index,
        to: match.index + match[0].length,
      });
    }
  }

  return detected;
}

/**
 * Builds the comprehensive prompt directive injected into all Cambridge examiner passes
 * (Pass 1 error audit, Pass 2 holistic, Pass 3 refiner, arbitration).
 */
export function buildSyllabusErrorPromptCatalog(): string {
  const lines: string[] = [
    "MANDATORY CAMBRIDGE 9708 SYLLABUS MISCONCEPTIONS & ERROR PENALISATION CATALOG:",
    "If the candidate's essay contains ANY of the following specific errors, you MUST penalise them proportionately under AO1/AO2 (deduct marks and restrict from Top Band), and you MUST explicitly flag the error and state the syllabus correction in weaknesses and actionable feedback:",
  ];

  for (const [index, err] of SYLLABUS_ECONOMICS_ERRORS.entries()) {
    lines.push(
      `${index + 1}. [${err.section}] ${err.topic}:`,
      `   - Student Error: ${err.studentError}`,
      `   - Mandatory Syllabus Correction: ${err.correction}`,
      `   - Penalisation Directive: ${err.aoImpact}`,
    );
  }

  return lines.join("\n");
}
