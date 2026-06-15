-- 0031: Candidate biodata + per-posting experience
--
-- Reframes the candidate profile around stable biodata (things that don't
-- change per posting), and moves years-of-experience onto each posting (it is
-- role-specific). candidates.years_exp_claimed is kept and auto-synced to the
-- candidate's highest posted experience (see src/lib/postings/syncCandidateExperience.ts),
-- so the salary regression, dashboard curve, scorer, and match data points keep
-- reading a single canonical value.

alter table candidates
  add column date_of_birth date,
  add column sex text,
  add column languages text[] not null default '{}',
  add column citizenship text;

alter table candidate_job_postings
  add column years_exp smallint;
