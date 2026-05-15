
-- Interview sessions: tracks an active interview
CREATE TABLE public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Interview participants: who joined a session
CREATE TABLE public.interview_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'HR User',
  status text NOT NULL DEFAULT 'scoring_questions',
  current_question_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Per-interviewer per-question scores
CREATE TABLE public.interviewer_question_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id, question_id)
);

-- Per-interviewer category scores
CREATE TABLE public.interviewer_category_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  technical numeric NOT NULL DEFAULT 0,
  communication numeric NOT NULL DEFAULT 0,
  skillset numeric NOT NULL DEFAULT 0,
  oral numeric NOT NULL DEFAULT 0,
  weighted_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviewer_question_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviewer_category_scores ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated HR users only
CREATE POLICY "Authenticated can manage interview_sessions" ON public.interview_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage interview_participants" ON public.interview_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage interviewer_question_scores" ON public.interviewer_question_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage interviewer_category_scores" ON public.interviewer_category_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_participants;
