-- 0033: Per-posting work eligibility
--
-- A candidate posting's location is the work territory. When the candidate's
-- citizenship (candidates.citizenship) differs from that territory, the posting
-- form asks them to confirm they are eligible to work there (right to work);
-- the confirmation is stored here. Null when not applicable (citizenship matches
-- the location, or citizenship is unset).

alter table candidate_job_postings
  add column work_eligible boolean;
