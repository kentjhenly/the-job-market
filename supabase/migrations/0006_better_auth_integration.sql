-- ============================================================
-- 0006_better_auth_integration.sql
-- Point profiles.id at Better Auth's "user" table (text ids)
-- instead of Supabase's auth.users (unused — Better Auth is
-- the source of truth for authentication).
-- ============================================================

-- ----------------------------------------------------------------
-- Drop RLS policies + helper fn that reference the columns whose
-- type is changing (uuid -> text), so the columns can be altered.
-- ----------------------------------------------------------------
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_employer_read_candidates" on profiles;
drop policy if exists "candidates_select_own" on candidates;
drop policy if exists "candidates_update_own" on candidates;
drop policy if exists "candidates_employer_read" on candidates;
drop policy if exists "employers_select_own" on employers;
drop policy if exists "employers_update_own" on employers;
drop policy if exists "employers_candidate_read" on employers;
drop policy if exists "questions_candidate_read" on questions;
drop policy if exists "results_select_own" on challenge_results;
drop policy if exists "results_insert_own" on challenge_results;
drop policy if exists "results_employer_read_score" on challenge_results;
drop policy if exists "reputation_select_own" on reputation_events;
drop policy if exists "matches_employer_select" on matches;
drop policy if exists "matches_candidate_select" on matches;
drop policy if exists "matches_employer_insert" on matches;
drop policy if exists "matches_candidate_update" on matches;
drop policy if exists "score_history_select_own" on score_history;
drop policy if exists "score_history_employer_read" on score_history;

drop function if exists get_user_role(uuid);

-- ----------------------------------------------------------------
-- Drop FKs that target/are profiles.id (and its dependents) so the
-- column types can change from uuid to text.
-- ----------------------------------------------------------------
alter table profiles drop constraint profiles_id_fkey;
alter table candidates drop constraint candidates_id_fkey;
alter table employers drop constraint employers_id_fkey;
alter table reputation_events drop constraint reputation_events_subject_id_fkey;
alter table reputation_events drop constraint reputation_events_actor_id_fkey;
alter table challenge_results drop constraint challenge_results_candidate_id_fkey;
alter table matches drop constraint matches_employer_id_fkey;
alter table matches drop constraint matches_candidate_id_fkey;
alter table score_history drop constraint score_history_candidate_id_fkey;

-- ----------------------------------------------------------------
-- Switch id / FK columns from uuid to text to match Better Auth's user.id
-- ----------------------------------------------------------------
alter table profiles alter column id type text using id::text;
alter table candidates alter column id type text using id::text;
alter table employers alter column id type text using id::text;
alter table reputation_events alter column subject_id type text using subject_id::text;
alter table reputation_events alter column actor_id type text using actor_id::text;
alter table challenge_results alter column candidate_id type text using candidate_id::text;
alter table matches alter column employer_id type text using employer_id::text;
alter table matches alter column candidate_id type text using candidate_id::text;
alter table score_history alter column candidate_id type text using candidate_id::text;

-- ----------------------------------------------------------------
-- Re-create FKs, pointing profiles at Better Auth's "user" table
-- ----------------------------------------------------------------
alter table profiles
  add constraint profiles_id_fkey foreign key (id) references "user"(id) on delete cascade;

alter table candidates
  add constraint candidates_id_fkey foreign key (id) references profiles(id) on delete cascade;

alter table employers
  add constraint employers_id_fkey foreign key (id) references profiles(id) on delete cascade;

alter table reputation_events
  add constraint reputation_events_subject_id_fkey foreign key (subject_id) references profiles(id) on delete cascade;

alter table reputation_events
  add constraint reputation_events_actor_id_fkey foreign key (actor_id) references profiles(id);

alter table challenge_results
  add constraint challenge_results_candidate_id_fkey foreign key (candidate_id) references candidates(id) on delete cascade;

alter table matches
  add constraint matches_employer_id_fkey foreign key (employer_id) references employers(id);

alter table matches
  add constraint matches_candidate_id_fkey foreign key (candidate_id) references candidates(id);

alter table score_history
  add constraint score_history_candidate_id_fkey foreign key (candidate_id) references candidates(id) on delete cascade;

-- ----------------------------------------------------------------
-- Recreate helper fn + RLS policies against the new text id columns
-- ----------------------------------------------------------------
create or replace function get_user_role(uid text)
returns user_role
language sql security definer stable
as $$
  select role from profiles where id = uid;
$$;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid()::text = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid()::text = id);

create policy "profiles_employer_read_candidates"
  on profiles for select
  using (
    role = 'candidate'
    and get_user_role(auth.uid()::text) = 'employer'
  );

create policy "candidates_select_own"
  on candidates for select
  using (auth.uid()::text = id);

create policy "candidates_update_own"
  on candidates for update
  using (auth.uid()::text = id);

create policy "candidates_employer_read"
  on candidates for select
  using (
    is_visible = true
    and get_user_role(auth.uid()::text) = 'employer'
  );

create policy "employers_select_own"
  on employers for select
  using (auth.uid()::text = id);

create policy "employers_update_own"
  on employers for update
  using (auth.uid()::text = id);

create policy "employers_candidate_read"
  on employers for select
  using (get_user_role(auth.uid()::text) = 'candidate');

create policy "questions_candidate_read"
  on questions for select
  using (get_user_role(auth.uid()::text) = 'candidate');

create policy "results_select_own"
  on challenge_results for select
  using (candidate_id = auth.uid()::text);

create policy "results_insert_own"
  on challenge_results for insert
  with check (candidate_id = auth.uid()::text);

create policy "results_employer_read_score"
  on challenge_results for select
  using (
    get_user_role(auth.uid()::text) = 'employer'
    and exists (
      select 1 from matches m
      where m.employer_id = auth.uid()::text
      and m.candidate_id = challenge_results.candidate_id
    )
  );

create policy "reputation_select_own"
  on reputation_events for select
  using (subject_id = auth.uid()::text);

create policy "matches_employer_select"
  on matches for select
  using (employer_id = auth.uid()::text);

create policy "matches_candidate_select"
  on matches for select
  using (candidate_id = auth.uid()::text);

create policy "matches_employer_insert"
  on matches for insert
  with check (
    employer_id = auth.uid()::text
    and get_user_role(auth.uid()::text) = 'employer'
  );

create policy "matches_candidate_update"
  on matches for update
  using (candidate_id = auth.uid()::text);

create policy "score_history_select_own"
  on score_history for select
  using (candidate_id = auth.uid()::text);

create policy "score_history_employer_read"
  on score_history for select
  using (
    get_user_role(auth.uid()::text) = 'employer'
    and exists (
      select 1 from matches m
      where m.employer_id = auth.uid()::text
      and m.candidate_id = score_history.candidate_id
    )
  );
