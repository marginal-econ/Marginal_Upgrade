-- ============================================================================
-- EXAMINER PAPERS STORAGE BUCKET & POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'examiner-papers',
  'examiner-papers',
  true,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- Storage policies for examiner-papers
DROP POLICY IF EXISTS "examiner_papers_select_all" ON storage.objects;
CREATE POLICY "examiner_papers_select_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'examiner-papers');

DROP POLICY IF EXISTS "examiner_papers_insert_auth" ON storage.objects;
CREATE POLICY "examiner_papers_insert_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'examiner-papers');

DROP POLICY IF EXISTS "examiner_papers_update_auth" ON storage.objects;
CREATE POLICY "examiner_papers_update_auth"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'examiner-papers')
WITH CHECK (bucket_id = 'examiner-papers');

DROP POLICY IF EXISTS "examiner_papers_delete_auth" ON storage.objects;
CREATE POLICY "examiner_papers_delete_auth"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'examiner-papers');
