-- 0021: Backfill accepted matches into salary_data_points
--
-- Matches accepted before POST /api/matches/[matchId]/respond started
-- feeding accepted offers back into the regression dataset never produced
-- a salary_data_points row, so they don't appear in the regression or as
-- green "REAL MATCHES" dots in the posting form's market-data scatter.
--
-- This inserts one row per historical accepted match, mirroring the
-- route's insert exactly: requires offered_salary and the candidate's
-- years_exp_claimed (a regression point needs an x-coordinate);
-- vertical/role_label come from the linked employer posting when present,
-- falling back to 'tech'/null; remote from the posting's work_modes,
-- else the candidate's remote_only flag.
--
-- Run-once guard: skipped entirely if any match-sourced points already
-- exist (the route covers every match accepted after it shipped, so a
-- second run would only ever duplicate).

insert into salary_data_points
  (vertical, role_label, years_exp, location, remote, monthly_salary, source)
select
  coalesce(p.vertical, 'tech'),
  p.title,
  c.years_exp_claimed,
  c.location,
  coalesce('remote' = any(p.work_modes), c.remote_only, false),
  m.offered_salary,
  'match'
from matches m
join candidates c on c.id = m.candidate_id
left join employer_job_postings p on p.id = m.posting_id
where m.status = 'accepted'
  and m.offered_salary is not null
  and c.years_exp_claimed is not null
  and not exists (select 1 from salary_data_points where source = 'match');
