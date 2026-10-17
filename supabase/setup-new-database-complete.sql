-- ==============================================================================
-- MARGINAL ECONOMICS — COMPLETE CONSOLIDATED PRODUCTION DATABASE SCHEMA
-- Target Database: https://tmuhpnorjydfijjotvoc.supabase.co
-- Run this in your Supabase SQL Editor (1 single run).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. CUSTOM TYPES & ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.doc_type AS ENUM (
    'coursebook', 'syllabus', 'mark_scheme', 'past_paper', 'mcq_calibration',
    'examiner_report', 'notes', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ingest_status AS ENUM ('pending', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 4. PROFILES & USER ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  school TEXT,
  tutorial_completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO authenticated, service_role, anon;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT ALL ON public.user_roles TO authenticated, service_role, anon;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('teacher', 'admin')
  );
$$;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. SUBJECTS, UNITS & TOPICS
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'AS/A Level',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.subjects TO authenticated, service_role, anon;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_read" ON public.subjects;
CREATE POLICY "subjects_read" ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  paper TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, code)
);
GRANT ALL ON public.units TO authenticated, service_role, anon;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_read" ON public.units;
CREATE POLICY "units_read" ON public.units FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  syllabus_ref TEXT,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
  difficulty INT NOT NULL DEFAULT 2,
  is_extension BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.topics TO authenticated, service_role, anon;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topics_read" ON public.topics;
CREATE POLICY "topics_read" ON public.topics FOR SELECT TO authenticated USING (true);

-- 6. KNOWLEDGE BASE & 2048-DIM VECTOR CHUNKS
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  doc_type public.doc_type NOT NULL DEFAULT 'other',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  source_name TEXT,
  storage_path TEXT,
  exam_series TEXT,
  version TEXT DEFAULT '9708_current',
  content_hash TEXT,
  char_count INT,
  chunk_count INT DEFAULT 0,
  status public.ingest_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.knowledge_documents TO authenticated, service_role, anon;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_documents_read" ON public.knowledge_documents;
CREATE POLICY "knowledge_documents_read" ON public.knowledge_documents FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  heading TEXT,
  token_estimate INT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  embedding vector(2048),
  model_version TEXT DEFAULT 'google/gemini-embedding-2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.document_chunks TO authenticated, service_role, anon;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_chunks_read" ON public.document_chunks;
CREATE POLICY "document_chunks_read" ON public.document_chunks FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS dc_embedding_idx ON public.document_chunks
  USING hnsw ((embedding::halfvec(2048)) halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(2048),
  match_count INT DEFAULT 8,
  filter_doc_types public.doc_type[] DEFAULT NULL,
  filter_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  doc_type public.doc_type,
  heading TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    c.id, d.id, d.title, d.doc_type, c.heading, c.content,
    1 - (c.embedding::halfvec(2048) <=> query_embedding::halfvec(2048))
  FROM public.document_chunks c
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.status = 'ready'
    AND (filter_doc_types IS NULL OR d.doc_type = ANY(filter_doc_types))
    AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id OR d.topic_id = filter_topic_id)
  ORDER BY c.embedding::halfvec(2048) <=> query_embedding::halfvec(2048)
  LIMIT match_count;
$$;

-- 7. CAMBRIDGE DEFINITIONS
CREATE TABLE IF NOT EXISTS public.definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  definition_text TEXT NOT NULL,
  source_document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  source_chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  extraction_model TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_label TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT
);
GRANT ALL ON public.definitions TO authenticated, service_role, anon;
ALTER TABLE public.definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "definitions_read" ON public.definitions;
CREATE POLICY "definitions_read" ON public.definitions FOR SELECT TO authenticated USING (true);

-- 8. MCQ PAST PAPERS & ATTEMPTS
CREATE TABLE IF NOT EXISTS public.mcq_pdf_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('as', 'a2')),
  question_count INT NOT NULL,
  qp_path TEXT,
  qp_url TEXT NOT NULL,
  ms_path TEXT,
  ms_url TEXT,
  answer_key JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overlay JSONB,
  exam_year INT,
  exam_series TEXT
);
GRANT ALL ON public.mcq_pdf_papers TO authenticated, service_role, anon;
ALTER TABLE public.mcq_pdf_papers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mcq_pdf_papers_read" ON public.mcq_pdf_papers;
CREATE POLICY "mcq_pdf_papers_read" ON public.mcq_pdf_papers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.mcq_pdf_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.mcq_pdf_papers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('as', 'a2')),
  score INT,
  total INT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.mcq_pdf_attempts TO authenticated, service_role, anon;
ALTER TABLE public.mcq_pdf_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mcq_pdf_attempts_read" ON public.mcq_pdf_attempts;
CREATE POLICY "mcq_pdf_attempts_read" ON public.mcq_pdf_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 9. AI PROVIDER KEYS (BYOK)
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  label TEXT,
  api_key TEXT NOT NULL,
  base_url TEXT,
  model TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purpose TEXT
);
GRANT ALL ON public.ai_provider_keys TO authenticated, service_role;
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_provider_keys_staff_only" ON public.ai_provider_keys;
CREATE POLICY "ai_provider_keys_staff_only" ON public.ai_provider_keys FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 10. PUBLIC WAITLIST
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  referral_code TEXT,
  referred_by UUID REFERENCES public.waitlist(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  city TEXT,
  country TEXT
);
GRANT ALL ON public.waitlist TO authenticated, service_role, anon;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_anon_insert" ON public.waitlist;
CREATE POLICY "waitlist_anon_insert" ON public.waitlist FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "waitlist_staff_all" ON public.waitlist;
CREATE POLICY "waitlist_staff_all" ON public.waitlist FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 11. USER SUBSCRIPTIONS & ESSAY SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_subscriptions TO authenticated, service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_subscriptions_read" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_read" ON public.user_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.essay_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  essay_text TEXT NOT NULL,
  max_marks INT NOT NULL DEFAULT 20,
  awarded_marks INT,
  band TEXT,
  grading_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.essay_submissions TO authenticated, service_role;
ALTER TABLE public.essay_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "essay_submissions_read" ON public.essay_submissions;
CREATE POLICY "essay_submissions_read" ON public.essay_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- 12. STORAGE BUCKETS (If storage schema is accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('mcq-papers', 'mcq-papers', true),
  ('handwriting', 'handwriting', true),
  ('diagram-crops', 'diagram-crops', true),
  ('examiner-papers', 'examiner-papers', true)
ON CONFLICT (id) DO NOTHING;
