export type CambridgeQuestionSpec = {
  number: string; // e.g. "1(a)", "2(a)", "2(b)"
  title: string;
  maxMark: number;
  tariff: {
    ao1: number;
    ao2: number;
    ao3: number;
  };
  hasDiagramRequirement: boolean;
  syllabusTopic: string;
  markingGuide: string;
};

export type CambridgePaperConfig = {
  subjectCode: "9708";
  subjectTitle: string;
  qualification: "as" | "a2";
  paperNumber: string; // "22", "42"
  series: string; // "2024_may_june"
  totalMarks: number;
  durationMinutes: number;
  questions: CambridgeQuestionSpec[];
};

export const CAMBRIDGE_9708_PAPERS: Record<string, CambridgePaperConfig> = {
  "9708_22_2024_mj": {
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualification: "as",
    paperNumber: "22",
    series: "2024_may_june",
    totalMarks: 60,
    durationMinutes: 120,
    questions: [
      {
        number: "1(a)",
        title: "Define the term 'negative externality' with reference to the extract.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "Market failure and externalities",
        markingGuide: "1 mark for definition: cost incurred by a third party not involved in the transaction / external cost. 1 mark for application to extract.",
      },
      {
        number: "1(b)",
        title: "Explain how an indirect tax can correct market failure for demerit goods.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        syllabusTopic: "Government microeconomic intervention",
        markingGuide: "Up to 2 marks for explanation of mechanism: tax increases costs of production, shifts supply curve inward/left. Up to 2 marks for impact on market price and quantity towards social optimum.",
      },
      {
        number: "1(c)",
        title: "Analyze the consequences of a price ceiling on consumer surplus.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        syllabusTopic: "Maximum price controls",
        markingGuide: "2 marks for explaining price ceiling below equilibrium creating shortage. 2 marks for analysis of change in consumer surplus.",
      },
      {
        number: "1(d)",
        title: "Discuss whether subsidizing electric vehicles is more effective than taxing fuel.",
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        syllabusTopic: "Subsidies vs taxes in environmental economics",
        markingGuide: "Up to 2 marks AO1/AO2 for subsidies reducing MPC of EVs. Up to 2 marks AO1/AO2 for taxing petrol. Up to 2 marks AO3 for reasoned comparative evaluation and opportunity cost.",
      },
      {
        number: "2(a)",
        title: "Explain the difference between productive efficiency and allocative efficiency.",
        maxMark: 8,
        tariff: { ao1: 4, ao2: 4, ao3: 0 },
        hasDiagramRequirement: true,
        syllabusTopic: "Economic efficiency",
        markingGuide: "Up to 4 marks for productive efficiency: lowest point of AC / minimum average cost, with PPC or cost curve. Up to 4 marks for allocative efficiency: P=MC / MSB=MSC where society's welfare is maximized.",
      },
      {
        number: "2(b)",
        title: "Assess whether a free market always fails to achieve economic efficiency.",
        maxMark: 12,
        tariff: { ao1: 3, ao2: 5, ao3: 4 },
        hasDiagramRequirement: true,
        syllabusTopic: "Market failure and efficiency",
        markingGuide: "Up to 3 marks AO1 (market failure concepts). Up to 5 marks AO2 (analysis of monopolies, externalities, public goods). Up to 4 marks AO3 (counter-analysis of competitive market price signaling and conclusion).",
      },
      {
        number: "3(a)",
        title: "Explain how cost-push inflation differs from demand-pull inflation.",
        maxMark: 8,
        tariff: { ao1: 4, ao2: 4, ao3: 0 },
        hasDiagramRequirement: true,
        syllabusTopic: "Inflation",
        markingGuide: "Up to 4 marks for demand-pull with AD shift right. Up to 4 marks for cost-push with SRAS shift left, accompanied by clear diagram.",
      },
      {
        number: "3(b)",
        title: "Assess the effectiveness of contractionary monetary policy in reducing inflation.",
        maxMark: 12,
        tariff: { ao1: 3, ao2: 5, ao3: 4 },
        hasDiagramRequirement: false,
        syllabusTopic: "Macroeconomic policies",
        markingGuide: "Up to 3 marks AO1 (interest rates/money supply). Up to 5 marks AO2 (transmission mechanism: borrowing costs, consumption, investment, AD). Up to 4 marks AO3 (time lags, impact on economic growth/unemployment, conclusion).",
      },
    ],
  },
  "9708_42_2024_mj": {
    subjectCode: "9708",
    subjectTitle: "Cambridge International AS & A Level Economics",
    qualification: "a2",
    paperNumber: "42",
    series: "2024_may_june",
    totalMarks: 60,
    durationMinutes: 120,
    questions: [
      {
        number: "1(a)",
        title: "Analyze the relationship between real GDP growth and the current account balance.",
        maxMark: 5,
        tariff: { ao1: 2, ao2: 3, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "Macroeconomic indicators",
        markingGuide: "Up to 2 marks AO1 identifying income elasticity of import demand. Up to 3 marks AO2 analyzing causal chain linking higher incomes to import expenditure and trade deficit.",
      },
      {
        number: "1(b)",
        title: "Evaluate whether exchange rate depreciation is effective in restoring trade equilibrium.",
        maxMark: 15,
        tariff: { ao1: 3, ao2: 6, ao3: 6 },
        hasDiagramRequirement: true,
        syllabusTopic: "Exchange rates and Marshall-Lerner condition",
        markingGuide: "Up to 3 marks AO1. Up to 6 marks AO2 for analysis of relative price changes and J-curve effect. Up to 6 marks AO3 for Marshall-Lerner condition (PEDx + PEDm > 1) and evaluation.",
      },
      {
        number: "2",
        title: "Evaluate the view that natural monopolies should always be nationalised by governments.",
        maxMark: 20,
        tariff: { ao1: 4, ao2: 8, ao3: 8 },
        hasDiagramRequirement: true,
        syllabusTopic: "Monopoly regulation and contestability",
        markingGuide: "Up to 4 marks AO1 (definition of natural monopoly with falling LRAC over full market output). Up to 8 marks AO2 (allocative/productive inefficiency under private monopoly vs sub-marginal cost pricing under state ownership). Up to 8 marks AO3 (government failure, regulatory alternatives like RPI-X, justified conclusion).",
      },
      {
        number: "3",
        title: "Discuss whether supply-side policies are superior to demand-side policies in achieving long-run economic growth.",
        maxMark: 20,
        tariff: { ao1: 4, ao2: 8, ao3: 8 },
        hasDiagramRequirement: true,
        syllabusTopic: "Economic growth policies",
        markingGuide: "Up to 4 marks AO1. Up to 8 marks AO2 (shift in LRAS vs shift in AD with diagrams). Up to 8 marks AO3 (time lags, fiscal cost, complementary nature of both policies).",
      },
    ],
  },
};

export function getPaperConfig(
  subjectCodeOrPaperNumber: string,
  paperNumber?: string,
  series?: string,
): CambridgePaperConfig {
  if (!paperNumber) {
    const match = Object.values(CAMBRIDGE_9708_PAPERS).find(
      (p) => p.paperNumber === subjectCodeOrPaperNumber || p.subjectCode === subjectCodeOrPaperNumber,
    );
    if (match) return match;
    return CAMBRIDGE_9708_PAPERS["9708_22_2024_mj"];
  }

  const key = `${subjectCodeOrPaperNumber}_${paperNumber}_${series || "2024_may_june"}`;
  if (CAMBRIDGE_9708_PAPERS[key]) {
    return CAMBRIDGE_9708_PAPERS[key];
  }
  // Default fallback to 9708 Paper 22
  return CAMBRIDGE_9708_PAPERS["9708_22_2024_mj"];
}

export function listAvailablePapers(): CambridgePaperConfig[] {
  return Object.values(CAMBRIDGE_9708_PAPERS);
}
