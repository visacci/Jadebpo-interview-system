
ALTER TABLE public.applications ADD COLUMN salary_expectation text;
ALTER TABLE public.applications ADD COLUMN aptitude_status text NOT NULL DEFAULT 'pending';
