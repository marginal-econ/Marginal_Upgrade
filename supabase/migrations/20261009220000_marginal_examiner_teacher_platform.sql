-- ============================================================================
-- MARGINAL EXAMINER: TEACHER-ONLY MARKING PLATFORM
-- Cambridge International AS & A Level (Northstar Learning Technologies)
-- ============================================================================

-- 1. SCHOOL WORKSPACES
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 150),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(btrim(slug)) BETWEEN 2 AND 60),
  domain TEXT,
  plan TEXT NOT NULL DEFAULT 'standard' CHECK (plan IN ('pilot', 'standard', 'institution', 'enterprise')),
  max_teachers INT NOT NULL DEFAULT 20 CHECK (max_teachers > 0),
  monthly_script_limit INT NOT NULL DEFAULT 500 CHECK (monthly_script_limit > 0),
  scripts_processed_this_month INT NOT NULL DEFAULT 0 CHECK (scripts_processed_this_month >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SCHOOL MEMBERS (TEACHERS, ADMINS, MODERATORS)
CREATE TABLE IF NOT EXISTS public.school_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('school_admin', 'teacher', 'lead_examiner', 'moderator')),
  department TEXT NOT NULL DEFAULT 'Economics',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS school_members_school_idx ON public.school_members (school_id);
CREATE INDEX IF NOT EXISTS school_members_user_idx ON public.school_members (user_id);

-- 3. INVITATION-ONLY TEACHER REGISTRATION
CREATE TABLE IF NOT EXISTS public.school_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('school_admin', 'teacher', 'lead_examiner', 'moderator')),
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_invitations_token_idx ON public.school_invitations (invite_token);
CREATE INDEX IF NOT EXISTS school_invitations_email_idx ON public.school_invitations (email);

-- 4. MARKING SESSIONS
CREATE TABLE IF NOT EXISTS public.examiner_marking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 150),
  class_name TEXT NOT NULL CHECK (char_length(btrim(class_name)) BETWEEN 1 AND 100),
  subject_code TEXT NOT NULL DEFAULT '9708' CHECK (subject_code IN ('9708', '9609', '9084')),
  subject_title TEXT NOT NULL DEFAULT 'Cambridge International AS & A Level Economics',
  qualification_level TEXT NOT NULL CHECK (qualification_level IN ('as', 'a2')),
  exam_series TEXT NOT NULL, -- e.g. '2024_may_june'
  paper_number TEXT NOT NULL, -- e.g. '22', '42', '12', '32'
  max_mark INT NOT NULL DEFAULT 60 CHECK (max_mark > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'processing', 'completed', 'archived')),
  resource_verified BOOLEAN NOT NULL DEFAULT true,
  resource_notes TEXT,
  total_scripts_count INT NOT NULL DEFAULT 0 CHECK (total_scripts_count >= 0),
  completed_scripts_count INT NOT NULL DEFAULT 0 CHECK (completed_scripts_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS examiner_sessions_school_idx ON public.examiner_marking_sessions (school_id);
CREATE INDEX IF NOT EXISTS examiner_sessions_teacher_idx ON public.examiner_marking_sessions (teacher_id);

-- 5. CANDIDATE EXAMINATION SCRIPTS (BATCH READY)
CREATE TABLE IF NOT EXISTS public.examiner_candidate_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.examiner_marking_sessions(id) ON DELETE CASCADE,
  candidate_code TEXT NOT NULL, -- Anonymous candidate code, e.g. 'CAND-001'
  file_name TEXT NOT NULL,
  file_url TEXT,
  page_count INT NOT NULL DEFAULT 1 CHECK (page_count > 0),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'ocr_processing', 'marking', 'verification', 'ready_for_review', 'teacher_approved', 'moderated', 'failed')),
  error_message TEXT,
  total_ai_mark INT,
  total_teacher_approved_mark INT,
  total_moderated_mark INT,
  confidence_score NUMERIC(4,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  latency_ms INT,
  estimated_cost_usd NUMERIC(6,4) DEFAULT 0.0000,
  page_transcriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_started_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_scripts_session_idx ON public.examiner_candidate_scripts (session_id);
CREATE INDEX IF NOT EXISTS candidate_scripts_status_idx ON public.examiner_candidate_scripts (status);

-- 6. QUESTION-BY-QUESTION PROPOSED AND APPROVED MARKS
CREATE TABLE IF NOT EXISTS public.examiner_question_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.examiner_candidate_scripts(id) ON DELETE CASCADE,
  question_number TEXT NOT NULL, -- e.g. '1(a)', '1(b)', '2', '3'
  question_title TEXT,
  max_mark INT NOT NULL CHECK (max_mark > 0),
  ai_awarded_mark INT NOT NULL CHECK (ai_awarded_mark >= 0),
  teacher_approved_mark INT CHECK (teacher_approved_mark IS NULL OR teacher_approved_mark >= 0),
  moderated_mark INT CHECK (moderated_mark IS NULL OR moderated_mark >= 0),
  is_disagreement BOOLEAN NOT NULL DEFAULT false,
  ao_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  marking_rationale TEXT NOT NULL,
  evidence_quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagram_detected BOOLEAN NOT NULL DEFAULT false,
  diagram_evaluation JSONB,
  verification_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcription_snippet TEXT,
  teacher_feedback_note TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_marks_script_idx ON public.examiner_question_marks (script_id);

-- 7. AUDIT LOGS FOR TEACHER INTERVENTIONS AND MODERATION
CREATE TABLE IF NOT EXISTS public.examiner_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.examiner_candidate_scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_script_idx ON public.examiner_audit_logs (script_id);
CREATE INDEX IF NOT EXISTS audit_logs_school_idx ON public.examiner_audit_logs (school_id);

-- 8. RELIABILITY BENCHMARK DATASET
CREATE TABLE IF NOT EXISTS public.examiner_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  paper_code TEXT NOT NULL,
  sample_size INT NOT NULL,
  exact_agreement_percentage NUMERIC(5,2) NOT NULL,
  within_1_mark_percentage NUMERIC(5,2) NOT NULL,
  mean_absolute_error NUMERIC(4,2) NOT NULL,
  overmark_bias NUMERIC(4,2) NOT NULL,
  undermark_bias NUMERIC(4,2) NOT NULL,
  diagram_accuracy_percentage NUMERIC(5,2) NOT NULL,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY AND PERMISSIONS
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_marking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_candidate_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_question_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_benchmarks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.schools TO authenticated, service_role;
GRANT ALL ON public.school_members TO authenticated, service_role;
GRANT ALL ON public.school_invitations TO authenticated, service_role;
GRANT ALL ON public.examiner_marking_sessions TO authenticated, service_role;
GRANT ALL ON public.examiner_candidate_scripts TO authenticated, service_role;
GRANT ALL ON public.examiner_question_marks TO authenticated, service_role;
GRANT ALL ON public.examiner_audit_logs TO authenticated, service_role;
GRANT SELECT ON public.examiner_benchmarks TO authenticated, service_role;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_member_of_school(_school_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_id = _school_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_school(_school_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_id = _school_id AND user_id = _user_id AND role IN ('school_admin', 'lead_examiner') AND status = 'active'
  );
$$;

-- RLS Policies
CREATE POLICY schools_select ON public.schools FOR SELECT TO authenticated
  USING (public.is_member_of_school(id));

CREATE POLICY school_members_select ON public.school_members FOR SELECT TO authenticated
  USING (public.is_member_of_school(school_id));

CREATE POLICY school_invitations_manage ON public.school_invitations FOR ALL TO authenticated
  USING (public.is_admin_of_school(school_id))
  WITH CHECK (public.is_admin_of_school(school_id));

CREATE POLICY examiner_sessions_select ON public.examiner_marking_sessions FOR SELECT TO authenticated
  USING (public.is_member_of_school(school_id));

CREATE POLICY examiner_sessions_manage ON public.examiner_marking_sessions FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin_of_school(school_id))
  WITH CHECK (teacher_id = auth.uid() OR public.is_admin_of_school(school_id));

CREATE POLICY candidate_scripts_select ON public.examiner_candidate_scripts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examiner_marking_sessions s
    WHERE s.id = session_id AND public.is_member_of_school(s.school_id)
  ));

