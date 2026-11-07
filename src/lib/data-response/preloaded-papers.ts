import type { DataResponsePaper } from "./types";
import {
  adAsRightwardShiftDiagram,
  evSubsidyDemandFallDiagram,
  minimumWageLabourDiagram,
  costPushInflationDiagram,
  jCurveDiagram,
  taxIncidenceDiagram,
  maxPriceCeilingDiagram,
  negativeExternalityDiagram,
  monopolyDeadweightDiagram,
  monopsonyLabourDiagram,
  tariffProtectionDiagram,
  forexAppreciationDiagram,
} from "./diagram-library";

export const PRELOADED_DATA_RESPONSE_PAPERS: DataResponsePaper[] = [
  {
    "id": "9708_22_2026_fm",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: The market for fast food",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2026_feb_march",
    "seriesLabel": "February/March 2026",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 The market for fast food",
      "paragraphs": [
        "\u2018Fast food\u2019 refers to highly processed meals rich in sugar, salt and saturated fats. A recent study noted eating fast food is accelerating mortality rates faster than smoking. Medical authorities are concerned fast food has become an everyday diet component for millions worldwide.",
        "In the United States, sales for a major global fast food chain rose 22% between 2019 and 2023 despite a 19% price hike. US disposable incomes rose 29% over the same period. Cash-rich but time-poor consumers increasingly favour convenience foods.",
        "Worldwide healthcare expenditure treating obesity-related heart disease and diabetes reached US$2 trillion. Absenteeism and reduced working hours create substantial lost earnings and reduced labour productivity.",
        "Economists classify fast food as a demerit good. Denmark introduced a fat tax in 2011 but repealed it after one year due to job losses. Colombia introduced a 10% fast-food tax in 2023 rising to 20% by 2025. In the US, where 5 million people work in fast food, employment concerns remain prominent."
      ],
      "sources": "Adapted from: WHO Obesity Report 2024; The Guardian 2023."
    },
    "sampleAnswers": {
      "1(a)(i)": "Income elasticity of demand (YED) measures the responsiveness of quantity demanded of a good to a change in consumer real income. Formula: YED = % change in quantity demanded / % change in income.",
      "1(a)(ii)": "Using paragraph 2, quantity demanded (sales) rose by 22% while disposable income rose by 29%. YED = +22% / +29% = +0.76. Because YED is positive and less than 1 (0 < YED < 1), an economist would classify fast food as a normal good (a necessity) with income-inelastic demand.",
      "1(b)": "A demerit good is a good that is overconsumed in a free market because consumers suffer from information failure, failing to perceive the true private health damage of consumption (or where marginal social cost exceeds marginal private cost). Fast food is considered a demerit good because consumers lack full knowledge of the severe health hazards such as diabetes, heart disease, and accelerating mortality rates. Furthermore, it imposes massive external costs on society, including US$2 trillion in worldwide healthcare expenditures and reduced labour productivity from employee absenteeism.",
      "1(c)": "An indirect tax (such as Colombia's 10% to 20% tax or Denmark's fat tax) increases the cost of production, shifting the market supply curve to the left. This raises market price, internalises negative health impacts, contracts quantity demanded, and raises tax revenue that can fund healthcare services. However, fast food demand is price and income inelastic (+0.76) due to high convenience for time-poor consumers, so consumption falls only marginally. The tax is also regressive, burdening low-income families, and can destroy employment as occurred in Denmark where the tax was repealed after job losses. Therefore, an indirect tax is not solely the best way; it is most effective when combined with subsidies on healthy options, mandatory calorific labelling, menu reformulation, and educational campaigns.",
      "1(d)": "A significant increase in unemployment is usually harmful to macroeconomic performance. It creates a deflationary output gap where actual GDP falls below potential GDP, leaving labour resources idle. Government finances deteriorate as income tax and VAT receipts decline while welfare transfer spending surges, worsening the fiscal deficit. Long-term unemployment also causes hysteresis, permanently eroding human capital and productivity. However, an increase in unemployment is not always harmful in every circumstance. In an overheating economy experiencing demand-pull inflation and wage-price spirals, a rise in unemployment dampens aggregate demand and cools wage inflation. In structural transitions, short-term unemployment frees up labour from declining sectors to reallocate into expanding, high-technology export industries. In conclusion, while sustained unemployment damages economic growth and living standards, it is not always harmful if it restores price stability in an overheating economy."
    },
    "questions": [
      {
        "id": "9708_22_2026_fm_1ai",
        "number": "1(a)(i)",
        "title": "With the help of a formula, define the term income elasticity of demand. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Formula: % change in quantity demanded / % change in income (1 mark)",
          "Definition: Measure of the responsiveness of demand to changes in real income (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "YED = %\u0394QD / %\u0394Y",
          "correctAnswer": "YED = %\u0394QD / %\u0394Y",
          "ofrApplies": false
        },
        "markingGuide": "Formula: %\u0394QD / %\u0394Y (1). Definition: Responsiveness of demand to income (1). Total 2 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Price, income and cross elasticities of demand"
      },
      {
        "id": "9708_22_2026_fm_1aii",
        "number": "1(a)(ii)",
        "title": "Using the information in the second paragraph, calculate the income elasticity of demand for fast food in the US between 2019 and 2023 and state how an economist would classify fast food based on this calculation. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Calculation: +22% / +29% = +0.76 (allow 0.758... or range 0.7 to 0.8) (1 mark)",
          "Classification: Normal good, necessity, OR income-inelastic good (0 < YED < 1) (1 mark)",
          "OFR applies: honor calculated figure for classification. Credit ANY valid classification option in full."
        ],
        "calculationGuidance": {
          "formula": "+22% / +29% = +0.76",
          "correctAnswer": "+0.76 (allow 0.7 to 0.8); Normal good / necessity / inelastic YED",
          "ofrApplies": true
        },
        "markingGuide": "Calculation: +22% / +29% = +0.76. Honor official guidance ranges: allow [0.7 to 0.8] or [0.75 to 0.76] (1 mark). Classification: allow 'normal good', 'necessity', OR 'inelastic YED' (1 mark). Credit ANY of those valid options in full. Own Figure Rule (OFR) applies. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "YED calculation and classification"
      },
      {
        "id": "9708_22_2026_fm_1b",
        "number": "1(b)",
        "title": "Explain what is meant by a demerit good and consider whether it is correct to \u2018refer to fast food as a demerit good\u2019. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Demerit good: Overconsumed due to information failure / lack of consumer information regarding health risks (or marginal social cost exceeding marginal private cost) (up to 2 marks)",
          "Application: Extract evidence showing accelerated mortality, heart disease, diabetes, US$2 trillion global healthcare burden, lost earnings and productivity losses (up to 2 marks)",
          "Official Cambridge Note: Do NOT expect reference to 3rd party effects or externalities if imperfect information / private health harm is explained. Never penalize a candidate for omitting external costs."
        ],
        "markingGuide": "Up to 2 marks for explanation of demerit good (overconsumed due to information failure / health damage / social cost > private cost). Up to 2 marks for extract application ($2 trillion health costs, absenteeism, diabetes). Crucial rule: Never penalize for omitting third-party effects or externalities if the candidate explains information failure / health damage. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Demerit goods and market failure"
      },
      {
        "id": "9708_22_2026_fm_1c",
        "number": "1(c)",
        "title": "Assess the extent to which introducing an indirect tax on fast food is the best way to reduce its consumption. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Evaluation in Context",
            "description": "Balanced assessment weighing indirect taxes against alternative policies (subsidies on healthy substitutes, education, calorie labelling), with a reasoned, context-specific conclusion directly addressing 'the best way'.",
            "evaluativeRequirement": "Weighs inelastic demand (+0.76), regressive impact on poor, and employment losses (Denmark) against tax revenue and internalising health costs, concluding with justification."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis showing how tax shifts supply and reduces demand, with one-sided or undeveloped evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links or context."
          }
        ],
        "indicativePoints": [
          "Tax shifts supply left, raises price, internalises external costs / health damage (analysis)",
          "Inelastic demand (+0.76) means consumption falls little; regressive impact on low-income groups; job losses (as in Denmark)",
          "Alternative policies: Subsidies on healthy substitutes, calorie labelling, menu reformulation, educational campaigns",
          "Credit sound alternative economic mechanisms (e.g. substitution effects, price elasticity of demand, derived demand, indirect tax incidence). Illustrative points (healthy options, calorific content, advertising bans) are acceptable without demanding unmentioned data.",
          "Evaluation: Tax is not solely the best way; most effective when paired with subsidies on healthy substitutes and information remedies."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks for balanced analysis of tax vs alternatives). AO3/AO4 Evaluation (up to 2 marks for reasoned conclusion on 'best way'). Require at least one argument on each side of the debate. Credit valid economic mechanisms (elasticity, incidence, substitution) and illustrative points (healthy options, calorie counts). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Indirect taxation and market failure"
      },
      {
        "id": "9708_22_2026_fm_1d",
        "number": "1(d)",
        "title": "Assess whether a significant increase in unemployment in an economy is always harmful to its macroeconomic performance. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Macroeconomic Evaluation",
            "description": "Balanced macroeconomic assessment critically evaluating the qualifier 'always harmful', weighing lost GDP and fiscal strain against dampening inflation and structural reallocation, with a reasoned conclusion.",
            "evaluativeRequirement": "Weighs loss of potential national output and fiscal tax deficit against curbing demand-pull inflation and facilitating sectoral labour shifts."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed macroeconomic analysis with one-sided or incomplete evaluation of 'always harmful'."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic macroeconomic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Harmful: Output gap / loss of real GDP, reduced income tax/VAT receipts, higher welfare benefits, hysteresis and human capital decay",
          "Nuance / Non-harmful: Reduces demand-pull wage pressure in an overheating economy, helps curb inflation towards target, frees scarce labour for expanding sectors",
          "Evaluation: Reasoned conclusion interrogating 'always harmful' — while harmful long-term to living standards, not always harmful short-term if cooling overheating or enabling structural transformation."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks for balanced macroeconomic analysis). AO3/AO4 Evaluation (up to 2 marks for reasoned judgment on 'always harmful'). Check exact sub-question text (macroeconomic focus). Balanced analysis required (harmful vs non-harmful). Reasoned conclusion required for Level 3. Total 6 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Consequences of unemployment"
      }
    ]
  },
  {
    "id": "9708_22_2024_mj",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Electric Vehicle Subsidies and Battery Supply Chains",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2024_may_june",
    "seriesLabel": "May/June 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Global Electric Vehicle Subsidies and Market Dynamics",
      "paragraphs": [
        "Governments across North America and Europe introduced large purchase subsidies for electric vehicles (EVs) to meet net-zero targets. Subsidies include consumer rebates, corporate fleet tax relief, and gigafactory grants.",
        "Between 2020 and 2024, average EV prices fell by 23.6% from $55,000 to $42,000. Demand surged by 160% in Europe and 110% in North America due to declining prices and high retail petrol costs.",
        "However, battery manufacturing requires heavy extraction of lithium and nickel, causing severe water pollution. Subsidising luxury vehicles also sparked equity concerns among low-income petrol car drivers."
      ],
      "tables": [
        {
          "title": "Table 1.1: EV Market Penetration & Subsidy Schemes (2024)",
          "headers": [
            "Region",
            "EV Market Share (%)",
            "Consumer Subsidy per EV ($)",
            "Lithium Battery Cost per kWh ($)",
            "Average Petrol Price ($/litre)"
          ],
          "rows": [
            [
              "European Union",
              "22.5%",
              "$5,200",
              "$135",
              "$1.95"
            ],
            [
              "United States",
              "9.8%",
              "$7,500",
              "$140",
              "$0.98"
            ],
            [
              "China",
              "36.0%",
              "$2,800",
              "$112",
              "$1.15"
            ],
            [
              "Norway",
              "82.0%",
              "$11,000 (Tax exemption)",
              "$132",
              "$2.35"
            ]
          ],
          "notes": "Source: IEA Global EV Outlook 2024."
        }
      ],
      "sources": "Adapted from: IEA Global EV Outlook 2024."
    },
    "questions": [
      {
        "id": "9708_22_2024_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in consumer subsidies per EV between the United States and China. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "US subsidy = $7,500; China subsidy = $2,800",
          "Difference = $7,500 - $2,800 = $4,700 (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "$7,500 - $2,800",
          "correctAnswer": "$4,700",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for $4,700. 1 mark for identifying both numbers.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Subsidy calculations"
      },
      {
        "id": "9708_22_2024_mj_1aii",
        "number": "1(a)(ii)",
        "title": "Using Table 1.1, calculate the difference in lithium battery cost per kWh between the United States and China. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "US cost = $140/kWh; China cost = $112/kWh",
          "Difference = $140 - $112 = $28 per kWh (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "$140 - $112",
          "correctAnswer": "$28",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for $28. 1 mark for identifying $140 and $112.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Input cost differentials"
      },
      {
        "id": "9708_22_2024_mj_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain how government subsidies on electric vehicles affect the market for petrol cars. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Substitute Demand Contraction Diagram",
          "axes": [
            "Price of Petrol Cars (P)",
            "Quantity of Petrol Cars (Q)"
          ],
          "curves": [
            "D\u2081",
            "D\u2082 (shifted left)",
            "S (supply of petrol cars)"
          ],
          "shiftDescription": "EV subsidies lower EV prices; EVs and petrol cars are substitutes (positive XED), shifting demand for petrol cars leftward from D\u2081 to D\u2082.",
          "equilibriumDescription": "Price falls from P\u2081 to P\u2082 and quantity traded contracts from Q\u2081 to Q\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Demand shifts leftward with lower price and quantity (2 marks)",
          "Explanation: Substitute goods in consumption with positive cross elasticity (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for substitute analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cross elasticity and substitute goods",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_22_2024_mj_1c",
        "number": "1(c)",
        "title": "Explain the difference between private costs and external costs with reference to the production of electric vehicles, and consider whether governments should tax lithium battery extraction. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Evaluative Synthesis on Market Failure",
            "description": "Clear distinction between private and external costs applied to EVs with balanced assessment of mining taxes.",
            "evaluativeRequirement": "Weighs polluter-pays principle against the danger of undermining clean transport adoption."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Private costs: Internal production costs (wages, machinery, materials at $112-$140/kWh)",
          "External costs: Third-party damage (water contamination, toxic run-off)",
          "Evaluation: Tax internalises externalities but raises EV costs."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Private vs external costs and environmental policy"
      },
      {
        "id": "9708_22_2024_mj_1d",
        "number": "1(d)",
        "title": "Assess whether subsidising electric vehicles is more effective than taxing petrol in reducing carbon emissions. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Policy Evaluation",
            "description": "Balanced comparison between EV subsidies and petrol taxes with justified recommendation.",
            "evaluativeRequirement": "Weighs fiscal opportunity costs ($5,200-$11,000/car) against regressive fuel tax burdens."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Subsidies: Accelerate technology adoption, scale economies, but high fiscal cost",
          "Fuel taxes: Polluter-pays revenue generation, but inelastic demand and regressive",
          "Evaluation: A revenue-neutral feebate or hybrid approach is optimal."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Government microeconomic policy evaluation"
      }
    ]
  },
  {
    "id": "9708_22_2023_on",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Minimum Wage Legislation and Youth Employment",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2023_oct_nov",
    "seriesLabel": "October/November 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Minimum Wage Policy in Low-Paid Sectors",
      "paragraphs": [
        "Statutory National Minimum Wages (NMW) protect vulnerable workers from low pay. In 2023, several governments raised statutory minimum rates to match inflation.",
        "In hospitality and retail, labour comprises up to 40% of overheads. Small employers argue mandatory wage hikes force hiring freezes and automation.",
        "Unions argue higher wages boost purchasing power, reduce turnover, and stimulate productivity. In monopsonistic labour markets, wage floors can expand employment."
      ],
      "tables": [
        {
          "title": "Table 1.1: Minimum Wage Rates & Youth Unemployment (2020 vs 2023)",
          "headers": [
            "Country",
            "Minimum Wage 2020 ($/hr)",
            "Minimum Wage 2023 ($/hr)",
            "% Increase in Min Wage",
            "Youth Unemployment Rate (%)"
          ],
          "rows": [
            [
              "Country A",
              "$9.50",
              "$12.00",
              "26.3%",
              "14.2%"
            ],
            [
              "Country B",
              "$11.00",
              "$14.30",
              "30.0%",
              "18.5%"
            ],
            [
              "Country C",
              "$7.25",
              "$7.25",
              "0.0%",
              "11.0%"
            ]
          ],
          "notes": "Source: National Ministry of Labour Statistical Databases."
        }
      ],
      "sources": "Adapted from: OECD Employment Outlook 2023."
    },
    "questions": [
      {
        "id": "9708_22_2023_on_1a",
        "number": "1(a)",
        "title": "Define the term 'minimum wage' and state one condition for it to be effective in a labour market. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Legally enforced floor rate of pay (1 mark)",
          "Condition: Must be set above the free-market equilibrium wage (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Legally mandated wage floor set above equilibrium",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for condition. Total 2 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Minimum wage legislation"
      },
      {
        "id": "9708_22_2023_on_1b",
        "number": "1(b)",
        "title": "Using Table 1.1, calculate the percentage increase in the statutory minimum wage for Country A between 2020 and 2023. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Calculation: (($12.00 - $9.50) / $9.50) * 100 = 26.32% (or 26.3%) (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "((12.00 - 9.50) / 9.50) * 100",
          "correctAnswer": "26.3% (or 26.32%)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 26.3%. 1 mark for $2.50 increase or correct formula.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Percentage calculations"
      },
      {
        "id": "9708_22_2023_on_1c",
        "number": "1(c)",
        "title": "With the help of a labour market diagram, explain the effect of setting a minimum wage above the equilibrium wage rate. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Labour Market Minimum Wage Diagram",
          "axes": [
            "Wage Rate (W)",
            "Quantity of Labour (Q)"
          ],
          "curves": [
            "DL",
            "SL",
            "Wmin (Wage floor)"
          ],
          "shiftDescription": "Wmin is set above We, causing quantity supplied of labour (Qs) to exceed quantity demanded (Qd).",
          "equilibriumDescription": "Real-wage unemployment surplus equal to (Qs - Qd) is created.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Wmin above We with labelled unemployment surplus (2 marks)",
          "Explanation: Contraction of labour demand and expansion of labour supply creates surplus (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Labour market price floors",
        "diagramSpec": minimumWageLabourDiagram
      },
      {
        "id": "9708_22_2023_on_1d",
        "number": "1(d)",
        "title": "Assess the extent to which increasing the national minimum wage will always reduce poverty in an economy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Contextual Evaluation of Poverty Reduction",
            "description": "Balanced assessment directly evaluating 'always' by exploring disemployment and cost-push inflation.",
            "evaluativeRequirement": "Evaluates whether rising youth unemployment (18.5% in Country B) leaves laid-off workers in deeper poverty."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Reduces poverty: Lifts hourly earnings, narrows inequality",
          "Does NOT always: Causes layoffs, hours cuts, cost-push inflation; excludes non-working poor",
          "Evaluation: Depends on elasticity of labour demand."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Poverty and income distribution"
      },
      {
        "id": "9708_22_2023_on_1e",
        "number": "1(e)",
        "title": "Consider whether governments should use transfer payments rather than minimum wages to support low-income households. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Welfare Tools",
            "description": "Balanced comparison between targeted fiscal transfers and statutory wage mandates with justified recommendation.",
            "evaluativeRequirement": "Weighs taxpayer fiscal costs against business cost pressures and disemployment risks."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Transfers: Targets household needs, avoids business cost inflation, protects jobs",
          "Limitations: High tax cost, poverty traps",
          "Evaluation: A combined policy prevents exploitation while supporting families."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Transfer payments vs price controls"
      }
    ]
  },
  {
    "id": "9708_21_2024_on",
    "title": "Cambridge AS Level Economics 9708/21 \u2014 Section A: Sugar Taxes and Soft Drink Reformulation",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "21",
    "examSeries": "2024_oct_nov",
    "seriesLabel": "October/November 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Taxation of Sugar-Sweetened Beverages",
      "paragraphs": [
        "To curb childhood dental disease and diabetes, governments introduced tiered soft drink levies. The UK taxed drinks exceeding 5g sugar per 100ml at \u00a30.18/litre and above 8g at \u00a30.24/litre.",
        "Following the levy, soft drink sugar content fell 44% as manufacturers reformulated recipes. However, sales of high-sugar energy drinks remained resilient due to brand loyalty and price inelastic demand.",
        "Campaigners advocate combining fiscal levies with digital junk food advertising bans and physical recreation subsidies."
      ],
      "tables": [
        {
          "title": "Table 1.1: Sugar Content and Retail Price Changes (2018\u20132024)",
          "headers": [
            "Drink Category",
            "Average Sugar per 100ml (2018)",
            "Average Sugar per 100ml (2024)",
            "% Change in Sugar Content",
            "Retail Price Change (%)"
          ],
          "rows": [
            [
              "Carbonated Colas",
              "10.6g",
              "4.8g",
              "-54.7%",
              "+12.5%"
            ],
            [
              "Energy Drinks",
              "12.4g",
              "10.1g",
              "-18.5%",
              "+22.0%"
            ],
            [
              "Fruit Juices (Exempt)",
              "9.2g",
              "9.1g",
              "-1.1%",
              "+8.0%"
            ]
          ],
          "notes": "Source: UK Department of Health and Social Care Annual Evaluation."
        }
      ],
      "sources": "Adapted from: BMJ Public Health Analysis 2024."
    },
    "questions": [
      {
        "id": "9708_21_2024_on_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in the retail price change between Energy Drinks and Carbonated Colas. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Energy Drinks = +22.0%; Carbonated Colas = +12.5%",
          "Difference = 22.0% - 12.5% = 9.5 percentage points (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "22.0% - 12.5%",
          "correctAnswer": "9.5% (or 9.5 percentage points)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 9.5%. 1 mark for identifying both figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price changes and data analysis"
      },
      {
        "id": "9708_21_2024_on_1aii",
        "number": "1(a)(ii)",
        "title": "Define the term 'specific tax' and give one example from the extract. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Fixed monetary tax levied per physical unit sold (1 mark)",
          "Extract example: \u00a30.18 or \u00a30.24 per litre on soft drinks (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Fixed sum per unit (e.g. \u00a30.18/litre)",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for extract example. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Specific vs ad valorem indirect taxes"
      },
      {
        "id": "9708_21_2024_on_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain how a specific tax on sugary drinks affects consumer surplus and producer surplus. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Tax Incidence Diagram",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "Demand",
            "S\u2081",
            "S\u2082 (Tax shift)"
          ],
          "shiftDescription": "Supply shifts vertically upwards by the tax amount, raising price from P\u2081 to P\u2082 and contracting quantity from Q\u2081 to Q\u2082.",
          "equilibriumDescription": "Both consumer surplus and producer surplus shrink, generating tax revenue and a deadweight loss.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Supply shifts upwards by tax with higher price and lower quantity (2 marks)",
          "Consumer surplus: Falls as buyers pay higher price P2 (1 mark)",
          "Producer surplus: Falls as net revenue per unit received declines (1 mark)"
        ],
        "markingGuide": "2 marks for diagram. 1 mark for consumer surplus loss. 1 mark for producer surplus loss. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Tax incidence and consumer/producer surplus",
        "diagramSpec": taxIncidenceDiagram
      },
      {
        "id": "9708_21_2024_on_1c",
        "number": "1(c)",
        "title": "Analyse whether the burden of a sugar tax falls primarily on consumers or producers, considering the price elasticity of demand. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Contextual Evaluation of Tax Incidence",
            "description": "Rigorous analysis linking price elasticity of demand to tax burden allocation in context.",
            "evaluativeRequirement": "Evaluates how manufacturer reformulation (down 54.7% for colas) eliminates the tax burden entirely."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Inelastic demand (PED < 1): Consumers bear majority of tax burden as price rises significantly",
          "Elastic demand (PED > 1): Producers absorb tax to protect sales volume",
          "Extract context: Reformulation enabled cola makers to bypass the levy."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price elasticity of demand and tax incidence"
      },
      {
        "id": "9708_21_2024_on_1d",
        "number": "1(d)",
        "title": "Assess whether advertising bans are more effective than taxation in reducing the consumption of demerit goods. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Regulatory vs Fiscal Policy",
            "description": "Balanced comparison between non-price advertising restrictions and price mechanism taxes.",
            "evaluativeRequirement": "Weighs tax revenue generation against targeted behavioural protection of young demographics."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Advertising bans: Reduces information failure and demand without regressive living cost hikes",
          "Taxation: Generates fiscal revenue and directly forces manufacturers to reformulate recipes",
          "Evaluation: A combined policy addressing both price and marketing is most effective."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Microeconomic intervention: Regulation vs taxation"
      }
    ]
  },
  {
    "id": "9708_22_2024_fm",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Rice Export Restrictions and Global Food Security",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2024_feb_march",
    "seriesLabel": "February/March 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Export Restrictions in Agricultural Markets",
      "paragraphs": [
        "In 2023, India\u2014accounting for 40% of global rice trade\u2014banned exports of non-basmati white rice to guarantee domestic supply and curb retail food inflation.",
        "The ban triggered panic buying in West Africa and Asia, driving global rice benchmark prices to 15-year highs ($650/tonne). Domestically, wholesale prices stabilised, protecting urban families.",
        "However, Indian farmers lost revenue because domestic prices stayed 30% below world parity. Export restrictions also prompted retaliatory trade actions."
      ],
      "tables": [
        {
          "title": "Table 1.1: World Rice Export Shares and Price Changes (2023\u20132024)",
          "headers": [
            "Country",
            "Global Export Share (%)",
            "Domestic Wholesale Price ($/tonne)",
            "Export Price ($/tonne)",
            "Paddy Output Growth (%)"
          ],
          "rows": [
            [
              "India",
              "40.5%",
              "$380",
              "Banned ($650 pre-ban)",
              "-4.2%"
            ],
            [
              "Thailand",
              "15.2%",
              "$580",
              "$640",
              "+2.1%"
            ],
            [
              "Vietnam",
              "13.8%",
              "$570",
              "$635",
              "+1.8%"
            ],
            [
              "Pakistan",
              "8.5%",
              "$540",
              "$610",
              "+5.5%"
            ]
          ],
          "notes": "Source: UN Food and Agriculture Organization (FAO) Rice Price Monitor."
        }
      ],
      "sources": "Adapted from: FAO Rice Market Monitor 2024."
    },
    "questions": [
      {
        "id": "9708_22_2024_fm_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the combined global export market share of Thailand and Vietnam. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Thailand = 15.2%; Vietnam = 13.8%",
          "Calculation: 15.2% + 13.8% = 29.0% (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "15.2% + 13.8%",
          "correctAnswer": "29.0%",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 29.0%. 1 mark for identifying 15.2% and 13.8%.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Export market shares"
      },
      {
        "id": "9708_22_2024_fm_1aii",
        "number": "1(a)(ii)",
        "title": "Define the term 'opportunity cost' and apply it to a farmer deciding to grow rice instead of wheat. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Next best alternative foregone when an economic decision is made (1 mark)",
          "Application: The profit or harvest foregone from wheat cultivation (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Next best alternative foregone",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for wheat application. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Opportunity cost"
      },
      {
        "id": "9708_22_2024_fm_1b",
        "number": "1(b)",
        "title": "With the help of a domestic demand and supply diagram, explain the effect of an export ban on domestic price and quantity of rice. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Export Ban Domestic Supply Retention",
          "axes": [
            "Price of Rice (P)",
            "Quantity of Rice (Q)"
          ],
          "curves": [
            "Domestic Demand",
            "Domestic Supply",
            "World Price Line (Pw)"
          ],
          "shiftDescription": "Export ban traps supply domestically, forcing market price down from high world price Pw ($650) to lower domestic equilibrium Pe ($380).",
          "equilibriumDescription": "Domestic quantity consumed expands while farmer producer surplus contracts.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Fall from world price Pw to domestic equilibrium Pe (2 marks)",
          "Explanation: Supply retained domestically drives price down to $380, helping consumers (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic explanation. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Trade restrictions and domestic price levels",
        "diagramSpec": maxPriceCeilingDiagram
      },
      {
        "id": "9708_22_2024_fm_1c",
        "number": "1(c)",
        "title": "Analyse the trade-off faced by the government between protecting low-income urban consumers and preserving farmer livelihoods. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Contextual Evaluation of Policy Trade-Offs",
            "description": "Balanced assessment weighing urban food affordability against rural agricultural incomes.",
            "evaluativeRequirement": "Evaluates long-run consequences: low domestic prices cause farmers to cut fertilizer and planting, risking future shortages."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Urban consumers: Low prices protect real purchasing power against malnutrition",
          "Farmers: 30% price discount depresses rural farm earnings and disincentivises planting",
          "Evaluation: Suppressing prices buys short-term urban calm but endangers long-term food security."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Government policy trade-offs"
      },
      {
        "id": "9708_22_2024_fm_1d",
        "number": "1(d)",
        "title": "Assess whether a buffer stock scheme is a better policy than trade restrictions to stabilise agricultural prices. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Price Stabilisation",
            "description": "Balanced comparison between buffer stock schemes and export bans.",
            "evaluativeRequirement": "Weighs grain storage and deterioration costs against trade disruption caused by export embargoes."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Buffer stocks: Buys surplus and sells in drought; protects farm incomes without export friction",
          "Limitations: High storage/spoilage costs; running out of grain in multi-year drought",
          "Evaluation: Buffer stocks avoid international price spikes but require disciplined fiscal management."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Buffer stocks and agricultural price stabilisation"
      }
    ]
  },
  {
    "id": "9708_23_2024_mj",
    "title": "Cambridge AS Level Economics 9708/23 \u2014 Section A: High-Speed Rail Infrastructure and Regional Disparities",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "23",
    "examSeries": "2024_may_june",
    "seriesLabel": "May/June 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Economics of Mega-Transport Infrastructure",
      "paragraphs": [
        "Governments invest in high-speed rail (HSR) networks to bridge regional productivity divides and shift passenger traffic from polluting domestic aviation to rail.",
        "Mega-projects suffer large budget overruns. A flagship high-speed rail line saw projected costs balloon from $35 billion to $78 billion, prompting debates on fiscal return on capital.",
        "Advocates highlight external benefits: reduced highway congestion, lower carbon emissions, and business agglomeration in secondary industrial cities."
      ],
      "tables": [
        {
          "title": "Table 1.1: Transport Mode Costs & Carbon Emissions (2024)",
          "headers": [
            "Transport Mode",
            "Average Ticket Price ($/100km)",
            "CO2 Emissions (g/passenger-km)",
            "Average Journey Speed (km/h)",
            "Public Subsidy per Passenger ($)"
          ],
          "rows": [
            [
              "High-Speed Rail",
              "$24.50",
              "14g",
              "280 km/h",
              "$8.20"
            ],
            [
              "Domestic Aviation",
              "$42.00",
              "185g",
              "750 km/h",
              "$1.50 (Fuel tax waiver)"
            ],
            [
              "Highway Passenger Car",
              "$18.00",
              "110g",
              "110 km/h",
              "$0.00"
            ]
          ],
          "notes": "Source: International Union of Railways (UIC) Environmental Report."
        }
      ],
      "sources": "Adapted from: European Transport Infrastructure Review 2024."
    },
    "questions": [
      {
        "id": "9708_23_2024_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in CO2 emissions per passenger-km between domestic aviation and high-speed rail. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Domestic aviation = 185g; Rail = 14g",
          "Difference = 185g - 14g = 171g per passenger-km (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "185g - 14g",
          "correctAnswer": "171g (or 171g/km)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 171g. 1 mark for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Transport emissions data"
      },
      {
        "id": "9708_23_2024_mj_1aii",
        "number": "1(a)(ii)",
        "title": "State what is meant by a 'merit good' and give one reason why transport infrastructure exhibits merit good characteristics. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Good providing positive social benefits that would be underconsumed in a free market (1 mark)",
          "Reason: Consumers undervalue societal environmental and congestion reduction benefits (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Underconsumed good with positive externalities",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for rail reason. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Merit goods and externalities"
      },
      {
        "id": "9708_23_2024_mj_1b",
        "number": "1(b)",
        "title": "With the help of a positive externality diagram, explain why high-speed rail is under-provided in a free market. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Positive Externality in Consumption Diagram",
          "axes": [
            "Cost / Benefit / Price",
            "Quantity of Rail Travel (Q)"
          ],
          "curves": [
            "MPB",
            "MSB (above MPB)",
            "MPC = MSC"
          ],
          "shiftDescription": "External benefits (decongestion, lower emissions) mean MSB exceeds MPB, causing free-market output Qm to fall short of social optimum Qopt.",
          "equilibriumDescription": "Under-consumption and welfare loss triangle of (Qopt - Qm).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: MSB curve above MPB with Qm < Qopt (2 marks)",
          "Explanation: Private travellers ignore external benefits, leading to free market under-provision (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Positive externalities in consumption",
        "diagramSpec": negativeExternalityDiagram
      },
      {
        "id": "9708_23_2024_mj_1c",
        "number": "1(c)",
        "title": "Assess whether state subsidisation of rail fares ($8.20 per passenger) is justified on economic efficiency grounds. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Evaluative Synthesis on Subsidies",
            "description": "Balanced assessment weighing internalisation of positive externalities against government fiscal failure.",
            "evaluativeRequirement": "Weighs taxpayer cost ($8.20/passenger on $78bn project) against environmental efficiency gains."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Justifications: Lowers fares, shifts passengers from aviation/cars, moves output towards Qopt",
          "Drawbacks: High opportunity cost to taxpayers, subsidises wealthier business passengers",
          "Evaluation: Subsidies improve allocative efficiency but must be combined with road pricing."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Subsidies and allocative efficiency"
      },
      {
        "id": "9708_23_2024_mj_1d",
        "number": "1(d)",
        "title": "Assess the extent to which investing in national infrastructure projects will always reduce regional economic inequality. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Contextual Evaluation of Regional Development",
            "description": "Critically interrogates 'always' by exploring backwash effects versus regional spread effects.",
            "evaluativeRequirement": "Evaluates whether transport links pull skilled graduates and commerce into the capital city."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Reduces inequality: Lowers transport costs, attracts firms to low-rent secondary cities",
          "Backwash effect: Skilled labour and retail expenditure leak back to the metropolis faster",
          "Evaluation: Infrastructure alone will not 'always' reduce disparity without complementary regional business tax relief."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Regional policy and infrastructure"
      }
    ]
  },
  {
    "id": "9708_21_2023_mj",
    "title": "Cambridge AS Level Economics 9708/21 \u2014 Section A: Maritime Container Shipping and Supply Chain Bottlenecks",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "21",
    "examSeries": "2023_may_june",
    "seriesLabel": "May/June 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Global Maritime Freight Rates and Price Volatility",
      "paragraphs": [
        "Over 80% of global goods trade travels by sea. Container shipping has fixed vessel fleets, multi-year shipyard build times, and inelastic supply.",
        "When post-lockdown demand rebounded, port congestion immobilized 12% of container capacity. Spot rates jumped from $1,800 to over $11,000.",
        "As an intermediate service, ocean freight costs passed directly into import costs, accelerating global cost-push inflation."
      ],
      "tables": [
        {
          "title": "Table 1.1: Spot Container Freight Rates & Port Dwell Times (2020\u20132023)",
          "headers": [
            "Trade Route",
            "Pre-Crisis Rate ($/FEU)",
            "Peak Crisis Rate ($/FEU)",
            "% Rate Increase",
            "Average Port Dwell Time (Days)"
          ],
          "rows": [
            [
              "Shanghai to Rotterdam",
              "$1,750",
              "$14,500",
              "+728.6%",
              "9.8 days"
            ],
            [
              "Shanghai to Los Angeles",
              "$1,900",
              "$12,200",
              "+542.1%",
              "12.4 days"
            ],
            [
              "Rotterdam to New York",
              "$2,100",
              "$6,800",
              "+223.8%",
              "4.2 days"
            ]
          ],
          "notes": "Source: Drewry World Container Index."
        }
      ],
      "sources": "Adapted from: UNCTAD Maritime Review 2023."
    },
    "questions": [
      {
        "id": "9708_21_2023_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the absolute monetary difference between the peak rate and the pre-crisis rate for the Shanghai to Rotterdam route. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Peak = $14,500; Pre-crisis = $1,750",
          "Difference = $14,500 - $1,750 = $12,750 (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "$14,500 - $1,750",
          "correctAnswer": "$12,750",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for $12,750. 1 mark for identifying both numbers.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Freight rate data"
      },
      {
        "id": "9708_21_2023_mj_1aii",
        "number": "1(a)(ii)",
        "title": "Explain what is meant by 'derived demand' and apply it to container shipping services. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Demand for a service that arises from demand for the final goods it transports (1 mark)",
          "Application: Ocean shipping is demanded because consumers demand imported manufactured goods (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Demand derived from final consumer goods",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for shipping context. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Derived demand"
      },
      {
        "id": "9708_21_2023_mj_1b",
        "number": "1(b)",
        "title": "With the help of a supply and demand diagram, explain why inelastic supply causes extreme price volatility in maritime shipping when demand increases. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Inelastic Supply Demand Surge Diagram",
          "axes": [
            "Freight Rate (P)",
            "Quantity of Containers (Q)"
          ],
          "curves": [
            "D\u2081",
            "D\u2082 (shifted right)",
            "Inelastic Supply (steep PES < 1)"
          ],
          "shiftDescription": "Ship capacity is physically fixed in the short run; outward demand shift leads to massive freight rate jump with minimal quantity expansion.",
          "equilibriumDescription": "Rate jumps from P\u2081 to P\u2082 while quantity expands only slightly from Q\u2081 to Q\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Steep supply curve with rightward demand shift showing large price jump (2 marks)",
          "Explanation: Fixed vessel capacity in short run causes buyers to bid up spot freight rates (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis of inelastic supply. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price elasticity of supply and price instability",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_21_2023_mj_1c",
        "number": "1(c)",
        "title": "Analyse the transmission mechanism through which higher container shipping rates cause cost-push inflation in an importing economy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Cost-Push Transmission",
            "description": "Clear step-by-step causal chain linking shipping rate surges to component costs, retail prices, and CPI inflation.",
            "evaluativeRequirement": "Weighs import dependency and the elasticity of final consumer goods demand."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Freight costs raise unit variable costs of importing firms",
          "Firms pass cost increases to retail prices to maintain profit margins",
          "SRAS shifts leftward, generating cost-push inflation and wage demands"
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cost-push inflation transmission"
      },
      {
        "id": "9708_21_2023_mj_1d",
        "number": "1(d)",
        "title": "Assess whether government investment in port automation and logistics infrastructure is the best policy to prevent future supply chain shocks. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Supply-Side Policies",
            "description": "Evaluates port automation against domestic reshoring and strategic inventory reserves.",
            "evaluativeRequirement": "Weighs long-run supply capacity expansion against dockworker union strikes and high capital costs."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Port automation: Speeds up container turnaround (dwell times 12.4 days), expands throughput",
          "Limitations: Multi-year lead times, union strikes, doesn't prevent chokepoint canal closures",
          "Alternatives: Reshoring critical manufacturing, strategic stockpiles",
          "Evaluation: Must combine port upgrades with supplier diversification."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Supply-side infrastructure policy"
      }
    ]
  },
  {
    "id": "9708_22_2023_fm",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Plastic Packaging Taxes and the Circular Economy",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2023_feb_march",
    "seriesLabel": "February/March 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Environmental Taxation and Single-Use Plastics",
      "paragraphs": [
        "Non-recycled single-use plastics cause long-term environmental degradation, marine ecosystem damage, and microplastic contamination. Less than 15% of plastic packaging is recycled globally.",
        "The UK and EU introduced virgin plastic packaging taxes of \u00a3200 to \u20ac450 per tonne on packaging with less than 30% recycled content. The tax aims to stimulate demand for recycled polymer substitutes.",
        "However, food processors face shortages of food-grade recycled resins, forcing them to absorb the tax or pass costs to consumers during high food inflation."
      ],
      "tables": [
        {
          "title": "Table 1.1: Packaging Tax Rates & Recycled Content Share (2023)",
          "headers": [
            "Jurisdiction",
            "Plastic Tax Rate ($/tonne)",
            "Recycled Polymer Price ($/tonne)",
            "Virgin Polymer Price ($/tonne)",
            "Recycling Rate (%)"
          ],
          "rows": [
            [
              "United Kingdom",
              "$250",
              "$1,450",
              "$1,200",
              "44.2%"
            ],
            [
              "European Union",
              "$400",
              "$1,520",
              "$1,180",
              "41.0%"
            ],
            [
              "United States (No Tax)",
              "$0",
              "$1,380",
              "$1,150",
              "18.5%"
            ]
          ],
          "notes": "Source: European Plastics Recyclers Association."
        }
      ],
      "sources": "Adapted from: OECD Global Plastics Outlook 2023."
    },
    "questions": [
      {
        "id": "9708_22_2023_fm_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in the plastic tax rate per tonne between the European Union and the United Kingdom. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "EU tax = $400; UK tax = $250",
          "Difference = $400 - $250 = $150 per tonne (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "$400 - $250",
          "correctAnswer": "$150",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for $150. 1 mark for identifying both figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Tax rate comparison"
      },
      {
        "id": "9708_22_2023_fm_1aii",
        "number": "1(a)(ii)",
        "title": "Define the term 'negative externality of production' and identify one example from the extract. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Cost imposed on third parties outside the market transaction resulting from production (1 mark)",
          "Example: Marine ecosystem damage or microplastic contamination (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Third-party spillover cost (marine pollution)",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for extract example. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Negative externalities of production"
      },
      {
        "id": "9708_22_2023_fm_1b",
        "number": "1(b)",
        "title": "With the help of a negative externality diagram, explain how a packaging tax corrects market failure in the plastics market. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Negative Production Externality Tax Diagram",
          "axes": [
            "Cost / Benefit / Price",
            "Quantity of Virgin Plastic (Q)"
          ],
          "curves": [
            "MPB = MSB",
            "MPC",
            "MSC (above MPC)"
          ],
          "shiftDescription": "A tax equal to marginal external cost shifts MPC upwards to align with MSC.",
          "equilibriumDescription": "Output contracts from free-market level Qm to social optimum Qopt, eliminating deadweight welfare loss.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Shows MPC shifting up towards MSC, moving output from Qm to Qopt (2 marks)",
          "Explanation: Tax internalises the externality by making polluters pay for waste disposal (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Internalising negative externalities",
        "diagramSpec": negativeExternalityDiagram
      },
      {
        "id": "9708_22_2023_fm_1c",
        "number": "1(c)",
        "title": "Analyse the impact of higher packaging taxes on food manufacturers' operating costs and consumer food prices. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Cost Transmission & Incidence",
            "description": "Clear analysis of how packaging levies raise food processing costs and consumer prices.",
            "evaluativeRequirement": "Weighs price elasticity of demand for essential foodstuffs against packaging cost share."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Recycled polymer price premium ($1,450 vs $1,200) plus tax raises packaging costs",
          "Food demand is price-inelastic, enabling processors to pass cost hikes to retail prices",
          "Exacerbates regressive cost-of-living pressures during food inflation."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cost transmission and food prices"
      },
      {
        "id": "9708_22_2023_fm_1d",
        "number": "1(d)",
        "title": "Assess whether outright bans on single-use plastics are more effective than packaging taxes in protecting the environment. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Bans vs Taxes",
            "description": "Balanced comparison between regulatory bans and fiscal packaging taxes with justified conclusion.",
            "evaluativeRequirement": "Weighs immediate waste elimination against substitution to carbon-heavy alternatives (glass, aluminium, paper)."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Bans: Guaranteed elimination of plastic waste, clear legal enforcement",
          "Drawbacks of bans: Food spoilage, heavier paper/glass alternatives generate higher transport emissions",
          "Taxes: Generates revenue, creates ongoing incentive to recycle (recycling rate 44.2% in UK vs 18.5% in US)",
          "Evaluation: Bans on non-essential items plus taxes on food packaging is the best mix."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Environmental regulation vs economic instruments"
      }
    ]
  },
  {
    "id": "9708_21_2023_on",
    "title": "Cambridge AS Level Economics 9708/21 \u2014 Section A: Rent Control and Housing Affordability",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "21",
    "examSeries": "2023_oct_nov",
    "seriesLabel": "October/November 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Price Ceilings in Urban Rental Markets",
      "paragraphs": [
        "Urban housing affordability has deteriorated across European capitals as rental costs consume over 40% of average tenant wages. In response, municipal authorities instituted strict rent caps (Mietendeckel).",
        "While rent caps shielded existing tenants, housing supply contracted sharply. Landlords withdrew rental listings, converted flats into freehold sales, or deferred property maintenance.",
        "Economists emphasize that rent ceilings treat price symptoms rather than the root cause: inelastic housing supply caused by strict zoning laws."
      ],
      "tables": [
        {
          "title": "Table 1.1: Rental Market Indicators (Berlin vs Unregulated Cities 2021\u20132023)",
          "headers": [
            "City / Regime",
            "Average Capped Rent (\u20ac/sqm)",
            "Free Market Market Rent (\u20ac/sqm)",
            "Rental Listing Volume Change (%)",
            "New Housing Completions"
          ],
          "rows": [
            [
              "Berlin (Rent Capped)",
              "\u20ac9.80",
              "\u20ac14.00",
              "-57.5%",
              "12,400"
            ],
            [
              "Munich (Unregulated)",
              "\u20ac18.50",
              "\u20ac18.50",
              "+4.2%",
              "18,200"
            ],
            [
              "Frankfurt (Partial Cap)",
              "\u20ac14.20",
              "\u20ac15.80",
              "-18.0%",
              "14,100"
            ]
          ],
          "notes": "Source: German Federal Statistical Office (Destatis)."
        }
      ],
      "sources": "Adapted from: DIW Berlin Economic Bulletin 2023."
    },
    "questions": [
      {
        "id": "9708_21_2023_on_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the monetary gap between the free-market rent and the capped rent per square metre in Berlin. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Market rent = \u20ac14.00; Capped rent = \u20ac9.80",
          "Gap = \u20ac14.00 - \u20ac9.80 = \u20ac4.20 per sqm (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "\u20ac14.00 - \u20ac9.80",
          "correctAnswer": "\u20ac4.20",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for \u20ac4.20. 1 mark for identifying both figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price gap calculations"
      },
      {
        "id": "9708_21_2023_on_1aii",
        "number": "1(a)(ii)",
        "title": "Define the term 'maximum price' (price ceiling) and state one condition for it to be legally binding. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Legally enforced maximum price above which sellers cannot charge (1 mark)",
          "Condition: Must be set BELOW the free-market equilibrium price (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Price ceiling set below equilibrium",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for condition. Total 2 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Maximum price legislation"
      },
      {
        "id": "9708_21_2023_on_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain why rent control causes a shortage in the rental housing market. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Rental Housing Price Ceiling Diagram",
          "axes": [
            "Rent Price (P)",
            "Quantity of Rental Flats (Q)"
          ],
          "curves": [
            "Demand",
            "Supply",
            "Pmax (Capped rent)"
          ],
          "shiftDescription": "Pmax is set below equilibrium Pe, expanding quantity demanded to Qd while contracting quantity supplied to Qs.",
          "equilibriumDescription": "A permanent housing shortage of (Qd - Qs) is generated.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Pmax below Pe showing excess demand shortage (Qd - Qs) (2 marks)",
          "Explanation: Lower rent discourages landlords from listing flats (Qs drops -57.5%) while attracting tenants (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Maximum prices and housing shortages",
        "diagramSpec": maxPriceCeilingDiagram
      },
      {
        "id": "9708_21_2023_on_1c",
        "number": "1(c)",
        "title": "Analyse the unintended microeconomic consequences of rent controls on housing quality and shadow rental markets. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Unintended Consequences",
            "description": "Rigorous examination of non-price rationing, deferred maintenance, black market key-money, and landlord flight.",
            "evaluativeRequirement": "Weighs benefits to incumbent tenants against exclusion of new immigrants and young movers."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Housing quality deteriorates as landlords defer repairs when rental yields collapse",
          "Shadow markets emerge (illegal side payments, exorbitant key fees)",
          "Queue rationing: Landlords pick tenants based on credit/connections rather than need."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Unintended consequences of price controls"
      },
      {
        "id": "9708_21_2023_on_1d",
        "number": "1(d)",
        "title": "Assess whether direct government construction of social housing is a better policy than rent controls to solve urban housing crises. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Housing Policies",
            "description": "Balanced comparison between supply-side social housing building and price-ceiling regulations.",
            "evaluativeRequirement": "Weighs municipal fiscal capital constraints and multi-year construction lags against market distortions."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Social housing: Directly tackles shortage, shifts supply curve rightward, lowers equilibrium rent naturally",
          "Limitations: Colossal fiscal cost, land scarcity, slow planning approval",
          "Rent controls: Immediate relief without state spending, but shrinks supply",
          "Evaluation: Supply expansion is fundamentally superior for long-term equilibrium."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Supply-side housing intervention"
      }
    ]
  },
  {
    "id": "9708_22_2022_mj",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Global Semiconductor Shortages and Automotive Supply Chains",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2022_may_june",
    "seriesLabel": "May/June 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Bottlenecks in Advanced Microchip Manufacturing",
      "paragraphs": [
        "Modern motor vehicles require up to 3,000 semiconductor chips for engine timing, navigation, and safety brakes. Following factory shutdowns, a worldwide chip shortfall forced automakers to idle assembly plants.",
        "Global car production dropped by 11.3 million vehicles, creating severe used-car price inflation. Building advanced fabrication plants ('fabs') requires $15 billion and three years of engineering.",
        "Governments in the US and Europe passed multi-billion subsidy packages (CHIPS Acts) to lure semiconductor foundries and secure strategic domestic supply."
      ],
      "tables": [
        {
          "title": "Table 1.1: Chip Lead Times & Vehicle Production Loss (2021\u20132022)",
          "headers": [
            "Region",
            "Average Chip Lead Time (Weeks)",
            "Vehicle Output Loss (Units)",
            "Chip Import Dependency (%)",
            "Used Car Price Inflation (%)"
          ],
          "rows": [
            [
              "North America",
              "21.0 weeks",
              "3,100,000",
              "88.0%",
              "+37.5%"
            ],
            [
              "Europe",
              "22.5 weeks",
              "2,900,000",
              "92.0%",
              "+28.4%"
            ],
            [
              "East Asia (Foundries)",
              "14.0 weeks",
              "1,200,000",
              "22.0%",
              "+8.2%"
            ]
          ],
          "notes": "Source: AutoForecast Solutions; Gartner Semiconductor Monitor."
        }
      ],
      "sources": "Adapted from: Financial Times Special Report on Semiconductors 2022."
    },
    "questions": [
      {
        "id": "9708_22_2022_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in average chip lead times between Europe and East Asia. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Europe lead time = 22.5 weeks; East Asia = 14.0 weeks",
          "Difference = 22.5 - 14.0 = 8.5 weeks (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "22.5 - 14.0",
          "correctAnswer": "8.5 weeks",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 8.5 weeks. 1 mark for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Lead time calculations"
      },
      {
        "id": "9708_22_2022_mj_1aii",
        "number": "1(a)(ii)",
        "title": "Define 'price elasticity of supply' and identify one factor that makes semiconductor fabrication price inelastic in the short run. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Responsiveness of quantity supplied to a change in price (1 mark)",
          "Factor: High capital costs ($15bn fab) and multi-year construction lags (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "PES definition + lengthy construction lags",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for supply lag factor. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price elasticity of supply"
      },
      {
        "id": "9708_22_2022_mj_1b",
        "number": "1(b)",
        "title": "With the help of a production possibility curve (PPC) diagram, explain the effect of the semiconductor bottleneck on an economy's automobile manufacturing output. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Production Possibility Curve Bottleneck Diagram",
          "axes": [
            "Cars Produced",
            "All Other Goods"
          ],
          "curves": [
            "PPC curve"
          ],
          "shiftDescription": "Economy moves from a point on the boundary to an interior point inside the PPC due to idled assembly plants.",
          "equilibriumDescription": "Under-utilization of resources and output loss of 11.3 million vehicles.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: PPC with movement from boundary to an interior point showing under-utilization (2 marks)",
          "Explanation: Shortage of critical chip input idles assembly workers and plants, operating below productive capacity (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic explanation. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Production possibility curve and resource allocation",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_22_2022_mj_1c",
        "number": "1(c)",
        "title": "Analyse how a shortage of new cars transmitted into severe used-car price inflation (+37.5%). [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Cross-Market Transmission",
            "description": "Clear analysis linking new car supply constraints to substitution toward used vehicles.",
            "evaluativeRequirement": "Weighs positive cross elasticity of demand and inelastic used car inventory."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "New and used cars are close substitutes (positive XED)",
          "New car supply deficit forced buyers into the secondhand market, shifting used car demand rightward",
          "Fixed secondhand supply stock drove prices up (+37.5%)."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cross elasticity and substitute markets"
      },
      {
        "id": "9708_22_2022_mj_1d",
        "number": "1(d)",
        "title": "Assess whether subsidising domestic semiconductor fabrication is the best policy to protect national economic security. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Evaluation of Strategic Industrial Policy",
            "description": "Balanced assessment of domestic semiconductor subsidies versus international trade alliances and stockpiling.",
            "evaluativeRequirement": "Weighs massive fiscal outlays ($50bn+) and risk of global overcapacity against national supply security."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Subsidies: Secures domestic supply, reduces geopolitical import dependency (88-92%), creates high-tech jobs",
          "Risks: Inefficient allocation of capital, subsidising profitable multinationals, risk of subsidy wars",
          "Evaluation: Subsidising local fabs protects core security, but diversification across allied nations is cheaper."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Industrial policy and subsidies"
      }
    ]
  },
  {
    "id": "9708_21_2022_on",
    "title": "Cambridge AS Level Economics 9708/21 \u2014 Section A: Solar Power Feed-in Tariffs and the Energy Transition",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "21",
    "examSeries": "2022_oct_nov",
    "seriesLabel": "October/November 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Subsidising Clean Energy Generation",
      "paragraphs": [
        "To accelerate solar adoption, governments introduced feed-in tariffs (FiTs) guaranteeing premium wholesale prices to households and firms generating renewable electricity.",
        "Over ten years, global solar PV generation capacity grew 18-fold. Scale economies and technological learning curves drove solar module costs down by 82%, bringing solar to grid parity with fossil fuels.",
        "However, funding legacy high tariff contracts strained electricity bills, as grid utilities passed subsidy surcharges onto consumer utility accounts."
      ],
      "tables": [
        {
          "title": "Table 1.1: Solar Feed-in Tariffs vs Grid Parity (2012\u20132022)",
          "headers": [
            "Year",
            "Feed-in Tariff Rate ($/kWh)",
            "Wholesale Grid Electricity Price ($/kWh)",
            "Solar Module Cost ($/Watt)",
            "Solar Share of Grid (%)"
          ],
          "rows": [
            [
              "2012",
              "$0.28",
              "$0.08",
              "$1.95",
              "1.2%"
            ],
            [
              "2017",
              "$0.14",
              "$0.09",
              "$0.65",
              "5.8%"
            ],
            [
              "2022",
              "$0.06",
              "$0.12",
              "$0.26",
              "14.5%"
            ]
          ],
          "notes": "Source: International Renewable Energy Agency (IRENA)."
        }
      ],
      "sources": "Adapted from: IRENA Renewable Power Generation Costs 2022."
    },
    "questions": [
      {
        "id": "9708_21_2022_on_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the percentage change in solar module costs per Watt between 2012 and 2022. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2012 cost = $1.95; 2022 cost = $0.26",
          "Calculation: (($0.26 - $1.95) / $1.95) * 100 = -86.67% (or -86.7%) (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "((0.26 - 1.95) / 1.95) * 100",
          "correctAnswer": "-86.7% (or 86.67% reduction)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for -86.7% (or 86.7% reduction). 1 mark for formula or $1.69 drop.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Percentage change in renewable costs"
      },
      {
        "id": "9708_21_2022_on_1aii",
        "number": "1(a)(ii)",
        "title": "Define the term 'subsidy' and state one objective of subsidising solar power. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Direct financial payment from government to producers to lower production costs and increase supply (1 mark)",
          "Objective: Reduce carbon emissions or accelerate adoption of clean energy (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Financial grant to lower production costs",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for objective. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Producer subsidies"
      },
      {
        "id": "9708_21_2022_on_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain how a feed-in tariff subsidy affects the market price and quantity of solar electricity. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Producer Subsidy Supply Shift Diagram",
          "axes": [
            "Price (P)",
            "Quantity of Solar Power (Q)"
          ],
          "curves": [
            "Demand",
            "S\u2081 (pre-subsidy)",
            "S\u2082 (post-subsidy shifted right)"
          ],
          "shiftDescription": "Subsidy lowers marginal costs, shifting the supply curve rightwards/downwards from S\u2081 to S\u2082.",
          "equilibriumDescription": "Market price falls while equilibrium quantity expands from Q\u2081 to Q\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Supply shifts rightwards with lower consumer price and higher quantity (2 marks)",
          "Explanation: Guaranteed tariff lowers effective production costs and incentivises installation (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Subsidies and market supply",
        "diagramSpec": taxIncidenceDiagram
      },
      {
        "id": "9708_21_2022_on_1c",
        "number": "1(c)",
        "title": "Analyse how economies of scale helped solar energy reach 'grid parity' (where clean electricity costs less than wholesale grid power). [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Long-Run Scale Economies",
            "description": "Clear analysis of internal technical scale economies (automated silicon wafer factories) and learning-by-doing.",
            "evaluativeRequirement": "Explains how falling LRAC drove costs below wholesale grid rates ($0.06 vs $0.12 in 2022)."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Bulk purchasing of polysilicon, automated manufacturing, and R&D spreading lower LRAC",
          "Cumulative production experience doubles cell efficiency while halving unit costs",
          "Extract data: Solar costs dropped 86.7% ($1.95 to $0.26/W) enabling solar to beat $0.12 grid prices."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Economies of scale and grid parity"
      },
      {
        "id": "9708_21_2022_on_1d",
        "number": "1(d)",
        "title": "Assess whether carbon taxation is a better policy than feed-in tariffs to achieve a decarbonised electricity grid. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Decarbonisation Tools",
            "description": "Balanced comparison between carbon taxes (penalising polluters) and feed-in tariffs (subsidising clean generators).",
            "evaluativeRequirement": "Weighs tax revenue generation against regressive energy price shocks and intermittency grid costs."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Carbon taxes: Raises revenue, polluter-pays principle, market-driven choice of lowest-cost clean tech",
          "Limitations of taxes: Raises retail electricity prices, regressive on poor households",
          "Feed-in tariffs: Guaranteed revenue accelerates nascent technology adoption, but strains utility bills",
          "Evaluation: Tariffs are ideal for infant renewable industries, while carbon taxes are best for mature grids."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Carbon taxes vs subsidies"
      }
    ]
  },
  {
    "id": "9708_22_2022_fm",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Coffee Price Volatility and Smallholder Farmer Incomes",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2022_feb_march",
    "seriesLabel": "February/March 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Commodity Instability in Developing Agriculture",
      "paragraphs": [
        "Coffee is produced by 25 million smallholder farmers in developing nations. Because coffee trees take 3-5 years to mature and weather conditions are volatile, coffee exhibits price-inelastic supply in the short run.",
        "Coffee beans also face price-inelastic demand among consumers in high-income economies. Consequently, weather events like frosts in Brazil trigger wild boom-bust commodity price cycles.",
        "When prices plummet, rural smallholders cannot recover variable harvesting costs, exacerbating rural poverty and child labour."
      ],
      "tables": [
        {
          "title": "Table 1.1: Global Arabica Coffee Prices and Farmgate Revenues (2018\u20132022)",
          "headers": [
            "Year",
            "Arabica Benchmark Price ($/lb)",
            "Estimated Brazilian Crop (Million Bags)",
            "Farmer Revenue Index (2018=100)",
            "Fair Trade Minimum Price ($/lb)"
          ],
          "rows": [
            [
              "2018",
              "$1.15",
              "62.5",
              "100.0",
              "$1.40"
            ],
            [
              "2020",
              "$0.98",
              "69.0",
              "85.2",
              "$1.40"
            ],
            [
              "2022",
              "$2.35",
              "53.0",
              "182.4",
              "$1.40"
            ]
          ],
          "notes": "Source: International Coffee Organization (ICO) Monthly Market Report."
        }
      ],
      "sources": "Adapted from: ICO World Coffee Report 2022."
    },
    "questions": [
      {
        "id": "9708_22_2022_fm_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the percentage increase in the Arabica benchmark price between 2020 and 2022. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 price = $0.98; 2022 price = $2.35",
          "Calculation: (($2.35 - $0.98) / $0.98) * 100 = 139.8% (or 140%) (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "((2.35 - 0.98) / 0.98) * 100",
          "correctAnswer": "139.8% (or 140%)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 139.8% (or 140%). 1 mark for $1.37 increase.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Commodity price percentage change"
      },
      {
        "id": "9708_22_2022_fm_1aii",
        "number": "1(a)(ii)",
        "title": "State what is meant by 'price inelastic demand' and state one reason why coffee demand is price inelastic. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Quantity demanded changes by a smaller percentage than the price change (PED < 1) (1 mark)",
          "Reason: Habit-forming nature / lack of direct morning caffeinated substitutes (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "PED < 1; habit-forming / few substitutes",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for reason. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price elasticity of demand"
      },
      {
        "id": "9708_22_2022_fm_1b",
        "number": "1(b)",
        "title": "With the help of a supply and demand diagram, explain how a frost in Brazil causes a sharp spike in world coffee prices. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Inelastic Demand Supply Shock Diagram",
          "axes": [
            "Coffee Price ($/lb)",
            "Quantity of Coffee Beans (Q)"
          ],
          "curves": [
            "Inelastic Demand (steep)",
            "S\u2081",
            "S\u2082 (frost shock shifted left)"
          ],
          "shiftDescription": "Frost destroys harvest, shifting steep supply curve leftwards from S\u2081 to S\u2082.",
          "equilibriumDescription": "Because demand is price inelastic, price surges dramatically from P\u2081 ($0.98) to P\u2082 ($2.35) while quantity drops slightly.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Leftward shift of supply against steep inelastic demand showing large price jump (2 marks)",
          "Explanation: Crop destruction contracts supply; inelastic demand forces massive price increase (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Agricultural supply shocks",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_22_2022_fm_1c",
        "number": "1(c)",
        "title": "Analyse the economic consequences of volatile commodity prices on smallholder farmers' investment and household living standards. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Farmer Income Instability",
            "description": "Clear analysis of how revenue volatility disrupts investment in fertilizer, irrigation, and education.",
            "evaluativeRequirement": "Weighs debt trap risks when prices drop below $1.00/lb."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Price drops below average cost ($0.98 vs $1.40) force farmers into poverty and debt",
          "Revenue uncertainty disincentivises borrowing for capital upgrades (fertilizer, pruning)",
          "Children taken out of school to provide uncompensated farm labour."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Income instability in primary commodity markets"
      },
      {
        "id": "9708_22_2022_fm_1d",
        "number": "1(d)",
        "title": "Assess whether Fair Trade minimum price guarantees ($1.40/lb) are more effective than crop diversification in protecting rural farming communities. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Agricultural Protection",
            "description": "Balanced comparison between Fair Trade price floors and agricultural diversification.",
            "evaluativeRequirement": "Weighs market overproduction risks of price floors against capital barriers to crop diversification."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Fair Trade: Direct income floor ($1.40/lb), funds community schools, shields from price crashes",
          "Limitations of price floors: Encourages continued overproduction of coffee, non-certified farmers excluded",
          "Crop diversification: Spreads weather and market risks across food crops, improves nutrition",
          "Evaluation: Diversification provides resilient long-term food security, whereas price floors offer immediate poverty relief."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Fair Trade vs diversification in developing agriculture"
      }
    ]
  },
  {
    "id": "9708_23_2022_mj",
    "title": "Cambridge AS Level Economics 9708/23 \u2014 Section A: Public Healthcare Funding and Waiting Lists",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "23",
    "examSeries": "2022_may_june",
    "seriesLabel": "May/June 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Free-at-Point-of-Use Healthcare Systems",
      "paragraphs": [
        "National health services funded out of general taxation provide medical care free at the point of delivery to ensure universal access and equity.",
        "With zero consumer price, demand is determined by medical need rather than ability to pay. However, aging demographics and expensive medical technologies generate chronic excess demand.",
        "Non-price rationing via waiting lists reached record highs of 7.2 million patients, prompting debates over introducing nominal patient co-payments."
      ],
      "tables": [
        {
          "title": "Table 1.1: Healthcare Financing & Waiting Times (2018\u20132022)",
          "headers": [
            "System Model",
            "Public Health Budget (% of GDP)",
            "Average Elective Surgery Wait (Weeks)",
            "Nominal Co-payment per Visit ($)",
            "Private Insurance Uptake (%)"
          ],
          "rows": [
            [
              "Country X (Free Access)",
              "9.8%",
              "18.2 weeks",
              "$0",
              "11.5%"
            ],
            [
              "Country Y (Co-payment)",
              "8.9%",
              "6.5 weeks",
              "$25",
              "28.0%"
            ],
            [
              "Country Z (Private Insurance)",
              "16.8%",
              "3.1 weeks",
              "$120 (Deductible)",
              "64.0%"
            ]
          ],
          "notes": "Source: OECD Health Statistics 2022."
        }
      ],
      "sources": "Adapted from: The Lancet Health Policy Review 2022."
    },
    "questions": [
      {
        "id": "9708_23_2022_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in average elective surgery waiting times between Country X and Country Y. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Country X = 18.2 weeks; Country Y = 6.5 weeks",
          "Difference = 18.2 - 6.5 = 11.7 weeks (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "18.2 - 6.5",
          "correctAnswer": "11.7 weeks",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 11.7 weeks. 1 mark for identifying both figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Healthcare waiting times"
      },
      {
        "id": "9708_23_2022_mj_1aii",
        "number": "1(a)(ii)",
        "title": "Explain why healthcare is classified as a merit good rather than a pure public good. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Healthcare is excludable and rival in consumption (not a public good) (1 mark)",
          "It generates positive externalities and is underconsumed due to information failure (merit good) (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Rival and excludable, but has positive externalities",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for rival/excludable distinction. 1 mark for merit characteristics. Total 2 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Merit goods vs public goods"
      },
      {
        "id": "9708_23_2022_mj_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain why providing healthcare free at the point of consumption results in excess demand (waiting lists). [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Free Provision Excess Demand Diagram",
          "axes": [
            "User Fee / Price (P)",
            "Quantity of Medical Treatments (Q)"
          ],
          "curves": [
            "Demand for Healthcare",
            "Fixed Supply Capacity (Vertical S)"
          ],
          "shiftDescription": "At P = 0, quantity demanded Qd extends to the horizontal axis intercept, far exceeding fixed healthcare capacity Qs.",
          "equilibriumDescription": "Excess demand of (Qd - Qs) is rationed via waiting times.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: P = 0 horizontal axis price showing Qd > Qs (2 marks)",
          "Explanation: Zero price removes price mechanism; non-price rationing (queues/waiting lists) occurs (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Free provision and non-price rationing",
        "diagramSpec": maxPriceCeilingDiagram
      },
      {
        "id": "9708_23_2022_mj_1c",
        "number": "1(c)",
        "title": "Analyse the opportunity cost of government funding of healthcare when health budgets consume 9.8% of GDP. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Fiscal Opportunity Cost",
            "description": "Clear analysis of trade-offs between healthcare funding and alternative state spending (education, green infrastructure) or tax cuts.",
            "evaluativeRequirement": "Weighs long-run productivity returns of a healthy workforce against fiscal deficits."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Healthcare tax spending foregoes investment in schools, transport, or higher taxes",
          "Aging demographics create accelerating fiscal strain, crowding out capital infrastructure",
          "Conversely, a healthy workforce boosts productive capacity and tax revenues."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Opportunity cost in public expenditure"
      },
      {
        "id": "9708_23_2022_mj_1d",
        "number": "1(d)",
        "title": "Assess whether introducing nominal patient co-payments ($25 per visit) is the best way to reduce waiting lists in public healthcare. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Evaluation of Healthcare Co-Payments",
            "description": "Balanced assessment of nominal co-payments versus increasing public funding through progressive taxation.",
            "evaluativeRequirement": "Weighs deterrence of frivolous demand against the risk of low-income patients deferring vital preventative care."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Co-payments ($25 in Country Y): Reduces trivial consultations, cuts waits from 18.2 to 6.5 weeks, raises revenue",
          "Drawbacks: Regressive barrier to low-income patients, leads to worse health emergencies later",
          "Evaluation: Co-payments are effective only if low-income and chronic patients are legally exempt."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "User fees vs free provision"
      }
    ]
  },
  {
    "id": "9708_21_2021_on",
    "title": "Cambridge AS Level Economics 9708/21 \u2014 Section A: Aviation Sector Decarbonisation and Sustainable Aviation Fuel",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "21",
    "examSeries": "2021_oct_nov",
    "seriesLabel": "October/November 2021",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Climate Policy in Commercial Aviation",
      "paragraphs": [
        "Commercial aviation accounts for 2.5% of global CO2 emissions. International airlines are mandated to blend Sustainable Aviation Fuel (SAF) derived from waste oils.",
        "However, SAF costs three to four times more than conventional fossil kerosene ($2,400 vs $700 per tonne), and global SAF supply represents under 1% of total jet fuel demand.",
        "Airlines argue that mandatory SAF quotas will increase airfares, depressing tourism-dependent developing island economies."
      ],
      "tables": [
        {
          "title": "Table 1.1: Jet Fuel Prices & Airfare Inflation (2019\u20132021)",
          "headers": [
            "Fuel Type",
            "Cost per Tonne ($)",
            "CO2 Life-Cycle Reduction (%)",
            "Global Production Share (%)",
            "Average Long-Haul Ticket Price ($)"
          ],
          "rows": [
            [
              "Conventional Kerosene",
              "$720",
              "0%",
              "99.4%",
              "$850"
            ],
            [
              "Sustainable Aviation Fuel (SAF)",
              "$2,450",
              "-80%",
              "0.6%",
              "$1,120 (Projected at 20% blend)"
            ]
          ],
          "notes": "Source: International Air Transport Association (IATA) Fuel Monitor."
        }
      ],
      "sources": "Adapted from: IATA Net Zero 2050 Roadmap."
    },
    "questions": [
      {
        "id": "9708_21_2021_on_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the price premium (difference in price) per tonne of Sustainable Aviation Fuel over conventional kerosene. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "SAF = $2,450; Kerosene = $720",
          "Difference = $2,450 - $720 = $1,730 per tonne (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "$2,450 - $720",
          "correctAnswer": "$1,730",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for $1,730. 1 mark for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Aviation fuel price premium"
      },
      {
        "id": "9708_21_2021_on_1aii",
        "number": "1(a)(ii)",
        "title": "Define 'income elasticity of demand' and state how leisure air travel is classified based on YED. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Responsiveness of quantity demanded to changes in consumer income (1 mark)",
          "Classification: Luxury good / income-elastic normal good (YED > 1) (1 mark)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "YED > 1; luxury good",
          "ofrApplies": false
        },
        "markingGuide": "1 mark for definition. 1 mark for luxury classification. Total 2 marks.",
        "extractLinkageExpected": false,
        "syllabusTopic": "Income elasticity of demand and air travel"
      },
      {
        "id": "9708_21_2021_on_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain the effect of a mandatory SAF blending quota on the equilibrium price and quantity of flight tickets. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Mandatory Blending Cost Shift Diagram",
          "axes": [
            "Airfare ($)",
            "Quantity of Passengers (Q)"
          ],
          "curves": [
            "Demand for Flights",
            "S\u2081",
            "S\u2082 (SAF cost shift)"
          ],
          "shiftDescription": "SAF premium ($1,730/tonne) raises airline operating costs, shifting the supply curve leftwards/upwards.",
          "equilibriumDescription": "Airfares increase from P\u2081 to P\u2082 while passenger volumes contract from Q\u2081 to Q\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Supply shifts leftward with higher ticket price and reduced passengers (2 marks)",
          "Explanation: Costly SAF ($2,450/tonne) raises marginal flight costs, shifting supply left (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Environmental mandates and cost shifts",
        "diagramSpec": taxIncidenceDiagram
      },
      {
        "id": "9708_21_2021_on_1c",
        "number": "1(c)",
        "title": "Analyse the impact of higher airfares on tourism-dependent developing economies. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Macroeconomic Impact Analysis",
            "description": "Clear analysis of foreign exchange earnings, service export decline, multiplier contractions, and hospitality unemployment in tourism islands.",
            "evaluativeRequirement": "Weighs tourism income share against economic diversification."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Leisure travel is price-elastic; higher fares ($850 to $1,120) cause large drop in arrivals",
          "Tourism export receipts fall, deteriorating the current account and government tax revenue",
          "Negative multiplier effects across local restaurants, transport, and hotels."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Tourism exports and developing economies"
      },
      {
        "id": "9708_21_2021_on_1d",
        "number": "1(d)",
        "title": "Assess whether a frequent flyer levy is more equitable and effective than fuel blending mandates in reducing aviation emissions. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Aviation Policies",
            "description": "Balanced comparison between progressive frequent flyer levies and across-the-board fuel mandates.",
            "evaluativeRequirement": "Weighs equity (top 1% taking 50% of flights) against technical carbon reduction of green fuel."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Frequent flyer levy: Highly progressive, targets luxury frequent flyers, does not penalise once-a-year family holidays",
          "Fuel mandates: Guarantees 80% lifecycle emission cuts per flight regardless of passenger income, but raises costs for everyone",
          "Evaluation: Blending mandates decarbonise technology, but frequent flyer taxes curb excess demand equitably."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Equity and market-based environmental tools"
      }
    ]
  },
  {
    "id": "9708_22_2021_mj",
    "title": "Cambridge AS Level Economics 9708/22 \u2014 Section A: Wheat Supply Shocks and Bread Price Inflation",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2021_may_june",
    "seriesLabel": "May/June 2021",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Food Price Inflation in Low-Income Households",
      "paragraphs": [
        "Droughts in major grain-producing basins and export tariffs pushed international wheat prices up by 65%. In developing economies, staple foods account for over 50% of daily caloric intake.",
        "Because bread has highly price-inelastic demand, price spikes disproportionately erode the real disposable incomes of low-income deciles.",
        "Governments intervened by imposing bread price ceilings and distributing grain subsidies, sparking fiscal deficit concerns."
      ],
      "tables": [
        {
          "title": "Table 1.1: Wheat Prices & Household Food Budgets (2019\u20132021)",
          "headers": [
            "Income Quintile",
            "Wheat Flour Price ($/tonne)",
            "Food Expenditure Share of Income (%)",
            "Average Monthly Bread Consumption (kg)",
            "Government Wheat Subsidy ($/tonne)"
          ],
          "rows": [
            [
              "Lowest 20% (Poorest)",
              "$340",
              "52.4%",
              "14.2 kg",
              "$80"
            ],
            [
              "Middle 20%",
              "$340",
              "28.5%",
              "12.8 kg",
              "$80"
            ],
            [
              "Highest 20% (Richest)",
              "$340",
              "11.2%",
              "9.5 kg",
              "$80"
            ]
          ],
          "notes": "Source: World Bank Food Security Update 2021."
        }
      ],
      "sources": "Adapted from: World Bank Food Security Monitor 2021."
    },
    "questions": [
      {
        "id": "9708_22_2021_mj_1ai",
        "number": "1(a)(i)",
        "title": "Using Table 1.1, calculate the difference in the food expenditure share of income between the lowest 20% and the highest 20% income quintiles. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Lowest 20% = 52.4%; Highest 20% = 11.2%",
          "Difference = 52.4% - 11.2% = 41.2 percentage points (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "52.4% - 11.2%",
          "correctAnswer": "41.2% (or 41.2 percentage points)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 41.2 percentage points. 1 mark for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Income quintile expenditure comparison"
      },
      {
        "id": "9708_22_2021_mj_1aii",
        "number": "1(a)(ii)",
        "title": "State what is meant by 'Engel's Law' regarding household income and food expenditure. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: As household income rises, the proportion of income spent on food falls, even if absolute food spending increases (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "N/A",
          "correctAnswer": "Food share of income falls as income rises",
          "ofrApplies": false
        },
        "markingGuide": "2 marks for full definition of proportion of income falling as income rises.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Engel's law and consumer expenditure"
      },
      {
        "id": "9708_22_2021_mj_1b",
        "number": "1(b)",
        "title": "With the help of a demand and supply diagram, explain how an agricultural drought affects the equilibrium price and quantity of wheat. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Inelastic Demand Agricultural Drought Shift",
          "axes": [
            "Price of Wheat (P)",
            "Quantity of Wheat (Q)"
          ],
          "curves": [
            "Inelastic Demand (steep)",
            "S\u2081",
            "S\u2082 (Drought shift)"
          ],
          "shiftDescription": "Drought reduces harvest yields, shifting the supply curve leftwards from S\u2081 to S\u2082.",
          "equilibriumDescription": "Because food demand is price inelastic, wheat price rises sharply from P\u2081 to P\u2082 with small quantity fall.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Supply shifts leftward against steep demand showing large price increase (2 marks)",
          "Explanation: Inelastic food demand means harvest shortfalls cause sharp food inflation (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price volatility in agriculture",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_22_2021_mj_1c",
        "number": "1(c)",
        "title": "Analyse why rising food prices have a regressive impact on lower-income households. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Analysis of Regressive Living Cost Impacts",
            "description": "Rigorous analysis demonstrating how food inflation consumes a larger proportion of poor household budgets (52.4% vs 11.2%).",
            "evaluativeRequirement": "Weighs cuts to healthcare, education, and nutrition among the poorest quintile."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Poorest spend 52.4% of income on food compared to 11.2% for richest",
          "Food is a basic necessity with no substitutes; poor have zero savings buffer",
          "Forces cutbacks on healthcare and schooling, reinforcing intergenerational poverty."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Regressive price shocks and income inequality"
      },
      {
        "id": "9708_22_2021_mj_1d",
        "number": "1(d)",
        "title": "Assess whether universal bread subsidies ($80/tonne) are better than targeted food vouchers for low-income households. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "5\u20136 marks",
            "label": "Effective Comparative Evaluation of Food Subsidies vs Targeted Vouchers",
            "description": "Balanced comparison between universal price subsidies and means-tested food debit cards.",
            "evaluativeRequirement": "Weighs deadweight fiscal leakages to rich quintiles against administrative costs and stigma of vouchers."
          },
          {
            "level": 2,
            "marksRange": "3\u20134 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Identifies basic concepts without sustained analytical links."
          }
        ],
        "indicativePoints": [
          "Universal subsidies: Low administrative cost, immediate, but high fiscal leakage (richest get same $80/tonne)",
          "Targeted vouchers: Directly assists poorest 20%, avoids fiscal waste, but administrative means-testing errors",
          "Evaluation: Targeted vouchers are fiscally superior during debt constraints."
        ],
        "markingGuide": "AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 2 marks). Total 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Universal subsidies vs targeted welfare transfers"
      }
    ]
  },
  {
    "id": "9708_42_2026_fm",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: COVID-19 and Macroeconomic Stimulus",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2026_feb_march",
    "seriesLabel": "February/March 2026",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Macroeconomic Responses to COVID-19: Japan vs Ghana",
      "paragraphs": [
        "Governments implemented unprecedented emergency fiscal and monetary responses to support households and firms during global pandemic lockdowns.",
        "Japan injected a fiscal stimulus package equal to 45% of its GDP, funded by domestic bond issuance at negative to near-zero yields (0.05%). Conversely, Ghana's fiscal stimulus was constrained to 2% of GDP due to sovereign debt distress and international borrowing bond yields exceeding 19.5%.",
        "Pandemic containment unevenly affected sectors: the digital software and e-commerce sectors expanded rapidly through remote working, while physical hospitality, travel, and retail suffered near-total revenue losses."
      ],
      "tables": [
        {
          "title": "Table 1.1: Macroeconomic Indicators during Pandemic Stimulus",
          "headers": [
            "Country",
            "Fiscal Stimulus (% of GDP)",
            "10-Year Sovereign Bond Yield (%)",
            "Public Debt (% of GDP)",
            "GDP Growth 2020 (%)"
          ],
          "rows": [
            [
              "Japan",
              "45.0%",
              "0.05%",
              "258.0%",
              "-4.6%"
            ],
            [
              "Ghana",
              "2.0%",
              "19.50%",
              "78.5%",
              "+0.4%"
            ]
          ],
          "notes": "Source: IMF Fiscal Monitor 2021."
        }
      ],
      "sources": "Adapted from: IMF Fiscal Monitor; World Bank Policy Research."
    },
    "questions": [
      {
        "id": "9708_42_2026_fm_1ai",
        "number": "1(a)(i)",
        "title": "Compare the size of the government response in Japan with that of Ghana. [2]",
        "maxMark": 2,
        "category": "data_interpretation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Japan response = 45% of GDP; Ghana = 2% of GDP",
          "Japan's response was 22.5 times larger as a percentage of GDP (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "45% / 2% = 22.5x",
          "correctAnswer": "Japan 45% vs Ghana 2% (~22.5x larger)",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for 45% vs 2% (22.5x larger). 1 mark for identifying both figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Fiscal policy in developed vs developing nations"
      },
      {
        "id": "9708_42_2026_fm_1aii",
        "number": "1(a)(ii)",
        "title": "Explain one possible reason for the difference between their responses. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Japan: High creditworthiness and ultra-low borrowing costs (0.05% bond yield) in sovereign currency",
          "Ghana: High borrowing yields (19.5%) and external debt constraints prevent deficit spending"
        ],
        "markingGuide": "1 mark for borrowing cost / credit constraint point. 1 mark for development. Total 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Sovereign debt constraints"
      },
      {
        "id": "9708_42_2026_fm_1b",
        "number": "1(b)",
        "title": "With the help of an aggregate demand and aggregate supply diagram, explain the impact of an increase in \u2018direct income support\u2019 on real output and the price level. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "AD/AS Rightward Shift Diagram",
          "axes": [
            "Price Level (PL)",
            "Real GDP / Real Output (Y)"
          ],
          "curves": [
            "AD\u2081",
            "AD\u2082 (shifted right)",
            "SRAS"
          ],
          "shiftDescription": "Direct income support boosts disposable income, increasing consumption (C) and government spending (G), shifting AD rightwards.",
          "equilibriumDescription": "Real GDP increases from Y\u2081 to Y\u2082 and price level rises from P\u2081 to P\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: AD curve shifts right with higher output Y and higher price level PL (2 marks)",
          "Explanation: Income transfers increase household consumption C, a component of AD = C+I+G+(X-M) (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis of C expansion and multiplier. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "AD/AS macroeconomic model",
        "diagramSpec": adAsRightwardShiftDiagram
      },
      {
        "id": "9708_42_2026_fm_1c",
        "number": "1(c)",
        "title": "Consider why lockdowns affected those working in the \u2018digital sector\u2019 differently from those working in the \u2018hospitality, retail, and personal service sectors\u2019. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Hospitality/retail (2 marks): Required physical presence; venues shut down; low wages and zero savings led to acute income collapse",
          "Digital sector (2 marks): Remote work via internet; surge in demand for cloud/software services increased revenues and wages",
          "Conclusion (1 mark): Asymmetry deepened economic inequality between skilled and service workers."
        ],
        "markingGuide": "2 marks for hospitality. 2 marks for digital sector. 1 mark for evaluative conclusion. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Labour market segmentation and sectoral shocks"
      },
      {
        "id": "9708_42_2026_fm_1d",
        "number": "1(d)",
        "title": "Using the information regarding government policy tools, assess the advantages and disadvantages of two policies used by governments during the COVID-19 pandemic to protect their economies. [7]",
        "maxMark": 7,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 3,
          "ao3": 3
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20137 marks",
            "label": "Effective Macroeconomic Policy Evaluation & Synthesis",
            "description": "Comprehensive evaluation of two policies (e.g. wage furlough and quantitative easing), weighing immediate economic survival against long-run sovereign debt and inflation.",
            "evaluativeRequirement": "Weighs trade-offs between preserving productive capacity vs debt distress and inflation risks."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis of advantages and disadvantages of two policies with brief evaluation."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Points",
            "description": "Descriptive comments about government spending or low interest rates."
          }
        ],
        "indicativePoints": [
          "Identify 2 policies (1 mark): Wage furlough grants, quantitative easing, debt moratoria",
          "Advantages (up to 3 marks): Prevents structural bankruptcies, preserves worker-firm matches, supports consumption",
          "Disadvantages (up to 3 marks): Massive increase in national debt (Japan at 258% GDP), inflation risks, moral hazard",
          "Evaluation: Critical for short-term survival but leaves severe fiscal overhang."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 3 marks). Total 7 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Macroeconomic policy evaluation"
      }
    ]
  },
  {
    "id": "9708_42_2024_mj",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Inflation Dynamics, Energy Shocks and Trade Deficits",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2024_may_june",
    "seriesLabel": "May/June 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Global Energy Price Shocks and Stagflation",
      "paragraphs": [
        "Geopolitical conflict severed natural gas pipelines to Europe, driving gas prices up six-fold. Because energy is an essential universal input in power, transport, and chemicals, short-run aggregate supply shifted inwards.",
        "Consumer price inflation peaked at 10.6% in the Eurozone and 11.1% in the UK. Central banks responded by rapidly raising policy interest rates from 0% to over 4.5% to prevent inflation expectations from de-anchoring.",
        "However, aggressive interest rate hikes contracted domestic demand while supply remained constrained, pushing major industrial economies into stagflation."
      ],
      "tables": [
        {
          "title": "Table 1.1: Macroeconomic Indicators during Energy Shock (2023)",
          "headers": [
            "Economy",
            "CPI Inflation (%)",
            "Central Bank Policy Rate (%)",
            "Real GDP Growth (%)",
            "Current Account Balance (% of GDP)"
          ],
          "rows": [
            [
              "Eurozone",
              "5.4%",
              "4.50%",
              "+0.5%",
              "+0.8%"
            ],
            [
              "United Kingdom",
              "7.3%",
              "5.25%",
              "+0.1%",
              "-3.3%"
            ],
            [
              "Germany",
              "6.0%",
              "4.50%",
              "-0.3%",
              "+5.9%"
            ]
          ],
          "notes": "Source: Eurostat & ONS 2023."
        }
      ],
      "sources": "Adapted from: ECB Economic Bulletin; OECD Country Surveys 2023."
    },
    "questions": [
      {
        "id": "9708_42_2024_mj_1ai",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the real interest rate for the United Kingdom in 2023. [2]",
        "maxMark": 2,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Formula: Real Interest Rate = Nominal Policy Rate - CPI Inflation",
          "UK Policy Rate = 5.25%; UK Inflation = 7.3%",
          "Calculation: 5.25% - 7.3% = -2.05% (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "5.25% - 7.3%",
          "correctAnswer": "-2.05%",
          "ofrApplies": true
        },
        "markingGuide": "2 marks for -2.05% (or negative 2.05%). 1 mark for formula or identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Real vs nominal interest rates"
      },
      {
        "id": "9708_42_2024_mj_1b",
        "number": "1(b)",
        "title": "With the help of an aggregate demand and aggregate supply diagram, explain how rising energy prices cause cost-push inflation and reduce real output. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Cost-Push Inflation SRAS Left Shift Diagram",
          "axes": [
            "Price Level (PL)",
            "Real GDP (Y)"
          ],
          "curves": [
            "AD",
            "SRAS\u2081",
            "SRAS\u2082 (shifted left)"
          ],
          "shiftDescription": "Rising energy costs increase unit production costs across all sectors, shifting SRAS leftwards from SRAS\u2081 to SRAS\u2082.",
          "equilibriumDescription": "Price level rises from P\u2081 to P\u2082 (inflation) while real output contracts from Y\u2081 to Y\u2082 (stagflation).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: SRAS shifts leftward showing higher price level and lower real output (2 marks)",
          "Explanation: Energy is a universal input; higher variable costs shift SRAS left causing stagflation (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cost-push inflation and SRAS",
        "diagramSpec": costPushInflationDiagram
      },
      {
        "id": "9708_42_2024_mj_1c",
        "number": "1(c)",
        "title": "Analyse the relationship between energy price shocks and the current account balance for oil-importing economies. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Current account: Net trade in goods/services plus primary/secondary income (1 mark)",
          "Inelastic demand: Energy has low PED; when import price surges, total import bill (P*Q) rises sharply (2 marks)",
          "Deficit widening: Higher import expenditure worsens trade balance, pushing current account into deficit (-3.3% in UK) (2 marks)"
        ],
        "markingGuide": "1 mark for definition. 2 marks for inelastic energy import bill. 2 marks for current account deficit linkage. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Current account of balance of payments"
      },
      {
        "id": "9708_42_2024_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether contractionary monetary policy is the most effective policy to restore price stability during a supply-side energy shock. [9]",
        "maxMark": 9,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 3,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "7\u20139 marks",
            "label": "Effective Macroeconomic Policy Evaluation & Synthesis",
            "description": "Comprehensive evaluation comparing interest rate hikes against energy price caps and supply-side investments. Reaches justified conclusion on the stagflation dilemma.",
            "evaluativeRequirement": "Weighs risk of inducing recession (Germany -0.3% GDP) against de-anchoring long-term inflation expectations."
          },
          {
            "level": 2,
            "marksRange": "4\u20136 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Explains how higher interest rates reduce AD, but evaluation of supply-side alternatives is limited."
          },
          {
            "level": 1,
            "marksRange": "1\u20133 marks",
            "label": "Limited Points",
            "description": "Simple statements about interest rates cooling inflation."
          }
        ],
        "indicativePoints": [
          "Monetary tightening: Raises borrowing costs, damps consumption and investment, shifts AD left, prevents wage-price spirals",
          "Limitations: Blunt instrument that cannot pump more gas; crushing AD when supply is already impaired causes deep recession",
          "Alternative policies: Energy price caps, strategic reserves, renewable supply-side acceleration",
          "Evaluation: Interest rate hikes are necessary to anchor expectations, but must be accompanied by targeted supply-side energy investments."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 5 marks). AO3 Evaluation (up to 4 marks). Total 9 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Monetary policy during stagflation"
      }
    ]
  },
  {
    "id": "9708_42_2023_on",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Currency Depreciation, Terms of Trade, and Sovereign Debt",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2023_oct_nov",
    "seriesLabel": "October/November 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Exchange Rate Shocks and External Debt Burdens",
      "paragraphs": [
        "Capital outflows from developing nations triggered severe depreciation against the US dollar.",
        "Textbook theory suggests depreciation restores external balance by making exports cheaper and imports dearer. However, developing countries export primary commodities with low price elasticity of supply while importing essential fuels and medicines with price-inelastic demand.",
        "Because governments borrow externally in US dollars, currency depreciation escalates the domestic cost of servicing dollar debt, draining fiscal revenues from healthcare."
      ],
      "tables": [
        {
          "title": "Table 1.1: External Economic Indicators for Country M (2021\u20132023)",
          "headers": [
            "Year",
            "Exchange Rate ($/local currency)",
            "Terms of Trade Index (2020=100)",
            "Current Account Balance (% of GDP)",
            "External Debt Servicing (% of Govt Revenue)"
          ],
          "rows": [
            [
              "2021",
              "1.00",
              "102.5",
              "-1.8%",
              "18.2%"
            ],
            [
              "2022",
              "0.75",
              "91.2",
              "-4.5%",
              "27.4%"
            ],
            [
              "2023",
              "0.60",
              "84.0",
              "-3.1%",
              "34.8%"
            ]
          ],
          "notes": "Source: Central Bank of Country M Economic Review 2023."
        }
      ],
      "sources": "Adapted from: World Bank Global Economic Prospects; IMF Sovereign Debt Monitor."
    },
    "questions": [
      {
        "id": "9708_42_2023_on_1a",
        "number": "1(a)",
        "title": "Explain what is meant by the 'terms of trade' and calculate the change in Country M's terms of trade index between 2021 and 2023. [3]",
        "maxMark": 3,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Relative price of exports in terms of imports = (Export Price Index / Import Price Index) * 100 (1 mark)",
          "Calculation: 84.0 - 102.5 = -18.5 index points (or -18.05% deterioration) (2 marks)"
        ],
        "calculationGuidance": {
          "formula": "84.0 - 102.5",
          "correctAnswer": "-18.5 index points (or 18.05% decline)",
          "ofrApplies": true
        },
        "markingGuide": "1 mark for definition. 2 marks for calculating -18.5 points (or -18.05%). Total 3 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Terms of trade calculation"
      },
      {
        "id": "9708_42_2023_on_1b",
        "number": "1(b)",
        "title": "Analyse the consequences of domestic currency depreciation on Country M's external debt servicing. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 3,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Mechanism: External debt is denominated in US dollars. When currency depreciates from $1.00 to $0.60, more local currency must be surrendered per dollar of repayment (2 marks)",
          "Data application: Debt servicing jumped from 18.2% to 34.8% of government revenue, crowding out public investment in education and healthcare (2 marks)"
        ],
        "markingGuide": "Up to 2 marks for currency mechanism. Up to 2 marks for data application and fiscal crowding-out. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Exchange rates and sovereign debt"
      },
      {
        "id": "9708_42_2023_on_1c",
        "number": "1(c)",
        "title": "With the help of a J-curve diagram, explain the short-run and long-run effects of a currency depreciation on Country M's current account balance. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 1
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "The J-Curve Effect Diagram",
          "axes": [
            "Time (Months)",
            "Current Account Balance (+ Surplus / - Deficit)"
          ],
          "curves": [
            "J-Curve trajectory",
            "Zero Trade Balance line"
          ],
          "shiftDescription": "Following depreciation, the current account deficit initially widens before export/import volumes adjust over time into surplus.",
          "equilibriumDescription": "Short-run contracts worsen the deficit due to inelastic demand. Over the long run, the Marshall-Lerner condition holds and trade improves.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Shows J-shaped trajectory dipping below zero line before rising (2 marks)",
          "Short-run: Inelastic demand (PEDx + PEDm < 1) due to fixed contracts widens deficit (-4.5% in 2022) (2 marks)",
          "Long-run: Elasticity rises (PEDx + PEDm > 1) as consumers substitute, improving trade (1 mark)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for short-run inelasticity analysis. 1 mark for long-run elasticity adjustment. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "J-curve effect",
        "diagramSpec": jCurveDiagram
      },
      {
        "id": "9708_42_2023_on_1d",
        "number": "1(d)",
        "title": "Assess whether currency depreciation will always improve the trade balance of a developing country, taking into account the Marshall-Lerner condition. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Contextual Evaluation & Marshall-Lerner Rigour",
            "description": "Mathematically sound analysis of Marshall-Lerner condition (PEDx + PEDm > 1) applied to developing country structural trade rigidities. Reaches justified conclusion on 'always'.",
            "evaluativeRequirement": "Evaluates whether developing nations fail the ML condition due to inelastic primary commodity exports and essential import requirements."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Marshall-Lerner condition: Depreciation improves trade balance only if PEDx + PEDm > 1",
          "Developing country constraints: Primary exports face low global elasticity; imports of fuel/machinery are price-inelastic necessities, so sum of PEDs may be < 1",
          "Imported inflation: Depreciating currency increases import costs, triggering domestic inflation and cancelling price competitiveness",
          "Evaluation: Will NOT 'always' improve trade balance; can trigger debt distress and stagflation instead."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Marshall-Lerner condition and exchange rates"
      }
    ]
  },
  {
    "id": "9708_41_2024_on",
    "title": "Cambridge A Level Economics 9708/41 \u2014 Section A: Digital Platform Monopolies and Market Contestability",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "41",
    "examSeries": "2024_oct_nov",
    "seriesLabel": "October/November 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Market Dominance in Search and Digital Advertising",
      "paragraphs": [
        "Dominant digital technology platforms control search, app stores, and digital advertising ecosystems. Through multi-sided network effects and massive user data sets, leading search engines capture over 90% market share.",
        "High barriers to entry\u2014including default installation contracts, proprietary algorithms, and brand loyalty\u2014render digital platform markets non-contestable. Incumbents extract economic rents while stifling nascent competitors through 'killer acquisitions'.",
        "Regulatory authorities launched antitrust investigations, proposing mandatory interoperability, data portability, and potential structural separation of advertising technology units."
      ],
      "tables": [
        {
          "title": "Table 1.1: Search Engine Market Share & Operating Margins (2020\u20132024)",
          "headers": [
            "Search Platform",
            "Global Market Share 2020 (%)",
            "Global Market Share 2024 (%)",
            "Operating Margin (%)",
            "Annual R&D Spending ($bn)"
          ],
          "rows": [
            [
              "Platform Alpha (Dominant)",
              "91.8%",
              "89.2%",
              "34.5%",
              "$39.5bn"
            ],
            [
              "Platform Beta (Challenger)",
              "4.5%",
              "6.1%",
              "14.2%",
              "$11.2bn"
            ],
            [
              "Privacy Engine Gamma",
              "1.2%",
              "2.5%",
              "6.5%",
              "$0.4bn"
            ]
          ],
          "notes": "Source: StatCounter Global Stats; SEC 10-K Filings 2024."
        }
      ],
      "sources": "Adapted from: US Department of Justice Antitrust Filings; EU Digital Markets Act Report."
    },
    "questions": [
      {
        "id": "9708_41_2024_on_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the change in the combined market share of the two challenger search platforms between 2020 and 2024. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 combined = 4.5% + 1.2% = 5.7%",
          "2024 combined = 6.1% + 2.5% = 8.6%",
          "Change = 8.6% - 5.7% = +2.9 percentage points (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "(6.1 + 2.5) - (4.5 + 1.2)",
          "correctAnswer": "+2.9 percentage points",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for +2.9 percentage points. 2 marks for calculating 8.6% and 5.7%. Total 3 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Market concentration ratios"
      },
      {
        "id": "9708_41_2024_on_1b",
        "number": "1(b)",
        "title": "With the help of a monopoly diagram, explain why a profit-maximising digital platform leads to allocative inefficiency. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Monopoly Profit Maximization & Deadweight Loss Diagram",
          "axes": [
            "Price / Cost",
            "Quantity (Q)"
          ],
          "curves": [
            "AR (Demand)",
            "MR",
            "MC"
          ],
          "shiftDescription": "Monopolist produces where MC = MR at quantity Qm, setting price at Pm off the AR curve.",
          "equilibriumDescription": "Because Pm exceeds MC, price is above marginal cost, creating allocative inefficiency and a deadweight loss triangle.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Monopoly equilibrium showing MC=MR with price Pm > MC and deadweight loss triangle (2 marks)",
          "Explanation: Allocative efficiency requires P = MC (social optimum Qc); charging Pm > MC underallocates resources to digital services (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis of P > MC and deadweight welfare loss. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Monopoly and allocative inefficiency",
        "diagramSpec": monopolyDeadweightDiagram
      },
      {
        "id": "9708_41_2024_on_1c",
        "number": "1(c)",
        "title": "Analyse how network externalities and data feedback loops act as high barriers to entry in digital search markets. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Direct & indirect network effects: More users attract more advertisers, increasing platform value (2 marks)",
          "Data feedback loop: Massive query data continually refines algorithm quality, creating an insurmountable technological lead over rivals (2 marks)",
          "Barriers to entry: Entrants cannot replicate multi-billion R&D ($39.5bn) or default search contracts (1 mark)"
        ],
        "markingGuide": "2 marks for network effects. 2 marks for data feedback loops. 1 mark for barrier to entry synthesis. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Barriers to entry in digital platform markets"
      },
      {
        "id": "9708_41_2024_on_1d",
        "number": "1(d)",
        "title": "Evaluate whether structural break-up of dominant tech platforms is more effective than behavioral regulation (such as interoperability mandates) in promoting dynamic efficiency. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Antitrust Evaluation & Dynamic Efficiency Synthesis",
            "description": "Rigorous evaluation comparing structural separation (breaking off ad-tech or browser units) against conduct regulations (Digital Markets Act interoperability). Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the loss of consumer convenience and R&D synergies against the removal of anti-competitive barriers to entry."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Structural break-up: Permanently removes self-preferencing conflicts of interest, forces genuine market competition",
          "Limitations of break-up: Destroys integrated platform ecosystem, reduces massive R&D budgets ($39.5bn), high legal cost",
          "Behavioral regulation (interoperability, data sharing): Preserves economies of scope while allowing rival engines fair access",
          "Evaluation: Behavioral mandates are less destructive to consumer convenience, but structural break-up is needed if conduct remedies are repeatedly evaded."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Regulation of monopoly power and dynamic efficiency"
      }
    ]
  },
  {
    "id": "9708_42_2024_fm",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Sovereign Debt Crises and Fiscal Austerity",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2024_feb_march",
    "seriesLabel": "February/March 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 External Debt Distress in Developing Nations",
      "paragraphs": [
        "Rising global interest rates and dollar appreciation pushed over twenty developing countries into sovereign debt distress. Sri Lanka and Ghana defaulted on external foreign currency bonds after foreign exchange reserves plummeted.",
        "To secure bailout packages from the International Monetary Fund (IMF), debtor nations agreed to strict conditionalities: eliminating fuel subsidies, raising value-added taxes, and cutting public development budgets.",
        "While fiscal consolidation aims to restore primary budget balances, austerity contracted domestic demand, triggering economic contraction and public protests."
      ],
      "tables": [
        {
          "title": "Table 1.1: Sovereign Debt and Macroeconomic Indicators (2020\u20132023)",
          "headers": [
            "Indicator",
            "2020",
            "2021",
            "2022",
            "2023"
          ],
          "rows": [
            [
              "Public Debt-to-GDP Ratio (%)",
              "88.5%",
              "103.2%",
              "118.5%",
              "115.0%"
            ],
            [
              "Foreign Exchange Reserves ($bn)",
              "$5.8bn",
              "$3.1bn",
              "$0.5bn",
              "$1.8bn"
            ],
            [
              "Real GDP Growth (%)",
              "-3.5%",
              "+3.7%",
              "-7.8%",
              "-2.3%"
            ],
            [
              "Primary Fiscal Balance (% of GDP)",
              "-4.2%",
              "-3.8%",
              "-1.5%",
              "+0.8%"
            ]
          ],
          "notes": "Source: Central Bank and Ministry of Finance Statistical Reports."
        }
      ],
      "sources": "Adapted from: IMF Country Staff Reports 2023."
    },
    "questions": [
      {
        "id": "9708_42_2024_fm_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the change in the public debt-to-GDP ratio between 2020 and 2022. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 debt ratio = 88.5%; 2022 debt ratio = 118.5%",
          "Calculation: 118.5% - 88.5% = 30.0 percentage points (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "118.5% - 88.5%",
          "correctAnswer": "30.0 percentage points (or 30%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 30.0 percentage points (or 30%). 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Debt-to-GDP metrics"
      },
      {
        "id": "9708_42_2024_fm_1b",
        "number": "1(b)",
        "title": "With the help of an aggregate demand and aggregate supply diagram, explain how IMF fiscal austerity measures affect real GDP and the price level. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Fiscal Contraction AD Left Shift Diagram",
          "axes": [
            "Price Level (PL)",
            "Real GDP (Y)"
          ],
          "curves": [
            "AD\u2081",
            "AD\u2082 (shifted left)",
            "SRAS"
          ],
          "shiftDescription": "Cutting government expenditure (G) and raising VAT contracts disposable income and consumption (C), shifting AD leftwards from AD\u2081 to AD\u2082.",
          "equilibriumDescription": "Real GDP contracts from Y\u2081 to Y\u2082 (-7.8% in 2022) while demand-pull inflation eases from P\u2081 to P\u2082.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: AD shifts leftward showing lower real output Y and lower price level PL (2 marks)",
          "Explanation: Reductions in G and higher taxes lower aggregate demand components (C + G), multiplying into GDP contraction (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic explanation. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Fiscal consolidation and aggregate demand",
        "diagramSpec": adAsRightwardShiftDiagram
      },
      {
        "id": "9708_42_2024_fm_1c",
        "number": "1(c)",
        "title": "Analyse the relationship between dwindling foreign exchange reserves ($0.5bn in 2022) and domestic currency depreciation. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Foreign exchange reserves: Central bank's stock of foreign currency used to intervene and defend exchange rates (1 mark)",
          "Reserve depletion: As capital flees, the central bank exhausts reserves ($5.8bn down to $0.5bn) attempting to support the peg (2 marks)",
          "Depreciation: Once reserves run out, the central bank must float the currency, causing rapid depreciation as excess domestic currency is sold (2 marks)"
        ],
        "markingGuide": "1 mark for reserve definition. 2 marks for defense exhaustion. 2 marks for depreciation linkage. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Foreign exchange reserves and currency crises"
      },
      {
        "id": "9708_42_2024_fm_1d",
        "number": "1(d)",
        "title": "Evaluate whether sovereign debt restructuring (haircuts on creditors) is more effective than domestic fiscal austerity in restoring long-run economic growth. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Macroeconomic Evaluation of Debt Resolution",
            "description": "Rigorous evaluation comparing creditor debt restructuring (haircuts) against domestic fiscal consolidation. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the risk of exclusion from international credit markets against the debt overhang trap of endless austerity."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Debt restructuring: Lowers stock of debt directly, frees fiscal revenue for public investment, eliminates debt overhang",
          "Drawbacks of debt restructuring: Credit rating downgrade, exclusion from global capital markets for years",
          "Austerity: Signals credibility to lenders, but chokes domestic demand (-7.8% GDP) and shrinks the tax base",
          "Evaluation: Austerity without debt write-downs creates a deflationary trap; restructuring is essential when debt exceeds 110% of GDP."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Sovereign debt restructuring vs fiscal austerity"
      }
    ]
  },
  {
    "id": "9708_43_2024_mj",
    "title": "Cambridge A Level Economics 9708/43 \u2014 Section A: Monopsony Power in E-Commerce Warehouses",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "43",
    "examSeries": "2024_may_june",
    "seriesLabel": "May/June 2024",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Labour Market Concentration in Logistics Hubs",
      "paragraphs": [
        "In many regional industrial zones, giant e-commerce logistics fulfillment centers act as the dominant or sole local employer of low-skilled warehouse labour.",
        "Labour economists point to significant monopsony power. Because local workers face high geographical commuting barriers and limited alternative manufacturing employment, the monopsonist pays wages below the marginal revenue product of labour (MRP).",
        "Unionization drives and statutory minimum wage increases seek to counter this employer market power, but firms argue that wage hikes will accelerate robotic automation."
      ],
      "tables": [
        {
          "title": "Table 1.1: Warehouse Wage Rates & Labour Productivity (2020\u20132024)",
          "headers": [
            "Region / Market Type",
            "Average Hourly Wage ($/hr)",
            "Marginal Revenue Product (MRP) ($/hr)",
            "Wage-to-MRP Ratio",
            "Warehouse Automation Rate (%)"
          ],
          "rows": [
            [
              "Monopsony Regional Hub",
              "$15.50",
              "$25.00",
              "0.62",
              "42.0%"
            ],
            [
              "Competitive Urban Market",
              "$21.00",
              "$24.50",
              "0.86",
              "24.5%"
            ],
            [
              "Unionized Logistics Hub",
              "$23.50",
              "$26.00",
              "0.90",
              "31.0%"
            ]
          ],
          "notes": "Source: National Bureau of Economic Research (NBER) Working Paper."
        }
      ],
      "sources": "Adapted from: NBER Labor Economics Research 2024."
    },
    "questions": [
      {
        "id": "9708_43_2024_mj_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the absolute monetary difference between the Marginal Revenue Product (MRP) and the hourly wage in the Monopsony Regional Hub. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "MRP = $25.00; Wage = $15.50",
          "Difference = $25.00 - $15.50 = $9.50 per hour (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "$25.00 - $15.50",
          "correctAnswer": "$9.50 (or $9.50/hour)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for $9.50. 2 marks for identifying $25.00 and $15.50. Total 3 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Monopsony wage gap calculation"
      },
      {
        "id": "9708_43_2024_mj_1b",
        "number": "1(b)",
        "title": "With the help of a labour market diagram, explain how a profit-maximising monopsonist determines its employment level and wage rate. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Monopsony Labour Market Equilibrium Diagram",
          "axes": [
            "Wage Rate (W)",
            "Quantity of Labour (L)"
          ],
          "curves": [
            "DL = MRP",
            "ACL (Supply of Labour)",
            "MCL (above ACL)"
          ],
          "shiftDescription": "Monopsonist hires where MCL = MRP at employment level Lm, paying wage Wm off the ACL supply curve.",
          "equilibriumDescription": "Employment Lm is lower and wage Wm ($15.50) is lower than competitive equilibrium (Wc, Lc), creating monopsonistic exploitation.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: MCL steeper than ACL with hiring where MCL = MRP and wage Wm read off ACL (2 marks)",
          "Explanation: Monopsonist must raise wages for all workers to hire an additional worker (MCL > ACL); sets wage below MRP causing exploitation (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic explanation. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Monopsony in labour markets",
        "diagramSpec": monopsonyLabourDiagram
      },
      {
        "id": "9708_43_2024_mj_1c",
        "number": "1(c)",
        "title": "Analyse the factors that restrict worker mobility and create monopsony power in regional warehouse logistics. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Geographical immobility: Workers face public transit deserts and housing cost barriers preventing moving to urban hubs (2 marks)",
          "Occupational immobility: Low-skilled warehouse workers lack transferable qualifications for tech or office sectors (2 marks)",
          "Employer dominance: Fulfillment centers are the sole large-scale employers within a 30-mile radius (1 mark)"
        ],
        "markingGuide": "2 marks for geographical immobility. 2 marks for occupational immobility. 1 mark for employer dominance. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Labour immobility and monopsony"
      },
      {
        "id": "9708_43_2024_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether trade union collective bargaining is more effective than a statutory minimum wage in eliminating monopsony wage exploitation. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Evaluation of Labour Market Interventions",
            "description": "Rigorous comparison between union collective bargaining (bilateral monopoly) and statutory wage floors under monopsony conditions. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the risk of accelerated automation against theoretical gains in both employment and wages."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Statutory minimum wage: Can theoretically raise BOTH wages and employment in a monopsony by making MCL horizontal at Wmin",
          "Trade unions: Can negotiate beyond basic pay (working conditions, safety, severance); Table 1.1 shows unionized hubs achieve 0.90 wage-to-MRP ratio ($23.50)",
          "Risks: Employer threat of capital substitution (42% automation rate)",
          "Evaluation: Minimum wages establish an economy-wide floor, but unions are more flexible in negotiating productivity-linked wages."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Trade unions vs minimum wages in monopsony"
      }
    ]
  },
  {
    "id": "9708_41_2023_mj",
    "title": "Cambridge A Level Economics 9708/41 \u2014 Section A: Quantitative Tightening, Bond Yields and Bank Balance Sheets",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "41",
    "examSeries": "2023_may_june",
    "seriesLabel": "May/June 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Central Bank Balance Sheet Normalisation",
      "paragraphs": [
        "After injecting trillions through quantitative easing (QE), major central banks commenced Quantitative Tightening (QT)\u2014selling sovereign bond holdings and allowing bonds to mature without reinvestment.",
        "QT withdraws commercial bank reserves from the financial system, reducing broad money growth. Long-term sovereign bond yields jumped as bond markets absorbed unprecedented public debt supply.",
        "Commercial banks faced unrealized capital losses on their bond portfolios, prompting bank failures and tightening credit conditions for small businesses."
      ],
      "tables": [
        {
          "title": "Table 1.1: Central Bank Assets and Long-Term Bond Yields (2021\u20132023)",
          "headers": [
            "Indicator",
            "2021 (Peak QE)",
            "2022 (QT Launch)",
            "2023 (Active QT)",
            "Change 2021\u20132023"
          ],
          "rows": [
            [
              "Central Bank Total Assets ($tn)",
              "$8.9tn",
              "$8.6tn",
              "$7.4tn",
              "-$1.5tn"
            ],
            [
              "10-Year Government Bond Yield (%)",
              "1.45%",
              "3.10%",
              "4.25%",
              "+2.80 pp"
            ],
            [
              "Commercial Bank Lending Growth (%)",
              "+9.2%",
              "+5.4%",
              "-0.8%",
              "-10.0 pp"
            ]
          ],
          "notes": "Source: Federal Reserve & Bank of England Statistical Bulletins."
        }
      ],
      "sources": "Adapted from: BIS Quarterly Review 2023; Bank of England Financial Stability Report."
    },
    "questions": [
      {
        "id": "9708_41_2023_mj_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the change in the 10-Year Government Bond Yield between 2021 and 2023. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2021 yield = 1.45%; 2023 yield = 4.25%",
          "Calculation: 4.25% - 1.45% = +2.80 percentage points (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "4.25% - 1.45%",
          "correctAnswer": "+2.80 percentage points (or +2.8%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for +2.80 percentage points. 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Bond yield calculations"
      },
      {
        "id": "9708_41_2023_mj_1b",
        "number": "1(b)",
        "title": "With the help of a money market / loanable funds diagram, explain how quantitative tightening raises market interest rates. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Money Supply Contraction Diagram",
          "axes": [
            "Interest Rate (r)",
            "Quantity of Money (M)"
          ],
          "curves": [
            "Demand for Money (Liquidity Preference)",
            "MS\u2081",
            "MS\u2082 (shifted left)"
          ],
          "shiftDescription": "Central bank bond sales drain bank reserves, shifting the money supply curve leftwards from MS\u2081 to MS\u2082.",
          "equilibriumDescription": "Market interest rate rises from r\u2081 (1.45%) to r\u2082 (4.25%).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Money supply shifts left against downward sloping money demand showing higher interest rate (2 marks)",
          "Explanation: QT absorbs commercial bank reserves; scarce liquidity forces commercial lending rates up (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic explanation. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Money supply and interest rate determination",
        "diagramSpec": adAsRightwardShiftDiagram
      },
      {
        "id": "9708_41_2023_mj_1c",
        "number": "1(c)",
        "title": "Analyse the transmission mechanism through which higher bond yields reduce commercial bank lending (-0.8% in 2023). [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Inversely related: Higher bond yields mean lower bond prices; commercial banks holding fixed-rate bonds suffer unrealized capital losses (2 marks)",
          "Bank capital erosion: Eroded capital ratios force banks to restrict new risk-weighted lending to maintain regulatory liquidity buffers (2 marks)",
          "Lending contraction: Commercial lending contracted from +9.2% to -0.8%, tightening credit for private investment (1 mark)"
        ],
        "markingGuide": "2 marks for bond price fall and bank capital losses. 2 marks for lending buffer constraints. 1 mark for macroeconomic lending decline. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Bank lending channel and financial stability"
      },
      {
        "id": "9708_41_2023_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether quantitative tightening is a better monetary policy tool than short-term policy interest rate hikes to combat persistent inflation. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Monetary Policy Evaluation & Synthesis",
            "description": "Rigorous comparison between policy rate hikes (controlling the short end of yield curve) and QT (controlling long-term term premia). Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs financial sector instability and sovereign borrowing costs against effective inflation control."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "QT advantages: Directly tackles excess liquidity, unwinds central bank market distortions, impacts long-term mortgage and corporate bond rates",
          "Risks of QT: Liquidity crashes, bond market illiquidity, massive losses for taxpayers who backstop central bank balance sheets",
          "Policy rate hikes: More predictable, easily calibrated, well-understood transmission",
          "Evaluation: Policy rate hikes remain the primary tool for fine-tuning; QT should proceed passively in the background."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Quantitative tightening vs policy interest rate hikes"
      }
    ]
  },
  {
    "id": "9708_42_2023_fm",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Copper Mining Booms, Dutch Disease and Sovereign Wealth Funds",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2023_feb_march",
    "seriesLabel": "February/March 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Commodity Windfalls and Economic Structure in Chile",
      "paragraphs": [
        "Chile is the world's leading copper producer. The global green energy transition sparked a major copper super-cycle, sending prices above $10,000 per tonne and generating immense export revenues.",
        "However, massive foreign currency inflows caused significant appreciation of the Chilean peso. Non-mining manufacturing and wine agricultural exports lost international price competitiveness, illustrating classic 'Dutch Disease'.",
        "To counter currency appreciation and fiscal overheating, Chile directs mining tax royalties into offshore sovereign wealth funds (the Economic and Social Stabilization Fund)."
      ],
      "tables": [
        {
          "title": "Table 1.1: Trade, Exchange Rates and Sectoral Growth in Chile (2020\u20132023)",
          "headers": [
            "Indicator",
            "2020",
            "2021",
            "2022",
            "2023"
          ],
          "rows": [
            [
              "Copper Export Revenue ($bn)",
              "$39.2bn",
              "$53.4bn",
              "$48.8bn",
              "$46.2bn"
            ],
            [
              "Copper Share of Total Exports (%)",
              "52.5%",
              "57.8%",
              "54.2%",
              "53.0%"
            ],
            [
              "Real Effective Exchange Rate (2015=100)",
              "98.2",
              "112.4",
              "106.8",
              "104.5"
            ],
            [
              "Manufacturing Output Growth (%)",
              "-1.8%",
              "-4.2%",
              "-2.1%",
              "+0.5%"
            ]
          ],
          "notes": "Source: Central Bank of Chile & Ministry of Finance."
        }
      ],
      "sources": "Adapted from: World Bank Chile Economic Monitor 2023."
    },
    "questions": [
      {
        "id": "9708_42_2023_fm_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the percentage increase in copper export revenue between 2020 and 2021. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 revenue = $39.2bn; 2021 revenue = $53.4bn",
          "Calculation: (($53.4 - $39.2) / $39.2) * 100 = 36.22% (or 36.2%) (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "((53.4 - 39.2) / 39.2) * 100",
          "correctAnswer": "36.2% (or 36.22%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 36.2% (or 36.22%). 2 marks for $14.2bn difference.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Commodity export calculations"
      },
      {
        "id": "9708_42_2023_fm_1b",
        "number": "1(b)",
        "title": "With the help of a foreign exchange market diagram, explain how a commodity export boom causes domestic currency appreciation. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Foreign Exchange Currency Appreciation Diagram",
          "axes": [
            "Exchange Rate (USD per Peso)",
            "Quantity of Pesos (Q)"
          ],
          "curves": [
            "D\u2081",
            "D\u2082 (shifted right)",
            "S\u2081"
          ],
          "shiftDescription": "Foreign buyers convert dollars into pesos to buy copper, shifting demand for the domestic currency rightwards from D\u2081 to D\u2082.",
          "equilibriumDescription": "Exchange rate appreciates from ER\u2081 to ER\u2082 (Real Effective Exchange Rate rose from 98.2 to 112.4).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Demand for local currency shifts rightward showing currency appreciation (2 marks)",
          "Explanation: Copper export boom ($53.4bn) creates massive demand for pesos, driving up exchange value (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Exchange rate determination and export windfalls",
        "diagramSpec": forexAppreciationDiagram
      },
      {
        "id": "9708_42_2023_fm_1c",
        "number": "1(c)",
        "title": "Analyse how currency appreciation leads to the 'Dutch Disease' in non-commodity tradable sectors like manufacturing. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Mechanism: Real exchange rate appreciation (112.4) raises foreign currency price of manufactured exports and lowers import prices (2 marks)",
          "Crowding out: Manufacturing firms suffer reduced export competitiveness and domestic market share (-4.2% output growth) (2 marks)",
          "Resource pull: Capital and skilled engineers relocate to mining, driving up wages and factory overheads (1 mark)"
        ],
        "markingGuide": "2 marks for exchange rate price mechanism. 2 marks for manufacturing deindustrialization. 1 mark for resource pull. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Dutch disease and deindustrialization"
      },
      {
        "id": "9708_42_2023_fm_1d",
        "number": "1(d)",
        "title": "Evaluate whether offshore sovereign wealth funds are the most effective policy to insulate an economy from commodity price shocks. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Policy Evaluation of Resource Wealth Management",
            "description": "Rigorous evaluation comparing offshore sovereign wealth funds against domestic industrial subsidies and infrastructure investments. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the prevention of domestic currency appreciation against immediate domestic social and infrastructure development needs."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Offshore wealth funds: Sterilises dollar inflows, prevents currency overvaluation, countercyclical fiscal reserve for recessions",
          "Opportunity cost: Millions living in poverty while billions sit in low-yielding foreign bonds; domestic hospitals/schools underfunded",
          "Alternative policies: Investing windfalls in domestic education, green energy infrastructure, and non-mining industrial R&D",
          "Evaluation: Sovereign wealth funds are essential to prevent currency Dutch disease, but should reinvest dividend yields into domestic human capital."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Sovereign wealth funds and resource curse mitigation"
      }
    ]
  },
  {
    "id": "9708_41_2023_on",
    "title": "Cambridge A Level Economics 9708/41 \u2014 Section A: Artificial Intelligence, Automation and Structural Unemployment",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "41",
    "examSeries": "2023_oct_nov",
    "seriesLabel": "October/November 2023",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Technological Unemployment and Cognitive Task Automation",
      "paragraphs": [
        "Unlike previous industrial automation waves that replaced physical manual tasks, generative artificial intelligence (AI) and machine learning automate cognitive knowledge tasks: financial analysis, programming, and legal research.",
        "Economists estimate up to 300 million full-time jobs globally face significant automation exposure. While AI boosts total factor productivity and long-run potential GDP, it threatens severe structural unemployment and wage polarization.",
        "Debates have intensified over government responses: introducing 'robot/AI taxes' to slow labor substitution versus universal basic income (UBI) and retraining vouchers."
      ],
      "tables": [
        {
          "title": "Table 1.1: Occupational Exposure to AI Automation & Wage Trends (2020\u20132023)",
          "headers": [
            "Occupational Category",
            "AI Automation Exposure (%)",
            "Real Wage Growth 2020\u20132023 (%)",
            "Employment Growth (%)",
            "Capital Share of Value Added (%)"
          ],
          "rows": [
            [
              "Financial Analysts & Legal Paralegals",
              "68.5%",
              "-2.8%",
              "-5.2%",
              "58.0%"
            ],
            [
              "Software Developers",
              "54.0%",
              "+1.2%",
              "-1.5%",
              "64.5%"
            ],
            [
              "Trades & Physical Care Workers",
              "12.0%",
              "+4.8%",
              "+8.2%",
              "22.0%"
            ]
          ],
          "notes": "Source: OECD Employment Outlook 2023; Goldman Sachs Global Economics."
        }
      ],
      "sources": "Adapted from: OECD Employment Outlook 2023; IMF Staff Discussion Note on AI."
    },
    "questions": [
      {
        "id": "9708_41_2023_on_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the difference in real wage growth between Physical Care Workers and Financial Analysts. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Care workers = +4.8%; Financial analysts = -2.8%",
          "Calculation: 4.8% - (-2.8%) = 7.6 percentage points (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "4.8 - (-2.8)",
          "correctAnswer": "7.6 percentage points (or 7.6%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 7.6 percentage points. 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Wage polarization metrics"
      },
      {
        "id": "9708_41_2023_on_1b",
        "number": "1(b)",
        "title": "With the help of a labour market diagram, explain how cognitive automation reduces employment and wages in vulnerable knowledge sectors. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Capital-Labour Substitution Shift Diagram",
          "axes": [
            "Wage Rate (W)",
            "Quantity of Knowledge Workers (L)"
          ],
          "curves": [
            "DL\u2081 (MRP\u2081)",
            "DL\u2082 (shifted left)",
            "SL"
          ],
          "shiftDescription": "AI substitutes for human cognitive tasks, lowering human marginal revenue product and shifting labour demand leftwards from DL\u2081 to DL\u2082.",
          "equilibriumDescription": "Equilibrium employment contracts from L\u2081 to L\u2082 (-5.2%) and wage rate falls from W\u2081 to W\u2082 (-2.8%).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Demand for labour curve DL shifts left showing lower wages and employment (2 marks)",
          "Explanation: AI software acts as a substitute for human knowledge workers, reducing marginal revenue product of labour (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Technological substitution and labour demand",
        "diagramSpec": evSubsidyDemandFallDiagram
      },
      {
        "id": "9708_41_2023_on_1c",
        "number": "1(c)",
        "title": "Analyse how AI adoption alters the functional distribution of income between labour and capital. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Capital share expansion: Returns to corporate software algorithms and cloud computing owners rise to 64.5% of value added (2 marks)",
          "Labour share contraction: Displaced workers suffer real wage erosion (-2.8%), capturing a dwindling share of national output (2 marks)",
          "Income inequality: Widens the Gini coefficient between asset/tech owners and wage labourers (1 mark)"
        ],
        "markingGuide": "2 marks for capital share rise. 2 marks for labour share decline. 1 mark for overall inequality synthesis. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Functional distribution of income and capital deepening"
      },
      {
        "id": "9708_41_2023_on_1d",
        "number": "1(d)",
        "title": "Evaluate whether introducing a Universal Basic Income (UBI) is more effective than government retraining subsidies to mitigate AI-induced structural unemployment. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Comparative Evaluation of Structural Policies",
            "description": "Rigorous evaluation comparing unconditional UBI cash transfers against active labour market retraining vouchers. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs disincentives to work and massive fiscal costs against the reality that cognitive AI may out-compete retrained workers in new domains."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "UBI: Unconditional safety net, decouples survival from employment, supports living standards when net jobs disappear",
          "UBI limitations: Colossal fiscal tax requirement, risk of work disincentives and demand-pull inflation",
          "Retraining subsidies: Equips workers for human-centric trades and care sectors (+8.2% employment), enhances productive capacity",
          "Evaluation: Retraining is effective in transition phases, but permanent cognitive automation will eventually necessitate guaranteed basic income."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Universal basic income vs active labour market policies"
      }
    ]
  },
  {
    "id": "9708_42_2022_mj",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Global Fertilizer Shocks, Food Crises and the Balance of Payments",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2022_may_june",
    "seriesLabel": "May/June 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Agricultural Input Price Shocks and External Deficits",
      "paragraphs": [
        "Natural gas export restrictions tripled the global cost of ammonia and nitrogen fertilizers. Because fertilizers represent 30% of operating expenses for commercial crop farming, global agricultural production costs rose sharply.",
        "Developing countries dependent on food and fertilizer imports faced severe terms of trade deterioration and current account deficits.",
        "Central banks in import-dependent economies faced conflicting macroeconomic objectives: raising interest rates to protect foreign exchange reserves or keeping rates low to support farming output."
      ],
      "tables": [
        {
          "title": "Table 1.1: Fertilizer Prices & External Trade Accounts (2020\u20132022)",
          "headers": [
            "Indicator",
            "2020",
            "2021",
            "2022",
            "% Change 2020\u20132022"
          ],
          "rows": [
            [
              "Nitrogen Fertilizer Index (2015=100)",
              "85.4",
              "135.0",
              "206.8",
              "+142.2%"
            ],
            [
              "Agricultural Import Bill ($bn)",
              "$4.2bn",
              "$5.8bn",
              "$8.9bn",
              "+111.9%"
            ],
            [
              "Current Account Balance (% of GDP)",
              "-2.1%",
              "-4.5%",
              "-7.6%",
              "-5.5 pp"
            ],
            [
              "Headline CPI Inflation (%)",
              "4.2%",
              "7.8%",
              "14.5%",
              "+10.3 pp"
            ]
          ],
          "notes": "Source: World Bank Commodity Price Pink Sheet."
        }
      ],
      "sources": "Adapted from: FAO Food Outlook 2022; World Bank Global Economic Prospects."
    },
    "questions": [
      {
        "id": "9708_42_2022_mj_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the percentage increase in the Agricultural Import Bill between 2020 and 2022. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 bill = $4.2bn; 2022 bill = $8.9bn",
          "Calculation: (($8.9 - $4.2) / $4.2) * 100 = 111.9% (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "((8.9 - 4.2) / 4.2) * 100",
          "correctAnswer": "111.9% (or 112%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 111.9% (or 112%). 2 marks for $4.7bn increase.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Import expenditure percentage changes"
      },
      {
        "id": "9708_42_2022_mj_1b",
        "number": "1(b)",
        "title": "With the help of an aggregate demand and aggregate supply diagram, explain how rising fertilizer prices cause stagflation. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Fertilizer Shock SRAS Left Shift Diagram",
          "axes": [
            "Price Level (PL)",
            "Real GDP (Y)"
          ],
          "curves": [
            "AD",
            "SRAS\u2081",
            "SRAS\u2082 (shifted left)"
          ],
          "shiftDescription": "Tripling fertilizer prices increases food production costs, shifting the SRAS curve leftwards from SRAS\u2081 to SRAS\u2082.",
          "equilibriumDescription": "Price level surges (14.5% inflation) while real GDP growth contracts (stagflation).",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: SRAS shifts left showing higher price level and lower real output (2 marks)",
          "Explanation: Fertilizer input cost surge increases agricultural marginal costs, shifting SRAS left (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Cost-push inflation and SRAS",
        "diagramSpec": costPushInflationDiagram
      },
      {
        "id": "9708_42_2022_mj_1c",
        "number": "1(c)",
        "title": "Analyse why inelastic demand for food and fertilizer leads to a severe widening of the current account deficit (-7.6% of GDP). [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Inelastic demand (PED < 1): Food and fertilizers are essential survival inputs with near-zero short-run substitutes (2 marks)",
          "Price surge effect: Higher import prices do not reduce import quantities; total import expenditure jumps (+111.9% to $8.9bn) (2 marks)",
          "Current account deficit: Import spending far outstrips export receipts, widening deficit to -7.6% of GDP (1 mark)"
        ],
        "markingGuide": "2 marks for inelastic demand characteristics. 2 marks for import bill surge. 1 mark for current account deficit linkage. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Price elasticity of demand and balance of payments"
      },
      {
        "id": "9708_42_2022_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether government subsidies on agricultural inputs are more effective than exchange rate depreciation in addressing agricultural cost-push shocks. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Macroeconomic Policy Evaluation & Synthesis",
            "description": "Rigorous evaluation comparing input subsidies against currency depreciation in a supply-shock context. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the fiscal budget deficit against the risk of imported inflation and failure of the Marshall-Lerner condition."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Input subsidies: Directly lowers cost of fertilizer, shifts SRAS back rightward, protects food affordability and harvests",
          "Drawbacks of subsidies: Massive drain on government fiscal budget, risks corruption/smuggling across borders",
          "Currency depreciation: Makes exports cheaper but worsens imported input inflation (fertilizer costs rise even more in local currency)",
          "Evaluation: Subsidies are far more effective than depreciation for supply shocks, provided they are targeted to smallholders."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Input subsidies vs exchange rate adjustments"
      }
    ]
  },
  {
    "id": "9708_41_2022_on",
    "title": "Cambridge A Level Economics 9708/41 \u2014 Section A: Wage-Price Spirals and Inflation Expectations",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "41",
    "examSeries": "2022_oct_nov",
    "seriesLabel": "October/November 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Second-Round Effects and Inflation Psychology",
      "paragraphs": [
        "When headline inflation hit 9%, labour unions demanded index-linked wage increases to prevent real wage erosion. In tight labour markets, employers conceded higher nominal wages.",
        "To protect operating profit margins, corporations passed wage increases forward into customer retail prices, threatening a self-reinforcing wage-price spiral.",
        "Central banks warned that if inflation expectations become de-anchored, the short-run Phillips curve shifts upwards, making disinflation far more painful in terms of lost output."
      ],
      "tables": [
        {
          "title": "Table 1.1: Wages, Inflation and Unemployment (2020\u20132022)",
          "headers": [
            "Indicator",
            "2020",
            "2021",
            "2022"
          ],
          "rows": [
            [
              "Nominal Wage Growth (%)",
              "+3.2%",
              "+4.8%",
              "+7.1%"
            ],
            [
              "CPI Inflation Rate (%)",
              "+1.2%",
              "+5.4%",
              "+9.1%"
            ],
            [
              "Real Wage Growth (%)",
              "+2.0%",
              "-0.6%",
              "-2.0%"
            ],
            [
              "Unemployment Rate (%)",
              "6.5%",
              "4.8%",
              "3.6%"
            ]
          ],
          "notes": "Source: US Bureau of Labor Statistics & Federal Reserve."
        }
      ],
      "sources": "Adapted from: Federal Reserve Monetary Policy Report 2022."
    },
    "questions": [
      {
        "id": "9708_41_2022_on_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the change in real wage growth between 2020 and 2022. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2020 real wage = +2.0%; 2022 real wage = -2.0%",
          "Calculation: -2.0% - 2.0% = -4.0 percentage points (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "-2.0 - 2.0",
          "correctAnswer": "-4.0 percentage points (or -4%)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for -4.0 percentage points. 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Real wage calculations"
      },
      {
        "id": "9708_41_2022_on_1b",
        "number": "1(b)",
        "title": "With the help of a short-run Phillips curve diagram, explain how rising inflation expectations shift the trade-off between inflation and unemployment. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Expectations-Augmented Phillips Curve Shift Diagram",
          "axes": [
            "Inflation Rate (%)",
            "Unemployment Rate (%)"
          ],
          "curves": [
            "SRPC\u2081",
            "SRPC\u2082 (shifted upwards)"
          ],
          "shiftDescription": "When workers and firms expect higher future inflation, SRPC shifts vertically upwards from SRPC\u2081 to SRPC\u2082.",
          "equilibriumDescription": "At the same unemployment rate (3.6%), actual inflation is significantly higher, destroying the trade-off.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: SRPC shifts upwards showing higher inflation at every level of unemployment (2 marks)",
          "Explanation: Workers demand higher wages in anticipation of inflation; firms price higher, embedding higher inflation into contracts (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Phillips curve and inflation expectations",
        "diagramSpec": costPushInflationDiagram
      },
      {
        "id": "9708_41_2022_on_1c",
        "number": "1(c)",
        "title": "Analyse the role of tight labour markets (unemployment at 3.6%) in strengthening workers' collective bargaining power during inflation. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Labour shortages: At 3.6% unemployment, vacancies outnumber unemployed workers; employers cannot easily replace staff (2 marks)",
          "Bargaining leverage: Workers and unions threaten strikes with credible disruption, winning nominal wage hikes (+7.1%) (2 marks)",
          "Firm concession: To prevent turnover and lost output, firms concede wage demands and pass costs to prices (1 mark)"
        ],
        "markingGuide": "2 marks for labour shortage context. 2 marks for bargaining leverage. 1 mark for firm wage concession. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Labour market tightness and wage determination"
      },
      {
        "id": "9708_41_2022_on_1d",
        "number": "1(d)",
        "title": "Evaluate whether an aggressive monetary tightening regime is preferable to government statutory wage-price controls in halting a wage-price spiral. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Comparative Evaluation of Anti-Inflationary Regimes",
            "description": "Rigorous evaluation comparing central bank interest rate hikes against direct wage-price statutory freezes. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs the output/unemployment sacrifice of monetary tightening against shortages and market misallocation under price controls."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Monetary tightening: Credibly anchors expectations, cools AD, removes excess demand, avoids administrative shortages",
          "Cost of tightening: Raises unemployment, risks recession, increases debt servicing burdens",
          "Wage-price controls: Freezes spiral immediately without causing unemployment in the short run",
          "Drawbacks of controls: Severe shortages, black markets, suppresses price mechanism; when lifted, pent-up inflation explodes",
          "Evaluation: Monetary tightening imposes short-term output pain but is the only sustainable mechanism to restore long-run price stability."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Monetary policy vs wage-price controls"
      }
    ]
  },
  {
    "id": "9708_42_2022_fm",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Real Estate Sector Contagion and Local Government Debt",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2022_feb_march",
    "seriesLabel": "February/March 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Property Debt Deflation and Financial Accelerators",
      "paragraphs": [
        "In emerging Asian economies, the real estate sector accounted for up to 29% of GDP and 70% of household wealth. Massive developer debt defaults precipitated a prolonged housing downturn.",
        "Declining land sales collapsed local government fiscal revenues, while falling apartment prices generated a severe negative wealth effect, dampening consumer confidence and retail sales.",
        "Policymakers faced systemic financial stability risks as commercial banks held trillions in property-backed collateral and local government financing vehicle (LGFV) debt."
      ],
      "tables": [
        {
          "title": "Table 1.1: Real Estate Indicators & Local Government Revenues (2019\u20132022)",
          "headers": [
            "Indicator",
            "2019",
            "2020",
            "2021",
            "2022"
          ],
          "rows": [
            [
              "Real Estate Investment Growth (%)",
              "+9.9%",
              "+7.0%",
              "+4.4%",
              "-10.0%"
            ],
            [
              "Local Government Land Sale Revenue ($bn)",
              "$1,050bn",
              "$1,180bn",
              "$1,250bn",
              "$840bn"
            ],
            [
              "New Home Price Index (YoY %)",
              "+6.5%",
              "+4.2%",
              "+2.1%",
              "-2.5%"
            ],
            [
              "Household Consumption Growth (%)",
              "+8.0%",
              "-1.2%",
              "+12.5%",
              "+0.2%"
            ]
          ],
          "notes": "Source: National Bureau of Statistics & Ministry of Finance."
        }
      ],
      "sources": "Adapted from: IMF Global Financial Stability Report 2022."
    },
    "questions": [
      {
        "id": "9708_42_2022_fm_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the percentage drop in Local Government Land Sale Revenue between 2021 and 2022. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2021 revenue = $1,250bn; 2022 revenue = $840bn",
          "Calculation: (($840 - $1,250) / $1,250) * 100 = -32.8% (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "((840 - 1250) / 1250) * 100",
          "correctAnswer": "-32.8% (or 32.8% decline)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for -32.8% (or 32.8% drop). 2 marks for $410bn drop.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Fiscal revenue percentage fall"
      },
      {
        "id": "9708_42_2022_fm_1b",
        "number": "1(b)",
        "title": "With the help of an aggregate demand and aggregate supply diagram, explain how the property downturn causes a contraction in real GDP. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Negative Wealth Effect AD Left Shift Diagram",
          "axes": [
            "Price Level (PL)",
            "Real GDP (Y)"
          ],
          "curves": [
            "AD\u2081",
            "AD\u2082 (shifted left)",
            "SRAS"
          ],
          "shiftDescription": "Plummeting property investment (-10%) and household negative wealth effects reduce I and C, shifting AD leftwards from AD\u2081 to AD\u2082.",
          "equilibriumDescription": "Real GDP contracts from Y\u2081 to Y\u2082 and downward pressure is exerted on general price levels.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: AD curve shifts leftward showing contraction in real output Y (2 marks)",
          "Explanation: Real estate investment (I) collapses by 10% and falling home prices depress consumer spending (C) via negative wealth effect (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Aggregate demand and negative wealth effects",
        "diagramSpec": adAsRightwardShiftDiagram
      },
      {
        "id": "9708_42_2022_fm_1c",
        "number": "1(c)",
        "title": "Analyse the systemic banking risks created when property developers default on bank loans and bond obligations. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Non-performing loans (NPLs): Developer defaults force commercial banks to write down bad debts, eroding bank equity capital (2 marks)",
          "Collateral devaluation: Property asset deflation reduces the value of mortgaged land held as security, forcing banks to call in loans (2 marks)",
          "Credit crunch: Banks restrict new lending across the entire real economy, triggering a financial accelerator contraction (1 mark)"
        ],
        "markingGuide": "2 marks for NPLs and bank capital. 2 marks for collateral devaluation. 1 mark for credit crunch linkage. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Systemic risk and financial stability"
      },
      {
        "id": "9708_42_2022_fm_1d",
        "number": "1(d)",
        "title": "Evaluate whether central government bailouts of insolvent property developers create unacceptable moral hazard in a mixed economy. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Evaluation of Moral Hazard & Financial Rescues",
            "description": "Rigorous evaluation of state bailouts against market liquidation and restructuring. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs systemic economic collapse and unfinished housing unrest against encouraging future reckless over-borrowing."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Moral hazard arguments: Bailouts reward excessive leverage, privatise profits while socialising losses, encourages future reckless debt bubbles",
          "Arguments for intervention: Preserves social stability, ensures millions of presold homes are completed, prevents systemic banking contagion",
          "Alternative policies: Bail out homebuyers / projects directly while liquidating developer shareholders and management",
          "Evaluation: Direct developer bailouts create toxic moral hazard; the state should ring-fence project completion while wiping out equity investors."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Moral hazard and state financial intervention"
      }
    ]
  },
  {
    "id": "9708_43_2022_mj",
    "title": "Cambridge A Level Economics 9708/43 \u2014 Section A: Carbon Border Adjustment Mechanisms and Global Trade Competitiveness",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "43",
    "examSeries": "2022_may_june",
    "seriesLabel": "May/June 2022",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Border Carbon Tariffs and Green Protectionism",
      "paragraphs": [
        "To prevent 'carbon leakage'\u2014where domestic polluting industries relocate abroad to evade strict domestic carbon prices\u2014the European Union legislated the Carbon Border Adjustment Mechanism (CBAM).",
        "CBAM requires importers of carbon-intensive goods (steel, aluminum, cement, and fertilizer) to purchase carbon certificates equal to the emissions price paid by domestic producers.",
        "Developing nations argue that CBAM is green protectionism that violates World Trade Organization (WTO) special and differential treatment rules, imposing disproportionate export penalties on emerging economies."
      ],
      "tables": [
        {
          "title": "Table 1.1: Carbon Intensity & CBAM Tariff Incidence (2022)",
          "headers": [
            "Producing Region",
            "Steel Carbon Intensity (tCO2/t steel)",
            "EU Carbon Price ($/tCO2)",
            "Effective CBAM Tariff Rate (%)",
            "Steel Export Volume to EU ($bn)"
          ],
          "rows": [
            [
              "European Union (Domestic)",
              "1.2 tCO2",
              "$85.00",
              "0% (Domestic Benchmark)",
              "$18.5bn"
            ],
            [
              "Country K (Developing)",
              "2.4 tCO2",
              "$85.00",
              "+22.5%",
              "$4.8bn"
            ],
            [
              "Country L (Emerging)",
              "1.9 tCO2",
              "$85.00",
              "+14.8%",
              "$6.2bn"
            ]
          ],
          "notes": "Source: European Commission Directorate-General for Taxation and Customs Union."
        }
      ],
      "sources": "Adapted from: World Bank Carbon Pricing Dashboard 2022."
    },
    "questions": [
      {
        "id": "9708_43_2022_mj_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the difference in carbon intensity per tonne of steel between Country K and the European Union. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Country K = 2.4 tCO2; EU = 1.2 tCO2",
          "Difference = 2.4 - 1.2 = 1.2 tonnes of CO2 per tonne of steel (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "2.4 - 1.2",
          "correctAnswer": "1.2 tCO2 (or 1.2 tonnes CO2/tonne steel)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 1.2 tCO2. 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Carbon intensity calculations"
      },
      {
        "id": "9708_43_2022_mj_1b",
        "number": "1(b)",
        "title": "With the help of an international trade tariff diagram, explain how a CBAM levy affects the volume of steel imports into the European Union. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Carbon Tariff Protection Diagram",
          "axes": [
            "Price of Steel (P)",
            "Quantity of Steel (Q)"
          ],
          "curves": [
            "Domestic Demand",
            "Domestic Supply",
            "World Price Line (Pw)",
            "Pw + CBAM Tariff"
          ],
          "shiftDescription": "CBAM imposes a carbon surcharge, raising the import price line from Pw to Pw + tariff.",
          "equilibriumDescription": "Steel import volume contracts from (Q4 - Q1) to (Q3 - Q2) as domestic production expands.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Upward shift of world price line showing contracted import volume (2 marks)",
          "Explanation: Carbon tariff raises import price of dirty steel (+22.5%), reducing quantity demanded of foreign steel (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Tariffs and trade protectionism",
        "diagramSpec": tariffProtectionDiagram
      },
      {
        "id": "9708_43_2022_mj_1c",
        "number": "1(c)",
        "title": "Analyse the concept of 'carbon leakage' and explain why it threatens global environmental sustainability. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Relocation of carbon-intensive manufacturing from jurisdictions with strict carbon pricing to nations with lax standards (2 marks)",
          "Environmental threat: Global emissions do not fall; they may actually increase if foreign producers use more polluting coal energy (2.4 vs 1.2 tCO2) (2 marks)",
          "Economic distortion: Destroys domestic industrial jobs while failing to mitigate climate change (1 mark)"
        ],
        "markingGuide": "2 marks for carbon leakage definition. 2 marks for net global emission impact. 1 mark for industrial distortion. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Carbon leakage and environmental economics"
      },
      {
        "id": "9708_43_2022_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether carbon border adjustments represent genuine climate action or disguised green protectionism. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Evaluation of Green Trade Policy",
            "description": "Rigorous evaluation comparing environmental level-playing-field arguments against developmental green protectionism arguments. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs WTO common-but-differentiated-responsibilities principles against climate externality internalisation."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Genuine climate action: Levels playing field, incentivises developing exporters to adopt clean technologies, closes leakage loophole",
          "Green protectionism: Penalises emerging nations lacking capital for green steel, violates WTO principle of differentiated responsibility",
          "Revenue recycling: EU keeps carbon revenues rather than returning funds to developing green transitions",
          "Evaluation: CBAM is environmentally justified only if border tariff revenues are recycled back into developing country decarbonisation funds."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Trade policy and international environmental agreements"
      }
    ]
  },
  {
    "id": "9708_41_2021_on",
    "title": "Cambridge A Level Economics 9708/41 \u2014 Section A: Ocean Shipping Alliances and Oligopoly Pricing",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "41",
    "examSeries": "2021_oct_nov",
    "seriesLabel": "October/November 2021",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Oligopolistic Cooperation in Global Maritime Shipping",
      "paragraphs": [
        "The ocean container shipping industry consolidated into three massive vessel-sharing alliances (2M, Ocean Alliance, and THE Alliance), controlling 80% of global container ship capacity.",
        "During demand swings, alliances engaged in 'blank sailings'\u2014canceling scheduled ship departures to artificially restrict available container space and protect hyper-inflated freight rates.",
        "Importers and competition regulators accused the carrier alliances of tacit price collusion and antitrust abuse, demanding the repeal of shipping antitrust exemptions."
      ],
      "tables": [
        {
          "title": "Table 1.1: Shipping Alliance Market Shares & Profit Margins (2019\u20132021)",
          "headers": [
            "Alliance Name",
            "Global Fleet Capacity Share (%)",
            "Transpacific Route Share (%)",
            "Net Profit Margin 2019 (%)",
            "Net Profit Margin 2021 (%)"
          ],
          "rows": [
            [
              "Ocean Alliance",
              "34.5%",
              "38.2%",
              "2.1%",
              "48.5%"
            ],
            [
              "2M Alliance",
              "31.2%",
              "28.5%",
              "1.8%",
              "45.2%"
            ],
            [
              "THE Alliance",
              "18.5%",
              "22.0%",
              "-0.5%",
              "41.0%"
            ],
            [
              "Independent Carriers",
              "15.8%",
              "11.3%",
              "1.2%",
              "18.5%"
            ]
          ],
          "notes": "Source: Alphaliner Shipping Data & Carrier Annual Reports."
        }
      ],
      "sources": "Adapted from: Federal Maritime Commission Fact Finding 29 Report 2021."
    },
    "questions": [
      {
        "id": "9708_41_2021_on_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the combined global fleet capacity share controlled by the three major alliances. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Ocean = 34.5%; 2M = 31.2%; THE = 18.5%",
          "Calculation: 34.5% + 31.2% + 18.5% = 84.2% (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "34.5 + 31.2 + 18.5",
          "correctAnswer": "84.2%",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for 84.2%. 2 marks for adding correct components.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Concentration ratios in oligopoly"
      },
      {
        "id": "9708_41_2021_on_1b",
        "number": "1(b)",
        "title": "With the help of a monopoly / collusive oligopoly diagram, explain how shipping alliances used capacity cuts ('blank sailings') to maximize profits. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Collusive Oligopoly Output Restriction Diagram",
          "axes": [
            "Freight Rate ($)",
            "Quantity of Containers (TEU)"
          ],
          "curves": [
            "AR",
            "MR",
            "MC"
          ],
          "shiftDescription": "Alliances act as a joint monopoly, restricting container capacity to where joint MC = MR.",
          "equilibriumDescription": "Capacity restriction drives freight rates up, expanding net profit margins from ~2% to over 48%.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Joint profit maximisation showing restricted output Qm and elevated price Pm (2 marks)",
          "Explanation: Cancelling ship voyages restricts supply, exploiting inelastic demand to skyrocket margins to 48% (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Collusive oligopoly and capacity restriction",
        "diagramSpec": monopolyDeadweightDiagram
      },
      {
        "id": "9708_41_2021_on_1c",
        "number": "1(c)",
        "title": "Analyse the difference between formal price cartels and tacit collusion in container shipping alliances. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Formal cartel: Explicit, legally binding or secret agreement between competing firms to fix prices or carve up markets (2 marks)",
          "Tacit collusion: Unspoken coordination where firms watch each other's capacity cuts ('blank sailings') and match prices without explicit communication (2 marks)",
          "Legal shelter: Vessel sharing agreements operate under antitrust block exemptions, facilitating legal coordination (1 mark)"
        ],
        "markingGuide": "2 marks for formal cartel definition. 2 marks for tacit collusion mechanism. 1 mark for legal exemption context. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Formal vs tacit collusion in oligopoly"
      },
      {
        "id": "9708_41_2021_on_1d",
        "number": "1(d)",
        "title": "Evaluate whether revoking antitrust immunity for shipping alliances is the most effective policy to restore fair competition in maritime trade. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Competition Policy Evaluation & Synthesis",
            "description": "Rigorous evaluation comparing antitrust revocation against public port investments and common-carrier service mandates. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs operational efficiencies of vessel slot-sharing against anti-competitive price gouging."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Antitrust revocation: Prevents coordinated capacity suppression, forces genuine price competition among individual liners",
          "Operational downside: Vessel sharing allows mega-ships (24,000 TEUs) to sail full; breaking alliances might increase sailing costs and carbon emissions",
          "Alternative policies: Common-carrier public utility regulation; maximum detention/demurrage fee caps; independent challenger port investments",
          "Evaluation: Alliances produce genuine scale efficiencies, so strict price regulation and blank-sailing oversight is superior to full breakup."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Antitrust policy in international oligopolies"
      }
    ]
  },
  {
    "id": "9708_42_2021_mj",
    "title": "Cambridge A Level Economics 9708/42 \u2014 Section A: Negative Interest Rates and Commercial Bank Margins",
    "subjectCode": "9708",
    "subjectTitle": "Cambridge International AS & A Level Economics",
    "qualificationLevel": "a2",
    "paperNumber": "42",
    "examSeries": "2021_may_june",
    "seriesLabel": "May/June 2021",
    "totalMarks": 20,
    "durationMinutes": 45,
    "isOfficial": true,
    "extract": {
      "title": "1 Unconventional Monetary Policy and the Zero Lower Bound",
      "paragraphs": [
        "To counter deflationary traps, the European Central Bank (ECB) slashed its deposit facility rate into negative territory (-0.50%), effectively charging commercial banks to park excess reserves.",
        "The objective was to force commercial banks to expand credit to the real economy. However, banks were reluctant to pass negative rates to retail depositors for fear of cash withdrawals (the zero lower bound).",
        "Consequently, bank net interest margins contracted significantly, dampening commercial bank share valuations and impairing the bank lending channel."
      ],
      "tables": [
        {
          "title": "Table 1.1: Eurozone Bank Interest Margins & Credit Creation (2018\u20132021)",
          "headers": [
            "Indicator",
            "2018",
            "2019",
            "2020",
            "2021"
          ],
          "rows": [
            [
              "ECB Deposit Facility Rate (%)",
              "-0.40%",
              "-0.50%",
              "-0.50%",
              "-0.50%"
            ],
            [
              "Average Bank Net Interest Margin (NIM) (%)",
              "1.52%",
              "1.42%",
              "1.28%",
              "1.18%"
            ],
            [
              "Annual Private Sector Credit Growth (%)",
              "+3.4%",
              "+3.7%",
              "+4.5%",
              "+3.2%"
            ],
            [
              "Cash in Circulation Growth (%)",
              "+5.2%",
              "+6.0%",
              "+11.2%",
              "+8.5%"
            ]
          ],
          "notes": "Source: European Central Bank Bank Lending Survey."
        }
      ],
      "sources": "Adapted from: ECB Financial Stability Review 2021."
    },
    "questions": [
      {
        "id": "9708_42_2021_mj_1a",
        "number": "1(a)",
        "title": "Using Table 1.1, calculate the contraction in the Average Bank Net Interest Margin between 2018 and 2021. [3]",
        "maxMark": 3,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "2018 margin = 1.52%; 2021 margin = 1.18%",
          "Calculation: 1.18% - 1.52% = -0.34 percentage points (or 34 basis points) (3 marks)"
        ],
        "calculationGuidance": {
          "formula": "1.18% - 1.52%",
          "correctAnswer": "-0.34 percentage points (or 34 bps contraction)",
          "ofrApplies": true
        },
        "markingGuide": "3 marks for -0.34 percentage points (or 34 basis points). 2 marks for identifying both values.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Net interest margin calculations"
      },
      {
        "id": "9708_42_2021_mj_1b",
        "number": "1(b)",
        "title": "With the help of a money market / bank lending diagram, explain how negative deposit rates compress commercial bank profit margins. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Bank Lending Margin Compression Diagram",
          "axes": [
            "Interest Rate (%)",
            "Quantity of Credit (Q)"
          ],
          "curves": [
            "Lending Rate Curve",
            "Deposit Rate Floor (at 0%)"
          ],
          "shiftDescription": "Negative policy rates drive down market loan rates towards 0%, but deposit rates hit a floor at 0% due to cash hoarding.",
          "equilibriumDescription": "The spread between loan rates and deposit costs (net interest margin) shrinks from 1.52% to 1.18%.",
          "marksAllocated": 2
        },
        "indicativePoints": [
          "Diagram: Shows loan rate falling towards the 0% deposit floor, squeezing the margin spread (2 marks)",
          "Explanation: Banks cannot charge negative rates to retail depositors (ZLB); falling loan rates squeeze bank profitability (2 marks)"
        ],
        "markingGuide": "2 marks for diagram. 2 marks for economic analysis. Total 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Zero lower bound and bank lending channels",
        "diagramSpec": adAsRightwardShiftDiagram
      },
      {
        "id": "9708_42_2021_mj_1c",
        "number": "1(c)",
        "title": "Analyse why negative interest rates led to a surge in cash in circulation (+11.2% in 2020). [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Zero nominal return on cash: Physical paper currency pays 0% nominal return; when bank deposits yield negative returns (-0.5%), cash offers a superior nominal return (2 marks)",
          "Cash hoarding: Institutional investors and corporate treasurers withdraw bank balances into physical vault storage to escape negative charges (2 marks)",
          "Table context: Cash growth spiked to +11.2% in 2020 as deposits were penalised (1 mark)"
        ],
        "markingGuide": "2 marks for relative return of cash vs negative deposits. 2 marks for institutional vault hoarding. 1 mark for data application. Total 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Demand for money and the zero lower bound"
      },
      {
        "id": "9708_42_2021_mj_1d",
        "number": "1(d)",
        "title": "Evaluate whether negative interest rate policy (NIRP) stimulates aggregate demand or perversely contracts bank credit in the long run. [8]",
        "maxMark": 8,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 4
        },
        "hasDiagramRequirement": false,
        "rubricLevels": [
          {
            "level": 3,
            "marksRange": "6\u20138 marks",
            "label": "Effective Evaluation of Unconventional Monetary Tools",
            "description": "Rigorous evaluation comparing theoretical stimulus channels (weaker euro, lower corporate borrowing rates) against the 'reversal interest rate' theory. Reaches justified conclusion.",
            "evaluativeRequirement": "Weighs business investment stimulus against damaged bank profitability and credit rationing."
          },
          {
            "level": 2,
            "marksRange": "3\u20135 marks",
            "label": "Developed Analysis with Partial Evaluation",
            "description": "Developed analysis with partial evaluation and limited contextual synthesis."
          },
          {
            "level": 1,
            "marksRange": "1\u20132 marks",
            "label": "Limited Knowledge & Descriptive Points",
            "description": "Simple assertions with minimal economic reasoning."
          }
        ],
        "indicativePoints": [
          "Stimulus mechanism: Lowers wholesale yields, depreciates exchange rate to boost exports, penalises idle reserves to encourage lending",
          "Reversal rate hypothesis: Severe margin contraction (1.18%) reduces bank profitability, impairing retained capital and eventually contracting lending",
          "Alternative policies: Direct fiscal stimulus, targeted longer-term refinancing operations (TLTROs), tiering exemptions",
          "Evaluation: NIRP provides short-term boost but becomes counterproductive if kept negative for years; tiering exemptions are necessary."
        ],
        "markingGuide": "Follow Level 3/2/1 rubric. AO1/AO2 (up to 4 marks). AO3 Evaluation (up to 4 marks). Total 8 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "Efficacy of negative interest rate policy"
      }
    ]
  }
];
