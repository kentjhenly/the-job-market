-- 0036: Candidate current job
--
-- The profile's "CURRENT JOB" section captures the candidate's present role with
-- the same workflow as a posting: location -> industry -> role -> experience ->
-- salary. Experience (years_exp_claimed + exp_months) and current_salary already
-- exist; this adds the location/industry/role of the current job. Private to the
-- candidate (drives their own dashboard salary position; not shown to employers).

alter table candidates
  add column if not exists current_job_location text,
  add column if not exists current_job_vertical text,
  add column if not exists current_job_role text;
