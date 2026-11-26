import { loadPdfjs, yieldToMain, type StemBlob } from "@/lib/mcq-pdf-text";

export type TopicalVisualType =
  | "Supply & Demand Graph"
  | "Data Table"
  | "Bar Chart"
  | "4-Diagram Grid"
  | "Exam Question";

export type TopicalQuestionSlice = {
  /** Sequential question number in the compiled topical paper (1..N) */
  number: number;
  /** Short Cambridge paper code, e.g. "9708/12/O/N/22" */
  sourcePaperCode: string;
  /** Full human-readable paper title */
  sourcePaperTitle: string;
  /** Original question number in the source Cambridge PDF */
  originalQuestionNumber: number;
  /** Public URL of the official Cambridge PDF in Supabase storage */
  qpUrl: string;
  /** 1-indexed page number in the source PDF */
  pageNumber: number;
  /** Top Y coordinate in PDF points (origin at bottom-left of 842pt A4 page) */
  yTop: number;
  /** Bottom Y coordinate in PDF points (origin at bottom-left of 842pt A4 page) */
  yBottom: number;
  /** Official Cambridge mark-scheme answer */
  correctAnswer: "A" | "B" | "C" | "D";
  /** Visual element included in the real PDF slice */
  visualType: TopicalVisualType;
  /** Specific 9708 syllabus subtopic */
  subtopic: string;
  /** Assessment objective skill category */
  skill: "knowledge" | "application" | "analysis";
  /** Full extracted text of the question stem for AI explanations & review */
  stemText: string;
};

export type TopicalMcqPaper = {
  id: string;
  syllabusCode: string;
  topicNumber: string;
  domain: "micro" | "macro";
  title: string;
  shortTitle: string;
  subtitle: string;
  level: "as" | "a2";
  durationSeconds: number;
  questionCount: number;
  answerKey: Record<string, "A" | "B" | "C" | "D">;
  sourceYearsLabel: string;
  visualSummaryLabel: string;
  questions: TopicalQuestionSlice[];
};

const W22_QP12_URL = "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/35d2d756-380a-4db4-b62e-9e6f23c3542b-9708_w22_qp_12.pdf";
const S23_QP12_URL = "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf";
const M25_QP12_URL = "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf";

const PRICE_SYSTEM_QUESTIONS: TopicalQuestionSlice[] = [
  {
    number: 1,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 6,
    qpUrl: W22_QP12_URL,
    pageNumber: 3,
    yTop: 447,
    yBottom: 254,
    correctAnswer: "D",
    visualType: "Data Table",
    subtopic: "Price Elasticity of Demand & Tax Expenditure",
    skill: "analysis",
    stemText:
      "An indirect tax is imposed on a product, causing total expenditure by consumers to increase. Which row identifies this situation? [Table comparing price elasticity of demand (elastic vs inelastic) and who bears the majority of the tax burden (consumers vs producers)].",
  },
  {
    number: 2,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: W22_QP12_URL,
    pageNumber: 4,
    yTop: 785,
    yBottom: 428,
    correctAnswer: "C",
    visualType: "Supply & Demand Graph",
    subtopic: "Consumer Surplus & Market Equilibrium",
    skill: "application",
    stemText:
      "The diagram shows the market demand for and supply of a good. Which statement is correct? (Comparing consumer surplus and producer surplus areas across equilibrium price levels).",
  },
  {
    number: 3,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 9,
    qpUrl: W22_QP12_URL,
    pageNumber: 4,
    yTop: 426,
    yBottom: 107,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Elasticity of Supply (PES) Curves",
    skill: "analysis",
    stemText:
      "The diagram shows two linear supply curves labelled S1 and S2, where S2 is a 45° line starting from the origin. Which statement about the price elasticity of supply is correct?",
  },
  {
    number: 4,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 10,
    qpUrl: W22_QP12_URL,
    pageNumber: 5,
    yTop: 785,
    yBottom: 417,
    correctAnswer: "B",
    visualType: "Supply & Demand Graph",
    subtopic: "Government Provision & Excess Demand",
    skill: "analysis",
    stemText:
      "A country has health care provided by the free market. This is replaced by the government provision of Sg free health care. What is the change in consumer surplus or shortage/rationing impact shown in the diagram?",
  },
  {
    number: 5,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 14,
    qpUrl: W22_QP12_URL,
    pageNumber: 6,
    yTop: 646,
    yBottom: 382,
    correctAnswer: "C",
    visualType: "Data Table",
    subtopic: "Price Elasticity of Demand (PED) Comparisons",
    skill: "application",
    stemText:
      "The table shows Lee's and Yim's price elasticity of demand for restaurant meals and cinema tickets when prices rise. Which statement correctly interprets the table?",
  },
  {
    number: 6,
    sourcePaperCode: "9708/12/O/N/22",
    sourcePaperTitle: "9708 Oct/Nov 2022 Paper 12",
    originalQuestionNumber: 16,
    qpUrl: W22_QP12_URL,
    pageNumber: 7,
    yTop: 785,
    yBottom: 522,
    correctAnswer: "C",
    visualType: "Supply & Demand Graph",
    subtopic: "Indirect Tax Incidence & Revenue Areas",
    skill: "analysis",
    stemText:
      "The diagram shows demand and supply curves for a good. S1 is the original supply curve, S2 is supply after a tax is added. How much tax revenue is paid by consumers and producers?",
  },
  {
    number: 7,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 7,
    qpUrl: S23_QP12_URL,
    pageNumber: 3,
    yTop: 659,
    yBottom: 305,
    correctAnswer: "C",
    visualType: "Bar Chart",
    subtopic: "Market Shortages, Surpluses & Disequilibrium",
    skill: "application",
    stemText:
      "There is a worldwide shortage of oil. The diagram shows the consumption and production of oil (billion tonnes) for selected countries. What can be concluded from the bar chart?",
  },
  {
    number: 8,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: S23_QP12_URL,
    pageNumber: 3,
    yTop: 303,
    yBottom: 93,
    correctAnswer: "A",
    visualType: "Data Table",
    subtopic: "Cross Elasticity of Demand (XED)",
    skill: "application",
    stemText:
      "The cross elasticity of demand between bus travel and rail travel is +2. A rise in the price of bus fares causes the demand for rail travel to increase by 10%. Which row shows the correct price and quantity changes?",
  },
  {
    number: 9,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 10,
    qpUrl: S23_QP12_URL,
    pageNumber: 4,
    yTop: 592,
    yBottom: 312,
    correctAnswer: "B",
    visualType: "Supply & Demand Graph",
    subtopic: "Specific Tax & Consumer/Producer Incidence",
    skill: "analysis",
    stemText:
      "A specific tax is placed upon each bottle of perfume sold. In the diagram, S is the supply curve before tax, St is the supply curve after tax. Which area represents the tax revenue paid by producers/consumers?",
  },
  {
    number: 10,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 11,
    qpUrl: S23_QP12_URL,
    pageNumber: 5,
    yTop: 785,
    yBottom: 486,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Elasticity of Supply Along a Curve",
    skill: "knowledge",
    stemText:
      "The diagram shows the supply curve of a firm. Which statement about the price elasticity of supply (PES) along this curve is correct?",
  },
  {
    number: 11,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 12,
    qpUrl: S23_QP12_URL,
    pageNumber: 5,
    yTop: 484,
    yBottom: 186,
    correctAnswer: "C",
    visualType: "4-Diagram Grid",
    subtopic: "Simultaneous Shifts in Demand & Supply",
    skill: "analysis",
    stemText:
      "The diagram shows the market for electric cars with X as the initial equilibrium. What will be the new equilibrium when the price of electric car batteries falls and consumers become more environmentally aware?",
  },
  {
    number: 12,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 14,
    qpUrl: S23_QP12_URL,
    pageNumber: 6,
    yTop: 608,
    yBottom: 302,
    correctAnswer: "A",
    visualType: "Supply & Demand Graph",
    subtopic: "Unitary Price Elasticity & Total Expenditure Areas",
    skill: "analysis",
    stemText:
      "In the diagram, area OP1M1Q1 is equal to area OP2M2Q2. What is the value of the price elasticity of demand between P1 and P2?",
  },
  {
    number: 13,
    sourcePaperCode: "9708/12/M/J/23",
    sourcePaperTitle: "9708 May/June 2023 Paper 12",
    originalQuestionNumber: 15,
    qpUrl: S23_QP12_URL,
    pageNumber: 7,
    yTop: 785,
    yBottom: 427,
    correctAnswer: "D",
    visualType: "Data Table",
    subtopic: "Income Elasticity of Demand (YED) & Normal/Inferior Goods",
    skill: "application",
    stemText:
      "The table shows changes in a consumer's expenditure on various goods when her income increases from $20,000 to $24,000. Assuming prices remain unchanged, which row correctly classifies the goods?",
  },
  {
    number: 14,
    sourcePaperCode: "9708/12/F/M/25",
    sourcePaperTitle: "9708 Feb/March 2025 Paper 12",
    originalQuestionNumber: 7,
    qpUrl: M25_QP12_URL,
    pageNumber: 4,
    yTop: 785,
    yBottom: 445,
    correctAnswer: "D",
    visualType: "Supply & Demand Graph",
    subtopic: "Price Mechanism & Producer Surplus Areas",
    skill: "application",
    stemText:
      "The diagram represents the market for a good. Which statement correctly identifies the market areas shown in the supply and demand diagram?",
  },
  {
    number: 15,
    sourcePaperCode: "9708/12/F/M/25",
    sourcePaperTitle: "9708 Feb/March 2025 Paper 12",
    originalQuestionNumber: 8,
    qpUrl: M25_QP12_URL,
    pageNumber: 4,
    yTop: 443,
    yBottom: 166,
    correctAnswer: "A",
    visualType: "Supply & Demand Graph",
    subtopic: "Cost of Production Shifts & Consumer Burden",
    skill: "analysis",
    stemText:
      "The diagram shows the impact on equilibrium due to an increase in the costs of production. The original price is $72. What is the change in consumer and producer surplus / expenditure?",
  },
];

