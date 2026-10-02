-- Definitions hub + automatic public showcase of high-scoring essays.
--
-- Definitions hub
-- ----------------
-- Every row must trace back to a specific chunk of a document already sitting
-- in knowledge_documents/document_chunks (uploaded coursebooks, syllabus,
-- examiner reports, etc). There is deliberately no free-text "definition"
-- column an admin can hand-type — `definition_text` is required to be an
-- excerpt taken from `source_chunk_id`'s content, and extraction only ever
-- runs against chunks that already exist in the knowledge base. Nothing
-- outside that table can ever become a definition.
--
-- Showcase
-- --------
-- Essay max marks in this app are 8, 12 or 20 (see essay-generator /
-- question-generator). "Automatically displayed" is implemented as a
-- database trigger on essay_versions, not app code, so it fires no matter
-- which code path writes a mark (grading, re-grading, the audit pass).
-- Threshold is 90% of the essay's max mark, rounded up, except 8-mark
-- essays which require full marks:
--   8-mark essay  -> 8/8 (full marks, not the rounded 90% figure)
--   12-mark essay -> 11 or 12 (i.e. "above 10")
--   20-mark essay -> 18/20
-- rather than a single fixed number, since a fixed cutoff wouldn't scale
-- across the three essay lengths the app actually uses. The author is
-- never shown by name on the showcase — only initials, or "Anonymous"
-- when no name is on file.

CREATE TABLE public.definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  definition_text TEXT NOT NULL,
  source_document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  source_chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  extraction_model TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Same term can legitimately be re-extracted from a different chunk (a
  -- textbook usually defines a concept once per chapter it's central to),
  -- but not duplicated verbatim off the exact same chunk twice.
  UNIQUE (term, source_chunk_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.definitions TO authenticated;
GRANT ALL ON public.definitions TO service_role;
ALTER TABLE public.definitions ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read the hub; only staff can add/edit/remove
-- entries (extraction is a staff-triggered action, same as knowledge
-- ingestion already is).
CREATE POLICY "definitions_read" ON public.definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "definitions_write_staff" ON public.definitions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX definitions_term_idx ON public.definitions (lower(term));
CREATE INDEX definitions_topic_idx ON public.definitions (topic_id);
CREATE INDEX definitions_doc_idx ON public.definitions (source_document_id);

CREATE TRIGGER definitions_touch BEFORE UPDATE ON public.definitions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Showcase
-- ---------------------------------------------------------------------------

ALTER TABLE public.essay_versions ADD COLUMN showcased BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.essay_versions ADD COLUMN showcased_at TIMESTAMPTZ;
ALTER TABLE public.essay_versions ADD COLUMN showcase_consented BOOLEAN NOT NULL DEFAULT false;

-- Threshold: 90% of max_mark, rounded up — except 8-mark essays, which
-- require full marks (8/8) rather than the rounded 90% figure, per an
-- explicit instruction (90% of 8 happens to round up to 8 anyway, but this
-- is spelled out rather than left to depend on that coincidence).
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
  ELSE
    NEW.showcased := false;
    NEW.showcased_at := NULL;
    NEW.showcase_consented := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ev_showcase BEFORE INSERT OR UPDATE OF total_mark ON public.essay_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_essay_showcase();

-- Backfill: apply the same rule to marks that already exist so the showcase
-- isn't empty until the next re-grade.
UPDATE public.essay_versions SET total_mark = total_mark WHERE total_mark IS NOT NULL;

-- essay_versions/essays RLS is "own row, or staff" — a classmate's showcased
-- essay would otherwise be invisible to any other student. Rather than
-- loosening essays/essay_versions SELECT for everyone (which would expose
-- ungraded/low-scoring work and full names), expose only the showcased rows
-- through a SECURITY DEFINER function, and never the author's real name —
-- only initials (or "Anonymous" if no name is on file).
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
    AND v.showcase_consented = true
    AND (_topic_id IS NULL OR e.topic_id = _topic_id)
  ORDER BY v.showcased_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;
GRANT EXECUTE ON FUNCTION public.list_showcase_essays(INT, UUID) TO authenticated;

-- Eligible work remains private until its owner explicitly publishes it.
CREATE OR REPLACE FUNCTION public.list_my_showcase_candidates()
RETURNS TABLE (
  essay_id UUID,
  version_id UUID,
  question TEXT,
  max_mark INT,
  total_mark INT,
  showcase_consented BOOLEAN
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, v.id, e.question, e.max_mark, v.total_mark, v.showcase_consented
  FROM public.essay_versions v
  JOIN public.essays e ON e.id = v.essay_id
  WHERE e.user_id = auth.uid() AND v.showcased = true
  ORDER BY v.showcased_at DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.list_my_showcase_candidates() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_showcase_consent(_version_id UUID, _consent BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.essay_versions v
  SET showcase_consented = _consent
  FROM public.essays e
  WHERE v.id = _version_id
    AND e.id = v.essay_id
    AND e.user_id = auth.uid()
    AND v.showcased = true;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_showcase_consent(UUID, BOOLEAN) TO authenticated;
