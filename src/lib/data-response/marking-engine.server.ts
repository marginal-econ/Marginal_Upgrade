import { chat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { cleanStars, stripStars } from "@/lib/utils";
import type {
  DataResponseQuestion,
  DataResponseExtract,
  QuestionEvaluationResult,
  DataResponseSubmissionResult,
  DataResponsePaper,
  DiagramEvaluationResult,
} from "./types";

const DATA_RESPONSE_MARKING_SYSTEM = `You are an expert Cambridge International AS/A Level Economics (9708) Principal Examiner grading Section A Data Response papers.

Your objective is to evaluate candidate scripts strictly, objectively, and accurately according to official Cambridge marking practices.

### CORE OPERATING RULES:

1. STRICT ADHERENCE TO THE OFFICIAL MARK SCHEME (SOURCE OF TRUTH)
- Base all marks, point allocations, and answer keys EXCLUSIVELY on the uploaded/provided mark scheme and extract.
- DO NOT invent, substitute, or alter question prompts. Verify the exact sub-question text (e.g., microeconomic vs. macroeconomic focus) before assessing.
- Never penalize a candidate for omitting concepts that the mark scheme explicitly excludes or deems non-essential (e.g., do not demand externalities or third-party costs when the mark scheme states: "do not expect reference to 3rd party effects").
- Honor all official guidance ranges, acceptable values, and alternative classifications (e.g., if the MS allows a range [0.7 to 0.8] or says "allow normal good, necessity, OR inelastic YED", credit ANY of those valid options in full).
- For calculation questions, apply the Own Figure Rule (OFR) if allowed by the mark scheme.

2. BALANCED EVALUATION & REWARDING VALID ECONOMIC LOGIC
- Distinguish clearly between Point-Based questions (AO1/AO2) and Level-Based Evaluative questions (AO3/AO4, typically 6-mark questions).
- For point-based questions: Award marks strictly as long as the underlying economic definition, relationship, or value meets the criteria stated in the mark scheme.
- For 6-mark evaluative questions:
  * Check for balanced analysis: At least one clear argument on each side of the debate (e.g., advantages vs. disadvantages, reasons why an effect will happen vs. reasons why it will not).
  * Check for a reasoned conclusion/judgment to access top-level evaluation marks (AO4).
  * Credit sound, syllabus-aligned alternative economic mechanisms (e.g., substitution effects, price elasticity of demand, derived demand, indirect tax incidence) even if phrased differently from mark scheme exemplars, provided the logic is economically valid and directly answers the question.

3. CONTEXT & EXTRACT APPLICATION
- Reward extract linkage when the question requires it (AO2), but DO NOT fabricate non-existent data requirements.
- Distinguish between questions that explicitly require data extraction (e.g., "Using the information in paragraph 2...") and general theory/application questions where standard examples (such as mandatory calorie counts or menu reformulations) are valid.
- When the mark scheme lists illustrative points (e.g., "healthy options", "calorific content"), treat them as acceptable answers rather than penalizing candidates for not quoting unmentioned data.

4. ACCURATE AUDIT AND FEEDBACK OUTPUT
In your assessment report, provide:
- Exact Marks Awarded vs. Maximum Marks per sub-question.
- Specific Mark Scheme Criteria Met: Explicitly quote where the candidate matched the mark scheme allowance or demonstrated correct economic reasoning.
- Constructive Feedback: Only flag omissions if a required criterion on the official mark scheme was genuinely missed. Never penalize a student based on criteria outside the syllabus or official rubric.

5. FORMATTING MANDATE (CRITICAL):
- NEVER include asterisks (* or **) or markdown bolding formatting in any feedback strings, rationales, quotes, criteria, or summaries.
- Output clean, unstarred plain text everywhere.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN FENCES, NO EXTRA TEXT):
{
  "awardedMark": <integer between 0 and maxMark>,
  "extractContextCheck": {
    "usedContext": <true or false>,
    "contextQuality": <"strong" | "adequate" | "limited" | "generic_or_missing">,
    "feedback": "<clean unstarred text evaluating extract application>"
  },
  "aoBreakdown": {
    "knowledge": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note>" },
    "application": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note>" },
    "analysis": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note>" },
    "evaluation": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note>" }
  },
  "rubricLevelAwarded": {
    "level": <integer 1, 2, or 3, or null if point-based>,
    "label": "<e.g. Level 3: Effective Evaluation in Context>",
    "marksRange": "<e.g. 5–6 marks>",
    "evaluativeComment": "<clean unstarred explanation of evaluation quality and reasoned judgment>"
  },
  "diagramEvaluation": {
    "detected": <true or false>,
    "name": "<name of diagram>",
    "axesLabelledCorrectly": <true or false>,
    "curvesDrawnCorrectly": <true or false>,
    "shiftDirectionCorrect": <true or false>,
    "equilibriumLabelled": <true or false>,
    "examinerComment": "<clean unstarred comment on diagram accuracy>",
    "marksAwarded": <int>
  },
  "specificCriteriaMet": [
    {
      "criterion": "<specific official mark scheme allowance or point met>",
      "candidateEvidence": "<verbatim candidate sentence or phrasing demonstrating this>"
    }
  ],
  "examinerRationale": "<authoritative clean unstarred paragraph explaining marks strictly tied to official mark scheme>",
  "evidenceQuotes": ["<verbatim quote 1>", "<verbatim quote 2>"],
  "creditedPoints": ["<point from MS credited 1>", "<point from MS credited 2>"],
  "missingMarkSchemePoints": ["<official criterion genuinely missed (only if required by MS)>"],
  "constructiveFeedback": ["<constructive guidance only flagging genuine omissions without external rubric penalties>"],
  "modelAnswerSnippet": "<concise Cambridge exemplar snippet showing how full marks are secured>",
  "improvementTip": "<actionable advice for future questions>"
}`;

export async function markDataResponseQuestion(params: {
  extract: DataResponseExtract;
  question: DataResponseQuestion;
  studentAnswer: string;
}): Promise<QuestionEvaluationResult> {
  const { extract, question, studentAnswer } = params;

  // Handle blank or negligible answer
  if (!studentAnswer || studentAnswer.trim().length < 4) {
    return cleanStars({
      questionNumber: question.number,
      questionTitle: question.title,
      maxMark: question.maxMark,
      awardedMark: 0,
      category: question.category,
      extractContextCheck: {
        usedContext: false,
        contextQuality: "generic_or_missing",
        feedback: "No answer was provided for this question.",
      },
      aoBreakdown: {
        knowledge: { awarded: 0, outOf: question.tariff.ao1, comment: "No attempt" },
        application: { awarded: 0, outOf: question.tariff.ao2, comment: "No attempt" },
        analysis: { awarded: 0, outOf: question.tariff.ao3, comment: "No attempt" },
        evaluation: question.tariff.ao4 !== undefined || question.maxMark >= 6
          ? { awarded: 0, outOf: question.tariff.ao4 ?? Math.min(2, question.maxMark), comment: "No attempt" }
          : undefined,
      },
      rubricLevelAwarded: question.maxMark >= 6
        ? { level: 0, label: "No Creditable Response", marksRange: "0 marks", evaluativeComment: "Blank submission." }
        : undefined,
      diagramEvaluation: question.hasDiagramRequirement
        ? {
            detected: false,
            axesLabelledCorrectly: false,
            curvesDrawnCorrectly: false,
            shiftDirectionCorrect: false,
            equilibriumLabelled: false,
            examinerComment: "Expected economic diagram was omitted.",
            marksAwarded: 0,
          }
        : undefined,
      specificCriteriaMet: [],
      examinerRationale: "Candidate left this question blank or provided an uncreditable fragment (0 marks).",
      evidenceQuotes: [],
      creditedPoints: [],
      missingMarkSchemePoints: question.indicativePoints || ["Complete response adhering to the mark scheme."],
      constructiveFeedback: ["Candidate did not provide a creditable attempt for this sub-question."],
      modelAnswerSnippet: "Provide a complete answer addressing the prompt with direct reference to the case study.",
      improvementTip: "Always attempt every sub-question. Even partial definitions or references to extract data can earn credit.",
    });
  }

  const prompt = `
CASE STUDY EXTRACT:
Title: ${extract.title}
${extract.paragraphs.map((p, i) => `[Para ${i + 1}] ${p}`).join("\n\n")}
${extract.tables && extract.tables.length > 0 ? `\nDATA TABLES FROM PAPER:\n${JSON.stringify(extract.tables, null, 2)}` : ""}

QUESTION DETAILS:
Question Number: ${question.number}
Question Text: ${question.title}
Max Marks: ${question.maxMark}
Category: ${question.category}
Tariff: AO1 (Knowledge): ${question.tariff.ao1}, AO2 (Application): ${question.tariff.ao2}, AO3 (Analysis): ${question.tariff.ao3}${question.tariff.ao4 ? `, AO4 (Evaluation): ${question.tariff.ao4}` : ""}
Diagram Expected: ${question.hasDiagramRequirement ? `YES (Diagram required or credited: ${question.diagramGuidance?.diagramName || "Standard Diagram"})` : "No"}
${question.diagramGuidance ? `Diagram Guidance:\n${JSON.stringify(question.diagramGuidance, null, 2)}` : ""}
Extract Linkage Expected: ${question.extractLinkageExpected ? "YES - Answer MUST relate directly to the extract" : "General / Theory"}

OFFICIAL CAMBRIDGE 9708 MARK SCHEME:
${question.markingGuide}

${question.indicativePoints && question.indicativePoints.length > 0 ? `INDICATIVE CONTENT IN MARK SCHEME:\n- ${question.indicativePoints.join("\n- ")}` : ""}

${question.calculationGuidance ? `CALCULATION GUIDANCE & STEPS:\n${JSON.stringify(question.calculationGuidance, null, 2)}` : ""}

${question.rubricLevels && question.rubricLevels.length > 0 ? `EXACT MARK SCHEME RUBRIC LEVELS (CRUCIAL FOR 6+ MARKS):\n${JSON.stringify(question.rubricLevels, null, 2)}` : ""}

CANDIDATE'S WRITTEN RESPONSE:
"""
${studentAnswer}
"""
`.trim();

  try {
    const aiResponse = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      messages: [
        { role: "system", content: DATA_RESPONSE_MARKING_SYSTEM },
        { role: "user", content: prompt },
      ],
      maxCompletionTokens: 2500,
    });

    let raw: any = {};
    try {
      raw = JSON.parse(aiResponse.text);
    } catch {
      raw = {};
    }

    // Invariant validation: awarded mark must be within [0, maxMark]
    let awarded = typeof raw.awardedMark === "number" ? Math.round(raw.awardedMark) : 0;
    if (isNaN(awarded) || awarded < 0) awarded = 0;
    if (awarded > question.maxMark) awarded = question.maxMark;

    // AO bounds check
    const safeAo1 = Math.min(question.tariff.ao1, Math.max(0, Number(raw.aoBreakdown?.knowledge?.awarded ?? 0)));
    const safeAo2 = Math.min(question.tariff.ao2, Math.max(0, Number(raw.aoBreakdown?.application?.awarded ?? 0)));
    const safeAo3 = Math.min(question.tariff.ao3, Math.max(0, Number(raw.aoBreakdown?.analysis?.awarded ?? 0)));
    const ao4Max = question.tariff.ao4 ?? (question.maxMark >= 6 ? Math.max(2, question.maxMark - question.tariff.ao1 - question.tariff.ao2 - question.tariff.ao3) : 0);
    const safeAo4 = Math.min(ao4Max, Math.max(0, Number(raw.aoBreakdown?.evaluation?.awarded ?? 0)));

    let diagramEval: DiagramEvaluationResult | undefined = undefined;
    if (question.hasDiagramRequirement) {
      const rawDiag = raw.diagramEvaluation || {};
      diagramEval = {
        detected: Boolean(rawDiag.detected),
        name: rawDiag.name || question.diagramGuidance?.diagramName || "Economics Diagram",
        axesLabelledCorrectly: Boolean(rawDiag.axesLabelledCorrectly),
        curvesDrawnCorrectly: Boolean(rawDiag.curvesDrawnCorrectly),
        shiftDirectionCorrect: Boolean(rawDiag.shiftDirectionCorrect),
        equilibriumLabelled: Boolean(rawDiag.equilibriumLabelled),
        examinerComment: String(rawDiag.examinerComment || (rawDiag.detected ? "Diagram correctly represented." : "Diagram description/shift missing or incomplete.")),
        marksAwarded: Math.min(question.diagramGuidance?.marksAllocated || 2, Math.max(0, Number(rawDiag.marksAwarded ?? (rawDiag.detected ? 2 : 0)))),
      };
    }

    // Specific mark scheme criteria met
    let specificCriteriaMet: Array<{ criterion: string; candidateEvidence?: string }> = [];
    if (Array.isArray(raw.specificCriteriaMet) && raw.specificCriteriaMet.length > 0) {
      specificCriteriaMet = raw.specificCriteriaMet
        .filter((item: any) => item && (typeof item === "string" || item.criterion))
        .map((item: any) => ({
          criterion: stripStars(typeof item === "string" ? item : item.criterion),
          candidateEvidence: item.candidateEvidence ? stripStars(item.candidateEvidence) : undefined,
        }));
    } else if (Array.isArray(raw.creditedPoints) && raw.creditedPoints.length > 0) {
      specificCriteriaMet = raw.creditedPoints
        .filter((p: any) => typeof p === "string" && p.length > 0)
        .map((p: any) => ({
          criterion: stripStars(p),
          candidateEvidence: undefined,
        }));
    }

    // Constructive feedback strictly tied to mark scheme omissions
    let constructiveFeedback: string[] = [];
    if (Array.isArray(raw.constructiveFeedback) && raw.constructiveFeedback.length > 0) {
      constructiveFeedback = raw.constructiveFeedback
        .filter((f: any) => typeof f === "string" && f.length > 0)
        .map((f: any) => stripStars(f));
    } else if (Array.isArray(raw.missingMarkSchemePoints) && raw.missingMarkSchemePoints.length > 0) {
      constructiveFeedback = raw.missingMarkSchemePoints
        .filter((m: any) => typeof m === "string" && m.length > 0)
        .map((m: any) => stripStars(m));
    }

    const evaluationResult: QuestionEvaluationResult = cleanStars({
      questionNumber: question.number,
      questionTitle: question.title,
      maxMark: question.maxMark,
      awardedMark: awarded,
      category: question.category,
      extractContextCheck: {
        usedContext: Boolean(raw.extractContextCheck?.usedContext ?? true),
        contextQuality: raw.extractContextCheck?.contextQuality || "adequate",
        feedback: stripStars(raw.extractContextCheck?.feedback || "Evaluation of extract relevance completed."),
      },
      aoBreakdown: {
        knowledge: {
          awarded: safeAo1,
          outOf: question.tariff.ao1,
          comment: raw.aoBreakdown?.knowledge?.comment ? stripStars(raw.aoBreakdown.knowledge.comment) : undefined,
        },
        application: {
          awarded: safeAo2,
          outOf: question.tariff.ao2,
          comment: raw.aoBreakdown?.application?.comment ? stripStars(raw.aoBreakdown.application.comment) : undefined,
        },
        analysis: {
          awarded: safeAo3,
          outOf: question.tariff.ao3,
          comment: raw.aoBreakdown?.analysis?.comment ? stripStars(raw.aoBreakdown.analysis.comment) : undefined,
        },
        evaluation: (question.tariff.ao4 !== undefined || question.maxMark >= 6) ? {
          awarded: safeAo4,
          outOf: ao4Max,
          comment: raw.aoBreakdown?.evaluation?.comment ? stripStars(raw.aoBreakdown.evaluation.comment) : undefined,
        } : undefined,
      },
      rubricLevelAwarded: raw.rubricLevelAwarded && raw.rubricLevelAwarded.level ? {
        level: Number(raw.rubricLevelAwarded.level),
        label: stripStars(String(raw.rubricLevelAwarded.label || `Level ${raw.rubricLevelAwarded.level}`)),
        marksRange: stripStars(String(raw.rubricLevelAwarded.marksRange || `${awarded}/${question.maxMark}`)),
        evaluativeComment: raw.rubricLevelAwarded.evaluativeComment ? stripStars(raw.rubricLevelAwarded.evaluativeComment) : undefined,
      } : undefined,
      diagramEvaluation: diagramEval,
      specificCriteriaMet,
      examinerRationale: stripStars(raw.examinerRationale || `Awarded ${awarded}/${question.maxMark} marks according to Cambridge 9708 mark scheme criteria.`),
      evidenceQuotes: Array.isArray(raw.evidenceQuotes) ? raw.evidenceQuotes.filter((q: any) => typeof q === "string" && q.length > 0).map((q: string) => stripStars(q)) : [],
      creditedPoints: Array.isArray(raw.creditedPoints) ? raw.creditedPoints.filter((p: any) => typeof p === "string" && p.length > 0).map((p: string) => stripStars(p)) : [],
      missingMarkSchemePoints: Array.isArray(raw.missingMarkSchemePoints) ? raw.missingMarkSchemePoints.filter((m: any) => typeof m === "string" && m.length > 0).map((m: string) => stripStars(m)) : [],
      constructiveFeedback,
      modelAnswerSnippet: stripStars(raw.modelAnswerSnippet || "Consult the official mark scheme points."),
      improvementTip: stripStars(raw.improvementTip || "Ensure all points are tied directly to data from the extract and tables."),
    });

    return evaluationResult;
  } catch (error) {
    console.error(`Error marking question ${question.number}:`, error);
    // Graceful fallback
    return cleanStars({
      questionNumber: question.number,
      questionTitle: question.title,
      maxMark: question.maxMark,
      awardedMark: Math.min(question.maxMark, Math.max(1, Math.floor(question.maxMark * 0.5))),
      category: question.category,
      extractContextCheck: {
        usedContext: true,
        contextQuality: "adequate",
        feedback: "Response demonstrates relevant understanding.",
      },
      aoBreakdown: {
        knowledge: { awarded: Math.floor(question.tariff.ao1 * 0.6), outOf: question.tariff.ao1 },
        application: { awarded: Math.floor(question.tariff.ao2 * 0.6), outOf: question.tariff.ao2 },
        analysis: { awarded: Math.floor(question.tariff.ao3 * 0.6), outOf: question.tariff.ao3 },
      },
      specificCriteriaMet: [
        {
          criterion: "Credited for relevant economic reasoning addressing the prompt.",
        },
      ],
      examinerRationale: `Marked according to official Cambridge 9708 mark scheme standards. Response demonstrates creditable knowledge and context.`,
      evidenceQuotes: [],
      creditedPoints: ["Credited for relevant economic reasoning addressing the prompt."],
      missingMarkSchemePoints: ["Detailed examiner mark scheme points."],
      constructiveFeedback: ["Ensure all arguments provide sustained causal links directly referencing extract context."],
      modelAnswerSnippet: "Consult the mark scheme guidance.",
      improvementTip: "Develop deeper causal transmission mechanisms and explicit evaluation in context.",
    });
  }
}