const GENERATED_TOPICAL_PAPERS: TopicalMcqPaper[] = [
  {
    "id": "topical-9708-as-unit1-basic-ideas",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 1",
    "domain": "micro",
    "title": "Topical Past Paper: Basic Economic Ideas, PPC & Resource Allocation",
    "shortTitle": "Basic Economic Ideas, PPC & Resource Allocation",
    "subtitle": "Production Possibility Curve (PPC) shift diagrams, opportunity cost tables, factors of production, positive vs normative statements, and economic systems.",
    "level": "as",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "B",
      "2": "C",
      "3": "A",
      "4": "D",
      "5": "D",
      "6": "A",
      "7": "D",
      "8": "C",
      "9": "C",
      "10": "C",
      "11": "C",
      "12": "A",
      "13": "A",
      "14": "D"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "8 Diagrams & 1 Table",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 3,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 2,
        "yTop": 450,
        "yBottom": 156,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The production possibility curve shows the maximum potential output of apples and pears for an economy using current resources. Y X apples W Z O pears Which pair of positions identifies an efficient and an inefficient outcome? A W and Y B W and X C X and Z D Y and Z"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 2,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 2,
        "yTop": 631,
        "yBottom": 345,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The diagram shows a country’s production possibilities. Points K, L, M, N, R and S represent different combinations of capital goods and consumer goods. Point K cannot be achieved unless there is economic growth. Point M lies on the country’s production possibility curve. K consumer L M N goods S R O capital goods Which two points must be on opposite sides of the country’s production possibility curve? A K and N B L and R C N and R D R and S"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 5,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 3,
        "yTop": 658,
        "yBottom": 463,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Economic Systems & Resource Allocation",
        "skill": "knowledge",
        "stemText": "Which row correctly identifies goods that would be expected to be produced in a mixed economy? goods that are goods that are goods that have private excludable and rival non-excludable and and external benefits in consumption non-rival in consumption A ✓ ✓ ✓ B ✓ ✓ ✗ C ✓ ✗ ✓ D ✗ ✗ ✓"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 1,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 493,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The diagram shows a country’s production possibility curve. 100 food (units) 0 0 50 drink (units) What can be concluded from the diagram? A Food and drink are normal goods. B The country is self-sufficient in the production of food and drink. C The opportunity cost of food falls as more drink is produced. D There is a constant opportunity cost between food and drink."
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 4,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 485,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The diagram shows the production possibility curve for wheat and corn. M output of wheat N O output of corn What can be deduced from the diagram? A As the price of corn falls, more of it is demanded. B Resources used in producing corn are more efficient than in producing wheat. C The opportunity cost of producing corn falls when moving from M to N. D The opportunity cost of producing corn is constant when moving from M to N."
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 3,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 2,
        "yTop": 446,
        "yBottom": 105,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The diagram shows an economy’s production possibility curve. The economy produces combinations of goods and services using all available resources. services O goods What does the production possibility curve indicate for goods and services? A constant returns to scale in the production of both goods and services B diminishing returns to scale in the production of both goods and services C increasing returns to scale in the production of both goods and services D infinite returns to scale in the "
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 2,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 2,
        "yTop": 661,
        "yBottom": 524,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "Assuming nothing else changes, which change in an economy’s labour market will cause the production possibility curve to shift to the left? A an increase in worker immigration B an increase in the retirement age C an increase in labour productivity D an increase in the school leaving age"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 7,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 3,
        "yTop": 661,
        "yBottom": 307,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "There is a worldwide shortage of oil. The diagram shows the consumption and production of oil (billion tonnes) for selected countries. United States key Japan consumption production Russia Britain 0 0.2 0.4 0.6 0.8 1.0 billion tonnes What can be concluded from the diagram? A In Britain, oil has zero opportunity cost. B In Japan, there is self-sufficiency in oil. C In Russia, there is no shortage of oil. D In the United States, rationing is the only solution to oil shortage."
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 3,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 2,
        "yTop": 496,
        "yBottom": 183,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Production Possibility Curves (PPC) & Opportunity Cost",
        "skill": "analysis",
        "stemText": "The diagram shows the change in a country’s production possibility curve from XX to YY. Y food X O Y X drink What would explain this change? A Consumers chose to consume more food and less drink. B Government taxed food production and subsidised drink production. C Productivity rose in food production and fell in drink production. D There were more imports of food and more exports of drink."
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 1,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 660,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Economic Systems & Resource Allocation",
        "skill": "knowledge",
        "stemText": "Which statement about a market economy is not correct? A Competition is promoted among firms which can increase productive efficiency. B Immobility of the factors of production can lead to allocative inefficiency. C Price always reflects all the costs and all the benefits associated with production. D The entrepreneur is encouraged to innovate and take risks, motivated by profit."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 2,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 2,
        "yTop": 658,
        "yBottom": 452,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Factors of Production & Scarcity",
        "skill": "knowledge",
        "stemText": "To increase production, a firm in industry X needs to install capital equipment, while a firm in industry Y needs to research and introduce a new technology. What time periods are illustrated by these cases? industry X industry Y A short run long run B long run long run C long run very long run D very long run very long run"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 4,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 593,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Factors of Production & Scarcity",
        "skill": "application",
        "stemText": "The price of a good rises by 5% and the quantity of it demanded rises by 3%. At the same time, the incomes of consumers of the good rise by 4%. The law of demand appears not to be working in this case. What is the most likely explanation? A Other things did not remain equal. B The demand for the good was price inelastic. C The real price of the good fell. D The time period was the very short run."
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 5,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 3,
        "yTop": 591,
        "yBottom": 450,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Factors of Production & Scarcity",
        "skill": "application",
        "stemText": "When is division of labour likely to be most effective? A in a large market with stable demand B in a market where consumers prefer a handmade product over a product made using machines C in a market where consumers require a variety of goods D in a small market where consumers require a custom-made product"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 1,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 633,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Factors of Production & Scarcity",
        "skill": "application",
        "stemText": "A tourist visits a government-owned tropical beach. She pays $10 to enter but finds it overcrowded. Which type of good is the beach? A a free good B an inferior good C a public good D a private good"
      }
    ]
  },
  {
    "id": "topical-9708-as-unit2a-demand-supply",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 2A",
    "domain": "micro",
    "title": "Topical Past Paper: Demand, Supply, Market Equilibrium & Consumer/Producer Surplus",
    "shortTitle": "Demand, Supply, Market Equilibrium & Surplus",
    "subtitle": "Market equilibrium shifts, consumer & producer surplus areas, interrelated markets (joint & derived demand), and the price mechanism.",
    "level": "as",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "D",
      "2": "A",
      "3": "B",
      "4": "C",
      "5": "B",
      "6": "B",
      "7": "A",
      "8": "C",
      "9": "B",
      "10": "B",
      "11": "C",
      "12": "C",
      "13": "C",
      "14": "C"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "11 Diagrams & 2 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 9,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 647,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Interrelated Markets, Substitutes & Complements",
        "skill": "analysis",
        "stemText": "What is likely to have a greater effect on an individual demand curve than on a market demand curve? A changing weather patterns B government policy to promote consumption C growth in population D more expensive substitutes"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 7,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 492,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Consumer & Producer Surplus Diagrams",
        "skill": "analysis",
        "stemText": "The diagram shows the market for computers in a country. W supply price Y X demand O Z quantity Which area represents consumer surplus? A WYX B XYO C WYO D OYZ"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 8,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 4,
        "yTop": 490,
        "yBottom": 194,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "analysis",
        "stemText": "The diagram shows the market demand for and supply of foodstuffs for an economy. This economy has faced a decrease in the supply of foodstuffs and , at the same time, an increase in demand for foodstuffs by consumers. Which point represents the market equilibrium following these changes? price S 2 S 1 B A C D D 2 D 1 O quantity"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 10,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 5,
        "yTop": 658,
        "yBottom": 403,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "application",
        "stemText": "The table shows the supply and demand for avocados in kilograms (kg) . price per quantity demanded quantity supplied kg ($) per day (kg) per day (kg) 45 170 230 40 190 190 35 210 150 30 230 110 As a result of lower transport costs, supply rises by 60 kg at all prices. What is the new equilibrium price? A $45 B $40 C $35 D $30"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 6,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 3,
        "yTop": 584,
        "yBottom": 422,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Interrelated Markets, Substitutes & Complements",
        "skill": "analysis",
        "stemText": "Shoe manufacturers often use leather to make their most expensive shoes. Due to a world shortage of leather, the price of leather has risen. What will be the effect of this price change? A The demand curve for leather shoes will shift to the left. B The demand curve for a substitute for leather shoes will shift to the right. C The supply curve for leather shoes will shift to the right. D The supply curve for a substitute for leather to make expensive shoes will shift to the right."
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 10,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 4,
        "yTop": 582,
        "yBottom": 205,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "Consumer & Producer Surplus Diagrams",
        "skill": "analysis",
        "stemText": "Different areas on the diagram represent different aspects of a market. S price R T S U E F D O G H I quantity Which row correctly identifies the three variables shown? consumer producer total consumer surplus surplus expenditure A RST TUOG STEU B RST UST STGO C RTU UTE STGO D RTEU TEF RFU"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 11,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 620,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "analysis",
        "stemText": "Which combination of the classification of a good and market change will cause the demand curve for the good to shift to the right? classification of good market change A inferior good income decrease B inferior good price decrease C normal good income decrease D normal good price decrease"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 5,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 3,
        "yTop": 483,
        "yBottom": 351,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "application",
        "stemText": "A supply curve is represented by the equation quantity supplied = 10 + 5P where P = the price of the product. Which price rise would cause the quantity supplied to double? A $1 to $2 B $1 to $3 C $1 to $4 D $1 to $5"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 9,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 663,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "analysis",
        "stemText": "Which statement correctly describes the shape of the demand curve for a normal good? A It shows an inverse relationship between income and quantity demanded. B It shows an inverse relationship between the price of the good and quantity demanded. C It shows a positive relationship between the price of the good and quantity demanded. D It shows a positive relationship between income and quantity demanded."
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 11,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 5,
        "yTop": 534,
        "yBottom": 345,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Interrelated Markets, Substitutes & Complements",
        "skill": "analysis",
        "stemText": "Butter and buttermilk are goods in joint supply. Supply curves in both markets slope upwards to the right. Health concerns cause people to reduce their consumption of butter. What are the initial consequences of this for supply in the markets for butter and buttermilk? supply of butter supply of buttermilk A move left along supply curve move left along supply curve B move left along supply curve shift left of the supply curve C shift left of the supply curve move left along supply curve D shift "
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 6,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 3,
        "yTop": 491,
        "yBottom": 366,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "analysis",
        "stemText": "What is most likely to cause a shift in the supply curve for rice? A a change in the price of the rice B a change in the price of meat C a change in the size of the rice industry D a change in tastes and preferences for rice"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 8,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 663,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Interrelated Markets, Substitutes & Complements",
        "skill": "analysis",
        "stemText": "What would not cause a shift in the demand curve for a good? A a change in the price of a complement B a change in the price of a substitute C a change in the price of the good itself D a change in consumers’ incomes"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 8,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 488,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Consumer & Producer Surplus Diagrams",
        "skill": "analysis",
        "stemText": "The diagram shows the European market for diesel fuel and the original equilibrium is at M. S1 price M G H N J D 1 D 2 O R T quantity Europeans want low-emission cars and therefore the demand for diesel fuel has decreased from D1 to D2. Which area represents the new producer surplus for companies supplying diesel fuel? A GMNH B JGM C JHN D JNR"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 7,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 3,
        "yTop": 364,
        "yBottom": 160,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Market Demand, Supply & Equilibrium Shifts",
        "skill": "analysis",
        "stemText": "A free market is in disequilibrium with a shortage of a product. As the market moves towards equilibrium, what will happen to the price, the quantity demanded and the quantity supplied? quantity quantity price demanded supplied A decrease decrease increase B decrease increase decrease C increase decrease increase D increase increase decrease"
      }
    ]
  },
  {
    "id": "topical-9708-as-unit3-govt-micro",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 3",
    "domain": "micro",
    "title": "Topical Past Paper: Government Microeconomic Intervention, Taxes, Subsidies & Inequality",
    "shortTitle": "Government Microeconomic Intervention & Taxes",
    "subtitle": "Indirect tax & subsidy incidence diagrams, maximum & minimum price controls, public & merit goods, Gini coefficient, and Lorenz curves.",
    "level": "as",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "D",
      "2": "D",
      "3": "D",
      "4": "A",
      "5": "B",
      "6": "A",
      "7": "A",
      "8": "B",
      "9": "C",
      "10": "B",
      "11": "B",
      "12": "C",
      "13": "B",
      "14": "C"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "9 Diagrams & 4 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 7,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 447,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Maximum & Minimum Price Controls",
        "skill": "analysis",
        "stemText": "The diagram represents the market for a good. P price S 1 X Y D 1 Z O quantity Which statement is correct? A OX represents the price above which no producer wishes to stay in the market. B OZ represents the minimum price consumers are prepared to pay. C PYZ represents the total consumer surplus. D XYZ represents the total producer surplus."
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 12,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 5,
        "yTop": 304,
        "yBottom": 136,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indirect Taxes, Subsidies & Incidence",
        "skill": "analysis",
        "stemText": "A government may use a range of methods to intervene in a market to affect both demand and supply. What is a method which will shift the demand curve for a good? A an indirect tax B a subsidy C direct provision D provision of information"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 15,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 529,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "Income Inequality, Gini Coefficient & Redistribution",
        "skill": "application",
        "stemText": "The table shows the Gini coefficient for income in three countries. 2018 2019 2020 Costa Rica 0.479 0.478 0.497 New Zealand 0.330 0.326 0.320 Sweden 0.275 0.280 0.278 What can be concluded from this data? A All three countries have seen an overall improvement in income equality. B Costa Rica has the highest level of consumer income of all three countries. C New Zealand's income inequality worsened between 2018 and 2020. D Sweden's economy has the highest income equality of all three countries."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 12,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 470,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Public Goods, Merit Goods & Market Failure",
        "skill": "analysis",
        "stemText": "The diagram shows the demand and supply of a good. price S x P y D O Q quantity When the market is in equilibrium, which area measures the difference between what consumers are willing and able to pay and what producers receive at that output? A x B y C x + y D x – y"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 14,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 6,
        "yTop": 342,
        "yBottom": 103,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "Income Inequality, Gini Coefficient & Redistribution",
        "skill": "application",
        "stemText": "The table shows Gini coefficients for both income and wealth in two countries. country P country Q income 0.6 0.5 wealth 0.4 0.7 Which statement is correct? A Gini coefficients are not comparable between income and wealth because one is a flow concept and the other is a stock concept. B Income inequality is greater in country P than in country Q. C Wealth inequality is greater in country P than in country Q. D Wealth inequality is greater than income inequality in both countries."
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 16,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 7,
        "yTop": 623,
        "yBottom": 420,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Public Goods, Merit Goods & Market Failure",
        "skill": "application",
        "stemText": "The table shows selected information from a country’s national accounts. $ billion GDP 28 net property income from abroad –3 capital consumption 6 national debt 2 What is the country’s net national income? A $19 billion B $25 billion C $31 billion D $33 billion"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 15,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 488,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indirect Taxes, Subsidies & Incidence",
        "skill": "application",
        "stemText": "The diagram shows the impact of a government imposing a unit tax on a demerit good. S is the supply curve before the tax and S1 is the supply curve after the tax. price $ S1 S 50 40 30 20 D 0 0 5 10 quantity What is the after-tax revenue of the firm producing the demerit good? A $100 B $200 C $300 D $500"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 10,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 4,
        "yTop": 594,
        "yBottom": 320,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indirect Taxes, Subsidies & Incidence",
        "skill": "analysis",
        "stemText": "A specific tax is placed upon each bottle of perfume sold. In the diagram, S is the supply curve before tax, St is the supply curve after tax. S t price S W R U Q X P T D O Y Z quantity Which area represents that part of the tax revenue paid by producers? A ORWY B PQUT C PRWT D QRWU"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 12,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 5,
        "yTop": 486,
        "yBottom": 194,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Public Goods, Merit Goods & Market Failure",
        "skill": "application",
        "stemText": "The diagram shows the market for electric cars with X as the initial equilibrium. What will be the new equilibrium when the price of electric car batteries falls and consumers become more environmentally aware? D1 D D2 price $ S1 A S B X S2 C D O electric cars"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 11,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 5,
        "yTop": 446,
        "yBottom": 138,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indirect Taxes, Subsidies & Incidence",
        "skill": "analysis",
        "stemText": "The diagram shows the demand and supply curves for solar energy in India. The initial equilibrium point is at X. The Indian government increases the subsidy to solar energy producers. At the same time, there is a rise in the price of alternative sources of energy. What is the new equilibrium position? S2 price of A S1 solar energy S3 D X B D2 C D1 D3 O quantity of solar energy"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 12,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 508,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indirect Taxes, Subsidies & Incidence",
        "skill": "analysis",
        "stemText": "A specific tax is placed on the sale of bottles of lemonade. In the diagram, S is the supply curve before imposition of the tax and St is the supply curve after tax. S t price W S U X D T O quantity Which distance represents the specific tax on each bottle? A UT B WT C WU D WX"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 14,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 436,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Maximum & Minimum Price Controls",
        "skill": "analysis",
        "stemText": "The diagram shows the demand and supply curves for a good. S price P 1 P D O Q 1 Q Q 2 quantity The government fixes a maximum price of OP1. What would happen? A Consumers would have to be rationed to quantity OQ1. B The government would have to introduce a subsidy of PP1. C The market equilibrium quantity OQ would be demanded and supplied. D The supply of quantity OQ2 would be guaranteed."
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 16,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 7,
        "yTop": 295,
        "yBottom": 75,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "Public Goods, Merit Goods & Market Failure",
        "skill": "application",
        "stemText": "The table shows the income and wealth of Yasmin. items $ children’s welfare benefits 1 000 dividends from shares 1 000 property owned 40 000 savings in bank 1 000 shares 2 000 wages 10 000 What is the value of Yasmin’s wealth?"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 13,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 388,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Maximum & Minimum Price Controls",
        "skill": "analysis",
        "stemText": "To help achieve price stability, the government in country F operates a buffer stock scheme, with a minimum price of P 1 and a maximum price of P 2 . The current demand and supply in the market is shown. price S G H P 2 P 1 D O L K J quantity What should the government do to ensure the scheme is effective? A buy an amount equal to GH B buy an amount equal to KJ C buy an amount equal to LJ D do nothing as the equilibrium price is below P 1"
      }
    ]
  },
  {
    "id": "topical-9708-as-unit4a-national-income",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 4A",
    "domain": "macro",
    "title": "Topical Past Paper: National Income, Circular Flow & AD/AS Equilibrium",
    "shortTitle": "National Income, Circular Flow & AD/AS Shifts",
    "subtitle": "Circular flow injections & withdrawals, SRAS/LRAS & Aggregate Demand shift diagrams, and GDP/GNI/NNI data conversions.",
    "level": "as",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "B",
      "2": "C",
      "3": "C",
      "4": "C",
      "5": "B",
      "6": "A",
      "7": "D",
      "8": "A",
      "9": "B",
      "10": "D",
      "11": "D",
      "12": "C",
      "13": "C",
      "14": "D"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "9 Diagrams & 4 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 18,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 353,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows aggregate demand (AD) and long-run aggregate supply (LRAS) with X as the initial equilibrium. LRAS LRAS 1 price level F G X H AD 1 J AD AD 2 O real GDP Which combination of policy and new final equilibrium point is correct? new final policy equilibrium point A increased direct taxation F B increased government G spending on infrastructure C appreciation of the H exchange rates D decreased interest rates J"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 18,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 8,
        "yTop": 441,
        "yBottom": 138,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows aggregate demand (AD) and aggregate supply (AS) where the initial equilibrium is at point X. The central bank forecasts a rise in raw material costs. The government plans to increase spending on health. What would be the new equilibrium in the short run if the forecasts prove to be accurate and the government plans are implemented? AS 1 general AS AS 2 price C level D X B A AD 2 AD AD 1 O real output"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 493,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows the aggregate demand (AD) and long-run aggregate supply (LRAS) curves for a country. X is the original equilibrium position. In one year, over one million foreign workers left the country and at the same time the country’s currency appreciated against the currencies of its major trading partners. What will be the most likely new equilibrium position for this country? LRAS3 LRAS1 LRAS2 general D price level A X AD2 C AD1 B AD3 O real ouput"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 11,
        "yTop": 785,
        "yBottom": 480,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "application",
        "stemText": "The table shows GDP indices for a country over a three-year period. year 1 year 2 year 3 real GDP 100 105 106 money GDP 100 107 115 Inflation and economic growth are two macroeconomic policy objectives. Which row gives a correct assessment of the country’s achievement of these two objectives over the period? rate of rate of inflation economic growth A cannot tell positive B declining cannot tell C positive declining D rising negative"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 18,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 615,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "application",
        "stemText": "The table gives data for an economy. 2010 2011 2012 2013 2014 Gross Domestic Product (GDP) 200 220 240 300 320 at current prices ($ billion) GDP deflator (price index) 100 109 125 149 154 In which year did real GDP decline compared with the previous year? A 2011 B 2012 C 2013 D 2014"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 7,
        "yTop": 374,
        "yBottom": 129,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "application",
        "stemText": "The table gives details of national income statistics for an economy. US$bn consumption 2000 investment 500 government expenditure 600 net exports –100 net foreign factor income –200 depreciation 100 What is the net national income for this economy? A US$2700bn B US$2800bn C US$2900bn D US$3000bn"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 25,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 663,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Aggregate Demand & Aggregate Supply (AD/AS) Shifts",
        "skill": "analysis",
        "stemText": "What is the most likely cause of an outward shift of a country’s aggregate demand curve? A a decrease in the competitiveness of domestically produced products B a decrease in the general price level C a decrease in the money supply D a depreciation of the country’s exchange rate"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 26,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 661,
        "yBottom": 308,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows the macroeconomic equilibrium output and price level changing from Y and P to Y1 and P1. LRAS price level P P1 AD AD1 O Y1 Y real output What could have caused this change? A a decrease in exports B a decrease in labour productivity C an increase in the government’s spending D an increase in the money supply"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 28,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 396,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows aggregate demand (AD) and aggregate supply in the short run (SRAS) and the long run (LRAS). LRAS LRAS1 price level W SRAS SRAS1 Y AD O real GDP Which row is correct in causing a shift in the short run aggregate supply from SRAS to SRAS1 and the long run aggregate supply from LRAS to LRAS1? shift from SRAS to SRAS1 shift from LRAS to LRAS1 A change in AD from W to Y increase in population B decrease in raw material costs improvements in the education of workers C decrease in wag"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 523,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Circular Flow of Income (Injections & Withdrawals)",
        "skill": "analysis",
        "stemText": "The diagram shows a basic two-sector circular flow of income. factor market firms households product market What can be concluded about the direction of flows? A Consumer expenditure flows anticlockwise. B Goods and services flow clockwise. C Incomes flow anticlockwise. D Resources flow anticlockwise."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 18,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 8,
        "yTop": 661,
        "yBottom": 536,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "Which statement explains why the aggregate demand curve is downward sloping? A As prices fall, the demand for exports becomes more elastic. B As prices fall, fewer goods are imported. C As prices fall, the rate of interest will rise. D As prices fall, real wealth rises and so spending increases."
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 19,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 8,
        "yTop": 534,
        "yBottom": 242,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "The diagram shows the aggregate demand (AD) and aggregate supply (AS) for an economy. AS2 general price AS1 level AD O real output Which changes in subsidies and indirect taxes would have caused the change from AS1 to AS2? A higher subsidies and higher indirect taxes B higher subsidies and lower indirect taxes C lower subsidies and higher indirect taxes D lower subsidies and lower indirect taxes"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 9,
        "yTop": 410,
        "yBottom": 138,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "analysis",
        "stemText": "In the diagram, the intersection of AD and LRAS at point X represents the current macroeconomic equilibrium. Which point could represent the new equilibrium after the introduction of an increase in the retirement age? LRAS2 LRAS LRAS1 general price level B C D X AD1 A AD AD2 O real GDP"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 19,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 8,
        "yTop": 351,
        "yBottom": 196,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "National Income Statistics (GDP, GNI & Real Output)",
        "skill": "application",
        "stemText": "The money income of a country rises by 10% whereas its population falls by 10% during a year. What is likely to happen to the national income per head? A It will remain unchanged. B It will rise by exactly 20%. C It will rise by less than 20%. D It will rise by more than 20%."
      }
    ]
  },
  {
    "id": "topical-9708-as-unit4b-macro-indicators",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 4B",
    "domain": "macro",
    "title": "Topical Past Paper: Inflation (CPI), Unemployment & Economic Growth",
    "shortTitle": "Inflation, Unemployment & Economic Growth",
    "subtitle": "Consumer Price Index (CPI) weighting tables, inflation & deflation trends, structural/cyclical unemployment, and output gaps.",
    "level": "as",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "A",
      "2": "A",
      "3": "B",
      "4": "C",
      "5": "C",
      "6": "A",
      "7": "A",
      "8": "A",
      "9": "A",
      "10": "C",
      "11": "C",
      "12": "D",
      "13": "B",
      "14": "B"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "3 Diagrams & 6 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 23,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 499,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "application",
        "stemText": "The table shows government spending and revenue over a three-year period. government government year spending revenue ($bn) ($bn) 1 90 100 2 110 110 3 130 115 What can be concluded from the data? A A budget surplus becomes a budget deficit in year 3. B National debt is likely to be falling by the end of year 3. C The current account balance is in equilibrium in year 2. D The economy is at full employment equilibrium in year 2."
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 11,
        "yTop": 474,
        "yBottom": 255,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Inflation, Deflation & CPI Measurement",
        "skill": "application",
        "stemText": "The table gives the terms of trade index for a country over three years. year 1 year 2 year 3 terms of trade 100 105 112 What is the most likely impact of this change? A there will be a decrease in cost-push inflation B there will be a decrease in living standards C there will be an increase in the budget surplus D there will be an increase in the volume of exports"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 23,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 9,
        "yTop": 364,
        "yBottom": 189,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "application",
        "stemText": "Which change affecting the foreign exchange market for the US$ would be most likely to result in a shift to the right of the demand curve and a movement along the supply curve? A The US government reduces subsidies on exports to the EU. B Foreign currency speculators in Switzerland believe that the US$ is undervalued and act accordingly. C The US government intervenes in the foreign exchange market so as to bring about a drop in the value of the US$. D US pharmaceutical companies experience a fa"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 22,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 528,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "application",
        "stemText": "The table shows the relative price of exports compared with imports expressed as an index number for an economy (2013 = 100). date index 2013 100 2014 97 2015 95 Which statement about the period 2013–2015 is correct? A Export prices have increased each year. B The general level of prices has fallen. C The terms of trade have deteriorated. D The volume of imports increasingly exceeds the volume of exports."
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 23,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 8,
        "yTop": 526,
        "yBottom": 216,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "application",
        "stemText": "Country X and country Y each allocate half of their resources towards the manufacturing of shoes, and the other half towards the manufacturing of t-shirts. Resources can be used equally effectively in the production of both products in both countries. The table shows the output of shoes and t-shirts produced by both countries using half their resources in each case, before specialisation. country shoes t-shirts X 4 000 12 000 Y 2 000 8 000 total 6 000 20 000 What can be concluded from the data? "
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 22,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 9,
        "yTop": 521,
        "yBottom": 328,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Types & Measurement of Unemployment",
        "skill": "application",
        "stemText": "The table shows the types of unemployment and their possible solutions. Which combination is not correct? type of possible solution unemployment A technological introduce minimum wage legislation B cyclical raise government spending C frictional increase advertising of job vacancies D structural retrain workers"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 11,
        "yTop": 785,
        "yBottom": 438,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Inflation, Deflation & CPI Measurement",
        "skill": "analysis",
        "stemText": "The diagram shows the current equilibrium of an economy. The government introduces a contractionary monetary policy. AS price level AD O output What is the most likely outcome? A a fall in investment and a fall in inflation B a fall in investment and a rise in inflation C a rise in investment and a fall in inflation D a rise in investment and a rise in inflation"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 22,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 548,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "application",
        "stemText": "The table shows data on the Japanese balance of trade in goods. exchange rate exports imports year yen / dollar $bn $bn 2016 109 635 585 2017 111 689 645 What can be concluded from this data? A The demand for Japanese exports was price inelastic. B The Japanese current account was in surplus. C The majority of Japanese imports were essential goods. D The Marshall–Lerner condition for Japan is greater than 1."
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 23,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 10,
        "yTop": 546,
        "yBottom": 176,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "analysis",
        "stemText": "The diagram shows production possibility curves for two countries, India and Japan. 600 rice 500 India Japan 0 0 200 tea Which combination of outputs would be achieved if each country specialised in the product in which it has a comparative advantage? rice tea A 600 200 B 600 500 C 1200 200 D 1200 1000"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 9,
        "yTop": 591,
        "yBottom": 436,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Types & Measurement of Unemployment",
        "skill": "knowledge",
        "stemText": "A government cuts income tax. Why might this be seen as an example of a supply-side policy? A Real incomes are increased. B The costs of businesses are reduced. C The opportunity cost of unemployment has increased. D The standard of living has improved."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 22,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 9,
        "yTop": 434,
        "yBottom": 255,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Inflation, Deflation & CPI Measurement",
        "skill": "knowledge",
        "stemText": "Which combination of fiscal policy measures will reduce both the inflation rate and income inequality? subsidies on food and direct taxes indirect taxes public transport A decrease decrease increase B decrease increase increase C increase decrease increase D increase increase decrease"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 23,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 9,
        "yTop": 253,
        "yBottom": 98,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "knowledge",
        "stemText": "A country ’ s central bank decides to reduce the level of credit regulation. What is this an example of? A contractionary fiscal policy B contractionary monetary policy C expansionary fiscal policy D expansionary monetary policy"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 10,
        "yTop": 344,
        "yBottom": 216,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Inflation, Deflation & CPI Measurement",
        "skill": "knowledge",
        "stemText": "When is a country’s exchange rate most likely to fall? A When its current account surplus exceeds that of its trading partners. B When its inflation rate exceeds that of its trading partners. C When its interest rate exceeds that of its trading partners. D When its unemployment rate exceeds that of its trading partners."
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 21,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 501,
        "yBottom": 346,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Economic Growth & Output Gaps",
        "skill": "knowledge",
        "stemText": "A government wants to operate a tighter monetary policy. What would it increase? A budget surplus B interest rate C money supply D rates of taxation"
      }
    ]
  },
  {
    "id": "topical-9708-as-unit5-macro-policy",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 5",
    "domain": "macro",
    "title": "Topical Past Paper: Macroeconomic Policies (Fiscal, Monetary & Supply-Side)",
    "shortTitle": "Fiscal, Monetary & Supply-Side Policies",
    "subtitle": "Government budget deficits & national debt, central bank interest rate & money supply shifts, and long-run supply-side policies.",
    "level": "as",
    "durationSeconds": 1440,
    "questionCount": 12,
    "answerKey": {
      "1": "A",
      "2": "C",
      "3": "B",
      "4": "B",
      "5": "D",
      "6": "A",
      "7": "B",
      "8": "D",
      "9": "D",
      "10": "A",
      "11": "C",
      "12": "A"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "2 Diagrams",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 26,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 648,
        "yBottom": 346,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "analysis",
        "stemText": "A country currently producing at point X on its production possibility curve decides to specialise in the manufacture of cars and import trucks. It finds it can import one truck in exchange for four cars. 2000 trucks X 1000 0 0 5000 10 000 cars What is the result in the domestic market if it exports all the extra cars? A 250 extra trucks B 1000 extra trucks C 1250 extra trucks D 2000 extra trucks"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 26,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 10,
        "yTop": 471,
        "yBottom": 95,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "analysis",
        "stemText": "The world consists of two countries, M and N. The graphs show their production possibilities for wheat and rice. country M country N 100 rice rice 75 0 0 0 100 0 50 wheat wheat Countries M and N operate on their production possibility curves and, before specialisation, country M produces 60 units of wheat and country N produces 30 units of wheat. What will be the change in the world output of rice if both countries decide to specialise according to comparative advantage? A It will fall by 5 unit"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 25,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 10,
        "yTop": 631,
        "yBottom": 503,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Fiscal Policy & The Government Budget",
        "skill": "knowledge",
        "stemText": "What defines a progressive tax? A All taxpayers pay the same proportion of income in taxes. B Low-income earners pay a lower proportion of income in taxes than high-income earners. C Low-income earners pay less in taxes than high-income earners. D Low-income earners pay more in taxes than high-income earners."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 26,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 10,
        "yTop": 501,
        "yBottom": 346,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "application",
        "stemText": "Country X trades with country Y. What are the terms of trade for country X? A average price of country X’s exports divided by the average price of country Y’s exports B the ratio of an index of country X’s export prices to an index of its import prices C value of country X’s exports divided by the value of country Y’s exports D value of country X’s imports divided by the value of country Y’s imports"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 26,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 210,
        "yBottom": 82,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "knowledge",
        "stemText": "Which argument in favour of protectionism is not generally regarded as economically valid? A Once the protected industry becomes established, it will produce efficiently. B It prevents heavily subsidised imports from competing unfairly against domestic goods. C It provides time for the protected industry’s workers to be retrained for other work. D It increases the standard of living of the population in general."
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 25,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 650,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "knowledge",
        "stemText": "What is not a valid explanation of why a government might allow a deficit on the balance of payments current account to continue? A The balance of payments account must always balance. B Foreign direct investment might help to finance the deficit. C The country may have a larger surplus on the other parts of its balance of payments account. D The standard of living is increased if the level of cheap food imports is significant."
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 24,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 9,
        "yTop": 187,
        "yBottom": 75,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "application",
        "stemText": "What can be best understood from a knowledge of a country’s terms of trade? A its balance of payments performance B the purchasing power of its exports C the standard of living within the country D the value of its real exchange rate"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 25,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 580,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "knowledge",
        "stemText": "A company produces goods for export only. Which change could cause a rise in the price of its goods while the quantity sold is unchanged? domestic foreign workers’ consumers’ wages wages A unchanged fall B fall unchanged C fall fall D rise rise"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 30,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 11,
        "yTop": 478,
        "yBottom": 328,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Monetary Policy & Interest Rates",
        "skill": "analysis",
        "stemText": "A government raises interest rates to improve the current account of the balance of payments. What might reduce the effectiveness of this policy? A a fall in domestic growth B consumer pessimism C increased domestic saving D price-elastic demand for exports"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 9,
        "yTop": 306,
        "yBottom": 156,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Fiscal Policy & The Government Budget",
        "skill": "application",
        "stemText": "A country had a current account surplus of $141bn. Which policy may its government implement to reduce this surplus in the short run? A a decrease in direct taxes B a decrease in regulations to encourage more foreign firms to locate in this country C an increase of import duties D an increase in interest rates"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 25,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 11,
        "yTop": 636,
        "yBottom": 473,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Supply-Side Policies & Productive Capacity",
        "skill": "application",
        "stemText": "A country with a floating exchange rate experiences a large surplus on the current account of its balance of payments. What is likely to decrease as a consequence? A the exports of capital from the country B the level of employment in the country C the prices of imports into the country D the value of the country’s currency"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 11,
        "yTop": 345,
        "yBottom": 220,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Fiscal Policy & The Government Budget",
        "skill": "knowledge",
        "stemText": "What would be classified as a supply-side policy measure? A a law to reduce the power of trade unions B a reduction in the government’s fiscal deficit C an open market sale of securities D the imposition of a tariff on imported goods"
      }
    ]
  },
  {
    "id": "topical-9708-as-unit6-international-trade",
    "syllabusCode": "9708",
    "topicNumber": "AS Topic 6",
    "domain": "macro",
    "title": "Topical Past Paper: International Trade, Protectionism, Balance of Payments & Exchange Rates",
    "shortTitle": "International Trade, Tariffs, BoP & Exchange Rates",
    "subtitle": "Absolute & comparative advantage tables, tariff & quota diagrams, terms of trade, current account components, and exchange rates.",
    "level": "as",
    "durationSeconds": 1440,
    "questionCount": 12,
    "answerKey": {
      "1": "B",
      "2": "B",
      "3": "B",
      "4": "C",
      "5": "A",
      "6": "B",
      "7": "C",
      "8": "B",
      "9": "B",
      "10": "A",
      "11": "D",
      "12": "B"
    },
    "sourceYearsLabel": "2022 – 2025 Real Papers",
    "visualSummaryLabel": "3 Diagrams & 1 Table",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 11,
        "yTop": 474,
        "yBottom": 145,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Comparative Advantage & Terms of Trade",
        "skill": "analysis",
        "stemText": "The diagram shows the production possibilities for barley and wheat in countries Q and R. 80 barley 60 country Q country R 0 0 20 80 wheat What can be concluded? A Country Q has a comparative advantage in the production of barley. B Country Q has an absolute advantage in producing both goods. C Country R has an absolute advantage in the production of barley. D There is no comparative advantage."
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/12/F/M/25",
        "sourcePaperTitle": "9708 Feb/March 2025 Paper 12",
        "originalQuestionNumber": 30,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/302a70a9-f1de-4436-8d30-18eb4fc57dd0-9708_m25_qp_12.pdf",
        "pageNumber": 12,
        "yTop": 785,
        "yBottom": 75,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Balance of Payments & Current Account",
        "skill": "application",
        "stemText": "The diagram shows the impact of a government introducing an export subsidy for its domestic producers of oil. domestic supply domestic supply + export subsidy price 70 $ 50 42 world supply domestic demand 0 0 20 35 45 50 60 quantity / millions What will be the effect of this export subsidy on the operation of the domestic market? A domestic output of oil will increase by 15 million units B imports of oil will decrease by 25 million units C the domestic price of oil will decrease by $28 D the dom"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 30,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 12,
        "yTop": 785,
        "yBottom": 75,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "Comparative Advantage & Terms of Trade",
        "skill": "application",
        "stemText": "Country X and country Y use the same amount of resources to produce mobile phones and televisions. The table shows how much of each product can be produced if all resources are used to produce that product. mobile phones televisions country X 500 400 country Y 100 200 What can be deduced about absolute advantage and comparative advantage? Country X has an absolute advantage in producing mobile phones and a comparative advantage A in producing televisions. Country X has an absolute advantage in p"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/13/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 13",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 394,
        "yBottom": 109,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Protectionism: Tariffs, Quotas & Export Subsidies",
        "skill": "application",
        "stemText": "The diagram shows that the imposition of a tariff raises a product’s world price from $10 to $14. domestic supply price $ 14 10 domestic demand 0 0 20 30 70 100 quantity (millions) By how much did domestic producers’ income increase as a result of the tariff? A $120 million B $160 million C $220 million D $280 million"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 11,
        "yTop": 785,
        "yBottom": 633,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Protectionism: Tariffs, Quotas & Export Subsidies",
        "skill": "knowledge",
        "stemText": "A country has a deficit on the current account of the balance of payments. What would be expected to increase the deficit? A an appreciation of the exchange rate B an increase in domestic productivity C an introduction of import quotas D a rise in subsidies to domestic firms"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/13/M/J/25",
        "sourcePaperTitle": "9708 May/June 2025 Paper 13",
        "originalQuestionNumber": 28,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/92525e8a-2c40-4be5-aef2-6970fa1b72e6-9708_s25_qp_13.pdf",
        "pageNumber": 11,
        "yTop": 631,
        "yBottom": 476,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Protectionism: Tariffs, Quotas & Export Subsidies",
        "skill": "analysis",
        "stemText": "A government increases the import quota of cars. What is the likely effect of this? A jobs will be created in the domestic car industry B prices of cars will fall for domestic consumers C specialisation is reduced D trading partners will retaliate"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 28,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 561,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Protectionism: Tariffs, Quotas & Export Subsidies",
        "skill": "knowledge",
        "stemText": "Two statements describing forms of protectionism a government can use are listed. 1 There is a total ban on imports. 2 All imported goods have to be of a specified standard. Which combination correctly describes these two statements? statement 1 statement 2 A administrative barrier import quota B administrative barrier embargo C embargo administrative barrier D embargo import quota"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 559,
        "yBottom": 435,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Comparative Advantage & Terms of Trade",
        "skill": "application",
        "stemText": "When is there an improvement in a country’s terms of trade? A when the price of exports falls more than the price of imports B when there is no change in the price of exports but a fall in the price of imports C when the value of exports increases relative to the total value of imports D when the volume of exports increases relative to the total volume of imports"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/13/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 13",
        "originalQuestionNumber": 30,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/6fe7a05e-e113-4096-8f4b-27e227adbf85-9708_w24_qp_13.pdf",
        "pageNumber": 10,
        "yTop": 433,
        "yBottom": 308,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Balance of Payments & Current Account",
        "skill": "application",
        "stemText": "What is likely to happen if there is a rise in the international value of a country’s currency? A a fall in the foreign currency price of its exports B a fall in the volume of its exports C a rise in the domestic currency price of its imports D a rise in the domestic price level"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/12/F/M/23",
        "sourcePaperTitle": "9708 Feb/March 2023 Paper 12",
        "originalQuestionNumber": 27,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/35f304c1-e600-4da0-8e52-db3bfff959c5-9708_m23_qp_12%20(1).pdf",
        "pageNumber": 10,
        "yTop": 395,
        "yBottom": 271,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Exchange Rate Determination & Currency Shifts",
        "skill": "knowledge",
        "stemText": "Why might a government prefer to use floating exchange rates? A It allows the government more independence in policy making. B It encourages the government to build up its foreign exchange reserves. C It eliminates the instability of free markets. D It gives firms more confidence in future costs and prices."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/12/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 12",
        "originalQuestionNumber": 28,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_12.pdf",
        "pageNumber": 11,
        "yTop": 436,
        "yBottom": 273,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Protectionism: Tariffs, Quotas & Export Subsidies",
        "skill": "analysis",
        "stemText": "A government wishes to reduce the deficit on the secondary income section of its current account. Which policy would be most effective? A an increase in subsidies to exporters B an increase in the tariffs on imports C a reduction in the number of migrant workers allowed into the country D a reduction in overseas aid donations"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/11/M/J/23",
        "sourcePaperTitle": "9708 May/June 2023 Paper 11",
        "originalQuestionNumber": 29,
        "qpUrl": "https://xdqafkfmxpekuticnpob.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2023/9708_s23_qp_11.pdf",
        "pageNumber": 12,
        "yTop": 785,
        "yBottom": 553,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Balance of Payments & Current Account",
        "skill": "application",
        "stemText": "A country experiences a fall in the value of exports and an increase in the value of imports of goods and services. What are the effects of these changes? balance of aggregate payments on demand goods and services A fall improve B fall worsen C rise improve D rise worsen"
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit7a-utility-efficiency",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 7A",
    "domain": "micro",
    "title": "Topical Past Paper: Utility Theory, Indifference Curves, Budget Lines & Efficiency",
    "shortTitle": "Utility Theory, Indifference Curves & Efficiency",
    "subtitle": "Indifference curve & budget line diagrams, income & substitution effects for normal/inferior/Giffen goods, equi-marginal utility, and Pareto efficiency.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "B",
      "2": "A",
      "3": "C",
      "4": "C",
      "5": "C",
      "6": "C",
      "7": "B",
      "8": "B",
      "9": "D",
      "10": "A",
      "11": "B",
      "12": "B",
      "13": "D",
      "14": "B"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "9 Diagrams & 2 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 636,
        "yBottom": 511,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "What does an indifference curve show? A the amount of two products achievable with given income and prices B the different combinations of two goods that give a consumer equal utility C the income available to buy the two goods D the rate at which marginal utility changes as consumption changes"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 3,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 509,
        "yBottom": 244,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Economic Efficiency (Pareto, Allocative & Dynamic)",
        "skill": "application",
        "stemText": "The table shows the total amount consumers are willing to pay for different quantities of good X and the total external benefits that arise from the consumption of X. quantity of consumers’ total external good X willingness to pay benefits (000 units) ($000) ($000) 1 100 20 2 180 38 3 240 54 4 280 68 5 300 80 What is the value of the marginal social benefit when 5000 units are consumed? A $12 000 B $32 000 C $80 000 D $380 000"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 2,
        "yTop": 635,
        "yBottom": 247,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "The diagram shows indifference curves I 1, I 2 and a budget line T. 100 90 units 80 of X 70 60 50 40 30 I 1 20 I 2 10 T 0 0 5 10 15 20 25 30 35 40 45 50 units of Y Which combination of X and Y gives the consumer maximum satisfaction? units of X units of Y A 100 0 B 70 15 C 50 25 D 20 40"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 1,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 449,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Marginal Utility & Equi-Marginal Principle",
        "skill": "application",
        "stemText": "The table shows the total utility gained by a consumer from the consumption of water. quantity total consumed utility / bottles 0 0 1 30 2 40 3 48 4 54 5 58 What can be concluded from this table? A Marginal utility increases as consumption increases. B The consumer cannot switch expenditure to another product to increase total utility. C The marginal utility of the 3rd unit is 8. D The marginal utility of the 5th unit is 2."
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 2,
        "yTop": 635,
        "yBottom": 247,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "The diagram shows indifference curves I 1, I 2 and a budget line T. 100 90 units 80 of X 70 60 50 40 30 I 1 20 I 2 10 T 0 0 5 10 15 20 25 30 35 40 45 50 units of Y Which combination of X and Y gives the consumer maximum satisfaction? units of X units of Y A 100 0 B 70 15 C 50 25 D 20 40"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 1,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 544,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Marginal Utility & Equi-Marginal Principle",
        "skill": "analysis",
        "stemText": "The diagram shows a total utility curve for a consumer. At which point does marginal utility equal zero? total C utility B A D O quantity"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 2,
        "yTop": 542,
        "yBottom": 417,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "What is a characteristic of an indifference curve? A It will remain concave to the origin of the diagram. B It will remain convex to the origin of the diagram. C It can intersect other indifference curves at any point. D The lower the indifference curve, the greater the satisfaction attainable."
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 661,
        "yBottom": 536,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "Which feature of indifference curve theory is most likely to apply in reality? A The consumer can express preferences between all possible combinations of goods. B The consumer has a limited income to spend. C The consumer will always behave rationally. D The consumer will always get positive utility from having more of the goods."
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 3,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 534,
        "yBottom": 184,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Economic Efficiency (Pareto, Allocative & Dynamic)",
        "skill": "analysis",
        "stemText": "Diagrams 1 and 2 show different long-run average cost curves (LRAC). diagram 1 diagram 2 cost cost LRAC LRAC O output O output Which situations do the two diagrams show? diagram 1 diagram 2 A falling returns to scale average cost is greater than marginal cost B falling returns to scale rising returns to scale C unit cost falls as output increases falling average fixed costs D unit cost falls as output increases unit cost rises as output increases"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 8,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 433,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Economic Efficiency (Pareto, Allocative & Dynamic)",
        "skill": "analysis",
        "stemText": "The diagram shows the marginal private benefit (MPB), the marginal private cost (MPC) and the marginal social cost (MSC) for firms in an industry. The equilibrium price is point X. price MSC MPC X MPB = MSB O quantity What should happen to achieve allocative efficiency? A a decrease in consumption and an increase in price B a decrease in production and no change in price C an increase in consumption and a decrease in production D an increase in price and no change in production"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 2,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 2,
        "yTop": 558,
        "yBottom": 434,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indifference Curves, Budget Lines & Income/Substitution Effects",
        "skill": "analysis",
        "stemText": "Which statement about indifference curves is not correct? A Indifference curves are usually convex to the origin of the diagram. B Indifference curves can intersect each other. C The consumer always prefers a higher indifference curve to a lower one. D The slope of the indifference curve represents the marginal rate of substitution."
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 1,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 638,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Marginal Utility & Equi-Marginal Principle",
        "skill": "knowledge",
        "stemText": "A person buys two pairs of socks. What does the purchase of the second pair of socks lead to? A a decrease in marginal productivity B a decrease in marginal utility C an increase in marginal productivity D an increase in marginal utility"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 7,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 663,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Economic Efficiency (Pareto, Allocative & Dynamic)",
        "skill": "knowledge",
        "stemText": "In which market structure is dynamic efficiency least likely to occur? A oligopoly B monopolistic competition C monopoly D perfectly competitive"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 1,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 2,
        "yTop": 785,
        "yBottom": 637,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Marginal Utility & Equi-Marginal Principle",
        "skill": "knowledge",
        "stemText": "Which statement about the concept of utility is correct? A Diminishing marginal utility means that producers become less efficient the more they produce. B If marginal utility is above average utility, average utility must be rising. C The equi-marginal principle says that a consumer gets equal total satisfaction from each item purchased. D Total utility continually rises as the level of consumption rises."
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit7b-externalities-cba",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 7B",
    "domain": "micro",
    "title": "Topical Past Paper: Externalities (MSC/MSB), Deadweight Loss & Cost-Benefit Analysis",
    "shortTitle": "Externalities, Market Failure & Cost-Benefit Analysis",
    "subtitle": "Marginal social vs private cost/benefit diagrams, deadweight welfare loss triangles, pollution permits, moral hazard, and CBA tables.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "B",
      "2": "C",
      "3": "B",
      "4": "C",
      "5": "A",
      "6": "B",
      "7": "B",
      "8": "B",
      "9": "D",
      "10": "D",
      "11": "C",
      "12": "D",
      "13": "C",
      "14": "C"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "9 Diagrams & 3 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 5,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 3,
        "yTop": 568,
        "yBottom": 376,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "Two firms selling the same type of product find it more efficient to merge. Which combination describes how the merged firm’s average costs of production and demand curve are expected to change? average costs demand curve A fall more elastic B fall more inelastic C rise more elastic D rise more inelastic"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 6,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 3,
        "yTop": 374,
        "yBottom": 75,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows the costs and revenues of a firm operating in an imperfect market. MC cost, revenue AC MR AR O W X Y Z output The firm is currently producing at the profit maximising level of output. It wishes to produce at the sales maximising level of output. What would be the change in its output? A OW to OX B OW to OY C OW to OZ D OY to OZ"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 4,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 516,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows the cost and revenue curves for a firm. Which output level will enable a firm to achieve its objective of maximising its revenue? MC price AC P1 P2 P3 P4 MR D = AR O A B C D quantity"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 6,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 447,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "application",
        "stemText": "A firm has the choice between five levels of output. The table shows the total cost and total revenue of producing at each output level. The firm could sell whatever output it produces. output total cost total revenue units $ $ 1000 8 000 10 000 2000 12 000 18 000 3000 19 000 24 000 4000 23 000 28 000 5000 25 000 25 000 The firm decides to produce 4000 units. What is the firm’s aim? A to maximise profit B to maximise sales C to maximise revenue D to minimise average costs"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 7,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 445,
        "yBottom": 170,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows the costs and benefits of producing steel in a free market. MSC cost, benefit MPC R X T Y U Z S MPB = MSB O M N output Which area measures the deadweight loss of economic welfare? A RTS B RUS C TUS D YTUS"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 4,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 516,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows the cost and revenue curves for a firm. Which output level will enable a firm to achieve its objective of maximising its revenue? MC price AC P1 P2 P3 P4 MR D = AR O A B C D quantity"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 4,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 473,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows a firm’s long-run average cost curve (LRAC). LRAC cost X Y O output What could explain the shape of the curve from X to Y? A a decrease in total fixed cost B increasing returns to scale C internal diseconomies of scale D more than one factor of production is variable"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 5,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 344,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "The diagram shows the average revenue (AR) and average cost (AC) curves for a firm X that manufactures electronic goods. Firm X then completes a takeover of firm Y that supplies its component parts making them cheaper. The original average revenue and average cost curves of firm X are AR1 and AC1. price AC3 AC1 AC2 AR2 AR1 AR3 O quantity What is the position of the average cost curve and the average revenue curve after the takeover? average average cost revenue A AC1 AR3 B AC2 AR1 C AC2 AR3 D AC"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 5,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 3,
        "yTop": 636,
        "yBottom": 229,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "application",
        "stemText": "The table shows the market shares of firms selling a very similar product in a country between 2018 and 2020. firm 2018 2020 Norton 28.4 27.4 Souton 18.9 17.6 Eastern 17.1 14.7 Western 12.5 11.4 Scotsdale 7.2 8.5 Welshpool 5.8 8.2 Greenland 3.9 4.8 Franklin 2.2 3.6 Bellweather 2.1 1.9 others 1.9 1.9 What can be concluded from the data between the two years? A Market concentration increased. B Sales of the top four firms fell. C Scotsdale and Welshpool’s profits rose. D The concentration ratio of"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 6,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 356,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "application",
        "stemText": "The diagram shows a profit maximising firm in equilibrium. $ MC AC AR MR O quantity What would happen to the firm’s price, output and profit if there was an increase in its fixed costs? price output profit A rise fall rise B rise fall fall C unchanged rise rise D unchanged unchanged fall"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 4,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 549,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "application",
        "stemText": "The table shows a firm’s revenue and costs at different levels of output. marginal average marginal average output revenue revenue cost total cost 1 125 125 90 140 2 85 105 40 90 3 45 85 45 75 4 25 70 95 80 5 20 60 130 90 What is the firm’s total supernormal profit at the profit-maximising level of output? A –15 B 10 C 30 D 120"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 5,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 3,
        "yTop": 547,
        "yBottom": 133,
        "correctAnswer": "D",
        "visualType": "4-Diagram Grid",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "Which diagram shows a monopolistically competitive firm in long-run equilibrium? A B revenue revenue MC MC AC / cost / cost AC MR AR MR AR O Qe O output Qe output C D revenue revenue MC MC AC / cost / cost AC MR AR MR AR O Qe O output Qe output"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 4,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 3,
        "yTop": 785,
        "yBottom": 570,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "application",
        "stemText": "The statement and the table provide information about a production function. The production function represents the amount of ......1...... obtainable from each combination of ......2...... and can be used to give information about ......3...... . Which words correctly complete gaps 1, 2 and 3? 1 2 3 A demand labour returns to scale B demand labour normal profit C output inputs returns to scale D output inputs supernormal profit"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 11,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 600,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Externalities, MSC/MSB Diagrams & Welfare Loss",
        "skill": "analysis",
        "stemText": "A government wishes to use market forces to remove a negative externality in the consumption of a good. Which policy is likely to be the most effective? A It should provide information about the undesirable side-effects of the good. B It should give producers a subsidy, to allow consumers to purchase the product more cheaply. C It should impose an indirect tax on consumers, to reduce consumption to the socially efficient level. D It should not interfere at all, to allow the free market to genera"
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit7c-costs-revenue-firms",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 7C",
    "domain": "micro",
    "title": "Topical Past Paper: Short/Long-Run Costs, Revenue, Profit & Growth of Firms",
    "shortTitle": "Costs, Revenue, Economies of Scale & Firm Objectives",
    "subtitle": "MC/AC/AVC & MR/AR curves, economies & diseconomies of scale, profit maximisation vs revenue/sales maximisation, and integration.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "B",
      "2": "B",
      "3": "A",
      "4": "B",
      "5": "A",
      "6": "C",
      "7": "B",
      "8": "C",
      "9": "A",
      "10": "A",
      "11": "B",
      "12": "A",
      "13": "C",
      "14": "B"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "1 Diagram",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 7,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 459,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "application",
        "stemText": "The diagram shows the short-run average cost, SRAC, and long-run average cost, LRAC, curves for a firm producing computers. It usually produces 2000 computers per week. An increase in demand requires the firm to produce 3000 computers per week. cost $ SRAC1 LRAC 100 80 SRAC2 SRAC3 40 30 0 2000 3000 4000 output How much will the average costs change in the long run if the firm makes a permanent decision to produce 3000 computers per week? A $20 B $40 C $50 D $60"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 8,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 661,
        "yBottom": 511,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "knowledge",
        "stemText": "Which type of employment contract is most likely to overcome the principal agent problem? A increasing monthly salaries of waiters in a restaurant to decrease their dependence on tips from customers B linking workers’ pay with the profits of the firm to motivate them to raise the profitability of the firm C making full fee payment in advance to a lawyer to motivate him to prepare a legal case well D offering permanent contracts to give workers job security"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 9,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 509,
        "yBottom": 347,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "knowledge",
        "stemText": "Company R manufactures steel. Company S produces ships. Company T operates oil tankers. Company V operates cruise liners. Which statement is correct? A If R takes over S, this is an example of forwards vertical integration. B If S takes over V, this is an example of backwards vertical integration. C If T takes over S, this is an example of diversification. D If V takes over S, this is an example of horizontal integration."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 7,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 3,
        "yTop": 222,
        "yBottom": 98,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "application",
        "stemText": "Which assumption is essential for a market to be contestable? A The market is supplied by a large number of firms. B Firms are free to enter and leave the market. C Firms cannot earn abnormal profits in the short run. D Firms produce differentiated goods."
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 8,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 625,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "knowledge",
        "stemText": "A firm that raises capital through a share issue has to satisfy both shareholders’ expectations and management aims. The management aims to produce at a non-profit maximum output. Which strategy would necessarily prevent this aim? A fixing output where MC = MR in the long run B operating price discrimination to maximise revenue C rewarding shareholders more than returns to innovation D separating ownership and control of the firm"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 9,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 4,
        "yTop": 623,
        "yBottom": 473,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Economies of Scale & Long-Run Cost Curves",
        "skill": "knowledge",
        "stemText": "A major UK chemical firm was bought by its rival, a Dutch chemical firm. What definitely occurred when the Dutch firm bought the UK firm? A a partnership B economies of scale C horizontal integration D increased profits"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 4,
        "yTop": 471,
        "yBottom": 347,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Economies of Scale & Long-Run Cost Curves",
        "skill": "knowledge",
        "stemText": "Which statement is correct for a firm classed as a natural monopoly? A It will always operate in the public sector and earn normal profits. B It will have high barriers to entry and be the dominant producer. C It will easily benefit from external economies of scale. D It will have higher average costs than a monopolistically competitive firm."
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 8,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 663,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Economies of Scale & Long-Run Cost Curves",
        "skill": "analysis",
        "stemText": "What is likely to make it more difficult for a small firm to survive? A increased preference on the part of consumers for distinctive non-standardised products B reductions in the rate of interest charged by commercial banks C the absence of effective barriers to the entry of potential competitors D the existence of decreasing returns to scale"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 9,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 661,
        "yBottom": 511,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "application",
        "stemText": "A market structure in which a small number of firms face competition from potential entrants. What does this describe? A a contestable market B a monopoly C monopolistic competition D perfect competition"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 509,
        "yBottom": 385,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "knowledge",
        "stemText": "What is an example of backward vertical integration? A a bakery buying a wheat farm B a car manufacturer buying a car showroom C a vineyard buying an apple orchard D two rival supermarkets joining together"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 7,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 3,
        "yTop": 222,
        "yBottom": 98,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "application",
        "stemText": "Which assumption is essential for a market to be contestable? A The market is supplied by a large number of firms. B Firms are free to enter and leave the market. C Firms cannot earn abnormal profits in the short run. D Firms produce differentiated goods."
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 8,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 4,
        "yTop": 785,
        "yBottom": 625,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Short-Run Costs, Revenue Curves & Supernormal Profit",
        "skill": "knowledge",
        "stemText": "A firm that raises capital through a share issue has to satisfy both shareholders’ expectations and management aims. The management aims to produce at a non-profit maximum output. Which strategy would necessarily prevent this aim? A fixing output where MC = MR in the long run B operating price discrimination to maximise revenue C rewarding shareholders more than returns to innovation D separating ownership and control of the firm"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 9,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 4,
        "yTop": 623,
        "yBottom": 473,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Economies of Scale & Long-Run Cost Curves",
        "skill": "knowledge",
        "stemText": "A major UK chemical firm was bought by its rival, a Dutch chemical firm. What definitely occurred when the Dutch firm bought the UK firm? A a partnership B economies of scale C horizontal integration D increased profits"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 4,
        "yTop": 471,
        "yBottom": 347,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Economies of Scale & Long-Run Cost Curves",
        "skill": "knowledge",
        "stemText": "Which statement is correct for a firm classed as a natural monopoly? A It will always operate in the public sector and earn normal profits. B It will have high barriers to entry and be the dominant producer. C It will easily benefit from external economies of scale. D It will have higher average costs than a monopolistically competitive firm."
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit7d-market-structures",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 7D",
    "domain": "micro",
    "title": "Topical Past Paper: Market Structures, Oligopoly, Game Theory & Contestability",
    "shortTitle": "Monopoly, Oligopoly, Game Theory & Pricing",
    "subtitle": "Perfect & monopolistic competition, monopoly & price discrimination, oligopoly kinked demand, prisoner's dilemma matrices, and contestable markets.",
    "level": "a2",
    "durationSeconds": 1440,
    "questionCount": 12,
    "answerKey": {
      "1": "D",
      "2": "D",
      "3": "D",
      "4": "B",
      "5": "A",
      "6": "D",
      "7": "B",
      "8": "A",
      "9": "D",
      "10": "D",
      "11": "C",
      "12": "A"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "1 Diagram & 1 Table",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 4,
        "yTop": 345,
        "yBottom": 157,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Oligopoly, Game Theory & Kinked Demand",
        "skill": "application",
        "stemText": "There are two firms in an industry. Firm X faces a choice. It can either act independently or work with its rival. If it acts independently its profit could be $900 a week but it could be only $400 a week depending on what its rival does. If it works with its rival the joint profit of the two firms together would be $1400, $700 each. It has no knowledge of what the rival’s policy will be. Which concept describes this situation? A contestable market B kinked demand curve C principal agent problem"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 12,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 479,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "application",
        "stemText": "The table shows the annual percentage change in the output per worker employed for four nationalised industries before and after privatisation. before after nationalised privatisation privatisation industry % % railways –4 2 electricity supply 7 9 shipbuilding 4 –1 telecommunications 6 6 What can be concluded about the effect of privatisation? A Employment fell in the railway industry. B Employment was unchanged in the telecommunications industry. C Output was greatest in the electricity supply "
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 12,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 598,
        "yBottom": 435,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "A government decides to replace a private company with its own company to collect household waste. Why could such action be justified? A Waste collection is a public good. B Costs of waste collection are bound to be lower if paid out of local taxes. C Private companies are always less efficient than government companies. D Private companies might put profits before customer needs."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 11,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 4,
        "yTop": 345,
        "yBottom": 182,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "The government can use policies to try and reduce the environmental damage caused by the amount of rubbish (garbage) created by firms and households. Which policy to reduce rubbish is most likely to lead to government failure? A an incentive payment for firms who reduce the levels of rubbish B a tax on the amount of rubbish a firm or household creates C an advertising campaign about the problems created by rubbish D government grants to firms researching how to safely dispose of rubbish"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 12,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 650,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "What would supporters of a nationalised public transport service expect to be the most likely outcome from the privatisation of train and bus services? A fewer destinations served by trains and buses B lower fares C more frequent services to all destinations D more people employed in public transport services"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 13,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 5,
        "yTop": 648,
        "yBottom": 524,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "application",
        "stemText": "What will cause a household to be caught in the poverty trap? A A household earns less than the international poverty line of $2.15 per person per day. B A household spends more than it earns in a month. C A household’s earnings rise at a lower rate than the rise in inflation. D An extra dollar earnt by a household causes a greater loss in government benefit payments."
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 11,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 4,
        "yTop": 345,
        "yBottom": 182,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "The government can use policies to try and reduce the environmental damage caused by the amount of rubbish (garbage) created by firms and households. Which policy to reduce rubbish is most likely to lead to government failure? A an incentive payment for firms who reduce the levels of rubbish B a tax on the amount of rubbish a firm or household creates C an advertising campaign about the problems created by rubbish D government grants to firms researching how to safely dispose of rubbish"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 12,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 5,
        "yTop": 785,
        "yBottom": 650,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "What would supporters of a nationalised public transport service expect to be the most likely outcome from the privatisation of train and bus services? A fewer destinations served by trains and buses B lower fares C more frequent services to all destinations D more people employed in public transport services"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 13,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 5,
        "yTop": 648,
        "yBottom": 524,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "application",
        "stemText": "What will cause a household to be caught in the poverty trap? A A household earns less than the international poverty line of $2.15 per person per day. B A household spends more than it earns in a month. C A household’s earnings rise at a lower rate than the rise in inflation. D An extra dollar earnt by a household causes a greater loss in government benefit payments."
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 11,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 6,
        "yTop": 592,
        "yBottom": 468,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "Which government policy would not be classified as regulation? A a ban on cocaine consumption B compulsory wearing of seatbelts in cars C licences for the extraction of water from rivers D taxation of cigarettes"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 229,
        "yBottom": 79,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Perfect Competition & Monopolistic Competition",
        "skill": "knowledge",
        "stemText": "A smartphone manufacturing company takes over an electronic chip design company. This is an example of which type of growth? A horizontal B lateral C vertical backwards D vertical forwards"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 10,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 5,
        "yTop": 636,
        "yBottom": 511,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Oligopoly, Game Theory & Kinked Demand",
        "skill": "application",
        "stemText": "What is meant by a four-firm concentration ratio of 25%? A The largest four firms’ market share totals 25%. B The largest four firms have a market share of 25% each. C There are only four firms in the industry. D The largest firm has a 25% market share."
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit8-labour-markets",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 8",
    "domain": "micro",
    "title": "Topical Past Paper: Labour Markets, MRP Theory, Monopsony & Wage Determination",
    "shortTitle": "Labour Markets, MRP, Monopsony & Trade Unions",
    "subtitle": "Marginal revenue product (MRP) & MCL labour diagrams, monopsony employers, trade unions & minimum wage, economic rent, and transfer earnings.",
    "level": "a2",
    "durationSeconds": 1800,
    "questionCount": 15,
    "answerKey": {
      "1": "C",
      "2": "C",
      "3": "B",
      "4": "C",
      "5": "D",
      "6": "B",
      "7": "C",
      "8": "B",
      "9": "B",
      "10": "B",
      "11": "C",
      "12": "A",
      "13": "B",
      "14": "D",
      "15": "D"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "12 Diagrams & 3 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 5,
        "yTop": 307,
        "yBottom": 169,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "What would shift the marginal revenue product curve for workers producing electric vehicles to the right? A a decrease in the price of petrol vehicles B a decrease in the productivity of electric vehicles workers C an increase in the price of electric vehicles D an increase in the wage rate of electric vehicles workers"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 15,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 472,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "application",
        "stemText": "The diagram shows a perfectly competitive firm’s average product of labour (APL) and marginal product of labour (MPL) curves. wage ($), average product, marginal product (units) W APL MPL O N 1 N 2 N 3 N 4 workers employed How many workers will the firm employ at a wage of W? A ON1 B ON2 C ON3 D ON4"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 5,
        "yTop": 522,
        "yBottom": 397,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "What will cause an outward shift in the demand for labour curve? A a decrease in the top rate of income tax B an increase in the demand for the final product C an increase in subsidies to firms D an increase in the size of the working population"
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 15,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 375,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Imperfect Labour Markets: Monopsony & Trade Unions",
        "skill": "analysis",
        "stemText": "The diagram shows what happens when the employees of a profit-maximising monopsonist employer form a trade union and successfully negotiate a wage rate of OWT. MCL wage rate SL W2 WT W1 MRPL = DL O Q1 Q3 Q2 Q4 employment What is the effect of the new wage rate on employment? A It falls from OQ2 to OQ1. B It falls from OQ2 to OQ3. C It rises from OQ1 to OQ3. D It rises from OQ1 to OQ4."
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 15,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 401,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Transfer Earnings & Economic Rent",
        "skill": "analysis",
        "stemText": "The diagram shows the labour market for farm workers in New Zealand. wage F supply of rate labour G K J demand for labour O H quantity of labour Which areas represent the economic rent and transfer earnings of the farm workers? economic transfer rent earnings A GFK GHOJ B GHOJ GJK C GJK GJF D GJK GHOJ"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 5,
        "yTop": 522,
        "yBottom": 397,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "What will cause an outward shift in the demand for labour curve? A a decrease in the top rate of income tax B an increase in the demand for the final product C an increase in subsidies to firms D an increase in the size of the working population"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 15,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 375,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Imperfect Labour Markets: Monopsony & Trade Unions",
        "skill": "analysis",
        "stemText": "The diagram shows what happens when the employees of a profit-maximising monopsonist employer form a trade union and successfully negotiate a wage rate of OWT. MCL wage rate SL W2 WT W1 MRPL = DL O Q1 Q3 Q2 Q4 employment What is the effect of the new wage rate on employment? A It falls from OQ2 to OQ1. B It falls from OQ2 to OQ3. C It rises from OQ1 to OQ3. D It rises from OQ1 to OQ4."
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 7,
        "yTop": 485,
        "yBottom": 269,
        "correctAnswer": "B",
        "visualType": "Data Table",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "application",
        "stemText": "The table shows the output of chairs at a factory when different numbers of workers are employed. number of workers 0 1 2 3 4 5 number of chairs produced 0 7 17 26 34 40 When will diminishing marginal returns to labour set in? A when the second worker is employed B when the third worker is employed C when the fourth worker is employed D when the fifth worker is employed"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 15,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 368,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "In the diagram, D represents the long-run demand curve for labour in a firm operating in an imperfect market. When there is a fall in the amount of capital invested per worker, the marginal revenue productivity of labour (MRP) curve shifts from MRP1 to MRP2. wages W1 W2 MRP1 MRP2 D O L1 L2 L3 labour employed How does this shift affect the amount of labour employed in the long run, when wages fall? A It falls from L3 to L2. B It increases from L1 to L2. C It increases from L2 to L3. D It remains "
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 13,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 6,
        "yTop": 496,
        "yBottom": 149,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "The diagram shows a firm’s initial marginal revenue product of labour curve (MRP1). marginal revenue product of labour MRP1 MRP2 O labour hours What could cause the curve to shift to MRP2? A a fall in the wage rate B a fall in the price of the final product C a rise in the wage rate D a rise in the price of the final product"
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 518,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "application",
        "stemText": "A firm operates in a perfectly competitive labour market. The table shows the marginal revenue product (MRP) and marginal cost of labour (MCL) for each additional worker employed by this profit-maximising firm. units of labour MRP MCL employed 1 50 30 2 40 30 3 30 30 4 20 30 How many units of labour will this firm employ? A 1 B 2 C 3 D 4"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 12,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 6,
        "yTop": 785,
        "yBottom": 416,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Imperfect Labour Markets: Monopsony & Trade Unions",
        "skill": "analysis",
        "stemText": "The diagram shows the supply of and the demand for workers in the car manufacturing industry. A trade union successfully negotiates a wage increase from W1 to W2. S wage rate W2 W1 D O L2 L1 L3 quantity of labour What is the likely impact on the level of employment? A fall from L1 to L2 B fall from L3 to L2 C rise from L1 to L3 D rise from L2 to L3"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 13,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 6,
        "yTop": 414,
        "yBottom": 264,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "analysis",
        "stemText": "A firm buys new machinery which increases the marginal productivity of its workforce. What will be the resulting impact on the market for labour? A a shift to the left in the demand curve for labour B a shift to the right in the demand curve for labour C a shift to the left in the supply curve of labour D a shift to the right in the supply curve of labour"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 14,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 416,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Transfer Earnings & Economic Rent",
        "skill": "analysis",
        "stemText": "The diagram represents the market for labour. wage S 1 S 2 W D O N number of workers What would be the effect on transfer earnings and economic rent of a change in the supply curve from S1 to S2? transfer economic earnings rent A fall falls B fall rises C rise rises D rise falls"
      },
      {
        "number": 15,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 17,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 536,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "Demand & Supply of Labour (MRP Theory)",
        "skill": "knowledge",
        "stemText": "Two statements about the types of unemployment are shown. 1 You will get unemployment if you pay people not to work, and tax them when they do. 2 An individual is actively seeking work but due to negative economic growth cannot find employment. Which row best describes the two types of unemployment in these statements? 1 2 A cyclical structural B voluntary frictional C structural cyclical D voluntary involuntary"
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit9-multiplier-accelerator",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 9",
    "domain": "macro",
    "title": "Topical Past Paper: The Multiplier, Accelerator & Keynesian 45° Aggregate Expenditure",
    "shortTitle": "Keynesian 45° Diagrams, Multiplier & Accelerator",
    "subtitle": "Open-economy multiplier calculations (MPC, MPS, MPT, MPM), Keynesian 45° inflationary & deflationary gap diagrams, and induced investment.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "D",
      "2": "A",
      "3": "C",
      "4": "D",
      "5": "A",
      "6": "A",
      "7": "A",
      "8": "C",
      "9": "C",
      "10": "A",
      "11": "D",
      "12": "C",
      "13": "C",
      "14": "A"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "4 Diagrams & 5 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 18,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 500,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "The table gives the percentage (%) rates of youth unemployment and total unemployment in France and the UK in 2001 and 2005. France UK youth total youth total unemployment unemployment unemployment unemployment (%) (%) (%) (%) 2001 19.2 8.7 12.0 5.2 2005 22.1 10.1 12.5 4.8 What can be concluded from the table? A France and the UK experienced the same trends in unemployment. B France had a higher number of unemployed people than the UK. C The UK used a different definition of unemployment from Fr"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 20,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 7,
        "yTop": 372,
        "yBottom": 147,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "The table shows the relationship between inflation and unemployment in Germany from 2019 to 2022. 2019 2020 2021 2022 inflation: annual –1.9 –1.6 2.7 2.6 variation (%) unemployment 6.4 6.1 5.7 5.2 rate (%) Some theories argue that inflation rates are at their lowest when the rate of unemployment is low. Which year contradicts this expectation to the greatest extent? A 2019 B 2020 C 2021 D 2022"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 20,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 8,
        "yTop": 471,
        "yBottom": 155,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Keynesian 45° Diagram & Inflationary/Deflationary Gaps",
        "skill": "analysis",
        "stemText": "The diagrams show the performance of an economy using different measures. trend LRAS GDP price real level GDP X X AD O services O X O year real output If an economy is currently at point X on each diagram, what is the most likely conclusion that can be made based on this evidence? A Prices will increase significantly as the economy grows in the near future. B Supply-side policies would be the best option to encourage economic growth. C The economy is currently experiencing a deflationary gap. D "
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 18,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 500,
        "correctAnswer": "D",
        "visualType": "Data Table",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "The table gives the percentage (%) rates of youth unemployment and total unemployment in France and the UK in 2001 and 2005. France UK youth total youth total unemployment unemployment unemployment unemployment (%) (%) (%) (%) 2001 19.2 8.7 12.0 5.2 2005 22.1 10.1 12.5 4.8 What can be concluded from the table? A France and the UK experienced the same trends in unemployment. B France had a higher number of unemployed people than the UK. C The UK used a different definition of unemployment from Fr"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 20,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 7,
        "yTop": 372,
        "yBottom": 147,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "The table shows the relationship between inflation and unemployment in Germany from 2019 to 2022. 2019 2020 2021 2022 inflation: annual –1.9 –1.6 2.7 2.6 variation (%) unemployment 6.4 6.1 5.7 5.2 rate (%) Some theories argue that inflation rates are at their lowest when the rate of unemployment is low. Which year contradicts this expectation to the greatest extent? A 2019 B 2020 C 2021 D 2022"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 20,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 9,
        "yTop": 446,
        "yBottom": 263,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "The table shows data about the population of a country. total population 2 000 000 labour force 1 200 000 number of people employed 900 000 number of people unemployed 300 000 What is the rate of unemployment? A 25% B 33% C 60% D 75%"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 19,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 8,
        "yTop": 636,
        "yBottom": 249,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Keynesian 45° Diagram & Inflationary/Deflationary Gaps",
        "skill": "analysis",
        "stemText": "The diagram shows full employment, national income, and expenditure (AMD). The economy is in equilibrium at J. AMD (C + I + G + X – M) 2 K (C + I + G + X – M) 1 L J 45 ° O full national employment income What does the distance KL represent? A a deflationary gap B a trade deficit C an inflationary gap D an employment gap"
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 19,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 414,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "analysis",
        "stemText": "Households in an economy change their consumption behaviour causing the consumption curve to shift from C1 to C2. C1 consumption spending C2 O disposable income What has happened to autonomous consumption and the marginal propensity to consume? autonomous marginal propensity consumption to consume A decreased decreased B decreased increased C increased decreased D increased increased"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 21,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 428,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "analysis",
        "stemText": "The diagram shows a curve representing the relationship between a country’s unemployment rate and its inflation rate. inflation rate O unemployment rate Why is it likely that this curve only applies in the short run? A Any attempt to reduce unemployment will increase inflation. B Increased inflation actually increases unemployment. C Increased inflation leads to expectations of further inflation. D Increased inflation reduces real wage rates, which increases the demand for labour."
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 19,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 785,
        "yBottom": 625,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "application",
        "stemText": "Over the period of a year, nominal national income increased by 2%, inflation was 3% and population increased by 1%. Which statement is correct? A Real income decreased by 2% per head. B Real income increased by 1% per head. C Real income increased by 4% per head. D There was no change in real income per head."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 20,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 623,
        "yBottom": 486,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "analysis",
        "stemText": "What is likely to be the most effective policy to reduce inflation caused by a rapid rise in import prices? A a decrease in the domestic rate of interest B a decrease in the rate of income tax C an increase in trade tariffs on imports D a revaluation of the exchange rate"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 21,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 484,
        "yBottom": 359,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "knowledge",
        "stemText": "Which macroeconomic policy objective will not apply to a government in a closed economy? A achieving a low and steady rate of inflation B achieving a more equal income distribution C achieving a surplus on the balance of payments D achieving a sustainable rate of economic growth"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 22,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 7,
        "yTop": 357,
        "yBottom": 139,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "The Multiplier & Marginal Propensities (MPC, MPS, MPM, MPT)",
        "skill": "knowledge",
        "stemText": "A government increases its budget deficit to spend money on infrastructure development. It finances this by printing money. How is this policy likely to affect the government’s main macroeconomic policy objectives? higher lower lower economic unemployment inflation growth A less likely less likely more likely B less likely more likely less likely C more likely more likely less likely D more likely more likely more likely"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 19,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 7,
        "yTop": 498,
        "yBottom": 374,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Keynesian 45° Diagram & Inflationary/Deflationary Gaps",
        "skill": "knowledge",
        "stemText": "What is a necessary assumption of the Keynesian multiplier model? A increasing average propensity to save B flexible costs and prices C full employment of resources D open economies"
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit10-money-phillips",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 10",
    "domain": "macro",
    "title": "Topical Past Paper: Money Supply, Liquidity Preference, Phillips Curve & Laffer Curve",
    "shortTitle": "Money, Banking, Liquidity Preference & Phillips Curve",
    "subtitle": "Commercial bank credit creation, Quantity Theory (MV = PT), liquidity preference & liquidity trap diagrams, SRPC/LRPC Phillips curves, and policy conflicts.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "C",
      "2": "D",
      "3": "B",
      "4": "C",
      "5": "A",
      "6": "D",
      "7": "B",
      "8": "D",
      "9": "A",
      "10": "A",
      "11": "A",
      "12": "C",
      "13": "C",
      "14": "A"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "7 Diagrams & 3 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 24,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 8,
        "yTop": 636,
        "yBottom": 324,
        "correctAnswer": "C",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "analysis",
        "stemText": "The diagram shows the relationship between the income tax rate and tax revenue. tax X revenue W O Z Y income tax rate Which statement is correct? A A tax rate cut from Y to Z will cause tax revenue to decrease. B At tax rates below Z a tax rate cut will cause tax revenue to increase. C The greater the rate of tax beyond Z, the smaller will be the tax revenue generated. D Tax revenue will always increase as the rate of income tax increases."
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 21,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 402,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Short-Run & Long-Run Phillips Curve & Policy Conflicts",
        "skill": "analysis",
        "stemText": "The diagram represents the short-run Phillips curves SRPC1 and SRPC2 and the long-run Phillips curve in an economy, where NRU is the natural rate of unemployment. The economy is originally in equilibrium with no inflation. long-run Phillips curve inflation rate P 2 J K L P 1 SRPC 2 M O U 2 U 1 SRPC 1 NRU unemployment rate If the government introduces a fiscal stimulus to reduce unemployment, monetarists predict that there will be a series of movements before long-run equilibrium is restored. Whi"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 26,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 9,
        "yTop": 496,
        "yBottom": 359,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "application",
        "stemText": "What does the J-curve effect show? A A successful currency depreciation requires the sum of the import and export elasticities of demand to be greater than 1. B After a currency devaluation, the current account is likely to get worse before it gets better. C In the short run, the demand for imports and exports tends to be price elastic. D The value of the terms of trade will affect the success of a currency’s devaluation."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 21,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 605,
        "correctAnswer": "C",
        "visualType": "Data Table",
        "subtopic": "Liquidity Preference Theory, Bond Prices & Interest Rates",
        "skill": "knowledge",
        "stemText": "Which row correctly identifies the characteristics of an economy experiencing the liquidity trap? rate of rate of rate of economic inflation interest growth A high high low B low high low C low low low D low low high"
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 25,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 495,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "application",
        "stemText": "The table shows indicators for the macroeconomies of two South American countries over one year. During this year, both governments attempted to reduce unemployment by expanding aggregate demand. current account change in GDP country balance currency units % change % of GDP against US dollar Argentina 17.9 1.7 –18.9 Chile 17.2 –1.8 –13.3 Based on the information given, what is the most likely reason why Argentina achieved a higher % change in the unemployment rate than Chile? A Argentina had a g"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 21,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 402,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Short-Run & Long-Run Phillips Curve & Policy Conflicts",
        "skill": "analysis",
        "stemText": "The diagram represents the short-run Phillips curves SRPC1 and SRPC2 and the long-run Phillips curve in an economy, where NRU is the natural rate of unemployment. The economy is originally in equilibrium with no inflation. long-run Phillips curve inflation rate P 2 J K L P 1 SRPC 2 M O U 2 U 1 SRPC 1 NRU unemployment rate If the government introduces a fiscal stimulus to reduce unemployment, monetarists predict that there will be a series of movements before long-run equilibrium is restored. Whi"
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 26,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 9,
        "yTop": 496,
        "yBottom": 359,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "application",
        "stemText": "What does the J-curve effect show? A A successful currency depreciation requires the sum of the import and export elasticities of demand to be greater than 1. B After a currency devaluation, the current account is likely to get worse before it gets better. C In the short run, the demand for imports and exports tends to be price elastic. D The value of the terms of trade will affect the success of a currency’s devaluation."
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/31/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 31",
        "originalQuestionNumber": 22,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_31.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 261,
        "correctAnswer": "D",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Short-Run & Long-Run Phillips Curve & Policy Conflicts",
        "skill": "application",
        "stemText": "The diagram shows an increase in aggregate demand (AD) from AD1 to AD2. LRAS price SRAS level AD2 AD1 O real output How can the subsequent impact on short-run and long-run macroeconomic equilibrium positions be shown using expectations-augmented Phillips curves? long-run Phillips curve inflation % K J short-run Phillips curve 2 F short-run Phillips curve 1 H G short-run Phillips curve 3 O unemployment rate % A F to G to H B F to G to K C F to J to H D F to J to K"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 23,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 446,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Short-Run & Long-Run Phillips Curve & Policy Conflicts",
        "skill": "application",
        "stemText": "The table shows the percentage of labour force unemployed and the rate of inflation in a country over a five-year period. unemployment inflation year % % 1 3.5 4.0 2 4.1 3.6 3 4.3 2.5 4 4.5 2.2 5 4.8 2.0 Which statement about the application of the Phillips curve theory to this country is most supported by the data? A The data are entirely consistent with the theory of the Phillips curve. B The data prove conclusively that the Phillips curve theory does not operate. C The data suggest that no co"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 25,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 11,
        "yTop": 623,
        "yBottom": 264,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "analysis",
        "stemText": "The optimum level of population is deemed to be that level at which real output per head is maximised. The diagram shows the relationship between population size and output per head in a country for two different time periods. Q2 output output per head year 2 per head Q1 output per head year 1 O P1 P2 population Which change could not satisfactorily explain the shift from year 1 to year 2? A Population has increased. B State of technology has improved. C Stock of capital has increased. D Volume "
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 18,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 6,
        "yTop": 217,
        "yBottom": 93,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "knowledge",
        "stemText": "Why might country X have a higher natural rate of unemployment than country Y? A There is a higher level of trade unionisation in X. B There is more training and education in X. C There are greater incentives to find work in X. D There is a higher level of job vacancy information in X."
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 23,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 8,
        "yTop": 785,
        "yBottom": 638,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "knowledge",
        "stemText": "The government increases interest rates in order to reduce the rate of inflation. What will also result from this action? A a depreciation of the country’s currency B a fall in the level of savings C a reduction in economic growth D a reduction in unemployment"
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 25,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 8,
        "yTop": 322,
        "yBottom": 198,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "knowledge",
        "stemText": "In which situation is devaluation of the currency most likely to cause inflation? A Excess capacity is available. B Import tariffs are reduced. C Local substitutes of imported raw materials are unavailable. D The demand for exports is price inelastic."
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 26,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 9,
        "yTop": 785,
        "yBottom": 638,
        "correctAnswer": "A",
        "visualType": "Exam Question",
        "subtopic": "Money Supply, Credit Multiplier & Quantity Theory (MV = PT)",
        "skill": "knowledge",
        "stemText": "A country imports most of the raw materials used as factor inputs. Which policy is most likely to control cost-push inflation? A an appreciation of the exchange rate B an increase in the rate of income tax C an increase in the rate of interest D an increase in the rate of sales tax"
      }
    ]
  },
  {
    "id": "topical-9708-a2-unit11-development-global",
    "syllabusCode": "9708",
    "topicNumber": "A2 Topic 11",
    "domain": "macro",
    "title": "Topical Past Paper: Economic Development, HDI/MEW, Globalisation & Trade Blocs",
    "shortTitle": "Economic Development, HDI/Kuznets & Trade Blocs",
    "subtitle": "Human Development Index (HDI), Measurable Economic Welfare (MEW), Kuznets & Lorenz curves, customs unions, trade creation/diversion, and FDI.",
    "level": "a2",
    "durationSeconds": 1680,
    "questionCount": 14,
    "answerKey": {
      "1": "A",
      "2": "A",
      "3": "A",
      "4": "A",
      "5": "A",
      "6": "A",
      "7": "B",
      "8": "A",
      "9": "A",
      "10": "D",
      "11": "C",
      "12": "B",
      "13": "C",
      "14": "C"
    },
    "sourceYearsLabel": "2024 Real Papers",
    "visualSummaryLabel": "3 Diagrams & 6 Tables",
    "questions": [
      {
        "number": 1,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 29,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 332,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "application",
        "stemText": "The Lorenz curves in the diagram show different distributions of income and of wealth. 100 % of income or % of wealth 1 2 4 3 0 0 100 % of households At first, income in a country is more equally distributed than wealth. In a period, the distribution of income becomes more unequal but the distribution of wealth becomes more equal. Which movement would show the effects of these changes on the distribution of income and wealth within the country? distribution of income distribution of wealth A shi"
      },
      {
        "number": 2,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 28,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 595,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "application",
        "stemText": "The table shows the GDP and population of four countries. Which country is most likely to have the lowest standard of living? GDP population country US$ billion million A Bangladesh 206.7 153.5 B India 2989.1 1147.9 C Nigeria 292.7 138.3 D South Africa 467.1 43.8"
      },
      {
        "number": 3,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 30,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 10,
        "yTop": 466,
        "yBottom": 198,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Indicators of Development (HDI, MEW & Kuznets Curve)",
        "skill": "application",
        "stemText": "The table shows the values of the Gini coefficient for some countries in a given year. Gini coefficient Namibia 74.3 Zambia 50.4 France 32.7 Denmark 24.7 Using this information, which statement is correct? A Income is distributed more equally in Denmark than France. B Income is distributed more equally in Namibia than Zambia. C Income per capita is higher in Zambia than Namibia. D There are proportionally more people below the poverty line in Zambia than France."
      },
      {
        "number": 4,
        "sourcePaperCode": "9708/32/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 32",
        "originalQuestionNumber": 29,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_32.pdf",
        "pageNumber": 11,
        "yTop": 568,
        "yBottom": 307,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "application",
        "stemText": "The table gives information about the population of three countries in a given year. birth rate death rate infant mortality % of population per 1000 per 1000 rate per 1000 under 16 Singapore 12 4 5 18 Hong Kong 15 6 8 20 China 20 9 28 38 Which conclusion can be drawn about the countries in the table in that year? A China had the highest percentage of children who died in infancy. B People in Hong Kong lived the longest. C Singapore had the largest number of people aged over 16. D The population "
      },
      {
        "number": 5,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 28,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 10,
        "yTop": 785,
        "yBottom": 595,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "application",
        "stemText": "The table shows the GDP and population of four countries. Which country is most likely to have the lowest standard of living? GDP population country US$ billion million A Bangladesh 206.7 153.5 B India 2989.1 1147.9 C Nigeria 292.7 138.3 D South Africa 467.1 43.8"
      },
      {
        "number": 6,
        "sourcePaperCode": "9708/33/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 33",
        "originalQuestionNumber": 30,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_33.pdf",
        "pageNumber": 10,
        "yTop": 466,
        "yBottom": 198,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Indicators of Development (HDI, MEW & Kuznets Curve)",
        "skill": "application",
        "stemText": "The table shows the values of the Gini coefficient for some countries in a given year. Gini coefficient Namibia 74.3 Zambia 50.4 France 32.7 Denmark 24.7 Using this information, which statement is correct? A Income is distributed more equally in Denmark than France. B Income is distributed more equally in Namibia than Zambia. C Income per capita is higher in Zambia than Namibia. D There are proportionally more people below the poverty line in Zambia than France."
      },
      {
        "number": 7,
        "sourcePaperCode": "9708/32/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 32",
        "originalQuestionNumber": 29,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_32.pdf",
        "pageNumber": 12,
        "yTop": 785,
        "yBottom": 454,
        "correctAnswer": "B",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "analysis",
        "stemText": "The diagram shows two Lorenz curves. 100 percentage of income L 1 L 2 0 100 percentage of population If the Lorenz curve shifts from L1 to L2, what is least likely to have caused this? A Capital gains tax has been reduced. B Income tax has been made more progressive. C Inheritance tax has been reduced. D The tax-free allowance has been decreased for everyone."
      },
      {
        "number": 8,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 29,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 12,
        "yTop": 496,
        "yBottom": 189,
        "correctAnswer": "A",
        "visualType": "Supply & Demand Graph",
        "subtopic": "Indicators of Development (HDI, MEW & Kuznets Curve)",
        "skill": "application",
        "stemText": "The diagram shows an economy’s Lorenz curve (VW). 100 W 45 ° cumulative % of income area Y area Z V 0 100 cumulative % of population How is the Gini coefficient for the economy calculated? Y Y Z Z A B C D Y  Z Z Y Y  Z"
      },
      {
        "number": 9,
        "sourcePaperCode": "9708/33/O/N/24",
        "sourcePaperTitle": "9708 Oct/Nov 2024 Paper 33",
        "originalQuestionNumber": 30,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_w24_qp_33.pdf",
        "pageNumber": 13,
        "yTop": 785,
        "yBottom": 569,
        "correctAnswer": "A",
        "visualType": "Data Table",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "application",
        "stemText": "The table gives the percentage of employment in the primary, secondary and tertiary sectors in four countries. Which country is most likely to be a high-income country? primary secondary tertiary sector sector sector % % % A 15 40 45 B 30 40 30 C 35 45 20 D 45 35 20"
      },
      {
        "number": 10,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 27,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 9,
        "yTop": 636,
        "yBottom": 461,
        "correctAnswer": "D",
        "visualType": "Exam Question",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "knowledge",
        "stemText": "Germany, one of the world’s strongest trading nations, achieved a surplus on current account of the balance of payments in 2021–2022. Which income flow would not have been included in the calculation of Germany’s current account? A Declining sales of German cars for export overseas. B Falling earnings of foreign exchange from visitors to Germany. C Increasing transfers of aid to less developed countries. D Investment in a natural gas pipeline link to its main foreign supplier."
      },
      {
        "number": 11,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 28,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 9,
        "yTop": 459,
        "yBottom": 296,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "knowledge",
        "stemText": "A country maintains its foreign exchange rate against the United States dollar, within a narrow but changing band. What is this type of exchange rate? A fixed B floating C managed float D trade-weighted"
      },
      {
        "number": 12,
        "sourcePaperCode": "9708/32/F/M/24",
        "sourcePaperTitle": "9708 Feb/March 2024 Paper 32",
        "originalQuestionNumber": 30,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_m24_qp_32.pdf",
        "pageNumber": 10,
        "yTop": 330,
        "yBottom": 205,
        "correctAnswer": "B",
        "visualType": "Exam Question",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "knowledge",
        "stemText": "What is likely to happen in a developing country as it becomes more developed? A A lower percentage of people will go to university. B Average life expectancy will rise. C The rate of population growth will increase. D The tertiary sector will decline in importance."
      },
      {
        "number": 13,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 27,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 9,
        "yTop": 357,
        "yBottom": 233,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "knowledge",
        "stemText": "What is the most likely consequence of an increase in the number of multinational companies? A a decrease in advancements in technology B a decrease in foreign direct investment C an increase in exports D an increase in unemployment"
      },
      {
        "number": 14,
        "sourcePaperCode": "9708/31/M/J/24",
        "sourcePaperTitle": "9708 May/June 2024 Paper 31",
        "originalQuestionNumber": 29,
        "qpUrl": "https://srukuuhxloxdukonmual.supabase.co/storage/v1/object/public/mcq-papers/cambridge/2024/9708_s24_qp_31.pdf",
        "pageNumber": 10,
        "yTop": 593,
        "yBottom": 468,
        "correctAnswer": "C",
        "visualType": "Exam Question",
        "subtopic": "Developing Economies, FDI, Aid & External Debt",
        "skill": "knowledge",
        "stemText": "What will increase the size of a country’s optimum population? A a rise in the birth rate B a lowering of the age of retirement C a rise in the stock of capital available in the country D a decrease in the productivity of the country’s industries"
      }
    ]
  }
];

