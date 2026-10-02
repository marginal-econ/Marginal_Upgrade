-- Separate the "which AI answers chat/marking prompts" setting from
-- "which AI produces embedding vectors" — these were sharing a single
-- is_active flag, so activating a chat provider silently had no effect on
-- embeddings (and vice versa), and there was nowhere in the console to
-- manage embedding providers on their own.
--
-- purpose = 'chat'      -> used by chat()/visionChat() (marking, tutoring, OCR)
-- purpose = 'embedding' -> used by embed()/embedOne() (knowledge ingestion,
--                          retrieval-grounded grading)
--
-- Multiple embedding-purpose keys can be saved at once (e.g. Google +
-- OpenRouter) so a specific ingestion/grading call can pick one explicitly
-- rather than always using whichever is flagged active.

ALTER TABLE public.ai_provider_keys
  ADD COLUMN purpose text NOT NULL DEFAULT 'chat'
    CHECK (purpose IN ('chat', 'embedding'));

-- The old single-active-row-for-the-whole-table index prevented a chat
-- provider and an embedding provider from ever both being active at once.
DROP INDEX IF EXISTS public.ai_provider_keys_single_active;

CREATE UNIQUE INDEX ai_provider_keys_single_active_purpose
  ON public.ai_provider_keys ((purpose))
  WHERE is_active;

CREATE INDEX ai_provider_keys_purpose_idx ON public.ai_provider_keys (purpose);
