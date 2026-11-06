import type { DataResponsePaper } from "./types";
import type { DiagramSpec } from "@/lib/diagrams/spec";

// ----------------------------------------------------------------------------
// Authentic Cambridge 9708 Economics Diagram Specifications (SVG Geometry)
// ----------------------------------------------------------------------------

// 1. AD/AS Rightward Shift (Direct Income Support Stimulus)
const adAsRightwardShiftDiagram: DiagramSpec = {
  xLabel: "Real Output / Real GDP (Y)",
  yLabel: "General Price Level (PL)",
  curves: [
    {
      points: [
        [15, 80],
        [85, 20],
      ],
      label: "AD₁",
      tone: "demand",
      labelAt: [87, 20],
    },
    {
      points: [
        [30, 85],
        [95, 30],
      ],
      label: "AD₂",
      tone: "demand",
      dashed: true,
      labelAt: [97, 30],
    },
    {
      points: [
        [15, 25],
        [50, 45],
        [80, 85],
      ],
      label: "SRAS",
      tone: "supply",
      labelAt: [82, 85],
    },
  ],
  arrows: [{ from: [50, 50], to: [63, 57], label: "+G / +C" }],
  markers: [
    { at: [48, 44], label: "E₁ (P₁, Y₁)", guides: "both" },
    { at: [64, 58], label: "E₂ (P₂, Y₂)", guides: "both" },
  ],
  xTicks: [
    { at: 48, label: "Y₁" },
    { at: 64, label: "Y₂" },
  ],
  yTicks: [
    { at: 44, label: "P₁" },
    { at: 58, label: "P₂" },
  ],
};

// 2. Supply Shift for Substitutes (Electric Vehicle Subsidy / Petrol Cars Demand Fall)
const evSubsidyDemandFallDiagram: DiagramSpec = {
  xLabel: "Quantity of Petrol Cars (Q)",
  yLabel: "Price of Petrol Cars (P)",
  curves: [
    {
      points: [
        [20, 80],
        [80, 20],
      ],
      label: "D₁",
      tone: "demand",
      labelAt: [82, 20],
    },
    {
      points: [
        [10, 70],
        [70, 10],
      ],
      label: "D₂",
      tone: "demand",
      dashed: true,
      labelAt: [72, 10],
    },
    {
      points: [
        [20, 20],
        [80, 80],
      ],
      label: "S",
      tone: "supply",
      labelAt: [82, 80],
    },
  ],
  arrows: [{ from: [50, 50], to: [40, 40], label: "Demand Shift" }],
  markers: [
    { at: [50, 50], label: "E₁", guides: "both" },
    { at: [40, 40], label: "E₂", guides: "both" },
  ],
  xTicks: [
    { at: 40, label: "Q₂" },
    { at: 50, label: "Q₁" },
  ],
  yTicks: [
    { at: 40, label: "P₂" },
    { at: 50, label: "P₁" },
  ],
};

// 3. Labour Market Minimum Wage Diagram (Wmin above We causing surplus/unemployment)
const minimumWageLabourDiagram: DiagramSpec = {
  xLabel: "Quantity of Labour (Q)",
  yLabel: "Wage Rate (W)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "DL (MRP)",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 85],
      ],
      label: "SL",
      tone: "supply",
      labelAt: [87, 85],
    },
    {
      points: [
        [10, 68],
        [90, 68],
      ],
      label: "Wmin",
      tone: "warn",
      dashed: true,
      labelAt: [92, 68],
    },
  ],
  markers: [
    { at: [50, 50], label: "We, Qe", guides: "both" },
    { at: [32, 68], label: "Qd", guides: "x" },
    { at: [68, 68], label: "Qs", guides: "x" },
  ],
  notes: [{ at: [50, 75], text: "Surplus of Labour / Unemployment (Qs - Qd)", align: "middle" }],
  xTicks: [
    { at: 32, label: "Qd" },
    { at: 50, label: "Qe" },
    { at: 68, label: "Qs" },
  ],
  yTicks: [
    { at: 50, label: "We" },
    { at: 68, label: "Wmin" },
  ],
};

// 4. Cost-Push Inflation AD/AS Diagram (SRAS shift left)
const costPushInflationDiagram: DiagramSpec = {
  xLabel: "Real GDP (Y)",
  yLabel: "Price Level (PL)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "AD",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 20],
        [85, 80],
      ],
      label: "SRAS₁",
      tone: "supply",
      labelAt: [87, 80],
    },
    {
      points: [
        [10, 35],
        [80, 95],
      ],
      label: "SRAS₂",
      tone: "supply",
      dashed: true,
      labelAt: [82, 95],
    },
  ],
  arrows: [{ from: [50, 50], to: [42, 62], label: "Energy Shock" }],
  markers: [
    { at: [50, 50], label: "E₁ (P₁, Y₁)", guides: "both" },
    { at: [42, 62], label: "E₂ (P₂, Y₂)", guides: "both" },
  ],
  xTicks: [
    { at: 42, label: "Y₂ (Stagflation)" },
    { at: 50, label: "Y₁" },
  ],
  yTicks: [
    { at: 50, label: "P₁" },
    { at: 62, label: "P₂" },
  ],
};

// 5. J-Curve Effect Diagram for Currency Depreciation
const jCurveDiagram: DiagramSpec = {
  xLabel: "Time (Months / Years)",
  yLabel: "Current Account Balance (+ Surplus / - Deficit)",
  curves: [
    {
      points: [
        [10, 50],
        [25, 20],
        [45, 18],
        [70, 55],
        [90, 80],
      ],
      label: "J-Curve",
      tone: "accent",
      labelAt: [92, 80],
    },
    {
      points: [
        [5, 50],
        [95, 50],
      ],
      label: "Trade Balance = 0",
      tone: "neutral",
      dashed: true,
      labelAt: [97, 50],
    },
  ],
  notes: [
    { at: [28, 12], text: "Short-run: Inelastic PED (Deficit worsens)", align: "middle" },
    { at: [80, 68], text: "Long-run: ML condition holds (Surplus)", align: "middle" },
  ],
  xTicks: [
    { at: 10, label: "Depreciation" },
    { at: 65, label: "Breakeven" },
  ],
  yTicks: [
    { at: 20, label: "Deficit" },
    { at: 50, label: "0" },
    { at: 80, label: "Surplus" },
  ],
};

// ----------------------------------------------------------------------------
// Authentic Cambridge 9708 Economics Examination Papers
// ----------------------------------------------------------------------------

