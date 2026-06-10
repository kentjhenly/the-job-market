-- ============================================================
-- 0009_employer_postings_and_chat.sql
-- Employer job postings (parallel to candidate_job_postings),
-- posting-linked matches with a per-posting candidate cap,
-- and a chat thread for accepted matches.
-- ============================================================

-- ----------------------------------------------------------------
-- Employer job postings
-- ----------------------------------------------------------------
create table employer_job_postings (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null references employers(id) on delete cascade,
  title           text not null,
  description     text,
  vertical        vertical not null default 'tech',
  years_exp_min   smallint,
  years_exp_max   smallint,
  location        text,
  work_modes      work_mode[] not null default '{}',
  salary_min      integer,        -- cents
  salary_max      integer,        -- cents
  skills          text[] not null default '{}',
  max_candidates  smallint not null default 5,
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index employer_job_postings_employer_idx
  on employer_job_postings (employer_id, created_at);

create trigger employer_job_postings_updated_at
  before update on employer_job_postings
  for each row execute function set_updated_at();

alter table employer_job_postings enable row level security;

create policy "employer_postings_select_own" on employer_job_postings
  for select using (auth.uid() = employer_id);
create policy "employer_postings_insert_own" on employer_job_postings
  for insert with check (auth.uid() = employer_id);
create policy "employer_postings_update_own" on employer_job_postings
  for update using (auth.uid() = employer_id);
create policy "employer_postings_delete_own" on employer_job_postings
  for delete using (auth.uid() = employer_id);

-- ----------------------------------------------------------------
-- Link matches to the employer posting that generated the pitch
-- ----------------------------------------------------------------
alter table matches
  add column posting_id uuid references employer_job_postings(id) on delete set null;

create index matches_posting_idx on matches (posting_id);

-- ----------------------------------------------------------------
-- Match chat (accepted matches only)
-- ----------------------------------------------------------------
create table match_messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  sender_id   uuid not null references profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index match_messages_match_idx on match_messages (match_id, created_at);

alter table match_messages enable row level security;

create policy "match_messages_select_participant" on match_messages
  for select using (
    exists (
      select 1 from matches m
      where m.id = match_messages.match_id
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
    )
  );

create policy "match_messages_insert_participant" on match_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_messages.match_id
      and m.status = 'accepted'
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
    )
  );
