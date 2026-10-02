-- Classrooms: allow the owning teacher (or admin) to permanently delete a
-- class, not just archive it. Renaming already worked through the existing
-- classrooms_update policy (it only checks ownership, not which columns
-- change), so no policy change is needed for that — just the app-level
-- renameClassroom endpoint added alongside this migration.
--
-- Deleting a classroom cascades to classroom_members and
-- classroom_assignments (both already ON DELETE CASCADE), so the roster and
-- any assignments disappear with it. It does NOT touch essays or MCQ
-- attempts — those belong to the student, not the class.

GRANT DELETE ON public.classrooms TO authenticated;

CREATE POLICY "classrooms_delete" ON public.classrooms FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