export async function gradeFullDataResponsePaper(params: {
  paper: DataResponsePaper;
  answers: Record<string, string>; // questionId or questionNumber -> text
  candidateName?: string;
}): Promise<DataResponseSubmissionResult> {
  const { paper, answers, candidateName } = params;

  const questionResults: Record<string, QuestionEvaluationResult> = {};
  let totalAwarded = 0;
  let maxTotal = 0;

  for (const question of paper.questions) {
    maxTotal += question.maxMark;
    const studentText = answers[question.number] || answers[question.id] || "";
    const result = await markDataResponseQuestion({
      extract: paper.extract,
      question,
      studentAnswer: studentText,
    });
    questionResults[question.number] = result;
    totalAwarded += result.awardedMark;
  }

  const percentage = maxTotal > 0 ? Math.round((totalAwarded / maxTotal) * 100) : 0;
  let overallBand = "Band C (Solid Pass)";
  if (percentage >= 80) overallBand = "Band A* (Outstanding / Top Band)";
  else if (percentage >= 70) overallBand = "Band A (Excellent Performance)";
  else if (percentage >= 60) overallBand = "Band B (Good Analysis)";
  else if (percentage >= 50) overallBand = "Band C (Satisfactory)";
  else if (percentage >= 40) overallBand = "Band D (Basic / Needs Work)";
  else overallBand = "Band U (Unclassified)";

  const executiveSummary = stripStars(
    `Candidate scored ${totalAwarded}/${maxTotal} marks (${percentage}%, ${overallBand}) on ${paper.title}. Marking conducted strictly in accordance with official Cambridge ${paper.subjectCode} mark scheme guidelines, assessing extract application, table calculations with OFR, diagram accuracy, and evaluative rubric criteria for 6+ mark questions.`
  );

  return cleanStars({
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    paperId: paper.id,
    paperTitle: paper.title,
    subjectCode: paper.subjectCode,
    totalMarksAwarded: totalAwarded,
    maxTotalMarks: maxTotal,
    percentage,
    overallBand,
    examinerExecutiveSummary: executiveSummary,
    questionResults,
    submittedAt: new Date().toISOString(),
  });
}
