-- ==============================================================================
-- Migration: Add bio and birthday columns to profiles table
-- Date: 2026-11-04
-- Purpose: Support professional student profile settings including
--          biography/statement and date of birth.
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birthday DATE;
  END IF;
END $$;
