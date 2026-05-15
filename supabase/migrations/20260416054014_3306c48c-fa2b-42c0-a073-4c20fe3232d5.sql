
-- Make job_id nullable so global aptitude questions don't need a job
ALTER TABLE public.aptitude_questions ALTER COLUMN job_id DROP NOT NULL;

-- Add image_url for question images (charts, diagrams)
ALTER TABLE public.aptitude_questions ADD COLUMN IF NOT EXISTS image_url text;

-- Add category for question type labeling
ALTER TABLE public.aptitude_questions ADD COLUMN IF NOT EXISTS category text;

-- Allow public to read global aptitude questions (already has public SELECT policy)
