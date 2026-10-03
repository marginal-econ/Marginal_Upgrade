-- Classroom GCR Upgrade: Co-Teachers, Announcements, Comments, and Assignment Submissions

-- 1. Co-Teachers Table
CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS classroom_teachers_classroom_idx ON public.classroom_teachers(classroom_id);
CREATE INDEX IF NOT EXISTS classroom_teachers_teacher_idx ON public.classroom_teachers(teacher_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_teachers TO authenticated;
GRANT ALL ON public.classroom_teachers TO service_role;
ALTER TABLE public.classroom_teachers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_classroom(_classroom_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = _classroom_id
      AND (
        teacher_id = _user_id
        OR public.has_role(_user_id, 'admin')
        OR EXISTS (
          SELECT 1 FROM public.classroom_teachers ct
          WHERE ct.classroom_id = _classroom_id AND ct.teacher_id = _user_id
        )
      )
  );
$$;

DROP POLICY IF EXISTS classroom_teachers_select ON public.classroom_teachers;
CREATE POLICY classroom_teachers_select ON public.classroom_teachers FOR SELECT TO authenticated
  USING (public.owns_classroom(classroom_id));

-- 2. Announcements Table
CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS public.classroom_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.classroom_announcements(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_parent_check CHECK (
    (announcement_id IS NOT NULL AND assignment_id IS NULL) OR
    (announcement_id IS NULL AND assignment_id IS NOT NULL)
  )
);

-- 4. Submissions Table
CREATE TABLE IF NOT EXISTS public.classroom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  submission_text TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('assigned', 'submitted', 'graded', 'returned')),
  ai_score NUMERIC,
  ai_feedback JSONB,
  teacher_score NUMERIC,
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS classroom_announcements_idx ON public.classroom_announcements(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS classroom_comments_announcement_idx ON public.classroom_comments(announcement_id);
CREATE INDEX IF NOT EXISTS classroom_comments_assignment_idx ON public.classroom_comments(assignment_id);
CREATE INDEX IF NOT EXISTS classroom_submissions_assignment_idx ON public.classroom_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS classroom_submissions_student_idx ON public.classroom_submissions(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_submissions TO authenticated;
GRANT ALL ON public.classroom_announcements, public.classroom_comments, public.classroom_submissions TO service_role;

ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;

-- Announcements RLS
DROP POLICY IF EXISTS classroom_announcements_select ON public.classroom_announcements;
CREATE POLICY classroom_announcements_select ON public.classroom_announcements FOR SELECT TO authenticated
  USING (public.owns_classroom(classroom_id) OR public.is_classroom_member(classroom_id));

DROP POLICY IF EXISTS classroom_announcements_insert ON public.classroom_announcements;
CREATE POLICY classroom_announcements_insert ON public.classroom_announcements FOR INSERT TO authenticated
  WITH CHECK (
    (author_id = auth.uid()) AND
    (public.owns_classroom(classroom_id) OR public.is_classroom_member(classroom_id))
  );

DROP POLICY IF EXISTS classroom_announcements_delete ON public.classroom_announcements;
CREATE POLICY classroom_announcements_delete ON public.classroom_announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.owns_classroom(classroom_id));

-- Comments RLS
DROP POLICY IF EXISTS classroom_comments_select ON public.classroom_comments;
CREATE POLICY classroom_comments_select ON public.classroom_comments FOR SELECT TO authenticated
  USING (
    (announcement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.classroom_announcements a
      WHERE a.id = classroom_comments.announcement_id AND (public.owns_classroom(a.classroom_id) OR public.is_classroom_member(a.classroom_id))
    )) OR
    (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.classroom_assignments ass
      WHERE ass.id = classroom_comments.assignment_id AND (public.owns_classroom(ass.classroom_id) OR public.is_classroom_member(ass.classroom_id))
    ))
  );

DROP POLICY IF EXISTS classroom_comments_insert ON public.classroom_comments;
CREATE POLICY classroom_comments_insert ON public.classroom_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Submissions RLS
DROP POLICY IF EXISTS classroom_submissions_select ON public.classroom_submissions;
CREATE POLICY classroom_submissions_select ON public.classroom_submissions FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classroom_assignments ass
      WHERE ass.id = classroom_submissions.assignment_id AND public.owns_classroom(ass.classroom_id)
    )
  );

DROP POLICY IF EXISTS classroom_submissions_insert ON public.classroom_submissions;
CREATE POLICY classroom_submissions_insert ON public.classroom_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.classroom_assignments ass
    WHERE ass.id = classroom_submissions.assignment_id AND public.owns_classroom(ass.classroom_id)
  ));

DROP POLICY IF EXISTS classroom_submissions_update ON public.classroom_submissions;
-- 5. Classroom Chat Messages Table
CREATE TABLE IF NOT EXISTS public.classroom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classroom_messages_classroom_idx ON public.classroom_messages(classroom_id, created_at ASC);
CREATE INDEX IF NOT EXISTS classroom_messages_user_idx ON public.classroom_messages(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_messages TO authenticated;
GRANT ALL ON public.classroom_messages TO service_role;

ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_messages_select ON public.classroom_messages;
CREATE POLICY classroom_messages_select ON public.classroom_messages FOR SELECT TO authenticated
  USING (public.owns_classroom(classroom_id) OR public.is_classroom_member(classroom_id));

DROP POLICY IF EXISTS classroom_messages_insert ON public.classroom_messages;
CREATE POLICY classroom_messages_insert ON public.classroom_messages FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) AND
    (public.owns_classroom(classroom_id) OR public.is_classroom_member(classroom_id))
  );

DROP POLICY IF EXISTS classroom_messages_delete ON public.classroom_messages;
CREATE POLICY classroom_messages_delete ON public.classroom_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.owns_classroom(classroom_id));

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
