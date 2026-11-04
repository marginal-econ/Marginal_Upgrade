import { z } from "zod";

// ============================================================================
// Core Assessment Objectives & Sub-Labels
// ============================================================================
export type AoTag = "ao1" | "ao2" | "ao3" | "no_credit";

export type AoSubLabel =
  | "definition"
  | "chain_link"
  | "application"
  | "diagram_reference"
  | "evaluative_point"
  | "judgement"
  | "conclusion";

export type AoClassification = {
  tag: AoTag;
  sub?: AoSubLabel | null;
  reason: string;
  isProvisional?: boolean;
};

// ============================================================================
// Issue Taxonomy (Cambridge 9708 Economics & Mechanics)
// ============================================================================
export type MechanicalCategory =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "clarity"
  | "terminology";

export type Ao1Category =
  | "economics_accuracy"
  | "missing_definition"
  | "terminology_precision"
  | "misconception";

export type Ao2Category =
  | "broken_chain"
  | "unsupported_assertion"
  | "no_application"
  | "diagram_missing_or_unreferenced"
  | "wrong_direction"
  | "repetition"
  | "analysis"
  | "application"
  | "reasoning_chain";

export type Ao3Category =
  | "one_sided"
  | "evaluation_without_reason"
  | "no_judgement"
  | "no_conclusion"
  | "conclusion_not_supported"
  | "missing_short_vs_long_run"
  | "missing_depends_on_factor"
  | "evaluation";

export type StructureCategory =
  | "off_question"
  | "command_word_mismatch"
  | "waffle";

export type IssueCategory =
  | MechanicalCategory
  | Ao1Category
  | Ao2Category
  | Ao3Category
  | StructureCategory;

export type IssueSeverity = "low" | "medium" | "high";

export type IssueStatus = "active" | "accepted" | "dismissed";

// ============================================================================
// Anchors & Annotations
// ============================================================================
export type Anchor = {
  from: number;
  to: number;
  textHash: string;
  sentenceId: string;
};

export type IssueV2 = {
  id: string;
  from: number;
  to: number;
  sentenceId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  original: string;
  suggestion?: string;
  insertAfter?: string;
  explanation: string;
  evidence?: string;
  aoImpact?: string;
  isStale?: boolean;
  status: IssueStatus;
  firstSeenAt?: number;
  resolvedAt?: number | null;
};

export type SentenceSpan = {
  id: string; // stable hash + occurrence index
  from: number;
  to: number;
  text: string;
  hash: string;
  paragraphIndex: number;
  sentenceIndex: number;
  isComplete: boolean;
  ao: AoClassification | null;
  issues: IssueV2[];
};

// ============================================================================
// Score & Coaching
// ============================================================================
export type AoBreakdown = {
  ao1: number;
  ao2: number;
  ao3: number;
};

export type NextMove = {
  id: string;
  aoTarget: AoTag;
  title: string;
  detail: string;
  potentialGain: number; // e.g. +1
  paragraphIndex?: number;
};

export type ScoreEstimate = {
  total: number;
  maxMark: number;
  band: string;
  confidence: number;
  aoBreakdown: AoBreakdown;
  nextMoves: NextMove[];
  isProvisional: boolean;
  timestamp: number;
};

// ============================================================================
// Zod Schemas for Client <-> Server Communication
// ============================================================================
export const SentenceInputSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  hash: z.string(),
});
export type SentenceInput = z.infer<typeof SentenceInputSchema>;

export const WindowSentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type WindowSentence = z.infer<typeof WindowSentenceSchema>;

export const CheckInputSchema = z.object({
  docVersion: z.number().int().nonnegative(),
  question: z.string().min(1).max(2000),
  level: z.enum(["as", "a2"]).default("as"),
  maxMark: z.union([z.literal(8), z.literal(12), z.literal(20)]).default(12),
  contextBlock: z.string().default(""),
  sentences: z.array(SentenceInputSchema).max(30),
  window: z.array(WindowSentenceSchema).max(30),
  previousSentenceHashes: z.array(z.string()).optional(),
});
export type CheckInput = z.infer<typeof CheckInputSchema>;

export const IssueSchema = z.object({
  category: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  original: z.string(),
  suggestion: z.string().optional(),
  insertAfter: z.string().optional(),
  explanation: z.string(),
  evidence: z.string().optional(),
  aoImpact: z.string().optional(),
});

export const SentenceCheckResultSchema = z.object({
  docVersion: z.number().int().nonnegative(),
  sentenceId: z.string(),
  sentenceHash: z.string(),
  ao: z
    .object({
      tag: z.enum(["ao1", "ao2", "ao3", "no_credit"]),
      sub: z
        .enum([
          "definition",
          "chain_link",
          "application",
          "diagram_reference",
          "evaluative_point",
          "judgement",
          "conclusion",
        ])
        .nullable()
        .optional(),
      reason: z.string(),
    })
    .nullable(),
  issues: z.array(IssueSchema),
  final: z.boolean().optional(),
});
export type SentenceCheckResult = z.infer<typeof SentenceCheckResultSchema>;

// Session persistence schema extension
export const SavedSessionSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string(),
  topic: z.string().default(""),
  level: z.enum(["as", "a2"]).default("as"),
  maxMark: z.number().int().default(12),
  essayText: z.string(),
  diagramTag: z.string().nullable().optional(),
  issuesHistory: z.array(z.any()).default([]),
  sentenceCache: z.record(z.any()).default({}),
  scoreHistory: z.array(z.any()).default([]),
  docVersion: z.number().int().default(0),
  schemaVersion: z.number().int().default(2),
});
export type SavedSession = z.infer<typeof SavedSessionSchema>;
