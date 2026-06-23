-- Track which candidate posting a match was made against, so we can remove
-- just that posting when the candidate gets hired.
alter table matches
  add column candidate_posting_id uuid references candidate_job_postings(id) on delete set null;