export const PRELOADED_DATA_RESPONSE_PAPERS: DataResponsePaper[] = [
  // ==========================================================================
  // PAPER 1: Cambridge AS Level Economics 9708/22 February/March 2026
  // ==========================================================================
  {
    id: "9708_22_2026_fm",
    title: "Cambridge AS Level Economics 9708/22 — Section A: The market for fast food",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "as",
    paperNumber: "22",
    examSeries: "2026_feb_march",
    seriesLabel: "February/March 2026",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 The market for fast food",
      paragraphs: [
        "‘Fast food’ is a term often used by the media to refer to a large range of highly processed foods, many of which are low in nutrients but high in sugar, salt and saturated fats. According to a recent study, eating fast food is increasing death rates faster than smoking. Medical experts are concerned that fast food has become a regular part of the diets of millions of people worldwide.",
        "It is estimated that sales in the United States (US) of one of the world’s largest fast food outlets rose by 22% between 2019 and 2023. This was despite a 19% increase in its prices. The increase in sales can be partially explained by a rise in disposable income in the US of 29% over the same period. People described as ‘cash rich but time poor’ tend to choose fast food as it is convenient, affordable and satisfies their hunger.",
        "The wider impact of fast food on the economy is often overlooked. In 2016, more than 1.9 billion adults were overweight. Worldwide, the cost of treating diseases related to being overweight, such as heart disease and diabetes, was estimated to be US$2 trillion. When individuals experience poor health, they may need to take medical leave or reduce their working hours. This leads to a loss of income for the affected individuals and a loss of sales and reduced productivity for their employers.",
        "Many economists would refer to fast food as a demerit good. It is not surprising therefore that governments have intervened in fast food markets to tackle the over-consumption of these products. Selecting the best way to intervene, however, remains a cause of debate. In 2011, Denmark was the first country to introduce a tax on fast food but was forced to reverse the policy within one year due to the resultant job losses from increased food prices. Colombia introduced a new indirect tax on fast food in 2023 which began at 10% before rising to 15% in 2024 and then 20% in 2025. Despite being welcomed by campaigners and health experts who say it sets an example for other countries, concerns remain about the impact of such a policy on an economy’s overall macroeconomic performance. For example, in the US where approximately 5 million people are employed in fast food outlets, there could be a considerable increase in unemployment.",
      ],
      sources:
        "Adapted from: Obesity and overweight, who.com, 1 March 2024; Denmark scraps its infamous fat tax after only one year, euroactiv.com, 14 November 2012; ‘Tremendously unfair’: Latin America’s strictest junk food law divides shoppers in Bogotá, The Guardian, 29 December 2023",
    },
    questions: [
      {
        id: "9708_22_2026_fm_1ai",
        number: "1(a)(i)",
        title: "With the help of a formula, define the term income elasticity of demand. [2]",
        maxMark: 2,
        category: "definition",
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Formula: % change in quantity demanded / % change in income (or %ΔQD / %ΔY) (1 mark)",
          "Definition: A measure of the responsiveness of quantity demanded of a good/service to a change in consumer real income (1 mark)",
        ],
        calculationGuidance: {
          formula: "YED = % change in quantity demanded / % change in income",
          ofrApplies: false,
        },
        markingGuide:
          "Formula: % change in quantity demanded / % change in income (1). Definition: A measure of the responsiveness of demand for a good to a change in income (1). Full 2 marks require both accurate formula and clear verbal definition.",
        extractLinkageExpected: false,
        syllabusTopic: "Price, income and cross elasticities of demand",
      },
      {
        id: "9708_22_2026_fm_1aii",
        number: "1(a)(ii)",
        title:
          "Using the information in the second paragraph, calculate the income elasticity of demand for fast food for one of the world’s largest restaurant companies in the US between 2019 and 2023 and state how an economist would classify fast food in the US based on this calculation. [2]",
        maxMark: 2,
        category: "calculation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "% change in sales (demand) = +22%",
          "% change in disposable income = +29%",
          "Calculation: +22% / +29% = +0.76 (accept 0.758 or 0.76) (1 mark)",
          "Classification: Normal good / necessity / income-inelastic normal good (positive sign and less than 1) (1 mark)",
          "Own Figure Rule (OFR) applies: if calculation is wrong but classification is consistent with the candidate's calculated figure, award 1 mark.",
        ],
        calculationGuidance: {
          formula: "YED = 22% / 29% = +0.76",
          correctAnswer: "+0.76 (or 0.76 / 0.758); Normal good / necessity",
          ofrApplies: true,
          markingSteps: [
            "Step 1: Calculate 22 / 29 = +0.76 (1 mark)",
            "Step 2: Classify as normal good / necessity due to positive value between 0 and 1 (1 mark)",
          ],
        },
        markingGuide:
          "Calculation: +22% / +29% = +0.76 (or 0.758) (1). Classification: Normal good or income inelastic good / necessity (1). Note: OFR applies to classification if calculation error made.",
        extractLinkageExpected: true,
        syllabusTopic: "Income elasticity of demand calculation and classification",
      },
      {
        id: "9708_22_2026_fm_1b",
        number: "1(b)",
        title:
          "Explain what is meant by a demerit good and consider whether it is correct to ‘refer to fast food as a demerit good’. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Demerit good definition (up to 2 marks AO1): A good whose consumption generates negative externalities / spillover costs on third parties, or a good that is over-consumed due to information failure / consumer imperfect knowledge regarding private health costs.",
          "Case application supporting demerit status (up to 2 marks AO2): Extract shows fast food increases death rates faster than smoking; obesity affects 1.9 billion adults; US$2 trillion global healthcare burden (negative externalities on healthcare system/taxpayers); loss of productivity for employers.",
          "Evaluative balance / counter-argument: Fast food provides affordable calories, convenience, and time savings for 'cash rich but time poor' consumers; not all consumers are uninformed; individual preferences vs societal paternalism.",
        ],
        markingGuide:
          "Award up to 2 marks for knowledge/explanation of a demerit good (negative externalities of consumption / information failure where social cost > private cost). Award up to 2 marks for application to the extract: connecting negative health effects/costs ($2 trillion worldwide, reduced productivity, high sugar/fat) and considering whether consumers fully understand the harm or whether it provides legitimate convenience.",
        extractLinkageExpected: true,
        syllabusTopic: "Demerit goods, externalities and information failure",
      },
      {
        id: "9708_22_2026_fm_1c",
        number: "1(c)",
        title:
          "Assess the extent to which introducing an indirect tax on fast food is the best way to reduce its consumption. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Evaluation & Two-Sided Analysis in Context",
            description:
              "Clear, developed analysis of indirect taxation mechanism and alternative policies (subsidies, education, advertising bans) with reasoned evaluative judgement in the context of the fast food extract.",
            evaluativeRequirement:
              "Weighs whether tax is the 'best' policy: recognises that demand may be price inelastic (22% sales rise despite 19% price hike), regressive burden on low-income consumers, and risk of policy reversal (Denmark). Concludes with a justified recommendation.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Limited Evaluation",
            description:
              "Explains how indirect tax shifts supply left, raises price and reduces quantity. Mentions at least one limitation or alternative policy, but evaluative judgement is brief or lacks contextual depth.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Analysis & Descriptive Knowledge",
            description:
              "Identifies that tax raises price. Little or no causal development, no serious evaluation or alternative policy discussed.",
          },
        ],
        indicativePoints: [
          "Tax mechanism: Indirect tax increases costs of production, shifts supply curve left/upward, raising market price from P1 to P2 and reducing quantity demanded from Q1 to Q2 towards the socially optimal output.",
          "Context application: Colombia implemented 10% rising to 20% tax; Denmark introduced fat tax in 2011.",
          "Limitations of tax: Paragraph 2 states sales rose 22% despite a 19% price increase — indicating price inelastic demand (PED < 1), so a tax may raise prices without substantially curbing consumption; regressive impact on 'time-poor' low-income consumers.",
          "Alternative / complementary policies: Subsidies on healthy fresh foods, nutritional education campaigns, bans on fast food advertising to children, sugar/salt reformulation regulations.",
          "Evaluation / Conclusion: A tax alone is insufficient due to inelastic demand and negative welfare impacts on low-income households. A composite policy combining indirect taxes (to generate revenue) with targeted subsidies and public health education is more effective.",
        ],
        markingGuide:
          "Mark according to the 6-mark evaluative rubric. AO1/AO2 (up to 4 marks): Explanation of indirect tax mechanism, impact on supply/price/consumption, and references to Colombia/Denmark. AO3 Evaluation (up to 2 marks): Consideration of whether it is the 'best' way, including PED inelasticity shown in extract (sales rose despite 19% price increase), regressive nature, job loss risks, and comparison with alternatives like education/subsidies. Reasoned judgement required for top marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Indirect taxes and government intervention in product markets",
      },
      {
        id: "9708_22_2026_fm_1d",
        number: "1(d)",
        title:
          "Assess the extent to which decreasing the consumption of fast food will always increase the level of unemployment for a country such as the US. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Contextual Evaluation & Counter-balanced Analysis",
            description:
              "Thorough analysis of why decreasing fast food consumption could increase unemployment (derived demand, 5m US workers, Denmark precedent) contrasted against why it will NOT always increase overall unemployment (reallocation to healthy food, higher labour productivity from fewer sick days, macro multiplier). Reaches a justified context-specific conclusion directly addressing the word 'always'.",
            evaluativeRequirement:
              "Directly evaluates 'always': concludes that while specific structural unemployment will rise in the fast-food sector in the short run, national unemployment will not necessarily rise in the long run as expenditure switches to substitute goods and healthcare savings boost productive capacity.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Partial Balance",
            description:
              "Develops the link between reduced consumption and fast food worker job losses (5 million US workers). Mentions that jobs might be created elsewhere or health benefits, but evaluation is not fully developed.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Simple statements that less fast food means fewer restaurant workers. Unbalanced or purely one-sided.",
          },
        ],
        indicativePoints: [
          "Arguments that it WILL increase unemployment: Derived demand for labour — lower consumption of fast food leads to reduced restaurant revenues, branch closures, and layoffs; 5 million people employed in fast-food outlets in the US; Denmark's tax was reversed after one year specifically due to job losses; workers in fast-food often have low transferable skills.",
          "Arguments that it will NOT always increase unemployment: Consumers will reallocate disposable income to other food sectors, groceries, or healthier dining, creating replacement jobs in those industries; improved health reduces obesity and related diseases ($2 trillion worldwide cost), leading to fewer medical leaves, higher labour productivity, and higher workforce participation; government tax revenues can be reinvested in job creation and retraining programs.",
          "Evaluation: Crucial to challenge the qualifier 'always'. In the short run, specific structural unemployment in the fast-food sector is highly likely due to occupational immobility. In the long run, macroeconomic aggregate demand re-equilibrates as spending diverts to substitutes and a healthier workforce expands productive capacity.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Analysis of derived demand for labour, the 5 million US fast food workforce, and Denmark case study showing job losses. AO3 Evaluation (up to 2 marks): Consideration of whether it will 'always' increase unemployment: expenditure switching to healthier substitutes creating new jobs, increased productivity from reduced sick leave/illness, and short run vs long run adjustments. Award 5-6 marks for balanced answers directly interrogating 'always'.",
        extractLinkageExpected: true,
        syllabusTopic: "Labour markets, derived demand and macroeconomic employment",
      },
    ],
    sampleAnswers: {
      "1(a)(i)":
        "Income elasticity of demand (YED) measures the responsiveness of the quantity demanded of a good or service to a change in consumer real income.\n\nFormula:\nYED = (% change in quantity demanded) / (% change in income)",
      "1(a)(ii)":
        "From paragraph 2 of the extract:\n- Percentage change in fast food sales (quantity demanded) = +22%\n- Percentage change in disposable income in the US = +29%\n\nYED = +22% / +29% = +0.7586 = +0.76\n\nClassification:\nBecause the YED is positive (+0.76) and less than 1, economists classify fast food in the US as a normal good, specifically an income-inelastic necessity.",
      "1(b)":
        "A demerit good is a product whose consumption generates negative externalities on third parties not involved in the transaction, and which is typically over-consumed because consumers suffer from information failure regarding its true long-term private harms.\n\nIt is largely correct to refer to fast food as a demerit good based on the extract. Fast food is high in sugar, salt, and saturated fats and increases death rates faster than smoking. Its over-consumption leads to massive negative externalities: worldwide medical costs for treating obesity-related diseases (heart disease and diabetes) reached US$2 trillion in 2016, imposing financial burdens on public healthcare and taxpayers. Additionally, worker illness causes absenteeism and reduced employer productivity. However, consumers described as 'cash rich but time poor' may value its convenience, affordability, and caloric intake, suggesting that some consumption reflects rational choice under time constraints rather than pure market failure.",
      "1(c)":
        "An indirect tax (such as Colombia's 10% to 20% tax) increases firms' costs of production, shifting the market supply curve upward/left from S to S+tax. This raises the equilibrium market price and contracts quantity demanded, internalising the negative externality and reducing over-consumption towards the socially optimal level.\n\nHowever, an indirect tax is not necessarily the 'best' or most effective standalone solution. First, the extract provides evidence that demand for fast food is price inelastic: between 2019 and 2023, sales rose by 22% despite a 19% increase in prices. Because consumers are 'time poor' and find it convenient, they may simply absorb the higher price rather than reduce consumption, generating substantial tax revenue without curing obesity. Second, fast food taxes are regressive, disproportionately penalising low-income households. Third, high taxes can cause significant job losses, as seen in Denmark where the 2011 fat tax had to be revoked after just one year.\n\nTherefore, while indirect taxation raises price signals and funds public healthcare, it is only effective when combined with complementary policies: subsidising healthy fresh foods, enforcing nutritional education, and restricting junk food advertising.",
      "1(d)":
        "Decreasing the consumption of fast food will cause immediate employment pressure in the fast food industry because the demand for labour is a derived demand. If fast food sales decline, restaurant chains will face declining revenues and close outlets, leading to redundancies. In the US, approximately 5 million people are employed in fast food outlets. Many of these workers possess low skills and may experience occupational immobility, making re-employment difficult. This risk is confirmed by Denmark, which repealed its food tax after one year due to resultant job losses.\n\nHowever, it will NOT 'always' increase overall national unemployment. First, consumers who spend less on fast food do not destroy that purchasing power; they divert their disposable income towards healthier food alternatives, supermarkets, and local dining, creating substitute jobs in agriculture, food processing, and distribution. Second, the extract highlights that obesity costs US$2 trillion globally and causes workers to take medical leave or suffer reduced productivity. Decreasing fast food consumption improves public health, lowering absenteeism, boosting labour productivity, and increasing aggregate supply, which fosters long-term economic growth and job creation.\n\nIn conclusion, decreasing fast food consumption will almost certainly increase structural and sectoral unemployment in fast food outlets in the short term, but it will not 'always' increase total unemployment in the US in the long term, as spending redirects to other sectors and healthcare gains expand productive capacity.",
    },
  },

  // ==========================================================================
  // PAPER 2: Cambridge A Level Economics 9708/42 February/March 2026
  // ==========================================================================
  {
    id: "9708_42_2026_fm",
    title: "Cambridge A Level Economics 9708/42 — Section A: COVID-19 Economic Interventions in Japan and Ghana",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "a2",
    paperNumber: "42",
    examSeries: "2026_feb_march",
    seriesLabel: "February/March 2026",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Macroeconomic Policy Responses to COVID-19",
      paragraphs: [
        "The COVID-19 pandemic caused severe global macroeconomic shocks, prompting unprecedented state intervention across both advanced and developing economies. Governments deployed an array of fiscal stimulus and monetary measures to protect household incomes and prevent corporate bankruptcies.",
        "Disparities in the scale of intervention were stark: Japan's government delivered an emergency fiscal response amounting to approximately 45% of its GDP, funded by domestic bond issuance and central bank backing. In contrast, Ghana's government fiscal response was constrained to approximately 2% of its GDP, restricted by limited access to sovereign debt markets and high borrowing costs.",
        "Key policy tools included direct income support (such as wage subsidies and furlough payments to furloughed workers), debt write-offs or moratoria (where state lenders forgave interest or extended maturity schedules), and massive central bank asset purchases (Quantitative Easing) to keep borrowing rates near historical lows.",
        "The pandemic had highly asymmetric impacts across economic sectors. Strict public health lockdowns devastated the hospitality, retail, and personal service sectors, where jobs require physical on-site presence and workers typically earn lower wages with low savings buffers. Conversely, the digital and technology sectors experienced rapid demand growth, as corporate remote working and e-commerce accelerated, allowing higher-skilled professional workers to maintain full earnings from home.",
      ],
      tables: [
        {
          title: "Table 1.1: Fiscal Stimulus & Sovereign Debt Metrics (2020–2022)",
          headers: ["Country", "Fiscal Stimulus (% of GDP)", "Government Debt (% of GDP)", "10-Year Bond Yield (%)", "Direct Income Support Type"],
          rows: [
            ["Japan", "45.0%", "260.0%", "0.05%", "Universal cash grants & wage subsidies"],
            ["Ghana", "2.0%", "78.0%", "19.50%", "Targeted utility subsidies & food relief"],
            ["United States", "25.5%", "128.0%", "0.90%", "Paycheck Protection Program & stimulus cheques"],
            ["Germany", "18.0%", "69.0%", "-0.40%", "Kurzarbeit furlough wage support"],
          ],
          notes: "Sources: IMF World Economic Outlook and Ministry of Finance official reports.",
        },
      ],
      sources: "Cambridge Assessment International Education 9708/42 Economics Paper 4 F/M 2026",
    },
    questions: [
      {
        id: "9708_42_2026_fm_1ai",
        number: "1(a)(i)",
        title: "Compare the additional government spending in Japan and Ghana in response to the COVID-19 pandemic. [2]",
        maxMark: 2,
        category: "data_interpretation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Japan's government fiscal response was 45% of GDP (1 mark)",
          "Ghana's government fiscal response was 2% of GDP (1 mark)",
          "Japan's response was approximately 22.5 times (or 20+ times) larger as a percentage of GDP than Ghana's response (1 mark)",
          "Max 2 marks.",
        ],
        markingGuide:
          "Japan fiscal response was 45% GDP (1). Ghana fiscal response was 2% GDP (1). Response was ~22.5x / 20+ times larger in Japan (1). Max 2 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Macroeconomic fiscal policy in developed and developing economies",
      },
      {
        id: "9708_42_2026_fm_1aii",
        number: "1(a)(ii)",
        title: "Explain one possible reason for the difference between their responses. [2]",
        maxMark: 2,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Japan has greater access to international and domestic credit markets at ultra-low interest rates (0.05% bond yields), enabling high deficit spending (1-2 marks).",
          "Ghana is a developing economy facing high sovereign borrowing rates (19.5% bond yields) and risk of debt distress (1-2 marks).",
          "Max 2 marks for one developed point.",
        ],
        markingGuide:
          "Japan: higher creditworthiness / ability to issue domestic debt in yen (1) -> greater willingness and capacity to spend (1). Ghana: lower income / fiscal constraints / risk of debt distress (1) -> unable to fund large stimulus (1). Max 2 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Sovereign debt and fiscal constraints",
      },
      {
        id: "9708_42_2026_fm_1b",
        number: "1(b)",
        title:
          "With the help of an aggregate demand and aggregate supply diagram, explain the impact of an increase in ‘direct income support’ on real output and the price level. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        diagramSpec: adAsRightwardShiftDiagram,
        diagramGuidance: {
          diagramName: "AD/AS Rightward Shift Diagram",
          axes: ["Price Level (PL)", "Real GDP / Real Output (Y)"],
          curves: ["AD₁", "AD₂ (shifted right)", "SRAS"],
          shiftDescription: "AD curve shifts rightwards due to increased government spending (G) or consumer spending (C).",
          equilibriumDescription: "Equilibrium moves from (P₁, Y₁) to (P₂, Y₂), showing an increase in real output and rise in price level.",
          marksAllocated: 2,
        },
        indicativePoints: [
          "Diagram: Correct labelling of axes (Price Level, Real Output/GDP) and curves (AD, SRAS) (1 mark).",
          "Diagram shift: Correct identification and shift of AD curve rightward with changes in equilibrium (1 mark).",
          "Explanation: Direct income support (furlough, grants) increases disposable income -> increases consumer expenditure (C) or government expenditure (G), which are components of AD = C + I + G + (X-M) (1 mark).",
          "Impact: AD shifts right, causing real output/GDP to rise from Y1 to Y2, and price level increases from P1 to P2 (1 mark).",
        ],
        markingGuide:
          "Axes and curves correctly labelled (1). Shift in AD curve rightward shown (1). Explanation that income support boosts C/G causing AD to shift right (1). Resulting increase in real GDP and upward pressure on price level (1). Max 4 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Aggregate demand and aggregate supply macroeconomic model",
      },
      {
        id: "9708_42_2026_fm_1c",
        number: "1(c)",
        title:
          "Consider why lockdowns affected those working in the ‘digital sector’ differently from those working in the ‘hospitality, retail, and personal service sectors’. [5]",
        maxMark: 5,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Hospitality/retail/personal services (max 2 marks): Work requires on-site physical presence; public stayed home closing venues; workers often earn lower wages with minimal savings; businesses faced zero revenues leading to layoffs and reduced living standards.",
          "Digital sector (max 2 marks): Employees can work remotely via internet with zero disruption to wages; surge in demand for remote software and cloud services expanded corporate revenues.",
          "Relevant evaluative conclusion (1 mark): The divide widened economic inequality as high earners protected wealth while lower-skilled workers suffered income shocks.",
        ],
        markingGuide:
          "Hospitality/retail points (up to 2 marks). Digital sector points (up to 2 marks). Balanced comparative conclusion (1 mark). Total 5 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Labour market segmentation and sectoral shocks",
      },
      {
        id: "9708_42_2026_fm_1d",
        number: "1(d)",
        title:
          "Using the information regarding government policy tools, assess the advantages and disadvantages of two policies used by governments during the COVID-19 pandemic to protect their economies. [7]",
        maxMark: 7,
        category: "essay_evaluative",
        tariff: { ao1: 1, ao2: 3, ao3: 3 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "6–7 marks",
            label: "Effective Macroeconomic Policy Evaluation & Synthesis",
            description:
              "Clear identification of at least two policies (furlough, debt write-offs, or QE) with comprehensive analysis of advantages (preserving productive capacity, preventing systemic collapse) and disadvantages (sovereign debt overhang, inflation risk), supported by a justified conclusion.",
            evaluativeRequirement:
              "Weighs trade-offs between immediate economic survival and long-run macroeconomic stability (debt distress, moral hazard, inflation).",
          },
          {
            level: 2,
            marksRange: "3–5 marks",
            label: "Developed Analysis with Partial Evaluation",
            description:
              "Developed analysis of at least two policies with clear advantages and disadvantages, but evaluation or synthesis is brief.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Descriptive comments with few advantages/disadvantages explained.",
          },
        ],
        indicativePoints: [
          "Identify 2 policies (1 mark): Direct income support, Debt write-offs, or Quantitative Easing.",
          "Advantages (up to 3 marks): Maintains household consumption, avoids structural unemployment, protects circular flow of income, reduces borrowing costs.",
          "Disadvantages (up to 3 marks): Massive increase in national debt, inflation risk from QE, potential fraud/misallocation, long-term tax hikes required.",
        ],
        markingGuide:
          "Max 1 mark for identifying 2 policies. Up to 3 marks for advantages. Up to 3 marks for disadvantages. Award up to 2 marks per developed point. Max 7 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Government macroeconomic policy evaluation",
      },
    ],
  },

  // ==========================================================================
  // PAPER 3: Cambridge AS Level Economics 9708/22 May/June 2024
  // ==========================================================================
  {
    id: "9708_22_2024_mj",
    title: "Cambridge AS Level Economics 9708/22 — Section A: Electric Vehicle Subsidies and Battery Supply Chains",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "as",
    paperNumber: "22",
    examSeries: "2024_may_june",
    seriesLabel: "May/June 2024",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Global Electric Vehicle Subsidies and Market Dynamics",
      paragraphs: [
        "In an effort to achieve net-zero carbon emission targets, governments across North America, Europe, and Asia have introduced large subsidy packages for electric vehicles (EVs). Subsidies have taken the form of direct purchase rebates to consumers, tax write-offs for corporate fleets, and capital grants to battery manufacturing gigafactories.",
        "Between 2020 and 2024, the average price of an electric passenger car fell from $55,000 to $42,000, representing a 23.6% reduction. Over the same period, consumer demand for EVs surged by 160% in Europe and 110% in North America. Economists attribute this surge to both declining purchase prices and high retail petrol prices resulting from international oil supply disruptions.",
        "However, critics emphasize the high environmental and financial opportunity costs of EV transitions. Battery production requires intensive extraction of lithium, cobalt, and nickel, which causes heavy local water pollution and habitat destruction. Furthermore, subsidising high-priced luxury electric cars has raised equity concerns, as lower-income households continue to drive older internal combustion engine (petrol) vehicles and pay substantial fuel taxes.",
      ],
      tables: [
        {
          title: "Table 1.1: EV Market Penetration & Subsidy Schemes (2024)",
          headers: ["Region", "EV Market Share (%)", "Consumer Subsidy per EV ($)", "Lithium Battery Cost per kWh ($)", "Average Petrol Price ($/litre)"],
          rows: [
            ["European Union", "22.5%", "$5,200", "$135", "$1.95"],
            ["United States", "9.8%", "$7,500", "$140", "$0.98"],
            ["China", "36.0%", "$2,800", "$112", "$1.15"],
            ["Norway", "82.0%", "$11,000 (Tax exemption)", "$132", "$2.35"],
          ],
          notes: "Source: International Energy Agency (IEA) Global EV Outlook 2024.",
        },
      ],
      sources: "Adapted from: IEA Global EV Outlook 2024; European Transport Research Review.",
    },
    questions: [
      {
        id: "9708_22_2024_mj_1ai",
        number: "1(a)(i)",
        title: "Using Table 1.1, calculate the difference in consumer subsidies per EV between the United States and China. [2]",
        maxMark: 2,
        category: "calculation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "US subsidy = $7,500",
          "China subsidy = $2,800",
          "Difference = $7,500 - $2,800 = $4,700 (2 marks)",
        ],
        calculationGuidance: {
          formula: "Difference = US Subsidy - China Subsidy = $7,500 - $2,800",
          correctAnswer: "$4,700",
          ofrApplies: true,
        },
        markingGuide: "Award 2 marks for correct answer of $4,700 (or 4,700). Award 1 mark for identifying both correct figures ($7,500 and $2,800).",
        extractLinkageExpected: true,
        syllabusTopic: "Market intervention and data interpretation",
      },
      {
        id: "9708_22_2024_mj_1aii",
        number: "1(a)(ii)",
        title: "Using Table 1.1, calculate the difference in lithium battery cost per kWh between the United States and China. [2]",
        maxMark: 2,
        category: "calculation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "United States battery cost = $140/kWh",
          "China battery cost = $112/kWh",
          "Calculation: $140 - $112 = $28 per kWh (2 marks)",
        ],
        calculationGuidance: {
          formula: "Difference = US Battery Cost - China Battery Cost = $140 - $112",
          correctAnswer: "$28 (or $28/kWh)",
          ofrApplies: true,
        },
        markingGuide: "Award 2 marks for $28 (or $28/kWh). Award 1 mark for identifying $140 and $112.",
        extractLinkageExpected: true,
        syllabusTopic: "Cost differentials in manufacturing",
      },
      {
        id: "9708_22_2024_mj_1b",
        number: "1(b)",
        title: "With the help of a demand and supply diagram, explain how government subsidies on electric vehicles affect the market for petrol cars. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        diagramSpec: evSubsidyDemandFallDiagram,
        diagramGuidance: {
          diagramName: "Demand & Supply Shift for Substitutes",
          axes: ["Price of Petrol Cars (P)", "Quantity of Petrol Cars (Q)"],
          curves: ["D₁", "D₂ (shifted left)", "S (supply of petrol cars)"],
          shiftDescription: "Subsidies lower the effective price of EVs. Because EVs and petrol cars are substitute goods (positive XED), demand for petrol cars shifts left from D₁ to D₂.",
          equilibriumDescription: "Price falls from P₁ to P₂ and quantity traded contracts from Q₁ to Q₂.",
          marksAllocated: 2,
        },
        indicativePoints: [
          "Diagram: Correctly labelled axes (Price, Quantity) and curves (D, S) for petrol cars (1 mark).",
          "Diagram shift: Leftward shift of Demand curve (D₁ to D₂) with lower equilibrium price and quantity (1 mark).",
          "Economic mechanism: EVs and petrol cars are substitutes in consumption (positive cross elasticity of demand). A subsidy on EVs reduces their price, prompting consumers to switch away from petrol cars (1 mark).",
          "Market effect: Demand for petrol cars contracts, causing a decline in both the market clearing price and equilibrium quantity (1 mark).",
        ],
        markingGuide:
          "2 marks for diagram (axes, curves, left shift of D, new equilibrium). 2 marks for analysis of substitute relationship and price/quantity impact. Max 4 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Substitutes and cross elasticity of demand",
      },
      {
        id: "9708_22_2024_mj_1c",
        number: "1(c)",
        title: "Explain the difference between private costs and external costs with reference to the production of electric vehicles, and consider whether governments should tax lithium battery extraction. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Evaluative Synthesis on Market Failure & Environmental Policy",
            description:
              "Clear distinction between private and external costs applied to EV manufacturing and mining. Rigorous evaluation of the trade-off between penalising local mining damage vs slowing the global decarbonisation transition.",
            evaluativeRequirement:
              "Evaluates whether taxing battery mining undermines the affordability of EVs needed to achieve net-zero targets.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Partial Evaluation",
            description:
              "Explains private and external costs clearly with extract references, and offers basic arguments for and against a tax on lithium extraction.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Simple definitions of private or external costs without developed contextual evaluation.",
          },
        ],
        indicativePoints: [
          "Private costs (AO1): Internal expenses incurred by EV and battery manufacturers (e.g. factory wages, machinery, lithium purchases at $112-$140/kWh).",
          "External costs (AO2): Negative externalities imposed on third parties without compensation (e.g. water contamination, toxic waste, and habitat degradation from lithium and cobalt mining).",
          "Evaluation of tax (AO3): Taxing mining internalises the externality (polluter pays principle), encouraging cleaner extraction technologies. However, it raises battery costs, directly conflicting with government subsidies aiming to make EVs affordable.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Explanation of private vs external costs in context of EV batteries. AO3 Evaluation (up to 2 marks): Balanced assessment of taxing extraction vs transition speed. Max 6 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Negative externalities, social costs and environmental taxation",
      },
      {
        id: "9708_22_2024_mj_1d",
        number: "1(d)",
        title: "Assess whether subsidising electric vehicles is more effective than taxing petrol in reducing carbon emissions. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Comparative Evaluation in Context",
            description:
              "Develops balanced arguments evaluating both EV subsidies and fuel taxes, explicitly weighing financial cost against emission reduction speed, and reaches a justified conclusion.",
            evaluativeRequirement:
              "Weighs budgetary opportunity cost of subsidies against regressive nature of fuel taxes; concludes on whether a hybrid approach is superior.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Partial Evaluation",
            description: "Analyses mechanism of both subsidy and tax, but evaluative weighing is brief.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Descriptive comments on EV subsidies or petrol taxes.",
          },
        ],
        indicativePoints: [
          "Subsidies on EVs: Encourages rapid adoption (Europe +160%), brings forward scale economies in battery manufacturing, positive consumption externalities. Limitations: High opportunity cost to governments ($5,200-$11,000 per car in Table 1.1), benefits wealthier buyers.",
          "Taxes on petrol: Follows polluter-pays principle, raises tax revenue for governments, directly penalises high emissions. Limitations: Inelastic demand for fuel leads to higher cost of living; regressive on poorer drivers who cannot afford an EV.",
          "Evaluation: Taxing petrol generates revenue but causes social hardship; subsidising EVs accelerates clean tech but strains budgets. A revenue-neutral feebate or combination policy is most effective.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Comparative analysis of EV subsidies vs petrol taxation. AO3 Evaluation (up to 2 marks): Justified conclusion considering fiscal sustainability, equity, and emission elasticity. Max 6 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Government microeconomic policy evaluation",
      },
    ],
  },

  // ==========================================================================
  // PAPER 4: Cambridge A Level Economics 9708/42 May/June 2024
  // ==========================================================================
  {
    id: "9708_42_2024_mj",
    title: "Cambridge A Level Economics 9708/42 — Section A: Inflation Dynamics, Energy Shocks and Trade Deficits",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "a2",
    paperNumber: "42",
    examSeries: "2024_may_june",
    seriesLabel: "May/June 2024",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Cost-Push Pressures and Current Account Strain",
      paragraphs: [
        "In 2022–2023, European economies faced severe stagflationary headwinds driven by skyrocketing wholesale gas and electricity prices following geopolitical supply contractions. Industrial energy tariffs surged by over 200%, translating into acute cost-push inflation across manufacturing and food processing sectors.",
        "To prevent runaway inflation expectations from becoming entrenched in wage negotiations, central banks initiated aggressive monetary tightening, rapidly raising base policy rates from near 0% to over 4.5%. However, higher borrowing costs dampened domestic capital investment and consumer credit, causing real GDP growth to stagnate across the Eurozone.",
        "Simultaneously, the surge in energy import expenditure widened trade deficits. Because primary energy demand is highly price-inelastic in the short run, higher import prices dramatically increased the total value of imports, causing current account deficits to deteriorate.",
      ],
      tables: [
        {
          title: "Table 1.1: Selected European Macroeconomic Indicators (2023)",
          headers: ["Economy", "Real GDP Growth (%)", "CPI Inflation (%)", "Current Account Balance (% of GDP)", "Central Bank Policy Rate (%)"],
          rows: [
            ["Germany", "-0.3%", "5.9%", "4.2%", "4.50%"],
            ["United Kingdom", "0.1%", "7.3%", "-3.3%", "5.25%"],
            ["Italy", "0.7%", "5.6%", "-0.5%", "4.50%"],
            ["Spain", "2.5%", "3.5%", "2.6%", "4.50%"],
          ],
          notes: "Source: Eurostat & Office for National Statistics (ONS).",
        },
      ],
      sources: "Adapted from: European Central Bank Economic Bulletin; OECD Country Surveys 2023.",
    },
    questions: [
      {
        id: "9708_42_2024_mj_1ai",
        number: "1(a)(i)",
        title: "Using Table 1.1, calculate the real interest rate for the United Kingdom in 2023. [2]",
        maxMark: 2,
        category: "calculation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Formula: Real Interest Rate = Nominal Policy Rate - CPI Inflation Rate (1 mark)",
          "UK Policy Rate = 5.25%, UK Inflation = 7.3%",
          "Calculation: 5.25% - 7.3% = -2.05% (1 mark)",
          "Award 2 marks for -2.05% (or negative 2.05%).",
        ],
        calculationGuidance: {
          formula: "Real Rate = Nominal Rate - Inflation Rate = 5.25% - 7.3%",
          correctAnswer: "-2.05%",
          ofrApplies: true,
        },
        markingGuide: "Award 2 marks for -2.05%. Award 1 mark for identifying 5.25% and 7.3% or formula.",
        extractLinkageExpected: true,
        syllabusTopic: "Real vs nominal interest rates",
      },
      {
        id: "9708_42_2024_mj_1b",
        number: "1(b)",
        title: "With the help of an aggregate demand and aggregate supply diagram, explain how rising energy prices cause cost-push inflation and reduce real output. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        diagramSpec: costPushInflationDiagram,
        diagramGuidance: {
          diagramName: "Cost-Push Inflation (SRAS Left Shift)",
          axes: ["Price Level (PL)", "Real GDP (Y)"],
          curves: ["AD", "SRAS₁", "SRAS₂ (shifted left)"],
          shiftDescription: "Rising energy prices increase unit costs of production, shifting the short-run aggregate supply curve inwards from SRAS₁ to SRAS₂.",
          equilibriumDescription: "Price level increases from P₁ to P₂ (inflation) while real GDP falls from Y₁ to Y₂ (stagflation).",
          marksAllocated: 2,
        },
        indicativePoints: [
          "Diagram: Correctly labelled axes (PL, Real GDP) and initial curves (AD, SRAS₁) (1 mark).",
          "Diagram shift: Shift of SRAS curve leftward (SRAS₁ to SRAS₂) showing higher PL and lower real output (1 mark).",
          "Explanation: Energy is a vital cost of production across all industries. Increased energy costs shift SRAS left (1 mark).",
          "Impact: Cost-push inflation results as PL rises to P₂, while real GDP contracts to Y₂, causing stagflation (1 mark).",
        ],
        markingGuide:
          "2 marks for accurate diagram. 2 marks for explanation of cost transmission to SRAS and stagflationary outcome. Max 4 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Cost-push inflation and aggregate supply",
      },
      {
        id: "9708_42_2024_mj_1c",
        number: "1(c)",
        title: "Analyse the relationship between energy price shocks and the current account balance for oil-importing economies. [5]",
        maxMark: 5,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Current account definition: Net trade balance (X - M) plus net primary and secondary income flows.",
          "Inelastic demand for energy: Energy imports (gas/oil) have price inelastic demand (PED < 1) because they have few immediate substitutes in heating and transport.",
          "Import expenditure effect: When price surges, quantity demanded contracts minimally, leading to a substantial rise in total import bill (Price * Quantity).",
          "Current account deterioration: Rising import values worsen the trade deficit, pushing the current account into deficit (as seen in the UK -3.3% in Table 1.1).",
        ],
        markingGuide:
          "1 mark for current account definition. 2 marks for analysis of inelastic energy demand. 2 marks for linking to higher total import bill and deficit widening. Max 5 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Current account of the balance of payments",
      },
      {
        id: "9708_42_2024_mj_1d",
        number: "1(d)",
        title: "Evaluate whether contractionary monetary policy is the most effective policy to restore price stability during a supply-side energy shock. [9]",
        maxMark: 9,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 3, ao3: 4 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "7–9 marks",
            label: "Effective Macroeconomic Evaluation & Policy Synthesis",
            description:
              "Developed analysis comparing contractionary monetary policy with alternative policies (energy price caps, targeted subsidies, supply-side efficiency measures). Reaches a justified conclusion acknowledging the bluntness of interest rates against supply shocks.",
            evaluativeRequirement:
              "Weighs the risk of inducing severe recession (Germany -0.3% GDP) against the danger of de-anchoring inflation expectations. Concludes with a nuanced policy mix.",
          },
          {
            level: 2,
            marksRange: "4–6 marks",
            label: "Developed Analysis with Partial Evaluation",
            description: "Explains how higher interest rates reduce AD, but evaluation of supply-side alternatives is underdeveloped.",
          },
          {
            level: 1,
            marksRange: "1–3 marks",
            label: "Limited Points",
            description: "Descriptive comments on interest rates reducing inflation.",
          },
        ],
        indicativePoints: [
          "Contractionary monetary policy: Higher interest rates raise borrowing costs, dampening consumption (C) and investment (I), shifting AD left to reduce demand-pull pressure and anchor wage expectations.",
          "Limitations during supply shock: Monetary policy cannot create gas or repair pipelines; contracting AD when supply has already contracted deepens recession (-0.3% growth in Germany).",
          "Alternative / complementary policies: Energy price guarantees / caps, strategic gas reserves, investments in renewable supply-side capacity, fiscal support for vulnerable households.",
          "Evaluation: Monetary policy is necessary to prevent second-round wage-price spirals, but insufficient on its own. It must be paired with supply-side energy transition policies to resolve the root structural shortage.",
        ],
        markingGuide:
          "Follow A-Level levels-based rubric. AO1/AO2 (up to 5 marks): Analysis of monetary policy mechanism and stagflation dilemma. AO3 Evaluation (up to 4 marks): Consideration of policy bluntness, trade-offs between recession and price stability, and evaluation of alternative tools. Max 9 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Macroeconomic policy conflicts and stagflation",
      },
    ],
  },

  // ==========================================================================
  // PAPER 5: Cambridge AS Level Economics 9708/22 October/November 2023
  // ==========================================================================
  {
    id: "9708_22_2023_on",
    title: "Cambridge AS Level Economics 9708/22 — Section A: Minimum Wage Legislation and Youth Employment",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "as",
    paperNumber: "22",
    examSeries: "2023_oct_nov",
    seriesLabel: "October/November 2023",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Minimum Wage Policy in Low-Paid Sectors",
      paragraphs: [
        "Governments establish statutory National Minimum Wages (NMW) to protect vulnerable, low-skilled workers from exploitative pay and reduce income inequality. In 2023, several countries announced large percentage increases in statutory minimum pay rates to keep pace with rapid double-digit cost-of-living inflation.",
        "In the retail, fast-food, and hospitality sectors, wages constitute up to 40% of total operating overheads. Small enterprise owners argue that steep mandatory wage hikes force employers to freeze entry-level hiring, cut working shifts, or replace human cashier staff with automated self-service kiosks.",
        "Conversely, trade unions and labour economists assert that higher minimum wages bolster low-income purchasing power, reduce costly staff turnover, and stimulate worker productivity. Furthermore, in non-competitive labour markets where large employers hold monopsony buying power, a minimum wage can theoretically increase both wages and overall employment.",
      ],
      tables: [
        {
          title: "Table 1.1: Minimum Wage Rates & Youth Unemployment (2020 vs 2023)",
          headers: ["Country", "Minimum Wage 2020 ($/hr)", "Minimum Wage 2023 ($/hr)", "% Increase in Min Wage", "Youth Unemployment Rate (%)"],
          rows: [
            ["Country A", "$9.50", "$12.00", "26.3%", "14.2%"],
            ["Country B", "$11.00", "$14.30", "30.0%", "18.5%"],
            ["Country C", "$7.25", "$7.25", "0.0%", "11.0%"],
          ],
          notes: "Source: National Ministry of Labour Statistical Databases.",
        },
      ],
      sources: "Adapted from: OECD Employment Outlook; International Labour Organization (ILO) Report.",
    },
    questions: [
      {
        id: "9708_22_2023_on_1a",
        number: "1(a)",
        title: "Define the term 'minimum wage' and state one condition for it to be effective in a labour market. [2]",
        maxMark: 2,
        category: "definition",
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Definition: A legally mandated minimum hourly rate of pay that employers are legally obligated to pay their workers (1 mark).",
          "Condition for effectiveness: It must be set ABOVE the free-market equilibrium wage rate (1 mark).",
        ],
        markingGuide: "1 mark for legal wage floor definition. 1 mark for condition (set above market equilibrium wage). Total 2 marks.",
        extractLinkageExpected: false,
        syllabusTopic: "Minimum wage legislation",
      },
      {
        id: "9708_22_2023_on_1b",
        number: "1(b)",
        title: "Using Table 1.1, calculate the percentage increase in the statutory minimum wage for Country A between 2020 and 2023. [2]",
        maxMark: 2,
        category: "calculation",
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Formula: ((Wage 2023 - Wage 2020) / Wage 2020) * 100",
          "Values: (($12.00 - $9.50) / $9.50) * 100 = ($2.50 / $9.50) * 100 = 26.32% (or 26.3%)",
          "Award 2 marks for 26.3% or 26.32%.",
        ],
        calculationGuidance: {
          formula: "((12.00 - 9.50) / 9.50) * 100 = 26.3%",
          correctAnswer: "26.3% (or 26.32%)",
          ofrApplies: true,
        },
        markingGuide: "Award 2 marks for 26.3% (or 26.32%). Award 1 mark for $2.50 increase or correct formula.",
        extractLinkageExpected: true,
        syllabusTopic: "Percentage calculations in economic data",
      },
      {
        id: "9708_22_2023_on_1c",
        number: "1(c)",
        title: "With the help of a labour market diagram, explain the effect of setting a minimum wage above the equilibrium wage rate. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        diagramSpec: minimumWageLabourDiagram,
        diagramGuidance: {
          diagramName: "Labour Market Minimum Wage Diagram",
          axes: ["Wage Rate (W)", "Quantity of Labour (Q)"],
          curves: ["DL (Demand for Labour / MRP)", "SL (Supply of Labour)", "Wmin (Horizontal wage floor)"],
          shiftDescription: "Wmin is set above We. At Wmin, quantity supplied of labour (Qs) exceeds quantity demanded of labour (Qd).",
          equilibriumDescription: "Results in a surplus of labour / real-wage unemployment of (Qs - Qd).",
          marksAllocated: 2,
        },
        indicativePoints: [
          "Diagram: Correct axes (Wage Rate, Quantity of Labour) and intersecting DL and SL curves (1 mark).",
          "Diagram wage floor: Horizontal Wmin line above We, indicating Qd and Qs with unemployment surplus (1 mark).",
          "Explanation: Higher wage increases costs to employers, causing contraction of labour demand from Qe to Qd (1 mark).",
          "Impact: Higher wage attracts more workers into labour force expanding supply to Qs, generating excess labour supply / unemployment equal to (Qs - Qd) (1 mark).",
        ],
        markingGuide:
          "2 marks for diagram with Wmin above equilibrium and labelled surplus. 2 marks for analysis of labour contraction and expansion of supply. Total 4 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Labour market intervention and minimum wages",
      },
      {
        id: "9708_22_2023_on_1d",
        number: "1(d)",
        title: "Assess the extent to which increasing the national minimum wage will always reduce poverty in an economy. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Contextual Evaluation & Nuanced Balance",
            description:
              "Develops reasons why higher minimum wages alleviate poverty alongside critical counter-arguments (hours reductions, disemployment, cost-push inflation). Directly interrogates 'always' and reaches a justified conclusion.",
            evaluativeRequirement:
              "Evaluates 'always': points out that if minimum wages lead to unemployment (as in Table 1.1 where Country B has 18.5% youth unemployment), those laid off fall into deeper poverty.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Partial Balance",
            description: "Analyses positive income effects and negative job loss effects, but evaluation of 'always' is incomplete.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Descriptive assertions that higher pay stops poverty.",
          },
        ],
        indicativePoints: [
          "Arguments that it reduces poverty: Directly increases hourly earnings of low-paid workers, narrows income inequality, improves living standards and nutrition.",
          "Arguments that it does NOT always reduce poverty: Employers cut hours (underemployment); youth unemployment rises (18.5% in Country B); firms pass wage hikes onto consumers through higher food/retail prices (cost-push inflation erosion); many in extreme poverty are unemployed or retired and receive no benefit from wage legislation.",
          "Evaluation: A minimum wage will NOT 'always' reduce poverty. Its effectiveness depends upon the elasticity of labour demand, the rate of inflation, and complementary state welfare benefits.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Analysis of poverty reduction mechanisms and adverse labour market outcomes. AO3 Evaluation (up to 2 marks): Direct critical assessment of 'always'. Award 5-6 marks for balanced answers with justified conclusion. Max 6 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Poverty, income distribution and labour economics",
      },
      {
        id: "9708_22_2023_on_1e",
        number: "1(e)",
        title: "Consider whether governments should use transfer payments rather than minimum wages to support low-income households. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks",
            label: "Effective Comparative Evaluation & Policy Recommendation",
            description:
              "Develops balanced evaluation comparing transfer payments against minimum wages, explicitly considering fiscal feasibility, poverty targeting, work incentives, and business wage-cost pressure.",
            evaluativeRequirement:
              "Reaches a justified recommendation on whether targeted welfare transfers avoid the disemployment risks of statutory minimum wage hikes.",
          },
          {
            level: 2,
            marksRange: "3–4 marks",
            label: "Developed Analysis with Partial Evaluation",
            description: "Analyses advantages of both transfer payments and minimum wages, but evaluation of policy trade-offs is limited.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Descriptive comments comparing benefits or wage laws.",
          },
        ],
        indicativePoints: [
          "Transfer payments (universal credit, tax credits, child allowances): Directly targets households based on total family income rather than individual hourly pay; does not increase marginal costs of production for small businesses or destroy entry-level jobs.",
          "Drawbacks of transfer payments: High fiscal cost funded by taxation; potential disincentive to work / poverty traps if benefits are clawed back quickly.",
          "Evaluation: A combination is ideal — a modest minimum wage prevents employer exploitation while targeted working tax credits support families with dependents.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Comparative analysis of transfer payments vs statutory minimum wages. AO3 Evaluation (up to 2 marks): Balanced conclusion considering fiscal burden vs labour market efficiency.",
        extractLinkageExpected: true,
        syllabusTopic: "Transfer payments and fiscal redistribution",
      },
    ],
  },

  // ==========================================================================
  // PAPER 6: Cambridge A Level Economics 9708/42 October/November 2023
  // ==========================================================================
  {
    id: "9708_42_2023_on",
    title: "Cambridge A Level Economics 9708/42 — Section A: Currency Depreciation, Terms of Trade, and Sovereign Debt",
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualificationLevel: "a2",
    paperNumber: "42",
    examSeries: "2023_oct_nov",
    seriesLabel: "October/November 2023",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Exchange Rate Shocks and External Debt Burdens",
      paragraphs: [
        "In developing economies with floating exchange rates, external capital outflows often trigger severe downward pressure on national currencies. When foreign investors repatriate funds, foreign exchange reserves dwindle, leading to sharp depreciation of the domestic currency against the US dollar.",
        "Traditional textbook theory suggests that currency depreciation restores external balance by making exports cheaper in foreign currency and imports more expensive in domestic currency. However, developing countries frequently export primary agricultural commodities with low price elasticity of supply, while importing essential capital goods, pharmaceuticals, and refined fuels for which domestic demand is highly price inelastic.",
        "Crucially, many developing sovereign governments borrow externally in US dollars. When the domestic currency depreciates, the domestic cost of servicing dollar-denominated debt escalates substantially, draining fiscal revenues away from public infrastructure and health services.",
      ],
      tables: [
        {
          title: "Table 1.1: External Economic Indicators for Country M (2021–2023)",
          headers: ["Year", "Exchange Rate ($/local currency)", "Terms of Trade Index (2020=100)", "Current Account Balance (% of GDP)", "External Debt Servicing (% of Govt Revenue)"],
          rows: [
            ["2021", "1.00", "102.5", "-1.8%", "18.2%"],
            ["2022", "0.75", "91.2", "-4.5%", "27.4%"],
            ["2023", "0.60", "84.0", "-3.1%", "34.8%"],
          ],
          notes: "Source: Central Bank of Country M Economic Review 2023.",
        },
      ],
      sources: "Adapted from: World Bank Global Economic Prospects; IMF Sovereign Debt Monitor.",
    },
    questions: [
      {
        id: "9708_42_2023_on_1a",
        number: "1(a)",
        title: "Explain what is meant by the 'terms of trade' and calculate the change in Country M's terms of trade index between 2021 and 2023. [3]",
        maxMark: 3,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Terms of trade definition: The relative price of exports in terms of imports, calculated as (Index of export prices / Index of import prices) * 100 (1 mark).",
          "Calculation from Table 1.1: 2021 Index = 102.5; 2023 Index = 84.0.",
          "Change = 84.0 - 102.5 = -18.5 index points (or -18.05% reduction) (2 marks).",
        ],
        calculationGuidance: {
          formula: "Change = 84.0 - 102.5 = -18.5 points (deterioration)",
          correctAnswer: "-18.5 index points (or 18.05% decline)",
          ofrApplies: true,
        },
        markingGuide: "1 mark for definition. 2 marks for calculating -18.5 points change (or 18.05% fall). Total 3 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Terms of trade measurement and interpretation",
      },
      {
        id: "9708_42_2023_on_1b",
        number: "1(b)",
        title: "Analyse the consequences of domestic currency depreciation on Country M's external debt servicing. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 3, ao3: 0 },
        hasDiagramRequirement: false,
        indicativePoints: [
          "Mechanism: Sovereign debt is denominated in US dollars. When the local currency depreciates (falling from $1.00 in 2021 to $0.60 in 2023), more local currency is required to purchase each dollar for interest and principal repayment (2 marks).",
          "Consequence from data: External debt servicing surged from 18.2% of government revenue in 2021 to 34.8% in 2023, crowding out public investment in education and healthcare (2 marks).",
        ],
        markingGuide:
          "Up to 2 marks for causal mechanism of foreign currency debt servicing. Up to 2 marks for data application (18.2% to 34.8%) and opportunity cost on fiscal budget. Total 4 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Exchange rates and sovereign debt",
      },
      {
        id: "9708_42_2023_on_1c",
        number: "1(c)",
        title: "With the help of a J-curve diagram, explain the short-run and long-run effects of a currency depreciation on Country M's current account balance. [5]",
        maxMark: 5,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 1 },
        hasDiagramRequirement: true,
        diagramSpec: jCurveDiagram,
        diagramGuidance: {
          diagramName: "J-Curve Effect Diagram",
          axes: ["Time", "Current Account Balance (+ Surplus / - Deficit)"],
          curves: ["J-Curve trajectory", "Zero Trade Balance guideline"],
          shiftDescription: "Following depreciation, the current account initially deteriorates (deficit widens) before improving over time into surplus.",
          equilibriumDescription: "Short-run contracts worsen the deficit due to inelastic demand. Over the long run, elasticities adjust and the Marshall-Lerner condition holds.",
          marksAllocated: 2,
        },
        indicativePoints: [
          "Diagram: Correct axes (Time, Balance of Payments / Current Account) showing J-curve dip below line and subsequent rise (2 marks).",
          "Short-run effect: Import and export volumes are fixed by existing contracts; demand is price inelastic (PEDx + PEDm < 1), worsening the deficit (as seen in Table 1.1 in 2022 at -4.5%) (1 mark).",
          "Long-run effect: Consumers and firms substitute away from expensive imports toward cheaper domestic goods; export volumes expand as elasticity rises (PEDx + PEDm > 1), improving the balance (1 mark).",
        ],
        markingGuide:
          "2 marks for accurate J-curve diagram. 2 marks for explaining short-run contractual inelasticity. 1 mark for long-run elasticity adjustment. Total 5 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "J-curve effect and exchange rate adjustments",
      },
      {
        id: "9708_42_2023_on_1d",
        number: "1(d)",
        title: "Assess whether currency depreciation will always improve the trade balance of a developing country, taking into account the Marshall-Lerner condition. [8]",
        maxMark: 8,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 4 },
        hasDiagramRequirement: false,
        rubricLevels: [
          {
            level: 3,
            marksRange: "6–8 marks",
            label: "Effective Contextual Evaluation & Marshall-Lerner Rigour",
            description:
              "Clear, mathematically sound explanation of the Marshall-Lerner condition (PEDx + PEDm > 1). Contextual analysis of developing country structural trade constraints (inelastic commodity exports and essential imports). Reaches a justified conclusion directly addressing 'always'.",
            evaluativeRequirement:
              "Explicitly evaluates 'always': concludes that developing nations often fail the Marshall-Lerner condition in the medium term due to inelastic demand for essential imports and primary export quotas.",
          },
          {
            level: 2,
            marksRange: "3–5 marks",
            label: "Developed Analysis with Partial Evaluation",
            description: "Analyses relative price effects and mentions Marshall-Lerner, but application to developing country constraints is limited.",
          },
          {
            level: 1,
            marksRange: "1–2 marks",
            label: "Limited Points",
            description: "Simple statement that depreciation boosts exports.",
          },
        ],
        indicativePoints: [
          "Marshall-Lerner condition: Currency depreciation improves the trade balance only if the sum of price elasticities of demand for exports and imports is greater than one (PEDx + PEDm > 1).",
          "Developing country constraints: Exports are often raw primary agricultural commodities or minerals with low global price elasticity; imports consist of vital fuels, machinery, and food with near-zero short-run elasticity. Hence, PEDx + PEDm may be less than 1.",
          "Evaluation: Currency depreciation will NOT 'always' improve the trade balance. In developing economies, it frequently triggers imported cost-push inflation and severe debt distress without generating the export boom anticipated in developed economies.",
        ],
        markingGuide:
          "AO1/AO2 (up to 4 marks): Explanation of Marshall-Lerner condition and relative price mechanism. AO3 Evaluation (up to 4 marks): Balanced critique of 'always' using developing economy trade rigidities. Award 6-8 marks for rigorous analysis and justified conclusion. Max 8 marks.",
        extractLinkageExpected: true,
        syllabusTopic: "Marshall-Lerner condition and external balance",
      },
    ],
  },
];
