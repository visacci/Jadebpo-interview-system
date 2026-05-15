---
name: Aptitude test configuration
description: Global Pebuu pre-employment aptitude test — 12 questions, images, 8-minute timer, auto-submit
type: feature
---
- Aptitude test is GLOBAL, not per-job. Questions stored in aptitude_questions with job_id = NULL.
- 12 real Pebuu® questions seeded with categories and images (charts, diagrams).
- Timer: 8 minutes. Auto-submits when time expires.
- Images stored in /public/aptitude-images/ and referenced via image_url column (comma-separated for multiple).
- Questions managed in Settings page (/settings), not during job creation.
- Confirmation email sent to applicants on form submission (type: application_received).