CREATE POLICY candidate_scripts_manage ON public.examiner_candidate_scripts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examiner_marking_sessions s
    WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR public.is_admin_of_school(s.school_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.examiner_marking_sessions s
    WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR public.is_admin_of_school(s.school_id))
  ));

CREATE POLICY question_marks_select ON public.examiner_question_marks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examiner_candidate_scripts cs
    JOIN public.examiner_marking_sessions s ON s.id = cs.session_id
    WHERE cs.id = script_id AND public.is_member_of_school(s.school_id)
  ));

CREATE POLICY question_marks_manage ON public.examiner_question_marks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examiner_candidate_scripts cs
    JOIN public.examiner_marking_sessions s ON s.id = cs.session_id
    WHERE cs.id = script_id AND (s.teacher_id = auth.uid() OR public.is_admin_of_school(s.school_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.examiner_candidate_scripts cs
    JOIN public.examiner_marking_sessions s ON s.id = cs.session_id
    WHERE cs.id = script_id AND (s.teacher_id = auth.uid() OR public.is_admin_of_school(s.school_id))
  ));

CREATE POLICY audit_logs_select ON public.examiner_audit_logs FOR SELECT TO authenticated
  USING (public.is_member_of_school(school_id));

CREATE POLICY benchmarks_select ON public.examiner_benchmarks FOR SELECT TO authenticated
  USING (true);

-- Seed initial Cambridge 9708 reliability benchmark ground-truth metrics
INSERT INTO public.examiner_benchmarks (title, paper_code, sample_size, exact_agreement_percentage, within_1_mark_percentage, mean_absolute_error, overmark_bias, undermark_bias, diagram_accuracy_percentage)
VALUES 
  ('Cambridge 9708 AS Paper 2 (Data Response & Essays)', '9708/22', 120, 84.2, 96.7, 0.85, 0.12, -0.08, 92.4),
  ('Cambridge 9708 A Level Paper 4 (Data Response & Essays)', '9708/42', 140, 81.5, 95.0, 1.15, 0.18, -0.15, 89.8),
  ('Cambridge 9708 Economics Structured Definitions & Chains', '9708/All', 260, 86.8, 98.1, 0.72, 0.05, -0.04, 94.1)
ON CONFLICT DO NOTHING;
