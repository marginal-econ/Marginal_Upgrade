import type { DataResponsePaper } from "./types";

export const PRELOADED_DATA_RESPONSE_PAPERS: DataResponsePaper[] = [
  // --------------------------------------------------------------------------
  // 1. Cambridge AS Level Economics 9708/22 February/March 2026
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 2. Cambridge AS Level Business 9609/22 February/March 2026
  // --------------------------------------------------------------------------
  {
    id: "9609_22_2026_fm",
    title: "Cambridge AS Level Business 9609/22 — Section A: Kamal's Influencer Exchange (IX)",
    subjectCode: "9609",
    subjectTitle: "Cambridge International AS & A Level Business",
    qualificationLevel: "as",
    paperNumber: "22",
    examSeries: "2026_feb_march",
    seriesLabel: "February/March 2026",
    totalMarks: 30,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Influencer Exchange (IX) Case Study",
      paragraphs: [
        "Kamal was a successful music artist who transitioned into becoming a prominent social media influencer. Recognising an opportunity in digital creator marketing, Kamal launched his own social media platform called Influencer Exchange (IX) in 2020.",
        "The IX platform allows creators to manage and publish posts across multiple external social networks simultaneously. A key Unique Selling Point (USP) for IX is that it provides influencers with significantly better and more detailed analytics data than any other platform. IX is free to use for social media influencers; IX generates revenue by selling targeted advertising slots to commercial business clients wishing to sponsor influencer posts.",
        "IX uses dynamic pricing for its advertising services, adjusting prices per click according to creator follower growth, engagement spikes, and demand from advertisers. Between January and April 2026, influencer A's followers grew from 0.5m to 0.7m, and IX increased the price per click by 100% (from $0.20 to $0.40). Influencer B experienced a 17% drop in price per click ($0.05 decrease), while influencer C's price remained unchanged.",
        "IX's operations are labour-intensive, employing 30 staff members in total, all directly managed by Kamal. The workforce consists of 10 employees in advertising sales (paid on commission), 5 in marketing (paid via profit sharing), 8 technical software employees (paid hourly time rates), and 7 maintenance staff (paid time rates). Kamal currently adopts an autocratic Theory X management style, making all operational decisions centrally and closely supervising all technical and sales processes.",
      ],
      tables: [
        {
          title: "Table 1.1: Influencer Metrics & Advertising Pricing (2026)",
          headers: ["Influencer", "Followers (Jan 2026)", "Followers (Apr 2026)", "Price per click (Jan)", "Price per click (Apr)"],
          rows: [
            ["Influencer A", "0.5m", "0.7m", "$0.20", "$0.40"],
            ["Influencer B", "1.2m", "1.0m", "$0.30", "$0.25"],
            ["Influencer C", "0.3m", "0.3m", "$0.15", "$0.15"],
          ],
        },
        {
          title: "Table 1.2: IX Departmental Staffing & Remuneration Structure",
          headers: ["Department", "Number of Employees", "Payment Method", "Supervision"],
          rows: [
            ["Advertising Sales", "10", "Commission", "Directly by Kamal"],
            ["Marketing", "5", "Profit sharing", "Directly by Kamal"],
            ["Technical / Software", "8", "Time-based payment", "Directly by Kamal"],
            ["Maintenance", "7", "Time-based payment", "Directly by Kamal"],
          ],
        },
      ],
      sources: "Cambridge Assessment International Education 9609/22 Business Concepts 2 F/M 2026",
    },
    questions: [
      {
        id: "9609_22_2026_fm_1ai",
        number: "1(a)(i)",
        title: "Identify one limitation to a business of labour-intensive operations. [1]",
        maxMark: 1,
        category: "definition",
        tariff: { ao1: 1, ao2: 0, ao3: 0 },
        indicativePoints: [
          "Absenteeism / lateness",
          "Different experience or skill levels causing variable output",
          "Need for holidays, breaks, time off",
          "Lower reliability of people compared to automated machines",
          "High labour and wage costs (health care, training, recruitment)",
          "Inconsistent quality due to human error",
          "Labour relations / dispute problems",
          "Potential shortage of skilled employees or slower production",
        ],
        markingGuide: "Award 1 mark for any valid limitation of labour-intensive operations from mark scheme.",
        extractLinkageExpected: false,
        syllabusTopic: "Operations management: Labour vs capital intensity",
      },
      {
        id: "9609_22_2026_fm_1aii",
        number: "1(a)(ii)",
        title: "Explain the term ‘quaternary sector of the economy’. [3]",
        maxMark: 3,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 2, ao3: 0 },
        indicativePoints: [
          "AO1 Knowledge (1 mark): Recognising that the quaternary sector involves information, knowledge, or data-based economic activity.",
          "AO2 Application (2 marks): Describing a valid activity (analysing, storing, developing, researching data) AND giving a real-world instance or business context (e.g. software development, market research firms, AI data analytics, university R&D).",
        ],
        markingGuide:
          "AO1 (1 mark): Identification of information/knowledge/data-based sector. AO2 (up to 2 marks): Valid activity (processing, storing, research) + real-world instance (market research, AI analytics, software firms). No marks without AO1.",
        extractLinkageExpected: false,
        syllabusTopic: "Business structure and economic sectors",
      },
      {
        id: "9609_22_2026_fm_1bi",
        number: "1(b)(i)",
        title:
          "Refer to Table 1.1. Calculate how much it would have cost a business to advertise with influencer A in January 2026 if 10% of influencer A’s followers clicked on the advertisement. [3]",
        maxMark: 3,
        category: "calculation",
        tariff: { ao1: 1, ao2: 2, ao3: 0 },
        indicativePoints: [
          "Identify influencer A followers in January 2026 = 0.5m (or April = 0.7m depending on month referenced in standardisation)",
          "Formula: clicks = followers * click rate; cost = clicks * price per click",
          "From MS: 0.7m * 10% = 0.07m clicks. 0.07m * $0.20 = $0.014m or $14,000",
          "Award 3 marks for correct answer of $0.014m or $14,000 (with or without workings or $ sign)",
          "2 marks for 2 correct steps or arithmetic error with OFR",
          "1 mark for 1 correct step (e.g. 0.07m clicks or formula)",
        ],
        calculationGuidance: {
          formula: "Cost = (Followers * 10%) * Price per click = (0.7m * 0.10) * $0.20 = $14,000",
          correctAnswer: "$14,000 or $0.014m",
          ofrApplies: true,
          markingSteps: [
            "Identify price per click ($0.20) and followers (0.7m) (1 mark)",
            "Calculate 10% of followers = 0.07m clicks (1 mark)",
            "Multiply 0.07m * $0.20 = $0.014m or $14,000 (1 mark)",
          ],
        },
        markingGuide:
          "Award 3 marks for correct answer of $14,000 or $0.014m. Award 2 marks for two correct stages or incorrect final answer with OFR. Award 1 mark for correct formula or correct clicks calculation.",
        extractLinkageExpected: true,
        syllabusTopic: "Marketing calculations and advertising pricing",
      },
      {
        id: "9609_22_2026_fm_1bii",
        number: "1(b)(ii)",
        title: "Explain one way IX adds value to its services. [3]",
        maxMark: 3,
        category: "short_answer",
        tariff: { ao1: 1, ao2: 2, ao3: 0 },
        indicativePoints: [
          "AO1 Knowledge (1 mark): Identifies a recognized way to add value: Convenience, Branding, Quality, Design, or USP.",
          "AO2 Explanation & Context (2 marks): Explains how this increases the gap between cost and selling price for a service (1 mark) AND connects directly to IX context: Kamal's platform allows creators to post across multiple networks simultaneously (convenience) or provides superior analytics data than competitors (USP) (1 mark).",
        ],
        markingGuide:
          "1 mark for knowledge of a way to add value (USP, convenience, branding, quality). 1 mark for explanation of how it adds value to a service. 1 mark for explicit link to IX context (detailed data analytics, multi-platform publishing). No marks without knowledge.",
        extractLinkageExpected: true,
        syllabusTopic: "Added value in business and services",
      },
      {
        id: "9609_22_2026_fm_1c",
        number: "1(c)",
        title: "Analyse one advantage and one disadvantage to IX of using dynamic pricing. [8]",
        maxMark: 8,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 4 },
        rubricLevels: [
          {
            level: 2,
            marksRange: "3–4 marks AO3",
            label: "Developed Analysis of Both Advantage & Disadvantage",
            description:
              "Developed analysis that identifies connections between causes, impacts, and consequences of two points (one advantage and one disadvantage).",
          },
          {
            level: 1,
            marksRange: "1–2 marks AO3",
            label: "Limited Analysis",
            description:
              "Limited analysis identifying connections for one or two points without full chains of reasoning.",
          },
        ],
        indicativePoints: [
          "AO1 Knowledge (2 marks): Dynamic pricing is flexible pricing based on fluctuating demand and competitor activity.",
          "Advantage to IX: Higher prices can be charged when demand increases (e.g. Influencer A followers grew to 0.7m, allowing price per click to double to $0.40), capturing consumer surplus and maximizing revenue and profit for Kamal.",
          "Disadvantage to IX: Corporate advertisers may perceive price hikes as unfair or unpredictable; advertisers can track price fluctuations and delay ad bookings until off-peak periods; pricing changes create administrative complexity for the 10 sales staff.",
          "Context applied: Table 1.1 data (100% increase for influencer A, 17% drop for influencer B), 10 advertising sales staff.",
        ],
        markingGuide:
          "AO1 (2 marks): Knowledge of dynamic pricing. AO2 (2 marks): Application to IX context (Influencer A $0.20 to $0.40, Influencer B decrease, commercial advertisers). AO3 (4 marks): Developed analysis of cause -> impact -> consequence for both advantage and disadvantage.",
        extractLinkageExpected: true,
        syllabusTopic: "Pricing strategies and dynamic pricing",
      },
      {
        id: "9609_22_2026_fm_1d",
        number: "1(d)",
        title: "Evaluate whether laissez-faire is the most appropriate management style for IX. [12]",
        maxMark: 12,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2, ao4: 6 },
        rubricLevels: [
          {
            level: 3,
            marksRange: "5–6 marks AO4",
            label: "Developed Evaluation in Context",
            description:
              "A developed judgement/conclusion is made in the business context that draws together developed evaluative comments balancing key arguments.",
            evaluativeRequirement:
              "Considers what the decision depends upon: differentiates between the 8 technical software staff (who thrive under autonomy and freedom to innovate) vs the 10 sales / 7 maintenance staff (who require clear commission targets and coordination). Reaches a nuanced conclusion on whether pure laissez-faire or situational leadership fits Kamal best.",
          },
          {
            level: 2,
            marksRange: "3–4 marks AO4",
            label: "Developed Evaluation",
            description:
              "A developed conclusion is made balancing some key arguments, but may lack specific context.",
          },
          {
            level: 1,
            marksRange: "1–2 marks AO4",
            label: "Limited Evaluation",
            description: "Conclusion with limited supporting evidence or brief attempt to balance.",
          },
        ],
        indicativePoints: [
          "AO1 Knowledge (2 marks): Laissez-faire involves hands-off leadership giving subordinates freedom to make decisions with minimal managerial intervention.",
          "Arguments for laissez-faire at IX: Faster technical decision-making; the 8 software engineers have specialized knowledge that Kamal (former musician) lacks; autonomy increases motivation and creativity in platform development.",
          "Arguments against laissez-faire / for structured control: Lack of strategic direction; 10 commission-based sales staff may compete aggressively or neglect brand reputation; maintenance staff require operational scheduling; Kamal's current Theory X style means transition will cause friction; dynamic pricing requires consistent firm-wide pricing rules.",
          "Evaluation: Laissez-faire is NOT suitable as a blanket style across all 30 employees. A situational management style is recommended: delegative for technical R&D, but democratic or consultative for sales and marketing.",
        ],
        markingGuide:
          "AO1 (2 marks): Knowledge of laissez-faire. AO2 (2 marks): Application to IX (30 employees, 8 technical, 10 sales, Kamal's Theory X style). AO3 (2 marks): Developed analysis of advantages (autonomy, speed) and disadvantages (lack of coordination, conflict). AO4 (6 marks): Evaluative balance and reasoned contextual judgement.",
        extractLinkageExpected: true,
        syllabusTopic: "Leadership and management styles",
      },
    ],
    sampleAnswers: {
      "1(a)(i)":
        "One major limitation of labour-intensive operations is inconsistent output quality and the risk of human error compared to automated machinery.",
      "1(a)(ii)":
        "The quaternary sector refers to the knowledge-based part of the economy that involves information creation, research, and data processing.\n\nIn business, this includes activities such as analyzing, developing, and researching complex data. A real-world example is an AI data analytics consultancy or a specialised software development firm like IX providing creator performance data.",
      "1(b)(i)":
        "Calculation for Influencer A in January 2026:\n- Number of followers = 0.7m (700,000)\n- Number of clicks at 10% = 0.7m * 0.10 = 0.07m (70,000 clicks)\n- Price per click in January 2026 = $0.20\n\nTotal Advertising Cost = 70,000 * $0.20 = $14,000 (or $0.014m)",
      "1(b)(ii)":
        "IX adds value to its services through developing a Unique Selling Point (USP) in data quality.\n\nAdding value creates a higher differential between production costs and selling price. For IX, the platform provides influencers with significantly more detailed and actionable analytics than any rival network, enabling creators to command higher sponsorship rates. Because advertisers cannot obtain this level of granular creator data elsewhere, IX can charge commercial clients premium advertising rates, thereby adding substantial value to its core service.",
      "1(c)":
        "Dynamic pricing allows IX to adjust price per click according to creator popularity and advertiser demand.\n\nAn advantage to IX is revenue and profit maximisation. When creator popularity surges, IX can immediately capture higher willingness to pay. For example, when Influencer A's audience expanded to 0.7m followers, IX doubled its click rate from $0.20 to $0.40 (a 100% price increase). This increases IX's revenue per campaign and boosts overall profit margins, supplying Kamal with greater funds to reinvest in technical infrastructure.\n\nA disadvantage to IX is the risk of advertiser dissatisfaction and perceived unfairness. Commercial businesses may consider sudden price increases exploitative or unpredictable, especially compared to fixed rate-cards. In Table 1.1, prices fluctuate significantly across creators (such as Influencer B experiencing a 17% price decrease). If corporate clients feel penalised during peak periods, they may switch ad spend to rival marketing platforms, reducing IX's market share and advertising revenue.",
      "1(d)":
        "Laissez-faire leadership gives subordinates broad autonomy to make decisions and organize their work with minimal oversight from top management.\n\nFor IX, adopting laissez-faire has clear merits within specific departments. IX employs 8 technical software specialists who build data pipelines and multi-platform publishing tools. As a former music artist, Kamal likely lacks advanced software engineering expertise. Giving these technical professionals autonomy will speed up bug fixes, foster feature innovation, and boost job satisfaction and retention in a competitive tech labour market.\n\nHowever, a pure laissez-faire approach poses severe risks across IX's remaining workforce. The business employs 10 advertising sales staff paid on commission. Without managerial coordination and clear targets, sales staff might engage in harmful price discounting or aggressive tactics that alienate corporate advertisers. Furthermore, maintenance operations require strict scheduling, and managing dynamic pricing across multiple influencers requires unified operational rules rather than disjointed individual choices. If Kamal withdraws entirely, lack of strategic alignment could escalate operating costs.\n\nIn evaluation, laissez-faire is NOT the most appropriate overarching management style for IX. Given that IX is a labour-intensive operation with 30 employees split into very different functions, Kamal should adopt a situational leadership model: delegating autonomy to the 8 technical developers, while maintaining consultative or democratic oversight over the 10 sales staff to safeguard brand standards and revenue.",
    },
  },

  // --------------------------------------------------------------------------
  // 3. Cambridge A Level Economics 9708/42 February/March 2026
  // --------------------------------------------------------------------------
  {
    id: "9708_42_2026_fm",
    title: "Cambridge A Level Economics 9708/42 — Section A: COVID-19 Economic Interventions",
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
        indicativePoints: [
          "Japan's government fiscal response was 45% of GDP (1 mark)",
          "Ghana's government fiscal response was 2% of GDP (1 mark)",
          "Japan's response was approximately 20+ times larger as a percentage of GDP than Ghana's response (1 mark)",
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
        indicativePoints: [
          "Japan has greater access to international and domestic credit markets to finance sovereign debt at low yields, enabling high deficit spending (1-2 marks).",
          "Ghana is a developing economy with lower credit ratings, fiscal deficits, and limited borrowing ability (1-2 marks).",
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
        rubricLevels: [
          {
            level: 2,
            marksRange: "4–6 marks",
            label: "Developed Evaluation & Assessment of Both Policies",
            description:
              "Clear identification of at least two policies (furlough, debt write-offs, or QE) with developed analysis of advantages (preserving jobs, preventing bankruptcies) and disadvantages (sovereign debt, inflation risks).",
            evaluativeRequirement:
              "Weighs trade-offs between immediate economic survival and long-run macroeconomic stability (debt distress, moral hazard).",
          },
          {
            level: 1,
            marksRange: "1–3 marks",
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

  // --------------------------------------------------------------------------
  // 4. Cambridge A Level Business 9609/42 February/March 2026
  // --------------------------------------------------------------------------
  {
    id: "9609_42_2026_fm",
    title: "Cambridge A Level Business Strategy 9609/42 — Question 1: Potato Farm (PF) Strategy Case",
    subjectCode: "9609",
    subjectTitle: "Cambridge International AS & A Level Business",
    qualificationLevel: "a2",
    paperNumber: "42",
    examSeries: "2026_feb_march",
    seriesLabel: "February/March 2026",
    totalMarks: 20,
    durationMinutes: 45,
    isOfficial: true,
    extract: {
      title: "1 Potato Farm (PF) Strategic Management Case",
      paragraphs: [
        "PF is the largest potato farming enterprise in country B, supplying the majority of major supermarkets and independent grocery stores. In 2019, following devastating crop losses in 2018, founder Farouk converted PF into a private limited company, ceding 60% of equity to a private equity firm while retaining 40%.",
        "PF's stated mission is: 'Fulfilling customer needs with the tastiest potato products, tailored to the Country B market.' At PF's 2020 AGM, financial ratio analysis showed: Gross Profit Margin (GPM) of 85%, Operating Profit Margin of 4%, Return on Capital Employed (ROCE) of 18%, Gearing of 80%, Current Ratio of 1:1, and Acid Test Ratio of 0.3:1.",
        "In 2022, management consultants evaluated two strategic options for growth. Option 1 proposed organic growth by purchasing low-cost agricultural land in neighbouring countries to increase raw potato output and target international export markets. Option 2 proposed forward vertical integration: acquiring ZF, an established manufacturer of processed potato products (chips, frozen wedges). PF's board chose Option 2.",
        "Farouk drafted a strategic implementation plan: assigning roles to the executive team in early 2024, tasking the HR director with post-takeover workforce rationalisation by Feb 2024, requiring a new marketing strategy by June 2024, and demanding full financial and IT system integration by Dec 2024. PF finalised the acquisition of ZF in 2024, trading under the unified PF brand. In 2025, revenue increased by 15% and profit rose by 7%. However, high debt servicing from the takeover continues to burden working capital.",
      ],
      sources: "Cambridge Assessment International Education 9609/42 Business Strategy F/M 2026",
    },
    questions: [
      {
        id: "9609_42_2026_fm_1",
        number: "1",
        title: "Evaluate the effectiveness of PF’s strategic management between 2020 and 2025. [20]",
        maxMark: 20,
        category: "essay_evaluative",
        tariff: { ao1: 3, ao2: 2, ao3: 8, ao4: 7 },
        rubricLevels: [
          {
            level: 3,
            marksRange: "AO3: 7–8 marks · AO4: 6–7 marks",
            label: "Level 3: Comprehensive Strategic Analysis & Effective Contextual Evaluation",
            description:
              "Developed analysis of the overall strategy connecting causes, impacts, and consequences across strategic analysis, choice, and implementation. Evaluative conclusion is made in the business context balancing key arguments (gearing, margin compression, vertical integration benefits vs risks).",
            evaluativeRequirement:
              "Clear judgement on whether strategic management succeeded: balances 15% revenue growth against 80% gearing and low 4% operating profit. Considers what success depends upon (competitor reactions, private equity pressures, debt repayment).",
          },
          {
            level: 2,
            marksRange: "AO3: 4–6 marks · AO4: 3–5 marks",
            label: "Level 2: Developed Analysis of Individual Elements & Developed Evaluation",
            description:
              "Developed analysis of individual elements (Option 2 vertical integration, ratio analysis). Developed evaluative comments balancing some key arguments.",
          },
          {
            level: 1,
            marksRange: "AO3: 1–3 marks · AO4: 1–2 marks",
            label: "Level 1: Limited Analysis & Limited Evaluation",
            description: "Limited points without clear transmission mechanisms or superficial evaluation.",
          },
        ],
        indicativePoints: [
          "AO1 Knowledge (3 marks): Define strategic management (strategic analysis -> strategic choice -> strategic implementation). Frameworks: SWOT, PEST, Ansoff, Porter, Force Field.",
          "AO2 Application (2 marks): PF ratios (85% GPM, 4% OPM, 80% gearing, 0.3:1 acid test), Option 2 takeover of ZF, private equity 60% ownership, 15% revenue growth vs 7% profit increase.",
          "AO3 Analysis (8 marks): Analysis of Strategic Analysis (ratios reveal high overheads causing 4% OPM despite 85% GPM; 80% gearing makes debt dangerous; 0.3 acid test shows inventory risk). Strategic Choice (Option 2 vertical integration secured value chain but carried high acquisition cost). Strategic Implementation (tight deadlines for HR and finance integration; revenue rose 15% but profit only 7% indicating integration friction and rising costs).",
          "AO4 Evaluation (7 marks): Weighing overall effectiveness: Option 2 aligned with mission to deliver value-added potato products and achieved revenue growth, but financial execution was reckless given 80% gearing. Long-term success depends on private equity patience and cash flow stabilisation.",
        ],
        markingGuide:
          "Follow exact Cambridge 9609/42 rubric. AO1 (3 marks): Knowledge of strategic management frameworks. AO2 (2 marks): Contextual application to PF data. AO3 (8 marks): Developed two-sided analysis of strategy elements. AO4 (7 marks): Effective evaluation in business context weighing successes against financial risks.",
        extractLinkageExpected: true,
        syllabusTopic: "Strategic management, strategic choice and implementation",
      },
    ],
  },
];
