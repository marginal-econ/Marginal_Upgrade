-- Classroom — Phase 1: classes + join codes + roster.
--
-- Only the class/roster structure. Does not touch essays, MCQ attempts, or
-- add a classroom_id anywhere else — Phase 2 (progress dashboard) and
-- Phase 3 (assignments) read those existing tables by user_id joined
-- against classroom_members, so this stands alone and can be tested by
-- itself first.

CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'mixed' CHECK (level IN ('as', 'a2', 'mixed')),
  -- Filled in by the classrooms_set_join_code trigger below, not the app —
  -- an insert never needs to supply one.
  join_code TEXT NOT NULL UNIQUE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.classrooms TO authenticated;
GRANT ALL ON public.classrooms TO service_role;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX classrooms_teacher_idx ON public.classrooms (teacher_id);

CREATE TABLE public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

-- Deliberately no INSERT policy: with RLS enabled and no policy, a plain
-- authenticated insert is rejected. join_classroom_by_code() below is
-- SECURITY DEFINER and bypasses RLS entirely, so it stays the one path
-- that can ever create a membership row.
GRANT SELECT, DELETE ON public.classroom_members TO authenticated;
GRANT ALL ON public.classroom_members TO service_role;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX classroom_members_classroom_idx ON public.classroom_members (classroom_id);
CREATE INDEX classroom_members_student_idx ON public.classroom_members (student_id);

-- RLS: a teacher only sees classes THEY own, not every staff member's
-- classes (narrower than the app's usual is_staff() check). A student sees
-- classes they've joined. Admin sees everything, matching the rest of the
-- app.
CREATE POLICY "classrooms_select" ON public.classrooms FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      WHERE m.classroom_id = classrooms.id AND m.student_id = auth.uid()
    )
  );

-- Only a teacher/admin can create a class, and only ever as themselves —
-- a student's own call is rejected here, at the database, not just hidden
-- in the UI.
CREATE POLICY "classrooms_insert" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND public.is_staff(auth.uid())
  );

CREATE POLICY "classrooms_update" ON public.classrooms FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- A student sees their own membership row; the owning teacher sees every
-- member of their class; admin sees everything.
CREATE POLICY "classroom_members_select" ON public.classroom_members FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- A student can remove themselves (leave); the owning teacher can remove
-- any member; admin can remove anyone. Same policy covers both — the app
-- doesn't need to distinguish "remove" from "leave", the caller's identity
-- does.
CREATE POLICY "classroom_members_delete" ON public.classroom_members FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- One round trip for a class's roster. security_invoker is NOT optional
-- here — without it the view runs as its owner (which bypasses RLS) and
-- would leak every classroom's full roster to any authenticated user.
-- With it, the caller's own RLS on classroom_members/profiles applies
-- exactly as if they'd queried those tables directly.
CREATE VIEW public.classroom_roster WITH (security_invoker = true) AS
SELECT
  m.id,
  m.classroom_id,
  m.student_id,
  p.full_name,
  p.school,
  m.joined_at
FROM public.classroom_members m
JOIN public.profiles p ON p.id = m.student_id;

GRANT SELECT ON public.classroom_roster TO authenticated;

-- 6-char codes from an alphabet with 0/O/1/I/L excluded, since it's read
-- off a screen and typed back in. Callable directly (regenerateJoinCode
-- asks Postgres for a fresh code this way, rather than duplicating the
-- random-code logic in TypeScript), and also used by the insert trigger.
CREATE OR REPLACE FUNCTION public.generate_classroom_join_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  taken BOOLEAN;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.classrooms WHERE join_code = candidate
    ) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_classroom_join_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_classroom_join_code() TO authenticated;

-- Only auto-generates a code on INSERT when none is supplied. An UPDATE
-- with an empty string does NOT re-trigger this — regenerateJoinCode asks
-- generate_classroom_join_code() directly instead, so the app never needs
-- to fight the trigger to rotate a code.
CREATE OR REPLACE FUNCTION public.classrooms_set_join_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := public.generate_classroom_join_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER classrooms_join_code BEFORE INSERT ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.classrooms_set_join_code();

-- The only path that creates a membership row. SECURITY DEFINER on
-- purpose: a student needs to resolve a code to a classroom, but there's
-- no SELECT policy that lets an authenticated user browse all classrooms
-- by code — that would leak every class's name to anyone signed in. This
-- function does the lookup itself and inserts the membership, so no such
-- policy is ever needed. Joining twice is a harmless no-op, not an error.
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(_code TEXT)
RETURNS TABLE (classroom_id UUID, classroom_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _classroom RECORD;
BEGIN
  SELECT c.id, c.name INTO _classroom
  FROM public.classrooms c
  WHERE upper(c.join_code) = upper(_code) AND c.archived = false;

  IF _classroom.id IS NULL THEN
    RAISE EXCEPTION 'No classroom found with that code';
  END IF;

  INSERT INTO public.classroom_members (classroom_id, student_id)
  VALUES (_classroom.id, auth.uid())
  ON CONFLICT (classroom_id, student_id) DO NOTHING;

  RETURN QUERY SELECT _classroom.id, _classroom.name;
END;
$$;

REVOKE ALL ON FUNCTION public.join_classroom_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) TO authenticated;
