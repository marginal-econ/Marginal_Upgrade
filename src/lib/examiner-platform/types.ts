export type SchoolRole = "school_admin" | "teacher" | "lead_examiner" | "moderator";

export type School = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: "pilot" | "standard" | "institution" | "enterprise";
  max_teachers: number;
  monthly_script_limit: number;
  scripts_processed_this_month: number;
  created_at: string;
};

export type SchoolMember = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolRole;
  department: string;
  status: "active" | "invited" | "suspended";
  invited_by: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
};

export type MarkingSessionStatus = "draft" | "active" | "processing" | "completed" | "archived";

export type MarkingSession = {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  class_name: string;
  subject_code: string; // '9708'
  subject_title: string;
  qualification_level: "as" | "a2";
  exam_series: string; // '2024_may_june'
  paper_number: string; // '22', '42'
  max_mark: number;
  status: MarkingSessionStatus;
  resource_verified: boolean;
  resource_notes: string | null;
  total_scripts_count: number;
  completed_scripts_count: number;
  created_at: string;
  updated_at: string;
};

export type ScriptStatus =
  | "queued"
  | "ocr_processing"
  | "marking"
  | "verification"
  | "ready_for_review"
  | "teacher_approved"
  | "moderated"
  | "failed";

export type CandidateScript = {
  id: string;
  session_id: string;
  candidate_code: string; // 'CAND-001'
  file_name: string;
  file_url: string | null;
  page_count: number;
  status: ScriptStatus;
  error_message: string | null;
  total_ai_mark: number | null;
  total_teacher_approved_mark: number | null;
  total_moderated_mark: number | null;
  confidence_score: number | null;
  latency_ms: number | null;
  estimated_cost_usd: number;
  page_transcriptions: ScriptPageTranscription[];
  review_started_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  questions?: QuestionMarkRecord[];
};

export type ScriptPageTranscription = {
  page_number: number;
  image_url?: string;
  raw_text: string;
  detected_questions: string[];
  diagram_tags: string[];
  uncertain_words: string[];
  has_cross_outs: boolean;
  confidence: number;
};

export type AoBreakdown = {
  knowledge: { awarded: number; out_of: number; comment?: string };
  analysis: { awarded: number; out_of: number; comment?: string };
  evaluation: { awarded: number; out_of: number; comment?: string };
};

export type DiagramEvaluation = {
  detected: boolean;
  name?: string;
  axes_labelled_correctly: boolean;
  curves_drawn_correctly: boolean;
  shift_direction_correct: boolean;
  equilibrium_labelled: boolean;
  examiner_comment: string;
  marks_awarded_for_diagram: number;
};

export type VerificationFlag = {
  id: string;
  severity: "info" | "warning" | "caution";
  category: "mark_cap" | "handwriting_ambiguity" | "diagram_check" | "evidence_gap" | "contradiction";
  message: string;
};

export type QuestionMarkRecord = {
  id: string;
  script_id: string;
  question_number: string; // '1(a)', '1(b)', '2'
  question_title?: string;
  max_mark: number;
  ai_awarded_mark: number;
  teacher_approved_mark: number | null;
  moderated_mark: number | null;
  is_disagreement: boolean;
  ao_breakdown: AoBreakdown;
  marking_rationale: string;
  evidence_quotes: string[];
  missing_elements: string[];
  diagram_detected: boolean;
  diagram_evaluation?: DiagramEvaluation | null;
  verification_flags: VerificationFlag[];
  transcription_snippet: string;
  teacher_feedback_note: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type ExaminerAuditLog = {
  id: string;
  school_id: string;
  script_id: string | null;
  user_id: string;
  action: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  rationale: string | null;
  created_at: string;
  user_email?: string;
};

export type ReliabilityBenchmark = {
  id: string;
  title: string;
  paper_code: string;
  sample_size: number;
  exact_agreement_percentage: number;
  within_1_mark_percentage: number;
  mean_absolute_error: number;
  overmark_bias: number;
  undermark_bias: number;
  diagram_accuracy_percentage: number;
  tested_at: string;
};
