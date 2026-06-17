-- 0031: Candidate biodata + per-posting experience
--
-- Reframes the candidate profile around stable biodata (things that don't
-- change per posting), and moves years-of-experience onto each posting (it is
-- role-specific). candidates.years_exp_claimed is kept and auto-synced to the
-- candidate's highest posted experience (see src/lib/postings/syncCandidateExperience.ts),
-- so the salary regression, dashboard curve, scorer, and match data points keep
-- reading a single canonical value.

alter table candidates
  add column if not exists date_of_birth date,
  add column if not exists sex text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists citizenship text;

alter table candidate_job_postings
  add column if not exists years_exp smallint;
