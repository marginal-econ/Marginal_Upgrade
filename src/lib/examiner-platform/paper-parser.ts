import type { CambridgeQuestionSpec } from "./cambridge-papers";

/**
 * Intelligent parser for Cambridge 9708 Question Paper (QP) & Mark Scheme (MS) texts.
 * Extracts questions, parts, marks, syllabus topics, and mark scheme guidance.
 */
export function parsePaperQuestionsFromTexts(
  qpText: string,
  msText: string,
  level: "as" | "a2",
  paperNumber: string,
): CambridgeQuestionSpec[] {
  const questions: CambridgeQuestionSpec[] = [];

  // Normalise linebreaks
  const cleanQp = qpText.replace(/\r\n/g, "\n");
  const cleanMs = msText.replace(/\r\n/g, "\n");

  const detectedMap = new Map<string, { title: string; mark: number }>();

  // Pass 1: Line-by-line examination scan
  const lines = cleanQp.split("\n");
  let currentQNum: string | null = null;
  let currentStem = "";
  let currentMark = 0;

  const commitCurrent = () => {
    if (currentQNum && currentStem.trim().length > 3) {
      const clean = currentStem.replace(/\s+/g, " ").replace(/\[\s*\d+\s*(?:marks?)?\s*\]/gi, "").trim();
      if (!detectedMap.has(currentQNum)) {
        detectedMap.set(currentQNum, {
          title: clean.slice(0, 300),
          mark: currentMark > 0 ? currentMark : (level === "a2" ? 12 : 8),
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Look for lines starting with question headers: e.g. "1 (a)", "1(b)", "Question 2", "2.", "2", "(a)"
    const startMatch = rawLine.match(/^(?:(?:Question|Q)\.?\s*)?([1-9]|1[0-2])(?:\s*\(([a-d])\))?[:.]?\s+(.*)$/i) ||
      rawLine.match(/^\(([a-d])\)[:.]?\s+(.*)$/i);

    if (startMatch) {
      let matchedNum: string;
      let lineRest: string;

      if (startMatch.length === 4) {
        const qDigit = startMatch[1];
        const part = startMatch[2];
        matchedNum = part ? `${qDigit}(${part})` : qDigit;
        lineRest = startMatch[3] || "";
      } else {
        const part = startMatch[1];
        const parentDigit = currentQNum ? currentQNum.split("(")[0] : "1";
        matchedNum = `${parentDigit}(${part})`;
        lineRest = startMatch[2] || "";
      }

      const markMatch = lineRest.match(/\[\s*(\d{1,2})\s*(?:marks?)?\s*\]/i);

      commitCurrent();
      currentQNum = matchedNum;
      currentStem = lineRest;
      currentMark = markMatch ? parseInt(markMatch[1], 10) : 0;
    } else if (currentQNum) {
      const markMatch = rawLine.match(/\[\s*(\d{1,2})\s*(?:marks?)?\s*\]/i);
      if (markMatch) {
        currentMark = parseInt(markMatch[1], 10);
      }
      currentStem += " " + rawLine;
    }
  }
  commitCurrent();

  // Pass 2: If line scan found fewer than 2 questions, fallback to global regex with restricted question numbers (1-12)
  if (detectedMap.size < 2) {
    const questionPattern = /(?:(?:Question\s*|Q\s*)?([1-9]|1[0-2])\s*(?:\(([a-d])\))?|^\s*([1-9]|1[0-2])\s*\(([a-d])\))\s*[:.]?\s*([\s\S]*?)(?:\[\s*(\d{1,2})\s*(?:marks?)?\s*\])/gi;
    let match: RegExpExecArray | null;
    while ((match = questionPattern.exec(cleanQp)) !== null) {
      const qNum = match[1] || match[3];
      const part = match[2] || match[4];
      const rawStem = match[5]?.trim() || "";
      const mark = parseInt(match[6], 10) || 4;
      const fullNum = part ? `${qNum}(${part})` : `${qNum}`;
      if (!detectedMap.has(fullNum) && rawStem.length > 5) {
        detectedMap.set(fullNum, {
          title: rawStem.replace(/\s+/g, " ").slice(0, 300).trim(),
          mark,
        });
      }
    }
  }

  // Also extract guidance from MS text for each question
  for (const [qNum, info] of detectedMap.entries()) {
    // Search MS for matching question marker
    const escapedNum = qNum.replace("(", "\\(").replace(")", "\\)");
    const msRegex = new RegExp(
      `(?:Question\\s*|Q\\s*)?${escapedNum}[\\s\\S]*?(?=(?:(?:Question\\s*|Q\\s*)?\\d+\\s*(?:\\([a-d]\\))?)|$)`,
      "i",
    );
    const msMatch = cleanMs.match(msRegex);
    const rawMsSnippet = msMatch ? msMatch[0].slice(0, 600).trim() : "";

    const hasDiagram =
      /diagram|curve|graph|axes|shift|ppc|ad\/as|equilibrium/i.test(info.title) ||
      /diagram|curve|shift|drawn/i.test(rawMsSnippet);

    // Compute AO tariffs based on marks and level
    const tariff = calculateAoTariff(info.mark, level, info.title);

    questions.push({
      number: qNum,
      title: info.title,
      maxMark: info.mark,
      tariff,
      hasDiagramRequirement: hasDiagram,
      syllabusTopic: inferSyllabusTopic(info.title),
      markingGuide:
        rawMsSnippet.length > 20
          ? rawMsSnippet
          : `Mark according to Cambridge 9708 standards for ${info.mark} marks. Award AO1 knowledge, AO2 analysis, and AO3 evaluation where appropriate.`,
    });
  }

  // Fallback: If no structured regex pattern was matched from the PDF text,
  // generate standard Cambridge 9708 examination slots based on paper number
  if (questions.length === 0) {
    return generateDefaultQuestionSpecs(level, paperNumber, cleanMs);
  }

  return questions;
}

function calculateAoTariff(mark: number, level: "as" | "a2", stem: string): { ao1: number; ao2: number; ao3: number } {
  const isDiscussOrAssess = /discuss|assess|evaluate|to what extent/i.test(stem);

  if (mark === 2) {
    return { ao1: 2, ao2: 0, ao3: 0 };
  }
  if (mark === 4) {
    return { ao1: 2, ao2: 2, ao3: 0 };
  }
  if (mark === 6) {
    return isDiscussOrAssess ? { ao1: 2, ao2: 2, ao3: 2 } : { ao1: 2, ao2: 4, ao3: 0 };
  }
  if (mark === 8) {
    return { ao1: 4, ao2: 4, ao3: 0 };
  }
  if (mark === 12) {
    return { ao1: 3, ao2: 5, ao3: 4 };
  }
  if (mark === 20) {
    return { ao1: 4, ao2: 8, ao3: 8 };
  }

  // Generic breakdown
  const ao1 = Math.ceil(mark * 0.35);
  const ao2 = Math.floor(mark * 0.4);
  const ao3 = mark - ao1 - ao2;
  return { ao1, ao2, ao3: Math.max(0, ao3) };
}

function inferSyllabusTopic(stem: string): string {
  const lower = stem.toLowerCase();
  if (lower.includes("externality") || lower.includes("market failure") || lower.includes("public good") || lower.includes("merit")) {
    return "Market Failure and Government Intervention";
  }
  if (lower.includes("elasticit") || lower.includes("ped") || lower.includes("pes") || lower.includes("demand") || lower.includes("supply")) {
    return "Price Mechanism and Elasticities";
  }
  if (lower.includes("ppc") || lower.includes("opportunity cost") || lower.includes("scarcity") || lower.includes("economic system")) {
    return "Basic Economic Ideas & Resource Allocation";
  }
  if (lower.includes("inflation") || lower.includes("cpi") || lower.includes("price level")) {
    return "Inflation and Price Stability";
  }
  if (lower.includes("exchange rate") || lower.includes("current account") || lower.includes("balance of payment") || lower.includes("trade")) {
    return "International Trade and Exchange Rates";
  }
  if (lower.includes("fiscal") || lower.includes("monetary") || lower.includes("supply-side") || lower.includes("interest rate")) {
    return "Macroeconomic Policies and Intervention";
  }
  if (lower.includes("monopoly") || lower.includes("efficiency") || lower.includes("contestability")) {
    return "Market Structures and Efficiency";
  }
  return "Cambridge 9708 Economics Core";
}

function generateDefaultQuestionSpecs(
  level: "as" | "a2",
  paperNumber: string,
  msText: string,
): CambridgeQuestionSpec[] {
  if (level === "a2" || paperNumber.startsWith("4")) {
    return [
      {
        number: "1(a)",
        title: "Section A Data Response Part (a)",
        maxMark: 5,
        tariff: { ao1: 2, ao2: 3, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "Macroeconomic Data Response",
        markingGuide: "Award 2 marks AO1 knowledge and 3 marks AO2 analysis with reference to the extract.",
      },
      {
        number: "1(b)",
        title: "Section A Data Response Part (b) Evaluative Essay",
        maxMark: 15,
        tariff: { ao1: 3, ao2: 6, ao3: 6 },
        hasDiagramRequirement: true,
        syllabusTopic: "Economic Policy Evaluation",
        markingGuide: "Award 3 marks AO1, 6 marks AO2 analysis, and 6 marks AO3 supported evaluation.",
      },
      {
        number: "2",
        title: "Section B Microeconomics Essay Question",
        maxMark: 20,
        tariff: { ao1: 4, ao2: 8, ao3: 8 },
        hasDiagramRequirement: true,
        syllabusTopic: "Market Structures and Efficiency",
        markingGuide: "Up to 4 marks AO1 knowledge, 8 marks AO2 analysis, and 8 marks AO3 evaluation and reasoned conclusion.",
      },
      {
        number: "3",
        title: "Section C Macroeconomics Essay Question",
        maxMark: 20,
        tariff: { ao1: 4, ao2: 8, ao3: 8 },
        hasDiagramRequirement: true,
        syllabusTopic: "Macroeconomic Policies and Global Economy",
        markingGuide: "Up to 4 marks AO1 knowledge, 8 marks AO2 analysis, and 8 marks AO3 evaluation and reasoned conclusion.",
      },
    ];
  }

  // Default AS Level Paper 2 (e.g. Paper 21, 22, 23)
  return [
    {
      number: "1(a)",
      title: "Data Response: Definition / Concept with reference to extract",
      maxMark: 2,
      tariff: { ao1: 2, ao2: 0, ao3: 0 },
      hasDiagramRequirement: false,
      syllabusTopic: "Basic Economic Ideas",
      markingGuide: "1 mark for definition, 1 mark for application to the extract.",
    },
    {
      number: "1(b)",
      title: "Data Response: Explain economic mechanism with diagram",
      maxMark: 4,
      tariff: { ao1: 2, ao2: 2, ao3: 0 },
      hasDiagramRequirement: true,
      syllabusTopic: "Microeconomic Analysis",
      markingGuide: "Up to 2 marks AO1 knowledge/diagram, up to 2 marks AO2 economic analysis.",
    },
    {
      number: "1(c)",
      title: "Data Response: Analyze economic impact on stakeholders",
      maxMark: 4,
      tariff: { ao1: 2, ao2: 2, ao3: 0 },
      hasDiagramRequirement: true,
      syllabusTopic: "Market Mechanisms",
      markingGuide: "Up to 2 marks AO1, up to 2 marks AO2 causal analysis.",
    },
    {
      number: "1(d)",
      title: "Data Response: Discuss / Assess policy effectiveness",
      maxMark: 6,
      tariff: { ao1: 2, ao2: 2, ao3: 2 },
      hasDiagramRequirement: false,
      syllabusTopic: "Government Microeconomic Intervention",
      markingGuide: "Up to 2 marks AO1, up to 2 marks AO2 analysis, up to 2 marks AO3 reasoned conclusion.",
    },
    {
      number: "2(a)",
      title: "Microeconomics Essay Part (a): Explain economic concept",
      maxMark: 8,
      tariff: { ao1: 4, ao2: 4, ao3: 0 },
      hasDiagramRequirement: true,
      syllabusTopic: "The Price System and the Microeconomy",
      markingGuide: "Up to 4 marks AO1 knowledge, up to 4 marks AO2 explanation with diagram.",
    },
    {
      number: "2(b)",
      title: "Microeconomics Essay Part (b): Discuss / Evaluate policy or market outcome",
      maxMark: 12,
      tariff: { ao1: 3, ao2: 5, ao3: 4 },
      hasDiagramRequirement: true,
      syllabusTopic: "Government Microeconomic Intervention",
      markingGuide: "Up to 3 marks AO1, up to 5 marks AO2 analysis, up to 4 marks AO3 balanced evaluation.",
    },
    {
      number: "3(a)",
      title: "Macroeconomics Essay Part (a): Explain macroeconomic relationship",
      maxMark: 8,
      tariff: { ao1: 4, ao2: 4, ao3: 0 },
      hasDiagramRequirement: true,
      syllabusTopic: "The Macroeconomy",
      markingGuide: "Up to 4 marks AO1 knowledge, up to 4 marks AO2 analysis with AD/AS diagram.",
    },
    {
      number: "3(b)",
      title: "Macroeconomics Essay Part (b): Discuss / Assess macroeconomic policy",
      maxMark: 12,
      tariff: { ao1: 3, ao2: 5, ao3: 4 },
      hasDiagramRequirement: false,
      syllabusTopic: "Government Macroeconomic Intervention",
      markingGuide: "Up to 3 marks AO1, up to 5 marks AO2 analysis, up to 4 marks AO3 substantiated evaluation.",
    },
  ];
}
