-- ============================================================
-- 0008_candidate_job_postings.sql
-- Per-position job postings for candidates (up to 10 each)
-- ============================================================

create type work_mode as enum ('full_time', 'part_time', 'remote', 'internship');

create table candidate_job_postings (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid not null references candidates(id) on delete cascade,
  title               text not null,
  location            text,
  work_modes          work_mode[] not null default '{}',
  desired_salary_min  integer,        -- cents
  desired_salary_max  integer,        -- cents
  skills              text[] not null default '{}',
  notice_period_days  smallint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index candidate_job_postings_candidate_idx
  on candidate_job_postings (candidate_id, created_at);

create trigger candidate_job_postings_updated_at
  before update on candidate_job_postings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- RLS (defense-in-depth — ownership is enforced in Route Handlers
-- via the service client, since auth.uid() is NULL under Better Auth)
-- ----------------------------------------------------------------
alter table candidate_job_postings enable row level security;

create policy "job_postings_select_own" on candidate_job_postings
  for select using (auth.uid() = candidate_id);

create policy "job_postings_insert_own" on candidate_job_postings
  for insert with check (auth.uid() = candidate_id);

create policy "job_postings_update_own" on candidate_job_postings
  for update using (auth.uid() = candidate_id);

create policy "job_postings_delete_own" on candidate_job_postings
  for delete using (auth.uid() = candidate_id);
