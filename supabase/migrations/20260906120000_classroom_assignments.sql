-- Classroom — Phase 3: assignments.
--
-- A teacher assigns a specific essay question or MCQ past paper to one of
-- their classes, with an optional due date. Submission/completion is
-- tracked by adding a nullable assignment_id to the two tables where work
-- already lands (essays, mcq_pdf_attempts) rather than inventing a
-- separate submissions table to keep in sync — a student "completing" an
-- assignment is just them grading an essay / finishing a paper that
-- happens to be linked back to it. This mirrors how mcq_pdf_attempts
-- already carries a nullable paper_id back to the shared library
-- (20260903100000_mcq_paper_library.sql).

CREATE TABLE public.classroom_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('essay', 'mcq_paper')),
  title TEXT NOT NULL,
  instructions TEXT,
  due_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- essay kind only. bank_essay_question_id is set when the teacher picked
  -- a real past-paper question from the approved bank; essay_question is
  -- always populated regardless (copied at assignment time) so the
  -- assignment keeps reading correctly even if the bank row is later
  -- edited or removed.
  bank_essay_question_id UUID REFERENCES public.bank_essay_questions(id) ON DELETE SET NULL,
  essay_question TEXT,
  essay_topic TEXT,
  essay_max_mark INT,

  -- mcq_paper kind only.
  mcq_paper_id UUID REFERENCES public.mcq_pdf_papers(id) ON DELETE SET NULL,

  CONSTRAINT classroom_assignments_kind_fields CHECK (
    (kind = 'essay'
      AND essay_question IS NOT NULL
      AND essay_max_mark IS NOT NULL
      AND mcq_paper_id IS NULL)
    OR
    (kind = 'mcq_paper'
      AND mcq_paper_id IS NOT NULL
      AND essay_question IS NULL
      AND essay_max_mark IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE ON public.classroom_assignments TO authenticated;
GRANT ALL ON public.classroom_assignments TO service_role;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX classroom_assignments_classroom_idx
  ON public.classroom_assignments (classroom_id, created_at DESC);

-- Visible to any member of the class, the owning teacher, or admin — same
-- shape as classrooms_select. Archived assignments stay visible here (the
-- app hides/greys them out); RLS is about who can see the row at all, not
-- about hiding old assignments from the teacher who made them.
CREATE POLICY "classroom_assignments_select" ON public.classroom_assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      WHERE m.classroom_id = classroom_assignments.classroom_id AND m.student_id = auth.uid()
    )
  );

-- Only the owning teacher (or admin) can create, edit, or archive an
-- assignment for a class — a student's own call is rejected at the
-- database, not just hidden in the UI.
CREATE POLICY "classroom_assignments_insert" ON public.classroom_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "classroom_assignments_update" ON public.classroom_assignments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- Submission links. Nullable, additive, no existing behaviour changes —
-- an essay/attempt with no assignment_id is just ordinary independent
-- practice, exactly as before.
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.classroom_assignments(id) ON DELETE SET NULL;

ALTER TABLE public.mcq_pdf_attempts
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.classroom_assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS essays_assignment_idx ON public.essays (assignment_id);
CREATE INDEX IF NOT EXISTS mcq_pdf_attempts_assignment_idx ON public.mcq_pdf_attempts (assignment_id);
