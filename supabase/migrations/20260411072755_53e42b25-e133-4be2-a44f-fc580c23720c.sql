
-- Create HR profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Jobs table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs are publicly readable" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage jobs" ON public.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Aptitude questions per job
CREATE TABLE public.aptitude_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aptitude_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aptitude questions publicly readable" ON public.aptitude_questions FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage aptitude questions" ON public.aptitude_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Applications table
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  age integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'rejected')),
  aptitude_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view applications" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update applications" ON public.applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Application documents
CREATE TABLE public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('cv', 'application_letter', 'uace_results', 'uce_results', 'university_documents', 'national_id')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can upload documents" ON public.application_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view documents" ON public.application_documents FOR SELECT TO authenticated USING (true);

-- Aptitude answers
CREATE TABLE public.aptitude_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.aptitude_questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aptitude_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit answers" ON public.aptitude_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view answers" ON public.aptitude_answers FOR SELECT TO authenticated USING (true);

-- Storage bucket for applicant documents
INSERT INTO storage.buckets (id, name, public) VALUES ('applicant-documents', 'applicant-documents', false);
CREATE POLICY "Anyone can upload applicant docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'applicant-documents');
CREATE POLICY "Authenticated can view applicant docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'applicant-documents');

-- Now modify the scores table: drop category columns per question, add a separate category_scores table
-- Each interviewer now only gives a single score per question
ALTER TABLE public.scores
  DROP COLUMN IF EXISTS interviewer_1_technical,
  DROP COLUMN IF EXISTS interviewer_1_communication,
  DROP COLUMN IF EXISTS interviewer_1_skillset,
  DROP COLUMN IF EXISTS interviewer_1_oral,
  DROP COLUMN IF EXISTS interviewer_1_weighted,
  DROP COLUMN IF EXISTS interviewer_2_technical,
  DROP COLUMN IF EXISTS interviewer_2_communication,
  DROP COLUMN IF EXISTS interviewer_2_skillset,
  DROP COLUMN IF EXISTS interviewer_2_oral,
  DROP COLUMN IF EXISTS interviewer_2_weighted,
  DROP COLUMN IF EXISTS interviewer_3_technical,
  DROP COLUMN IF EXISTS interviewer_3_communication,
  DROP COLUMN IF EXISTS interviewer_3_skillset,
  DROP COLUMN IF EXISTS interviewer_3_oral,
  DROP COLUMN IF EXISTS interviewer_3_weighted;

-- Add simple per-question scores for each interviewer
ALTER TABLE public.scores
  ADD COLUMN interviewer_1_score numeric DEFAULT 0,
  ADD COLUMN interviewer_2_score numeric DEFAULT 0,
  ADD COLUMN interviewer_3_score numeric DEFAULT 0;

-- Category scores table: awarded AFTER all questions, per interviewer per candidate
CREATE TABLE public.category_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  interviewer_number integer NOT NULL CHECK (interviewer_number IN (1, 2, 3)),
  technical numeric NOT NULL DEFAULT 0,
  communication numeric NOT NULL DEFAULT 0,
  skillset numeric NOT NULL DEFAULT 0,
  oral numeric NOT NULL DEFAULT 0,
  weighted_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, interviewer_number)
);
ALTER TABLE public.category_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to category_scores" ON public.category_scores FOR ALL USING (true) WITH CHECK (true);

-- Add application_id to candidates table to link invited applicants
ALTER TABLE public.candidates ADD COLUMN application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL;
