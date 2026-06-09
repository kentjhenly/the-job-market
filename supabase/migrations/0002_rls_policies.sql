-- ============================================================
-- 0002_rls_policies.sql
-- Row-Level Security policies for all tables
-- ============================================================

-- Enable RLS
alter table profiles enable row level security;
alter table candidates enable row level security;
alter table employers enable row level security;
alter table challenges enable row level security;
alter table questions enable row level security;
alter table challenge_results enable row level security;
alter table salary_data_points enable row level security;
alter table reputation_events enable row level security;
alter table matches enable row level security;
alter table match_ticker_events enable row level security;
alter table score_history enable row level security;

-- ----------------------------------------------------------------
-- Helper: check user role without recursion
-- ----------------------------------------------------------------
create or replace function get_user_role(uid uuid)
returns user_role
language sql security definer stable
as $$
  select role from profiles where id = uid;
$$;

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
-- Own row always readable/updatable
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- Employers can read candidate display names (for feed)
create policy "profiles_employer_read_candidates"
  on profiles for select
  using (
    role = 'candidate'
    and get_user_role(auth.uid()) = 'employer'
  );

-- ----------------------------------------------------------------
-- candidates
-- ----------------------------------------------------------------
create policy "candidates_select_own"
  on candidates for select
  using (auth.uid() = id);

create policy "candidates_update_own"
  on candidates for update
  using (auth.uid() = id);

-- Employers see visible candidates
create policy "candidates_employer_read"
  on candidates for select
  using (
    is_visible = true
    and get_user_role(auth.uid()) = 'employer'
  );

-- ----------------------------------------------------------------
-- employers
-- ----------------------------------------------------------------
create policy "employers_select_own"
  on employers for select
  using (auth.uid() = id);

create policy "employers_update_own"
  on employers for update
  using (auth.uid() = id);

-- Candidates can read employer profiles (for match context)
create policy "employers_candidate_read"
  on employers for select
  using (get_user_role(auth.uid()) = 'candidate');

-- ----------------------------------------------------------------
-- challenges
-- ----------------------------------------------------------------
create policy "challenges_public_read"
  on challenges for select
  using (is_active = true);

-- ----------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------
-- Candidates can read questions (challenge runner fetches them)
create policy "questions_candidate_read"
  on questions for select
  using (get_user_role(auth.uid()) = 'candidate');

-- ----------------------------------------------------------------
-- challenge_results
-- ----------------------------------------------------------------
create policy "results_select_own"
  on challenge_results for select
  using (candidate_id = auth.uid());

create policy "results_insert_own"
  on challenge_results for insert
  with check (candidate_id = auth.uid());

-- Employers can see normalised_score (not raw answers) for candidates in their matches
create policy "results_employer_read_score"
  on challenge_results for select
  using (
    get_user_role(auth.uid()) = 'employer'
    and exists (
      select 1 from matches m
      where m.employer_id = auth.uid()
      and m.candidate_id = challenge_results.candidate_id
    )
  );

-- ----------------------------------------------------------------
-- salary_data_points
-- ----------------------------------------------------------------
create policy "salary_read_authenticated"
  on salary_data_points for select
  using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- reputation_events
-- ----------------------------------------------------------------
create policy "reputation_select_own"
  on reputation_events for select
  using (subject_id = auth.uid());

-- ----------------------------------------------------------------
-- matches
-- ----------------------------------------------------------------
create policy "matches_employer_select"
  on matches for select
  using (employer_id = auth.uid());

create policy "matches_candidate_select"
  on matches for select
  using (candidate_id = auth.uid());

create policy "matches_employer_insert"
  on matches for insert
  with check (
    employer_id = auth.uid()
    and get_user_role(auth.uid()) = 'employer'
  );

-- Candidate can update (accept/decline)
create policy "matches_candidate_update"
  on matches for update
  using (candidate_id = auth.uid());

-- ----------------------------------------------------------------
-- match_ticker_events
-- ----------------------------------------------------------------
create policy "ticker_public_read"
  on match_ticker_events for select
  using (true);

-- ----------------------------------------------------------------
-- score_history
-- ----------------------------------------------------------------
create policy "score_history_select_own"
  on score_history for select
  using (candidate_id = auth.uid());

-- Employers can see score history of matched candidates
create policy "score_history_employer_read"
  on score_history for select
  using (
    get_user_role(auth.uid()) = 'employer'
    and exists (
      select 1 from matches m
      where m.employer_id = auth.uid()
      and m.candidate_id = score_history.candidate_id
    )
  );
