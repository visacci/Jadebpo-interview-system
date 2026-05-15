
ALTER TABLE public.questions ADD COLUMN max_marks numeric NOT NULL DEFAULT 10;
ALTER TABLE public.aptitude_questions ADD COLUMN max_marks numeric NOT NULL DEFAULT 5;
