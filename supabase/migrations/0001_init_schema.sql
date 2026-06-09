-- ============================================================
-- 0001_init_schema.sql
-- Core data model for The Job Market
-- ============================================================

-- ENUM types
create type user_role as enum ('candidate', 'employer');
create type challenge_type as enum ('multiple_choice', 'coding', 'written');
create type match_status as enum ('pending', 'accepted', 'declined', 'expired', 'ghosted');
create type vertical as enum ('tech', 'finance', 'marketing', 'design', 'ops');

-- ----------------------------------------------------------------
-- Profiles (extends auth.users — one row per user)
-- ----------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null,
  display_name  text not null,
  email         text not null,
  vertical      vertical,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Candidates
-- ----------------------------------------------------------------
create table candidates (
  id                    uuid primary key references profiles(id) on delete cascade,
  composite_score       numeric(5,2) not null default 0,
  percentile_rank       numeric(5,2) not null default 0,
  years_exp_claimed     smallint,
  desired_salary_min    integer,        -- cents
  desired_salary_max    integer,        -- cents
  location              text,
  remote_only           boolean not null default false,
  is_visible            boolean not null default true,
  reputation_score      numeric(5,2) not null default 100,
  last_active_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Employers
-- ----------------------------------------------------------------
create table employers (
  id              uuid primary key references profiles(id) on delete cascade,
  company_name    text not null,
  company_size    text,                 -- '1-10', '11-50', '51-200', '201-1000', '1000+'
  industry        text,
  website         text,
  credits         integer not null default 0,
  verified        boolean not null default false,
  reputation_score numeric(5,2) not null default 100
);

-- ----------------------------------------------------------------
-- Challenges
-- ----------------------------------------------------------------
create table challenges (
  id              uuid primary key default gen_random_uuid(),
  vertical        vertical not null,
  title           text not null,
  description     text,
  time_limit_sec  integer not null default 1800,
  max_score       integer not null default 100,
  is_active       boolean not null default true,
  version         smallint not null default 1,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Questions (belongs to challenge)
-- ----------------------------------------------------------------
create table questions (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references challenges(id) on delete cascade,
  type            challenge_type not null,
  prompt          text not null,
  options         jsonb,               -- [{"id":"a","text":"..."}] for MCQ
  correct_answer  text,               -- option id for MCQ; null for coding (manual/rubric)
  weight          numeric(4,2) not null default 1.0,
  order_index     smallint not null,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Challenge results (candidate attempts)
-- ----------------------------------------------------------------
create table challenge_results (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid not null references candidates(id) on delete cascade,
  challenge_id     uuid not null references challenges(id),
  raw_score        numeric(5,2),
  normalised_score numeric(5,2),       -- 0-100 percentile among all attempts
  time_taken_sec   integer,
  answers          jsonb,              -- {question_id: answer_value}
  scored_at        timestamptz not null default now(),
  attempt_number   smallint not null default 1,
  unique (candidate_id, challenge_id, attempt_number)
);

-- ----------------------------------------------------------------
-- Salary market data (seeded + accumulated from matches)
-- ----------------------------------------------------------------
create table salary_data_points (
  id              uuid primary key default gen_random_uuid(),
  vertical        vertical not null,
  years_exp       smallint not null,
  location        text,
  remote          boolean not null default false,
  annual_salary   integer not null,    -- cents
  source          text not null default 'seed',  -- 'seed' | 'match' | 'survey'
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Reputation events (anti-ghosting signals)
-- ----------------------------------------------------------------
create table reputation_events (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references profiles(id) on delete cascade,
  actor_id      uuid references profiles(id),  -- null = system (e.g. expiry cron)
  event_type    text not null,                 -- 'ghosted' | 'responded' | 'completed_match' | 'salary_undercut'
  weight        numeric(4,2) not null default 1.0,
  match_id      uuid,                          -- optional link to the triggering match
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Matches (employer pitches to candidate)
-- ----------------------------------------------------------------
create table matches (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null references employers(id),
  candidate_id    uuid not null references candidates(id),
  status          match_status not null default 'pending',
  pitch_message   text,
  offered_salary  integer,             -- cents; employer's proposed salary
  responded_at    timestamptz,
  expires_at      timestamptz not null default (now() + interval '72 hours'),
  created_at      timestamptz not null default now()
);

-- Prevent duplicate open pitches from same employer to same candidate
create unique index matches_open_unique
  on matches (employer_id, candidate_id)
  where status = 'pending';

-- ----------------------------------------------------------------
-- Public match ticker (anonymised events for live feed)
-- ----------------------------------------------------------------
create table match_ticker_events (
  id            uuid primary key default gen_random_uuid(),
  vertical      vertical not null,
  salary_band   text,                  -- e.g. '$80K–$100K'
  role_label    text,                  -- e.g. 'SR. ENGINEER'
  match_type    text not null default 'match',
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Score history (sparkline data per candidate)
-- ----------------------------------------------------------------
create table score_history (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null references candidates(id) on delete cascade,
  composite_score numeric(5,2) not null,
  recorded_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
create index candidates_composite_score_idx on candidates (composite_score desc);
create index candidates_visible_idx on candidates (is_visible, composite_score desc);
create index challenge_results_candidate_idx on challenge_results (candidate_id);
create index matches_employer_idx on matches (employer_id, created_at desc);
create index matches_candidate_idx on matches (candidate_id, created_at desc);
create index match_ticker_events_created_idx on match_ticker_events (created_at desc);
create index score_history_candidate_idx on score_history (candidate_id, recorded_at desc);
create index salary_data_vertical_idx on salary_data_points (vertical, years_exp);

-- ----------------------------------------------------------------
-- Trigger: auto-update profiles.updated_at
-- ----------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- Trigger: auto-create candidate/employer row on profile insert
-- ----------------------------------------------------------------
create or replace function create_role_profile()
returns trigger language plpgsql security definer as $$
begin
  if new.role = 'candidate' then
    insert into candidates (id) values (new.id)
    on conflict (id) do nothing;
  elsif new.role = 'employer' then
    insert into employers (id, company_name)
    values (new.id, coalesce(new.display_name, 'New Company'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profile_create_role_row
  after insert on profiles
  for each row execute function create_role_profile();
