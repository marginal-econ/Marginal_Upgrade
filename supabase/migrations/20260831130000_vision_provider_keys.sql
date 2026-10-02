-- Adds a third, fully independent "purpose" for ai_provider_keys: vision.
--
-- purpose = 'chat'      -> used by chat() (marking, tutoring, essay/MCQ text generation)
-- purpose = 'embedding' -> used by embed()/embedOne() (knowledge ingestion, retrieval)
-- purpose = 'vision'    -> used by visionChat() (handwriting transcription, MCQ/essay
--                          past-paper extraction from page images, diagram reading)
--
-- Before this migration, visionChat() silently reused whatever key was
-- flagged active for 'chat', and handwriting OCR separately special-cased a
-- raw lookup of any saved Google key regardless of active state. Neither
-- gave an admin an explicit "this is what reads images" control, and a
-- non-vision-capable chat model (e.g. a text-only DeepSeek key marked
-- active for chat) would silently break OCR/extraction with no dedicated
-- place to fix it. Splitting this out mirrors the chat/embedding split in
-- 20260827120000_embedding_provider_keys.sql exactly, including the
-- per-purpose single-active-row constraint.

ALTER TABLE public.ai_provider_keys
  DROP CONSTRAINT IF EXISTS ai_provider_keys_purpose_check;

ALTER TABLE public.ai_provider_keys
  ADD CONSTRAINT ai_provider_keys_purpose_check
    CHECK (purpose IN ('chat', 'embedding', 'vision'));

-- The existing ai_provider_keys_single_active_purpose index is already a
-- generic ((purpose)) WHERE is_active unique index, so it automatically
-- covers 'vision' rows too — one active vision key at a time, independent
-- of the active chat/embedding key. Nothing else to change there.
