-- ============================================================
-- 0014_candidate_portfolio.sql
-- Portfolio projects replace skill challenges as the candidate's
-- proof-of-skill: file/link uploads tagged with skills.
-- ============================================================

create table candidate_portfolio_projects (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  text not null references candidates(id) on delete cascade,
  title         text not null,
  description   text,
  link_url      text,
  file_path     text,   -- storage object path in 'portfolio-files' bucket
  file_name     text,   -- original filename, for display
  skills        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index candidate_portfolio_projects_candidate_idx
  on candidate_portfolio_projects (candidate_id, created_at);

create trigger candidate_portfolio_projects_updated_at
  before update on candidate_portfolio_projects
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- RLS (defense-in-depth — ownership is enforced in Route Handlers
-- via the service client, since auth.uid() is NULL under Better Auth)
-- ----------------------------------------------------------------
alter table candidate_portfolio_projects enable row level security;

create policy "portfolio_select_own" on candidate_portfolio_projects
  for select using (auth.uid()::text = candidate_id);

create policy "portfolio_insert_own" on candidate_portfolio_projects
  for insert with check (auth.uid()::text = candidate_id);

create policy "portfolio_update_own" on candidate_portfolio_projects
  for update using (auth.uid()::text = candidate_id);

create policy "portfolio_delete_own" on candidate_portfolio_projects
  for delete using (auth.uid()::text = candidate_id);

-- mirrors the challenge_results "matched employer can read" pattern
create policy "portfolio_employer_read" on candidate_portfolio_projects
  for select using (
    exists (
      select 1 from matches m
      where m.candidate_id = candidate_portfolio_projects.candidate_id
        and m.employer_id = auth.uid()::text
        and m.status = 'accepted'
    )
  );

-- ----------------------------------------------------------------
-- Storage bucket for uploaded portfolio files (private; accessed
-- only via service-client signed URLs from /api/portfolio/*/file)
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('portfolio-files', 'portfolio-files', false, 10485760)
on conflict (id) do nothing;
