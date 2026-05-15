-- Allow authenticated users to delete applications
CREATE POLICY "Authenticated can delete applications"
ON public.applications
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete application_documents
CREATE POLICY "Authenticated can delete application_documents"
ON public.application_documents
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete aptitude_answers
CREATE POLICY "Authenticated can delete aptitude_answers"
ON public.aptitude_answers
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete jobs
CREATE POLICY "Authenticated can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete aptitude_questions
CREATE POLICY "Authenticated can delete aptitude_questions"
ON public.aptitude_questions
FOR DELETE
TO authenticated
USING (true);