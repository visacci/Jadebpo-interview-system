
-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  final_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scores table
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  interviewer_1_technical NUMERIC(5,2) DEFAULT 0,
  interviewer_1_communication NUMERIC(5,2) DEFAULT 0,
  interviewer_1_skillset NUMERIC(5,2) DEFAULT 0,
  interviewer_1_oral NUMERIC(5,2) DEFAULT 0,
  interviewer_2_technical NUMERIC(5,2) DEFAULT 0,
  interviewer_2_communication NUMERIC(5,2) DEFAULT 0,
  interviewer_2_skillset NUMERIC(5,2) DEFAULT 0,
  interviewer_2_oral NUMERIC(5,2) DEFAULT 0,
  interviewer_3_technical NUMERIC(5,2) DEFAULT 0,
  interviewer_3_communication NUMERIC(5,2) DEFAULT 0,
  interviewer_3_skillset NUMERIC(5,2) DEFAULT 0,
  interviewer_3_oral NUMERIC(5,2) DEFAULT 0,
  interviewer_1_weighted NUMERIC(5,2),
  interviewer_2_weighted NUMERIC(5,2),
  interviewer_3_weighted NUMERIC(5,2),
  final_question_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, question_id)
);

-- Create interviewer names table
CREATE TABLE public.interviewer_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interviewer_1_name TEXT NOT NULL DEFAULT 'Interviewer 1',
  interviewer_2_name TEXT NOT NULL DEFAULT 'Interviewer 2',
  interviewer_3_name TEXT NOT NULL DEFAULT 'Interviewer 3'
);

-- Create score weights table
CREATE TABLE public.score_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technical_weight NUMERIC(3,2) NOT NULL DEFAULT 0.40,
  communication_weight NUMERIC(3,2) NOT NULL DEFAULT 0.20,
  skillset_weight NUMERIC(3,2) NOT NULL DEFAULT 0.25,
  oral_weight NUMERIC(3,2) NOT NULL DEFAULT 0.15,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviewer_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_weights ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal company tool)
CREATE POLICY "Allow all access to departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to scores" ON public.scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to interviewer_names" ON public.interviewer_names FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to score_weights" ON public.score_weights FOR ALL USING (true) WITH CHECK (true);

-- Insert default departments
INSERT INTO public.departments (name) VALUES 
  ('Sales'),
  ('Call Center Agents'),
  ('Team Leader'),
  ('Collection Officers');

-- Insert default score weights
INSERT INTO public.score_weights (technical_weight, communication_weight, skillset_weight, oral_weight) 
VALUES (0.40, 0.20, 0.25, 0.15);

-- Sample questions for Sales
INSERT INTO public.questions (department_id, question_text, order_index)
SELECT d.id, q.question_text, q.order_index
FROM public.departments d
CROSS JOIN (VALUES 
  ('Tell us about your sales experience and biggest achievement.', 1),
  ('How do you handle objections from potential customers?', 2),
  ('Describe your approach to meeting sales targets.', 3),
  ('How do you build long-term client relationships?', 4),
  ('Walk us through your sales pitch for our product.', 5)
) AS q(question_text, order_index)
WHERE d.name = 'Sales';

-- Sample questions for Call Center Agents
INSERT INTO public.questions (department_id, question_text, order_index)
SELECT d.id, q.question_text, q.order_index
FROM public.departments d
CROSS JOIN (VALUES 
  ('How do you handle an angry or frustrated customer?', 1),
  ('Describe a time you went above and beyond for a customer.', 2),
  ('How do you manage multiple calls during peak hours?', 3),
  ('What is your approach to de-escalating a tense situation?', 4),
  ('How do you stay motivated during repetitive tasks?', 5)
) AS q(question_text, order_index)
WHERE d.name = 'Call Center Agents';

-- Sample questions for Team Leader
INSERT INTO public.questions (department_id, question_text, order_index)
SELECT d.id, q.question_text, q.order_index
FROM public.departments d
CROSS JOIN (VALUES 
  ('How do you motivate your team to achieve targets?', 1),
  ('Describe your leadership style with examples.', 2),
  ('How do you handle conflict within your team?', 3),
  ('What strategies do you use for team performance improvement?', 4),
  ('How do you delegate tasks effectively?', 5)
) AS q(question_text, order_index)
WHERE d.name = 'Team Leader';

-- Sample questions for Collection Officers
INSERT INTO public.questions (department_id, question_text, order_index)
SELECT d.id, q.question_text, q.order_index
FROM public.departments d
CROSS JOIN (VALUES 
  ('How do you approach a customer who is behind on payments?', 1),
  ('Describe your negotiation skills with a real example.', 2),
  ('How do you maintain professionalism while collecting debts?', 3),
  ('What strategies do you use to maximize collection rates?', 4),
  ('How do you handle a customer who refuses to pay?', 5)
) AS q(question_text, order_index)
WHERE d.name = 'Collection Officers';

-- Create indexes
CREATE INDEX idx_questions_department ON public.questions(department_id);
CREATE INDEX idx_candidates_department ON public.candidates(department_id);
CREATE INDEX idx_scores_candidate ON public.scores(candidate_id);
CREATE INDEX idx_scores_question ON public.scores(question_id);
