-- ==============================================================================
-- MARGINAL PRODUCTION DATABASE REPAIR — COMPLETE DDL & CORE SEED MIGRATION
-- Target Database: https://tmuhpnorjydfijjotvoc.supabase.co
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tmuhpnorjydfijjotvoc/sql
-- ==============================================================================

-- 1. BASE ESSAYS & VERSIONS TABLES
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  max_mark INT NOT NULL DEFAULT 12,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  latest_mark INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.essays TO authenticated, service_role, anon;
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "essays_own" ON public.essays;
CREATE POLICY "essays_own" ON public.essays FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "essays_read_staff" ON public.essays;
CREATE POLICY "essays_read_staff" ON public.essays FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS essays_touch ON public.essays;
CREATE TRIGGER essays_touch BEFORE UPDATE ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. ESSAY VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.essay_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  essay_text TEXT NOT NULL,
  grading JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_mark INT,
  ao1_awarded INT,
  ao2_awarded INT,
  ao3_awarded INT,
  confidence NUMERIC,
  audited BOOLEAN NOT NULL DEFAULT false,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  showcased BOOLEAN NOT NULL DEFAULT false,
  showcased_at TIMESTAMPTZ,
  showcase_consented BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (essay_id, version)
);
GRANT ALL ON public.essay_versions TO authenticated, service_role, anon;
ALTER TABLE public.essay_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ev_own" ON public.essay_versions;
CREATE POLICY "ev_own" ON public.essay_versions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "ev_read_staff" ON public.essay_versions;
CREATE POLICY "ev_read_staff" ON public.essay_versions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS ev_essay_idx ON public.essay_versions(essay_id);
CREATE INDEX IF NOT EXISTS ev_user_idx ON public.essay_versions(user_id);

-- 3. CALIBRATION ANCHORS (STANDARD BENCHMARKS)
CREATE TABLE IF NOT EXISTS public.calibration_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  essay_text TEXT NOT NULL,
  mark INT NOT NULL,
  max_mark INT NOT NULL DEFAULT 12,
  band_label TEXT NOT NULL DEFAULT 'top',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.calibration_anchors TO authenticated, service_role, anon;
ALTER TABLE public.calibration_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anchors_read_staff" ON public.calibration_anchors;
CREATE POLICY "anchors_read_staff" ON public.calibration_anchors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "anchors_write_staff" ON public.calibration_anchors;
CREATE POLICY "anchors_write_staff" ON public.calibration_anchors FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 4. SHOWCASE AUTO-POPULATION & INITIALS HELPER
CREATE OR REPLACE FUNCTION public.essay_showcase_threshold(_max_mark INT)
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE WHEN _max_mark <= 8 THEN _max_mark ELSE CEIL(_max_mark * 0.9)::INT END;
$$;

CREATE OR REPLACE FUNCTION public.set_essay_showcase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _max_mark INT;
BEGIN
  SELECT max_mark INTO _max_mark FROM public.essays WHERE id = NEW.essay_id;

  IF NEW.total_mark IS NOT NULL AND _max_mark IS NOT NULL
     AND NEW.total_mark >= public.essay_showcase_threshold(_max_mark) THEN
    NEW.showcased := true;
    NEW.showcased_at := COALESCE(NEW.showcased_at, now());
    NEW.showcase_consented := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ev_showcase ON public.essay_versions;
CREATE TRIGGER ev_showcase BEFORE INSERT OR UPDATE OF total_mark ON public.essay_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_essay_showcase();

