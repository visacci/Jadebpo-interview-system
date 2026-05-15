CREATE POLICY "Anyone can update applicant docs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'applicant-documents')
WITH CHECK (bucket_id = 'applicant-documents');

CREATE POLICY "Anyone can read applicant docs for upload"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'applicant-documents');