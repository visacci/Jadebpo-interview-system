-- Add notes column to interview_participants so interviewers can record
-- observations about a candidate during the interview session.
-- These notes are then displayed on the Results page and included in the PDF result card.
ALTER TABLE public.interview_participants
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