CREATE OR REPLACE FUNCTION public.name_initials(_full_name TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN _full_name IS NULL OR btrim(_full_name) = '' THEN 'Anonymous'
    ELSE (
      SELECT string_agg(upper(left(part, 1)), '.' ORDER BY ord) || '.'
      FROM unnest(string_to_array(btrim(_full_name), ' ')) WITH ORDINALITY AS t(part, ord)
      WHERE part <> '' AND (ord = 1 OR ord = array_length(string_to_array(btrim(_full_name), ' '), 1))
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_showcase_essays(
  _limit INT DEFAULT 60,
  _topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  essay_id UUID,
  version_id UUID,
  question TEXT,
  max_mark INT,
  total_mark INT,
  ao1_awarded INT,
  ao2_awarded INT,
  ao3_awarded INT,
  essay_text TEXT,
  grading JSONB,
  topic_id UUID,
  topic_name TEXT,
  author_initials TEXT,
  showcased_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id,
    v.id,
    e.question,
    e.max_mark,
    v.total_mark,
    v.ao1_awarded,
    v.ao2_awarded,
    v.ao3_awarded,
    v.essay_text,
    v.grading,
    e.topic_id,
    t.name,
    public.name_initials(p.full_name),
    v.showcased_at
  FROM public.essay_versions v
  JOIN public.essays e ON e.id = v.essay_id
  LEFT JOIN public.topics t ON t.id = e.topic_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE v.showcased = true
    AND (_topic_id IS NULL OR e.topic_id = _topic_id)
  ORDER BY v.showcased_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;
GRANT EXECUTE ON FUNCTION public.list_showcase_essays(INT, UUID) TO authenticated, anon, service_role;

CREATE OR REPLACE VIEW public.showcase_essays AS
  SELECT
    e.id AS essay_id,
    v.id AS version_id,
    e.question,
    e.max_mark,
    v.total_mark,
    v.ao1_awarded,
    v.ao2_awarded,
    v.ao3_awarded,
    v.essay_text,
    v.grading,
    e.topic_id,
    v.showcased_at,
    e.user_id
  FROM public.essay_versions v
  JOIN public.essays e ON e.id = v.essay_id
  WHERE v.showcased = true;
GRANT SELECT ON public.showcase_essays TO authenticated, service_role, anon;

-- 5. CLASSROOMS & COHORTS SYSTEM
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'mixed' CHECK (level IN ('as', 'a2', 'mixed')),
  join_code TEXT NOT NULL UNIQUE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.classrooms TO authenticated, service_role, anon;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS classrooms_teacher_idx ON public.classrooms (teacher_id);

DROP POLICY IF EXISTS "classrooms_select" ON public.classrooms;
CREATE POLICY "classrooms_select" ON public.classrooms FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      WHERE m.classroom_id = classrooms.id AND m.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classrooms_insert" ON public.classrooms;
CREATE POLICY "classrooms_insert" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND public.is_staff(auth.uid())
  );

DROP POLICY IF EXISTS "classrooms_update" ON public.classrooms;
CREATE POLICY "classrooms_update" ON public.classrooms FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Classroom Members
CREATE TABLE IF NOT EXISTS public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);
GRANT ALL ON public.classroom_members TO authenticated, service_role, anon;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS classroom_members_classroom_idx ON public.classroom_members (classroom_id);
CREATE INDEX IF NOT EXISTS classroom_members_student_idx ON public.classroom_members (student_id);

DROP POLICY IF EXISTS "classroom_members_select" ON public.classroom_members;
CREATE POLICY "classroom_members_select" ON public.classroom_members FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classroom_members_delete" ON public.classroom_members;
CREATE POLICY "classroom_members_delete" ON public.classroom_members FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- Classroom Teachers (Co-teachers)
CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, teacher_id)
);
GRANT ALL ON public.classroom_teachers TO authenticated, service_role, anon;
ALTER TABLE public.classroom_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classroom_teachers_select" ON public.classroom_teachers;
CREATE POLICY "classroom_teachers_select" ON public.classroom_teachers FOR SELECT TO authenticated
  USING (true);

-- Classroom Assignments
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('essay', 'mcq_paper')),
  title TEXT NOT NULL,
  instructions TEXT,
  due_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bank_essay_question_id UUID,
  essay_question TEXT,
  essay_topic TEXT,
  essay_max_mark INT,
  mcq_paper_id UUID REFERENCES public.mcq_pdf_papers(id) ON DELETE SET NULL
);
GRANT ALL ON public.classroom_assignments TO authenticated, service_role, anon;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS classroom_assignments_classroom_idx ON public.classroom_assignments (classroom_id, created_at DESC);

