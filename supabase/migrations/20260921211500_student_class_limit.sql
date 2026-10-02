-- Students may be enrolled in no more than three active classes.
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(_code TEXT)
RETURNS TABLE (classroom_id UUID, classroom_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  found public.classrooms%ROWTYPE;
  active_class_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before joining a class'; END IF;

  SELECT * INTO found FROM public.classrooms
  WHERE join_code = upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'))
    AND archived = false;
  IF found.id IS NULL THEN RAISE EXCEPTION 'No active class uses that code'; END IF;
  IF found.teacher_id = auth.uid() THEN RAISE EXCEPTION 'You already own this class'; END IF;

  -- Serialise joins for this student so simultaneous requests cannot exceed
  -- the limit.
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  -- Re-entering the code for a class already joined stays harmless.
  IF EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = found.id AND student_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT found.id, found.name;
    RETURN;
  END IF;

  SELECT count(*) INTO active_class_count
  FROM public.classroom_members member
  JOIN public.classrooms classroom ON classroom.id = member.classroom_id
  WHERE member.student_id = auth.uid() AND classroom.archived = false;

  IF active_class_count >= 3 THEN
    RAISE EXCEPTION 'You can join a maximum of 3 classes. Leave a class before joining another.';
  END IF;

  INSERT INTO public.classroom_members (classroom_id, student_id)
  VALUES (found.id, auth.uid());
  RETURN QUERY SELECT found.id, found.name;
END;
$$;

REVOKE ALL ON FUNCTION public.join_classroom_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) TO authenticated;
