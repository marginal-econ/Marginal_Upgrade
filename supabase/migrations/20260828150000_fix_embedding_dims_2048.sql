-- Fixes a hard dimension mismatch that made knowledge/paper ingestion fail
-- for any provider that isn't OpenAI text-embedding-3-large.
--
-- src/lib/examiner/config.ts's EMBEDDING_DIMS has always been 2048 (chosen
-- so the free, dimension-locked Nemotron 3 Embed option is usable and every
-- provider writes to the same comparable vector size). The table and its
-- match function were created as vector(3072) instead, so any insert of a
-- 2048-length vector into document_chunks.embedding was rejected outright
-- by pgvector ("expected 3072 dimensions, not 2048") — this is why adding
-- documents (both regular knowledge-base materials and MCQ calibration
-- papers) surfaced as a failed/stuck ingestion.
--
-- This migration brings the schema in line with the code's actual target
-- (2048), not the other way around, since 2048 is the size that works
-- across every supported embedding provider (Google, OpenAI, OpenRouter/
-- Nemotron). Any chunk that had somehow already been embedded at 3072 dims
-- (only possible via a manually-run OpenAI text-embedding-3-large key) is
-- reset to unembedded so it gets re-embedded at the correct size rather
-- than silently dropped or left inconsistent.

-- 1. Drop the old 3072-dim index and match function before changing the
--    column type — pgvector won't let you ALTER a column an index depends on.
DROP INDEX IF EXISTS public.dc_embedding_idx;
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, int, public.doc_type[], uuid);

-- 2. Clear out any embeddings so the column can be resized cleanly. Nothing
--    "valid" is lost: a 3072-dim vector can't be reused at 2048 dims anyway,
--    and everything that failed to write was never stored in the first place.
UPDATE public.document_chunks SET embedding = NULL WHERE embedding IS NOT NULL;

ALTER TABLE public.document_chunks
  ALTER COLUMN embedding TYPE vector(2048);

ALTER TABLE public.document_chunks
  ALTER COLUMN model_version SET DEFAULT 'google/gemini-embedding-2';

-- 3. Re-flag every document that has any unembedded chunk as "processing"
--    so it picks back up the next time someone opens the knowledge library
--    (embedNextBatch only advances documents that are queried for pending
--    chunks — this just makes sure status reflects reality).
UPDATE public.knowledge_documents d
SET status = 'processing', error_message = NULL
WHERE status IN ('ready', 'failed')
  AND EXISTS (
    SELECT 1 FROM public.document_chunks c
    WHERE c.document_id = d.id
  );

-- 4. Recreate the index and match function at 2048 dims.
CREATE INDEX dc_embedding_idx ON public.document_chunks
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
