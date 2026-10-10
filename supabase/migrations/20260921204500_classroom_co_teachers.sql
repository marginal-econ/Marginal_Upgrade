-- Let a class owner invite additional teachers while retaining ownership.

CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS classroom_teachers_classroom_idx
  ON public.classroom_teachers (classroom_id);
CREATE INDEX IF NOT EXISTS classroom_teachers_teacher_idx
  ON public.classroom_teachers (teacher_id);

GRANT SELECT ON public.classroom_teachers TO authenticated;
GRANT ALL ON public.classroom_teachers TO service_role;
ALTER TABLE public.classroom_teachers ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.owns_classroom(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.owns_classroom(_classroom_id UUID, _uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = _classroom_id
      AND (
        teacher_id = _uid
        OR public.has_role(_uid, 'admin')
        OR EXISTS (
          SELECT 1 FROM public.classroom_teachers ct
          WHERE ct.classroom_id = _classroom_id AND ct.teacher_id = _uid
        )
      )
  );
$$;

DROP POLICY IF EXISTS classroom_teachers_select ON public.classroom_teachers;
CREATE POLICY classroom_teachers_select ON public.classroom_teachers FOR SELECT TO authenticated
  USING (public.owns_classroom(classroom_id));
