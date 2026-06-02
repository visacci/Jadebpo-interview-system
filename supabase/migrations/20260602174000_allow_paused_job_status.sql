-- Allow jobs to be temporarily paused from receiving applications.
ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_status_check
CHECK (status IN ('open', 'paused', 'closed'));