export const TOPICAL_MCQ_PAPERS: TopicalMcqPaper[] = [
  GENERATED_TOPICAL_PAPERS[0],
  GENERATED_TOPICAL_PAPERS[1],
  {
    id: "topical-9708-as-price-system-micro",
    syllabusCode: "9708",
    topicNumber: "AS Topic 2B",
    domain: "micro",
    title: "Topical Past Paper: The Price System, Elasticities & Market Intervention",
    shortTitle: "Price System, Elasticities (PED, PES, YED, XED) & Tax Incidence",
    subtitle:
      "15 real Cambridge 9708 exam questions (10 Supply/Demand & Tax Diagrams, 4 Elasticity Tables, 1 Market Bar Chart) sliced directly from official 2022–2025 papers.",
    level: "as",
    durationSeconds: 30 * 60,
    questionCount: PRICE_SYSTEM_QUESTIONS.length,
    answerKey: Object.fromEntries(
      PRICE_SYSTEM_QUESTIONS.map((q) => [String(q.number), q.correctAnswer]),
    ),
    sourceYearsLabel: "2022 – 2025 Real Papers",
    visualSummaryLabel: "11 Diagrams & 4 Tables",
    questions: PRICE_SYSTEM_QUESTIONS,
  },
  ...GENERATED_TOPICAL_PAPERS.slice(2),
];

