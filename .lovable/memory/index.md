# Project Memory

## Core
SLS Solutions Careers: public portal at `/`, HR dashboard at `/dashboard`.
Stack: React, Supabase (DB, Storage, Realtime API), Resend via Edge Functions.
UI: Clean, readable, large question text, step-by-step interview navigation.
Auth: HR signup requires secret code 1408. No signup required for public candidates.
Scoring: Final score is simple average of Aptitude & Interview %. Weighted categories removed.
Aptitude test is GLOBAL (not per-job), same 12 Pebuu questions for all applicants, 8-min timer.
Admin page renamed to Settings (`/settings`).

## Memories
- [Applicant portal](mem://features/applicant-portal) — Public application, required vs optional document uploads, file limits
- [Recruitment workflow](mem://features/recruitment-workflow) — Interview invites, automated emails, aptitude tests
- [Scoring logic](mem://logic/scoring-flow) — Final score calculation formula and forbidden legacy scoring categories
- [Real-time interviews](mem://features/real-time-interviews) — Multi-HR live synchronization, dynamic role tracking, mark aggregation
- [Interview setup](mem://features/interview-setup) — HR candidate search, eligibility filtering, manual walk-in entry
- [Job management](mem://features/job-management) — Job states (active, paused, deleted) and cascading effects
- [Reporting & analytics](mem://features/reporting-analytics) — Exporting performance summaries, score breakdowns, filtering options
- [Aptitude test](mem://features/aptitude-test) — Global Pebuu test with images, 8-min timer, auto-submit
