/**
 * Cambridge International AS & A Level Data Response & Case Study Types
 * Syllabuses: Economics (9708) & Business (9609)
 */

export type QuestionCategory =
  | "definition"
  | "calculation"
  | "short_answer"
  | "data_interpretation"
  | "essay_evaluative"; // 6+ marks questions requiring Level-based rubric evaluation

export type RubricLevelSpec = {
  level: number;
  marksRange: string;
  label: string;
  description: string;
  evaluativeRequirement?: string;
};

export type DataResponseQuestion = {
  id: string;
  number: string; // e.g. "1(a)(i)", "1(a)(ii)", "1(b)", "1(c)", "1(d)", "1"
  title: string;
  maxMark: number;
  category: QuestionCategory;
  tariff: {
    ao1: number; // Knowledge & Understanding
    ao2: number; // Application (Context to extract)
    ao3: number; // Analysis
    ao4?: number; // Evaluation (used in 9609 Business and A Level rubrics)
  };
  rubricLevels?: RubricLevelSpec[];
  indicativePoints?: string[];
  calculationGuidance?: {
    formula?: string;
    correctAnswer?: string;
    ofrApplies?: boolean;
    markingSteps?: string[];
  };
  markingGuide: string; // Full official MS text
  extractLinkageExpected: boolean; // Must directly use facts, figures, or context from extract
  syllabusTopic?: string;
};

export type DataResponseExtract = {
  title: string;
  paragraphs: string[];
  sources?: string;
  tables?: Array<{
    title?: string;
    headers: string[];
    rows: (string | number)[][];
    notes?: string;
  }>;
};

export type DataResponsePaper = {
  id: string;
  title: string;
  subjectCode: "9708" | "9609" | string;
  subjectTitle: string;
  qualificationLevel: "as" | "a2";
  paperNumber: string; // "22", "42", "21", etc.
  examSeries: string; // "2026_feb_march", "2024_may_june", etc.
  seriesLabel: string; // "February/March 2026"
  totalMarks: number;
  durationMinutes: number;
  extract: DataResponseExtract;
  questions: DataResponseQuestion[];
  isOfficial: boolean;
  createdAt?: string;
  sampleAnswers?: Record<string, string>; // Sub-question number -> exemplar answer for testing
};

export type QuestionEvaluationResult = {
  questionNumber: string;
  questionTitle: string;
  maxMark: number;
  awardedMark: number;
  category: QuestionCategory;
  extractContextCheck: {
    usedContext: boolean;
    contextQuality: "strong" | "adequate" | "limited" | "generic_or_missing";
    feedback: string;
  };
  aoBreakdown: {
    knowledge: { awarded: number; outOf: number; comment?: string };
    application: { awarded: number; outOf: number; comment?: string };
    analysis: { awarded: number; outOf: number; comment?: string };
    evaluation?: { awarded: number; outOf: number; comment?: string };
  };
  rubricLevelAwarded?: {
    level: number;
    label: string;
    marksRange: string;
    evaluativeComment?: string;
  };
  examinerRationale: string;
  evidenceQuotes: string[];
  creditedPoints: string[];
  missingMarkSchemePoints: string[];
  modelAnswerSnippet: string;
  improvementTip: string;
};

export type DataResponseSubmissionResult = {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectCode: string;
  totalMarksAwarded: number;
  maxTotalMarks: number;
  percentage: number;
  overallBand: string;
  examinerExecutiveSummary: string;
  questionResults: Record<string, QuestionEvaluationResult>;
  submittedAt: string;
};
