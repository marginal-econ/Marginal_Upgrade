-- Restore teacher workspaces with classroom join codes and a private roster.

CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  level TEXT NOT NULL DEFAULT 'mixed' CHECK (level IN ('as', 'a2', 'mixed')),
  join_code TEXT NOT NULL UNIQUE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS classrooms_teacher_idx ON public.classrooms (teacher_id);
CREATE INDEX IF NOT EXISTS classroom_members_classroom_idx ON public.classroom_members (classroom_id);
CREATE INDEX IF NOT EXISTS classroom_members_student_idx ON public.classroom_members (student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO authenticated;
GRANT SELECT, DELETE ON public.classroom_members TO authenticated;
GRANT ALL ON public.classrooms, public.classroom_members TO service_role;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('teacher', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_classroom(_classroom_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = _classroom_id
      AND (teacher_id = _user_id OR public.has_role(_user_id, 'admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_member(_classroom_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = _classroom_id AND student_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.owns_classroom(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_classroom_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_classroom(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS classrooms_select ON public.classrooms;
DROP POLICY IF EXISTS classrooms_insert ON public.classrooms;
DROP POLICY IF EXISTS classrooms_update ON public.classrooms;
DROP POLICY IF EXISTS classrooms_delete ON public.classrooms;
CREATE POLICY classrooms_select ON public.classrooms FOR SELECT TO authenticated
  USING (public.owns_classroom(id) OR public.is_classroom_member(id));
CREATE POLICY classrooms_insert ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.is_staff(auth.uid()));
CREATE POLICY classrooms_update ON public.classrooms FOR UPDATE TO authenticated
  USING (public.owns_classroom(id)) WITH CHECK (public.owns_classroom(id));
CREATE POLICY classrooms_delete ON public.classrooms FOR DELETE TO authenticated
  USING (public.owns_classroom(id));

DROP POLICY IF EXISTS classroom_members_select ON public.classroom_members;
DROP POLICY IF EXISTS classroom_members_delete ON public.classroom_members;
CREATE POLICY classroom_members_select ON public.classroom_members FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.owns_classroom(classroom_id));
CREATE POLICY classroom_members_delete ON public.classroom_members FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR public.owns_classroom(classroom_id));

CREATE OR REPLACE FUNCTION public.generate_classroom_join_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate TEXT;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classrooms WHERE join_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.classrooms_set_join_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.join_code IS NULL OR btrim(NEW.join_code) = '' THEN
    NEW.join_code := public.generate_classroom_join_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classrooms_join_code ON public.classrooms;
CREATE TRIGGER classrooms_join_code BEFORE INSERT ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.classrooms_set_join_code();

CREATE OR REPLACE FUNCTION public.join_classroom_by_code(_code TEXT)
RETURNS TABLE (classroom_id UUID, classroom_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  found public.classrooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before joining a class'; END IF;
  SELECT * INTO found FROM public.classrooms
  WHERE join_code = upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'))
    AND archived = false;
  IF found.id IS NULL THEN RAISE EXCEPTION 'No active class uses that code'; END IF;
  IF found.teacher_id = auth.uid() THEN RAISE EXCEPTION 'You already own this class'; END IF;

  INSERT INTO public.classroom_members (classroom_id, student_id)
  VALUES (found.id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT found.id, found.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_classroom_join_code(_classroom_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code TEXT;
BEGIN
  IF NOT public.owns_classroom(_classroom_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  new_code := public.generate_classroom_join_code();
  UPDATE public.classrooms SET join_code = new_code WHERE id = _classroom_id;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_classroom_roster(_classroom_id UUID)
RETURNS TABLE (
  membership_id UUID,
  student_id UUID,
  full_name TEXT,
  email TEXT,
  school TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.owns_classroom(_classroom_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
    SELECT m.id, m.student_id, p.full_name, u.email::TEXT, p.school, m.joined_at
    FROM public.classroom_members m
    JOIN auth.users u ON u.id = m.student_id
    LEFT JOIN public.profiles p ON p.id = m.student_id
    WHERE m.classroom_id = _classroom_id
    ORDER BY m.joined_at;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_classroom_join_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classrooms_set_join_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_classroom_by_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_classroom_join_code(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_classroom_roster(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_classroom_join_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classroom_roster(UUID) TO authenticated;
