-- Question bank: real past-paper MCQ and essay questions extracted from
-- uploaded QP/MS pairs, kept entirely separate from the AI generators.
-- Purely additive — no existing table's behaviour changes. mcq_attempts and
-- essays keep working exactly as before; a bank paper/question just fills
-- the same shapes those already accept.

-- 1) Real MCQ questions extracted from a past paper + mark scheme.
CREATE TABLE IF NOT EXISTS public.bank_mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('as', 'a2')),
  -- Free-text topic, matching how mcq_attempts.topic already works — the
  -- app has no topic_id foreign key anywhere else in the MCQ/essay flow,
  -- so the bank doesn't invent one either.
  topic TEXT NOT NULL DEFAULT '',
  source_document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  exam_series TEXT,
  stem TEXT NOT NULL,
  options JSONB NOT NULL, -- { "A": "...", "B": "...", "C": "...", "D": "..." }
  answer TEXT NOT NULL CHECK (answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL DEFAULT '',
  distractor_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill TEXT NOT NULL DEFAULT 'knowledge' CHECK (skill IN ('knowledge', 'application', 'analysis')),
  diagram_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_mcq_questions_browse_idx
  ON public.bank_mcq_questions (level, status, topic);

-- 2) Real essay questions extracted from a past paper.
CREATE TABLE IF NOT EXISTS public.bank_essay_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('as', 'a2')),
  topic TEXT NOT NULL DEFAULT '',
  source_document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  exam_series TEXT,
  question_text TEXT NOT NULL,
  max_mark INTEGER NOT NULL DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_essay_questions_browse_idx
  ON public.bank_essay_questions (level, status, topic);

ALTER TABLE public.bank_mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_essay_questions ENABLE ROW LEVEL SECURITY;

-- Staff (teacher/admin) get full read/write, exactly like the knowledge_documents
-- policies already do via is_staff(). Students may only ever SELECT rows that
-- have been approved by a teacher — nothing reaches a student unreviewed.
CREATE POLICY bank_mcq_staff_all ON public.bank_mcq_questions
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY bank_mcq_student_read_approved ON public.bank_mcq_questions
  FOR SELECT USING (status = 'approved');

CREATE POLICY bank_essay_staff_all ON public.bank_essay_questions
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY bank_essay_student_read_approved ON public.bank_essay_questions
  FOR SELECT USING (status = 'approved');

-- 3) Purely additive, nullable/defaulted column: which source a given MCQ
-- paper's questions came from. Nothing existing selects or filters on this
-- today, so every current read/write path is completely unaffected.
ALTER TABLE public.mcq_attempts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'bank'));
