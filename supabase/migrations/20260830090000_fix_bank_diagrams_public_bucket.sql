-- Bug fix: MCQ diagrams (real cropped exam figures attached to bank
-- questions) were invisible to students.
--
-- Root cause: 20260829140000_bank_diagram_images.sql followed the same
-- "private bucket + authenticated RLS SELECT policy" pattern as the
-- existing 'knowledge' bucket, and question-bank-admin.tsx uploads a crop
-- then calls `supabase.storage.from('bank-diagrams').getPublicUrl(path)`,
-- storing that URL permanently on the question row.
--
-- getPublicUrl() only returns a URL that actually resolves when the
-- bucket itself is flagged public — on a private bucket it still returns
-- a URL string, but a plain <img src="..."> tag (used in both mcq.tsx and
-- question-bank-admin.tsx) can't attach the user's auth token, so every
-- request 400s and the image never renders. Unlike the knowledge bucket
-- (raw coursebook/past-paper source files, kept private on purpose),
-- there's no reason to keep cropped diagram images access-gated — they're
-- shown to any logged-in student anyway — so the fix is to make the
-- bucket public, which also means it works even if it was never created
-- through the Supabase dashboard at all.
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-diagrams', 'bank-diagrams', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- The old private-bucket SELECT policy is now redundant (public buckets
-- serve reads unconditionally) but harmless to leave — drop it anyway so
-- there's only one, unambiguous read path to reason about.
DROP POLICY IF EXISTS "bank_diagrams_read_authenticated" ON storage.objects;