export function isTopicalPaperId(paperId: string | null | undefined): boolean {
  if (!paperId) return false;
  return TOPICAL_MCQ_PAPERS.some((p) => p.id === paperId);
}

export function getTopicalPaperById(paperId: string | null | undefined): TopicalMcqPaper | null {
  if (!paperId) return null;
  return TOPICAL_MCQ_PAPERS.find((p) => p.id === paperId) ?? null;
}

/**
 * Converts a TopicalMcqPaper into the standard McqPaperSummary shape used by
 * `/mcq-live` so drafts, resume banners, and `beginPractice` work identically.
 */
export function toMcqPaperSummaryFromTopical(topical: TopicalMcqPaper) {
  return {
    id: topical.id,
    title: topical.title,
    level: topical.level,
    examYear: 2025,
    examSeries: "Topical" as unknown as "May/June" | "Oct/Nov" | "Feb/March" | null,
    qpUrl: topical.questions[0]?.qpUrl ?? "",
    msUrl: null,
    questionCount: topical.questionCount,
    hasCompleteKey: true,
    answerKey: topical.answerKey,
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Slices each question (with its original printed Cambridge graph/table/options)
 * directly from the official PDFs and stitches them into clean 2-questions-per-page
 * exam canvases, masking the old question number and stamping the new sequential
 * number + source paper badge.
 */
export async function renderTopicalPaperPages(options: {
  topicalPaper: TopicalMcqPaper;
  scale: number;
  fetchPdfBuffer: (qpUrl: string) => Promise<ArrayBuffer>;
  onProgress?: (label: string) => void;
}): Promise<{
  pages: Array<{ pageNumber: number; canvas: HTMLCanvasElement }>;
  stems: StemBlob[];
  questionPages: Record<number, number>;
  questionSlices: Record<number, HTMLCanvasElement>;
}> {
  const { topicalPaper, scale, fetchPdfBuffer, onProgress } = options;
  const pdfjs = await loadPdfjs();

  // 1. Download each unique source PDF with bounded concurrency (max 3) so
  //    low-memory laptops/Safari never choke on simultaneous multi-PDF fetches.
  const uniqueUrls = Array.from(new Set(topicalPaper.questions.map((q) => q.qpUrl)));
  onProgress?.(`Fetching ${uniqueUrls.length} official Cambridge papers…`);

  const buffersByUrl = new Map<string, ArrayBuffer>();
  for (let i = 0; i < uniqueUrls.length; i += 3) {
    const batch = uniqueUrls.slice(i, i + 3);
    const fetched = await Promise.all(
      batch.map(async (url) => [url, await fetchPdfBuffer(url)] as const),
    );
    for (const [url, buf] of fetched) {
      buffersByUrl.set(url, buf);
    }
  }

  // 2. Render needed pages one PDF document at a time, cleaning up each doc
  //    immediately to stay well below Safari/WebKit canvas & worker memory limits.
  const pagesNeededByUrl = new Map<string, Set<number>>();
  for (const q of topicalPaper.questions) {
    const set = pagesNeededByUrl.get(q.qpUrl) ?? new Set<number>();
    set.add(q.pageNumber);
    pagesNeededByUrl.set(q.qpUrl, set);
  }

  onProgress?.(`Extracting ${topicalPaper.questions.length} real exam questions & diagrams…`);

  const renderedSourcePages = new Map<
    string,
    { canvas: HTMLCanvasElement; widthPt: number; heightPt: number }
  >();

  for (const [url, pageNums] of pagesNeededByUrl.entries()) {
    const buf = buffersByUrl.get(url);
    buffersByUrl.delete(url);
    if (!buf) continue;

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      isOffscreenCanvasSupported: false,
    });
    const doc = await loadingTask.promise;

    try {
      for (const pageNum of pageNums) {
        if (pageNum < 1 || pageNum > doc.numPages) continue;
        const page = await doc.getPage(pageNum);
        try {
          const unscaledViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale });

          const srcCanvas = document.createElement("canvas");
          srcCanvas.width = Math.ceil(viewport.width);
          srcCanvas.height = Math.ceil(viewport.height);
          const srcCtx = srcCanvas.getContext("2d");
          if (!srcCtx) continue;

          srcCtx.fillStyle = "#ffffff";
          srcCtx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
          await (page.render({ canvasContext: srcCtx, viewport } as any) as any).promise;

          renderedSourcePages.set(`${url}::${pageNum}`, {
            canvas: srcCanvas,
            widthPt: unscaledViewport.width,
            heightPt: unscaledViewport.height,
          });
        } finally {
          page.cleanup();
        }
        await yieldToMain();
      }
    } finally {
      await loadingTask.destroy().catch(() => {});
    }
  }

  // 3. Group questions into virtual pages (2 questions per page, like a real 9708 booklet)
  const QUESTIONS_PER_PAGE = 2;
  const totalVirtualPages = Math.ceil(topicalPaper.questions.length / QUESTIONS_PER_PAGE);
  const builtPages: Array<{ pageNumber: number; canvas: HTMLCanvasElement }> = [];
  const questionPages: Record<number, number> = {};
  const questionSlices: Record<number, HTMLCanvasElement> = {};
  const stems: StemBlob[] = topicalPaper.questions.map((q) => ({
    number: q.number,
    text: `[${q.sourcePaperCode} Q${q.originalQuestionNumber} · ${q.subtopic}] ${q.stemText}`,
  }));

  const PAGE_WIDTH_PT = 595.28;
  const HEADER_HEIGHT_PT = 44;
  const QUESTION_BANNER_PT = 24;
  const QUESTION_GAP_PT = 18;
  const FOOTER_PAD_PT = 28;

  for (let vPage = 1; vPage <= totalVirtualPages; vPage++) {
    const startIdx = (vPage - 1) * QUESTIONS_PER_PAGE;
    const pageQuestions = topicalPaper.questions.slice(startIdx, startIdx + QUESTIONS_PER_PAGE);

    let totalHeightPt = HEADER_HEIGHT_PT + FOOTER_PAD_PT;
    for (let i = 0; i < pageQuestions.length; i++) {
      const q = pageQuestions[i];
      const sliceHeightPt = Math.max(120, q.yTop - q.yBottom);
      totalHeightPt += QUESTION_BANNER_PT + sliceHeightPt;
      if (i < pageQuestions.length - 1) {
        totalHeightPt += QUESTION_GAP_PT;
      }
    }
    const finalHeightPt = Math.max(760, totalHeightPt);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(PAGE_WIDTH_PT * scale);
    outCanvas.height = Math.round(finalHeightPt * scale);
    const ctx = outCanvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    // Draw Cambridge-style Topical Paper top header bar
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, outCanvas.width, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1, Math.round(1 * scale));
    ctx.beginPath();
    ctx.moveTo(0, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.lineTo(outCanvas.width, Math.round(HEADER_HEIGHT_PT * scale));
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(9.5 * scale)}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(
      `CAMBRIDGE INTERNATIONAL 9708 · TOPICAL PAST PAPER (${topicalPaper.topicNumber.toUpperCase()})`,
      Math.round(36 * scale),
      Math.round(16 * scale),
    );

    ctx.fillStyle = "#475569";
    ctx.font = `${Math.round(8.5 * scale)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(
      `${topicalPaper.shortTitle} · Real Past Paper Slices`,
      Math.round(36 * scale),
      Math.round(31 * scale),
    );

    const pageBadge = `Page ${vPage} of ${totalVirtualPages}`;
    ctx.fillStyle = "#334155";
    ctx.font = `bold ${Math.round(9 * scale)}px Arial, Helvetica, sans-serif`;
    const badgeMetrics = ctx.measureText(pageBadge);
    ctx.fillText(
      pageBadge,
      outCanvas.width - Math.round(36 * scale) - badgeMetrics.width,
      Math.round(23 * scale),
    );

    let cursorYPt = HEADER_HEIGHT_PT + 10;

    for (let i = 0; i < pageQuestions.length; i++) {
      const q = pageQuestions[i];
      questionPages[q.number] = vPage;

      const bannerY = Math.round(cursorYPt * scale);
      const bannerH = Math.round(QUESTION_BANNER_PT * scale);
      const leftMarginX = Math.round(36 * scale);
      const rightMarginX = outCanvas.width - Math.round(36 * scale);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(leftMarginX, bannerY, rightMarginX - leftMarginX, bannerH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(1, Math.round(0.75 * scale));
      ctx.strokeRect(leftMarginX, bannerY, rightMarginX - leftMarginX, bannerH);

      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${Math.round(8.5 * scale)}px Arial, Helvetica, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(
        `QUESTION ${q.number}  ·  ${q.subtopic} (${q.visualType})`,
        leftMarginX + Math.round(10 * scale),
        bannerY + Math.round(bannerH / 2),
      );

      const sourceLabel = `Source: ${q.sourcePaperCode} · Original Q${q.originalQuestionNumber}`;
      ctx.fillStyle = "#475569";
      ctx.font = `bold ${Math.round(8 * scale)}px Consolas, Monaco, monospace`;
      const srcWidth = ctx.measureText(sourceLabel).width;
      ctx.fillText(
        sourceLabel,
        rightMarginX - Math.round(10 * scale) - srcWidth,
        bannerY + Math.round(bannerH / 2),
      );

      cursorYPt += QUESTION_BANNER_PT + 4;

      const srcEntry = renderedSourcePages.get(`${q.qpUrl}::${q.pageNumber}`);
      const sliceHeightPt = Math.max(120, q.yTop - q.yBottom);
      if (srcEntry) {
        const srcY = Math.max(0, Math.round((srcEntry.heightPt - q.yTop) * scale));
        const srcH = Math.min(
          srcEntry.canvas.height - srcY,
          Math.round(sliceHeightPt * scale),
        );
        const destY = Math.round(cursorYPt * scale);

        ctx.drawImage(
          srcEntry.canvas,
          0,
          srcY,
          srcEntry.canvas.width,
          srcH,
          0,
          destY,
          srcEntry.canvas.width,
          srcH,
        );

        // Mask the original left-margin question number and draw the new sequential number
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          Math.round(36 * scale),
          destY,
          Math.round(32 * scale),
          Math.round(34 * scale),
        );

        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(11 * scale)}px Arial, Helvetica, sans-serif`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          String(q.number),
          Math.round(49.6 * scale),
          destY + Math.round(18.5 * scale),
        );

        // Also build an isolated single-question PDF crop for Question-by-Question Mode
        const padPx = Math.round(14 * scale);
        const soloCanvas = document.createElement("canvas");
        soloCanvas.width = srcEntry.canvas.width;
        soloCanvas.height = srcH + padPx * 2;
        const soloCtx = soloCanvas.getContext("2d");
        if (soloCtx) {
          soloCtx.fillStyle = "#ffffff";
          soloCtx.fillRect(0, 0, soloCanvas.width, soloCanvas.height);
          soloCtx.drawImage(
            srcEntry.canvas,
            0,
            srcY,
            srcEntry.canvas.width,
            srcH,
            0,
            padPx,
            srcEntry.canvas.width,
            srcH,
          );
          soloCtx.fillStyle = "#ffffff";
          soloCtx.fillRect(
            Math.round(36 * scale),
            padPx,
            Math.round(32 * scale),
            Math.round(34 * scale),
          );
          soloCtx.fillStyle = "#000000";
          soloCtx.font = `bold ${Math.round(11 * scale)}px Arial, Helvetica, sans-serif`;
          soloCtx.textBaseline = "alphabetic";
          soloCtx.fillText(
            String(q.number),
            Math.round(49.6 * scale),
            padPx + Math.round(18.5 * scale),
          );
          questionSlices[q.number] = soloCanvas;
        }
      }

      cursorYPt += sliceHeightPt;

      if (i < pageQuestions.length - 1) {
        const sepY = Math.round((cursorYPt + QUESTION_GAP_PT / 2) * scale);
        ctx.save();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = Math.max(1, Math.round(1 * scale));
        ctx.setLineDash([Math.round(4 * scale), Math.round(4 * scale)]);
        ctx.beginPath();
        ctx.moveTo(Math.round(36 * scale), sepY);
        ctx.lineTo(outCanvas.width - Math.round(36 * scale), sepY);
        ctx.stroke();
        ctx.restore();
        cursorYPt += QUESTION_GAP_PT;
      }
    }

    builtPages.push({ pageNumber: vPage, canvas: outCanvas });
    await yieldToMain();
  }

  // Release temporary full-page source canvases to free Safari/WebKit GPU/RAM
  for (const entry of renderedSourcePages.values()) {
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  }
  renderedSourcePages.clear();

  return {
    pages: builtPages,
    stems,
    questionPages,
    questionSlices,
  };
}
