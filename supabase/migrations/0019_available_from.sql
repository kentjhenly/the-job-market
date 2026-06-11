-- ============================================================
-- 0019_available_from.sql
-- Replace the notice-period concept with a concrete date the
-- candidate is available from, picked via a calendar on the
-- posting form. notice_period_days is kept (unused, reversible).
-- ============================================================

alter table candidate_job_postings add column if not exists available_from date;
