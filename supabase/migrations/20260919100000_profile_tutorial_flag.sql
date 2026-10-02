-- ============================================================================
-- Onboarding tutorial flag.
--
-- New users get a "take a quick tour or skip it" prompt the first time they
-- land in the app. We track that as a single boolean on profiles, defaulted
-- to false for anyone created after this migration.
--
-- Existing users are backfilled to true so nobody who has already been using
-- the product gets an unexpected tutorial popup.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET tutorial_completed = true WHERE tutorial_completed = false;