DROP POLICY IF EXISTS "classroom_assignments_select" ON public.classroom_assignments;
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

DROP POLICY IF EXISTS "classroom_assignments_insert" ON public.classroom_assignments;
CREATE POLICY "classroom_assignments_insert" ON public.classroom_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classroom_assignments_update" ON public.classroom_assignments;
CREATE POLICY "classroom_assignments_update" ON public.classroom_assignments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- Classroom Submissions (Student Homework & Teacher Feedback)
CREATE TABLE IF NOT EXISTS public.classroom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  submission_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  ai_score INT,
  ai_feedback JSONB,
  teacher_score INT,
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);
GRANT ALL ON public.classroom_submissions TO authenticated, service_role, anon;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classroom_submissions_all" ON public.classroom_submissions;
CREATE POLICY "classroom_submissions_all" ON public.classroom_submissions FOR ALL TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classroom_assignments a
      JOIN public.classrooms c ON c.id = a.classroom_id
      WHERE a.id = classroom_submissions.assignment_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.classroom_assignments a
      JOIN public.classrooms c ON c.id = a.classroom_id
      WHERE a.id = classroom_submissions.assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- Classroom Announcements, Comments, Messages
CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.classroom_announcements TO authenticated, service_role, anon;
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_announcements_select" ON public.classroom_announcements FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "classroom_announcements_staff_write" ON public.classroom_announcements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.classroom_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.classroom_comments TO authenticated, service_role, anon;
ALTER TABLE public.classroom_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_comments_select" ON public.classroom_comments FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "classroom_comments_write" ON public.classroom_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.classroom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.classroom_messages TO authenticated, service_role, anon;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_messages_select" ON public.classroom_messages FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "classroom_messages_write" ON public.classroom_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. LIVE EXAMINER SESSIONS & USAGE LOG
CREATE TABLE IF NOT EXISTS public.live_examiner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  max_mark INT NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.live_examiner_sessions TO authenticated, service_role, anon;
ALTER TABLE public.live_examiner_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_examiner_sessions_own" ON public.live_examiner_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT,
  completion_tokens INT,
  latency_ms INT,
  ok BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_usage_log TO authenticated, service_role, anon;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_log_read" ON public.ai_usage_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 7. SEED REAL CALIBRATION ANCHORS (VERIFIED REAL STUDENT RESPONSES)
