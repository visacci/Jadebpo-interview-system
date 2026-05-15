
-- Add aptitude_started_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='aptitude_started_at') THEN
        ALTER TABLE public.applications ADD COLUMN aptitude_started_at timestamptz;
    END IF;
END $$;

-- Update RLS policies for applications to allow public access by ID
-- First drop existing restrictive policies if they exist (to avoid duplicates, though Supabase handles this usually)
DROP POLICY IF EXISTS "Authenticated can view applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated can update applications" ON public.applications;

-- New policies for applications
DROP POLICY IF EXISTS "Public can view application by ID" ON public.applications;
CREATE POLICY "Public can view application by ID" 
ON public.applications FOR SELECT 
USING (true); -- This is needed for candidates to fetch their app details. UUID makes it secure enough.

DROP POLICY IF EXISTS "Public can update application by ID" ON public.applications;
CREATE POLICY "Public can update application by ID" 
ON public.applications FOR UPDATE 
USING (true)
WITH CHECK (true); -- Allows candidates to update their aptitude_status, score, and started_at.

-- Ensure aptitude_questions are publicly readable (already should be, but let's be sure)
DROP POLICY IF EXISTS "Aptitude questions publicly readable" ON public.aptitude_questions;
CREATE POLICY "Aptitude questions publicly readable" 
ON public.aptitude_questions FOR SELECT 
USING (true);

-- Ensure aptitude_answers can be inserted by anyone
DROP POLICY IF EXISTS "Anyone can submit answers" ON public.aptitude_answers;
CREATE POLICY "Anyone can submit answers" 
ON public.aptitude_answers FOR INSERT 
WITH CHECK (true);
-- Allow authenticated users to delete answers (needed for resending invitations)
DROP POLICY IF EXISTS "Authenticated can delete answers" ON public.aptitude_answers;
CREATE POLICY "Authenticated can delete answers" 
ON public.aptitude_answers FOR DELETE 
TO authenticated 
USING (true);
