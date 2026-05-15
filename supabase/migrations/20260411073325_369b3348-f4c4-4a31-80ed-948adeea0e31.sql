
-- Add unique constraint for scores upsert
ALTER TABLE public.scores ADD CONSTRAINT scores_candidate_question_unique UNIQUE (candidate_id, question_id);