INSERT INTO public.calibration_anchors (id, question, essay_text, mark, max_mark, band_label, notes, active)
VALUES 
(
  'ff1551e4-40ff-4a71-847e-cd761bc9b267',
  'Assess whether governments should always support the provision of merit goods in markets such as those for education or health care.',
  'Government can give support to merit goods like healthcare through subsidies and direct provisions. Merit goods are goods with significant positive externality that is usually underfocused in an economy.

The government may need to support provision because of information failure. As consumers may not know the benefits of the merit goods, the demand in the market becomes very less, signaling and disincentivising producers to produce these goods. This means that public welfare may be affected so the government may use consumer side subsidies and grants to increase consumption.

But, this may not be true in the long run. As provision may be expensive and providing them in the long run can cause a budget deficit for the government. Therefore, consumption of these goods may not increase in the long run due to opportunity cost of government spending, leading to less social welfare. Also government failure, such as what public choice theory states can lead to ineffective bureaucracy and loss in welfare.

The government may use support provision to ensure that producers are not impacted. When merit goods are not demanded in the market because MSB>MPB, producers may not be able to make enough revenue. Thai may lead to unemployment and low wages, causing the government to intervene using subsidies to ensure that suppliers can make a profit, and these markets remain stable to increase social welfare For example, the government may support teachers to both increase literacy of citizens but to also ensure teachers’ welfare. 

However, the subsidies and grants may not be enough. Though subsidies can be beneficial, incidence of subsidies matters. If demand is inelastic for merit goods like education is in developed economies, incidence of subsidies causes subsidies to benefit firms more. 

(Diagram A subsidy shifts the supply curve to the right from S to S₁, reducing the market price from P to P₁ and increasing output from Q to Q₁. The incidence of the subsidy depends on the price elasticity of demand (PED). When demand is relatively inelastic, consumers are less responsive to the fall in price, so the price decreases by only a small amount. Consequently, producers retain a larger proportion of the subsidy as higher revenue per unit, while consumers receive a smaller benefit through lower prices. In contrast, when demand is relatively elastic, consumers respond more strongly to lower prices, causing a larger fall in the market price. As a result, consumers receive a greater share of the subsidy in the form of lower prices, while producers receive a smaller share. Therefore, the side of the market that is less price elastic captures a greater proportion of the subsidy, as it is less responsive to changes in price. )

Finally, the government may need to use intervention to ensure that merit goods like education and healthcare remain affordable. In cases of well developed economies, as information is widespread, merit goods may be high in price due to high demand. Therefore the government may need to provide financial grants to healthcare and education sectors to ensure that the goods are provided for all.

But, this may not be true if PES is very elastic. If PES is very elastic this means that supply can quickly be increased. With new capital in both healthcare and education systems, through AI and robotics, PES of these products becomes more and more elastic. That means more firms can easily enter the market and use economies of scale to increase profit and provision for all. In this case subsidies are not always required.

In conclusion, the government may need to use provisions for merit goods to ensure social welfare of both producers and consumers.It may not always be sustainable in the long run to give subsidies, as inefficiency may rise due to poor management of some firms. Though government intervention through subsidies is still a dynamic way to increase welfare and growth, it is not always required.',
  10,
  12,
  'top',
  'Good Coverage Of all topics (Level 4 Standard)',
  true
),
(
  '72876d25-5c4e-4d98-b0ae-b4eb4a988b81',
  'Assess whether the consequences of technological unemployment are likely to be more serious than those of cyclical unemployment.',
  'Technological unemployment is when workers are replaced by capital machinery. Cyclical unemployment is when worker lose jobs during periods of recessions. workers willing, eligible and able to work who cannot find jobs are classified as unemployed.

Technological unemployment may be more serious because of the degree of unemployment it creates. when capital replaces worker, large number of workers are let off at the same time. This not only leads to lower income and living standards for households, but also results in more tax burden on the government to provide unemployment benefits. A great example of this is the current AI boom, which has led to significant structural unemployment.

But, technological unemployment might be better than cyclical employment because of it''s solution. Technological unemployment can be solved using education and training, which improves the skill and mobility of workers. This can eventually ease technological unemployment. But, during sustained period of recession, solving unemployment is harder due to less revenue from production and less money to train or increase labour productivity, Moreover, technological unemployment may be more serious due to the duration. Recession may come to an end, but long term technological unemployment occurs because worker need to spend time to learn new skills and find new jobs.

But, technological unemployment may be necessary. As per theory of creative destruction, technology replacing humans is necessary to increase long run productive capacity. It may help increase long run economic growth, which can eventually lead to more jobs, but not always.

Finally, technological unemployment might not be as serious as cyclical due to cyclical unemployment being more difficult to ease. Technological unemployment means that workers are let off. But, it also means that more production and economic growth is occurring. This means production and revenue of firms are high, leading to more tax revenue for the government. This means government can spend more on workers. But, during recession, production rates are also low, so spending by government on welfare payment is more difficult.

But, this depends on the duration of recession. If it is a small duration, an economy can quickly recover and unemployment rather will decrease quickly.

In conclusion, technological unemployment is worse when it is widespread and requiring intensive government intervention. Though recession can cause cyclical unemployment, it may not lead to widespread unemployment.',
  8,
  12,
  'middle',
  'Middle Band (Level 3 Standard) — Evaluation requires stronger connection with cyclical duration',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 8. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
